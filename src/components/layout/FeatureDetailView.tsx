import React, { useState } from 'react';
import { useDepartment } from '../../context/DepartmentContext';
import { PageHeader } from './PageHeader';
import { DynamicTicker } from './DynamicTicker';
import { Pagination } from '../common/Pagination';
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

export const FeatureDetailView: React.FC<FeatureDetailViewProps> = ({ menuKey, deptCode }) => {
  if (menuKey === 'employees') {
    return <EmployeesPage />;
  }

  if (menuKey === 'approvals' || menuKey === 'requests_approvals' || menuKey === 'hr_requests_approvals') {
    return <DocumentApprovalPage />;
  }

  const { setActiveMenuKey } = useDepartment();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

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
          title: 'Chấm công & Điểm danh',
          groupName: 'CÔNG VIỆC CÁ NHÂN',
          icon: 'bi-clock-history',
          color: 'blue',
          desc: 'Dữ liệu chấm công máy quét vân tay & GPS phân xưởng Seajong tháng 10/2026',
          badge: 'CÔNG CA',
        };
      case 'my_requests':
        return {
          title: 'Yêu cầu & Đề xuất cá nhân',
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

  // Mẫu dữ liệu bảng hiển thị chân thực theo nghiệp vụ
  const getTableRows = () => {
    if (menuKey === 'my_tasks' || menuKey === 'tasks') {
      return [
        { code: 'CV-101', title: 'Kiểm tra độ dày lớp mạ crom lô sen cây SJ-8800', dept: 'Phòng QA/QC', deadline: '19/10/2026', priority: 'Gấp', status: 'Đang làm' },
        { code: 'CV-102', title: 'Gửi bảng chiết khấu đại lý mới khu vực Đông Triều', dept: 'Kinh doanh', deadline: '20/10/2026', priority: 'Cao', status: 'Chờ duyệt' },
        { code: 'CV-103', title: 'Đối soát công nợ tháng 9 với đại lý Hùng Cường', dept: 'Kế toán', deadline: '21/10/2026', priority: 'Bình thường', status: 'Hoàn thành' },
        { code: 'CV-104', title: 'Lập lịch giao 150 bộ vòi lavabo cho công trình Chung cư Eco', dept: 'Kho vận', deadline: '22/10/2026', priority: 'Bình thường', status: 'Đang làm' },
        { code: 'CV-105', title: 'Đánh giá định kỳ 60 ngày thử việc nhân viên mới', dept: 'Nhân sự', deadline: '24/10/2026', priority: 'Trung bình', status: 'Chưa làm' },
        { code: 'CV-106', title: 'Bảo dưỡng hệ thống lọc khí xưởng đúc đồng số 1', dept: 'Kỹ thuật', deadline: '25/10/2026', priority: 'Cao', status: 'Chưa làm' },
      ];
    }

    if (menuKey === 'categories') {
      return [
        { code: 'DM-SP', title: 'Danh mục nhóm sản phẩm (Sen cây, Vòi chậu, Phụ kiện)', dept: 'Sản phẩm', deadline: 'Hệ thống', priority: 'Cốt lõi', status: 'Hoạt động' },
        { code: 'DM-VT', title: 'Danh mục vật tư tiêu hao xưởng đúc và máy mạ', dept: 'Sản xuất', deadline: 'Hệ thống', priority: 'Cốt lõi', status: 'Hoạt động' },
        { code: 'DM-KH', title: 'Phân loại cấp bậc đại lý (Đại lý Vàng, Bạc, Đồng)', dept: 'Kinh doanh', deadline: 'Hệ thống', priority: 'Cốt lõi', status: 'Hoạt động' },
        { code: 'DM-NCC', title: 'Danh mục nhóm nhà cung cấp vật liệu và bao bì', dept: 'Mua hàng', deadline: 'Hệ thống', priority: 'Tiêu chuẩn', status: 'Hoạt động' },
        { code: 'DM-TT', title: 'Trạng thái vòng đời hồ sơ kỹ thuật & tài liệu', dept: 'Hành chính', deadline: 'Hệ thống', priority: 'Tiêu chuẩn', status: 'Hoạt động' },
      ];
    }

    if (menuKey === 'users') {
      return [
        { code: 'TK-01', title: 'Lê Công Vụ (lecongvu@seajong.vn) - Tổng Giám đốc', dept: 'Ban Giám đốc', deadline: 'Toàn quyền', priority: 'SuperAdmin', status: 'Hoạt động' },
        { code: 'TK-02', title: 'Đoàn Thị Yến (doanthiyen@seajong.vn) - Phó TGĐ Sản xuất', dept: 'Ban Giám đốc', deadline: 'Quản trị', priority: 'Admin', status: 'Hoạt động' },
        { code: 'TK-03', title: 'Trần Thị Linh (tranthilinh@seajong.vn) - Kế toán trưởng', dept: 'Tài chính', deadline: 'Chuyên môn', priority: 'Manager', status: 'Hoạt động' },
        { code: 'TK-04', title: 'Bùi Thế Hiệp (buithehiep@seajong.vn) - Trưởng phòng Kinh doanh', dept: 'Kinh doanh', deadline: 'Chuyên môn', priority: 'Manager', status: 'Hoạt động' },
        { code: 'TK-05', title: 'Lê Hồng Thu (lehongthu@seajong.vn) - Trưởng phòng Nhân sự', dept: 'Nhân sự', deadline: 'Chuyên môn', priority: 'Manager', status: 'Hoạt động' },
      ];
    }

    if (menuKey === 'labor-policy') {
      return [
        { code: 'NQ-01', title: 'Chương 1: Quy định thời giờ làm việc, nghỉ ngơi & chấm công', dept: 'Toàn công ty', deadline: 'Ban hành 2026', priority: 'Bắt buộc', status: 'Hiệu lực' },
        { code: 'NQ-02', title: 'Chương 2: Tiêu chuẩn an toàn lao động & BHLĐ xưởng đúc', dept: 'Khối Sản xuất', deadline: 'Ban hành 2026', priority: 'Bắt buộc', status: 'Hiệu lực' },
        { code: 'NQ-03', title: 'Chương 3: Bảo mật công nghệ đúc & bí mật kinh doanh Seajong', dept: 'Toàn công ty', deadline: 'Ban hành 2026', priority: 'Bắt buộc', status: 'Hiệu lực' },
        { code: 'NQ-04', title: 'Chương 4: Quy chế khen thưởng thành tích & chế tài xử lý kỷ luật', dept: 'Nhân sự', deadline: 'Ban hành 2026', priority: 'Bắt buộc', status: 'Hiệu lực' },
      ];
    }

    if (menuKey === 'approvals' || menuKey === 'requests_approvals' || menuKey === 'hr_requests_approvals' || menuKey === 'recruitment_req') {
      return [
        { code: 'YC-2026-01', title: 'Tờ trình phê duyệt ngân sách chiến dịch Meta & TikTok tháng 11', dept: 'Phòng Marketing', deadline: '22/10/2026', priority: 'Gấp', status: 'Chờ duyệt' },
        { code: 'YC-2026-02', title: 'Đề xuất tạm ứng chi phí in ấn Catalogue Sen vòi Seajong 2026', dept: 'Phòng Marketing', deadline: '23/10/2026', priority: 'Cao', status: 'Chờ duyệt' },
        { code: 'YC-2026-03', title: 'Phiếu yêu cầu cấp bổ sung 01 nhân sự Content Creator & Quay dựng Video', dept: 'Phòng Marketing', deadline: '25/10/2026', priority: 'Bình thường', status: 'Đang xử lý' },
        { code: 'YC-2026-04', title: 'Phê duyệt hợp đồng tài trợ và bảng hiệu trưng bày tại Showroom An Gia Phát', dept: 'Phòng Marketing', deadline: '20/10/2026', priority: 'Cao', status: 'Hoàn thành' },
        { code: 'YC-2026-05', title: 'Tờ trình cấp hạn mức công nợ 500 triệu cho Đại lý Thành Đạt', dept: 'Phòng Kinh doanh', deadline: '19/10/2026', priority: 'Gấp', status: 'Chờ duyệt' },
      ];
    }

    if (menuKey === 'my_attendance') {
      return [
        { code: 'CC-19/10', title: 'Chấm công ngày 19/10/2026: Vào 07:54 - Ra 17:05 (8.0 giờ)', dept: 'Vân tay Cổng A', deadline: '19/10/2026', priority: 'Đúng giờ', status: 'Hợp lệ' },
        { code: 'CC-18/10', title: 'Chấm công ngày 18/10/2026: Vào 07:58 - Ra 17:02 (8.0 giờ)', dept: 'Vân tay Cổng A', deadline: '18/10/2026', priority: 'Đúng giờ', status: 'Hợp lệ' },
        { code: 'CC-17/10', title: 'Chấm công ngày 17/10/2026: Vào 07:50 - Ra 18:30 (9.5 giờ - Tăng ca 1.5h)', dept: 'Vân tay Cổng A', deadline: '17/10/2026', priority: 'Tăng ca', status: 'Đã xác nhận' },
        { code: 'CC-16/10', title: 'Chấm công ngày 16/10/2026: Vào 07:56 - Ra 17:00 (8.0 giờ)', dept: 'Vân tay Cổng A', deadline: '16/10/2026', priority: 'Đúng giờ', status: 'Hợp lệ' },
      ];
    }

    if (menuKey === 'my_requests') {
      return [
        { code: 'YC-2026-11', title: 'Đơn xin nghỉ phép năm ngày 28/10/2026 (Lý do gia đình)', dept: 'Phòng Nhân sự', deadline: '19/10/2026', priority: 'Cá nhân', status: 'Đã duyệt' },
        { code: 'YC-2026-09', title: 'Đề xuất cấp mới bộ quần áo bảo hộ lao động size L', dept: 'Hành chính', deadline: '15/10/2026', priority: 'Dụng cụ', status: 'Đã cấp' },
        { code: 'YC-2026-08', title: 'Giấy đi công tác kiểm tra đại lý Nam Định 2 ngày', dept: 'Kinh doanh', deadline: '10/10/2026', priority: 'Công tác', status: 'Đã thanh toán' },
      ];
    }

    if (menuKey === 'documents' || menuKey === 'doc_library') {
      return [
        { code: 'TL-ISO', title: 'Tiêu chuẩn chất lượng xuất xưởng sen vòi ISO 9001:2015', dept: 'Phòng QA/QC', deadline: 'Phiên bản 3.2', priority: 'Tài liệu nội bộ', status: 'Lưu hành' },
        { code: 'TL-CAT', title: 'Catalogue sản phẩm sen vòi Seajong cao cấp năm 2026', dept: 'Marketing', deadline: 'PDF 48 trang', priority: 'Công khai', status: 'Lưu hành' },
        { code: 'TL-SOP', title: 'Quy trình vận hành máy đúc áp lực cao và an toàn lò nấu', dept: 'Sản xuất', deadline: 'SOP-SX-01', priority: 'Nghiêm ngặt', status: 'Lưu hành' },
        { code: 'TL-PL', title: 'Giấy chứng nhận đăng ký nhãn hiệu độc quyền Seajong Korea', dept: 'Pháp chế', deadline: 'Bản gốc', priority: 'Pháp lý', status: 'Bảo mật' },
      ];
    }

    // Default template row
    return [
      { code: `${deptCode.toUpperCase()}-01`, title: `Hồ sơ triển khai nghiệp vụ số 01 - ${meta.title}`, dept: `Khối ${deptCode.toUpperCase()}`, deadline: '19/10/2026', priority: 'Ưu tiên', status: 'Đang xử lý' },
      { code: `${deptCode.toUpperCase()}-02`, title: `Kế hoạch kiểm tra đối soát quy trình - ${meta.title}`, dept: `Khối ${deptCode.toUpperCase()}`, deadline: '20/10/2026', priority: 'Định kỳ', status: 'Đã lập' },
      { code: `${deptCode.toUpperCase()}-03`, title: `Báo cáo tổng hợp số liệu thực thi - ${meta.title}`, dept: `Khối ${deptCode.toUpperCase()}`, deadline: '22/10/2026', priority: 'Quan trọng', status: 'Hoàn thành' },
    ];
  };

  const rows = getTableRows();
  const filteredRows = rows.filter((r) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full bg-slate-50/60 animate-fade-in text-slate-800">
      {/* ── PageHeader với nút "Quay về" mượt mà ── */}
      <PageHeader
        title={meta.title}
        description={meta.desc}
        icon={meta.icon}
        color={meta.color}
      />

      {/* ── Dynamic Ticker ── */}
      <DynamicTicker context={menuKey} pageTitle={meta.title} />

      {/* ── Toast thông báo tương tác ── */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-bounce">
          <i className="bi bi-check-circle-fill text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className="p-4 sm:p-5 lg:p-6 space-y-5">
        
        {/* Top Control Bar: Search + Filter Tabs + Action Buttons */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Tìm kiếm mã, tên hồ sơ, người phụ trách..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => {
                setFilterTab('all');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                filterTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
            >
              Tất cả ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterTab('pending');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                filterTab === 'pending' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
            >
              Đang xử lý
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterTab('completed');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                filterTab === 'completed' ? 'bg-white text-emerald-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
            >
              Hoàn thành
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => showToast('Đang xuất tệp Excel báo cáo nghiệp vụ')}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <i className="bi bi-file-earmark-excel text-emerald-600 text-sm" />
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <i className="bi bi-plus-lg text-sm" />
              <span>Thêm mới</span>
            </button>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                {meta.groupName} · DANH SÁCH DỮ LIỆU THỰC THI
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Hiển thị {filteredRows.length} bản ghi phù hợp
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold bg-slate-50/30">
                  <th className="py-3 px-4 w-28">Mã số</th>
                  <th className="py-3 px-4">Tên công việc / Hồ sơ nghiệp vụ</th>
                  <th className="py-3 px-4 w-40">Bộ phận</th>
                  <th className="py-3 px-4 w-32">Thời hạn / Ngày</th>
                  <th className="py-3 px-4 w-28">Mức độ</th>
                  <th className="py-3 px-4 w-28 text-center">Trạng thái</th>
                  <th className="py-3 px-4 w-24 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredRows
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
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
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {row.dept}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {row.deadline}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.priority.includes('Gấp') || row.priority.includes('Cốt lõi')
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : row.priority.includes('Cao') || row.priority.includes('Bắt buộc')
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {row.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        row.status.includes('Hoàn thành') || row.status.includes('Hoạt động') || row.status.includes('Hợp lệ')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : row.status.includes('Đang làm') || row.status.includes('Đang xử lý')
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => showToast(`Đang mở chi tiết hồ sơ ${row.code}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border-0 bg-transparent cursor-pointer"
                        title="Xem chi tiết"
                      >
                        <i className="bi bi-chevron-right text-xs" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-white">
            <Pagination
              currentPage={page}
              totalItems={filteredRows.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              itemName="bản ghi"
            />
          </div>
        </div>

      </div>

      {/* ── Modal Thêm Mới Nhanh ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <i className={`bi ${meta.icon} text-blue-600`} />
                <span>Thêm mới: {meta.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mã hồ sơ / Tiêu đề</label>
                <input
                  type="text"
                  placeholder="Nhập tên công việc, đề xuất hoặc danh mục mới..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mức độ ưu tiên</label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs">
                  <option>Bình thường</option>
                  <option>Ưu tiên cao</option>
                  <option>Gấp / Hạn chót</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú & Nội dung chi tiết</label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả tóm tắt quy trình thực hiện..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-500 resize-none"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer border-0 bg-transparent"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  showToast('Đã lưu hồ sơ nghiệp vụ mới thành công!');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer border-0 shadow-xs"
              >
                Lưu dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
