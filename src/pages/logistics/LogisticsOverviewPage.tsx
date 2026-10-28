import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes,
  ListTask,
  Check2Circle,
  FileEarmarkExcel,
  PlusLg,
  Search,
  Eye,
  CheckLg,
  BoxSeam,
  ArrowDownLeftCircle,
  ArrowUpRightCircle,
  ClockHistory,
  ExclamationTriangle,
  Building,
  PersonCheck,
  CalendarCheck,
  Tag,
  Printer,
  Trash,
  ChevronLeft,
  ChevronRight,
  FileEarmarkText,
} from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar, type TableToolbarFilter } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LOGISTICS_TICKER_ITEMS } from '../../components/layout/DynamicTicker';
import type { ModernStepItem } from '../../types';

// Định dạng tiền tệ VND
const formatVND = (val?: number | string | null): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0 ₫';
  return Number(val).toLocaleString('vi-VN') + ' ₫';
};

// Cấu hình 3 bước theo yêu cầu
const LOGISTICS_STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'tasks',
    title: 'Danh sách công việc',
    desc: 'Lệnh xuất nhập, cấp phát & kiểm kê',
    badge: 'ĐANG XỬ LÝ',
    icon: <ListTask size={16} />,
  },
  {
    num: 2,
    id: 'inventory',
    title: 'Danh sách hàng hoá',
    desc: 'Tồn kho thực tế & vị trí lưu trữ',
    badge: 'KHO THỰC TẾ',
    icon: <Boxes size={16} />,
  },
  {
    num: 3,
    id: 'completed',
    title: 'Đã hoàn thành',
    desc: 'Lịch sử phiếu kho & nhật ký hoàn tất',
    badge: 'HOÀN TẤT',
    icon: <Check2Circle size={16} />,
  },
];

export const LogisticsOverviewPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Search & Filter chung
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);

  // Selections
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<Set<string>>(new Set());
  const [selectedCompletedIds, setSelectedCompletedIds] = useState<Set<string>>(new Set());

  // Dữ liệu từ DB
  const [tasks, setTasks] = useState<any[]>([]);
  const [totalTasks, setTotalTasks] = useState<number>(0);

  const [inventory, setInventory] = useState<any[]>([]);
  const [totalInventory, setTotalInventory] = useState<number>(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all');

  const [completedList, setCompletedList] = useState<any[]>([]);
  const [totalCompleted, setTotalCompleted] = useState<number>(0);

  // Modals & Dialogs
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState<boolean>(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: 'high',
    dueDate: '',
  });

  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
  const [showToastMsg, setShowToastMsg] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Vị trí ảnh đang xem trong slide hình ảnh Offcanvas
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isSlidePaused, setIsSlidePaused] = useState<boolean>(false);

  useEffect(() => {
    setActiveImageIndex(0);
    setFailedImages(new Set());
    setIsSlidePaused(false);
  }, [selectedDetailItem]);

  // Tự động chuyển slide ảnh sau mỗi 3.5 giây khi có từ 2 ảnh hợp lệ trở lên
  useEffect(() => {
    if (!selectedDetailItem || selectedDetailItem.itemCategory !== 'inventory' || isSlidePaused) return;
    const rawImages: string[] = Array.isArray(selectedDetailItem.images) && selectedDetailItem.images.length > 0
      ? selectedDetailItem.images
      : selectedDetailItem.imageUrl
      ? [selectedDetailItem.imageUrl]
      : [];
    const validCount = rawImages.filter((u) => !failedImages.has(u)).length;
    if (validCount <= 1) return;

    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % validCount);
    }, 3500);

    return () => clearInterval(timer);
  }, [selectedDetailItem, failedImages, isSlidePaused]);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setShowToastMsg({ type, message });
    setTimeout(() => setShowToastMsg(null), 3500);
  };

  // In phiếu xuất nhập kho hoàn tất
  const handlePrintVoucher = (item: any) => {
    if (!item) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const itemsHtml = (item.items || [])
      .map(
        (it: any, idx: number) => `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">
            <div style="font-weight: 600;">${it.itemName || ''}</div>
            ${it.itemCode ? `<div style="font-size: 11px; color: #64748b; font-family: monospace;">SKU: ${it.itemCode}</div>` : ''}
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${it.unit || 'cái'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-weight: bold; color: ${item.type === 'INBOUND' ? '#047857' : '#0369a1'};">
            ${item.type === 'INBOUND' ? '+' : '-'}${it.quantity || 0}
          </td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>In phiếu ${item.code}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #0f172a; margin: 0; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; }
          .company { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .sub-company { font-size: 12px; color: #64748b; margin-top: 2px; }
          .title { font-size: 22px; font-weight: 800; margin-top: 14px; text-transform: uppercase; color: #0f172a; }
          .code { font-size: 13px; font-family: monospace; font-weight: bold; color: #0369a1; margin-top: 4px; }
          .grid-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 13px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta-item { display: flex; gap: 6px; }
          .meta-label { color: #64748b; min-width: 140px; }
          .meta-value { font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; }
          td { border: 1px solid #cbd5e1; padding: 8px; }
          .note-box { margin-top: 16px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 12.5px; }
          .footer-sign { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; font-size: 13px; page-break-inside: avoid; }
          .sign-title { font-weight: 700; text-transform: uppercase; font-size: 12px; }
          .signature-space { height: 75px; }
          @media print {
            body { padding: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM</div>
          <div class="sub-company">Kinh doanh thiết bị phòng tắm, nhà bếp • Hệ thống quản lý kho vận</div>
          <div class="title">${item.type === 'INBOUND' ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO'}</div>
          <div class="code">Mã số: ${item.code}</div>
        </div>

        <div class="grid-meta">
          <div class="meta-item"><span class="meta-label">Nghiệp vụ kho:</span><span class="meta-value">${item.typeLabel || ''}</span></div>
          <div class="meta-item"><span class="meta-label">Kho hàng:</span><span class="meta-value">${item.warehouseName || ''}</span></div>
          <div class="meta-item"><span class="meta-label">Người thực hiện:</span><span class="meta-value">${item.executor || ''}</span></div>
          <div class="meta-item"><span class="meta-label">Thời gian hoàn thành:</span><span class="meta-value">${item.completedAt || ''}</span></div>
          ${item.referenceDoc ? `<div class="meta-item" style="grid-column: span 2;"><span class="meta-label">Chứng từ tham chiếu:</span><span class="meta-value">${item.referenceDoc}</span></div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">STT</th>
              <th>Tên hàng hoá, vật tư</th>
              <th style="width: 80px; text-align: center;">ĐVT</th>
              <th style="width: 100px; text-align: right;">Số lượng</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr style="background: #f8fafc;">
              <td colspan="3" style="text-align: right; font-weight: bold; padding: 10px 8px;">TỔNG CỘNG SỐ LƯỢNG:</td>
              <td style="text-align: right; font-weight: 800; font-size: 14px; padding: 10px 8px; color: #0284c7;">
                ${item.totalQuantity || 0}
              </td>
            </tr>
          </tbody>
        </table>

        ${item.note ? `
          <div class="note-box">
            <strong>Ghi chú / Diễn giải:</strong> ${item.note}
          </div>
        ` : ''}

        <div class="footer-sign">
          <div>
            <div class="sign-title">Người lập phiếu</div>
            <div style="font-size: 11px; color: #64748b;">(Ký, họ tên)</div>
            <div class="signature-space"></div>
            <div style="font-weight: 600;">${item.executor || ''}</div>
          </div>
          <div>
            <div class="sign-title">Thủ kho</div>
            <div style="font-size: 11px; color: #64748b;">(Ký, họ tên)</div>
            <div class="signature-space"></div>
            <div>....................................</div>
          </div>
          <div>
            <div class="sign-title">Kế toán / Giám sát</div>
            <div style="font-size: 11px; color: #64748b;">(Ký, họ tên)</div>
            <div class="signature-space"></div>
            <div>....................................</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Reset page & search khi chuyển step
  useEffect(() => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterWarehouse('all');
    setCurrentPage(1);
    setSelectedTaskIds(new Set());
    setSelectedInventoryIds(new Set());
    setSelectedCompletedIds(new Set());
  }, [currentStep]);

  // 1. Tải Categories & Warehouses
  const fetchCategories = useCallback((whId?: string) => {
    const url = whId && whId !== 'all'
      ? `/api/logistics/categories?warehouseId=${encodeURIComponent(whId)}`
      : '/api/logistics/categories';
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) setCategories(json);
      })
      .catch(() => {});
  }, []);

  const fetchWarehouses = useCallback(() => {
    fetch('/api/logistics/warehouses?limit=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.items)) {
          setWarehouses(json.items.map((w: any) => ({ id: w.id, code: w.code, name: w.name })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCategories(filterWarehouse);
  }, [fetchCategories, filterWarehouse]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // 2. Tải dữ liệu tương ứng từng bước từ DB
  const loadStepData = useCallback(() => {
    setLoading(true);

    if (currentStep === 1) {
      // BƯỚC 1: Danh sách công việc
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        search: searchTerm,
        type: filterType,
        status: filterStatus,
      });

      fetch(`/api/logistics/tasks?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setTasks(data.items || []);
            setTotalTasks(data.total || 0);
          }
        })
        .catch((err) => console.error('Lỗi tải tasks:', err))
        .finally(() => setLoading(false));
    } else if (currentStep === 2) {
      // BƯỚC 2: Danh sách hàng hoá
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        search: searchTerm,
        categoryId: filterType !== 'all' ? filterType : '',
        warehouseId: filterWarehouse !== 'all' ? filterWarehouse : '',
      });

      fetch(`/api/logistics/inventory?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            let items = data.items || [];
            if (filterStatus && filterStatus !== 'all') {
              items = items.filter((it: any) => it.trangThai === filterStatus);
            }
            setInventory(items);
            setTotalInventory(filterStatus !== 'all' ? items.length : (data.total || 0));
          }
        })
        .catch((err) => console.error('Lỗi tải inventory:', err))
        .finally(() => setLoading(false));
    } else if (currentStep === 3) {
      // BƯỚC 3: Đã hoàn thành
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        search: searchTerm,
        type: filterType,
        warehouse: filterWarehouse,
      });

      fetch(`/api/logistics/completed?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setCompletedList(data.items || []);
            setTotalCompleted(data.total || 0);
          }
        })
        .catch((err) => console.error('Lỗi tải completed:', err))
        .finally(() => setLoading(false));
    }
  }, [currentStep, currentPage, pageSize, searchTerm, filterType, filterStatus, filterWarehouse]);

  useEffect(() => {
    loadStepData();
  }, [loadStepData]);

  // Hoàn thành công việc
  const handleCompleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/logistics/tasks/${id}/complete`, { method: 'PUT' });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Đã đánh dấu hoàn tất công việc thành công!');
        setConfirmCompleteId(null);
        loadStepData();
      }
    } catch {
      showToast('error', 'Có lỗi khi cập nhật công việc');
    }
  };

  // Tạo công việc mới
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title.trim()) {
      showToast('error', 'Vui lòng nhập tiêu đề công việc');
      return;
    }

    try {
      const res = await fetch('/api/logistics/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskData),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Đã tạo công việc kho mới thành công!');
        setIsCreateTaskOpen(false);
        setNewTaskData({ title: '', description: '', priority: 'high', dueDate: '' });
        loadStepData();
      }
    } catch {
      showToast('error', 'Có lỗi khi tạo công việc mới');
    }
  };

  // Cấu hình Toolbar Filters cho từng bước
  const toolbarFilters = useMemo<TableToolbarFilter[]>(() => {
    if (currentStep === 1) {
      return [
        {
          key: 'status',
          label: 'Trạng thái',
          value: filterStatus,
          onChange: (val) => {
            setFilterStatus(val);
            setCurrentPage(1);
          },
          options: [
            { label: 'Tất cả trạng thái', value: 'all' },
            { label: 'Chờ xử lý', value: 'cho_xu_ly' },
            { label: 'Đang thực hiện', value: 'dang_thuc_hien' },
          ],
        },
        {
          key: 'type',
          label: 'Loại công việc',
          value: filterType,
          onChange: (val) => {
            setFilterType(val);
            setCurrentPage(1);
          },
          options: [
            { label: 'Tất cả loại việc', value: 'all' },
            { label: 'Cấp phát vật tư', value: 'MATERIAL_PICKING' },
            { label: 'Gom hàng & dán nhãn', value: 'BATCH_PACKING' },
            { label: 'Nhập kho nguyên liệu', value: 'INBOUND' },
            { label: 'Kiểm kê kho', value: 'AUDIT' },
          ],
        },
      ];
    } else if (currentStep === 2) {
      return [
        {
          key: 'warehouse',
          label: 'Kho hàng',
          value: filterWarehouse,
          onChange: (val) => {
            setFilterWarehouse(val);
            setCurrentPage(1);
          },
          options: [
            { label: 'Tất cả kho hàng', value: 'all' },
            ...warehouses.map((w) => ({ label: w.name, value: w.id })),
          ],
        },
        {
          key: 'status',
          label: 'Trạng thái tồn kho',
          value: filterStatus,
          onChange: (val) => {
            setFilterStatus(val);
            setCurrentPage(1);
          },
          options: [
            { label: 'Tất cả trạng thái', value: 'all' },
            { label: 'Còn hàng', value: 'con-hang' },
            { label: 'Sắp hết hàng', value: 'sap-het' },
            { label: 'Hết hàng', value: 'het-hang' },
          ],
        },
        {
          key: 'category',
          label: 'Danh mục',
          value: filterType,
          onChange: (val) => {
            setFilterType(val);
            setCurrentPage(1);
          },
          options: [
            { label: 'Tất cả danh mục', value: 'all' },
            ...categories.map((c) => ({ label: c.name, value: c.id })),
          ],
        },
      ];
    } else {
      return [
        {
          key: 'warehouse',
          label: 'Kho hàng',
          value: filterWarehouse,
          onChange: (val) => {
            setFilterWarehouse(val);
            setCurrentPage(1);
          },
          options: [
            { label: 'Tất cả kho hàng', value: 'all' },
            ...warehouses.map((w) => ({ label: w.name, value: w.id })),
          ],
        },
        {
          key: 'type',
          label: 'Nghiệp vụ kho',
          value: filterType,
          onChange: (val) => {
            setFilterType(val);
            setCurrentPage(1);
          },
          options: [
            { label: 'Tất cả xuất / nhập', value: 'all' },
            { label: 'Nhập kho', value: 'INBOUND' },
            { label: 'Xuất kho', value: 'OUTBOUND' },
          ],
        },
      ];
    }
  }, [currentStep, filterStatus, filterType, filterWarehouse, categories, warehouses]);

  return (
    <StepPage
      title="Bộ phận kho vận"
      description="Giám sát điều hành toàn diện công việc xuất nhập, quản lý 989 mặt hàng tồn kho thực tế và tra cứu chứng từ hoàn tất"
      icon="bi-box-seam"
      color="emerald"
      badge="BỘ PHẬN KHO VẬN"
      steps={LOGISTICS_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      hideTicker={true}
    >
      {/* Toast thông báo */}
      {showToastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
            showToastMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : showToastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-sky-50 border-sky-300 text-sky-800'
          }`}
        >
          <span>{showToastMsg.message}</span>
        </div>
      )}


      {/* ── THANH CÔNG CỤ TABLETOOLBAR CHUẨN DOANH NGHIỆP ── */}
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        searchPlaceholder={
          currentStep === 1
            ? 'Tìm mã công việc, tên việc, người phụ trách, số chứng từ...'
            : currentStep === 2
            ? 'Tìm theo mã SKU, tên hàng hoá, model, quy cách, chất liệu...'
            : 'Tìm mã chứng từ, tên hàng, kho hàng, người thực hiện...'
        }
        filters={toolbarFilters}
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentStep === 1 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateTaskOpen(true)}
                leftIcon={<PlusLg size={14} />}
                className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
              >
                Tạo công việc
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => showToast('info', 'Đang trích xuất dữ liệu kho hàng ra file Excel...')}
              leftIcon={<FileEarmarkExcel size={14} color="#16a34a" />}
            >
              Xuất Excel
            </Button>

            {currentStep === 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Printer size={14} />}
              >
                In báo cáo
              </Button>
            )}
          </div>
        }
        showMenu={false}
        menuItems={[]}
      />

      {/* ── BẢNG FULLWIDTHTABLE CHO TỪNG BƯỚC ── */}
      <FullWidthTable loading={loading}>
        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 1: DANH SÁCH CÔNG VIỆC KHO HÀNG
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
            <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
              <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
                <th className="py-2.5 px-3.5 w-72">Mã lệnh</th>
                <th className="py-2.5 px-3.5">Loại công việc</th>
                <th className="py-2.5 px-3.5 w-48 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-10 px-4 text-slate-400">
                    Không có công việc kho nào khớp với điều kiện tìm kiếm
                  </td>
                </tr>
              ) : (
                tasks.map((tsk) => (
                  <tr
                    key={tsk.id}
                    onClick={() => setSelectedDetailItem({ ...tsk, itemCategory: 'task' })}
                    className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
                  >
                    <td className="py-2.5 px-3.5 align-middle">
                      <span className="font-bold text-slate-900 text-[13px] block">
                        {tsk.code}
                      </span>
                      {tsk.title && (
                        <span className="text-[11.5px] text-slate-500 block mt-0.5 line-clamp-1">
                          {tsk.title}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 align-middle">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11.5px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        {tsk.typeLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                          tsk.status === 'cho_xu_ly'
                            ? 'bg-amber-50 text-amber-700 border border-amber-300'
                            : 'bg-sky-50 text-sky-700 border border-sky-300'
                        }`}
                      >
                        {tsk.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 2: DANH SÁCH HÀNG HOÁ TỒN KHO THỰC TẾ (989 MẶT HÀNG)
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
            <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
              <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
                <th className="py-2.5 px-3.5 min-w-[320px]">Hàng hoá & Quy cách</th>
                <th className="py-2.5 px-3.5 w-20 text-center">ĐVT</th>
                <th className="py-2.5 px-3.5 w-32 text-right">Tồn hệ thống</th>
                <th className="py-2.5 px-3.5 w-28 text-right">Đã giữ</th>
                <th className="py-2.5 px-3.5 w-32 text-right">Tồn thực tế</th>
                <th className="py-2.5 px-3.5 w-32 text-right">Giá niêm yết</th>
                <th className="py-2.5 px-3.5 w-28 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 px-4 text-slate-400">
                    Không tìm thấy mặt hàng nào trong kho khớp điều kiện
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedDetailItem({ ...item, itemCategory: 'inventory' })}
                    className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
                  >
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="flex items-start gap-3">
                        {/* Ảnh sản phẩm */}
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.tenHang}
                            className="w-11 h-11 object-cover rounded-lg border border-slate-200 bg-white shrink-0 shadow-xs"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400"
                          style={{ display: item.imageUrl ? 'none' : 'flex' }}
                        >
                          <BoxSeam size={18} />
                        </div>

                        {/* Tên hàng hoá, mã SKU, mã phụ và model */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-[13px] leading-snug line-clamp-2" title={item.tenHang}>
                            {item.tenHang}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            {item.code && (
                              <span className="font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded text-[11px] font-mono border border-sky-200 shrink-0">
                                {item.code}
                              </span>
                            )}
                            {item.maThayThe && (
                              <span className="text-[11px] text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                Mã phụ: {item.maThayThe}
                              </span>
                            )}
                            {(item.model || item.chatLieu) && (
                              <span
                                className="text-[11px] text-slate-400 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] truncate"
                                title={[item.model ? `Model: ${item.model}` : '', item.chatLieu ? `Chất liệu: ${item.chatLieu}` : ''].filter(Boolean).join(' • ')}
                              >
                                {item.model ? `Model: ${item.model}` : ''}
                                {item.chatLieu ? (item.model ? ` • ${item.chatLieu}` : item.chatLieu) : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-center text-xs text-slate-600">
                      {item.donVi || 'Bộ'}
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-right font-medium text-slate-800 text-xs font-mono">
                      {(item.soLuong || 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-right text-xs font-mono font-medium">
                      {(item.soLuongGiu || 0) > 0 ? (
                        <span className="text-amber-600 font-semibold">
                          {(item.soLuongGiu || 0).toLocaleString('vi-VN')}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-right">
                      <div className="font-bold text-slate-900 text-[13.5px] font-mono">
                        {(item.thucTon ?? item.soLuong ?? 0).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-right font-medium text-slate-400 text-xs font-mono">
                      <span className="tracking-widest font-semibold text-slate-400 select-none">****** ₫</span>
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                          item.trangThai === 'con-hang'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : item.trangThai === 'sap-het'
                            ? 'bg-amber-50 text-amber-700 border border-amber-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-300'
                        }`}
                      >
                        {item.trangThai === 'con-hang'
                          ? 'Còn hàng'
                          : item.trangThai === 'sap-het'
                          ? 'Sắp hết'
                          : 'Hết hàng'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 3: ĐÃ HOÀN THÀNH (CÔNG VIỆC XUẤT, NHẬP KHO ĐÃ HOÀN THÀNH)
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
            <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
              <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
                <th className="py-2.5 px-3.5 w-60">Số chứng từ / Mã</th>
                <th className="py-2.5 px-3.5 w-48">Nghiệp vụ kho</th>
                <th className="py-2.5 px-3.5">Kho hàng</th>
                <th className="py-2.5 px-3.5 w-48">Người thực hiện</th>
                <th className="py-2.5 px-3.5 w-48">Thời gian hoàn thành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 px-4 text-slate-400">
                    Không có phiếu xuất, nhập kho hoàn tất nào khớp điều kiện tìm kiếm
                  </td>
                </tr>
              ) : (
                completedList.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedDetailItem({ ...item, itemCategory: 'completed' })}
                    className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
                  >
                    <td className="py-2.5 px-3.5 align-middle">
                      <span className="font-bold text-slate-900 text-[13px] block">
                        {item.code}
                      </span>
                      {item.referenceDoc && item.referenceDoc !== item.code && (
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          TC: {item.referenceDoc}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 align-middle">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11.5px] font-semibold border ${
                          item.type === 'INBOUND'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {item.typeLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-xs font-medium text-slate-700">
                      {item.warehouseName}
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-xs font-medium text-slate-800">
                      {item.executor}
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-xs text-slate-500">
                      {item.completedAt}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </FullWidthTable>

      {/* ── PHÂN TRANG PAGINATION CHUẨN ENTERPRISE ── */}
      <Pagination
        currentPage={currentPage}
        totalItems={
          currentStep === 1
            ? totalTasks
            : currentStep === 2
            ? totalInventory
            : totalCompleted
        }
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      {/* ── OFFCANVAS XEM CHI TIẾT HÀNG HOÁ KHO (STEP 2) ── */}
      {selectedDetailItem && selectedDetailItem.itemCategory === 'inventory' && (
        <Offcanvas
          isOpen={true}
          onClose={() => setSelectedDetailItem(null)}
          title={
            <div className="flex items-center gap-2">
              <BoxSeam size={18} className="text-blue-600" />
              <span className="font-bold text-slate-900 text-sm">Thông tin hàng hoá</span>
            </div>
          }
          description={`Mã SKU: ${selectedDetailItem.code || 'Chưa cập nhật'}`}
          width="400px"
          position="right"
          footer={
            <div className="flex justify-between items-center w-full">
              <div className="text-xs text-slate-400 font-mono">
                {selectedDetailItem.brand || 'Seajong'} • Kho vận
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDetailItem(null)}
              >
                Đóng
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs sm:text-[13px] text-slate-700">
            {/* Header sản phẩm: Tên + Mã hàng hoá, sau đó là VÙNG HIỂN THỊ ẢNH ở phía dưới */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div>
                <div className="font-bold text-slate-900 text-[14px] leading-snug">
                  {selectedDetailItem.tenHang}
                </div>

                {/* Dòng mã hàng hoá */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-xs border border-sky-200">
                    {selectedDetailItem.code}
                  </span>
                  {selectedDetailItem.maThayThe && (
                    <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded text-xs border border-slate-200">
                      Mã phụ: {selectedDetailItem.maThayThe}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      selectedDetailItem.trangThai === 'con-hang'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : selectedDetailItem.trangThai === 'sap-het'
                        ? 'bg-amber-50 text-amber-700 border border-amber-300'
                        : 'bg-rose-50 text-rose-700 border border-rose-300'
                    }`}
                  >
                    {selectedDetailItem.trangThai === 'con-hang'
                      ? 'Còn hàng'
                      : selectedDetailItem.trangThai === 'sap-het'
                      ? 'Sắp hết'
                      : 'Hết hàng'}
                  </span>
                </div>
              </div>

              {/* VÙNG HIỂN THỊ ẢNH (HỖ TRỢ SLIDE KHI CÓ NHIỀU HÌNH ẢNH) */}
              {(() => {
                const rawImages: string[] = Array.isArray(selectedDetailItem.images) && selectedDetailItem.images.length > 0
                  ? selectedDetailItem.images
                  : selectedDetailItem.imageUrl
                  ? [selectedDetailItem.imageUrl]
                  : [];
                // Tự động loại bỏ các liên kết ảnh 404 hoặc bị hỏng
                const images = rawImages.filter((u: string) => !failedImages.has(u));

                if (images.length === 0) {
                  return (
                    <div className="w-full h-48 bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-300 py-6 shadow-xs">
                      <BoxSeam size={44} className="mb-1 text-slate-300 stroke-[1.2]" />
                      <span className="text-[11px] text-slate-400 font-medium">Chưa có ảnh sản phẩm</span>
                    </div>
                  );
                }

                if (images.length === 1) {
                  return (
                    <div className="w-full h-52 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-2 relative shadow-xs">
                      <img
                        src={images[0]}
                        alt={selectedDetailItem.tenHang}
                        className="w-full h-full object-contain"
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(images[0]));
                        }}
                      />
                    </div>
                  );
                }

                // Khi có nhiều hình ảnh hợp lệ => Hiển thị Slide hình ảnh tự động chạy
                const safeIndex = Math.min(Math.max(0, activeImageIndex), images.length - 1);
                return (
                  <div
                    className="space-y-2"
                    onMouseEnter={() => setIsSlidePaused(true)}
                    onMouseLeave={() => setIsSlidePaused(false)}
                  >
                    <div className="w-full h-52 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-2 relative shadow-xs group">
                      <img
                        src={images[safeIndex]}
                        alt={`${selectedDetailItem.tenHang} - ảnh ${safeIndex + 1}`}
                        className="w-full h-full object-contain transition-all duration-300"
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(images[safeIndex]));
                        }}
                      />

                      {/* Nút lùi về ảnh trước */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/95 hover:bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
                        title="Ảnh trước"
                      >
                        <ChevronLeft size={14} />
                      </button>

                      {/* Nút sang ảnh tiếp theo */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/95 hover:bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
                        title="Ảnh tiếp theo"
                      >
                        <ChevronRight size={14} />
                      </button>

                      {/* Chỉ số ảnh (1 / n) */}
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/70 text-white text-[10.5px] font-mono font-medium backdrop-blur-xs select-none">
                        {safeIndex + 1} / {images.length}
                      </div>
                    </div>

                    {/* Dải ảnh thu nhỏ (Thumbnails) bấm để chọn trực tiếp */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-0.5">
                      {images.map((imgUrl: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`w-11 h-11 rounded-lg border-2 overflow-hidden shrink-0 transition-all p-0.5 bg-white cursor-pointer ${
                            safeIndex === idx
                              ? 'border-blue-600 ring-2 ring-blue-100 shadow-xs'
                              : 'border-slate-200 opacity-60 hover:opacity-100'
                          }`}
                          title={`Xem ảnh ${idx + 1}`}
                        >
                          <img
                            src={imgUrl}
                            alt=""
                            className="w-full h-full object-contain"
                            onError={() => {
                              setFailedImages((prev) => new Set(prev).add(imgUrl));
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Chỉ số Tồn kho thực tế (3 thẻ số) */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Hiện trạng tồn kho
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] text-slate-500 font-medium">Tồn hệ thống</div>
                  <div className="text-base font-bold text-slate-900 font-mono mt-1">
                    {(selectedDetailItem.soLuong || 0).toLocaleString('vi-VN')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{selectedDetailItem.donVi || 'đơn vị'}</div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <div className="text-[11px] text-amber-700 font-medium">Đang giữ chỗ</div>
                  <div className="text-base font-bold text-amber-700 font-mono mt-1">
                    {(selectedDetailItem.soLuongGiu || 0).toLocaleString('vi-VN')}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">cam kết đơn</div>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <div className="text-[11px] text-emerald-700 font-medium">Khả dụng (Thực tế)</div>
                  <div className="text-base font-bold text-emerald-700 font-mono mt-1">
                    {(selectedDetailItem.thucTon ?? selectedDetailItem.soLuong ?? 0).toLocaleString('vi-VN')}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">sẵn sàng xuất</div>
                </div>
              </div>
            </div>

            {/* Thông tin quy cách & Phân loại */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Quy cách & Phân loại
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Danh mục hàng:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedDetailItem.categoryName || 'Thiết bị vệ sinh'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Thương hiệu:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedDetailItem.brand || 'Seajong'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Đơn vị tính (ĐVT):</span>
                  <span className="font-semibold text-slate-800">
                    {selectedDetailItem.donVi || 'Bộ / Cái'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Định mức an toàn min:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedDetailItem.soLuongMin || 0} {selectedDetailItem.donVi || ''}
                  </span>
                </div>
              </div>

              {(selectedDetailItem.model || selectedDetailItem.chatLieu) && (
                <div className="pt-2 border-t border-slate-200 text-xs">
                  {selectedDetailItem.model && (
                    <div className="mb-1">
                      <span className="text-slate-400 text-[11px]">Model: </span>
                      <span className="font-medium text-slate-800">{selectedDetailItem.model}</span>
                    </div>
                  )}
                  {selectedDetailItem.chatLieu && (
                    <div>
                      <span className="text-slate-400 text-[11px]">Chất liệu: </span>
                      <span className="font-medium text-slate-800">{selectedDetailItem.chatLieu}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chi tiết vị trí kho lưu trữ */}
            {selectedDetailItem.stocks && selectedDetailItem.stocks.length > 0 && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Vị trí kệ & Kho lưu trữ
                </div>
                {selectedDetailItem.stocks.map((stk: any) => (
                  <div key={stk.id} className="p-2.5 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {stk.warehouse?.name || 'Kho Seajong'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Dãy/Hàng: <span className="font-mono text-slate-600">{stk.viTriHang || 'Chờ sắp xếp'}</span>
                        {stk.viTriCot && ` • Cột: ${stk.viTriCot}`}
                        {stk.viTriTang && ` • Tầng: ${stk.viTriTang}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 font-mono">
                        {stk.soLuong} {selectedDetailItem.donVi || 'cái'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Mã kho: {stk.warehouse?.code || 'KHO'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ghi chú lưu kho */}
            {selectedDetailItem.ghiChu && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="text-slate-400 text-[11px] block font-semibold mb-0.5">Ghi chú lưu kho:</span>
                <p className="text-slate-700 whitespace-pre-wrap">{selectedDetailItem.ghiChu}</p>
              </div>
            )}
          </div>
        </Offcanvas>
      )}

      {/* ── MODAL XEM CHI TIẾT CÔNG VIỆC (STEP 1 & 3) ── */}
      {/* ── OFFCANVAS HIỂN THỊ DANH SÁCH HÀNG HOÁ ĐÃ XỬ LÝ (STEP 3) ── */}
      {selectedDetailItem && selectedDetailItem.itemCategory === 'completed' && (
        <Offcanvas
          isOpen={true}
          onClose={() => setSelectedDetailItem(null)}
          title={
            <div className="flex items-center gap-2">
              <FileEarmarkText size={18} className="text-blue-600" />
              <span className="font-bold text-slate-900 text-sm">Chi tiết chứng từ kho</span>
            </div>
          }
          description={`Mã chứng từ: ${selectedDetailItem.code}`}
          width="400px"
          position="right"
          footer={
            <div className="flex justify-between items-center w-full">
              <div className="text-xs text-slate-500">
                Tổng đã xử lý: <strong className="text-slate-800 font-bold">{selectedDetailItem.totalQuantity || 0}</strong> {selectedDetailItem.items?.[0]?.unit || 'sản phẩm'}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintVoucher(selectedDetailItem)}
                  className="flex items-center gap-1.5 !text-slate-700 hover:!bg-slate-100 hover:!border-slate-300"
                >
                  <Printer size={13} className="text-slate-600" />
                  <span>In phiếu</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDetailItem(null)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs sm:text-[13px] text-slate-700">
            {/* Thẻ tóm tắt thông tin chứng từ */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sky-800 text-sm bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {selectedDetailItem.code}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    selectedDetailItem.type === 'INBOUND'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {selectedDetailItem.typeLabel || (selectedDetailItem.type === 'INBOUND' ? 'Nhập kho' : 'Xuất kho')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Kho thực hiện:</span>
                  <span className="font-semibold text-slate-800 line-clamp-1">
                    {selectedDetailItem.warehouseName || 'Kho chính'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Người thực hiện:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedDetailItem.executor || 'Lê Công Vụ'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] text-slate-400 block">Thời gian hoàn thành:</span>
                  <span className="font-medium text-slate-700">{selectedDetailItem.completedAt}</span>
                </div>
              </div>
            </div>

            {/* DANH SÁCH HÀNG HOÁ ĐÃ XỬ LÝ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Danh sách hàng hoá đã xử lý
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {selectedDetailItem.items?.length || 0} mặt hàng
                </span>
              </div>

              <div className="space-y-2">
                {selectedDetailItem.items && selectedDetailItem.items.length > 0 ? (
                  selectedDetailItem.items.map((it: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-shadow flex items-start gap-3 shadow-xs"
                    >
                      {/* Ảnh sản phẩm nếu có hoặc icon dự phòng */}
                      <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                        {it.imageUrl ? (
                          <img
                            src={it.imageUrl}
                            alt={it.itemName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <BoxSeam size={20} className="text-slate-400" />
                        )}
                      </div>

                      {/* Tên & SKU sản phẩm */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2">
                          {it.itemName}
                        </div>
                        {it.itemCode && (
                          <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                            SKU: <span className="text-slate-700 font-semibold">{it.itemCode}</span>
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">Số lượng:</span>
                          <span
                            className={`font-bold text-xs px-2 py-0.5 rounded border ${
                              selectedDetailItem.type === 'INBOUND'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {selectedDetailItem.type === 'INBOUND' ? '+' : '-'}{it.quantity} {it.unit || 'cái'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    Chưa có danh sách mặt hàng
                  </div>
                )}
              </div>
            </div>

            {/* Ghi chú / Diễn giải chứng từ */}
            {selectedDetailItem.note && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                  Diễn giải / Ghi chú kho:
                </span>
                <p className="text-amber-950 leading-relaxed whitespace-pre-wrap">
                  {selectedDetailItem.note}
                </p>
              </div>
            )}
          </div>
        </Offcanvas>
      )}

      {/* ── MODAL XEM CHI TIẾT CÔNG VIỆC CHỜ XỬ LÝ (STEP 1) ── */}
      {selectedDetailItem && selectedDetailItem.itemCategory === 'task' && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDetailItem(null)}
          title={`CHI TIẾT CÔNG VIỆC: ${selectedDetailItem.code || selectedDetailItem.title || 'KHO VẬN'}`}
          maxWidth="560px"
        >
          <div className="space-y-3 text-xs sm:text-[13px] text-slate-700">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-sm font-bold text-slate-900 mb-1">
                {selectedDetailItem.title || selectedDetailItem.itemName}
              </div>
              <div className="text-slate-500 text-xs">
                Mã định danh: <span className="font-mono font-semibold text-sky-700">{selectedDetailItem.code}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block">Phân loại / Nghiệp vụ:</span>
                <span className="font-semibold text-slate-800">
                  {selectedDetailItem.typeLabel || 'Công việc kho'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block">Số lượng:</span>
                <span className="font-bold text-emerald-700">
                  {selectedDetailItem.quantity ?? 1} {selectedDetailItem.unit || 'đơn vị'}
                </span>
              </div>
            </div>

            {selectedDetailItem.description && (
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block">Mô tả / Ghi chú:</span>
                <span className="text-slate-800">{selectedDetailItem.description}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedDetailItem(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="!bg-emerald-600 hover:!bg-emerald-700"
                onClick={() => {
                  handleCompleteTask(selectedDetailItem.id);
                  setSelectedDetailItem(null);
                }}
              >
                Xác nhận hoàn thành
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL TẠO CÔNG VIỆC KHO MỚI ── */}
      {isCreateTaskOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateTaskOpen(false)}
          title="TẠO CÔNG VIỆC KHO HÀNG MỚI"
          maxWidth="520px"
        >
          <form onSubmit={handleCreateTask} className="space-y-3 text-xs sm:text-[13px]">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tiêu đề công việc *</label>
              <Input
                placeholder="VD: Kiểm kê lô sen vòi kệ B2, Soạn hàng đơn xuất..."
                value={newTaskData.title}
                onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Nội dung chi tiết</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                rows={3}
                placeholder="Mô tả các yêu cầu cần thực hiện..."
                value={newTaskData.description}
                onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mức độ ưu tiên</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  value={newTaskData.priority}
                  onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                >
                  <option value="medium">Bình thường</option>
                  <option value="high">Ưu tiên cao</option>
                  <option value="urgent">Khẩn cấp</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Hạn hoàn thành</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  value={newTaskData.dueDate}
                  onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateTaskOpen(false)}>
                Hủy bỏ
              </Button>
              <Button variant="primary" size="sm" type="submit" className="!bg-emerald-600 hover:!bg-emerald-700">
                Lưu công việc
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── HỘP THOẠI XÁC NHẬN HOÀN THÀNH ── */}
      <ConfirmDialog
        isOpen={Boolean(confirmCompleteId)}
        title="Xác nhận hoàn thành công việc"
        message="Bạn có chắc chắn muốn chuyển công việc này sang trạng thái ĐÃ HOÀN THÀNH? Phiếu sẽ được lưu vào lịch sử hoàn tất."
        confirmText="Hoàn tất"
        cancelText="Hủy"
        variant="success"
        onConfirm={() => confirmCompleteId && handleCompleteTask(confirmCompleteId)}
        onClose={() => setConfirmCompleteId(null)}
      />
    </StepPage>
  );
};

export default LogisticsOverviewPage;
