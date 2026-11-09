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
  partnerType?: 'customer' | 'supplier' | null;
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

      const dataRows = items.map((it: any, idx: number) => {
        const itemNames = (it.lines || []).map((l: any) => l.itemName).filter(Boolean).join(', ') || it.title || '';
        const itemCodes = (it.lines || []).map((l: any) => l.itemCode).filter(Boolean).join(', ') || '';
        const totalQty = (it.lines || []).reduce((sum: number, l: any) => sum + (Number(l.soLuong) || 0), 0) || it.soLuong || 0;

        return [
          idx + 1,
          it.code || it.soPhieu || `NK-${idx + 1}`,
          new Date(it.createdAt).toLocaleDateString('vi-VN'),
          it.typeLabel || it.type || 'Hoạt động kho',
          itemCodes,
          itemNames,
          totalQty,
          it.warehouseName || it.fromWarehouseName || it.toWarehouseName || 'Kho chính',
          it.actorName || it.nguoiThucHien || 'Hệ thống',
          it.note || it.lyDo || it.description || '',
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
          ['STT', 'Mã chứng từ', 'Ngày thực hiện', 'Loại biến động', 'Mã vật tư', 'Tên vật tư, hàng hóa', 'Tổng số lượng', 'Kho áp dụng', 'Người thực hiện', 'Diễn giải / Ghi chú'],
        ],
        columnsWidths: [6, 16, 14, 18, 16, 36, 14, 18, 18, 28],
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
      width: '180px',
      render: (it: AuditLogItem) => (
        <div className="flex flex-col">
          <span className="font-bold text-xs text-blue-700 hover:underline cursor-pointer">
            {it.soChungTu}
          </span>
          {it.orderCode && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <i className="bi bi-cart-check text-slate-400" />
              <span>{it.orderCode}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'thoiGian',
      title: 'Thời gian thực hiện',
      width: '145px',
      render: (it: AuditLogItem) => (
        <div className="flex flex-col text-xs text-slate-700">
          <span className="font-medium">{it.thoiGianFormatted}</span>
          <span className="text-[10.5px] text-slate-400">
            {new Date(it.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
      ),
    },
    {
      key: 'activityType',
      title: 'Hoạt động',
      width: '135px',
      render: (it: AuditLogItem) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${
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
      ),
    },
    {
      key: 'items',
      title: 'Chi tiết hàng hoá & biến động',
      render: (it: AuditLogItem) => {
        const isExpanded = expandedIds.includes(it.id);
        const hasLines = it.lines && it.lines.length > 0;

        return (
          <div className="flex flex-col gap-1 py-1">
            {/* Tóm tắt nhanh */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {it.itemName ? (
                <>
                  <span className="font-semibold text-slate-800">{it.itemName}</span>
                  {it.itemCode && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      ({it.itemCode})
                    </span>
                  )}
                  <span className="font-bold text-slate-900">
                    {it.soLuong !== undefined ? it.soLuong.toLocaleString('vi-VN') : 0}{' '}
                    {it.itemUnit || 'sp'}
                  </span>
                </>
              ) : (
                <span className="font-medium text-slate-700">
                  {it.linesCount || (it.lines ? it.lines.length : 0)} mặt hàng (Tổng SL:{' '}
                  <strong className="text-slate-900">
                    {it.tongSoLuong?.toLocaleString('vi-VN') || 0}
                  </strong>
                  )
                </span>
              )}

              {it.customerName && (
                <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {it.customerName}
                </span>
              )}
            </div>

            {/* Bảng chi tiết con khi bấm mở rộng */}
            {isExpanded && hasLines && (
              <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/70 p-2 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                      <th className="py-1 px-2 font-semibold">Mã</th>
                      <th className="py-1 px-2 font-semibold">Tên hàng</th>
                      <th className="py-1 px-2 font-semibold text-right">Số lượng</th>
                      <th className="py-1 px-2 font-semibold">ĐVT</th>
                      <th className="py-1 px-2 font-semibold text-right">Trước</th>
                      <th className="py-1 px-2 font-semibold text-right">Sau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {it.lines!.map((line, lIdx) => (
                      <tr
                        key={line.id || lIdx}
                        className="border-b border-slate-200/50 hover:bg-white text-slate-700 text-[11px]"
                      >
                        <td className="py-1 px-2 font-mono text-slate-600">{line.itemCode}</td>
                        <td className="py-1 px-2 font-medium">{line.itemName}</td>
                        <td className="py-1 px-2 text-right font-bold text-slate-900">
                          {line.soLuong?.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-1 px-2 text-slate-500">{line.itemUnit}</td>
                        <td className="py-1 px-2 text-right text-slate-500">
                          {line.soLuongTruoc !== null && line.soLuongTruoc !== undefined
                            ? line.soLuongTruoc.toLocaleString('vi-VN')
                            : '-'}
                        </td>
                        <td className="py-1 px-2 text-right text-slate-500">
                          {line.soLuongSau !== null && line.soLuongSau !== undefined
                            ? line.soLuongSau.toLocaleString('vi-VN')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        searchPlaceholder="Tìm mã chứng từ, đơn hàng, khách hàng, mặt hàng, người thực hiện..."
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

      {/* Bảng Dữ liệu FullWidthTable */}
      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        <FullWidthTable
          loading={loading}
          emptyText="Không có nhật ký hoạt động kho nào phù hợp với bộ lọc tìm kiếm"
        >
          <table className="w-full text-left border-collapse logistics-overview-compact-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width, textAlign: col.align || 'left' }}
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
                items.map((it) => (
                  <tr
                    key={it.id}
                    className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{ textAlign: col.align || 'left' }}
                        className="py-2.5 px-3 align-top"
                      >
                        {col.render(it)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </FullWidthTable>
      </div>

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

