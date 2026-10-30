import React, { useState, useEffect, useCallback } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { TableToolbar } from "@/components/common/TableToolbar";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/common/Button";
import { DefectList } from "./defects/DefectList";
import { DefectSummaryOffcanvas } from "./defects/DefectSummaryOffcanvas";
import { DefectProcessModal } from "./defects/DefectProcessModal";
import { CreateDefectOffcanvas } from "./defects/CreateDefectOffcanvas";
import { useSession } from "next-auth/react";
import { isProductionAdmin } from "@/lib/production-permissions";
import { EventOffcanvas } from "@/components/common/EventOffcanvas";
import { CalendarEvent, PlusLg, ArrowRepeat } from "react-bootstrap-icons";

export function ProductionDefectsPage() {
  const { data: session } = useSession();
  const isProdAdmin = isProductionAdmin(session?.user);
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isCreateOffcanvasOpen, setIsCreateOffcanvasOpen] = useState(false);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'INTERNAL' | 'WARRANTY' | 'RETURN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
  }, [activeTab, statusFilter, searchQuery]);

  const filteredDefects = defects.filter((d: any) => {
    if (activeTab !== 'ALL' && d.source !== activeTab) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCode = d.code?.toLowerCase().includes(q);
      const matchProduct = d.productName?.toLowerCase().includes(q);
      const matchPhone = d.customerPhone?.includes(q);
      const matchCustomer = d.customerName?.toLowerCase().includes(q);
      if (!matchCode && !matchProduct && !matchPhone && !matchCustomer) return false;
    }
    return true;
  });

  const paginatedDefects = filteredDefects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <StandardPage
      title="Xử lý hàng lỗi"
      description="Quản lý và xử lý các sản phẩm lỗi (Bảo hành, Nội bộ & Hàng trả về)"
      icon="bi-tools"
      color="blue"
      useCard={true}
      hideTicker={true}
    >
      <TableToolbar
        actionsBeforeSearch={
          <div className="inline-flex items-center gap-1.5">
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
                variant={activeTab === tab.id ? 'primary' : 'outline'}
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        }
        filters={[
          {
            id: 'defect-status-filter',
            value: statusFilter,
            onChange: setStatusFilter,
            minWidth: '170px',
            options: [
              { label: "Tất cả trạng thái", value: "" },
              { label: "Chưa xử lý", value: "NEW" },
              { label: "Đang xử lý", value: "PROCESSING" },
              { label: "Chờ QC kiểm tra", value: "WAITING_QC" },
              { label: "Đã xử lý", value: "COMPLETED" }
            ]
          }
        ]}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm mã lỗi, sản phẩm, SĐT khách..."
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
              Tạo hồ sơ lỗi
            </Button>
          </div>
        }
        onRefresh={fetchDefects}
        menuItems={[
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
        <DefectList data={paginatedDefects} onSelect={id => setSelectedDefectId(id)} />
      </FullWidthTable>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredDefects.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemName="hồ sơ"
      />

      <DefectSummaryOffcanvas
        defectId={selectedDefectId}
        defect={defects.find((d: any) => d.id === selectedDefectId)}
        onClose={() => setSelectedDefectId(null)}
        onRefresh={fetchDefects}
        onOpenProcess={() => setIsProcessModalOpen(true)}
      />

      <CreateDefectOffcanvas
        show={isCreateOffcanvasOpen}
        onClose={() => setIsCreateOffcanvasOpen(false)}
        onRefresh={fetchDefects}
      />

      {isProcessModalOpen && (
        <DefectProcessModal
          defectId={selectedDefectId}
          onClose={() => setIsProcessModalOpen(false)}
          onRefresh={fetchDefects}
        />
      )}

      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StandardPage>
  );
}

export default ProductionDefectsPage;
