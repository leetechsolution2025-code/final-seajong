import React, { useState, useEffect } from 'react';
import { Input } from '../../common/Input';
import { Select } from '../../common/Select';
import { Button } from '../../common/Button';
import {
  FileEarmarkCheck,
  Printer,
  FileEarmarkPdf,
  Check2,
  XLg,
  CloudArrowUp,
  FileEarmarkPdfFill,
} from 'react-bootstrap-icons';
import type { PartnerItem } from '../../../pages/sales/SalesPartnersPage';
import {
  uploadPartnerScanFile,
  getAttachmentDisplayName,
  openAttachmentFile,
} from '../../../utils/partnerUtils';

interface HopDongModalProps {
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

const formatCurrencyHD = (val: string) => {
  if (!val) return '........................ VNĐ';
  if (val.includes('VNĐ') || val.includes('vnd')) return val;
  return `${val} VNĐ`;
};

export const HopDongModal: React.FC<HopDongModalProps> = ({
  open,
  partner,
  onClose,
  onSaved,
}) => {
  const [saving, setSaving] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [uploadingScanPdf, setUploadingScanPdf] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const [hdCode, setHdCode] = useState('');
  const [hdDate, setHdDate] = useState('');
  const [hdDiaDiem, setHdDiaDiem] = useState('Văn phòng Công ty Cổ phần Seajong Việt Nam');
  const [hdANguoiKy, setHdANguoiKy] = useState('Lê Công Vụ');
  const [hdAChucVu, setHdAChucVu] = useState('Giám đốc');

  const [hdB_Ten, setHdB_Ten] = useState('');
  const [hdB_DiaChi, setHdB_DiaChi] = useState('');
  const [hdB_MST, setHdB_MST] = useState('');
  const [hdB_DaiDien, setHdB_DaiDien] = useState('');
  const [hdB_ChucVu, setHdB_ChucVu] = useState('Giám đốc');
  const [hdB_DienThoai, setHdB_DienThoai] = useState('');
  const [hdB_Email, setHdB_Email] = useState('');

  const [hdShowroomAddress, setHdShowroomAddress] = useState('');
  const [hdShowroomArea, setHdShowroomArea] = useState('');
  const [hdAnnualRevenue, setHdAnnualRevenue] = useState('1.200.000.000');
  const [hdMonthlyRevenue, setHdMonthlyRevenue] = useState('100.000.000');
  const [hdDurationYears, setHdDurationYears] = useState('02');
  const [hdExclusiveRadius, setHdExclusiveRadius] = useState('5');
  const [hdExclusiveMonths, setHdExclusiveMonths] = useState('06');

  const [creditLimitStr, setCreditLimitStr] = useState('50.000.000');
  const [contractStatus, setContractStatus] = useState<string>('Signed');
  const [contractPdf, setContractPdf] = useState('');

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

    setHdCode(
      partner.hdCode ||
        partner.contractNo ||
        `${partner.quoteCode || `HDDL-${new Date().getFullYear()}-${partner.code.replace(/[^A-Z0-9]/gi, '').slice(-4)}`}/HDDL-SEAJONG`
    );
    setHdDate(partner.hdDate || partner.signDate || todayStr);
    setHdDiaDiem(partner.hdDiaDiem || 'Văn phòng Công ty Cổ phần Seajong Việt Nam');
    setHdANguoiKy(partner.hdANguoiKy || companyInfo?.legalRep || 'Lê Công Vụ');
    setHdAChucVu(partner.hdAChucVu || 'Giám đốc');

    setHdB_Ten(partner.hdB_Ten || partner.bbB_Ten || partner.companyName || partner.name || '');
    setHdB_DiaChi(partner.hdB_DiaChi || partner.bbB_DiaChi || customerFullAddress);
    setHdB_MST(partner.hdB_MST || partner.bbB_MST || '');
    setHdB_DaiDien(partner.hdB_DaiDien || partner.bbB_DaiDien || partner.name || '');
    setHdB_ChucVu(partner.hdB_ChucVu || partner.bbB_ChucVu || 'Đại diện');
    setHdB_DienThoai(partner.hdB_DienThoai || partner.bbB_DienThoai || partner.phone || '');
    setHdB_Email(partner.hdB_Email || partner.bbB_Email || partner.email || '');

    setHdShowroomAddress(partner.hdShowroomAddress || customerFullAddress);
    setHdShowroomArea(partner.hdShowroomArea || '50');

    const defaultAnnual =
      partner.hdAnnualRevenue ||
      (partner.contractValue ? formatCurrencyDots(partner.contractValue) : '1.200.000.000');
    setHdAnnualRevenue(defaultAnnual);
    setHdMonthlyRevenue(partner.hdMonthlyRevenue || '100.000.000');
    setHdDurationYears(partner.hdDurationYears || '02');
    setHdExclusiveRadius(partner.hdExclusiveRadius || '5');
    setHdExclusiveMonths(partner.hdExclusiveMonths || '06');

    setCreditLimitStr(
      partner.creditLimit ? formatCurrencyDots(partner.creditLimit) : '50.000.000'
    );
    setContractStatus(
      partner.contractStatus && partner.contractStatus !== 'Pending Signature'
        ? partner.contractStatus
        : 'Signed'
    );
    setContractPdf(partner.contractPdf || '');
  }, [open, partner]);

  if (!open || !partner) return null;

  const handleUploadScanPdf = async (file: File) => {
    setUploadingScanPdf(true);
    try {
      const url = await uploadPartnerScanFile(file);
      if (url) {
        setContractPdf(url);
      }
    } finally {
      setUploadingScanPdf(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const annualNum =
      parseFloat(hdAnnualRevenue.replace(/\./g, '').replace(/,/g, '')) || 1200000000;
    const creditNum =
      parseFloat(creditLimitStr.replace(/\./g, '').replace(/,/g, '')) || 50000000;

    const updatedFields: Partial<PartnerItem> = {
      hdCode,
      hdDate,
      hdDiaDiem,
      hdANguoiKy,
      hdAChucVu,
      hdB_Ten,
      hdB_DiaChi,
      hdB_MST,
      hdB_DaiDien,
      hdB_ChucVu,
      hdB_DienThoai,
      hdB_Email,
      hdShowroomAddress,
      hdShowroomArea,
      hdAnnualRevenue,
      hdMonthlyRevenue,
      hdDurationYears,
      hdExclusiveRadius,
      hdExclusiveMonths,
      contractNo: hdCode,
      contractValue: annualNum,
      creditLimit: creditNum,
      signDate: hdDate,
      contractStatus: contractStatus || 'Signed',
      contractPdf,
      step: Math.max(4, Number(partner.step) || 4),
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
      console.error('Lỗi lưu hợp đồng:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintHopDong = () => {
    const docEl = document.getElementById('hopdong-print-doc');
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
  <title>Hợp đồng đại lý - ${hdB_Ten || ''}</title>
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
      border-top: 1px solid #e2e8f0 !important;
      padding-top: 8px !important;
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

  const handleExportPDFHD = async () => {
    const docEl = document.getElementById('hopdong-print-doc');
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
        clonedPage.style.margin = '0';
        clonedPage.style.position = 'relative';
        clonedPage.style.width = '210mm';
        clonedPage.style.height = '297mm';
        clonedPage.style.boxSizing = 'border-box';
        clonedPage.style.padding = '10mm 15mm 10mm 25mm';
        clonedPage.style.background = '#fff';
        clonedPage.style.display = 'flex';
        clonedPage.style.flexDirection = 'column';
        clonedPage.style.justifyContent = 'space-between';

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
            border-top: 1px solid #e2e8f0 !important;
            padding-top: 8px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
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

      pdf.save(`Hop_dong_dai_ly_${(hdB_Ten || 'Seajong').replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error('Error exporting PDF HD', e);
      handlePrintHopDong();
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
        paddingBottom: 6,
      }}
    >
      <img
        src={companyInfo?.logoUrl || '/logo.png'}
        style={{ height: '38px', objectFit: 'contain' }}
        alt="Seajong Logo"
      />
      <div style={{ textAlign: 'right', fontSize: '9px', lineHeight: 1.3, color: '#000' }}>
        <div
          style={{
            fontWeight: 800,
            color: '#003087',
            fontSize: '9.5px',
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

  const renderPage1HD = () => {
    const today = hdDate && !isNaN(Date.parse(hdDate)) ? new Date(hdDate) : null;
    const dYear = today ? today.getFullYear() : '......';
    const dMonth = today ? String(today.getMonth() + 1).padStart(2, '0') : '......';
    const dDay = today ? String(today.getDate()).padStart(2, '0') : '......';

    const bbToday =
      partner?.bbDate && !isNaN(Date.parse(partner.bbDate)) ? new Date(partner.bbDate) : null;
    const bbDYear = bbToday ? bbToday.getFullYear() : '......';
    const bbDMonth = bbToday ? String(bbToday.getMonth() + 1).padStart(2, '0') : '......';
    const bbDDay = bbToday ? String(bbToday.getDate()).padStart(2, '0') : '......';
    const bbDateFormatted = bbToday ? `${bbDDay}/${bbDMonth}/${bbDYear}` : '....../....../..........';

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
        <div style={{ flex: 1, overflow: 'hidden', paddingBottom: 8 }}>
          {renderHeaderBlock()}

          {/* Title Section */}
          <div style={{ textAlign: 'center', margin: '12px 0 6px 0' }}>
            <h2
              style={{
                margin: 0,
                color: '#003087',
                fontWeight: 900,
                fontSize: '17px',
                letterSpacing: '1px',
              }}
            >
              HỢP ĐỒNG ĐẠI LÝ PHÂN PHỐI
            </h2>
            <h3
              style={{
                margin: '2px 0 0',
                color: '#003087',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              ĐẠI LÝ CHÍNH THỨC SEAJONG
            </h3>
            <div style={{ fontSize: '11px', color: '#000', marginTop: 4, fontWeight: 'bold' }}>
              Số: {hdCode || '.......................................'}
            </div>
          </div>

          {/* Legal Basis */}
          <div style={{ margin: '14px 0 4px 0', fontSize: '11px', lineHeight: '1.35', color: '#000' }}>
            <div
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                marginBottom: '4px',
                fontSize: '12px',
                color: '#003087',
              }}
            >
              CÁC CĂN CỨ ĐỂ KÝ KẾT HỢP ĐỒNG
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
              <span>-</span>
              <span>
                Bộ luật Dân sự số 91/2015/QH13 đã được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt
                Nam thông qua ngày 24/11/2015.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
              <span>-</span>
              <span>
                Luật Thương mại số 36/2005/QH11 đã được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt
                Nam thông qua ngày 14/6/2005.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
              <span>-</span>
              <span>
                Căn cứ nội dung Biên bản số{' '}
                {partner?.bbCode
                  ? `${partner.bbCode}/BBTN-SEAJONG`
                  : '................/BBTN-SEAJONG'}
                , ký ngày {bbDateFormatted} giữa{' '}
                {companyInfo?.name || 'Công ty Cổ phần Seajong Việt Nam'} và{' '}
                {hdB_Ten || '................'} về việc thống nhất đại lý chính thức Seajong.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span>-</span>
              <span>Căn cứ vào năng lực và nhu cầu của các bên.</span>
            </div>
          </div>

          {/* Parties participating */}
          <div style={{ margin: '12px 0 4px 0', fontSize: '11px', lineHeight: '1.35', color: '#000' }}>
            <div
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                marginBottom: '3px',
                fontSize: '11.5px',
                color: '#003087',
              }}
            >
              CÁC BÊN THAM GIA KÝ KẾT HỢP ĐỒNG
            </div>
            <div style={{ textAlign: 'justify', lineHeight: '1.35' }}>
              Hợp đồng đại lý phân phối chính thức của Seajong (sau đây gọi tắt là Hợp đồng) được
              lập và ký kết vào ngày {dDay} tháng {dMonth} năm {dYear} tại {hdDiaDiem} trên nguyên
              tắc tự nguyện và bình đẳng giữa các bên dưới đây:
            </div>
          </div>

          {/* Side A & B */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '4px 8px',
                background: '#f8fafc',
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: '#003087',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                BÊN A: {companyInfo?.name?.toUpperCase() || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1px 12px',
                  fontSize: '11px',
                  lineHeight: 1.3,
                  color: '#000',
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
                    {hdANguoiKy.startsWith('Ông') || hdANguoiKy.startsWith('Bà')
                      ? hdANguoiKy
                      : `Ông ${hdANguoiKy}`}
                  </span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '70px', flexShrink: 0 }}>Chức vụ:</span>
                  <span>{hdAChucVu}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '90px', flexShrink: 0 }}>Điện thoại:</span>
                  <span>
                    {(companyInfo?.phone || '1900.633.862').replace(/[Hh]otline:\s*/gi, '').trim()}
                  </span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '70px', flexShrink: 0 }}>Email:</span>
                  <span>{companyInfo?.email || 'info@seajong.com'}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '4px 8px',
                background: '#f8fafc',
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: '#003087',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                BÊN B:{' '}
                {hdB_Ten?.toUpperCase() ||
                  '........................................................................'}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1px 12px',
                  fontSize: '11px',
                  lineHeight: 1.3,
                  color: '#000',
                }}
              >
                <div style={{ gridColumn: 'span 2', display: 'flex' }}>
                  <span style={{ width: '90px', flexShrink: 0 }}>Địa chỉ:</span>
                  <span>
                    {hdB_DiaChi ||
                      '........................................................................'}
                  </span>
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex' }}>
                  <span style={{ width: '90px', flexShrink: 0 }}>Mã số thuế:</span>
                  <span>{hdB_MST || '....................................'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '90px', flexShrink: 0 }}>Đại diện:</span>
                  <span>{hdB_DaiDien || '................................................'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '70px', flexShrink: 0 }}>Chức vụ:</span>
                  <span>{hdB_ChucVu || '................................................'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '90px', flexShrink: 0 }}>Điện thoại:</span>
                  <span>{hdB_DienThoai || '....................................'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '70px', flexShrink: 0 }}>Email:</span>
                  <span>{hdB_Email || '................................................'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Xét rằng */}
          <div style={{ margin: '6px 0 4px 0', fontSize: '11px', lineHeight: '1.35', color: '#000' }}>
            <div
              style={{
                textAlign: 'left',
                fontWeight: 'bold',
                marginBottom: '3px',
                fontSize: '11.5px',
                color: '#003087',
                textTransform: 'uppercase',
              }}
            >
              XÉT RẰNG
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '2px', textAlign: 'justify' }}>
              <span style={{ flexShrink: 0 }}>-</span>
              <span>
                Bên A có nhu cầu thực hiện việc phát triển hệ thống đại lý chính thức và đang có nhu
                cầu tìm kiếm đối tác đáp ứng đầy đủ các yêu cầu về pháp lý và năng lực phù hợp.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', textAlign: 'justify' }}>
              <span style={{ flexShrink: 0 }}>-</span>
              <span>
                Bên B là đối tác cam kết có đủ năng lực pháp lý, điều kiện cần thiết theo yêu cầu
                của bên A và mong muốn được hợp tác với bên A.
              </span>
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: '11px',
              color: '#003087',
              marginTop: '10px',
              marginBottom: '8px',
              paddingLeft: '35px',
              paddingRight: '35px',
              lineHeight: 1.35,
            }}
          >
            Sau khi trao đổi, hai bên thoả thuận ký kết hợp đồng đại lý phân phối chính thức Seajong
            với các điều khoản cụ thể dưới đây.
          </div>

          {/* Clause 1 */}
          <div style={{ marginBottom: 3, marginTop: 6 }}>
            <div
              style={{
                color: '#003087',
                padding: '1px 0px',
                fontWeight: 'bold',
                fontSize: '11.5px',
                marginBottom: '2px',
              }}
            >
              Điều 1: Đối tượng hợp đồng
            </div>
            <div
              style={{
                paddingLeft: 8,
                fontSize: '11px',
                lineHeight: 1.38,
                textAlign: 'justify',
                color: '#000',
              }}
            >
              Bên A chỉ định và Bên B đồng ý bán, phân phối các sản phẩm của Bên A tại khu vực kinh
              doanh cho các đại lý cấp dưới và cho người tiêu dùng.
            </div>
          </div>

          {/* Clause 2 */}
          <div style={{ marginBottom: 3, marginTop: 6 }}>
            <div
              style={{
                color: '#003087',
                padding: '1px 0px',
                fontWeight: 'bold',
                fontSize: '11.5px',
                marginBottom: '2px',
              }}
            >
              Điều 2: Điều kiện làm đại lý:
            </div>
            <ol
              style={{
                margin: '0',
                paddingLeft: 20,
                fontSize: '11px',
                lineHeight: 1.38,
                textAlign: 'justify',
                color: '#000',
              }}
            >
              <li style={{ marginBottom: 1 }}>
                <strong>Pháp lý:</strong> Bên B là doanh nghiệp hoặc hộ kinh doanh/cá nhân kinh
                doanh có giấy phép kinh doanh từ 02 năm trở lên. Không có nợ xấu hoặc đang có tranh
                chấp khiếu nại.
              </li>
              <li style={{ marginBottom: 1 }}>
                <strong>Vị trí showroom:</strong>{' '}
                {hdShowroomAddress ||
                  '.......................................................................................................'}
              </li>
              <li style={{ marginBottom: 1 }}>
                <strong>Diện tích thi công quầy kệ showroom trưng bày:</strong>{' '}
                {hdShowroomArea ? `${hdShowroomArea} m²` : '.................................... m²'}
              </li>
            </ol>
          </div>

          {/* Clause 3 */}
          <div style={{ marginBottom: 3, marginTop: 6 }}>
            <div
              style={{
                color: '#003087',
                padding: '1px 0px',
                fontWeight: 'bold',
                fontSize: '11.5px',
                marginBottom: '2px',
              }}
            >
              Điều 3. Quyền lợi của Bên B
            </div>
            <ol
              style={{
                margin: '0',
                paddingLeft: 20,
                fontSize: '11px',
                lineHeight: 1.38,
                textAlign: 'justify',
                color: '#000',
              }}
            >
              <li style={{ marginBottom: 1 }}>
                Được Bên A miễn phí thiết kế thi công showroom, quầy kệ, POSM theo tiêu chuẩn.
              </li>
              <li style={{ marginBottom: 1 }}>
                Được hỗ trợ truyền thông – marketing toàn diện và xuất hiện trên tất cả các kênh
                chính thức của Bên A.
              </li>
              <li style={{ marginBottom: 1 }}>
                Được cung cấp sản phẩm độc quyền dành riêng cho hệ thống đại lý phân phối.
              </li>
              <li style={{ marginBottom: 1 }}>
                Được đào tạo và hướng dẫn về quản lý cửa hàng, bán hàng, chăm sóc khách hàng.
              </li>
              <li style={{ marginBottom: 1 }}>
                Được áp dụng chính sách chiết khấu, công nợ và thưởng doanh số theo quy định hiện
                hành của Seajong.
              </li>
            </ol>
          </div>

          {/* Clause 4 */}
          <div style={{ marginBottom: 3, marginTop: 6 }}>
            <div
              style={{
                color: '#003087',
                padding: '1px 0px',
                fontWeight: 'bold',
                fontSize: '11.5px',
                marginBottom: '2px',
              }}
            >
              Điều 4. Nghĩa vụ của Bên B
            </div>
            <ol
              style={{
                margin: '0',
                paddingLeft: 20,
                fontSize: '11px',
                lineHeight: 1.38,
                textAlign: 'justify',
                color: '#000',
              }}
            >
              <li style={{ marginBottom: 1 }}>
                Thanh toán chi phí đầu tư ban đầu (nếu có) và nhập hàng theo mức tối thiểu mà Bên A
                quy định.
              </li>
              <li style={{ marginBottom: 1 }}>
                Duy trì trưng bày và kinh doanh theo đúng chuẩn thương hiệu Seajong.
              </li>
              <li style={{ marginBottom: 1 }}>
                Cam kết đơn hàng đầu tiên đạt mức yêu cầu của bên A dựa trên thỏa thuận tính trên
                chi phí thi công cho bên B.
              </li>
              <li style={{ marginBottom: 1 }}>
                Thực hiện doanh số cam kết tối thiểu hàng năm là:{' '}
                <strong>{formatCurrencyHD(hdAnnualRevenue)}</strong>. Phân bổ tương đương tối thiểu{' '}
                <strong>{formatCurrencyHD(hdMonthlyRevenue)}</strong> cho mỗi tháng.
              </li>
              <li style={{ marginBottom: 1 }}>
                Thanh toán đúng hạn theo các quy định trong hợp đồng.
              </li>
              <li style={{ marginBottom: 1 }}>
                Tuân thủ đầy đủ các chương trình đào tạo, chính sách marketing và hướng dẫn vận hành
                do Bên A ban hành.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div
          className="print-page-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #e2e8f0',
            paddingTop: 6,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '8px', color: '#000' }}>
            Hợp đồng đại lý phân phối thiết bị vệ sinh cao cấp Seajong®
          </span>
          <span style={{ fontSize: '8.5px', color: '#000', fontWeight: 700 }}>Trang 1 / 2</span>
        </div>
      </div>
    );
  };

  const renderPage2HD = () => {
    const today = hdDate && !isNaN(Date.parse(hdDate)) ? new Date(hdDate) : null;
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
          padding: '10mm 15mm 12mm 25mm',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          fontFamily: "'Roboto Condensed', Arial, sans-serif",
        }}
      >
        <div>
          {renderHeaderBlock()}

          {/* Clause 5 */}
          <div style={{ marginBottom: 6, marginTop: 10 }}>
            <div
              style={{
                color: '#003087',
                padding: '2px 0px',
                fontWeight: 'bold',
                fontSize: '12.5px',
                marginBottom: '3px',
              }}
            >
              Điều 5. Quyền và nghĩa vụ của Bên A
            </div>
            <ol
              style={{
                margin: '0',
                paddingLeft: 18,
                fontSize: '11.5px',
                lineHeight: 1.42,
                textAlign: 'justify',
                color: '#000',
              }}
            >
              <li style={{ marginBottom: 1 }}>
                Thiết kế và thi công showroom chuẩn Seajong, cung cấp quầy kệ, POSM theo tiêu chuẩn.
              </li>
              <li style={{ marginBottom: 1 }}>
                Đảm bảo cung ứng hàng hóa đầy đủ, đúng chất lượng, đúng chủng loại và đúng tiến độ.
              </li>
              <li style={{ marginBottom: 1 }}>
                Hỗ trợ marketing, truyền thông, đào tạo nhân sự cho Bên B theo quy trình vận hành
                tiêu chuẩn Seajong.
              </li>
              <li style={{ marginBottom: 1 }}>
                Đảm bảo quyền lợi độc quyền khu vực cho bên B trong phạm vi bán kính{' '}
                <strong>{hdExclusiveRadius || '5'} km</strong> trong thời gian{' '}
                <strong>{hdExclusiveMonths || '06'} (sáu) tháng</strong>. Sau{' '}
                <strong>{hdExclusiveMonths || '06'} (sáu) tháng</strong>, nếu bên B không thực hiện
                đúng các nghĩa vụ Đại lý về Doanh số, Công nợ hoặc vi phạm nghiêm trọng các quy định
                làm ảnh hưởng đến thương hiệu của bên A, bên A có quyền chấm dứt quyền lợi độc quyền
                này và khai thác thêm các đại lý trong khu vực.
              </li>
              <li style={{ marginBottom: 1 }}>
                Được quyền kiểm tra định kỳ việc tuân thủ tiêu chuẩn vận hành, hình ảnh và chất lượng
                dịch vụ tại cửa hàng Bên B.
              </li>
            </ol>
          </div>

          {/* Clause 6 */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                color: '#003087',
                padding: '2px 0px',
                fontWeight: 'bold',
                fontSize: '12.5px',
                marginBottom: '3px',
              }}
            >
              Điều 6. Chính sách thưởng và khuyến khích
            </div>
            <div
              style={{
                paddingLeft: 8,
                fontSize: '11.5px',
                lineHeight: 1.42,
                textAlign: 'justify',
                color: '#000',
              }}
            >
              Bên B được hưởng các chính sách thưởng (thanh toán, doanh số năm) và các hỗ trợ khác
              theo chính sách tại biên bản thống nhất ban hành kèm theo hợp đồng này.
            </div>
          </div>

          {/* Clause 7 */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                color: '#003087',
                padding: '2px 0px',
                fontWeight: 'bold',
                fontSize: '12.5px',
                marginBottom: '3px',
              }}
            >
              Điều 7. Thời hạn hợp đồng
            </div>
            <div
              style={{
                paddingLeft: 8,
                fontSize: '11.5px',
                lineHeight: 1.42,
                textAlign: 'justify',
                color: '#000',
              }}
            >
              Hợp đồng này có hiệu lực trong thời hạn{' '}
              <strong>{hdDurationYears || '02'} (hai) năm</strong> kể từ ngày ký. Sau thời hạn trên,
              hai bên có thể gia hạn theo thỏa thuận bằng văn bản.
            </div>
          </div>

          {/* Clause 8 */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                color: '#003087',
                padding: '2px 0px',
                fontWeight: 'bold',
                fontSize: '12.5px',
                marginBottom: '3px',
              }}
            >
              Điều 8. Chấm dứt hợp đồng
            </div>
            <ol
              style={{
                margin: '0',
                paddingLeft: 18,
                fontSize: '11.5px',
                lineHeight: 1.42,
                textAlign: 'justify',
                color: '#000',
              }}
            >
              <li style={{ marginBottom: 1 }}>
                Hết thời hạn hợp đồng mà không gia hạn. Hai bên thỏa thuận chấm dứt trước thời hạn.
              </li>
              <li style={{ marginBottom: 1 }}>
                Một trong hai bên vi phạm nghiêm trọng nghĩa vụ và không khắc phục trong vòng 30
                ngày kể từ khi nhận được thông báo bằng văn bản.
              </li>
              <li style={{ marginBottom: 1 }}>
                Bên B không đạt doanh số tối thiểu trong <strong>06 (sáu) tháng liên tiếp</strong>{' '}
                thì bên A sẽ xem xét điều chỉnh chính sách chiết khấu hoặc dừng hợp tác.
              </li>
            </ol>
          </div>

          {/* Clause 9 */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                color: '#003087',
                padding: '2px 0px',
                fontWeight: 'bold',
                fontSize: '12.5px',
                marginBottom: '3px',
              }}
            >
              Điều 9. Giải quyết tranh chấp
            </div>
            <ol
              style={{
                margin: '0',
                paddingLeft: 18,
                fontSize: '11.5px',
                lineHeight: 1.42,
                textAlign: 'justify',
                color: '#000',
              }}
            >
              <li style={{ marginBottom: 1 }}>
                Mọi tranh chấp phát sinh trước hết sẽ được giải quyết bằng thương lượng, hòa giải.
              </li>
              <li style={{ marginBottom: 1 }}>
                Trường hợp không đạt được thỏa thuận, tranh chấp sẽ được giải quyết tại Trọng tài
                Thương mại Việt Nam hoặc Tòa án có thẩm quyền theo quy định pháp luật.
              </li>
            </ol>
          </div>

          {/* Clause 10 */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                color: '#003087',
                padding: '2px 0px',
                fontWeight: 'bold',
                fontSize: '12.5px',
                marginBottom: '3px',
              }}
            >
              Điều 10. Điều khoản chung
            </div>
            <ol
              style={{
                margin: '0',
                paddingLeft: 18,
                fontSize: '11.5px',
                lineHeight: 1.42,
                textAlign: 'justify',
                color: '#000',
              }}
            >
              <li style={{ marginBottom: 1 }}>
                Hợp đồng này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.
              </li>
              <li style={{ marginBottom: 1 }}>
                Các phụ lục kèm theo (nếu có) là một phần không tách rời của hợp đồng.
              </li>
              <li style={{ marginBottom: 1 }}>
                Hợp đồng có hiệu lực từ ngày{' '}
                <strong>
                  {dDay && dMonth && dYear ? `${dDay}/${dMonth}/${dYear}` : '.../.../.....'}
                </strong>
              </li>
            </ol>
          </div>

          {/* Signatures */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              textAlign: 'center',
              marginTop: 24,
            }}
          >
            <div>
              <strong style={{ fontSize: '11.5px', textTransform: 'uppercase', color: '#000' }}>
                ĐẠI DIỆN BÊN A
              </strong>
              <div style={{ height: 85 }} />
            </div>
            <div>
              <strong style={{ fontSize: '11.5px', textTransform: 'uppercase', color: '#000' }}>
                ĐẠI DIỆN BÊN B
              </strong>
              <div style={{ height: 85 }} />
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
            borderTop: '1px solid #e2e8f0',
            paddingTop: 8,
          }}
        >
          <span style={{ fontSize: '8px', color: '#000' }}>
            Hợp đồng đại lý phân phối thiết bị vệ sinh cao cấp Seajong®
          </span>
          <span style={{ fontSize: '8.5px', color: '#000', fontWeight: 700 }}>Trang 2 / 2</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FileEarmarkCheck size={18} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[15px] text-slate-900">
              Lập hợp đồng đại lý phân phối
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
              HỢP ĐỒNG ĐẠI LÝ
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePrintHopDong}
            leftIcon={<Printer size={14} />}
          >
            In hợp đồng
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportPDFHD}
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
            {saving ? 'Đang lưu...' : 'Lưu hợp đồng'}
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
            {/* 0. Đính kèm bản scan PDF hợp đồng đã ký & Hạn mức công nợ */}
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2.5">
              <div className="font-extrabold text-[11px] uppercase text-blue-800 tracking-wider flex items-center justify-between">
                <span>Bản scan / PDF hợp đồng đã ký</span>
                {contractPdf && (
                  <button
                    type="button"
                    onClick={() => openAttachmentFile(contractPdf)}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Xem tệp →
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <label
                  title={
                    contractPdf
                      ? getAttachmentDisplayName(contractPdf, 'Hop_dong_da_ky.pdf')
                      : 'Tải lên PDF hợp đồng đã ký'
                  }
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-dashed border-blue-300 hover:border-blue-500 bg-white flex items-center justify-center gap-2 text-xs text-slate-600 cursor-pointer transition-colors overflow-hidden"
                >
                  {contractPdf ? (
                    <FileEarmarkPdfFill className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  ) : (
                    <CloudArrowUp className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span className="truncate block">
                    {uploadingScanPdf
                      ? 'Đang tải tệp...'
                      : contractPdf
                      ? getAttachmentDisplayName(contractPdf, 'Hop_dong_da_ky.pdf')
                      : 'Tải lên PDF hợp đồng đã ký...'}
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
                {contractPdf && (
                  <button
                    type="button"
                    onClick={() => setContractPdf('')}
                    className="px-2.5 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Xoá
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Input
                  label="Hạn mức công nợ (VNĐ)"
                  value={creditLimitStr}
                  onChange={(e) => setCreditLimitStr(formatCurrencyDots(e.target.value))}
                />
                <Select
                  label="Trạng thái ký kết"
                  value={contractStatus}
                  onChange={(e) => setContractStatus(e.target.value)}
                  options={[
                    { value: 'Signed', label: 'Đã ký hợp đồng' },
                    { value: 'Active', label: 'Đang hiệu lực' },
                    { value: 'Pending Signature', label: 'Chờ ký kết' },
                  ]}
                />
              </div>
            </div>

            {/* 1. THÔNG TIN CHUNG & BÊN A */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-blue-700 tracking-wider border-b border-slate-200 pb-1">
                1. Thông tin hợp đồng & Bên A
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Số hợp đồng"
                  value={hdCode}
                  onChange={(e) => setHdCode(e.target.value)}
                />
                <Input
                  label="Ngày ký"
                  type="date"
                  value={hdDate}
                  onChange={(e) => setHdDate(e.target.value)}
                />
              </div>
              <Input
                label="Địa điểm ký"
                value={hdDiaDiem}
                onChange={(e) => setHdDiaDiem(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Đại diện Bên A"
                  value={hdANguoiKy}
                  onChange={(e) => setHdANguoiKy(e.target.value)}
                />
                <Input
                  label="Chức vụ đại diện"
                  value={hdAChucVu}
                  onChange={(e) => setHdAChucVu(e.target.value)}
                />
              </div>
            </div>

            {/* 2. BÊN B (BÊN NHẬN ĐẠI LÝ) */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-blue-700 tracking-wider border-b border-slate-200 pb-1">
                2. Bên B (Bên nhận đại lý)
              </div>
              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-8">
                  <Input
                    label="Tên Công ty / Cửa hàng"
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
                label="Địa chỉ trụ sở"
                value={hdB_DiaChi}
                onChange={(e) => setHdB_DiaChi(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Đại diện ký"
                  value={hdB_DaiDien}
                  onChange={(e) => setHdB_DaiDien(e.target.value)}
                />
                <Input
                  label="Chức vụ đại diện"
                  value={hdB_ChucVu}
                  onChange={(e) => setHdB_ChucVu(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-5">
                  <Input
                    label="Điện thoại"
                    value={hdB_DienThoai}
                    onChange={(e) => setHdB_DienThoai(e.target.value)}
                  />
                </div>
                <div className="col-span-7">
                  <Input
                    label="Email"
                    value={hdB_Email}
                    onChange={(e) => setHdB_Email(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 3. ĐIỀU KHOẢN SHOWROOM */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-slate-800 tracking-wider border-b border-slate-200 pb-1">
                3. Điều khoản Showroom
              </div>
              <Input
                label="Địa chỉ Showroom trưng bày"
                value={hdShowroomAddress}
                onChange={(e) => setHdShowroomAddress(e.target.value)}
              />
              <Input
                label="Diện tích Showroom trưng bày (m²)"
                type="number"
                value={hdShowroomArea}
                onChange={(e) => setHdShowroomArea(e.target.value)}
              />
            </div>

            {/* 4. CHỈ TIÊU DOANH SỐ & ĐỘC QUYỀN */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-slate-800 tracking-wider border-b border-slate-200 pb-1">
                4. Chỉ tiêu doanh số & Độc quyền
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Doanh số cam kết năm (VNĐ)"
                  value={hdAnnualRevenue}
                  onChange={(e) => setHdAnnualRevenue(formatCurrencyDots(e.target.value))}
                />
                <Input
                  label="Doanh số cam kết tháng (VNĐ)"
                  value={hdMonthlyRevenue}
                  onChange={(e) => setHdMonthlyRevenue(formatCurrencyDots(e.target.value))}
                />
                <Input
                  label="Thời hạn hợp đồng (Năm)"
                  value={hdDurationYears}
                  onChange={(e) => setHdDurationYears(e.target.value)}
                />
                <Input
                  label="Bán kính độc quyền (Km)"
                  value={hdExclusiveRadius}
                  onChange={(e) => setHdExclusiveRadius(e.target.value)}
                />
              </div>
              <Input
                label="Thời hạn bảo hộ độc quyền (Tháng)"
                value={hdExclusiveMonths}
                onChange={(e) => setHdExclusiveMonths(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live 2-Page A4 Document Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-200/80 p-8 flex flex-col items-center gap-7">
          <div id="hopdong-print-doc" className="flex flex-col gap-7">
            {renderPage1HD()}
            {renderPage2HD()}
          </div>
        </div>
      </div>
    </div>
  );
};

