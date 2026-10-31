import React, { useState, useEffect } from 'react';
import { BoxSeam } from 'react-bootstrap-icons';
import { PrintPreviewModal, printDocumentById } from './PrintPreviewModal';

export interface PrintLabelItem {
  name: string;
  code?: string | null;
  model?: string | null;
  chatLieu?: string | null;
  color?: string | null;
  giaBan?: number | null;
  imageUrl?: string | null;
  specLines?: string[];
  warranty?: string | null;
  origin?: string | null;
  brand?: string | null;
  categoryName?: string | null;
  donVi?: string | null;
}

export interface PrintLabelModalProps {
  open: boolean;
  onClose: () => void;
  items: PrintLabelItem[];
  variant?: 'label' | 'stamp';
}

function extractModelCode(item: PrintLabelItem): string {
  if (item.code && item.code.trim() && item.code.trim() !== 'N/A' && !/\s/.test(item.code.trim())) {
    return item.code.trim().toUpperCase();
  }
  if (item.name) {
    const match = item.name.trim().match(/([A-Za-z0-9]+-[A-Za-z0-9-]+|[A-Za-z]{2,}\d+[A-Za-z0-9-]*)$/);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  if (item.code && item.code.trim() && item.code.trim() !== 'N/A') {
    return item.code.trim().toUpperCase();
  }
  if (item.model && item.model.trim() && item.model.trim() !== 'N/A') {
    return item.model.trim().toUpperCase();
  }
  return 'N/A';
}

function getFallbackSpecLines(item: PrintLabelItem, modelCode: string): [string, string] {
  if (Array.isArray(item.specLines) && item.specLines.length >= 2) {
    return [item.specLines[0], item.specLines[1]];
  }
  if (Array.isArray(item.specLines) && item.specLines.length === 1) {
    return [item.specLines[0], `Mã định danh: ${modelCode}`];
  }
  const parts: string[] = [];
  if (item.model && item.model.trim() && item.model.trim().toUpperCase() !== modelCode) {
    parts.push(`Kiểu loại: ${item.model.trim()}`);
  }
  if (item.categoryName && item.categoryName.trim()) {
    parts.push(`Nhóm hàng: ${item.categoryName.trim()}`);
  }
  if (item.color && item.color.trim()) {
    parts.push(`Màu sắc: ${item.color.trim()}`);
  }
  if (item.donVi && item.donVi.trim()) {
    parts.push(`Đơn vị tính: ${item.donVi.trim()}`);
  }
  if (item.brand && item.brand.trim()) {
    parts.push(`Thương hiệu: ${item.brand.trim()}`);
  }
  if (parts.length >= 2) {
    return [parts[0], parts.slice(1, 3).join(' • ')];
  }
  if (parts.length === 1) {
    return [parts[0], `Mã định danh: ${modelCode}`];
  }
  return [`Mã định danh: ${modelCode}`, 'Đạt tiêu chuẩn kỹ thuật nhà máy Seajong'];
}

function normalizeLabelImageUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '[]' || trimmed === 'null' || trimmed === 'undefined') return null;
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed[0].trim() || null;
      }
      return null;
    } catch {
      return null;
    }
  }
  return trimmed;
}

export function PrintLabelModal({
  open,
  onClose,
  items,
  variant = 'label',
}: PrintLabelModalProps) {
  const isStamp = variant === 'stamp';
  const [hidePrice, setHidePrice] = useState(true);
  const [selectedItemIndexesForPrint, setSelectedItemIndexesForPrint] = useState<number[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<number, number | ''>>({});
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [enrichedItems, setEnrichedItems] = useState<PrintLabelItem[]>(items);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setFailedImages(new Set());
      setEnrichedItems(items);
      setSelectedItemIndexesForPrint(items.map((_, idx) => idx));
      const initialQty: Record<number, number | ''> = {};
      items.forEach((_, idx) => {
        initialQty[idx] = isStamp ? 1 : items.length === 1 ? 9 : 3;
      });
      setPrintQuantities(initialQty);

      if (items.length > 0) {
        fetch('/api/logistics/product-label-specs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success && Array.isArray(data.items) && data.items.length === items.length) {
              setEnrichedItems(data.items);
            }
            if (data?.companyInfo) {
              setCompanyInfo(data.companyInfo);
            }
          })
          .catch(() => {});
      }

      fetch('/api/company')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.name) setCompanyInfo(data);
        })
        .catch(() => {
          setCompanyInfo((prev: any) =>
            prev || {
              name: 'Công ty cổ phần Seajong Việt Nam',
              address: 'LK7D4 KĐT Cầu Diễn, Phú Diễn, TP Hà Nội',
              phone: '1900.633.862',
              website: 'https://seajong.com/',
            }
          );
        });
    }
  }, [open, items, isStamp]);

  if (!open) return null;

  const displayItems = enrichedItems.length === items.length ? enrichedItems : items;

  const stampPrintCss = `
    html, body {
      width: 80mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    .thermal-roll-wrapper {
      display: block !important;
      width: 80mm !important;
      margin: 0 !important;
      padding: 0 !important;
      zoom: 1 !important;
    }
    .thermal-roll-strip {
      display: block !important;
      width: 80mm !important;
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    .thermal-stamp-cell {
      width: 80mm !important;
      height: 60mm !important;
      padding: 1.5mm !important;
      margin: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      box-sizing: border-box !important;
      page-break-after: always !important;
      break-after: page !important;
      overflow: hidden !important;
    }
    .thermal-stamp-cell:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .no-print {
      display: none !important;
    }
  `;

  return (
    <PrintPreviewModal
      title={isStamp ? 'Xem trước in tem sản phẩm' : 'Xem trước nhãn in tem sản phẩm'}
      subtitle={isStamp ? 'Máy in nhiệt XP-H500E • Khổ tem: 80 × 60 mm' : undefined}
      onClose={onClose}
      documentId="print-label-content"
      printOrientation="landscape"
      printMargins={isStamp ? '0' : '1cm'}
      actions={
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          onClick={() => {
            if (isStamp) {
              printDocumentById(
                'print-label-content',
                'landscape',
                'In tem Seajong - XP-H500E (80x60mm)',
                false,
                '0',
                '80mm 60mm',
                stampPrintCss
              );
            } else {
              printDocumentById('print-label-content', 'landscape', 'In nhãn Seajong', true, '0');
            }
          }}
        >
          <i className="bi bi-printer" />
          <span>{isStamp ? 'In tem' : 'In tem nhãn'}</span>
        </button>
      }
      sidebar={
        <div className="p-0 border-r border-slate-200 flex flex-col h-full w-[340px] bg-white">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50">
            <h6 className="font-bold text-xs text-slate-800 mb-2">
              {isStamp ? 'Chọn hàng hoá để in tem' : 'Chọn hàng hoá để in nhãn'}
            </h6>
            {isStamp ? (
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <i className="bi bi-printer text-blue-600" />
                <span>Máy in: <b>XP-H500E</b> • Khổ giấy: <b>80 × 60 mm</b></span>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  id="hidePriceSwitch"
                  checked={hidePrice}
                  onChange={(e) => setHidePrice(e.target.checked)}
                />
                <span className="text-xs text-slate-600 font-medium">
                  Ẩn giá bán trên tem nhãn (***)
                </span>
              </label>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-center w-10">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded text-blue-600"
                      checked={selectedItemIndexesForPrint.length === displayItems.length && displayItems.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItemIndexesForPrint(displayItems.map((_, idx) => idx));
                        } else {
                          setSelectedItemIndexesForPrint([]);
                        }
                      }}
                    />
                  </th>
                  <th className="p-2.5">Mã / Tên SP</th>
                  <th className="p-2.5 text-center w-20">SL in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayItems.map((it, idx) => {
                  const modelCode = extractModelCode(it);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded text-blue-600"
                          checked={selectedItemIndexesForPrint.includes(idx)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItemIndexesForPrint((prev) => [...prev, idx]);
                              setPrintQuantities((prev) => ({
                                ...prev,
                                [idx]: prev[idx] || (isStamp ? 1 : 3),
                              }));
                            } else {
                              setSelectedItemIndexesForPrint((prev) => prev.filter((i) => i !== idx));
                            }
                          }}
                        />
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-800 truncate max-w-[180px]" title={it.name}>
                          {it.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{modelCode}</div>
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          className="w-14 px-1.5 py-1 text-center border border-slate-200 rounded-lg text-xs"
                          value={printQuantities[idx] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPrintQuantities((prev) => ({ ...prev, [idx]: val === '' ? '' : Number(val) }));
                          }}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (!val || val <= 0) {
                              setPrintQuantities((prev) => ({ ...prev, [idx]: isStamp ? 1 : 3 }));
                            } else if (!isStamp) {
                              setPrintQuantities((prev) => ({ ...prev, [idx]: Math.ceil(val / 3) * 3 }));
                            } else {
                              setPrintQuantities((prev) => ({ ...prev, [idx]: Math.round(val) }));
                            }
                          }}
                          disabled={!selectedItemIndexesForPrint.includes(idx)}
                          min={isStamp ? 1 : 3}
                          step={isStamp ? 1 : 3}
                        />
                      </td>
                    </tr>
                  );
                })}
                {displayItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-400 py-6">
                      Chưa có hàng hoá nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      }
      document={
        <div id="print-label-content">
          {(() => {
            const selectedItems: PrintLabelItem[] = [];
            displayItems.forEach((it, idx) => {
              if (selectedItemIndexesForPrint.includes(idx)) {
                const defaultQty = isStamp ? 1 : 3;
                const qty =
                  typeof printQuantities[idx] === 'number' && (printQuantities[idx] as number) > 0
                    ? (printQuantities[idx] as number)
                    : defaultQty;
                for (let i = 0; i < qty; i++) {
                  selectedItems.push(it);
                }
              }
            });

            if (isStamp) {
              const tdLabelStyle: React.CSSProperties = {
                border: '1px solid #000',
                padding: '1.5px 4.5px',
                fontWeight: 700,
                fontSize: 9,
                lineHeight: 1.12,
                color: '#000',
                width: '33%',
                verticalAlign: 'middle',
              };
              const tdValueStyle: React.CSSProperties = {
                border: '1px solid #000',
                padding: '1.5px 4.5px',
                fontWeight: 400,
                fontSize: 9,
                lineHeight: 1.12,
                color: '#000',
                width: '67%',
                verticalAlign: 'middle',
              };

              const companyName = companyInfo?.name || 'Công ty cổ phần Seajong Việt Nam';
              const rawAddress = companyInfo?.address
                ? String(companyInfo.address).replace(/KHu/g, 'Khu').replace(/, Việt Nam$/i, '')
                : 'LK7D4 KĐT Cầu Diễn, Phú Diễn, TP Hà Nội';

              return (
                <div
                  className="thermal-roll-wrapper"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    margin: '0 auto',
                    zoom: 1.45,
                  }}
                >
                  <div
                    className="no-print"
                    style={{
                      marginBottom: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#475569',
                      background: '#fff',
                      padding: '4px 12px',
                      borderRadius: 999,
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    Cuộn giấy in nhiệt 1 tem/hàng • Kích thước dài × rộng: 80 × 60 mm ({selectedItems.length} tem)
                  </div>

                  <div
                    className="thermal-roll-strip"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3.5mm',
                      padding: '4mm 3mm',
                      background: '#dbeafe',
                      borderLeft: '1.5px dashed #93c5fd',
                      borderRight: '1.5px dashed #93c5fd',
                      borderRadius: 6,
                      boxShadow: '0 6px 20px rgba(15, 23, 42, 0.14)',
                    }}
                  >
                    {selectedItems.length === 0 ? (
                      <div
                        className="no-print"
                        style={{
                          width: '80mm',
                          height: '60mm',
                          background: '#fff',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                          fontSize: 11,
                        }}
                      >
                        Chưa chọn hàng hoá để in tem
                      </div>
                    ) : (
                      selectedItems.map((item, stampIdx) => {
                        const modelCode = extractModelCode(item);
                        const [specLine1, specLine2] = getFallbackSpecLines(item, modelCode);
                        return (
                          <div
                            key={stampIdx}
                            className="thermal-stamp-cell"
                            style={{
                              width: '80mm',
                              height: '60mm',
                              padding: '1.5mm',
                              boxSizing: 'border-box',
                              background: '#fff',
                              borderRadius: '1.5mm',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact',
                            }}
                          >
                            <table
                              style={{
                                width: '100%',
                                height: '100%',
                                borderCollapse: 'collapse',
                                tableLayout: 'fixed',
                                border: '1.5px solid #000',
                                background: '#fff',
                                color: '#000',
                                fontFamily: 'Arial, Helvetica, sans-serif',
                              }}
                            >
                              <tbody>
                                <tr>
                                  <td
                                    colSpan={2}
                                    style={{
                                      border: '1px solid #000',
                                      padding: '2px 5px',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      fontSize: 12.5,
                                      lineHeight: 1.12,
                                      textTransform: 'uppercase',
                                      color: '#000',
                                    }}
                                  >
                                    MODEL: {modelCode}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={tdLabelStyle}>Tên sản phẩm:</td>
                                  <td style={tdValueStyle}>{item.name || 'Sản phẩm Seajong'}</td>
                                </tr>
                                <tr>
                                  <td style={tdLabelStyle}>Chất liệu:</td>
                                  <td style={tdValueStyle}>
                                    {item.chatLieu || 'Theo tiêu chuẩn nhà sản xuất'}
                                  </td>
                                </tr>
                                <tr>
                                  <td rowSpan={2} style={tdLabelStyle}>
                                    Thông số kỹ thuật
                                  </td>
                                  <td style={tdValueStyle}>{specLine1}</td>
                                </tr>
                                <tr>
                                  <td style={tdValueStyle}>{specLine2}</td>
                                </tr>
                                <tr>
                                  <td style={tdLabelStyle}>NK và lắp ráp bởi</td>
                                  <td style={tdValueStyle}>{companyName}</td>
                                </tr>
                                <tr>
                                  <td style={tdLabelStyle}>Địa chỉ:</td>
                                  <td style={tdValueStyle}>{rawAddress}</td>
                                </tr>
                                <tr>
                                  <td style={tdLabelStyle}>Xuất xứ:</td>
                                  <td style={tdValueStyle}>{item.origin || 'Trung Quốc'}</td>
                                </tr>
                                <tr>
                                  <td style={tdLabelStyle}>Bảo Hành:</td>
                                  <td style={tdValueStyle}>{item.warranty || 'Theo tiêu chuẩn NSX'}</td>
                                </tr>
                                <tr>
                                  <td style={tdLabelStyle}>Hướng dẫn sử dụng:</td>
                                  <td style={tdValueStyle}>Làm theo hướng dẫn lắp đặt đi kèm</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            }

            const totalPages = Math.max(1, Math.ceil(selectedItems.length / 9));

            return Array.from({ length: totalPages }).map((_, pageIndex) => (
              <div
                key={pageIndex}
                style={{
                  width: '297mm',
                  height: '209mm',
                  padding: '10mm',
                  background: '#fff',
                  margin: '0 auto',
                  boxSizing: 'border-box',
                  pageBreakAfter: 'always',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', height: '189mm', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <tbody>
                    {[...Array(3)].map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {[...Array(3)].map((_, colIndex) => {
                          const itemIdx = pageIndex * 9 + rowIndex * 3 + colIndex;
                          const item = selectedItems[itemIdx];
                          if (!item) {
                            return <td key={colIndex} style={{ width: '33.33%', height: '63mm', padding: '4px' }} />;
                          }

                          const searchQuery = encodeURIComponent(item.name || item.code || '');
                          const qrData = encodeURIComponent(`https://seajong.com/?s=${searchQuery}&post_type=product`);

                          return (
                            <td key={colIndex} style={{ width: '33.33%', height: '63mm', padding: '4px' }}>
                              <div
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  border: '1px solid #ddd',
                                }}
                              >
                                {/* Header */}
                                <div
                                  style={{
                                    background: '#2B3D6B',
                                    color: 'white',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '4px 8px',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      background: '#fff',
                                      borderRadius: 4,
                                      padding: '0 4px',
                                      height: 22,
                                    }}
                                  >
                                    <span style={{ fontSize: 11, fontWeight: 900, color: '#2B3D6B' }}>SEAJONG</span>
                                  </div>
                                  <div style={{ fontSize: 9, fontWeight: 700 }}>KOREAN TECHNOLOGY</div>
                                </div>

                                {/* Body */}
                                <div style={{ display: 'flex', flex: 1, padding: '8px', gap: '8px', background: '#fff' }}>
                                  {/* Product Image */}
                                  <div
                                    style={{
                                      width: '25%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {(() => {
                                      const validImgUrl = normalizeLabelImageUrl(item.imageUrl);
                                      const hasValidImage = Boolean(validImgUrl && !failedImages.has(validImgUrl));

                                      return hasValidImage && validImgUrl ? (
                                        <div
                                          style={{
                                            width: '100%',
                                            aspectRatio: '1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#fff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 6,
                                            padding: 4,
                                            boxSizing: 'border-box',
                                            overflow: 'hidden',
                                          }}
                                        >
                                          <img
                                            src={validImgUrl}
                                            style={{
                                              maxWidth: '100%',
                                              maxHeight: '100%',
                                              objectFit: 'contain',
                                              mixBlendMode: 'multiply',
                                            }}
                                            alt=""
                                            onError={() => {
                                              setFailedImages((prev) => new Set(prev).add(validImgUrl));
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            width: '100%',
                                            aspectRatio: '1',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 3,
                                            background: '#f8fafc',
                                            border: '1px dashed #cbd5e1',
                                            borderRadius: 6,
                                            color: '#94a3b8',
                                            padding: 4,
                                            boxSizing: 'border-box',
                                          }}
                                        >
                                          <BoxSeam size={22} color="#94a3b8" />
                                          <span
                                            style={{
                                              fontSize: 8.5,
                                              fontWeight: 600,
                                              color: '#94a3b8',
                                              textAlign: 'center',
                                              lineHeight: 1.15,
                                            }}
                                          >
                                            Chưa có ảnh
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Details */}
                                  <div
                                    style={{
                                      flex: 1,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'center',
                                      fontSize: 11,
                                    }}
                                  >
                                    <div
                                      style={{
                                        color: '#2B3D6B',
                                        fontSize: 12,
                                        fontWeight: 800,
                                        marginBottom: 4,
                                        textTransform: 'uppercase',
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {item.name || 'Sản phẩm Seajong'}
                                    </div>
                                    <div style={{ marginTop: 2 }}>
                                      Mã SP: <b style={{ fontSize: 12 }}>{extractModelCode(item)}</b>
                                    </div>
                                    <div style={{ marginTop: 2 }}>
                                      Màu: <b>{item.color || 'N/A'}</b>
                                    </div>
                                    <div style={{ marginTop: 2 }}>
                                      Giá:{' '}
                                      <b>
                                        {hidePrice
                                          ? '***'
                                          : item.giaBan
                                          ? `${item.giaBan.toLocaleString('vi-VN')} đ`
                                          : 'N/A'}
                                      </b>
                                    </div>
                                    <div style={{ marginTop: 2 }}>
                                      Bảo hành đến: <b>{item.warranty || '5 năm'}</b>
                                    </div>
                                  </div>

                                  {/* QR Code */}
                                  <div
                                    style={{
                                      width: '22%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <img
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}`}
                                      style={{ maxWidth: '100%', maxHeight: '100%' }}
                                      alt="qr"
                                    />
                                  </div>
                                </div>

                                {/* Footer */}
                                <div
                                  style={{
                                    background: '#2B3D6B',
                                    color: 'white',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '4px 8px',
                                    fontSize: 10,
                                  }}
                                >
                                  <div>
                                    <i className="bi bi-globe" style={{ marginRight: 4 }} />{' '}
                                    {companyInfo?.website || 'https://seajong.com/'}
                                  </div>
                                  <div>
                                    <i className="bi bi-telephone-fill" style={{ marginRight: 4 }} />{' '}
                                    {companyInfo?.phone || '1900.633.862'}
                                  </div>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ));
          })()}
        </div>
      }
    />
  );
}

export default PrintLabelModal;
