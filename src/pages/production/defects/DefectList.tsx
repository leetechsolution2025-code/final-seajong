import React from 'react';
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

interface DefectListProps {
  data: DefectRecord[];
  onSelect: (id: string) => void;
}

export function DefectList({ data, onSelect }: DefectListProps) {
  return (
    <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
      <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
        <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
          <th className="py-2.5 px-4 text-left" style={{ width: '280px' }}>Mã lỗi & Nguồn</th>
          <th className="py-2.5 px-4 text-left" style={{ width: '270px' }}>Sản phẩm</th>
          <th className="py-2.5 px-4 text-left">Mô tả hiện trạng</th>
          <th className="py-2.5 px-4 text-left" style={{ width: '250px' }}>Người báo cáo & Phụ trách</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data && data.length > 0 ? data.map(defect => {
          const displayDesc = defect.description?.split('\nNhận xét QC:')[0]?.trim() || defect.description;
          return (
            <tr
              key={defect.id}
              onClick={() => onSelect(defect.id)}
              className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
            >
              <td className="py-3 px-4 align-middle">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{defect.code}</span>
                    {getSourceBadge(defect.source)}
                  </div>
                  <div className="flex items-center gap-2 text-[11.5px] text-slate-500 mt-0.5">
                    <span>
                      {new Date(defect.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                      {new Date(defect.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    {getStatusBadge(defect.status)}
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 align-middle" style={{ maxWidth: '270px' }}>
                <div className="font-semibold text-slate-800 truncate" title={defect.productName}>
                  {defect.productName}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Số lượng:{' '}
                  <span className="font-bold text-rose-600">
                    {String(defect.quantity || 0).padStart(2, '0')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Mã định mức:{' '}
                  <span className="font-medium text-slate-700">
                    {defect.bomCode || 'Không có định mức'}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 align-middle" style={{ maxWidth: '380px' }}>
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
              <td className="py-3 px-4 align-middle">
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
                  Phụ trách: <span className="font-medium text-slate-700">{defect.assignedTo || 'Chưa phân công'}</span>
                </div>
              </td>
            </tr>
          );
        }) : (
          <tr>
            <td colSpan={4} className="text-center py-12 text-slate-400">
              <div className="flex flex-col items-center justify-center gap-2">
                <i className="bi bi-inbox text-2xl text-slate-300"></i>
                <span>Chưa có hồ sơ lỗi nào phù hợp</span>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
