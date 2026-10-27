// Service quản lý người dùng và phân quyền (User Access Control Service)

export interface UserItem {
  id: number;
  name: string;
  email: string;
  avatarText?: string;
  avatarColor?: string;
  systemRole: 'admin' | 'employee';
  department?: string;
  position?: string;
  phone?: string;
  status: 'active' | 'inactive';
}

export interface UserPermissionDetail {
  user: UserItem;
  systemRole: 'admin' | 'employee';
  permissions: Record<string, boolean>;
  departments: Record<string, 'none' | 'view' | 'full'>;
}

export interface SystemPermission {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  sortOrder: number;
}


export const userService = {
  // Lấy danh sách người dùng
  async getUsers(search?: string, role?: string): Promise<UserItem[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (role && role !== 'all') params.append('role', role);
      const res = await fetch(`/api/users?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.error('Error fetching users:', err);
    }
    return [];
  },

  // Lấy thông tin chi tiết và ma trận quyền của người dùng
  async getUserPermissions(userId: number): Promise<UserPermissionDetail | null> {
    try {
      const res = await fetch(`/api/users/${userId}/permissions`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(`Error fetching user ${userId} permissions:`, err);
    }
    return null;
  },

  // Cập nhật vai trò hệ thống (Nhân viên / Quản trị viên)
  async updateSystemRole(userId: number, systemRole: 'admin' | 'employee'): Promise<boolean> {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemRole }),
      });
      return res.ok;
    } catch (err) {
      console.error('Error updating system role:', err);
      return false;
    }
  },

  // Bật/tắt 1 quyền chức năng
  async updatePermission(userId: number, permissionId: string, isGranted: boolean): Promise<boolean> {
    try {
      const res = await fetch(`/api/users/${userId}/permission`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionId, isGranted }),
      });
      return res.ok;
    } catch (err) {
      console.error('Error updating permission:', err);
      return false;
    }
  },

  // Cập nhật mức độ truy cập phòng ban
  async updateDepartmentAccess(userId: number, departmentId: string, accessLevel: 'none' | 'view' | 'full'): Promise<boolean> {
    try {
      const res = await fetch(`/api/users/${userId}/department-access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId, accessLevel }),
      });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('decodoor_dept_access_updated', {
              detail: { userId, departmentId, accessLevel },
            })
          );
        }
      }
      return res.ok;
    } catch (err) {
      console.error('Error updating department access:', err);
      return false;
    }
  },

  // Lấy danh mục 10 quyền hệ thống từ DB
  async getSystemPermissions(): Promise<SystemPermission[]> {
    try {
      const res = await fetch('/api/permissions');
      if (res.ok) return await res.json();
    } catch (err) {
      console.error('Error fetching permissions from DB:', err);
    }
    return [];
  },

  // Tạo người dùng mới trong DB
  async createUser(data: Partial<UserItem>): Promise<{ success: boolean; id?: number }> {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error('Error creating user:', err);
    }
    return { success: false };
  },

  // Cập nhật thông tin người dùng trong DB
  async updateUser(id: number, data: Partial<UserItem>): Promise<boolean> {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch (err) {
      console.error('Error updating user:', err);
      return false;
    }
  },

  // Xóa người dùng khỏi DB
  async deleteUser(id: number): Promise<boolean> {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.error('Error deleting user:', err);
      return false;
    }
  }
};

