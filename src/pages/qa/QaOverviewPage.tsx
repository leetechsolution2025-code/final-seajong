import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StepPage } from '@/components/common/StepPage';
import { TableToolbar } from '@/components/common/TableToolbar';
import { FullWidthTable } from '@/components/common/FullWidthTable';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Offcanvas } from '@/components/common/Offcanvas';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EventOffcanvas } from '@/components/common/EventOffcanvas';
import { printDocumentById } from '@/components/common/PrintPreviewModal';
import { useToast } from '@/components/ui/Toast';
import type { ModernStepItem } from '@/types';
import type { TickerItem } from '@/components/layout/DynamicTicker';
import {
  ClipboardCheck,
  Trash,
  FileEarmarkText,
  CheckCircle,
  Printer,
  Floppy,
  CalendarEvent,
  ArrowRepeat,
  ExclamationTriangle,
  PencilSquare,
} from 'react-bootstrap-icons';

const FALLBACK_INSPECTIONS = [
  {
    id: 'IQC-202610-001',
    dbId: 'qa-seed-1',
    type: 'IQC',
    product: 'Lõi van chia nước Ceramic Sedal Ø35mm (500 Cái)',
    model: 'LK-SEDAL-35',
    inspector: 'Trần Minh Quân',
    inspectorName: 'Nguyễn Hoàng Nam (QA)',
    department: 'Kho vận',
    date: '30/10/2026, 09:15',
    result: 'Pass',
    rawResult: 'Đạt',
    notes: 'Độ phẳng đĩa sứ đạt chuẩn, thử áp lực 16 bar không rò rỉ.',
    poNumber: 'PO-202610-081',
    deliveryNote: 'DN-SEDAL-1026',
    metadata: {
      poNumber: 'PO-202610-081',
      deliveryNote: 'DN-SEDAL-1026',
      supplierName: 'Công ty TNHH Linh kiện Van Ceramic Sedal',
      batch: 'LOT-2610A',
      items: [
        {
          productName: 'Lõi van chia nước Ceramic Sedal Ø35mm',
          model: 'LK-SEDAL-35',
          unit: 'Cái',
          quantity: 500,
          sampleQuantity: 32,
          passQuantity: 500,
          failQuantity: 0,
          result: 'pass',
          comment: 'Ngoại quan sáng đẹp, gioăng đáy đàn hồi tốt.',
        },
      ],
    },
    items: [
      {
        productName: 'Lõi van chia nước Ceramic Sedal Ø35mm',
        model: 'LK-SEDAL-35',
        unit: 'Cái',
        quantity: 500,
        sampleQuantity: 32,
        passQuantity: 500,
        failQuantity: 0,
        result: 'pass',
        comment: 'Ngoại quan sáng đẹp, gioăng đáy đàn hồi tốt.',
      },
    ],
  },
  {
    id: 'OQC-202610-002',
    dbId: 'qa-seed-2',
    type: 'OQC',
    product: 'Sen cây tắm đứng phím đàn Seajong SJ-8800 (60 Bộ)',
    model: 'SJ-8800',
    inspector: 'Phạm Văn Bách',
    inspectorName: 'Lê Minh Tuấn (QA)',
    department: 'Sản xuất',
    date: '30/10/2026, 10:30',
    result: 'Pass',
    rawResult: 'Đạt',
    notes: 'Lớp mạ PVD Titan Gray đồng đều, phím đàn đóng mở êm, đủ phụ kiện bảo hành.',
    poNumber: '',
    deliveryNote: '',
    metadata: {
      productionOrder: 'LSX-20261007-01',
      assemblyTeam: 'Tổ lắp ráp Sen Vòi 01',
      bomCode: 'DM-SJ8800-01',
      model: 'SJ-8800',
      batch: 'SX-2610-01',
      totalQuantity: 60,
      sampleQuantity: 20,
      passedQuantity: 60,
      failedQuantity: 0,
      items: [
        {
          productName: 'Sen cây tắm đứng phím đàn Seajong SJ-8800',
          model: 'SJ-8800',
          bomCode: 'DM-SJ8800-01',
          unit: 'Bộ',
          quantity: 60,
          sampleQuantity: 20,
          passQuantity: 60,
          failQuantity: 0,
          result: 'pass',
          comment: 'Đạt 100% tiêu chuẩn xuất xưởng.',
        },
      ],
    },
    items: [
      {
        productName: 'Sen cây tắm đứng phím đàn Seajong SJ-8800',
        model: 'SJ-8800',
        bomCode: 'DM-SJ8800-01',
        unit: 'Bộ',
        quantity: 60,
        sampleQuantity: 20,
        passQuantity: 60,
        failQuantity: 0,
        result: 'pass',
        comment: 'Đạt 100% tiêu chuẩn xuất xưởng.',
      },
    ],
  },
  {
    id: 'IQC-202610-003',
    dbId: 'qa-seed-3',
    type: 'IQC',
    product: 'Thân vòi đồng thau đúc áp lực SJ-8800-BODY (200 Cái)',
    model: 'LK-BODY-8800',
    inspector: 'Trần Minh Quân',
    inspectorName: '',
    department: 'Kho vận',
    date: '30/10/2026, 13:45',
    result: 'Pending',
    rawResult: null,
    notes: 'Yêu cầu kiểm tra kỹ bề mặt xi mạ Chrome/PVD và bước ren G1/2.',
    poNumber: 'PO-202610-089',
    deliveryNote: 'DN-BRASS-442',
    metadata: {
      poNumber: 'PO-202610-089',
      deliveryNote: 'DN-BRASS-442',
      supplierName: 'Nhà máy Đúc Đồng Cơ khí Hải Dương',
      batch: 'LOT-2610B',
      items: [
        {
          productName: 'Thân vòi đồng thau đúc áp lực SJ-8800-BODY',
          model: 'LK-BODY-8800',
          unit: 'Cái',
          quantity: 200,
          sampleQuantity: 32,
          result: 'pass',
        },
      ],
    },
    items: [
      {
        productName: 'Thân vòi đồng thau đúc áp lực SJ-8800-BODY',
        model: 'LK-BODY-8800',
        unit: 'Cái',
        quantity: 200,
        sampleQuantity: 32,
        result: 'pass',
      },
    ],
  },
  {
    id: 'OQC-202610-004',
    dbId: 'qa-seed-4',
    type: 'OQC',
    product: 'Bồn cầu thông minh Seajong Smart Luxury SJ-209S (35 Bộ)',
    model: 'SJ-209S',
    inspector: 'Phạm Văn Bách',
    inspectorName: '',
    department: 'Sản xuất',
    date: '30/10/2026, 14:20',
    result: 'Pending',
    rawResult: null,
    notes: 'Lô hàng hoàn thiện từ xưởng lắp ráp số 2 chờ kiểm định OQC trước khi nhập kho thành phẩm.',
    poNumber: '',
    deliveryNote: '',
    metadata: {
      productionOrder: 'LSX-20261007-02',
      assemblyTeam: 'Tổ lắp ráp Thiết bị Sứ & Điện tử',
      bomCode: 'DM-SJ209S-01',
      model: 'SJ-209S',
      batch: 'SX-2610-02',
      totalQuantity: 35,
      sampleQuantity: 5,
      items: [
        {
          productName: 'Bồn cầu thông minh Seajong Smart Luxury SJ-209S',
          model: 'SJ-209S',
          bomCode: 'DM-SJ209S-01',
          unit: 'Bộ',
          quantity: 35,
          sampleQuantity: 5,
          result: 'pass',
        },
      ],
    },
    items: [
      {
        productName: 'Bồn cầu thông minh Seajong Smart Luxury SJ-209S',
        model: 'SJ-209S',
        bomCode: 'DM-SJ209S-01',
        unit: 'Bộ',
        quantity: 35,
        sampleQuantity: 5,
        result: 'pass',
      },
    ],
  },
  {
    id: 'OQC-202610-005',
    dbId: 'qa-seed-5',
    type: 'OQC',
    product: 'Vòi chậu lavabo nóng lạnh Seajong Titan Gray (80 Bộ)',
    model: 'SJ-LAV-305TG',
    inspector: 'Hoàng Quốc Việt',
    inspectorName: 'Nguyễn Hoàng Nam (QA)',
    department: 'Sản xuất',
    date: '29/10/2026, 16:10',
    result: 'Partial',
    rawResult: 'Lỗi một phần',
    notes: 'Phát hiện 04 bộ rò nước nhẹ ở chân ren khi thử áp suất 6 bar, đã tách riêng chuyển xử lý lỗi.',
    poNumber: '',
    deliveryNote: '',
    metadata: {
      productionOrder: 'LSX-20261006-05',
      assemblyTeam: 'Tổ lắp ráp Sen Vòi 02',
      bomCode: 'DM-LAV305-01',
      model: 'SJ-LAV-305TG',
      batch: 'SX-2610-05',
      totalQuantity: 80,
      sampleQuantity: 20,
      passedQuantity: 76,
      failedQuantity: 4,
      items: [
        {
          productName: 'Vòi chậu lavabo nóng lạnh Seajong Titan Gray',
          model: 'SJ-LAV-305TG',
          bomCode: 'DM-LAV305-01',
          unit: 'Bộ',
          quantity: 80,
          sampleQuantity: 20,
          passQuantity: 76,
          failQuantity: 4,
          result: 'fail',
          defectDesc: 'Rò rỉ nhẹ tại khớp nối ren G1/2 khi thử áp lực nước tĩnh.',
        },
      ],
    },
    items: [
      {
        productName: 'Vòi chậu lavabo nóng lạnh Seajong Titan Gray',
        model: 'SJ-LAV-305TG',
        bomCode: 'DM-LAV305-01',
        unit: 'Bộ',
        quantity: 80,
        sampleQuantity: 20,
        passQuantity: 76,
        failQuantity: 4,
        result: 'fail',
        defectDesc: 'Rò rỉ nhẹ tại khớp nối ren G1/2 khi thử áp lực nước tĩnh.',
      },
    ],
  },
];

export const QaOverviewPage: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [filterType, setFilterType] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [inspections, setInspections] = useState<any[]>([]);
  const [qaDefects, setQaDefects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showIqcModal, setShowIqcModal] = useState(false);
  const [showOqcModal, setShowOqcModal] = useState(false);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [activeEvalItemIdx, setActiveEvalItemIdx] = useState<number | null>(null);
  const [tempEvalComment, setTempEvalComment] = useState('');
  const [tempDefectDesc, setTempDefectDesc] = useState('');
  const [tempRejectReason, setTempRejectReason] = useState('');
  const [tempRejectCategories, setTempRejectCategories] = useState<string[]>(['Loại khác']);
  const [tempRejectFiles, setTempRejectFiles] = useState<File[]>([]);

  const [iqcFormData, setIqcFormData] = useState({
    supplier: '',
    items: [] as any[],
    result: 'pass',
    rejectReason: '',
    rejectCategories: ['Loại khác'],
  });

  const [oqcFormData, setOqcFormData] = useState({
    assemblyTeam: '',
    productionOrder: '',
    bomCode: '',
    model: '',
    batch: '',
    totalQuantity: '',
    sampleQuantity: '',
    passQuantity: '',
    failQuantity: '',
    result: 'pass',
    rejectReason: '',
    rejectCategories: ['Loại khác'],
    items: [] as any[],
  });

  useEffect(() => {
    fetch('/api/company')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) setCompanyInfo(data);
      })
      .catch((err) => console.error('Error fetching company info:', err));
  }, []);

  const loadInspections = useCallback(() => {
    setLoading(true);
    fetch('/api/qa/inspections')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const formatted = data.map((d) => {
            let meta: any = null;
            if (d.metadata) {
              try {
                meta = typeof d.metadata === 'string' ? JSON.parse(d.metadata) : d.metadata;
              } catch (e) {}
            }
            return {
              id: d.code,
              dbId: d.id,
              type: d.type,
              product: d.productName || d.inventoryItem?.tenHang || 'Không xác định',
              model: d.inventoryItem?.code || '',
              inspector: d.requesterName || d.inspectorName || 'Không xác định',
              inspectorName: d.inspectorName || '',
              department: d.requesterDept || 'Khác',
              date: d.executionTime
                ? new Date(d.executionTime).toLocaleString('vi-VN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '---',
              result:
                d.status === 'Chưa thực hiện'
                  ? 'Pending'
                  : d.result === 'Đạt'
                  ? 'Pass'
                  : d.result === 'Lỗi một phần'
                  ? 'Partial'
                  : 'Fail',
              rawResult: d.result,
              notes: d.notes,
              poNumber: meta?.poNumber || meta?.purchaseOrderCode || '',
              deliveryNote: meta?.deliveryNote || '',
              metadata: meta,
              items: d.items || meta?.items || [],
            };
          });
          setInspections(formatted.length > 0 ? formatted : FALLBACK_INSPECTIONS);
        } else {
          setInspections(FALLBACK_INSPECTIONS);
        }
      })
      .catch((err) => {
        console.error('Error fetching inspections:', err);
        setInspections(FALLBACK_INSPECTIONS);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInspections();
    fetch('/api/production/defects')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setQaDefects(data);
        }
      })
      .catch(() => {});
  }, [loadInspections]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows([]);
  }, [currentStep, filterType, filterDepartment, searchQuery]);

  useEffect(() => {
    if (showOqcModal && selectedInspection && selectedInspection.metadata) {
      let items: any[] = [];
      const rawItems = selectedInspection.items || selectedInspection.metadata.items;
      if (rawItems && Array.isArray(rawItems) && rawItems.length > 0) {
        items = rawItems.map((it: any) => {
          const rawModel = it.model || it.productCode || it.code || '';
          const isBomCode =
            rawModel &&
            (rawModel.startsWith('DM-') ||
              rawModel.startsWith('BOM-') ||
              rawModel === (it.dinhMucCode || it.bomCode));
          const cleanModel = !isBomCode ? rawModel : '';
          const resolvedModel =
            cleanModel ||
            selectedInspection.inventoryItem?.code ||
            (selectedInspection.metadata.model &&
            !selectedInspection.metadata.model.startsWith('DM-') &&
            !selectedInspection.metadata.model.startsWith('BOM-') &&
            selectedInspection.metadata.model !== selectedInspection.product
              ? selectedInspection.metadata.model
              : '');

          return {
            ...it,
            productName: it.productName || it.tenHang || selectedInspection.product,
            model: resolvedModel || '',
            batch: it.batch || selectedInspection.metadata.batch || '',
            bomCode: it.bomCode || it.dinhMucCode || '',
            dinhMucCode: it.dinhMucCode || it.bomCode || '',
            dinhMucTen: it.dinhMucTen || '',
            quantity:
              it.quantity !== undefined
                ? it.quantity
                : it.soLuong !== undefined
                ? it.soLuong
                : it.missingQty || 1,
            sampleQuantity:
              it.sampleQuantity !== undefined
                ? it.sampleQuantity
                : it.quantity || it.soLuong || 1,
            passQuantity: it.passQuantity !== undefined ? it.passQuantity : '',
            failQuantity: it.failQuantity !== undefined ? it.failQuantity : '',
            comment: it.comment || '',
            defectDesc: it.defectDesc || '',
            result: it.result || 'pass',
          };
        });
      } else {
        const singleModel =
          selectedInspection.inventoryItem?.code ||
          (selectedInspection.metadata.model &&
          !selectedInspection.metadata.model.startsWith('DM-') &&
          !selectedInspection.metadata.model.startsWith('BOM-') &&
          selectedInspection.metadata.model !== selectedInspection.product
            ? selectedInspection.metadata.model
            : '');
        items = [
          {
            productName: selectedInspection.product,
            model: singleModel || '',
            batch: selectedInspection.metadata.batch || '',
            bomCode: selectedInspection.metadata.bomCode || '',
            dinhMucCode: '',
            dinhMucTen: '',
            quantity: selectedInspection.metadata.totalQuantity || 1,
            sampleQuantity:
              selectedInspection.metadata.sampleQuantity ||
              selectedInspection.metadata.totalQuantity ||
              1,
            passQuantity:
              selectedInspection.metadata.passedQuantity ??
              selectedInspection.metadata.passQuantity ??
              '',
            failQuantity:
              selectedInspection.metadata.failedQuantity ??
              selectedInspection.metadata.failQuantity ??
              '',
            comment: '',
            defectDesc: '',
            result: 'pass',
          },
        ];
      }

      const cleanOqcModel =
        selectedInspection.inventoryItem?.code ||
        (selectedInspection.metadata.model &&
        !selectedInspection.metadata.model.startsWith('DM-') &&
        !selectedInspection.metadata.model.startsWith('BOM-') &&
        selectedInspection.metadata.model !== selectedInspection.product
          ? selectedInspection.metadata.model
          : items[0]?.model || '');

      setOqcFormData((prev) => ({
        ...prev,
        assemblyTeam: selectedInspection.metadata.assemblyTeam || '',
        productionOrder: selectedInspection.metadata.productionOrder || '',
        bomCode: selectedInspection.metadata.bomCode || '',
        model: cleanOqcModel || '',
        batch: selectedInspection.metadata.batch || '',
        totalQuantity: selectedInspection.metadata.totalQuantity?.toString() || '',
        sampleQuantity: selectedInspection.metadata.sampleQuantity?.toString() || '',
        passQuantity:
          selectedInspection.metadata.passedQuantity ||
          selectedInspection.metadata.passQuantity ||
          '',
        failQuantity:
          selectedInspection.metadata.failedQuantity ||
          selectedInspection.metadata.failQuantity ||
          '',
        result: selectedInspection.result === 'Fail' ? 'fail' : 'pass',
        rejectReason: selectedInspection.notes || '',
        items,
      }));
    }
  }, [showOqcModal, selectedInspection]);

  useEffect(() => {
    if (showIqcModal && selectedInspection && selectedInspection.metadata) {
      let items: any[] = [];
      if (
        selectedInspection.metadata.items &&
        Array.isArray(selectedInspection.metadata.items)
      ) {
        items = selectedInspection.metadata.items.map((it: any) => ({
          ...it,
          model:
            it.model ||
            it.productCode ||
            it.code ||
            it.sku ||
            selectedInspection.model ||
            '',
          batch: it.batch || selectedInspection.metadata.batch || '',
          bomCode:
            it.bomCode || it.dinhMucCode || selectedInspection.metadata.bomCode || '',
          sampleQuantity: it.sampleQuantity || '',
          passQuantity: it.passQuantity ?? '',
          failQuantity: it.failQuantity ?? '',
          comment: it.comment || '',
          defectDesc: it.defectDesc || '',
          result: it.result || 'pass',
        }));
      } else {
        items = [
          {
            productName: selectedInspection.product || '',
            model:
              selectedInspection.model || selectedInspection.metadata.model || '',
            batch: selectedInspection.metadata.batch || '',
            bomCode: selectedInspection.metadata.bomCode || '',
            quantity: selectedInspection.metadata.quantity || 1,
            sampleQuantity: 1,
            passQuantity: '',
            failQuantity: '',
            comment: '',
            defectDesc: '',
            result: 'pass',
          },
        ];
      }

      setIqcFormData((prev) => ({
        ...prev,
        supplier: selectedInspection.metadata.supplierName || '',
        items,
      }));
    }
  }, [showIqcModal, selectedInspection]);

  const handleIqcChange = (e: any) => {
    const { name, value } = e.target;
    setIqcFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOqcChange = (e: any) => {
    const { name, value } = e.target;
    setOqcFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setTempRejectFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const submitRejectReason = () => {
    if (showIqcModal) {
      setIqcFormData((prev) => ({
        ...prev,
        result: 'fail',
        rejectReason: tempRejectReason || 'Không có lý do',
        rejectCategories:
          tempRejectCategories.length > 0 ? tempRejectCategories : ['Loại khác'],
      }));
    } else if (showOqcModal) {
      setOqcFormData((prev) => ({
        ...prev,
        result: 'fail',
        rejectReason: tempRejectReason || 'Không có lý do',
        rejectCategories:
          tempRejectCategories.length > 0 ? tempRejectCategories : ['Loại khác'],
      }));
    }
    setShowRejectModal(false);
  };

  const handleCategoryChange = (category: string) => {
    setTempRejectCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleSaveOqcResult = async () => {
    if (!selectedInspection) return;
    if (selectedInspection.result !== 'Pending') {
      toastError('Không thể lưu', 'Yêu cầu này đã hoàn thành, không thể lưu lại!');
      return;
    }
    const hasMismatch = oqcFormData.items.some((item) => {
      const qty = parseInt(item.quantity?.toString() || '0', 10);
      const pass = parseInt(item.passQuantity?.toString() || '0', 10);
      const fail = parseInt(item.failQuantity?.toString() || '0', 10);
      return pass + fail !== qty;
    });
    if (hasMismatch) {
      toastError(
        'Sai lệch số lượng',
        'Tổng số lượng đạt và lỗi của các mặt hàng phải bằng số lượng sản xuất!'
      );
      return;
    }
    try {
      let totalPassed = 0;
      let totalFailed = 0;
      oqcFormData.items.forEach((item) => {
        totalPassed += parseInt(item.passQuantity?.toString() || '0', 10);
        totalFailed += parseInt(item.failQuantity?.toString() || '0', 10);
      });

      let overallResult = 'Đạt';
      if (totalPassed === 0 && totalFailed > 0) overallResult = 'Không đạt';
      else if (totalFailed > 0) overallResult = 'Lỗi một phần';

      const res = await fetch(`/api/qa/inspections/${selectedInspection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: overallResult,
          notes: oqcFormData.rejectReason || '',
          passedQuantity: totalPassed,
          failedQuantity: totalFailed,
          items: oqcFormData.items,
        }),
      });
      if (res.ok) {
        toastSuccess('Thành công', 'Đã lưu kết quả kiểm định OQC!');
        setShowOqcModal(false);
        setSelectedInspection(null);
        loadInspections();
      } else {
        toastError('Lỗi', 'Lỗi khi lưu kết quả OQC');
      }
    } catch (e) {
      console.error(e);
      toastError('Lỗi hệ thống', 'Không thể kết nối máy chủ');
    }
  };

  const handleSaveIqcResult = async () => {
    if (!selectedInspection) return;
    if (selectedInspection.result !== 'Pending') {
      toastError('Không thể lưu', 'Yêu cầu này đã hoàn thành, không thể lưu lại!');
      return;
    }
    const hasMismatch = iqcFormData.items.some((item) => {
      const qty = parseInt(item.quantity?.toString() || '0', 10);
      const pass = parseInt(item.passQuantity?.toString() || '0', 10);
      const fail = parseInt(item.failQuantity?.toString() || '0', 10);
      return pass + fail !== qty;
    });
    if (hasMismatch) {
      toastError(
        'Sai lệch số lượng',
        'Tổng số lượng đạt và lỗi của các mặt hàng phải bằng số lượng giao!'
      );
      return;
    }
    try {
      let totalPassed = 0;
      let totalFailed = 0;
      iqcFormData.items.forEach((item) => {
        totalPassed += parseInt(item.passQuantity?.toString() || '0', 10);
        totalFailed += parseInt(item.failQuantity?.toString() || '0', 10);
      });

      let overallResult = 'Đạt';
      if (totalPassed === 0 && totalFailed > 0) overallResult = 'Không đạt';
      else if (totalFailed > 0) overallResult = 'Lỗi một phần';

      const res = await fetch(`/api/qa/inspections/${selectedInspection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: overallResult,
          passedQuantity: totalPassed,
          failedQuantity: totalFailed,
          items: iqcFormData.items,
        }),
      });
      if (res.ok) {
        toastSuccess('Thành công', 'Đã lưu kết quả kiểm định IQC!');
        setShowIqcModal(false);
        setSelectedInspection(null);
        loadInspections();
      } else {
        toastError('Lỗi', 'Lỗi khi lưu kết quả IQC');
      }
    } catch (e) {
      console.error(e);
      toastError('Lỗi hệ thống', 'Không thể kết nối máy chủ');
    }
  };

  const pendingInspections = useMemo(
    () => inspections.filter((ins) => ins.result === 'Pending'),
    [inspections]
  );

  const completedInspections = useMemo(
    () => inspections.filter((ins) => ins.result !== 'Pending'),
    [inspections]
  );

  const steps: ModernStepItem[] = useMemo(
    () => [
      {
        num: 1,
        id: 'requests',
        title: 'Danh sách yêu cầu',
        desc: 'Các phiếu yêu cầu kiểm định chờ thực hiện',
        icon: 'bi-clipboard-data',
        badge: `${pendingInspections.length} phiếu`,
        badgeVariant: 'warning',
      },
      {
        num: 2,
        id: 'completed',
        title: 'Đã hoàn thành',
        desc: 'Các phiếu kiểm định đã hoàn tất đánh giá',
        icon: 'bi-clipboard-check',
        badge: `${completedInspections.length} phiếu`,
        badgeVariant: 'success',
      },
    ],
    [pendingInspections.length, completedInspections.length]
  );

  const qcTickerItems: TickerItem[] = useMemo(() => {
    const total = inspections.length;
    const iqcTotal = inspections.filter((i) => i.type === 'IQC').length;
    const oqcTotal = inspections.filter((i) => i.type === 'OQC').length;
    const pendingTotal = pendingInspections.length;
    const pendingIqc = pendingInspections.filter((i) => i.type === 'IQC').length;
    const pendingOqc = pendingInspections.filter((i) => i.type === 'OQC').length;
    const completedTotal = completedInspections.length;
    const passCount = completedInspections.filter((i) => i.result === 'Pass').length;
    const partialCount = completedInspections.filter((i) => i.result === 'Partial').length;
    const failCount = completedInspections.filter((i) => i.result === 'Fail').length;
    const passRate =
      completedTotal > 0 ? Math.round((passCount / completedTotal) * 100) : 100;

    const latestPending = pendingInspections[0] || inspections[0];
    const latestCompleted = completedInspections[0];

    const qaOnlyDefects = qaDefects.filter(
      (d) => (d.reporterDepartment || '').toLowerCase() === 'qa'
    );
    const defectList = qaOnlyDefects.length > 0 ? qaOnlyDefects : qaDefects;
    const pendingDefects = defectList.filter((d) => d.status !== 'COMPLETED').length;
    const resolvedDefects = defectList.filter((d) => d.status === 'COMPLETED').length;

    const items: TickerItem[] = [
      {
        badge: 'YÊU CẦU KIỂM ĐỊNH',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
        text: `Đang có <strong>${pendingTotal} phiếu yêu cầu</strong> chờ kiểm định chất lượng — Phân loại: <strong>${pendingIqc} phiếu IQC</strong> &amp; <strong>${pendingOqc} phiếu OQC</strong>${
          latestPending
            ? ` • Phiếu chờ mới nhất: <strong>${latestPending.id}</strong> từ <strong>${latestPending.department}</strong>`
            : ''
        }`,
      },
      {
        badge: 'KẾT QUẢ THẨM ĐỊNH',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
        text: `Đã hoàn thành <strong>${completedTotal}/${total} phiếu kiểm định</strong> — Đạt chuẩn QC: <strong>${passCount} phiếu</strong>, Tỷ lệ đạt: <strong>${passRate}%</strong> • Lỗi một phần: <strong>${partialCount} phiếu</strong> • Không đạt: <strong>${failCount} phiếu</strong>`,
      },
      {
        badge: 'THỐNG KÊ IQC & OQC',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
        text: `Tổng hợp toàn bộ phận QC: <strong>${iqcTotal} phiếu IQC</strong> kiểm định vật tư đầu vào &amp; <strong>${oqcTotal} phiếu OQC</strong> kiểm định thành phẩm xuất xưởng${
          latestCompleted
            ? ` • Hoàn thành gần nhất: <strong>${latestCompleted.id}</strong> do <strong>${latestCompleted.inspector}</strong> yêu cầu`
            : ''
        }`,
      },
      {
        badge: 'HỒ SƠ HÀNG LỖI QC',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        text: `Theo dõi xử lý hàng lỗi: <strong>${defectList.length} hồ sơ lỗi</strong> được ghi nhận — Đang chờ xử lý: <strong>${pendingDefects} hồ sơ</strong> • Đã xử lý hoàn tất: <strong>${resolvedDefects} hồ sơ</strong>`,
      },
    ];

    return items;
  }, [inspections, pendingInspections, completedInspections, qaDefects]);

  const filteredInspections = inspections.filter((ins) => {
    if (currentStep === 1 && ins.result !== 'Pending') return false;
    if (currentStep === 2 && ins.result === 'Pending') return false;
    if (filterType !== 'ALL' && ins.type !== filterType) return false;
    if (filterDepartment === 'MUA_HANG' && !ins.department.includes('Mua hàng'))
      return false;
    if (filterDepartment === 'SAN_XUAT' && !ins.department.includes('Sản xuất'))
      return false;
    if (filterDepartment === 'KHO' && !ins.department.includes('Kho vận')) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = ins.id?.toLowerCase().includes(q);
      const matchInspector = ins.inspector?.toLowerCase().includes(q);
      const matchProduct = ins.product?.toLowerCase().includes(q);
      const matchPo = ins.poNumber?.toLowerCase().includes(q);
      const matchProdOrder = ins.metadata?.productionOrder?.toLowerCase().includes(q);
      const matchDefect = ins.metadata?.defectCode?.toLowerCase().includes(q);
      const matchSupplier = ins.metadata?.supplierName?.toLowerCase().includes(q);
      if (
        !matchId &&
        !matchInspector &&
        !matchProduct &&
        !matchPo &&
        !matchProdOrder &&
        !matchDefect &&
        !matchSupplier
      ) {
        return false;
      }
    }
    return true;
  });

  const paginatedInspections = filteredInspections.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const renderTypeBadge = (type: string) => {
    const isIQC = type === 'IQC';
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
          isIQC
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-sky-50 text-sky-700 border-sky-200'
        }`}
      >
        {type}
      </span>
    );
  };

  const getStatusText = (result: string) => {
    switch (result) {
      case 'Pending':
        return 'Chưa thực hiện';
      case 'Pass':
        return 'Đạt chuẩn QC';
      case 'Partial':
        return 'Lỗi một phần';
      case 'Fail':
        return 'Không đạt';
      default:
        return 'Đã hoàn thành';
    }
  };

  const renderStatusBadge = (result: string) => {
    if (result === 'Pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Chưa thực hiện
        </span>
      );
    }
    if (result === 'Pass') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Đạt chuẩn QC
        </span>
      );
    }
    if (result === 'Partial') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-sky-50 text-sky-700 border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Lỗi một phần
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-rose-50 text-rose-700 border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Không đạt
      </span>
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(filteredInspections.map((i) => i.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((r) => r !== id));
    }
  };

  const executeBulkDelete = async () => {
    try {
      let failedCount = 0;
      for (const id of selectedRows) {
        const res = await fetch(`/api/qa/inspections/${id}`, { method: 'DELETE' });
        if (!res.ok) failedCount++;
      }

      if (failedCount > 0) {
        toastError('Lỗi xóa', `Xóa thất bại ${failedCount} phiếu`);
      } else {
        toastSuccess('Thành công', `Đã xoá ${selectedRows.length} phiếu kiểm định`);
        setSelectedRows([]);
      }
      setShowBulkDeleteConfirm(false);
      loadInspections();
    } catch (e) {
      toastError('Lỗi hệ thống', 'Có lỗi xảy ra khi xoá');
      setShowBulkDeleteConfirm(false);
    }
  };

  return (
    <StepPage
      title="Đảm bảo chất lượng"
      description="Kiểm tra chất lượng vật tư đầu vào, thành phẩm đầu ra, tiêu chuẩn và kiểm soát lỗi"
      color="blue"
      icon="bi-patch-check"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      customTickerNews={qcTickerItems}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <TableToolbar
          filters={[
            {
              id: 'qa-dept-filter',
              value: filterDepartment,
              onChange: setFilterDepartment,
              minWidth: '165px',
              options: [
                { label: 'Tất cả bộ phận', value: 'ALL' },
                { label: 'Mua hàng', value: 'MUA_HANG' },
                { label: 'Sản xuất', value: 'SAN_XUAT' },
                { label: 'Kho vận', value: 'KHO' },
              ],
            },
            {
              id: 'qa-type-filter',
              value: filterType,
              onChange: setFilterType,
              minWidth: '165px',
              options: [
                { label: 'Tất cả phân loại', value: 'ALL' },
                { label: 'IQC', value: 'IQC' },
                { label: 'OQC', value: 'OQC' },
              ],
            },
          ]}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm kiếm mã phiếu, tài liệu tham chiếu, người yêu cầu..."
          searchMinWidth="260px"
          rightActions={
            selectedRows.length > 0 ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<Trash size={14} />}
                onClick={() => setShowBulkDeleteConfirm(true)}
              >
                Xoá ({selectedRows.length})
              </Button>
            ) : undefined
          }
          onRefresh={loadInspections}
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
              onClick: loadInspections,
            },
          ]}
        />

        <FullWidthTable loading={loading}>
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50/95 border-b border-slate-200/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4 w-11 text-center">
                <input
                  type="checkbox"
                  className="form-check-input cursor-pointer"
                  checked={
                    filteredInspections.length > 0 &&
                    selectedRows.length === filteredInspections.length
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th className="py-3 px-4 w-[280px]">Mã phiếu kiểm định</th>
              <th className="py-3 px-4">Tài liệu tham chiếu</th>
              <th className="py-3 px-4 w-[260px]">Người yêu cầu</th>
              <th className="py-3 px-4 w-[180px]">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedInspections.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <i className="bi bi-clipboard2-check text-3xl text-slate-300" />
                    <span className="text-xs font-medium">
                      {currentStep === 1
                        ? 'Chưa có phiếu yêu cầu kiểm định nào đang chờ xử lý'
                        : 'Chưa có phiếu kiểm định nào đã hoàn thành'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedInspections.map((row) => {
                const isIQC = row.type === 'IQC';
                const poCode =
                  row.poNumber ||
                  row.metadata?.purchaseOrderCode ||
                  row.metadata?.poNumber ||
                  '';
                const prodCode =
                  row.metadata?.productionOrder ||
                  row.metadata?.productionOrderCode ||
                  row.metadata?.customerOrderCode ||
                  '';

                let docTitle = '';
                if (isIQC) {
                  docTitle = poCode
                    ? `Đơn mua hàng ${poCode}`
                    : row.product.startsWith('Đơn hàng')
                    ? row.product
                    : `Đơn mua vật tư`;
                } else if (row.metadata?.defectCode) {
                  docTitle = `Hồ sơ lỗi ${row.metadata.defectCode}`;
                } else {
                  docTitle = prodCode
                    ? `Lệnh sản xuất ${prodCode}`
                    : row.metadata?.bomCode
                    ? `Lệnh sản xuất ${row.metadata.bomCode}`
                    : 'Lệnh sản xuất';
                }

                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedInspection(row)}
                    className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                  >
                    <td
                      className="py-3 px-4 text-center align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input cursor-pointer"
                        checked={selectedRows.includes(row.id)}
                        onChange={(e) => handleSelectRow(row.id, e)}
                      />
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 group-hover:text-sky-600 transition-colors font-mono text-[13px]">
                          {row.id}
                        </span>
                        {renderTypeBadge(row.type)}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-700 text-[13px]">
                          {docTitle}
                        </span>
                        {row.metadata?.supplierName && (
                          <span className="text-[11px] text-slate-500 truncate max-w-[320px]">
                            NCC: {row.metadata.supplierName}
                          </span>
                        )}
                        {row.metadata?.assemblyTeam && (
                          <span className="text-[11px] text-slate-500 truncate max-w-[320px]">
                            {row.metadata.assemblyTeam}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800 text-[13px]">
                          {row.inspector}
                        </span>
                        <span className="text-[11.5px] text-slate-500">
                          {row.department}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle text-slate-600 text-xs font-mono">
                      {row.date}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </FullWidthTable>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredInspections.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="phiếu kiểm định"
        />
      </div>

      {/* ── 1. OFFCANVAS CHI TIẾT YÊU CẦU KIỂM ĐỊNH (400px) ── */}
      <Offcanvas
        isOpen={Boolean(selectedInspection && !showIqcModal && !showOqcModal)}
        onClose={() => setSelectedInspection(null)}
        title="Chi tiết yêu cầu kiểm định"
        description={selectedInspection?.id || ''}
        icon={<ClipboardCheck size={20} />}
        width="400px"
        footer={
          selectedInspection ? (
            <div className="flex items-center justify-between w-full gap-2">
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="!px-2.5"
                onClick={() => setShowDeleteConfirm(true)}
                title="Xóa phiếu kiểm định"
                aria-label="Xóa phiếu kiểm định"
              >
                <Trash size={15} />
              </Button>
              <div className="flex items-center gap-2">
                {selectedInspection.result !== 'Pending' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<FileEarmarkText size={14} />}
                    onClick={() => {
                      if (selectedInspection.type === 'IQC') setShowIqcModal(true);
                      else setShowOqcModal(true);
                    }}
                  >
                    Xem biên bản
                  </Button>
                )}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle size={14} />}
                  disabled={selectedInspection.result !== 'Pending'}
                  onClick={() => {
                    if (selectedInspection.type === 'IQC') setShowIqcModal(true);
                    else setShowOqcModal(true);
                  }}
                >
                  Thực hiện kiểm định
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {selectedInspection && (
          <div className="flex flex-col gap-3.5 text-slate-800">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Mã phiếu QC
                </div>
                <div className="text-base font-bold text-sky-700 font-mono mt-0.5">
                  {selectedInspection.id}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {renderStatusBadge(selectedInspection.result)}
                {renderTypeBadge(selectedInspection.type)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-white overflow-hidden">
              <div className="p-3">
                <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                  <i className="bi bi-person text-slate-400" />
                  Người yêu cầu & Bộ phận
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {selectedInspection.inspector}
                </div>
                <div className="text-[11.5px] text-slate-500 mt-0.5">
                  {selectedInspection.department}
                </div>
              </div>

              <div className="p-3">
                <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                  <i className="bi bi-calendar-event text-slate-400" />
                  Thời gian thực hiện
                </div>
                <div className="text-xs font-semibold text-slate-800 font-mono">
                  {selectedInspection.date}
                </div>
              </div>

              {selectedInspection.type === 'IQC' && (
                <>
                  <div className="p-3">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                      <i className="bi bi-truck text-slate-400" />
                      Nhà cung cấp
                    </div>
                    <div className="text-xs font-semibold text-slate-800">
                      {selectedInspection.metadata?.supplierName || '---'}
                    </div>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 mb-0.5">
                        Số đơn mua
                      </div>
                      <div className="text-xs font-bold text-slate-800 font-mono">
                        {selectedInspection.poNumber || '---'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-500 mb-0.5">
                        Số phiếu giao hàng
                      </div>
                      <div className="text-xs font-bold text-slate-800 font-mono">
                        {selectedInspection.deliveryNote || '---'}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedInspection.type === 'OQC' && (
                <>
                  <div className="p-3">
                    <div className="text-[11px] font-semibold text-slate-500 mb-0.5">
                      Lệnh sản xuất
                    </div>
                    <div className="text-xs font-bold text-slate-800 font-mono">
                      {selectedInspection.metadata?.productionOrder || '---'}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[11px] font-semibold text-slate-500 mb-0.5 flex items-center gap-1.5">
                      <i className="bi bi-people text-slate-400" />
                      Ca / Tổ lắp ráp
                    </div>
                    <div className="text-xs font-semibold text-slate-800">
                      {selectedInspection.metadata?.assemblyTeam || '---'}
                    </div>
                  </div>
                </>
              )}

              <div className="p-3">
                <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <i className="bi bi-box-seam text-slate-400" />
                    Danh sách sản phẩm kiểm tra
                  </span>
                  {selectedInspection.items && selectedInspection.items.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10.5px] font-semibold">
                      {selectedInspection.items.length} mặt hàng
                    </span>
                  )}
                </div>

                {selectedInspection.items && selectedInspection.items.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {selectedInspection.items.map((it: any, idx: number) => {
                      const dmCode = it.dinhMucCode || it.bomCode;
                      const dmTen = it.dinhMucTen || it.ghiChuDinhMuc;
                      const qty = it.soLuong || it.quantity || it.missingQty;
                      const passQty = it.passQuantity;
                      const failQty = it.failQuantity;
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col gap-1 ${
                            idx > 0 ? 'pt-2 border-t border-slate-100' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {it.tenHang || it.productName || it.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {qty && (
                                <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold">
                                  SL: {qty} {it.donVi || it.unit || 'bộ'}
                                </span>
                              )}
                            </div>
                          </div>
                          {(passQty !== undefined && passQty !== '') ||
                          (failQty !== undefined && failQty !== '' && Number(failQty) > 0) ? (
                            <div className="flex items-center gap-2 text-[11px]">
                              {passQty !== undefined && passQty !== '' && (
                                <span className="text-emerald-700 font-semibold">
                                  Đạt: {passQty}
                                </span>
                              )}
                              {failQty !== undefined && failQty !== '' && Number(failQty) > 0 && (
                                <span className="text-rose-600 font-semibold">
                                  Lỗi: {failQty}
                                </span>
                              )}
                            </div>
                          ) : null}
                          {(dmCode || dmTen) && (
                            <div className="flex items-center flex-wrap gap-1.5">
                              {dmCode && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                  <i className="bi bi-diagram-3 mr-1" />
                                  {dmCode}
                                </span>
                              )}
                              {dmTen && (
                                <span className="text-[11px] text-slate-500">
                                  {dmTen}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedInspection.product}
                    </div>
                    {selectedInspection.model && (
                      <div className="text-[11.5px] text-slate-500 mt-0.5">
                        Mã SP: {selectedInspection.model}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── 2. MODAL BIÊN BẢN ĐÁNH GIÁ CHẤT LƯỢNG ĐẦU VÀO (IQC) ── */}
      {showIqcModal && selectedInspection && (
        <div className="fixed inset-0 z-[1300] bg-slate-900/50 backdrop-blur-xs flex flex-col">
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-sky-600" />
              <h6 className="font-bold text-slate-800 text-sm m-0">
                Biên bản đánh giá chất lượng hàng nhập kho (IQC) — {selectedInspection.id}
              </h6>
            </div>
            <button
              type="button"
              onClick={() => setShowIqcModal(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer border-0 bg-transparent"
            >
              <i className="bi bi-x-lg text-xs" />
            </button>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-slate-100">
            {/* Left Panel */}
            <div className="w-full xl:w-[400px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
              <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Thông tin biên bản IQC
                </div>
                <Input
                  label="Nhà cung cấp"
                  name="supplier"
                  value={iqcFormData.supplier}
                  onChange={handleIqcChange}
                  disabled={selectedInspection?.result !== 'Pending'}
                />

                <div className="pt-2 border-t border-slate-200">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Chi tiết vật tư kiểm định
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="p-2 text-left">Tên vật tư / Mã SP / Lô</th>
                          <th className="p-2 text-center w-[72px]">Giao / Mẫu</th>
                          <th className="p-2 text-center w-[72px]">Đạt / Lỗi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {iqcFormData.items.map((item, idx) => (
                          <tr key={idx} className="align-top">
                            <td
                              className="p-2 cursor-pointer hover:bg-slate-50"
                              onClick={() => {
                                setActiveEvalItemIdx(idx);
                                setTempEvalComment(item.comment || '');
                                setTempDefectDesc(item.defectDesc || '');
                              }}
                              title="Nhấp để nhận xét / đánh giá QC"
                            >
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="font-bold text-sky-700 text-[11.5px] leading-snug">
                                  {idx + 1}. {item.productName}
                                </span>
                                {item.comment || item.defectDesc ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9.5px] font-semibold shrink-0">
                                    Đã ghi chú
                                  </span>
                                ) : (
                                  <PencilSquare size={12} className="text-slate-400 shrink-0" />
                                )}
                              </div>
                              <input
                                type="text"
                                className="w-full px-2 py-1 mb-1 text-[11px] border border-slate-200 rounded bg-white"
                                placeholder="Mã SP (Model/SKU)"
                                value={item.model || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const newItems = [...iqcFormData.items];
                                  newItems[idx].model = e.target.value;
                                  setIqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                              <input
                                type="text"
                                className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white"
                                placeholder="Mã số lô (Batch)"
                                value={item.batch || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const newItems = [...iqcFormData.items];
                                  newItems[idx].batch = e.target.value;
                                  setIqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className="w-full px-1.5 py-1 mb-1 text-[11px] text-center border border-slate-200 rounded"
                                placeholder="Giao(N)"
                                value={item.quantity ?? ''}
                                onChange={(e) => {
                                  const newItems = [...iqcFormData.items];
                                  newItems[idx].quantity = e.target.value;
                                  setIqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                              <input
                                type="number"
                                className="w-full px-1.5 py-1 text-[11px] text-center border border-slate-200 rounded"
                                placeholder="Mẫu(n)"
                                value={item.sampleQuantity ?? ''}
                                onChange={(e) => {
                                  const newItems = [...iqcFormData.items];
                                  newItems[idx].sampleQuantity = e.target.value;
                                  setIqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className="w-full px-1.5 py-1 mb-1 text-[11px] text-center font-bold text-emerald-700 border border-slate-200 rounded"
                                placeholder="Đạt"
                                value={item.passQuantity ?? ''}
                                onChange={(e) => {
                                  const newItems = [...iqcFormData.items];
                                  newItems[idx].passQuantity = e.target.value;
                                  setIqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                              <input
                                type="number"
                                className="w-full px-1.5 py-1 text-[11px] text-center font-bold text-rose-600 border border-slate-200 rounded"
                                placeholder="Lỗi"
                                value={item.failQuantity ?? ''}
                                onChange={(e) => {
                                  const newItems = [...iqcFormData.items];
                                  newItems[idx].failQuantity = e.target.value;
                                  setIqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowIqcModal(false);
                    setSelectedInspection(null);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  leftIcon={<Printer size={14} />}
                  onClick={() =>
                    printDocumentById(
                      'iqc-preview-doc',
                      'portrait',
                      'IQC-' + selectedInspection.id
                    )
                  }
                >
                  In biên bản
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  leftIcon={<Floppy size={14} />}
                  onClick={handleSaveIqcResult}
                  disabled={
                    selectedInspection?.result !== 'Pending' ||
                    iqcFormData.items.some((item) => {
                      const qty = parseInt(item.quantity?.toString() || '0', 10);
                      const pass = parseInt(item.passQuantity?.toString() || '0', 10);
                      const fail = parseInt(item.failQuantity?.toString() || '0', 10);
                      return pass + fail !== qty;
                    })
                  }
                >
                  Lưu kết quả
                </Button>
              </div>
            </div>

            {/* Right Panel - A4 Preview */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar">
              <div
                id="iqc-preview-doc"
                className="bg-white shadow-sm border border-slate-300 mx-auto relative"
                style={{
                  width: '21cm',
                  minHeight: '29.7cm',
                  padding: '1.5cm 2cm',
                  color: 'black',
                  fontFamily: "'Roboto Condensed', sans-serif",
                }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    {companyInfo?.logoUrl && (
                      <img
                        src={companyInfo.logoUrl}
                        alt="Logo"
                        style={{ height: '40px', objectFit: 'contain' }}
                      />
                    )}
                    <div>
                      <div className="font-bold uppercase" style={{ fontSize: '10pt' }}>
                        {companyInfo?.name || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
                      </div>
                      <div style={{ fontSize: '9pt' }}>
                        Địa chỉ:{' '}
                        {companyInfo?.address || 'Đường số 3, KCN Yên Phong, Bắc Ninh'}
                      </div>
                      <div style={{ fontSize: '9pt' }}>
                        SĐT: {companyInfo?.phone || '0222.368.6868'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right" style={{ fontSize: '10.5pt' }}>
                    <div>
                      Số phiếu: <span className="font-bold">{selectedInspection.id}</span>
                    </div>
                    <div className="italic">Ngày lập: {selectedInspection.date}</div>
                  </div>
                </div>

                <div className="mb-6 text-center">
                  <h4
                    className="font-bold uppercase mb-1"
                    style={{ fontSize: '15pt' }}
                  >
                    BIÊN BẢN KIỂM TRA CHẤT LƯỢNG HÀNG NHẬP KHO (IQC)
                  </h4>
                  <div className="font-bold" style={{ fontSize: '10.5pt' }}>
                    Bộ phận thực hiện: ĐẢM BẢO CHẤT LƯỢNG (QA/QC)
                  </div>
                </div>

                <div className="mb-4" style={{ fontSize: '10.5pt', lineHeight: 1.7 }}>
                  <div className="font-bold uppercase mb-2">I. THÔNG TIN CHUNG</div>
                  <div className="mb-1">
                    Nhà cung cấp:{' '}
                    <span className="font-bold uppercase">{iqcFormData.supplier}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      Đơn mua hàng (PO No.):{' '}
                      <span className="font-bold">{selectedInspection.poNumber || '---'}</span>
                    </div>
                    <div>
                      Số phiếu giao hàng:{' '}
                      <span className="font-bold">
                        {selectedInspection.deliveryNote || '---'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <div
                    className="font-bold uppercase mb-2"
                    style={{ fontSize: '10.5pt' }}
                  >
                    II. DANH SÁCH ĐỐI TƯỢNG KIỂM TRA & ĐÁNH GIÁ
                  </div>
                  <table
                    className="w-full border-collapse text-center"
                    style={{ fontSize: '9.5pt', border: '1px solid #000' }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9' }}>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '6%' }}>
                          STT
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '34%' }}>
                          Tên vật tư / Linh kiện
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '16%' }}>
                          Mã SP (SKU)
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '14%' }}>
                          Số lô (Batch)
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '10%' }}>
                          SL giao
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '10%' }}>
                          SL Đạt
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '10%' }}>
                          SL Lỗi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {iqcFormData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #000', padding: '6px' }}>
                            {idx + 1}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000',
                              padding: '6px',
                              textAlign: 'left',
                            }}
                          >
                            <div className="font-bold">{item.productName}</div>
                            {item.comment && (
                              <div className="italic text-slate-700 mt-0.5">
                                Nhận xét: {item.comment}
                              </div>
                            )}
                            {item.defectDesc && (
                              <div className="italic text-rose-700 mt-0.5">
                                Mô tả lỗi: {item.defectDesc}
                              </div>
                            )}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '6px' }}>
                            {item.model}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '6px' }}>
                            {item.batch}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000',
                              padding: '6px',
                              fontWeight: 700,
                            }}
                          >
                            {item.quantity}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000',
                              padding: '6px',
                              fontWeight: 700,
                              color: '#15803d',
                            }}
                          >
                            {item.passQuantity}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000',
                              padding: '6px',
                              fontWeight: 700,
                              color: '#dc2626',
                            }}
                          >
                            {item.failQuantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 text-center mt-12 pt-4">
                  <div>
                    <div className="font-bold uppercase">Bộ phận Mua hàng</div>
                    <div className="italic" style={{ fontSize: '9.5pt' }}>
                      (Ký và ghi rõ họ tên)
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">Bộ phận Quản lý Chất lượng</div>
                    <div className="italic" style={{ fontSize: '9.5pt' }}>
                      (Ký và ghi rõ họ tên)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. MODAL BIÊN BẢN ĐÁNH GIÁ CHẤT LƯỢNG ĐẦU RA (OQC) ── */}
      {showOqcModal && selectedInspection && (
        <div className="fixed inset-0 z-[1300] bg-slate-900/50 backdrop-blur-xs flex flex-col">
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-sky-600" />
              <h6 className="font-bold text-slate-800 text-sm m-0">
                Biên bản đánh giá chất lượng thành phẩm (OQC) — {selectedInspection.id}
              </h6>
            </div>
            <button
              type="button"
              onClick={() => setShowOqcModal(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer border-0 bg-transparent"
            >
              <i className="bi bi-x-lg text-xs" />
            </button>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-slate-100">
            {/* Left Panel */}
            <div className="w-full xl:w-[400px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
              <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3.5">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Thông tin biên bản OQC
                </div>
                <Input
                  label="Tổ lắp ráp / Ca sản xuất"
                  name="assemblyTeam"
                  value={oqcFormData.assemblyTeam}
                  onChange={handleOqcChange}
                  disabled={selectedInspection?.result !== 'Pending'}
                />
                <Input
                  label="Lệnh sản xuất"
                  name="productionOrder"
                  value={oqcFormData.productionOrder}
                  onChange={handleOqcChange}
                  disabled={selectedInspection?.result !== 'Pending'}
                />

                <div className="pt-2 border-t border-slate-200">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Chi tiết thành phẩm kiểm định
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="p-2 text-left">Tên thành phẩm / Định mức</th>
                          <th className="p-2 text-center w-[72px]">SL / Mẫu</th>
                          <th className="p-2 text-center w-[72px]">Đạt / Lỗi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {oqcFormData.items.map((item: any, idx: number) => (
                          <tr key={idx} className="align-top">
                            <td
                              className="p-2 cursor-pointer hover:bg-slate-50"
                              onClick={() => {
                                setActiveEvalItemIdx(idx);
                                setTempEvalComment(item.comment || '');
                                setTempDefectDesc(item.defectDesc || '');
                              }}
                              title="Nhấp để nhận xét / đánh giá QC"
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-sky-700 text-[11.5px] leading-snug">
                                  {idx + 1}. {item.productName || item.tenHang}
                                </span>
                                {item.comment || item.defectDesc ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9.5px] font-semibold shrink-0">
                                    Đã ghi chú
                                  </span>
                                ) : (
                                  <PencilSquare size={12} className="text-slate-400 shrink-0" />
                                )}
                              </div>
                              {(item.dinhMucCode || item.dinhMucTen) && (
                                <div className="mb-1 text-[10px] text-indigo-700 font-semibold">
                                  {item.dinhMucCode ? `[${item.dinhMucCode}] ` : ''}
                                  {item.dinhMucTen || ''}
                                </div>
                              )}
                              <input
                                type="text"
                                className="w-full px-2 py-1 mb-1 text-[11px] border border-slate-200 rounded bg-white"
                                placeholder="Mã SP (Model/SKU)"
                                value={item.model || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const newItems = [...oqcFormData.items];
                                  newItems[idx].model = e.target.value;
                                  setOqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                              <input
                                type="text"
                                className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white"
                                placeholder="Mã số lô (Batch)"
                                value={item.batch || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const newItems = [...oqcFormData.items];
                                  newItems[idx].batch = e.target.value;
                                  setOqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className="w-full px-1.5 py-1 mb-1 text-[11px] text-center border border-slate-200 rounded"
                                placeholder="SL (N)"
                                value={item.quantity ?? ''}
                                onChange={(e) => {
                                  const newItems = [...oqcFormData.items];
                                  newItems[idx].quantity = e.target.value;
                                  setOqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                              <input
                                type="number"
                                className="w-full px-1.5 py-1 text-[11px] text-center border border-slate-200 rounded"
                                placeholder="Mẫu(n)"
                                value={item.sampleQuantity ?? ''}
                                onChange={(e) => {
                                  const newItems = [...oqcFormData.items];
                                  newItems[idx].sampleQuantity = e.target.value;
                                  setOqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className="w-full px-1.5 py-1 mb-1 text-[11px] text-center font-bold text-emerald-700 border border-slate-200 rounded"
                                placeholder="Đạt"
                                value={item.passQuantity ?? ''}
                                onChange={(e) => {
                                  const newItems = [...oqcFormData.items];
                                  newItems[idx].passQuantity = e.target.value;
                                  setOqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                              <input
                                type="number"
                                className="w-full px-1.5 py-1 text-[11px] text-center font-bold text-rose-600 border border-slate-200 rounded"
                                placeholder="Lỗi"
                                value={item.failQuantity ?? ''}
                                onChange={(e) => {
                                  const newItems = [...oqcFormData.items];
                                  newItems[idx].failQuantity = e.target.value;
                                  setOqcFormData((prev) => ({ ...prev, items: newItems }));
                                }}
                                disabled={selectedInspection?.result !== 'Pending'}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowOqcModal(false);
                    setSelectedInspection(null);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  leftIcon={<Printer size={14} />}
                  onClick={() =>
                    printDocumentById(
                      'oqc-preview-doc',
                      'portrait',
                      'OQC-' + selectedInspection.id
                    )
                  }
                >
                  In biên bản
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  leftIcon={<Floppy size={14} />}
                  onClick={handleSaveOqcResult}
                  disabled={
                    selectedInspection?.result !== 'Pending' ||
                    oqcFormData.items.some((item: any) => {
                      const qty = parseInt(item.quantity?.toString() || '0', 10);
                      const pass = parseInt(item.passQuantity?.toString() || '0', 10);
                      const fail = parseInt(item.failQuantity?.toString() || '0', 10);
                      return pass + fail !== qty;
                    })
                  }
                >
                  Lưu kết quả
                </Button>
              </div>
            </div>

            {/* Right Panel - A4 Preview */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar">
              <div
                id="oqc-preview-doc"
                className="bg-white shadow-sm border border-slate-300 mx-auto relative"
                style={{
                  width: '21cm',
                  minHeight: '29.7cm',
                  padding: '1.5cm 2cm',
                  color: 'black',
                  fontFamily: "'Roboto Condensed', sans-serif",
                }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    {companyInfo?.logoUrl && (
                      <img
                        src={companyInfo.logoUrl}
                        alt="Logo"
                        style={{ height: '40px', objectFit: 'contain' }}
                      />
                    )}
                    <div>
                      <div className="font-bold uppercase" style={{ fontSize: '10pt' }}>
                        {companyInfo?.name || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
                      </div>
                      <div style={{ fontSize: '9pt' }}>
                        Địa chỉ:{' '}
                        {companyInfo?.address || 'Đường số 3, KCN Yên Phong, Bắc Ninh'}
                      </div>
                      <div style={{ fontSize: '9pt' }}>
                        SĐT: {companyInfo?.phone || '0222.368.6868'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right" style={{ fontSize: '10.5pt' }}>
                    <div>
                      Số phiếu: <span className="font-bold">{selectedInspection.id}</span>
                    </div>
                    <div className="italic">Ngày lập: {selectedInspection.date}</div>
                  </div>
                </div>

                <div className="mb-6 text-center">
                  <h4
                    className="font-bold uppercase mb-1"
                    style={{ fontSize: '15pt' }}
                  >
                    BIÊN BẢN KIỂM TRA CHẤT LƯỢNG THÀNH PHẨM SẢN XUẤT (OQC)
                  </h4>
                  <div className="font-bold" style={{ fontSize: '10.5pt' }}>
                    Bộ phận thực hiện: KIỂM SOÁT CHẤT LƯỢNG ĐẦU RA (OQC)
                  </div>
                </div>

                <div className="mb-4" style={{ fontSize: '10.5pt', lineHeight: 1.7 }}>
                  <div className="font-bold uppercase mb-2">I. THÔNG TIN CHUNG</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      Tổ lắp ráp / Ca sản xuất:{' '}
                      <span className="font-bold">{oqcFormData.assemblyTeam || '---'}</span>
                    </div>
                    <div>
                      Lệnh sản xuất:{' '}
                      <span className="font-bold">
                        {oqcFormData.productionOrder || '---'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <div
                    className="font-bold uppercase mb-2"
                    style={{ fontSize: '10.5pt' }}
                  >
                    II. DANH SÁCH THÀNH PHẨM KIỂM ĐỊNH & KẾT LUẬN
                  </div>
                  <table
                    className="w-full border-collapse text-center"
                    style={{ fontSize: '9.5pt', border: '1px solid #000' }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9' }}>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '6%' }}>
                          STT
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '34%' }}>
                          Tên thành phẩm / Sản phẩm
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '16%' }}>
                          Mã SP (Model)
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '14%' }}>
                          Số lô (Batch)
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '10%' }}>
                          SL SX
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '10%' }}>
                          SL Đạt
                        </th>
                        <th style={{ border: '1px solid #000', padding: '6px', width: '10%' }}>
                          SL Lỗi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {oqcFormData.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #000', padding: '6px' }}>
                            {idx + 1}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000',
                              padding: '6px',
                              textAlign: 'left',
                            }}
                          >
                            <div className="font-bold">
                              {item.productName || item.tenHang}
                            </div>
                            {item.comment && (
                              <div className="italic text-slate-700 mt-0.5">
                                Nhận xét: {item.comment}
                              </div>
                            )}
                            {item.defectDesc && (
                              <div className="italic text-rose-700 mt-0.5">
                                Mô tả lỗi: {item.defectDesc}
                              </div>
                            )}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '6px' }}>
                            {item.model}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '6px' }}>
                            {item.batch}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000',
                              padding: '6px',
                              fontWeight: 700,
                            }}
                          >
                            {item.quantity}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000',
                              padding: '6px',
                              fontWeight: 700,
                              color: '#15803d',
                            }}
                          >
                            {item.passQuantity}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000',
                              padding: '6px',
                              fontWeight: 700,
                              color: '#dc2626',
                            }}
                          >
                            {item.failQuantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 text-center mt-12 pt-4">
                  <div>
                    <div className="font-bold uppercase">Bộ phận Sản xuất</div>
                    <div className="italic" style={{ fontSize: '9.5pt' }}>
                      (Ký và ghi rõ họ tên)
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">Bộ phận Quản lý Chất lượng</div>
                    <div className="italic" style={{ fontSize: '9.5pt' }}>
                      (Ký và ghi rõ họ tên)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. OFFCANVAS ĐÁNH GIÁ CHẤT LƯỢNG TỪNG MẶT HÀNG (400px) ── */}
      <Offcanvas
        isOpen={activeEvalItemIdx !== null}
        onClose={() => setActiveEvalItemIdx(null)}
        title={
          showOqcModal
            ? 'Đánh giá chất lượng thành phẩm'
            : 'Đánh giá chất lượng vật tư'
        }
        description="Ghi nhận nhận xét của QC và mô tả lỗi phát hiện"
        icon={<PencilSquare size={18} />}
        width="400px"
        zIndex={1500}
        confirmText="Cập nhật"
        cancelText="Đóng"
        onCancel={() => setActiveEvalItemIdx(null)}
        confirmDisabled={selectedInspection?.result !== 'Pending'}
        onConfirm={() => {
          if (activeEvalItemIdx === null) return;
          if (showOqcModal) {
            const newItems = [...oqcFormData.items];
            const isFailed =
              parseInt(newItems[activeEvalItemIdx]?.failQuantity?.toString() || '0', 10) > 0;
            newItems[activeEvalItemIdx] = {
              ...newItems[activeEvalItemIdx],
              comment: tempEvalComment,
              defectDesc: tempDefectDesc,
              result: isFailed ? 'fail' : 'pass',
            };
            setOqcFormData((prev) => ({ ...prev, items: newItems }));
          } else {
            const newItems = [...iqcFormData.items];
            const isFailed =
              parseInt(newItems[activeEvalItemIdx]?.failQuantity?.toString() || '0', 10) > 0;
            newItems[activeEvalItemIdx] = {
              ...newItems[activeEvalItemIdx],
              comment: tempEvalComment,
              defectDesc: tempDefectDesc,
              result: isFailed ? 'fail' : 'pass',
            };
            setIqcFormData((prev) => ({ ...prev, items: newItems }));
          }
          setActiveEvalItemIdx(null);
        }}
      >
        {activeEvalItemIdx !== null && (
          <div className="flex flex-col gap-3.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-semibold text-slate-500">
                {showOqcModal ? 'Tên sản phẩm / Thành phẩm' : 'Tên vật tư / Linh kiện'}
              </div>
              <div className="text-xs font-bold text-sky-700 mt-0.5">
                {showOqcModal
                  ? oqcFormData.items[activeEvalItemIdx]?.productName ||
                    oqcFormData.items[activeEvalItemIdx]?.tenHang
                  : iqcFormData.items[activeEvalItemIdx]?.productName}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Mã SP:{' '}
                <strong className="text-slate-700">
                  {(showOqcModal
                    ? oqcFormData.items[activeEvalItemIdx]?.model
                    : iqcFormData.items[activeEvalItemIdx]?.model) || '---'}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nhận xét, đánh giá của QC
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-sky-600"
                placeholder="Nhập nhận xét chi tiết về ngoại quan, thông số kỹ thuật..."
                value={tempEvalComment}
                onChange={(e) => setTempEvalComment(e.target.value)}
                disabled={selectedInspection?.result !== 'Pending'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mô tả các lỗi phát hiện (nếu có)
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-sky-600"
                placeholder="Mô tả chi tiết lỗi bề mặt, kích thước ren, áp lực nước..."
                value={tempDefectDesc}
                onChange={(e) => setTempDefectDesc(e.target.value)}
                disabled={selectedInspection?.result !== 'Pending'}
              />
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── 5. OFFCANVAS LÝ DO KHÔNG ĐẠT (400px) ── */}
      <Offcanvas
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Lý do không đạt chuẩn"
        description={selectedInspection?.id || ''}
        icon={<ExclamationTriangle size={18} />}
        width="400px"
        zIndex={1500}
        confirmText="Xác nhận"
        cancelText="Hủy"
        onCancel={() => setShowRejectModal(false)}
        onConfirm={submitRejectReason}
      >
        <div className="flex flex-col gap-3.5">
          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã phiếu:</span>
              <span className="font-bold text-slate-800">{selectedInspection?.id}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 shrink-0">Sản phẩm:</span>
              <span className="font-bold text-slate-800 text-right">
                {selectedInspection?.product}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Phân loại nhóm lỗi
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['Lỗi linh kiện', 'Lỗi kỹ thuật lắp ráp', 'Lỗi bề mặt', 'Loại khác'].map(
                (cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 text-xs cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={tempRejectCategories.includes(cat)}
                      onChange={() => handleCategoryChange(cat)}
                    />
                    <span>{cat}</span>
                  </label>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chi tiết lý do không đạt
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-sky-600"
              placeholder="Ví dụ: Bề mặt mạ PVD bị xước dài 3mm..."
              value={tempRejectReason}
              onChange={(e) => setTempRejectReason(e.target.value)}
            />
          </div>

          <div>
            <input
              type="file"
              id="qa-reject-attachments"
              className="hidden"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
            <label
              htmlFor="qa-reject-attachments"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <i className="bi bi-paperclip" />
              Đính kèm hình ảnh / video ({tempRejectFiles.length})
            </label>
          </div>
        </div>
      </Offcanvas>

      {/* ── 6. CONFIRM DIALOGS ── */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Xác nhận xóa phiếu kiểm định"
        message={
          <div>
            Bạn có chắc chắn muốn xóa phiếu kiểm tra{' '}
            <strong>{selectedInspection?.id}</strong> này không?
            <br />
            Hành động này không thể hoàn tác.
          </div>
        }
        confirmLabel="Xóa phiếu"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={async () => {
          try {
            const res = await fetch(`/api/qa/inspections/${selectedInspection?.id}`, {
              method: 'DELETE',
            });
            if (res.ok) {
              toastSuccess('Đã xóa', 'Đã xóa phiếu kiểm tra chất lượng');
              setInspections((prev) =>
                prev.filter((i) => i.id !== selectedInspection?.id)
              );
              setSelectedInspection(null);
              setShowDeleteConfirm(false);
            } else {
              toastError('Lỗi', 'Lỗi khi xóa phiếu kiểm tra');
            }
          } catch (e) {
            toastError('Lỗi kết nối', 'Không thể kết nối máy chủ khi xóa');
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        title="Xác nhận xóa hàng loạt"
        message={`Bạn có chắc chắn muốn xoá ${selectedRows.length} phiếu kiểm định đã chọn?`}
        confirmLabel="Xác nhận xoá"
        cancelLabel="Huỷ"
        variant="danger"
        onConfirm={executeBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />

      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StepPage>
  );
};

export default QaOverviewPage;

