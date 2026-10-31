import React, { useState, useEffect, useCallback } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { Pagination } from '../../components/common/Pagination';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { ProductDrawer, type Product } from '../../components/marketing/ProductDrawer';

interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number;
}

interface PaginationData {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface SyncLog {
  id: string;
  status: 'running' | 'success' | 'error';
  message: string;
  totalSynced: number;
  startedAt: string;
  finishedAt?: string;
}

export const MarketingProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter states
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(24);

  // Sync state
  const [syncLog, setSyncLog] = useState<SyncLog | null>(null);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const prevSyncStatusRef = React.useRef<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch categories
  useEffect(() => {
    fetch('/api/seajong/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch((err) => console.error('Fetch categories error:', err));
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (catFilter) {
        params.set('category', catFilter);
      } else if (groupFilter !== null) {
        params.set('category', String(groupFilter));
      }
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const res = await fetch(`/api/seajong/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, catFilter, groupFilter, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Group chips (Thiết bị vệ sinh & Thiết bị nhà bếp)
  const topGroups = categories.filter((c) => c.parent === 0);
  const getChildren = (parentId: number) =>
    categories.filter((c) => c.parent === parentId && c.count > 0);

  const CHIP_GROUP_NAMES = ['Thiết bị vệ sinh', 'Thiết bị nhà bếp'];
  const chipGroups = topGroups.filter((g) => CHIP_GROUP_NAMES.includes(g.name));

  const handleGroupToggle = (id: number) => {
    if (groupFilter === id) {
      setGroupFilter(null);
    } else {
      setGroupFilter(id);
    }
    setCatFilter('');
    setPage(1);
  };

  const activeSubCategories: Category[] =
    groupFilter !== null
      ? getChildren(groupFilter)
      : categories.filter((c) => c.count > 0 && c.parent !== 0).slice(0, 14);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/seajong/sync');
      if (!res.ok) return;
      const data = await res.json();
      if (data.log) {
        setSyncLog(data.log);
        const isRunning = data.log.status === 'running';
        setSyncing(isRunning);
      }
    } catch (err) {
      console.error('Fetch sync status error:', err);
    }
  }, []);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  useEffect(() => {
    if (!syncing) return;
    const timer = setInterval(() => {
      fetchSyncStatus();
    }, 2000);
    return () => clearInterval(timer);
  }, [syncing, fetchSyncStatus]);

  // Tự động tải lại dữ liệu sản phẩm & danh mục khi hoàn tất đồng bộ
  useEffect(() => {
    if (prevSyncStatusRef.current === 'running' && syncLog?.status === 'success') {
      fetchProducts();
      fetch('/api/seajong/categories')
        .then((res) => res.json())
        .then((data) => {
          if (data.categories && Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
        })
        .catch(() => {});
    }
    prevSyncStatusRef.current = syncLog?.status || null;
  }, [syncLog?.status, fetchProducts]);

  const handleStartSync = async () => {
    setShowSyncModal(true);
    setSyncing(true);
    try {
      const res = await fetch('/api/seajong/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchSyncStatus();
      }
    } catch (err) {
      console.error('Start sync error:', err);
    }
  };

  const handleCancelSync = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn dừng tiến trình đồng bộ đang chạy?')) return;
    try {
      await fetch('/api/seajong/sync', { method: 'DELETE' });
      setSyncing(false);
      fetchSyncStatus();
    } catch (err) {
      console.error('Cancel sync error:', err);
    }
  };

  return (
    <StandardPage
      title="Sản phẩm Seajong"
      description={
        pagination?.total
          ? `${pagination.total} sản phẩm — cơ sở dữ liệu nội bộ Seajong`
          : 'Dữ liệu sản phẩm sen vòi, thiết bị vệ sinh cao cấp Seajong'
      }
      icon="bi-box-seam"
      color="blue"
      badge="CATALOGUE"
      tickerContext="products"
    >
          {/* ── 3. Unified Sticky Toolbar ── */}
          <div className="shrink-0 bg-white border-b border-slate-200 p-2.5 space-y-2">
            {/* Hàng 1: Search, Toggle groups, View mode, Sync */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Ô tìm kiếm */}
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm sản phẩm theo tên, mã sản phẩm..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer"
                  >
                    <i className="bi bi-x-circle-fill text-xs" />
                  </button>
                )}
              </div>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              {/* Toggles cho 2 nhóm chính: Thiết bị vệ sinh / Thiết bị nhà bếp */}
              <div className="flex items-center gap-3 select-none">
                {chipGroups.map((g) => {
                  const active = groupFilter === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleGroupToggle(g.id)}
                      className="flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <div
                        className={`w-7 h-4 rounded-full transition-colors relative ${
                          active ? 'bg-blue-600 shadow-2xs' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                            active ? 'translate-x-3.5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-xs ${
                          active ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
                        }`}
                      >
                        {g.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Bên phải: Pagination info, View mode switcher, Sync button */}
              <div className="ml-auto flex items-center gap-2.5">
                {pagination && (
                  <span className="text-xs text-slate-500 hidden md:inline">
                    <b className="text-slate-800 font-bold">{pagination.total}</b> sản phẩm &nbsp;•&nbsp;
                    Trang <b className="text-slate-800 font-bold">{pagination.page}</b>/{pagination.totalPages}
                  </span>
                )}

                <div className="h-5 w-px bg-slate-200 hidden md:block" />

                {/* View mode switcher */}
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border-0 cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                    title="Xem dạng lưới"
                  >
                    <i className="bi bi-grid-3x3-gap-fill text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border-0 cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                    title="Xem dạng bảng"
                  >
                    <i className="bi bi-list-ul text-sm" />
                  </button>
                </div>

                <div className="h-5 w-px bg-slate-200" />

                {/* Sync button */}
                <button
                  type="button"
                  onClick={() => {
                    if (syncing) {
                      setShowSyncModal(true);
                    } else {
                      handleStartSync();
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    syncing
                      ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                      : 'bg-blue-700 hover:bg-blue-600 text-white'
                  }`}
                  title={syncing ? 'Đang đồng bộ - Nhấn để xem tiến trình' : 'Đồng bộ từ seajong.com'}
                >
                  <i className={`bi bi-arrow-repeat text-xs ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ'}</span>
                </button>
              </div>
            </div>

            {/* Hàng 2: Category chips */}
            {activeSubCategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mr-1 shrink-0">
                  Danh mục:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCatFilter('');
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                    catFilter === ''
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Tất cả ({pagination?.total || 225})
                </button>

                {activeSubCategories.map((cat) => {
                  const isActive = catFilter === String(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCatFilter(isActive ? '' : String(cat.id));
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                        isActive
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat.name} ({cat.count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 4. Main Products View Area (Scrollable) ── */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-slate-50/40">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <i className="bi bi-arrow-repeat animate-spin text-3xl text-blue-600" />
                <span className="text-xs font-medium">Đang tải danh sách sản phẩm Seajong...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <i className="bi bi-inbox text-4xl opacity-50" />
                <span className="text-xs font-bold text-slate-600">Không tìm thấy sản phẩm nào</span>
                <span className="text-[11px] text-slate-400">
                  Thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc danh mục
                </span>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── Grid View ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((p) => {
                  const firstImage = p.images?.[0] || '';
                  const catNames = p.categoryNames?.slice(0, 2) || [];
                  const specsKeys = Object.keys(p.specs || {}).slice(0, 2);

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col group"
                    >
                      {/* Image Box */}
                      <div className="h-44 bg-slate-50 relative overflow-hidden flex items-center justify-center p-3 border-b border-slate-100">
                        {firstImage ? (
                          <img
                            src={firstImage}
                            alt={p.name}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center text-slate-300">
                            <i className="bi bi-box-seam text-4xl" />
                          </div>
                        )}

                        {/* Floating Categories */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 flex-wrap justify-end">
                          {catNames.map((cn) => (
                            <span
                              key={cn}
                              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-900/80 text-white backdrop-blur-xs shadow-2xs"
                            >
                              {cn}
                            </span>
                          ))}
                        </div>

                        {/* Photos count */}
                        {p.images && p.images.length > 1 && (
                          <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-slate-900/60 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <i className="bi bi-images text-[10px]" />
                            {p.images.length} ảnh
                          </span>
                        )}
                      </div>

                      {/* Content Box */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                        <div className="space-y-1.5">
                          <h4
                            className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors"
                            title={p.name}
                          >
                            {p.name}
                          </h4>

                          {p.excerpt && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-0">
                              {p.excerpt}
                            </p>
                          )}
                        </div>

                        {/* Specs preview */}
                        {specsKeys.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
                            {specsKeys.map((k) => (
                              <span key={k} className="truncate max-w-[120px]">
                                <b className="text-slate-700">{k}:</b> {p.specs[k]}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Price & Action */}
                        <div className="pt-1 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Giá bán:</span>
                            <span className="text-xs font-extrabold text-amber-600 font-mono">
                              {p.price > 0 ? `${p.price.toLocaleString('vi-VN')} ₫` : 'Liên hệ'}
                            </span>
                          </div>

                          <span className="text-[11px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                            Chi tiết <i className="bi bi-arrow-right text-[10px]" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── List View (Table) ── */
              <FullWidthTable>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="py-2.5 px-3 font-bold text-slate-600 w-16 text-center">ẢNH</th>
                      <th className="py-2.5 px-3 font-bold text-slate-600">TÊN SẢN PHẨM</th>
                      <th className="py-2.5 px-3 font-bold text-slate-600">DANH MỤC</th>
                      <th className="py-2.5 px-3 font-bold text-slate-600">THÔNG SỐ CHÍNH</th>
                      <th className="py-2.5 px-3 font-bold text-slate-600 text-right">GIÁ NIÊM YẾT</th>
                      <th className="py-2.5 px-3 font-bold text-slate-600 text-center w-24">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => {
                      const firstImg = p.images?.[0] || '';
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedProduct(p)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        >
                          <td className="py-2 px-3 text-center">
                            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center p-1 mx-auto overflow-hidden">
                              {firstImg ? (
                                <img src={firstImg} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <i className="bi bi-image text-slate-300 text-sm" />
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block truncate max-w-sm">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Cập nhật: {new Date(p.updatedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {p.categoryNames?.slice(0, 2).map((cn) => (
                                <span
                                  key={cn}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                  {cn}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            {Object.entries(p.specs || {})
                              .slice(0, 2)
                              .map(([k, v]) => `${k} ${v}`)
                              .join(' • ') || 'Tiêu chuẩn Seajong'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold font-mono text-amber-600">
                            {p.price > 0 ? `${p.price.toLocaleString('vi-VN')} ₫` : 'Liên hệ'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </FullWidthTable>
            )}
          </div>

          {/* ── 5. Enterprise Pagination at Bottom ── */}
          {pagination && pagination.total > 0 && (
            <div className="shrink-0 border-t border-slate-200 bg-white">
              <Pagination
                currentPage={page}
                totalItems={pagination.total}
                pageSize={perPage}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPerPage(newSize);
                  setPage(1);
                }}
                pageSizeOptions={[12, 24, 48, 96]}
                itemName="sản phẩm"
              />
            </div>
          )}

      {/* ── 6. Product Detail Drawer ── */}
      <ProductDrawer
        product={selectedProduct}
        cats={categories}
        onClose={() => setSelectedProduct(null)}
      />

      {/* ── 7. Sync Modal (Đồng bộ seajong.com -> CSDL Nội bộ) ── */}
      {showSyncModal && (
        <>
          <div
            onClick={() => {
              if (!syncing) setShowSyncModal(false);
            }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base ${
                    syncing
                      ? 'bg-amber-100 text-amber-600'
                      : syncLog?.status === 'success'
                      ? 'bg-emerald-100 text-emerald-600'
                      : syncLog?.status === 'error'
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <i
                    className={`bi ${
                      syncing
                        ? 'bi-arrow-repeat animate-spin'
                        : syncLog?.status === 'success'
                        ? 'bi-check-circle-fill'
                        : syncLog?.status === 'error'
                        ? 'bi-x-circle-fill'
                        : 'bi-arrow-repeat'
                    }`}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 mb-0.5">
                    {syncing
                      ? 'Đang đồng bộ dữ liệu…'
                      : syncLog?.status === 'success'
                      ? 'Đồng bộ hoàn tất'
                      : syncLog?.status === 'error'
                      ? 'Đồng bộ thất bại'
                      : 'Đồng bộ dữ liệu'}
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    seajong.com → Cơ sở dữ liệu nội bộ
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {syncing && (
                  <button
                    type="button"
                    onClick={handleCancelSync}
                    title="Huỷ tiến trình"
                    className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <i className="bi bi-stop-circle text-base" />
                  </button>
                )}
                {!syncing && (
                  <button
                    type="button"
                    onClick={() => setShowSyncModal(false)}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <i className="bi bi-x-lg text-xs" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-slate-800">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Tiến trình đồng bộ website</span>
                  <span
                    className={`font-extrabold font-mono text-xs ${
                      syncing
                        ? 'text-amber-600'
                        : syncLog?.status === 'success'
                        ? 'text-emerald-600'
                        : syncLog?.status === 'error'
                        ? 'text-rose-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {syncLog?.status === 'success'
                      ? '100%'
                      : syncing
                      ? `${Math.min(99, Math.max(10, Math.round(((syncLog?.totalSynced || 0) / 196) * 100)))}%`
                      : '0%'}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      syncing
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 animate-pulse'
                        : syncLog?.status === 'success'
                        ? 'bg-gradient-to-r from-blue-600 to-emerald-500'
                        : syncLog?.status === 'error'
                        ? 'bg-rose-500'
                        : 'bg-blue-600'
                    }`}
                    style={{
                      width:
                        syncLog?.status === 'success'
                          ? '100%'
                          : syncing
                          ? `${Math.min(99, Math.max(10, Math.round(((syncLog?.totalSynced || 0) / 196) * 100)))}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>

              {/* Stats 2-column cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Sản phẩm Website
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold text-slate-900 font-mono">
                      {syncLog?.totalSynced ?? 196}
                    </span>
                    <span className="text-xs text-slate-500">/ 196 (100% trên web)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Trạng thái
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {syncing ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                        <i className="bi bi-hourglass-split animate-spin text-[11px]" />
                        Đang chạy
                      </span>
                    ) : syncLog?.status === 'success' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        <i className="bi bi-check2-circle text-[11px]" />
                        Thành công
                      </span>
                    ) : syncLog?.status === 'error' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
                        <i className="bi bi-exclamation-triangle text-[11px]" />
                        Lỗi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-full">
                        <i className="bi bi-dash-circle text-[11px]" />
                        Chờ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Terminal Log Console */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-1.5 text-xs font-mono shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <i className="bi bi-terminal text-slate-400" />
                    <span>Nhật ký tiến trình</span>
                  </span>
                  {syncing && (
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-slate-200 break-words leading-relaxed mb-0 text-xs">
                  {syncLog?.message || 'Sẵn sàng đồng bộ dữ liệu...'}
                </p>
                {syncLog?.startedAt && (
                  <p className="text-[10px] text-slate-500 mb-0 pt-1">
                    Bắt đầu: {new Date(syncLog.startedAt).toLocaleTimeString('vi-VN')} -{' '}
                    {new Date(syncLog.startedAt).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center gap-2 pt-2">
                {syncing ? (
                  <button
                    type="button"
                    onClick={handleCancelSync}
                    className="flex-1 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <i className="bi bi-stop-circle" />
                    Huỷ tiến trình
                  </button>
                ) : syncLog?.status === 'error' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleStartSync}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <i className="bi bi-arrow-repeat" />
                      Thử lại
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSyncModal(false)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Đóng
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        fetchProducts();
                        setShowSyncModal(false);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <i className="bi bi-grid-3x3-gap-fill" />
                      Xem sản phẩm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSyncModal(false)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Đóng
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </StandardPage>
  );
};

export default MarketingProductsPage;
