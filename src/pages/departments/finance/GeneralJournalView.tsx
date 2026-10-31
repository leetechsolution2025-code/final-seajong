import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  JournalText,
  Plus,
  Printer,
  ChevronDown,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  ExclamationCircle,
  Trash,
  Check2Circle,
  Layers,
} from 'react-bootstrap-icons';
import { Pagination } from '../../../components/common/Pagination';
import { Button } from '../../../components/common/Button';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { TableToolbar } from '../../../components/common/TableToolbar';
import { notifyFinanceUpdated, useFinanceRealtimeSync } from '../../../services/financeSyncService';
import { getDefaultPeriod, getReportingPeriods, formatPeriodLabel, isDateInPeriod } from '../../../utils/periodUtils';

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string;
  partner?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  documentDate: string;
  referenceCode?: string;
  sourceModule: 'PROCUREMENT' | 'SALES' | 'LOGISTICS' | 'PRODUCTION' | 'CASH' | 'ADVANCE' | 'MANUAL';
  sourceLabel: string;
  description: string;
  totalAmount: number;
  lines: JournalLine[];
  status: 'posted' | 'draft';
  statusLabel: string;
  createdBy?: string;
}

export const CHART_OF_ACCOUNTS = [
  { code: '1111', name: 'Tiền Việt Nam (Tiền mặt quỹ)' },
  { code: '1121', name: 'Tiền gửi ngân hàng (VND - Vietcombank)' },
  { code: '131', name: 'Phải thu của khách hàng' },
  { code: '1331', name: 'Thuế GTGT đầu vào được khấu trừ' },
  { code: '141', name: 'Tạm ứng nhân viên' },
  { code: '1521', name: 'Nguyên liệu, vật liệu chính (Gỗ sấy, phôi)' },
  { code: '1522', name: 'Vật liệu phụ, phụ kiện khoá và bản lề' },
  { code: '154', name: 'Chi phí sản xuất kinh doanh dở dang' },
  { code: '155', name: 'Thành phẩm thiết bị vệ sinh & nhà bếp Seajong' },
  { code: '211', name: 'Tài sản cố định hữu hình (Máy móc CNC)' },
  { code: '2141', name: 'Hao mòn tài sản cố định hữu hình' },
  { code: '331', name: 'Phải trả cho người bán (Nhà cung cấp)' },
  { code: '3331', name: 'Thuế GTGT đầu ra phải nộp' },
  { code: '334', name: 'Phải trả người lao động (Tiền lương)' },
  { code: '338', name: 'Phải trả, phải nộp khác' },
  { code: '5112', name: 'Doanh thu bán thành phẩm cửa' },
  { code: '621', name: 'Chi phí nguyên liệu, vật liệu trực tiếp' },
  { code: '622', name: 'Chi phí nhân công trực tiếp xưởng' },
  { code: '627', name: 'Chi phí sản xuất chung' },
  { code: '632', name: 'Giá vốn hàng bán' },
  { code: '641', name: 'Chi phí bán hàng và vận chuyển' },
  { code: '642', name: 'Chi phí quản lý doanh nghiệp' },
  { code: '811', name: 'Chi phí khác' },
  { code: '911', name: 'Xác định kết quả kinh doanh' },
];

const INITIAL_ENTRIES: JournalEntry[] = [];

export interface GeneralJournalViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
};

export const GeneralJournalView: React.FC<GeneralJournalViewProps> = ({ onShowToast }) => {
  const [entries, setEntries] = useState<JournalEntry[]>(INITIAL_ENTRIES);
  const [chartOfAccounts, setChartOfAccounts] = useState(CHART_OF_ACCOUNTS);
  const [, setIsLoading] = useState(false);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/finance/journal-entries');
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data.entries) ? data.entries : []);
      }
    } catch (err) {
      console.warn('Không thể kết nối máy chủ API Sổ nhật ký chung, hiển thị dữ liệu bộ nhớ đệm:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();

    fetch('/api/finance/chart-of-accounts')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setChartOfAccounts(data);
        }
      })
      .catch(() => {});
  }, []);

  // Lắng nghe thay đổi dữ liệu thời gian thực toàn hệ thống
  useFinanceRealtimeSync(fetchEntries);

  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    return `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<string>(() => getDefaultPeriod());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  // Offcanvas Thêm mới bút toán
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [formDocDate, setFormDocDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [formRefCode, setFormRefCode] = useState('');
  const [formSource, setFormSource] = useState<JournalEntry['sourceModule']>('MANUAL');
  const [formDescription, setFormDescription] = useState('');
  const [formLines, setFormLines] = useState<Array<{
    accountId: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number | '';
    description: string;
    partner: string;
  }>>([
    { accountId: '1521', type: 'DEBIT', amount: '', description: '', partner: '' },
    { accountId: '331', type: 'CREDIT', amount: '', description: '', partner: '' },
  ]);

  // Modal in Sổ nhật ký chung
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedRowIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    filteredEntries.forEach((e) => (all[e.id] = true));
    setExpandedRowIds(all);
  };

  const collapseAll = () => {
    setExpandedRowIds({});
  };

  // Lọc dữ liệu
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      // Month / Period filter
      if (periodFilter && !isDateInPeriod(item.entryDate, periodFilter)) {
        return false;
      }

      // Source filter
      if (sourceFilter !== 'all' && item.sourceModule !== sourceFilter) {
        return false;
      }

      // Account filter
      if (accountFilter !== 'all') {
        const hasAccount = item.lines.some((l) => l.accountCode.startsWith(accountFilter));
        if (!hasAccount) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchEntry =
          item.entryNumber.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.referenceCode && item.referenceCode.toLowerCase().includes(q)) ||
          item.lines.some(
            (l) =>
              l.accountCode.toLowerCase().includes(q) ||
              l.accountName.toLowerCase().includes(q) ||
              (l.partner && l.partner.toLowerCase().includes(q)) ||
              (l.description && l.description.toLowerCase().includes(q))
          );
        if (!matchEntry) return false;
      }

      return true;
    });
  }, [entries, periodFilter, sourceFilter, accountFilter, searchQuery]);

  // Phân trang
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  // Tổng hợp KPIs
  const kpiStats = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    filteredEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        if (line.type === 'DEBIT') totalDebit += Number(line.amount || 0);
        if (line.type === 'CREDIT') totalCredit += Number(line.amount || 0);
      });
    });
    const isBalanced = Math.abs(totalDebit - totalCredit) < 1;
    return {
      count: filteredEntries.length,
      totalDebit,
      totalCredit,
      isBalanced,
      diff: Math.abs(totalDebit - totalCredit),
    };
  }, [filteredEntries]);

  // Form helpers
  const handleAddLine = () => {
    setFormLines((prev) => [
      ...prev,
      { accountId: '1111', type: 'DEBIT', amount: '', description: '', partner: '' },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (formLines.length <= 2) {
      if (onShowToast) {
        onShowToast('warning', 'Yêu cầu định khoản', 'Bút toán kế toán kép cần tối thiểu 2 dòng (Nợ và Có).');
      }
      return;
    }
    setFormLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (index: number, field: string, val: any) => {
    setFormLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };

      // Auto-sync amount if exactly 2 opposite lines
      if (field === 'amount' && next.length === 2) {
        const otherIndex = index === 0 ? 1 : 0;
        if (next[0].type !== next[1].type) {
          next[otherIndex] = { ...next[otherIndex], amount: val };
        }
      }
      return next;
    });
  };

  const formTotalDebit = formLines
    .filter((l) => l.type === 'DEBIT')
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  const formTotalCredit = formLines
    .filter((l) => l.type === 'CREDIT')
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  const isFormBalanced = formTotalDebit === formTotalCredit && formTotalDebit > 0;

  const handleSaveEntry = async () => {
    if (!formDescription.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu diễn giải', 'Vui lòng nhập diễn giải nội dung nghiệp vụ.');
      return;
    }
    if (!isFormBalanced) {
      if (onShowToast) {
        onShowToast(
          'warning',
          'Chưa cân đối Nợ - Có',
          `Tổng phát sinh Nợ (${formatCurrency(formTotalDebit)}) phải bằng Tổng Có (${formatCurrency(formTotalCredit)}).`
        );
      }
      return;
    }

    const sourceMap: Record<string, string> = {
      PROCUREMENT: 'Mua hàng',
      SALES: 'Bán hàng',
      LOGISTICS: 'Kho vận',
      PRODUCTION: 'Sản xuất',
      CASH: 'Quỹ và Ngân hàng',
      ADVANCE: 'Tạm ứng',
      MANUAL: 'Thủ công',
    };

    try {
      setIsSubmitting(true);
      const payload = {
        entryDate: formDate,
        documentDate: formDocDate,
        referenceCode: formRefCode.trim() || undefined,
        sourceModule: formSource,
        sourceLabel: sourceMap[formSource] || 'Thủ công',
        description: formDescription.trim(),
        createdBy: 'Kế toán tổng hợp',
        lines: formLines.map((l) => {
          const acc = chartOfAccounts.find((a) => a.code === l.accountId);
          return {
            accountId: l.accountId,
            accountCode: l.accountId,
            accountName: acc ? acc.name : l.accountId,
            type: l.type,
            amount: Number(l.amount || 0),
            description: l.description.trim() || formDescription.trim(),
            partner: l.partner.trim() || undefined,
          };
        }),
      };

      const res = await fetch('/api/finance/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Lỗi khi lưu bút toán vào cơ sở dữ liệu');
      }

      const result = await res.json();
      await fetchEntries();
      notifyFinanceUpdated('general_journal', 'create');

      setIsAddOpen(false);

      // Reset form
      setFormDescription('');
      setFormRefCode('');
      setFormLines([
        { accountId: '1521', type: 'DEBIT', amount: '', description: '', partner: '' },
        { accountId: '331', type: 'CREDIT', amount: '', description: '', partner: '' },
      ]);

      if (onShowToast) {
        onShowToast('success', 'Ghi sổ thành công', `Đã ghi nhận và lưu trữ bút toán ${result.entryNumber || ''} vào Sổ nhật ký chung.`);
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'Lỗi ghi sổ', err.message || 'Không thể lưu bút toán vào hệ thống');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=1100,height=850');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sổ Nhật Ký Chung - Mẫu S03a-DN</title>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; margin: 0; padding: 20px; }
            .header-table { width: 100%; margin-bottom: 20px; }
            .title-box { text-align: center; margin: 20px 0; }
            .title { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .subtitle { font-style: italic; font-size: 11pt; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            table.data-table th, table.data-table td { border: 1px solid #000; padding: 5px 8px; font-size: 10pt; }
            table.data-table th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .fw-bold { font-weight: bold; }
            .signatures { width: 100%; margin-top: 40px; }
            .signatures td { text-align: center; vertical-align: top; padding: 0 10px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  const getSourceBadge = (source: JournalEntry['sourceModule']) => {
    switch (source) {
      case 'PROCUREMENT':
        return (
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            Mua hàng
          </span>
        );
      case 'SALES':
        return (
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            Bán hàng
          </span>
        );
      case 'CASH':
        return (
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
            Quỹ / NH
          </span>
        );
      case 'LOGISTICS':
        return (
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            Kho vận
          </span>
        );
      case 'ADVANCE':
        return (
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(168, 85, 247, 0.12)', color: '#9333ea', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            Tạm ứng
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            Thủ công
          </span>
        );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-surface-1)',
      }}
    >
      {/* 1. RIBBON THÔNG TIN TỔNG QUAN VÀ CÂN ĐỐI PHÁT SINH */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface-2)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {/* Card 1: Số bút toán */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-surface-1)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <JournalText size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Tổng chứng từ
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {kpiStats.count} <span style={{ fontSize: '0.71875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>bút toán</span>
            </div>
          </div>
        </div>

        {/* Card 2: Tổng phát sinh Nợ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-surface-1)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ArrowDownLeft size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Tổng phát sinh Nợ
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(kpiStats.totalDebit)}
            </div>
          </div>
        </div>

        {/* Card 3: Tổng phát sinh Có */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-surface-1)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(14, 165, 233, 0.12)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ArrowUpRight size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Tổng phát sinh Có
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(kpiStats.totalCredit)}
            </div>
          </div>
        </div>

        {/* Card 4: Kiểm tra cân đối kép */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-surface-1)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: kpiStats.isBalanced ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: kpiStats.isBalanced ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {kpiStats.isBalanced ? <Check2Circle size={20} /> : <ExclamationCircle size={20} />}
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Cân đối định khoản
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: kpiStats.isBalanced ? '#10b981' : '#ef4444' }}>
              {kpiStats.isBalanced ? '✓ Tổng Nợ = Tổng Có' : `Lệch: ${formatCurrency(kpiStats.diff)}`}
            </div>
          </div>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ TÌM KIẾM VÀ BỘ LỌC */}
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm theo số CT, diễn giải, tài khoản..."
        searchMinWidth="220px"
        filters={[
          {
            id: 'period-filter',
            value: periodFilter,
            onChange: (val) => {
              setPeriodFilter(val);
              setCurrentPage(1);
            },
            minWidth: '150px',
            ariaLabel: 'Kỳ kế toán ghi sổ',
            options: getReportingPeriods(),
          },
          {
            id: 'source-filter',
            value: sourceFilter,
            onChange: (val) => {
              setSourceFilter(val);
              setCurrentPage(1);
            },
            minWidth: '140px',
            ariaLabel: 'Lọc nguồn phát sinh',
            options: [
              { value: 'all', label: 'Tất cả nguồn' },
              { value: 'PROCUREMENT', label: 'Mua hàng' },
              { value: 'SALES', label: 'Bán hàng' },
              { value: 'CASH', label: 'Quỹ và Ngân hàng' },
              { value: 'LOGISTICS', label: 'Kho vận' },
              { value: 'ADVANCE', label: 'Tạm ứng' },
              { value: 'MANUAL', label: 'Thủ công' },
            ],
          },
          {
            id: 'account-filter',
            value: accountFilter,
            onChange: (val) => {
              setAccountFilter(val);
              setCurrentPage(1);
            },
            minWidth: '160px',
            ariaLabel: 'Lọc theo tài khoản',
            options: [
              { value: 'all', label: 'Tất cả tài khoản' },
              { value: '111', label: 'TK 111 - Tiền mặt' },
              { value: '112', label: 'TK 112 - Tiền gửi NH' },
              { value: '131', label: 'TK 131 - Phải thu KH' },
              { value: '141', label: 'TK 141 - Tạm ứng' },
              { value: '152', label: 'TK 152 - Nguyên vật liệu' },
              { value: '155', label: 'TK 155 - Thành phẩm' },
              { value: '331', label: 'TK 331 - Phải trả NCC' },
              { value: '511', label: 'TK 511 - Doanh thu' },
              { value: '621', label: 'TK 621 - CP NVL trực tiếp' },
              { value: '627', label: 'TK 627 - CP sản xuất chung' },
              { value: '642', label: 'TK 642 - CP quản lý' },
            ],
          },
        ]}
        actionsAfterSearch={
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={Object.keys(expandedRowIds).length > 0 ? collapseAll : expandAll}
            title={Object.keys(expandedRowIds).length > 0 ? 'Thu gọn tất cả chi tiết' : 'Mở rộng tất cả chi tiết'}
            style={{
              height: '34px',
              fontSize: '0.71875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '6px',
            }}
          >
            <Layers size={13} />
            <span>{Object.keys(expandedRowIds).length > 0 ? 'Thu gọn' : 'Bung chi tiết'}</span>
          </button>
        }
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrintModalOpen(true)}
              title="In Sổ nhật ký chung (Mẫu S03a-DN)"
              aria-label="In Sổ nhật ký chung (Mẫu S03a-DN)"
              style={{
                width: '34px',
                height: '34px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
            >
              <Printer size={15} />
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => setIsAddOpen(true)}
              style={{
                height: '34px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
              }}
            >
              Thêm bút toán
            </Button>
          </div>
        }
        style={{
          padding: '10px 16px',
          marginBottom: 0,
          backgroundColor: 'var(--bg-surface-1)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      />

      {/* 3. BẢNG DỮ LIỆU SỔ NHẬT KÝ CHUNG */}
      <div
        className="table-responsive custom-scrollbar"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
        }}
      >
        <table className="custom-table" style={{ width: '100%' }}>
          <thead>
            <tr style={{ textTransform: 'uppercase' }}>
              <th style={{ width: '40px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.71875rem' }}>
                #
              </th>
              <th style={{ width: '105px', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.71875rem' }}>
                Ngày ghi sổ
              </th>
              <th style={{ width: '180px', minWidth: '180px', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.71875rem' }}>
                Chứng từ
              </th>
              <th style={{ minWidth: '280px', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.71875rem' }}>
                Diễn giải nghiệp vụ
              </th>
              <th style={{ width: '90px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.71875rem' }}>
                Tài khoản
              </th>
              <th style={{ width: '140px', textAlign: 'right', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.71875rem' }}>
                Số phát sinh Nợ
              </th>
              <th style={{ width: '140px', textAlign: 'right', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.71875rem' }}>
                Số phát sinh Có
              </th>
              <th style={{ width: '105px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.71875rem' }}>
                Phân hệ
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedEntries.map((entry) => {
              const isExpanded = !!expandedRowIds[entry.id];
              return (
                <React.Fragment key={entry.id}>
                  {/* Dòng tóm tắt nghiệp vụ chính */}
                  <tr
                    onClick={() => toggleExpand(entry.id)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isExpanded ? 'rgba(99, 102, 241, 0.05)' : undefined,
                    }}
                    title="Nhấn để xem chi tiết các dòng định khoản Nợ / Có"
                  >
                    {/* Toggle expand button */}
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleExpand(entry.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                        }}
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    </td>

                    {/* Ngày ghi sổ */}
                    <td style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {formatDate(entry.entryDate)}
                    </td>

                    {/* Số hiệu chứng từ và Tham chiếu */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                          {entry.entryNumber}
                        </span>
                        {entry.referenceCode && (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            TC: {entry.referenceCode}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Diễn giải nghiệp vụ */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {entry.description}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          <span>Ngày lập CT: {formatDate(entry.documentDate)}</span>
                          {entry.createdBy && <span>• Lập bởi: {entry.createdBy}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Cột mã TK tóm tắt */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.6875rem' }}>
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          Nợ {entry.lines.filter((l) => l.type === 'DEBIT').map((l) => l.accountCode).join(', ')}
                        </span>
                        <span style={{ color: '#0284c7', fontWeight: 600 }}>
                          Có {entry.lines.filter((l) => l.type === 'CREDIT').map((l) => l.accountCode).join(', ')}
                        </span>
                      </div>
                    </td>

                    {/* Tổng Nợ */}
                    <td style={{ textAlign: 'right', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(entry.totalAmount)}
                    </td>

                    {/* Tổng Có */}
                    <td style={{ textAlign: 'right', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(entry.totalAmount)}
                    </td>

                    {/* Phân hệ / Nguồn */}
                    <td style={{ textAlign: 'center' }}>
                      {getSourceBadge(entry.sourceModule)}
                    </td>
                  </tr>

                  {/* Các dòng hạch toán chi tiết (khi bung ra) */}
                  {isExpanded &&
                    entry.lines.map((line, lIdx) => (
                      <tr
                        key={line.id || lIdx}
                        style={{
                          backgroundColor: 'var(--bg-surface-2)',
                          fontSize: '0.71875rem',
                        }}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          <span style={{ fontSize: '0.625rem' }}>↳</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}></td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: line.type === 'DEBIT' ? '#059669' : '#0284c7',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: line.type === 'DEBIT' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                            }}
                          >
                            {line.type === 'DEBIT' ? 'Nợ' : 'Có'}
                          </span>
                        </td>
                        <td style={{ paddingLeft: '24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                              {line.description || entry.description}
                            </span>
                            {line.partner && (
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                                Đối tượng: <strong>{line.partner}</strong>
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {line.accountCode}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: line.type === 'DEBIT' ? '#059669' : 'transparent', fontWeight: line.type === 'DEBIT' ? 600 : 400 }}>
                          {line.type === 'DEBIT' ? formatCurrency(line.amount) : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: line.type === 'CREDIT' ? '#0284c7' : 'transparent', fontWeight: line.type === 'CREDIT' ? 600 : 400 }}>
                          {line.type === 'CREDIT' ? formatCurrency(line.amount) : '-'}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {line.accountName}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}

            {paginatedEntries.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: 'center',
                    padding: '48px 20px',
                    color: 'var(--text-muted)',
                    fontSize: '0.8125rem',
                  }}
                >
                  Không tìm thấy bút toán nào trong kỳ kế toán hoặc bộ lọc tìm kiếm đã chọn.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. PHÂN TRANG */}
      <div
        className="pagination-container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderTop: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface-1)',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Hiển thị <strong>{filteredEntries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> -{' '}
          <strong>{Math.min(currentPage * pageSize, filteredEntries.length)}</strong> trong tổng số{' '}
          <strong>{filteredEntries.length}</strong> bút toán
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredEntries.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </div>

      {/* 5. OFFCANVAS THÊM BÚT TOÁN THỦ CÔNG (CHUẨN 400PX) */}
      <Offcanvas
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        icon={<JournalText size={22} />}
        title="Thêm bút toán ghi sổ"
        description="Ghi nhận nghiệp vụ kế toán kép vào Sổ nhật ký chung"
        width="400px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!isFormBalanced || !formDescription.trim() || isSubmitting}
              leftIcon={<Check2Circle size={15} />}
              onClick={handleSaveEntry}
            >
              {isSubmitting ? 'Đang ghi sổ...' : 'Ghi sổ chứng từ'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78125rem' }}>
          {/* Hàng 1: Ngày ghi sổ và Ngày chứng từ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Input
              label="Ngày ghi sổ"
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <Input
              label="Ngày CT gốc"
              type="date"
              value={formDocDate}
              onChange={(e) => setFormDocDate(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          {/* Hàng 2: Số chứng từ tham chiếu và Phân hệ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '8px' }}>
            <Input
              label="Số CT gốc / HĐ"
              placeholder="VD: HĐ-002918"
              value={formRefCode}
              onChange={(e) => setFormRefCode(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <Select
              label="Phân hệ"
              value={formSource}
              onChange={(e) => setFormSource(e.target.value as any)}
              options={[
                { value: 'MANUAL', label: 'Thủ công' },
                { value: 'PROCUREMENT', label: 'Mua hàng' },
                { value: 'SALES', label: 'Bán hàng' },
                { value: 'CASH', label: 'Quỹ và NH' },
                { value: 'LOGISTICS', label: 'Kho vận' },
                { value: 'ADVANCE', label: 'Tạm ứng' },
                { value: 'PRODUCTION', label: 'Sản xuất' },
              ]}
              style={{ marginBottom: 0 }}
            />
          </div>

          {/* Hàng 3: Diễn giải chung */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
              Diễn giải chung nghiệp vụ <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Nội dung tóm tắt nghiệp vụ kinh tế tài chính..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              style={{
                width: '100%',
                resize: 'none',
                fontSize: '0.78125rem',
                padding: '6px 10px',
                lineHeight: 1.4,
              }}
            />
          </div>

          {/* Hàng 4: Bảng định khoản đa dòng */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.71875rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Chi tiết định khoản (Nợ / Có)
              </label>
              <button
                type="button"
                className="btn btn-link btn-sm p-0"
                onClick={handleAddLine}
                style={{ fontSize: '0.71875rem', textDecoration: 'none', color: 'var(--color-primary)', fontWeight: 600 }}
              >
                + Thêm dòng
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {formLines.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--bg-surface-2)',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {/* Top row: Nợ/Có + Tài khoản + Nút Xóa */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '72px', flexShrink: 0 }}>
                      <select
                        className="form-select"
                        value={line.type}
                        onChange={(e) => handleLineChange(idx, 'type', e.target.value)}
                        style={{
                          height: '32px',
                          padding: '0 16px 0 8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: line.type === 'DEBIT' ? '#059669' : '#0284c7',
                          backgroundColor: line.type === 'DEBIT' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(14, 165, 233, 0.08)',
                          borderColor: line.type === 'DEBIT' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(14, 165, 233, 0.3)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="DEBIT">Nợ</option>
                        <option value="CREDIT">Có</option>
                      </select>
                    </div>

                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <select
                        className="form-select"
                        value={line.accountId}
                        onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                        style={{
                          height: '32px',
                          padding: '0 20px 0 8px',
                          fontSize: '0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          width: '100%',
                        }}
                      >
                        {CHART_OF_ACCOUNTS.map((acc) => (
                          <option key={acc.code} value={acc.code}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formLines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        title="Xóa dòng định khoản"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>

                  {/* Middle row: Số tiền */}
                  <div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Số tiền phát sinh (VNĐ)..."
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        height: '32px',
                        fontSize: '0.8125rem',
                        color: line.type === 'DEBIT' ? '#059669' : '#0284c7',
                      }}
                      value={line.amount ? new Intl.NumberFormat('vi-VN').format(Number(line.amount)) : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        handleLineChange(idx, 'amount', raw ? Number(raw) : '');
                      }}
                    />
                  </div>

                  {/* Bottom row: Diễn giải và Đối tượng */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Diễn giải dòng..."
                      value={line.description}
                      onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                      style={{ fontSize: '0.6875rem', height: '28px', padding: '0 8px' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Đối tượng (NCC/KH)..."
                      value={line.partner}
                      onChange={(e) => handleLineChange(idx, 'partner', e.target.value)}
                      style={{ fontSize: '0.6875rem', height: '28px', padding: '0 8px' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Khối tổng cộng và kiểm tra cân đối */}
            <div
              style={{
                marginTop: '10px',
                padding: '10px 12px',
                backgroundColor: isFormBalanced ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                borderRadius: '8px',
                border: isFormBalanced ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tổng Nợ:</span>
                <strong style={{ color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(formTotalDebit)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tổng Có:</span>
                <strong style={{ color: '#0284c7', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(formTotalCredit)}</strong>
              </div>
              {!isFormBalanced ? (
                <div style={{ fontSize: '0.6875rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <ExclamationCircle size={12} />
                  <span>Chưa cân bằng! Chênh lệch: {formatCurrency(Math.abs(formTotalDebit - formTotalCredit))}</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Check2Circle size={12} />
                  <span>Định khoản cân đối hoàn hảo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Offcanvas>

      {/* 6. MODAL XEM TRƯỚC VÀ IN SỔ NHẬT KÝ CHUNG CHUẨN THÔNG TƯ 200 */}
      {isPrintModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsPrintModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={18} style={{ color: '#4f46e5' }} />
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  Mẫu in Sổ Nhật Ký Chung (Mẫu số S03a-DN theo TT 200/2014/TT-BTC)
                </span>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsPrintModalOpen(false)}
              />
            </div>

            {/* Vùng nội dung in */}
            <div
              className="custom-scrollbar"
              style={{
                flex: '1 1 0%',
                overflowY: 'auto',
                padding: '24px 30px',
                backgroundColor: '#ffffff',
              }}
            >
              <div ref={printAreaRef}>
                {/* Đầu trang */}
                <table className="header-table" style={{ width: '100%', marginBottom: '16px' }}>
                  <tbody>
                    <tr>
                      <td style={{ verticalAlign: 'top', width: '60%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM</div>
                        <div style={{ fontSize: '9.5pt', color: '#334155' }}>Sản xuất đồ gỗ xây dựng và Cửa chống cháy</div>
                        <div style={{ fontSize: '9pt', color: '#64748b' }}>KCN Bình Xuyên, Tỉnh Vĩnh Phúc / TP. Hà Nội</div>
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'right', width: '40%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>Mẫu số S03a-DN</div>
                        <div style={{ fontSize: '8.5pt', fontStyle: 'italic', color: '#475569' }}>
                          (Ban hành theo Thông tư số 200/2014/TT-BTC
                          <br />
                          ngày 22/12/2014 của Bộ Tài chính)
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tiêu đề sổ */}
                <div style={{ textAlign: 'center', margin: '20px 0 16px' }}>
                  <div style={{ fontSize: '16pt', fontWeight: 'bold', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                    SỔ NHẬT KÝ CHUNG
                  </div>
                  <div style={{ fontSize: '10pt', fontStyle: 'italic', marginTop: '4px' }}>
                    Kỳ kế toán: {formatPeriodLabel(periodFilter)}
                  </div>
                  <div style={{ fontSize: '9pt', color: '#64748b', marginTop: '2px' }}>
                    Đơn vị tính: Đồng Việt Nam (VNĐ)
                  </div>
                </div>

                {/* Bảng kê chi tiết nghiệp vụ chuẩn Thông tư 200 */}
                <table
                  className="data-table"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '9.5pt',
                    border: '1px solid #000',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '75px' }}>
                        Ngày ghi sổ
                      </th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '85px' }}>
                        Số hiệu CT
                      </th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '75px' }}>
                        Ngày CT
                      </th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>
                        Diễn giải nghiệp vụ phát sinh
                      </th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '60px' }}>
                        TK Nợ
                      </th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '60px' }}>
                        TK Có
                      </th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', width: '120px' }}>
                        Số phát sinh Nợ
                      </th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', width: '120px' }}>
                        Số phát sinh Có
                      </th>
                    </tr>
                    <tr style={{ backgroundColor: '#f8fafc', fontSize: '8.5pt', fontStyle: 'italic', textAlign: 'center' }}>
                      <td style={{ border: '1px solid #000' }}>A</td>
                      <td style={{ border: '1px solid #000' }}>B</td>
                      <td style={{ border: '1px solid #000' }}>C</td>
                      <td style={{ border: '1px solid #000' }}>D</td>
                      <td style={{ border: '1px solid #000' }}>E</td>
                      <td style={{ border: '1px solid #000' }}>F</td>
                      <td style={{ border: '1px solid #000' }}>1</td>
                      <td style={{ border: '1px solid #000' }}>2</td>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <React.Fragment key={entry.id}>
                        {entry.lines.map((line, lIdx) => (
                          <tr key={line.id || lIdx}>
                            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                              {lIdx === 0 ? formatDate(entry.entryDate) : ''}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: lIdx === 0 ? 'bold' : 'normal' }}>
                              {lIdx === 0 ? entry.entryNumber : ''}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                              {lIdx === 0 ? formatDate(entry.documentDate) : ''}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px 8px' }}>
                              {line.description || entry.description}
                              {line.partner ? ` (${line.partner})` : ''}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                              {line.type === 'DEBIT' ? line.accountCode : ''}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                              {line.type === 'CREDIT' ? line.accountCode : ''}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right' }}>
                              {line.type === 'DEBIT' ? new Intl.NumberFormat('vi-VN').format(line.amount) : ''}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right' }}>
                              {line.type === 'CREDIT' ? new Intl.NumberFormat('vi-VN').format(line.amount) : ''}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}

                    {/* Dòng tổng cộng phát sinh */}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
                      <td colSpan={6} style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>
                        CỘNG SỐ PHÁT SINH TRONG KỲ
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                        {new Intl.NumberFormat('vi-VN').format(kpiStats.totalDebit)}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                        {new Intl.NumberFormat('vi-VN').format(kpiStats.totalCredit)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Chữ ký cuối trang */}
                <table className="signatures" style={{ width: '100%', marginTop: '30px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold' }}>Người lập biểu</div>
                        <div style={{ fontSize: '8.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        <div style={{ marginTop: '55px', fontWeight: 'bold' }}>Nguyễn Văn Kế Toán</div>
                      </td>
                      <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold' }}>Kế toán trưởng</div>
                        <div style={{ fontSize: '8.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        <div style={{ marginTop: '55px', fontWeight: 'bold' }}>Trần Thị Thu Thảo</div>
                      </td>
                      <td style={{ width: '34%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div style={{ fontStyle: 'italic', fontSize: '9pt' }}>
                          {currentDateFormatted}
                        </div>
                        <div style={{ fontWeight: 'bold', marginTop: '2px' }}>Tổng Giám đốc</div>
                        <div style={{ fontSize: '8.5pt', fontStyle: 'italic' }}>(Ký, họ tên, đóng dấu)</div>
                        <div style={{ marginTop: '55px', fontWeight: 'bold' }}>Hà Hải Lâm</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                padding: '12px 18px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsPrintModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handlePrint}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
              >
                <Printer size={15} />
                <span>In ra máy in / Lưu PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
