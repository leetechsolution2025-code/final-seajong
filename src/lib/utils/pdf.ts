export interface ExportPDFOptions {
  orientation?: "portrait" | "landscape";
  pageBreakClass?: string;
  padding?: string;
  scale?: number;
  keepOriginalStyles?: boolean;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  paginate?: boolean;
}

/**
 * Strips background styles from table elements to ensure clean black & white PDF output,
 * and forces explicit borders on all cells to ensure horizontal/vertical gridlines render correctly.
 */
function stripTableBackgrounds(element: HTMLElement) {
  const tableElements = element.querySelectorAll("table, thead, tbody, tr, th, td");
  tableElements.forEach((el: any) => {
    el.classList.remove("table-light", "bg-light", "table-active", "table-hover");
    el.style.setProperty("background", "none", "important");
    el.style.setProperty("background-color", "#ffffff", "important");
    el.style.setProperty("background-image", "none", "important");

    // Force explicit solid borders on headers and cells to prevent html2canvas collapsing bugs
    if (el.tagName === "TD" || el.tagName === "TH") {
      el.style.setProperty("border", "1px solid #94a3b8", "important");
    }
    // Force text color in TH to black so that it is visible on the white background
    if (el.tagName === "TH") {
      el.style.setProperty("color", "#000000", "important");
    }
  });
}

/**
 * Ensures all images inside an element are fully loaded so heights can be calculated accurately.
 */
function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));
  if (images.length === 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let loadedCount = 0;
    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount === images.length) {
        resolve();
      }
    };

    images.forEach((img) => {
      if (img.complete) {
        onImageLoad();
      } else {
        img.addEventListener("load", onImageLoad);
        img.addEventListener("error", onImageLoad); // Resolve even on error
      }
    });
  });
}

/**
 * Programmatically paginates the table and signatures in the cloned DOM element off-screen.
 * It measures layout heights, splits the table into multiple A4-fitting tables, repeats the headers,
 * and positions page breaks cleanly.
 */
function paginateClonedPage(
  clonedPage: HTMLElement,
  orientation: "portrait" | "landscape",
  marginTop: number,
  marginBottom: number,
  docEl: HTMLElement
) {
  const isLandscape = orientation === "landscape";
  const pageWidthMm = isLandscape ? 297 : 210;
  const pageHeightMm = isLandscape ? 210 : 297;
  const elementWidthPx = docEl.offsetWidth || (isLandscape ? 1123 : 794);
  const printableHeightMm = pageHeightMm - marginTop - marginBottom;
  const sliceHeightPx = (printableHeightMm / pageWidthMm) * elementWidthPx;
  const maxPageHeight = Math.floor(sliceHeightPx) - 35; // 35px cushion to prevent natural rendering overflows

  const table = clonedPage.querySelector("table");
  if (!table) return;

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr")) as HTMLTableRowElement[];
  if (rows.length === 0) return;

  // Find signature section - it is a row div that follows the table
  let sigSection = table.nextElementSibling as HTMLElement;
  while (sigSection && !sigSection.classList.contains("row")) {
    sigSection = sigSection.nextElementSibling as HTMLElement;
  }

  // Calculate tableTop position relative to clonedPage
  const clonedPageRect = clonedPage.getBoundingClientRect();
  const tableRect = table.getBoundingClientRect();
  const tableTop = tableRect.top - clonedPageRect.top;

  const theadHeight = thead ? thead.offsetHeight : 0;
  const sigHeight = sigSection ? sigSection.offsetHeight : 0;

  // Paginate rows
  const pages: HTMLTableRowElement[][] = [[]];
  let currentPageHeight = theadHeight;
  let currentPageIndex = 0;

  const getPageLimit = (index: number) => {
    if (index === 0) {
      return maxPageHeight - tableTop;
    }
    return maxPageHeight - 20; // 20px margin room at the top of subsequent pages
  };

  rows.forEach((row, idx) => {
    const rowHeight = row.offsetHeight;
    const limit = getPageLimit(currentPageIndex);

    let shouldPush = false;
    const isHeader = row.classList.contains("pdf-section-header-tr") || row.cells.length < 3 || Array.from(row.cells).some(c => c.colSpan > 1);

    if (isHeader && idx < rows.length - 1) {
      const nextRow = rows[idx + 1];
      const nextRowHeight = nextRow.offsetHeight;
      const nextLimit = getPageLimit(currentPageIndex + 1);
      const combinedHeight = rowHeight + nextRowHeight;

      if (currentPageHeight + combinedHeight > limit && (theadHeight + combinedHeight <= nextLimit)) {
        shouldPush = true;
      }
    } else if (currentPageHeight + rowHeight > limit) {
      shouldPush = true;
    }

    if (shouldPush && pages[currentPageIndex].length > 0) {
      currentPageIndex++;
      pages.push([]);
      currentPageHeight = theadHeight + rowHeight;
    } else {
      currentPageHeight += rowHeight;
    }
    pages[currentPageIndex].push(row);
  });

  // Reconstruct DOM
  const parent = table.parentNode;
  if (!parent) return;

  const container = document.createElement("div");

  pages.forEach((pageRows, pageIdx) => {
    if (pageIdx > 0) {
      // CSS Page Break (class 'html2pdf__page-break' is processed exactly once under 'legacy' mode)
      const pageBreak = document.createElement("div");
      pageBreak.className = "html2pdf__page-break";
      pageBreak.style.cssText = "height: 0; margin: 0; padding: 0; border: none; clear: both;";
      container.appendChild(pageBreak);

      // Top margin spacer for subsequent tables
      const spacer = document.createElement("div");
      spacer.style.height = "20px";
      container.appendChild(spacer);
    }

    // Clone empty table structure
    const newTable = table.cloneNode(false) as HTMLTableElement;
    newTable.style.marginBottom = "0px";

    if (thead) {
      newTable.appendChild(thead.cloneNode(true));
    }

    const newTbody = document.createElement("tbody");
    pageRows.forEach((row) => {
      newTbody.appendChild(row.cloneNode(true));
    });
    newTable.appendChild(newTbody);

    container.appendChild(newTable);
  });

  // Position signatures section
  if (sigSection) {
    const lastPageIndex = pages.length - 1;
    const limit = getPageLimit(lastPageIndex);

    // Read bottom padding of the clonedPage container to ensure it doesn't cause overflow on the final page
    const computedStyle = window.getComputedStyle(clonedPage);
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;

    if (currentPageHeight + sigHeight + 30 + paddingBottom > limit) {
      // Insert page break before signature block if it doesn't fit on the current page
      const pageBreak = document.createElement("div");
      pageBreak.className = "html2pdf__page-break";
      pageBreak.style.cssText = "height: 0; margin: 0; padding: 0; border: none; clear: both;";
      container.appendChild(pageBreak);

      const spacer = document.createElement("div");
      spacer.style.height = "20px";
      container.appendChild(spacer);
    } else {
      const spacer = document.createElement("div");
      spacer.style.height = "30px";
      container.appendChild(spacer);
    }
    container.appendChild(sigSection.cloneNode(true));
  }

  // Replace old table/signature nodes with new paginated DOM structure
  parent.insertBefore(container, table);
  parent.removeChild(table);
  if (sigSection) {
    parent.removeChild(sigSection);
  }
}

/**
 * Splits a single page container's table dynamically if its height exceeds standard A4 boundaries,
 * generating repeated table headers and titles for subsequent split pages.
 */
/**
 * Helper to identify the target data table on the page for pagination,
 * prioritizing data tables with class 'table-bordered' or the one with the most rows.
 */
function getTargetTable(el: HTMLElement): HTMLTableElement | null {
  const tables = Array.from(el.querySelectorAll("table"));
  if (tables.length === 0) return null;
  const borderedTable = tables.find(t => t.classList.contains("table-bordered"));
  if (borderedTable) return borderedTable as HTMLTableElement;
  let target = tables[0];
  let maxRows = 0;
  tables.forEach(t => {
    const rowCount = t.querySelectorAll("tbody tr").length;
    if (rowCount > maxRows) {
      maxRows = rowCount;
      target = t;
    }
  });
  return target as HTMLTableElement;
}

/**
 * Splits a single page container's table dynamically if its height exceeds standard A4 boundaries,
 * generating repeated table headers and titles for subsequent split pages.
 */
async function paginateSinglePageContent(
  pageEl: HTMLElement,
  orientation: "portrait" | "landscape"
): Promise<HTMLElement[]> {
  const isLandscape = orientation === "landscape";

  const table = getTargetTable(pageEl);
  if (!table) return [pageEl.cloneNode(true) as HTMLElement];

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  if (!tbody) return [pageEl.cloneNode(true) as HTMLElement];

  const rows = Array.from(tbody.querySelectorAll("tr")) as HTMLTableRowElement[];
  if (rows.length === 0) return [pageEl.cloneNode(true) as HTMLElement];

  // Measure the heights of elements off-screen
  const tempMeasure = document.createElement("div");
  tempMeasure.id = "pdf-temp-container";
  tempMeasure.style.position = "absolute";
  tempMeasure.style.left = "-9999px";
  tempMeasure.style.top = "-9999px";
  tempMeasure.style.width = isLandscape ? "297mm" : "210mm";
  
  const pageElClone = pageEl.cloneNode(true) as HTMLElement;
  
  // Set layout properties to match PDF styles so height measuring is 100% accurate
  pageElClone.style.boxShadow = "none";
  pageElClone.style.margin = "0";
  pageElClone.style.position = "relative";
  pageElClone.style.width = isLandscape ? "297mm" : "210mm";
  pageElClone.style.boxSizing = "border-box";
  pageElClone.style.background = "#ffffff";
  pageElClone.style.display = pageElClone.classList.contains("pdf-cover-page") ? "flex" : "block";
  if (pageElClone.classList.contains("pdf-cover-page")) {
    pageElClone.style.flexDirection = "column";
    pageElClone.style.justifyContent = "space-between";
  }

  if (pageElClone.classList.contains("pdf-cover-page")) {
    pageElClone.style.padding = "0";
  } else {
    pageElClone.style.paddingTop = pageElClone.style.paddingTop || (isLandscape ? "15mm" : "20mm");
    pageElClone.style.paddingRight = pageElClone.style.paddingRight || (isLandscape ? "15mm" : "20mm");
    pageElClone.style.paddingBottom = pageElClone.style.paddingBottom || (isLandscape ? "15mm" : "20mm");
    pageElClone.style.paddingLeft = pageElClone.style.paddingLeft || (isLandscape ? "15mm" : "25mm");
  }

  // Inject PDF styles inside the clone so that fonts, line heights, and table styles match the output PDF
  injectPDFStyles(pageElClone, orientation);

  tempMeasure.appendChild(pageElClone);
  document.body.appendChild(tempMeasure);

  // Wait for fonts & images to load completely so exact layout wrap size is obtained
  if (document.fonts) {
    await document.fonts.ready;
  }
  await waitForImages(tempMeasure);

  const theadHeight = thead ? (thead.offsetHeight || 0) : 0;
  
  const pageRect = pageElClone.getBoundingClientRect();
  const tableElInClone = getTargetTable(pageElClone);
  const tableRect = tableElInClone ? tableElInClone.getBoundingClientRect() : { top: 0 };
  const tableTop = tableRect.top - pageRect.top;

  const totalPageHeight = pageRect.height;
  const pageHeightMm = isLandscape ? 210 : 297;
  const pageHeightPx = (pageHeightMm * 96) / 25.4; // A4 height: ~1122.5px (portrait), ~793.7px (landscape)

  if (totalPageHeight <= pageHeightPx + 5) {
    document.body.removeChild(tempMeasure);
    return [pageEl.cloneNode(true) as HTMLElement];
  }

  // Measure subsequentTableTop by removing previous elements from pageElClone
  const tableCloneForMeasure = getTargetTable(pageElClone);
  if (tableCloneForMeasure) {
    let curr: HTMLElement | null = tableCloneForMeasure;
    while (curr && curr !== pageElClone) {
      let prev = curr.previousElementSibling;
      while (prev) {
        const toRemove = prev;
        prev = prev.previousElementSibling;
        toRemove.remove();
      }
      curr = curr.parentElement;
    }
  }

  const subsequentTableRect = tableElInClone ? tableElInClone.getBoundingClientRect() : { top: 0 };
  const subsequentTableTop = subsequentTableRect.top - pageElClone.getBoundingClientRect().top;

  const pageRowGroups: HTMLTableRowElement[][] = [[]];
  let currentPageHeight = tableTop + theadHeight;
  let currentPageIndex = 0;

  const cloneTbody = pageElClone.querySelector("tbody");
  const cloneRows = cloneTbody ? Array.from(cloneTbody.querySelectorAll("tr")) as HTMLTableRowElement[] : [];

  const bottomPaddingPx = (isLandscape ? 15 : 20) * 96 / 25.4;
  const limit = pageHeightPx - bottomPaddingPx - 30; // dynamic limits: ~1016px (portrait), ~707px (landscape)

  cloneRows.forEach((row, idx) => {
    const rowHeight = row.offsetHeight || 25;

    // Avoid orphan section headers at the bottom of the page
    let shouldPush = false;
    const isHeader = row.classList.contains("pdf-section-header-tr") || row.cells.length < 3 || Array.from(row.cells).some(c => c.colSpan > 1);

    if (isHeader && idx < cloneRows.length - 1) {
      const nextRow = cloneRows[idx + 1];
      const nextRowHeight = nextRow.offsetHeight || 25;
      const combinedHeight = rowHeight + nextRowHeight;

      if (currentPageHeight + combinedHeight > limit && (subsequentTableTop + theadHeight + combinedHeight <= limit)) {
        shouldPush = true;
      }
    } else if (currentPageHeight + rowHeight > limit) {
      shouldPush = true;
    }

    if (shouldPush && pageRowGroups[currentPageIndex].length > 0) {
      currentPageIndex++;
      pageRowGroups.push([]);
      // On subsequent pages, the titles/descriptions/subtitles are removed,
      // so the table starts at subsequentTableTop.
      currentPageHeight = subsequentTableTop + theadHeight + rowHeight;
    } else {
      currentPageHeight += rowHeight;
    }
    pageRowGroups[currentPageIndex].push(rows[idx]);
  });

  document.body.removeChild(tempMeasure);

  const resultPages: HTMLElement[] = [];

  pageRowGroups.forEach((groupRows, pageIdx) => {
    const newPage = pageEl.cloneNode(true) as HTMLElement;
    const newTable = getTargetTable(newPage);
    
    if (!newTable) {
      resultPages.push(newPage);
      return;
    }

    // On subsequent pages, remove all previous elements before the table to save space
    if (pageIdx > 0) {
      let curr: HTMLElement | null = newTable;
      while (curr && curr !== newPage) {
        let prev = curr.previousElementSibling;
        while (prev) {
          const toRemove = prev;
          prev = prev.previousElementSibling;
          toRemove.remove();
        }
        curr = curr.parentElement;
      }
    }

    // On all pages except the last one, remove any signature block or elements after the table
    if (pageIdx < pageRowGroups.length - 1) {
      let curr: HTMLElement | null = newTable;
      while (curr && curr !== newPage) {
        let next = curr.nextElementSibling;
        while (next) {
          const toRemove = next;
          next = next.nextElementSibling;
          toRemove.remove();
        }
        curr = curr.parentElement;
      }
    }

    const newTbody = newTable.querySelector("tbody");
    if (newTbody) {
      newTbody.innerHTML = "";
      groupRows.forEach((row) => {
        newTbody.appendChild(row.cloneNode(true));
      });
    }

    resultPages.push(newPage);
  });

  return resultPages;
}

/**
 * Injects self-contained CSS styles into the cloned DOM container.
 * This guarantees identical margins, widths, fonts, and custom branding rules
 * (e.g. headers, zebra stripe tables) regardless of screen style state.
 */
function injectPDFStyles(clonedPage: HTMLElement, orientation: "portrait" | "landscape", keepOriginalStyles: boolean = false) {
  const isLandscape = orientation === "landscape";
  const pagePadding = isLandscape ? "15mm 15mm 15mm 15mm" : "20mm 20mm 20mm 25mm";
  const pageWidth = isLandscape ? "297mm" : "210mm";
  const pageHeight = isLandscape ? "210mm" : "297mm";

  const style = document.createElement("style");
  style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap');
    
    #pdf-temp-container * {
      box-sizing: border-box !important;
    }
    
    #pdf-temp-container *:not(.bi):not([class^="bi-"]):not([class*=" bi-"]) {
      font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif !important;
    }
    
    #pdf-temp-container .pdf-cover-page {
      width: ${pageWidth} !important;
      height: ${pageHeight} !important;
      padding: 0 !important;
      margin: 0 !important;
      background: #ffffff !important;
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    
    #pdf-temp-container .pdf-content-page {
      width: ${pageWidth} !important;
      min-height: ${pageHeight} !important;
      padding: ${pagePadding};
      background: #ffffff !important;
      position: relative !important;
      display: block !important;
      box-sizing: border-box !important;
    }
    
    ${keepOriginalStyles ? '' : `
    /* Force all text in the report document body to be printed in solid black */
    #pdf-temp-container .pdf-content-page * {
      color: #000000 !important;
    }
    `}

    /* Tighten spacings and margins to eliminate massive empty gaps */
    #pdf-temp-container .pdf-content-page h5 {
      margin-top: 0 !important;
      margin-bottom: 4px !important;
    }
    #pdf-temp-container .pdf-content-page h6 {
      margin-top: 0 !important;
      margin-bottom: 4px !important;
    }
    #pdf-temp-container .pdf-content-page p {
      margin-top: 0 !important;
      margin-bottom: 8px !important;
    }
    #pdf-temp-container .pdf-content-page div[style*="marginTop"],
    #pdf-temp-container .pdf-content-page div[style*="margin-top"] {
      margin-top: 6px !important;
    }
    #pdf-temp-container .pdf-content-page table {
      margin-top: 4px !important;
      margin-bottom: 12px !important;
    }
    
    #pdf-temp-container table {
      border-collapse: collapse !important;
      width: 100% !important;
    }
    
    #pdf-temp-container th {
      background-color: #003087 !important;
      color: #fff !important;
    }
    
    #pdf-temp-container .pdf-brand-bg {
      background-color: #003087 !important;
      color: #fff !important;
    }
    
    #pdf-temp-container .pdf-brand-light-bg {
      background-color: rgba(0, 48, 135, 0.05) !important;
      color: #003087 !important;
    }
    
    #pdf-temp-container .zebra-stripe {
      background-color: #f8fafc !important;
    }
    
    #pdf-temp-container .html2pdf__page-break {
      display: none !important;
    }
  `;
  clonedPage.appendChild(style);
}

/**
 * Reusable helper to export any HTML element to a high-quality PDF.
 * Uses html2pdf.js to handle page breaks and clean PDF margins.
 */
export async function exportElementToPDF(
  elementId: string,
  filename: string,
  options: ExportPDFOptions = {}
) {
  const {
    orientation = "portrait",
    scale = 2,
    marginTop = 15,
    marginBottom = 15,
    marginLeft = 0,
    marginRight = 0,
    paginate = true,
    keepOriginalStyles = false,
  } = options;

  const docEl = document.getElementById(elementId);
  if (!docEl) {
    throw new Error(`Element with id "${elementId}" not found.`);
  }

  // ── High-Fidelity Page-by-Page Canvas Capture ───────────────────────────────
  let pageElements = Array.from(docEl.querySelectorAll(".pdf-cover-page, .pdf-content-page")) as HTMLElement[];
  if (pageElements.length === 0 && (docEl.classList.contains("pdf-cover-page") || docEl.classList.contains("pdf-content-page"))) {
    pageElements = [docEl];
  }
  
  if (pageElements.length > 0) {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const isLandscape = orientation === "landscape";
    const pageWidthMm = isLandscape ? 297 : 210;
    const pageHeightMm = isLandscape ? 210 : 297;

    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4"
    });

    const paginatedPages: HTMLElement[] = [];
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;
      if (paginate) {
        const splitPages = await paginateSinglePageContent(pageEl, orientation);
        paginatedPages.push(...splitPages);
      } else {
        paginatedPages.push(pageEl.cloneNode(true) as HTMLElement);
      }
    }

    for (let i = 0; i < paginatedPages.length; i++) {
      const clonedPage = paginatedPages[i];

      if (!keepOriginalStyles) stripTableBackgrounds(clonedPage);

      clonedPage.style.boxShadow = "none";
      clonedPage.style.margin = "0";
      clonedPage.style.position = "relative";
      clonedPage.style.width = isLandscape ? "297mm" : "210mm";
      clonedPage.style.height = isLandscape ? "210mm" : "297mm";
      clonedPage.style.boxSizing = "border-box";
      clonedPage.style.background = "#ffffff";
      clonedPage.style.display = clonedPage.classList.contains("pdf-cover-page") ? "flex" : "block";
      if (clonedPage.classList.contains("pdf-cover-page")) {
        clonedPage.style.flexDirection = "column";
        clonedPage.style.justifyContent = "space-between";
      }

      if (clonedPage.classList.contains("pdf-cover-page")) {
        clonedPage.style.padding = "0";
      } else {
        clonedPage.style.paddingTop = clonedPage.style.paddingTop || "20mm";
        clonedPage.style.paddingRight = clonedPage.style.paddingRight || "20mm";
        clonedPage.style.paddingBottom = clonedPage.style.paddingBottom || "20mm";
        clonedPage.style.paddingLeft = clonedPage.style.paddingLeft || "25mm";
      }

      injectPDFStyles(clonedPage, orientation, keepOriginalStyles);

      const tempContainer = document.createElement("div");
      tempContainer.id = "pdf-temp-container";
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.width = isLandscape ? "297mm" : "210mm";
      tempContainer.style.height = isLandscape ? "210mm" : "297mm";
      tempContainer.style.overflow = "hidden";
      tempContainer.appendChild(clonedPage);
      document.body.appendChild(tempContainer);

      if (document.fonts) {
        await document.fonts.ready;
      }

      await waitForImages(tempContainer);

      const canvas = await html2canvas(clonedPage, {
        scale: scale,
        useCORS: true,
        logging: false,
        // width and height omitted to preserve aspect ratio
      });

      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      if (i > 0) {
        pdf.addPage("a4", orientation);
      }

      const imgWidth = pageWidthMm;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
    return;
  }

  // ── Legacy Single-Page Fallback (html2pdf.js) ───────────────────────────────
  // @ts-ignore
  const html2pdf = (await import("html2pdf.js")).default;
  const clonedPage = docEl.cloneNode(true) as HTMLElement;
  clonedPage.style.boxShadow = "none";
  clonedPage.style.margin = "0";

  if (clonedPage.classList.contains("pdf-content-page") && marginTop === 15) {
    clonedPage.style.setProperty("padding-top", "5mm", "important");
  }

  if (!keepOriginalStyles) stripTableBackgrounds(clonedPage);
  injectPDFStyles(clonedPage, orientation, keepOriginalStyles);

  const tempContainer = document.createElement("div");
  tempContainer.id = "pdf-temp-container";
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "-9999px";
  tempContainer.style.top = "-9999px";
  tempContainer.style.width = docEl.offsetWidth + "px";
  tempContainer.appendChild(clonedPage);
  document.body.appendChild(tempContainer);

  if (document.fonts) {
    await document.fonts.ready;
  }

  await waitForImages(tempContainer);

  if (paginate) {
    paginateClonedPage(clonedPage, orientation, marginTop, marginBottom, docEl);
  }

  const opt = {
    margin: [marginTop, marginLeft, marginBottom, marginRight] as [number, number, number, number],
    filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: scale, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: orientation },
    pagebreak: { 
      mode: paginate ? ["legacy"] : ["css", "legacy"], 
      avoid: "tr, h5, h6" 
    }
  };

  try {
    await html2pdf().set(opt).from(clonedPage).save();
  } finally {
    document.body.removeChild(tempContainer);
  }
}

/**
 * Generates a PDF Blob for any HTML element off-screen without saving it directly.
 * Useful for uploading as attachments or sending via APIs.
 */
export async function generatePDFBlob(
  elementId: string,
  options: ExportPDFOptions = {}
): Promise<Blob> {
  const {
    orientation = "portrait",
    scale = 2,
    marginTop = 15,
    marginBottom = 15,
    marginLeft = 0,
    marginRight = 0,
    paginate = true,
    keepOriginalStyles = false,
  } = options;

  const docEl = document.getElementById(elementId);
  if (!docEl) {
    throw new Error(`Element with id "${elementId}" not found.`);
  }

  // ── High-Fidelity Page-by-Page Canvas Capture ───────────────────────────────
  let pageElements = Array.from(docEl.querySelectorAll(".pdf-cover-page, .pdf-content-page")) as HTMLElement[];
  if (pageElements.length === 0 && (docEl.classList.contains("pdf-cover-page") || docEl.classList.contains("pdf-content-page"))) {
    pageElements = [docEl];
  }
  
  if (pageElements.length > 0) {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const isLandscape = orientation === "landscape";
    const pageWidthMm = isLandscape ? 297 : 210;
    const pageHeightMm = isLandscape ? 210 : 297;

    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4"
    });

    const paginatedPages: HTMLElement[] = [];
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;
      if (paginate) {
        const splitPages = await paginateSinglePageContent(pageEl, orientation);
        paginatedPages.push(...splitPages);
      } else {
        paginatedPages.push(pageEl.cloneNode(true) as HTMLElement);
      }
    }

    for (let i = 0; i < paginatedPages.length; i++) {
      const clonedPage = paginatedPages[i];

      if (!keepOriginalStyles) stripTableBackgrounds(clonedPage);

      clonedPage.style.boxShadow = "none";
      clonedPage.style.margin = "0";
      clonedPage.style.position = "relative";
      clonedPage.style.width = isLandscape ? "297mm" : "210mm";
      clonedPage.style.height = isLandscape ? "210mm" : "297mm";
      clonedPage.style.boxSizing = "border-box";
      clonedPage.style.background = "#ffffff";
      clonedPage.style.display = clonedPage.classList.contains("pdf-cover-page") ? "flex" : "block";
      if (clonedPage.classList.contains("pdf-cover-page")) {
        clonedPage.style.flexDirection = "column";
        clonedPage.style.justifyContent = "space-between";
      }

      if (clonedPage.classList.contains("pdf-cover-page")) {
        clonedPage.style.padding = "0";
      } else {
        clonedPage.style.paddingTop = clonedPage.style.paddingTop || "20mm";
        clonedPage.style.paddingRight = clonedPage.style.paddingRight || "20mm";
        clonedPage.style.paddingBottom = clonedPage.style.paddingBottom || "20mm";
        clonedPage.style.paddingLeft = clonedPage.style.paddingLeft || "25mm";
      }

      injectPDFStyles(clonedPage, orientation, keepOriginalStyles);

      const tempContainer = document.createElement("div");
      tempContainer.id = "pdf-temp-container";
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.width = isLandscape ? "297mm" : "210mm";
      tempContainer.style.height = isLandscape ? "210mm" : "297mm";
      tempContainer.style.overflow = "hidden";
      tempContainer.appendChild(clonedPage);
      document.body.appendChild(tempContainer);

      if (document.fonts) {
        await document.fonts.ready;
      }

      await waitForImages(tempContainer);

      const canvas = await html2canvas(clonedPage, {
        scale: scale,
        useCORS: true,
        logging: false,
        // width and height omitted to preserve aspect ratio
      });

      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      if (i > 0) {
        pdf.addPage("a4", orientation);
      }

      const imgWidth = pageWidthMm;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    }

    return pdf.output("blob");
  }

  // ── Legacy Single-Page Fallback (html2pdf.js) ───────────────────────────────
  // @ts-ignore
  const html2pdf = (await import("html2pdf.js")).default;
  const clonedPage = docEl.cloneNode(true) as HTMLElement;
  clonedPage.style.boxShadow = "none";
  clonedPage.style.margin = "0";

  if (clonedPage.classList.contains("pdf-content-page") && marginTop === 15) {
    clonedPage.style.setProperty("padding-top", "5mm", "important");
  }

  if (!keepOriginalStyles) stripTableBackgrounds(clonedPage);
  injectPDFStyles(clonedPage, orientation, keepOriginalStyles);

  const tempContainer = document.createElement("div");
  tempContainer.id = "pdf-temp-container";
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "-9999px";
  tempContainer.style.top = "-9999px";
  tempContainer.style.width = docEl.offsetWidth + "px";
  tempContainer.appendChild(clonedPage);
  document.body.appendChild(tempContainer);

  if (document.fonts) {
    await document.fonts.ready;
  }

  await waitForImages(tempContainer);

  if (paginate) {
    paginateClonedPage(clonedPage, orientation, marginTop, marginBottom, docEl);
  }

  const opt = {
    margin: [marginTop, marginLeft, marginBottom, marginRight] as [number, number, number, number],
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: scale, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: orientation },
    pagebreak: { 
      mode: paginate ? ["legacy"] : ["css", "legacy"], 
      avoid: "tr, h5, h6" 
    }
  };

  try {
    return await html2pdf().set(opt).from(clonedPage).outputPdf("blob");
  } finally {
    document.body.removeChild(tempContainer);
  }
}
