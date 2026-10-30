/**
 * Utility functions for Partner / Lead classification and process steps in Seajong.
 */

export interface LeadClassificationInput {
  role?: string | null;
  deploymentPlan?: string | null;
  collabNeeds?: string | null;
  otherRequirements?: string | null;
  painPoints?: string | null;
  attitude?: string | null;
}

export const calculateLeadStars = (data: LeadClassificationInput): number => {
  const role = data.role || '';
  const deploymentPlan = data.deploymentPlan || '';
  const collabNeeds = data.collabNeeds || '';
  const otherRequirements = data.otherRequirements || '';
  const painPoints = data.painPoints || '';

  const hasDecisionPower = role === 'Ông chủ' || role === 'Bà chủ' || role === 'Giám Đốc' || role === 'Chủ showroom';
  const isShortTimeline = /30|ngay|sớm|tức|1\s*tháng|immediate|tháng/i.test(deploymentPlan);
  const hasClearNeeds = collabNeeds.trim().length > 8;

  const hasNegativeSignals = /hỏi\s*giá|không\s*đúng|không\s*quan\s*tâm|từ\s*chối|không\s*hợp\s*tác/i.test(
    collabNeeds + ' ' + otherRequirements + ' ' + painPoints
  );

  if (role === 'Nhân viên' || hasNegativeSignals) {
    return hasNegativeSignals ? 1 : 2;
  }

  if (hasDecisionPower && isShortTimeline && hasClearNeeds) {
    return 5;
  }

  if (hasDecisionPower || role === 'Quản lý') {
    if (isShortTimeline || hasClearNeeds) {
      return 4;
    }
    return 3;
  }

  return 3;
};

export const SOURCE_MAP: Record<string, string> = {
  facebook: 'Facebook Ads',
  facebook_ads: 'Facebook Ads',
  google: 'Google Ads',
  google_ads: 'Google Ads',
  tiktok: 'TikTok Ads',
  website: 'Website',
  hotline: 'Hotline',
  zalo: 'Zalo OA',
  crm: 'Tự khai thác',
  tu_khai_thac: 'Tự khai thác',
  'kinh doanh tự khai thác': 'Tự khai thác',
  referral: 'Giới thiệu',
  showroom: 'Showroom',
  trien_lam: 'Triển lãm Vietbuild',
  direct: 'Trực tiếp',
};

export const getSourceLabel = (source?: string): string => {
  if (!source) return 'Trực tiếp';
  const trimmed = source.trim().toLowerCase();
  return SOURCE_MAP[trimmed] || source;
};

/**
 * Tải tệp scan/PDF lên server (/api/upload nhận JSON { fileName, dataUrl })
 */
export const uploadPartnerScanFile = async (file: File): Promise<string> => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Không đọc được tệp'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Lỗi đọc tệp'));
    reader.readAsDataURL(file);
  });

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        dataUrl,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        return String(data.url);
      }
    }
  } catch (err) {
    console.error('Lỗi tải tệp lên server:', err);
  }

  return dataUrl;
};

/**
 * Lấy tên hiển thị gọn sạch của tệp đính kèm (xử lý cả URL /uploads/... lẫn chuỗi data:base64)
 */
export const getAttachmentDisplayName = (
  fileUrl?: string | null,
  fallbackName = 'Tai_lieu_dinh_kem.pdf'
): string => {
  if (!fileUrl) return '';
  const trimmed = fileUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:')) {
    return fallbackName;
  }
  const rawSegment = trimmed.split('?')[0].split('/').pop() || fallbackName;
  let decoded = rawSegment;
  try {
    decoded = decodeURIComponent(rawSegment);
  } catch {
    decoded = rawSegment;
  }
  // Bỏ tiền tố timestamp (VD: 1793280116483-BienBan.pdf -> BienBan.pdf)
  return decoded.replace(/^\d{10,14}-/, '') || fallbackName;
};

/**
 * Mở xem nội dung tệp đính kèm (hỗ trợ cả đường dẫn /uploads/... và chuỗi data:application/pdf;base64,...)
 */
export const openAttachmentFile = (fileUrl?: string | null): void => {
  if (!fileUrl) return;
  const trimmed = fileUrl.trim();
  if (!trimmed) return;

  if (trimmed.startsWith('data:')) {
    try {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx !== -1) {
        const header = trimmed.slice(0, commaIdx);
        const base64 = trimmed.slice(commaIdx + 1);
        const mimeMatch = header.match(/data:([^;]+)/i);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const binaryStr = window.atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
      }
    } catch (err) {
      console.error('Không thể giải mã tệp đính kèm:', err);
    }
  }

  window.open(trimmed, '_blank', 'noopener,noreferrer');
};

/**
 * Định dạng số tiền VNĐ từ số hoặc chuỗi có dấu chấm (VD: "1.200.000.000" -> "1.200.000.000 đ")
 */
export const formatPartnerVnd = (val?: string | number | null): string => {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'number') {
    return val > 0 ? `${val.toLocaleString('vi-VN')} đ` : '—';
  }
  const digits = String(val).replace(/[^\d]/g, '');
  const num = Number(digits);
  return num > 0 ? `${num.toLocaleString('vi-VN')} đ` : '—';
};

