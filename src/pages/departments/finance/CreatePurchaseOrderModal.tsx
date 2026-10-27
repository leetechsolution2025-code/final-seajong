import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Cart3,
  BoxSeam,
  FileEarmarkText,
  CreditCard,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { Select } from '../../../components/common/Select';
import type { PurchaseRequisitionItem, PurchaseOrderItem } from './ProcurementView';
import { PrintPreviewModal } from './PrintPreviewModal';

export interface SupplierOption {
  id: string;
  name: string;
  code: string;
  phone: string;
  defaultPaymentTerm: string;
  category: string;
}

export const SUPPLIERS_LIST: SupplierOption[] = [
  {
    id: 'SUP-001',
    code: 'NCC-001',
    name: 'Công ty TNHH Gỗ Minh Long',
    phone: '1900 636 668',
    defaultPaymentTerm: 'Công nợ 30 ngày',
    category: 'Ván MDF, HDF & Bề mặt Laminate',
  },
  {
    id: 'SUP-002',
    code: 'NCC-002',
    name: 'Công ty TNHH Phụ Kiện Cửa Việt',
    phone: '024 3862 8899',
    defaultPaymentTerm: 'Công nợ 30 ngày',
    category: 'Khóa cơ, Bản lề inox & Gioăng giảm chấn',
  },
  {
    id: 'SUP-003',
    code: 'NCC-003',
    name: 'Công ty TNHH Gỗ Plywood Nam Việt',
    phone: '024 3788 5656',
    defaultPaymentTerm: 'Công nợ 30 ngày',
    category: 'Ván dán Plywood chịu nước làm xương',
  },
  {
    id: 'SUP-004',
    code: 'NCC-004',
    name: 'Công ty CP Cách nhiệt Đông Á',
    phone: '024 3999 1234',
    defaultPaymentTerm: 'Thanh toán khi nhận hàng',
    category: 'Xốp EPS cách nhiệt cách âm ruột cánh',
  },
  {
    id: 'SUP-005',
    code: 'NCC-005',
    name: 'Công ty Hóa chất & Keo dán Tiến Phát',
    phone: '028 3811 5566',
    defaultPaymentTerm: 'Công nợ 30 ngày',
    category: 'Keo sữa 2TP ép ván & Keo hạt PUR',
  },
  {
    id: 'SUP-006',
    code: 'NCC-006',
    name: 'Công ty Bao bì Carton Thăng Long',
    phone: '024 3688 9900',
    defaultPaymentTerm: 'Công nợ 15 ngày',
    category: 'Bọc góc U, L, màng PE & thùng carton',
  },
  {
    id: 'SUP-007',
    code: 'NCC-007',
    name: 'Công ty Kim khí & Vật tư Phụ Việt',
    phone: '024 3555 8899',
    defaultPaymentTerm: 'Thanh toán tiền mặt',
    category: 'Đinh ghim F15/U10 & phụ tư phụ',
  },
  {
    id: 'SUP-008',
    code: 'NCC-008',
    name: 'Công ty Pallet Gỗ Miền Bắc',
    phone: '024 3777 6655',
    defaultPaymentTerm: 'Thanh toán khi nhận hàng',
    category: 'Pallet gỗ hun trùng kê xuất xưởng',
  },
  {
    id: 'SUP-009',
    code: 'NCC-009',
    name: 'Công ty Cổ phần Gỗ An Cường',
    phone: '028 3862 5726',
    defaultPaymentTerm: 'Công nợ 30 ngày',
    category: 'Ván gỗ công nghiệp & Melamine',
  },
  {
    id: 'SUP-010',
    code: 'NCC-010',
    name: 'Công ty TNHH Hafele Việt Nam',
    phone: '1800 1797',
    defaultPaymentTerm: 'Thanh toán 50% trước',
    category: 'Phụ kiện kim khí cao cấp',
  },
];

export interface OrderItemLine {
  id: string;
  reqId: string;
  reqCode: string;
  productName: string;
  spec?: string;
  unit: string;
  actualQuantity?: number; // Số lượng thực tế từ yêu cầu
  quantity: number; // Số lượng đặt mua = làm tròn lên(Số lượng thực tế * Hệ số)
  coefficient?: number; // Hệ số nhân (mặc định 1)
  coefficientInput?: string; // Chuỗi nhập hệ số hỗ trợ cả dấu , và .
  unitPrice: number; // số nguyên
  totalPrice: number; // số nguyên
  supplierId: string;
  supplierName: string;
  deliveryDate: string;
  note?: string;
}

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRequisitions: PurchaseRequisitionItem[];
  onConfirmOrders: (newOrders: PurchaseOrderItem[], processedReqIds: string[]) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

// Chuyển đổi định dạng ngày dd/mm/yyyy sang yyyy-mm-dd cho input type="date"
export const toDateInputValue = (val?: string): string => {
  if (!val) return '';
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  return '';
};

// Chuyển đổi yyyy-mm-dd sang dd/mm/yyyy hiển thị chuẩn Việt Nam
export const toDisplayDate = (val?: string): string => {
  if (!val) return '';
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return trimmed;
};

// Tách tên hàng hoá và nội dung quy cách trong ngoặc đơn (..)
export const extractNameAndSpec = (rawName?: string) => {
  if (!rawName) return { name: '', spec: '' };
  const trimmed = rawName.trim();
  const match = trimmed.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (match && match[1].trim() && match[2].trim()) {
    return {
      name: match[1].trim(),
      spec: match[2].trim(),
    };
  }
  return {
    name: trimmed,
    spec: '',
  };
};

// Loại bỏ nội dung trong ngoặc đơn (...) của tên nhà cung cấp, chỉ giữ lại tên thuần tuý
export const cleanSupplierName = (name?: string): string => {
  if (!name) return '';
  return name.replace(/\s*\([^)]*\)/g, '').trim();
};

// Hàm gợi ý nhà cung cấp phù hợp theo tên hàng hoá
const guessSupplierForItem = (productName: string, suppliersList: SupplierOption[]): SupplierOption => {
  const p = productName.toLowerCase();
  const findByKeyword = (kw: string) =>
    suppliersList.find((s) => s.name.toLowerCase().includes(kw.toLowerCase()));

  if (p.includes('plywood') || p.includes('xương')) {
    const s = findByKeyword('Plywood') || findByKeyword('Nam Việt');
    if (s) return s;
  }
  if (p.includes('laminate') || p.includes('mdf') || p.includes('backer') || p.includes('minh long')) {
    const s = findByKeyword('Minh Long');
    if (s) return s;
  }
  if (p.includes('bản lề') || p.includes('khóa') || p.includes('ron') || p.includes('gioăng') || p.includes('phụ kiện')) {
    const s = findByKeyword('Phụ Kiện Cửa Việt') || findByKeyword('Cửa Việt');
    if (s) return s;
  }
  if (p.includes('xốp') || p.includes('eps') || p.includes('cách nhiệt')) {
    const s = findByKeyword('Đông Á') || findByKeyword('Cách nhiệt');
    if (s) return s;
  }
  if (p.includes('keo')) {
    const s = findByKeyword('Tiến Phát');
    if (s) return s;
  }
  if (p.includes('carton') || p.includes('bọc góc') || p.includes('màng pe') || p.includes('đai')) {
    const s = findByKeyword('Thăng Long') || findByKeyword('Bao bì');
    if (s) return s;
  }
  if (p.includes('đinh') || p.includes('kim khí')) {
    const s = findByKeyword('Kim khí') || findByKeyword('Phụ Việt');
    if (s) return s;
  }
  if (p.includes('pallet')) {
    const s = findByKeyword('Pallet') || findByKeyword('Miền Bắc');
    if (s) return s;
  }
  return suppliersList[0] || SUPPLIERS_LIST[0];
};

const parsePriceToNumber = (strPrice?: string): number => {
  if (!strPrice) return 0;
  const cleaned = strPrice.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
};

export const formatNumberGroup = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/[^\d]/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
};

const formatVND = (num: number): string => {
  return num.toLocaleString('vi-VN') + ' đ';
};

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  selectedRequisitions,
  onConfirmOrders,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'preview'>('items');
  const [lines, setLines] = useState<OrderItemLine[]>([]);
  const [poNotes, setPoNotes] = useState<Record<string, string>>({});
  const [poPaymentTerms, setPoPaymentTerms] = useState<Record<string, string>>({});
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [dbSuppliers, setDbSuppliers] = useState<SupplierOption[]>([]);

  // Tải danh sách nhà cung cấp từ CSDL thực tế (/api/suppliers)
  useEffect(() => {
    let isMounted = true;
    const fetchSuppliers = async () => {
      try {
        const res = await fetch('/api/suppliers');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: SupplierOption[] = data.map((d: any) => ({
              id: d.id,
              code: d.code || '',
              name: cleanSupplierName(d.name),
              phone: d.phone || '',
              defaultPaymentTerm: 'Công nợ 30 ngày',
              category: Array.isArray(d.categories)
                ? d.categories.join(', ')
                : typeof d.categories === 'string'
                ? d.categories
                : '',
            }));
            if (isMounted) {
              setDbSuppliers(mapped);
            }
            return;
          }
        }
      } catch (err) {
        console.error('Lỗi tải danh mục nhà cung cấp:', err);
      }
    };
    fetchSuppliers();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeSuppliers = useMemo(() => {
    if (dbSuppliers.length > 0) return dbSuppliers;
    return SUPPLIERS_LIST.map((s) => ({
      ...s,
      name: cleanSupplierName(s.name),
    }));
  }, [dbSuppliers]);

  // Khởi tạo danh sách hàng hoá từ các yêu cầu mua hàng đã chọn
  useEffect(() => {
    if (!isOpen || selectedRequisitions.length === 0) return;

    const initialLines: OrderItemLine[] = [];
    selectedRequisitions.forEach((req) => {
      if (req.items && req.items.length > 0) {
        req.items.forEach((item: any, itemIdx) => {
          const rawItemName = item.name || item.itemName || 'Hàng hoá / Vật tư';
          const { name: cleanName, spec: extractedSpec } = extractNameAndSpec(rawItemName);
          // Ghi chú dưới tên hàng hoá: bỏ ghi chú hiện tại, thay bằng nội dung trong (..) cạnh tên
          const finalSpec = extractedSpec;

          const supp =
            (item.suggestedSupplier
              ? activeSuppliers.find(
                  (s) =>
                    s.name.toLowerCase().includes(item.suggestedSupplier.toLowerCase()) ||
                    item.suggestedSupplier.toLowerCase().includes(s.name.toLowerCase())
                )
              : null) || guessSupplierForItem(rawItemName, activeSuppliers);

          const uPrice = Number(item.unitPrice) || parsePriceToNumber(item.estimatedPrice) || 0;
          const initialQty = Number(item.quantity !== undefined ? item.quantity : item.requestedQty || 1) || 1;
          const tPrice =
            uPrice > 0
              ? uPrice * initialQty
              : Number(item.estimatedAmount) || parsePriceToNumber(item.totalPrice) || 0;

          initialLines.push({
            id: `${req.id}-${item.id || itemIdx}`,
            reqId: req.id,
            reqCode: req.code,
            productName: cleanName,
            spec: finalSpec,
            unit: item.unit || 'bộ',
            actualQuantity: initialQty,
            quantity: initialQty,
            coefficient: 1,
            coefficientInput: '1',
            unitPrice: uPrice,
            totalPrice: tPrice,
            supplierId: supp.id,
            supplierName: cleanSupplierName(supp.name),
            deliveryDate: req.requiredDate || '18/11/2026',
            note: finalSpec || item.note || req.reason,
          });
        });
      } else {
        // Dự phòng nếu yêu cầu không có mảng items chi tiết
        const { name: cleanReason, spec: extractedReasonSpec } = extractNameAndSpec(req.reason);
        const supp = guessSupplierForItem(req.reason, activeSuppliers);
        const estCostNum = parsePriceToNumber(req.estimatedCost);
        initialLines.push({
          id: `${req.id}-default`,
          reqId: req.id,
          reqCode: req.code,
          productName: cleanReason,
          spec: extractedReasonSpec,
          unit: 'lô',
          actualQuantity: 1,
          quantity: 1,
          coefficient: 1,
          coefficientInput: '1',
          unitPrice: estCostNum,
          totalPrice: estCostNum,
          supplierId: supp.id,
          supplierName: cleanSupplierName(supp.name),
          deliveryDate: req.requiredDate || '08/10/2026',
          note: req.reason,
        });
      }
    });

    setLines(initialLines);
    setActiveTab('items');
    setSelectedSupplierId('all');
  }, [isOpen, selectedRequisitions, activeSuppliers]);

  // Cập nhật nhà cung cấp cho 1 dòng hàng
  const handleSupplierChange = (lineId: string, supplierId: string) => {
    const supp = activeSuppliers.find((s) => s.id === supplierId);
    if (!supp) return;
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? { ...l, supplierId: supp.id, supplierName: cleanSupplierName(supp.name) }
          : l
      )
    );
  };

  // Cập nhật số lượng (số lượng thực tế) -> tính toán lại số lượng = làm tròn lên(thực tế * hệ số)
  const handleQuantityChange = (lineId: string, newQty: number) => {
    const validQty = Math.max(0, newQty || 0);
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const coef = l.coefficient !== undefined ? l.coefficient : 1;
        const calcQty = coef > 0 ? Math.ceil(validQty * coef) : validQty;
        const totalP = Math.round(calcQty * l.unitPrice);
        return {
          ...l,
          actualQuantity: validQty,
          quantity: calcQty,
          totalPrice: totalP,
        };
      })
    );
  };

  // Cập nhật hệ số: cho phép nhập cả dấu phẩy ',' và dấu chấm '.' làm số thập phân
  const handleCoefficientInputChange = (lineId: string, rawVal: string) => {
    // Chỉ giữ lại số, dấu phẩy và dấu chấm
    let sanitized = rawVal.replace(/[^\d.,]/g, '');

    // Nếu có nhiều hơn 1 dấu thập phân, chỉ giữ dấu đầu tiên
    const firstSepMatch = sanitized.match(/[.,]/);
    if (firstSepMatch && firstSepMatch.index !== undefined) {
      const idx = firstSepMatch.index;
      const sep = sanitized[idx];
      const before = sanitized.slice(0, idx);
      const after = sanitized.slice(idx + 1).replace(/[.,]/g, '');
      sanitized = `${before}${sep}${after}`;
    }

    // Giá trị số để tính toán: chuyển dấu phẩy sang dấu chấm
    const normalizedStr = sanitized.replace(',', '.');
    const parsedNum = parseFloat(normalizedStr);
    const validCoef = isNaN(parsedNum) ? 0 : parsedNum;

    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const actual = l.actualQuantity !== undefined ? l.actualQuantity : l.quantity;
        // Giá trị số lượng = số lượng thực tế nhân với hệ số, làm tròn lên không lấy số thập phân
        const calcQty = validCoef > 0 ? Math.ceil(actual * validCoef) : 0;
        const totalP = Math.round(calcQty * l.unitPrice);
        return {
          ...l,
          actualQuantity: actual,
          coefficient: validCoef,
          coefficientInput: sanitized,
          quantity: calcQty,
          totalPrice: totalP,
        };
      })
    );
  };

  // Cập nhật đơn giá
  const handlePriceChange = (lineId: string, newPrice: number) => {
    const validPrice = Math.max(0, newPrice || 0);
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const totalP = Math.round(l.quantity * validPrice);
        return { ...l, unitPrice: validPrice, totalPrice: totalP };
      })
    );
  };

  // Cập nhật ngày nhận hàng
  const handleDeliveryDateChange = (lineId: string, newDate: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, deliveryDate: newDate } : l))
    );
  };

  // Nhóm các dòng hàng theo Nhà cung cấp
  const groupedOrders = useMemo(() => {
    const map = new Map<string, { supplier: SupplierOption; lines: OrderItemLine[]; total: number }>();

    lines.forEach((line) => {
      const supp = activeSuppliers.find((s) => s.id === line.supplierId) || {
        id: line.supplierId,
        name: cleanSupplierName(line.supplierName) || 'Nhà cung cấp',
        code: 'NCC-000',
        phone: '1900 0000',
        defaultPaymentTerm: 'Công nợ 30 ngày',
        category: 'Vật tư tổng hợp',
      };

      if (!map.has(supp.id)) {
        map.set(supp.id, {
          supplier: supp,
          lines: [],
          total: 0,
        });
      }

      const group = map.get(supp.id)!;
      group.lines.push(line);
      group.total += line.totalPrice;
    });

    return Array.from(map.values());
  }, [lines, activeSuppliers]);

  // Nhóm nhà cung cấp được chọn (nếu chọn cụ thể)
  const currentSelectedGroup = useMemo(() => {
    if (selectedSupplierId === 'all') return null;
    return groupedOrders.find((g) => g.supplier.id === selectedSupplierId) || null;
  }, [selectedSupplierId, groupedOrders]);

  // Các nhóm đơn sẽ tạo (tất cả hoặc 1 NCC cụ thể)
  const targetGroupsToCreate = useMemo(() => {
    if (currentSelectedGroup) return [currentSelectedGroup];
    return groupedOrders;
  }, [currentSelectedGroup, groupedOrders]);

  // Danh sách dòng hàng hiển thị (lọc theo NCC nếu chọn)
  const displayLines = useMemo(() => {
    if (selectedSupplierId === 'all') return lines;
    return lines.filter((l) => l.supplierId === selectedSupplierId);
  }, [lines, selectedSupplierId]);

  // Tổng giá trị tất cả đơn
  const totalAmountAll = useMemo(() => {
    return lines.reduce((acc, l) => acc + l.totalPrice, 0);
  }, [lines]);

  // Giá trị hiển thị theo bộ lọc
  const currentTotalAmount = useMemo(() => {
    if (currentSelectedGroup) return currentSelectedGroup.total;
    return totalAmountAll;
  }, [currentSelectedGroup, totalAmountAll]);

  // Xác nhận tạo các đơn mua hàng (PO)
  const handleConfirmCreatePOs = () => {
    if (targetGroupsToCreate.length === 0) {
      if (onShowToast) onShowToast('warning', 'Chưa có mặt hàng', 'Không có mặt hàng nào để lập đơn mua hàng.');
      return;
    }

    const now = new Date();
    const createdOrders: PurchaseOrderItem[] = targetGroupsToCreate.map((group, idx) => {
      const poNum = String(Date.now()).slice(-3) + String(idx + 1);
      const deliveryDates = group.lines.map((l) => l.deliveryDate).filter(Boolean);
      const chosenDeliveryDate = deliveryDates[0] || '10/10/2026';
      const reqCodes = Array.from(new Set(group.lines.map((l) => l.reqCode))).join(', ');

      return {
        id: `PO-${Date.now()}-${idx}`,
        code: `PO-2026-${poNum}`,
        supplierName: group.supplier.name,
        orderDate: now.toLocaleDateString('vi-VN'),
        deliveryDate: chosenDeliveryDate,
        totalAmount: formatVND(group.total),
        status: 'waiting_delivery',
        statusLabel: 'Chờ giao hàng',
        requester: 'Bộ phận Mua sắm',
        note: poNotes[group.supplier.id] || `Đơn tạo từ yêu cầu: ${reqCodes}. Điều khoản: ${poPaymentTerms[group.supplier.id] || group.supplier.defaultPaymentTerm}`,
      };
    });

    const processedLineIds = new Set(targetGroupsToCreate.flatMap((g) => g.lines.map((l) => l.id)));
    const processedReqIds = Array.from(new Set(targetGroupsToCreate.flatMap((g) => g.lines.map((l) => l.reqId))));

    onConfirmOrders(createdOrders, processedReqIds);

    const remainingLines = lines.filter((l) => !processedLineIds.has(l.id));

    if (remainingLines.length === 0 || selectedSupplierId === 'all') {
      if (onShowToast) {
        onShowToast(
          'success',
          'Lập đơn mua hàng thành công',
          `Đã tạo thành công ${createdOrders.length} đơn đặt hàng (PO).`
        );
      }
      onClose();
    } else {
      setLines(remainingLines);
      setSelectedSupplierId('all');
      if (onShowToast) {
        onShowToast(
          'success',
          'Đã tạo đơn mua hàng',
          `Đã tạo đơn ${createdOrders[0].code} cho ${createdOrders[0].supplierName}. Còn ${remainingLines.length} mặt hàng của các nhà cung cấp khác.`
        );
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        backgroundColor: 'var(--bg-surface-1)',
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        animation: 'fade-in 0.2s ease-out',
      }}
    >
      <style>{`
        .no-calendar-picker-icon::-webkit-calendar-picker-indicator {
          display: none !important;
          -webkit-appearance: none !important;
        }
        .supplier-filter-select .form-group {
          margin-bottom: 0 !important;
          margin-top: 0 !important;
        }
        .supplier-filter-select .select-container {
          height: 38px !important;
        }
        .supplier-filter-select .form-select {
          height: 38px !important;
          font-size: 0.8125rem !important;
          font-weight: 600 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          display: flex !important;
          align-items: center !important;
        }
      `}</style>
      {/* ========================================================= */}
      {/* 1. TOP APP BAR (HEADER FULLSCREEN)                        */}
      {/* ========================================================= */}
      <div
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md, 8px)',
              backgroundColor: 'var(--color-primary-light, rgba(37, 99, 235, 0.1))',
              color: 'var(--color-primary, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Cart3 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2
                style={{
                  fontSize: '1.1875rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Lập đơn mua hàng từ nhà cung cấp
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-primary-light, rgba(37, 99, 235, 0.1))',
                  color: 'var(--color-primary, #2563eb)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {selectedRequisitions.length} yêu cầu mua hàng
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, marginTop: '2px' }}>
              Phân bổ vật tư theo từng nhà cung cấp, kiểm tra đơn giá chào hàng và khởi tạo các đơn đặt hàng (PO)
            </p>
          </div>
        </div>

        {/* Nút đóng */}
        <button
          onClick={onClose}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface-1)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          title="Đóng cửa sổ"
        >
          <X size={20} />
        </button>
      </div>

      {/* ========================================================= */}
      {/* 2. STATS VÀ TAB SELECTOR BAR                              */}
      {/* ========================================================= */}
      <div
        style={{
          padding: '14px 24px',
          backgroundColor: 'var(--bg-surface-1)',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          flexShrink: 0,
        }}
      >
        {/* Quick summary badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <BoxSeam size={18} style={{ color: 'var(--color-primary, #2563eb)' }} />
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Mặt hàng cần mua</div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                {selectedSupplierId === 'all'
                  ? `${formatNumberGroup(lines.length)} mặt hàng`
                  : `${formatNumberGroup(displayLines.length)} / ${formatNumberGroup(lines.length)} mặt hàng`}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <CreditCard size={18} style={{ color: '#10b981' }} />
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Tổng giá trị dự kiến</div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#10b981' }}>
                {formatVND(currentTotalAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* BÊN PHẢI: DROPLIST NHÀ CUNG CẤP VÀ NÚT TẠO ĐƠN MUA HÀNG */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="supplier-filter-select" style={{ minWidth: '240px', maxWidth: '340px' }}>
            <Select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              options={[
                { value: 'all', label: 'Tất cả nhà cung cấp' },
                ...groupedOrders.map((group) => ({
                  value: group.supplier.id,
                  label: cleanSupplierName(group.supplier.name),
                })),
              ]}
            />
          </div>

          <Button
            variant="primary"
            leftIcon={<FileEarmarkText size={15} />}
            onClick={() => setIsPrintModalOpen(true)}
            style={{
              height: '38px',
              padding: '0 18px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          >
            Tạo đơn mua hàng
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MAIN CONTENT (BODY SCROLLABLE)                         */}
      {/* ========================================================= */}
      <div
        className="custom-scrollbar"
        style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          padding: '20px 24px',
          backgroundColor: 'var(--bg-surface-1)',
        }}
      >
        {activeTab === 'items' ? (
          /* TAB 1: BẢNG PHÂN BỔ MẶT HÀNG CHO CÁC NHÀ CUNG CẤP */
          <div>
            <div
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg, 10px)',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-surface-1)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              }}
            >
              <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ width: '50px', textAlign: 'center', padding: '10px 8px', fontSize: '0.75rem', fontWeight: 700 }}>STT</th>
                    <th style={{ width: '130px', maxWidth: '140px', textAlign: 'left', padding: '10px 8px', fontSize: '0.75rem', fontWeight: 700 }}>Mã yêu cầu</th>
                    <th style={{ minWidth: '240px', textAlign: 'left', padding: '10px 8px', fontSize: '0.75rem', fontWeight: 700 }}>Hàng hoá và Quy cách</th>
                    <th style={{ width: '180px', textAlign: 'center', padding: '10px 8px', fontSize: '0.75rem', fontWeight: 700 }}>Số lượng</th>
                    <th style={{ minWidth: '250px', textAlign: 'left', padding: '10px 8px', fontSize: '0.75rem', fontWeight: 700 }}>Nhà cung cấp lựa chọn</th>
                    <th style={{ width: '150px', textAlign: 'right', padding: '10px 8px', fontSize: '0.75rem', fontWeight: 700 }}>Đơn giá (đ)</th>
                    <th style={{ width: '160px', textAlign: 'right', padding: '10px 8px', fontSize: '0.75rem', fontWeight: 700 }}>Thành tiền (đ)</th>
                    <th style={{ width: '130px', textAlign: 'center', padding: '10px 8px', fontSize: '0.75rem', fontWeight: 700 }}>Ngày nhận hàng</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLines.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>

                    {/* Mã yêu cầu (áp dụng truncate khi mặt hàng thuộc nhiều yêu cầu mua hàng khác nhau) */}
                    <td style={{ padding: '12px 8px', maxWidth: '140px' }}>
                      <span
                        title={item.reqCode}
                        style={{
                          fontFamily: "'Roboto Condensed', sans-serif",
                          fontWeight: 700,
                          color: 'var(--color-primary, #2563eb)',
                          fontSize: '0.875rem',
                          display: 'block',
                          maxWidth: '130px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        {item.reqCode}
                      </span>
                    </td>

                    {/* Tên hàng hoá và quy cách */}
                    <td style={{ padding: '12px' }}>
                      {(() => {
                        const parsed = extractNameAndSpec(item.productName);
                        const displayName = parsed.name || item.productName;
                        const displaySpec = parsed.spec || item.spec;
                        return (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                              {displayName}
                            </div>
                            {displaySpec ? (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {displaySpec}
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </td>

                    {/* Số lượng */}
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        {/* Ô nhập số lượng kèm đơn vị ở cuối ô */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-surface-2)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            width: '92px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <input
                            type="text"
                            value={formatNumberGroup(item.quantity)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d]/g, '');
                              handleQuantityChange(item.id, parseInt(raw, 10) || 0);
                            }}
                            style={{
                              width: '100%',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              fontSize: '0.8125rem',
                              outline: 'none',
                              paddingRight: '4px',
                            }}
                          />
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {item.unit}
                          </span>
                        </div>

                        {/* Ô nhập hệ số sát với ô số lượng, mặc định 1, hỗ trợ cả dấu ',' và '.' làm số thập phân */}
                        <div
                          title="Hệ số nhân (hỗ trợ nhập số thập phân với dấu ',' hoặc '.')"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-surface-2)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '6px',
                            padding: '4px 6px',
                            width: '48px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <input
                            type="text"
                            value={item.coefficientInput ?? (item.coefficient !== undefined ? String(item.coefficient) : '1')}
                            onChange={(e) => handleCoefficientInputChange(item.id, e.target.value)}
                            onBlur={() => {
                              if (!item.coefficientInput || item.coefficient === 0) {
                                handleCoefficientInputChange(item.id, '1');
                              }
                            }}
                            placeholder="1"
                            style={{
                              width: '100%',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'center',
                              fontWeight: 700,
                              color: 'var(--color-primary, #2563eb)',
                              fontSize: '0.8125rem',
                              outline: 'none',
                              padding: 0,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Chọn nhà cung cấp sử dụng component Select, không có icon */}
                    <td style={{ padding: '10px 8px' }}>
                      <Select
                        value={item.supplierId}
                        onChange={(e) => handleSupplierChange(item.id, e.target.value)}
                        options={activeSuppliers.map((supp) => ({
                          value: supp.id,
                          label: cleanSupplierName(supp.name),
                        }))}
                      />
                    </td>

                    {/* Đơn giá */}
                    <td style={{ textAlign: 'right', padding: '12px' }}>
                      <input
                        type="text"
                        value={formatNumberGroup(item.unitPrice)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d]/g, '');
                          handlePriceChange(item.id, parseInt(raw, 10) || 0);
                        }}
                        style={{
                          width: '120px',
                          textAlign: 'right',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface-2)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      />
                    </td>

                    {/* Thành tiền */}
                    <td style={{ textAlign: 'right', padding: '12px', fontWeight: 700, color: 'var(--color-primary, #2563eb)' }}>
                      {formatVND(item.totalPrice)}
                    </td>

                    {/* Ngày nhận hàng (nhấn vào có thể thay đổi ngày, không có icon) */}
                    <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                      <input
                        type="date"
                        value={toDateInputValue(item.deliveryDate)}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker?.();
                          } catch {}
                        }}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleDeliveryDateChange(item.id, toDisplayDate(e.target.value));
                          }
                        }}
                        className="no-calendar-picker-icon"
                        title="Nhấn để thay đổi ngày nhận hàng"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface-2)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          textAlign: 'center',
                          cursor: 'pointer',
                          outline: 'none',
                          width: '116px',
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
          /* TAB 2: XEM TRƯỚC VÀ HIỆU CHỈNH CÁC ĐƠN ĐẶT HÀNG (PO) THEO NCC */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                borderRadius: 'var(--radius-md, 8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: 'var(--color-primary, #2563eb)' }}>
                {currentSelectedGroup ? (
                  <>
                    Đang xem trước và lập đơn PO cho nhà cung cấp:{' '}
                    <strong>{cleanSupplierName(currentSelectedGroup.supplier.name)}</strong> ({currentSelectedGroup.lines.length} mặt hàng)
                  </>
                ) : (
                  <>
                    Hệ thống tự động gom các mặt hàng đã chọn thành <strong>{groupedOrders.length} đơn đặt hàng mua (PO)</strong> tương ứng với từng nhà cung cấp.
                  </>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-primary, #2563eb)' }}>
                Tổng cộng: {formatVND(currentTotalAmount)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '18px' }}>
              {targetGroupsToCreate.map((group, gIdx) => (
                <div
                  key={group.supplier.id}
                  style={{
                    backgroundColor: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg, 10px)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* PO Card Header */}
                  <div
                    style={{
                      padding: '14px 18px',
                      backgroundColor: 'var(--bg-surface-1)',
                      borderBottom: '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: "'Roboto Condensed', sans-serif",
                            fontWeight: 700,
                            color: 'var(--color-primary, #2563eb)',
                            fontSize: '0.9375rem',
                          }}
                        >
                          PO-2026-0{gIdx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            fontWeight: 700,
                          }}
                        >
                          Chờ gửi PO
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {cleanSupplierName(group.supplier.name)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Hotline: {group.supplier.phone} • {group.supplier.category}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Giá trị đơn</div>
                      <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--color-primary, #2563eb)' }}>
                        {formatVND(group.total)}
                      </div>
                    </div>
                  </div>

                  {/* Items in this PO */}
                  <div style={{ padding: '14px 18px', flex: '1 1 0%' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Danh mục vật tư ({group.lines.length} mặt hàng)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {group.lines.map((l, lIdx) => (
                        <div
                          key={l.id}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: 'var(--bg-surface-1)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <div>
                            <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>#{lIdx + 1}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {extractNameAndSpec(l.productName).name || l.productName}
                            </span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.75rem' }}>
                              ({l.quantity} {l.unit})
                            </span>
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatVND(l.totalPrice)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Điều khoản và Ghi chú bổ sung */}
                    <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Điều khoản thanh toán
                        </label>
                        <select
                          value={poPaymentTerms[group.supplier.id] || group.supplier.defaultPaymentTerm}
                          onChange={(e) => setPoPaymentTerms({ ...poPaymentTerms, [group.supplier.id]: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface-1)',
                            fontSize: '0.8125rem',
                            color: 'var(--text-primary)',
                            outline: 'none',
                          }}
                        >
                          <option value="Công nợ 30 ngày">Công nợ 30 ngày</option>
                          <option value="Công nợ 45 ngày">Công nợ 45 ngày</option>
                          <option value="Công nợ 15 ngày">Công nợ 15 ngày</option>
                          <option value="Thanh toán 50% trước">Thanh toán 50% trước, 50% khi nhận hàng</option>
                          <option value="Thanh toán ngay khi giao">Thanh toán ngay khi nhận hàng</option>
                          <option value="Thanh toán 100% trước">Thanh toán 100% khi đặt hàng</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Ghi chú đơn đặt hàng (PO)
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Giao hàng tại xưởng sản xuất, kèm chứng chỉ CO/CQ..."
                          value={poNotes[group.supplier.id] || ''}
                          onChange={(e) => setPoNotes({ ...poNotes, [group.supplier.id]: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface-1)',
                            fontSize: '0.8125rem',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>



      {/* COMPONENT XEM TRƯỚC VÀ IN ĐƠN ĐẶT HÀNG (PO) A4 - PRINTPREVIEWMODAL */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        orderGroups={targetGroupsToCreate}
        selectedSupplierId={selectedSupplierId}
        onConfirmAndSave={() => {
          handleConfirmCreatePOs();
          setIsPrintModalOpen(false);
        }}
      />
    </div>
  );
};
