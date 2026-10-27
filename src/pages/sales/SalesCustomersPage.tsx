import React, { useState, useEffect, useMemo } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Offcanvas } from '../../components/common/Offcanvas';
import { getCustomerGroupInfo } from '../../utils/customerGroupUtils';
import {
  Building,
  Telephone,
  GeoAlt,
  Eye,
  Plus,
  Pencil,
  Receipt,
  FileEarmarkText,
  Person,
  CheckCircle,
  ClockHistory,
} from 'react-bootstrap-icons';

export interface CustomerItem {
  id: string;
  code?: string;
  name: string;
  address?: string;
  nhom?: string;
  loai?: string;
  daiDien?: string;
  chucVu?: string;
  dienThoai?: string;
  email?: string;
  doanhSoCamKet?: number;
  hanMucCongNo?: number;
  thuongThanhToan?: string;
  thuongDoanhSoNam?: string;
  thuongVuotDoanhSo?: string;
  nguoiChamSoc?: { id: string; fullName: string };
  contracts?: any[];
  createdAt: string;
}

export const SalesCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [search, setSearch] = useState<string>('');
  const [nhomFilter, setNhomFilter] = useState<string>('dai-ly');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    code: '',
    name: '',
    address: '',
    daiDien: '',
    chucVu: 'Giám Đốc',
    dienThoai: '',
    email: '',
    nhom: 'dai-ly-cap-1',
    loai: 'Đại lý cấp 1',
    doanhSoCamKet: 200000000,
    hanMucCongNo: 30000000,
  });

  const fetchCustomers = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(search ? { search } : {}),
      ...(nhomFilter && nhomFilter !== 'all' ? { nhom: nhomFilter } : {}),
    });

    fetch(`/api/plan-finance/customers?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.customers) {
          setCustomers(data.customers);
          setTotal(data.total || 0);
        }
      })
      .catch((err) => console.error('Lỗi nạp danh sách đại lý:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, pageSize, nhomFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCustomers();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  const formatVND = (num?: number) => {
    if (!num) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({
      id: '',
      code: `DL-${Date.now().toString().slice(-5)}`,
      name: '',
      address: '',
      daiDien: '',
      chucVu: 'Chủ đại lý',
      dienThoai: '',
      email: '',
      nhom: 'dai-ly-cap-1',
      loai: 'Đại lý cấp 1',
      doanhSoCamKet: 200000000,
      hanMucCongNo: 30000000,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c: CustomerItem) => {
    setIsEditMode(true);
    setFormData({
      id: c.id,
      code: c.code || '',
      name: c.name,
      address: c.address || '',
      daiDien: c.daiDien || '',
      chucVu: c.chucVu || 'Chủ đại lý',
      dienThoai: c.dienThoai || '',
      email: c.email || '',
      nhom: c.nhom || 'dai-ly',
      loai: c.loai || 'Đại lý',
      doanhSoCamKet: c.doanhSoCamKet || 0,
      hanMucCongNo: c.hanMucCongNo || 0,
    });
    setShowModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.dienThoai) return;

    try {
      const url = isEditMode
        ? `/api/plan-finance/customers/${formData.id}`
        : '/api/plan-finance/customers';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const tickerNews = [
    {
      badge: 'QUẢN LÝ ĐẠI LÝ',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      text: `Tổng số đại lý toàn hệ thống: <b>${total}</b> điểm bán & showroom Seajong`,
    },
    {
      badge: 'ĐỘ PHỦ THỊ TRƯỜNG',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'Mạng lưới phủ sóng 63 tỉnh thành: Miền Bắc, Miền Trung, Miền Nam',
    },
    {
      badge: 'CAM KẾT DOANH SỐ',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      text: 'Theo dõi tiến độ cam kết doanh số quý IV và hạn mức công nợ gối đầu 30 ngày',
    },
  ];

  return (
    <StandardPage
      title="Danh sách đại lý"
      badge="DEALERS"
      description="Quản lý mạng lưới đại lý phân phối thiết bị vệ sinh Seajong, cam kết doanh số và công nợ"
      icon="bi-people"
      color="blue"
      customTickerNews={tickerNews}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        {/* ── TableToolbar chuẩn theo AGENTS.MD (nằm trong card chính) ── */}
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mã ĐL, tên đại lý, người đại diện, số điện thoại, địa chỉ..."
          filters={[
            {
              value: nhomFilter,
              onChange: (v) => {
                setNhomFilter(v);
                setPage(1);
              },
              options: [
                { label: 'Tất cả đại lý', value: 'dai-ly' },
                { label: 'Đại lý cấp 1', value: 'dai-ly-cap-1' },
                { label: 'Đại lý cấp 2', value: 'dai-ly-cap-2' },
                { label: 'Showroom độc quyền', value: 'showroom' },
                { label: 'Dự án & Nhà thầu', value: 'du-an' },
                { label: 'Tất cả nhóm khách', value: 'all' },
              ],
            },
          ]}
          rightActions={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAdd}
            >
              Thêm đại lý mới
            </Button>
          }
          onRefresh={fetchCustomers}
          onExportExcel={() => alert('Đang xuất danh sách đại lý ra file Excel...')}
        />

        {/* ── FullWidthTable với sticky header chuẩn Enterprise ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <FullWidthTable
            loading={loading}
            emptyText="Không tìm thấy đại lý nào phù hợp với điều kiện lọc"
          >
            <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
              <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                  <th className="py-2.5 px-3.5 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3.5 w-28">Mã ĐL</th>
                  <th className="py-2.5 px-3.5">Tên đại lý / Doanh nghiệp</th>
                  <th className="py-2.5 px-3.5">Người đại diện</th>
                  <th className="py-2.5 px-3.5">Điện thoại</th>
                  <th className="py-2.5 px-3.5">Địa chỉ / Tỉnh thành</th>
                  <th className="py-2.5 px-3.5">Cấp đại lý</th>
                  <th className="py-2.5 px-3.5 text-right">Cam kết doanh số</th>
                  <th className="py-2.5 px-3.5 text-right">Hạn mức nợ</th>
                  <th className="py-2.5 px-3.5 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {customers.map((c, idx) => {
                const groupInfo = getCustomerGroupInfo(c.nhom);
                return (
                  <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                      {c.code || `KH-${c.id.slice(-4).toUpperCase()}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{c.name}</div>
                      {c.email && <div className="text-[11px] text-slate-400">{c.email}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-700 font-medium">{c.daiDien || c.name}</div>
                      {c.chucVu && <div className="text-[11px] text-slate-400">{c.chucVu}</div>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 font-medium">
                      {c.dienThoai || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={c.address || ''}>
                      {c.address || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold"
                        style={{
                          backgroundColor: groupInfo.badgeBg,
                          color: groupInfo.badgeText,
                          border: `1px solid ${groupInfo.badgeBorder}`,
                        }}
                      >
                        {c.loai || groupInfo.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {c.doanhSoCamKet && c.doanhSoCamKet > 0 ? formatVND(c.doanhSoCamKet) : 'Chưa cam kết'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-medium">
                      {formatVND(c.hanMucCongNo)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedCustomer(c);
                            setShowDrawer(true);
                          }}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                          title="Xem hồ sơ chi tiết"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-emerald-600 transition-colors"
                          title="Chỉnh sửa thông tin"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </FullWidthTable>
        </div>

        {/* ── Phân trang ── */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[5, 10, 15, 20, 50]}
          totalItems={total}
          pageSize={pageSize}
          itemName="đại lý"
        />
      </div>

      {/* ── DRAWER CHI TIẾT HỒ SƠ ĐẠI LÝ (ÁP DỤNG OFFCANVAS) ── */}
      <Offcanvas
        isOpen={Boolean(showDrawer && selectedCustomer)}
        onClose={() => setShowDrawer(false)}
        title={selectedCustomer?.name || 'Hồ sơ đại lý'}
        description={selectedCustomer?.code ? `Mã đại lý: ${selectedCustomer.code}` : undefined}
        icon={<Building size={20} className="text-blue-600" />}
        width="400px"
        bodyClassName="p-4 space-y-4"
        footer={
          <div className="w-full flex items-center justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDrawer(false)}
              className="text-[13px] font-semibold"
            >
              Đóng
            </Button>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-4 text-[13.5px]">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                Hồ sơ liên hệ
              </h4>
              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-xs">Người đại diện:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedCustomer.daiDien || selectedCustomer.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Số điện thoại:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {selectedCustomer.dienThoai || 'Chưa cập nhật'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Email liên hệ:</span>
                  <span className="font-semibold text-slate-800 text-[13px]">
                    {selectedCustomer.email || 'Chưa có'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Cấp phân phối:</span>
                  <span className="font-bold text-blue-600 text-[13px]">
                    {selectedCustomer.loai || 'Đại lý'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-xs">Địa chỉ:</span>
                  <span className="font-semibold text-slate-800 text-[13px]">
                    {selectedCustomer.address || 'Chưa cập nhật địa chỉ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chỉ tiêu tài chính & Cam kết */}
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 space-y-3">
              <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                Chỉ tiêu & Chính sách thưởng doanh số
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                  <span className="text-xs text-blue-700 block font-medium">Cam kết doanh số:</span>
                  <span className="font-black text-[15px] text-blue-900 font-mono">
                    {formatVND(selectedCustomer.doanhSoCamKet)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="text-xs text-emerald-700 block font-medium">Hạn mức công nợ:</span>
                  <span className="font-black text-[15px] text-emerald-900 font-mono">
                    {formatVND(selectedCustomer.hanMucCongNo)}
                  </span>
                </div>
              </div>

              {selectedCustomer.thuongThanhToan && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[13px]">
                  <span className="font-semibold text-slate-800">Thưởng thanh toán: </span>
                  {selectedCustomer.thuongThanhToan}
                </div>
              )}
              {selectedCustomer.thuongDoanhSoNam && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[13px]">
                  <span className="font-semibold text-slate-800">Thưởng năm: </span>
                  {selectedCustomer.thuongDoanhSoNam}
                </div>
              )}
            </div>

            {/* Hợp đồng */}
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 space-y-2.5">
              <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                Hợp đồng phân phối ({selectedCustomer.contracts?.length || 0})
              </h4>
              {selectedCustomer.contracts && selectedCustomer.contracts.length > 0 ? (
                selectedCustomer.contracts.map((ct: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 text-[13.5px]">{ct.code || 'HĐ-SEAJONG'}</span>
                      <span className="text-slate-400 block text-xs">
                        Ngày ký: {ct.ngayKy ? new Date(ct.ngayKy).toLocaleDateString('vi-VN') : '—'}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-emerald-600 text-sm">
                      {formatVND(ct.giaTriHopDong)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic">Chưa có hợp đồng nào được lưu trữ</p>
              )}
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── MODAL THÊM / CHỈNH SỬA ĐẠI LÝ ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                {isEditMode ? 'Chỉnh sửa thông tin đại lý' : 'Thêm mới đại lý vào hệ thống'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Tên đại lý / Doanh nghiệp *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tổng đại lý Minh Long Khánh"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mã đại lý</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Người đại diện</label>
                  <input
                    type="text"
                    placeholder="VD: Anh Minh"
                    value={formData.daiDien}
                    onChange={(e) => setFormData({ ...formData, daiDien: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chức vụ</label>
                  <input
                    type="text"
                    placeholder="VD: Giám Đốc"
                    value={formData.chucVu}
                    onChange={(e) => setFormData({ ...formData, chucVu: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0988 765 432"
                    value={formData.dienThoai}
                    onChange={(e) => setFormData({ ...formData, dienThoai: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="minhlong@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Địa chỉ kinh doanh / Showroom</label>
                <input
                  type="text"
                  placeholder="Số nhà, đường phố, quận/huyện, tỉnh/thành..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cấp đại lý</label>
                  <select
                    value={formData.loai}
                    onChange={(e) => setFormData({ ...formData, loai: e.target.value, nhom: e.target.value === 'Đại lý cấp 1' ? 'dai-ly-cap-1' : e.target.value === 'Showroom độc quyền' ? 'showroom' : 'dai-ly' })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="Đại lý cấp 1">Đại lý cấp 1</option>
                    <option value="Đại lý cấp 2">Đại lý cấp 2</option>
                    <option value="Showroom độc quyền">Showroom độc quyền</option>
                    <option value="Nhà thầu Dự án">Nhà thầu Dự án</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cam kết doanh số (VNĐ)</label>
                  <input
                    type="number"
                    step="10000000"
                    value={formData.doanhSoCamKet}
                    onChange={(e) => setFormData({ ...formData, doanhSoCamKet: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {isEditMode ? 'Lưu thay đổi' : 'Thêm mới'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StandardPage>
  );
};

export default SalesCustomersPage;
