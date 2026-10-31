import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  PersonBadge,
  Telephone,
  Envelope,
} from 'react-bootstrap-icons';
import StandardPage from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DeleteButton } from '../../components/common/DeleteButton';
import { DepartmentSelect } from '../../components/common/DepartmentSelect';
import { EmployeeSelect } from '../../components/common/EmployeeSelect';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Offcanvas } from '../../components/common/Offcanvas';

interface ProbationRecord {
  id: string;
  code: string;
  title: string;
  sub: string;
  department: string;
  owner: string;
  supervisorName: string;
  supervisorDept: string;
  supervisorRole: string;
  phone: string;
  email: string;
  date: string;
  status: string;
  statusLabel: string;
  progress: number;
  description: string;
  attitudeScore?: number;
  skillScore?: number;
  kpiScore?: number;
}

const normalizeProbationStatus = (rawStatus?: string, rawLabel?: string) => {
  const s = (rawStatus || '').toLowerCase();
  const l = (rawLabel || '').toLowerCase();
  if (s === 'passed' || s.includes('đạt') || l.includes('đạt yêu cầu')) {
    return { key: 'passed', label: 'Đạt yêu cầu' };
  }
  if (s === 'failed' || s.includes('không đạt') || l.includes('không đạt')) {
    return { key: 'failed', label: 'Không đạt' };
  }
  return { key: 'active', label: 'Đang thử việc' };
};

export const ProbationPage: React.FC = () => {
  const [records, setRecords] = useState<ProbationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Offcanvas state
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ProbationRecord | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPosition, setFormPosition] = useState<string>('');
  const [formDepartment, setFormDepartment] = useState<string>('Phòng Kinh doanh');
  const [formSupervisor, setFormSupervisor] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('active');
  const [formProgress, setFormProgress] = useState<string>('80');
  const [formDescription, setFormDescription] = useState<string>('');

  const fetchProbationItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/hr-items?category=probation');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: ProbationRecord[] = data.map((r: any, idx: number) => {
            const extra = r.extra || {};
            const norm = normalizeProbationStatus(r.status || extra.status, extra.statusLabel || r.status);
            return {
              id: r.id,
              code: extra.code || r.empCode || r.code || `TV-${String(idx + 1).padStart(3, '0')}`,
              title: r.title || extra.col1 || r.col1 || 'Nhân sự thử việc',
              sub: r.sub || extra.col2 || r.col2 || 'Chuyên viên',
              department: r.department || extra.supervisorDept || 'Phòng Kinh doanh',
              owner: r.owner || extra.col3 || r.col3 || 'Chưa phân công',
              supervisorName: extra.supervisorName || r.owner || extra.col3 || '',
              supervisorDept: extra.supervisorDept || r.department || '',
              supervisorRole: extra.supervisorRole || 'Quản lý trực tiếp',
              phone: r.phone || extra.phone || '',
              email: r.email || extra.email || '',
              date: r.date || extra.col4 || r.col4 || '01/09/2026 - 31/10/2026',
              status: norm.key,
              statusLabel: norm.label,
              progress: Number(r.progress ?? 75),
              description: r.description || '',
              attitudeScore: extra.attitudeScore,
              skillScore: extra.skillScore,
              kpiScore: extra.kpiScore,
            };
          });
          setRecords(mapped);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách thử việc:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProbationItems();
    const handler = () => fetchProbationItems();
    window.addEventListener('decodoor_admin_hr_items_updated', handler);
    return () => window.removeEventListener('decodoor_admin_hr_items_updated', handler);
  }, [fetchProbationItems]);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (deptFilter !== 'all' && item.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.sub.toLowerCase().includes(q) ||
          item.owner.toLowerCase().includes(q) ||
          item.phone.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, statusFilter, deptFilter, searchQuery]);

  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const toInputDate = (vnDate: string) => {
    const clean = (vnDate || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const parts = clean.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return '';
  };

  const toVNDate = (isoDate: string) => {
    if (!isoDate) return '';
    if (isoDate.includes('/')) return isoDate;
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    return isoDate;
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPosition('');
    setFormDepartment('Phòng Kinh doanh');
    setFormSupervisor('');
    const today = new Date();
    const after60 = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    setFormStartDate(today.toISOString().slice(0, 10));
    setFormEndDate(after60.toISOString().slice(0, 10));
    setFormStatus('active');
    setFormProgress('80');
    setFormDescription('');
    setIsOffcanvasOpen(true);
  };

  const handleOpenEdit = (item: ProbationRecord) => {
    setEditingItem(item);
    setFormName(item.title);
    setFormPhone(item.phone);
    setFormEmail(item.email);
    setFormPosition(item.sub);
    setFormDepartment(item.department);
    setFormSupervisor(item.owner === 'Chưa phân công' ? '' : item.owner);
    const rangeParts = (item.date || '').split('-').map((s) => s.trim());
    setFormStartDate(toInputDate(rangeParts[0] || '') || '2026-09-01');
    setFormEndDate(toInputDate(rangeParts[1] || '') || '2026-10-31');
    setFormStatus(item.status);
    setFormProgress(String(item.progress || 80));
    setFormDescription(item.description || '');
    setIsOffcanvasOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const statusMap: Record<string, string> = {
      active: 'Đang thử việc',
      passed: 'Đạt yêu cầu',
      failed: 'Không đạt',
    };
    const statusLabel = statusMap[formStatus] || 'Đang thử việc';
    const dateRange = `${toVNDate(formStartDate)} - ${toVNDate(formEndDate)}`;
    const progressNum = Math.min(100, Math.max(0, Number(formProgress) || 0));

    try {
      setSubmitting(true);
      if (editingItem) {
        await fetch(`/api/admin/hr-items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'probation',
            title: formName.trim(),
            sub: formPosition.trim(),
            department: formDepartment,
            owner: formSupervisor.trim() || 'Chưa phân công',
            phone: formPhone.trim(),
            email: formEmail.trim(),
            date: dateRange,
            status: statusLabel,
            progress: progressNum,
            description: formDescription.trim(),
            extra: {
              code: editingItem.code,
              col1: formName.trim(),
              col2: formPosition.trim(),
              col3: formSupervisor.trim() || 'Chưa phân công',
              supervisorName: formSupervisor.trim(),
              supervisorDept: formDepartment,
              col4: dateRange,
              status: formStatus,
              statusLabel,
            },
          }),
        });
      } else {
        const nextCode = `TV-${String(records.length + 1).padStart(3, '0')}`;
        await fetch('/api/admin/hr-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `PROB-${Date.now()}`,
            category: 'probation',
            title: formName.trim(),
            sub: formPosition.trim(),
            department: formDepartment,
            owner: formSupervisor.trim() || 'Chưa phân công',
            phone: formPhone.trim(),
            email: formEmail.trim(),
            date: dateRange,
            status: statusLabel,
            progress: progressNum,
            description: formDescription.trim(),
            extra: {
              code: nextCode,
              col1: formName.trim(),
              col2: formPosition.trim(),
              col3: formSupervisor.trim() || 'Chưa phân công',
              supervisorName: formSupervisor.trim(),
              supervisorDept: formDepartment,
              col4: dateRange,
              status: formStatus,
              statusLabel,
            },
          }),
        });
      }
      await fetchProbationItems();
      setIsOffcanvasOpen(false);
    } catch (err) {
      console.error('Lỗi lưu hồ sơ thử việc:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await fetch('/api/admin/hr-items/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      await fetchProbationItems();
      setSelectedIds([]);
    } catch (err) {
      console.error('Lỗi xóa hồ sơ thử việc:', err);
    }
  };

  const renderStatusBadge = (status: string, label: string) => {
    if (status === 'passed') {
      return <Badge variant="success">{label}</Badge>;
    }
    if (status === 'failed') {
      return <Badge variant="danger">{label}</Badge>;
    }
    return <Badge variant="warning">{label}</Badge>;
  };

  return (
    <StandardPage
      title="Theo dõi thử việc"
      badge="NHÂN SỰ"
      description="Theo dõi lộ trình thử việc, người hướng dẫn kèm cặp và đánh giá kết quả trước khi ký hợp đồng chính thức."
      icon="bi-person-check"
      color="rose"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: '100%',
          backgroundColor: '#ffffff',
        }}
      >
        <TableToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Tìm theo mã, tên nhân sự thử việc, vị trí, người hướng dẫn..."
          actionsBeforeSearch={
            <div style={{ minWidth: '180px' }}>
              <DepartmentSelect
                includeAllOption
                allOptionLabel="Tất cả phòng ban"
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ marginBottom: 0 }}
              />
            </div>
          }
          filters={[
            {
              id: 'probation-status',
              value: statusFilter,
              onChange: (val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              },
              minWidth: '160px',
              options: [
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Đang thử việc' },
                { value: 'passed', label: 'Đạt yêu cầu' },
                { value: 'failed', label: 'Không đạt' },
              ],
            },
          ]}
          rightActions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenCreate}
                style={{ gap: '6px', fontWeight: 700 }}
              >
                <Plus size={16} />
                <span>Thêm thử việc</span>
              </Button>
              <DeleteButton
                size="sm"
                label="Xoá"
                itemCount={selectedIds.length}
                disabled={selectedIds.length === 0}
                onConfirm={handleBulkDelete}
                dialogTitle="Xác nhận xoá hồ sơ thử việc"
                dialogMessage={`Bạn có chắc chắn muốn xoá ${selectedIds.length} hồ sơ thử việc đã chọn khỏi hệ thống?`}
              />
            </div>
          }
          style={{
            marginBottom: 0,
            padding: '8px',
            borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
            flexShrink: 0,
          }}
        />

        <FullWidthTable>
          <table
            className="custom-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
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
                  borderBottom: '1px solid var(--border-default, #e2e8f0)',
                  color: 'var(--text-secondary, #64748b)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                <th style={{ width: '42px', padding: '10px 14px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={
                      pagedRecords.length > 0 &&
                      pagedRecords.every((r) => selectedIds.includes(r.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(pagedRecords.map((r) => r.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '10px 14px', minWidth: '250px' }}>NHÂN SỰ THỬ VIỆC</th>
                <th style={{ padding: '10px 14px', minWidth: '220px' }}>VỊ TRÍ & PHÒNG BAN</th>
                <th style={{ padding: '10px 14px', minWidth: '200px' }}>NGƯỜI HƯỚNG DẪN</th>
                <th style={{ padding: '10px 14px', width: '190px' }}>THỜI GIAN THỬ VIỆC</th>
                <th style={{ padding: '10px 14px', width: '140px', textAlign: 'center' }}>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    Đang tải danh sách theo dõi thử việc...
                  </td>
                </tr>
              ) : pagedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    Không tìm thấy hồ sơ thử việc nào phù hợp.
                  </td>
                </tr>
              ) : (
                pagedRecords.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenEdit(item)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <td
                        style={{ padding: '10px 14px', textAlign: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id]
                            );
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                              color: '#0284c7',
                              backgroundColor: '#e0f2fe',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {item.code}
                          </span>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                            {item.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.74rem', color: '#64748b' }}>
                          {item.phone && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Telephone size={11} style={{ color: '#0284c7' }} />
                              <span>{item.phone}</span>
                            </span>
                          )}
                          {item.email && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Envelope size={11} style={{ color: '#0284c7' }} />
                              <span>{item.email}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.825rem' }}>
                          {item.sub}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{item.department}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.825rem' }}>
                          {item.owner}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                          Tiến độ hội nhập: <strong style={{ color: '#0284c7' }}>{item.progress}%</strong>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155', fontSize: '0.8125rem' }}>
                        {item.date}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {renderStatusBadge(item.status, item.statusLabel)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </FullWidthTable>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredRecords.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          style={{
            borderTop: '1px solid var(--border-default, #e2e8f0)',
            padding: '8px 20px',
            flexShrink: 0,
          }}
        />

        <Offcanvas
          isOpen={isOffcanvasOpen}
          onClose={() => setIsOffcanvasOpen(false)}
          icon={<PersonBadge size={20} />}
          title={editingItem ? `Cập nhật thử việc: ${editingItem.code}` : 'Thêm hồ sơ thử việc mới'}
          description="Theo dõi kết quả đào tạo thử việc và đánh giá nhân sự"
          position="right"
          width="400px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
              <Button variant="outline" onClick={() => setIsOffcanvasOpen(false)}>
                Đóng
              </Button>
              <Button
                type="submit"
                form="probation-form"
                variant="primary"
                disabled={submitting}
                style={{ fontWeight: 700 }}
              >
                {submitting ? 'Đang lưu...' : editingItem ? 'Lưu thay đổi' : 'Tạo hồ sơ thử việc'}
              </Button>
            </div>
          }
        >
          <form
            id="probation-form"
            onSubmit={handleSave}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <Input
              label="Họ và tên nhân sự thử việc"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Nhập họ tên nhân sự..."
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="Số điện thoại"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="098..."
              />
              <Input
                label="Email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@seajong.vn"
              />
            </div>

            <Input
              label="Vị trí chức danh thử việc"
              required
              value={formPosition}
              onChange={(e) => setFormPosition(e.target.value)}
              placeholder="VD: Chuyên viên Kinh doanh Showroom"
            />

            <DepartmentSelect
              label="Phòng ban / Bộ phận"
              required
              value={formDepartment}
              onChange={(e) => setFormDepartment(e.target.value)}
            />

            <EmployeeSelect
              label="Người hướng dẫn kèm cặp"
              value={formSupervisor}
              onChange={(val) => setFormSupervisor(val)}
              placeholder="Chọn cán bộ hướng dẫn..."
              multiple={false}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="Từ ngày"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
              />
              <Input
                label="Đến ngày"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="Tiến độ hoàn thành (%)"
                type="number"
                min="0"
                max="100"
                value={formProgress}
                onChange={(e) => setFormProgress(e.target.value)}
              />
              <Select
                label="Kết quả thử việc"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="active">Đang thử việc</option>
                <option value="passed">Đạt yêu cầu</option>
                <option value="failed">Không đạt</option>
              </Select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                Đánh giá chuyên môn & Nhận xét
              </label>
              <textarea
                rows={4}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ghi nhận kết quả công việc trong thời gian thử việc..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: "'Roboto Condensed', sans-serif",
                }}
              />
            </div>
          </form>
        </Offcanvas>
      </div>
    </StandardPage>
  );
};

export default ProbationPage;

