import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactApexChart from "react-apexcharts";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check2,
  InfoCircle,
  Files,
  Check2Circle,
  PlusLg,
  Telephone,
  Envelope,
  GeoAlt,
  ExclamationCircle,
  Trash,
} from "react-bootstrap-icons";
import { StepPage } from "../../components/common/StepPage";
import { FullWidthTable } from "../../components/common/FullWidthTable";
import { Button } from "../../components/common/Button";
import { Toggle } from "../../components/common/Toggle";
import { Offcanvas } from "../../components/common/Offcanvas";
import { useDepartment } from "../../context/DepartmentContext";
import type { ModernStepItem } from "../../types";

interface KpiCriteriaRow {
  id?: string;
  name: string;
  target: string;
  actual: string;
  weight: string;
  score?: string;
}

export const SalesInternalReportsPage: React.FC = () => {
  const { data: session } = useSession();
  const { activeDeptCode } = useDepartment();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [employee, setEmployee] = useState<any>(null);
  const [positions, setPositions] = useState<{ code: string; name: string }[]>([]);
  const [workLocations, setWorkLocations] = useState<{ code: string; name: string }[]>([]);
  const [reportMonth, setReportMonth] = useState<Date>(new Date());
  const [salesEmployees, setSalesEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [applyAllYear, setApplyAllYear] = useState<boolean>(false);
  const [step1KpiConfig, setStep1KpiConfig] = useState<KpiCriteriaRow[]>([]);
  const [step2KpiConfig, setStep2KpiConfig] = useState<KpiCriteriaRow[]>([]);
  const [incomeData, setIncomeData] = useState({
    baseSalary: 0,
    performanceBonus: 0,
    allowance: 0,
    salesCommission: 0,
    insuranceDeduction: 0,
    advanceDeduction: 0,
    totalIncome: 0,
    actualWorkingDays: 0,
    mealCount: 0,
  });
  const [yearlyKpi, setYearlyKpi] = useState<(number | null)[]>(Array(12).fill(null));
  const [showRules, setShowRules] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [empDropdownOpen, setEmpDropdownOpen] = useState<boolean>(false);
  const empDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (empDropdownRef.current && !empDropdownRef.current.contains(e.target as Node)) {
        setEmpDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handlePrevMonth = () =>
    setReportMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () =>
    setReportMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  useEffect(() => {
    fetch("/api/board/categories?type=position")
      .then((r) => r.json())
      .then((d) => setPositions(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch("/api/board/categories?type=dia_diem_lam_viec")
      .then((r) => r.json())
      .then((d) => setWorkLocations(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch("/api/hr/employees?pageSize=1000")
      .then((r) => r.json())
      .then((d) => {
        if (d?.employees) {
          const salesEmp = d.employees.filter(
            (e: any) =>
              e.departmentName && e.departmentName.toLowerCase().includes("kinh doanh")
          );
          setSalesEmployees(salesEmp);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (salesEmployees.length > 0 && positions.length > 0 && !selectedEmployeeId) {
      const currentUserEmail = (session?.user as any)?.email;
      let matchedEmployee = null;
      if (currentUserEmail) {
        matchedEmployee = salesEmployees.find(
          (e) =>
            e.workEmail?.toLowerCase() === currentUserEmail.toLowerCase() ||
            e.personalEmail?.toLowerCase() === currentUserEmail.toLowerCase()
        );
      }

      if (matchedEmployee) {
        setSelectedEmployeeId(matchedEmployee.id);
      } else {
        const staffEmployees = salesEmployees.filter((e) => {
          const posCode = e.position;
          const pos = positions.find((p) => p.code === posCode);
          const posName = pos ? pos.name.toLowerCase() : "nhân viên";
          return !posName.includes("trưởng phòng") && !posName.includes("phó phòng");
        });
        if (staffEmployees.length > 0) {
          setSelectedEmployeeId(staffEmployees[0].id);
        }
      }
    }
  }, [salesEmployees, positions, selectedEmployeeId, session]);

  useEffect(() => {
    const month = reportMonth.getMonth() + 1;
    const year = reportMonth.getFullYear();
    const ts = Date.now();

    // Fetch Manager Report
    fetch(
      `/api/sales/internal-reports/reports?month=${month}&year=${year}&type=MANAGER&_t=${ts}`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) {
          const formatCriteria = (c: any): KpiCriteriaRow => ({
            id: c.id,
            name: c.name,
            target: Number(c.target || 0).toLocaleString("en-US"),
            actual: Number(c.actual || 0).toLocaleString("en-US"),
            weight: c.weight + "%",
            score: String(c.score ?? 0),
          });
          setStep1KpiConfig(d.data.map(formatCriteria));
        }
      })
      .catch(console.error);

    // Fetch Staff Report
    let staffUrl = `/api/sales/internal-reports/reports?month=${month}&year=${year}&type=STAFF&_t=${ts}`;
    const targetEmployeeId = selectedEmployeeId || employee?.id;
    if (targetEmployeeId) {
      staffUrl += `&employeeId=${targetEmployeeId}`;
    }
    fetch(staffUrl, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) {
          const formatCriteria = (c: any): KpiCriteriaRow => ({
            id: c.id,
            name: c.name,
            target: Number(c.target || 0).toLocaleString("en-US"),
            actual: Number(c.actual || 0).toLocaleString("en-US"),
            weight: c.weight + "%",
            score: String(c.score ?? 0),
          });
          setStep2KpiConfig(d.data.map(formatCriteria));
        }
      })
      .catch(console.error);

    // Fetch Income
    let incomeUrl = `/api/sales/internal-reports/income?month=${month}&year=${year}&type=${
      currentStep === 1 ? "MANAGER" : "STAFF"
    }&_t=${ts}`;
    if (targetEmployeeId) incomeUrl += `&employeeId=${targetEmployeeId}`;
    fetch(incomeUrl, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) setIncomeData(d.data);
      })
      .catch(console.error);

    // Fetch Yearly KPI dynamically for all past months up to current month
    const currentMonthNum = new Date().getMonth() + 1;
    const fetchPromises = [];
    for (let i = 1; i <= currentMonthNum; i++) {
      let mUrl = `/api/sales/internal-reports/reports?month=${i}&year=${year}&type=${
        currentStep === 1 ? "MANAGER" : "STAFF"
      }&_t=${ts}`;
      if (targetEmployeeId) mUrl += `&employeeId=${targetEmployeeId}`;
      fetchPromises.push(fetch(mUrl, { cache: "no-store" }).then((r) => r.json()));
    }

    Promise.all(fetchPromises)
      .then((results) => {
        const newYearlyKpi: (number | null)[] = Array(12).fill(null);
        results.forEach((d, idx) => {
          if (d?.success && d.data) {
            const parseNumber = (str: string) =>
              Number(str.replace(/,/g, "").replace(/%/g, "").trim());
            const score = d.data.reduce((sum: number, item: any) => {
              const target = parseNumber(String(item.target));
              const actual = parseNumber(String(item.actual));
              const weight = parseNumber(String(item.weight));
              if (target === 0 || isNaN(target) || isNaN(actual) || isNaN(weight)) return sum;
              const itemScore = Math.min(weight, (actual / target) * weight);
              return sum + itemScore;
            }, 0);
            newYearlyKpi[idx] = Math.min(100, Math.round(score * 10) / 10);
          } else {
            newYearlyKpi[idx] = 0;
          }
        });
        setYearlyKpi(newYearlyKpi);
      })
      .catch(console.error);
  }, [reportMonth, selectedEmployeeId, currentStep, employee?.id]);

  // Snap back to current month if user switches to step 1/2 from a future month in step 3
  useEffect(() => {
    if (currentStep === 1 || currentStep === 2) {
      const now = new Date();
      if (
        reportMonth.getFullYear() > now.getFullYear() ||
        (reportMonth.getFullYear() === now.getFullYear() &&
          reportMonth.getMonth() > now.getMonth())
      ) {
        setReportMonth(new Date());
      }
    }
  }, [currentStep, reportMonth]);

  const getPositionName = (code: string | undefined | null) => {
    if (!code) return "Nhân viên";
    const pos = positions.find((p) => p.code === code);
    return pos ? pos.name : code;
  };

  const displayedEmployee = useMemo(() => {
    if (currentStep === 1) {
      return (
        salesEmployees.find((e) =>
          getPositionName(e.position).toLowerCase().includes("trưởng phòng")
        ) || employee
      );
    } else if (currentStep === 2) {
      return salesEmployees.find((e) => e.id === selectedEmployeeId) || employee;
    }
    return employee;
  }, [currentStep, selectedEmployeeId, salesEmployees, employee, positions]);

  const calculatedIncome = useMemo(() => {
    const contractBaseSalary = displayedEmployee?.baseSalary || 0;

    const month = reportMonth.getMonth();
    const year = reportMonth.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let standardWorkingDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      if (d.getDay() !== 0) standardWorkingDays++;
    }

    const actualWorkingDays = incomeData.actualWorkingDays || 0;
    const baseSalary =
      standardWorkingDays > 0
        ? Math.round((contractBaseSalary / standardWorkingDays) * actualWorkingDays)
        : 0;

    const mealCount = incomeData.mealCount || 0;
    const mealAllowanceTotal = (displayedEmployee?.mealAllowance || 0) * mealCount;
    const allowance =
      mealAllowanceTotal +
      (displayedEmployee?.fuelAllowance || 0) +
      (displayedEmployee?.phoneAllowance || 0) +
      (displayedEmployee?.seniorityAllowance || 0);
    const performanceBonus = incomeData.performanceBonus || 0;

    const activeConfig = currentStep === 1 ? step1KpiConfig : step2KpiConfig;
    const revenueCriteria = activeConfig.find(
      (c) =>
        c.name?.toLowerCase().includes("doanh thu") ||
        c.name?.toLowerCase().includes("doanh số")
    );

    let calculatedSalesCommission = 0;
    if (revenueCriteria) {
      const actualRevenue = Number(String(revenueCriteria.actual || "0").replace(/,/g, ""));
      calculatedSalesCommission = actualRevenue * 0.04;
    }

    const salesCommission =
      calculatedSalesCommission > 0
        ? calculatedSalesCommission
        : incomeData.salesCommission || 0;

    const fallbackInsDeduction =
      displayedEmployee?.isInsuranceEnrolled ||
      (displayedEmployee?.socialInsuranceNumber &&
        String(displayedEmployee.socialInsuranceNumber).trim() !== "")
        ? Math.round((displayedEmployee?.insuranceSalary || 0) * 0.215)
        : 0;

    const insuranceDeduction =
      incomeData.insuranceDeduction !== undefined && incomeData.insuranceDeduction > 0
        ? incomeData.insuranceDeduction
        : fallbackInsDeduction;

    const advanceDeduction = incomeData.advanceDeduction || 0;

    const totalIncome = baseSalary + allowance + performanceBonus + salesCommission;
    const netIncome = totalIncome - insuranceDeduction - advanceDeduction;

    return {
      baseSalary,
      allowance,
      performanceBonus,
      salesCommission,
      insuranceDeduction,
      advanceDeduction,
      totalIncome,
      netIncome,
    };
  }, [displayedEmployee, incomeData, currentStep, step1KpiConfig, step2KpiConfig, reportMonth]);

  const getLocationName = (code: string | undefined | null) => {
    if (!code) return "Chưa cập nhật";
    if (code === "main") return "Trụ sở chính";
    const loc = workLocations.find((l: any) => l.code === code);
    return loc ? loc.name : code;
  };

  const getAvatarInitials = (fullName: string | undefined | null) => {
    if (!fullName) return "NV";
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    const empId = (session?.user as any)?.employeeId;
    if (empId) {
      fetch(`/api/hr/employees/${empId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.employee) {
            setEmployee(d.employee);
          }
        })
        .catch(console.error);
    }
  }, [session]);

  const currentMonth = new Date().getMonth() + 1;
  const kpiCategories = Array.from({ length: 12 }, (_, i) => `${i + 1}`);

  const calculateScore = (targetStr: string, actualStr: string, weightStr: string) => {
    const parseNumber = (str: string) =>
      Number(String(str).replace(/,/g, "").replace(/%/g, "").trim());
    const target = parseNumber(targetStr);
    const actual = parseNumber(actualStr);
    const weight = parseNumber(weightStr);

    if (target === 0 || isNaN(target) || isNaN(actual) || isNaN(weight)) return 0;

    const completion = actual / target;
    let score = completion * weight;
    if (score > weight) {
      score = weight;
    }

    return Math.round(score * 10) / 10;
  };

  const step1KpiCriteria = step1KpiConfig;
  const step2KpiCriteria = step2KpiConfig;

  const step1TotalWeight = step1KpiConfig.reduce(
    (sum, item) => sum + (parseFloat(String(item.weight).replace(/%/g, "")) || 0),
    0
  );
  const step2TotalWeight = step2KpiConfig.reduce(
    (sum, item) => sum + (parseFloat(String(item.weight).replace(/%/g, "")) || 0),
    0
  );

  const step1TotalScore = Math.min(
    100,
    step1KpiCriteria.reduce(
      (sum, item) => sum + calculateScore(item.target, item.actual, item.weight),
      0
    )
  );
  const step2TotalScore = Math.min(
    100,
    step2KpiCriteria.reduce(
      (sum, item) => sum + calculateScore(item.target, item.actual, item.weight),
      0
    )
  );

  const selectedMonthIndex = reportMonth.getMonth();
  const kpiData1 = Array.from({ length: 12 }, (_, i) => {
    if (i === selectedMonthIndex) {
      return Math.min(
        100,
        currentStep === 1 ? Math.round(step1TotalScore) : Math.round(step2TotalScore)
      );
    }
    if (i < currentMonth) return Math.min(100, yearlyKpi[i] ?? 0);
    return null;
  });
  const kpiData2 = Array.from({ length: 12 }, (_, i) => {
    if (i === selectedMonthIndex) return Math.min(100, Math.round(step2TotalScore));
    if (i < currentMonth) return Math.min(100, yearlyKpi[i] ?? 0);
    return null;
  });

  const computeAvg = (data: (number | null)[]) => {
    const valid = data.filter((v): v is number => v !== null);
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  };

  const avgData1 = Array.from({ length: 12 }, (_, i) =>
    i < currentMonth ? computeAvg(kpiData1) : null
  );
  const avgData2 = Array.from({ length: 12 }, (_, i) =>
    i < currentMonth ? computeAvg(kpiData2) : null
  );

  const currentUser = session?.user as any;
  const userRole = String(currentUser?.role || "").toUpperCase();
  const rawUserPosition = String(
    currentUser?.employee?.position || currentUser?.position || ""
  ).toLowerCase();
  const userDeptCode = String(
    currentUser?.employee?.departmentCode || currentUser?.departmentCode || ""
  ).toLowerCase();

  // Nhận diện tài khoản Giám đốc truy cập theo chức năng Quản lý trực tiếp
  const isDirectorAccount =
    ["ADMIN", "SUPERADMIN", "DIRECTOR"].includes(userRole) ||
    userDeptCode === "board" ||
    rawUserPosition === "vtr-20260401-8730-eauc" ||
    (rawUserPosition.includes("giám đốc") && !rawUserPosition.includes("trợ lý"));

  const isDirectorDirectManagement =
    isDirectorAccount && activeDeptCode === "sales";

  const isManager = isDirectorAccount || userRole === "MANAGER";
  const currentUserEmployee = salesEmployees.find(
    (e) => e.userId === currentUser?.id
  );
  const isDepartmentHead =
    currentUserEmployee?.position === "vtr-20260401-1964-sbmg" ||
    currentUserEmployee?.position?.toLowerCase().includes("trưởng phòng") ||
    currentUser?.positionName?.includes("Trưởng phòng") ||
    currentUser?.position === "vtr-20260401-1964-sbmg";

  const canAccessManagementTabs = isManager || isDepartmentHead;

  useEffect(() => {
    if (!canAccessManagementTabs && currentStep === 1) {
      setCurrentStep(2);
    } else if (!isDirectorDirectManagement && currentStep === 3) {
      setCurrentStep(canAccessManagementTabs ? 1 : 2);
    }
  }, [canAccessManagementTabs, isDirectorDirectManagement, currentStep]);

  const STEPS: ModernStepItem[] = [
    {
      num: 1,
      id: "manager",
      title: "Lãnh đạo phòng",
      desc: "Báo cáo tổng hợp cho quản lý",
      icon: "bi-person-badge",
      locked: !canAccessManagementTabs,
    },
    {
      num: 2,
      id: "staff",
      title: "Nhân viên phòng",
      desc: "Báo cáo chi tiết theo nhân sự",
      icon: "bi-people",
    },
    ...(isDirectorDirectManagement
      ? [
          {
            num: 3,
            id: "settings",
            title: "Thiết lập thông số",
            desc: "Cấu hình chỉ số báo cáo",
            icon: "bi-gear",
          },
        ]
      : []),
  ];

  const isNextMonthDisabled =
    reportMonth.getFullYear() > new Date().getFullYear() ||
    (reportMonth.getFullYear() === new Date().getFullYear() &&
      reportMonth.getMonth() >= new Date().getMonth());

  const staffEmployees = useMemo(() => {
    return salesEmployees.filter((e) => {
      const posName = getPositionName(e.position).toLowerCase();
      return !posName.includes("trưởng phòng") && !posName.includes("phó phòng");
    });
  }, [salesEmployees, positions]);

  const renderEvaluationView = (
    totalScore: number,
    kpiData: (number | null)[],
    avgData: (number | null)[],
    criteriaList: KpiCriteriaRow[],
    showEmployeeSelector: boolean
  ) => (
    <div className="flex-1 h-full flex flex-col lg:flex-row w-full overflow-auto min-h-0">
      {/* Cột trái (tỷ lệ 5/12) */}
      <div
        className="shrink-0 flex flex-col custom-scrollbar"
        style={{
          width: isMobile ? "100%" : "41.666667%",
          padding: isMobile ? "16px" : "20px 24px",
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <div className="flex flex-col items-center justify-center" style={{ height: 220 }}>
              <span className="font-bold text-slate-500 mb-1 text-[12px]">
                ĐIỂM HIỆU SUẤT
              </span>
              <div style={{ marginTop: -15, marginBottom: -25 }}>
                <ReactApexChart
                  type="radialBar"
                  height={190}
                  series={[Math.round(totalScore)]}
                  options={{
                    chart: { fontFamily: "inherit", sparkline: { enabled: true } },
                    plotOptions: {
                      radialBar: {
                        hollow: { size: "60%" },
                        track: { background: "rgba(0,0,0,0.04)" },
                        dataLabels: {
                          name: { show: false },
                          value: {
                            offsetY: 8,
                            fontSize: "28px",
                            fontWeight: 800,
                            color: "var(--foreground)",
                            formatter: (val) => `${val}`,
                          },
                        },
                      },
                    },
                    fill: {
                      type: "gradient",
                      gradient: {
                        shade: "dark",
                        type: "horizontal",
                        gradientToColors: ["#8b5cf6"],
                        stops: [0, 100],
                      },
                    },
                    colors: ["#3b82f6"],
                    stroke: { lineCap: "round" },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="sm:col-span-7">
            <div className="flex flex-col justify-center h-full pl-0 sm:pl-2">
              <h6 className="font-bold text-slate-800 mb-3 text-[13px]">
                THÔNG TIN NHÂN VIÊN
              </h6>
              <div
                ref={showEmployeeSelector && canAccessManagementTabs ? empDropdownRef : undefined}
                className="relative mb-3 pb-3 border-b border-dashed border-slate-200"
              >
                <div
                  onClick={() => {
                    if (showEmployeeSelector && canAccessManagementTabs) {
                      setEmpDropdownOpen((prev) => !prev);
                    }
                  }}
                  className={`flex items-center ${
                    showEmployeeSelector && canAccessManagementTabs
                      ? "cursor-pointer rounded-xl p-1.5 -m-1.5 hover:bg-slate-100/80 transition-colors group"
                      : ""
                  }`}
                  title={
                    showEmployeeSelector && canAccessManagementTabs
                      ? "Nhấn để chọn nhân viên phòng kinh doanh"
                      : undefined
                  }
                >
                  {displayedEmployee?.avatarUrl ? (
                    <img
                      src={displayedEmployee.avatarUrl}
                      alt="Avatar"
                      className="rounded-full mr-3 shadow-sm object-cover shrink-0"
                      style={{ width: 42, height: 42 }}
                    />
                  ) : (
                    <div
                      className="bg-[#003087] text-white rounded-full flex items-center justify-center font-bold mr-3 shadow-sm shrink-0"
                      style={{ width: 42, height: 42, fontSize: 15 }}
                    >
                      {getAvatarInitials(displayedEmployee?.fullName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-[14px] truncate flex items-center gap-1.5 group-hover:text-[#003087] transition-colors">
                      <span className="truncate">
                        {displayedEmployee?.fullName || "Đang tải..."}
                      </span>
                      {showEmployeeSelector && canAccessManagementTabs && (
                        <ChevronDown
                          size={12}
                          className={`text-slate-400 group-hover:text-[#003087] shrink-0 transition-transform duration-150 ${
                            empDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {getPositionName(displayedEmployee?.position)}
                    </div>
                  </div>
                </div>

                {showEmployeeSelector && canAccessManagementTabs && empDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                      Chọn nhân viên kinh doanh
                    </div>
                    {staffEmployees.map((emp) => {
                      const isSelected = emp.id === selectedEmployeeId;
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmployeeId(emp.id);
                            setEmpDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/80 text-[#003087]"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.fullName}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#003087]/10 text-[#003087] font-bold text-[11px] flex items-center justify-center shrink-0">
                              {getAvatarInitials(emp.fullName)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-[12.5px] truncate ${
                                isSelected ? "font-bold text-[#003087]" : "font-medium"
                              }`}
                            >
                              {emp.fullName}
                            </div>
                            <div className="text-[10.5px] text-slate-400 truncate">
                              {getPositionName(emp.position)}
                            </div>
                          </div>
                          {isSelected && (
                            <Check2 size={15} className="text-[#003087] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 text-[11.5px]">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Telephone size={12} className="text-slate-400" />
                    Điện thoại:
                  </span>
                  <span className="font-medium text-slate-800">
                    {displayedEmployee?.phone || "Chưa cập nhật"}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Envelope size={12} className="text-slate-400" />
                    Email:
                  </span>
                  <span className="font-medium text-slate-800 truncate">
                    {displayedEmployee?.workEmail ||
                      displayedEmployee?.personalEmail ||
                      "Chưa cập nhật"}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <GeoAlt size={12} className="text-slate-400" />
                    Địa điểm làm việc:
                  </span>
                  <span className="font-medium text-slate-800">
                    {getLocationName(displayedEmployee?.workLocation)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <h6 className="font-bold text-slate-800 mb-3 text-[13px]">
            CHI TIẾT ĐIỂM KPI CÁC THÁNG
          </h6>
          <div style={{ marginLeft: -15, marginRight: -15 }}>
            <ReactApexChart
              type="line"
              height={210}
              series={[
                { name: "Điểm KPI", type: "column", data: kpiData },
                { name: "Trung bình", type: "line", data: avgData },
              ]}
              options={{
                chart: {
                  fontFamily: "inherit",
                  toolbar: { show: false },
                  zoom: { enabled: false },
                },
                plotOptions: {
                  bar: {
                    borderRadius: 4,
                    columnWidth: "40%",
                    colors: {
                      ranges: [
                        { from: 0, to: 49.99, color: "#ef4444" },
                        { from: 50, to: 80, color: "#f59e0b" },
                        { from: 80.01, to: 100, color: "#3b82f6" },
                      ],
                    },
                  },
                },
                colors: ["#3b82f6", "#f59e0b"],
                stroke: { width: [0, 2], curve: "smooth", dashArray: [0, 4] },
                xaxis: {
                  categories: kpiCategories,
                  labels: { style: { colors: "#64748b", fontSize: "11px" } },
                },
                yaxis: {
                  max: 100,
                  min: 0,
                  tickAmount: 5,
                  labels: { style: { colors: "#64748b", fontSize: "11px" } },
                },
                dataLabels: { enabled: false },
                legend: {
                  position: "top",
                  horizontalAlign: "right",
                  fontSize: "12px",
                },
                grid: { strokeDashArray: 3, borderColor: "#e2e8f0" },
              }}
            />
          </div>
        </div>
      </div>

      {/* Đường ngăn cách */}
      <div
        className="my-4 shrink-0 hidden lg:block"
        style={{
          width: 2,
          backgroundColor: "var(--border)",
          opacity: 0.8,
          borderRight: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow: "inset 1px 0 2px rgba(0,0,0,0.05)",
        }}
      />

      {/* Cột phải (tỷ lệ 7/12) */}
      <div
        className="flex-1 flex flex-col custom-scrollbar min-w-0"
        style={{ padding: isMobile ? "16px" : "20px 24px" }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-4">
          <h6 className="font-bold text-slate-800 mb-0 uppercase text-[13px]">
            Hệ thống đánh giá kết quả công việc
          </h6>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-bold px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-xs text-slate-800 text-[14px]">
              Tháng {reportMonth.getMonth() + 1}, {reportMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextMonthDisabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-auto custom-scrollbar flex flex-col">
            <div className="border border-slate-200/80 rounded-xl overflow-hidden">
              <FullWidthTable>
                <table className="w-full text-[13px] border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr className="h-9">
                      <th
                        className="text-center uppercase text-[11px] font-bold text-slate-500 px-3"
                        style={{ width: "5%", minWidth: "50px" }}
                      >
                        STT
                      </th>
                      <th
                        className="text-left uppercase text-[11px] font-bold text-slate-500 px-3"
                        style={{ width: "35%", minWidth: "150px" }}
                      >
                        Tiêu chí đánh giá
                      </th>
                      <th
                        className="text-center uppercase text-[11px] font-bold text-slate-500 px-3"
                        style={{ width: "15%", minWidth: "80px" }}
                      >
                        Chỉ tiêu
                      </th>
                      <th
                        className="text-center uppercase text-[11px] font-bold text-slate-500 px-3"
                        style={{ width: "15%", minWidth: "80px" }}
                      >
                        Thực tế
                      </th>
                      <th
                        className="text-center uppercase text-[11px] font-bold text-slate-500 px-3"
                        style={{ width: "15%", minWidth: "80px" }}
                      >
                        Trọng số
                      </th>
                      <th
                        className="text-center uppercase text-[11px] font-bold text-slate-500 px-3"
                        style={{ width: "15%", minWidth: "80px" }}
                      >
                        Điểm số
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criteriaList.map((item, idx) => {
                      const score = calculateScore(item.target, item.actual, item.weight);
                      const maxScore = Number(String(item.weight).replace("%", "")) || 0;
                      const completionPercent = maxScore > 0 ? (score / maxScore) * 100 : 0;
                      const isPercent =
                        item.name.toLowerCase().includes("tỷ lệ") ||
                        item.name.toLowerCase().includes("thu hồi công nợ");
                      const scoreColorClass =
                        completionPercent >= 90
                          ? "text-emerald-600"
                          : completionPercent >= 80
                            ? "text-amber-500"
                            : "text-rose-500";
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/70">
                          <td className="text-center text-slate-400 py-2.5 px-3">
                            {idx + 1}
                          </td>
                          <td className="font-medium text-slate-800 py-2.5 px-3">
                            {item.name}
                          </td>
                          <td className="text-center text-slate-600 py-2.5 px-3">
                            {item.target}
                            {isPercent ? "%" : ""}
                          </td>
                          <td className="text-center font-medium text-[#003087] py-2.5 px-3">
                            {item.actual}
                            {isPercent ? "%" : ""}
                          </td>
                          <td className="text-center text-slate-500 py-2.5 px-3">
                            {item.weight}
                          </td>
                          <td
                            className={`text-center font-bold py-2.5 px-3 ${scoreColorClass}`}
                          >
                            {score.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </FullWidthTable>
            </div>

            <div className="mt-4 pb-3 shrink-0 px-2">
              <div className="flex justify-between items-center mb-3">
                <h6 className="font-bold text-slate-800 uppercase mb-0 text-[13px]">
                  Khung thu nhập
                </h6>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<InfoCircle size={13} />}
                  onClick={() => setShowRules(true)}
                >
                  Quy tắc tính
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-5 md:border-r md:border-slate-200 md:pr-4">
                  <div className="text-slate-500 mb-1 uppercase text-[11px] font-semibold">
                    Thực lĩnh
                  </div>
                  <div
                    className={`font-bold text-[24px] leading-tight ${
                      calculatedIncome.netIncome <= 0 ? "text-rose-600" : "text-[#003087]"
                    }`}
                  >
                    {calculatedIncome.netIncome.toLocaleString("en-US")}{" "}
                    <span className="text-[14px]">đ</span>
                  </div>
                  <div className="text-[11.5px] text-slate-500 mt-1">
                    Tổng thu nhập:{" "}
                    <span className="font-semibold text-slate-700">
                      {calculatedIncome.totalIncome.toLocaleString("en-US")} đ
                    </span>
                  </div>
                </div>
                <div className="md:col-span-7">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-slate-500 mb-1 text-[11px]">Lương cơ bản</div>
                      <div className="font-bold text-slate-800 text-[13px]">
                        {calculatedIncome.baseSalary.toLocaleString("en-US")} đ
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1 text-[11px]">Lương hiệu suất</div>
                      <div className="font-bold text-slate-800 text-[13px]">
                        {calculatedIncome.performanceBonus.toLocaleString("en-US")} đ
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1 text-[11px]">Phụ cấp</div>
                      <div className="font-bold text-slate-800 text-[13px]">
                        {calculatedIncome.allowance.toLocaleString("en-US")} đ
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1 text-[11px]">
                        Hoa hồng bán hàng
                      </div>
                      <div className="font-bold text-emerald-600 text-[13px]">
                        {calculatedIncome.salesCommission.toLocaleString("en-US")} đ
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1 text-[11px]">
                        Trừ tiền đóng bảo hiểm
                      </div>
                      <div className="font-bold text-rose-600 text-[13px]">
                        {calculatedIncome.insuranceDeduction > 0 ? "-" : ""}
                        {calculatedIncome.insuranceDeduction.toLocaleString("en-US")} đ
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1 text-[11px]">Trừ tạm ứng</div>
                      <div className="font-bold text-rose-600 text-[13px]">
                        {calculatedIncome.advanceDeduction > 0 ? "-" : ""}
                        {calculatedIncome.advanceDeduction.toLocaleString("en-US")} đ
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEditableCriteriaTable = (
    title: string,
    configList: KpiCriteriaRow[],
    setConfigList: React.Dispatch<React.SetStateAction<KpiCriteriaRow[]>>,
    totalWeight: number
  ) => (
    <div className="flex flex-col h-full min-h-0">
      <h6 className="font-bold text-[#003087] mb-3 uppercase text-[13px]">{title}</h6>
      <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 rounded-xl flex flex-col">
        <table className="w-full text-[13px] border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
            <tr className="h-9">
              <th className="text-center uppercase text-[11px] font-bold text-slate-500 w-[50px] px-2">
                STT
              </th>
              <th className="text-left uppercase text-[11px] font-bold text-slate-500 px-2">
                Tiêu chí đánh giá
              </th>
              <th className="text-center uppercase text-[11px] font-bold text-slate-500 w-[140px] px-2">
                Chỉ tiêu
              </th>
              <th className="text-center uppercase text-[11px] font-bold text-slate-500 w-[90px] px-2">
                Trọng số
              </th>
              <th className="text-center uppercase text-[11px] font-bold text-slate-500 w-[44px] px-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {configList.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70">
                <td className="text-center text-slate-400 py-2 px-2">{idx + 1}</td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    className="w-full h-8 px-2.5 text-center bg-white border border-slate-200 rounded-lg text-[12px] text-slate-800 focus:outline-none focus:border-[#003087]"
                    value={item.name || ""}
                    onChange={(e) => {
                      const newData = [...configList];
                      newData[idx] = { ...newData[idx], name: e.target.value };
                      setConfigList(newData);
                    }}
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    className="w-full h-8 px-2.5 text-center bg-white border border-slate-200 rounded-lg text-[12px] text-slate-800 focus:outline-none focus:border-[#003087]"
                    value={item.target || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      const formatted = val
                        ? parseInt(val, 10).toLocaleString("en-US")
                        : "";
                      const newData = [...configList];
                      newData[idx] = { ...newData[idx], target: formatted };
                      setConfigList(newData);
                    }}
                  />
                </td>
                <td className="py-2 px-2">
                  <div
                    className={`flex items-center h-8 mx-auto rounded-lg border overflow-hidden ${
                      totalWeight > 100 ? "border-rose-500" : "border-slate-200"
                    }`}
                    style={{ width: 74 }}
                  >
                    <input
                      type="text"
                      className={`w-full h-full text-center bg-white text-[12px] pl-2 pr-1 focus:outline-none ${
                        totalWeight > 100 ? "text-rose-600 font-semibold" : "text-slate-800"
                      }`}
                      value={String(item.weight).replace(/%/g, "") || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        const newData = [...configList];
                        newData[idx] = { ...newData[idx], weight: val };
                        setConfigList(newData);
                      }}
                    />
                    <span
                      className={`h-full flex items-center px-1.5 bg-slate-50 border-l text-[12px] ${
                        totalWeight > 100
                          ? "border-rose-500 text-rose-600"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >
                      %
                    </span>
                  </div>
                </td>
                <td className="text-center py-2 px-2">
                  <button
                    type="button"
                    title="Xóa tiêu chí"
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                    onClick={() => {
                      const newData = [...configList];
                      newData.splice(idx, 1);
                      setConfigList(newData);
                    }}
                  >
                    <Trash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-center p-2.5 border-t border-slate-100 mt-auto">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<PlusLg size={12} />}
            onClick={() => {
              setConfigList([
                ...configList,
                { name: "", target: "0", actual: "0", weight: "0" },
              ]);
            }}
          >
            Thêm tiêu chí
          </Button>
        </div>
      </div>
      {totalWeight > 100 && (
        <div className="text-rose-600 mt-2 font-medium text-[12px] flex items-center gap-1.5">
          <ExclamationCircle size={13} />
          Tổng trọng số đang là {totalWeight}%, vượt quá 100%. Vui lòng điều chỉnh.
        </div>
      )}
    </div>
  );

  return (
    <StepPage
      title="Báo cáo nội bộ"
      description="Báo cáo nội bộ phòng kinh doanh"
      icon="bi-file-earmark-bar-graph-fill"
      color="blue"
      hideTicker={true}
      steps={STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
    >
      <div className="flex-1 flex flex-col overflow-hidden h-full min-h-0">
        {currentStep === 1 &&
          renderEvaluationView(step1TotalScore, kpiData1, avgData1, step1KpiCriteria, false)}

        {currentStep === 2 &&
          renderEvaluationView(step2TotalScore, kpiData2, avgData2, step2KpiCriteria, true)}

        {currentStep === 3 && isDirectorDirectManagement && (
          <div className="flex flex-col w-full h-full p-4 md:p-6 overflow-auto">
            <h6 className="font-bold text-slate-800 mb-4 uppercase text-[13px]">
              Cấu hình hệ thống đánh giá
            </h6>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="font-bold px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-xs text-slate-800 text-[14px]">
                    Tháng {reportMonth.getMonth() + 1}, {reportMonth.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="w-auto">
                  <Toggle
                    checked={applyAllYear}
                    onChange={setApplyAllYear}
                    label="Áp dụng cho cả năm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Files size={14} />}
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `/api/sales/internal-reports/criteria/copy?month=${
                          reportMonth.getMonth() + 1
                        }&year=${reportMonth.getFullYear()}`
                      );
                      const data = await res.json();
                      if (data.success) {
                        const formatCriteria = (c: any): KpiCriteriaRow => ({
                          id: c.id,
                          name: c.name,
                          target: Number(c.targetValue || 0).toLocaleString("en-US"),
                          actual: "0",
                          weight: c.weight + "%",
                          score: "0",
                        });
                        setStep1KpiConfig((data.data.manager || []).map(formatCriteria));
                        setStep2KpiConfig((data.data.staff || []).map(formatCriteria));
                        toast.success("Đã sao chép cấu hình tháng trước!");
                      } else {
                        toast.error("Lỗi sao chép: " + data.error);
                      }
                    } catch (e: any) {
                      toast.error(e.message || "Lỗi sao chép cấu hình");
                    }
                  }}
                >
                  Sao chép cấu hình
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Check2Circle size={15} />}
                  onClick={async () => {
                    try {
                      const payload = {
                        month: reportMonth.getMonth() + 1,
                        year: reportMonth.getFullYear(),
                        applyAllYear,
                        manager: step1KpiConfig.map((c) => ({
                          name: c.name,
                          targetValue: Number(String(c.target).replace(/,/g, "")),
                          weight: Number(String(c.weight).replace(/%/g, "")),
                        })),
                        staff: step2KpiConfig.map((c) => ({
                          name: c.name,
                          targetValue: Number(String(c.target).replace(/,/g, "")),
                          weight: Number(String(c.weight).replace(/%/g, "")),
                        })),
                      };
                      const res = await fetch("/api/sales/internal-reports/criteria", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast.success("Cập nhật cấu hình thành công!");
                      } else {
                        toast.error("Lỗi cập nhật cấu hình: " + data.error);
                      }
                    } catch (e: any) {
                      toast.error(e.message || "Lỗi cập nhật cấu hình");
                    }
                  }}
                >
                  Ban hành
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
              <div className="lg:border-r lg:border-slate-200 lg:pr-6 h-full min-h-0">
                {renderEditableCriteriaTable(
                  "Danh sách KPI Lãnh đạo phòng",
                  step1KpiConfig,
                  setStep1KpiConfig,
                  step1TotalWeight
                )}
              </div>
              <div className="h-full min-h-0">
                {renderEditableCriteriaTable(
                  "Danh sách KPI Nhân viên phòng",
                  step2KpiConfig,
                  setStep2KpiConfig,
                  step2TotalWeight
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Offcanvas
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        title="Quy tắc tính khung thu nhập"
        width="400px"
      >
        <div className="space-y-5 text-[13px] text-slate-600">
          <div>
            <h6 className="font-bold text-slate-800 text-[14px]">
              1. Công thức tính tổng thu nhập &amp; thực lĩnh
            </h6>
            <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div>
                <strong className="text-slate-800">Tổng thu nhập</strong> = Lương cơ bản +
                Lương hiệu suất + % hoa hồng Ds + Phụ cấp
              </div>
              <div>
                <strong className="text-slate-800">Thực lĩnh</strong> = Tổng thu nhập &minus;
                Trừ tiền đóng bảo hiểm &minus; Trừ tạm ứng
              </div>
            </div>
          </div>

          <div>
            <h6 className="font-bold text-slate-800 text-[14px]">
              2. Ngưỡng tính điểm KPI
            </h6>
            <ul className="mt-2 pl-4 list-disc space-y-1">
              <li>KPI được chấm theo thang 100 điểm/tháng. Trần tối đa 100 điểm</li>
              <li>KPI tháng là căn cứ chi trả lương hiệu suất/KPI theo tỷ lệ.</li>
              <li>&lt;80 điểm: Không đạt không hưởng lương hiệu suất (0%).</li>
            </ul>
          </div>

          <div>
            <h6 className="font-bold text-slate-800 text-[14px]">
              3. Công thức tính lương hiệu suất
            </h6>
            <div className="mt-2 space-y-2">
              <div>Thưởng KPI tháng tối đa 5,000,000 (vnđ)</div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-800">Lương hiệu suất thực nhận</strong> =
                Lương hiệu suất theo hợp đồng &times; Tỷ lệ hưởng
              </div>
              <div>Tỷ lệ hưởng theo xếp hạng:</div>
              <ul className="pl-4 list-disc space-y-1">
                <li>80–89 điểm (Đạt/Khá): hưởng 80%</li>
                <li>90–94 điểm (Tốt): hưởng 90%</li>
                <li>95–99 điểm (Giỏi): hưởng 95%</li>
                <li>100 điểm (Xuất sắc): hưởng 100%</li>
              </ul>
              <div className="italic text-slate-500">
                Ghi chú: nếu tháng nào KPI &lt;80 thì không chi trả phần lương hiệu suất
                tháng đó.
              </div>
            </div>
          </div>

          <div>
            <h6 className="font-bold text-slate-800 text-[14px]">
              4. Công thức tính hoa hồng bán hàng
            </h6>
            <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <strong className="text-slate-800">Hoa hồng bán hàng</strong> = 4% &times;
              Doanh thu trong tháng
            </div>
          </div>

          <div>
            <h6 className="font-bold text-slate-800 text-[14px]">
              5. Nguyên tắc minh chứng và loại trừ
            </h6>
            <ul className="mt-2 pl-4 list-disc space-y-1">
              <li>Chỉ tiêu không có minh chứng/đối soát số liệu, không tính điểm.</li>
              <li>
                Nếu có vi phạm nghiêm trọng (báo cáo sai/gian dối số liệu, vi phạm chính
                sách giá, công nợ, gây thiệt hại...). CEO có quyền loại KPI tháng và/hoặc
                xử lý theo quy định.
              </li>
            </ul>
          </div>
        </div>
      </Offcanvas>
    </StepPage>
  );
};
export default SalesInternalReportsPage;
