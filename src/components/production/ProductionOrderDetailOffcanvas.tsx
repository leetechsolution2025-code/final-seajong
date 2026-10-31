import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/Toast';
import { Offcanvas } from '@/components/common/Offcanvas';
import { Button } from '@/components/common/Button';
import { DatePicker } from '@/components/common/DatePicker';
import { FullWidthTable } from '@/components/common/FullWidthTable';
import { canManageProdOrders } from '@/lib/production-permissions';
import {
  BoxSeam,
  Layers,
  Printer,
  Check2Circle,
  CheckAll,
  ExclamationTriangle,
  InfoCircleFill,
  ChevronDown,
  ChevronUp,
  FileEarmarkText,
} from 'react-bootstrap-icons';

interface OrderDetailProps {
  orderId: string | null;
  show?: boolean;
  onClose?: () => void;
  onHide?: () => void;
  onStatusUpdated?: () => void;
  onUpdate?: () => void;
}

export function ProductionOrderDetailOffcanvas({
  orderId,
  show,
  onClose,
  onHide,
  onStatusUpdated,
  onUpdate,
}: OrderDetailProps) {
  const handleClose = onClose || onHide || (() => {});
  const handleStatusUpdated = onStatusUpdated || onUpdate;
  const effectiveOrderId = show === false ? null : orderId;

  const { data: session } = useSession();
  const isProdAdmin = canManageProdOrders(session?.user);
  const { success: toastSuccess, error: toastError } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [qcDate, setQcDate] = useState<string>('');
  const [savingDate, setSavingDate] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'materials'>('items');
  const [openAccordionIdx, setOpenAccordionIdx] = useState<number | null>(0);

  const fetchDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/orders/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.order?.ngayYeuCauQC) {
          const d = new Date(json.order.ngayYeuCauQC);
          if (!isNaN(d.getTime())) {
            setQcDate(d.toISOString().split('T')[0]);
          }
        } else {
          setQcDate('');
        }
      } else {
        toastError('Lỗi', 'Không tải được chi tiết lệnh sản xuất');
      }
    } catch (e) {
      console.error(e);
      toastError('Lỗi', 'Mất kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveOrderId) {
      fetchDetail(effectiveOrderId);
      setActiveTab('items');
      setOpenAccordionIdx(0);
    } else {
      setData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOrderId]);

  const handleUpdateQcDate = async (newDate: string) => {
    setQcDate(newDate);
    if (!effectiveOrderId) return;
    setSavingDate(true);
    try {
      const res = await fetch(`/api/production/orders/${effectiveOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ngayYeuCauQC: newDate }),
      });
      if (res.ok) {
        toastSuccess('Thành công', 'Đã cập nhật hạn yêu cầu QC kiểm tra');
      } else {
        toastError('Lỗi', 'Không thể lưu ngày yêu cầu QC');
      }
    } catch (e) {
      console.error(e);
      toastError('Lỗi', 'Lỗi kết nối máy chủ');
    } finally {
      setSavingDate(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'running' | 'completed') => {
    if (!effectiveOrderId) return;
    if (!isProdAdmin) {
      toastError(
        'Không có quyền',
        'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền báo cáo hoàn thành lệnh sản xuất'
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/production/orders/${effectiveOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trangThai: newStatus }),
      });
      if (res.ok) {
        toastSuccess('Thành công', 'Đã cập nhật trạng thái lệnh sản xuất');
        fetchDetail(effectiveOrderId);
        if (handleStatusUpdated) handleStatusUpdated();
      } else {
        toastError('Lỗi', 'Không thể cập nhật trạng thái');
      }
    } catch (e) {
      console.error(e);
      toastError('Lỗi', 'Mất kết nối');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Offcanvas
      isOpen={!!effectiveOrderId}
      onClose={handleClose}
      width="400px"
      icon={<FileEarmarkText size={20} />}
      title={`Chi tiết LSX: ${data?.order?.id || effectiveOrderId || ''}`}
      description={
        data?.order
          ? data.order.trangThai === 'completed'
            ? 'Trạng thái: Đã hoàn thành'
            : data.order.trangThai === 'running'
            ? 'Trạng thái: Đang thực hiện'
            : 'Trạng thái: Chờ xử lý'
          : 'Thông tin thành phẩm và định mức vật tư'
      }
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column' }}
      footer={
        data?.order ? (
          <div className="flex items-center justify-between w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer size={14} />}
              onClick={() => window.print()}
            >
              In phiếu
            </Button>

            <div className="flex items-center gap-2">
              {data.order.trangThai !== 'completed' ? (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Check2Circle size={15} />}
                  onClick={() => handleUpdateStatus('completed')}
                  isLoading={saving}
                  disabled={!isProdAdmin}
                  title={
                    !isProdAdmin
                      ? 'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền báo cáo hoàn thành lệnh sản xuất'
                      : undefined
                  }
                >
                  Hoàn thành
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <CheckAll size={14} /> Đã khép lại
                </span>
              )}
              <Button variant="secondary" size="sm" onClick={handleClose}>
                Đóng
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="w-7 h-7 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-3" />
          <span className="text-xs font-medium">
            Đang tải thông tin và bóc tách định mức vật tư...
          </span>
        </div>
      ) : data ? (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Thông tin chung */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <div className="text-slate-400 font-medium mb-0.5">Ngày phát hành</div>
                <div className="font-bold text-slate-800">
                  {data.order.ngayDat
                    ? new Date(data.order.ngayDat).toLocaleDateString('vi-VN')
                    : '—'}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <div className="text-slate-400 font-medium mb-0.5">Hạn hoàn thành</div>
                <div className="font-bold text-sky-700">
                  {data.order.ngayHoanThanh
                    ? new Date(data.order.ngayHoanThanh).toLocaleDateString('vi-VN')
                    : 'Chưa xác định'}
                </div>
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
              <div className="text-slate-600 font-semibold mb-1 flex items-center justify-between">
                <span>Hạn QC Kiểm tra</span>
                {savingDate && (
                  <span className="w-3 h-3 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
                )}
              </div>
              <DatePicker
                value={qcDate}
                onChange={(val) => handleUpdateQcDate(val)}
                disabled={data.order.trangThai === 'completed' || savingDate}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="px-3.5 pt-2 border-b border-slate-200 flex items-center gap-2 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className={`inline-flex items-center gap-1.5 pb-2 px-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'items'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BoxSeam size={13} />
              <span>Thành phẩm ({data.items?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`inline-flex items-center gap-1.5 pb-2 px-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'materials'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers size={13} />
              <span>Tổng hợp Vật tư ({data.materials?.length || 0})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-3.5 flex-1 overflow-y-auto space-y-3.5">
            {activeTab === 'items' && (
              <>
                <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <BoxSeam size={13} className="text-sky-600" />
                    <span>Danh sách sản phẩm theo đơn</span>
                  </div>
                  <FullWidthTable style={{ maxHeight: 220 }}>
                    <table className="w-full text-left border-collapse" style={{ fontSize: '12px' }}>
                      <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
                        <tr className="text-slate-500 text-[10.5px] uppercase font-bold">
                          <th className="py-2 px-2.5 text-left">Thành phẩm</th>
                          <th className="py-2 px-2 w-14 text-center">SL</th>
                          <th className="py-2 px-2.5 w-28 text-right">Định mức</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(data.items || []).map((item: any, idx: number) => (
                          <tr key={item.id || idx} className="hover:bg-slate-50/80">
                            <td className="py-2 px-2.5 font-semibold text-slate-800">
                              {item.tenHang}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-sky-700 font-mono">
                              {item.soLuong}
                            </td>
                            <td className="py-2 px-2.5 text-right">
                              {item.bomFound ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                  ✓ {item.bomCode}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <ExclamationTriangle size={10} /> Chưa có
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </FullWidthTable>
                </div>

                {/* Chi tiết bóc tách theo từng mặt hàng */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-0.5">
                    Chi tiết bóc tách vật tư theo mặt hàng
                  </div>
                  {(data.items || []).map((item: any, idx: number) => {
                    const isOpen = openAccordionIdx === idx;
                    return (
                      <div
                        key={item.id || idx}
                        className="rounded-lg border border-slate-200 overflow-hidden bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenAccordionIdx(isOpen ? null : idx)}
                          className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-800 truncate pr-2">
                            {item.tenHang}{' '}
                            <span className="text-sky-600 font-mono">(SL: {item.soLuong})</span>
                          </span>
                          {isOpen ? (
                            <ChevronUp size={13} className="text-slate-500 shrink-0" />
                          ) : (
                            <ChevronDown size={13} className="text-slate-500 shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-200">
                            {item.materials && item.materials.length > 0 ? (
                              <table
                                className="w-full text-left border-collapse"
                                style={{ fontSize: '11.5px' }}
                              >
                                <thead className="bg-white border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                                  <tr>
                                    <th className="py-1.5 px-2.5">Vật tư</th>
                                    <th className="py-1.5 px-2 w-16 text-center">Tổng cần</th>
                                    <th className="py-1.5 px-2 w-14 text-center">ĐVT</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {item.materials.map((m: any, mIdx: number) => (
                                    <tr key={mIdx} className="hover:bg-slate-50">
                                      <td className="py-1.5 px-2.5">
                                        <div className="font-medium text-slate-800">{m.tenVatTu}</div>
                                        {m.code && (
                                          <div className="font-mono text-[10px] text-slate-400">
                                            {m.code}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-1.5 px-2 text-center font-bold text-rose-600 font-mono">
                                        {m.soLuong}
                                      </td>
                                      <td className="py-1.5 px-2 text-center text-slate-500">
                                        {m.donViTinh}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="p-3 text-xs text-slate-400 italic">
                                Không có dữ liệu vật tư. Vui lòng thiết lập Định mức (BOM).
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-800 flex items-center gap-2">
                  <InfoCircleFill size={14} className="text-sky-600 shrink-0" />
                  <span>Tổng số lượng vật tư cần xuất kho phục vụ Lệnh sản xuất này.</span>
                </div>

                {data.materials && data.materials.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                    <FullWidthTable>
                      <table
                        className="w-full text-left border-collapse"
                        style={{ fontSize: '12px' }}
                      >
                        <thead className="sticky top-0 z-10 bg-white border-b border-slate-200 text-slate-500 text-[10.5px] uppercase font-bold">
                          <tr>
                            <th className="py-2 px-2.5">Vật tư</th>
                            <th className="py-2 px-2 w-20 text-center">Tổng SL</th>
                            <th className="py-2 px-2 w-14 text-center">ĐVT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.materials.map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="py-2 px-2.5">
                                <div className="font-semibold text-slate-800">{m.tenVatTu}</div>
                                {m.code && (
                                  <div className="font-mono text-[10.5px] text-slate-400">
                                    {m.code}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-sky-700 font-mono">
                                {m.soLuong}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-500 text-xs">
                                {m.donViTinh}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </FullWidthTable>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 border border-slate-200 rounded-lg bg-slate-50 text-xs">
                    Chưa có vật tư nào được tính toán.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Offcanvas>
  );
}

export default ProductionOrderDetailOffcanvas;
