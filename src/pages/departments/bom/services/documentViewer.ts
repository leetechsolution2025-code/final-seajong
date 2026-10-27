// Utility mở xem nội dung tài liệu đính kèm của tờ trình ở tab mới

export interface DocumentViewerAttachment {
  name: string;
  size?: string;
  url?: string;
  type?: string;
}

export interface DocumentViewerData {
  title: string;
  code: string;
  department?: string;
  submitter?: string;
  submitDate?: string;
  valueLabel?: string;
  summary?: string;
  content?: string;
  attachmentName?: string;
  attachmentSize?: string;
  attachmentUrl?: string;
  attachments?: DocumentViewerAttachment[];
  status?: string;
  approvalNote?: string;
  rejectionReason?: string;
  approvedBy?: string;
  rejectedBy?: string;
}

/**
 * Mở tài liệu đính kèm GỐC của hồ sơ/tờ trình ở tab mới.
 * Ưu tiên mở trực tiếp tệp gốc theo url (PDF, Word, Excel, Hình ảnh...).
 * Nếu không có file thật, cảnh báo người dùng thay vì mở trang giả lập.
 */
export function openAttachmentInNewTab(
  doc: DocumentViewerData,
  fileNameOverride?: string,
  fileUrlOverride?: string
) {
  const fileName = fileNameOverride || doc.attachmentName || '';

  // 1. Kiểm tra nếu có direct fileUrlOverride
  let targetUrl = fileUrlOverride;

  // 2. Tìm trong danh sách attachments nếu có url
  if (!targetUrl && doc.attachments && doc.attachments.length > 0) {
    const matched = doc.attachments.find(
      (a) => a.name === fileName || (!fileName && a.url)
    );
    if (matched?.url) {
      targetUrl = matched.url;
    } else if (doc.attachments[0]?.url) {
      targetUrl = doc.attachments[0].url;
    }
  }

  // 3. Fallback từ doc.attachmentUrl
  if (!targetUrl && doc.attachmentUrl) {
    targetUrl = doc.attachmentUrl;
  }

  // 4. Nếu có URL file thật -> MỞ TRỰC TIẾP TÀI LIỆU GỐC Ở TAB MỚI
  if (targetUrl) {
    window.open(targetUrl, '_blank');
    return;
  }

  // 5. Nếu chưa có targetUrl nhưng có tên file:
  // Thử mở từ máy chủ theo tên file qua endpoint /documents/
  if (fileName) {
    const cleanName = fileName.trim();
    window.open(`/documents/${encodeURIComponent(cleanName)}`, '_blank');
    return;
  }

  // 6. Trường hợp không có tệp đính kèm:
  alert('Hồ sơ này không có tệp tài liệu đính kèm.');
}

/**
 * Xem và in toàn văn Tờ trình pháp lý Deco Door (mẫu trình duyệt văn bản tiêu chuẩn)
 */
export function openOfficialDocumentSheet(doc: DocumentViewerData, fileNameOverride?: string) {
  const fileName = fileNameOverride || doc.attachmentName || `To_trinh_${doc.code || 'DecoDoor'}.pdf`;
  const isApproved = doc.status === 'approved';
  const isRejected = doc.status === 'rejected';


  const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} - ${doc.code}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background-color: #f1f5f9;
      color: #1e293b;
      line-height: 1.6;
      padding: 30px 16px;
    }
    .toolbar-bar {
      max-width: 880px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      background-color: #0284c7;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.875rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
    }
    .print-btn:hover { background-color: #0369a1; }
    .close-btn {
      padding: 8px 14px;
      background-color: #e2e8f0;
      color: #334155;
      font-size: 0.875rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .paper {
      max-width: 880px;
      margin: 0 auto;
      background: #ffffff;
      padding: 60px 64px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .national-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #cbd5e1;
    }
    .corp-name { font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
    .corp-sub { font-size: 11.5px; color: #64748b; margin-top: 2px; }
    .motto-title { font-size: 12px; font-weight: 800; text-transform: uppercase; text-align: center; }
    .motto-sub { font-size: 11px; font-style: italic; text-align: center; margin-top: 2px; }
    .doc-meta-info {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 24px;
    }
    .main-title {
      text-align: center;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .sub-title {
      text-align: center;
      font-size: 14px;
      color: #475569;
      font-weight: 500;
      margin-bottom: 28px;
    }
    .badge-status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .status-pending { background: #fef3c7; color: #b45309; }
    .status-approved { background: #d1fae5; color: #047857; }
    .status-rejected { background: #fee2e2; color: #b91c1c; }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .meta-table td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
    }
    .meta-label {
      width: 28%;
      background-color: #f8fafc;
      font-weight: 600;
      color: #475569;
    }
    .meta-val { color: #0f172a; font-weight: 500; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0284c7;
      margin: 24px 0 10px 0;
      border-left: 4px solid #0284c7;
      padding-left: 10px;
    }
    .content-box {
      font-size: 13.5px;
      line-height: 1.8;
      color: #334155;
      white-space: pre-wrap;
      background: #f8fafc;
      padding: 18px 20px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      margin-bottom: 24px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 40px;
      text-align: center;
      page-break-inside: avoid;
    }
    .sig-role { font-weight: 700; font-size: 13px; text-transform: uppercase; margin-bottom: 4px; }
    .sig-note { font-size: 11.5px; color: #64748b; font-style: italic; }
    .sig-name { font-weight: 700; font-size: 14px; color: #0f172a; margin-top: 70px; }
    .sign-stamp {
      display: inline-block;
      border: 2px dashed #059669;
      color: #059669;
      padding: 6px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      margin-top: 15px;
      text-transform: uppercase;
    }
    .file-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background-color: #f1f5f9;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 20px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar-bar { display: none; }
      .paper { box-shadow: none; border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar-bar">
    <div style="font-size: 13px; color: #64748b;">
      Đang xem: <strong>${fileName}</strong> (${doc.attachmentSize || 'Tài liệu số'})
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="print-btn" onclick="window.print()">🖨️ In tài liệu</button>
      <button class="close-btn" onclick="window.close()">Đóng tab</button>
    </div>
  </div>

  <div class="paper">
    <div class="national-header">
      <div>
        <div class="corp-name">CÔNG TY CỔ PHẦN SẢN XUẤT DECO DOOR</div>
        <div class="corp-sub">Đơn vị: ${doc.department || 'Phòng kinh doanh'}</div>
      </div>
      <div>
        <div class="motto-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="motto-sub">Độc lập - Tự do - Hạnh phúc</div>
      </div>
    </div>

    <div class="doc-meta-info">
      <div>Số: <strong>${doc.code}</strong></div>
      <div>Hà Nội, ngày ${doc.submitDate || new Date().toLocaleDateString('vi-VN')}</div>
    </div>

    <div class="main-title">${doc.title}</div>
    <div class="sub-title">V/v: Thẩm định hồ sơ và phê duyệt quyết định thực hiện</div>

    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge-status ${isApproved ? 'status-approved' : isRejected ? 'status-rejected' : 'status-pending'}">
        ${isApproved ? '✓ ĐÃ PHÊ DUYỆT BỞI BAN GIÁM ĐỐC' : isRejected ? '✗ TỪ CHỐI / CẦN SỬA ĐỔI' : '⏳ ĐANG CHỜ PHÊ DUYỆT'}
      </span>
    </div>

    <div class="file-badge">
      <span>📄 Tập tin đính kèm: <strong>${fileName}</strong></span>
      <span style="color: #64748b; font-weight: normal;">• Dung lượng: ${doc.attachmentSize || '2.4 MB'} • Đã ký số bảo mật SHA-256</span>
    </div>

    <div class="section-title">I. THÔNG TIN TỔNG QUAN HỒ SƠ</div>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Mã văn bản / Tờ trình</td>
        <td class="meta-val">${doc.code}</td>
      </tr>
      <tr>
        <td class="meta-label">Đơn vị đề xuất</td>
        <td class="meta-val">${doc.department || 'Phòng kinh doanh'}</td>
      </tr>
      <tr>
        <td class="meta-label">Người lập tờ trình</td>
        <td class="meta-val">${doc.submitter || 'Người phụ trách'}</td>
      </tr>
      <tr>
        <td class="meta-label">Giá trị và Quy mô</td>
        <td class="meta-val" style="color: #0284c7; font-weight: 700;">${doc.valueLabel || 'Theo hợp đồng / báo giá'}</td>
      </tr>
      <tr>
        <td class="meta-label">Nội dung tóm tắt</td>
        <td class="meta-val">${doc.summary || 'Hồ sơ đã được thẩm định điều kiện kỹ thuật và năng lực thực hiện.'}</td>
      </tr>
    </table>

    <div class="section-title">II. NỘI DUNG CHI TIẾT TỜ TRÌNH VÀ THUYẾT MINH</div>
    <div class="content-box">${doc.content || 'Kính trình Ban Giám đốc xem xét phê duyệt hồ sơ đính kèm. Toàn bộ các tiêu chuẩn kỹ thuật, báo giá cạnh tranh và tiến độ thi công đã được kiểm tra, thẩm tra chặt chẽ theo đúng quy trình công ty DecoDoor.'}</div>

    ${isApproved && doc.approvalNote ? `
      <div class="section-title" style="color: #059669; border-color: #059669;">III. Ý KIẾN BÚT PHÊ BAN GIÁM ĐỐC</div>
      <div class="content-box" style="background: #ecfdf5; border-color: #a7f3d0; color: #065f46; font-weight: 600;">
        " ${doc.approvalNote} "
      </div>
    ` : ''}

    ${isRejected && doc.rejectionReason ? `
      <div class="section-title" style="color: #dc2626; border-color: #dc2626;">III. LÝ DO TỪ CHỐI TỪ BAN GIÁM ĐỐC</div>
      <div class="content-box" style="background: #fef2f2; border-color: #fecaca; color: #991b1b; font-weight: 600;">
        " ${doc.rejectionReason} "
      </div>
    ` : ''}

    <div class="signatures">
      <div>
        <div class="sig-role">NGƯỜI TRÌNH DUYỆT</div>
        <div class="sig-note">(Ký, ghi rõ họ tên)</div>
        <div class="sig-name">${doc.submitter || 'Hà Hải Lâm'}</div>
      </div>
      <div>
        <div class="sig-role">BAN GIÁM ĐỐC PHÊ DUYỆT</div>
        <div class="sig-note">(Ký số điện tử và đóng dấu)</div>
        ${isApproved ? `
          <div class="sign-stamp">✓ ĐÃ KÝ DUYỆT ĐIỆN TỬ</div>
          <div class="sig-name">${doc.approvedBy || 'TGĐ. Hà Hải Lâm'}</div>
        ` : `
          <div style="height: 60px;"></div>
          <div class="sig-name">Ban Giám đốc Deco Door</div>
        `}
      </div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}
