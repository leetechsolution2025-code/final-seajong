import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Sliders,
} from 'react-bootstrap-icons';
import { PrintPreview } from '../../../components/common/PrintPreview';
import { Toggle } from '../../../components/common/Toggle';
import { Input } from '../../../components/common/Input';
import { useCompanyInfo } from '../../../hooks/useCompanyInfo';
import { type AssetItem } from './AssetManagementView';
import { type CashAssetItem } from './CashAssetsView';

export interface AssetReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixedAssets?: AssetItem[];
  cashAssets?: CashAssetItem[];
}


// Định dạng số phân tách hàng nghìn
const formatNumberGroup = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/\D/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
};

// Hàm bóc tách thông tin người phụ trách và chức vụ (hiển thị chức vụ bên dưới tên)
const parseManager = (str?: string): { name: string; role?: string } => {
  if (!str) return { name: '' };
  const trimmed = str.trim();
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|');
    return { name: parts[0].trim(), role: parts.slice(1).join('|').trim() };
  }
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    return { name: parts[0].trim(), role: parts.slice(1).join(' - ').trim() };
  }
  const match = trimmed.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (match) {
    return { name: match[1].trim(), role: match[2].trim() };
  }
  return { name: trimmed };
};

export const AssetReportPrintModal: React.FC<AssetReportPrintModalProps> = ({
  isOpen,
  onClose,
  fixedAssets: initialFixedAssets,
  cashAssets: initialCashAssets,
}) => {
  const company = useCompanyInfo();

  // Dữ liệu tài sản cố định
  const [fixedAssets, setFixedAssets] = useState<AssetItem[]>(() => {
    if (initialFixedAssets && initialFixedAssets.length > 0) return initialFixedAssets;
    try {
      const cached = localStorage.getItem('decodoor_finance_assets');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Dữ liệu tài sản bằng tiền
  const [cashAssets, setCashAssets] = useState<CashAssetItem[]>(() => {
    if (initialCashAssets && initialCashAssets.length > 0) return initialCashAssets;
    return [];
  });

  // Tùy chọn hiển thị các phần trong báo cáo
  const [includeCashAssets, setIncludeCashAssets] = useState(true);
  const [includeFixedAssets, setIncludeFixedAssets] = useState(true);
  const [includeSummaryKpis, setIncludeSummaryKpis] = useState(true);

  // Tải bổ sung từ API nếu chưa có
  useEffect(() => {
    if (!initialFixedAssets || initialFixedAssets.length === 0) {
      fetch('/api/finance/assets')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          setFixedAssets(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    } else {
      setFixedAssets(initialFixedAssets);
    }
  }, [initialFixedAssets]);

  useEffect(() => {
    if (!initialCashAssets || initialCashAssets.length === 0) {
      fetch('/api/finance/cash-assets')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          setCashAssets(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    } else {
      setCashAssets(initialCashAssets);
    }
  }, [initialCashAssets]);

  // Tính toán các chỉ số tài chính tổng hợp
  const stats = useMemo(() => {
    // Tài sản bằng tiền
    let totalCash = 0;
    let totalBank = 0;
    let totalTermDeposit = 0;

    cashAssets.forEach((c) => {
      const bal = Number(c.balance) || 0;
      if (c.type === 'cash') totalCash += bal;
      else if (c.type === 'term_deposit' || (Number(c.termMonths) || 0) > 0) totalTermDeposit += bal;
      else totalBank += bal;
    });

    const totalCashAssets = totalCash + totalBank + totalTermDeposit;

    // Tài sản cố định
    let totalOriginalPrice = 0;
    let totalResidualValue = 0;
    let totalMonthlyDeprec = 0;

    fixedAssets.forEach((f) => {
      const orig = Number(f.originalPrice) || 0;
      const resVal = Number(f.residualValue) || 0;
      const months = Number(f.depreciationMonths) || 60;
      const monthly = months > 0 ? Math.round(orig / months) : 0;

      totalOriginalPrice += orig;
      totalResidualValue += resVal;
      totalMonthlyDeprec += monthly;
    });

    const totalAccumulatedDeprec = Math.max(0, totalOriginalPrice - totalResidualValue);
    const grandTotalAssetValue = totalCashAssets + totalResidualValue;

    return {
      totalCash,
      totalBank,
      totalTermDeposit,
      totalCashAssets,
      totalOriginalPrice,
      totalResidualValue,
      totalAccumulatedDeprec,
      totalMonthlyDeprec,
      grandTotalAssetValue,
    };
  }, [cashAssets, fixedAssets]);

  const today = new Date();
  const defaultDocDate = `ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
  const defaultDocCode = `BC-TS-${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <PrintPreview
      isOpen={isOpen}
      onClose={onClose}
      documentTitle="BÁO CÁO QUẢN LÝ TÀI SẢN DOANH NGHIỆP"
      documentCode={defaultDocCode}
      date={defaultDocDate}
      performerName="Hà Hải Lâm"
      performerRole="Kế toán trưởng"
      supervisorName="Lê Công Vụ"
      supervisorRole="Tổng Giám đốc"
      sidebarTitle="Cấu hình trang in báo cáo"
      sidebarContent={({
        title,
        setTitle,
        docDate,
        setDocDate,
      }) => (
        <>
          {/* KHỐI 1: THÔNG TIN BÁO CÁO */}
          <div className="print-sidebar-section">
            <div className="print-sidebar-section-title">
              <FileText size={14} />
              <span>Thông tin báo cáo</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Input
                label="Tiêu đề văn bản báo cáo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề..."
              />
              <Input
                label="Ngày lập báo cáo"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                placeholder="Ví dụ: ngày 23 tháng 10 năm 2026"
              />
            </div>
          </div>

          {/* KHỐI 2: TÙY CHỌN NỘI DUNG IN */}
          <div className="print-sidebar-section">
            <div className="print-sidebar-section-title">
              <Sliders size={14} />
              <span>Phạm vi nội dung in ấn</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Toggle
                checked={includeSummaryKpis}
                onChange={(checked) => setIncludeSummaryKpis(checked)}
                label="Chỉ số tổng quan tài sản (Executive KPIs)"
              />
              <Toggle
                checked={includeCashAssets}
                onChange={(checked) => setIncludeCashAssets(checked)}
                label="Bảng kê Tài sản bằng tiền & Tiền gửi"
              />
              <Toggle
                checked={includeFixedAssets}
                onChange={(checked) => setIncludeFixedAssets(checked)}
                label="Bảng kê Danh mục Tài sản cố định"
              />
            </div>
          </div>
        </>
      )}
    >
      {(meta) => (
        <>
          {/* HEADER DOANH NGHIỆP & QUỐC HIỆU TIÊU NGỮ */}
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

          {/* TIÊU ĐỀ VĂN BẢN */}
          <div style={{ textAlign: 'center', margin: '20px 0 16px' }}>
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
              (V/v: Báo cáo quản lý Vốn bằng tiền & Danh mục Tài sản cố định - Cập nhật tính đến {meta.docDate})
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
              Chuẩn mực kế toán doanh nghiệp Việt Nam theo Thông tư 200/2014/TT-BTC
            </div>
          </div>

          {/* PHẦN 1: EXECUTIVE KPIS SUMMARY */}
          {includeSummaryKpis && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.825rem',
                  color: '#003087',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>I. TỔNG QUAN GIÁ TRỊ TÀI SẢN TOÀN DOANH NGHIỆP</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                    TỔNG TÀI SẢN THỰC TẾ
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
                    {formatNumberGroup(stats.grandTotalAssetValue)} đ
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                    Tiền mặt, NH + GTCL tài sản
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                    VỐN BẰNG TIỀN & TIỀN GỬI
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1d4ed8', marginTop: '4px' }}>
                    {formatNumberGroup(stats.totalCashAssets)} đ
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                    {cashAssets.length} quỹ & tài khoản NH
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>
                    NGUYÊN GIÁ TSCĐ
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#7e22ce', marginTop: '4px' }}>
                    {formatNumberGroup(stats.totalOriginalPrice)} đ
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                    {fixedAssets.length} máy móc & thiết bị
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
                    KHẤU HAO TRÍCH / THÁNG
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>
                    {formatNumberGroup(stats.totalMonthlyDeprec)} đ
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                    Hao mòn: {formatNumberGroup(stats.totalAccumulatedDeprec)} đ
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PHẦN 2: BÁO CÁO TÀI SẢN BẰNG TIỀN */}
          {includeCashAssets && (
            <div style={{ marginBottom: '22px' }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.825rem',
                  color: '#003087',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>II. CHI TIẾT VỐN BẰNG TIỀN & TIỀN GỬI NGÂN HÀNG (TK 111, 112, 128)</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>
                  Đơn vị tính: Đồng (VNĐ)
                </span>
              </div>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: 'none',
                  fontSize: '0.75rem',
                  lineHeight: 1.45,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderTop: '1.5px solid #0f172a',
                      borderBottom: '1.5px solid #0f172a',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <th style={{ padding: '8px 6px', textAlign: 'center', width: '36px', fontWeight: 800, border: 'none' }}>
                      STT
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, border: 'none' }}>
                      Quỹ tiền mặt & Tài khoản ngân hàng
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '180px', fontWeight: 800, border: 'none' }}>
                      Người phụ trách
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '200px', fontWeight: 800, border: 'none' }}>
                      Số dư hiện tại / Kỳ hạn & Lãi suất
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cashAssets.map((item, idx) => {
                    const isCash = item.type === 'cash';
                    const isTerm = item.type === 'term_deposit' || (Number(item.termMonths) || 0) > 0;
                    const mgr = parseManager(item.managerName || 'Phòng tài chính kế toán');

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b', border: 'none' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 10px', border: 'none' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                            STK: <strong>{item.accountNumber || '—'}</strong> • {item.branch || item.bankName}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', border: 'none' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{mgr.name}</div>
                          {mgr.role && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>{mgr.role}</div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: 'none' }}>
                          <div style={{ fontWeight: 800, color: '#003087', fontSize: '0.85rem' }}>
                            {formatNumberGroup(item.balance)} đ
                          </div>
                          <div style={{ fontSize: '0.7rem', marginTop: '1px' }}>
                            {isTerm ? (
                              <span style={{ fontWeight: 600, color: '#7e22ce' }}>
                                Kỳ hạn {item.termMonths}T • {item.interestRate}%/năm
                              </span>
                            ) : isCash ? (
                              <span style={{ color: '#166534', fontWeight: 500 }}>Tiền mặt tại két</span>
                            ) : (
                              <span style={{ color: '#64748b' }}>Không kỳ hạn</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      borderTop: '1.5px solid #0f172a',
                      borderBottom: '2px solid #0f172a',
                      backgroundColor: '#f8fafc',
                      fontWeight: 800,
                    }}
                  >
                    <td colSpan={3} style={{ padding: '9px 10px', textAlign: 'right', textTransform: 'uppercase', color: '#0f172a', border: 'none' }}>
                      TỔNG CỘNG VỐN BẰNG TIỀN & TIỀN GỬI (II):
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', color: '#003087', fontSize: '0.875rem', border: 'none' }}>
                      {formatNumberGroup(stats.totalCashAssets)} đ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* PHẦN 3: BÁO CÁO DANH MỤC TÀI SẢN CỐ ĐỊNH */}
          {includeFixedAssets && (
            <div style={{ marginBottom: '22px' }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.825rem',
                  color: '#003087',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>III. CHI TIẾT DANH MỤC TÀI SẢN CỐ ĐỊNH & KHẤU HAO (TK 211, 214)</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>
                  Đơn vị tính: Đồng (VNĐ)
                </span>
              </div>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: 'none',
                  fontSize: '0.72rem',
                  lineHeight: 1.4,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderTop: '1.5px solid #0f172a',
                      borderBottom: '1.5px solid #0f172a',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <th style={{ padding: '8px 4px', textAlign: 'center', width: '32px', fontWeight: 800, border: 'none' }}>
                      STT
                    </th>
                    <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 800, border: 'none' }}>
                      Tên tài sản cố định & Đơn vị sử dụng
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '230px', fontWeight: 800, border: 'none' }}>
                      Nguyên giá / GT còn lại / Khấu hao
                    </th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', width: '100px', minWidth: '100px', fontWeight: 800, border: 'none', whiteSpace: 'nowrap' }}>
                      Hiện trạng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fixedAssets.map((asset, idx) => {
                    const orig = Number(asset.originalPrice) || 0;
                    const resVal = Number(asset.residualValue) || 0;
                    const acc = Math.max(0, orig - resVal);
                    const months = Number(asset.depreciationMonths) || 60;
                    const monthly = months > 0 ? Math.round(orig / months) : 0;

                    return (
                      <tr
                        key={asset.id}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <td style={{ padding: '7px 4px', textAlign: 'center', color: '#64748b', border: 'none' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '7px 8px', border: 'none' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{asset.name}</div>
                          <div
                            style={{
                              fontSize: '0.6875rem',
                              color: '#475569',
                              marginTop: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#003087' }}>{asset.department}</span>
                            {asset.managerName && (() => {
                              const mgr = parseManager(asset.managerName);
                              return (
                                <>
                                  <span style={{ color: '#94a3b8' }}>•</span>
                                  <span>
                                    Phụ trách: <strong style={{ color: '#1e293b' }}>{mgr.name}</strong>
                                    {mgr.role && <span style={{ color: '#64748b' }}> ({mgr.role})</span>}
                                  </span>
                                </>
                              );
                            })()}
                            {asset.purchasedDate && (
                              <>
                                <span style={{ color: '#94a3b8' }}>•</span>
                                <span>
                                  Ngày SD: <strong style={{ color: '#1e293b' }}>{asset.purchasedDate}</strong>
                                </span>
                              </>
                            )}
                            {asset.serialNumber && (
                              <>
                                <span style={{ color: '#94a3b8' }}>•</span>
                                <span style={{ color: '#64748b' }}>S/N: {asset.serialNumber}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: 'none' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.8rem' }}>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, marginRight: '4px' }}>Nguyên giá:</span>
                            {formatNumberGroup(orig)} đ
                          </div>
                          <div style={{ fontSize: '0.6875rem', marginTop: '1px', color: '#64748b' }}>
                            <span>Khấu hao luỹ kế: </span>
                            <strong style={{ color: '#b91c1c' }}>-{formatNumberGroup(acc)} đ</strong>
                          </div>
                          <div style={{ fontSize: '0.6875rem', marginTop: '1px', color: '#64748b' }}>
                            <span>Còn lại: </span>
                            <strong style={{ color: '#15803d' }}>{formatNumberGroup(resVal)} đ</strong>
                          </div>
                          <div style={{ fontSize: '0.6875rem', marginTop: '1px', color: '#7e22ce', fontWeight: 600 }}>
                            Khấu hao: {formatNumberGroup(monthly)} đ/tháng
                          </div>
                        </td>
                        <td style={{ padding: '7px 6px', textAlign: 'center', border: 'none', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              backgroundColor: asset.status === 'maintenance' ? '#fef3c7' : '#ecfdf5',
                              color: asset.status === 'maintenance' ? '#b45309' : '#047857',
                            }}
                          >
                            {asset.statusLabel || (asset.status === 'maintenance' ? 'Bảo dưỡng' : 'Đang sử dụng')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      borderTop: '1.5px solid #0f172a',
                      borderBottom: '2px solid #0f172a',
                      backgroundColor: '#f8fafc',
                      fontWeight: 800,
                    }}
                  >
                    <td colSpan={2} style={{ padding: '9px 8px', textAlign: 'right', textTransform: 'uppercase', color: '#0f172a', border: 'none' }}>
                      TỔNG CỘNG TÀI SẢN CỐ ĐỊNH (III):
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', border: 'none' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.825rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600, marginRight: '4px' }}>Tổng nguyên giá:</span>
                        {formatNumberGroup(stats.totalOriginalPrice)} đ
                      </div>
                      <div style={{ fontSize: '0.7rem', marginTop: '1px', color: '#64748b' }}>
                        <span>Khấu hao luỹ kế: </span>
                        <strong style={{ color: '#b91c1c' }}>-{formatNumberGroup(stats.totalAccumulatedDeprec)} đ</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', marginTop: '1px', color: '#64748b' }}>
                        <span>Tổng còn lại: </span>
                        <strong style={{ color: '#15803d' }}>{formatNumberGroup(stats.totalResidualValue)} đ</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', marginTop: '1px', color: '#7e22ce', fontWeight: 700 }}>
                        Khấu hao/tháng: {formatNumberGroup(stats.totalMonthlyDeprec)} đ
                      </div>
                    </td>
                    <td style={{ border: 'none' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* PHẦN 4: KÝ XÁC NHẬN CÁC BÊN */}
          <div
            className="print-signatures"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
              marginTop: '28px',
              textAlign: 'center',
            }}
          >
            <div className="signature-col">
              <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', color: '#0f172a' }}>
                NGƯỜI LẬP BÁO CÁO
              </div>
              <div style={{ fontSize: '0.72rem', fontStyle: 'italic', color: '#64748b', marginTop: '2px' }}>
                (Ký, ghi rõ họ tên)
              </div>
              <div style={{ height: '90px' }} />
            </div>

            <div className="signature-col">
              <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', color: '#0f172a' }}>
                KẾ TOÁN TRƯỞNG
              </div>
              <div style={{ fontSize: '0.72rem', fontStyle: 'italic', color: '#64748b', marginTop: '2px' }}>
                (Ký, ghi rõ họ tên)
              </div>
              <div style={{ height: '90px' }} />
            </div>

            <div className="signature-col">
              <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', color: '#003087' }}>
                TỔNG GIÁM ĐỐC
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
  );
};

export default AssetReportPrintModal;

