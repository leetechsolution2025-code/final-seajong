import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Book,
  Plus,
  People,
  ShieldCheck,
  Tools,
  Briefcase,
  Layers,
  X,
  ExclamationCircle,
} from 'react-bootstrap-icons';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { EmployeeSelect } from '../../components/common/EmployeeSelect';
import { Modal } from '../../components/common/Modal';
import { DeleteButton } from '../../components/common/DeleteButton';
import { DepartmentSelect } from '../../components/common/DepartmentSelect';

export type TrainingCategory =
  | 'onboarding'
  | 'production_tech'
  | 'safety_pccc'
  | 'installation'
  | 'job_title';

export type TrainingStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

export interface TrainingCourse {
  id: string;
  code: string;
  title: string;
  category: TrainingCategory;
  categoryLabel: string;
  targetAudience: string;
  targetDept: string;
  instructorType: 'internal' | 'external';
  instructorName: string;
  instructorInfo: string;
  startDate: string;
  endDate: string;
  duration: string;
  location: string;
  maxParticipants: number;
  enrolledCount: number;
  passedCount: number;
  status: TrainingStatus;
  statusLabel: string;
  objectives: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TrainingManagementViewProps {
  onShowToast?: (type: 'success' | 'danger' | 'warning' | 'info', title: string, message: string) => void;
}

export const TRAINING_CATEGORIES: { key: TrainingCategory; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  {
    key: 'onboarding',
    label: 'Hội nhập',
    icon: <People size={13} />,
    color: '#0284c7',
    bg: '#e0f2fe',
  },
  {
    key: 'production_tech',
    label: 'Kỹ thuật sản xuất',
    icon: <Tools size={13} />,
    color: '#059669',
    bg: '#d1fae5',
  },
  {
    key: 'safety_pccc',
    label: 'An toàn lao động và PCCC',
    icon: <ShieldCheck size={13} />,
    color: '#dc2626',
    bg: '#fee2e2',
  },
  {
    key: 'installation',
    label: 'Lắp dựng và Nghiệm thu',
    icon: <Layers size={13} />,
    color: '#d97706',
    bg: '#fef3c7',
  },
  {
    key: 'job_title',
    label: 'Theo chức danh (QL và VP)',
    icon: <Briefcase size={13} />,
    color: '#7c3aed',
    bg: '#ede9fe',
  },
];

export const TrainingManagementView: React.FC<TrainingManagementViewProps> = ({ onShowToast }) => {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(false);

  // Bộ lọc
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Checkbox chọn nhiều dòng
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Offcanvas tạo / chỉnh sửa khóa đào tạo
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formCategory, setFormCategory] = useState<TrainingCategory>('production_tech');
  const [formTitle, setFormTitle] = useState('');
  const [formTargetAudience, setFormTargetAudience] = useState('');
  const [formTargetDept, setFormTargetDept] = useState('Phòng Kinh doanh');
  const [formInstructorType, setFormInstructorType] = useState<'internal' | 'external'>('internal');
  const [formInstructorName, setFormInstructorName] = useState('');
  const [formInstructorInfo, setFormInstructorInfo] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDuration, setFormDuration] = useState('02 ngày (12 giờ)');
  const [formLocation, setFormLocation] = useState('Phòng họp số 1 - Tầng 2');
  const [formMaxParticipants, setFormMaxParticipants] = useState('20');
  const [formEnrolledCount, setFormEnrolledCount] = useState('15');
  const [formStatus, setFormStatus] = useState<TrainingStatus>('upcoming');
  const [formObjectives, setFormObjectives] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Modal xác nhận xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<TrainingCourse | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/training/courses');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCourses(data);
        } else if (Array.isArray(data?.data)) {
          setCourses(data.data);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách khóa đào tạo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
    const interval = setInterval(fetchCourses, 5000);
    return () => clearInterval(interval);
  }, [fetchCourses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (activeCategoryFilter !== 'all' && c.category !== activeCategoryFilter) {
        return false;
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = (c.code || '').toLowerCase().includes(q);
        const matchTitle = (c.title || '').toLowerCase().includes(q);
        const matchInstructor = (c.instructorName || '').toLowerCase().includes(q);
        const matchAudience = (c.targetAudience || '').toLowerCase().includes(q);
        const matchLocation = (c.location || '').toLowerCase().includes(q);
        return matchCode || matchTitle || matchInstructor || matchAudience || matchLocation;
      }
      return true;
    });
  }, [courses, activeCategoryFilter, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredCourses.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedCourses = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, safeCurrentPage, pageSize]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(pagedCourses.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setFormCategory('production_tech');
    setFormTitle('');
    setFormTargetAudience('');
    setFormTargetDept('Phòng Kinh doanh');
    setFormInstructorType('internal');
    setFormInstructorName('');
    setFormInstructorInfo('');

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    setFormStartDate(todayStr);
    setFormEndDate(todayStr);

    setFormDuration('02 ngày (12 giờ)');
    setFormLocation('Phòng họp số 1 - Tầng 2');
    setFormMaxParticipants('20');
    setFormEnrolledCount('15');
    setFormStatus('upcoming');
    setFormObjectives('');
    setFormNotes('');
    setIsOffcanvasOpen(true);
  };

  const handleOpenEdit = (course: TrainingCourse) => {
    setEditingCourse(course);
    setFormCategory(course.category);
    setFormTitle(course.title);
    setFormTargetAudience(course.targetAudience);
    setFormTargetDept(course.targetDept);
    setFormInstructorType(course.instructorType || 'internal');
    setFormInstructorName(course.instructorName);
    setFormInstructorInfo(course.instructorInfo);

    const toDateInput = (str: string) => {
      if (!str) return '';
      if (str.includes('/')) {
        const p = str.split('/');
        if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
      return str;
    };

    setFormStartDate(toDateInput(course.startDate));
    setFormEndDate(toDateInput(course.endDate));
    setFormDuration(course.duration);
    setFormLocation(course.location);
    setFormMaxParticipants(String(course.maxParticipants || 20));
    setFormEnrolledCount(String(course.enrolledCount || 0));
    setFormStatus(course.status);
    setFormObjectives(course.objectives || '');
    setFormNotes(course.notes || '');
    setIsOffcanvasOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập tên khóa đào tạo.');
      return;
    }

    const catMeta = TRAINING_CATEGORIES.find((c) => c.key === formCategory);
    const categoryLabel = catMeta ? catMeta.label : 'Kỹ thuật sản xuất';

    const statusLabels: Record<TrainingStatus, string> = {
      upcoming: 'Sắp diễn ra',
      in_progress: 'Đang diễn ra',
      completed: 'Đã hoàn thành',
      cancelled: 'Tạm hoãn',
    };

    const toVNDate = (str: string) => {
      if (!str) return '';
      if (str.includes('-')) {
        const [y, m, d] = str.split('-');
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      }
      return str;
    };

    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      categoryLabel,
      targetAudience: formTargetAudience.trim() || 'Cán bộ công nhân viên',
      targetDept: formTargetDept.trim() || 'Toàn công ty',
      instructorType: formInstructorType,
      instructorName: formInstructorName.trim() || 'Chuyên gia nội bộ',
      instructorInfo: formInstructorInfo.trim(),
      startDate: toVNDate(formStartDate),
      endDate: toVNDate(formEndDate),
      duration: formDuration.trim() || '01 ngày',
      location: formLocation.trim() || 'Tại công ty',
      maxParticipants: parseInt(formMaxParticipants, 10) || 20,
      enrolledCount: parseInt(formEnrolledCount, 10) || 0,
      passedCount: formStatus === 'completed' ? parseInt(formEnrolledCount, 10) || 0 : 0,
      status: formStatus,
      statusLabel: statusLabels[formStatus],
      objectives: formObjectives.trim(),
      notes: formNotes.trim(),
    };

    try {
      setSubmitting(true);
      if (editingCourse) {
        await fetch(`/api/training/courses/${editingCourse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        onShowToast?.(
          'success',
          'Đã cập nhật khóa đào tạo',
          `Khóa "${formTitle}" đã được lưu thành công.`
        );
      } else {
        const nextNum = courses.length + 1;
        const newCode = `ĐT-2026-${String(nextNum).padStart(3, '0')}`;
        await fetch('/api/training/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            code: newCode,
          }),
        });
        onShowToast?.(
          'success',
          'Đã lập khóa đào tạo mới',
          `Khóa "${formTitle}" (${newCode}) đã được tạo vào hệ thống.`
        );
      }

      await fetchCourses();
      setIsOffcanvasOpen(false);
    } catch (err) {
      console.error('Lỗi khi lưu khóa đào tạo:', err);
      onShowToast?.('danger', 'Lỗi lưu dữ liệu', 'Không thể lưu khóa đào tạo vào CSDL.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    try {
      await fetch(`/api/training/courses/${courseToDelete.id}`, { method: 'DELETE' });
      await fetchCourses();
      setSelectedIds((prev) => prev.filter((id) => id !== courseToDelete.id));
      onShowToast?.(
        'success',
        'Đã xóa khóa đào tạo',
        `Đã xóa khóa "${courseToDelete.title}" khỏi hệ thống.`
      );
    } catch (err) {
      console.error('Lỗi xóa khóa đào tạo:', err);
    } finally {
      setCourseToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const count = selectedIds.length;
      await fetch('/api/training/courses/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      await fetchCourses();
      setSelectedIds([]);
      onShowToast?.(
        'success',
        'Đã xóa thành công',
        `Đã xóa ${count} khóa đào tạo khỏi CSDL.`
      );
    } catch (err) {
      console.error('Lỗi xóa hàng loạt:', err);
    }
  };

  const renderStatusBadge = (status: TrainingStatus, label: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">{label || 'Đã hoàn thành'}</Badge>;
      case 'in_progress':
        return <Badge variant="warning">{label || 'Đang diễn ra'}</Badge>;
      case 'upcoming':
        return <Badge variant="info">{label || 'Sắp diễn ra'}</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">{label || 'Tạm hoãn'}</Badge>;
      default:
        return <Badge variant="neutral">{label}</Badge>;
    }
  };

  const renderCategoryTag = (category: TrainingCategory, label: string) => {
    const meta = TRAINING_CATEGORIES.find((c) => c.key === category);
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '1px 6px',
          borderRadius: '4px',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: meta?.color || '#475569',
          backgroundColor: meta?.bg || '#f1f5f9',
          whiteSpace: 'nowrap',
        }}
      >
        {meta?.icon}
        <span>{label}</span>
      </span>
    );
  };

  const toolbarCategoryFilters = useMemo(() => {
    return [
      {
        id: 'category-filter',
        value: activeCategoryFilter,
        onChange: (val: string) => {
          setActiveCategoryFilter(val);
          setCurrentPage(1);
        },
        options: [
          { value: 'all', label: 'Tất cả loại hình' },
          { value: 'onboarding', label: '1. Đào tạo Hội nhập' },
          { value: 'production_tech', label: '2. Kỹ thuật sản xuất' },
          { value: 'safety_pccc', label: '3. ATLĐ VÀ PCCC' },
          { value: 'installation', label: '4. Lắp dựng và Nghiệm thu' },
          { value: 'job_title', label: '5. Theo chức danh (QL và VP)' },
        ],
        minWidth: '185px',
      },
      {
        id: 'status-filter',
        value: statusFilter,
        onChange: (val: string) => {
          setStatusFilter(val);
          setCurrentPage(1);
        },
        options: [
          { value: 'all', label: 'Tất cả trạng thái' },
          { value: 'upcoming', label: 'Sắp diễn ra' },
          { value: 'in_progress', label: 'Đang diễn ra' },
          { value: 'completed', label: 'Đã hoàn thành' },
          { value: 'cancelled', label: 'Tạm hoãn' },
        ],
        minWidth: '155px',
      },
    ];
  }, [activeCategoryFilter, statusFilter]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '100%',
        backgroundColor: 'var(--bg-surface-1, #ffffff)',
        fontFamily: "'Roboto Condensed', sans-serif",
      }}
    >
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm kiếm trong kế hoạch đào tạo..."
        filters={toolbarCategoryFilters}
        actionsAfterSearch={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={handleOpenCreate}
              style={{ whiteSpace: 'nowrap' }}
            >
              Lập khóa đào tạo
            </Button>

            <DeleteButton
              size="sm"
              itemCount={selectedIds.length}
              disabled={selectedIds.length === 0}
              onConfirm={handleBulkDelete}
              dialogTitle="Xác nhận xoá kế hoạch đào tạo"
              dialogMessage={
                selectedIds.length > 0
                  ? `Bạn có chắc chắn muốn xóa ${selectedIds.length} kế hoạch đào tạo đã chọn khỏi cơ sở dữ liệu? Hành động này không thể hoàn tác.`
                  : 'Bạn có chắc chắn muốn xóa khóa đào tạo này khỏi cơ sở dữ liệu?'
              }
              title={
                selectedIds.length === 0
                  ? 'Chọn ít nhất một dòng trong bảng để xoá'
                  : `Xoá ${selectedIds.length} khóa đào tạo đã chọn`
              }
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
            tableLayout: 'fixed',
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
                borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                color: 'var(--text-muted, #64748b)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              <th style={{ width: '40px', padding: '10px 14px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={
                    pagedCourses.length > 0 &&
                    pagedCourses.every((c) => selectedIds.includes(c.id))
                  }
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '10px 14px' }}>KHÓA ĐÀO TẠO VÀ PHÂN LOẠI</th>
              <th style={{ width: '260px', padding: '10px 14px' }}>ĐỐI TƯỢNG THAM GIA</th>
              <th style={{ width: '260px', padding: '10px 14px' }}>ĐƠN VỊ PHỤ TRÁCH</th>
            </tr>
          </thead>
          <tbody>
            {loading && courses.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Đang tải danh sách khóa đào tạo...
                </td>
              </tr>
            ) : pagedCourses.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'var(--text-muted, #64748b)',
                    fontSize: '0.875rem',
                  }}
                >
                  Không tìm thấy khóa đào tạo nào phù hợp.
                </td>
              </tr>
            ) : (
              pagedCourses.map((course) => {
                const isSelected = selectedIds.includes(course.id);
                return (
                  <tr
                    key={course.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                      backgroundColor: isSelected ? 'var(--bg-surface-3, #f5f3ff)' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleOpenEdit(course)}
                  >
                    <td
                      style={{ padding: '10px 14px', textAlign: 'center' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(course.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    <td style={{ padding: '10px 14px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                              color: '#64748b',
                              backgroundColor: '#f1f5f9',
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}
                          >
                            {course.code}
                          </span>
                          {renderCategoryTag(course.category, course.categoryLabel)}
                          {renderStatusBadge(course.status, course.statusLabel)}
                        </div>
                        <span
                          style={{
                            fontWeight: 700,
                            color: 'var(--text-primary, #0f172a)',
                            fontSize: '0.85rem',
                            lineHeight: 1.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                          title={course.title}
                        >
                          {course.title}
                        </span>
                        {course.objectives && (
                          <span
                            style={{
                              fontSize: '0.74rem',
                              color: 'var(--text-muted, #64748b)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                            title={`Mục tiêu: ${course.objectives}`}
                          >
                            Mục tiêu: {course.objectives}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '10px 14px', width: '260px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-primary, #1e293b)',
                            fontSize: '0.8125rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                          title={course.targetAudience}
                        >
                          {course.targetAudience}
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary, #64748b)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                              minWidth: 0,
                            }}
                            title={course.targetDept}
                          >
                            {course.targetDept}
                          </span>
                          <span style={{ flexShrink: 0 }}>•</span>
                          <span style={{ color: '#7c3aed', fontWeight: 600, flexShrink: 0 }}>
                            Sĩ số: {course.enrolledCount}/{course.maxParticipants}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '10px 14px', width: '260px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: course.instructorType === 'external' ? '#fed7aa' : '#ede9fe',
                            color: course.instructorType === 'external' ? '#c2410c' : '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            flexShrink: 0,
                          }}
                        >
                          {course.instructorName ? course.instructorName.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-primary, #1e293b)',
                              fontSize: '0.8125rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                            title={course.instructorName}
                          >
                            {course.instructorName}
                          </span>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              color: 'var(--text-muted, #64748b)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                            title={course.instructorInfo || (course.instructorType === 'external' ? 'Chuyên gia ngoài' : 'Cán bộ nội bộ')}
                          >
                            {course.instructorInfo || (course.instructorType === 'external' ? 'Chuyên gia ngoài' : 'Cán bộ nội bộ')}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </FullWidthTable>

      <Pagination
        currentPage={safeCurrentPage}
        totalItems={filteredCourses.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        pageSizeOptions={[5, 10, 20, 50]}
        style={{
          borderTop: '1px solid var(--border-default, #e2e8f0)',
          padding: '8px 20px',
          flexShrink: 0,
        }}
      />

      {isOffcanvasOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOffcanvasOpen(false);
          }}
        >
          <div
            style={{
              width: '400px',
              maxWidth: '90vw',
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideLeft 0.25s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: 'var(--bg-surface-2, #f8fafc)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-primary, #0284c7)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Book size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {editingCourse ? 'Chỉnh sửa khóa đào tạo' : 'Lập khóa đào tạo mới'}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {editingCourse ? `Mã: ${editingCourse.code}` : 'Chương trình đào tạo nâng cao chuyên môn Seajong'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOffcanvasOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveCourse}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '5px' }}>
                  Loại hình đào tạo <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                  {TRAINING_CATEGORIES.map((cat, idx) => {
                    const isSelected = formCategory === cat.key;
                    const isLast = idx === TRAINING_CATEGORIES.length - 1;
                    return (
                      <div
                        key={cat.key}
                        onClick={() => setFormCategory(cat.key)}
                        style={{
                          gridColumn: isLast ? 'span 2' : 'auto',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: isSelected ? `2px solid ${cat.color}` : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? cat.bg : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ color: cat.color }}>{cat.icon}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? 800 : 600, color: '#1e293b' }}>
                          {cat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  Tên khóa đào tạo <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đào tạo kiến thức sản phẩm Sen cây phím đàn 2026..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  Đối tượng tham gia
                </label>
                <input
                  type="text"
                  placeholder="VD: Chuyên viên Kinh doanh, Đội Thi công Showroom..."
                  value={formTargetAudience}
                  onChange={(e) => setFormTargetAudience(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  Phòng ban / Bộ phận
                </label>
                <DepartmentSelect
                  value={formTargetDept}
                  onChange={(e) => setFormTargetDept(e.target.value)}
                  style={{ height: '34px', fontSize: '0.8125rem' }}
                />
              </div>

              <div
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    Giảng viên / Người đào tạo
                  </label>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="instructorType"
                        checked={formInstructorType === 'internal'}
                        onChange={() => setFormInstructorType('internal')}
                        style={{ accentColor: 'var(--color-primary, #0284c7)' }}
                      />
                      <span>Nội bộ</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="instructorType"
                        checked={formInstructorType === 'external'}
                        onChange={() => setFormInstructorType('external')}
                        style={{ accentColor: 'var(--color-primary, #0284c7)' }}
                      />
                      <span>Thuê ngoài</span>
                    </label>
                  </div>
                </div>

                {formInstructorType === 'internal' ? (
                  <div>
                    <EmployeeSelect
                      label=""
                      placeholder="Chọn cán bộ hướng dẫn..."
                      value={formInstructorName}
                      onChange={(val) => setFormInstructorName(val)}
                      multiple={false}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Tên giảng viên / Chuyên gia..."
                      value={formInstructorName}
                      onChange={(e) => setFormInstructorName(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '4px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8125rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: "'Roboto Condensed', sans-serif",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Đơn vị / Cơ quan đào tạo..."
                      value={formInstructorInfo}
                      onChange={(e) => setFormInstructorInfo(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '4px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8125rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: "'Roboto Condensed', sans-serif",
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '4px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '4px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  Thời lượng
                </label>
                <input
                  type="text"
                  placeholder="VD: 03 ngày (18 giờ)"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  Địa điểm tổ chức
                </label>
                <input
                  type="text"
                  placeholder="VD: Showroom Trung tâm, Phòng họp Tầng 2..."
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                    Sĩ số tối đa
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxParticipants}
                    onChange={(e) => setFormMaxParticipants(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                    Đã đăng ký
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formEnrolledCount}
                    onChange={(e) => setFormEnrolledCount(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  Trạng thái khóa đào tạo
                </label>
                <Select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as TrainingStatus)}
                  style={{ height: '34px', fontSize: '0.8125rem' }}
                >
                  <option value="upcoming">Sắp diễn ra</option>
                  <option value="in_progress">Đang diễn ra</option>
                  <option value="completed">Đã hoàn thành</option>
                  <option value="cancelled">Tạm hoãn</option>
                </Select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  Mục tiêu đào tạo và Nội dung yêu cầu đạt
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ mục tiêu đào tạo..."
                  value={formObjectives}
                  onChange={(e) => setFormObjectives(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: "'Roboto Condensed', sans-serif",
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e2e8f0',
                  marginTop: 'auto',
                }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsOffcanvasOpen(false)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={submitting}
                  style={{
                    fontWeight: 700,
                  }}
                >
                  {submitting ? 'Đang lưu...' : editingCourse ? 'Lưu thay đổi' : 'Tạo khóa đào tạo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && courseToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Xác nhận xóa khóa đào tạo"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#e11d48' }}>
              <ExclamationCircle size={24} />
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                Bạn có chắc chắn muốn xóa khóa học này?
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
              Khóa đào tạo: <strong>{courseToDelete.title}</strong> ({courseToDelete.code}) sẽ bị xóa vĩnh viễn khỏi CSDL.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default TrainingManagementView;

