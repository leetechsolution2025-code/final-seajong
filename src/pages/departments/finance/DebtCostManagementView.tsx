import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  ThreeDotsVertical,
  Pencil,
  Trash3,
  FileEarmarkSpreadsheet,
  FileEarmarkText,
  CashCoin,
  FileEarmarkCheck,
  Send,
  Printer,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClockHistory,
  PlusCircleFill,
  Calendar3,
  Bank,
  ShieldCheck,
  Receipt,
  DatabaseCheck,
  FileEarmarkExcel,
  BellFill,
  ArrowRepeat,
  Truck,
  Building,
} from 'react-bootstrap-icons';
import {
  TableToolbar,
  type TableToolbarFilter,
  type TableToolbarMenuItem,
} from '../../../components/common/TableToolbar';
import { Pagination } from '../../../components/common/Pagination';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { EmployeeSelect } from '../../../components/common/EmployeeSelect';
import { SuggestionInput, type SuggestionItem } from '../../../components/common/SuggestionInput';
import { notifyFinanceUpdated, useFinanceRealtimeSync } from '../../../services/financeSyncService';
import { DebtReconciliationModal } from './DebtReconciliationModal';
import { PaymentVoucherPrintModal } from './PaymentVoucherPrintModal';
import { ReceiptVoucherPrintModal, type ReceiptVoucherData } from './ReceiptVoucherPrintModal';
import { DebtAgingConfigOffcanvas, type DebtAgingConfig, DEFAULT_DEBT_AGING_CONFIG } from './DebtAgingConfigOffcanvas';
import { DebtCostReportPrintModal } from './DebtCostReportPrintModal';
import type { TickerItem } from '../../../components/common/Ticker';

// Hàm tính toán và xác định trạng thái tuổi nợ khách hàng theo cấu hình
export const calculateReceivableAgingStatus = (
  dueDateStr: string | undefined,
  remainingAmount: number,
  config: DebtAgingConfig
): { status: 'completed' | 'ontime' | 'due' | 'overdue'; statusLabel: string; diffDays: number } => {
  if (remainingAmount <= 0) {
    return { status: 'completed', statusLabel: 'Đã thu đủ', diffDays: 0 };
  }

  if (!dueDateStr) {
    return { status: 'ontime', statusLabel: 'Trong hạn thanh toán', diffDays: 999 };
  }

  let due: Date | null = null;
  if (dueDateStr.includes('/')) {
    const parts = dueDateStr.split('/');
    if (parts.length === 3) {
      due = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  } else if (dueDateStr.includes('-')) {
    const parts = dueDateStr.split('-');
    if (parts.length === 3) {
      due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  }

  if (!due || isNaN(due.getTime())) {
    return { status: 'ontime', statusLabel: 'Trong hạn thanh toán', diffDays: 999 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    const isBadDebt = config.badDebtDays && overdueDays > config.badDebtDays;
    return {
      status: 'overdue',
      statusLabel: isBadDebt ? `Quá hạn ${overdueDays} ngày (Khó đòi)` : `Quá hạn ${overdueDays} ngày`,
      diffDays,
    };
  }

  if (diffDays <= (config.dueSoonDays || 7)) {
    return {
      status: 'due',
      statusLabel: diffDays === 0 ? 'Đến hạn hôm nay' : `Sắp đến hạn (${diffDays} ngày)`,
      diffDays,
    };
  }

  return {
    status: 'ontime',
    statusLabel: 'Trong hạn thanh toán',
    diffDays,
  };
};

// Ham dinh dang so phan tach hang nghin
const formatNumberGroup = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/\D/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
};

// Giao dich lich su thu no
export interface PaymentHistoryRecord {
  id: string;
  code: string;
  dateTime: string;
  method: string;
  amount: number;
  debitAccount?: string;
  creditAccount?: string;
  bankAccount?: string;
  bankRef?: string;
  payerName?: string;
  payerAddress?: string;
  accountant?: string;
  originalDocsCount?: string;
  note?: string;
}

// Ham doc so tien thanh chu tieng Viet khong dung dau ngoac don
export const convertNumberToVietnameseWords = (num: number): string => {
  if (!num || isNaN(num) || num <= 0) return 'Không đồng chẵn.';
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  const readThreeDigits = (n: number, showLeadingZeroHundred: boolean): string => {
    let text = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const u = rem % 10;

    if (h > 0 || showLeadingZeroHundred) {
      text += digits[h] + ' trăm ';
      if (t === 0 && u > 0) text += 'lẻ ';
    }
    if (t === 1) {
      text += 'mười ';
    } else if (t > 1) {
      text += digits[t] + ' mươi ';
    }
    if (t > 0 && u === 1 && t !== 1) {
      text += 'mốt ';
    } else if (u === 5 && (t > 0 || h > 0)) {
      text += 'lăm ';
    } else if (u > 0 && (t > 0 || h > 0 || !showLeadingZeroHundred)) {
      text += digits[u] + ' ';
    }
    return text;
  };

  const scaleNames = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let remaining = Math.floor(num);
  const blocks: number[] = [];
  while (remaining > 0) {
    blocks.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  let fullText = '';
  for (let idx = blocks.length - 1; idx >= 0; idx--) {
    const val = blocks[idx];
    if (val > 0) {
      const isFirst = idx === blocks.length - 1;
      fullText += readThreeDigits(val, !isFirst) + scaleNames[idx] + ' ';
    }
  }

  fullText = fullText.trim();
  if (!fullText) return 'Không đồng chẵn.';
  const cap = fullText.charAt(0).toUpperCase() + fullText.slice(1);
  return `${cap} đồng chẵn.`;
};

// ==========================================
// 1. DATA TYPES CHO 4 BƯỚC CỦA CÔNG NỢ VÀ CHI PHÍ
// ==========================================

// Phiếu phát sinh công nợ / Đợt thanh toán
export interface DebtEntryItem {
  id: string;
  code: string;
  title: string;
  date: string;
  time?: string;
  contractValue: number;
  paidAmount: number;
  dueDate: string;
  remainingAmount: number;
  status: 'ontime' | 'due' | 'overdue' | 'completed' | string;
  statusLabel: string;
  payments?: any[];
}

// Bước 1: Công nợ phải thu theo từng khách hàng
export interface ReceivableItem {
  id: string;
  code: string;
  customerId?: string;
  customerCode?: string;
  customerPhone?: string;
  customerName: string;
  customerAddress: string;
  projectName: string;
  contractValue: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'ontime' | 'due' | 'overdue' | 'completed' | string;
  statusLabel: string;
  managerName: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  entries: DebtEntryItem[];
}

// Phiếu phát sinh công nợ phải trả
export interface PayableEntryItem {
  id: string;
  code: string;
  title: string;
  date: string;
  time?: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  remainingAmount: number;
  status: 'pending' | 'due_soon' | 'overdue' | 'completed';
  statusLabel: string;
}

// Bước 2: Công nợ phải trả theo từng nhà cung cấp
export interface PayableItem {
  id: string;
  code: string;
  partnerType?: 'supplier' | 'transporter';
  supplierName: string;
  supplierAddress: string;
  poCode: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'pending' | 'due_soon' | 'overdue' | 'completed';
  statusLabel: string;
  accountant: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  entries: PayableEntryItem[];
}

// Chi tiết khế ước nhận nợ / Giải ngân
export interface LoanDrawdownItem {
  id: string;
  loanId: string;
  drawdownCode: string;
  drawdownDate: string;
  maturityDate: string;
  amount: number;
  paidPrincipal: number;
  remainingPrincipal: number;
  interestRate: number;
  purpose: string;
  status: 'active' | 'closed';
}

// Bước 3: Nợ vay ngân hàng và tổ chức tín dụng (chuẩn quản trị tín dụng và BCTC TT200)
export interface LoanItem {
  id: string;
  code: string;
  bankName: string;
  contractCode: string;
  facilityType: 'working_capital' | 'term_loan' | 'overdraft' | 'guarantee' | 'letter_of_credit';
  facilityLabel: string;
  termType: 'short_term' | 'long_term';
  loanLimit: number;
  paidPrincipal: number;
  remainingPrincipal: number;
  dueWithin12m: number;
  interestRate: string;
  interestRateVal?: number;
  interestType?: 'fixed' | 'floating';
  interestPaymentDay?: number;
  monthlyInterestEst?: number;
  startDate: string;
  maturityDate: string;
  collateralAssetId?: string;
  collateralName?: string;
  collateralValue?: number;
  bankAccountId?: string;
  bankAccountNumber?: string;
  status: 'active' | 'due_soon' | 'overdue' | 'closed';
  statusLabel: string;
  loanType: string;
  notes?: string;
}

// Bước 4: Quản lý chi phí
export interface ExpenseItem {
  id: string;
  code: string;
  title: string;
  category: 'production' | 'sales' | 'administrative' | 'finance';
  categoryLabel: string;
  amount: number;
  department: string;
  proposer?: string;
  spendDate: string;
  spender: string;
  status: 'approved' | 'pending' | 'rejected';
  statusLabel: string;
  notes?: string;
  debitAccount?: string;
  debitAccountName?: string;
  creditAccount?: string;
  creditAccountName?: string;
  operationType?: string;
  isAutoDepreciation?: boolean;
  depreciationBreakdown?: { prod: number; sales: number; admin: number };
}

// Danh mục loại nghiệp vụ chi chuẩn kế toán doanh nghiệp (Tự động định khoản kép đầy đủ theo TT200 / TT133, phân nhóm trực quan)
export const EXPENSE_OPERATION_TYPES = [
  // ── NHÓM 1: CHI PHÍ SẢN XUẤT ──
  {
    id: 'expense_materials_621',
    label: 'Mua nguyên vật liệu trực tiếp sản xuất sen vòi, sứ vệ sinh',
    groupLabel: 'CHI PHÍ SẢN XUẤT',
    cat: 'production' as const,
    catLabel: 'Chi phí sản xuất',
    dept: 'Khối Sản Xuất',
    debit: '621',
    debitName: '621 - Chi phí nguyên liệu, vật liệu trực tiếp',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'expense_labor_622',
    label: 'Chi trả nhân công trực tiếp xưởng sản xuất',
    groupLabel: 'CHI PHÍ SẢN XUẤT',
    cat: 'production' as const,
    catLabel: 'Chi phí sản xuất',
    dept: 'Khối Sản Xuất',
    debit: '622',
    debitName: '622 - Chi phí nhân công trực tiếp xưởng',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'production_overhead',
    label: 'Bảo dưỡng máy móc, điện nước, phụ liệu xưởng sản xuất',
    groupLabel: 'CHI PHÍ SẢN XUẤT',
    cat: 'production' as const,
    catLabel: 'Chi phí sản xuất',
    dept: 'Khối Sản Xuất',
    debit: '627',
    debitName: '627 - Chi phí sản xuất chung (máy móc, điện, xưởng)',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'production_outsourcing',
    label: 'Chi phí thuê gia công, xi mạ PVD, xử lý bề mặt bên ngoài',
    groupLabel: 'CHI PHÍ SẢN XUẤT',
    cat: 'production' as const,
    catLabel: 'Chi phí sản xuất',
    dept: 'Khối Sản Xuất',
    debit: '627',
    debitName: '627 - Chi phí sản xuất chung (Xi mạ, gia công ngoài)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'production_tools',
    label: 'Mua công cụ dụng cụ, đồ bảo hộ lao động, jig gá xưởng sản xuất',
    groupLabel: 'CHI PHÍ SẢN XUẤT',
    cat: 'production' as const,
    catLabel: 'Chi phí sản xuất',
    dept: 'Khối Sản Xuất',
    debit: '627',
    debitName: '627 - Chi phí sản xuất chung (Công cụ, BHLĐ)',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },

  // ── NHÓM 2: CHI PHÍ BÁN HÀNG ──
  {
    id: 'sales_transport',
    label: 'Cước xe tải, vận chuyển giao hàng đại lý & showroom',
    groupLabel: 'CHI PHÍ BÁN HÀNG',
    cat: 'sales' as const,
    catLabel: 'Chi phí bán hàng',
    dept: 'Phòng Kinh Doanh',
    debit: '641',
    debitName: '641 - Chi phí bán hàng và vận chuyển',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'sales_marketing',
    label: 'Chi phí quảng cáo tiếp thị, hội chợ triển lãm Vietbuild',
    groupLabel: 'CHI PHÍ BÁN HÀNG',
    cat: 'sales' as const,
    catLabel: 'Chi phí bán hàng',
    dept: 'Phòng Kinh Doanh',
    debit: '641',
    debitName: '641 - Chi phí bán hàng (Quảng cáo, Triển lãm)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'sales_packaging',
    label: 'Chi phí vỏ hộp bao bì carton, mút xốp đóng gói sản phẩm',
    groupLabel: 'CHI PHÍ BÁN HÀNG',
    cat: 'sales' as const,
    catLabel: 'Chi phí bán hàng',
    dept: 'Phòng Kinh Doanh',
    debit: '641',
    debitName: '641 - Chi phí bán hàng (Bao bì, đóng gói)',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'sales_commission',
    label: 'Chiết khấu thương mại, hoa hồng bán hàng cho đại lý cấp 1',
    groupLabel: 'CHI PHÍ BÁN HÀNG',
    cat: 'sales' as const,
    catLabel: 'Chi phí bán hàng',
    dept: 'Phòng Kinh Doanh',
    debit: '641',
    debitName: '641 - Chi phí bán hàng (Hoa hồng, chiết khấu)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'sales_showroom_display',
    label: 'Chi phí kệ mẫu trưng bày sen vòi, bồn cầu tại showroom đại lý',
    groupLabel: 'CHI PHÍ BÁN HÀNG',
    cat: 'sales' as const,
    catLabel: 'Chi phí bán hàng',
    dept: 'Phòng Kinh Doanh',
    debit: '641',
    debitName: '641 - Chi phí bán hàng (Kệ mẫu showroom)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'sales_travel',
    label: 'Công tác phí phát triển thị trường đại lý thiết bị vệ sinh',
    groupLabel: 'CHI PHÍ BÁN HÀNG',
    cat: 'sales' as const,
    catLabel: 'Chi phí bán hàng',
    dept: 'Phòng Kinh Doanh',
    debit: '641',
    debitName: '641 - Chi phí bán hàng (Công tác phí thị trường)',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },

  // ── NHÓM 3: CHI PHÍ QUẢN LÝ DOANH NGHIỆP ──
  {
    id: 'expense_admin_642',
    label: 'Văn phòng phẩm, tiếp khách, quản lý doanh nghiệp',
    groupLabel: 'CHI PHÍ QUẢN LÝ DOANH NGHIỆP',
    cat: 'administrative' as const,
    catLabel: 'Chi phí quản lý',
    dept: 'Phòng Hành Chính Nhân Sự',
    debit: '642',
    debitName: '642 - Chi phí quản lý doanh nghiệp',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'admin_utilities',
    label: 'Chi phí điện, nước, viễn thông, mạng internet văn phòng',
    groupLabel: 'CHI PHÍ QUẢN LÝ DOANH NGHIỆP',
    cat: 'administrative' as const,
    catLabel: 'Chi phí quản lý',
    dept: 'Phòng Hành Chính Nhân Sự',
    debit: '642',
    debitName: '642 - Chi phí quản lý doanh nghiệp (Điện, nước, net)',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'admin_software',
    label: 'Chi phí bản quyền phần mềm ERP, CRM, duy trì máy chủ',
    groupLabel: 'CHI PHÍ QUẢN LÝ DOANH NGHIỆP',
    cat: 'administrative' as const,
    catLabel: 'Chi phí quản lý',
    dept: 'Phòng Hành Chính Nhân Sự',
    debit: '642',
    debitName: '642 - Chi phí quản lý doanh nghiệp (Phần mềm, IT)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'admin_rent',
    label: 'Chi phí thuê văn phòng, kho bãi, trụ sở làm việc công ty',
    groupLabel: 'CHI PHÍ QUẢN LÝ DOANH NGHIỆP',
    cat: 'administrative' as const,
    catLabel: 'Chi phí quản lý',
    dept: 'Ban Giám Đốc',
    debit: '642',
    debitName: '642 - Chi phí quản lý doanh nghiệp (Thuê văn phòng)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'admin_training_recruitment',
    label: 'Chi phí tuyển dụng, đào tạo nâng cao nghiệp vụ nhân viên',
    groupLabel: 'CHI PHÍ QUẢN LÝ DOANH NGHIỆP',
    cat: 'administrative' as const,
    catLabel: 'Chi phí quản lý',
    dept: 'Phòng Hành Chính Nhân Sự',
    debit: '642',
    debitName: '642 - Chi phí quản lý doanh nghiệp (Đào tạo, tuyển dụng)',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'admin_consulting_legal',
    label: 'Chi phí dịch vụ pháp lý, tư vấn, kiểm toán độc lập',
    groupLabel: 'CHI PHÍ QUẢN LÝ DOANH NGHIỆP',
    cat: 'administrative' as const,
    catLabel: 'Chi phí quản lý',
    dept: 'Phòng Tài Chính Kế Toán',
    debit: '642',
    debitName: '642 - Chi phí quản lý doanh nghiệp (Tư vấn, kiểm toán)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },

  // ── NHÓM 4: CHI PHÍ TÀI CHÍNH ──
  {
    id: 'financial_interest',
    label: 'Trả lãi vay ngân hàng định kỳ (Vietcombank, BIDV)',
    groupLabel: 'CHI PHÍ TÀI CHÍNH',
    cat: 'finance' as const,
    catLabel: 'Chi phí tài chính',
    dept: 'Phòng Tài Chính Kế Toán',
    debit: '635',
    debitName: '635 - Chi phí tài chính (Lãi vay và phí NH)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'financial_fee',
    label: 'Phí dịch vụ ngân hàng, phí chuyển tiền trong & quốc tế',
    groupLabel: 'CHI PHÍ TÀI CHÍNH',
    cat: 'finance' as const,
    catLabel: 'Chi phí tài chính',
    dept: 'Phòng Tài Chính Kế Toán',
    debit: '635',
    debitName: '635 - Chi phí tài chính (Lãi vay và phí NH)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'financial_discount',
    label: 'Chiết khấu thanh toán cho khách hàng thanh toán sớm',
    groupLabel: 'CHI PHÍ TÀI CHÍNH',
    cat: 'finance' as const,
    catLabel: 'Chi phí tài chính',
    dept: 'Phòng Tài Chính Kế Toán',
    debit: '635',
    debitName: '635 - Chi phí tài chính (Chiết khấu thanh toán)',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },

  // ── NHÓM 5: THANH TOÁN CÔNG NỢ & NGHĨA VỤ ──
  {
    id: 'pay_supplier_bank',
    label: 'Thanh toán tiền hàng cho Nhà cung cấp vật tư & thiết bị (Ủy nhiệm chi UNC)',
    groupLabel: 'THANH TOÁN CÔNG NỢ & NGHĨA VỤ',
    cat: 'production' as const,
    catLabel: 'Thanh toán công nợ',
    dept: 'Phòng Mua Hàng',
    debit: '331',
    debitName: '331 - Phải trả cho người bán (Nhà cung cấp)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'pay_supplier_cash',
    label: 'Thanh toán tiền hàng cho Nhà cung cấp bằng tiền mặt',
    groupLabel: 'THANH TOÁN CÔNG NỢ & NGHĨA VỤ',
    cat: 'production' as const,
    catLabel: 'Thanh toán công nợ',
    dept: 'Phòng Mua Hàng',
    debit: '331',
    debitName: '331 - Phải trả cho người bán (Nhà cung cấp)',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'pay_salary_bank',
    label: 'Chi trả tiền lương cán bộ công nhân viên (Chuyển khoản)',
    groupLabel: 'THANH TOÁN CÔNG NỢ & NGHĨA VỤ',
    cat: 'administrative' as const,
    catLabel: 'Chi trả tiền lương',
    dept: 'Phòng Hành Chính Nhân Sự',
    debit: '334',
    debitName: '334 - Phải trả người lao động (Tiền lương)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'pay_salary_cash',
    label: 'Chi trả tiền lương công nhân viên bằng tiền mặt quỹ',
    groupLabel: 'THANH TOÁN CÔNG NỢ & NGHĨA VỤ',
    cat: 'administrative' as const,
    catLabel: 'Chi trả tiền lương',
    dept: 'Phòng Hành Chính Nhân Sự',
    debit: '334',
    debitName: '334 - Phải trả người lao động (Tiền lương)',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'pay_insurance',
    label: 'Chi nộp tiền BHXH, BHYT, BHTN và kinh phí công đoàn',
    groupLabel: 'THANH TOÁN CÔNG NỢ & NGHĨA VỤ',
    cat: 'administrative' as const,
    catLabel: 'Nghĩa vụ bảo hiểm',
    dept: 'Phòng Hành Chính Nhân Sự',
    debit: '338',
    debitName: '338 - Phải trả, phải nộp khác (BHXH, BHYT, KPCĐ)',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'pay_tax',
    label: 'Chi nộp thuế và các khoản phải nộp Ngân sách Nhà nước (GTGT, TNDN)',
    groupLabel: 'THANH TOÁN CÔNG NỢ & NGHĨA VỤ',
    cat: 'administrative' as const,
    catLabel: 'Nghĩa vụ ngân sách',
    dept: 'Phòng Tài Chính Kế Toán',
    debit: '333',
    debitName: '333 - Thuế và các khoản phải nộp Nhà nước',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
  {
    id: 'advance_employee',
    label: 'Tạm ứng công tác phí / mua vật tư cho nhân viên công ty',
    groupLabel: 'THANH TOÁN CÔNG NỢ & NGHĨA VỤ',
    cat: 'administrative' as const,
    catLabel: 'Tạm ứng nội bộ',
    dept: 'Phòng Kế Toán',
    debit: '141',
    debitName: '141 - Tạm ứng nhân viên',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },

  // ── NHÓM 6: CHI PHÍ KHÁC & CHI PHÍ TRẢ TRƯỚC ──
  {
    id: 'other_penalty',
    label: 'Chi tiền phạt vi phạm hợp đồng, phạt thuế, nộp phạt',
    groupLabel: 'CHI PHÍ KHÁC & CHI PHÍ TRẢ TRƯỚC',
    cat: 'administrative' as const,
    catLabel: 'Chi phí khác',
    dept: 'Phòng Kế Toán',
    debit: '811',
    debitName: '811 - Chi phí khác (phạt, chi phí ngoài HĐ)',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'other_expenses',
    label: 'Các khoản chi phí bất thường khác ngoài hoạt động',
    groupLabel: 'CHI PHÍ KHÁC & CHI PHÍ TRẢ TRƯỚC',
    cat: 'administrative' as const,
    catLabel: 'Chi phí khác',
    dept: 'Phòng Kế Toán',
    debit: '811',
    debitName: '811 - Chi phí khác',
    credit: '1111',
    creditName: '1111 - Tiền mặt tại quỹ (VND)',
  },
  {
    id: 'prepaid_expenses',
    label: 'Chi phí trả trước phân bổ (Thuê xưởng, bảo hiểm, công cụ)',
    groupLabel: 'CHI PHÍ KHÁC & CHI PHÍ TRẢ TRƯỚC',
    cat: 'administrative' as const,
    catLabel: 'Chi phí trả trước',
    dept: 'Phòng Kế Toán',
    debit: '242',
    debitName: '242 - Chi phí trả trước phân bổ',
    credit: '1121',
    creditName: '1121 - Tiền gửi ngân hàng Vietcombank',
  },
];

export const STANDARD_DEBIT_ACCOUNTS = [
  { code: '621', name: '621 - Chi phí nguyên liệu, vật liệu trực tiếp' },
  { code: '622', name: '622 - Chi phí nhân công trực tiếp xưởng' },
  { code: '627', name: '627 - Chi phí sản xuất chung (máy móc, điện, xưởng)' },
  { code: '641', name: '641 - Chi phí bán hàng và vận chuyển' },
  { code: '642', name: '642 - Chi phí quản lý doanh nghiệp' },
  { code: '635', name: '635 - Chi phí tài chính (lãi vay, phí NH)' },
  { code: '811', name: '811 - Chi phí khác (phạt, chi phí ngoài HĐ)' },
  { code: '331', name: '331 - Phải trả cho người bán (Nhà cung cấp)' },
  { code: '334', name: '334 - Phải trả người lao động (Tiền lương)' },
  { code: '338', name: '338 - Phải trả, phải nộp khác (BHXH, BHYT, KPCĐ)' },
  { code: '333', name: '333 - Thuế và các khoản phải nộp Nhà nước' },
  { code: '141', name: '141 - Tạm ứng nhân viên' },
  { code: '242', name: '242 - Chi phí trả trước phân bổ' },
];

export const STANDARD_CREDIT_ACCOUNTS = [
  { code: '1111', name: '1111 - Tiền mặt tại quỹ (VND)' },
  { code: '1121', name: '1121 - Tiền gửi ngân hàng Vietcombank' },
  { code: '1122', name: '1122 - Tiền gửi ngân hàng BIDV' },
  { code: '1124', name: '1124 - Tiền gửi ngân hàng VietinBank' },
  { code: '331', name: '331 - Phải trả người bán (Đối trừ công nợ)' },
  { code: '141', name: '141 - Hoàn ứng tạm ứng nhân viên' },
];

export interface DebtCostManagementViewProps {
  currentStep: number;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  user?: any;
  onUpdateTickerItems?: (items: TickerItem[]) => void;
}

// ==========================================
// 2. DỮ LIỆU KHỞI TẠO MẪU CHUẨN THỰC TẾ
// ==========================================

const INITIAL_RECEIVABLES: ReceivableItem[] = [
  // 1. Nguyen Thanh Phuc (KH95, Củ Chi, TP.HCM)
  {
    id: 'REC-SJ-01',
    code: 'CNPT-KH95',
    customerId: 'cmubd5buw00cn8ohlkjk7d3op',
    customerCode: 'KH95',
    customerName: 'Nguyen Thanh Phuc',
    customerAddress: 'Thị Trấn Củ Chi, Huyện Củ Chi, TP. Hồ Chí Minh',
    projectName: 'Hợp đồng đại lý phân phối thiết bị sen vòi Seajong - TP.HCM',
    contractValue: 49630720,
    paidAmount: 0,
    remainingAmount: 49630720,
    dueDate: '28/10/2026',
    status: 'due',
    statusLabel: 'Sắp đến hạn',
    managerName: 'Lê Vụ (TP Kinh doanh)',
    notes: 'Đại lý phân phối khu vực Củ Chi & Tây Bắc TP.HCM',
    entries: [
      {
        id: 'REC-E-01',
        code: 'DBH-20260928-01',
        title: 'Đơn bán hàng DBH-20260928-01: Bồn cầu thông minh Seajong SJ-TLT103SFDUV & Gương SJ-GS1060-SR',
        date: '28/09/2026',
        time: '08:30',
        contractValue: 40726500,
        paidAmount: 0,
        remainingAmount: 40726500,
        dueDate: '28/10/2026',
        status: 'due',
        statusLabel: 'Sắp đến hạn'
      },
      {
        id: 'REC-E-02',
        code: 'DBH-20261007-02',
        title: 'Đơn bán hàng DBH-20261007-02: Sen tắm nóng lạnh Seajong 02S (20 bộ)',
        date: '07/10/2026',
        time: '14:20',
        contractValue: 8904220,
        paidAmount: 0,
        remainingAmount: 8904220,
        dueDate: '07/11/2026',
        status: 'ontime',
        statusLabel: 'Trong hạn thanh toán'
      }
    ]
  },

  // 2. Anh Hoàn (KH97, Đại lý Seajong)
  {
    id: 'REC-SJ-02',
    code: 'CNPT-KH97',
    customerId: 'cmubd5bvd00cp8ohlodetqseo',
    customerCode: 'KH97',
    customerName: 'Anh Hoàn',
    customerAddress: 'Đại lý phân phối thiết bị vệ sinh Seajong',
    projectName: 'Đơn hàng thiết bị sen tắm nóng lạnh Seajong 01S',
    contractValue: 1430650,
    paidAmount: 1400000,
    remainingAmount: 30650,
    dueDate: '22/10/2026',
    status: 'overdue',
    statusLabel: 'Quá hạn thanh toán',
    managerName: 'Lê Vụ (TP Kinh doanh)',
    notes: 'Đã thu 1.400.000đ (2 phiếu thu PT-438 và PT-454), còn dư nợ 30.650đ',
    entries: [
      {
        id: 'REC-E-03',
        code: 'DBH-20260922-01',
        title: 'Đơn bán hàng DBH-20260922-01: Sen tắm nóng lạnh Seajong 01S (15 bộ)',
        date: '22/09/2026',
        time: '09:00',
        contractValue: 1430650,
        paidAmount: 1400000,
        remainingAmount: 30650,
        dueDate: '22/10/2026',
        status: 'overdue',
        statusLabel: 'Quá hạn thanh toán'
      }
    ]
  },

  // 3. Nguyễn Xuân Trung (KH92, Từ Sơn, Bắc Ninh)
  {
    id: 'REC-SJ-03',
    code: 'CNPT-KH92',
    customerId: 'cmubd5bu200ck8ohlpn4kyp1n',
    customerCode: 'KH92',
    customerName: 'Nguyễn Xuân Trung',
    customerAddress: 'Từ Sơn, Bắc Ninh',
    projectName: 'Cung cấp sen tắm nóng lạnh Seajong 01S - Bắc Ninh',
    contractValue: 462150,
    paidAmount: 0,
    remainingAmount: 462150,
    dueDate: '07/11/2026',
    status: 'ontime',
    statusLabel: 'Trong hạn thanh toán',
    managerName: 'Nguyễn Văn Thành',
    notes: 'Đơn hàng đại lý Từ Sơn',
    entries: [
      {
        id: 'REC-E-04',
        code: 'DBH-20261007-01',
        title: 'Đơn bán hàng DBH-20261007-01: Sen tắm nóng lạnh Seajong 01S (5 bộ)',
        date: '07/10/2026',
        time: '10:15',
        contractValue: 462150,
        paidAmount: 0,
        remainingAmount: 462150,
        dueDate: '07/11/2026',
        status: 'ontime',
        statusLabel: 'Trong hạn thanh toán'
      }
    ]
  },

  // 4. Anh Benza (KH99)
  {
    id: 'REC-SJ-04',
    code: 'CNPT-KH99',
    customerId: 'cmubd5bvu00cr8ohlcwl1ldwg',
    customerCode: 'KH99',
    customerName: 'Anh Benza',
    customerAddress: 'Đại lý phân phối phụ kiện sen vòi Seajong',
    projectName: 'Cung cấp phụ kiện ốc cần sen cây các dòng 01, 02, 03, 26',
    contractValue: 225000,
    paidAmount: 0,
    remainingAmount: 225000,
    dueDate: '30/10/2026',
    status: 'due',
    statusLabel: 'Sắp đến hạn',
    managerName: 'Nguyễn Văn Thành',
    notes: 'Đơn hàng phụ kiện',
    entries: [
      {
        id: 'REC-E-05',
        code: 'DBH-20260930-01',
        title: 'Đơn bán hàng DBH-20260930-01: Ốc cần sen cây 01, 02, 03, 26 (50 chiếc)',
        date: '30/09/2026',
        time: '15:45',
        contractValue: 225000,
        paidAmount: 0,
        remainingAmount: 225000,
        dueDate: '30/10/2026',
        status: 'due',
        statusLabel: 'Sắp đến hạn'
      }
    ]
  },

  // 5. Showroom Thiên Thuận Lạng Sơn (KH0014, Mai Thành, Đông Kinh, Lạng Sơn)
  {
    id: 'REC-SJ-05',
    code: 'CNPT-KH0014',
    customerId: 'cmssr1wt40001yg2afs44v5px',
    customerCode: 'KH0014',
    customerName: 'Showroom Thiên Thuận Lạng Sơn',
    customerAddress: 'Thôn Mai Thành, Phường Đông Kinh, Tỉnh Lạng Sơn',
    projectName: 'Hợp đồng phân phối độc quyền thiết bị sen vòi Seajong tỉnh Lạng Sơn',
    contractValue: 125000000,
    paidAmount: 50000000,
    remainingAmount: 75000000,
    dueDate: '15/11/2026',
    status: 'ontime',
    statusLabel: 'Trong hạn thanh toán',
    managerName: 'Lê Vụ (TP Kinh doanh)',
    notes: 'Đại lý phân phối lớn khu vực Lạng Sơn, hạn mức công nợ 100 triệu',
    entries: [
      {
        id: 'REC-E-06',
        code: 'DBH-20261010-01',
        title: 'Đơn hàng DBH-20261010-01: Gói thiết bị sen cây tắm nóng lạnh Seajong Luxury (40 bộ)',
        date: '10/10/2026',
        time: '09:30',
        contractValue: 75000000,
        paidAmount: 50000000,
        remainingAmount: 25000000,
        dueDate: '15/11/2026',
        status: 'ontime',
        statusLabel: 'Trong hạn thanh toán'
      },
      {
        id: 'REC-E-07',
        code: 'DBH-20261018-02',
        title: 'Đơn hàng DBH-20261018-02: Bồn cầu một khối & gương LED thông minh Seajong',
        date: '18/10/2026',
        time: '14:00',
        contractValue: 50000000,
        paidAmount: 0,
        remainingAmount: 50000000,
        dueDate: '20/11/2026',
        status: 'ontime',
        statusLabel: 'Trong hạn thanh toán'
      }
    ]
  },

  // 6. Hiền Dân (KH0030, Thanh Oai, Hà Nội)
  {
    id: 'REC-SJ-06',
    code: 'CNPT-KH0030',
    customerId: 'cmstytqfb0a2hyg2atzpz89gu',
    customerCode: 'KH0030',
    customerName: 'Hiền Dân',
    customerAddress: 'Thanh Oai, Hà Nội',
    projectName: 'Gói cung cấp sen vòi & thiết bị vệ sinh cao cấp Seajong dự án Thanh Oai',
    contractValue: 85000000,
    paidAmount: 35000000,
    remainingAmount: 50000000,
    dueDate: '08/11/2026',
    status: 'due',
    statusLabel: 'Sắp đến hạn',
    managerName: 'Vũ Hoàng Long',
    notes: 'Showroom Hiền Dân, hạn mức công nợ 100 triệu',
    entries: [
      {
        id: 'REC-E-08',
        code: 'DBH-20261005-01',
        title: 'Đơn hàng DBH-20261005-01: Vòi chậu lavabo nóng lạnh đúc trọng lực Seajong (60 bộ)',
        date: '05/10/2026',
        time: '11:00',
        contractValue: 45000000,
        paidAmount: 35000000,
        remainingAmount: 10000000,
        dueDate: '05/11/2026',
        status: 'due',
        statusLabel: 'Sắp đến hạn'
      },
      {
        id: 'REC-E-09',
        code: 'DBH-20261015-02',
        title: 'Đơn hàng DBH-20261015-02: Phụ kiện xiphong & ống xả đồng PVD',
        date: '15/10/2026',
        time: '16:30',
        contractValue: 40000000,
        paidAmount: 0,
        remainingAmount: 40000000,
        dueDate: '08/11/2026',
        status: 'due',
        statusLabel: 'Sắp đến hạn'
      }
    ]
  },

  // 7. Anh Quang (KH0012, Nam Trực, Ninh Bình)
  {
    id: 'REC-SJ-07',
    code: 'CNPT-KH0012',
    customerId: 'cmsr61ain0320yg87ifilhnhw',
    customerCode: 'KH0012',
    customerName: 'Anh Quang',
    customerAddress: 'Xóm Bơ Cầu, Xã Nam Trực, tỉnh Ninh Bình',
    projectName: 'Đại lý phân phối độc quyền thiết bị sen vòi Seajong Nam Trực',
    contractValue: 95000000,
    paidAmount: 40000000,
    remainingAmount: 55000000,
    dueDate: '12/11/2026',
    status: 'ontime',
    statusLabel: 'Trong hạn thanh toán',
    managerName: 'Lê Vụ (TP Kinh doanh)',
    notes: 'Đại lý tỉnh Ninh Bình',
    entries: [
      {
        id: 'REC-E-10',
        code: 'DBH-20261002-01',
        title: 'Đơn hàng DBH-20261002-01: Lô sen cây phím đàn hiển thị nhiệt độ Seajong (25 bộ)',
        date: '02/10/2026',
        time: '08:45',
        contractValue: 95000000,
        paidAmount: 40000000,
        remainingAmount: 55000000,
        dueDate: '12/11/2026',
        status: 'ontime',
        statusLabel: 'Trong hạn thanh toán'
      }
    ]
  },

  // 8. Anh Ngọc (KH0013, Gia Lâm, Hà Nội)
  {
    id: 'REC-SJ-08',
    code: 'CNPT-KH0013',
    customerId: 'cmssec6l5068nyg8721rxmd8d',
    customerCode: 'KH0013',
    customerName: 'Anh Ngọc',
    customerAddress: 'Gia Lâm, Hà Nội',
    projectName: 'Gói thiết bị vệ sinh hoàn thiện căn hộ cao cấp Gia Lâm',
    contractValue: 68000000,
    paidAmount: 28000000,
    remainingAmount: 40000000,
    dueDate: '10/11/2026',
    status: 'ontime',
    statusLabel: 'Trong hạn thanh toán',
    managerName: 'Vũ Hoàng Long',
    notes: 'Hạn mức 70 triệu',
    entries: [
      {
        id: 'REC-E-11',
        code: 'DBH-20261008-01',
        title: 'Đơn hàng DBH-20261008-01: Sen vòi & bồn tiểu nam cảm ứng Seajong',
        date: '08/10/2026',
        time: '10:00',
        contractValue: 68000000,
        paidAmount: 28000000,
        remainingAmount: 40000000,
        dueDate: '10/11/2026',
        status: 'ontime',
        statusLabel: 'Trong hạn thanh toán'
      }
    ]
  },

  // 9. ANH BIÊN HOA (Văn Phú, Hà Đông)
  {
    id: 'REC-SJ-09',
    code: 'CNPT-KH-BH',
    customerId: 'cmsmxi19f0037ygppzda75ci7',
    customerName: 'ANH BIÊN HOA',
    customerAddress: 'Văn Phú, Hà Đông, Hà Nội',
    projectName: 'Cung cấp thiết bị phòng tắm công trình biệt thự liền kề Văn Phú',
    contractValue: 52000000,
    paidAmount: 22000000,
    remainingAmount: 30000000,
    dueDate: '29/10/2026',
    status: 'due',
    statusLabel: 'Sắp đến hạn',
    managerName: 'Lê Vụ (TP Kinh doanh)',
    notes: 'Đại lý Hà Đông',
    entries: [
      {
        id: 'REC-E-12',
        code: 'DBH-20260926-01',
        title: 'Đơn hàng DBH-20260926-01: Sen tắm âm trần cảm ứng & vòi chậu đúc đồng',
        date: '26/09/2026',
        time: '14:15',
        contractValue: 52000000,
        paidAmount: 22000000,
        remainingAmount: 30000000,
        dueDate: '29/10/2026',
        status: 'due',
        statusLabel: 'Sắp đến hạn'
      }
    ]
  },

  // 10. Chị Lê Nha Trang (TP Nha Trang)
  {
    id: 'REC-SJ-10',
    code: 'CNPT-KH-LNT',
    customerId: 'cmslq30hv0001ygfg7wi4wq9o',
    customerName: 'Chị Lê Nha Trang',
    customerAddress: 'TP Nha Trang, Khánh Hòa',
    projectName: 'Cung cấp thiết bị phòng tắm biệt thự nghỉ dưỡng Nha Trang',
    contractValue: 48000000,
    paidAmount: 48000000,
    remainingAmount: 0,
    dueDate: '15/10/2026',
    status: 'completed',
    statusLabel: 'Đã tất toán',
    managerName: 'Nguyễn Văn Thành',
    notes: 'Đã tất toán toàn bộ công nợ',
    entries: [
      {
        id: 'REC-E-13',
        code: 'DBH-20260915-01',
        title: 'Đơn hàng DBH-20260915-01: Bộ sen cây mạ Crom & phụ kiện phòng tắm cao cấp',
        date: '15/09/2026',
        time: '09:00',
        contractValue: 48000000,
        paidAmount: 48000000,
        remainingAmount: 0,
        dueDate: '15/10/2026',
        status: 'completed',
        statusLabel: 'Đã tất toán'
      }
    ]
  },

  // 11. Thành Cường - Sơn Tây (KH0010, Sơn Tây, Hà Nội)
  {
    id: 'REC-SJ-11',
    code: 'CNPT-KH0010',
    customerId: 'cmspj86wq00miyg51sofgj59r',
    customerCode: 'KH0010',
    customerName: 'Thành Cường- Sơn Tây',
    customerAddress: 'Sơn Tây, Hà Nội',
    projectName: 'Gói cung cấp sen cây nóng lạnh Seajong Sơn Tây',
    contractValue: 24000000,
    paidAmount: 24000000,
    remainingAmount: 0,
    dueDate: '10/10/2026',
    status: 'completed',
    statusLabel: 'Đã tất toán',
    managerName: 'Vũ Hoàng Long',
    notes: 'Đã tất toán',
    entries: [
      {
        id: 'REC-E-14',
        code: 'DBH-20260910-01',
        title: 'Đơn hàng DBH-20260910-01: Sen tắm nóng lạnh Seajong Luxury',
        date: '10/09/2026',
        time: '08:30',
        contractValue: 24000000,
        paidAmount: 24000000,
        remainingAmount: 0,
        dueDate: '10/10/2026',
        status: 'completed',
        statusLabel: 'Đã tất toán'
      }
    ]
  },

  // 12. Anh Thạo (KĐT Tân Tây Đô, Đan Phượng, Hà Nội)
  {
    id: 'REC-SJ-12',
    code: 'CNPT-KH-AT',
    customerId: 'cmslpluun0002ygfatzykt2a3',
    customerName: 'Anh Thạo',
    customerAddress: 'Số 45 ngõ 79 KĐT Tân Tây Đô, Đan Phượng, Hà Nội',
    projectName: 'Đơn hàng thiết bị sen vòi Seajong Tân Tây Đô',
    contractValue: 22500000,
    paidAmount: 10000000,
    remainingAmount: 12500000,
    dueDate: '05/11/2026',
    status: 'ontime',
    statusLabel: 'Trong hạn thanh toán',
    managerName: 'Lê Vụ (TP Kinh doanh)',
    notes: 'Đại lý Đan Phượng',
    entries: [
      {
        id: 'REC-E-15',
        code: 'DBH-20261012-01',
        title: 'Đơn hàng DBH-20261012-01: Sen cây nhiệt độ & vòi chậu rửa mặt Seajong',
        date: '12/10/2026',
        time: '15:00',
        contractValue: 22500000,
        paidAmount: 10000000,
        remainingAmount: 12500000,
        dueDate: '05/11/2026',
        status: 'ontime',
        statusLabel: 'Trong hạn thanh toán'
      }
    ]
  }
];

const INITIAL_PAYABLES: PayableItem[] = [
  // --- NHÀ CUNG CẤP SEAJONG TRONG CSDL ---
  {
    id: 'PAY-SJ-01',
    code: 'CNTR-2026-001',
    supplierName: 'Tô Toàn',
    supplierAddress: 'Phúc Kiến, Trung Quốc',
    poCode: 'PO-2026-TT01',
    totalAmount: 780000000,
    paidAmount: 450000000,
    remainingAmount: 330000000,
    dueDate: '15/11/2026',
    status: 'pending',
    statusLabel: 'Chờ thanh toán',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'supplier',
    notes: 'Cung cấp linh kiện củ sen đồng mạ Crom & bộ chia nước Seajong Luxury',
    entries: [
      { id: 'E-TT-1', code: 'PO-2026-TT01', title: 'Đơn mua hàng PO-2026-TT01: Củ sen đồng mạ Crom Luxury (300 bộ)', date: '15/09/2026', totalAmount: 390000000, paidAmount: 390000000, remainingAmount: 0, dueDate: '20/09/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
      { id: 'E-TT-2', code: 'PO-2026-TT02', title: 'Đơn mua hàng PO-2026-TT02: Bộ chia nước sen cây nhiệt độ (200 bộ)', date: '10/10/2026', totalAmount: 200000000, paidAmount: 60000000, remainingAmount: 140000000, dueDate: '05/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' },
      { id: 'E-TT-3', code: 'PO-2026-TT03', title: 'Đơn mua hàng PO-2026-TT03: Linh kiện củ sen âm tường phôi đồng', date: '25/10/2026', totalAmount: 190000000, paidAmount: 0, remainingAmount: 190000000, dueDate: '15/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
    ]
  },
  {
    id: 'PAY-SJ-02',
    code: 'CNTR-2026-002',
    supplierName: 'Trương Trần',
    supplierAddress: 'Phúc Kiến, Trung Quốc',
    poCode: 'DH-20260928-0001',
    totalAmount: 450000000,
    paidAmount: 250000000,
    remainingAmount: 200000000,
    dueDate: '08/11/2026',
    status: 'due_soon',
    statusLabel: 'Sắp đến hạn',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'supplier',
    notes: 'Thân vòi chậu lavabo nóng lạnh đúc trọng lực cao cấp Seajong',
    entries: [
      { id: 'E-TR-1', code: 'DH-20260928-0001', title: 'Đơn hàng DH-20260928-0001: Sen cây Hàn Quốc CSC08S và CSC08S-1', date: '28/09/2026', totalAmount: 250000000, paidAmount: 250000000, remainingAmount: 0, dueDate: '05/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
      { id: 'E-TR-2', code: 'PO-2026-TR02', title: 'Đơn mua hàng PO-2026-TR02: Thân vòi chậu lavabo nóng lạnh đúc trọng lực', date: '18/10/2026', totalAmount: 200000000, paidAmount: 0, remainingAmount: 200000000, dueDate: '08/11/2026', status: 'due_soon', statusLabel: 'Sắp đến hạn' }
    ]
  },
  {
    id: 'PAY-SJ-03',
    code: 'CNTR-2026-003',
    supplierName: 'Ông Chen',
    supplierAddress: 'Chiết Giang, Trung Quốc',
    poCode: 'PO-2026-CH01',
    totalAmount: 320000000,
    paidAmount: 120000000,
    remainingAmount: 200000000,
    dueDate: '05/11/2026',
    status: 'pending',
    statusLabel: 'Chờ thanh toán',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'supplier',
    notes: 'Lõi van gốm sứ Sedal Ceramic 35mm & 40mm chống rò rỉ nước',
    entries: [
      { id: 'E-CH-1', code: 'PO-2026-CH01', title: 'Đơn mua hàng PO-2026-CH01: Lõi van Ceramic Sedal 35mm (1.000 chiếc)', date: '05/10/2026', totalAmount: 120000000, paidAmount: 120000000, remainingAmount: 0, dueDate: '10/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
      { id: 'E-CH-2', code: 'PO-2026-CH02', title: 'Đơn mua hàng PO-2026-CH02: Lõi van gốm Ceramic 40mm (1.500 chiếc)', date: '20/10/2026', totalAmount: 200000000, paidAmount: 0, remainingAmount: 200000000, dueDate: '05/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
    ]
  },
  {
    id: 'PAY-SJ-04',
    code: 'CNTR-2026-004',
    supplierName: 'Hải Yến',
    supplierAddress: 'Phúc Kiến, Trung Quốc',
    poCode: 'PO-2026-HY01',
    totalAmount: 210000000,
    paidAmount: 210000000,
    remainingAmount: 0,
    dueDate: '15/10/2026',
    status: 'completed',
    statusLabel: 'Đã hoàn tất thanh toán',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'supplier',
    notes: 'Bộ xiphong thoát sàn & ống xả đồng mạ Crom phủ PVD',
    entries: [
      { id: 'E-HY-1', code: 'PO-2026-HY01', title: 'Đơn mua hàng PO-2026-HY01: Bộ xiphong thoát sàn & ống xả đồng mạ Crom phủ PVD', date: '15/10/2026', totalAmount: 210000000, paidAmount: 210000000, remainingAmount: 0, dueDate: '15/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' }
    ]
  },
  {
    id: 'PAY-SJ-05',
    code: 'CNTR-2026-005',
    supplierName: 'Bát sen Hàn Quốc',
    supplierAddress: 'Ning Ba, Trung Quốc',
    poCode: 'PO-2026-BS01',
    totalAmount: 290000000,
    paidAmount: 150000000,
    remainingAmount: 140000000,
    dueDate: '25/11/2026',
    status: 'pending',
    statusLabel: 'Chờ thanh toán',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'supplier',
    notes: 'Bát sen tăng áp đa chế độ và dây sen chống xoắn chịu áp lực cao',
    entries: [
      { id: 'E-BS-1', code: 'PO-2026-BS01', title: 'Đơn mua hàng PO-2026-BS01: Bát sen tăng áp 3 chế độ massage (800 bộ)', date: '02/10/2026', totalAmount: 150000000, paidAmount: 150000000, remainingAmount: 0, dueDate: '08/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
      { id: 'E-BS-2', code: 'PO-2026-BS02', title: 'Đơn mua hàng PO-2026-BS02: Dây sen inox 304 chống xoắn chịu áp lực cao (1.200 sợi)', date: '22/10/2026', totalAmount: 140000000, paidAmount: 0, remainingAmount: 140000000, dueDate: '25/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
    ]
  },
  {
    id: 'PAY-SJ-06',
    code: 'CNTR-2026-006',
    supplierName: 'Chị Huyền Hộp',
    supplierAddress: 'Hà Đông, Hà Nội',
    poCode: 'PO-2026-HH01',
    totalAmount: 85000000,
    paidAmount: 50000000,
    remainingAmount: 35000000,
    dueDate: '10/11/2026',
    status: 'pending',
    statusLabel: 'Chờ thanh toán',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'supplier',
    notes: 'Bao bì hộp carton sóng bồi in offset thương hiệu Seajong Better The Best & khay mút xốp định hình',
    entries: [
      { id: 'E-HH-1', code: 'PO-2026-HH01', title: 'Đơn đặt in PO-2026-HH01: 10.000 vỏ hộp sen vòi in offset phủ UV Seajong', date: '15/10/2026', totalAmount: 50000000, paidAmount: 50000000, remainingAmount: 0, dueDate: '20/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
      { id: 'E-HH-2', code: 'PO-2026-HH02', title: 'Đơn đặt in PO-2026-HH02: 8.000 khay mút xốp định hình chèn thân vòi', date: '26/10/2026', totalAmount: 35000000, paidAmount: 0, remainingAmount: 35000000, dueDate: '10/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
    ]
  },
  {
    id: 'PAY-SJ-07',
    code: 'CNTR-2026-007',
    supplierName: 'A Hưng Châu',
    supplierAddress: 'Phú Diễn, Bắc Từ Liêm, Hà Nội',
    poCode: 'PO-2026-HC01',
    totalAmount: 62000000,
    paidAmount: 62000000,
    remainingAmount: 0,
    dueDate: '18/10/2026',
    status: 'completed',
    statusLabel: 'Đã hoàn tất thanh toán',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'supplier',
    notes: 'Gia công chi tiết tiện đồng thau ren chân sen và ốc siết chân bàn lavabo',
    entries: [
      { id: 'E-HC-1', code: 'PO-2026-HC01', title: 'Hợp đồng gia công PO-2026-HC01: Tiện đồng ren chân sen và ốc siết chân bàn', date: '18/10/2026', totalAmount: 62000000, paidAmount: 62000000, remainingAmount: 0, dueDate: '18/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' }
    ]
  },

  // --- ĐƠN VỊ VẬN CHUYỂN SEAJONG TRONG CSDL ---
  {
    id: 'PAY-SJ-08',
    code: 'CNVC-2026-001',
    supplierName: 'Công ty vận tải Thái Bình Dương',
    supplierAddress: 'Số 18 Tam Trinh, Hoàng Mai, Hà Nội (Tổng kho Seajong)',
    poCode: 'VC-2026-TBD01',
    totalAmount: 68000000,
    paidAmount: 40000000,
    remainingAmount: 28000000,
    dueDate: '10/11/2026',
    status: 'pending',
    statusLabel: 'Chờ thanh toán',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'transporter',
    notes: 'Tuyến Lạng Sơn về tổng kho Seajong tại Hà Nội và các đại lý khu vực miền Bắc',
    entries: [
      { id: 'E-TBD-1', code: 'VC-20260928-0001', title: 'Vận đơn VC-20260928-0001: Cước vận chuyển tuyến Lạng Sơn về Tổng kho Seajong (Đơn DH-20260928-0001)', date: '28/09/2026', totalAmount: 40000000, paidAmount: 40000000, remainingAmount: 0, dueDate: '18/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
      { id: 'E-TBD-2', code: 'VC-20261025-0002', title: 'Vận đơn VC-20261025-0002: Cước vận tải xe 8 tấn hàng nhập khẩu cửa khẩu Tân Thanh', date: '25/10/2026', totalAmount: 28000000, paidAmount: 0, remainingAmount: 28000000, dueDate: '10/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
    ]
  },
  {
    id: 'PAY-SJ-09',
    code: 'CNVC-2026-002',
    supplierName: 'Công ty Cổ phần Vận chuyển Á Châu',
    supplierAddress: 'Kho hàng số 3, Cảng Đình Vũ, Hải Phòng',
    poCode: 'VC-2026-AC01',
    totalAmount: 85000000,
    paidAmount: 50000000,
    remainingAmount: 35000000,
    dueDate: '05/11/2026',
    status: 'due_soon',
    statusLabel: 'Sắp đến hạn',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'transporter',
    notes: 'Kéo container từ Cảng Hải Phòng về Kho nhà máy Seajong và đại lý dự án',
    entries: [
      { id: 'E-AC-1', code: 'VC-20261010-0001', title: 'Vận đơn VC-20261010-0001: Kéo 02 container 40ft linh kiện sen vòi từ Cảng Đình Vũ Hải Phòng', date: '10/10/2026', totalAmount: 50000000, paidAmount: 50000000, remainingAmount: 0, dueDate: '15/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
      { id: 'E-AC-2', code: 'VC-20261024-0002', title: 'Vận đơn VC-20261024-0002: Cước kéo container & phí nâng hạ bãi cảng Đình Vũ', date: '24/10/2026', totalAmount: 35000000, paidAmount: 0, remainingAmount: 35000000, dueDate: '05/11/2026', status: 'due_soon', statusLabel: 'Sắp đến hạn' }
    ]
  },
  {
    id: 'PAY-SJ-10',
    code: 'CNVC-2026-003',
    supplierName: 'Công ty TNHH Vận tải Phượng Hoàng',
    supplierAddress: 'Bãi xe Đuôi Cá, Giải Phóng, Hoàng Mai, Hà Nội',
    poCode: 'VC-2026-PH01',
    totalAmount: 92000000,
    paidAmount: 60000000,
    remainingAmount: 32000000,
    dueDate: '28/10/2026',
    status: 'overdue',
    statusLabel: 'Quá hạn trả',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'transporter',
    notes: 'Tuyến Hà Nội - Đà Nẵng - TP.HCM · Chuyên chở hàng thiết bị vệ sinh nguyên xe / ghép xe',
    entries: [
      { id: 'E-PH-1', code: 'VC-20260925-0001', title: 'Vận đơn VC-20260925-0001: Xe tải 10 tấn giao thiết bị phòng tắm hệ thống showroom Đà Nẵng', date: '25/09/2026', totalAmount: 60000000, paidAmount: 60000000, remainingAmount: 0, dueDate: '05/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
      { id: 'E-PH-2', code: 'VC-20261012-0002', title: 'Vận đơn VC-20261012-0002: Xe tải ghép hàng giao tổng kho chi nhánh TP.HCM', date: '12/10/2026', totalAmount: 32000000, paidAmount: 0, remainingAmount: 32000000, dueDate: '28/10/2026', status: 'overdue', statusLabel: 'Quá hạn trả' }
    ]
  },
  {
    id: 'PAY-SJ-11',
    code: 'CNVC-2026-004',
    supplierName: 'Công ty Cổ phần Dịch vụ Giao Hàng Nhanh (GHN)',
    supplierAddress: 'Kho phân loại tổng HN, KCN Đài Tư, Long Biên, Hà Nội',
    poCode: 'VC-2026-GHN01',
    totalAmount: 24500000,
    paidAmount: 15000000,
    remainingAmount: 9500000,
    dueDate: '08/11/2026',
    status: 'pending',
    statusLabel: 'Chờ thanh toán',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'transporter',
    notes: 'Giao nhanh các tỉnh thành · Tích hợp API tạo đơn tự động chuyển phát phụ kiện',
    entries: [
      { id: 'E-GHN-1', code: 'VC-20261015-0001', title: 'Bảng kê VC-20261015-0001: Cước chuyển phát nhanh linh kiện bảo hành toàn quốc (Kỳ 1)', date: '15/10/2026', totalAmount: 15000000, paidAmount: 15000000, remainingAmount: 0, dueDate: '20/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
      { id: 'E-GHN-2', code: 'VC-20261026-0002', title: 'Bảng kê VC-20261026-0002: Cước chuyển phát nhanh phụ kiện sen vòi (Kỳ 2)', date: '26/10/2026', totalAmount: 9500000, paidAmount: 0, remainingAmount: 9500000, dueDate: '08/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
    ]
  },
  {
    id: 'PAY-SJ-12',
    code: 'CNVC-2026-005',
    supplierName: 'Đội xe vận chuyển nội bộ Seajong Faucet',
    supplierAddress: 'Kho tổng Seajong, KCN Yên Nghĩa, Hà Đông, Hà Nội',
    poCode: 'VC-2026-NB01',
    totalAmount: 18000000,
    paidAmount: 18000000,
    remainingAmount: 0,
    dueDate: '15/10/2026',
    status: 'completed',
    statusLabel: 'Đã hoàn tất thanh toán',
    accountant: 'Phạm Thu Hằng',
    partnerType: 'transporter',
    notes: 'Tuyến nội thành Hà Nội & các tỉnh lân cận bán kính 100km · 02 xe tải 2.5 tấn',
    entries: [
      { id: 'E-NB-1', code: 'VC-20261015-0001', title: 'Phiếu quyết toán VC-20261015-0001: Xăng dầu & phí đường bộ xe tải giao showroom nội thành', date: '15/10/2026', totalAmount: 18000000, paidAmount: 18000000, remainingAmount: 0, dueDate: '15/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' }
    ]
  }
];

const INITIAL_LOANS: LoanItem[] = [];
const INITIAL_EXPENSES: ExpenseItem[] = [];

// Hàm lấy tên tài khoản đăng nhập hiện tại từ props hoặc session lưu trữ
const getLoggedInUserName = (userProp?: any): string => {
  if (userProp?.name) return userProp.name;
  if (userProp?.fullName) return userProp.fullName;
  try {
    const saved = localStorage.getItem('decodoor_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.user?.name) return parsed.user.name;
      if (parsed.user?.fullName) return parsed.user.fullName;
      if (parsed.user?.username) return parsed.user.username;
    }
  } catch {}
  return '';
};

export const DebtCostManagementView: React.FC<DebtCostManagementViewProps> = ({
  currentStep,
  onShowToast,
  user,
  onUpdateTickerItems,
}) => {
  // Dữ liệu từng bước
  const [receivables, setReceivables] = useState<ReceivableItem[]>(INITIAL_RECEIVABLES);
  const [payables, setPayables] = useState<PayableItem[]>(INITIAL_PAYABLES);
  const [loans, setLoans] = useState<LoanItem[]>(INITIAL_LOANS);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  const [_isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [dbFixedAssets, setDbFixedAssets] = useState<any[]>([]);

  // Tính toán mức trích khấu hao TSCĐ định kỳ hàng tháng từ cơ sở dữ liệu fixed_assets
  const fixedAssetDepreciationMonthly = useMemo(() => {
    let prod = 0;
    let sales = 0;
    let admin = 0;

    const assetsToUse = dbFixedAssets || [];

    assetsToUse.forEach((asset: any) => {
      const orig = Number(asset.originalPrice) || 0;
      const months = Number(asset.depreciationMonths) || 60;
      const monthlyAmt = months > 0 ? Math.round(orig / months) : 0;
      const cat = asset.category || '';

      if (cat === 'machinery' || cat === 'workshop' || cat === 'measuring') {
        prod += monthlyAmt;
      } else if (cat === 'vehicle') {
        sales += monthlyAmt;
      } else {
        admin += monthlyAmt;
      }
    });

    return {
      prod,
      sales,
      admin,
      total: prod + sales + admin,
    };
  }, [dbFixedAssets]);

  // Tính toán số liệu thống kê realtime cho Ticker chuyên biệt theo từng tab (bước) được chọn
  const debtCostTickerItems = useMemo<TickerItem[]>(() => {
    // 1. Dữ liệu chuyên biệt Bước 1: Công nợ phải thu
    if (currentStep === 1) {
      const totalRecRemaining = receivables.reduce((sum, r) => sum + (Number(r.remainingAmount) || 0), 0);
      const totalRecPaid = receivables.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
      const totalRecContract = receivables.reduce((sum, r) => sum + (Number(r.contractValue) || (Number(r.paidAmount) + Number(r.remainingAmount)) || 0), 0);
      const recoveryRate = totalRecContract > 0 ? ((totalRecPaid / totalRecContract) * 100).toFixed(1) : '0';

      const overdueRecItems = receivables.filter((r) => r.status === 'overdue' || (r.entries || []).some((e) => e.status === 'overdue'));
      const totalRecOverdue = receivables.reduce((sum, r) => {
        if (r.status === 'overdue') return sum + (Number(r.remainingAmount) || 0);
        const entrySum = (r.entries || []).filter((e) => e.status === 'overdue').reduce((s, e) => s + (Number(e.remainingAmount) || 0), 0);
        return sum + entrySum;
      }, 0);

      const dueRecItems = receivables.filter((r) => r.status === 'due' || (r.entries || []).some((e) => e.status === 'due'));
      const totalRecDue = receivables.reduce((sum, r) => {
        if (r.status === 'due') return sum + (Number(r.remainingAmount) || 0);
        const entrySum = (r.entries || []).filter((e) => e.status === 'due').reduce((s, e) => s + (Number(e.remainingAmount) || 0), 0);
        return sum + entrySum;
      }, 0);

      const ontimeRemaining = Math.max(0, totalRecRemaining - totalRecOverdue - totalRecDue);

      return [
        {
          tag: 'CÔNG NỢ PHẢI THU',
          tagVariant: 'brand' as const,
          text: `Tổng giá trị hợp đồng: **${formatNumberGroup(totalRecContract)} đ** (${receivables.length} khách hàng) • Còn phải thu: **${formatNumberGroup(totalRecRemaining)} đ**`,
        },
        {
          tag: 'ĐÃ THU HỒI',
          tagVariant: 'success' as const,
          text: `Đã thu hồi tiền nợ: **${formatNumberGroup(totalRecPaid)} đ** (Tỷ lệ thu hồi đạt **${recoveryRate}%**)`,
        },
        {
          tag: overdueRecItems.length > 0 ? 'NỢ QUÁ HẠN' : 'TRONG HẠN AN TOÀN',
          tagVariant: overdueRecItems.length > 0 ? ('danger' as const) : ('success' as const),
          text: overdueRecItems.length > 0
            ? `Cảnh báo: Có **${overdueRecItems.length} khoản nợ quá hạn** với tổng số tiền **${formatNumberGroup(totalRecOverdue)} đ**`
            : `Dư nợ trong hạn an toàn: **${formatNumberGroup(ontimeRemaining || totalRecRemaining)} đ** (100% trong hạn)`,
        },
        {
          tag: 'SẮP ĐẾN HẠN',
          tagVariant: totalRecDue > 0 ? ('warning' as const) : ('info' as const),
          text: totalRecDue > 0
            ? `Có **${dueRecItems.length} khoản nợ sắp đến hạn**: **${formatNumberGroup(totalRecDue)} đ** (cần theo dõi đôn đốc thu)`
            : `Hiện không có khoản nợ nào sắp đến hạn cần cảnh báo`,
        },
        {
          tag: 'TIẾN ĐỘ THU HỒI',
          tagVariant: 'brand' as const,
          text: `Theo dõi đối soát công nợ theo từng mốc nghiệm thu kỹ thuật và lịch thanh toán hợp đồng`,
        },
      ];
    }

    // 2. Dữ liệu chuyên biệt Bước 2: Công nợ phải trả
    if (currentStep === 2) {
      const totalPayRemaining = payables.reduce((sum, p) => sum + (Number(p.remainingAmount) || 0), 0);
      const totalPayPaid = payables.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
      const totalPayContract = payables.reduce((sum, p) => sum + (Number(p.totalAmount) || (Number(p.paidAmount) + Number(p.remainingAmount)) || 0), 0);
      const payRate = totalPayContract > 0 ? ((totalPayPaid / totalPayContract) * 100).toFixed(1) : '0';

      const dueSoonPayItems = payables.filter((p) => p.status === 'due_soon' || (p.entries || []).some((e) => e.status === 'due_soon'));
      const totalPayDueSoon = payables.reduce((sum, p) => {
        if (p.status === 'due_soon') return sum + (Number(p.remainingAmount) || 0);
        const entrySum = (p.entries || []).filter((e) => e.status === 'due_soon').reduce((s, e) => s + (Number(e.remainingAmount) || 0), 0);
        return sum + entrySum;
      }, 0);

      const overduePayItems = payables.filter((p) => p.status === 'overdue' || (p.entries || []).some((e) => e.status === 'overdue'));
      const totalPayOverdue = payables.reduce((sum, p) => {
        if (p.status === 'overdue') return sum + (Number(p.remainingAmount) || 0);
        const entrySum = (p.entries || []).filter((e) => e.status === 'overdue').reduce((s, e) => s + (Number(e.remainingAmount) || 0), 0);
        return sum + entrySum;
      }, 0);

      return [
        {
          tag: 'CÔNG NỢ PHẢI TRẢ',
          tagVariant: 'brand' as const,
          text: `Tổng nợ phải trả nhà cung cấp: **${formatNumberGroup(totalPayRemaining)} đ** (${payables.length} đối tác) • Tổng giá trị PO: **${formatNumberGroup(totalPayContract)} đ**`,
        },
        {
          tag: 'ĐÃ THANH TOÁN',
          tagVariant: 'success' as const,
          text: `Lũy kế tiền hàng đã trả nhà cung cấp: **${formatNumberGroup(totalPayPaid)} đ** (Đạt **${payRate}%**)`,
        },
        {
          tag: totalPayDueSoon > 0 ? 'ĐẾN HẠN THANH TOÁN' : 'HẠN MỨC THANH TOÁN',
          tagVariant: totalPayDueSoon > 0 ? ('warning' as const) : ('success' as const),
          text: totalPayDueSoon > 0
            ? `Có **${dueSoonPayItems.length} đơn hàng PO** đến hạn thanh toán: **${formatNumberGroup(totalPayDueSoon)} đ**`
            : `100% các khoản phải trả nhà cung cấp đều trong thời hạn thanh toán`,
        },
        {
          tag: totalPayOverdue > 0 ? 'NỢ QUÁ HẠN TRẢ' : 'UY TÍN ĐỐI TÁC',
          tagVariant: totalPayOverdue > 0 ? ('danger' as const) : ('info' as const),
          text: totalPayOverdue > 0
            ? `Cảnh báo: Có **${overduePayItems.length} khoản nợ quá hạn** chưa trả NCC: **${formatNumberGroup(totalPayOverdue)} đ**`
            : `Đảm bảo uy tín thanh toán đúng hẹn để hưởng chính sách chiết khấu vật tư tốt nhất`,
        },
        {
          tag: 'KẾ HOẠCH DÒNG TIỀN',
          tagVariant: 'brand' as const,
          text: `Cân đối dòng tiền chi trả vật tư gỗ An Cường, phụ kiện kim khí và các tổ đội gia công`,
        },
      ];
    }

    // 3. Dữ liệu chuyên biệt Bước 3: Nợ vay ngân hàng
    if (currentStep === 3) {
      const totalLoanRemaining = loans.reduce((sum, l) => sum + (Number(l.remainingPrincipal) || 0), 0);
      const totalLoanLimit = loans.reduce((sum, l) => sum + (Number(l.loanLimit) || 0), 0);
      const totalLoanPaid = loans.reduce((sum, l) => sum + (Number(l.paidPrincipal) || 0), 0);
      const totalLoan12m = loans.reduce((sum, l) => sum + (Number(l.dueWithin12m) || 0), 0);
      const totalLoanInterest = loans.reduce((sum, l) => sum + (Number(l.monthlyInterestEst) || 0), 0);
      const loanDisburseRate = totalLoanLimit > 0 ? ((totalLoanRemaining / totalLoanLimit) * 100).toFixed(1) : '0';

      return [
        {
          tag: 'HẠN MỨC TÍN DỤNG',
          tagVariant: 'brand' as const,
          text: `Tổng hạn mức tín dụng được cấp: **${formatNumberGroup(totalLoanLimit)} đ** (${loans.length} hợp đồng tín dụng)`,
        },
        {
          tag: 'DƯ NỢ GỐC THỰC TẾ',
          tagVariant: 'warning' as const,
          text: `Dư nợ tín dụng thực tế đang vay: **${formatNumberGroup(totalLoanRemaining)} đ** (Tỷ lệ giải ngân: **${loanDisburseRate}%**)`,
        },
        {
          tag: 'ĐÃ TRẢ NỢ GỐC',
          tagVariant: 'success' as const,
          text: `Lũy kế nợ gốc đã hoàn trả ngân hàng: **${formatNumberGroup(totalLoanPaid)} đ**`,
        },
        {
          tag: 'GỐC ĐẾN HẠN 12T',
          tagVariant: 'danger' as const,
          text: `Nợ gốc ngân hàng đến hạn trả trong 12 tháng tới (Mã 320 B01): **${formatNumberGroup(totalLoan12m)} đ**`,
        },
        {
          tag: 'CHI PHÍ LÃI VAY',
          tagVariant: 'info' as const,
          text: totalLoanInterest > 0
            ? `Ước tính lãi vay phải trả tháng này: **${formatNumberGroup(totalLoanInterest)} đ** (TK 635)`
            : `Theo dõi sát biến động lãi suất tín dụng và kế hoạch trả nợ định kỳ`,
        },
      ];
    }

    // 4. Dữ liệu chuyên biệt Bước 4: Quản lý chi phí
    const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const approvedExpense = expenses.filter((e) => e.status === 'approved').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const currentMonthExpenses = expenses.filter((e) => {
      const parts = e.spendDate.split('/');
      return parts.length >= 3 && parts[1] === '10' && parts[2] === selectedYear;
    });
    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return [
      {
        tag: 'QUẢN LÝ CHI PHÍ',
        tagVariant: 'brand' as const,
        text: `Tổng chi phí năm ${selectedYear}: **${formatNumberGroup(totalExpense)} đ** (${expenses.length} khoản mục phát sinh)`,
      },
      {
        tag: 'ĐÃ DUYỆT CHI',
        tagVariant: 'success' as const,
        text: `Chi phí đã được phê duyệt giải ngân: **${formatNumberGroup(approvedExpense)} đ** (${expenses.filter((e) => e.status === 'approved').length} phiếu)`,
      },
      {
        tag: 'CHI PHÍ THÁNG NÀY',
        tagVariant: 'warning' as const,
        text: `Chi phí phát sinh trong tháng 10/${selectedYear}: **${formatNumberGroup(currentMonthTotal)} đ**`,
      },
      {
        tag: 'KHẤU HAO TỰ ĐỘNG',
        tagVariant: 'info' as const,
        text: `Trích khấu hao TSCĐ tự động định kỳ: **${formatNumberGroup(fixedAssetDepreciationMonthly.total)} đ/tháng** vào Sổ nhật ký chung`,
      },
      {
        tag: 'KIỂM SOÁT ĐỊNH MỨC',
        tagVariant: 'brand' as const,
        text: `Kiểm soát chặt chẽ định mức chi phí sản xuất (TK 621, 622, 627) và chi phí bán hàng, QLDN (TK 641, 642)`,
      },
    ];
  }, [receivables, payables, loans, expenses, currentStep, selectedYear, fixedAssetDepreciationMonthly]);

  useEffect(() => {
    onUpdateTickerItems?.(debtCostTickerItems);
  }, [debtCostTickerItems, onUpdateTickerItems]);

  // Cấu hình mốc tuổi nợ (Đến hạn, Quá hạn)
  const [isDebtAgingConfigOpen, setIsDebtAgingConfigOpen] = useState(false);
  const [debtAgingConfig, setDebtAgingConfig] = useState<DebtAgingConfig>(() => {
    try {
      const cached = localStorage.getItem('decodoor_debt_aging_config');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_DEBT_AGING_CONFIG;
  });

  useEffect(() => {
    fetch('/api/debts/aging-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.dueSoonDays === 'number') {
          setDebtAgingConfig(d);
          try {
            localStorage.setItem('decodoor_debt_aging_config', JSON.stringify(d));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Tải dữ liệu thực tế từ Database kèm tính toán trạng thái theo cấu hình tuổi nợ
  const fetchReceivables = async (agingCfg = debtAgingConfig) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/debts/receivables');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const enriched = data.map((item: ReceivableItem) => {
            const calculated = calculateReceivableAgingStatus(item.dueDate, item.remainingAmount, agingCfg);
            const enrichedEntries = (item.entries || []).map((entry) => {
              const eRem = entry.remainingAmount !== undefined ? entry.remainingAmount : (entry.contractValue - (entry.paidAmount || 0));
              const eCalc = calculateReceivableAgingStatus(entry.dueDate || item.dueDate, eRem, agingCfg);
              return {
                ...entry,
                status: eCalc.status,
                statusLabel: eCalc.statusLabel,
              };
            });
            return {
              ...item,
              status: calculated.status,
              statusLabel: calculated.statusLabel,
              entries: enrichedEntries,
            };
          });
          const cleanReceivables = enriched.filter((item: any) =>
            !String(item.id || '').startsWith('PAY-') &&
            !String(item.code || '').startsWith('CNTR-') &&
            !String(item.code || '').startsWith('CNVC-') &&
            !(item.supplierName && !item.customerName)
          );
          setReceivables(cleanReceivables);
          return;
        }
      }
      setReceivables(INITIAL_RECEIVABLES);
    } catch (err) {
      console.error('Lỗi tải danh sách công nợ phải thu:', err);
      setReceivables(INITIAL_RECEIVABLES);
    } finally {
      setIsLoading(false);
    }
  };

  const [dbCustomers, setDbCustomers] = useState<Array<{ id: string; code: string; name: string; address?: string; phone?: string }>>([]);

  const fetchDbCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setDbCustomers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách khách hàng từ DB:', err);
    }
  };

  const fetchPayables = async () => {
    try {
      const res = await fetch('/api/debts/payables');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const cleanPayables = data.filter((item: any) =>
            !String(item.id || '').startsWith('REC-') &&
            !String(item.code || '').startsWith('CNPT-') &&
            !(item.customerName && !item.supplierName)
          );
          setPayables(cleanPayables);
          return;
        }
      }
      setPayables(INITIAL_PAYABLES);
    } catch (err) {
      console.error('Lỗi tải danh sách công nợ phải trả:', err);
      setPayables(INITIAL_PAYABLES);
    }
  };

  const fetchLoans = async () => {
    try {
      const res = await fetch('/api/debts/loans');
      if (res.ok) {
        const data = await res.json();
        setLoans(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách nợ vay từ DB:', err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/debts/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chi phí từ DB:', err);
    }
  };

  const [dbCashAssets, setDbCashAssets] = useState<Array<{ id: string; name: string; accountNumber: string; bankName: string }>>([]);

  const fetchDbFixedAssets = async () => {
    try {
      const res = await fetch('/api/finance/assets');
      if (res.ok) {
        const data = await res.json();
        setDbFixedAssets(Array.isArray(data) ? data : []);
        return;
      }
    } catch (err) {
      console.error('Lỗi tải danh sách TSCĐ từ máy chủ:', err);
    }
    setDbFixedAssets([]);
  };

  const fetchDbCashAssets = async () => {
    try {
      const res = await fetch('/api/finance/cash-assets');
      if (res.ok) {
        const data = await res.json();
        setDbCashAssets(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách tài khoản ngân hàng:', err);
    }
  };

  const handleSyncAll = () => {
    fetchReceivables();
    fetchPayables();
    fetchDbCustomers();
    fetchLoans();
    fetchExpenses();
    fetchDbFixedAssets();
    fetchDbCashAssets();
  };

  useEffect(() => {
    handleSyncAll();
  }, []);

  // Bộ lọc và tìm kiếm dùng chung cho từng bước
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Bộ lọc chuyên sâu cho nợ vay ngân hàng (Bước 3)
  const [loanFacilityFilter, setLoanFacilityFilter] = useState('all');
  const [loanTermFilter, setLoanTermFilter] = useState('all');

  // Bộ lọc cho Công nợ phải trả (Bước 2: Tất cả / Nhà cung cấp / Đơn vị vận chuyển)
  const [payablePartnerFilter, setPayablePartnerFilter] = useState<'all' | 'supplier' | 'transporter'>('all');

  // Modal quản lý Khế ước nhận nợ (Drawdowns / KUNN)
  const [isDrawdownModalOpen, setIsDrawdownModalOpen] = useState(false);
  const [selectedLoanForDrawdown, setSelectedLoanForDrawdown] = useState<LoanItem | null>(null);
  const [drawdowns, setDrawdowns] = useState<LoanDrawdownItem[]>([]);
  const [isLoadingDrawdowns, setIsLoadingDrawdowns] = useState(false);
  const [isAddingDrawdown, setIsAddingDrawdown] = useState(false);
  const [ddCode, setDdCode] = useState('');
  const [ddDate, setDdDate] = useState('');
  const [ddMaturity, setDdMaturity] = useState('');
  const [ddAmount, setDdAmount] = useState('');
  const [ddRate, setDdRate] = useState('6.5');
  const [ddPurpose, setDdPurpose] = useState('');

  const fetchDrawdowns = async (loanId: string) => {
    try {
      setIsLoadingDrawdowns(true);
      const res = await fetch(`/api/debts/loans/${loanId}/drawdowns`);
      if (res.ok) {
        const data = await res.json();
        setDrawdowns(data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách khế ước:', err);
    } finally {
      setIsLoadingDrawdowns(false);
    }
  };

  const handleOpenDrawdownModal = (loan: LoanItem) => {
    setSelectedLoanForDrawdown(loan);
    setIsDrawdownModalOpen(true);
    setIsAddingDrawdown(false);
    setDdCode(`KUNN-${new Date().getFullYear()}/${loan.code.replace('VAY-', '')}-${String(Math.floor(Math.random() * 90) + 10)}`);
    setDdDate(new Date().toLocaleDateString('vi-VN'));
    setDdMaturity(loan.maturityDate || '31/12/2026');
    setDdAmount('');
    setDdRate(String(loan.interestRateVal || 6.5));
    setDdPurpose('');
    fetchDrawdowns(loan.id);
  };

  const handleSaveDrawdown = async () => {
    if (!selectedLoanForDrawdown) return;
    const amtNum = Number(ddAmount.replace(/\D/g, '')) || 0;
    if (amtNum <= 0) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập số tiền giải ngân');
      return;
    }
    try {
      const payload = {
        drawdownCode: ddCode || `KUNN-${Date.now().toString().slice(-4)}`,
        drawdownDate: ddDate || new Date().toLocaleDateString('vi-VN'),
        maturityDate: ddMaturity || '31/12/2026',
        amount: amtNum,
        paidPrincipal: 0,
        remainingPrincipal: amtNum,
        interestRate: Number(ddRate) || 6.5,
        purpose: ddPurpose,
        status: 'active',
      };
      const res = await fetch(`/api/debts/loans/${selectedLoanForDrawdown.id}/drawdowns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (onShowToast) onShowToast('success', 'Thành công', 'Đã thêm khế ước giải ngân mới');
        setIsAddingDrawdown(false);
        fetchDrawdowns(selectedLoanForDrawdown.id);
        fetchLoans();
        notifyFinanceUpdated();
      }
    } catch (e) {
      console.error('Lỗi lưu khế ước:', e);
    }
  };

  const handleDeleteDrawdown = async (drawdownId: string) => {
    if (!selectedLoanForDrawdown) return;
    try {
      const res = await fetch(`/api/debts/loans/drawdowns/${drawdownId}`, { method: 'DELETE' });
      if (res.ok) {
        if (onShowToast) onShowToast('success', 'Đã xóa', 'Đã xóa khế ước nhận nợ');
        fetchDrawdowns(selectedLoanForDrawdown.id);
        fetchLoans();
        notifyFinanceUpdated();
      }
    } catch (e) {
      console.error('Lỗi xóa khế ước:', e);
    }
  };

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Tự động làm sạch và đặt lại bộ lọc về 'all' khi chuyển tab/bước để không bị ẩn dữ liệu nhầm
  useEffect(() => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setLoanFacilityFilter('all');
    setLoanTermFilter('all');
    setPayablePartnerFilter('all');
    setSearchValue('');
    setCurrentPage(1);

    // Kích hoạt nạp dữ liệu chính xác tương ứng với từng bước, ngăn ngừa tình trạng lẫn dữ liệu
    if (currentStep === 1) {
      fetchReceivables();
    } else if (currentStep === 2) {
      fetchPayables();
    } else if (currentStep === 3) {
      fetchLoans();
    } else if (currentStep === 4) {
      fetchExpenses();
    }
  }, [currentStep]);

  // Dropdown ba cham tren tung dong
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);

  // Modal Offcanvas them/sua
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formPartnerType, setFormPartnerType] = useState<'supplier' | 'transporter'>('supplier');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formProjectOrPo, setFormProjectOrPo] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Các trường mở rộng chuẩn quản trị nợ vay ngân hàng (Bước 3)
  const [formContractCode, setFormContractCode] = useState('');
  const [formLoanType, setFormLoanType] = useState('');
  const [formFacilityType, setFormFacilityType] = useState<string>('working_capital');
  const [formTermType, setFormTermType] = useState<string>('short_term');
  const [formDueWithin12m, setFormDueWithin12m] = useState<string>('0');
  const [formInterestRateVal, setFormInterestRateVal] = useState<string>('7.5');
  const [formInterestType, setFormInterestType] = useState<string>('floating');
  const [formInterestPaymentDay, setFormInterestPaymentDay] = useState<string>('25');
  const [formCollateralName, setFormCollateralName] = useState<string>('');
  const [formCollateralValue, setFormCollateralValue] = useState<string>('');
  const [formBankAccountNumber, setFormBankAccountNumber] = useState<string>('');

  // Các trường định khoản kế toán và nghiệp vụ chi chuyên sâu (Bước 4)
  const [formExpenseOpType, setFormExpenseOpType] = useState<string>('production_overhead');
  const [formDebitAccount, setFormDebitAccount] = useState<string>('627');
  const [formDebitAccountName, setFormDebitAccountName] = useState<string>('Chi phí sản xuất chung');
  const [formCreditAccount, setFormCreditAccount] = useState<string>('1111');
  const [formCreditAccountName, setFormCreditAccountName] = useState<string>('Tiền Việt Nam (Tiền mặt quỹ)');
  const [formExpenseCategory, setFormExpenseCategory] = useState<'production' | 'sales' | 'administrative' | 'finance'>('production');
  const [formExpenseCategoryLabel, setFormExpenseCategoryLabel] = useState<string>('Chi phí sản xuất');
  const [formExpenseDepartment, setFormExpenseDepartment] = useState<string>('Khối Sản Xuất');
  const currentLoggedInUserName = useMemo(() => getLoggedInUserName(user), [user]);
  const [formSpender, setFormSpender] = useState<string>(() => getLoggedInUserName(user));
  const [formProposer, setFormProposer] = useState<string>('');
  const [formSelectedLoanId, setFormSelectedLoanId] = useState<string>('');

  // Modal xem chi tiết phân bổ khấu hao 12 tài sản cố định
  const [isDeprecModalOpen, setIsDeprecModalOpen] = useState(false);
  const [selectedDeprecItem, setSelectedDeprecItem] = useState<ExpenseItem | null>(null);

  // Lựa chọn in phiếu chi sau khi lập và modal xem trước in ấn
  const [isPrintPaymentVoucherChecked, setIsPrintPaymentVoucherChecked] = useState<boolean>(true);
  const [isPrintVoucherModalOpen, setIsPrintVoucherModalOpen] = useState<boolean>(false);
  const [voucherToPrint, setVoucherToPrint] = useState<ExpenseItem | null>(null);

  // Modal xem trước và in phiếu thu A4 (PrintPreview) sau khi ghi nhận thanh toán
  const [isPrintReceiptModalOpen, setIsPrintReceiptModalOpen] = useState<boolean>(false);
  const [receiptToPrint, setReceiptToPrint] = useState<ReceiptVoucherData | null>(null);

  // Modal lập và in báo cáo công nợ, nợ vay và chi phí (sử dụng PrintPreview)
  const [isReportPrintModalOpen, setIsReportPrintModalOpen] = useState<boolean>(false);

  // Danh sách gợi ý loại nghiệp vụ chi cho SuggestionInput
  const expenseSuggestions = useMemo<SuggestionItem[]>(() => {
    return EXPENSE_OPERATION_TYPES.map((op) => ({
      id: op.id,
      value: op.label,
      label: op.label,
      category: op.catLabel,
      subText: `Nợ TK ${op.debit} • Có TK ${op.credit}`,
    }));
  }, []);

  // Tên hiển thị loại nghiệp vụ chi hiện tại
  const selectedExpenseOp = EXPENSE_OPERATION_TYPES.find(
    (o) => o.id === formExpenseOpType || o.label === formExpenseOpType
  );
  const formExpenseOpName = selectedExpenseOp ? selectedExpenseOp.label : formExpenseOpType;

  // Xử lý khi người dùng chọn loại nghiệp vụ chi -> Tự động định khoản kép
  const handleExpenseOpTypeChange = (opIdOrLabel: string) => {
    const op = EXPENSE_OPERATION_TYPES.find(
      (o) =>
        o.id === opIdOrLabel ||
        o.label.toLowerCase() === opIdOrLabel.trim().toLowerCase()
    );
    if (op) {
      setFormExpenseOpType(op.id);
      setFormDebitAccount(op.debit);
      setFormDebitAccountName(op.debitName);
      setFormCreditAccount(op.credit);
      setFormCreditAccountName(op.creditName);
      setFormExpenseCategory(op.cat);
      setFormExpenseCategoryLabel(op.catLabel);
      setFormExpenseDepartment(op.dept);

      if (!formName || EXPENSE_OPERATION_TYPES.some((o) => o.label === formName || formName.startsWith(o.catLabel))) {
        setFormName(op.label.replace(/\s*\(.*\)$/, ''));
      }
    } else {
      setFormExpenseOpType(opIdOrLabel);
    }
  };

  // Xử lý khi chọn hợp đồng vay ngân hàng để trả lãi
  const handleSelectLoanForInterest = (loanId: string) => {
    setFormSelectedLoanId(loanId);
    const loan = loans.find((l) => l.id === loanId);
    if (loan) {
      const curMonth = new Date().getMonth() + 1;
      const monthStr = curMonth < 10 ? `0${curMonth}` : `${curMonth}`;
      setFormAmount(String(loan.monthlyInterestEst || 0));
      setFormName(`Chi trả lãi vay ${loan.bankName} Tháng ${monthStr}/${selectedYear}`);
      setFormCreditAccount('1121');
      setFormCreditAccountName('Tiền gửi ngân hàng Vietcombank');
      setFormExpenseCategory('finance');
      setFormExpenseCategoryLabel('Chi phí tài chính');
      setFormExpenseDepartment('Phòng Tài Chính Kế Toán');
    }
  };

  // Cập nhật giá trị form khi mở Offcanvas
  useEffect(() => {
    if (editingItem) {
      setFormCustomerId(editingItem.customerId || '');
      setFormCode(editingItem.code || '');
      setFormName(
        editingItem.customerName ||
        editingItem.supplierName ||
        editingItem.bankName ||
        editingItem.title ||
        ''
      );
      setFormAddress(
        editingItem.customerAddress ||
        editingItem.supplierAddress ||
        ''
      );
      setFormProjectOrPo(
        editingItem.projectName ||
        editingItem.poCode ||
        ''
      );
      setFormAmount(
        String(
          editingItem.contractValue ||
          editingItem.totalAmount ||
          editingItem.loanLimit ||
          editingItem.amount ||
          ''
        )
      );
      setFormDueDate(editingItem.dueDate || editingItem.maturityDate || editingItem.spendDate || '');
      setFormNotes(editingItem.notes || '');

      // Điền các trường nợ vay nếu là bước 3
      if (currentStep === 3) {
        setFormContractCode(editingItem.contractCode || '');
        setFormLoanType(editingItem.loanType || '');
        setFormFacilityType(editingItem.facilityType || 'working_capital');
        setFormTermType(editingItem.termType || 'short_term');
        setFormDueWithin12m(String(editingItem.dueWithin12m || 0));
        setFormInterestRateVal(String(editingItem.interestRateVal || 7.5));
        setFormInterestType(editingItem.interestType || 'floating');
        setFormInterestPaymentDay(String(editingItem.interestPaymentDay || 25));
        setFormCollateralName(editingItem.collateralName || '');
        setFormCollateralValue(editingItem.collateralValue ? String(editingItem.collateralValue) : '');
        setFormBankAccountNumber(editingItem.bankAccountNumber || '');
      }

      // Điền các trường chi phí nếu là bước 4
      if (currentStep === 4) {
        setFormExpenseOpType(editingItem.operationType || 'production_overhead');
        setFormDebitAccount(editingItem.debitAccount || '627');
        setFormDebitAccountName(editingItem.debitAccountName || 'Chi phí sản xuất chung');
        setFormCreditAccount(editingItem.creditAccount || '1111');
        setFormCreditAccountName(editingItem.creditAccountName || 'Tiền Việt Nam (Tiền mặt quỹ)');
        setFormExpenseCategory(editingItem.category || 'production');
        setFormExpenseCategoryLabel(editingItem.categoryLabel || 'Chi phí sản xuất');
        setFormExpenseDepartment(editingItem.department || 'Khối Sản Xuất');
        setFormSpender(editingItem.spender || currentLoggedInUserName);
        setFormProposer(editingItem.proposer || '');
        setFormSelectedLoanId('');
      }
    } else {
      setFormCustomerId('');
      setFormCode('');
      setFormName('');
      setFormAddress('');
      setFormProjectOrPo('');
      setFormAmount('');
      setFormDueDate(new Date().toLocaleDateString('vi-VN'));
      setFormNotes('');

      // Mặc định nợ vay mới
      setFormContractCode('');
      setFormLoanType('');
      setFormFacilityType('working_capital');
      setFormTermType('short_term');
      setFormDueWithin12m('0');
      setFormInterestRateVal('7.5');
      setFormInterestType('floating');
      setFormInterestPaymentDay('25');
      setFormCollateralName('');
      setFormCollateralValue('');
      setFormBankAccountNumber('');

      // Mặc định chi phí mới
      setFormExpenseOpType('production_overhead');
      setFormDebitAccount('627');
      setFormDebitAccountName('Chi phí sản xuất chung');
      setFormCreditAccount('1111');
      setFormCreditAccountName('Tiền Việt Nam (Tiền mặt quỹ)');
      setFormExpenseCategory('production');
      setFormExpenseCategoryLabel('Chi phí sản xuất');
      setFormExpenseDepartment('Khối Sản Xuất');
      setFormSpender(currentLoggedInUserName);
      setFormProposer('');
      setFormSelectedLoanId('');
    }
  }, [editingItem, isOffcanvasOpen, currentStep, selectedYear, currentLoggedInUserName]);

  // Modal Ghi nhận thanh toán bước 1 và bước 2
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedReceivableForPayment, setSelectedReceivableForPayment] = useState<ReceivableItem | null>(null);
  const [selectedPayableForPayment, setSelectedPayableForPayment] = useState<PayableItem | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Chuyển khoản');
  const [paymentDate, setPaymentDate] = useState('19:14 04/10/2026');
  const [paymentNote, setPaymentNote] = useState('');

  // Offcanvas Ghi nhận thanh toán thu nợ khách hàng rộng 480px (chuẩn nghiệp vụ kế toán)
  const [paymentOffcanvasOpen, setPaymentOffcanvasOpen] = useState(false);
  const [selectedStageForPayment, setSelectedStageForPayment] = useState<DebtEntryItem | null>(null);
  const [receiptCodeInput, setReceiptCodeInput] = useState('PT-20261004-396');
  const [printReceiptChecked, setPrintReceiptChecked] = useState(true);
  const [linkedOrderInput, setLinkedOrderInput] = useState('Dư nợ đầu kỳ');

  // Nghiệp vụ kế toán định khoản kép & chứng từ thanh toán
  const [paymentDebitAccount, setPaymentDebitAccount] = useState('1121');
  const [paymentCreditAccount, setPaymentCreditAccount] = useState('131');
  const [paymentBankAccount, setPaymentBankAccount] = useState('Vietcombank - 0011004123456 - CN Thăng Long');
  const [paymentBankRef, setPaymentBankRef] = useState('');
  const [paymentPayerName, setPaymentPayerName] = useState('');
  const [paymentPayerAddress, setPaymentPayerAddress] = useState('');
  const [paymentAccountantName, setPaymentAccountantName] = useState('Phạm Thu Hằng (Kế toán thanh toán)');
  const [paymentOriginalDocsCount, setPaymentOriginalDocsCount] = useState('01 Giấy báo Có ngân hàng');

  // ── CÁC TRƯỜNG NGHIỆP VỤ HẠCH TOÁN KẾ TOÁN CHO OFFCANVAS LẬP PHIẾU CHI NHÀ CUNG CẤP (BƯỚC 2) ──
  const [selectedPayableEntryId, setSelectedPayableEntryId] = useState<string>('');
  const [payableVoucherCode, setPayableVoucherCode] = useState<string>('PC-20261027-01');
  const [payablePaymentDate, setPayablePaymentDate] = useState<string>('27/10/2026');
  const [payablePaymentTime, setPayablePaymentTime] = useState<string>('09:30');
  const [payableDebitAccount, setPayableDebitAccount] = useState<string>('331');
  const [payableCreditAccount, setPayableCreditAccount] = useState<string>('1121');
  const [payableSourceBank, setPayableSourceBank] = useState<string>('Vietcombank - 0011004329999 (Seajong VN)');
  const [payableDestBank, setPayableDestBank] = useState<string>('Vietcombank');
  const [payableDestAccount, setPayableDestAccount] = useState<string>('1029384756');
  const [payableDestBeneficiary, setPayableDestBeneficiary] = useState<string>('');
  const [payableReceiverName, setPayableReceiverName] = useState<string>('');
  const [payableReceiverAddress, setPayableReceiverAddress] = useState<string>('');
  const [payableOriginalDocsCount, setPayableOriginalDocsCount] = useState<string>('01 Giấy báo Nợ ngân hàng & 01 Hóa đơn PO');
  const [isPrintPayableVoucherChecked, setIsPrintPayableVoucherChecked] = useState<boolean>(true);

  const [customerPaymentHistories, setCustomerPaymentHistories] = useState<Record<string, PaymentHistoryRecord[]>>({
    'REC-001': [
      { id: 'hist-xm-1', code: 'PT-20261012-001', dateTime: '12/10/2026 11:28', method: 'Chuyển khoản', amount: 100000000, debitAccount: '1121', creditAccount: '131', bankAccount: 'Vietcombank - 0011004123456', bankRef: 'FT261012001' },
    ],
    'REC-002': [
      { id: 'hist-vin-1', code: 'PT-20261010-002', dateTime: '10/10/2026 14:20', method: 'Chuyển khoản', amount: 350000000, debitAccount: '1121', creditAccount: '131', bankAccount: 'BIDV - 12010000898866', bankRef: 'FT261010002' },
    ],
  });

  // Modal Đối chiếu công nợ bước 1 và bước 2
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [selectedReceivableForReconcile, setSelectedReceivableForReconcile] = useState<ReceivableItem | null>(null);
  const [selectedPayableForReconcile, setSelectedPayableForReconcile] = useState<PayableItem | null>(null);

  const reconcileDebt = useMemo(() => {
    if (selectedReceivableForReconcile) {
      return {
        ...selectedReceivableForReconcile,
        partnerName: selectedReceivableForReconcile.customerName,
        address: selectedReceivableForReconcile.customerAddress,
        type: 'RECEIVABLE' as const,
        amount: selectedReceivableForReconcile.contractValue,
        paymentHistory: customerPaymentHistories[selectedReceivableForReconcile.id] || [],
      };
    }
    if (selectedPayableForReconcile) {
      return {
        ...selectedPayableForReconcile,
        partnerName: selectedPayableForReconcile.supplierName,
        address: selectedPayableForReconcile.supplierAddress,
        type: 'PAYABLE' as const,
        amount: selectedPayableForReconcile.totalAmount,
      };
    }
    return null;
  }, [selectedReceivableForReconcile, selectedPayableForReconcile, customerPaymentHistories]);

  // Offcanvas chi tiết khoản nợ danh mục con rộng 400px
  const [subEntryDetailOpen, setSubEntryDetailOpen] = useState(false);
  const [selectedSubEntry, setSelectedSubEntry] = useState<{
    entry: any;
    parent: any;
    type: 'receivable' | 'payable';
  } | null>(null);

  const isAnyModalOpen = Boolean(
    reconcileModalOpen ||
    isDrawdownModalOpen ||
    selectedReceivableForPayment ||
    selectedPayableForPayment ||
    subEntryDetailOpen
  );

  // Kích hoạt đồng bộ thời gian thực (tự động tạm dừng polling ngầm khi bất kỳ modal/offcanvas nào đang mở)
  useFinanceRealtimeSync(handleSyncAll, !isAnyModalOpen);

  // Mac dinh chi mo rong noi dung con cua thang hien hanh la thang 10
  // Dam bao chi co duy nhat mot thang duoc hien noi dung con tai mot thoi diem
  const [activeExpandedMonth, setActiveExpandedMonth] = useState<number | null>(10);

  const toggleExpandMonth = (monthNum: number) => {
    setActiveExpandedMonth((prev) => (prev === monthNum ? null : monthNum));
  };

  // Confirm Dialog xoa
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Tai mot thoi diem chi hien cac danh muc con cua 1 khach hang (Buoc 1)
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>('AR-001');

  const toggleExpandCustomer = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCustomerId((prev) => (prev === id ? null : id));
  };

  // Tai mot thoi diem chi hien cac danh muc con cua 1 nha cung cap (Buoc 2)
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>('AP-001');

  const toggleExpandSupplier = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedSupplierId((prev) => (prev === id ? null : id));
  };

  // Reset trang và tìm kiếm khi chuyển bước
  useEffect(() => {
    setSearchValue('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
    setActiveRowMenuId(null);
  }, [currentStep]);

  // Đóng menu ba chấm của dòng khi click ra ngoài
  useEffect(() => {
    const handleWindowClick = () => {
      setActiveRowMenuId(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // ----------------------------------------------------
  // DỮ LIỆU ĐÃ LỌC CHO TỪNG BƯỚC
  // ----------------------------------------------------

  // Bước 1: Công nợ phải thu (lọc theo trạng thái hợp đồng hoặc các đợt phát sinh con)
  const filteredReceivables = useMemo(() => {
    return receivables.filter((item) => {
      // Hard filter: Chỉ chứa Khách hàng / Đại lý, tuyệt đối không lẫn NCC / Vận chuyển
      if (
        (item.id && String(item.id).startsWith('PAY-')) ||
        (item.code && (String(item.code).startsWith('CNTR-') || String(item.code).startsWith('CNVC-'))) ||
        ((item as any).supplierName && !item.customerName)
      ) {
        return false;
      }

      if (statusFilter !== 'all') {
        const itemMatches = item.status === statusFilter;
        const entryMatches = (item.entries || []).some((entry) => {
          if (statusFilter === 'completed') {
            const eRem = entry.remainingAmount !== undefined ? entry.remainingAmount : (entry.contractValue - (entry.paidAmount || 0));
            return eRem <= 0 || entry.status === 'completed';
          }
          if (statusFilter === 'ontime') {
            return entry.status === 'ontime';
          }
          if (statusFilter === 'due') {
            return entry.status === 'due' || entry.status === 'due_soon';
          }
          if (statusFilter === 'overdue') {
            return entry.status === 'overdue';
          }
          return entry.status === statusFilter;
        });

        if (statusFilter === 'completed') {
          if (!itemMatches && !entryMatches && item.remainingAmount > 0) return false;
        } else if (!itemMatches && !entryMatches) {
          return false;
        }
      }
      if (searchValue.trim()) {
        const query = searchValue.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(query);
        const matchCust = item.customerName.toLowerCase().includes(query);
        const matchProj = item.projectName.toLowerCase().includes(query);
        if (!matchCode && !matchCust && !matchProj) return false;
      }
      return true;
    });
  }, [receivables, statusFilter, searchValue]);

  // Bước 2: Công nợ phải trả (lọc theo trạng thái đơn PO hoặc các đợt trả con, Nhà cung cấp, Đơn vị vận chuyển)
  const filteredPayables = useMemo(() => {
    return payables.filter((item) => {
      // Hard filter: Chỉ chứa Nhà cung cấp & ĐV Vận chuyển, tuyệt đối không lẫn Khách hàng
      if (
        (item.id && String(item.id).startsWith('REC-')) ||
        (item.code && String(item.code).startsWith('CNPT-')) ||
        ((item as any).customerName && !item.supplierName)
      ) {
        return false;
      }

      // 1. Lọc theo trạng thái thanh toán
      if (statusFilter !== 'all') {
        const itemMatches = item.status === statusFilter;
        const entryMatches = (item.entries || []).some((entry) => {
          if (statusFilter === 'completed') {
            const eRem = entry.remainingAmount !== undefined ? entry.remainingAmount : (entry.totalAmount - (entry.paidAmount || 0));
            return eRem <= 0 || entry.status === 'completed';
          }
          if (statusFilter === 'pending') {
            return entry.status === 'pending';
          }
          if (statusFilter === 'due_soon') {
            return entry.status === 'due_soon';
          }
          if (statusFilter === 'overdue') {
            return entry.status === 'overdue';
          }
          return entry.status === statusFilter;
        });

        if (statusFilter === 'completed') {
          if (!itemMatches && !entryMatches && item.remainingAmount > 0) return false;
        } else if (!itemMatches && !entryMatches) {
          return false;
        }
      }

      const isTransporter = item.partnerType === 'transporter' || item.code?.startsWith('CNVC') || item.poCode?.startsWith('VC');

      // 2. Lọc theo đối tác (Tất cả / Nhà cung cấp / Đơn vị vận chuyển)
      if (payablePartnerFilter !== 'all') {
        const isTransporter = item.partnerType === 'transporter' || item.code?.startsWith('CNVC') || item.poCode?.startsWith('VC');
        if (payablePartnerFilter === 'supplier' && isTransporter) return false;
        if (payablePartnerFilter === 'transporter' && !isTransporter) return false;
      }

      // 3. Lọc theo từ khóa tìm kiếm
      if (searchValue.trim()) {
        const query = searchValue.toLowerCase().trim();
        const matchCode = (item.code || '').toLowerCase().includes(query);
        const matchSupp = (item.supplierName || '').toLowerCase().includes(query);
        const matchPo = (item.poCode || '').toLowerCase().includes(query);
        const matchAddr = (item.supplierAddress || '').toLowerCase().includes(query);
        if (!matchCode && !matchSupp && !matchPo && !matchAddr) return false;
      }
      return true;
    });
  }, [payables, statusFilter, payablePartnerFilter, searchValue]);

  // Bước 3: Nợ vay ngân hàng
  const filteredLoans = useMemo(() => {
    return loans.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (loanFacilityFilter !== 'all' && item.facilityType !== loanFacilityFilter) return false;
      if (loanTermFilter !== 'all' && item.termType !== loanTermFilter) return false;
      if (searchValue.trim()) {
        const query = searchValue.toLowerCase().trim();
        const matchCode = (item.code || '').toLowerCase().includes(query);
        const matchBank = (item.bankName || '').toLowerCase().includes(query);
        const matchContract = (item.contractCode || '').toLowerCase().includes(query);
        const matchFacility = (item.facilityLabel || '').toLowerCase().includes(query);
        const matchCollateral = (item.collateralName || '').toLowerCase().includes(query);
        const matchLoanType = (item.loanType || '').toLowerCase().includes(query);
        if (!matchCode && !matchBank && !matchContract && !matchFacility && !matchCollateral && !matchLoanType) return false;
      }
      return true;
    });
  }, [loans, statusFilter, loanFacilityFilter, loanTermFilter, searchValue]);

  // Bước 4: Quản lý chi phí (kết hợp các phiếu chi thực tế và các khoản trích khấu hao TSCĐ tự động)
  const filteredExpenses = useMemo(() => {
    const directExpenses = expenses.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (selectedYear) {
        const parts = item.spendDate.split('/');
        if (parts.length >= 3 && parts[2] !== selectedYear) return false;
      }
      if (searchValue.trim()) {
        const query = searchValue.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(query);
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchDept = item.department.toLowerCase().includes(query);
        if (!matchCode && !matchTitle && !matchDept) return false;
      }
      return true;
    });

    // Sinh các khoản trích khấu hao TSCĐ tự động định kỳ tính chung vào 1 mục duy nhất mỗi tháng
    const autoDeprecItems: ExpenseItem[] = [];
    if (selectedYear && (statusFilter === 'all' || statusFilter === 'approved') && fixedAssetDepreciationMonthly.total > 0) {
      const maxMonths = selectedYear === '2026' ? 10 : 12;
      for (let m = 1; m <= maxMonths; m++) {
        const monthStr = m < 10 ? `0${m}` : `${m}`;
        const query = searchValue.toLowerCase().trim();

        // Kiểm tra bộ lọc khoản mục chi
        const matchesCategory =
          categoryFilter === 'all' ||
          categoryFilter === 'depreciation' ||
          categoryFilter === 'production' ||
          categoryFilter === 'sales' ||
          categoryFilter === 'administrative';

        if (!matchesCategory) continue;

        const title = 'Chi phí khấu hao tài sản cố định (TSCĐ)';
        const code = `KH-${selectedYear}-${monthStr}`;
        const catLabel = 'Khấu hao TSCĐ (TK 627, 641, 642)';
        const matchesQuery =
          !query ||
          title.toLowerCase().includes(query) ||
          code.toLowerCase().includes(query) ||
          `tháng ${monthStr}`.includes(query) ||
          catLabel.toLowerCase().includes(query) ||
          'khấu hao'.includes(query) ||
          'tscđ'.includes(query);

        if (matchesQuery) {
          autoDeprecItems.push({
            id: `AUTO-DEP-${selectedYear}-${monthStr}`,
            code,
            title,
            category: 'production',
            categoryLabel: catLabel,
            amount: fixedAssetDepreciationMonthly.total,
            department: 'Toàn công ty',
            spendDate: `30/${monthStr}/${selectedYear}`,
            spender: 'Hệ thống tự động',
            status: 'approved',
            statusLabel: 'Tự động trích khấu hao',
            notes: 'Trích khấu hao toàn bộ máy móc nhà xưởng (TK 627), phương tiện vận tải (TK 641) và thiết bị văn phòng (TK 642) theo TT 200/2014/TT-BTC',
            isAutoDepreciation: true,
            debitAccount: '627 / 641 / 642',
            debitAccountName: 'Chi phí SXC, Bán hàng & QLDN',
            creditAccount: '2141',
            creditAccountName: 'Hao mòn TSCĐ',
            depreciationBreakdown: {
              prod: fixedAssetDepreciationMonthly.prod,
              sales: fixedAssetDepreciationMonthly.sales,
              admin: fixedAssetDepreciationMonthly.admin,
            },
          });
        }
      }
    }

    return [...directExpenses, ...autoDeprecItems];
  }, [expenses, statusFilter, categoryFilter, selectedYear, searchValue, fixedAssetDepreciationMonthly]);

  // ----------------------------------------------------
  // CẤU HÌNH TABLE TOOLBAR THEO BƯỚC
  // ----------------------------------------------------
  const toolbarFilters = useMemo((): TableToolbarFilter[] => {
    if (currentStep === 1) {
      return [
        {
          id: 'ar-status-filter',
          value: statusFilter,
          onChange: (val: string) => {
            setStatusFilter(val);
            setCurrentPage(1);
          },
          options: [
            { value: 'all', label: 'Tất cả trạng thái nợ' },
            { value: 'ontime', label: 'Trong hạn thanh toán' },
            { value: 'due', label: 'Sắp đến hạn' },
            { value: 'overdue', label: 'Quá hạn thanh toán' },
            { value: 'completed', label: 'Đã thu đủ tiền' },
          ],
          minWidth: '180px',
        },
      ];
    }
    if (currentStep === 2) {
      return [
        {
          id: 'ap-status-filter',
          value: statusFilter,
          onChange: (val: string) => {
            setStatusFilter(val);
            setCurrentPage(1);
          },
          options: [
            { value: 'all', label: 'Tất cả trạng thái trả' },
            { value: 'pending', label: 'Chờ thanh toán' },
            { value: 'due_soon', label: 'Sắp đến hạn' },
            { value: 'overdue', label: 'Quá hạn trả' },
            { value: 'completed', label: 'Đã hoàn tất thanh toán' },
          ],
          minWidth: '165px',
        },
        {
          id: 'ap-partner-filter',
          value: payablePartnerFilter,
          onChange: (val: string) => {
            setPayablePartnerFilter(val as 'all' | 'supplier' | 'transporter');
            setCurrentPage(1);
          },
          options: [
            { value: 'all', label: 'Tất cả' },
            { value: 'supplier', label: 'Nhà cung cấp' },
            { value: 'transporter', label: 'Đơn vị vận chuyển' },
          ],
          minWidth: '175px',
        },
      ];
    }
    if (currentStep === 3) {
      return [
        {
          id: 'loan-facility-filter',
          value: loanFacilityFilter,
          onChange: (v: string) => {
            setLoanFacilityFilter(v);
            setCurrentPage(1);
          },
          options: [
            { value: 'all', label: 'Tất cả hình thức tín dụng' },
            { value: 'working_capital', label: 'Vay vốn lưu động hạn mức' },
            { value: 'term_loan', label: 'Vay trung dài hạn đầu tư TSCĐ' },
            { value: 'guarantee', label: 'Hạn mức bảo lãnh hợp đồng' },
            { value: 'letter_of_credit', label: 'Thư tín dụng (L/C)' },
            { value: 'overdraft', label: 'Hạn mức thấu chi tài khoản' },
          ],
          minWidth: '205px',
        },
        {
          id: 'loan-term-filter',
          value: loanTermFilter,
          onChange: (v: string) => {
            setLoanTermFilter(v);
            setCurrentPage(1);
          },
          options: [
            { value: 'all', label: 'Tất cả kỳ hạn' },
            { value: 'short_term', label: 'Ngắn hạn' },
            { value: 'long_term', label: 'Dài hạn' },
          ],
          minWidth: '180px',
        },
        {
          id: 'loan-status-filter',
          value: statusFilter,
          onChange: (v: string) => {
            setStatusFilter(v);
            setCurrentPage(1);
          },
          options: [
            { value: 'all', label: 'Tất cả trạng thái nợ' },
            { value: 'active', label: 'Dư nợ trong hạn' },
            { value: 'due_soon', label: 'Đáo hạn kỳ tới' },
            { value: 'closed', label: 'Đã tất toán' },
          ],
          minWidth: '160px',
        },
      ];
    }
    // Bước 4: Quản lý chi phí
    return [
      {
        id: 'expense-year-filter',
        value: selectedYear,
        onChange: (val: string) => {
          setSelectedYear(val);
          setCurrentPage(1);
        },
        options: [
          { value: '2026', label: 'Năm 2026' },
          { value: '2025', label: 'Năm 2025' },
          { value: '2024', label: 'Năm 2024' },
          { value: '2023', label: 'Năm 2023' },
          { value: '2022', label: 'Năm 2022' },
        ],
        minWidth: '130px',
      },
      {
        id: 'expense-cat-filter',
        value: categoryFilter,
        onChange: (val: string) => {
          setCategoryFilter(val);
          setCurrentPage(1);
        },
        options: [
          { value: 'all', label: 'Tất cả khoản mục chi' },
          { value: 'depreciation', label: 'Khấu hao TSCĐ (TK 627, 641, 642)' },
          { value: 'production', label: 'Chi phí sản xuất' },
          { value: 'sales', label: 'Chi phí bán hàng' },
          { value: 'administrative', label: 'Chi phí quản lý' },
          { value: 'finance', label: 'Chi phí tài chính' },
        ],
        minWidth: '180px',
      },
      {
        id: 'expense-status-filter',
        value: statusFilter,
        onChange: (val: string) => {
          setStatusFilter(val);
          setCurrentPage(1);
        },
        options: [
          { value: 'all', label: 'Tất cả trạng thái duyệt' },
          { value: 'approved', label: 'Đã chi tiền' },
          { value: 'pending', label: 'Chờ duyệt chi' },
          { value: 'rejected', label: 'Từ chối' },
        ],
        minWidth: '180px',
      },
    ];
  }, [currentStep, statusFilter, categoryFilter, selectedYear, loanFacilityFilter, loanTermFilter, payablePartnerFilter]);

  // Tên nút Thêm mới theo từng bước
  const createButtonText = useMemo(() => {
    switch (currentStep) {
      case 1:
        return 'Tạo công nợ phải thu';
      case 2:
        return 'Tạo khoản phải trả';
      case 3:
        return 'Tạo hợp đồng vay';
      case 4:
        return 'Lập phiếu chi';
      default:
        return 'Thêm mới';
    }
  }, [currentStep]);

  // Placeholder tìm kiếm
  const searchPlaceholder = useMemo(() => {
    switch (currentStep) {
      case 1:
        return 'Tìm theo khách hàng, mã hợp đồng, dự án...';
      case 2:
        return 'Tìm theo nhà cung cấp, đơn vị vận chuyển, mã PO/vận đơn...';
      case 3:
        return 'Tìm theo ngân hàng, mã hợp đồng tín dụng...';
      case 4:
        return 'Tìm theo nội dung chi, mã phiếu, phòng ban...';
      default:
        return 'Tìm kiếm nhanh...';
    }
  }, [currentStep]);

  // Xuat file Excel truc tiep
  const handleExportExcel = () => {
    const stepNames = ['Cong_no_phai_thu', 'Cong_no_phai_tra', 'No_vay_ngan_hang', 'Quan_ly_chi_phi'];
    const fileName = `${stepNames[currentStep - 1]}_${new Date().toISOString().slice(0, 10)}.csv`;
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';

    if (currentStep === 1) {
      csvContent += 'STT,Khách hàng,Số tiền gốc,Đã thanh toán,Hạn thanh toán,Còn lại\n';
      filteredReceivables.forEach((item, idx) => {
        csvContent += `${idx + 1},"${item.customerName}",${item.contractValue},${item.paidAmount},"${item.dueDate}",${item.remainingAmount}\n`;
      });
    } else if (currentStep === 2) {
      csvContent += 'STT,Mã phiếu,Nhà cung cấp,Đơn hàng PO,Tổng tiền,Đã trả,Còn phải trả,Hạn thanh toán,Trạng thái\n';
      filteredPayables.forEach((item, idx) => {
        csvContent += `${idx + 1},"${item.code}","${item.supplierName}","${item.poCode}",${item.totalAmount},${item.paidAmount},${item.remainingAmount},"${item.dueDate}","${item.statusLabel}"\n`;
      });
    } else if (currentStep === 3) {
      csvContent += 'STT,Mã hợp đồng,Ngân hàng,Hình thức tín dụng,Kỳ hạn BCTC,Hạn mức vay,Đã trả gốc,Dư nợ còn lại,Đến hạn 12T,Lãi suất,Lãi dự kiến tháng,Tài sản đảm bảo,TK trích nợ,Ngày đáo hạn,Trạng thái\n';
      filteredLoans.forEach((item, idx) => {
        csvContent += `${idx + 1},"${item.contractCode}","${item.bankName}","${item.facilityLabel || ''}","${item.termType === 'long_term' ? 'Dài hạn (Mã 338)' : 'Ngắn hạn (Mã 320)'}",${item.loanLimit},${item.paidPrincipal},${item.remainingPrincipal},${item.dueWithin12m || 0},"${item.interestRate}",${item.monthlyInterestEst || 0},"${item.collateralName || ''}","${item.bankAccountNumber || ''}","${item.maturityDate}","${item.statusLabel}"\n`;
      });
    } else {
      csvContent += 'STT,Mã phiếu chi,Nội dung chi,Khoản mục,Số tiền,Phòng ban,Ngày chi,Người chi,Trạng thái\n';
      filteredExpenses.forEach((item, idx) => {
        csvContent += `${idx + 1},"${item.code}","${item.title}","${item.categoryLabel}",${item.amount},"${item.department}","${item.spendDate}","${item.spender}","${item.statusLabel}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast('success', 'Xuất bảng excel', 'Đã tải xuống tệp dữ liệu thành công');
    }
  };

  // Dropdown menu ba chấm trên TableToolbar theo chuẩn hệ thống:
  // Gồm: Xuất ra bảng excel, Lập báo cáo, Thiết lập cảnh báo, Làm mới dữ liệu
  // Áp dụng đồng bộ cho Công nợ phải thu, Công nợ phải trả và Nợ vay
  const toolbarMenuItems = useMemo<TableToolbarMenuItem[]>(() => {
    return [
      {
        id: 'export-excel',
        label: 'Xuất ra bảng excel',
        icon: <FileEarmarkExcel size={15} style={{ color: '#10b981', flexShrink: 0 }} />,
        onClick: handleExportExcel,
      },
      {
        id: 'create-report',
        label: 'Lập báo cáo',
        icon: <Printer size={15} style={{ color: '#0284c7', flexShrink: 0 }} />,
        onClick: () => {
          setIsReportPrintModalOpen(true);
        },
      },
      {
        id: 'debt-alert-config',
        label: 'Thiết lập cảnh báo',
        icon: <BellFill size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />,
        onClick: () => setIsDebtAgingConfigOpen(true),
      },
      {
        id: 'divider',
        label: '',
        divider: true,
        onClick: () => {},
      },
      {
        id: 'refresh-data',
        label: 'Làm mới dữ liệu',
        icon: <ArrowRepeat size={15} style={{ color: '#8b5cf6', flexShrink: 0 }} />,
        onClick: () => {
          if (currentStep === 1) fetchReceivables();
          else if (currentStep === 2) fetchPayables();
          else if (currentStep === 3) fetchLoans();
          else fetchExpenses();
          notifyFinanceUpdated();
          if (onShowToast) {
            onShowToast('success', 'Làm mới dữ liệu', 'Đã đồng bộ dữ liệu mới nhất từ hệ thống');
          }
        },
      },
    ];
  }, [currentStep, handleExportExcel, onShowToast]);

  // Badge trang thai
  const renderStatusBadge = (status: string, label: string) => {
    switch (status) {
      case 'ontime':
      case 'approved':
      case 'completed':
      case 'closed':
        return <Badge variant="success" style={{ whiteSpace: 'nowrap' }}>{label}</Badge>;
      case 'due':
      case 'due_soon':
      case 'pending':
        return <Badge variant="warning" style={{ whiteSpace: 'nowrap' }}>{label}</Badge>;
      case 'overdue':
      case 'rejected':
        return <Badge variant="danger" style={{ whiteSpace: 'nowrap' }}>{label}</Badge>;
      case 'active':
        return <Badge variant="info" style={{ whiteSpace: 'nowrap' }}>{label}</Badge>;
      default:
        return <Badge variant="neutral" style={{ whiteSpace: 'nowrap' }}>{label}</Badge>;
    }
  };

  // ── CÁC HÀM XỬ LÝ CHỨC NĂNG DROPLIST BƯỚC 1: CÔNG NỢ PHẢI THU ──

  // 1. Mở Offcanvas Ghi nhận thanh toán thu nợ (chỉ lấy các đợt thanh toán còn công nợ)
  const handleOpenPaymentModal = (item: ReceivableItem, stage?: DebtEntryItem) => {
    setSelectedReceivableForPayment(item);

    // Xác định đợt thanh toán đích: chỉ lấy các đợt còn công nợ (> 0)
    const unpaidStages = (item.entries || []).filter(
      (e) => !e.code?.startsWith('PT-') && ((e.remainingAmount ?? (e.contractValue - (e.paidAmount || 0))) > 0)
    );
    const activeStage =
      (stage && unpaidStages.some((s) => s.id === stage.id) ? stage : null) ||
      unpaidStages[0] ||
      null;
    setSelectedStageForPayment(activeStage);

    const defaultAmt = activeStage
      ? (activeStage.remainingAmount ?? (activeStage.contractValue - (activeStage.paidAmount || 0)))
      : item.remainingAmount;
    setPaymentAmountInput(String(defaultAmt));
    setPaymentMethod('Chuyển khoản');
    setPaymentDebitAccount('1121');
    setPaymentCreditAccount('131');
    setPaymentBankAccount('Vietcombank - 0011004123456 - CN Thăng Long');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const dateCode = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    setPaymentDate(`${timeStr} ${dateStr}`);
    setReceiptCodeInput(`PT-20261004-${Math.floor(100 + Math.random() * 900)}`);
    setPaymentBankRef(`FT${dateCode}-${Math.floor(1000 + Math.random() * 9000)}`);
    setPaymentPayerName(item.customerName || '');
    setPaymentPayerAddress(item.customerAddress || 'Hà Nội');
    setPaymentAccountantName(getLoggedInUserName(user) || 'Phạm Thu Hằng (Kế toán thanh toán)');
    setPaymentOriginalDocsCount('01 Giấy báo Có ngân hàng');
    setPaymentNote(activeStage ? `Thu tiền khách hàng - ${activeStage.title}` : `Thu nợ khách hàng - ${item.customerName}`);
    setPrintReceiptChecked(true);
    setLinkedOrderInput(activeStage ? `${item.customerName} - ${activeStage.title}` : (item.projectName || 'Dư nợ đầu kỳ'));
    setPaymentOffcanvasOpen(true);
  };

  // Xác nhận ghi nhận thanh toán (nhóm vào đợt thanh toán tương ứng và mở PrintPreview nếu chọn in)
  const handleConfirmPayment = async () => {
    if (!selectedReceivableForPayment) return;
    const paidNum = Number(paymentAmountInput.replace(/\D/g, '')) || 0;
    if (paidNum <= 0) {
      if (onShowToast) onShowToast('warning', 'Số tiền không hợp lệ', 'Vui lòng nhập số tiền thanh toán lớn hơn 0');
      return;
    }

    const currentItem = selectedReceivableForPayment;
    const targetStage = selectedStageForPayment;
    const isBankTransfer = paymentMethod.toLowerCase().includes('khoản') || paymentMethod.toLowerCase().includes('ngân hàng');
    const newHistItem: PaymentHistoryRecord = {
      id: `hist-${Date.now()}`,
      code: receiptCodeInput || `PT-20261004-${Math.floor(100 + Math.random() * 900)}`,
      dateTime: paymentDate,
      method: paymentMethod,
      amount: paidNum,
      debitAccount: paymentDebitAccount,
      creditAccount: paymentCreditAccount,
      bankAccount: isBankTransfer ? paymentBankAccount : undefined,
      bankRef: isBankTransfer ? paymentBankRef : undefined,
      payerName: paymentPayerName || currentItem.customerName,
      payerAddress: paymentPayerAddress || currentItem.customerAddress,
      accountant: paymentAccountantName,
      originalDocsCount: paymentOriginalDocsCount,
      note: paymentNote,
    };
    setCustomerPaymentHistories((prev) => ({
      ...prev,
      [currentItem.id]: [
        newHistItem,
        ...(prev[currentItem.id] || []),
      ],
    }));

    const newPaymentRecord = {
      id: `PAY-${Date.now()}`,
      code: newHistItem.code,
      receiptCode: newHistItem.code,
      title: paymentNote || `Thu tiền khách hàng theo phiếu ${newHistItem.code}`,
      date: paymentDate.includes(' ') ? paymentDate.split(' ')[1] : paymentDate,
      time: paymentDate.includes(' ') ? paymentDate.split(' ')[0] : '08:30',
      amount: paidNum,
      method: paymentMethod,
      note: paymentNote,
      debitAccount: paymentDebitAccount,
      creditAccount: paymentCreditAccount,
      bankAccount: isBankTransfer ? paymentBankAccount : '',
      bankRef: isBankTransfer ? paymentBankRef : '',
      payerName: paymentPayerName || currentItem.customerName,
      accountant: paymentAccountantName,
    };

    // Chuẩn bị dữ liệu phiếu thu A4 cho PrintPreview
    const receiptPayload: ReceiptVoucherData = {
      code: newHistItem.code,
      date: paymentDate,
      customerName: currentItem.customerName,
      payerName: paymentPayerName || currentItem.customerName,
      customerAddress: paymentPayerAddress || currentItem.customerAddress || '',
      amount: paidNum,
      reason: paymentNote || `Thu tiền khách hàng - ${targetStage?.title || currentItem.customerName}`,
      contractCode: currentItem.code,
      stageTitle: targetStage?.title,
      paymentMethod: paymentMethod,
      debitAccount: paymentDebitAccount,
      creditAccount: paymentCreditAccount,
      notes: [
        isBankTransfer && paymentBankAccount ? `TK Thụ hưởng: ${paymentBankAccount}` : '',
        isBankTransfer && paymentBankRef ? `Mã UNC/GD: ${paymentBankRef}` : '',
        paymentOriginalDocsCount ? `Kèm theo: ${paymentOriginalDocsCount}` : '',
        paymentNote,
      ].filter(Boolean).join(' | '),
      creator: getLoggedInUserName(user) || 'Phạm Thu Hằng (Kế toán)',
      accountant: paymentAccountantName || 'Trần Bích Thủy (Kế toán trưởng)',
      cashier: isBankTransfer ? '' : 'Vũ Thu Trang (Thủ quỹ)',
      director: 'Hà Hải Lâm',
    };

    try {
      const res = await fetch(`/api/debts/receivables/${currentItem.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paidNum,
          receiptCode: newHistItem.code,
          paymentDate,
          paymentMethod,
          paymentNote,
          stageId: targetStage?.id,
          stageCode: targetStage?.code,
          debitAccount: paymentDebitAccount,
          creditAccount: paymentCreditAccount,
          bankAccount: paymentBankAccount,
          bankRef: paymentBankRef,
          payerName: paymentPayerName,
          payerAddress: paymentPayerAddress,
          accountant: paymentAccountantName,
          originalDocsCount: paymentOriginalDocsCount,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setReceivables((prev) => prev.map((rec) => (rec.id === updated.id ? updated : rec)));
      } else {
        setReceivables((prev) =>
          prev.map((rec) => {
            if (rec.id !== currentItem.id) return rec;
            const updatedEntries = (rec.entries || []).map((ent) => {
              if (targetStage && (ent.id === targetStage.id || ent.code === targetStage.code)) {
                const newPaidAmt = (ent.paidAmount || 0) + paidNum;
                const newRem = Math.max(0, ent.contractValue - newPaidAmt);
                return {
                  ...ent,
                  paidAmount: newPaidAmt,
                  remainingAmount: newRem,
                  status: (newRem <= 0 ? 'completed' : 'ontime') as any,
                  statusLabel: newRem <= 0 ? 'Đã thu đủ' : 'Thu một phần',
                  payments: [...(ent.payments || []), newPaymentRecord],
                };
              }
              return ent;
            });
            const newPaidTotal = updatedEntries.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
            const newRemainTotal = Math.max(0, rec.contractValue - newPaidTotal);
            return {
              ...rec,
              paidAmount: newPaidTotal,
              remainingAmount: newRemainTotal,
              status: (newRemainTotal <= 0 ? 'completed' : 'ontime') as any,
              statusLabel: newRemainTotal <= 0 ? 'Đã thu đủ' : 'Đang thu',
              entries: updatedEntries,
            };
          })
        );
      }
    } catch (err) {
      console.error('Error recording payment:', err);
    }

    setPaymentOffcanvasOpen(false);
    const custName = currentItem.customerName;
    setSelectedReceivableForPayment(null);
    setSelectedStageForPayment(null);

    // Khi công tắc In phiếu thu được chọn, gọi modal PrintPreview để hỗ trợ in sau khi lưu
    if (printReceiptChecked) {
      setReceiptToPrint(receiptPayload);
      setIsPrintReceiptModalOpen(true);
    }

    if (onShowToast) {
      onShowToast(
        'success',
        'Ghi nhận thanh toán thành công',
        printReceiptChecked
          ? `Đã tạo phiếu thu ${newHistItem.code} số tiền ${formatNumberGroup(paidNum)} VND và mở xem trước in ấn`
          : `Đã cập nhật thu số tiền ${formatNumberGroup(paidNum)} VND từ khách hàng ${custName}`
      );
    }
  };

  // 2. Mở modal Đối chiếu công nợ
  const handleOpenReconciliation = (item: ReceivableItem) => {
    setSelectedReceivableForReconcile(item);
    setReconcileModalOpen(true);
  };

  // 3. Đề nghị thanh toán
  const handleSendPaymentRequest = (item: ReceivableItem) => {
    if (onShowToast) {
      onShowToast(
        'success',
        'Đề nghị thanh toán',
        `Đã phát hành và gửi giấy đề nghị thanh toán số ${item.code} đến ${item.customerName}`
      );
    }
  };

  // ── CÁC HÀM XỬ LÝ CHỨC NĂNG DROPLIST BƯỚC 2: CÔNG NỢ PHẢI TRẢ ──
  const handleOpenPayablePaymentModal = (item: PayableItem, initialEntryId?: string) => {
    setSelectedPayableForPayment(item);

    // Tìm PO con còn nợ nếu có
    const pendingEntry = initialEntryId
      ? item.entries?.find((e) => e.id === initialEntryId)
      : item.entries?.find((e) => {
          const rem = e.remainingAmount !== undefined ? e.remainingAmount : (e.totalAmount - (e.paidAmount || 0));
          return rem > 0;
        });

    const targetAmount = pendingEntry
      ? (pendingEntry.remainingAmount !== undefined ? pendingEntry.remainingAmount : (pendingEntry.totalAmount - (pendingEntry.paidAmount || 0)))
      : item.remainingAmount;

    setSelectedPayableEntryId(pendingEntry?.id || '');
    setPaymentAmountInput(String(targetAmount));
    setPaymentMethod('Chuyển khoản');

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setPayablePaymentDate(dateStr);
    setPayablePaymentTime(timeStr);
    setPayableVoucherCode(`PC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`);

    const isTransporter = item.partnerType === 'transporter' || item.code?.startsWith('CNVC');
    setPayableDebitAccount(isTransporter ? '3312' : '331');
    setPayableCreditAccount('1121');

    // Ngân hàng nguồn chi Seajong
    setPayableSourceBank(dbCashAssets.length > 0 ? `${dbCashAssets[0].bankName} - ${dbCashAssets[0].accountNumber}` : 'Vietcombank - 0011004329999 (Seajong VN)');

    // Ngân hàng thụ hưởng của NCC / ĐV vận chuyển
    setPayableDestBank(isTransporter ? 'Vietcombank' : 'BIDV');
    setPayableDestAccount(isTransporter ? '1029384756' : '9988776655');
    setPayableDestBeneficiary(item.supplierName);
    setPayableReceiverName(item.supplierName);
    setPayableReceiverAddress(item.supplierAddress || 'Hà Nội');

    const docCode = pendingEntry?.code || item.poCode || item.code;
    setPaymentNote(`Thanh toán tiền hàng cho ${item.supplierName} theo ${docCode}`);
    setPayableOriginalDocsCount('01 Giấy báo Nợ ngân hàng / UNC & 01 Hóa đơn GTGT');
    setIsPrintPayableVoucherChecked(true);
    setPaymentModalOpen(true);
  };

  const handleConfirmPayablePayment = async () => {
    if (!selectedPayableForPayment) return;
    const paidNum = Number(paymentAmountInput.replace(/\D/g, '')) || 0;
    if (paidNum <= 0) {
      if (onShowToast) onShowToast('warning', 'Số tiền không hợp lệ', 'Vui lòng nhập số tiền thanh toán lớn hơn 0');
      return;
    }

    const currentItem = selectedPayableForPayment;

    try {
      const res = await fetch(`/api/debts/payables/${currentItem.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paidNum,
          paymentCode: payableVoucherCode,
          date: `${payablePaymentDate} ${payablePaymentTime}`,
          method: paymentMethod,
          note: paymentNote,
          debitAccount: payableDebitAccount,
          creditAccount: payableCreditAccount,
          sourceBankAccount: payableSourceBank,
          destBankAccount: `${payableDestBank} - ${payableDestAccount} (${payableDestBeneficiary})`,
          receiverName: payableReceiverName,
          receiverAddress: payableReceiverAddress,
          creator: currentLoggedInUserName || 'Phạm Thu Hằng',
          accountant: 'Mai Thị Ngọc',
          director: 'Hà Hải Lâm',
          entryId: selectedPayableEntryId || null,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.updated) {
          setPayables((prev) => prev.map((p) => (p.id === result.updated.id ? result.updated : p)));
        } else {
          fetchPayables();
        }
      } else {
        setPayables((prev) =>
          prev.map((p) => {
            if (p.id !== currentItem.id) return p;
            const newPaid = p.paidAmount + paidNum;
            const newRemain = Math.max(0, p.totalAmount - newPaid);
            const isCompleted = newRemain <= 0;
            return {
              ...p,
              paidAmount: newPaid,
              remainingAmount: newRemain,
              status: isCompleted ? 'completed' : p.status,
              statusLabel: isCompleted ? 'Đã hoàn tất' : p.statusLabel,
            };
          })
        );
      }
    } catch (err) {
      console.error('Error recording payable payment:', err);
    }

    // Nếu người dùng chọn in phiếu chi sau khi hoàn tất
    if (isPrintPayableVoucherChecked) {
      const isTransporter = currentItem.partnerType === 'transporter' || currentItem.code?.startsWith('CNVC');
      const generatedExpense: ExpenseItem = {
        id: `PC-${Date.now()}`,
        code: payableVoucherCode,
        title: paymentNote,
        category: isTransporter ? 'sales' : 'production',
        categoryLabel: isTransporter ? 'Chi phí vận chuyển, logistics (TK 641)' : 'Chi thanh toán NCC linh kiện sen vòi (TK 331)',
        amount: paidNum,
        department: isTransporter ? 'Phòng Kho vận & Logistics' : 'Phòng Mua hàng & Cung ứng',
        spendDate: payablePaymentDate,
        spender: payableReceiverName || currentItem.supplierName,
        status: 'approved',
        statusLabel: 'Đã hoàn tất thanh toán',
        notes: `Nguồn trích: ${payableSourceBank} • Thụ hưởng: ${payableDestBank} - ${payableDestAccount} (${payableDestBeneficiary}). Chứng từ gốc: ${payableOriginalDocsCount}`,
        debitAccount: payableDebitAccount,
        debitAccountName: isTransporter ? 'Phải trả ĐV vận chuyển' : 'Phải trả cho người bán',
        creditAccount: payableCreditAccount,
        creditAccountName: paymentMethod === 'Chuyển khoản' ? 'Tiền gửi ngân hàng (VND)' : 'Tiền mặt tại quỹ (VND)',
      };
      setVoucherToPrint(generatedExpense);
      setIsPrintVoucherModalOpen(true);
    }

    setPaymentModalOpen(false);
    setSelectedPayableForPayment(null);
    if (onShowToast) {
      onShowToast('success', 'Lập phiếu chi thành công', `Đã ghi nhận chi ${formatNumberGroup(paidNum)} đ thanh toán cho ${currentItem.supplierName}`);
    }
  };

  const handleOpenPayableReconciliation = (item: PayableItem) => {
    setSelectedPayableForReconcile(item);
    setReconcileModalOpen(true);
  };

  const handleSendPayablePaymentRequest = (item: PayableItem) => {
    if (onShowToast) {
      onShowToast(
        'success',
        'Đề xuất duyệt chi',
        `Đã tạo phiếu đề xuất duyệt chi cho đơn hàng ${item.poCode} của ${item.supplierName}`
      );
    }
  };

  // 5. Xoá khoản nợ
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const targetId = itemToDelete.id;
    if (currentStep === 1) {
      try {
        await fetch(`/api/debts/receivables/${targetId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Lỗi khi xoá công nợ phải thu:', err);
      }
      setReceivables((prev) => prev.filter((i) => i.id !== targetId));
    } else if (currentStep === 2) {
      try {
        await fetch(`/api/debts/payables/${targetId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Lỗi khi xoá công nợ phải trả:', err);
      }
      setPayables((prev) => prev.filter((i) => i.id !== targetId));
    } else if (currentStep === 3) {
      try {
        await fetch(`/api/debts/loans/${targetId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Lỗi khi xoá hợp đồng nợ vay:', err);
      }
      setLoans((prev) => prev.filter((i) => i.id !== targetId));
    } else {
      try {
        await fetch(`/api/debts/expenses/${targetId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Lỗi khi xoá chi phí:', err);
      }
      setExpenses((prev) => prev.filter((i) => i.id !== targetId));
    }
    setConfirmDeleteOpen(false);
    setItemToDelete(null);
    notifyFinanceUpdated('debt_cost', 'delete');
    if (onShowToast) {
      onShowToast('success', 'Xoá thành công', 'Đã xoá bản ghi thành công khỏi hệ thống');
    }
  };

  // Lưu thông tin từ Offcanvas tạo mới/chỉnh sửa
  const handleSaveOffcanvas = async () => {
    const amountNum = Number(formAmount.replace(/\D/g, '')) || 0;
    try {
      if (currentStep === 1) {
        const payload = {
          code: formCode || `HD-2026-${Math.floor(100 + Math.random() * 900)}`,
          customerId: formCustomerId || null,
          customerName: formName || 'Khách hàng mới',
          customerAddress: formAddress || 'Hà Nội, Việt Nam',
          projectName: formProjectOrPo || 'Hợp đồng kinh tế',
          contractValue: amountNum,
          paidAmount: editingItem ? editingItem.paidAmount : 0,
          remainingAmount: editingItem ? Math.max(0, amountNum - (editingItem.paidAmount || 0)) : amountNum,
          dueDate: formDueDate || '15/11/2026',
          status: 'ontime',
          statusLabel: 'Trong hạn thanh toán',
          managerName: 'Phòng Dự Án',
          notes: formNotes,
        };

        if (editingItem) {
          const res = await fetch('/api/debts/receivables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...editingItem, ...payload }),
          });
          if (res.ok) fetchReceivables();
        } else {
          const res = await fetch('/api/debts/receivables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) fetchReceivables();
        }
      } else if (currentStep === 2) {
        const isTransporter = formPartnerType === 'transporter';
        const payload: any = {
          code: formCode || (isTransporter ? `CNVC-${Math.floor(100 + Math.random() * 900)}` : `CNTR-${Math.floor(100 + Math.random() * 900)}`),
          partnerType: formPartnerType,
          supplierName: formName || (isTransporter ? 'Đơn vị vận chuyển mới' : 'Nhà cung cấp mới'),
          supplierAddress: formAddress || 'Việt Nam',
          poCode: formProjectOrPo || (isTransporter ? `VC-${Math.floor(100 + Math.random() * 900)}` : `PO-${Math.floor(100 + Math.random() * 900)}`),
          totalAmount: amountNum,
          paidAmount: editingItem ? editingItem.paidAmount : 0,
          remainingAmount: editingItem ? Math.max(0, amountNum - (editingItem.paidAmount || 0)) : amountNum,
          dueDate: formDueDate || '28/11/2026',
          status: editingItem?.status || 'pending',
          statusLabel: editingItem?.statusLabel || 'Chờ thanh toán',
          accountant: 'Kế toán thanh toán',
          notes: formNotes,
        };

        if (editingItem) {
          const res = await fetch('/api/debts/payables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...editingItem, ...payload }),
          });
          if (res.ok) fetchPayables();
          else setPayables((prev) => prev.map((p) => (p.id === editingItem.id ? { ...p, ...payload } : p)));
        } else {
          const res = await fetch('/api/debts/payables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) fetchPayables();
          else setPayables((prev) => [{ id: `PAY-${Date.now()}`, ...payload, entries: [] }, ...prev]);
        }
      } else if (currentStep === 3) {
        const rateValNum = Number(formInterestRateVal) || 7.5;
        const due12mNum = Number(formDueWithin12m) || (formTermType === 'short_term' ? amountNum : 0);
        const monthlyInt = Math.round((Math.max(0, amountNum - (editingItem?.paidPrincipal || 0)) * rateValNum) / 100 / 12);

        const facilityLabels: Record<string, string> = {
          working_capital: 'Vay vốn lưu động hạn mức',
          term_loan: 'Vay trung dài hạn đầu tư TSCĐ',
          guarantee: 'Hạn mức bảo lãnh hợp đồng',
          letter_of_credit: 'Thư tín dụng (L/C)',
          overdraft: 'Hạn mức thấu chi tài khoản',
        };

        const loanPayload: LoanItem = editingItem
          ? {
              ...editingItem,
              code: formCode || editingItem.code,
              bankName: formName || 'Ngân hàng TMCP',
              contractCode: formContractCode || editingItem.contractCode,
              facilityType: (formFacilityType as any) || 'working_capital',
              facilityLabel: facilityLabels[formFacilityType] || 'Vay vốn lưu động hạn mức',
              termType: (formTermType as any) || 'short_term',
              loanLimit: amountNum,
              remainingPrincipal: Math.max(0, amountNum - (editingItem.paidPrincipal || 0)),
              dueWithin12m: due12mNum,
              interestRate: `${rateValNum}% / năm`,
              interestRateVal: rateValNum,
              interestType: (formInterestType as any) || 'floating',
              interestPaymentDay: Number(formInterestPaymentDay) || 25,
              monthlyInterestEst: monthlyInt,
              maturityDate: formDueDate || editingItem.maturityDate,
              collateralName: formCollateralName,
              collateralValue: Number(formCollateralValue) || 0,
              bankAccountNumber: formBankAccountNumber,
              loanType: formLoanType || editingItem.loanType || 'Vay vốn kinh doanh',
              notes: formNotes,
            }
          : {
              id: `LN-${Date.now()}`,
              code: formCode || `VAY-${Date.now().toString().slice(-4)}`,
              bankName: formName || 'Ngân hàng TMCP',
              contractCode: formContractCode || `HDTD-2026-${Date.now().toString().slice(-4)}`,
              facilityType: (formFacilityType as any) || 'working_capital',
              facilityLabel: facilityLabels[formFacilityType] || 'Vay vốn lưu động hạn mức',
              termType: (formTermType as any) || 'short_term',
              loanLimit: amountNum,
              paidPrincipal: 0,
              remainingPrincipal: amountNum,
              dueWithin12m: due12mNum,
              interestRate: `${rateValNum}% / năm`,
              interestRateVal: rateValNum,
              interestType: (formInterestType as any) || 'floating',
              interestPaymentDay: Number(formInterestPaymentDay) || 25,
              monthlyInterestEst: monthlyInt,
              startDate: new Date().toLocaleDateString('vi-VN'),
              maturityDate: formDueDate || '31/12/2026',
              collateralName: formCollateralName,
              collateralValue: Number(formCollateralValue) || 0,
              bankAccountNumber: formBankAccountNumber,
              status: 'active',
              statusLabel: 'Dư nợ trong hạn',
              loanType: formLoanType || 'Vay vốn bổ sung kinh doanh',
              notes: formNotes,
            };

        try {
          const res = await fetch('/api/debts/loans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loanPayload),
          });
          if (res.ok) {
            fetchLoans();
            notifyFinanceUpdated();
            if (onShowToast) onShowToast('success', 'Thành công', editingItem ? 'Đã cập nhật hợp đồng vay' : 'Đã tạo hợp đồng tín dụng mới');
          }
        } catch (e) {
          console.error('Lỗi lưu nợ vay:', e);
        }
      } else {
        const expPayload: ExpenseItem = editingItem
          ? {
              ...editingItem,
              code: formCode || editingItem.code,
              title: formName,
              category: formExpenseCategory,
              categoryLabel: formExpenseCategoryLabel,
              amount: amountNum,
              department: formExpenseDepartment,
              spendDate: formDueDate,
              spender: formSpender,
              proposer: formProposer || formExpenseDepartment,
              notes: formNotes,
              debitAccount: formDebitAccount,
              debitAccountName: formDebitAccountName,
              creditAccount: formCreditAccount,
              creditAccountName: formCreditAccountName,
              operationType: formExpenseOpType,
            }
          : {
              id: `EXP-${Date.now()}`,
              code: formCode || `PC-${Date.now().toString().slice(-4)}`,
              title: formName,
              category: formExpenseCategory,
              categoryLabel: formExpenseCategoryLabel,
              amount: amountNum,
              department: formExpenseDepartment,
              spendDate: formDueDate || new Date().toLocaleDateString('vi-VN'),
              spender: formSpender || 'Kế toán trưởng',
              proposer: formProposer || formExpenseDepartment,
              status: 'approved',
              statusLabel: 'Đã chi tiền',
              notes: formNotes,
              debitAccount: formDebitAccount,
              debitAccountName: formDebitAccountName,
              creditAccount: formCreditAccount,
              creditAccountName: formCreditAccountName,
              operationType: formExpenseOpType,
            };

        try {
          const res = await fetch('/api/debts/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expPayload),
          });
          if (res.ok) {
            fetchExpenses();
            notifyFinanceUpdated();
            if (onShowToast) onShowToast('success', 'Lập phiếu chi', 'Đã lưu phiếu chi và tự động định khoản vào Sổ nhật ký chung');
          }
        } catch (e) {
          console.error('Lỗi lưu chi phí:', e);
        }

        // Nếu người dùng chọn "In phiếu chi", kích hoạt mở modal xem trước in ấn
        if (isPrintPaymentVoucherChecked) {
          setVoucherToPrint(expPayload);
          setIsPrintVoucherModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error saving offcanvas data:', err);
    }

    setIsOffcanvasOpen(false);
    notifyFinanceUpdated('debt_cost', editingItem ? 'update' : 'create');
    if (onShowToast) {
      onShowToast('success', 'Lưu dữ liệu', 'Đã cập nhật thông tin thành công vào hệ thống');
    }
  };

  // Du lieu phan trang theo buoc
  const currentListLength = useMemo(() => {
    if (currentStep === 1) return filteredReceivables.length;
    if (currentStep === 2) return filteredPayables.length;
    if (currentStep === 3) return filteredLoans.length;
    return filteredExpenses.length;
  }, [currentStep, filteredReceivables.length, filteredPayables.length, filteredLoans.length, filteredExpenses.length]);

  const pagedList = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    if (currentStep === 1) return filteredReceivables.slice(startIndex, startIndex + pageSize);
    if (currentStep === 2) return filteredPayables.slice(startIndex, startIndex + pageSize);
    if (currentStep === 3) return filteredLoans.slice(startIndex, startIndex + pageSize);
    return filteredExpenses.slice(startIndex, startIndex + pageSize);
  }, [currentStep, filteredReceivables, filteredPayables, filteredLoans, filteredExpenses, currentPage, pageSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0 }}>
      {/* ── 1. TABLE TOOLBAR TIÊU CHUẨN (GIẢM KHOẢNG CÁCH SÁT BẢNG) ── */}
      <TableToolbar
        searchValue={searchValue}
        onSearchChange={(val) => {
          setSearchValue(val);
          setCurrentPage(1);
        }}
        searchPlaceholder={searchPlaceholder}
        filters={toolbarFilters}
        style={{ marginBottom: 0, paddingBottom: '8px' }}
        onExportExcel={handleExportExcel}
        showMenu={true}
        menuItems={toolbarMenuItems}
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="button"
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={() => {
                setEditingItem(null);
                setIsOffcanvasOpen(true);
              }}
              style={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {createButtonText}
            </Button>
          </div>
        }
      />

      {/* BANNER THÔNG TIN KẾT NỐI VÀO BÁO CÁO TÀI CHÍNH */}
      {currentStep === 3 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '8px 12px',
            marginBottom: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '6px',
            fontSize: '0.78125rem',
            color: '#065f46',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <DatabaseCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
            <span style={{ fontWeight: 700 }}>Đồng bộ tự động vào Báo cáo tài chính:</span>
            <span>
              Vay ngắn hạn (Mã 320 B01): <strong>{formatNumberGroup(loans.reduce((acc, l) => acc + (l.status !== 'closed' ? (l.termType === 'short_term' || l.facilityType === 'working_capital' || l.facilityType === 'guarantee' ? (Number(l.remainingPrincipal) || 0) : (Number(l.dueWithin12m) || 0)) : 0), 0))} đ</strong>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>
              Vay dài hạn (Mã 338 B01): <strong>{formatNumberGroup(loans.reduce((acc, l) => acc + (l.status !== 'closed' && l.termType === 'long_term' ? Math.max(0, (Number(l.remainingPrincipal) || 0) - (Number(l.dueWithin12m) || 0)) : 0), 0))} đ</strong>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>
              Lãi vay (Mã 23 B02): <strong>~{formatNumberGroup(loans.reduce((acc, l) => acc + (Number(l.monthlyInterestEst) || 0), 0))} đ/tháng</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#047857',
                fontWeight: 700,
                fontSize: '0.6875rem',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              Đã kết nối CSDL BCTC
            </span>
          </div>
        </div>
      )}

      {/* ── 2. FULL WIDTH TABLE CHÍNH THEO BƯỚC (CHUẨN STEPPAGE KHÔNG BỌC CARD) ── */}
      <div
        className="table-responsive custom-scrollbar"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
          width: '100%',
        }}
      >
        <table
          key={`debt-table-step-${currentStep}`}
          className="custom-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.8125rem',
            margin: 0,
          }}
        >
            <thead
              style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid var(--border-default, #cbd5e1)',
              }}
            >
              {/* BƯỚC 1: HEADER CÔNG NỢ PHẢI THU (ĐÃ BỎ STT) */}
              {currentStep === 1 && (
                <tr style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Khách hàng</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Số tiền gốc</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Đã thanh toán</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Hạn thanh toán</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Còn lại</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '50px' }}></th>
                </tr>
              )}

              {/* BƯỚC 2: HEADER CÔNG NỢ PHẢI TRẢ (ĐỒNG BỘ BƯỚC 1, ĐÃ BỎ STT) */}
              {currentStep === 2 && (
                <tr style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Nhà cung cấp / Đơn vị vận chuyển</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Tổng tiền đơn</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Đã thanh toán</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Hạn thanh toán</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Còn lại</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '50px' }}></th>
                </tr>
              )}

              {/* BƯỚC 3: HEADER NỢ VAY - CÁC CỘT QUẢN TRỊ TÍN DỤNG */}
              {currentStep === 3 && (
                <tr style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Ngân hàng và Hợp đồng tín dụng</th>
                  <th style={{ padding: '12px 14px', width: '160px', whiteSpace: 'nowrap' }}>Kỳ hạn & Trạng thái</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', width: '200px', whiteSpace: 'nowrap' }}>Hạn mức và Dư nợ gốc</th>
                  <th style={{ padding: '12px 14px', width: '220px', whiteSpace: 'nowrap' }}>Lãi suất & Lãi dự kiến</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '50px' }}></th>
                </tr>
              )}

              {/* BƯỚC 4: HEADER QUẢN LÝ CHI PHÍ - CÁC CỘT: KHOẢN CHI PHÍ, SỐ TIỀN CHI */}
              {currentStep === 4 && (
                <tr style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Khoản chi phí</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Số tiền chi</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '50px' }}></th>
                </tr>
              )}
            </thead>

            <tbody key={`debt-tbody-step-${currentStep}`}>
              {currentStep === 4 ? (
                <>
                  {/* DÒNG TỔNG CỘNG GHIM CHẶT VÀO ĐẦU BẢNG */}
                  <tr
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: '#f1f5f9',
                      borderBottom: '2px solid #cbd5e1',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a', fontSize: '0.875rem' }}>
                          Tổng cộng
                        </span>
                        <Badge variant="neutral">
                          {filteredExpenses.length} khoản chi phí
                        </Badge>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#b91c1c', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                      {formatNumberGroup(filteredExpenses.reduce((sum, item) => sum + item.amount, 0))}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', width: '50px' }}></td>
                  </tr>

                  {/* CÁC DÒNG THÁNG TRONG NĂM SẮP XẾP NGƯỢC LẠI TỪ THÁNG HIỆN TẠI VỀ THÁNG 1 */}
                  {(selectedYear === '2026' ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] : [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]).map((monthNum) => {
                    const monthItems = filteredExpenses.filter((item) => {
                      const parts = item.spendDate.split('/');
                      return parts.length >= 2 && parseInt(parts[1], 10) === monthNum;
                    });
                    const monthTotal = monthItems.reduce((acc, curr) => acc + curr.amount, 0);
                    const isExpanded = activeExpandedMonth === monthNum;

                    return (
                      <React.Fragment key={`expense-month-${monthNum}`}>
                        {/* DÒNG THÁNG */}
                        <tr
                          onClick={() => toggleExpandMonth(monthNum)}
                          style={{
                            backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                            borderBottom: isExpanded ? 'none' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isExpanded ? '#f8fafc' : '#ffffff')}
                          title="Nhấn để ẩn hoặc hiện các khoản mục chi phí của tháng"
                        >
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#0284c7', display: 'flex', alignItems: 'center' }}>
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                              <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                THÁNG {monthNum < 10 ? `0${monthNum}` : monthNum} NĂM {selectedYear}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                • {monthItems.length} khoản chi phí
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                            {formatNumberGroup(monthTotal)}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}></td>
                        </tr>

                        {/* CÁC KHOẢN MỤC CHI PHÍ BÊN TRONG THÁNG KHI MỞ RỘNG */}
                        {isExpanded && monthItems.length === 0 && (
                          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                            <td colSpan={3} style={{ padding: '10px 14px 10px 38px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>
                              Chưa có khoản chi phí nào phát sinh trong tháng {monthNum}
                            </td>
                          </tr>
                        )}

                        {isExpanded &&
                          monthItems.map((item) => (
                            <tr
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.isAutoDepreciation) {
                                  setSelectedDeprecItem(item);
                                  setIsDeprecModalOpen(true);
                                  return;
                                }
                                setEditingItem(item);
                                setIsOffcanvasOpen(true);
                              }}
                              style={{
                                backgroundColor: item.isAutoDepreciation ? '#faf5ff' : '#f8fafc',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = item.isAutoDepreciation ? '#f3e8ff' : '#f1f5f9')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = item.isAutoDepreciation ? '#faf5ff' : '#f8fafc')}
                              title={item.isAutoDepreciation ? `Nhấn để xem bảng phân bổ chi tiết ${dbFixedAssets.length} tài sản cố định` : "Nhấn để xem hoặc chỉnh sửa chi tiết khoản chi phí"}
                            >
                              <td style={{ padding: '8px 14px 8px 38px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 600, color: item.isAutoDepreciation ? '#6b21a8' : '#334155', fontSize: '0.8125rem' }}>
                                    {item.title}
                                  </span>
                                  {item.isAutoDepreciation && (
                                    <span
                                      style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        backgroundColor: '#ede9fe',
                                        color: '#7c3aed',
                                        border: '1px solid #ddd6fe',
                                        borderRadius: '9999px',
                                        padding: '1px 8px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      Tự động • Khấu hao TSCĐ (Phi tiền mặt)
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, color: item.isAutoDepreciation ? '#7c3aed' : '#475569' }}>{item.code}</span>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <span>Ngày {item.spendDate}</span>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <span>{item.categoryLabel}</span>
                                  {item.isAutoDepreciation ? (
                                    <>
                                      <span style={{ color: '#cbd5e1' }}>•</span>
                                      <span style={{ color: '#7c3aed', fontWeight: 600 }}>
                                        Nợ {item.debitAccount} / Có {item.creditAccount || '2141'}
                                      </span>
                                      <span style={{ color: '#cbd5e1' }}>•</span>
                                      <span>{item.department}</span>
                                    </>
                                  ) : (
                                    <>
                                      {item.debitAccount && (
                                        <>
                                          <span style={{ color: '#cbd5e1' }}>•</span>
                                          <span style={{ color: '#0284c7', fontWeight: 600 }}>
                                            Nợ {item.debitAccount} / Có {item.creditAccount || '1111'}
                                          </span>
                                        </>
                                      )}
                                      <span style={{ color: '#cbd5e1' }}>•</span>
                                      <span>{item.department}</span>
                                      <span style={{ color: '#cbd5e1' }}>•</span>
                                      <span>Người chi: {item.spender}</span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: item.isAutoDepreciation ? 700 : 400, color: item.isAutoDepreciation ? '#6b21a8' : '#334155', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                {formatNumberGroup(item.amount)}
                              </td>
                              <td style={{ padding: '8px 8px', textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  title="Tùy chọn thao tác"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveRowMenuId(activeRowMenuId === item.id ? null : item.id);
                                  }}
                                  style={{
                                    background: activeRowMenuId === item.id ? '#f1f5f9' : 'transparent',
                                    border: '1px solid',
                                    borderColor: activeRowMenuId === item.id ? '#cbd5e1' : 'transparent',
                                    borderRadius: '6px',
                                    padding: '4px 6px',
                                    cursor: 'pointer',
                                    color: '#475569',
                                  }}
                                >
                                  <ThreeDotsVertical size={14} />
                                </button>
                                {activeRowMenuId === item.id && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      right: 0,
                                      bottom: 'calc(100% + 4px)',
                                      minWidth: item.isAutoDepreciation ? '220px' : '160px',
                                      backgroundColor: '#ffffff',
                                      borderRadius: '8px',
                                      border: '1px solid #cbd5e1',
                                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                      zIndex: 999,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      textAlign: 'left',
                                    }}
                                  >
                                    {item.isAutoDepreciation ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveRowMenuId(null);
                                          setSelectedDeprecItem(item);
                                          setIsDeprecModalOpen(true);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 500, color: '#6b21a8', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#faf5ff')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        <FileEarmarkSpreadsheet size={13} style={{ color: '#7c3aed' }} />
                                        <span>Xem bảng phân bổ 12 TSCĐ</span>
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveRowMenuId(null);
                                            setVoucherToPrint(item);
                                            setIsPrintVoucherModalOpen(true);
                                          }}
                                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 500, color: '#0369a1', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f9ff')}
                                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                          <Printer size={13} style={{ color: '#0284c7' }} />
                                          <span>Xem và in phiếu chi A4</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveRowMenuId(null);
                                            setEditingItem(item);
                                            setIsOffcanvasOpen(true);
                                          }}
                                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 500, color: '#334155', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                          <Pencil size={13} style={{ color: '#64748b' }} />
                                          <span>Chỉnh sửa thông tin</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveRowMenuId(null);
                                            setItemToDelete(item);
                                            setConfirmDeleteOpen(true);
                                          }}
                                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 500, color: '#ef4444', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                          <Trash3 size={13} style={{ color: '#ef4444' }} />
                                          <span>Xoá phiếu chi</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </>
              ) : pagedList.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                    Không tìm thấy bản ghi nào phù hợp với bộ lọc tìm kiếm
                  </td>
                </tr>
              ) : (
                pagedList.map((row: any, index: number) => {
                  const isNearBottom = index >= pagedList.length - 2 && pagedList.length > 3;

                  // ── DÒNG BƯỚC 1: CÔNG NỢ PHẢI THU (BỎ STT, MỖI THỜI ĐIỂM CHỈ MỞ 1 MỤC LỚN) ──
                  if (currentStep === 1) {
                    const item = row as ReceivableItem;
                    const isExpanded = statusFilter !== 'all' ? true : expandedCustomerId === item.id;
                    return (
                      <React.Fragment key={`rec-row-${item.id}`}>
                        <tr
                          onClick={() => toggleExpandCustomer(item.id)}
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                            transition: 'background-color 0.15s ease',
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? '#f8fafc' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isExpanded) e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {/* Cột 1: Khách hàng (kèm nút toggle mở rộng nếu có đơn con) */}
                          <td style={{ padding: '12px 14px' }}>
                            {(() => {
                              const hasEntries = Boolean(item.entries && item.entries.length > 0);
                              return (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                  {hasEntries ? (
                                    <button
                                      type="button"
                                      title={isExpanded ? 'Thu gọn' : 'Xem danh sách đơn hàng'}
                                      onClick={(e) => toggleExpandCustomer(item.id, e)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '2px',
                                        cursor: 'pointer',
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        marginTop: '2px',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                  ) : (
                                    <div style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                                  )}
                                  <div>
                                    <div
                                      style={{
                                    fontWeight: 800,
                                    color: '#0284c7',
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.02em',
                                  }}
                                >
                                  {item.customerName}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                                  {item.customerAddress}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                          {/* Cột 2: Số tiền gốc */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                            {formatNumberGroup(item.contractValue)}
                          </td>

                          {/* Cột 3: Đã thanh toán */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                            {formatNumberGroup(item.paidAmount)}
                          </td>

                          {/* Cột 4: Hạn thanh toán */}
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.8125rem', color: '#475569', fontWeight: 500 }}>
                            {item.dueDate || 'Theo tiến độ HĐ'}
                          </td>

                          {/* Cột 5: Còn lại */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: item.remainingAmount > 0 ? '#dc2626' : '#059669', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                            {formatNumberGroup(item.remainingAmount)}
                          </td>

                          {/* Cột 6: Droplist cuối dòng gồm 5 chức năng */}
                          <td style={{ padding: '12px 8px', textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              title="Tùy chọn thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRowMenuId(activeRowMenuId === item.id ? null : item.id);
                              }}
                              style={{
                                background: activeRowMenuId === item.id ? '#f1f5f9' : 'transparent',
                                border: '1px solid',
                                borderColor: activeRowMenuId === item.id ? '#cbd5e1' : 'transparent',
                                borderRadius: '6px',
                                padding: '5px 7px',
                                cursor: 'pointer',
                                color: '#475569',
                              }}
                            >
                              <ThreeDotsVertical size={14} />
                            </button>

                            {activeRowMenuId === item.id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  ...(isNearBottom ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
                                  minWidth: '190px',
                                  backgroundColor: '#ffffff',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                  zIndex: 999,
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  textAlign: 'left',
                                }}
                              >
                                {/* 1. Ghi nhận thanh toán */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    handleOpenPaymentModal(item);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 14px',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <CashCoin size={14} style={{ color: '#64748b' }} />
                                  <span>Ghi nhận thanh toán</span>
                                </button>

                                {/* 2. Đối chiếu công nợ */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    handleOpenReconciliation(item);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 14px',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <FileEarmarkCheck size={14} style={{ color: '#64748b' }} />
                                  <span>Đối chiếu công nợ</span>
                                </button>

                                {/* 3. Đề nghị thanh toán */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    handleSendPaymentRequest(item);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 14px',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Send size={14} style={{ color: '#64748b' }} />
                                  <span>Đề nghị thanh toán</span>
                                </button>

                                <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '2px 0' }} />

                                {/* 4. Chỉnh sửa thông tin */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    setEditingItem(item);
                                    setIsOffcanvasOpen(true);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 14px',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Pencil size={13} style={{ color: '#64748b' }} />
                                  <span>Chỉnh sửa thông tin</span>
                                </button>

                                {/* 5. Xoá khoản nợ */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    setItemToDelete(item);
                                    setConfirmDeleteOpen(true);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 14px',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Trash3 size={13} style={{ color: '#64748b' }} />
                                  <span>Xoá khoản nợ</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Danh sách các đợt phát sinh công nợ con khi mở rộng, kèm phiếu thu được nhóm vào từng đợt */}
                        {isExpanded &&
                          item.entries
                            .filter((entry) => !entry.code?.startsWith('PT-'))
                            .filter((entry) => {
                              if (statusFilter === 'all') return true;
                              if (statusFilter === 'completed') {
                                const isStageDone = (entry.remainingAmount !== undefined ? entry.remainingAmount : (entry.contractValue - (entry.paidAmount || 0))) <= 0;
                                return isStageDone || entry.status === 'completed';
                              }
                              if (statusFilter === 'ontime') {
                                return entry.status === 'ontime';
                              }
                              if (statusFilter === 'due') {
                                return entry.status === 'due' || entry.status === 'due_soon';
                              }
                              if (statusFilter === 'overdue') {
                                return entry.status === 'overdue';
                              }
                              return entry.status === statusFilter;
                            })
                            .map((entry) => {
                              const stagePayments = entry.payments || [];
                              const isStageDone = (entry.remainingAmount !== undefined ? entry.remainingAmount : (entry.contractValue - (entry.paidAmount || 0))) <= 0;
                              return (
                                <React.Fragment key={entry.id}>
                                  <tr
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSubEntry({ entry, parent: item, type: 'receivable' });
                                      setSubEntryDetailOpen(true);
                                    }}
                                    title="Nhấn để xem chi tiết khoản nợ"
                                    style={{
                                      backgroundColor: '#f8fafc',
                                      borderBottom: stagePayments.length > 0 ? '1px dashed #e2e8f0' : '1px solid #f1f5f9',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                                  >
                                    {/* Cột Khách hàng: Giảm chiều cao, font thường, mã phiếu và giờ ngày tháng trên cùng dòng cách nhau | */}
                                    <td style={{ padding: '8px 14px 8px 36px' }}>
                                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ color: '#0369a1', fontWeight: 700 }}>{entry.code}</span>
                                        <span style={{ color: '#cbd5e1' }}>|</span>
                                        <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 400 }}>
                                          {entry.time || '08:30'} • {entry.date}
                                        </span>
                                        {isStageDone ? (
                                          <span style={{ fontSize: '0.6875rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                                            Đã thu đủ
                                          </span>
                                        ) : (entry.paidAmount || 0) > 0 ? (
                                          <span style={{ fontSize: '0.6875rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
                                            Thu một phần
                                          </span>
                                        ) : null}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                                        {entry.title}
                                      </div>
                                    </td>

                                    {/* Cột Số tiền gốc: font thường không đậm */}
                                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: '#334155', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                      {formatNumberGroup(entry.contractValue || (entry as any).amount || 0)}
                                    </td>

                                    {/* Cột Đã thanh toán: font thường không đậm */}
                                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: (entry.paidAmount || 0) > 0 ? '#059669' : '#94a3b8', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                      {formatNumberGroup(entry.paidAmount || 0)}
                                    </td>

                                    {/* Cột Hạn thanh toán: font thường không đậm */}
                                    <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 500, color: '#475569', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                      {entry.dueDate || item.dueDate || 'Theo tiến độ'}
                                    </td>

                                    {/* Cột Còn lại: font thường không đậm */}
                                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: (entry.remainingAmount !== undefined ? entry.remainingAmount : (entry.contractValue || (entry as any).amount || 0)) > 0 ? '#dc2626' : '#059669', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                      {formatNumberGroup(entry.remainingAmount !== undefined ? entry.remainingAmount : (entry.contractValue || (entry as any).amount || 0))}
                                    </td>

                                    {/* Cột Thao tác: để trống cho đồng bộ và gọn gàng */}
                                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                    </td>
                                  </tr>

                                  {/* CÁC PHIẾU THU TIỀN ĐƯỢC NHÓM TRỰC TIẾP VÀO ĐỢT NÀY */}
                                  {stagePayments.map((pay: any, pIdx: number) => (
                                    <tr
                                      key={pay.id || `pay-${pIdx}`}
                                      style={{
                                        backgroundColor: '#f1f5f9',
                                        borderBottom: pIdx === stagePayments.length - 1 ? '1px solid #e2e8f0' : '1px dashed #e2e8f0',
                                        fontSize: '0.7813rem',
                                      }}
                                    >
                                      {/* Cột Khách hàng: Thụt lề với ký hiệu nhánh ↳ và badge Phiếu thu */}
                                      <td style={{ padding: '6px 14px 6px 56px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                          <span style={{ color: '#059669', fontWeight: 800 }}>↳</span>
                                          <span
                                            style={{
                                              backgroundColor: '#dcfce7',
                                              color: '#15803d',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              fontSize: '0.6875rem',
                                              fontWeight: 700,
                                            }}
                                          >
                                            Phiếu thu
                                          </span>
                                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{pay.code || pay.receiptCode}</span>
                                          <span style={{ color: '#cbd5e1' }}>|</span>
                                          <span style={{ color: '#64748b', fontSize: '0.7188rem' }}>
                                            {pay.time || '08:30'} • {pay.date}
                                          </span>
                                          <span style={{ color: '#64748b', fontSize: '0.7188rem', fontStyle: 'italic' }}>
                                            ({pay.method || 'Chuyển khoản'})
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '0.7188rem', color: '#64748b', marginTop: '2px', paddingLeft: '18px' }}>
                                          {pay.title || pay.note || `Thu tiền khách hàng theo phiếu ${pay.code || pay.receiptCode}`}
                                        </div>
                                      </td>

                                      {/* Số tiền gốc của phiếu thu */}
                                      <td style={{ padding: '6px 14px', textAlign: 'right', color: '#94a3b8' }}>
                                        —
                                      </td>

                                      {/* Đã thanh toán (hiển thị số tiền thu được của phiếu này) */}
                                      <td style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                        +{formatNumberGroup(pay.amount)}
                                      </td>

                                      {/* Hạn thanh toán / Trạng thái */}
                                      <td style={{ padding: '6px 14px', textAlign: 'center', color: '#059669', fontWeight: 600, fontSize: '0.75rem' }}>
                                        Đã thu
                                      </td>

                                      {/* Còn lại */}
                                      <td style={{ padding: '6px 14px', textAlign: 'right', color: '#94a3b8' }}>
                                        —
                                      </td>

                                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                        <button
                                          type="button"
                                          title="Xem và in phiếu thu A4"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const isBankTransfer = (pay.method || '').toLowerCase().includes('khoản') || (pay.method || '').toLowerCase().includes('ngân hàng');
                                            setReceiptToPrint({
                                              code: pay.code || pay.receiptCode || 'PT-20261004',
                                              date: pay.date || item.createdAt || '23/10/2026',
                                              customerName: item.customerName,
                                              customerAddress: item.customerAddress || '',
                                              amount: pay.amount,
                                              reason: pay.title || pay.note || `Thu tiền khách hàng - ${entry.title}`,
                                              contractCode: item.code,
                                              stageTitle: entry.title,
                                              paymentMethod: pay.method || 'Chuyển khoản',
                                              debitAccount: isBankTransfer ? '1121' : '1111',
                                              creditAccount: '131',
                                              notes: isBankTransfer ? 'Giấy báo Có ngân hàng' : '01 Chứng từ gốc',
                                              creator: getLoggedInUserName(user) || 'Nguyễn Thị Tuyết',
                                              accountant: 'Mai Thị Ngọc',
                                              cashier: '',
                                              director: 'Hà Hải Lâm',
                                            });
                                            setIsPrintReceiptModalOpen(true);
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#dbeafe';
                                            e.currentTarget.style.borderColor = '#93c5fd';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#eff6ff';
                                            e.currentTarget.style.borderColor = '#bfdbfe';
                                          }}
                                          style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '4px',
                                            border: '1px solid #bfdbfe',
                                            backgroundColor: '#eff6ff',
                                            color: '#2563eb',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            padding: 0,
                                            transition: 'all 0.15s ease',
                                          }}
                                        >
                                          <Printer size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                      </React.Fragment>
                    );
                  }

                  // ── DÒNG BƯỚC 2: CÔNG NỢ PHẢI TRẢ (ĐỒNG BỘ CẤU TRÚC BƯỚC 1, TÊN MÀU ĐỎ ĐẬM) ──
                  if (currentStep === 2) {
                    const item = row as PayableItem;
                    const isExpanded = statusFilter !== 'all' ? true : expandedSupplierId === item.id;
                    return (
                      <React.Fragment key={`pay-row-${item.id}`}>
                        <tr
                          onClick={() => toggleExpandSupplier(item.id)}
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                            transition: 'background-color 0.15s ease',
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? '#f8fafc' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isExpanded) e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {/* Cột 1: Nhà cung cấp / Đơn vị vận chuyển */}
                          <td style={{ padding: '12px 14px' }}>
                            {(() => {
                              const isTransporter = item.partnerType === 'transporter' || item.code?.startsWith('CNVC') || item.poCode?.startsWith('VC');
                              const hasEntries = Boolean(item.entries && item.entries.length > 0);
                              return (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                  {hasEntries ? (
                                    <button
                                      type="button"
                                      title={isExpanded ? 'Thu gọn' : (isTransporter ? 'Xem danh sách vận đơn' : 'Xem danh sách đơn mua hàng (PO)')}
                                      onClick={(e) => toggleExpandSupplier(item.id, e)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '2px',
                                        cursor: 'pointer',
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        marginTop: '2px',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                  ) : (
                                    <div style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                                  )}
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <span
                                        style={{
                                          fontWeight: 800,
                                          color: isTransporter ? '#1d4ed8' : '#b91c1c',
                                          fontSize: '0.875rem',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.02em',
                                        }}
                                      >
                                        {item.supplierName}
                                      </span>
                                      {isTransporter ? (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            fontSize: '0.6563rem',
                                            fontWeight: 700,
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: '#eff6ff',
                                            color: '#1d4ed8',
                                            border: '1px solid #bfdbfe',
                                          }}
                                        >
                                          <Truck size={10} /> ĐV Vận chuyển
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            fontSize: '0.6563rem',
                                            fontWeight: 700,
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: '#f8fafc',
                                            color: '#475569',
                                            border: '1px solid #e2e8f0',
                                          }}
                                        >
                                          <Building size={10} /> Nhà cung cấp
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                                      {item.supplierAddress}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Cột 2: Tổng tiền đơn */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                            {formatNumberGroup(item.totalAmount)}
                          </td>

                          {/* Cột 3: Đã thanh toán */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                            {formatNumberGroup(item.paidAmount)}
                          </td>

                          {/* Cột 4: Hạn thanh toán (Không ghi hạn thanh toán ở mục chính) */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          </td>

                          {/* Cột 5: Còn lại */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: item.remainingAmount > 0 ? '#dc2626' : '#059669', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                            {formatNumberGroup(item.remainingAmount)}
                          </td>

                          {/* Cột 6: Droplist cuối dòng */}
                          <td style={{ padding: '12px 8px', textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              title="Tùy chọn thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRowMenuId(activeRowMenuId === item.id ? null : item.id);
                              }}
                              style={{
                                background: activeRowMenuId === item.id ? '#f1f5f9' : 'transparent',
                                border: '1px solid',
                                borderColor: activeRowMenuId === item.id ? '#cbd5e1' : 'transparent',
                                borderRadius: '6px',
                                padding: '5px 7px',
                                cursor: 'pointer',
                                color: '#475569',
                              }}
                            >
                              <ThreeDotsVertical size={14} />
                            </button>

                            {activeRowMenuId === item.id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  ...(isNearBottom ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
                                  minWidth: '190px',
                                  backgroundColor: '#ffffff',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                  zIndex: 999,
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  textAlign: 'left',
                                }}
                              >
                                {/* 1. Lập phiếu chi thanh toán */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    handleOpenPayablePaymentModal(item);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 14px',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <CashCoin size={14} style={{ color: '#64748b' }} />
                                  <span>Lập phiếu chi thanh toán</span>
                                </button>

                                {/* 2. Đối chiếu công nợ */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    handleOpenPayableReconciliation(item);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 14px',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <FileEarmarkCheck size={14} style={{ color: '#64748b' }} />
                                  <span>Đối chiếu công nợ</span>
                                </button>

                                {/* 3. Đề nghị thanh toán */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    handleSendPayablePaymentRequest(item);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 14px',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Send size={14} style={{ color: '#64748b' }} />
                                  <span>Đề nghị thanh toán</span>
                                </button>

                                <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '2px 0' }} />

                                {/* 4. Chỉnh sửa thông tin */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    setEditingItem(item);
                                    setIsOffcanvasOpen(true);
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 500, color: '#334155', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Pencil size={13} style={{ color: '#64748b' }} />
                                  <span>Chỉnh sửa thông tin</span>
                                </button>

                                {/* 5. Xoá khoản nợ */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    setItemToDelete(item);
                                    setConfirmDeleteOpen(true);
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 500, color: '#334155', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Trash3 size={13} style={{ color: '#64748b' }} />
                                  <span>Xoá khoản nợ</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Danh sách các phiếu phát sinh công nợ con khi mở rộng (Đồng bộ Bước 1) */}
                        {isExpanded &&
                          (item.entries || [])
                            .filter((entry) => {
                              if (statusFilter === 'all') return true;
                              if (statusFilter === 'completed') {
                                const isStageDone = (entry.remainingAmount !== undefined ? entry.remainingAmount : (entry.totalAmount - (entry.paidAmount || 0))) <= 0;
                                return isStageDone || entry.status === 'completed';
                              }
                              if (statusFilter === 'pending') {
                                return entry.status === 'pending';
                              }
                              if (statusFilter === 'due_soon') {
                                return entry.status === 'due_soon';
                              }
                              if (statusFilter === 'overdue') {
                                return entry.status === 'overdue';
                              }
                              return entry.status === statusFilter;
                            })
                            .map((entry) => (
                            <tr
                              key={entry.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubEntry({ entry, parent: item, type: 'payable' });
                                setSubEntryDetailOpen(true);
                              }}
                              title="Nhấn để xem chi tiết khoản nợ"
                              style={{
                                backgroundColor: '#f8fafc',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                            >
                              {/* Cột Nhà cung cấp: Giảm chiều cao, font thường, mã phiếu và giờ ngày tháng trên cùng dòng cách nhau | */}
                              <td style={{ padding: '6px 14px 6px 36px' }}>
                                <div style={{ fontWeight: 500, color: '#334155', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{entry.code}</span>
                                  <span style={{ color: '#cbd5e1' }}>|</span>
                                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 400 }}>
                                    {entry.time || '09:00'} • {entry.date}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px', fontWeight: 400 }}>
                                  {entry.title}
                                </div>
                              </td>

                              {/* Cột Tổng tiền đơn: font thường không đậm */}
                              <td style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 400, color: '#334155', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                {formatNumberGroup(entry.totalAmount)}
                              </td>

                              {/* Cột Đã thanh toán: font thường không đậm */}
                              <td style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 400, color: '#059669', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                {formatNumberGroup(entry.paidAmount)}
                              </td>

                              {/* Cột Hạn thanh toán: font thường không đậm */}
                              <td style={{ padding: '6px 14px', textAlign: 'center', fontWeight: 400, color: '#475569', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                {entry.dueDate}
                              </td>

                              {/* Cột Còn lại: font thường không đậm */}
                              <td style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 400, color: entry.remainingAmount > 0 ? '#dc2626' : '#059669', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                {formatNumberGroup(entry.remainingAmount)}
                              </td>

                              {/* Cột Thao tác: bỏ icon cuối dòng */}
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  }

                  // ── DÒNG BƯỚC 3: NỢ VAY NGÂN HÀNG & BCTC TT200 ──
                  if (currentStep === 3) {
                    const item = row as LoanItem;
                    const facilityColorMap: Record<string, { bg: string; color: string; border: string }> = {
                      working_capital: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                      term_loan: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
                      guarantee: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
                      letter_of_credit: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
                      overdraft: { bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8' },
                    };
                    const facilityStyle = facilityColorMap[item.facilityType] || facilityColorMap.working_capital;

                    return (
                      <tr
                        key={`loan-row-${item.id}`}
                        onClick={() => {
                          setEditingItem(item);
                          setIsOffcanvasOpen(true);
                        }}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Cột 1: Ngân hàng và Hợp đồng tín dụng */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: '#0369a1', fontSize: '0.875rem' }}>
                              {item.bankName}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                backgroundColor: facilityStyle.bg,
                                color: facilityStyle.color,
                                border: `1px solid ${facilityStyle.border}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.facilityLabel || 'Vay vốn lưu động'}
                            </span>
                            {item.bankAccountNumber && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  fontSize: '0.6875rem',
                                  color: '#475569',
                                  backgroundColor: '#f1f5f9',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  border: '1px solid #e2e8f0',
                                  whiteSpace: 'nowrap',
                                }}
                                title={`Tài khoản trích nợ: ${item.bankAccountNumber}`}
                              >
                                <span>Tài khoản trích nợ: <strong style={{ color: '#0f172a' }}>{item.bankAccountNumber}</strong></span>
                              </span>
                            )}
                          </div>
                          {item.loanType && (
                            <div
                              title={item.loanType}
                              style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                marginTop: '4px',
                                lineHeight: 1.4,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.loanType}
                            </div>
                          )}
                        </td>

                        {/* Cột 2: Kỳ hạn & Trạng thái */}
                        <td style={{ padding: '12px 14px', width: '160px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                            {renderStatusBadge(item.status, item.statusLabel)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                            Đáo hạn: <span style={{ fontWeight: 600, color: '#334155' }}>{item.maturityDate}</span>
                          </div>
                        </td>

                        {/* Cột 3: Hạn mức và Dư nợ gốc */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', width: '200px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.875rem' }}>
                            {formatNumberGroup(item.loanLimit)} đ
                          </div>
                          <div style={{ fontSize: '0.7813rem', fontWeight: 700, color: item.remainingPrincipal > 0 ? '#dc2626' : '#059669', marginTop: '2px' }}>
                            Dư nợ: {formatNumberGroup(item.remainingPrincipal)} đ
                          </div>
                          <div style={{ fontSize: '0.7188rem', color: '#059669', fontWeight: 600, marginTop: '1px' }}>
                            Đã trả: {formatNumberGroup(item.paidPrincipal)} đ
                          </div>
                        </td>

                        {/* Cột 4: Lãi suất và Lãi dự kiến */}
                        <td style={{ padding: '12px 14px', width: '220px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.8125rem' }}>
                              {item.interestRate}
                            </span>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: item.interestType === 'fixed' ? '#f1f5f9' : '#ecfdf5',
                                color: item.interestType === 'fixed' ? '#475569' : '#047857',
                                border: `1px solid ${item.interestType === 'fixed' ? '#e2e8f0' : '#a7f3d0'}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.interestType === 'fixed' ? 'Cố định' : 'Thả nổi'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600, marginTop: '3px', whiteSpace: 'nowrap' }}>
                            Lãi ước tính: <span style={{ color: '#0284c7' }}>~{formatNumberGroup(item.monthlyInterestEst)} đ/th</span>
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap' }}>
                            Chốt lãi ngày {item.interestPaymentDay || 25} hàng tháng
                          </div>
                        </td>

                        {/* Cột 6: Thao tác */}
                        <td style={{ padding: '12px 8px', textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button
                              type="button"
                              title="Tùy chọn thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRowMenuId(activeRowMenuId === item.id ? null : item.id);
                              }}
                              style={{
                                background: activeRowMenuId === item.id ? '#f1f5f9' : 'transparent',
                                border: '1px solid',
                                borderColor: activeRowMenuId === item.id ? '#cbd5e1' : 'transparent',
                                borderRadius: '6px',
                                padding: '5px 7px',
                                cursor: 'pointer',
                                color: '#475569',
                              }}
                            >
                              <ThreeDotsVertical size={14} />
                            </button>
                          </div>

                          {activeRowMenuId === item.id && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                ...(isNearBottom ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
                                minWidth: '170px',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                zIndex: 999,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                textAlign: 'left',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowMenuId(null);
                                  handleOpenDrawdownModal(item);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 500, color: '#334155', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <Receipt size={13} style={{ color: '#0284c7' }} />
                                <span>Khế ước nhận nợ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowMenuId(null);
                                  setEditingItem(item);
                                  setIsOffcanvasOpen(true);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 500, color: '#334155', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <Pencil size={13} style={{ color: '#64748b' }} />
                                <span>Chỉnh sửa thông tin</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowMenuId(null);
                                  setItemToDelete(item);
                                  setConfirmDeleteOpen(true);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 500, color: '#dc2626', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <Trash3 size={13} style={{ color: '#dc2626' }} />
                                <span>Xoá hợp đồng vay</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  return null;
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── 3. PAGINATION PHÂN TRANG (CHUẨN LIỀN MẠCH, KHÔNG BỌC THẺ CARD THỪA) ── */}
        <div
          className="pagination-container"
          style={{
            marginTop: 'auto',
            flexShrink: 0,
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-1)',
          }}
        >
          <Pagination
            currentPage={currentPage}
            totalItems={currentListLength}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </div>

      {/* ── 4. OFFCANVAS THÊM HOẶC CHỈNH SỬA DỮ LIỆU GỌN GÀNG (CHUẨN 400PX) ── */}
      <Offcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => setIsOffcanvasOpen(false)}
        icon={
          currentStep === 3 ? (
            <Bank size={22} style={{ color: '#0284c7' }} />
          ) : currentStep === 1 ? (
            <FileEarmarkText size={22} style={{ color: '#0284c7' }} />
          ) : currentStep === 2 ? (
            <FileEarmarkCheck size={22} style={{ color: '#059669' }} />
          ) : (
            <CashCoin size={22} style={{ color: '#d97706' }} />
          )
        }
        title={
          editingItem
            ? currentStep === 4
              ? 'Chỉnh sửa phiếu chi'
              : currentStep === 3
              ? 'Chỉnh sửa hợp đồng vay'
              : 'Chỉnh sửa thông tin'
            : currentStep === 4
            ? 'Lập phiếu chi'
            : createButtonText
        }
        description={
          currentStep === 4
            ? 'Khai báo chi phí và ghi sổ kép tự động vào Sổ nhật ký chung'
            : currentStep === 3
            ? 'Khai báo hạn mức tín dụng, lãi suất và tài sản thế chấp'
            : currentStep === 1
            ? 'Theo dõi chi tiết công nợ phải thu của khách hàng'
            : 'Theo dõi chi tiết công nợ phải trả nhà cung cấp'
        }
        width="400px"
        confirmText={editingItem ? 'Lưu thay đổi' : currentStep === 4 ? 'Lập phiếu chi' : 'Tạo mới'}
        cancelText="Huỷ"
        onConfirm={handleSaveOffcanvas}
        onCancel={() => setIsOffcanvasOpen(false)}
        footerLeft={
          currentStep === 4 ? (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              title="Tự động mở cửa sổ xem trước và in ấn A4 sau khi lưu"
            >
              <input
                type="checkbox"
                checked={isPrintPaymentVoucherChecked}
                onChange={(e) => setIsPrintPaymentVoucherChecked(e.target.checked)}
                style={{
                  width: '15px',
                  height: '15px',
                  cursor: 'pointer',
                  accentColor: '#0284c7',
                }}
              />
              <Printer size={15} style={{ color: '#0284c7' }} />
              <span>In phiếu chi</span>
            </label>
          ) : undefined
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentStep !== 4 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                Mã quản lý:
              </label>
              <Input
                type="text"
                placeholder="Hệ thống tự sinh mã nếu để trống"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>
          )}

          {currentStep === 3 ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                  Ngân hàng hoặc tổ chức tín dụng:
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Vietcombank, BIDV, MBBank, VietinBank..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                  Số hợp đồng tín dụng:
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: HDTD-2026-VCB-01..."
                  value={formContractCode}
                  onChange={(e) => setFormContractCode(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                    Hình thức tín dụng:
                  </label>
                  <select
                    className="form-input"
                    value={formFacilityType}
                    onChange={(e) => setFormFacilityType(e.target.value)}
                    style={{ width: '100%', marginBottom: 0 }}
                  >
                    <option value="working_capital">Vốn lưu động hạn mức</option>
                    <option value="term_loan">Vay trung dài hạn TSCĐ</option>
                    <option value="guarantee">Hạn mức bảo lãnh</option>
                    <option value="letter_of_credit">Thư tín dụng (L/C)</option>
                    <option value="overdraft">Hạn mức thấu chi</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                    Kỳ hạn BCTC:
                  </label>
                  <select
                    className="form-input"
                    value={formTermType}
                    onChange={(e) => setFormTermType(e.target.value)}
                    style={{ width: '100%', marginBottom: 0 }}
                  >
                    <option value="short_term">Ngắn hạn (Mã 320)</option>
                    <option value="long_term">Dài hạn (Mã 338)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                  Hạn mức cấp tín dụng:
                </label>
                <Input
                  type="text"
                  placeholder="Nhập số tiền VNĐ"
                  value={formAmount ? formatNumberGroup(formAmount) : ''}
                  onChange={(e) => setFormAmount(e.target.value.replace(/\D/g, ''))}
                  rightIcon={<span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>đ</span>}
                  style={{ marginBottom: 0 }}
                />
              </div>

              {formTermType === 'long_term' && (
                <div style={{ backgroundColor: '#fff7ed', padding: '10px', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, color: '#9a3412', marginBottom: '3px' }}>
                    Nợ dài hạn đến hạn trả trong vòng 12 tháng:
                  </label>
                  <Input
                    type="text"
                    placeholder="Số tiền đến hạn trả trong 12T..."
                    value={formDueWithin12m ? formatNumberGroup(formDueWithin12m) : ''}
                    onChange={(e) => setFormDueWithin12m(e.target.value.replace(/\D/g, ''))}
                    rightIcon={<span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>đ</span>}
                    style={{ marginBottom: 0, backgroundColor: '#ffffff' }}
                  />
                  <span style={{ fontSize: '0.6875rem', color: '#c2410c', marginTop: '3px', display: 'block' }}>
                    * Phần nợ này sẽ tự động kết chuyển vào chỉ tiêu 320 trên Bảng CĐKT B01-DN.
                  </span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                    Lãi suất (%/năm):
                  </label>
                  <Input
                    type="text"
                    placeholder="7.5"
                    value={formInterestRateVal}
                    onChange={(e) => setFormInterestRateVal(e.target.value)}
                    rightIcon={<span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>%</span>}
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                    Cơ chế lãi suất:
                  </label>
                  <select
                    className="form-input"
                    value={formInterestType}
                    onChange={(e) => setFormInterestType(e.target.value)}
                    style={{ width: '100%', marginBottom: 0 }}
                  >
                    <option value="floating">Lãi suất thả nổi</option>
                    <option value="fixed">Lãi suất cố định</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                    Ngày chốt lãi tháng:
                  </label>
                  <Input
                    type="text"
                    placeholder="25"
                    value={formInterestPaymentDay}
                    onChange={(e) => setFormInterestPaymentDay(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                    Ngày đáo hạn HĐ:
                  </label>
                  <Input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                  Tài sản đảm bảo / Thế chấp:
                </label>
                {dbFixedAssets.length > 0 && (
                  <select
                    className="form-input"
                    style={{ width: '100%', marginBottom: '6px' }}
                    onChange={(e) => {
                      const sel = dbFixedAssets.find((a) => a.id === e.target.value);
                      if (sel) {
                        setFormCollateralName(`${sel.name} (${sel.code})`);
                        setFormCollateralValue(String(sel.originalPrice || ''));
                      }
                    }}
                  >
                    <option value="">-- Chọn nhanh từ danh mục TSCĐ ({dbFixedAssets.length} tài sản) --</option>
                    {dbFixedAssets.map((fa) => (
                      <option key={fa.id} value={fa.id}>
                        {fa.name} (Nguyên giá: {formatNumberGroup(fa.originalPrice)} đ)
                      </option>
                    ))}
                  </select>
                )}
                <Input
                  type="text"
                  placeholder="Mô tả tài sản thế chấp hoặc tín chấp..."
                  value={formCollateralName}
                  onChange={(e) => setFormCollateralName(e.target.value)}
                  style={{ marginBottom: '6px' }}
                />
                <Input
                  type="text"
                  placeholder="Giá trị định giá tài sản đảm bảo (VNĐ)"
                  value={formCollateralValue ? formatNumberGroup(formCollateralValue) : ''}
                  onChange={(e) => setFormCollateralValue(e.target.value.replace(/\D/g, ''))}
                  rightIcon={<span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>đ</span>}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                  Tài khoản ngân hàng trích nợ:
                </label>
                {dbCashAssets.length > 0 && (
                  <select
                    className="form-input"
                    style={{ width: '100%', marginBottom: '6px' }}
                    onChange={(e) => {
                      const sel = dbCashAssets.find((c) => c.accountNumber === e.target.value);
                      if (sel) {
                        setFormBankAccountNumber(sel.accountNumber);
                      }
                    }}
                  >
                    <option value="">-- Chọn tài khoản ngân hàng trích nợ Deco Door --</option>
                    {dbCashAssets.filter(c => c.accountNumber).map((ca) => (
                      <option key={ca.id} value={ca.accountNumber}>
                        {ca.bankName} - TK: {ca.accountNumber} ({ca.name})
                      </option>
                    ))}
                  </select>
                )}
                <Input
                  type="text"
                  placeholder="Số tài khoản ngân hàng trích nợ..."
                  value={formBankAccountNumber}
                  onChange={(e) => setFormBankAccountNumber(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                  Mục đích vay vốn:
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Vay bổ sung vốn lưu động sản xuất cửa gỗ dự án..."
                  value={formLoanType}
                  onChange={(e) => setFormLoanType(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                  Ghi chú điều kiện cấp tín dụng:
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Nhập điều kiện giải ngân, cam kết duy trì số dư..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </>
          ) : (
            <>
              {currentStep === 1 ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                    Khách hàng từ cơ sở dữ liệu:
                  </label>
                  <select
                    className="form-input"
                    value={formCustomerId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setFormCustomerId(selId);
                      const found = dbCustomers.find((c) => c.id === selId);
                      if (found) {
                        setFormName(found.name);
                        if (found.address) setFormAddress(found.address);
                      }
                    }}
                    style={{ width: '100%', marginBottom: '6px' }}
                  >
                    <option value="">-- Chọn khách hàng trong CSDL ({dbCustomers.length} khách hàng) --</option>
                    {dbCustomers.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.code ? `[${cust.code}] ` : ''}{cust.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="text"
                    placeholder="Tên khách hàng chi tiết..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                </div>
              ) : currentStep === 4 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* 1. LOẠI NGHIỆP VỤ CHI (DÙNG COMPONENT INPUT CÓ DANH SÁCH GỢI Ý SUGGESTIONINPUT) */}
                  <div>
                    <SuggestionInput
                      label="Loại nghiệp vụ chi"
                      required
                      value={formExpenseOpName}
                      onChange={(val) => {
                        handleExpenseOpTypeChange(val);
                      }}
                      onSelectSuggestion={(item) => {
                        if (item.id) {
                          handleExpenseOpTypeChange(item.id);
                        } else {
                          handleExpenseOpTypeChange(item.value);
                        }
                      }}
                      suggestions={expenseSuggestions}
                      placeholder="Gõ tìm kiếm (ví dụ: vật liệu, tiếp khách, sửa chữa, lãi vay...)"
                      emptyMessage="Không tìm thấy nghiệp vụ phù hợp"
                      containerStyle={{ marginBottom: 0 }}
                      inputStyle={{ fontWeight: 600, color: '#0369a1' }}
                    />
                  </div>

                  {/* CHỌN HỢP ĐỒNG VAY NẾU LÀ TRẢ LÃI */}
                  {formExpenseOpType === 'financial_interest' && (
                    <div style={{ padding: '10px 12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <Select
                        label="Chọn hợp đồng vay ngân hàng đang có dư nợ"
                        value={formSelectedLoanId}
                        onChange={(e) => handleSelectLoanForInterest(e.target.value)}
                        options={[
                          { value: '', label: '-- Chọn hợp đồng tín dụng ngân hàng --' },
                          ...loans.filter((l) => l.remainingPrincipal > 0).map((l) => ({
                            value: l.id,
                            label: `${l.bankName} (Dư nợ: ${(l.remainingPrincipal / 1e9).toFixed(1)} tỷ - Lãi ước tính: ${formatNumberGroup(l.monthlyInterestEst)} đồng)`,
                          })),
                        ]}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  )}

                  {/* 2. CARD ĐỊNH KHOẢN KẾ TOÁN (ÁP DỤNG COMPONENT SELECT, TÁCH 2 DÒNG RIÊNG) */}
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontSize: '0.71875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#475569' }}>
                        Định khoản Sổ nhật ký chung
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          backgroundColor: '#e0f2fe',
                          color: '#0284c7',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          border: '1px solid #bae6fd',
                        }}
                      >
                        Nợ TK {formDebitAccount} / Có TK {formCreditAccount}
                      </span>
                    </div>

                    {/* Dòng 1: Tài khoản NỢ (Áp dụng component Select) */}
                    <div>
                      <Select
                        label="Tài khoản NỢ"
                        required
                        value={formDebitAccount}
                        onChange={(e) => {
                          const acc = STANDARD_DEBIT_ACCOUNTS.find((a) => a.code === e.target.value);
                          setFormDebitAccount(e.target.value);
                          if (acc) setFormDebitAccountName(acc.name);
                        }}
                        options={STANDARD_DEBIT_ACCOUNTS.map((acc) => ({
                          value: acc.code,
                          label: acc.name,
                        }))}
                        style={{ marginBottom: 0 }}
                      />
                    </div>

                    {/* Dòng 2: Tài khoản CÓ (Áp dụng component Select) */}
                    <div>
                      <Select
                        label="Tài khoản CÓ"
                        required
                        value={formCreditAccount}
                        onChange={(e) => {
                          const acc = STANDARD_CREDIT_ACCOUNTS.find((a) => a.code === e.target.value);
                          setFormCreditAccount(e.target.value);
                          if (acc) setFormCreditAccountName(acc.name);
                        }}
                        options={STANDARD_CREDIT_ACCOUNTS.map((acc) => ({
                          value: acc.code,
                          label: acc.name,
                        }))}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  </div>

                  {/* 3. SỐ TIỀN & NGÀY CHI TIỀN (ÁP DỤNG COMPONENT INPUT, ĐƠN VỊ ĐỒNG) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <div>
                      <Input
                        label="Số tiền"
                        required
                        type="text"
                        placeholder="0"
                        value={formAmount ? formatNumberGroup(formAmount) : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setFormAmount(raw);
                        }}
                        rightIcon={<span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>đồng</span>}
                        style={{ marginBottom: 0, fontWeight: 700, color: '#b91c1c' }}
                      />
                    </div>

                    <div>
                      <Input
                        label="Ngày chi tiền"
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  </div>
                  {Number(String(formAmount).replace(/\D/g, '')) > 0 && (
                    <div style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: '#0369a1', marginTop: '-6px' }}>
                      Bằng chữ: {convertNumberToVietnameseWords(Number(String(formAmount).replace(/\D/g, '')))}
                    </div>
                  )}

                  {/* 4. NGƯỜI CHI (ÁP DỤNG COMPONENT EMPLOYEESELECT) */}
                  <div>
                    <EmployeeSelect
                      label="Người chi"
                      multiple={false}
                      placeholder="Chọn hoặc tìm người chi tiền..."
                      searchPlaceholder="Tìm theo tên, chức vụ..."
                      value={formSpender}
                      onChange={(val) => {
                        setFormSpender(val);
                      }}
                      style={{ marginBottom: 0 }}
                    />
                  </div>

                  {/* 5. NGƯỜI ĐỀ XUẤT (ÁP DỤNG COMPONENT EMPLOYEESELECT) */}
                  <div>
                    <EmployeeSelect
                      label="Người đề xuất"
                      multiple={false}
                      placeholder="Chọn người đề xuất..."
                      searchPlaceholder="Tìm theo tên, phòng ban..."
                      value={formProposer}
                      onChange={(val, selectedEmps) => {
                        setFormProposer(val);
                        if (selectedEmps && selectedEmps.length > 0 && selectedEmps[0].department) {
                          setFormExpenseDepartment(selectedEmps[0].department);
                        }
                      }}
                      style={{ marginBottom: 0 }}
                    />
                  </div>

                  {/* 6. CHỨNG TỪ KÈM THEO */}
                  <div>
                    <label className="form-label" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '3px' }}>
                      Chứng từ kèm theo
                    </label>
                    <textarea
                      className="form-input form-control"
                      rows={2}
                      placeholder="Kèm theo hóa đơn GTGT, biên bản giao nhận, lệnh chuyển tiền..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  {/* 7. NỘI DUNG / DIỄN GIẢI KHOẢN CHI (CHUYỂN XUỐNG CUỐI CÙNG, DÙNG COMPONENT INPUT) */}
                  <div>
                    <Input
                      label="Nội dung / Diễn giải khoản chi"
                      required
                      type="text"
                      placeholder="Ví dụ: Mua nguyên vật liệu trực tiếp sản xuất cửa..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {currentStep === 2 && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                        Phân loại đối tác phải trả:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setFormPartnerType('supplier')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: formPartnerType === 'supplier' ? '2px solid #b91c1c' : '1px solid #cbd5e1',
                            backgroundColor: formPartnerType === 'supplier' ? '#fef2f2' : '#ffffff',
                            color: formPartnerType === 'supplier' ? '#b91c1c' : '#475569',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Building size={14} /> Nhà cung cấp
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormPartnerType('transporter')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: formPartnerType === 'transporter' ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                            backgroundColor: formPartnerType === 'transporter' ? '#eff6ff' : '#ffffff',
                            color: formPartnerType === 'transporter' ? '#1d4ed8' : '#475569',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Truck size={14} /> Đơn vị vận chuyển
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                      {currentStep === 2
                        ? formPartnerType === 'transporter'
                          ? 'Tên đơn vị vận chuyển:'
                          : 'Tên nhà cung cấp:'
                        : 'Nội dung khoản chi:'}
                    </label>
                    <Input
                      type="text"
                      placeholder={
                        currentStep === 2
                          ? formPartnerType === 'transporter'
                            ? 'Ví dụ: Viettel Post, GHTK, Vận tải Á Châu...'
                            : 'Ví dụ: Công ty Cổ phần Gỗ An Cường, KinLong...'
                          : 'Nhập tên chi tiết...'
                      }
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                  </div>

                  {(currentStep === 1 || currentStep === 2) && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                        {currentStep === 1
                          ? 'Địa chỉ khách hàng:'
                          : formPartnerType === 'transporter'
                          ? 'Địa chỉ bến bãi / HUB ĐVVC:'
                          : 'Địa chỉ nhà cung cấp:'}
                      </label>
                      <Input
                        type="text"
                        placeholder={
                          currentStep === 2 && formPartnerType === 'transporter'
                            ? 'Bến bãi trung chuyển hoặc địa chỉ văn phòng ĐVVC...'
                            : 'Nhập địa chỉ...'
                        }
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  )}

                  {(currentStep === 1 || currentStep === 2) && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                        {currentStep === 1
                          ? 'Dự án / Hạng mục:'
                          : formPartnerType === 'transporter'
                          ? 'Mã vận đơn / Hợp đồng vận chuyển:'
                          : 'Mã đơn mua hàng (PO):'}
                      </label>
                      <Input
                        type="text"
                        placeholder={
                          currentStep === 1
                            ? 'Tên dự án hoặc gói thầu...'
                            : formPartnerType === 'transporter'
                            ? 'Ví dụ: VC-2026-018...'
                            : 'Ví dụ: PO-ANCUONG-01...'
                        }
                        value={formProjectOrPo}
                        onChange={(e) => setFormProjectOrPo(e.target.value)}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                      Số tiền:
                    </label>
                    <Input
                      type="text"
                      placeholder="Nhập số tiền VNĐ"
                      value={formAmount ? formatNumberGroup(formAmount) : ''}
                      onChange={(e) => setFormAmount(e.target.value.replace(/\D/g, ''))}
                      rightIcon={<span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>đ</span>}
                      style={{ marginBottom: 0 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                      Thời hạn ngày tháng:
                    </label>
                    <Input
                      type="text"
                      placeholder="ngày/tháng/năm"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                      Ghi chú thêm:
                    </label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Nhập ghi chú hoặc điều kiện thanh toán..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Offcanvas>

      {/* ── 5. OFFCANVAS GHI NHẬN THANH TOÁN THU NỢ KHÁCH HÀNG (RỘNG 400PX CHUẨN GIAO DIỆN) ── */}
      {selectedReceivableForPayment && (
        <Offcanvas
          isOpen={paymentOffcanvasOpen}
          onClose={() => {
            setPaymentOffcanvasOpen(false);
            setSelectedReceivableForPayment(null);
          }}
          icon={<CashCoin size={22} style={{ color: '#059669' }} />}
          title="Ghi nhận thanh toán & Lập phiếu thu"
          width="400px"
          position="right"
          bodyStyle={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
          }}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPaymentOffcanvasOpen(false);
                  setSelectedReceivableForPayment(null);
                }}
                style={{ minWidth: '80px' }}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmPayment}
                style={{
                  minWidth: '140px',
                  fontWeight: 700,
                  backgroundColor: '#0a3a78',
                  borderColor: '#0a3a78',
                }}
              >
                Xác nhận thanh toán
              </Button>
            </div>
          }
        >
          {/* KHỐI 1: THÔNG TIN ĐỐI TÁC VÀ CÔNG NỢ */}
          <div style={{ paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Đối tác / Khách hàng</span>
              <Badge variant="warning">Còn nợ</Badge>
            </div>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9375rem', lineHeight: 1.3 }}>
              {selectedReceivableForPayment.customerName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Mã: <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedReceivableForPayment.code}</span>
              {selectedReceivableForPayment.customerAddress && (
                <span> • {selectedReceivableForPayment.customerAddress}</span>
              )}
            </div>

            {/* 3 ô chỉ số thống kê */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '6px',
                marginTop: '12px',
                padding: '10px 8px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  TỔNG NỢ
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {formatNumberGroup(selectedReceivableForPayment.contractValue)}đ
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  ĐÃ THANH TOÁN
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  {formatNumberGroup(selectedReceivableForPayment.paidAmount)}đ
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  CÒN PHẢI THU
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                  {formatNumberGroup(selectedReceivableForPayment.remainingAmount)}đ
                </div>
              </div>
            </div>
          </div>

          {/* KHỐI 2: THÔNG TIN KHOẢN NỢ & TIỀN THU */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircleFill size={14} style={{ color: '#059669' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. ĐƠN HÀNG / KHOẢN NỢ & SỐ TIỀN THU
              </span>
            </div>

            {/* Chọn đơn hàng / khoản nợ thanh toán áp dụng */}
            {selectedReceivableForPayment.entries && selectedReceivableForPayment.entries.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Đơn hàng / Khoản nợ áp dụng <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedStageForPayment?.id || ''}
                  onChange={(e) => {
                    const found = selectedReceivableForPayment?.entries.find((s) => s.id === e.target.value);
                    if (found) {
                      setSelectedStageForPayment(found);
                      const remAmt = found.remainingAmount !== undefined ? found.remainingAmount : (found.contractValue - (found.paidAmount || 0));
                      setPaymentAmountInput(String(remAmt));
                      setPaymentNote(`Thu tiền khách hàng - ${found.title}`);
                      setLinkedOrderInput(`${selectedReceivableForPayment.customerName} - ${found.title}`);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '38px',
                    fontSize: '0.7813rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 8px',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {selectedReceivableForPayment.entries
                    .filter((s) => {
                      if (s.code?.startsWith('PT-')) return false;
                      const rem = s.remainingAmount !== undefined ? s.remainingAmount : (s.contractValue - (s.paidAmount || 0));
                      return rem > 0;
                    })
                    .map((s) => {
                      const cleanTitle = s.title.replace(/\s*\([^)]*\)/g, '').trim();
                      const rem = s.remainingAmount !== undefined ? s.remainingAmount : (s.contractValue - (s.paidAmount || 0));
                      return (
                        <option key={s.id} value={s.id}>
                          {cleanTitle} (Còn nợ: {formatNumberGroup(rem)}đ)
                        </option>
                      );
                    })}
                </select>
              </div>
            )}

            {/* Số tiền thu VND */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Số tiền thu VND <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <Input
                type="text"
                value={formatNumberGroup(paymentAmountInput)}
                onChange={(e) => setPaymentAmountInput(e.target.value.replace(/\D/g, ''))}
                style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}
              />
              <div style={{ fontSize: '0.7188rem', color: '#64748b', fontStyle: 'italic', marginTop: '4px', lineHeight: 1.3 }}>
                Bằng chữ: {convertNumberToVietnameseWords(Number(paymentAmountInput) || 0)}
              </div>
            </div>

            {/* Ngày thu và Số phiếu thu */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Ngày hạch toán / lập phiếu
                </label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type="text"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    style={{ marginBottom: 0, fontSize: '0.7813rem', paddingRight: '28px' }}
                  />
                  <Calendar3 size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Số phiếu thu (Mã chứng từ)
                </label>
                <Input
                  type="text"
                  value={receiptCodeInput}
                  onChange={(e) => setReceiptCodeInput(e.target.value)}
                  style={{ marginBottom: 0, fontSize: '0.7813rem' }}
                />
              </div>
            </div>

            {/* Phương thức thanh toán và In phiếu thu */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Phương thức thanh toán
                </label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => {
                    const method = e.target.value;
                    setPaymentMethod(method);
                    if (method === 'Tiền mặt') {
                      setPaymentDebitAccount('1111');
                      setPaymentOriginalDocsCount('01 Phiếu thu kiêm BB giao nhận');
                    } else if (method === 'Chuyển khoản') {
                      setPaymentDebitAccount('1121');
                      setPaymentOriginalDocsCount('01 Giấy báo Có ngân hàng / UNC');
                    } else if (method === 'Bù trừ công nợ') {
                      setPaymentDebitAccount('331');
                      setPaymentOriginalDocsCount('01 Biên bản đối trừ công nợ 2 bên');
                    } else if (method === 'Thẻ tín dụng doanh nghiệp') {
                      setPaymentDebitAccount('1121');
                      setPaymentOriginalDocsCount('01 Hóa đơn POS / Cà thẻ');
                    }
                  }}
                  style={{ width: '100%', height: '36px', fontSize: '0.7813rem', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px' }}
                >
                  <option value="Chuyển khoản">Chuyển khoản ngân hàng (TK 1121)</option>
                  <option value="Tiền mặt">Tiền mặt tại quỹ (TK 1111)</option>
                  <option value="Thẻ tín dụng doanh nghiệp">Thẻ tín dụng doanh nghiệp</option>
                  <option value="Bù trừ công nợ">Bù trừ công nợ đối ứng (TK 331)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                <label
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '36px',
                    height: '20px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={printReceiptChecked}
                    onChange={(e) => setPrintReceiptChecked(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: printReceiptChecked ? '#0284c7' : '#cbd5e1',
                      borderRadius: '20px',
                      transition: '0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: '""',
                        height: '14px',
                        width: '14px',
                        left: printReceiptChecked ? '18px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: '0.2s',
                      }}
                    />
                  </span>
                </label>
                <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>In phiếu thu</span>
              </div>
            </div>
          </div>

          {/* KHỐI 3: [ĐẶC TRƯNG NGHIỆP VỤ KẾ TOÁN] HẠCH TOÁN ĐỊNH KHOẢN KÉP VAS / TT200 */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={14} style={{ color: '#0284c7' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. ĐỊNH KHOẢN KẾ TOÁN (VAS / TT200)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Tài khoản Nợ */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#0369a1', marginBottom: '3px' }}>
                  Tài khoản Nợ (Debit) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={paymentDebitAccount}
                  onChange={(e) => setPaymentDebitAccount(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    fontSize: '0.7813rem',
                    fontWeight: 700,
                    color: '#0369a1',
                    borderRadius: '6px',
                    border: '1px solid #7dd3fc',
                    backgroundColor: '#ffffff',
                    padding: '0 8px',
                  }}
                >
                  <option value="1121">1121 - Tiền gửi ngân hàng (VND)</option>
                  <option value="1111">1111 - Tiền mặt tại quỹ (VND)</option>
                  <option value="331">331 - Bù trừ phải trả người bán</option>
                  <option value="1388">1388 - Phải thu khác</option>
                </select>
              </div>

              {/* Tài khoản Có */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#0369a1', marginBottom: '3px' }}>
                  Tài khoản Có (Credit) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div
                  style={{
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #7dd3fc',
                    borderRadius: '6px',
                    fontSize: '0.7813rem',
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  131 - Phải thu khách hàng
                </div>
              </div>
            </div>

            {/* Bút toán tóm tắt */}
            <div
              style={{
                fontSize: '0.7188rem',
                backgroundColor: '#ffffff',
                padding: '6px 10px',
                borderRadius: '5px',
                border: '1px dashed #7dd3fc',
                color: '#0369a1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                <strong>Bút toán:</strong> Nợ TK {paymentDebitAccount} / Có TK {paymentCreditAccount}
              </span>
              <span style={{ fontWeight: 800, color: '#059669' }}>
                {formatNumberGroup(paymentAmountInput)}đ
              </span>
            </div>
          </div>

          {/* KHỐI 4: THÔNG TIN THỤ HƯỞNG & GIAO DỊCH NGÂN HÀNG (KHI CHUYỂN KHOẢN) */}
          {(paymentMethod === 'Chuyển khoản' || paymentDebitAccount === '1121') && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bank size={14} style={{ color: '#4f46e5' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. TÀI KHOẢN THỤ HƯỞNG & GIAO DỊCH NGÂN HÀNG
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Tài khoản Seajong tiếp nhận tiền
                </label>
                <select
                  className="form-select"
                  value={paymentBankAccount}
                  onChange={(e) => setPaymentBankAccount(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 8px',
                    backgroundColor: '#ffffff',
                    fontWeight: 600,
                  }}
                >
                  <option value="Vietcombank - 0011004123456 - CN Thăng Long">
                    Vietcombank - 0011004123456 - CN Thăng Long (VND)
                  </option>
                  <option value="BIDV - 12010000898866 - Sở Giao Dịch 1">
                    BIDV - 12010000898866 - Sở Giao Dịch 1 (VND)
                  </option>
                  <option value="Techcombank - 19036789012015 - CN Đông Đô">
                    Techcombank - 19036789012015 - CN Đông Đô (VND)
                  </option>
                  <option value="MB Bank - 0880199998888 - CN Hà Nội">
                    MB Bank - 0880199998888 - CN Hà Nội (VND)
                  </option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Số giao dịch / Mã tham chiếu UNC / Giấy báo Có
                </label>
                <Input
                  type="text"
                  value={paymentBankRef}
                  onChange={(e) => setPaymentBankRef(e.target.value)}
                  placeholder="Ví dụ: FT2610278891 hoặc số UNC..."
                  style={{ marginBottom: 0, fontSize: '0.75rem' }}
                />
              </div>
            </div>
          )}

          {/* KHỐI 5: THÔNG TIN NGƯỜI NỘP TIỀN & CHỨNG TỪ PHÁP LÝ */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileEarmarkText size={14} style={{ color: '#0d9488' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. THÔNG TIN NGƯỜI NỘP & CHỨNG TỪ GỐC
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Họ và tên người nộp tiền
                </label>
                <Input
                  type="text"
                  value={paymentPayerName}
                  onChange={(e) => setPaymentPayerName(e.target.value)}
                  placeholder="Tên người nộp / đại diện..."
                  style={{ marginBottom: 0, fontSize: '0.75rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Kế toán lập phiếu phụ trách
                </label>
                <Input
                  type="text"
                  value={paymentAccountantName}
                  onChange={(e) => setPaymentAccountantName(e.target.value)}
                  placeholder="Họ tên kế toán..."
                  style={{ marginBottom: 0, fontSize: '0.75rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                Địa chỉ / Đơn vị người nộp tiền
              </label>
              <Input
                type="text"
                value={paymentPayerAddress}
                onChange={(e) => setPaymentPayerAddress(e.target.value)}
                placeholder="Địa chỉ / Đơn vị..."
                style={{ marginBottom: 0, fontSize: '0.75rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                Chứng từ gốc kèm theo
              </label>
              <Input
                type="text"
                value={paymentOriginalDocsCount}
                onChange={(e) => setPaymentOriginalDocsCount(e.target.value)}
                placeholder="Ví dụ: 01 Giấy báo Có ngân hàng..."
                style={{ marginBottom: 0, fontSize: '0.75rem' }}
              />
            </div>
          </div>

          {/* KHỐI 6: DIỄN GIẢI THU TIỀN VÀ ĐƠN HÀNG LIÊN KẾT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Nội dung thu tiền (Diễn giải nghiệp vụ)
              </label>
              <Input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Diễn giải chi tiết lý do nộp tiền..."
                style={{ marginBottom: 0, fontSize: '0.7813rem' }}
              />
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Đơn hàng liên kết: </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{linkedOrderInput}</span>
            </div>
          </div>

          {/* KHỐI 7: LỊCH SỬ THANH TOÁN (LỊCH SỬ THU NỢ ĐỐI TÁC) */}
          {(() => {
            const listHist = customerPaymentHistories[selectedReceivableForPayment.id] || [];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ClockHistory size={14} style={{ color: '#0284c7' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    LỊCH SỬ THANH TOÁN • {listHist.length} LẦN
                  </span>
                </div>

                {listHist.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #e2e8f0' }}>
                    Chưa có lịch sử thanh toán nào cho khách hàng này.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '0 4px' }}>
                      <span>Giao dịch & Định khoản</span>
                      <span>Số tiền</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {listHist.map((hist) => (
                        <div
                          key={hist.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '6px',
                            border: '1px solid #f1f5f9',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
                              {hist.code}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                              {hist.dateTime} • {hist.method}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: '#0369a1', marginTop: '2px', fontWeight: 600 }}>
                              Nợ TK {hist.debitAccount || (hist.method.includes('khoản') ? '1121' : '1111')} / Có TK {hist.creditAccount || '131'}
                              {hist.bankRef ? ` • Ref: ${hist.bankRef}` : ''}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                              {formatNumberGroup(hist.amount)}đ
                            </span>
                            <button
                              type="button"
                              title="Xem và in phiếu thu A4"
                              onClick={() => {
                                const isBankTransfer = hist.method.toLowerCase().includes('khoản') || hist.method.toLowerCase().includes('ngân hàng');
                                setReceiptToPrint({
                                  code: hist.code,
                                  date: hist.dateTime,
                                  customerName: selectedReceivableForPayment.customerName,
                                  payerName: hist.payerName || selectedReceivableForPayment.customerName,
                                  customerAddress: hist.payerAddress || selectedReceivableForPayment.customerAddress || '',
                                  amount: hist.amount,
                                  reason: hist.note || `Thu tiền khách hàng - Phiếu ${hist.code}`,
                                  contractCode: selectedReceivableForPayment.code,
                                  paymentMethod: hist.method,
                                  debitAccount: hist.debitAccount || (isBankTransfer ? '1121' : '1111'),
                                  creditAccount: hist.creditAccount || '131',
                                  notes: [
                                    hist.bankAccount ? `TK: ${hist.bankAccount}` : '',
                                    hist.bankRef ? `Số GD/UNC: ${hist.bankRef}` : '',
                                    hist.originalDocsCount ? `Kèm theo: ${hist.originalDocsCount}` : '',
                                    hist.note,
                                  ].filter(Boolean).join(' | ') || (isBankTransfer ? 'Giấy báo Có ngân hàng' : '01 Chứng từ gốc'),
                                  creator: getLoggedInUserName(user) || 'Phạm Thu Hằng (Kế toán)',
                                  accountant: hist.accountant || 'Trần Bích Thủy (Kế toán trưởng)',
                                  cashier: isBankTransfer ? '' : 'Vũ Thu Trang (Thủ quỹ)',
                                  director: 'Hà Hải Lâm',
                                });
                                setIsPrintReceiptModalOpen(true);
                              }}
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                border: '1px solid #bfdbfe',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              <Printer size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </Offcanvas>
      )}

      {/* ── 5B. OFFCANVAS LẬP PHIẾU CHI THANH TOÁN NHÀ CUNG CẤP (RỘNG 400PX CHUẨN VAS / TT200) ── */}
      {selectedPayableForPayment && (
        <Offcanvas
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPayableForPayment(null);
          }}
          icon={<Receipt size={22} style={{ color: '#0284c7' }} />}
          title="Lập phiếu chi thanh toán nhà cung cấp"
          width="400px"
          position="right"
          bodyStyle={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
          }}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPaymentModalOpen(false);
                  setSelectedPayableForPayment(null);
                }}
                style={{ minWidth: '80px' }}
              >
                Đóng
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmPayablePayment}
                leftIcon={<CheckCircle size={15} />}
                style={{
                  minWidth: '150px',
                  fontWeight: 700,
                  backgroundColor: '#0284c7',
                  borderColor: '#0284c7',
                }}
              >
                Xác nhận chi tiền
              </Button>
            </div>
          }
        >
          {/* KHỐI 1: THÔNG TIN ĐỐI TÁC VÀ CÔNG NỢ */}
          <div style={{ paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                {selectedPayableForPayment.partnerType === 'transporter' || selectedPayableForPayment.code?.startsWith('CNVC')
                  ? 'Đơn vị vận chuyển & Logistics'
                  : 'Nhà cung cấp / Xưởng sản xuất'}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: selectedPayableForPayment.remainingAmount > 0 ? '#fff7ed' : '#f0fdf4',
                  color: selectedPayableForPayment.remainingAmount > 0 ? '#c2410c' : '#15803d',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  border: `1px solid ${selectedPayableForPayment.remainingAmount > 0 ? '#fed7aa' : '#bbf7d0'}`,
                }}
              >
                {selectedPayableForPayment.remainingAmount > 0 ? 'Còn phải trả' : 'Đã tất toán'}
              </span>
            </div>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9375rem', lineHeight: 1.3 }}>
              {selectedPayableForPayment.supplierName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Mã: <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedPayableForPayment.code}</span>
              {selectedPayableForPayment.poCode && <span> • Đơn: {selectedPayableForPayment.poCode}</span>}
              {selectedPayableForPayment.supplierAddress && <span> • {selectedPayableForPayment.supplierAddress}</span>}
            </div>

            {/* 3 ô chỉ số thống kê */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '6px',
                marginTop: '12px',
                padding: '10px 8px',
                backgroundColor: '#fff7ed',
                borderRadius: '8px',
                border: '1px solid #fed7aa',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
                  TỔNG ĐƠN
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {formatNumberGroup(selectedPayableForPayment.totalAmount)}đ
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
                  ĐÃ CHI TRẢ
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  {formatNumberGroup(selectedPayableForPayment.paidAmount)}đ
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
                  CÒN PHẢI TRẢ
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#c2410c', marginTop: '2px' }}>
                  {formatNumberGroup(selectedPayableForPayment.remainingAmount)}đ
                </div>
              </div>
            </div>
          </div>

          {/* KHỐI 2: ĐƠN MUA HÀNG (PO) / VẬN ĐƠN & SỐ TIỀN CHI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircleFill size={14} style={{ color: '#0284c7' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. ĐƠN MUA HÀNG (PO) & SỐ TIỀN CHI
              </span>
            </div>

            {/* Chọn đơn hàng PO / Vận đơn thanh toán áp dụng */}
            {selectedPayableForPayment.entries && selectedPayableForPayment.entries.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Đơn mua hàng / Vận đơn thanh toán <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedPayableEntryId}
                  onChange={(e) => {
                    const eId = e.target.value;
                    setSelectedPayableEntryId(eId);
                    if (!eId) {
                      setPaymentAmountInput(String(selectedPayableForPayment.remainingAmount));
                      setPaymentNote(`Thanh toán công nợ tổng cho ${selectedPayableForPayment.supplierName}`);
                    } else {
                      const found = selectedPayableForPayment.entries?.find((s) => s.id === eId);
                      if (found) {
                        const remAmt = found.remainingAmount !== undefined ? found.remainingAmount : (found.totalAmount - (found.paidAmount || 0));
                        setPaymentAmountInput(String(remAmt));
                        setPaymentNote(`Thanh toán tiền hàng PO ${found.code} - ${found.title}`);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '38px',
                    fontSize: '0.7813rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 8px',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">-- Toàn bộ công nợ nhà cung cấp (Tổng nợ) --</option>
                  {selectedPayableForPayment.entries
                    .filter((s) => {
                      if (s.code?.startsWith('PC-') || s.code?.startsWith('PT-')) return false;
                      const rem = s.remainingAmount !== undefined ? s.remainingAmount : (s.totalAmount - (s.paidAmount || 0));
                      return rem > 0;
                    })
                    .map((s) => {
                      const cleanTitle = s.title.replace(/\s*\([^)]*\)/g, '').trim();
                      const rem = s.remainingAmount !== undefined ? s.remainingAmount : (s.totalAmount - (s.paidAmount || 0));
                      return (
                        <option key={s.id} value={s.id}>
                          {s.code}: {cleanTitle} (Nợ: {formatNumberGroup(rem)}đ)
                        </option>
                      );
                    })}
                </select>
              </div>
            )}

            {/* Số tiền chi VND */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                  Số tiền chi trả VND <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const maxRem = selectedPayableEntryId
                        ? (() => {
                            const found = selectedPayableForPayment.entries?.find((s) => s.id === selectedPayableEntryId);
                            return found ? (found.remainingAmount !== undefined ? found.remainingAmount : found.totalAmount - (found.paidAmount || 0)) : selectedPayableForPayment.remainingAmount;
                          })()
                        : selectedPayableForPayment.remainingAmount;
                      setPaymentAmountInput(String(maxRem));
                    }}
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#eff6ff',
                      color: '#0284c7',
                      border: '1px solid #bfdbfe',
                      cursor: 'pointer',
                    }}
                  >
                    Chi hết nợ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const maxRem = selectedPayableEntryId
                        ? (() => {
                            const found = selectedPayableForPayment.entries?.find((s) => s.id === selectedPayableEntryId);
                            return found ? (found.remainingAmount !== undefined ? found.remainingAmount : found.totalAmount - (found.paidAmount || 0)) : selectedPayableForPayment.remainingAmount;
                          })()
                        : selectedPayableForPayment.remainingAmount;
                      setPaymentAmountInput(String(Math.round(maxRem / 2)));
                    }}
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                  >
                    Tạm ứng 50%
                  </button>
                </div>
              </div>
              <Input
                type="text"
                value={formatNumberGroup(paymentAmountInput)}
                onChange={(e) => setPaymentAmountInput(e.target.value.replace(/\D/g, ''))}
                rightIcon={<span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>đ</span>}
                style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}
              />
              <div style={{ fontSize: '0.7188rem', color: '#64748b', fontStyle: 'italic', marginTop: '4px', lineHeight: 1.3 }}>
                Bằng chữ: {convertNumberToVietnameseWords(Number(paymentAmountInput) || 0)}
              </div>
            </div>

            {/* Ngày chi và Số phiếu chi / UNC */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Ngày hạch toán / chi tiền
                </label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type="text"
                    value={payablePaymentDate}
                    onChange={(e) => setPayablePaymentDate(e.target.value)}
                    style={{ marginBottom: 0, fontSize: '0.7813rem', paddingRight: '28px' }}
                  />
                  <Calendar3 size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Số phiếu chi (Mã chứng từ)
                </label>
                <Input
                  type="text"
                  value={payableVoucherCode}
                  onChange={(e) => setPayableVoucherCode(e.target.value)}
                  style={{ marginBottom: 0, fontSize: '0.7813rem' }}
                />
              </div>
            </div>

            {/* Phương thức thanh toán và In phiếu chi */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Phương thức thanh toán
                </label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => {
                    const method = e.target.value;
                    setPaymentMethod(method);
                    if (method === 'Tiền mặt') {
                      setPayableCreditAccount('1111');
                      setPayableOriginalDocsCount('01 Phiếu chi kiêm BB bàn giao tiền mặt');
                    } else if (method === 'Chuyển khoản') {
                      setPayableCreditAccount('1121');
                      setPayableOriginalDocsCount('01 Giấy báo Nợ ngân hàng & 01 Lệnh UNC');
                    } else if (method === 'Bù trừ công nợ') {
                      setPayableCreditAccount('131');
                      setPayableOriginalDocsCount('01 Biên bản đối trừ công nợ 2 bên');
                    } else if (method === 'Thẻ tín dụng doanh nghiệp') {
                      setPayableCreditAccount('3411');
                      setPayableOriginalDocsCount('01 Hóa đơn POS & Sao kê thẻ');
                    }
                  }}
                  style={{ width: '100%', height: '36px', fontSize: '0.7813rem', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px' }}
                >
                  <option value="Chuyển khoản">Chuyển khoản ngân hàng (TK 1121)</option>
                  <option value="Tiền mặt">Tiền mặt tại quỹ (TK 1111)</option>
                  <option value="Thẻ tín dụng doanh nghiệp">Thẻ tín dụng doanh nghiệp</option>
                  <option value="Bù trừ công nợ">Bù trừ công nợ đối ứng (TK 131)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                <label
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '36px',
                    height: '20px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isPrintPayableVoucherChecked}
                    onChange={(e) => setIsPrintPayableVoucherChecked(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: isPrintPayableVoucherChecked ? '#0284c7' : '#cbd5e1',
                      borderRadius: '20px',
                      transition: '0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: '""',
                        height: '14px',
                        width: '14px',
                        left: isPrintPayableVoucherChecked ? '18px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: '0.2s',
                      }}
                    />
                  </span>
                </label>
                <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>In phiếu chi A4</span>
              </div>
            </div>
          </div>

          {/* KHỐI 3: [ĐẶC TRƯNG NGHIỆP VỤ KẾ TOÁN] HẠCH TOÁN ĐỊNH KHOẢN KÉP VAS / TT200 */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={14} style={{ color: '#0284c7' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. ĐỊNH KHOẢN KẾ TOÁN (VAS / TT200)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Tài khoản Nợ */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#0369a1', marginBottom: '3px' }}>
                  Tài khoản Nợ (Debit) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={payableDebitAccount}
                  onChange={(e) => setPayableDebitAccount(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    fontSize: '0.7813rem',
                    fontWeight: 700,
                    color: '#0369a1',
                    borderRadius: '6px',
                    border: '1px solid #7dd3fc',
                    backgroundColor: '#ffffff',
                    padding: '0 8px',
                  }}
                >
                  <option value="331">331 - Phải trả người bán (Chung)</option>
                  <option value="3311">3311 - Phải trả NCC nguyên vật liệu sen vòi</option>
                  <option value="3312">3312 - Phải trả đơn vị vận tải, logistics</option>
                  <option value="3388">3388 - Phải trả khác</option>
                </select>
              </div>

              {/* Tài khoản Có */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#0369a1', marginBottom: '3px' }}>
                  Tài khoản Có (Credit) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={payableCreditAccount}
                  onChange={(e) => setPayableCreditAccount(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    fontSize: '0.7813rem',
                    fontWeight: 700,
                    color: '#0369a1',
                    borderRadius: '6px',
                    border: '1px solid #7dd3fc',
                    backgroundColor: '#ffffff',
                    padding: '0 8px',
                  }}
                >
                  <option value="1121">1121 - Tiền gửi ngân hàng (VND)</option>
                  <option value="1111">1111 - Tiền mặt tại quỹ (VND)</option>
                  <option value="131">131 - Bù trừ phải thu khách hàng</option>
                  <option value="3411">3411 - Vay ngắn hạn (Thẻ tín dụng DN)</option>
                </select>
              </div>
            </div>
          </div>

          {/* KHỐI 4: THÔNG TIN TÀI KHOẢN NGÂN HÀNG & ỦY NHIỆM CHI (UNC) */}
          {paymentMethod === 'Chuyển khoản' && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bank size={14} style={{ color: '#0284c7' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. LỆNH CHUYỂN TIỀN & TÀI KHOẢN NGÂN HÀNG
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  Tài khoản nguồn trích tiền (Công ty Seajong chi)
                </label>
                <select
                  className="form-select"
                  value={payableSourceBank}
                  onChange={(e) => setPayableSourceBank(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    fontSize: '0.7813rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 8px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {dbCashAssets.length > 0 ? (
                    dbCashAssets.map((acc) => (
                      <option key={acc.id} value={`${acc.bankName} - ${acc.accountNumber}`}>
                        {acc.bankName} - {acc.accountNumber} ({acc.name})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Vietcombank - 0011004329999 (Seajong VN)">Vietcombank - 0011004329999 (Công ty CP Seajong Việt Nam)</option>
                      <option value="BIDV - 124100038888 (Seajong VN)">BIDV - 124100038888 (Công ty CP Seajong Việt Nam)</option>
                      <option value="Techcombank - 1903567890123 (Seajong VN)">Techcombank - 1903567890123 (Công ty CP Seajong Việt Nam)</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                    Ngân hàng thụ hưởng (NCC)
                  </label>
                  <Input
                    type="text"
                    value={payableDestBank}
                    onChange={(e) => setPayableDestBank(e.target.value)}
                    placeholder="VD: Vietcombank, BIDV, ICBC..."
                    style={{ marginBottom: 0, fontSize: '0.7813rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                    Số tài khoản thụ hưởng
                  </label>
                  <Input
                    type="text"
                    value={payableDestAccount}
                    onChange={(e) => setPayableDestAccount(e.target.value)}
                    placeholder="Số TK ngân hàng NCC"
                    style={{ marginBottom: 0, fontSize: '0.7813rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* KHỐI 5: CHỨNG TỪ PHÁP LÝ & KÝ DUYỆT PHIẾU CHI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileEarmarkCheck size={14} style={{ color: '#0284c7' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. CHỨNG TỪ PHÁP LÝ & KÝ DUYỆT
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  Người nhận tiền / Đại diện NCC
                </label>
                <Input
                  type="text"
                  value={payableReceiverName}
                  onChange={(e) => setPayableReceiverName(e.target.value)}
                  placeholder="Họ tên người nhận"
                  style={{ marginBottom: 0, fontSize: '0.7813rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  Địa chỉ / Đơn vị nhận tiền
                </label>
                <Input
                  type="text"
                  value={payableReceiverAddress}
                  onChange={(e) => setPayableReceiverAddress(e.target.value)}
                  placeholder="Địa chỉ nhà xưởng/công ty"
                  style={{ marginBottom: 0, fontSize: '0.7813rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                Nội dung chi / Diễn giải hạch toán
              </label>
              <textarea
                className="form-input"
                rows={2}
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Diễn giải chi tiết lý do chi tiền..."
                style={{ width: '100%', resize: 'none', fontSize: '0.7813rem', padding: '6px 8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                Kèm theo chứng từ gốc
              </label>
              <Input
                type="text"
                value={payableOriginalDocsCount}
                onChange={(e) => setPayableOriginalDocsCount(e.target.value)}
                placeholder="01 Giấy báo Nợ ngân hàng / UNC & 01 Hóa đơn GTGT"
                style={{ marginBottom: 0, fontSize: '0.7813rem' }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '8px 10px',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '0.6875rem',
                color: '#64748b',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: '#334155' }}>Người lập phiếu:</span> {currentLoggedInUserName || 'Phạm Thu Hằng'}
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#334155' }}>Kế toán trưởng:</span> Mai Thị Ngọc
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#334155' }}>Giám đốc duyệt:</span> Hà Hải Lâm
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#334155' }}>Thủ quỹ / Chi tiền:</span> {paymentMethod === 'Tiền mặt' ? 'Vũ Thu Trang' : 'Ngân hàng điện tử'}
              </div>
            </div>
          </div>
        </Offcanvas>
      )}

      {/* ── 6. MODAL ĐỐI CHIẾU CÔNG NỢ CAO CẤP TỪ CLIENT-SEAJONG (BƯỚC 1 VÀ BƯỚC 2) ── */}
      {(selectedReceivableForReconcile || selectedPayableForReconcile) && (
        <DebtReconciliationModal
          open={reconcileModalOpen}
          onClose={() => {
            setReconcileModalOpen(false);
            setSelectedReceivableForReconcile(null);
            setSelectedPayableForReconcile(null);
          }}
          debt={reconcileDebt}
          onShowToast={onShowToast}
          onSuccess={() => {
            setReconcileModalOpen(false);
            setSelectedReceivableForReconcile(null);
            setSelectedPayableForReconcile(null);
          }}
        />
      )}

      {/* ── OFFCANVAS CHI TIẾT KHOẢN NỢ DANH MỤC CON RỘNG 400PX ── */}
      <Offcanvas
        isOpen={subEntryDetailOpen}
        onClose={() => {
          setSubEntryDetailOpen(false);
          setSelectedSubEntry(null);
        }}
        title="Chi tiết khoản nợ"
        description={selectedSubEntry ? `Phiếu phát sinh mã ${selectedSubEntry.entry.code}` : 'Thông tin chi tiết khoản nợ'}
        width="400px"
        position="right"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSubEntryDetailOpen(false);
                setSelectedSubEntry(null);
              }}
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant={((selectedSubEntry?.entry?.remainingAmount !== undefined ? selectedSubEntry.entry.remainingAmount : ((selectedSubEntry?.entry?.contractValue || selectedSubEntry?.entry?.totalAmount || 0) - (selectedSubEntry?.entry?.paidAmount || 0))) <= 0) ? 'secondary' : 'primary'}
              disabled={(selectedSubEntry?.entry?.remainingAmount !== undefined ? selectedSubEntry.entry.remainingAmount : ((selectedSubEntry?.entry?.contractValue || selectedSubEntry?.entry?.totalAmount || 0) - (selectedSubEntry?.entry?.paidAmount || 0))) <= 0}
              onClick={() => {
                const sub = selectedSubEntry;
                setSubEntryDetailOpen(false);
                setSelectedSubEntry(null);
                if (sub?.type === 'receivable' && sub.parent) {
                  handleOpenPaymentModal(sub.parent, sub.entry);
                } else {
                  if (onShowToast) {
                    onShowToast('success', 'Xác nhận thanh toán', `Đã xác nhận thanh toán khoản nợ ${sub?.entry?.code || ''} thành công`);
                  }
                }
              }}
              leftIcon={<CheckCircle size={14} />}
              style={{ fontWeight: 700 }}
            >
              {((selectedSubEntry?.entry?.remainingAmount !== undefined ? selectedSubEntry.entry.remainingAmount : ((selectedSubEntry?.entry?.contractValue || selectedSubEntry?.entry?.totalAmount || 0) - (selectedSubEntry?.entry?.paidAmount || 0))) <= 0) ? 'Đã thu đủ' : 'Xác nhận thanh toán'}
            </Button>
          </div>
        }
      >
        {selectedSubEntry && (() => {
          const isRec = selectedSubEntry.type === 'receivable';
          const entry = selectedSubEntry.entry;
          const parent = selectedSubEntry.parent;
          const origAmount = isRec ? entry.contractValue : entry.totalAmount;
          const partnerTitle = isRec ? 'Khách hàng đối tác' : 'Nhà cung cấp';
          const partnerName = isRec ? parent.customerName : parent.supplierName;
          const partnerAddress = isRec ? parent.customerAddress : parent.supplierAddress;
          const docParentCode = isRec ? `Hợp đồng số ${parent.code}` : `Đơn mua hàng PO ${parent.poCode}`;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8125rem' }}>
              {/* Thẻ hiển thị số tiền còn lại nổi bật */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: entry.remainingAmount > 0 ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${entry.remainingAmount > 0 ? '#fecaca' : '#bbf7d0'}`,
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: entry.remainingAmount > 0 ? '#991b1b' : '#166534' }}>
                  {isRec ? 'Số tiền còn phải thu' : 'Số tiền còn phải trả'}
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: entry.remainingAmount > 0 ? '#dc2626' : '#16a34a',
                    marginTop: '2px',
                  }}
                >
                  {formatNumberGroup(entry.remainingAmount)} đ
                </div>

                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px dashed ${entry.remainingAmount > 0 ? '#fca5a5' : '#86efac'}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Số tiền gốc</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                      {formatNumberGroup(origAmount)} đ
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Đã thanh toán</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669' }}>
                      {formatNumberGroup(entry.paidAmount)} đ
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin chứng từ phát sinh */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  Thông tin khoản nợ
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Mã phiếu phát sinh:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{entry.code}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Thời gian lập phiếu:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {entry.time || '08:30'} • Ngày {entry.date}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Hạn thanh toán:</span>
                  <span style={{ fontWeight: 700, color: '#b91c1c' }}>{entry.dueDate}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Trạng thái:</span>
                  {renderStatusBadge(entry.status, entry.statusLabel)}
                </div>
              </div>

              {/* Nội dung diễn giải */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>
                  Nội dung chi tiết
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: '1.45', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  {entry.title}
                </div>
              </div>

              {/* Thông tin đối tác liên quan */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  {partnerTitle}
                </div>

                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.875rem',
                      color: isRec ? '#0284c7' : '#b91c1c',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {partnerName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                    {partnerAddress}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#475569', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                  Căn cứ theo: <strong>{docParentCode}</strong>
                </div>
              </div>

              {/* Lịch sử các phiếu thu của đợt thanh toán này */}
              {entry.payments && entry.payments.length > 0 && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Phiếu thu của đợt này</span>
                    <Badge variant="brand">{entry.payments.length} phiếu</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {entry.payments.map((p: any, idx: number) => (
                      <div key={p.id || idx} style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#0369a1' }}>{p.code || p.receiptCode}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#059669' }}>+{formatNumberGroup(p.amount)} đ</span>
                            <button
                              type="button"
                              title="Xem và in phiếu thu A4"
                              onClick={() => {
                                const isBankTransfer = (p.method || '').toLowerCase().includes('khoản') || (p.method || '').toLowerCase().includes('ngân hàng');
                                setReceiptToPrint({
                                  code: p.code || p.receiptCode || 'PT-20261004',
                                  date: p.date || '23/10/2026',
                                  customerName: parent.customerName || (parent as any).supplierName,
                                  customerAddress: parent.customerAddress || '',
                                  amount: p.amount,
                                  reason: p.title || p.note || `Thu tiền khách hàng - ${entry.title}`,
                                  contractCode: parent.code,
                                  stageTitle: entry.title,
                                  paymentMethod: p.method || 'Chuyển khoản',
                                  debitAccount: isBankTransfer ? '1121' : '1111',
                                  creditAccount: '131',
                                  notes: isBankTransfer ? 'Giấy báo Có ngân hàng' : '01 Chứng từ gốc',
                                  creator: getLoggedInUserName(user) || 'Nguyễn Thị Tuyết',
                                  accountant: 'Mai Thị Ngọc',
                                  cashier: '',
                                  director: 'Hà Hải Lâm',
                                });
                                setIsPrintReceiptModalOpen(true);
                              }}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                border: '1px solid #bfdbfe',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              <Printer size={11} />
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                          {p.time || '08:30'} • {p.date} • {p.method || 'Chuyển khoản'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Offcanvas>

      {/* ── 7. OFFCANVAS QUẢN LÝ KHẾ ƯỚC NHẬN NỢ (DRAWDOWN / KUNN) RỘNG 400PX ── */}
      <Offcanvas
        isOpen={isDrawdownModalOpen}
        onClose={() => setIsDrawdownModalOpen(false)}
        icon={<Receipt size={22} style={{ color: '#0284c7' }} />}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>Khế ước nhận nợ (KUNN)</span>
            {selectedLoanForDrawdown?.contractCode && (
              <Badge variant="brand">{selectedLoanForDrawdown.contractCode}</Badge>
            )}
          </div>
        }
        description={
          <div>
            <strong>{selectedLoanForDrawdown?.bankName}</strong> • {selectedLoanForDrawdown?.facilityLabel}
          </div>
        }
        width="400px"
        position="right"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: '0.7813rem', color: '#64748b' }}>
              Tổng số khế ước: <strong>{drawdowns.length}</strong>
            </div>
            <Button type="button" variant="secondary" onClick={() => setIsDrawdownModalOpen(false)}>
              Đóng
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card tóm tắt hạn mức */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              backgroundColor: '#f8fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Hạn mức cấp
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', wordBreak: 'break-all' }}>
                {formatNumberGroup(selectedLoanForDrawdown?.loanLimit)} đ
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Dư nợ hiện tại
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  color: (selectedLoanForDrawdown?.remainingPrincipal || 0) > 0 ? '#dc2626' : '#059669',
                  marginTop: '2px',
                  wordBreak: 'break-all',
                }}
              >
                {formatNumberGroup(selectedLoanForDrawdown?.remainingPrincipal)} đ
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Đã trả nợ gốc
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#059669', marginTop: '2px', wordBreak: 'break-all' }}>
                {formatNumberGroup(selectedLoanForDrawdown?.paidPrincipal)} đ
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Khả dụng rút vốn
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0284c7', marginTop: '2px', wordBreak: 'break-all' }}>
                {formatNumberGroup(
                  Math.max(0, (selectedLoanForDrawdown?.loanLimit || 0) - (selectedLoanForDrawdown?.remainingPrincipal || 0))
                )}{' '}
                đ
              </div>
            </div>
          </div>

          {/* Thanh công cụ danh sách khế ước */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Danh sách các lần rút vốn
            </span>
            <Button
              type="button"
              variant={isAddingDrawdown ? 'secondary' : 'primary'}
              leftIcon={isAddingDrawdown ? undefined : <Plus size={15} />}
              onClick={() => setIsAddingDrawdown((p) => !p)}
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
            >
              {isAddingDrawdown ? 'Đóng form' : '+ Rút vốn / Thêm KUNN'}
            </Button>
          </div>

          {/* Form thêm mới khế ước rút vốn */}
          {isAddingDrawdown && (
            <div
              style={{
                backgroundColor: '#eff6ff',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.8125rem', borderBottom: '1px solid #dbeafe', paddingBottom: '6px' }}>
                Thông tin khế ước nhận nợ (rút vốn từ hạn mức)
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
                  Số KUNN:
                </label>
                <Input
                  type="text"
                  value={ddCode}
                  onChange={(e) => setDdCode(e.target.value)}
                  placeholder="VD: KUNN-01"
                  style={{ marginBottom: 0, backgroundColor: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
                    Ngày giải ngân:
                  </label>
                  <Input
                    type="text"
                    value={ddDate}
                    onChange={(e) => setDdDate(e.target.value)}
                    placeholder="dd/mm/yyyy"
                    style={{ marginBottom: 0, backgroundColor: '#ffffff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
                    Ngày đáo hạn:
                  </label>
                  <Input
                    type="text"
                    value={ddMaturity}
                    onChange={(e) => setDdMaturity(e.target.value)}
                    placeholder="dd/mm/yyyy"
                    style={{ marginBottom: 0, backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
                    Số tiền rút vốn (VNĐ):
                  </label>
                  <Input
                    type="text"
                    value={formatNumberGroup(ddAmount)}
                    onChange={(e) => setDdAmount(e.target.value.replace(/\D/g, ''))}
                    rightIcon={<span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>đ</span>}
                    style={{ marginBottom: 0, backgroundColor: '#ffffff', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
                    Lãi suất (%/năm):
                  </label>
                  <Input
                    type="text"
                    value={ddRate}
                    onChange={(e) => setDdRate(e.target.value)}
                    rightIcon={<span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>%</span>}
                    style={{ marginBottom: 0, backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
                  Mục đích sử dụng tiền rút vốn:
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Mua lô nguyên vật liệu gỗ MDF..."
                  value={ddPurpose}
                  onChange={(e) => setDdPurpose(e.target.value)}
                  style={{ marginBottom: 0, backgroundColor: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <Button type="button" variant="secondary" onClick={() => setIsAddingDrawdown(false)} style={{ fontSize: '0.75rem' }}>
                  Huỷ
                </Button>
                <Button type="button" variant="primary" onClick={handleSaveDrawdown} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Xác nhận rút vốn
                </Button>
              </div>
            </div>
          )}

          {/* Danh sách Khế ước nhận nợ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isLoadingDrawdowns ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                Đang tải danh sách khế ước nhận nợ...
              </div>
            ) : drawdowns.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  fontSize: '0.8125rem',
                }}
              >
                Chưa có khế ước nhận nợ nào được tạo cho hợp đồng này.
              </div>
            ) : (
              drawdowns.map((d) => (
                <div
                  key={d.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#0369a1', fontSize: '0.875rem' }}>{d.drawdownCode}</span>
                        <Badge variant="brand">{d.interestRate}%/năm</Badge>
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                        Giải ngân: {d.drawdownDate} • Hạn: <strong>{d.maturityDate}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      title="Xóa khế ước này"
                      onClick={() => handleDeleteDrawdown(d.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <Trash3 size={14} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      backgroundColor: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.6875rem' }}>Số tiền rút</span>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>
                        {formatNumberGroup(d.amount)} đ
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.6875rem' }}>Dư nợ gốc</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: d.remainingPrincipal > 0 ? '#dc2626' : '#059669',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {formatNumberGroup(d.remainingPrincipal)} đ
                      </span>
                    </div>
                  </div>

                  {d.purpose && (
                    <div style={{ fontSize: '0.7188rem', color: '#475569', lineHeight: 1.4 }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Mục đích: </span>
                      {d.purpose}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Offcanvas>

      {/* ── 8. MODAL CHI TIẾT BẢNG PHÂN BỔ TRÍCH KHẤU HAO TÀI SẢN CỐ ĐỊNH ── */}
      <Modal
        isOpen={isDeprecModalOpen}
        onClose={() => setIsDeprecModalOpen(false)}
        headerIcon={<DatabaseCheck size={24} style={{ color: '#7c3aed' }} />}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Bảng phân bổ trích khấu hao tài sản cố định</span>
            <Badge variant="brand" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', borderColor: '#d8b4fe' }}>
              {selectedDeprecItem?.code || 'KH-TSCĐ'}
            </Badge>
          </div>
        }
        description={
          <div>
            Định kỳ hàng tháng theo chuẩn Thông tư 200/2014/TT-BTC • <strong>Chi phí phi tiền mặt (non-cash)</strong>
          </div>
        }
        maxWidth="840px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: '0.7813rem', color: '#64748b' }}>
              Tổng trích khấu hao: <strong style={{ color: '#7e22ce' }}>{formatNumberGroup(selectedDeprecItem?.amount || 119583333)} đ / tháng</strong>
            </div>
            <Button type="button" variant="secondary" onClick={() => setIsDeprecModalOpen(false)}>
              Đóng
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card tổng hợp 3 nhóm hạch toán */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534' }}>1. Chi phí sản xuất chung (TK 627)</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                {formatNumberGroup(fixedAssetDepreciationMonthly.prod)} đ
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Máy CNC, dàn sơn, trạm biến áp, máy nén khí
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af' }}>2. Chi phí bán hàng (TK 641)</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
                {formatNumberGroup(fixedAssetDepreciationMonthly.sales)} đ
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Xe tải vận chuyển chuyên dụng, xe nâng hàng
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b21a8' }}>3. Chi phí quản lý DN (TK 642)</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#7e22ce', marginTop: '4px' }}>
                {formatNumberGroup(fixedAssetDepreciationMonthly.admin)} đ
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Phần mềm ERP, bản quyền sở hữu công nghiệp
              </div>
            </div>
          </div>

          {/* Bảng chi tiết 12 tài sản cố định */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>
              Danh sách chi tiết phân bổ khấu hao từng tài sản trong CSDL (bảng fixed_assets)
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Mã TS</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Tên tài sản cố định</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>Nguyên giá</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>TG (tháng)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>Trích tháng này</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>TK Hạch toán</th>
                  </tr>
                </thead>
                <tbody>
                  {(dbFixedAssets || []).length > 0 ? (
                    (dbFixedAssets as any[]).map((asset) => {
                      const orig = Number(asset.originalPrice) || 0;
                      const months = Number(asset.depreciationMonths) || 60;
                      const monthly = months > 0 ? Math.round(orig / months) : 0;
                      const cat = asset.category || '';
                      const isProd = cat === 'machinery' || cat === 'workshop' || cat === 'measuring';
                      const isSales = cat === 'vehicle';
                      const tkNo = isProd ? '627' : isSales ? '641' : '642';

                      return (
                        <tr key={asset.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#475569' }}>{asset.code}</td>
                          <td style={{ padding: '8px 10px', color: '#1e293b' }}>{asset.name}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                            {formatNumberGroup(orig)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{months}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#7e22ce' }}>
                            {formatNumberGroup(monthly)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <Badge variant={isProd ? 'neutral' : isSales ? 'brand' : 'warning'}>
                              Nợ {tkNo} / Có 2141
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        Đang đồng bộ dữ liệu tài sản từ hệ thống...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ghi chú nguyên tắc kế toán */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#faf5ff',
              borderRadius: '8px',
              border: '1px solid #e9d5ff',
              fontSize: '0.75rem',
              color: '#581c87',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={18} style={{ color: '#7e22ce', flexShrink: 0 }} />
            <span>
              <strong>Nguyên tắc kiểm soát dòng tiền:</strong> Khoản trích này là <strong>chi phí phi tiền mặt (non-cash)</strong> phục vụ tính giá thành sản phẩm và lãi lỗ kế toán, <strong>tuyệt đối không làm giảm số dư tiền mặt hoặc tài khoản ngân hàng</strong> của công ty.
            </span>
          </div>
        </div>
      </Modal>

      {/* ── 9. CONFIRM DIALOG XOÁ KHOẢN NỢ ── */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xoá khoản nợ"
        message="Bạn có chắc chắn muốn xoá khoản nợ này khỏi sổ theo dõi công nợ không? Dữ liệu sau khi xoá sẽ không thể phục hồi."
        confirmText="Xác nhận xoá"
        cancelText="Đóng"
        type="danger"
      />

      {/* ── 10. MODAL XEM TRƯỚC VÀ IN PHIẾU CHI A4 (PRINTPREVIEWMODAL) ── */}
      <PaymentVoucherPrintModal
        isOpen={isPrintVoucherModalOpen}
        onClose={() => setIsPrintVoucherModalOpen(false)}
        voucher={voucherToPrint}
      />

      {/* ── 11. MODAL XEM TRƯỚC VÀ IN PHIẾU THU A4 (PRINTPREVIEW) ── */}
      <ReceiptVoucherPrintModal
        isOpen={isPrintReceiptModalOpen}
        onClose={() => setIsPrintReceiptModalOpen(false)}
        receipt={receiptToPrint}
      />

      {/* ── 12. OFFCANVAS THIẾT LẬP CẤU HÌNH TUỔI NỢ (ĐẾN HẠN, QUÁ HẠN) ── */}
      <DebtAgingConfigOffcanvas
        isOpen={isDebtAgingConfigOpen}
        onClose={() => setIsDebtAgingConfigOpen(false)}
        config={debtAgingConfig}
        step={currentStep}
        onSave={(newCfg) => {
          setDebtAgingConfig(newCfg);
          fetchReceivables(newCfg);
        }}
        onShowToast={onShowToast}
      />

      {/* ── 13. MODAL LẬP VÀ IN BÁO CÁO CÔNG NỢ, NỢ VAY VÀ CHI PHÍ (PRINTPREVIEW) ── */}
      <DebtCostReportPrintModal
        isOpen={isReportPrintModalOpen}
        onClose={() => setIsReportPrintModalOpen(false)}
        currentStep={currentStep}
        receivables={receivables}
        payables={payables}
        loans={loans}
        expenses={expenses}
        selectedYear={selectedYear}
        fixedAssetDepreciationMonthly={fixedAssetDepreciationMonthly}
        dbFixedAssets={dbFixedAssets}
      />
    </div>
  );
};
