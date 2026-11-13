import React, { useState } from 'react';
import { DefectRecord, DefectStatus } from './mockData';

export const getStatusBadge = (status: DefectStatus | string) => {
  switch (status) {
    case 'NEW':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
          Chưa xử lý
        </span>
      );
    case 'TECH_EVALUATING':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
          Đang chẩn đoán
        </span>
      );
    case 'WAITING_APPROVAL':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          Chờ duyệt
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
          Đang xử lý
        </span>
      );
    case 'WAITING_INVENTORY':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          Chờ kho vật tư
        </span>
      );
    case 'WAITING_QC':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
          Chờ QC kiểm tra
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Đã xử lý
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          {status || 'Chưa xử lý'}
        </span>
      );
  }
};

export const getSourceBadge = (source: string) => {
  switch (source) {
    case 'INTERNAL':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
          Nội bộ
        </span>
      );
    case 'WARRANTY':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200/70">
          Bảo hành
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
          Trả về
        </span>
      );
  }
};

export interface DefectOrderGroup {
  key: string;
  orderNumber: string | null;
  customerName: string | null;
  customerAddress: string | null;
  items: DefectRecord[];
  totalQuantity: number;
}

export function groupDefectsByOrder(defects: DefectRecord[]): DefectOrderGroup[] {
  const map = new Map<
    string,
    DefectOrderGroup & { latestTime: number }
  >();

  defects.forEach((d) => {
    const rawOrder = (d.orderNumber || '').trim();
    const rawCustomer = (d.customerName || '').trim();

    const groupKey = rawOrder
      ? `ORDER:${rawOrder.toUpperCase()}`
      : rawCustomer
        ? `CUST:${rawCustomer.toLowerCase()}`
        : 'INTERNAL_NO_ORDER';

    const createdMs = d.createdAt ? new Date(d.createdAt).getTime() : 0;

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        key: groupKey,
        orderNumber: rawOrder || null,
        customerName: rawCustomer || null,
        customerAddress: (d.customerAddress || '').trim() || null,
        items: [d],
        totalQuantity: Number(d.quantity) || 0,
        latestTime: createdMs,
      });
    } else {
      const existing = map.get(groupKey)!;
      existing.items.push(d);
      existing.totalQuantity += Number(d.quantity) || 0;
      if (!existing.orderNumber && rawOrder) existing.orderNumber = rawOrder;
      if (!existing.customerName && rawCustomer) existing.customerName = rawCustomer;
      if (!existing.customerAddress && d.customerAddress?.trim()) {
        existing.customerAddress = d.customerAddress.trim();
      }
      if (createdMs > existing.latestTime) {
        existing.latestTime = createdMs;
      }
    }
  });

  return Array.from(map.values())
    .sort((a, b) => b.latestTime - a.latestTime)
    .map(({ latestTime: _latestTime, ...group }) => group);
}

interface DefectListProps {
  groups?: DefectOrderGroup[];
  data?: DefectRecord[];
  onSelect: (id: string) => void;
  emptyMessage?: string;
}

const stickyThStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  backgroundColor: '#f8fafc',
  boxShadow: 'inset 0 -1px 0 #e2e8f0',
};

export function DefectList({
  groups,
  data = [],
  onSelect,
  emptyMessage = 'Chưa có hồ sơ lỗi nào phù hợp',
}: DefectListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const resolvedGroups = groups ?? groupDefectsByOrder(data);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
      <thead className="sticky top-0 z-20 bg-slate-50 border-t border-slate-200">
        <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
          <th className="py-2.5 px-2.5 sm:px-4 text-left sm:w-[280px]" style={stickyThStyle}>
            Mã lỗi & Nguồn
          </th>
          <th className="py-2.5 px-2.5 sm:px-4 text-left sm:w-[270px]" style={stickyThStyle}>
            Sản phẩm
          </th>
          <th className="hidden sm:table-cell py-2.5 px-4 text-left" style={stickyThStyle}>
            Mô tả hiện trạng
          </th>
          <th
            className="hidden sm:table-cell py-2.5 px-4 text-left"
            style={{ ...stickyThStyle, width: '250px' }}
          >
            Người báo cáo & Phụ trách
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {resolvedGroups.length > 0 ? (
          resolvedGroups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.key]);
            const isQcRef = Boolean(group.orderNumber?.toUpperCase().startsWith('QC-'));

            return (
              <React.Fragment key={group.key}>
                {/* Hàng tiêu đề nhóm theo Đơn hàng & Thông tin khách hàng */}
                <tr
                  onClick={() => toggleGroup(group.key)}
                  className="bg-slate-100/85 hover:bg-slate-200/60 transition-colors cursor-pointer border-t border-b border-slate-200"
                >
                  <td colSpan={4} className="py-2 px-2.5 sm:px-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 min-w-0">
                        <i
                          className={`bi ${
                            isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'
                          } text-slate-500 text-xs transition-transform`}
                        />

                        {group.orderNumber ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-xs text-slate-500">
                              {isQcRef ? 'Phiếu tham chiếu:' : 'Mã đơn hàng:'}
                            </span>
                            <span className="font-bold text-sky-700 font-mono text-[13px] whitespace-nowrap">
                              {group.orderNumber}
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700 text-[12.5px]">
                            Không kèm mã đơn hàng
                          </span>
                        )}

                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-slate-700 border border-slate-200 whitespace-nowrap">
                          {group.items.length} mã lỗi • Tổng SL:{' '}
                          <span className="text-rose-600 font-bold ml-1">
                            {String(group.totalQuantity).padStart(2, '0')}
                          </span>
                        </span>

                        <span className="hidden sm:inline text-slate-300">|</span>

                        {group.customerName ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-xs text-slate-700 min-w-0"
                            title={
                              group.customerAddress
                                ? `${group.customerName} — ${group.customerAddress}`
                                : group.customerName
                            }
                          >
                            <i className="bi bi-person-badge text-sky-600 shrink-0" />
                            <strong className="font-semibold text-slate-800 truncate">
                              {group.customerName}
                            </strong>
                            {group.customerAddress && (
                              <span className="text-slate-500 truncate">
                                — {group.customerAddress}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            Phát sinh nội bộ xưởng sản xuất
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Danh sách các mã lỗi thuộc cùng đơn hàng */}
                {!isCollapsed &&
                  group.items.map((defect) => {
                    const displayDesc =
                      defect.description?.split('\nNhận xét QC:')[0]?.trim() || defect.description;
                    return (
                      <tr
                        key={defect.id}
                        onClick={() => onSelect(defect.id)}
                        className="hover:bg-sky-50/40 transition-colors border-b border-slate-100 cursor-pointer bg-white"
                      >
                        <td className="py-2.5 sm:py-3 pl-5 sm:pl-7 pr-2.5 sm:pr-4 align-top sm:align-middle border-l-2 border-l-sky-500/40">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 whitespace-nowrap font-mono">
                                {defect.code}
                              </span>
                              {getSourceBadge(defect.source)}
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[11.5px] text-slate-500 mt-0.5 flex-wrap">
                              <span className="whitespace-nowrap">
                                {new Date(defect.createdAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                {new Date(defect.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                              {getStatusBadge(defect.status)}
                            </div>
                            <div className="sm:hidden text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {displayDesc || 'Không có mô tả'}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 align-top sm:align-middle max-w-[175px] sm:max-w-[270px]">
                          <div
                            className="font-semibold text-slate-800 line-clamp-2 sm:truncate text-xs sm:text-[13px]"
                            title={defect.productName}
                          >
                            {defect.productName}
                          </div>
                          <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                            SL:{' '}
                            <span className="font-bold text-rose-600">
                              {String(defect.quantity || 0).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="hidden sm:block text-xs text-slate-500 mt-0.5">
                            Mã định mức:{' '}
                            <span className="font-medium text-slate-700">
                              {defect.bomCode || 'Không có định mức'}
                            </span>
                          </div>
                          <div className="sm:hidden text-[10.5px] text-slate-400 mt-0.5 truncate">
                            PT: {defect.assignedTo || defect.reporterName || 'Chưa phân công'}
                          </div>
                        </td>
                        <td
                          className="hidden sm:table-cell py-3 px-4 align-middle"
                          style={{ maxWidth: '380px' }}
                        >
                          <div
                            className="text-xs text-slate-600 leading-relaxed"
                            title={displayDesc}
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {displayDesc || 'Không có mô tả'}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell py-3 px-4 align-middle">
                          <div className="text-xs font-semibold text-slate-800">
                            {defect.reporterName}{' '}
                            <span className="text-slate-300 mx-1">|</span>{' '}
                            <span className="font-normal text-slate-600">
                              {(() => {
                                const dept = (defect.reporterDepartment || '').toLowerCase();
                                if (dept === 'qa') return 'Quản lý Chất lượng (QA)';
                                if (dept === 'production') return 'Sản xuất';
                                if (dept === 'logistics') return 'Kho vận';
                                if (dept === 'sales') return 'Kinh doanh';
                                if (dept === 'customer_service') return 'CSKH';
                                return defect.reporterDepartment || 'Khác';
                              })()}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Phụ trách:{' '}
                            <span className="font-medium text-slate-700">
                              {defect.assignedTo || 'Chưa phân công'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </React.Fragment>
            );
          })
        ) : (
          <tr>
            <td colSpan={4} className="text-center py-12 text-slate-400">
              <div className="flex flex-col items-center justify-center gap-2">
                <i className="bi bi-inbox text-2xl text-slate-300"></i>
                <span>{emptyMessage}</span>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
