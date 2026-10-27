import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CupHot,
  ExclamationTriangle,
  LightningCharge,
  Save,
  ArrowCounterclockwise,
  Buildings,
  ChevronDown,
  ChevronUp,
  Check2,
  Tools,
} from 'react-bootstrap-icons';
import { Button, Input, Select, Toggle, Badge, ConfirmDialog } from '../../../components/common';


export const formatNumberGroup = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/[^\d]/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
};

export const parseNumberGroup = (val: string): number => {
  const cleaned = val.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

export interface LaborRulesViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

// Định nghĩa cấu trúc dữ liệu cấu hình Nội quy lao động
export interface ShiftConfig {
  id: string;
  name: string;
  departmentScope: string;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  workHours: number;
  standardWorkdays: number;
  checkInEarlyLimitMinutes: number;
  checkOutLateLimitMinutes: number;
  appliedDays: string[];
}

export interface LunchRuleConfig {
  lunchStart: string;
  lunchEnd: string;
  lunchDurationMinutes: number;
  requireFingerprintPunch: boolean;
  autoDeductLunchDuration: boolean;
  lunchDeadlineMorning: string;
  dinnerDeadlineAfternoon: string;
  mealAllowancePerMeal: number;
  missedMealPenalty: number;
}

export interface AttendanceViolationRule {
  id: string;
  level: string;
  fromMinutes: number;
  toMinutes: number;
  penaltyAmount: number;
  deductWorkday: number;
  allowMakeupHours: boolean;
  note: string;
}

export interface OvertimeRuleConfig {
  weekdayRatePercent: number;
  weekendRatePercent: number;
  holidayRatePercent: number;
  nightBonusPercent: number;
  nightStartHour: string;
  nightEndHour: string;
  requirePreApproval: boolean;
  minOtMinutesRequired: number;
  roundStepMinutes: number;
  dinnerSupportThresholdHours: number;
  dinnerAllowanceAmount: number;
  nightTransportSupportAmount: number;
  maxMonthlyOtHours: number;
}

export interface LaborRulesData {
  shifts: ShiftConfig[];
  selectedShiftId: string;
  lunchRule: LunchRuleConfig;
  gracePeriodMinutes: number;
  maxGraceTimesPerMonth: number;
  explanationDeadlineHours: number;
  violationPenaltyMode: 'deduct_workday' | 'penalty_money';
  violationRules: AttendanceViolationRule[];
  overtimeRule: OvertimeRuleConfig;
  lastUpdated: string;
  updatedBy: string;
}

const DEFAULT_LABOR_RULES: LaborRulesData = {
  selectedShiftId: 'shift-office',
  shifts: [
    {
      id: 'shift-office',
      name: 'Khối hành chính văn phòng',
      departmentScope: 'Phòng kinh doanh, Phòng tài chính, Hành chính nhân sự, Ban điều hành',
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '13:30',
      afternoonEnd: '17:30',
      workHours: 8,
      standardWorkdays: 26,
      checkInEarlyLimitMinutes: 60,
      checkOutLateLimitMinutes: 120,
      appliedDays: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    },
    {
      id: 'shift-factory-1',
      name: 'Khối sản xuất',
      departmentScope: 'Phân xưởng đúc sen vòi, Gia công cơ khí, Lắp ráp, Kho vận và Kỹ thuật',
      morningStart: '07:30',
      morningEnd: '11:30',
      afternoonStart: '12:30',
      afternoonEnd: '16:30',
      workHours: 8,
      standardWorkdays: 26,
      checkInEarlyLimitMinutes: 60,
      checkOutLateLimitMinutes: 180,
      appliedDays: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    },
  ],
  lunchRule: {
    lunchStart: '12:00',
    lunchEnd: '13:30',
    lunchDurationMinutes: 90,
    requireFingerprintPunch: false,
    autoDeductLunchDuration: true,
    lunchDeadlineMorning: '09:00',
    dinnerDeadlineAfternoon: '15:30',
    mealAllowancePerMeal: 35000,
    missedMealPenalty: 35000,
  },
  gracePeriodMinutes: 30,
  maxGraceTimesPerMonth: 3,
  explanationDeadlineHours: 48,
  violationPenaltyMode: 'deduct_workday',
  violationRules: [
    {
      id: 'rule-light',
      level: 'Vi phạm nhẹ (Ân hạn)',
      fromMinutes: 1,
      toMinutes: 30,
      penaltyAmount: 50000,
      deductWorkday: 0,
      allowMakeupHours: true,
      note: 'Trong mức ân hạn cho phép ≤ 30 phút, đủ 0,5 công',
    },
    {
      id: 'rule-medium',
      level: 'Vi phạm trung bình',
      fromMinutes: 31,
      toMinutes: 60,
      penaltyAmount: 100000,
      deductWorkday: 0.125,
      allowMakeupHours: false,
      note: 'Trừ 0,125 công (hưởng 75% ca = 0,375 công) hoặc phạt 100.000 đ',
    },
    {
      id: 'rule-heavy',
      level: 'Vi phạm nặng',
      fromMinutes: 61,
      toMinutes: 120,
      penaltyAmount: 150000,
      deductWorkday: 0.25,
      allowMakeupHours: false,
      note: 'Trừ 0,250 công (hưởng 50% ca = 0,250 công) hoặc phạt 150.000 đ',
    },
    {
      id: 'rule-critical',
      level: 'Vắng ca không phép',
      fromMinutes: 121,
      toMinutes: 240,
      penaltyAmount: 200000,
      deductWorkday: 0.5,
      allowMakeupHours: false,
      note: 'Không tính công ca này (trừ trọn 0,5 công ca vi phạm)',
    },
  ],
  overtimeRule: {
    weekdayRatePercent: 150,
    weekendRatePercent: 200,
    holidayRatePercent: 300,
    nightBonusPercent: 30,
    nightStartHour: '22:00',
    nightEndHour: '06:00',
    requirePreApproval: true,
    minOtMinutesRequired: 30,
    roundStepMinutes: 15,
    dinnerSupportThresholdHours: 2,
    dinnerAllowanceAmount: 35000,
    nightTransportSupportAmount: 50000,
    maxMonthlyOtHours: 40,
  },
  lastUpdated: '04/10/2026 11:30',
  updatedBy: 'Ban Giám đốc',
};

export const LaborRulesView: React.FC<LaborRulesViewProps> = ({ onShowToast }) => {
  const [rules, setRules] = useState<LaborRulesData>(DEFAULT_LABOR_RULES);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isShiftDropdownOpen, setIsShiftDropdownOpen] = useState<boolean>(false);
  const shiftDropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shiftDropdownRef.current && !shiftDropdownRef.current.contains(event.target as Node)) {
        setIsShiftDropdownOpen(false);
      }
    };
    if (isShiftDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isShiftDropdownOpen]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Nạp dữ liệu cấu hình từ backend API hoặc localStorage khi mount
  useEffect(() => {
    fetch('/api/labor-rules')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải cấu hình từ máy chủ');
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === 'object') {
          setRules({ ...DEFAULT_LABOR_RULES, ...data });
        } else {
          const cached = localStorage.getItem('seajong_labor_rules');
          if (cached) {
            try {
              setRules(JSON.parse(cached));
            } catch {
              // fallback
            }
          }
        }
      })
      .catch(() => {
        const cached = localStorage.getItem('seajong_labor_rules');
        if (cached) {
          try {
            setRules(JSON.parse(cached));
          } catch {
            // fallback
          }
        }
      });
  }, []);

  const currentShift = rules.shifts.find((s) => s.id === rules.selectedShiftId) || rules.shifts[0];

  const updateCurrentShift = (field: keyof ShiftConfig, value: any) => {
    setHasChanges(true);
    setRules((prev) => ({
      ...prev,
      shifts: prev.shifts.map((s) => (s.id === prev.selectedShiftId ? { ...s, [field]: value } : s)),
    }));
  };

  const updateLunchRule = (field: keyof LunchRuleConfig, value: any) => {
    setHasChanges(true);
    setRules((prev) => ({
      ...prev,
      lunchRule: { ...prev.lunchRule, [field]: value },
    }));
  };

  const updateOvertimeRule = (field: keyof OvertimeRuleConfig, value: any) => {
    setHasChanges(true);
    setRules((prev) => ({
      ...prev,
      overtimeRule: { ...prev.overtimeRule, [field]: value },
    }));
  };

  const updateViolationRule = (id: string, field: keyof AttendanceViolationRule, value: any) => {
    setHasChanges(true);
    setRules((prev) => ({
      ...prev,
      violationRules: prev.violationRules.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
  };

  const updateViolationUpperLimit = (index: number, newUpperLimit: number) => {
    setHasChanges(true);
    setRules((prev) => {
      const list = prev.violationRules.map((r) => ({ ...r }));
      if (index >= 0 && index < list.length) {
        list[index].toMinutes = newUpperLimit;
        if (index + 1 < list.length) {
          list[index + 1].fromMinutes = newUpperLimit + 1;
        }
        if (index === 0) {
          return {
            ...prev,
            gracePeriodMinutes: newUpperLimit,
            violationRules: list,
          };
        }
      }
      return { ...prev, violationRules: list };
    });
  };

  const handleSave = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận lưu quy chế',
      message: 'Bạn có muốn lưu và áp dụng toàn bộ thông số nội quy lao động này vào hệ thống Seajong không?',
      confirmText: 'Lưu cấu hình',
      cancelText: 'Huỷ',
      type: 'info',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        executeSave();
      },
    });
  };

  const executeSave = async () => {
    setIsSaving(true);
    const updatedData: LaborRulesData = {
      ...rules,
      lastUpdated: new Date().toLocaleDateString('vi-VN'),
      updatedBy: 'Lê Công Vụ - Giám đốc',
    };

    try {
      localStorage.setItem('seajong_labor_rules', JSON.stringify(updatedData));
      const res = await fetch('/api/labor-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) throw new Error('Máy chủ phản hồi lỗi');

      setRules(updatedData);
      setHasChanges(false);
      if (onShowToast) {
        onShowToast('success', 'Lưu thành công', 'Đã lưu toàn bộ thông số nội quy lao động vào hệ thống');
      } else {
        setConfirmDialog({
          isOpen: true,
          title: 'Lưu thành công',
          message: 'Đã lưu thành công các thông số nội quy lao động vào hệ thống Seajong',
          confirmText: 'Đóng',
          type: 'success',
          onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'Lỗi lưu dữ liệu', err?.message || 'Không thể kết nối máy chủ');
      } else {
        setConfirmDialog({
          isOpen: true,
          title: 'Lỗi lưu dữ liệu',
          message: 'Không thể kết nối máy chủ. Cấu hình đã được lưu tạm vào bộ nhớ trình duyệt.',
          confirmText: 'Đóng',
          type: 'danger',
          onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Khôi phục nội quy mặc định',
      message: 'Bạn có chắc chắn muốn khôi phục toàn bộ nội quy lao động về giá trị tiêu chuẩn mặc định không?',
      confirmText: 'Đồng ý',
      cancelText: 'Huỷ',
      type: 'warning',
      onConfirm: () => {
        setRules(DEFAULT_LABOR_RULES);
        setHasChanges(true);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        if (onShowToast) {
          onShowToast('info', 'Khôi phục mặc định', 'Đã chuyển về các thông số nội quy tiêu chuẩn');
        }
      },
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px 16px 18px',
        fontFamily: "'Roboto Condensed', sans-serif",
      }}
    >
            {/* ── 1. HEADER: DROPLIST KHỐI LÀM VIỆC VÀ NÚT LƯU CẤU HÌNH (CHUẨN HÌNH 1) ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '8px 14px',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1.5px solid #bfdbfe',
          boxShadow: '0 1px 4px rgba(59, 130, 246, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', minWidth: 0 }}>
          {/* Icon tròn màu tím xanh nhạt */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {rules.selectedShiftId === 'shift-factory-1' ? (
              <Tools size={17} color="#4f46e5" />
            ) : (
              <Buildings size={18} color="#4f46e5" />
            )}
          </div>

          <div ref={shiftDropdownRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            {/* Nhãn thông báo */}
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                lineHeight: 1.1,
                marginBottom: '1px',
              }}
            >
              ĐANG CẤU HÌNH CHO KHỐI LÀM VIỆC:
            </div>

            {/* Dòng tên khối + duy nhất 1 mũi tên xổ xuống */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minHeight: '26px' }}>
              <button
                type="button"
                onClick={() => setIsShiftDropdownOpen((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '1.0625rem',
                  fontWeight: 800,
                  color: '#4f46e5',
                  lineHeight: 1.2,
                  background: 'transparent',
                  border: 'none',
                  padding: '2px 0',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Nhấp để chuyển đổi khối làm việc"
              >
                <span>{currentShift?.name || 'Khối hành chính văn phòng'}</span>
                {isShiftDropdownOpen ? (
                  <ChevronUp size={13} color="#4f46e5" style={{ flexShrink: 0 }} />
                ) : (
                  <ChevronDown size={13} color="#4f46e5" style={{ flexShrink: 0 }} />
                )}
              </button>

              {hasChanges && (
                <Badge variant="warning" style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>
                  Chưa lưu thay đổi
                </Badge>
              )}
            </div>

            {/* Phạm vi hiển thị bằng dòng chữ nhỏ bên dưới tên khối */}
            {currentShift?.departmentScope && (
              <div
                style={{
                  fontSize: '0.7188rem',
                  color: '#64748b',
                  lineHeight: 1.3,
                  marginTop: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>Phạm vi:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>{currentShift.departmentScope}</span>
              </div>
            )}

            {/* Popover menu xổ xuống mở rộng hết không gian khả dụng - Chuẩn Hình 1 */}
            {isShiftDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  width: '100%',
                  marginTop: '6px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #cbd5e1',
                  zIndex: 1000,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Danh sách khối quy chế lao động ({rules.shifts.length})
                </div>

                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {rules.shifts.map((shift) => {
                    const isSelected = shift.id === rules.selectedShiftId;
                    return (
                      <div
                        key={shift.id}
                        onClick={() => {
                          setRules((prev) => ({ ...prev, selectedShiftId: shift.id }));
                          setIsShiftDropdownOpen(false);
                        }}
                        style={{
                          padding: '8px 14px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          borderLeft: isSelected ? '3px solid #4f46e5' : '3px solid transparent',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: isSelected ? 800 : 600,
                              color: isSelected ? '#4f46e5' : '#1e293b',
                            }}
                          >
                            {shift.name}
                          </span>
                          {isSelected && <Check2 size={16} color="#4f46e5" style={{ flexShrink: 0 }} />}
                        </div>

                        {shift.departmentScope ? (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#64748b',
                              marginTop: '2px',
                              lineHeight: 1.3,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ flexShrink: 0, fontWeight: 500 }}>Phạm vi:</span>
                            <span style={{ color: '#475569' }}>{shift.departmentScope}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                            Chưa cập nhật phạm vi phòng ban
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cụm nút hành động bên phải: Khôi phục mặc định và Lưu cấu hình */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<ArrowCounterclockwise size={13} color="#4f46e5" />}
            onClick={handleResetDefaults}
            disabled={isSaving}
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#4f46e5',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              padding: '4px 10px',
            }}
            title="Khôi phục thông số tiêu chuẩn mặc định"
          >
            Khôi phục mặc định
          </Button>

          <div style={{ width: '1px', height: '22px', backgroundColor: '#e2e8f0' }} />

          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Save size={14} />}
            onClick={handleSave}
            disabled={isSaving}
            style={{
              backgroundColor: '#4f46e5',
              borderColor: '#4f46e5',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.8125rem',
              padding: '6px 14px',
              borderRadius: '6px',
              boxShadow: '0 2px 5px rgba(79, 70, 229, 0.25)',
            }}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu cấu hình quy chế'}
          </Button>
        </div>
      </div>

      {/* ── 3. LƯỚI 4 CARD CẤU HÌNH CHUYÊN SÂU (CHUẨN FORM HÌNH 1) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '14px' }}>

        {/* ── CARD 1: THỜI GIAN LÀM VIỆC THEO CA ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <Clock size={16} />
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                  Thời gian làm việc theo ca
                </h5>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Khung giờ vào và hết ca sáng, chiều</span>
              </div>
            </div>

            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #dbeafe',
              }}
            >
              {formatNumberGroup(currentShift.workHours)}h chuẩn • {formatNumberGroup(currentShift.standardWorkdays)} công
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Giờ vào ca sáng:
              </label>
              <Input
                type="time"
                value={currentShift.morningStart}
                onChange={(e) => updateCurrentShift('morningStart', e.target.value)}
                style={{ marginBottom: 0, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Giờ hết ca sáng:
              </label>
              <Input
                type="time"
                value={currentShift.morningEnd}
                onChange={(e) => updateCurrentShift('morningEnd', e.target.value)}
                style={{ marginBottom: 0, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Giờ vào ca chiều:
              </label>
              <Input
                type="time"
                value={currentShift.afternoonStart}
                onChange={(e) => updateCurrentShift('afternoonStart', e.target.value)}
                style={{ marginBottom: 0, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Giờ hết ca chiều:
              </label>
              <Input
                type="time"
                value={currentShift.afternoonEnd}
                onChange={(e) => updateCurrentShift('afternoonEnd', e.target.value)}
                style={{ marginBottom: 0, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Số giờ làm việc tiêu chuẩn:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(currentShift.workHours)}
                onChange={(e) => updateCurrentShift('workHours', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>giờ</span>}
                style={{ marginBottom: 0, fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Số ngày công chuẩn/tháng (N_std = Ngày tháng - CN):
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(currentShift.standardWorkdays)}
                onChange={(e) => updateCurrentShift('standardWorkdays', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>công</span>}
                style={{ marginBottom: 0, fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Cho phép quẹt vào sớm:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(currentShift.checkInEarlyLimitMinutes)}
                onChange={(e) => updateCurrentShift('checkInEarlyLimitMinutes', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>phút</span>}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Cho phép quẹt về trễ:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(currentShift.checkOutLateLimitMinutes)}
                onChange={(e) => updateCurrentShift('checkOutLateLimitMinutes', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>phút</span>}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          {/* Dãy ngày áp dụng trong tuần */}
          <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
            <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Ngày làm việc áp dụng trong tuần:
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((dow) => {
                const isApplied = currentShift.appliedDays?.includes(dow);
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => {
                      const currentDays = currentShift.appliedDays || [];
                      const nextDays = isApplied ? currentDays.filter((d) => d !== dow) : [...currentDays, dow];
                      updateCurrentShift('appliedDays', nextDays);
                    }}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '5px',
                      fontSize: '0.7188rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isApplied ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                      backgroundColor: isApplied ? '#eff6ff' : '#f8fafc',
                      color: isApplied ? '#1d4ed8' : '#94a3b8',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {dow === 'CN' ? 'Chủ nhật' : dow}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CARD 2: QUY CHẾ RA TRƯA VÀ SUẤT ĂN ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <CupHot size={16} />
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                  Quy chế nghỉ trưa và suất ăn
                </h5>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Thời gian nghỉ trưa, quẹt thẻ và trợ cấp cơm</span>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
              <Toggle
                checked={rules.lunchRule.autoDeductLunchDuration}
                onChange={(checked) => updateLunchRule('autoDeductLunchDuration', checked)}
              />
              <span>{rules.lunchRule.autoDeductLunchDuration ? 'Tự trừ 60p' : 'Theo quẹt'}</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Giờ bắt đầu nghỉ trưa:
              </label>
              <Input
                type="time"
                value={rules.lunchRule.lunchStart}
                onChange={(e) => updateLunchRule('lunchStart', e.target.value)}
                style={{ marginBottom: 0, fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Giờ kết thúc nghỉ trưa:
              </label>
              <Input
                type="time"
                value={rules.lunchRule.lunchEnd}
                onChange={(e) => updateLunchRule('lunchEnd', e.target.value)}
                style={{ marginBottom: 0, fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Thời lượng nghỉ trưa chuẩn:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.lunchRule.lunchDurationMinutes)}
                onChange={(e) => updateLunchRule('lunchDurationMinutes', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>phút</span>}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Mức trợ cấp suất ăn công ty:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.lunchRule.mealAllowancePerMeal)}
                onChange={(e) => updateLunchRule('mealAllowancePerMeal', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>đ/suất</span>}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Giờ chốt cơm trưa:
              </label>
              <Input
                type="time"
                value={rules.lunchRule.lunchDeadlineMorning}
                onChange={(e) => updateLunchRule('lunchDeadlineMorning', e.target.value)}
                style={{ marginBottom: 0, fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Giờ chốt cơm tối tăng ca:
              </label>
              <Input
                type="time"
                value={rules.lunchRule.dinnerDeadlineAfternoon}
                onChange={(e) => updateLunchRule('dinnerDeadlineAfternoon', e.target.value)}
                style={{ marginBottom: 0, fontSize: '0.8125rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7188rem', fontWeight: 600, color: '#334155' }}>
              Bắt buộc phải điểm danh khi hết ca
            </span>
            <Toggle
              checked={rules.lunchRule.requireFingerprintPunch}
              onChange={(checked) => updateLunchRule('requireFingerprintPunch', checked)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>
              Phạt nếu đăng ký ăn nhưng bỏ suất:
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatNumberGroup(rules.lunchRule.missedMealPenalty)}
              onChange={(e) => updateLunchRule('missedMealPenalty', parseNumberGroup(e.target.value))}
              rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>đ mỗi suất</span>}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        {/* ── CARD 3: XỬ LÝ VI PHẠM ĐI MUỘN VÀ VỀ SỚM ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <ExclamationTriangle size={16} />
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                  Xử lý vi phạm đi muộn và về sớm
                </h5>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Các mức phạt dưới đây được áp dụng cho từng ca sáng hoặc chiều</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Lựa chọn một trong 2 cách: Trừ công hoặc Phạt tiền */}
              <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <button
                  type="button"
                  onClick={() => {
                    setHasChanges(true);
                    setRules((prev) => ({ ...prev, violationPenaltyMode: 'deduct_workday' }));
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: rules.violationPenaltyMode !== 'penalty_money' ? '#4f46e5' : 'transparent',
                    color: rules.violationPenaltyMode !== 'penalty_money' ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Trừ công
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasChanges(true);
                    setRules((prev) => ({ ...prev, violationPenaltyMode: 'penalty_money' }));
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: rules.violationPenaltyMode === 'penalty_money' ? '#4f46e5' : 'transparent',
                    color: rules.violationPenaltyMode === 'penalty_money' ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Phạt tiền
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Thời gian ân hạn không phạt:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.gracePeriodMinutes)}
                onChange={(e) => {
                  const val = parseNumberGroup(e.target.value);
                  updateViolationUpperLimit(0, val);
                }}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>phút</span>}
                style={{ marginBottom: 0, fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Số lần ân hạn cho phép:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.maxGraceTimesPerMonth)}
                onChange={(e) => {
                  setHasChanges(true);
                  setRules((prev) => ({ ...prev, maxGraceTimesPerMonth: parseNumberGroup(e.target.value) }));
                }}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>lần/tháng</span>}
                style={{ marginBottom: 0, fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Thời hạn nộp giải trình:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.explanationDeadlineHours)}
                onChange={(e) => {
                  setHasChanges(true);
                  setRules((prev) => ({ ...prev, explanationDeadlineHours: parseNumberGroup(e.target.value) }));
                }}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>giờ</span>}
                style={{ marginBottom: 0, fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Bảng 4 cấp độ vi phạm theo định mức 0,5 công/ca */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7188rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '7px 10px', fontWeight: 700, color: '#475569' }}>Cấp độ</th>
                  <th style={{ padding: '7px 10px', fontWeight: 700, color: '#475569' }}>Thời gian vi phạm</th>
                  {rules.violationPenaltyMode === 'penalty_money' ? (
                    <th
                      style={{
                        padding: '7px 10px',
                        fontWeight: 700,
                        color: '#b91c1c',
                        backgroundColor: '#fef2f2',
                      }}
                    >
                      Phạt tiền (VNĐ)
                    </th>
                  ) : (
                    <th
                      style={{
                        padding: '7px 10px',
                        fontWeight: 700,
                        color: '#4338ca',
                        backgroundColor: '#eef2ff',
                      }}
                    >
                      Trừ công
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rules.violationRules.map((r, index) => {
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 700, color: '#1e293b' }}>{r.level}</td>
                      <td style={{ padding: '6px 10px', color: '#334155' }}>
                        {index < 3 ? (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span
                              style={{
                                width: '38px',
                                textAlign: 'right',
                                fontSize: '0.72rem',
                                color: '#64748b',
                                marginRight: '6px',
                                flexShrink: 0,
                              }}
                            >
                              {index === 0 ? '≤' : `${r.fromMinutes} -`}
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumberGroup(r.toMinutes)}
                              onChange={(e) => updateViolationUpperLimit(index, parseNumberGroup(e.target.value))}
                              style={{
                                width: '48px',
                                padding: '2px 4px',
                                fontSize: '0.75rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                fontWeight: 700,
                                color: '#0f172a',
                                textAlign: 'center',
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>phút</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span
                              style={{
                                width: '38px',
                                textAlign: 'right',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#dc2626',
                                marginRight: '6px',
                                flexShrink: 0,
                              }}
                            >
                              &gt;
                            </span>
                            <span
                              style={{
                                width: '48px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#dc2626',
                                textAlign: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {r.fromMinutes - 1}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#dc2626', marginLeft: '6px' }}>phút</span>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginLeft: '4px' }}>(bỏ ca)</span>
                          </div>
                        )}
                      </td>
                      {rules.violationPenaltyMode === 'penalty_money' ? (
                        <td
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#fff5f5',
                          }}
                        >
                          <input
                            type="text"
                            value={formatNumberGroup(r.penaltyAmount)}
                            onChange={(e) => updateViolationRule(r.id, 'penaltyAmount', parseNumberGroup(e.target.value))}
                            style={{
                              width: '100px',
                              padding: '3px 6px',
                              fontSize: '0.75rem',
                              border: '1.5px solid #ef4444',
                              borderRadius: '4px',
                              fontWeight: 700,
                              color: '#dc2626',
                            }}
                          />
                        </td>
                      ) : (
                        <td
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#f5f3ff',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              step="0.025"
                              min="0"
                              max="0.5"
                              value={r.deductWorkday}
                              onChange={(e) => updateViolationRule(r.id, 'deductWorkday', Math.min(0.5, parseFloat(e.target.value) || 0))}
                              style={{
                                width: '70px',
                                padding: '3px 6px',
                                fontSize: '0.75rem',
                                border: '1.5px solid #4f46e5',
                                borderRadius: '4px',
                                fontWeight: 700,
                                color: '#4f46e5',
                              }}
                            />
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>công / ca</span>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── CARD 4: HỆ SỐ LÀM THÊM GIỜ (OT) ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7e22ce' }}>
                <LightningCharge size={16} />
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                  Hệ số làm thêm giờ
                </h5>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Tỷ lệ tiền lương tăng ca theo Bộ luật LĐ</span>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
              <Toggle
                checked={rules.overtimeRule.requirePreApproval}
                onChange={(checked) => updateOvertimeRule('requirePreApproval', checked)}
              />
              <span>{rules.overtimeRule.requirePreApproval ? 'Duyệt trước' : 'Tự do'}</span>
            </label>
          </div>

          {/* 3 tỷ lệ tính lương OT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Ngày thường:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.overtimeRule.weekdayRatePercent)}
                onChange={(e) => updateOvertimeRule('weekdayRatePercent', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 6px', fontSize: '0.75rem', color: '#64748b' }}>%</span>}
                style={{ marginBottom: 0, fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Chủ nhật:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.overtimeRule.weekendRatePercent)}
                onChange={(e) => updateOvertimeRule('weekendRatePercent', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 6px', fontSize: '0.75rem', color: '#64748b' }}>%</span>}
                style={{ marginBottom: 0, fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Lễ, Tết:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.overtimeRule.holidayRatePercent)}
                onChange={(e) => updateOvertimeRule('holidayRatePercent', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 6px', fontSize: '0.75rem', color: '#64748b' }}>%</span>}
                style={{ marginBottom: 0, fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Phụ cấp ca đêm (22:00 - 06:00):
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.overtimeRule.nightBonusPercent)}
                onChange={(e) => updateOvertimeRule('nightBonusPercent', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>% lương</span>}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Suất ăn tối tăng ca (OT ≥ 2h):
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.overtimeRule.dinnerAllowanceAmount)}
                onChange={(e) => updateOvertimeRule('dinnerAllowanceAmount', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>đ/suất</span>}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Hỗ trợ đi lại ban đêm:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.overtimeRule.nightTransportSupportAmount)}
                onChange={(e) => updateOvertimeRule('nightTransportSupportAmount', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>đ/lượt</span>}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Giới hạn giờ làm thêm tối đa:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(rules.overtimeRule.maxMonthlyOtHours)}
                onChange={(e) => updateOvertimeRule('maxMonthlyOtHours', parseNumberGroup(e.target.value))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>giờ/tháng</span>}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Hộp thoại thông báo và xác nhận quy chế */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || 'Đồng ý'}
        cancelText={confirmDialog.cancelText || 'Huỷ'}
        type={confirmDialog.type || 'warning'}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
