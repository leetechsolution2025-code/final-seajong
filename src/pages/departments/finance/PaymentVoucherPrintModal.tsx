import React, { useState, useEffect } from 'react';
import { PrintPreview } from '../../../components/common/PrintPreview';
import { useCompanyInfo } from '../../../hooks/useCompanyInfo';
import type { ExpenseItem } from './DebtCostManagementView';

export interface PaymentVoucherPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: ExpenseItem | null;
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

// Tách ngày tháng năm từ chuỗi ngày
const parseDateParts = (dateStr?: string) => {
  const now = new Date();
  if (!dateStr) {
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
    };
  }

  // Hỗ trợ dạng DD/MM/YYYY hoặc YYYY-MM-DD
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return {
        day: parts[0].padStart(2, '0'),
        month: parts[1].padStart(2, '0'),
        year: parts[2],
      };
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return {
        day: parts[2].padStart(2, '0'),
        month: parts[1].padStart(2, '0'),
        year: parts[0],
      };
    }
  }

  return {
    day: String(now.getDate()).padStart(2, '0'),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    year: String(now.getFullYear()),
  };
};

/**
 * Component Modal xem trước và in Phiếu Chi chuẩn Thông tư 200/2014/TT-BTC & TT 133/2016/TT-BTC
 * (Mẫu số 02 - TT: Phiếu chi kèm đầy đủ định khoản kép kế toán và 5 chữ ký)
 */
export const PaymentVoucherPrintModal: React.FC<PaymentVoucherPrintModalProps> = ({
  isOpen,
  onClose,
  voucher,
}) => {
  const company = useCompanyInfo();
  const [dbData, setDbData] = useState<any>(null);

  useEffect(() => {
    if (voucher?.code) {
      fetch(`/api/vouchers/${encodeURIComponent(voucher.code)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setDbData(data);
        })
        .catch(() => {});
    }
  }, [voucher]);

  if (!voucher) return null;

  const spendDate = dbData?.date || voucher.spendDate;
  const { day, month, year } = parseDateParts(spendDate);
  const amountNumber = Number(dbData?.amount !== undefined ? dbData.amount : voucher.amount) || 0;
  const wordsAmount = convertNumberToVietnameseWords(amountNumber);
  const vNotes = dbData?.notes !== undefined ? dbData.notes : (voucher.notes || '01');
  const vSpender = dbData?.creator || voucher.spender || 'Nguyễn Thị Tuyết';
  const vReceiver = dbData?.payerReceiverName || voucher.proposer || voucher.spender || 'Người nhận';
  const vDirector = dbData?.director || company.legal_rep || 'Hà Hải Lâm';
  const vAccountant = dbData?.accountant || 'Mai Thị Ngọc';
  const vCashier = dbData?.cashier || 'Hoàng Thị Thảo';

  return (
    <PrintPreview
      isOpen={isOpen}
      onClose={onClose}
      documentTitle="PHIẾU CHI"
      documentCode={voucher.code}
      date={`Ngày ${day} tháng ${month} năm ${year}`}
      department={voucher.department || 'Phòng Tài Chính Kế Toán'}
      author={vSpender}
      defaultPaperSize="A4"
      defaultOrientation="portrait"
      hideSidebar={true}
      sidebarContent={null}
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
          {/* 1. Header: Đơn vị bên trái kèm Logo - Mẫu số thông tư bên phải */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '64%' }}>
              {/* Logo của doanh nghiệp */}
              <div style={{ flexShrink: 0 }}>
                <img
                  src={company.logo_url || '/decodoor_brand_logo.png'}
                  alt={company.company_name || 'Logo'}
                  style={{
                    height: '52px',
                    maxHeight: '52px',
                    maxWidth: '100px',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>

              {/* Thông tin doanh nghiệp: Tên, địa chỉ, mã số thuế và điện thoại cùng dòng */}
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', lineHeight: 1.3 }}>
                  {company.company_name || 'CÔNG TY CỔ PHẦN CỬA DECO DOOR'}
                </div>
                <div style={{ fontSize: '10pt', marginTop: '2px', lineHeight: 1.35 }}>
                  <strong>Địa chỉ:</strong> {company.address || 'KCN Phùng Xá, Thạch Thất, TP. Hà Nội'}
                </div>
                <div style={{ fontSize: '10pt', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', lineHeight: 1.35 }}>
                  {company.tax_code && (
                    <span><strong>Mã số thuế:</strong> {company.tax_code}</span>
                  )}
                  {company.phone && (
                    <span><strong>Điện thoại:</strong> {company.phone}</span>
                  )}
                </div>
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

          {/* 2. Tiêu đề chính Phiếu Chi và Ngày tháng */}
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
                <strong>Số:</strong> <span style={{ color: '#000' }}>{voucher.code}</span>
              </div>
              <div>
                <strong>Nợ:</strong> <span>{voucher.debitAccount || '627'}</span>
              </div>
              <div>
                <strong>Có:</strong> <span>{voucher.creditAccount || '1111'}</span>
              </div>
            </div>
          </div>

          {/* 3. Nội dung chi tiết khoản chi */}
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
              <span style={{ minWidth: '195px' }}>Họ và tên người nhận tiền:</span>
              <span
                style={{
                  fontWeight: 'bold',
                  flex: 1,
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                }}
              >
                {voucher.proposer || voucher.spender || 'Cán bộ thụ hưởng'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ minWidth: '195px' }}>Địa chỉ (Bộ phận):</span>
              <span
                style={{
                  flex: 1,
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                }}
              >
                {voucher.department || 'Khối Sản Xuất'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ minWidth: '195px' }}>Lý do chi:</span>
              <span
                style={{
                  flex: 1,
                  fontWeight: 600,
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                }}
              >
                {voucher.title}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ minWidth: '195px' }}>Số tiền:</span>
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '13pt',
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                }}
              >
                {formatNumber(amountNumber)} đồng
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
                {vNotes} Chứng từ gốc
              </span>
            </div>
          </div>

          {/* 4. Dòng ngày tháng ký xác nhận */}
          <div style={{ textAlign: 'right', fontStyle: 'italic', fontSize: '11.5pt', marginBottom: '14px' }}>
            Ngày {day} tháng {month} năm {year}
          </div>

          {/* 5. Khối 5 chữ ký chuẩn mực kế toán */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              textAlign: 'center',
              fontSize: '11pt',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            {/* Cột 1: Giám đốc */}
            <div>
              <div style={{ fontWeight: 'bold' }}>Giám đốc</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký, họ tên, đóng dấu)</div>
              <div style={{ height: '70px' }}></div>
              <div style={{ fontWeight: 'bold' }}>{vDirector}</div>
            </div>

            {/* Cột 2: Kế toán trưởng */}
            <div>
              <div style={{ fontWeight: 'bold' }}>Kế toán trưởng</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
              <div style={{ height: '70px' }}></div>
              <div style={{ fontWeight: 'bold' }}>{vAccountant}</div>
            </div>

            {/* Cột 3: Thủ quỹ */}
            <div>
              <div style={{ fontWeight: 'bold' }}>Thủ quỹ</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
              <div style={{ height: '70px' }}></div>
              <div style={{ fontWeight: 'bold' }}>{vCashier}</div>
            </div>

            {/* Cột 4: Người lập phiếu */}
            <div>
              <div style={{ fontWeight: 'bold' }}>Người lập phiếu</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
              <div style={{ height: '70px' }}></div>
              <div style={{ fontWeight: 'bold' }}>{vSpender}</div>
            </div>

            {/* Cột 5: Người nhận tiền */}
            <div>
              <div style={{ fontWeight: 'bold' }}>Người nhận tiền</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
              <div style={{ height: '70px' }}></div>
              <div style={{ fontWeight: 'bold' }}>{vReceiver}</div>
            </div>
          </div>

          {/* 6. Phần xác nhận nhận đủ tiền từ thủ quỹ */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '14px',
              borderTop: '1px dashed #94a3b8',
              fontSize: '11pt',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span>Đã nhận đủ số tiền (viết bằng chữ):</span>
              <span
                style={{
                  flex: 1,
                  fontStyle: 'italic',
                  borderBottom: '1px dotted #888',
                  paddingLeft: '8px',
                }}
              >
                {wordsAmount}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5pt', marginTop: '4px' }}>
              <div>+ Tỷ giá ngoại tệ (vàng bạc, đá quý): ............................................</div>
              <div>+ Số tiền quy đổi: ............................................ đồng</div>
            </div>

            <div style={{ fontStyle: 'italic', fontSize: '9.5pt', color: '#666', marginTop: '4px' }}>
              (Liên gửi ra ngoài phải đóng dấu của doanh nghiệp)
            </div>
          </div>
        </div>
      )}
    </PrintPreview>
  );
};
