import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Select, type SelectOption } from './Select';
import type { TableToolbarFilter } from './TableToolbar';

export interface WarehouseItem {
  id: string;
  name: string;
  code?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  code?: string;
}

export interface WarehouseCategoryFilterProps {
  /** Giá trị mã/ID kho hàng đang chọn ("" hoặc "all" là tất cả kho) */
  warehouse: string;
  /** Callback khi kho hàng thay đổi */
  onWarehouseChange: (warehouseId: string) => void;
  /** Giá trị ID danh mục đang chọn ("" là tất cả danh mục) */
  category: string;
  /** Callback khi danh mục thay đổi */
  onCategoryChange: (categoryId: string) => void;
  /** Độ rộng tối thiểu ô chọn Kho (mặc định 170px) */
  warehouseMinWidth?: string;
  /** Độ rộng tối thiểu ô chọn Danh mục (mặc định 160px) */
  categoryMinWidth?: string;
  /** Nhãn mặc định cho ô Kho (mặc định "Tất cả kho hàng") */
  allWarehouseLabel?: string;
  /** Nhãn mặc định cho ô Danh mục (mặc định "Tất cả danh mục") */
  allCategoryLabel?: string;
  /** ClassName bổ sung */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Component dùng chung cho bộ đôi lọc Kho hàng & Danh mục
 * Đảm bảo danh mục luôn được tải động chính xác theo kho hàng được chọn.
 * Tự động reset danh mục về tất cả khi đổi sang kho mới không chứa danh mục cũ.
 */
export const WarehouseCategoryFilter: React.FC<WarehouseCategoryFilterProps> = ({
  warehouse,
  onWarehouseChange,
  category,
  onCategoryChange,
  warehouseMinWidth = '170px',
  categoryMinWidth = '160px',
  allWarehouseLabel = 'Tất cả kho hàng',
  allCategoryLabel = 'Tất cả danh mục',
  className = '',
  style,
}) => {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  // 1. Tải danh sách kho hàng
  useEffect(() => {
    let isMounted = true;
    fetch('/api/logistics/warehouses?limit=100')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data && Array.isArray(data.items)) {
          setWarehouses(data.items.map((w: any) => ({ id: w.id, name: w.name, code: w.code })));
        }
      })
      .catch((err) => console.error('Lỗi nạp danh sách kho hàng:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tải danh mục phù hợp theo từng kho hàng được chọn
  useEffect(() => {
    let isMounted = true;
    setLoadingCats(true);

    const url =
      warehouse && warehouse !== 'all'
        ? `/api/logistics/categories?warehouseId=${encodeURIComponent(warehouse)}`
        : '/api/logistics/categories';

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          const loaded: CategoryItem[] = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            code: c.code,
          }));
          setCategories(loaded);

          // Nếu danh mục đang chọn không còn nằm trong danh sách danh mục của kho này, tự động reset
          if (category && !loaded.some((c) => c.id === category)) {
            onCategoryChange('');
          }
        }
      })
      .catch((err) => console.error('Lỗi nạp danh mục theo kho:', err))
      .finally(() => {
        if (isMounted) setLoadingCats(false);
      });

    return () => {
      isMounted = false;
    };
  }, [warehouse]); // Chỉ re-fetch khi warehouse thay đổi

  const warehouseOptions: SelectOption[] = useMemo(
    () => [
      { label: allWarehouseLabel, value: '' },
      ...warehouses.map((w) => ({ label: w.name, value: w.id })),
    ],
    [warehouses, allWarehouseLabel]
  );

  const categoryOptions: SelectOption[] = useMemo(
    () => [
      {
        label: loadingCats ? 'Đang tải danh mục...' : allCategoryLabel,
        value: '',
      },
      ...categories.map((c) => ({ label: c.name, value: c.id })),
    ],
    [categories, allCategoryLabel, loadingCats]
  );

  const handleWarehouseSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newWh = e.target.value;
      onWarehouseChange(newWh);
      onCategoryChange(''); // Chủ động reset danh mục khi người dùng chọn kho khác
    },
    [onWarehouseChange, onCategoryChange]
  );

  return (
    <div
      className={`warehouse-category-filter-group flex items-center gap-2 ${className}`}
      style={{ flex: '0 0 auto', ...style }}
    >
      {/* Ô chọn Kho hàng */}
      <div style={{ minWidth: warehouseMinWidth, flex: '0 0 auto' }}>
        <Select
          value={warehouse}
          onChange={handleWarehouseSelect}
          options={warehouseOptions}
          aria-label="Chọn kho hàng"
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* Ô chọn Danh mục (tự động cập nhật theo kho) */}
      <div style={{ minWidth: categoryMinWidth, flex: '0 0 auto' }}>
        <Select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          options={categoryOptions}
          aria-label="Chọn danh mục"
          style={{ marginBottom: 0 }}
          disabled={loadingCats}
        />
      </div>
    </div>
  );
};

export interface UseWarehouseCategoryFilterOptions {
  initialWarehouse?: string;
  initialCategory?: string;
  onFilterChange?: (warehouse: string, category: string) => void;
  warehouseMinWidth?: string;
  categoryMinWidth?: string;
  allWarehouseLabel?: string;
  allCategoryLabel?: string;
}

/**
 * Custom Hook useWarehouseCategoryFilter
 * Cung cấp state và cấu hình filter tương thích 100% với prop `filters` của TableToolbar
 */
export function useWarehouseCategoryFilter(options: UseWarehouseCategoryFilterOptions = {}) {
  const {
    initialWarehouse = '',
    initialCategory = '',
    warehouseMinWidth = '170px',
    categoryMinWidth = '160px',
    allWarehouseLabel = 'Tất cả kho hàng',
    allCategoryLabel = 'Tất cả danh mục',
  } = options;

  const [warehouse, setWarehouse] = useState<string>(initialWarehouse);
  const [category, setCategory] = useState<string>(initialCategory);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  // 1. Tải danh sách kho hàng
  useEffect(() => {
    let isMounted = true;
    fetch('/api/logistics/warehouses?limit=100')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data && Array.isArray(data.items)) {
          setWarehouses(data.items.map((w: any) => ({ id: w.id, name: w.name, code: w.code })));
        }
      })
      .catch((err) => console.error('Lỗi nạp danh sách kho hàng:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tải danh mục theo kho
  useEffect(() => {
    let isMounted = true;
    setLoadingCats(true);

    const url =
      warehouse && warehouse !== 'all'
        ? `/api/logistics/categories?warehouseId=${encodeURIComponent(warehouse)}`
        : '/api/logistics/categories';

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          const loaded: CategoryItem[] = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            code: c.code,
          }));
          setCategories(loaded);

          if (category && !loaded.some((c) => c.id === category)) {
            setCategory('');
          }
        }
      })
      .catch((err) => console.error('Lỗi nạp danh mục theo kho:', err))
      .finally(() => {
        if (isMounted) setLoadingCats(false);
      });

    return () => {
      isMounted = false;
    };
  }, [warehouse]);

  const handleWarehouseChange = useCallback((val: string) => {
    setWarehouse(val);
    setCategory('');
  }, []);

  const handleCategoryChange = useCallback((val: string) => {
    setCategory(val);
  }, []);

  // Xuất mảng cấu hình filters dùng trực tiếp cho TableToolbar
  const filterConfigs: TableToolbarFilter[] = useMemo(() => {
    return [
      {
        id: 'warehouse',
        label: 'Kho hàng',
        value: warehouse,
        onChange: handleWarehouseChange,
        minWidth: warehouseMinWidth,
        options: [
          { label: allWarehouseLabel, value: '' },
          ...warehouses.map((w) => ({ label: w.name, value: w.id })),
        ],
      },
      {
        id: 'category',
        label: 'Danh mục',
        value: category,
        onChange: handleCategoryChange,
        minWidth: categoryMinWidth,
        options: [
          {
            label: loadingCats ? 'Đang tải danh mục...' : allCategoryLabel,
            value: '',
          },
          ...categories.map((c) => ({ label: c.name, value: c.id })),
        ],
      },
    ];
  }, [
    warehouse,
    category,
    warehouses,
    categories,
    loadingCats,
    warehouseMinWidth,
    categoryMinWidth,
    allWarehouseLabel,
    allCategoryLabel,
    handleWarehouseChange,
    handleCategoryChange,
  ]);

  return {
    warehouse,
    setWarehouse: handleWarehouseChange,
    category,
    setCategory: handleCategoryChange,
    warehouses,
    categories,
    loadingCats,
    filterConfigs,
  };
}

export default WarehouseCategoryFilter;
