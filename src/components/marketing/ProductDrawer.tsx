import React, { useState, useEffect, useRef } from 'react';
import { PrintLabelModal } from '../common/PrintLabelModal';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Product {
  id: number;
  slug: string;
  url: string;
  name: string;
  excerpt: string;
  description: string;
  images: string[];
  specs: Record<string, string>;
  price: number;
  categories: number[];
  categoryNames?: string[];
  updatedAt: string;
  promotions?: string[] | string;
  policies?: string[] | string;
  variations?: any[] | string;
  variationData?: any[] | string;
  priceHtml?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number;
}

interface ProductDrawerProps {
  product: Product | null;
  cats?: Category[];
  onClose: () => void;
  onEdit?: () => void;
  isSalesMode?: boolean;
  onAddToCart?: () => void;
  addToCartLabel?: string;
  hideMarketingActions?: boolean;
  hidePrintLabel?: boolean;
  isDealerMode?: boolean;
}

// ── Background Music Tracks ───────────────────────────────────────────────────
export interface BGMTrack {
  id: string;
  name: string;
  emoji: string;
  url: string;
  desc: string;
}

export const BGM_TRACKS: BGMTrack[] = [
  {
    id: 'corporate',
    name: 'Doanh nghiệp & Đẳng cấp',
    emoji: '🏢',
    url: '/audio/corporate-promo.mp3',
    desc: 'Âm hưởng cao cấp, uy tín, chuẩn thương hiệu Hàn Quốc',
  },
  {
    id: 'upbeat',
    name: 'Sôi động & Tươi vui',
    emoji: '⚡',
    url: '/audio/upbeat-energetic.mp3',
    desc: 'Nhịp điệu hứng khởi, cuốn hút cho Facebook & TikTok Ads',
  },
  {
    id: 'modern',
    name: 'Hiện đại & Trẻ trung',
    emoji: '💎',
    url: '/audio/modern-tech.mp3',
    desc: 'Lounge hiện đại, phong cách căn hộ thông minh cao cấp',
  },
  {
    id: 'none',
    name: 'Không nhạc',
    emoji: '🔇',
    url: '',
    desc: 'Chỉ tạo video không có nhạc nền',
  },
];

export const ProductDrawer: React.FC<ProductDrawerProps> = ({
  product: p,
  cats = [],
  onClose,
  onEdit,
  isSalesMode,
  onAddToCart,
  addToCartLabel,
  hideMarketingActions,
  hidePrintLabel,
  isDealerMode,
}) => {
  if (!p) return null;

  const shouldHideMarketingActions = hideMarketingActions || isDealerMode;
  const shouldHidePrintLabel = hidePrintLabel || isDealerMode;

  // ── Parse promotions & policies ──
  const defaultPromotions = [
    'Miễn phí vận chuyển toàn quốc cho đơn hàng từ 5 triệu',
    'Giảm thêm 5% khi thanh toán qua chuyển khoản trước',
    'Tặng kèm bộ phụ kiện lắp đặt chính hãng',
  ];
  const defaultPolicies = [
    'Bảo hành chính hãng lên đến 5 năm',
    'Đổi trả 1-1 trong 30 ngày nếu lỗi từ nhà sản xuất',
    'Hỗ trợ kỹ thuật trọn đời qua Hotline 1900.633.862',
    'Thanh toán linh hoạt: COD, thẻ tín dụng, chuyển khoản',
  ];

  let activePromotions: string[] = defaultPromotions;
  let activePolicies: string[] = defaultPolicies;
  let activeVariations: any[] = [];
  try {
    if (p.promotions) {
      activePromotions =
        typeof p.promotions === 'string'
          ? p.promotions !== '[]'
            ? JSON.parse(p.promotions)
            : defaultPromotions
          : p.promotions.length > 0
          ? p.promotions
          : defaultPromotions;
    }
    if (p.policies) {
      activePolicies =
        typeof p.policies === 'string'
          ? p.policies !== '[]'
            ? JSON.parse(p.policies)
            : defaultPolicies
          : p.policies.length > 0
          ? p.policies
          : defaultPolicies;
    }
    if (p.variations) {
      activeVariations =
        typeof p.variations === 'string'
          ? p.variations !== '[]'
            ? JSON.parse(p.variations)
            : []
          : p.variations;
    }
  } catch (e) {
    console.error('Error parsing product fields', e);
  }

  let activeVariationData: any[] = [];
  try {
    if (p.variationData) {
      activeVariationData =
        typeof p.variationData === 'string' ? JSON.parse(p.variationData) : p.variationData;
    }
  } catch (e) {}

  // ── State ──
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'policy'>('desc');
  const [isPaused, setIsPaused] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showPrintLabel, setShowPrintLabel] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── AI Copywriting State ──
  const [adFormat, setAdFormat] = useState('Facebook Post');
  const [adStyle, setAdStyle] = useState('Chuyên nghiệp');
  const [adPersona, setAdPersona] = useState('Gia đình');
  const [adWordLimit, setAdWordLimit] = useState('300');
  const [adContent, setAdContent] = useState('');
  const [adLoading, setAdLoading] = useState(false);
  const [copiedAd, setCopiedAd] = useState(false);

  // ── Video Slideshow & Background Music State ──
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selectedBgm, setSelectedBgm] = useState<string>('corporate');
  const [previewingAudio, setPreviewingAudio] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Category names ──
  const catNames: string[] =
    p.categoryNames && p.categoryNames.length > 0
      ? p.categoryNames
      : p.categories && p.categories.length > 0
      ? (p.categories
          .map((id) => cats.find((c) => c.id === id)?.name)
          .filter(Boolean) as string[])
      : [];

  const images = p.images && p.images.length > 0 ? p.images : ['/images/placeholder-product.png'];

  // ── Audio Preview helper ──
  const togglePreviewBgm = (trackUrl: string) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewingAudio === trackUrl || !trackUrl) {
      setPreviewingAudio(null);
      return;
    }
    const a = new Audio(trackUrl);
    a.volume = 0.65;
    a.onended = () => setPreviewingAudio(null);
    a.play().catch(() => {});
    previewAudioRef.current = a;
    setPreviewingAudio(trackUrl);
  };

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [showAdModal]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAdModal) {
          setShowAdModal(false);
        } else if (showPrintLabel) {
          setShowPrintLabel(false);
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowRight') setActiveImg((i) => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft') setActiveImg((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, images.length, showAdModal, showPrintLabel]);

  // ── Auto-slide gallery every 4s, pause on hover ──
  useEffect(() => {
    if (images.length <= 1 || isPaused) return;
    const t = setInterval(() => {
      setActiveImg((i) => (i + 1) % images.length);
    }, 4000);
    return () => clearInterval(t);
  }, [images.length, isPaused]);

  // ── Toast notifier helper ──
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // ── AI Copy Generation ──
  const handleGenerateAd = async () => {
    setAdLoading(true);
    setAdContent('');
    try {
      const res = await fetch('/api/seajong/ad-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: p.name,
          format: adFormat,
          style: adStyle,
          persona: adPersona,
          wordLimit: adWordLimit,
          specs: p.specs || {},
          categories: catNames,
          description: p.description || p.excerpt || '',
        }),
      });
      const data = await res.json();
      if (data.success && data.content) {
        setAdContent(data.content);
      } else {
        setAdContent(`❌ Lỗi: ${data.error || 'Không thể tạo bài viết'}`);
      }
    } catch (e: any) {
      setAdContent(`❌ Lỗi kết nối: ${e?.message || String(e)}`);
    } finally {
      setAdLoading(false);
    }
  };

  const handleCopyAdContent = () => {
    if (adContent) {
      navigator.clipboard.writeText(adContent);
      setCopiedAd(true);
      showToast('Đã sao chép nội dung bài viết!');
      setTimeout(() => setCopiedAd(false), 2000);
    }
  };

  // ── TẠO VIDEO SLIDESHOW CHUYÊN NGHIỆP CÓ NHẠC NỀN (AIDA / HOOK STRUCTURE) ──────
  async function generateVideo() {
    if (!images.length) return;

    // Dừng preview audio nếu đang bật
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewingAudio(null);
    }

    setVideoLoading(true);
    setVideoProgress(0);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    const W = 1080;
    const H = 1080;
    const FPS = 30;

    /* ── Load images via proxy ── */
    const loadImg = (url: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = `/api/seajong/image-proxy?url=${encodeURIComponent(url)}`;
      });

    const loadedImgs: HTMLImageElement[] = [];
    for (let i = 0; i < images.length; i++) {
      try {
        loadedImgs.push(await loadImg(images[i]));
      } catch {
        // skip failed images
      }
      setVideoProgress(Math.round(((i + 1) / images.length) * 15));
    }
    if (!loadedImgs.length) {
      setVideoLoading(false);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    /* ── helpers ── */
    const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    function drawCover(img: HTMLImageElement, scale = 1, alpha = 1, panX = 0, panY = 0) {
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * scale;
      const sw = img.naturalWidth * s;
      const sh = img.naturalHeight * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (W - sw) / 2 + panX, (H - sh) / 2 + panY, sw, sh);
      ctx.globalAlpha = 1;
    }

    function drawGradientBg(c1: string, c2: string) {
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function drawVignette(strength = 0.85) {
      const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${strength})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const gt = ctx.createLinearGradient(0, 0, 0, H * 0.25);
      gt.addColorStop(0, 'rgba(0,0,0,0.5)');
      gt.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gt;
      ctx.fillRect(0, 0, W, H);
    }

    function wrapText(text: string, maxW: number): string[] {
      const words = text.split(' ');
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const t = line ? `${line} ${w}` : w;
        if (ctx.measureText(t).width > maxW) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = t;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    function drawCenteredText(
      text: string,
      y: number,
      font: string,
      color: string,
      maxW: number,
      lineH: number,
      alpha = 1
    ) {
      ctx.save();
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.globalAlpha = alpha;
      const lines = wrapText(text, maxW);
      lines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * lineH));
      ctx.restore();
    }

    function drawBrand(alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const bx = 48;
      const by = 52;
      const bw = 300;
      const bh = 52;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(bx - 12, by - 32, bw, bh, 10);
      ctx.fill();
      ctx.font = `bold ${Math.round(W * 0.024)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText('SEAJONG  •  Bath & Kitchen Korea', bx, by);
      ctx.restore();
    }

    function drawFooter(alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${Math.round(W * 0.019)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.textAlign = 'center';
      ctx.fillText('seajong.com  |  Hotline: 1900.633.862', W / 2, H - 22);
      ctx.restore();
    }

    /* ── Hook text from category ── */
    const cat = (catNames[0] || '').toLowerCase();
    const hookQ = cat.includes('bồn cầu')
      ? 'Chiếc bồn cầu cũ đang\nPHÁ HOẠI không gian sống của bạn?'
      : cat.includes('vệ sinh')
      ? 'Phòng tắm đẳng cấp —\nTại sao không phải là của bạn?'
      : cat.includes('bếp')
      ? "Căn bếp 'xịn' có thực sự\ncần chi phí cao?"
      : cat.includes('lavabo')
      ? 'Lavabo cũ kỹ...\nBao giờ bạn mới nâng cấp?'
      : 'Không gian của bạn\nĐÃ ĐẾN LÚC thay đổi!';

    /* ── Specs → Benefit messages ── */
    const specEntries = Object.entries(p.specs || {}).slice(0, 6);
    const benefits =
      specEntries.length > 0
        ? specEntries.map(([k, v]) => {
            const kl = k.toLowerCase();
            const vl = String(v).toLowerCase();
            if (kl.includes('chất liệu') || kl.includes('vật liệu'))
              return `✦  ${v} — Bền đẹp vượt thời gian`;
            if (kl.includes('màu') || kl.includes('mau'))
              return `✦  Màu ${v} — Sang trọng, hài hòa mọi không gian`;
            if (kl.includes('kích thước') || kl.includes('kich'))
              return `✦  Kích thước ${v} — Phù hợp linh hoạt`;
            if (vl.includes('tornado') || vl.includes('xả'))
              return `✦  Công nghệ ${v} — Sạch hoàn toàn, tiết kiệm nước`;
            if (kl.includes('bảo hành') || kl.includes('bao hanh'))
              return `✦  Bảo hành ${v} — An tâm tuyệt đối`;
            if (kl.includes('xuất xứ') || kl.includes('xuat xu'))
              return `✦  Xuất xứ ${v} — Tiêu chuẩn quốc tế`;
            return `✦  ${k}: ${v}`;
          })
        : [
            '✦  Chất liệu cao cấp — Bền đẹp theo thời gian',
            '✦  Thiết kế hiện đại — Sang trọng đẳng cấp',
            '✦  Bảo hành chính hãng — An tâm lâu dài',
          ];

    /* ── Scene definitions ── */
    type SceneType = 'hook' | 'pain' | 'product' | 'proof' | 'cta';
    interface Scene {
      type: SceneType;
      frames: number;
      imgIdx?: number;
      benefit?: string;
    }
    const SCENES: Scene[] = [
      { type: 'hook', frames: 90 },
      { type: 'pain', frames: 105 },
      ...loadedImgs.map((_, i) => ({
        type: 'product' as SceneType,
        frames: 80,
        imgIdx: i,
        benefit: benefits[i % benefits.length],
      })),
      { type: 'proof', frames: 90 },
      { type: 'cta', frames: 105 },
    ];
    const TOTAL = SCENES.reduce((s, sc) => s + sc.frames, 0);

    /* ── Setup Background Music Audio Context & MediaStreamDestination ── */
    let audioCtx: AudioContext | null = null;
    let gainNode: GainNode | null = null;
    let bgmAudio: HTMLAudioElement | null = null;
    let audioTrack: MediaStreamTrack | null = null;

    const chosenTrack = BGM_TRACKS.find((t) => t.id === selectedBgm);
    if (chosenTrack && chosenTrack.url) {
      try {
        bgmAudio = new Audio(chosenTrack.url);
        bgmAudio.crossOrigin = 'anonymous';
        bgmAudio.loop = true;
        bgmAudio.currentTime = 0;

        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          audioCtx = new AudioCtxClass();
          const source = audioCtx.createMediaElementSource(bgmAudio);
          const dest = audioCtx.createMediaStreamDestination();
          gainNode = audioCtx.createGain();
          gainNode.gain.setValueAtTime(0.75, audioCtx.currentTime);

          source.connect(gainNode);
          gainNode.connect(dest);

          const aTracks = dest.stream.getAudioTracks();
          if (aTracks.length > 0) {
            audioTrack = aTracks[0];
          }
          await bgmAudio.play();
        }
      } catch (err) {
        console.warn('Audio setup warning:', err);
      }
    }

    /* ── MediaRecorder setup: Canvas Stream + Audio Track ── */
    const canvasStream = canvas.captureStream(FPS);
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    if (audioTrack) {
      combinedTracks.push(audioTrack);
    }
    const combinedStream = new MediaStream(combinedTracks);

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setVideoUrl(URL.createObjectURL(blob));
      setVideoLoading(false);
      setVideoProgress(100);
    };
    recorder.start(100);

    /* ── Per-scene renderers ── */
    function renderHook(f: number, total: number) {
      const t = f / total;
      drawGradientBg('#1a0030', '#050015');

      for (let d = 0; d < 24; d++) {
        const px = (Math.sin(d * 2.7 + t * 1.8) * 0.5 + 0.5) * W;
        const py = (Math.cos(d * 1.9 + t * 1.4) * 0.5 + 0.5) * H;
        ctx.beginPath();
        ctx.arc(px, py, 2 + (d % 3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,120,255,${0.15 + 0.1 * Math.sin(d + t * 3)})`;
        ctx.fill();
      }

      const hookLines = hookQ.split('\n');
      const entryT = clamp(t * 4);
      const fadeOut = clamp((t - 0.85) * 7);
      const alpha = easeOut(entryT) * (1 - fadeOut);
      const offsetY = (1 - easeOut(entryT)) * 80;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = `900 ${Math.round(W * 0.062)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(hookLines[0] || '', W / 2, H * 0.38 + offsetY);

      ctx.font = `900 ${Math.round(W * 0.07)}px "Helvetica Neue",Arial,sans-serif`;
      const grd = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, 0);
      grd.addColorStop(0, '#c084fc');
      grd.addColorStop(1, '#818cf8');
      ctx.fillStyle = grd;
      ctx.fillText(hookLines[1] || '', W / 2, H * 0.38 + offsetY + Math.round(W * 0.085));
      ctx.restore();

      const pulse = 0.6 + 0.4 * Math.sin(t * Math.PI * 8);
      drawCenteredText(
        '▼  Khám phá ngay',
        H * 0.72,
        `bold ${Math.round(W * 0.024)}px "Helvetica Neue",Arial,sans-serif`,
        `rgba(180,180,255,${pulse * alpha})`,
        W * 0.7,
        40,
        1
      );

      drawBrand(easeOut(entryT));
      drawFooter(easeOut(entryT));
    }

    function renderPain(f: number, total: number) {
      const t = f / total;
      const entryT = clamp(t * 3);
      const alpha = easeOut(entryT);

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      if (loadedImgs[0]) drawCover(loadedImgs[0], 1.02, 0.25);

      const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W);
      rg.addColorStop(0, 'rgba(120,0,0,0.0)');
      rg.addColorStop(1, 'rgba(80,0,0,0.65)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      drawVignette(0.9);

      const cats0 = catNames[0] || 'thiết bị';
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.round(W * 0.022)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = '#ff8080';
      ctx.textAlign = 'center';
      ctx.fillText('VẤN ĐỀ BẠN ĐANG GẶP PHẢI', W / 2, H * 0.3);

      ctx.font = `900 ${Math.round(W * 0.055)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = '#fff';
      const painLines = wrapText(`${cats0} cũ kỹ, lạc hậu...`, W * 0.82);
      painLines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.42 + i * Math.round(W * 0.068)));

      ctx.font = `${Math.round(W * 0.032)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = 'rgba(255,200,200,0.9)';
      const subLines = wrapText('Mỗi ngày bạn nhìn vào đó và cảm thấy... chưa ổn?', W * 0.78);
      subLines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.62 + i * Math.round(W * 0.042)));
      ctx.restore();

      drawBrand(alpha);
      drawFooter(alpha);
    }

    function renderProduct(f: number, total: number, img: HTMLImageElement, benefit: string) {
      const t = f / total;
      const entryT = clamp(t * 4);
      const alpha = easeOut(entryT);
      const fadeOut = clamp((t - 0.8) * 5);
      const kbScale = 1 + t * 0.07;
      const kbPanX = t * 18;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      drawCover(img, kbScale, 1 - fadeOut * 0.5, kbPanX);
      drawVignette(0.78);

      ctx.save();
      ctx.globalAlpha = alpha * (1 - fadeOut);
      ctx.font = `bold ${Math.round(W * 0.036)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      const bLines = wrapText(benefit, W * 0.82);
      const bStartY = H - Math.round(W * 0.25) - (bLines.length - 1) * Math.round(W * 0.048);
      bLines.forEach((l, i) => {
        ctx.fillText(l, W / 2, bStartY + i * Math.round(W * 0.05));
      });
      ctx.restore();

      drawBrand(alpha * (1 - fadeOut));
      drawFooter(alpha * (1 - fadeOut));
    }

    function renderProof(f: number, total: number) {
      const t = f / total;
      const alpha = easeOut(clamp(t * 3));

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      const lastImg = loadedImgs[loadedImgs.length - 1];
      if (lastImg) drawCover(lastImg, 1.04, 0.3);
      drawGradientBg('rgba(10,0,30,0.85)', 'rgba(5,0,15,0.92)');
      ctx.fillStyle = 'rgba(8,0,20,0.7)';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${Math.round(W * 0.065)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('★★★★★', W / 2, H * 0.32);

      ctx.font = `900 ${Math.round(W * 0.052)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText('10,000+', W / 2, H * 0.46);
      ctx.font = `bold ${Math.round(W * 0.036)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = 'rgba(200,180,255,0.95)';
      ctx.fillText('gia đình Việt Nam tin dùng Seajong', W / 2, H * 0.54);

      const badges = ['🏅 Chính hãng Hàn Quốc', '🚚 Giao toàn quốc', '🔄 Đổi trả 30 ngày'];
      ctx.font = `${Math.round(W * 0.026)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      badges.forEach((b, i) => ctx.fillText(b, W / 2, H * 0.66 + i * Math.round(W * 0.038)));
      ctx.restore();

      drawBrand(alpha);
      drawFooter(alpha);
    }

    function renderCTA(f: number, total: number) {
      const t = f / total;
      const alpha = easeOut(clamp(t * 2.5));

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#1e0052');
      bg.addColorStop(0.5, '#0d0030');
      bg.addColorStop(1, '#001040');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      for (let gy = 0; gy < H; gy += 70) {
        for (let gx = 0; gx < W; gx += 80) {
          ctx.beginPath();
          ctx.arc(gx + (gy % 140 === 0 ? 0 : 40), gy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(150,100,255,0.12)';
          ctx.fill();
        }
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.round(W * 0.04)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = 'rgba(200,180,255,0.9)';
      ctx.textAlign = 'center';
      const pLines = wrapText(p.name, W * 0.82);
      pLines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.26 + i * Math.round(W * 0.052)));

      ctx.font = `900 ${Math.round(W * 0.065)}px "Helvetica Neue",Arial,sans-serif`;
      const cg = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, 0);
      cg.addColorStop(0, '#c084fc');
      cg.addColorStop(1, '#60a5fa');
      ctx.fillStyle = cg;
      ctx.fillText('LIÊN HỆ NGAY!', W / 2, H * 0.5);

      ctx.font = `bold ${Math.round(W * 0.029)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = '#fcd34d';
      const pulse = 0.85 + 0.15 * Math.sin(t * Math.PI * 6);
      ctx.globalAlpha = alpha * pulse;
      ctx.fillText('⚡ Ưu đãi chỉ trong tuần này — Số lượng có hạn!', W / 2, H * 0.6);
      ctx.globalAlpha = alpha;

      const hx = W / 2;
      const hy = H * 0.73;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.roundRect(hx - 210, hy - 36, 420, 56, 28);
      ctx.fill();
      ctx.font = `bold ${Math.round(W * 0.038)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText('📞  1900.633.862', hx, hy + 4);

      ctx.restore();
      drawBrand(alpha);
      drawFooter(alpha);
    }

    /* ── Main animation loop ── */
    let frameGlobal = 0;
    let sceneIdx = 0;
    let sceneFrame = 0;

    const tick = () => {
      if (sceneIdx >= SCENES.length) {
        // Dừng nhạc nền & đóng AudioContext khi hoàn tất
        if (bgmAudio) {
          bgmAudio.pause();
          bgmAudio.currentTime = 0;
        }
        if (audioCtx && audioCtx.state !== 'closed') {
          try {
            audioCtx.close();
          } catch {}
        }
        recorder.stop();
        return;
      }

      const sc = SCENES[sceneIdx];
      const f = sceneFrame;
      const tot = sc.frames;

      // Fade out nhạc nền nhẹ nhàng ở 1.5 giây cuối cùng
      if (sc.type === 'cta' && gainNode && audioCtx) {
        const remaining = sc.frames - sceneFrame;
        if (remaining <= 45) {
          const fadeVol = Math.max(0, (remaining / 45) * 0.75);
          gainNode.gain.setValueAtTime(fadeVol, audioCtx.currentTime);
        }
      }

      ctx.clearRect(0, 0, W, H);

      switch (sc.type) {
        case 'hook':
          renderHook(f, tot);
          break;
        case 'pain':
          renderPain(f, tot);
          break;
        case 'product':
          renderProduct(f, tot, loadedImgs[sc.imgIdx ?? 0]!, sc.benefit ?? '');
          break;
        case 'proof':
          renderProof(f, tot);
          break;
        case 'cta':
          renderCTA(f, tot);
          break;
      }

      sceneFrame++;
      if (sceneFrame >= sc.frames) {
        sceneIdx++;
        sceneFrame = 0;
      }

      frameGlobal++;
      setVideoProgress(15 + Math.round((frameGlobal / TOTAL) * 85));
      setTimeout(tick, 1000 / FPS);
    };
    tick();
  }

  // ── Parse Description thành danh sách gạch đầu dòng ────────────────────────
  function parseDescription(raw: string | undefined): string[] {
    if (!raw) return [];

    let text = raw;
    text = text.replace(/Mục Lục Toggle[\s\S]*?(?=Tính năng|Đặc điểm|Mô tả|Giới thiệu|$)/i, '');

    const cutMarkers = [
      'Một số câu hỏi',
      'Liên hệ mua hàng',
      'Hotline:',
      'Showroom:',
      'Fanpage:',
      'DSSP:',
      'Xem thêm các mẫu',
      'Website: https',
      'Công ty cổ phần',
    ];
    for (const marker of cutMarkers) {
      const idx = text.indexOf(marker);
      if (idx !== -1) text = text.slice(0, idx);
    }

    text = text.replace(/^(Tính năng công nghệ|Đặc điểm nổi bật|Mô tả sản phẩm)\s*/im, '');

    const sentences = text
      .replace(/<[^>]*>?/gm, ' ')
      .split(/(?<=[.。])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25);

    return sentences.slice(0, 10);
  }

  const descBullets = parseDescription(p.description || p.excerpt);
  const hasDescription = descBullets.length > 0;
  const hasSpecs = p.specs && Object.keys(p.specs).length > 0;
  const currentBgmTrack = BGM_TRACKS.find((t) => t.id === selectedBgm) || BGM_TRACKS[0];

  return (
    <>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: none; } }
        .drawer-thumb { transition: transform 0.15s, box-shadow 0.15s; }
        .drawer-thumb:hover { transform: scale(1.06); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .drawer-body::-webkit-scrollbar { width: 0; }
        .drawer-body { scrollbar-width: none; }
        .drawer-thumb-strip::-webkit-scrollbar { height: 0; }
        .drawer-thumb-strip { scrollbar-width: none; }
        @keyframes fadeSlide { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 1040,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 99999,
            background: '#10b981',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className="bi bi-check-circle-fill" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          AI VIẾT BÀI QUẢNG CÁO FULLSCREEN MODAL (CHUẨN CLIENT-SEAJONG)
          ════════════════════════════════════════════════════════════════════════ */}
      {showAdModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1060,
            background: 'var(--background, #ffffff)',
            color: 'var(--foreground, #0f172a)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              background: 'var(--card, #ffffff)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(79,70,229,0.15), rgba(124,58,237,0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="bi bi-stars" style={{ fontSize: 17, color: '#4f46e5' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--foreground, #0f172a)' }}>
                  Viết bài quảng cáo bằng AI
                </p>
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground, #64748b)' }}>
                  {p.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (previewAudioRef.current) {
                  previewAudioRef.current.pause();
                  previewAudioRef.current = null;
                  setPreviewingAudio(null);
                }
                setShowAdModal(false);
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                border: '1.5px solid var(--border, #e2e8f0)',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--foreground, #0f172a)',
              }}
            >
              <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
            </button>
          </div>

          {/* Body: 2 columns 360px and 1fr */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '360px 1fr', overflow: 'hidden' }}>
            {/* ── LEFT PANEL (360px) ── */}
            <div
              style={{
                borderRight: '1px solid var(--border, #e2e8f0)',
                padding: '18px',
                overflowY: 'auto',
                background: 'var(--card, #ffffff)',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Product thumbnail */}
              {images[0] && (
                <div
                  style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: '1px solid var(--border, #e2e8f0)',
                    height: 160,
                    background: 'var(--background, #f8fafc)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={images[activeImg] || images[0]}
                    alt={p.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 10 }}
                  />
                </div>
              )}

              {/* Product name & Categories */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 9,
                  background: 'var(--background, #f8fafc)',
                  border: '1px solid var(--border, #e2e8f0)',
                }}
              >
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: 'var(--foreground, #0f172a)',
                    lineHeight: 1.4,
                  }}
                >
                  {p.name}
                </p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {catNames.map((n) => (
                    <span
                      key={n}
                      style={{
                        fontSize: 10,
                        padding: '1px 8px',
                        borderRadius: 99,
                        background: 'rgba(79,70,229,0.1)',
                        color: '#4f46e5',
                        fontWeight: 600,
                      }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              {/* 1. Kênh đăng */}
              <div>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--muted-foreground, #64748b)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  1. Kênh đăng
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { key: 'Facebook Post', icon: 'bi-facebook', label: 'Facebook Post' },
                    { key: 'Zalo Story', icon: 'bi-chat-dots-fill', label: 'Zalo Story' },
                    { key: 'Email', icon: 'bi-envelope-fill', label: 'Email' },
                    { key: 'Script Video', icon: 'bi-camera-video-fill', label: 'Script Video' },
                    { key: 'Tin nhắn Zalo', icon: 'bi-chat-fill', label: 'Tin Zalo' },
                    { key: 'Landing Page', icon: 'bi-window', label: 'Landing Page' },
                  ].map((f) => (
                    <label
                      key={f.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '7px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: `1.5px solid ${adFormat === f.key ? '#4f46e5' : 'var(--border, #e2e8f0)'}`,
                        background: adFormat === f.key ? 'rgba(79,70,229,0.08)' : 'var(--background, #ffffff)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name="ad-format"
                        value={f.key}
                        checked={adFormat === f.key}
                        onChange={() => {
                          setAdFormat(f.key);
                          setAdContent('');
                        }}
                        style={{ accentColor: '#4f46e5', flexShrink: 0, width: 13, height: 13 }}
                      />
                      <i
                        className={`bi ${f.icon}`}
                        style={{
                          fontSize: 12,
                          color: adFormat === f.key ? '#4f46e5' : 'var(--muted-foreground, #64748b)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: adFormat === f.key ? 700 : 400,
                          color: 'var(--foreground, #0f172a)',
                        }}
                      >
                        {f.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 2. Phong cách viết */}
              <div>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--muted-foreground, #64748b)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  2. Phong cách viết
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { key: 'Chuyên nghiệp', icon: '🏢' },
                    { key: 'Thân thiện', icon: '😊' },
                    { key: 'Kể chuyện', icon: '📖' },
                    { key: 'Gấp gáp/FOMO', icon: '⚡' },
                    { key: 'Hài hước', icon: '😄' },
                    { key: 'Sang trọng', icon: '✨' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setAdStyle(s.key)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 99,
                        fontSize: 12,
                        cursor: 'pointer',
                        border: `1.5px solid ${adStyle === s.key ? '#4f46e5' : 'var(--border, #e2e8f0)'}`,
                        background: adStyle === s.key ? 'rgba(79,70,229,0.1)' : 'var(--background, #ffffff)',
                        color: adStyle === s.key ? '#4f46e5' : 'var(--foreground, #0f172a)',
                        fontWeight: adStyle === s.key ? 700 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {s.icon} {s.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Chân dung khách hàng */}
              <div>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--muted-foreground, #64748b)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  3. Chân dung khách hàng
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { key: 'Gia đình', icon: '🏠' },
                    { key: 'Cặp vợ chồng', icon: '👫' },
                    { key: 'Cao cấp', icon: '💎' },
                    { key: 'Chuỗi khách sạn', icon: '🏨' },
                    { key: 'Chủ đầu tư', icon: '💼' },
                    { key: 'Showroom', icon: '🏪' },
                  ].map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => setAdPersona(a.key)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 99,
                        fontSize: 12,
                        cursor: 'pointer',
                        border: `1.5px solid ${adPersona === a.key ? '#10b981' : 'var(--border, #e2e8f0)'}`,
                        background: adPersona === a.key ? 'rgba(16,185,129,0.1)' : 'var(--background, #ffffff)',
                        color: adPersona === a.key ? '#059669' : 'var(--foreground, #0f172a)',
                        fontWeight: adPersona === a.key ? 700 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {a.icon} {a.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Giới hạn số từ */}
              <div>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--muted-foreground, #64748b)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  4. Giới hạn số từ
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {['150', '300', '500', '800'].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setAdWordLimit(w)}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 99,
                        fontSize: 12,
                        cursor: 'pointer',
                        border: `1.5px solid ${adWordLimit === w ? '#4f46e5' : 'var(--border, #e2e8f0)'}`,
                        background: adWordLimit === w ? 'rgba(79,70,229,0.1)' : 'var(--background, #ffffff)',
                        color: adWordLimit === w ? '#4f46e5' : 'var(--foreground, #0f172a)',
                        fontWeight: adWordLimit === w ? 700 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {w} từ
                    </button>
                  ))}
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    value={adWordLimit}
                    onChange={(e) => setAdWordLimit(e.target.value)}
                    style={{
                      width: 72,
                      padding: '4px 8px',
                      borderRadius: 8,
                      border: '1.5px solid var(--border, #e2e8f0)',
                      background: 'var(--background, #ffffff)',
                      color: 'var(--foreground, #0f172a)',
                      fontSize: 12,
                      outline: 'none',
                    }}
                    placeholder="Tùy chỉnh"
                  />
                </div>
              </div>

              {/* Specs preview */}
              {p.specs && Object.keys(p.specs).length > 0 && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 9,
                    background: 'var(--background, #f8fafc)',
                    border: '1px solid var(--border, #e2e8f0)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 6px',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: 'var(--muted-foreground, #64748b)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Thông số kỹ thuật
                  </p>
                  {Object.entries(p.specs)
                    .slice(0, 5)
                    .map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 6, fontSize: 11.5, marginBottom: 3 }}>
                        <span style={{ color: 'var(--muted-foreground, #64748b)', flexShrink: 0 }}>{k}:</span>
                        <span style={{ color: 'var(--foreground, #0f172a)', fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* ── RIGHT PANEL ── */}
            <div
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                overflowY: 'auto',
                background: 'var(--background, #f8fafc)',
              }}
            >
              {/* Prompt summary + Generate Button */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(79,70,229,0.05)',
                  border: '1px solid rgba(79,70,229,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexShrink: 0,
                }}
              >
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--foreground, #0f172a)', lineHeight: 1.6 }}>
                  <i className="bi bi-stars" style={{ color: '#4f46e5', marginRight: 6 }} />
                  <b>{adFormat}</b> • Phong cách <b>{adStyle}</b> • KH: <b>{adPersona}</b> • ~<b>{adWordLimit}</b> từ
                </p>
                <button
                  type="button"
                  onClick={handleGenerateAd}
                  disabled={adLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    flexShrink: 0,
                    padding: '9px 20px',
                    borderRadius: 9,
                    border: 'none',
                    background: adLoading
                      ? 'var(--border, #cbd5e1)'
                      : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: adLoading ? 'var(--muted-foreground, #64748b)' : '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: adLoading ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: adLoading ? 'none' : '0 4px 14px rgba(79,70,229,0.3)',
                  }}
                >
                  <i className={`bi ${adLoading ? 'bi-arrow-repeat spin' : 'bi-stars'}`} />
                  {adLoading ? 'Đang tạo...' : 'Tạo bài viết'}
                </button>
              </div>

              {/* Output Textarea */}
              <div style={{ flex: 1, position: 'relative', minHeight: 400 }}>
                <textarea
                  value={adContent}
                  onChange={(e) => setAdContent(e.target.value)}
                  placeholder={`Bài ${adFormat} sẽ hiện ở đây...\n\nHãy chọn kênh đăng, phong cách viết và chân dung khách hàng, rồi nhấn "Tạo bài viết".`}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 400,
                    padding: '16px',
                    borderRadius: 12,
                    border: '1.5px solid var(--border, #e2e8f0)',
                    background: 'var(--card, #ffffff)',
                    color: 'var(--foreground, #0f172a)',
                    fontSize: 14,
                    lineHeight: 1.8,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                {adContent && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                      {adContent.trim().split(/\s+/).filter(Boolean).length} từ
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAdContent}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 11px',
                        borderRadius: 8,
                        background: 'var(--background, #ffffff)',
                        border: '1px solid var(--border, #e2e8f0)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--foreground, #0f172a)',
                      }}
                    >
                      <i className={`bi ${copiedAd ? 'bi-check2 text-emerald-600' : 'bi-clipboard'}`} style={{ fontSize: 12 }} />
                      {copiedAd ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdContent('')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '5px 10px',
                        borderRadius: 8,
                        background: 'var(--background, #ffffff)',
                        border: '1px solid var(--border, #e2e8f0)',
                        fontSize: 12,
                        cursor: 'pointer',
                        color: 'var(--muted-foreground, #64748b)',
                      }}
                    >
                      <i className="bi bi-trash" style={{ fontSize: 12 }} />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Video Section (Slideshow + Nhạc nền) ── */}
              <div style={{ borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: 14, flexShrink: 0 }}>
                {/* Header hàng điều khiển video */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--foreground, #0f172a)' }}>
                      <i className="bi bi-play-circle" style={{ color: '#4f46e5', marginRight: 6 }} />
                      Video Slideshow
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                      {images.length} ảnh • ~{Math.round(images.length * 3.5)}s • 1080×1080 WebM
                      {currentBgmTrack.id !== 'none' && ` • 🎵 ${currentBgmTrack.name}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={generateVideo}
                    disabled={videoLoading || images.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 18px',
                      borderRadius: 9,
                      border: 'none',
                      background: videoLoading
                        ? 'var(--border, #cbd5e1)'
                        : 'linear-gradient(135deg, #7c3aed, #2563eb)',
                      color: videoLoading ? 'var(--muted-foreground, #64748b)' : '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: videoLoading ? 'default' : 'pointer',
                      boxShadow: videoLoading ? 'none' : '0 4px 14px rgba(124,58,237,0.3)',
                    }}
                  >
                    <i
                      className={`bi ${videoLoading ? 'bi-arrow-repeat spin' : 'bi-camera-video-fill'}`}
                      style={{ fontSize: 13 }}
                    />
                    {videoLoading ? `Đang tạo... ${videoProgress}%` : 'Tạo video có nhạc'}
                  </button>
                </div>

                {/* ── Bộ chọn nhạc nền (BGM Selector) ── */}
                <div
                  style={{
                    marginBottom: 12,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'rgba(124,58,237,0.04)',
                    border: '1px solid rgba(124,58,237,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#6d28d9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      marginRight: 4,
                    }}
                  >
                    <i className="bi bi-music-note-beamed" /> Nhạc nền:
                  </span>
                  {BGM_TRACKS.map((t) => {
                    const isSelected = selectedBgm === t.id;
                    const isPreviewing = previewingAudio === t.url;
                    return (
                      <div
                        key={t.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          borderRadius: 99,
                          border: `1.5px solid ${isSelected ? '#7c3aed' : 'var(--border, #e2e8f0)'}`,
                          background: isSelected ? 'rgba(124,58,237,0.1)' : 'var(--background, #ffffff)',
                          padding: '2px 4px 2px 10px',
                          gap: 6,
                          transition: 'all 0.15s',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedBgm(t.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            fontSize: 11.5,
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#7c3aed' : 'var(--foreground, #0f172a)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>{t.emoji}</span>
                          <span>{t.name}</span>
                        </button>
                        {t.url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePreviewBgm(t.url);
                            }}
                            title={isPreviewing ? 'Tạm dừng nghe thử' : 'Bấm để nghe thử nhạc nền'}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '2px 4px',
                              cursor: 'pointer',
                              color: isPreviewing ? '#d97706' : '#7c3aed',
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i
                              className={`bi ${isPreviewing ? 'bi-pause-circle-fill spin' : 'bi-volume-up-fill'}`}
                            />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                {videoLoading && (
                  <div
                    style={{
                      height: 4,
                      borderRadius: 99,
                      background: 'var(--border, #e2e8f0)',
                      overflow: 'hidden',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${videoProgress}%`,
                        borderRadius: 99,
                        background: 'linear-gradient(90deg, #7c3aed, #2563eb)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}

                {/* Inline video player */}
                {videoUrl && (
                  <div
                    style={{
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: '#000',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(15,5,35,0.95)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <i className="bi bi-check-circle-fill" style={{ color: '#a78bfa', fontSize: 14 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                          Video quảng cáo — sẵn sàng đăng!
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <a
                          href={videoUrl}
                          download={`${p.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_seajong.webm`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 12px',
                            borderRadius: 7,
                            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: 11.5,
                            fontWeight: 700,
                          }}
                        >
                          <i className="bi bi-download" style={{ fontSize: 11 }} /> Tải xuống
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(videoUrl);
                            setVideoUrl(null);
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 7,
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {/* HTML5 video player có âm thanh */}
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      loop
                      style={{
                        width: '100%',
                        display: 'block',
                        maxHeight: 380,
                        objectFit: 'contain',
                        background: '#000',
                      }}
                    />
                    <div
                      style={{
                        padding: '7px 12px',
                        background: 'rgba(15,5,35,0.9)',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: 11, color: 'rgba(200,180,255,0.7)' }}>📐 1080×1080</span>
                      <span style={{ fontSize: 11, color: 'rgba(200,180,255,0.7)' }}>🎬 WebM / VP9</span>
                      {currentBgmTrack.id !== 'none' && (
                        <span style={{ fontSize: 11, color: '#fcd34d' }}>
                          🎵 {currentBgmTrack.name}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'rgba(200,180,255,0.7)' }}>
                        ✅ Facebook · Zalo · YouTube · TikTok
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PRODUCT DRAWER PANEL (CHUẨN 400PX CỦA CLIENT-SEAJONG)
          ════════════════════════════════════════════════════════════════════════ */}
      <div
        className="app-custom-drawer"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          maxWidth: '100vw',
          background: 'var(--card, #ffffff)',
          color: 'var(--foreground, #0f172a)',
          zIndex: 1041,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.18)',
          animation: 'slideInRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        {/* ── HEADER CỐ ĐỊNH ── */}
        <div
          style={{
            padding: '14px 16px',
            flexShrink: 0,
            borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card, #ffffff)',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground, #0f172a)' }}>
            Thông tin sản phẩm
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1.5px solid var(--border, #e2e8f0)',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--foreground, #0f172a)',
              }}
            >
              <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
            </button>
          </div>
        </div>

        {/* ── BODY CUỘN ── */}
        <div className="drawer-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
          {/* Tên sản phẩm + danh mục + link website */}
          <div style={{ marginBottom: 10 }}>
            <p
              style={{
                margin: '0 0 4px',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--foreground, #0f172a)',
                lineHeight: 1.45,
              }}
            >
              {p.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {catNames.map((n) => (
                <span
                  key={n}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: '2px 9px',
                    borderRadius: 99,
                    background: 'rgba(79,70,229,0.1)',
                    color: '#4f46e5',
                  }}
                >
                  {n}
                </span>
              ))}
            </div>

            {/* Price display */}
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#d97706' }}>
                {(() => {
                  if (activeVariationData.length > 0 && Object.keys(selectedOptions).length > 0) {
                    const matchedVar = activeVariationData.find((vd) => {
                      return Object.entries(selectedOptions).every(([k, v]) => {
                        const val = vd.attributes?.[k];
                        return val === v || val === v.toLowerCase() || val === '' || val === undefined;
                      });
                    });
                    if (matchedVar && matchedVar.display_price) {
                      return `${matchedVar.display_price.toLocaleString('vi-VN')} đ`;
                    }
                  }
                  return p.priceHtml
                    ? p.priceHtml
                    : p.price > 0
                    ? `${p.price.toLocaleString('vi-VN')} đ`
                    : 'Liên hệ báo giá';
                })()}
              </span>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#4f46e5',
                    textDecoration: 'none',
                  }}
                >
                  <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }} />
                  Xem website
                </a>
              )}
            </div>

            {/* Variations */}
            {activeVariations.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {activeVariations.map((v, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--muted-foreground, #64748b)',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                        letterSpacing: '0.5px',
                      }}
                    >
                      {v.name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {v.options?.map((opt: string, j: number) => {
                        const optionKey = v.key || v.name;
                        const isSelected = selectedOptions[optionKey] === opt;
                        return (
                          <button
                            key={j}
                            type="button"
                            onClick={() =>
                              setSelectedOptions((prev) => ({ ...prev, [optionKey]: opt }))
                            }
                            style={{
                              padding: '5px 12px',
                              fontSize: 12,
                              fontWeight: 500,
                              border: isSelected ? '1.5px solid #4f46e5' : '1px solid var(--border, #e2e8f0)',
                              borderRadius: 6,
                              cursor: 'pointer',
                              color: isSelected ? '#4f46e5' : 'var(--foreground, #0f172a)',
                              background: isSelected ? 'rgba(79,70,229,0.05)' : 'var(--background, #ffffff)',
                              outline: 'none',
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nút thao tác: Tin nhắn Zalo + Viết bài quảng cáo */}
          {!shouldHideMarketingActions && (
            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Nút Tin nhắn Zalo */}
              <button
                type="button"
                onClick={() => {
                  const specs = Object.entries(p.specs || {})
                    .slice(0, 3)
                    .map(([k, v]) => `- ${k}: ${v}`)
                    .join('\n');
                  const priceText = p.priceHtml
                    ? `💰 Giá tham khảo: ${p.priceHtml}`
                    : p.price > 0
                    ? `💰 Giá tham khảo: ${p.price.toLocaleString('vi-VN')} đ`
                    : '💰 Giá: Liên hệ';
                  const promoText =
                    activePromotions.length > 0
                      ? `\n🎁 Khuyến mãi:\n${activePromotions.map((x) => `- ${x}`).join('\n')}\n`
                      : '';
                  const policyText =
                    activePolicies.length > 0
                      ? `\n🛡️ Chính sách bán hàng:\n${activePolicies.map((x) => `- ${x}`).join('\n')}\n`
                      : '';
                  const varsText =
                    activeVariations.length > 0
                      ? `\n🎨 Tùy chọn có sẵn:\n${activeVariations
                          .map((v) => `- ${v.name}: ${(v.options || []).join(', ')}`)
                          .join('\n')}\n`
                      : '';
                  const text = `Kính gửi anh/chị,\nEm gửi anh/chị thông tin sản phẩm:\n\n✨ ${p.name}\n${priceText}\n${varsText}\n📌 Thông số nổi bật:\n${specs}\n${promoText}${policyText}\n🌐 Xem chi tiết tại: ${
                    p.url || 'https://seajong.com'
                  }\n\nAnh/chị cần thêm thông tin báo giá chi tiết, vui lòng phản hồi lại giúp em nhé!`;
                  navigator.clipboard.writeText(text);
                  showToast('Tin nhắn Zalo đã được lưu vào bộ nhớ tạm!');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #0088FF, #0055FF)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 8px rgba(0,136,255,0.3)',
                }}
              >
                <i className="bi bi-chat-dots" style={{ fontSize: 12 }} />
                Tin nhắn Zalo
              </button>

              {/* Nút Viết bài quảng cáo bằng AI */}
              <button
                type="button"
                onClick={() => setShowAdModal(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                }}
              >
                <i className="bi bi-stars" style={{ fontSize: 12 }} />
                Viết bài quảng cáo
              </button>
            </div>
          )}

          {/* ── Gallery Slideshow ── */}
          {images.length > 0 && (
            <div
              style={{ marginBottom: 20 }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Main slide area */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'var(--background, #f8fafc)',
                  border: '1px solid var(--border, #e2e8f0)',
                  height: 280,
                  marginBottom: 10,
                }}
              >
                <img
                  key={activeImg}
                  src={images[activeImg] || images[0]}
                  alt={p.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    padding: 12,
                    animation: 'fadeSlide 0.25s ease',
                  }}
                />

                {/* Counter dots */}
                {images.length > 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: 5,
                      alignItems: 'center',
                    }}
                  >
                    {images.map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setActiveImg(i)}
                        style={{
                          width: i === activeImg ? 18 : 6,
                          height: 6,
                          borderRadius: 99,
                          cursor: 'pointer',
                          background: i === activeImg ? '#4f46e5' : 'rgba(255,255,255,0.6)',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Prev arrow */}
                {activeImg > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveImg((i) => i - 1)}
                    style={{
                      position: 'absolute',
                      left: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)',
                      border: '1px solid var(--border, #e2e8f0)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <i className="bi bi-chevron-left" style={{ fontSize: 13, color: '#333' }} />
                  </button>
                )}

                {/* Next arrow */}
                {activeImg < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveImg((i) => i + 1)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)',
                      border: '1px solid var(--border, #e2e8f0)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <i className="bi bi-chevron-right" style={{ fontSize: 13, color: '#333' }} />
                  </button>
                )}

                {/* Image counter top-right */}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'rgba(0,0,0,0.45)',
                    color: '#fff',
                    borderRadius: 99,
                    padding: '2px 9px',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {activeImg + 1} / {images.length}
                </div>
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div
                  className="drawer-thumb-strip"
                  style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, scrollBehavior: 'smooth' }}
                >
                  {images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveImg(i)}
                      style={{
                        width: 62,
                        height: 62,
                        flexShrink: 0,
                        borderRadius: 9,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: `2px solid ${i === activeImg ? '#4f46e5' : 'var(--border, #e2e8f0)'}`,
                        background: 'var(--background, #ffffff)',
                        opacity: i === activeImg ? 1 : 0.65,
                        transition: 'all 0.2s ease',
                        boxShadow: i === activeImg ? '0 0 0 3px rgba(79,70,229,0.2)' : 'none',
                      }}
                    >
                      <img
                        src={img}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TABS ── */}
          <div style={{ flex: 1 }}>
            {/* Tab bar */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--border, #e2e8f0)',
                marginBottom: 16,
                gap: 0,
              }}
            >
              {[
                { key: 'desc', label: 'Mô tả', icon: 'bi-file-text' },
                { key: 'specs', label: 'Thông số kỹ thuật', icon: 'bi-list-columns-reverse' },
                { key: 'policy', label: 'Chính sách bán hàng', icon: 'bi-shield-check' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: activeTab === tab.key ? 700 : 500,
                    color: activeTab === tab.key ? '#4f46e5' : 'var(--muted-foreground, #64748b)',
                    borderBottom: `2px solid ${activeTab === tab.key ? '#4f46e5' : 'transparent'}`,
                    marginBottom: -1,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i className={`bi ${tab.icon}`} style={{ fontSize: 12 }} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Mô tả */}
            {activeTab === 'desc' && (
              <div>
                {hasDescription ? (
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 9,
                    }}
                  >
                    {descBullets.map((sentence, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <i
                          className="bi bi-check2-circle"
                          style={{ fontSize: 14, color: '#4f46e5', flexShrink: 0, marginTop: 2 }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--foreground, #0f172a)', lineHeight: 1.7 }}>
                          {sentence}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-foreground, #64748b)' }}>
                    <i
                      className="bi bi-file-earmark-x"
                      style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: 0.35 }}
                    />
                    <p style={{ margin: 0, fontSize: 13 }}>Chưa có mô tả cho sản phẩm này</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Thông số kỹ thuật */}
            {activeTab === 'specs' && (
              <div>
                {hasSpecs ? (
                  <div
                    style={{
                      borderRadius: 10,
                      border: '1px solid var(--border, #e2e8f0)',
                      overflow: 'hidden',
                    }}
                  >
                    {Object.entries(p.specs).map(([k, v], i) => (
                      <div
                        key={k}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '148px 1fr',
                          borderBottom:
                            i < Object.keys(p.specs).length - 1 ? '1px solid var(--border, #e2e8f0)' : 'none',
                          background: i % 2 === 0 ? 'var(--background, #f8fafc)' : 'var(--card, #ffffff)',
                        }}
                      >
                        <div
                          style={{
                            padding: '9px 12px',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--foreground, #0f172a)',
                            borderRight: '1px solid var(--border, #e2e8f0)',
                          }}
                        >
                          {k}
                        </div>
                        <div
                          style={{
                            padding: '9px 12px',
                            fontSize: 13,
                            color: 'var(--muted-foreground, #64748b)',
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-foreground, #64748b)' }}>
                    <i
                      className="bi bi-table"
                      style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: 0.35 }}
                    />
                    <p style={{ margin: 0, fontSize: 13 }}>Chưa có thông số kỹ thuật</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Chính sách bán hàng */}
            {activeTab === 'policy' && (
              <div style={{ animation: 'fadeSlide 0.2s ease', paddingBottom: 20 }}>
                {activePromotions.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h6
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--foreground, #0f172a)',
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <i className="bi bi-gift-fill" style={{ color: '#ef4444' }} />
                      Khuyến mãi đang áp dụng
                    </h6>
                    <div
                      style={{
                        background: 'var(--background, #fef2f2)',
                        borderRadius: 8,
                        padding: '12px 16px',
                        border: '1px dashed #ef4444',
                      }}
                    >
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 16,
                          color: 'var(--foreground, #0f172a)',
                          fontSize: 13,
                          lineHeight: 1.6,
                        }}
                      >
                        {activePromotions.map((pr, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            {pr}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {activePolicies.length > 0 && (
                  <div>
                    <h6
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--foreground, #0f172a)',
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <i className="bi bi-shield-check-fill" style={{ color: '#10b981' }} />
                      Chính sách bán hàng
                    </h6>
                    <div
                      style={{
                        background: 'var(--background, #f8fafc)',
                        borderRadius: 8,
                        padding: '12px 16px',
                        border: '1px solid var(--border, #e2e8f0)',
                      }}
                    >
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 16,
                          color: 'var(--foreground, #0f172a)',
                          fontSize: 13,
                          lineHeight: 1.6,
                        }}
                      >
                        {activePolicies.map((pl, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            {pl}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER CỐ ĐỊNH ── */}
        <div
          style={{
            padding: '12px 24px',
            flexShrink: 0,
            borderTop: '1px solid var(--border, #e2e8f0)',
            background: 'var(--card, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!shouldHidePrintLabel && (
              <button
                type="button"
                onClick={() => setShowPrintLabel(true)}
                style={{
                  height: 34,
                  borderRadius: 8,
                  padding: '0 14px',
                  border: '1px solid var(--border, #e2e8f0)',
                  background: 'var(--card, #ffffff)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--foreground, #0f172a)',
                  fontSize: 12,
                  fontWeight: 600,
                  gap: 6,
                }}
              >
                <i className="bi bi-printer" style={{ fontSize: 13 }} />
                In tem nhãn
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                style={{
                  height: 34,
                  borderRadius: 8,
                  padding: '0 14px',
                  border: '1.5px solid var(--border, #e2e8f0)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--foreground, #0f172a)',
                  fontSize: 12,
                  fontWeight: 600,
                  gap: 6,
                }}
              >
                <i className="bi bi-pencil-square" style={{ fontSize: 13 }} />
                Sửa
              </button>
            )}
            {onAddToCart && (
              <button
                type="button"
                onClick={() => {
                  onAddToCart();
                  onClose();
                }}
                style={{
                  height: 34,
                  borderRadius: 8,
                  padding: '0 16px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(2,132,199,0.35)',
                }}
              >
                <i className="bi bi-cart-plus" style={{ fontSize: 14 }} />
                {addToCartLabel || 'Chọn mua vào đơn'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 34,
                borderRadius: 8,
                padding: '0 16px',
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* ── Print Label Modal ── */}
      <PrintLabelModal
        open={showPrintLabel}
        onClose={() => setShowPrintLabel(false)}
        items={[
          {
            name: p.name,
            code: p.slug,
            color: p.specs?.['Màu sắc'] || p.specs?.['Màu'] || '',
            giaBan: p.price,
            imageUrl: images[0] || null,
          },
        ]}
      />
    </>
  );
};

export default ProductDrawer;
