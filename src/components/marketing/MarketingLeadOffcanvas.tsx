import React from 'react';
import { Offcanvas } from '../common/Offcanvas';

interface MarketingLeadOffcanvasProps {
  lead: any | null;
  onClose: () => void;
}

export const MarketingLeadOffcanvas: React.FC<MarketingLeadOffcanvasProps> = ({
  lead,
  onClose,
}) => {
  if (!lead) return null;

  let formValues: any = {};
  if (lead.formValues) {
    try {
      formValues = typeof lead.formValues === 'string' ? JSON.parse(lead.formValues) : lead.formValues;
    } catch (e) {
      formValues = {};
    }
  }

  const platform = lead.campaign?.platform || lead.source || 'Facebook Ads';
  const name = lead.fullName || formValues.fullName || 'Khách hàng ẩn danh';
  const phone = lead.phone || formValues.phone || 'Chưa cung cấp';
  const email = lead.email || formValues.email || 'Chưa cung cấp';
  const address = formValues.area || formValues.detailBusinessAddress || lead.address || 'Hà Nội';

  return (
    <Offcanvas
      isOpen={Boolean(lead)}
      onClose={onClose}
      title="Thông tin chi tiết Khách hàng Lead"
      width="400px"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => {
              if (phone && phone !== 'Chưa cung cấp') {
                window.open(`tel:${phone}`);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <i className="bi bi-telephone-fill" />
            <span>Gọi điện</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-slate-800">
        {/* User Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200/80">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-extrabold text-slate-900 truncate mb-0.5">{name}</h4>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-200">
                {platform}
              </span>
              <span className="text-[11px] text-slate-500">
                {new Date(lead.createdAt || Date.now()).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Info Table */}
        <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-white">
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <i className="bi bi-telephone text-slate-400" /> Số điện thoại
            </span>
            <span className="text-xs font-bold font-mono text-slate-900">{phone}</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <i className="bi bi-envelope text-slate-400" /> Email
            </span>
            <span className="text-xs font-bold text-slate-900">{email}</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <i className="bi bi-geo-alt text-slate-400" /> Khu vực / Địa chỉ
            </span>
            <span className="text-xs font-bold text-slate-900">{address}</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <i className="bi bi-megaphone text-slate-400" /> Chiến dịch nguồn
            </span>
            <span className="text-xs font-bold text-blue-700 truncate max-w-[200px]">
              {lead.campaign?.name || 'Chiến dịch tự động Seajong'}
            </span>
          </div>
        </div>

        {/* Extra Form fields if present */}
        {formValues && Object.keys(formValues).length > 0 && (
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50 space-y-2">
            <span className="text-xs font-bold text-slate-700 block mb-1">
              Dữ liệu biểu mẫu Lead Ads (Form Fields)
            </span>
            <div className="space-y-1.5">
              {Object.entries(formValues).map(([k, v]: [string, any]) => {
                if (typeof v === 'object') return null;
                return (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">{k}:</span>
                    <span className="font-semibold text-slate-800">{String(v)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Offcanvas>
  );
};
