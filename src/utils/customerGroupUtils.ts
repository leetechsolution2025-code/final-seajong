/**
 * Quản lý & Chuẩn hoá Nhóm Khách Hàng (Customer Group)
 */

export interface CustomerGroupInfo {
  code: string;
  name: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const STANDARD_CUSTOMER_GROUPS: CustomerGroupInfo[] = [
  {
    code: 'dai-ly',
    name: 'Đại lý',
    color: '#003087',
    badgeBg: 'rgba(0, 48, 135, 0.1)',
    badgeText: '#003087',
    badgeBorder: 'rgba(0, 48, 135, 0.25)',
  },
  {
    code: 'dai-ly-cap-1',
    name: 'Đại lý cấp 1',
    color: '#0284c7',
    badgeBg: 'rgba(2, 132, 199, 0.1)',
    badgeText: '#0284c7',
    badgeBorder: 'rgba(2, 132, 199, 0.25)',
  },
  {
    code: 'dai-ly-cap-2',
    name: 'Đại lý cấp 2',
    color: '#0d9488',
    badgeBg: 'rgba(13, 148, 136, 0.1)',
    badgeText: '#0d9488',
    badgeBorder: 'rgba(13, 148, 136, 0.25)',
  },
  {
    code: 'showroom',
    name: 'Showroom độc quyền',
    color: '#7c3aed',
    badgeBg: 'rgba(124, 58, 237, 0.1)',
    badgeText: '#7c3aed',
    badgeBorder: 'rgba(124, 58, 237, 0.25)',
  },
  {
    code: 'du-an',
    name: 'Nhà thầu Dự án',
    color: '#d97706',
    badgeBg: 'rgba(217, 119, 6, 0.1)',
    badgeText: '#d97706',
    badgeBorder: 'rgba(217, 119, 6, 0.25)',
  },
  {
    code: 'ca-nhan',
    name: 'Khách lẻ cao cấp',
    color: '#e11d48',
    badgeBg: 'rgba(225, 29, 72, 0.1)',
    badgeText: '#e11d48',
    badgeBorder: 'rgba(225, 29, 72, 0.25)',
  },
];

export const getCustomerGroupInfo = (codeOrName?: string | null): CustomerGroupInfo => {
  if (!codeOrName) return STANDARD_CUSTOMER_GROUPS[0];
  const normalized = codeOrName.toLowerCase().trim();

  const found = STANDARD_CUSTOMER_GROUPS.find(
    (g) => g.code === normalized || g.name.toLowerCase() === normalized
  );

  return (
    found || {
      code: normalized,
      name: codeOrName,
      color: '#64748b',
      badgeBg: 'rgba(100, 116, 139, 0.1)',
      badgeText: '#64748b',
      badgeBorder: 'rgba(100, 116, 139, 0.2)',
    }
  );
};

export const getCustomerGroupLabel = (codeOrName?: string | null): string => {
  return getCustomerGroupInfo(codeOrName).name;
};

