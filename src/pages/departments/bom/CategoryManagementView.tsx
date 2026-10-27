import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Folder,
  Shield,
  CreditCard,
  ChatDots,
  FileText,
  BoxSeam,
  Plus,
  PencilSquare,
  Trash2,
  Search,
  Mic,
  House,
  Buildings,
  ChevronRight,
  ChevronDown,
  ArrowReturnRight
} from 'react-bootstrap-icons';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { categoryService, type CategoryItem, type CategoryType } from '../../../services/categoryService';

export type ThemeMode = 'light' | 'dark';

export interface CategoryManagementViewProps {
  theme?: ThemeMode;
  user?: any;
  onToggleTheme?: () => void;
  onChangeTheme?: (newTheme: ThemeMode) => void;
  onCompanyInfo?: () => void;
  onDataManagement?: () => void;
  onLogout?: () => void;
  onSelectDepartment?: (deptId: string) => void;
  activeDepartmentId?: string;
  navGroups?: any[];
  activeNavId?: string;
  onSelectNav?: (id: string) => void;
  pageHeader?: React.ReactNode;
  headerActions?: React.ReactNode;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const CategoryManagementView: React.FC<CategoryManagementViewProps> = ({
  theme,
  user,
  onToggleTheme,
  onChangeTheme,
  onCompanyInfo,
  onDataManagement,
  onLogout,
  onSelectDepartment,
  activeDepartmentId,
  navGroups,
  activeNavId,
  onSelectNav,
  pageHeader,
  headerActions,
  onShowToast,
}) => {
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [typeSearchQuery, setTypeSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Modal tạo/sửa Loại danh mục (Cột trái)
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [formTypeName, setFormTypeName] = useState('');
  const [formTypeId, setFormTypeId] = useState('');
  const [isCustomId, setIsCustomId] = useState(false);
  const [formTypeIcon, setFormTypeIcon] = useState('folder');

  // Hàm chuyển đổi tiếng Việt có dấu thành mã định danh slug không dấu
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  // Tự động kiểm tra và sinh mã không trùng lặp
  const getUniqueTypeId = (name: string, existingTypes: CategoryType[]): string => {
    const baseSlug = generateSlug(name);
    if (!baseSlug) return '';
    let slug = baseSlug;
    let counter = 1;
    while (existingTypes.some((t) => t.id.toLowerCase() === slug.toLowerCase())) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  };

  // Modal tạo/sửa Item danh mục (Cột phải)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null);
  const [formItemName, setFormItemName] = useState('');
  const [formItemCode, setFormItemCode] = useState('');
  const [isCustomItemCode, setIsCustomItemCode] = useState(false);
  const [formItemParentId, setFormItemParentId] = useState<string>(''); // '' = root
  const [formItemOrder, setFormItemOrder] = useState<number>(1);
  const [formItemStatus, setFormItemStatus] = useState<'active' | 'hidden'>('active');
  const [formItemIcon, setFormItemIcon] = useState<'home' | 'building' | 'folder' | 'generic'>('folder');

  // Trạng thái mở rộng/thu gọn của cây thư mục (Set các item id)
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());

  // Tải danh sách category types từ CSDL
  const fetchTypes = async () => {
    try {
      const types = await categoryService.getTypes();
      const sortedTypes = [...types].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' })
      );
      setCategoryTypes(sortedTypes);
      if (sortedTypes.length > 0) {
        // Nếu chưa chọn hoặc id đã chọn không tồn tại thì chọn type đầu tiên
        if (!selectedTypeId || !sortedTypes.some(t => t.id === selectedTypeId)) {
          setSelectedTypeId(sortedTypes[0].id);
        }
      } else {
        setSelectedTypeId('');
        setItems([]);
      }
    } catch (e) {
      console.error('Failed to load category types', e);
    }
  };

  // Tải items của loại danh mục đang chọn từ CSDL
  const fetchItems = async (typeId: string) => {
    if (!typeId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await categoryService.getItems(typeId);
      setItems(data);

      // Tự động mở rộng các danh mục cha có danh mục con
      const parentIdsWithChildren = new Set<string | number>();
      data.forEach((item) => {
        if (item.parentId !== null && item.parentId !== undefined && String(item.parentId).trim() !== '') {
          parentIdsWithChildren.add(String(item.parentId));
        }
      });
      setExpandedIds(parentIdsWithChildren);
    } catch (e) {
      console.error('Failed to load items', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    if (selectedTypeId) {
      fetchItems(selectedTypeId);
    } else {
      setItems([]);
    }
  }, [selectedTypeId]);

  // Nhóm danh mục đang được chọn
  const selectedType = useMemo(() => {
    return categoryTypes.find((t) => t.id === selectedTypeId) || null;
  }, [categoryTypes, selectedTypeId]);

  // Lọc danh mục cha theo từ khóa tìm kiếm và sắp xếp theo vần ABC tiếng Việt
  const filteredCategoryTypes = useMemo(() => {
    const list = typeSearchQuery.trim()
      ? categoryTypes.filter((t) =>
          t.name.toLowerCase().includes(typeSearchQuery.toLowerCase())
        )
      : [...categoryTypes];
    return list.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' })
    );
  }, [categoryTypes, typeSearchQuery]);

  // Tính toán số lượng mục danh mục
  const totalCount = items.length;

  // Gom nhóm danh mục con theo parentId (childrenMap)
  const childrenMap = useMemo(() => {
    const map = new Map<string, CategoryItem[]>();
    items.forEach((item) => {
      const pId = item.parentId !== null && item.parentId !== undefined && String(item.parentId).trim() !== ''
        ? String(item.parentId)
        : null;
      if (pId !== null) {
        const existing = map.get(pId) || [];
        existing.push(item);
        map.set(pId, existing);
      }
    });
    // Sắp xếp các danh mục con theo thứ tự
    map.forEach((list) => {
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.name || '').localeCompare(b.name || ''));
    });
    return map;
  }, [items]);

  // Danh mục gốc (Cấp 0 - Không có cha hoặc parentId không có trong danh sách)
  const rootItems = useMemo(() => {
    const itemIds = new Set(items.map((i) => String(i.id)));
    return items
      .filter((item) => {
        const pId = item.parentId !== null && item.parentId !== undefined && String(item.parentId).trim() !== ''
          ? String(item.parentId)
          : null;
        return pId === null || !itemIds.has(pId);
      })
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.name || '').localeCompare(b.name || ''));
  }, [items]);

  // Tìm kiếm theo từ khóa: Giữ lại các mục khớp và các nút cha dẫn đến chúng
  const matchingAndAncestorIds = useMemo(() => {
    if (!itemSearchQuery.trim()) return null;
    const query = itemSearchQuery.toLowerCase().trim();
    const itemById = new Map<string, CategoryItem>();
    items.forEach((it) => itemById.set(String(it.id), it));

    const matchedIds = new Set<string>();
    const ancestorIds = new Set<string>();

    items.forEach((it) => {
      if (it.name.toLowerCase().includes(query) || (it.code && it.code.toLowerCase().includes(query))) {
        matchedIds.add(String(it.id));
        let curr = it;
        while (curr.parentId && itemById.has(String(curr.parentId))) {
          const parent = itemById.get(String(curr.parentId))!;
          ancestorIds.add(String(parent.id));
          curr = parent;
        }
      }
    });

    return { matchedIds, ancestorIds };
  }, [items, itemSearchQuery]);

  // Cấu trúc phẳng để hiển thị cây thư mục (FlatTreeItem)
  interface FlatTreeItem {
    id: string | number;
    item: CategoryItem;
    level: number;
    hasChildren: boolean;
    childCount: number;
    isExpanded: boolean;
  }

  const flatTreeItems = useMemo(() => {
    const result: FlatTreeItem[] = [];
    const visited = new Set<string>();

    const traverse = (itemList: CategoryItem[], level: number) => {
      itemList.forEach((item) => {
        const strId = String(item.id);
        if (visited.has(strId)) return; // Tránh lặp vô hạn
        visited.add(strId);

        const children = childrenMap.get(strId) || [];
        const hasChildren = children.length > 0;

        if (matchingAndAncestorIds) {
          const isDirectMatch = matchingAndAncestorIds.matchedIds.has(strId);
          const isAncestor = matchingAndAncestorIds.ancestorIds.has(strId);
          if (!isDirectMatch && !isAncestor) {
            return;
          }
        }

        const isExpanded = matchingAndAncestorIds
          ? true
          : expandedIds.has(item.id) || expandedIds.has(strId);

        result.push({
          id: item.id,
          item,
          level,
          hasChildren,
          childCount: children.length,
          isExpanded,
        });

        if (hasChildren && isExpanded) {
          traverse(children, level + 1);
        }
      });
    };

    traverse(rootItems, 0);
    return result;
  }, [rootItems, childrenMap, expandedIds, matchingAndAncestorIds]);

  // Đóng/mở 1 nhánh cây thư mục
  const toggleExpand = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    const strId = String(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id) || next.has(strId)) {
        next.delete(id);
        next.delete(strId);
      } else {
        next.add(id);
        next.add(strId);
      }
      return next;
    });
  };

  // Lấy toàn bộ danh sách ID hậu duệ (con, cháu, chắt...) để ngăn chọn chính nó hoặc con nó làm cha
  const getDescendantIds = (targetId: string): Set<string> => {
    const desc = new Set<string>();
    const stack = [targetId];
    while (stack.length > 0) {
      const curr = stack.pop()!;
      const children = childrenMap.get(curr) || [];
      children.forEach((c) => {
        const cId = String(c.id);
        if (!desc.has(cId)) {
          desc.add(cId);
          stack.push(cId);
        }
      });
    }
    return desc;
  };

  // Danh sách các lựa chọn danh mục cha cho Select
  const parentSelectOptions = useMemo(() => {
    const forbiddenIds = new Set<string>();
    if (editingItem) {
      const editId = String(editingItem.id);
      forbiddenIds.add(editId);
      getDescendantIds(editId).forEach((id) => forbiddenIds.add(id));
    }

    const options: { value: string; label: string }[] = [
      { value: '', label: '📂 [Cấp cao nhất - Không có danh mục cha]' },
    ];

    const buildOptions = (list: CategoryItem[], level: number) => {
      list.forEach((item) => {
        const strId = String(item.id);
        if (forbiddenIds.has(strId)) return;
        const prefix = level > 0 ? `${'  '.repeat(level)}└─ ` : '';
        options.push({
          value: String(item.id),
          label: `${prefix}${item.name}`,
        });
        const children = childrenMap.get(strId) || [];
        if (children.length > 0) {
          buildOptions(children, level + 1);
        }
      });
    };

    buildOptions(rootItems, 0);
    return options;
  }, [items, rootItems, childrenMap, editingItem]);

  // Kiểm tra mã định danh có bị trùng với loại danh mục đã có không
  const isDuplicateId = useMemo(() => {
    if (!formTypeId.trim()) return false;
    return categoryTypes.some((t) => t.id.toLowerCase() === formTypeId.trim().toLowerCase());
  }, [formTypeId, categoryTypes]);

  // Tự động kiểm tra và sinh mã định danh không trùng cho mục con
  const getUniqueItemCode = (name: string, currentItems: CategoryItem[], currentId?: string | number): string => {
    const baseSlug = generateSlug(name);
    if (!baseSlug) return '';
    let slug = baseSlug;
    let counter = 1;
    while (currentItems.some((it) => it.id !== currentId && (it.code || '').toLowerCase() === slug.toLowerCase())) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  };

  // Kiểm tra mã định danh mục con có bị trùng không
  const isDuplicateItemCode = useMemo(() => {
    if (!formItemCode.trim()) return false;
    const targetCode = formItemCode.trim().toLowerCase();
    return items.some((it) => {
      if (editingItem && it.id === editingItem.id) return false;
      return (it.code || '').toLowerCase() === targetCode;
    });
  }, [formItemCode, items, editingItem]);

  // Xử lý khi người dùng nhập tên mục danh mục -> Tự động sinh mã định danh nếu chưa gõ thủ công
  const handleItemNameChange = (val: string) => {
    setFormItemName(val);
    if (!isCustomItemCode && !editingItem) {
      setFormItemCode(getUniqueItemCode(val, items));
    }
  };

  // Xử lý khi người dùng nhập tên loại danh mục -> Tự động sinh mã không trùng
  const handleTypeNameChange = (val: string) => {
    setFormTypeName(val);
    if (!isCustomId) {
      const autoSlug = getUniqueTypeId(val, categoryTypes);
      setFormTypeId(autoSlug);
    }
  };

  // Mở modal tạo loại danh mục mới
  const handleOpenCreateTypeModal = () => {
    setFormTypeName('');
    setFormTypeId('');
    setIsCustomId(false);
    setFormTypeIcon('folder');
    setIsTypeModalOpen(true);
  };

  // Lưu loại danh mục mới vào CSDL
  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTypeName.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên loại danh mục.');
      return;
    }

    const typeId = formTypeId.trim()
      ? formTypeId.trim().toLowerCase().replace(/\s+/g, '-')
      : getUniqueTypeId(formTypeName, categoryTypes);

    if (isDuplicateId) {
      if (onShowToast) onShowToast('error', 'Trùng mã định danh', `Mã "${typeId}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    const newType: CategoryType = {
      id: typeId,
      name: formTypeName.trim(),
      icon: formTypeIcon,
      iconBg: 'rgba(91, 92, 226, 0.12)',
      iconColor: '#5b5ce2',
      sortOrder: categoryTypes.length + 1,
    };

    try {
      const res = await categoryService.createType(newType);
      if (!res.success) {
        throw new Error('Lưu loại danh mục thất bại');
      }
      if (onShowToast) onShowToast('success', 'Thành công', `Đã tạo nhóm danh mục "${formTypeName.trim()}".`);
      setIsTypeModalOpen(false);
      setSelectedTypeId(typeId);
      await fetchTypes();
    } catch (err) {
      console.error(err);
      if (onShowToast) onShowToast('error', 'Lỗi lưu dữ liệu', 'Không thể lưu vào CSDL backend. Vui lòng thử lại.');
    }
  };

  // Xóa loại danh mục
  const handleDeleteType = async (typeId: string, typeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhóm "${typeName}" cùng toàn bộ dữ liệu bên trong không?`)) {
      return;
    }

    try {
      const res = await categoryService.deleteType(typeId);
      if (!res.success) throw new Error('Xóa thất bại');
      if (onShowToast) onShowToast('info', 'Đã xóa', `Đã xóa nhóm danh mục "${typeName}".`);
      await fetchTypes();
    } catch (err) {
      console.error(err);
      if (onShowToast) onShowToast('error', 'Lỗi xóa', 'Không thể xóa nhóm khỏi CSDL.');
    }
  };

  // Mở modal tạo mục cấp cao nhất (Root item)
  const handleOpenCreateItemModal = () => {
    if (!selectedType) {
      if (onShowToast) onShowToast('warning', 'Chưa chọn loại danh mục', 'Vui lòng tạo hoặc chọn một loại danh mục trước.');
      return;
    }
    setEditingItem(null);
    setFormItemName('');
    setFormItemCode('');
    setIsCustomItemCode(false);
    setFormItemParentId('');
    setFormItemOrder(rootItems.length + 1);
    setFormItemStatus('active');
    setFormItemIcon(selectedTypeId === 'workplaces' ? 'building' : 'folder');
    setIsItemModalOpen(true);
  };

  // Mở modal tạo danh mục con trực tiếp dưới 1 mục cha
  const handleOpenCreateChildItemModal = (parentItem: CategoryItem) => {
    if (!selectedType) return;
    setEditingItem(null);
    setFormItemName('');
    setFormItemCode('');
    setIsCustomItemCode(false);
    setFormItemParentId(String(parentItem.id));
    const childList = childrenMap.get(String(parentItem.id)) || [];
    setFormItemOrder(childList.length + 1);
    setFormItemStatus('active');
    setFormItemIcon(parentItem.iconType || 'folder');
    setIsItemModalOpen(true);
  };

  // Mở modal chỉnh sửa mục
  const handleOpenEditItemModal = (item: CategoryItem) => {
    setEditingItem(item);
    setFormItemName(item.name);
    setFormItemCode(item.code || '');
    setIsCustomItemCode(Boolean(item.code));
    setFormItemParentId(item.parentId ? String(item.parentId) : '');
    setFormItemOrder(item.sortOrder);
    setFormItemStatus(item.status);
    setFormItemIcon(item.iconType || 'folder');
    setIsItemModalOpen(true);
  };

  // Lưu mục con vào CSDL (Create / Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemName.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên danh mục.');
      return;
    }

    if (isDuplicateItemCode) {
      if (onShowToast) onShowToast('error', 'Trùng mã định danh', `Mã định danh "${formItemCode.trim()}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    const parentIdVal = formItemParentId.trim() ? formItemParentId.trim() : null;

    try {
      if (editingItem) {
        const res = await categoryService.updateItem(editingItem.id, {
          name: formItemName.trim(),
          code: formItemCode.trim() || undefined,
          parentId: parentIdVal,
          sortOrder: Number(formItemOrder),
          status: formItemStatus,
          iconType: formItemIcon,
        });
        if (!res.success) throw new Error('Cập nhật thất bại');
        if (onShowToast) onShowToast('success', 'Thành công', 'Đã cập nhật mục danh mục.');
      } else {
        const res = await categoryService.createItem({
          typeId: selectedTypeId,
          parentId: parentIdVal,
          code: formItemCode.trim() || undefined,
          name: formItemName.trim(),
          sortOrder: Number(formItemOrder),
          status: formItemStatus,
          iconType: formItemIcon,
        });
        if (!res.success) throw new Error('Thêm mới thất bại');
        if (onShowToast) onShowToast('success', 'Thành công', `Đã thêm mới danh mục vào ${selectedType?.name}.`);

        // Đảm bảo nhánh cha được mở rộng nếu vừa tạo mục con
        if (parentIdVal) {
          setExpandedIds((prev) => new Set([...prev, parentIdVal, String(parentIdVal)]));
        }
      }

      await fetchItems(selectedTypeId);
      await fetchTypes();
      setIsItemModalOpen(false);
    } catch (err) {
      console.error(err);
      if (onShowToast) onShowToast('error', 'Lỗi lưu dữ liệu', 'Không thể kết nối với CSDL backend.');
    }
  };

  // Xóa mục con khỏi CSDL (và toàn bộ các mục con bên dưới nếu có)
  const handleDeleteItem = async (item: CategoryItem, childCount: number = 0) => {
    let confirmMsg = `Bạn có chắc chắn muốn xóa "${item.name}" khỏi danh mục không?`;
    if (childCount > 0) {
      confirmMsg = `"${item.name}" đang có ${childCount} danh mục con trực thuộc.\n\nXóa danh mục này sẽ ĐỒNG THỜI XÓA TẤT CẢ các danh mục con bên trong theo phân cấp!\n\nBạn có chắc chắn muốn xóa không?`;
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      await categoryService.deleteItem(item.id);
      if (onShowToast) onShowToast('info', 'Đã xóa', `Đã xóa "${item.name}" thành công.`);
      await fetchItems(selectedTypeId);
      await fetchTypes();
    } catch (err) {
      console.error(err);
      if (onShowToast) onShowToast('error', 'Lỗi xóa', 'Không thể xóa bản ghi khỏi CSDL.');
    }
  };

  // Render icon con
  const renderItemIcon = (type?: string) => {
    switch (type) {
      case 'home':
        return <House size={18} style={{ color: '#4f46e5' }} />;
      case 'building':
        return <Buildings size={18} style={{ color: '#4f46e5' }} />;
      default:
        return <Folder size={18} style={{ color: '#4f46e5' }} />;
    }
  };

  // Render icon nhóm danh mục
  const renderTypeIcon = (iconName: string) => {
    switch (iconName) {
      case 'clock':
        return <Clock size={18} />;
      case 'shield':
        return <Shield size={18} />;
      case 'package':
        return <BoxSeam size={18} />;
      case 'message-circle':
        return <ChatDots size={18} />;
      case 'credit-card':
        return <CreditCard size={18} />;
      case 'file-text':
        return <FileText size={18} />;
      case 'building':
        return <Buildings size={18} />;
      default:
        return <Folder size={18} />;
    }
  };

  const renderLeftContent = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header cột trái */}
      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Các loại danh mục
        </div>
      </div>

      {/* Dòng tìm kiếm + Nút "+" trên cùng một dòng */}
      <div style={{ padding: '12px 14px 10px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            padding: '0 10px',
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: '8px' }} />
          <input
            type="text"
            value={typeSearchQuery}
            onChange={(e) => setTypeSearchQuery(e.target.value)}
            placeholder="Tìm loại danh mục..."
            style={{
              width: '100%',
              height: '36px',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
            }}
          />
          <Mic size={16} style={{ color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }} />
        </div>

        <button
          type="button"
          title="Thêm loại danh mục mới"
          onClick={handleOpenCreateTypeModal}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: '#5b5ce2',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(91, 92, 226, 0.35)',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Danh sách các loại danh mục */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 10px 14px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minHeight: 0,
        }}
      >
        {filteredCategoryTypes.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Chưa có loại danh mục nào. Hãy nhấn nút <strong>"+"</strong> ở trên để tạo nhóm danh mục đầu tiên của bạn.
          </div>
        ) : (
          filteredCategoryTypes.map((catType) => {
            const isSelected = catType.id === selectedTypeId;
            return (
              <div
                key={catType.id}
                onClick={() => setSelectedTypeId(catType.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(91, 92, 226, 0.1)' : 'transparent',
                  border: isSelected ? '1px solid rgba(91, 92, 226, 0.35)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: catType.iconBg || 'rgba(91, 92, 226, 0.12)',
                      color: catType.iconColor || '#5b5ce2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {renderTypeIcon(catType.icon)}
                  </div>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? '#5b5ce2' : 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {catType.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#5b5ce2',
                        backgroundColor: 'rgba(91, 92, 226, 0.15)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        flexShrink: 0,
                      }}
                    >
                      {totalCount}
                    </span>
                  )}

                  <button
                    type="button"
                    title="Xóa nhóm danh mục"
                    onClick={(e) => handleDeleteType(catType.id, catType.name, e)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: isSelected ? 1 : 0.4,
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderRightContent = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header cột phải */}
      <div
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {selectedType?.name || 'Chi tiết danh mục'}
        </div>
      </div>

      {/* Dòng tìm kiếm + Nút "+ Thêm mới" trên cùng một dòng */}
      <div style={{ padding: '12px 20px 14px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            padding: '0 12px',
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: '8px' }} />
          <input
            type="text"
            disabled={!selectedType}
            value={itemSearchQuery}
            onChange={(e) => setItemSearchQuery(e.target.value)}
            placeholder={selectedType ? `Tìm trong ${selectedType.name.toLowerCase()}...` : 'Vui lòng chọn loại danh mục...'}
            style={{
              width: '100%',
              height: '36px',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
            }}
          />
          <Mic size={16} style={{ color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }} />
        </div>

        <button
          type="button"
          disabled={!selectedType}
          onClick={handleOpenCreateItemModal}
          style={{
            height: '36px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: selectedType ? '#5b5ce2' : 'var(--text-muted)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0 16px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: selectedType ? 'pointer' : 'not-allowed',
            boxShadow: selectedType ? '0 2px 6px rgba(91, 92, 226, 0.35)' : 'none',
            transition: 'all var(--transition-fast)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Plus size={16} />
          <span>Thêm mới</span>
        </button>
      </div>

      {/* Bảng danh sách chi tiết */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '0 20px 20px 20px', minHeight: 0, minWidth: 0 }}>
        <div
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            minWidth: '560px',
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1fr) 140px 65px 95px 95px',
              padding: '10px 16px',
              backgroundColor: 'var(--bg-surface-2)',
              borderBottom: '1px solid var(--border-default)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <div>Tên danh mục</div>
            <div>Mã định danh</div>
            <div style={{ textAlign: 'center' }}>Thứ tự</div>
            <div style={{ textAlign: 'center' }}>Trạng thái</div>
            <div style={{ textAlign: 'right' }}>Thao tác</div>
          </div>

          {/* Table Body - Hiển thị dạng Cây thư mục đa cấp (Tree View) */}
          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Đang tải dữ liệu từ CSDL...
            </div>
          ) : !selectedType ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Vui lòng tạo hoặc chọn một loại danh mục từ cột bên trái để quản lý các nội dung chi tiết.
            </div>
          ) : flatTreeItems.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {itemSearchQuery.trim()
                ? `Không tìm thấy mục nào khớp với từ khóa "${itemSearchQuery}".`
                : `Chưa có dữ liệu nào trong danh mục "${selectedType.name}". Bạn hãy nhấn nút "+ Thêm mới" ở góc trên bên phải để bắt đầu nhập.`}
            </div>
          ) : (
            flatTreeItems.map((treeItem, index) => {
              const { item, level, hasChildren, childCount, isExpanded } = treeItem;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(180px, 1fr) 140px 65px 95px 95px',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: index < flatTreeItems.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    backgroundColor:
                      level > 0
                        ? index % 2 === 0
                          ? 'rgba(91, 92, 226, 0.02)'
                          : 'rgba(0, 0, 0, 0.02)'
                        : index % 2 === 0
                        ? 'transparent'
                        : 'rgba(0, 0, 0, 0.01)',
                    transition: 'background-color var(--transition-fast)',
                  }}
                >
                  {/* Cột 1: Tên danh mục (Hỗ trợ phân cấp thụt đầu dòng + nút thu/mở) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      paddingLeft: `${level * 22}px`,
                      minWidth: 0,
                    }}
                  >
                    {/* Nút toggle mở rộng/thu gọn nếu có con, hoặc icon góc nối cấp */}
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(item.id, e)}
                        title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          padding: 0,
                        }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    ) : (
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: 'var(--text-muted)',
                          opacity: level > 0 ? 0.6 : 0,
                        }}
                      >
                        {level > 0 && <ArrowReturnRight size={12} />}
                      </div>
                    )}

                    {/* Icon biểu diễn danh mục */}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      {renderItemIcon(item.iconType)}
                    </div>

                    {/* Tên danh mục */}
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: level === 0 ? 600 : 500,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </span>

                    {/* Badge đếm số lượng danh mục con */}
                    {hasChildren && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#5b5ce2',
                          backgroundColor: 'rgba(91, 92, 226, 0.12)',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          flexShrink: 0,
                          marginLeft: '4px',
                        }}
                      >
                        {childCount} con
                      </span>
                    )}
                  </div>

                  {/* Cột 2: Mã định danh */}
                  <div style={{ minWidth: 0, paddingRight: '8px' }}>
                    {item.code ? (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          color: '#5b5ce2',
                          backgroundColor: 'rgba(91, 92, 226, 0.08)',
                          border: '1px solid rgba(91, 92, 226, 0.2)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.code}
                      >
                        {item.code}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>
                    )}
                  </div>

                  {/* Cột 3: Thứ tự */}
                  <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {item.sortOrder}
                  </div>

                  {/* Cột 4: Trạng thái */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {item.status === 'active' ? (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#059669',
                          backgroundColor: '#d1fae5',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        Hoạt động
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#dc2626',
                          backgroundColor: '#fee2e2',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        Đang ẩn
                      </span>
                    )}
                  </div>

                  {/* Cột 4: Thao tác (Thêm con +, Sửa, Xóa) */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      type="button"
                      title="Thêm danh mục con trực thuộc"
                      onClick={() => handleOpenCreateChildItemModal(item)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(91, 92, 226, 0.3)',
                        backgroundColor: 'rgba(91, 92, 226, 0.08)',
                        color: '#5b5ce2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      type="button"
                      title="Chỉnh sửa"
                      onClick={() => handleOpenEditItemModal(item)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-2)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <PencilSquare size={13} />
                    </button>
                    <button
                      type="button"
                      title="Xóa"
                      onClick={() => handleDeleteItem(item, childCount)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal 1: Thêm loại danh mục mới (Cột trái) */}
      <Modal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        title="Thêm loại danh mục mới"
        description="Định nghĩa loại danh mục dùng chung mới cho toàn hệ thống Deco Door"
        maxWidth="480px"
        isStatic={true}
      >
        <form onSubmit={handleSaveType} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Tên loại danh mục"
            required
            value={formTypeName}
            onChange={(e) => handleTypeNameChange(e.target.value)}
            placeholder="VD: Địa điểm làm việc, Ca làm việc..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Mã định danh"
              required
              value={formTypeId}
              onChange={(e) => {
                setIsCustomId(true);
                setFormTypeId(e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }}
              placeholder="VD: dia-diem-lam-viec"
              error={isDuplicateId ? 'Mã này đã tồn tại trong hệ thống!' : undefined}
              helperText={!isDuplicateId && formTypeId.trim() ? '✓ Mã tự sinh hợp lệ (không trùng)' : undefined}
            />

            <Select
              label="Biểu tượng đại diện"
              value={formTypeIcon}
              onChange={(e) => setFormTypeIcon(e.target.value)}
              options={[
                { value: 'folder', label: 'Thư mục (📁)' },
                { value: 'building', label: 'Tòa nhà / Văn phòng (🏢)' },
                { value: 'clock', label: 'Đồng hồ / Ca kíp (⏰)' },
                { value: 'shield', label: 'Khiên bảo vệ / Bảo hiểm (🛡️)' },
                { value: 'package', label: 'Kiện hàng / Đơn vị (📦)' },
                { value: 'credit-card', label: 'Thẻ thanh toán (💳)' },
                { value: 'file-text', label: 'Văn bản / Chi phí (📑)' },
                { value: 'message-circle', label: 'Tin nhắn / Chăm sóc (💬)' },
              ]}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsTypeModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={isDuplicateId || !formTypeName.trim()}>
              Tạo loại danh mục
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Thêm mới / Sửa danh mục con (Cột phải) */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Chỉnh sửa mục danh mục' : `Thêm mới vào "${selectedType?.name}"`}
        description="Điền thông tin danh mục chi tiết để lưu trữ vào cơ sở dữ liệu hệ thống"
        maxWidth="520px"
        isStatic={true}
      >
        <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Tên danh mục"
              required
              value={formItemName}
              onChange={(e) => handleItemNameChange(e.target.value)}
              placeholder="VD: Tòa nhà CT3, Xưởng CNC 01..."
            />

            <Input
              label="Mã định danh"
              value={formItemCode}
              onChange={(e) => {
                setIsCustomItemCode(true);
                setFormItemCode(e.target.value);
              }}
              placeholder="VD: phong-ky-thuat, PB-01..."
              error={isDuplicateItemCode ? 'Mã này đã tồn tại trong danh mục!' : undefined}
              helperText={!isDuplicateItemCode && formItemCode.trim() ? '✓ Mã hợp lệ' : undefined}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Thuộc danh mục cha"
              value={formItemParentId}
              onChange={(e) => setFormItemParentId(e.target.value)}
              options={parentSelectOptions}
            />

            <Select
              label="Biểu tượng"
              value={formItemIcon}
              onChange={(e) => setFormItemIcon(e.target.value as any)}
              options={[
                { value: 'folder', label: 'Thư mục chung (📁)' },
                { value: 'building', label: 'Tòa nhà văn phòng (🏢)' },
                { value: 'home', label: 'KCN / Xưởng SX (🏠)' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Thứ tự hiển thị"
              type="number"
              required
              value={formItemOrder.toString()}
              onChange={(e) => setFormItemOrder(parseInt(e.target.value) || 1)}
            />

            <Select
              label="Trạng thái"
              value={formItemStatus}
              onChange={(e) => setFormItemStatus(e.target.value as 'active' | 'hidden')}
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'hidden', label: 'Đang ẩn' },
              ]}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsItemModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={isDuplicateItemCode || !formItemName.trim()}>
              {editingItem ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '3.2fr 8.8fr',
        gap: '16px',
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        minWidth: 0,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="split-card-item split-card-left"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
          height: '100%',
          backgroundColor: 'var(--bg-surface-1)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {renderLeftContent()}
      </div>
      <div
        className="split-card-item split-card-right"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
          height: '100%',
          backgroundColor: 'var(--bg-surface-1)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {renderRightContent()}
      </div>
    </div>
  );
};
