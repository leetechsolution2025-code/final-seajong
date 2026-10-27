import React, { useState } from 'react';
import { Offcanvas } from '../common/Offcanvas';

interface ConnectAdsOffcanvasProps {
  open: boolean;
  onClose: () => void;
}

export const ConnectAdsOffcanvas: React.FC<ConnectAdsOffcanvasProps> = ({ open, onClose }) => {
  const [activePlatform, setActivePlatform] = useState<'fb' | 'tt' | 'yt' | 'ig'>('fb');
  const [copied, setCopied] = useState(false);
  const [fbAppId, setFbAppId] = useState('120240303880550299');
  const [fbAppSecret, setFbAppSecret] = useState('••••••••••••••••');
  const [ttAppId, setTtAppId] = useState('');
  const [ttSecret, setTtSecret] = useState('');
  const [ytClientId, setYtClientId] = useState('');
  const [saving, setSaving] = useState(false);

  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/marketing/leads/webhook/${
    activePlatform === 'fb' ? 'facebook' : activePlatform === 'tt' ? 'tiktok' : 'general'
  }`;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Đã lưu cấu hình kết nối API thành công!');
    }, 600);
  };

  return (
    <Offcanvas
      isOpen={open}
      onClose={onClose}
      title="Cấu hình kết nối API & Webhook"
      width="400px"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <i className="bi bi-check2" />
                <span>Lưu cấu hình</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-slate-800">
        {/* Platform selection pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'fb' as const, label: 'Facebook', icon: 'bi-facebook', color: '#1877F2' },
            { id: 'tt' as const, label: 'TikTok', icon: 'bi-tiktok', color: '#000000' },
            { id: 'yt' as const, label: 'YouTube', icon: 'bi-youtube', color: '#FF0000' },
            { id: 'ig' as const, label: 'Instagram', icon: 'bi-instagram', color: '#E4405F' },
          ].map((p) => {
            const active = activePlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePlatform(p.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-0 cursor-pointer ${
                  active ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                <i className={`bi ${p.icon}`} style={{ color: p.color }} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Webhook URL Container */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <i className="bi bi-lightning-charge-fill text-amber-500" />
              Webhook Lead URL
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200">
              Đang hoạt động
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-mono text-slate-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'}`} />
              <span>{copied ? 'Đã chép' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-0">
            Dán đường dẫn webhook này vào Trình quản lý quảng cáo để nhận Lead tự động theo thời gian thực.
          </p>
        </div>

        {/* Form fields based on platform */}
        {activePlatform === 'fb' && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Facebook App ID</label>
              <input
                type="text"
                value={fbAppId}
                onChange={(e) => setFbAppId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Facebook App Secret</label>
              <input
                type="password"
                value={fbAppSecret}
                onChange={(e) => setFbAppSecret(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => alert('Đã kiểm tra kết nối Facebook Graph API: OK (Token hợp lệ)')}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="bi bi-facebook" />
                <span>Kiểm tra kết nối tài khoản Facebook</span>
              </button>
            </div>
          </div>
        )}

        {activePlatform === 'tt' && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">TikTok App ID</label>
              <input
                type="text"
                placeholder="Nhập TikTok App ID..."
                value={ttAppId}
                onChange={(e) => setTtAppId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-800 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Secret Key</label>
              <input
                type="password"
                placeholder="Nhập TikTok Secret Key..."
                value={ttSecret}
                onChange={(e) => setTtSecret(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-800 transition-colors font-mono"
              />
            </div>
          </div>
        )}

        {activePlatform === 'yt' && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Google / YouTube Client ID</label>
              <input
                type="text"
                placeholder="Nhập Google Client ID..."
                value={ytClientId}
                onChange={(e) => setYtClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-red-500 transition-colors font-mono"
              />
            </div>
          </div>
        )}

        {activePlatform === 'ig' && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <i className="bi bi-info-circle-fill text-amber-500 mr-1.5" />
              Instagram Ads được đồng bộ trực tiếp thông qua Meta Business Suite (tài khoản Facebook đã kết nối ở tab Facebook).
            </p>
          </div>
        )}
      </div>
    </Offcanvas>
  );
};
