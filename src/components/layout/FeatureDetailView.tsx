import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StandardPage } from './StandardPage';
import { TableToolbar } from '../common/TableToolbar';
import { FullWidthTable } from '../common/FullWidthTable';
import { Pagination } from '../common/Pagination';
import { Offcanvas } from '../common/Offcanvas';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { EmployeesPage } from '../../pages/hr/EmployeesPage';
import { DocumentApprovalPage } from '../../pages/departments/bom/DocumentApprovalPage';

interface FeatureDetailViewProps {
  menuKey: string;
  deptCode: string;
}

interface FeatureMeta {
  title: string;
  groupName: string;
  icon: string;
  color: 'rose' | 'indigo' | 'emerald' | 'amber' | 'blue' | 'violet' | 'cyan';
  desc: string;
  badge: string;
}

interface FeatureRowItem {
  id: string;
  code: string;
  title: string;
  dept: string;
  deadline: string;
  priority: string;
  status: string;
}

export const FeatureDetailView: React.FC<FeatureDetailViewProps> = ({ menuKey, deptCode }) => {
  if (menuKey === 'employees') {
    return <EmployeesPage />;
  }

  if (menuKey === 'approvals' || menuKey === 'requests_approvals' || menuKey === 'hr_requests_approvals') {
    return <DocumentApprovalPage />;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('Bình thường');
  const [newNotes, setNewNotes] = useState('');
  const [dbRows, setDbRows] = useState<FeatureRowItem[]>([]);
  const [, setLoading] = useState(false);

  // Tra cứu metadata theo menuKey
  const getFeatureMeta = (key: string): FeatureMeta => {
    switch (key) {
      // ── Personal & Archive ──
      case 'my_tasks':
        return {
          title: 'Danh sách công việc cá nhân',
          groupName: 'CÔNG VIỆC CÁ NHÂN',
          icon: 'bi-list-check',
          color: 'rose',
          desc: 'Quản lý, tiếp nhận và báo cáo tiến độ công việc được giao trong ngày',
          badge: 'CÁ NHÂN',
        };
      case 'my_attendance':
        return {
          title: 'Chấm công và điểm danh',
          groupName: 'CÔNG VIỆC CÁ NHÂN',
          icon: 'bi-clock-history',
          color: 'blue',
          desc: 'Dữ liệu chấm công máy quét vân tay & GPS phân xưởng Seajong tháng 10/2026',
          badge: 'CÔNG CA',
        };
      case 'my_requests':
        return {
          title: 'Yêu cầu và đề xuất cá nhân',
          groupName: 'CÔNG VIỆC CÁ NHÂN',
          icon: 'bi-file-earmark-plus',
          color: 'amber',
          desc: 'Tạo đơn xin nghỉ phép, tạm ứng chi phí, công tác và theo dõi tiến độ phê duyệt',
          badge: 'ĐỀ XUẤT',
        };
      case 'documents':
      case 'doc_library':
        return {
          title: 'Thư viện tài liệu nội bộ',
          groupName: 'LƯU TRỮ HỆ THỐNG',
          icon: 'bi-archive',
          color: 'indigo',
          desc: 'Kho lưu trữ quy chuẩn kỹ thuật ISO 9001, hồ sơ pháp lý và tài liệu thiết kế sen vòi',
          badge: 'LƯU TRỮ',
        };
      case 'meetings':
      case 'meeting_minutes':
        return {
          title: 'Nội dung & Biên bản cuộc họp',
          groupName: 'LƯU TRỮ HỆ THỐNG',
          icon: 'bi-calendar-event',
          color: 'cyan',
          desc: 'Biên bản các phiên họp giao ban tuần, họp chiến lược và kết luận chỉ đạo',
          badge: 'BIÊN BẢN',
        };

      // ── Ban Giám đốc ──
      case 'categories':
        return {
          title: 'Quản lý danh mục hệ thống',
          groupName: 'QUẢN TRỊ HỆ THỐNG',
          icon: 'bi-folder-symlink',
          color: 'violet',
          desc: 'Thiết lập danh mục sản phẩm, nhóm hàng, khách hàng, nhà cung cấp và trạng thái quy trình',
          badge: 'DANH MỤC',
        };
      case 'users':
        return {
          title: 'Phân quyền người dùng & Tài khoản',
          groupName: 'QUẢN TRỊ HỆ THỐNG',
          icon: 'bi-person-badge',
          color: 'violet',
          desc: 'Quản lý tài khoản đăng nhập, nhóm quyền hạn và phân quyền truy cập 18 phòng ban',
          badge: 'BẢO MẬT',
        };
      case 'labor-policy':
        return {
          title: 'Nội quy & Chính sách lao động',
          groupName: 'QUẢN TRỊ HỆ THỐNG',
          icon: 'bi-book',
          color: 'violet',
          desc: 'Quy chế công ty Seajong, thỏa ước lao động tập thể và quy chuẩn kỷ luật',
          badge: 'NỘI QUY',
        };
      case 'plan':
        return {
          title: 'Lập kế hoạch chiến lược năm 2026',
          groupName: 'LẬP KẾ HOẠCH',
          icon: 'bi-calendar-check',
          color: 'blue',
          desc: 'Kế hoạch sản lượng phân xưởng đúc sen vòi và chỉ tiêu doanh thu hệ thống đại lý',
          badge: 'CHIẾN LƯỢC',
        };
      case 'tasks':
        return {
          title: 'Quản trị công việc toàn công ty',
          groupName: 'QUẢN TRỊ CÔNG VIỆC',
          icon: 'bi-kanban',
          color: 'emerald',
          desc: 'Theo dõi tiến độ phối hợp giữa các khối Ban Giám đốc, Kinh doanh, Sản xuất và Kế toán',
          badge: 'TIẾN ĐỘ',
        };
      case 'approvals':
      case 'requests_approvals':
      case 'hr_requests_approvals':
      case 'recruitment_req':
        return {
          title: 'Yêu cầu và duyệt yêu cầu',
          groupName: 'ĐỀ XUẤT & PHÊ DUYỆT',
          icon: 'bi-clipboard2-check',
          color: 'rose',
          desc: 'Quản trị luồng đề xuất, tờ trình phê duyệt ngân sách và kiến nghị nghiệp vụ phòng ban',
          badge: 'PHÊ DUYỆT',
        };

      // ── Nhân sự ──
      case 'recruitment':
        return {
          title: 'Quản trị tuyển dụng nhân sự',
          groupName: 'TUYỂN DỤNG',
          icon: 'bi-person-plus',
          color: 'rose',
          desc: 'Kế hoạch bổ sung nhân lực, tiếp nhận hồ sơ ứng viên và theo dõi phỏng vấn',
          badge: 'TUYỂN DỤNG',
        };
      case 'interviews':
        return {
          title: 'Phỏng vấn & Đánh giá ứng viên',
          groupName: 'TUYỂN DỤNG',
          icon: 'bi-chat-quote',
          color: 'rose',
          desc: 'Lịch phỏng vấn chuyên môn kỹ sư đúc đồng, nhân viên kinh doanh đại lý',
          badge: 'PHỎNG VẤN',
        };
      case 'training':
        return {
          title: 'Kế hoạch đào tạo nội bộ',
          groupName: 'ĐÀO TẠO & THỬ VIỆC',
          icon: 'bi-mortarboard',
          color: 'rose',
          desc: 'Chương trình đào tạo an toàn lao động, công nghệ mạ PVD và tiêu chuẩn sen vòi Hàn Quốc',
          badge: 'ĐÀO TẠO',
        };
      case 'probation':
        return {
          title: 'Theo dõi nhân viên thử việc',
          groupName: 'ĐÀO TẠO & THỬ VIỆC',
          icon: 'bi-hourglass-split',
          color: 'rose',
          desc: 'Đánh giá năng lực sau 60 ngày thử việc và đề xuất ký kết Hợp đồng lao động chính thức',
          badge: 'THỬ VIỆC',
        };
      case 'employees':
        return {
          title: 'Quản lý hồ sơ nhân viên',
          groupName: 'NHÂN SỰ',
          icon: 'bi-people',
          color: 'rose',
          desc: 'Cơ sở dữ liệu trích ngang toàn bộ 18 cán bộ công nhân viên Công ty Seajong',
          badge: 'HỒ SƠ NV',
        };
      case 'promotions':
        return {
          title: 'Điều chuyển & Đề bạt chức vụ',
          groupName: 'NHÂN SỰ',
          icon: 'bi-graph-up-arrow',
          color: 'rose',
          desc: 'Lịch sử bổ nhiệm cán bộ quản lý, điều chuyển công tác liên bộ phận',
          badge: 'ĐỀ BẠT',
        };
      case 'terminations':
        return {
          title: 'Sa thải & Thủ tục thôi việc',
          groupName: 'NHÂN SỰ',
          icon: 'bi-person-x',
          color: 'rose',
          desc: 'Hồ sơ thanh lý hợp đồng lao động, bàn giao trang thiết bị và quyết toán bảo hiểm',
          badge: 'THÔI VIỆC',
        };
      case 'attendance-payroll':
        return {
          title: 'Chấm công & Tính lương tổng hợp',
          groupName: 'PHÚC LỢI',
          icon: 'bi-cash-coin',
          color: 'rose',
          desc: 'Bảng tổng hợp công nhật, công tăng ca, phụ cấp chuyên cần và tính lương net',
          badge: 'BẢNG LƯƠNG',
        };
      case 'insurance':
        return {
          title: 'Bảo hiểm xã hội & Y tế',
          groupName: 'PHÚC LỢI',
          icon: 'bi-shield-check',
          color: 'rose',
          desc: 'Hồ sơ trích đóng BHXH, BHYT, BHTN và giải quyết chế độ ốm đau, thai sản',
          badge: 'BẢO HIỂM',
        };
      case 'salary-adjustments':
        return {
          title: 'Điều chỉnh thu nhập & Thưởng KPI',
          groupName: 'PHÚC LỢI',
          icon: 'bi-sliders',
          color: 'rose',
          desc: 'Xét tăng lương niên hạn định kỳ và mức thưởng hoàn thành mục tiêu kinh doanh',
          badge: 'THU NHẬP',
        };
      case 'stationery':
        return {
          title: 'Văn phòng phẩm & Dụng cụ làm việc',
          groupName: 'HÀNH CHÍNH NHÂN SỰ',
          icon: 'bi-archive',
          color: 'rose',
          desc: 'Cấp phát sổ tay, đồng phục công ty, bảo hộ lao động và thiết bị văn phòng',
          badge: 'DỤNG CỤ',
        };

      // ── Tài chính – Kế toán ──
      case 'assets':
        return {
          title: 'Quản lý tài sản cố định',
          groupName: 'QUẢN LÝ TÀI CHÍNH',
          icon: 'bi-building',
          color: 'emerald',
          desc: 'Dây chuyền đúc đồng tự động, lò nấu kim loại, máy mạ PVD và xe nâng hàng',
          badge: 'TÀI SẢN',
        };
      case 'debts':
        return {
          title: 'Quản lý công nợ & Chi phí',
          groupName: 'QUẢN LÝ TÀI CHÍNH',
          icon: 'bi-receipt',
          color: 'emerald',
          desc: 'Theo dõi hạn mức công nợ đại lý phân phối và thanh toán nhà cung cấp phôi đồng',
          badge: 'CÔNG NỢ',
        };
      case 'inventory':
      case 'inventory_top':
        return {
          title: 'Hàng hoá trong kho thành phẩm',
          groupName: 'THEO DÕI KHO HÀNG',
          icon: 'bi-boxes',
          color: 'emerald',
          desc: 'Tồn kho sen cây nóng lạnh SJ-8800, củ sen mạ crom, vòi chậu lavabo Seajong',
          badge: 'TỒN KHO',
        };
      case 'audit-logs':
        return {
          title: 'Nhật ký hoạt động kho',
          groupName: 'THEO DÕI KHO HÀNG',
          icon: 'bi-journal-text',
          color: 'emerald',
          desc: 'Biên bản đối soát nhập xuất, kiểm kê định kỳ và đối chiếu số dư sổ sách',
          badge: 'NHẬT KÝ',
        };
      case 'inventory-reports':
        return {
          title: 'Báo cáo kho',
          groupName: 'THEO DÕI KHO HÀNG',
          icon: 'bi-bar-chart-line',
          color: 'blue',
          desc: 'Báo cáo tổng hợp xuất nhập tồn, biến động chi tiết thẻ kho và nhật ký đối soát kiểm kê kho',
          badge: 'BÁO CÁO KHO',
        };
      case 'journal-entries':
        return {
          title: 'Sổ nhật ký chung',
          groupName: 'KẾ TOÁN NỘI BỘ',
          icon: 'bi-journal-text',
          color: 'emerald',
          desc: 'Toàn bộ bút toán phát sinh trong kỳ hạch toán tài chính kế toán',
          badge: 'NHẬT KÝ CHUNG',
        };
      case 'advances':
        return {
          title: 'Tạm ứng & Chi phí công tác',
          groupName: 'KẾ TOÁN NỘI BỘ',
          icon: 'bi-cash',
          color: 'emerald',
          desc: 'Thanh toán tạm ứng xăng xe, tiếp khách đại lý và chi phí thị trường',
          badge: 'TẠM ỨNG',
        };

      // ── Kinh doanh & Bán lẻ ──
      case 'partners':
        return {
          title: 'Phát triển mạng lưới đại lý',
          groupName: 'KHÁCH HÀNG & ĐẠI LÝ',
          icon: 'bi-person-badge',
          color: 'blue',
          desc: 'Mở rộng hệ thống đại lý độc quyền thiết bị vệ sinh Seajong tại 63 tỉnh thành',
          badge: 'ĐẠI LÝ',
        };
      case 'customers':
        return {
          title: 'Danh sách đại lý & Khách hàng dự án',
          groupName: 'KHÁCH HÀNG & ĐẠI LÝ',
          icon: 'bi-people',
          color: 'blue',
          desc: 'Hồ sơ năng lực, hợp đồng phân phối và doanh số tích luỹ của từng đại lý',
          badge: 'KHÁCH HÀNG',
        };
      case 'pricing':
        return {
          title: 'Chính sách bán hàng & Chiết khấu',
          groupName: 'KHÁCH HÀNG & ĐẠI LÝ',
          icon: 'bi-tags',
          color: 'blue',
          desc: 'Bảng giá niêm yết, chính sách thưởng theo tháng, quý và hỗ trợ trưng bày',
          badge: 'GIÁ & CHIẾT KHẤU',
        };
      case 'sales_plan':
        return {
          title: 'Lập kế hoạch bán hàng (Sales Plan)',
          groupName: 'LẬP KẾ HOẠCH',
          icon: 'bi-calendar-check',
          color: 'blue',
          desc: 'Chỉ tiêu doanh số vùng miền Bắc, miền Trung, miền Nam quý 4/2026',
          badge: 'KẾ HOẠCH SALE',
        };
      case 'business-results':
        return {
          title: 'Kết quả kinh doanh theo thời gian thực',
          groupName: 'BÁO CÁO & PHÂN TÍCH',
          icon: 'bi-graph-up-arrow',
          color: 'blue',
          desc: 'Tổng hợp doanh thu đơn hàng xuất kho, tỷ lệ hoàn thành KPI tháng',
          badge: 'KẾT QUẢ KD',
        };
      case 'retail':
      case 'banhang':
        return {
          title: 'Màn hình bán lẻ Showroom (POS)',
          groupName: 'BÁN LẺ SHOWROOM',
          icon: 'bi-shop',
          color: 'amber',
          desc: 'Giao diện tạo đơn bán lẻ, quét mã vạch sản phẩm sen vòi và in hoá đơn tại quầy',
          badge: 'BÁN LẺ POS',
        };

      // ── Kho vận & Sản xuất ──
      case 'system':
        return {
          title: 'Hệ thống kho bãi Seajong',
          groupName: 'QUẢN LÝ HỆ THỐNG KHO',
          icon: 'bi-building',
          color: 'cyan',
          desc: 'Sơ đồ định vị vị trí dãy kệ kho linh kiện, kho phôi đồng và kho sen vòi thành phẩm',
          badge: 'KHO BÃI',
        };
      case 'inbound':
        return {
          title: 'Nhập, xuất & Kiểm định kho',
          groupName: 'VẬN HÀNH KHO',
          icon: 'bi-arrow-down-left-square',
          color: 'cyan',
          desc: 'Quy trình tiếp nhận phôi đồng nhập khẩu Hàn Quốc và xuất hàng cho nhà xe vận chuyển',
          badge: 'NHẬP XUẤT',
        };
      case 'material-picking':
        return {
          title: 'Cấp phát vật tư',
          groupName: 'VẬN HÀNH KHO',
          icon: 'bi-tools',
          color: 'cyan',
          desc: 'Lệnh cấp phát ti đồng, đệm cao su EPDM, lõi van ceramic cho phân xưởng lắp ráp',
          badge: 'CẤP PHÁT',
        };
      case 'batch-packing':
        return {
          title: 'Gom hàng và dán nhãn',
          groupName: 'VẬN HÀNH KHO',
          icon: 'bi-box-seam-fill',
          color: 'cyan',
          desc: 'Đóng thùng carton thương hiệu Seajong, dán tem QR chống hàng giả và đóng pallet',
          badge: 'ĐÓNG GÓI',
        };
      case 'bom':
        return {
          title: 'Xây dựng định mức sản phẩm (BOM)',
          groupName: 'KỸ THUẬT SẢN XUẤT',
          icon: 'bi-list-check',
          color: 'amber',
          desc: 'Định mức nguyên vật liệu đồng 61%, niken, crom, lõi chia nước cho bộ sen cây SJ-8800',
          badge: 'ĐỊNH MỨC BOM',
        };
      case 'defects':
      case 'defects-summary':
        return {
          title: 'Kiểm soát & Xử lý hàng lỗi (QA/QC)',
          groupName: 'CHẤT LƯỢNG',
          icon: 'bi-exclamation-octagon',
          color: 'rose',
          desc: 'Phân tích lỗi rỗ bề mặt đúc, lỗi xước mạ crom và đề xuất phương án khắc phục',
          badge: 'HÀNG LỖI',
        };
      case 'standards':
        return {
          title: 'Tiêu chuẩn chất lượng sen vòi ISO',
          groupName: 'ĐẢM BẢO CHẤT LƯỢNG',
          icon: 'bi-award',
          color: 'emerald',
          desc: 'Tiêu chuẩn thử áp lực nước 16 bar, thử độ bền đóng mở 500.000 lần của lõi van',
          badge: 'TIÊU CHUẨN',
        };

      // ── Bảo vệ & An ninh ──
      case 'shifts':
        return {
          title: 'Lịch trực & Ca gác an ninh 24/7',
          groupName: 'BẢO VỆ – AN NINH',
          icon: 'bi-clock',
          color: 'indigo',
          desc: 'Phân ca trực cổng chính, tuần tra phân xưởng đúc và bãi xe nhà máy',
          badge: 'CA TRỰC',
        };
      case 'incidents':
        return {
          title: 'Sổ ghi nhận sự cố an ninh',
          groupName: 'BẢO VỆ – AN NINH',
          icon: 'bi-shield-exclamation',
          color: 'rose',
          desc: 'Nhật ký các sự cố phát sinh, xử lý vi phạm nội quy và phương án ứng phó',
          badge: 'SỰ CỐ',
        };
      case 'access':
        return {
          title: 'Kiểm soát ra vào cổng nhà máy',
          groupName: 'KIỂM SOÁT AN NINH',
          icon: 'bi-door-open',
          color: 'indigo',
          desc: 'Quản lý lượt xe tải giao nhận hàng, công nhân viên và khách liên hệ công tác',
          badge: 'RA VÀO',
        };
      case 'cameras':
        return {
          title: 'Hệ thống Camera giám sát an ninh',
          groupName: 'KIỂM SOÁT AN NINH',
          icon: 'bi-camera-video',
          color: 'indigo',
          desc: 'Giám sát 32 camera phân xưởng đúc, kho thành phẩm và khu vực đóng hàng',
          badge: 'CAMERA',
        };
      case 'visitors':
        return {
          title: 'Sổ theo dõi khách & Phương tiện',
          groupName: 'KIỂM SOÁT AN NINH',
          icon: 'bi-person-badge',
          color: 'indigo',
          desc: 'Đăng ký thông tin khách ra vào, cấp phát thẻ đeo và kiểm tra xe chở hàng',
          badge: 'KHÁCH & XE',
        };

      // ── IT, Pháp chế, Hành chính, v.v. ──
      case 'systems':
        return {
          title: 'Quản trị hệ thống máy chủ & ERP',
          groupName: 'CÔNG NGHỆ THÔNG TIN',
          icon: 'bi-hdd-stack',
          color: 'cyan',
          desc: 'Giám sát server cơ sở dữ liệu SQLite, backend Node.js và mạng VPN nội bộ',
          badge: 'HỆ THỐNG',
        };
      case 'tickets':
        return {
          title: 'Yêu cầu hỗ trợ kỹ thuật (Helpdesk)',
          groupName: 'CÔNG NGHỆ THÔNG TIN',
          icon: 'bi-headset',
          color: 'cyan',
          desc: 'Tiếp nhận xử lý sự cố máy in hoá đơn, máy tính văn phòng và phần mềm',
          badge: 'HỖ TRỢ IT',
        };
      case 'contracts':
        return {
          title: 'Hợp đồng kinh tế & Pháp lý',
          groupName: 'PHÁP CHẾ',
          icon: 'bi-file-earmark-text',
          color: 'indigo',
          desc: 'Thẩm định hợp đồng đại lý, thỏa thuận bảo mật và hợp đồng cung ứng vật tư',
          badge: 'HỢP ĐỒNG',
        };
      case 'documents_admin':
      case 'admin_docs':
        return {
          title: 'Quản lý công văn & Văn bản đến/đi',
          groupName: 'HÀNH CHÍNH VĂN PHÒNG',
          icon: 'bi-file-earmark-ruled',
          color: 'blue',
          desc: 'Số vào sổ công văn đi/đến, lưu trữ tờ trình và chỉ thị của Ban Tổng Giám đốc',
          badge: 'VĂN BẢN',
        };
      case 'stamps':
        return {
          title: 'Quản lý con dấu & Đóng dấu văn bản',
          groupName: 'HÀNH CHÍNH VĂN PHÒNG',
          icon: 'bi-stamp',
          color: 'rose',
          desc: 'Sổ theo dõi sử dụng con dấu công ty, đóng dấu hợp đồng và giấy giới thiệu',
          badge: 'CON DẤU',
        };
      case 'suppliers':
        return {
          title: 'Danh bạ nhà cung cấp & Vận chuyển',
          groupName: 'MUA HÀNG & CUNG ỨNG',
          icon: 'bi-truck',
          color: 'amber',
          desc: 'Hồ sơ đánh giá NCC phôi đồng hợp kim, hóa chất mạ PVD và đối tác vận tải hàng',
          badge: 'NHÀ CUNG CẤP',
        };
      case 'crm':
      case 'fac_crm':
        return {
          title: 'Chăm sóc khách hàng & Bảo hành sen vòi',
          groupName: 'CHĂM SÓC KHÁCH HÀNG',
          icon: 'bi-headset',
          color: 'indigo',
          desc: 'Tiếp nhận kích hoạt bảo hành điện tử 5 năm sen vòi Seajong, hỗ trợ kỹ thuật',
          badge: 'BẢO HÀNH',
        };
      case 'complaints':
        return {
          title: 'Xử lý khiếu nại & Hậu mãi',
          groupName: 'CHĂM SÓC KHÁCH HÀNG',
          icon: 'bi-chat-dots',
          color: 'rose',
          desc: 'Tiếp nhận phản hồi đại lý, cử kỹ thuật viên kiểm tra rò rỉ nước tại công trình',
          badge: 'KHIẾU NẠI',
        };

      default:
        return {
          title: `Chức năng ${key.toUpperCase()}`,
          groupName: 'NGHIỆP VỤ PHÒNG BAN',
          icon: 'bi-grid-fill',
          color: 'blue',
          desc: `Màn hình nghiệp vụ chuyên môn dành riêng cho phân hệ ${deptCode.toUpperCase()}`,
          badge: deptCode.toUpperCase(),
        };
    }
  };

  const meta = getFeatureMeta(menuKey);

  const loadRealData = useCallback(async () => {
    setLoading(true);
    try {
      if (menuKey === 'categories') {
        const res = await fetch('/api/board/categories');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setDbRows(
              data.map((c: any, idx: number) => ({
                id: String(c.id || idx),
                code: c.code || `DM-${idx + 1}`,
                title: c.name || c.title || 'Danh mục hệ thống',
                dept: c.type || 'Hệ thống',
                deadline: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('vi-VN') : 'Hệ thống',
                priority: 'Cốt lõi',
                status: c.status === 'hidden' ? 'Tạm ẩn' : 'Hoạt động',
              }))
            );
            return;
          }
        }
      }

      if (menuKey === 'users') {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setDbRows(
              data.map((u: any, idx: number) => ({
                id: String(u.id || idx),
                code: u.code || `TK-${String(idx + 1).padStart(2, '0')}`,
                title: `${u.name || 'Nhân sự'} (${u.email || ''}) - ${u.position || u.role || 'Nhân viên'}`,
                dept: u.department || 'Seajong',
                deadline: 'Toàn hệ thống',
                priority: u.role || 'Staff',
                status: u.status === 'inactive' ? 'Tạm khóa' : 'Hoạt động',
              }))
            );
            return;
          }
        }
      }

      // Mặc định: Tải dữ liệu thực tế từ bảng Công việc (/api/tasks) và Tờ trình phê duyệt (/api/approval-requests)
      const [tasksRes, reqRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/approval-requests'),
      ]);
      const tasksData = tasksRes.ok ? await tasksRes.json() : [];
      const reqData = reqRes.ok ? await reqRes.json() : [];

      const taskList = Array.isArray(tasksData)
        ? tasksData
        : Array.isArray(tasksData?.tasks)
        ? tasksData.tasks
        : [];
      const reqList = Array.isArray(reqData)
        ? reqData
        : Array.isArray(reqData?.requests)
        ? reqData.requests
        : [];

      const combined: FeatureRowItem[] = [
        ...taskList.map((t: any, idx: number) => ({
          id: String(t.id || `task-${idx}`),
          code: t.code || `CV-${String(idx + 1).padStart(3, '0')}`,
          title: t.title || t.name || 'Nhiệm vụ công việc',
          dept: t.departmentName || t.department || `Khối ${deptCode.toUpperCase()}`,
          deadline: t.dueDate || t.deadline ? new Date(t.dueDate || t.deadline).toLocaleDateString('vi-VN') : 'Tháng 10/2026',
          priority: t.priority === 'urgent' || t.priority === 'high' ? 'Cao' : 'Bình thường',
          status:
            t.status === 'done' || t.status === 'completed'
              ? 'Hoàn thành'
              : t.status === 'in_progress'
              ? 'Đang xử lý'
              : 'Chờ xử lý',
        })),
        ...reqList.map((r: any, idx: number) => ({
          id: String(r.id || `req-${idx}`),
          code: r.code || `TT-${String(idx + 1).padStart(3, '0')}`,
          title: r.title || 'Hồ sơ đề xuất nghiệp vụ',
          dept: r.department || `Khối ${deptCode.toUpperCase()}`,
          deadline: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : 'Tháng 10/2026',
          priority: r.priority === 'urgent' ? 'Gấp' : 'Tiêu chuẩn',
          status:
            r.status === 'approved'
              ? 'Hoàn thành'
              : r.status === 'rejected'
              ? 'Từ chối'
              : 'Đang xử lý',
        })),
      ];

      setDbRows(combined);
    } catch (err) {
      console.error('Lỗi tải dữ liệu nghiệp vụ từ DB:', err);
    } finally {
      setLoading(false);
    }
  }, [menuKey, deptCode]);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  const filteredRows = useMemo(() => {
    return dbRows.filter((r) => {
      const matchSearch =
        !searchTerm.trim() ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.dept.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (filterTab === 'pending') {
        return !r.status.includes('Hoàn thành') && !r.status.includes('Hoạt động');
      }
      if (filterTab === 'completed') {
        return r.status.includes('Hoàn thành') || r.status.includes('Hoạt động');
      }
      return true;
    });
  }, [dbRows, searchTerm, filterTab]);

  const handleSaveNewItem = async () => {
    if (!newTitle.trim()) return;
    const created: FeatureRowItem = {
      id: `item-${Date.now()}`,
      code: `${deptCode.toUpperCase()}-${String(dbRows.length + 1).padStart(3, '0')}`,
      title: newTitle.trim(),
      dept: `Khối ${deptCode.toUpperCase()}`,
      deadline: new Date().toLocaleDateString('vi-VN'),
      priority: newPriority,
      status: 'Đang xử lý',
    };
    setDbRows((prev) => [created, ...prev]);
    setNewTitle('');
    setNewNotes('');
    setShowAddModal(false);
  };

  return (
    <StandardPage
      title={meta.title}
      badge={meta.badge}
      description={meta.desc}
      icon={meta.icon}
      color={meta.color}
      tickerContext={menuKey}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        <TableToolbar
          searchValue={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setPage(1);
          }}
          searchPlaceholder="Tìm kiếm mã, tên hồ sơ, bộ phận..."
          filters={[
            {
              id: 'feature-status-filter',
              value: filterTab,
              onChange: (val) => {
                setFilterTab(val as any);
                setPage(1);
              },
              minWidth: '170px',
              options: [
                { label: `Tất cả (${dbRows.length})`, value: 'all' },
                { label: 'Đang xử lý', value: 'pending' },
                { label: 'Hoàn thành', value: 'completed' },
              ],
            },
          ]}
          onRefresh={loadRealData}
          rightActions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              leftIcon={<i className="bi bi-plus-lg" />}
            >
              Thêm mới
            </Button>
          }
        />

        <FullWidthTable>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold bg-slate-50/60">
                <th className="py-3 px-4 w-28">Mã số</th>
                <th className="py-3 px-4">Tên công việc / Hồ sơ nghiệp vụ</th>
                <th className="py-3 px-4 w-44">Bộ phận</th>
                <th className="py-3 px-4 w-32">Thời hạn / Ngày</th>
                <th className="py-3 px-4 w-28">Mức độ</th>
                <th className="py-3 px-4 w-32 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không có bản ghi nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredRows
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map((row) => (
                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200/80">
                          {row.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <i className="bi bi-file-earmark-text text-slate-400 text-sm" />
                          <span>{row.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{row.dept}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{row.deadline}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.priority.includes('Gấp') || row.priority.includes('Cốt lõi')
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : row.priority.includes('Cao') || row.priority.includes('Bắt buộc')
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            row.status.includes('Hoàn thành') || row.status.includes('Hoạt động')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.status.includes('Đang')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </FullWidthTable>

        <Pagination
          currentPage={page}
          totalItems={filteredRows.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
          itemName="bản ghi"
        />
      </div>

      <Offcanvas
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Thêm mới: ${meta.title}`}
        width="400px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveNewItem}>
              Lưu dữ liệu
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Tiêu đề hồ sơ / Nội dung"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nhập tên công việc hoặc hồ sơ..."
          />
          <Select
            label="Mức độ ưu tiên"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            options={[
              { label: 'Bình thường', value: 'Bình thường' },
              { label: 'Cao', value: 'Cao' },
              { label: 'Gấp', value: 'Gấp' },
            ]}
          />
          <Input
            label="Mô tả tóm tắt"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Nhập mô tả chi tiết..."
          />
        </div>
      </Offcanvas>
    </StandardPage>
  );
};
