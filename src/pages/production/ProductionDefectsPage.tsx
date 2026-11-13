import React, { useState, useEffect, useCallback, useMemo } from "react";
import { StepPage } from "@/components/common/StepPage";
import type { ModernStepItem } from "@/types";
import { TableToolbar } from "@/components/common/TableToolbar";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/common/Button";
import { DefectList, groupDefectsByOrder } from "./defects/DefectList";
import { DefectSummaryOffcanvas } from "./defects/DefectSummaryOffcanvas";
import { DefectProcessModal } from "./defects/DefectProcessModal";
import { CreateDefectOffcanvas } from "./defects/CreateDefectOffcanvas";
import { useSession } from "next-auth/react";
import { canManageProdDefects } from "@/lib/production-permissions";
import { EventOffcanvas } from "@/components/common/EventOffcanvas";
import { DataRetentionOffcanvas } from "@/components/common/DataRetentionOffcanvas";
import {
  CalendarEvent,
  PlusLg,
  ArrowRepeat,
  ClockHistory,
  HourglassSplit,
  CheckCircleFill,
} from "react-bootstrap-icons";

export function ProductionDefectsPage() {
  const { data: session } = useSession();
  const isProdAdmin = canManageProdDefects(session?.user);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processingDefectId, setProcessingDefectId] = useState<string | null>(null);
  const [isCreateOffcanvasOpen, setIsCreateOffcanvasOpen] = useState(false);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState(false);
  const [isCleanupOffcanvasOpen, setIsCleanupOffcanvasOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'INTERNAL' | 'WARRANTY' | 'RETURN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [defects, setDefects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDefects = useCallback(() => {
    setLoading(true);
    fetch('/api/production/defects')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDefects(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDefects();
  }, [fetchDefects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentStep, activeTab, statusFilter, searchQuery]);

  const inProgressDefects = useMemo(
    () => defects.filter((d: any) => d.status !== 'COMPLETED'),
    [defects]
  );
  const completedDefects = useMemo(
    () => defects.filter((d: any) => d.status === 'COMPLETED'),
    [defects]
  );

  const steps: ModernStepItem[] = useMemo(
    () => [
      {
        num: 1,
        id: 'in-progress',
        title: 'Đang thực hiện',
        mobileTitle: 'Đang thực hiện',
        desc: 'Các hồ sơ hàng lỗi đang tiếp nhận, chẩn đoán và xử lý',
        badge: `${inProgressDefects.length} hồ sơ`,
        icon: <HourglassSplit size={16} />,
      },
      {
        num: 2,
        id: 'completed',
        title: 'Đã hoàn thành',
        mobileTitle: 'Đã hoàn thành',
        desc: 'Các hồ sơ hàng lỗi đã xử lý và kiểm tra hoàn tất',
        badge: `${completedDefects.length} hồ sơ`,
        badgeVariant: 'success',
        icon: <CheckCircleFill size={16} />,
      },
    ],
    [inProgressDefects.length, completedDefects.length]
  );

  const activeStepSource = currentStep === 1 ? inProgressDefects : completedDefects;

  const filteredDefects = useMemo(() => {
    return activeStepSource.filter((d: any) => {
      if (activeTab !== 'ALL' && d.source !== activeTab) return false;
      if (currentStep === 1 && statusFilter && d.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchOrder = d.orderNumber?.toLowerCase().includes(q);
        const matchCode = d.code?.toLowerCase().includes(q);
        const matchProduct = d.productName?.toLowerCase().includes(q);
        const matchPhone = d.customerPhone?.includes(q);
        const matchCustomer = d.customerName?.toLowerCase().includes(q);
        const matchAddress = d.customerAddress?.toLowerCase().includes(q);
        if (
          !matchOrder &&
          !matchCode &&
          !matchProduct &&
          !matchPhone &&
          !matchCustomer &&
          !matchAddress
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activeStepSource, activeTab, currentStep, statusFilter, searchQuery]);

  const orderGroups = useMemo(() => groupDefectsByOrder(filteredDefects), [filteredDefects]);

  const paginatedGroups = useMemo(
    () => orderGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [orderGroups, currentPage, pageSize]
  );

  return (
    <div className="prod-defects-page h-full">
      <StepPage
        title="Xử lý hàng lỗi"
        description="Quản lý và xử lý các sản phẩm lỗi (Bảo hành, Nội bộ & Hàng trả về)"
        icon="bi-tools"
        color="blue"
        badge="KIỂM SOÁT HÀNG LỖI"
        steps={steps}
        currentStep={currentStep}
        onStepChange={(step) => {
          setCurrentStep(step);
          setStatusFilter('');
        }}
      >
        <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <TableToolbar
            actionsBeforeSearch={
              <div className="prod-defects-tabs inline-flex items-center gap-1 sm:gap-1.5">
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'INTERNAL', label: 'Nội bộ' },
                  { id: 'WARRANTY', label: 'Bảo hành' },
                  { id: 'RETURN', label: 'Trả về' },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    size="sm"
                    className="!px-2 sm:!px-3 whitespace-nowrap"
                    variant={activeTab === tab.id ? 'primary' : 'outline'}
                    onClick={() => setActiveTab(tab.id as any)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            }
            filters={
              currentStep === 1
                ? [
                    {
                      id: 'defect-status-filter',
                      value: statusFilter,
                      onChange: setStatusFilter,
                      minWidth: '170px',
                      options: [
                        { label: "Tất cả trạng thái", value: "" },
                        { label: "Chưa xử lý", value: "NEW" },
                        { label: "Đang chẩn đoán", value: "TECH_EVALUATING" },
                        { label: "Chờ kho vật tư", value: "WAITING_INVENTORY" },
                        { label: "Đang xử lý", value: "PROCESSING" },
                        { label: "Chờ QC kiểm tra", value: "WAITING_QC" },
                      ],
                    },
                  ]
                : []
            }
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Tìm mã đơn hàng, mã lỗi, khách hàng, sản phẩm..."
            searchMinWidth="240px"
            rightActions={
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<PlusLg size={14} />}
                  disabled={!isProdAdmin}
                  title={!isProdAdmin ? "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền tạo hồ sơ lỗi" : undefined}
                  onClick={() => {
                    if (!isProdAdmin) return;
                    setIsCreateOffcanvasOpen(true);
                  }}
                >
                  <span className="sm:hidden">Tạo mới</span>
                  <span className="hidden sm:inline">Tạo hồ sơ lỗi</span>
                </Button>
              </div>
            }
            onRefresh={fetchDefects}
            menuItems={[
              {
                id: 'cleanup-settings',
                label: 'Thiết lập xoá',
                icon: <ClockHistory size={15} style={{ color: '#d97706' }} />,
                onClick: () => setIsCleanupOffcanvasOpen(true),
              },
              {
                id: 'event-calendar',
                label: 'Lịch sự kiện',
                icon: <CalendarEvent size={15} className="text-sky-600" />,
                onClick: () => setIsEventCalendarOpen(true),
              },
              { id: 'div-1', label: '', divider: true, onClick: () => {} },
              {
                id: 'refresh',
                label: 'Làm mới dữ liệu',
                icon: <ArrowRepeat size={15} className="text-indigo-600" />,
                onClick: fetchDefects,
              },
            ]}
          />

          <FullWidthTable loading={loading}>
            <DefectList
              groups={paginatedGroups}
              onSelect={(id) => setSelectedDefectId(id)}
              emptyMessage={
                currentStep === 1
                  ? 'Hiện không có hồ sơ hàng lỗi nào đang thực hiện'
                  : 'Chưa có hồ sơ hàng lỗi nào đã hoàn thành khớp điều kiện tìm kiếm'
              }
            />
          </FullWidthTable>

          <Pagination
            currentPage={currentPage}
            totalItems={orderGroups.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemName="đơn hàng"
          />
        </div>

        <DefectSummaryOffcanvas
          defectId={selectedDefectId}
          defect={defects.find((d: any) => d.id === selectedDefectId)}
          onClose={() => setSelectedDefectId(null)}
          onRefresh={fetchDefects}
          onOpenProcess={(id) => {
            const targetId = id || selectedDefectId;
            setProcessingDefectId(targetId);
            setIsProcessModalOpen(true);
            setSelectedDefectId(null);
          }}
        />

        <CreateDefectOffcanvas
          show={isCreateOffcanvasOpen}
          onClose={() => setIsCreateOffcanvasOpen(false)}
          onRefresh={fetchDefects}
        />

        {isProcessModalOpen && (
          <DefectProcessModal
            defectId={processingDefectId || selectedDefectId}
            onClose={() => {
              setIsProcessModalOpen(false);
              setProcessingDefectId(null);
            }}
            onRefresh={fetchDefects}
          />
        )}

        <EventOffcanvas
          isOpen={isEventCalendarOpen}
          onClose={() => setIsEventCalendarOpen(false)}
        />

        <DataRetentionOffcanvas
          isOpen={isCleanupOffcanvasOpen}
          onClose={() => setIsCleanupOffcanvasOpen(false)}
          ticketType="DEFECT_RECORDS"
          title="Thiết lập thời gian lưu trữ"
          description="Cấu hình tự động dọn dẹp các hồ sơ hàng lỗi đã hoàn thành quá thời hạn lưu trữ"
          entityLabel="hồ sơ"
          onCleanedUp={fetchDefects}
        />
      </StepPage>
    </div>
  );
}

export default ProductionDefectsPage;
