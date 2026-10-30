import React, { useState } from 'react';
import { StepPage } from '@/components/common/StepPage';
import { Button } from '@/components/common/Button';
import { DepartmentActionMenu } from '@/components/common/DepartmentActionMenu';
import { EventOffcanvas } from '@/components/common/EventOffcanvas';
import { CalendarEvent, ChevronDown } from 'react-bootstrap-icons';
import type { ModernStepItem } from '@/types';

interface AccordionItemData {
  id: string;
  title: string;
  items: {
    icon: string;
    iconBg: string;
    iconColor: string;
    heading: string;
    lines: React.ReactNode[];
  }[];
}

const IQC_SANITARY_ACCORDION: AccordionItemData[] = [
  {
    id: 'iqc-san-1',
    title: '1. Nhóm linh kiện kim loại và xi mạ',
    items: [
      {
        icon: 'bi-eye',
        iconBg: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
        heading: 'Yêu cầu ngoại quan (mắt thường)',
        lines: [
          <>
            <strong className="text-slate-700">Bề mặt thô:</strong> Không rỗ khí, nứt ngầm, xỉ lò hoặc ba-via nhọn.
          </>,
          <>
            <strong className="text-slate-700">Đã mạ (Chrome/PVD):</strong> Sáng bóng.{' '}
            <span className="text-rose-600 font-semibold">
              Không nổ mạ, bong tróc, ố vàng, xước mặt tiền &gt; 2mm.
            </span>
          </>,
        ],
      },
      {
        icon: 'bi-tools',
        iconBg: 'bg-emerald-50 border-emerald-100',
        iconColor: 'text-emerald-600',
        heading: 'Yêu cầu cơ học (tay sờ và thử nhanh)',
        lines: [
          <>
            <strong className="text-slate-700">Kiểm tra ren:</strong> Vặn dưỡng ren ăn khớp ngọt, không sượng kẹt, mẻ hay dập ren.
          </>,
          <>
            <strong className="text-slate-700">Độ mịn:</strong> Vuốt láng mịn, không cợn ráp.
          </>,
        ],
      },
    ],
  },
  {
    id: 'iqc-san-2',
    title: '2. Nhóm sứ vệ sinh mua ngoài hoặc gia công',
    items: [
      {
        icon: 'bi-eye',
        iconBg: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
        heading: 'Yêu cầu ngoại quan (mắt thường)',
        lines: [
          <>
            <strong className="text-slate-700">Lớp men sứ:</strong> Phủ đều 100%, trắng sáng.{' '}
            <span className="text-rose-600 font-semibold">
              Từ chối: Nứt chân chim, châm kim &gt; 0.5mm, mỏng men.
            </span>
          </>,
          <>
            <strong className="text-slate-700">Độ phẳng:</strong> Đặt úp chậu không bập bênh (độ hở ≤ 1mm).
          </>,
        ],
      },
      {
        icon: 'bi-hammer',
        iconBg: 'bg-emerald-50 border-emerald-100',
        iconColor: 'text-emerald-600',
        heading: 'Yêu cầu cơ học (gõ)',
        lines: [
          <>
            <strong className="text-slate-700">Kiểm tra âm thanh:</strong> Gõ nhẹ thân sứ nghe thanh, giòn (coong coong).{' '}
            <span className="text-rose-600 font-semibold">
              Kêu "bộp bộp" đục và trầm = nứt ngầm (loại bỏ).
            </span>
          </>,
        ],
      },
    ],
  },
  {
    id: 'iqc-san-3',
    title: '3. Nhóm linh kiện phi kim loại (gioăng, nắp nhựa)',
    items: [
      {
        icon: 'bi-eye',
        iconBg: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
        heading: 'Yêu cầu ngoại quan (mắt thường)',
        lines: [
          <>
            <strong className="text-slate-700">Gioăng đệm:</strong> Cao su mịn, không tạp chất, không bavia thừa viền.
          </>,
          <>
            <strong className="text-slate-700">Nắp nhựa:</strong> Đều màu với thân sứ, không lồi lõm hay co ngót.
          </>,
        ],
      },
      {
        icon: 'bi-arrows-collapse',
        iconBg: 'bg-emerald-50 border-emerald-100',
        iconColor: 'text-emerald-600',
        heading: 'Yêu cầu cơ học (co giãn)',
        lines: [
          <>
            <strong className="text-slate-700">Độ đàn hồi:</strong> Kéo giãn gấp đôi phải co lại hình dạng cũ lập tức, không biến dạng hay nứt.
          </>,
        ],
      },
    ],
  },
];

const IQC_KITCHEN_ACCORDION: AccordionItemData[] = [
  {
    id: 'iqc-kit-1',
    title: '1. Nhóm linh kiện cơ khí và inox',
    items: [
      {
        icon: 'bi-eye',
        iconBg: 'bg-amber-50 border-amber-100',
        iconColor: 'text-amber-600',
        heading: 'Yêu cầu ngoại quan (mắt thường)',
        lines: [
          <>
            <strong className="text-slate-700">Bồn rửa inox:</strong> Đều vân đánh sọc, không ố hóa chất. Góc dập không nhăn nếp.
          </>,
          <>
            <strong className="text-slate-700">Vỏ hút mùi:</strong> Đường giáp mí gấp khít đều, không hở khe lệch mép.
          </>,
        ],
      },
      {
        icon: 'bi-hand-index-thumb',
        iconBg: 'bg-rose-50 border-rose-100',
        iconColor: 'text-rose-600',
        heading: 'Yêu cầu cơ học (thử lực)',
        lines: [
          <>
            <strong className="text-slate-700">Độ cứng:</strong> Ấn mạnh lòng bồn hoặc vỏ hút mùi không bị bập bùng, lún lõm dễ dàng.
          </>,
        ],
      },
    ],
  },
  {
    id: 'iqc-kit-2',
    title: '2. Nhóm kính và mặt bếp',
    items: [
      {
        icon: 'bi-eye',
        iconBg: 'bg-amber-50 border-amber-100',
        iconColor: 'text-amber-600',
        heading: 'Yêu cầu ngoại quan (mắt thường)',
        lines: [
          <>
            Kính trong suốt, không bọt khí ngầm.{' '}
            <span className="text-rose-600 font-semibold">Không xước dăm dài &gt; 1mm.</span>
          </>,
        ],
      },
      {
        icon: 'bi-hand-index',
        iconBg: 'bg-rose-50 border-rose-100',
        iconColor: 'text-rose-600',
        heading: 'Yêu cầu cơ học (tay sờ)',
        lines: [
          <>
            <strong className="text-slate-700">Bo viền kính:</strong> Vuốt dọc viền phải mịn màng.{' '}
            <span className="text-rose-600 font-semibold">
              Cứa tay hoặc mẻ răm răng cưa = Loại bỏ ngay (dễ vỡ).
            </span>
          </>,
        ],
      },
    ],
  },
  {
    id: 'iqc-kit-3',
    title: '3. Nhóm linh kiện điện và điện tử',
    items: [
      {
        icon: 'bi-eye',
        iconBg: 'bg-amber-50 border-amber-100',
        iconColor: 'text-amber-600',
        heading: 'Yêu cầu ngoại quan (mắt thường)',
        lines: [
          <>
            <strong className="text-slate-700">Đấu nối:</strong> Bấm cốt chắc chắn, không hở lõi đồng.
          </>,
          <>
            <strong className="text-slate-700">Bảng mạch:</strong> Mối hàn bóng tròn, không lem chì chập mạch hay bong mạch in.
          </>,
        ],
      },
      {
        icon: 'bi-fan',
        iconBg: 'bg-rose-50 border-rose-100',
        iconColor: 'text-rose-600',
        heading: 'Yêu cầu cơ học (thử nhanh)',
        lines: [
          <>
            <strong className="text-slate-700">Động cơ quạt:</strong> Quay tay cánh trơn tru, không kẹt, trục động cơ không rơ lỏng.
          </>,
        ],
      },
    ],
  },
];

const PROD_ACCORDION: AccordionItemData[] = [
  {
    id: 'prod-1',
    title: 'Nhóm 1: Nhóm dẫn nước (sen vòi, bồn rửa)',
    items: [
      {
        icon: 'bi-speedometer2',
        iconBg: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
        heading: 'Thử áp lực nhanh bằng tay',
        lines: [
          <>
            Đưa khí nén hoặc nước tĩnh 4 - 6 bar.{' '}
            <span className="text-rose-600 font-semibold">
              Thân sản phẩm KHÔNG rỉ nước/xì khí, đọng ẩm.
            </span>
          </>,
        ],
      },
      {
        icon: 'bi-nut',
        iconBg: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
        heading: 'Kiểm tra ren khớp nối (G1/2, G3/4)',
        lines: [
          <>
            Dùng tay vặn vào dưỡng ren chuẩn. Ren ăn khớp êm ái, trơn tru, không kẹt lỏng.
          </>,
        ],
      },
      {
        icon: 'bi-joystick',
        iconBg: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
        heading: 'Kiểm tra bộ phận chuyển động (van gạt, cần xoay)',
        lines: [
          <>
            Góc xoay mượt, không rít. Khi gạt đóng mở phải đầm tay, không lỏng lẻo trôi tự do.
          </>,
        ],
      },
    ],
  },
  {
    id: 'prod-2',
    title: 'Nhóm 2: Nhóm sứ vệ sinh và thiết bị cơ học',
    items: [
      {
        icon: 'bi-door-open',
        iconBg: 'bg-emerald-50 border-emerald-100',
        iconColor: 'text-emerald-600',
        heading: 'Cơ cấu đóng mở (rơi êm, bản lề)',
        lines: [
          <>
            Nắp bồn cầu rơi êm từ từ. Bản lề tủ đóng mở 3 đến 5 lần êm, khít đều, không vênh mép.
          </>,
        ],
      },
      {
        icon: 'bi-record-circle',
        iconBg: 'bg-emerald-50 border-emerald-100',
        iconColor: 'text-emerald-600',
        heading: 'Hệ thống nút nhấn và bộ xả bồn cầu',
        lines: [
          <>
            Nhấn xả thử, nút nhấn phải có độ đàn hồi nảy lên ngay lập tức, không kẹt chìm.
          </>,
        ],
      },
      {
        icon: 'bi-water',
        iconBg: 'bg-emerald-50 border-emerald-100',
        iconColor: 'text-emerald-600',
        heading: 'Đường ống thoát xả (ống siphon)',
        lines: [
          <>
            Mặt trong đường ống xả bồn cầu phải phủ men mịn để không bám chất bẩn.
          </>,
        ],
      },
    ],
  },
  {
    id: 'prod-3',
    title: 'Nhóm 3: Nhóm thiết bị điện và điện tử',
    items: [
      {
        icon: 'bi-lightning-charge',
        iconBg: 'bg-amber-50 border-amber-100',
        iconColor: 'text-amber-600',
        heading: 'Kiểm tra đấu nối và tiếp điện',
        lines: [
          <>
            Dây nguồn cốt chắc chắn, không hở đồng. Phích cắm không móp méo chân cắm.
          </>,
        ],
      },
      {
        icon: 'bi-tablet',
        iconBg: 'bg-amber-50 border-amber-100',
        iconColor: 'text-amber-600',
        heading: 'Bảng điều khiển cảm ứng',
        lines: [
          <>
            Phím phản hồi bíp ngay khi nhấn khô hoặc ẩm. Dải đèn LED hiển thị đầy đủ nét, không mờ.
          </>,
        ],
      },
      {
        icon: 'bi-volume-up',
        iconBg: 'bg-amber-50 border-amber-100',
        iconColor: 'text-amber-600',
        heading: 'Độ ồn và rung lắc cơ học',
        lines: [
          <>
            Công suất lớn nhất: Chạy êm, không tiếng va quệt dị vật, vỏ máy không rung lắc mạnh.
          </>,
        ],
      },
    ],
  },
];

const MEAS_ACCORDION: AccordionItemData[] = [
  {
    id: 'meas-1',
    title: '1. Thước kẹp điện tử / Thước kẹp cơ (Vernier Calipers)',
    items: [
      {
        icon: 'bi-eye',
        iconBg: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
        heading: 'Đánh giá bằng mắt (Visual)',
        lines: [
          <>
            <strong className="text-slate-700">Màn hình & Vạch chia:</strong> Số hiển thị rõ, không chập chờn. Vạch chia sắc nét, không mờ xước.
          </>,
          <>
            <strong className="text-slate-700">Độ khít (Lọt sáng):</strong> Khép mỏ đo hướng lên đèn.{' '}
            <span className="text-rose-600 font-semibold">Tuyệt đối không lọt khe sáng.</span>
          </>,
        ],
      },
      {
        icon: 'bi-hand-index',
        iconBg: 'bg-emerald-50 border-emerald-100',
        iconColor: 'text-emerald-600',
        heading: 'Đánh giá bằng tay (Tactile)',
        lines: [
          <>
            <strong className="text-slate-700">Kéo con trượt:</strong> Thao tác trơn tru, đầm tay, không sượng kẹt.
          </>,
          <>
            <strong className="text-slate-700">Điểm 0 (Zero-point):</strong> Khép chặt mỏ đo, phải hiển thị đúng{' '}
            <span className="font-semibold text-slate-900">0.00 mm</span> hoặc trùng vạch 0 chuẩn.
          </>,
        ],
      },
    ],
  },
  {
    id: 'meas-2',
    title: '2. Dưỡng đo ren chuẩn (Thread Ring/Plug Gauge)',
    items: [
      {
        icon: 'bi-eye',
        iconBg: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
        heading: 'Đánh giá bằng mắt (Visual)',
        lines: [
          <>Các bước răng phải sắc sảo, không sứt mẻ dập ren.</>,
          <>
            Bề mặt <span className="text-rose-600 font-semibold">không rỉ sét, bám dầu mỡ bẩn</span> gây sai lệch.
          </>,
        ],
      },
      {
        icon: 'bi-nut',
        iconBg: 'bg-emerald-50 border-emerald-100',
        iconColor: 'text-emerald-600',
        heading: 'Đánh giá bằng tay (Tactility)',
        lines: [
          <>
            <strong className="text-slate-700">Vuốt vòng ren:</strong> Răng đều đặn, không bị gai gợn bavia.
          </>,
          <>
            <strong className="text-slate-700">Vặn mẫu chuẩn (Master Sample):</strong> Đi vào êm ái, không lắc lư rơ lỏng.
          </>,
        ],
      },
    ],
  },
  {
    id: 'meas-3',
    title: '3. Đồng hồ đo áp suất nước/khí nén (Pressure Gauges)',
    items: [
      {
        icon: 'bi-eye',
        iconBg: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
        heading: 'Đánh giá bằng mắt (Visual)',
        lines: [
          <>
            <strong className="text-slate-700">Mặt kính:</strong> Trong suốt, không nứt, không hấp hơi nước.
          </>,
          <>
            <strong className="text-slate-700">Điểm 0 (Zero-point):</strong> Khi không áp lực kim phải chỉ đúng vạch 0.{' '}
            <span className="text-rose-600 font-semibold">Lệch kim = Loại bỏ.</span>
          </>,
        ],
      },
      {
        icon: 'bi-speedometer2',
        iconBg: 'bg-rose-50 border-rose-100',
        iconColor: 'text-rose-600',
        heading: 'Đánh giá chức năng (Function)',
        lines: [
          <>
            <strong className="text-slate-700">Bật áp lực:</strong> Kim lên đều, mượt.{' '}
            <span className="text-rose-600 font-semibold">
              Giật cục, nhảy cóc, kẹt lơ lửng = Hỏng bộ truyền động.
            </span>
          </>,
        ],
      },
    ],
  },
  {
    id: 'meas-4',
    title: '4. Cân điện tử (Cân định lượng linh kiện, cân bồn cầu)',
    items: [
      {
        icon: 'bi-eye',
        iconBg: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
        heading: 'Đánh giá bằng mắt (Visual)',
        lines: [
          <>
            <strong className="text-slate-700">Ngoại quan:</strong> Mặt phẳng, không móp. 4 chân đế cao su đủ, không mòn lệch.
          </>,
          <>
            <strong className="text-slate-700">Độ thăng bằng:</strong> Phẳng tuyệt đối (kiểm tra bằng giọt nước nếu có).
          </>,
        ],
      },
      {
        icon: 'bi-sliders',
        iconBg: 'bg-rose-50 border-rose-100',
        iconColor: 'text-rose-600',
        heading: 'Đánh giá chức năng (Function)',
        lines: [
          <>
            <strong className="text-slate-700">Trừ bì:</strong> Bấm TARE màn hình phải về đúng 0.0 g.
          </>,
          <>
            <strong className="text-slate-700">Đối chiếu sai số:</strong> Đặt quả cân chuẩn (Master Weight) lên đối chiếu (VD: Đặt quả 1kg hiển thị đúng 1000g hoặc ±1g).
          </>,
        ],
      },
    ],
  },
];

function StandardAccordionList({
  items,
  openId,
  onToggle,
}: {
  items: AccordionItemData[];
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((acc) => {
        const isOpen = openId === acc.id;
        return (
          <div
            key={acc.id}
            className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
          >
            <button
              type="button"
              onClick={() => onToggle(acc.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left font-bold text-[13.5px] transition-colors cursor-pointer ${
                isOpen
                  ? 'bg-blue-50/70 text-blue-900 border-b border-slate-200/80'
                  : 'bg-slate-50/70 text-slate-800 hover:bg-slate-100/70'
              }`}
            >
              <span>{acc.title}</span>
              <ChevronDown
                size={15}
                className={`text-slate-500 transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {isOpen && (
              <div className="p-4 space-y-3.5 bg-white">
                {acc.items.map((sub, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      idx < acc.items.length - 1 ? 'pb-3.5 border-b border-slate-100' : ''
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${sub.iconBg} ${sub.iconColor}`}
                    >
                      <i className={`bi ${sub.icon} text-base`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[13px] text-slate-900 mb-1">
                        {sub.heading}
                      </div>
                      <div className="space-y-1 text-[12.5px] text-slate-600 leading-relaxed">
                        {sub.lines.map((line, lIdx) => (
                          <div key={lIdx}>{line}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function QaStandardsPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState<boolean>(false);

  // Accordion state per section
  const [openIqcSanitary, setOpenIqcSanitary] = useState<string | null>('iqc-san-1');
  const [openIqcKitchen, setOpenIqcKitchen] = useState<string | null>('iqc-kit-1');
  const [openProd, setOpenProd] = useState<string | null>('prod-1');
  const [openMeas, setOpenMeas] = useState<string | null>('meas-1');

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: 'purchase',
      title: 'Mua hàng',
      desc: 'Tiêu chuẩn kiểm định vật tư nhập kho',
      icon: 'bi-box-seam',
    },
    {
      num: 2,
      id: 'production',
      title: 'Sản xuất',
      desc: 'Tiêu chuẩn chất lượng sản phẩm',
      icon: 'bi-tools',
    },
    {
      num: 3,
      id: 'measurement',
      title: 'Đo lường',
      desc: 'Tiêu chuẩn thiết bị đo lường',
      icon: 'bi-rulers',
    },
  ];

  return (
    <StepPage
      title="Tiêu chuẩn chất lượng"
      description="Quản lý bộ tiêu chuẩn kỹ thuật áp dụng cho sản phẩm và vật tư"
      color="indigo"
      icon="bi-award"
      hideTicker={false}
      tickerContext="qa"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
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
    >
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/40">
        {/* ════════════════════════════════════════════════════════════
            BƯỚC 1: MUA HÀNG (TIÊU CHUẨN KIỂM ĐỊNH VẬT TƯ NHẬP KHO)
           ════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Cột trái: Quy trình 4 bước & Bảng phân loại lỗi */}
            <div className="xl:col-span-5 space-y-5">
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <i className="bi bi-signpost-split text-sm" />
                  </div>
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 uppercase tracking-tight m-0">
                    Quy trình 4 bước kiểm định đầu vào
                  </h3>
                </div>

                <div className="space-y-2.5 text-[12.5px]">
                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600" />
                    <div className="font-bold text-slate-900 text-[13px] mb-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-bold">
                        Bước 1
                      </span>
                      Kiểm tra hồ sơ
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>Đối chiếu Phiếu giao hàng / Packing List.</li>
                      <li>Kiểm tra mã sản phẩm khớp với vỏ thùng.</li>
                      <li>Đếm số lượng khai báo.</li>
                      <li>Kiểm tra vỏ thùng (móp méo, rách, ngấm nước).</li>
                    </ul>
                  </div>

                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-sky-500" />
                    <div className="font-bold text-slate-900 text-[13px] mb-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-sky-500 text-white text-[11px] font-bold">
                        Bước 2
                      </span>
                      Khui thùng và lấy mẫu
                    </div>
                    <p className="text-slate-600 mb-1">
                      Quy tắc lấy mẫu ngẫu nhiên nhanh (bằng mắt):
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>
                        <strong className="text-slate-800">&lt; 50 cái:</strong> Lấy ngẫu nhiên 5 cái
                      </li>
                      <li>
                        <strong className="text-slate-800">51 - 150 cái:</strong> Lấy ngẫu nhiên 20 cái
                      </li>
                      <li>
                        <strong className="text-slate-800">151 - 500 cái:</strong> Lấy ngẫu nhiên 32 cái
                      </li>
                    </ul>
                    <div className="text-[11.5px] text-slate-500 italic mt-1.5 flex items-center gap-1">
                      <i className="bi bi-info-circle text-sky-600" />
                      Lấy rải rác trên/giữa/đáy pallet.
                    </div>
                  </div>

                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
                    <div className="font-bold text-slate-900 text-[13px] mb-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[11px] font-bold">
                        Bước 3
                      </span>
                      Đánh giá bằng mắt và tay
                    </div>
                    <div className="text-slate-600">
                      Thực hiện tại bàn QC với ánh sáng tốt. Đánh giá 3 khía cạnh: Ngoại quan, Cảm giác (Vật lý), Phụ kiện &amp; Đóng gói.
                    </div>
                  </div>

                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-600" />
                    <div className="font-bold text-slate-900 text-[13px] mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold">
                        Bước 4
                      </span>
                      Dán tem quyết định
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200">
                        <div className="font-extrabold text-emerald-700 text-[12.5px] flex items-center gap-1 mb-0.5">
                          <i className="bi bi-check-circle-fill" /> PASS
                        </div>
                        <div className="text-[11.5px] text-slate-600">
                          Dán tem xanh, ký xác nhận, nhập kho.
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-rose-50/80 border border-rose-200">
                        <div className="font-extrabold text-rose-700 text-[12.5px] flex items-center gap-1 mb-0.5">
                          <i className="bi bi-x-circle-fill" /> FAIL
                        </div>
                        <div className="text-[11.5px] text-slate-600">
                          Dán tem đỏ, cách ly, khai báo lỗi (ticket).
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <i className="bi bi-clipboard-x text-sm" />
                  </div>
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 uppercase tracking-tight m-0">
                    Bảng phân loại lỗi và quyết định
                  </h3>
                </div>

                <div className="space-y-2.5 text-[12.5px]">
                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50/40 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-600" />
                    <div className="font-bold text-rose-700 text-[13px] mb-1">
                      Lỗi nguy hiểm (Critical) - BÁC BỎ 100%
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>Nứt vỡ thân sứ, nứt nắp kính bếp từ.</li>
                      <li>Nứt ngầm thân đồng (rò nước ngay lập tức).</li>
                      <li>Hở lõi dây điện nguồn.</li>
                    </ul>
                  </div>

                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
                    <div className="font-bold text-amber-900 text-[13px] mb-1">
                      Lỗi nặng (Major) - LẬP BIÊN BẢN (NCR)
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>Sứt ren nối vặn không vào, động cơ kẹt cứng.</li>
                      <li>Bề mặt mạ phồng rộp, nắp bồn cầu rơi tự do.</li>
                    </ul>
                  </div>

                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-600" />
                    <div className="font-bold text-emerald-800 text-[13px] mb-1">
                      Lỗi nhẹ (Minor) - XEM XÉT
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>Xước nhẹ mặt sau hoặc gầm vòi sen, lệch màu carton.</li>
                      <li>Bavia nhựa nhỏ ở nắp bồn cầu (không sắc nhọn).</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Tiêu chuẩn chi tiết */}
            <div className="xl:col-span-7 space-y-5">
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <i className="bi bi-droplet text-sm" />
                  </div>
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 uppercase tracking-tight m-0">
                    I. Tiêu chuẩn linh kiện vệ sinh
                  </h3>
                </div>
                <StandardAccordionList
                  items={IQC_SANITARY_ACCORDION}
                  openId={openIqcSanitary}
                  onToggle={(id) =>
                    setOpenIqcSanitary((prev) => (prev === id ? null : id))
                  }
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <i className="bi bi-fan text-sm" />
                  </div>
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 uppercase tracking-tight m-0">
                    II. Tiêu chuẩn linh kiện nhà bếp
                  </h3>
                </div>
                <StandardAccordionList
                  items={IQC_KITCHEN_ACCORDION}
                  openId={openIqcKitchen}
                  onToggle={(id) =>
                    setOpenIqcKitchen((prev) => (prev === id ? null : id))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            BƯỚC 2: SẢN XUẤT (TIÊU CHUẨN CHẤT LƯỢNG SẢN PHẨM)
           ════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Cột trái */}
            <div className="xl:col-span-5 space-y-5">
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <i className="bi bi-eye text-sm" />
                  </div>
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 uppercase tracking-tight m-0">
                    Ngoại quan tổng quát và đóng gói
                  </h3>
                </div>

                <div className="space-y-2.5 text-[12.5px]">
                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600" />
                    <div className="font-bold text-slate-900 text-[13px] mb-1 flex items-center gap-1.5">
                      <i className="bi bi-droplet-half text-blue-600" />
                      1. Bề mặt xi mạ, sơn tĩnh điện và phủ PVD (mạ chân không)
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>
                        <strong className="text-slate-800">Màu sắc và độ sáng:</strong> Phủ đều 100%.{' '}
                        <span className="text-rose-600 font-semibold">
                          Từ chối: Nổ mạ, bong tróc, ố xỉn, lệch màu.
                        </span>
                      </li>
                      <li>
                        <strong className="text-slate-800">Độ mịn:</strong> Không cợn, ráp hoặc dính bụi sơn cứng đầu.
                      </li>
                    </ul>
                  </div>

                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-sky-500" />
                    <div className="font-bold text-slate-900 text-[13px] mb-1 flex items-center gap-1.5">
                      <i className="bi bi-heptagon-half text-sky-600" />
                      2. Bề mặt gốm sứ và kính
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>
                        <strong className="text-slate-800">Men sứ:</strong> Láng mịn như gương.{' '}
                        <span className="text-rose-600 font-semibold">
                          Từ chối: Nứt chân chim, bọt khí ngầm, châm kim đen.
                        </span>
                      </li>
                      <li>
                        <strong className="text-slate-800">Mặt kính:</strong> Phẳng tuyệt đối, cạnh bo mài mịn, không sứt mẻ.
                      </li>
                    </ul>
                  </div>

                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
                    <div className="font-bold text-slate-900 text-[13px] mb-1 flex items-center gap-1.5">
                      <i className="bi bi-boxes text-amber-600" />
                      3. Bề mặt gỗ, nhựa và đá
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>
                        <strong className="text-slate-800">Khớp nối và khe hở:</strong> Ghép nối phải khít, keo không tràn.
                      </li>
                      <li>
                        <strong className="text-slate-800">Bề mặt nhựa:</strong> Phẳng phiu, không bị co móp do co ngót nhiệt.
                      </li>
                    </ul>
                  </div>

                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-slate-500" />
                    <div className="font-bold text-slate-900 text-[13px] mb-1 flex items-center gap-1.5">
                      <i className="bi bi-box-seam text-slate-600" />
                      Quy trình khui thùng và đóng gói
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>
                        <strong className="text-slate-800">Hồ sơ và phụ kiện:</strong> Đầy đủ chi tiết phụ trợ, phiếu hướng dẫn lắp đặt, phiếu bảo hành.
                      </li>
                      <li>
                        <strong className="text-slate-800">Chống va đập:</strong> Xốp nẹp dày ≥3cm, lắc không kêu. Hàng nặng phải có pallet gỗ bảo vệ.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải */}
            <div className="xl:col-span-7">
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <i className="bi bi-tools text-sm" />
                  </div>
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 uppercase tracking-tight m-0">
                    Tiêu chuẩn tính năng và cơ học
                  </h3>
                </div>
                <StandardAccordionList
                  items={PROD_ACCORDION}
                  openId={openProd}
                  onToggle={(id) => setOpenProd((prev) => (prev === id ? null : id))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            BƯỚC 3: ĐO LƯỜNG (TIÊU CHUẨN THIẾT BỊ ĐO LƯỜNG)
           ════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Cột trái: Tính pháp lý */}
            <div className="xl:col-span-5">
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <i className="bi bi-shield-check text-sm" />
                  </div>
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 uppercase tracking-tight m-0">
                    Tính pháp lý &amp; trạng thái thiết bị
                  </h3>
                </div>

                <div className="mb-3 text-[13px] text-slate-600">
                  Đối chiếu thiết bị với{' '}
                  <strong className="text-slate-900">"Tiêu chuẩn 3 Có"</strong> trước khi sử dụng:
                </div>

                <div className="space-y-2.5 text-[12.5px]">
                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-600" />
                    <div className="font-bold text-slate-900 text-[13px] mb-1 flex items-center gap-1.5">
                      <i className="bi bi-patch-check-fill text-emerald-600" />
                      1. CÓ Tem hiệu chuẩn (Tem xanh)
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>Tem hiệu chuẩn nguyên vẹn, không rách nát, mờ chữ.</li>
                      <li>
                        Đọc ngày hiệu chuẩn gần nhất và ngày hết hạn.{' '}
                        <span className="text-rose-600 font-semibold">
                          Quá hạn = Gửi đi hiệu chuẩn lại ngay.
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600" />
                    <div className="font-bold text-slate-900 text-[13px] mb-1 flex items-center gap-1.5">
                      <i className="bi bi-qr-code-scan text-blue-600" />
                      2. CÓ Mã định danh (Device ID)
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>
                        Thiết bị được khắc hoặc dán nhãn mã số quản lý (Ví dụ: TK-IQC-01).
                      </li>
                      <li>Đối chiếu đúng với Nhật ký quản lý thiết bị đo lường.</li>
                    </ul>
                  </div>

                  <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
                    <div className="font-bold text-slate-900 text-[13px] mb-1 flex items-center gap-1.5">
                      <i className="bi bi-box-seam-fill text-amber-600" />
                      3. CÓ Hộp đựng bảo vệ chuyên dụng
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 m-0">
                      <li>Khi không sử dụng phải cất trong hộp nhựa có mút xốp.</li>
                      <li>
                        <span className="text-rose-600 font-semibold">KHÔNG</span> để lăn lóc trên bàn/kệ tránh va đập sai lệch.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Tiêu chuẩn đánh giá trực quan */}
            <div className="xl:col-span-7">
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <i className="bi bi-rulers text-sm" />
                  </div>
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 uppercase tracking-tight m-0">
                    Tiêu chuẩn đánh giá trực quan (Mắt &amp; Tay)
                  </h3>
                </div>
                <StandardAccordionList
                  items={MEAS_ACCORDION}
                  openId={openMeas}
                  onToggle={(id) => setOpenMeas((prev) => (prev === id ? null : id))}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StepPage>
  );
}

export default QaStandardsPage;

