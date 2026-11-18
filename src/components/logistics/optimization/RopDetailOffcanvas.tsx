import React, { useState } from 'react';
import { Offcanvas } from '@/components/common/Offcanvas';
import { Button } from '@/components/common/Button';
import {
  ShieldCheck,
  Calculator,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  Package,
  Clock,
} from 'lucide-react';

export interface RopDetailItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  physicalStock: number;
  availableStock: number;
  dailyDemand: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  eoq: number;
  replenishmentSource: 'LSX' | 'PO';
  status: 'critical' | 'reorder' | 'safe' | 'excess' | 'pending_approval';
  estimatedCost: number;
  hasBom?: boolean;
  bomCode?: string | null;
}

interface RopDetailOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: RopDetailItem | null;
}

export const RopDetailOffcanvas: React.FC<RopDetailOffcanvasProps> = ({
  isOpen,
  onClose,
  selectedItem,
}) => {
  // Chế độ xem: 'item' (Sản phẩm đang chọn) hoặc 'example' (Mô phỏng chuẩn mẫu SJ-601)
  const [viewMode, setViewMode] = useState<'item' | 'example'>('item');

  // Dữ liệu mẫu SJ-601 từ bài toán chuẩn
  const sampleData = {
    sku: 'SJ-601',
    name: 'Bộ sen tắm đứng nóng lạnh mạ Crom SJ-601',
    unit: 'bộ',
    dAvg: 10,
    sigmaD: 3,
    l: 7,
    sigmaL: 1.5,
    z: 1.65,
    serviceLevel: '95%',
    ss: 28,
    rop: 98,
    eoq: 50,
  };

  // Tính toán tham số hiển thị theo viewMode
  const isItemMode = viewMode === 'item' && selectedItem;
  const currentSku = isItemMode ? selectedItem.sku : sampleData.sku;
  const currentName = isItemMode ? selectedItem.name : sampleData.name;
  const currentUnit = isItemMode ? selectedItem.unit : sampleData.unit;
  const dAvg = isItemMode ? selectedItem.dailyDemand || 2 : sampleData.dAvg;
  const leadTime = isItemMode ? selectedItem.leadTimeDays || 7 : sampleData.l;
  const ss = isItemMode ? selectedItem.safetyStock : sampleData.ss;
  const rop = isItemMode ? selectedItem.reorderPoint : sampleData.rop;
  const eoq = isItemMode ? selectedItem.eoq : sampleData.eoq;
  const sigmaD = isItemMode ? Math.max(1, Math.round(dAvg * 0.3)) : sampleData.sigmaD;
  const sigmaL = isItemMode ? 1.5 : sampleData.sigmaL;
  const zVal = 1.65;

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      width="400px"
      zIndex={1500}
      icon={<ShieldCheck size={20} className="text-blue-600" />}
      title="Tồn Kho An Toàn & Điểm ROP"
      description="Công thức toán học & mô hình tính toán tự động"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-slate-500">
            Mã: <strong className="text-blue-700 font-mono">{currentSku}</strong>
          </div>
          <Button variant="secondary" size="md" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs pb-6">
        {/* Toggle chuyển đổi xem sản phẩm thực tế vs Ví dụ mẫu SJ-601 */}
        {selectedItem && (
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('item')}
              className={`flex-1 py-1 px-2 rounded-md font-medium text-xs transition-all ${
                viewMode === 'item'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo mã đang chọn
            </button>
            <button
              type="button"
              onClick={() => setViewMode('example')}
              className={`flex-1 py-1 px-2 rounded-md font-medium text-xs transition-all ${
                viewMode === 'example'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ví dụ mẫu (SJ-601)
            </button>
          </div>
        )}

        {/* Thông tin mặt hàng đang xem */}
        <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/60 p-3 rounded-xl border border-blue-200/80">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-blue-700 font-bold font-mono px-1.5 py-0.5 bg-blue-100/80 rounded">
              {currentSku}
            </span>
            <span className="text-slate-500 font-medium">ĐVT: {currentUnit}</span>
          </div>
          <div className="font-bold text-slate-900 text-xs mt-1.5 line-clamp-2">
            {currentName}
          </div>
          {isItemMode && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-200/50 text-[11px]">
              <div>
                Tồn khả dụng:{' '}
                <strong className="text-slate-900 font-mono">
                  {selectedItem.availableStock}
                </strong>
              </div>
              <span className="text-slate-300">•</span>
              <div>
                Nguồn cấp:{' '}
                <strong className="text-indigo-700">
                  {selectedItem.replenishmentSource === 'LSX' ? 'SX & Lắp ráp' : 'Mua ngoài'}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Giới thiệu nguyên lý */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
          <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
            <Lightbulb size={14} className="text-amber-500" />
            <span>Nguyên lý vận hành tự động:</span>
          </div>
          Để kho không bao giờ rơi vào tình trạng đứt hàng (Stockout) khi đại lý cần gấp, nhưng cũng không bị chôn vốn do trữ quá nhiều, hệ thống áp dụng công thức tính tự động thay vì dựa vào cảm tính của thủ kho.
        </div>

        {/* ĐỒ THỊ MÔ HÌNH TỒN KHO RĂNG CƯA (SAWTOOTH INVENTORY MODEL) */}
        <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp size={13} className="text-blue-600" />
              Đồ thị mức tồn kho & Điểm đặt lại (ROP)
            </span>
          </div>

          {/* SVG Vector Chart Responsive */}
          <div className="w-full bg-slate-50/70 rounded-lg p-2 border border-slate-100">
            <svg
              viewBox="0 0 350 200"
              className="w-full h-auto text-[10px] font-sans select-none"
            >
              <defs>
                <linearGradient id="safetyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="leadTimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.05" />
                </linearGradient>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706" />
                </marker>
              </defs>

              {/* Vùng đệm an toàn (Safety Stock Zone) */}
              <rect
                x="45"
                y="140"
                width="290"
                height="35"
                fill="url(#safetyGradient)"
              />

              {/* Vùng Lead time (Thời gian chờ hàng) */}
              <polygon
                points="110,85 180,140 180,175 110,175"
                fill="url(#leadTimeGradient)"
              />

              {/* Trục tọa độ X và Y */}
              <line x1="45" y1="15" x2="45" y2="175" stroke="#475569" strokeWidth="1.5" />
              <line x1="45" y1="175" x2="340" y2="175" stroke="#475569" strokeWidth="1.5" />

              {/* Mũi tên trục */}
              <polygon points="45,10 42,16 48,16" fill="#475569" />
              <polygon points="345,175 339,172 339,178" fill="#475569" />

              <text x="40" y="10" fill="#475569" textAnchor="end" fontSize="9" fontWeight="bold">
                Mức tồn
              </text>
              <text x="340" y="190" fill="#475569" textAnchor="end" fontSize="9" fontWeight="bold">
                Thời gian (t)
              </text>

              {/* Đường gióng ngang: Max */}
              <line x1="45" y1="30" x2="335" y2="30" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              <text x="40" y="34" fill="#64748b" textAnchor="end" fontSize="9" fontWeight="600">
                Max
              </text>

              {/* Đường gióng ngang: ROP */}
              <line x1="45" y1="85" x2="335" y2="85" stroke="#ea580c" strokeWidth="1.2" strokeDasharray="4 2" />
              <text x="40" y="89" fill="#ea580c" textAnchor="end" fontSize="9" fontWeight="bold">
                ROP
              </text>

              {/* Đường gióng ngang: SS */}
              <line x1="45" y1="140" x2="335" y2="140" stroke="#6366f1" strokeWidth="1.2" strokeDasharray="4 2" />
              <text x="40" y="144" fill="#6366f1" textAnchor="end" fontSize="9" fontWeight="bold">
                SS
              </text>

              {/* Mốc 0 */}
              <text x="40" y="179" fill="#64748b" textAnchor="end" fontSize="9">
                0
              </text>

              {/* Đường chu kỳ răng cưa tồn kho (Sawtooth) */}
              {/* Chu kỳ 1: từ Max(50,30) đi xuống ROP(110,85) -> chạm SS(180,140) -> Bật thẳng lên Max(180,30) */}
              <polyline
                points="50,30 110,85 180,140 180,30 240,85 310,140 310,30"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Điểm kích hoạt tại ROP */}
              <circle cx="110" cy="85" r="3.5" fill="#ea580c" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="240" cy="85" r="3.5" fill="#ea580c" stroke="#ffffff" strokeWidth="1.5" />

              {/* Mũi tên và chú thích thời gian chờ Lead time */}
              <line x1="110" y1="183" x2="180" y2="183" stroke="#d97706" strokeWidth="1.2" markerEnd="url(#arrow)" />
              <line x1="110" y1="180" x2="110" y2="186" stroke="#d97706" strokeWidth="1.2" />
              <line x1="180" y1="180" x2="180" y2="186" stroke="#d97706" strokeWidth="1.2" />
              <text x="145" y="195" fill="#b45309" textAnchor="middle" fontSize="9" fontWeight="bold">
                Lead time (L = {leadTime}d)
              </text>

              {/* Nhãn ghi chú trực quan */}
              <text x="115" y="78" fill="#ea580c" fontSize="8.5" fontWeight="bold">
                Kích hoạt đặt bù (ROP={rop})
              </text>
              <text x="210" y="158" fill="#4338ca" fontSize="8.5" fontWeight="600">
                Tồn an toàn (SS={ss})
              </text>
            </svg>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between px-1">
            <span className="flex items-center gap-1 text-amber-700">
              <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
              Điểm kích hoạt: <strong>{rop} {currentUnit}</strong>
            </span>
            <span className="flex items-center gap-1 text-indigo-700">
              <span className="inline-block w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
              Đệm an toàn: <strong>{ss} {currentUnit}</strong>
            </span>
          </div>
        </div>

        {/* 1. CÔNG THỨC TOÁN HỌC CHUẨN QUỐC TẾ */}
        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-3 shadow-xs">
          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Calculator size={15} className="text-indigo-600" />
            <span>1. Công thức Toán học chuẩn quốc tế</span>
          </div>

          {/* A. Điểm đặt hàng lại (ROP) */}
          <div className="space-y-1.5">
            <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1 text-blue-900">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              <span>A. Điểm đặt hàng lại (Reorder Point - ROP)</span>
            </div>
            <div className="p-2 bg-blue-50/70 border border-blue-200/80 rounded-lg text-center font-mono font-bold text-blue-900 text-xs">
              ROP = (D_avg × L) + SS
            </div>
            <div className="text-[11px] text-slate-600 space-y-1 pl-2.5">
              <div>
                • <strong className="text-slate-800">D_avg:</strong> Nhu cầu tiêu thụ trung bình mỗi ngày (Daily Average Demand).
              </div>
              <div>
                • <strong className="text-slate-800">L:</strong> Thời gian chờ hàng (Lead Time tính bằng ngày) – thời gian từ lúc duyệt đơn mua hoặc duyệt Lệnh sản xuất đến khi hàng nhập kho hoàn tất.
              </div>
              <div>
                • <strong className="text-slate-800">SS:</strong> Tồn kho an toàn (Safety Stock).
              </div>
            </div>
          </div>

          {/* B. Tồn kho an toàn (SS) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1 text-indigo-900">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
              <span>B. Công thức Tồn kho an toàn (Safety Stock - SS)</span>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Hấp thụ cả sự biến động của nhu cầu thị trường và sự chậm trễ giao hàng của nhà cung cấp:
            </p>
            <div className="p-2 bg-indigo-50/70 border border-indigo-200/80 rounded-lg text-center font-mono font-bold text-indigo-900 text-xs">
              SS = Z × √(L × σ_D² + D_avg² × σ_L²)
            </div>
            <div className="text-[11px] text-slate-600 space-y-1.5 pl-2.5">
              <div>
                • <strong className="text-slate-800">Z:</strong> Hệ số mức độ phục vụ (Service Level).
                <div className="pl-3 text-slate-500 mt-0.5">
                  - Đáp ứng 95% đơn hàng đại lý: <strong className="text-indigo-700 font-mono">Z = 1.65</strong>
                  <br />
                  - Mặt hàng chiến lược (Nhóm AX), đáp ứng 98%: <strong className="text-indigo-700 font-mono">Z = 2.05</strong>
                </div>
              </div>
              <div>
                • <strong className="text-slate-800">σ_D:</strong> Độ lệch chuẩn của nhu cầu hàng ngày (đo mức độ thất thường của đại lý đặt hàng).
              </div>
              <div>
                • <strong className="text-slate-800">σ_L:</strong> Độ lệch chuẩn thời gian giao hàng (đo mức độ trễ hẹn của nhà cung cấp phôi/vật tư hoặc xưởng đúc mạ).
              </div>
            </div>
          </div>
        </div>

        {/* 2. VÍ DỤ MÔ PHỎNG BÀI TOÁN THỰC TẾ TẠI SEAJONG */}
        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-3 shadow-xs">
          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Package size={15} className="text-emerald-600" />
            <span>2. Ví dụ mô phỏng bài toán thực tế tại Seajong</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px]">
            <div className="text-slate-800 font-semibold mb-1">
              Mặt hàng: <span className="text-blue-700">{currentName}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-600">
              <div>
                • Nhu cầu bán TB (D_avg): <strong className="font-mono text-slate-900">{dAvg} {currentUnit}/ngày</strong>
              </div>
              <div>
                • Biến động nhu cầu (σ_D): <strong className="font-mono text-slate-900">{sigmaD} {currentUnit}/ngày</strong>
              </div>
              <div>
                • Thời gian chờ (L): <strong className="font-mono text-slate-900">{leadTime} ngày</strong>
              </div>
              <div>
                • Biến động giao hàng (σ_L): <strong className="font-mono text-slate-900">{sigmaL} ngày</strong>
              </div>
              <div className="col-span-2">
                • Mục tiêu phục vụ: <strong className="font-mono text-slate-900">95% (Z = 1.65)</strong>
              </div>
            </div>
          </div>

          {/* Các bước tính toán */}
          <div className="space-y-2 text-[11px]">
            {/* Bước 1 */}
            <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-200/60">
              <div className="font-bold text-indigo-900 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-indigo-600" />
                <span>Bước 1: Tính Tồn kho an toàn (SS)</span>
              </div>
              <div className="font-mono text-slate-700 mt-1 pl-4 space-y-0.5">
                <div>SS = 1.65 × √({leadTime} × {sigmaD}² + {dAvg}² × {sigmaL}²)</div>
                <div>= 1.65 × √({leadTime * Math.pow(sigmaD, 2)} + {Math.pow(dAvg, 2) * Math.pow(sigmaL, 2)})</div>
                <div>= 1.65 × √{leadTime * Math.pow(sigmaD, 2) + Math.pow(dAvg, 2) * Math.pow(sigmaL, 2)}</div>
                <div className="font-bold text-indigo-800 text-xs pt-1">
                  ≈ <span className="px-1.5 py-0.5 bg-indigo-100 rounded">{ss} {currentUnit}</span>
                </div>
              </div>
            </div>

            {/* Bước 2 */}
            <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200/60">
              <div className="font-bold text-amber-900 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-amber-600" />
                <span>Bước 2: Tính Điểm đặt hàng lại (ROP)</span>
              </div>
              <div className="font-mono text-slate-700 mt-1 pl-4 space-y-0.5">
                <div>ROP = (D_avg × L) + SS</div>
                <div>= ({dAvg} × {leadTime}) + {ss} = {dAvg * leadTime} + {ss}</div>
                <div className="font-bold text-amber-800 text-xs pt-1">
                  = <span className="px-1.5 py-0.5 bg-amber-100 rounded">{rop} {currentUnit}</span>
                </div>
              </div>
            </div>

            {/* Quy tắc vận hành tự động */}
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
              <div className="font-bold flex items-center gap-1">
                <Clock size={13} className="text-emerald-700" />
                <span>Quy tắc vận hành tự động:</span>
              </div>
              <div className="mt-1 leading-relaxed">
                Khi mức tồn kho khả dụng của mã{' '}
                <strong className="font-mono text-slate-900">{currentSku}</strong> giảm xuống mức{' '}
                <strong className="font-mono text-rose-700">≤ {rop} {currentUnit}</strong>:
                Hệ thống tự động kích hoạt đề xuất bù tồn (Lập Lệnh sản xuất nếu có mã định mức BOM, hoặc Yêu cầu mua hàng nếu mua ngoài) để chuyển trình Giám đốc duyệt, đảm bảo luôn bù hàng trước khi chạm vào vùng đệm an toàn SS ({ss} {currentUnit}).
              </div>
            </div>
          </div>
        </div>
      </div>
    </Offcanvas>
  );
};

export default RopDetailOffcanvas;
