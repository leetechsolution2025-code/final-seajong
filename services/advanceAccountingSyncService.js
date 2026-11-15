import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncAllSubledgersToJournal } from './journalSyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

function getDbConnection() {
  const db = new sqlite3.Database(dbPath);
  if (typeof db.configure === 'function') {
    db.configure('busyTimeout', 5000);
  }
  return db;
}

function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function formatDateToVN(dateObj = new Date()) {
  if (!dateObj) return '';
  if (typeof dateObj === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(dateObj.trim())) {
    return dateObj.trim().slice(0, 10);
  }
  const d = new Date(dateObj);
  if (Number.isNaN(d.getTime())) return String(dateObj).slice(0, 10);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Tự động đồng bộ Phiếu yêu cầu tạm ứng & hoàn tạm ứng (khi khởi tạo, phê duyệt, từ chối, xóa)
 * vào toàn bộ hệ thống Tài chính Kế toán:
 * 1. Bảng Quản lý đề nghị tạm ứng (Bước 1 - TK 141): advance_payments (ngay từ khi PENDING)
 * 2. Bảng Phê duyệt tài liệu: approval_documents
 * 3. Bảng Quyết toán hoàn tạm ứng (Bước 2 - TK 141 - 111): advance_settlements
 * 4. Bảng Quản lý chi phí: financial_expenses (Định khoản Nợ 141 / Có 1121 hoặc Có 1111)
 * 5. Bảng Chứng từ sổ quỹ: financial_vouchers (Phiếu chi thanh toán)
 * 6. Bảng Chi phí Prisma: Expense (Báo cáo tài chính doanh nghiệp)
 * 7. Bảng Sổ nhật ký chung: accounting_journal_entries & accounting_journal_lines
 */
export async function syncPersonalRequestAdvanceToFinance(requestId, prismaInstance) {
  if (!requestId) return;

  const db = getDbConnection();
  try {
    let reqRecord = null;
    if (prismaInstance?.personalRequest) {
      reqRecord = await prismaInstance.personalRequest.findUnique({
        where: { id: requestId },
        include: { employee: true },
      });
    }

    const legacyAdvId = `ADV-${requestId}`;
    const legacyAdvCode = `TU-${requestId}`;
    const voucherCode = `PC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(requestId).replace(/\D/g, '').slice(-3) || '581'}`;
    const expenseId = `EXP-ADV-${requestId}`;

    // Nếu bản ghi đã bị xóa khỏi PersonalRequest -> dọn dẹp đồng bộ các bảng liên quan
    if (!reqRecord) {
      await runQuery(
        db,
        'DELETE FROM advance_payments WHERE id = ? OR id = ? OR code = ? OR code = ?',
        [requestId, legacyAdvId, requestId, legacyAdvCode]
      ).catch(() => {});
      await runQuery(
        db,
        'DELETE FROM advance_settlements WHERE advance_id = ? OR advance_id = ? OR advance_code = ? OR settlement_code = ?',
        [requestId, legacyAdvId, requestId, requestId]
      ).catch(() => {});
      await runQuery(
        db,
        'DELETE FROM approval_documents WHERE code = ? OR id = ? OR id = ?',
        [requestId, `APR-${requestId}`, `APR-REQ-${requestId}`]
      ).catch(() => {});
      await runQuery(
        db,
        'DELETE FROM financial_expenses WHERE id = ? OR notes LIKE ?',
        [expenseId, `%${requestId}%`]
      ).catch(() => {});
      await runQuery(
        db,
        'DELETE FROM financial_vouchers WHERE reference_code = ? OR voucher_code = ?',
        [requestId, voucherCode]
      ).catch(() => {});

      if (prismaInstance?.expense) {
        await prismaInstance.expense
          .deleteMany({
            where: {
              OR: [{ id: expenseId }, { referenceId: requestId }],
            },
          })
          .catch(() => {});
      }
      await syncAllSubledgersToJournal(db).catch(() => {});
      return;
    }

    let details = {};
    try {
      details = typeof reqRecord.details === 'string' ? JSON.parse(reqRecord.details) : reqRecord.details || {};
    } catch {
      details = {};
    }

    const reqType = String(reqRecord.type || details.type || '').toLowerCase().trim();
    const isAdvance =
      reqType === 'advance' ||
      reqType === 'salary-advance' ||
      reqType === 'salary_advance' ||
      reqType.includes('tạm ứng') ||
      reqType === 'advance_payment';
    const isRefund =
      reqType === 'refund' ||
      reqType === 'advance-refund' ||
      reqType === 'advance_refund' ||
      reqType.includes('hoàn ứng') ||
      reqType.includes('hoàn tạm ứng');

    if (!isAdvance && !isRefund) {
      return;
    }

    const statusUpper = String(reqRecord.status || 'PENDING').toUpperCase();
    const itemCode = details.code || reqRecord.id;
    const employeeName =
      reqRecord.employee?.fullName ||
      reqRecord.employee?.name ||
      details.applicantName ||
      details.employeeName ||
      'Cán bộ nhân viên';
    const employeeCode = reqRecord.employee?.code || details.employeeCode || 'NV-001';
    const department =
      reqRecord.employee?.departmentName ||
      reqRecord.employee?.department ||
      details.department ||
      'Phòng ban';
    const requestedDate = formatDateToVN(details.createdAt || reqRecord.createdAt || new Date());
    const approvedDate = formatDateToVN(details.approvalDate || details.approvedDate || new Date());
    const approver = details.approver || 'Phòng Tài chính – Kế toán';
    const note = details.note || details.advanceRepaymentPlan || details.content || '';

    // Xử lý yêu cầu Hoàn tạm ứng (refund)
    if (isRefund) {
      const refCode = details.advanceRefCode || details.advanceCode || itemCode;
      const initialAdvance = Number(details.initialAdvanceAmount || details.advanceAmount || details.amount || 0);
      const actualSpent = Number(details.actualSpentAmount || details.actualSpent || initialAdvance || 0);
      const deadlineRefund = details.advanceDueDate || details.deadlineRefund || requestedDate;
      const purpose = details.advancePurpose || details.purpose || details.title || reqRecord.reason || 'Hoàn tạm ứng chi phí';
      const settlementStatus =
        statusUpper === 'APPROVED' || statusUpper === 'COMPLETED'
          ? 'settled'
          : statusUpper === 'REJECTED'
          ? 'unsettled'
          : 'processing';

      const invoices = details.invoiceList
        ? [
            {
              id: `INV-${reqRecord.id}`,
              invoiceNumber: `HD-${reqRecord.id.slice(-4)}`,
              invoiceDate: requestedDate,
              supplier: 'Chứng từ hoàn ứng nhân viên',
              description: String(details.invoiceList),
              amount: actualSpent,
            },
          ]
        : [];

      const existingSet = await getQuery(
        db,
        'SELECT id FROM advance_settlements WHERE advance_code = ? OR settlement_code = ? OR id = ?',
        [refCode, itemCode, `SET-${reqRecord.id}`]
      ).catch(() => null);

      if (existingSet) {
        await runQuery(
          db,
          `UPDATE advance_settlements
           SET settlement_code = ?, settlement_date = ?, actual_spent = ?, status = ?, invoices = ?, note = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [itemCode, requestedDate, actualSpent, settlementStatus, JSON.stringify(invoices), note, existingSet.id]
        ).catch(() => {});
      } else {
        await runQuery(
          db,
          `INSERT INTO advance_settlements (
            id, advance_id, advance_code, settlement_code, employee_name, employee_code,
            department, purpose, project, advance_amount, approved_date, approver,
            deadline_refund, settlement_date, actual_spent, status, invoices, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `SET-${reqRecord.id}`,
            reqRecord.id,
            refCode,
            itemCode,
            employeeName,
            employeeCode,
            department,
            purpose,
            details.project || 'Nội bộ công ty',
            initialAdvance,
            requestedDate,
            approver,
            deadlineRefund,
            requestedDate,
            actualSpent,
            settlementStatus,
            JSON.stringify(invoices),
            note,
          ]
        ).catch(() => {});
      }
      return;
    }

    // Xử lý yêu cầu Tạm ứng (advance / salary-advance)
    const amount = Number(details.advanceAmount || details.amount || 0);
    if (amount <= 0) return;

    const purpose = String(
      details.advancePurpose ||
        details.purpose ||
        details.reason ||
        details.title ||
        reqRecord.reason ||
        'Tạm ứng công tác phí'
    )
      .replace(/^'+|'+$/g, '')
      .trim();
    const isCash = details.paymentMethod === 'cash' || details.method === 'cash';
    const paymentMethod = isCash ? 'cash' : 'bank_transfer';
    const bankName = details.bankName || details.bankInfo?.bankName || 'Techcombank';
    const bankAccount = details.bankAccount || details.bankInfo?.accountNumber || '';
    const bankAccountName = details.bankAccountName || details.bankInfo?.accountName || employeeName;
    const parseDmyToMs = (dStr) => {
      const m = String(dStr || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return 0;
      return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
    };
    const addFiveDaysVN = (dStr) => {
      const ms = parseDmyToMs(dStr);
      const d = ms ? new Date(ms) : new Date();
      d.setDate(d.getDate() + 5);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    let deadlineRefund =
      details.advanceDueDate ||
      details.deadlineRefund ||
      details.advanceRepaymentDate ||
      '';
    if (!deadlineRefund) {
      const dateMatch = String(reqRecord.reason || details.content || '').match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        deadlineRefund = dateMatch[1];
      } else if (details.salaryMonth && /^\d{1,2}\/\d{4}$/.test(String(details.salaryMonth))) {
        const [mStr, yStr] = String(details.salaryMonth).split('/');
        const lastDay = new Date(Number(yStr), Number(mStr), 0).getDate();
        deadlineRefund = `${String(lastDay).padStart(2, '0')}/${String(mStr).padStart(2, '0')}/${yStr}`;
      } else {
        deadlineRefund = addFiveDaysVN(requestedDate);
      }
    }
    const reqMs = parseDmyToMs(requestedDate);
    const deadMs = parseDmyToMs(deadlineRefund);
    if (reqMs > 0 && (!deadMs || deadMs < reqMs)) {
      deadlineRefund = addFiveDaysVN(requestedDate);
    }
    const projectLabel =
      reqType === 'salary-advance' || details.deductFromSalary || details.salaryMonth
        ? 'Trừ tạm ứng vào lương'
        : '';

    // Dọn bản ghi trùng mã cũ (ADV- / TU-) nếu có để thống nhất dùng reqRecord.id và itemCode
    await runQuery(
      db,
      'DELETE FROM advance_payments WHERE id = ? OR id = ? OR code = ? OR code = ?',
      [reqRecord.id, legacyAdvId, itemCode, legacyAdvCode]
    ).catch(() => {});

    const mappedStatus =
      statusUpper === 'APPROVED' || statusUpper === 'COMPLETED'
        ? 'approved'
        : statusUpper === 'REJECTED' || statusUpper === 'CANCELLED'
        ? 'rejected'
        : 'pending';

    const mappedReviewStatus =
      mappedStatus === 'approved'
        ? 'approved'
        : mappedStatus === 'rejected'
        ? 'rejected'
        : details.reviewStatus || 'unprocessed';

    // 1. Luôn đồng bộ ngay lập tức vào bảng advance_payments (kể cả khi vừa khởi tạo ở trạng thái PENDING)
    await runQuery(
      db,
      `INSERT INTO advance_payments (
        id, code, employee_name, employee_code, department, purpose, project,
        amount, requested_date, payment_method, bank_name, bank_account, bank_account_name,
        status, review_status, approver, approved_date, reject_reason, rejected_date,
        deadline_refund, note, attached_docs_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        reqRecord.id,
        itemCode,
        employeeName,
        employeeCode,
        department,
        purpose,
        projectLabel,
        amount,
        requestedDate,
        paymentMethod,
        isCash ? null : bankName,
        isCash ? null : bankAccount,
        isCash ? null : bankAccountName,
        mappedStatus,
        mappedReviewStatus,
        approver,
        mappedStatus === 'approved' ? approvedDate : null,
        mappedStatus === 'rejected' ? details.rejectionReason || details.rejectReason || reqRecord.hrNote || null : null,
        mappedStatus === 'rejected' ? approvedDate : null,
        deadlineRefund,
        note,
      ]
    );

    // 2. Đồng bộ sang bảng approval_documents
    const advDocId = `APR-${reqRecord.id}`;
    const advSummary = `Mục đích: ${purpose} • Phòng ban: ${department} • Hạn hoàn ứng: ${deadlineRefund || 'Chưa xác định'}`;
    const advContent = `Kính gửi Ban Giám đốc & Phòng Tài chính - Kế toán,\n\nTôi là ${employeeName} thuộc bộ phận ${department}.\nTôi làm đơn đề xuất phê duyệt tạm ứng số tiền: ${amount.toLocaleString('vi-VN')} đ.\n- Mục đích: ${purpose}\n- Hạn hoàn ứng dự kiến: ${deadlineRefund || 'Chưa xác định'}\n- Phương thức nhận tiền: ${isCash ? 'Tiền mặt tại quỹ' : `Chuyển khoản (${bankName} - STK: ${bankAccount})`}\n\nKính mong Quý Bộ phận xem xét và phê duyệt.`;

    await runQuery(
      db,
      `INSERT OR REPLACE INTO approval_documents (
        id, code, title, doc_type, doc_type_name, department,
        submitter, submitter_code, submitter_role, submit_date,
        value, value_label, summary, content, priority, status, is_read,
        approved_by, approval_date, rejection_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'advance', 'Yêu cầu tạm ứng', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'high', ?, 0, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        advDocId,
        itemCode,
        `Đề nghị tạm ứng ${amount.toLocaleString('vi-VN')} đ - ${employeeName}`,
        department,
        employeeName,
        employeeCode,
        details.applicantRole || 'Nhân viên',
        requestedDate,
        amount,
        `${amount.toLocaleString('vi-VN')} đ`,
        advSummary,
        advContent,
        mappedStatus,
        mappedStatus === 'approved' ? approver : null,
        mappedStatus === 'approved' ? approvedDate : null,
        mappedStatus === 'rejected' ? details.rejectionReason || details.rejectReason || null : null,
      ]
    ).catch(() => {});

    // 3. Đồng bộ sang Quyết toán hoàn ứng (advance_settlements) cho cả trạng thái pending và approved
    if (mappedStatus === 'pending' || mappedStatus === 'approved') {
      const existingSettlement = await getQuery(
        db,
        'SELECT id, status, actual_spent, invoices FROM advance_settlements WHERE advance_id = ? OR advance_code = ?',
        [reqRecord.id, itemCode]
      ).catch(() => null);

      if (!existingSettlement) {
        await runQuery(
          db,
          `INSERT INTO advance_settlements (
            id, advance_id, advance_code, employee_name, employee_code,
            department, purpose, project, advance_amount, approved_date,
            approver, deadline_refund, status, actual_spent, invoices, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unsettled', 0, '[]', ?)`,
          [
            `SET-${reqRecord.id}`,
            reqRecord.id,
            itemCode,
            employeeName,
            employeeCode,
            department,
            purpose,
            details.project || 'Nội bộ công ty',
            amount,
            mappedStatus === 'approved' ? approvedDate : requestedDate,
            approver,
            deadlineRefund,
            note,
          ]
        ).catch(() => {});
      } else {
        await runQuery(
          db,
          `UPDATE advance_settlements
           SET employee_name = ?, employee_code = ?, department = ?, purpose = ?, project = ?,
               advance_amount = ?, approved_date = ?, approver = ?, deadline_refund = ?, note = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            employeeName,
            employeeCode,
            department,
            purpose,
            details.project || 'Nội bộ công ty',
            amount,
            mappedStatus === 'approved' ? approvedDate : requestedDate,
            approver,
            deadlineRefund,
            note,
            existingSettlement.id,
          ]
        ).catch(() => {});
      }
    }

    // 4. Nếu đã được PHÊ DUYỆT -> đồng bộ sang Chi phí, Phiếu chi & Sổ nhật ký chung
    if (mappedStatus === 'approved') {

      const expenseTitle = `Tạm ứng: ${purpose} - ${employeeName}`;
      const expenseCategory = 'administrative';
      const expenseCategoryLabel = 'Tạm ứng lương & phúc lợi';
      const debitAccount = '141';
      const debitAccountName = 'Tạm ứng cho nhân viên';
      const creditAccount = isCash ? '1111' : '1121';
      const creditAccountName = isCash ? 'Tiền Việt Nam (Tiền mặt quỹ)' : 'Tiền gửi Ngân hàng';

      await runQuery(db, 'DELETE FROM financial_expenses WHERE id = ? OR code = ?', [expenseId, voucherCode]).catch(() => {});
      await runQuery(
        db,
        `INSERT INTO financial_expenses (
          id, code, title, category, category_label, amount, department,
          spend_date, spender, status, status_label, notes,
          debit_account, debit_account_name, credit_account, credit_account_name,
          operation_type, proposer, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'Đã chi tiền', ?, ?, ?, ?, ?, 'advance', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          expenseId,
          voucherCode,
          expenseTitle,
          expenseCategory,
          expenseCategoryLabel,
          amount,
          department,
          approvedDate,
          employeeName,
          `Phiếu yêu cầu tạm ứng ${itemCode}. ${deadlineRefund ? 'Hạn hoàn ứng: ' + deadlineRefund : ''}`,
          debitAccount,
          debitAccountName,
          creditAccount,
          creditAccountName,
          employeeName,
        ]
      );

      const voucherId = `VOUCH-${voucherCode}`;
      await runQuery(
        db,
        'DELETE FROM financial_vouchers WHERE id = ? OR voucher_code = ? OR reference_code = ?',
        [voucherId, voucherCode, reqRecord.id]
      ).catch(() => {});
      await runQuery(
        db,
        `INSERT INTO financial_vouchers (
          id, voucher_code, voucher_type, date, partner_type, partner_name, partner_code,
          payer_receiver_name, amount, reason, payment_method, debit_account, credit_account,
          reference_code, status, notes, creator, accountant, cashier, director, has_stamp,
          created_at, updated_at
        ) VALUES (?, ?, 'payment', ?, 'employee', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, 'Kế toán viên', 'Kế toán trưởng', 'Thủ quỹ', 'Giám đốc', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          voucherId,
          voucherCode,
          approvedDate,
          employeeName,
          employeeCode,
          employeeName,
          amount,
          `Chi tạm ứng cho cán bộ nhân viên: ${purpose}`,
          isCash ? 'cash' : 'transfer',
          debitAccount,
          creditAccount,
          reqRecord.id,
          `Chi tạm ứng theo đề xuất ${itemCode}`,
        ]
      );

      if (prismaInstance?.expense) {
        await prismaInstance.expense
          .upsert({
            where: { id: expenseId },
            create: {
              id: expenseId,
              tenChiPhi: expenseTitle,
              loai: 'Tạm ứng',
              soTien: amount,
              ngayChiTra: new Date(),
              nguoiChiTra: employeeName,
              trangThai: 'approved',
              ghiChu: `Chi tạm ứng theo phiếu yêu cầu ${itemCode}`,
              referenceType: 'personal_request',
              referenceId: reqRecord.id,
            },
            update: {
              tenChiPhi: expenseTitle,
              soTien: amount,
              ngayChiTra: new Date(),
              nguoiChiTra: employeeName,
              trangThai: 'approved',
              ghiChu: `Chi tạm ứng theo phiếu yêu cầu ${itemCode}`,
            },
          })
          .catch((err) => {
            console.warn('Lỗi upsert Prisma Expense khi duyệt tạm ứng:', err.message);
          });
      }

      if (isCash) {
        await runQuery(
          db,
          "UPDATE cash_and_bank_assets SET balance = MAX(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE type = 'cash' LIMIT 1",
          [amount]
        ).catch(() => {});
      } else {
        await runQuery(
          db,
          "UPDATE cash_and_bank_assets SET balance = MAX(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM cash_and_bank_assets WHERE type = 'bank' AND balance >= ? ORDER BY balance DESC LIMIT 1)",
          [amount, amount]
        ).catch(() => {});
      }

      await syncAllSubledgersToJournal(db).catch((err) => {
        console.warn('Lỗi syncAllSubledgersToJournal sau khi duyệt tạm ứng:', err.message);
      });
    } else if (mappedStatus === 'rejected') {
      await runQuery(db, 'DELETE FROM financial_expenses WHERE id = ? OR notes LIKE ?', [expenseId, `%${reqRecord.id}%`]).catch(() => {});
      await runQuery(db, 'DELETE FROM financial_vouchers WHERE reference_code = ? OR voucher_code = ?', [reqRecord.id, voucherCode]).catch(() => {});
      await runQuery(db, "DELETE FROM advance_settlements WHERE (advance_id = ? OR advance_code = ?) AND status = 'unsettled'", [reqRecord.id, itemCode]).catch(() => {});

      if (prismaInstance?.expense) {
        await prismaInstance.expense
          .deleteMany({
            where: {
              OR: [{ id: expenseId }, { referenceId: reqRecord.id }],
            },
          })
          .catch(() => {});
      }

      await syncAllSubledgersToJournal(db).catch(() => {});
    }
  } catch (err) {
    console.error('❌ [AdvanceFinanceSync] Lỗi xử lý đồng bộ tạm ứng sang tài chính:', err);
  } finally {
    try {
      db.close();
    } catch {}
  }
}
