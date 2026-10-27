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
