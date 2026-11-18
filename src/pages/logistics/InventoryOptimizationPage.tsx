import React, { useState, useMemo } from 'react';
import { StepPage } from '@/components/common/StepPage';
import { InventoryOptimization } from '@/components/logistics/optimization/InventoryOptimization';
import type { ModernStepItem } from '@/types';
import type { TickerItem } from '@/components/layout/DynamicTicker';

export interface InventoryOptimizationPageProps {
  onShowToast?: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

export const InventoryOptimizationPage: React.FC<InventoryOptimizationPageProps> = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: 'abc-xyz',
      title: 'Phân tích ABC / XYZ',
      desc: 'Phân nhóm Pareto và ma trận vị trí lưu kho',
      icon: 'bi-grid-3x3-gap-fill',
      badge: 'MA TRẬN',
    },
    {
      num: 2,
      id: 'lot-serial-aging',
      title: 'Lô, Serial & Tuổi tồn',
      desc: 'Quy tắc FIFO/FEFO, hạn dùng & hàng đọng',
      icon: 'bi-upc-scan',
      badge: 'TRUY VẾT',
    },
    {
      num: 3,
      id: 'rop-safety-stock',
      title: 'Tồn an toàn & ROP',
      desc: 'Điểm đặt hàng lại và tự động tạo LSX / PO',
      icon: 'bi-shield-check',
      badge: 'ĐẶT HÀNG LẠI',
    },
  ];

  // ── ĐƯA NỘI DUNG 4 THẺ KPI VÀO COMPONENT TICKER THEO TỪNG BƯỚC ──
  const tickerNews: TickerItem[] = useMemo(() => {
    if (currentStep === 1) {
      return [
        {
          badge: 'NHÓM A (GIÁ TRỊ CAO)',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          text: '<strong>4 SKU</strong> chiếm <strong>73% tổng giá trị</strong> (Cực kỳ quan trọng, kiểm soát tồn nghiêm ngặt JIT, bố trí tầng 1-2 gần cửa xuất)',
        },
        {
          badge: 'NHÓM B (GIÁ TRỊ VỪA)',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          text: '<strong>4 SKU</strong> chiếm <strong>20% giá trị</strong> luân chuyển (Giữ tồn định kỳ, nhu cầu biến động vừa)',
        },
        {
          badge: 'NHÓM C (PHỤ KIỆN & ỐC VÍT)',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
          text: '<strong>4 SKU</strong> chiếm <strong>7% giá trị</strong> (Phụ kiện, ốc vít, gioăng - Nhập sỉ theo bao/thùng lớn)',
        },
        {
          badge: 'TỔNG GIÁ TRỊ LUÂN CHUYỂN',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          text: 'Tổng giá trị hàng hoá phân tích đạt: <strong>4.832,2 triệu đồng</strong> (12 SKU chủ lực thiết bị vệ sinh & linh kiện Seajong)',
        },
      ];
    }
    if (currentStep === 2) {
      return [
        {
          badge: 'HÀNG TƯƠI MỚI (<30 NGÀY)',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          text: '<strong>2 Lô</strong> nhập mới dưới 30 ngày, chất lượng men sứ và lớp mạ đạt chuẩn tối ưu 100%',
        },
        {
          badge: 'TIÊU CHUẨN (30-90 NGÀY)',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          text: '<strong>1 Lô</strong> lưu kho 30-90 ngày, tốc độ luân chuyển bình thường theo kế hoạch',
        },
        {
          badge: 'CHẬM LUÂN CHUYỂN (90-180D)',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          text: '<strong>1 Lô</strong> nằm kho 90-180 ngày (Ưu tiên chỉ định xuất theo nguyên tắc FIFO để tránh lão hóa gioăng & xi mạ)',
        },
        {
          badge: 'CẢNH BÁO FEFO & ĐÓNG BĂNG',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          text: '<strong>2 Lô</strong> cận hạn sử dụng <60 ngày (Keo silicon & Pin cảm ứng) hoặc tồn đọng >180 ngày cần mở chương trình xả hàng',
        },
      ];
    }
    // Bước 3: ROP
    return [
      {
        badge: 'NGUY CẤP',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        text: '<strong>2 SKU</strong> dưới mức tồn an toàn (Bồn cầu SJ-B101 & Van Ceramic Sedal) - Cần tạo Lệnh sản xuất / Đơn mua khẩn cấp!',
      },
      {
        badge: 'CHẠM NGƯỠNG',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        text: '<strong>2 SKU</strong> chạm điểm đặt hàng lại (Sen cây SJ-S501 & Keo Silicon) - Sẵn sàng tạo LSX / PO bù tồn',
      },
      {
        badge: 'AN TOÀN',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        text: '<strong>2 SKU</strong> mức tồn đạt chuẩn, duy trì tỷ lệ đáp ứng đơn hàng đại lý 95%',
      },
      {
        badge: 'NGÂN SÁCH BÙ TỒN ĐỀ XUẤT',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        text: 'Dự toán ngân sách bổ sung theo định mức EOQ tối ưu: <strong>762,5 triệu đồng</strong>',
      },
    ];
  }, [currentStep]);

  return (
    <StepPage
      className="logistics-mobile-page"
      title="Tối ưu tồn kho"
      description="Phân tích ma trận ABC/XYZ, kiểm soát tuổi tồn & hạn dùng (FIFO/FEFO), tự động tính toán tồn an toàn và điểm đặt hàng lại (ROP)"
      icon="bi-sliders"
      color="blue"
      badge="TỐI ƯU TỒN KHO"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      hideTicker={false}
      customTickerNews={tickerNews}
    >
      <InventoryOptimization currentStep={currentStep} />
    </StepPage>
  );
};

export default InventoryOptimizationPage;
