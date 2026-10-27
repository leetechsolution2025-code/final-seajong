import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const GOOGLE_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Roboto+Condensed:wght@300;400;700&display=swap';

/**
 * In nội dung của element #documentId bằng cách copy innerHTML vào iframe ẩn
 */
export function printDocumentById(
  documentId: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  title?: string,
  keepFirstPageMargin: boolean = true,
  customMargins?: string
) {
  const docEl = globalThis.document?.getElementById(documentId);
  if (!docEl) {
    globalThis.window?.print();
    return;
  }

  const iframe = globalThis.document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;';
  globalThis.document.body.appendChild(iframe);

  const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iDoc) {
    globalThis.window?.print();
    return;
  }

  const printMargin = customMargins || (orientation === 'landscape' ? '15mm' : '15mm 15mm 15mm 20mm');

  iDoc.open();
  iDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <base href="${globalThis.window.location.href}">
  <title>${title ?? 'In tài liệu Seajong'}</title>
  <link rel="stylesheet" href="${GOOGLE_FONT_URL}">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <style>
    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    th {
      background-color: #003087 !important;
      color: #fff !important;
    }
    .pdf-brand-bg {
      background-color: #003087 !important;
      color: #fff !important;
    }
    .pdf-brand-light-bg {
      background-color: rgba(0, 48, 135, 0.05) !important;
      color: #003087 !important;
    }
    .zebra-stripe {
      background-color: #f8fafc !important;
    }
    @page { 
      size: A4 ${orientation}; 
      margin: ${printMargin} !important; 
    }
    @page :first {
      margin: ${keepFirstPageMargin ? printMargin : '0'} !important;
    }
    body { 
      margin: 0; padding: 0; 
      font-family: 'Roboto Condensed', 'Arial Narrow', sans-serif; 
      font-size: 13px; color: #000; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
      background: #fff;
    }
    .pdf-content-page { 
      margin: 0 !important; 
      width: auto; 
      min-height: auto !important; 
      padding: 0 !important;
      page-break-after: always;
      position: relative;
      overflow: visible;
      background: #ffffff !important;
    }
    .pdf-content-page:last-child { page-break-after: auto !important; }
    .preview-scale-wrapper { transform: none !important; width: 100% !important; margin: 0 !important; }
    img { max-width: 100%; display: block; }
    table { border-collapse: collapse; width: 100%; }
    thead { display: table-header-group !important; }
    tr { page-break-inside: avoid !important; }
    .no-print { display: none !important; }
  </style>
</head>
<body>${docEl.innerHTML}</body>
</html>`);
  iDoc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 2000);
  }, 700);
}

export interface PrintPreviewModalProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  sidebar?: React.ReactNode;
  document: React.ReactNode;
  onClose: () => void;
  documentId?: string;
  printOrientation?: 'portrait' | 'landscape';
  keepFirstPageMargin?: boolean;
  printMargins?: string;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  title,
  subtitle,
  actions,
  sidebar,
  document: documentContent,
  onClose,
  documentId = 'print-doc',
  printOrientation = 'portrait',
  keepFirstPageMargin = true,
  printMargins,
}) => {
  const [mounted, setMounted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  const isLandscape = printOrientation === 'landscape';
  const pageWidth = isLandscape ? '1123px' : '794px';
  const pageHeight = isLandscape ? '794px' : '1123px';

  const modalNode = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/90 backdrop-blur-sm overflow-hidden text-slate-800">
      {/* ── TOPBAR ────────────────────────────────────────────────────────── */}
      <header className="h-14 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-center shrink-0">
            <i className="bi bi-printer-fill text-base" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate leading-snug">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 truncate leading-none">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {sidebar && (
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                showSidebar
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <i className="bi bi-sliders text-xs" />
              <span>{showSidebar ? 'Ẩn chữ ký' : 'Chữ ký & cài đặt'}</span>
            </button>
          )}

          {actions}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 flex items-center justify-center transition-colors text-sm"
            title="Đóng xem trước"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      </header>

      {/* ── MAIN BODY: SIDEBAR + PREVIEW ──────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* SIDEBAR TÙY CHỌN & CHỮ KÝ */}
        {sidebar && showSidebar && (
          <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto p-4 gap-4 shadow-sm z-10 animate-fade-in">
            {sidebar}
          </aside>
        )}

        {/* DOCUMENT PREVIEW CONTAINER */}
        <main className="flex-1 overflow-y-auto bg-slate-200/80 p-6 flex justify-center">
          <div
            id={documentId}
            className="preview-scale-wrapper flex flex-col gap-6"
            style={{ width: pageWidth, maxWidth: '100%' }}
          >
            {documentContent}
          </div>
        </main>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
