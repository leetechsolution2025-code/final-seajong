import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StandardPage } from '@/components/layout/StandardPage';
import { TableToolbar, type TableToolbarMenuItem } from '@/components/common/TableToolbar';
import { FullWidthTable } from '@/components/common/FullWidthTable';
import { Pagination } from '@/components/common/Pagination';
import { WarehouseCategoryFilter } from '@/components/common/WarehouseCategoryFilter';
import { Select } from '@/components/common/Select';
import { Offcanvas } from '@/components/common/Offcanvas';
// Toast nội bộ thông báo nhẹ nhàng
interface ToastState {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

export interface AuditLogLine {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemUnit: string;
  soLuong: number;
  soLuongTruoc?: number | null;
  soLuongSau?: number | null;
  donGia?: number | null;
  warehouseName?: string;
  fromWarehouseName?: string;
  toWarehouseName?: string;
}

export interface AuditLogItem {
  id: string;
  soChungTu: string;
  activityType: 'nhap' | 'xuat' | 'dieu-chinh' | 'luan-chuyen' | 'other';
  activityLabel: string;
  activityBadgeColor: string;
  createdAt: string;
  thoiGianFormatted: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  itemUnit?: string;
  soLuong?: number;
  soLuongTruoc?: number | null;
  soLuongSau?: number | null;
  warehouseName: string;
  fromWarehouseName?: string;
  toWarehouseName?: string;
  nguoiThucHien: string;
  lyDo: string;
  ghiChu: string;
  orderCode?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  partnerType?: 'customer' | 'supplier' | null;
  tongSoLuong?: number;
  linesCount?: number;
  lines?: AuditLogLine[];
}

export const LogisticsAuditLogsPage: React.FC = () => {
  // ── States cho Bộ lọc ──
  const [warehouse, setWarehouse] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [activity, setActivity] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Mặc định từ ngày 01 đầu tháng hiện hành đến ngày hiện hành
  const defaultDates = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return {
      fromDate: `${year}-${month}-01`,
      toDate: `${year}-${month}-${day}`,
    };
  }, []);

  const [fromDate, setFromDate] = useState<string>(defaultDates.fromDate);
  const [toDate, setToDate] = useState<string>(defaultDates.toDate);

  // ── States cho Dữ liệu & Phân trang ──
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(true);

  // ── States cho Checkbox chọn dòng ──
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── States cho Mở rộng / Thu gọn chi tiết nhiều hàng hoá (Mặc định ẩn) ──
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  // ── State cho ConfirmDialog xác nhận xoá ──
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    targetId?: string;
    isBatch?: boolean;
  } | null>(null);

  // ── States cho Offcanvas Thiết lập tự động xoá (Rộng 400px) ──
  const [isCleanupOffcanvasOpen, setIsCleanupOffcanvasOpen] = useState<boolean>(false);
  const [cleanupEnabled, setCleanupEnabled] = useState<boolean>(true);
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [customDays, setCustomDays] = useState<string>('90');
  const [isCustomDays, setIsCustomDays] = useState<boolean>(false);
  const [keepStockCounts, setKeepStockCounts] = useState<boolean>(true);
  const [eligibleCount, setEligibleCount] = useState<number>(0);
  const [cutoffDateStr, setCutoffDateStr] = useState<string>('');
  const [lastCleanupInfo, setLastCleanupInfo] = useState<{ lastRunAt: string | null; lastDeletedCount: number } | null>(null);
  const [savingCleanup, setSavingCleanup] = useState<boolean>(false);
  const [runningCleanup, setRunningCleanup] = useState<boolean>(false);

  // ── Tải cấu hình tự động xoá từ hệ thống ──
  const fetchCleanupSettings = useCallback(async (daysToEval?: number) => {
    try {
      const days = daysToEval || retentionDays;
      const res = await fetch(`/api/logistics/audit-logs/auto-cleanup-settings?days=${days}`);
      const data = await res.json();
      if (data && data.success) {
        if (daysToEval === undefined) {
          setCleanupEnabled(data.config.enabled ?? true);
          setRetentionDays(data.config.retentionDays ?? 90);
          setCustomDays(String(data.config.retentionDays ?? 90));
          setKeepStockCounts(data.config.keepStockCounts ?? true);
          setLastCleanupInfo({
            lastRunAt: data.config.lastRunAt,
            lastDeletedCount: data.config.lastDeletedCount || 0,
          });
          const standardPresets = [30, 60, 90, 180, 365];
          setIsCustomDays(!standardPresets.includes(data.config.retentionDays));
        }
        setEligibleCount(data.stats.eligibleMovementsCount || 0);
        if (data.stats.cutoffDate) {
          setCutoffDateStr(new Date(data.stats.cutoffDate).toLocaleDateString('vi-VN'));
        }
      }
    } catch (err) {
      console.error('Lỗi nạp cấu hình tự động xoá:', err);
    }
  }, [retentionDays]);

  useEffect(() => {
    if (isCleanupOffcanvasOpen) {
      fetchCleanupSettings();
    }
  }, [isCleanupOffcanvasOpen, fetchCleanupSettings]);

  const handleSelectDays = (days: number) => {
    setRetentionDays(days);
    setIsCustomDays(false);
    setCustomDays(String(days));
    fetchCleanupSettings(days);
  };

  const handleCustomDaysChange = (val: string) => {
    setCustomDays(val);
    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed > 0) {
      setRetentionDays(parsed);
      fetchCleanupSettings(parsed);
    }
  };

  const handleSaveCleanupSettings = async () => {
    setSavingCleanup(true);
    try {
      const res = await fetch('/api/logistics/audit-logs/auto-cleanup-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: cleanupEnabled,
          retentionDays,
          keepStockCounts,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Đã lưu thiết lập tự động xoá dữ liệu');
        setIsCleanupOffcanvasOpen(false);
      } else {
        showToast('error', data.error || 'Lỗi lưu thiết lập');
      }
    } catch (err) {
      console.error('Lỗi lưu cấu hình:', err);
      showToast('error', 'Không thể kết nối đến máy chủ để lưu thiết lập');
    } finally {
      setSavingCleanup(false);
    }
  };

  const handleRunCleanupNow = async () => {
    if (eligibleCount === 0) {
      showToast('info', `Không có dữ liệu nào cũ hơn ${retentionDays} ngày để dọn dẹp`);
      return;
    }
    setRunningCleanup(true);
    try {
      const res = await fetch('/api/logistics/audit-logs/run-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retentionDays,
          keepStockCounts,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || `Đã dọn dẹp ${data.deletedCount} bản ghi`);
        fetchCleanupSettings();
        fetchAuditLogs();
      } else {
        showToast('error', data.error || 'Lỗi khi dọn dẹp');
      }
    } catch (err) {
      console.error('Lỗi chạy dọn dẹp:', err);
      showToast('error', 'Không thể thực hiện dọn dẹp dữ liệu');
    } finally {
      setRunningCleanup(false);
    }
  };

  // ── State cho Toast thông báo ──
  const [toastMsg, setToastMsg] = useState<ToastState | null>(null);
  const showToast = useCallback((type: ToastState['type'], message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => {
      setToastMsg((curr) => (curr?.message === message ? null : curr));
    }, 3500);
  }, []);

  // ── Hàm tải dữ liệu thực tế từ Database ──
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        warehouseId: warehouse,
        categoryId: category,
        activity,
        fromDate,
        toDate,
        search,
      });

      const res = await fetch(`/api/logistics/audit-logs?${params.toString()}`);
      const data = await res.json();

      if (data && data.success) {
        const loadedItems: AuditLogItem[] = data.items || [];
        setItems(loadedItems);
        setTotal(data.total || 0);
        // Mặc định ẩn các nội dung chi tiết
        setExpandedIds([]);
      } else {
        setItems([]);
        setTotal(0);
        setExpandedIds([]);
      }
    } catch (err) {
      console.error('Lỗi nạp nhật ký hoạt động kho:', err);
      showToast('error', 'Không thể tải nhật ký hoạt động kho');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, warehouse, category, activity, fromDate, toDate, search, showToast]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // ── Xử lý Xác nhận Xoá Dữ liệu ──
  const handleConfirmDelete = async () => {
    if (!confirmDialog) return;
    try {
      if (confirmDialog.isBatch) {
        const res = await fetch('/api/logistics/audit-logs/delete-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('success', data.message || 'Đã xoá các hoạt động kho thành công');
          setSelectedIds([]);
          fetchAuditLogs();
        } else {
          showToast('error', data.error || 'Lỗi khi xoá dữ liệu');
        }
      } else if (confirmDialog.targetId) {
        const res = await fetch(`/api/logistics/audit-logs/${encodeURIComponent(confirmDialog.targetId)}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          showToast('success', data.message || 'Đã xoá hoạt động kho thành công');
          fetchAuditLogs();
        } else {
          showToast('error', data.error || 'Lỗi khi xoá hoạt động kho');
        }
      }
    } catch (err) {
      console.error('Lỗi gọi API xoá hoạt động:', err);
      showToast('error', 'Không thể kết nối đến máy chủ để thực hiện xoá');
    } finally {
      setConfirmDialog(null);
    }
  };

  // ── Xử lý Checkbox ──
  const isAllSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((it) => selectedIds.includes(it.id));
  }, [items, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((it) => it.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ── Xuất Excel ──
  const handleExportExcel = () => {
    if (items.length === 0) {
      showToast('warning', 'Không có dữ liệu để xuất Excel');
      return;
    }
    showToast('success', 'Đã xuất dữ liệu nhật ký hoạt động kho ra tệp Excel');
  };

  return (
    <StandardPage
      title="Nhật ký hoạt động kho"
      description="Biên bản đối soát nhập xuất, kiểm kê định kỳ và đối chiếu số dư sổ sách"
      icon="bi-journal-text"
      color="emerald"
      badge="NHẬT KÝ HOẠT ĐỘNG KHO"
      hideTicker={true}
    >
      {/* Toast thông báo nổi */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold border transition-all animate-bounce-short ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : toastMsg.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : toastMsg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          <i
            className={`bi ${
              toastMsg.type === 'success'
                ? 'bi-check-circle-fill text-emerald-600'
                : toastMsg.type === 'warning'
                ? 'bi-exclamation-triangle-fill text-amber-600'
                : toastMsg.type === 'error'
                ? 'bi-x-circle-fill text-rose-600'
                : 'bi-info-circle-fill text-blue-600'
            }`}
          />
          <span>{toastMsg.message}</span>
        </div>
      )}

      <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* TableToolbar */}
        <TableToolbar
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="Tìm mã chứng từ, đơn hàng, khách hàng, mặt hàng, người thực hiện..."
          searchMinWidth="240px"
          customFilters={
            <div className="flex items-center gap-2 flex-wrap">
              {/* 1. Component lọc theo kho có lọc theo danh mục */}
              <WarehouseCategoryFilter
                warehouse={warehouse}
                onWarehouseChange={(wh) => {
                  setWarehouse(wh);
                  setPage(1);
                }}
                category={category}
                onCategoryChange={(cat) => {
                  setCategory(cat);
                  setPage(1);
                }}
                warehouseMinWidth="165px"
                categoryMinWidth="160px"
              />

              {/* 2. Lọc theo hoạt động */}
              <div style={{ minWidth: '170px', flex: '0 0 auto' }}>
                <Select
                  value={activity}
                  onChange={(e) => {
                    setActivity(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { label: 'Tất cả hoạt động', value: 'all' },
                    { label: 'Nhập kho', value: 'nhap' },
                    { label: 'Xuất kho', value: 'xuat' },
                    { label: 'Điều chỉnh kiểm kê', value: 'dieu-chinh' },
                    { label: 'Luân chuyển kho', value: 'luan-chuyen' },
                  ]}
                  aria-label="Chọn loại hoạt động"
                  style={{ marginBottom: 0 }}
                />
              </div>

              {/* 3. Ô chọn thời gian Từ ngày - Đến ngày */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs h-[38px]">
                <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Từ:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="border-0 bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden p-0 cursor-pointer"
                  style={{ width: '115px' }}
                />
                <span className="text-slate-300 mx-0.5">•</span>
                <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Đến:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="border-0 bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden p-0 cursor-pointer"
                  style={{ width: '115px' }}
                />
              </div>
            </div>
          }
          filters={[]}
          menuItems={[
            {
              id: 'export-excel',
              label: 'Xuất ra bảng Excel',
              icon: <i className="bi bi-file-earmark-excel text-emerald-600 text-sm" />,
              onClick: handleExportExcel,
            },
            {
              id: 'print-report',
              label: 'In nhật ký',
              icon: <i className="bi bi-printer text-blue-600 text-sm" />,
              onClick: () => window.print(),
            },
            {
              id: 'refresh-data',
              label: 'Làm mới dữ liệu',
              icon: <i className="bi bi-arrow-repeat text-purple-600 text-sm" />,
              onClick: fetchAuditLogs,
            },
            {
              id: 'divider',
              label: '',
              divider: true,
              onClick: () => {},
            },
            {
              id: 'auto-cleanup-settings',
              label: 'Thiết lập tự động xoá',
              icon: <i className="bi bi-clock-history text-amber-600 text-sm" />,
              onClick: () => setIsCleanupOffcanvasOpen(true),
            },
          ]}
          printLabel="In nhật ký"
          onPrint={() => window.print()}
          onExportExcel={handleExportExcel}
          onRefresh={fetchAuditLogs}
        />

        {/* Thanh thông báo khi có hàng được chọn */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50/80 px-4 py-1.5 border-b border-blue-100 flex items-center justify-between text-xs text-blue-800">
            <div className="flex items-center gap-2">
              <i className="bi bi-check-circle-fill text-blue-600" />
              <span>
                Đang chọn <b>{selectedIds.length}</b> biên bản biến động kho
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Xác nhận xoá các hoạt động kho đã chọn',
                    message: `Bạn có chắc chắn muốn xoá ${selectedIds.length} hoạt động kho đã chọn khỏi cơ sở dữ liệu? Thao tác này không thể hoàn tác.`,
                    isBatch: true,
                  })
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow-2xs transition-colors cursor-pointer"
              >
                <i className="bi bi-trash-fill text-xs" />
                <span>Xoá {selectedIds.length} mục đã chọn</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          </div>
        )}

        {/* FullWidthTable */}
        <FullWidthTable loading={loading}>
          <table
            className="w-full text-left border-collapse"
            style={{ width: '100%', minWidth: '100%', fontSize: '13px' }}
          >
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                {/* 1. Cột Checkbox */}
                <th className="py-2.5 px-3 w-10 text-center border-0 align-middle">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả các dòng"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>

                {/* 2. Cột Chi tiết biến động kho */}
                <th className="py-2.5 px-4 min-w-[360px] border-0 align-middle">
                  CHI TIẾT BIẾN ĐỘNG KHO
                </th>

                {/* 3. Cột Ghi chú & diễn giải */}
                <th className="py-2.5 px-4 min-w-[320px] border-0 align-middle">
                  GHI CHÚ & DIỄN GIẢI
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400">
                    <i className="bi bi-journal-x text-3xl block mb-2 opacity-50" />
                    Không tìm thấy nhật ký biến động kho nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isNhap = item.activityType === 'nhap';
                  const isXuat = item.activityType === 'xuat';
                  const isDieuChinh = item.activityType === 'dieu-chinh';
                  const isLuanChuyen = item.activityType === 'luan-chuyen';
                  const hasMultiple = Boolean(item.lines && item.lines.length > 1);
                  const isExpanded = expandedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* 1. Checkbox */}
                      <td className="py-3 px-3 text-center align-top pt-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          aria-label={`Chọn bản ghi ${item.soChungTu}`}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* 2. Chi tiết biến động kho */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-start gap-2.5">
                          {/* Nút Chevron không có border, xoay mượt mà */}
                          {hasMultiple ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(item.id)}
                              className="w-6 h-6 shrink-0 mt-0.5 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
                            >
                              <i
                                className={`bi bi-chevron-down text-xs font-semibold transition-transform duration-200 ${
                                  isExpanded ? '' : '-rotate-90'
                                }`}
                              />
                            </button>
                          ) : (
                            <div className="w-6 shrink-0" />
                          )}

                          <div className="flex-1 min-w-0">
                            {/* Dòng 1: Mã phiếu + Badge loại hoạt động */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-indigo-700 tracking-tight">
                                {item.soChungTu}
                              </span>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  isNhap
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : isXuat
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : isDieuChinh
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : isLuanChuyen
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {item.activityLabel}
                              </span>
                            </div>

                            {/* Dòng 2: Thời gian • Người thực hiện */}
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>{item.thoiGianFormatted}</span>
                              <span className="text-slate-300">•</span>
                              <div className="flex items-center gap-1">
                                <i className="bi bi-person text-slate-400 text-xs" />
                                <span>
                                  Người thực hiện: <b className="font-medium text-slate-700">{item.nguoiThucHien}</b>
                                </span>
                              </div>
                            </div>

                            {/* Danh sách mặt hàng: Hiển thị như hình 2 */}
                            {(!hasMultiple || isExpanded) && (
                              <div className="mt-2.5 space-y-2">
                                {(item.lines && item.lines.length > 0
                                  ? item.lines
                                  : [
                                      {
                                        id: item.id,
                                        itemId: item.itemId || '',
                                        itemCode: item.itemCode || 'N/A',
                                        itemName: item.itemName || 'Mặt hàng',
                                        itemUnit: item.itemUnit || 'cái',
                                        soLuong: item.soLuong || 0,
                                        soLuongTruoc: item.soLuongTruoc,
                                        soLuongSau: item.soLuongSau,
                                        warehouseName: item.warehouseName,
                                      },
                                    ]
                                ).map((line, idx) => {
                                  const whName =
                                    line.fromWarehouseName ||
                                    line.toWarehouseName ||
                                    line.warehouseName ||
                                    item.warehouseName;
                                  const whPrefix = isNhap ? 'Vào:' : isXuat ? 'Từ:' : 'Kho:';

                                  return (
                                    <div
                                      key={line.id || idx}
                                      className={idx > 0 ? 'pt-2 border-t border-dashed border-slate-200' : ''}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className="text-slate-400 font-mono text-sm leading-none mt-0.5 select-none">
                                          ↳
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          {/* Mã hàng + Tên mặt hàng (font thường) */}
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                              {line.itemCode}
                                            </span>
                                            <span className="font-normal text-slate-800 text-sm">
                                              {line.itemName}
                                            </span>
                                          </div>

                                          {/* Số lượng • Từ/Vào Kho • Tồn trước ➔ Tồn sau */}
                                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                                            <span>
                                              Số lượng:{' '}
                                              <b
                                                className={`font-mono font-bold ${
                                                  isNhap
                                                    ? 'text-emerald-700'
                                                    : isXuat
                                                    ? 'text-slate-900'
                                                    : 'text-purple-700'
                                                }`}
                                              >
                                                {isNhap
                                                  ? `+${line.soLuong}`
                                                  : isXuat
                                                  ? `-${line.soLuong}`
                                                  : line.soLuong}{' '}
                                                {line.itemUnit}
                                              </b>
                                            </span>

                                            <span className="text-slate-300">•</span>

                                            <span>
                                              {whPrefix}{' '}
                                              <b className="font-semibold text-slate-800">{whName}</b>
                                            </span>

                                            {line.soLuongTruoc !== null &&
                                            line.soLuongTruoc !== undefined &&
                                            line.soLuongSau !== null &&
                                            line.soLuongSau !== undefined ? (
                                              <>
                                                <span className="text-slate-300">•</span>
                                                <span className="text-slate-600">
                                                  Tồn:{' '}
                                                  <span className="font-mono">
                                                    {line.soLuongTruoc} ➔{' '}
                                                    <b className="text-slate-900">{line.soLuongSau}</b>
                                                  </span>
                                                </span>
                                              </>
                                            ) : line.soLuongSau !== null && line.soLuongSau !== undefined ? (
                                              <>
                                                <span className="text-slate-300">•</span>
                                                <span className="text-slate-600">
                                                  Tồn:{' '}
                                                  <b className="font-mono text-slate-900">
                                                    {line.soLuongSau}
                                                  </b>{' '}
                                                  {line.itemUnit}
                                                </span>
                                              </>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Ghi chú & diễn giải kèm Nút Xoá */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-800 font-medium leading-relaxed">
                              {item.lyDo}
                            </div>

                            {(item.orderCode || item.customerName || item.customerAddress) && (
                              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
                                {item.orderCode && (
                                  <span className="inline-flex items-center gap-1">
                                    <i className="bi bi-receipt text-slate-400 text-[11px]" />
                                    <span>Đơn hàng:</span>
                                    <b className="font-mono font-semibold text-blue-600">
                                      {item.orderCode}
                                    </b>
                                  </span>
                                )}
                                {item.orderCode && (item.customerName || item.customerAddress) && (
                                  <span className="text-slate-300">•</span>
                                )}
                                {item.customerName && (
                                  <span className="inline-flex items-center gap-1">
                                    <i className="bi bi-person text-slate-400 text-[11px]" />
                                    <span>
                                      {item.partnerType === 'supplier' ? 'Nhà cung cấp:' : 'Khách hàng:'}
                                    </span>
                                    <b className="font-semibold text-slate-800">
                                      {item.customerName}
                                    </b>
                                  </span>
                                )}
                                {item.customerName && item.customerAddress && (
                                  <span className="text-slate-300">•</span>
                                )}
                                {item.customerAddress && (
                                  <span className="inline-flex items-center gap-1">
                                    <i className="bi bi-geo-alt text-slate-400 text-[11px]" />
                                    <span>Địa chỉ:</span>
                                    <span className="text-slate-700">{item.customerAddress}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {item.ghiChu && item.ghiChu !== item.lyDo && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1">
                                <i className="bi bi-info-circle text-slate-400 text-[10px]" />
                                <span>{item.ghiChu}</span>
                              </div>
                            )}
                          </div>

                          {/* Nút Xoá bản ghi */}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Xác nhận xoá hoạt động kho',
                                message: `Bạn có chắc chắn muốn xoá chứng từ ${item.soChungTu} (${item.activityLabel}) khỏi cơ sở dữ liệu? Thao tác này không thể hoàn tác.`,
                                targetId: item.soChungTu || item.id,
                                isBatch: false,
                              })
                            }
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title={`Xoá chứng từ ${item.soChungTu}`}
                          >
                            <i className="bi bi-trash text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </FullWidthTable>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[10, 15, 30, 50]}
          itemName="hoạt động"
        />
      </div>

      {/* ConfirmDialog Modal xác nhận xoá */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all">
            <div className="p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <i className="bi bi-exclamation-triangle-fill text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200/70 border border-slate-300 transition-colors cursor-pointer"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer"
              >
                <i className="bi bi-trash-fill text-xs" />
                <span>Xác nhận xoá</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Offcanvas Thiết lập tự động xoá (Rộng 400px) */}
      <Offcanvas
        isOpen={isCleanupOffcanvasOpen}
        onClose={() => setIsCleanupOffcanvasOpen(false)}
        title="Thiết lập tự động xoá"
        description="Cấu hình hệ thống tự động dọn dẹp các dữ liệu cũ"
        icon={<i className="bi bi-clock-history text-amber-500 text-lg" />}
        width="400px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsCleanupOffcanvasOpen(false)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSaveCleanupSettings}
              disabled={savingCleanup}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingCleanup ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin text-xs" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check2 text-xs" />
                  <span>Lưu thiết lập</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="p-4 space-y-5 text-slate-700">
          {/* 1. Switch Bật / Tắt */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-800">
                Tự động dọn dẹp định kỳ
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {cleanupEnabled ? 'Hệ thống đang bật tính năng dọn dẹp' : 'Đang tạm dừng tự động dọn dẹp'}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cleanupEnabled}
                onChange={(e) => setCleanupEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* 2. Thời gian lưu trữ dữ liệu */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Xoá dữ liệu cũ hơn:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '30 ngày', value: 30 },
                { label: '60 ngày', value: 60 },
                { label: '90 ngày', value: 90, recommended: true },
                { label: '180 ngày', value: 180 },
                { label: '1 năm', value: 365 },
              ].map((opt) => {
                const isSelected = !isCustomDays && retentionDays === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectDays(opt.value)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {opt.label}
                    {opt.recommended && (
                      <span className="block text-[9px] font-normal text-blue-600">Gợi ý</span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsCustomDays(true)}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                  isCustomDays
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                Tuỳ chỉnh
              </button>
            </div>

            {isCustomDays && (
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDays}
                  onChange={(e) => handleCustomDaysChange(e.target.value)}
                  placeholder="Nhập số ngày..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-xs text-slate-500 font-medium">ngày</span>
              </div>
            )}
          </div>

          {/* 3. Tuỳ chọn bảo lưu kiểm kê */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={keepStockCounts}
                onChange={(e) => setKeepStockCounts(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-800">
                  Bảo lưu chứng từ cân bằng kiểm kê
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Không xoá các biên bản điều chỉnh số liệu kiểm kho định kỳ để phục vụ kiểm toán tài chính.
                </div>
              </div>
            </label>
          </div>

          {/* 4. Khối thống kê & tác vụ dọn dẹp */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
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
                <span className="text-slate-500">Số bản ghi cũ phù hợp:</span>
                <span className="font-mono font-bold text-rose-600">
                  {eligibleCount} bản ghi
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                <span className="text-slate-400">Lần chạy gần nhất:</span>
                <span className="text-slate-600 font-mono">
                  {lastCleanupInfo?.lastRunAt
                    ? new Date(lastCleanupInfo.lastRunAt).toLocaleString('vi-VN')
                    : 'Chưa chạy lần nào'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
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
                    <span>Dọn dẹp ngay {eligibleCount} bản ghi cũ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Offcanvas>
    </StandardPage>
  );
};

export default LogisticsAuditLogsPage;
