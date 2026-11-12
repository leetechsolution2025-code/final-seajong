import React, { useMemo, useState } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { SalesOverviewView } from '../departments/sales/SalesOverviewView';
import { useDepartment } from '../../context/DepartmentContext';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../types';

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
  const [tickerItems, setTickerItems] = useState<any[]>([]);

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
    <div className="sales-overview-page h-full w-full flex flex-col min-h-0">
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
    </div>
  );
};

export default SalesOverviewPage;
