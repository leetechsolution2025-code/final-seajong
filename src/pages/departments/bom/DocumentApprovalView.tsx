import React, { useState, useMemo, useEffect } from 'react';
import {
  FileCheck,
  Trash2,
  CheckCircle,
  XCircle,
  Check2,
  Tag,
  FileEarmarkPdf,
} from 'react-bootstrap-icons';
import { TableToolbar, type TableToolbarFilter } from '../../../components/common/TableToolbar';
import { Pagination } from '../../../components/common/Pagination';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import {
  PendingApprovalOffcanvas,
  ApprovedDocumentOffcanvas,
  RejectedDocumentOffcanvas,
} from './components';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { NewBadge } from '../../../components/common/NewBadge';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import {
  DepartmentSelect,
  useDepartmentOptions,
  matchDepartment,
} from '../../../components/common/DepartmentSelect';
import { openAttachmentInNewTab } from './services/documentViewer';
export type ThemeMode = 'light' | 'dark';

export interface ApprovalDocumentAttachment {
  name: string;
  size?: string;
  type?: string;
  url?: string;
}

export interface ApprovalDocument {
  id: string;
  code: string;
  title: string;
  docType: 'proposal' | 'contract' | 'procurement' | 'technical' | 'acceptance' | 'advance';
  docTypeName: string;
  department: string;
  submitter: string;
  submitterRole: string;
  submitDate: string;
  value: number; // in VND (0 if qualitative)
  valueLabel?: string;
  summary: string;
  content: string;
  priority: 'urgent' | 'high' | 'normal';
  status: 'pending' | 'approved' | 'rejected';
  isRead?: boolean;
  approvalDate?: string;
  approvedBy?: string;
  approvalNote?: string;
  rejectionDate?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  attachmentName?: string;
  attachmentSize?: string;
  attachmentUrl?: string;
  attachments?: ApprovalDocumentAttachment[];
  approverCode?: string;
  approverId?: string;
  approverName?: string;
  approverRole?: string;
  submitterCode?: string;
  tenderId?: string;
  tenderCode?: string;
}

export const INITIAL_APPROVAL_DOCUMENTS: ApprovalDocument[] = [];

export interface DocumentApprovalViewProps {
  currentStep: number;
  onStepChange?: (step: number) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  theme?: ThemeMode;
  user?: any;
  items?: ApprovalDocument[];
  onItemsChange?: (items: ApprovalDocument[]) => void;
}

// ─── Helper: Dọn sạch các tệp ảo tự sinh không có thật ───────────────────────
export function cleanDocumentAttachments(doc: any): any {
  if (!doc) return doc;
  const filteredAtts = (doc.attachments || []).filter((a: any) => {
    const n = (a?.name || '').toLowerCase();
    const s = (a?.size || '').toLowerCase();
    // Loại bỏ tệp ảo tự sinh không có thật
    if (
      (n.includes('thẩm định tính khả thi') ||
       n.includes('tham dinh tinh kha thi') ||
       s.includes('thẩm tra') ||
       s.includes('tham tra')) &&
      (!a.url || a.url === '#' || a.url.startsWith('blob:'))
    ) {
      return false;
    }
    return true;
  });

  let newContent = doc.content || '';
  if (newContent.includes('Báo cáo thẩm định tính khả thi') || newContent.includes('Báo cáo thẩm tra')) {
    newContent = newContent
      .split('\n')
      .filter((line: string) => !line.includes('Báo cáo thẩm định tính khả thi') && !line.includes('Báo cáo thẩm tra'))
      .join('\n');
  }

  return {
    ...doc,
    attachments: filteredAtts,
    content: newContent,
  };
}

export function cleanDocumentList(docs: any[]): any[] {
  if (!Array.isArray(docs)) return [];
  return docs.map(cleanDocumentAttachments);
}

export const DocumentApprovalView: React.FC<DocumentApprovalViewProps> = ({
  currentStep,
  onStepChange,
  onShowToast,
  user,
  items: externalItems,
  onItemsChange,
}) => {
  // Dữ liệu văn bản từ CSDL thực tế
  const [internalItems, setInternalItems] = useState<ApprovalDocument[]>(() => {
    try {
      const saved = localStorage.getItem('decodoor_approval_documents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Lọc sạch toàn bộ dữ liệu mô phỏng cũ còn sót lại trong cache
          const realDocs = parsed.filter(
            (d: any) =>
              !d.id?.startsWith('APR-00') &&
              d.code !== 'TT-DM-0926' &&
              d.code !== 'TT-MM-0926' &&
              d.code !== 'TT-VT-1026' &&
              d.code !== 'TT-PCCC-04'
          );
          const cleaned = cleanDocumentList(realDocs);
          localStorage.setItem('decodoor_approval_documents', JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch (e) {
      console.warn('Failed to parse decodoor_approval_documents', e);
    }
    return [];
  });
  const items = externalItems ? cleanDocumentList(externalItems) : internalItems;
  const updateItems = (newItems: ApprovalDocument[]) => {
    const cleaned = cleanDocumentList(newItems);
    try {
      localStorage.setItem('decodoor_approval_documents', JSON.stringify(cleaned));
      window.dispatchEvent(new CustomEvent('decodoor_approval_documents_updated'));
    } catch (e) {
      console.warn('Failed to save decodoor_approval_documents', e);
    }
    if (onItemsChange) {
      onItemsChange(cleaned);
    } else {
      setInternalItems(cleaned);
    }
  };

  // Nạp dữ liệu tờ trình từ CSDL SQLite theo thời gian thực (Polling mỗi 3.5 giây)
  useEffect(() => {
    let isSubscribed = true;
    let lastJson = '';

    const fetchDocuments = () => {
      fetch('/api/approval-documents')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (!isSubscribed) return;
          if (Array.isArray(data)) {
            // Lọc sạch bất kỳ dữ liệu mô phỏng nào nếu có
            const realDocs = data.filter(
              (d: any) =>
                !d.id?.startsWith('APR-00') &&
                d.code !== 'TT-DM-0926' &&
                d.code !== 'TT-MM-0926' &&
                d.code !== 'TT-VT-1026' &&
                d.code !== 'TT-PCCC-04'
            );
            const cleaned = cleanDocumentList(realDocs);
            const nextJson = JSON.stringify(cleaned);
            if (nextJson === lastJson) return;
            lastJson = nextJson;
            if (onItemsChange) {
              onItemsChange(cleaned);
            } else {
              setInternalItems(cleaned);
            }
            try {
              localStorage.setItem('decodoor_approval_documents', nextJson);
            } catch {}
          }
        })
        .catch((err) => console.warn('Lỗi fetch approval_documents:', err));
    };

    fetchDocuments();
    const intervalId = setInterval(fetchDocuments, 3500);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [onItemsChange]);

  // Đồng bộ với localStorage khi có cập nhật từ các nơi khác (ví dụ: gửi trình từ Phân tích HSMT)
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('decodoor_approval_documents');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleaned = cleanDocumentList(parsed);
            if (onItemsChange) {
              onItemsChange(cleaned);
            } else {
              setInternalItems(cleaned);
            }
          }
        }
      } catch (e) {
        console.warn('Sync failed', e);
      }
    };
    window.addEventListener('decodoor_approval_documents_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('decodoor_approval_documents_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [onItemsChange]);

  // Trạng thái tìm kiếm và bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const { options: deptOptions, departments: deptList } = useDepartmentOptions({
    includeAll: true,
    allLabel: 'Tất cả bộ phận',
  });
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');



  // Phân trang và chọn dòng
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal / Drawer states
  const [selectedDoc, setSelectedDoc] = useState<ApprovalDocument | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [openChatOnSelect, setOpenChatOnSelect] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Lắng nghe sự kiện mở trực tiếp trao đổi từ Toast hoặc Quả chuông thông báo
  useEffect(() => {
    const handleOpenDocumentChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ documentId: string }>;
      const docId = customEvent.detail?.documentId;
      if (!docId) return;

      const doc = items.find((d) => d.id === docId);
      if (doc) {
        const targetStep = doc.status === 'pending' ? 1 : doc.status === 'approved' ? 2 : 3;
        if (onStepChange && currentStep !== targetStep) {
          onStepChange(targetStep);
        }
        setSelectedDoc(doc);
        setOpenChatOnSelect(true);
        setIsDetailOpen(true);
      }
    };

    window.addEventListener('decodoor:open-document-chat', handleOpenDocumentChat);
    return () => {
      window.removeEventListener('decodoor:open-document-chat', handleOpenDocumentChat);
    };
  }, [items, currentStep, onStepChange]);

  // Modal bút phê duyệt / từ chối
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject';
    targetDoc: ApprovalDocument | null;
    note: string;
  }>({
    isOpen: false,
    type: 'approve',
    targetDoc: null,
    note: '',
  });
  const [reopenDetailAfterCancel, setReopenDetailAfterCancel] = useState(false);

  // Form tạo mới văn bản trình duyệt
  const [newDocForm, setNewDocForm] = useState<{
    title: string;
    code: string;
    docType: ApprovalDocument['docType'];
    department: string;
    submitter: string;
    submitterRole: string;
    value: string;
    priority: ApprovalDocument['priority'];
    content: string;
    attachmentName: string;
  }>({
    title: '',
    code: `TT-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
    docType: 'proposal',
    department: 'Phòng kinh doanh',
    submitter: '',
    submitterRole: '',
    value: '',
    priority: 'normal',
    content: '',
    attachmentName: '',
  });

  // Tự động gán bộ phận mặc định từ danh sách CSDL khi tải xong
  useEffect(() => {
    if (deptList.length > 0) {
      setNewDocForm((prev) => ({
        ...prev,
        department: prev.department && deptList.some((d) => d.name === prev.department)
          ? prev.department
          : deptList[0].name,
      }));
    }
  }, [deptList]);

  // Reset phân trang và lựa chọn khi đổi step
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [currentStep]);

  // Lọc dữ liệu theo Bước hiện tại
  const stepFilteredDocs = useMemo(() => {
    const targetStatus = currentStep === 1 ? 'pending' : currentStep === 2 ? 'approved' : 'rejected';
    return items.filter((doc) => doc.status === targetStatus);
  }, [items, currentStep]);

  // Áp dụng bộ lọc tìm kiếm, bộ phận, loại văn bản, độ ưu tiên
  const filteredDocs = useMemo(() => {
    return stepFilteredDocs.filter((doc) => {
      // 1. Tìm kiếm chuỗi
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchCode = doc.code.toLowerCase().includes(q);
        const matchDept = doc.department.toLowerCase().includes(q);
        const matchSubmitter = doc.submitter.toLowerCase().includes(q);
        const matchSummary = doc.summary.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchDept && !matchSubmitter && !matchSummary) {
          return false;
        }
      }

      // 2. Lọc phòng ban
      if (departmentFilter !== 'all' && !matchDepartment(doc.department, departmentFilter)) {
        return false;
      }

      // 3. Lọc loại văn bản
      if (docTypeFilter !== 'all' && doc.docType !== docTypeFilter) {
        return false;
      }

      // 4. Lọc độ ưu tiên
      if (priorityFilter !== 'all' && doc.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [stepFilteredDocs, searchQuery, departmentFilter, docTypeFilter, priorityFilter]);

  // Phân trang dữ liệu
  const paginatedDocs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredDocs.slice(startIndex, startIndex + pageSize);
  }, [filteredDocs, currentPage, pageSize]);

  // Checkbox chọn tất cả
  const isAllSelected =
    paginatedDocs.length > 0 && paginatedDocs.every((doc) => selectedIds.includes(doc.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = paginatedDocs.map((d) => d.id);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedDocs.map((d) => d.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Xác nhận Xoá các mục đã chọn
  const handleDeleteSelected = () => {
    const remaining = items.filter((doc) => !selectedIds.includes(doc.id));
    updateItems(remaining);

    // Xoá trong CSDL SQLite
    fetch('/api/approval-documents/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    }).catch(console.error);

    setSelectedIds([]);
    setIsDeleteDialogOpen(false);
    onShowToast?.('success', 'Thành công', `Đã xoá ${selectedIds.length} văn bản được chọn`);
  };

  // Mở modal phê duyệt (đóng offcanvas trước để không che khuất modal)
  const handleOpenApproveModal = (doc: ApprovalDocument, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isDetailOpen) {
      setReopenDetailAfterCancel(true);
      setIsDetailOpen(false);
    } else {
      setReopenDetailAfterCancel(false);
    }
    setActionModal({
      isOpen: true,
      type: 'approve',
      targetDoc: doc,
      note: 'Đồng ý phê duyệt nội dung tờ trình. Yêu cầu các đơn vị phối hợp triển khai đúng tiến độ.',
    });
  };

  // Mở modal từ chối (đóng offcanvas trước để không che khuất modal)
  const handleOpenRejectModal = (doc: ApprovalDocument, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isDetailOpen) {
      setReopenDetailAfterCancel(true);
      setIsDetailOpen(false);
    } else {
      setReopenDetailAfterCancel(false);
    }
    setActionModal({
      isOpen: true,
      type: 'reject',
      targetDoc: doc,
      note: '',
    });
  };

  // Đóng modal bút phê duyệt / từ chối (phục hồi offcanvas nếu trước đó mở từ offcanvas)
  const handleCloseActionModal = () => {
    setActionModal({ isOpen: false, type: 'approve', targetDoc: null, note: '' });
    if (reopenDetailAfterCancel) {
      setIsDetailOpen(true);
      setReopenDetailAfterCancel(false);
    }
  };

  // Xử lý xác nhận phê duyệt hoặc từ chối
  const handleConfirmAction = async () => {
    if (!actionModal.targetDoc) return;
    const targetDoc = actionModal.targetDoc;
    const docId = targetDoc.id;
    const nowStr = new Date().toLocaleDateString('vi-VN');
    const isApprove = actionModal.type === 'approve';
    const noteContent = actionModal.note.trim();

    const approverName = user?.name || (targetDoc as any)?.approverName || 'TGĐ. Hà Hải Lâm';
    const approverCode = user?.code || (targetDoc as any)?.approverCode || 'DCD-20261005-1674-PDMQ';

    const updated = items.map((doc) => {
      if (doc.id === docId) {
        if (isApprove) {
          return {
            ...doc,
            status: 'approved' as const,
            approvalDate: nowStr,
            approvedBy: approverName,
            approvalNote: noteContent || 'Đồng ý phê duyệt.',
          };
        } else {
          return {
            ...doc,
            status: 'rejected' as const,
            rejectionDate: nowStr,
            rejectedBy: approverName,
            rejectionReason: noteContent || 'Hồ sơ chưa đạt yêu cầu, cần bổ sung tài liệu.',
          };
        }
      }
      return doc;
    });

    updateItems(updated);
    setActionModal({ isOpen: false, type: 'approve', targetDoc: null, note: '' });
    setReopenDetailAfterCancel(false);
    setIsDetailOpen(false);
    setSelectedDoc(null);

    // 1. Gọi API cập nhật vào CSDL SQLite
    try {
      await fetch(`/api/approval-documents/${docId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: isApprove ? 'approved' : 'rejected',
          note: noteContent,
          approverName: approverName,
          approverCode: approverCode,
        }),
      });
    } catch (err) {
      console.warn('Lỗi gọi API cập nhật trạng thái văn bản:', err);
    }

    // 2. Gửi thông báo hệ thống tự động cho người trình duyệt
    try {
      const notifTitle = isApprove
        ? `Tờ trình ${targetDoc.code} đã được phê duyệt`
        : `Tờ trình ${targetDoc.code} đã bị từ chối`;
      const notifMsg = `Hồ sơ "${targetDoc.title}" đã được ${approverName} ${isApprove ? 'phê duyệt' : 'từ chối'}. Bút phê: "${noteContent || (isApprove ? 'Đồng ý phê duyệt' : 'Hồ sơ cần chỉnh sửa/bổ sung')}"`;

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notifTitle,
          message: notifMsg,
          type: isApprove ? 'success' : 'danger',
          targetUserCode: targetDoc.submitterCode || '',
          documentId: targetDoc.id,
          documentCode: targetDoc.code,
          senderName: approverName,
        }),
      });
      window.dispatchEvent(new CustomEvent('decodoor_notification_created'));
    } catch (err) {
      console.warn('Lỗi gửi thông báo tự động:', err);
    }

    // 3. Tự động cập nhật thông tin sang trang "Lập hồ sơ dự thầu" khi Giám đốc phê duyệt
    if (isApprove) {
      try {
        const rawTitle = targetDoc.title || '';
        const cleanedTitle = rawTitle
          .replace(/^Tờ trình\s*(phê duyệt\s*)?(kết quả\s*)?(thẩm định\s*)?(HSMT\s*:?)?\s*/i, '')
          .replace(/^Tờ trình\s*(về việc\s*)?:?\s*/i, '')
          .trim();
        const formattedCol1 = cleanedTitle.toLowerCase().startsWith('hồ sơ')
          ? cleanedTitle
          : `Hồ sơ dự thầu Gói thầu ${cleanedTitle || 'Cung cấp thiết bị vệ sinh Seajong'}`;

        const tenderCode = targetDoc.code ? targetDoc.code.replace('TT-', 'HSDT-') : `HSDT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

        // Lấy gói thầu thực tế từ DB
        let tenderActual: any = null;
        try {
          const resTenders = await fetch('/api/tenders');
          if (resTenders.ok) {
            const tenders = await resTenders.json();
            if (Array.isArray(tenders) && tenders.length > 0) {
              tenderActual = tenders.find((t: any) =>
                (targetDoc.title && t.title && (targetDoc.title.includes(t.title) || t.title.includes(targetDoc.title))) ||
                (targetDoc.content && t.code && targetDoc.content.includes(t.code)) ||
                (targetDoc.content && t.title && targetDoc.content.includes(t.title)) ||
                (t.code && targetDoc.title && targetDoc.title.includes(t.code))
              ) || tenders[0];
            }
          }
        } catch {}

        // Lấy thông tin người phụ trách (Tên, phòng ban, SĐT) từ DB
        let personName = tenderActual?.assigned_person || targetDoc.submitter || '';
        let personDept = targetDoc.department || '';
        let personPhone = '';
        try {
          const resUsers = await fetch('/api/users');
          if (resUsers.ok) {
            const users = await resUsers.json();
            const u = users.find((usr: any) => usr.name === personName);
            if (u) {
              if (u.department) personDept = u.department;
              if (u.phone) personPhone = u.phone;
            }
          }
        } catch {}

        const tenderCol2 = JSON.stringify({
          name: personName,
          department: personDept,
          phone: personPhone,
        });

        // 100% Lấy từ DB, không mô phỏng hay suy diễn giá trị
        const tenderCol3 = tenderActual?.budget_text || (tenderActual?.budget ? `${Number(tenderActual.budget).toLocaleString('vi-VN')} đ` : (targetDoc.value && !String(targetDoc.value).includes('Khối lượng') ? String(targetDoc.value) : 'Thương thảo'));

        // Thời hạn hoàn tất lấy từ deadline của gói thầu trong DB
        let tenderCol4 = tenderActual?.deadline ? tenderActual.deadline.replace(/^\d{2}:\d{2}\s*/, '') : '';
        if (!tenderCol4) {
          tenderCol4 = new Date().toLocaleDateString('vi-VN');
        }

        const newTenderPrepItem = {
          id: `TNP-${Date.now()}`,
          category: 'tender_preparation',
          code: tenderCode,
          col1: formattedCol1,
          col2: tenderCol2,
          col3: tenderCol3,
          col4: tenderCol4,
          status: 'not_started' as const,
          statusLabel: 'Chưa thực hiện',
          personName,
          personRole: targetDoc.submitterRole || 'Chủ trì hồ sơ kỹ thuật',
        };

        await fetch('/api/admin/hr-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTenderPrepItem),
        });

        // Bắn sự kiện thời gian thực để trang Lập hồ sơ dự thầu cập nhật ngay lập tức
        window.dispatchEvent(new CustomEvent('decodoor_tender_preparation_updated', { detail: newTenderPrepItem }));
        window.dispatchEvent(new CustomEvent('decodoor_admin_hr_items_updated', { detail: newTenderPrepItem }));
      } catch (err) {
        console.warn('Lỗi tự động cập nhật thông tin sang Lập hồ sơ dự thầu:', err);
      }
    }

    // 4. Tự động thay đổi trạng thái gói thầu trong trang "Phân tích hồ sơ mời thầu"
    try {
      let targetTenderId = targetDoc.tenderId || (targetDoc as any).tender_id;
      let targetTenderCode = targetDoc.tenderCode || (targetDoc as any).tender_code;

      try {
        const res = await fetch('/api/tenders');
        if (res.ok) {
          const tenders = await res.json();
          if (Array.isArray(tenders) && tenders.length > 0) {
            const matched = tenders.find((t: any) =>
              (targetTenderId && t.id === targetTenderId) ||
              (targetTenderCode && t.code === targetTenderCode) ||
              (t.code && targetDoc.code && targetDoc.code.includes(t.code.replace('HSMT-', ''))) ||
              (targetDoc.title && t.title && (targetDoc.title.includes(t.title) || t.title.includes(targetDoc.title))) ||
              (targetDoc.content && t.code && targetDoc.content.includes(t.code)) ||
              (targetDoc.content && t.title && targetDoc.content.includes(t.title)) ||
              (t.code && targetDoc.title && targetDoc.title.includes(t.code))
            );
            if (matched) {
              targetTenderId = matched.id;
              targetTenderCode = matched.code;
            } else if (tenders.length === 1) {
              targetTenderId = tenders[0].id;
              targetTenderCode = tenders[0].code;
            }
          }
        }
      } catch {}

      if (targetTenderId) {
        const newStatus = isApprove ? 'participating' : 'not_participating';
        const newStatusLabel = isApprove ? 'Tham gia' : 'Không tham gia';
        const newBadgeVariant = isApprove ? 'success' : 'danger';

        await fetch(`/api/tenders/${targetTenderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            statusLabel: newStatusLabel,
            badgeVariant: newBadgeVariant,
          }),
        });

        // Bắn sự kiện thời gian thực cho trang Phân tích hồ sơ mời thầu và Quản lý khách hàng
        window.dispatchEvent(new CustomEvent('decodoor_tender_updated', {
          detail: { id: targetTenderId, code: targetTenderCode, status: newStatus, statusLabel: newStatusLabel, badgeVariant: newBadgeVariant }
        }));
        window.dispatchEvent(new CustomEvent('decodoor_bidding_tender_updated'));
        if (isApprove) {
          window.dispatchEvent(new CustomEvent('decodoor_customers_updated'));
          window.dispatchEvent(new CustomEvent('decodoor_customer_created'));
        }
      }
    } catch (tenderErr) {
      console.warn('Lỗi tự động cập nhật trạng thái gói thầu:', tenderErr);
    }

    // 5. Tự động cập nhật trạng thái Báo giá dự án nếu là tờ trình báo giá
    try {
      const isQuoteDoc = targetDoc.docTypeName?.includes('báo giá') || targetDoc.code?.includes('BG-') || (targetDoc.title && targetDoc.title.toLowerCase().includes('báo giá'));
      if (isQuoteDoc) {
        const quoteCode = targetDoc.tenderCode || targetDoc.code.replace('TT-', '');
        const resQuotes = await fetch('/api/quotations');
        if (resQuotes.ok) {
          const quotesList = await resQuotes.json();
          const matchedQuote = Array.isArray(quotesList) ? quotesList.find((q: any) => q.code === quoteCode || q.id === targetDoc.tenderId) : null;
          if (matchedQuote) {
            const nextQuoteStatus = isApprove ? 'approved' : 'rejected';
            const nextQuoteLabel = isApprove ? 'Đã phê duyệt' : 'Từ chối';
            await fetch(`/api/quotations/${matchedQuote.id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: nextQuoteStatus,
                statusLabel: nextQuoteLabel,
                approverName: approverName,
              }),
            });
            window.dispatchEvent(new CustomEvent('decodoor_quotations_updated'));
            window.dispatchEvent(new CustomEvent('decodoor_contracts_updated'));
            window.dispatchEvent(new CustomEvent('decodoor_contract_created'));
            window.dispatchEvent(new CustomEvent('decodoor_customers_updated'));
          }
        }
      }
    } catch (qErr) {
      console.warn('Lỗi tự động cập nhật trạng thái báo giá:', qErr);
    }

    if (isApprove) {
      const isQuoteDoc = targetDoc.docTypeName?.includes('báo giá') || targetDoc.code?.includes('BG-') || (targetDoc.title && targetDoc.title.toLowerCase().includes('báo giá'));
      if (isQuoteDoc) {
        onShowToast?.('success', 'Phê duyệt thành công', `Đã phê duyệt báo giá ${targetDoc.code}, tự động chuyển trạng thái "Đã phê duyệt" và tạo hợp đồng kinh tế "Đang thương thảo"`);
      } else {
        onShowToast?.('success', 'Phê duyệt thành công', `Đã phê duyệt văn bản ${targetDoc.code}, tự động cập nhật trạng thái gói thầu sang "Tham gia" và chuyển sang Lập hồ sơ dự thầu`);
      }
    } else {
      onShowToast?.('warning', 'Đã từ chối', `Đã từ chối văn bản ${targetDoc.code} và gửi thông báo phản hồi tới ${targetDoc.submitter}`);
    }
  };

  // Duyệt nhanh nhiều mục đã chọn trong Bước 1
  const handleBatchApprove = async () => {
    const nowStr = new Date().toLocaleDateString('vi-VN');
    const approverName = user?.name || 'TGĐ. Hà Hải Lâm';
    const approverCode = user?.code || 'DCD-20261005-1674-PDMQ';

    const targetDocs = items.filter((d) => selectedIds.includes(d.id) && d.status === 'pending');
    const updated = items.map((doc) => {
      if (selectedIds.includes(doc.id) && doc.status === 'pending') {
        return {
          ...doc,
          status: 'approved' as const,
          approvalDate: nowStr,
          approvedBy: approverName,
          approvalNote: 'Phê duyệt hàng loạt bởi Ban Giám đốc.',
        };
      }
      return doc;
    });

    updateItems(updated);
    const count = targetDocs.length;
    setSelectedIds([]);

    // Cập nhật CSDL và gửi thông báo cho từng người trình
    for (const doc of targetDocs) {
      try {
        await fetch(`/api/approval-documents/${doc.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'approved',
            note: 'Phê duyệt hàng loạt bởi Ban Giám đốc.',
            approverName,
            approverCode,
          }),
        });

        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Tờ trình ${doc.code} đã được phê duyệt`,
            message: `Hồ sơ "${doc.title}" đã được ${approverName} phê duyệt hàng loạt.`,
            type: 'success',
            targetUserCode: doc.submitterCode || '',
            documentId: doc.id,
            documentCode: doc.code,
            senderName: approverName,
          }),
        });

        // Tự động đẩy sang Lập hồ sơ dự thầu nếu liên quan đến dự thầu / thẩm định
        const rawTitle = doc.title || '';
        const cleanedTitle = rawTitle
          .replace(/^Tờ trình\s*(phê duyệt\s*)?(kết quả\s*)?(thẩm định\s*)?(HSMT\s*:?)?\s*/i, '')
          .replace(/^Tờ trình\s*(về việc\s*)?:?\s*/i, '')
          .trim();
        const formattedCol1 = cleanedTitle.toLowerCase().startsWith('hồ sơ')
          ? cleanedTitle
          : `Hồ sơ dự thầu Gói thầu ${cleanedTitle || 'Cung cấp thiết bị vệ sinh Seajong'}`;

        const tenderCode = doc.code ? doc.code.replace('TT-', 'HSDT-') : `HSDT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

        // Lấy gói thầu thực tế từ DB
        let tenderActual: any = null;
        try {
          const resTenders = await fetch('/api/tenders');
          if (resTenders.ok) {
            const tenders = await resTenders.json();
            if (Array.isArray(tenders) && tenders.length > 0) {
              tenderActual = tenders.find((t: any) =>
                (doc.title && t.title && (doc.title.includes(t.title) || t.title.includes(doc.title))) ||
                (doc.content && t.code && doc.content.includes(t.code)) ||
                (doc.content && t.title && doc.content.includes(t.title)) ||
                (t.code && doc.title && doc.title.includes(t.code))
              ) || tenders[0];
            }
          }
        } catch {}

        let personName = tenderActual?.assigned_person || doc.submitter || '';
        let personDept = doc.department || '';
        let personPhone = '';
        try {
          const resUsers = await fetch('/api/users');
          if (resUsers.ok) {
            const users = await resUsers.json();
            const u = users.find((usr: any) => usr.name === personName);
            if (u) {
              if (u.department) personDept = u.department;
              if (u.phone) personPhone = u.phone;
            }
          }
        } catch {}

        const tenderCol2 = JSON.stringify({
          name: personName,
          department: personDept,
          phone: personPhone,
        });

        const tenderCol3 = tenderActual?.budget_text || (tenderActual?.budget ? `${Number(tenderActual.budget).toLocaleString('vi-VN')} đ` : (doc.value && !String(doc.value).includes('Khối lượng') ? String(doc.value) : 'Thương thảo'));
        let tenderCol4 = tenderActual?.deadline ? tenderActual.deadline.replace(/^\d{2}:\d{2}\s*/, '') : '';
        if (!tenderCol4) {
          tenderCol4 = new Date().toLocaleDateString('vi-VN');
        }

        await fetch('/api/admin/hr-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `TNP-${Date.now()}-${doc.id}`,
            category: 'tender_preparation',
            code: tenderCode,
            col1: formattedCol1,
            col2: tenderCol2,
            col3: tenderCol3,
            col4: tenderCol4,
            status: 'not_started',
            statusLabel: 'Chưa thực hiện',
          }),
        }).catch(() => {});

        // Cập nhật trạng thái gói thầu sang "Tham gia"
        await fetch(`/api/tenders/${tenderCode}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'participating',
            statusLabel: 'Tham gia',
            badgeVariant: 'success',
          }),
        }).catch(() => {});
      } catch {}
    }

    window.dispatchEvent(new CustomEvent('decodoor_tender_updated'));
    window.dispatchEvent(new CustomEvent('decodoor_bidding_tender_updated'));
    window.dispatchEvent(new CustomEvent('decodoor_tender_preparation_updated'));
    window.dispatchEvent(new CustomEvent('decodoor_admin_hr_items_updated'));
    window.dispatchEvent(new CustomEvent('decodoor_notification_created'));
    window.dispatchEvent(new CustomEvent('decodoor_customers_updated'));
    window.dispatchEvent(new CustomEvent('decodoor_customer_created'));
    window.dispatchEvent(new CustomEvent('decodoor_quotations_updated'));
    window.dispatchEvent(new CustomEvent('decodoor_contracts_updated'));
    window.dispatchEvent(new CustomEvent('decodoor_contract_created'));
    onShowToast?.('success', 'Phê duyệt thành công', `Đã phê duyệt hàng loạt ${count} văn bản và tự động cập nhật sang phân hệ Lập hồ sơ dự thầu`);
  };

  // Tạo mới văn bản trình duyệt
  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocForm.title.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập tên tờ trình / đề xuất');
      return;
    }

    const numericVal = parseFloat(newDocForm.value.replace(/[^0-9]/g, '')) || 0;
    const docTypeNames: Record<ApprovalDocument['docType'], string> = {
      proposal: 'Tờ trình kỹ thuật',
      contract: 'Hợp đồng kinh tế',
      procurement: 'Đề xuất mua sắm',
      technical: 'Nghiệm thu và Thử nghiệm',
      acceptance: 'Hồ sơ nghiệm thu',
      advance: 'Yêu cầu tạm ứng',
    };

    const newDoc: ApprovalDocument = {
      id: `APR-${Date.now().toString().slice(-4)}`,
      code: newDocForm.code.trim() || `TT-${Date.now().toString().slice(-4)}`,
      title: newDocForm.title.trim(),
      docType: newDocForm.docType,
      docTypeName: docTypeNames[newDocForm.docType],
      department: newDocForm.department,
      submitter: newDocForm.submitter,
      submitterRole: newDocForm.submitterRole,
      submitDate: new Date().toLocaleDateString('vi-VN'),
      value: numericVal,
      valueLabel: numericVal > 0 ? `Giá trị: ${numericVal.toLocaleString('vi-VN')} đ` : 'Quy chuẩn / Định mức kỹ thuật',
      summary: newDocForm.content.slice(0, 100) + '...',
      content: newDocForm.content,
      priority: newDocForm.priority,
      status: 'pending',
      isRead: false,
      attachmentName: newDocForm.attachmentName || 'Tai_lieu_trinh_duyet.pdf',
      attachmentSize: '1.8 MB',
    };

    updateItems([newDoc, ...items]);
    setIsCreateModalOpen(false);
    setNewDocForm({
      title: '',
      code: `TT-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
      docType: 'proposal',
      department: 'Phòng Kỹ thuật và R&D',
      submitter: '',
      submitterRole: '',
      value: '',
      priority: 'normal',
      content: '',
      attachmentName: '',
    });

    onShowToast?.('success', 'Trình duyệt thành công', `Đã tạo và gửi trình duyệt hồ sơ ${newDoc.code}`);
    if (onStepChange && currentStep !== 1) {
      onStepChange(1);
    }
  };

  // Cấu hình các bộ lọc cho TableToolbar
  const toolbarFilters: TableToolbarFilter[] = [
    {
      id: 'filter-dept',
      value: departmentFilter,
      onChange: (val) => {
        setDepartmentFilter(val);
        setCurrentPage(1);
      },
      minWidth: '210px',
      options: deptOptions,
    },
    {
      id: 'filter-doc-type',
      value: docTypeFilter,
      onChange: (val) => {
        setDocTypeFilter(val);
        setCurrentPage(1);
      },
      minWidth: '190px',
      options: [
        { value: 'all', label: 'Tất cả loại văn bản' },
        { value: 'proposal', label: 'Tờ trình kỹ thuật, vật tư' },
        { value: 'procurement', label: 'Đề xuất mua sắm máy móc' },
        { value: 'contract', label: 'Hợp đồng kinh tế, báo giá' },
        { value: 'technical', label: 'Nghiệm thu và Thử nghiệm' },
        { value: 'advance', label: 'Yêu cầu tạm ứng' },
      ],
    },
    {
      id: 'filter-priority',
      value: priorityFilter,
      onChange: (val) => {
        setPriorityFilter(val);
        setCurrentPage(1);
      },
      minWidth: '160px',
      options: [
        { value: 'all', label: 'Tất cả mức độ' },
        { value: 'urgent', label: 'Khẩn cấp' },
        { value: 'high', label: 'Ưu tiên cao' },
        { value: 'normal', label: 'Bình thường' },
      ],
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── 1. COMPONENT TABLETOOLBAR ── */}
      <TableToolbar
        showMenu={false}
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        searchPlaceholder={
          currentStep === 1
            ? 'Tìm theo tên tờ trình, mã văn bản chờ duyệt...'
            : currentStep === 2
              ? 'Tìm trong danh sách văn bản đã phê duyệt...'
              : 'Tìm văn bản bị từ chối / cần chỉnh sửa...'
        }
        searchMinWidth="260px"
        filters={toolbarFilters}
        actionsAfterSearch={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Nút Phê duyệt hàng loạt khi ở Bước 1 và có tích chọn */}
            {currentStep === 1 && selectedIds.length > 0 && (
              <Button
                variant="success"
                size="md"
                leftIcon={<CheckCircle size={16} />}
                onClick={handleBatchApprove}
                style={{ whiteSpace: 'nowrap' }}
              >
                <span>Duyệt nhanh</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    padding: selectedIds.length >= 10 ? '0 5px' : '0',
                    borderRadius: '9999px',
                    backgroundColor: '#ffffff',
                    color: 'var(--color-success, #10b981)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    marginLeft: '4px',
                  }}
                >
                  {selectedIds.length}
                </span>
              </Button>
            )}

            {/* Nút Xoá với huy hiệu số lượng mục đã chọn */}
            <Button
              variant="danger"
              size="md"
              leftIcon={<Trash2 size={16} />}
              disabled={selectedIds.length === 0}
              onClick={() => setIsDeleteDialogOpen(true)}
              title={
                selectedIds.length === 0
                  ? 'Chọn ít nhất một dòng trong bảng để xóa'
                  : `Xóa ${selectedIds.length} văn bản đã chọn`
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Xoá</span>
              {selectedIds.length > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    padding: selectedIds.length >= 10 ? '0 5px' : '0',
                    borderRadius: '9999px',
                    backgroundColor: '#ffffff',
                    color: 'var(--color-danger, #e11d48)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {selectedIds.length}
                </span>
              )}
            </Button>
          </div>
        }
        style={{
          marginBottom: 0,
          padding: '10px 20px',
          flexShrink: 0,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      />

      {/* ── 2. BẢNG FULL WIDTH TABLE ── */}
      <div
        className="table-container"
        style={{
          flex: '1 1 0%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          border: 'none',
          borderRadius: 0,
        }}
      >
        <div
          className="table-responsive custom-scrollbar"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'auto',
            width: '100%',
          }}
        >
          <table
            className="custom-table"
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              textAlign: 'left',
              fontSize: '0.8125rem',
              margin: 0,
            }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: 'var(--bg-surface-2)',
              }}
            >
              <tr
                style={{
                  backgroundColor: 'var(--bg-surface-2)',
                  borderBottom: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th
                  style={{
                    width: '46px',
                    textAlign: 'center',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <input
                    type="checkbox"
                    className="decodoor-checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    title="Chọn tất cả các dòng trên trang này"
                    aria-label="Chọn tất cả các dòng"
                  />
                </th>
                <th style={{ padding: '8px 14px', minWidth: '320px' }}>Tên tờ trình / Hợp đồng</th>
                <th style={{ padding: '8px 14px', minWidth: '190px' }}>Bộ phận đề xuất</th>
                <th style={{ padding: '8px 14px', minWidth: '240px' }}>Giá trị và Nội dung chi tiết</th>
                <th style={{ padding: '8px 14px', minWidth: '140px' }}>
                  {currentStep === 1
                    ? 'Ngày trình duyệt'
                    : currentStep === 2
                      ? 'Ngày phê duyệt'
                      : 'Ngày từ chối'}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocs.length > 0 ? (
                paginatedDocs.map((doc) => {
                  const isSelected = selectedIds.includes(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      className={isSelected ? 'is-selected' : ''}
                      onClick={() => {
                        const updatedDoc = { ...doc, isRead: true };
                        setOpenChatOnSelect(false);
                        setSelectedDoc(updatedDoc);
                        setIsDetailOpen(true);
                        if (!doc.isRead) {
                          updateItems(items.map((d) => (d.id === doc.id ? updatedDoc : d)));
                        }
                      }}
                      style={{
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      title="Nhấn để xem toàn bộ hồ sơ tờ trình và bút phê"
                    >
                      {/* Checkbox */}
                      <td
                        style={{ textAlign: 'center', padding: '8px 12px' }}
                        onClick={(e) => handleToggleRow(doc.id, e)}
                      >
                        <input
                          type="checkbox"
                          className="decodoor-checkbox"
                          checked={isSelected}
                          onChange={() => { }}
                          aria-label={`Chọn tờ trình ${doc.code}`}
                        />
                      </td>

                      {/* Tên tờ trình / Hợp đồng (Dồn kèm Mã và Loại tờ trình, truncate tiêu đề) */}
                      <td style={{ padding: '8px 14px', maxWidth: '440px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                          {/* Dòng 1: Mã tờ trình + Loại tờ trình (kèm chấm đỏ nhấp nháy nếu khẩn cấp) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'nowrap' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontWeight: 700,
                                color: 'var(--color-primary)',
                                backgroundColor: 'var(--bg-surface-2)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.71875rem',
                                border: '1px solid var(--border-subtle)',
                                flexShrink: 0,
                              }}
                            >
                              {doc.code}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.71875rem',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                backgroundColor: 'var(--bg-surface-2)',
                                padding: '1px 7px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {/* Chấm đỏ nhỏ nhấp nháy cho văn bản mức độ khẩn cấp */}
                              {doc.priority === 'urgent' && (
                                <span
                                  title="Khẩn cấp"
                                  style={{
                                    display: 'inline-block',
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ef4444',
                                    animation: 'modern-stepper-pulse 1.4s infinite ease-in-out',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <Tag size={11} />
                              <span>{doc.docTypeName}</span>
                            </span>
                            {/* Huy hiệu MỚI: Chỉ hiển thị khi tờ trình chưa được mở xem (!doc.isRead) */}
                            <NewBadge show={!doc.isRead} />

                            {/* Nút xem tài liệu đính kèm ở tab mới */}
                            {(doc.attachmentName || (doc.attachments && doc.attachments.length > 0)) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAttachmentInNewTab(doc);
                                }}
                                title={`Nhấn để mở xem "${doc.attachmentName || 'Tài liệu đính kèm'}" ở tab mới`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '1px 6px',
                                  fontSize: '0.6875rem',
                                  fontWeight: 600,
                                  borderRadius: '4px',
                                  border: '1px solid rgba(2, 132, 199, 0.25)',
                                  backgroundColor: 'rgba(2, 132, 199, 0.08)',
                                  color: 'var(--color-primary, #0284c7)',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <FileEarmarkPdf size={11} style={{ color: '#ef4444' }} />
                                <span>Xem tệp đính kèm</span>
                              </button>
                            )}
                          </div>

                          {/* Dòng 2: Tên tờ trình áp dụng TRUNCATE */}
                          <div
                            title={doc.title}
                            style={{
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              fontSize: '0.84rem',
                              lineHeight: 1.35,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%',
                            }}
                          >
                            {doc.title}
                          </div>
                        </div>
                      </td>

                      {/* Bộ phận đề xuất */}
                      <td style={{ padding: '8px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                            {doc.department}
                          </span>
                          <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                            {doc.submitter}
                          </span>
                        </div>
                      </td>

                      {/* Giá trị và Nội dung chi tiết */}
                      <td style={{ padding: '8px 14px', maxWidth: '320px' }}>
                        {(() => {
                          let methodBadge = '';
                          let cleanSummary = doc.summary || '';
                          const methodMatch = cleanSummary.match(/(?:•\s*)?Phương thức:\s*([^•\n]+)/i);
                          if (methodMatch) {
                            methodBadge = methodMatch[1].trim();
                            cleanSummary = cleanSummary.replace(/(?:•\s*)?Phương thức:\s*[^•\n]+/i, '').trim();
                            cleanSummary = cleanSummary.replace(/^\s*•\s*|\s*•\s*$/g, '').trim();
                          } else if (doc.content) {
                            const contentMatch = doc.content.match(/Phương thức(?: nhận tiền)?:\s*([^\n(]+)/i);
                            if (contentMatch) {
                              methodBadge = contentMatch[1].trim();
                            }
                          }

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {doc.value > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: 'var(--color-primary, #0284c7)',
                                      fontSize: '0.8125rem',
                                    }}
                                  >
                                    {doc.value.toLocaleString('vi-VN')} đ
                                  </span>
                                  {methodBadge && (
                                    <span
                                      style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 600,
                                        padding: '1px 7px',
                                        borderRadius: '4px',
                                        backgroundColor: methodBadge.toLowerCase().includes('tiền mặt')
                                          ? 'rgba(245, 158, 11, 0.12)'
                                          : 'rgba(2, 132, 199, 0.1)',
                                        color: methodBadge.toLowerCase().includes('tiền mặt') ? '#d97706' : '#0284c7',
                                        border: methodBadge.toLowerCase().includes('tiền mặt')
                                          ? '1px solid rgba(245, 158, 11, 0.25)'
                                          : '1px solid rgba(2, 132, 199, 0.2)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        lineHeight: 1.3,
                                      }}
                                      title={`Phương thức giải ngân: ${methodBadge}`}
                                    >
                                      {methodBadge}
                                    </span>
                                  )}
                                </div>
                              ) : null}
                              <span
                                title={cleanSummary}
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)',
                                  lineHeight: 1.35,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {cleanSummary}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Ngày trình duyệt / phê duyệt */}
                      <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                            {currentStep === 1
                              ? doc.submitDate
                              : currentStep === 2
                                ? doc.approvalDate || doc.submitDate
                                : doc.rejectionDate || doc.submitDate}
                          </span>
                          {currentStep === 2 && doc.approvedBy && (
                            <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                              Bởi: {doc.approvedBy}
                            </span>
                          )}
                          {currentStep === 3 && (
                            <span style={{ fontSize: '0.71875rem', color: '#ef4444' }}>
                              Từ chối
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: 'center',
                      padding: '56px 16px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-surface-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <FileCheck size={24} />
                      </div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Không có văn bản nào trong danh sách
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '380px' }}>
                        {searchQuery || departmentFilter !== 'all' || docTypeFilter !== 'all'
                          ? 'Không tìm thấy kết quả phù hợp với tiêu chí lọc. Bạn có thể thử đặt lại bộ lọc.'
                          : currentStep === 1
                            ? 'Hiện tại không có tờ trình nào đang chờ Ban Giám đốc phê duyệt.'
                            : currentStep === 2
                              ? 'Chưa có tờ trình nào được phê duyệt trong danh mục này.'
                              : 'Chưa có tờ trình nào bị từ chối phê duyệt.'}
                      </div>
                      {(searchQuery || departmentFilter !== 'all' || docTypeFilter !== 'all' || priorityFilter !== 'all') && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSearchQuery('');
                            setDepartmentFilter('all');
                            setDocTypeFilter('all');
                            setPriorityFilter('all');
                            setCurrentPage(1);
                          }}
                        >
                          Đặt lại bộ lọc
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── 3. COMPONENT PAGINATION ── */}
        <div
          className="pagination-container"
          style={{
            marginTop: 'auto',
            flexShrink: 0,
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-1)',
            padding: 0,
          }}
        >
          <Pagination
            currentPage={currentPage}
            totalItems={filteredDocs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </div>
      </div>

      {/* ── 1. OFFCANVAS CHO HỒ SƠ CHỜ PHÊ DUYỆT ── */}
      <PendingApprovalOffcanvas
        isOpen={isDetailOpen && selectedDoc?.status === "pending"}
        onClose={() => {
          setIsDetailOpen(false);
          setOpenChatOnSelect(false);
        }}
        document={selectedDoc}
        initialOpenChat={openChatOnSelect}
        onApprove={(doc) => handleOpenApproveModal(doc)}
        onReject={(doc) => handleOpenRejectModal(doc)}
        onShowToast={onShowToast}
      />

      {/* ── 2. OFFCANVAS CHO HỒ SƠ ĐÃ PHÊ DUYỆT ── */}
      <ApprovedDocumentOffcanvas
        isOpen={isDetailOpen && selectedDoc?.status === "approved"}
        onClose={() => {
          setIsDetailOpen(false);
          setOpenChatOnSelect(false);
        }}
        document={selectedDoc}
        initialOpenChat={openChatOnSelect}
        onPrint={(doc) =>
          onShowToast?.("info", "In tài liệu", `In quyết định phê duyệt ${doc.code}`)
        }
        onShowToast={onShowToast}
      />

      {/* ── 3. OFFCANVAS CHO HỒ SƠ TỪ CHỐI ── */}
      <RejectedDocumentOffcanvas
        isOpen={isDetailOpen && selectedDoc?.status === "rejected"}
        onClose={() => {
          setIsDetailOpen(false);
          setOpenChatOnSelect(false);
        }}
        document={selectedDoc}
        initialOpenChat={openChatOnSelect}
        onResubmit={(doc) => {
          setNewDocForm({
            title: `${doc.title} (Trình lại)`,
            code: `${doc.code}-R1`,
            docType: doc.docType,
            department: doc.department,
            submitter: doc.submitter,
            submitterRole: doc.submitterRole,
            value: doc.value > 0 ? doc.value.toString() : "",
            priority: doc.priority,
            content: doc.content,
            attachmentName: doc.attachmentName || "",
          });
          setIsDetailOpen(false);
          setOpenChatOnSelect(false);
          setIsCreateModalOpen(true);
        }}
        onShowToast={onShowToast}
      />

      {/* ── MODAL BÚT PHÊ DUYỆT HOẶC TỪ CHỐI ── */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={handleCloseActionModal}
        title={actionModal.type === 'approve' ? 'Phê duyệt tờ trình văn bản' : 'Từ chối phê duyệt tờ trình'}
        maxWidth="500px"
        zIndex={2200}
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCloseActionModal}
            >
              Hủy bỏ
            </Button>
            <Button
              variant={actionModal.type === 'approve' ? 'success' : 'danger'}
              size="md"
              leftIcon={actionModal.type === 'approve' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              onClick={handleConfirmAction}
            >
              {actionModal.type === 'approve' ? 'Xác nhận phê duyệt' : 'Xác nhận từ chối'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {actionModal.targetDoc && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface-2)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                [{actionModal.targetDoc.code}] {actionModal.targetDoc.title}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Đơn vị trình: {actionModal.targetDoc.department} • Người trình: {actionModal.targetDoc.submitter}
              </div>
            </div>
          )}

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '6px',
              }}
            >
              {actionModal.type === 'approve' ? 'Ý kiến bút phê Ban Giám đốc:' : 'Lý do từ chối phê duyệt (bắt buộc):'}
            </label>
            <textarea
              rows={4}
              value={actionModal.note}
              onChange={(e) => setActionModal((prev) => ({ ...prev, note: e.target.value }))}
              placeholder={
                actionModal.type === 'approve'
                  ? 'Nhập ý kiến chỉ đạo hoặc chỉ định đơn vị thực hiện...'
                  : 'Nêu rõ lý do từ chối, các điểm cần sửa đổi hoặc bổ sung chào giá...'
              }
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-1)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </Modal>

      {/* ── MODAL TRÌNH DUYỆT VĂN BẢN MỚI ── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Trình duyệt văn bản mới lên Ban Giám đốc"
        maxWidth="640px"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" size="md" onClick={() => setIsCreateModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button variant="primary" size="md" leftIcon={<Check2 size={16} />} onClick={handleCreateDocument}>
              Gửi trình Ban Giám đốc
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                Mã văn bản trình ký *
              </label>
              <Input
                value={newDocForm.code}
                onChange={(e) => setNewDocForm({ ...newDocForm, code: e.target.value })}
                placeholder="VD: TT-1026-001"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                Loại văn bản *
              </label>
              <Select
                value={newDocForm.docType}
                onChange={(e) => setNewDocForm({ ...newDocForm, docType: e.target.value as any })}
                options={[
                  { value: 'proposal', label: 'Tờ trình kỹ thuật / phương án' },
                  { value: 'procurement', label: 'Đề xuất mua sắm máy móc thiết bị' },
                  { value: 'contract', label: 'Hợp đồng kinh tế dự án' },
                  { value: 'technical', label: 'Nghiệm thu thử nghiệm PCCC' },
                  { value: 'acceptance', label: 'Hồ sơ nghiệm thu công trình' },
                  { value: 'advance', label: 'Yêu cầu tạm ứng kinh phí' },
                ]}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Tên tờ trình / Hợp đồng đề xuất *
            </label>
            <Input
              value={newDocForm.title}
              onChange={(e) => setNewDocForm({ ...newDocForm, title: e.target.value })}
              placeholder="VD: Tờ trình phê duyệt mua máy cưa bàn trượt 2 lưỡi xưởng 1..."
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                Bộ phận đề xuất *
              </label>
              <DepartmentSelect
                value={newDocForm.department}
                onChange={(e) => setNewDocForm({ ...newDocForm, department: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                Mức độ ưu tiên
              </label>
              <Select
                value={newDocForm.priority}
                onChange={(e) => setNewDocForm({ ...newDocForm, priority: e.target.value as any })}
                options={[
                  { value: 'normal', label: 'Bình thường' },
                  { value: 'high', label: 'Ưu tiên cao' },
                  { value: 'urgent', label: 'Khẩn cấp (Cần duyệt gấp)' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                Người trình duyệt *
              </label>
              <Input
                value={newDocForm.submitter}
                onChange={(e) => setNewDocForm({ ...newDocForm, submitter: e.target.value })}
                placeholder="VD: Nguyễn Văn Tuấn"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                Tổng giá trị dự toán (VNĐ)
              </label>
              <Input
                value={newDocForm.value}
                onChange={(e) => setNewDocForm({ ...newDocForm, value: e.target.value })}
                placeholder="VD: 350000000 (để trống nếu phi tài chính)"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Nội dung đề xuất chi tiết và Căn cứ phê duyệt *
            </label>
            <textarea
              rows={4}
              value={newDocForm.content}
              onChange={(e) => setNewDocForm({ ...newDocForm, content: e.target.value })}
              placeholder="Trình bày lý do, sự cần thiết, các giải pháp so sánh và đề xuất cụ thể..."
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-1)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Tên file tài liệu đính kèm
            </label>
            <Input
              value={newDocForm.attachmentName}
              onChange={(e) => setNewDocForm({ ...newDocForm, attachmentName: e.target.value })}
              placeholder="VD: To_trinh_kem_3_bao_gia_canh_tranh.pdf"
            />
          </div>
        </form>
      </Modal>

      {/* ── DIALOG XÁC NHẬN XOÁ ── */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSelected}
        title="Xác nhận xoá văn bản trình duyệt"
        message={`Bạn có chắc chắn muốn xoá ${selectedIds.length} văn bản đã chọn khỏi hệ thống? Thao tác này không thể hoàn tác.`}
        confirmText="Xoá vĩnh viễn"
        cancelText="Hủy bỏ"
        variant="danger"
      />
    </div>
  );
};
