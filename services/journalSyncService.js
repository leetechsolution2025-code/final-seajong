/**
 * Service đồng bộ bổ sung các chứng từ phát sinh mới (Đối soát DS-..., Phiếu thu/chi mới lập trong ngày)
 * vào Sổ nhật ký chung (accounting_journal_entries và accounting_journal_lines)
 * mà không tạo dữ liệu rác hoặc ghi đè trùng lặp lên dữ liệu gốc từ Prisma JournalEntry.
 */

export function normalizeDate(d, codeHint = '') {
  // Ưu tiên trích xuất ngày thực tế từ mã chứng từ nếu có dạng YYYYMMDD (ví dụ PT-20261104-166 -> 2026-11-04)
  const codeMatch = String(codeHint || '').match(/202\d[01]\d[0-3]\d/);
  if (codeMatch) {
    const raw = codeMatch[0];
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  if (!d) return new Date().toISOString().slice(0, 10);
  const str = String(d).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  if (str.includes('-')) {
    const parts = str.split(' ')[0].split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  return str.substring(0, 10);
}

let _journalSyncPromise = null;

export async function syncAllSubledgersToJournal(db) {
  if (_journalSyncPromise) {
    return _journalSyncPromise;
  }
  _journalSyncPromise = _runSyncAllSubledgersToJournal(db).finally(() => {
    _journalSyncPromise = null;
  });
  return _journalSyncPromise;
}

function _runSyncAllSubledgersToJournal(db) {
  const dbAllAsync = (sql, params = []) =>
    new Promise((res) => {
      db.all(sql, params, (err, rows) => res(err ? [] : rows || []));
    });

  return new Promise(async (resolve, reject) => {
    try {
      const [
        receivables,
        payables,
        dsDebts,
        advVouchers,
        advOrders,
        advSettlements,
        suppOrders,
        suppVouchers,
        prepaidSaleOrders,
        verifiedPayNotifs,
        prepaidPoDebts,
        payrollSummaries,
        expenseAndHrVouchers,
        shipmentFees,
        poShippingFees,
        loanDrawdowns,
        materialTickets,
        qcInspections,
      ] = await Promise.all([
        dbAllAsync('SELECT * FROM debt_receivables'),
        dbAllAsync('SELECT * FROM debt_payables'),
        dbAllAsync("SELECT * FROM Debt WHERE referenceId LIKE 'DS-%'"),
        dbAllAsync(
          "SELECT * FROM financial_vouchers WHERE status = 'completed' AND (debit_account = '141' OR (partner_type = 'employee' AND COALESCE(debit_account, '141') = '141'))"
        ),
        dbAllAsync(
          "SELECT * FROM payment_orders WHERE status = 'completed' AND ref_type IN ('advance', 'advance_payment')"
        ),
        dbAllAsync(
          "SELECT * FROM advance_settlements WHERE status = 'settled' AND COALESCE(actual_spent, 0) > 0"
        ),
        dbAllAsync(
          `SELECT * FROM payment_orders
           WHERE status = 'completed'
             AND (ref_type IN ('advance_supplier', 'purchase_order_deposit', 'payable_payment')
                  OR ref_code LIKE 'YCU-%'
                  OR ref_code LIKE 'YCCHI-%'
                  OR order_code LIKE 'LC-COC-%'
                  OR order_code LIKE 'YCU-%'
                  OR order_code LIKE 'YCCHI-%')`
        ),
        dbAllAsync(
          `SELECT * FROM financial_vouchers
           WHERE status = 'completed'
             AND (debit_account LIKE '331%' OR partner_type IN ('supplier', 'transporter'))
             AND (voucher_type = 'PC'
                  OR voucher_code LIKE 'PC-LC-%'
                  OR voucher_code LIKE 'PC-YCU-%'
                  OR voucher_code LIKE 'PC-YCCHI-%'
                  OR voucher_code LIKE 'PC-COC-%'
                  OR voucher_code LIKE 'PC-2026%')`
        ),
        dbAllAsync(
          `SELECT so.*, c.name as customerName
           FROM SaleOrder so
           LEFT JOIN Customer c ON so.customerId = c.id
           WHERE COALESCE(so.daThanhToan, 0) > 0 AND so.trangThai != 'cancelled'`
        ),
        dbAllAsync(
          `SELECT pn.*, so.code as orderCode, c.name as customerName
           FROM PaymentNotification pn
           LEFT JOIN SaleOrder so ON pn.saleOrderId = so.id
           LEFT JOIN Customer c ON COALESCE(pn.customerId, so.customerId) = c.id
           WHERE pn.status = 'verified' AND COALESCE(pn.amount, 0) > 0`
        ),
        dbAllAsync(
          `SELECT * FROM Debt
           WHERE (type = 'PAYABLE' OR type = 'phai-tra')
             AND COALESCE(amount, 0) > 0
             AND COALESCE(paidAmount, 0) > 0
             AND referenceId LIKE 'DH-%'`
        ),
        dbAllAsync(
          `SELECT month, year,
                  MAX(status) as status,
                  COUNT(CASE WHEN COALESCE(work_salary, 0) + COALESCE(total_allowance, 0) + COALESCE(ot_salary, 0) + COALESCE(bonus_amount, 0) + COALESCE(corporate_insurance, 0) > 0 THEN 1 END) as emp_cnt,
                  SUM(COALESCE(work_salary, 0) + COALESCE(total_allowance, 0) + COALESCE(ot_salary, 0) + COALESCE(bonus_amount, 0)) as total_gross,
                  SUM(COALESCE(insurance_deduction, 0)) as total_emp_ins,
                  SUM(COALESCE(corporate_insurance, 0)) as total_corp_ins,
                  SUM(COALESCE(tax_deduction, 0)) as total_tax,
                  SUM(COALESCE(advance_or_penalties, 0)) as total_adv_ded,
                  SUM(COALESCE(net_salary, 0)) as total_net,
                  MAX(updated_at) as last_updated
           FROM monthly_payrolls
           GROUP BY year, month`
        ),
        dbAllAsync(
          `SELECT * FROM financial_vouchers
           WHERE status = 'completed'
             AND (debit_account LIKE '64%'
                  OR debit_account LIKE '62%'
                  OR debit_account LIKE '63%'
                  OR debit_account LIKE '334%'
                  OR debit_account LIKE '338%'
                  OR debit_account LIKE '341%')`
        ),
        dbAllAsync(
          `SELECT s.*, c.name as resolvedCarrierName
           FROM LogisticsShipment s
           LEFT JOIN Carrier c ON s.carrierId = c.id
           WHERE COALESCE(s.shippingFee, 0) > 0`
        ),
        dbAllAsync(
          `SELECT po.*, c.name as resolvedCarrierName, s.name as resolvedSupplierName
           FROM PurchaseOrder po
           LEFT JOIN Carrier c ON po.carrierId = c.id
           LEFT JOIN Supplier s ON po.supplierId = s.id
           WHERE COALESCE(po.shippingFee, 0) > 0
             AND po.trangThai IN ('received', 'completed')`
        ),
        dbAllAsync(
          `SELECT d.*, l.bank_name, l.contract_code
           FROM bank_loan_drawdowns d
           LEFT JOIN bank_loans l ON d.loan_id = l.id
           WHERE COALESCE(d.amount, 0) > 0`
        ),
        dbAllAsync(
          `SELECT lt.*, so.code as saleOrderCode,
                  COALESCE((
                    SELECT SUM(COALESCE(lti.requestedQty, 0) * COALESCE(ii.giaNhap, 50000))
                    FROM LogisticsTicketItem lti
                    LEFT JOIN InventoryItem ii ON lti.inventoryItemId = ii.id
                    WHERE lti.ticketId = lt.id
                  ), 0) as totalCost
           FROM LogisticsTicket lt
           LEFT JOIN SaleOrder so ON lt.saleOrderId = so.id
           WHERE lt.type IN ('MATERIAL_PICKING', 'WARRANTY_MATERIAL')
             AND (lt.status IN ('COMPLETED', 'PICKED', 'PACKED', 'da_cap_phat') OR lt.createdAt IS NOT NULL)`
        ),
        dbAllAsync(
          `SELECT q.*,
                  COALESCE((
                    SELECT SUM(COALESCE(soi.soLuong, 1) * COALESCE(ii.giaNhap, 250000))
                    FROM SaleOrder so
                    JOIN SaleOrderItem soi ON so.id = soi.saleOrderId
                    LEFT JOIN InventoryItem ii ON soi.inventoryItemId = ii.id
                    WHERE so.code = q.code OR q.notes LIKE '%' || so.code || '%'
                  ), 0) as totalValue
           FROM QualityInspection q
           WHERE q.type = 'OQC'
             AND q.status IN ('Đã hoàn thành', 'approved', 'COMPLETED', 'Đạt')`
        ),
      ]);

      db.serialize(() => {
        db.run('PRAGMA foreign_keys = OFF');

        // 1. Xóa sạch toàn bộ các bút toán JE-% tự sinh cũ (trừ các bút toán MANUAL do người dùng tự lập)
        db.run(`
          DELETE FROM accounting_journal_lines
          WHERE (id LIKE 'JE-%' OR entry_id LIKE 'JE-%')
            AND entry_id NOT IN (
              SELECT id FROM accounting_journal_entries WHERE source_module = 'MANUAL'
            )
             OR entry_id IN (
               SELECT id FROM accounting_journal_entries
               WHERE description LIKE '%cửa công trình%'
                  OR description LIKE '%cửa gỗ%'
                  OR description LIKE '%Gỗ sấy%'
             )
        `);

        db.run(`
          DELETE FROM accounting_journal_entries
          WHERE (id LIKE 'JE-%' AND COALESCE(source_module, '') != 'MANUAL')
             OR description LIKE '%cửa công trình%'
             OR description LIKE '%cửa gỗ%'
             OR description LIKE '%Gỗ sấy%'
        `);

        // 2. Lấy danh sách các mã chứng từ gốc đã có sẵn trong Sổ nhật ký chung
        db.all(
          'SELECT entry_number, reference_code, entry_date, source_module, total_amount, description FROM accounting_journal_entries',
          [],
          (exErr, existingRows) => {
            const existingCodes = new Set();
            const existingOrderPrepaymentCodes = new Set();
            const existingOrderRevenueCodes = new Set();
            (existingRows || []).forEach((r) => {
              const eNum = String(r.entry_number || '').trim();
              const rCode = String(r.reference_code || '').trim();
              const desc = String(r.description || '').toLowerCase();
              if (eNum) existingCodes.add(eNum);
              if (rCode) {
                if (rCode.startsWith('DBH-')) {
                  if (desc.includes('thu tiền') || desc.includes('ứng trước') || desc.includes('trả trước')) {
                    existingOrderPrepaymentCodes.add(rCode);
                  } else if (desc.includes('doanh thu') || desc.includes('công nợ')) {
                    existingOrderRevenueCodes.add(rCode);
                  } else {
                    existingCodes.add(rCode);
                  }
                } else {
                  existingCodes.add(rCode);
                }
              }
            });

            const insertEntryStmt = db.prepare(`
              INSERT OR REPLACE INTO accounting_journal_entries (
                id, entry_number, entry_date, document_date, reference_code,
                source_module, source_label, description, total_amount,
                status, status_label, created_by, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'Đã ghi sổ', ?, ?, ?)
            `);
            insertEntryStmt.on('error', (stmtErr) => {
              console.warn('⚠️ [journalSyncService] insertEntryStmt error:', stmtErr.message);
            });

            const insertLineStmt = db.prepare(`
              INSERT OR REPLACE INTO accounting_journal_lines (
                id, entry_id, line_number, account_id, account_code,
                account_name, type, amount, description, partner, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
            insertLineStmt.on('error', (stmtErr) => {
              console.warn('⚠️ [journalSyncService] insertLineStmt error:', stmtErr.message);
            });

            let syncedCount = 0;

            // ==========================================
            // A. ĐỒNG BỘ CHỨNG TỪ ĐỐI SOÁT (DS-...), KHÁCH HÀNG TRẢ TRƯỚC & PHIẾU THU TỪ CÔNG NỢ PHẢI THU
            // ==========================================
            (receivables || []).forEach((rec) => {
              let entriesList = [];
              try {
                entriesList = JSON.parse(rec.entries_json || '[]');
              } catch {
                entriesList = [];
              }

              entriesList.forEach((ent) => {
                const entCode = String(ent.code || '').trim();
                const subPayments = Array.isArray(ent.payments) ? ent.payments : [];

                subPayments.forEach((p, pIdx) => {
                  const pCode = String(p.code || p.receiptCode || '').trim();
                  if (!pCode || existingCodes.has(pCode)) return;

                  const isRecon =
                    p.isReconciliation || p.type === 'reconciliation' || pCode.startsWith('DS-');
                  const pTitleLower = String(p.title || p.note || ent.title || '').toLowerCase();
                  const isCustomerAdvance =
                    Boolean(p.isAdvance || ent.isAdvance) ||
                    entCode.startsWith('UT-') ||
                    pTitleLower.includes('ứng trước') ||
                    pTitleLower.includes('trả trước') ||
                    pTitleLower.includes('trả tiền trước') ||
                    pTitleLower.includes('đặt cọc');

                  const dbhMatch =
                    (entCode.startsWith('DBH-') ? entCode : '') ||
                    (pCode.startsWith('PT-DBH-') ? pCode.replace(/^PT-/, '') : '') ||
                    (String(p.title || '').match(/DBH-\d{8}-\d+/) || [])[0] ||
                    '';
                  if (dbhMatch && existingOrderPrepaymentCodes.has(dbhMatch)) return;

                  const pDate = normalizeDate(p.date || ent.date, pCode);
                  if (!isRecon && !isCustomerAdvance && pDate < '2026-11-11') return;

                  const rawAmt = Math.round(Number(p.amount ?? p.paidAmount) || 0);
                  const absAmt = Math.abs(rawAmt);
                  if (absAmt <= 0) return;

                  existingCodes.add(pCode);
                  if (dbhMatch) existingOrderPrepaymentCodes.add(dbhMatch);
                  const payEntryId = `JE-REC-${pCode.replace(/[^a-zA-Z0-9-]/g, '')}-${pIdx}`;
                  const pTime = String(p.time || ent.time || '09:00').trim();
                  const createdAtStr = pTime.length === 5 ? `${pDate} ${pTime}:00` : `${pDate} ${pTime}`;

                  if (isRecon) {
                    const debitAcc = rawAmt >= 0 ? '1121' : '131';
                    const debitName =
                      rawAmt >= 0 ? 'Tiền gửi ngân hàng (VND)' : 'Phải thu của khách hàng';
                    const creditAcc = rawAmt >= 0 ? '131' : '1121';
                    const creditName =
                      rawAmt >= 0 ? 'Phải thu của khách hàng' : 'Tiền gửi ngân hàng (VND)';

                    insertEntryStmt.run(
                      payEntryId,
                      pCode,
                      pDate,
                      pDate,
                      p.refVoucherCode || entCode || rec.code,
                      'CASH',
                      'Đối soát công nợ',
                      p.title || `Đối soát công nợ chứng từ ${p.refVoucherCode || entCode} - KH: ${rec.customer_name}`,
                      absAmt,
                      rec.manager_name || 'Kế toán công nợ',
                      createdAtStr,
                      createdAtStr
                    );

                    insertLineStmt.run(
                      `${payEntryId}-L1`,
                      payEntryId,
                      1,
                      debitAcc,
                      debitAcc,
                      debitName,
                      'DEBIT',
                      absAmt,
                      p.title || `Đối soát công nợ chứng từ ${p.refVoucherCode || entCode}`,
                      rec.customer_name
                    );

                    insertLineStmt.run(
                      `${payEntryId}-L2`,
                      payEntryId,
                      2,
                      creditAcc,
                      creditAcc,
                      creditName,
                      'CREDIT',
                      absAmt,
                      p.title || `Đối soát công nợ chứng từ ${p.refVoucherCode || entCode}`,
                      rec.customer_name
                    );

                    syncedCount++;
                  } else {
                    const isCashRec =
                      p.debitAccount === '1111' ||
                      String(p.method || '').toLowerCase().includes('tiền mặt');
                    const recAccCode = isCashRec ? '1111' : '1121';
                    const recAccName =
                      recAccCode === '1111'
                        ? 'Tiền Việt Nam (Tiền mặt quỹ)'
                        : 'Tiền gửi ngân hàng (VND)';
                    const entryDesc = isCustomerAdvance
                      ? p.title || `Thu tiền khách hàng trả trước (Ứng trước) - ${rec.customer_name}`
                      : p.title || `Thu tiền khách hàng - ${rec.customer_name}`;

                    insertEntryStmt.run(
                      payEntryId,
                      pCode,
                      pDate,
                      pDate,
                      entCode || rec.code,
                      'SALES',
                      'Bán hàng',
                      entryDesc,
                      absAmt,
                      rec.manager_name || 'Kế toán thanh toán',
                      createdAtStr,
                      createdAtStr
                    );

                    insertLineStmt.run(
                      `${payEntryId}-L1`,
                      payEntryId,
                      1,
                      recAccCode,
                      recAccCode,
                      recAccName,
                      'DEBIT',
                      absAmt,
                      entryDesc,
                      rec.customer_name
                    );

                    insertLineStmt.run(
                      `${payEntryId}-L2`,
                      payEntryId,
                      2,
                      '131',
                      '131',
                      isCustomerAdvance
                        ? 'Phải thu của khách hàng (Khách hàng ứng trước)'
                        : 'Phải thu của khách hàng',
                      'CREDIT',
                      absAmt,
                      isCustomerAdvance
                        ? `Khách hàng ${rec.customer_name} trả tiền trước / đặt cọc`
                        : `Thu hồi công nợ khách hàng ${rec.customer_name}`,
                      rec.customer_name
                    );

                    syncedCount++;
                  }
                });
              });
            });

            // ==========================================
            // B. ĐỒNG BỘ CHỨNG TỪ ĐỐI SOÁT (DS-...), ỨNG TRƯỚC NCC & PHIẾU CHI MỚI TỪ CÔNG NỢ PHẢI TRẢ
            // ==========================================
            (payables || []).forEach((pay) => {
              let entriesList = [];
              try {
                entriesList = JSON.parse(pay.entries_json || '[]');
              } catch {
                entriesList = [];
              }

              entriesList.forEach((pe, pIdx) => {
                const peCode = String(pe.code || '').trim();
                if (!peCode || peCode === 'Dư nợ đầu kỳ' || existingCodes.has(peCode)) return;

                const isRecon =
                  pe.isReconciliation ||
                  pe.type === 'reconciliation' ||
                  pe.voucherType === 'reconciliation' ||
                  peCode.startsWith('DS-');
                const peTitleLower = String(pe.title || '').toLowerCase();
                const isSupplierAdvance =
                  Boolean(pe.isAdvance) ||
                  peCode.startsWith('PC-LC-') ||
                  peCode.startsWith('PC-YCU-') ||
                  peCode.startsWith('PC-YCCHI-') ||
                  peCode.startsWith('PC-COC-') ||
                  peCode.startsWith('YCU-') ||
                  peTitleLower.includes('ứng trước') ||
                  peTitleLower.includes('تạm ứng') ||
                  peTitleLower.includes('tạm ứng') ||
                  peTitleLower.includes('đặt cọc');
                const isPayment =
                  !isRecon &&
                  !peCode.startsWith('DH-') &&
                  !peCode.startsWith('PO-') &&
                  (isSupplierAdvance ||
                    pe.type === 'payment' ||
                    pe.voucherType === 'payment' ||
                    pe.statusLabel === 'Đã chi tiền' ||
                    peCode.startsWith('PC-') ||
                    peCode.startsWith('UNC-'));

                const pDate = normalizeDate(pe.date || pe.dueDate, peCode);
                const peTime = String(pe.time || '08:30').trim();
                const peCreatedAtStr = peTime.length === 5 ? `${pDate} ${peTime}:00` : `${pDate} ${peTime}`;
                if (!isRecon && !isSupplierAdvance && pDate < '2026-11-11') return;

                if (isRecon) {
                  const rawDelta = Math.round(
                    Number(pe.paidAmount ?? pe.amount ?? pe.totalAmount) || 0
                  );
                  const absDelta = Math.abs(rawDelta);
                  if (absDelta <= 0) return;
                  existingCodes.add(peCode);

                  const reconEntryId = `JE-PAY-RECON-${peCode.replace(/[^a-zA-Z0-9-]/g, '')}-${pIdx}`;
                  const debitAcc = rawDelta >= 0 ? '331' : '1121';
                  const debitName =
                    rawDelta >= 0
                      ? 'Phải trả cho người bán (Nhà cung cấp)'
                      : 'Tiền gửi ngân hàng (VND)';
                  const creditAcc = rawDelta >= 0 ? '1121' : '331';
                  const creditName =
                    rawDelta >= 0
                      ? 'Tiền gửi ngân hàng (VND)'
                      : 'Phải trả cho người bán (Nhà cung cấp)';

                  insertEntryStmt.run(
                    reconEntryId,
                    peCode,
                    pDate,
                    pDate,
                    pe.refVoucherCode || pay.code,
                    'CASH',
                    'Đối soát công nợ',
                    pe.title || `Đối soát công nợ chứng từ ${pe.refVoucherCode || pay.code} - NCC: ${pay.supplier_name}`,
                    absDelta,
                    pay.accountant || 'Kế toán công nợ',
                    peCreatedAtStr,
                    peCreatedAtStr
                  );

                  insertLineStmt.run(
                    `${reconEntryId}-L1`,
                    reconEntryId,
                    1,
                    debitAcc,
                    debitAcc,
                    debitName,
                    'DEBIT',
                    absDelta,
                    pe.title || `Đối soát công nợ chứng từ ${pe.refVoucherCode || pay.code}`,
                    pay.supplier_name
                  );

                  insertLineStmt.run(
                    `${reconEntryId}-L2`,
                    reconEntryId,
                    2,
                    creditAcc,
                    creditAcc,
                    creditName,
                    'CREDIT',
                    absDelta,
                    pe.title || `Đối soát công nợ chứng từ ${pe.refVoucherCode || pay.code}`,
                    pay.supplier_name
                  );

                  syncedCount++;
                } else if (isPayment) {
                  const pAmount = Math.round(
                    Number(pe.paidAmount || pe.totalAmount || pe.amount) || 0
                  );
                  if (pAmount <= 0) return;
                  existingCodes.add(peCode);

                  const disbEntryId = `JE-PAY-DISB-${peCode.replace(/[^a-zA-Z0-9-]/g, '')}-${pIdx}`;
                  const isCashPay =
                    pe.creditAccount === '1111' ||
                    String(pe.paymentMethod || '').toLowerCase().includes('tiền mặt');
                  const payAccCode = isCashPay ? '1111' : '1121';
                  const payAccName =
                    payAccCode === '1111'
                      ? 'Tiền Việt Nam (Tiền mặt quỹ)'
                      : 'Tiền gửi ngân hàng (VND)';
                  const payTitle = isSupplierAdvance
                    ? pe.title || `Ứng trước / Đặt cọc cho nhà cung cấp - ${pay.supplier_name}`
                    : pe.title || `Thanh toán NCC - ${pay.supplier_name}`;

                  insertEntryStmt.run(
                    disbEntryId,
                    peCode,
                    pDate,
                    pDate,
                    pe.refVoucherCode || peCode,
                    'CASH',
                    'Quỹ và Ngân hàng',
                    payTitle,
                    pAmount,
                    pay.accountant || 'Kế toán thanh toán',
                    peCreatedAtStr,
                    peCreatedAtStr
                  );

                  insertLineStmt.run(
                    `${disbEntryId}-L1`,
                    disbEntryId,
                    1,
                    '331',
                    '331',
                    isSupplierAdvance
                      ? 'Phải trả cho người bán (Ứng trước cho nhà cung cấp)'
                      : 'Phải trả cho người bán (Nhà cung cấp)',
                    'DEBIT',
                    pAmount,
                    payTitle,
                    pay.supplier_name
                  );

                  insertLineStmt.run(
                    `${disbEntryId}-L2`,
                    disbEntryId,
                    2,
                    payAccCode,
                    payAccCode,
                    payAccName,
                    'CREDIT',
                    pAmount,
                    payAccCode === '1111'
                      ? `Chi tiền mặt thanh toán / ứng trước cho ${pay.supplier_name}`
                      : `Chuyển khoản ngân hàng thanh toán / ứng trước cho ${pay.supplier_name}`,
                    pay.supplier_name
                  );

                  syncedCount++;
                }
              });
            });

            // ==========================================
            // C. ĐỒNG BỘ TRỰC TIẾP TỪ BẢNG Debt CHO CÁC CHỨNG TỪ ĐỐI SOÁT (DS-...) CHƯA NẰM TRONG SUBLEDGER
            // ==========================================
            (dsDebts || []).forEach((d, dIdx) => {
              const dsCode = String(d.referenceId || '').trim();
              if (!dsCode || existingCodes.has(dsCode)) return;

              const rawDelta = Math.round(Number(d.paidAmount) || 0);
              const absDelta = Math.abs(rawDelta);
              if (absDelta <= 0) return;

              existingCodes.add(dsCode);
              const rawDesc = String(d.description || '');
              const cleanTitle = rawDesc.split('\n')[0].trim();
              let reconMeta = null;
              if (rawDesc.includes('[RECON_META]:')) {
                try {
                  reconMeta = JSON.parse(rawDesc.split('[RECON_META]:')[1].trim());
                } catch {}
              }
              const refVch = reconMeta?.refVoucherCode || dsCode;
              const pDate = normalizeDate(reconMeta?.date || '', dsCode);
              const dsTime = String(reconMeta?.time || '09:00').trim();
              const dsCreatedAtStr = dsTime.length === 5 ? `${pDate} ${dsTime}:00` : `${pDate} ${dsTime}`;
              const isRecType = d.type === 'RECEIVABLE' || d.type === 'phai-thu';
              const entryId = `JE-DS-DEBT-${dsCode.replace(/[^a-zA-Z0-9-]/g, '')}-${dIdx}`;

              const debitAcc = isRecType
                ? rawDelta >= 0 ? '1121' : '131'
                : rawDelta >= 0 ? '331' : '1121';
              const debitName =
                debitAcc === '1121'
                  ? 'Tiền gửi ngân hàng (VND)'
                  : debitAcc === '131'
                    ? 'Phải thu của khách hàng'
                    : 'Phải trả cho người bán (Nhà cung cấp)';
              const creditAcc = isRecType
                ? rawDelta >= 0 ? '131' : '1121'
                : rawDelta >= 0 ? '1121' : '331';
              const creditName =
                creditAcc === '1121'
                  ? 'Tiền gửi ngân hàng (VND)'
                  : creditAcc === '131'
                    ? 'Phải thu của khách hàng'
                    : 'Phải trả cho người bán (Nhà cung cấp)';
              const partnerName = d.partnerName || 'Đối tác';

              insertEntryStmt.run(
                entryId,
                dsCode,
                pDate,
                pDate,
                refVch,
                'CASH',
                'Đối soát công nợ',
                cleanTitle || `Đối soát công nợ chứng từ ${refVch} - ${partnerName}`,
                absDelta,
                'Kế toán công nợ',
                dsCreatedAtStr,
                dsCreatedAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                debitAcc,
                debitAcc,
                debitName,
                'DEBIT',
                absDelta,
                cleanTitle || `Đối soát công nợ chứng từ ${refVch}`,
                partnerName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                creditAcc,
                creditAcc,
                creditName,
                'CREDIT',
                absDelta,
                cleanTitle || `Đối soát công nợ chứng từ ${refVch}`,
                partnerName
              );

              syncedCount++;
            });

            // ==========================================
            // D. ĐỒNG BỘ CHI TẠM ỨNG NHÂN VIÊN & QUYẾT TOÁN HOÀN TẠM ỨNG (TK 141)
            // ==========================================
            const syncedAdvanceRefs = new Set();

            (advVouchers || []).forEach((v, idx) => {
              const vCode = String(v.voucher_code || '').trim();
              const refCode = String(v.reference_code || vCode).trim();
              if (!vCode || existingCodes.has(vCode) || (refCode && existingCodes.has(refCode))) return;
              const amt = Math.round(Number(v.amount) || 0);
              if (amt <= 0) return;

              existingCodes.add(vCode);
              if (refCode) {
                existingCodes.add(refCode);
                syncedAdvanceRefs.add(refCode);
              }

              const pDate = normalizeDate(v.date, '');
              const createdAtStr = v.created_at && String(v.created_at).includes('-')
                ? String(v.created_at)
                : `${pDate} 10:00:00`;
              const isCash =
                v.credit_account === '1111' ||
                String(v.payment_method || '').toLowerCase().includes('tiền mặt') ||
                v.payment_method === 'cash';
              const creditAcc = isCash ? '1111' : '1121';
              const creditName = isCash ? 'Tiền Việt Nam (Tiền mặt quỹ)' : 'Tiền gửi ngân hàng (VND)';
              const partnerName = v.partner_name || 'Cán bộ nhân viên';
              const cleanReason = String(v.reason || '').replace(/^Thời hạn hoàn ứng.*$/i, '').trim();
              const desc = cleanReason
                ? `Chi tạm ứng nhân viên ${partnerName} (${refCode}): ${cleanReason}`
                : `Chi tạm ứng nhân viên ${partnerName} theo phiếu ${refCode}`;
              const entryId = `JE-ADV-VCH-${vCode.replace(/[^a-zA-Z0-9-]/g, '')}-${idx}`;

              insertEntryStmt.run(
                entryId,
                `PKT-TU-${vCode}`,
                pDate,
                pDate,
                refCode || vCode,
                'ADVANCE',
                'Tạm ứng & Hoàn ứng',
                desc,
                amt,
                v.accountant || v.cashier || 'Kế toán thanh toán',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '141',
                '141',
                'Tạm ứng',
                'DEBIT',
                amt,
                desc,
                partnerName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                creditAcc,
                creditAcc,
                creditName,
                'CREDIT',
                amt,
                isCash ? `Chi tiền mặt tạm ứng cho ${partnerName}` : `Chuyển khoản chi tạm ứng cho ${partnerName}`,
                partnerName
              );

              syncedCount++;
            });

            (advOrders || []).forEach((ord, idx) => {
              const refCode = String(ord.ref_code || ord.order_code || '').trim();
              const vCode = String(ord.voucher_id || `PC-${ord.order_code}`).trim();
              if (
                existingCodes.has(vCode) ||
                existingCodes.has(refCode) ||
                syncedAdvanceRefs.has(refCode)
              ) {
                return;
              }
              const amt = Math.round(Number(ord.amount) || 0);
              if (amt <= 0) return;

              existingCodes.add(vCode);
              if (refCode) existingCodes.add(refCode);

              const pDate = normalizeDate(ord.executed_date || ord.due_date || ord.approved_date, '');
              const createdAtStr = `${pDate} 10:15:00`;
              const isCash =
                ord.payment_method === 'cash' ||
                String(ord.payment_method || '').toLowerCase().includes('tiền mặt');
              const creditAcc = isCash ? '1111' : '1121';
              const creditName = isCash ? 'Tiền Việt Nam (Tiền mặt quỹ)' : 'Tiền gửi ngân hàng (VND)';
              const partnerName = ord.beneficiary_name || 'Cán bộ nhân viên';
              const desc = `Chi tạm ứng nhân viên ${partnerName} (${refCode}) - ${ord.purpose || ord.title || 'Tạm ứng công tác phí'}`;
              const entryId = `JE-ADV-ORD-${vCode.replace(/[^a-zA-Z0-9-]/g, '')}-${idx}`;

              insertEntryStmt.run(
                entryId,
                `PKT-TU-${vCode}`,
                pDate,
                pDate,
                refCode || vCode,
                'ADVANCE',
                'Tạm ứng & Hoàn ứng',
                desc,
                amt,
                ord.executed_by || 'Kế toán thanh toán',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '141',
                '141',
                'Tạm ứng',
                'DEBIT',
                amt,
                desc,
                partnerName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                creditAcc,
                creditAcc,
                creditName,
                'CREDIT',
                amt,
                isCash ? `Chi tiền mặt tạm ứng cho ${partnerName}` : `Chuyển khoản chi tạm ứng cho ${partnerName}`,
                partnerName
              );

              syncedCount++;
            });

            (advSettlements || []).forEach((s, idx) => {
              const sCode = `QT-${s.advance_code || s.id}`;
              if (existingCodes.has(sCode)) return;
              const actualSpent = Math.round(Number(s.actual_spent) || 0);
              if (actualSpent <= 0) return;

              existingCodes.add(sCode);
              const pDate = normalizeDate(s.approved_date, '');
              const createdAtStr = `${pDate} 15:00:00`;
              const partnerName = s.employee_name || 'Cán bộ nhân viên';
              const desc = `Quyết toán hoàn tạm ứng ${s.advance_code || ''} - ${partnerName}: ${s.purpose || 'Hoàn ứng chi phí'}`;
              const entryId = `JE-ADV-SET-${sCode.replace(/[^a-zA-Z0-9-]/g, '')}-${idx}`;

              insertEntryStmt.run(
                entryId,
                `PKT-${sCode}`,
                pDate,
                pDate,
                s.advance_code || sCode,
                'ADVANCE',
                'Tạm ứng & Hoàn ứng',
                desc,
                actualSpent,
                s.approver || 'Kế toán thanh toán',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '642',
                '642',
                'Chi phí quản lý doanh nghiệp',
                'DEBIT',
                actualSpent,
                desc,
                partnerName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                '141',
                '141',
                'Tạm ứng',
                'CREDIT',
                actualSpent,
                `Kết chuyển hoàn tạm ứng nhân viên ${partnerName} (${s.advance_code || ''})`,
                partnerName
              );

              syncedCount++;
            });

            // ==========================================
            // E. ĐỒNG BỘ ỨNG TRƯỚC CHO NHÀ CUNG CẤP / ĐẶT CỌC MUA HÀNG (TK 331)
            // ==========================================
            (suppOrders || []).forEach((ord, idx) => {
              const vCode = String(ord.voucher_id || `PC-${ord.order_code}`).trim();
              const refCode = String(ord.ref_code || ord.order_code || vCode).trim();
              if (existingCodes.has(vCode) || existingCodes.has(refCode)) return;
              const amt = Math.round(Number(ord.amount) || 0);
              if (amt <= 0) return;

              existingCodes.add(vCode);
              const pDate = normalizeDate(ord.executed_date || ord.due_date || ord.approved_date, vCode);
              const createdAtStr = `${pDate} 09:30:00`;
              const isCash =
                ord.payment_method === 'cash' ||
                String(ord.payment_method || '').toLowerCase().includes('tiền mặt');
              const creditAcc = isCash ? '1111' : '1121';
              const creditName = isCash ? 'Tiền Việt Nam (Tiền mặt quỹ)' : 'Tiền gửi ngân hàng (VND)';
              const partnerName = ord.beneficiary_name || 'Nhà cung cấp';
              const isAdvanceOrDeposit =
                ord.ref_type === 'advance_supplier' ||
                ord.ref_type === 'purchase_order_deposit' ||
                refCode.startsWith('YCU-') ||
                String(ord.order_code || '').startsWith('LC-COC-');
              const desc = isAdvanceOrDeposit
                ? `Ứng trước / Đặt cọc cho nhà cung cấp ${partnerName} (${refCode}) - ${ord.purpose || ord.title || ''}`
                : ord.title || `Thanh toán nhà cung cấp ${partnerName} (${refCode})`;
              const entryId = `JE-SUPP-ORD-${vCode.replace(/[^a-zA-Z0-9-]/g, '')}-${idx}`;

              insertEntryStmt.run(
                entryId,
                vCode,
                pDate,
                pDate,
                refCode,
                'CASH',
                'Quỹ và Ngân hàng',
                desc,
                amt,
                ord.executed_by || 'Kế toán thanh toán',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '331',
                '331',
                isAdvanceOrDeposit
                  ? 'Phải trả cho người bán (Ứng trước cho nhà cung cấp)'
                  : 'Phải trả cho người bán (Nhà cung cấp)',
                'DEBIT',
                amt,
                desc,
                partnerName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                creditAcc,
                creditAcc,
                creditName,
                'CREDIT',
                amt,
                isCash
                  ? `Chi tiền mặt ứng trước / thanh toán cho NCC ${partnerName}`
                  : `Chuyển khoản ngân hàng ứng trước / thanh toán cho NCC ${partnerName}`,
                partnerName
              );

              syncedCount++;
            });

            (suppVouchers || []).forEach((v, idx) => {
              const vCode = String(v.voucher_code || '').trim();
              const refCode = String(v.reference_code || vCode).trim();
              if (!vCode || existingCodes.has(vCode) || existingCodes.has(refCode)) return;
              const amt = Math.round(Number(v.amount) || 0);
              if (amt <= 0) return;

              existingCodes.add(vCode);
              const pDate = normalizeDate(v.date, vCode);
              const createdAtStr = `${pDate} 09:45:00`;
              const isCash =
                v.credit_account === '1111' ||
                String(v.payment_method || '').toLowerCase().includes('tiền mặt') ||
                v.payment_method === 'cash';
              const creditAcc = isCash ? '1111' : '1121';
              const creditName = isCash ? 'Tiền Việt Nam (Tiền mặt quỹ)' : 'Tiền gửi ngân hàng (VND)';
              const partnerName = v.partner_name || 'Nhà cung cấp';
              const desc = v.reason || `Ứng trước / Thanh toán cho nhà cung cấp ${partnerName} (${vCode})`;
              const entryId = `JE-SUPP-VCH-${vCode.replace(/[^a-zA-Z0-9-]/g, '')}-${idx}`;

              insertEntryStmt.run(
                entryId,
                vCode,
                pDate,
                pDate,
                refCode,
                'CASH',
                'Quỹ và Ngân hàng',
                desc,
                amt,
                v.accountant || 'Kế toán thanh toán',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '331',
                '331',
                'Phải trả cho người bán (Nhà cung cấp)',
                'DEBIT',
                amt,
                desc,
                partnerName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                creditAcc,
                creditAcc,
                creditName,
                'CREDIT',
                amt,
                isCash
                  ? `Chi tiền mặt cho NCC ${partnerName}`
                  : `Chuyển khoản ngân hàng cho NCC ${partnerName}`,
                partnerName
              );

              syncedCount++;
            });

            // Đồng bộ các khoản ứng trước / đặt cọc trên đơn mua hàng trong bảng Debt (예: DH-20260807-0003) chưa có bút toán
            (prepaidPoDebts || []).forEach((d, idx) => {
              const refCode = String(d.referenceId || '').trim();
              if (!refCode || existingCodes.has(refCode)) return;
              const paidAmt = Math.round(Number(d.paidAmount) || 0);
              if (paidAmt <= 0) return;

              existingCodes.add(refCode);
              const pDate = normalizeDate('', refCode);
              const createdAtStr = `${pDate} 09:15:00`;
              const partnerName = d.partnerName || 'Nhà cung cấp';
              const isAdvanceDeposit = paidAmt < Math.round(Number(d.amount) || 0);
              const desc = isAdvanceDeposit
                ? `Ứng trước / Đặt cọc tiền hàng cho NCC ${partnerName} theo đơn ${refCode}`
                : `Thanh toán NCC - ${partnerName} (${refCode})`;
              const entryId = `JE-PO-PREP-${refCode.replace(/[^a-zA-Z0-9-]/g, '')}-${idx}`;

              insertEntryStmt.run(
                entryId,
                `PKT-UNC-${refCode}`,
                pDate,
                pDate,
                refCode,
                'CASH',
                'Quỹ và Ngân hàng',
                desc,
                paidAmt,
                'Kế toán thanh toán',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '331',
                '331',
                isAdvanceDeposit
                  ? 'Phải trả cho người bán (Ứng trước cho nhà cung cấp)'
                  : 'Phải trả cho người bán (Nhà cung cấp)',
                'DEBIT',
                paidAmt,
                desc,
                partnerName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                '1121',
                '1121',
                'Tiền gửi ngân hàng (VND)',
                'CREDIT',
                paidAmt,
                `Chuyển khoản ứng trước / thanh toán đơn mua hàng ${refCode} cho ${partnerName}`,
                partnerName
              );

              syncedCount++;
            });

            // ==========================================
            // F. ĐỒNG BỘ KHÁCH HÀNG TRẢ TIỀN TRƯỚC / ỨNG TRƯỚC TIỀN HÀNG (PaymentNotification & SaleOrder.daThanhToan > 0)
            // ==========================================
            (verifiedPayNotifs || []).forEach((pn, idx) => {
              const ptCode = String(pn.code || '').trim();
              const ordCode = String(pn.orderCode || '').trim();
              if (!ptCode || existingCodes.has(ptCode)) return;
              if (ordCode && existingOrderPrepaymentCodes.has(ordCode)) return;

              const amt = Math.round(Number(pn.amount) || 0);
              if (amt <= 0) return;

              existingCodes.add(ptCode);
              if (ordCode) existingOrderPrepaymentCodes.add(ordCode);

              const pDate = normalizeDate('', ptCode);
              const createdAtStr = `${pDate} 10:30:00`;
              const isCash =
                String(pn.paymentMethod || '').toLowerCase() === 'cash' ||
                String(pn.paymentMethod || '').toLowerCase().includes('tiền mặt');
              const debitAcc = isCash ? '1111' : '1121';
              const debitName = isCash ? 'Tiền Việt Nam (Tiền mặt quỹ)' : 'Tiền gửi ngân hàng (VND)';
              const partnerName = pn.customerName || 'Khách hàng';
              const desc = ordCode
                ? `Khách hàng trả tiền trước / đặt cọc đơn hàng ${ordCode} - ${partnerName}`
                : `Khách hàng trả tiền trước (Ứng trước) theo phiếu ${ptCode} - ${partnerName}`;
              const entryId = `JE-CUST-PREP-${ptCode.replace(/[^a-zA-Z0-9-]/g, '')}-${idx}`;

              insertEntryStmt.run(
                entryId,
                `PKT-${ptCode}`,
                pDate,
                pDate,
                ordCode || ptCode,
                'SALES',
                'Bán hàng',
                desc,
                amt,
                'Kế toán thanh toán',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                debitAcc,
                debitAcc,
                debitName,
                'DEBIT',
                amt,
                desc,
                partnerName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                '131',
                '131',
                'Phải thu của khách hàng (Khách hàng trả tiền trước)',
                'CREDIT',
                amt,
                `Nhận tiền ứng trước / đặt cọc từ khách hàng ${partnerName}`,
                partnerName
              );

              syncedCount++;
            });

            (prepaidSaleOrders || []).forEach((so, idx) => {
              const ordCode = String(so.code || '').trim();
              if (!ordCode) return;
              const paidAmt = Math.round(Number(so.daThanhToan) || 0);
              const totalAmt = Math.round(Number(so.tongTien) || 0);
              const pDate = normalizeDate('', ordCode);
              const createdAtStr = `${pDate} 10:45:00`;
              const partnerName = so.customerName || so.nguoiNhan || 'Khách hàng';

              // 1. Bút toán khách hàng trả tiền trước (nếu chưa có từ PaymentNotification hoặc JournalEntry)
              if (paidAmt > 0 && !existingOrderPrepaymentCodes.has(ordCode)) {
                existingOrderPrepaymentCodes.add(ordCode);
                const prepId = `JE-SO-PREP-${ordCode.replace(/[^a-zA-Z0-9-]/g, '')}-${idx}`;
                const desc = `Khách hàng trả tiền trước / đặt cọc đơn hàng ${ordCode} - ${partnerName}`;

                insertEntryStmt.run(
                  prepId,
                  `PKT-PT-${ordCode}`,
                  pDate,
                  pDate,
                  ordCode,
                  'SALES',
                  'Bán hàng',
                  desc,
                  paidAmt,
                  'Kế toán thanh toán',
                  createdAtStr,
                  createdAtStr
                );

                insertLineStmt.run(
                  `${prepId}-L1`,
                  prepId,
                  1,
                  '1121',
                  '1121',
                  'Tiền gửi ngân hàng (VND)',
                  'DEBIT',
                  paidAmt,
                  desc,
                  partnerName
                );

                insertLineStmt.run(
                  `${prepId}-L2`,
                  prepId,
                  2,
                  '131',
                  '131',
                  'Phải thu của khách hàng (Khách hàng trả tiền trước)',
                  'CREDIT',
                  paidAmt,
                  `Nhận tiền khách hàng trả trước đơn ${ordCode} - ${partnerName}`,
                  partnerName
                );

                syncedCount++;
              }

              // 2. Bút toán ghi nhận doanh thu / công nợ đơn hàng (nếu đơn đã duyệt và chưa có bút toán doanh thu)
              if (
                totalAmt > 0 &&
                (so.trangThai === 'approved' || so.trangThai === 'completed' || so.keToanDuyet === 'approved') &&
                !existingOrderRevenueCodes.has(ordCode)
              ) {
                existingOrderRevenueCodes.add(ordCode);
                const revId = `JE-SO-REV-${ordCode.replace(/[^a-zA-Z0-9-]/g, '')}-${idx}`;
                const desc = `Ghi nhận doanh thu bán hàng đơn ${ordCode} - ${partnerName}`;

                insertEntryStmt.run(
                  revId,
                  `PKT-DT-${ordCode}`,
                  pDate,
                  pDate,
                  ordCode,
                  'SALES',
                  'Bán hàng',
                  desc,
                  totalAmt,
                  'Kế toán tổng hợp',
                  createdAtStr,
                  createdAtStr
                );

                insertLineStmt.run(
                  `${revId}-L1`,
                  revId,
                  1,
                  '131',
                  '131',
                  'Phải thu của khách hàng',
                  'DEBIT',
                  totalAmt,
                  desc,
                  partnerName
                );

                insertLineStmt.run(
                  `${revId}-L2`,
                  revId,
                  2,
                  '5112',
                  '5112',
                  'Doanh thu bán thành phẩm',
                  'CREDIT',
                  totalAmt,
                  `Doanh thu bán hàng đơn ${ordCode} - ${partnerName}`,
                  partnerName
                );

                syncedCount++;
              }
            });

            // ==========================================
            // G. ĐỒNG BỘ TIỀN LƯƠNG, BẢO HIỂM BẮT BUỘC & KHẤU TRỪ TẠM ỨNG VÀO LƯƠNG (TK 334, 338, 642, 141)
            // ==========================================
            (payrollSummaries || []).forEach((ps) => {
              const yr = String(ps.year || new Date().getFullYear());
              const mo = String(ps.month || new Date().getMonth() + 1).padStart(2, '0');
              const pMonth = ps.payroll_month ? String(ps.payroll_month).trim() : `${yr}-${mo}`;
              if (!pMonth) return;
              const compactMonth = pMonth.replace(/[^0-9]/g, '');
              const empCount = Number(ps.emp_cnt || ps.emp_count) || 0;
              const totalGross = Math.round(Number(ps.total_gross) || 0);
              const totalEmpIns = Math.round(Number(ps.total_emp_ins) || 0);
              const totalCorpIns = Math.round(Number(ps.total_corp_ins) || 0);
              const totalTax = Math.round(Number(ps.total_tax) || 0);
              const totalAdvDed = Math.round(Number(ps.total_adv_ded) || 0);

              const nowIso = new Date().toISOString().slice(0, 10);
              const currentMonthIso = nowIso.slice(0, 7);
              const lastDay = yr && mo ? new Date(Number(yr), Number(mo), 0).getDate() : 28;
              const entryDate = pMonth === currentMonthIso ? nowIso : `${pMonth}-${String(lastDay).padStart(2, '0')}`;
              const createdAtStr = `${entryDate} 17:30:00`;

              // G1. Hạch toán chi phí tiền lương phải trả NLĐ: Nợ TK 642 / Có TK 334
              const salEntryNo = `PKT-LUONG-${compactMonth}`;
              if (totalGross > 0 && !existingCodes.has(salEntryNo)) {
                const salId = `JE-HR-SAL-${compactMonth}`;
                const salDesc = `Hạch toán chi phí tiền lương & phụ cấp tháng ${mo}/${yr} (${empCount} nhân sự)`;
                insertEntryStmt.run(
                  salId,
                  salEntryNo,
                  entryDate,
                  entryDate,
                  `BL-${compactMonth}`,
                  'HR',
                  'Tiền lương & BHXH',
                  salDesc,
                  totalGross,
                  'Kế toán tiền lương',
                  createdAtStr,
                  createdAtStr
                );
                insertLineStmt.run(
                  `${salId}-L1`,
                  salId,
                  1,
                  '642',
                  '642',
                  'Chi phí quản lý doanh nghiệp',
                  'DEBIT',
                  totalGross,
                  salDesc,
                  `Tập thể CBNV (${empCount} NS)`
                );
                insertLineStmt.run(
                  `${salId}-L2`,
                  salId,
                  2,
                  '334',
                  '334',
                  'Phải trả người lao động',
                  'CREDIT',
                  totalGross,
                  `Phải trả lương & phụ cấp kỳ ${mo}/${yr}`,
                  `Tập thể CBNV (${empCount} NS)`
                );
                existingCodes.add(salEntryNo);
                syncedCount++;
              }

              // G2. Hạch toán trích BHXH, BHYT, BHTN bắt buộc (DN đóng 21.5% + NLĐ đóng 10.5%): Nợ 642, Nợ 334 / Có 338
              const totalIns = totalCorpIns + totalEmpIns;
              const insEntryNo = `PKT-BHXH-${compactMonth}`;
              if (totalIns > 0 && !existingCodes.has(insEntryNo)) {
                const insId = `JE-HR-INS-${compactMonth}`;
                const insDesc = `Trích BHXH, BHYT, BHTN bắt buộc tháng ${mo}/${yr} (DN đóng 21.5% + Khấu trừ lương NLĐ 10.5%)`;
                insertEntryStmt.run(
                  insId,
                  insEntryNo,
                  entryDate,
                  entryDate,
                  `BHXH-${compactMonth}`,
                  'HR',
                  'Tiền lương & BHXH',
                  insDesc,
                  totalIns,
                  'Kế toán tiền lương',
                  createdAtStr,
                  createdAtStr
                );
                let lineIdx = 1;
                if (totalCorpIns > 0) {
                  insertLineStmt.run(
                    `${insId}-L${lineIdx}`,
                    insId,
                    lineIdx++,
                    '642',
                    '642',
                    'Chi phí quản lý doanh nghiệp',
                    'DEBIT',
                    totalCorpIns,
                    `Chi phí BHXH, BHYT, BHTN doanh nghiệp đóng (21.5%) kỳ ${mo}/${yr}`,
                    'Cơ quan BHXH'
                  );
                }
                if (totalEmpIns > 0) {
                  insertLineStmt.run(
                    `${insId}-L${lineIdx}`,
                    insId,
                    lineIdx++,
                    '334',
                    '334',
                    'Phải trả người lao động',
                    'DEBIT',
                    totalEmpIns,
                    `Khấu trừ BHXH, BHYT, BHTN vào lương NLĐ (10.5%) kỳ ${mo}/${yr}`,
                    'Cơ quan BHXH'
                  );
                }
                insertLineStmt.run(
                  `${insId}-L${lineIdx}`,
                  insId,
                  lineIdx,
                  '338',
                  '338',
                  'Phải trả, phải nộp khác (BHXH, BHYT, BHTN)',
                  'CREDIT',
                  totalIns,
                  `Phải nộp BHXH, BHYT, BHTN bắt buộc kỳ ${mo}/${yr}`,
                  'Cơ quan BHXH'
                );
                existingCodes.add(insEntryNo);
                syncedCount++;
              }

              // G3. Hạch toán thuế TNCN khấu trừ tại nguồn (nếu có): Nợ TK 334 / Có TK 3335
              const taxEntryNo = `PKT-TNCN-${compactMonth}`;
              if (totalTax > 0 && !existingCodes.has(taxEntryNo)) {
                const taxId = `JE-HR-TAX-${compactMonth}`;
                const taxDesc = `Khấu trừ thuế TNCN tại nguồn kỳ lương tháng ${mo}/${yr}`;
                insertEntryStmt.run(
                  taxId,
                  taxEntryNo,
                  entryDate,
                  entryDate,
                  `TNCN-${compactMonth}`,
                  'HR',
                  'Tiền lương & BHXH',
                  taxDesc,
                  totalTax,
                  'Kế toán tiền lương',
                  createdAtStr,
                  createdAtStr
                );
                insertLineStmt.run(
                  `${taxId}-L1`,
                  taxId,
                  1,
                  '334',
                  '334',
                  'Phải trả người lao động',
                  'DEBIT',
                  totalTax,
                  taxDesc,
                  'Cơ quan Thuế'
                );
                insertLineStmt.run(
                  `${taxId}-L2`,
                  taxId,
                  2,
                  '3335',
                  '3335',
                  'Thuế thu nhập cá nhân',
                  'CREDIT',
                  totalTax,
                  taxDesc,
                  'Cơ quan Thuế'
                );
                existingCodes.add(taxEntryNo);
                syncedCount++;
              }

              // G4. Hạch toán khấu trừ tạm ứng vào lương (đối với các khoản tạm ứng đã thực chi): Nợ TK 334 / Có TK 141
              const advDedEntryNo = `PKT-KTTU-${compactMonth}`;
              if (totalAdvDed > 0 && !existingCodes.has(advDedEntryNo)) {
                const advDedId = `JE-HR-ADVDED-${compactMonth}`;
                const advDedDesc = `Khấu trừ khoản tạm ứng đã chi vào lương nhân viên kỳ ${mo}/${yr}`;
                insertEntryStmt.run(
                  advDedId,
                  advDedEntryNo,
                  entryDate,
                  entryDate,
                  `KTTU-${compactMonth}`,
                  'HR',
                  'Tiền lương & BHXH',
                  advDedDesc,
                  totalAdvDed,
                  'Kế toán tiền lương',
                  createdAtStr,
                  createdAtStr
                );
                insertLineStmt.run(
                  `${advDedId}-L1`,
                  advDedId,
                  1,
                  '334',
                  '334',
                  'Phải trả người lao động',
                  'DEBIT',
                  totalAdvDed,
                  advDedDesc,
                  `Tập thể CBNV (${empCount} NS)`
                );
                insertLineStmt.run(
                  `${advDedId}-L2`,
                  advDedId,
                  2,
                  '141',
                  '141',
                  'Tạm ứng nhân viên',
                  'CREDIT',
                  totalAdvDed,
                  `Thu hồi tạm ứng qua khấu trừ lương kỳ ${mo}/${yr}`,
                  `Tập thể CBNV (${empCount} NS)`
                );
                existingCodes.add(advDedEntryNo);
                syncedCount++;
              }
            });

            // ==========================================
            // H. ĐỒNG BỘ PHIẾU CHI CHI PHÍ HOẠT ĐỘNG, CHI LƯƠNG & NỘP BẢO HIỂM TRỰC TIẾP (TK 641, 642, 627, 635, 334, 338, 341)
            // ==========================================
            (expenseAndHrVouchers || []).forEach((v, idx) => {
              const vCode = String(v.voucher_code || '').trim();
              const refCode = String(v.reference_code || vCode).trim();
              if (!vCode || existingCodes.has(vCode) || (refCode && existingCodes.has(refCode))) return;
              const amt = Math.round(Number(v.amount) || 0);
              if (amt <= 0) return;

              const debitAcc = String(v.debit_account || '642').trim();
              const creditAcc =
                String(v.credit_account || '').trim() ||
                (v.payment_method === 'cash' ? '1111' : '1121');
              const accountNameMap = {
                '641': 'Chi phí bán hàng',
                '642': 'Chi phí quản lý doanh nghiệp',
                '627': 'Chi phí sản xuất chung',
                '632': 'Giá vốn hàng bán',
                '635': 'Chi phí tài chính (Lãi vay)',
                '334': 'Phải trả người lao động',
                '338': 'Phải trả, phải nộp khác (BHXH, BHYT, BHTN)',
                '341': 'Vay và nợ thuê tài chính',
                '1111': 'Tiền mặt tại quỹ (VNĐ)',
                '1121': 'Tiền gửi Ngân hàng (VNĐ)',
              };
              const debitName = accountNameMap[debitAcc] || `Tài khoản ${debitAcc}`;
              const creditName = accountNameMap[creditAcc] || (creditAcc === '1111' ? 'Tiền mặt tại quỹ (VNĐ)' : 'Tiền gửi Ngân hàng (VNĐ)');
              const isHrVoucher = debitAcc.startsWith('334') || debitAcc.startsWith('338');
              const srcModule = isHrVoucher ? 'HR' : 'CASH';
              const srcLabel = isHrVoucher ? 'Tiền lương & BHXH' : 'Chi phí hoạt động';

              const entryId = `JE-EXP-${v.id || idx + 1}`;
              const entryNo = `PKT-CP-${vCode}`;
              const vDate = normalizeDate(v.date || v.voucher_date, vCode);
              const partnerName = v.partner_name || v.target_name || v.payer_receiver_name || 'Đối tác / Nội bộ';
              const desc = v.reason || v.description || `Chi phí hoạt động theo phiếu ${vCode} - ${partnerName}`;
              const createdAtStr =
                v.created_at && String(v.created_at).includes(':')
                  ? String(v.created_at)
                  : `${vDate} 14:00:00`;

              insertEntryStmt.run(
                entryId,
                entryNo,
                vDate,
                vDate,
                refCode || vCode,
                srcModule,
                srcLabel,
                desc,
                amt,
                v.creator || v.created_by || 'Kế toán thanh toán',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                debitAcc,
                debitAcc,
                debitName,
                'DEBIT',
                amt,
                desc,
                partnerName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                creditAcc,
                creditAcc,
                creditName,
                'CREDIT',
                amt,
                desc,
                partnerName
              );

              existingCodes.add(vCode);
              if (refCode) existingCodes.add(refCode);
              syncedCount++;
            });

            // ==========================================
            // I. ĐỒNG BỘ CHI PHÍ VẬN CHUYỂN GIAO HÀNG (LogisticsShipment -> Nợ TK 641 / Có TK 331)
            // ==========================================
            (shipmentFees || []).forEach((sh, idx) => {
              const tCode = String(sh.trackingCode || '').trim();
              if (!tCode || existingCodes.has(tCode)) return;
              const fee = Math.round(Number(sh.shippingFee) || 0);
              if (fee <= 0) return;

              const entryId = `JE-SHIP-${sh.id || idx + 1}`;
              const entryNo = `PKT-VC-${tCode}`;
              const shDate = sh.createdAt
                ? (/^\d+$/.test(String(sh.createdAt))
                    ? new Date(Number(sh.createdAt)).toISOString().slice(0, 10)
                    : normalizeDate(sh.createdAt, tCode))
                : normalizeDate(null, tCode);
              const partnerName = sh.resolvedCarrierName || sh.carrierName || 'Đơn vị vận chuyển';
              const ordPart = sh.orderCode ? ` (Đơn ${sh.orderCode})` : '';
              const desc = `Chi phí vận chuyển giao hàng vận đơn ${tCode}${ordPart} - ${partnerName}`;
              const createdAtStr = `${shDate} 16:15:00`;

              insertEntryStmt.run(
                entryId,
                entryNo,
                shDate,
                shDate,
                tCode,
                'LOGISTICS',
                'Vận chuyển & Giao vận',
                desc,
                fee,
                'Kế toán công nợ',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '641',
                '641',
                'Chi phí bán hàng (Vận chuyển)',
                'DEBIT',
                fee,
                desc,
                partnerName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                '331',
                '331',
                'Phải trả cho người bán (ĐV vận chuyển)',
                'CREDIT',
                fee,
                desc,
                partnerName
              );

              existingCodes.add(tCode);
              syncedCount++;
            });

            // ==========================================
            // I2. ĐỒNG BỘ CHI PHÍ VẬN CHUYỂN HÀNG MUA NHẬP KHO (PurchaseOrder -> Nợ TK 156 / Có TK 331)
            // ==========================================
            (poShippingFees || []).forEach((po, idx) => {
              const poCode = String(po.code || '').trim();
              const vCode = `${poCode}-VC`;
              if (!poCode || existingCodes.has(vCode)) return;
              const fee = Math.round(Number(po.shippingFee) || 0);
              if (fee <= 0) return;

              const entryId = `JE-PO-SHIP-${po.id || idx + 1}`;
              const entryNo = `PKT-VC-${poCode}`;
              const poDate = po.ngayNhan
                ? (/^\d+$/.test(String(po.ngayNhan))
                    ? new Date(Number(po.ngayNhan)).toISOString().slice(0, 10)
                    : normalizeDate(po.ngayNhan, poCode))
                : (po.createdAt
                    ? (/^\d+$/.test(String(po.createdAt))
                        ? new Date(Number(po.createdAt)).toISOString().slice(0, 10)
                        : normalizeDate(po.createdAt, poCode))
                    : normalizeDate(null, poCode));
              const carrierName = po.resolvedCarrierName || 'Đơn vị vận chuyển';
              const suppPart = po.resolvedSupplierName ? ` (NCC: ${po.resolvedSupplierName})` : '';
              const depotPart = po.shippingDepot ? ` • Bến bãi: ${po.shippingDepot}` : '';
              const desc = `Chi phí vận chuyển hàng mua nhập kho đơn ${poCode}${suppPart}${depotPart} - ${carrierName}`;
              const createdAtStr = `${poDate} 16:20:00`;

              insertEntryStmt.run(
                entryId,
                entryNo,
                poDate,
                poDate,
                vCode,
                'KHO_VAN',
                'Kho vận',
                desc,
                fee,
                'Kế toán công nợ',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '156',
                '156',
                'Hàng hóa (Chi phí thu mua)',
                'DEBIT',
                fee,
                desc,
                carrierName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                '331',
                '331',
                'Phải trả cho người bán (ĐV vận chuyển)',
                'CREDIT',
                fee,
                desc,
                carrierName
              );

              existingCodes.add(vCode);
              existingCodes.add(entryNo);
              syncedCount++;
            });

            // ==========================================
            // J. ĐỒNG BỘ GIẢI NGÂN VỐN VAY NGÂN HÀNG (bank_loan_drawdowns -> Nợ TK 1121 / Có TK 341)
            // ==========================================
            (loanDrawdowns || []).forEach((ld, idx) => {
              const dCode = String(ld.drawdown_code || ld.contract_code || '').trim();
              if (!dCode || existingCodes.has(dCode)) return;
              const amt = Math.round(Number(ld.amount) || 0);
              if (amt <= 0) return;

              const entryId = `JE-LOAN-${ld.id || idx + 1}`;
              const entryNo = `PKT-VAY-${dCode}`;
              const dDate = normalizeDate(ld.drawdown_date, dCode);
              const bankName = ld.bank_name || 'Ngân hàng thương mại';
              const desc = `Giải ngân khế ước vay vốn ${dCode}${ld.contract_code ? ` (HĐ ${ld.contract_code})` : ''} - ${bankName}${ld.purpose ? `: ${ld.purpose}` : ''}`;
              const createdAtStr = `${dDate} 10:00:00`;

              insertEntryStmt.run(
                entryId,
                entryNo,
                dDate,
                dDate,
                dCode,
                'CASH',
                'Tín dụng & Vay vốn',
                desc,
                amt,
                'Kế toán ngân hàng',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '1121',
                '1121',
                'Tiền gửi Ngân hàng (VNĐ)',
                'DEBIT',
                amt,
                desc,
                bankName
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                '341',
                '341',
                'Vay và nợ thuê tài chính',
                'CREDIT',
                amt,
                desc,
                bankName
              );

              existingCodes.add(dCode);
              syncedCount++;
            });

            // ==========================================
            // K. ĐỒNG BỘ XUẤT KHO VẬT TƯ CẤP PHÁT CHO SẢN XUẤT (Nợ TK 154 / Có TK 152)
            // ==========================================
            (materialTickets || []).forEach((mt, idx) => {
              const tCode = String(mt.code || '').trim();
              if (!tCode || existingCodes.has(tCode)) return;
              const cost = Math.round(Number(mt.totalCost) || 0);
              if (cost <= 0) return;

              const entryId = `JE-MAT-EXP-${mt.id || idx + 1}`;
              const entryNo = `PKT-XKVT-${tCode}`;
              const entryDate = normalizeDate(mt.completedAt || mt.createdAt, tCode);
              const orderRef = mt.saleOrderCode || tCode;
              const desc = `Xuất kho vật tư cấp phát sản xuất theo lệnh ${tCode} (${orderRef})`;
              const createdAtStr = `${entryDate} 08:30:00`;

              insertEntryStmt.run(
                entryId,
                entryNo,
                entryDate,
                entryDate,
                tCode,
                'LOGISTICS',
                'Xuất kho sản xuất',
                desc,
                cost,
                'Thủ kho vật tư',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '154',
                '154',
                'Chi phí sản xuất kinh doanh dở dang',
                'DEBIT',
                cost,
                desc,
                'Xưởng sản xuất'
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                '152',
                '152',
                'Nguyên liệu, vật liệu',
                'CREDIT',
                cost,
                desc,
                'Kho vật tư'
              );

              existingCodes.add(tCode);
              syncedCount++;
            });

            // ==========================================
            // L. ĐỒNG BỘ NHẬP KHO THÀNH PHẨM SẢN XUẤT ĐẠT CHUẨN QC (Nợ TK 155 / Có TK 154)
            // ==========================================
            (qcInspections || []).forEach((qc, idx) => {
              const qCode = String(qc.code || '').trim();
              if (!qCode || existingCodes.has(qCode)) return;
              let val = Math.round(Number(qc.totalValue) || 0);
              if (val <= 0) {
                try {
                  const m = typeof qc.metadata === 'string' ? JSON.parse(qc.metadata) : qc.metadata;
                  const qty = Number(m?.totalQuantity) || 10;
                  val = qty * 400000;
                } catch {
                  val = 1500000;
                }
              }
              if (val <= 0) return;

              const entryId = `JE-PROD-IN-${qc.id || idx + 1}`;
              const entryNo = `PKT-NKTP-${qCode}`;
              const entryDate = normalizeDate(qc.executionTime || qc.createdAt, qCode);
              const desc = `Nhập kho thành phẩm sản xuất đạt chuẩn QC ${qCode} - ${qc.productName || 'Thành phẩm'}`;
              const createdAtStr = `${entryDate} 16:30:00`;

              insertEntryStmt.run(
                entryId,
                entryNo,
                entryDate,
                entryDate,
                qCode,
                'LOGISTICS',
                'Nhập kho thành phẩm',
                desc,
                val,
                'Thủ kho thành phẩm',
                createdAtStr,
                createdAtStr
              );

              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                '155',
                '155',
                'Thành phẩm',
                'DEBIT',
                val,
                desc,
                'Kho thành phẩm'
              );

              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                '154',
                '154',
                'Chi phí sản xuất kinh doanh dở dang',
                'CREDIT',
                val,
                desc,
                'Xưởng sản xuất'
              );

              existingCodes.add(qCode);
              syncedCount++;
            });

            insertEntryStmt.finalize();
            insertLineStmt.finalize((finErr) => {
              if (finErr) return reject(finErr);
              resolve({
                success: true,
                syncedCount,
              });
            });
          }
        );
      });
    } catch (err) {
      reject(err);
    }
  });
}
