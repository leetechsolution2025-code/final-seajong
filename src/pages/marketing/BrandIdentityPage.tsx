import React, { useState } from 'react';
import { PageTitle } from '../../components/ui/PageTitle';
import { DynamicTicker } from '../../components/layout/DynamicTicker';
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Type,
  Palette,
  Eye,
  MessageSquare,
  FileDown,
  Info,
  CheckCircle2,
  XCircle,
  Briefcase,
  Heart,
  Gem,
} from 'lucide-react';

const BRAND_NAME = 'SEAJONG';
const BRAND_FULL = 'Công ty Cổ phần Seajong Việt Nam';
const BRAND_MISSION = 'Tiên phong kiến tạo giá trị thực';
const BRAND_TAGLINE = 'Công nghệ Hàn Quốc – Chất lượng cao – Giá hợp lý';
const BRAND_LOGO = '/seajong-logo-transparent.png';
const BRAND_LOGO_WHITE = '/seajong-logo-white.png';
const BRAND_WEBSITE = 'https://seajong.com';
const BRAND_EMAIL = 'marketing@seajong.com';
const BRAND_HOTLINE = '1900 633 862';
const BRAND_HEADQUARTERS = 'Hà Nội, Việt Nam';

const BRAND_COLORS = [
  {
    name: 'Navy Primary',
    hex: '#003087',
    rgb: 'rgb(0, 48, 135)',
    cmyk: 'C100 M80 Y10 K15',
    usage: 'Màu nhận diện chủ đạo – Logo, Headline chính, Nút thao tác CTA quan trọng',
    textColor: '#ffffff',
  },
  {
    name: 'Gold Accent',
    hex: '#C9A84C',
    rgb: 'rgb(201, 168, 76)',
    cmyk: 'C20 M30 Y80 K5',
    usage: 'Điểm nhấn cao cấp – Huy hiệu chứng nhận, Viền card VIP, Icon nổi bật',
    textColor: '#ffffff',
  },
  {
    name: 'Deep Dark',
    hex: '#0D1B2A',
    rgb: 'rgb(13, 27, 42)',
    cmyk: 'C85 M70 Y50 K60',
    usage: 'Màu chữ chính (Body text), Nền giao diện tối Dark Mode, Footer',
    textColor: '#ffffff',
  },
  {
    name: 'Light Cream',
    hex: '#F8F5F0',
    rgb: 'rgb(248, 245, 240)',
    cmyk: 'C2 M2 Y5 K0',
    usage: 'Nền trang nội dung, Khung thẻ Card nền sáng, Vùng làm dịu mắt',
    textColor: '#1e293b',
  },
  {
    name: 'Seajong Red',
    hex: '#C0392B',
    rgb: 'rgb(192, 57, 43)',
    cmyk: 'C15 M90 Y90 K10',
    usage: 'Biển giá khuyến mãi, Nhãn cảnh báo an toàn kỹ thuật, Điểm nhấn giá',
    textColor: '#ffffff',
  },
  {
    name: 'Chrome Silver',
    hex: '#8D9DB0',
    rgb: 'rgb(141, 157, 176)',
    cmyk: 'C40 M25 Y15 K5',
    usage: 'Đường viền ngăn cách, Chữ phụ Muted text, Gợi tả chất liệu Inox mạ Crom',
    textColor: '#ffffff',
  },
];

const TYPOGRAPHY = [
  {
    name: 'Montserrat',
    role: 'Font Heading (Tiêu đề, Tên sản phẩm & Tên thương hiệu)',
    weights: [
      { name: '800 — ExtraBold', weight: 800, sample: 'SEAJONG THIẾT BỊ VỆ SINH' },
      { name: '700 — Bold', weight: 700, sample: 'Sen Cây Phím Đàn SJ-SH0004S' },
      { name: '600 — SemiBold', weight: 600, sample: 'Tiên phong kiến tạo giá trị thực' },
    ],
    fontFamily: "'Montserrat', sans-serif",
    letterSpacing: '0.03em',
  },
  {
    name: 'Inter / Open Sans',
    role: 'Font Body (Văn bản nội dung, Mô tả thông số & Hồ sơ hợp đồng)',
    weights: [
      { name: '600 — SemiBold', weight: 600, sample: 'Vật liệu đồng thau đúc tiêu chuẩn Châu Âu' },
      { name: '500 — Medium', weight: 500, sample: 'Chính sách bảo hành sen vòi chính hãng lên đến 5 năm' },
      { name: '400 — Regular', weight: 400, sample: 'Kiến tạo không gian phòng tắm sang trọng và hiện đại cho gia đình Việt.' },
    ],
    fontFamily: "'Inter', system-ui, sans-serif",
    letterSpacing: 'normal',
  },
];

const LOGO_RULES = [
  {
    type: 'do',
    title: 'Nền trắng hoặc kem sáng',
    desc: 'Logo Navy nguyên bản trên nền sáng — trường hợp ứng dụng chuẩn và phổ biến nhất trên website, catalogue và bao bì.',
    bg: '#ffffff',
    logoSrc: BRAND_LOGO,
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    type: 'do',
    title: 'Nền Navy thương hiệu (#003087)',
    desc: 'Sử dụng phiên bản logo màu trắng thuần trên nền Navy sẫm để đảm bảo độ tương phản cao trong backdrop sự kiện, header.',
    bg: '#003087',
    logoSrc: BRAND_LOGO_WHITE,
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    type: 'do',
    title: 'Vùng an toàn (Khoảng trống bảo vệ)',
    desc: 'Bắt buộc duy trì khoảng đệm trống tối thiểu xung quanh logo bằng 1/4 chiều cao logo để không bị các yếu tố đồ họa khác lấn chiếm.',
    bg: '#F8F5F0',
    logoSrc: BRAND_LOGO,
    safeZone: true,
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    type: 'dont',
    title: 'Biến dạng sai tỷ lệ',
    desc: 'Tuyệt đối không co giãn theo trục dọc hoặc kéo ngang làm méo mó cấu trúc logo nguyên bản.',
    bg: '#fff5f5',
    logoSrc: BRAND_LOGO,
    distort: true,
    border: 'border-rose-200',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    type: 'dont',
    title: 'Đặt lên nền hoa văn / loạn màu',
    desc: 'Không đặt logo lên các bức ảnh phong cảnh phức tạp hoặc nền chuyển màu không đủ độ tương phản quang học.',
    bg: 'linear-gradient(135deg, #f97316, #8b5cf6, #ec4899, #10b981)',
    logoSrc: BRAND_LOGO,
    border: 'border-rose-200',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    type: 'dont',
    title: 'Tự ý đổi màu sắc logo',
    desc: 'Không tô màu logo thành tím, xanh lá, neon... Chỉ được dùng 2 phiên bản màu duy nhất: Navy tiêu chuẩn và Trắng đảo ngược.',
    bg: '#fff5f5',
    logoSrc: BRAND_LOGO,
    hueRotate: true,
    border: 'border-rose-200',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];

const VOICE_TRAITS = [
  {
    trait: 'Chuyên nghiệp',
    icon: Briefcase,
    color: '#003087',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Tư vấn kỹ thuật chuẩn xác, dựa trên dữ liệu thử nghiệm vật liệu và tiêu chuẩn thi công thực tế.',
  },
  {
    trait: 'Tin cậy',
    icon: ShieldCheck,
    color: '#10b981',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Cam kết nguồn gốc xuất xứ chính hãng, chính sách bảo hành 5 năm minh bạch, rõ ràng.',
  },
  {
    trait: 'Cao cấp',
    icon: Gem,
    color: '#C9A84C',
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    desc: 'Ngôn phong sang trọng, hiện đại — thể hiện đẳng cấp thẩm mỹ và công nghệ vượt trội.',
  },
  {
    trait: 'Gần gũi',
    icon: Heart,
    color: '#C0392B',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Lấy sự tiện nghi, an toàn và hạnh phúc của mỗi gia đình Việt Nam làm trung tâm mọi thông điệp.',
  },
];

const DO_WORDS = [
  'Công nghệ Hàn Quốc',
  'Đồng thau 59-1 tiêu chuẩn',
  'Mạ PVD chống ăn mòn',
  'Men tuyết Nano kháng khuẩn',
  'Kiến tạo giá trị thực',
  'Bảo hành chính hãng 5 năm',
  'Thiết kế công thái học',
  'Giải pháp phòng tắm hoàn mỹ',
];

const DONT_WORDS = [
  'Rẻ nhất thị trường',
  'Xả kho cắt lỗ',
  'Giá rẻ giật mình',
  'Hàng bãi',
  'Free ship 100%',
  'Độc quyền vũ trụ',
  'Chất lượng tạm chấp nhận',
];

const SAMPLE_MESSAGES = [
  {
    category: 'Giới thiệu thương hiệu',
    text: 'SEAJONG – thương hiệu thiết bị vệ sinh và phòng bếp cao cấp, ứng dụng công nghệ Hàn Quốc hiện đại, cam kết đồng hành kiến tạo không gian sống tiện nghi, đẳng cấp cho hàng triệu gia đình Việt.',
  },
  {
    category: 'Giới thiệu sản phẩm mới',
    text: 'Bộ sưu tập Sen cây phím đàn Seajong SJ-SH0004S sở hữu lõi đúc đồng thau 59-1 nguyên khối, lớp phủ mạ PVD chống bám cặn vôi, mang lại trải nghiệm tắm thư giãn chuẩn spa ngay tại ngôi nhà của bạn.',
  },
  {
    category: 'Chăm sóc & Hỗ trợ kỹ thuật',
    text: 'Cảm ơn Quý khách đã tin chọn Seajong. Chúng tôi luôn sẵn sàng hỗ trợ kiểm tra và bảo hành tận nơi trong 24h đối với toàn bộ các sản phẩm chính hãng theo chính sách 5 năm vàng.',
  },
];

export const BrandIdentityPage: React.FC = () => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'colors' | 'typography' | 'logo' | 'voice' | 'assets'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(text);
    setToastMessage(`Đã sao chép ${label}: ${text}`);
    setTimeout(() => {
      setCopiedHex(null);
      setToastMessage(null);
    }, 2000);
  };

  const handleDownloadLogo = () => {
    const link = document.createElement('a');
    link.href = BRAND_LOGO;
    link.download = 'seajong-brand-logo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage('Đã tải xuống file logo chính hãng Seajong!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div
      className="flex flex-col h-full flex-1 overflow-hidden"
      style={{
        background: '#EBF0F5',
        height: '100%',
        minHeight: 0,
        maxHeight: '100%',
      }}
    >
      {/* ── 1. PageTitle Chuẩn (Tuyệt đối không có nút bấm theo AGENTS.md) ── */}
      <div style={{ flexShrink: 0 }}>
        <PageTitle
          title="Nhận diện thương hiệu"
          description="Hệ thống quy chuẩn màu sắc, typography, logo và tone giọng thương hiệu Seajong"
          icon="bi-award"
          color="rose"
          badge="BRAND GUIDE"
        />

        <DynamicTicker context="brand" pageTitle="Nhận diện thương hiệu" />
      </div>

      {/* ── 2. Card Chính bo góc rounded-xl, padding ngoài 8px chuẩn Enterprise Seajong ── */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          padding: 8,
          flex: '1 1 0%',
          minHeight: 0,
          height: '100%',
        }}
      >
        <div className="flex-1 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden min-h-0">
          {/* Toolbar Tabs Điều Hướng */}
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {[
                { id: 'all', label: 'Tất cả mục', icon: 'bi-grid' },
                { id: 'colors', label: 'Bảng màu chuẩn', icon: 'bi-palette' },
                { id: 'typography', label: 'Typography', icon: 'bi-type' },
                { id: 'logo', label: 'Quy tắc Logo', icon: 'bi-shield-check' },
                { id: 'voice', label: 'Voice & Tone', icon: 'bi-chat-quote' },
                { id: 'assets', label: 'Tải tài nguyên', icon: 'bi-download' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <i className={`bi ${tab.icon}`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadLogo}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Logo PNG</span>
              </button>
              <a
                href={BRAND_WEBSITE}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 text-xs font-bold transition-all flex items-center gap-1.5 no-underline shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>seajong.com</span>
              </a>
            </div>
          </div>

          {/* Vùng nội dung cuộn mượt mà */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-7">
            {/* ── SECTION 1: HERO BRAND BANNER ── */}
            {(activeTab === 'all' || activeTab === 'assets') && (
              <div
                className="rounded-2xl relative overflow-hidden p-6 md:p-8 text-white shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #003087 0%, #001f5c 50%, #0D1B2A 100%)',
                }}
              >
                <div
                  className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-xl"
                  aria-hidden="true"
                />
                <div
                  className="absolute -bottom-16 right-48 w-80 h-80 rounded-full bg-blue-500/10 pointer-events-none blur-2xl"
                  aria-hidden="true"
                />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    {/* Official Logo Container */}
                    <div className="w-24 h-24 rounded-2xl bg-white/95 backdrop-blur-md border border-white/40 p-2.5 flex items-center justify-center shrink-0 shadow-lg">
                      <img
                        src={BRAND_LOGO}
                        alt="Seajong Official Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-200/90 font-mono">
                          Hệ thống nhận diện thương hiệu
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Active v2.4
                        </span>
                      </div>
                      <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide">
                        {BRAND_NAME}
                      </h1>
                      <p className="text-sm text-slate-200 font-medium">
                        {BRAND_FULL}
                      </p>
                      <p className="text-xs text-amber-300 font-semibold italic flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Sứ mệnh: "{BRAND_MISSION}" — {BRAND_TAGLINE}
                      </p>
                    </div>
                  </div>

                  {/* 4 Stats Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto shrink-0">
                    {[
                      { val: '6', label: 'Màu chuẩn' },
                      { val: '2', label: 'Bộ Typeface' },
                      { val: 'v2.4', label: 'Brandbook' },
                      { val: '5+', label: 'Năm phát triển' },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-center min-w-[85px]"
                      >
                        <p className="text-xl font-extrabold text-white font-mono mb-0.5">
                          {stat.val}
                        </p>
                        <p className="text-[11px] text-blue-200/80 mb-0 font-medium">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTION 2: BẢNG MÀU THƯƠNG HIỆU ── */}
            {(activeTab === 'all' || activeTab === 'colors') && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 border border-pink-200 flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 mb-0">
                        Bảng màu thương hiệu quy chuẩn (Brand Color Palette)
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        Hệ thống mã màu hiển thị số học HEX, RGB và in ấn CMYK
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 italic hidden sm:inline">
                    Click vào bất kỳ thẻ màu nào để copy nhanh mã HEX
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {BRAND_COLORS.map((c) => {
                    const isCopied = copiedHex === c.hex;
                    return (
                      <div
                        key={c.hex}
                        onClick={() => copyToClipboard(c.hex, c.name)}
                        className="rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5"
                      >
                        {/* Swatch */}
                        <div
                          className="h-24 relative flex items-center justify-center p-3 transition-transform group-hover:scale-[1.02]"
                          style={{ backgroundColor: c.hex }}
                        >
                          {isCopied ? (
                            <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-xs font-bold flex items-center gap-1.5 animate-scale-up">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Đã sao chép!</span>
                            </div>
                          ) : (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1">
                              <Copy className="w-3 h-3" />
                              <span>Sao chép HEX</span>
                            </div>
                          )}
                          <span
                            className="absolute top-2.5 right-2.5 font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.25)',
                              color: '#ffffff',
                            }}
                          >
                            {c.hex}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-slate-900">
                              {c.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {c.rgb}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed mb-0">
                            {c.usage}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SECTION 3: TYPOGRAPHY ── */}
            {(activeTab === 'all' || activeTab === 'typography') && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                    <Type className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 mb-0">
                      Hệ thống Typography chuẩn Seajong
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Phông chữ tiêu đề nhận diện và phông chữ nội dung hiển thị đa nền tảng
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {TYPOGRAPHY.map((typo) => (
                    <div
                      key={typo.name}
                      className="p-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-4"
                    >
                      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-base font-extrabold text-slate-900 mb-0.5">
                            {typo.name}
                          </h4>
                          <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md inline-block">
                            {typo.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Google Fonts
                        </span>
                      </div>

                      {/* Weights list */}
                      <div className="space-y-3">
                        {typo.weights.map((w, idx) => (
                          <div key={idx} className="space-y-1">
                            <span className="text-[11px] font-mono font-bold text-slate-400 block">
                              {w.name}
                            </span>
                            <p
                              className="text-slate-900 text-sm leading-relaxed mb-0"
                              style={{
                                fontFamily: typo.fontFamily,
                                fontWeight: w.weight,
                                letterSpacing: typo.letterSpacing,
                              }}
                            >
                              {w.sample}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION 4: QUY TẮC SỬ DỤNG LOGO ── */}
            {(activeTab === 'all' || activeTab === 'logo') && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 mb-0">
                      Quy chuẩn sử dụng Logo (Do & Don't Guidelines)
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Các nguyên tắc bất di bất dịch nhằm duy trì tính toàn vẹn thương hiệu
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LOGO_RULES.map((rule, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border ${rule.border} overflow-hidden bg-white shadow-2xs flex flex-col`}
                    >
                      {/* Logo Preview Arena */}
                      <div
                        className="h-28 flex items-center justify-center p-4 relative border-b border-slate-100"
                        style={{
                          background: rule.bg,
                        }}
                      >
                        <div
                          className={`p-2 transition-transform ${
                            rule.safeZone
                              ? 'border-2 border-dashed border-amber-500 rounded-lg p-2.5'
                              : ''
                          }`}
                        >
                          <img
                            src={rule.logoSrc || BRAND_LOGO}
                            alt=""
                            className="h-10 w-auto object-contain"
                            style={{
                              filter: rule.hueRotate
                                ? 'hue-rotate(270deg) saturate(3)'
                                : undefined,
                              transform: rule.distort
                                ? 'scaleX(1.7) scaleY(0.6)'
                                : undefined,
                            }}
                          />
                        </div>

                        {rule.type === 'dont' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-rose-500/10">
                            <XCircle className="w-12 h-12 text-rose-500/40" />
                          </div>
                        )}
                      </div>

                      {/* Rules Description */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {rule.type === 'do' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-slate-900">
                              {rule.title}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-slate-600 leading-relaxed mb-0">
                            {rule.desc}
                          </p>
                        </div>

                        <div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rule.badgeBg}`}
                          >
                            {rule.type === 'do' ? 'KHUYÊN DÙNG' : 'CẤM SỬ DỤNG'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION 5: VOICE & TONE ── */}
            {(activeTab === 'all' || activeTab === 'voice') && (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 mb-0">
                      Tính cách & Giọng điệu thương hiệu (Voice & Tone)
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Quy chuẩn cách truyền tải thông điệp trên các kênh truyền thông, catalogue và CSKH
                    </span>
                  </div>
                </div>

                {/* 4 Trụ Cột Tính Cách */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {VOICE_TRAITS.map((v) => {
                    const Icon = v.icon;
                    return (
                      <div
                        key={v.trait}
                        className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2 text-center"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                          style={{
                            backgroundColor: `${v.color}15`,
                            color: v.color,
                          }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-0">
                          {v.trait}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed mb-0">
                          {v.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Do Words vs Don't Words */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>TỪ NGỮ NÊN DÙNG (DO WORDS)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DO_WORDS.map((word) => (
                        <span
                          key={word}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100/80 text-emerald-800 border border-emerald-200"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>TỪ NGỮ TRÁNH DÙNG (DON'T WORDS)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DONT_WORDS.map((word) => (
                        <span
                          key={word}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-100/80 text-rose-800 border border-rose-200"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mẫu Câu Quy Chuẩn */}
                <div className="space-y-2.5">
                  <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                    Mẫu câu văn bản truyền thông quy chuẩn
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {SAMPLE_MESSAGES.map((msg, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1"
                      >
                        <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wide">
                          {msg.category}
                        </span>
                        <p className="text-xs text-slate-700 italic leading-relaxed mb-0 font-serif">
                          "{msg.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTION 6: TÀI NGUYÊN TẢI VỀ ── */}
            {(activeTab === 'all' || activeTab === 'assets') && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 mb-0">
                      Tài nguyên thương hiệu (Brand Assets)
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Bộ tệp đồ họa chuẩn hóa cho ấn phẩm quảng cáo, truyền thông và in ấn showroom
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        PNG HI-RES
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-2 mb-1">
                        Logo Seajong Nền Trong Suốt
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-0">
                        Định dạng PNG chất lượng cao không nền, sẵn sàng dùng cho slide và thiết kế web.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadLogo}
                      className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải PNG (300 DPI)</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        CSS / TOKENS
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-2 mb-1">
                        Mã màu CSS Design Tokens
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-0">
                        Bộ biến CSS `:root` chứa đầy đủ 6 mã màu chính để nhúng vào dự án lập trình.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cssTokens = `:root {\n  --seajong-navy: #003087;\n  --seajong-gold: #C9A84C;\n  --seajong-dark: #0D1B2A;\n  --seajong-cream: #F8F5F0;\n  --seajong-red: #C0392B;\n  --seajong-silver: #8D9DB0;\n}`;
                        copyToClipboard(cssTokens, 'CSS Tokens');
                      }}
                      className="w-full py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép CSS Tokens</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        HƯỚNG DẪN PDF
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-2 mb-1">
                        Seajong Brandbook Guidelines
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-0">
                        Hồ sơ hướng dẫn quy chuẩn toàn diện gửi cho đối tác quảng cáo và agency thiết kế.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setToastMessage('Hồ sơ Brandbook PDF đã được sẵn sàng lưu hành nội bộ!');
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                      className="w-full py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-blue-600 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem Brandbook v2.4</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-slide-up border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default BrandIdentityPage;
