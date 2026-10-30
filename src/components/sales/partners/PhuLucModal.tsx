import React, { useState, useEffect } from 'react';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import {
  FileEarmarkPlus,
  Printer,
  FileEarmarkPdf,
  Check2,
  XLg,
  Plus,
  Trash,
  CloudArrowUp,
  FileEarmarkPdfFill,
} from 'react-bootstrap-icons';
import type { PartnerItem } from '../../../pages/sales/SalesPartnersPage';
import {
  uploadPartnerScanFile,
  getAttachmentDisplayName,
  openAttachmentFile,
} from '../../../utils/partnerUtils';

export interface PhuLucCustomClause {
  title: string;
  content: string;
}

interface PhuLucModalProps {
  open: boolean;
  partner: PartnerItem | null;
  onClose: () => void;
  onSaved: (updatedFields: Partial<PartnerItem>) => void;
}

const formatCurrencyDots = (val: string | number): string => {
  const clean = String(val ?? '')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\D/g, '');
  if (!clean) return '';
  const num = parseInt(clean, 10);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('vi-VN').format(num);
};

function computeAppendixTimelines(baseDateStr: string, durationDaysStr: string) {
  let baseDate = new Date();
  if (baseDateStr) {
    const clean = baseDateStr.trim();
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 3) {
        baseDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    } else if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) {
        baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
    }
  }
  if (isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  const totalDays = Math.max(5, parseInt(String(durationDaysStr || '15'), 10) || 15);
  const addDays = (d: Date, days: number) => {
    const next = new Date(d);
    next.setDate(next.getDate() + days);
    return next;
  };
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  const d1End = Math.max(1, Math.round(totalDays * 0.2) - 1);
  const d2End = Math.max(d1End + 1, Math.round(totalDays * 0.35) - 1);
  const d3End = Math.max(d2End + 1, Math.round(totalDays * 0.8) - 1);
  const d4End = Math.max(d3End + 1, totalDays - 2);
  const d5End = Math.max(d4End, totalDays - 1);

  return {
    t1: `${fmt(baseDate)} - ${fmt(addDays(baseDate, d1End))}`,
    t2: `${fmt(addDays(baseDate, d1End))} - ${fmt(addDays(baseDate, d2End))}`,
    t3: `${fmt(addDays(baseDate, d2End))} - ${fmt(addDays(baseDate, d3End))}`,
    t4: `${fmt(addDays(baseDate, d3End))} - ${fmt(addDays(baseDate, d4End))}`,
    t5: `${fmt(addDays(baseDate, d5End))}`,
  };
}

export function docSoTienVN(soTien: number): string {
  if (!soTien || soTien <= 0) return '';
  const target = Math.round(Math.abs(soTien));
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
    return text + ' đồng';
  }
  return '';
}

export const PhuLucModal: React.FC<PhuLucModalProps> = ({
  open,
  partner,
  onClose,
  onSaved,
}) => {
  const [saving, setSaving] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [uploadingScanPdf, setUploadingScanPdf] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const [plNo, setPlNo] = useState('01');
  const [plDate, setPlDate] = useState('');
  const [plAddress, setPlAddress] = useState('Văn phòng Công ty Cổ phần Seajong Việt Nam');

  const [hdANguoiKy, setHdANguoiKy] = useState('Lê Công Vụ');
  const [hdAChucVu, setHdAChucVu] = useState('Giám đốc');
  const [hdB_Ten, setHdB_Ten] = useState('');
  const [hdB_DiaChi, setHdB_DiaChi] = useState('');
  const [hdB_MST, setHdB_MST] = useState('');
  const [hdB_DaiDien, setHdB_DaiDien] = useState('');
  const [hdB_ChucVu, setHdB_ChucVu] = useState('Giám đốc');
  const [hdB_DienThoai, setHdB_DienThoai] = useState('');
  const [hdB_Email, setHdB_Email] = useState('');

  const [plCptc, setPlCptc] = useState('16.100.000');
  const [plCptcText, setPlCptcText] = useState('Mười sáu triệu một trăm nghìn đồng');
  const [plRevenueMkt, setPlRevenueMkt] = useState('400.000.000');
  const [plRevenueMktText, setPlRevenueMktText] = useState('Bốn trăm triệu đồng');
  const [plRevenueCommit, setPlRevenueCommit] = useState('100.000.000');
  const [plRevenueCommitText, setPlRevenueCommitText] = useState('Một trăm triệu đồng');

  const [plDurationDays, setPlDurationDays] = useState('15');
  const [plMaxDelayDays, setPlMaxDelayDays] = useState('19');
  const [plTimeline1, setPlTimeline1] = useState('');
  const [plTimeline2, setPlTimeline2] = useState('');
  const [plTimeline3, setPlTimeline3] = useState('');
  const [plTimeline4, setPlTimeline4] = useState('');
  const [plTimeline5, setPlTimeline5] = useState('');

  const [plPhase1Date, setPlPhase1Date] = useState('');
  const [plPhase1Rate, setPlPhase1Rate] = useState('50%');
  const [plPhase1Amount, setPlPhase1Amount] = useState('8.050.000');
  const [plPhase1AmountText, setPlPhase1AmountText] = useState(
    'Tám triệu không trăm năm mươi nghìn đồng'
  );

  const [plPhase2Date, setPlPhase2Date] = useState('');
  const [plPhase2Rate, setPlPhase2Rate] = useState('30%');
  const [plPhase2Amount, setPlPhase2Amount] = useState('4.830.000');
  const [plPhase2AmountText, setPlPhase2AmountText] = useState(
    'Bốn triệu tám trăm ba mươi nghìn đồng'
  );

  const [plPhase3Date, setPlPhase3Date] = useState('');
  const [plPhase3Rate, setPlPhase3Rate] = useState('20%');
  const [plPhase3Amount, setPlPhase3Amount] = useState('3.220.000');
  const [plPhase3AmountText, setPlPhase3AmountText] = useState(
    'Ba triệu hai trăm hai mươi nghìn đồng'
  );

  const [plPenaltyMaxDelay, setPlPenaltyMaxDelay] = useState('4');
  const [plCustomClauses, setPlCustomClauses] = useState<PhuLucCustomClause[]>([]);
  const [plPdf, setPlPdf] = useState('');

  useEffect(() => {
    fetch('/api/company')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setCompanyInfo(d.data || d);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open || !partner) return;
    const customerFullAddress = partner.address
      ? partner.area && !partner.address.toLowerCase().includes(partner.area.toLowerCase())
        ? `${partner.address}, ${partner.area}`
        : partner.address
      : partner.area || '';
    const todayStr = new Date().toISOString().split('T')[0];

    setPlNo(partner.plNo || '01');
    setPlDate(partner.plDate || todayStr);
    setPlAddress(partner.plAddress || 'Văn phòng Công ty Cổ phần Seajong Việt Nam');

    setHdANguoiKy(partner.hdANguoiKy || partner.bbANguoiKy || companyInfo?.legalRep || 'Lê Công Vụ');
    setHdAChucVu(partner.hdAChucVu || partner.bbAChucVu || 'Giám đốc');
    setHdB_Ten(partner.hdB_Ten || partner.bbB_Ten || partner.companyName || partner.name || '');
    setHdB_DiaChi(partner.hdB_DiaChi || partner.bbB_DiaChi || customerFullAddress);
    setHdB_MST(partner.hdB_MST || partner.bbB_MST || '');
    setHdB_DaiDien(partner.hdB_DaiDien || partner.bbB_DaiDien || partner.name || '');
    setHdB_ChucVu(partner.hdB_ChucVu || partner.bbB_ChucVu || 'Đại diện');
    setHdB_DienThoai(partner.hdB_DienThoai || partner.bbB_DienThoai || partner.phone || '');
    setHdB_Email(partner.hdB_Email || partner.bbB_Email || partner.email || '');

    setPlCptc(partner.plCptc || '16.100.000');
    setPlCptcText(partner.plCptcText || 'Mười sáu triệu một trăm nghìn đồng');
    setPlRevenueMkt(partner.plRevenueMkt || '400.000.000');
    setPlRevenueMktText(partner.plRevenueMktText || 'Bốn trăm triệu đồng');
    setPlRevenueCommit(partner.plRevenueCommit || '100.000.000');
    setPlRevenueCommitText(partner.plRevenueCommitText || 'Một trăm triệu đồng');

    const resolvedPlDate = partner.plDate || partner.signDate || todayStr;
    const resolvedDuration = partner.plDurationDays || '15';
    const defaultTimelines = computeAppendixTimelines(resolvedPlDate, resolvedDuration);

    setPlDurationDays(resolvedDuration);
    setPlMaxDelayDays(partner.plMaxDelayDays || String((parseInt(resolvedDuration, 10) || 15) + 4));
    setPlTimeline1(partner.plTimeline1 || defaultTimelines.t1);
    setPlTimeline2(partner.plTimeline2 || defaultTimelines.t2);
    setPlTimeline3(partner.plTimeline3 || defaultTimelines.t3);
    setPlTimeline4(partner.plTimeline4 || defaultTimelines.t4);
    setPlTimeline5(partner.plTimeline5 || defaultTimelines.t5);

    setPlPhase1Date(partner.plPhase1Date || '');
    setPlPhase1Rate(partner.plPhase1Rate || '50%');
    setPlPhase1Amount(partner.plPhase1Amount || '8.050.000');
    setPlPhase1AmountText(
      partner.plPhase1AmountText || 'Tám triệu không trăm năm mươi nghìn đồng'
    );

    setPlPhase2Date(partner.plPhase2Date || '');
    setPlPhase2Rate(partner.plPhase2Rate || '30%');
    setPlPhase2Amount(partner.plPhase2Amount || '4.830.000');
    setPlPhase2AmountText(
      partner.plPhase2AmountText || 'Bốn triệu tám trăm ba mươi nghìn đồng'
    );

    setPlPhase3Date(partner.plPhase3Date || '');
    setPlPhase3Rate(partner.plPhase3Rate || '20%');
    setPlPhase3Amount(partner.plPhase3Amount || '3.220.000');
    setPlPhase3AmountText(
      partner.plPhase3AmountText || 'Ba triệu hai trăm hai mươi nghìn đồng'
    );

    setPlPenaltyMaxDelay(partner.plPenaltyMaxDelay || '4');
    setPlCustomClauses(
      Array.isArray(partner.plCustomClauses) ? partner.plCustomClauses : []
    );
    setPlPdf(partner.plPdf || '');
  }, [open, partner]);

  if (!open || !partner) return null;

  const handleCptcChange = (rawVal: string) => {
    const formatted = formatCurrencyDots(rawVal);
    setPlCptc(formatted);
    const num = parseInt(formatted.replace(/\./g, ''), 10) || 0;
    if (num > 0) {
      setPlCptcText(docSoTienVN(num));
      const r1 = parseFloat(plPhase1Rate.replace('%', '')) || 50;
      const r2 = parseFloat(plPhase2Rate.replace('%', '')) || 30;
      const r3 = parseFloat(plPhase3Rate.replace('%', '')) || 20;
      const a1 = Math.round((num * r1) / 100);
      const a2 = Math.round((num * r2) / 100);
      const a3 = Math.round((num * r3) / 100);
      setPlPhase1Amount(formatCurrencyDots(a1));
      setPlPhase1AmountText(docSoTienVN(a1));
      setPlPhase2Amount(formatCurrencyDots(a2));
      setPlPhase2AmountText(docSoTienVN(a2));
      setPlPhase3Amount(formatCurrencyDots(a3));
      setPlPhase3AmountText(docSoTienVN(a3));
    }
  };

  const handleUploadScanPdf = async (file: File) => {
    setUploadingScanPdf(true);
    try {
      const url = await uploadPartnerScanFile(file);
      if (url) {
        setPlPdf(url);
      }
    } finally {
      setUploadingScanPdf(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const updatedFields: Partial<PartnerItem> = {
      plNo,
      plDate,
      plAddress,
      plCptc,
      plCptcText,
      plRevenueMkt,
      plRevenueMktText,
      plRevenueCommit,
      plRevenueCommitText,
      plDurationDays,
      plMaxDelayDays,
      plTimeline1,
      plTimeline2,
      plTimeline3,
      plTimeline4,
      plTimeline5,
      plPhase1Date,
      plPhase1Rate,
      plPhase1Amount,
      plPhase1AmountText,
      plPhase2Date,
      plPhase2Rate,
      plPhase2Amount,
      plPhase2AmountText,
      plPhase3Date,
      plPhase3Rate,
      plPhase3Amount,
      plPhase3AmountText,
      plPenaltyMaxDelay,
      plCustomClauses,
      plPdf,
      hdANguoiKy,
      hdAChucVu,
      hdB_Ten,
      hdB_DiaChi,
      hdB_MST,
      hdB_DaiDien,
      hdB_ChucVu,
      hdB_DienThoai,
      hdB_Email,
    };

    try {
      await fetch(`/api/sales/partners/${partner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      onSaved(updatedFields);
      onClose();
    } catch (err) {
      console.error('Lỗi lưu phụ lục:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPhuLuc = () => {
    const docEl = document.getElementById('phuluc-print-doc');
    if (!docEl) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iDoc = iframe.contentWindow?.document;
    if (!iDoc) return;

    iDoc.open();
    iDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phụ lục hợp đồng - ${hdB_Ten || ''}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap">
  <style>
    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    @page { 
      size: A4 portrait; 
      margin: 0 !important; 
    }
    body { 
      margin: 0; padding: 0; 
      font-family: 'Roboto Condensed', Arial Narrow, Arial, sans-serif; 
      background: #fff;
    }
    .print-page-break {
      width: 210mm !important;
      height: 297mm !important;
      page-break-after: always !important;
      break-after: page !important;
      background: #fff !important;
      padding: 10mm 15mm 10mm 25mm !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      position: relative !important;
    }
    .print-page-footer {
      position: absolute !important;
      bottom: 10mm !important;
      left: 25mm !important;
      right: 15mm !important;
      border-top: 1px solid #cbd5e1 !important;
      padding-top: 6px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
    }
  </style>
</head>
<body>
  ${docEl.innerHTML}
</body>
</html>`);
    iDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }, 600);
  };

  const handleExportPDFPL = async () => {
    const docEl = document.getElementById('phuluc-print-doc');
    if (!docEl) return;

    setPdfUploading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const pages = docEl.getElementsByClassName('print-page-break');
      if (pages.length === 0) return;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;

        const clonedPage = pageEl.cloneNode(true) as HTMLElement;
        clonedPage.style.boxShadow = 'none';
        clonedPage.style.margin = '0 auto';
        clonedPage.style.position = 'relative';
        clonedPage.style.width = '210mm';
        clonedPage.style.height = '297mm';
        clonedPage.style.boxSizing = 'border-box';
        clonedPage.style.padding = '10mm 15mm 10mm 25mm';
        clonedPage.style.background = '#fff';

        const style = document.createElement('style');
        style.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap');
          * {
            font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif !important;
          }
          .print-page-footer {
            position: absolute !important;
            bottom: 10mm !important;
            left: 25mm !important;
            right: 15mm !important;
            border-top: 1px solid #cbd5e1 !important;
            padding-top: 6px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 9px !important;
            color: #000 !important;
          }
        `;
        clonedPage.appendChild(style);

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.width = '210mm';
        tempContainer.style.height = '297mm';
        tempContainer.style.overflow = 'hidden';
        tempContainer.appendChild(clonedPage);
        document.body.appendChild(tempContainer);

        if (document.fonts) {
          await document.fonts.ready;
        }

        const canvas = await html2canvas(clonedPage, {
          scale: 2,
          useCORS: true,
          logging: false,
        });

        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      pdf.save(`Phu_luc_hop_dong_${(hdB_Ten || 'Seajong').replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error('Error exporting PDF PL', e);
      handlePrintPhuLuc();
    } finally {
      setPdfUploading(false);
    }
  };

  const renderHeaderBlock = () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #003087',
        paddingBottom: 8,
      }}
    >
      <img
        src={companyInfo?.logoUrl || '/logo.png'}
        style={{ height: '38px', objectFit: 'contain' }}
        alt="Seajong Logo"
      />
      <div style={{ textAlign: 'right', fontSize: '9px', lineHeight: 1.35, color: '#000' }}>
        <div
          style={{
            fontWeight: 800,
            color: '#003087',
            fontSize: '10px',
            textTransform: 'uppercase',
          }}
        >
          {companyInfo?.name?.toUpperCase() || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
        </div>
        <div>
          Địa chỉ:{' '}
          {companyInfo?.address || 'LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội'}
        </div>
        <div>
          Hotline: {(companyInfo?.phone || '1900.633.862').replace(/[Hh]otline:\s*/gi, '').trim()}{' '}
          | Website: {companyInfo?.website || 'https://seajong.com/'}
        </div>
      </div>
    </div>
  );

  const renderPage1PL = () => {
    const today = plDate && !isNaN(Date.parse(plDate)) ? new Date(plDate) : null;
    const dYear = today ? today.getFullYear() : '......';
    const dMonth = today ? String(today.getMonth() + 1).padStart(2, '0') : '......';
    const dDay = today ? String(today.getDate()).padStart(2, '0') : '......';

    return (
      <div
        className="print-page-break"
        style={{
          width: '794px',
          height: '1123px',
          background: '#fff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          padding: '10mm 15mm 10mm 25mm',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          fontFamily: "'Roboto Condensed', Arial, sans-serif",
        }}
      >
        <div style={{ paddingBottom: 15 }}>
          {renderHeaderBlock()}

          {/* Title Section */}
          <div style={{ textAlign: 'center', margin: '20px 0 8px 0' }}>
            <h2
              style={{
                margin: 0,
                color: '#003087',
                fontWeight: 900,
                fontSize: '18px',
                letterSpacing: '1px',
              }}
            >
              PHỤ LỤC HỢP ĐỒNG
            </h2>
            <div style={{ fontSize: '12px', color: '#000', marginTop: 2, fontStyle: 'italic' }}>
              Số: {plNo ? `${plNo}/HĐĐL-SEAJONG` : '.......................................'}
            </div>
          </div>

          {/* Date and Place */}
          <div style={{ fontSize: '12px', marginBottom: '12px', color: '#000' }}>
            Hôm nay, ngày <strong>{dDay}</strong> tháng <strong>{dMonth}</strong> năm{' '}
            <strong>{dYear}</strong>, tại:{' '}
            <strong>{plAddress || '.......................................'}</strong>
            <br />
            Chúng tôi gồm có:
          </div>

          {/* Bên A */}
          <div style={{ marginBottom: '10px', fontSize: '11.5px', color: '#000' }}>
            <div
              style={{
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: '#003087',
                marginBottom: 3,
              }}
            >
              Bên A (Bên giao đại lý):{' '}
              {companyInfo?.name?.toUpperCase() || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5px 12px',
                fontSize: '12px',
                lineHeight: 1.4,
                paddingLeft: 8,
              }}
            >
              <div style={{ gridColumn: 'span 2', display: 'flex' }}>
                <span style={{ width: '90px', flexShrink: 0 }}>Địa chỉ:</span>
                <span>
                  {companyInfo?.address ||
                    'LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội'}
                </span>
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex' }}>
                <span style={{ width: '90px', flexShrink: 0 }}>Mã số thuế:</span>
                <span>{companyInfo?.taxCode || '0109865432'}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '90px', flexShrink: 0 }}>Đại diện:</span>
                <span>
                  <strong>{hdANguoiKy || 'Lê Công Vụ'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '70px', flexShrink: 0 }}>Chức vụ:</span>
                <span>
                  <strong>{hdAChucVu || 'Giám đốc'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '90px', flexShrink: 0 }}>Điện thoại:</span>
                <span>
                  <strong>
                    {(companyInfo?.phone || '1900.633.862').replace(/[Hh]otline:\s*/gi, '').trim()}
                  </strong>
                </span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '70px', flexShrink: 0 }}>Email:</span>
                <span>
                  <strong>{companyInfo?.email || 'info@seajong.com'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Bên B */}
          <div style={{ marginBottom: '12px', fontSize: '11.5px', color: '#000' }}>
            <div
              style={{
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: '#003087',
                marginBottom: 3,
              }}
            >
              Bên B (Bên Đại lý): {hdB_Ten || '.......................................'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5px 12px',
                fontSize: '12px',
                lineHeight: 1.4,
                paddingLeft: 8,
              }}
            >
              <div style={{ gridColumn: 'span 2', display: 'flex' }}>
                <span style={{ width: '90px', flexShrink: 0 }}>Địa chỉ:</span>
                <span>{hdB_DiaChi || '.......................................'}</span>
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex' }}>
                <span style={{ width: '90px', flexShrink: 0 }}>Mã số thuế:</span>
                <span>{hdB_MST || '.......................................'}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '90px', flexShrink: 0 }}>Đại diện:</span>
                <span>
                  <strong>{hdB_DaiDien || '.......................................'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '70px', flexShrink: 0 }}>Chức vụ:</span>
                <span>
                  <strong>{hdB_ChucVu || '.......................................'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '90px', flexShrink: 0 }}>Điện thoại:</span>
                <span>
                  <strong>{hdB_DienThoai || '.......................................'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '70px', flexShrink: 0 }}>Email:</span>
                <span>
                  <strong>{hdB_Email || '.......................................'}</strong>
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '12px',
              marginBottom: '8px',
              fontStyle: 'italic',
              color: '#000',
            }}
          >
            Sau khi trao đổi và bàn bạc, hai bên nhất trí cùng ký kết Phụ lục với nội dung sau:
          </div>

          {/* Section 1 */}
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                color: '#003087',
                padding: '2px 0px',
                fontWeight: 'bold',
                fontSize: '12px',
                marginBottom: '4px',
              }}
            >
              1. Nội dung phụ lục
            </div>
            <ul
              style={{
                margin: '0',
                paddingLeft: 18,
                fontSize: '12px',
                lineHeight: 1.45,
                color: '#000',
              }}
            >
              <li>Thống nhất chi phí thi công (CPTC) và doanh thu (DT) cam kết.</li>
              <li>Thống nhất thời gian thi công.</li>
              <li>Tiến độ thanh toán chi phí thi công.</li>
              <li>Thời điểm hoàn trả/khấu trừ chi phí thi công.</li>
              <li>Cam kết hai bên về thời gian thi công và thời gian thanh toán.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                color: '#003087',
                padding: '2px 0px',
                fontWeight: 'bold',
                fontSize: '12px',
                marginBottom: '4px',
              }}
            >
              2. Thống nhất Chi phí thi công và Doanh thu cam kết
            </div>
            <div style={{ paddingLeft: 8, fontSize: '12px', lineHeight: 1.5, color: '#000' }}>
              <div style={{ marginBottom: 2 }}>
                - CPTC: <strong>{plCptc || '........................'}</strong> VNĐ
                <br />
                <span style={{ fontStyle: 'italic', fontSize: '11px', color: '#334155' }}>
                  (Bằng chữ:{' '}
                  {plCptcText ||
                    '.......................................................................................'}
                  )
                </span>
              </div>
              <div style={{ marginBottom: 2 }}>
                - Mức Doanh thu Đại lý nhập hàng để được hỗ trợ 100% CPTC:{' '}
                <strong>{plRevenueMkt || '........................'}</strong> VNĐ
                <br />
                <span style={{ fontStyle: 'italic', fontSize: '11px', color: '#334155' }}>
                  (Bằng chữ:{' '}
                  {plRevenueMktText ||
                    '.......................................................................................'}
                  )
                </span>
              </div>
              <div style={{ marginBottom: 2 }}>
                - Doanh thu cam kết của Đại lý (Theo thỏa thuận):{' '}
                <strong>{plRevenueCommit || '........................'}</strong> VNĐ
                <br />
                <span style={{ fontStyle: 'italic', fontSize: '11px', color: '#334155' }}>
                  (Bằng chữ:{' '}
                  {plRevenueCommitText ||
                    '.......................................................................................'}
                  )
                </span>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: 5 }}>
            <div
              style={{
                color: '#003087',
                padding: '2px 0px',
                fontWeight: 'bold',
                fontSize: '12px',
                marginBottom: '4px',
              }}
            >
              3. Thời gian thi công
            </div>
            <div style={{ paddingLeft: 8, fontSize: '12px', lineHeight: 1.45, color: '#000' }}>
              <div>
                Tổng thời gian: <strong>{plDurationDays || '......'} ngày</strong> (tính từ thời
                điểm ký kết Hợp đồng - Biên Bản Thống Nhất - Phụ Lục)
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <span>-</span>
                <span>
                  <strong>{plTimeline1 || '.......................................'}</strong>: Hoàn
                  thiện đo đạc tính toán, lên danh sách sản phẩm trưng bày, thiết kế bản vẽ kỹ thuật
                  và hình ảnh 3D từng khu vực.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <span>-</span>
                <span>
                  <strong>{plTimeline2 || '.......................................'}</strong>: Chuẩn
                  bị hoàn tất nguyên vật liệu phục vụ thi công.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <span>-</span>
                <span>
                  <strong>{plTimeline3 || '.......................................'}</strong>: Thực
                  hiện thi công, lắp đặt quầy, kệ, bảng biển.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <span>-</span>
                <span>
                  <strong>{plTimeline4 || '.......................................'}</strong>: Lắp
                  đặt sản phẩm trưng bày.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <span>-</span>
                <span>
                  <strong>{plTimeline5 || '.......................................'}</strong>: Thực
                  hiện bàn giao khu vực thi công và trưng bày cho Đại lý.
                </span>
              </div>
              <div style={{ marginTop: '4px', fontSize: '11px', lineHeight: '1.4' }}>
                <em>
                  Lưu ý: Thời gian thi công được phép chậm tiến độ tối đa 4 ngày (tổng thời gian thi
                  công tối đa <strong>{plMaxDelayDays || '19'} ngày</strong>) nếu có các lý do bất
                  khả kháng về nguồn vật liệu thi công, đường sá cách trở do thời tiết, tai nạn.
                </em>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="print-page-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #cbd5e1',
            paddingTop: 6,
          }}
        >
          <span style={{ fontSize: '8px', color: '#000' }}>
            Phụ lục hợp đồng - Đại lý chính thức Seajong®
          </span>
          <span style={{ fontSize: '8.5px', color: '#000', fontWeight: 700 }}>Trang 1 / 2</span>
        </div>
      </div>
    );
  };

  const renderPage2PL = () => (
    <div
      className="print-page-break"
      style={{
        width: '794px',
        height: '1123px',
        background: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        padding: '10mm 15mm 12mm 25mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        fontFamily: "'Roboto Condensed', Arial, sans-serif",
      }}
    >
      <div style={{ paddingBottom: 15 }}>
        {renderHeaderBlock()}

        {/* Section 4 */}
        <div style={{ marginBottom: 12, marginTop: 10 }}>
          <div
            style={{
              color: '#003087',
              padding: '2px 0px',
              fontWeight: 'bold',
              fontSize: '12px',
              marginBottom: '4px',
            }}
          >
            4. Tiến độ thanh toán chi phí thi công
          </div>
          <div style={{ paddingLeft: 8, fontSize: '12px', lineHeight: 1.45, color: '#000' }}>
            <div style={{ marginBottom: 4 }}>
              <strong>- Đợt 1 ({plPhase1Date || '........................'}):</strong> Ngay sau khi
              ký kết Hợp Đồng và Phụ Lục. Thanh toán đặt cọc{' '}
              <strong>{plPhase1Rate || '50%'}</strong> CPTC.
              <br />
              Số tiền: <strong>{plPhase1Amount || '........................'}</strong> VNĐ{' '}
              <span style={{ fontStyle: 'italic', fontSize: '10.5px' }}>
                (Bằng chữ:{' '}
                {plPhase1AmountText || '....................................................'})
              </span>
              .
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>- Đợt 2 ({plPhase2Date || '........................'}):</strong> Thời điểm hoàn
              thiện bản vẽ kỹ thuật và bắt đầu mua sắm nguyên vật liệu phục vụ thi công. Thanh toán{' '}
              <strong>{plPhase2Rate || '30%'}</strong> CPTC.
              <br />
              Số tiền: <strong>{plPhase2Amount || '........................'}</strong> VNĐ{' '}
              <span style={{ fontStyle: 'italic', fontSize: '10.5px' }}>
                (Bằng chữ:{' '}
                {plPhase2AmountText || '....................................................'})
              </span>
              .
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>- Đợt 3 ({plPhase3Date || '........................'}):</strong> Thời điểm hoàn
              tất bàn giao khu vực thi công và trưng bày. Thanh toán{' '}
              <strong>{plPhase3Rate || '20%'}</strong> CPTC còn lại.
              <br />
              Số tiền: <strong>{plPhase3Amount || '........................'}</strong> VNĐ{' '}
              <span style={{ fontStyle: 'italic', fontSize: '10.5px' }}>
                (Bằng chữ:{' '}
                {plPhase3AmountText || '....................................................'})
              </span>
              .
            </div>
          </div>
        </div>

        {/* Section 5 */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              color: '#003087',
              padding: '2px 0px',
              fontWeight: 'bold',
              fontSize: '12px',
              marginBottom: '4px',
            }}
          >
            5. Hỗ trợ và hoàn trả chi phí thi công
          </div>
          <ul
            style={{
              margin: '0',
              paddingLeft: 18,
              fontSize: '12px',
              lineHeight: 1.45,
              color: '#000',
            }}
          >
            <li>Chi phí thi công được hỗ trợ và hoàn trả 100% cho Đại lý.</li>
            <li>Phương thức hoàn trả: Khấu trừ vào giá trị đơn hàng theo Doanh thu đã cam kết.</li>
            <li>Thời điểm khấu trừ: Vào thời điểm chốt công nợ lần đầu tiên của Đại lý.</li>
          </ul>
        </div>

        {/* Custom clauses */}
        {plCustomClauses.map((clause, index) => (
          <div key={index} style={{ marginBottom: 12 }}>
            <div
              style={{
                color: '#003087',
                padding: '2px 0px',
                fontWeight: 'bold',
                fontSize: '12px',
                marginBottom: '4px',
              }}
            >
              {6 + index}. {clause.title}
            </div>
            <ul
              style={{
                margin: '0',
                paddingLeft: 18,
                fontSize: '12px',
                lineHeight: 1.45,
                color: '#000',
              }}
            >
              {clause.content
                .split('\n')
                .filter((line) => line.trim() !== '')
                .map((line, i) => (
                  <li key={i} style={{ whiteSpace: 'pre-wrap' }}>
                    {line}
                  </li>
                ))}
            </ul>
          </div>
        ))}

        {/* Section 6 */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              color: '#003087',
              padding: '2px 0px',
              fontWeight: 'bold',
              fontSize: '12px',
              marginBottom: '4px',
            }}
          >
            {6 + plCustomClauses.length}. Cam kết
          </div>
          <div
            style={{
              paddingLeft: 8,
              fontSize: '12px',
              lineHeight: 1.4,
              textAlign: 'justify',
              color: '#000',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
              Bên A: {companyInfo?.name?.toUpperCase() || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
            </div>
            <ul style={{ margin: '0 0 6px 0', paddingLeft: 15 }}>
              <li>Bên A cam kết thực hiện thi công đúng tiến độ đã thống nhất.</li>
              <li>
                Trong trường hợp thi công chậm tiến độ vượt quá thời gian tối đa cam kết (
                <strong>{plPenaltyMaxDelay || '4'} ngày</strong>), bên A bị phạt 5% - Tổng số tiền
                bên B đã thanh toán cho mỗi ngày chậm tiến độ.
              </li>
              <li>
                Bên A chịu trách nhiệm bảo hành, sửa chữa về chất lượng quầy kệ tại mặt bằng đã thi
                công trong thời gian 06 tháng sau khi bàn giao.
              </li>
              <li>
                Bên A không phải chịu trách nhiệm bảo hành trong trường hợp bị thiên tai lũ lụt, hỏa
                hoạn, động đất, sóng thần, phá hoại, rơi vỡ hay yếu tố bên ngoài tác động... tính từ
                ngày bàn giao nghiệm thu công trình.
              </li>
            </ul>
            <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
              Bên B: {hdB_Ten || '.......................................'}
            </div>
            <ul style={{ margin: '0', paddingLeft: 15 }}>
              <li>
                Bên B cam kết thanh toán Chi phí thi công theo 3 (ba) đợt đã thống nhất tại Điều
                khoản số 4 của Phụ Lục này.
              </li>
              <li>
                Bên B phải hỗ trợ xử lý các vật dụng cản trở tại vị trí mặt bằng trước thời điểm thi
                công để đảm bảo thi công thuận tiện và không bị chậm tiến độ.
              </li>
              <li>
                Trong trường hợp bên B không thực hiện Thanh toán theo tiến độ, bên A có quyền tạm
                dừng hợp tác, thu hồi quầy kệ và không hoàn trả số tiền đã thanh toán.
              </li>
            </ul>
          </div>
        </div>

        {/* Signatures */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            textAlign: 'center',
            fontSize: '11.5px',
            fontWeight: 'bold',
            marginTop: '24px',
            color: '#000',
          }}
        >
          <div>
            ĐẠI DIỆN BÊN A
            <div style={{ height: '85px' }} />
          </div>
          <div>
            ĐẠI DIỆN BÊN B
            <div style={{ height: '85px' }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="print-page-footer"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #cbd5e1',
          paddingTop: 6,
        }}
      >
        <span style={{ fontSize: '8px', color: '#000' }}>
          Phụ lục hợp đồng - Đại lý chính thức Seajong®
        </span>
        <span style={{ fontSize: '8.5px', color: '#000', fontWeight: 700 }}>Trang 2 / 2</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FileEarmarkPlus size={18} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[15px] text-slate-900">
              Lập phụ lục hợp đồng đại lý
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
              PHỤ LỤC HỢP ĐỒNG
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePrintPhuLuc}
            leftIcon={<Printer size={14} />}
          >
            In phụ lục
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportPDFPL}
            disabled={pdfUploading}
            isLoading={pdfUploading}
            leftIcon={<FileEarmarkPdf size={14} />}
          >
            {pdfUploading ? 'Đang tạo PDF...' : 'Xuất PDF'}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            isLoading={saving}
            leftIcon={<Check2 size={15} />}
          >
            {saving ? 'Đang lưu...' : 'Lưu phụ lục'}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng"
          >
            <XLg size={14} />
          </button>
        </div>
      </div>

      {/* Main Split Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar: Editor Form */}
        <div className="w-[390px] shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* 0. Đính kèm bản scan PDF phụ lục đã ký */}
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2">
              <div className="font-extrabold text-[11px] uppercase text-blue-800 tracking-wider flex items-center justify-between">
                <span>Bản scan / PDF phụ lục đã ký</span>
                {plPdf && (
                  <button
                    type="button"
                    onClick={() => openAttachmentFile(plPdf)}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Xem tệp →
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <label
                  title={
                    plPdf
                      ? getAttachmentDisplayName(plPdf, 'Phu_luc_da_ky.pdf')
                      : 'Tải lên PDF phụ lục đã ký'
                  }
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-dashed border-blue-300 hover:border-blue-500 bg-white flex items-center justify-center gap-2 text-xs text-slate-600 cursor-pointer transition-colors overflow-hidden"
                >
                  {plPdf ? (
                    <FileEarmarkPdfFill className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  ) : (
                    <CloudArrowUp className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span className="truncate block">
                    {uploadingScanPdf
                      ? 'Đang tải tệp...'
                      : plPdf
                      ? getAttachmentDisplayName(plPdf, 'Phu_luc_da_ky.pdf')
                      : 'Tải lên PDF phụ lục đã ký...'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadScanPdf(f);
                    }}
                  />
                </label>
                {plPdf && (
                  <button
                    type="button"
                    onClick={() => setPlPdf('')}
                    className="px-2.5 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Xoá
                  </button>
                )}
              </div>
            </div>

            {/* 1. THÔNG TIN CHUNG PHỤ LỤC & CÁC BÊN */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-blue-700 tracking-wider border-b border-slate-200 pb-1">
                1. Thông tin chung & Các bên
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Số phụ lục"
                  value={plNo}
                  onChange={(e) => setPlNo(e.target.value)}
                />
                <Input
                  label="Ngày lập"
                  type="date"
                  value={plDate}
                  onChange={(e) => setPlDate(e.target.value)}
                />
              </div>
              <Input
                label="Địa điểm lập"
                value={plAddress}
                onChange={(e) => setPlAddress(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Đại diện Bên A"
                  value={hdANguoiKy}
                  onChange={(e) => setHdANguoiKy(e.target.value)}
                />
                <Input
                  label="Chức vụ Bên A"
                  value={hdAChucVu}
                  onChange={(e) => setHdAChucVu(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-8">
                  <Input
                    label="Tên Đại lý (Bên B)"
                    value={hdB_Ten}
                    onChange={(e) => setHdB_Ten(e.target.value)}
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    label="Mã số thuế"
                    value={hdB_MST}
                    onChange={(e) => setHdB_MST(e.target.value)}
                  />
                </div>
              </div>
              <Input
                label="Địa chỉ Bên B"
                value={hdB_DiaChi}
                onChange={(e) => setHdB_DiaChi(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Đại diện Bên B"
                  value={hdB_DaiDien}
                  onChange={(e) => setHdB_DaiDien(e.target.value)}
                />
                <Input
                  label="Chức vụ Bên B"
                  value={hdB_ChucVu}
                  onChange={(e) => setHdB_ChucVu(e.target.value)}
                />
              </div>
            </div>

            {/* 2. CHI PHÍ & DOANH THU CAM KẾT */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-blue-700 tracking-wider border-b border-slate-200 pb-1">
                2. Chi phí & Doanh thu cam kết
              </div>
              <Input
                label="Chi phí thi công - CPTC (VNĐ)"
                value={plCptc}
                onChange={(e) => handleCptcChange(e.target.value)}
              />
              <Input
                label="Bằng chữ (CPTC)"
                value={plCptcText}
                onChange={(e) => setPlCptcText(e.target.value)}
              />
              <Input
                label="Doanh thu được hỗ trợ 100% CPTC (VNĐ)"
                value={plRevenueMkt}
                onChange={(e) => {
                  const formatted = formatCurrencyDots(e.target.value);
                  setPlRevenueMkt(formatted);
                  const num = parseInt(formatted.replace(/\./g, ''), 10) || 0;
                  if (num > 0) setPlRevenueMktText(docSoTienVN(num));
                }}
              />
              <Input
                label="Bằng chữ (DT hỗ trợ)"
                value={plRevenueMktText}
                onChange={(e) => setPlRevenueMktText(e.target.value)}
              />
              <Input
                label="Doanh thu cam kết của Đại lý (VNĐ)"
                value={plRevenueCommit}
                onChange={(e) => {
                  const formatted = formatCurrencyDots(e.target.value);
                  setPlRevenueCommit(formatted);
                  const num = parseInt(formatted.replace(/\./g, ''), 10) || 0;
                  if (num > 0) setPlRevenueCommitText(docSoTienVN(num));
                }}
              />
              <Input
                label="Bằng chữ (DT cam kết)"
                value={plRevenueCommitText}
                onChange={(e) => setPlRevenueCommitText(e.target.value)}
              />
            </div>

            {/* 3. THỜI GIAN & TIẾN ĐỘ THI CÔNG */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-slate-800 tracking-wider border-b border-slate-200 pb-1">
                3. Thời gian & Tiến độ thi công
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Tổng thời gian (Ngày)"
                  type="number"
                  value={plDurationDays}
                  onChange={(e) => {
                    const nextDur = e.target.value;
                    setPlDurationDays(nextDur);
                    const val = parseInt(nextDur, 10) || 0;
                    setPlMaxDelayDays(String(val + 4));
                    if (val >= 5) {
                      const nextTimelines = computeAppendixTimelines(plDate, nextDur);
                      setPlTimeline1(nextTimelines.t1);
                      setPlTimeline2(nextTimelines.t2);
                      setPlTimeline3(nextTimelines.t3);
                      setPlTimeline4(nextTimelines.t4);
                      setPlTimeline5(nextTimelines.t5);
                    }
                  }}
                />
                <Input
                  label="Thời gian tối đa (Ngày)"
                  type="number"
                  value={plMaxDelayDays}
                  onChange={(e) => setPlMaxDelayDays(e.target.value)}
                />
              </div>
              <Input
                label="Đo đạc & Thiết kế 3D"
                placeholder="VD: 01/11/2026 - 03/11/2026"
                value={plTimeline1}
                onChange={(e) => setPlTimeline1(e.target.value)}
              />
              <Input
                label="Chuẩn bị nguyên vật liệu"
                placeholder="VD: 03/11/2026 - 05/11/2026"
                value={plTimeline2}
                onChange={(e) => setPlTimeline2(e.target.value)}
              />
              <Input
                label="Thi công, lắp đặt quầy kệ"
                placeholder="VD: 05/11/2026 - 12/11/2026"
                value={plTimeline3}
                onChange={(e) => setPlTimeline3(e.target.value)}
              />
              <Input
                label="Lắp sản phẩm trưng bày"
                placeholder="VD: 12/11/2026 - 15/11/2026"
                value={plTimeline4}
                onChange={(e) => setPlTimeline4(e.target.value)}
              />
              <Input
                label="Bàn giao, nghiệm thu"
                placeholder="VD: 16/11/2026"
                value={plTimeline5}
                onChange={(e) => setPlTimeline5(e.target.value)}
              />
            </div>

            {/* 4. TIẾN ĐỘ THANH TOÁN CPTC */}
            <div className="space-y-3">
              <div className="font-extrabold text-[11.5px] uppercase text-blue-700 tracking-wider border-b border-slate-200 pb-1">
                4. Tiến độ thanh toán CPTC
              </div>

              {/* Đợt 1 */}
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="font-bold text-[11px] text-blue-700">Thanh toán Đợt 1</div>
                <Input
                  label="Mốc thời gian"
                  placeholder="Ký hợp đồng & phụ lục"
                  value={plPhase1Date}
                  onChange={(e) => setPlPhase1Date(e.target.value)}
                />
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <Input
                      label="Tỷ lệ"
                      value={plPhase1Rate}
                      onChange={(e) => setPlPhase1Rate(e.target.value)}
                    />
                  </div>
                  <div className="col-span-8">
                    <Input
                      label="Số tiền (VNĐ)"
                      value={plPhase1Amount}
                      onChange={(e) => {
                        const f = formatCurrencyDots(e.target.value);
                        setPlPhase1Amount(f);
                        const n = parseInt(f.replace(/\./g, ''), 10) || 0;
                        if (n > 0) setPlPhase1AmountText(docSoTienVN(n));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Đợt 2 */}
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="font-bold text-[11px] text-blue-700">Thanh toán Đợt 2</div>
                <Input
                  label="Mốc thời gian"
                  placeholder="Hoàn thiện bản vẽ 3D"
                  value={plPhase2Date}
                  onChange={(e) => setPlPhase2Date(e.target.value)}
                />
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <Input
                      label="Tỷ lệ"
                      value={plPhase2Rate}
                      onChange={(e) => setPlPhase2Rate(e.target.value)}
                    />
                  </div>
                  <div className="col-span-8">
                    <Input
                      label="Số tiền (VNĐ)"
                      value={plPhase2Amount}
                      onChange={(e) => {
                        const f = formatCurrencyDots(e.target.value);
                        setPlPhase2Amount(f);
                        const n = parseInt(f.replace(/\./g, ''), 10) || 0;
                        if (n > 0) setPlPhase2AmountText(docSoTienVN(n));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Đợt 3 */}
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="font-bold text-[11px] text-blue-700">Thanh toán Đợt 3</div>
                <Input
                  label="Mốc thời gian"
                  placeholder="Bàn giao nghiệm thu"
                  value={plPhase3Date}
                  onChange={(e) => setPlPhase3Date(e.target.value)}
                />
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <Input
                      label="Tỷ lệ"
                      value={plPhase3Rate}
                      onChange={(e) => setPlPhase3Rate(e.target.value)}
                    />
                  </div>
                  <div className="col-span-8">
                    <Input
                      label="Số tiền (VNĐ)"
                      value={plPhase3Amount}
                      onChange={(e) => {
                        const f = formatCurrencyDots(e.target.value);
                        setPlPhase3Amount(f);
                        const n = parseInt(f.replace(/\./g, ''), 10) || 0;
                        if (n > 0) setPlPhase3AmountText(docSoTienVN(n));
                      }}
                    />
                  </div>
                </div>
              </div>

              <Input
                label="Thời gian tối đa cam kết trước phạt (Ngày)"
                type="number"
                value={plPenaltyMaxDelay}
                onChange={(e) => setPlPenaltyMaxDelay(e.target.value)}
              />
            </div>

            {/* 5. CÁC ĐIỀU KHOẢN BỔ SUNG */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-slate-800 tracking-wider border-b border-slate-200 pb-1 flex items-center justify-between">
                <span>5. Điều khoản bổ sung</span>
              </div>
              <div className="space-y-2">
                {plCustomClauses.map((clause, index) => (
                  <div
                    key={index}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700">
                        Điều khoản {6 + index}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPlCustomClauses((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="text-rose-500 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash size={11} />
                        <span>Xoá</span>
                      </button>
                    </div>
                    <Input
                      label="Tiêu đề điều khoản"
                      placeholder="VD: Hỗ trợ vận chuyển"
                      value={clause.title}
                      onChange={(e) => {
                        const next = [...plCustomClauses];
                        next[index] = { ...next[index], title: e.target.value };
                        setPlCustomClauses(next);
                      }}
                    />
                    <div>
                      <label className="form-label block mb-1">Nội dung chi tiết</label>
                      <textarea
                        rows={3}
                        value={clause.content}
                        onChange={(e) => {
                          const next = [...plCustomClauses];
                          next[index] = { ...next[index], content: e.target.value };
                          setPlCustomClauses(next);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500 resize-none bg-white"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setPlCustomClauses((prev) => [...prev, { title: '', content: '' }])
                  }
                  className="w-full py-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Thêm điều khoản bổ sung</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live 2-Page A4 Document Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-200/80 p-8 flex flex-col items-center gap-7">
          <div id="phuluc-print-doc" className="flex flex-col gap-7">
            {renderPage1PL()}
            {renderPage2PL()}
          </div>
        </div>
      </div>
    </div>
  );
};

