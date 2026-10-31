import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  X,
  FileText,
  ShieldCheck,
  Sliders,
  ArrowCounterclockwise,
  Book
} from 'react-bootstrap-icons';
import { Button } from './Button';
import { Toggle } from './Toggle';
import { Input } from './Input';
import { useCompanyInfo } from '../../hooks/useCompanyInfo';
import type { CompanyInfo } from '../../services/companyService';

export interface DocumentItem {
  no: number;
  code: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  status: 'Đạt chuẩn' | 'Có điều kiện';
}

export interface CoverPageHelpers {
  company: CompanyInfo;
  title: string;
  code: string;
  docDate: string;
  dept?: string;
  partyA?: string;
  partyB?: string;
  projectName?: string;
  customerName?: string;
  customerAddress?: string;
  workName?: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface PrintPreviewMetadata {
  title: string;
  code: string;
  docDate: string;
  performerName: string;
  performerRole: string;
  supervisorName: string;
  supervisorRole: string;
  dept?: string;
  partyA?: string;
  partyB?: string;
  showStamp?: boolean;
  showWatermark?: boolean;
}

export interface PrintPreviewSidebarHelpers {
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  docDate: string;
  setDocDate: React.Dispatch<React.SetStateAction<string>>;
  performerName: string;
  setPerformerName: React.Dispatch<React.SetStateAction<string>>;
  performerRole: string;
  setPerformerRole: React.Dispatch<React.SetStateAction<string>>;
  supervisorName: string;
  setSupervisorName: React.Dispatch<React.SetStateAction<string>>;
  supervisorRole: string;
  setSupervisorRole: React.Dispatch<React.SetStateAction<string>>;
  showStamp: boolean;
  setShowStamp: React.Dispatch<React.SetStateAction<boolean>>;
  showWatermark: boolean;
  setShowWatermark: React.Dispatch<React.SetStateAction<boolean>>;
  hasCoverPage: boolean;
  setHasCoverPage: React.Dispatch<React.SetStateAction<boolean>>;
  marginLeft: number | '';
  setMarginLeft: React.Dispatch<React.SetStateAction<number | ''>>;
  marginTop: number | '';
  setMarginTop: React.Dispatch<React.SetStateAction<number | ''>>;
  marginRight: number | '';
  setMarginRight: React.Dispatch<React.SetStateAction<number | ''>>;
  marginBottom: number | '';
  setMarginBottom: React.Dispatch<React.SetStateAction<number | ''>>;
}

export interface PrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tiêu đề tài liệu */
  documentTitle?: string;
  /** Mã số văn bản / quyết định */
  documentCode?: string;
  /** Ngày ban hành / lập biên bản */
  date?: string;
  /** Phòng ban phụ trách */
  department?: string;
  /** Người lập / đại diện */
  author?: string;
  /** Người thực hiện */
  performerName?: string;
  /** Chức vụ người thực hiện */
  performerRole?: string;
  /** Người giám sát */
  supervisorName?: string;
  /** Chức vụ người giám sát */
  supervisorRole?: string;
  /** Khổ giấy mặc định ('A4' | 'A3') */
  defaultPaperSize?: 'A4' | 'A3';
  /** Hướng in mặc định ('portrait' | 'landscape') */
  defaultOrientation?: 'portrait' | 'landscape';
  /** Lề mặc định (mm) */
  defaultMarginLeft?: number;
  defaultMarginRight?: number;
  defaultMarginTop?: number;
  defaultMarginBottom?: number;
  /** Danh sách mục bàn giao / chi tiết nếu dùng mẫu mặc định */
  items?: DocumentItem[];
  /** Tiêu đề thanh công cụ panel trái tùy biến */
  sidebarTitle?: string;
  /** Độ rộng tùy biến của panel trái (mặc định 360px) */
  sidebarWidth?: number | string;
  /** Nội dung panel trái tùy biến (nếu truyền vào sẽ thay thế nội dung mẫu bên trái mà không ảnh hưởng trang khác) */
  sidebarContent?: React.ReactNode | ((helpers: PrintPreviewSidebarHelpers) => React.ReactNode);
  /** Tùy biến render Trang bìa */
  renderCoverPage?: (helpers: CoverPageHelpers) => React.ReactNode;
  /** Tên dự án (cho trang bìa và tiêu đề báo giá) */
  projectName?: string;
  /** Tên khách hàng / đơn vị nhận báo giá */
  customerName?: string;
  /** Địa chỉ khách hàng */
  customerAddress?: string;
  /** Tên công trình */
  workName?: string;
  /** Ngày ban hành (DD/MM/YYYY) */
  issueDate?: string;
  /** Ngày hết hiệu lực (DD/MM/YYYY) */
  expiryDate?: string;
  /** Nội dung tùy biến (nếu truyền vào sẽ thay thế nội dung mẫu) */
  children?: React.ReactNode | ((meta: PrintPreviewMetadata) => React.ReactNode);
  /** Có ẩn hoàn toàn panel tùy biến bên trái và nút Tùy biến hay không */
  hideSidebar?: boolean;
  /** Trạng thái hiển thị mặc định của panel tùy biến (mặc định: true) */
  defaultShowSidebar?: boolean;
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({
  isOpen,
  onClose,
  documentTitle = 'BIÊN BẢN NGHIỆM THU VÀ BÀN GIAO HỆ THỐNG CÔNG NGHỆ',
  documentCode = 'BB-2026/SKD-TECH',
  date = '29 tháng 09 năm 2026',
  department = 'Khối công nghệ và kiến trúc hệ thống',
  author = '',
  performerName: performerNameProp,
  performerRole: performerRoleProp,
  supervisorName: supervisorNameProp,
  supervisorRole: supervisorRoleProp,
  defaultPaperSize = 'A4',
  defaultOrientation = 'portrait',
  defaultMarginLeft,
  defaultMarginRight,
  defaultMarginTop,
  defaultMarginBottom,
  items,
  sidebarTitle,
  sidebarWidth,
  sidebarContent,
  renderCoverPage,
  projectName,
  customerName,
  customerAddress,
  workName,
  issueDate,
  expiryDate,
  children,
  hideSidebar = false,
  defaultShowSidebar = true,
}) => {
  const company = useCompanyInfo();
  // 1. Cấu hình trang mặc định: Khổ A4/A3, hướng dọc/ngang, lề trái và phải bằng nhau 20mm
  const [paperSize, setPaperSize] = useState<'A4' | 'A3'>(defaultPaperSize);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(defaultOrientation);
  const [marginLeft, setMarginLeft] = useState<number | ''>(defaultMarginLeft ?? 20);
  const [marginTop, setMarginTop] = useState<number | ''>(defaultMarginTop ?? 20);
  const [marginRight, setMarginRight] = useState<number | ''>(defaultMarginRight ?? 20);
  const [marginBottom, setMarginBottom] = useState<number | ''>(defaultMarginBottom ?? 20);

  // 2. Công tắc gạt "Có trang bìa"
  const [hasCoverPage, setHasCoverPage] = useState<boolean>(false);

  // 3. Tùy chọn in ấn và hiển thị
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(100);
  const [showSidebar, setShowSidebar] = useState<boolean>(hideSidebar ? false : defaultShowSidebar);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // 4. Các trường tùy biến nội dung tài liệu
  const [title, setTitle] = useState<string>(documentTitle);
  const [code, setCode] = useState<string>(documentCode);
  const [docDate, setDocDate] = useState<string>(date);
  const [dept, setDept] = useState<string>(department);
  const [performerName, setPerformerName] = useState<string>(performerNameProp !== undefined ? performerNameProp : (author !== undefined ? author : ''));
  const [performerRole, setPerformerRole] = useState<string>(performerRoleProp !== undefined ? performerRoleProp : '');
  const [supervisorName, setSupervisorName] = useState<string>(supervisorNameProp !== undefined ? supervisorNameProp : '');
  const [supervisorRole, setSupervisorRole] = useState<string>(supervisorRoleProp !== undefined ? supervisorRoleProp : '');
  const partyA = performerName;
  const partyB = supervisorName;

  const isQuotationDoc = Boolean(
    (title && title.toLowerCase().includes('báo giá')) ||
    (documentTitle && documentTitle.toLowerCase().includes('báo giá')) ||
    (code && code.toUpperCase().startsWith('BG-')) ||
    projectName !== undefined ||
    customerName !== undefined
  );

  // Cập nhật khi props thay đổi
  useEffect(() => {
    setTitle(documentTitle !== undefined ? documentTitle : '');
    setCode(documentCode !== undefined ? documentCode : '');
    setDocDate(date !== undefined ? date : '');
    setDept(department !== undefined ? department : '');
    if (performerNameProp !== undefined) setPerformerName(performerNameProp);
    else if (author !== undefined) setPerformerName(author);
    if (performerRoleProp !== undefined) setPerformerRole(performerRoleProp);
    if (supervisorNameProp !== undefined) setSupervisorName(supervisorNameProp);
    if (supervisorRoleProp !== undefined) setSupervisorRole(supervisorRoleProp);
    if (isOpen) {
      if (defaultOrientation) setOrientation(defaultOrientation);
      if (defaultPaperSize) setPaperSize(defaultPaperSize);
    }
  }, [
    isOpen,
    documentTitle,
    documentCode,
    date,
    department,
    author,
    performerNameProp,
    performerRoleProp,
    supervisorNameProp,
    supervisorRoleProp,
    defaultOrientation,
    defaultPaperSize,
  ]);

  // Phím tắt: Escape để đóng, Ctrl+P / Cmd+P để in
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lắng nghe sự kiện beforeprint để luôn đưa vị trí cuộn canvas về 0
  useEffect(() => {
    const handleBeforePrint = () => {
      const canvas = document.querySelector('.print-preview-canvas');
      if (canvas) {
        canvas.scrollTop = 0;
        canvas.scrollLeft = 0;
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, []);

  if (!isOpen) return null;

  const prepareAndPrint = (beforeAction?: () => void) => {
    // Đảm bảo cuộn về đỉnh (0, 0) trước khi in để trang 1 không bị cắt mất phần đầu
    const canvas = document.querySelector('.print-preview-canvas');
    if (canvas) {
      canvas.scrollTop = 0;
      canvas.scrollLeft = 0;
    }
    window.scrollTo(0, 0);

    if (beforeAction) {
      beforeAction();
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 60);
    });
  };

  const handlePrint = () => {
    prepareAndPrint();
  };

  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // 1. Tạm lưu và gỡ bỏ thuộc tính zoom và transform để chụp ảnh chuẩn 100%
      const wrapperEl = document.querySelector<HTMLElement>('.print-pages-wrapper');
      const originalZoom = wrapperEl?.style.zoom || '';
      if (wrapperEl) {
        wrapperEl.style.zoom = '1';
      }

      const pageElements = document.querySelectorAll<HTMLElement>('.print-paper-page');
      const originalTransforms: string[] = [];
      pageElements.forEach((el, idx) => {
        originalTransforms[idx] = el.style.transform;
        el.style.transform = 'none';
      });

      // 2. Định dạng kích thước trang theo chuẩn mm
      const isPortrait = orientation === 'portrait';
      let widthMm = 210;
      let heightMm = 297;
      if (paperSize === 'A4') {
        widthMm = isPortrait ? 210 : 297;
        heightMm = isPortrait ? 297 : 210;
      } else if (paperSize === 'A3') {
        widthMm = isPortrait ? 297 : 420;
        heightMm = isPortrait ? 420 : 297;
      }

      // Các thông số lề (mm)
      const leftMm = Number(marginLeft !== '' ? marginLeft : 30);
      const topMm = Number(marginTop !== '' ? marginTop : 20);
      const rightMm = Number(marginRight !== '' ? marginRight : 20);
      const bottomMm = Number(marginBottom !== '' ? marginBottom : 20);

      // Vùng khả dụng cho nội dung văn bản trên từng trang
      const contentWidthMm = Math.max(10, widthMm - leftMm - rightMm);
      const contentHeightMm = Math.max(10, heightMm - topMm - bottomMm);

      const pdf = new jsPDF({
        orientation: isPortrait ? 'portrait' : 'landscape',
        unit: 'mm',
        format: paperSize.toLowerCase(),
        compress: true,
      });

      let isFirstPage = true;

      // 3. Render Trang bìa nếu có (trang bìa có lề = 0 đúng quy chuẩn)
      if (hasCoverPage) {
        const coverEl = document.querySelector<HTMLElement>('.print-cover-page');
        if (coverEl) {
          const coverCanvas = await html2canvas(coverEl, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
          });

          const coverImg = coverCanvas.toDataURL('image/jpeg', 0.96);
          pdf.addImage(coverImg, 'JPEG', 0, 0, widthMm, heightMm);
          isFirstPage = false;
        }
      }

      // 4. Render Trang nội dung: Áp dụng chuẩn lề (Trái, Trên, Phải, Dưới) trên MỌI trang
      const contentEl = document.querySelector<HTMLElement>('.print-paper-content');
      if (contentEl) {
        const contentCanvas = await html2canvas(contentEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const pxPerMm = contentCanvas.width / contentWidthMm;
        const maxPageContentHeightPx = Math.floor(pxPerMm * contentHeightMm);

        const contentRect = contentEl.getBoundingClientRect();
        const domToCanvasScale = contentRect.height > 0 ? contentCanvas.height / contentRect.height : 1;

        // Các khối cần tránh cắt ngang giữa thân
        const breakElements = contentEl.querySelectorAll<HTMLElement>(
          '.print-table tr, .print-signatures, .signature-col, .print-conclusion, .party-block, .print-doc-header, .print-doc-title-box'
        );

        let sourceYPx = 0;

        while (sourceYPx < contentCanvas.height) {
          const remainingPx = contentCanvas.height - sourceYPx;
          let currentSliceHeightPx = Math.min(maxPageContentHeightPx, remainingPx);

          // Nếu phần còn lại dài hơn 1 trang, tính toán điểm cắt thông minh
          if (sourceYPx + currentSliceHeightPx < contentCanvas.height) {
            const idealBreak = sourceYPx + currentSliceHeightPx;

            for (const el of Array.from(breakElements)) {
              const rect = el.getBoundingClientRect();
              const elTop = (rect.top - contentRect.top) * domToCanvasScale;
              const elBottom = (rect.bottom - contentRect.top) * domToCanvasScale;

              if (elTop < idealBreak && elBottom > idealBreak) {
                // Nếu phần tử bắt đầu sau sourceYPx ít nhất 80px, cắt ngay trước phần tử
                if (elTop > sourceYPx + 80) {
                  currentSliceHeightPx = elTop - sourceYPx;
                  break;
                }
              }
            }
          }

          // Tạo canvas cho lát cắt của trang này
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = contentCanvas.width;
          sliceCanvas.height = currentSliceHeightPx;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(
              contentCanvas,
              0,
              sourceYPx,
              contentCanvas.width,
              currentSliceHeightPx,
              0,
              0,
              contentCanvas.width,
              currentSliceHeightPx
            );
          }

          const sliceHeightMm = currentSliceHeightPx / pxPerMm;

          // Thêm trang mới nếu không phải trang đầu tiên của file PDF
          if (!isFirstPage) {
            pdf.addPage([widthMm, heightMm], isPortrait ? 'portrait' : 'landscape');
          }

          const sliceImg = sliceCanvas.toDataURL('image/jpeg', 0.96);
          // Đặt nội dung vào đúng tọa độ căn lề (leftMm, topMm)
          pdf.addImage(sliceImg, 'JPEG', leftMm, topMm, contentWidthMm, sliceHeightMm);

          isFirstPage = false;
          sourceYPx += currentSliceHeightPx;
        }
      }

      // Khôi phục lại zoom và transform cho giao diện
      if (wrapperEl) {
        wrapperEl.style.zoom = originalZoom;
      }
      pageElements.forEach((el, idx) => {
        el.style.transform = originalTransforms[idx];
      });

      // 5. Tự động tải file PDF về máy
      const cleanFileName = `${code}_${title}`
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_');
      pdf.save(`${cleanFileName}.pdf`);
    } catch (err) {
      console.error('Lỗi xuất file PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetMargins = () => {
    setMarginLeft(defaultMarginLeft ?? 20);
    setMarginTop(defaultMarginTop ?? 20);
    setMarginRight(defaultMarginRight ?? 20);
    setMarginBottom(defaultMarginBottom ?? 20);
  };

  const handleMarginChange =
    (setter: React.Dispatch<React.SetStateAction<number | ''>>) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.trim();
        if (val === '') {
          setter('');
        } else {
          const num = parseInt(val, 10);
          if (!isNaN(num)) {
            setter(Math.max(0, Math.min(100, num)));
          }
        }
      };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 10, 60));
  const handleResetZoom = () => setScale(100);

  const defaultItems: DocumentItem[] = items || [
    {
      no: 1,
      code: 'EQ-8001',
      name: 'Máy trạm di động Apple MacBook Pro M3 Max 16"',
      spec: '16-core CPU, 40-core GPU, 64GB Unified RAM, 2TB SSD NVMe',
      unit: 'Chiếc',
      quantity: 2,
      status: 'Đạt chuẩn',
    },
    {
      no: 2,
      code: 'EQ-8002',
      name: 'Máy chủ phiến Dell PowerEdge R760 Rack Server',
      spec: 'Dual Intel Xeon Gold 6430, 256GB ECC DDR5, 8x 3.84TB SAS SSD',
      unit: 'Hệ thống',
      quantity: 1,
      status: 'Đạt chuẩn',
    },
    {
      no: 3,
      code: 'EQ-8003',
      name: 'Màn hình chuyên dụng Dell UltraSharp 32" 4K Thunderbolt',
      spec: 'IPS Black Technology, 98% DCI-P3, HDR600, Hub Thunderbolt 4',
      unit: 'Chiếc',
      quantity: 4,
      status: 'Đạt chuẩn',
    },
    {
      no: 4,
      code: 'EQ-8005',
      name: 'Thiết bị tường lửa thế hệ mới Cisco Meraki MX95',
      spec: 'Throughput 2Gbps, VPN 1Gbps, Dual 10G SFP+, High-Availability',
      unit: 'Thiết bị',
      quantity: 1,
      status: 'Đạt chuẩn',
    },
    {
      no: 5,
      code: 'EQ-8006',
      name: 'Hệ thống hội nghị truyền hình 4K Poly Studio X70',
      spec: 'Dual 4K camera lenses, AI smart tracking, Beamforming mic array',
      unit: 'Bộ',
      quantity: 1,
      status: 'Đạt chuẩn',
    },
  ];

  return createPortal(
    <div className="print-preview-backdrop">
      {/* Cấu hình @page in ấn động: Áp dụng chuẩn lề cho MỌI trang in (Trang 1, Trang 2, Trang 3...) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${paperSize} ${orientation};
                margin-top: ${marginTop !== '' ? marginTop : 20}mm !important;
                margin-right: ${marginRight !== '' ? marginRight : 20}mm !important;
                margin-bottom: ${marginBottom !== '' ? marginBottom : 20}mm !important;
                margin-left: ${marginLeft !== '' ? marginLeft : 20}mm !important;
              }
              ${hasCoverPage
              ? `
              @page :first {
                margin: 0mm !important;
              }
              `
              : ''
            }
            }
          `,
        }}
      />

      {/* 1. Header Toolbar */}
      <header className="print-preview-header">
        <div className="print-preview-header-left">
          <div className="print-preview-doc-badge">
            <FileText size={18} />
          </div>
          <div>
            <div className="print-preview-title">Xem trước bản in tài liệu</div>
            <div className="print-preview-subtitle">
              {code} • Khổ {paperSize} ({orientation === 'portrait' ? 'Dọc' : 'Ngang'}) • Lề: T{marginTop || 0}/R{marginRight || 0}/B{marginBottom || 0}/L{marginLeft || 0}mm • {hasCoverPage ? 'Có trang bìa (2 trang)' : '1 trang'}
            </div>
          </div>
        </div>

        {/* Nút điều khiển ở giữa */}
        <div className="print-preview-header-center">
          {/* Nút ẩn/hiện Panel tùy biến (chỉ hiển thị khi không bị ẩn sidebar) */}
          {!hideSidebar && (
            <button
              className={`print-toolbar-btn ${showSidebar ? 'is-active' : ''}`}
              onClick={() => setShowSidebar(!showSidebar)}
              title="Ẩn/hiện thanh công cụ tùy biến cấu hình"
            >
              <Sliders size={14} />
              <span>Tùy biến</span>
            </button>
          )}

          {/* Zoom controls */}
          <div className="print-toolbar-group">
            <button
              onClick={handleZoomOut}
              className="print-toolbar-btn"
              title="Thu nhỏ (-10%)"
              disabled={scale <= 60}
            >
              <ZoomOut size={15} />
            </button>
            <span
              onClick={handleResetZoom}
              className="print-zoom-indicator"
              title="Đặt lại 100%"
            >
              {scale}%
            </span>
            <button
              onClick={handleZoomIn}
              className="print-toolbar-btn"
              title="Phóng to (+10%)"
              disabled={scale >= 150}
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Paper Size */}
          <div className="print-toolbar-group">
            <button
              className={`print-toolbar-btn ${paperSize === 'A4' ? 'is-active' : ''}`}
              onClick={() => setPaperSize('A4')}
              title="Khổ giấy A4 (210 x 297 mm)"
            >
              A4
            </button>
            <button
              className={`print-toolbar-btn ${paperSize === 'A3' ? 'is-active' : ''}`}
              onClick={() => setPaperSize('A3')}
              title="Khổ giấy A3 (297 x 420 mm)"
            >
              A3
            </button>
          </div>

          {/* Paper orientation */}
          <div className="print-toolbar-group">
            <button
              className={`print-toolbar-btn ${orientation === 'portrait' ? 'is-active' : ''}`}
              onClick={() => setOrientation('portrait')}
              title="In khổ dọc"
            >
              Dọc
            </button>
            <button
              className={`print-toolbar-btn ${orientation === 'landscape' ? 'is-active' : ''}`}
              onClick={() => setOrientation('landscape')}
              title="In khổ ngang"
            >
              Ngang
            </button>
          </div>
        </div>

        {/* Nút hành động bên phải: Dùng component Button chuẩn */}
        <div className="print-preview-header-right">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download size={15} />}
            isLoading={isExporting}
            onClick={handleExportPdf}
            title="Tạo và tự động tải file PDF trực tiếp về máy"
          >
            {isExporting ? 'Đang tạo PDF...' : 'Xuất PDF'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Printer size={15} />}
            onClick={handlePrint}
            title="In tài liệu (Phím tắt: Ctrl + P hoặc Cmd + P)"
          >
            In tài liệu
          </Button>

          <button
            onClick={onClose}
            className="print-close-btn"
            title="Đóng cửa sổ xem trước (Phím Escape)"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* 2. Workspace Body: Left Sidebar + Canvas */}
      <div className="print-preview-workspace">
        {/* Panel tùy biến nội dung bên trái */}
        {!hideSidebar && showSidebar && (
          <aside
            className="print-preview-sidebar"
            style={sidebarWidth ? { width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth } : undefined}
          >
            {sidebarTitle !== '' && sidebarTitle !== null && (
              <div className="print-sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={16} color="var(--color-primary)" />
                  <span className="print-sidebar-title">{sidebarTitle || 'Tùy biến bản in'}</span>
                </div>
              </div>
            )}

            <div className="print-sidebar-scroll">
              {sidebarContent !== undefined ? (
                typeof sidebarContent === 'function' ? sidebarContent({
                  title, setTitle,
                  code, setCode,
                  docDate, setDocDate,
                  performerName, setPerformerName,
                  performerRole, setPerformerRole,
                  supervisorName, setSupervisorName,
                  supervisorRole, setSupervisorRole,
                  showStamp, setShowStamp,
                  showWatermark, setShowWatermark,
                  hasCoverPage, setHasCoverPage,
                  marginLeft, setMarginLeft,
                  marginTop, setMarginTop,
                  marginRight, setMarginRight,
                  marginBottom, setMarginBottom,
                }) : sidebarContent
              ) : (
                <>
              {/* KHỐI 1: CÔNG TẮC TRANG BÌA */}
              <div className="print-sidebar-section">
                <div className="print-sidebar-section-title">
                  <Book size={14} />
                  <span>Trang bìa tài liệu</span>
                </div>
                <div className="print-sidebar-toggle-card">
                  <Toggle
                    checked={hasCoverPage}
                    onChange={setHasCoverPage}
                    label="Có trang bìa"
                  />
                </div>
              </div>

              {/* KHỐI 2: CĂN LỀ TRANG NỘI DUNG */}
              <div className="print-sidebar-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div className="print-sidebar-section-title" style={{ marginBottom: 0 }}>
                    <Sliders size={14} />
                    <span>Căn lề trang in (mm)</span>
                  </div>
                  <button
                    onClick={handleResetMargins}
                    className="print-sidebar-reset-btn"
                    title="Đặt lại lề mặc định (Trái 20mm, phải 20mm, trên 20mm, dưới 20mm)"
                  >
                    <ArrowCounterclockwise size={12} />
                    <span>Mặc định</span>
                  </button>
                </div>

                <div className="print-margins-grid">
                  <div className="margin-input-box">
                    <label className="margin-label">Lề trái</label>
                    <div className="margin-input-wrapper">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={marginLeft}
                        onChange={handleMarginChange(setMarginLeft)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="margin-input is-highlight"
                      />
                      <span className="margin-unit">mm</span>
                    </div>
                  </div>

                  <div className="margin-input-box">
                    <label className="margin-label">Lề trên</label>
                    <div className="margin-input-wrapper">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={marginTop}
                        onChange={handleMarginChange(setMarginTop)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="margin-input"
                      />
                      <span className="margin-unit">mm</span>
                    </div>
                  </div>

                  <div className="margin-input-box">
                    <label className="margin-label">Lề dưới</label>
                    <div className="margin-input-wrapper">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={marginBottom}
                        onChange={handleMarginChange(setMarginBottom)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="margin-input"
                      />
                      <span className="margin-unit">mm</span>
                    </div>
                  </div>

                  <div className="margin-input-box">
                    <label className="margin-label">Lề phải</label>
                    <div className="margin-input-wrapper">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={marginRight}
                        onChange={handleMarginChange(setMarginRight)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="margin-input"
                      />
                      <span className="margin-unit">mm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI 3: THÔNG TIN VĂN BẢN */}
              <div className="print-sidebar-section">
                <div className="print-sidebar-section-title">
                  <FileText size={14} />
                  <span>Nội dung văn bản</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Input
                    label="Tiêu đề tài liệu"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề biên bản..."
                  />

                  <Input
                    label="Mã số văn bản"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Mã số lưu trữ..."
                  />

                  <Input
                    label="Ngày ban hành"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    placeholder="Ví dụ: 29 tháng 09 năm 2026"
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <Input
                      label="Người thực hiện"
                      value={performerName}
                      onChange={(e) => setPerformerName(e.target.value)}
                      placeholder="Họ tên người thực hiện..."
                    />
                    <Input
                      label="Chức vụ"
                      value={performerRole}
                      onChange={(e) => setPerformerRole(e.target.value)}
                      placeholder="Chức vụ..."
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <Input
                      label="Người giám sát"
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      placeholder="Họ tên người giám sát..."
                    />
                    <Input
                      label="Chức vụ"
                      value={supervisorRole}
                      onChange={(e) => setSupervisorRole(e.target.value)}
                      placeholder="Chức vụ..."
                    />
                  </div>
                </div>
              </div>

              {/* KHỐI 4: TÙY CHỌN DẤU MỘC VÀ BẢO MẬT */}
              <div className="print-sidebar-section">
                <div className="print-sidebar-section-title">
                  <ShieldCheck size={14} />
                  <span>Dấu mộc và bảo mật</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Toggle
                    checked={showStamp}
                    onChange={setShowStamp}
                    label="Dấu mộc đỏ và Ký số CA"
                  />

                  <Toggle
                    checked={showWatermark}
                    onChange={setShowWatermark}
                    label="Watermark bảo mật"
                  />
                </div>
              </div>
                </>
              )}
            </div>
          </aside>
        )}

        {/* 3. Vùng Canvas cuộn chứa trang in */}
        <main className="print-preview-canvas">
          <div
            className="print-pages-wrapper"
            style={{
              zoom: scale / 100,
            }}
          >
            {/* TRANG 1: TRANG BÌA (Chỉ xuất hiện khi bật Có trang bìa - Các lề bằng 0) */}
            {hasCoverPage && (
              <div
                className={`print-paper-page print-cover-page paper-${paperSize.toLowerCase()} ${orientation === 'landscape' ? 'is-landscape' : 'is-portrait'
                  }`}
                style={{
                  padding: '0mm', // LỀ BẰNG 0 ĐÚNG YÊU CẦU
                }}
              >
              {renderCoverPage ? (
                renderCoverPage({
                  company,
                  title,
                  code,
                  docDate,
                  dept,
                  partyA,
                  partyB,
                  projectName,
                  customerName,
                  customerAddress,
                  workName,
                  issueDate,
                  expiryDate,
                })
              ) : (
                <div className="print-cover-inner-border">
                  {/* Header trang bìa: Thông tin công ty */}
                  <div className="cover-header">
                    <div style={{ textTransform: 'uppercase', fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a', letterSpacing: '0.5px' }}>
                      {company.company_name || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#000000', marginTop: '3px' }}>
                      {company.address || 'Cụm 4, Xã Sơn Đồng, Huyện Hoài Đức, TP. Hà Nội, Việt Nam'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#000000', marginTop: '2px' }}>
                      Email: {company.email || 'contact@decodoor.vn'} • Website: {company.website || 'decodoor.vn'}{company.phone ? ` • Hotline: ${company.phone}` : ''}
                    </div>
                    <div style={{ width: '60px', height: '2px', background: '#0f172a', margin: '14px auto 0' }} />

                    {/* Logo chuẩn của công ty: đưa lên cao ngay dưới Header */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14mm' }}>
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={company.company_name}
                          style={{
                            height: '60px',
                            maxHeight: '60px',
                            maxWidth: '180px',
                            objectFit: 'contain',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            backgroundColor: '#1e3a8a',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '22px',
                          }}
                        >
                          DCD
                        </div>
                      )}
                    </div>

                    {/* TÀI LIỆU LƯU HÀNH NỘI BỘ thay bằng tên dự án */}
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: '#1e3a8a',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginTop: '6mm',
                      }}
                    >
                      {projectName ? `DỰ ÁN: ${projectName}` : 'TÀI LIỆU LƯU HÀNH NỘI BỘ'}
                    </div>

                    {/* Thêm thông tin công trình dưới tên dự án */}
                    {(workName || projectName || isQuotationDoc) && (
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#475569',
                          marginTop: '4px',
                        }}
                      >
                        Công trình: <span style={{ color: '#1e293b' }}>{workName || (projectName ? `Cung cấp thiết bị vệ sinh và phòng bếp Seajong - ${projectName}` : 'Cung cấp thiết bị vệ sinh và phòng bếp Seajong')}</span>
                      </div>
                    )}
                  </div>

                  {/* Phần giữa trang bìa */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '38%',
                      left: '20mm',
                      right: '20mm',
                      transform: 'translateY(-20px)',
                      textAlign: 'center',
                    }}
                  >
                    {/* Tiêu đề lớn 2 dòng: "Báo giá sản xuất" và "Số: {code}" */}
                    <div style={{ marginBottom: '20px' }}>
                      <div
                        style={{
                          fontSize: '2.5rem',
                          fontWeight: 900,
                          color: '#0f172a',
                          textTransform: 'uppercase',
                          letterSpacing: '2px',
                          lineHeight: 1.2,
                          fontFamily: "'Roboto Condensed', sans-serif",
                        }}
                      >
                        {isQuotationDoc ? 'BÁO GIÁ SẢN XUẤT' : 'BÁO CÁO'}
                      </div>
                      <div
                        style={{
                          fontSize: isQuotationDoc ? '1.35rem' : '1.5rem',
                          fontWeight: 800,
                          color: isQuotationDoc ? '#dc2626' : '#1e3a8a',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginTop: '8px',
                          lineHeight: 1.3,
                          fontFamily: "'Roboto Condensed', sans-serif",
                        }}
                      >
                        {isQuotationDoc ? (code ? `Số: ${code}` : 'BẢNG BÁO GIÁ CHI TIẾT') : 'PHÂN TÍCH TÍNH KHẢ THI CỦA GÓI THẦU'}
                      </div>
                    </div>

                    {/* Thêm thông tin khách hàng */}
                    {(customerName || isQuotationDoc) && (
                      <div
                        style={{
                          marginTop: '20px',
                          backgroundColor: '#f8fafc',
                          padding: '16px 28px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          display: 'inline-block',
                          minWidth: '360px',
                          maxWidth: '90%',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: '#64748b',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '4px',
                          }}
                        >
                          Khách hàng / Đơn vị nhận báo giá
                        </div>
                        <div
                          style={{
                            fontSize: '1.15rem',
                            fontWeight: 800,
                            color: '#1e3a8a',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            lineHeight: 1.35,
                          }}
                        >
                          {customerName || 'Quý Khách Hàng'}
                        </div>
                        {customerAddress && (
                          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '6px', fontWeight: 500 }}>
                            Địa chỉ: {customerAddress}
                          </div>
                        )}
                      </div>
                    )}

                    {!isQuotationDoc && code && (
                      <div className="cover-code-badge" style={{ marginTop: '8px' }}>
                        MÃ LƯU TRỮ: {code}
                      </div>
                    )}
                  </div>

                  {/* Footer trang bìa */}
                  <div className="cover-footer">
                    <div className="cover-location">HÀ NỘI - NĂM {new Date().getFullYear()}</div>
                    <div className="cover-copyright" style={{ fontSize: '0.76rem', color: '#334155', marginTop: '5px', fontStyle: 'italic' }}>
                      {isQuotationDoc ? (
                        `Báo giá được ban hành vào ngày ${issueDate || docDate} và có hiệu lực đến hết ngày ${expiryDate || ''}`
                      ) : (
                        `Bản quyền thuộc ${company.company_name}. Nghiêm cấm sao chép và phát hành ngoài nội bộ.`
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

            {/* TRANG NỘI DUNG VĂN BẢN (Trang 1 nếu không có trang bìa, hoặc Trang 2 nếu có trang bìa) */}
            <div
              className={`print-paper-page print-content-page paper-${paperSize.toLowerCase()} ${orientation === 'landscape' ? 'is-landscape' : 'is-portrait'
                }`}
              style={{
                // CĂN LỀ THEO CẤU HÌNH (Mặc định: Lề trái 30mm, Trên 20mm, Dưới 20mm, Phải 20mm)
                paddingTop: `${marginTop || 0}mm`,
                paddingRight: `${marginRight || 0}mm`,
                paddingBottom: `${marginBottom || 0}mm`,
                paddingLeft: `${marginLeft || 0}mm`,
              }}
            >
            {/* Nội dung thực tế của trang in */}
            <div className="print-paper-content">
              {/* Watermark bảo mật nếu được bật */}
              {showWatermark && (
                <div className="print-paper-watermark">
                  BẢN GỐC NỘI BỘ • decodoor ENTERPRISE • CHÍNH THỨC
                </div>
              )}
              {typeof children === 'function' ? (
                children({
                  title,
                  code,
                  docDate,
                  performerName,
                  performerRole,
                  supervisorName,
                  supervisorRole,
                  dept,
                  partyA,
                  partyB,
                  showStamp,
                  showWatermark,
                })
              ) : children ? (
                children
              ) : (
                <>
                  {/* 1. Quốc hiệu tiêu ngữ và Thông tin doanh nghiệp */}
                  <div className="print-doc-header">
                    <div className="print-doc-header-left">
                      <div className="print-company-name">TẬP ĐOÀN CÔNG NGHỆ decodoor</div>
                      <div className="print-company-branch">HỆ ĐIỀU HÀNH DOANH NGHIỆP decodoor ERP</div>
                      <div className="print-company-sub">Số: {code}</div>
                    </div>

                    <div className="print-doc-header-right">
                      <div className="print-republic">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="print-motto">Độc lập - Tự do - Hạnh phúc</div>
                      <div className="print-doc-date">Hà Nội, ngày {docDate}</div>
                    </div>
                  </div>

                  {/* 2. Tiêu đề văn bản */}
                  <div className="print-doc-title-box">
                    <h1 className="print-doc-title">{title}</h1>
                    <div className="print-doc-subtitle">
                      (V/v Bàn giao và nghiệm thu cơ sở vật chất hạ tầng CNTT quý 3/2026)
                    </div>
                  </div>

                  {/* 3. Căn cứ và Thông tin các bên tham gia */}
                  <div className="print-doc-body">
                    <div className="print-doc-legal">
                      <p><em>- Căn cứ Hợp đồng số 108/2026/HĐ-DCD ký ngày 15/01/2026 giữa Ban điều hành và Khối công nghệ;</em></p>
                      <p><em>- Căn cứ Kế hoạch nâng cấp hạ tầng số và chuyển đổi đám mây decodoor Cloud Private 2026-2027;</em></p>
                      <p><em>- Căn cứ Biên bản kiểm thử an ninh bảo mật và tiêu chuẩn SLA hệ thống ngày 28/09/2026;</em></p>
                    </div>

                    <p style={{ marginTop: '12px', fontWeight: 600 }}>
                      Hôm nay, ngày {docDate}, tại Trụ sở chính Tập đoàn decodoor, chúng tôi gồm có:
                    </p>

                    <div className="print-doc-parties">
                      <div className="party-block">
                        <div className="party-title">ĐẠI DIỆN BÊN GIAO (BÊN A): BAN ĐIỀU HÀNH VÀ MUA SẮM TẬP ĐOÀN</div>
                        <div className="party-row"><span>Ông/Bà:</span> <strong>{partyA}</strong> - Chức vụ: <strong>Tổng giám đốc (CEO)</strong></div>
                        <div className="party-row"><span>Phòng ban:</span> Ban điều hành doanh nghiệp decodoor</div>
                      </div>

                      <div className="party-block">
                        <div className="party-title">ĐẠI DIỆN BÊN NHẬN (BÊN B): ĐƠN VỊ TIẾP NHẬN VÀ QUẢN LÝ VẬN HÀNH</div>
                        <div className="party-row"><span>Ông/Bà:</span> <strong>{partyB}</strong> - Chức vụ: <strong>Giám đốc công nghệ và kiến trúc</strong></div>
                        <div className="party-row"><span>Phòng ban:</span> {dept}</div>
                      </div>
                    </div>

                    <p style={{ marginTop: '14px' }}>
                      Hai bên thống nhất tiến hành lập biên bản bàn giao, nghiệm thu trang thiết bị phần cứng công nghệ phục vụ vận hành với danh mục chi tiết sau:
                    </p>

                    {/* 4. Bảng danh mục thiết bị bàn giao */}
                    <table className="print-table">
                      <thead>
                        <tr>
                          <th style={{ width: '38px', textAlign: 'center' }}>STT</th>
                          <th style={{ width: '75px' }}>Mã tài sản</th>
                          <th>Tên thiết bị và cấu hình kỹ thuật</th>
                          <th style={{ width: '45px', textAlign: 'center' }}>ĐVT</th>
                          <th style={{ width: '45px', textAlign: 'center' }}>SL</th>
                          <th style={{ width: '90px', textAlign: 'center' }}>Tình trạng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defaultItems.map((item) => (
                          <tr key={item.code}>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.no}</td>
                            <td style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700 }}>{item.code}</td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{item.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#000000', marginTop: '2px' }}>{item.spec}</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>{item.unit}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="print-status-tag">{item.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* 5. Kết luận nghiệm thu */}
                    <div className="print-conclusion">
                      <div style={{ fontWeight: 700, marginBottom: '4px' }}>KẾT LUẬN NGHIỆM THU:</div>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.5 }}>
                        <li>Toàn bộ thiết bị bàn giao mới 100%, nguyên tem niêm phong, đầy đủ giấy tờ chứng nhận xuất xứ (CO) và chất lượng (CQ).</li>
                        <li>Hệ thống đã trải qua 72 giờ vận hành thử nghiệm chịu tải đạt chuẩn SLA 99.9%, sẵn sàng đưa vào vận hành sản xuất thực tế.</li>
                        <li>Biên bản được lập thành 04 bản có giá trị pháp lý như nhau, mỗi bên giữ 02 bản để làm thủ tục quyết toán và lưu trữ hồ sơ tài sản.</li>
                      </ul>
                    </div>

                    {/* 6. Phần chữ ký và dấu mộc */}
                    <div className="print-signatures">
                      <div className="signature-col">
                        <div className="sig-role">ĐẠI DIỆN BÊN GIAO (BÊN A)</div>
                        <div className="sig-sub">(Ký, ghi rõ họ tên và đóng dấu)</div>

                        <div className="sig-box">
                          {showStamp && (
                            <div className="seal-container">
                              <div className="seal-circle">
                                <div className="seal-star">★ ★ ★</div>
                                <div className="seal-org">CÔNG TY CP TẬP ĐOÀN decodoor</div>
                                <div className="seal-center">ĐÃ DUYỆT</div>
                                <div className="seal-sub">TP. HÀ NỘI</div>
                              </div>
                              <div className="sig-handwritten">{partyA}</div>
                            </div>
                          )}
                          <div className="sig-name">{partyA}</div>
                          <div className="sig-title">Tổng giám đốc</div>
                        </div>
                      </div>

                      <div className="signature-col">
                        <div className="sig-role">ĐẠI DIỆN BÊN NHẬN (BÊN B)</div>
                        <div className="sig-sub">(Ký, ghi rõ họ tên)</div>

                        <div className="sig-box">
                          {showStamp && (
                            <div className="seal-container">
                              <div className="digital-sign-tag">
                                <ShieldCheck size={14} color="#059669" />
                                <span>KÝ SỐ CA: 29/09/2026 08:45</span>
                              </div>
                              <div className="sig-handwritten" style={{ transform: 'rotate(-3deg)' }}>
                                {partyB}
                              </div>
                            </div>
                          )}
                          <div className="sig-name">{partyB}</div>
                          <div className="sig-title">Giám đốc công nghệ</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>,
    document.body
  );
};
