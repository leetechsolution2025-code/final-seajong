import React, { useState, useMemo } from 'react';
import { StepPage } from '../../../components/common/StepPage';
import { DocumentApprovalView, cleanDocumentList, type ApprovalDocument } from './DocumentApprovalView';
import type { ModernStepItem } from '../../../types';
import { HourglassSplit, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';

export interface DocumentApprovalPageProps {
  onNavigate?: (navId: string) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

const DEFAULT_SEAJONG_APPROVALS: ApprovalDocument[] = [
  {
    id: 'APR-2026-001',
    code: 'TT-MKT-1026-01',
    title: 'Tờ trình phê duyệt ngân sách chiến dịch Meta & TikTok tháng 11',
    docType: 'proposal',
    docTypeName: 'Tờ trình kế hoạch',
    department: 'Phòng Marketing',
    submitter: 'Nguyễn Văn Đạt',
    submitterRole: 'Trưởng phòng Marketing',
    submitDate: '22/10/2026',
    value: 85000000,
    valueLabel: '85.000.000 đ',
    priority: 'urgent',
    status: 'pending',
    summary: 'Đề xuất phân bổ ngân sách 85 triệu đồng triển khai quảng bá bộ sưu tập sen cây phím đàn hiển thị số trên nền tảng Meta và TikTok Ads chuẩn bị cho mùa mua sắm cao điểm cuối năm.',
    content: 'Kính gửi Ban Giám đốc,\n\nPhòng Marketing xin trình duyệt kế hoạch chạy truyền thông số cho dòng sen tắm hiển thị số Seajong. Dự kiến tiếp cận 500.000 lượt khách hàng tiềm năng, chuyển đổi khoảng 350 khách hàng liên hệ đại lý.',
    attachments: [
      { name: 'Ke_hoach_ngan_sach_MKT_T11.pdf', size: '1.4 MB', type: 'application/pdf', url: '#' },
      { name: 'Bang_du_toan_chi_phi_Meta_TikTok.xlsx', size: '420 KB', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', url: '#' }
    ]
  },
  {
    id: 'APR-2026-002',
    code: 'DX-TU-1026-02',
    title: 'Đề xuất tạm ứng chi phí in ấn Catalogue Sen vòi Seajong 2026',
    docType: 'advance',
    docTypeName: 'Đề xuất tạm ứng',
    department: 'Phòng Marketing',
    submitter: 'Trần Thị Mai',
    submitterRole: 'Chuyên viên Thiết kế & Thương hiệu',
    submitDate: '23/10/2026',
    value: 36000000,
    valueLabel: '36.000.000 đ',
    priority: 'high',
    status: 'pending',
    summary: 'Tạm ứng đợt 1 (50% giá trị hợp đồng in ấn 2.000 cuốn Catalogue thiết bị vệ sinh Seajong phiên bản cao cấp phục vụ hệ thống 120 đại lý).',
    content: 'Kính gửi Tổng Giám đốc,\n\nĐể đảm bảo tiến độ bàn giao Catalogue cho sự kiện Vietbuild và cấp phát đại lý trước ngày 05/11/2026, kính trình Ban Giám đốc duyệt tạm ứng đợt 1 cho Nhà in Hồng Hà.',
    attachments: [
      { name: 'Hop_dong_in_an_Catalogue_Seajong.pdf', size: '2.1 MB', type: 'application/pdf', url: '#' }
    ]
  },
  {
    id: 'APR-2026-003',
    code: 'TT-KD-1026-05',
    title: 'Tờ trình cấp hạn mức công nợ 500 triệu cho Đại lý Thành Đạt',
    docType: 'proposal',
    docTypeName: 'Tờ trình kinh doanh',
    department: 'Phòng Kinh doanh',
    submitter: 'Phạm Hùng Sơn',
    submitterRole: 'Giám đốc Kinh doanh Miền Bắc',
    submitDate: '19/10/2026',
    value: 500000000,
    valueLabel: '500.000.000 đ',
    priority: 'urgent',
    status: 'pending',
    summary: 'Đại lý Thành Đạt (Hải Dương) xin nâng hạn mức công nợ từ 300 triệu lên 500 triệu đồng để nhập lô hàng dự án 40 bộ sen cây phím đàn cung cấp cho Khách sạn 4 sao Nam Cường.',
    content: 'Đại lý Thành Đạt là đối tác chiến lược cấp 1, lịch sử thanh toán tốt trong 18 tháng qua (hệ số tín nhiệm AAA, chưa từng có nợ quá hạn). Kính trình Ban Giám đốc phê duyệt điều chỉnh hạn mức bảo lãnh.',
    attachments: [
      { name: 'Ho_so_nang_luc_Dai_ly_Thanh_Dat.pdf', size: '3.5 MB', type: 'application/pdf', url: '#' },
      { name: 'Hop_dong_cung_cap_ks_Nam_Cuong.pdf', size: '1.8 MB', type: 'application/pdf', url: '#' }
    ]
  },
  {
    id: 'APR-2026-004',
    code: 'HD-DA-1026-04',
    title: 'Phê duyệt hợp đồng tài trợ và bảng hiệu trưng bày tại Showroom An Gia Phát',
    docType: 'contract',
    docTypeName: 'Hợp đồng kinh tế',
    department: 'Phòng Marketing',
    submitter: 'Nguyễn Văn Đạt',
    submitterRole: 'Trưởng phòng Marketing',
    submitDate: '20/10/2026',
    value: 45000000,
    valueLabel: '45.000.000 đ',
    priority: 'high',
    status: 'approved',
    summary: 'Hợp đồng liên kết trưng bày thương hiệu và kệ mẫu sen tắm cao cấp tại Trung tâm thiết bị nội thất An Gia Phát (Hà Đông, Hà Nội).',
    content: 'Đã được Tổng Giám đốc Lê Công Vụ phê duyệt ngày 21/10/2026. Chuyển phòng Kế toán thực hiện giải ngân theo điều khoản hợp đồng.',
    attachments: [
      { name: 'Hop_dong_tai_tro_Showroom_AnGiaPhat_da_ky.pdf', size: '2.8 MB', type: 'application/pdf', url: '#' }
    ]
  },
  {
    id: 'APR-2026-005',
    code: 'YC-NS-1026-03',
    title: 'Phiếu yêu cầu cấp bổ sung 01 nhân sự Content Creator & Quay dựng Video',
    docType: 'proposal',
    docTypeName: 'Đề xuất nhân sự',
    department: 'Phòng Marketing',
    submitter: 'Trần Thị Mai',
    submitterRole: 'Chuyên viên Thương hiệu',
    submitDate: '25/10/2026',
    value: 0,
    valueLabel: 'Định biên nhân sự',
    priority: 'normal',
    status: 'pending',
    summary: 'Yêu cầu tuyển dụng 01 nhân sự chuyên trách sáng tạo nội dung video ngắn (Reels, TikTok, Shorts) phục vụ quảng bá tính năng sản phẩm sen vòi.',
    content: 'Khối lượng công việc sản xuất video thực tế tăng cao. Đề nghị Ban Giám đốc cho phép bổ sung định biên 01 nhân sự trong tháng 11/2026.',
    attachments: [
      { name: 'Mo_ta_cong_viec_JD_Content_Creator.pdf', size: '650 KB', type: 'application/pdf', url: '#' }
    ]
  }
];

export const DocumentApprovalPage: React.FC<DocumentApprovalPageProps> = ({ onShowToast }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [approvalDocuments, setApprovalDocuments] = useState<ApprovalDocument[]>(() => {
    try {
      const saved = localStorage.getItem('decodoor_approval_documents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return cleanDocumentList(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse approval documents', e);
    }
    // Ghi nhận dữ liệu mẫu Seajong vào storage nếu chưa có
    try {
      localStorage.setItem('decodoor_approval_documents', JSON.stringify(DEFAULT_SEAJONG_APPROVALS));
    } catch (_) {}
    return DEFAULT_SEAJONG_APPROVALS;
  });

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
