import { type ClassValue, clsx } from "clsx";

/** Merge CSS class names */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Chuẩn hoá chuỗi tiếng Việt: bỏ dấu, lowercase.
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export { getAvatarInitials, getAvatarColor, getInitials } from '../utils/avatar';

