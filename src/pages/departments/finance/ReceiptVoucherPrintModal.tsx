import React, { useState, useEffect, useMemo } from 'react';
import { PrintPreview } from '../../../components/common/PrintPreview';
import { useCompanyInfo } from '../../../hooks/useCompanyInfo';
import { Input } from '../../../components/common/Input';
import { Toggle } from '../../../components/common/Toggle';
import { Person, FileEarmarkText, People, InfoCircle, DatabaseCheck, CheckCircle } from 'react-bootstrap-icons';

export interface ReceiptVoucherData {
  code: string;
  date: string;
  customerName: string;
  payerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  amount: number;
  reason: string;
  contractCode?: string;
  stageTitle?: string;
  paymentMethod?: string;
  debitAccount?: string;
  creditAccount?: string;
  notes?: string;
  creator?: string;
  cashier?: string;
  accountant?: string;
  director?: string;
}

export interface ReceiptVoucherPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptVoucherData | null;
}

// Hàm định dạng số có dấu phân cách hàng nghìn
const formatNumber = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/\D/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
};

// Hàm đọc số tiền thành chữ tiếng Việt
const convertNumberToVietnameseWords = (num: number): string => {
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

  const trimmed = fullText.trim();
  if (!trimmed) return 'Không đồng chẵn.';
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return `${capitalized} đồng chẵn.`;
};

// Tách ngày tháng năm từ chuỗi ngày (hỗ trợ dạng "DD/MM/YYYY", "HH:mm • DD/MM/YYYY", "YYYY-MM-DD")
const parseDateParts = (dateStr?: string) => {
  const now = new Date();
  if (!dateStr) {
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
    };
  }

  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return {
      day: slashMatch[1].padStart(2, '0'),
      month: slashMatch[2].padStart(2, '0'),
      year: slashMatch[3],
    };
  }

  const dashMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dashMatch) {
    return {
      day: dashMatch[3].padStart(2, '0'),
      month: dashMatch[2].padStart(2, '0'),
      year: dashMatch[1],
    };
  }

  return {
    day: String(now.getDate()).padStart(2, '0'),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    year: String(now.getFullYear()),
  };
};

/**
 * Component Modal xem trước và in Phiếu Thu chuẩn
 * Panel bên trái hỗ trợ tùy biến thông tin khách hàng, người nộp tiền, chứng từ và danh sách người ký đồng bộ CSDL
 */
export const ReceiptVoucherPrintModal: React.FC<ReceiptVoucherPrintModalProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  const company = useCompanyInfo();

  // Danh sách nhân sự lấy từ DB (/api/users)
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDbUsers(data);
      })
      .catch((err) => console.error('Lỗi khi tải danh sách người dùng từ DB:', err));
  }, []);

  // Lấy họ tên người dùng đang đăng nhập từ session
  const loggedInUserName = useMemo(() => {
    try {
      const raw = localStorage.getItem('decodoor_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.user?.name || parsed.user?.fullName || '';
      }
    } catch {}
    return '';
  }, []);

  // Tìm Giám đốc / Đại diện pháp luật từ DB
  const defaultDirector = useMemo(() => {
    const found = dbUsers.find(
      (u) =>
        u.position?.toLowerCase().includes('giám đốc') ||
        u.department?.toLowerCase().includes('ban giám đốc')
    );
    return found?.name || company.legal_rep || 'Hà Hải Lâm';
  }, [dbUsers, company.legal_rep]);

  // Tìm Trưởng phòng Tài chính / Kế toán trưởng từ DB
  const defaultAccountant = useMemo(() => {
    const found = dbUsers.find(
      (u) =>
        (u.department?.toLowerCase().includes('tài chính') || u.department?.toLowerCase().includes('kế toán')) &&
        (u.position?.toLowerCase().includes('trưởng phòng') || u.position?.toLowerCase().includes('kế toán trưởng'))
    );
    return found?.name || 'Mai Thị Ngọc';
  }, [dbUsers]);

  // Tìm Kế toán viên từ DB
  const defaultStaffAccountant = useMemo(() => {
    const found = dbUsers.find(
      (u) =>
        (u.department?.toLowerCase().includes('tài chính') || u.department?.toLowerCase().includes('kế toán')) &&
        u.position?.toLowerCase().includes('kế toán')
    );
    return found?.name || 'Nguyễn Thị Tuyết';
  }, [dbUsers]);

  // Các trường dữ liệu có thể tùy biến tại Panel bên trái
  const [customerName, setCustomerName] = useState('');
  const [payerName, setPayerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [director, setDirector] = useState('');
  const [accountant, setAccountant] = useState('');
  const [creator, setCreator] = useState('');
  const [cashier, setCashier] = useState('');
  const [showSignerNames, setShowSignerNames] = useState(true);
  const [showPaidStamp, setShowPaidStamp] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Đồng bộ form khi prop receipt hoặc dữ liệu DB thay đổi
  useEffect(() => {
    if (!receipt) return;
    setCustomerName(receipt.customerName || '');
    setPayerName(receipt.payerName || '');
    setCustomerAddress(receipt.customerAddress || '');
    setReason(receipt.reason || '');
    setAmount(Number(receipt.amount) || 0);
    setNotes(receipt.notes || '');
    setDirector(receipt.director || defaultDirector);
    setAccountant(receipt.accountant || defaultAccountant);
    setCreator(receipt.creator || loggedInUserName || defaultStaffAccountant);
    setCashier(receipt.cashier || '');

    // Truy xuất bản ghi đã lưu từ CSDL bảng financial_vouchers
    if (receipt.code) {
      fetch(`/api/vouchers/${encodeURIComponent(receipt.code)}`)
        .then((res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((dbVoucher) => {
          if (!dbVoucher) return;
          if (dbVoucher.customerName || dbVoucher.partnerName) {
            setCustomerName(dbVoucher.customerName || dbVoucher.partnerName);
          }
          if (dbVoucher.payerName || dbVoucher.payerReceiverName) {
            setPayerName(dbVoucher.payerName || dbVoucher.payerReceiverName);
          }
          if (dbVoucher.customerAddress || dbVoucher.address) {
            setCustomerAddress(dbVoucher.customerAddress || dbVoucher.address);
          }
          if (dbVoucher.reason) {
            setReason(dbVoucher.reason);
          }
          if (dbVoucher.amount !== undefined && dbVoucher.amount !== null && Number(dbVoucher.amount) > 0) {
            setAmount(Number(dbVoucher.amount));
          }
          if (dbVoucher.notes !== undefined && dbVoucher.notes !== null) {
            setNotes(dbVoucher.notes);
          }
          if (dbVoucher.director) {
            setDirector(dbVoucher.director);
          }
          if (dbVoucher.accountant) {
            setAccountant(dbVoucher.accountant);
          }
          if (dbVoucher.creator) {
            setCreator(dbVoucher.creator);
          }
          if (dbVoucher.cashier !== undefined && dbVoucher.cashier !== null) {
            setCashier(dbVoucher.cashier);
          }
          if (dbVoucher.hasStamp !== undefined) {
            setShowPaidStamp(!!dbVoucher.hasStamp);
          }
        })
        .catch((err) => console.warn('Lỗi khi tải voucher từ CSDL:', err));
    }
  }, [receipt, defaultDirector, defaultAccountant, defaultStaffAccountant, loggedInUserName]);

  if (!receipt) return null;

  const { day, month, year } = parseDateParts(receipt.date);
  const wordsAmount = convertNumberToVietnameseWords(amount);
  const isBankTransfer =
    receipt.paymentMethod?.toLowerCase().includes('khoản') ||
    receipt.paymentMethod?.toLowerCase().includes('ngân hàng');
  const defaultDebit = receipt.debitAccount || (isBankTransfer ? '1121' : '1111');
  const defaultCredit = receipt.creditAccount || '131';

  // Lưu thông tin phiếu thu vào bảng financial_vouchers trong SQLite
  const handleSaveToDatabase = async () => {
    if (!receipt?.code) return;
    setIsSaving(true);
    setSaveSuccessMsg('');
    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherCode: receipt.code,
          voucherType: 'receipt',
          date: receipt.date,
          partnerName: customerName,
          payerReceiverName: payerName,
          address: customerAddress,
          amount,
          amountInWords: wordsAmount,
          reason,
          notes,
          creator,
          accountant,
          cashier,
          director,
          hasStamp: showPaidStamp,
          paymentMethod: receipt.paymentMethod || 'Chuyển khoản',
          debitAccount: defaultDebit,
          creditAccount: defaultCredit,
          referenceCode: receipt.contractCode,
          stageTitle: receipt.stageTitle,
        }),
      });
      if (res.ok) {
        setSaveSuccessMsg('Đã lưu thành công vào CSDL (bảng financial_vouchers)');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setSaveSuccessMsg('Có lỗi khi lưu vào CSDL');
      }
    } catch (err) {
      console.error('Lỗi khi lưu phiếu thu vào CSDL:', err);
      setSaveSuccessMsg('Lỗi kết nối máy chủ');
    } finally {
      setIsSaving(false);
    }
  };

  // Hiển thị người nộp tiền: nếu có tên người nộp cụ thể thì hiển thị [Người nộp] - [Khách hàng/Đơn vị]
  const displayPayer = payerName
    ? customerName
      ? `${payerName} - ${customerName}`
      : payerName
    : customerName;

  return (
    <PrintPreview
      isOpen={isOpen}
      onClose={onClose}
      documentTitle="PHIẾU THU"
      documentCode={receipt.code}
      date={`Ngày ${day} tháng ${month} năm ${year}`}
      department="Phòng Tài Chính Kế Toán"
      author={creator || ''}
      defaultPaperSize="A4"
      defaultOrientation="portrait"
      hideSidebar={false}
      sidebarTitle=""
      sidebarContent={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '20px' }}>
          {/* KHỐI 1: THÔNG TIN KHÁCH HÀNG & NGƯỜI NỘP TIỀN */}
          <div className="print-sidebar-section">
            <div className="print-sidebar-section-title">
              <Person size={14} />
              <span>Khách hàng & Người nộp tiền</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Input
                label="Đơn vị / Khách hàng"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Tên công ty hoặc khách hàng..."
              />

              <Input
                label="Họ và tên người nộp tiền"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Ví dụ: Ông/Bà đại diện nộp tiền..."
              />

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Địa chỉ khách hàng
                </label>
                <textarea
                  rows={3}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Địa chỉ khách hàng..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.45,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* KHỐI 2: NỘI DUNG VÀ CHỨNG TỪ KÈM THEO */}
          <div className="print-sidebar-section">
            <div className="print-sidebar-section-title">
              <FileEarmarkText size={14} />
              <span>Nội dung & Chứng từ kèm theo</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Lý do nộp tiền
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nội dung thu tiền..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.45,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <Input
                label="Số tiền"
                type="number"
                numberGroup={true}
                value={amount || ''}
                onNumericChange={(num) => setAmount(num)}
                placeholder="Nhập số tiền..."
                suffix="đồng"
              />

              <div>
                <Input
                  label="Chứng từ kèm theo (Kèm theo)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Giấy báo Có ngân hàng..."
                />

                {/* Các gợi ý nhanh chuẩn nghiệp vụ kế toán */}
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    'Giấy báo Có ngân hàng',
                    'Ủy nhiệm chi',
                    '01 Chứng từ gốc',
                    'Hóa đơn GTGT',
                    '',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNotes(preset)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: notes === preset ? '#e0f2fe' : '#f8fafc',
                        color: notes === preset ? '#0369a1' : '#475569',
                        cursor: 'pointer',
                        fontWeight: notes === preset ? 600 : 400,
                      }}
                    >
                      {preset === '' ? '✕ Để trống' : preset}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#64748b',
                    marginTop: '8px',
                    lineHeight: 1.4,
                    background: '#f8fafc',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <InfoCircle size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#0284c7' }} />
                  <span>
                    Chuẩn kế toán: đính kèm <strong>Giấy báo Có</strong> khi thu chuyển khoản qua ngân hàng, hoặc{' '}
                    <strong>Phiếu thu / Hóa đơn</strong> khi thu tiền mặt.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KHỐI 3: DANH SÁCH NGƯỜI KÝ */}
          <div className="print-sidebar-section">
            <div className="print-sidebar-section-title">
              <People size={14} />
              <span>Chữ ký & Họ tên</span>
            </div>

            <div className="print-sidebar-toggle-card" style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Toggle
                checked={showSignerNames}
                onChange={setShowSignerNames}
                label="In sẵn họ tên dưới chữ ký"
              />
              <Toggle
                checked={showPaidStamp}
                onChange={setShowPaidStamp}
                label="Đóng dấu đỏ 'ĐÃ THU TIỀN'"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Input
                label="Giám đốc"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                placeholder="Họ tên Giám đốc..."
              />

              <Input
                label="Kế toán trưởng"
                value={accountant}
                onChange={(e) => setAccountant(e.target.value)}
                placeholder="Họ tên Kế toán trưởng..."
              />

              <Input
                label="Người lập phiếu"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="Họ tên người lập..."
              />

              <Input
                label="Thủ quỹ"
                value={cashier}
                onChange={(e) => setCashier(e.target.value)}
                placeholder="Để trống nếu người nhận ký sống..."
              />
            </div>
          </div>

          {/* KHỐI 4: NÚT LƯU THAY ĐỔI VÀO CSDL (BẢNG FINANCIAL_VOUCHERS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: isSaving ? '#94a3b8' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!isSaving) e.currentTarget.style.backgroundColor = '#0369a1';
              }}
              onMouseLeave={(e) => {
                if (!isSaving) e.currentTarget.style.backgroundColor = '#0284c7';
              }}
            >
              <DatabaseCheck size={16} />
              <span>{isSaving ? 'Đang lưu vào CSDL...' : 'Lưu phiếu thu vào CSDL'}</span>
            </button>

            {saveSuccessMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#15803d',
                  fontWeight: 500,
                }}
              >
                <CheckCircle size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
          </div>
        </div>
      }
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
          {/* 1. Header: Thông tin doanh nghiệp kèm Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            {/* Logo của doanh nghiệp */}
            <div style={{ flexShrink: 0 }}>
              <img
                src={company.logo_url || '/logo.png'}
                alt={company.company_name || 'Seajong Logo'}
                style={{
                  height: '54px',
                  maxHeight: '54px',
                  maxWidth: '120px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>

            {/* Thông tin doanh nghiệp: Tên, địa chỉ, mã số thuế và điện thoại cùng dòng */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '11.5pt', textTransform: 'uppercase', lineHeight: 1.3 }}>
                {company.company_name || 'CÔNG TY CỔ PHẦN CỬA DECO DOOR'}
              </div>
              <div style={{ fontSize: '10pt', marginTop: '3px', lineHeight: 1.35 }}>
                <strong>Địa chỉ:</strong> {company.address || 'KCN Phùng Xá, Thạch Thất, TP. Hà Nội'}
              </div>
              <div
                style={{
                  fontSize: '10pt',
                  marginTop: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  flexWrap: 'wrap',
                  lineHeight: 1.35,
                }}
              >
                {company.tax_code && (
                  <span>
                    <strong>Mã số thuế:</strong> {company.tax_code}
                  </span>
                )}
                {company.phone && (
                  <span>
                    <strong>Điện thoại:</strong> {company.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Tiêu đề chính Phiếu Thu và Ngày tháng */}
          <div style={{ textAlign: 'center', margin: '42px 0 18px 0' }}>
            <h1
              style={{
                fontSize: '22pt',
                fontWeight: 'bold',
                letterSpacing: '1px',
                margin: '0 0 4px 0',
                textTransform: 'uppercase',
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
                <strong>Số:</strong> <span style={{ color: '#000' }}>{receipt.code}</span>
              </div>
              <div>
                <strong>Nợ:</strong> <span>{defaultDebit}</span>
              </div>
              <div>
                <strong>Có:</strong> <span>{defaultCredit}</span>
              </div>
            </div>
          </div>

          {/* 3. Nội dung chi tiết khoản thu */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
              fontSize: '12.5pt',
              marginTop: '18px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ minWidth: '195px' }}>Họ và tên người nộp tiền:</span>
              <span
                style={{
                  fontWeight: 'bold',
                  flex: 1,
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                }}
              >
                {displayPayer}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ minWidth: '195px' }}>Địa chỉ:</span>
              <span
                style={{
                  flex: 1,
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                }}
              >
                {customerAddress}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ minWidth: '195px' }}>Lý do nộp:</span>
              <span
                style={{
                  flex: 1,
                  fontWeight: 600,
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                }}
              >
                {reason}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ minWidth: '195px' }}>Số tiền:</span>
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '13pt',
                  flex: 1,
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                }}
              >
                {formatNumber(amount)} đồng
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ minWidth: '195px' }}>(Viết bằng chữ):</span>
              <span
                style={{
                  fontStyle: 'italic',
                  fontWeight: 'bold',
                  flex: 1,
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                }}
              >
                {wordsAmount}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ minWidth: '195px' }}>Kèm theo:</span>
              <span
                style={{
                  flex: 1,
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                }}
              >
                {notes}
              </span>
            </div>
          </div>

          {/* 4. Khối 5 chữ ký */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              textAlign: 'center',
              fontSize: '11pt',
              gap: '6px',
              marginTop: '16px',
            }}
          >
            {/* Cột 1: Giám đốc */}
            <div>
              <div style={{ fontWeight: 'bold' }}>Giám đốc</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký, họ tên, đóng dấu)</div>
              <div style={{ height: '75px' }}></div>
              <div style={{ fontWeight: 'bold', minHeight: '1.2em' }}>
                {showSignerNames ? director || '' : ''}
              </div>
            </div>

            {/* Cột 2: Kế toán trưởng */}
            <div>
              <div style={{ fontWeight: 'bold' }}>Kế toán trưởng</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
              <div style={{ height: '75px' }}></div>
              <div style={{ fontWeight: 'bold', minHeight: '1.2em' }}>
                {showSignerNames ? accountant || '' : ''}
              </div>
            </div>

            {/* Cột 3: Người nộp tiền */}
            <div>
              <div style={{ fontWeight: 'bold' }}>Người nộp tiền</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
              <div style={{ height: '75px' }}></div>
              <div style={{ fontWeight: 'bold', minHeight: '1.2em' }}>
                {showSignerNames ? payerName || '' : ''}
              </div>
            </div>

            {/* Cột 4: Người lập phiếu */}
            <div>
              <div style={{ fontWeight: 'bold' }}>Người lập phiếu</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
              <div style={{ height: '75px' }}></div>
              <div style={{ fontWeight: 'bold', minHeight: '1.2em' }}>
                {showSignerNames ? creator || '' : ''}
              </div>
            </div>

            {/* Cột 5: Thủ quỹ */}
            <div style={{ position: 'relative' }}>
              <div style={{ fontWeight: 'bold' }}>Thủ quỹ</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
              <div
                style={{
                  height: '75px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPaidStamp && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '0',
                      transform: 'translateY(-50%) rotate(-3deg)',
                      transformOrigin: 'right center',
                      width: '46mm',
                      height: '21.9mm',
                      pointerEvents: 'none',
                      zIndex: 5,
                    }}
                  >
                    <img
                      src="/thutien_stampt.png"
                      alt="Đã thu tiền"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: 0.88,
                        filter: 'contrast(1.05)',
                      }}
                    />
                    {/* Ngày */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '18%',
                        left: '28.3%',
                        transform: 'translateX(-50%)',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        color: '#002b80',
                        opacity: 0.92,
                        fontFamily: "'Courier New', Courier, monospace",
                      }}
                    >
                      {day}
                    </div>
                    {/* Tháng */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '18%',
                        left: '54.2%',
                        transform: 'translateX(-50%)',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        color: '#002b80',
                        opacity: 0.92,
                        fontFamily: "'Courier New', Courier, monospace",
                      }}
                    >
                      {month}
                    </div>
                    {/* Năm */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '18%',
                        left: '84.7%',
                        transform: 'translateX(-50%)',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        color: '#002b80',
                        opacity: 0.92,
                        fontFamily: "'Courier New', Courier, monospace",
                      }}
                    >
                      {year.slice(-2)}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 'bold', minHeight: '1.2em' }}>
                {showSignerNames ? cashier || '' : ''}
              </div>
            </div>
          </div>

          {/* 5. Phần xác nhận đã nhận đủ tiền và đơn vị tính (theo hình 2) */}
          <div
            style={{
              marginTop: '36px',
              borderTop: '1px solid #ccc',
              paddingTop: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11pt',
              color: '#333',
            }}
          >
            <div style={{ fontStyle: 'italic' }}>
              Đã nhận đủ số tiền (viết bằng chữ): {wordsAmount}
            </div>
            <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '11.5pt', whiteSpace: 'nowrap' }}>
              Đơn vị tính: đồng Việt Nam (VND)
            </div>
          </div>
        </div>
      )}
    </PrintPreview>
  );
};
