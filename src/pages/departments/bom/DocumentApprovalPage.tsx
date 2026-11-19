import React, { useState, useMemo, useEffect } from 'react';
import { StepPage } from '../../../components/common/StepPage';
import { DocumentApprovalView, type ApprovalDocument } from './DocumentApprovalView';
import type { ModernStepItem } from '../../../types';
import { HourglassSplit, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';

export interface DocumentApprovalPageProps {
  onNavigate?: (navId: string) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

const normalizeDepartmentName = (rawDept?: string, entityType = '', entityCode = ''): string => {
  const d = String(rawDept || '').trim().toLowerCase();
  const ent = String(entityType || '').toLowerCase();
  const code = String(entityCode || '').toUpperCase();

  if (d.includes('kho') || d.includes('vận') || d.includes('logistics')) {
    return 'Phòng Kho vận & Logistics';
  }
  if (d.includes('sản xuất') || d.includes('production')) {
    return 'Phòng Sản xuất';
  }
  if (d.includes('kỹ thuật') || d.includes('r&d')) {
    return 'Phòng Kỹ thuật & R&D';
  }
  if (d.includes('mua') || d.includes('cung ứng') || d.includes('vật tư') || d.includes('purchase')) {
    return 'Phòng Mua hàng & Cung ứng';
  }
  if (d.includes('kế toán') || d.includes('tài chính') || d.includes('finance') || d.includes('thu chi')) {
    return 'Phòng Tài chính – Kế toán';
  }
  if (d.includes('kinh doanh') || d.includes('sales') || d.includes('thị trường') || d.includes('bán hàng')) {
    return 'Phòng Kinh doanh';
  }
  if (d.includes('marketing') || d.includes('mkt') || d.includes('truyền thông')) {
    return 'Phòng Marketing';
  }
  if (d.includes('nhân sự') || d.includes('hành chính') || d.includes('hr') || d.includes('nội vụ')) {
    return 'Phòng Hành chính – Nhân sự';
  }
  if (d.includes('chất lượng') || d.includes('qa') || d.includes('qc')) {
    return 'Phòng Đảm bảo chất lượng (QA/QC)';
  }
  if (d.includes('giám đốc') || d.includes('ban lãnh đạo') || d.includes('board')) {
    return 'Ban Giám đốc';
  }

  if (ent.includes('purchase') || code.startsWith('DH-') || code.startsWith('PO-') || code.startsWith('YCMH-')) {
    return 'Phòng Mua hàng & Cung ứng';
  }
  if (ent.includes('production') || code.startsWith('LSX-')) {
    return 'Phòng Sản xuất';
  }
  if (ent.includes('marketing') || code.startsWith('DX-MKT-')) {
    return 'Phòng Marketing';
  }
  if (ent.includes('expense') || ent.includes('payable') || ent.includes('chi') || ent.includes('payment')) {
    return 'Phòng Tài chính – Kế toán';
  }

  if (rawDept && !rawDept.includes('Phòng ban Seajong') && rawDept !== 'None' && rawDept !== 'null') {
    return rawDept.startsWith('Phòng') ? rawDept : `Phòng ${rawDept}`;
  }

  return 'Phòng Hành chính – Nhân sự';
};

const normalizeSubmitterName = (rawName?: string, meta: any = {}, entityType = '', entityCode = ''): string => {
  let name = String(rawName || '').trim();
  name = name.replace(/\s*\([^)]*\)$/, '').trim();

  const metaName = meta?.employeeName || meta?.fullName || meta?.applicantName || meta?.proposer || meta?.bankAccountName;
  if (metaName && typeof metaName === 'string' && metaName.trim()) {
    const cleanMeta = metaName.replace(/\s*\([^)]*\)$/, '').trim();
    if (cleanMeta && cleanMeta !== 'Cán bộ Seajong' && cleanMeta !== 'Lê Công Vụ') {
      name = cleanMeta;
    }
  }

  const ent = String(entityType || '').toLowerCase();
  const code = String(entityCode || '').toUpperCase();
  if (ent.includes('purchase') || code.startsWith('DH-') || code.startsWith('PO-')) {
    if (!name || name === 'Cán bộ Seajong' || name === 'Lê Công Vụ') {
      name = meta?.creatorName || meta?.nguoiYeuCau || 'Nguyễn Thu Huyền (Phụ trách Mua hàng)';
    }
  }

  if (!name || name === 'Cán bộ Seajong') {
    if (meta?.bankAccountName) return meta.bankAccountName;
    if (meta?.employeeName) return meta.employeeName;
    return 'Cán bộ phụ trách nghiệp vụ';
  }

  return name;
};

const mapDbApprovalToDocument = (row: any, idx: number): ApprovalDocument => {
  let meta: any = {};
  try {
    meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {};
  } catch {}

  const entityType = String(row.entityType || '').toLowerCase();
  let docType: ApprovalDocument['docType'] = 'proposal';
  let docTypeName = 'Tờ trình phê duyệt';
  if (entityType.includes('purchase') || entityType.includes('contract')) {
    docType = 'contract';
    docTypeName = 'Đơn mua hàng / Hợp đồng';
  } else if (entityType.includes('payment') || entityType.includes('payable') || entityType.includes('chi')) {
    docType = 'proposal';
    docTypeName = meta?.loaiText || 'Yêu cầu chi tiền';
  } else if (entityType.includes('expense') || entityType.includes('advance') || meta?.type?.includes('advance')) {
    docType = 'advance';
    docTypeName =
      meta?.loaiText ||
      (String(row.entityCode || '').startsWith('YC-') || entityType === 'advance' || entityType === 'advance_payment'
        ? 'Yêu cầu tạm ứng nhân viên'
        : 'Đề xuất tạm ứng NCC');
  } else if (entityType.includes('personal')) {
    docType = 'proposal';
    docTypeName = meta?.loaiText || 'Đề xuất nhân sự';
  } else if (entityType.includes('production')) {
    docType = 'proposal';
    docTypeName = 'Lệnh sản xuất';
  }

  const rawVal = Number(meta?.totalAmount || meta?.soTien || meta?.details?.amount || meta?.amount || 0);
  const valueLabel = rawVal > 0 ? `${rawVal.toLocaleString('vi-VN')} đ` : (meta?.loaiText || 'Hồ sơ nghiệp vụ');
  const createdDate = row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
  const approvedDate = row.approvedAt
    ? new Date(row.approvedAt).toLocaleDateString('vi-VN')
    : row.updatedAt
    ? new Date(row.updatedAt).toLocaleDateString('vi-VN')
    : createdDate;
  const rawStatus = String(row.status || 'pending').toLowerCase();
  const status: ApprovalDocument['status'] =
    rawStatus === 'approved' || rawStatus === 'completed'
      ? 'approved'
      : rawStatus === 'rejected'
      ? 'rejected'
      : 'pending';
  const rawPriority = String(row.priority || 'normal').toLowerCase();
  const priority: ApprovalDocument['priority'] =
    rawPriority === 'urgent' ? 'urgent' : rawPriority === 'high' ? 'high' : 'normal';

  const reasonText =
    meta?.content ||
    meta?.summary ||
    meta?.reason ||
    meta?.details?.reason ||
    row.note ||
    row.rejectedReason ||
    row.entityTitle ||
    'Hồ sơ trình Ban Giám đốc phê duyệt từ hệ thống CSDL Seajong.';

  const rejectionReason =
    status === 'rejected'
      ? String(row.rejectedReason || meta?.rejectedReason || meta?.rejectionReason || row.note || meta?.note || 'Giám đốc từ chối phê duyệt').trim()
      : undefined;

  const stdDepartment = normalizeDepartmentName(
    row.department || meta?.departmentName || meta?.department,
    entityType,
    row.entityCode || row.id
  );
  const stdSubmitter = normalizeSubmitterName(
    row.requestedByName,
    meta,
    entityType,
    row.entityCode || row.id
  );

  return {
    id: String(row.id || `APR-${idx + 1}`),
    code: String(row.entityCode || meta?.personalRequestId || `TT-${String(idx + 1).padStart(4, '0')}`),
    title: String(row.entityTitle || 'Tờ trình phê duyệt hồ sơ'),
    docType,
    docTypeName,
    department: stdDepartment,
    submitter: stdSubmitter,
    submitterRole: String(meta?.position || 'Nhân sự trình duyệt'),
    submitDate: createdDate,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    approvalDate: status === 'approved' ? approvedDate : undefined,
    approvedBy: status === 'approved' ? (row.approvedById || meta?.approvedBy || 'Lê Công Vụ (Giám đốc)') : undefined,
    approvalNote: status === 'approved' ? (row.note || meta?.note || 'Đồng ý phê duyệt') : undefined,
    rejectionDate: status === 'rejected' ? approvedDate : undefined,
    rejectedBy: status === 'rejected' ? (row.approvedById || meta?.rejectedBy || 'Lê Công Vụ (Giám đốc)') : undefined,
    rejectionReason,
    value: rawVal,
    valueLabel,
    priority,
    status,
    summary: String(meta?.summary || reasonText),
    content: String(meta?.content || reasonText),
    attachments: Array.isArray(meta?.attachments) ? meta.attachments : [],
    entityType: row.entityType || '',
    entityId: row.entityId || '',
    metadata: meta,
  };
};

export const DocumentApprovalPage: React.FC<DocumentApprovalPageProps> = ({ onShowToast }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [approvalDocuments, setApprovalDocuments] = useState<ApprovalDocument[]>([]);

  useEffect(() => {
    let isSubscribed = true;

    const loadRequests = () => {
      fetch('/api/approval-requests')
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (!isSubscribed) return;
          const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
          const mapped = rows.map((r: any, idx: number) => mapDbApprovalToDocument(r, idx));
          setApprovalDocuments(mapped);
        })
        .catch((err) => console.error('Lỗi tải danh sách phê duyệt từ DB:', err));
    };

    loadRequests();
    const interval = setInterval(loadRequests, 3500);

    const handleUpdate = () => loadRequests();
    window.addEventListener('decodoor_approval_documents_updated', handleUpdate);
    window.addEventListener('seajong_approval_documents_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener('decodoor_approval_documents_updated', handleUpdate);
      window.removeEventListener('seajong_approval_documents_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const approvalCounts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    approvalDocuments.forEach((doc) => {
      if (doc.status === 'approved') approved++;
      else if (doc.status === 'rejected') rejected++;
      else pending++;
    });
    return { pending, approved, rejected };
  }, [approvalDocuments]);

  const approvalSteps: ModernStepItem[] = useMemo(() => [
    {
      num: 1,
      id: 'pending',
      title: 'Chờ phê duyệt',
      mobileTitle: 'Chờ duyệt',
      desc: 'Tờ trình và hồ sơ đợi duyệt',
      icon: <HourglassSplit size={17} />,
      hasNewData: approvalCounts.pending > 0,
      badge: approvalCounts.pending > 0 ? `${approvalCounts.pending}` : undefined,
      badgeVariant: 'warning',
    },
    {
      num: 2,
      id: 'approved',
      title: 'Đã phê duyệt',
      mobileTitle: 'Đã duyệt',
      desc: 'Hồ sơ đã được phê duyệt',
      icon: <CheckCircleFill size={17} />,
      badge: approvalCounts.approved > 0 ? `${approvalCounts.approved}` : undefined,
      badgeVariant: 'success',
    },
    {
      num: 3,
      id: 'rejected',
      title: 'Từ chối',
      mobileTitle: 'Từ chối',
      desc: 'Hồ sơ bị từ chối / cần sửa đổi',
      icon: <XCircleFill size={17} />,
      badge: approvalCounts.rejected > 0 ? `${approvalCounts.rejected}` : undefined,
      badgeVariant: 'danger',
    },
  ], [approvalCounts]);

  return (
    <StepPage
      title="Trung tâm phê duyệt"
      description="Quản lý và xét duyệt các tờ trình, đề xuất mua sắm, ký duyệt hợp đồng và hồ sơ nghiệp vụ toàn công ty"
      icon="bi-check2-square"
      color="rose"
      badge="TRUNG TÂM PHÊ DUYỆT"
      tickerContext="approvals"
      hideTicker={true}
      steps={approvalSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      className="bom-approval-step-page"
    >
      <DocumentApprovalView
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onShowToast={onShowToast}
        items={approvalDocuments}
        onItemsChange={setApprovalDocuments}
      />
    </StepPage>
  );
};

export default DocumentApprovalPage;
