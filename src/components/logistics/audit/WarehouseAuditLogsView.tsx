import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TableToolbar, type TableToolbarMenuItem } from '@/components/common/TableToolbar';
import { FullWidthTable } from '@/components/common/FullWidthTable';
import { Pagination } from '@/components/common/Pagination';
import { WarehouseCategoryFilter } from '@/components/common/WarehouseCategoryFilter';
import { Select } from '@/components/common/Select';
import { DatePicker } from '@/components/common/DatePicker';
import { Offcanvas } from '@/components/common/Offcanvas';
import { DataRetentionOffcanvas } from '@/components/common/DataRetentionOffcanvas';
import { exportStandardReportExcel } from '@/utils/excelExport';

export interface ToastState {
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
  partnerName?: string | null;
  partnerCode?: string | null;
  partnerPhone?: string | null;
  partnerAddress?: string | null;
  partnerType?: 'customer' | 'supplier' | 'internal' | null;
  partnerSubLabel?: string | null;
  tongSoLuong?: number;
  linesCount?: number;
  lines?: AuditLogLine[];
}

export interface WarehouseAuditLogsViewProps {
  onShowToast?: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
  className?: string;
}

export const WarehouseAuditLogsView: React.FC<WarehouseAuditLogsViewProps> = ({
  onShowToast,
  className = '',
}) => {
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

  // ── State cho Toast thông báo nội bộ ──
  const [toastMsg, setToastMsg] = useState<ToastState | null>(null);
  const showToast = useCallback((type: ToastState['type'], message: string) => {
    if (onShowToast) {
      onShowToast(type, type === 'success' ? 'Thành công' : type === 'warning' ? 'Cảnh báo' : 'Thông báo', message);
    }
    setToastMsg({ type, message });
    setTimeout(() => {
      setToastMsg((curr) => (curr?.message === message ? null : curr));
    }, 3500);
  }, [onShowToast]);

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

  // ── Xuất Excel (Định dạng chuẩn bản in) ──
  const handleExportExcel = () => {
    if (items.length === 0) {
      showToast('warning', 'Không có dữ liệu để xuất Excel');
      return;
    }

    try {
      const today = new Date();
      const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

      const dataRows = items.map((it, idx) => {
        const itemNames = (it.lines || []).map((l) => l.itemName).filter(Boolean).join(', ') || it.itemName || '';
        const itemCodes = (it.lines || []).map((l) => l.itemCode).filter(Boolean).join(', ') || it.itemCode || '';
        const totalQty = (it.lines || []).reduce((sum, l) => sum + (Number(l.soLuong) || 0), 0) || it.tongSoLuong || it.soLuong || 0;
        const partnerText = it.partnerName || it.customerName || '—';

        return [
          idx + 1,
          it.soChungTu || `NK-${idx + 1}`,
          new Date(it.createdAt).toLocaleDateString('vi-VN'),
          it.activityLabel || 'Hoạt động kho',
          partnerText,
          itemCodes,
          itemNames,
          totalQty,
          it.warehouseName || it.fromWarehouseName || it.toWarehouseName || 'Kho chính',
          it.nguoiThucHien || 'Hệ thống',
          it.lyDo || it.ghiChu || '',
        ];
      });

      exportStandardReportExcel({
        fileName: `Nhat_Ky_Hoat_Dong_Kho_${today.toISOString().split('T')[0]}`,
        sheetName: 'Nhat_Ky_Kho',
        formCode: 'Mẫu số 03-VT',
        title: 'NHẬT KÝ HOẠT ĐỘNG VÀ BIẾN ĐỘNG KHO',
        subtitle: `Thời điểm kết xuất: Ngày ${dateFormatted}`,
        extraInfo: [
          'Hệ thống quản trị chuỗi cung ứng Seajong ERP',
        ],
        headers: [
          ['STT', 'Mã chứng từ', 'Ngày thực hiện', 'Loại biến động', 'Nhà cung cấp / Khách hàng', 'Mã vật tư', 'Tên vật tư, hàng hóa', 'Tổng số lượng', 'Kho áp dụng', 'Người thực hiện', 'Diễn giải / Ghi chú'],
        ],
        columnsWidths: [6, 18, 14, 18, 28, 16, 34, 14, 20, 18, 28],
        data: dataRows,
        signatures: ['Người lập biểu', 'Thủ kho trưởng', 'Kế toán trưởng', 'Giám đốc'],
      });

      showToast('success', `Đã xuất ${items.length} biên bản nhật ký ra file Excel thành công`);
    } catch (err) {
      console.error('Lỗi xuất Excel nhật ký:', err);
      showToast('error', 'Lỗi khi xuất file Excel');
    }
  };

  const columns: Array<{
    key: string;
    title: React.ReactNode;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render: (it: AuditLogItem) => React.ReactNode;
  }> = [
    {
      key: 'checkbox',
      title: (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleSelectAll}
            aria-label="Chọn tất cả các dòng"
            className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      ),
      width: '40px',
      align: 'center',
      render: (it: AuditLogItem) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedIds.includes(it.id)}
            onChange={() => toggleSelect(it.id)}
            aria-label={`Chọn chứng từ ${it.soChungTu}`}
            className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      ),
    },
    {
      key: 'expand',
      title: '',
      width: '36px',
      align: 'center',
      render: (it: AuditLogItem) => {
        const hasLines = it.lines && it.lines.length > 0;
        if (!hasLines) return null;
        const isExpanded = expandedIds.includes(it.id);
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(it.id);
            }}
            title={isExpanded ? 'Thu gọn danh sách mặt hàng' : 'Xem chi tiết các mặt hàng'}
            className={`w-6 h-6 flex items-center justify-center rounded-md border text-xs transition-all cursor-pointer ${
              isExpanded
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'}`} />
          </button>
        );
      },
    },
    {
      key: 'soChungTu',
      title: 'Mã chứng từ / Đơn hàng',
      width: '195px',
      render: (it: AuditLogItem) => {
        const count = it.lines?.length || it.linesCount || 0;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-blue-700 hover:underline cursor-pointer">
                {it.soChungTu}
              </span>
              {count > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {count} mặt hàng
                </span>
              )}
            </div>
            {it.orderCode && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <i className="bi bi-cart-check text-slate-400" />
                <span>{it.orderCode}</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'thoiGian',
      title: 'Thời gian & Hoạt động',
      width: '175px',
      render: (it: AuditLogItem) => (
        <div className="flex flex-col items-start gap-1 text-xs text-slate-700">
          <span className="font-medium text-slate-800">{it.thoiGianFormatted}</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide border ${
              it.activityType === 'nhap'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : it.activityType === 'xuat'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : it.activityType === 'dieu-chinh'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-purple-50 text-purple-700 border-purple-200'
            }`}
          >
            {it.activityLabel}
          </span>
        </div>
      ),
    },
    {
      key: 'partner',
      title: 'Nhà cung cấp / Khách hàng',
      render: (it: AuditLogItem) => {
        const isProductionIn =
          it.activityType === 'nhap' && /nhập từ sản xuất/i.test(it.lyDo || '');
        const isReturnIn =
          it.activityType === 'nhap' && /trả lại|thu hồi|hoàn trả/i.test(it.lyDo || '');

        let resolvedType = it.partnerType || null;
        let resolvedName = it.partnerName || it.customerName || '';
        let resolvedAddress = it.partnerAddress || it.customerAddress || '';
        let badgeLabel = it.partnerSubLabel || '';

        if (it.activityType === 'nhap') {
          if (resolvedType === 'supplier' || (!resolvedType && it.orderCode?.startsWith('DH-'))) {
            resolvedType = 'supplier';
            badgeLabel = badgeLabel || 'Nhà cung cấp';
          } else if (isProductionIn) {
            resolvedType = 'internal';
            resolvedName = it.partnerName || 'Phân xưởng sản xuất & lắp ráp';
            resolvedAddress = '';
            badgeLabel = 'Nội bộ sản xuất';
          } else if (resolvedName && isReturnIn) {
            resolvedType = 'customer';
            badgeLabel = badgeLabel || 'Khách hoàn trả';
          } else if (resolvedName && resolvedType === 'customer' && !isReturnIn) {
            // Tránh hiển thị nhầm khách hàng khi phiếu nhập chưa rõ nguồn đơn mua
            resolvedType = 'supplier';
            badgeLabel = badgeLabel || 'Đối tác nhập';
          }
        } else if (it.activityType === 'xuat') {
          if (resolvedName && resolvedType !== 'internal') {
            resolvedType = 'customer';
            badgeLabel = badgeLabel || 'Khách hàng';
          } else if (!resolvedName && /phân xưởng|sản xuất/i.test(it.lyDo || '')) {
            resolvedType = 'internal';
            resolvedName = 'Phân xưởng sản xuất & lắp ráp';
            badgeLabel = 'Xuất sản xuất';
          }
        }

        if (!resolvedName) {
          return (
            <span className="text-xs text-slate-400 italic">
              {it.activityType === 'dieu-chinh'
                ? 'Kiểm kê kho nội bộ'
                : it.activityType === 'luan-chuyen'
                ? 'Luân chuyển nội bộ'
                : '—'}
            </span>
          );
        }

        const badgeStyles =
          resolvedType === 'supplier'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : resolvedType === 'customer'
            ? isReturnIn
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-slate-100 text-slate-600 border-slate-200';

        return (
          <div className="flex flex-col gap-0.5 text-xs min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {badgeLabel && (
                <span
                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border shrink-0 ${badgeStyles}`}
                >
                  {badgeLabel}
                </span>
              )}
              <span className="font-semibold text-slate-800">{resolvedName}</span>
            </div>
            {resolvedAddress && (
              <div
                className="flex items-center gap-1 text-[11px] text-slate-500"
                title={resolvedAddress}
              >
                <i className="bi bi-geo-alt text-[10px] text-slate-400 shrink-0" />
                <span className="truncate max-w-[380px]">{resolvedAddress}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'warehouse',
      title: 'Kho / Địa điểm',
      width: '160px',
      render: (it: AuditLogItem) => (
        <div className="flex flex-col text-xs text-slate-700">
          <span className="font-semibold text-slate-800">{it.warehouseName || 'Kho chính'}</span>
          {it.fromWarehouseName && it.toWarehouseName && (
            <span className="text-[11px] text-slate-500">
              {it.fromWarehouseName} ➔ {it.toWarehouseName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'nguoiThucHien',
      title: 'Người thực hiện',
      width: '140px',
      render: (it: AuditLogItem) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">
            {(it.nguoiThucHien || 'HT').charAt(0).toUpperCase()}
          </div>
          <span className="font-medium truncate max-w-[100px]">{it.nguoiThucHien || 'Hệ thống'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: '',
      width: '50px',
      align: 'center',
      render: (it: AuditLogItem) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDialog({
              isOpen: true,
              title: 'Xoá hoạt động kho',
              message: `Bạn có chắc chắn muốn xoá chứng từ hoạt động ${it.soChungTu}? Hành động này sẽ xoá bản ghi kiểm toán này khỏi hệ thống.`,
              targetId: it.id,
            });
          }}
          title="Xoá bản ghi này"
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <i className="bi bi-trash text-sm" />
        </button>
      ),
    },
  ];

  return (
    <div className={`flex flex-col h-full flex-1 overflow-hidden ${className}`} style={{ minHeight: 0 }}>
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

      {/* TableToolbar */}
      <TableToolbar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm mã chứng từ, đơn hàng, nhà cung cấp, khách hàng, mặt hàng..."
        searchMinWidth="240px"
        showMenu={true}
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
            <div className="flex items-center gap-2 shrink-0">
              <div style={{ width: '160px' }}>
                <DatePicker
                  prefix="Từ:"
                  value={fromDate}
                  onChange={(val) => {
                    setFromDate(val);
                    setPage(1);
                  }}
                  placeholder="dd/mm/yyyy"
                  clearable={true}
                />
              </div>
              <div style={{ width: '165px' }}>
                <DatePicker
                  prefix="Đến:"
                  value={toDate}
                  onChange={(val) => {
                    setToDate(val);
                    setPage(1);
                  }}
                  placeholder="dd/mm/yyyy"
                  clearable={true}
                />
              </div>
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
            label: 'Thiết lập thời gian lưu trữ',
            icon: <i className="bi bi-clock-history text-amber-600 text-sm" />,
            onClick: () => setIsCleanupOffcanvasOpen(true),
          },
        ]}
        rightActions={
          <div className="flex items-center gap-2 shrink-0">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Xoá các hoạt động kho đã chọn',
                    message: `Bạn có chắc chắn muốn xoá ${selectedIds.length} bản ghi nhật ký kho đã chọn? Hành động này sẽ được ghi nhận và không thể hoàn tác.`,
                    isBatch: true,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer"
              >
                <i className="bi bi-trash-fill text-xs" />
                <span>Xoá ({selectedIds.length})</span>
              </button>
            )}
          </div>
        }
      />

      {/* Bảng Dữ liệu FullWidthTable (Sticky Header chuẩn) */}
      <FullWidthTable
        loading={loading}
        emptyText="Không có nhật ký hoạt động kho nào phù hợp với bộ lọc tìm kiếm"
      >
        <table className="w-full text-left border-collapse logistics-overview-compact-table" style={{ fontSize: '13px' }}>
          <thead className="sticky top-0 z-20 bg-slate-50">
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    backgroundColor: '#f8fafc',
                    boxShadow: 'inset 0 -1px 0 #e2e8f0',
                  }}
                  className="py-2.5 px-3 font-semibold text-slate-600"
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-slate-400 font-medium">
                  Không có nhật ký hoạt động kho nào phù hợp với bộ lọc tìm kiếm
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const isExpanded = expandedIds.includes(it.id);
                const hasLines = Boolean(it.lines && it.lines.length > 0);
                const totalQty =
                  it.tongSoLuong ??
                  (it.lines || []).reduce((sum, l) => sum + (Number(l.soLuong) || 0), 0);

                return (
                  <React.Fragment key={it.id}>
                    <tr
                      onClick={() => {
                        if (hasLines) toggleExpand(it.id);
                      }}
                      className={`border-b border-slate-100 transition-colors ${
                        hasLines ? 'cursor-pointer' : ''
                      } ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'}`}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          style={{ textAlign: col.align || 'left' }}
                          className="py-2.5 px-3 align-middle"
                        >
                          {col.render(it)}
                        </td>
                      ))}
                    </tr>

                    {isExpanded && hasLines && (
                      <tr className="bg-slate-50/70 border-b border-slate-200">
                        <td colSpan={columns.length} style={{ padding: 0 }}>
                          <div className="px-4 py-3 bg-slate-50/90 border-t border-slate-200/70">
                            <div className="flex items-center justify-between gap-3 flex-wrap mb-2 text-xs">
                              <div className="flex items-center gap-2 font-semibold text-slate-700">
                                <i className="bi bi-box-seam text-blue-600" />
                                <span>
                                  Danh sách hàng hoá thuộc chứng từ{' '}
                                  <span className="text-blue-700 font-bold">{it.soChungTu}</span>
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600">
                                  {it.lines!.length} mặt hàng (Tổng SL:{' '}
                                  <strong className="text-slate-900">
                                    {totalQty.toLocaleString('vi-VN')}
                                  </strong>
                                  )
                                </span>
                              </div>
                              {it.lyDo && (
                                <span className="text-[11px] text-slate-500 truncate max-w-[520px]" title={it.lyDo}>
                                  Diễn giải: {it.lyDo}
                                </span>
                              )}
                            </div>

                            <div className="w-full border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider">
                                    <th className="py-2 px-3 font-semibold text-center" style={{ width: '52px', position: 'static' }}>
                                      STT
                                    </th>
                                    <th className="py-2 px-3 font-semibold" style={{ width: '160px', position: 'static' }}>
                                      Mã hàng hoá
                                    </th>
                                    <th className="py-2 px-3 font-semibold" style={{ position: 'static' }}>
                                      Tên vật tư / Hàng hoá
                                    </th>
                                    <th className="py-2 px-3 font-semibold text-center" style={{ width: '90px', position: 'static' }}>
                                      ĐVT
                                    </th>
                                    <th className="py-2 px-3 font-semibold" style={{ width: '210px', position: 'static' }}>
                                      Kho áp dụng
                                    </th>
                                    <th className="py-2 px-3 font-semibold text-right" style={{ width: '120px', position: 'static' }}>
                                      Tồn trước
                                    </th>
                                    <th className="py-2 px-3 font-semibold text-right" style={{ width: '130px', position: 'static' }}>
                                      Biến động
                                    </th>
                                    <th className="py-2 px-3 font-semibold text-right" style={{ width: '120px', position: 'static' }}>
                                      Tồn sau
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {it.lines!.map((line, lIdx) => {
                                    const signPrefix =
                                      it.activityType === 'nhap'
                                        ? '+'
                                        : it.activityType === 'xuat'
                                        ? '-'
                                        : '';
                                    const qtyColor =
                                      it.activityType === 'nhap'
                                        ? 'text-emerald-700'
                                        : it.activityType === 'xuat'
                                        ? 'text-blue-700'
                                        : 'text-slate-900';

                                    return (
                                      <tr
                                        key={line.id || lIdx}
                                        className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50/70 text-slate-700 text-xs"
                                      >
                                        <td className="py-2 px-3 text-center text-slate-400 font-medium">
                                          {lIdx + 1}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-[11.5px] font-semibold text-slate-700">
                                          {line.itemCode}
                                        </td>
                                        <td className="py-2 px-3 font-medium text-slate-800">
                                          {line.itemName}
                                        </td>
                                        <td className="py-2 px-3 text-center text-slate-500">
                                          {line.itemUnit}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600 text-[11.5px]">
                                          {line.warehouseName || it.warehouseName || 'Kho chính'}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-500 tabular-nums">
                                          {line.soLuongTruoc !== null && line.soLuongTruoc !== undefined
                                            ? line.soLuongTruoc.toLocaleString('vi-VN')
                                            : '—'}
                                        </td>
                                        <td className={`py-2 px-3 text-right font-bold tabular-nums ${qtyColor}`}>
                                          {signPrefix}
                                          {line.soLuong?.toLocaleString('vi-VN')}
                                        </td>
                                        <td className="py-2 px-3 text-right font-semibold text-slate-800 tabular-nums">
                                          {line.soLuongSau !== null && line.soLuongSau !== undefined
                                            ? line.soLuongSau.toLocaleString('vi-VN')
                                            : '—'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </FullWidthTable>

      {/* Pagination Component chuẩn của hệ thống */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <Pagination
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
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

      {/* Offcanvas Thiết lập thời gian lưu trữ (Component dùng chung) */}
      <DataRetentionOffcanvas
        isOpen={isCleanupOffcanvasOpen}
        onClose={() => setIsCleanupOffcanvasOpen(false)}
        ticketType="AUDIT_LOGS"
        title="Thiết lập thời gian lưu trữ"
        description="Cấu hình tự động dọn dẹp các chứng từ nhập, xuất và kiểm kho đã lưu trữ"
        entityLabel="bản ghi"
        onCleanedUp={fetchAuditLogs}
      />
    </div>
  );
};

export default WarehouseAuditLogsView;

