"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Button } from "@/components/common/Button";
import { EmployeeSelect, fetchEmployeesFromDb, EmployeeItem } from "@/components/common/EmployeeSelect";
import { TrangThaiTonKhoBadge } from "@/components/plan-finance/dung_chung/TrangThaiTonKhoBadge";
import { genDocCode } from "@/lib/genDocCode";
import { HoverImage } from "@/components/ui/HoverImage";

// ── Types ─────────────────────────────────────────────────────────────────────
export type CustomerRow = {
  id: string; name: string; nhom: string | null; nguon: string | null;
  dienThoai: string | null; email: string | null;
  address: string | null; daiDien: string | null; xungHo: string | null;
  chucVu: string | null; ghiChu: string | null;
  nguoiChamSoc: { id: string; fullName: string } | null;
  nguoiChamSocId: string | null;
  createdAt: string;
};

export type QuoteItem = {
  id: number; ten: string; dvt: string; soLuong: number;
  donGia: number; ckPct: number; soLuongTon: number | null;
  trangThaiKho: string | null; inventoryId: string | null;
  viTri?: string;
  viTriChiTiet?: string;
  giaDaiLy?: number;
  imageUrl?: string | null;
  code?: string | null;
  dinhMucs?: any[];
  dinhMucId?: string | null;
  dinhMucTen?: string | null;
  bomCode?: string | null;
  khoTen?: string | null;
  source?: string | null;
  loiNhuanKyVong?: number;
  phuongPhapTinhLoiNhuan?: string;
  baseGiaBan?: number;
};

export interface QuotationEditData {
  id: string;
  code: string | null;
  ngayBaoGia: string | null;
  ngayHetHan: string | null;
  trangThai: string;
  uuTien: string;
  discount?: number | null;
  vat?: number | null;
  chiPhiThiCong?: number | null;
  tongTien?: number | null;
  thanhTien?: number | null;
  ghiChu?: string | null;
  quoteType?: string | null;
  fileKhuVuc1?: string | null;
  fileKhuVuc2?: string | null;
  fileKhuVuc3?: string | null;
  fileKhuVuc4?: string | null;
  fileKhuVuc5?: string | null;
  items?: Array<{
    tenHang: string; donVi?: string;
    soLuong?: number; donGia?: number; thanhTien?: number;
    ghiChu?: string | null;
  }>;
}

// ── Helper: số → chữ (VND) ─────────────────────────────────────────────────
export function numberToVNWords(n: number): string {
  if (n === 0) return "Không đồng";
  const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const teens = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
  function readHundred(h: number): string {
    const c = Math.floor(h / 100), t = Math.floor((h % 100) / 10), u = h % 10;
    let r = c > 0 ? ones[c] + " trăm" : "";
    if (t === 1) r += (r ? " " : "") + teens[u];
    else if (t > 1) r += (r ? " " : "") + ones[t] + " mươi" + (u > 0 ? " " + (u === 5 ? "lăm" : ones[u]) : "");
    else if (u > 0 && c > 0) r += " lẻ " + ones[u];
    else if (u > 0) r += ones[u];
    return r;
  }
  const groups = [
    { v: 1_000_000_000, s: "tỷ" }, { v: 1_000_000, s: "triệu" },
    { v: 1_000, s: "nghìn" }, { v: 1, s: "" },
  ];
  let result = "", num = Math.round(n);
  for (const g of groups) {
    const q = Math.floor(num / g.v);
    if (q > 0) {
      result += (result ? " " : "") + readHundred(q) + (g.s ? " " + g.s : "");
      num %= g.v;
    }
  }
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

export function parseGuestInfo(ghiChu: string | null | undefined): { name: string; dienThoai: string; address: string } | null {
  if (!ghiChu) return null;
  const match = ghiChu.match(/\[GuestInfo:(.*?)\]/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function cleanGhiChu(ghiChu: string | null | undefined): string {
  if (!ghiChu) return "";
  return ghiChu.replace(/\[GuestInfo:(.*?)\]\n?/, "").trim();
}

export function getDefaultGhiChu(ngayLapStr: string | null | undefined, hieuLucStr: string | null | undefined, thue?: number): string {
  let diffDays = 30;
  if (ngayLapStr && hieuLucStr) {
    const d1 = new Date(ngayLapStr);
    const d2 = new Date(hieuLucStr);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffTime = d2.getTime() - d1.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }
  const vatText = (thue !== undefined && thue > 0) ? "đã bao gồm thuế GTGT" : "chưa bao gồm thuế GTGT";
  return `- Giá trị báo giá trên đã bao gồm phí vận chuyển và ${vatText}\n` +
    `- Trong mọi trường hợp khi Quý khách hàng hủy đơn hàng sẽ không được hoàn trả tiền cọc.\n` +
    `- Báo giá này có hiệu lực trong vòng ${diffDays} ngày kể từ ngày ban hành. Sau thời gian này, nếu Quý khách hàng chưa đặt cọc và giá sản phẩm có thay đổi sẽ áp dụng mức giá mới tại thời điểm Quý khách hàng tiến hành đặt cọc. Từ thời điểm hoàn tất đặt cọc đến khi nhận hàng, nếu giá sản phẩm có sự điều chỉnh tăng do các yếu tố như chi phí sản xuất, logistics hoặc chính sách nhà nước,…chúng tôi cam kết giữ nguyên mức giá đã thỏa thuận. Ngược lại, nếu giá sản phẩm giảm sẽ điều chỉnh và áp dụng mức giá đúng tại thời điểm nhận hàng.`;
}


// ── Privates helpers/styles ──────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: "100%", padding: "7px 10px", border: "1px solid #cbd5e1",
  background: "#ffffff", color: "#1e293b",
  fontSize: 13, outline: "none", borderRadius: 6, fontFamily: "inherit",
  transition: "border-color 0.15s, box-shadow 0.15s",
};
const FLabel = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
    {text}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
  </label>
);

function NumericInput({
  value,
  onChange,
  min,
  max,
  emptyValue = 0,
  resetKey,
  placeholder = "",
  style,
  disabled,
  readOnly,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  emptyValue?: number;
  resetKey?: string | number | boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const [display, setDisplay] = React.useState<string>(() => String(value));
  const isClearedRef = React.useRef(false);

  React.useEffect(() => {
    isClearedRef.current = false;
    setDisplay(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  React.useEffect(() => {
    if (isClearedRef.current && value === emptyValue) {
      return;
    }
    isClearedRef.current = false;
    setDisplay(String(value));
  }, [value, emptyValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }
    if (cleaned.length > 1 && cleaned.startsWith("0") && !cleaned.startsWith("0.")) {
      cleaned = cleaned.replace(/^0+/, "") || "0";
    }

    if (cleaned === "" || cleaned === ".") {
      isClearedRef.current = true;
      setDisplay("");
      onChange(emptyValue);
      return;
    }

    isClearedRef.current = false;
    let num = Number(cleaned);
    if (max !== undefined && num > max) {
      num = max;
      cleaned = String(max);
    }
    setDisplay(cleaned);
    onChange(min !== undefined ? Math.max(min, num) : num);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      onChange={handleChange}
      style={style}
    />
  );
}

// ── Print Preview Modal ─────────────────────────────────────────────────────
function PrintPreviewModal({ open, onClose, customer, items, info, initialAction }: any) {
  const { user } = useAuth();
  const session = { user };
  const toast = useToast();
  const [landscape, setLandscape] = React.useState(false);
  const [company, setCompany] = React.useState<any>({});
  const [pdfUploading, setPdfUploading] = React.useState(false);
  const isSanitary = true;
  const [showStamp, setShowStamp] = React.useState(true);

  // **Blank Print Preview Fix**:
  // - The previous print CSS hidden all elements on the page except `#print-preview-root` via `body > *:not(#print-preview-root) { display: none !important; }`. However, since the react app root is the parent of the preview element, it was set to `display: none`, making the print dialog blank.
  // - Replaced it with standard `visibility: hidden` rules on `body` and `visibility: visible` on `#print-preview-root` and its children, placing it absolute-positioned over the page flow. This ensures the quotation document is printed properly with correct styling and multiple page flow.

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/company").then(r => r.json()).then(setCompany).catch(() => { });
  }, [open]);

  React.useEffect(() => {
    if (!open || !initialAction) return;
    const timer = setTimeout(() => {
      if (initialAction === "print") {
        handlePrint();
      } else if (initialAction === "pdf") {
        handleExportPDF().finally(() => {
          onClose();
        });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [open, initialAction]);

  if (!open) return null;

  const isCoQuayKe = info.quoteType === "Có quầy kệ" && isSanitary;
  const uniqueAreas = Array.from(new Set(items.filter((it: any) => it.ten).map((it: any) => {
    if (it.viTri) return it.viTri;
    try {
      if (it.ghiChu) {
        const parsed = JSON.parse(it.ghiChu);
        return parsed.viTri || parsed.khuVuc || "Khu vực 1";
      }
    } catch (e) { }
    return "Khu vực 1";
  })));
  const hasMultipleAreas = isCoQuayKe && uniqueAreas.length > 1;
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const thanhTien = (it: any) => isCoQuayKe ? (it.giaDaiLy ?? it.thanhTien ?? 0) : it.soLuong * it.donGia * (1 - it.ckPct / 100);
  const tamTinh = items.reduce((s: any, it: any) => s + thanhTien(it), 0);
  const ckTien = tamTinh * info.chietKhauTong / 100;
  const truocThue = tamTinh - ckTien;
  const thueTien = truocThue * info.thue / 100;
  const chiPhiThiCong = info.chiPhiThiCong ?? 0;
  const tongCong = truocThue + thueTien + (isCoQuayKe ? chiPhiThiCong : 0);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")} tháng ${String(d.getMonth() + 1).padStart(2, "0")} năm ${d.getFullYear()}`;
  };

  const paperW = landscape ? 297 : 210;
  const paperH = landscape ? 210 : 297;
  const handlePrint = () => {
    const docEl = document.getElementById("print-paper-doc");
    if (!docEl) { window.print(); return; }

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
    document.body.appendChild(iframe);

    const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iDoc) { window.print(); return; }

    iDoc.open();
    iDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Báo giá ${info.soPhieu || ""}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap">
  <style>
    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    @page { 
      size: A4 ${landscape ? "landscape" : "portrait"}; 
      margin: 0 !important; 
    }
    body { 
      margin: 0; padding: 0; 
      font-family: 'Roboto Condensed', Arial Narrow, Arial, sans-serif; 
      font-size: 10px; color: #111; 
      background: #fff;
    }
    .print-cover {
      width: ${landscape ? "297mm" : "210mm"} !important;
      height: ${landscape ? "210mm" : "297mm"} !important;
      page-break-after: always !important;
      break-after: page !important;
      background: #fff !important;
      padding: 20mm 20mm 20mm 30mm !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
    }
    .print-letter {
      width: ${landscape ? "297mm" : "210mm"} !important;
      height: ${landscape ? "210mm" : "297mm"} !important;
      page-break-after: always !important;
      break-after: page !important;
      background: #fff !important;
      padding: 20mm 20mm 20mm 30mm !important;
      box-sizing: border-box !important;
    }
    .print-details {
      width: ${landscape ? "297mm" : "210mm"} !important;
      min-height: ${landscape ? "210mm" : "297mm"} !important;
      background: #fff !important;
      padding: 14mm 15mm !important;
      box-sizing: border-box !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background-color: #003087 !important;
      color: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body>
  ${docEl.innerHTML}
</body>
</html>`);
    iDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }, 600);
  };
  const handleExportPDF = async () => {
    if (pdfUploading) return;
    setPdfUploading(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("print-paper-doc") as HTMLElement;
      if (!element) {
        toast.error("Lỗi", "Không tìm thấy nội dung báo giá");
        setPdfUploading(false);
        return;
      }

      const originalGap = element.style.gap;
      element.style.gap = "0";

      const pages = element.querySelectorAll(".print-paper") as NodeListOf<HTMLElement>;
      const originalShadows: string[] = [];
      pages.forEach((page, idx) => {
        originalShadows[idx] = page.style.boxShadow;
        page.style.boxShadow = "none";
      });

      const opt = {
        margin: 0,
        filename: `Bao_gia_${info.soPhieu || "Sanitary"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: (landscape ? "landscape" : "portrait") as "landscape" | "portrait" },
        pagebreak: { mode: ['avoid-all', 'css'] }
      };

      const pdfBlob = (await html2pdf().set(opt).from(element).output("blob")) as Blob;

      element.style.gap = originalGap;
      pages.forEach((page, idx) => {
        page.style.boxShadow = originalShadows[idx];
      });

      const foldersRes = await fetch("/api/media-library/folders");
      if (!foldersRes.ok) {
        throw new Error("Không thể kết nối thư viện tài liệu");
      }
      const foldersData = await foldersRes.json();
      const foldersList = foldersData.data || [];

      const currentUserId = (session?.user as any)?.id;
      const currentUserName = (session?.user as any)?.name;
      const currentUserDept = (session?.user as any)?.departmentCode || "ALL";

      if (!currentUserId) {
        throw new Error("Không xác thực được tài khoản của bạn. Vui lòng đăng nhập lại.");
      }

      let userFolder = foldersList.find(
        (f: any) => f.ownerId === currentUserId && f.parentId === null && !f.isPublic
      );

      if (!userFolder) {
        const initRes = await fetch("/api/media-library/init-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            userId: currentUserId,
            userName: currentUserName,
            departmentCode: currentUserDept,
          }),
        });

        if (!initRes.ok) {
          throw new Error("Khởi tạo thư mục tài liệu cá nhân thất bại");
        }

        const refetchRes = await fetch("/api/media-library/folders");
        if (!refetchRes.ok) {
          throw new Error("Không thể đồng bộ thư mục sau khi tạo mới");
        }
        const refetchedData = await refetchRes.json();
        const refetchedList = refetchedData.data || [];
        userFolder = refetchedList.find(
          (f: any) => f.ownerId === currentUserId && f.parentId === null && !f.isPublic
        );

        if (!userFolder) {
          throw new Error("Không tìm thấy thư mục cá nhân sau khi khởi tạo tự động");
        }
      }

      const fileName = `Bao_gia_${info.soPhieu || "Sanitary"}.pdf`;
      const fileToUpload = new File([pdfBlob], fileName, { type: "application/pdf" });

      const fd = new FormData();
      fd.append("file", fileToUpload);
      fd.append("folderId", userFolder.id);
      fd.append("name", fileName);
      fd.append("description", `Báo giá sản phẩm thiết bị vệ sinh số ${info.soPhieu || ""}`);
      fd.append("type", "template");
      fd.append("channel", "all");
      fd.append("isPublic", "false");

      const uploadRes = await fetch("/api/media-library/assets", {
        method: "POST",
        body: fd,
      });

      const uploadResult = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(uploadResult?.error || `Upload thất bại: ${uploadRes.status}`);
      }

      toast.success("Thành công", `Đã lưu báo giá trực tiếp vào Thư viện tài liệu của ${currentUserName}`);
    } catch (error: any) {
      console.error("Lỗi khi lưu vào thư viện:", error);
      toast.error("Lỗi", error.message || "Không thể lưu báo giá vào thư viện");
    } finally {
      setPdfUploading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap');
        @media print {
          @page {
            size: A4 ${landscape ? "landscape" : "portrait"} !important;
            margin: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
          }
          #__next, main, div, section {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          body {
            visibility: hidden !important;
            background: #fff !important;
          }
          #print-preview-root, #print-preview-root * {
            visibility: visible !important;
          }
          #print-preview-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #fff !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-paper {
            box-shadow: none !important;
            margin: 0 !important;
            display: block !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          .print-cover {
            width: ${landscape ? "297mm" : "210mm"} !important;
            height: ${landscape ? "210mm" : "297mm"} !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 20mm 20mm 20mm 30mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }
          .print-letter {
            width: ${landscape ? "297mm" : "210mm"} !important;
            height: ${landscape ? "210mm" : "297mm"} !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 20mm 20mm 20mm 30mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }
          .print-details {
            width: ${landscape ? "297mm" : "210mm"} !important;
            min-height: ${landscape ? "210mm" : "297mm"} !important;
            padding: 14mm 15mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }
          .print-drawings {
            width: ${landscape ? "297mm" : "210mm"} !important;
            height: ${landscape ? "210mm" : "297mm"} !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 20mm 20mm 20mm 30mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }
        }
        
        /* Force general text to black on simulated A4 paper pages (both on screen and print) */
        #print-preview-root .print-paper p,
        #print-preview-root .print-paper td,
        #print-preview-root .print-paper div,
        #print-preview-root .print-paper span,
        #print-preview-root .print-paper strong,
        #print-preview-root .print-paper a,
        #print-preview-root .print-paper li {
          color: #000 !important;
        }
        /* Keep table header text white */
        #print-preview-root .print-paper th,
        #print-preview-root .print-paper th * {
          color: #fff !important;
        }
        /* Keep primary blue branding text */
        #print-preview-root .print-paper [style*="color: #003087"],
        #print-preview-root .print-paper [style*="color:#003087"],
        #print-preview-root .print-paper [style*="color: rgb(0, 48, 135)"],
        #print-preview-root .print-paper [style*="color:rgb(0,48,135)"],
        #print-preview-root .print-paper [style*="color: #003087"] *,
        #print-preview-root .print-paper [style*="color:#003087"] *,
        #print-preview-root .print-paper [style*="color: rgb(0, 48, 135)"] *,
        #print-preview-root .print-paper [style*="color:rgb(0,48,135)"] * {
          color: #003087 !important;
        }
      `}</style>
      <div id="print-preview-root" style={initialAction === "pdf" ? { position: "absolute", left: "-9999px", top: "-9999px", width: "1000px", height: "auto", overflow: "hidden" } : { position: "fixed", inset: 0, zIndex: 4000, background: "#e8eaed", display: "flex", flexDirection: "column" }}>
        <div className="no-print" style={{ height: 52, background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Xem trước báo giá</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#d1d5db", fontSize: 13 }}>
              <span>Khổ giấy:</span>
              {(["Dọc", "Ngang"] as const).map((label, i) => (
                <button key={label} onClick={() => setLandscape(i === 1)}
                  style={{
                    padding: "4px 12px", border: "1px solid", borderRadius: i === 0 ? "6px 0 0 6px" : "0 6px 6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: landscape === (i === 1) ? "#003087" : "transparent",
                    borderColor: "#4b5563", color: landscape === (i === 1) ? "#fff" : "#9ca3af",
                  }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#d1d5db", fontSize: 13, marginLeft: 8, marginRight: 8 }}>
              <span>Con dấu:</span>
              <div
                onClick={() => setShowStamp(!showStamp)}
                style={{
                  width: 38,
                  height: 20,
                  borderRadius: 10,
                  background: showStamp ? "#003087" : "#4b5563",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: showStamp ? 20 : 2,
                    transition: "left 0.2s"
                  }}
                />
              </div>
            </div>
            <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #4b5563", background: "transparent", color: "#d1d5db", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Đóng</button>
            <button onClick={handlePrint} style={{ padding: "6px 18px", border: "none", background: "#003087", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-printer" style={{ fontSize: 13 }} /> In
            </button>
            <button onClick={handleExportPDF} disabled={pdfUploading} style={{ padding: "6px 18px", border: "none", background: pdfUploading ? "#6b7280" : "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: pdfUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {pdfUploading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 13, height: 13, borderWidth: "2px" }} />
                  <span>Đang xuất...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-file-earmark-pdf" style={{ fontSize: 13 }} />
                  <span>Xuất PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="print-preview-container" style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "32px 24px" }}>
          <div id="print-paper-doc" style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
            {/* Trang bìa cho báo giá đối tác/đại lý (Có quầy kệ) */}
            {isCoQuayKe && (
              <div className="print-paper print-cover" style={{
                width: `${paperW}mm`,
                height: `${paperH}mm`,
                background: "#fff",
                boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
                padding: "20mm 20mm 20mm 30mm",
                boxSizing: "border-box",
                fontSize: 10,
                lineHeight: 1.5,
                fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
                color: "#111",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                pageBreakAfter: "always",
                breakAfter: "page"
              }}>
                {/* Header: Logo & Tên thương hiệu */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {company.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ height: "40px", width: "auto", objectFit: "contain" }} />}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 12, color: "#003087", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {company.name || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
                    </div>
                    <div style={{ fontSize: 9, color: "#6b7280" }}>
                      Thương hiệu Thiết bị vệ sinh & Nhà bếp cao cấp
                    </div>
                  </div>
                </div>

                {/* Banner hình ảnh bìa */}
                <div style={{ width: "100%", textAlign: "center" }}>
                  <img
                    src="/seajong_cover.png"
                    alt="Sejong Cover"
                    style={{
                      width: "100%",
                      height: landscape ? "85mm" : "120mm",
                      objectFit: "cover",
                      borderRadius: 8,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.12)"
                    }}
                  />
                </div>

                {/* Tiêu đề chính */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#003087", letterSpacing: 1, textTransform: "uppercase" }}>
                    HỒ SƠ BÁO GIÁ
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", marginTop: 4, letterSpacing: 0.5 }}>
                    Dự án quầy kệ trưng bày thiết bị vệ sinh Sejong
                  </div>
                </div>

                {/* Thông tin đối tác & Báo giá */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, borderTop: "2px solid #003087", paddingTop: 15, fontSize: 11 }}>
                  <div>
                    <div style={{ color: "#6b7280", fontWeight: 700, fontSize: 9, textTransform: "uppercase", marginBottom: 3 }}>
                      Khách hàng / Đối tác
                    </div>
                    <div style={{ fontWeight: 800, color: "#111", fontSize: 13 }}>
                      {customer?.name ?? "—"}
                    </div>
                    {customer?.address && (
                      <div style={{ color: "#374151", marginTop: 3 }}>
                        Địa chỉ: {customer.address}
                      </div>
                    )}
                    {customer?.daiDien && (
                      <div style={{ color: "#374151", marginTop: customer?.address ? 0 : 3 }}>
                        Đại diện: {customer.xungHo ?? ""} {customer.daiDien}
                      </div>
                    )}
                    {customer?.dienThoai && (
                      <div style={{ color: "#374151" }}>
                        Điện thoại: {customer.dienThoai}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ color: "#6b7280", fontWeight: 700, fontSize: 9, textTransform: "uppercase", marginBottom: 3 }}>
                      Thông tin hồ sơ
                    </div>
                    <div style={{ fontWeight: 800, color: "#003087", fontSize: 13 }}>
                      Số: {info.soPhieu}
                    </div>
                    <div style={{ color: "#374151", marginTop: 3 }}>
                      Ngày lập: {fmtDate(info.ngayLap)}
                    </div>
                    <div style={{ color: "#374151" }}>
                      Hiệu lực: {fmtDate(info.hieuLuc)}
                    </div>
                  </div>
                </div>

                {/* Footer chân trang */}
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: "#9ca3af" }}>
                  <div>Website: www.seajong.com</div>
                  <div>Hotline: {(company.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()}</div>
                </div>
              </div>
            )}

            {/* Page 2: Thư ngỏ cho báo giá đối tác/đại lý (Có quầy kệ) */}
            {isCoQuayKe && (
              <div className="print-paper print-letter" style={{
                width: `${paperW}mm`,
                height: `${paperH}mm`,
                background: "#fff",
                boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
                padding: "20mm 20mm 20mm 30mm",
                boxSizing: "border-box",
                fontSize: 11,
                lineHeight: 1.45,
                fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
                color: "#111",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                pageBreakAfter: "always",
                breakAfter: "page"
              }}>
                {/* Top decorative bar */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "5px",
                  background: "linear-gradient(90deg, #003087 0%, #0056b3 100%)"
                }} />

                <div>
                  {/* Header: Logo and Brand Info */}
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", borderBottom: "1.5px solid #003087", paddingBottom: "8px", marginBottom: "12px" }}>
                    {company.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ height: "36px", width: "auto", objectFit: "contain" }} />}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "11px", color: "#003087", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {company.name || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
                      </div>
                      <div style={{ fontSize: "8.5px", color: "#6b7280" }}>
                        Thương hiệu Thiết bị vệ sinh & Nhà bếp cao cấp Hàn Quốc
                      </div>
                    </div>
                  </div>

                  {/* Title of Letter */}
                  <div style={{ textAlign: "center", margin: "8px 0 12px 0" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#003087", letterSpacing: "1px", textTransform: "uppercase" }}>
                      THƯ MỜI HỢP TÁC KINH DOANH
                    </div>
                    <div style={{ fontSize: "9.5px", color: "#4b5563", fontStyle: "italic", marginTop: "2px" }}>
                      (V/v: Hợp tác Phát triển Đại lý / Nhà phân phối thiết bị vệ sinh Sejong)
                    </div>
                    <div style={{ width: "40px", height: "2px", background: "#003087", margin: "6px auto 0" }} />
                  </div>

                  {/* Salutation */}
                  <p style={{ margin: "0 0 8px 0", fontSize: "11px" }}>
                    <strong>Kính gửi: Quý Đối tác / Quý Khách hàng,</strong>
                  </p>

                  {/* Body Text */}
                  <div style={{ textAlign: "justify", fontSize: "11px", color: "#374151" }}>
                    <p style={{ margin: "0 0 6px 0" }}>
                      Lời đầu tiên, Ban lãnh đạo cùng toàn thể đội ngũ <strong>{company.name || "Sejong Faucet Việt Nam"}</strong> xin gửi lời chào trân trọng, lời chúc sức khỏe và lời chúc cho hoạt động kinh doanh của Quý đối tác ngày càng phát triển thịnh vượng.
                    </p>
                    <p style={{ margin: "0 0 6px 0" }}>
                      <strong>{company.name || "Sejong Faucet Việt Nam"}</strong> là đơn vị phân phối chính hãng các dòng sản phẩm thiết bị vệ sinh và phòng tắm cao cấp mang thương hiệu Hàn Quốc. Với nhiều năm kinh nghiệm trên thị trường, chúng tôi tự hào mang đến những dòng sản phẩm sở hữu công nghệ đột phá, thiết kế dẫn đầu xu hướng và độ bền vượt trội, đã và đang được hàng triệu người tiêu dùng, chủ thầu tin tưởng lựa chọn.
                    </p>
                    <p style={{ margin: "0 0 6px 0" }}>
                      Với mục tiêu mở rộng mạng lưới phân phối và mang những sản phẩm chất lượng đến gần hơn với khách hàng trên toàn quốc, chúng tôi trân trọng gửi lời mời hợp tác kinh doanh đến Quý đối tác với vai trò là Đại lý chính thức.
                    </p>
                    <p style={{ margin: "0 0 10px 0" }}>
                      Chúng tôi xin gửi kèm theo thư này Bảng báo giá sản phẩm dành riêng cho Đại lý cùng Chính sách chiết khấu thương mại mới nhất năm 2026.
                    </p>

                    {/* Bullet Points of Advantages (Beautiful Cards layout) */}
                    <div style={{ fontWeight: 800, fontSize: "11px", color: "#003087", marginBottom: "6px", borderLeft: "3px solid #003087", paddingLeft: "6px" }}>
                      NHỮNG ĐẶC QUYỀN VÀ CHÍNH SÁCH HỖ TRỢ TỐI ƯU DÀNH CHO ĐẠI LÝ:
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
                      {[
                        {
                          title: "Chính sách giá & Chiết khấu hấp dẫn",
                          desc: "Mức chiết khấu cao, cạnh tranh bậc nhất thị trường, đảm bảo biên độ lợi nhuận tối ưu và bền vững cho Đại lý. Có thưởng doanh số tháng/quý/năm cực kỳ linh hoạt.",
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
                          )
                        },
                        {
                          title: "Sản phẩm chất lượng – Nguồn hàng ổn định",
                          desc: "Sản phẩm có đầy đủ chứng nhận chất lượng (CO, CQ, ISO...), mẫu mã đa dạng, đón đầu xu hướng tiêu dùng. Kho hàng lớn, cam kết cung ứng kịp thời, không làm gián đoạn việc kinh doanh của Đại lý.",
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 11 2 2 4-4"></path></svg>
                          )
                        },
                        {
                          title: "Hỗ trợ truyền thông và Marketing",
                          desc: "Được hỗ trợ hình ảnh, video, catalogue, standee, biển bảng và tài liệu kỹ thuật. Công ty hỗ trợ đẩy data khách hàng khu vực trực tiếp về cho Đại lý.",
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m3 11 18-5v12L3 13v-2z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>
                          )
                        },
                        {
                          title: "Hỗ trợ đào tạo & Kỹ thuật",
                          desc: "Đội ngũ chuyên gia của chúng tôi sẽ đào tạo miễn phí về kiến thức sản phẩm, kỹ năng tư vấn chốt sales và hỗ trợ kỹ thuật lắp đặt 24/7.",
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                          )
                        },
                        {
                          title: "Chính sách bảo hành và Hậu mãi dẫn đầu",
                          desc: "Cam kết bảo hành chính hãng nhanh chóng, thủ tục đổi trả linh hoạt đối với các sản phẩm lỗi từ nhà sản xuất, bảo vệ uy tín tối đa cho Đại lý trước người tiêu dùng.",
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                          )
                        }
                      ].map((item, index) => (
                        <div key={index} style={{
                          background: "#f8fafc",
                          padding: "5px 10px",
                          borderRadius: "4px"
                        }}>
                          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "2px" }}>
                            {item.icon}
                            <div style={{ fontWeight: 700, color: "#003087", fontSize: "11px" }}>
                              {index + 1}. {item.title}
                            </div>
                          </div>
                          <div style={{ fontSize: "11px", color: "#475569", lineHeight: 1.35, paddingLeft: "21px" }}>
                            {item.desc}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p style={{ margin: "0 0 6px 0" }}>
                      Chúng tôi tôn trọng triết lý kinh doanh <strong>"Hợp tác cùng phát triển – Chia sẻ thành công"</strong>. Chúng tôi tin tưởng rằng, sự nhạy bén trong kinh doanh của Quý đối tác kết hợp với chất lượng sản phẩm và chính sách vượt trội của chúng tôi sẽ tạo nên một bước bứt phá doanh thu mạnh mẽ cho cả hai bên.
                    </p>
                    <p style={{ margin: "0" }}>
                      Một lần nữa, xin chân thành cảm ơn sự quan tâm của Quý đối tác. Kính chúc mối quan hệ hợp tác của chúng ta sớm được thiết lập và gặt hái nhiều thành công rực rỡ!
                    </p>

                    {/* Representative signature block */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                      <div style={{ textAlign: "center", minWidth: "150px" }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "11px", color: "#374151" }}>Trân trọng,</p>
                        <div style={{ height: "40px" }} />
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "11px", color: "#003087" }}>{company.legalRep || "ĐẠI DIỆN SEJONG"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with hotline only */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e5e7eb", paddingTop: "8px", marginTop: "10px" }}>
                  <div style={{ fontSize: "8.5px", color: "#9ca3af" }}>
                    Website: www.seajong.com | Hotline: {(company.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()}
                  </div>
                </div>
              </div>
            )}

            {/* Page 3: Bản vẽ đính kèm */}
            {(() => {
              const drawingsList = [
                { label: "Bản vẽ KV 1", url: info.fileKhuVuc1 },
                { label: "Bản vẽ KV 2", url: info.fileKhuVuc2 },
                { label: "Bản vẽ KV 3", url: info.fileKhuVuc3 },
                { label: "Bản vẽ KV 4", url: info.fileKhuVuc4 },
                { label: "Bản vẽ KV 5", url: info.fileKhuVuc5 },
              ].filter(d => d.url);

              if (!isCoQuayKe || drawingsList.length === 0) return null;

              return (
                <div className="print-paper print-drawings" style={{
                  width: `${paperW}mm`,
                  height: `${paperH}mm`,
                  background: "#fff",
                  boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
                  padding: "20mm 20mm 20mm 30mm",
                  boxSizing: "border-box",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "'Roboto Condensed', sans-serif"
                }}>
                  {/* Top decorative bar */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "5px",
                    background: "linear-gradient(90deg, #003087 0%, #0056b3 100%)"
                  }} />

                  {/* Header: Logo and Brand Info */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #003087", paddingBottom: "8px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      {company.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ height: "36px", width: "auto", objectFit: "contain" }} />}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "11px", color: "#003087", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {company.name || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
                        </div>
                        <div style={{ fontSize: "8.5px", color: "#6b7280" }}>
                          Thương hiệu Thiết bị vệ sinh & Nhà bếp cao cấp Hàn Quốc
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#003087", letterSpacing: "1px", textTransform: "uppercase" }}>BẢN VẼ ĐÍNH KÈM</div>
                      <div style={{ fontSize: "9.5px", color: "#374151", fontStyle: "italic", marginTop: "2px" }}>Số báo giá: {info.soPhieu}</div>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "15px", minHeight: 0 }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: drawingsList.length === 1 ? "1fr" : "1fr 1fr",
                      gridTemplateRows: `repeat(${drawingsList.length <= 2 ? 1 : (drawingsList.length <= 4 ? 2 : 3)}, 1fr)`,
                      gap: "15px",
                      flex: 1,
                      minHeight: 0,
                      width: "100%"
                    }}>
                      {drawingsList.map((d, i) => {
                        // If odd number of items > 1, make the first one span full width to keep grid balanced
                        const spanFull = (drawingsList.length % 2 !== 0 && drawingsList.length > 1 && i === 0);
                        return (
                          <div key={d.label} style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            gridColumn: spanFull ? "1 / -1" : undefined,
                            minHeight: 0
                          }}>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "#003087", marginBottom: "4px", textTransform: "uppercase", flexShrink: 0 }}>{d.label}</div>
                            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                              <img src={d.url} alt={d.label} style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                                border: "1px solid #e2e8f0",
                                borderRadius: "4px"
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer (same style as cover letter footer) */}
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8.5px", color: "#9ca3af" }}>
                    <div>Website: www.seajong.com</div>
                    <div>Hotline: 1900 636 845</div>
                  </div>
                </div>
              );
            })()}

            {/* Page 4: Chi tiết báo giá */}
            <div className="print-paper print-details" style={{
              width: `${paperW}mm`,
              minHeight: `${paperH}mm`,
              background: "#fff",
              boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
              padding: "14mm 15mm",
              boxSizing: "border-box",
              fontSize: 10,
              lineHeight: 1.5,
              fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
              color: "#111",
              position: "relative"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid #003087" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", position: "relative" }}>
                  {company.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ height: "40px", width: "auto", objectFit: "contain", flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 10.5, color: "#003087", textTransform: "uppercase" }}>{company.name ?? "Công ty"}</div>
                    {company.address && <div style={{ fontSize: 9, color: "#374151", marginTop: 1 }}>Địa chỉ: {company.address}</div>}
                    {(company.phone || company.email) && <div style={{ fontSize: 9, color: "#374151", display: "flex", gap: 12 }}>{company.phone && <span>Điện thoại: {company.phone.replace(/[Hh]otline:\s*/gi, "").trim()}</span>}{company.email && <span>Email: {company.email}</span>}</div>}
                  </div>
                  {/* Con dấu treo Sejong Faucet */}
                  {showStamp && (
                    <img
                      src="/seajong_stampt.png"
                      alt="Sejong Stamp"
                      style={{
                        position: "absolute",
                        left: "22mm",
                        top: "0mm",
                        width: "36mm",
                        height: "36mm",
                        objectFit: "contain",
                        opacity: 0.85,
                        transform: "rotate(-10deg)",
                        pointerEvents: "none",
                        zIndex: 10
                      }}
                    />
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: 1, color: "#003087" }}>BẢNG BÁO GIÁ</div>
                  <div style={{ fontSize: 11, color: "#374151", marginTop: 3 }}>Số: <strong>{info.soPhieu}</strong></div>
                  <div style={{ fontSize: 11, color: "#374151" }}>Ngày lập: {fmtDate(info.ngayLap)}</div>
                  <div style={{ fontSize: 11, color: "#374151" }}>Hiệu lực đến: {fmtDate(info.hieuLuc)}</div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase", color: "#003087", borderLeft: "3px solid #003087", paddingLeft: 6, marginBottom: 6 }}>Thông tin khách hàng</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px", fontSize: 11 }}>
                  <div><strong>Đơn vị:</strong> {customer?.name ?? "—"}</div>
                  <div><strong>Người liên hệ:</strong> {customer?.daiDien ? `${customer.xungHo ?? ""} ${customer.daiDien}` : "—"}</div>
                  <div><strong>Địa chỉ:</strong> {customer?.address ?? "—"}</div>
                  <div><strong>Điện thoại:</strong> {customer?.dienThoai ?? "—"}</div>
                </div>
              </div>
              <div style={{ marginBottom: 12, fontSize: 11, color: "#374151", lineHeight: 1.5, textAlign: "justify" }}>
                Công ty cổ phần Sejong Faucet Việt Nam trân trọng cảm ơn Quý khách hàng đã quan tâm đến sản phẩm của chúng tôi. Sejong xin gửi đến Quý khách hàng bảng báo giá các sản phẩm, thiết bị theo yêu cầu của Quý khách hàng với thông tin chi tiết như sau:
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: 9.5 }}>
                <thead>
                  <tr style={{ background: "#003087", color: "#fff" }}>
                    {isCoQuayKe ? (
                      <>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", width: "40px", textTransform: "uppercase" }}>STT</th>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", textTransform: "uppercase" }}>Tên hàng hoá</th>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", width: "50px", textTransform: "uppercase" }}>Vị trí</th>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", width: "50px", textTransform: "uppercase" }}>Quy cách</th>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", width: "95px", textTransform: "uppercase" }}>Giá bán (đ)</th>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", width: "95px", textTransform: "uppercase" }}>Giá đại lý (đ)</th>
                      </>
                    ) : (
                      ["STT", "Tên hàng hoá - Dịch vụ", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"].map((h, i) => (
                        <th key={h} style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", textTransform: "uppercase" }}>{h}</th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let globalIdx = 0;

                    // If not CoQuayKe, we render flat list
                    if (!isCoQuayKe) {
                      return items.filter((it: any) => it.ten).map((it: any) => {
                        globalIdx++;
                        return (
                          <tr key={it.id} style={{ background: globalIdx % 2 === 0 ? "#fff" : "#eff6ff" }}>
                            <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{globalIdx}</td>
                            <td style={{ padding: "4px 6px", border: "1px solid #dbeafe" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {it.imageUrl && (
                                  <HoverImage
                                    src={it.imageUrl.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(it.imageUrl)}` : it.imageUrl}
                                    images={it.images || [it.imageUrl]}
                                    alt={it.ten}
                                    style={{ width: 42, height: 42, objectFit: "contain", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}
                                  />
                                )}
                                <div>
                                  <div style={{ fontWeight: 600 }}>{it.ten}</div>
                                  {getProductCode(it) && (
                                    <div style={{ fontSize: "8px", color: "#6b7280", marginTop: "2px", fontFamily: "monospace" }}>
                                      Mã: {getProductCode(it)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{it.dvt}</td>
                            <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{it.soLuong.toLocaleString("vi-VN")}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #dbeafe" }}>{fmt(it.donGia)}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, border: "1px solid #dbeafe" }}>{fmt(thanhTien(it))}</td>
                          </tr>
                        );
                      });
                    }

                    // If CoQuayKe, group items by Area name (viTri)
                    const validItems = items.filter((it: any) => it.ten);
                    const areas = Array.from(new Set(validItems.map((it: any) => it.viTri || "Khu vực 1"))) as string[];

                    return areas.map(areaName => {
                      const areaItems = validItems.filter((it: any) => (it.viTri || "Khu vực 1") === areaName);
                      if (areaItems.length === 0) return null;

                      return (
                        <React.Fragment key={areaName}>
                          {/* Area Header Row */}
                          <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                            <td colSpan={6} style={{ padding: "6px 10px", color: "#003087", textTransform: "uppercase", fontSize: "10px", border: "1px solid #bfdbfe", background: "#f1f5f9" }}>
                              {areaName}
                            </td>
                          </tr>
                          {/* Area Items */}
                          {areaItems.map((it: any) => {
                            globalIdx++;
                            let viTriChiTiet = it.viTriChiTiet || "";
                            try {
                              if (it.ghiChu) {
                                const parsed = JSON.parse(it.ghiChu);
                                if (parsed && typeof parsed === "object") {
                                  viTriChiTiet = parsed.viTriChiTiet || parsed.viTri || "";
                                  if (viTriChiTiet.startsWith("Khu vực")) {
                                    viTriChiTiet = "";
                                  }
                                }
                              }
                            } catch (e) { }

                            return (
                              <tr key={it.id} style={{ background: globalIdx % 2 === 0 ? "#fff" : "#eff6ff" }}>
                                <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{globalIdx}</td>
                                <td style={{ padding: "4px 6px", border: "1px solid #dbeafe" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {it.imageUrl && (
                                      <HoverImage
                                        src={it.imageUrl.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(it.imageUrl)}` : it.imageUrl}
                                        images={it.images || [it.imageUrl]}
                                        alt={it.ten}
                                        style={{ width: 42, height: 42, objectFit: "contain", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}
                                      />
                                    )}
                                    <div>
                                      <div style={{ fontWeight: 600 }}>{it.ten}</div>
                                      {getProductCode(it) && (
                                        <div style={{ fontSize: "8px", color: "#6b7280", marginTop: "2px", fontFamily: "monospace" }}>
                                          Mã: {getProductCode(it)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: "4px 6px", border: "1px solid #dbeafe", textAlign: "center" }}>
                                  {viTriChiTiet}
                                </td>
                                <td style={{ padding: "4px 6px", border: "1px solid #dbeafe", textAlign: "center" }}>{it.dvt}</td>
                                <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #dbeafe" }}>{fmt(it.donGia)}</td>
                                <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, border: "1px solid #dbeafe" }}>
                                  {fmt(it.giaDaiLy ?? it.thanhTien ?? 0)}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 60 }}>
                <div style={{ fontSize: 9 }}>
                  {info.ghiChu && (
                    <div style={{ color: "#374151", display: "flex", flexDirection: "column", gap: 5 }}>
                      {info.ghiChu.split("\n").map((line: string, idx: number) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null;
                        if (trimmed.startsWith("-")) {
                          return (
                            <div key={idx} style={{ display: "flex", gap: 6, alignItems: "flex-start", textAlign: "justify" }}>
                              <span style={{ flexShrink: 0 }}>-</span>
                              <span>{trimmed.substring(1).trim()}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={idx} style={{ textAlign: "justify" }}>
                            {trimmed}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 9.5 }}>
                  {[
                    ["Tổng tiền hàng (đ):", fmt(tamTinh)],
                    [`Chiết khấu (${info.chietKhauTong}%):`, fmt(ckTien)],
                    [`Thuế VAT (${info.thue}%):`, fmt(thueTien)],
                    ...(chiPhiThiCong > 0 ? [["Chi phí thi công (đ):", fmt(chiPhiThiCong)]] : [])
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #e5e7eb" }}><span>{l}</span><strong>{v}</strong></div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "2px solid #003087", marginTop: 2 }}><span style={{ fontWeight: 800 }}>TỔNG CỘNG:</span><span style={{ fontWeight: 900, color: "#003087" }}>{fmt(tongCong)}</span></div>
                  <div style={{ fontSize: 8.5, fontStyle: "italic", textAlign: "right" }}>({numberToVNWords(tongCong)})</div>
                </div>
              </div>
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <div style={{ textAlign: "center", minWidth: 140, fontSize: 9.5 }}>
                  <div style={{ fontWeight: 700 }}>ĐẠI DIỆN CÔNG TY</div>
                  <div style={{ fontStyle: "italic", fontSize: 9, color: "#6b7280" }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ height: 40 }} />
                  {company.legalRep && <div style={{ fontWeight: 700 }}>{company.legalRep}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const getProductCode = (it: { ten: string; code?: string | null }) => {
  if (it.code) return it.code;
  if (!it.ten) return "";
  const sjMatch = it.ten.match(/(SJ-[A-Z0-9-]+)/i);
  if (sjMatch) return sjMatch[1];
  const generalMatch = it.ten.match(/\b([A-Z0-9]{2,}-[A-Z0-9-]+)\b/);
  if (generalMatch) return generalMatch[1];
  return "";
};

const calculateBomPrice = (dm: any, baseGiaBan: number, margin: number, method: string) => {
  if (!dm) return baseGiaBan;
  if (dm.giaBan > 0) return dm.giaBan;
  if (dm.vatTu && dm.vatTu.length > 0) {
    const totalCost = dm.vatTu.reduce((acc: number, vt: any) => acc + (vt.soLuong * (vt.inventoryItem?.giaNhap || 0)), 0);
    if (margin > 0 && totalCost > 0) {
      if (method === 'revenue' && margin < 100) {
        return Math.round(totalCost / (1 - margin / 100));
      } else {
        return Math.round(totalCost * (1 + margin / 100));
      }
    }
    if (totalCost > 0) return totalCost;
  }
  return baseGiaBan;
};

// ── Main BaoGiaSanitaryModal Component ──────────────────────────────────
export function BaoGiaSanitaryModal({ open, onClose, customer, editData, onSaved, type = "agency", isDirectOrder }: {
  open: boolean;
  onClose: () => void;
  customer: CustomerRow | null;
  editData?: QuotationEditData | null;
  onSaved?: (savedData?: any) => void | Promise<void>;
  type?: string;
  isDirectOrder?: boolean;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const defaultNgayLap = fmtDate(today);
  const defaultHieuLuc = fmtDate(new Date(today.getTime() + 30 * 24 * 3600 * 1000));

  const [info, setInfo] = React.useState({
    soPhieu: genDocCode("BG"),
    ngayLap: defaultNgayLap,
    hieuLuc: defaultHieuLuc,
    ngayGiaoHang: defaultNgayLap,
    dieuKhoanTT: "",
    dieuKhoanGH: "",
    ghiChu: getDefaultGhiChu(defaultNgayLap, defaultHieuLuc, 10),
    chietKhauTong: 0,
    thue: 10,
    quoteType: isDirectOrder ? "Không có quầy kệ" : (type === "retail" ? "Không có quầy kệ" : "Có quầy kệ"),
    chiPhiThiCong: 0,
    fileKhuVuc1: "",
    fileKhuVuc2: "",
    fileKhuVuc3: "",
    fileKhuVuc4: "",
    fileKhuVuc5: "",
  });

  const [showInfoSidebar, setShowInfoSidebar] = React.useState(false);
  const [expandedBOMRows, setExpandedBOMRows] = React.useState<Record<number, boolean>>({});


  const [custInfo, setCustInfo] = React.useState({
    id: customer?.id || "",
    name: customer?.name || "",
    dienThoai: customer?.dienThoai || "",
    address: customer?.address || "",
    nhom: customer?.nhom || "ca-nhan",
    nguon: customer?.nguon || null,
  });

  React.useEffect(() => {
    setCustInfo({
      id: customer?.id || "",
      name: customer?.name || "",
      dienThoai: customer?.dienThoai || "",
      address: customer?.address || "",
      nhom: customer?.nhom || "ca-nhan",
      nguon: customer?.nguon || null,
    });
  }, [customer]);

  const [debtInfo, setDebtInfo] = React.useState<{ outstandingDebt: number; creditLimit: number } | null>(null);
  const [isCustomerNew, setIsCustomerNew] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;

    if (custInfo.id) {
      setIsCustomerNew(false);
      fetch(`/api/plan-finance/customers/${custInfo.id}`)
        .then(async res => {
          if (res.ok) return res.json();
          if (res.status === 401) {
            // Session expired or unauthorized, handle gracefully
            return null;
          }
          if (res.status === 404) {
            // Customer doesn't exist in DB (e.g. guest or deleted), handle gracefully
            return null;
          }
          const errText = await res.text().catch(() => "");
          console.warn(`Failed to load customer details. HTTP ${res.status}: ${errText || res.statusText}`);
          return null;
        })
        .then(data => {
          if (data) {
            setDebtInfo({
              outstandingDebt: data.outstandingDebt || 0,
              creditLimit: data.creditLimit || 0
            });
          } else {
            setDebtInfo(null);
          }
        })
        .catch(err => {
          console.error("Network error loading customer debt detail:", err);
          setDebtInfo(null);
        });
      return;
    }

    if (!custInfo.name.trim()) {
      setIsCustomerNew(true);
      setDebtInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/plan-finance/customers?search=${encodeURIComponent(custInfo.name)}`);
        if (res.ok) {
          const data = await res.json();
          const match = data.customers?.find(
            (c: any) => c.name.toLowerCase() === custInfo.name.trim().toLowerCase()
          );

          if (match) {
            setIsCustomerNew(false);
            const detailRes = await fetch(`/api/plan-finance/customers/${match.id}`);
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              setDebtInfo({
                outstandingDebt: detailData.outstandingDebt || 0,
                creditLimit: detailData.creditLimit || 0
              });
              setCustInfo(prev => ({ ...prev, id: match.id }));
            }
          } else {
            setIsCustomerNew(true);
            setDebtInfo(null);
          }
        }
      } catch (err) {
        console.error("Error checking customer name in DB", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [custInfo.name, custInfo.id, open]);

  const [printOpen, setPrintOpen] = React.useState(false);
  const [printAction, setPrintAction] = React.useState<"print" | "pdf" | "">("");
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");


  const isGhiChuEdited = React.useRef(false);
  const ghiChuRef = React.useRef<HTMLTextAreaElement | null>(null);

  const adjustGhiChuHeight = React.useCallback(() => {
    const el = ghiChuRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(100, el.scrollHeight + 2)}px`;
  }, []);

  React.useEffect(() => {
    if (open) {
      isGhiChuEdited.current = false;
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (editData?.id) return; // Don't auto-overwrite in edit mode
    if (!isGhiChuEdited.current) {
      setInfo(prev => ({
        ...prev,
        ghiChu: getDefaultGhiChu(prev.ngayLap, prev.hieuLuc, prev.thue)
      }));
    }
  }, [info.ngayLap, info.hieuLuc, info.thue, editData?.id, open]);

  React.useEffect(() => {
    if (!open) return;
    adjustGhiChuHeight();
    const timer = setTimeout(adjustGhiChuHeight, 50);
    return () => clearTimeout(timer);
  }, [info.ghiChu, open, info.quoteType, adjustGhiChuHeight]);

  const [pheduyet, setPheduyet] = React.useState(false);
  const [approverId, setApproverId] = React.useState("");
  const [approverName, setApproverName] = React.useState("");
  const [approvers, setApprovers] = React.useState<EmployeeItem[]>([]);
  const [loadingApp, setLoadingApp] = React.useState(false);
  const [uuTienCao, setUuTienCao] = React.useState(false);

  // States for Sanitary kitchen equipment quotations
  const isSanitary = true;
  const [soKhuVuc, setSoKhuVuc] = React.useState<number>(1);
  const [tyLeGiaDaiLy, setTyLeGiaDaiLy] = React.useState<number>(80);
  const [collapsedAreas, setCollapsedAreas] = React.useState<Record<string, boolean>>({});
  const [showDrawings, setShowDrawings] = React.useState(false);
  const [saveCustomer, setSaveCustomer] = React.useState(false);

  const handleTyLeGiaDaiLyChange = (newRate: number) => {
    setTyLeGiaDaiLy(newRate);
    setItems(r => r.map(it => ({
      ...it,
      giaDaiLy: Math.round(it.donGia * (newRate / 100))
    })));
  };

  const toast = useToast();
  const { user } = useAuth();
  const session = { user };
  const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
  const nextId = React.useRef(1);
  const [items, setItems] = React.useState<QuoteItem[]>([
    { id: nextId.current++, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null },
  ]);

  const [formItem, setFormItem] = React.useState<QuoteItem & { khoTen?: string; source?: string; dinhMucs?: any[]; dinhMucId?: string | null; dinhMucTen?: string | null; loiNhuanKyVong?: number; phuongPhapTinhLoiNhuan?: string; baseGiaBan?: number }>({
    id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: "", loiNhuanKyVong: 0, phuongPhapTinhLoiNhuan: 'revenue', baseGiaBan: 0
  });
  const [formResetKey, setFormResetKey] = React.useState(0);

  const [showBomDetail, setShowBomDetail] = React.useState(false);
  const [bomDetailData, setBomDetailData] = React.useState<any>(null);
  const [loadingBom, setLoadingBom] = React.useState(false);

  React.useEffect(() => {
    if (showBomDetail && formItem.dinhMucId) {
      setLoadingBom(true);
      fetch(`/api/production/bom/${formItem.dinhMucId}`)
        .then(res => res.json())
        .then(data => setBomDetailData(data))
        .catch(console.error)
        .finally(() => setLoadingBom(false));
    } else if (!showBomDetail) {
      setBomDetailData(null);
    }
  }, [showBomDetail, formItem.dinhMucId]);

  const addRow = () => {
    if (info.quoteType !== "Có quầy kệ") {
      if (!formItem.ten.trim()) {
        toast.error("Lỗi", "Vui lòng chọn hoặc nhập tên sản phẩm");
        return;
      }
      setItems(r => [...r.filter(x => x.ten.trim().length > 0), { ...formItem, id: nextId.current++ }]);
      setFormItem({ id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: "", loiNhuanKyVong: 0, phuongPhapTinhLoiNhuan: 'revenue', baseGiaBan: 0 });
      setFormResetKey(k => k + 1);
    } else {
      setItems(r => [...r, { id: nextId.current++, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, giaDaiLy: 0, viTri: "Khu vực 1" }]);
    }
  };

  React.useEffect(() => {
    const activeCoQuayKe = info.quoteType === "Có quầy kệ" && isSanitary;
    if (!activeCoQuayKe) {
      setItems(prev => {
        const filtered = prev.filter(it => it.ten.trim().length > 0);
        return filtered.length !== prev.length ? filtered : prev;
      });
      return;
    }
    setItems(prev => {
      let updated = false;
      const nextList = prev.map(it => {
        if (!it.viTri) {
          updated = true;
          return {
            ...it,
            viTri: "Khu vực 1",
            giaDaiLy: it.giaDaiLy ?? Math.round(it.donGia * (tyLeGiaDaiLy / 100))
          };
        }
        return it;
      });

      let added = false;
      for (let i = 1; i <= soKhuVuc; i++) {
        const kvName = `Khu vực ${i}`;
        const hasItem = nextList.some(it => it.viTri === kvName);
        if (!hasItem) {
          nextList.push({
            id: nextId.current++,
            ten: "",
            dvt: "",
            soLuong: 1,
            donGia: 0,
            ckPct: 0,
            soLuongTon: null,
            trangThaiKho: null,
            inventoryId: null,
            viTri: kvName,
            giaDaiLy: 0
          });
          added = true;
        }
      }
      if (updated || added) {
        return nextList;
      }
      return prev;
    });
  }, [soKhuVuc, info.quoteType, isSanitary, tyLeGiaDaiLy]);

  // Load dữ liệu khi mở ở edit mode
  React.useEffect(() => {
    if (!open) return;
    if (editData?.id) {
      const fmtD = (s: string | null | undefined) => s ? new Date(s).toISOString().split("T")[0] : "";
      setInfo(f => ({
        ...f,
        soPhieu: editData.code ?? f.soPhieu,
        ngayLap: fmtD(editData.ngayBaoGia) || f.ngayLap,
        hieuLuc: fmtD(editData.ngayHetHan) || f.hieuLuc,
        ngayGiaoHang: fmtD((editData as any).ngayGiaoHang) || f.ngayGiaoHang,
        chietKhauTong: editData.discount ?? 0,
        thue: editData.vat ?? 10,
        ghiChu: cleanGhiChu(editData.ghiChu ?? ""),
        quoteType: isDirectOrder ? "Không có quầy kệ" : (editData.quoteType ?? (type === "retail" ? "Không có quầy kệ" : "Có quầy kệ")),
        chiPhiThiCong: editData.chiPhiThiCong ?? 0,
        fileKhuVuc1: editData.fileKhuVuc1 ?? "",
        fileKhuVuc2: editData.fileKhuVuc2 ?? "",
        fileKhuVuc3: editData.fileKhuVuc3 ?? "",
        fileKhuVuc4: editData.fileKhuVuc4 ?? "",
        fileKhuVuc5: editData.fileKhuVuc5 ?? "",
        dieuKhoanTT: f.dieuKhoanTT,
        dieuKhoanGH: f.dieuKhoanGH,
      }));
      setUuTienCao(editData.uuTien === "high");

      // Handle loading guest customer info from ghiChu if customer prop is missing
      if (!customer?.id && editData.ghiChu) {
        const guest = parseGuestInfo(editData.ghiChu);
        if (guest) {
          setCustInfo({
            id: "",
            name: guest.name || "",
            dienThoai: guest.dienThoai || "",
            address: guest.address || "",
            nhom: "ca-nhan",
            nguon: null,
          });
        }
      }

      const isCoQuayKeEdit = (editData.quoteType ?? (type === "retail" ? "Không có quầy kệ" : "Có quầy kệ")) === "Có quầy kệ";

      if (Array.isArray(editData.items) && editData.items.length > 0) {
        let maxKV = 1;
        let loadedRate = 80;

        const mappedItems = editData.items.map((it, i) => {
          let viTri = "Khu vực 1";
          let viTriChiTiet = "";
          let code = "";
          let dinhMucId: string | null = null;
          let dinhMucTen: string | null = null;
          let bomCode: string | null = null;
          try {
            if (it.ghiChu) {
              const parsed = JSON.parse(it.ghiChu);
              if (parsed && typeof parsed === "object") {
                viTri = parsed.khuVuc || "Khu vực 1";
                viTriChiTiet = parsed.viTriChiTiet || parsed.viTri || "";
                code = parsed.code || "";
                dinhMucId = parsed.dinhMucId || null;
                dinhMucTen = parsed.dinhMucTen || null;
                bomCode = parsed.bomCode || null;
                if (viTriChiTiet.startsWith("Khu vực") && !parsed.khuVuc) {
                  viTri = viTriChiTiet;
                  viTriChiTiet = "";
                }
                const m = viTri.match(/Khu vực (\d+)/);
                if (m) {
                  const num = parseInt(m[1], 10);
                  if (num > maxKV) maxKV = num;
                }
              }
            }
          } catch (e) { }

          if (it.donGia && it.donGia > 0 && it.thanhTien) {
            loadedRate = Math.round((it.thanhTien / it.donGia) * 100);
          }

          return {
            id: i + 1,
            ten: it.tenHang ?? "",
            dvt: it.donVi ?? "",
            soLuong: it.soLuong ?? 1,
            donGia: it.donGia ?? 0,
            giaDaiLy: isCoQuayKeEdit ? (it.thanhTien ?? 0) : undefined,
            viTri: isCoQuayKeEdit ? viTri : undefined,
            viTriChiTiet: isCoQuayKeEdit ? viTriChiTiet : undefined,
            code: code || null,
            dinhMucId: dinhMucId || null,
            dinhMucTen: dinhMucTen || null,
            bomCode: bomCode || null,
            ckPct: 0,
            soLuongTon: null, trangThaiKho: null, inventoryId: null,
            imageUrl: (it as any).imageUrl || null,
          };
        });

        if (isCoQuayKeEdit) {
          setSoKhuVuc(maxKV);
          setTyLeGiaDaiLy(loadedRate);
        }
        setItems(mappedItems);
        nextId.current = (editData.items.length ?? 0) + 1;
      }
    } else {
      // Reset về trạng thái mới khi không phải edit
      const t = new Date();
      const tNgayLap = fmtDate(t);
      const tHieuLuc = fmtDate(new Date(t.getTime() + 30 * 24 * 3600_000));

      setInfo({
        soPhieu: "Đang tải...",
        ngayLap: tNgayLap,
        hieuLuc: tHieuLuc,
        ngayGiaoHang: tNgayLap,
        dieuKhoanTT: "",
        dieuKhoanGH: "",
        ghiChu: type === "retail" ? "" : getDefaultGhiChu(tNgayLap, tHieuLuc),
        chietKhauTong: 0,
        thue: 10,
        quoteType: isDirectOrder ? "Không có quầy kệ" : (type === "retail" ? "Không có quầy kệ" : "Có quầy kệ"),
        chiPhiThiCong: 0,
        fileKhuVuc1: "",
        fileKhuVuc2: "",
        fileKhuVuc3: "",
        fileKhuVuc4: "",
        fileKhuVuc5: ""
      });


      fetch(`/api/plan-finance/quotations/next-code?type=${type}`)
        .then(r => r.json())
        .then(data => {
          if (data.nextCode) {
            setInfo(f => ({ ...f, soPhieu: data.nextCode }));
          }
        })
        .catch(err => console.error("Error fetching next quote code:", err));

      setUuTienCao(false);
      setItems([{ id: 1, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null }]);
      nextId.current = 2;

      setSoKhuVuc(1);
      setTyLeGiaDaiLy(80);
      setCollapsedAreas({});
      setShowDrawings(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editData?.id, type]);

  const [suggest, setSuggest] = React.useState<any[]>([]);
  const [activeRowId, setActiveRowId] = React.useState<number | null>(null);
  const suggestTimer = React.useRef<any>(null);
  const activeRowIdRef = React.useRef<number | null>(null);

  const setActiveRowIdSync = (id: number | null) => { activeRowIdRef.current = id; setActiveRowId(id); };

  React.useEffect(() => {
    if (!open && !pheduyet) return;
    if (approvers.length > 0) {
      if (!approverId) {
        const director = approvers.find(a => (a.position || "").toLowerCase() === "giám đốc") || approvers[0];
        if (director) {
          setApproverId(String(director.id));
          setApproverName(director.name);
        }
      }
      return;
    }
    setLoadingApp(true);
    fetchEmployeesFromDb()
      .then(allEmps => {
        const boardEmps = allEmps
          .filter(e => (e.department || "").toLowerCase().includes("giám đốc"))
          .sort((a, b) => {
            const aIsDir = (a.position || "").toLowerCase() === "giám đốc" ? 0 : 1;
            const bIsDir = (b.position || "").toLowerCase() === "giám đốc" ? 0 : 1;
            if (aIsDir !== bIsDir) return aIsDir - bIsDir;
            return a.name.localeCompare(b.name, "vi");
          });
        const list = boardEmps.length > 0 ? boardEmps : allEmps;
        setApprovers(list);
        const director = list.find(a => (a.position || "").toLowerCase() === "giám đốc") || list[0];
        if (director) {
          setApproverId(prev => prev || String(director.id));
          setApproverName(prev => prev || director.name);
        }
      })
      .catch(() => setApprovers([]))
      .finally(() => setLoadingApp(false));
  }, [open, pheduyet, approvers, approverId]);

  const fetchSuggest = React.useCallback((query: string, rowId: number) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!query.trim() || query.length < 2) { setSuggest([]); return; }
    suggestTimer.current = setTimeout(() => {
      fetch(`/api/logistics/inventory?search=${encodeURIComponent(query)}&limit=20&includeManufactured=true`)
        .then(r => r.json()).then(d => { 
          if (activeRowIdRef.current === rowId) {
            const mapped = (d.items ?? []).map((item: any) => {
              const relevantStocks = (item.stocks || []).filter((s: any) => {
                return s.warehouse?.code === "KHO-CHINH" || s.warehouse?.code === "KVP";
              });
              const soLuong = relevantStocks.reduce((acc: number, s: any) => acc + (s.soLuong || 0), 0);
              const soLuongGiu = relevantStocks.reduce((acc: number, s: any) => acc + (s.soLuongGiu || 0), 0);
              const thucTon = Math.max(0, soLuong - soLuongGiu);
              return { ...item, thucTon, soLuong };
            });
            setSuggest(mapped);
          }
        }).catch(() => setSuggest([]));
    }, 300);
  }, []);

  const applySuggest = (rowId: number, item: any) => {
    const soLuongTon = item.thucTon ?? item.soLuong;
    const defaultDinhMuc = item.dinhMucs?.length > 0 ? item.dinhMucs[0] : null;
    const khoTenStr = (item.stocks && item.stocks.length > 0 && item.stocks[0].warehouse?.name)
      ? item.stocks[0].warehouse.name
      : (item.source === "manufactured" ? "Kho thành phẩm"
        : item.source === "inventory" ? "Kho thương mại"
          : item.source === "material" ? "Kho sản xuất và lắp ráp" : "");

    const updatePayload = {
      ten: item.tenHang,
      khoTen: khoTenStr,
      dvt: item.donVi ?? "cái",
      donGia: calculateBomPrice(defaultDinhMuc, item.giaBan, item.loiNhuanKyVong, item.phuongPhapTinhLoiNhuan),
      soLuongTon,
      trangThaiKho: item.trangThai,
      inventoryId: item.id,
      imageUrl: item.imageUrl || null,
      code: item.code || null,
      dinhMucs: item.dinhMucs || [],
      dinhMucId: defaultDinhMuc ? defaultDinhMuc.id : null,
      dinhMucTen: defaultDinhMuc ? defaultDinhMuc.tenDinhMuc : null,
      source: item.source,
      giaDaiLy: Math.round((item.giaBan || 0) * (tyLeGiaDaiLy / 100)),
      loiNhuanKyVong: item.loiNhuanKyVong || 0,
      phuongPhapTinhLoiNhuan: item.phuongPhapTinhLoiNhuan || 'revenue',
      baseGiaBan: item.giaBan || 0
    };

    if (rowId === -1) {
      setFormItem(x => ({ ...x, ...updatePayload }));
    } else {
      setItems(r => r.map(x => x.id === rowId ? { ...x, ...updatePayload } : x));
    }
    setSuggest([]);
    setActiveRowIdSync(null);
  };

  const setInfoField = (k: string) => (e: any) => setInfo(f => ({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));

  const handleUpload = (key: "fileKhuVuc1" | "fileKhuVuc2" | "fileKhuVuc3" | "fileKhuVuc4" | "fileKhuVuc5", label: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const file = target.files?.[0];
    
    // Reset ngay trong onChange sau khi đã lấy được file
    target.value = "";

    if (!file) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Không thể đọc tệp đính kèm"));
        reader.readAsDataURL(file);
      });

      let uploadedUrl = dataUrl;
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            dataUrl,
          }),
        });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          if (data?.url) {
            uploadedUrl = data.url;
          }
        }
      } catch {
        // Fallback to dataUrl if server upload endpoint is unavailable
      }

      setInfo(f => ({ ...f, [key]: uploadedUrl }));
      toast.success("Tải lên thành công", `Đã đính kèm bản vẽ ${label}`);
    } catch (err: any) {
      toast.error("Lỗi tải lên", err.message ?? "Lỗi tải file");
    }
  };

  const handleClearFile = (key: "fileKhuVuc1" | "fileKhuVuc2" | "fileKhuVuc3" | "fileKhuVuc4" | "fileKhuVuc5", label: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInfo(f => ({ ...f, [key]: "" }));
    toast.success("Đã gỡ file", `Đã gỡ bản vẽ ${label}`);
  };

  const renderAttachmentButton = ({ label, fileUrl, uploadKey, disabled, keyProp }: { label: string; fileUrl: string; uploadKey: "fileKhuVuc1" | "fileKhuVuc2" | "fileKhuVuc3" | "fileKhuVuc4" | "fileKhuVuc5"; disabled?: boolean; keyProp?: string }) => {
    const isAttached = !!fileUrl;
    const fileName = fileUrl && !fileUrl.startsWith("data:") ? fileUrl.split("/").pop() : label;
    return (
      <div key={keyProp} style={{ flex: 1, display: "flex", flexDirection: "column", opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : undefined }}>
        {isAttached ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 8px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: 6, height: 38, boxSizing: "border-box", transition: "all 0.2s"
          }}>
            <button
              type="button"
              onClick={() => setShowDrawings(true)}
              title={`Xem bản vẽ: ${fileName}`}
              style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
                color: "#10b981", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", flex: 1, minWidth: 0
              }}
            >
              <i className="bi bi-paperclip" style={{ fontSize: 13, flexShrink: 0 }} />
              <span style={{
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}>{label}</span>
            </button>
            {!disabled && (
              <button
                onClick={handleClearFile(uploadKey, label)}
                style={{
                  background: "none", border: "none", color: "#ef4444", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 2, borderRadius: 4
                }}
                title="Gỡ file đính kèm"
              >
                <i className="bi bi-x-circle-fill" style={{ fontSize: 12 }} />
              </button>
            )}
          </div>
        ) : (
          <label
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "6px 8px", background: "#f8fafc", border: "1px dashed #cbd5e1",
              borderRadius: 6, height: 38, boxSizing: "border-box", cursor: disabled ? "not-allowed" : "pointer",
              fontSize: 12, fontWeight: 600, color: "#334155",
              transition: "all 0.15s",
              margin: 0
            }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = "var(--color-primary, #0284c7)"; e.currentTarget.style.color = "var(--color-primary, #0284c7)"; e.currentTarget.style.background = "rgba(2, 132, 199, 0.04)"; } }}
            onMouseLeave={e => { if (!disabled) { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#334155"; e.currentTarget.style.background = "#f8fafc"; } }}
          >
            <input
              type="file"
              disabled={disabled}
              onChange={handleUpload(uploadKey, label)}
              style={{ display: "none" }}
            />
            <i className="bi bi-plus-lg" style={{ fontSize: 11 }} />
            <span style={{ whiteSpace: "nowrap" }}>{label}</span>
          </label>
        )}
      </div>
    );
  };


  const removeRow = (id: number) => setItems(r => r.filter(x => x.id !== id));
  const updateRow = (id: number, f: string, v: any) => setItems(r => r.map(x => x.id === id ? { ...x, [f]: v } : x));

  const renderQuayKeRow = (originalIt: QuoteItem, idx: number) => {
    const it = formItem.id === originalIt.id ? (formItem as any) : originalIt;
    return (
      <tr key={it.id} style={{ borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
        <td style={{ padding: 10, color: "var(--muted-foreground)" }}>{idx + 1}</td>
        <td style={{ padding: "6px 10px", position: "relative" }}>
          {it.ten.trim() && it.soLuongTon !== null && it.soLuongTon !== undefined && (() => {
            const ton = it.soLuongTon as number;
            if (ton === 0) return (
              <span title="Hết hàng" style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#ef4444", pointerEvents: "none", display: "flex", zIndex: 2 }}>
                <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
              </span>
            );
            if (it.soLuong > ton) return (
              <span title={`Thiếu hàng (tồn: ${ton})`} style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#f97316", pointerEvents: "none", display: "flex", zIndex: 2 }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 12 }} />
              </span>
            );
            return null;
          })()}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Input
              value={it.ten}
              placeholder="Tìm hoặc nhập tên hàng hoá..."
              onChange={e => {
                const v = e.target.value;
                if (!v) {
                  setItems(r => r.map(x => x.id === it.id
                    ? { ...x, ten: "", dvt: "", donGia: 0, ckPct: 0, soLuong: 1, soLuongTon: null, trangThaiKho: null, inventoryId: null }
                    : x
                  ));
                  setSuggest([]);
                } else {
                  updateRow(it.id, "ten", v);
                  setActiveRowIdSync(it.id);
                  fetchSuggest(v, it.id);
                }
              }}
              onFocus={() => { setActiveRowIdSync(it.id); fetchSuggest(it.ten, it.id); }}
              onBlur={() => { setTimeout(() => { if (activeRowIdRef.current === it.id) { setSuggest([]); setActiveRowIdSync(null); } }, 200); }}
              style={{ height: 34 }}
            />
            {getProductCode(it) && (
              <span style={{ fontSize: 10, color: "var(--muted-foreground)", background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", alignSelf: "flex-start", marginTop: 2 }}>
                Mã: {getProductCode(it)}
              </span>
            )}
          </div>
          {activeRowId === it.id && suggest.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
              {suggest.map(s => (
                <div key={s.id} onClick={() => applySuggest(it.id, s)}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                >
                  <div style={{ fontWeight: 600 }}>{s.tenHang}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 8, marginTop: 2 }}>
                    {s.code && <span style={{ fontFamily: "monospace", background: "var(--muted)", padding: "0 5px", borderRadius: 4 }}>{s.code}</span>}
                    <span>Thực tồn: <b>{s.thucTon ?? s.soLuong}</b> {s.donVi}</span>
                    <span>Giá: <b>{s.giaBan.toLocaleString("vi-VN")} ₫</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </td>
        <td style={{ padding: 6 }}>
          <Input
            value={it.viTriChiTiet || ""}
            onChange={e => updateRow(it.id, "viTriChiTiet", e.target.value)}
            style={{ height: 34 }}
          />
        </td>
        <td style={{ padding: 6 }}>
          <Input
            value={it.dvt}
            onChange={e => updateRow(it.id, "dvt", e.target.value)}
            style={{ height: 34, textAlign: "center" }}
          />
        </td>
        <td style={{ padding: 6 }}>
          <Input
            type="number"
            value={it.donGia}
            numberGroup={true}
            allowDecimal={false}
            placeholder="0"
            onNumericChange={v => {
              setItems(r => r.map(x => x.id === it.id ? { ...x, donGia: v, giaDaiLy: Math.round(v * (tyLeGiaDaiLy / 100)) } : x));
            }}
            style={{ height: 34, textAlign: "right" }}
          />
        </td>
        <td style={{ padding: 6 }}>
          <Input
            type="number"
            value={it.giaDaiLy ?? 0}
            numberGroup={true}
            allowDecimal={false}
            placeholder="0"
            onNumericChange={v => updateRow(it.id, "giaDaiLy", v)}
            style={{ height: 34, textAlign: "right" }}
          />
        </td>
        <td style={{ padding: 6, verticalAlign: "middle" }}>
          <button onClick={() => removeRow(it.id)} style={{ padding: 4, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }} title="Xoá dòng">
            <i className="bi bi-trash" />
          </button>
        </td>
      </tr>
    );
  };

  const isCoQuayKe = info.quoteType === "Có quầy kệ" && isSanitary;
  const thanhTien = (it: QuoteItem) => isCoQuayKe ? (it.giaDaiLy ?? 0) : it.soLuong * it.donGia * (1 - it.ckPct / 100);
  const tamTinh = items.reduce((s, it) => s + thanhTien(it), 0);
  const ckTien = tamTinh * info.chietKhauTong / 100;
  const truocThue = tamTinh - ckTien;
  const thueTien = truocThue * info.thue / 100;
  const tongCong = truocThue + thueTien + (isCoQuayKe ? info.chiPhiThiCong : 0);
  const checkMaterialShortage = (it: any) => {
    const activeDinhMuc = (it.dinhMucs || []).find((dm: any) => dm.id === it.dinhMucId) || (it.dinhMucs && it.dinhMucs.length > 0 ? it.dinhMucs[0] : null);
    if (!activeDinhMuc || !activeDinhMuc.vatTu || activeDinhMuc.vatTu.length === 0) {
      return { hasBOM: false, hasShortage: false, missingCount: 0 };
    }
    let missingCount = 0;
    activeDinhMuc.vatTu.forEach((vt: any) => {
      const vtStocks = vt.inventoryItem?.stocks || vt.material?.stocks || [];
      const vtRelevantStocks = vtStocks.filter((s: any) => s.warehouse?.code === "KHO-CHINH" || s.warehouse?.code === "KVP");
      const vtSoLuong = vtRelevantStocks.reduce((acc: number, s: any) => acc + (s.soLuong || 0), 0);
      const vtSoLuongGiu = vtRelevantStocks.reduce((acc: number, s: any) => acc + (s.soLuongGiu || 0), 0);
      const vtThucTon = Math.max(0, vtSoLuong - vtSoLuongGiu);
      const needed = (vt.soLuong || 0) * (it.soLuong || 0);
      if (vtThucTon < needed) {
        missingCount++;
      }
    });
    return {
      hasBOM: true,
      hasShortage: missingCount > 0,
      missingCount
    };
  };

  const itemsWithMaterialShortage = items.filter((it: any) => {
    const isMainShort = it.soLuongTon !== null && it.soLuongTon !== undefined && it.soLuong > (it.soLuongTon as number);
    if (!isMainShort) return false;
    const matCheck = checkMaterialShortage(it);
    return matCheck.hasBOM && matCheck.hasShortage;
  });
  const hasAnyMaterialShortage = itemsWithMaterialShortage.length > 0;

  const isOutOfStock = items.some((it: any) => {
    const mainOutOfStock = it.soLuongTon !== null && it.soLuongTon !== undefined && it.soLuong > (it.soLuongTon as number);
    if (!mainOutOfStock) return false;
    
    const matCheck = checkMaterialShortage(it);
    if (matCheck.hasBOM && !matCheck.hasShortage) {
      return false;
    }
    
    return true;
  });

  const hasValidItems = items.some(it => it.ten.trim().length > 0);

  const handleSave = async (mode: "draft" | "submit" = "submit") => {
    if (!info.soPhieu.trim()) { setSaveError("Vui lòng nhập số báo giá"); return; }
    if (mode === "submit" && pheduyet && !approverId) { setSaveError("Vui lòng chọn người phê duyệt"); return; }
    setSaving(true);
    setSaveError("");
    try {
      const trangThai = isDirectOrder
        ? "won"
        : (type === "retail"
          ? (editData?.id ? editData.trangThai : "draft")
          : (mode === "draft" ? "draft" : (pheduyet ? "pending_approval" : "approved")));
      let finalCustomerId = custInfo.id;
      let finalGhiChu = [info.ghiChu, info.dieuKhoanTT ? `ĐKTT: ${info.dieuKhoanTT}` : "", info.dieuKhoanGH ? `ĐKGH: ${info.dieuKhoanGH}` : ""].filter(Boolean).join("\n");
      
      if (!finalCustomerId) {
        // Create walk-in customer on the fly
        const guestName = custInfo.name.trim() || "Khách vãng lai";
        try {
          const custRes = await fetch("/api/plan-finance/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: guestName,
              dienThoai: custInfo.dienThoai.trim(),
              address: custInfo.address.trim(),
              nhom: "ca-nhan",
              nguon: "walk-in",
            })
          });
          if (custRes.ok) {
            const newCust = await custRes.json();
            finalCustomerId = newCust.id;
          } else {
            // Fallback to GuestInfo note if creation fails
            const guestInfo = { name: guestName, dienThoai: custInfo.dienThoai.trim(), address: custInfo.address.trim() };
            finalGhiChu = `[GuestInfo:${JSON.stringify(guestInfo)}]\n` + finalGhiChu;
          }
        } catch (err) {
          const guestInfo = { name: guestName, dienThoai: custInfo.dienThoai.trim(), address: custInfo.address.trim() };
          finalGhiChu = `[GuestInfo:${JSON.stringify(guestInfo)}]\n` + finalGhiChu;
        }
      }

      const payload = {
        code: info.soPhieu.trim(), ngayBaoGia: info.ngayLap, ngayHetHan: info.hieuLuc,
        ngayGiaoHang: info.ngayGiaoHang,
        trangThai, uuTien: uuTienCao ? "high" : "medium",
        tongTien: tamTinh, discount: info.chietKhauTong, vat: info.thue,
        chiPhiThiCong: info.chiPhiThiCong, thanhTien: tongCong,
        ghiChu: finalGhiChu,
        approverId: (mode === "submit" && pheduyet) ? approverId : undefined,
        partnerId: customer?.id || undefined,
        quoteType: info.quoteType,
        fileKhuVuc1: info.fileKhuVuc1,
        fileKhuVuc2: info.fileKhuVuc2,
        fileKhuVuc3: info.fileKhuVuc3,
        fileKhuVuc4: info.fileKhuVuc4,
        fileKhuVuc5: info.fileKhuVuc5,
        items: items.filter(it => it.ten.trim()).map((it, idx) => {
          const activeDinhMuc = (it.dinhMucs || []).find((dm: any) => dm.id === it.dinhMucId) || (it.dinhMucs && it.dinhMucs.length > 0 ? it.dinhMucs[0] : null);
          const itemThanhTien = isCoQuayKe ? (it.giaDaiLy ?? 0) : thanhTien(it);
          const itemGhiChu = JSON.stringify({
            viTri: isCoQuayKe ? (it.viTriChiTiet || "") : "",
            khuVuc: isCoQuayKe ? (it.viTri || "Khu vực 1") : "",
            viTriChiTiet: isCoQuayKe ? (it.viTriChiTiet || "") : "",
            code: it.code || "",
            dinhMucId: it.dinhMucId || "",
            bomCode: activeDinhMuc?.code || it.bomCode || "",
            dinhMucTen: it.dinhMucTen || activeDinhMuc?.tenDinhMuc || ""
          });
          return {
            tenHang: it.ten.trim(),
            donVi: it.dvt || "cái",
            soLuong: isCoQuayKe ? 1 : it.soLuong,
            donGia: it.donGia,
            thanhTien: itemThanhTien,
            ghiChu: itemGhiChu,
            sortOrder: idx
          };
        }),
      };

      let res: Response;
      if (editData?.id) {
        // Chế độ sửa
        res = await fetch(`/api/plan-finance/quotations/${editData.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      } else {
        // Chế độ tạo mới
        res = await fetch("/api/plan-finance/quotations", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, customerId: finalCustomerId || null, type }),
        });
      }
      if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi lưu báo giá");
      
      const responseData = await res.json();
      const quoteId = editData?.id || responseData?.id || responseData?.quotation?.id;

      // Đồng bộ ngay thông tin báo giá vào hồ sơ đối tác (MarketingLead) để chuyển sang Bước 2 (Quản lý báo giá)
      const mappedPartnerStatus =
        trangThai === "approved" || trangThai === "won"
          ? "Approved"
          : trangThai === "pending_approval" || trangThai === "sent"
            ? "Sent"
            : "Draft";

      if (type === "agency" && customer?.id) {
        await fetch(`/api/sales/partners/${customer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: 2,
            careStatus: "cared",
            quoteId: quoteId || "",
            quoteCode: info.soPhieu.trim(),
            quoteValue: tongCong,
            discountRate: info.chietKhauTong,
            quoteStatus: mappedPartnerStatus,
            quoteRawStatus: trangThai,
            quoteType: info.quoteType,
          }),
        }).catch(() => {});
      }

      // Ghi lịch sử sau khi lưu thành công
      if (quoteId) {
        const STATUS_LABEL: Record<string, string> = {
          draft: "Nháp", pending_approval: "Đang trình duyệt",
          approved: "Đã phê duyệt", sent: "Đang thương thảo",
          won: "Thành công", lost: "Thất bại", cancelled: "Đã huỷ",
        };
        const nguoiThucHien = session?.user?.name ?? "Hệ thống";
        const validItems = items.filter(it => it.ten.trim());
        let ketQua = "";

        if (editData?.id) {
          // So sánh các thay đổi khi cập nhật
          const changes: string[] = [];

          // 1. So sánh trạng thái
          const oldTrangThai = editData.trangThai || "draft";
          if (oldTrangThai !== trangThai) {
            changes.push(`  + Trạng thái: từ "${STATUS_LABEL[oldTrangThai] || oldTrangThai}" thành "${STATUS_LABEL[trangThai] || trangThai}"`);
          }

          // 2. So sánh chiết khấu
          const oldDiscount = editData.discount ?? 0;
          const newDiscount = info.chietKhauTong;
          if (oldDiscount !== newDiscount) {
            changes.push(`  + Chiết khấu: từ ${oldDiscount}% thành ${newDiscount}%`);
          }

          // 3. So sánh VAT
          const oldVat = editData.vat ?? 10;
          const newVat = info.thue;
          if (oldVat !== newVat) {
            changes.push(`  + Thuế VAT: từ ${oldVat}% thành ${newVat}%`);
          }

          // 4. So sánh chi phí thi công
          const oldThiCong = editData.chiPhiThiCong ?? 0;
          const newThiCong = info.chiPhiThiCong;
          if (oldThiCong !== newThiCong) {
            changes.push(`  + Phí thi công: từ ${oldThiCong.toLocaleString("vi-VN")}đ thành ${newThiCong.toLocaleString("vi-VN")}đ`);
          }

          // 5. So sánh sản phẩm
          const oldItemsFlat = editData.items?.map(it => `${it.tenHang} (x${it.soLuong ?? 1})`).join(",") || "";
          const newItemsFlat = validItems.map(it => `${it.ten} (x${it.soLuong})`).join(",") || "";
          
          if (oldItemsFlat !== newItemsFlat) {
            const oldItemsStr = editData.items?.map(it => `    • ${it.tenHang} (x${it.soLuong ?? 1})`).join("\n") || "    • Không có";
            const newItemsStr = validItems.map(it => `    • ${it.ten} (x${it.soLuong})`).join("\n") || "    • Không có";
            changes.push(`  + Danh sách sản phẩm thay đổi:\n  - Cũ:\n${oldItemsStr}\n  - Mới:\n${newItemsStr}`);
          }

          // Tính toán giá trị thay đổi
          const oldTotal = editData.thanhTien ?? 0;
          const diffTotal = tongCong - oldTotal;
          let diffText = "";
          if (diffTotal > 0) {
            diffText = `Tăng từ ${oldTotal.toLocaleString("vi-VN")} đồng thành ${tongCong.toLocaleString("vi-VN")} đồng (Tăng +${diffTotal.toLocaleString("vi-VN")} đồng)`;
          } else if (diffTotal < 0) {
            diffText = `Giảm từ ${oldTotal.toLocaleString("vi-VN")} đồng thành ${tongCong.toLocaleString("vi-VN")} đồng (Giảm ${Math.abs(diffTotal).toLocaleString("vi-VN")} đồng)`;
          } else {
            diffText = `Không thay đổi (${tongCong.toLocaleString("vi-VN")} đồng)`;
          }

          const ketQuaLines = [
            "Đã cập nhật báo giá",
            `- Nội dung cập nhật:${changes.length > 0 ? "\n" + changes.join("\n") : " Không có thay đổi thuộc tính chính"}`,
            `- Giá trị thay đổi: ${diffText}`
          ];
          ketQua = ketQuaLines.join("\n");
        } else {
          // Tạo mới
          const itemsStr = validItems.map(it => `  • ${it.ten} (x${it.soLuong})`).join("\n");
          ketQua = `Tạo mới báo giá thành công.\n- Tổng giá trị: ${tongCong.toLocaleString("vi-VN")} đồng\n- Trạng thái: ${STATUS_LABEL[trangThai] || trangThai}\n- Danh sách sản phẩm:\n${itemsStr || "  • Không có"}`;
        }

        await fetch(`/api/plan-finance/quotations/${quoteId}/negotiations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai: "system",
            ngay: new Date().toISOString(),
            nguoiThucHien,
            ketQua,
          }),
        }).catch(() => { });
      }

      if (mode === "draft") {
        toast.success("Lưu nháp", `Báo giá ${info.soPhieu} đã được lưu nháp`);
      } else if (pheduyet) {
        toast.success("Đang trình duyệt", `Báo giá ${info.soPhieu} đã gửi cho người phê duyệt`, 5000);
      } else {
        toast.success(editData?.id ? "Đã cập nhật" : "Đã phê duyệt", `Báo giá ${info.soPhieu} đã được ${editData?.id ? "cập nhật" : "xác nhận"}`, 5000);
      }
      await onSaved?.({
        id: quoteId || "",
        partnerId: customer?.id || "",
        code: info.soPhieu.trim(),
        quoteValue: tongCong,
        discountRate: info.chietKhauTong,
        quoteStatus: mappedPartnerStatus,
        quoteRawStatus: trangThai,
        quoteType: info.quoteType,
        quotation: responseData?.quotation || responseData,
      });
      onClose();
    } catch (e: any) { setSaveError(e.message); toast.error("Lỗi", e.message); }
    finally { setSaving(false); }
  };


  const fmt = (n: number) => n.toLocaleString("vi-VN");

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "var(--background)", display: "flex", flexDirection: "column" }}>
      <style>{`
        /* Responsive styles for iPad/tablets */
        @media (max-width: 1024px) {
          .sanitary-modal-body {
            position: relative !important;
          }
          .sanitary-modal-left {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 350px !important;
            max-width: 85vw !important;
            z-index: 200 !important;
            border-right: 1px solid var(--border) !important;
            transform: translateX(-100%) !important;
            transition: transform 0.25s ease-in-out !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.25) !important;
            background: var(--card) !important;
          }
          .sanitary-modal-left.show {
            transform: translateX(0) !important;
          }
          .sanitary-modal-right {
            width: 100% !important;
            flex: 1 !important;
          }
          .sanitary-modal-toggle-btn {
            display: flex !important;
          }
          .sanitary-modal-sidebar-header {
            display: flex !important;
          }
          .sanitary-modal-table th, 
          .sanitary-modal-table td {
            padding: 6px 8px !important;
          }
          .sanitary-modal-header {
            padding: 0 12px !important;
          }
          .sanitary-modal-header-btn {
            padding: 5px 10px !important;
            font-size: 12px !important;
          }
          .sanitary-modal-header-title {
            font-size: 14px !important;
          }
        }

        /* Mobile specific styles (<= 768px) */
        @media (max-width: 768px) {
          /* Mobile Full-Screen Sidebar Panel for Quotation Info */
          .sanitary-modal-left {
            position: fixed !important;
            inset: 0 !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            width: 100vw !important;
            max-width: 100% !important;
            max-width: 100vw !important;
            height: 100% !important;
            height: 100dvh !important;
            z-index: 3100 !important;
            transform: translateX(-100%) !important;
            transition: transform 0.25s ease-in-out !important;
            box-shadow: none !important;
            border-right: none !important;
            border-radius: 0 !important;
            background: var(--card) !important;
          }
          .sanitary-modal-left.show {
            transform: translateX(0) !important;
          }
          .sanitary-modal-sidebar-header {
            display: flex !important;
            padding-top: max(8px, env(safe-area-inset-top, 8px)) !important;
          }
          .sanitary-modal-left > div {
            padding: 14px 16px max(14px, env(safe-area-inset-bottom, 14px)) 16px !important;
          }

          .sanitary-modal-header {
            height: 50px !important;
            padding: 0 10px !important;
          }
          .sanitary-modal-header-icon {
            width: 30px !important;
            height: 30px !important;
            border-radius: 7px !important;
          }
          .sanitary-modal-header-title {
            font-size: 13.5px !important;
            font-weight: 700 !important;
            max-width: 175px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          .sanitary-modal-header-btn {
            padding: 5px 10px !important;
            font-size: 12px !important;
            height: 34px !important;
          }
          .sanitary-modal-header-btn-aux {
            display: none !important;
          }
          .sanitary-modal-right {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }
          .sanitary-modal-subheader {
            padding: 8px 10px !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          .sanitary-modal-subheader-title {
            font-size: 11.5px !important;
          }
          .sanitary-modal-table-container {
            overflow-x: hidden !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 8px !important;
            gap: 10px !important;
            box-sizing: border-box !important;
          }
          .sanitary-modal-add-form {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            align-items: stretch !important;
            padding: 10px !important;
            gap: 8px !important;
          }
          .sanitary-modal-form-top,
          .sanitary-modal-row-pricing,
          .sanitary-modal-form-actions {
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            box-sizing: border-box !important;
            min-width: 0 !important;
          }
          .sanitary-modal-form-top {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .sanitary-modal-field-product {
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .sanitary-modal-bom-group {
            display: grid !important;
            grid-template-columns: 105px minmax(0, 1fr) !important;
            gap: 8px !important;
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .sanitary-modal-field-bom-code,
          .sanitary-modal-field-bom-desc {
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .sanitary-modal-field-bom-desc input {
            min-width: 0 !important;
          }
          /* Hide warehouse name & unit on mobile phones */
          .sanitary-modal-row-warehouse {
            display: none !important;
          }
          .sanitary-modal-row-pricing {
            display: grid !important;
            grid-template-columns: 65px 65px 75px minmax(0, 1fr) !important;
            gap: 6px !important;
          }
          .sanitary-modal-field-dvt,
          .sanitary-modal-field-qty,
          .sanitary-modal-field-ck,
          .sanitary-modal-field-price {
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .sanitary-modal-field-price input {
            min-width: 0 !important;
          }
          .sanitary-modal-form-actions {
            display: flex !important;
            gap: 8px !important;
            margin-top: 2px !important;
          }
          .sanitary-modal-form-actions button {
            flex: 1 !important;
            height: 38px !important;
            justify-content: center !important;
            font-size: 13.5px !important;
            font-weight: 700 !important;
          }
          .sanitary-modal-desktop-table {
            display: none !important;
          }
          .sanitary-modal-mobile-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .sanitary-modal-footer {
            padding: 8px 10px max(14px, env(safe-area-inset-bottom, 14px)) 10px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            align-items: stretch !important;
            background: var(--card) !important;
            border-top: 1px solid var(--border) !important;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.06) !important;
            box-sizing: border-box !important;
          }
          .sanitary-modal-footer-totals {
            order: 1 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 6px !important;
            width: 100% !important;
            padding-bottom: 6px !important;
            border-bottom: 1px dashed var(--border) !important;
            box-sizing: border-box !important;
          }
          .sanitary-modal-footer-totals > div {
            flex: 1 !important;
            text-align: center !important;
          }
          .sanitary-modal-footer-totals p:first-child {
            font-size: 10px !important;
            margin: 0 !important;
            color: var(--muted-foreground) !important;
          }
          .sanitary-modal-footer-totals p:last-child {
            font-size: 12px !important;
            font-weight: 700 !important;
            margin: 0 !important;
          }
          .sanitary-modal-footer-grandtotal {
            display: none !important;
          }
          .sanitary-modal-footer-bottom {
            order: 2 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            gap: 8px !important;
            box-sizing: border-box !important;
          }
          .sanitary-modal-footer-payment {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            flex: 1 !important;
            margin-left: 0 !important;
            min-width: 0 !important;
          }
          .sanitary-modal-footer-payment label {
            font-size: 11.5px !important;
            margin: 0 !important;
          }
          .sanitary-modal-footer-payment input[type="text"] {
            width: 82px !important;
            padding: 4px 18px 4px 6px !important;
            font-size: 12.5px !important;
            font-weight: 700 !important;
            height: 30px !important;
            box-sizing: border-box !important;
          }
          .sanitary-modal-footer-mobile-grandtotal {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
            flex-shrink: 0 !important;
            margin-left: auto !important;
          }
          .sanitary-modal-footer-mobile-grandtotal span:first-child {
            font-size: 9.5px !important;
            font-weight: 700 !important;
            color: var(--primary) !important;
            text-transform: uppercase !important;
            line-height: 1 !important;
          }
          .sanitary-modal-footer-mobile-grandtotal span:last-child {
            font-size: 16px !important;
            font-weight: 900 !important;
            color: var(--primary) !important;
            line-height: 1.2 !important;
          }
        }
        @media (min-width: 769px) {
          .sanitary-modal-footer-bottom {
            display: contents !important;
          }
          .sanitary-modal-footer-mobile-grandtotal {
            display: none !important;
          }
          .sanitary-modal-mobile-list {
            display: none !important;
          }
          .sanitary-modal-row-warehouse {
            display: flex !important;
          }
          .sanitary-modal-desktop-table {
            display: table !important;
            min-width: 650px !important;
          }
        }
        @media (min-width: 1025px) {
          .sanitary-modal-body {
            background: #EBF0F5 !important;
            padding: 8px !important;
            gap: 8px !important;
          }
          .sanitary-modal-left {
            border-radius: 12px !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            background: #ffffff !important;
          }
          .sanitary-modal-right {
            border-radius: 12px !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            background: #ffffff !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="sanitary-modal-header" style={{ height: 56, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="sanitary-modal-header-icon" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(2, 132, 199, 0.08)", border: "1px solid rgba(2, 132, 199, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--color-primary, #0284c7)" }}>
            <i className={`bi ${isDirectOrder ? 'bi-cart3' : 'bi-file-earmark-text'}`} style={{ fontSize: 17 }} />
          </div>
          <div>
            <p className="sanitary-modal-header-title" style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#0f172a", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="d-none d-sm-inline">
                {editData?.id
                  ? (isDirectOrder ? "Sửa đơn bán hàng (SO)" : "Sửa báo giá")
                  : (isDirectOrder
                    ? (type === "retail" ? "Lập đơn hàng bán lẻ" : "Lập đơn bán hàng (SO)")
                    : (type === "retail" ? "Lập báo giá bán lẻ" : "Lập báo giá đại lý")
                  )
                }
              </span>
              <span className="d-inline d-sm-none">
                {editData?.id
                  ? (isDirectOrder ? "Sửa đơn hàng" : "Sửa báo giá")
                  : (isDirectOrder
                    ? (type === "retail" ? "Đơn bán lẻ (SO)" : "Đơn hàng (SO)")
                    : (type === "retail" ? "Báo giá lẻ" : "Báo giá đại lý")
                  )
                }
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-bold border border-sky-200">
                {type === "retail" ? "BÁN LẺ" : "ĐẠI LÝ"}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveError && <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, alignSelf: "center" }}><i className="bi bi-exclamation-circle" /> {saveError}</span>}
          <Button
            variant="secondary"
            size="sm"
            className="sanitary-modal-header-btn sanitary-modal-header-btn-aux"
            disabled={!hasValidItems}
            onClick={() => { setPrintOpen(true); setPrintAction("print"); }}
            leftIcon={<i className="bi bi-printer" style={{ fontSize: 13 }} />}
            style={{ padding: "6px 14px", height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600 }}
          >
            In báo giá
          </Button>
          {type !== "retail" && (
            <Button
              variant="secondary"
              size="sm"
              className="sanitary-modal-header-btn sanitary-modal-header-btn-aux"
              disabled={!hasValidItems}
              onClick={() => { setPrintOpen(true); setPrintAction("pdf"); }}
              leftIcon={<i className="bi bi-file-earmark-pdf" style={{ fontSize: 13 }} />}
              style={{ padding: "6px 14px", height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600 }}
            >
              Xuất PDF
            </Button>
          )}
          {isOutOfStock && (
            <span style={{ fontSize: 12, color: "#ea580c", background: "rgba(234,88,12,0.08)", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(234,88,12,0.25)", alignSelf: "center", fontWeight: 700 }}><i className="bi bi-exclamation-triangle" /> {isDirectOrder ? "Đơn có hàng hóa thiếu" : "Báo giá có hàng hóa thiếu"}</span>
          )}
          <Button
            variant="primary"
            size="sm"
            className="sanitary-modal-header-btn"
            onClick={() => handleSave("submit")}
            disabled={saving || isOutOfStock || !hasValidItems}
            isLoading={saving}
            style={{ padding: "6px 18px", height: 36, borderRadius: 8, fontWeight: 700, fontSize: 13 }}
          >
            {saving ? "Đang lưu..." : (
              isDirectOrder ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="bi bi-cart-plus" />
                  <span className="d-none d-sm-inline">Tạo đơn hàng</span>
                  <span className="d-inline d-sm-none">Tạo đơn</span>
                </span>
              ) : type === "retail" ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="bi bi-floppy" />
                  <span className="d-none d-sm-inline">Lưu báo giá</span>
                  <span className="d-inline d-sm-none">Lưu</span>
                </span>
              ) : (
                pheduyet ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <i className="bi bi-send" />
                    <span className="d-none d-sm-inline">Trình duyệt</span>
                    <span className="d-inline d-sm-none">Duyệt</span>
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <i className="bi bi-floppy" />
                    <span className="d-none d-sm-inline">Lưu báo giá</span>
                    <span className="d-inline d-sm-none">Lưu</span>
                  </span>
                )
              )
            )}
          </Button>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
            style={{ width: 36, height: 36, border: "1px solid #cbd5e1", background: "#ffffff", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Đóng"
          >
            <i className="bi bi-x-lg" style={{ fontSize: 15 }} />
          </button>
        </div>
      </div>

      <div className="sanitary-modal-body" style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, background: "#EBF0F5" }}>
        {/* Backdrop for Offcanvas */}
        {showInfoSidebar && (
          <div
            onClick={() => setShowInfoSidebar(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(2.5px)",
              zIndex: 199
            }}
          />
        )}

        {/* Left Side: Info */}
        <div className={`sanitary-modal-left ${showInfoSidebar ? "show" : ""}`} style={{ width: 400, flexShrink: 0, borderRight: "1px solid #e2e8f0", position: "relative", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "#ffffff" }}>
          <div style={{ flex: 1, minHeight: 0, padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "#ffffff", overflowY: "auto" }}>
            {/* Offcanvas Header */}
            <div className="sanitary-modal-sidebar-header" style={{ display: "none", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #e2e8f0", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="bi bi-info-circle-fill" style={{ fontSize: 16, color: "var(--color-primary, #0284c7)" }} />
                <span style={{ fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-primary, #0284c7)" }}>Thông tin chung</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoSidebar(false)}
                style={{
                  background: "rgba(0,0,0,0.06)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                  color: "var(--foreground)",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Đóng"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
              <Input
                label="Số báo giá"
                required
                value={info.soPhieu}
                onChange={setInfoField("soPhieu")}
                readOnly={!editData?.id}
                style={{
                  backgroundColor: editData?.id ? "#ffffff" : "#f1f5f9",
                  fontFamily: "monospace",
                  fontWeight: 700,
                }}
              />
              <label
                onClick={() => setUuTienCao(v => !v)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
                  padding: "0 12px", height: "38px", boxSizing: "border-box",
                  background: uuTienCao ? "rgba(239,68,68,0.07)" : "#f8fafc",
                  borderRadius: 6,
                  border: `1px solid ${uuTienCao ? "rgba(239,68,68,0.3)" : "#cbd5e1"}`,
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <i className="bi bi-lightning-charge-fill" style={{ fontSize: 13, color: uuTienCao ? "#ef4444" : "#64748b" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: uuTienCao ? "#ef4444" : "#334155" }}>Ưu tiên</span>
                </div>
                <div
                  style={{
                    width: 36, height: 20, borderRadius: 10, position: "relative", transition: "background 0.2s",
                    background: uuTienCao ? "#ef4444" : "#cbd5e1",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: uuTienCao ? 19 : 3,
                    width: 14, height: 14, borderRadius: "50%", background: "#fff",
                    transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </div>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input
                type="date"
                label={isDirectOrder ? "Ngày đặt hàng" : "Ngày lập"}
                required
                value={info.ngayLap}
                onChange={setInfoField("ngayLap")}
              />
              <Input
                type="date"
                label={isDirectOrder ? "Ngày giao hàng" : "Hiệu lực đến"}
                required={isDirectOrder}
                value={isDirectOrder ? info.ngayGiaoHang : info.hieuLuc}
                onChange={setInfoField(isDirectOrder ? "ngayGiaoHang" : "hieuLuc")}
              />
            </div>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Khách hàng</p>
              {!editData?.id ? (
                /* Chế độ tạo mới: Nhập liệu thông tin khách hàng */
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                    <Input
                      label="Tên khách hàng"
                      value={custInfo.name}
                      onChange={e => setCustInfo(prev => ({ ...prev, name: e.target.value, id: "" }))}
                      style={{ backgroundColor: "#ffffff" }}
                    />
                    <Input
                      label="Số điện thoại"
                      value={custInfo.dienThoai}
                      onChange={e => setCustInfo(prev => ({ ...prev, dienThoai: e.target.value }))}
                      style={{ backgroundColor: "#ffffff" }}
                    />
                  </div>
                  <Input
                    label="Địa chỉ"
                    value={custInfo.address}
                    onChange={e => setCustInfo(prev => ({ ...prev, address: e.target.value }))}
                    style={{ backgroundColor: "#ffffff" }}
                  />
                  {debtInfo && (
                    <div style={{
                      marginTop: 6,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      background: "rgba(2, 132, 199, 0.06)",
                      padding: 8,
                      borderRadius: 8,
                      border: "1px dashed rgba(2, 132, 199, 0.25)"
                    }}>
                      <div>
                        <span style={{ fontSize: 9.5, color: "#64748b", display: "block", fontWeight: 600 }}>CÔNG NỢ HIỆN TẠI</span>
                        <strong style={{ fontSize: 11.5, color: "#ef4444" }}>{debtInfo.outstandingDebt.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 9.5, color: "#64748b", display: "block", fontWeight: 600 }}>HẠN MỨC CÔNG NỢ</span>
                        <strong style={{ fontSize: 11.5, color: "var(--color-primary, #0284c7)" }}>{debtInfo.creditLimit.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Chế độ xem/sửa: Hiển thị tĩnh */
                customer?.nhom === "doanh-nghiep" || customer?.nhom === "doi-tac" ? (
                  /* Doanh nghiệp / Đối tác */
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{customer?.name || "—"}</span>
                    {customer?.address && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                        <i className="bi bi-geo-alt-fill" style={{ fontSize: 11, color: "#f43f5e", marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.3 }}>{customer.address}</span>
                      </div>
                    )}
                    {customer?.daiDien && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <i className="bi bi-person-fill" style={{ fontSize: 11, color: "var(--color-primary, #0284c7)", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          {customer.xungHo ? `${customer.xungHo} ` : ""}{customer.daiDien}
                          {customer.chucVu && <span style={{ fontStyle: "italic", marginLeft: 4 }}>– {customer.chucVu}</span>}
                        </span>
                      </div>
                    )}
                    {(customer?.dienThoai || customer?.email) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
                        {customer.dienThoai && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}>
                            <i className="bi bi-telephone-fill" style={{ fontSize: 10, color: "#10b981" }} />
                            {customer.dienThoai}
                          </div>
                        )}
                        {customer.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}>
                            <i className="bi bi-envelope-fill" style={{ fontSize: 10, color: "#3b82f6" }} />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    )}
                    {debtInfo && (
                      <div style={{
                        marginTop: 6,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        background: "rgba(2, 132, 199, 0.06)",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px dashed rgba(2, 132, 199, 0.25)"
                      }}>
                        <div>
                          <span style={{ fontSize: 9.5, color: "#64748b", display: "block", fontWeight: 600 }}>CÔNG NỢ HIỆN TẠI</span>
                          <strong style={{ fontSize: 11.5, color: "#ef4444" }}>{debtInfo.outstandingDebt.toLocaleString("vi-VN")} ₫</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 9.5, color: "#64748b", display: "block", fontWeight: 600 }}>HẠN MỨC CÔNG NỢ</span>
                          <strong style={{ fontSize: 11.5, color: "var(--color-primary, #0284c7)" }}>{debtInfo.creditLimit.toLocaleString("vi-VN")} ₫</strong>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Cá nhân / Khách lẻ */
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                      {customer?.daiDien
                        ? `${customer.xungHo ? customer.xungHo + " " : ""}${customer.daiDien}`
                        : customer?.name || "—"}
                    </span>
                    {customer?.address && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                        <i className="bi bi-geo-alt-fill" style={{ fontSize: 11, color: "#f43f5e", marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.3 }}>{customer.address}</span>
                      </div>
                    )}
                    {(customer?.dienThoai || customer?.email) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
                        {customer?.dienThoai && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}>
                            <i className="bi bi-telephone-fill" style={{ fontSize: 10, color: "#10b981" }} />
                            {customer.dienThoai}
                          </div>
                        )}
                        {customer?.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}>
                            <i className="bi bi-envelope-fill" style={{ fontSize: 10, color: "#3b82f6" }} />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    )}
                    {debtInfo && (
                      <div style={{
                        marginTop: 6,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        background: "rgba(2, 132, 199, 0.06)",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px dashed rgba(2, 132, 199, 0.25)"
                      }}>
                        <div>
                          <span style={{ fontSize: 9.5, color: "#64748b", display: "block", fontWeight: 600 }}>CÔNG NỢ HIỆN TẠI</span>
                          <strong style={{ fontSize: 11.5, color: "#ef4444" }}>{debtInfo.outstandingDebt.toLocaleString("vi-VN")} ₫</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 9.5, color: "#64748b", display: "block", fontWeight: 600 }}>HẠN MỨC CÔNG NỢ</span>
                          <strong style={{ fontSize: 11.5, color: "var(--color-primary, #0284c7)" }}>{debtInfo.creditLimit.toLocaleString("vi-VN")} ₫</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input
                key={`ck-${open}-${editData?.id || "new"}`}
                type="number"
                label="Chiết khấu tổng (%)"
                value={info.chietKhauTong}
                hideZero={false}
                numberGroup={false}
                onNumericChange={v => setInfo(f => ({ ...f, chietKhauTong: Math.max(0, Math.min(100, v)) }))}
              />
              <Input
                key={`vat-${open}-${editData?.id || "new"}`}
                type="number"
                label="Thuế VAT (%)"
                value={info.thue}
                hideZero={false}
                numberGroup={false}
                onNumericChange={v => setInfo(f => ({ ...f, thue: Math.max(0, Math.min(100, v)) }))}
              />
            </div>
            {type !== "retail" && !isDirectOrder && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Loại báo giá</label>
                    <label
                      onClick={() => setInfo(f => ({ ...f, quoteType: f.quoteType === "Có quầy kệ" ? "Không có quầy kệ" : "Có quầy kệ" }))}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
                        padding: "0 12px", height: "38px", boxSizing: "border-box",
                        background: info.quoteType === "Có quầy kệ" ? "rgba(2, 132, 199, 0.08)" : "#f8fafc",
                        borderRadius: 6,
                        border: `1px solid ${info.quoteType === "Có quầy kệ" ? "rgba(2, 132, 199, 0.35)" : "#cbd5e1"}`,
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <i className="bi bi-shop" style={{ fontSize: 13, color: info.quoteType === "Có quầy kệ" ? "var(--color-primary, #0284c7)" : "#64748b" }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: info.quoteType === "Có quầy kệ" ? "var(--color-primary, #0284c7)" : "#334155" }}>Có quầy kệ</span>
                      </div>
                      <div
                        style={{
                          width: 36, height: 20, borderRadius: 10, position: "relative", transition: "background 0.2s",
                          background: info.quoteType === "Có quầy kệ" ? "var(--color-primary, #0284c7)" : "#cbd5e1",
                        }}
                      >
                        <div style={{
                          position: "absolute", top: 3, left: info.quoteType === "Có quầy kệ" ? 19 : 3,
                          width: 14, height: 14, borderRadius: "50%", background: "#fff",
                          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }} />
                      </div>
                    </label>
                  </div>
                  <Input
                    key={`tc-${open}-${editData?.id || "new"}`}
                    type="number"
                    label="Chi phí thi công lắp đặt (đ)"
                    value={info.chiPhiThiCong}
                    numberGroup={true}
                    allowDecimal={false}
                    placeholder="0"
                    disabled={!isCoQuayKe}
                    onNumericChange={v => setInfo(f => ({ ...f, chiPhiThiCong: Math.max(0, v) }))}
                    style={{
                      backgroundColor: isCoQuayKe ? "#ffffff" : "#f1f5f9",
                      cursor: isCoQuayKe ? undefined : "not-allowed",
                    }}
                  />
                </div>
                {isSanitary && (
                  <div>
                    {isCoQuayKe && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                        <Input
                          key={`kv-${open}-${editData?.id || "new"}`}
                          type="number"
                          label="Số khu vực"
                          value={soKhuVuc}
                          hideZero={false}
                          numberGroup={false}
                          allowDecimal={false}
                          onNumericChange={v => setSoKhuVuc(Math.min(20, Math.max(1, v || 1)))}
                        />
                        <Input
                          key={`tl-${open}-${editData?.id || "new"}`}
                          type="number"
                          label="Tỷ lệ giá đại lý (%)"
                          value={tyLeGiaDaiLy}
                          hideZero={false}
                          numberGroup={false}
                          onNumericChange={v => handleTyLeGiaDaiLyChange(Math.min(100, Math.max(0, v)))}
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Bản vẽ đính kèm</label>
                      <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        {Array.from({ length: Math.min(soKhuVuc, 5) }).map((_, i) => {
                          const idx = i + 1;
                          const key = `fileKhuVuc${idx}` as "fileKhuVuc1" | "fileKhuVuc2" | "fileKhuVuc3" | "fileKhuVuc4" | "fileKhuVuc5";
                          const url = info[key];
                          return renderAttachmentButton({ keyProp: key, label: `Bản vẽ KV ${idx}`, fileUrl: url || "", uploadKey: key, disabled: !isCoQuayKe });
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="form-group" style={{ flexShrink: 0 }}>
              <label className="form-label">Điều khoản tham chiếu</label>
              <textarea
                ref={ghiChuRef}
                className="form-input"
                value={info.ghiChu}
                onChange={e => {
                  isGhiChuEdited.current = true;
                  setInfo(prev => ({ ...prev, ghiChu: e.target.value }));
                  adjustGhiChuHeight();
                }}
                style={{ padding: "8px 12px", resize: "none", overflow: "hidden", minHeight: 100, lineHeight: 1.5, height: "auto" }}
              />
            </div>

            {/* Action button at bottom on mobile */}
            <div className="d-block d-md-none" style={{ marginTop: 8, paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))" }}>
              <button
                type="button"
                onClick={() => setShowInfoSidebar(false)}
                style={{
                  width: "100%",
                  height: 42,
                  background: "var(--color-primary, #0284c7)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <i className="bi bi-check2" /> Hoàn tất & Quay lại báo giá
              </button>
            </div>

          </div> {/* close inner panel */}

          {/* Drawings Sidebar overlay */}
          {showDrawings && isCoQuayKe && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "#ffffff",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              padding: 20,
              borderRight: "1px solid #e2e8f0",
              overflowY: "auto"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-primary, #0284c7)" }}>Bản vẽ đính kèm</span>
                <button onClick={() => setShowDrawings(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#0f172a", display: "flex", alignItems: "center" }}><i className="bi bi-x-lg" /></button>
              </div>
              {(!info.fileKhuVuc1 && !info.fileKhuVuc2 && !info.fileKhuVuc3 && !info.fileKhuVuc4 && !info.fileKhuVuc5) ? (
                <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 13 }}>
                  Chưa có bản vẽ nào được tải lên
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[1, 2, 3, 4, 5].map(idx => {
                    const key = `fileKhuVuc${idx}` as "fileKhuVuc1" | "fileKhuVuc2" | "fileKhuVuc3" | "fileKhuVuc4" | "fileKhuVuc5";
                    const url = info[key];
                    if (!url) return null;
                    return (
                      <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>BẢN VẼ KHU VỰC {idx}</span>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Bản vẽ khu vực ${idx}`} style={{ width: "100%", borderRadius: 8, border: "1px solid #e2e8f0", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"} />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Items Table */}
        <div className="sanitary-modal-right" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#ffffff" }}>
          <div className="sanitary-modal-subheader" style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="sanitary-modal-toggle-btn"
                onClick={() => setShowInfoSidebar(true)}
                style={{
                  padding: "5px 10px",
                  background: "var(--color-primary, #0284c7)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "none",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <i className="bi bi-layout-sidebar-inset" />
                <span className="d-none d-sm-inline">Thông tin chung</span>
                <span className="d-inline d-sm-none">TT chung</span>
              </button>
              <span className="sanitary-modal-subheader-title" style={{ fontWeight: 700, fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <span className="d-none d-sm-inline">Bảng danh sách hàng hoá</span>
                <span className="d-inline d-sm-none">Sản phẩm ({items.length})</span>
              </span>
              <TrangThaiTonKhoBadge
                items={items.map(it => ({ ten: it.ten, soLuong: it.soLuong, soLuongTon: it.soLuongTon }))}
                showPurchaseRequest={false}
              />
            </div>
            {/* Phê duyệt switch */}
            {type !== "retail" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={pheduyet}
                    onChange={e => {
                      const checked = e.target.checked;
                      setPheduyet(checked);
                      if (checked && !approverId && approvers.length > 0) {
                        const director = approvers.find(a => (a.position || "").toLowerCase() === "giám đốc") || approvers[0];
                        if (director) {
                          setApproverId(String(director.id));
                          setApproverName(director.name);
                        }
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  /> Cần phê duyệt
                </label>
                {pheduyet && (
                  <div style={{ width: 250 }}>
                    <EmployeeSelect
                      multiple={false}
                      clearable={false}
                      allowManualInput={false}
                      departmentFilter="Ban Giám đốc"
                      employees={approvers}
                      value={approverName}
                      onChange={(val, selectedObjs) => {
                        setApproverName(val);
                        const selected = selectedObjs?.[0] || approvers.find(a => a.name === val);
                        setApproverId(selected ? String(selected.id) : "");
                      }}
                      placeholder="Chọn người phê duyệt..."
                      inputStyle={{ height: 34, fontSize: 13 }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sanitary-modal-table-container" style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Form nhập liệu rút gọn (Dành cho Bán lẻ / Không quầy kệ) */}
            {!isCoQuayKe && (
              <div className="sanitary-modal-add-form" style={{ padding: 12, background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                <div className="sanitary-modal-field-product" style={{ flex: "1 1 240px", minWidth: 200, position: "relative" }}>
                  <Input
                    label="Sản phẩm / Dịch vụ"
                    required
                    placeholder="Tìm kiếm hoặc nhập tên sản phẩm..."
                    prefix={<i className="bi bi-search" style={{ fontSize: 12 }} />}
                    value={formItem.ten}
                    onChange={e => {
                      const v = e.target.value;
                      setFormItem(prev => ({ ...prev, ten: v }));
                      if (!v) {
                        setSuggest([]);
                      } else {
                        setActiveRowIdSync(-1);
                        fetchSuggest(v, -1);
                      }
                    }}
                    onFocus={() => { setActiveRowIdSync(-1); fetchSuggest(formItem.ten, -1); }}
                    onBlur={() => { setTimeout(() => { if (activeRowIdRef.current === -1) { setSuggest([]); setActiveRowIdSync(null); } }, 200); }}
                  />
                  {activeRowId === -1 && suggest.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                      {suggest.map(s => (
                        <div key={s.id} onClick={() => applySuggest(-1, s)}
                          onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #e2e8f0", transition: "background 0.1s" }}
                        >
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{s.tenHang}</div>
                          <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 8, marginTop: 2 }}>
                            {s.code && <span style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "0 5px", borderRadius: 4 }}>{s.code}</span>}
                            <span>Thực tồn: <b>{s.thucTon ?? s.soLuong}</b> {s.donVi}</span>
                            <span>Giá: <b>{s.giaBan.toLocaleString("vi-VN")} ₫</b></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sanitary-modal-row-pricing" style={{ display: "flex", gap: 10, alignItems: "flex-end", flex: "0 0 auto" }}>
                  <div className="sanitary-modal-field-dvt" style={{ width: 80 }}>
                    <Input
                      label="ĐVT"
                      value={formItem.dvt}
                      onChange={e => setFormItem(p => ({ ...p, dvt: e.target.value }))}
                      style={{ textAlign: "center" }}
                    />
                  </div>
                  <div className="sanitary-modal-field-qty" style={{ width: 85 }}>
                    <Input
                      key={`qty-${formResetKey}-${formItem.id}`}
                      type="number"
                      label="Số lượng"
                      required
                      value={formItem.soLuong}
                      hideZero={false}
                      numberGroup={true}
                      allowDecimal={false}
                      onNumericChange={v => setFormItem(p => ({ ...p, soLuong: Math.max(1, v || 1) }))}
                      style={{ textAlign: "right" }}
                    />
                  </div>
                  <div className="sanitary-modal-field-ck" style={{ width: 95 }}>
                    <Input
                      key={`ck-item-${formResetKey}-${formItem.id}`}
                      type="number"
                      label="Chiết khấu (%)"
                      value={formItem.ckPct}
                      hideZero={false}
                      numberGroup={false}
                      onNumericChange={v => setFormItem(p => ({ ...p, ckPct: Math.max(0, Math.min(100, v)) }))}
                      style={{ textAlign: "right" }}
                    />
                  </div>
                  <div className="sanitary-modal-field-price" style={{ width: 135 }}>
                    <Input
                      key={`price-${formResetKey}-${formItem.id}`}
                      type="number"
                      label="Đơn giá (đ)"
                      value={formItem.donGia}
                      numberGroup={true}
                      allowDecimal={false}
                      placeholder="0"
                      onNumericChange={v => setFormItem(p => ({ ...p, donGia: Math.max(0, v) }))}
                      style={{ textAlign: "right" }}
                    />
                  </div>
                </div>

                <div className="sanitary-modal-form-actions" style={{ display: "flex", gap: 6 }}>
                  <Button
                    variant="primary"
                    disabled={!formItem.ten.trim()}
                    onClick={addRow}
                    leftIcon={<i className="bi bi-plus-lg" />}
                    style={{ padding: "0 16px", height: 38, borderRadius: 6, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    Thêm
                  </Button>
                </div>
              </div>
            )}

            <table className="sanitary-modal-table sanitary-modal-desktop-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #cbd5e1", color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {isCoQuayKe ? (
                    <>
                      <th style={{ padding: "8px 10px", width: 40, fontWeight: 700 }}>#</th>
                      <th style={{ padding: "8px 10px", fontWeight: 700 }}>Tên hàng hoá</th>
                      <th style={{ padding: "8px 10px", width: 120, fontWeight: 700 }}>Vị trí</th>
                      <th style={{ padding: "8px 10px", width: 100, fontWeight: 700 }}>Quy cách</th>
                      <th style={{ padding: "8px 10px", width: 120, textAlign: "right", fontWeight: 700 }}>Giá bán (đ)</th>
                      <th style={{ padding: "8px 10px", width: 120, textAlign: "right", fontWeight: 700 }}>Giá đại lý (đ)</th>
                      <th style={{ padding: "8px 10px", width: 40 }} />
                    </>
                  ) : (
                    <>
                      <th style={{ padding: "8px 10px", width: 40, fontWeight: 700 }}>#</th>
                      <th style={{ padding: "8px 10px", fontWeight: 700 }}>Tên hàng hoá - Dịch vụ</th>
                      <th style={{ padding: "8px 10px", width: 70, textAlign: "center", fontWeight: 700 }}>ĐVT</th>
                      <th style={{ padding: "8px 10px", width: 90, textAlign: "center", fontWeight: 700 }}>Số lượng</th>
                      <th style={{ padding: "8px 10px", width: 110, textAlign: "center", fontWeight: 700 }}>Chiết khấu (%)</th>
                      <th style={{ padding: "8px 10px", width: 130, textAlign: "right", fontWeight: 700 }}>Đơn giá (đ)</th>
                      <th style={{ padding: "8px 10px", width: 130, textAlign: "right", fontWeight: 700 }}>Thành tiền (đ)</th>
                      <th style={{ padding: "8px 10px", width: 40 }} />
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isCoQuayKe ? (
                  soKhuVuc > 1 ? (
                    Array.from({ length: soKhuVuc }).map((_, kvIdx) => {
                      const areaName = `Khu vực ${kvIdx + 1}`;
                      const isCollapsed = !!collapsedAreas[areaName];
                      const areaItems = items.filter(it => it.viTri === areaName);

                      return (
                        <React.Fragment key={areaName}>
                          {/* Accordion Header Row */}
                          <tr
                            onClick={() => setCollapsedAreas(prev => ({ ...prev, [areaName]: !prev[areaName] }))}
                            style={{ background: "rgba(2, 132, 199, 0.06)", cursor: "pointer", borderBottom: "1px solid #e2e8f0" }}
                          >
                            <td colSpan={7} style={{ padding: "10px 12px", fontWeight: 800, color: "var(--color-primary, #0284c7)" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <i className={`bi bi-chevron-${isCollapsed ? "right" : "down"}`} style={{ fontSize: 13 }} />
                                  <span>{areaName}</span>
                                  <span style={{ fontSize: 11, fontWeight: 500, color: "#64748b", background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 10 }}>
                                    {areaItems.length} mặt hàng
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Accordion Content Rows */}
                          {!isCollapsed && (
                            <>
                              {areaItems.map((it, areaItemIdx) => renderQuayKeRow(it, areaItemIdx))}

                              <tr>
                                <td colSpan={7} style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
                                  <button
                                    disabled={areaItems.some(it => !it.ten.trim())}
                                    onClick={() => {
                                      setItems(r => [...r, { id: nextId.current++, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, giaDaiLy: 0, viTri: areaName }]);
                                    }}
                                    style={{
                                      padding: "5px 12px",
                                      border: "1px dashed var(--color-primary, #0284c7)",
                                      background: "none",
                                      borderRadius: 6,
                                      cursor: areaItems.some(it => !it.ten.trim()) ? "not-allowed" : "pointer",
                                      opacity: areaItems.some(it => !it.ten.trim()) ? 0.5 : 1,
                                      color: "var(--color-primary, #0284c7)",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      transition: "all 0.15s"
                                    }}
                                    onMouseEnter={e => { if (!areaItems.some(it => !it.ten.trim())) e.currentTarget.style.background = "rgba(2, 132, 199, 0.05)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                                  >
                                    <i className="bi bi-plus-lg" /> Thêm dòng vào {areaName}
                                  </button>
                                </td>
                              </tr>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    items.map((it, idx) => renderQuayKeRow(it, idx))
                  )
                ) : (
                  items.filter(it => it.ten.trim().length > 0).length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Chưa có sản phẩm nào</td></tr>
                  ) : items.filter(it => it.ten.trim().length > 0).map((originalIt, idx) => {
                    const it = formItem.id === originalIt.id ? (formItem as any) : originalIt;
                    return (
                      <tr key={it.id} style={{ borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" }}>
                        <td style={{ padding: 10, color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>{it.ten}</span>
                            {it.ten.trim() && it.soLuongTon !== null && it.soLuongTon !== undefined && (() => {
                              const ton = it.soLuongTon as number;
                              const isOutOfFinishedGood = ton === 0 || it.soLuong > ton;
                              if (!isOutOfFinishedGood) return null;
                              return ton === 0 ? (
                                <span title="Hết hàng" style={{ color: "#ef4444", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
                                  <span style={{ fontSize: 11, fontWeight: 600 }}>Hết hàng</span>
                                </span>
                              ) : (
                                <span title={`Thiếu hàng (thực tồn: ${ton})`} style={{ color: "#f97316", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 13 }} />
                                  <span style={{ fontSize: 11, fontWeight: 600 }}>Thiếu hàng (tồn: {ton})</span>
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td style={{ padding: 6, textAlign: "center", color: "#334155" }}>{it.dvt}</td>
                        <td style={{ padding: 6, textAlign: "center", color: "#334155" }}>{it.soLuong}</td>
                        <td style={{ padding: 6, textAlign: "center", color: "#334155" }}>{it.ckPct}</td>
                        <td style={{ padding: 6, textAlign: "right", color: "#334155" }}>{fmt(it.donGia)}</td>
                        <td style={{ padding: 6, textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{fmt(thanhTien(it))} đ</td>
                        <td style={{ padding: 6 }}>
                          <button onClick={() => removeRow(it.id)} style={{ padding: 4, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                            <i className="bi bi-trash" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Mobile Cards List */}
            <div className="sanitary-modal-mobile-list">
              {(isCoQuayKe ? items : items.filter(it => it.ten.trim().length > 0)).length === 0 ? (
                <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--muted-foreground)", background: "rgba(0,0,0,0.02)", border: "1px dashed var(--border)", borderRadius: 8, fontSize: 13 }}>
                  <i className="bi bi-bag-plus" style={{ fontSize: 24, display: "block", marginBottom: 4, opacity: 0.45 }} />
                  <span style={{ fontWeight: 600 }}>Chưa có sản phẩm nào</span>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Tìm và thêm sản phẩm từ biểu mẫu phía trên</div>
                </div>
              ) : (
                (isCoQuayKe ? items : items.filter(it => it.ten.trim().length > 0)).map((it, idx) => {
                  const isSelected = !isCoQuayKe && formItem.id === it.id;
                  const ton = it.soLuongTon as number;
                  const isOutOfFinishedGood = it.ten.trim() && it.soLuongTon !== null && it.soLuongTon !== undefined && (ton === 0 || it.soLuong > ton);

                  return (
                    <div
                      key={it.id}
                      onClick={() => !isCoQuayKe && setFormItem(it as any)}
                      style={{
                        background: isSelected ? "rgba(59,130,246,0.06)" : "var(--card)",
                        border: isSelected ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        cursor: !isCoQuayKe ? "pointer" : "default",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                      }}
                    >
                      {/* Row 1: Index + Title + Delete */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, background: "var(--muted)", color: "var(--muted-foreground)", borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>
                            #{idx + 1}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)", lineHeight: 1.3, display: "block" }}>
                              {it.ten || "—"}
                            </span>
                            {it.viTri && (
                              <span style={{ fontSize: 10, color: "var(--muted-foreground)", display: "inline-block", marginTop: 2 }}>
                                Vị trí: <b>{it.viTri}</b>
                              </span>
                            )}
                            {isSelected && (
                              <span style={{ fontSize: 10, color: "var(--primary)", fontWeight: 700, display: "inline-block", marginTop: 2, marginLeft: 4 }}>
                                <i className="bi bi-pencil-square me-1" /> Đang chọn
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRow(it.id);
                          }}
                          style={{
                            border: "none",
                            background: "rgba(239,68,68,0.08)",
                            color: "#ef4444",
                            borderRadius: 6,
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0
                          }}
                          title="Xoá"
                        >
                          <i className="bi bi-trash" style={{ fontSize: 13 }} />
                        </button>
                      </div>

                      {/* Row 2: Badges if applicable */}
                      {isOutOfFinishedGood && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {ton === 0 ? (
                            <span style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", padding: "1px 6px", borderRadius: 4, fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <i className="bi bi-x-circle-fill" style={{ fontSize: 10 }} /> Hết hàng
                            </span>
                          ) : (
                            <span style={{ color: "#f97316", background: "rgba(249,115,22,0.08)", padding: "1px 6px", borderRadius: 4, fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 10 }} /> Thiếu hàng (tồn: {ton})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Row 3: Pricing & Quantity */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, borderTop: "1px dashed var(--border)", paddingTop: 6 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--muted-foreground)", fontSize: 11.5 }}>
                          <span>SL: <b style={{ color: "var(--foreground)" }}>{it.soLuong}</b> {it.dvt}</span>
                          <span>×</span>
                          <span>{fmt(it.donGia)} đ</span>
                          {it.ckPct > 0 && <span style={{ color: "#f59e0b", fontWeight: 600 }}>(-{it.ckPct}%)</span>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>
                            {fmt(thanhTien(it))} ₫
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom summaries */}
          <div className="sanitary-modal-footer" style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff" }}>
            <div className="sanitary-modal-footer-bottom" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                {isCoQuayKe && (() => {
                  const hasDrawings = !!(info.fileKhuVuc1 || info.fileKhuVuc2 || info.fileKhuVuc3 || info.fileKhuVuc4 || info.fileKhuVuc5);
                  return (
                    <button
                      disabled={!hasDrawings}
                      onClick={() => setShowDrawings(v => !v)}
                      style={{
                        padding: "6px 14px",
                        border: "1.5px solid var(--color-primary, #0284c7)",
                        background: showDrawings ? "var(--color-primary, #0284c7)" : "transparent",
                        color: showDrawings ? "#fff" : "var(--color-primary, #0284c7)",
                        borderRadius: 8,
                        cursor: hasDrawings ? "pointer" : "not-allowed",
                        fontSize: 13,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: hasDrawings ? 1 : 0.4,
                        transition: "all 0.15s"
                      }}
                    >
                      <i className="bi bi-image" /> {showDrawings ? "Ẩn bản vẽ" : "Xem bản vẽ"}
                    </button>
                  );
                })()}
              </div>
              <div className="sanitary-modal-footer-mobile-grandtotal">
                <span>TỔNG CỘNG</span>
                <span>{fmt(tongCong)} ₫</span>
              </div>
            </div>

            <div className="sanitary-modal-footer-totals" style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div><p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Tạm tính</p><p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>{fmt(tamTinh)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Khấu trừ</p><p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>− {fmt(ckTien)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Thuế</p><p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>+ {fmt(thueTien)} ₫</p></div>
              {info.chiPhiThiCong > 0 && <div><p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Chi phí thi công</p><p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>+ {fmt(info.chiPhiThiCong)} ₫</p></div>}
              <div className="sanitary-modal-footer-grandtotal"><p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--color-primary, #0284c7)" }}>TỔNG CỘNG</p><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--color-primary, #0284c7)" }}>{fmt(tongCong)} ₫</p></div>
            </div>
          </div>
        </div>
      </div>
      <PrintPreviewModal open={printOpen} onClose={() => { setPrintOpen(false); setPrintAction(""); }} customer={customer} items={items} info={info} initialAction={printAction} />
    </div>
  );
}
