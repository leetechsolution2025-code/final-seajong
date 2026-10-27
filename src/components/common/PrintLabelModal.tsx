import React, { useState, useEffect } from 'react';
import { PrintPreviewModal, printDocumentById } from './PrintPreviewModal';

export interface PrintLabelItem {
  name: string;
  code?: string | null;
  color?: string | null;
  giaBan?: number | null;
  imageUrl?: string | null;
}

export interface PrintLabelModalProps {
  open: boolean;
  onClose: () => void;
  items: PrintLabelItem[];
}

export function PrintLabelModal({ open, onClose, items }: PrintLabelModalProps) {
  const [hidePrice, setHidePrice] = useState(true);
  const [selectedItemIndexesForPrint, setSelectedItemIndexesForPrint] = useState<number[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<number, number | ''>>({});
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    if (open) {
      setSelectedItemIndexesForPrint(items.map((_, idx) => idx));
      const initialQty: Record<number, number | ''> = {};
      items.forEach((_, idx) => {
        initialQty[idx] = items.length === 1 ? 9 : 3;
      });
      setPrintQuantities(initialQty);

      fetch('/api/company')
        .then((res) => res.json())
        .then((data) => setCompanyInfo(data))
        .catch(() => {
          setCompanyInfo({
            name: 'CÔNG TY CỔ PHẦN SEAJONG',
            phone: '1900.633.862',
            website: 'https://seajong.com/',
          });
        });
    }
  }, [open, items]);

  if (!open) return null;

  return (
    <PrintPreviewModal
      title="Xem trước nhãn in tem sản phẩm"
      onClose={onClose}
      documentId="print-label-content"
      printOrientation="landscape"
      printMargins="1cm"
      actions={
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          onClick={() => printDocumentById('print-label-content', 'landscape', 'In nhãn Seajong', true, '0')}
        >
          <i className="bi bi-printer" />
          <span>In tem nhãn</span>
        </button>
      }
      sidebar={
        <div className="p-0 border-r border-slate-200 flex flex-col h-full w-[340px] bg-white">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50">
            <h6 className="font-bold text-xs text-slate-800 mb-2">Chọn hàng hoá để in nhãn</h6>
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
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-center w-10">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded text-blue-600"
                      checked={selectedItemIndexesForPrint.length === items.length && items.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItemIndexesForPrint(items.map((_, idx) => idx));
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
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded text-blue-600"
                        checked={selectedItemIndexesForPrint.includes(idx)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemIndexesForPrint((prev) => [...prev, idx]);
                            setPrintQuantities((prev) => ({ ...prev, [idx]: prev[idx] || 3 }));
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
                      <div className="text-[11px] text-slate-400 font-mono">{it.code || 'N/A'}</div>
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
                            setPrintQuantities((prev) => ({ ...prev, [idx]: 3 }));
                          } else {
                            setPrintQuantities((prev) => ({ ...prev, [idx]: Math.ceil(val / 3) * 3 }));
                          }
                        }}
                        disabled={!selectedItemIndexesForPrint.includes(idx)}
                        min={3}
                        step={3}
                      />
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
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
            items.forEach((it, idx) => {
              if (selectedItemIndexesForPrint.includes(idx)) {
                const qty = (typeof printQuantities[idx] === 'number' && (printQuantities[idx] as number) > 0)
                  ? (printQuantities[idx] as number)
                  : 3;
                for (let i = 0; i < qty; i++) {
                  selectedItems.push(it);
                }
              }
            });

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
                                    {item.imageUrl ? (
                                      <img
                                        src={item.imageUrl}
                                        style={{
                                          maxWidth: '100%',
                                          maxHeight: '100%',
                                          objectFit: 'contain',
                                          mixBlendMode: 'multiply',
                                        }}
                                        alt="product"
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: '100%',
                                          aspectRatio: '1',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          background: '#f8fafc',
                                          borderRadius: 4,
                                          color: '#ccc',
                                        }}
                                      >
                                        <i className="bi bi-box-seam" style={{ fontSize: 32 }} />
                                      </div>
                                    )}
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
                                      Mã SP: <b style={{ fontSize: 12 }}>{item.code || 'N/A'}</b>
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
                                      Bảo hành đến: <b>5 năm</b>
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
