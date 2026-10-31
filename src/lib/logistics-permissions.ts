import { hasPermission } from './permissions';

/**
 * Logistics Permission Helper
 * Căn cứ theo quyền hạn đã cấp cho tài khoản trên trang Phân quyền người dùng:
 * - logistics_assign: Điều phối & giao việc kho (Thủ kho / Quản trị)
 * - logistics_in_out: Thực hiện xuất / nhập & kiểm kho
 * - logistics_picking: Cấp phát vật tư & gom hàng
 * - logistics_print: In phiếu kho & in tem nhiệt
 */

export type LogisticsUserLike = {
  role?: string | null;
  permissions?: string[] | string | null;
  positionName?: string | null;
  position?: string | null;
  levelOrder?: number | null;
  employee?: {
    position?: string | null;
    positionName?: string | null;
  } | null;
} | null;

export function isLogisticsAdmin(user?: LogisticsUserLike): boolean {
  if (!user) return false;

  const role = (user.role || '').toUpperCase();
  if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'DIRECTOR') {
    return true;
  }

  if (hasPermission(user as any, 'logistics_assign')) {
    return true;
  }

  const posName = (
    user.positionName ||
    user.position ||
    user.employee?.positionName ||
    user.employee?.position ||
    ''
  )
    .trim()
    .toLowerCase();

  // Ban giám đốc
  if (posName.includes('giám đốc')) {
    return true;
  }

  // Thủ kho chính thức: có chữ "thủ kho", "trưởng kho", "quản lý kho"
  // VÀ KHÔNG CHỨA "phụ", "nhân viên"
  if (
    (posName.includes('thủ kho') || posName.includes('trưởng kho') || posName.includes('quản lý kho')) &&
    !posName.includes('phụ') &&
    !posName.includes('nhân viên')
  ) {
    return true;
  }

  // Cấp bậc lãnh đạo cao (levelOrder <= 2: 1 = Cấp 1, 2 = Cấp 2)
  if (user.levelOrder !== undefined && user.levelOrder !== null && user.levelOrder <= 2) {
    return true;
  }

  return false;
}

/**
 * Quyền điều phối & giao việc kho (logistics_assign)
 */
export function canAssignLogistics(user?: LogisticsUserLike): boolean {
  if (!user) return false;
  return isLogisticsAdmin(user) || hasPermission(user as any, 'logistics_assign');
}

/**
 * Quyền thực hiện xuất / nhập & kiểm kho (logistics_in_out)
 */
export function canExecuteInOut(user?: LogisticsUserLike): boolean {
  if (!user) return false;
  return isLogisticsAdmin(user) || hasPermission(user as any, 'logistics_in_out');
}

/**
 * Quyền cấp phát vật tư & gom hàng (logistics_picking)
 */
export function canPickAndPack(user?: LogisticsUserLike): boolean {
  if (!user) return false;
  return isLogisticsAdmin(user) || hasPermission(user as any, 'logistics_picking');
}

/**
 * Quyền in phiếu kho & in tem nhiệt (logistics_print)
 */
export function canPrintLogistics(user?: LogisticsUserLike): boolean {
  if (!user) return false;
  return isLogisticsAdmin(user) || hasPermission(user as any, 'logistics_print');
}
