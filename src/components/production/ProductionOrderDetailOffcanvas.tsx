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
  FileEarmarkText,
  ClockHistory,
  HourglassSplit,
  Tools,
} from 'react-bootstrap-icons';
import { getStatusBadge as getDefectStatusBadge } from '@/pages/production/defects/DefectList';

const DEFECT_RESOLUTIONS = [
  'Sửa chữa tại chỗ',
  'Thay linh kiện',
  'Phân rã thu hồi vật tư linh kiện',
  'Huỷ bỏ thay thế bằng hàng hoá mới',
  'Nhập lại kho',
] as const;

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
  const handleClose = onClose || onHide || (() => { });
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
  const [activeTab, setActiveTab] = useState<'items' | 'materials' | 'defects'>('items');

  // State cho biện pháp xử lý hàng lỗi
  const [defectItemId, setDefectItemId] = useState<string>('');
  const [defectQty, setDefectQty] = useState<number>(1);
  const [defectResolution, setDefectResolution] = useState<string>('Sửa chữa tại chỗ');
  const [defectRequireQc, setDefectRequireQc] = useState<boolean>(true);
  const [defectNote, setDefectNote] = useState<string>('');
  const [submittingDefect, setSubmittingDefect] = useState<boolean>(false);

  const fetchDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/orders/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.items?.length > 0) {
          setDefectItemId((prev) => prev || json.items[0].id || json.items[0].tenHang || '');
        }
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
      setDefectItemId('');
      setDefectQty(1);
      setDefectResolution('Sửa chữa tại chỗ');
      setDefectRequireQc(true);
      setDefectNote('');
    } else {
      setData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOrderId]);

  const handleSubmitDefectAction = async () => {
    if (!effectiveOrderId || !data?.order) return;
    if (!isProdAdmin) {
      toastError('Không có quyền', 'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền xử lý hàng lỗi');
      return;
    }
    const targetItem =
      (data.items || []).find((it: any) => it.id === defectItemId || it.tenHang === defectItemId) ||
      data.items?.[0];
    if (!targetItem) {
      toastError('Thiếu thông tin', 'Không tìm thấy sản phẩm trong lệnh sản xuất');
      return;
    }
    const qty = Math.max(1, Math.min(Number(defectQty) || 1, Number(targetItem.soLuong) || 999));
    setSubmittingDefect(true);
    try {
      // 1. Tạo hồ sơ lỗi gắn với lệnh sản xuất / đơn hàng
      const createRes = await fetch('/api/production/defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'INTERNAL',
          productName: targetItem.tenHang,
          productCode: targetItem.bomCode || targetItem.tenHang,
          quantity: qty,
          description: defectNote.trim() || `Xử lý lỗi theo phương án: ${defectResolution}`,
          orderNumber: data.order.saleOrderCode || data.order.id,
          customerName: data.order.customerName || undefined,
          customerAddress: data.order.customerAddress || undefined,
          reporterName: session?.user?.name || 'Bộ phận sản xuất',
          reporterDepartment: 'Sản xuất',
        }),
      });
      if (!createRes.ok) {
        throw new Error('Không thể tạo hồ sơ hàng lỗi');
      }
      const created = await createRes.json();
      const createdId = created?.id || created?.data?.id;
      if (!createdId) {
        throw new Error('Không lấy được mã hồ sơ vừa tạo');
      }

      // 2. Áp dụng biện pháp xử lý chuẩn
      const isNeedMaterial = defectResolution === 'Thay linh kiện';
      const isDisassemble = defectResolution === 'Phân rã thu hồi vật tư linh kiện';
      const bomPayload =
        isNeedMaterial || isDisassemble
          ? (targetItem.materials || data.materials || []).map((m: any) => ({
            id: m.id,
            inventoryItemId: m.id,
            name: m.tenVatTu,
            code: m.code,
            unit: m.donViTinh || 'cái',
            quantity: Math.max(1, Math.round((Number(m.soLuong) || 1) * (qty / Math.max(1, Number(targetItem.soLuong) || 1)))),
          }))
          : undefined;

      const allowQcOption = defectResolution === 'Nhập lại kho' || defectResolution === 'Sửa chữa tại chỗ';
      const sendQc = allowQcOption ? defectRequireQc : false;
      const nextStatus = isNeedMaterial ? 'WAITING_INVENTORY' : 'COMPLETED';

      const procRes = await fetch(`/api/production/defects/${createdId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: `QUYẾT ĐỊNH: ${defectResolution.toUpperCase()}${sendQc ? ' & CHUYỂN QC' : ''}`,
          nextStatus,
          note: defectNote.trim() || defectResolution,
          performedBy: session?.user?.name || 'Bộ phận sản xuất',
          bomUpdates: bomPayload,
          returnQty: qty,
          requireQc: sendQc,
        }),
      });
      if (!procRes.ok) {
        throw new Error('Không thể áp dụng biện pháp xử lý lỗi');
      }

      toastSuccess('Thành công', `Đã áp dụng biện pháp "${defectResolution}" cho ${targetItem.tenHang}`);
      setDefectNote('');
      setDefectQty(1);
      fetchDetail(effectiveOrderId);
      if (handleStatusUpdated) handleStatusUpdated();
    } catch (e: any) {
      toastError('Lỗi', e?.message || 'Không thể lưu biện pháp xử lý hàng lỗi');
    } finally {
      setSubmittingDefect(false);
    }
  };

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

  const handleUpdateStatus = async (newStatus: 'running' | 'completed' | 'qc_checking') => {
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

  const isMaterialIssued = data?.order ? data.order.isMaterialIssued !== false : true;
  const isQcChecking = data?.order?.trangThai === 'qc_checking';
  const isCompleted = data?.order?.trangThai === 'completed';
  const canComplete = isProdAdmin && isMaterialIssued && !isQcChecking && !isCompleted;

  return (
    <Offcanvas
      isOpen={!!effectiveOrderId}
      onClose={handleClose}
      width="400px"
      icon={<FileEarmarkText size={20} />}
      title={`Chi tiết LSX: ${data?.order?.id || effectiveOrderId || ''}`}
      description={
        data?.order ? (
          <div className="space-y-1">
            <div className="text-[12px] font-medium">
              {isCompleted ? (
                <span className="text-emerald-600 font-semibold">Trạng thái: Đã hoàn thành</span>
              ) : isQcChecking ? (
                <span className="text-purple-600 font-semibold">Trạng thái: Đang kiểm tra</span>
              ) : !isMaterialIssued ? (
                <span className="text-amber-600 font-semibold">Trạng thái: Chưa cấp vật tư</span>
              ) : (
                <span className="text-sky-600 font-semibold">Trạng thái: Đang sản xuất</span>
              )}
            </div>
            {!isMaterialIssued && !isCompleted && (
              <div
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200"
                title={
                  data.order.materialTicketCode
                    ? `Lệnh cấp phát vật tư ${data.order.materialTicketCode} chưa ở trạng thái Đã cấp phát`
                    : 'Vật tư chưa được xuất kho cấp phát'
                }
              >
                <ExclamationTriangle size={12} className="shrink-0 text-amber-600" />
                <span>
                  Chưa cấp vật tư
                  {data.order.materialTicketCode ? ` (${data.order.materialTicketCode})` : ''} - Cần xuất kho vật tư trước
                </span>
              </div>
            )}
            {isQcChecking && (
              <div
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200"
              >
                <ClockHistory size={12} className="shrink-0 text-purple-600" />
                <span>Đã chuyển thông tin sang bộ phận QC kiểm tra thành phẩm</span>
              </div>
            )}
          </div>
        ) : (
          'Thông tin thành phẩm và định mức vật tư'
        )
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
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <CheckAll size={14} /> Đã khép lại
                </span>
              ) : isQcChecking ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                  <HourglassSplit size={14} /> Đang kiểm tra QC
                </span>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Check2Circle size={15} />}
                  onClick={() => handleUpdateStatus('qc_checking')}
                  isLoading={saving}
                  disabled={!canComplete}
                  title={
                    !isProdAdmin
                      ? 'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền báo cáo hoàn thành lệnh sản xuất'
                      : !isMaterialIssued
                        ? `Lệnh cấp phát vật tư (${data.order.materialTicketCode || ''}) chưa ở trạng thái Đã cấp phát. Cần bộ phận kho xuất kho cấp phát vật tư trước khi sản xuất.`
                        : 'Báo cáo hoàn thành sản xuất và chuyển sang bộ phận QC kiểm tra'
                  }
                >
                  Hoàn thành
                </Button>
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
              className={`inline-flex items-center gap-1.5 pb-2 px-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'items'
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
              className={`inline-flex items-center gap-1.5 pb-2 px-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'materials'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Layers size={13} />
              <span>Vật tư ({data.materials?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('defects')}
              className={`inline-flex items-center gap-1.5 pb-2 px-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'defects'
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Tools size={12} />
              <span>Xử lý lỗi ({data.defects?.length || 0})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-3.5 flex-1 overflow-y-auto space-y-3.5">
            {activeTab === 'items' && (
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BoxSeam size={13} className="text-sky-600" />
                    <span>Danh sách sản phẩm theo đơn</span>
                  </div>
                  <span className="text-slate-400 font-normal normal-case text-[11px]">
                    {data.items?.length || 0} mặt hàng
                  </span>
                </div>
                <FullWidthTable>
                  <table className="w-full text-left border-collapse" style={{ fontSize: '12px' }}>
                    <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
                      <tr className="text-slate-500 text-[10.5px] uppercase font-bold">
                        <th className="py-2.5 px-3 text-left">Sản phẩm & Định mức</th>
                        <th className="py-2.5 px-2.5 w-20 text-center">SL SX</th>
                        <th className="py-2.5 px-2.5 w-16 text-center">ĐVT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data.items || []).map((item: any, idx: number) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 align-top">
                            <div className="font-semibold text-slate-800 text-[12.5px] leading-snug">
                              {item.tenHang}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {item.bomCode ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 font-mono">
                                  ✓ {item.bomCode}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                  <ExclamationTriangle size={10} /> Chưa có định mức
                                </span>
                              )}
                              {item.bomTen && item.bomTen !== item.bomCode && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {item.bomTen}
                                </span>
                              )}
                            </div>
                            {item.dinhMucGhiChu && (
                              <div className="text-[11px] text-slate-500 italic mt-1 leading-relaxed bg-slate-50/80 p-1.5 rounded border border-slate-100">
                                <span className="font-medium text-slate-600 not-italic">Ghi chú:</span> {item.dinhMucGhiChu}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center align-top">
                            <div className="font-bold text-sky-700 font-mono text-sm">
                              {item.soLuong}
                            </div>
                            {item.soLuongDat && item.soLuongDat !== item.soLuong && (
                              <div className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5" title="Số lượng trong đơn đặt hàng">
                                Đơn: {item.soLuongDat}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center align-top text-xs text-slate-600 font-medium">
                            {item.donVi || 'Bộ'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </FullWidthTable>
              </div>
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

            {activeTab === 'defects' && (
              <div className="space-y-3">
                {/* Danh sách biện pháp xử lý lỗi đã ghi nhận */}
                {Array.isArray(data.defects) && data.defects.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Biện pháp xử lý đã áp dụng ({data.defects.length})
                    </div>
                    {data.defects.map((d: any) => {
                      const decisionAct = (d.activities || []).find((a: any) =>
                        String(a.action || '').includes('QUYẾT ĐỊNH:')
                      );
                      const methodLabel =
                        d.resolution ||
                        (decisionAct ? String(decisionAct.action).replace('QUYẾT ĐỊNH:', '').trim() : null) ||
                        d.repairPlan ||
                        'Đã xử lý';
                      return (
                        <div
                          key={d.id}
                          className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-sky-700">{d.code}</span>
                            {getDefectStatusBadge(d.status)}
                          </div>
                          <div className="font-semibold text-slate-800">
                            {d.productName}{' '}
                            <span className="text-rose-600 font-mono">× {d.quantity || 1}</span>
                          </div>
                          <div className="text-[11px] text-emerald-800 bg-emerald-50/70 px-2 py-1.5 rounded border border-emerald-200/80">
                            <span className="font-bold">Biện pháp xử lý:</span>{' '}
                            <span className="font-semibold">{methodLabel}</span>
                          </div>
                          {d.repairPlan && d.repairPlan !== methodLabel && (
                            <div className="text-[11px] text-slate-600">
                              <span className="font-medium text-slate-700">Nội dung:</span> {d.repairPlan}
                            </div>
                          )}
                          {d.completionDate && (
                            <div className="text-[10.5px] text-slate-400">
                              Hoàn tất: {new Date(d.completionDate).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : isCompleted ? (
                  <div className="text-center py-8 text-slate-400 border border-slate-200 rounded-lg bg-slate-50 text-xs">
                    Không có phát sinh xử lý hàng lỗi cho lệnh sản xuất này.
                  </div>
                ) : null}

                {/* Chỉ hiển thị form xử lý hàng lỗi khi lệnh sản xuất CHƯA hoàn thành */}
                {!isCompleted && (
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2.5 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Tools size={12} className="text-rose-600" />
                      <span>Biện pháp xử lý hàng lỗi</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Sản phẩm lỗi
                        </label>
                        <select
                          value={defectItemId}
                          onChange={(e) => setDefectItemId(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white outline-none focus:border-sky-500"
                        >
                          {(data.items || []).map((it: any) => (
                            <option key={it.id || it.tenHang} value={it.id || it.tenHang}>
                              {it.tenHang}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          SL lỗi
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={defectQty}
                          onChange={(e) => setDefectQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full h-8 px-2 text-center font-mono font-bold rounded-lg border border-slate-300 text-xs text-slate-800 outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Biện pháp xử lý
                      </label>
                      <select
                        value={defectResolution}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDefectResolution(val);
                          setDefectRequireQc(val === 'Sửa chữa tại chỗ');
                        }}
                        className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white outline-none focus:border-sky-500"
                      >
                        {DEFECT_RESOLUTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(defectResolution === 'Nhập lại kho' || defectResolution === 'Sửa chữa tại chỗ') && (
                      <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={defectRequireQc}
                          onChange={(e) => setDefectRequireQc(e.target.checked)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="font-medium">Chuyển phòng QA/QC kiểm tra</span>
                      </label>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Nội dung xử lý / Mô tả lỗi
                      </label>
                      <textarea
                        rows={2}
                        value={defectNote}
                        onChange={(e) => setDefectNote(e.target.value)}
                        placeholder="Nhập hiện trạng lỗi hoặc nội dung xử lý..."
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs text-slate-800 outline-none focus:border-sky-500 resize-none"
                      />
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      disabled={!isProdAdmin || submittingDefect || !(data.items?.length > 0)}
                      isLoading={submittingDefect}
                      onClick={handleSubmitDefectAction}
                    >
                      Xác nhận xử lý lỗi
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null
      }
    </Offcanvas >
  );
}

export default ProductionOrderDetailOffcanvas;
