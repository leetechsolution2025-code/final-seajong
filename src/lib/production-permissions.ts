import { hasAnyPermission, hasPermission, isAdminUser } from './permissions';

/**
 * Production Permission Helper
 * Căn cứ theo quyền hạn đã cấp cho tài khoản trên trang Phân quyền người dùng:
 * - prod_orders: Quản lý lệnh sản xuất & lắp ráp
 * - prod_bom: Xây dựng định mức vật tư (BOM)
 * - prod_defects: Xử lý & khắc phục hàng lỗi
 */

export type ProductionUserLike = {
  role?: string | null;
  permissions?: string[] | string | null;
  positionName?: string | null;
  position?: string | null;
  levelOrder?: number | null;
} | null;

export function isProductionAdmin(user?: ProductionUserLike): boolean {
  if (!user) return false;

  if (isAdminUser(user as any)) {
    return true;
  }

  if (hasAnyPermission(user as any, ['prod_orders', 'prod_bom', 'prod_defects'])) {
    return true;
  }

  const posName = (user.positionName || user.position || '').trim().toLowerCase();

  // Ban giám đốc
  if (posName.includes('giám đốc')) {
    return true;
  }

  return false;
}

export function canManageProdOrders(user?: ProductionUserLike): boolean {
  if (!user) return false;
  return isAdminUser(user as any) || hasPermission(user as any, 'prod_orders');
}

export function canManageProdBom(user?: ProductionUserLike): boolean {
  if (!user) return false;
  return isAdminUser(user as any) || hasPermission(user as any, 'prod_bom');
}

export function canManageProdDefects(user?: ProductionUserLike): boolean {
  if (!user) return false;
  return isAdminUser(user as any) || hasPermission(user as any, 'prod_defects');
}
