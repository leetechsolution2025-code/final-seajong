/**
 * Logistics Permission Helper
 * Quy định phân quyền trong hệ thống Quản lý kho:
 * - Chỉ Thủ kho, Quản lý kho, Trưởng kho hoặc Quản trị viên (ADMIN/SUPERADMIN/GIÁM ĐỐC) mới có quyền:
 *   + Giao việc gom hàng / phân công việc (chọn checkbox, nút Giao việc)
 *   + Tạo, lưu, xác nhận phiếu Xuất kho, Nhập kho, Luân chuyển kho
 *   + Nhập kiểm kê số lượng thực tế trong Kiểm kho, cân bằng kho, tạo yêu cầu mua hàng
 *   + In báo cáo, xuất Excel dữ liệu kho
 *   + Thêm, sửa, xoá hàng hoá / danh mục tồn kho
 * - Các tài khoản Nhân viên kho, Phụ kho... chỉ có quyền xem dữ liệu (Read-only).
 */

export function isLogisticsAdmin(user?: {
  role?: string | null;
  positionName?: string | null;
  position?: string | null;
  levelOrder?: number | null;
} | null): boolean {
  if (!user) return false;

  const role = (user.role || "").toUpperCase();
  if (role === "SUPERADMIN" || role === "ADMIN" || role === "DIRECTOR") {
    return true;
  }

  const posName = (user.positionName || "").trim().toLowerCase();

  // Ban giám đốc
  if (posName.includes("giám đốc")) {
    return true;
  }

  // Thủ kho chính thức: có chữ "thủ kho", "trưởng kho", "quản lý kho"
  // VÀ KHÔNG CHỨA "phụ", "nhân viên"
  if (
    (posName.includes("thủ kho") || posName.includes("trưởng kho") || posName.includes("quản lý kho")) &&
    !posName.includes("phụ") &&
    !posName.includes("nhân viên")
  ) {
    return true;
  }

  // Cấp bậc lãnh đạo cao (levelOrder <= 2: 1 = Cấp 1, 2 = Cấp 2)
  if (user.levelOrder !== undefined && user.levelOrder !== null && user.levelOrder <= 2) {
    return true;
  }

  return false;
}
