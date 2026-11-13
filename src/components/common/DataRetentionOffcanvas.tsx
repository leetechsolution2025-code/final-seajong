import React, { useState, useEffect, useCallback } from 'react';
import { Offcanvas } from './Offcanvas';
import { toast } from 'react-toastify';

export interface DataRetentionOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  /** Loại dữ liệu: 'MATERIAL_PICKING' | 'BATCH_PACKING' | 'AUDIT_LOGS' | 'PRODUCTION_ORDERS' | 'DEFECT_RECORDS' | 'ALL' */
  ticketType?: 'MATERIAL_PICKING' | 'BATCH_PACKING' | 'AUDIT_LOGS' | 'PRODUCTION_ORDERS' | 'DEFECT_RECORDS' | 'ALL';
  /** Tiêu đề hiển thị trên Offcanvas */
  title?: string;
  /** Mô tả ngắn dưới tiêu đề */
  description?: string;
  /** Tên đơn vị bản ghi (ví dụ: 'lệnh', 'đơn', 'bản ghi') */
  entityLabel?: string;
  /** Callback gọi lại khi chạy dọn dẹp ngay thành công để reload danh sách */
  onCleanedUp?: () => void;
}

export const DataRetentionOffcanvas: React.FC<DataRetentionOffcanvasProps> = ({
  isOpen,
  onClose,
  ticketType = 'ALL',
  title = 'Thiết lập thời gian lưu trữ',
  description = 'Cấu hình tự động dọn dẹp dữ liệu quá thời hạn lưu trữ',
  entityLabel = 'lệnh',
  onCleanedUp,
}) => {
  const [applyInProgress, setApplyInProgress] = useState<boolean>(false);
  const [applyCompleted, setApplyCompleted] = useState<boolean>(true);
  const [retentionDaysInput, setRetentionDaysInput] = useState<string>('30');
  const [eligibleCount, setEligibleCount] = useState<number>(0);
  const [cutoffDateStr, setCutoffDateStr] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [runningCleanup, setRunningCleanup] = useState<boolean>(false);

  const fetchSettingsAndStats = useCallback(
    async (
      customDays?: number,
      customInProgress?: boolean,
      customCompleted?: boolean,
      isInitialLoad = false
    ) => {
      try {
        const days = customDays ?? (Math.max(1, parseInt(retentionDaysInput, 10) || 30));
        const inProgress = customInProgress ?? applyInProgress;
        const completed = customCompleted ?? applyCompleted;

        const params = new URLSearchParams({
          days: String(days),
          type: ticketType,
          applyInProgress: String(inProgress),
          applyCompleted: String(completed),
        });

        const res = await fetch(`/api/logistics/completed-cleanup-settings?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          if (isInitialLoad && data.config) {
            const cfgDays = data.config.retentionDays || 30;
            const cfgInProgress = Boolean(data.config.applyInProgress);
            const cfgCompleted =
              data.config.applyCompleted !== undefined ? Boolean(data.config.applyCompleted) : true;
            setRetentionDaysInput(String(cfgDays));
            setApplyInProgress(cfgInProgress);
            setApplyCompleted(cfgCompleted);

            // Nếu trạng thái từ config khác với mặc định gửi lên thì tải lại stats đúng theo config
            if (cfgDays !== days || cfgInProgress !== inProgress || cfgCompleted !== completed) {
              const refreshParams = new URLSearchParams({
                days: String(cfgDays),
                type: ticketType,
                applyInProgress: String(cfgInProgress),
                applyCompleted: String(cfgCompleted),
              });
              const refreshRes = await fetch(
                `/api/logistics/completed-cleanup-settings?${refreshParams.toString()}`
              );
              const refreshData = await refreshRes.json();
              if (refreshData.success) {
                setEligibleCount(refreshData.stats?.eligibleTicketsCount || 0);
                if (refreshData.stats?.cutoffDate) {
                  setCutoffDateStr(
                    new Date(refreshData.stats.cutoffDate).toLocaleDateString('vi-VN')
                  );
                }
                return;
              }
            }
          }

          setEligibleCount(data.stats?.eligibleTicketsCount || 0);
          if (data.stats?.cutoffDate) {
            setCutoffDateStr(new Date(data.stats.cutoffDate).toLocaleDateString('vi-VN'));
          }
        }
      } catch {
        // ignore
      }
    },
    [retentionDaysInput, applyInProgress, applyCompleted, ticketType]
  );

  useEffect(() => {
    if (isOpen) {
      fetchSettingsAndStats(undefined, undefined, undefined, true);
    }
  }, [isOpen]);

  const handleToggleInProgress = (checked: boolean) => {
    setApplyInProgress(checked);
    const days = Math.max(1, parseInt(retentionDaysInput, 10) || 30);
    fetchSettingsAndStats(days, checked, applyCompleted, false);
  };

  const handleToggleCompleted = (checked: boolean) => {
    setApplyCompleted(checked);
    const days = Math.max(1, parseInt(retentionDaysInput, 10) || 30);
    fetchSettingsAndStats(days, applyInProgress, checked, false);
  };

  const handleDaysChange = (val: string) => {
    setRetentionDaysInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      fetchSettingsAndStats(parsed, applyInProgress, applyCompleted, false);
    }
  };

  const handleSaveSettings = async () => {
    if (!applyInProgress && !applyCompleted) {
      toast.warning('Vui lòng chọn ít nhất một trạng thái áp dụng.');
      return;
    }
    try {
      setSavingSettings(true);
      const days = Math.max(1, parseInt(retentionDaysInput, 10) || 30);
      const res = await fetch('/api/logistics/completed-cleanup-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: ticketType,
          retentionDays: days,
          applyInProgress,
          applyCompleted,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Đã lưu thiết lập thời gian lưu trữ thành công');
        onCleanedUp?.();
        onClose();
      } else {
        toast.error(data.error || 'Không thể lưu thiết lập.');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi lưu thiết lập.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRunCleanupNow = async () => {
    if (!applyInProgress && !applyCompleted) {
      toast.warning('Vui lòng chọn ít nhất một trạng thái áp dụng.');
      return;
    }
    try {
      setRunningCleanup(true);
      const days = Math.max(1, parseInt(retentionDaysInput, 10) || 30);
      const res = await fetch('/api/logistics/completed-cleanup-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retentionDays: days,
          type: ticketType,
          applyInProgress,
          applyCompleted,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          data.message || `Đã dọn dẹp thành công ${data.deletedCount} ${entityLabel} cũ.`
        );
        fetchSettingsAndStats(days, applyInProgress, applyCompleted, false);
        if (onCleanedUp) onCleanedUp();
      } else {
        toast.error(data.error || 'Không thể dọn dẹp dữ liệu.');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi dọn dẹp dữ liệu.');
    } finally {
      setRunningCleanup(false);
    }
  };

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={<i className="bi bi-clock-history text-amber-600 text-lg" />}
      width="400px"
      confirmText="Lưu thiết lập"
      cancelText="Đóng"
      onConfirm={handleSaveSettings}
      isSubmitting={savingSettings}
    >
      <div className="space-y-4 text-slate-700">
        {/* 1. Áp dụng cho các trạng thái */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">
            Áp dụng cho các trạng thái:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                applyInProgress
                  ? 'bg-blue-50/70 border-blue-500 text-blue-800 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={applyInProgress}
                onChange={(e) => handleToggleInProgress(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Đang thực hiện</span>
            </label>

            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                applyCompleted
                  ? 'bg-blue-50/70 border-blue-500 text-blue-800 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={applyCompleted}
                onChange={(e) => handleToggleCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Đã hoàn thành</span>
            </label>
          </div>
        </div>

        {/* 2. Thời gian lưu trữ dữ liệu (Input mặc định 30 ngày) */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Thời gian lưu trữ dữ liệu:
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min="1"
              max="3650"
              value={retentionDaysInput}
              onChange={(e) => handleDaysChange(e.target.value)}
              placeholder="30"
              className="w-full h-9 pl-3 pr-14 text-xs font-mono font-bold text-slate-800 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <span className="absolute right-3 text-xs text-slate-500 font-medium pointer-events-none">
              ngày
            </span>
          </div>
        </div>

        {/* 3. Khối thống kê & tác vụ dọn dẹp */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <i className="bi bi-info-circle text-blue-600" />
            <span>Dự báo dữ liệu dọn dẹp:</span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Mốc thời gian xoá:</span>
              <span className="font-medium text-slate-800">
                Trước ngày {cutoffDateStr || '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Số {entityLabel} phù hợp:</span>
              <span className="font-mono font-bold text-rose-600">
                {eligibleCount} {entityLabel}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleRunCleanupNow}
              disabled={runningCleanup || eligibleCount === 0}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {runningCleanup ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin text-xs" />
                  <span>Đang dọn dẹp...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-trash3 text-xs" />
                  <span>
                    Dọn dẹp ngay {eligibleCount} {entityLabel} cũ
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Offcanvas>
  );
};

