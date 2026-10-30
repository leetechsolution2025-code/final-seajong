/**
 * Production Permission Helper
 * Quy định phân quyền trong hệ thống Quản trị sản xuất:
 * - Chỉ Quản trị viên (ADMIN/SUPERADMIN/GIÁM ĐỐC) và tài khoản Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền:
 *   + Xây dựng định mức (BOM): Tạo, sửa, xoá định mức, cập nhật thành phần vật tư
 *   + Báo cáo hoàn thành lệnh sản xuất: Xác nhận hoàn thành lệnh sản xuất
 *   + Tạo yêu cầu sản xuất: Tạo lệnh/yêu cầu sản xuất mới
 *   + Tạo hồ sơ lỗi và xử lý hàng lỗi, hàng trả về: Tạo mới hồ sơ lỗi, quyết định phương án xử lý, xoá hồ sơ lỗi
 * - Các tài khoản nhân viên sản xuất, công nhân, thợ... chỉ có quyền xem dữ liệu (Read-only).
 */

export function isProductionAdmin(user?: {
  role?: string | null;
  positionName?: string | null;
  position?: string | null;
  levelOrder?: number | null;
} | null): boolean {
  if (!user) return true; // Cho phép mặc định khi dev/demo nếu chưa truyền user, hoặc kiểm tra role

  const role = (user.role || '').toUpperCase();
  if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'DIRECTOR' || role === 'MANAGER') {
    return true;
  }

  const posName = (user.positionName || user.position || '').trim().toLowerCase();

  // Ban giám đốc
  if (posName.includes('giám đốc')) {
    return true;
  }

  // Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng, Quản lý sản xuất, Trưởng xưởng
  if (
    posName.includes('quản đốc') ||
    posName.includes('trưởng bộ phận') ||
    posName.includes('trưởng phòng') ||
    posName.includes('quản lý sản xuất') ||
    posName.includes('trưởng xưởng')
  ) {
    if (!posName.includes('phó') && !posName.includes('nhân viên') && !posName.includes('học việc')) {
      return true;
    }
  }

  // Cấp bậc lãnh đạo cao trong tổ chức (levelOrder <= 2)
  if (user.levelOrder !== undefined && user.levelOrder !== null && user.levelOrder <= 2) {
    return true;
  }

  return false;
}

