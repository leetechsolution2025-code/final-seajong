"use client";

import React, { useState, useEffect } from "react";
import type { ModernStepItem } from "@/types";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Toggle } from "@/components/common/Toggle";
import { TableToolbar } from "@/components/common/TableToolbar";
import { PrintPreviewModal, printDocumentById } from "@/components/common/PrintPreviewModal";
import { useToast } from "@/components/ui/Toast";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table, TableColumn } from "@/components/ui/Table";
import { AddStrategyOffcanvas } from "@/components/sales/plan/AddStrategyOffcanvas";
import { AddOemTaskOffcanvas } from "@/components/sales/plan/AddOemTaskOffcanvas";

interface PlanItemRow {
  stt?: number | string;
  item?: string;
  target?: number;
  ratio?: number;
  note?: string;
  isFullWidth?: boolean;
  fullWidthContent?: string;
  isTotal?: boolean;
}

interface StaffItemRow {
  stt?: number | string;
  role?: string;
  basicSalary?: number;
  performanceSalary?: number;
  allowance?: number;
  quantity?: number;
  totalBudget?: number;
  isFullWidth?: boolean;
  fullWidthContent?: string;
  isTotal?: boolean;
}

interface MonthlyRevenueRow {
  stt: string;
  item: string;
  value: number;
  isHeader?: boolean;
}

export interface OemStrategyRow {
  id: number | string;
  stt: number | string;
  name: string;
  detail: string;
}

export interface OemTaskRow {
  id: number | string;
  stt: number | string;
  name: string;
  detail: string;
  assignee: string;
  collaborator: string;
  deadline: string;
  status: string;
}

interface MonthlyTargetData {
  chinhThuc: number;
  lapKe: number;
  layHangLe: number;
  thanhLy: number;
  daiLy: number;
  banLe: number;
  revenueRows: MonthlyRevenueRow[];
  strategies?: OemStrategyRow[];
  tasks?: OemTaskRow[];
}

const DEFAULT_PLAN_ROWS: PlanItemRow[] = [
  // Section I: Mục tiêu doanh thu
  { isFullWidth: true, fullWidthContent: "I. Mục tiêu doanh thu" },
  { stt: "1", item: "Tổng doanh thu", target: 0, ratio: 100, note: "Lấy từ bảng kế hoạch tổng của OEM", isTotal: true },
  { stt: "1.1", item: "Doanh thu từ đại lý", target: 0, ratio: 0, note: "" },
  { stt: "1.2", item: "Doanh thu từ bán lẻ", target: 0, ratio: 0, note: "" },

  // Section II: Định mức chi phí
  { isFullWidth: true, fullWidthContent: "II. Định mức chi phí" },
  { stt: "2", item: "Tổng chi phí", target: 0, ratio: 100, note: "Lấy từ bảng kế hoạch tổng của OEM", isTotal: true },
  { stt: "2.1", item: "Công tác kinh doanh", target: 0, ratio: 0, note: "Lấy từ Kế hoạch tổng" },
  { stt: "2.2", item: "Khối sản xuất", target: 0, ratio: 0, note: "Lấy từ Kế hoạch tổng" },
  { stt: "2.3", item: "Kế toán và nhân sự", target: 0, ratio: 0, note: "Lấy từ Kế hoạch tổng" },
  { stt: "2.4", item: "Kho vận", target: 0, ratio: 0, note: "Lấy từ Kế hoạch tổng" },
  { stt: "2.5", item: "Công tác vận hành hệ thống", target: 0, ratio: 0, note: "Lấy từ Kế hoạch tổng" }
];

const DEFAULT_STAFF_ROWS: StaffItemRow[] = [];

const getInitialMonthlyTargets = (): Record<number, MonthlyTargetData> => {
  const initial: Record<number, MonthlyTargetData> = {};
  for (let m = 1; m <= 12; m++) {
    initial[m] = {
      chinhThuc: 0,
      lapKe: 0,
      layHangLe: 0,
      thanhLy: 0,
      daiLy: 0,
      banLe: 0,
      revenueRows: [
        { stt: "1.1", item: "Doanh thu từ đại lý", value: 0 },
        { stt: "1.2", item: "Doanh thu từ bán lẻ", value: 0 }
      ],
      strategies: [],
      tasks: [],
    };
  }
  return initial;
};

const recalculateChinhThucChain = (targets: Record<number, MonthlyTargetData>): Record<number, MonthlyTargetData> => {
  const updated = { ...targets };
  for (let m = 2; m <= 12; m++) {
    const prevMonthData = updated[m - 1];
    const prevChinhThuc = prevMonthData?.chinhThuc || 0;
    const prevLapKe = prevMonthData?.lapKe || 0;

    updated[m] = {
      ...updated[m],
      chinhThuc: prevChinhThuc + prevLapKe
    };
  }
  return updated;
};

const recalculatePlanRowsWithStaffTotal = (
  planRowsList: PlanItemRow[],
  staffRowsList: StaffItemRow[]
): PlanItemRow[] => {
  const updated = [...planRowsList];
  // Tính tổng doanh thu (các mục con bắt đầu bằng "1.")
  const revenueSubItems = updated.filter(r => r.stt && r.stt.toString().startsWith("1."));
  const totalRevenue = revenueSubItems.reduce((sum, r) => sum + (r.target || 0), 0);

  // Tính tổng chi phí (các mục con bắt đầu bằng "2.")
  const costSubItems = updated.filter(r => r.stt && r.stt.toString().startsWith("2."));
  const totalCost = costSubItems.reduce((sum, r) => sum + (r.target || 0), 0);

  // Cập nhật lại tỷ trọng và tổng
  return updated.map(r => {
    if (r.stt === "1") {
      return { ...r, target: totalRevenue, ratio: 100 };
    }
    if (r.stt === "2") {
      const ratio = totalRevenue > 0 ? parseFloat((((totalCost) / totalRevenue) * 100).toFixed(1)) : 0;
      return { ...r, target: totalCost, ratio };
    }
    if (r.stt && r.stt.toString().startsWith("1.")) {
      const ratio = totalRevenue > 0 ? parseFloat((((r.target || 0) / totalRevenue) * 100).toFixed(1)) : 0;
      return { ...r, ratio };
    }
    if (r.stt && r.stt.toString().startsWith("2.")) {
      const ratio = totalRevenue > 0 ? parseFloat((((r.target || 0) / totalRevenue) * 100).toFixed(1)) : 0;
      return { ...r, ratio };
    }
    return r;
  });
};

export function OemPlanTab({ currentStep }: { currentStep: number }) {
  const [showStrategyOffcanvas, setShowStrategyOffcanvas] = useState<boolean>(false);
  const [showTaskOffcanvas, setShowTaskOffcanvas] = useState<boolean>(false);
  const [editingStrategy, setEditingStrategy] = useState<OemStrategyRow | null>(null);
  const [editingTask, setEditingTask] = useState<OemTaskRow | null>(null);

  const [planYear, setPlanYear] = useState<string>("2026");
  const [createdDate, setCreatedDate] = useState<string>("2026-06-15");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toast = useToast();

  const [planRows, setPlanRows] = useState<PlanItemRow[]>(DEFAULT_PLAN_ROWS);
  const [staffRows, setStaffRows] = useState<StaffItemRow[]>(DEFAULT_STAFF_ROWS);
  const [masterCostSales, setMasterCostSales] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [monthlyTargets, setMonthlyTargets] = useState<Record<number, MonthlyTargetData>>(() => {
    return getInitialMonthlyTargets();
  });

  const handleAddStrategy = (data: { name: string, detail: string }) => {
    setMonthlyTargets(prev => {
      const monthData = prev[selectedMonth];
      const currentStrategies = monthData?.strategies || [];
      
      let newStrategies;
      if (editingStrategy) {
        newStrategies = currentStrategies.map(s => s.id === editingStrategy.id ? { ...s, ...data } : s);
      } else {
        const newId = Date.now();
        newStrategies = [...currentStrategies, { id: newId, stt: currentStrategies.length + 1, ...data }];
      }

      return {
        ...prev,
        [selectedMonth]: {
          ...monthData,
          strategies: newStrategies
        }
      };
    });
    setEditingStrategy(null);
  };

  const handleDeleteStrategy = () => {
    if (!editingStrategy) return;
    setMonthlyTargets(prev => {
      const monthData = prev[selectedMonth];
      const currentStrategies = monthData?.strategies || [];
      const newStrategies = currentStrategies.filter(s => s.id !== editingStrategy.id).map((s, idx) => ({ ...s, stt: idx + 1 }));
      
      return {
        ...prev,
        [selectedMonth]: {
          ...monthData,
          strategies: newStrategies
        }
      };
    });
    setEditingStrategy(null);
  };

  const handleAddTask = (data: { name: string, detail: string, assignee: string, collaborator: string, deadline: string, status: string }) => {
    setMonthlyTargets(prev => {
      const monthData = prev[selectedMonth];
      const currentTasks = monthData?.tasks || [];
      
      let newTasks;
      if (editingTask) {
        newTasks = currentTasks.map(t => t.id === editingTask.id ? { ...t, ...data } : t);
      } else {
        const newId = Date.now();
        newTasks = [...currentTasks, { id: newId, stt: currentTasks.length + 1, ...data }];
      }

      return {
        ...prev,
        [selectedMonth]: {
          ...monthData,
          tasks: newTasks
        }
      };
    });
    setEditingTask(null);
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;
    setMonthlyTargets(prev => {
      const monthData = prev[selectedMonth];
      const currentTasks = monthData?.tasks || [];
      const newTasks = currentTasks.filter(t => t.id !== editingTask.id).map((t, idx) => ({ ...t, stt: idx + 1 }));
      
      return {
        ...prev,
        [selectedMonth]: {
          ...monthData,
          tasks: newTasks
        }
      };
    });
    setEditingTask(null);
  };

  // State for Print Preview Customizer
  const [company, setCompany] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [preparedBy, setPreparedBy] = useState<string>("Trưởng phòng Kinh doanh");
  const [growthTarget, setGrowthTarget] = useState<string>("");
  const [gpTarget, setGpTarget] = useState<string>("");

  // Historical data states for Page 2
  const [prevYearPlan, setPrevYearPlan] = useState<string>("");
  const [prevYearActual, setPrevYearActual] = useState<string>("");
  const [prevGrowthPlan, setPrevGrowthPlan] = useState<string>("");
  const [prevGrowthActual, setPrevGrowthActual] = useState<string>("");
  const [prevStaffPlan, setPrevStaffPlan] = useState<string>("");
  const [prevStaffActual, setPrevStaffActual] = useState<string>("");
  const [prevAvgSalesPlan, setPrevAvgSalesPlan] = useState<string>("");
  const [prevAvgSalesActual, setPrevAvgSalesActual] = useState<string>("");

  useEffect(() => {
    fetch("/api/company")
      .then(r => r.json())
      .then(d => setCompany(d))
      .catch(() => { });
  }, []);

  const handleMonthlyTargetChange = (month: number, field: keyof Omit<MonthlyTargetData, "revenueRows">, value: string) => {
    const cleanValue = Number(value.replace(/\D/g, ""));
    setMonthlyTargets(prev => {
      const nextTargets = {
        ...prev,
        [month]: {
          ...prev[month],
          [field]: cleanValue
        }
      };
      return nextTargets;
    });
  };

  const handleMonthlyRevenueChange = (month: number, index: number, value: string) => {
    const cleanValue = Number(value.replace(/\D/g, ""));
    setMonthlyTargets(prev => {
      const updatedRows = [...(prev[month]?.revenueRows || [])];
      if (updatedRows[index]) {
        updatedRows[index] = { ...updatedRows[index], value: cleanValue };
      }
      return {
        ...prev,
        [month]: {
          ...prev[month],
          revenueRows: updatedRows
        }
      };
    });
  };

  const getMonthlyTotalRevenue = (month: number) => {
    const rows = monthlyTargets[month]?.revenueRows || [];
    return rows.reduce((sum, r) => sum + r.value, 0);
  };

  const getYearlyTargetSum = (field: "chinhThuc" | "lapKe" | "layHangLe") => {
    return Object.values(monthlyTargets).reduce((sum, data) => sum + ((data[field] as number) || 0), 0);
  };

  const getYearlyRevenueSumByIndex = (index: number) => {
    return Object.values(monthlyTargets).reduce((sum, data) => {
      const row = data.revenueRows?.[index];
      return sum + (row?.value || 0);
    }, 0);
  };

  const formatShortValue = (value: number) => {
    return `${value.toLocaleString("vi-VN")} đ`;
  };

  const customPrintStyles = {
    secHead: {
      fontFamily: "'Montserrat', sans-serif",
      color: "#003087",
      borderBottom: "1.5px solid #003087",
      paddingBottom: "4px",
      marginTop: "20px",
      marginBottom: "12px",
      fontSize: "13px",
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    tableHeader: {
      backgroundColor: "#003087",
      color: "#ffffff",
      fontWeight: 700,
      fontSize: "11px",
      textTransform: "uppercase" as const,
      padding: "6px 8px",
      border: "1px solid #cbd5e1",
      textAlign: "center" as const,
    },
    tableCell: {
      padding: "5px 8px",
      border: "1px solid #cbd5e1",
      fontSize: "11px",
      color: "#334155",
    },
    boldCell: {
      padding: "5px 8px",
      border: "1px solid #cbd5e1",
      fontSize: "11px",
      fontWeight: 700,
      color: "#0f172a",
    },
  };

  // Helper functions for dynamic calculations in yearly sales plan report
  const getYearlyTotalFromMonthly = () => {
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      total += getMonthlyTotalRevenue(m);
    }
    return total;
  };

  const getQuarterlyRevenue = (q: 1 | 2 | 3 | 4) => {
    const months = q === 1 ? [1, 2, 3] : q === 2 ? [4, 5, 6] : q === 3 ? [7, 8, 9] : [10, 11, 12];
    return months.reduce((sum, m) => {
      const rows = monthlyTargets[m]?.revenueRows || [];
      return sum + rows.reduce((s, r) => s + (r.value || 0), 0);
    }, 0);
  };

  const getQuarterlyRatio = (q: 1 | 2 | 3 | 4, yearlyTotal: number) => {
    if (yearlyTotal <= 0) return 0;
    const qValue = getQuarterlyRevenue(q);
    return parseFloat(((qValue / yearlyTotal) * 100).toFixed(1));
  };

  const getYearlyChannelRevenue = (channelType: "agency" | "project" | "ecom") => {
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      const rows = monthlyTargets[m]?.revenueRows || [];
      if (channelType === "agency") {
        total += (rows[1]?.value || 0) + (rows[2]?.value || 0) + (rows[3]?.value || 0) + (rows[6]?.value || 0);
      } else if (channelType === "ecom") {
        total += (rows[5]?.value || 0);
      } else if (channelType === "project") {
        total += (rows[7]?.value || 0);
      }
    }
    return total;
  };

  const getPlanRowTarget = (stt: string) => {
    const row = planRows.find(r => r.stt === stt);
    return row?.target || 0;
  };

  const getPlanRowRatio = (stt: string) => {
    const row = planRows.find(r => r.stt === stt);
    return row?.ratio || 0;
  };

  const mapMasterDataToStates = (parsed: any, finalCostSales: number) => {
    const revenueAgent = Number(parsed.revenueAgent) || 0;
    const revenueRetail = Number(parsed.revenueOEM) || 0;
    const totalRevenue = revenueAgent + revenueRetail;

    const calcCompGroupTotalObj = (arr: any[]) => {
      if (!Array.isArray(arr)) return 0;
      return arr.reduce((sum, item) => {
        const val = parsed.s2_calcByRev
          ? Math.round(totalRevenue * (Number(item.pctVal) || 0) / 100)
          : (Number(item.val) || 0);
        return sum + val;
      }, 0);
    };

    const costSalesVal = calcCompGroupTotalObj(parsed.bizCosts);
    const costMarketingVal = calcCompGroupTotalObj(parsed.mktCosts);
    const costFinanceHRVal = calcCompGroupTotalObj(parsed.finCosts);
    const costLogisticsVal = calcCompGroupTotalObj(parsed.logCosts);
    const costOperationsVal = calcCompGroupTotalObj(parsed.opsCosts);

    const totalCost = costSalesVal + costOperationsVal + costFinanceHRVal + costLogisticsVal + costMarketingVal;

    const mappedPlanRows = DEFAULT_PLAN_ROWS.map((row: PlanItemRow) => {
      let cleanRow = { ...row };
      if (cleanRow.isFullWidth) {
        if (cleanRow.fullWidthContent?.toLowerCase().includes("định mức chi phí")) {
          return {
            ...cleanRow,
            fullWidthContent: `II. Định mức chi phí (Ngân sách được phân bổ: ${totalCost.toLocaleString("vi-VN")} đ)`,
            disableContentChange: true
          };
        }
        return cleanRow;
      }

      if (cleanRow.stt === "1") {
        cleanRow.target = totalRevenue;
      }
      else if (cleanRow.stt === "1.1") {
        cleanRow.target = revenueAgent;
        cleanRow.ratio = totalRevenue > 0 ? (revenueAgent / totalRevenue) * 100 : 0;
      }
      else if (cleanRow.stt === "1.2") {
        cleanRow.target = revenueRetail;
        cleanRow.ratio = totalRevenue > 0 ? (revenueRetail / totalRevenue) * 100 : 0;
      }
      else if (cleanRow.stt === "2") {
        cleanRow.target = totalCost;
      }
      else if (cleanRow.stt === "2.1") {
        cleanRow.target = costSalesVal;
        cleanRow.ratio = totalRevenue > 0 ? (costSalesVal / totalRevenue) * 100 : 0;
      }
      else if (cleanRow.stt === "2.2") {
        cleanRow.target = costMarketingVal;
        cleanRow.ratio = totalRevenue > 0 ? (costMarketingVal / totalRevenue) * 100 : 0;
      }
      else if (cleanRow.stt === "2.3") {
        cleanRow.target = costFinanceHRVal;
        cleanRow.ratio = totalRevenue > 0 ? (costFinanceHRVal / totalRevenue) * 100 : 0;
      }
      else if (cleanRow.stt === "2.4") {
        cleanRow.target = costLogisticsVal;
        cleanRow.ratio = totalRevenue > 0 ? (costLogisticsVal / totalRevenue) * 100 : 0;
      }
      else if (cleanRow.stt === "2.5") {
        cleanRow.target = costOperationsVal;
        cleanRow.ratio = totalRevenue > 0 ? (costOperationsVal / totalRevenue) * 100 : 0;
      }

      return cleanRow;
    });

    let staffCounter = 1;
    const mappedStaffRows: StaffItemRow[] = [];

    const pushCategory = (title: string, staffList: any[]) => {
      if (!staffList || staffList.length === 0) return;
      mappedStaffRows.push({ isFullWidth: true, fullWidthContent: title });
      staffList.forEach((item: any) => {
        const qty = Number(item.qty) || 0;
        const basicSalary = Number(item.salary) || 0;
        mappedStaffRows.push({
          stt: String(staffCounter++),
          role: item.label || "",
          basicSalary,
          performanceSalary: 0,
          allowance: 0,
          quantity: qty,
          totalBudget: basicSalary * qty * 12
        });
      });
    };

    pushCategory("A. PHÒNG KINH DOANH", parsed.bizStaff);
    pushCategory("B. KHỐI SẢN XUẤT", parsed.mktStaff);
    pushCategory("C. KẾ TOÁN VÀ NHÂN SỰ", parsed.finStaff);
    pushCategory("D. KHO VẬN", parsed.logStaff);

    const finalPlanRows = recalculatePlanRowsWithStaffTotal(mappedPlanRows, mappedStaffRows);
    setPlanRows(finalPlanRows);
    setStaffRows(mappedStaffRows);

  };

  useEffect(() => {
    const fetchPlan = async () => {
      setIsLoading(true);
      try {
        // Fetch master plan to get approved cost budget
        const masterRes = await fetch(`/api/plan-finance/oem-master-plan?year=${planYear}`, { cache: "no-store" });
        let finalCostSales = 0;
        let masterPlanObj: any = null;
        if (masterRes.ok) {
          const masterData = await masterRes.json();
          if (masterData.plan && masterData.plan.planData) {
            masterPlanObj = JSON.parse(masterData.plan.planData);
            const totalRevenue = (Number(masterPlanObj.revenueAgent) || 0) + (Number(masterPlanObj.revenueOEM) || 0);

            const calcCompGroupTotalObj = (arr: any[]) => {
              if (!Array.isArray(arr)) return 0;
              return arr.reduce((sum, item) => {
                const val = masterPlanObj.s2_calcByRev
                  ? Math.round(totalRevenue * (Number(item.pctVal) || 0) / 100)
                  : (Number(item.val) || 0);
                return sum + val;
              }, 0);
            };

            finalCostSales = calcCompGroupTotalObj(masterPlanObj.bizCosts) +
              calcCompGroupTotalObj(masterPlanObj.mktCosts) +
              calcCompGroupTotalObj(masterPlanObj.finCosts) +
              calcCompGroupTotalObj(masterPlanObj.logCosts) +
              calcCompGroupTotalObj(masterPlanObj.opsCosts);
          }
        }
        setMasterCostSales(finalCostSales);

        const res = await fetch(`/api/sales/oem-plan?year=${planYear}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();

          let currentPlanRows = data.planRows || [];
          currentPlanRows = currentPlanRows.map((row: PlanItemRow) => {
            if (row.isFullWidth && row.fullWidthContent?.toLowerCase().includes("định mức chi phí")) {
              return {
                ...row,
                fullWidthContent: `II. Định mức chi phí (Ngân sách được phân bổ: ${finalCostSales.toLocaleString("vi-VN")} đ)`,
                disableContentChange: true
              };
            }
            return row;
          });
          setPlanRows(currentPlanRows);

          let cleanStaffRows = data.staffRows || [];
          if (Array.isArray(cleanStaffRows)) {
            // Filter out any full width rows
            cleanStaffRows = cleanStaffRows.filter((r: any) => !r.isFullWidth);
            // Re-index non-total rows sequentially
            let idx = 1;
            cleanStaffRows = cleanStaffRows.map((r: any) => {
              if (r.isTotal) return r;
              return {
                ...r,
                stt: String(idx++)
              };
            });
          }
          setStaffRows(cleanStaffRows);
          setCreatedDate(data.createdDate || "2026-06-15");
          if (data.monthlyTargets) {
            const healedTargets = JSON.parse(JSON.stringify(data.monthlyTargets));
            for (let m = 1; m <= 12; m++) {
              if (!healedTargets[m]) {
                healedTargets[m] = { chinhThuc: 0, lapKe: 0, layHangLe: 0, revenueRows: [] };
              }
              if (!healedTargets[m].revenueRows || healedTargets[m].revenueRows.length === 0) {
                healedTargets[m].revenueRows = [
                  { stt: "1.1", item: "Doanh thu từ đại lý", value: 0 },
                  { stt: "1.2", item: "Doanh thu từ bán lẻ", value: 0 }
                ];
              }
            }
            setMonthlyTargets(recalculateChinhThucChain(healedTargets));
          } else {
            setMonthlyTargets(getInitialMonthlyTargets());
          }
        } else if (res.status === 404) {
          if (masterPlanObj) {
            // Pre-populate from Master Plan
            mapMasterDataToStates(masterPlanObj, finalCostSales);
          } else {
            // No saved sales plan and no master plan data
            let currentPlanRows = DEFAULT_PLAN_ROWS.map((row: PlanItemRow) => {
              let cleanRow = { ...row };
              if (!cleanRow.isFullWidth) {
                cleanRow.target = 0;
                cleanRow.ratio = 0;
              }
              if (cleanRow.isFullWidth && cleanRow.fullWidthContent?.toLowerCase().includes("định mức chi phí")) {
                return {
                  ...cleanRow,
                  fullWidthContent: `II. Định mức chi phí (Ngân sách được phân bổ: 0 đ)`,
                  disableContentChange: true
                };
              }
              return cleanRow;
            });
            let zeroedStaffRows = DEFAULT_STAFF_ROWS.map((row: StaffItemRow) => {
              if (row.isFullWidth) return row;
              return {
                ...row,
                basicSalary: 0,
                performanceSalary: 0,
                allowance: 0,
                quantity: 0,
                totalBudget: 0
              };
            });
            setPlanRows(currentPlanRows);
            setStaffRows(zeroedStaffRows);
            setMonthlyTargets(getInitialMonthlyTargets());
          }
        } else {
          toast.error("Lỗi", "Không thể tải kế hoạch năm.");
        }
      } catch (err) {
        console.error("Fetch plan error:", err);
        toast.error("Lỗi", "Đã xảy ra lỗi kết nối khi tải kế hoạch.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [planYear]);

  const handleSyncFromMasterPlan = async () => {
    setIsLoading(true);
    try {
      const masterRes = await fetch(`/api/plan-finance/oem-master-plan?year=${planYear}`, { cache: "no-store" });
      if (!masterRes.ok) {
        toast.error("Lỗi", "Không thể tải dữ liệu từ Master Plan.");
        return;
      }

      const masterData = await masterRes.json();
      if (!masterData.plan || !masterData.plan.planData) {
        toast.error("Thông báo", "Chưa có dữ liệu lập kế hoạch Master Plan cho năm này.");
        return;
      }

      const parsed = JSON.parse(masterData.plan.planData);
      const totalRevenue = (Number(parsed.revenueAgent) || 0) + (Number(parsed.revenueOEM) || 0);

      const calcCompGroupTotalObj = (arr: any[]) => {
        if (!Array.isArray(arr)) return 0;
        return arr.reduce((sum, item) => {
          const val = parsed.s2_calcByRev
            ? Math.round(totalRevenue * (Number(item.pctVal) || 0) / 100)
            : (Number(item.val) || 0);
          return sum + val;
        }, 0);
      };

      const finalCostSales = calcCompGroupTotalObj(parsed.bizCosts) +
        calcCompGroupTotalObj(parsed.mktCosts) +
        calcCompGroupTotalObj(parsed.finCosts) +
        calcCompGroupTotalObj(parsed.logCosts) +
        calcCompGroupTotalObj(parsed.opsCosts);

      mapMasterDataToStates(parsed, finalCostSales);
      toast.success("Thành công", "Đã cập nhật dữ liệu chỉ tiêu từ Master Plan.");
    } catch (err) {
      console.error("Sync from Master Plan error:", err);
      toast.error("Lỗi", "Không thể đồng bộ dữ liệu từ Master Plan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPlanRows(prev => recalculatePlanRowsWithStaffTotal(prev, staffRows));
  }, [staffRows]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/sales/oem-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: parseInt(planYear),
          createdDate,
          planRows,
          staffRows,
          monthlyTargets,
          status: "ban-nhap",
        }),
      });

      if (res.ok) {
        setIsEditMode(false);
        toast.success("Thành công", "Đã lưu kế hoạch kinh doanh thành công.");
      } else {
        const data = await res.json();
        toast.error("Lỗi", data.error || "Không thể lưu kế hoạch.");
      }
    } catch (err) {
      console.error("Save plan error:", err);
      toast.error("Lỗi", "Đã xảy ra lỗi kết nối khi lưu kế hoạch.");
    }
  };

  const handleSaveMonthlyTargets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sales/oem-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: parseInt(planYear),
          createdDate,
          planRows,
          staffRows,
          monthlyTargets,
          status: "ban-nhap",
        }),
      });

      if (res.ok) {
        toast.success("Thành công", "Đã lưu kế hoạch kinh doanh tháng thành công.");
      } else {
        const data = await res.json();
        toast.error("Lỗi", data.error || "Không thể lưu kế hoạch tháng.");
      }
    } catch (err) {
      console.error("Save monthly targets error:", err);
      toast.error("Lỗi", "Đã xảy ra lỗi kết nối khi lưu kế hoạch tháng.");
    } finally {
      setIsLoading(false);
    }
  };

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: "yearly",
      title: "Kế hoạch năm",
      desc: "Kế hoạch năm",
      icon: "bi-calendar-range"
    },
    {
      num: 2,
      id: "monthly",
      title: "Kế hoạch tháng",
      desc: "Kế hoạch tháng",
      icon: "bi-calendar3"
    },
    {
      num: 3,
      id: "data",
      title: "Dữ liệu",
      desc: "Dữ liệu",
      icon: "bi-database-fill-check"
    }
  ];

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/sales/oem-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: parseInt(planYear),
          createdDate,
          planRows,
          staffRows,
          monthlyTargets,
          status: "cho-duyet",
        }),
      });

      if (res.ok) {
        setIsEditMode(false);
        toast.success("Thành công", `Đã gửi trình duyệt kế hoạch năm ${planYear}`);
      } else {
        const data = await res.json();
        toast.error("Lỗi", data.error || "Không thể trình duyệt kế hoạch.");
      }
    } catch (err) {
      console.error("Submit plan error:", err);
      toast.error("Lỗi", "Đã xảy ra lỗi kết nối khi gửi trình duyệt.");
    }
  };

  const handleReport = () => {
    setShowPrintModal(true);
  };

  const handleCellChange = (index: number, field: keyof PlanItemRow, val: string) => {
    if (field === "target" && planRows[index]?.stt === "2.5") {
      return;
    }
    setPlanRows(prev => {
      const updated = [...prev];
      if (field === "target") {
        const numVal = Number(val.replace(/\D/g, ""));
        updated[index] = { ...updated[index], target: numVal };
      } else {
        updated[index] = { ...updated[index], [field]: val };
      }

      // Tính tổng doanh thu (các mục con bắt đầu bằng "1.")
      const revenueSubItems = updated.filter(r => r.stt && r.stt.toString().startsWith("1."));
      const totalRevenue = revenueSubItems.reduce((sum, r) => sum + (r.target || 0), 0);

      // Tính tổng chi phí (các mục con bắt đầu bằng "2.")
      const costSubItems = updated.filter(r => r.stt && r.stt.toString().startsWith("2."));
      const totalCost = costSubItems.reduce((sum, r) => sum + (r.target || 0), 0);

      // Cập nhật lại tỷ trọng và tổng
      return updated.map(r => {
        if (r.stt === "1") {
          return { ...r, target: totalRevenue, ratio: 100 };
        }
        if (r.stt === "2") {
          const ratio = totalRevenue > 0 ? parseFloat((((totalCost) / totalRevenue) * 100).toFixed(1)) : 0;
          return { ...r, target: totalCost, ratio };
        }
        if (r.stt && r.stt.toString().startsWith("1.")) {
          const ratio = totalRevenue > 0 ? parseFloat((((r.target || 0) / totalRevenue) * 100).toFixed(1)) : 0;
          return { ...r, ratio };
        }
        if (r.stt && r.stt.toString().startsWith("2.")) {
          const ratio = totalRevenue > 0 ? parseFloat((((r.target || 0) / totalRevenue) * 100).toFixed(1)) : 0;
          return { ...r, ratio };
        }
        return r;
      });
    });
  };

  const handleAddChildRow = (row: PlanItemRow, index: number) => {
    const isRevenue = row.fullWidthContent?.includes("I. Mục tiêu doanh thu");
    const sectionPrefix = isRevenue ? "1." : "2.";

    setPlanRows(prev => {
      const sectionSubItems = prev.filter(r => r.stt && r.stt.toString().startsWith(sectionPrefix));
      const newStt = isRevenue
        ? `1.${sectionSubItems.length + 1}`
        : `2.${sectionSubItems.length + 1}`;

      const newRow: PlanItemRow = {
        stt: newStt,
        item: isRevenue ? "Kênh doanh thu mới" : "Khoản mục chi phí mới",
        target: 0,
        ratio: 0,
        note: ""
      };

      const updated = [...prev];
      let insertIndex = index + 1;
      for (let i = prev.length - 1; i >= 0; i--) {
        const item = prev[i];
        if (item.stt && item.stt.toString().startsWith(sectionPrefix)) {
          insertIndex = i + 1;
          break;
        }
      }

      updated.splice(insertIndex, 0, newRow);
      return updated;
    });

    toast.success("Thành công", `Đã thêm dòng mới vào phần ${isRevenue ? "Mục tiêu doanh thu" : "Định mức chi phí"}.`);
  };

  const handleDeleteRow = (index: number) => {
    setPlanRows(prev => {
      const updated = [...prev];
      const deletedRow = updated[index];
      const isRevenue = deletedRow.stt?.toString().startsWith("1.");
      const sectionPrefix = isRevenue ? "1." : "2.";

      updated.splice(index, 1);

      let subItemCount = 0;
      const reindexed = updated.map(r => {
        if (r.stt && r.stt.toString().startsWith(sectionPrefix) && r.stt !== (isRevenue ? "1" : "2")) {
          subItemCount++;
          return { ...r, stt: `${sectionPrefix}${subItemCount}` };
        }
        return r;
      });

      const revenueSubItems = reindexed.filter(r => r.stt && r.stt.toString().startsWith("1."));
      const totalRevenue = revenueSubItems.reduce((sum, r) => sum + (r.target || 0), 0);

      const costSubItems = reindexed.filter(r => r.stt && r.stt.toString().startsWith("2."));
      const totalCost = costSubItems.reduce((sum, r) => sum + (r.target || 0), 0);

      return reindexed.map(r => {
        if (r.stt === "1") {
          return { ...r, target: totalRevenue, ratio: 100 };
        }
        if (r.stt === "2") {
          const ratio = totalRevenue > 0 ? parseFloat((((totalCost) / totalRevenue) * 100).toFixed(1)) : 0;
          return { ...r, target: totalCost, ratio };
        }
        if (r.stt && r.stt.toString().startsWith("1.")) {
          const ratio = totalRevenue > 0 ? parseFloat((((r.target || 0) / totalRevenue) * 100).toFixed(1)) : 0;
          return { ...r, ratio };
        }
        if (r.stt && r.stt.toString().startsWith("2.")) {
          const ratio = totalRevenue > 0 ? parseFloat((((r.target || 0) / totalRevenue) * 100).toFixed(1)) : 0;
          return { ...r, ratio };
        }
        return r;
      });
    });

    toast.success("Thành công", "Đã xóa dòng khoản mục thành công.");
  };

  const handleDeleteStaffRow = (index: number) => {
    setStaffRows(prev => {
      const updated = [...prev];
      updated.splice(index, 1);

      // Re-index all non-total rows sequentially
      let idx = 1;
      const reindexed = updated.map(r => {
        if (r.isTotal) return r;
        return {
          ...r,
          stt: String(idx++)
        };
      });

      const subItems = reindexed.filter(r => !r.isTotal);
      const totalQty = subItems.reduce((sum, r) => sum + (r.quantity || 0), 0);
      const totalBgt = subItems.reduce((sum, r) => sum + (r.totalBudget || 0), 0);

      return reindexed.map(r => {
        if (r.isTotal) {
          return { ...r, quantity: totalQty, totalBudget: totalBgt };
        }
        return r;
      });
    });

    toast.success("Thành công", "Đã xóa vị trí thành công.");
  };

  const handleAddStaffRow = () => {
    setStaffRows(prev => {
      const updated = [...prev];
      const totalIndex = updated.findIndex(r => r.isTotal);

      const newRow: StaffItemRow = {
        stt: "",
        role: "Vị trí mới",
        basicSalary: 0,
        performanceSalary: 0,
        allowance: 0,
        quantity: 1,
        totalBudget: 0
      };

      if (totalIndex !== -1) {
        updated.splice(totalIndex, 0, newRow);
      } else {
        updated.push(newRow);
      }

      // Re-index all non-total rows sequentially
      let idx = 1;
      const reindexed = updated.map(r => {
        if (r.isTotal) return r;
        return {
          ...r,
          stt: String(idx++)
        };
      });

      // Recalculate Grand Total
      const subItems = reindexed.filter(r => !r.isTotal);
      const totalQty = subItems.reduce((sum, r) => sum + (r.quantity || 0), 0);
      const totalBgt = subItems.reduce((sum, r) => sum + (r.totalBudget || 0), 0);

      return reindexed.map(r => {
        if (r.isTotal) {
          return { ...r, quantity: totalQty, totalBudget: totalBgt };
        }
        return r;
      });
    });

    toast.success("Thành công", "Đã thêm vị trí mới.");
  };

  const handleAddDepartment = () => {
    setStaffRows(prev => {
      const updated = [...prev];
      const deptCount = prev.filter(r => r.isFullWidth).length;
      const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
      const romanPrefix = romanNumerals[deptCount + 1] || `${deptCount + 1}`;

      const newDeptRow: StaffItemRow = {
        isFullWidth: true,
        fullWidthContent: `${romanPrefix}. Phòng ban mới`
      };

      let insertIndex = prev.findIndex(r => r.isTotal);
      if (insertIndex === -1) {
        insertIndex = prev.length;
      }

      updated.splice(insertIndex, 0, newDeptRow);
      return updated;
    });

    toast.success("Thành công", "Đã thêm phòng ban mới.");
  };

  const handleDeleteDepartment = (row: StaffItemRow, index: number) => {
    setStaffRows(prev => {
      let deleteCount = 1;
      for (let i = index + 1; i < prev.length; i++) {
        if (prev[i].isFullWidth || prev[i].isTotal) {
          break;
        }
        deleteCount++;
      }

      const updated = [...prev];
      updated.splice(index, deleteCount);

      let deptCounter = 0;
      const romanNumerals = [
        "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
        "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"
      ];
      let childCounter = 0;

      const reindexed = updated.map(r => {
        if (r.isFullWidth) {
          deptCounter++;
          childCounter = 0;
          let cleanText = r.fullWidthContent || "";
          const dotIndex = cleanText.indexOf(".");
          if (dotIndex !== -1) {
            const prefix = cleanText.substring(0, dotIndex).trim();
            const isRoman = /^[IVXLCDM\d]+$/i.test(prefix);
            if (isRoman) {
              cleanText = cleanText.substring(dotIndex + 1).trim();
            }
          }
          const romanPrefix = romanNumerals[deptCounter] || `${deptCounter}`;
          return {
            ...r,
            fullWidthContent: `${romanPrefix}. ${cleanText}`
          };
        } else if (r.isTotal) {
          return r;
        } else {
          childCounter++;
          return {
            ...r,
            stt: `${deptCounter}.${childCounter}`
          };
        }
      });

      const subItems = reindexed.filter(r => !r.isTotal && !r.isFullWidth);
      const totalQty = subItems.reduce((sum, r) => sum + (r.quantity || 0), 0);
      const totalBgt = subItems.reduce((sum, r) => sum + (r.totalBudget || 0), 0);

      return reindexed.map(r => {
        if (r.isTotal) {
          return { ...r, quantity: totalQty, totalBudget: totalBgt };
        }
        return r;
      });
    });

    toast.success("Thành công", "Đã xóa phòng ban và toàn bộ vị trí trực thuộc thành công.");
  };

  const handlePlanFullWidthContentChange = (row: PlanItemRow, index: number, val: string) => {
    setPlanRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], fullWidthContent: val };
      return updated;
    });
  };

  const handleStaffFullWidthContentChange = (row: StaffItemRow, index: number, val: string) => {
    setStaffRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], fullWidthContent: val };
      return updated;
    });
  };

  const handleAddStaffRole = (row: StaffItemRow, index: number) => {
    const content = row.fullWidthContent || "";
    setStaffRows(prev => {
      const depts = prev.filter(r => r.isFullWidth);
      const deptIndex = depts.findIndex(d => d.fullWidthContent === row.fullWidthContent);
      const sectionNum = deptIndex !== -1 ? deptIndex + 1 : 1;
      const sectionPrefix = `${sectionNum}.`;

      const sectionSubItems = prev.filter(r => r.stt && r.stt.toString().startsWith(sectionPrefix) && !r.isTotal && !r.isFullWidth);
      const newStt = `${sectionPrefix}${sectionSubItems.length + 1}`;

      const newRow: StaffItemRow = {
        stt: newStt,
        role: "Vị trí mới",
        basicSalary: 0,
        performanceSalary: 0,
        allowance: 0,
        quantity: 1,
        totalBudget: 0
      };

      const updated = [...prev];
      let insertIndex = index + 1;
      for (let i = prev.length - 1; i >= 0; i--) {
        const item = prev[i];
        if (item.stt && item.stt.toString().startsWith(sectionPrefix) && !item.isTotal && !item.isFullWidth) {
          insertIndex = i + 1;
          break;
        }
      }

      updated.splice(insertIndex, 0, newRow);
      return updated;
    });

    toast.success("Thành công", `Đã thêm vị trí mới vào phòng ban.`);
  };

  const handleTableInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, colName: string) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const inputs = Array.from(
        document.querySelectorAll(`[data-col="${colName}"]:not([readonly])`)
      ) as HTMLInputElement[];
      const currentIndex = inputs.indexOf(e.currentTarget);
      if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
        const nextInput = inputs[currentIndex + 1];
        nextInput.focus();
        setTimeout(() => {
          nextInput.select();
        }, 10);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const inputs = Array.from(
        document.querySelectorAll(`[data-col="${colName}"]:not([readonly])`)
      ) as HTMLInputElement[];
      const currentIndex = inputs.indexOf(e.currentTarget);
      if (currentIndex > 0) {
        const prevInput = inputs[currentIndex - 1];
        prevInput.focus();
        setTimeout(() => {
          prevInput.select();
        }, 10);
      }
    }
  };

  const columns: TableColumn<PlanItemRow>[] = [
    {
      header: "STT",
      width: "70px",
      align: "center",
      render: (row) => (
        <span className={`fw-bold ${row.isTotal ? "text-dark" : "text-secondary"}`}>
          {row.stt}
        </span>
      )
    },
    {
      header: "Khoản mục",
      render: (row, idx) => {
        const isTotal = row.isTotal;

        return (
          <div className="d-flex flex-column gap-0.5">
            <input
              type="text"
              data-col="plan-item"
              value={row.item || ""}
              onChange={(e) => !isTotal && handleCellChange(idx, "item", e.target.value)}
              onKeyDown={(e) => handleTableInputKeyDown(e, "plan-item")}
              readOnly={!isEditMode || isTotal}
              className={`form-control form-control-sm border-0 bg-transparent px-0 text-dark ${isTotal ? "fw-bold" : "fw-medium"}`}
              style={{ fontSize: 13, pointerEvents: (!isEditMode || isTotal) ? "none" : "auto", height: "20px" }}
            />
          </div>
        );
      }
    },
    {
      header: "Mục tiêu năm (đ)",
      width: "170px",
      align: "right",
      render: (row, idx) => {
        const isTotal = row.isTotal;
        const isRow25 = row.stt === "2.5";
        const isTotalCost = row.stt === "2";
        const isOverBudget = isTotalCost && masterCostSales > 0 && (row.target || 0) > masterCostSales;

        if (isTotalCost) {
          return (
            <div className="d-flex align-items-center justify-content-end w-100">
              {isOverBudget && (
                <span
                  className="pulse-danger-dot"
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#ef4444",
                    display: "inline-block",
                    marginRight: "8px",
                    animation: "pulse-danger 1.2s infinite alternate"
                  }}
                  title="Vượt ngân sách được phân bổ!"
                />
              )}
              <span className={`fw-bold ${isOverBudget ? "text-danger" : "text-primary"}`} style={{ fontSize: 13 }}>
                {(row.target || 0).toLocaleString("vi-VN")}
              </span>
            </div>
          );
        }

        return (
          <input
            type="text"
            data-col="plan-target"
            value={(row.target || 0).toLocaleString("vi-VN")}
            onChange={(e) => !isTotal && !isRow25 && handleCellChange(idx, "target", e.target.value)}
            onKeyDown={(e) => handleTableInputKeyDown(e, "plan-target")}
            readOnly={!isEditMode || isTotal || isRow25}
            className={`form-control form-control-sm border-0 bg-transparent px-0 text-end text-dark ${isTotal ? "fw-bold text-primary" : "fw-medium"}`}
            style={{
              fontSize: 13,
              pointerEvents: (!isEditMode || isTotal || isRow25) ? "none" : "auto",
              backgroundColor: isRow25 && isEditMode ? "rgba(108, 117, 125, 0.08)" : undefined,
              borderRadius: isRow25 && isEditMode ? "4px" : undefined,
              paddingRight: isRow25 && isEditMode ? "4px" : undefined
            }}
          />
        );
      }
    },
    {
      header: "Tỷ lệ trên doanh thu (%)",
      width: "180px",
      align: "center",
      render: (row) => (
        <span className={`fw-bold ${row.isTotal ? "text-primary" : "text-indigo"}`}>
          {row.ratio !== undefined ? row.ratio.toFixed(1) : "0.0"}%
        </span>
      )
    },
    ...(isEditMode ? [{
      header: "",
      width: "50px",
      align: "center" as const,
      render: (row: PlanItemRow, idx: number) => {
        const isChildRow = row.stt && row.stt.toString().includes(".");
        if (!isChildRow) return null;

        return (
          <button
            type="button"
            onClick={() => handleDeleteRow(idx)}
            className="btn btn-sm btn-link text-danger p-0 d-flex align-items-center justify-content-center transition"
            style={{ width: "24px", height: "24px" }}
            title="Xóa dòng"
          >
            <i className="bi bi-trash3-fill" style={{ fontSize: 14 }} />
          </button>
        );
      }
    }] : [])
  ];

  const handleStaffCellChange = (index: number, field: keyof StaffItemRow, val: string) => {
    setStaffRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index] };

      if (field === "role") {
        row.role = val;
      } else {
        const numVal = Number(val.replace(/\D/g, ""));
        (row as any)[field] = numVal;
      }

      // Calculate totalBudget for this row if not a total row or full width header
      if (!row.isTotal && !row.isFullWidth) {
        const basic = row.basicSalary || 0;
        const perf = row.performanceSalary || 0;
        const allow = row.allowance || 0;
        const qty = row.quantity || 0;
        row.totalBudget = (basic + perf + allow) * qty * 12;
      }

      updated[index] = row;

      // Recalculate Grand Total
      const subItems = updated.filter(r => !r.isTotal && !r.isFullWidth);
      const totalQty = subItems.reduce((sum, r) => sum + (r.quantity || 0), 0);
      const totalBgt = subItems.reduce((sum, r) => sum + (r.totalBudget || 0), 0);

      return updated.map(r => {
        if (r.isTotal) {
          return { ...r, quantity: totalQty, totalBudget: totalBgt };
        }
        return r;
      });
    });
  };

  const staffColumns: TableColumn<StaffItemRow>[] = [
    {
      header: "STT",
      width: "60px",
      align: "center",
      render: (row) => (
        <span className={`fw-bold ${row.isTotal ? "text-dark" : "text-secondary"}`}>
          {row.isTotal ? null : row.stt}
        </span>
      )
    },
    {
      header: "Vị trí",
      width: "250px",
      render: (row, idx) => {
        const isTotal = row.isTotal;
        if (isTotal) return null;
        return (
          <input
            type="text"
            data-col="staff-role"
            value={row.role || ""}
            onChange={(e) => !isTotal && handleStaffCellChange(idx, "role", e.target.value)}
            onKeyDown={(e) => handleTableInputKeyDown(e, "staff-role")}
            readOnly={!isEditMode || isTotal}
            className={`form-control form-control-sm border-0 bg-transparent px-0 text-dark fw-medium`}
            style={{ fontSize: 13, pointerEvents: !isEditMode ? "none" : "auto" }}
          />
        );
      }
    },
    {
      header: "Lương cơ bản (đ)",
      width: "125px",
      align: "right",
      render: (row, idx) => {
        const isTotal = row.isTotal;
        return isTotal ? null : (
          <input
            type="text"
            data-col="staff-basic-salary"
            value={(row.basicSalary || 0).toLocaleString("vi-VN")}
            onChange={(e) => handleStaffCellChange(idx, "basicSalary", e.target.value)}
            onKeyDown={(e) => handleTableInputKeyDown(e, "staff-basic-salary")}
            readOnly={!isEditMode}
            className="form-control form-control-sm border-0 bg-transparent px-0 text-end text-dark fw-medium"
            style={{ fontSize: 13, pointerEvents: !isEditMode ? "none" : "auto" }}
          />
        );
      }
    },
    {
      header: "Lương hiệu suất (đ)",
      width: "125px",
      align: "right",
      render: (row, idx) => {
        const isTotal = row.isTotal;
        return isTotal ? null : (
          <input
            type="text"
            data-col="staff-performance-salary"
            value={(row.performanceSalary || 0).toLocaleString("vi-VN")}
            onChange={(e) => handleStaffCellChange(idx, "performanceSalary", e.target.value)}
            onKeyDown={(e) => handleTableInputKeyDown(e, "staff-performance-salary")}
            readOnly={!isEditMode}
            className="form-control form-control-sm border-0 bg-transparent px-0 text-end text-dark fw-medium"
            style={{ fontSize: 13, pointerEvents: !isEditMode ? "none" : "auto" }}
          />
        );
      }
    },
    {
      header: "Phụ cấp (đ)",
      width: "120px",
      align: "right",
      render: (row, idx) => {
        const isTotal = row.isTotal;
        return isTotal ? null : (
          <input
            type="text"
            data-col="staff-allowance"
            value={(row.allowance || 0).toLocaleString("vi-VN")}
            onChange={(e) => handleStaffCellChange(idx, "allowance", e.target.value)}
            onKeyDown={(e) => handleTableInputKeyDown(e, "staff-allowance")}
            readOnly={!isEditMode}
            className="form-control form-control-sm border-0 bg-transparent px-0 text-end text-dark fw-medium"
            style={{ fontSize: 13, pointerEvents: !isEditMode ? "none" : "auto" }}
          />
        );
      }
    },
    {
      header: "Số lượng",
      width: "90px",
      align: "center",
      render: (row, idx) => {
        const isTotal = row.isTotal;
        return isTotal ? (
          <span className="fw-bold text-dark">{row.quantity}</span>
        ) : (
          <input
            type="text"
            data-col="staff-quantity"
            value={row.quantity || 0}
            onChange={(e) => handleStaffCellChange(idx, "quantity", e.target.value)}
            onKeyDown={(e) => handleTableInputKeyDown(e, "staff-quantity")}
            readOnly={!isEditMode}
            className="form-control form-control-sm border-0 bg-transparent px-0 text-center text-dark fw-medium"
            style={{ fontSize: 13, pointerEvents: !isEditMode ? "none" : "auto" }}
          />
        );
      }
    },
    {
      header: "Quỹ lương (đ)",
      width: "130px",
      align: "right",
      render: (row) => (
        <span className={`fw-bold ${row.isTotal ? "text-primary" : "text-dark"}`}>
          {(row.totalBudget || 0).toLocaleString("vi-VN")}
        </span>
      )
    },
    ...(isEditMode ? [{
      header: "",
      width: "50px",
      align: "center" as const,
      render: (row: StaffItemRow, idx: number) => {
        if (row.isTotal || row.isFullWidth) return null;

        return (
          <button
            type="button"
            onClick={() => handleDeleteStaffRow(idx)}
            className="btn btn-sm btn-link text-danger p-0 d-flex align-items-center justify-content-center transition"
            style={{ width: "24px", height: "24px" }}
            title="Xóa dòng"
          >
            <i className="bi bi-trash3-fill" style={{ fontSize: 14 }} />
          </button>
        );
      }
    }] : [])
  ];

  const renderStaffHeader = () => {
    const headerStyle: React.CSSProperties = {
      padding: "7px 14px",
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "var(--muted-foreground)",
      borderBottom: "2px solid var(--border)",
      verticalAlign: "middle",
      backgroundColor: "#ffffff",
      position: "sticky",
      top: 0,
      zIndex: 10,
    };

    const subHeaderStyle: React.CSSProperties = {
      ...headerStyle,
      top: "28px",
      borderBottom: "2px solid var(--border)",
    };

    return (
      <>
        <tr>
          <th rowSpan={2} style={{ ...headerStyle, textAlign: "center", width: "60px" }}>STT</th>
          <th rowSpan={2} style={{ ...headerStyle, textAlign: "left", width: "250px" }}>Vị trí</th>
          <th colSpan={3} style={{ ...headerStyle, textAlign: "center", borderBottom: "1px solid var(--border)" }}>Lương và phụ cấp tháng (đ)</th>
          <th rowSpan={2} style={{ ...headerStyle, textAlign: "center", width: "90px" }}>Số lượng</th>
          <th rowSpan={2} style={{ ...headerStyle, textAlign: "right", width: "130px" }}>Quỹ lương (đ)</th>
          {isEditMode && <th rowSpan={2} style={{ ...headerStyle, textAlign: "center", width: "50px" }}></th>}
        </tr>
        <tr>
          <th style={{ ...subHeaderStyle, textAlign: "right", width: "125px" }}>Cơ bản</th>
          <th style={{ ...subHeaderStyle, textAlign: "right", width: "125px" }}>Hiệu suất</th>
          <th style={{ ...subHeaderStyle, textAlign: "right", width: "120px" }}>Phụ cấp</th>
        </tr>
      </>
    );
  };

  return (
    <>

      {/* STEP 1: KẾ HOẠCH NĂM */}
      {currentStep === 1 && (
        <div className="d-flex flex-column w-100">
          <TableToolbar
            style={{ marginBottom: 0 }}
            customFilters={
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {/* Droplist Năm kế hoạch */}
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold text-secondary text-nowrap" style={{ fontSize: 12.5 }}>
                    Năm kế hoạch
                  </span>
                  <div style={{ width: "100px" }}>
                    <Select
                      value={planYear}
                      onChange={(e) => setPlanYear(e.target.value)}
                      style={{ marginBottom: 0 }}
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                    </Select>
                  </div>
                </div>

                {/* Ngày lập */}
                <div className="d-flex align-items-center gap-2 ms-1">
                  <span className="fw-semibold text-secondary text-nowrap" style={{ fontSize: 12.5 }}>
                    Ngày lập
                  </span>
                  <div style={{ width: "145px" }}>
                    <Input
                      type="date"
                      value={createdDate}
                      onChange={(e) => setCreatedDate(e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                </div>
              </div>
            }
            rightActions={
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: "auto" }}>
                  <Toggle
                    checked={isEditMode}
                    onChange={(checked) => setIsEditMode(checked)}
                    label="Chỉnh sửa"
                  />
                </div>
                {isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncFromMasterPlan}
                    leftIcon={<i className="bi bi-arrow-repeat" />}
                    style={{ height: "34px" }}
                  >
                    Cập nhật từ Master Plan
                  </Button>
                )}
              </div>
            }
            menuItems={[
              {
                id: "submit-plan",
                label: "Trình duyệt",
                icon: <i className="bi bi-send-fill" style={{ color: "#3b82f6", fontSize: 15 }} />,
                onClick: handleSubmit,
              },
              {
                id: "report-plan",
                label: "Báo cáo",
                icon: <i className="bi bi-file-earmark-bar-graph" style={{ color: "#8b5cf6", fontSize: 15 }} />,
                onClick: handleReport,
              },
              {
                id: "save-plan",
                label: "Lưu kế hoạch",
                icon: <i className="bi bi-floppy-fill" style={{ color: "#10b981", fontSize: 15 }} />,
                onClick: handleSave,
              },
            ]}
          />

          <div className="p-3">
            <div className="row g-3 plan-row">
              {/* Cột trái (Tỷ lệ 4) */}
              <div className="col-12 col-xl-4 d-flex flex-column gap-3" style={{ minWidth: 0 }}>
                {/* Thẻ 1: Biểu đồ dạng progressbar hiển thị tỷ lệ chi phí so với doanh thu */}
                {(() => {
                  const totalRevenue = planRows.find(r => r.stt === "1")?.target || 0;
                  const totalCost = planRows.find(r => r.stt === "2")?.target || 0;
                  const costRatio = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

                  return (
                    <div className="plan-subcard w-100">
                      <div className="plan-subcard-header">
                        <SectionTitle
                          title="Tỷ lệ Chi phí / Doanh thu"
                          icon="bi-pie-chart-fill"
                          className="mb-0"
                        />
                      </div>

                      <div className="plan-subcard-body d-flex flex-column" style={{ gap: "8px" }}>
                        {/* Doanh thu */}
                        <div className="d-flex justify-content-between text-secondary" style={{ fontSize: 13 }}>
                          <span>Tổng doanh thu</span>
                          <span className="fw-bold text-dark">{totalRevenue.toLocaleString("vi-VN")} đ</span>
                        </div>

                        {/* Chi phí */}
                        <div className="d-flex justify-content-between text-secondary" style={{ fontSize: 13 }}>
                          <span>Tổng chi phí</span>
                          <span className="fw-bold text-dark">{totalCost.toLocaleString("vi-VN")} đ</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-1">
                          <div className="progress rounded-pill overflow-hidden bg-secondary-subtle" style={{ height: "8px" }}>
                            <div
                              className="progress-bar rounded-pill bg-indigo transition"
                              role="progressbar"
                              style={{
                                width: `${Math.min(costRatio, 100)}%`,
                                transition: "width 0.4s ease-in-out"
                              }}
                              aria-valuenow={costRatio}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className="text-secondary" style={{ fontSize: 13 }}>Tỷ lệ chi phí định mức</span>
                            <span className="fw-bold text-indigo" style={{ fontSize: 14 }}>{costRatio.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Thẻ 2: Biểu đồ donut thể hiện các thành phần doanh thu */}
                {(() => {
                  const revenueSubItems = planRows.filter(r => r.stt && r.stt.toString().startsWith("1.") && r.stt.toString() !== "1" && !r.isTotal);
                  const totalRevenueSub = revenueSubItems.reduce((sum, r) => sum + (r.target || 0), 0);

                  const COLORS = ["#6366f1", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e"];
                  const itemsWithPct = revenueSubItems.map((r, i) => {
                    const pct = totalRevenueSub > 0 ? (r.target || 0) / totalRevenueSub : 0;
                    return {
                      name: r.item || "Khác",
                      value: r.target || 0,
                      percentage: pct * 100,
                      color: COLORS[i % COLORS.length]
                    };
                  });

                  let accumulatedPercent = 0;
                  const segments = itemsWithPct.map(item => {
                    const offset = 100 - accumulatedPercent;
                    accumulatedPercent += item.percentage;
                    return {
                      ...item,
                      strokeDasharray: `${item.percentage} ${100 - item.percentage}`,
                      strokeDashoffset: offset
                    };
                  });

                  return (
                    <div className="plan-subcard w-100">
                      <div className="plan-subcard-header">
                        <SectionTitle
                          title="Cơ cấu doanh thu"
                          icon="bi-pie-chart"
                          className="mb-0"
                        />
                      </div>

                      <div className="plan-subcard-body">
                        <div className="row align-items-center g-3">
                          {/* Centered large donut chart */}
                          <div className="col-12 col-md-5 col-xl-12 d-flex justify-content-center align-items-center">
                            <div className="position-relative d-flex justify-content-center" style={{ width: "145px", height: "145px" }}>
                              <svg width="145" height="145" viewBox="0 0 42 42" className="donut-chart" style={{ transform: "rotate(-90deg)" }}>
                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="8.5" />
                                {segments.map((seg, i) => (
                                  <circle
                                    key={i}
                                    cx="21"
                                    cy="21"
                                    r="15.91549430918954"
                                    fill="transparent"
                                    stroke={seg.color}
                                    strokeWidth="8.5"
                                    strokeDasharray={seg.strokeDasharray}
                                    strokeDashoffset={seg.strokeDashoffset}
                                    style={{ transition: "stroke-dashoffset 0.3s ease" }}
                                  />
                                ))}
                              </svg>
                              {/* Center text inside the donut */}
                              <div
                                className="position-absolute d-flex flex-column align-items-center justify-content-center"
                                style={{
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  pointerEvents: "none"
                                }}
                              >
                                <span className="fw-bold text-dark" style={{ fontSize: 13.5 }}>Doanh thu</span>
                                <span className="text-secondary" style={{ fontSize: 10.5 }}>Cơ cấu</span>
                              </div>
                            </div>
                          </div>

                          {/* Legends below/beside */}
                          <div className="col-12 col-md-7 col-xl-12">
                            <div className="donut-legends-container d-flex flex-column w-100 mt-2 mt-md-0 mt-xl-2 pt-2 border-top border-light-subtle" style={{ gap: "8px" }}>
                              {itemsWithPct.map((item, i) => (
                                <div key={i} className="d-flex align-items-center justify-content-between">
                                  <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                                    <span
                                      className="rounded-circle flex-shrink-0"
                                      style={{ width: "8px", height: "8px", backgroundColor: item.color }}
                                    />
                                    <span className="text-dark fw-medium text-truncate" style={{ fontSize: 12.5 }} title={item.name}>
                                      {item.name}
                                    </span>
                                  </div>
                                  <span className="text-secondary fw-semibold flex-shrink-0 ps-2" style={{ fontSize: 12 }}>
                                    {item.percentage.toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Cột phải (Tỷ lệ 8) */}
              <div className="col-12 col-xl-8 d-flex flex-column gap-3" style={{ minWidth: 0 }}>
                <div className="plan-subcard">
                  <div className="plan-subcard-header">
                    <SectionTitle
                      title={`Tổng quan kế hoạch kinh doanh năm ${planYear}`}
                      icon="bi-bar-chart-line"
                      className="mb-0"
                    />
                  </div>
                  <div className="bg-white compact-plan-table">
                    <Table
                      rows={planRows}
                      columns={columns}
                      striped={true}
                      compact={true}
                      fontSize={13}
                      onFullWidthActionClick={isEditMode ? handleAddChildRow : undefined}
                      onFullWidthContentChange={isEditMode ? handlePlanFullWidthContentChange : undefined}
                      loading={isLoading}
                    />
                  </div>
                </div>

                <div className="plan-subcard">
                  <div className="plan-subcard-header">
                    <SectionTitle
                      title="Chi tiết chi phí lương thưởng"
                      icon="bi-cash-stack"
                      className="mb-0 w-100"
                      action={
                        isEditMode && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddStaffRow}
                            leftIcon={<i className="bi bi-plus-lg" />}
                          >
                            Thêm vị trí
                          </Button>
                        )
                      }
                    />
                  </div>
                  <div className="bg-white compact-plan-table">
                    <Table
                      rows={staffRows}
                      columns={staffColumns}
                      striped={true}
                      compact={true}
                      fontSize={13}
                      renderHeader={renderStaffHeader}
                      onFullWidthActionClick={isEditMode ? handleAddStaffRole : undefined}
                      onFullWidthDeleteClick={isEditMode ? handleDeleteDepartment : undefined}
                      onFullWidthContentChange={isEditMode ? handleStaffFullWidthContentChange : undefined}
                      loading={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: KẾ HOẠCH THÁNG */}
      {currentStep === 2 && (
        <div className="d-flex flex-column h-100 p-3 gap-3">
          <div className="plan-subcard">
            <div className="plan-subcard-header">
              <SectionTitle
                title="Kế hoạch mục tiêu tháng"
                icon="bi-calendar-event"
                className="mb-0 w-100"
                action={
                  <div className="d-flex align-items-center gap-3">
                    {/* TIMELINE THÁNG */}
                    <div className="position-relative d-flex align-items-center" style={{ width: "380px", maxWidth: "100%", height: "28px" }}>
                      <div
                        className="position-absolute"
                        style={{ height: "2px", left: "14px", right: "14px", zIndex: 1, backgroundColor: "var(--border)", borderRadius: "1px" }}
                      />
                      <div className="position-relative w-100 d-flex justify-content-between align-items-center" style={{ zIndex: 2 }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                          <button
                            key={m}
                            type="button"
                            className="rounded-circle d-flex align-items-center justify-content-center transition shadow-sm timeline-month-btn p-0"
                            style={{
                              width: "28px",
                              height: "28px",
                              fontSize: "12px",
                              fontWeight: 700,
                              backgroundColor: selectedMonth === m ? "var(--primary)" : "var(--card)",
                              border: `2px solid ${selectedMonth === m ? "var(--primary)" : "var(--border)"}`,
                              color: selectedMonth === m ? "#ffffff" : "var(--muted-foreground)",
                              cursor: "pointer",
                              zIndex: 2
                            }}
                            onClick={() => setSelectedMonth(m)}
                            title={`Tháng ${m}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveMonthlyTargets}
                      isLoading={isLoading}
                      leftIcon={<i className="bi bi-floppy-fill" style={{ fontSize: "12px" }} />}
                    >
                      Lưu
                    </Button>
                  </div>
                }
              />
            </div>
          </div>

          {/* SPLIT LAYOUT 5-7 */}
          <div className="row g-3 flex-grow-1" style={{ minHeight: 0 }}>
            {/* CỘT TRÁI (Tỷ lệ 5) */}
            <div className="col-12 col-xl-5 d-flex flex-column gap-3 h-100">

              {/* MỤC TIÊU THÁNG */}
              <div className="plan-subcard flex-shrink-0">
                <div className="plan-subcard-header">
                  <SectionTitle title="Mục tiêu doanh thu" icon="bi-bullseye" className="mb-0" />
                </div>
                <div className="plan-subcard-body">
                  <div className="row g-3">
                    <div className="col-4">
                      <div className="d-flex flex-column gap-1">
                        <label className="text-secondary fw-medium" style={{ fontSize: 12.5 }}>Thanh lý hàng</label>
                        <div className="position-relative">
                          <input 
                            type="text" 
                            className="form-control form-control-sm rounded-3 pe-4 text-end" 
                            placeholder="0" 
                            value={monthlyTargets[selectedMonth]?.thanhLy?.toLocaleString("en-US") || ""}
                            onChange={(e) => handleMonthlyTargetChange(selectedMonth, 'thanhLy', e.target.value)} 
                          />
                          <span className="position-absolute top-50 end-0 translate-middle-y me-2 text-secondary fw-medium" style={{ fontSize: 12 }}>đ</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="d-flex flex-column gap-1">
                        <label className="text-secondary fw-medium" style={{ fontSize: 12.5 }}>Bán hàng cho đại lý</label>
                        <div className="position-relative">
                          <input 
                            type="text" 
                            className="form-control form-control-sm rounded-3 pe-4 text-end" 
                            placeholder="0" 
                            value={monthlyTargets[selectedMonth]?.daiLy?.toLocaleString("en-US") || ""}
                            onChange={(e) => handleMonthlyTargetChange(selectedMonth, 'daiLy', e.target.value)} 
                          />
                          <span className="position-absolute top-50 end-0 translate-middle-y me-2 text-secondary fw-medium" style={{ fontSize: 12 }}>đ</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="d-flex flex-column gap-1">
                        <label className="text-secondary fw-medium" style={{ fontSize: 12.5 }}>Bán lẻ</label>
                        <div className="position-relative">
                          <input 
                            type="text" 
                            className="form-control form-control-sm rounded-3 pe-4 text-end" 
                            placeholder="0" 
                            value={monthlyTargets[selectedMonth]?.banLe?.toLocaleString("en-US") || ""}
                            onChange={(e) => handleMonthlyTargetChange(selectedMonth, 'banLe', e.target.value)} 
                          />
                          <span className="position-absolute top-50 end-0 translate-middle-y me-2 text-secondary fw-medium" style={{ fontSize: 12 }}>đ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CHIẾN LƯỢC HÀNH ĐỘNG */}
              <div className="plan-subcard d-flex flex-column flex-grow-1">
                <div className="plan-subcard-header flex-shrink-0">
                  <SectionTitle 
                    title="Chiến lược hành động" 
                    icon="bi-lightbulb"
                    className="mb-0 w-100" 
                    action={
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingStrategy(null); setShowStrategyOffcanvas(true); }}
                        leftIcon={<i className="bi bi-plus-lg" />}
                      >
                        Thêm chiến lược
                      </Button>
                    }
                  />
                </div>
                <div className="flex-grow-1 h-100 bg-white" style={{ minHeight: 0 }}>
                  <Table
                    columns={[
                      { header: "STT", render: (row: any) => row.stt, width: "60px", align: "center" },
                      { 
                        header: "Nội dung chiến lược", 
                        render: (row: any) => (
                          <div className="d-flex flex-column gap-1 py-1">
                            <span className="fw-medium text-dark">{row.name}</span>
                            {row.detail && <span className="text-secondary" style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{row.detail}</span>}
                          </div>
                        ) 
                      },
                    ]}
                    rows={monthlyTargets[selectedMonth]?.strategies || []}
                    onRowClick={(row: any) => { setEditingStrategy(row); setShowStrategyOffcanvas(true); }}
                    compact={true}
                    wrapperClassName="mkt-plan-table-no-min h-100"
                  />
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (Tỷ lệ 7) */}
            <div className="col-12 col-xl-7 d-flex flex-column h-100">

              {/* CÁC CÔNG VIỆC CẦN THỰC HIỆN NGAY */}
              <div className="plan-subcard d-flex flex-column flex-grow-1 h-100">
                <div className="plan-subcard-header flex-shrink-0">
                  <SectionTitle
                    title="Các công việc cần thực hiện ngay"
                    icon="bi-list-check"
                    className="mb-0 w-100"
                    action={
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingTask(null); setShowTaskOffcanvas(true); }}
                        leftIcon={<i className="bi bi-plus-lg" />}
                      >
                        Thêm công việc
                      </Button>
                    }
                  />
                </div>
                <div className="d-flex flex-column flex-grow-1 bg-white" style={{ minHeight: "480px" }}>
                  <div className="flex-grow-1 h-100">
                    <Table
                      columns={[
                        { header: "STT", render: (row: any) => row.stt, width: "60px", align: "center" },
                        { 
                          header: "Tên công việc", 
                          render: (row: any) => (
                            <div className="d-flex flex-column gap-1 py-1">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-medium text-dark">{row.name}</span>
                                <span className="badge bg-light text-secondary border fw-medium" style={{ fontSize: 10 }}>
                                  {row.status || "Chưa thực hiện"}
                                </span>
                              </div>
                              {row.detail && <span className="text-secondary" style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{row.detail}</span>}
                            </div>
                          ) 
                        },
                        { header: "Người thực hiện", render: (row: any) => row.assignee },
                      ]}
                      rows={monthlyTargets[selectedMonth]?.tasks || []}
                      onRowClick={(row: any) => { setEditingTask(row); setShowTaskOffcanvas(true); }}
                      compact={true}
                      wrapperClassName="mkt-plan-table-no-min h-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <AddStrategyOffcanvas 
            open={showStrategyOffcanvas} 
            onClose={() => setShowStrategyOffcanvas(false)} 
            onAdd={handleAddStrategy} 
            initialData={editingStrategy}
            onDelete={handleDeleteStrategy}
          />
          <AddOemTaskOffcanvas 
            open={showTaskOffcanvas} 
            onClose={() => setShowTaskOffcanvas(false)} 
            onAdd={handleAddTask} 
            initialData={editingTask}
            onDelete={handleDeleteTask}
          />
        </div>
      )}

      <style>{`
        @keyframes pulse-danger {
          0% {
            transform: scale(0.85);
            opacity: 0.6;
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          100% {
            transform: scale(1.15);
            opacity: 1;
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
        }
        .compact-plan-table td {
          padding-top: 5px !important;
          padding-bottom: 5px !important;
        }
        .compact-plan-table th {
          padding-top: 7px !important;
          padding-bottom: 7px !important;
        }
        .compact-plan-table input.form-control-sm {
          padding-top: 0px !important;
          padding-bottom: 0px !important;
          min-height: auto !important;
          height: auto !important;
        }

        .bg-indigo-subtle {
          background-color: rgba(2, 132, 199, 0.1);
          color: var(--color-primary, #0284c7);
        }
        .border-indigo {
          border-color: var(--color-primary, #0284c7) !important;
        }
        .bg-indigo {
          background-color: var(--color-primary, #0284c7) !important;
        }
        .text-indigo {
          color: var(--color-primary, #0284c7) !important;
        }

        .btn-indigo {
          background-color: var(--color-primary, #0284c7);
          border-color: var(--color-primary, #0284c7);
          color: white;
        }
        .btn-indigo:hover {
          background-color: #0369a1;
          border-color: #0369a1;
          color: white;
        }

        .btn-outline-indigo {
          color: var(--color-primary, #0284c7);
          border-color: var(--color-primary, #0284c7);
          background-color: transparent;
        }
        .btn-outline-indigo:hover {
          color: white;
          background-color: var(--color-primary, #0284c7);
          border-color: var(--color-primary, #0284c7);
        }

        .bg-light\\/50 {
          background-color: rgba(248, 250, 252, 0.5);
        }
        
        .gap-3\\.5 {
          gap: 14px;
        }

        .gap-1\\.5 {
          gap: 6px;
        }

        .transition {
          transition: all 0.2s ease-in-out;
        }

        /* Make table wrappers expand to show all rows, preventing nested scrollbars */
        .compact-plan-table {
          overflow: visible !important;
          height: auto !important;
        }
        .compact-plan-table .app-responsive-table-wrapper {
          overflow-y: visible !important;
          height: auto !important;
          flex-grow: 0;
        }

        @media (min-width: 1200px) {
          .plan-row {
            min-height: auto !important;
            height: auto !important;
          }
          .compact-plan-table th {
            background-color: #ffffff !important;
            position: sticky;
            top: 0;
            z-index: 10;
          }
        }

        @media (max-width: 1199.98px) {
          .plan-row {
            min-height: auto !important;
            height: auto !important;
          }
          .plan-left-panel,
          .plan-right-panel {
            height: auto !important;
            min-height: auto !important;
          }
          .plan-left-panel {
            padding-top: 16px !important;
            padding-bottom: 16px !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
          }
          .plan-right-panel {
            padding-top: 16px !important;
            padding-bottom: 16px !important;
          }
        }

        @media (min-width: 768px) and (max-width: 1199.98px) {
          .donut-legends-container {
            border-top: none !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
            padding-left: 24px !important;
            border-left: 1px solid rgba(0, 0, 0, 0.08) !important;
          }
        }

        .hover-card {
          transition: all 0.2s ease-in-out;
        }
        .hover-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.06) !important;
          border-color: rgba(99, 102, 241, 0.2) !important;
        }

        .timeline-month-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .timeline-month-btn:hover {
          transform: scale(1.12);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2) !important;
        }

        /* Beautiful, modern custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.4);
        }

        /* Override table cell background to display white (var(--card)) */
        .monthly-revenue-table td,
        .monthly-revenue-table th {
          background-color: var(--card) !important;
        }
        .monthly-revenue-table tr:hover td {
          background-color: rgba(99, 102, 241, 0.04) !important;
        }
      `}</style>

      {showPrintModal && (
        <PrintPreviewModal
          title="Báo cáo Kế hoạch Kinh doanh Năm"
          subtitle={`Phòng Kinh doanh - Năm ${planYear}`}
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => printDocumentById("sales-plan-print-doc", "portrait", `Bao-cao-Ke-hoach-Kinh-doanh-Nam-${planYear}`)}
              leftIcon={<i className="bi bi-printer-fill" />}
            >
              In toàn bộ
            </Button>
          }
          sidebar={
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="fw-semibold mb-1 text-dark" style={{ fontSize: 11, textTransform: "uppercase" }}>Người lập báo cáo</label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={e => setPreparedBy(e.target.value)}
                  className="form-control form-control-sm"
                  style={{ fontSize: 12.5 }}
                  placeholder="Ví dụ: Trưởng phòng Kinh doanh"
                />
              </div>
              <div>
                <label className="fw-semibold mb-1 text-dark" style={{ fontSize: 11, textTransform: "uppercase" }}>Tăng trưởng kỳ vọng (%)</label>
                <input
                  type="text"
                  value={growthTarget}
                  onChange={e => setGrowthTarget(e.target.value)}
                  className="form-control form-control-sm"
                  style={{ fontSize: 12.5 }}
                  placeholder="Ví dụ: 25"
                />
              </div>
              <div>
                <label className="fw-semibold mb-1 text-dark" style={{ fontSize: 11, textTransform: "uppercase" }}>Biên LN gộp mục tiêu (%)</label>
                <input
                  type="text"
                  value={gpTarget}
                  onChange={e => setGpTarget(e.target.value)}
                  className="form-control form-control-sm"
                  style={{ fontSize: 12.5 }}
                  placeholder="Ví dụ: 35"
                />
              </div>
              <div className="border-top pt-2 mt-2">
                <span className="fw-bold text-dark d-block mb-1" style={{ fontSize: 11, textTransform: "uppercase" }}>Dữ liệu năm trước</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <label className="mb-0 text-secondary" style={{ fontSize: 10.5 }}>Doanh thu Kế hoạch (đ)</label>
                    <input
                      type="text"
                      value={prevYearPlan}
                      onChange={e => setPrevYearPlan(e.target.value)}
                      className="form-control form-control-sm text-end"
                      style={{ fontSize: 12 }}
                      placeholder="Kế hoạch"
                    />
                  </div>
                  <div>
                    <label className="mb-0 text-secondary" style={{ fontSize: 10.5 }}>Doanh thu Thực tế (đ)</label>
                    <input
                      type="text"
                      value={prevYearActual}
                      onChange={e => setPrevYearActual(e.target.value)}
                      className="form-control form-control-sm text-end"
                      style={{ fontSize: 12 }}
                      placeholder="Thực tế"
                    />
                  </div>
                  <div>
                    <label className="mb-0 text-secondary" style={{ fontSize: 10.5 }}>Tốc độ tăng trưởng KH (%)</label>
                    <input
                      type="text"
                      value={prevGrowthPlan}
                      onChange={e => setPrevGrowthPlan(e.target.value)}
                      className="form-control form-control-sm text-end"
                      style={{ fontSize: 12 }}
                      placeholder="Kế hoạch"
                    />
                  </div>
                  <div>
                    <label className="mb-0 text-secondary" style={{ fontSize: 10.5 }}>Tốc độ tăng trưởng TT (%)</label>
                    <input
                      type="text"
                      value={prevGrowthActual}
                      onChange={e => setPrevGrowthActual(e.target.value)}
                      className="form-control form-control-sm text-end"
                      style={{ fontSize: 12 }}
                      placeholder="Thực tế"
                    />
                  </div>
                  <div>
                    <label className="mb-0 text-secondary" style={{ fontSize: 10.5 }}>Số đại lý chính thức KH</label>
                    <input
                      type="text"
                      value={prevStaffPlan}
                      onChange={e => setPrevStaffPlan(e.target.value)}
                      className="form-control form-control-sm text-end"
                      style={{ fontSize: 12 }}
                      placeholder="Kế hoạch"
                    />
                  </div>
                  <div>
                    <label className="mb-0 text-secondary" style={{ fontSize: 10.5 }}>Số đại lý chính thức TT</label>
                    <input
                      type="text"
                      value={prevStaffActual}
                      onChange={e => setPrevStaffActual(e.target.value)}
                      className="form-control form-control-sm text-end"
                      style={{ fontSize: 12 }}
                      placeholder="Thực tế"
                    />
                  </div>
                  <div>
                    <label className="mb-0 text-secondary" style={{ fontSize: 10.5 }}>Doanh số/nhân sự KH (đ)</label>
                    <input
                      type="text"
                      value={prevAvgSalesPlan}
                      onChange={e => setPrevAvgSalesPlan(e.target.value)}
                      className="form-control form-control-sm text-end"
                      style={{ fontSize: 12 }}
                      placeholder="Kế hoạch"
                    />
                  </div>
                  <div>
                    <label className="mb-0 text-secondary" style={{ fontSize: 10.5 }}>Doanh số/nhân sự TT (đ)</label>
                    <input
                      type="text"
                      value={prevAvgSalesActual}
                      onChange={e => setPrevAvgSalesActual(e.target.value)}
                      className="form-control form-control-sm text-end"
                      style={{ fontSize: 12 }}
                      placeholder="Thực tế"
                    />
                  </div>
                </div>
              </div>
            </div>
          }
          document={
            <div id="sales-plan-print-doc" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {/* PAGE 1: BÌA BÁO CÁO */}
              <div className="pdf-cover-page" style={{ display: "flex", flexDirection: "column", height: "297mm", justifyContent: "space-between", padding: 0, boxSizing: "border-box", background: "#ffffff", position: "relative", overflow: "hidden" }}>
                {/* Top Brand Stripe & Company info */}
                <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "60px 76px 0 95px" }}>
                  {company?.logoUrl ? (
                    <img src={company.logoUrl} alt="Logo" style={{ height: "45px", objectFit: "contain" }} />
                  ) : (
                    <div style={{ width: "45px", height: "45px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#94a3b8" }}>LOGO</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{
                      margin: 0,
                      fontSize: (company?.name || "").length > 45 ? "11px" : (company?.name || "").length > 35 ? "12px" : "14px",
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      color: "#003087",
                      letterSpacing: "1px"
                    }}>{company?.name || "CÔNG TY PHÁT TRIỂN THƯƠNG MẠI"}</h1>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>{company?.slogan || "Chất lượng khẳng định thương hiệu"}</p>
                  </div>
                </div>

                {/* Split body: Left text, Right graphic */}
                <div style={{ display: "flex", height: "440px", position: "relative", marginTop: "40px" }}>
                  <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
                    <div style={{ flex: 1, background: "#003087", padding: "40px 0 40px 95px", color: "white", display: "flex", alignItems: "center" }}>
                      <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "32px", fontWeight: 800, margin: 0, textTransform: "uppercase", lineHeight: 1.25 }}>
                        BÁO CÁO<br />KẾ HOẠCH<br />KINH DOANH
                      </h2>
                    </div>
                    <div style={{
                      flex: 1.2,
                      background: "#0f172a",
                      padding: "50px 0 40px 95px",
                      color: "white",
                      clipPath: "polygon(0 0, 100% 15%, 100% 100%, 0 100%)",
                      marginTop: "-40px",
                      zIndex: 2,
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "42px", fontWeight: 900, margin: 0, color: "#f59e0b" }}>
                        NĂM {planYear}
                      </h1>
                    </div>
                  </div>
                  <div style={{ width: "45%", position: "relative" }}>
                    <img src="/sales_report_cover.png" alt="Sales performance" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>

                {/* Metadata & Footer */}
                <div style={{ display: "flex", gap: "40px", padding: "0 76px 40px 95px", flex: 1, alignItems: "flex-end", marginTop: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "12px", color: "#003087", textTransform: "uppercase", fontWeight: 800, margin: "0 0 10px 0" }}>VỀ BẢN BÁO CÁO NÀY</h3>
                    <p style={{ color: "#475569", fontSize: "11px", lineHeight: 1.6, margin: 0 }}>
                      Bản kế hoạch kinh doanh chi tiết cho năm tài chính {planYear}. Bao gồm định hướng mục tiêu doanh thu kênh GT, Dự án B2B và E-commerce, định biên nhân sự phòng kinh doanh, dự toán ngân sách hoạt động và các phương án quản trị rủi ro phát sinh.
                    </p>
                  </div>
                  <div style={{ width: "45%", borderLeft: "3px solid #003087", paddingLeft: "20px" }}>
                    <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "12px", color: "#0f172a", fontWeight: 700, margin: "0 0 10px 0", textTransform: "uppercase" }}>Thông tin báo cáo</h3>
                    <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: "3px 0", color: "#64748b", width: "100px" }}>Bộ phận:</td>
                          <td style={{ padding: "3px 0", fontWeight: 600 }}>Phòng Kinh doanh</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "3px 0", color: "#64748b" }}>Người lập:</td>
                          <td style={{ padding: "3px 0", fontWeight: 600 }}>{preparedBy || "...................................."}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "3px 0", color: "#64748b" }}>Ngày lập:</td>
                          <td style={{ padding: "3px 0", fontWeight: 600 }}>{createdDate ? new Date(createdDate).toLocaleDateString("vi-VN") : "...................................."}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "3px 0", color: "#64748b" }}>Trạng thái:</td>
                          <td style={{ padding: "3px 0", fontWeight: 600, color: "#6366f1" }}>Bản kế hoạch chính thức</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer bar */}
                <div style={{ display: "flex", background: "#003087", color: "white", padding: "16px 76px 16px 95px" }}>
                  <div style={{ flex: 1, fontSize: "10px", opacity: 0.8 }}>
                    {company?.address ? `Địa chỉ: ${company.address}` : ""}
                  </div>
                  <div style={{ fontSize: "10px", opacity: 0.8 }}>
                    Bản quyền thuộc về {company?.name || "Công ty"} © {new Date().getFullYear()}
                  </div>
                </div>
              </div>

              {/* PAGE 2: I. TÓM TẮT ĐIỀU HÀNH & II. ĐÁNH GIÁ HIỆU SUẤT */}
              <div className="pdf-content-page" style={{ position: "relative", minHeight: "297mm", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
                <div>
                  {/* Page Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #003087", paddingBottom: "6px", marginBottom: "20px", fontSize: "10px", color: "#64748b" }}>
                    <span style={{ fontWeight: 600, textTransform: "uppercase", color: "#003087" }}>KẾ HOẠCH KINH DOANH NĂM {planYear} | PHÒNG SALES</span>
                    <span>{company?.shortName || company?.name || ""}</span>
                  </div>

                  <h3 style={customPrintStyles.secHead}><i className="bi bi-briefcase-fill" /> I. TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)</h3>
                  <p style={{ fontSize: "12px", lineHeight: "1.6", color: "#1e293b", marginBottom: "16px" }}>
                    Báo cáo kế hoạch kinh doanh phòng Sales năm {planYear} xác lập mục tiêu chiến lược và các chỉ số tài chính trọng tâm, phân bổ chỉ tiêu và cơ cấu đội ngũ nhân sự để tối đa hóa hiệu quả hoạt động phân phối.
                  </p>

                  <div style={{ display: "flex", gap: "24px", marginBottom: "20px" }}>
                    <div style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: "8px", padding: "12px", background: "#f8fafc" }}>
                      <span className="text-secondary fw-semibold d-block mb-1" style={{ fontSize: "11px", textTransform: "uppercase" }}>Mục tiêu tối thượng của năm</span>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11.5px", lineHeight: 1.8 }}>
                        <li><strong>Doanh số tổng:</strong> {getPlanRowTarget("1") > 0 ? getPlanRowTarget("1").toLocaleString("vi-VN") + " đ" : ".................................. đ"}</li>
                        <li><strong>Tăng trưởng kỳ vọng:</strong> {growthTarget ? `${growthTarget}%` : "................ %"}</li>
                        <li><strong>Biên LN gộp mục tiêu:</strong> {gpTarget ? `${gpTarget}%` : "................ %"}</li>
                      </ul>
                    </div>
                    <div style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: "8px", padding: "12px", background: "#f8fafc" }}>
                      <span className="text-secondary fw-semibold d-block mb-1" style={{ fontSize: "11px", textTransform: "uppercase" }}>Tỷ trọng doanh thu dự kiến</span>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11.5px", lineHeight: 1.8 }}>
                        {(() => {
                          const totalM = getYearlyTotalFromMonthly();
                          const agencyRev = getYearlyChannelRevenue("agency");
                          const projectRev = getYearlyChannelRevenue("project");
                          const ecomRev = getYearlyChannelRevenue("ecom");

                          const agencyRatio = totalM > 0 ? parseFloat(((agencyRev / totalM) * 100).toFixed(1)) : 0;
                          const projectRatio = totalM > 0 ? parseFloat(((projectRev / totalM) * 100).toFixed(1)) : 0;
                          const ecomRatio = totalM > 0 ? parseFloat(((ecomRev / totalM) * 100).toFixed(1)) : 0;

                          return (
                            <>
                              <li><strong>Kênh Đại lý (B2B/GT):</strong> {totalM > 0 ? `${agencyRatio}%` : "................ %"}</li>
                              <li><strong>Kênh Dự án (B2B Project):</strong> {totalM > 0 ? `${projectRatio}%` : "................ %"}</li>
                              <li><strong>Kênh Sàn TMĐT (E-commerce):</strong> {totalM > 0 ? `${ecomRatio}%` : "................ %"}</li>
                            </>
                          );
                        })()}
                      </ul>
                    </div>
                  </div>

                  <span className="fw-bold d-block mb-2 text-dark" style={{ fontSize: "12px" }}>1.3 Các mốc chỉ tiêu cốt lõi (Milestones) theo Quý</span>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#003087", color: "#ffffff" }}>
                        <th style={customPrintStyles.tableHeader}>Quý</th>
                        <th style={customPrintStyles.tableHeader}>Chỉ tiêu Doanh số (đ)</th>
                        <th style={customPrintStyles.tableHeader}>Tỷ trọng (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totalM = getYearlyTotalFromMonthly();
                        return [1, 2, 3, 4].map(q => {
                          const qRev = getQuarterlyRevenue(q as 1 | 2 | 3 | 4);
                          const qRatio = getQuarterlyRatio(q as 1 | 2 | 3 | 4, totalM);
                          return (
                            <tr key={q}>
                              <td style={{ ...customPrintStyles.tableCell, textAlign: "center", fontWeight: 600 }}>Quý {q === 1 ? "I" : q === 2 ? "II" : q === 3 ? "III" : "IV"}</td>
                              <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>{qRev > 0 ? qRev.toLocaleString("vi-VN") + " đ" : "-"}</td>
                              <td style={{ ...customPrintStyles.tableCell, textAlign: "center" }}>{qRev > 0 ? `${qRatio}%` : "-"}</td>
                            </tr>
                          );
                        });
                      })()}
                      <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
                        <td style={customPrintStyles.boldCell}>Tổng cộng (Lũy kế 12 tháng)</td>
                        <td style={{ ...customPrintStyles.boldCell, textAlign: "right" }}>{getYearlyTotalFromMonthly() > 0 ? getYearlyTotalFromMonthly().toLocaleString("vi-VN") + " đ" : "-"}</td>
                        <td style={{ ...customPrintStyles.boldCell, textAlign: "center" }}>{getYearlyTotalFromMonthly() > 0 ? "100%" : "-"}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ marginBottom: "20px", fontSize: "11.5px", lineHeight: "1.6" }}>
                    <strong>1.4 Nhu cầu ngân sách dự kiến:</strong> Tổng chi phí hoạt động và hỗ trợ bán hàng của cả năm là <strong>{getPlanRowTarget("2") > 0 ? getPlanRowTarget("2").toLocaleString("vi-VN") + " đ" : ".................................. đ"}</strong>, tương đương với <strong>{getPlanRowRatio("2") > 0 ? `${getPlanRowRatio("2")}%` : "................ %"}</strong> trên tổng doanh thu kế hoạch.
                  </div>

                  <h3 style={customPrintStyles.secHead}><i className="bi bi-clock-history" /> II. ĐÁNH GIÁ HIỆU SUẤT KINH DOANH NĂM TRƯỚC</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#003087", color: "#ffffff" }}>
                        <th style={customPrintStyles.tableHeader}>Chỉ tiêu cốt lõi</th>
                        <th style={customPrintStyles.tableHeader}>Kế hoạch năm trước</th>
                        <th style={customPrintStyles.tableHeader}>Thực tế đạt được</th>
                        <th style={customPrintStyles.tableHeader}>Tỷ lệ hoàn thành (%)</th>
                        <th style={customPrintStyles.tableHeader}>Ghi chú đánh giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Doanh thu (đ)", plan: prevYearPlan, actual: prevYearActual, isCurrency: true },
                        { label: "Tốc độ tăng trưởng (%)", plan: prevGrowthPlan, actual: prevGrowthActual, isPercent: true },
                        { label: "Số lượng đại lý chính thức", plan: prevStaffPlan, actual: prevStaffActual },
                        { label: "Doanh số bình quân / sales staff (đ/tháng)", plan: prevAvgSalesPlan, actual: prevAvgSalesActual, isCurrency: true }
                      ].map((row, idx) => {
                        let completion = "-";
                        if (row.plan && row.actual) {
                          const planNum = parseFloat(row.plan.replace(/\D/g, ""));
                          const actualNum = parseFloat(row.actual.replace(/\D/g, ""));
                          if (!isNaN(planNum) && !isNaN(actualNum) && planNum > 0) {
                            completion = `${Math.round((actualNum / planNum) * 100)}%`;
                          }
                        }

                        const formatVal = (val: string, isCurr?: boolean, isPerc?: boolean) => {
                          if (!val) return "..................................";
                          const num = Number(val.replace(/\D/g, ""));
                          if (isNaN(num)) return val;
                          if (isCurr) return num.toLocaleString("vi-VN") + " đ";
                          if (isPerc) return num + "%";
                          return num.toLocaleString("vi-VN");
                        };

                        return (
                          <tr key={idx}>
                            <td style={{ ...customPrintStyles.tableCell, fontWeight: 600 }}>{row.label}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>{formatVal(row.plan, row.isCurrency, row.isPercent)}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>{formatVal(row.actual, row.isCurrency, row.isPercent)}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "center" }}>{completion}</td>
                            <td style={{ ...customPrintStyles.tableCell }}>..................................</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <span className="fw-bold d-block mb-1 text-dark" style={{ fontSize: "11px", textTransform: "uppercase" }}>Ghi chú phân tích nguyên nhân</span>
                  <div style={{ fontSize: "11.5px", lineHeight: "2.0", color: "#475569" }}>
                    1. ....................................................................................................................................................................................................................................<br />
                    2. ....................................................................................................................................................................................................................................<br />
                    3. ....................................................................................................................................................................................................................................
                  </div>
                </div>

                {/* Page Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #cbd5e1", paddingTop: "6px", fontSize: "10px", color: "#64748b" }}>
                  <span>Lưu hành nội bộ - Phòng Kinh doanh</span>
                  <span style={{ fontWeight: 600 }}>Trang 2 / 5</span>
                </div>
              </div>

              {/* PAGE 3: III. MỤC TIÊU MỚI & IV. PHÂN BỔ CHỈ TIÊU CHI TIẾT */}
              <div className="pdf-content-page" style={{ position: "relative", minHeight: "297mm", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
                <div>
                  {/* Page Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #003087", paddingBottom: "6px", marginBottom: "20px", fontSize: "10px", color: "#64748b" }}>
                    <span style={{ fontWeight: 600, textTransform: "uppercase", color: "#003087" }}>KẾ HOẠCH KINH DOANH NĂM {planYear} | PHÒNG SALES</span>
                    <span>{company?.shortName || company?.name || ""}</span>
                  </div>

                  <h3 style={customPrintStyles.secHead}><i className="bi bi-arrow-up-right-circle" /> III. MỤC TIÊU KINH DOANH NĂM MỚI (SALES OBJECTIVES)</h3>

                  <div style={{ display: "flex", gap: "24px", marginBottom: "20px" }}>
                    <div style={{ flex: 1 }}>
                      <span className="fw-bold d-block mb-1.5 text-primary" style={{ fontSize: "12px", textTransform: "uppercase" }}>3.1 Mục tiêu tài chính</span>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <tbody>
                          <tr>
                            <td style={{ ...customPrintStyles.tableCell, fontWeight: 600 }}>Doanh thu thuần:</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right", fontWeight: 700 }}>{getPlanRowTarget("1") > 0 ? getPlanRowTarget("1").toLocaleString("vi-VN") + " đ" : "............................... đ"}</td>
                          </tr>
                          <tr>
                            <td style={{ ...customPrintStyles.tableCell, fontWeight: 600 }}>Biên lợi nhuận gộp:</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>{gpTarget ? `${gpTarget}%` : "................ %"}</td>
                          </tr>
                          <tr>
                            <td style={{ ...customPrintStyles.tableCell, fontWeight: 600 }}>Tỷ lệ giảm nợ xấu:</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>................ %</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span className="fw-bold d-block mb-1.5 text-primary" style={{ fontSize: "12px", textTransform: "uppercase" }}>3.2 Mục tiêu phát triển thị trường</span>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <tbody>
                          <tr>
                            <td style={{ ...customPrintStyles.tableCell, fontWeight: 600 }}>Đại lý ký mới (kế hoạch):</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right", fontWeight: 700 }}>{getYearlyTargetSum("lapKe") > 0 ? getYearlyTargetSum("lapKe") + " đại lý" : "................ đại lý"}</td>
                          </tr>
                          <tr>
                            <td style={{ ...customPrintStyles.tableCell, fontWeight: 600 }}>Tổng đại lý lũy kế lớn nhất:</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right", fontWeight: 700 }}>
                              {(() => {
                                const maxChinhThuc = Math.max(...Object.values(monthlyTargets).map(d => d.chinhThuc || 0));
                                return maxChinhThuc > 0 ? maxChinhThuc + " đại lý" : "................ đại lý";
                              })()}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ ...customPrintStyles.tableCell, fontWeight: 600 }}>Gian hàng TMĐT Mall mới:</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>................ gian hàng</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <h3 style={customPrintStyles.secHead}><i className="bi bi-calendar-event" /> IV. CHIẾN LƯỢC PHÂN BỔ CHỈ TIÊU (SALES QUOTA ALLOCATION)</h3>
                  <p style={{ fontSize: "11.5px", color: "#475569", marginBottom: "8px" }}>
                    Bảng chi tiết kế hoạch phân bổ đại lý chính thức tích lũy, đại lý phát triển mới, đại lý lấy hàng lẻ và cơ cấu doanh số kế hoạch theo hai nhãn hàng <strong>SEAJONG</strong> và <strong>VORIGER</strong> trong 12 tháng:
                  </p>

                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#003087", color: "#ffffff" }}>
                        <th style={{ ...customPrintStyles.tableHeader, width: "70px" }}>Tháng</th>
                        <th style={customPrintStyles.tableHeader}>Đại lý chính thức</th>
                        <th style={customPrintStyles.tableHeader}>Đại lý lắp kệ mới</th>
                        <th style={customPrintStyles.tableHeader}>Đại lý lẻ</th>
                        <th style={customPrintStyles.tableHeader}>Doanh số SEAJONG</th>
                        <th style={customPrintStyles.tableHeader}>Doanh số VORIGER</th>
                        <th style={{ ...customPrintStyles.tableHeader, width: "120px" }}>Tổng cộng tháng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = i + 1;
                        const data = monthlyTargets[m];
                        const chinhThuc = data?.chinhThuc || 0;
                        const lapKe = data?.lapKe || 0;
                        const layHangLe = data?.layHangLe || 0;
                        const rows = data?.revenueRows || [];
                        const seajongVal = (rows[1]?.value || 0) + (rows[2]?.value || 0) + (rows[3]?.value || 0);
                        const vorigerVal = (rows[5]?.value || 0) + (rows[6]?.value || 0) + (rows[7]?.value || 0);
                        const mTotal = getMonthlyTotalRevenue(m);

                        return (
                          <tr key={m} style={{ background: m % 2 === 0 ? "#f8fafc" : "transparent" }}>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "center", fontWeight: 600 }}>Tháng {m}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "center" }}>{chinhThuc > 0 ? chinhThuc : "-"}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "center" }}>{lapKe > 0 ? lapKe : "-"}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "center" }}>{layHangLe > 0 ? layHangLe : "-"}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>{seajongVal > 0 ? seajongVal.toLocaleString("vi-VN") + " đ" : "-"}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>{vorigerVal > 0 ? vorigerVal.toLocaleString("vi-VN") + " đ" : "-"}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right", fontWeight: 700 }}>{mTotal > 0 ? mTotal.toLocaleString("vi-VN") + " đ" : "-"}</td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const maxChinhThuc = Math.max(...Object.values(monthlyTargets).map(d => d.chinhThuc || 0));
                        const totalLapKe = getYearlyTargetSum("lapKe");
                        const totalLayHangLe = getYearlyTargetSum("layHangLe");
                        const totalSeajong = getYearlyRevenueSumByIndex(1) + getYearlyRevenueSumByIndex(2) + getYearlyRevenueSumByIndex(3);
                        const totalVoriger = getYearlyRevenueSumByIndex(5) + getYearlyRevenueSumByIndex(6) + getYearlyRevenueSumByIndex(7);
                        const totalRevenueSum = getYearlyTotalFromMonthly();

                        return (
                          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
                            <td style={customPrintStyles.boldCell}>Tổng cộng</td>
                            <td style={{ ...customPrintStyles.boldCell, textAlign: "center" }}>{maxChinhThuc > 0 ? maxChinhThuc + " (Max)" : "-"}</td>
                            <td style={{ ...customPrintStyles.boldCell, textAlign: "center" }}>{totalLapKe > 0 ? totalLapKe : "-"}</td>
                            <td style={{ ...customPrintStyles.boldCell, textAlign: "center" }}>{totalLayHangLe > 0 ? totalLayHangLe : "-"}</td>
                            <td style={{ ...customPrintStyles.boldCell, textAlign: "right" }}>{totalSeajong > 0 ? totalSeajong.toLocaleString("vi-VN") + " đ" : "-"}</td>
                            <td style={{ ...customPrintStyles.boldCell, textAlign: "right" }}>{totalVoriger > 0 ? totalVoriger.toLocaleString("vi-VN") + " đ" : "-"}</td>
                            <td style={{ ...customPrintStyles.boldCell, textAlign: "right", color: "#003087" }}>{totalRevenueSum > 0 ? totalRevenueSum.toLocaleString("vi-VN") + " đ" : "-"}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Page Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #cbd5e1", paddingTop: "6px", fontSize: "10px", color: "#64748b" }}>
                  <span>Lưu hành nội bộ - Phòng Kinh doanh</span>
                  <span style={{ fontWeight: 600 }}>Trang 3 / 5</span>
                </div>
              </div>

              {/* PAGE 4: V. CHIẾN THUẬT TRIỂN KHAI THEO ĐA KÊNH */}
              <div className="pdf-content-page" style={{ position: "relative", minHeight: "297mm", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
                <div>
                  {/* Page Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #003087", paddingBottom: "6px", marginBottom: "20px", fontSize: "10px", color: "#64748b" }}>
                    <span style={{ fontWeight: 600, textTransform: "uppercase", color: "#003087" }}>KẾ HOẠCH KINH DOANH NĂM {planYear} | PHÒNG SALES</span>
                    <span>{company?.shortName || company?.name || ""}</span>
                  </div>

                  <h3 style={customPrintStyles.secHead}><i className="bi bi-diagram-3-fill" /> V. CHIẾN THUẬT TRIỂN KHAI THEO ĐA KÊNH (OMNICHANNEL TACTICS)</h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "11.5px", lineHeight: "1.5" }}>

                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", background: "#f8fafc" }}>
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700, color: "#003087", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "20px", height: "20px", background: "#003087", color: "white", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>1</span>
                        Kênh Đại lý truyền thống (B2B/GT) - Tỷ trọng 50%
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <li><strong>Quy chế bảo vệ khu vực độc quyền:</strong> Cam kết phân tách rõ ràng địa bàn hoạt động cho từng tổng đại lý và đại lý phân phối cấp 1. Xử lý nghiêm tình trạng bán lấn vùng và xung đột về giá bán lẻ ngoài khu vực được cấp phép.</li>
                        <li><strong>Chính sách đầu tư quầy kệ điểm bán:</strong> Tài trợ 100% chi phí đóng mới, nâng cấp quầy kệ trưng bày cho các đại lý chính thức có cam kết doanh số tối thiểu năm đạt 500 triệu đồng.</li>
                        <li><strong>Bộ nhận diện POSM đồng bộ:</strong> Cấp phát trọn bộ ấn phẩm Catalogue sản phẩm, bảng hiệu, băng rôn điểm bán, áo thun nhân sự đại lý và quà tặng nhân sự kiện khai trương đại lý mới.</li>
                        <li><strong>Cơ chế chiết khấu lũy tiến:</strong> Áp dụng bậc thang chiết khấu thương mại cộng thêm từ 1.5% đến 3.5% khi đại lý vượt mốc nhập hàng theo quý được giao.</li>
                      </ul>
                    </div>

                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", background: "#f8fafc" }}>
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700, color: "#003087", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "20px", height: "20px", background: "#003087", color: "white", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>2</span>
                        Kênh Dự án & Công trình (B2B Project) - Tỷ trọng 30%
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <li><strong>Quy trình Spec-in thiết kế sớm:</strong> Tiếp cận chủ đầu tư và ban quản lý dự án ngay từ giai đoạn lên bản vẽ thiết kế kỹ thuật để chỉ định mã hàng thương hiệu SEAJONG/VORIGER vào danh mục vật liệu mời thầu.</li>
                        <li><strong>Cơ chế bảo vệ dự án đặc thù:</strong> Bảo lưu thông tin khách hàng và dự án cho nhân viên kinh doanh đăng ký đầu tiên trên hệ thống CRM, ngăn chặn cạnh tranh nội bộ.</li>
                        <li><strong>Hồ sơ năng lực kỹ thuật:</strong> Chuẩn bị đầy đủ chứng nhận chất lượng CO/CQ, biên bản kiểm định khả năng chịu lực, độ bền vật liệu và chứng nhận ISO để đáp ứng tiêu chuẩn nghiệm thu khắt khe của dự án.</li>
                      </ul>
                    </div>

                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", background: "#f8fafc" }}>
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700, color: "#003087", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "20px", height: "20px", background: "#003087", color: "white", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>3</span>
                        Kênh Sàn Thương mại điện tử (E-commerce) - Tỷ trọng 20%
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <li><strong>Phân tách SKU sản phẩm online/offline:</strong> Thiết kế bao bì riêng hoặc phát triển các dòng sản phẩm đặc thù chỉ mở bán trên sàn Shopee, Lazada, TikTok Shop để bảo toàn mức giá niêm yết của hệ thống đại lý offline.</li>
                        <li><strong>Tập trung Mega-sale định kỳ:</strong> Đăng ký hiển thị trang chủ, chạy quảng cáo nội sàn vào các ngày trùng trong năm (9/9, 10/10, 11/11, 12/12) với mục tiêu tăng trưởng lượt truy cập tự nhiên.</li>
                        <li><strong>Vận hành chuẩn 5 sao:</strong> Cam kết tỷ lệ phản hồi chat của khách hàng trên 97% trong vòng 10 phút, thời gian xử lý và giao hàng cho đơn vị vận chuyển dưới 16 giờ từ khi phát sinh đơn.</li>
                      </ul>
                    </div>

                  </div>
                </div>

                {/* Page Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #cbd5e1", paddingTop: "6px", fontSize: "10px", color: "#64748b" }}>
                  <span>Lưu hành nội bộ - Phòng Kinh doanh</span>
                  <span style={{ fontWeight: 600 }}>Trang 4 / 5</span>
                </div>
              </div>

              {/* PAGE 5: VI. NHÂN SỰ & VII. NGÂN SÁCH & VIII. QUẢN TRỊ RỦI RO & CHỮ KÝ PHÊ DUYỆT */}
              <div className="pdf-content-page" style={{ position: "relative", minHeight: "297mm", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
                <div>
                  {/* Page Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #003087", paddingBottom: "6px", marginBottom: "20px", fontSize: "10px", color: "#64748b" }}>
                    <span style={{ fontWeight: 600, textTransform: "uppercase", color: "#003087" }}>KẾ HOẠCH KINH DOANH NĂM {planYear} | PHÒNG SALES</span>
                    <span>{company?.shortName || company?.name || ""}</span>
                  </div>

                  <h3 style={customPrintStyles.secHead}><i className="bi bi-people-fill" /> VI. CHI TIẾT CHI PHÍ LƯƠNG THƯỞNG</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#003087", color: "#ffffff" }}>
                        <th style={{ ...customPrintStyles.tableHeader, width: "40px" }}>STT</th>
                        <th style={customPrintStyles.tableHeader}>Vị trí công việc</th>
                        <th style={customPrintStyles.tableHeader}>Lương cơ bản</th>
                        <th style={customPrintStyles.tableHeader}>Lương hiệu suất</th>
                        <th style={customPrintStyles.tableHeader}>Phụ cấp</th>
                        <th style={{ ...customPrintStyles.tableHeader, width: "50px" }}>SL</th>
                        <th style={customPrintStyles.tableHeader}>Quỹ lương năm (đ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffRows.filter(r => !r.isTotal && !r.isFullWidth).map((row, idx) => {
                        return (
                          <tr key={idx} style={{ background: idx % 2 === 1 ? "#f8fafc" : "transparent" }}>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "center" }}>{row.stt}</td>
                            <td style={customPrintStyles.tableCell}>{row.role}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>{row.basicSalary ? row.basicSalary.toLocaleString("vi-VN") + " đ" : "-"}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>{row.performanceSalary ? row.performanceSalary.toLocaleString("vi-VN") + " đ" : "-"}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right" }}>{row.allowance ? row.allowance.toLocaleString("vi-VN") + " đ" : "-"}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "center" }}>{row.quantity}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right", fontWeight: 700 }}>{row.totalBudget ? row.totalBudget.toLocaleString("vi-VN") + " đ" : "-"}</td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const totalRow = staffRows.find(r => r.isTotal);
                        return totalRow ? (
                          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
                            <td style={customPrintStyles.boldCell} colSpan={5}>Tổng cộng đội ngũ</td>
                            <td style={{ ...customPrintStyles.boldCell, textAlign: "center" }}>{totalRow.quantity}</td>
                            <td style={{ ...customPrintStyles.boldCell, textAlign: "right", color: "#003087" }}>{totalRow.totalBudget ? totalRow.totalBudget.toLocaleString("vi-VN") + " đ" : "-"}</td>
                          </tr>
                        ) : null;
                      })()}
                    </tbody>
                  </table>

                  <h3 style={customPrintStyles.secHead}><i className="bi bi-wallet2" /> VII. DỰ TOÁN NGÂN SÁCH HOẠT ĐỘNG PHÒNG KINH DOANH</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#003087", color: "#ffffff" }}>
                        <th style={{ ...customPrintStyles.tableHeader, width: "40px" }}>STT</th>
                        <th style={customPrintStyles.tableHeader}>Khoản mục chi phí</th>
                        <th style={customPrintStyles.tableHeader}>Dự toán ngân sách năm (đ)</th>
                        <th style={{ ...customPrintStyles.tableHeader, width: "80px" }}>Tỷ trọng (%)</th>
                        <th style={customPrintStyles.tableHeader}>Mô tả ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planRows.filter(r => r.stt && r.stt.toString().startsWith("2.")).map((row, idx) => {
                        return (
                          <tr key={idx} style={{ background: idx % 2 === 1 ? "#f8fafc" : "transparent" }}>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "center" }}>{row.stt}</td>
                            <td style={customPrintStyles.tableCell}>{row.item}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "right", fontWeight: 600 }}>{row.target ? row.target.toLocaleString("vi-VN") + " đ" : "-"}</td>
                            <td style={{ ...customPrintStyles.tableCell, textAlign: "center" }}>{row.ratio ? `${row.ratio}%` : "-"}</td>
                            <td style={customPrintStyles.tableCell}>{row.note || "-"}</td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const totalRow = planRows.find(r => r.stt === "2");
                        return totalRow ? (
                          <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
                            <td style={customPrintStyles.boldCell} colSpan={2}>Tổng dự toán ngân sách hoạt động</td>
                            <td style={{ ...customPrintStyles.boldCell, textAlign: "right", color: "#003087" }}>{totalRow.target ? totalRow.target.toLocaleString("vi-VN") + " đ" : "-"}</td>
                            <td style={{ ...customPrintStyles.boldCell, textAlign: "center" }}>{totalRow.ratio ? `${totalRow.ratio}%` : "-"}</td>
                            <td style={{ ...customPrintStyles.boldCell, fontSize: "10px" }}>Tính theo tỷ lệ % so với Doanh thu mục tiêu năm</td>
                          </tr>
                        ) : null;
                      })()}
                    </tbody>
                  </table>

                  <h3 style={customPrintStyles.secHead}><i className="bi bi-shield-fill-exclamation" /> VIII. QUẢN TRỊ RỦI RO & PHÊ DUYỆT BÁO CÁO</h3>
                  <div style={{ fontSize: "11px", lineHeight: "1.5", color: "#475569", marginBottom: "20px" }}>
                    <p style={{ margin: "0 0 4px 0" }}>• <strong>Rủi ro công nợ xấu:</strong> Tuyệt đối không bàn giao đơn hàng mới cho đại lý có công nợ quá hạn vượt 30 ngày. Giới hạn dư nợ tối đa cho đại lý mới lập dưới 50 triệu đồng.</p>
                    <p style={{ margin: 0 }}>• <strong>Đảm bảo KPI doanh số:</strong> Nhân sự kinh doanh không đạt tối thiểu 70% chỉ tiêu KPI doanh số trong 2 tháng liên tục sẽ được chuyển sang diện đào tạo, cải thiện hiệu suất bắt buộc.</p>
                  </div>

                  {/* Signature block */}
                  <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", marginTop: "20px", paddingBottom: "10px" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "80px" }}>
                      <span style={{ fontWeight: 700, fontSize: "11px", color: "#0f172a" }}>NGƯỜI LẬP PHIẾU</span>
                      <span style={{ fontSize: "10px", color: "#64748b", fontStyle: "italic", marginBottom: "40px" }}>(Ký và ghi rõ họ tên)</span>
                      <span style={{ fontWeight: 600, fontSize: "11.5px" }}>{preparedBy || "...................................."}</span>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "80px" }}>
                      <span style={{ fontWeight: 700, fontSize: "11px", color: "#0f172a" }}>BAN GIÁM ĐỐC PHÊ DUYỆT</span>
                      <span style={{ fontSize: "10px", color: "#64748b", fontStyle: "italic", marginBottom: "40px" }}>(Ký, đóng dấu và ghi rõ họ tên)</span>
                      <span style={{ fontWeight: 600, fontSize: "11.5px", color: "#64748b" }}>................................................</span>
                    </div>
                  </div>

                </div>

                {/* Page Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #cbd5e1", paddingTop: "6px", fontSize: "10px", color: "#64748b" }}>
                  <span>Lưu hành nội bộ - Phòng Kinh doanh</span>
                  <span style={{ fontWeight: 600 }}>Trang 5 / 5</span>
                </div>
              </div>

            </div>
          }
          onClose={() => setShowPrintModal(false)}
          documentId="sales-plan-print-doc"
          printOrientation="portrait"
          printMargins="20mm 20mm 20mm 25mm"
        />
      )}
    </>
  );
}
