import React, { useState, useEffect } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { Offcanvas } from '../../components/common/Offcanvas';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Toggle } from '../../components/common/Toggle';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useDepartment } from '../../context/DepartmentContext';
import {
  Plus,
  PersonPlus,
  PencilSquare,
  Trash,
  ArrowClockwise,
  CheckCircle,
  ExclamationCircle,
} from 'react-bootstrap-icons';

interface DepartmentItem {
  code: string;
  nameVi: string;
}

interface PositionItem {
  code: string;
  name: string;
}

interface EmployeeItem {
  id: string;
  code: string;
  fullName: string;
  birthDate?: string | null;
  gender?: string | null;
  nationalId?: string | null;
  nationalIdDate?: string | null;
  nationalIdPlace?: string | null;
  permanentAddress?: string | null;
  currentAddress?: string | null;
  workEmail: string;
  phone: string;
  departmentCode: string;
  departmentName: string;
  position: string;
  positionTitle: string;
  employeeType: string;
  startDate: string | null;
  contractType?: string | null;
  contractNumber?: string | null;
  isInsuranceEnrolled?: boolean;
  socialInsuranceNumber?: string | null;
  taxCode?: string | null;
  baseSalary?: number | null;
  insuranceSalary?: number | null;
  mealAllowance?: number | null;
  fuelAllowance?: number | null;
  phoneAllowance?: number | null;
  seniorityAllowance?: number | null;
  bankAccount?: string | null;
  bankName?: string | null;
  status: string;
  avatarUrl?: string | null;
}

const VIETNAM_BANKS = [
  'Vietcombank - TMCP Ngoại thương Việt Nam (VCB)',
  'Techcombank - TMCP Kỹ thương Việt Nam (TCB)',
  'MB Bank - TMCP Quân Đội (MB)',
  'BIDV - TMCP Đầu tư và Phát triển Việt Nam',
  'VietinBank - TMCP Công thương Việt Nam (CTG)',
  'Agribank - Nông nghiệp và Phát triển Nông thôn VN',
  'ACB - TMCP Á Châu',
  'VPBank - TMCP Việt Nam Thịnh Vượng (VPB)',
  'TPBank - TMCP Tiên Phong (TPB)',
  'Sacombank - TMCP Sài Gòn Thương Tín (STB)',
  'HDBank - TMCP Phát triển TP.HCM (HDB)',
  'VIB - TMCP Quốc tế Việt Nam',
  'SHB - TMCP Sài Gòn - Hà Nội',
  'MSB - TMCP Hàng Hải Việt Nam',
  'SeABank - TMCP Đông Nam Á (SSB)',
  'OCB - TMCP Phương Đông',
  'LPBank - TMCP Lộc Phát Việt Nam (LPB)',
  'Eximbank - TMCP Xuất Nhập Khẩu Việt Nam (EIB)',
  'Nam A Bank - TMCP Nam Á (NAB)',
  'Bac A Bank - TMCP Bắc Á (BAB)',
  'PVcomBank - TMCP Đại Chúng Việt Nam',
  'NCB - TMCP Quốc Dân',
  'BVBank - TMCP Bản Việt (BVB)',
  'VietABank - TMCP Việt Á (VAB)',
  'Saigonbank - TMCP Sài Gòn Công Thương (SGB)',
  'Kienlongbank - TMCP Kiên Long (KLB)',
  'BaoViet Bank - TMCP Bảo Việt',
  'PGBank - TMCP Thịnh vượng và Phát triển',
  'Shinhan Bank - TNHH MTV Shinhan Việt Nam',
  'HSBC - TNHH MTV HSBC Việt Nam',
];

const CONTRACT_TYPE_OPTIONS = [
  { value: 'Có xác định thời hạn', label: 'Có xác định thời hạn' },
  { value: 'Không xác định thời hạn', label: 'Không xác định thời hạn' },
  { value: 'Hợp đồng thử việc', label: 'Hợp đồng thử việc' },
  { value: 'Học việc / Thực tập', label: 'Học việc / Thực tập' },
  { value: 'Hợp đồng cộng tác viên', label: 'Hợp đồng cộng tác viên' },
];

const STATUS_FORM_OPTIONS = [
  { value: 'active', label: 'Đang làm việc' },
  { value: 'probation', label: 'Thử việc' },
  { value: 'resigned', label: 'Đã nghỉ việc' },
  { value: 'leave', label: 'Tạm nghỉ' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
];

const generateEmployeeCode = (): string => {
  const d = new Date();
  const ds = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EMP-${ds}-${rand}`;
};

const generateCleanEmail = (fullName: string): string => {
  const clean = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return clean ? `${clean}@seajong.com` : '';
};

const toInputDate = (dStr: string | null | undefined): string => {
  if (!dStr) return '';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const renderUnitSuffix = (unit: string) => (
  <span
    style={{
      fontSize: '0.75rem',
      fontWeight: 500,
      color: '#64748b',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      paddingRight: '2px',
    }}
  >
    {unit}
  </span>
);

export const EmployeesPage: React.FC = () => {
  const { setActiveMenuKey } = useDepartment();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Modal / Offcanvas state (Thêm mới & Chỉnh sửa)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ConfirmDialog xác nhận xóa nhân sự
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Form State đầy đủ theo chuẩn client-skydoor ──
  // 1. Thông tin cơ bản
  const [formCode, setFormCode] = useState(generateEmployeeCode());
  const [formFullName, setFormFullName] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formGender, setFormGender] = useState('male');
  const [formNationalId, setFormNationalId] = useState('');
  const [formNationalIdDate, setFormNationalIdDate] = useState('');
  const [formNationalIdPlace, setFormNationalIdPlace] = useState('');
  const [formPermanentAddress, setFormPermanentAddress] = useState('');
  const [formCurrentAddress, setFormCurrentAddress] = useState('');
  const [formDeptCode, setFormDeptCode] = useState('hr');
  const [formPosition, setFormPosition] = useState('');
  const [formWorkEmail, setFormWorkEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');

  // 2. Hợp đồng và bảo hiểm
  const [formHasContract, setFormHasContract] = useState(true);
  const [formContractType, setFormContractType] = useState('Có xác định thời hạn');
  const [formContractDuration, setFormContractDuration] = useState('12');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState('active');
  const [formHasInsurance, setFormHasInsurance] = useState(true);
  const [formSocialInsuranceNumber, setFormSocialInsuranceNumber] = useState('');
  const [formTaxCode, setFormTaxCode] = useState('');

  // 3. Lương và phụ cấp
  const [formIsMonthlySalary, setFormIsMonthlySalary] = useState(true);
  const [formBaseSalary, setFormBaseSalary] = useState('');
  const [formInsuranceSalary, setFormInsuranceSalary] = useState('');
  const [formMealAllowance, setFormMealAllowance] = useState('');
  const [formFuelAllowance, setFormFuelAllowance] = useState('');
  const [formPhoneAllowance, setFormPhoneAllowance] = useState('');
  const [formSeniorityAllowance, setFormSeniorityAllowance] = useState('');

  // 4. Tài khoản ngân hàng
  const [formBankAccount, setFormBankAccount] = useState('');
  const [formBankName, setFormBankName] = useState('');

  // Load danh sách phòng ban & chức vụ
  useEffect(() => {
    fetch('/api/departments')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          const depts = res.data.filter((d: any) => d.isActive !== false);
          setDepartments(depts);
          if (depts.length > 0 && !formDeptCode) {
            setFormDeptCode(depts[0].code);
          }
        }
      })
      .catch(() => {});

    fetch('/api/hr/positions')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setPositions(res.data);
          if (res.data.length > 0 && !formPosition) {
            setFormPosition(res.data[0].code);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Load danh sách nhân viên
  useEffect(() => {
    fetchEmployees();
  }, [search, department, status, page, pageSize]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        department,
        status,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/hr/employees?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Fetch employees error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormCode(generateEmployeeCode());
    setFormFullName('');
    setFormBirthDate('');
    setFormGender('male');
    setFormNationalId('');
    setFormNationalIdDate('');
    setFormNationalIdPlace('');
    setFormPermanentAddress('');
    setFormCurrentAddress('');
    setFormDeptCode(departments[0]?.code || 'hr');
    setFormPosition(positions[0]?.code || 'Nhân viên');
    setFormWorkEmail('');
    setFormPassword('');
    setFormPhone('');
    setFormHasContract(true);
    setFormContractType('Có xác định thời hạn');
    setFormContractDuration('12');
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormStatus('active');
    setFormHasInsurance(true);
    setFormSocialInsuranceNumber('');
    setFormTaxCode('');
    setFormIsMonthlySalary(true);
    setFormBaseSalary('');
    setFormInsuranceSalary('');
    setFormMealAllowance('');
    setFormFuelAllowance('');
    setFormPhoneAllowance('');
    setFormSeniorityAllowance('');
    setFormBankAccount('');
    setFormBankName('');
    setSaveError(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setFormCode(emp.code || '');
    setFormFullName(emp.fullName || '');
    setFormBirthDate(toInputDate(emp.birthDate));
    setFormGender(emp.gender === 'female' || emp.gender === 'Nữ' ? 'female' : 'male');
    setFormNationalId(emp.nationalId || '');
    setFormNationalIdDate(toInputDate(emp.nationalIdDate));
    setFormNationalIdPlace(emp.nationalIdPlace || '');
    setFormPermanentAddress(emp.permanentAddress || '');
    setFormCurrentAddress(emp.currentAddress || '');
    setFormDeptCode(emp.departmentCode || departments[0]?.code || 'hr');
    setFormPosition(emp.position || positions[0]?.code || 'Nhân viên');
    setFormWorkEmail(emp.workEmail || '');
    setFormPassword('');
    setFormPhone(emp.phone || '');
    setFormHasContract(
      emp.contractType !== 'Chưa ký hợp đồng' && emp.contractType !== 'unsigned'
    );
    setFormContractType(emp.contractType || 'Có xác định thời hạn');
    setFormContractDuration(emp.contractNumber ? emp.contractNumber.replace(/[^\d]/g, '') : '12');
    setFormStartDate(toInputDate(emp.startDate) || new Date().toISOString().slice(0, 10));
    setFormStatus(emp.status || 'active');
    setFormHasInsurance(Boolean(emp.isInsuranceEnrolled));
    setFormSocialInsuranceNumber(emp.socialInsuranceNumber || '');
    setFormTaxCode(emp.taxCode || '');
    setFormIsMonthlySalary(true);
    setFormBaseSalary(emp.baseSalary != null ? String(emp.baseSalary) : '');
    setFormInsuranceSalary(emp.insuranceSalary != null ? String(emp.insuranceSalary) : '');
    setFormMealAllowance(emp.mealAllowance != null ? String(emp.mealAllowance) : '');
    setFormFuelAllowance(emp.fuelAllowance != null ? String(emp.fuelAllowance) : '');
    setFormPhoneAllowance(emp.phoneAllowance != null ? String(emp.phoneAllowance) : '');
    setFormSeniorityAllowance(emp.seniorityAllowance != null ? String(emp.seniorityAllowance) : '');
    setFormBankAccount(emp.bankAccount || '');
    setFormBankName(emp.bankName || '');
    setSaveError(null);
    setIsAddOpen(true);
  };

  const handleFullNameChange = (val: string) => {
    setFormFullName(val);
    if (!editingEmployee) {
      const suggestedEmail = generateCleanEmail(val);
      if (!formWorkEmail || formWorkEmail.endsWith('@seajong.com')) {
        setFormWorkEmail(suggestedEmail);
      }
    }
  };

  const handleSaveEmployee = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formFullName.trim()) {
      setSaveError('Vui lòng nhập họ và tên nhân sự.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const payload = {
        code: formCode.trim(),
        fullName: formFullName.trim(),
        birthDate: formBirthDate || null,
        gender: formGender,
        nationalId: formNationalId.trim() || null,
        nationalIdDate: formNationalIdDate || null,
        nationalIdPlace: formNationalIdPlace.trim() || null,
        permanentAddress: formPermanentAddress.trim() || null,
        currentAddress: formCurrentAddress.trim() || null,
        departmentCode: formDeptCode,
        position: formPosition,
        workEmail: formWorkEmail.trim() || generateCleanEmail(formFullName),
        password: formPassword.trim() || undefined,
        phone: formPhone.trim() || null,
        hasContract: formHasContract,
        contractType: formHasContract ? formContractType : 'Chưa ký hợp đồng',
        contractDuration: formHasContract ? formContractDuration : null,
        startDate: formStartDate || null,
        status: formStatus,
        hasInsurance: formHasInsurance,
        socialInsuranceNumber: formSocialInsuranceNumber.trim() || null,
        taxCode: formTaxCode.trim() || null,
        isMonthlySalary: formIsMonthlySalary,
        baseSalary: formBaseSalary,
        insuranceSalary: formInsuranceSalary,
        mealAllowance: formMealAllowance,
        fuelAllowance: formFuelAllowance,
        phoneAllowance: formPhoneAllowance,
        seniorityAllowance: formSeniorityAllowance,
        bankAccount: formBankAccount.trim() || null,
        bankName: formBankName.trim() || null,
      };

      const url = editingEmployee
        ? `/api/hr/employees/${editingEmployee.id}`
        : '/api/hr/employees';
      const method = editingEmployee ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.message || 'Lỗi khi lưu hồ sơ nhân sự vào cơ sở dữ liệu');
        return;
      }

      setToastMessage({
        text: editingEmployee
          ? `Đã cập nhật hồ sơ nhân sự "${formFullName.trim()}" thành công!`
          : `Đã lưu nhân sự "${formFullName.trim()}" (${data.data?.code || formCode}) thành công!`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4000);

      setIsAddOpen(false);
      setEditingEmployee(null);
      await fetchEmployees();
    } catch (err: any) {
      console.error('Error saving employee:', err);
      setSaveError(err.message || 'Không thể kết nối đến máy chủ CSDL.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = () => {
    if (!editingEmployee) return;
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!editingEmployee) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/hr/employees/${editingEmployee.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Lỗi khi xóa nhân sự');
        return;
      }

      setToastMessage({
        text: `Đã xóa nhân sự "${editingEmployee.fullName}" thành công.`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4000);

      setIsDeleteConfirmOpen(false);
      setIsAddOpen(false);
      setEditingEmployee(null);
      await fetchEmployees();
    } catch (err) {
      console.error('Lỗi khi xóa nhân sự:', err);
      alert('Không thể kết nối máy chủ.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSectionTitle = (title: string) => (
    <div
      style={{
        paddingTop: '10px',
        paddingBottom: '6px',
        borderBottom: '1px solid #e2e8f0',
        marginTop: '6px',
        marginBottom: '12px',
      }}
    >
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: 700,
          color: 'var(--color-primary, #0284c7)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </span>
    </div>
  );

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đang làm việc
          </span>
        );
      case 'probation':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Thử việc
          </span>
        );
      case 'resigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Đã nghỉ việc
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {st || '—'}
          </span>
        );
    }
  };

  const getEmployeeTypeBadge = (type: string) => {
    switch (type) {
      case 'official':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Chính thức
          </span>
        );
      case 'probation':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Thử việc
          </span>
        );
      case 'intern':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Thực tập
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
            {type || 'Chính thức'}
          </span>
        );
    }
  };

  return (
    <StandardPage
      title="Quản lý hồ sơ nhân viên"
      description="Cơ sở dữ liệu trích ngang toàn bộ cán bộ công nhân viên Công ty Seajong"
      icon="bi-people"
      color="rose"
      tickerContext="employees"
      useCard={true}
      cardPadding="p-0"
      background="#EBF0F5"
    >
      <div
        className="flex flex-col h-full flex-1 relative overflow-hidden"
        style={{
          minHeight: 0,
          height: '100%',
          flex: '1 1 0%',
        }}
      >
        {/* Toast thông báo */}
        {toastMessage && (
          <div
            className={`absolute top-3 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold transition-all animate-bounce ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle size={16} /> : <ExclamationCircle size={16} />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* ── 1. TableToolbar theo chuẩn dự án client-skydoor ── */}
        <TableToolbar
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="Tìm theo mã, tên NV, email, chức vụ..."
          searchMinWidth="240px"
          filters={[
            {
              id: 'dept-filter',
              value: department,
              onChange: (val) => {
                setDepartment(val);
                setPage(1);
              },
              minWidth: '180px',
              options: [
                { value: '', label: 'Tất cả phòng ban' },
                ...departments.map((d) => ({ value: d.code, label: d.nameVi })),
              ],
            },
            {
              id: 'status-filter',
              value: status,
              onChange: (val) => {
                setStatus(val);
                setPage(1);
              },
              minWidth: '160px',
              options: [
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Đang làm việc' },
                { value: 'probation', label: 'Thử việc' },
                { value: 'resigned', label: 'Đã nghỉ việc' },
              ],
            },
          ]}
          rightActions={
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              leftIcon={<Plus size={16} />}
              style={{
                backgroundColor: 'var(--color-primary, #0284c7)',
                color: '#fff',
                height: '34px',
                padding: '0 14px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              Thêm mới
            </Button>
          }
          showMenu={true}
          onExportExcel={() => alert('Đang xuất danh sách hồ sơ nhân viên ra tệp Excel...')}
          onPrint={() => window.print()}
          printLabel="In danh sách nhân sự"
          onRefresh={fetchEmployees}
        />

        {/* ── 2. FullWidthTable từ client-skydoor ── */}
        <FullWidthTable loading={loading} loadingText="Đang tải danh sách nhân sự...">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Phòng ban</th>
                <th>Chức vụ</th>
                <th style={{ width: 130 }}>Loại NV</th>
                <th style={{ width: 130 }}>Ngày vào làm</th>
                <th style={{ width: 150 }} className="text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <i className="bi bi-people text-4xl mb-2 opacity-40" />
                      <span className="font-semibold text-sm">Không tìm thấy nhân viên nào</span>
                      <span className="text-xs text-slate-400 mt-0.5">Thử thay đổi điều kiện tìm kiếm hoặc bộ lọc</span>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => handleOpenEdit(emp)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    title={`Bấm để xem và chỉnh sửa hồ sơ nhân sự ${emp.fullName}`}
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        {/* Avatar chuẩn Seajong: chữ cái đầu từ Họ + chữ cái đầu từ Tên */}
                        <Avatar name={emp.fullName} size="md" />

                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {emp.fullName}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {emp.code} • {emp.workEmail || emp.phone || '—'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="font-medium text-slate-800 text-xs">
                      {emp.departmentName || '—'}
                    </td>
                    <td className="font-medium text-slate-700 text-xs">
                      {emp.positionTitle || '—'}
                    </td>
                    <td>
                      {getEmployeeTypeBadge(emp.employeeType)}
                    </td>
                    <td className="text-slate-600 text-xs font-mono">
                      {emp.startDate ? new Date(emp.startDate).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="text-center">
                      {getStatusBadge(emp.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </FullWidthTable>

        {/* ── 3. Pagination từ client-skydoor ── */}
        <Pagination
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="nhân viên"
        />
      </div>

      {/* ── 4. Offcanvas Thêm mới / Chỉnh sửa hồ sơ nhân sự (400px chuẩn client-skydoor) ── */}
      <Offcanvas
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingEmployee(null);
        }}
        icon={editingEmployee ? <PencilSquare size={22} /> : <PersonPlus size={22} />}
        title={editingEmployee ? 'Chỉnh sửa hồ sơ nhân viên' : 'Thêm nhân sự mới'}
        description={
          editingEmployee
            ? `${editingEmployee.fullName} • ${editingEmployee.code}`
            : 'Khởi tạo hồ sơ cán bộ công nhân viên Công ty Seajong'
        }
        width="400px"
        closeOnBackdropClick={false}
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {editingEmployee && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteEmployee}
                  title="Xoá nhân sự"
                  style={{
                    width: '34px',
                    height: '34px',
                    minWidth: '34px',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash size={15} />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingEmployee(null);
                }}
                disabled={isSaving}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                form="add-employee-form"
                variant="primary"
                size="sm"
                isLoading={isSaving}
                disabled={isSaving}
                style={{
                  backgroundColor: 'var(--color-primary, #0284c7)',
                  color: '#fff',
                }}
              >
                {isSaving
                  ? 'Đang lưu...'
                  : editingEmployee
                  ? 'Lưu thay đổi'
                  : 'Lưu nhân sự'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="add-employee-form" onSubmit={handleSaveEmployee} className="flex flex-col gap-3">
          {saveError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <ExclamationCircle size={16} className="shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* ── 1. THÔNG TIN NHÂN SỰ CƠ BẢN ── */}
          {/* Mã nhân viên */}
          <Input
            label="Mã nhân viên"
            required
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            rightIcon={
              !editingEmployee ? (
                <button
                  type="button"
                  onClick={() => setFormCode(generateEmployeeCode())}
                  title="Tự sinh lại mã nhân viên"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--color-primary, #0284c7)',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowClockwise size={14} />
                </button>
              ) : undefined
            }
          />

          {/* Họ và tên nhân sự */}
          <Input
            label="Họ và tên nhân sự"
            required
            placeholder="Ví dụ: Nguyễn Văn An"
            value={formFullName}
            onChange={(e) => handleFullNameChange(e.target.value)}
          />

          {/* Dòng Ngày sinh, giới tính */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <Input
              label="Ngày sinh"
              type="date"
              value={formBirthDate}
              onChange={(e) => setFormBirthDate(e.target.value)}
            />
            <Select
              label="Giới tính"
              options={GENDER_OPTIONS}
              value={formGender}
              onChange={(e) => setFormGender(e.target.value)}
            />
          </div>

          {/* Dòng Số CCCD, ngày cấp */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <Input
              label="Số CCCD"
              placeholder="12 chữ số CCCD"
              value={formNationalId}
              onChange={(e) => setFormNationalId(e.target.value)}
            />
            <Input
              label="Ngày cấp CCCD"
              type="date"
              value={formNationalIdDate}
              onChange={(e) => setFormNationalIdDate(e.target.value)}
            />
          </div>

          {/* Nơi cấp */}
          <Input
            label="Nơi cấp"
            placeholder="Ví dụ: Cục Cảnh sát QLHC về TTXH"
            value={formNationalIdPlace}
            onChange={(e) => setFormNationalIdPlace(e.target.value)}
          />

          {/* Địa chỉ thường trú */}
          <Input
            label="Địa chỉ thường trú"
            placeholder="Địa chỉ hộ khẩu thường trú"
            value={formPermanentAddress}
            onChange={(e) => setFormPermanentAddress(e.target.value)}
          />

          {/* Địa chỉ tạm trú */}
          <Input
            label="Địa chỉ tạm trú"
            placeholder="Nơi ở hiện nay nếu khác thường trú"
            value={formCurrentAddress}
            onChange={(e) => setFormCurrentAddress(e.target.value)}
          />

          {/* Phòng ban trực thuộc */}
          <Select
            label="Phòng ban trực thuộc"
            required
            value={formDeptCode}
            onChange={(e) => setFormDeptCode(e.target.value)}
            options={departments.map((d) => ({
              value: d.code,
              label: d.nameVi,
            }))}
          />

          {/* Chức danh / Vị trí công việc */}
          <Select
            label="Chức danh / Vị trí công việc"
            required
            options={
              positions.length > 0
                ? positions.map((p) => ({
                    value: p.code,
                    label: p.name,
                  }))
                : [
                    { value: 'Nhân viên', label: 'Nhân viên' },
                    { value: 'Trưởng phòng', label: 'Trưởng phòng' },
                    { value: 'Quản đốc', label: 'Quản đốc' },
                  ]
            }
            value={formPosition}
            onChange={(e) => setFormPosition(e.target.value)}
          />

          {/* Email công việc */}
          <Input
            label="Email công việc"
            type="email"
            placeholder="hovaten.maphongban@seajong.com"
            value={formWorkEmail}
            onChange={(e) => setFormWorkEmail(e.target.value)}
            rightIcon={
              <button
                type="button"
                onClick={() => setFormWorkEmail(generateCleanEmail(formFullName))}
                title="Tự sinh lại email theo họ tên"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--color-primary, #0284c7)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowClockwise size={14} />
              </button>
            }
          />

          {/* Mật khẩu đăng nhập */}
          <Input
            label="Mật khẩu đăng nhập"
            isPasswordToggle
            placeholder={editingEmployee ? 'Để trống nếu không đổi mật khẩu' : 'Pass@123'}
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            helperText={
              !editingEmployee
                ? 'Mặc định cấp mật khẩu khởi tạo: Pass@123 (nhân sự có thể đổi lại sau)'
                : 'Để trống nếu giữ nguyên mật khẩu hiện tại'
            }
          />

          {/* Số điện thoại */}
          <Input
            label="Số điện thoại"
            type="tel"
            placeholder="0912.xxx.xxx"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
          />

          {/* ── 2. HỢP ĐỒNG VÀ BẢO HIỂM ── */}
          {renderSectionTitle('Hợp đồng và bảo hiểm')}

          {/* Toggle: Đã ký hợp đồng lao động */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '4px',
            }}
          >
            <Toggle
              checked={formHasContract}
              onChange={setFormHasContract}
              label="Đã ký hợp đồng lao động"
              description="Xác nhận nhân sự đã hoàn tất ký kết HĐLĐ"
            />
          </div>

          {/* Dòng: Loại hợp đồng và Thời hạn hợp đồng */}
          {formHasContract && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 115px', gap: '10px' }}>
              <Select
                label="Loại hợp đồng"
                options={CONTRACT_TYPE_OPTIONS}
                value={formContractType}
                onChange={(e) => setFormContractType(e.target.value)}
              />
              <Input
                label="Thời hạn hợp đồng"
                type="number"
                numberGroup={true}
                placeholder="12"
                value={formContractDuration}
                onChange={(e) => setFormContractDuration(e.target.value)}
                rightIcon={renderUnitSuffix('tháng')}
                style={{ paddingRight: '50px' }}
              />
            </div>
          )}

          {/* Dòng: Ngày bắt đầu & Trạng thái nhân sự */}
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px' }}>
            <Input
              label="Ngày bắt đầu"
              type="date"
              value={formStartDate}
              onChange={(e) => setFormStartDate(e.target.value)}
            />
            <Select
              label="Trạng thái nhân sự"
              options={STATUS_FORM_OPTIONS}
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
            />
          </div>

          {/* Toggle: Tham gia bảo hiểm */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '4px',
              marginTop: '4px',
            }}
          >
            <Toggle
              checked={formHasInsurance}
              onChange={setFormHasInsurance}
              label="Tham gia bảo hiểm"
              description="Đóng BHXH, BHYT, BHTN theo quy định nhà nước"
            />
          </div>

          {/* Dòng: Số sổ bảo hiểm, Mã số thuế cá nhân */}
          {formHasInsurance && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="Số sổ bảo hiểm"
                placeholder="Số sổ BHXH"
                value={formSocialInsuranceNumber}
                onChange={(e) => setFormSocialInsuranceNumber(e.target.value)}
              />
              <Input
                label="Mã số thuế cá nhân"
                placeholder="MST cá nhân"
                value={formTaxCode}
                onChange={(e) => setFormTaxCode(e.target.value)}
              />
            </div>
          )}

          {/* ── 3. LƯƠNG VÀ PHỤ CẤP ── */}
          {renderSectionTitle('Lương và phụ cấp')}

          {/* Toggle: Lương tháng */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '4px',
              marginTop: '4px',
            }}
          >
            <Toggle
              checked={formIsMonthlySalary}
              onChange={setFormIsMonthlySalary}
              label="Lương tháng"
              description={formIsMonthlySalary ? 'Hưởng lương tính theo tháng' : 'Hưởng lương tính theo ngày công'}
            />
          </div>

          {/* Dòng: Lương cơ bản, Lương đóng bảo hiểm */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Input
              label="Lương cơ bản"
              type="number"
              numberGroup={true}
              hideZero={true}
              value={formBaseSalary}
              onChange={(e) => setFormBaseSalary(e.target.value)}
              rightIcon={renderUnitSuffix(formIsMonthlySalary ? 'đ/tháng' : 'đ/ngày')}
              style={{ paddingRight: '68px' }}
            />
            <Input
              label="Lương đóng bảo hiểm"
              type="number"
              numberGroup={true}
              hideZero={true}
              value={formInsuranceSalary}
              onChange={(e) => setFormInsuranceSalary(e.target.value)}
              rightIcon={renderUnitSuffix('đ/tháng')}
              style={{ paddingRight: '68px' }}
            />
          </div>

          {/* Dòng: Phụ cấp ăn, phụ cấp xăng xe */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Input
              label="Phụ cấp ăn"
              type="number"
              numberGroup={true}
              hideZero={true}
              value={formMealAllowance}
              onChange={(e) => setFormMealAllowance(e.target.value)}
              rightIcon={renderUnitSuffix('đ/suất')}
              style={{ paddingRight: '68px' }}
            />
            <Input
              label="Phụ cấp xăng xe"
              type="number"
              numberGroup={true}
              hideZero={true}
              value={formFuelAllowance}
              onChange={(e) => setFormFuelAllowance(e.target.value)}
              rightIcon={renderUnitSuffix('đ/tháng')}
              style={{ paddingRight: '68px' }}
            />
          </div>

          {/* Dòng: Phụ cấp điện thoại, phụ cấp thâm niên */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Input
              label="Phụ cấp điện thoại"
              type="number"
              numberGroup={true}
              hideZero={true}
              value={formPhoneAllowance}
              onChange={(e) => setFormPhoneAllowance(e.target.value)}
              rightIcon={renderUnitSuffix('đ/tháng')}
              style={{ paddingRight: '68px' }}
            />
            <Input
              label="Phụ cấp thâm niên"
              type="number"
              numberGroup={true}
              hideZero={true}
              value={formSeniorityAllowance}
              onChange={(e) => setFormSeniorityAllowance(e.target.value)}
              rightIcon={renderUnitSuffix('đ/tháng')}
              style={{ paddingRight: '68px' }}
            />
          </div>

          {/* ── 4. TÀI KHOẢN NGÂN HÀNG ── */}
          {renderSectionTitle('Tài khoản ngân hàng')}

          {/* Dòng: Số tài khoản */}
          <Input
            label="Số tài khoản"
            placeholder="Nhập số tài khoản ngân hàng"
            value={formBankAccount}
            onChange={(e) => setFormBankAccount(e.target.value)}
          />

          {/* Dòng: Tên ngân hàng */}
          <Input
            label="Tên ngân hàng"
            list="vietnam-banks-list"
            placeholder="Nhập hoặc chọn ngân hàng tại Việt Nam..."
            value={formBankName}
            onChange={(e) => setFormBankName(e.target.value)}
            autoComplete="off"
          />
          <datalist id="vietnam-banks-list">
            {VIETNAM_BANKS.map((bank, index) => (
              <option key={index} value={bank} />
            ))}
          </datalist>
        </form>
      </Offcanvas>

      {/* ── 5. ConfirmDialog xác nhận xóa nhân sự thay thế window.confirm ── */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => !isDeleting && setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        variant="danger"
        title="Xác nhận xóa hồ sơ nhân sự"
        message={
          <div>
            Bạn có chắc chắn muốn xóa hồ sơ nhân sự{' '}
            <strong className="text-slate-900 font-bold">"{editingEmployee?.fullName}"</strong>
            {editingEmployee?.code ? (
              <>
                {' '}
                <span className="font-mono text-slate-500 font-semibold">({editingEmployee.code})</span>
              </>
            ) : null}{' '}
            khỏi cơ sở dữ liệu không?
          </div>
        }
        warningNote="Hành động này không thể hoàn tác. Toàn bộ thông tin hồ sơ và tài khoản truy cập liên quan sẽ bị xóa vĩnh viễn khỏi hệ thống."
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
      />
    </StandardPage>
  );
};

export default EmployeesPage;
