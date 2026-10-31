import React, { useState, useMemo, useEffect } from 'react';
import { StepPage } from '../../../components/common/StepPage';
import { DocumentApprovalView, type ApprovalDocument } from './DocumentApprovalView';
import type { ModernStepItem } from '../../../types';
import { HourglassSplit, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';

export interface DocumentApprovalPageProps {
  onNavigate?: (navId: string) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

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
  } else if (entityType.includes('expense') || entityType.includes('advance') || meta?.type?.includes('advance')) {
    docType = 'advance';
    docTypeName = meta?.loaiText || 'Đề xuất tạm ứng / Chi phí';
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
    meta?.reason ||
    meta?.details?.reason ||
    row.note ||
    row.rejectedReason ||
    row.entityTitle ||
    'Hồ sơ trình Ban Giám đốc phê duyệt từ hệ thống CSDL Seajong.';

  return {
    id: String(row.id || `APR-${idx + 1}`),
    code: String(row.entityCode || meta?.personalRequestId || `TT-${String(idx + 1).padStart(4, '0')}`),
    title: String(row.entityTitle || 'Tờ trình phê duyệt hồ sơ'),
    docType,
    docTypeName,
    department: String(row.department || meta?.departmentName || (entityType.includes('purchase') ? 'Phòng Mua hàng' : entityType.includes('expense') ? 'Phòng Kế toán' : 'Phòng ban Seajong')),
    submitter: String(row.requestedByName || meta?.employeeName || 'Cán bộ Seajong'),
    submitterRole: String(meta?.position || 'Nhân sự trình duyệt'),
    submitDate: createdDate,
    value: rawVal,
    valueLabel,
    priority,
    status,
    summary: String(reasonText),
    content: String(reasonText),
    attachments: [],
  };
};

export const DocumentApprovalPage: React.FC<DocumentApprovalPageProps> = ({ onShowToast }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [approvalDocuments, setApprovalDocuments] = useState<ApprovalDocument[]>([]);

  useEffect(() => {
    fetch('/api/approval-requests')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        const mapped = rows.map((r: any, idx: number) => mapDbApprovalToDocument(r, idx));
        setApprovalDocuments(mapped);
      })
      .catch((err) => console.error('Lỗi tải danh sách phê duyệt từ DB:', err));
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
      desc: 'Hồ sơ đã được phê duyệt',
      icon: <CheckCircleFill size={17} />,
      badge: approvalCounts.approved > 0 ? `${approvalCounts.approved}` : undefined,
      badgeVariant: 'success',
    },
    {
      num: 3,
      id: 'rejected',
      title: 'Từ chối',
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
