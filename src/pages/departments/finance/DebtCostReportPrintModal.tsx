import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Sliders,
  Building,
} from 'react-bootstrap-icons';
import { PrintPreview } from '../../../components/common/PrintPreview';
import { Toggle } from '../../../components/common/Toggle';
import { Select } from '../../../components/common/Select';
import { useCompanyInfo } from '../../../hooks/useCompanyInfo';
import type { ReceivableItem, PayableItem, LoanItem, ExpenseItem } from './DebtCostManagementView';

export interface DebtCostReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  receivables: ReceivableItem[];
  payables: PayableItem[];
  loans: LoanItem[];
  expenses: ExpenseItem[];
  selectedYear?: string;
  fixedAssetDepreciationMonthly?: { prod: number; sales: number; admin: number; total: number };
  dbFixedAssets?: any[];
}

// Định dạng tiền tệ phân tách hàng nghìn
const formatCurrency = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/\D/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
};

export const DebtCostReportPrintModal: React.FC<DebtCostReportPrintModalProps> = ({
  isOpen,
  onClose,
  currentStep,
  receivables,
  payables,
  loans,
  expenses,
  selectedYear = '2026',
  fixedAssetDepreciationMonthly = { prod: 0, sales: 0, admin: 0, total: 0 },
  dbFixedAssets: _dbFixedAssets = [],
}) => {
  const company = useCompanyInfo();

  // Loại báo cáo đang xem: 'receivable' (Thu) | 'payable' (Trả) | 'loan' (Nợ vay) | 'expense' (Chi phí)
  const [reportType, setReportType] = useState<'receivable' | 'payable' | 'loan' | 'expense'>('receivable');

  // Tùy chọn hiển thị
  const [includeSummaryKpis, setIncludeSummaryKpis] = useState(true);
  const [includeSubEntries, setIncludeSubEntries] = useState(false);
  const [onlyActiveDebts, setOnlyActiveDebts] = useState(false);

  // Người ký mặc định
  const [preparedBy, setPreparedBy] = useState('Hà Thị Mai');
  const [preparedRole, setPreparedRole] = useState('Kế toán thanh toán & Công nợ');
  const [chiefAccountant, setChiefAccountant] = useState('Nguyễn Thị Thu');
  const [chiefRole, setChiefRole] = useState('Kế toán trưởng');
  const [directorName, setDirectorName] = useState('Hà Hải Lâm');
  const [directorRole, setDirectorRole] = useState('Tổng Giám đốc');

  // Đồng bộ loại báo cáo khi mở modal hoặc thay đổi bước
  useEffect(() => {
    if (isOpen) {
      if (currentStep === 1) setReportType('receivable');
      else if (currentStep === 2) setReportType('payable');
      else if (currentStep === 3) setReportType('loan');
      else setReportType('expense');
    }
  }, [isOpen, currentStep]);

  // Tiêu đề & Mã báo cáo tự động
  const reportInfo = useMemo(() => {
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const dateFormatted = `${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

    switch (reportType) {
      case 'receivable':
        return {
          title: 'BÁO CÁO TỔNG HỢP CÔNG NỢ PHẢI THU KHÁCH HÀNG',
          code: `BC-CNPT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`,
          subtitle: `(V/v: Đối soát và theo dõi tình hình thu hồi công nợ theo hợp đồng kinh tế - Cập nhật ngày ${dateStr})`,
          dateStr,
          dateFormatted,
        };
      case 'payable':
        return {
          title: 'BÁO CÁO TỔNG HỢP CÔNG NỢ PHẢI TRẢ NHÀ CUNG CẤP',
          code: `BC-CNPTRA-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`,
          subtitle: `(V/v: Theo dõi công nợ vật tư, phụ kiện và thanh toán đơn đặt hàng PO - Cập nhật ngày ${dateStr})`,
          dateStr,
          dateFormatted,
        };
      case 'loan':
        return {
          title: 'BÁO CÁO TÌNH HÌNH DƯ NỢ TÍN DỤNG VÀ NỢ VAY NGÂN HÀNG',
          code: `BC-NOVAY-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`,
          subtitle: `(V/v: Quản lý hạn mức tín dụng, nợ gốc đến hạn và chi phí lãi vay - Cập nhật ngày ${dateStr})`,
          dateStr,
          dateFormatted,
        };
      case 'expense':
      default:
        return {
          title: `BÁO CÁO TỔNG HỢP CHI PHÍ HOẠT ĐỘNG & KHẤU HAO TSCĐ NĂM ${selectedYear}`,
          code: `BC-CHIPHI-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`,
          subtitle: `(V/v: Kiểm soát chi phí vận hành, lệnh chi tạm ứng và trích khấu hao TSCĐ định kỳ - Cập nhật ngày ${dateStr})`,
          dateStr,
          dateFormatted,
        };
    }
  }, [reportType, selectedYear]);

  // Lọc dữ liệu theo tùy chọn
  const displayReceivables = useMemo(() => {
    if (!onlyActiveDebts) return receivables;
    return receivables.filter((r) => Number(r.remainingAmount) > 0);
  }, [receivables, onlyActiveDebts]);

  const displayPayables = useMemo(() => {
    if (!onlyActiveDebts) return payables;
    return payables.filter((p) => Number(p.remainingAmount) > 0);
  }, [payables, onlyActiveDebts]);

  const displayLoans = useMemo(() => {
    if (!onlyActiveDebts) return loans;
    return loans.filter((l) => Number(l.remainingPrincipal) > 0);
  }, [loans, onlyActiveDebts]);

  const displayExpenses = useMemo(() => {
    return expenses;
  }, [expenses]);

  // Thống kê KPI tương ứng từng báo cáo
  const kpis = useMemo(() => {
    if (reportType === 'receivable') {
      const totalContract = receivables.reduce((sum, r) => sum + (Number(r.contractValue) || (Number(r.paidAmount) + Number(r.remainingAmount)) || 0), 0);
      const totalPaid = receivables.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
      const totalRemaining = receivables.reduce((sum, r) => sum + (Number(r.remainingAmount) || 0), 0);
      const totalOverdue = receivables
        .filter((r) => r.status === 'overdue')
        .reduce((sum, r) => sum + (Number(r.remainingAmount) || 0), 0);
      const rate = totalContract > 0 ? ((totalPaid / totalContract) * 100).toFixed(1) : '0';
      return { totalContract, totalPaid, totalRemaining, totalOverdue, rate };
    }
    if (reportType === 'payable') {
      const totalPO = payables.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
      const totalPaid = payables.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
      const totalRemaining = payables.reduce((sum, p) => sum + (Number(p.remainingAmount) || 0), 0);
      const totalOverdue = payables
        .filter((p) => p.status === 'overdue')
        .reduce((sum, p) => sum + (Number(p.remainingAmount) || 0), 0);
      const rate = totalPO > 0 ? ((totalPaid / totalPO) * 100).toFixed(1) : '0';
      return { totalPO, totalPaid, totalRemaining, totalOverdue, rate };
    }
    if (reportType === 'loan') {
      const totalLimit = loans.reduce((sum, l) => sum + (Number(l.loanLimit) || 0), 0);
      const totalRemaining = loans.reduce((sum, l) => sum + (Number(l.remainingPrincipal) || 0), 0);
      const totalDue12m = loans.reduce((sum, l) => sum + (Number(l.dueWithin12m) || 0), 0);
      const totalMonthlyInterest = loans.reduce((sum, l) => sum + (Number(l.monthlyInterestEst) || 0), 0);
      return { totalLimit, totalRemaining, totalDue12m, totalMonthlyInterest };
    }
    // Expense
    const totalExp = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) + (fixedAssetDepreciationMonthly.total * 10);
    const totalPaid = expenses.filter((e) => e.status === 'approved').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const monthlyDeprec = fixedAssetDepreciationMonthly.total;
    return { totalExp, totalPaid, monthlyDeprec };
  }, [reportType, receivables, payables, loans, expenses, fixedAssetDepreciationMonthly]);

  if (!isOpen) return null;

  return (
    <PrintPreview
      isOpen={isOpen}
      onClose={onClose}
      documentTitle={reportInfo.title}
      documentCode={reportInfo.code}
      date={reportInfo.dateFormatted}
      department="Phòng Tài chính - Kế toán"
      author={preparedBy}
      performerName={preparedBy}
      performerRole={preparedRole}
      supervisorName={directorName}
      supervisorRole={directorRole}
      defaultOrientation="landscape"
      defaultPaperSize="A4"
      defaultMarginLeft={15}
      defaultMarginRight={15}
      defaultMarginTop={15}
      defaultMarginBottom={15}
      sidebarTitle="Tùy biến báo cáo tài chính"
      sidebarContent={() => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Chọn loại báo cáo */}
          <div className="print-sidebar-section">
            <div className="print-sidebar-section-title">
              <FileText size={14} />
              <span>Loại báo cáo tài chính</span>
            </div>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              options={[
                { value: 'receivable', label: '1. Báo cáo Công nợ phải thu' },
                { value: 'payable', label: '2. Báo cáo Công nợ phải trả' },
                { value: 'loan', label: '3. Báo cáo Nợ vay ngân hàng' },
                { value: 'expense', label: '4. Báo cáo Quản lý chi phí' },
              ]}
            />
          </div>

          {/* 2. Tùy chọn hiển thị */}
          <div className="print-sidebar-section">
            <div className="print-sidebar-section-title">
              <Sliders size={14} />
              <span>Cấu hình nội dung bản in</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="print-sidebar-toggle-card">
                <Toggle
                  checked={includeSummaryKpis}
                  onChange={setIncludeSummaryKpis}
                  label="Hiển thị thẻ chỉ số KPI tổng hợp"
                />
              </div>

              {(reportType === 'receivable' || reportType === 'payable') && (
                <>
                  <div className="print-sidebar-toggle-card">
                    <Toggle
                      checked={includeSubEntries}
                      onChange={setIncludeSubEntries}
                      label="Kèm chi tiết từng đợt thanh toán"
                    />
                  </div>
                  <div className="print-sidebar-toggle-card">
                    <Toggle
                      checked={onlyActiveDebts}
                      onChange={setOnlyActiveDebts}
                      label="Chỉ in các khoản còn dư nợ"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. Phê duyệt & Chữ ký */}
          <div className="print-sidebar-section">
            <div className="print-sidebar-section-title">
              <Building size={14} />
              <span>Thông tin ký duyệt báo cáo</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  Người lập biểu:
                </label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '4px' }}
                />
                <input
                  type="text"
                  value={preparedRole}
                  onChange={(e) => setPreparedRole(e.target.value)}
                  placeholder="Chức danh người lập"
                  style={{ width: '100%', padding: '5px 10px', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  Kế toán trưởng:
                </label>
                <input
                  type="text"
                  value={chiefAccountant}
                  onChange={(e) => setChiefAccountant(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '4px' }}
                />
                <input
                  type="text"
                  value={chiefRole}
                  onChange={(e) => setChiefRole(e.target.value)}
                  placeholder="Chức danh kế toán trưởng"
                  style={{ width: '100%', padding: '5px 10px', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  Giám đốc phê duyệt:
                </label>
                <input
                  type="text"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '4px' }}
                />
                <input
                  type="text"
                  value={directorRole}
                  onChange={(e) => setDirectorRole(e.target.value)}
                  placeholder="Chức danh giám đốc"
                  style={{ width: '100%', padding: '5px 10px', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    >
      {(meta) => (
        <div style={{ color: '#0f172a', fontFamily: '"Times New Roman", Times, serif', fontSize: '10pt', lineHeight: 1.4 }}>
          {/* HEADER CÔNG TY & QUỐC HIỆU */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: '12px',
              borderBottom: '2px solid #003087',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '60%' }}>
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.short_name || 'Logo'}
                  style={{ height: '48px', maxWidth: '110px', objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '6px',
                    backgroundColor: '#003087',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1rem',
                  }}
                >
                  DCD
                </div>
              )}
              <div>
                <div style={{ fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase', color: '#003087' }}>
                  {company.company_name || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
                </div>
                <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '2px' }}>
                  {company.address || 'LK7D4, KĐT Cầu Diễn, Phường Phú Diễn, Bắc Từ Liêm, Hà Nội'}
                </div>
                <div style={{ fontSize: '8.5pt', color: '#64748b' }}>
                  MST: {company.tax_code || '0109886688'} | ĐT: {company.phone || '0969309489 | 1900 633 862'} | Email: {company.email || 'contact@seajong.com'}
                </div>
              </div>
            </div>

            {/* TIÊU ĐỀ BÁO CÁO THAY THẾ CHO QUỐC HIỆU */}
            <div style={{ textAlign: 'right', minWidth: '44%', maxWidth: '48%' }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: '12.5pt',
                  color: '#003087',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  lineHeight: 1.25,
                }}
              >
                {meta.title}
              </div>
              <div style={{ fontSize: '8.5pt', fontStyle: 'italic', color: '#475569', marginTop: '3px', lineHeight: 1.3 }}>
                {reportInfo.subtitle}
              </div>
              <div style={{ fontSize: '8.5pt', color: '#64748b', marginTop: '4px' }}>
                Số: <strong style={{ color: '#0f172a' }}>{meta.code}</strong> • Đơn vị tính: <strong style={{ color: '#0f172a' }}>Việt Nam Đồng (VNĐ)</strong>
              </div>
            </div>
          </div>

          {/* THẺ CHỈ SỐ KPI TỔNG HỢP (EXECUTIVE SUMMARY) */}
          {includeSummaryKpis && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: reportType === 'loan' ? 'repeat(4, 1fr)' : reportType === 'expense' ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              {reportType === 'receivable' && (
                <>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '8pt', color: '#166534', fontWeight: 700 }}>TỔNG GIÁ TRỊ HỢP ĐỒNG</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalContract)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '8pt', color: '#1e40af', fontWeight: 700 }}>ĐÃ THU HỒI ({kpis.rate}%)</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalPaid)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '8pt', color: '#92400e', fontWeight: 700 }}>DƯ NỢ CÒN PHẢI THU</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalRemaining)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '8pt', color: '#991b1b', fontWeight: 700 }}>NỢ QUÁ HẠN CẦN THU</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalOverdue)} đ
                    </div>
                  </div>
                </>
              )}

              {reportType === 'payable' && (
                <>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '8pt', color: '#334155', fontWeight: 700 }}>TỔNG TIỀN HÀNG (PO)</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalPO)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '8pt', color: '#1e40af', fontWeight: 700 }}>ĐÃ THANH TOÁN NCC ({kpis.rate}%)</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalPaid)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '8pt', color: '#92400e', fontWeight: 700 }}>CÒN PHẢI TRẢ NCC</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalRemaining)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '8pt', color: '#991b1b', fontWeight: 700 }}>QUÁ HẠN THANH TOÁN</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalOverdue)} đ
                    </div>
                  </div>
                </>
              )}

              {reportType === 'loan' && (
                <>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '8pt', color: '#166534', fontWeight: 700 }}>TỔNG HẠN MỨC CẤP</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalLimit)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '8pt', color: '#1e40af', fontWeight: 700 }}>DƯ NỢ GỐC THỰC TẾ</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalRemaining)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '8pt', color: '#92400e', fontWeight: 700 }}>GỐC ĐẾN HẠN 12T (MÃ 320)</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalDue12m)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#faf5ff', borderRadius: '6px', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: '8pt', color: '#6b21a8', fontWeight: 700 }}>LÃI VAY DỰ TÍNH / THÁNG</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#7e22ce', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalMonthlyInterest)} đ
                    </div>
                  </div>
                </>
              )}

              {reportType === 'expense' && (
                <>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '8pt', color: '#334155', fontWeight: 700 }}>TỔNG CHI PHÍ NĂM {selectedYear}</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalExp)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '8pt', color: '#1e40af', fontWeight: 700 }}>ĐÃ DUYỆT CHI TIỀN MẶT / CK</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
                      {formatCurrency(kpis.totalPaid)} đ
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#faf5ff', borderRadius: '6px', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: '8pt', color: '#6b21a8', fontWeight: 700 }}>TRÍCH KHẤU HAO TSCĐ / THÁNG</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#7e22ce', marginTop: '2px' }}>
                      {formatCurrency(kpis.monthlyDeprec)} đ
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* BẢNG DỮ LIỆU ĐỐI SOÁT CHI TIẾT */}
          <div style={{ marginBottom: '16px' }}>
            {/* 1. BẢNG CÔNG NỢ PHẢI THU */}
            {reportType === 'receivable' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '35px', fontWeight: 800, border: '1px solid #cbd5e1' }}>STT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '110px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Mã HĐ</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 800, border: '1px solid #cbd5e1' }}>Khách hàng & Dự án</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '125px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Giá trị HĐ (VNĐ)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '120px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Đã thu (VNĐ)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '125px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Còn phải thu (VNĐ)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '90px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Hạn TT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '110px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {displayReceivables.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 700, color: '#003087', border: '1px solid #cbd5e1' }}>{item.code}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.customerName}</div>
                          <div style={{ fontSize: '8pt', color: '#64748b' }}>{item.customerAddress}</div>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                          {formatCurrency(item.contractValue || (item.paidAmount + item.remainingAmount))}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#166534', border: '1px solid #cbd5e1' }}>
                          {formatCurrency(item.paidAmount)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: item.remainingAmount > 0 ? '#b91c1c' : '#15803d', border: '1px solid #cbd5e1' }}>
                          {formatCurrency(item.remainingAmount)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{item.dueDate || '—'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                          <span
                            style={{
                              fontSize: '8pt',
                              fontWeight: 700,
                              color: item.status === 'completed' ? '#15803d' : item.status === 'overdue' ? '#b91c1c' : item.status === 'due' ? '#b45309' : '#0284c7',
                            }}
                          >
                            {item.statusLabel}
                          </span>
                        </td>
                      </tr>

                      {/* Chi tiết từng đợt thanh toán nếu bật */}
                      {includeSubEntries && item.entries && item.entries.length > 0 && (
                        item.entries.map((entry, eIdx) => (
                          <tr key={entry.id} style={{ backgroundColor: '#f1f5f9', fontSize: '8pt', borderBottom: '1px dashed #cbd5e1' }}>
                            <td style={{ border: '1px solid #cbd5e1', textAlign: 'center' }}>{`${idx + 1}.${eIdx + 1}`}</td>
                            <td style={{ border: '1px solid #cbd5e1', color: '#64748b', paddingLeft: '14px' }}>{entry.code}</td>
                            <td style={{ border: '1px solid #cbd5e1', color: '#334155' }}>
                              ↳ <em>{entry.title}</em>
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', textAlign: 'right', color: '#475569' }}>
                              {formatCurrency(entry.contractValue)}
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', textAlign: 'right', color: '#15803d' }}>
                              {formatCurrency(entry.paidAmount)}
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', textAlign: 'right', color: entry.remainingAmount > 0 ? '#b91c1c' : '#15803d' }}>
                              {formatCurrency(entry.remainingAmount)}
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', textAlign: 'center', color: '#64748b' }}>{entry.dueDate}</td>
                            <td style={{ border: '1px solid #cbd5e1', textAlign: 'center', color: '#475569' }}>{entry.statusLabel}</td>
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  ))}

                  {/* Dòng TỔNG CỘNG */}
                  <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 800, borderTop: '2px solid #64748b', borderBottom: '2px solid #64748b' }}>
                    <td colSpan={3} style={{ padding: '8px', textAlign: 'center', border: '1px solid #94a3b8' }}>
                      TỔNG CỘNG ({displayReceivables.length} KHÁCH HÀNG)
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                      {formatCurrency(kpis.totalContract)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#166534', border: '1px solid #94a3b8' }}>
                      {formatCurrency(kpis.totalPaid)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#b91c1c', border: '1px solid #94a3b8' }}>
                      {formatCurrency(kpis.totalRemaining)}
                    </td>
                    <td colSpan={2} style={{ padding: '8px', textAlign: 'center', border: '1px solid #94a3b8', fontStyle: 'italic', fontSize: '8.5pt' }}>
                      Tỷ lệ thu hồi: <strong>{kpis.rate}%</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* 2. BẢNG CÔNG NỢ PHẢI TRẢ */}
            {reportType === 'payable' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '35px', fontWeight: 800, border: '1px solid #cbd5e1' }}>STT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '115px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Mã PO</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 800, border: '1px solid #cbd5e1' }}>Nhà cung cấp & Địa chỉ</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '125px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Tổng tiền PO (VNĐ)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '120px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Đã trả (VNĐ)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '125px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Còn nợ NCC (VNĐ)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '90px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Hạn TT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '110px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPayables.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: '#003087', border: '1px solid #cbd5e1' }}>{item.poCode || item.code}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.supplierName}</div>
                        <div style={{ fontSize: '8pt', color: '#64748b' }}>{item.supplierAddress}</div>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        {formatCurrency(item.totalAmount)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#166534', border: '1px solid #cbd5e1' }}>
                        {formatCurrency(item.paidAmount)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: item.remainingAmount > 0 ? '#b91c1c' : '#15803d', border: '1px solid #cbd5e1' }}>
                        {formatCurrency(item.remainingAmount)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{item.dueDate || '—'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <span
                          style={{
                            fontSize: '8pt',
                            fontWeight: 700,
                            color: item.status === 'completed' ? '#15803d' : item.status === 'overdue' ? '#b91c1c' : item.status === 'due_soon' ? '#b45309' : '#0284c7',
                          }}
                        >
                          {item.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Dòng TỔNG CỘNG */}
                  <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 800, borderTop: '2px solid #64748b', borderBottom: '2px solid #64748b' }}>
                    <td colSpan={3} style={{ padding: '8px', textAlign: 'center', border: '1px solid #94a3b8' }}>
                      TỔNG CỘNG ({displayPayables.length} ĐƠN VỊ CUNG CẤP)
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                      {formatCurrency(kpis.totalPO)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#166534', border: '1px solid #94a3b8' }}>
                      {formatCurrency(kpis.totalPaid)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#b91c1c', border: '1px solid #94a3b8' }}>
                      {formatCurrency(kpis.totalRemaining)}
                    </td>
                    <td colSpan={2} style={{ padding: '8px', textAlign: 'center', border: '1px solid #94a3b8', fontStyle: 'italic', fontSize: '8.5pt' }}>
                      Tỷ lệ giải ngân: <strong>{kpis.rate}%</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* 3. BẢNG NỢ VAY NGÂN HÀNG */}
            {reportType === 'loan' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }}>
                    <th style={{ padding: '6px 6px', textAlign: 'center', width: '30px', fontWeight: 800, border: '1px solid #cbd5e1' }}>STT</th>
                    <th style={{ padding: '6px 6px', textAlign: 'left', width: '100px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Mã HĐ TD</th>
                    <th style={{ padding: '6px 6px', textAlign: 'left', fontWeight: 800, border: '1px solid #cbd5e1' }}>Ngân hàng cho vay & Tài sản bảo đảm</th>
                    <th style={{ padding: '6px 6px', textAlign: 'center', width: '110px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Hình thức cấp tín dụng</th>
                    <th style={{ padding: '6px 6px', textAlign: 'right', width: '105px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Hạn mức (VNĐ)</th>
                    <th style={{ padding: '6px 6px', textAlign: 'right', width: '110px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Dư nợ gốc (VNĐ)</th>
                    <th style={{ padding: '6px 6px', textAlign: 'right', width: '105px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Gốc đến hạn 12T</th>
                    <th style={{ padding: '6px 6px', textAlign: 'center', width: '65px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Lãi suất</th>
                    <th style={{ padding: '6px 6px', textAlign: 'right', width: '95px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Lãi dự tính/tháng</th>
                    <th style={{ padding: '6px 6px', textAlign: 'center', width: '75px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Đáo hạn</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLoans.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '6px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 6px', fontWeight: 700, color: '#003087', border: '1px solid #cbd5e1' }}>{item.contractCode || item.code}</td>
                      <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.bankName}</div>
                        <div style={{ fontSize: '7.5pt', color: '#64748b' }}>TSĐB: {item.collateralName}</div>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', border: '1px solid #cbd5e1', fontSize: '8pt' }}>
                        {item.facilityLabel}
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        {formatCurrency(item.loanLimit)}
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 800, color: '#003087', border: '1px solid #cbd5e1' }}>
                        {formatCurrency(item.remainingPrincipal)}
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'right', color: '#b45309', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        {formatCurrency(item.dueWithin12m)}
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        {item.interestRate}
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'right', color: '#7e22ce', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        {formatCurrency(item.monthlyInterestEst)}
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{item.maturityDate}</td>
                    </tr>
                  ))}

                  {/* Dòng TỔNG CỘNG */}
                  <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 800, borderTop: '2px solid #64748b', borderBottom: '2px solid #64748b' }}>
                    <td colSpan={4} style={{ padding: '8px', textAlign: 'center', border: '1px solid #94a3b8' }}>
                      TỔNG CỘNG DƯ NỢ ({displayLoans.length} HỢP ĐỒNG TÍN DỤNG)
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                      {formatCurrency(kpis.totalLimit)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#003087', border: '1px solid #94a3b8' }}>
                      {formatCurrency(kpis.totalRemaining)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#b45309', border: '1px solid #94a3b8' }}>
                      {formatCurrency(kpis.totalDue12m)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #94a3b8' }}>—</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#7e22ce', border: '1px solid #94a3b8' }}>
                      {formatCurrency(kpis.totalMonthlyInterest)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #94a3b8' }}>—</td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* 4. BẢNG QUẢN LÝ CHI PHÍ VÀ KHẤU HAO TSCĐ */}
            {reportType === 'expense' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '35px', fontWeight: 800, border: '1px solid #cbd5e1' }}>STT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '115px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Mã phiếu/CT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 800, border: '1px solid #cbd5e1' }}>Nội dung khoản chi phí / Lệnh chi</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '150px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Khoản mục & TK hạch toán</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '120px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Đơn vị / Người chi</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '85px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Ngày chi</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '125px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Số tiền (VNĐ)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '100px', fontWeight: 800, border: '1px solid #cbd5e1' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Mục trích khấu hao TSCĐ định kỳ */}
                  {fixedAssetDepreciationMonthly.total > 0 && (
                    <tr style={{ backgroundColor: '#faf5ff', borderBottom: '1px solid #cbd5e1' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>1</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: '#7c3aed', border: '1px solid #cbd5e1' }}>KH-2026-10</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: 700, color: '#6b21a8' }}>Chi phí khấu hao tài sản cố định (TSCĐ)</div>
                        <div style={{ fontSize: '8pt', color: '#7e22ce' }}>Toàn bộ máy móc sản xuất (627), xe vận tải (641) & thiết bị văn phòng (642)</div>
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontSize: '8pt' }}>
                        <div>Khấu hao TSCĐ</div>
                        <div style={{ color: '#7c3aed', fontWeight: 600 }}>Nợ 627, 641, 642 / Có 2141</div>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1', fontSize: '8pt' }}>
                        Toàn công ty (Tự động)
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>30/10/{selectedYear}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: '#6b21a8', border: '1px solid #cbd5e1' }}>
                        {formatCurrency(fixedAssetDepreciationMonthly.total)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#15803d', fontWeight: 700 }}>
                        Đã trích KH
                      </td>
                    </tr>
                  )}

                  {/* Danh sách các phiếu chi thực tế */}
                  {displayExpenses.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: (idx + 1) % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 2}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: '#003087', border: '1px solid #cbd5e1' }}>{item.code}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                        {item.notes && <div style={{ fontSize: '8pt', color: '#64748b' }}>{item.notes}</div>}
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontSize: '8pt' }}>
                        <div>{item.categoryLabel}</div>
                        {item.debitAccount && (
                          <div style={{ color: '#0284c7' }}>Nợ {item.debitAccount} / Có {item.creditAccount || '1111'}</div>
                        )}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1', fontSize: '8pt' }}>
                        <div>{item.department}</div>
                        <div style={{ color: '#64748b' }}>{item.spender}</div>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{item.spendDate}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <span style={{ fontSize: '8pt', fontWeight: 700, color: item.status === 'approved' ? '#15803d' : '#b45309' }}>
                          {item.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Dòng TỔNG CỘNG */}
                  <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 800, borderTop: '2px solid #64748b', borderBottom: '2px solid #64748b' }}>
                    <td colSpan={6} style={{ padding: '8px', textAlign: 'center', border: '1px solid #94a3b8' }}>
                      TỔNG CỘNG CHI PHÍ PHÁT SINH
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#003087', border: '1px solid #94a3b8' }}>
                      {formatCurrency(expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) + fixedAssetDepreciationMonthly.total)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #94a3b8', fontSize: '8pt', color: '#166534' }}>
                      Hoàn tất
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* CHỮ KÝ PHÊ DUYỆT (3 CỘT CHUẨN KẾ TOÁN) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              textAlign: 'center',
              marginTop: '28px',
              paddingTop: '8px',
              pageBreakInside: 'avoid',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '9.5pt', textTransform: 'uppercase' }}>NGƯỜI LẬP BIỂU</div>
              <div style={{ fontSize: '8.5pt', fontStyle: 'italic', color: '#475569' }}>(Ký, ghi rõ họ tên)</div>
              <div style={{ height: '70px' }} />
              <div style={{ fontWeight: 800, fontSize: '10pt', color: '#0f172a' }}>{preparedBy}</div>
              <div style={{ fontSize: '8.5pt', color: '#64748b' }}>{preparedRole}</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '9.5pt', textTransform: 'uppercase' }}>KẾ TOÁN TRƯỞNG</div>
              <div style={{ fontSize: '8.5pt', fontStyle: 'italic', color: '#475569' }}>(Ký, ghi rõ họ tên)</div>
              <div style={{ height: '70px' }} />
              <div style={{ fontWeight: 800, fontSize: '10pt', color: '#0f172a' }}>{chiefAccountant}</div>
              <div style={{ fontSize: '8.5pt', color: '#64748b' }}>{chiefRole}</div>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ fontStyle: 'italic', fontSize: '9pt', color: '#334155', marginBottom: '2px' }}>
                Hà Nội, ngày {reportInfo.dateFormatted}
              </div>
              <div style={{ fontWeight: 800, fontSize: '9.5pt', textTransform: 'uppercase' }}>TỔNG GIÁM ĐỐC</div>
              <div style={{ fontSize: '8.5pt', fontStyle: 'italic', color: '#475569' }}>(Ký, đóng dấu, ghi rõ họ tên)</div>
              
              <div style={{ height: '70px' }} />
              <div style={{ fontWeight: 800, fontSize: '10pt', color: '#0f172a' }}>{directorName}</div>
              <div style={{ fontSize: '8.5pt', color: '#64748b' }}>{directorRole}</div>
            </div>
          </div>
        </div>
      )}
    </PrintPreview>
  );
};
