import React, { useState, useEffect, useCallback } from 'react';
import { StandardPage } from '@/components/layout/StandardPage';
import { TableToolbar } from '@/components/common/TableToolbar';
import { FullWidthTable } from '@/components/common/FullWidthTable';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/common/Button';
import { EventOffcanvas } from '@/components/common/EventOffcanvas';
import { DefectSummaryOffcanvas } from '../production/defects/DefectSummaryOffcanvas';
import { DefectProcessModal } from '../production/defects/DefectProcessModal';
import { CreateDefectOffcanvas } from '../production/defects/CreateDefectOffcanvas';
import { CalendarEvent, ArrowRepeat, PlusLg } from 'react-bootstrap-icons';

export function QaDefectsSummaryPage() {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterScope, setFilterScope] = useState<'QA' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [defects, setDefects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isCreateOffcanvasOpen, setIsCreateOffcanvasOpen] = useState(false);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState(false);

  const fetchDefects = useCallback(() => {
    setLoading(true);
    fetch('/api/production/defects')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDefects(data);
        } else {
          setDefects([]);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách hàng lỗi:', err);
        setDefects([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDefects();
  }, [fetchDefects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterScope, searchQuery]);

  const filteredDefects = defects.filter((d) => {
    if (filterScope === 'QA' && (d.reporterDepartment || '').toLowerCase() !== 'qa') {
      return false;
    }
    if (filterStatus !== 'ALL') {
      if (
        filterStatus === 'PENDING' &&
        d.status !== 'NEW' &&
        d.status !== 'TECH_EVALUATING' &&
        d.status !== 'WAITING_APPROVAL' &&
        d.status !== 'PROCESSING' &&
        d.status !== 'WAITING_QC'
      ) {
        return false;
      }
      if (filterStatus === 'RESOLVED' && d.status !== 'COMPLETED') {
        return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.code?.toLowerCase().includes(q) ||
        d.orderNumber?.toLowerCase().includes(q) ||
        d.productName?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const paginatedDefects = filteredDefects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const renderStatusBadge = (status: string) => {
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Đã xử lý
        </span>
      );
    }
    if (status === 'TECH_EVALUATING' || status === 'PROCESSING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Đang đánh giá
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Chờ xử lý
      </span>
    );
  };

  return (
    <StandardPage
      title="Tổng hợp hàng lỗi"
      description="Quản lý và tổng hợp các hồ sơ hàng lỗi từ các bộ phận"
      icon="bi-exclamation-triangle"
      color="rose"
      useCard={true}
      cardPadding="p-0"
      hideTicker={false}
      tickerContext="qa"
    >
      <TableToolbar
        actionsBeforeSearch={
          <div className="inline-flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={filterScope === 'QA' ? 'primary' : 'outline'}
              onClick={() => setFilterScope('QA')}
            >
              Biên bản QA/QC
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterScope === 'ALL' ? 'primary' : 'outline'}
              onClick={() => setFilterScope('ALL')}
            >
              Toàn bộ hệ thống
            </Button>
          </div>
        }
        filters={[
          {
            id: 'qa-defect-status',
            value: filterStatus,
            onChange: setFilterStatus,
            minWidth: '170px',
            options: [
              { label: 'Tất cả trạng thái', value: 'ALL' },
              { label: 'Chờ xử lý', value: 'PENDING' },
              { label: 'Đã xử lý', value: 'RESOLVED' },
            ],
          },
        ]}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm mã lỗi, số biên bản, sản phẩm..."
        searchMinWidth="260px"
        rightActions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusLg size={14} />}
              onClick={() => setIsCreateOffcanvasOpen(true)}
            >
              Thêm mới
            </Button>
          </div>
        }
        onRefresh={fetchDefects}
        menuItems={[
          {
            id: 'event-calendar',
            label: 'Lịch sự kiện',
            icon: <CalendarEvent size={15} className="text-sky-600" />,
            onClick: () => setIsEventCalendarOpen(true),
          },
          { id: 'div-1', label: '', divider: true, onClick: () => {} },
          {
            id: 'refresh',
            label: 'Làm mới dữ liệu',
            icon: <ArrowRepeat size={15} className="text-indigo-600" />,
            onClick: fetchDefects,
          },
        ]}
      />

      <FullWidthTable loading={loading}>
        <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
          <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
            <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
              <th className="py-2.5 px-4 text-left" style={{ width: '170px' }}>
                Mã lỗi
              </th>
              <th className="py-2.5 px-4 text-left" style={{ width: '165px' }}>
                Số biên bản
              </th>
              <th className="py-2.5 px-4 text-left" style={{ width: '260px' }}>
                Sản phẩm / Vật tư
              </th>
              <th className="py-2.5 px-4 text-left">Mô tả lỗi</th>
              <th className="py-2.5 px-4 text-left" style={{ width: '200px' }}>
                Người lập
              </th>
              <th className="py-2.5 px-4 text-center" style={{ width: '150px' }}>
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedDefects.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <i className="bi bi-inbox text-3xl text-slate-300" />
                    <span className="text-xs font-medium text-slate-500">
                      Chưa có dữ liệu tổng hợp hàng lỗi.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedDefects.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedDefectId(row.id)}
                  className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer group"
                >
                  <td className="py-3 px-4 align-middle">
                    <span className="font-bold text-[13px] text-slate-900 group-hover:text-sky-600 transition-colors font-mono">
                      {row.code}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString('vi-VN')
                        : '—'}
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    {row.orderNumber ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-semibold">
                        {row.orderNumber}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 align-middle" style={{ maxWidth: '260px' }}>
                    <div
                      className="font-semibold text-[13px] text-slate-800 truncate"
                      title={row.productName}
                    >
                      {row.productName || '—'}
                    </div>
                    <div className="text-[11.5px] text-slate-500 flex items-center gap-2 mt-0.5">
                      {row.productCode && (
                        <span className="font-mono text-slate-600">{row.productCode}</span>
                      )}
                      {row.quantity != null && (
                        <span className="text-rose-600 font-bold">
                          SL lỗi: {String(row.quantity).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <div
                      className="text-xs text-slate-600 leading-relaxed"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {row.description || '—'}
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <div className="text-xs font-semibold text-slate-800">
                      {row.reporterName || 'QA/QC'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {(row.reporterDepartment || '').toLowerCase() === 'qa'
                        ? 'Phòng QA/QC'
                        : row.reporterDepartment || 'Sản xuất'}
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle text-center">
                    {renderStatusBadge(row.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </FullWidthTable>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredDefects.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemName="hồ sơ lỗi"
      />

      <DefectSummaryOffcanvas
        defectId={selectedDefectId}
        defect={defects.find((d: any) => d.id === selectedDefectId)}
        onClose={() => setSelectedDefectId(null)}
        onRefresh={fetchDefects}
        onOpenProcess={() => setIsProcessModalOpen(true)}
      />

      <CreateDefectOffcanvas
        show={isCreateOffcanvasOpen}
        onClose={() => setIsCreateOffcanvasOpen(false)}
        onRefresh={fetchDefects}
      />

      {isProcessModalOpen && (
        <DefectProcessModal
          defectId={selectedDefectId}
          onClose={() => setIsProcessModalOpen(false)}
          onRefresh={fetchDefects}
        />
      )}

      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StandardPage>
  );
}

export default QaDefectsSummaryPage;
