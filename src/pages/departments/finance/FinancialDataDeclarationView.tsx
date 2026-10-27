import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  ArrowClockwise,
  CheckCircleFill,
  ExclamationTriangleFill,
  Wallet2,
  CreditCard,
  BoxSeam,
  Building,
  PiggyBank,
  FileEarmarkText,
  Calendar3,
  Plus,
  Trash,
  ArrowCounterclockwise,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { NumberInput } from '../../../components/common/NumberInput';
import { notifyFinanceUpdated } from '../../../services/financeSyncService';
import { getDefaultPeriod, getReportingPeriods } from '../../../utils/periodUtils';

export interface FinancialDataDeclarationViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

type DeclarationTab = 'cash-investments' | 'debts' | 'inventory' | 'fixed-assets' | 'capital-liabilities';

interface BankAccountItem {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
}

interface CustomerDebtItem {
  id: string;
  customerName: string;
  projectName: string;
  contractValue: number;
  paidAmount: number;
  remainingAmount: number;
}

interface SupplierDebtItem {
  id: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

const formatVND = (val: number): string => {
  return (val || 0).toLocaleString('vi-VN') + ' đ';
};

export const FinancialDataDeclarationView: React.FC<FinancialDataDeclarationViewProps> = ({ onShowToast }) => {
  const [activeTab, setActiveTab] = useState<DeclarationTab>('cash-investments');
  const [period, setPeriod] = useState<string>(() => getDefaultPeriod());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Tiền và Đầu tư tài chính
  const [cashInHand, setCashInHand] = useState<number>(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [shortTermInvestments, setShortTermInvestments] = useState<number>(0);

  // 2. Công nợ chi tiết đầu kỳ
  const [customerDebts, setCustomerDebts] = useState<CustomerDebtItem[]>([]);
  const [prepaymentsToSuppliers, setPrepaymentsToSuppliers] = useState<number>(0);
  const [otherShortTermReceivables, setOtherShortTermReceivables] = useState<number>(0);

  const [supplierDebts, setSupplierDebts] = useState<SupplierDebtItem[]>([]);
  const [customerPrepayments, setCustomerPrepayments] = useState<number>(0);

  // 3. Hàng tồn kho đầu kỳ
  const [rawMaterials, setRawMaterials] = useState<number>(0);
  const [workInProgress, setWorkInProgress] = useState<number>(0);
  const [finishedGoods, setFinishedGoods] = useState<number>(0);
  const [inventoryProvision, setInventoryProvision] = useState<number>(0);

  // 4. Tài sản cố định và Dài hạn
  const [tangibleOriginal, setTangibleOriginal] = useState<number>(0);
  const [tangibleDepreciation, setTangibleDepreciation] = useState<number>(0);
  const [intangibleOriginal, setIntangibleOriginal] = useState<number>(0);
  const [intangibleDepreciation, setIntangibleDepreciation] = useState<number>(0);
  const [constructionInProgress, setConstructionInProgress] = useState<number>(0);
  const [longTermPrepayments, setLongTermPrepayments] = useState<number>(0);
  const [longTermReceivables, setLongTermReceivables] = useState<number>(0);

  // 5. Nguồn vốn và Nợ vay
  const [ownerEquity, setOwnerEquity] = useState<number>(0);
  const [developmentFund, setDevelopmentFund] = useState<number>(0);
  const [retainedEarningsAccumulated, setRetainedEarningsAccumulated] = useState<number>(0);
  const [shortTermLoans, setShortTermLoans] = useState<number>(0);
  const [longTermLoans, setLongTermLoans] = useState<number>(0);
  const [taxPayables, setTaxPayables] = useState<number>(0);
  const [vatDeductible, setVatDeductible] = useState<number>(0);
  const [otherTaxReceivables, setOtherTaxReceivables] = useState<number>(0);
  const [employeePayables, setEmployeePayables] = useState<number>(0);

  // TÍNH TOÁN TỔNG TÀI SẢN VÀ TỔNG NGUỒN VỐN KHỞI TẠO
  const totalBankDeposits = useMemo(() => {
    return bankAccounts.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  }, [bankAccounts]);

  const totalCustomerReceivables = useMemo(() => {
    return customerDebts.reduce((sum, item) => sum + (Number(item.remainingAmount) || 0), 0);
  }, [customerDebts]);

  const totalSupplierPayables = useMemo(() => {
    return supplierDebts.reduce((sum, item) => sum + (Number(item.remainingAmount) || 0), 0);
  }, [supplierDebts]);

  const totalInventory = useMemo(() => {
    return (rawMaterials || 0) + (workInProgress || 0) + (finishedGoods || 0) + (inventoryProvision || 0);
  }, [rawMaterials, workInProgress, finishedGoods, inventoryProvision]);

  const totalTangibleFixedAssetsNet = useMemo(() => {
    return (tangibleOriginal || 0) + (tangibleDepreciation || 0);
  }, [tangibleOriginal, tangibleDepreciation]);

  const totalIntangibleFixedAssetsNet = useMemo(() => {
    return (intangibleOriginal || 0) + (intangibleDepreciation || 0);
  }, [intangibleOriginal, intangibleDepreciation]);

  // Tổng Tài sản (Bên Nợ)
  const totalAssets = useMemo(() => {
    const cashTotal = (cashInHand || 0) + totalBankDeposits + (shortTermInvestments || 0);
    const recTotal = totalCustomerReceivables + (prepaymentsToSuppliers || 0) + (otherShortTermReceivables || 0);
    const taxAssetsTotal = (vatDeductible || 0) + (otherTaxReceivables || 0);
    const longTermTotal =
      (longTermReceivables || 0) +
      totalTangibleFixedAssetsNet +
      totalIntangibleFixedAssetsNet +
      (constructionInProgress || 0) +
      (longTermPrepayments || 0);
    return cashTotal + recTotal + totalInventory + taxAssetsTotal + longTermTotal;
  }, [
    cashInHand,
    totalBankDeposits,
    shortTermInvestments,
    totalCustomerReceivables,
    prepaymentsToSuppliers,
    otherShortTermReceivables,
    vatDeductible,
    otherTaxReceivables,
    totalInventory,
    longTermReceivables,
    totalTangibleFixedAssetsNet,
    totalIntangibleFixedAssetsNet,
    constructionInProgress,
    longTermPrepayments,
  ]);

  // Tổng Nguồn vốn (Bên Có)
  const totalResources = useMemo(() => {
    const equityTotal =
      (ownerEquity || 0) +
      (developmentFund || 0) +
      (retainedEarningsAccumulated || 0);
    const debtTotal =
      totalSupplierPayables +
      (customerPrepayments || 0) +
      (taxPayables || 0) +
      (employeePayables || 0) +
      (shortTermLoans || 0) +
      (longTermLoans || 0);
    return equityTotal + debtTotal;
  }, [
    ownerEquity,
    developmentFund,
    retainedEarningsAccumulated,
    totalSupplierPayables,
    customerPrepayments,
    taxPayables,
    employeePayables,
    shortTermLoans,
    longTermLoans,
  ]);

  const balanceDiff = Math.abs(totalAssets - totalResources);
  const isBalanced = balanceDiff < 1000; // Sai số làm tròn cho phép dưới 1.000 đ

  // Reset tất cả các giá trị về 0
  const resetAllFields = () => {
    setCashInHand(0);
    setBankAccounts([]);
    setShortTermInvestments(0);
    setCustomerDebts([]);
    setPrepaymentsToSuppliers(0);
    setOtherShortTermReceivables(0);
    setSupplierDebts([]);
    setCustomerPrepayments(0);
    setRawMaterials(0);
    setWorkInProgress(0);
    setFinishedGoods(0);
    setInventoryProvision(0);
    setTangibleOriginal(0);
    setTangibleDepreciation(0);
    setIntangibleOriginal(0);
    setIntangibleDepreciation(0);
    setConstructionInProgress(0);
    setLongTermPrepayments(0);
    setLongTermReceivables(0);
    setOwnerEquity(0);
    setDevelopmentFund(0);
    setRetainedEarningsAccumulated(0);
    setShortTermLoans(0);
    setLongTermLoans(0);
    setTaxPayables(0);
    setVatDeductible(0);
    setOtherTaxReceivables(0);
    setEmployeePayables(0);
  };

  // Tải dữ liệu từ backend
  const loadDeclaration = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/finance/initial-declaration?period=${period}`);
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        if (d.cashAndInvestments) {
          setCashInHand(d.cashAndInvestments.cashInHand ?? 0);
          setBankAccounts(Array.isArray(d.cashAndInvestments.bankAccounts) ? d.cashAndInvestments.bankAccounts : []);
          setShortTermInvestments(d.cashAndInvestments.shortTermInvestments ?? 0);
        } else {
          setCashInHand(0);
          setBankAccounts([]);
          setShortTermInvestments(0);
        }

        if (d.debts) {
          setCustomerDebts(Array.isArray(d.debts.customerDebts) ? d.debts.customerDebts : []);
          setSupplierDebts(Array.isArray(d.debts.supplierDebts) ? d.debts.supplierDebts : []);
          setPrepaymentsToSuppliers(d.debts.prepaymentsToSuppliers ?? 0);
          setOtherShortTermReceivables(d.debts.otherShortTermReceivables ?? 0);
          setCustomerPrepayments(d.debts.customerPrepayments ?? 0);
        } else {
          setCustomerDebts([]);
          setSupplierDebts([]);
          setPrepaymentsToSuppliers(0);
          setOtherShortTermReceivables(0);
          setCustomerPrepayments(0);
        }

        if (d.inventory) {
          setRawMaterials(d.inventory.rawMaterials ?? 0);
          setWorkInProgress(d.inventory.workInProgress ?? 0);
          setFinishedGoods(d.inventory.finishedGoods ?? 0);
          setInventoryProvision(d.inventory.inventoryProvision ?? 0);
        } else {
          setRawMaterials(0);
          setWorkInProgress(0);
          setFinishedGoods(0);
          setInventoryProvision(0);
        }

        if (d.fixedAssets) {
          setTangibleOriginal(d.fixedAssets.tangibleOriginal ?? 0);
          setTangibleDepreciation(d.fixedAssets.tangibleDepreciation ?? 0);
          setIntangibleOriginal(d.fixedAssets.intangibleOriginal ?? 0);
          setIntangibleDepreciation(d.fixedAssets.intangibleDepreciation ?? 0);
          setConstructionInProgress(d.fixedAssets.constructionInProgress ?? 0);
          setLongTermPrepayments(d.fixedAssets.longTermPrepayments ?? 0);
          setLongTermReceivables(d.fixedAssets.longTermReceivables ?? 0);
        } else {
          setTangibleOriginal(0);
          setTangibleDepreciation(0);
          setIntangibleOriginal(0);
          setIntangibleDepreciation(0);
          setConstructionInProgress(0);
          setLongTermPrepayments(0);
          setLongTermReceivables(0);
        }

        if (d.capitalAndLiabilities) {
          setOwnerEquity(d.capitalAndLiabilities.ownerEquity ?? 0);
          setDevelopmentFund(d.capitalAndLiabilities.developmentFund ?? 0);
          setRetainedEarningsAccumulated(d.capitalAndLiabilities.retainedEarningsAccumulated ?? 0);
          setShortTermLoans(d.capitalAndLiabilities.shortTermLoans ?? 0);
          setLongTermLoans(d.capitalAndLiabilities.longTermLoans ?? 0);
          setTaxPayables(d.capitalAndLiabilities.taxPayables ?? 0);
          setVatDeductible(d.capitalAndLiabilities.vatDeductible ?? 0);
          setOtherTaxReceivables(d.capitalAndLiabilities.otherTaxReceivables ?? 0);
          setEmployeePayables(d.capitalAndLiabilities.employeePayables ?? 0);
        } else {
          setOwnerEquity(0);
          setDevelopmentFund(0);
          setRetainedEarningsAccumulated(0);
          setShortTermLoans(0);
          setLongTermLoans(0);
          setTaxPayables(0);
          setVatDeductible(0);
          setOtherTaxReceivables(0);
          setEmployeePayables(0);
        }
      } else {
        resetAllFields();
      }
    } catch (err: any) {
      console.error('Error loading declaration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeclaration();
  }, [period]);

  // Lưu dữ liệu khai báo
  const handleSave = async (overrideData?: any) => {
    setIsSaving(true);
    try {
      const payload = overrideData || {
        period,
        data: {
          cashAndInvestments: {
            cashInHand,
            bankDeposits: totalBankDeposits,
            bankAccounts,
            shortTermInvestments,
          },
          debts: {
            customerDebts,
            customerReceivablesTotal: totalCustomerReceivables,
            prepaymentsToSuppliers,
            otherShortTermReceivables,
            supplierDebts,
            supplierPayablesTotal: totalSupplierPayables,
            customerPrepayments,
          },
          inventory: {
            rawMaterials,
            workInProgress,
            finishedGoods,
            inventoryProvision,
            totalInventory,
          },
          fixedAssets: {
            tangibleOriginal,
            tangibleDepreciation,
            tangibleNet: totalTangibleFixedAssetsNet,
            intangibleOriginal,
            intangibleDepreciation,
            intangibleNet: totalIntangibleFixedAssetsNet,
            constructionInProgress,
            longTermPrepayments,
            longTermReceivables,
          },
          capitalAndLiabilities: {
            ownerEquity,
            developmentFund,
            retainedEarningsAccumulated,
            shortTermLoans,
            longTermLoans,
            taxPayables,
            vatDeductible,
            otherTaxReceivables,
            employeePayables,
          },
          totalAssets,
          totalResources,
          isBalanced,
        },
      };

      const res = await fetch('/api/finance/initial-declaration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        notifyFinanceUpdated('initial_declaration', 'update');
        onShowToast?.('success', 'Lưu dữ liệu thành công', 'Hệ thống đã cập nhật số dư đầu kỳ cho các biểu mẫu Báo cáo tài chính.');
      } else {
        onShowToast?.('error', 'Lưu thất bại', data.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
      }
    } catch (err: any) {
      onShowToast?.('error', 'Lỗi kết nối', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Thao tác xóa sạch dữ liệu mô phỏng
  const handleClearMockData = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá sạch toàn bộ dữ liệu mô phỏng trong kỳ này và đặt tất cả số dư về 0 không?')) {
      resetAllFields();
      const emptyPayload = {
        period,
        data: {
          cashAndInvestments: {
            cashInHand: 0,
            bankDeposits: 0,
            bankAccounts: [],
            shortTermInvestments: 0,
          },
          debts: {
            customerDebts: [],
            customerReceivablesTotal: 0,
            prepaymentsToSuppliers: 0,
            otherShortTermReceivables: 0,
            supplierDebts: [],
            supplierPayablesTotal: 0,
            customerPrepayments: 0,
          },
          inventory: {
            rawMaterials: 0,
            workInProgress: 0,
            finishedGoods: 0,
            inventoryProvision: 0,
            totalInventory: 0,
          },
          fixedAssets: {
            tangibleOriginal: 0,
            tangibleDepreciation: 0,
            tangibleNet: 0,
            intangibleOriginal: 0,
            intangibleDepreciation: 0,
            intangibleNet: 0,
            constructionInProgress: 0,
            longTermPrepayments: 0,
            longTermReceivables: 0,
          },
          capitalAndLiabilities: {
            ownerEquity: 0,
            developmentFund: 0,
            retainedEarningsAccumulated: 0,
            shortTermLoans: 0,
            longTermLoans: 0,
            taxPayables: 0,
            vatDeductible: 0,
            otherTaxReceivables: 0,
            employeePayables: 0,
          },
          totalAssets: 0,
          totalResources: 0,
          isBalanced: true,
        },
      };
      await handleSave(emptyPayload);
      onShowToast?.('info', 'Đã xóa dữ liệu mô phỏng', 'Toàn bộ số dư ban đầu đã được đưa về 0 và danh sách rỗng.');
    }
  };

  // Thao tác ngân hàng
  const handleAddBankAccount = () => {
    const newAccount: BankAccountItem = {
      id: `bank-${Date.now()}`,
      bankName: '',
      accountNumber: '',
      balance: 0,
    };
    setBankAccounts([...bankAccounts, newAccount]);
  };

  const handleRemoveBankAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter((b) => b.id !== id));
  };

  const handleUpdateBankAccount = (id: string, field: keyof BankAccountItem, value: any) => {
    setBankAccounts(
      bankAccounts.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  // Thao tác công nợ khách hàng
  const handleAddCustomerDebt = () => {
    const newItem: CustomerDebtItem = {
      id: `cust-${Date.now()}`,
      customerName: '',
      projectName: '',
      contractValue: 0,
      paidAmount: 0,
      remainingAmount: 0,
    };
    setCustomerDebts([...customerDebts, newItem]);
  };

  const handleRemoveCustomerDebt = (id: string) => {
    setCustomerDebts(customerDebts.filter((c) => c.id !== id));
  };

  const handleUpdateCustomerDebt = (id: string, field: keyof CustomerDebtItem, value: any) => {
    setCustomerDebts(
      customerDebts.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        if (field === 'contractValue' || field === 'paidAmount') {
          const cv = field === 'contractValue' ? Number(value) || 0 : c.contractValue;
          const pa = field === 'paidAmount' ? Number(value) || 0 : c.paidAmount;
          updated.remainingAmount = Math.max(0, cv - pa);
        }
        return updated;
      })
    );
  };

  // Thao tác công nợ nhà cung cấp
  const handleAddSupplierDebt = () => {
    const newItem: SupplierDebtItem = {
      id: `supp-${Date.now()}`,
      supplierName: '',
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
    };
    setSupplierDebts([...supplierDebts, newItem]);
  };

  const handleRemoveSupplierDebt = (id: string) => {
    setSupplierDebts(supplierDebts.filter((s) => s.id !== id));
  };

  const handleUpdateSupplierDebt = (id: string, field: keyof SupplierDebtItem, value: any) => {
    setSupplierDebts(
      supplierDebts.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === 'totalAmount' || field === 'paidAmount') {
          const ta = field === 'totalAmount' ? Number(value) || 0 : s.totalAmount;
          const pa = field === 'paidAmount' ? Number(value) || 0 : s.paidAmount;
          updated.remainingAmount = Math.max(0, ta - pa);
        }
        return updated;
      })
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100%', backgroundColor: 'var(--bg-app)' }}>
      {/* 1. Header Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '12px 20px',
          backgroundColor: 'var(--bg-surface-1)',
          borderBottom: '1px solid var(--border-default)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              fontSize: '0.8125rem',
            }}
          >
            <Calendar3 size={13} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Kỳ áp dụng:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {getReportingPeriods().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadDeclaration}
            disabled={isLoading || isSaving}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowClockwise size={14} className={isLoading ? 'spin' : ''} />
              <span>Tải lại</span>
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearMockData}
            disabled={isLoading || isSaving}
            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowCounterclockwise size={14} />
              <span>Xóa sạch về 0</span>
            </span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave()}
            disabled={isLoading || isSaving}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Save size={14} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu dữ liệu khởi tạo'}</span>
            </span>
          </Button>
        </div>
      </div>

      {/* 2. Tổng quan Cân đối Khởi tạo (Header KPI) */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface-1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {/* Card Tài sản */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Tổng Tài sản khởi tạo (Bên Nợ)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {formatVND(totalAssets)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Tiền, Phải thu, Tồn kho, TSCĐ, Đầu tư
            </div>
          </div>

          {/* Card Nguồn vốn */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Tổng Nguồn vốn khởi tạo (Bên Có)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {formatVND(totalResources)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Nợ phải trả, Vay nợ, Vốn CSH, Quỹ
            </div>
          </div>

          {/* Card Cân đối */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              backgroundColor: isBalanced ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${isBalanced ? '#10b981' : '#ef4444'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {isBalanced ? (
                <CheckCircleFill size={16} style={{ color: '#10b981' }} />
              ) : (
                <ExclamationTriangleFill size={16} style={{ color: '#ef4444' }} />
              )}
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: isBalanced ? '#047857' : '#b91c1c' }}>
                {isBalanced ? 'TRẠNG THÁI: ĐÃ CÂN ĐỐI (NỢ = CÓ)' : 'TRẠNG THÁI: CHƯA CÂN ĐỐI'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: isBalanced ? '#065f46' : '#991b1b' }}>
              {isBalanced
                ? 'Tổng Tài sản bằng Tổng Nguồn vốn, sẵn sàng phục vụ Báo cáo tài chính.'
                : `Lệch: ${formatVND(balanceDiff)} (Cần kiểm tra lại số liệu Nợ / Có)`}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '0 20px',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface-1)',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('cash-investments')}
          style={{
            padding: '10px 14px',
            border: 'none',
            borderBottom: activeTab === 'cash-investments' ? '2px solid var(--color-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'cash-investments' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'cash-investments' ? 600 : 500,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <Wallet2 size={14} />
          <span>1. Tiền và Đầu tư tài chính</span>
        </button>

        <button
          onClick={() => setActiveTab('debts')}
          style={{
            padding: '10px 14px',
            border: 'none',
            borderBottom: activeTab === 'debts' ? '2px solid var(--color-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'debts' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'debts' ? 600 : 500,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <CreditCard size={14} />
          <span>2. Công nợ chi tiết đầu kỳ</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 14px',
            border: 'none',
            borderBottom: activeTab === 'inventory' ? '2px solid var(--color-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'inventory' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'inventory' ? 600 : 500,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <BoxSeam size={14} />
          <span>3. Hàng tồn kho đầu kỳ</span>
        </button>

        <button
          onClick={() => setActiveTab('fixed-assets')}
          style={{
            padding: '10px 14px',
            border: 'none',
            borderBottom: activeTab === 'fixed-assets' ? '2px solid var(--color-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'fixed-assets' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'fixed-assets' ? 600 : 500,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <Building size={14} />
          <span>4. Tài sản cố định và Dài hạn</span>
        </button>

        <button
          onClick={() => setActiveTab('capital-liabilities')}
          style={{
            padding: '10px 14px',
            border: 'none',
            borderBottom: activeTab === 'capital-liabilities' ? '2px solid var(--color-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'capital-liabilities' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'capital-liabilities' ? 600 : 500,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <PiggyBank size={14} />
          <span>5. Nguồn vốn và Nợ vay</span>
        </button>
      </div>

      {/* 4. Tab Body Content */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {/* TAB 1: TIỀN VÀ ĐẦU TƯ TÀI CHÍNH */}
        {activeTab === 'cash-investments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Wallet2 size={16} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Tiền mặt tại quỹ két (TK 1111 - Mã 111)
                </span>
              </div>
              <div style={{ maxWidth: '480px' }}>
                <NumberInput
                  label="Số dư tiền mặt tại quỹ văn phòng (VNĐ)"
                  value={cashInHand}
                  onValueChange={(val) => setCashInHand(val)}
                  suffix="đ"
                  helperText="Số dư tiền mặt tồn quỹ tại thời điểm bắt đầu kỳ kế toán"
                />
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building size={16} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Tiền gửi ngân hàng (TK 1121 - Mã 112)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Tổng tiền gửi: {formatVND(totalBankDeposits)}
                  </div>
                  <Button size="sm" variant="secondary" onClick={handleAddBankAccount}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={14} /> Thêm tài khoản
                    </span>
                  </Button>
                </div>
              </div>

              {bankAccounts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-2)', borderRadius: '6px' }}>
                  Chưa có tài khoản ngân hàng nào. Bấm "+ Thêm tài khoản" để khai báo.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-default)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>NGÂN HÀNG / CHI NHÁNH</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>SỐ TÀI KHOẢN</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)', width: '220px' }}>SỐ DƯ ĐẦU KỲ (VNĐ)</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankAccounts.map((acc) => (
                        <tr key={acc.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="text"
                              value={acc.bankName}
                              onChange={(e) => handleUpdateBankAccount(acc.id, 'bankName', e.target.value)}
                              placeholder="Tên ngân hàng - Chi nhánh"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface-1)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8125rem',
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="text"
                              value={acc.accountNumber}
                              onChange={(e) => handleUpdateBankAccount(acc.id, 'accountNumber', e.target.value)}
                              placeholder="Số tài khoản ngân hàng"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface-1)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8125rem',
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <NumberInput
                              value={acc.balance}
                              onValueChange={(val) => handleUpdateBankAccount(acc.id, 'balance', val)}
                              suffix="đ"
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleRemoveBankAccount(acc.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                              title="Xóa tài khoản"
                            >
                              <Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <FileEarmarkText size={16} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Đầu tư tài chính ngắn hạn (TK 128 / Mã 120, 121)
                </span>
              </div>
              <div style={{ maxWidth: '480px' }}>
                <NumberInput
                  label="Tiền gửi tiết kiệm có kỳ hạn 3 - 6 tháng (VNĐ)"
                  value={shortTermInvestments}
                  onValueChange={(val) => setShortTermInvestments(val)}
                  suffix="đ"
                  helperText="Tiền gửi tiết kiệm, chứng chỉ tiền gửi có kỳ hạn dưới 1 năm"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CÔNG NỢ CHI TIẾT ĐẦU KỲ */}
        {activeTab === 'debts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Phải thu khách hàng */}
            <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Phải thu ngắn hạn khách hàng (TK 131 - Mã 131)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Chi tiết các khoản nợ phải thu từ khách hàng, chủ đầu tư đầu kỳ
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Tổng phải thu: {formatVND(totalCustomerReceivables)}
                  </div>
                  <Button size="sm" variant="secondary" onClick={handleAddCustomerDebt}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={14} /> Thêm khách hàng
                    </span>
                  </Button>
                </div>
              </div>

              {customerDebts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-2)', borderRadius: '6px' }}>
                  Chưa có công nợ khách hàng nào. Bấm "+ Thêm khách hàng" để khai báo số dư đầu kỳ.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-default)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)' }}>KHÁCH HÀNG / DỰ ÁN</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-secondary)', width: '180px' }}>GIÁ TRỊ HĐ</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-secondary)', width: '180px' }}>ĐÃ THANH TOÁN</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-secondary)', width: '180px' }}>CÒN PHẢI THU (VNĐ)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerDebts.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                          <td style={{ padding: '8px 10px' }}>
                            <input
                              type="text"
                              value={item.customerName}
                              onChange={(e) => handleUpdateCustomerDebt(item.id, 'customerName', e.target.value)}
                              placeholder="Tên khách hàng / Chủ đầu tư"
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                marginBottom: '4px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface-1)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8125rem',
                              }}
                            />
                            <input
                              type="text"
                              value={item.projectName}
                              onChange={(e) => handleUpdateCustomerDebt(item.id, 'projectName', e.target.value)}
                              placeholder="Tên dự án / Hợp đồng"
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface-1)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem',
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <NumberInput
                              value={item.contractValue}
                              onValueChange={(val) => handleUpdateCustomerDebt(item.id, 'contractValue', val)}
                              suffix="đ"
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <NumberInput
                              value={item.paidAmount}
                              onValueChange={(val) => handleUpdateCustomerDebt(item.id, 'paidAmount', val)}
                              suffix="đ"
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {formatVND(item.remainingAmount)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleRemoveCustomerDebt(item.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                              title="Xóa công nợ"
                            >
                              <Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Phải trả người bán */}
            <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Phải trả người bán ngắn hạn (TK 331 - Mã 311)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Chi tiết các khoản nợ phải trả cho nhà cung cấp vật tư, dịch vụ đầu kỳ
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#dc2626' }}>
                    Tổng nợ NCC: {formatVND(totalSupplierPayables)}
                  </div>
                  <Button size="sm" variant="secondary" onClick={handleAddSupplierDebt}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={14} /> Thêm nhà cung cấp
                    </span>
                  </Button>
                </div>
              </div>

              {supplierDebts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-2)', borderRadius: '6px' }}>
                  Chưa có công nợ nhà cung cấp nào. Bấm "+ Thêm nhà cung cấp" để khai báo số dư đầu kỳ.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-default)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)' }}>NHÀ CUNG CẤP VẬT TƯ</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-secondary)', width: '180px' }}>TỔNG TIỀN MUA</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-secondary)', width: '180px' }}>ĐÃ THANH TOÁN</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-secondary)', width: '180px' }}>CÒN NỢ NCC (VNĐ)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierDebts.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                          <td style={{ padding: '8px 10px' }}>
                            <input
                              type="text"
                              value={item.supplierName}
                              onChange={(e) => handleUpdateSupplierDebt(item.id, 'supplierName', e.target.value)}
                              placeholder="Tên nhà cung cấp / Đối tác"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface-1)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8125rem',
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <NumberInput
                              value={item.totalAmount}
                              onValueChange={(val) => handleUpdateSupplierDebt(item.id, 'totalAmount', val)}
                              suffix="đ"
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <NumberInput
                              value={item.paidAmount}
                              onValueChange={(val) => handleUpdateSupplierDebt(item.id, 'paidAmount', val)}
                              suffix="đ"
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            {formatVND(item.remainingAmount)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleRemoveSupplierDebt(item.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                              title="Xóa công nợ"
                            >
                              <Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Các khoản công nợ khác */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
                <NumberInput
                  label="Trả trước cho người bán ngắn hạn (TK 331 dư Nợ / Mã 132)"
                  value={prepaymentsToSuppliers}
                  onValueChange={(val) => setPrepaymentsToSuppliers(val)}
                  suffix="đ"
                  helperText="Số tiền đã tạm ứng trước cho nhà cung cấp chưa nhận hàng"
                />
              </div>

              <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
                <NumberInput
                  label="Người mua trả tiền trước ngắn hạn (TK 131 dư Có / Mã 312)"
                  value={customerPrepayments}
                  onValueChange={(val) => setCustomerPrepayments(val)}
                  suffix="đ"
                  helperText="Tiền khách hàng / chủ đầu tư đặt cọc trước hợp đồng"
                />
              </div>

              <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
                <NumberInput
                  label="Phải thu ngắn hạn khác - Tạm ứng (TK 141 / Mã 136)"
                  value={otherShortTermReceivables}
                  onValueChange={(val) => setOtherShortTermReceivables(val)}
                  suffix="đ"
                  helperText="Tạm ứng công tác phí, mua hàng nhân viên chưa hoàn ứng"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HÀNG TỒN KHO ĐẦU KỲ */}
        {activeTab === 'inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Tổng giá trị Hàng tồn kho đầu kỳ (TK 140)
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {formatVND(totalInventory)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <NumberInput
                  label="1. Nguyên vật liệu tồn kho (TK 152 / Mã 141)"
                  value={rawMaterials}
                  onValueChange={(val) => setRawMaterials(val)}
                  suffix="đ"
                  helperText="Gỗ tấm, sơn, phụ kiện kim khí, vật tư phụ tồn kho"
                />

                <NumberInput
                  label="2. Chi phí SXKD dở dang xưởng (TK 154 / Mã 141)"
                  value={workInProgress}
                  onValueChange={(val) => setWorkInProgress(val)}
                  suffix="đ"
                  helperText="Sản phẩm đang nằm trên dây chuyền sản xuất dở dang"
                />

                <NumberInput
                  label="3. Thành phẩm tồn kho (TK 155 / Mã 141)"
                  value={finishedGoods}
                  onValueChange={(val) => setFinishedGoods(val)}
                  suffix="đ"
                  helperText="Thành phẩm hoàn chỉnh đang lưu kho chờ bàn giao"
                />

                <NumberInput
                  label="4. Dự phòng giảm giá hàng tồn kho (TK 2294 / Mã 149 - Ghi âm)"
                  value={inventoryProvision}
                  allowNegative={true}
                  onValueChange={(val) => setInventoryProvision(val)}
                  suffix="đ"
                  helperText="Trích lập dự phòng vật tư lỗi hỏng hoặc giảm giá"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TÀI SẢN CỐ ĐỊNH VÀ DÀI HẠN */}
        {activeTab === 'fixed-assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '14px' }}>
                Tài sản cố định hữu hình & Vô hình (Mã 220)
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <NumberInput
                  label="Nguyên giá TSCĐ hữu hình (TK 211 / Mã 222)"
                  value={tangibleOriginal}
                  onValueChange={(val) => setTangibleOriginal(val)}
                  suffix="đ"
                  helperText="Nguyên giá nhà xưởng, máy móc thiết bị, phương tiện vận tải"
                />

                <NumberInput
                  label="Hao mòn lũy kế TSCĐ hữu hình (TK 2141 / Mã 223 - Ghi âm)"
                  value={tangibleDepreciation}
                  allowNegative={true}
                  onValueChange={(val) => setTangibleDepreciation(val)}
                  suffix="đ"
                  helperText={`Giá trị còn lại: ${formatVND(totalTangibleFixedAssetsNet)}`}
                />

                <NumberInput
                  label="Tài sản cố định vô hình (TK 213 / Mã 227)"
                  value={intangibleOriginal}
                  onValueChange={(val) => setIntangibleOriginal(val)}
                  suffix="đ"
                  helperText="Bản quyền phần mềm quản trị, thương hiệu, bằng sáng chế"
                />
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '14px' }}>
                Tài sản dở dang và Chi phí dài hạn khác (Mã 240, 260, 210)
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <NumberInput
                  label="Chi phí xây dựng cơ bản dở dang (TK 241 / Mã 242)"
                  value={constructionInProgress}
                  onValueChange={(val) => setConstructionInProgress(val)}
                  suffix="đ"
                  helperText="Dự án nâng cấp, xây dựng nhà máy hoặc phân xưởng dở dang"
                />

                <NumberInput
                  label="Chi phí trả trước dài hạn (TK 242 / Mã 261)"
                  value={longTermPrepayments}
                  onValueChange={(val) => setLongTermPrepayments(val)}
                  suffix="đ"
                  helperText="Chi phí thuê đất phân bổ nhiều năm, CCDC dùng nhiều kỳ"
                />

                <NumberInput
                  label="Ký cược, ký quỹ dài hạn (TK 244 / Mã 210)"
                  value={longTermReceivables}
                  onValueChange={(val) => setLongTermReceivables(val)}
                  suffix="đ"
                  helperText="Ký cược, ký quỹ thuê mặt bằng hoặc bảo lãnh hợp đồng dài hạn"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NGUỒN VỐN VÀ NỢ VAY */}
        {activeTab === 'capital-liabilities' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Vốn chủ sở hữu */}
            <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '14px' }}>
                Vốn chủ sở hữu (TK 400 - Căn cứ pháp lý theo ĐKKD và BCTC năm trước)
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <NumberInput
                  label="Vốn đầu tư của chủ sở hữu (TK 411 / Mã 411)"
                  value={ownerEquity}
                  onValueChange={(val) => setOwnerEquity(val)}
                  suffix="đ"
                  helperText="Vốn điều lệ thực góp của các thành viên / cổ đông"
                />

                <NumberInput
                  label="Quỹ đầu tư phát triển (TK 418 / Mã 418)"
                  value={developmentFund}
                  onValueChange={(val) => setDevelopmentFund(val)}
                  suffix="đ"
                  helperText="Trích lập từ lợi nhuận các năm trước chuyển sang"
                />

                <NumberInput
                  label="LNST chưa phân phối lũy kế kỳ trước (TK 421a / Mã 421a)"
                  value={retainedEarningsAccumulated}
                  onValueChange={(val) => setRetainedEarningsAccumulated(val)}
                  suffix="đ"
                  helperText="Lấy từ Báo cáo tài chính kiểm toán năm trước chuyển sang"
                />
              </div>
            </div>

            {/* Vay ngân hàng & Nghĩa vụ khác */}
            <div style={{ backgroundColor: 'var(--bg-surface-1)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '16px' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '14px' }}>
                Vay ngân hàng, Thuế và Phải trả người lao động
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <NumberInput
                  label="Vay ngắn hạn ngân hàng (TK 3411 / Mã 320)"
                  value={shortTermLoans}
                  onValueChange={(val) => setShortTermLoans(val)}
                  suffix="đ"
                  helperText="Hạn mức tín dụng ngân hàng bổ sung vốn lưu động"
                />

                <NumberInput
                  label="Vay trung và dài hạn ngân hàng (TK 3412 / Mã 338)"
                  value={longTermLoans}
                  onValueChange={(val) => setLongTermLoans(val)}
                  suffix="đ"
                  helperText="Vay đầu tư máy móc thiết bị và nhà xưởng dài hạn"
                />

                <NumberInput
                  label="Thuế và các khoản phải nộp Nhà nước (TK 333 / Mã 313)"
                  value={taxPayables}
                  onValueChange={(val) => setTaxPayables(val)}
                  suffix="đ"
                  helperText="Nghĩa vụ thuế GTGT, TNDN, TNCN còn nợ Nhà nước đầu kỳ"
                />

                <NumberInput
                  label="Thuế GTGT được khấu trừ đầu kỳ (TK 1331 / Mã 151)"
                  value={vatDeductible}
                  onValueChange={(val) => setVatDeductible(val)}
                  suffix="đ"
                  helperText="Thuế GTGT đầu vào còn được khấu trừ chuyển kỳ"
                />

                <NumberInput
                  label="Phải trả người lao động đầu kỳ (TK 334 / Mã 314)"
                  value={employeePayables}
                  onValueChange={(val) => setEmployeePayables(val)}
                  suffix="đ"
                  helperText="Lương và phụ cấp cán bộ nhân viên tháng trước chưa thanh toán"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
