import React, { useState, useEffect, useMemo } from 'react';
import {
  Key,
  Eye,
  EyeSlash,
  CheckCircleFill,
  ExclamationTriangleFill,
  Save,
  ArrowRepeat,
  Cpu,
  Soundwave,
  BoxArrowUpRight,
  ClipboardCheck,
  LightningChargeFill,
  XCircleFill,
  CashCoin,
  ShieldCheck,
  ToggleOn,
  ToggleOff,
  CheckSquareFill,
  Square,
  InfoCircleFill,
  Sliders,
  CashStack,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';

// Hàm đọc số tiền thành chữ tiếng Việt chuẩn xác
export function numberToVietnameseWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Không đồng';
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(n: number, isFirst: boolean): string {
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const unit = n % 10;
    let res = '';

    if (hundred > 0 || !isFirst) {
      res += digits[hundred] + ' trăm ';
    }

    if (ten > 1) {
      res += digits[ten] + ' mươi ';
      if (unit === 1) res += 'mốt ';
      else if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else if (ten === 1) {
      res += 'mười ';
      if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else {
      if (hundred > 0 || !isFirst) {
        if (unit > 0) res += 'lẻ ' + digits[unit] + ' ';
      } else {
        if (unit > 0) res += digits[unit] + ' ';
      }
    }
    return res;
  }

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];
  let temp = Math.floor(num);
  const groups: number[] = [];
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const isFirst = i === groups.length - 1;
      const groupStr = readThreeDigits(g, isFirst).trim();
      result += groupStr + ' ' + units[i] + ' ';
    }
  }
  result = result.trim();
  if (!result) return 'Không đồng';
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn';
}

export const DEFAULT_ACCOUNTING_EXPENSE_CATEGORIES = [
  'Cước xe tải giao hàng thiết bị vệ sinh, phụ kiện phòng tắm COD khẩn cấp',
  'Tiền điện, nước sản xuất xưởng đúc & showroom định kỳ',
  'Vật tư tiêu hao, màng xốp đóng gói, bọc góc bảo vệ sứ và sen vòi',
  'Chi phí tiếp khách, công tác đại lý thiết bị vệ sinh theo quy chế',
  'Phí dịch vụ ngân hàng, bảo lãnh thanh toán nhà cung cấp linh kiện',
  'Sửa chữa, bảo dưỡng đột xuất máy đúc, máy mạ PVD nhỏ (≤ 5 triệu đồng)',
];

export interface SystemParametersViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const SystemParametersView: React.FC<SystemParametersViewProps> = ({ onShowToast }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ══════════════════════════════════════════════════════════════════
  // QUY ĐỊNH MỨC KINH PHÍ KẾ TOÁN ĐƯỢC TỰ ĐỘNG CHI
  // ══════════════════════════════════════════════════════════════════
  const [accountingAutoEnabled, setAccountingAutoEnabled] = useState<boolean>(true);
  const [accountingSingleLimit, setAccountingSingleLimit] = useState<number>(20000000);
  const [accountingDailyLimit, setAccountingDailyLimit] = useState<number>(100000000);
  const [accountingEmergencyAdvance, setAccountingEmergencyAdvance] = useState<number>(5000000);
  const [accountingRequireReceipt, setAccountingRequireReceipt] = useState<boolean>(true);
  const [accountingAllowedCategories, setAccountingAllowedCategories] = useState<string[]>(
    DEFAULT_ACCOUNTING_EXPENSE_CATEGORIES
  );

  // Trạng thái kiểm tra kết nối AI
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean;
    model?: string;
    reply?: string;
    keyIndex?: number;
    totalKeys?: number;
    error?: string;
  } | null>(null);

  const [isTestingEleven, setIsTestingEleven] = useState(false);
  const [elevenTestResult, setElevenTestResult] = useState<{
    success: boolean;
    tier?: string;
    characterCount?: number;
    characterLimit?: number;
    error?: string;
  } | null>(null);

  // Phân tích danh sách các key nếu người dùng nhập nhiều key
  const geminiKeysList = useMemo(() => {
    return geminiKey
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [geminiKey]);

  // Nạp cấu hình từ localStorage và API backend khi mount
  useEffect(() => {
    // 1. Tải nhanh từ localStorage
    const savedGemini = localStorage.getItem('seajong_gemini_key') || '';
    const savedEleven = localStorage.getItem('seajong_elevenlabs_key') || '';
    if (savedGemini) setGeminiKey(savedGemini);
    if (savedEleven) setElevenLabsKey(savedEleven);

    const savedAutoEnabled = localStorage.getItem('seajong_accounting_auto_enabled');
    if (savedAutoEnabled !== null) setAccountingAutoEnabled(savedAutoEnabled !== 'false');

    const savedSingleLimit = localStorage.getItem('seajong_accounting_single_limit');
    if (savedSingleLimit) setAccountingSingleLimit(Number(savedSingleLimit));

    const savedDailyLimit = localStorage.getItem('seajong_accounting_daily_limit');
    if (savedDailyLimit) setAccountingDailyLimit(Number(savedDailyLimit));

    const savedEmergency = localStorage.getItem('seajong_accounting_emergency_advance');
    if (savedEmergency) setAccountingEmergencyAdvance(Number(savedEmergency));

    const savedRequireReceipt = localStorage.getItem('seajong_accounting_require_receipt');
    if (savedRequireReceipt !== null) setAccountingRequireReceipt(savedRequireReceipt !== 'false');

    const savedCategories = localStorage.getItem('seajong_accounting_allowed_categories');
    if (savedCategories) {
      try {
        setAccountingAllowedCategories(JSON.parse(savedCategories));
      } catch {}
    }

    // 2. Đồng bộ từ backend database nếu có
    fetch('/api/system-settings')
      .then((res) => {
        if (!res.ok) return {} as Record<string, any>;
        return res.json() as Promise<Record<string, any>>;
      })
      .then((data: Record<string, any>) => {
        if (data && data.gemini_key) {
          setGeminiKey(data.gemini_key);
          localStorage.setItem('seajong_gemini_key', data.gemini_key);
        }
        if (data && data.elevenlabs_key) {
          setElevenLabsKey(data.elevenlabs_key);
          localStorage.setItem('seajong_elevenlabs_key', data.elevenlabs_key);
        }
        if (data && data.accounting_auto_enabled !== undefined) {
          const val = Boolean(data.accounting_auto_enabled);
          setAccountingAutoEnabled(val);
          localStorage.setItem('seajong_accounting_auto_enabled', String(val));
        }
        if (data && data.accounting_single_limit) {
          const val = Number(data.accounting_single_limit);
          setAccountingSingleLimit(val);
          localStorage.setItem('seajong_accounting_single_limit', String(val));
        }
        if (data && data.accounting_daily_limit) {
          const val = Number(data.accounting_daily_limit);
          setAccountingDailyLimit(val);
          localStorage.setItem('seajong_accounting_daily_limit', String(val));
        }
        if (data && data.accounting_emergency_advance) {
          const val = Number(data.accounting_emergency_advance);
          setAccountingEmergencyAdvance(val);
          localStorage.setItem('seajong_accounting_emergency_advance', String(val));
        }
        if (data && data.accounting_require_receipt !== undefined) {
          const val = Boolean(data.accounting_require_receipt);
          setAccountingRequireReceipt(val);
          localStorage.setItem('seajong_accounting_require_receipt', String(val));
        }
        if (data && data.accounting_allowed_categories) {
          try {
            const parsed = typeof data.accounting_allowed_categories === 'string'
              ? JSON.parse(data.accounting_allowed_categories)
              : data.accounting_allowed_categories;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAccountingAllowedCategories(parsed);
              localStorage.setItem('seajong_accounting_allowed_categories', JSON.stringify(parsed));
            }
          } catch {}
        }
      })
      .catch(() => {
        // Sử dụng dữ liệu offline / localStorage
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Lưu vào localStorage
      localStorage.setItem('seajong_gemini_key', geminiKey.trim());
      localStorage.setItem('seajong_elevenlabs_key', elevenLabsKey.trim());
      localStorage.setItem('seajong_accounting_auto_enabled', String(accountingAutoEnabled));
      localStorage.setItem('seajong_accounting_single_limit', String(accountingSingleLimit));
      localStorage.setItem('seajong_accounting_daily_limit', String(accountingDailyLimit));
      localStorage.setItem('seajong_accounting_emergency_advance', String(accountingEmergencyAdvance));
      localStorage.setItem('seajong_accounting_require_receipt', String(accountingRequireReceipt));
      localStorage.setItem('seajong_accounting_allowed_categories', JSON.stringify(accountingAllowedCategories));

      // 2. Lưu vào CSDL backend (SQLite system_settings)
      const res = await fetch('/api/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_key: geminiKey.trim(),
          elevenlabs_key: elevenLabsKey.trim(),
          accounting_auto_enabled: accountingAutoEnabled,
          accounting_single_limit: accountingSingleLimit,
          accounting_daily_limit: accountingDailyLimit,
          accounting_emergency_advance: accountingEmergencyAdvance,
          accounting_require_receipt: accountingRequireReceipt,
          accounting_allowed_categories: accountingAllowedCategories,
        }),
      });

      if (!res.ok) {
        throw new Error('Lỗi phản hồi máy chủ');
      }

      // 3. Kích hoạt sự kiện áp dụng ngay lập tức cho toàn bộ dự án
      window.dispatchEvent(
        new CustomEvent('seajong_settings_saved', {
          detail: {
            geminiKey: geminiKey.trim(),
            elevenLabsKey: elevenLabsKey.trim(),
            accountingAutoEnabled,
            accountingSingleLimit,
            accountingDailyLimit,
          },
        })
      );

      if (onShowToast) {
        onShowToast(
          'success',
          'Đã cập nhật vào CSDL và hệ thống',
          'Các thông số hệ thống và quy định mức kinh phí kế toán tự động chi đã được lưu thành công.'
        );
      }
    } catch {
      // Dù backend có offline vẫn lưu được tại client
      window.dispatchEvent(
        new CustomEvent('seajong_settings_saved', {
          detail: {
            geminiKey: geminiKey.trim(),
            elevenLabsKey: elevenLabsKey.trim(),
            accountingAutoEnabled,
            accountingSingleLimit,
            accountingDailyLimit,
          },
        })
      );
      if (onShowToast) {
        onShowToast(
          'success',
          'Đã lưu cấu hình cục bộ',
          'Các thông số và hạn mức chi đã được ghi nhận vào trình duyệt và áp dụng ngay lập tức.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestGemini = async () => {
    if (!geminiKey.trim()) {
      if (onShowToast) onShowToast('warning', 'Chưa có Key', 'Vui lòng dán ít nhất một Gemini API Key để kiểm tra.');
      return;
    }
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await fetch('/api/ai/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: geminiKey.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGeminiTestResult({
          success: true,
          model: data.model,
          reply: data.reply,
          keyIndex: data.keyIndex,
          totalKeys: data.totalKeys,
        });
        if (onShowToast) onShowToast('success', 'Kết nối thành công', `Đã kết nối thành công tới model ${data.model}!`);
      } else {
        setGeminiTestResult({
          success: false,
          error: data.error || 'Không nhận được phản hồi từ Google Gemini',
        });
        if (onShowToast) onShowToast('error', 'Lỗi kết nối', data.error || 'Không thể kết nối');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi mạng khi kết nối tới máy chủ';
      setGeminiTestResult({
        success: false,
        error: msg,
      });
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleTestElevenLabs = async () => {
    if (!elevenLabsKey.trim()) {
      if (onShowToast) onShowToast('warning', 'Chưa có Key', 'Vui lòng dán ElevenLabs API Key để kiểm tra.');
      return;
    }
    setIsTestingEleven(true);
    setElevenTestResult(null);
    try {
      const res = await fetch('/api/ai/test-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: elevenLabsKey.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setElevenTestResult({
          success: true,
          tier: data.tier,
          characterCount: data.characterCount,
          characterLimit: data.characterLimit,
        });
        if (onShowToast) onShowToast('success', 'Kết nối thành công', `Tài khoản ElevenLabs gói ${data.tier} hoạt động bình thường!`);
      } else {
        setElevenTestResult({
          success: false,
          error: data.error || 'Key ElevenLabs không hợp lệ',
        });
        if (onShowToast) onShowToast('error', 'Lỗi ElevenLabs', data.error || 'Không thể xác thực');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi mạng khi kết nối';
      setElevenTestResult({
        success: false,
        error: msg,
      });
    } finally {
      setIsTestingEleven(false);
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    if (onShowToast) {
      onShowToast('info', 'Đã sao chép', `Đã sao chép ${fieldName} vào khay nhớ tạm.`);
    }
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại các thông số cấu hình về mặc định?')) {
      setGeminiKey('');
      setElevenLabsKey('');
      setGeminiTestResult(null);
      setElevenTestResult(null);
      setAccountingAutoEnabled(true);
      setAccountingSingleLimit(20000000);
      setAccountingDailyLimit(100000000);
      setAccountingEmergencyAdvance(5000000);
      setAccountingRequireReceipt(true);
      setAccountingAllowedCategories(DEFAULT_ACCOUNTING_EXPENSE_CATEGORIES);

      localStorage.removeItem('seajong_gemini_key');
      localStorage.removeItem('seajong_elevenlabs_key');
      localStorage.setItem('seajong_accounting_auto_enabled', 'true');
      localStorage.setItem('seajong_accounting_single_limit', '20000000');
      localStorage.setItem('seajong_accounting_daily_limit', '100000000');
      localStorage.setItem('seajong_accounting_emergency_advance', '5000000');
      localStorage.setItem('seajong_accounting_require_receipt', 'true');
      localStorage.setItem('seajong_accounting_allowed_categories', JSON.stringify(DEFAULT_ACCOUNTING_EXPENSE_CATEGORIES));

      fetch('/api/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_key: '',
          elevenlabs_key: '',
          accounting_auto_enabled: true,
          accounting_single_limit: 20000000,
          accounting_daily_limit: 100000000,
          accounting_emergency_advance: 5000000,
          accounting_require_receipt: true,
          accounting_allowed_categories: DEFAULT_ACCOUNTING_EXPENSE_CATEGORIES,
        }),
      }).catch(() => {});
      window.dispatchEvent(
        new CustomEvent('seajong_settings_saved', {
          detail: {
            geminiKey: '',
            elevenLabsKey: '',
            accountingAutoEnabled: true,
            accountingSingleLimit: 20000000,
            accountingDailyLimit: 100000000,
          },
        })
      );
      if (onShowToast) {
        onShowToast('info', 'Đã đặt lại', 'Các thông số hệ thống và hạn mức chi đã được phục hồi về mặc định.');
      }
    }
  };

  const toggleCategory = (cat: string) => {
    setAccountingAllowedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div
      style={{
        maxWidth: '920px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        paddingTop: '8px',
        paddingBottom: '48px',
      }}
    >
      {/* 1. KHÓA GOOGLE GEMINI API */}
      <div
        style={{
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--bg-surface-1)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Google Gemini API Key (Ưu tiên Flash 2.5)
                </span>
                {geminiKeysList.length > 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-success)',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <CheckCircleFill size={10} /> Đã cấu hình {geminiKeysList.length > 1 ? `(${geminiKeysList.length} keys)` : ''}
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-warning)',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <ExclamationTriangleFill size={10} /> Chưa thiết lập
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Phục vụ trích xuất điều kiện kỹ thuật, tóm tắt HSMT và đánh giá năng lực dự thầu tự động.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleTestGemini}
              disabled={isTestingGemini || !geminiKey.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: '#2563eb',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                cursor: isTestingGemini || !geminiKey.trim() ? 'not-allowed' : 'pointer',
                opacity: isTestingGemini || !geminiKey.trim() ? 0.6 : 1,
              }}
            >
              <LightningChargeFill size={12} />
              <span>{isTestingGemini ? 'Đang test...' : 'Kiểm tra kết nối'}</span>
            </button>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-2)',
              }}
            >
              <span>Lấy Key tại AI Studio</span>
              <BoxArrowUpRight size={11} />
            </a>
          </div>
        </div>

        {/* Textarea Field cho Gemini Key */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="Dán mã API Key của bạn vào đây (hỗ trợ nhập nhiều key cách nhau bằng dấu phẩy hoặc xuống dòng)..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-canvas, #ffffff)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              fontFamily: "'Roboto Condensed', sans-serif",
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.5,
              transition: 'border-color var(--transition-fast)',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {geminiKeysList.length > 1
                ? `Đã nhận diện ${geminiKeysList.length} API keys (hệ thống sẽ tự động luân phiên sử dụng)`
                : geminiKeysList.length === 1
                ? 'Đã nhận diện 1 API key hợp lệ'
                : 'Chưa có key nào được nhập'}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(geminiKey, 'Gemini Keys')}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                color: copiedField === 'Gemini Keys' ? 'var(--color-success)' : 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                borderRadius: 'var(--radius-sm)',
              }}
              title="Sao chép toàn bộ"
            >
              <ClipboardCheck size={14} />
              <span>{copiedField === 'Gemini Keys' ? 'Đã sao chép' : 'Sao chép keys'}</span>
            </button>
          </div>
        </div>

        {/* Kết quả kiểm tra kết nối Gemini */}
        {geminiTestResult && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: geminiTestResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${geminiTestResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {geminiTestResult.success ? (
                <>
                  <CheckCircleFill size={16} color="var(--color-success)" />
                  <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--color-success)' }}>
                    Kiểm tra kết nối thành công! Đang kích hoạt model: {geminiTestResult.model}
                  </span>
                  {geminiTestResult.keyIndex && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      (Khóa đang phản hồi tốt: #{geminiTestResult.keyIndex}/{geminiTestResult.totalKeys})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <XCircleFill size={16} color="var(--color-danger)" />
                  <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--color-danger)' }}>
                    Kết nối thất bại
                  </span>
                </>
              )}
            </div>
            {geminiTestResult.reply && (
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface-1)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{geminiTestResult.reply}&rdquo;
              </div>
            )}
            {geminiTestResult.error && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>
                {geminiTestResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. KHÓA ELEVENLABS API */}
      <div
        style={{
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--bg-surface-1)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(236, 72, 153, 0.12)',
                color: '#ec4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Soundwave size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  ElevenLabs API Key
                </span>
                {elevenLabsKey ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-success)',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <CheckCircleFill size={10} /> Đã cấu hình
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-warning)',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <ExclamationTriangleFill size={10} /> Chưa thiết lập
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Phục vụ phát thanh thông báo điều hành nhà máy, nhắc lịch và trợ lý giọng nói AI.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleTestElevenLabs}
              disabled={isTestingEleven || !elevenLabsKey.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: '#ec4899',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                border: '1px solid rgba(236, 72, 153, 0.25)',
                cursor: isTestingEleven || !elevenLabsKey.trim() ? 'not-allowed' : 'pointer',
                opacity: isTestingEleven || !elevenLabsKey.trim() ? 0.6 : 1,
              }}
            >
              <LightningChargeFill size={12} />
              <span>{isTestingEleven ? 'Đang test...' : 'Kiểm tra kết nối'}</span>
            </button>

            <a
              href="https://elevenlabs.io/app/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-2)',
              }}
            >
              <span>Lấy Key tại ElevenLabs</span>
              <BoxArrowUpRight size={11} />
            </a>
          </div>
        </div>

        {/* Input Field */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              position: 'absolute',
              left: '14px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Key size={16} />
          </div>
          <input
            type={showElevenLabsKey ? 'text' : 'password'}
            value={elevenLabsKey}
            onChange={(e) => setElevenLabsKey(e.target.value)}
            placeholder="Dán mã ElevenLabs API Key vào đây, ví dụ: xi-api-key-..."
            style={{
              width: '100%',
              padding: '11px 90px 11px 40px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-canvas, #ffffff)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontFamily: "'Roboto Condensed', sans-serif",
              outline: 'none',
              transition: 'border-color var(--transition-fast)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
          />
          <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 'var(--radius-sm)',
              }}
              title={showElevenLabsKey ? 'Ẩn khóa' : 'Hiện khóa'}
            >
              {showElevenLabsKey ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(elevenLabsKey, 'ElevenLabs Key')}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: copiedField === 'ElevenLabs Key' ? 'var(--color-success)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 'var(--radius-sm)',
              }}
              title="Sao chép"
            >
              <ClipboardCheck size={16} />
            </button>
          </div>
        </div>

        {/* Kết quả kiểm tra kết nối ElevenLabs */}
        {elevenTestResult && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: elevenTestResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${elevenTestResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {elevenTestResult.success ? (
                <>
                  <CheckCircleFill size={16} color="var(--color-success)" />
                  <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--color-success)' }}>
                    Kiểm tra ElevenLabs thành công! Gói tài khoản: {elevenTestResult.tier}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ({elevenTestResult.characterCount?.toLocaleString()} / {elevenTestResult.characterLimit?.toLocaleString()} ký tự khả dụng)
                  </span>
                </>
              ) : (
                <>
                  <XCircleFill size={16} color="var(--color-danger)" />
                  <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--color-danger)' }}>
                    Kết nối ElevenLabs thất bại: {elevenTestResult.error}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. QUY ĐỊNH MỨC KINH PHÍ KẾ TOÁN ĐƯỢC TỰ ĐỘNG CHI */}
      <div
        style={{
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--bg-surface-1)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Header Card */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CashCoin size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Quy định mức kinh phí Kế toán được tự động chi
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#4f46e5',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    letterSpacing: '0.02em',
                  }}
                >
                  QUY CHẾ TÀI CHÍNH
                </span>
                {accountingAutoEnabled ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-success)',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <CheckCircleFill size={10} /> Đang kích hoạt (≤ {accountingSingleLimit.toLocaleString('vi-VN')} đồng/lệnh)
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-danger)',
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <XCircleFill size={10} /> Tạm dừng phê duyệt tự động
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Quy định số tiền tối đa cho mỗi lệnh chi và tổng hạn mức trong ngày mà Kế toán trưởng được quyền phê duyệt & xuất quỹ trực tiếp mà không cần trình Ban Giám đốc.
              </div>
            </div>
          </div>

          {/* Toggle Switch Bật/Tắt */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setAccountingAutoEnabled(!accountingAutoEnabled)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: accountingAutoEnabled ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface-2)',
                color: accountingAutoEnabled ? '#059669' : 'var(--text-muted)',
                border: accountingAutoEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-default)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {accountingAutoEnabled ? <ToggleOn size={20} color="#059669" /> : <ToggleOff size={20} color="#94a3b8" />}
              <span>{accountingAutoEnabled ? 'Đang bật tự động chi' : 'Tắt tự động chi'}</span>
            </button>
          </div>
        </div>

        {/* Khối 3 thẻ chỉ số hạn mức */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px',
          }}
        >
          {/* Card 1: Hạn mức 1 lệnh chi */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Hạn mức 1 lệnh chi lẻ
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#059669',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                Tối đa / lệnh
              </span>
            </div>

            <Input
              type="number"
              value={accountingSingleLimit}
              onNumericChange={(num) => setAccountingSingleLimit(num)}
              disabled={!accountingAutoEnabled}
              suffix="đồng"
              placeholder="0"
              className="text-base font-bold text-slate-800"
            />

            {/* Đọc số tiền bằng chữ */}
            <div style={{ fontSize: '0.75rem', color: '#0369a1', fontStyle: 'italic', minHeight: '18px' }}>
              📖 {numberToVietnameseWords(accountingSingleLimit)}
            </div>

            {/* Nút mốc nhanh */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
              {[10000000, 20000000, 30000000, 50000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={!accountingAutoEnabled}
                  onClick={() => setAccountingSingleLimit(val)}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: accountingSingleLimit === val ? '1px solid #059669' : '1px solid var(--border-default)',
                    backgroundColor: accountingSingleLimit === val ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface-1)',
                    color: accountingSingleLimit === val ? '#047857' : 'var(--text-secondary)',
                    cursor: accountingAutoEnabled ? 'pointer' : 'not-allowed',
                    fontWeight: accountingSingleLimit === val ? 700 : 500,
                  }}
                >
                  {(val / 1000000).toLocaleString('vi-VN')} tr
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Lệnh chi ≤ số tiền này Kế toán được duyệt & xuất quỹ ngay.
            </div>
          </div>

          {/* Card 2: Tổng hạn mức chi tự động / ngày */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Tổng hạn mức tự động / ngày
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#2563eb',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                Tích lũy ngày
              </span>
            </div>

            <Input
              type="number"
              value={accountingDailyLimit}
              onNumericChange={(num) => setAccountingDailyLimit(num)}
              disabled={!accountingAutoEnabled}
              suffix="đồng"
              placeholder="0"
              className="text-base font-bold text-slate-800"
            />

            {/* Đọc số tiền bằng chữ */}
            <div style={{ fontSize: '0.75rem', color: '#0369a1', fontStyle: 'italic', minHeight: '18px' }}>
              📖 {numberToVietnameseWords(accountingDailyLimit)}
            </div>

            {/* Nút mốc nhanh */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
              {[50000000, 100000000, 150000000, 200000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={!accountingAutoEnabled}
                  onClick={() => setAccountingDailyLimit(val)}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: accountingDailyLimit === val ? '1px solid #2563eb' : '1px solid var(--border-default)',
                    backgroundColor: accountingDailyLimit === val ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface-1)',
                    color: accountingDailyLimit === val ? '#1d4ed8' : 'var(--text-secondary)',
                    cursor: accountingAutoEnabled ? 'pointer' : 'not-allowed',
                    fontWeight: accountingDailyLimit === val ? 700 : 500,
                  }}
                >
                  {(val / 1000000).toLocaleString('vi-VN')} tr
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Tổng cộng các lệnh chi tự động trong 1 ngày không vượt quá mức này.
            </div>
          </div>

          {/* Card 3: Hạn mức tạm ứng khẩn cấp */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Hạn mức tạm ứng khẩn cấp
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#d97706',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                Nhân viên / Lái xe
              </span>
            </div>

            <Input
              type="number"
              value={accountingEmergencyAdvance}
              onNumericChange={(num) => setAccountingEmergencyAdvance(num)}
              disabled={!accountingAutoEnabled}
              suffix="đồng"
              placeholder="0"
              className="text-base font-bold text-slate-800"
            />

            {/* Đọc số tiền bằng chữ */}
            <div style={{ fontSize: '0.75rem', color: '#0369a1', fontStyle: 'italic', minHeight: '18px' }}>
              📖 {numberToVietnameseWords(accountingEmergencyAdvance)}
            </div>

            {/* Nút mốc nhanh */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
              {[2000000, 5000000, 10000000, 15000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={!accountingAutoEnabled}
                  onClick={() => setAccountingEmergencyAdvance(val)}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: accountingEmergencyAdvance === val ? '1px solid #d97706' : '1px solid var(--border-default)',
                    backgroundColor: accountingEmergencyAdvance === val ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface-1)',
                    color: accountingEmergencyAdvance === val ? '#b45309' : 'var(--text-secondary)',
                    cursor: accountingAutoEnabled ? 'pointer' : 'not-allowed',
                    fontWeight: accountingEmergencyAdvance === val ? 700 : 500,
                  }}
                >
                  {(val / 1000000).toLocaleString('vi-VN')} tr
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Áp dụng cho tạm ứng phát sinh công tác, cứu hộ giao hàng COD.
            </div>
          </div>
        </div>

        {/* Khối Danh mục nghiệp vụ được áp dụng */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Phạm vi nghiệp vụ chi tiêu được áp dụng cơ chế tự động chi ({accountingAllowedCategories.length}/{DEFAULT_ACCOUNTING_EXPENSE_CATEGORIES.length})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Nhấp vào từng dòng để bật/tắt quyền áp dụng
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '8px',
            }}
          >
            {DEFAULT_ACCOUNTING_EXPENSE_CATEGORIES.map((cat) => {
              const isChecked = accountingAllowedCategories.includes(cat);
              return (
                <div
                  key={cat}
                  onClick={() => accountingAutoEnabled && toggleCategory(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: isChecked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-default)',
                    backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-canvas, #ffffff)',
                    cursor: accountingAutoEnabled ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease',
                    opacity: accountingAutoEnabled ? 1 : 0.6,
                  }}
                >
                  {isChecked ? (
                    <CheckSquareFill size={15} color="#059669" />
                  ) : (
                    <Square size={15} color="var(--text-muted)" />
                  )}
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isChecked ? 600 : 400,
                    }}
                  >
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Checkbox bắt buộc chứng từ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
          <input
            type="checkbox"
            id="accounting-require-receipt"
            checked={accountingRequireReceipt}
            onChange={(e) => setAccountingRequireReceipt(e.target.checked)}
            disabled={!accountingAutoEnabled}
            style={{ cursor: accountingAutoEnabled ? 'pointer' : 'not-allowed', width: '16px', height: '16px' }}
          />
          <label
            htmlFor="accounting-require-receipt"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
              cursor: accountingAutoEnabled ? 'pointer' : 'not-allowed',
              fontWeight: 500,
              userSelect: 'none',
            }}
          >
            Bắt buộc đính kèm hóa đơn GTGT / phiếu thu hoặc chứng từ chuyển khoản hợp lệ trong vòng 24h - 48h sau khi chi
          </label>
        </div>

        {/* Hộp Quy chuẩn thẩm quyền & Bảo đảm an toàn ngân quỹ */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-2)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <div style={{ color: '#059669', paddingTop: '2px', flexShrink: 0 }}>
            <ShieldCheck size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7813rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
              Quy chuẩn thẩm quyền giải ngân tài chính:
            </div>
            <div>
              • <strong>Khoản chi ≤ {accountingSingleLimit.toLocaleString('vi-VN')} đồng:</strong> Kế toán trưởng ký duyệt và xuất quỹ/chuyển khoản trực tiếp (ghi sổ quỹ TK 111/112).
            </div>
            <div>
              • <strong>Khoản chi &gt; {accountingSingleLimit.toLocaleString('vi-VN')} đồng hoặc vượt tổng hạn mức ngày ({accountingDailyLimit.toLocaleString('vi-VN')} đồng):</strong> Hệ thống tự động khóa duyệt nhanh, bắt buộc chuyển sang trạng thái <em>&ldquo;Trình Ban Giám đốc phê duyệt&rdquo;</em>.
            </div>
            <div>
              • <strong>Kiểm soát nội bộ:</strong> Tất cả các lệnh chi tự động đều được lưu nhật ký kiểm toán (Audit Log) theo thời gian thực để Ban Giám đốc tra cứu bất kỳ lúc nào.
            </div>
          </div>
        </div>
      </div>

      {/* Nút hành động */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '8px',
        }}
      >
        <Button
          variant="outline"
          size="md"
          leftIcon={<ArrowRepeat size={16} />}
          onClick={handleReset}
        >
          Đặt lại
        </Button>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Save size={16} />}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Đang lưu...' : 'Lưu thiết lập'}
        </Button>
      </div>
    </div>
  );
};
