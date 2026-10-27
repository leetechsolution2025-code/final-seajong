import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Sliders,
  Bookmark,
  FileEarmarkPdf,
  X,
} from 'react-bootstrap-icons';
import { useCompanyInfo } from '../../../hooks/useCompanyInfo';
import { DEFAULT_COMPANY_INFO } from '../../../services/companyService';
import {
  toDateInputValue,
  toDisplayDate,
  type SupplierOption,
  type OrderItemLine,
} from './CreatePurchaseOrderModal';

export interface POOrderGroup {
  supplier: SupplierOption;
  lines: OrderItemLine[];
  total: number;
}

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderGroups: POOrderGroup[];
  selectedSupplierId?: string;
  onConfirmAndSave: (createdGroup?: POOrderGroup) => void;
}

export const formatNumberGroup = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/[^\d]/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
};

// Hàm đọc số tiền thành chữ tiếng Việt chuẩn xác
const convertNumberToWords = (num: number, isCNY = false): string => {
  if (!num || isNaN(num) || num <= 0) {
    return isCNY ? 'Không nhân dân tệ' : 'Không đồng';
  }
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
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return isCNY ? `${capitalized} nhân dân tệ` : `${capitalized} đồng chẵn`;
};

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  orderGroups,
  selectedSupplierId = 'all',
  onConfirmAndSave,
}) => {
  const company = useCompanyInfo();
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Chọn NCC đang hiển thị trong preview
  const [activeSupplierIndex, setActiveSupplierIndex] = useState<number>(0);

  // Cấu hình tuỳ chỉnh thông tin in (Sidebar trái)
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const useCNY = false;
  const exchangeRate = 3861;
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toLocaleDateString('vi-VN')
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('Chuyển khoản');
  const [deliveryMethod, setDeliveryMethod] = useState<string>('Giao hàng tận nơi');
  const [transportMethod, setTransportMethod] = useState<string>('Xe tải');
  const [vatRate, setVatRate] = useState<number>(10);

  // Thông tin giao hàng lấy từ dữ liệu doanh nghiệp thực tế
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    () => company?.address || DEFAULT_COMPANY_INFO.address
  );
  const [recipientName, setRecipientName] = useState<string>(
    () => company?.legal_rep || DEFAULT_COMPANY_INFO.legal_rep
  );
  const [recipientPhone, setRecipientPhone] = useState<string>(
    () => company?.phone || DEFAULT_COMPANY_INFO.phone
  );
  const [extraNotes, setExtraNotes] = useState<string>('');

  // Tự động đồng bộ khi thông tin doanh nghiệp thay đổi hoặc được nạp từ DB
  useEffect(() => {
    if (company?.address) setDeliveryAddress(company.address);
    if (company?.legal_rep) setRecipientName(company.legal_rep);
    if (company?.phone) setRecipientPhone(company.phone);
  }, [company?.address, company?.legal_rep, company?.phone]);

  // Lọc nhóm đơn hàng tương ứng
  const currentGroups = useMemo(() => {
    if (selectedSupplierId && selectedSupplierId !== 'all') {
      const match = orderGroups.filter((g) => g.supplier.id === selectedSupplierId);
      return match.length > 0 ? match : orderGroups;
    }
    return orderGroups;
  }, [orderGroups, selectedSupplierId]);

  const currentGroup: POOrderGroup | undefined = currentGroups[activeSupplierIndex] || currentGroups[0];

  // Mã phiếu yêu cầu tổng hợp
  const reqCodes = useMemo(() => {
    if (!currentGroup) return 'VC-20261009-5074';
    const codes = Array.from(new Set(currentGroup.lines.map((l) => l.reqCode)));
    return codes.join(', ') || 'VC-20261009-5074';
  }, [currentGroup]);

  // Mã đơn hàng PO
  const poCode = useMemo(() => {
    if (!currentGroup) return 'PO-20261011-3441-AE4S';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suppSuffix = currentGroup.supplier.code.replace(/[^A-Za-z0-9]/g, '').slice(-3) || 'NCC';
    return `PO-${dateStr}-${suppSuffix}-${activeSupplierIndex + 1}`;
  }, [currentGroup, activeSupplierIndex]);

  // Tính toán số tiền (VND hoặc CNY)
  const formatAmount = (vndAmount: number) => {
    if (useCNY) {
      const cny = vndAmount / (exchangeRate || 1);
      return `¥ ${cny.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    return `${vndAmount.toLocaleString('vi-VN')} đ`;
  };

  const subtotal = currentGroup ? currentGroup.total : 0;
  const vatAmount = Math.round(subtotal * (vatRate / 100));
  const grandTotal = subtotal + vatAmount;

  const grandTotalDisplay = useCNY ? grandTotal / (exchangeRate || 1) : grandTotal;
  const amountInWords = convertNumberToWords(grandTotalDisplay, useCNY);

  // In tài liệu qua iframe độc lập (tránh xung đột CSS và khắc phục triệt để lỗi trang trắng)
  const handlePrint = () => {
    const printContent = document.getElementById('po-print-paper-content');
    if (!printContent) return;

    // Xoá iframe in cũ nếu còn tồn tại
    const oldFrame = document.getElementById('po-print-iframe');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'po-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const pri = iframe.contentWindow;
    if (!pri) return;

    pri.document.open();
    pri.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Đơn đặt hàng ${poCode}</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,100..900;1,100..900&display=swap">
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 15mm 10mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: 'Roboto Condensed', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            #po-print-paper-content {
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    pri.document.close();

    const triggerPrint = () => {
      setTimeout(() => {
        try {
          pri.focus();
          pri.print();
        } catch (e) {
          console.error('Print error:', e);
        }
        setTimeout(() => {
          try {
            iframe.remove();
          } catch {}
        }, 1500);
      }, 250);
    };

    const images = pri.document.images;
    if (!images || images.length === 0) {
      triggerPrint();
    } else {
      let loaded = 0;
      const checkAllLoaded = () => {
        loaded++;
        if (loaded >= images.length) {
          triggerPrint();
        }
      };
      for (let i = 0; i < images.length; i++) {
        if (images[i].complete) {
          checkAllLoaded();
        } else {
          images[i].onload = checkAllLoaded;
          images[i].onerror = checkAllLoaded;
        }
      }
      setTimeout(triggerPrint, 700);
    }
  };

  // Lưu đơn đặt hàng
  const handleSavePO = () => {
    onConfirmAndSave(currentGroup);
  };

  if (!isOpen || !currentGroup) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backdropFilter: 'blur(3px)',
      }}
    >
      {/* ========================================================= */}
      {/* 1. TOP MODAL HEADER BAR                                  */}
      {/* ========================================================= */}
      <div
        style={{
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
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
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Printer size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a' }}>
              Xem trước Đơn đặt hàng
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              NCC: <strong style={{ color: '#0f172a' }}>{currentGroup.supplier.name}</strong> • Từ phiếu YC:{' '}
              <strong style={{ color: '#2563eb' }}>{reqCodes}</strong>
            </div>
          </div>
        </div>

        {/* Nút chuyển đổi đơn nếu có nhiều NCC */}
        {currentGroups.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
            }}
          >
            {currentGroups.map((g, idx) => (
              <button
                key={g.supplier.id}
                type="button"
                onClick={() => setActiveSupplierIndex(idx)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: activeSupplierIndex === idx ? 700 : 500,
                  backgroundColor: activeSupplierIndex === idx ? '#ffffff' : 'transparent',
                  color: activeSupplierIndex === idx ? '#2563eb' : '#64748b',
                  boxShadow: activeSupplierIndex === idx ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Đơn {idx + 1}: {g.supplier.name.split(' ')[0]}...
              </button>
            ))}
          </div>
        )}

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#475569',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Sliders size={14} />
            <span>{showSidebar ? 'Ẩn tùy chỉnh' : 'Hiện tùy chỉnh'}</span>
          </button>

          <button
            type="button"
            onClick={handleSavePO}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Bookmark size={14} />
            <span>Lưu đơn đặt hàng</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <FileEarmarkPdf size={14} />
            <span>Lưu và Xuất PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleSavePO();
              handlePrint();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#0a2e6b',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(10, 46, 107, 0.25)',
            }}
          >
            <Printer size={15} />
            <span>Xác nhận và In</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <X size={16} />
            <span>Đóng</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. BODY CONTENT (SIDEBAR + PAPER CANVAS)                  */}
      {/* ========================================================= */}
      <div style={{ flex: '1 1 0%', display: 'flex', overflow: 'hidden' }}>
        {/* SIDEBAR TÙY CHỈNH THÔNG TIN */}
        {showSidebar && (
          <div
            className="custom-scrollbar"
            style={{
              width: '360px',
              backgroundColor: '#f8fafc',
              borderRight: '1px solid #e2e8f0',
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em' }}>
              TUỲ CHỈNH THÔNG TIN
            </div>

            {/* Ngày đặt hàng */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                NGÀY ĐẶT HÀNG
              </label>
              <input
                type="date"
                value={toDateInputValue(orderDate)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch {}
                }}
                onChange={(e) => {
                  if (e.target.value) {
                    setOrderDate(toDisplayDate(e.target.value));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Hình thức thanh toán và Giao hàng */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  HÌNH THỨC THANH TOÁN
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.75rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Chuyển khoản">Chuyển khoản</option>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Công nợ">Công nợ</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  GIAO HÀNG
                </label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.75rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Giao hàng tận nơi">Giao hàng tận nơi</option>
                  <option value="Nhận tại kho NCC">Nhận tại kho NCC</option>
                  <option value="Giao theo đợt">Giao theo đợt</option>
                  <option value="FOB">FOB</option>
                </select>
              </div>
            </div>

            {/* Người nhận và Số điện thoại (chuyển xuống dưới Thanh toán / Giao hàng) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  NGƯỜI NHẬN
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.75rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  SỐ ĐIỆN THOẠI
                </label>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.75rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Phương tiện và VAT (giảm chiều rộng ô VAT) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  PHƯƠNG TIỆN
                </label>
                <select
                  value={transportMethod}
                  onChange={(e) => setTransportMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.75rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Xe tải">Xe tải</option>
                  <option value="Xe máy">Xe máy</option>
                  <option value="Container">Container</option>
                  <option value="Đầu kéo">Đầu kéo</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  VAT (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.75rem',
                    textAlign: 'right',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Địa chỉ giao hàng (đưa ra ngoài card, bỏ chữ Địa chỉ) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                ĐỊA CHỈ GIAO HÀNG
              </label>
              <textarea
                rows={2}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.75rem',
                  lineHeight: '1.35',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Ghi chú thêm (tự điều chỉnh chiều cao chiếm hết chiều cao khả dụng) */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0%', minHeight: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                GHI CHÚ THÊM
              </label>
              <textarea
                placeholder="Ghi chú, yêu cầu đặc biệt..."
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                style={{
                  width: '100%',
                  flex: '1 1 0%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.75rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}

        {/* RIGHT PAPER CANVAS (BẢN IN A4) */}
        <div
          className="custom-scrollbar"
          style={{
            flex: '1 1 0%',
            backgroundColor: '#e2e8f0',
            overflowY: 'auto',
            padding: '30px 20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <div
            id="po-print-paper-content"
            ref={printAreaRef}
            style={{
              width: '840px',
              minHeight: '1120px',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              padding: '36px 42px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: "'Roboto Condensed', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              color: '#000000',
            }}
          >
            {/* 1. Header công ty và Tiêu đề đơn hàng */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              {/* Bên trái: Logo và Thông tin doanh nghiệp hiển thị cùng dòng */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '480px' }}>
                {/* Logo doanh nghiệp cân đối theo chiều cao nội dung */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  {company?.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.company_name || 'Logo'}
                      style={{
                        height: '54px',
                        maxHeight: '54px',
                        maxWidth: '120px',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '6px',
                        backgroundColor: '#0a2e6b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1rem',
                        letterSpacing: '1px',
                      }}
                    >
                      {company?.short_name || 'DCD'}
                    </div>
                  )}
                </div>

                {/* Nội dung thông tin doanh nghiệp */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: '1.3' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#000000', textTransform: 'uppercase' }}>
                    {company?.company_name || DEFAULT_COMPANY_INFO.company_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#000000' }}>
                    Địa chỉ: {company?.address || deliveryAddress}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#000000' }}>
                    Điện thoại: {company?.phone || recipientPhone}
                    {company?.email ? ` • Email: ${company.email}` : ''}
                  </div>
                </div>
              </div>

              {/* Bên phải: Hộp Tiêu đề ĐƠN ĐẶT HÀNG (chỉ tô màu nền cho dòng chữ Đơn đặt hàng, bảng full width sát đáy) */}
              <div
                style={{
                  width: '320px',
                  border: '1px solid #0a2e6b',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Chỉ tô màu nền cho dòng chữ Đơn đặt hàng */}
                <div
                  style={{
                    backgroundColor: '#0a2e6b',
                    color: '#ffffff',
                    padding: '6px 12px',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '1.125rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  ĐƠN ĐẶT HÀNG
                </div>

                <div
                  style={{
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontSize: '0.625rem',
                    fontStyle: 'italic',
                    color: '#000000',
                  }}
                >
                  Số phiếu này phải xuất hiện trên tất cả các chứng từ giao nhận, hóa đơn và kiện hàng.
                </div>

                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    borderTop: '1px solid #0a2e6b',
                    marginTop: 'auto',
                    fontSize: '0.6875rem',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <th
                        style={{
                          padding: '5px 4px',
                          borderRight: '1px solid #cbd5e1',
                          fontWeight: 700,
                          textAlign: 'center',
                          color: '#000000',
                          width: '50%',
                        }}
                      >
                        NGÀY ĐẶT HÀNG
                      </th>
                      <th
                        style={{
                          padding: '5px 4px',
                          fontWeight: 700,
                          textAlign: 'center',
                          color: '#000000',
                          width: '50%',
                        }}
                      >
                        SỐ ĐƠN HÀNG
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ backgroundColor: '#ffffff', color: '#000000', borderTop: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '6px 4px',
                          borderRight: '1px solid #cbd5e1',
                          textAlign: 'center',
                          fontWeight: 600,
                        }}
                      >
                        {orderDate}
                      </td>
                      <td
                        style={{
                          padding: '6px 4px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#000000',
                        }}
                      >
                        {poCode}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Hai cột: NHÀ CUNG CẤP VÀ GIAO HÀNG ĐẾN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              {/* NHÀ CUNG CẤP */}
              <div style={{ border: '1px solid #0a2e6b', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    backgroundColor: '#0a2e6b',
                    color: '#ffffff',
                    padding: '5px 10px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    letterSpacing: '0.05em',
                  }}
                >
                  NHÀ CUNG CẤP
                </div>
                <div style={{ padding: '8px 12px', fontSize: '0.75rem', lineHeight: '1.4', minHeight: '80px', color: '#000000' }}>
                  <div style={{ fontWeight: 800, color: '#000000', fontSize: '0.8125rem', textTransform: 'uppercase' }}>
                    {currentGroup.supplier.name}
                  </div>
                  <div style={{ color: '#000000', marginTop: '2px' }}>
                    Linh Đàm - Hà Nội
                  </div>
                  <div style={{ color: '#000000' }}>
                    Người liên hệ: <span style={{ fontWeight: 600, color: '#000000' }}>Nguyễn Văn Đại</span>
                  </div>
                  <div style={{ color: '#000000' }}>
                    Số điện thoại: <span style={{ fontWeight: 600, color: '#000000' }}>{currentGroup.supplier.phone || '0988 123 456'}</span>
                  </div>
                </div>
              </div>

              {/* GIAO HÀNG ĐẾN */}
              <div style={{ border: '1px solid #0a2e6b', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    backgroundColor: '#0a2e6b',
                    color: '#ffffff',
                    padding: '5px 10px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    letterSpacing: '0.05em',
                  }}
                >
                  GIAO HÀNG ĐẾN
                </div>
                <div style={{ padding: '8px 12px', fontSize: '0.75rem', lineHeight: '1.4', minHeight: '80px', color: '#000000' }}>
                  <div style={{ fontWeight: 800, color: '#000000', fontSize: '0.8125rem', textTransform: 'uppercase' }}>
                    {company?.company_name || DEFAULT_COMPANY_INFO.company_name}
                  </div>
                  <div style={{ color: '#000000', marginTop: '2px' }}>
                    {deliveryAddress}
                  </div>
                  <div style={{ color: '#000000' }}>
                    Người liên hệ: <span style={{ fontWeight: 600, color: '#000000' }}>{recipientName}</span>
                  </div>
                  <div style={{ color: '#000000' }}>
                    Số điện thoại: <span style={{ fontWeight: 600, color: '#000000' }}>{recipientPhone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Thanh thông tin vận chuyển, giao nhận và hình thức thanh toán (3 cột) */}
            <div style={{ border: '1px solid #0a2e6b', borderRadius: '2px', overflow: 'hidden', marginBottom: '14px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  backgroundColor: '#0a2e6b',
                  color: '#ffffff',
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  textAlign: 'center',
                }}
              >
                <div style={{ padding: '5px 8px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                  PHƯƠNG THỨC VẬN CHUYỂN
                </div>
                <div style={{ padding: '5px 8px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                  HÌNH THỨC GIAO HÀNG
                </div>
                <div style={{ padding: '5px 8px' }}>
                  HÌNH THỨC THANH TOÁN
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                  color: '#000000',
                }}
              >
                <div style={{ padding: '7px 8px', borderRight: '1px solid #0a2e6b' }}>
                  {transportMethod}
                </div>
                <div style={{ padding: '7px 8px', borderRight: '1px solid #0a2e6b' }}>
                  {deliveryMethod}
                </div>
                <div style={{ padding: '7px 8px' }}>
                  {paymentMethod}
                </div>
              </div>
            </div>

            {/* 4. BẢNG CHI TIẾT MẶT HÀNG (bỏ border bao ngoài và lưới đứng, chữ đen rõ nét) */}
            <div style={{ marginBottom: '14px', flex: '1 1 auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: '#000000' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0a2e6b', color: '#ffffff', fontWeight: 800, fontSize: '0.6875rem' }}>
                    <th style={{ width: '40px', padding: '7px 4px', textAlign: 'center' }}>
                      STT
                    </th>
                    <th style={{ padding: '7px 10px', textAlign: 'left' }}>
                      TÊN HÀNG / MÔ TẢ
                    </th>
                    <th style={{ width: '60px', padding: '7px 4px', textAlign: 'center' }}>
                      ĐVT
                    </th>
                    <th style={{ width: '75px', padding: '7px 4px', textAlign: 'center' }}>
                      SỐ LƯỢNG
                    </th>
                    <th style={{ width: '120px', padding: '7px 8px', textAlign: 'right' }}>
                      ĐƠN GIÁ ({useCNY ? '¥' : 'đ'})
                    </th>
                    <th style={{ width: '130px', padding: '7px 8px', textAlign: 'right' }}>
                      THÀNH TIỀN ({useCNY ? '¥' : 'đ'})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentGroup.lines.map((line, idx) => {
                    const lineUnitDisplay = useCNY ? line.unitPrice / (exchangeRate || 1) : line.unitPrice;
                    const lineTotalDisplay = useCNY ? line.totalPrice / (exchangeRate || 1) : line.totalPrice;

                    return (
                      <tr
                        key={line.id}
                        style={{
                          borderBottom: '1px solid #cbd5e1',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          color: '#000000',
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '8px 4px', color: '#000000' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 700, color: '#000000' }}>
                            {line.productName}
                          </div>
                          {line.spec && (
                            <div style={{ fontSize: '0.6875rem', color: '#000000', marginTop: '1px' }}>
                              {line.spec}
                            </div>
                          )}
                          <div style={{ fontSize: '0.6875rem', color: '#000000', marginTop: '2px' }}>
                            Ngày giao: {line.deliveryDate || orderDate}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px 4px', color: '#000000' }}>
                          {line.unit}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px 4px', fontWeight: 800, color: '#000000' }}>
                          {formatNumberGroup(line.quantity)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 8px', color: '#000000' }}>
                          {useCNY
                            ? lineUnitDisplay.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                            : lineUnitDisplay.toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 8px', fontWeight: 700, color: '#000000' }}>
                          {useCNY
                            ? lineTotalDisplay.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                            : lineTotalDisplay.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 5. GHI CHÚ QUAN TRỌNG VÀ TỔNG TIỀN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '22px' }}>
              {/* Điều khoản ghi chú */}
              <div style={{ fontSize: '0.6875rem', color: '#000000', lineHeight: '1.45' }}>
                <div style={{ fontWeight: 800, color: '#000000', marginBottom: '3px' }}>
                  GHI CHÚ QUAN TRỌNG:
                </div>
                <ol style={{ margin: 0, paddingLeft: '14px', color: '#000000' }}>
                  <li>Vui lòng ghi xác nhận đơn hàng trong vòng 24 giờ sau khi nhận được PO này.</li>
                  <li>Hàng hóa phải được giao đúng số lượng, quy cách và thời gian đã cam kết.</li>
                  <li>Hóa đơn GTGT phải được xuất đúng theo thông tin công ty và gửi kèm khi giao hàng.</li>
                  <li>Mọi thay đổi phải được thông báo và chấp thuận bằng văn bản trước khi giao hàng.</li>
                  {extraNotes && <li style={{ fontWeight: 600, color: '#000000' }}>{extraNotes}</li>}
                </ol>
              </div>

              {/* Bảng tổng kết tiền */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: '#000000' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ color: '#000000' }}>Cộng tiền hàng:</span>
                  <span style={{ fontWeight: 600, color: '#000000' }}>{formatAmount(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ color: '#000000' }}>Thuế GTGT ({vatRate}%):</span>
                  <span style={{ fontWeight: 600, color: '#000000' }}>{formatAmount(vatAmount)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderTop: '1px solid #0a2e6b',
                    borderBottom: '1px solid #0a2e6b',
                    marginTop: '2px',
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#000000', fontSize: '0.875rem' }}>TỔNG CỘNG:</span>
                  <span style={{ fontWeight: 800, color: '#000000', fontSize: '1rem' }}>
                    {formatAmount(grandTotal)}
                  </span>
                </div>
                <div style={{ fontSize: '0.6875rem', fontStyle: 'italic', color: '#000000', textAlign: 'right', marginTop: '2px' }}>
                  (Bằng chữ: {amountInWords})
                </div>
              </div>
            </div>

            {/* 6. CHỮ KÝ BA BÊN */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                textAlign: 'center',
                marginTop: 'auto',
                paddingTop: '16px',
                color: '#000000',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#000000' }}>
                  NGƯỜI LẬP PHIẾU
                </div>
                <div style={{ fontSize: '0.625rem', color: '#000000', fontStyle: 'italic', marginTop: '1px' }}>
                  (Ký, ghi rõ họ tên)
                </div>
                <div style={{ height: '60px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#000000' }}>
                  {recipientName}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#000000' }}>
                  KẾ TOÁN TRƯỞNG
                </div>
                <div style={{ fontSize: '0.625rem', color: '#000000', fontStyle: 'italic', marginTop: '1px' }}>
                  (Ký, ghi rõ họ tên)
                </div>
                <div style={{ height: '60px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#000000' }}>
                  Nguyễn Thị Bích
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#000000' }}>
                  GIÁM ĐỐC
                </div>
                <div style={{ fontSize: '0.625rem', color: '#000000', fontStyle: 'italic', marginTop: '1px' }}>
                  (Ký, ghi rõ họ tên và đóng dấu)
                </div>
                <div style={{ height: '60px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#000000' }}>
                  Hà Hải Lâm
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
