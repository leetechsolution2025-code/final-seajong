import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { isProductionAdmin } from '@/lib/production-permissions';
import { StandardPage } from '@/components/layout/StandardPage';
import { TableToolbar } from '@/components/common/TableToolbar';
import { FullWidthTable } from '@/components/common/FullWidthTable';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/common/Button';
import { DatePicker } from '@/components/common/DatePicker';
import { Toggle } from '@/components/common/Toggle';
import { ProductionOrderDetailOffcanvas } from '@/components/production/ProductionOrderDetailOffcanvas';
import { CreateProductionRequestOffcanvas } from '@/components/production/CreateProductionRequestOffcanvas';
import { EventOffcanvas } from '@/components/common/EventOffcanvas';
import { CalendarEvent, PlusLg } from 'react-bootstrap-icons';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    running: {
      label: 'Đang thực hiện',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    pending: {
      label: 'Chưa thực hiện',
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    stopped: {
      label: 'Tạm dừng',
      cls: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
    },
    completed: {
      label: 'Đã thực hiện',
      cls: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
    },
  };
  const m = map[status] ?? {
    label: status || 'Chưa xác định',
    cls: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${m.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function ProductionOverviewPage() {
  const { data: session } = useSession();
  const isProdAdmin = isProductionAdmin(session?.user);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState(false);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterToday, setFilterToday] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterDate, filterToday, searchQuery]);

  const paginatedOrders = recentOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.append('status', filterStatus);
    if (filterDate) params.append('date', filterDate);
    if (filterToday) params.append('todayCompleted', 'true');
    if (searchQuery) params.append('q', searchQuery);

    fetch(`/api/production/dashboard/recent-orders?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRecentOrders(data);
        }
      })
      .catch((err) => console.error('Error fetching recent orders:', err))
      .finally(() => setLoading(false));
  }, [filterStatus, filterDate, filterToday, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <StandardPage
      title="Quản trị sản xuất"
      description="Hệ thống điều hành và giám sát sản xuất Seajong"
      icon="bi-tools"
      color="blue"
      useCard={true}
    >
      <TableToolbar
        filters={[
          {
            id: 'prod-order-status',
            value: filterStatus,
            onChange: setFilterStatus,
            minWidth: '170px',
            options: [
              { label: 'Tất cả trạng thái', value: '' },
              { label: 'Chưa thực hiện', value: 'pending' },
              { label: 'Đang thực hiện', value: 'running' },
              { label: 'Đã hoàn thành', value: 'completed' },
            ],
          },
        ]}
        customFilters={
          <div className="flex items-center gap-3">
            <div style={{ width: 155 }}>
              <DatePicker
                value={filterDate}
                onChange={setFilterDate}
                clearable
                disabled={filterToday}
                placeholder="Chọn ngày..."
                style={{ marginBottom: 0, height: '32px' }}
                title="Lọc theo thời gian"
              />
            </div>

            <div className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50/70 flex items-center h-[32px]">
              <Toggle
                checked={filterToday}
                onChange={(next) => {
                  setFilterToday(next);
                  if (next) setFilterDate('');
                }}
                label="Hoàn thành hôm nay"
              />
            </div>
          </div>
        }
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm lệnh sản xuất, mã đơn hàng, sản phẩm..."
        searchMinWidth="220px"
        rightActions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<PlusLg size={14} />}
            disabled={!isProdAdmin}
            title={
              isProdAdmin
                ? 'Tạo yêu cầu sản xuất'
                : 'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền tạo yêu cầu sản xuất'
            }
            onClick={() => {
              if (!isProdAdmin) return;
              setShowCreateRequest(true);
            }}
          >
            Tạo yêu cầu SX
          </Button>
        }
        onRefresh={fetchOrders}
        menuItems={[
          {
            id: 'event-calendar',
            label: 'Lịch sự kiện',
            icon: <CalendarEvent size={15} style={{ color: '#0284c7' }} />,
            onClick: () => setIsEventCalendarOpen(true),
          },
          { id: 'div-1', label: '', divider: true, onClick: () => {} },
          {
            id: 'refresh',
            label: 'Làm mới dữ liệu',
            icon: <i className="bi bi-arrow-repeat" style={{ color: '#8b5cf6' }} />,
            onClick: fetchOrders,
          },
        ]}
      />

      <FullWidthTable loading={loading}>
        <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
          <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
            <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
              <th className="py-2.5 px-4 text-left">Mã lệnh sản xuất</th>
              <th className="py-2.5 px-4 w-56 text-left">Thời gian</th>
              <th className="py-2.5 px-4 w-48 text-left">Tiến độ</th>
              <th className="py-2.5 px-4 w-44 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order) => {
                const progress = Math.max(0, Math.min(100, Number(order.progress) || 0));
                return (
                  <tr
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setShowDetail(true);
                    }}
                    className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
                  >
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sky-700 hover:underline text-[13px] font-mono">
                          {order.id}
                        </span>
                        {order.saleOrderCode && !order.saleOrderCode.startsWith('LSX') && (
                          <>
                            <span className="text-slate-300">|</span>
                            <span className="text-xs text-slate-500">
                              Đơn hàng:{' '}
                              <strong className="font-semibold text-slate-700 font-mono">
                                {order.saleOrderCode}
                              </strong>
                            </span>
                          </>
                        )}
                        {order.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            Mới
                          </span>
                        )}
                      </div>
                      <div
                        className="text-xs text-slate-500 truncate mt-1 max-w-xl"
                        title={order.itemsDetail || order.name || 'Sản xuất dự trữ hàng hoá'}
                      >
                        {order.name || 'Sản xuất dự trữ hàng hoá'}
                      </div>
                    </td>

                    <td className="py-3 px-4 align-middle">
                      <div className="text-xs text-slate-500 mb-1">
                        <span>Bắt đầu: </span>
                        <span className="font-semibold text-slate-800">
                          {order.ngayDat ? new Date(order.ngayDat).toLocaleDateString('vi-VN') : '—'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <span>Hoàn thành: </span>
                        <span className="font-bold text-sky-700">
                          {order.ngayHoanThanh
                            ? new Date(order.ngayHoanThanh).toLocaleDateString('vi-VN')
                            : '—'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              progress === 100 ? 'bg-emerald-500' : 'bg-sky-600'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold font-mono min-w-[34px] text-right ${
                            progress === 100 ? 'text-emerald-600' : 'text-slate-700'
                          }`}
                        >
                          {progress}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 align-middle text-center">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  <i className="bi bi-inbox text-2xl block mb-2 opacity-40" />
                  Chưa có lệnh sản xuất nào khớp điều kiện tìm kiếm
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </FullWidthTable>

      <Pagination
        currentPage={currentPage}
        totalItems={recentOrders.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemName="lệnh"
      />

      <ProductionOrderDetailOffcanvas
        orderId={selectedOrderId}
        show={showDetail}
        onHide={() => setShowDetail(false)}
        onUpdate={fetchOrders}
      />

      <CreateProductionRequestOffcanvas
        show={showCreateRequest}
        onHide={() => setShowCreateRequest(false)}
        onSuccess={fetchOrders}
      />

      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StandardPage>
  );
}

export default ProductionOverviewPage;
