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

function formatDateToVN(dateObj = new Date()) {
  const d = new Date(dateObj);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Tự động đồng bộ Phiếu yêu cầu tạm ứng (khi được phê duyệt) vào toàn bộ hệ thống Tài chính Kế toán:
 * 1. Bảng Quản lý tạm ứng: advance_payments
 * 2. Bảng Quản lý chi phí: financial_expenses (Định khoản Nợ 141 / Có 1121 hoặc Có 1111)
 * 3. Bảng Chứng từ sổ quỹ: financial_vouchers (Phiếu chi thanh toán)
 * 4. Bảng Chi phí Prisma: Expense (Báo cáo tài chính doanh nghiệp)
 * 5. Bảng Sổ nhật ký chung: accounting_journal_entries & accounting_journal_lines
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

    if (!reqRecord) {
      db.close();
      return;
    }

    let details = {};
    try {
      details = typeof reqRecord.details === 'string' ? JSON.parse(reqRecord.details) : reqRecord.details || {};
    } catch {
      details = {};
    }

    const reqType = (reqRecord.type || details.type || '').toLowerCase();
    const isAdvance = reqType === 'advance' || reqType === 'salary-advance' || reqType.includes('tạm ứng') || reqType === 'advance_payment';

    if (!isAdvance) {
      db.close();
      return;
    }

    const statusUpper = String(reqRecord.status || '').toUpperCase();
    const amount = Number(details.advanceAmount || details.amount || 0);

    const advPaymentId = `ADV-${reqRecord.id}`;
    const advPaymentCode = `TU-${reqRecord.id}`;
    const voucherCode = `PC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(reqRecord.id).replace(/\D/g, '').slice(-3) || '581'}`;
    const expenseId = `EXP-ADV-${reqRecord.id}`;

    if (statusUpper === 'APPROVED' && amount > 0) {
      const purpose = details.advancePurpose || details.purpose || details.title || reqRecord.reason || 'Tạm ứng công tác phí';
      const employeeName = reqRecord.employee?.name || details.applicantName || details.employeeName || 'Cán bộ nhân viên';
      const employeeCode = reqRecord.employee?.code || details.employeeCode || 'NV-001';
      const department = reqRecord.employee?.department || details.department || 'Ban Giám đốc';
      const isCash = details.paymentMethod === 'cash' || details.method === 'cash';
      const paymentMethod = isCash ? 'cash' : 'bank_transfer';
      const bankName = details.bankName || details.bankInfo?.bankName || 'Vietcombank';
      const bankAccount = details.bankAccount || details.bankInfo?.accountNumber || '';
      const bankAccountName = details.bankAccountName || details.bankInfo?.accountName || employeeName;
      const deadlineRefund = details.deadlineRefund || details.advanceRepaymentDate || '';
      const note = details.advanceRepaymentPlan || details.content || details.note || '';

      const requestedDate = formatDateToVN(reqRecord.createdAt || new Date());
      const approvedDate = formatDateToVN(new Date());

      // 1. Cập nhật bảng advance_payments
      await runQuery(db, 'DELETE FROM advance_payments WHERE id = ? OR code = ?', [advPaymentId, advPaymentCode]).catch(() => {});
      await runQuery(
        db,
        `INSERT INTO advance_payments (
          id, code, employee_name, employee_code, department, purpose, project,
          amount, requested_date, payment_method, bank_name, bank_account, bank_account_name,
          status, review_status, approver, approved_date, deadline_refund, note, attached_docs_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'approved', ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          advPaymentId,
          advPaymentCode,
          employeeName,
          employeeCode,
          department,
          purpose,
          details.project || '',
          amount,
          requestedDate,
          paymentMethod,
          bankName,
          bankAccount,
          bankAccountName,
          details.approver || 'Lãnh đạo phê duyệt',
          approvedDate,
          deadlineRefund,
          note,
        ]
      );

      // 2. Cập nhật bảng financial_expenses
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
          `Phiếu yêu cầu tạm ứng ${reqRecord.id}. ${deadlineRefund ? 'Hạn hoàn ứng: ' + deadlineRefund : ''}`,
          debitAccount,
          debitAccountName,
          creditAccount,
          creditAccountName,
          employeeName,
        ]
      );

      // 3. Cập nhật bảng financial_vouchers (Chứng từ chi tiền sổ quỹ)
      const voucherId = `VOUCH-${voucherCode}`;
      await runQuery(db, 'DELETE FROM financial_vouchers WHERE id = ? OR voucher_code = ? OR reference_code = ?', [voucherId, voucherCode, reqRecord.id]).catch(() => {});
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
          `Chi tạm ứng theo đề xuất ${reqRecord.id}`,
        ]
      );

      // 4. Cập nhật Prisma model Expense
      if (prismaInstance?.expense) {
        await prismaInstance.expense.upsert({
          where: { id: expenseId },
          create: {
            id: expenseId,
            tenChiPhi: expenseTitle,
            loai: 'Tạm ứng',
            soTien: amount,
            ngayChiTra: new Date(),
            nguoiChiTra: employeeName,
            trangThai: 'approved',
            ghiChu: `Chi tạm ứng theo phiếu yêu cầu ${reqRecord.id}`,
            referenceType: 'personal_request',
            referenceId: reqRecord.id,
          },
          update: {
            tenChiPhi: expenseTitle,
            soTien: amount,
            ngayChiTra: new Date(),
            nguoiChiTra: employeeName,
            trangThai: 'approved',
            ghiChu: `Chi tạm ứng theo phiếu yêu cầu ${reqRecord.id}`,
          },
        }).catch((err) => {
          console.warn('Lỗi upsert Prisma Expense khi duyệt tạm ứng:', err.message);
        });
      }

      // 5. Cập nhật số dư tiền mặt hoặc tài khoản ngân hàng
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

      // 6. Đồng bộ sổ nhật ký chung (accounting_journal_entries và accounting_journal_lines)
      await syncAllSubledgersToJournal(db).catch((err) => {
        console.warn('Lỗi syncAllSubledgersToJournal sau khi duyệt tạm ứng:', err.message);
      });

      console.log(`✅ [AdvanceFinanceSync] Đã đồng bộ thành công phiếu tạm ứng ${reqRecord.id} (${amount.toLocaleString('vi-VN')} đ) vào Quản lý Chi phí, Tạm ứng và Sổ nhật ký chung.`);
    } else if (statusUpper === 'REJECTED' || statusUpper === 'CANCELLED') {
      // Khi phiếu bị từ chối hoặc hủy, dọn dẹp các bản ghi chi phí và chứng từ đã phát sinh
      await runQuery(db, 'DELETE FROM financial_expenses WHERE id = ? OR notes LIKE ?', [expenseId, `%${reqRecord.id}%`]).catch(() => {});
      await runQuery(db, 'DELETE FROM financial_vouchers WHERE reference_code = ? OR voucher_code = ?', [reqRecord.id, voucherCode]).catch(() => {});
      await runQuery(db, "UPDATE advance_payments SET status = 'rejected', review_status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR code = ?", [advPaymentId, advPaymentCode]).catch(() => {});

      if (prismaInstance?.expense) {
        await prismaInstance.expense.deleteMany({
          where: {
            OR: [
              { id: expenseId },
              { referenceId: reqRecord.id },
            ],
          },
        }).catch(() => {});
      }

      await syncAllSubledgersToJournal(db).catch(() => {});
      console.log(`ℹ️ [AdvanceFinanceSync] Đã hủy liên kết tài chính cho phiếu tạm ứng ${reqRecord.id} (Trạng thái: ${statusUpper}).`);
    }
  } catch (err) {
    console.error('❌ [AdvanceFinanceSync] Lỗi xử lý đồng bộ tạm ứng sang tài chính:', err);
  } finally {
    try {
      db.close();
    } catch {}
  }
}
