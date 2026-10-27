// Service gọi API quản lý danh mục (Category Management)

export interface CategoryItem {
  id: string | number;
  typeId?: string;
  parentId?: string | number | null;
  code?: string;
  name: string;
  sortOrder: number;
  status: 'active' | 'hidden';
  iconType: 'home' | 'building' | 'folder' | 'generic';
  keeperName?: string;
  keeperPhone?: string;
  children?: CategoryItem[];
}

export interface CategoryType {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  sortOrder: number;
  itemCount?: number;
}

const API_BASE = '/api/categories';

export const categoryService = {
  // 1. Lấy danh sách loại danh mục (cột trái)
  async getTypes(): Promise<CategoryType[]> {
    try {
      const res = await fetch(`${API_BASE}/types`);
      if (res.ok) {
        const data: CategoryType[] = await res.json();
        return (data || []).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' })
        );
      }
    } catch (err) {
      console.warn('Could not fetch category types from API:', err);
    }
    return [];
  },

  // 2. Thêm loại danh mục mới
  async createType(type: CategoryType): Promise<{ success: boolean; id?: string }> {
    try {
      const res = await fetch(`${API_BASE}/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type),
      });
      if (res.ok) return await res.json();
      const errData = await res.json().catch(() => ({}));
      console.error('Server error creating type:', errData);
      return { success: false };
    } catch (err) {
      console.error('Error creating category type:', err);
      return { success: false };
    }
  },

  // 3. Cập nhật loại danh mục
  async updateType(id: string, type: Partial<CategoryType>): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/types/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type),
      });
      if (res.ok) return await res.json();
      return { success: false };
    } catch (err) {
      console.error('Error updating category type:', err);
      return { success: false };
    }
  },

  // 4. Xóa loại danh mục
  async deleteType(id: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/types/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) return await res.json();
      return { success: false };
    } catch (err) {
      console.error('Error deleting category type:', err);
      return { success: false };
    }
  },

  // 5. Lấy danh sách item con theo loại (cột phải)
  async getItems(typeId: string): Promise<CategoryItem[]> {
    try {
      const res = await fetch(`${API_BASE}/items?typeId=${encodeURIComponent(typeId)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Could not fetch items for ${typeId} from API:`, err);
    }
    return [];
  },

  // 6. Thêm item mới
  async createItem(item: Omit<CategoryItem, 'id'>): Promise<{ success: boolean; id?: string | number }> {
    try {
      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        const data = await res.json();
        window.dispatchEvent(new CustomEvent('decodoor_categories_updated', { detail: item }));
        return data;
      }
      return { success: false };
    } catch (err) {
      console.error('Error creating item:', err);
      return { success: false };
    }
  },

  // 7. Cập nhật item
  async updateItem(id: string | number, item: Partial<CategoryItem>): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        const data = await res.json();
        window.dispatchEvent(new CustomEvent('decodoor_categories_updated', { detail: { id, ...item } }));
        return data;
      }
      return { success: false };
    } catch (err) {
      console.error('Error updating item:', err);
      return { success: false };
    }
  },

  // 8. Xóa item
  async deleteItem(id: string | number): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        window.dispatchEvent(new CustomEvent('decodoor_categories_updated', { detail: { id } }));
        return data;
      }
      return { success: false };
    } catch (err) {
      console.error('Error deleting item:', err);
      return { success: false };
    }
  },
};
