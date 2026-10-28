import React, { useState, useEffect } from 'react';
import { useDepartment } from '../../context/DepartmentContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavSubItem {
  id: string;
  name: string;
  isLocked?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: string;
  flat?: boolean;
  isLocked?: boolean;
  items?: NavSubItem[];
}

/**
 * Cấu hình Sidebar chuẩn xác 100% theo mã nguồn DEPT_NAV_GROUPS và DEPT_SIDEBARS
 * của dự án client-seajong/src/app/(dashboard)/layout.tsx
 */
const DEPT_SIDEBAR_CONFIGS: Record<string, { deptName: string; sections: NavSection[] }> = {
  // 0. CỔNG THÔNG TIN ĐẠI LÝ (/dealer)
  dealer: {
    deptName: 'Hệ thống đại lý và nhà phân phối',
    sections: [
      { id: 'orders', label: 'Đơn hàng', icon: 'bi-bag-check', flat: true },
      { id: 'debts', label: 'Công nợ và điểm thưởng', icon: 'bi-cash-coin', flat: true },
      { id: 'support', label: 'Yêu cầu hỗ trợ', icon: 'bi-headset', flat: true },
    ],
  },

  // 1. BAN GIÁM ĐỐC (/board)
  board: {
    deptName: 'Ban Giám đốc',
    sections: [
      {
        id: 'admin',
        label: 'Quản trị hệ thống',
        icon: 'bi-shield-lock',
        items: [
          { id: 'categories', name: 'Quản lý danh mục' },
          { id: 'users', name: 'Phân quyền người dùng' },
          { id: 'labor-policy', name: 'Nội quy lao động' },
        ],
      },
      { id: 'plan', label: 'Lập kế hoạch', icon: 'bi-calendar-check', flat: true },
      { id: 'tasks', label: 'Quản trị công việc', icon: 'bi-kanban', flat: true },
      { id: 'approvals', label: 'Phê duyệt tài liệu', icon: 'bi-check2-square', flat: true },
    ],
  },

  // 2. NHÂN SỰ (/hr)
  hr: {
    deptName: 'Nhân sự',
    sections: [
      {
        id: 'recruitment',
        label: 'Tuyển dụng',
        icon: 'bi-person-plus',
        items: [
          { id: 'recruitment', name: 'Quản trị tuyển dụng' },
          { id: 'interviews', name: 'Phỏng vấn ứng viên' },
        ],
      },
      {
        id: 'training',
        label: 'Đào tạo và thử việc',
        icon: 'bi-mortarboard',
        items: [
          { id: 'training', name: 'Kế hoạch đào tạo' },
          { id: 'probation', name: 'Theo dõi thử việc' },
        ],
      },
      {
        id: 'personnel',
        label: 'Nhân sự',
        icon: 'bi-people',
        items: [
          { id: 'employees', name: 'Quản lý hồ sơ nhân viên' },
          { id: 'promotions', name: 'Điều chuyển và đề bạt' },
          { id: 'terminations', name: 'Sa thải và thôi việc' },
        ],
      },
      {
        id: 'welfare',
        label: 'Phúc lợi',
        icon: 'bi-cash-coin',
        items: [
          { id: 'attendance-payroll', name: 'Chấm công và tính lương' },
          { id: 'insurance', name: 'Bảo hiểm' },
          { id: 'salary-adjustments', name: 'Điều chỉnh thu nhập' },
        ],
      },
      { id: 'stationery', label: 'Văn phòng phẩm và dụng cụ', icon: 'bi-archive', flat: true },
    ],
  },

  // 3. TÀI CHÍNH – KẾ TOÁN (/finance)
  finance: {
    deptName: 'Tài chính – Kế toán',
    sections: [
      {
        id: 'cashflow',
        label: 'Theo dõi dòng tiền',
        icon: 'bi-cash-coin',
        flat: true,
      },
      {
        id: 'finance_mgmt',
        label: 'Quản lý tài chính',
        icon: 'bi-wallet2',
        items: [
          { id: 'assets', name: 'Quản lý tài sản' },
          { id: 'debts', name: 'Quản lý công nợ và chi phí' },
        ],
      },
      {
        id: 'inventory_track',
        label: 'Theo dõi kho hàng',
        icon: 'bi-boxes',
        items: [
          { id: 'inventory', name: 'Hàng hoá trong kho' },
          { id: 'audit-logs', name: 'Nhật ký hoạt động kho' },
          { id: 'inventory-reports', name: 'Báo cáo kho' },
        ],
      },
      {
        id: 'accounting',
        label: 'Kế toán nội bộ',
        icon: 'bi-journal-text',
        items: [
          { id: 'journal-entries', name: 'Sổ nhật ký chung' },
          { id: 'initial-declaration', name: 'Khai báo số dư đầu kỳ' },
          { id: 'advances', name: 'Tạm ứng và chi phí' },
        ],
      },
      {
        id: 'reports',
        label: 'Báo cáo tài chính',
        icon: 'bi-file-earmark-bar-graph',
        flat: true,
      },
    ],
  },

  // 4. KINH DOANH (/sales)
  sales: {
    deptName: 'Kinh doanh',
    sections: [
      {
        id: 'customers_dealers',
        label: 'Khách hàng và đại lý',
        icon: 'bi-people',
        items: [
          { id: 'partners', name: 'Phát triển đại lý' },
          { id: 'customers', name: 'Danh sách đại lý' },
          { id: 'pricing', name: 'Chính sách bán hàng' },
        ],
      },
      { id: 'sales_plan', label: 'Lập kế hoạch sale', icon: 'bi-calendar-check', flat: true },
      {
        id: 'reports_analytics',
        label: 'Báo cáo và phân tích',
        icon: 'bi-bar-chart-line',
        items: [
          { id: 'business-results', name: 'Kết quả kinh doanh' },
          { id: 'internal-reports', name: 'Báo cáo nội bộ' },
        ],
      },
    ],
  },

  // 5. MARKETING (/marketing)
  marketing: {
    deptName: 'Marketing',
    sections: [
      {
        id: 'products_brand',
        label: 'Sản phẩm và tài nguyên',
        icon: 'bi-box-seam',
        items: [
          { id: 'products', name: 'Sản phẩm' },
          { id: 'brand', name: 'Nhận diện thương hiệu' },
        ],
      },
      {
        id: 'market_competitors',
        label: 'Thị trường và đối thủ',
        icon: 'bi-binoculars',
        items: [
          { id: 'competitors', name: 'Theo dõi đối thủ' },
          { id: 'market-analysis', name: 'Phân tích thị trường' },
        ],
      },
      { id: 'mkt_plan', label: 'Lập kế hoạch', icon: 'bi-calendar-check', flat: true },
      {
        id: 'events_dealers',
        label: 'Sự kiện và đại lý',
        icon: 'bi-calendar-event',
        items: [
          { id: 'events', name: 'Sự kiện' },
          { id: 'dealers', name: 'Đại lý' },
        ],
      },
      { id: 'tasks', label: 'Quản trị công việc', icon: 'bi-kanban', flat: true },
    ],
  },

  // 6. CHĂM SÓC KHÁCH HÀNG (/cs)
  cs: {
    deptName: 'Chăm sóc KH',
    sections: [
      {
        id: 'crm',
        label: 'Quản lý quan hệ khách hàng',
        icon: 'bi-people',
        items: [
          { id: 'fac_crm', name: 'Chăm sóc khách hàng' },
          { id: 'complaints', name: 'Xử lý khiếu nại' },
        ],
      },
      { id: 'inventory', label: 'Hàng hoá trong kho', icon: 'bi-boxes', flat: true },
    ],
  },

  // 7. QUẢN LÝ HỆ THỐNG KHO (/logistics)
  logistics: {
    deptName: 'Quản lý hệ thống kho',
    sections: [
      { id: 'system', label: 'Hệ thống kho', icon: 'bi-building', flat: true },
      {
        id: 'operations',
        label: 'Vận hành kho',
        icon: 'bi-boxes',
        items: [
          { id: 'inbound', name: 'Nhập, xuất và kiểm kho' },
          { id: 'material-picking', name: 'Cấp phát vật tư' },
          { id: 'batch-packing', name: 'Gom hàng và dán nhãn' },
        ],
      },
      {
        id: 'reports',
        label: 'Báo cáo và thống kê',
        icon: 'bi-bar-chart-fill',
        items: [
          { id: 'inventory-reports', name: 'Báo cáo kho' },
          { id: 'audit-logs', name: 'Nhật ký hoạt động kho' },
        ],
      },
    ],
  },

  // 8. MUA HÀNG (/purchase)
  purchase: {
    deptName: 'Mua hàng',
    sections: [
      { id: 'suppliers', label: 'Nhà cung cấp và vận chuyển', icon: 'bi-truck', flat: true },
    ],
  },

  // 9. ĐẢM BẢO CHẤT LƯỢNG (/qa)
  qa: {
    deptName: 'Đảm bảo chất lượng',
    sections: [
      { id: 'standards', label: 'Tiêu chuẩn chất lượng', icon: 'bi-award', flat: true },
      { id: 'defects-summary', label: 'Tổng hợp hàng lỗi', icon: 'bi-exclamation-triangle', flat: true },
    ],
  },

  // 10. SẢN XUẤT (/production)
  production: {
    deptName: 'Sản xuất',
    sections: [
      { id: 'defects', label: 'Xử lý hàng lỗi', icon: 'bi-exclamation-octagon', flat: true },
      {
        id: 'goods',
        label: 'Hàng hoá',
        icon: 'bi-box-seam',
        items: [
          { id: 'inventory', name: 'Kho hàng' },
          { id: 'bom', name: 'Xây dựng định mức' },
        ],
      },
    ],
  },

  // 11. BẢO VỆ – AN NINH (/security)
  security: {
    deptName: 'Bảo vệ – An ninh',
    sections: [
      {
        id: 'overview_sec',
        label: 'Tổng quan',
        icon: 'bi-speedometer2',
        items: [
          { id: 'shifts', name: 'Ca trực' },
          { id: 'incidents', name: 'Sự cố an ninh' },
        ],
      },
      {
        id: 'control',
        label: 'Kiểm soát',
        icon: 'bi-door-open',
        items: [
          { id: 'access', name: 'Ra vào' },
          { id: 'cameras', name: 'Camera giám sát' },
          { id: 'visitors', name: 'Khách & xe' },
        ],
      },
    ],
  },

  // 12. BÁN LẺ SHOWROOM (/banhang)
  banhang: {
    deptName: 'Bán lẻ Showroom',
    sections: [
      { id: 'retail', label: 'Màn hình bán lẻ', icon: 'bi-shop', flat: true },
      {
        id: 'management',
        label: 'Quản lý',
        icon: 'bi-gear',
        items: [
          { id: 'sales', name: 'Danh sách hoá đơn' },
          { id: 'inventory', name: 'Hàng hoá tồn kho' },
          { id: 'customers', name: 'Quản lý khách hàng' },
        ],
      },
    ],
  },

  // 13. HÀNH CHÍNH – VĂN PHÒNG (/admin_ops)
  admin_ops: {
    deptName: 'Hành chính – VP',
    sections: [
      {
        id: 'overview_admin',
        label: 'Tổng quan',
        icon: 'bi-clipboard2-check',
        items: [
          { id: 'documents', name: 'Văn bản' },
          { id: 'stamps', name: 'Con dấu' },
        ],
      },
      {
        id: 'admin',
        label: 'Hành chính',
        icon: 'bi-archive',
        items: [
          { id: 'assets', name: 'Tài sản VP' },
          { id: 'rooms', name: 'Phòng họp' },
          { id: 'vehicles', name: 'Xe công vụ' },
        ],
      },
    ],
  },

  // 14. CÔNG NGHỆ THÔNG TIN (/it)
  it: {
    deptName: 'Công nghệ thông tin',
    sections: [
      {
        id: 'overview_it',
        label: 'Tổng quan',
        icon: 'bi-speedometer2',
        items: [
          { id: 'systems', name: 'Hệ thống' },
          { id: 'monitoring', name: 'Giám sát' },
        ],
      },
      {
        id: 'mgmt_it',
        label: 'Quản lý',
        icon: 'bi-laptop',
        items: [
          { id: 'assets', name: 'Thiết bị' },
          { id: 'tickets', name: 'Yêu cầu hỗ trợ' },
          { id: 'access', name: 'Tài khoản & Quyền' },
          { id: 'security', name: 'Backup & Security' },
        ],
      },
    ],
  },

  // 15. PHÁP CHẾ (/legal)
  legal: {
    deptName: 'Pháp chế',
    sections: [
      {
        id: 'overview_legal',
        label: 'Tổng quan',
        icon: 'bi-speedometer2',
        items: [
          { id: 'contracts', name: 'Hợp đồng' },
          { id: 'licenses', name: 'Giấy phép' },
        ],
      },
      {
        id: 'compliance',
        label: 'Tuân thủ',
        icon: 'bi-book',
        items: [
          { id: 'policies', name: 'Quy chế nội bộ' },
          { id: 'risks', name: 'Rủi ro pháp lý' },
          { id: 'disputes', name: 'Tranh chấp' },
        ],
      },
    ],
  },

  // 16. VĂN PHÒNG TỔNG GIÁM ĐỐC (/exec)
  exec: {
    deptName: 'Văn phòng TGĐ',
    sections: [
      {
        id: 'overview_exec',
        label: 'Tổng quan',
        icon: 'bi-person-badge',
        items: [
          { id: 'calendar', name: 'Lịch công tác' },
          { id: 'announcements', name: 'Thông báo nội bộ' },
        ],
      },
      {
        id: 'dispatch',
        label: 'Điều phối',
        icon: 'bi-envelope-paper',
        items: [
          { id: 'documents', name: 'Văn bản đến/đi' },
          { id: 'directives', name: 'Chỉ đạo TGĐ' },
        ],
      },
    ],
  },

  // 17. KỸ THUẬT – CƠ SỞ VẬT CHẤT (/facility)
  facility: {
    deptName: 'Kỹ thuật – CSVC',
    sections: [
      {
        id: 'overview_fac',
        label: 'Tổng quan',
        icon: 'bi-wrench-adjustable',
        items: [
          { id: 'assets', name: 'Tài sản cố định' },
          { id: 'maintenance', name: 'Bảo trì' },
        ],
      },
      {
        id: 'facility',
        label: 'Cơ sở vật chất',
        icon: 'bi-lightning',
        items: [
          { id: 'utilities', name: 'Điện – Nước' },
          { id: 'repairs', name: 'Sửa chữa' },
          { id: 'requests', name: 'Yêu cầu kỹ thuật' },
        ],
      },
    ],
  },

  // 18. NGHIÊN CỨU & PHÁT TRIỂN (/rd)
  rd: {
    deptName: 'R&D',
    sections: [
      {
        id: 'overview_rd',
        label: 'Tổng quan',
        icon: 'bi-lightbulb',
        items: [
          { id: 'projects', name: 'Dự án R&D' },
          { id: 'innovations', name: 'Sáng kiến' },
        ],
      },
      {
        id: 'research',
        label: 'Nghiên cứu',
        icon: 'bi-flask',
        items: [
          { id: 'docs', name: 'Tài liệu kỹ thuật' },
          { id: 'experiments', name: 'Thí nghiệm' },
          { id: 'patents', name: 'Bằng sáng chế' },
        ],
      },
    ],
  },

  // 19. TÀI CHÍNH – KINH DOANH (/plan_finance)
  plan_finance: {
    deptName: 'Tài chính – Kinh doanh',
    sections: [
      { id: 'customers', label: 'Khách hàng', icon: 'bi-people', flat: true },
      { id: 'sales', label: 'Bán hàng', icon: 'bi-cart3', flat: true },
      {
        id: 'finance',
        label: 'Tài chính',
        icon: 'bi-coin',
        items: [
          { id: 'assets', name: 'Tài sản cố định' },
          { id: 'inventory', name: 'Hàng hoá trong kho' },
          { id: 'purchasing', name: 'Mua hàng' },
          { id: 'payroll', name: 'Chấm công & lương' },
        ],
      },
      {
        id: 'debt_expense',
        label: 'Công nợ và chi phí',
        icon: 'bi-receipt',
        items: [
          { id: 'suppliers', name: 'Nhà cung cấp và vận chuyển' },
          { id: 'debts', name: 'Quản lý công nợ và chi phí' },
        ],
      },
    ],
  },
};

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { activeDeptCode, activeMenuKey, setActiveMenuKey } = useDepartment();

  // Trạng thái mở accordion của các section: chỉ duy nhất 1 section mở tại 1 thời điểm
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  // Tự động mở accordion đầu tiên khi chuyển phòng ban
  useEffect(() => {
    const config = DEPT_SIDEBAR_CONFIGS[activeDeptCode] || DEPT_SIDEBAR_CONFIGS.board;
    const firstExpandable = config.sections.find((s) => !s.flat && s.items && s.items.length > 0);
    if (firstExpandable) {
      setOpenSectionId(firstExpandable.id);
    } else {
      setOpenSectionId(null);
    }
  }, [activeDeptCode]);

  const toggleSection = (id: string) => {
    setOpenSectionId((prev) => (prev === id ? null : id));
  };

  const currentConfig = DEPT_SIDEBAR_CONFIGS[activeDeptCode] || DEPT_SIDEBAR_CONFIGS.board;
  const isOverview = activeMenuKey === 'overview';

  const isDealer = activeDeptCode === 'dealer' || activeDeptCode === 'dai-ly';

  // Kiểm tra hiển thị mục "Kho hàng" trực tiếp (chuẩn client-seajong: ẩn ở logistics, marketing, production, finance, qa, hr, board, dealer)
  const isWarehouseHidden = isDealer || ['board', 'hr', 'logistics', 'marketing', 'production', 'finance', 'qa'].includes(activeDeptCode);

  const isLogisticsDept = activeDeptCode === 'logistics' || activeDeptCode === 'kho' || activeDeptCode === 'kho-hang' || activeDeptCode === 'warehouse';
  const isSalesDept = activeDeptCode === 'sales' || activeDeptCode === 'kd' || activeDeptCode === 'kinh-doanh';
  const isFinanceDept = activeDeptCode === 'finance' || activeDeptCode === 'tai-chinh' || activeDeptCode === 'ke-toan';

  // Nhóm Yêu cầu và duyệt yêu cầu (ẩn ở board, hr, marketing, sales, finance và dealer)
  const showApprovalGroup =
    !isDealer &&
    activeDeptCode !== 'board' &&
    activeDeptCode !== 'hr' &&
    activeDeptCode !== 'marketing' &&
    !isSalesDept &&
    !isFinanceDept;

  // Ẩn nhóm "Lưu trữ" ở trang Marketing, Sales, Finance, Logistics và Dealer
  const isArchiveHidden = isDealer || activeDeptCode === 'marketing' || isSalesDept || isFinanceDept || isLogisticsDept;

  return (
    <aside
      className={`fixed top-16 left-0 bottom-0 z-40 h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out bg-white border-r border-slate-200/80 text-slate-600 flex flex-col select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* ── 1. Top Slogan (chuẩn client-seajong: không viền dưới, chữ in hoa xám đậm tinh tế) ── */}
      <div className="px-4 pt-3.5 pb-4 mb-1 shrink-0 text-center">
        {!collapsed ? (
          <h2 className="text-[12.5px] font-extrabold text-slate-800 uppercase tracking-wider leading-tight font-sans">
            TIÊN PHONG KIẾN TẠO GIÁ TRỊ THỰC
          </h2>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs mx-auto">
            SJ
          </div>
        )}
      </div>

      {/* ── 2. Danh sách Menu Điều Hướng Phân Hệ ── */}
      <div className="flex-1 px-2.5 py-1 flex flex-col overflow-y-auto scrollbar-thin">
        <div className="space-y-0.5">
          {/* Nút: Tổng quan */}
          <button
            type="button"
            onClick={() => setActiveMenuKey('overview')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] transition-all cursor-pointer border-0 bg-transparent text-left ${
              isOverview
                ? 'text-blue-600 font-bold bg-blue-50/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'
            } ${collapsed ? 'justify-center px-2' : ''}`}
            title={collapsed ? 'Tổng quan' : undefined}
          >
            <i
              className={`bi bi-speedometer2 text-[16px] shrink-0 ${
                isOverview ? 'text-blue-600' : 'text-slate-400'
              }`}
            />
            {!collapsed && <span>Tổng quan</span>}
          </button>

          {/* Nhóm Cố Định: Lưu trữ (Thư viện tài liệu & Nội dung cuộc họp - chuẩn client-seajong có ở tất cả các phòng ban) */}
          {!isArchiveHidden && (
            <div>
              <button
                type="button"
                onClick={() => toggleSection('luutru')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-normal transition-all cursor-pointer border-0 bg-transparent ${
                  activeMenuKey === 'documents' || activeMenuKey === 'meetings'
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? 'Lưu trữ' : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <i
                    className={`bi bi-archive text-[16px] shrink-0 ${
                      activeMenuKey === 'documents' || activeMenuKey === 'meetings'
                        ? 'text-blue-600'
                        : 'text-slate-400'
                    }`}
                  />
                  {!collapsed && <span>Lưu trữ</span>}
                </div>
                {!collapsed && (
                  <i
                    className={`bi bi-chevron-down text-[11px] text-slate-400 transition-transform ${
                      openSectionId === 'luutru' ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {!collapsed && openSectionId === 'luutru' && (
                <div className="pl-6 pr-1 space-y-0.5 py-1">
                  <button
                    type="button"
                    onClick={() => setActiveMenuKey('documents')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer border-0 bg-transparent text-left ${
                      activeMenuKey === 'documents'
                        ? 'text-blue-600 font-semibold bg-blue-50/40'
                        : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenuKey === 'documents'
                          ? 'bg-blue-600 border border-blue-600'
                          : 'border border-slate-400'
                      }`}
                    ></span>
                    <span className="truncate">Thư viện tài liệu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMenuKey('meetings')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer border-0 bg-transparent text-left ${
                      activeMenuKey === 'meetings'
                        ? 'text-blue-600 font-semibold bg-blue-50/40'
                        : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenuKey === 'meetings'
                          ? 'bg-blue-600 border border-blue-600'
                          : 'border border-slate-400'
                      }`}
                    ></span>
                    <span className="truncate">Nội dung cuộc họp</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mục Trực Tiếp: Kho hàng (nếu không thuộc nhóm bị ẩn) */}
          {!isWarehouseHidden && (
            <button
              type="button"
              onClick={() => setActiveMenuKey('inventory')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] transition-all cursor-pointer border-0 bg-transparent text-left ${
                activeMenuKey === 'inventory'
                  ? 'text-blue-600 font-bold bg-blue-50/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'
              } ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? 'Kho hàng' : undefined}
            >
              <i
                className={`bi bi-boxes text-[16px] shrink-0 ${
                  activeMenuKey === 'inventory' ? 'text-blue-600' : 'text-slate-400'
                }`}
              />
              {!collapsed && <span>Kho hàng</span>}
            </button>
          )}

          {/* ── Các nhóm chức năng đặc thù của phòng ban hiện tại ── */}
          {currentConfig.sections.map((sec) => {
            const isOpen = openSectionId === sec.id;
            const isSecActive = activeMenuKey === sec.id;

            // Flat section (hàng đơn không có menu con)
            if (sec.flat) {
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    if (!sec.isLocked) setActiveMenuKey(sec.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] transition-all border-0 bg-transparent text-left ${
                    sec.isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    isSecActive
                      ? 'text-blue-600 font-bold bg-blue-50/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                  title={collapsed ? sec.label : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <i
                      className={`bi ${sec.icon} text-[16px] shrink-0 ${
                        isSecActive ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    {!collapsed && <span>{sec.label}</span>}
                  </div>
                  {sec.isLocked && !collapsed && (
                    <i className="bi bi-lock-fill text-slate-400 text-[13px] shrink-0" />
                  )}
                </button>
              );
            }

            // Accordion section
            const isAnySubActive = sec.items?.some((i) => activeMenuKey === i.id);

            return (
              <div key={sec.id}>
                <button
                  type="button"
                  onClick={() => toggleSection(sec.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-normal transition-all cursor-pointer border-0 bg-transparent ${
                    isAnySubActive
                      ? 'text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                  title={collapsed ? sec.label : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <i
                      className={`bi ${sec.icon} text-[16px] shrink-0 ${
                        isAnySubActive ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    {!collapsed && <span>{sec.label}</span>}
                  </div>
                  {!collapsed && (
                    <i
                      className={`bi bi-chevron-down text-[11px] text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {!collapsed && isOpen && sec.items && (
                  <div className="pl-6 pr-1 space-y-0.5 py-1">
                    {sec.items.map((sub) => {
                      const isSubActive = activeMenuKey === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            if (!sub.isLocked) setActiveMenuKey(sub.id);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] transition-colors border-0 bg-transparent text-left ${
                            sub.isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            isSubActive
                              ? 'text-blue-600 font-semibold bg-blue-50/40'
                              : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isSubActive
                                  ? 'bg-blue-600 border border-blue-600'
                                  : 'border border-slate-400'
                              }`}
                            ></span>
                            <span className="truncate">{sub.name}</span>
                          </div>
                          {sub.isLocked && (
                            <i className="bi bi-lock-fill text-slate-400 text-[12px] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Nhóm bổ sung: Yêu cầu và duyệt yêu cầu (chuẩn client-seajong tự động gắn vào các phòng ban khác) ── */}
          {showApprovalGroup && (
            <div>
              <button
                type="button"
                onClick={() => toggleSection('hr_requests_approvals')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-normal transition-all cursor-pointer border-0 bg-transparent ${
                  activeMenuKey === 'recruitment_req' || activeMenuKey === 'approvals'
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? 'Yêu cầu và duyệt yêu cầu' : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <i
                    className={`bi bi-clipboard2-check text-[16px] shrink-0 ${
                      activeMenuKey === 'recruitment_req' || activeMenuKey === 'approvals'
                        ? 'text-blue-600'
                        : 'text-slate-400'
                    }`}
                  />
                  {!collapsed && <span>Yêu cầu và duyệt yêu cầu</span>}
                </div>
                {!collapsed && (
                  <i
                    className={`bi bi-chevron-down text-[11px] text-slate-400 transition-transform ${
                      openSectionId === 'hr_requests_approvals' ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {!collapsed && openSectionId === 'hr_requests_approvals' && (
                <div className="pl-6 pr-1 space-y-0.5 py-1">
                  <button
                    type="button"
                    onClick={() => setActiveMenuKey('recruitment_req')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer border-0 bg-transparent text-left ${
                      activeMenuKey === 'recruitment_req'
                        ? 'text-blue-600 font-semibold bg-blue-50/40'
                        : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenuKey === 'recruitment_req'
                          ? 'bg-blue-600 border border-blue-600'
                          : 'border border-slate-400'
                      }`}
                    ></span>
                    <span className="truncate">Yêu cầu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMenuKey('approvals')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] transition-colors border-0 bg-transparent text-left opacity-75 cursor-pointer ${
                      activeMenuKey === 'approvals'
                        ? 'text-blue-600 font-semibold bg-blue-50/40'
                        : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          activeMenuKey === 'approvals'
                            ? 'bg-blue-600 border border-blue-600'
                            : 'border border-slate-400'
                        }`}
                      ></span>
                      <span className="truncate">Duyệt yêu cầu</span>
                    </div>
                    <i className="bi bi-lock-fill text-slate-400 text-[12px] shrink-0" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 3. Section CÔNG VIỆC CÁ NHÂN (chỉ dành cho nhân viên nội bộ, ẩn đối với đại lý) ── */}
        {!isDealer && (
          <div className="mt-auto pt-4 pb-3">
            {!collapsed ? (
              <p className="px-3 pb-1 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans opacity-75">
                CÔNG VIỆC CÁ NHÂN
              </p>
            ) : (
              <div className="h-px bg-slate-200 my-2"></div>
            )}

            <div className="space-y-0.5">
              {/* Danh sách công việc (không còn badge số) */}
              <button
                type="button"
                onClick={() => setActiveMenuKey('my_tasks')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-normal transition-all cursor-pointer border-0 bg-transparent text-left ${
                  activeMenuKey === 'my_tasks'
                    ? 'text-blue-600 font-semibold bg-blue-50/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? 'Danh sách công việc' : undefined}
              >
                <i
                  className={`bi bi-list-check text-[17px] shrink-0 ${
                    activeMenuKey === 'my_tasks' ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                {!collapsed && <span>Danh sách công việc</span>}
              </button>

              {/* Chấm công */}
              <button
                type="button"
                onClick={() => setActiveMenuKey('my_attendance')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-normal transition-all cursor-pointer border-0 bg-transparent text-left ${
                  activeMenuKey === 'my_attendance'
                    ? 'text-blue-600 font-semibold bg-blue-50/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? 'Chấm công' : undefined}
              >
                <i
                  className={`bi bi-clock-history text-[16px] shrink-0 ${
                    activeMenuKey === 'my_attendance' ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                {!collapsed && <span>Chấm công</span>}
              </button>

              {/* Yêu cầu cá nhân */}
              <button
                type="button"
                onClick={() => setActiveMenuKey('my_requests')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-normal transition-all cursor-pointer border-0 bg-transparent text-left ${
                  activeMenuKey === 'my_requests'
                    ? 'text-blue-600 font-semibold bg-blue-50/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? 'Yêu cầu cá nhân' : undefined}
              >
                <i
                  className={`bi bi-file-earmark-plus text-[16px] shrink-0 ${
                    activeMenuKey === 'my_requests' ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                {!collapsed && <span>Yêu cầu cá nhân</span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

