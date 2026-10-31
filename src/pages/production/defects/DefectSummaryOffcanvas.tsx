import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { canManageProdDefects } from '@/lib/production-permissions';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/common/Button';
import { Offcanvas } from '@/components/common/Offcanvas';
import { useToast } from '@/components/ui/Toast';
import { getStatusBadge, getSourceBadge } from './DefectList';
import { Trash, ArrowRight } from 'react-bootstrap-icons';

interface DefectSummaryOffcanvasProps {
  defectId: string | null;
  defect?: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenProcess?: () => void;
}

export function DefectSummaryOffcanvas({
  defectId,
  defect: initialDefect,
  onClose,
  onRefresh,
  onOpenProcess,
}: DefectSummaryOffcanvasProps) {
  const { data: session } = useSession();
  const isProdAdmin = canManageProdDefects(session?.user);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [fetchedDefect, setFetchedDefect] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    if (!defectId) {
      setFetchedDefect(null);
      return;
    }
    let isMounted = true;
    fetch(`/api/production/defects/${defectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setFetchedDefect(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [defectId]);

  const defect = fetchedDefect || initialDefect;

  const handleDelete = () => {
    if (!defect) return;
    setShowConfirmDelete(true);
  };

  const executeDelete = async () => {
    if (!defect) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/production/defects/${defect.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Thành công', 'Đã xoá hồ sơ thành công!');
        onClose();
        if (onRefresh) onRefresh();
      } else {
        toast.error('Lỗi', 'Xoá hồ sơ thất bại.');
      }
    } catch {
      toast.error('Lỗi', 'Có lỗi xảy ra khi xoá hồ sơ.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const parsedMediaUrls: string[] = (() => {
    if (!defect?.mediaUrls) return [];
    if (Array.isArray(defect.mediaUrls)) return defect.mediaUrls;
    try {
      const parsed = JSON.parse(defect.mediaUrls);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return typeof defect.mediaUrls === 'string' && defect.mediaUrls.length > 2
        ? [defect.mediaUrls]
        : [];
    }
  })();

  return (
    <>
      <Offcanvas
        isOpen={!!defectId}
        onClose={onClose}
        title={
          defect?.source === 'RETURN'
            ? `Chi tiết hàng trả về: ${defect?.code || ''}`
            : `Chi tiết hồ sơ lỗi: ${defect?.code || ''}`
        }
        description="Thông tin sản phẩm, khách hàng và hiện trạng báo lỗi"
        icon={<i className="bi bi-tools text-lg" />}
        width="400px"
        footer={
          defect ? (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash size={14} />}
                onClick={handleDelete}
                disabled={isDeleting || !isProdAdmin}
                isLoading={isDeleting}
                title={
                  !isProdAdmin
                    ? 'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền xoá hồ sơ lỗi'
                    : undefined
                }
              >
                {isDeleting ? 'Đang xoá...' : 'Xoá hồ sơ'}
              </Button>
              <div className="flex items-center gap-2">
                {onOpenProcess && (
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ArrowRight size={14} />}
                    disabled={defect.status === 'COMPLETED' || !isProdAdmin}
                    title={
                      !isProdAdmin
                        ? 'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền xử lý hàng lỗi'
                        : undefined
                    }
                    onClick={() => {
                      if (!isProdAdmin) return;
                      onOpenProcess();
                    }}
                  >
                    Tiến trình xử lý
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onClose}>
                  Đóng
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-3.5 text-[13px]">
          {defect ? (
            <>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  {getStatusBadge(defect.status)}
                  {getSourceBadge(defect.source)}
                </div>
                <span className="text-[11.5px] text-slate-500 font-medium">
                  {defect.createdAt ? new Date(defect.createdAt).toLocaleString('vi-VN') : ''}
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Sản phẩm báo lỗi
                </div>
                <div className="font-bold text-sky-700 text-sm">
                  {defect.productName || 'Chưa xác định'}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                  <div>
                    Mã SP: <span className="font-semibold text-slate-800">{defect.productCode || '—'}</span>
                  </div>
                  {defect.quantity !== undefined && (
                    <div>
                      Số lượng:{' '}
                      <span className="text-rose-600 font-bold">
                        {String(defect.quantity || 0).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>
                {defect.bomCode && (
                  <div className="text-xs text-slate-500 mt-1">
                    Mã định mức: <span className="font-semibold text-slate-800">{defect.bomCode}</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-bold text-slate-600 mb-1.5">
                  Mô tả lý do / Hiện trạng
                </div>
                <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs">
                  {defect.description?.split('\nNhận xét QC:')[0]?.trim() ||
                    defect.description ||
                    'Không có mô tả'}
                </div>
              </div>

              {(defect.source === 'WARRANTY' ||
                defect.source === 'RETURN' ||
                defect.customerName ||
                defect.orderNumber) && (
                <div className="rounded-xl border border-sky-200/80 overflow-hidden bg-white shadow-2xs">
                  <div className="bg-sky-600 text-white px-3.5 py-2 flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <i className="bi bi-person"></i>
                      {defect.source === 'RETURN'
                        ? 'Thông tin trả về'
                        : defect.source === 'WARRANTY'
                        ? 'Thông tin bảo hành'
                        : 'Thông tin khách hàng'}
                    </span>
                    {defect.orderNumber && (
                      <span className="px-2 py-0.5 rounded-md bg-white text-sky-700 font-bold text-[10.5px]">
                        ĐH: {defect.orderNumber}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 flex flex-col gap-2.5 text-xs">
                    {defect.customerName && (
                      <div>
                        <div className="text-slate-400 text-[11px]">Khách hàng</div>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {defect.customerName} {defect.customerPhone ? `(${defect.customerPhone})` : ''}
                        </div>
                      </div>
                    )}
                    {defect.customerAddress && (
                      <div>
                        <div className="text-slate-400 text-[11px]">Địa chỉ</div>
                        <div className="text-slate-700 mt-0.5">{defect.customerAddress}</div>
                      </div>
                    )}
                    {defect.orderNumber && (
                      <div>
                        <div className="text-slate-400 text-[11px]">Đơn hàng gốc</div>
                        <div className="text-slate-800 font-semibold mt-0.5">{defect.orderNumber}</div>
                      </div>
                    )}
                    {defect.purchaseDate && (
                      <div>
                        <div className="text-slate-400 text-[11px]">Ngày giao / mua hàng</div>
                        <div className="text-slate-700 mt-0.5">
                          {new Date(defect.purchaseDate).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {defect.source === 'INTERNAL' && (
                <div className="rounded-xl border border-rose-200/80 overflow-hidden bg-white shadow-2xs">
                  <div className="bg-rose-600 text-white px-3.5 py-2 text-xs font-bold flex items-center gap-1.5">
                    <i className="bi bi-building"></i>
                    Thông tin nội bộ
                  </div>
                  <div className="p-3.5 flex flex-col gap-2.5 text-xs">
                    <div>
                      <div className="text-slate-400 text-[11px]">Bộ phận / Người phát hiện</div>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {defect.reporterName} -{' '}
                        {(() => {
                          const dept = (defect.reporterDepartment || '').toLowerCase();
                          if (dept === 'qa') return 'Quản lý Chất lượng (QA)';
                          if (dept === 'production') return 'Sản xuất';
                          if (dept === 'logistics') return 'Kho vận';
                          if (dept === 'sales') return 'Kinh doanh';
                          if (dept === 'customer_service') return 'CSKH';
                          return defect.reporterDepartment || 'Khác';
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px]">Trách nhiệm xử lý hiện tại</div>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {defect.assignedTo || 'Chưa phân công'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {parsedMediaUrls.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-600 mb-2">
                    Hình ảnh / Video đính kèm
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parsedMediaUrls.map((url: string, idx: number) => {
                      const isVideo =
                        url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm');
                      return (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative rounded-lg border border-slate-200 overflow-hidden bg-slate-900 w-20 h-20"
                        >
                          {isVideo ? (
                            <>
                              <video src={url} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                                <i className="bi bi-play-fill text-lg"></i>
                              </div>
                            </>
                          ) : (
                            <img src={url} alt="Lỗi" className="w-full h-full object-cover" />
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-slate-400 py-10">Đang tải dữ liệu...</div>
          )}
        </div>
      </Offcanvas>

      <ConfirmDialog
        open={showConfirmDelete}
        title="Xoá hồ sơ lỗi / trả về"
        message={`Bạn có chắc chắn muốn xoá hồ sơ "${defect?.code || ''}" này không? Toàn bộ tập tin đính kèm liên quan cũng sẽ bị xoá. Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        variant="danger"
        loading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  );
}
