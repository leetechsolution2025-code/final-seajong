"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import Chart from "react-apexcharts";

function renderMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: { indent: number; text: string }[] = [];

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} style={{ margin: "12px 0", paddingLeft: "0px", listStyleType: "none" }}>
          {listItems.map((item, idx) => {
            const isNested = item.indent > 0;
            return (
              <li
                key={idx}
                style={{
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "#334155",
                  marginBottom: "4px",
                  marginLeft: isNested ? `${item.indent * 12}px` : "0px",
                  paddingLeft: "20px",
                  position: "relative",
                }}
              >
                <span style={{
                  position: "absolute",
                  left: isNested ? "4px" : "0px",
                  top: "8px",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isNested ? "transparent" : "#4f46e5",
                  border: isNested ? "1px solid #4f46e5" : "none"
                }} />
                {parseInlineMarkdown(item.text)}
              </li>
            );
          })}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = (key: string) => {
    if (tableRows.length > 0 || tableHeaders.length > 0) {
      elements.push(
        <div key={key} style={{ overflowX: "auto", margin: "16px 0", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
          <table style={{ minWidth: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            {tableHeaders.length > 0 && (
              <thead style={{ background: "#0f172a", color: "#ffffff" }}>
                <tr>
                  {tableHeaders.map((h, idx) => (
                    <th key={idx} style={{ border: "1px solid #cbd5e1", padding: "10px 14px", textAlign: "left", fontWeight: "bold" }}>
                      {parseInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} style={{ background: rIdx % 2 === 1 ? "#f8fafc" : "#ffffff" }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ border: "1px solid #cbd5e1", padding: "10px 14px", color: "#334155" }}>
                      {parseInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  const parseInlineMarkdown = (str: string) => {
    const parts = str.split(/\*\*|__/);
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return <strong key={idx} style={{ fontWeight: 700, color: "#0f172a" }}>{part}</strong>;
      }
      const subparts = part.split(/\*|_/);
      return subparts.map((sp, sIdx) => {
        if (sIdx % 2 === 1) {
          return <em key={sIdx} style={{ fontStyle: "italic" }}>{sp}</em>;
        }
        return sp;
      });
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimLine = rawLine.trim();

    const cleanLine = trimLine.replace(/^[\s#*_-]+/, "").replace(/[\s*_-]+$/, "");
    const partMatch = cleanLine.match(/^(PHẦN\s+\d+)[\.\s:-]+(.*)$/i);
    if (partMatch) {
      flushList(`list-part-${i}`);
      flushTable(`table-part-${i}`);
      elements.push(
        <div
          key={`part-${i}`}
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: 800,
            marginTop: "32px",
            marginBottom: "18px",
            boxShadow: "0 4px 6px rgba(37, 99, 235, 0.15)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}
        >
          <span style={{
            background: "rgba(255, 255, 255, 0.2)",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 900
          }}>
            {partMatch[1]}
          </span>
          <span>{partMatch[2].trim()}</span>
        </div>
      );
      continue;
    }

    if (trimLine.startsWith("====")) {
      flushList(`list-div-${i}`);
      flushTable(`table-div-${i}`);
      elements.push(<hr key={`hr-${i}`} style={{ margin: "24px 0", border: "0", borderTop: "2px dashed #cbd5e1" }} />);
      continue;
    }

    if (trimLine.startsWith("|")) {
      flushList(`list-table-${i}`);
      inTable = true;
      const cells = trimLine
        .split("|")
        .map(c => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      const isDivider = cells.every(c => c.match(/^:-*-*:?$/) || c.match(/^-+$/));
      if (isDivider) {
        continue;
      }

      if (tableHeaders.length === 0 && tableRows.length === 0) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      if (inTable) {
        flushTable(`table-end-${i}`);
      }
    }

    if (trimLine.startsWith("#")) {
      flushList(`list-h-${i}`);
      const hMatch = trimLine.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const textContent = hMatch[2];
        if (level === 1) {
          elements.push(
            <h1 key={`h-${i}`} style={{ fontSize: "22px", fontWeight: 800, color: "#003087", marginTop: "24px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid #cbd5e1" }}>
              {parseInlineMarkdown(textContent)}
            </h1>
          );
        } else if (level === 2) {
          elements.push(
            <h2 key={`h-${i}`} style={{ fontSize: "18px", fontWeight: 700, color: "#1e3a8a", marginTop: "20px", marginBottom: "12px", borderLeft: "4px solid #3b82f6", paddingLeft: "10px" }}>
              {parseInlineMarkdown(textContent)}
            </h2>
          );
        } else if (level === 3) {
          elements.push(
            <h3 key={`h-${i}`} style={{ fontSize: "15px", fontWeight: 700, color: "#334155", marginTop: "16px", marginBottom: "8px" }}>
              {parseInlineMarkdown(textContent)}
            </h3>
          );
        } else {
          elements.push(
            <h4 key={`h-${i}`} style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginTop: "12px", marginBottom: "6px" }}>
              {parseInlineMarkdown(textContent)}
            </h4>
          );
        }
        continue;
      }
    }

    const listMatch = rawLine.match(/^(\s*)([*|-]+)\s+(.*)$/);
    if (listMatch) {
      flushTable(`table-div-${i}`);
      inList = true;
      const indent = listMatch[1].length;
      const text = listMatch[3];
      listItems.push({ indent, text });
      continue;
    } else if (inList) {
      flushList(`list-end-${i}`);
    }

    if (trimLine !== "") {
      elements.push(
        <p key={`p-${i}`} style={{ fontSize: "14.5px", color: "#334155", margin: "10px 0", lineHeight: "1.6" }}>
          {parseInlineMarkdown(rawLine)}
        </p>
      );
    }
  }

  flushList("list-final");
  flushTable("table-final");

  return elements;
}

export default function OemPlanView({ currentStep, year, onProfitChange }: { currentStep: number, year: number, onProfitChange?: (profit: number, margin: number) => void }) {
  const toast = useToast();
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isAiPrintOpen, setIsAiPrintOpen] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<string>("");
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  // --- States for Custom Dialogs ---
  const [costConfirmOpen, setCostConfirmOpen] = useState(false);
  const [staffConfirmOpen, setStaffConfirmOpen] = useState(false);

  const [costPromptOpen, setCostPromptOpen] = useState(false);
  const [costPromptValue, setCostPromptValue] = useState("");
  const [costPromptPrefix, setCostPromptPrefix] = useState<string>("");
  const [costPromptListSetter, setCostPromptListSetter] = useState<any>(null);

  const triggerAddCostItem = (
    setCostList: React.Dispatch<React.SetStateAction<CustomCostItem[]>>,
    prefix: string
  ) => {
    setCostPromptPrefix(prefix);
    setCostPromptListSetter(() => setCostList);
    setCostPromptValue("");
    setCostPromptOpen(true);
  };

  const handleConfirmCostPrompt = () => {
    if (!costPromptValue || !costPromptValue.trim()) return;
    const newItem: CustomCostItem = {
      id: `${costPromptPrefix}_custom_${Date.now()}`,
      label: costPromptValue.trim(),
      val: "0",
      pctVal: "0",
      checked: false
    };
    if (costPromptListSetter) {
      costPromptListSetter((prev: any) => [...prev, newItem]);
    }
    setCostPromptOpen(false);
  };

  const [staffPromptOpen, setStaffPromptOpen] = useState(false);
  const [staffPromptValue, setStaffPromptValue] = useState("");
  const [staffPromptPrefix, setStaffPromptPrefix] = useState<string>("");
  const [staffPromptListSetter, setStaffPromptListSetter] = useState<any>(null);

  const triggerAddStaffItem = (
    setStaffList: React.Dispatch<React.SetStateAction<CustomStaffItem[]>>,
    prefix: string
  ) => {
    setStaffPromptPrefix(prefix);
    setStaffPromptListSetter(() => setStaffList);
    setStaffPromptValue("");
    setStaffPromptOpen(true);
  };

  const handleConfirmStaffPrompt = () => {
    if (!staffPromptValue || !staffPromptValue.trim()) return;
    const newItem: CustomStaffItem = {
      id: `${staffPromptPrefix}_custom_${Date.now()}`,
      label: staffPromptValue.trim(),
      qty: "0",
      salary: "0",
      checked: false
    };
    if (staffPromptListSetter) {
      staffPromptListSetter((prev: any) => [...prev, newItem]);
    }
    setStaffPromptOpen(false);
  };

  const handleAiAnalysis = async (forceReanalyze = false) => {
    setIsAiModalOpen(true);

    const payload = {
      year: year,
      revenueAgent,
      revenueOEM,
      totalRevenue,
      valDeductions,
      deductionsRate: 17.0,
      valNetRevenue,
      costSales: valCOGS,
      costSalesPercent: 47,
      valGrossProfit,
      grossProfitMargin,
      valOperatingExpenses: totalStep2,
      opexPctOfRevenue: totalRevenue > 0 ? (totalStep2 / totalRevenue * 100) : 0,
      c_biz_salary: f_biz_salary,
      c_biz_agentopen: f_biz_agentopen,
      c_biz_promo: f_biz_promo,
      f_mkt_ads,
      f_ops_depr,
      f_ops_rent,
      f_ops_utilities,
      totalStaffCount: totalStep3,
      grandTotalFund,
      salaryPct: totalStep2 > 0 ? (grandTotalFund / totalStep2 * 100) : 0,
      avgMonthlySalary: totalStep3 > 0 ? Math.round(grandTotalFund / totalStep3 / 12) : 0,
      indirectStaffCount: grpFin,
      indirectStaffPct: totalStep3 > 0 ? ((grpFin) / totalStep3 * 100) : 0,
      valTotalProfit,
      netProfitMarginOnNetRev: valNetRevenue > 0 ? (valTotalProfit / valNetRevenue * 100) : 0,
      othersOpex: totalStep2 - (f_biz_salary + f_biz_agentopen + f_biz_promo + f_mkt_ads + f_ops_depr + f_ops_rent + f_ops_utilities)
    };

    const payloadStr = JSON.stringify(payload);
    const cacheKey = `ai_analysis_cache_${year}`;
    const cacheSignKey = `ai_analysis_sign_${year}`;

    if (!forceReanalyze) {
      const cachedResult = localStorage.getItem(cacheKey);
      const cachedSign = localStorage.getItem(cacheSignKey);
      if (cachedResult && cachedSign === payloadStr) {
        setAiResult(cachedResult);
        setIsFromCache(true);
        setIsAiLoading(false);
        return;
      }
    }

    setIsFromCache(false);
    setIsAiLoading(true);
    setAiResult("");

    try {
      const res = await fetch("/api/plan-finance/master-plan/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payloadStr
      });

      if (!res.ok) {
        throw new Error(`Lỗi kết nối máy chủ (Status: ${res.status})`);
      }

      if (!res.body) {
        throw new Error("Không nhận được luồng dữ liệu phản hồi.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let textAccumulator = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          textAccumulator += chunk;
          setAiResult(textAccumulator);
        }
      }

      if (textAccumulator && !textAccumulator.startsWith("\nLỖI:")) {
        localStorage.setItem(cacheKey, textAccumulator);
        localStorage.setItem(cacheSignKey, payloadStr);
      }

    } catch (err: any) {
      console.error(err);
      toast.error("Không thể kết nối đến máy chủ AI hoặc xảy ra lỗi: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- Fetch Company Info on mount ---
  useEffect(() => {
    fetch("/api/company")
      .then(res => res.json())
      .then(data => { if (data && data.name) setCompanyInfo(data); })
      .catch(console.error);
  }, []);

  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Step 1 state targets ---
  // Doanh thu
  const [revenueAgent, setRevenueAgent] = useState<string>("0"); // 20 tỷ
  const [revenueOEM, setRevenueOEM] = useState<string>("0"); // 10 tỷ

  // Chi phí
  const [costSales, setCostSales] = useState<string>("0"); // 15 tỷ
  const [costMarketing, setCostMarketing] = useState<string>("0"); // 10 tỷ
  const [costFinanceHR, setCostFinanceHR] = useState<string>("0"); // 2 tỷ
  const [costLogistics, setCostLogistics] = useState<string>("0"); // 3 tỷ
  const [costOperations, setCostOperations] = useState<string>("0"); // 10 tỷ

  // Toggle calculate costs from revenue
  const [isCalculateByRevenue, setIsCalculateByRevenue] = useState<boolean>(false);
  const [costSalesPercent, setCostSalesPercent] = useState<string>("30");
  const [costMarketingPercent, setCostMarketingPercent] = useState<string>("20");
  const [costFinanceHRPercent, setCostFinanceHRPercent] = useState<string>("4");
  const [costLogisticsPercent, setCostLogisticsPercent] = useState<string>("6");
  const [costOperationsPercent, setCostOperationsPercent] = useState<string>("20");
  const [revenueDeductionPercent, setRevenueDeductionPercent] = useState<string>("17");
  const [cogsPercent, setCogsPercent] = useState<string>("47");

  // Nhân sự
  const [staffSales, setStaffSales] = useState<string>("40");
  const [staffMarketing, setStaffMarketing] = useState<string>("20");
  const [staffLogistics, setStaffLogistics] = useState<string>("30");
  const [staffCustomerService, setStaffCustomerService] = useState<string>("15");
  const [staffFinanceHR, setStaffFinanceHR] = useState<string>("15");

  // --- Step 2: Chi tiết định mức chi phí ---
  interface CustomCostItem {
    id: string;
    label: string;
    val: string;
    pctVal: string;
    checked: boolean;
  }

  const [bizCosts, setBizCosts] = useState<CustomCostItem[]>([
    { id: "biz_1", label: "Phụ trách kinh doanh", val: "8000000000", pctVal: "16", checked: false },
    { id: "biz_2", label: "Khuyến mãi", val: "2500000000", pctVal: "5", checked: false },
  ]);

  const [mktCosts, setMktCosts] = useState<CustomCostItem[]>([
    { id: "mkt_1", label: "Lương nhân viên", val: "3000000000", pctVal: "6", checked: false },
    { id: "mkt_2", label: "Bảo hiểm", val: "500000000", pctVal: "1", checked: false },
  ]);

  const [finCosts, setFinCosts] = useState<CustomCostItem[]>([
    { id: "fin_1", label: "Lương nhân viên", val: "3000000000", pctVal: "1.5", checked: false },
    { id: "fin_2", label: "Bảo hiểm", val: "500000000", pctVal: "0.5", checked: false },
  ]);

  const [logCosts, setLogCosts] = useState<CustomCostItem[]>([
    { id: "log_1", label: "Lương nhân viên", val: "2000000000", pctVal: "1.5", checked: false },
    { id: "log_2", label: "Bảo hiểm", val: "500000000", pctVal: "0.5", checked: false },
  ]);

  const [opsCosts, setOpsCosts] = useState<CustomCostItem[]>([
    { id: "ops_1", label: "Thuê kho bãi và showroom", val: "2000000000", pctVal: "4", checked: false },
    { id: "ops_2", label: "Chi phí điện nước", val: "1000000000", pctVal: "2", checked: false },
    { id: "ops_3", label: "Văn phòng phẩm", val: "500000000", pctVal: "1", checked: false },
    { id: "ops_4", label: "Thưởng lễ tết, du lịch", val: "1000000000", pctVal: "2", checked: false },
    { id: "ops_5", label: "Khấu hao công cụ, dụng cụ và chi phí trả trước", val: "500000000", pctVal: "1", checked: false },
    { id: "ops_6", label: "Khấu hao công cụ, dụng cụ tại đại lý", val: "500000000", pctVal: "1", checked: false },
    { id: "ops_7", label: "Khấu hao tài sản cố định", val: "500000000", pctVal: "1", checked: false },
    { id: "ops_8", label: "Lãi vay", val: "500000000", pctVal: "1", checked: false },
    { id: "ops_9", label: "Chi phí tuyển dụng, đào tạo", val: "200000000", pctVal: "0.4", checked: false },
    { id: "ops_10", label: "Chi phí vận chuyển, hậu cần", val: "800000000", pctVal: "1.6", checked: false },
    { id: "ops_11", label: "Chi phí giảm giá hàng tồn kho", val: "300000000", pctVal: "0.6", checked: false },
    { id: "ops_12", label: "Chi phí rủi ro nợ khó đòi", val: "200000000", pctVal: "0.4", checked: false },
  ]);

  const [miscCosts, setMiscCosts] = useState<CustomCostItem[]>([
    { id: "misc_1", label: "Dự phòng rủi ro & chi phí phát sinh", val: "2000000000", pctVal: "4", checked: false },
  ]);

  const [s2_calcByRev, setS2_calcByRev] = useState<boolean>(false);

  // Helper để lấy giá trị động tương thích với code cũ
  const getCostVal = (arr: CustomCostItem[], id: string, def: string) => {
    const item = arr.find(i => i.id === id);
    if (!item) return "0";
    return item.val;
  };
  const getCostPct = (arr: CustomCostItem[], id: string, def: string) => {
    const item = arr.find(i => i.id === id);
    if (!item) return "0";
    return item.pctVal;
  };

  const c_biz_agentopen = getCostVal(bizCosts, "biz_1", "4000000000");
  const c_biz_agentopen_pct = getCostPct(bizCosts, "biz_1", "8");
  const c_biz_salary = getCostVal(bizCosts, "biz_2", "8000000000");
  const c_biz_salary_pct = getCostPct(bizCosts, "biz_2", "16");
  const c_biz_insurance = getCostVal(bizCosts, "biz_3", "1500000000");
  const c_biz_insurance_pct = getCostPct(bizCosts, "biz_3", "3");
  const c_biz_bonus = getCostVal(bizCosts, "biz_4", "2000000000");
  const c_biz_bonus_pct = getCostPct(bizCosts, "biz_4", "4");
  const c_biz_travel = getCostVal(bizCosts, "biz_5", "2000000000");
  const c_biz_travel_pct = getCostPct(bizCosts, "biz_5", "4");
  const c_biz_promo = getCostVal(bizCosts, "biz_6", "2500000000");
  const c_biz_promo_pct = getCostPct(bizCosts, "biz_6", "5");

  const c_mkt_ads = getCostVal(mktCosts, "mkt_1", "4000000000");
  const c_mkt_ads_pct = getCostPct(mktCosts, "mkt_1", "8");
  const c_mkt_events = getCostVal(mktCosts, "mkt_2", "3000000000");
  const c_mkt_events_pct = getCostPct(mktCosts, "mkt_2", "6");
  const c_mkt_print = getCostVal(mktCosts, "mkt_3", "3000000000");
  const c_mkt_print_pct = getCostPct(mktCosts, "mkt_3", "6");
  const c_mkt_insurance = getCostVal(mktCosts, "mkt_4", "0");
  const c_mkt_insurance_pct = getCostPct(mktCosts, "mkt_4", "0");

  const c_ops_salary = getCostVal(opsCosts, "ops_1", "2000000000");
  const c_ops_salary_pct = getCostPct(opsCosts, "ops_1", "4");
  const c_ops_rent = getCostVal(opsCosts, "ops_2", "3000000000");
  const c_ops_rent_pct = getCostPct(opsCosts, "ops_2", "6");
  const c_ops_utilities = getCostVal(opsCosts, "ops_3", "1000000000");
  const c_ops_utilities_pct = getCostPct(opsCosts, "ops_3", "2");
  const c_ops_supplies = getCostVal(opsCosts, "ops_4", "500000000");
  const c_ops_supplies_pct = getCostPct(opsCosts, "ops_4", "1");
  const c_ops_depr = getCostVal(opsCosts, "ops_5", "1500000000");
  const c_ops_depr_pct = getCostPct(opsCosts, "ops_5", "3");
  const c_ops_recruit = getCostVal(opsCosts, "ops_6", "200000000");
  const c_ops_recruit_pct = getCostPct(opsCosts, "ops_6", "0.4");
  const c_ops_cs = getCostVal(opsCosts, "ops_7", "500000000");
  const c_ops_cs_pct = getCostPct(opsCosts, "ops_7", "1");
  const c_ops_logistics = getCostVal(opsCosts, "ops_8", "800000000");
  const c_ops_logistics_pct = getCostPct(opsCosts, "ops_8", "1.6");
  const c_ops_inv_writeoff = getCostVal(opsCosts, "ops_9", "300000000");
  const c_ops_inv_writeoff_pct = getCostPct(opsCosts, "ops_9", "0.6");
  const c_ops_bad_debt = getCostVal(opsCosts, "ops_10", "200000000");
  const c_ops_bad_debt_pct = getCostPct(opsCosts, "ops_10", "0.4");

  const c_misc = getCostVal(miscCosts, "misc_1", "2000000000");
  const c_misc_pct = getCostPct(miscCosts, "misc_1", "4");

  // Setter stubs để tránh compile errors trong loadPlan logic cũ
  const set_c_biz_agentopen = (v: any) => { };
  const set_c_biz_salary = (v: any) => { };
  const set_c_biz_insurance = (v: any) => { };
  const set_c_biz_bonus = (v: any) => { };
  const set_c_biz_travel = (v: any) => { };
  const set_c_biz_promo = (v: any) => { };
  const set_c_biz_agentopen_pct = (v: any) => { };
  const set_c_biz_salary_pct = (v: any) => { };
  const set_c_biz_insurance_pct = (v: any) => { };
  const set_c_biz_bonus_pct = (v: any) => { };
  const set_c_biz_travel_pct = (v: any) => { };
  const set_c_biz_promo_pct = (v: any) => { };

  const set_c_mkt_ads = (v: any) => { };
  const set_c_mkt_events = (v: any) => { };
  const set_c_mkt_print = (v: any) => { };
  const set_c_mkt_ads_pct = (v: any) => { };
  const set_c_mkt_events_pct = (v: any) => { };
  const set_c_mkt_print_pct = (v: any) => { };

  const set_c_ops_salary = (v: any) => { };
  const set_c_ops_rent = (v: any) => { };
  const set_c_ops_utilities = (v: any) => { };
  const set_c_ops_supplies = (v: any) => { };
  const set_c_ops_depr = (v: any) => { };
  const set_c_ops_recruit = (v: any) => { };
  const set_c_ops_cs = (v: any) => { };
  const set_c_ops_logistics = (v: any) => { };
  const set_c_ops_inv_writeoff = (v: any) => { };
  const set_c_ops_bad_debt = (v: any) => { };
  const set_c_ops_salary_pct = (v: any) => { };
  const set_c_ops_rent_pct = (v: any) => { };
  const set_c_ops_utilities_pct = (v: any) => { };
  const set_c_ops_supplies_pct = (v: any) => { };
  const set_c_ops_depr_pct = (v: any) => { };
  const set_c_ops_recruit_pct = (v: any) => { };
  const set_c_ops_cs_pct = (v: any) => { };
  const set_c_ops_logistics_pct = (v: any) => { };
  const set_c_ops_inv_writeoff_pct = (v: any) => { };
  const set_c_ops_bad_debt_pct = (v: any) => { };

  const set_c_misc = (v: any) => { };
  const set_c_misc_pct = (v: any) => { };

  const [c_fin_salary, set_c_fin_salary] = useState<string>("0"); // Lương HC-NS
  const [c_fin_salary_pct, set_c_fin_salary_pct] = useState<string>("6");

  const [s4Notes, setS4Notes] = useState<{ [key: string]: string }>({
    "1": "Tổng doanh thu kế hoạch từ các nguồn",
    "2": "Các khoản chiết khấu thương mại, giảm giá hàng bán, hàng bán bị trả lại",
    "3": "Doanh thu thuần sau giảm trừ",
    "4": "Giá vốn hàng bán",
    "5": "Lợi nhuận gộp về bán hàng",
    "6": "Doanh thu từ hoạt động tài chính (lãi tiền gửi, đầu tư...)",
    "7": "Chi phí tài chính, lãi vay...",
    "8": "Chi phí quản lý doanh nghiệp và vận hành",
    "9": "Lợi nhuận thuần từ hoạt động kinh doanh cốt lõi",
    "10": "Các khoản thu nhập khác phát sinh ngoài kinh doanh",
    "11": "Các khoản chi phí khác phát sinh ngoài kinh doanh",
    "12": "Lợi nhuận từ các hoạt động khác",
    "13": "Tổng lợi nhuận trước thuế kế hoạch",
    "14": "Tỷ suất Lợi nhuận gộp / Doanh thu thuần",
    "15": "Tỷ suất Lợi nhuận thuần / Doanh thu thuần",
  });

  const handleS4NoteChange = (id: string, val: string) => {
    setS4Notes(prev => ({ ...prev, [id]: val }));
  };

  const [s4_deductions, set_s4_deductions] = useState<string>("0");
  const [s4_finRevenue, set_s4_finRevenue] = useState<string>("0");
  const [s4_finCost, set_s4_finCost] = useState<string>("50000000");
  const [s4_otherIncome, set_s4_otherIncome] = useState<string>("0");
  const [s4_otherCost, set_s4_otherCost] = useState<string>("0");

  // --- Step 3: Chi tiết định biên nhân sự ---
  interface CustomStaffItem {
    id: string;
    label: string;
    qty: string;
    salary: string;
    checked: boolean;
  }

  const [bizStaff, setBizStaff] = useState<CustomStaffItem[]>([
    { id: "biz_s1", label: "Quản lý kinh doanh", qty: "1", salary: "25000000", checked: false },
  ]);

  const [mktStaff, setMktStaff] = useState<CustomStaffItem[]>([
    { id: "mkt_s1", label: "Tổ trưởng sản xuất", qty: "1", salary: "20000000", checked: false },
    { id: "mkt_s2", label: "Kỹ thuật sản xuất", qty: "5", salary: "15000000", checked: false },
    { id: "mkt_s3", label: "Kỹ thuật sản xuất và bảo hành", qty: "5", salary: "15000000", checked: false },
    { id: "mkt_s4", label: "Kỹ thuật sản xuất và quảng cáo", qty: "5", salary: "15000000", checked: false },
    { id: "mkt_s5", label: "Nhân viên vận chuyển", qty: "5", salary: "12000000", checked: false },
  ]);

  const [logStaff, setLogStaff] = useState<CustomStaffItem[]>([
    { id: "log_s1", label: "Thủ kho", qty: "3", salary: "10000000", checked: false },
    { id: "log_s2", label: "Nhân viên kho", qty: "25", salary: "8000000", checked: false },
  ]);

  const [finStaff, setFinStaff] = useState<CustomStaffItem[]>([
    { id: "fin_s1", label: "Quản lý nhân sự", qty: "1", salary: "18000000", checked: false },
    { id: "fin_s2", label: "Kế toán tổng hợp", qty: "2", salary: "15000000", checked: false },
    { id: "fin_s3", label: "Kế toán vận hành", qty: "2", salary: "12000000", checked: false },
    { id: "fin_s4", label: "Kế toán quản trị và thuế", qty: "1", salary: "18000000", checked: false },
  ]);

  const getStaffQty = (arr: CustomStaffItem[], id: string, def: string) => {
    const item = arr.find(i => i.id === id);
    if (!item) return "0";
    return item.qty || def;
  };

  const getStaffSalary = (arr: CustomStaffItem[], id: string, def: string) => {
    const item = arr.find(i => i.id === id);
    if (!item) return "0";
    return item.salary || def;
  };

  const s3_biz_1 = getStaffQty(bizStaff, "biz_s1", "1");
  const s3_biz_2 = getStaffQty(bizStaff, "biz_s2", "2");
  const s3_biz_3 = getStaffQty(bizStaff, "biz_s3", "4");
  const s3_biz_4 = getStaffQty(bizStaff, "biz_s4", "15");
  const s3_biz_5 = getStaffQty(bizStaff, "biz_s5", "12");
  const s3_biz_6 = getStaffQty(bizStaff, "biz_s6", "6");
  const s3_biz_1_inc = getStaffSalary(bizStaff, "biz_s1", "25000000");
  const s3_biz_2_inc = getStaffSalary(bizStaff, "biz_s2", "20000000");
  const s3_biz_3_inc = getStaffSalary(bizStaff, "biz_s3", "12000000");
  const s3_biz_4_inc = getStaffSalary(bizStaff, "biz_s4", "10000000");
  const s3_biz_5_inc = getStaffSalary(bizStaff, "biz_s5", "12000000");
  const s3_biz_6_inc = getStaffSalary(bizStaff, "biz_s6", "10000000");

  const s3_mkt_1 = getStaffQty(mktStaff, "mkt_s1", "1");
  const s3_mkt_2 = getStaffQty(mktStaff, "mkt_s2", "4");
  const s3_mkt_3 = getStaffQty(mktStaff, "mkt_s3", "5");
  const s3_mkt_4 = getStaffQty(mktStaff, "mkt_s4", "6");
  const s3_mkt_5 = getStaffQty(mktStaff, "mkt_s5", "4");
  const s3_mkt_1_inc = getStaffSalary(mktStaff, "mkt_s1", "25000000");
  const s3_mkt_2_inc = getStaffSalary(mktStaff, "mkt_s2", "15000000");
  const s3_mkt_3_inc = getStaffSalary(mktStaff, "mkt_s3", "15000000");
  const s3_mkt_4_inc = getStaffSalary(mktStaff, "mkt_s4", "12000000");
  const s3_mkt_5_inc = getStaffSalary(mktStaff, "mkt_s5", "12000000");

  const s3_log_1 = getStaffQty(logStaff, "log_s1", "2");
  const s3_log_2 = getStaffQty(logStaff, "log_s2", "3");
  const s3_log_3 = getStaffQty(logStaff, "log_s3", "25");
  const s3_log_1_inc = getStaffSalary(logStaff, "log_s1", "12000000");
  const s3_log_2_inc = getStaffSalary(logStaff, "log_s2", "10000000");
  const s3_log_3_inc = getStaffSalary(logStaff, "log_s3", "8000000");


  const s3_fin_1 = getStaffQty(finStaff, "fin_s1", "2");
  const s3_fin_2 = getStaffQty(finStaff, "fin_s2", "3");
  const s3_fin_3 = getStaffQty(finStaff, "fin_s3", "5");
  const s3_fin_4 = getStaffQty(finStaff, "fin_s4", "5");
  const s3_fin_1_inc = getStaffSalary(finStaff, "fin_s1", "18000000");
  const s3_fin_2_inc = getStaffSalary(finStaff, "fin_s2", "12000000");
  const s3_fin_3_inc = getStaffSalary(finStaff, "fin_s3", "15000000");
  const s3_fin_4_inc = getStaffSalary(finStaff, "fin_s4", "18000000");

  // Dummy setters for load compatibility
  const set_s3_biz_1 = (v: any) => { };
  const set_s3_biz_2 = (v: any) => { };
  const set_s3_biz_3 = (v: any) => { };
  const set_s3_biz_4 = (v: any) => { };
  const set_s3_biz_5 = (v: any) => { };
  const set_s3_biz_6 = (v: any) => { };
  const set_s3_biz_1_inc = (v: any) => { };
  const set_s3_biz_2_inc = (v: any) => { };
  const set_s3_biz_3_inc = (v: any) => { };
  const set_s3_biz_4_inc = (v: any) => { };
  const set_s3_biz_5_inc = (v: any) => { };
  const set_s3_biz_6_inc = (v: any) => { };

  const set_s3_mkt_1 = (v: any) => { };
  const set_s3_mkt_2 = (v: any) => { };
  const set_s3_mkt_3 = (v: any) => { };
  const set_s3_mkt_4 = (v: any) => { };
  const set_s3_mkt_5 = (v: any) => { };
  const set_s3_mkt_1_inc = (v: any) => { };
  const set_s3_mkt_2_inc = (v: any) => { };
  const set_s3_mkt_3_inc = (v: any) => { };
  const set_s3_mkt_4_inc = (v: any) => { };
  const set_s3_mkt_5_inc = (v: any) => { };

  const set_s3_log_1 = (v: any) => { };
  const set_s3_log_2 = (v: any) => { };
  const set_s3_log_3 = (v: any) => { };
  const set_s3_log_1_inc = (v: any) => { };
  const set_s3_log_2_inc = (v: any) => { };
  const set_s3_log_3_inc = (v: any) => { };

  const set_s3_fin_1 = (v: any) => { };
  const set_s3_fin_2 = (v: any) => { };
  const set_s3_fin_3 = (v: any) => { };
  const set_s3_fin_4 = (v: any) => { };
  const set_s3_fin_1_inc = (v: any) => { };
  const set_s3_fin_2_inc = (v: any) => { };
  const set_s3_fin_3_inc = (v: any) => { };
  const set_s3_fin_4_inc = (v: any) => { };

  const totalRevenue = (Number(revenueAgent) || 0) + (Number(revenueOEM) || 0);

  const finalCostSales = isCalculateByRevenue ? Math.round(totalRevenue * (Number(costSalesPercent) || 0) / 100) : (Number(costSales) || 0);
  const finalCostMarketing = isCalculateByRevenue ? Math.round(totalRevenue * (Number(costMarketingPercent) || 0) / 100) : (Number(costMarketing) || 0);
  const finalCostFinanceHR = isCalculateByRevenue ? Math.round(totalRevenue * (Number(costFinanceHRPercent) || 0) / 100) : (Number(costFinanceHR) || 0);
  const finalCostLogistics = isCalculateByRevenue ? Math.round(totalRevenue * (Number(costLogisticsPercent) || 0) / 100) : (Number(costLogistics) || 0);
  const finalCostOperations = isCalculateByRevenue ? Math.round(totalRevenue * (Number(costOperationsPercent) || 0) / 100) : (Number(costOperations) || 0);

  const totalCost = finalCostSales + finalCostMarketing + finalCostFinanceHR + finalCostLogistics + finalCostOperations;
  const totalStaff = (Number(staffSales) || 0) + (Number(staffMarketing) || 0) + (Number(staffLogistics) || 0) + (Number(staffCustomerService) || 0) + (Number(staffFinanceHR) || 0);
  const totalProfit = totalRevenue - totalCost;
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - finalCostSales) / totalRevenue) * 100 : 0;
  const operatingMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // --- Step 2 Calculations (Component Level) ---
  const calcStep2Val = (id: string, pct: string, val: string, arr: CustomCostItem[]) => {
    const item = arr.find(i => i.id === id);
    if (!item) return 0;
    return s2_calcByRev ? Math.round(totalRevenue * (Number(item.pctVal) || 0) / 100) : (Number(item.val) || 0);
  };

  const f_biz_agentopen = calcStep2Val("biz_1", c_biz_agentopen_pct, c_biz_agentopen, bizCosts);
  const f_biz_salary = calcStep2Val("biz_2", c_biz_salary_pct, c_biz_salary, bizCosts);
  const f_biz_insurance = calcStep2Val("biz_3", c_biz_insurance_pct, c_biz_insurance, bizCosts);
  const f_biz_bonus = calcStep2Val("biz_4", c_biz_bonus_pct, c_biz_bonus, bizCosts);
  const f_biz_travel = calcStep2Val("biz_5", c_biz_travel_pct, c_biz_travel, bizCosts);
  const f_biz_promo = calcStep2Val("biz_6", c_biz_promo_pct, c_biz_promo, bizCosts);

  const f_mkt_ads = calcStep2Val("mkt_1", c_mkt_ads_pct, c_mkt_ads, mktCosts);
  const f_mkt_events = calcStep2Val("mkt_2", c_mkt_events_pct, c_mkt_events, mktCosts);
  const f_mkt_print = calcStep2Val("mkt_3", c_mkt_print_pct, c_mkt_print, mktCosts);

  const f_ops_salary = calcStep2Val("ops_1", c_ops_salary_pct, c_ops_salary, opsCosts);
  const f_ops_rent = calcStep2Val("ops_2", c_ops_rent_pct, c_ops_rent, opsCosts);
  const f_ops_utilities = calcStep2Val("ops_3", c_ops_utilities_pct, c_ops_utilities, opsCosts);
  const f_ops_supplies = calcStep2Val("ops_4", c_ops_supplies_pct, c_ops_supplies, opsCosts);
  const f_ops_depr = calcStep2Val("ops_5", c_ops_depr_pct, c_ops_depr, opsCosts);
  const f_ops_recruit = calcStep2Val("ops_6", c_ops_recruit_pct, c_ops_recruit, opsCosts);
  const f_ops_cs = calcStep2Val("ops_7", c_ops_cs_pct, c_ops_cs, opsCosts);
  const f_ops_logistics = calcStep2Val("ops_8", c_ops_logistics_pct, c_ops_logistics, opsCosts);
  const f_ops_inv_writeoff = calcStep2Val("ops_9", c_ops_inv_writeoff_pct, c_ops_inv_writeoff, opsCosts);
  const f_ops_bad_debt = calcStep2Val("ops_10", c_ops_bad_debt_pct, c_ops_bad_debt, opsCosts);

  const f_misc = calcStep2Val("misc_1", c_misc_pct, c_misc, miscCosts);

  const calcCompGroupTotal = (arr: CustomCostItem[]) => {
    return arr.reduce((sum, item) => {
      const val = s2_calcByRev
        ? Math.round(totalRevenue * (Number(item.pctVal) || 0) / 100)
        : (Number(item.val) || 0);
      return sum + val;
    }, 0);
  };

  const step2BizTotal = calcCompGroupTotal(bizCosts);
  const step2MktTotal = calcCompGroupTotal(mktCosts);
  const step2FinTotal = calcCompGroupTotal(finCosts);
  const step2LogTotal = calcCompGroupTotal(logCosts);
  const step2OpsTotal = calcCompGroupTotal(opsCosts);
  const step2MiscTotal = calcCompGroupTotal(miscCosts);
  const totalStep2 = step2BizTotal + step2MktTotal + step2FinTotal + step2LogTotal + step2OpsTotal + step2MiscTotal;

  // --- Step 3 Calculations (Component Level) ---
  const calcStaffTotal = (arr: CustomStaffItem[]) => arr.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const calcStaffFund = (arr: CustomStaffItem[]) => arr.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.salary) || 0), 0) * 12;

  const grpBiz = calcStaffTotal(bizStaff);
  const grpMkt = calcStaffTotal(mktStaff);
  const grpLog = calcStaffTotal(logStaff);

  const grpFin = calcStaffTotal(finStaff);

  const totalStep3 = grpBiz + grpMkt + grpLog + grpFin;

  const fundBiz = calcStaffFund(bizStaff);
  const fundMkt = calcStaffFund(mktStaff);
  const fundLog = calcStaffFund(logStaff);

  const fundFin = calcStaffFund(finStaff);

  const limitBiz = s2_calcByRev ? Math.round(totalRevenue * (Number(c_biz_salary_pct) || 0) / 100) : (Number(c_biz_salary) || 0);
  const limitMkt = s2_calcByRev ? Math.round(totalRevenue * (Number(c_mkt_events_pct) || 0) / 100) : (Number(c_mkt_events) || 0);
  const limitLog = s2_calcByRev ? Math.round(totalRevenue * (Number(c_ops_salary_pct) || 0) / 100) : (Number(c_ops_salary) || 0);
  const limitCS = s2_calcByRev ? Math.round(totalRevenue * (Number(c_ops_cs_pct) || 0) / 100) : (Number(c_ops_cs) || 0);
  const limitFin = s2_calcByRev ? Math.round(totalRevenue * (Number(c_fin_salary_pct) || 0) / 100) : (Number(c_fin_salary) || 0);

  const grandTotalFund = fundBiz + fundMkt + fundLog + fundFin;
  const grandTotalLimit = limitBiz + limitMkt + limitLog + limitFin;

  // --- Step 4 calculations promoted to component top level ---
  const valGrossRevenue = totalRevenue;
  const valDeductions = Math.round(valGrossRevenue * (Number(revenueDeductionPercent) || 0) / 100);
  const valNetRevenue = valGrossRevenue - valDeductions;
  const valCOGS = Math.round(valNetRevenue * (Number(cogsPercent) || 0) / 100);
  const valGrossProfit = valNetRevenue - valCOGS;
  const valFinRevenue = Number(s4_finRevenue) || 0;
  const valFinCost = Number(s4_finCost) === 0 ? 50000000 : (Number(s4_finCost) || 0);
  const valOperatingExpenses = totalStep2;
  const valOperatingProfit = valGrossProfit + valFinRevenue - valFinCost - valOperatingExpenses;
  const valOtherIncome = Number(s4_otherIncome) || 0;
  const valOtherCost = Number(s4_otherCost) || 0;
  const valOtherProfit = (valOtherIncome === 0 && valOtherCost === 0) ? 5000000 : (valOtherIncome - valOtherCost);
  const valTotalProfit = valOperatingProfit + valOtherProfit;

  const grossProfitMargin = valNetRevenue > 0 ? (valGrossProfit / valNetRevenue * 100) : 0;
  const operatingProfitMargin = valNetRevenue > 0 ? (valOperatingProfit / valNetRevenue * 100) : 0;

  useEffect(() => {
    onProfitChange?.(valTotalProfit, operatingProfitMargin);
  }, [valTotalProfit, operatingProfitMargin, onProfitChange]);

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: "co_ban",
      title: "Chỉ tiêu cơ bản",
      desc: "Doanh thu & Mục tiêu chung",
      icon: "bi-graph-up-arrow"
    },
    {
      num: 2,
      id: "chi_phi",
      title: "Chi phí",
      desc: "Định mức chi phí vận hành",
      icon: "bi-cash-coin"
    },
    {
      num: 3,
      id: "nhan_su",
      title: "Nhân sự",
      desc: "Kế hoạch định biên nhân sự",
      icon: "bi-people"
    },
    {
      num: 4,
      id: "loi_nhuan",
      title: "Lợi nhuận",
      desc: "Kế hoạch lợi nhuận & ROI",
      icon: "bi-trophy"
    }
  ];

  // --- Load Plan Data from DB ---
  useEffect(() => {
    let active = true;
    const loadPlan = async () => {
      try {
        const res = await fetch(`/api/plan-finance/oem-master-plan?year=${year}`, { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (data.success && data.plan) {
          const state = JSON.parse(data.plan.planData);

          // Restore Step 1 states
          if (state.revenueAgent !== undefined) setRevenueAgent(state.revenueAgent);
          if (state.revenueOEM !== undefined) setRevenueOEM(state.revenueOEM);

          if (state.costSales !== undefined) setCostSales(state.costSales);
          if (state.costMarketing !== undefined) setCostMarketing(state.costMarketing);
          if (state.costFinanceHR !== undefined) setCostFinanceHR(state.costFinanceHR);
          if (state.costLogistics !== undefined) setCostLogistics(state.costLogistics);
          if (state.costOperations !== undefined) setCostOperations(state.costOperations);

          if (state.isCalculateByRevenue !== undefined) setIsCalculateByRevenue(state.isCalculateByRevenue);
          if (state.costSalesPercent !== undefined) setCostSalesPercent(state.costSalesPercent);
          if (state.costMarketingPercent !== undefined) setCostMarketingPercent(state.costMarketingPercent);
          if (state.costFinanceHRPercent !== undefined) setCostFinanceHRPercent(state.costFinanceHRPercent);
          if (state.costLogisticsPercent !== undefined) setCostLogisticsPercent(state.costLogisticsPercent);
          if (state.costOperationsPercent !== undefined) setCostOperationsPercent(state.costOperationsPercent);
          setRevenueDeductionPercent(state.revenueDeductionPercent ?? "17");
          setCogsPercent(state.cogsPercent ?? "47");
          if (state.staffSales !== undefined) setStaffSales(state.staffSales);
          if (state.staffMarketing !== undefined) setStaffMarketing(state.staffMarketing);
          if (state.staffLogistics !== undefined) setStaffLogistics(state.staffLogistics);
          if (state.staffCustomerService !== undefined) setStaffCustomerService(state.staffCustomerService);
          if (state.staffFinanceHR !== undefined) setStaffFinanceHR(state.staffFinanceHR);

          if (state.s2_calcByRev !== undefined) setS2_calcByRev(state.s2_calcByRev);

          if (state.bizCosts !== undefined) {
            setBizCosts(state.bizCosts);
          } else {
            setBizCosts([
              { id: "biz_1", label: "Phụ trách kinh doanh", val: "8000000000", pctVal: "16", checked: false },
              { id: "biz_2", label: "Khuyến mãi", val: "2500000000", pctVal: "5", checked: false },
            ]);
          }

          if (state.mktCosts !== undefined) {
            setMktCosts(state.mktCosts);
          } else {
            setMktCosts([
              { id: "mkt_1", label: "Lương nhân viên", val: "3000000000", pctVal: "6", checked: false },
              { id: "mkt_2", label: "Bảo hiểm", val: "500000000", pctVal: "1", checked: false },
            ]);
          }

          if (state.finCosts !== undefined) {
            setFinCosts(state.finCosts);
          } else {
            setFinCosts([
              { id: "fin_1", label: "Lương nhân viên", val: "3000000000", pctVal: "1.5", checked: false },
              { id: "fin_2", label: "Bảo hiểm", val: "500000000", pctVal: "0.5", checked: false },
            ]);
          }

          if (state.logCosts !== undefined) {
            setLogCosts(state.logCosts);
          } else {
            setLogCosts([
              { id: "log_1", label: "Lương nhân viên", val: "2000000000", pctVal: "1.5", checked: false },
              { id: "log_2", label: "Bảo hiểm", val: "500000000", pctVal: "0.5", checked: false },
            ]);
          }

          if (state.opsCosts !== undefined) {
            setOpsCosts(state.opsCosts);
          } else {
            setOpsCosts([
              { id: "ops_1", label: "Thuê kho bãi và showroom", val: state.c_ops_salary || "2000000000", pctVal: state.c_ops_salary_pct || "4", checked: false },
              { id: "ops_2", label: "Chi phí điện nước", val: state.c_ops_rent || "1000000000", pctVal: state.c_ops_rent_pct || "2", checked: false },
              { id: "ops_3", label: "Văn phòng phẩm", val: state.c_ops_utilities || "500000000", pctVal: state.c_ops_utilities_pct || "1", checked: false },
              { id: "ops_4", label: "Thưởng lễ tết, du lịch", val: state.c_ops_supplies || "1000000000", pctVal: state.c_ops_supplies_pct || "2", checked: false },
              { id: "ops_5", label: "Khấu hao công cụ, dụng cụ và chi phí trả trước", val: state.c_ops_depr || "500000000", pctVal: state.c_ops_depr_pct || "1", checked: false },
              { id: "ops_6", label: "Khấu hao công cụ, dụng cụ tại đại lý", val: state.c_ops_recruit || "500000000", pctVal: state.c_ops_recruit_pct || "1", checked: false },
              { id: "ops_7", label: "Khấu hao tài sản cố định", val: state.c_ops_cs || "500000000", pctVal: state.c_ops_cs_pct || "1", checked: false },
              { id: "ops_8", label: "Lãi vay", val: state.c_ops_logistics || "500000000", pctVal: state.c_ops_logistics_pct || "1", checked: false },
              { id: "ops_9", label: "Chi phí tuyển dụng, đào tạo", val: state.c_ops_inv_writeoff || "200000000", pctVal: state.c_ops_inv_writeoff_pct || "0.4", checked: false },
              { id: "ops_10", label: "Chi phí vận chuyển, hậu cần", val: state.c_ops_bad_debt || "800000000", pctVal: state.c_ops_bad_debt_pct || "1.6", checked: false },
              { id: "ops_11", label: "Chi phí giảm giá hàng tồn kho", val: "300000000", pctVal: "0.6", checked: false },
              { id: "ops_12", label: "Chi phí rủi ro nợ khó đòi", val: "200000000", pctVal: "0.4", checked: false },
            ]);
          }

          if (state.miscCosts !== undefined) {
            setMiscCosts(state.miscCosts);
          } else {
            setMiscCosts([
              { id: "misc_1", label: "Dự phòng rủi ro & chi phí phát sinh", val: state.c_misc || "2000000000", pctVal: state.c_misc_pct || "4", checked: false },
            ]);
          }
          if (state.c_misc_pct !== undefined) set_c_misc_pct(state.c_misc_pct);
          if (state.c_fin_salary !== undefined) set_c_fin_salary(state.c_fin_salary);
          if (state.c_fin_salary_pct !== undefined) set_c_fin_salary_pct(state.c_fin_salary_pct);

          // Restore Step 3 states
          if (state.bizStaff !== undefined) {
            setBizStaff(state.bizStaff);
          } else {
            setBizStaff([
              { id: "biz_s1", label: "Quản lý kinh doanh", qty: "1", salary: "25000000", checked: false },
            ]);
          }
          if (state.mktStaff) {
            setMktStaff(state.mktStaff);
          } else {
            setMktStaff([
              { id: "mkt_s1", label: "Tổ trưởng sản xuất", qty: "1", salary: "20000000", checked: false },
              { id: "mkt_s2", label: "Kỹ thuật sản xuất", qty: "5", salary: "15000000", checked: false },
              { id: "mkt_s3", label: "Kỹ thuật sản xuất và bảo hành", qty: "5", salary: "15000000", checked: false },
              { id: "mkt_s4", label: "Kỹ thuật sản xuất và quảng cáo", qty: "5", salary: "15000000", checked: false },
              { id: "mkt_s5", label: "Nhân viên vận chuyển", qty: "5", salary: "12000000", checked: false },
            ]);
          }
          if (state.logStaff) {
            setLogStaff(state.logStaff);
          } else {
            setLogStaff([
              { id: "log_s1", label: "Thủ kho", qty: "3", salary: "10000000", checked: false },
              { id: "log_s2", label: "Nhân viên kho", qty: "25", salary: "8000000", checked: false },
            ]);
          }
          if (state.finStaff !== undefined) {
            setFinStaff(state.finStaff);
          } else {
            setFinStaff([
              { id: "fin_s1", label: "Quản lý nhân sự", qty: "1", salary: "18000000", checked: false },
              { id: "fin_s2", label: "Kế toán tổng hợp", qty: "2", salary: "15000000", checked: false },
              { id: "fin_s3", label: "Kế toán vận hành", qty: "2", salary: "12000000", checked: false },
              { id: "fin_s4", label: "Kế toán quản trị và thuế", qty: "1", salary: "18000000", checked: false },
            ]);
          }

          // Restore Step 4 notes
          if (state.s4Notes !== undefined) setS4Notes(state.s4Notes);
          if (state.s4_deductions !== undefined) set_s4_deductions(state.s4_deductions);
          if (state.s4_finRevenue !== undefined) set_s4_finRevenue(state.s4_finRevenue);
          if (state.s4_finCost !== undefined) set_s4_finCost(state.s4_finCost);
          if (state.s4_otherIncome !== undefined) set_s4_otherIncome(state.s4_otherIncome);
          if (state.s4_otherCost !== undefined) set_s4_otherCost(state.s4_otherCost);
        } else {
          // Reset states to default values if plan not found in DB
          setRevenueAgent("0");
          setRevenueOEM("0");

          setCostSales("0");
          setCostMarketing("0");
          setCostFinanceHR("0");
          setCostLogistics("0");
          setCostOperations("0");

          setIsCalculateByRevenue(false);
          setCostSalesPercent("30");
          setCostMarketingPercent("20");
          setCostFinanceHRPercent("4");
          setCostLogisticsPercent("6");
          setCostOperationsPercent("20");
          setRevenueDeductionPercent("17");
          setCogsPercent("47");

          setStaffSales("40");
          setStaffMarketing("20");
          setStaffLogistics("30");
          setStaffCustomerService("15");
          setStaffFinanceHR("15");

          setS2_calcByRev(false);

          setBizCosts([
            { id: "biz_1", label: "Chi phí mở đại lý", val: "4000000000", pctVal: "8", checked: false },
            { id: "biz_2", label: "Lương nhân viên kinh doanh", val: "8000000000", pctVal: "16", checked: false },
            { id: "biz_3", label: "Chi phí bảo hiểm", val: "1500000000", pctVal: "3", checked: false },
            { id: "biz_4", label: "Thưởng", val: "2000000000", pctVal: "4", checked: false },
            { id: "biz_5", label: "Công tác phí và tiếp khách", val: "2000000000", pctVal: "4", checked: false },
            { id: "biz_6", label: "Khuyến mãi", val: "2500000000", pctVal: "5", checked: false },
          ]);

          setMktCosts([
            { id: "mkt_1", label: "Chi phí Branding", val: "4000000000", pctVal: "8", checked: false },
            { id: "mkt_2", label: "Lương và thưởng hiệu suất", val: "3000000000", pctVal: "6", checked: false },
            { id: "mkt_3", label: "Công tác phí", val: "3000000000", pctVal: "6", checked: false },
            { id: "mkt_4", label: "Chi phí bảo hiểm", val: "0", pctVal: "0", checked: false },
          ]);

          setLogCosts([
            { id: "log_1", label: "Lương nhân viên", val: "2000000000", pctVal: "1.5", checked: false },
            { id: "log_2", label: "Bảo hiểm", val: "500000000", pctVal: "0.5", checked: false },
          ]);

          setOpsCosts([
            { id: "ops_1", label: "Thuê kho bãi và showroom", val: "2000000000", pctVal: "4", checked: false },
            { id: "ops_2", label: "Chi phí điện nước", val: "1000000000", pctVal: "2", checked: false },
            { id: "ops_3", label: "Văn phòng phẩm", val: "500000000", pctVal: "1", checked: false },
            { id: "ops_4", label: "Thưởng lễ tết, du lịch", val: "1000000000", pctVal: "2", checked: false },
            { id: "ops_5", label: "Khấu hao công cụ, dụng cụ và chi phí trả trước", val: "500000000", pctVal: "1", checked: false },
            { id: "ops_6", label: "Khấu hao công cụ, dụng cụ tại đại lý", val: "500000000", pctVal: "1", checked: false },
            { id: "ops_7", label: "Khấu hao tài sản cố định", val: "500000000", pctVal: "1", checked: false },
            { id: "ops_8", label: "Lãi vay", val: "500000000", pctVal: "1", checked: false },
            { id: "ops_9", label: "Chi phí tuyển dụng, đào tạo", val: "200000000", pctVal: "0.4", checked: false },
            { id: "ops_10", label: "Chi phí vận chuyển, hậu cần", val: "800000000", pctVal: "1.6", checked: false },
            { id: "ops_11", label: "Chi phí giảm giá hàng tồn kho", val: "300000000", pctVal: "0.6", checked: false },
            { id: "ops_12", label: "Chi phí rủi ro nợ khó đòi", val: "200000000", pctVal: "0.4", checked: false },
          ]);

          setMiscCosts([
            { id: "misc_1", label: "Dự phòng rủi ro & chi phí phát sinh", val: "2000000000", pctVal: "4", checked: false },
          ]);

          set_c_fin_salary("3000000000");
          set_c_fin_salary_pct("6");

          setBizStaff([
            { id: "biz_s1", label: "Trưởng phòng", qty: "1", salary: "25000000", checked: false },
            { id: "biz_s2", label: "Phó trưởng phòng", qty: "2", salary: "20000000", checked: false },
            { id: "biz_s3", label: "Sale Admin", qty: "4", salary: "12000000", checked: false },
            { id: "biz_s4", label: "Sale Ecom và chăm sóc khách hàng", qty: "15", salary: "10000000", checked: false },
            { id: "biz_s5", label: "Sale Voriger và Seajong", qty: "12", salary: "12000000", checked: false },
            { id: "biz_s6", label: "Sale chăm sóc", qty: "6", salary: "10000000", checked: false },
          ]);

          setMktStaff([
            { id: "mkt_s1", label: "Trưởng phòng", qty: "1", salary: "25000000", checked: false },
            { id: "mkt_s2", label: "SEO", qty: "4", salary: "15000000", checked: false },
            { id: "mkt_s3", label: "Design", qty: "5", salary: "15000000", checked: false },
            { id: "mkt_s4", label: "Content Media", qty: "6", salary: "12000000", checked: false },
            { id: "mkt_s5", label: "Editor video", qty: "4", salary: "12000000", checked: false },
          ]);

          setLogStaff([
            { id: "log_s1", label: "Điều phối", qty: "2", salary: "12000000", checked: false },
            { id: "log_s2", label: "Thủ kho", qty: "3", salary: "10000000", checked: false },
            { id: "log_s3", label: "Nhân viên kho", qty: "25", salary: "8000000", checked: false },
          ]);



          setFinStaff([
            { id: "fin_s1", label: "Trợ lý vận hành", qty: "2", salary: "18000000", checked: false },
            { id: "fin_s2", label: "Nhân sự", qty: "3", salary: "12000000", checked: false },
            { id: "fin_s3", label: "Kế toán tổng hợp", qty: "5", salary: "15000000", checked: false },
            { id: "fin_s4", label: "Kế toán quản trị và thuế", qty: "5", salary: "18000000", checked: false },
          ]);

          setS4Notes({
            "1": "Tổng doanh thu kế hoạch từ các nguồn",
            "2": "Các khoản chiết khấu thương mại, giảm giá hàng bán, hàng bán bị trả lại",
            "3": "Doanh thu thuần sau giảm trừ",
            "4": "Giá vốn hàng bán",
            "5": "Lợi nhuận gộp về bán hàng",
            "6": "Doanh thu từ hoạt động tài chính (lãi tiền gửi, đầu tư...)",
            "7": "Chi phí tài chính, lãi vay...",
            "8": "Chi phí quản lý doanh nghiệp và vận hành",
            "9": "Lợi nhuận thuần từ hoạt động kinh doanh cốt lõi",
            "10": "Các khoản thu nhập khác phát sinh ngoài kinh doanh",
            "11": "Các khoản chi phí khác phát sinh ngoài kinh doanh",
            "12": "Lợi nhuận từ các hoạt động khác",
            "13": "Tổng lợi nhuận trước thuế kế hoạch",
            "14": "Tỷ suất Lợi nhuận gộp / Doanh thu thuần",
            "15": "Tỷ suất Lợi nhuận thuần / Doanh thu thuần",
          });
          set_s4_deductions("0");
          set_s4_finRevenue("0");
          set_s4_finCost("50000000");
          set_s4_otherIncome("0");
          set_s4_otherCost("0");
        }
      } catch (err) {
        console.error("Lỗi khi tải kế hoạch:", err);
      }
    };
    loadPlan();
    return () => { active = false; };
  }, [year]);

  // --- Save Plan Data to DB ---
  const handleSavePlan = async () => {
    const planObj = {
      // Step 1
      revenueAgent, revenueOEM,
      costSales, costMarketing, costFinanceHR, costLogistics, costOperations,
      isCalculateByRevenue, costSalesPercent, costMarketingPercent, costFinanceHRPercent, costLogisticsPercent, costOperationsPercent, revenueDeductionPercent, cogsPercent,
      staffSales, staffMarketing, staffLogistics, staffCustomerService, staffFinanceHR,
      // Step 2
      s2_calcByRev,
      c_biz_agentopen, c_biz_salary, c_biz_insurance, c_biz_bonus, c_biz_travel, c_biz_promo,
      c_biz_agentopen_pct, c_biz_salary_pct, c_biz_insurance_pct, c_biz_bonus_pct, c_biz_travel_pct, c_biz_promo_pct,
      c_mkt_ads, c_mkt_events, c_mkt_print, c_mkt_insurance,
      c_mkt_ads_pct, c_mkt_events_pct, c_mkt_print_pct, c_mkt_insurance_pct,
      c_ops_salary, c_ops_rent, c_ops_utilities, c_ops_supplies, c_ops_depr, c_ops_recruit, c_ops_cs, c_ops_logistics, c_ops_inv_writeoff, c_ops_bad_debt,
      c_ops_salary_pct, c_ops_rent_pct, c_ops_utilities_pct, c_ops_supplies_pct, c_ops_depr_pct, c_ops_recruit_pct, c_ops_cs_pct, c_ops_logistics_pct, c_ops_inv_writeoff_pct, c_ops_bad_debt_pct,
      c_misc, c_misc_pct, c_fin_salary, c_fin_salary_pct,
      bizCosts, mktCosts, finCosts, logCosts, opsCosts, miscCosts,
      bizStaff, mktStaff, logStaff, finStaff,
      // Step 3
      s3_biz_1, s3_biz_2, s3_biz_3, s3_biz_4, s3_biz_5, s3_biz_6,
      s3_biz_1_inc, s3_biz_2_inc, s3_biz_3_inc, s3_biz_4_inc, s3_biz_5_inc, s3_biz_6_inc,
      s3_mkt_1, s3_mkt_2, s3_mkt_3, s3_mkt_4, s3_mkt_5,
      s3_mkt_1_inc, s3_mkt_2_inc, s3_mkt_3_inc, s3_mkt_4_inc, s3_mkt_5_inc,
      s3_log_1, s3_log_2, s3_log_3,
      s3_log_1_inc, s3_log_2_inc, s3_log_3_inc,
      s3_fin_1, s3_fin_2, s3_fin_3, s3_fin_4,
      s3_fin_1_inc, s3_fin_2_inc, s3_fin_3_inc, s3_fin_4_inc,
      // Step 4
      s4Notes,
      s4_deductions, s4_finRevenue, s4_finCost, s4_otherIncome, s4_otherCost
    };

    try {
      const res = await fetch("/api/plan-finance/oem-master-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: year,
          planData: JSON.stringify(planObj),
          status: "draft"
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã lưu thành công kế hoạch năm ${year} vào cơ sở dữ liệu!`);
      } else {
        toast.error(`Lỗi khi lưu kế hoạch: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể kết nối đến máy chủ để lưu kế hoạch.");
    }
  };

  // Helper formatting and handlers
  const handleNumericChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setter(raw);
  };

  const formatVNDInput = (val: string) => {
    if (!val) return "";
    return Number(val).toLocaleString("vi-VN");
  };

  const handleToggleStep1CalcByRev = (checked: boolean) => {
    if (totalRevenue > 0) {
      if (checked) {
        // VND to %
        setCostSalesPercent(Number(((Number(costSales) || 0) / totalRevenue * 100).toFixed(2)).toString());
        setCostMarketingPercent(Number(((Number(costMarketing) || 0) / totalRevenue * 100).toFixed(2)).toString());
        setCostFinanceHRPercent(Number(((Number(costFinanceHR) || 0) / totalRevenue * 100).toFixed(2)).toString());
        setCostLogisticsPercent(Number(((Number(costLogistics) || 0) / totalRevenue * 100).toFixed(2)).toString());
        setCostOperationsPercent(Number(((Number(costOperations) || 0) / totalRevenue * 100).toFixed(2)).toString());
      } else {
        // % to VND
        setCostSales(Math.round(totalRevenue * (Number(costSalesPercent) || 0) / 100).toString());
        setCostMarketing(Math.round(totalRevenue * (Number(costMarketingPercent) || 0) / 100).toString());
        setCostFinanceHR(Math.round(totalRevenue * (Number(costFinanceHRPercent) || 0) / 100).toString());
        setCostLogistics(Math.round(totalRevenue * (Number(costLogisticsPercent) || 0) / 100).toString());
        setCostOperations(Math.round(totalRevenue * (Number(costOperationsPercent) || 0) / 100).toString());
      }
    }
    setIsCalculateByRevenue(checked);
  };

  const handleToggleStep2CalcByRev = (checked: boolean) => {
    if (totalRevenue > 0) {
      const convertCosts = (costs: CustomCostItem[]) => {
        return costs.map(item => {
          if (checked) {
            // VND to %
            const pct = Number(((Number(item.val) || 0) / totalRevenue * 100).toFixed(2)).toString();
            return { ...item, pctVal: pct };
          } else {
            // % to VND
            const val = Math.round(totalRevenue * (Number(item.pctVal) || 0) / 100).toString();
            return { ...item, val };
          }
        });
      };

      setBizCosts(prev => convertCosts(prev));
      setMktCosts(prev => convertCosts(prev));
      setFinCosts(prev => convertCosts(prev));
      setLogCosts(prev => convertCosts(prev));
      setOpsCosts(prev => convertCosts(prev));
      setMiscCosts(prev => convertCosts(prev));
    }
    setS2_calcByRev(checked);
  };

  const handlePercentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputs = Array.from(document.querySelectorAll('.percent-input-field:not(:disabled)')) as HTMLInputElement[];
      const index = inputs.indexOf(e.currentTarget);
      if (index > -1) {
        const nextIndex = (index + 1) % inputs.length;
        inputs[nextIndex].focus();
        inputs[nextIndex].select();
      }
    }
  };

  const handleMoneyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputs = Array.from(document.querySelectorAll('.money-input-field:not(:disabled)')) as HTMLInputElement[];
      const index = inputs.indexOf(e.currentTarget);
      if (index > -1) {
        const nextIndex = (index + 1) % inputs.length;
        inputs[nextIndex].focus();
        inputs[nextIndex].select();
      }
    }
  };

  return (
    <>
      {currentStep === 1 ? (
        /* STEP 1: CHỈ TIÊU CƠ BẢN */
        <div className="container-fluid px-3 pb-3">
          <div className="row g-4">

            {/* Column 1: Năm kế hoạch */}
            <div className="col-12 col-lg-4">
              <div className="card h-100 border rounded-4 overflow-hidden">
                <div className="card-header bg-light border-bottom p-3">
                  <SectionTitle title="Năm kế hoạch" icon="bi-calendar3" className="mb-0" />
                </div>
                <div className="card-body p-3 d-flex flex-column gap-3">
                  <div>
                    <label className="form-label text-muted fw-semibold mb-1" style={{ fontSize: 12 }}>Chọn năm lập kế hoạch</label>
                    <div className="d-flex align-items-center gap-1" style={{ height: 38 }}>
                      <select
                        className="form-select fw-bold flex-grow-1 h-100"
                        value={year}
                        disabled
                        style={{ fontSize: 14 }}
                      >
                        <option value={2025}>Năm 2025</option>
                        <option value={2026}>Năm 2026</option>
                        <option value={2027}>Năm 2027</option>
                      </select>
                      <button
                        type="button"
                        title="Lưu kế hoạch"
                        onClick={handleSavePlan}
                        style={{
                          flexShrink: 0,
                          width: 36, height: 38,
                          border: "1px solid #dee2e6",
                          borderRadius: 8,
                          background: "#fff",
                          color: "#0d6efd",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer",
                          transition: "background 0.15s, border-color 0.15s",
                          fontSize: 15,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#e7f1ff"; e.currentTarget.style.borderColor = "#0d6efd"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#dee2e6"; }}
                      >
                        <i className="bi bi-floppy" />
                      </button>
                      <button
                        type="button"
                        title="In kế hoạch"
                        onClick={() => setIsPrintOpen(true)}
                        style={{
                          flexShrink: 0,
                          width: 36, height: 38,
                          border: "1px solid #dee2e6",
                          borderRadius: 8,
                          background: "#fff",
                          color: "#6c757d",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer",
                          transition: "background 0.15s, border-color 0.15s, color 0.15s",
                          fontSize: 15,
                          marginRight: 6
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#f0f0f0"; e.currentTarget.style.borderColor = "#adb5bd"; e.currentTarget.style.color = "#343a40"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#dee2e6"; e.currentTarget.style.color = "#6c757d"; }}
                      >
                        <i className="bi bi-printer" />
                      </button>
                      <button
                        type="button"
                        title="Phân tích AI"
                        onClick={() => handleAiAnalysis()}
                        style={{
                          flexShrink: 0,
                          width: 36, height: 38,
                          border: "1px solid #6d28d9",
                          borderRadius: 8,
                          background: "#6d28d9",
                          color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          fontSize: 15,
                          boxShadow: "0 4px 6px -1px rgba(109, 40, 217, 0.2)"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#5b21b6"; e.currentTarget.style.borderColor = "#5b21b6"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#6d28d9"; e.currentTarget.style.borderColor = "#6d28d9"; }}
                      >
                        <i className="bi bi-cpu-fill" />
                      </button>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2">

                    {/* Tổng Lợi Nhuận */}
                    <div className="py-2 px-3 rounded-3" style={{
                      backgroundColor: valTotalProfit >= 0 ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
                      border: valTotalProfit >= 0 ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.15)"
                    }}>
                      <label className="fw-extrabold mb-1" style={{
                        fontSize: 11.5,
                        letterSpacing: "0.03em",
                        fontWeight: 800,
                        color: valTotalProfit >= 0 ? "#10b981" : "#ef4444"
                      }}>TỔNG LỢI NHUẬN</label>
                      <h4 className="fw-black mb-0" style={{
                        fontWeight: 900,
                        color: valTotalProfit >= 0 ? "#10b981" : "#ef4444",
                        fontSize: 20
                      }}>
                        {valTotalProfit.toLocaleString("vi-VN")} <span style={{ fontSize: 14, fontWeight: 700 }}>đ</span>
                      </h4>
                    </div>

                    {/* Biên Lợi Nhuận */}
                    <div className="py-2 px-3 rounded-3" style={{
                      backgroundColor: "rgba(59, 130, 246, 0.05)",
                      border: "1px solid rgba(59, 130, 246, 0.15)"
                    }}>
                      <label className="fw-extrabold mb-1" style={{
                        fontSize: 11.5,
                        letterSpacing: "0.03em",
                        fontWeight: 800,
                        color: "#3b82f6"
                      }}>BIÊN LỢI NHUẬN GỐP</label>
                      <h4 className="fw-black mb-0" style={{
                        fontWeight: 900,
                        color: "#3b82f6",
                        fontSize: 20
                      }}>
                        {grossProfitMargin.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 700 }}>%</span>
                      </h4>
                    </div>

                    {/* Biên Lợi Nhuận Hoạt Động */}
                    <div className="py-2 px-3 rounded-3" style={{
                      backgroundColor: "rgba(139, 92, 246, 0.05)",
                      border: "1px solid rgba(139, 92, 246, 0.15)"
                    }}>
                      <label className="fw-extrabold mb-1" style={{
                        fontSize: 11.5,
                        letterSpacing: "0.03em",
                        fontWeight: 800,
                        color: "#8b5cf6"
                      }}>BIÊN LỢI NHUẬN HOẠT ĐỘNG</label>
                      <h4 className="fw-black mb-0" style={{
                        fontWeight: 900,
                        color: "#8b5cf6",
                        fontSize: 20
                      }}>
                        {operatingProfitMargin.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 700 }}>%</span>
                      </h4>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Doanh Thu */}
            <div className="col-12 col-lg-4">
              <div className="card h-100 border rounded-4 overflow-hidden">
                <div className="card-header bg-light border-bottom p-3">
                  <SectionTitle title="Chỉ tiêu Doanh thu" icon="bi-graph-up" className="mb-0" />
                </div>

                <div className="card-body p-3 d-flex flex-column gap-3">
                  {/* Tổng Doanh Thu */}
                  <div className="py-2 px-3 rounded-3" style={{ backgroundColor: "rgba(0, 0, 139, 0.05)", border: "1px solid rgba(0, 0, 139, 0.15)" }}>
                    <label className="fw-extrabold mb-1" style={{ fontSize: 11.5, letterSpacing: "0.03em", fontWeight: 800, color: "darkblue" }}>TỔNG DOANH THU</label>
                    <h4 className="fw-black mb-0" style={{ fontWeight: 900, color: "darkblue", fontSize: 20 }}>
                      {totalRevenue.toLocaleString("vi-VN")} <span style={{ fontSize: 14, fontWeight: 700, color: "darkblue" }}>đ</span>
                    </h4>
                  </div>

                  {/* Doanh thu từ đại lý */}
                  <div>
                    <label className="form-label text-muted fw-semibold mb-1" style={{ fontSize: 12 }}>Doanh thu từ đại lý</label>
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control fw-bold money-input-field"
                        value={formatVNDInput(revenueAgent)}
                        onChange={handleNumericChange(setRevenueAgent)}
                        onKeyDown={handleMoneyKeyDown}
                      />
                      <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                      <span className="input-group-text bg-light text-primary fw-bold" style={{ minWidth: 65, justifyContent: "center" }}>
                        {totalRevenue > 0 ? ((Number(revenueAgent) || 0) / totalRevenue * 100).toFixed(1) : "0.0"}%
                      </span>
                    </div>
                  </div>

                  {/* Doanh thu OEM */}
                  <div>
                    <label className="form-label text-muted fw-semibold mb-1" style={{ fontSize: 12 }}>Doanh thu từ bán lẻ</label>
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control fw-bold money-input-field"
                        value={formatVNDInput(revenueOEM)}
                        onChange={handleNumericChange(setRevenueOEM)}
                        onKeyDown={handleMoneyKeyDown}
                      />
                      <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                      <span className="input-group-text bg-light text-primary fw-bold" style={{ minWidth: 65, justifyContent: "center" }}>
                        {totalRevenue > 0 ? ((Number(revenueOEM) || 0) / totalRevenue * 100).toFixed(1) : "0.0"}%
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Column 3: Chi Phí */}
            <div className="col-12 col-lg-4">
              <div className="card h-100 border rounded-4 overflow-hidden">
                <div className="card-header bg-light border-bottom px-3 d-flex align-items-center justify-content-between" style={{ paddingTop: 10, paddingBottom: 10 }}>
                  <SectionTitle title="Định mức Chi phí" icon="bi-cash-coin" className="mb-0" />
                  <div className="form-check form-switch mb-0 d-flex align-items-center gap-2">
                    <input
                      className="form-check-input ms-0"
                      type="checkbox"
                      role="switch"
                      id="calcByRevenueSwitch"
                      checked={isCalculateByRevenue}
                      onChange={(e) => handleToggleStep1CalcByRev(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label className="form-check-label fw-semibold text-dark mb-0" htmlFor="calcByRevenueSwitch" style={{ fontSize: 12, cursor: "pointer" }}>
                      Tính theo doanh thu
                    </label>
                  </div>
                </div>

                <div className="card-body p-3 d-flex flex-column gap-1">
                  {/* Định Mức Tổng Chi Phí */}
                  <div className="py-2 px-3 rounded-3 bg-danger-subtle/30 border border-danger/20">
                    <label className="text-danger fw-extrabold mb-1" style={{ fontSize: 11.5, letterSpacing: "0.03em", fontWeight: 800 }}>ĐỊNH MỨC TỔNG CHI PHÍ</label>
                    <h4 className="fw-black text-danger mb-0" style={{ fontWeight: 900, fontSize: 20 }}>
                      {totalCost.toLocaleString("vi-VN")} <span style={{ fontSize: 14, fontWeight: 700 }}>đ</span>
                    </h4>
                  </div>

                  <div className="row g-2">
                    {/* Khấu trừ doanh thu */}
                    <div className="col-6">
                      <label className="form-label text-muted fw-semibold mb-0" style={{ fontSize: 12, marginBottom: 1 }}>Khấu trừ doanh thu</label>
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control fw-bold percent-input-field"
                          value={revenueDeductionPercent}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, "");
                            setRevenueDeductionPercent(raw);
                          }}
                          onKeyDown={handlePercentKeyDown}
                        />
                        <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>%</span>
                      </div>
                    </div>

                    {/* Giá bán hàng */}
                    <div className="col-6">
                      <label className="form-label text-muted fw-semibold mb-0" style={{ fontSize: 12, marginBottom: 1 }}>Giá bán hàng</label>
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control fw-bold percent-input-field"
                          value={cogsPercent}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, "");
                            setCogsPercent(raw);
                          }}
                          onKeyDown={handlePercentKeyDown}
                        />
                        <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>%</span>
                      </div>
                    </div>
                  </div>

                  {/* Công tác kinh doanh */}
                  <div>
                    <label className="form-label text-muted fw-semibold mb-0" style={{ fontSize: 12, marginBottom: 1 }}>Công tác kinh doanh</label>
                    <div className="input-group input-group-sm">
                      {isCalculateByRevenue ? (
                        <>
                          {/* % DT ở đầu */}
                          <input
                            type="text"
                            className="form-control fw-bold text-danger text-center percent-input-field"
                            style={{ maxWidth: 50 }}
                            value={costSalesPercent}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, "");
                              setCostSalesPercent(raw);
                            }}
                            onKeyDown={handlePercentKeyDown}
                            placeholder="0.0"
                          />
                          <span className="input-group-text bg-light text-danger fw-bold" style={{ fontSize: 10, paddingLeft: 6, paddingRight: 4, minWidth: 75, justifyContent: "flex-start" }}>% doanh thu</span>

                          {/* Ô giá trị chi phí bị khóa */}
                          <input
                            type="text"
                            className="form-control fw-bold"
                            value={formatVNDInput(finalCostSales.toString())}
                            disabled
                          />
                          <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            className="form-control fw-bold money-input-field"
                            value={formatVNDInput(costSales)}
                            onChange={handleNumericChange(setCostSales)}
                            onKeyDown={handleMoneyKeyDown}
                          />
                          <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Kế toán và nhân sự */}
                  <div>
                    <label className="form-label text-muted fw-semibold mb-0" style={{ fontSize: 12, marginBottom: 1 }}>Kế toán và nhân sự</label>
                    <div className="input-group input-group-sm">
                      {isCalculateByRevenue ? (
                        <>
                          {/* % DT ở đầu */}
                          <input
                            type="text"
                            className="form-control fw-bold text-danger text-center percent-input-field"
                            style={{ maxWidth: 50 }}
                            value={costFinanceHRPercent}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, "");
                              setCostFinanceHRPercent(raw);
                            }}
                            onKeyDown={handlePercentKeyDown}
                            placeholder="0.0"
                          />
                          <span className="input-group-text bg-light text-danger fw-bold" style={{ fontSize: 10, paddingLeft: 6, paddingRight: 4, minWidth: 75, justifyContent: "flex-start" }}>% doanh thu</span>

                          {/* Ô giá trị chi phí bị khóa */}
                          <input
                            type="text"
                            className="form-control fw-bold"
                            value={formatVNDInput(finalCostFinanceHR.toString())}
                            disabled
                          />
                          <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            className="form-control fw-bold money-input-field"
                            value={formatVNDInput(costFinanceHR)}
                            onChange={handleNumericChange(setCostFinanceHR)}
                            onKeyDown={handleMoneyKeyDown}
                          />
                          <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Kho vận */}
                  <div>
                    <label className="form-label text-muted fw-semibold mb-0" style={{ fontSize: 12, marginBottom: 1 }}>Kho vận</label>
                    <div className="input-group input-group-sm">
                      {isCalculateByRevenue ? (
                        <>
                          {/* % DT ở đầu */}
                          <input
                            type="text"
                            className="form-control fw-bold text-danger text-center percent-input-field"
                            style={{ maxWidth: 50 }}
                            value={costLogisticsPercent}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, "");
                              setCostLogisticsPercent(raw);
                            }}
                            onKeyDown={handlePercentKeyDown}
                            placeholder="0.0"
                          />
                          <span className="input-group-text bg-light text-danger fw-bold" style={{ fontSize: 10, paddingLeft: 6, paddingRight: 4, minWidth: 75, justifyContent: "flex-start" }}>% doanh thu</span>

                          {/* Ô giá trị chi phí bị khóa */}
                          <input
                            type="text"
                            className="form-control fw-bold"
                            value={formatVNDInput(finalCostLogistics.toString())}
                            disabled
                          />
                          <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            className="form-control fw-bold money-input-field"
                            value={formatVNDInput(costLogistics)}
                            onChange={handleNumericChange(setCostLogistics)}
                            onKeyDown={handleMoneyKeyDown}
                          />
                          <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sản xuất */}
                  <div>
                    <label className="form-label text-muted fw-semibold mb-0" style={{ fontSize: 12, marginBottom: 1 }}>Sản xuất</label>
                    <div className="input-group input-group-sm">
                      {isCalculateByRevenue ? (
                        <>
                          {/* % DT ở đầu */}
                          <input
                            type="text"
                            className="form-control fw-bold text-danger text-center percent-input-field"
                            style={{ maxWidth: 50 }}
                            value={costMarketingPercent}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, "");
                              setCostMarketingPercent(raw);
                            }}
                            onKeyDown={handlePercentKeyDown}
                            placeholder="0.0"
                          />
                          <span className="input-group-text bg-light text-danger fw-bold" style={{ fontSize: 10, paddingLeft: 6, paddingRight: 4, minWidth: 75, justifyContent: "flex-start" }}>% doanh thu</span>

                          {/* Ô giá trị chi phí bị khóa */}
                          <input
                            type="text"
                            className="form-control fw-bold"
                            value={formatVNDInput(finalCostMarketing.toString())}
                            disabled
                          />
                          <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            className="form-control fw-bold money-input-field"
                            value={formatVNDInput(costMarketing)}
                            onChange={handleNumericChange(setCostMarketing)}
                            onKeyDown={handleMoneyKeyDown}
                          />
                          <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Vận hành hệ thống */}
                  <div>
                    <label className="form-label text-muted fw-semibold mb-0" style={{ fontSize: 12, marginBottom: 1 }}>Vận hành hệ thống</label>
                    <div className="input-group input-group-sm">
                      {isCalculateByRevenue ? (
                        <>
                          {/* % DT ở đầu */}
                          <input
                            type="text"
                            className="form-control fw-bold text-danger text-center percent-input-field"
                            style={{ maxWidth: 50 }}
                            value={costOperationsPercent}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, "");
                              setCostOperationsPercent(raw);
                            }}
                            onKeyDown={handlePercentKeyDown}
                            placeholder="0.0"
                          />
                          <span className="input-group-text bg-light text-danger fw-bold" style={{ fontSize: 10, paddingLeft: 6, paddingRight: 4, minWidth: 75, justifyContent: "flex-start" }}>% doanh thu</span>

                          {/* Ô giá trị chi phí bị khóa */}
                          <input
                            type="text"
                            className="form-control fw-bold"
                            value={formatVNDInput(finalCostOperations.toString())}
                            disabled
                          />
                          <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            className="form-control fw-bold money-input-field"
                            value={formatVNDInput(costOperations)}
                            onChange={handleNumericChange(setCostOperations)}
                            onKeyDown={handleMoneyKeyDown}
                          />
                          <span className="input-group-text fw-semibold" style={{ minWidth: 32, justifyContent: "center" }}>đ</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Space padding */}
                  <div className="pb-1" />

                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        currentStep === 2 ? (
          /* STEP 2: CHI PHÍ */
          (() => {
            const calcGroupTotal = (arr: CustomCostItem[]) => {
              return arr.reduce((sum, item) => {
                const val = s2_calcByRev
                  ? Math.round(totalRevenue * (Number(item.pctVal) || 0) / 100)
                  : (Number(item.val) || 0);
                return sum + val;
              }, 0);
            };

            const grpBiz = calcGroupTotal(bizCosts);
            const grpMkt = calcGroupTotal(mktCosts);
            const grpFinCost = calcGroupTotal(finCosts);
            const grpLogCost = calcGroupTotal(logCosts);
            const grpOps = calcGroupTotal(opsCosts);
            const grpMisc = calcGroupTotal(miscCosts);
            const totalStep2 = grpBiz + grpMkt + grpFinCost + grpLogCost + grpOps + grpMisc;

            const hasCheckedCosts = [
              ...bizCosts,
              ...mktCosts,
              ...finCosts,
              ...logCosts,
              ...opsCosts,
              ...miscCosts
            ].some(item => item.checked);

            const handleDeleteCheckedCosts = () => {
              setCostConfirmOpen(true);
            };

            const pct = (v: number) => totalStep2 > 0 ? (v / totalStep2 * 100).toFixed(1) : "0.0";
            const pctRev = (v: number) => totalRevenue > 0 ? (v / totalRevenue * 100).toFixed(1) : "0.0";
            const fmt = (v: string) => { if (!v) return ""; return Number(v).toLocaleString("vi-VN"); };
            const fmtNum = (n: number) => n.toLocaleString("vi-VN");
            const numChg = (set: React.Dispatch<React.SetStateAction<string>>) =>
              (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/\D/g, ""));
            const pctChg = (set: React.Dispatch<React.SetStateAction<string>>) =>
              (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/[^0-9.]/g, ""));

            // Hàm thêm khoản mục chi phí động
            const handleAddCostItem = (
              setCostList: React.Dispatch<React.SetStateAction<CustomCostItem[]>>,
              prefix: string
            ) => {
              triggerAddCostItem(setCostList, prefix);
            };

            // Row renderer: hiển thị checkbox ở đầu và các ô nhập liệu
            const renderCostRow = (
              item: CustomCostItem,
              setCostList: React.Dispatch<React.SetStateAction<CustomCostItem[]>>
            ) => {
              const toggleChecked = () => {
                setCostList(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i));
              };

              const updateVal = (newVal: string) => {
                setCostList(prev => prev.map(i => i.id === item.id ? { ...i, val: newVal } : i));
              };

              const updatePct = (newPct: string) => {
                setCostList(prev => prev.map(i => i.id === item.id ? { ...i, pctVal: newPct } : i));
              };

              const finalVal = s2_calcByRev
                ? Math.round(totalRevenue * (Number(item.pctVal) || 0) / 100)
                : (Number(item.val) || 0);

              const displayVal = finalVal;

              return (
                <div key={item.id} className="d-flex align-items-center gap-2 mb-1 ps-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={item.checked}
                    onChange={toggleChecked}
                    style={{ cursor: "pointer", width: 14, height: 14, flexShrink: 0 }}
                  />
                  <span className="text-muted flex-grow-1" style={{ fontSize: 12 }}>
                    {item.label}
                  </span>
                  <div className="input-group input-group-sm" style={{ maxWidth: s2_calcByRev ? 280 : 210 }}>
                    {s2_calcByRev && (
                      <>
                        <input
                          type="text"
                          className="form-control fw-bold text-danger text-center percent-input-field"
                          style={{ maxWidth: 50 }}
                          value={item.pctVal}
                          onChange={(e) => updatePct(e.target.value.replace(/[^0-9.]/g, ""))}
                          onKeyDown={handlePercentKeyDown}
                          placeholder="0.0"
                        />
                        <span
                          className="input-group-text bg-light text-danger fw-bold"
                          style={{ fontSize: 10, paddingLeft: 6, paddingRight: 4, minWidth: 75, justifyContent: "flex-start" }}
                        >% doanh thu</span>
                        <input
                          type="text"
                          className="form-control fw-bold text-end"
                          value={displayVal.toLocaleString("vi-VN")}
                          disabled
                        />
                      </>
                    )}
                    {!s2_calcByRev && (
                      <input
                        type="text"
                        className="form-control fw-bold text-end money-input-field"
                        value={Number(item.val).toLocaleString("vi-VN")}
                        onChange={(e) => updateVal(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={handleMoneyKeyDown}
                      />
                    )}
                    <span className="input-group-text" style={{ fontSize: 11 }}>đ</span>
                  </div>
                </div>
              );
            };

            const groups = [
              { label: "Công tác kinh doanh", color: "#3b82f6", total: grpBiz },
              { label: "Kế toán và nhân sự", color: "#10b981", total: grpFinCost },
              { label: "Kho vận", color: "#6366f1", total: grpLogCost },
              { label: "Sản xuất", color: "#8b5cf6", total: grpMkt },
              { label: "Vận hành hệ thống", color: "#f59e0b", total: grpOps },
              { label: "Khác", color: "#ef4444", total: grpMisc },
            ];

            return (
              <div className="container-fluid px-3 pb-3">
                <style>{`
                  @keyframes blinkRedDot {
                    0% { opacity: 0.3; transform: scale(0.95); }
                    50% { opacity: 1; transform: scale(1.15); box-shadow: 0 0 8px #ef4444; }
                    100% { opacity: 0.3; transform: scale(0.95); }
                  }
                  .blinking-red-dot {
                    width: 9px;
                    height: 9px;
                    background-color: #ef4444;
                    border-radius: 50%;
                    display: inline-block;
                    animation: blinkRedDot 1.4s infinite ease-in-out;
                  }
                `}</style>
                <div className="d-flex" style={{ gap: 0, flexDirection: isMobileOrTablet ? "column" : "row", height: isMobileOrTablet ? "auto" : 530 }}>

                  {/* LEFT – 7 phần */}
                  <div className="d-flex flex-column" style={{ flex: isMobileOrTablet ? "none" : 7, paddingRight: isMobileOrTablet ? 0 : 20, height: isMobileOrTablet ? "auto" : "100%" }}>
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-shrink-0">
                      <div className="d-flex align-items-center gap-3">
                        <SectionTitle title="Chi tiết định mức chi phí" icon="bi-list-ul" className="mb-0" />
                        <button
                          type="button"
                          title="Lưu kế hoạch"
                          className="ms-2"
                          onClick={handleSavePlan}
                          style={{
                            flexShrink: 0,
                            width: 36, height: 36,
                            border: "1px solid #dee2e6",
                            borderRadius: 8,
                            background: "#fff",
                            color: "#0d6efd",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            transition: "background 0.15s, border-color 0.15s",
                            fontSize: 15,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#e7f1ff"; e.currentTarget.style.borderColor = "#0d6efd"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#dee2e6"; }}
                        >
                          <i className="bi bi-floppy" />
                        </button>
                        {hasCheckedCosts && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm d-flex align-items-center gap-1 py-1"
                            onClick={handleDeleteCheckedCosts}
                            style={{ fontSize: 12, borderRadius: 6 }}
                          >
                            <i className="bi bi-trash"></i> Xoá đã chọn
                          </button>
                        )}
                      </div>
                      <div className="form-check form-switch mb-0 d-flex align-items-center gap-2">
                        <input
                          className="form-check-input ms-0"
                          type="checkbox"
                          role="switch"
                          id="s2CalcByRevenueSwitch"
                          checked={s2_calcByRev}
                          onChange={(e) => handleToggleStep2CalcByRev(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        <label className="form-check-label fw-semibold text-dark mb-0" htmlFor="s2CalcByRevenueSwitch" style={{ fontSize: 12.5, cursor: "pointer" }}>
                          Tính theo doanh thu
                        </label>
                      </div>
                    </div>

                    {/* Cost Sections */}
                    <div className="d-flex flex-column gap-4" style={{ flexGrow: 1, overflowY: "auto", paddingRight: 5 }}>
                      {/* Công tác kinh doanh */}
                      <div>
                        <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                          <div className="fw-bold text-primary d-flex align-items-center gap-2 text-uppercase" style={{ fontSize: 13.5 }}>
                            <i className="bi bi-briefcase"></i> Công tác kinh doanh
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            {grpBiz > finalCostSales && (
                              <span className="blinking-red-dot" title="Vượt định mức chi phí" />
                            )}
                            <span className="badge fw-bold" style={{ fontSize: 11, color: grpBiz > finalCostSales ? "#ef4444" : "#3b82f6", background: grpBiz > finalCostSales ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)" }}>
                              Tổng: {grpBiz.toLocaleString("vi-VN")} đ / Định mức: {finalCostSales.toLocaleString("vi-VN")} đ
                            </span>
                          </div>
                        </div>
                        <div className="d-flex flex-column gap-1">
                          {bizCosts.map(item => renderCostRow(item, setBizCosts))}
                        </div>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-primary text-decoration-none d-flex align-items-center gap-1 mt-2 ps-3"
                          onClick={() => handleAddCostItem(setBizCosts, "biz")}
                          style={{ fontSize: 12, fontWeight: 600 }}
                        >
                          <i className="bi bi-plus-circle"></i> Thêm khoản mục
                        </button>
                      </div>

                      {/* Kế toán và nhân sự */}
                      <div>
                        <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                          <div className="fw-bold d-flex align-items-center gap-2 text-uppercase" style={{ fontSize: 13.5, color: "#10b981" }}>
                            <i className="bi bi-person-workspace"></i> Kế toán và nhân sự
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            {grpFinCost > finalCostFinanceHR && (
                              <span className="blinking-red-dot" title="Vượt định mức chi phí" />
                            )}
                            <span className="badge fw-bold" style={{ fontSize: 11, color: grpFinCost > finalCostFinanceHR ? "#ef4444" : "#10b981", background: grpFinCost > finalCostFinanceHR ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)" }}>
                              Tổng: {grpFinCost.toLocaleString("vi-VN")} đ / Định mức: {finalCostFinanceHR.toLocaleString("vi-VN")} đ
                            </span>
                          </div>
                        </div>
                        <div className="d-flex flex-column gap-1">
                          {finCosts.map(item => renderCostRow(item, setFinCosts))}
                        </div>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-decoration-none d-flex align-items-center gap-1 mt-2 ps-3"
                          onClick={() => handleAddCostItem(setFinCosts, "fin")}
                          style={{ fontSize: 12, fontWeight: 600, color: "#10b981" }}
                        >
                          <i className="bi bi-plus-circle"></i> Thêm khoản mục
                        </button>
                      </div>

                      {/* Kho vận */}
                      <div>
                        <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                          <div className="fw-bold d-flex align-items-center gap-2 text-uppercase" style={{ fontSize: 13.5, color: "#6366f1" }}>
                            <i className="bi bi-box-seam"></i> Kho vận
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            {grpLogCost > finalCostLogistics && (
                              <span className="blinking-red-dot" title="Vượt định mức chi phí" />
                            )}
                            <span className="badge fw-bold" style={{ fontSize: 11, color: grpLogCost > finalCostLogistics ? "#ef4444" : "#6366f1", background: grpLogCost > finalCostLogistics ? "rgba(239, 68, 68, 0.1)" : "rgba(99, 102, 241, 0.1)" }}>
                              Tổng: {grpLogCost.toLocaleString("vi-VN")} đ / Định mức: {finalCostLogistics.toLocaleString("vi-VN")} đ
                            </span>
                          </div>
                        </div>
                        <div className="d-flex flex-column gap-1">
                          {logCosts.map(item => renderCostRow(item, setLogCosts))}
                        </div>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-decoration-none d-flex align-items-center gap-1 mt-2 ps-3"
                          onClick={() => handleAddCostItem(setLogCosts, "log")}
                          style={{ fontSize: 12, fontWeight: 600, color: "#6366f1" }}
                        >
                          <i className="bi bi-plus-circle"></i> Thêm khoản mục
                        </button>
                      </div>

                      {/* Sản xuất */}
                      <div>
                        <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                          <div className="fw-bold d-flex align-items-center gap-2 text-uppercase" style={{ fontSize: 13.5, color: "#8b5cf6" }}>
                            <i className="bi bi-megaphone"></i> Sản xuất
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            {grpMkt > finalCostMarketing && (
                              <span className="blinking-red-dot" title="Vượt định mức chi phí" />
                            )}
                            <span className="badge fw-bold" style={{ fontSize: 11, color: grpMkt > finalCostMarketing ? "#ef4444" : "#8b5cf6", background: grpMkt > finalCostMarketing ? "rgba(239, 68, 68, 0.1)" : "rgba(139, 92, 246, 0.1)" }}>
                              Tổng: {grpMkt.toLocaleString("vi-VN")} đ / Định mức: {finalCostMarketing.toLocaleString("vi-VN")} đ
                            </span>
                          </div>
                        </div>
                        <div className="d-flex flex-column gap-1">
                          {mktCosts.map(item => renderCostRow(item, setMktCosts))}
                        </div>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-decoration-none d-flex align-items-center gap-1 mt-2 ps-3"
                          onClick={() => handleAddCostItem(setMktCosts, "mkt")}
                          style={{ fontSize: 12, fontWeight: 600, color: "#8b5cf6" }}
                        >
                          <i className="bi bi-plus-circle"></i> Thêm khoản mục
                        </button>
                      </div>

                      {/* Vận hành hệ thống */}
                      <div>
                        <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                          <div className="fw-bold d-flex align-items-center gap-2 text-uppercase" style={{ fontSize: 13.5, color: "#f59e0b" }}>
                            <i className="bi bi-gear"></i> Vận hành hệ thống
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            {grpOps > finalCostOperations && (
                              <span className="blinking-red-dot" title="Vượt định mức chi phí" />
                            )}
                            <span className="badge fw-bold" style={{ fontSize: 11, color: grpOps > finalCostOperations ? "#ef4444" : "#f59e0b", background: grpOps > finalCostOperations ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)" }}>
                              Tổng: {grpOps.toLocaleString("vi-VN")} đ / Định mức: {finalCostOperations.toLocaleString("vi-VN")} đ
                            </span>
                          </div>
                        </div>
                        <div className="d-flex flex-column gap-1">
                          {opsCosts.map(item => renderCostRow(item, setOpsCosts))}
                        </div>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-decoration-none d-flex align-items-center gap-1 mt-2 ps-3"
                          onClick={() => handleAddCostItem(setOpsCosts, "ops")}
                          style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b" }}
                        >
                          <i className="bi bi-plus-circle"></i> Thêm khoản mục
                        </button>
                      </div>

                      {/* Chi phí Khác */}
                      <div>
                        <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                          <div className="fw-bold d-flex align-items-center gap-2" style={{ fontSize: 13.5, color: "#ef4444" }}>
                            <i className="bi bi-info-circle"></i> Chi phí Khác
                          </div>
                          <span className="badge fw-bold" style={{ fontSize: 11, color: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}>
                            Tổng: {grpMisc.toLocaleString("vi-VN")} đ
                          </span>
                        </div>
                        <div className="d-flex flex-column gap-1">
                          {miscCosts.map(item => renderCostRow(item, setMiscCosts))}
                        </div>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-decoration-none d-flex align-items-center gap-1 mt-2 ps-3"
                          onClick={() => handleAddCostItem(setMiscCosts, "misc")}
                          style={{ fontSize: 12, fontWeight: 600, color: "#ef4444" }}
                        >
                          <i className="bi bi-plus-circle"></i> Thêm khoản mục
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* VERTICAL DIVIDER */}
                  {!isMobileOrTablet && <div style={{ width: 1, background: "#dee2e6", flexShrink: 0, margin: "0 4px" }} />}

                  {/* RIGHT – 5 phần */}
                  <div style={{ flex: isMobileOrTablet ? "none" : 5, paddingLeft: isMobileOrTablet ? 0 : 20, height: isMobileOrTablet ? "auto" : "100%", overflow: isMobileOrTablet ? "visible" : "hidden", marginTop: isMobileOrTablet ? 30 : 0 }}>
                    <SectionTitle title="Tổng quan chi phí" icon="bi-pie-chart" className="mb-3" />

                    <div className="p-3 rounded-3 mb-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                      <div className="text-danger fw-bold mb-1" style={{ fontSize: 11, letterSpacing: "0.04em" }}>TỔNG CHI PHÍ</div>
                      <div style={{ fontSize: 22, color: "#ef4444", fontWeight: 900 }}>{totalStep2.toLocaleString("vi-VN")} <span style={{ fontSize: 14, fontWeight: 700 }}>đ</span></div>
                      <div className="text-muted mt-1" style={{ fontSize: 11, lineHeight: "1.4" }}>
                        Tổng các chi phí chi tiết hiện chiếm <strong className="text-dark">{totalCost > 0 ? (totalStep2 / totalCost * 100).toFixed(1) : "0.0"}%</strong> định mức chi phí năm và chiếm <strong className="text-dark">{totalRevenue > 0 ? (totalStep2 / totalRevenue * 100).toFixed(1) : "0.0"}%</strong> tổng doanh thu năm
                      </div>
                    </div>

                    <div className="mb-2" style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.04em" }}>PHÂN BỔ THEO PHÒNG BAN</div>
                    <div className="d-flex flex-column gap-2">
                      {groups.map(g => (
                        <div key={g.label}>
                          <div className="d-flex justify-content-between mb-1">
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{g.label}</span>
                            <span style={{ fontSize: 12, color: g.color, fontWeight: 700 }}>{pct(g.total)}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 4, background: "#f1f5f9" }}>
                            <div style={{ height: "100%", borderRadius: 4, background: g.color, width: `${pct(g.total)}%`, transition: "width 0.4s" }} />
                          </div>
                          <div className="text-muted mt-1" style={{ fontSize: 10 }}>{g.total.toLocaleString("vi-VN")} đ &nbsp;·&nbsp; {pctRev(g.total)}% tổng doanh thu năm</div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            );
          })()
        ) : currentStep === 3 ? (
          /* STEP 3: NHÂN SỰ */
          (() => {
            const handleAddStaffItem = (
              setStaffList: React.Dispatch<React.SetStateAction<CustomStaffItem[]>>,
              prefix: string
            ) => {
              triggerAddStaffItem(setStaffList, prefix);
            };

            const hasCheckedStaff = [
              ...bizStaff,
              ...mktStaff,
              ...logStaff,
              ...finStaff
            ].some(item => item.checked);

            const handleDeleteCheckedStaff = () => {
              setStaffConfirmOpen(true);
            };

            const pct = (v: number) => totalStep3 > 0 ? (v / totalStep3 * 100).toFixed(1) : "0.0";
            const pctTarget = (v: number) => totalStaff > 0 ? (v / totalStaff * 100).toFixed(1) : "0.0";
            const pctRev = (fund: number) => totalRevenue > 0 ? (fund / totalRevenue * 100).toFixed(1) : "0.0";

            const renderStaffRow = (
              item: CustomStaffItem,
              setStaffList: React.Dispatch<React.SetStateAction<CustomStaffItem[]>>
            ) => {
              const toggleChecked = () => {
                setStaffList(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i));
              };

              const updateQty = (newQty: string) => {
                setStaffList(prev => prev.map(i => i.id === item.id ? { ...i, qty: newQty } : i));
              };

              const updateSalary = (newSalary: string) => {
                setStaffList(prev => prev.map(i => i.id === item.id ? { ...i, salary: newSalary } : i));
              };

              return (
                <div key={item.id} className="d-flex align-items-center gap-2 mb-1 ps-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={item.checked}
                    onChange={toggleChecked}
                    style={{ cursor: "pointer", width: 14, height: 14, flexShrink: 0 }}
                  />
                  <span className="text-muted flex-grow-1" style={{ fontSize: 12 }}>
                    {item.label}
                  </span>
                  <div className="input-group input-group-sm" style={{ maxWidth: 210 }}>
                    <input
                      type="text"
                      className="form-control text-end fw-semibold text-primary money-input-field"
                      value={formatVNDInput(item.salary)}
                      onChange={(e) => updateSalary(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={handleMoneyKeyDown}
                      placeholder="Thu nhập"
                    />
                    <input
                      type="text"
                      className="form-control text-center fw-bold text-dark"
                      style={{ maxWidth: 55 }}
                      value={item.qty}
                      onChange={(e) => updateQty(e.target.value.replace(/\D/g, ""))}
                    />
                    <span className="input-group-text text-muted" style={{ fontSize: 11, fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif" }}>người</span>
                  </div>
                </div>
              );
            };

            const groups = [
              { label: "Công tác kinh doanh", color: "#3b82f6", total: grpBiz },
              { label: "Kế toán và nhân sự", color: "#6c757d", total: grpFin },
              { label: "Kho vận", color: "#f59e0b", total: grpLog },
              { label: "Sản xuất", color: "#8b5cf6", total: grpMkt },
            ];

            return (
              <div className="container-fluid px-3 pb-3">
                <div className="d-flex" style={{ gap: 0, flexDirection: isMobileOrTablet ? "column" : "row", height: isMobileOrTablet ? "auto" : 530 }}>

                  {/* LEFT – 7 phần */}
                  <div className="d-flex flex-column" style={{ flex: isMobileOrTablet ? "none" : 7, paddingRight: isMobileOrTablet ? 0 : 20, height: isMobileOrTablet ? "auto" : "100%" }}>
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-shrink-0">
                      <div className="d-flex align-items-center gap-3">
                        <SectionTitle title="Chi tiết định biên nhân sự" icon="bi-people" className="mb-0" />
                        <button
                          type="button"
                          title="Lưu kế hoạch"
                          className="ms-2"
                          onClick={handleSavePlan}
                          style={{
                            flexShrink: 0,
                            width: 36, height: 36,
                            border: "1px solid #dee2e6",
                            borderRadius: 8,
                            background: "#fff",
                            color: "#0d6efd",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            transition: "background 0.15s, border-color 0.15s",
                            fontSize: 15,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#e7f1ff"; e.currentTarget.style.borderColor = "#0d6efd"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#dee2e6"; }}
                        >
                          <i className="bi bi-floppy"></i>
                        </button>
                      </div>
                      {hasCheckedStaff && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm d-flex align-items-center gap-1 py-1 animate__animated animate__fadeIn"
                          onClick={handleDeleteCheckedStaff}
                          style={{ fontSize: 12, borderRadius: 6 }}
                        >
                          <i className="bi bi-trash"></i> Xoá đã chọn
                        </button>
                      )}
                    </div>

                    {/* Scrollable list container */}
                    <div style={{ flexGrow: 1, overflowY: "auto", paddingRight: 5 }}>
                      {/* Nhóm 1: Công tác kinh doanh */}
                      <div className="mb-2">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: "#3b82f6", flexShrink: 0 }} />
                          <span className="fw-bold text-primary" style={{ fontSize: 12 }}>CÔNG TÁC KINH DOANH</span>
                          <span className="ms-auto fw-bold text-primary" style={{ fontSize: 12 }}>{grpBiz.toLocaleString("vi-VN")} người | {fundBiz.toLocaleString("vi-VN")} đồng</span>
                        </div>
                        <div className="text-muted mb-2 ps-3" style={{ fontSize: 11, lineHeight: "1.4" }}>
                          Tổng nhân sự <strong>{grpBiz}</strong> người, chiếm <strong>{pct(grpBiz)}%</strong> tổng số nhân viên. Quỹ lương <strong>{fundBiz.toLocaleString("vi-VN")}</strong> đồng, chiếm <strong>{limitBiz > 0 ? (fundBiz / limitBiz * 100).toFixed(1) : "0.0"}%</strong> so với định mức chi phí lương của phòng và chiếm <strong>{pctRev(fundBiz)}%</strong> tổng doanh thu
                        </div>
                        {bizStaff.map(item => renderStaffRow(item, setBizStaff))}
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-decoration-none d-flex align-items-center gap-1 mt-2 ps-3"
                          onClick={() => handleAddStaffItem(setBizStaff, "biz")}
                          style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6" }}
                        >
                          <i className="bi bi-plus-circle"></i> Thêm định biên
                        </button>
                      </div>

                      {/* Nhóm 2: Kế toán và nhân sự */}
                      <div className="mb-2">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: "#6c757d", flexShrink: 0 }} />
                          <span className="fw-bold" style={{ fontSize: 12, color: "#6c757d" }}>KẾ TOÁN VÀ NHÂN SỰ</span>
                          <span className="ms-auto fw-bold" style={{ fontSize: 12, color: "#6c757d" }}>{grpFin.toLocaleString("vi-VN")} người | {fundFin.toLocaleString("vi-VN")} đồng</span>
                        </div>
                        <div className="text-muted mb-2 ps-3" style={{ fontSize: 11, lineHeight: "1.4" }}>
                          Tổng nhân sự <strong>{grpFin}</strong> người, chiếm <strong>{pct(grpFin)}%</strong> tổng số nhân viên. Quỹ lương <strong>{fundFin.toLocaleString("vi-VN")}</strong> đồng, chiếm <strong>{limitFin > 0 ? (fundFin / limitFin * 100).toFixed(1) : "0.0"}%</strong> so với định mức chi phí lương của phòng và chiếm <strong>{pctRev(fundFin)}%</strong> tổng doanh thu
                        </div>
                        {finStaff.map(item => renderStaffRow(item, setFinStaff))}
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-decoration-none d-flex align-items-center gap-1 mt-2 ps-3"
                          onClick={() => handleAddStaffItem(setFinStaff, "fin")}
                          style={{ fontSize: 12, fontWeight: 600, color: "#6c757d" }}
                        >
                          <i className="bi bi-plus-circle"></i> Thêm định biên
                        </button>
                      </div>

                      {/* Nhóm 3: Kho vận */}
                      <div className="mb-2">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: "#f59e0b", flexShrink: 0 }} />
                          <span className="fw-bold" style={{ fontSize: 12, color: "#f59e0b" }}>KHO VẬN</span>
                          <span className="ms-auto fw-bold" style={{ fontSize: 12, color: "#f59e0b" }}>{grpLog.toLocaleString("vi-VN")} người | {fundLog.toLocaleString("vi-VN")} đồng</span>
                        </div>
                        <div className="text-muted mb-2 ps-3" style={{ fontSize: 11, lineHeight: "1.4" }}>
                          Tổng nhân sự <strong>{grpLog}</strong> người, chiếm <strong>{pct(grpLog)}%</strong> tổng số nhân viên. Quỹ lương <strong>{fundLog.toLocaleString("vi-VN")}</strong> đồng, chiếm <strong>{limitLog > 0 ? (fundLog / limitLog * 100).toFixed(1) : "0.0"}%</strong> so với định mức chi phí lương của phòng và chiếm <strong>{pctRev(fundLog)}%</strong> tổng doanh thu
                        </div>
                        {logStaff.map(item => renderStaffRow(item, setLogStaff))}
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-decoration-none d-flex align-items-center gap-1 mt-2 ps-3"
                          onClick={() => handleAddStaffItem(setLogStaff, "log")}
                          style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b" }}
                        >
                          <i className="bi bi-plus-circle"></i> Thêm định biên
                        </button>
                      </div>

                      {/* Nhóm 4: Sản xuất */}
                      <div className="mb-2">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: "#8b5cf6", flexShrink: 0 }} />
                          <span className="fw-bold" style={{ fontSize: 12, color: "#8b5cf6" }}>SẢN XUẤT</span>
                          <span className="ms-auto fw-bold" style={{ fontSize: 12, color: "#8b5cf6" }}>{grpMkt.toLocaleString("vi-VN")} người | {fundMkt.toLocaleString("vi-VN")} đồng</span>
                        </div>
                        <div className="text-muted mb-2 ps-3" style={{ fontSize: 11, lineHeight: "1.4" }}>
                          Tổng nhân sự <strong>{grpMkt}</strong> người, chiếm <strong>{pct(grpMkt)}%</strong> tổng số nhân viên. Quỹ lương <strong>{fundMkt.toLocaleString("vi-VN")}</strong> đồng, chiếm <strong>{limitMkt > 0 ? (fundMkt / limitMkt * 100).toFixed(1) : "0.0"}%</strong> so với định mức chi phí lương của phòng và chiếm <strong>{pctRev(fundMkt)}%</strong> tổng doanh thu
                        </div>
                        {mktStaff.map(item => renderStaffRow(item, setMktStaff))}
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-decoration-none d-flex align-items-center gap-1 mt-2 ps-3"
                          onClick={() => handleAddStaffItem(setMktStaff, "mkt")}
                          style={{ fontSize: 12, fontWeight: 600, color: "#8b5cf6" }}
                        >
                          <i className="bi bi-plus-circle"></i> Thêm định biên
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* VERTICAL DIVIDER */}
                  {!isMobileOrTablet && <div style={{ width: 1, background: "#dee2e6", flexShrink: 0, margin: "0 4px" }} />}

                  {/* RIGHT – 5 phần */}
                  <div style={{ flex: isMobileOrTablet ? "none" : 5, paddingLeft: isMobileOrTablet ? 0 : 20, height: isMobileOrTablet ? "auto" : "100%", overflow: isMobileOrTablet ? "visible" : "hidden", marginTop: isMobileOrTablet ? 30 : 0 }}>
                    <SectionTitle title="Tổng quan nhân sự" icon="bi-pie-chart" className="mb-3" />

                    <div className="p-3 rounded-3 mb-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
                      <div className="text-primary fw-bold mb-1" style={{ fontSize: 11, letterSpacing: "0.04em" }}>TỔNG QUỸ LƯƠNG</div>
                      <div style={{ fontSize: 22, color: "#3b82f6", fontWeight: 900 }}>{grandTotalFund.toLocaleString("vi-VN")} <span style={{ fontSize: 14, fontWeight: 700 }}>đ</span></div>
                      <div className="text-muted mt-1" style={{ fontSize: 11, lineHeight: "1.4" }}>
                        Tổng quỹ lương năm <strong>{year}</strong> là <strong>{grandTotalFund.toLocaleString("vi-VN")}</strong> đồng cho <strong>{totalStep3}</strong> nhân viên toàn hệ thống, đạt <strong>{grandTotalLimit > 0 ? (grandTotalFund / grandTotalLimit * 100).toFixed(1) : "0.0"}%</strong> tổng chi phí lương và chiếm <strong>{totalRevenue > 0 ? (grandTotalFund / totalRevenue * 100).toFixed(1) : "0.0"}%</strong> tổng doanh thu
                      </div>
                    </div>

                    <div className="mb-2" style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.04em" }}>PHÂN BỔ THEO PHÒNG BAN</div>
                    <div className="d-flex flex-column gap-2">
                      {groups.map(g => (
                        <div key={g.label}>
                          <div className="d-flex justify-content-between mb-1">
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{g.label}</span>
                            <span style={{ fontSize: 12, color: g.color, fontWeight: 700 }}>{pct(g.total)}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 4, background: "#f1f5f9" }}>
                            <div style={{ height: "100%", borderRadius: 4, background: g.color, width: `${pct(g.total)}%`, transition: "width 0.4s" }} />
                          </div>
                          <div className="text-muted mt-1" style={{ fontSize: 10 }}>{g.total.toLocaleString("vi-VN")} người &nbsp;·&nbsp; {pctTarget(g.total)}% định biên mục tiêu</div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            );
          })()
        ) : (
          /* STEP 4: LỢI NHUẬN */
          (() => {
            const formattedGrossProfitMargin = grossProfitMargin.toFixed(1);
            const formattedOperatingProfitMargin = operatingProfitMargin.toFixed(1);

            const profitRows = [
              {
                id: "1",
                stt: "1",
                label: "Doanh thu bán hàng và cung cấp dịch vụ",
                unit: "đồng",
                value: valGrossRevenue,
                type: "calculated",
                isBold: true,
              },
              {
                id: "2",
                stt: "2",
                label: "Các khoản giảm trừ doanh thu",
                unit: "đồng",
                value: valDeductions,
                type: "calculated",
                isBold: false,
              },
              {
                id: "3",
                stt: "3",
                label: "Doanh thu thuần về bán hàng và cung cấp dịch vụ",
                unit: "đồng",
                value: valNetRevenue,
                type: "calculated",
                isBold: true,
                isSubtotal: true,
              },
              {
                id: "4",
                stt: "4",
                label: "Giá vốn bán hàng",
                unit: "đồng",
                value: valCOGS,
                type: "calculated",
                isBold: false,
              },
              {
                id: "5",
                stt: "5",
                label: "Lợi nhuận gộp về bán hàng và cung cấp dịch vụ",
                unit: "đồng",
                value: valGrossProfit,
                type: "calculated",
                isBold: true,
                isSubtotal: true,
              },
              {
                id: "6",
                stt: "6",
                label: "Doanh thu hoạt động tài chính",
                unit: "đồng",
                value: valFinRevenue,
                type: "calculated",
                isBold: false,
              },
              {
                id: "7",
                stt: "7",
                label: "Chi phí tài chính",
                unit: "đồng",
                value: valFinCost,
                type: "calculated",
                isBold: false,
              },
              {
                id: "8",
                stt: "8",
                label: "Chi phí quản lý vận hành",
                unit: "đồng",
                value: valOperatingExpenses,
                type: "calculated",
                isBold: false,
              },
              {
                id: "9",
                stt: "9",
                label: "Lợi nhuận thuần từ hoạt động kinh doanh",
                unit: "đồng",
                value: valOperatingProfit,
                type: "calculated",
                isBold: true,
                isSubtotal: true,
              },
              {
                id: "10",
                stt: "10",
                label: "Thu nhập khác",
                unit: "đồng",
                value: valOtherIncome,
                type: "calculated",
                isBold: false,
              },
              {
                id: "11",
                stt: "11",
                label: "Chi phí khác",
                unit: "đồng",
                value: valOtherCost,
                type: "calculated",
                isBold: false,
              },
              {
                id: "12",
                stt: "12",
                label: "Lợi nhuận khác",
                unit: "đồng",
                value: valOtherProfit,
                type: "calculated",
                isBold: true,
              },
              {
                id: "13",
                stt: "13",
                label: "Tổng lợi nhuận trước thuế kế hoạch",
                unit: "đồng",
                value: valTotalProfit,
                type: "calculated",
                isBold: true,
                isFinal: true,
              },
              {
                id: "14",
                stt: "14",
                label: "Biên lợi nhuận gộp",
                unit: "%",
                value: formattedGrossProfitMargin,
                type: "percentage",
                isBold: true,
              },
              {
                id: "15",
                stt: "15",
                label: "Biên lợi nhuận hoạt động",
                unit: "%",
                value: formattedOperatingProfitMargin,
                type: "percentage",
                isBold: true,
              },
            ];

            return (
              <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden px-2 pb-2">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <SectionTitle title="Kế hoạch lợi nhuận & Hiệu quả hoạt động (ROI)" icon="bi-trophy" className="mb-0" />
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden border border-slate-200 rounded-xl shadow-xs">
                  <FullWidthTable>
                    <table className="w-full text-left border-collapse" style={{ fontSize: "13px" }}>
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                        <tr className="text-slate-600 text-[11.5px] uppercase tracking-wider font-bold">
                          <th className="py-2.5 px-3 text-center w-14">STT</th>
                          <th className="py-2.5 px-3">Hạng mục - Chỉ tiêu</th>
                          <th className="py-2.5 px-3 text-center w-24">Đơn vị</th>
                          <th className="py-2.5 px-3 text-right w-52">Giá trị</th>
                          <th className="py-2.5 px-3">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profitRows.map((row) => {
                          const isHighlight = row.isFinal;
                          const isSubtotal = row.isSubtotal;

                          let rowBg = "";
                          let rowTextColor = "";

                          if (isHighlight) {
                            rowBg = valTotalProfit >= 0 ? "bg-emerald-50/80" : "bg-rose-50/80";
                            rowTextColor = valTotalProfit >= 0 ? "text-emerald-700 font-extrabold" : "text-rose-700 font-extrabold";
                          } else if (isSubtotal) {
                            rowBg = "bg-slate-50/90 font-bold text-slate-900";
                          }

                          return (
                            <tr key={row.id} className={`${rowBg} hover:bg-blue-50/40 transition-colors`}>
                              <td className="py-2.5 px-3 text-center text-slate-500 font-mono font-medium">{row.stt}</td>
                              <td className={`py-2.5 px-3 ${row.isBold ? "font-bold text-slate-800" : "text-slate-700"}`}>
                                {row.label}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-500 text-xs">
                                {row.unit}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-mono ${row.isBold ? "font-bold" : ""} ${rowTextColor || (row.isBold ? "text-slate-900" : "text-slate-700")}`}>
                                {row.type === "percentage" ? (
                                  <span>{row.value}</span>
                                ) : (
                                  <span style={{ fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif" }}>
                                    {typeof row.value === "number" ? row.value.toLocaleString("vi-VN") : row.value}
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-3">
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-700 text-xs placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 transition-all"
                                  style={{ height: 28 }}
                                  value={s4Notes[row.id] || ""}
                                  onChange={(e) => handleS4NoteChange(row.id, e.target.value)}
                                  placeholder="Nhập ghi chú chỉ tiêu..."
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </FullWidthTable>
                </div>
              </div>
            );
          })()
        ))}
      {isPrintOpen && (() => {
        const getCostValForPrint = (item: CustomCostItem) => {
          return s2_calcByRev
            ? Math.round(totalRevenue * (Number(item.pctVal) || 0) / 100)
            : (Number(item.val) || 0);
        };

        const printCostItems = [
          ...bizCosts.map(item => ({ group: "Phòng Kinh doanh", name: item.label, val: getCostValForPrint(item) })),
          ...mktCosts.map(item => ({ group: "Khối sản xuất", name: item.label, val: getCostValForPrint(item) })),
          ...finCosts.map(item => ({ group: "Kế toán và Nhân sự", name: item.label, val: getCostValForPrint(item) })),
          ...logCosts.map(item => ({ group: "Bộ phận kho", name: item.label, val: getCostValForPrint(item) })),
          ...opsCosts.map(item => ({ group: "Vận hành hệ thống", name: item.label, val: getCostValForPrint(item) })),
          ...miscCosts.map(item => ({ group: "Chi phí khác", name: item.label, val: getCostValForPrint(item) }))
        ];

        const printStaffItems = [
          ...bizStaff.map(item => ({ group: "Phòng Kinh doanh", name: item.label, qty: Number(item.qty) || 0, inc: Number(item.salary) || 0 })),
          ...mktStaff.map(item => ({ group: "Khối sản xuất", name: item.label, qty: Number(item.qty) || 0, inc: Number(item.salary) || 0 })),
          ...logStaff.map(item => ({ group: "Kho vận", name: item.label, qty: Number(item.qty) || 0, inc: Number(item.salary) || 0 })),
          ...finStaff.map(item => ({ group: "Tài chính & Nhân sự", name: item.label, qty: Number(item.qty) || 0, inc: Number(item.salary) || 0 }))
        ];

        const printProfitRows = [
          { stt: "1", label: "Doanh thu bán hàng và cung cấp dịch vụ", unit: "đồng", value: valGrossRevenue, isBold: true },
          { stt: "2", label: "Các khoản giảm trừ doanh thu", unit: "đồng", value: valDeductions, isBold: false },
          { stt: "3", label: "Doanh thu thuần về bán hàng và cung cấp dịch vụ", unit: "đồng", value: valNetRevenue, isBold: true, isSubtotal: true },
          { stt: "4", label: "Giá vốn bán hàng", unit: "đồng", value: valCOGS, isBold: false },
          { stt: "5", label: "Lợi nhuận gộp về bán hàng và cung cấp dịch vụ", unit: "đồng", value: valGrossProfit, isBold: true, isSubtotal: true },
          { stt: "6", label: "Doanh thu hoạt động tài chính", unit: "đồng", value: valFinRevenue, isBold: false },
          { stt: "7", label: "Chi phí tài chính", unit: "đồng", value: valFinCost, isBold: false },
          { stt: "8", label: "Chi phí quản lý vận hành", unit: "đồng", value: valOperatingExpenses, isBold: false },
          { stt: "9", label: "Lợi nhuận thuần từ hoạt động kinh doanh", unit: "đồng", value: valOperatingProfit, isBold: true, isSubtotal: true },
          { stt: "10", label: "Thu nhập khác", unit: "đồng", value: valOtherIncome, isBold: false },
          { stt: "11", label: "Chi phí khác", unit: "đồng", value: valOtherCost, isBold: false },
          { stt: "12", label: "Lợi nhuận khác", unit: "đồng", value: valOtherProfit, isBold: true },
          { stt: "13", label: "Tổng lợi nhuận trước thuế kế hoạch", unit: "đồng", value: valTotalProfit, isBold: true, isFinal: true },
          { stt: "14", label: "Biên lợi nhuận gộp", unit: "%", value: grossProfitMargin.toFixed(1), isBold: true, isPercentage: true },
          { stt: "15", label: "Biên lợi nhuận hoạt động", unit: "%", value: operatingProfitMargin.toFixed(1), isBold: true, isPercentage: true }
        ];

        return (
          <PrintPreviewModal
            title={`Kế hoạch tổng thể năm ${year}`}
            subtitle={`Xem trước bản in kế hoạch năm ${year}`}
            onClose={() => setIsPrintOpen(false)}
            documentId="yearly-master-plan-doc"
            printOrientation="portrait"
            keepFirstPageMargin={false}
            actions={
              <button
                onClick={() => printDocumentById("yearly-master-plan-doc", "portrait", `Ke_hoach_tong_the_nam_${year}`, false)}
                style={{
                  padding: "6px 16px",
                  border: "none",
                  background: "#0d6efd",
                  color: "#fff",
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <i className="bi bi-printer" /> In kế hoạch
              </button>
            }
            document={
              <div style={{ padding: "0", background: "#fff", color: "#000" }}>
                {/* CSS & Google Fonts */}
                <style>{`
                  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&display=swap');
                  .pdf-cover-page { font-family: 'Montserrat', sans-serif !important; }
                `}</style>

                {/* ── TRANG BÌA (COVER PAGE) ── */}
                <div className="pdf-cover-page" style={{ width: "794px", minHeight: "1123px", padding: "0", boxSizing: "border-box", display: "flex", flexDirection: "column", background: "white", pageBreakAfter: "always" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "76px 95px 0" }}>
                    {companyInfo?.logoUrl && <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "40px" }} />}
                    <div>
                      <h1 style={{ margin: 0, fontSize: "14px", fontWeight: 900, textTransform: "uppercase", color: "#003087", letterSpacing: "1px" }}>
                        {companyInfo?.name || "CÔNG TY CỔ PHẦN CÔNG NGHỆ MASTER"}
                      </h1>
                      <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                        {companyInfo?.slogan || "Hệ thống quản trị tài chính & Kế hoạch ngân sách"}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", height: "480px", position: "relative", marginTop: "40px" }}>
                    <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
                      <div style={{ flex: 1, background: "#003087", padding: "40px 24px 40px 95px", color: "white", display: "flex", alignItems: "center" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: 800, margin: 0, textTransform: "uppercase", lineHeight: "1.4" }}>
                          KẾ HOẠCH TỔNG THỂ<br />HOẠT ĐỘNG SẢN XUẤT KINH DOANH
                        </h2>
                      </div>
                      <div style={{ flex: 1.2, background: "#000000", padding: "50px 0 40px 95px", color: "white", clipPath: "polygon(0 0, 100% 25%, 100% 100%, 0 100%)", marginTop: "-60px", zIndex: 2, display: "flex", alignItems: "center" }}>
                        <h1 style={{ fontSize: "36px", fontWeight: 900, margin: 0, color: "#C9A84C", textTransform: "uppercase", lineHeight: "1.3" }}>
                          NĂM {year}
                        </h1>
                      </div>
                    </div>
                    <div style={{ width: "45%", position: "relative" }}>
                      <img src="https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Planning" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  </div>

                  <div style={{ flex: 1, display: "flex", gap: "40px", marginTop: "40px", padding: "0 95px" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "28px" }}>
                      {[
                        { icon: "bi-cash-coin", title: "Mục tiêu tài chính", desc: "Tối ưu hóa doanh số bán hàng đa kênh và nâng cao biên lợi nhuận hoạt động." },
                        { icon: "bi-people", title: "Định biên nhân sự", desc: "Phân bổ hợp lý quỹ lương và quy mô phòng ban theo định hướng phát triển." },
                        { icon: "bi-bar-chart-line", title: "Kiểm soát ngân sách", desc: "Quản lý dòng tiền, định mức chi phí vận hành chặt chẽ và tối ưu ROI." }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                          <div style={{ width: "42px", height: "42px", background: "#003087", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", flexShrink: 0 }}>
                            <i className={`bi ${item.icon}`} />
                          </div>
                          <div>
                            <strong style={{ fontSize: "13px", display: "block", color: "#000", textTransform: "uppercase" }}>{item.title}</strong>
                            <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.5 }}>{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ width: "45%" }}>
                      <h3 style={{ fontSize: "15px", color: "#003087", textTransform: "uppercase", fontWeight: 800, margin: "0 0 12px" }}>VỀ BÁO CÁO NÀY</h3>
                      <p style={{ color: "#475569", fontSize: "11px", lineHeight: 1.6, margin: "0 0 16px" }}>
                        Tài liệu tổng hợp các mục tiêu doanh thu, định mức chi phí chi tiết, kế hoạch định biên nhân sự và dự báo kế hoạch lợi nhuận kinh doanh của doanh nghiệp trong năm {year}.
                      </p>
                      <h3 style={{ fontSize: "14px", color: "#000", fontWeight: 700, margin: "24px 0 8px" }}>THÔNG TIN PHÊ DUYỆT</h3>
                      <ul style={{ paddingLeft: "16px", margin: 0, fontSize: "11px", color: "#475569", lineHeight: 1.8 }}>
                        <li><strong>Cơ quan ban hành:</strong> Ban Giám đốc & Hội đồng Quản trị</li>
                        <li><strong>Kỳ lập kế hoạch:</strong> Năm {year}</li>
                        <li><strong>Thời điểm lập biểu:</strong> {new Date().toLocaleString('vi-VN')}</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{ display: "flex", marginTop: "auto", background: "#003087", color: "white", padding: "24px 95px 36px", position: "relative" }}>
                    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "40%", background: "#000", clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }} />
                    <div style={{ width: "35%", position: "relative", zIndex: 2 }}>
                      <div style={{ fontSize: "10px", color: "#C9A84C", textTransform: "uppercase", fontWeight: 700 }}>Hỗ trợ kỹ thuật</div>
                      <div style={{ fontSize: "18px", fontWeight: 700 }}>{companyInfo?.phone || "024 3333 8888"}</div>
                    </div>
                    <div style={{ width: "30%", position: "relative", zIndex: 2 }}>
                      <div style={{ fontSize: "10px" }}>Email: {companyInfo?.email || "info@mastertechnology.vn"}</div>
                      <div style={{ fontSize: "10px", marginTop: "4px" }}>Web: {companyInfo?.website || "www.mastertechnology.vn"}</div>
                    </div>
                    <div style={{ width: "35%", position: "relative", zIndex: 2, paddingLeft: "24px", fontSize: "10px" }}>
                      {companyInfo?.address || "Hà Nội, Việt Nam"}
                    </div>
                  </div>
                </div>

                {/* PAGE 2: Core Targets & Expenses Table */}
                <div className="pdf-content-page" style={{ width: "794px", minHeight: "1123px", padding: "20mm 20mm 20mm 25mm", boxSizing: "border-box", display: "flex", flexDirection: "column", pageBreakAfter: "always" }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1.5px solid #003087", paddingBottom: "10px", marginBottom: "20px" }}>
                    <div>
                      <h6 style={{ margin: "0", fontWeight: 800, fontSize: "12.5px", textTransform: "uppercase", color: "#003087" }}>
                        {companyInfo?.name || "CÔNG TY CỔ PHẦN CÔNG NGHỆ MASTER"}
                      </h6>
                      <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#666" }}>
                        {companyInfo?.slogan || "Hệ thống quản trị tài chính & Kế hoạch ngân sách"}
                      </p>
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Trang 02</span>
                  </div>

                  {/* Section I: Core Targets */}
                  <div style={{ marginBottom: "25px" }}>
                    <h6 style={{ margin: "0 0 10px 0", fontWeight: 800, fontSize: "12px", textTransform: "uppercase", color: "#003087", borderBottom: "1px solid #ddd", paddingBottom: "4px" }}>
                      I. CHỈ TIÊU TÀI CHÍNH & NHÂN SỰ CỐT LÕI
                    </h6>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      <div style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#f8fafc", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>TỔNG DOANH THU KẾ HOẠCH</div>
                        <div style={{ fontSize: "13.5px", fontWeight: 900, color: "#0f172a" }}>{valGrossRevenue.toLocaleString("vi-VN")} đ</div>
                      </div>
                      <div style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#f8fafc", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>TỔNG CHI PHÍ HOẠT ĐỘNG</div>
                        <div style={{ fontSize: "13.5px", fontWeight: 900, color: "#ef4444" }}>{valOperatingExpenses.toLocaleString("vi-VN")} đ</div>
                      </div>
                      <div style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#f8fafc", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>TỔNG LỢI NHUẬN TRƯỚC THUẾ</div>
                        <div style={{ fontSize: "13.5px", fontWeight: 900, color: "#10b981" }}>{valTotalProfit.toLocaleString("vi-VN")} đ</div>
                      </div>
                      <div style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#f8fafc", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>BIÊN LỢI NHUẬN GỐP</div>
                        <div style={{ fontSize: "13.5px", fontWeight: 900, color: "#3b82f6" }}>{grossProfitMargin.toFixed(1)}%</div>
                      </div>
                      <div style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#f8fafc", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>BIÊN LỢI NHUẬN HOẠT ĐỘNG</div>
                        <div style={{ fontSize: "13.5px", fontWeight: 900, color: "#8b5cf6" }}>{operatingProfitMargin.toFixed(1)}%</div>
                      </div>
                      <div style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#f8fafc", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>TỔNG ĐỊNH BIÊN NHÂN SỰ</div>
                        <div style={{ fontSize: "13.5px", fontWeight: 900, color: "#0f172a" }}>{totalStep3} người</div>
                      </div>
                    </div>
                  </div>

                  {/* Section II: Operational Cost Table */}
                  <div style={{ flexGrow: 1 }}>
                    <h6 style={{ margin: "0 0 10px 0", fontWeight: 800, fontSize: "12px", textTransform: "uppercase", color: "#003087", borderBottom: "1px solid #ddd", paddingBottom: "4px" }}>
                      II. CHI TIẾT ĐỊNH MỨC CHI PHÍ HOẠT ĐỘNG
                    </h6>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
                      <thead>
                        <tr style={{ background: "#003087", color: "#fff", fontWeight: 700 }}>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px", width: "40px", textAlign: "center", color: "#fff" }}>STT</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px", textAlign: "left", color: "#fff" }}>Khoản mục chi phí</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px", width: "150px", textAlign: "right", color: "#fff" }}>Giá trị kế hoạch (đ)</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px", width: "100px", textAlign: "center", color: "#fff" }}>Tỷ lệ / DT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let currentGroup = "";
                          let displayStt = 1;
                          return printCostItems.map((item, idx) => {
                            const showGroupHeader = item.group !== currentGroup;
                            if (showGroupHeader) {
                              currentGroup = item.group;
                            }
                            const currentStt = displayStt++;
                            return (
                              <React.Fragment key={idx}>
                                {showGroupHeader && (
                                  <tr style={{ background: "rgba(0, 48, 135, 0.05)", fontWeight: 700 }}>
                                    <td style={{ border: "1px solid #cbd5e1" }}></td>
                                    <td colSpan={3} style={{ border: "1px solid #cbd5e1", padding: "6px 8px", color: "#003087", fontWeight: 800, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.03em" }}>
                                      {item.group}
                                    </td>
                                  </tr>
                                )}
                                <tr style={{ background: idx % 2 === 1 ? "#f8fafc" : "#fff" }}>
                                  <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>{currentStt}</td>
                                  <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "left", paddingLeft: "15px" }}>{item.name}</td>
                                  <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "right", fontFamily: "monospace" }}>{item.val.toLocaleString("vi-VN")}</td>
                                  <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                                    {totalRevenue > 0 ? (item.val / totalRevenue * 100).toFixed(1) : "0.0"}%
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          });
                        })()}
                        <tr style={{ background: "rgba(0, 48, 135, 0.05)", fontWeight: 700 }}>
                          <td colSpan={2} style={{ border: "1px solid #cbd5e1", padding: "5px", textAlign: "center" }}>TỔNG CHI PHÍ HOẠT ĐỘNG</td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "5px", textAlign: "right", fontFamily: "monospace" }}>{valOperatingExpenses.toLocaleString("vi-VN")}</td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "5px", textAlign: "center" }}>
                            {totalRevenue > 0 ? (valOperatingExpenses / totalRevenue * 100).toFixed(1) : "0.0"}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PAGE 3: Staff Headcounts & Quỹ lương Table */}
                <div className="pdf-content-page" style={{ width: "794px", minHeight: "1123px", padding: "20mm 20mm 20mm 25mm", boxSizing: "border-box", display: "flex", flexDirection: "column", pageBreakAfter: "always" }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1.5px solid #003087", paddingBottom: "10px", marginBottom: "20px" }}>
                    <div>
                      <h6 style={{ margin: "0", fontWeight: 800, fontSize: "12.5px", textTransform: "uppercase", color: "#003087" }}>
                        {companyInfo?.name || "CÔNG TY CỔ PHẦN CÔNG NGHỆ MASTER"}
                      </h6>
                      <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#666" }}>
                        {companyInfo?.slogan || "Hệ thống quản trị tài chính & Kế hoạch ngân sách"}
                      </p>
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Trang 03</span>
                  </div>

                  <div style={{ flexGrow: 1 }}>
                    <h6 style={{ margin: "0 0 10px 0", fontWeight: 800, fontSize: "12px", textTransform: "uppercase", color: "#003087", borderBottom: "1px solid #ddd", paddingBottom: "4px" }}>
                      III. CHI TIẾT ĐỊNH BIÊN NHÂN SỰ & QUỸ LƯƠNG
                    </h6>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                      <thead>
                        <tr style={{ background: "#003087", color: "#fff", fontWeight: 700 }}>
                          <th style={{ border: "1px solid #cbd5e1", padding: "4px", width: "35px", textAlign: "center", color: "#fff" }}>STT</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "left", color: "#fff" }}>Chức danh / Vị trí</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "4px", width: "75px", textAlign: "center", color: "#fff" }}>Số người</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "4px", width: "110px", textAlign: "right", color: "#fff" }}>Lương tháng (đ)</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "4px", width: "120px", textAlign: "right", color: "#fff" }}>Quỹ lương năm (đ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let currentGroup = "";
                          let displayStt = 1;
                          return printStaffItems.map((item, idx) => {
                            const showGroupHeader = item.group !== currentGroup;
                            if (showGroupHeader) {
                              currentGroup = item.group;
                            }
                            const currentStt = displayStt++;
                            const yearFund = item.qty * item.inc * 12;
                            return (
                              <React.Fragment key={idx}>
                                {showGroupHeader && (
                                  <tr style={{ background: "rgba(0, 48, 135, 0.05)", fontWeight: 700 }}>
                                    <td style={{ border: "1px solid #cbd5e1" }}></td>
                                    <td colSpan={4} style={{ border: "1px solid #cbd5e1", padding: "5px 6px", color: "#003087", fontWeight: 800, textTransform: "uppercase", fontSize: "10.5px", letterSpacing: "0.03em" }}>
                                      {item.group}
                                    </td>
                                  </tr>
                                )}
                                <tr style={{ background: idx % 2 === 1 ? "#f8fafc" : "#fff" }}>
                                  <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 4px", textAlign: "center" }}>{currentStt}</td>
                                  <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 4px", textAlign: "left", paddingLeft: "15px" }}>{item.name}</td>
                                  <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 4px", textAlign: "center" }}>{item.qty}</td>
                                  <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 4px", textAlign: "right", fontFamily: "monospace" }}>{item.inc.toLocaleString("vi-VN")}</td>
                                  <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 4px", textAlign: "right", fontFamily: "monospace" }}>{yearFund.toLocaleString("vi-VN")}</td>
                                </tr>
                              </React.Fragment>
                            );
                          });
                        })()}
                        <tr style={{ background: "rgba(0, 48, 135, 0.05)", fontWeight: 700 }}>
                          <td colSpan={2} style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>TỔNG NHÂN SỰ & QUỸ LƯƠNG</td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>{totalStep3}</td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px" }}></td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "right", fontFamily: "monospace" }}>{grandTotalFund.toLocaleString("vi-VN")}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PAGE 4: P&L Table, Notes, and Signatures */}
                <div className="pdf-content-page" style={{ width: "794px", minHeight: "1123px", padding: "20mm 20mm 20mm 25mm", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1.5px solid #003087", paddingBottom: "10px", marginBottom: "20px" }}>
                    <div>
                      <h6 style={{ margin: "0", fontWeight: 800, fontSize: "12.5px", textTransform: "uppercase", color: "#003087" }}>
                        {companyInfo?.name || "CÔNG TY CỔ PHẦN CÔNG NGHỆ MASTER"}
                      </h6>
                      <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#666" }}>
                        {companyInfo?.slogan || "Hệ thống quản trị tài chính & Kế hoạch ngân sách"}
                      </p>
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Trang 04</span>
                  </div>

                  <div style={{ flexGrow: 1 }}>
                    <h6 style={{ margin: "0 0 10px 0", fontWeight: 800, fontSize: "12px", textTransform: "uppercase", color: "#003087", borderBottom: "1px solid #ddd", paddingBottom: "4px" }}>
                      IV. KẾ HOẠCH LỢI NHUẬN & HIỆU QUẢ HOẠT ĐỘNG (ROI)
                    </h6>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginBottom: "20px" }}>
                      <thead>
                        <tr style={{ background: "#003087", color: "#fff", fontWeight: 700 }}>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px", width: "35px", textAlign: "center", color: "#fff" }}>STT</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px", width: "230px", textAlign: "left", color: "#fff" }}>Hạng mục - Chỉ tiêu</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px", width: "50px", textAlign: "center", color: "#fff" }}>Đơn vị</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px", width: "110px", textAlign: "right", color: "#fff" }}>Giá trị kế hoạch</th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px", textAlign: "left", color: "#fff" }}>Ghi chú chỉ tiêu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printProfitRows.map((row, idx) => {
                          const isH = row.isFinal;
                          const isSub = row.isSubtotal;
                          let bg = "";
                          let col = "#000";
                          if (isH) {
                            bg = valTotalProfit >= 0 ? "rgba(25, 135, 84, 0.08)" : "rgba(220, 53, 69, 0.08)";
                            col = valTotalProfit >= 0 ? "#198754" : "#dc3545";
                          } else if (isSub) {
                            bg = "#f8fafc";
                            col = "#0f172a";
                          }
                          const style = (isH || isSub) ? { backgroundColor: bg, color: col, fontWeight: "bold" as const } : {};
                          const weightClass = row.isBold ? { fontWeight: "bold" as const } : {};

                          return (
                            <tr key={idx} style={{ ...style, ...weightClass }}>
                              <td style={{ border: "1px solid #cbd5e1", padding: "4.5px 5px", textAlign: "center" }}>{row.stt}</td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "4.5px 5px", textAlign: "left" }}>{row.label}</td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "4.5px 5px", textAlign: "center" }}>{row.unit}</td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "4.5px 5px", textAlign: "right", fontFamily: "monospace" }}>
                                {row.isPercentage ? row.value : (typeof row.value === "number" ? row.value.toLocaleString("vi-VN") : row.value)}
                              </td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "4.5px 5px", textAlign: "left", fontSize: "9px", color: "#666" }}>
                                {s4Notes[row.stt] || ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            }
          />
        );
      })()}

      {isAiPrintOpen && (() => {
        return (
          <PrintPreviewModal
            title={`Báo cáo Thẩm định Kế hoạch năm ${year}`}
            subtitle={`Xem trước bản in Báo cáo Thẩm định AI năm ${year}`}
            onClose={() => setIsAiPrintOpen(false)}
            documentId="ai-analysis-report-doc"
            printOrientation="portrait"
            keepFirstPageMargin={false}
            printMargins="20mm 20mm 20mm 30mm"
            actions={
              <button
                onClick={() => printDocumentById("ai-analysis-report-doc", "portrait", `Bao_cao_Tham_dinh_Ke_hoach_${year}`, false, "20mm 20mm 20mm 30mm")}
                style={{
                  padding: "6px 16px",
                  border: "none",
                  background: "#0d6efd",
                  color: "#fff",
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <i className="bi bi-printer" /> In báo cáo
              </button>
            }
            document={
              <div style={{ padding: "0", background: "#fff", color: "#000" }}>
                {/* CSS & Google Fonts */}
                <style>{`
                  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&display=swap');
                  .pdf-cover-page { font-family: 'Montserrat', sans-serif !important; }
                `}</style>

                {/* ── TRANG BÌA (COVER PAGE) ── */}
                <div className="pdf-cover-page" style={{ width: "794px", minHeight: "1123px", padding: "0", boxSizing: "border-box", display: "flex", flexDirection: "column", background: "white", pageBreakAfter: "always" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "76px 95px 0" }}>
                    {companyInfo?.logoUrl && <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "40px" }} />}
                    <div>
                      <h1 style={{ margin: 0, fontSize: "14px", fontWeight: 900, textTransform: "uppercase", color: "#0f172a", letterSpacing: "1px" }}>
                        {companyInfo?.name || "CÔNG TY CỔ PHẦN CÔNG NGHỆ MASTER"}
                      </h1>
                      <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                        {companyInfo?.slogan || "Hệ thống quản trị tài chính & Kế hoạch ngân sách"}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", height: "480px", position: "relative", marginTop: "40px" }}>
                    <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
                      <div style={{ flex: 1, background: "#0f172a", padding: "40px 24px 40px 95px", color: "white", display: "flex", alignItems: "center" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: 800, margin: 0, textTransform: "uppercase", lineHeight: "1.4" }}>
                          BÁO CÁO THẨM ĐỊNH &<br />CHẨN ĐOÁN CHI TIẾT
                        </h2>
                      </div>
                      <div style={{ flex: 1.2, background: "#000000", padding: "50px 0 40px 95px", color: "white", clipPath: "polygon(0 0, 100% 25%, 100% 100%, 0 100%)", marginTop: "-60px", zIndex: 2, display: "flex", alignItems: "center" }}>
                        <h1 style={{ fontSize: "28px", fontWeight: 900, margin: 0, color: "#f59e0b", textTransform: "uppercase", lineHeight: "1.3" }}>
                          KẾ HOẠCH KINH DOANH {year}
                        </h1>
                      </div>
                    </div>
                    <div style={{ width: "45%", position: "relative" }}>
                      <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Auditing" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  </div>

                  <div style={{ flex: 1, display: "flex", gap: "40px", marginTop: "40px", padding: "0 95px" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "28px" }}>
                      {[
                        { icon: "bi-cpu", title: "Trí tuệ nhân tạo (AI)", desc: "Phân tích, soi lỗi, tìm lỗ hổng và rủi ro lập kế hoạch tài chính tự động." },
                        { icon: "bi-shield-check", title: "Hội đồng thẩm định", desc: "CEO 30 năm KN, CFO, các Chuyên gia chiến lược, vận hành & nhân sự." },
                        { icon: "bi-exclamation-triangle", title: "Cảnh báo & Đề xuất", desc: "Phát hiện rủi ro và đưa ra các hành động ưu tiên cùng chỉ số KPI." }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                          <div style={{ width: "42px", height: "42px", background: "#0f172a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", flexShrink: 0 }}>
                            <i className={`bi ${item.icon}`} />
                          </div>
                          <div>
                            <strong style={{ fontSize: "13px", display: "block", color: "#000", textTransform: "uppercase" }}>{item.title}</strong>
                            <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.5 }}>{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ width: "45%" }}>
                      <h3 style={{ fontSize: "15px", color: "#0f172a", textTransform: "uppercase", fontWeight: 800, margin: "0 0 12px" }}>HỘI ĐỒNG THẨM ĐỊNH AI</h3>
                      <p style={{ color: "#475569", fontSize: "11px", lineHeight: 1.6, margin: "0 0 16px" }}>
                        Bản báo cáo phản biện, chẩn đoán lỗ hổng chiến lược và tài chính dựa trên mô hình ngôn ngữ lớn kết hợp kinh nghiệm thực chiến của các chuyên gia đầu ngành.
                      </p>
                      <h3 style={{ fontSize: "14px", color: "#000", fontWeight: 700, margin: "24px 0 8px" }}>THÔNG TIN BÁO CÁO</h3>
                      <ul style={{ paddingLeft: "16px", margin: 0, fontSize: "11px", color: "#475569", lineHeight: 1.8 }}>
                        <li><strong>Cơ chế lập:</strong> Real-time AI Strategic Diagnosis</li>
                        <li><strong>Kỳ kế hoạch thẩm định:</strong> Năm {year}</li>
                        <li><strong>Thời điểm chẩn đoán:</strong> {new Date().toLocaleString('vi-VN')}</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{ display: "flex", marginTop: "auto", background: "#0f172a", color: "white", padding: "24px 95px 36px", position: "relative" }}>
                    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "40%", background: "#000", clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }} />
                    <div style={{ width: "35%", position: "relative", zIndex: 2 }}>
                      <div style={{ fontSize: "10px", color: "#f59e0b", textTransform: "uppercase", fontWeight: 700 }}>Hỗ trợ hệ thống</div>
                      <div style={{ fontSize: "18px", fontWeight: 700 }}>{companyInfo?.phone || "024 3333 8888"}</div>
                    </div>
                    <div style={{ width: "30%", position: "relative", zIndex: 2 }}>
                      <div style={{ fontSize: "10px" }}>Email: {companyInfo?.email || "info@mastertechnology.vn"}</div>
                      <div style={{ fontSize: "10px", marginTop: "4px" }}>Web: {companyInfo?.website || "www.mastertechnology.vn"}</div>
                    </div>
                    <div style={{ width: "35%", position: "relative", zIndex: 2, paddingLeft: "24px", fontSize: "10px" }}>
                      {companyInfo?.address || "Hà Nội, Việt Nam"}
                    </div>
                  </div>
                </div>

                {/* PAGE 2: Summary Metrics (Executive Dashboard copy for print) */}
                <div className="pdf-content-page" style={{ width: "794px", minHeight: "1123px", padding: "20mm 20mm 20mm 25mm", boxSizing: "border-box", display: "flex", flexDirection: "column", pageBreakAfter: "always" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1.5px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
                    <div>
                      <h6 style={{ margin: "0", fontWeight: 800, fontSize: "12px", textTransform: "uppercase", color: "#0f172a" }}>
                        BÁO CÁO THẨM ĐỊNH KẾ HOẠCH KINH DOANH NĂM {year}
                      </h6>
                      <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#666" }}>
                        Tóm tắt các chỉ số tài chính & Điểm đánh giá tổng thể
                      </p>
                    </div>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>Trang 02</span>
                  </div>

                  <h5 style={{ margin: "0 0 16px 0", fontSize: "13px", fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", textTransform: "uppercase" }}>
                    I. ĐIỂM SỐ & CHỈ SỐ TÀI CHÍNH CHỦ CHỐT
                  </h5>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", marginBottom: "24px" }}>
                    {/* Score block */}
                    <div style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f8fafc",
                      textAlign: "center"
                    }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Điểm Thẩm Định</span>
                      <div style={{
                        position: "relative",
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        border: "5px solid #e2e8f0",
                        borderTopColor: "#6366f1",
                        borderRightColor: "#a855f7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "10px 0"
                      }}>
                        <div>
                          <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                            {(() => {
                              if (!aiResult) return 82;
                              const match = aiResult.match(/Điểm tổng thể:\s*(\d+)/i) || aiResult.match(/(\d+)\s*\/\s*100/);
                              if (match) {
                                const s = parseInt(match[1]);
                                if (s > 0 && s <= 100) return s;
                              }
                              return 82;
                            })()}
                          </div>
                          <div style={{ fontSize: "9px", color: "#64748b", marginTop: "1px" }}>/100</div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "rgba(245,158,11,0.1)",
                        color: "#f59e0b"
                      }}>
                        {(() => {
                          const s = (() => {
                            if (!aiResult) return 82;
                            const match = aiResult.match(/Điểm tổng thể:\s*(\d+)/i) || aiResult.match(/(\d+)\s*\/\s*100/);
                            if (match) {
                              const v = parseInt(match[1]);
                              if (v > 0 && v <= 100) return v;
                            }
                            return 82;
                          })();
                          return s >= 80 ? "Khá Tốt" : "Cần Điều Chỉnh";
                        })()}
                      </span>
                    </div>

                    {/* Cards grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#ffffff" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}>DOANH THU THUẦN</div>
                        <div style={{ fontSize: "13px", fontWeight: 900, color: "#2563eb", marginTop: "4px", fontFamily: "monospace" }}>{valNetRevenue.toLocaleString("vi-VN")} đ</div>
                      </div>
                      <div style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#ffffff" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}>BIÊN LỢI NHUẬN GỐP</div>
                        <div style={{ fontSize: "13px", fontWeight: 900, color: "#059669", marginTop: "4px", fontFamily: "monospace" }}>{grossProfitMargin.toFixed(1)}%</div>
                      </div>
                      <div style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#ffffff" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}>CHI PHÍ CỐ ĐỊNH CÔNG TY</div>
                        <div style={{ fontSize: "13px", fontWeight: 900, color: "#d97706", marginTop: "4px", fontFamily: "monospace" }}>{(f_ops_depr + f_ops_rent + f_ops_utilities).toLocaleString("vi-VN")} đ</div>
                      </div>
                      <div style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#ffffff" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}>TỶ LỆ OPEX / DOANH THU</div>
                        <div style={{ fontSize: "13px", fontWeight: 900, color: "#7c3aed", marginTop: "4px", fontFamily: "monospace" }}>{(totalRevenue > 0 ? (totalStep2 / totalRevenue * 100) : 0).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>

                  <h5 style={{ margin: "16px 0 10px 0", fontSize: "13px", fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", textTransform: "uppercase" }}>
                    II. PHÂN TÍCH RỦI RO & THẾ MẠNH (SWOT CHIẾN LƯỢC TÓM TẮT)
                  </h5>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "10px", lineHeight: "1.4" }}>
                    <div style={{ padding: "10px", border: "1px solid #bbf7d0", borderRadius: "6px", background: "#f0fdf4" }}>
                      <strong style={{ color: "#166534", display: "block", marginBottom: "4px" }}>S - THẾ MẠNH (STRENGTHS)</strong>
                      <ul style={{ margin: 0, paddingLeft: "14px" }}>
                        <li>Cơ cấu sản phẩm đa dạng và biên lợi nhuận gộp cao đạt {grossProfitMargin.toFixed(1)}%.</li>
                        <li>Kế hoạch phân phối đa kênh cân đối giữa sỉ và lẻ.</li>
                      </ul>
                    </div>
                    <div style={{ padding: "10px", border: "1px solid #fecaca", borderRadius: "6px", background: "#fef2f2" }}>
                      <strong style={{ color: "#991b1b", display: "block", marginBottom: "4px" }}>W - ĐIỂM YẾU (WEAKNESSES)</strong>
                      <ul style={{ margin: 0, paddingLeft: "14px" }}>
                        <li>Chi phí cố định cấp công ty lớn ({((f_ops_depr + f_ops_rent + f_ops_utilities) / 1000000000).toFixed(2)} tỷ/năm) tạo áp lực hòa vốn.</li>
                        <li>Định biên nhân sự gián tiếp còn khá cao.</li>
                      </ul>
                    </div>
                    <div style={{ padding: "10px", border: "1px solid #bfdbfe", borderRadius: "6px", background: "#eff6ff" }}>
                      <strong style={{ color: "#1e40af", display: "block", marginBottom: "4px" }}>O - CƠ HỘI (OPPORTUNITIES)</strong>
                      <ul style={{ margin: 0, paddingLeft: "14px" }}>
                        <li>Thương mại điện tử tăng trưởng tốt giúp cải thiện dòng tiền nhanh.</li>
                        <li>Đại lý sỉ giúp phủ thị trường nhanh chóng.</li>
                      </ul>
                    </div>
                    <div style={{ padding: "10px", border: "1px solid #fed7aa", borderRadius: "6px", background: "#fff7ed" }}>
                      <strong style={{ color: "#c2410c", display: "block", marginBottom: "4px" }}>T - THÁCH THỨC (THREATS)</strong>
                      <ul style={{ margin: 0, paddingLeft: "14px" }}>
                        <li>Cạnh tranh thị trường làm ảnh hưởng biên lợi nhuận mục tiêu.</li>
                        <li>Rủi ro công nợ đại lý sỉ ảnh hưởng trực tiếp đến thanh khoản.</li>
                      </ul>
                    </div>
                  </div>

                  <h5 style={{ margin: "20px 0 10px 0", fontSize: "12px", fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px", textTransform: "uppercase" }}>
                    III. CƠ CẤU CHI PHÍ VẬN HÀNH (OPEX)
                  </h5>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                    <thead>
                      <tr style={{ background: "#0f172a", color: "#fff", fontWeight: 700 }}>
                        <th style={{ border: "1px solid #cbd5e1", padding: "4px 8px", textAlign: "left", color: "#fff" }}>Danh mục chi phí</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "4px 8px", textAlign: "right", color: "#fff", width: "180px" }}>Giá trị kế hoạch</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "4px 8px", textAlign: "center", color: "#fff", width: "100px" }}>Tỷ trọng OPEX</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "Lương & Kinh doanh", val: f_biz_salary },
                        { name: "Khối sản xuất", val: f_mkt_ads + f_mkt_events + f_mkt_print },
                        { name: "Chi phí cố định Công ty", val: f_ops_depr + f_ops_rent + f_ops_utilities },
                        { name: "Vận hành & Kho", val: f_ops_salary + f_ops_supplies + f_ops_cs + f_ops_logistics + f_ops_inv_writeoff + f_ops_bad_debt },
                        { name: "Chi phí khác", val: f_misc }
                      ].map((item, idx) => {
                        const totalOpex = f_biz_salary + (f_mkt_ads + f_mkt_events + f_mkt_print) + (f_ops_depr + f_ops_rent + f_ops_utilities) + (f_ops_salary + f_ops_supplies + f_ops_cs + f_ops_logistics + f_ops_inv_writeoff + f_ops_bad_debt) + f_misc;
                        return (
                          <tr key={idx} style={{ background: idx % 2 === 1 ? "#f8fafc" : "#fff" }}>
                            <td style={{ border: "1px solid #cbd5e1", padding: "4px 8px" }}>{item.name}</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "4px 8px", textAlign: "right", fontFamily: "monospace" }}>{item.val.toLocaleString("vi-VN")} đ</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "4px 8px", textAlign: "center" }}>
                              {totalOpex > 0 ? (item.val / totalOpex * 100).toFixed(1) : "0.0"}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* PAGE 3 & ONWARDS: Detailed Markdown Analysis Report */}
                {(() => {
                  return (
                    <div className="pdf-content-page" style={{ width: "794px", minHeight: "1123px", padding: "20mm 20mm 20mm 25mm", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1.5px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
                        <div>
                          <h6 style={{ margin: "0", fontWeight: 800, fontSize: "12px", textTransform: "uppercase", color: "#0f172a" }}>
                            BÁO CÁO THẨM ĐỊNH CHI TIẾT CỦA HỘI ĐỒNG (AI)
                          </h6>
                          <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#666" }}>
                            Phản biện toàn diện kế hoạch kinh doanh
                          </p>
                        </div>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>Trang 03</span>
                      </div>

                      <div style={{ fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                        {renderMarkdown(aiResult)}
                      </div>
                    </div>
                  );
                })()}
              </div>
            }
          />
        );
      })()}

      {/* AI Assessment Board Fullscreen Modal */}
      {isAiModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}>
          <div style={{
            width: "100vw",
            height: "100vh",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "20px 28px",
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              flexShrink: 0
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <i className="bi bi-cpu-fill" style={{ fontSize: "18px", color: "#ffffff" }} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, letterSpacing: "0.5px" }}>
                    Thẩm định kế hoạch
                  </h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#94a3b8" }}>
                    CEO 30 năm KN | CFO | Chuyên gia Chiến lược | Quản trị Vận hành | Chuyên gia KPI | Nhà đầu tư M&A
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {aiResult && !isAiLoading && (
                  <button
                    onClick={() => setIsAiPrintOpen(true)}
                    style={{
                      border: "none",
                      background: "rgba(255, 255, 255, 0.15)",
                      color: "#ffffff",
                      width: "36px", height: "36px", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "all 0.2s"
                    }}
                    title="In báo cáo thẩm định"
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"}
                  >
                    <i className="bi bi-printer" style={{ fontSize: "16px" }} />
                  </button>
                )}
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  style={{
                    border: "none",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    width: "32px", height: "32px", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "background 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                >
                  <i className="bi bi-x-lg" style={{ fontSize: "14px" }} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "32px 40px",
              background: "#f8fafc",
            }}>
              {isAiLoading ? (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  height: "100%", gap: "20px"
                }}>
                  <div style={{
                    width: "60px", height: "60px",
                    border: "5px solid #e2e8f0",
                    borderTopColor: "#6366f1",
                    borderRadius: "50%",
                    animation: "spin 1.0s linear infinite"
                  }} />
                  <div style={{ textAlign: "center" }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "16px", color: "#0f172a" }}>
                      Hội đồng Thẩm định đang làm việc...
                    </p>
                    <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#64748b", maxWidth: "480px" }}>
                      CEO, CFO và các Chuyên gia đang phân tích cấu trúc tài chính, bóc tách chi phí cố định 2.34 tỷ VNĐ/năm và soi lỗi bản kế hoạch kinh doanh của bạn. Quá trình này có thể mất từ 15-30 giây.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{
                  maxWidth: "1000px",
                  margin: "0 auto",
                }}>
                  {aiResult ? (
                    <>
                      {/* Dashboard Header Banner */}
                      <div style={{ position: "relative", width: "100%", height: "200px", borderRadius: "12px", overflow: "hidden", marginBottom: "28px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                        <img src="/master_plan_banner.png" alt="Strategic Master Plan Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.4) 60%, rgba(15,23,42,0) 100%)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                          padding: "24px 32px"
                        }}>
                          <span style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", color: "#fff", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, width: "fit-content", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                            AI Executive Dashboard
                          </span>
                          <h2 style={{ color: "#ffffff", fontSize: "22px", fontWeight: 800, margin: 0, textShadow: "0 2px 4px rgba(0,0,0,0.4)", textTransform: "uppercase" }}>
                            Báo Cáo Thẩm Định & Chẩn Đoán Kế Hoạch Kinh Doanh {year}
                          </h2>
                          <p style={{ color: "#94a3b8", fontSize: "13px", margin: "4px 0 0 0" }}>
                            Hội đồng thẩm định cấp cao phản biện, cảnh báo rủi ro cố định và dự báo kịch bản doanh thu
                          </p>
                        </div>
                      </div>

                      {/* Cache Banner if loaded from local cache */}
                      {isFromCache && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "8px",
                          padding: "12px 18px",
                          marginBottom: "24px"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontSize: "13px", fontWeight: 600 }}>
                            <i className="bi bi-lightning-charge-fill" style={{ color: "#15803d" }} />
                            <span>Thông tin tải tức thì từ bộ nhớ tạm (0ms). Số liệu đầu vào chưa thay đổi.</span>
                          </div>
                          <button
                            onClick={() => handleAiAnalysis(true)}
                            style={{
                              border: "none",
                              background: "#166534",
                              color: "#ffffff",
                              padding: "6px 14px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            <i className="bi bi-arrow-clockwise" />
                            Phân tích lại
                          </button>
                        </div>
                      )}

                      {/* Executive Widget Metrics Grid */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "240px 1fr",
                        gap: "24px",
                        marginBottom: "28px"
                      }}>
                        {/* Auditor Score Gauge */}
                        <div style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          padding: "24px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#0f172a",
                          textAlign: "center",
                          boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
                          border: "1px solid #e2e8f0"
                        }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>Điểm Thẩm Định</span>
                          <div style={{
                            position: "relative",
                            width: "110px",
                            height: "110px",
                            borderRadius: "50%",
                            border: "6px solid #f1f5f9",
                            borderTopColor: "#6366f1",
                            borderRightColor: "#a855f7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "16px 0",
                            boxShadow: "inset 0 0 4px rgba(0,0,0,0.02)"
                          }}>
                            <div>
                              <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                                {(() => {
                                  if (!aiResult) return 82;
                                  const match = aiResult.match(/Điểm tổng thể:\s*(\d+)/i) || aiResult.match(/(\d+)\s*\/\s*100/);
                                  if (match) {
                                    const s = parseInt(match[1]);
                                    if (s > 0 && s <= 100) return s;
                                  }
                                  return 82;
                                })()}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>/100</div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            padding: "4px 12px",
                            borderRadius: "20px",
                            background: (() => {
                              const s = (() => {
                                if (!aiResult) return 82;
                                const match = aiResult.match(/Điểm tổng thể:\s*(\d+)/i) || aiResult.match(/(\d+)\s*\/\s*100/);
                                if (match) {
                                  const v = parseInt(match[1]);
                                  if (v > 0 && v <= 100) return v;
                                }
                                return 82;
                              })();
                              return s >= 80 ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)";
                            })(),
                            color: (() => {
                              const s = (() => {
                                if (!aiResult) return 82;
                                const match = aiResult.match(/Điểm tổng thể:\s*(\d+)/i) || aiResult.match(/(\d+)\s*\/\s*100/);
                                if (match) {
                                  const v = parseInt(match[1]);
                                  if (v > 0 && v <= 100) return v;
                                }
                                return 82;
                              })();
                              return s >= 80 ? "#10b981" : "#f59e0b";
                            })()
                          }}>
                            {(() => {
                              const s = (() => {
                                if (!aiResult) return 82;
                                const match = aiResult.match(/Điểm tổng thể:\s*(\d+)/i) || aiResult.match(/(\d+)\s*\/\s*100/);
                                if (match) {
                                  const v = parseInt(match[1]);
                                  if (v > 0 && v <= 100) return v;
                                }
                                return 82;
                              })();
                              return s >= 80 ? "Khá Tốt" : "Cần Điều Chỉnh";
                            })()}
                          </span>
                        </div>

                        {/* Financial Metrics Cards Grid */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: "16px"
                        }}>
                          {/* Metric Card 1: Revenue */}
                          <div style={{ background: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                            <SectionTitle title="Doanh Thu Thuần" icon="bi-cash-stack" className="mb-2" style={{ fontSize: 12, color: "#2563eb" }} />
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>
                              {valNetRevenue.toLocaleString("vi-VN") + " đ"}
                            </div>
                          </div>

                          {/* Metric Card 2: Gross Margin */}
                          <div style={{ background: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                            <SectionTitle title="Biên Lợi Nhuận Gộp" icon="bi-graph-up-arrow" className="mb-2" style={{ fontSize: 12, color: "#059669" }} />
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>
                              {grossProfitMargin.toFixed(1)}%
                            </div>
                          </div>

                          {/* Metric Card 3: Company Fixed Cost */}
                          <div style={{ background: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                            <SectionTitle title="Chi Phí Cố Định Cấp Công Ty" icon="bi-house-gear-fill" className="mb-2" style={{ fontSize: 12, color: "#d97706" }} />
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>
                              {(f_ops_depr + f_ops_rent + f_ops_utilities).toLocaleString("vi-VN") + " đ"}
                            </div>
                          </div>

                          {/* Metric Card 4: OPEX ratio */}
                          <div style={{ background: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                            <SectionTitle title="Tỷ Lệ OPEX / Doanh Thu" icon="bi-pie-chart-fill" className="mb-2" style={{ fontSize: 12, color: "#7c3aed" }} />
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>
                              {(totalRevenue > 0 ? (totalStep2 / totalRevenue * 100) : 0).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive ApexCharts Section */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "24px",
                        marginBottom: "28px"
                      }}>
                        {/* Scenario chart container */}
                        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px 24px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                          <h5 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                            <i className="bi bi-bar-chart-steps" style={{ color: "#6366f1" }} />
                            So Sánh Kịch Bản Doanh Thu Kênh
                          </h5>
                          <Chart
                            options={{
                              chart: {
                                type: "bar",
                                toolbar: { show: false },
                                fontFamily: "Inter, sans-serif"
                              },
                              plotOptions: {
                                bar: {
                                  horizontal: false,
                                  columnWidth: "55%",
                                  borderRadius: 4
                                },
                              },
                              dataLabels: { enabled: false },
                              colors: ["#6366f1", "#10b981", "#ef4444"],
                              stroke: { show: true, width: 2, colors: ["transparent"] },
                              xaxis: {
                                categories: ["Đại lý", "OEM"],
                                labels: { style: { colors: "#64748b", fontWeight: 500 } }
                              },
                              yaxis: {
                                title: { text: "Doanh thu (tỷ VNĐ)", style: { color: "#64748b", fontWeight: 600 } },
                                labels: {
                                  formatter: (val: number) => (val / 1000000000).toFixed(1) + "B",
                                  style: { colors: "#64748b" }
                                }
                              },
                              fill: { opacity: 1 },
                              tooltip: {
                                y: {
                                  formatter: (val: number) => val.toLocaleString("vi-VN") + " đ"
                                }
                              },
                              legend: {
                                position: "top",
                                horizontalAlign: "left",
                                labels: { colors: "#334155" }
                              }
                            }}
                            series={[
                              {
                                name: "Kế hoạch (Base)",
                                data: [
                                  Number(revenueAgent) || 0,
                                  Number(revenueOEM) || 0
                                ]
                              },
                              {
                                name: "Lạc quan (+15%)",
                                data: [
                                  Math.round((Number(revenueAgent) || 0) * 1.15),
                                  Math.round((Number(revenueOEM) || 0) * 1.15)
                                ]
                              },
                              {
                                name: "Bi quan (-25%)",
                                data: [
                                  Math.round((Number(revenueAgent) || 0) * 0.75),
                                  Math.round((Number(revenueOEM) || 0) * 0.75)
                                ]
                              }
                            ]}
                            type="bar"
                            height={300}
                          />
                        </div>

                        {/* OPEX pie chart container */}
                        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px 24px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                          <h5 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                            <i className="bi bi-pie-chart" style={{ color: "#ec4899" }} />
                            Cơ Cấu Chi Phí Vận Hành (OPEX)
                          </h5>
                          <Chart
                            options={{
                              chart: {
                                type: "donut",
                                fontFamily: "Inter, sans-serif"
                              },
                              labels: ["Lương & KD", "Khối sản xuất", "Cố định Công ty", "Vận hành & Kho", "Chi phí khác"],
                              colors: ["#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#64748b"],
                              legend: {
                                position: "bottom",
                                labels: { colors: "#334155" }
                              },
                              dataLabels: {
                                enabled: true,
                                formatter: (val: number) => val.toFixed(1) + "%"
                              },
                              tooltip: {
                                y: {
                                  formatter: (val: number) => val.toLocaleString("vi-VN") + " đ"
                                }
                              },
                              plotOptions: {
                                pie: {
                                  donut: {
                                    size: "72%",
                                    labels: {
                                      show: true,
                                      total: {
                                        show: true,
                                        label: "TỔNG OPEX",
                                        color: "#64748b",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        formatter: (w: any) => {
                                          const sum = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                                          return sum.toLocaleString("vi-VN") + " đ";
                                        }
                                      },
                                      value: {
                                        show: true,
                                        fontSize: "16px",
                                        fontWeight: 700,
                                        color: "#0f172a",
                                        formatter: (val: string) => Number(val).toLocaleString("vi-VN") + " đ"
                                      }
                                    }
                                  }
                                }
                              }
                            }}
                            series={[
                              f_biz_salary,
                              f_mkt_ads + f_mkt_events + f_mkt_print,
                              f_ops_depr + f_ops_rent + f_ops_utilities,
                              f_ops_salary + f_ops_supplies + f_ops_cs + f_ops_logistics + f_ops_inv_writeoff + f_ops_bad_debt,
                              f_misc
                            ]}
                            type="donut"
                            height={300}
                          />
                        </div>
                      </div>

                      {/* SWOT Matrix Section */}
                      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px 24px", marginBottom: "32px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                        <h5 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                          <i className="bi bi-grid-3x3-gap-fill" style={{ color: "#10b981" }} />
                          Ma Trận SWOT Chiến Lược Tóm Tắt
                        </h5>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          {/* S */}
                          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
                              <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#166534", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>S</span>
                              Thế mạnh (Strengths)
                            </div>
                            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12.5px", color: "#1e3f20", lineHeight: "1.5" }}>
                              <li>Kênh phân phối đa kênh cân đối (Traditional, Ecom, Agent sỉ, Mở đại lý).</li>
                              <li>Biên lợi nhuận gộp tốt ở mức {grossProfitMargin.toFixed(1)}% nhờ tối ưu tốt giá vốn.</li>
                            </ul>
                          </div>

                          {/* W */}
                          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#991b1b", fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
                              <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#991b1b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>W</span>
                              Điểm yếu (Weaknesses)
                            </div>
                            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12.5px", color: "#3f1e1e", lineHeight: "1.5" }}>
                              <li>Chi phí cố định cấp công ty lớn (2.34 tỷ/năm) tạo áp lực lên điểm hòa vốn kinh doanh.</li>
                              <li>Định biên nhân sự gián tiếp CSKH & Hành chính chiếm {(grpFin).toFixed(0)} người ({((totalStep3 > 0 ? ((grpFin) / totalStep3) : 0) * 100).toFixed(0)}%).</li>
                            </ul>
                          </div>

                          {/* O */}
                          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1e40af", fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
                              <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>O</span>
                              Cơ hội (Opportunities)
                            </div>
                            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12.5px", color: "#1e2c3f", lineHeight: "1.5" }}>
                              <li>Kênh E-commerce tiếp cận tập khách hàng mới diện rộng với biên chi phí vận hành thấp.</li>
                              <li>Mô hình đại lý sỉ Voriger & Seajong gia tăng độ bao phủ địa lý toàn quốc nhanh chóng.</li>
                            </ul>
                          </div>

                          {/* T */}
                          <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "8px", padding: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#854d0e", fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
                              <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#854d0e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>T</span>
                              Thách thức (Threats)
                            </div>
                            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12.5px", color: "#3f3a1e", lineHeight: "1.5" }}>
                              <li>Cạnh tranh khốc liệt về giá bán từ các tổng kho ảo và các nhà sản xuất trực tiếp trên sàn TMĐT.</li>
                              <li>Quỹ lương chiếm {(totalStep2 > 0 ? ((grandTotalFund / totalStep2) * 100) : 0).toFixed(0)}% chi phí vận hành, rủi ro lớn khi doanh thu sụt giảm.</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Analysis Report Container with strict A4 margins: left 3cm (114px), others 2cm (76px) */}
                      <div style={{
                        background: "#ffffff",
                        padding: "76px 76px 76px 114px",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                        border: "1px solid #e2e8f0",
                      }}>
                        {renderMarkdown(aiResult)}
                      </div>
                    </>
                  ) : (
                    <div style={{
                      background: "#ffffff",
                      padding: "40px",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                      border: "1px solid #e2e8f0",
                      textAlign: "center",
                      color: "#64748b"
                    }}>
                      Không có dữ liệu phân tích. Vui lòng bấm nút phân tích AI.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "16px 28px",
              background: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex", justifyContent: "flex-end",
              flexShrink: 0
            }}>
              <button
                onClick={() => setIsAiModalOpen(false)}
                style={{
                  padding: "10px 24px",
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.2)",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                Tôi đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog xác nhận xoá chi phí */}
      <ConfirmDialog
        open={costConfirmOpen}
        title="Xác nhận xoá chi phí"
        message="Bạn có chắc chắn muốn xoá các khoản mục chi phí đã chọn?"
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        variant="danger"
        onConfirm={() => {
          setBizCosts(prev => prev.filter(i => !i.checked));
          setMktCosts(prev => prev.filter(i => !i.checked));
          setFinCosts(prev => prev.filter(i => !i.checked));
          setLogCosts(prev => prev.filter(i => !i.checked));
          setOpsCosts(prev => prev.filter(i => !i.checked));
          setMiscCosts(prev => prev.filter(i => !i.checked));
          setCostConfirmOpen(false);
        }}
        onCancel={() => setCostConfirmOpen(false)}
      />

      {/* Dialog xác nhận xoá nhân sự */}
      <ConfirmDialog
        open={staffConfirmOpen}
        title="Xác nhận xoá định biên"
        message="Bạn có chắc chắn muốn xoá các định biên nhân sự đã chọn?"
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        variant="danger"
        onConfirm={() => {
          setBizStaff(prev => prev.filter(i => !i.checked));
          setMktStaff(prev => prev.filter(i => !i.checked));
          setLogStaff(prev => prev.filter(i => !i.checked));
          setFinStaff(prev => prev.filter(i => !i.checked));
          setStaffConfirmOpen(false);
        }}
        onCancel={() => setStaffConfirmOpen(false)}
      />

      {/* Dialog nhập tên khoản mục mới (Custom Prompt) */}
      <AnimatePresence>
        {costPromptOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCostPromptOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(4px)",
                zIndex: 100100,
                cursor: "pointer"
              }}
            />

            {/* Prompt Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                position: "fixed",
                inset: 0,
                margin: "auto",
                zIndex: 100101,
                width: "min(420px, calc(100vw - 40px))",
                height: "fit-content",
                background: "#ffffff",
                borderRadius: 18,
                boxShadow: "0 24px 60px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.05)",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#0f172a", lineHeight: 1.3 }}>
                  Nhập tên khoản mục chi phí mới:
                </p>
                <input
                  type="text"
                  className="form-control mt-3"
                  style={{
                    borderRadius: 10,
                    borderColor: "#8a307f",
                    boxShadow: "none",
                    padding: "10px 14px",
                    fontSize: 14,
                    outline: "none"
                  }}
                  value={costPromptValue}
                  onChange={(e) => setCostPromptValue(e.target.value)}
                  placeholder="Ví dụ: Chi phí kiểm định..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirmCostPrompt();
                    } else if (e.key === "Escape") {
                      setCostPromptOpen(false);
                    }
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  onClick={() => setCostPromptOpen(false)}
                  style={{
                    padding: "9px 22px",
                    borderRadius: 15,
                    border: "none",
                    background: "#ffe5ec",
                    color: "#8a307f",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "opacity 0.15s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  Huỷ
                </button>
                <button
                  onClick={handleConfirmCostPrompt}
                  style={{
                    padding: "9px 22px",
                    borderRadius: 15,
                    border: "none",
                    background: "#8a307f",
                    color: "#ffffff",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "opacity 0.15s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dialog nhập tên định biên mới (Custom Prompt) */}
      <AnimatePresence>
        {staffPromptOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStaffPromptOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(4px)",
                zIndex: 100100,
                cursor: "pointer"
              }}
            />

            {/* Prompt Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                position: "fixed",
                inset: 0,
                margin: "auto",
                zIndex: 100101,
                width: "min(420px, calc(100vw - 40px))",
                height: "fit-content",
                background: "#ffffff",
                borderRadius: 18,
                boxShadow: "0 24px 60px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.05)",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#0f172a", lineHeight: 1.3 }}>
                  Nhập tên chức danh/định biên mới:
                </p>
                <input
                  type="text"
                  className="form-control mt-3"
                  style={{
                    borderRadius: 10,
                    borderColor: "#8a307f",
                    boxShadow: "none",
                    padding: "10px 14px",
                    fontSize: 14,
                    outline: "none"
                  }}
                  value={staffPromptValue}
                  onChange={(e) => setStaffPromptValue(e.target.value)}
                  placeholder="Ví dụ: Nhân viên kỹ thuật..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirmStaffPrompt();
                    } else if (e.key === "Escape") {
                      setStaffPromptOpen(false);
                    }
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  onClick={() => setStaffPromptOpen(false)}
                  style={{
                    padding: "9px 22px",
                    borderRadius: 15,
                    border: "none",
                    background: "#ffe5ec",
                    color: "#8a307f",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "opacity 0.15s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  Huỷ
                </button>
                <button
                  onClick={handleConfirmStaffPrompt}
                  style={{
                    padding: "9px 22px",
                    borderRadius: 15,
                    border: "none",
                    background: "#8a307f",
                    color: "#ffffff",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "opacity 0.15s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}