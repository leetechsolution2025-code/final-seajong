import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Printer,
  Download,
  CheckCircleFill,
  Wallet2,
  CashStack,
  GraphUp,
  PieChartFill,
  JournalCheck,
  ArrowClockwise,
  DatabaseCheck,
  Bank,
  X,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { TableToolbar } from '../../../components/common/TableToolbar';
import type { TickerItem } from '../../../components/common/Ticker';
import { notifyFinanceUpdated, useFinanceRealtimeSync } from '../../../services/financeSyncService';
import { getDefaultPeriod, getReportingPeriods, formatPeriodLabel } from '../../../utils/periodUtils';

export interface FinancialReportsViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onUpdateTickerItems?: (items: TickerItem[]) => void;
}

type TabType = 'balance-sheet' | 'income-statement' | 'cash-flow' | 'ratios';

export interface ConnectedTable {
  id: string;
  name: string;
  count: number;
  description: string;
  targets: string;
}

export interface RowBreakdownItem {
  id: string;
  title: string;
  amount: number;
  amountPrefix?: string;
  amountColor?: string;
  subtitles?: string[];
  note?: string;
  tag?: string;
}

export interface RowBreakdown {
  type: 'cash' | 'receivables' | 'payables' | 'inventory' | 'fixed_assets' | 'loans' | 'expenses' | 'payroll' | 'interest' | 'revenue';
  title: string;
  sourceTable: string;
  sourceLabel: string;
  totalLabel?: string;
  totalAmount?: number;
  stats?: Array<{ label: string; value: string; color?: string }>;
  hint?: string;
  items: RowBreakdownItem[];
}

interface ReportRow {
  code: string;
  name: string;
  note?: string;
  closing: number;
  opening: number;
  isBold?: boolean;
  isHeader?: boolean;
  level?: number;
  isEstimated?: boolean;
  estimateNote?: string;
  sourceTable?: string;
  sourceLabel?: string;
  breakdown?: RowBreakdown;
  loanBreakdown?: Array<{
    id: string;
    bankName: string;
    contractCode: string;
    facilityLabel: string;
    allocatedAmount: number;
    interestRate: string;
    type: string;
    note: string;
  }>;
  interestBreakdown?: Array<{
    id: string;
    code: string;
    name: string;
    bankName: string;
    accountNumber: string;
    balance: number;
    interestRate: string;
    termLabel: string;
    monthlyInterest: number;
    periodInterest: number;
    maturityDate: string;
    type: string;
    note: string;
  }>;
}

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  onShowToast,
  onUpdateTickerItems,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('balance-sheet');
  const [periodFilter, setPeriodFilter] = useState<string>(() => getDefaultPeriod());
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);
  const [selectedLoanRow, setSelectedLoanRow] = useState<ReportRow | null>(null);
  const [selectedInterestRow, setSelectedInterestRow] = useState<ReportRow | null>(null);
  const [selectedBreakdownRow, setSelectedBreakdownRow] = useState<ReportRow | null>(null);
  const [loansSummary, setLoansSummary] = useState<any>(null);
  const [connectedTables, setConnectedTables] = useState<ConnectedTable[]>([]);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Dữ liệu Báo cáo tài chính mặc định
  const [balanceSheetData, setBalanceSheetData] = useState<ReportRow[]>([
    { code: '100', name: 'A. TÀI SẢN NGẮN HẠN', note: 'V.01', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '110', name: 'I. Tiền và các khoản tương đương tiền', note: 'V.02', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '111', name: '1. Tiền mặt tại quỹ', note: '', closing: 0, opening: 0, level: 2 },
    { code: '112', name: '2. Tiền gửi ngân hàng', note: '', closing: 0, opening: 0, level: 2 },
    { code: '120', name: 'II. Đầu tư tài chính ngắn hạn', note: 'V.03', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '121', name: '1. Tiền gửi có kỳ hạn 3 - 6 tháng', note: '', closing: 0, opening: 0, level: 2 },
    { code: '130', name: 'III. Các khoản phải thu ngắn hạn', note: 'V.04', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '131', name: '1. Phải thu ngắn hạn của khách hàng', note: '', closing: 0, opening: 0, level: 2 },
    { code: '132', name: '2. Trả trước cho người bán ngắn hạn', note: '', closing: 0, opening: 0, level: 2 },
    { code: '136', name: '3. Phải thu ngắn hạn khác (Tạm ứng công tác, mua sắm)', note: '', closing: 0, opening: 0, level: 2 },
    { code: '140', name: 'IV. Hàng tồn kho', note: 'V.05', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '141', name: '1. Hàng tồn kho (Nguyên phụ liệu gỗ, phụ kiện inox, bán thành phẩm)', note: '', closing: 0, opening: 0, level: 2 },
    { code: '149', name: '2. Dự phòng giảm giá hàng tồn kho (*)', note: '', closing: 0, opening: 0, level: 2 },
    { code: '150', name: 'V. Tài sản ngắn hạn khác', note: 'V.06', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '151', name: '1. Thuế GTGT được khấu trừ', note: '', closing: 0, opening: 0, level: 2 },
    { code: '152', name: '2. Thuế và các khoản khác phải thu Nhà nước', note: '', closing: 0, opening: 0, level: 2 },
    { code: '200', name: 'B. TÀI SẢN DÀI HẠN', note: 'V.07', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '210', name: 'I. Các khoản phải thu dài hạn', note: 'V.08', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '220', name: 'II. Tài sản cố định', note: 'V.09', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '221', name: '1. Tài sản cố định hữu hình', note: '', closing: 0, opening: 0, level: 2 },
    { code: '222', name: '- Nguyên giá', note: '', closing: 0, opening: 0, level: 3 },
    { code: '223', name: '- Giá trị hao mòn luỹ kế (*)', note: '', closing: 0, opening: 0, level: 3 },
    { code: '227', name: '2. Tài sản cố định vô hình', note: '', closing: 0, opening: 0, level: 2 },
    { code: '240', name: 'III. Tài sản dở dang dài hạn', note: 'V.10', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '242', name: '1. Chi phí xây dựng cơ bản dở dang', note: '', closing: 0, opening: 0, level: 2 },
    { code: '260', name: 'IV. Tài sản dài hạn khác', note: 'V.11', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '261', name: '1. Chi phí trả trước dài hạn', note: '', closing: 0, opening: 0, level: 2 },
    { code: '270', name: 'TỔNG CỘNG TÀI SẢN (270 = 100 + 200)', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '300', name: 'C. NỢ PHẢI TRẢ', note: 'V.12', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '310', name: 'I. Nợ ngắn hạn', note: 'V.13', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '311', name: '1. Phải trả người bán ngắn hạn', note: '', closing: 0, opening: 0, level: 2 },
    { code: '312', name: '2. Người mua trả tiền trước ngắn hạn', note: '', closing: 0, opening: 0, level: 2 },
    { code: '313', name: '3. Thuế và các khoản phải nộp Nhà nước', note: '', closing: 0, opening: 0, level: 2 },
    { code: '314', name: '4. Phải trả người lao động (Lương, thưởng)', note: '', closing: 0, opening: 0, level: 2 },
    { code: '320', name: '5. Vay và nợ thuê tài chính ngắn hạn', note: '', closing: 0, opening: 0, level: 2 },
    { code: '330', name: 'II. Nợ dài hạn', note: 'V.14', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '338', name: '1. Vay và nợ thuê tài chính dài hạn', note: '', closing: 0, opening: 0, level: 2 },
    { code: '400', name: 'D. VỐN CHỦ SỞ HỮU', note: 'V.15', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '410', name: 'I. Vốn chủ sở hữu', note: '', closing: 0, opening: 0, isBold: true, level: 1 },
    { code: '411', name: '1. Vốn góp của chủ sở hữu', note: '', closing: 0, opening: 0, level: 2 },
    { code: '418', name: '2. Quỹ đầu tư phát triển', note: '', closing: 0, opening: 0, level: 2 },
    { code: '421', name: '3. Lợi nhuận sau thuế chưa phân phối', note: '', closing: 0, opening: 0, level: 2 },
    { code: '421a', name: '- LNST chưa phân phối luỹ kế đến cuối kỳ trước', note: '', closing: 0, opening: 0, level: 3 },
    { code: '421b', name: '- LNST chưa phân phối kỳ này', note: '', closing: 0, opening: 0, level: 3 },
    { code: '440', name: 'TỔNG CỘNG NGUỒN VỐN (440 = 300 + 400)', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
  ]);

  const [incomeStatementData, setIncomeStatementData] = useState<ReportRow[]>([
    { code: '01', name: '1. Doanh thu bán hàng và cung cấp dịch vụ', note: 'VI.01', closing: 0, opening: 0, isBold: true, level: 0 },
    { code: '02', name: '2. Các khoản giảm trừ doanh thu (Chiết khấu, giảm giá)', note: 'VI.02', closing: 0, opening: 0, level: 0 },
    { code: '10', name: '3. Doanh thu thuần về bán hàng và CCDV (10 = 01 - 02)', note: 'VI.03', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '11', name: '4. Giá vốn hàng bán (Chi phí nguyên vật liệu, nhân công, SXC)', note: 'VI.04', closing: 0, opening: 0, level: 0 },
    { code: '20', name: '5. Lợi nhuận gộp về bán hàng và CCDV (20 = 10 - 11)', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '21', name: '6. Doanh thu hoạt động tài chính (Lãi tiền gửi, chiết khấu TT)', note: 'VI.05', closing: 0, opening: 0, level: 0 },
    { code: '22', name: '7. Chi phí tài chính', note: 'VI.06', closing: 0, opening: 0, level: 0 },
    { code: '23', name: '- Trong đó: Chi phí lãi vay ngân hàng', note: '', closing: 0, opening: 0, level: 1 },
    { code: '25', name: '8. Chi phí bán hàng (Vận chuyển, hoa hồng thầu, tiếp thị)', note: 'VI.07', closing: 0, opening: 0, level: 0 },
    { code: '26', name: '9. Chi phí quản lý doanh nghiệp (Lương văn phòng, khấu hao, quản lý)', note: 'VI.08', closing: 0, opening: 0, level: 0 },
    { code: '30', name: '10. Lợi nhuận thuần từ hoạt động kinh doanh (30 = 20 + 21 - 22 - 25 - 26)', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '31', name: '11. Thu nhập khác', note: '', closing: 0, opening: 0, level: 0 },
    { code: '32', name: '12. Chi phí khác', note: '', closing: 0, opening: 0, level: 0 },
    { code: '40', name: '13. Lợi nhuận khác (40 = 31 - 32)', note: '', closing: 0, opening: 0, isBold: true, level: 0 },
    { code: '50', name: '14. Tổng lợi nhuận kế toán trước thuế (50 = 30 + 40)', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '51', name: '15. Chi phí thuế TNDN hiện hành (20%)', note: 'VI.09', closing: 0, opening: 0, level: 0 },
    { code: '60', name: '16. Lợi nhuận sau thuế thu nhập doanh nghiệp (60 = 50 - 51)', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
  ]);

  const [cashFlowData, setCashFlowData] = useState<ReportRow[]>([
    { code: 'I', name: 'I. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG KINH DOANH', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '01', name: '1. Tiền thu từ bán hàng, cung cấp dịch vụ và doanh thu khác', note: '', closing: 0, opening: 0, level: 1 },
    { code: '02', name: '2. Tiền chi trả cho người cung cấp hàng hóa và dịch vụ', note: '', closing: 0, opening: 0, level: 1 },
    { code: '03', name: '3. Tiền chi trả cho người lao động (Tiền lương và phụ cấp)', note: '', closing: 0, opening: 0, level: 1 },
    { code: '04', name: '4. Tiền chi trả lãi vay', note: '', closing: 0, opening: 0, level: 1 },
    { code: '05', name: '5. Tiền chi nộp thuế thu nhập doanh nghiệp', note: '', closing: 0, opening: 0, level: 1 },
    { code: '07', name: '6. Tiền chi khác cho hoạt động kinh doanh', note: '', closing: 0, opening: 0, level: 1 },
    { code: '20', name: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh (Mã 20)', note: '', closing: 0, opening: 0, isBold: true, level: 0 },
    { code: 'II', name: 'II. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG ĐẦU TƯ', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '21', name: '1. Tiền chi để mua sắm, xây dựng TSCĐ và các TSDH khác', note: '', closing: 0, opening: 0, level: 1 },
    { code: '22', name: '2. Tiền thu từ thanh lý, nhượng bán TSCĐ và các TSDH khác', note: '', closing: 0, opening: 0, level: 1 },
    { code: '27', name: '3. Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia', note: '', closing: 0, opening: 0, level: 1 },
    { code: '30', name: 'Lưu chuyển tiền thuần từ hoạt động đầu tư (Mã 30)', note: '', closing: 0, opening: 0, isBold: true, level: 0 },
    { code: 'III', name: 'III. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG TÀI CHÍNH', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '33', name: '1. Tiền thu từ đi vay (Giải ngân vốn vay dự án)', note: '', closing: 0, opening: 0, level: 1 },
    { code: '34', name: '2. Tiền chi trả nợ gốc vay ngân hàng', note: '', closing: 0, opening: 0, level: 1 },
    { code: '40', name: 'Lưu chuyển tiền thuần từ hoạt động tài chính (Mã 40)', note: '', closing: 0, opening: 0, isBold: true, level: 0 },
    { code: '50', name: 'LƯU CHUYỂN TIỀN THUẦN TRONG KỲ (50 = 20 + 30 + 40)', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '60', name: 'Tiền và tương đương tiền đầu kỳ', note: '', closing: 0, opening: 0, isBold: true, level: 0 },
    { code: '70', name: 'Tiền và tương đương tiền cuối kỳ (70 = 50 + 60)', note: '', closing: 0, opening: 0, isBold: true, isHeader: true, level: 0 },
  ]);

  const [ratioCategories, setRatioCategories] = useState([
    {
      title: 'Khả năng thanh toán',
      icon: <Wallet2 className="text-primary" size={18} />,
      ratios: [
        { name: 'Hệ số thanh toán hiện hành (Current Ratio)', value: '-', benchmark: '≥ 1.5 lần', status: 'Chưa có dữ liệu', desc: 'Tài sản ngắn hạn / Nợ ngắn hạn' },
        { name: 'Hệ số thanh toán nhanh (Quick Ratio)', value: '-', benchmark: '≥ 1.0 lần', status: 'Chưa có dữ liệu', desc: '(TSNH - Hàng tồn kho) / Nợ ngắn hạn' },
        { name: 'Hệ số thanh toán tức thời (Cash Ratio)', value: '-', benchmark: '≥ 0.3 lần', status: 'Chưa có dữ liệu', desc: 'Tiền và tương đương tiền / Nợ ngắn hạn' },
      ],
    },
    {
      title: 'Hiệu quả hoạt động',
      icon: <GraphUp className="text-success" size={18} />,
      ratios: [
        { name: 'Vòng quay hàng tồn kho (Inventory Turnover)', value: '-', benchmark: '2.2 - 3.0 vòng', status: 'Chưa có dữ liệu', desc: 'Giá vốn / Hàng tồn kho bình quân' },
        { name: 'Số ngày luân chuyển tồn kho (DIO)', value: '-', benchmark: '≤ 160 ngày', status: 'Chưa có dữ liệu', desc: '365 / Vòng quay hàng tồn kho' },
        { name: 'Kỳ thu tiền bình quân (DSO)', value: '-', benchmark: '≤ 100 ngày', status: 'Chưa có dữ liệu', desc: 'Phải thu bình quân × 365 / Doanh thu' },
      ],
    },
    {
      title: 'Cơ cấu vốn và Đòn bẩy',
      icon: <PieChartFill className="text-warning" size={18} />,
      ratios: [
        { name: 'Hệ số Nợ trên Tổng tài sản (Debt / Assets)', value: '-', benchmark: '≤ 50%', status: 'Chưa có dữ liệu', desc: 'Tổng nợ phải trả / Tổng tài sản' },
        { name: 'Hệ số Nợ trên Vốn CSH (Debt / Equity)', value: '-', benchmark: '≤ 100%', status: 'Chưa có dữ liệu', desc: 'Tổng nợ phải trả / Vốn chủ sở hữu' },
        { name: 'Hệ số khả năng trả lãi vay (ICR)', value: '-', benchmark: '≥ 3.0 lần', status: 'Chưa có dữ liệu', desc: 'EBIT / Chi phí lãi vay' },
      ],
    },
    {
      title: 'Khả năng sinh lời',
      icon: <CashStack className="text-info" size={18} />,
      ratios: [
        { name: 'Biên lợi nhuận gộp (Gross Margin)', value: '-', benchmark: '28% - 32%', status: 'Chưa có dữ liệu', desc: 'Lợi nhuận gộp / Doanh thu thuần' },
        { name: 'Biên lợi nhuận ròng (Net Profit Margin)', value: '-', benchmark: '10% - 15%', status: 'Chưa có dữ liệu', desc: 'Lợi nhuận sau thuế / Doanh thu thuần' },
        { name: 'Tỷ suất sinh lời trên tài sản (ROA)', value: '-', benchmark: '≥ 7%', status: 'Chưa có dữ liệu', desc: 'LNST / Tổng tài sản bình quân' },
        { name: 'Tỷ suất sinh lời trên vốn CSH (ROE)', value: '-', benchmark: '≥ 12%', status: 'Chưa có dữ liệu', desc: 'LNST / Vốn CSH bình quân' },
      ],
    },
  ]);

  const [summaryData, setSummaryData] = useState({
    totalAssets: 0,
    totalAssetsGrowth: '0.0%',
    netRevenue: 0,
    netRevenueGrowth: '0.0%',
    grossProfit: 0,
    grossMargin: '0.0%',
    netProfit: 0,
    netMargin: '0.0%',
    netProfitGrowth: '0.0%',
    isBalanced: true,
    balanceDifference: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isClosingPeriod, setIsClosingPeriod] = useState(false);

  // Tự động tải báo cáo tài chính tính toán từ Backend API theo kỳ chọn
  const loadReports = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/finance/reports?period=${periodFilter}`)
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải dữ liệu báo cáo');
        return res.json();
      })
      .then((data) => {
        if (data && data.balanceSheet) {
          setBalanceSheetData(data.balanceSheet);
          setIncomeStatementData(data.incomeStatement);
          setCashFlowData(data.cashFlow);
          if (data.ratios) {
            const mapped = data.ratios.map((cat: any) => ({
              ...cat,
              icon:
                cat.iconKey === 'wallet' ? <Wallet2 className="text-primary" size={18} /> :
                cat.iconKey === 'graph' ? <GraphUp className="text-success" size={18} /> :
                cat.iconKey === 'pie' ? <PieChartFill className="text-warning" size={18} /> :
                <CashStack className="text-info" size={18} />,
            }));
            setRatioCategories(mapped);
          }
          if (data.connectedTables) {
            setConnectedTables(data.connectedTables);
          }
          if (data.loansSummary) {
            setLoansSummary(data.loansSummary);
          }
          if (data.summaryCards) {
            setSummaryData({
              ...data.summaryCards,
              isBalanced: data.isBalanced,
              balanceDifference: data.balanceDifference,
            });
          }
        }
      })
      .catch((err) => {
        console.warn('Lỗi khi tải báo cáo từ máy chủ:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [periodFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Tự động đồng bộ thời gian thực khi có bất kỳ dữ liệu tài chính nào thay đổi trên toàn hệ thống
  useFinanceRealtimeSync(loadReports);

  // Khâu 1: Xử lý Bút toán kết chuyển xác định kết quả kinh doanh và chốt sổ cuối kỳ
  const handleClosePeriod = async () => {
    setIsClosingPeriod(true);
    try {
      const res = await fetch('/api/finance/reports/close-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: periodFilter }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.(
          'success',
          'Chốt sổ & Kết chuyển thành công',
          `Đã tạo bút toán ${data.entryCode}: Kết chuyển doanh thu, chi phí xác định LNST ${data.netProfit?.toLocaleString('vi-VN')} đ vào Vốn chủ sở hữu.`
        );
        notifyFinanceUpdated('financial_reports', 'close_period');
        if (data.report) {
          setBalanceSheetData(data.report.balanceSheet);
          setIncomeStatementData(data.report.incomeStatement);
          setCashFlowData(data.report.cashFlow);
          if (data.report.connectedTables) {
            setConnectedTables(data.report.connectedTables);
          }
          if (data.report.summaryCards) {
            setSummaryData({
              ...data.report.summaryCards,
              isBalanced: data.report.isBalanced,
              balanceDifference: data.report.balanceDifference,
            });
          }
        }
      } else {
        onShowToast?.('error', 'Lỗi', data.error || 'Không thể thực hiện kết chuyển');
      }
    } catch {
      onShowToast?.('error', 'Lỗi kết nối', 'Không thể kết nối máy chủ để chốt sổ cuối kỳ');
    } finally {
      setIsClosingPeriod(false);
    }
  };

  // Lọc bảng theo từ khóa tìm kiếm
  const getFilteredRows = (rows: ReportRow[]) => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.note && r.note.toLowerCase().includes(q))
    );
  };

  const currentRows = useMemo(() => {
    if (activeTab === 'balance-sheet') return getFilteredRows(balanceSheetData);
    if (activeTab === 'income-statement') return getFilteredRows(incomeStatementData);
    if (activeTab === 'cash-flow') return getFilteredRows(cashFlowData);
    return [];
  }, [activeTab, searchQuery, balanceSheetData, incomeStatementData, cashFlowData]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Format tiền tệ VNĐ
  const formatMoney = (val: number) => {
    if (val === 0) return '-';
    const isNegative = val < 0;
    const formatted = Math.abs(val).toLocaleString('vi-VN') + ' đ';
    return isNegative ? `(${formatted})` : formatted;
  };

  // Tên kỳ báo cáo hiển thị
  const periodLabel = useMemo(() => {
    return formatPeriodLabel(periodFilter);
  }, [periodFilter]);

  // Dữ liệu hiển thị trên thanh Ticker (4 chỉ số KPI chính và các thông số tài chính quan trọng khác)
  const reportTickerItems = useMemo<TickerItem[]>(() => {
    const opsCashFlow = cashFlowData.find((r) => r.code === '20')?.closing || 0;
    const hasAssets = summaryData.totalAssets > 0;
    const hasRevenue = summaryData.netRevenue > 0;
    const currentRatioItem = ratioCategories[0]?.ratios?.find((r) => r.name.includes('hiện hành'))?.value;
    const roaItem = ratioCategories[3]?.ratios?.find((r) => r.name.includes('ROA'))?.value;
    const roeItem = ratioCategories[3]?.ratios?.find((r) => r.name.includes('ROE'))?.value;
    const hasHealthData = hasAssets || hasRevenue;

    return [
      {
        tag: 'TỔNG TÀI SẢN',
        tagVariant: 'brand',
        text: hasAssets
          ? `Tổng tài sản: **${formatMoney(summaryData.totalAssets)}**${summaryData.totalAssetsGrowth && summaryData.totalAssetsGrowth !== '0.0%' ? ` (${summaryData.totalAssetsGrowth} so với đầu kỳ)` : ''}`
          : `Tổng tài sản: **-** (Chưa có số dư)`,
      },
      {
        tag: 'DOANH THU THUẦN',
        tagVariant: 'success',
        text: hasRevenue
          ? `Doanh thu thuần: **${formatMoney(summaryData.netRevenue)}**${summaryData.netRevenueGrowth && summaryData.netRevenueGrowth !== '0.0%' ? ` (${summaryData.netRevenueGrowth} so với cùng kỳ)` : ''}`
          : `Doanh thu thuần: **-** (Chưa phát sinh)`,
      },
      {
        tag: 'LỢI NHUẬN GỘP',
        tagVariant: 'warning',
        text: summaryData.grossProfit !== 0 || hasRevenue
          ? `Lợi nhuận gộp: **${formatMoney(summaryData.grossProfit)}**${hasRevenue ? ` (Biên LN gộp: **${summaryData.grossMargin}**)` : ''}`
          : `Lợi nhuận gộp: **-**`,
      },
      {
        tag: 'LỢI NHUẬN SAU THUẾ',
        tagVariant: 'brand',
        text: summaryData.netProfit !== 0 || hasRevenue
          ? `Lợi nhuận sau thuế: **${formatMoney(summaryData.netProfit)}**${hasRevenue ? ` (${summaryData.netProfitGrowth && summaryData.netProfitGrowth !== '0.0%' ? `${summaryData.netProfitGrowth} • ` : ''}Biên ròng: **${summaryData.netMargin}**)` : ''}`
          : `Lợi nhuận sau thuế: **-**`,
      },
      {
        tag: hasAssets ? (summaryData.isBalanced ? 'CÂN ĐỐI KẾ TOÁN' : 'CẢNH BÁO LỆCH') : 'CÂN ĐỐI KẾ TOÁN',
        tagVariant: hasAssets ? (summaryData.isBalanced ? 'success' : 'danger') : 'neutral',
        text: hasAssets
          ? (summaryData.isBalanced
              ? `Bảng cân đối kế toán: **Cân đối 100%** (Tổng Tài sản = Tổng Nguồn vốn = **${formatMoney(summaryData.totalAssets)}**)`
              : `Cảnh báo lệch Bảng cân đối: **${formatMoney(summaryData.balanceDifference)}** (Cần kiểm tra lại định khoản)`)
          : `Bảng cân đối kế toán: **Chưa có dữ liệu phát sinh trong kỳ**`,
      },
      {
        tag: 'DƯ NỢ TÍN DỤNG',
        tagVariant: 'info',
        text: loansSummary && loansSummary.totalRemaining > 0
          ? `Dư nợ tín dụng ngân hàng: **${formatMoney(loansSummary.totalRemaining)}** (Lãi vay ước tính: **~${formatMoney(loansSummary.monthlyInterest)}**/tháng)`
          : `Dư nợ tín dụng ngân hàng: **0 đ** (Hiện tại không có khoản vay phát sinh)`,
      },
      {
        tag: 'HIỆU QUẢ SINH LỜI',
        tagVariant: 'neutral',
        text: (hasHealthData && currentRatioItem && currentRatioItem !== '-')
          ? `Chỉ số sức khỏe DN: ROE đạt **${roeItem && roeItem !== '-' ? roeItem : '0.0%'}** • ROA đạt **${roaItem && roaItem !== '-' ? roaItem : '0.0%'}** • Khả năng thanh toán: **${currentRatioItem}**`
          : `Chỉ số sức khỏe DN: **Chưa có dữ liệu hoạt động kinh doanh để tính toán**`,
      },
      {
        tag: 'LƯU CHUYỂN TIỀN',
        tagVariant: 'success',
        text: opsCashFlow !== 0
          ? `Lưu chuyển tiền thuần từ HĐKD: **${opsCashFlow > 0 ? '+' : ''}${formatMoney(opsCashFlow)}** (${opsCashFlow > 0 ? 'Thặng dư dòng tiền hoạt động' : 'Thâm hụt dòng tiền'})`
          : `Lưu chuyển tiền thuần từ HĐKD: **0 đ** (Chưa phát sinh dòng tiền hoạt động)`,
      },
      {
        tag: 'KẾT NỐI DỮ LIỆU',
        tagVariant: 'brand',
        text: `Hệ thống tự động liên kết **${connectedTables.length || 12} bảng CSDL** thực tế (Kho hàng, TSCĐ, Vốn bằng tiền, Nợ vay, Công nợ, Lương)`,
      },
    ];
  }, [summaryData, loansSummary, connectedTables, cashFlowData, ratioCategories]);

  // Đồng bộ dữ liệu Ticker lên Header (bám sát vào PageTitle)
  useEffect(() => {
    onUpdateTickerItems?.(reportTickerItems);
  }, [reportTickerItems, onUpdateTickerItems]);

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleExportExcel = () => {
    onShowToast?.(
      'success',
      'Xuất tệp báo cáo',
      `Đã kết xuất dữ liệu Báo cáo tài chính (${periodLabel}) định dạng Excel thành công.`
    );
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
      <style>{`
        @keyframes balanceDotWave {
          0% {
            transform: scale(0.9);
            opacity: 0.85;
          }
          100% {
            transform: scale(2.6);
            opacity: 0;
          }
        }
        @keyframes balanceDotBlink {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.35;
            transform: scale(0.85);
          }
        }
      `}</style>

      {/* 1. Header Toolbar: Bộ lọc kỳ báo cáo và Thao tác */}
      {/* 1. Header Toolbar: Bộ lọc kỳ báo cáo và Thao tác */}
      <TableToolbar
        filters={[
          {
            id: 'period-filter',
            value: periodFilter,
            onChange: (val) => setPeriodFilter(val),
            minWidth: '150px',
            ariaLabel: 'Kỳ báo cáo tài chính',
            options: getReportingPeriods(),
          },
        ]}
        searchValue={activeTab !== 'ratios' ? searchQuery : undefined}
        onSearchChange={activeTab !== 'ratios' ? setSearchQuery : undefined}
        searchPlaceholder="Tìm mã số hoặc chỉ tiêu..."
        searchMinWidth="200px"
        actionsAfterSearch={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'balance-sheet' && (
              <div
                title={
                  summaryData.isBalanced
                    ? `Cân đối: Tổng Tài Sản = Tổng Nguồn Vốn (${formatMoney(summaryData.totalAssets)})`
                    : `Cảnh báo lệch: ${formatMoney(summaryData.balanceDifference)}`
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '10px',
                    height: '10px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: summaryData.isBalanced ? '#10b981' : '#ef4444',
                      animation: 'balanceDotWave 1.6s cubic-bezier(0, 0, 0.2, 1) infinite',
                    }}
                  />
                  <span
                    style={{
                      position: 'relative',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: summaryData.isBalanced ? '#10b981' : '#ef4444',
                      boxShadow: summaryData.isBalanced
                        ? '0 0 6px rgba(16, 185, 129, 0.9)'
                        : '0 0 6px rgba(239, 68, 68, 0.9)',
                      animation: 'balanceDotBlink 1.6s ease-in-out infinite',
                    }}
                  />
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsDataSourcesOpen(true)}
              title="Xem chi tiết các bảng CSDL được kết nối tự động kết xuất báo cáo tài chính"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#2563eb',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontSize: '0.78125rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                fontFamily: "'Roboto Condensed', sans-serif",
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              }}
            >
              <DatabaseCheck size={12} />
              <span>{connectedTables.length > 0 ? `${connectedTables.length} bảng CSDL kết nối` : '12 bảng CSDL kết nối'}</span>
            </button>
          </div>
        }
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClosePeriod}
              disabled={isClosingPeriod || isLoading}
              title="Thực hiện bút toán kết chuyển doanh thu, chi phí xác định kết quả kinh doanh và chốt sổ cuối kỳ"
              style={{
                height: '34px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: '#059669',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
              }}
            >
              {isClosingPeriod ? <ArrowClockwise className="spinner-border spinner-border-sm" size={14} /> : <JournalCheck size={14} />}
              <span>{isClosingPeriod ? 'Đang kết chuyển...' : 'Chốt sổ & Kết chuyển'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              style={{
                height: '34px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78125rem',
                fontWeight: 500,
              }}
            >
              <Printer size={14} />
              <span>In báo cáo</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportExcel}
              style={{
                height: '34px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78125rem',
                fontWeight: 500,
              }}
            >
              <Download size={14} />
              <span>Xuất Excel</span>
            </Button>
          </div>
        }
        style={{
          padding: '8px 16px',
          marginBottom: 0,
          backgroundColor: 'var(--bg-surface-1)',
          borderBottom: '1px solid var(--border-default)',
        }}
      />

      {/* 3. Tabs Chuyển đổi Biểu mẫu Báo cáo Tài chính */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '0 16px',
          backgroundColor: 'var(--bg-surface-1)',
          borderBottom: '1px solid var(--border-default)',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('balance-sheet')}
          style={{
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            border: 'none',
            background: 'transparent',
            color: activeTab === 'balance-sheet' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'balance-sheet' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Bảng cân đối kế toán</span>
          <span
            style={{
              fontSize: '0.6875rem',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'balance-sheet' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface-2)',
            }}
          >
            Mẫu B01-DN
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('income-statement')}
          style={{
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            border: 'none',
            background: 'transparent',
            color: activeTab === 'income-statement' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'income-statement' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Báo cáo kết quả HĐKD</span>
          <span
            style={{
              fontSize: '0.6875rem',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'income-statement' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface-2)',
            }}
          >
            Mẫu B02-DN
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('cash-flow')}
          style={{
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            border: 'none',
            background: 'transparent',
            color: activeTab === 'cash-flow' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'cash-flow' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Lưu chuyển tiền tệ</span>
          <span
            style={{
              fontSize: '0.6875rem',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'cash-flow' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface-2)',
            }}
          >
            Mẫu B03-DN
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('ratios')}
          style={{
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            border: 'none',
            background: 'transparent',
            color: activeTab === 'ratios' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'ratios' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Chỉ số tài chính và Sức khỏe DN</span>
          <span
            style={{
              fontSize: '0.6875rem',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'ratios' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface-2)',
            }}
          >
            12 Chỉ số
          </span>
        </button>
      </div>

      {/* 4. Nội dung Bảng Báo Cáo hoặc Chỉ số */}
      {activeTab !== 'ratios' ? (
        <div
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-surface-1)',
          }}
        >

          {/* Table chi tiết có thanh cuộn dọc / ngang custom-scrollbar */}
          <div
            className="table-responsive custom-scrollbar"
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'auto',
            }}
          >
            <table
              className="custom-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8125rem',
                lineHeight: '1.4',
                fontFamily: "'Roboto Condensed', sans-serif",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-default)', textTransform: 'uppercase', fontFamily: "'Roboto Condensed', sans-serif" }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', width: '45%', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-2)', boxShadow: '0 1px 0 var(--border-default)', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.02em' }}>CHỈ TIÊU</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '10%', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-2)', boxShadow: '0 1px 0 var(--border-default)', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.02em' }}>MÃ SỐ</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '12%', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-2)', boxShadow: '0 1px 0 var(--border-default)', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.02em' }}>THUYẾT MINH</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '16.5%', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-2)', boxShadow: '0 1px 0 var(--border-default)', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.02em' }}>SỐ CUỐI KỲ / KỲ NÀY</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '16.5%', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-2)', boxShadow: '0 1px 0 var(--border-default)', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.02em' }}>SỐ ĐẦU KỲ / KỲ TRƯỚC</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                {currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: "'Roboto Condensed', sans-serif" }}>
                      Không tìm thấy chỉ tiêu nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;
                    </td>
                  </tr>
                ) : (
                  currentRows.map((row, idx) => {
                    const isTotalRow = row.code === '270' || row.code === '440' || row.code === '60' || row.code === '70';
                    const paddingLeft = (row.level || 0) * 16 + 12;

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--border-default)',
                          backgroundColor: isTotalRow
                            ? 'rgba(59, 130, 246, 0.06)'
                            : row.isHeader
                            ? 'var(--bg-surface-2)'
                            : row.isEstimated
                            ? 'rgba(239, 68, 68, 0.02)'
                            : idx % 2 === 1
                            ? 'rgba(0, 0, 0, 0.015)'
                            : 'transparent',
                          fontWeight: row.isBold ? 700 : 400,
                          fontFamily: "'Roboto Condensed', sans-serif",
                        }}
                      >
                        <td
                          style={{
                            padding: '7px 12px 7px ' + paddingLeft + 'px',
                            color: isTotalRow ? 'var(--color-primary)' : 'var(--text-primary)',
                            fontFamily: "'Roboto Condensed', sans-serif",
                            fontSize: '0.8125rem',
                          }}
                        >
                          <span
                            onClick={() => {
                              if (row.breakdown) {
                                setSelectedBreakdownRow(row);
                              } else if (row.interestBreakdown && row.interestBreakdown.length > 0) {
                                setSelectedInterestRow(row);
                              } else if (row.loanBreakdown && row.loanBreakdown.length > 0) {
                                setSelectedLoanRow(row);
                              }
                            }}
                            title={
                              row.breakdown
                                ? (row.breakdown.sourceLabel || `Xem diễn giải chi tiết ${row.name}`)
                                : row.interestBreakdown && row.interestBreakdown.length > 0
                                ? (row.sourceLabel || 'Xem bảng phân bổ chi tiết lãi tiền gửi & doanh thu tài chính')
                                : row.loanBreakdown && row.loanBreakdown.length > 0
                                ? (row.sourceLabel || 'Xem bảng phân bổ chi tiết các khoản nợ vay')
                                : undefined
                            }
                            style={{
                              cursor: (row.breakdown || row.interestBreakdown || row.loanBreakdown) ? 'pointer' : 'inherit',
                            }}
                          >
                            {row.name}
                          </span>

                          {row.isEstimated && (
                            <span
                              title={row.estimateNote || 'Số liệu tự điền / định mức - Cần nhập khi khởi tạo hệ thống'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                marginLeft: '6px',
                                padding: '1px 5px',
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                color: '#dc2626',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '3px',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                verticalAlign: 'middle',
                                cursor: 'help',
                                letterSpacing: '0.01em',
                              }}
                            >
                              Khởi tạo
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', color: row.isEstimated ? '#dc2626' : 'var(--text-secondary)', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 600, fontSize: '0.8125rem' }}>
                          {row.code}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: "'Roboto Condensed', sans-serif", fontSize: '0.8125rem' }}>
                          {row.note || '-'}
                        </td>
                        <td
                          onClick={() => {
                            if (row.breakdown) {
                              setSelectedBreakdownRow(row);
                            } else if (row.interestBreakdown && row.interestBreakdown.length > 0) {
                              setSelectedInterestRow(row);
                            } else if (row.loanBreakdown && row.loanBreakdown.length > 0) {
                              setSelectedLoanRow(row);
                            }
                          }}
                          title={
                            row.isEstimated
                              ? (row.estimateNote || 'Số liệu tự điền / định mức - Cần nhập khi khởi tạo hệ thống')
                              : row.breakdown
                              ? (row.breakdown.sourceLabel || `Xem diễn giải chi tiết ${row.name}`)
                              : undefined
                          }
                          style={{
                            padding: '7px 12px',
                            textAlign: 'right',
                            fontFamily: "'Roboto Condensed', sans-serif",
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '0.01em',
                            fontSize: '0.84375rem',
                            fontWeight: row.isBold ? 700 : 500,
                            color: row.isEstimated ? '#dc2626' : isTotalRow ? 'var(--color-primary)' : 'var(--text-primary)',
                            cursor: row.isEstimated ? 'help' : (row.breakdown || row.interestBreakdown || row.loanBreakdown) ? 'pointer' : 'default',
                          }}
                        >
                          {formatMoney(row.closing)}
                        </td>
                        <td
                          style={{
                            padding: '7px 12px',
                            textAlign: 'right',
                            fontFamily: "'Roboto Condensed', sans-serif",
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '0.01em',
                            fontSize: '0.84375rem',
                            fontWeight: row.isBold ? 700 : 400,
                            color: row.isEstimated ? 'rgba(220, 38, 38, 0.75)' : 'var(--text-secondary)',
                          }}
                        >
                          {formatMoney(row.opening)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab Chỉ số tài chính và Sức khỏe DN */
        <div
          className="custom-scrollbar"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '16px',
          }}
        >
          {ratioCategories.map((cat, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--bg-surface-1)',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-default)', paddingBottom: '10px' }}>
                {cat.icon}
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {cat.title}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cat.ratios.map((r, rIdx) => (
                  <div
                    key={rIdx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-surface-2)',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                        }}
                      >
                        {r.value}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                      <span>Công thức: {r.desc}</span>
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor:
                            r.status === 'Chưa có dữ liệu' || r.status === '--'
                              ? 'var(--bg-surface-3, rgba(148, 163, 184, 0.15))'
                              : r.status === 'Xuất sắc' || r.status === 'Vượt trội' || r.status === 'Rất an toàn' || r.status === 'An toàn tuyệt đối'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : r.status === 'Tốt' || r.status === 'Cao' || r.status === 'An toàn' || r.status === 'Đạt chuẩn' || r.status === 'Kiểm soát' || r.status === 'Đạt'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                          color:
                            r.status === 'Chưa có dữ liệu' || r.status === '--'
                              ? 'var(--text-secondary, #64748b)'
                              : r.status === 'Xuất sắc' || r.status === 'Vượt trội' || r.status === 'Rất an toàn' || r.status === 'An toàn tuyệt đối'
                              ? '#059669'
                              : r.status === 'Tốt' || r.status === 'Cao' || r.status === 'An toàn' || r.status === 'Đạt chuẩn' || r.status === 'Kiểm soát' || r.status === 'Đạt'
                              ? '#2563eb'
                              : '#d97706',
                          fontWeight: 600,
                        }}
                      >
                        {r.status === 'Chưa có dữ liệu' || r.status === '--'
                          ? `Chưa có dữ liệu (Chuẩn: ${r.benchmark})`
                          : `${r.status} (Ngưỡng: ${r.benchmark})`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Modal In Báo cáo chuẩn Thông tư 200 */}
      {isPrintModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface-1)',
              borderRadius: '12px',
              width: '950px',
              maxWidth: '96vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-surface-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={18} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Bản in chuẩn Báo cáo tài chính (Khổ A4)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    window.print();
                    onShowToast?.('success', 'In báo cáo', 'Đang gửi lệnh in tới máy in');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={14} />
                  <span>Xác nhận In</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '4px',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Print Preview Paper */}
            <div
              style={{
                padding: '24px',
                overflowY: 'auto',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                ref={printAreaRef}
                style={{
                  width: '100%',
                  maxWidth: '820px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  padding: '36px 40px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: '11pt',
                  lineHeight: '1.4',
                }}
              >
                {/* Đầu trang chuẩn biểu mẫu Bộ Tài chính */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div style={{ maxWidth: '58%' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '10pt', textTransform: 'uppercase' }}>
                      CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM
                    </div>
                    <div style={{ fontSize: '9pt', color: '#334155', marginTop: '2px' }}>
                      Địa chỉ: Lô CN-08, KCN Thạch Thất - Quốc Oai, Hà Nội
                    </div>
                    <div style={{ fontSize: '9pt', color: '#334155' }}>
                      Mã số thuế: 0109887766 • ĐT: (024) 3888 9999
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', maxWidth: '40%' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>
                      {activeTab === 'balance-sheet' && 'Mẫu số B 01 - DN'}
                      {activeTab === 'income-statement' && 'Mẫu số B 02 - DN'}
                      {activeTab === 'cash-flow' && 'Mẫu số B 03 - DN'}
                      {activeTab === 'ratios' && 'PHỤ LỤC PHÂN TÍCH TÀI CHÍNH'}
                    </div>
                    <div style={{ fontSize: '8pt', fontStyle: 'italic', color: '#475569' }}>
                      (Ban hành theo Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính)
                    </div>
                  </div>
                </div>

                {/* Tiêu đề biểu mẫu */}
                <div style={{ textAlign: 'center', margin: '22px 0 16px' }}>
                  <div style={{ fontSize: '15pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {activeTab === 'balance-sheet' && 'BẢNG CÂN ĐỐI KẾ TOÁN'}
                    {activeTab === 'income-statement' && 'BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH'}
                    {activeTab === 'cash-flow' && 'BÁO CÁO LƯU CHUYỂN TIỀN TỆ'}
                    {activeTab === 'ratios' && 'BẢNG CHỈ SỐ SỨC KHỎE TÀI CHÍNH DOANH NGHIỆP'}
                  </div>
                  <div style={{ fontSize: '10.5pt', fontStyle: 'italic', marginTop: '4px' }}>
                    Tại ngày hoặc kỳ: {periodLabel}
                  </div>
                  <div style={{ fontSize: '9pt', color: '#64748b', marginTop: '2px' }}>
                    Đơn vị tính: Đồng Việt Nam (VNĐ)
                  </div>
                </div>

                {/* Nội dung bảng in */}
                {activeTab !== 'ratios' ? (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '9.5pt',
                      marginBottom: '28px',
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'left', width: '45%' }}>CHỈ TIÊU</th>
                        <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center', width: '10%' }}>MÃ SỐ</th>
                        <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center', width: '12%' }}>THUYẾT MINH</th>
                        <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right', width: '16.5%' }}>SỐ CUỐI KỲ</th>
                        <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right', width: '16.5%' }}>SỐ ĐẦU KỲ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRows.map((r, i) => (
                        <tr key={i} style={{ fontWeight: r.isBold ? 'bold' : 'normal' }}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px 5px ' + ((r.level || 0) * 12 + 8) + 'px' }}>
                            {r.name}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>
                            {r.code}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>
                            {r.note || '-'}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right' }}>
                            {formatMoney(r.closing)}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right' }}>
                            {formatMoney(r.opening)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                    {ratioCategories.map((c, i) => (
                      <div key={i}>
                        <div style={{ fontWeight: 'bold', fontSize: '10pt', marginBottom: '4px' }}>
                          {c.title}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <th style={{ border: '1px solid #94a3b8', padding: '5px 8px', textAlign: 'left' }}>Chỉ số</th>
                              <th style={{ border: '1px solid #94a3b8', padding: '5px 8px', textAlign: 'right', width: '100px' }}>Giá trị</th>
                              <th style={{ border: '1px solid #94a3b8', padding: '5px 8px', textAlign: 'center', width: '110px' }}>Đánh giá</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.ratios.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>{item.name}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{item.value}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'center' }}>{item.status === 'Chưa có dữ liệu' || item.status === '--' ? `Chưa có DL (${item.benchmark})` : `${item.status} (${item.benchmark})`}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}

                {/* Phần ký duyệt chuẩn Bộ Tài chính */}
                <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginTop: '30px' }}>
                  <div style={{ width: '30%' }}>
                    <div style={{ fontWeight: 'bold' }}>NGƯỜI LẬP BIỂU</div>
                    <div style={{ fontSize: '8.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                    <div style={{ height: '60px' }}></div>
                    <div style={{ fontWeight: 'bold' }}>Nguyễn Văn Kế Toán</div>
                  </div>
                  <div style={{ width: '30%' }}>
                    <div style={{ fontWeight: 'bold' }}>KẾ TOÁN TRƯỞNG</div>
                    <div style={{ fontSize: '8.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                    <div style={{ height: '60px' }}></div>
                    <div style={{ fontWeight: 'bold' }}>Trần Thị Thu Thảo</div>
                  </div>
                  <div style={{ width: '35%' }}>
                    <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>
                      {`Lập ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`}
                    </div>
                    <div style={{ fontWeight: 'bold' }}>GIÁM ĐỐC / ĐẠI DIỆN PHÁP LUẬT</div>
                    <div style={{ fontSize: '8.5pt', fontStyle: 'italic' }}>(Ký, họ tên, đóng dấu)</div>
                    <div style={{ height: '60px' }}></div>
                    <div style={{ fontWeight: 'bold' }}>Hà Hải Lâm</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offcanvas: Chi tiết các bảng CSDL kết nối tự động kết xuất báo cáo tài chính */}
      <Offcanvas
        isOpen={isDataSourcesOpen}
        onClose={() => setIsDataSourcesOpen(false)}
        title="Nguồn dữ liệu CSDL tự động"
        description={`Tổng hợp dữ liệu thời gian thực từ ${connectedTables.length || 12} bảng trong hệ thống để kết xuất báo cáo tài chính Thông tư 200`}
        icon={<DatabaseCheck size={22} className="text-primary" />}
        width="400px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="outline" size="sm" onClick={() => setIsDataSourcesOpen(false)}>
              Đóng
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              color: '#065f46',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircleFill size={14} style={{ color: '#10b981' }} />
              <span>Đồng bộ tự động thời gian thực</span>
            </div>
            <div style={{ lineHeight: '1.45' }}>
              Báo cáo tài chính tự động truy vấn và kết nối số liệu trực tiếp từ 12 bảng cơ sở dữ liệu. Mọi thay đổi tại các phân hệ đều được phản ánh ngay tức thì.
            </div>
          </div>

          <div style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            12 Bảng CSDL đang kết nối:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(connectedTables.length > 0 ? connectedTables : [
              { id: 'cash_and_bank_assets', name: 'Tài sản bằng tiền & Tiền gửi', count: 0, description: 'Quỹ tiền mặt, tài khoản ngân hàng và tiền gửi', targets: 'Mã 110, 111, 112, 120, 121 (B01, B03)' },
              { id: 'fixed_assets', name: 'Tài sản cố định (Hữu hình & Vô hình)', count: 0, description: 'Tài sản cố định máy móc thiết bị và phần mềm', targets: 'Mã 220, 221, 222, 223, 227 (B01, B03)' },
              { id: 'goods', name: 'Kho hàng hóa & Vật tư', count: 0, description: 'Kho nguyên vật liệu và thành phẩm', targets: 'Mã 140, 141, 149 (B01, B02)' },
              { id: 'warehouse_movements', name: 'Biến động xuất nhập tồn kho', count: 0, description: 'Nhập xuất tồn kho trong kỳ', targets: 'Mã 140 (B01), Mã 11 Giá vốn (B02)' },
              { id: 'debt_receivables', name: 'Công nợ phải thu khách hàng', count: 0, description: 'Phải thu khách hàng các dự án', targets: 'Mã 130, 131 (B01), Mã 01 Thu bán hàng (B03)' },
              { id: 'debt_payables', name: 'Công nợ phải trả nhà cung cấp', count: 0, description: 'Phải trả các nhà cung cấp', targets: 'Mã 310, 311 (B01), Mã 02 Chi trả NCC (B03)' },
              { id: 'bank_loans', name: 'Nợ vay tín dụng ngân hàng', count: 0, description: 'Các khoản vay tín dụng ngân hàng', targets: 'Mã 320, 330, 338 (B01), Mã 22, 23 (B02), Mã 34 (B03)' },
              { id: 'financial_expenses', name: 'Quản lý chi phí 4 nhóm', count: 0, description: 'Chi phí Sản xuất, Bán hàng, QLDN và Tài chính', targets: 'Mã 11, 22, 25, 26 (B02-DN)' },
              { id: 'contracts', name: 'Hợp đồng kinh tế & Báo giá', count: 0, description: 'Hợp đồng kinh tế và báo giá dự án', targets: 'Mã 01 Doanh thu, Mã 10 Doanh thu thuần (B02)' },
              { id: 'monthly_payrolls', name: 'Bảng lương & Bảo hiểm', count: 0, description: 'Lương thực lĩnh, bảo hiểm người lao động', targets: 'Mã 314 (B01), Mã 03 Chi trả NLĐ (B03)' },
              { id: 'accounting_journal_lines', name: 'Sổ nhật ký chung', count: 0, description: 'Định khoản kế toán các nghiệp vụ phát sinh', targets: 'Đồng bộ biến động trực tiếp toàn bộ B01, B02, B03' },
              { id: 'financial_initial_declarations', name: 'Khai báo số dư ban đầu', count: 0, description: 'Khai báo số dư vốn ban đầu của doanh nghiệp', targets: 'Mã 400, 411, 418, 421a (B01)' },
            ]).map((tbl, idx) => (
              <div
                key={tbl.id || idx}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                    {idx + 1}. {tbl.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      color: '#2563eb',
                    }}
                  >
                    {tbl.count} bản ghi
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.35' }}>
                  {tbl.description}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                  → Kết xuất: {tbl.targets}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Offcanvas>

      {/* Offcanvas: Chi tiết các khoản nợ vay ngân hàng cấu thành chỉ tiêu BCTC */}
      <Offcanvas
        isOpen={Boolean(selectedLoanRow)}
        onClose={() => setSelectedLoanRow(null)}
        title={selectedLoanRow ? `Nợ vay ngân hàng (Mã ${selectedLoanRow.code})` : 'Chi tiết nợ vay'}
        description={selectedLoanRow ? selectedLoanRow.name : 'Dữ liệu thời gian thực từ bảng CSDL bank_loans'}
        icon={<Bank size={22} className="text-primary" />}
        width="400px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="outline" size="sm" onClick={() => setSelectedLoanRow(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {selectedLoanRow && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Thẻ tổng quan số dư chỉ tiêu */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>
                Tổng số dư trên Báo cáo tài chính:
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {formatMoney(selectedLoanRow.closing)}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#047857', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircleFill size={11} style={{ color: '#10b981' }} />
                <span>Đồng bộ tự động từ bảng <code>bank_loans</code> trong SQLite</span>
              </div>
            </div>

            {loansSummary && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-surface-2)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.71875rem',
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-secondary)' }}>Tổng hạn mức cấp:</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                    {formatMoney(loansSummary.totalLimit)}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)' }}>Lãi dự kiến tháng:</div>
                  <div style={{ fontWeight: 700, color: '#d97706', marginTop: '1px' }}>
                    ~{formatMoney(loansSummary.monthlyInterest)}
                  </div>
                </div>
              </div>
            )}

            {/* Danh sách các hợp đồng tín dụng cấu thành */}
            <div style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Các khoản vay phân bổ vào chỉ tiêu này ({selectedLoanRow.loanBreakdown?.length || 0}):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(selectedLoanRow.loanBreakdown || []).map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0369a1' }}>
                      {item.bankName}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#059669', whiteSpace: 'nowrap' }}>
                      {formatMoney(item.allocatedAmount)}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.contractCode}</span>
                    <span>•</span>
                    <span>{item.facilityLabel}</span>
                    <span>•</span>
                    <span style={{ color: '#d97706', fontWeight: 600 }}>Lãi suất: {item.interestRate}</span>
                  </div>

                  <div style={{ fontSize: '0.6875rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                    {item.note}
                  </div>
                </div>
              ))}
            </div>

            {/* Hướng dẫn thao tác */}
            <div
              style={{
                fontSize: '0.71875rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.4',
                padding: '8px 10px',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: '6px',
              }}
            >
              💡 Để thêm mới hợp đồng vay, ghi nhận khế ước nhận nợ hoặc cập nhật trả gốc lãi, vui lòng truy cập phân hệ <strong>Quản lý công nợ và chi phí → Bước 3: Nợ vay</strong>. Dữ liệu sẽ tự động đồng bộ sang Báo cáo tài chính.
            </div>
          </div>
        )}
      </Offcanvas>

      {/* Offcanvas: Chi tiết Doanh thu hoạt động tài chính (Mã 21) từ Tài sản bằng tiền */}
      <Offcanvas
        isOpen={Boolean(selectedInterestRow)}
        onClose={() => setSelectedInterestRow(null)}
        title={selectedInterestRow ? `Doanh thu tài chính (Mã ${selectedInterestRow.code})` : 'Doanh thu tài chính'}
        description={selectedInterestRow ? selectedInterestRow.name : 'Dữ liệu lãi tiền gửi từ bảng cash_and_bank_assets và chiết khấu TT'}
        icon={<Wallet2 size={22} className="text-primary" />}
        width="400px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="outline" size="sm" onClick={() => setSelectedInterestRow(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {selectedInterestRow && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Thẻ tổng quan số dư chỉ tiêu */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600 }}>
                Tổng doanh thu tài chính kỳ này:
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                {formatMoney(selectedInterestRow.closing)}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#0284c7', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircleFill size={11} style={{ color: '#0284c7' }} />
                <span>Đồng bộ tự động từ bảng <code>cash_and_bank_assets</code> trong SQLite</span>
              </div>
            </div>

            {/* Thống kê 2 nhóm cấu thành */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                fontSize: '0.71875rem',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>Lãi tiền gửi ngân hàng:</div>
                <div style={{ fontWeight: 700, color: '#059669', marginTop: '1px' }}>
                  {formatMoney(
                    (selectedInterestRow.interestBreakdown || [])
                      .filter((i) => i.type !== 'discount')
                      .reduce((s, i) => s + (i.periodInterest || 0), 0)
                  )}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>Chiết khấu TT mua hàng:</div>
                <div style={{ fontWeight: 700, color: '#0284c7', marginTop: '1px' }}>
                  {formatMoney(
                    (selectedInterestRow.interestBreakdown || [])
                      .filter((i) => i.type === 'discount')
                      .reduce((s, i) => s + (i.periodInterest || 0), 0)
                  )}
                </div>
              </div>
            </div>

            {/* Danh sách các tài khoản và hợp đồng tiền gửi cấu thành */}
            <div style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nguồn cấu thành chỉ tiêu ({selectedInterestRow.interestBreakdown?.length || 0}):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(selectedInterestRow.interestBreakdown || []).map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: item.type === 'discount' ? '#0284c7' : '#0369a1' }}>
                      {item.name}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#059669', whiteSpace: 'nowrap' }}>
                      +{formatMoney(item.periodInterest)}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.accountNumber}</span>
                    <span>•</span>
                    <span>{item.termLabel}</span>
                    <span>•</span>
                    <span style={{ color: '#d97706', fontWeight: 600 }}>Lãi suất: {item.interestRate}</span>
                  </div>

                  <div style={{ fontSize: '0.6875rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                    {item.note}
                  </div>
                </div>
              ))}
            </div>

            {/* Hướng dẫn thao tác */}
            <div
              style={{
                fontSize: '0.71875rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.4',
                padding: '8px 10px',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: '6px',
              }}
            >
              💡 Để cập nhật số dư tài khoản ngân hàng, lãi suất hoặc mở thêm hợp đồng tiền gửi tiết kiệm, vui lòng truy cập phân hệ <strong>Quản lý tài chính → Quản lý tài sản → Tài sản bằng tiền</strong>. Dữ liệu sẽ tự động đồng bộ sang Báo cáo tài chính.
            </div>
          </div>
        )}
      </Offcanvas>

      {/* Offcanvas: Diễn giải chi tiết tất cả các chỉ tiêu cấu thành trên BCTC */}
      <Offcanvas
        isOpen={Boolean(selectedBreakdownRow && selectedBreakdownRow.breakdown)}
        onClose={() => setSelectedBreakdownRow(null)}
        title={
          selectedBreakdownRow && selectedBreakdownRow.breakdown
            ? `${selectedBreakdownRow.breakdown.title} (Mã ${selectedBreakdownRow.code})`
            : 'Diễn giải chỉ tiêu'
        }
        description={selectedBreakdownRow ? selectedBreakdownRow.name : 'Dữ liệu thời gian thực từ CSDL hệ thống'}
        icon={
          selectedBreakdownRow?.breakdown ? (
            selectedBreakdownRow.breakdown.type === 'loans' ? <Bank size={22} className="text-primary" /> :
            selectedBreakdownRow.breakdown.type === 'receivables' ? <CashStack size={22} className="text-info" /> :
            selectedBreakdownRow.breakdown.type === 'payables' ? <JournalCheck size={22} className="text-warning" /> :
            selectedBreakdownRow.breakdown.type === 'inventory' ? <DatabaseCheck size={22} className="text-success" /> :
            selectedBreakdownRow.breakdown.type === 'fixed_assets' ? <PieChartFill size={22} className="text-primary" /> :
            selectedBreakdownRow.breakdown.type === 'expenses' ? <GraphUp size={22} className="text-danger" /> :
            selectedBreakdownRow.breakdown.type === 'payroll' ? <Wallet2 size={22} className="text-success" /> :
            selectedBreakdownRow.breakdown.type === 'revenue' ? <GraphUp size={22} className="text-success" /> :
            <Wallet2 size={22} className="text-primary" />
          ) : (
            <Wallet2 size={22} className="text-primary" />
          )
        }
        width="400px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="outline" size="sm" onClick={() => setSelectedBreakdownRow(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {selectedBreakdownRow && selectedBreakdownRow.breakdown && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Thẻ tổng quan số dư chỉ tiêu */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600 }}>
                {selectedBreakdownRow.breakdown.totalLabel || 'Tổng số dư trên BCTC kỳ này:'}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                {formatMoney(selectedBreakdownRow.breakdown.totalAmount ?? selectedBreakdownRow.closing)}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#0284c7', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircleFill size={11} style={{ color: '#0284c7' }} />
                <span>{selectedBreakdownRow.breakdown.sourceLabel || `Đồng bộ tự động từ ${selectedBreakdownRow.breakdown.sourceTable} trong SQLite`}</span>
              </div>
            </div>

            {/* Thống kê nhóm cấu thành */}
            {selectedBreakdownRow.breakdown.stats && selectedBreakdownRow.breakdown.stats.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(selectedBreakdownRow.breakdown.stats.length, 2)}, 1fr)`,
                  gap: '8px',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-surface-2)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.71875rem',
                }}
              >
                {selectedBreakdownRow.breakdown.stats.map((st, sIdx) => (
                  <div key={sIdx}>
                    <div style={{ color: 'var(--text-secondary)' }}>{st.label}</div>
                    <div style={{ fontWeight: 700, color: st.color || 'var(--text-primary)', marginTop: '1px' }}>
                      {st.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Danh sách các khoản cấu thành chỉ tiêu */}
            <div style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nguồn cấu thành chỉ tiêu ({selectedBreakdownRow.breakdown.items?.length || 0}):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(selectedBreakdownRow.breakdown.items || []).map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0369a1' }}>
                      {item.title}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: item.amountColor || '#059669', whiteSpace: 'nowrap' }}>
                      {item.amountPrefix || ''}{formatMoney(item.amount)}
                    </span>
                  </div>

                  {item.subtitles && item.subtitles.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {item.subtitles.map((sub, subIdx) => (
                        <React.Fragment key={subIdx}>
                          {subIdx > 0 && <span>•</span>}
                          <span>{sub}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {item.note && (
                    <div style={{ fontSize: '0.6875rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                      {item.note}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Hướng dẫn thao tác */}
            {selectedBreakdownRow.breakdown.hint && (
              <div
                style={{
                  fontSize: '0.71875rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                  padding: '8px 10px',
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  borderRadius: '6px',
                }}
              >
                💡 {selectedBreakdownRow.breakdown.hint}
              </div>
            )}
          </div>
        )}
      </Offcanvas>
    </div>
  );
};
