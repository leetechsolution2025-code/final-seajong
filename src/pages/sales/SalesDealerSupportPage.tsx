import React, { useState, useEffect, useMemo } from 'react';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Offcanvas } from '../../components/common/Offcanvas';
import { Select } from '../../components/common/Select';
import { DepartmentActionMenu } from '../../components/common/DepartmentActionMenu';
import { EventOffcanvas } from '../../components/common/EventOffcanvas';
import type { ModernStepItem } from '../../types';
import type { TickerItem } from '../../components/layout/DynamicTicker';
import {
  Headset,
  CheckCircle,
  Send,
  CalendarEvent,
  PersonCheck,
  Shop,
} from 'react-bootstrap-icons';

export interface DealerSupportTicketItem {
  id: string;
  code: string;
  customerId?: string | null;
  dealerName: string;
  type: string;
  orderCode?: string | null;
  priority?: string;
  title: string;
  content?: string | null;
  responseContent?: string | null;
  status: string;
  requestDate?: string;
  resolvedAt?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    code?: string;
    name: string;
    dienThoai?: string;
    address?: string;
    loai?: string;
    nhom?: string;
  } | null;
  handler?: {
    id: string;
    code?: string;
    fullName: string;
    phone?: string;
    workEmail?: string;
    position?: string;
  } | null;
}

export const SalesDealerSupportPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [tickets, setTickets] = useState<DealerSupportTicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Offcanvas state
  const [selectedTicket, setSelectedTicket] = useState<DealerSupportTicketItem | null>(null);
  const [responseStatus, setResponseStatus] = useState<string>('In Progress');
  const [responseContent, setResponseContent] = useState<string>('');
  const [savingResponse, setSavingResponse] = useState<boolean>(false);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState<boolean>(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sales/dealer-support-tickets');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setTickets(json.data);
          return;
        }
      }
      const fallbackRes = await fetch('/api/dealer/support-tickets?scope=sales');
      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        if (Array.isArray(fallbackJson.data)) {
          setTickets(fallbackJson.data);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách yêu cầu hỗ trợ đại lý:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const openTicketDrawer = (tk: DealerSupportTicketItem) => {
    setSelectedTicket(tk);
    setResponseStatus(
      tk.status === 'Resolved' || tk.status === 'Completed'
        ? 'Resolved'
        : tk.status === 'In Progress'
        ? 'In Progress'
        : 'In Progress'
    );
    setResponseContent(tk.responseContent || '');
  };

  const handleSaveTicketResponse = async () => {
    if (!selectedTicket) return;
    setSavingResponse(true);
    try {
      const res = await fetch(`/api/sales/dealer-support-tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: responseStatus,
          responseContent,
        }),
      });

      if (res.ok) {
        setSelectedTicket(null);
        fetchTickets();
      } else {
        const fallback = await fetch(`/api/dealer/support-tickets/${selectedTicket.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: responseStatus,
            responseContent,
          }),
        });
        if (fallback.ok) {
          setSelectedTicket(null);
          fetchTickets();
        }
      }
    } catch (err) {
      console.error('Lỗi lưu phản hồi yêu cầu đại lý:', err);
    } finally {
      setSavingResponse(false);
    }
  };

  const activeTicketsCount = useMemo(
    () =>
      tickets.filter(
        (t) => t.status !== 'Resolved' && t.status !== 'Completed' && t.status !== 'Draft'
      ).length,
    [tickets]
  );

  const resolvedTicketsCount = useMemo(
    () => tickets.filter((t) => t.status === 'Resolved' || t.status === 'Completed').length,
    [tickets]
  );

  const supportSteps: ModernStepItem[] = useMemo(
    () => [
      {
        num: 1,
        id: 'pending-support',
        title: 'Danh sách yêu cầu',
        desc: 'Tiếp nhận & đang xử lý yêu cầu từ đại lý',
        icon: 'bi-headset',
        badge: activeTicketsCount > 0 ? `${activeTicketsCount}` : undefined,
        badgeVariant: 'warning',
      },
      {
        num: 2,
        id: 'resolved-support',
        title: 'Đã xử lý',
        desc: 'Yêu cầu đã được Phòng Kinh doanh phản hồi',
        icon: 'bi-check2-circle',
        badge: resolvedTicketsCount > 0 ? `${resolvedTicketsCount}` : undefined,
        badgeVariant: 'success',
      },
    ],
    [activeTicketsCount, resolvedTicketsCount]
  );

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (t.status === 'Draft') return false;
      const isResolved = t.status === 'Resolved' || t.status === 'Completed';
      if (currentStep === 1 && isResolved) return false;
      if (currentStep === 2 && !isResolved) return false;

      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      const isUrgent =
        t.priority === 'urgent' || /\[Ưu tiên:\s*Khẩn cấp\]/.test(String(t.content || ''));
      if (priorityFilter === 'urgent' && !isUrgent) return false;
      if (priorityFilter === 'normal' && isUrgent) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchCode = (t.code || '').toLowerCase().includes(q);
        const matchDealer =
          (t.dealerName || '').toLowerCase().includes(q) ||
          (t.customer?.name || '').toLowerCase().includes(q) ||
          (t.customer?.code || '').toLowerCase().includes(q);
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchContent = (t.content || '').toLowerCase().includes(q);
        const matchOrder = (t.orderCode || '').toLowerCase().includes(q);
        if (!matchCode && !matchDealer && !matchTitle && !matchContent && !matchOrder) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, currentStep, typeFilter, statusFilter, priorityFilter, search]);

  const pagedTickets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, page, pageSize]);

  const tickerItems = useMemo<TickerItem[]>(
    () => [
      {
        badge: 'HỖ TRỢ ĐẠI LÝ',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        text: `Đang có <b>${activeTicketsCount}</b> yêu cầu hỗ trợ từ đại lý chờ tiếp nhận & xử lý • Cam kết phản hồi trong vòng 2 giờ làm việc`,
      },
      {
        badge: 'ĐÃ HOÀN TẤT',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        text: `Đã xử lý thành công <b>${resolvedTicketsCount}</b> yêu cầu hỗ trợ bảo hành linh kiện, POSM, đơn hàng và đối soát công nợ`,
      },
    ],
    [activeTicketsCount, resolvedTicketsCount]
  );

  return (
    <StepPage
      title="Hỗ trợ đại lý"
      description="Tiếp nhận, xử lý và phản hồi các yêu cầu hỗ trợ gửi từ hệ thống đại lý và nhà phân phối Seajong"
      color="blue"
      icon="bi-headset"
      badge="SUPPORT"
      steps={supportSteps}
      currentStep={currentStep}
      onStepChange={(stepNum) => {
        setCurrentStep(stepNum);
        setPage(1);
        setStatusFilter('all');
      }}
      stepperExtraRight={
        <div className="flex items-center gap-2 pr-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEventCalendarOpen(true)}
            leftIcon={<CalendarEvent className="text-blue-600 shrink-0" size={15} />}
            className="h-9 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[13px] font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:border-slate-300 select-none shrink-0"
            title="Mở Lịch sự kiện Seajong"
          >
            <span className="font-bold text-slate-800 tracking-tight">Lịch sự kiện</span>
          </Button>
          <DepartmentActionMenu />
        </div>
      }
      customTickerNews={tickerItems}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden bg-white">
        <TableToolbar
          showMenu={false}
          searchPlaceholder="Tìm mã yêu cầu, tên đại lý, mã ĐL, tiêu đề, nội dung..."
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          filters={[
            {
              id: 'support-type',
              value: typeFilter,
              onChange: (val) => {
                setTypeFilter(val);
                setPage(1);
              },
              minWidth: '215px',
              options: [
                { value: 'all', label: 'Tất cả phân loại yêu cầu' },
                { value: 'Bảo hành & Linh kiện', label: 'Bảo hành & Linh kiện' },
                { value: 'Hỗ trợ catalog & POSM', label: 'Hỗ trợ catalog & POSM' },
                { value: 'Cấp phát vật tư & phụ kiện', label: 'Cấp phát vật tư & phụ kiện' },
                { value: 'Hỗ trợ đơn hàng & giao nhận', label: 'Hỗ trợ đơn hàng & giao nhận' },
                { value: 'Đối soát công nợ & điểm thưởng', label: 'Đối soát công nợ & điểm thưởng' },
                { value: 'Xin cơ chế giá dự án / công trình', label: 'Xin cơ chế giá dự án / công trình' },
              ],
            },
            {
              id: 'support-status',
              value: statusFilter,
              onChange: (val) => {
                setStatusFilter(val);
                setPage(1);
              },
              minWidth: '175px',
              options:
                currentStep === 1
                  ? [
                      { value: 'all', label: 'Tất cả đang thực hiện' },
                      { value: 'Pending', label: 'Chờ tiếp nhận' },
                      { value: 'In Progress', label: 'Đang xử lý' },
                    ]
                  : [
                      { value: 'all', label: 'Tất cả đã xử lý' },
                      { value: 'Resolved', label: 'Đã xử lý' },
                    ],
            },
            {
              id: 'support-priority',
              value: priorityFilter,
              onChange: (val) => {
                setPriorityFilter(val);
                setPage(1);
              },
              minWidth: '155px',
              options: [
                { value: 'all', label: 'Tất cả mức độ' },
                { value: 'urgent', label: 'Khẩn cấp (Gấp)' },
                { value: 'normal', label: 'Bình thường' },
              ],
            },
          ]}
          onRefresh={fetchTickets}
        />

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <FullWidthTable
            loading={loading}
            emptyText={
              currentStep === 1
                ? 'Hiện chưa có yêu cầu hỗ trợ nào từ đại lý đang chờ xử lý.'
                : 'Chưa có yêu cầu hỗ trợ nào đã xử lý.'
            }
          >
            <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-800 text-[11px] font-extrabold uppercase">
                <tr>
                  <th className="py-2.5 px-3.5 text-center w-[55px]">STT</th>
                  <th className="py-2.5 px-3.5 w-[165px]">Mã yêu cầu</th>
                  <th className="py-2.5 px-3.5 w-[220px]">Đại lý gửi</th>
                  <th className="py-2.5 px-3.5 w-[125px]">Ngày gửi</th>
                  <th className="py-2.5 px-3.5 w-[205px]">Phân loại yêu cầu</th>
                  <th className="py-2.5 px-3.5">Tiêu đề & Nội dung chi tiết</th>
                  <th className="py-2.5 px-3.5 w-[180px]">Người phụ trách</th>
                  <th className="py-2.5 px-3.5 text-center w-[135px]">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {pagedTickets.map((tk, idx) => {
                  const rawContent = String(tk.content || '');
                  const orderMatch = rawContent.match(/\[Đơn hàng:\s*([^\]]+)\]/);
                  const relatedOrderCode =
                    tk.orderCode || (orderMatch ? orderMatch[1].trim() : '');
                  const isUrgent =
                    tk.priority === 'urgent' || /\[Ưu tiên:\s*Khẩn cấp\]/.test(rawContent);
                  const cleanBody = rawContent
                    .replace(/\[Đơn hàng:\s*[^\]]+\]\s*/g, '')
                    .replace(/\[Ưu tiên:\s*[^\]]+\]\s*/g, '')
                    .trim();
                  const isResolved = tk.status === 'Resolved' || tk.status === 'Completed';

                  return (
                    <tr
                      key={tk.id}
                      onClick={() => openTicketDrawer(tk)}
                      className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3.5 text-center font-mono text-xs text-slate-400 align-middle">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3 px-3.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-sky-700 hover:underline">
                            {tk.code}
                          </span>
                          {isUrgent && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[9.5px] font-extrabold">
                              Gấp
                            </span>
                          )}
                        </div>
                        {relatedOrderCode && (
                          <span className="text-[10.5px] font-mono text-slate-400 block mt-0.5">
                            Đơn: #{relatedOrderCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 align-middle">
                        <div className="font-bold text-slate-900 text-xs truncate max-w-[205px]">
                          {tk.customer?.name || tk.dealerName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          {tk.customer?.code && (
                            <span className="font-mono font-semibold text-sky-700">
                              {tk.customer.code}
                            </span>
                          )}
                          {tk.customer?.dienThoai && (
                            <span className="font-mono">• {tk.customer.dienThoai}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-xs text-slate-600 align-middle whitespace-nowrap">
                        {new Date(tk.requestDate || tk.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-3.5 align-middle">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {tk.type}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 align-middle">
                        <div className="font-bold text-slate-900 text-xs">{tk.title}</div>
                        {cleanBody && (
                          <div className="text-slate-500 text-xs mt-0.5 line-clamp-1">
                            {cleanBody}
                          </div>
                        )}
                        {tk.responseContent && (
                          <div className="text-emerald-700 text-[11px] font-medium mt-0.5 line-clamp-1">
                            ↳ Phản hồi: {tk.responseContent}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 align-middle">
                        <div className="font-semibold text-slate-800 text-xs">
                          {tk.handler?.fullName || 'Phòng Kinh doanh'}
                        </div>
                        {tk.handler?.phone && (
                          <div className="text-[11px] font-mono text-sky-700">{tk.handler.phone}</div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center align-middle">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isResolved
                              ? 'bg-emerald-100 text-emerald-700'
                              : tk.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isResolved
                            ? 'Đã xử lý'
                            : tk.status === 'In Progress'
                            ? 'Đang xử lý'
                            : 'Chờ tiếp nhận'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FullWidthTable>
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredTickets.length}
          itemName="yêu cầu hỗ trợ"
          onPageChange={setPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
        />
      </div>

      {/* ── Offcanvas Tiếp nhận & Phản hồi Yêu cầu Hỗ trợ Đại lý ── */}
      <Offcanvas
        isOpen={Boolean(selectedTicket)}
        onClose={() => !savingResponse && setSelectedTicket(null)}
        title="Tiếp nhận & Xử lý yêu cầu"
        description={
          selectedTicket
            ? `${selectedTicket.code} • ${selectedTicket.customer?.name || selectedTicket.dealerName}`
            : undefined
        }
        icon={<Headset size={18} />}
        width="430px"
        bodyStyle={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
        footer={
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="secondary"
              size="md"
              disabled={savingResponse}
              onClick={() => setSelectedTicket(null)}
              className="w-1/3 justify-center font-semibold text-[13.5px]"
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={savingResponse}
              onClick={handleSaveTicketResponse}
              className="flex-1 justify-center gap-1.5 font-bold text-[13.5px]"
            >
              <Send className="w-4 h-4" />
              <span>{savingResponse ? 'Đang lưu...' : 'Cập nhật & Phản hồi'}</span>
            </Button>
          </div>
        }
      >
        {selectedTicket &&
          (() => {
            const rawContent = String(selectedTicket.content || '');
            const orderMatch = rawContent.match(/\[Đơn hàng:\s*([^\]]+)\]/);
            const relatedOrderCode =
              selectedTicket.orderCode || (orderMatch ? orderMatch[1].trim() : '');
            const isUrgent =
              selectedTicket.priority === 'urgent' ||
              /\[Ưu tiên:\s*Khẩn cấp\]/.test(rawContent);
            const cleanBody = rawContent
              .replace(/\[Đơn hàng:\s*[^\]]+\]\s*/g, '')
              .replace(/\[Ưu tiên:\s*[^\]]+\]\s*/g, '')
              .trim();

            return (
              <div className="flex-1 flex flex-col min-h-0 gap-3.5 text-[13.5px] h-full">
                {/* Thông tin Đại lý gửi */}
                <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-200/70 space-y-1.5 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold uppercase text-sky-800 flex items-center gap-1.5">
                      <Shop className="w-3.5 h-3.5 text-sky-600" />
                      <span>Đại lý gửi yêu cầu</span>
                    </div>
                    {selectedTicket.customer?.code && (
                      <span className="px-2 py-0.5 rounded bg-white border border-sky-200 text-sky-700 font-mono font-bold text-xs">
                        {selectedTicket.customer.code}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedTicket.customer?.name || selectedTicket.dealerName}
                  </div>
                  {(selectedTicket.customer?.dienThoai || selectedTicket.customer?.address) && (
                    <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                      {selectedTicket.customer?.dienThoai && (
                        <span className="font-mono font-semibold text-sky-800">
                          📞 {selectedTicket.customer.dienThoai}
                        </span>
                      )}
                      {selectedTicket.customer?.address && (
                        <span className="truncate">{selectedTicket.customer.address}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Thông tin Mã yêu cầu & Nội dung Đại lý gửi */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">Mã yêu cầu:</span>
                    <div className="flex items-center gap-1.5">
                      <strong className="font-mono text-slate-900">{selectedTicket.code}</strong>
                      {isUrgent && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                          Khẩn cấp
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">Phân loại:</span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold text-xs">
                      {selectedTicket.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">Ngày gửi:</span>
                    <span className="font-medium text-slate-800 text-xs">
                      {new Date(selectedTicket.requestDate || selectedTicket.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  {relatedOrderCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-xs">Đơn hàng liên quan:</span>
                      <span className="font-mono font-bold text-sky-700 text-xs">
                        #{relatedOrderCode}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">Người tiếp nhận:</span>
                    <span className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                      <PersonCheck className="w-3.5 h-3.5 text-sky-600" />
                      {selectedTicket.handler?.fullName || 'Phòng Kinh doanh'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-900 text-[13.5px]">
                      {selectedTicket.title}
                    </div>
                    <div className="text-slate-700 text-[13px] leading-relaxed whitespace-pre-line max-h-[120px] overflow-y-auto">
                      {cleanBody || 'Không có mô tả chi tiết bổ sung.'}
                    </div>
                  </div>
                </div>

                {/* Khu vực xử lý của Phòng Kinh doanh */}
                <div className="shrink-0">
                  <Select
                    label="Trạng thái xử lý"
                    value={responseStatus}
                    onChange={(e) => setResponseStatus(e.target.value)}
                    options={[
                      { value: 'Pending', label: 'Chờ tiếp nhận' },
                      { value: 'In Progress', label: 'Đang xử lý' },
                      { value: 'Resolved', label: 'Đã xử lý (Hoàn tất)' },
                    ]}
                  />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="form-label block shrink-0">
                    Nội dung phản hồi cho đại lý
                  </label>
                  <textarea
                    value={responseContent}
                    onChange={(e) => setResponseContent(e.target.value)}
                    placeholder="Nhập phương án xử lý, mã vận đơn linh kiện / POSM hoặc kết quả phản hồi gửi đại lý..."
                    className="flex-1 w-full h-full min-h-[110px] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-slate-900 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-sky-600 resize-none"
                  />
                </div>
              </div>
            );
          })()}
      </Offcanvas>

      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StepPage>
  );
};

export default SalesDealerSupportPage;

