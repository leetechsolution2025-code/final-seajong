import React, { useMemo, useState } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { SalesOverviewView } from '../departments/sales/SalesOverviewView';
import { useDepartment } from '../../context/DepartmentContext';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../types';

const DEFAULT_OVERVIEW_TICKER = [
  {
    badge: 'TỔNG DOANH SỐ',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
    text: 'Tháng 10/2026: Tổng doanh số đạt <strong>0,15 tỷ đồng</strong> (Seajong: <strong>0,14 tỷ</strong> • OEM: <strong>0,01 tỷ</strong>) — Đạt <strong>9.7%</strong> chỉ tiêu (1,55 tỷ, tăng trưởng <strong>+275%</strong>)',
  },
  {
    badge: 'TỔNG DOANH THU',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    text: 'Tháng 10/2026: Tổng doanh thu đạt <strong>0,07 tỷ đồng</strong> (Seajong: <strong>0,06 tỷ</strong> • OEM: <strong>0,01 tỷ</strong>) — Đạt <strong>5.3%</strong> kế hoạch (1,32 tỷ)',
  },
  {
    badge: 'PHÁT TRIỂN ĐẠI LÝ',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    text: 'Tháng 10/2026: Phát triển <strong>8/11 đại lý</strong> (Đạt <strong>72.7%</strong> mục tiêu) • Đang theo dõi <strong>4 đối tác tiềm năng</strong> (3 chăm sóc, 1 báo giá/HĐ)',
  },
  {
    badge: 'HỖ TRỢ ĐẠI LÝ',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
    text: 'Hỗ trợ đại lý: Tiếp nhận <strong>2 yêu cầu</strong> (1 đang xử lý, 1 chờ tiếp nhận — Tiếp nhận <strong>50%</strong>) • Mới nhất: <strong>Showroom Thiên Thuận Lạng Sơn (YCDL-202610-0001)</strong>',
  },
  {
    badge: 'DIỄN BIẾN 6 THÁNG',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200 font-bold',
    text: 'Lũy kế 6 tháng trên biểu đồ (T05–T10/2026): Tổng doanh số đạt <strong>1,29 tỷ đồng</strong> • Tổng doanh thu thực thu đạt <strong>0,30 tỷ đồng</strong>',
  },
];

export interface SalesOverviewPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onNavigate?: (navId: string) => void;
}

export const SalesOverviewPage: React.FC<SalesOverviewPageProps> = ({
  onShowToast,
  onNavigate,
}) => {
  const { setActiveMenuKey } = useDepartment();
  const { user: authUser } = useAuth();
  const [tickerItems, setTickerItems] = useState<any[]>(DEFAULT_OVERVIEW_TICKER);

  const currentUserProfile = useMemo<UserProfile | undefined>(() => {
    if (!authUser) return undefined;
    const fullName = authUser.employee?.fullName || authUser.name || 'Nguyễn Minh Thành';
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
    return {
      id: String(authUser.id || authUser.email),
      name: fullName,
      email: authUser.email,
      role: authUser.employee?.position || authUser.role || 'Bán hàng',
      department: authUser.employee?.departmentName || 'Phòng Kinh doanh',
      initials: initials || 'NT',
    };
  }, [authUser]);

  const handleNavigate = (navId: string) => {
    if (onNavigate) {
      onNavigate(navId);
      return;
    }
    if (navId === 'contracts' || navId === 'bidding' || navId === 'order-tracking') {
      setActiveMenuKey('order-tracking');
    } else if (navId === 'partners') {
      setActiveMenuKey('partners');
    } else if (navId === 'customers' || navId === 'dealer-list') {
      setActiveMenuKey('customers');
    } else if (navId === 'dealer-support') {
      setActiveMenuKey('dealer-support');
    } else {
      setActiveMenuKey(navId);
    }
  };

  return (
    <StandardPage
      title="Phòng Kinh doanh"
      description="Quản lý bán hàng, doanh thu và đại lý"
      color="emerald"
      icon="bi-graph-up-arrow"
      badge="SALES"
      tickerContext="sales"
      customTickerNews={tickerItems}
      cardPadding="p-0"
      useCard={true}
    >
      <SalesOverviewView
        user={currentUserProfile}
        onShowToast={onShowToast}
        onNavigate={handleNavigate}
        onTickerUpdate={setTickerItems}
      />
    </StandardPage>
  );
};

export default SalesOverviewPage;
