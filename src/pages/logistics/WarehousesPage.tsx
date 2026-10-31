import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building,
  PlusLg,
  FileEarmarkExcel,
  PencilSquare,
  Trash,
  GeoAlt,
  Telephone,
  Person,
  Boxes,
  CheckCircleFill,
  XCircleFill,
  Eye,
} from 'react-bootstrap-icons';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar, type TableToolbarFilter } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LOGISTICS_TICKER_ITEMS } from '../../components/layout/DynamicTicker';

export interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  type: string;
  typeLabel: string;
  managerId: string;
  isVirtual: boolean;
  isActive: boolean;
  itemCount: number;
  totalQuantity: number;
  totalHold: number;
  movementsCount: number;
  createdAt: string;
}

export const WarehousesPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal thêm/sửa
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    type: 'PRODUCT_SYNC',
    managerId: '',
    isActive: true,
  });

  // Modal xem chi tiết
  const [detailWarehouse, setDetailWarehouse] = useState<WarehouseItem | null>(null);

  // ConfirmDialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState<boolean>(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Tải danh sách kho từ backend DB
  const loadWarehouses = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(pageSize),
      search: searchTerm,
      type: filterType,
      status: filterStatus,
    });

    fetch(`/api/logistics/warehouses?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWarehouses(data.items || []);
          setTotalItems(data.total || 0);
        }
      })
      .catch((err) => console.error('Lỗi tải danh sách kho:', err))
      .finally(() => setLoading(false));
  }, [currentPage, pageSize, searchTerm, filterType, filterStatus]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  // Mở modal thêm mới
  const handleOpenCreate = () => {
    setEditingWarehouse(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      phone: '',
      type: 'PRODUCT_SYNC',
      managerId: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (wh: WarehouseItem) => {
    setEditingWarehouse(wh);
    setFormData({
      code: wh.code,
      name: wh.name,
      address: wh.address,
      phone: wh.phone,
      type: wh.type,
      managerId: wh.managerId,
      isActive: wh.isActive,
    });
    setIsModalOpen(true);
  };

  // Lưu kho (thêm mới hoặc cập nhật)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('error', 'Vui lòng nhập đầy đủ Mã kho và Tên kho');
      return;
    }

    try {
      if (editingWarehouse) {
        // Cập nhật
        const res = await fetch(`/api/logistics/warehouses/${editingWarehouse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.success) {
          showToast('success', 'Đã cập nhật thông tin kho hàng thành công');
          setIsModalOpen(false);
          loadWarehouses();
        } else {
          showToast('error', json.error || 'Có lỗi khi cập nhật kho hàng');
        }
      } else {
        // Thêm mới
        const res = await fetch('/api/logistics/warehouses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.success) {
          showToast('success', 'Đã thêm kho hàng mới vào hệ thống');
          setIsModalOpen(false);
          loadWarehouses();
        } else {
          showToast('error', json.error || 'Có lỗi khi tạo kho hàng mới');
        }
      }
    } catch {
      showToast('error', 'Lỗi kết nối máy chủ');
    }
  };

  // Xoá 1 kho
  const handleDeleteOne = async (id: string) => {
    try {
      const res = await fetch(`/api/logistics/warehouses/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message || 'Đã xoá kho thành công');
        setDeleteConfirmId(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        loadWarehouses();
      } else {
        showToast('error', json.error || 'Có lỗi khi xoá kho hàng');
      }
    } catch {
      showToast('error', 'Lỗi kết nối máy chủ');
    }
  };

  // Xoá hàng loạt các kho đã chọn
  const handleBatchDelete = async () => {
    try {
      for (const id of selectedIds) {
        await fetch(`/api/logistics/warehouses/${id}`, { method: 'DELETE' });
      }
      showToast('success', `Đã xử lý xóa ${selectedIds.size} kho hàng đã chọn`);
      setSelectedIds(new Set());
      setShowBatchDeleteConfirm(false);
      loadWarehouses();
    } catch {
      showToast('error', 'Có lỗi khi xử lý thao tác xoá');
    }
  };

  // Cấu hình Toolbar Filters
  const toolbarFilters = useMemo<TableToolbarFilter[]>(() => {
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
          { label: 'Đang hoạt động', value: 'active' },
          { label: 'Tạm dừng', value: 'inactive' },
        ],
      },
    ];
  }, [filterStatus]);

  return (
    <StandardPage
      title="Hệ thống kho bãi Seajong"
      description="Sơ đồ định vị vị trí dãy kệ kho linh kiện, kho phôi đồng và kho sen vòi thành phẩm"
      icon="bi-building"
      badge="HỆ THỐNG KHO BÃI"
      color="blue"
      hideTicker={true}
    >
      {/* Toast thông báo */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : toastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-sky-50 border-sky-300 text-sky-800'
          }`}
        >
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ── THANH CÔNG CỤ TABLETOOLBAR ── */}
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm kiếm theo mã kho, tên kho, địa chỉ, thủ kho..."
        filters={toolbarFilters}
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => showToast('info', 'Đang trích xuất dữ liệu danh sách kho hàng ra file Excel...')}
              leftIcon={<FileEarmarkExcel size={14} color="#16a34a" />}
            >
              Xuất Excel
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              leftIcon={<PlusLg size={14} />}
              className="!bg-blue-600 hover:!bg-blue-700 !text-white"
            >
              Thêm mới
            </Button>

            {selectedIds.size > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowBatchDeleteConfirm(true)}
                leftIcon={<Trash size={14} />}
              >
                Xoá ({selectedIds.size})
              </Button>
            )}
          </div>
        }
        showMenu={false}
        menuItems={[]}
      />

      {/* ── BẢNG FULLWIDTHTABLE DANH SÁCH KHO HÀNG ── */}
      <FullWidthTable loading={loading}>
        <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
          <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
            <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={warehouses.length > 0 && selectedIds.size === warehouses.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(warehouses.map((w) => w.id)));
                    else setSelectedIds(new Set());
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer align-middle"
                  title="Chọn tất cả"
                />
              </th>
              <th className="py-2.5 px-3.5 min-w-[260px]">Tên kho & Định vị</th>
              <th className="py-2.5 px-3.5 w-48">Phân loại kho</th>
              <th className="py-2.5 px-3.5 w-52">Thủ kho phụ trách</th>
              <th className="py-2.5 px-3.5 w-40 text-right">Mặt hàng lưu trữ</th>
              <th className="py-2.5 px-3.5 w-40 text-right">Tổng tồn thực tế</th>
              <th className="py-2.5 px-3.5 w-36 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {warehouses.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 px-4 text-slate-400">
                  Không tìm thấy kho hàng nào khớp với điều kiện tìm kiếm
                </td>
              </tr>
            ) : (
              warehouses.map((wh) => (
                <tr
                  key={wh.id}
                  onClick={() => setDetailWarehouse(wh)}
                  className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
                >
                  <td className="py-2.5 px-3 align-top text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(wh.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(wh.id);
                        else next.delete(wh.id);
                        setSelectedIds(next);
                      }}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3.5 align-top">
                    <div className="font-semibold text-slate-900 text-[13px]">{wh.name}</div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <GeoAlt size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate" title={wh.address}>{wh.address}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 align-top">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                        wh.type === 'MATERIAL'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : wh.type === 'DEFECT'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : wh.type === 'TRANSIT'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {wh.typeLabel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 align-top">
                    <div className="font-medium text-slate-800 text-xs flex items-center gap-1">
                      <Person size={13} className="text-slate-400" />
                      <span>{wh.managerId}</span>
                    </div>
                    {wh.phone && (
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                        <Telephone size={10} />
                        <span>{wh.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 align-top text-right">
                    <span className="font-bold text-slate-900 text-xs font-mono">
                      {wh.itemCount.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1">mã SKU</span>
                  </td>
                  <td className="py-2.5 px-3.5 align-top text-right">
                    <div className="font-bold text-emerald-700 text-[13px] font-mono">
                      {wh.totalQuantity.toLocaleString('vi-VN')}
                    </div>
                    {wh.totalHold > 0 && (
                      <div className="text-[10.5px] text-amber-600 font-mono">
                        (Giữ: {wh.totalHold})
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 align-top text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        wh.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {wh.isActive ? (
                        <>
                          <CheckCircleFill size={10} className="text-emerald-600" />
                          Hoạt động
                        </>
                      ) : (
                        <>
                          <XCircleFill size={10} className="text-slate-400" />
                          Tạm dừng
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </FullWidthTable>

      {/* ── PHÂN TRANG PAGINATION ── */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      {/* ── OFFCANVAS THÊM / CHỈNH SỬA KHO HÀNG (400PX) ── */}
      {isModalOpen && (
        <Offcanvas
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          icon={<Building size={20} />}
          title={editingWarehouse ? `Cập nhật kho: ${editingWarehouse.code}` : 'Thêm kho hàng mới'}
          description="Thiết lập thông tin định danh và vị trí kho hàng"
          width="400px"
          position="right"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="warehouse-form"
                className="!bg-blue-600 hover:!bg-blue-700"
              >
                {editingWarehouse ? 'Lưu thay đổi' : 'Tạo kho mới'}
              </Button>
            </div>
          }
        >
          <form id="warehouse-form" onSubmit={handleSubmitForm} className="space-y-3.5 text-xs sm:text-[13px]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mã kho hàng *</label>
                <Input
                  placeholder="VD: KHO-CHINH, KVP, KHO-HCM..."
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={Boolean(editingWarehouse)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phân loại kho *</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="PRODUCT_SYNC">Kho thành phẩm</option>
                  <option value="MATERIAL">Kho nguyên vật liệu / Phôi</option>
                  <option value="TRANSIT">Kho trung chuyển / Showroom</option>
                  <option value="DEFECT">Kho hàng lỗi cách ly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tên kho hàng *</label>
              <Input
                placeholder="VD: Kho thành phẩm Seajong Hà Nội..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Địa chỉ vị trí kho</label>
              <Input
                placeholder="VD: Lô B2, KCN Phú Minh, Cổ Nhuế 2, Bắc Từ Liêm, Hà Nội"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Thủ kho phụ trách</label>
                <Input
                  placeholder="VD: Nguyễn Văn Kháng"
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Số điện thoại liên hệ</label>
                <Input
                  placeholder="VD: 0988.123.456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-slate-800">Kho đang trong trạng thái hoạt động</span>
              </label>
            </div>
          </form>
        </Offcanvas>
      )}

      {/* ── OFFCANVAS XEM CHI TIẾT KHO (400PX) ── */}
      {detailWarehouse && (
        <Offcanvas
          isOpen={true}
          onClose={() => setDetailWarehouse(null)}
          icon={<Building size={20} />}
          title={`Chi tiết: ${detailWarehouse.name}`}
          description={`Mã kho: ${detailWarehouse.code} • ${detailWarehouse.typeLabel}`}
          width="400px"
          position="right"
          footer={
            <div className="flex justify-between items-center gap-2 w-full">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  const targetId = detailWarehouse.id;
                  setDetailWarehouse(null);
                  setDeleteConfirmId(targetId);
                }}
                leftIcon={<Trash size={13} />}
              >
                Xoá kho
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetailWarehouse(null)}>
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="!bg-blue-600 hover:!bg-blue-700 !text-white"
                  onClick={() => {
                    const target = detailWarehouse;
                    setDetailWarehouse(null);
                    handleOpenEdit(target);
                  }}
                  leftIcon={<PencilSquare size={13} />}
                >
                  Chỉnh sửa
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3 text-xs sm:text-[13px] text-slate-700">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-sm font-bold text-slate-900 mb-1">
                {detailWarehouse.name}
              </div>
              <div className="text-slate-500 flex items-center gap-2">
                <span>Mã kho:</span>
                <span className="font-mono font-bold text-blue-700">{detailWarehouse.code}</span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold">{detailWarehouse.typeLabel}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-slate-50 rounded-lg flex items-start gap-2">
                <GeoAlt size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] text-slate-400 block">Địa chỉ kho:</span>
                  <span className="font-medium text-slate-800">{detailWarehouse.address}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-lg flex items-start gap-2">
                  <Person size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Thủ kho:</span>
                    <span className="font-medium text-slate-800">{detailWarehouse.managerId}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg flex items-start gap-2">
                  <Telephone size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Liên hệ:</span>
                    <span className="font-mono font-medium text-slate-800">{detailWarehouse.phone}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg">
                  <span className="text-[11px] text-emerald-700 block">Mặt hàng lưu trữ:</span>
                  <span className="font-mono font-bold text-base text-emerald-800">
                    {detailWarehouse.itemCount.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-[11px] text-emerald-600 ml-1">mã SKU</span>
                </div>

                <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg">
                  <span className="text-[11px] text-blue-700 block">Tổng tồn thực tế:</span>
                  <span className="font-mono font-bold text-base text-blue-800">
                    {detailWarehouse.totalQuantity.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-[11px] text-blue-600 ml-1">sản phẩm</span>
                </div>
              </div>
            </div>
          </div>
        </Offcanvas>
      )}

      {/* ── CONFIRM DIALOG XÓA 1 KHO ── */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Xác nhận xoá kho hàng"
        message="Bạn có chắc chắn muốn xoá kho hàng này? Nếu kho đang chứa tồn hàng thực tế, hệ thống sẽ chuyển kho sang trạng thái Tạm dừng hoạt động để bảo toàn dữ liệu sổ kho."
        confirmText="Xác nhận"
        cancelText="Hủy bỏ"
        variant="danger"
        onConfirm={() => deleteConfirmId && handleDeleteOne(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
      />

      {/* ── CONFIRM DIALOG XÓA HÀNG LOẠT ── */}
      <ConfirmDialog
        isOpen={showBatchDeleteConfirm}
        title="Xác nhận xoá nhiều kho hàng"
        message={`Bạn có chắc chắn muốn xử lý xóa ${selectedIds.size} kho hàng đã chọn khỏi hệ thống?`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
        onConfirm={handleBatchDelete}
        onClose={() => setShowBatchDeleteConfirm(false)}
      />
    </StandardPage>
  );
};

export default WarehousesPage;
