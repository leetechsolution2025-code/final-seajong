import React, { useState, useEffect } from 'react';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import {
  FileEarmarkText,
  Printer,
  FileEarmarkPdf,
  Check2,
  XLg,
  Plus,
  PencilSquare,
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

export interface BienBanBonusItem {
  id: string;
  title: string;
  desc: string;
  formula: string;
}

export interface BienBanSupports {
  thietKeQuayKe: boolean;
  quayKeCoBan: boolean;
  catalogue: boolean;
  brochure: boolean;
  tagTreo: boolean;
  standee: boolean;
  bangGia: boolean;
  goiQuangCao: boolean;
  manHinhLed: boolean;
  bienBangSeajong: boolean;
  posterKhoLon: boolean;
  backdropPhotoBooth: boolean;
  vatPhamQuaTang: boolean;
  posmQrCode: boolean;
  dongPhucNhanVien: boolean;
  chiPhiNoiThat: boolean;
  [key: string]: boolean;
}

const DEFAULT_SUPPORTS: BienBanSupports = {
  thietKeQuayKe: true,
  quayKeCoBan: true,
  catalogue: true,
  brochure: true,
  tagTreo: true,
  standee: true,
  bangGia: true,
  goiQuangCao: false,
  manHinhLed: false,
  bienBangSeajong: false,
  posterKhoLon: false,
  backdropPhotoBooth: false,
  vatPhamQuaTang: false,
  posmQrCode: false,
  dongPhucNhanVien: false,
  chiPhiNoiThat: false,
};

const DEFAULT_BONUSES: BienBanBonusItem[] = [
  {
    id: '1',
    title: 'Thưởng thanh toán',
    desc: 'Chiết khấu thanh toán 2% trên tổng giá trị hóa đơn (chưa VAT) khi Đại lý hoàn tất thanh toán trước hạn hoặc đúng hạn quy định trong Hợp đồng đại lý.',
    formula: 'Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)',
  },
  {
    id: '2',
    title: 'Thưởng doanh số năm',
    desc: 'Mức thưởng đạt chỉ tiêu doanh thu năm cam kết tối thiểu. Được chi trả bằng hàng hóa hoặc trừ trực tiếp vào công nợ đơn hàng đầu tiên của năm tiếp theo.',
    formula: 'Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế',
  },
  {
    id: '3',
    title: 'Thưởng vượt doanh số năm',
    desc: 'Mức thưởng khuyến khích vượt chỉ tiêu doanh số năm cam kết.',
    formula: 'Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết',
  },
];

const SUPPORT_LABEL_MAP: Record<string, string> = {
  quayKeCoBan: 'Quầy kệ trưng bày sản phẩm cơ bản',
  catalogue: 'Catalogue sản phẩm',
  brochure: 'Brochure/tờ rơi',
  tagTreo: 'Tag treo sản phẩm',
  standee: 'Standee/Banner khổ nhỏ',
  bangGia: 'Bảng giá sản phẩm',
  manHinhLed: 'Màn hình LED/LCD quảng bá thương hiệu',
  bienBangSeajong: 'Biển bảng thương hiệu Seajong',
  posterKhoLon: 'Poster khổ lớn',
  backdropPhotoBooth: 'Backdrop/photo booth thương hiệu',
  vatPhamQuaTang: 'Vật phẩm quà tặng thương hiệu (merchandise)',
  posmQrCode: 'POSM điện tử kết nối QR code',
  dongPhucNhanVien: 'Đồng phục nhân viên bán hàng',
  chiPhiNoiThat: 'Hỗ trợ một phần chi phí nội thất nếu phải sửa chữa về mặt bằng thô',
};

interface BienBanModalProps {
  open: boolean;
  partner: PartnerItem | null;
  onClose: () => void;
  onSaved: (updatedFields: Partial<PartnerItem>) => void;
}

export const BienBanModal: React.FC<BienBanModalProps> = ({
  open,
  partner,
  onClose,
  onSaved,
}) => {
  const [saving, setSaving] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [uploadingScanPdf, setUploadingScanPdf] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const [bbQuoteCode, setBbQuoteCode] = useState('');
  const [bbCode, setBbCode] = useState('');
  const [bbDate, setBbDate] = useState('');
  const [bbANguoiKy, setBbANguoiKy] = useState('Lê Công Vụ');
  const [bbAChucVu, setBbAChucVu] = useState('Giám đốc');
  const [bbA_DienThoai, setBbA_DienThoai] = useState('1900.633.862');
  const [bbDiaDiem, setBbDiaDiem] = useState('Văn phòng Công ty Cổ phần Seajong Việt Nam');

  const [bbB_Ten, setBbB_Ten] = useState('');
  const [bbB_DiaChi, setBbB_DiaChi] = useState('');
  const [bbB_MST, setBbB_MST] = useState('');
  const [bbB_DaiDien, setBbB_DaiDien] = useState('');
  const [bbB_ChucVu, setBbB_ChucVu] = useState('Giám đốc');
  const [bbB_DienThoai, setBbB_DienThoai] = useState('');
  const [bbB_Email, setBbB_Email] = useState('');

  const [bbSupports, setBbSupports] = useState<BienBanSupports>(DEFAULT_SUPPORTS);
  const [bbBonuses, setBbBonuses] = useState<BienBanBonusItem[]>(DEFAULT_BONUSES);
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);
  const [bbPdf, setBbPdf] = useState('');

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

    setBbQuoteCode(partner.bbQuoteCode || partner.quoteCode || '');
    setBbCode(
      partner.bbCode ||
        `${new Date().getFullYear()}-${partner.code.replace(/[^A-Z0-9]/gi, '').slice(-4)}`
    );
    setBbDate(partner.bbDate || new Date().toISOString().split('T')[0]);
    setBbANguoiKy(partner.bbANguoiKy || companyInfo?.legalRep || 'Lê Công Vụ');
    setBbAChucVu(partner.bbAChucVu || 'Giám đốc');
    setBbA_DienThoai(
      partner.bbA_DienThoai ||
        (companyInfo?.phone || '1900.633.862').replace(/[Hh]otline:\s*/gi, '').trim()
    );
    setBbDiaDiem(partner.bbDiaDiem || 'Văn phòng Công ty Cổ phần Seajong Việt Nam');

    setBbB_Ten(partner.bbB_Ten || partner.companyName || partner.name || '');
    setBbB_DiaChi(partner.bbB_DiaChi || customerFullAddress);
    setBbB_MST(partner.bbB_MST || '');
    setBbB_DaiDien(partner.bbB_DaiDien || partner.name || '');
    setBbB_ChucVu(partner.bbB_ChucVu || 'Đại diện');
    setBbB_DienThoai(partner.bbB_DienThoai || partner.phone || '');
    setBbB_Email(partner.bbB_Email || partner.email || '');

    setBbSupports(
      partner.bbSupports && typeof partner.bbSupports === 'object'
        ? { ...DEFAULT_SUPPORTS, ...partner.bbSupports }
        : DEFAULT_SUPPORTS
    );
    setBbBonuses(
      Array.isArray(partner.bbBonuses) && partner.bbBonuses.length > 0
        ? partner.bbBonuses
        : DEFAULT_BONUSES
    );
    setBbPdf(partner.bbPdf || '');
    setEditingBonusId(null);
  }, [open, partner]);

  if (!open || !partner) return null;

  const handleUploadScanPdf = async (file: File) => {
    setUploadingScanPdf(true);
    try {
      const url = await uploadPartnerScanFile(file);
      if (url) {
        setBbPdf(url);
      }
    } finally {
      setUploadingScanPdf(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const updatedFields: Partial<PartnerItem> = {
      bbQuoteCode,
      bbCode,
      bbDate,
      bbDiaDiem,
      bbANguoiKy,
      bbAChucVu,
      bbA_DienThoai,
      bbB_Ten,
      bbB_DiaChi,
      bbB_MST,
      bbB_DaiDien,
      bbB_ChucVu,
      bbB_DienThoai,
      bbB_Email,
      bbSupports,
      bbBonuses,
      bbPdf,
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
      console.error('Lỗi lưu biên bản:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintBienBan = () => {
    const docEl = document.getElementById('bienban-print-doc');
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
  <title>Biên bản thống nhất đại lý - ${bbB_Ten || ''}</title>
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

  const handleExportPDF = async () => {
    const docEl = document.getElementById('bienban-print-doc');
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

      pdf.save(
        `Bien_ban_thong_nhat_dai_ly_${(bbB_Ten || 'Seajong').replace(/\s+/g, '_')}.pdf`
      );
    } catch (e) {
      console.error('Error exporting PDF', e);
    } finally {
      setPdfUploading(false);
    }
  };

  const renderDocHeader = (large = false) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #003087',
        paddingBottom: large ? 10 : 4,
        marginBottom: large ? 15 : 0,
      }}
    >
      <img
        src={companyInfo?.logoUrl || '/logo.png'}
        style={{ height: large ? '45px' : '38px', width: 'auto', objectFit: 'contain' }}
        alt="Seajong"
      />

      <div style={{ textAlign: 'right', fontSize: '9px', lineHeight: 1.35, color: '#000' }}>
        <div
          style={{
            fontWeight: 800,
            color: '#003087',
            fontSize: large ? '10px' : '9.5px',
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
          Hotline:{' '}
          {bbA_DienThoai ||
            (companyInfo?.phone || '1900.633.862').replace(/[Hh]otline:\s*/gi, '').trim()}{' '}
          | Website: {companyInfo?.website || 'https://seajong.com/'}
        </div>
      </div>
    </div>
  );

  const renderCheckItem = (checked: boolean, title: string, desc: string) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
      {checked ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '11px',
            height: '11px',
            border: '1.2px solid #003087',
            backgroundColor: '#003087',
            borderRadius: '2px',
            color: '#fff',
            fontSize: '7px',
            fontWeight: 'bold',
            marginTop: 2,
            flexShrink: 0,
          }}
        >
          ✓
        </span>
      ) : (
        <span
          style={{
            display: 'inline-block',
            width: '11px',
            height: '11px',
            border: '1.2px solid #cbd5e1',
            borderRadius: '2px',
            marginTop: 2,
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <span style={{ fontWeight: 700, color: '#000' }}>{title}</span>
        <span style={{ fontSize: '9px', color: '#000' }}>{desc}</span>
      </div>
    </div>
  );

  const renderPage1 = () => {
    const today = bbDate && !isNaN(Date.parse(bbDate)) ? new Date(bbDate) : null;
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
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '8mm 15mm 8mm 25mm',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div>
          {renderDocHeader(false)}

          {/* Title Section */}
          <div style={{ textAlign: 'center', margin: '12px 0 6px 0' }}>
            <h2
              style={{
                margin: 0,
                color: '#003087',
                fontWeight: 900,
                fontSize: '16px',
                letterSpacing: '1px',
              }}
            >
              BIÊN BẢN THỐNG NHẤT
            </h2>
            <h3
              style={{
                margin: '2px 0 0',
                color: '#003087',
                fontWeight: 700,
                fontSize: '11.5px',
              }}
            >
              ĐẠI LÝ CHÍNH THỨC SEAJONG
            </h3>
            <div style={{ fontSize: '10px', color: '#003087', fontWeight: 600, marginTop: 6 }}>
              Số: {bbCode || '................'}/BBTN-SEAJONG
            </div>
            <div style={{ fontSize: '10px', color: '#000', marginTop: 2, fontStyle: 'italic' }}>
              (Kèm theo Báo giá số: {bbQuoteCode || '.......................................'})
            </div>
          </div>

          {/* Date & Location */}
          <div style={{ fontSize: '11px', margin: '12px 0 6px 0', lineHeight: 1.4, color: '#000' }}>
            Hôm nay, ngày {dDay} tháng {dMonth} năm {dYear}, tại{' '}
            {bbDiaDiem || 'Văn phòng Công ty Cổ phần Seajong Việt Nam'}, chúng tôi gồm:
          </div>

          {/* Side A & B */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
            {/* Side A */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '5px 10px',
                background: '#f8fafc',
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: '#003087',
                  fontSize: '11.5px',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                BÊN A (BÊN GIAO ĐẠI LÝ):{' '}
                {companyInfo?.name?.toUpperCase() || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1px 12px',
                  fontSize: '11px',
                  lineHeight: 1.35,
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
                    {bbANguoiKy.startsWith('Ông') || bbANguoiKy.startsWith('Bà')
                      ? bbANguoiKy
                      : `Ông ${bbANguoiKy}`}
                  </span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '70px', flexShrink: 0 }}>Chức vụ:</span>
                  <span>{bbAChucVu}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '90px', flexShrink: 0 }}>Điện thoại:</span>
                  <span>{bbA_DienThoai || '1900.633.862'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '70px', flexShrink: 0 }}>Email:</span>
                  <span>{companyInfo?.email || 'info@seajong.com'}</span>
                </div>
              </div>
            </div>

            {/* Side B */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '5px 10px',
                background: '#f8fafc',
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: '#003087',
                  fontSize: '11.5px',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                BÊN B (BÊN NHẬN ĐẠI LÝ):{' '}
                {bbB_Ten?.toUpperCase() ||
                  '........................................................................'}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1px 12px',
                  fontSize: '11px',
                  lineHeight: 1.35,
                  color: '#000',
                }}
              >
                <div style={{ gridColumn: 'span 2', display: 'flex' }}>
                  <span style={{ width: '90px', flexShrink: 0 }}>Địa chỉ:</span>
                  <span>
                    {bbB_DiaChi ||
                      '........................................................................'}
                  </span>
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex' }}>
                  <span style={{ width: '90px', flexShrink: 0 }}>Mã số thuế:</span>
                  <span>{bbB_MST || '....................................'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '90px', flexShrink: 0 }}>Đại diện:</span>
                  <span>{bbB_DaiDien || '................................................'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '70px', flexShrink: 0 }}>Chức vụ:</span>
                  <span>{bbB_ChucVu || '................................................'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '90px', flexShrink: 0 }}>Điện thoại:</span>
                  <span>{bbB_DienThoai || '....................................'}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: '70px', flexShrink: 0 }}>Email:</span>
                  <span>{bbB_Email || '................................................'}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              lineHeight: 1.35,
              color: '#000',
              marginBottom: 8,
              textAlign: 'justify',
            }}
          >
            Sau khi tiến hành trao đổi, đàm phán trên tinh thần tự nguyện, bình đẳng và cùng có lợi,
            hai Bên thống nhất lập biên bản ghi nhận các nội dung thỏa thuận cốt lõi sau đây làm căn
            cứ để ký kết Hợp đồng đại lý chính thức với thông tin chi tiết như sau:
          </div>

          {/* Clause 1 */}
          <div style={{ marginBottom: 6 }}>
            <strong style={{ color: '#003087', fontSize: '12px' }}>
              ĐIỀU 1: HỖ TRỢ TOÀN DIỆN TỪ BÊN A
            </strong>
            <div
              style={{
                backgroundColor: '#dbeafe',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '11.5px',
                fontWeight: 'bold',
                color: '#000',
                marginBottom: 6,
                marginTop: 3,
              }}
            >
              1. Hỗ trợ thiết kế và trưng bày:
            </div>
            <div style={{ marginTop: 2, paddingLeft: 8 }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#003087',
                  margin: '2px 0 4px 0',
                }}
              >
                a. Bên A cung cấp miễn phí thi công quầy kệ trưng bày theo tiêu chuẩn Seajong và gói
                quảng cáo điểm bán tiêu chuẩn theo nhận diện thương hiệu:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  fontSize: '11px',
                  paddingLeft: 10,
                  marginBottom: 8,
                }}
              >
                {renderCheckItem(
                  bbSupports.quayKeCoBan,
                  'Quầy kệ trưng bày sản phẩm cơ bản',
                  'Vách gỗ, khung kệ, đảo bếp, phòng tắm trải nghiệm... dựa theo thỏa thuận thi công giữa hai bên trước khi ký hợp đồng.'
                )}
                {renderCheckItem(
                  bbSupports.catalogue,
                  'Catalogue sản phẩm',
                  'Giới thiệu đầy đủ các dòng sen vòi bồn cầu, chậu, đèn điều hoà, phụ kiện phòng tắm...'
                )}
                {renderCheckItem(
                  bbSupports.brochure,
                  'Brochure/tờ rơi',
                  'Thông tin sản phẩm mới, chương trình khuyến mãi.'
                )}
                {renderCheckItem(
                  bbSupports.tagTreo,
                  'Tag treo sản phẩm',
                  'Gắn trực tiếp lên sen vòi, bồn cầu, chậu (ghi rõ model, tính năng, giá...).'
                )}
                {renderCheckItem(
                  bbSupports.standee,
                  'Standee/Banner khổ nhỏ',
                  'Quảng bá thương hiệu và sản phẩm chủ lực.'
                )}
                {renderCheckItem(
                  bbSupports.bangGia,
                  'Bảng giá sản phẩm',
                  'Định dạng chuẩn Seajong.'
                )}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#003087',
                  margin: '4px 0 4px 0',
                }}
              >
                b. Bên A cung cấp gói Quảng cáo điểm bán mở rộng chuẩn nhận diện thương hiệu Seajong
                theo thoả thuận:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  fontSize: '11px',
                  paddingLeft: 10,
                }}
              >
                {renderCheckItem(
                  bbSupports.manHinhLed,
                  'Màn hình LED/LCD quảng bá thương hiệu',
                  'Chiếu TVC, video hướng dẫn, case study công trình.'
                )}
                {renderCheckItem(
                  bbSupports.bienBangSeajong,
                  'Biển bảng thương hiệu Seajong',
                  'Biển alu, hộp đèn hoặc pano ngoài trời theo chuẩn nhận diện.'
                )}
                {renderCheckItem(
                  bbSupports.posterKhoLon,
                  'Poster khổ lớn',
                  'Treo trong showroom/cửa hàng để tăng độ nhận diện.'
                )}
                {renderCheckItem(
                  bbSupports.backdropPhotoBooth,
                  'Backdrop/photo booth thương hiệu',
                  'Dùng trong sự kiện khai trương, hội thảo khách hàng.'
                )}
                {renderCheckItem(
                  bbSupports.vatPhamQuaTang,
                  'Vật phẩm quà tặng thương hiệu (merchandise)',
                  'Túi vải, hộp quà, bút, sổ, ô che mưa.'
                )}
                {renderCheckItem(
                  bbSupports.posmQrCode,
                  'POSM điện tử kết nối QR code',
                  'Scan QR xem catalogue, chính sách bảo hành, video sản phẩm.'
                )}
                {renderCheckItem(
                  bbSupports.dongPhucNhanVien,
                  'Đồng phục nhân viên bán hàng',
                  'Áo polo/thun + bảng tên chuẩn thương hiệu.'
                )}
                {renderCheckItem(
                  bbSupports.chiPhiNoiThat,
                  'Hỗ trợ một phần chi phí nội thất nếu phải sửa chữa về mặt bằng thô',
                  'Chi tiết nội dung này sẽ được bên A khảo sát, bàn bạc với bên B và được lập thành văn bản coi như phụ lục của hợp đồng.'
                )}
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
            borderTop: '1px solid #e2e8f0',
            paddingTop: 8,
          }}
        >
          <span style={{ fontSize: '8px', color: '#000' }}>
            Biên bản thống nhất đại lý phân phối thiết bị vệ sinh cao cấp Seajong®
          </span>
          <span style={{ fontSize: '8.5px', color: '#000', fontWeight: 700 }}>Trang 1 / 3</span>
        </div>
      </div>
    );
  };

  const renderPage2 = () => (
    <div
      className="print-page-break"
      style={{
        width: '794px',
        height: '1123px',
        background: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '10mm 15mm 10mm 25mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <div>
        {renderDocHeader(true)}

        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              backgroundColor: '#dbeafe',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '11.5px',
              fontWeight: 'bold',
              color: '#000',
              marginBottom: 6,
            }}
          >
            2. Hỗ trợ vận hành:
          </div>
          <ul
            style={{
              margin: '0',
              paddingLeft: 16,
              fontSize: '11px',
              lineHeight: 1.4,
              listStyleType: 'disc',
              color: '#000',
            }}
          >
            <li style={{ marginBottom: 3 }}>
              Hỗ trợ tuyển dụng và đào tạo nhân viên vận hành showroom theo tiêu chuẩn.
            </li>
            <li style={{ marginBottom: 3 }}>
              Cung cấp tài liệu hướng dẫn vận hành, quản lý bán hàng, chăm sóc khách hàng.
            </li>
            <li style={{ marginBottom: 3 }}>
              Hỗ trợ cài đặt và sử dụng phần mềm quản lý bán hàng.
            </li>
            <li style={{ marginBottom: 3 }}>
              Đội ngũ hỗ trợ khai trương và đồng hành hai tháng đầu tiên.
            </li>
          </ul>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              backgroundColor: '#dbeafe',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '11.5px',
              fontWeight: 'bold',
              color: '#000',
              marginBottom: 6,
            }}
          >
            3. Hỗ trợ đào tạo và nhân sự:
          </div>
          <ul
            style={{
              margin: '0',
              paddingLeft: 16,
              fontSize: '11px',
              lineHeight: 1.4,
              listStyleType: 'disc',
              color: '#000',
            }}
          >
            <li style={{ marginBottom: 3 }}>
              Đào tạo định kỳ về sản phẩm, bán hàng, upsell, quản lý cửa hàng, chăm sóc khách hàng.
            </li>
            <li style={{ marginBottom: 3 }}>
              Hỗ trợ tuyển dụng và đào tạo ban đầu cho đội ngũ nhân viên vận hành thuần thục theo bộ
              quy trình vận hành tiêu chuẩn Seajong.
            </li>
            <li style={{ marginBottom: 3 }}>
              Hỗ trợ chi trả một phần thu nhập cơ bản và chi phí từng vụ việc cho nhân viên bảo
              hành, bảo trì lắp đặt tại đại lý theo quy định của Seajong.
            </li>
          </ul>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              backgroundColor: '#dbeafe',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '11.5px',
              fontWeight: 'bold',
              color: '#000',
              marginBottom: 6,
            }}
          >
            4. Hỗ trợ Marketing và Truyền thông:
          </div>
          <ul
            style={{
              margin: '0',
              paddingLeft: 16,
              fontSize: '11px',
              lineHeight: 1.4,
              listStyleType: 'disc',
              color: '#000',
            }}
          >
            <li style={{ marginBottom: 3 }}>
              Bên A thiết lập các kênh Fanpage, Tiktok miễn phí cho Bên B và hỗ trợ đào tạo quản
              trị.
            </li>
            <li style={{ marginBottom: 3 }}>
              Bên A tư vấn xây dựng kế hoạch truyền thông, đăng tải 5 nội dung/tháng về Bên B trên
              các kênh Social và Website của Seajong.
            </li>
            <li style={{ marginBottom: 3 }}>
              Bên A cung cấp cho bên B hình ảnh sản phẩm, thiết kế ấn phẩm truyền thông, Catalogue,
              niêm yết thông tin trên website.
            </li>
            <li style={{ marginBottom: 3 }}>
              Được hỗ trợ lên kế hoạch các chương trình khuyến mãi, thiết kế banner POSM và in ấn
              theo chương trình.
            </li>
          </ul>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              backgroundColor: '#dbeafe',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '11.5px',
              fontWeight: 'bold',
              color: '#000',
              marginBottom: 6,
            }}
          >
            5. Hỗ trợ sản phẩm và hàng hóa:
          </div>
          <ul
            style={{
              margin: '0',
              paddingLeft: 16,
              fontSize: '11px',
              lineHeight: 1.4,
              listStyleType: 'disc',
              color: '#000',
            }}
          >
            <li style={{ marginBottom: 3 }}>
              Được ưu tiên nhập hàng trước, có thể đặt mẫu riêng độc quyền.
            </li>
            <li style={{ marginBottom: 3 }}>
              Được độc quyền phân phối trong bán kính 3km với nội thành và 5 km với ngoại thành.
            </li>
            <li style={{ marginBottom: 3 }}>
              Chính sách đổi trả/thu hồi hàng trưng bày trong 02 năm đầu nếu đại lý ngừng hoạt động
              do bất khả kháng.
            </li>
          </ul>
        </div>

        {/* Clause 2 */}
        <div style={{ marginBottom: 12 }}>
          <strong style={{ color: '#003087', fontSize: '12px' }}>
            ĐIỀU 2: CHÍNH SÁCH BÁN HÀNG VÀ CHIẾT KHẤU
          </strong>
          <ol
            style={{
              margin: '4px 0 0 0',
              paddingLeft: 16,
              fontSize: '11px',
              lineHeight: 1.4,
              color: '#000',
              textAlign: 'justify',
            }}
          >
            <li style={{ marginBottom: 4 }}>
              Bên A cam kết cung cấp cho bên B hàng hóa mới 100% đạt tiêu chuẩn của Seajong. Có đầy
              đủ hoá đơn chứng từ chứng minh nguồn gốc xuất xứ sản phẩm.
            </li>
            <li style={{ marginBottom: 4 }}>
              <strong>Giá đại lý:</strong> Bên A chiết khấu cho bên B <strong>50%</strong> trên bảng
              giá bán lẻ được ban hành tuỳ từng thời điểm.
            </li>
            <li style={{ marginBottom: 4 }}>
              Bên B được phép chiết khấu tối đa 25% cho khách hàng cuối cùng. Trong trường hợp dịp
              lễ đặc biệt (Tết Nguyên đán, 30/4 – 1/5, Quốc Khánh 2/9, Giáng sinh, Tết Dương lịch)
              chiết khấu có thể điều chỉnh giá tới 50% để thúc đẩy doanh số.
            </li>
            <li style={{ marginBottom: 4 }}>
              Với các đơn hàng lớn, hàng đặc biệt bên B phải đặt cọc 30% khi đặt hàng.
            </li>
            <li style={{ marginBottom: 4 }}>
              Thời hạn tín dụng tối đa là <strong>30 (ba mươi) ngày</strong> kể từ ngày nhận hàng.
              Quá thời hạn này mà Bên B chưa thanh toán, sẽ không được hưởng thưởng thanh toán và
              được coi là vi phạm nghĩa vụ thanh toán. Trong trường hợp đó, Bên A có quyền áp dụng
              các biện pháp hạn chế cung cấp hàng hóa cho Bên B.
            </li>
          </ol>
        </div>

        {/* Clause 3 */}
        <div style={{ marginBottom: 12 }}>
          <strong style={{ color: '#003087', fontSize: '12px', textTransform: 'uppercase' }}>
            ĐIỀU 3: CÁC ĐIỀU KHOẢN THƯỞNG ĐẠI LÝ
          </strong>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {bbBonuses.map((bonus, idx) => {
              const cleanTitle = bonus.title || '';
              const displayTitle = /^\d+\./.test(cleanTitle)
                ? cleanTitle
                : `${idx + 1}. ${cleanTitle}`;
              const descParagraphs = (bonus.desc || '').split('\n').filter(Boolean);

              return (
                <div key={bonus.id || idx} style={{ marginBottom: 4 }}>
                  <div
                    style={{
                      backgroundColor: '#dbeafe',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '11.5px',
                      fontWeight: 'bold',
                      color: '#000',
                      marginBottom: 4,
                    }}
                  >
                    {displayTitle}
                  </div>
                  <ul
                    style={{
                      margin: '0',
                      paddingLeft: 16,
                      fontSize: '11px',
                      lineHeight: 1.4,
                      color: '#000',
                    }}
                  >
                    {descParagraphs.length > 0 ? (
                      descParagraphs.map((para, pIdx) => (
                        <li key={pIdx} style={{ marginBottom: 2 }}>
                          {para}
                        </li>
                      ))
                    ) : (
                      <li style={{ marginBottom: 2 }}>{bonus.desc}</li>
                    )}
                    {bonus.formula && (
                      <li style={{ display: 'inline-block', marginTop: 2 }}>
                        Công thức tính:{' '}
                        <span
                          style={{
                            display: 'inline-block',
                            border: '1px solid #cbd5e1',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: '#f8fafc',
                            fontWeight: 'bold',
                            fontSize: '10px',
                            color: '#003087',
                          }}
                        >
                          {bonus.formula}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
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
          Biên bản thống nhất đại lý phân phối thiết bị vệ sinh cao cấp Seajong®
        </span>
        <span style={{ fontSize: '8.5px', color: '#000', fontWeight: 700 }}>Trang 2 / 3</span>
      </div>
    </div>
  );

  const renderPage3 = () => (
    <div
      className="print-page-break"
      style={{
        width: '794px',
        height: '1123px',
        background: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '10mm 15mm 10mm 25mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <div>
        {renderDocHeader(true)}

        <div style={{ marginBottom: 20 }}>
          <strong style={{ color: '#003087', fontSize: '12px', textTransform: 'uppercase' }}>
            ĐIỀU 4: CÁC QUY ĐỊNH CHUNG
          </strong>
          <ol
            style={{
              margin: '6px 0 0 0',
              paddingLeft: 16,
              fontSize: '12px',
              lineHeight: 1.45,
              color: '#000',
            }}
          >
            <li style={{ marginBottom: 3 }}>
              Các chính sách hỗ trợ và thưởng nêu trên là một phần không tách rời của Hợp đồng Đại
              lý phân phối số {partner.contractNo || '........................'}
            </li>
            <li style={{ marginBottom: 3 }}>
              Seajong có quyền điều chỉnh chi tiết chính sách để phù hợp với tình hình kinh doanh,
              nhưng phải thông báo cho Bên B bằng văn bản ít nhất 30 ngày trước khi áp dụng.
            </li>
            <li style={{ marginBottom: 3 }}>
              Các phụ lục này được lập thành 02 bản, mỗi bên giữ 01 bản, có giá trị pháp lý như
              nhau.
            </li>
          </ol>
        </div>

        {/* Signatures */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            textAlign: 'center',
            marginTop: 40,
          }}
        >
          <div>
            <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#000' }}>
              ĐẠI DIỆN BÊN A
            </strong>
            <div style={{ height: 110 }} />
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#000' }}>{bbANguoiKy}</div>
          </div>
          <div>
            <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#000' }}>
              ĐẠI DIỆN BÊN B
            </strong>
            <div style={{ height: 110 }} />
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#000' }}>{bbB_DaiDien}</div>
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
          Biên bản thống nhất đại lý phân phối thiết bị vệ sinh cao cấp Seajong®
        </span>
        <span style={{ fontSize: '8.5px', color: '#000', fontWeight: 700 }}>Trang 3 / 3</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-100 flex flex-col">
      {/* Top Header Bar - Đồng bộ với BaoGiaSanitaryModal */}
      <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FileEarmarkText size={18} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[15px] text-slate-900">
              Lập biên bản thống nhất đại lý
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
              BIÊN BẢN GHI NHỚ
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePrintBienBan}
            leftIcon={<Printer size={14} />}
          >
            In biên bản
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportPDF}
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
            {saving ? 'Đang lưu...' : 'Lưu biên bản'}
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
            {/* 0. Đính kèm bản scan PDF biên bản đã ký */}
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2">
              <div className="font-extrabold text-[11px] uppercase text-blue-800 tracking-wider flex items-center justify-between">
                <span>Bản scan / PDF biên bản đã ký</span>
                {bbPdf && (
                  <button
                    type="button"
                    onClick={() => openAttachmentFile(bbPdf)}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Xem tệp →
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <label
                  title={
                    bbPdf
                      ? getAttachmentDisplayName(bbPdf, 'Bien_ban_da_ky.pdf')
                      : 'Tải lên PDF biên bản đã ký'
                  }
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-dashed border-blue-300 hover:border-blue-500 bg-white flex items-center justify-center gap-2 text-xs text-slate-600 cursor-pointer transition-colors overflow-hidden"
                >
                  {bbPdf ? (
                    <FileEarmarkPdfFill className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  ) : (
                    <CloudArrowUp className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span className="truncate block">
                    {uploadingScanPdf
                      ? 'Đang tải tệp...'
                      : bbPdf
                      ? getAttachmentDisplayName(bbPdf, 'Bien_ban_da_ky.pdf')
                      : 'Tải lên PDF biên bản đã ký...'}
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
                {bbPdf && (
                  <button
                    type="button"
                    onClick={() => setBbPdf('')}
                    className="px-2.5 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Xoá
                  </button>
                )}
              </div>
            </div>

            {/* 1. BÊN A */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-blue-700 tracking-wider border-b border-slate-200 pb-1">
                1. Bên A (Bên giao đại lý)
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Số báo giá"
                  value={bbQuoteCode}
                  onChange={(e) => setBbQuoteCode(e.target.value)}
                />
                <Input
                  label="Số biên bản"
                  value={bbCode}
                  onChange={(e) => setBbCode(e.target.value)}
                />
                <Input
                  label="Người ký"
                  value={bbANguoiKy}
                  onChange={(e) => setBbANguoiKy(e.target.value)}
                />
                <Input
                  label="Chức vụ"
                  value={bbAChucVu}
                  onChange={(e) => setBbAChucVu(e.target.value)}
                />
              </div>
              <Input
                label="Địa điểm lập"
                value={bbDiaDiem}
                onChange={(e) => setBbDiaDiem(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Ngày lập"
                  type="date"
                  value={bbDate}
                  onChange={(e) => setBbDate(e.target.value)}
                />
                <Input
                  label="Số điện thoại"
                  value={bbA_DienThoai}
                  onChange={(e) => setBbA_DienThoai(e.target.value)}
                />
              </div>
            </div>

            {/* 2. BÊN B */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-blue-700 tracking-wider border-b border-slate-200 pb-1">
                2. Bên B (Bên nhận đại lý)
              </div>
              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-8">
                  <Input
                    label="Tên giao dịch / Đại lý"
                    value={bbB_Ten}
                    onChange={(e) => setBbB_Ten(e.target.value)}
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    label="Mã số thuế"
                    value={bbB_MST}
                    onChange={(e) => setBbB_MST(e.target.value)}
                  />
                </div>
              </div>
              <Input
                label="Địa chỉ"
                value={bbB_DiaChi}
                onChange={(e) => setBbB_DiaChi(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Đại diện"
                  value={bbB_DaiDien}
                  onChange={(e) => setBbB_DaiDien(e.target.value)}
                />
                <Input
                  label="Chức vụ"
                  value={bbB_ChucVu}
                  onChange={(e) => setBbB_ChucVu(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-5">
                  <Input
                    label="Điện thoại"
                    value={bbB_DienThoai}
                    onChange={(e) => setBbB_DienThoai(e.target.value)}
                  />
                </div>
                <div className="col-span-7">
                  <Input
                    label="Email"
                    value={bbB_Email}
                    onChange={(e) => setBbB_Email(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 3. CÁC MỤC HỖ TRỢ TỪ BÊN ĐẠI LÝ */}
            <div className="space-y-2">
              <div className="font-extrabold text-[11.5px] uppercase text-slate-800 tracking-wider border-b border-slate-200 pb-1">
                3. Các mục hỗ trợ từ bên đại lý
              </div>
              <div className="space-y-1.5">
                {Object.keys(SUPPORT_LABEL_MAP).map((key) => (
                  <label
                    key={key}
                    className="flex items-start gap-2 cursor-pointer select-none py-0.5 text-slate-700 hover:text-slate-900"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(bbSupports[key])}
                      onChange={(e) =>
                        setBbSupports((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                    <span className="text-[11.5px] leading-snug">{SUPPORT_LABEL_MAP[key]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 4. KHOẢN THƯỞNG DOANH SỐ */}
            <div className="space-y-2.5">
              <div className="font-extrabold text-[11.5px] uppercase text-slate-800 tracking-wider border-b border-slate-200 pb-1">
                4. Khoản thưởng doanh số
              </div>
              <div className="space-y-2">
                {bbBonuses.map((bonus, idx) => (
                  <div
                    key={bonus.id || idx}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5"
                  >
                    {editingBonusId === bonus.id ? (
                      <div className="space-y-2">
                        <Input
                          label="Tên khoản thưởng"
                          value={bonus.title}
                          onChange={(e) =>
                            setBbBonuses((prev) =>
                              prev.map((b) =>
                                b.id === bonus.id ? { ...b, title: e.target.value } : b
                              )
                            )
                          }
                        />
                        <div>
                          <label className="form-label block mb-1">Mô tả điều kiện</label>
                          <textarea
                            rows={2}
                            value={bonus.desc}
                            onChange={(e) =>
                              setBbBonuses((prev) =>
                                prev.map((b) =>
                                  b.id === bonus.id ? { ...b, desc: e.target.value } : b
                                )
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500 resize-none bg-white"
                          />
                        </div>
                        <Input
                          label="Công thức tính"
                          value={bonus.formula}
                          onChange={(e) =>
                            setBbBonuses((prev) =>
                              prev.map((b) =>
                                b.id === bonus.id ? { ...b, formula: e.target.value } : b
                              )
                            )
                          }
                        />
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setBbBonuses((prev) => prev.filter((b) => b.id !== bonus.id))
                            }
                            className="px-2 py-1 rounded border border-rose-200 bg-rose-50 text-rose-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash size={11} />
                            <span>Xoá</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBonusId(null)}
                            className="btn btn-primary px-2.5 py-1 rounded text-white text-[11px] font-bold cursor-pointer"
                          >
                            Xong
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-slate-900 text-xs">{bonus.title}</strong>
                          <button
                            type="button"
                            onClick={() => setEditingBonusId(bonus.id)}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Chỉnh sửa khoản thưởng"
                          >
                            <PencilSquare size={13} />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {bonus.desc}
                        </p>
                        <div className="text-[11px] font-mono font-bold text-blue-700 mt-1">
                          {bonus.formula}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const newId = String(Date.now());
                    setBbBonuses((prev) => [
                      ...prev,
                      {
                        id: newId,
                        title: 'Khoản thưởng mới',
                        desc: 'Chi tiết khoản thưởng và điều kiện đi kèm...',
                        formula: 'Mức thưởng = ...',
                      },
                    ]);
                    setEditingBonusId(newId);
                  }}
                  className="w-full py-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Thêm khoản thưởng</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live 3-Page A4 Document Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-200/80 p-8 flex flex-col items-center gap-7">
          <div id="bienban-print-doc" className="flex flex-col gap-7">
            {renderPage1()}
            {renderPage2()}
            {renderPage3()}
          </div>
        </div>
      </div>
    </div>
  );
};

