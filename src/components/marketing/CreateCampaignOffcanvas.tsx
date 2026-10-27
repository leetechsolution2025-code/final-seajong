import React, { useState } from 'react';
import { Offcanvas } from '../common/Offcanvas';

interface CreateCampaignOffcanvasProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newCampaign: any) => void;
}

export const CreateCampaignOffcanvas: React.FC<CreateCampaignOffcanvasProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('50000000');
  const [targetLeads, setTargetLeads] = useState('200');
  const [objective, setObjective] = useState('Lượt tương tác & Chuyển đổi');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [sources, setSources] = useState({
    fb: true,
    yt: false,
    ig: false,
    tt: true,
  });

  const toggleSource = (key: keyof typeof sources) => {
    setSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên chiến dịch');
      return;
    }

    setLoading(true);
    try {
      const activePlatform = sources.fb
        ? 'facebook'
        : sources.tt
        ? 'tiktok'
        : sources.yt
        ? 'youtube'
        : sources.ig
        ? 'instagram'
        : 'other';

      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          platform: activePlatform,
          budget: parseFloat(budget) || 0,
          objective,
          startTime: startDate,
          stopTime: endDate || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.campaign);
        onClose();
        setName('');
        setNotes('');
      } else {
        alert(data.message || 'Lỗi khi tạo chiến dịch');
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
      alert('Không thể kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Offcanvas
      isOpen={open}
      onClose={onClose}
      title="Tạo chiến dịch Marketing mới"
      width="400px"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy thiết lập
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <i className="bi bi-save" />
                <span>Khởi tạo ngay</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-slate-800">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tên chiến dịch <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="VD: Chiến dịch ra mắt sen vòi Black Matte 2026..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Ngày bắt đầu</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Ngày kết thúc</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Ngân sách (VND)</label>
            <input
              type="number"
              placeholder="VD: 50000000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Số Lead mục tiêu</label>
            <input
              type="number"
              placeholder="VD: 200"
              value={targetLeads}
              onChange={(e) => setTargetLeads(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </div>
        </div>

        {/* Nguồn Lead (Kênh Ads đa nền tảng) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Nền tảng triển khai (Kênh Ads)
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: 'fb' as const, label: 'Facebook Ads', icon: 'bi-facebook', color: '#1877F2' },
              { key: 'tt' as const, label: 'TikTok Ads', icon: 'bi-tiktok', color: '#000000' },
              { key: 'yt' as const, label: 'YouTube Ads', icon: 'bi-youtube', color: '#FF0000' },
              { key: 'ig' as const, label: 'Instagram Ads', icon: 'bi-instagram', color: '#E4405F' },
            ].map((src) => {
              const isActive = sources[src.key];
              return (
                <div
                  key={src.key}
                  onClick={() => toggleSource(src.key)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? 'border-slate-800 bg-slate-50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <i className={`bi ${src.icon}`} style={{ color: src.color, fontSize: 16 }} />
                    <span className="text-xs font-bold text-slate-800">{src.label}</span>
                  </div>
                  {/* Switch indicator */}
                  <div
                    className={`w-7 h-4 rounded-full transition-colors relative ${
                      isActive ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                        isActive ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Mục tiêu chiến dịch</label>
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi chú & Chỉ số KPI</label>
          <textarea
            rows={3}
            placeholder="Mô tả nội dung quảng bá, đối tượng khách hàng mục tiêu..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </div>
      </form>
    </Offcanvas>
  );
};
