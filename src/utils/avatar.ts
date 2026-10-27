/**
 * Utility tạo ký tự đại diện (Initials) và kiểu màu Avatar chuẩn toàn hệ thống Seajong.
 * 
 * Quy tắc Seajong:
 * - Khi dùng avatar ký tự, lấy 2 ký tự: chữ cái đầu của từ đầu (họ) và chữ cái đầu của từ cuối (tên).
 *   Ví dụ:
 *     "Đặng Văn Kháng"   -> "ĐK"
 *     "Lê Anh Vân"       -> "LV"
 *     "Đoàn Thị Yến"     -> "ĐY"
 *     "Vũ Hùng Cường"    -> "VC"
 *     "Nguyễn Lê Dũng"   -> "ND"
 *     "Trần Thị Mai Anh" -> "TA"
 *     "Hà Thị Bích Ngọc" -> "HN"
 *     "Nguyễn Văn Tiến"  -> "NT"
 *     "Trần Thị Linh"    -> "TL"
 *     "Cao Thị Phương"   -> "CP"
 *     "Lê Công Vụ"       -> "LV"
 * - Nếu chỉ có 1 từ (ví dụ "Nam") -> "NA" (2 ký tự đầu).
 * - Nếu rỗng -> "".
 */

export function getAvatarInitials(fullName: string): string {
  if (!fullName) return '';
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  if (words.length === 1) {
    const chars = Array.from(words[0]);
    return chars.slice(0, Math.min(2, chars.length)).join('').toUpperCase();
  }

  const firstWordChars = Array.from(words[0]);
  const lastWordChars = Array.from(words[words.length - 1]);
  const firstChar = firstWordChars[0] || '';
  const lastChar = lastWordChars[0] || '';
  return (firstChar + lastChar).toUpperCase();
}

/**
 * Alias cho getAvatarInitials tương thích với các component của client-skydoor
 */
export const getInitials = getAvatarInitials;

/**
 * Bảng màu Tailwind hài hòa, thanh lịch và cố định dựa theo tên nhân viên
 */
export interface AvatarColorStyle {
  bg: string;
  text: string;
  border: string;
}

export const AVATAR_COLOR_PALETTES: AvatarColorStyle[] = [
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
];

export function getAvatarColor(name: string): AvatarColorStyle {
  if (!name) return AVATAR_COLOR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLOR_PALETTES.length;
  return AVATAR_COLOR_PALETTES[index];
}
