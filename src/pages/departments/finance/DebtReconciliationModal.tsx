import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FileEarmarkCheck,
  Printer,
  X,
  Calendar2Week,
  PlusLg,
  DashLg,
  Wallet2,
  ListTask,
  ClockHistory,
  Folder2Open,
  ChevronDown,
  ChevronRight,
  FileText,
  Building,
  PersonCheck,
} from 'react-bootstrap-icons';
import { Pagination } from '../../../components/common/Pagination';
import { ReceiptVoucherPrintModal, type ReceiptVoucherData } from './ReceiptVoucherPrintModal';
import { PaymentVoucherPrintModal } from './PaymentVoucherPrintModal';
import { PrintPreview } from '../../../components/common/PrintPreview';
import { useCompanyInfo } from '../../../hooks/useCompanyInfo';
import { Input } from '../../../components/common/Input';

// ─── CHUẨN HÓA THỜI GIAN SANG ISO CHUẨN ────────────────────────────────
export function parseToIsoDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return new Date().toISOString();

  let d = String(dateStr).trim();
  let t = timeStr ? String(timeStr).trim() : '';

  // Case: ISO có T
  if (d.includes('T')) {
    const parts = d.split('T');
    d = parts[0];
    if (!t && parts[1]) t = parts[1];
  } else if (d.includes(' ')) {
    const parts = d.split(/\s+/);
    if (parts.length >= 2) {
      if (parts[0].includes(':')) {
        t = parts[0];
        d = parts[1];
      } else {
        d = parts[0];
        t = parts[1];
      }
    }
  }

  // Phân tích ngày tháng năm
  let yyyy = '';
  let mm = '';
  let dd = '';

  const sep = d.includes('/') ? '/' : d.includes('-') ? '-' : '';
  if (sep) {
    const parts = d.split(sep);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        yyyy = parts[0];
        mm = parts[1].padStart(2, '0');
        dd = parts[2].padStart(2, '0');
      } else {
        // DD/MM/YYYY
        dd = parts[0].padStart(2, '0');
        mm = parts[1].padStart(2, '0');
        yyyy = parts[2];
      }
    }
  }

  if (!yyyy || !mm || !dd) {
    const now = new Date();
    yyyy = String(now.getFullYear());
    mm = String(now.getMonth() + 1).padStart(2, '0');
    dd = String(now.getDate()).padStart(2, '0');
  }

  // Phân tích giờ phút giây
  let hh = '08';
  let min = '30';
  let ss = '00';

  if (t) {
    const tClean = t.replace(/[^\d:]/g, '');
    const tParts = tClean.split(':');
    if (tParts[0]) hh = tParts[0].padStart(2, '0');
    if (tParts[1]) min = tParts[1].padStart(2, '0');
    if (tParts[2]) ss = tParts[2].padStart(2, '0');
  }

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
}

// ─── LOẠI BỎ CÁC NỘI DUNG TRONG NGOẶC (..) ─────────────────────────────
export function stripParentheses(text?: string): string {
  if (!text) return '';
  return text.replace(/\s*\([^)]*\)/g, '').trim();
}

// ─── ĐỌC SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT ─────────────────────────────────
export function docSoTien(soTien: number): string {
  if (!Number.isFinite(soTien) || isNaN(soTien) || soTien <= 0) return 'Không đồng';
  const target = Math.round(Math.abs(soTien));
  if (target === 0) return 'Không đồng';
  const chuSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function docBlock3(n: number, isFirst: boolean): string {
    const tram = Math.floor(n / 100);
    const chuc = Math.floor((n % 100) / 10);
    const dvi = n % 10;
    let res = '';

    if (tram > 0 || !isFirst) {
      res += chuSo[tram] + ' trăm ';
    }

    if (chuc > 1) {
      res += chuSo[chuc] + ' mươi ';
    } else if (chuc === 1) {
      res += 'mười ';
    } else if (chuc === 0 && dvi > 0 && !isFirst) {
      res += 'lẻ ';
    }

    if (dvi > 0) {
      if (dvi === 1 && chuc > 1) {
        res += 'mốt';
      } else if (dvi === 5 && chuc > 0) {
        res += 'lăm';
      } else if (dvi === 5 && chuc === 0) {
        res += 'năm';
      } else {
        res += chuSo[dvi];
      }
    }
    return res.trim();
  }

  const blocks: number[] = [];
  let temp = target;
  while (temp > 0) {
    blocks.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let text = '';
  for (let i = blocks.length - 1; i >= 0; i--) {
    const blockValue = blocks[i];
    if (blockValue > 0) {
      const isFirst = i === blocks.length - 1;
      text += ' ' + docBlock3(blockValue, isFirst) + ' ' + units[i];
    }
  }

  text = text.trim();
  if (text) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    text = text.replace(/\s+/g, ' ');
    return text + ' đồng chẵn.';
  }
  return 'Không đồng';
}

// ─── HÀM IN TÀI LIỆU BẰNG IFRAME ẨN ──────────────────────────────────
export function printDocumentById(documentId: string, orientation: 'portrait' | 'landscape' = 'portrait', title?: string) {
  const docEl = document.getElementById(documentId);
  if (!docEl) {
    window.print();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;';
  document.body.appendChild(iframe);

  const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iDoc) {
    window.print();
    return;
  }

  iDoc.open();
  iDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title ?? 'In tài liệu'}</title>
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: 'Roboto Condensed', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    body {
      margin: 0;
      padding: 15mm 15mm 15mm 20mm;
      color: #0f172a;
    }
    th {
      background-color: #003087 !important;
      color: #fff !important;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    @page {
      size: A4 ${orientation};
      margin: 0;
    }
  </style>
</head>
<body>
  ${docEl.innerHTML}
</body>
</html>`);
  iDoc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print error:', e);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }
  }, 250);
}

// ─── INTERFACES ──────────────────────────────────────────────────────
export interface ReconciliationLog {
  id: string;
  date: string;
  createdAt?: string;
  reconciler: string;
  status: 'MATCHED' | 'DISCREPANCY' | 'UNRECONCILED';
  note: string;
  differenceAmount?: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface DebtReconciliationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  debt: any | null;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  user?: any;
}

const formatCurrency = (val: number) => (Number(val) || 0).toLocaleString('vi-VN');

export const DebtReconciliationModal: React.FC<DebtReconciliationModalProps> = ({
  open,
  onClose,
  debt,
  user: _user,
}) => {
  const company = useCompanyInfo();
  const [mounted, setMounted] = useState(false);
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Trạng thái mở modal PrintPreview in biên bản đối chiếu
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Chế độ xem: 'timeline' (Theo trình tự thời gian) | 'by_stage' (Nhóm các phiếu thu của từng đợt nợ)
  const [viewMode, setViewMode] = useState<'timeline' | 'by_stage'>('timeline');
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});

  const toggleCollapseStage = (stageCode: string) => {
    setCollapsedStages((prev) => ({ ...prev, [stageCode]: !prev[stageCode] }));
  };

  const handleExpandAll = () => setCollapsedStages({});
  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    const entries = Array.isArray(debt?.entries) ? debt.entries : [];
    entries.forEach((e: any) => {
      if (e.code) allCollapsed[e.code] = true;
    });
    setCollapsedStages(allCollapsed);
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);


  // States for viewing vouchers
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<ReceiptVoucherData | null>(null);
  const [receiptPrintOpen, setReceiptPrintOpen] = useState(false);
  const [selectedExpenseForPrint, setSelectedExpenseForPrint] = useState<any | null>(null);
  const [paymentPrintOpen, setPaymentPrintOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const typeUpper = debt?.type?.toUpperCase() || '';
  const isReceivable = debt ? typeUpper === 'RECEIVABLE' || typeUpper === 'PHAI-THU' || typeUpper === 'PHAI_THU' : true;

  // Initialize values ONLY when modal first opens or when debt ID changes
  const prevOpenRef = useRef(false);
  const prevDebtIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const isJustOpened = open && !prevOpenRef.current;
    const isDifferentDebt = Boolean(open && debt && debt.id && debt.id !== prevDebtIdRef.current);

    if (isJustOpened || isDifferentDebt) {
      setStartDate('2026-09-01T00:00:00');
      setEndDate('2026-10-31T23:59:59');
      setCurrentPage(1);
      setIsPrintPreviewOpen(false);
      setCollapsedStages({});
    }

    if (!open && prevOpenRef.current) {
      setIsPrintPreviewOpen(false);
    }

    prevOpenRef.current = open;
    prevDebtIdRef.current = debt?.id;
  }, [open, debt?.id]);

  // Construct ledger transactions from debt and entries
  const transactions = useMemo(() => {
    if (!debt) {
      return {
        timelineTransactions: [] as any[],
        stageGroupedTransactions: [] as any[],
        openingBalanceValue: 0,
      };
    }

    const totalAmount = Number(debt.contractValue || debt.totalAmount || debt.amount || 0);
    const paidAmount = Number(debt.paidAmount || 0);
    const entries = Array.isArray(debt.entries) ? debt.entries : [];

    const timelineList: any[] = [];
    const stageGroupedList: any[] = [];
    let initialBalance = 0;
    let orderSeq = 0;

    if (entries.length > 0) {
      entries.forEach((entry: any, idx: number) => {
        const entryValue = Number(entry.contractValue || entry.totalAmount || 0);
        const entryPaid = Number(entry.paidAmount || 0);
        const entryIsoDate = parseToIsoDateTime(entry.date, entry.time || '08:30');
        const payments = Array.isArray(entry.payments) ? entry.payments : [];

        // ── 1. GIAO DỊCH PHÁT SINH TĂNG (Bán hàng / Cung ứng hàng)
        const stageMainTx = {
          id: `ENTRY_MAIN_${entry.id || idx}`,
          stageId: entry.id || `ent-${idx}`,
          stageCode: entry.code || `${debt.code}-D${idx + 1}`,
          stageTitle: entry.title || `Đợt ${idx + 1}`,
          stageValue: entryValue,
          stagePaid: entryPaid,
          stageRemaining: Math.max(0, entryValue - entryPaid),
          stageStatus: entry.status,
          stageStatusLabel: entry.statusLabel,
          paymentCount: payments.length || (entryPaid > 0 ? 1 : 0),
          isStageMain: true,
          date: entryIsoDate,
          ref: entry.code || debt.code || `CT-${idx + 1}`,
          type: isReceivable ? 'Bán hàng' : 'Mua hàng',
          increase: entryValue,
          decrease: 0,
          note: entry.title || `Hợp đồng đơn hàng đợt ${idx + 1} - ${entry.code || debt.code}`,
          orderIdx: orderSeq++,
          rawEntry: entry,
        };

        timelineList.push(stageMainTx);
        stageGroupedList.push(stageMainTx);

        // ── 2. CÁC PHIẾU THU / CHI PHÁT SINH GIẢM CỦA ĐỢT
        if (payments.length > 0) {
          payments.forEach((p: any, pIdx: number) => {
            const pAmount = Number(p.amount) || 0;
            const pCode = p.code || p.receiptCode || p.paymentCode || (isReceivable ? `PT-${entry.code}` : `UNC-${entry.code}`);
            const pIsoDate = parseToIsoDateTime(p.date || p.dateTime || entry.date, p.time || entry.time || '08:30');
            const payTx = {
              id: `ENTRY_PAY_${entry.id || idx}_${p.id || pIdx}`,
              stageId: entry.id || `ent-${idx}`,
              stageCode: entry.code || `${debt.code}-D${idx + 1}`,
              isStagePayment: true,
              parentStageCode: entry.code,
              parentStageTitle: entry.title,
              date: pIsoDate,
              ref: pCode,
              type: isReceivable ? 'Phiếu thu' : 'Phiếu chi',
              increase: 0,
              decrease: pAmount,
              note: p.title || p.note || (isReceivable
                ? `Khách hàng thanh toán ${entry.title || `đợt ${idx + 1}`} qua ${p.method || 'chuyển khoản'}`
                : `Thanh toán tiền hàng cho NCC qua ${p.method || 'chuyển khoản'}`),
              orderIdx: orderSeq++,
              rawPayment: p,
              rawEntry: entry,
            };
            timelineList.push(payTx);
            stageGroupedList.push(payTx);
          });
        } else if (entryPaid > 0) {
          const pCode = entry.receiptCode || entry.paymentCode || (isReceivable ? `PT-${entry.code || idx + 1}` : `UNC-${entry.code || idx + 1}`);
          const pIsoDate = parseToIsoDateTime(entry.paidDate || entry.date, entry.paidTime || entry.time || '08:30');
          const payTx = {
            id: `ENTRY_PAID_${entry.id || idx}`,
            stageId: entry.id || `ent-${idx}`,
            stageCode: entry.code || `${debt.code}-D${idx + 1}`,
            isStagePayment: true,
            parentStageCode: entry.code,
            parentStageTitle: entry.title,
            date: pIsoDate,
            ref: pCode,
            type: isReceivable ? 'Phiếu thu' : 'Phiếu chi',
            increase: 0,
            decrease: entryPaid,
            note: isReceivable
              ? `Khách hàng thanh toán ${entry.title || `đợt ${idx + 1}`} qua chuyển khoản NH`
              : `Thanh toán tiền hàng cho NCC qua chuyển khoản NH`,
            orderIdx: orderSeq++,
            rawEntry: entry,
          };
          timelineList.push(payTx);
          stageGroupedList.push(payTx);
        }
      });
    } else {
      // Trường hợp không có entries con: tạo từ bản ghi gốc
      const rootIsoDate = parseToIsoDateTime(debt.date || debt.createdAt, debt.time || '08:30');
      const rootMainTx = {
        id: `MAIN_${debt.id || debt.code}`,
        date: rootIsoDate,
        ref: debt.code || debt.referenceId || 'HD-2026',
        type: isReceivable ? 'Bán hàng' : 'Mua hàng',
        increase: totalAmount,
        decrease: 0,
        note: debt.projectName || debt.notes || 'Hợp đồng kinh tế cung ứng cửa gỗ và phụ kiện',
        orderIdx: orderSeq++,
      };
      timelineList.push(rootMainTx);
      stageGroupedList.push(rootMainTx);

      const rootPayments = Array.isArray(debt.paymentHistory)
        ? debt.paymentHistory
        : Array.isArray(debt.payments)
        ? debt.payments
        : [];

      if (rootPayments.length > 0) {
        rootPayments.forEach((h: any, hIdx: number) => {
          const rootPayTx = {
            id: `PAID_HIST_${h.id || hIdx}`,
            date: parseToIsoDateTime(h.dateTime || h.date, h.time || '10:00'),
            ref: h.code || h.receiptCode || (isReceivable ? `PT-${debt.code || '01'}` : `UNC-${debt.code || '01'}`),
            type: isReceivable ? 'Phiếu thu' : 'Phiếu chi',
            increase: 0,
            decrease: Number(h.amount) || 0,
            note: h.title || h.note || (isReceivable
              ? `Khách hàng thanh toán qua ${h.method || 'chuyển khoản'}`
              : `Thanh toán cho nhà cung cấp qua ${h.method || 'chuyển khoản'}`),
            orderIdx: orderSeq++,
            rawPayment: h,
          };
          timelineList.push(rootPayTx);
          stageGroupedList.push(rootPayTx);
        });
      } else if (paidAmount > 0) {
        const rootPayTx = {
          id: `PAID_${debt.id || debt.code}`,
          date: parseToIsoDateTime(debt.paidDate, '14:15'),
          ref: isReceivable ? `PT-${debt.code || '01'}` : `UNC-${debt.code || '01'}`,
          type: isReceivable ? 'Phiếu thu' : 'Phiếu chi',
          increase: 0,
          decrease: paidAmount,
          note: isReceivable
            ? 'Khách hàng thanh toán tạm ứng hợp đồng chuyển khoản Vietcombank'
            : 'Thanh toán tiền vật tư chuyển khoản BIDV',
          orderIdx: orderSeq++,
        };
        timelineList.push(rootPayTx);
        stageGroupedList.push(rootPayTx);
      }
    }

    // Dòng Dư nợ đầu kỳ
    const openingRow = {
      id: 'OPENING_BALANCE',
      date: '2026-09-01T00:00:00',
      ref: 'DK',
      type: 'Dư nợ đầu kỳ',
      increase: 0,
      decrease: 0,
      note: 'Dư nợ cũ chuyển sang từ kỳ trước',
      orderIdx: -1,
    };

    // ── 1. Chuẩn bị danh sách theo dòng thời gian (Timeline)
    const timelineSorted = [...timelineList].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) return timeA - timeB;
      if (a.increase > 0 && b.decrease > 0) return -1;
      if (a.decrease > 0 && b.increase > 0) return 1;
      return (a.orderIdx ?? 0) - (b.orderIdx ?? 0);
    });

    const timelineTransactions = [openingRow, ...timelineSorted];
    let cumulative = initialBalance;
    timelineTransactions.forEach((tx) => {
      cumulative = cumulative + tx.increase - tx.decrease;
      tx.balance = cumulative;
    });

    // ── 2. Chuẩn bị danh sách nhóm theo đợt nợ (Stage Grouped)
    const stageGroupedTransactions = [openingRow, ...stageGroupedList];
    let stageCumulative = initialBalance;
    stageGroupedTransactions.forEach((tx) => {
      stageCumulative = stageCumulative + tx.increase - tx.decrease;
      tx.balance = stageCumulative;
    });

    return {
      timelineTransactions,
      stageGroupedTransactions,
      openingBalanceValue: initialBalance,
    };
  }, [debt, isReceivable]);

  const handleOpenVoucherModal = (tx: any) => {
    if (!tx) return;
    if (isReceivable) {
      const receiptData: ReceiptVoucherData = {
        code: tx.ref,
        date: tx.rawPayment?.date || (tx.date ? new Date(tx.date).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')),
        customerName: debt.partnerName || debt.customerName || 'Khách hàng',
        payerName: tx.rawPayment?.payerName || debt.partnerName || debt.customerName || '',
        customerAddress: debt.address || debt.customerAddress || '',
        customerPhone: debt.customerPhone || '',
        amount: tx.decrease,
        reason: tx.note || `Thu tiền khách hàng theo chứng từ ${tx.ref}`,
        contractCode: debt.code,
        stageTitle: tx.rawEntry?.title,
        paymentMethod: tx.rawPayment?.method || 'Chuyển khoản',
        debitAccount: '1121',
        creditAccount: '131',
        creator: 'Nguyễn Thị Tuyết',
        accountant: 'Mai Thị Ngọc',
        director: 'Hà Hải Lâm',
      };
      setSelectedReceiptForPrint(receiptData);
      setReceiptPrintOpen(true);
    } else {
      setSelectedExpenseForPrint({
        id: tx.id,
        code: tx.ref,
        title: tx.note,
        category: 'production',
        categoryLabel: 'Chi phí mua hàng / trả nợ',
        amount: tx.decrease,
        paymentMethod: tx.rawPayment?.method || 'Chuyển khoản',
        date: tx.rawPayment?.date || (tx.date ? new Date(tx.date).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')),
        receiverName: debt.partnerName || debt.supplierName || 'Nhà cung cấp',
        notes: tx.note,
        accountant: 'Mai Thị Ngọc',
        director: 'Hà Hải Lâm',
      });
      setPaymentPrintOpen(true);
    }
  };

  // Filtered transactions and computed totals based on date range
  const { filteredTimelineTransactions, filteredStageTransactions, totals } = useMemo(() => {
    let openingBalance = transactions.openingBalanceValue;

    if (startDate) {
      const startDayTime = new Date(startDate);
      startDayTime.setHours(0, 0, 0, 0);
      const startDateTime = startDayTime.getTime();
      transactions.timelineTransactions.forEach((tx: any) => {
        if (tx.id !== 'OPENING_BALANCE' && tx.date) {
          const txTime = new Date(tx.date).getTime();
          if (txTime < startDateTime) {
            openingBalance = openingBalance + tx.increase - tx.decrease;
          }
        }
      });
    }

    const filterFn = (tx: any) => {
      if (tx.id === 'OPENING_BALANCE') return true;
      const txTime = new Date(tx.date).getTime();
      if (startDate) {
        const startDayTime = new Date(startDate);
        startDayTime.setHours(0, 0, 0, 0);
        if (txTime < startDayTime.getTime()) return false;
      }
      if (endDate) {
        const endDayTime = new Date(endDate);
        endDayTime.setHours(23, 59, 59, 999);
        if (txTime > endDayTime.getTime()) return false;
      }
      return true;
    };

    const filteredTimeline = transactions.timelineTransactions
      .filter(filterFn)
      .map((tx: any) => ({ ...tx }));

    const filteredStage = transactions.stageGroupedTransactions
      .filter(filterFn)
      .map((tx: any) => ({ ...tx }));

    let cumulative = openingBalance;
    let periodIncrease = 0;
    let periodDecrease = 0;

    filteredTimeline.forEach((tx: any) => {
      if (tx.id === 'OPENING_BALANCE') {
        tx.balance = cumulative;
      } else {
        periodIncrease += tx.increase;
        periodDecrease += tx.decrease;
        cumulative = cumulative + tx.increase - tx.decrease;
        tx.balance = cumulative;
      }
    });

    let stageCumulative = openingBalance;
    filteredStage.forEach((tx: any) => {
      if (tx.id === 'OPENING_BALANCE') {
        tx.balance = stageCumulative;
      } else {
        stageCumulative = stageCumulative + tx.increase - tx.decrease;
        tx.balance = stageCumulative;
      }
    });

    return {
      filteredTimelineTransactions: filteredTimeline,
      filteredStageTransactions: filteredStage,
      totals: {
        openingBalance,
        increase: periodIncrease,
        decrease: periodDecrease,
      },
    };
  }, [transactions, startDate, endDate]);

  // Reset pagination when date filter or view mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, viewMode]);

  // Danh sách hiển thị theo chế độ đã chọn
  const allDisplayTransactions = useMemo(() => {
    if (viewMode === 'by_stage') {
      return filteredStageTransactions.filter((tx: any) => {
        if (tx.isStagePayment && collapsedStages[tx.stageCode]) {
          return false;
        }
        return true;
      });
    }
    // Mặc định: theo thời gian, mới nhất lên trên
    return [...filteredTimelineTransactions].reverse();
  }, [viewMode, filteredStageTransactions, filteredTimelineTransactions, collapsedStages]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(allDisplayTransactions.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [allDisplayTransactions.length, pageSize, currentPage]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allDisplayTransactions.slice(start, start + pageSize);
  }, [allDisplayTransactions, currentPage, pageSize]);

  const handlePrintReconciliation = () => {
    setIsPrintPreviewOpen(true);
  };

  if (!mounted || !open || !debt) return null;

  const currentRemaining = totals.openingBalance + totals.increase - totals.decrease;
  const partnerDisplayName = debt.partnerName || debt.customerName || debt.supplierName || 'Đối tác';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1060,
        backgroundColor: 'var(--bg-surface-1, #f8fafc)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: "'Roboto Condensed', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ========================================================= */}
      {/* 1. TOP APP BAR (HEADER ĐỒNG BỘ CHUẨN DỰ ÁN)                */}
      {/* ========================================================= */}
      <div
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border-default, #e2e8f0)',
          backgroundColor: 'var(--bg-surface-2, #ffffff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md, 8px)',
              backgroundColor: 'var(--color-primary-light, rgba(37, 99, 235, 0.1))',
              color: 'var(--color-primary, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileEarmarkCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary, #0f172a)',
                  fontFamily: 'var(--font-display, inherit)',
                  letterSpacing: '-0.01em',
                }}
              >
                {isReceivable ? 'Đối chiếu công nợ khách hàng' : 'Đối chiếu công nợ nhà cung cấp'}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: isReceivable ? 'rgba(37, 99, 235, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                  color: isReceivable ? 'var(--color-primary, #2563eb)' : '#d97706',
                  border: isReceivable ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid rgba(217, 119, 6, 0.2)',
                  textTransform: 'uppercase',
                }}
              >
                {isReceivable ? 'Khách hàng phải thu' : 'Phải trả nhà cung cấp'}
              </span>
            </div>
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-secondary, #64748b)',
                marginTop: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <span>
                {isReceivable ? 'Khách hàng' : 'Nhà cung cấp'}:{' '}
                <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{partnerDisplayName}</strong>
              </span>
              <span>•</span>
              <span>
                Mã HĐ/CT: <strong style={{ color: 'var(--color-primary, #2563eb)' }}>{debt.code || debt.referenceId || '---'}</strong>
              </span>
              {debt.contractValue ? (
                <>
                  <span>•</span>
                  <span>
                    Giá trị HĐ: <strong>{Number(debt.contractValue).toLocaleString('vi-VN')} đ</strong>
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Nút hành động góc phải Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handlePrintReconciliation}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-default, #cbd5e1)',
              backgroundColor: 'var(--bg-surface-1, #ffffff)',
              color: 'var(--color-primary, #2563eb)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-2, #f8fafc)';
              e.currentTarget.style.borderColor = 'var(--color-primary, #2563eb)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-1, #ffffff)';
              e.currentTarget.style.borderColor = 'var(--border-default, #cbd5e1)';
            }}
            title="Xem trước và in biên bản đối chiếu công nợ A4"
          >
            <Printer size={15} />
            <span>In biên bản</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-default, #cbd5e1)',
              backgroundColor: 'var(--bg-surface-1, #ffffff)',
              color: 'var(--text-secondary, #64748b)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-2, #f8fafc)';
              e.currentTarget.style.color = 'var(--text-primary, #0f172a)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-1, #ffffff)';
              e.currentTarget.style.color = 'var(--text-secondary, #64748b)';
            }}
            title="Đóng modal đối chiếu"
          >
            <X size={20} />
          </button>
        </div>
      </div>

        {/* CONTENT WRAPPER */}
        <div
          style={{
            flex: '1 1 0%',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflow: 'hidden',
            padding: '8px',
            backgroundColor: '#f8fafc',
            minHeight: 0,
          }}
        >
          {/* 4 KPI METRIC CARDS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            {/* Card 1: Dư nợ đầu kỳ */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  Dư nợ đầu kỳ
                </span>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                  {formatCurrency(totals.openingBalance)} đ
                </h4>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar2Week size={18} />
              </div>
            </div>

            {/* Card 2: Phát sinh tăng */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  Phát sinh tăng
                </span>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8' }}>
                  {formatCurrency(totals.increase)} đ
                </h4>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PlusLg size={18} />
              </div>
            </div>

            {/* Card 3: Phát sinh giảm */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  Phát sinh giảm
                </span>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                  {formatCurrency(totals.decrease)} đ
                </h4>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DashLg size={18} />
              </div>
            </div>

            {/* Card 4: Dư nợ cuối kỳ */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  Dư nợ cuối kỳ
                </span>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>
                  {formatCurrency(currentRemaining)} đ
                </h4>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wallet2 size={18} />
              </div>
            </div>
          </div>

          {/* MAIN LEDGER TABLE */}
          <div
            style={{
              flex: '1 1 0%',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
              {/* Header + Date Filters */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                    <ListTask size={18} style={{ color: '#1d4ed8' }} />
                    <span>Sổ chi tiết công nợ phát sinh</span>
                  </div>

                  {/* LỰA CHỌN CHẾ ĐỘ XEM: THEO THỜI GIAN HOẶC NHÓM THEO ĐỢT NỢ */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: '#f1f5f9',
                      padding: '3px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      gap: '2px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setViewMode('timeline')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        backgroundColor: viewMode === 'timeline' ? '#ffffff' : 'transparent',
                        color: viewMode === 'timeline' ? '#1d4ed8' : '#64748b',
                        boxShadow: viewMode === 'timeline' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                      title="Xem danh sách giao dịch theo dòng thời gian kế toán"
                    >
                      <ClockHistory size={13} />
                      <span>Theo thời gian</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode('by_stage')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        backgroundColor: viewMode === 'by_stage' ? '#ffffff' : 'transparent',
                        color: viewMode === 'by_stage' ? '#1d4ed8' : '#64748b',
                        boxShadow: viewMode === 'by_stage' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                      title="Gom nhóm các phiếu thu/chi trực thuộc từng đợt nợ hợp đồng"
                    >
                      <Folder2Open size={13} />
                      <span>Nhóm theo đợt nợ</span>
                    </button>
                  </div>

                  {viewMode === 'by_stage' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={handleExpandAll}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        Mở rộng tất cả
                      </button>
                      <button
                        type="button"
                        onClick={handleCollapseAll}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        Thu gọn tất cả
                      </button>
                    </div>
                  )}
                </div>

                {/* DATE RANGE FILTERS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="datetime-local"
                    step="1"
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.75rem',
                      width: '185px',
                    }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    title="Từ ngày"
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>đến</span>
                  <input
                    type="datetime-local"
                    step="1"
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.75rem',
                      width: '185px',
                    }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    title="Đến ngày"
                  />
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      Xóa lọc
                    </button>
                  )}
                </div>
              </div>

              {/* LEDGER TABLE */}
              <div style={{ flex: '1 1 0%', overflow: 'auto', minHeight: 0, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#f8fafc' }}>
                    <tr style={{ borderBottom: '1px solid #cbd5e1', fontSize: '0.72rem', textTransform: 'uppercase', color: '#475569', fontWeight: 800 }}>
                      <th style={{ padding: '8px 10px', width: '135px', textAlign: 'left', verticalAlign: 'middle' }}>Thời gian</th>
                      <th style={{ padding: '8px 10px', width: '175px', textAlign: 'left', verticalAlign: 'middle' }}>Số CT</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle' }}>Diễn giải / Loại giao dịch</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '120px', verticalAlign: 'middle' }}>Phát sinh tăng</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '120px', verticalAlign: 'middle' }}>Phát sinh giảm</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '130px', verticalAlign: 'middle' }}>Dư nợ lũy kế</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Hàng tổng phát sinh trong kỳ */}
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontWeight: 800 }}>
                      <td colSpan={3} style={{ padding: '7px 10px', textTransform: 'uppercase', fontSize: '0.72rem', color: '#0f172a', verticalAlign: 'middle' }}>
                        Tổng phát sinh trong kỳ
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#1d4ed8', fontWeight: 800, verticalAlign: 'middle' }}>
                        {totals.increase > 0 ? formatCurrency(totals.increase) : '-'}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#059669', fontWeight: 800, verticalAlign: 'middle' }}>
                        {totals.decrease > 0 ? formatCurrency(totals.decrease) : '-'}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#dc2626', fontWeight: 800, verticalAlign: 'middle' }}>
                        {formatCurrency(currentRemaining)}
                      </td>
                    </tr>

                    {paginatedTransactions.map((tx: any, idx: number) => {
                      const isOpening = tx.id === 'OPENING_BALANCE';
                      const isStageMain = tx.isStageMain;
                      const isStagePayment = tx.isStagePayment;
                      const isReceipt = tx.type.includes('Phiếu thu') || tx.type.includes('Phiếu chi');

                      let displayDate = tx.date;
                      try {
                        if (tx.date) {
                          const d = new Date(tx.date);
                          if (!isNaN(d.getTime())) {
                            displayDate = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${String(
                              d.getDate()
                            ).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                          }
                        }
                      } catch (e) {}

                      // ── CHẾ ĐỘ 1: NHÓM THEO ĐỢT CÔNG NỢ (BY STAGE) ──
                      if (viewMode === 'by_stage') {
                        if (isStageMain) {
                          const hasPayments = tx.paymentCount > 0;
                          const isCollapsed = collapsedStages[tx.stageCode];
                          return (
                            <tr
                              key={tx.id || idx}
                              style={{
                                borderBottom: '1px solid #e2e8f0',
                                backgroundColor: '#f8fafc',
                                borderTop: idx > 0 ? '1px solid #e2e8f0' : 'none',
                              }}
                            >
                              <td style={{ padding: '8px 10px', color: '#475569', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: '1.4' }}>
                                {displayDate}
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: 800, color: '#1e40af', whiteSpace: 'nowrap', verticalAlign: 'middle', fontSize: '0.78rem', lineHeight: '1.4' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {hasPayments && (
                                    <button
                                      type="button"
                                      onClick={() => toggleCollapseStage(tx.stageCode)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                        color: '#2563eb',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                      title={isCollapsed ? 'Mở rộng các phiếu thu của đợt này' : 'Thu gọn các phiếu thu của đợt này'}
                                    >
                                      {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                    </button>
                                  )}
                                  <span>{tx.ref}</span>
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        padding: '1px 6px',
                                        borderRadius: '3px',
                                        fontSize: '0.675rem',
                                        fontWeight: 700,
                                        width: 'fit-content',
                                        backgroundColor: '#eff6ff',
                                        color: '#1d4ed8',
                                        border: '1px solid #bfdbfe',
                                      }}
                                    >
                                      {stripParentheses(tx.type)}
                                    </span>
                                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem' }}>{stripParentheses(tx.note)}</span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem' }}>
                                    <span
                                      style={{
                                        padding: '1px 7px',
                                        borderRadius: '9999px',
                                        fontWeight: 700,
                                        backgroundColor: tx.stageRemaining <= 0 ? '#ecfdf5' : tx.stagePaid > 0 ? '#eff6ff' : '#f8fafc',
                                        color: tx.stageRemaining <= 0 ? '#059669' : tx.stagePaid > 0 ? '#1d4ed8' : '#64748b',
                                        border: `1px solid ${tx.stageRemaining <= 0 ? '#a7f3d0' : tx.stagePaid > 0 ? '#bfdbfe' : '#cbd5e1'}`,
                                      }}
                                    >
                                      {tx.stageRemaining <= 0
                                        ? '✓ Đã thu đủ 100%'
                                        : tx.stagePaid > 0
                                        ? `Đã thu ${formatCurrency(tx.stagePaid)} đ • Còn nợ ${formatCurrency(tx.stageRemaining)} đ`
                                        : 'Chưa phát sinh thu'}
                                    </span>
                                    {hasPayments ? (
                                      <span style={{ color: '#059669', fontWeight: 600 }}>
                                        • {tx.paymentCount} phiếu thu liên kết
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>• 0 phiếu thu</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#1d4ed8', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                                {tx.increase > 0 ? formatCurrency(tx.increase) : '-'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#059669', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                                {tx.decrease > 0 ? formatCurrency(tx.decrease) : '-'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                                {formatCurrency(tx.balance)}
                              </td>
                            </tr>
                          );
                        }

                        if (isStagePayment) {
                          return (
                            <tr
                              key={tx.id || idx}
                              style={{
                                borderBottom: '1px dashed #e2e8f0',
                                backgroundColor: '#f0fdf4',
                              }}
                            >
                              <td style={{ padding: '8px 10px', paddingLeft: '24px', color: '#059669', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: '1.4' }}>
                                <span style={{ color: '#10b981', marginRight: '5px', fontWeight: 800 }}>↳</span>
                                {displayDate}
                              </td>
                              <td style={{ padding: '8px 10px', paddingLeft: '24px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap', verticalAlign: 'middle', fontSize: '0.78rem', lineHeight: '1.4' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenVoucherModal(tx)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    margin: 0,
                                    color: '#059669',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    verticalAlign: 'middle',
                                    gap: '4px',
                                    fontSize: '0.78rem',
                                    lineHeight: '1.4',
                                  }}
                                  title={`Xem và in chi tiết ${tx.ref}`}
                                >
                                  <Printer size={12} />
                                  <span>{tx.ref}</span>
                                </button>
                              </td>
                              <td style={{ padding: '8px 10px', paddingLeft: '24px', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        padding: '1px 6px',
                                        borderRadius: '3px',
                                        fontSize: '0.675rem',
                                        fontWeight: 700,
                                        width: 'fit-content',
                                        backgroundColor: '#dcfce7',
                                        color: '#15803d',
                                        border: '1px solid #86efac',
                                      }}
                                    >
                                      {stripParentheses(tx.type)}
                                    </span>
                                    <span style={{ color: '#166534', fontSize: '0.78rem', fontWeight: 600 }}>{stripParentheses(tx.note)}</span>
                                  </div>
                                  {tx.rawPayment?.method && (
                                    <span style={{ fontSize: '0.675rem', color: '#64748b', fontStyle: 'italic', paddingLeft: '4px' }}>
                                      Phương thức: {tx.rawPayment.method}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#1d4ed8', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                                {tx.increase > 0 ? formatCurrency(tx.increase) : '-'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#059669', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                                {tx.decrease > 0 ? formatCurrency(tx.decrease) : '-'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                                {formatCurrency(tx.balance)}
                              </td>
                            </tr>
                          );
                        }
                      }

                      // ── CHẾ ĐỘ 2: THEO TRÌNH TỰ THỜI GIAN (TIMELINE) HOẶC DÒNG ĐẦU KỲ ──
                      const isMain = tx.type.includes('Bán hàng') || tx.type.includes('Mua hàng');
                      return (
                        <tr
                          key={tx.id || idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isOpening ? '#fafafa' : '#ffffff',
                          }}
                        >
                          <td style={{ padding: '8px 10px', color: '#475569', fontSize: '0.78rem', whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: '1.4' }}>
                            {displayDate}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e40af', whiteSpace: 'nowrap', verticalAlign: 'middle', fontSize: '0.78rem', lineHeight: '1.4' }}>
                            {isReceipt ? (
                              <button
                                type="button"
                                onClick={() => handleOpenVoucherModal(tx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  margin: 0,
                                  color: '#1d4ed8',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  verticalAlign: 'middle',
                                  gap: '4px',
                                  fontSize: '0.78rem',
                                  lineHeight: '1.4',
                                }}
                                title={`Xem và in chi tiết ${tx.ref}`}
                              >
                                <span>{tx.ref}</span>
                              </button>
                            ) : (
                              <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>{tx.ref}</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  fontSize: '0.675rem',
                                  fontWeight: 700,
                                  width: 'fit-content',
                                  backgroundColor: isOpening ? '#f1f5f9' : isMain ? '#eff6ff' : isReceipt ? '#ecfdf5' : '#fef2f2',
                                  color: isOpening ? '#475569' : isMain ? '#1d4ed8' : isReceipt ? '#059669' : '#dc2626',
                                  border: `1px solid ${isOpening ? '#cbd5e1' : isMain ? '#bfdbfe' : isReceipt ? '#a7f3d0' : '#fecaca'}`,
                                }}
                              >
                                {stripParentheses(tx.type)}
                              </span>
                              <span style={{ color: '#334155', fontSize: '0.78rem', fontWeight: 500 }}>{stripParentheses(tx.note)}</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#1d4ed8', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                            {tx.increase > 0 ? formatCurrency(tx.increase) : '-'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#059669', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                            {tx.decrease > 0 ? formatCurrency(tx.decrease) : '-'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                            {formatCurrency(tx.balance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Component */}
              <div
                style={{
                  marginTop: '8px',
                  flexShrink: 0,
                }}
              >
                <Pagination
                  currentPage={currentPage}
                  totalItems={allDisplayTransactions.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                  style={{
                    padding: '4px 0 0 0',
                    backgroundColor: 'transparent',
                    borderTop: 'none',
                  }}
                />
              </div>
            </div>
        </div>

      {/* ========================================================= */}
      {/* 4. MODAL XEM TRƯỚC VÀ IN BIÊN BẢN ĐỐI CHIẾU CÔNG NỢ (A4) */}
      {/* ========================================================= */}
      {isPrintPreviewOpen && (
        <PrintPreview
          isOpen={isPrintPreviewOpen}
          onClose={() => setIsPrintPreviewOpen(false)}
          defaultPaperSize="A4"
          defaultOrientation="portrait"
          documentTitle="BIÊN BẢN ĐỐI CHIẾU CÔNG NỢ"
          documentCode={debt.code || debt.referenceId || `ĐC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`}
          date={`${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`}
          department="Phòng Kế toán - Tài chính"
          author="Hà Hải Lâm"
          performerName="Hà Hải Lâm"
          performerRole="Kế toán trưởng / Đại diện tài chính"
          supervisorName={partnerDisplayName}
          supervisorRole={isReceivable ? 'Đại diện Khách hàng' : 'Đại diện Nhà cung cấp'}
          customerName={partnerDisplayName}
          customerAddress={debt.customerAddress || debt.supplierAddress || debt.address || 'Khu vực hoạt động kinh doanh'}
          projectName={debt.projectName || debt.code}
          sidebarTitle="Cấu hình biên bản đối chiếu"
          sidebarContent={({
            title,
            setTitle,
            docDate,
            setDocDate,
            performerName,
            setPerformerName,
            performerRole,
            setPerformerRole,
            supervisorName,
            setSupervisorName,
            supervisorRole,
            setSupervisorRole,
          }) => (
            <>
              {/* KHỐI 1: THÔNG TIN BIÊN BẢN */}
              <div className="print-sidebar-section">
                <div className="print-sidebar-section-title">
                  <FileText size={14} />
                  <span>Thông tin biên bản</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Input
                    label="Tiêu đề biên bản"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề biên bản..."
                  />
                  <Input
                    label="Ngày lập biên bản"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    placeholder="Ví dụ: 23 tháng 10 năm 2026"
                  />
                </div>
              </div>

              {/* KHỐI 2: ĐẠI DIỆN BÊN A (DECO DOOR) */}
              <div className="print-sidebar-section">
                <div className="print-sidebar-section-title">
                  <Building size={14} />
                  <span>Đại diện Bên A (Deco Door)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Input
                    label="Họ và tên người đại diện"
                    value={performerName}
                    onChange={(e) => setPerformerName(e.target.value)}
                    placeholder="Họ tên người đại diện Bên A..."
                  />
                  <Input
                    label="Chức danh / Chức vụ"
                    value={performerRole}
                    onChange={(e) => setPerformerRole(e.target.value)}
                    placeholder="Chức vụ..."
                  />
                </div>
              </div>

              {/* KHỐI 3: ĐẠI DIỆN BÊN B (KHÁCH HÀNG / NCC) */}
              <div className="print-sidebar-section">
                <div className="print-sidebar-section-title">
                  <PersonCheck size={14} />
                  <span>Đại diện Bên B ({isReceivable ? 'Khách hàng' : 'Nhà cung cấp'})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default, #e2e8f0)',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.7rem', marginBottom: '2px' }}>
                      Đơn vị đối tác:
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                      {partnerDisplayName}
                    </div>
                  </div>
                  <Input
                    label="Họ và tên người đại diện"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="Họ tên người đại diện Bên B..."
                  />
                  <Input
                    label="Chức danh / Chức vụ"
                    value={supervisorRole}
                    onChange={(e) => setSupervisorRole(e.target.value)}
                    placeholder="Chức vụ..."
                  />
                </div>
              </div>
            </>
          )}
        >
          {(meta) => (
            <>

              {/* Header văn bản: Logo & Tên Cty bên trái, Quốc hiệu tiêu ngữ bên phải */}
              <div
                className="print-doc-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  paddingBottom: '14px',
                  borderBottom: '2px solid #003087',
                }}
              >
                <div
                  className="print-doc-header-left"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.short_name || 'Logo'}
                      style={{
                        height: '46px',
                        maxHeight: '46px',
                        maxWidth: '110px',
                        objectFit: 'contain',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '6px',
                        backgroundColor: '#003087',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '0.95rem',
                        letterSpacing: '1px',
                        flexShrink: 0,
                      }}
                    >
                      DCD
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="print-company-name"
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#003087',
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {company.company_name || 'CÔNG TY CỔ PHẦN SẢN XUẤT DECO DOOR'}
                    </div>
                    <div
                      className="print-company-branch"
                      style={{
                        fontSize: '0.71rem',
                        color: '#475569',
                        marginTop: '2px',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Địa chỉ: {company.address || 'Cụm 4, Xã Sơn Đồng, Thành phố Hà Nội, Việt Nam'}
                    </div>
                    <div
                      className="print-company-sub"
                      style={{
                        fontSize: '0.71rem',
                        color: '#64748b',
                        marginTop: '1px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ĐT: {company.phone || '0346548982'} | Email: {company.email || 'contact@decodoor.vn'}
                    </div>
                  </div>
                </div>

                <div
                  className="print-doc-header-right"
                  style={{
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                    marginLeft: '14px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      textTransform: 'uppercase',
                      color: '#0f172a',
                      letterSpacing: '0.3px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      fontStyle: 'italic',
                      fontWeight: 600,
                      color: '#334155',
                      marginTop: '1px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div
                    style={{
                      margin: '5px auto 0',
                      width: '100px',
                      borderBottom: '1px solid #0f172a',
                    }}
                  />
                </div>
              </div>

              {/* Tiêu đề Biên bản */}
              <div
                style={{
                  textAlign: 'center',
                  margin: '18px 0 14px',
                }}
              >
                <h1
                  style={{
                    fontWeight: 900,
                    margin: '0 0 4px 0',
                    fontSize: '1.25rem',
                    color: '#003087',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                  }}
                >
                  {meta.title}
                </h1>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    color: '#475569',
                  }}
                >
                  (V/v: Đối chiếu và xác nhận tình hình công nợ đến ngày {meta.docDate})
                </div>
              </div>

              {/* Đại diện 2 bên */}
              <div
                style={{
                  fontSize: '0.8rem',
                  lineHeight: 1.6,
                  color: '#1e293b',
                  marginBottom: '12px',
                }}
              >
                <div style={{ marginBottom: '6px', fontStyle: 'italic' }}>
                  Hôm nay, ngày {meta.docDate}, chúng tôi gồm có:
                </div>

                {/* BÊN A */}
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      color: '#003087',
                      fontSize: '0.825rem',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    BÊN A (BÊN BÁN / ĐƠN VỊ CUNG CẤP): {company.company_name || 'CÔNG TY CỔ PHẦN SẢN XUẤT DECO DOOR'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                    <div style={{ whiteSpace: 'nowrap' }}>
                      Địa chỉ: <strong>{company.address || 'Cụm 4, Xã Sơn Đồng, Thành phố Hà Nội, Việt Nam'}</strong>
                    </div>
                    <div style={{ whiteSpace: 'nowrap' }}>
                      Điện thoại: <strong>{company.phone || '0346548982'}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '8px', fontSize: '0.78rem', marginTop: '2px' }}>
                    <div style={{ whiteSpace: 'nowrap' }}>
                      Đại diện: <strong>{meta.performerName || 'Hà Hải Lâm'}</strong>
                    </div>
                    <div style={{ whiteSpace: 'nowrap' }}>
                      Chức vụ: <strong>{meta.performerRole || 'Kế toán trưởng'}</strong>
                    </div>
                  </div>
                </div>

                {/* BÊN B */}
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '10px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      color: '#0f172a',
                      fontSize: '0.825rem',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    BÊN B ({isReceivable ? 'KHÁCH HÀNG' : 'NHÀ CUNG CẤP'}): {partnerDisplayName}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                    <div>
                      Địa chỉ: <strong>{debt.customerAddress || debt.supplierAddress || debt.address || 'Khu vực hoạt động kinh doanh'}</strong>
                    </div>
                    <div>
                      Hợp đồng / Mã CT: <strong>{debt.code || debt.referenceId || '---'}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px', fontSize: '0.78rem', marginTop: '2px' }}>
                    <div>
                      Đại diện: <strong>{meta.supervisorName || partnerDisplayName}</strong>
                    </div>
                    <div>
                      Chức vụ: <strong>{meta.supervisorRole || (isReceivable ? 'Đại diện Khách hàng' : 'Đại diện Đối tác')}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ fontStyle: 'italic', marginBottom: '8px' }}>
                  Hai bên cùng nhau đối chiếu, kiểm tra và thống nhất xác nhận số liệu công nợ phát sinh theo các giao dịch/hợp đồng đã ký kết. Kết quả chi tiết như sau:
                </div>
              </div>

              {/* Bảng số liệu chi tiết đối chiếu - DỒN NGÀY VÀ SỐ CT, DIỄN GIẢI Ở DƯỚI, BỎ LƯỚI DỌC */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ textAlign: 'right', fontStyle: 'italic', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>
                  Đơn vị tính: Đồng (VNĐ)
                </div>
                <table
                  className="print-table"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.76rem',
                    border: 'none',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderTop: '1.5px solid #0f172a', borderBottom: '1.5px solid #0f172a' }}>
                      <th style={{ border: 'none', padding: '8px 4px', width: '34px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>STT</th>
                      <th style={{ border: 'none', padding: '8px 8px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>Chứng từ & Diễn giải giao dịch</th>
                      <th style={{ border: 'none', padding: '8px 6px', width: '105px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>Phát sinh tăng</th>
                      <th style={{ border: 'none', padding: '8px 6px', width: '105px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>Phát sinh giảm</th>
                      <th style={{ border: 'none', padding: '8px 6px', width: '115px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>Dư nợ lũy kế</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Dòng Dư nợ đầu kỳ */}
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafafa' }}>
                      <td style={{ border: 'none', padding: '6px 4px', textAlign: 'center', color: '#64748b' }}>-</td>
                      <td style={{ border: 'none', padding: '6px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>
                            {startDate ? new Date(startDate).toLocaleDateString('vi-VN') : '---'}
                          </span>
                          <span style={{ color: '#cbd5e1' }}>•</span>
                          <span style={{ color: '#003087', fontWeight: 700 }}>DK</span>
                        </div>
                        <div style={{ color: '#475569', marginTop: '2px', fontSize: '0.74rem', fontStyle: 'italic' }}>
                          Số dư nợ chuyển sang từ đầu kỳ
                        </div>
                      </td>
                      <td style={{ border: 'none', padding: '6px 6px', textAlign: 'right', color: '#94a3b8' }}>-</td>
                      <td style={{ border: 'none', padding: '6px 6px', textAlign: 'right', color: '#94a3b8' }}>-</td>
                      <td style={{ border: 'none', padding: '6px 6px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                        {formatCurrency(totals.openingBalance)}
                      </td>
                    </tr>

                    {/* Danh sách giao dịch phát sinh */}
                    {allDisplayTransactions
                      .filter((tx: any) => tx.id !== 'OPENING_BALANCE')
                      .map((tx: any, idx: number) => {
                        const cleanNote = stripParentheses(tx.note);
                        const cleanType = stripParentheses(tx.type);
                        const refCode = tx.ref || tx.code || '---';
                        const displayDate = tx.date ? new Date(tx.date).toLocaleDateString('vi-VN') : '---';

                        return (
                          <tr key={tx.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ border: 'none', padding: '7px 4px', textAlign: 'center', color: '#64748b' }}>
                              {idx + 1}
                            </td>
                            <td style={{ border: 'none', padding: '7px 8px' }}>
                              {/* Dòng trên: Ngày và Số chứng từ dồn cùng một dòng */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem' }}>
                                <span style={{ color: '#475569', fontWeight: 600 }}>
                                  {displayDate}
                                </span>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <strong style={{ color: '#003087', fontWeight: 700 }}>
                                  {refCode}
                                </strong>
                                {cleanType ? (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '1px 6px',
                                      borderRadius: '3px',
                                      backgroundColor: '#f1f5f9',
                                      color: '#475569',
                                      border: '1px solid #e2e8f0',
                                      fontWeight: 500,
                                    }}
                                  >
                                    {cleanType}
                                  </span>
                                ) : null}
                              </div>

                              {/* Dòng dưới: Diễn giải nội dung hiển thị ở dưới số chứng từ */}
                              <div
                                style={{
                                  color: '#1e293b',
                                  marginTop: '3px',
                                  fontSize: '0.75rem',
                                  lineHeight: 1.35,
                                }}
                              >
                                {cleanNote || 'Giao dịch phát sinh công nợ'}
                              </div>
                            </td>
                            <td
                              style={{
                                border: 'none',
                                padding: '7px 6px',
                                textAlign: 'right',
                                fontWeight: tx.increase > 0 ? 600 : 400,
                                color: tx.increase > 0 ? '#0f172a' : '#94a3b8',
                              }}
                            >
                              {tx.increase > 0 ? formatCurrency(tx.increase) : '-'}
                            </td>
                            <td
                              style={{
                                border: 'none',
                                padding: '7px 6px',
                                textAlign: 'right',
                                fontWeight: tx.decrease > 0 ? 600 : 400,
                                color: tx.decrease > 0 ? '#16a34a' : '#94a3b8',
                              }}
                            >
                              {tx.decrease > 0 ? formatCurrency(tx.decrease) : '-'}
                            </td>
                            <td
                              style={{
                                border: 'none',
                                padding: '7px 6px',
                                textAlign: 'right',
                                fontWeight: 700,
                                color: tx.balance > 0 ? '#b91c1c' : '#0f172a',
                              }}
                            >
                              {formatCurrency(tx.balance)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 800, backgroundColor: '#f8fafc', borderTop: '1.5px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
                      <td
                        colSpan={2}
                        style={{
                          border: 'none',
                          padding: '8px 8px',
                          textTransform: 'uppercase',
                          textAlign: 'center',
                          letterSpacing: '0.4px',
                          color: '#0f172a',
                        }}
                      >
                        TỔNG CỘNG PHÁT SINH TRONG KỲ
                      </td>
                      <td style={{ border: 'none', padding: '8px 6px', textAlign: 'right', color: '#003087', fontWeight: 800 }}>
                        {formatCurrency(totals.increase)}
                      </td>
                      <td style={{ border: 'none', padding: '8px 6px', textAlign: 'right', color: '#16a34a', fontWeight: 800 }}>
                        {formatCurrency(totals.decrease)}
                      </td>
                      <td style={{ border: 'none', padding: '8px 6px', textAlign: 'right', color: '#b91c1c', fontWeight: 800 }}>
                        {formatCurrency(currentRemaining)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Kết luận đối chiếu & Xác nhận công nợ */}
              <div
                style={{
                  fontSize: '0.8rem',
                  lineHeight: 1.6,
                  color: '#1e293b',
                  marginBottom: '16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '10px 14px',
                }}
              >
                <div style={{ fontWeight: 800, color: '#003087', textTransform: 'uppercase', marginBottom: '4px' }}>
                  KẾT LUẬN VÀ XÁC NHẬN CÔNG NỢ:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>
                    {isReceivable ? 'Số dư công nợ Bên B còn phải thanh toán cho Bên A tính đến thời điểm đối chiếu là:' : 'Số dư công nợ Bên A còn phải thanh toán cho Bên B tính đến thời điểm đối chiếu là:'}{' '}
                    <strong style={{ fontSize: '0.9rem', color: '#b91c1c' }}>
                      {formatCurrency(currentRemaining)} VNĐ
                    </strong>
                  </li>
                  <li>
                    Số tiền bằng chữ: <strong style={{ fontStyle: 'italic', color: '#003087' }}>{docSoTien(currentRemaining)}</strong>
                  </li>
                  <li>
                    Tình trạng khớp số liệu: <strong>HAI BÊN ĐÃ ĐỐI CHIẾU KHỚP ĐÚNG SỐ LIỆU, KHÔNG CÓ CHÊNH LỆCH.</strong>
                  </li>
                  <li>
                    Biên bản được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để làm căn cứ theo dõi và thực hiện thanh toán đúng thời hạn quy định.
                  </li>
                </ul>
              </div>

              {/* Chữ ký và con dấu 2 bên */}
              <div
                className="print-signatures"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '40px',
                  marginTop: '20px',
                  textAlign: 'center',
                }}
              >
                <div className="signature-col">
                  <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.825rem', color: '#003087' }}>
                    ĐẠI DIỆN BÊN A
                  </div>
                  <div style={{ fontSize: '0.72rem', fontStyle: 'italic', color: '#64748b', marginTop: '2px' }}>
                    (Ký, ghi rõ họ tên và đóng dấu)
                  </div>
                  <div style={{ height: '90px' }} />
                </div>

                <div className="signature-col">
                  <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.825rem', color: '#0f172a' }}>
                    ĐẠI DIỆN BÊN B
                  </div>
                  <div style={{ fontSize: '0.72rem', fontStyle: 'italic', color: '#64748b', marginTop: '2px' }}>
                    (Ký, ghi rõ họ tên và đóng dấu)
                  </div>
                  <div style={{ height: '90px' }} />
                </div>
              </div>
            </>
          )}
        </PrintPreview>
      )}
      {/* VOUCHER PRINT PREVIEW MODALS */}
      {receiptPrintOpen && (
        <ReceiptVoucherPrintModal
          isOpen={receiptPrintOpen}
          onClose={() => {
            setReceiptPrintOpen(false);
            setSelectedReceiptForPrint(null);
          }}
          receipt={selectedReceiptForPrint}
        />
      )}

      {paymentPrintOpen && (
        <PaymentVoucherPrintModal
          isOpen={paymentPrintOpen}
          onClose={() => {
            setPaymentPrintOpen(false);
            setSelectedExpenseForPrint(null);
          }}
          voucher={selectedExpenseForPrint}
        />
      )}
    </div>,
    document.body
  );
};

export default DebtReconciliationModal;
