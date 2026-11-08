import * as XLSX from "xlsx";

export interface CompanyExportInfo {
  name?: string;
  address?: string;
  taxCode?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
  format?: "text" | "number" | "currency" | "date";
}

export interface ExportReportOptions {
  fileName: string;
  sheetName?: string;
  company?: CompanyExportInfo;
  formCode?: string; // Mẫu số S09-DN, S12-DN...
  title: string;
  subtitle?: string; // Kỳ báo cáo: Từ ngày ... đến ngày ...
  extraInfo?: string[]; // Kho hàng: ..., Tên vật tư: ...
  headers: string[][]; // Hỗ trợ header 1 hoặc 2 tầng
  merges?: XLSX.Range[];
  columnsWidths?: number[];
  data: any[][];
  totalsRow?: any[];
  signatures?: string[];
  docDate?: string;
}

/**
 * Xuất dữ liệu ra file Excel có định dạng chuẩn bản in (Enterprise Standard)
 * Bao gồm Header công ty, Tiêu đề báo cáo, Bảng dữ liệu có tổng cộng và khối chữ ký
 */
export function exportStandardReportExcel(options: ExportReportOptions) {
  const {
    fileName,
    sheetName = "Bao_Cao",
    company,
    formCode,
    title,
    subtitle,
    extraInfo = [],
    headers,
    merges = [],
    columnsWidths,
    data,
    totalsRow,
    signatures = ["Người lập biểu", "Thủ kho", "Kế toán trưởng", "Giám đốc"],
    docDate,
  } = options;

  const rows: any[][] = [];
  const colCount = Math.max(
    ...headers.map((h) => h.length),
    data[0]?.length || 0,
    totalsRow?.length || 0,
    8
  );

  // 1. Header công ty và Mẫu số quy định
  const companyName = company?.name || "CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM";
  const companyAddress = company?.address ? `Địa chỉ: ${company.address}` : "";
  const companyTax = company?.taxCode
    ? `MST: ${company.taxCode}${company?.phone ? ` • ĐT: ${company.phone}` : ""}${company?.email ? ` • Email: ${company.email}` : ""}`
    : "";

  rows.push([companyName.toUpperCase(), ...Array(Math.max(0, colCount - 2)).fill(""), formCode || ""]);
  if (companyAddress) {
    rows.push([companyAddress, ...Array(Math.max(0, colCount - 2)).fill(""), formCode ? "(Ban hành theo TT 200/2014/TT-BTC)" : ""]);
  }
  if (companyTax) {
    rows.push([companyTax]);
  }
  rows.push([]); // Dòng trống ngăn cách

  // 2. Tiêu đề báo cáo (Căn giữa)
  const titleRowIndex = rows.length;
  rows.push([title.toUpperCase()]);
  if (subtitle) {
    rows.push([subtitle]);
  }

  // 3. Thông tin bổ sung (Kho hàng, Mặt hàng, ĐVT...)
  extraInfo.forEach((info) => {
    if (info) rows.push([info]);
  });
  rows.push([]); // Dòng trống trước bảng dữ liệu

  // 4. Headers của bảng dữ liệu
  const tableHeaderStartIndex = rows.length;
  headers.forEach((h) => rows.push(h));

  // 5. Nội dung dữ liệu
  data.forEach((d) => rows.push(d));

  // 6. Dòng tổng cộng (nếu có)
  if (totalsRow && totalsRow.length > 0) {
    rows.push(totalsRow);
  }

  // 7. Khối ngày tháng và Chữ ký
  rows.push([]); // Dòng trống
  const now = new Date();
  const dateStr = docDate || `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  
  // Dòng ngày lập
  const dateRow = Array(colCount).fill("");
  dateRow[Math.max(0, colCount - 3)] = `Hà Nội, ${dateStr}`;
  rows.push(dateRow);

  // Dòng chức danh người ký
  const sigStep = Math.max(1, Math.floor(colCount / signatures.length));
  const sigTitleRow = Array(colCount).fill("");
  const sigDescRow = Array(colCount).fill("");

  signatures.forEach((sig, idx) => {
    const colIdx = Math.min(colCount - 1, idx * sigStep + Math.floor(sigStep / 3));
    sigTitleRow[colIdx] = sig.toUpperCase();
    sigDescRow[colIdx] = "(Ký, ghi rõ họ tên)";
  });
  rows.push(sigTitleRow);
  rows.push(sigDescRow);

  // Tạo Worksheet từ mảng 2 chiều (aoa)
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Thiết lập Merges (Hợp nhất ô)
  const allMerges: XLSX.Range[] = [
    // Merge tiêu đề chính
    { s: { r: titleRowIndex, c: 0 }, e: { r: titleRowIndex, c: colCount - 1 } },
    ...(subtitle ? [{ s: { r: titleRowIndex + 1, c: 0 }, e: { r: titleRowIndex + 1, c: colCount - 1 } }] : []),
    ...merges,
  ];
  ws["!merges"] = allMerges;

  // Thiết lập Column Widths (!cols)
  if (columnsWidths && columnsWidths.length > 0) {
    ws["!cols"] = columnsWidths.map((w) => ({ wch: w }));
  } else {
    ws["!cols"] = Array(colCount).fill({ wch: 15 });
  }

  // Tạo Workbook và xuất file
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const finalFileName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, finalFileName);
}

