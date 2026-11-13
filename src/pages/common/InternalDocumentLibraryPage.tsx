import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  PlusLg,
  Star,
  StarFill,
  Eye,
  Download,
  PencilSquare,
  Trash,
  CloudArrowUp,
  FileEarmarkPdf,
  FileEarmarkWord,
  FileEarmarkExcel,
  FileEarmarkImage,
  FileEarmarkZip,
  FileEarmarkText,
  Folder2Open,
  BoxArrowUpRight,
  X,
  ArrowRepeat,
  ShieldLock,
  Globe2,
  Building,
} from 'react-bootstrap-icons';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination, getStoredPageSize } from '../../components/common/Pagination';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select, type SelectOption } from '../../components/common/Select';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types';

export type ArchiveCategory = 'executive' | 'legal_cert' | 'sop' | 'template' | 'technical';
export type ArchiveStatus = 'active' | 'archived';
export type ArchiveVisibility = 'company' | 'managers' | 'department';

export interface InternalArchiveDocument {
  id: string;
  code: string;
  title: string;
  category: ArchiveCategory;
  departmentCode: string;
  departmentName: string;
  version: string;
  effectiveDate: string;
  status: ArchiveStatus;
  visibility: ArchiveVisibility;
  summary: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  isPinned: boolean;
  downloadCount: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

interface InternalDocumentLibraryPageProps {
  deptCode?: string;
  user?: User | null;
}

interface CategoryConfig {
  id: ArchiveCategory;
  label: string;
  shortLabel: string;
  codePrefix: string;
  badgeClass: string;
}

const ARCHIVE_CATEGORIES: CategoryConfig[] = [
  {
    id: 'executive',
    label: 'Văn bản điều hành & Quyết định BGĐ',
    shortLabel: 'Văn bản điều hành',
    codePrefix: 'QĐ',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  },
  {
    id: 'legal_cert',
    label: 'Hồ sơ Pháp lý & Chứng nhận CO/CQ',
    shortLabel: 'Pháp lý & CO/CQ',
    codePrefix: 'PL',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
  {
    id: 'sop',
    label: 'Quy trình vận hành chuẩn (SOP)',
    shortLabel: 'Quy trình SOP',
    codePrefix: 'QT',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  {
    id: 'template',
    label: 'Kho Biểu mẫu gốc toàn công ty',
    shortLabel: 'Biểu mẫu chuẩn',
    codePrefix: 'BM',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
  },
  {
    id: 'technical',
    label: 'Tài liệu Kỹ thuật & Hướng dẫn lắp đặt',
    shortLabel: 'Kỹ thuật & Lắp đặt',
    codePrefix: 'KT',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200/80',
  },
];

const DEPARTMENT_OPTIONS: SelectOption[] = [
  { value: 'board', label: 'Ban Giám đốc' },
  { value: 'sales', label: 'Phòng Kinh doanh' },
  { value: 'marketing', label: 'Phòng Marketing' },
  { value: 'logistics', label: 'Kho vận & Giao nhận' },
  { value: 'accounting', label: 'Tài chính - Kế toán' },
  { value: 'hr', label: 'Hành chính - Nhân sự' },
  { value: 'production', label: 'Xưởng Lắp ráp & Sản xuất' },
  { value: 'qa', label: 'Đảm bảo chất lượng (QA/QC)' },
  { value: 'general', label: 'Toàn công ty' },
];

const FILTER_DEPT_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả bộ phận ban hành' },
  ...DEPARTMENT_OPTIONS,
];

const FILTER_STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả hiệu lực' },
  { value: 'active', label: 'Đang hiệu lực' },
  { value: 'archived', label: 'Hết hiệu lực / Lưu trữ' },
];

const STATUS_FORM_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Đang hiệu lực' },
  { value: 'archived', label: 'Hết hiệu lực (Lưu trữ lịch sử)' },
];

const VISIBILITY_FORM_OPTIONS: SelectOption[] = [
  { value: 'company', label: 'Toàn công ty' },
  { value: 'managers', label: 'Cấp Quản lý & BGĐ' },
  { value: 'department', label: 'Nội bộ bộ phận ban hành' },
];

const CATEGORY_FORM_OPTIONS: SelectOption[] = ARCHIVE_CATEGORIES.map((c) => ({
  value: c.id,
  label: c.label,
}));

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatVNDate(dateStr: string): string {
  if (!dateStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('vi-VN');
}

function detectFileKind(fileName: string, fileType: string): 'pdf' | 'word' | 'excel' | 'image' | 'archive' | 'other' {
  const ext = (
    fileName.split('.').pop() ||
    fileType.split('/').pop() ||
    fileType ||
    ''
  )
    .toLowerCase()
    .trim();

  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'rtf'].includes(ext) || fileType.includes('word')) return 'word';
  if (['xls', 'xlsx', 'csv'].includes(ext) || fileType.includes('sheet') || fileType.includes('excel')) {
    return 'excel';
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext) || fileType.startsWith('image/')) {
    return 'image';
  }
  if (['zip', 'rar', '7z', 'dwg', 'dxf', 'cad'].includes(ext)) return 'archive';
  return 'other';
}

function getFileVisualMeta(fileName: string, fileType: string) {
  const kind = detectFileKind(fileName, fileType);
  const rawExt = (fileName.split('.').pop() || fileType || 'FILE').toUpperCase().slice(0, 5);
  switch (kind) {
    case 'pdf':
      return {
        kind,
        extLabel: 'PDF',
        bgClass: 'bg-rose-50 text-rose-600 border-rose-200/80',
        icon: <FileEarmarkPdf size={17} />,
      };
    case 'word':
      return {
        kind,
        extLabel: rawExt === 'DOC' ? 'DOC' : 'DOCX',
        bgClass: 'bg-blue-50 text-blue-600 border-blue-200/80',
        icon: <FileEarmarkWord size={17} />,
      };
    case 'excel':
      return {
        kind,
        extLabel: rawExt === 'CSV' ? 'CSV' : 'XLSX',
        bgClass: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
        icon: <FileEarmarkExcel size={17} />,
      };
    case 'image':
      return {
        kind,
        extLabel: rawExt || 'IMG',
        bgClass: 'bg-violet-50 text-violet-600 border-violet-200/80',
        icon: <FileEarmarkImage size={17} />,
      };
    case 'archive':
      return {
        kind,
        extLabel: rawExt || 'ZIP',
        bgClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
        icon: <FileEarmarkZip size={17} />,
      };
    default:
      return {
        kind,
        extLabel: rawExt || 'FILE',
        bgClass: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: <FileEarmarkText size={17} />,
      };
  }
}

function getCategoryMeta(cat: string): CategoryConfig {
  return ARCHIVE_CATEGORIES.find((c) => c.id === cat) || ARCHIVE_CATEGORIES[0];
}

function getDepartmentLabel(code: string, fallbackName?: string): string {
  const found = DEPARTMENT_OPTIONS.find((d) => d.value === code);
  if (found) return found.label;
  return fallbackName || 'Ban Giám đốc';
}

interface DocumentFormState {
  id?: string;
  code: string;
  title: string;
  category: ArchiveCategory;
  departmentCode: string;
  version: string;
  effectiveDate: string;
  status: ArchiveStatus;
  visibility: ArchiveVisibility;
  summary: string;
  isPinned: boolean;
  notifyStaff: boolean;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  fileDataBase64: string;
}

const STORAGE_PAGE_SIZE_KEY = 'seajong_internal_docs_page_size';

export const InternalDocumentLibraryPage: React.FC<InternalDocumentLibraryPageProps> = ({
  deptCode = 'board',
  user: propUser,
}) => {
  const { user: contextUser } = useAuth();
  const activeUser = propUser || contextUser;
  const toast = useToast();

  const [documents, setDocuments] = useState<InternalArchiveDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Bộ lọc ngăn lưu trữ & tìm kiếm
  const [activeShelf, setActiveShelf] = useState<'all' | 'pinned' | ArchiveCategory>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Phân trang chuẩn Enterprise
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() =>
    getStoredPageSize(20, STORAGE_PAGE_SIZE_KEY)
  );

  // Offcanvas Lưu trữ / Cập nhật tài liệu (chuẩn 400px)
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildInitialForm = useCallback(
    (defaultCat?: ArchiveCategory): DocumentFormState => {
      const cat: ArchiveCategory = defaultCat || 'executive';
      const resolvedDept = DEPARTMENT_OPTIONS.some((d) => d.value === deptCode)
        ? deptCode
        : 'board';
      return {
        code: '',
        title: '',
        category: cat,
        departmentCode: resolvedDept,
        version: 'v1.0',
        effectiveDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        visibility: 'company',
        summary: '',
        isPinned: false,
        notifyStaff: false,
        fileName: '',
        fileType: '',
        fileSize: 0,
        fileUrl: '',
        fileDataBase64: '',
      };
    },
    [deptCode]
  );

  const [formState, setFormState] = useState<DocumentFormState>(() => buildInitialForm());

  // Modal Xem trực tiếp tài liệu & Hộp thoại Xóa
  const [previewDoc, setPreviewDoc] = useState<InternalArchiveDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InternalArchiveDocument | null>(null);

  const authHeaders = useMemo(() => {
    const token =
      sessionStorage.getItem('seajong_token') ||
      localStorage.getItem('seajong_token') ||
      localStorage.getItem('token') ||
      '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (activeUser?.id) headers['x-chat-user-id'] = String(activeUser.id);
    return headers;
  }, [activeUser?.id]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        sessionStorage.getItem('seajong_token') ||
        localStorage.getItem('seajong_token') ||
        localStorage.getItem('token') ||
        '';
      const reqHeaders: Record<string, string> = {};
      if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
      if (activeUser?.id) reqHeaders['x-chat-user-id'] = String(activeUser.id);
      const res = await fetch('/api/internal-documents', {
        headers: reqHeaders,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Không thể tải danh mục tài liệu nội bộ');
      const data = await res.json();
      if (Array.isArray(data)) {
        setDocuments(data);
      }
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu', err?.message || 'Không thể kết nối máy chủ lưu trữ.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Đóng Preview Modal khi nhấn ESC
  useEffect(() => {
    if (!previewDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewDoc(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewDoc]);

  // Reset về trang 1 khi thay đổi bộ lọc
  useEffect(() => {
    setPage(1);
  }, [activeShelf, searchTerm, filterDept, filterStatus]);

  // Thống kê số lượng từng ngăn lưu trữ
  const shelfCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: documents.length,
      pinned: 0,
      executive: 0,
      legal_cert: 0,
      sop: 0,
      template: 0,
      technical: 0,
    };
    for (const doc of documents) {
      if (doc.isPinned) counts.pinned += 1;
      if (counts[doc.category] !== undefined) {
        counts[doc.category] += 1;
      }
    }
    return counts;
  }, [documents]);

  // Lọc danh sách tài liệu
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (activeShelf === 'pinned' && !doc.isPinned) return false;
      if (activeShelf !== 'all' && activeShelf !== 'pinned' && doc.category !== activeShelf) {
        return false;
      }
      if (filterDept !== 'all' && doc.departmentCode !== filterDept) {
        return false;
      }
      if (filterStatus !== 'all' && doc.status !== filterStatus) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const haystack = [
          doc.code,
          doc.title,
          doc.summary,
          doc.departmentName,
          doc.fileName,
          doc.uploadedByName,
          doc.version,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [documents, activeShelf, filterDept, filterStatus, searchTerm]);

  const paginatedDocs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDocs.slice(start, start + pageSize);
  }, [filteredDocs, page, pageSize]);

  // Tự động gợi ý số hiệu văn bản theo nhóm
  const suggestCodeForCategory = useCallback(
    (category: ArchiveCategory): string => {
      const prefix = getCategoryMeta(category).codePrefix;
      const year = new Date().getFullYear();
      const sameCatCount = documents.filter((d) => d.category === category).length + 1;
      return `${prefix}-${year}/${String(sameCatCount).padStart(2, '0')}`;
    },
    [documents]
  );

  const handleOpenCreate = () => {
    const defaultCat: ArchiveCategory =
      activeShelf !== 'all' && activeShelf !== 'pinned' ? activeShelf : 'executive';
    const initial = buildInitialForm(defaultCat);
    initial.code = suggestCodeForCategory(defaultCat);
    setFormState(initial);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (doc: InternalArchiveDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormState({
      id: doc.id,
      code: doc.code,
      title: doc.title,
      category: doc.category,
      departmentCode: doc.departmentCode || 'board',
      version: doc.version || 'v1.0',
      effectiveDate: doc.effectiveDate || new Date().toISOString().slice(0, 10),
      status: doc.status || 'active',
      visibility: doc.visibility || 'company',
      summary: doc.summary || '',
      isPinned: Boolean(doc.isPinned),
      notifyStaff: false,
      fileName: doc.fileName || '',
      fileType: doc.fileType || '',
      fileSize: doc.fileSize || 0,
      fileUrl: doc.fileUrl || '',
      fileDataBase64: '',
    });
    setIsFormOpen(true);
  };

  // Xử lý chọn tệp từ máy tính (kéo thả hoặc click)
  const handleProcessSelectedFile = (file: File) => {
    const maxBytes = 35 * 1024 * 1024; // 35MB
    if (file.size > maxBytes) {
      toast.warning('Tệp vượt dung lượng', 'Vui lòng chọn tệp có dung lượng tối đa 35MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const cleanTitleFromFile = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      setFormState((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : cleanTitleFromFile,
        fileName: file.name,
        fileType: ext || file.type,
        fileSize: file.size,
        fileDataBase64: dataUrl,
      }));
    };
    reader.onerror = () => {
      toast.error('Lỗi đọc tệp', 'Không thể đọc tệp vừa chọn từ thiết bị.');
    };
    reader.readAsDataURL(file);
  };

  // Lưu tài liệu (Thêm mới hoặc Cập nhật)
  const handleSaveDocument = async () => {
    if (!formState.title.trim()) {
      toast.warning('Thiếu tên tài liệu', 'Vui lòng nhập tên văn bản hoặc tài liệu lưu trữ.');
      return;
    }
    if (!formState.id && !formState.fileDataBase64 && !formState.fileUrl.trim()) {
      toast.warning('Chưa đính kèm tệp', 'Vui lòng tải lên tệp tài liệu gốc từ máy tính.');
      return;
    }

    setSubmitting(true);
    try {
      const isEditing = Boolean(formState.id);
      const endpoint = isEditing
        ? `/api/internal-documents/${formState.id}`
        : '/api/internal-documents';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        code: formState.code.trim() || suggestCodeForCategory(formState.category),
        title: formState.title.trim(),
        category: formState.category,
        departmentCode: formState.departmentCode,
        departmentName: getDepartmentLabel(formState.departmentCode),
        version: formState.version.trim() || 'v1.0',
        effectiveDate: formState.effectiveDate,
        status: formState.status,
        visibility: formState.visibility,
        summary: formState.summary.trim(),
        isPinned: formState.isPinned,
        notifyStaff: formState.notifyStaff,
        fileName: formState.fileName,
        fileType: formState.fileType,
        fileSize: formState.fileSize,
        fileUrl: formState.fileUrl,
        fileDataBase64: formState.fileDataBase64 || undefined,
        uploadedById: activeUser?.id || '',
        uploadedByName: activeUser?.name || '',
      };

      const res = await fetch(endpoint, {
        method,
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || 'Không thể lưu tài liệu lưu trữ.');
      }

      if (isEditing) {
        setDocuments((prev) => prev.map((d) => (d.id === result.id ? result : d)));
        if (previewDoc?.id === result.id) {
          setPreviewDoc(result);
        }
        toast.success('Đã cập nhật tài liệu', `[${result.code}] ${result.title}`);
      } else {
        setDocuments((prev) => [result, ...prev]);
        toast.success('Đã lưu trữ tài liệu mới', `[${result.code}] ${result.title}`);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error('Không thể lưu tài liệu', err?.message || 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Ghim / Bỏ ghim tài liệu quan trọng
  const handleTogglePin = async (doc: InternalArchiveDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPinned = !doc.isPinned;
    setDocuments((prev) =>
      prev
        .map((item) => (item.id === doc.id ? { ...item, isPinned: nextPinned } : item))
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
    );

    try {
      const res = await fetch(`/api/internal-documents/${doc.id}`, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({ isPinned: nextPinned }),
      });
      if (!res.ok) throw new Error('Không thể cập nhật trạng thái ghim');
    } catch {
      fetchDocuments();
    }
  };

  // Tải tệp gốc & cộng lượt tải trong CSDL
  const handleDownloadDocument = async (doc: InternalArchiveDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!doc.fileUrl) {
      toast.warning('Không có tệp đính kèm', 'Tài liệu này chưa có đường dẫn tệp gốc.');
      return;
    }

    // Tạo link tải xuống trực tiếp
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName || `${doc.code}_${doc.title}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cập nhật bộ đếm lượt tải
    try {
      const res = await fetch(`/api/internal-documents/${doc.id}/download`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const nextCount = Number(data?.downloadCount ?? doc.downloadCount + 1);
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, downloadCount: nextCount } : d))
        );
        if (previewDoc?.id === doc.id) {
          setPreviewDoc((prev) => (prev ? { ...prev, downloadCount: nextCount } : null));
        }
      }
    } catch {
      // Không chặn luồng tải file nếu mạng chậm
    }
  };

  // Xóa tài liệu khỏi kho lưu trữ
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/internal-documents/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders,
        credentials: 'include',
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || 'Xóa tài liệu thất bại');
      }
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      if (previewDoc?.id === deleteTarget.id) {
        setPreviewDoc(null);
      }
      toast.success('Đã xóa tài liệu lưu trữ', `[${deleteTarget.code}] ${deleteTarget.title}`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('Không thể xóa tài liệu', err?.message || 'Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  // Xuất danh mục sổ đăng ký văn bản ra file CSV (mở trực tiếp bằng Excel)
  const handleExportIndexExcel = () => {
    if (filteredDocs.length === 0) {
      toast.info('Danh sách trống', 'Chưa có tài liệu nào để xuất danh mục.');
      return;
    }
    const headers = [
      'Số hiệu',
      'Tên văn bản / Tài liệu',
      'Nhóm lưu trữ',
      'Bộ phận ban hành',
      'Phiên bản',
      'Ngày hiệu lực',
      'Trạng thái',
      'Phạm vi tra cứu',
      'Tên tệp gốc',
      'Dung lượng',
      'Lượt tải',
      'Người lưu trữ',
    ];
    const escapeCsv = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = filteredDocs.map((d) => [
      d.code,
      d.title,
      getCategoryMeta(d.category).shortLabel,
      d.departmentName,
      d.version,
      formatVNDate(d.effectiveDate),
      d.status === 'active' ? 'Đang hiệu lực' : 'Hết hiệu lực',
      d.visibility === 'managers'
        ? 'Cấp Quản lý & BGĐ'
        : d.visibility === 'department'
        ? 'Nội bộ bộ phận'
        : 'Toàn công ty',
      d.fileName,
      formatBytes(d.fileSize),
      d.downloadCount,
      d.uploadedByName,
    ]);

    const csvContent =
      '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_muc_tai_lieu_noi_bo_Seajong_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderVisibilityBadge = (vis: ArchiveVisibility) => {
    if (vis === 'managers') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
          <ShieldLock size={11} className="shrink-0" />
          Cấp Quản lý
        </span>
      );
    }
    if (vis === 'department') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700">
          <Building size={11} className="shrink-0" />
          Nội bộ BP
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
        <Globe2 size={11} className="shrink-0" />
        Toàn công ty
      </span>
    );
  };

  return (
    <StandardPage
      title="Thư viện tài liệu nội bộ"
      description="Kho lưu trữ văn bản điều hành, hồ sơ pháp lý CO/CQ, quy trình SOP, biểu mẫu chuẩn và tài liệu kỹ thuật gốc"
      icon="bi-archive"
      color="indigo"
      badge="VĂN THƯ LƯU TRỮ"
      hideTicker={true}
      useCard={true}
      cardPadding="p-0"
    >
      <div className="flex flex-col h-full min-h-0" style={{ flex: '1 1 0%' }}>
        {/* ── THANH PHÂN NGĂN TỦ HỒ SƠ DOANH NGHIỆP ─────────────────────────── */}
        <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1.5 border-b border-slate-200/80 bg-slate-50/70 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveShelf('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeShelf === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <span>Tất cả hồ sơ</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                activeShelf === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {shelfCounts.all}
            </span>
          </button>

          {ARCHIVE_CATEGORIES.map((cat) => {
            const isSelected = activeShelf === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveShelf(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <span>{cat.shortLabel}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {shelfCounts[cat.id] || 0}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setActiveShelf('pinned')}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ml-auto ${
              activeShelf === 'pinned'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white hover:text-amber-600'
            }`}
            title="Tài liệu quan trọng đã ghim"
          >
            <StarFill size={11} className={activeShelf === 'pinned' ? 'text-white' : 'text-amber-400'} />
            <span>Đã ghim</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                activeShelf === 'pinned'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {shelfCounts.pinned}
            </span>
          </button>
        </div>

        {/* ── THANH CÔNG CỤ CHUẨN TABLE TOOLBAR ─────────────────────────────── */}
        <TableToolbar
          searchPlaceholder="Tìm số hiệu (QĐ-2026...), tên văn bản, trích yếu, bộ phận..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={
            <div className="flex items-center gap-2">
              <div style={{ width: 205 }}>
                <Select
                  options={FILTER_DEPT_OPTIONS}
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  ariaLabel="Lọc theo bộ phận ban hành"
                />
              </div>
              <div style={{ width: 175 }}>
                <Select
                  options={FILTER_STATUS_OPTIONS}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  ariaLabel="Lọc theo hiệu lực"
                />
              </div>
            </div>
          }
          actions={
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <PlusLg size={13} className="mr-1.5" />
              Lưu trữ tài liệu
            </Button>
          }
          onRefresh={fetchDocuments}
          onExportExcel={handleExportIndexExcel}
        />

        {/* ── BẢNG DỮ LIỆU CHUẨN FULL WIDTH TABLE ───────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0" style={{ flex: '1 1 0%' }}>
          <FullWidthTable
            className="internal-documents-table"
            loading={loading}
            loadingText="Đang tải danh mục văn thư lưu trữ..."
          >
            <table style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '13%', whiteSpace: 'nowrap' }}>Số hiệu</th>
                  <th style={{ width: '35%' }}>Tên văn bản / Tài liệu gốc</th>
                  <th style={{ width: '18%' }}>Nhóm lưu trữ & Bộ phận</th>
                  <th style={{ width: '13%', whiteSpace: 'nowrap' }}>Ban hành & Phạm vi</th>
                  <th style={{ width: '10%', whiteSpace: 'nowrap' }}>Hiệu lực</th>
                  <th style={{ width: '11%', textAlign: 'right', whiteSpace: 'nowrap' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center gap-2.5 max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <Folder2Open size={24} />
                        </div>
                        <div className="text-sm font-semibold text-slate-700">
                          {documents.length === 0
                            ? 'Kho văn thư lưu trữ nội bộ đang sẵn sàng'
                            : 'Không tìm thấy tài liệu khớp bộ lọc'}
                        </div>
                        <div className="text-xs text-slate-500 leading-relaxed">
                          {documents.length === 0
                            ? 'Lưu trữ tập trung Quyết định BGĐ, hồ sơ pháp lý CO/CQ, quy trình SOP, biểu mẫu chuẩn và tài liệu kỹ thuật gốc của Seajong.'
                            : 'Thử thay đổi từ khóa tìm kiếm hoặc chuyển sang ngăn tài liệu khác.'}
                        </div>
                        {documents.length === 0 && (
                          <div className="pt-1">
                            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                              <PlusLg size={13} className="mr-1.5" />
                              Lưu trữ tài liệu đầu tiên
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDocs.map((doc) => {
                    const fileMeta = getFileVisualMeta(doc.fileName, doc.fileType);
                    const catMeta = getCategoryMeta(doc.category);
                    const isArchived = doc.status === 'archived';

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setPreviewDoc(doc)}
                        className={`cursor-pointer hover:bg-indigo-50/35 transition-colors ${
                          isArchived ? 'opacity-75' : ''
                        }`}
                      >
                        {/* Cột 1: Ghim + Số hiệu + Phiên bản */}
                        <td className="overflow-hidden">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => handleTogglePin(doc, e)}
                              title={doc.isPinned ? 'Bỏ ghim tài liệu' : 'Ghim tài liệu quan trọng'}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors shrink-0 cursor-pointer"
                            >
                              {doc.isPinned ? (
                                <StarFill size={13} className="text-amber-400" />
                              ) : (
                                <Star size={13} />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div className="font-mono text-xs font-bold text-indigo-700 truncate">
                                {doc.code}
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium">
                                {doc.version || 'v1.0'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Định dạng file + Tên văn bản + Trích yếu + Dung lượng */}
                        <td className="overflow-hidden">
                          <div className="flex items-start gap-2.5 min-w-0 py-0.5">
                            <div
                              className={`w-9 h-9 rounded-lg border flex flex-col items-center justify-center shrink-0 ${fileMeta.bgClass}`}
                            >
                              {fileMeta.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-semibold text-[13px] text-slate-800 truncate">
                                  {doc.title}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${fileMeta.bgClass}`}
                                >
                                  {fileMeta.extLabel}
                                </span>
                              </div>
                              {doc.summary ? (
                                <div className="text-xs text-slate-500 truncate mt-0.5">
                                  {doc.summary}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {doc.fileName || 'Tệp lưu trữ gốc'} • {formatBytes(doc.fileSize)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cột 3: Nhóm lưu trữ & Bộ phận ban hành */}
                        <td className="overflow-hidden">
                          <div className="flex flex-col items-start gap-1 min-w-0">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border truncate max-w-full ${catMeta.badgeClass}`}
                            >
                              {catMeta.shortLabel}
                            </span>
                            <span className="text-xs text-slate-600 truncate max-w-full">
                              {doc.departmentName}
                            </span>
                          </div>
                        </td>

                        {/* Cột 4: Ngày hiệu lực & Phạm vi */}
                        <td className="overflow-hidden">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-700">
                              {formatVNDate(doc.effectiveDate)}
                            </span>
                            {renderVisibilityBadge(doc.visibility)}
                          </div>
                        </td>

                        {/* Cột 5: Trạng thái hiệu lực */}
                        <td>
                          {isArchived ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Hết hiệu lực
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Đang hiệu lực
                            </span>
                          )}
                        </td>

                        {/* Cột 6: Thao tác nhanh */}
                        <td className="text-right">
                          <div
                            className="inline-flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              title="Xem tài liệu"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDownloadDocument(doc, e)}
                              title={`Tải bản gốc (${doc.downloadCount || 0} lượt tải)`}
                              className="inline-flex items-center gap-1 p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <Download size={14} />
                              {doc.downloadCount > 0 && (
                                <span className="text-[10px] font-bold">{doc.downloadCount}</span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(doc, e)}
                              title="Cập nhật thông tin / Phiên bản mới"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <PencilSquare size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(doc)}
                              title="Xóa khỏi kho lưu trữ"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </FullWidthTable>
        </div>

        {/* ── PHÂN TRANG CHUẨN ENTERPRISE ────────────────────────────────────── */}
        <Pagination
          currentPage={page}
          totalItems={filteredDocs.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          itemName="tài liệu"
          storageKey={STORAGE_PAGE_SIZE_KEY}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* ── OFFCANVAS LƯU TRỮ / CẬP NHẬT TÀI LIỆU (CHUẨN 400PX) ────────────── */}
      <Offcanvas
        isOpen={isFormOpen}
        onClose={() => !submitting && setIsFormOpen(false)}
        width="400px"
        title={formState.id ? 'Cập nhật tài liệu lưu trữ' : 'Lưu trữ tài liệu mới'}
        icon={<CloudArrowUp size={20} />}
        confirmText={formState.id ? 'Lưu cập nhật' : 'Lưu vào thư viện'}
        cancelText="Hủy bỏ"
        onConfirm={handleSaveDocument}
        onCancel={() => setIsFormOpen(false)}
        isSubmitting={submitting}
      >
        <div className="space-y-3.5">
          {/* Khu vực đính kèm tệp tài liệu gốc */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tệp tài liệu gốc <span className="text-rose-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.rar,.dwg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProcessSelectedFile(file);
                e.target.value = '';
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) handleProcessSelectedFile(dropped);
              }}
              className={`rounded-xl border-2 border-dashed p-3.5 text-center transition-all cursor-pointer ${
                isDraggingFile
                  ? 'border-indigo-500 bg-indigo-50/70'
                  : formState.fileName
                  ? 'border-emerald-300 bg-emerald-50/35'
                  : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
              }`}
            >
              {formState.fileName ? (
                <div className="flex items-center gap-2.5 text-left">
                  <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                      getFileVisualMeta(formState.fileName, formState.fileType).bgClass
                    }`}
                  >
                    {getFileVisualMeta(formState.fileName, formState.fileType).icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {formState.fileName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatBytes(formState.fileSize)} • Nhấn để thay tệp khác
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  <CloudArrowUp size={22} className="text-indigo-500" />
                  <span className="text-xs font-semibold text-slate-700">
                    Chọn hoặc kéo thả tệp vào đây
                  </span>
                  <span className="text-[11px] text-slate-400">
                    PDF, Word, Excel, Ảnh scan, Bản vẽ (Tối đa 35MB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Nhóm lưu trữ */}
          <div>
            <Select
              label="Nhóm lưu trữ"
              options={CATEGORY_FORM_OPTIONS}
              value={formState.category}
              onChange={(e) => {
                const nextCat = e.target.value as ArchiveCategory;
                setFormState((prev) => ({
                  ...prev,
                  category: nextCat,
                  code: !prev.id ? suggestCodeForCategory(nextCat) : prev.code,
                }));
              }}
            />
          </div>

          {/* Số hiệu & Phiên bản */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-7">
              <Input
                label="Số hiệu văn bản"
                placeholder="VD: QĐ-2026/01"
                value={formState.code}
                onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
                rightIcon={
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        code: suggestCodeForCategory(prev.category),
                      }))
                    }
                    title="Tự động cấp số hiệu tiếp theo"
                    className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                  >
                    <ArrowRepeat size={13} />
                  </button>
                }
              />
            </div>
            <div className="col-span-5">
              <Input
                label="Phiên bản"
                placeholder="v1.0"
                value={formState.version}
                onChange={(e) => setFormState((prev) => ({ ...prev, version: e.target.value }))}
              />
            </div>
          </div>

          {/* Tên văn bản / Tài liệu */}
          <div>
            <Input
              label="Tên văn bản / Tài liệu"
              placeholder="Nhập tên chính thức của tài liệu..."
              value={formState.title}
              onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Bộ phận ban hành & Ngày hiệu lực */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-7">
              <Select
                label="Bộ phận ban hành"
                options={DEPARTMENT_OPTIONS}
                value={formState.departmentCode}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, departmentCode: e.target.value }))
                }
              />
            </div>
            <div className="col-span-5">
              <Input
                label="Ngày hiệu lực"
                type="date"
                value={formState.effectiveDate}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, effectiveDate: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Hiệu lực & Phạm vi quyền tra cứu */}
          <div className="grid grid-cols-2 gap-2.5">
            <Select
              label="Trạng thái hiệu lực"
              options={STATUS_FORM_OPTIONS}
              value={formState.status}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  status: e.target.value as ArchiveStatus,
                }))
              }
            />
            <Select
              label="Phạm vi tra cứu"
              options={VISIBILITY_FORM_OPTIONS}
              value={formState.visibility}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  visibility: e.target.value as ArchiveVisibility,
                }))
              }
            />
          </div>

          {/* Trích yếu nội dung */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Trích yếu nội dung
            </label>
            <textarea
              rows={3}
              placeholder="Tóm tắt ngắn gọn nội dung hoặc phạm vi áp dụng..."
              value={formState.summary}
              onChange={(e) => setFormState((prev) => ({ ...prev, summary: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 resize-none"
            />
          </div>

          {/* Tùy chọn ghim & gửi thông báo */}
          <div className="pt-1 space-y-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formState.isPinned}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, isPinned: e.target.checked }))
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium">Ghim lên đầu thư viện (Văn bản trọng tâm)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formState.notifyStaff}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, notifyStaff: e.target.checked }))
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium">Gửi thông báo ban hành tới nhân sự liên quan</span>
            </label>
          </div>
        </div>
      </Offcanvas>

      {/* ── MODAL ĐỌC & XEM TRỰC TIẾP TÀI LIỆU TRÊN TRÌNH DUYỆT ─────────────── */}
      {previewDoc &&
        createPortal(
          <div
            className="fixed inset-0 z-[1550] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-5"
            onClick={() => setPreviewDoc(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Thanh tiêu đề trình đọc văn bản */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                      getFileVisualMeta(previewDoc.fileName, previewDoc.fileType).bgClass
                    }`}
                  >
                    {getFileVisualMeta(previewDoc.fileName, previewDoc.fileType).icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                        {previewDoc.code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 truncate max-w-xl m-0">
                        {previewDoc.title}
                      </h3>
                      <span className="text-xs font-medium text-slate-500">
                        ({previewDoc.version})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span>{getCategoryMeta(previewDoc.category).shortLabel}</span>
                      <span>•</span>
                      <span>{previewDoc.departmentName}</span>
                      <span>•</span>
                      <span>Hiệu lực: {formatVNDate(previewDoc.effectiveDate)}</span>
                      <span>•</span>
                      <span>{formatBytes(previewDoc.fileSize)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {previewDoc.fileUrl && (
                    <a
                      href={previewDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <BoxArrowUpRight size={12} />
                      <span>Mở tab mới</span>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = previewDoc;
                      setPreviewDoc(null);
                      handleOpenEdit(target);
                    }}
                  >
                    <PencilSquare size={13} className="mr-1.5" />
                    Cập nhật
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDownloadDocument(previewDoc)}
                  >
                    <Download size={13} className="mr-1.5" />
                    Tải bản gốc ({previewDoc.downloadCount || 0})
                  </Button>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    aria-label="Đóng"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Nội dung hiển thị tài liệu */}
              <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center min-h-0">
                {(() => {
                  const kind = detectFileKind(previewDoc.fileName, previewDoc.fileType);
                  if (kind === 'pdf' && previewDoc.fileUrl) {
                    return (
                      <iframe
                        src={previewDoc.fileUrl}
                        title={previewDoc.title}
                        className="w-full h-full border-0 bg-white"
                      />
                    );
                  }
                  if (kind === 'image' && previewDoc.fileUrl) {
                    return (
                      <div className="p-6 flex items-center justify-center w-full h-full overflow-auto">
                        <img
                          src={previewDoc.fileUrl}
                          alt={previewDoc.title}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-md bg-white"
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-lg w-full mx-4">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div
                          className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                            getFileVisualMeta(previewDoc.fileName, previewDoc.fileType).bgClass
                          }`}
                        >
                          {getFileVisualMeta(previewDoc.fileName, previewDoc.fileType).icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {previewDoc.fileName || previewDoc.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Định dạng {getFileVisualMeta(previewDoc.fileName, previewDoc.fileType).extLabel} •{' '}
                            {formatBytes(previewDoc.fileSize)}
                          </div>
                        </div>
                      </div>

                      <div className="py-4 space-y-2.5 text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Số hiệu văn bản:</span>
                          <span className="font-mono font-bold text-slate-800">{previewDoc.code}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Bộ phận ban hành:</span>
                          <span className="font-semibold text-slate-800">{previewDoc.departmentName}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Ngày hiệu lực:</span>
                          <span className="font-semibold text-slate-800">
                            {formatVNDate(previewDoc.effectiveDate)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Người lưu trữ:</span>
                          <span className="font-semibold text-slate-800">
                            {previewDoc.uploadedByName || 'Quản trị viên'}
                          </span>
                        </div>
                        {previewDoc.summary && (
                          <div className="pt-2 border-t border-slate-100">
                            <div className="text-slate-500 mb-1">Trích yếu nội dung:</div>
                            <div className="text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-2.5">
                              {previewDoc.summary}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          variant="primary"
                          size="md"
                          className="w-full justify-center"
                          onClick={() => handleDownloadDocument(previewDoc)}
                        >
                          <Download size={15} className="mr-2" />
                          Tải tệp gốc về máy tính
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── HỘP THOẠI XÁC NHẬN XÓA TÀI LIỆU ────────────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        isLoading={deleting}
        title="Xóa tài liệu khỏi kho lưu trữ"
        message={
          deleteTarget ? (
            <span>
              Bạn có chắc chắn muốn xóa văn bản{' '}
              <strong>
                [{deleteTarget.code}] {deleteTarget.title}
              </strong>{' '}
              khỏi Thư viện tài liệu nội bộ?
            </span>
          ) : null
        }
        confirmText="Xóa vĩnh viễn"
        cancelText="Giữ lại"
      />
    </StandardPage>
  );
};

export default InternalDocumentLibraryPage;

