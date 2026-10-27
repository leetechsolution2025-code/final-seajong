import React, { useState, useEffect, useMemo } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import {
  Truck,
  Plus,
  Eye,
  Printer,
  CheckCircle,
  FileEarmarkText,
  Building,
} from 'react-bootstrap-icons';

interface OrderItem {
  id: string;
  code: string;
  customerId?: string;
  customer?: {
    id: string;
    name: string;
    address?: string;
    dienThoai?: string;
  };
  ngayDat: string;
  ngayGiao?: string;
  tongTien: number;
  daThanhToan: number;
  trangThai: string;
  ghiChu?: string;
  nguoiPhuTrach?: string;
}

export const SalesOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal / Drawer
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New Order Form
  const [newOrder, setNewOrder] = useState({
    code: `DBH-202610${Date.now().toString().slice(-4)}`,
    customerName: '',
    phone: '',
    address: '',
    tongTien: 45000000,
    daThanhToan: 20000000,
    ghiChu: '',
  });

  const fetchOrders = () => {
    setLoading(true);
    fetch('/api/sales/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) {
          setOrders(data.orders);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatVND = (num: number) => (num || 0).toLocaleString('vi-VN') + ' đ';

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !search ||
        o.code.toLowerCase().includes(search.toLowerCase()) ||
        o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.ghiChu?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.trangThai === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.customerName) return;

    try {
      const res = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newOrder.code,
          tongTien: Number(newOrder.tongTien),
          daThanhToan: Number(newOrder.daThanhToan),
          ghiChu: newOrder.ghiChu,
          trangThai: 'approved',
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const tickerNews = [
    {
      badge: 'ĐƠN BÁN HÀNG',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      text: `Tổng số đơn hàng bán lẻ và dự án: <b>${orders.length}</b> đơn xuất kho Seajong`,
    },
    {
      badge: 'ĐIỀU PHỐI GIAO VẬN',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'Điều phối giao nhận và đối soát công nợ tức thời qua hệ thống Seajong ERP',
    },
  ];

  return (
    <StandardPage
      title="Đơn bán hàng (SO)"
      badge="ORDERS"
      description="Quản lý lệnh xuất kho, giao hàng thiết bị vệ sinh Seajong và thu hồi công nợ"
      icon="bi-truck"
      color="amber"
      customTickerNews={tickerNews}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        {/* ── TableToolbar chuẩn theo AGENTS.MD ── */}
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mã đơn hàng, tên đại lý, ghi chú..."
          filters={[
            {
              value: statusFilter,
              onChange: (v) => {
                setStatusFilter(v);
                setPage(1);
              },
              options: [
                { label: 'Tất cả trạng thái', value: 'all' },
                { label: 'Hoàn thành', value: 'completed' },
                { label: 'Đã phê duyệt', value: 'approved' },
                { label: 'Chờ duyệt', value: 'pending' },
                { label: 'Đang sản xuất / xuất kho', value: 'in_production' },
              ],
            },
          ]}
          rightActions={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              Tạo đơn bán hàng
            </Button>
          }
          onRefresh={fetchOrders}
          onExportExcel={() => alert('Xuất danh sách đơn hàng ra file Excel')}
        />

        {/* ── FullWidthTable với sticky header ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <FullWidthTable loading={loading} emptyText="Không có đơn hàng nào">
            <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
              <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                  <th className="py-2.5 px-3.5 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3.5 w-40">Mã đơn hàng</th>
                  <th className="py-2.5 px-3.5">Khách hàng</th>
                  <th className="py-2.5 px-3.5 w-32">Ngày đặt</th>
                  <th className="py-2.5 px-3.5 text-right w-36">Tổng tiền</th>
                  <th className="py-2.5 px-3.5 text-right w-36">Đã thanh toán</th>
                  <th className="py-2.5 px-3.5 text-right w-36">Còn lại (Nợ)</th>
                  <th className="py-2.5 px-3.5 text-center w-32">Trạng thái</th>
                  <th className="py-2.5 px-3.5 text-center w-24">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedOrders.map((ord, idx) => {
                  const conLai = Math.max(0, (ord.tongTien || 0) - (ord.daThanhToan || 0));
                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-400">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="font-bold text-[#003087] hover:underline cursor-pointer text-[13px]">
                          {ord.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div>
                          <div className="font-semibold text-slate-900 text-[13px]">
                            {ord.customer?.name || 'Khách hàng đại lý'}
                          </div>
                          {ord.customer?.address && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                              {ord.customer.address}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 text-[13px]">
                        {new Date(ord.ngayDat).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 text-[13px]">
                        {formatVND(ord.tongTien)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-semibold text-emerald-600 text-[13px]">
                        {formatVND(ord.daThanhToan)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-rose-600 text-[13px]">
                        {formatVND(conLai)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                            ord.trangThai === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.trangThai === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.trangThai === 'in_production'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {ord.trangThai === 'completed'
                            ? 'Hoàn thành'
                            : ord.trangThai === 'approved'
                            ? 'Đã duyệt'
                            : ord.trangThai === 'in_production'
                            ? 'Đang sản xuất'
                            : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setShowDetailModal(true);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-[#003087] hover:bg-slate-100"
                          title="Xem chi tiết đơn hàng"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FullWidthTable>
        </div>

        {/* ── Phân trang ── */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[5, 10, 15, 20, 50]}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          itemName="đơn hàng"
        />
      </div>

      {/* ── MODAL CHI TIẾT ĐƠN HÀNG ── */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-200 bg-amber-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Chi tiết đơn hàng {selectedOrder.code}
                </h3>
                <span className="text-xs text-slate-500">
                  Ngày đặt: {new Date(selectedOrder.ngayDat).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800 text-sm">
                  {selectedOrder.customer?.name || 'Khách hàng đại lý'}
                </div>
                <div className="text-slate-600">{selectedOrder.customer?.address}</div>
                <div className="text-slate-500">Người phụ trách: {selectedOrder.nguoiPhuTrach || 'Phạm Quang Việt'}</div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="text-[11px] text-blue-700 block">Tổng tiền đơn:</span>
                  <span className="font-bold text-sm text-blue-900 font-mono">
                    {formatVND(selectedOrder.tongTien)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="text-[11px] text-emerald-700 block">Đã thanh toán:</span>
                  <span className="font-bold text-sm text-emerald-900 font-mono">
                    {formatVND(selectedOrder.daThanhToan)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                  <span className="text-[11px] text-rose-700 block">Còn lại:</span>
                  <span className="font-bold text-sm text-rose-900 font-mono">
                    {formatVND(Math.max(0, selectedOrder.tongTien - selectedOrder.daThanhToan))}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                  In phiếu giao hàng
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShowDetailModal(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TẠO ĐƠN BÁN HÀNG ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Tạo đơn bán hàng mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mã đơn hàng</label>
                <input
                  type="text"
                  required
                  value={newOrder.code}
                  onChange={(e) => setNewOrder({ ...newOrder, code: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên đại lý / Khách hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Showroom An Gia Phát"
                  value={newOrder.customerName}
                  onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tổng tiền (VNĐ)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={newOrder.tongTien}
                    onChange={(e) => setNewOrder({ ...newOrder, tongTien: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Đã thanh toán (VNĐ)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={newOrder.daThanhToan}
                    onChange={(e) => setNewOrder({ ...newOrder, daThanhToan: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghi chú đơn hàng</label>
                <input
                  type="text"
                  placeholder="Giao sen cây phím đàn mạ PVD và vòi lavabo..."
                  value={newOrder.ghiChu}
                  onChange={(e) => setNewOrder({ ...newOrder, ghiChu: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Hủy bỏ</Button>
                <Button type="submit" variant="primary" size="sm">Tạo đơn</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StandardPage>
  );
};

export default SalesOrdersPage;
