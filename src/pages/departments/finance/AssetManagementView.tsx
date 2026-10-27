import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  ExclamationTriangle,
} from 'react-bootstrap-icons';
import {
  TableToolbar,
  type TableToolbarFilter,
} from '../../../components/common/TableToolbar';
import { Pagination } from '../../../components/common/Pagination';
import { FullWidthTable } from '../../../components/common/FullWidthTable';
import { DeleteButton } from '../../../components/common/DeleteButton';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Modal } from '../../../components/common/Modal';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import {
  DepartmentSelect,
  useDepartmentOptions,
  matchDepartment,
} from '../../../components/common/DepartmentSelect';
import { CashAssetsView } from './CashAssetsView';
import { AssetReportPrintModal } from './AssetReportPrintModal';
import { notifyFinanceUpdated, useFinanceRealtimeSync } from '../../../services/financeSyncService';

export interface AssetItem {
  id: string;
  code: string;
  name: string;
  category: 'machinery' | 'vehicle' | 'it_office' | 'workshop' | 'measuring';
  categoryLabel: string;
  originalPrice: number;
  residualValue: number;
  departmentKey?: string;
  department: string;
  status: 'active' | 'maintenance' | 'in_stock' | 'liquidated';
  statusLabel: string;
  serialNumber: string;
  purchasedDate: string;
  depreciationMonths?: number;
  depreciationStartDate?: string;
  maintenanceCycle?: string;
  warrantyExpireDate?: string;
  managerName?: string;
  notes?: string;
}

export interface AssetManagementViewProps {
  currentStep?: number;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

// Danh sach phong ban mac dinh chuan theo CSDL thuc te cua cong ty Seajong
export const DEFAULT_DB_DEPARTMENTS: string[] = [
  'Hội đồng quản trị',
  'Cổ đông công ty',
  'Ban giám đốc',
  'Bộ phận xử lý hồ sơ',
  'Phòng kinh doanh',
  'Phòng tài chính',
  'Bộ phận sản xuất',
  'Bộ phận thi công lắp dựng',
  'Bộ phận kho vận',
  'Phòng hành chính nhân sự',
];

// Danh muc nhan su theo phong ban (nap 100% tu DB)
export const DEFAULT_DEPARTMENT_STAFF: Record<string, string[]> = {};

// Ham dinh dang so phan tach hang nghin
const formatNumberGroup = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/\D/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
};

// Du lieu khoi tao mau chuan theo cac phong ban thuc te trong CSDL
export const INITIAL_ASSETS: AssetItem[] = [];

const FixedAssetsManagementView: React.FC<{ onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void }> = ({ onShowToast }) => {
  const [assets, setAssets] = useState<AssetItem[]>(INITIAL_ASSETS);
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const { options: deptFilterOptions } = useDepartmentOptions({ includeAll: true });

  // Danh sach phong ban thuc te tu CSDL
  const [dbDepartments, setDbDepartments] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: number | string; name: string; department?: string; position?: string }>>([]);

  // Phan trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [viewingAsset, setViewingAsset] = useState<AssetItem | null>(null);

  // Confirm Delete Dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<AssetItem | null>(null);

  // Confirm Liquidate Dialog
  const [liquidateConfirmOpen, setLiquidateConfirmOpen] = useState(false);
  const [assetToLiquidate, setAssetToLiquidate] = useState<AssetItem | null>(null);

  // Modal in báo cáo quản lý tài sản toàn diện
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);

  // Form State cho Them moi va Chinh sua
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    category: 'machinery' | 'vehicle' | 'it_office' | 'workshop' | 'measuring';
    originalPrice: string;
    residualValue: string;
    depreciationMonths: string;
    depreciationStartDate: string;
    departmentKey: string;
    department: string;
    status: 'active' | 'maintenance' | 'in_stock' | 'liquidated';
    serialNumber: string;
    purchasedDate: string;
    managerName: string;
    maintenanceCycle: string;
    notes: string;
  }>({
    code: '',
    name: '',
    category: 'machinery',
    originalPrice: '',
    residualValue: '',
    depreciationMonths: '60',
    depreciationStartDate: '01/10/2026',
    departmentKey: '',
    department: 'Bộ phận sản xuất',
    status: 'active',
    serialNumber: '',
    purchasedDate: '01/10/2026',
    managerName: '',
    maintenanceCycle: '6 tháng',
    notes: '',
  });

  // Tải danh sách phòng ban chính từ CSDL
  useEffect(() => {
    fetch('/api/departments')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải phòng ban');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Chỉ lấy danh mục chính
          const subDepts = ['Gia công sản xuất', 'Kế hoạch sản xuất', 'Thiết kế sản xuất'];
          const filtered = data.filter((d: string) => !subDepts.includes(d));
          setDbDepartments(filtered);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh mục phòng ban:', err);
      });

    // Tải danh sách nhân sự từ CSDL
    fetch('/api/users')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải nhân sự');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllUsers(data);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách người dùng:', err);
      });
  }, []);

  // Danh sach phong ban hien huu chuan hoa
  const activeDepartments = useMemo(() => {
    const subDepts = ['Gia công sản xuất', 'Kế hoạch sản xuất', 'Thiết kế sản xuất'];
    const base = dbDepartments.length > 0 ? dbDepartments : DEFAULT_DB_DEPARTMENTS;
    return base.filter((d) => !subDepts.includes(d));
  }, [dbDepartments]);

  // Danh sach nhan su loc theo don vi su dung duoc chon giu nguyen nhu cu
  const availableManagers = useMemo(() => {
    const selectedDept = formData.department || '';
    // 1. Loc tu API users theo phong ban
    const fromApi = allUsers
      .filter((u) => {
        if (!u.department) return false;
        const d1 = u.department.toLowerCase().trim();
        const d2 = selectedDept.toLowerCase().trim();
        return d1 === d2 || d1.includes(d2) || d2.includes(d1);
      })
      .map((u) => u.name.replace(/\s*\(.*?\)\s*/g, '').trim());

    // 2. Loc tu danh muc phong ban mac dinh
    const fromFallback = DEFAULT_DEPARTMENT_STAFF[selectedDept] || [];

    const combined = Array.from(new Set([...fromApi, ...fromFallback])).filter(Boolean);

    if (combined.length > 0) return combined;

    if (allUsers.length > 0) {
      return allUsers.map((u) => u.name.replace(/\s*\(.*?\)\s*/g, '').trim());
    }

    return [];
  }, [formData.department, allUsers]);


  // Tai du lieu tu API khi khoi tao
  const loadAssets = () => {
    fetch('/api/finance/assets')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải từ máy chủ');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setAssets(data);
        } else if (data && Array.isArray(data.assets)) {
          setAssets(data.assets);
        } else {
          setAssets([]);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách tài sản cố định từ máy chủ:', err);
        setAssets([]);
      });
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Lắng nghe đồng bộ dữ liệu thời gian thực không cần reload
  useFinanceRealtimeSync(loadAssets);

  // Luu du lieu vao API va localStorage
  const saveAssetsData = async (newAssets: AssetItem[], action: 'create' | 'update' | 'delete' = 'update') => {
    setAssets(newAssets);
    try {
      localStorage.setItem('seajong_finance_assets', JSON.stringify(newAssets));
      await fetch('/api/finance/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssets),
      });
      notifyFinanceUpdated('fixed_assets', action);
    } catch {
      notifyFinanceUpdated('fixed_assets', action);
    }
  };

  // Loc du lieu theo cac tieu chi
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // 1. Loc loai tai san
      if (categoryFilter !== 'all' && asset.category !== categoryFilter) {
        return false;
      }
      // 2. Loc trang thai
      if (statusFilter !== 'all' && asset.status !== statusFilter) {
        return false;
      }
      // 3. Loc phong ban thuc te
      if (departmentFilter !== 'all' && !matchDepartment(asset.department || asset.departmentKey, departmentFilter)) {
        return false;
      }
      // 4. Tim kiem
      if (searchValue.trim()) {
        const q = searchValue.toLowerCase().trim();
        const matchName = asset.name.toLowerCase().includes(q);
        const matchCode = asset.code.toLowerCase().includes(q);
        const matchSerial = asset.serialNumber.toLowerCase().includes(q);
        const matchDept = asset.department.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchSerial && !matchDept) {
          return false;
        }
      }
      return true;
    });
  }, [assets, categoryFilter, statusFilter, departmentFilter, searchValue]);

  // Du lieu sau phan trang
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAssets.slice(startIndex, startIndex + pageSize);
  }, [filteredAssets, currentPage, pageSize]);

  // Xuất bảng tính Excel danh mục tài sản cố định
  const handleExportExcel = () => {
    const fileName = `Danh_muc_tai_san_co_dinh_${new Date().toISOString().slice(0, 10)}.csv`;
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'STT,Mã tài sản,Tên tài sản,Loại tài sản,Nguyên giá,Hao mòn lũy kế,Giá trị còn lại,Bộ phận sử dụng,Người phụ trách,Trạng thái,Ngày sử dụng,Ghi chú\n';
    filteredAssets.forEach((item, idx) => {
      const orig = Number(item.originalPrice) || 0;
      const resVal = Number(item.residualValue) || 0;
      const acc = Math.max(0, orig - resVal);
      csvContent += `${idx + 1},"${item.code}","${item.name}","${item.categoryLabel}",${orig},${acc},${resVal},"${item.department}","${item.managerName || ''}","${item.statusLabel}","${item.purchasedDate || ''}","${item.notes || ''}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset trang hien tai khi thay doi bo loc
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, departmentFilter, searchValue]);

  // Cau hinh cac bo loc cho TableToolbar
  const toolbarFilters: TableToolbarFilter[] = [
    {
      id: 'category-filter',
      value: categoryFilter,
      onChange: setCategoryFilter,
      options: [
        { value: 'all', label: 'Tất cả loại tài sản' },
        { value: 'machinery', label: 'Máy móc thiết bị sản xuất' },
        { value: 'vehicle', label: 'Phương tiện vận tải' },
        { value: 'it_office', label: 'Thiết bị văn phòng và CNTT' },
        { value: 'workshop', label: 'Nhà xưởng và Công trình' },
        { value: 'measuring', label: 'Thiết bị đo kiểm chất lượng' },
      ],
      minWidth: '190px',
    },
    {
      id: 'status-filter',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'all', label: 'Tất cả trạng thái' },
        { value: 'active', label: 'Đang sử dụng' },
        { value: 'maintenance', label: 'Đang bảo dưỡng' },
        { value: 'in_stock', label: 'Trong kho lưu trữ' },
        { value: 'liquidated', label: 'Đã thanh lý' },
      ],
      minWidth: '160px',
    },
    {
      id: 'dept-filter',
      value: departmentFilter,
      onChange: setDepartmentFilter,
      options: deptFilterOptions,
      minWidth: '200px',
    },
  ];

  // Xu ly Mo modal them moi
  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setFormData({
      code: `TS-${Date.now().toString().slice(-4)}`,
      name: '',
      category: 'machinery',
      status: 'active',
      purchasedDate: '01/10/2026',
      originalPrice: '',
      residualValue: '',
      depreciationMonths: '60',
      depreciationStartDate: '01/10/2026',
      departmentKey: '',
      department: activeDepartments[0] || 'Bộ phận sản xuất',
      managerName: '',
      maintenanceCycle: '6',
      serialNumber: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Xu ly Mo modal sua
  const handleOpenEditModal = (asset: AssetItem) => {
    setEditingAsset(asset);
    setFormData({
      code: asset.code,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      purchasedDate: asset.purchasedDate,
      originalPrice: String(asset.originalPrice),
      residualValue: String(asset.residualValue),
      depreciationMonths: String(asset.depreciationMonths || 60),
      depreciationStartDate: asset.depreciationStartDate || asset.purchasedDate,
      departmentKey: asset.departmentKey || '',
      department: asset.department,
      managerName: asset.managerName || '',
      maintenanceCycle: String(asset.maintenanceCycle || '6').replace(/\D/g, '') || '6',
      serialNumber: asset.serialNumber,
      notes: asset.notes || '',
    });
    setIsModalOpen(true);
  };

  // Xu ly Luu thong tin tai san
  const handleSaveAsset = () => {
    if (!formData.name.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên tài sản');
      return;
    }

    const categoryLabelMap: Record<string, string> = {
      machinery: 'Máy móc thiết bị sản xuất',
      vehicle: 'Phương tiện vận tải',
      it_office: 'Thiết bị văn phòng và CNTT',
      workshop: 'Nhà xưởng và Công trình',
      measuring: 'Thiết bị đo kiểm chất lượng',
    };

    const statusLabelMap: Record<string, string> = {
      active: 'Đang sử dụng',
      maintenance: 'Đang bảo dưỡng',
      in_stock: 'Trong kho lưu trữ',
      liquidated: 'Đã thanh lý',
    };

    const origPrice = Number(String(formData.originalPrice).replace(/\D/g, '')) || 0;
    const rawRes = String(formData.residualValue).trim();
    const resParsed = Number(rawRes.replace(/\D/g, ''));
    const resValue = rawRes !== '' && !isNaN(resParsed) ? resParsed : origPrice;
    const depMonths = Number(formData.depreciationMonths) || 60;
    const maintCycle = formData.maintenanceCycle ? `${formData.maintenanceCycle} tháng` : '6 tháng';

    if (editingAsset) {
      const updated = assets.map((item) =>
        item.id === editingAsset.id
          ? {
              ...item,
              code: formData.code.trim() || item.code,
              name: formData.name.trim(),
              category: formData.category,
              categoryLabel: categoryLabelMap[formData.category] || item.categoryLabel,
              originalPrice: origPrice,
              residualValue: resValue,
              depreciationMonths: depMonths,
              depreciationStartDate: formData.depreciationStartDate,
              departmentKey: formData.departmentKey,
              department: formData.department,
              status: formData.status,
              statusLabel: statusLabelMap[formData.status] || item.statusLabel,
              serialNumber: formData.serialNumber.trim(),
              purchasedDate: formData.purchasedDate,
              managerName: formData.managerName.trim(),
              maintenanceCycle: maintCycle,
              notes: formData.notes.trim(),
            }
          : item
      );
      saveAssetsData(updated, 'update');
      if (onShowToast) onShowToast('success', 'Cập nhật thành công', 'Thông tin tài sản đã được cập nhật chuẩn xác');
    } else {
      const newAsset: AssetItem = {
        id: `TS-${Date.now()}`,
        code: formData.code.trim() || `TS-${Date.now().toString().slice(-4)}`,
        name: formData.name.trim(),
        category: formData.category,
        categoryLabel: categoryLabelMap[formData.category] || 'Máy móc thiết bị sản xuất',
        originalPrice: origPrice,
        residualValue: resValue,
        depreciationMonths: depMonths,
        depreciationStartDate: formData.depreciationStartDate,
        departmentKey: formData.departmentKey,
        department: formData.department,
        status: formData.status,
        statusLabel: statusLabelMap[formData.status] || 'Đang sử dụng',
        serialNumber: formData.serialNumber.trim() || `SN-${Date.now().toString().slice(-4)}`,
        purchasedDate: formData.purchasedDate,
        managerName: formData.managerName.trim(),
        maintenanceCycle: maintCycle,
        notes: formData.notes.trim(),
      };
      saveAssetsData([newAsset, ...assets], 'create');
      if (onShowToast) onShowToast('success', 'Thêm mới thành công', 'Đã thêm tài sản mới vào hệ thống quản lý');
    }

    setIsModalOpen(false);
  };

  // Xu ly Xoa tai san
  const handleDeleteAsset = (asset: AssetItem) => {
    setAssetToDelete(asset);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return;
    const targetId = assetToDelete.id;
    try {
      await fetch(`/api/finance/assets/${targetId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Lỗi khi xóa tài sản khỏi CSDL:', e);
    }
    const updated = assets.filter((item) => item.id !== targetId);
    saveAssetsData(updated, 'delete');
    setDeleteConfirmOpen(false);
    setAssetToDelete(null);
    if (onShowToast) onShowToast('info', 'Đã xóa tài sản', 'Tài sản đã được xóa khỏi danh sách quản lý');
  };

  // Chọn / bỏ chọn tất cả tài sản trên trang hiện tại
  const handleToggleSelectAll = () => {
    if (selectedIds.length === paginatedAssets.length && paginatedAssets.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedAssets.map((a) => a.id));
    }
  };

  // Chọn / bỏ chọn từng tài sản
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Xóa hàng loạt tài sản đã chọn qua DeleteButton
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        await fetch(`/api/finance/assets/${id}`, { method: 'DELETE' });
      }
      const updated = assets.filter((item) => !selectedIds.includes(item.id));
      saveAssetsData(updated, 'delete');
      setSelectedIds([]);
      if (onShowToast) onShowToast('info', 'Đã xóa tài sản', `Đã xóa thành công ${selectedIds.length} tài sản khỏi cơ sở dữ liệu.`);
    } catch (e) {
      console.error('Lỗi khi xóa hàng loạt tài sản:', e);
      if (onShowToast) onShowToast('error', 'Lỗi', 'Không thể xóa các tài sản đã chọn.');
    }
  };

  // Xu ly Thanh ly tai san
  const handleLiquidateAsset = (asset: AssetItem) => {
    if (asset.status === 'liquidated') {
      if (onShowToast) onShowToast('info', 'Thông báo', 'Tài sản này hiện tại đã ở trạng thái thanh lý');
      return;
    }
    setAssetToLiquidate(asset);
    setLiquidateConfirmOpen(true);
  };

  const handleConfirmLiquidate = () => {
    if (!assetToLiquidate) return;
    const updated = assets.map((item) =>
      item.id === assetToLiquidate.id
        ? {
            ...item,
            status: 'liquidated' as const,
            statusLabel: 'Đã thanh lý',
          }
        : item
    );
    saveAssetsData(updated);
    setLiquidateConfirmOpen(false);
    setAssetToLiquidate(null);
    if (onShowToast) onShowToast('success', 'Thanh lý thành công', 'Đã chuyển trạng thái tài sản sang Đã thanh lý');
  };

  // Render Badge theo trang thai
  const renderStatusBadge = (status: AssetItem['status'], label: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">{label}</Badge>;
      case 'maintenance':
        return <Badge variant="warning">{label}</Badge>;
      case 'in_stock':
        return <Badge variant="brand">{label}</Badge>;
      case 'liquidated':
        return <Badge variant="neutral">{label}</Badge>;
      default:
        return <Badge variant="neutral">{label}</Badge>;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: '1 1 0%',
        minHeight: 0,
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: "'Roboto Condensed', sans-serif",
      }}
    >
      {/* 1. TABLE TOOLBAR ĐỒNG BỘ CHUẨN DỰ ÁN */}
      <TableToolbar
        searchValue={searchValue}
        onSearchChange={(val) => {
          setSearchValue(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm kiếm tài sản theo tên, mã hoặc số serial..."
        searchMinWidth="240px"
        filters={toolbarFilters}
        printLabel="In báo cáo"
        onPrint={() => setIsReportPrintOpen(true)}
        onExportExcel={handleExportExcel}
        onRefresh={loadAssets}
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={handleOpenAddModal}
              style={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              Thêm mới
            </Button>

            <DeleteButton
              size="sm"
              itemCount={selectedIds.length}
              disabled={selectedIds.length === 0}
              onConfirm={handleDeleteSelected}
              dialogTitle="Xác nhận xoá tài sản cố định"
              dialogMessage={
                selectedIds.length > 0
                  ? `Bạn có chắc chắn muốn xóa ${selectedIds.length} tài sản đã chọn khỏi cơ sở dữ liệu? Hành động này không thể hoàn tác.`
                  : 'Bạn có chắc chắn muốn xóa tài sản này khỏi cơ sở dữ liệu?'
              }
              title={
                selectedIds.length === 0
                  ? 'Chọn ít nhất một tài sản để xoá'
                  : `Xoá ${selectedIds.length} tài sản đã chọn`
              }
            />
          </div>
        }
        style={{
          marginBottom: 0,
          padding: '10px 20px',
          flexShrink: 0,
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
        }}
      />

      {/* 2. FULL WIDTH TABLE: BẢNG DỮ LIỆU ĐỒNG BỘ */}
      <FullWidthTable>
        <table
          className="custom-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            margin: 0,
            fontSize: '0.8125rem',
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'var(--bg-surface-2, #f8fafc)',
            }}
          >
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                color: 'var(--text-muted, #64748b)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              <th style={{ width: '40px', textAlign: 'center', padding: '10px 8px' }}>
                <input
                  type="checkbox"
                  checked={paginatedAssets.length > 0 && selectedIds.length === paginatedAssets.length}
                  onChange={handleToggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ minWidth: '220px', padding: '10px 14px' }}>Tên tài sản</th>
              <th style={{ width: '160px', padding: '10px 12px' }}>Loại tài sản</th>
              <th style={{ width: '140px', padding: '10px 14px', textAlign: 'right' }}>Nguyên giá</th>
              <th style={{ width: '140px', padding: '10px 14px', textAlign: 'right' }}>Giá trị còn lại</th>
              <th style={{ width: '190px', padding: '10px 14px' }}>Đơn vị sử dụng</th>
              <th style={{ width: '130px', padding: '10px 14px', textAlign: 'center' }}>Trạng thái</th>
            </tr>
          </thead>
            <tbody>
              {paginatedAssets.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: '48px 20px',
                      textAlign: 'center',
                      color: 'var(--text-muted, #94a3b8)',
                    }}
                  >
                    <ExclamationTriangle size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#64748b' }}>
                      Không tìm thấy tài sản nào phù hợp
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '4px' }}>
                      Thử thay đổi bộ lọc loại tài sản, trạng thái hoặc từ khóa tìm kiếm
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAssets.map((asset, index) => {
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => {
                        setViewingAsset(asset);
                        setIsDetailOpen(true);
                      }}
                      style={{
                        borderBottom: index < paginatedAssets.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedIds.includes(asset.id)) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedIds.includes(asset.id)) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Cột 1: Checkbox */}
                      <td
                        style={{ width: '40px', textAlign: 'center', padding: '10px 8px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(asset.id)}
                          onChange={(e) => handleToggleSelect(asset.id, e as any)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Cột 2: Tên tài sản */}
                      <td style={{ padding: '10px 14px', maxWidth: '300px' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: 'var(--text-primary, #0f172a)',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            lineHeight: 1.35,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(asset);
                          }}
                          title={asset.name}
                        >
                          {asset.name}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '3px',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary, #64748b)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.25,
                          }}
                        >
                          <span style={{ flexShrink: 0 }}>Mã: <strong style={{ color: '#334155' }}>{asset.code}</strong></span>
                          {asset.serialNumber && (
                            <>
                              <span style={{ flexShrink: 0 }}>•</span>
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={`Số sê-ri: ${asset.serialNumber}`}
                              >
                                Số sê-ri: {asset.serialNumber}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Cột 3: Loại tài sản */}
                      <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {asset.categoryLabel}
                      </td>

                      {/* Cột 4: Nguyên giá */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        {formatNumberGroup(asset.originalPrice)}
                      </td>

                      {/* Cột 5: Giá trị còn lại */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        {formatNumberGroup(asset.residualValue)}
                      </td>

                      {/* Cột 6: Đơn vị sử dụng */}
                      <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: '#334155', maxWidth: '200px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.35 }} title={asset.department}>
                          {asset.department}
                        </div>
                        {asset.managerName && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }} title={`Phụ trách: ${asset.managerName}`}>
                            Phụ trách: {asset.managerName}
                          </div>
                        )}
                      </td>

                      {/* Cột 7: Trạng thái */}
                      <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {renderStatusBadge(asset.status, asset.statusLabel)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </FullWidthTable>

        {/* ── 3. PHÂN TRANG PAGINATION ĐỒNG BỘ ── */}
        <div style={{ flexShrink: 0, padding: '10px 20px', borderTop: '1px solid var(--border-subtle, #e2e8f0)', backgroundColor: 'var(--bg-surface-1, #ffffff)' }}>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredAssets.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </div>

      {/* ── 5. OFFCANVAS THÊM HOẶC SỬA TÀI SẢN RỘNG 400PX ── */}
      <Offcanvas
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAsset ? 'Chỉnh sửa tài sản' : 'Thêm mới tài sản'}
        description="Nhập thông tin tên tài sản, nguyên giá, giá trị còn lại và đơn vị phụ trách"
        width="400px"
        position="right"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveAsset} style={{ fontWeight: 700 }}>
              {editingAsset ? 'Lưu thay đổi' : 'Thêm mới tài sản'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Nhóm 1: Label thông tin định danh */}
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Thông tin định danh
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                Loại tài sản:
              </label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as any }))}
                options={[
                  { value: 'machinery', label: 'Máy móc thiết bị sản xuất' },
                  { value: 'vehicle', label: 'Phương tiện vận tải' },
                  { value: 'it_office', label: 'Thiết bị văn phòng và CNTT' },
                  { value: 'workshop', label: 'Nhà xưởng và Công trình' },
                  { value: 'measuring', label: 'Thiết bị đo kiểm chất lượng' },
                ]}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                Trạng thái:
              </label>
              <Select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                options={[
                  { value: 'active', label: 'Đang sử dụng' },
                  { value: 'maintenance', label: 'Đang bảo dưỡng' },
                  { value: 'in_stock', label: 'Trong kho lưu trữ' },
                  { value: 'liquidated', label: 'Đã thanh lý' },
                ]}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
              Tên tài sản:
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Máy cắt nhôm CNC 2 đầu..."
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>

          {/* Nhóm 2: Label Giá trị và khấu hao */}
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
            Giá trị và khấu hao
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                Ngày mua:
              </label>
              <Input
                type="text"
                placeholder="ngày/tháng/năm"
                value={formData.purchasedDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, purchasedDate: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                Ngày tính khấu hao:
              </label>
              <Input
                type="text"
                placeholder="ngày/tháng/năm"
                value={formData.depreciationStartDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, depreciationStartDate: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                Nguyên giá:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Nhập số tiền"
                value={formatNumberGroup(formData.originalPrice)}
                onChange={(e) => setFormData((prev) => ({ ...prev, originalPrice: e.target.value }))}
                rightIcon={<span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>đ</span>}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                Thời gian khấu hao:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Ví dụ: 60"
                value={formData.depreciationMonths}
                onChange={(e) => setFormData((prev) => ({ ...prev, depreciationMonths: e.target.value.replace(/\D/g, '') }))}
                rightIcon={<span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>tháng</span>}
                style={{ paddingRight: '52px', marginBottom: 0 }}
              />
            </div>
          </div>

          {/* Nhóm 3: Label Bàn giao và bảo trì */}
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
            Bàn giao và bảo trì
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
              Đơn vị sử dụng:
            </label>
            <DepartmentSelect
              value={formData.department}
              onChange={(e) => {
                const val = e.target.value;
                const staffList = (DEFAULT_DEPARTMENT_STAFF[val] || []).length > 0
                  ? DEFAULT_DEPARTMENT_STAFF[val]
                  : allUsers
                      .filter((u) => u.department && (u.department.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(u.department.toLowerCase())))
                      .map((u) => u.name.replace(/\s*\(.*?\)\s*/g, '').trim());
                const nextManager = staffList && staffList.length > 0 ? staffList[0] : '';
                setFormData((prev) => ({
                  ...prev,
                  department: val,
                  managerName: nextManager || prev.managerName,
                }));
              }}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                Người phụ trách:
              </label>
              <Select
                value={formData.managerName}
                onChange={(e) => setFormData((prev) => ({ ...prev, managerName: e.target.value }))}
                options={availableManagers.map((staffName) => ({
                  value: staffName,
                  label: staffName,
                }))}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '3px' }}>
                Chu kỳ bảo dưỡng:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Ví dụ: 6"
                value={formData.maintenanceCycle}
                onChange={(e) => setFormData((prev) => ({ ...prev, maintenanceCycle: e.target.value.replace(/\D/g, '') }))}
                rightIcon={<span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>tháng</span>}
                style={{ paddingRight: '52px', marginBottom: 0 }}
              />
            </div>
          </div>
        </div>
      </Offcanvas>

      {/* ── 6. MODAL XEM CHI TIẾT TÀI SẢN ── */}
      {viewingAsset && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title="Thông tin chi tiết tài sản"
          description={`Mã tài sản: ${viewingAsset.code} - Số serial: ${viewingAsset.serialNumber}`}
          maxWidth="520px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleOpenEditModal(viewingAsset);
                  }}
                >
                  Sửa
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleLiquidateAsset(viewingAsset);
                  }}
                >
                  Thanh lý
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleDeleteAsset(viewingAsset);
                  }}
                >
                  Xoá
                </Button>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tên tài sản:</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {viewingAsset.name}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>Phân loại:</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {viewingAsset.categoryLabel}
                </div>
              </div>

              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>Trạng thái:</div>
                <div style={{ marginTop: '4px' }}>
                  {renderStatusBadge(viewingAsset.status, viewingAsset.statusLabel)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>Nguyên giá:</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                  {formatNumberGroup(viewingAsset.originalPrice)}
                </div>
              </div>

              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>Giá trị còn lại:</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  {formatNumberGroup(viewingAsset.residualValue)}
                </div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>Đơn vị sử dụng:</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {viewingAsset.department}
              </div>
              {viewingAsset.managerName && (
                <div style={{ fontSize: '0.7813rem', color: '#475569', marginTop: '2px' }}>
                  Cán bộ phụ trách: <strong>{viewingAsset.managerName}</strong>
                </div>
              )}
            </div>

            {viewingAsset.notes && (
              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>Ghi chú:</div>
                <div style={{ fontSize: '0.8125rem', color: '#334155', marginTop: '2px' }}>
                  {viewingAsset.notes}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}


      {/* ── 8. CONFIRM DIALOG XÓA TÀI SẢN ── */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Xác nhận xóa tài sản"
        message={assetToDelete ? `Bạn có chắc chắn muốn xóa tài sản ${assetToDelete.name} mã số ${assetToDelete.code} khỏi cơ sở dữ liệu không?` : ''}
        confirmText="Xóa tài sản"
        cancelText="Hủy bỏ"
        type="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setAssetToDelete(null);
        }}
      />

      {/* ── 9. CONFIRM DIALOG THANH LÝ TÀI SẢN ── */}
      <ConfirmDialog
        isOpen={liquidateConfirmOpen}
        title="Xác nhận thanh lý tài sản"
        message={assetToLiquidate ? `Bạn có chắc chắn muốn chuyển tài sản ${assetToLiquidate.name} mã số ${assetToLiquidate.code} sang trạng thái thanh lý không?` : ''}
        confirmText="Xác nhận thanh lý"
        cancelText="Hủy bỏ"
        type="warning"
        onConfirm={handleConfirmLiquidate}
        onClose={() => {
          setLiquidateConfirmOpen(false);
          setAssetToLiquidate(null);
        }}
      />

      {/* ── 10. MODAL XEM TRƯỚC VÀ IN BÁO CÁO TÀI SẢN TOÀN DIỆN ── */}
      <AssetReportPrintModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        fixedAssets={assets}
      />
    </div>
  );
};

export const AssetManagementView: React.FC<AssetManagementViewProps> = ({ currentStep = 1, onShowToast }) => {
  if (currentStep === 1) {
    return <CashAssetsView onShowToast={onShowToast} />;
  }
  return <FixedAssetsManagementView onShowToast={onShowToast} />;
};

export default AssetManagementView;
