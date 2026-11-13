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
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM debt_receivables', [], (recErr, receivables) => {
      if (recErr) return reject(recErr);

      db.all('SELECT * FROM debt_payables', [], (payErr, payables) => {
        if (payErr) return reject(payErr);

        db.all("SELECT * FROM Debt WHERE referenceId LIKE 'DS-%'", [], (_dsErr, dsDebts) => {
          db.serialize(() => {
          db.run('PRAGMA foreign_keys = OFF');

          // 1. Xóa sạch toàn bộ các bút toán JE-% tự sinh cũ (bao gồm dữ liệu rác ngành cửa gỗ CNPT001...)
          db.run(`
            DELETE FROM accounting_journal_lines
            WHERE id LIKE 'JE-%'
               OR entry_id LIKE 'JE-%'
               OR entry_id IN (
                 SELECT id FROM accounting_journal_entries
                 WHERE id LIKE 'JE-%'
                    OR description LIKE '%cửa công trình%'
                    OR description LIKE '%cửa gỗ%'
                    OR description LIKE '%Gỗ sấy%'
               )
          `);

          db.run(`
            DELETE FROM accounting_journal_entries
            WHERE id LIKE 'JE-%'
               OR description LIKE '%cửa công trình%'
               OR description LIKE '%cửa gỗ%'
               OR description LIKE '%Gỗ sấy%'
          `);

          // 2. Lấy danh sách các mã chứng từ gốc đã có sẵn trong Sổ nhật ký chung từ Prisma JournalEntry
          db.all(
            'SELECT entry_number, reference_code FROM accounting_journal_entries',
            [],
            (exErr, existingRows) => {
              const existingCodes = new Set();
              (existingRows || []).forEach((r) => {
                if (r.entry_number) existingCodes.add(String(r.entry_number).trim());
                if (r.reference_code) existingCodes.add(String(r.reference_code).trim());
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
              // A. ĐỒNG BỘ CHỨNG TỪ ĐỐI SOÁT (DS-...) & PHIẾU THU MỚI TỪ CÔNG NỢ PHẢI THU
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
                    // Chỉ bổ sung vào Sổ nhật ký chung các chứng từ Đối soát (DS-...) hoặc Phiếu thu mới lập trong ngày chưa có trong JournalEntry
                    const pDate = normalizeDate(p.date || ent.date, pCode);
                    if (!isRecon && pDate < '2026-11-11') return;

                    const rawAmt = Math.round(Number(p.amount ?? p.paidAmount) || 0);
                    const absAmt = Math.abs(rawAmt);
                    if (absAmt <= 0) return;

                    existingCodes.add(pCode);
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

                      insertEntryStmt.run(
                        payEntryId,
                        pCode,
                        pDate,
                        pDate,
                        entCode || rec.code,
                        'SALES',
                        'Bán hàng',
                        p.title || `Thu tiền khách hàng - ${rec.customer_name}`,
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
                        p.title || `Thu tiền theo phiếu ${pCode}`,
                        rec.customer_name
                      );

                      insertLineStmt.run(
                        `${payEntryId}-L2`,
                        payEntryId,
                        2,
                        '131',
                        '131',
                        'Phải thu của khách hàng',
                        'CREDIT',
                        absAmt,
                        `Thu hồi công nợ khách hàng ${rec.customer_name}`,
                        rec.customer_name
                      );

                      syncedCount++;
                    }
                  });
                });
              });

              // ==========================================
              // B. ĐỒNG BỘ CHỨNG TỪ ĐỐI SOÁT (DS-...) & PHIẾU CHI / ĐƠN MUA MỚI TỪ CÔNG NỢ PHẢI TRẢ
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
                  const isPayment =
                    !isRecon &&
                    !peCode.startsWith('DH-') &&
                    !peCode.startsWith('PO-') &&
                    (pe.type === 'payment' ||
                      pe.voucherType === 'payment' ||
                      pe.statusLabel === 'Đã chi tiền' ||
                      peCode.startsWith('PC-') ||
                      peCode.startsWith('UNC-'));

                  const pDate = normalizeDate(pe.date || pe.dueDate, peCode);
                  const peTime = String(pe.time || '08:30').trim();
                  const peCreatedAtStr = peTime.length === 5 ? `${pDate} ${peTime}:00` : `${pDate} ${peTime}`;
                  // Bỏ qua các chứng từ lịch sử trước 11/11/2026 đã có trong Prisma JournalEntry
                  if (!isRecon && pDate < '2026-11-11') return;

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

                    insertEntryStmt.run(
                      disbEntryId,
                      peCode,
                      pDate,
                      pDate,
                      peCode,
                      'CASH',
                      'Quỹ và Ngân hàng',
                      pe.title || `Thanh toán NCC - ${pay.supplier_name}`,
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
                      'Phải trả cho người bán (Nhà cung cấp)',
                      'DEBIT',
                      pAmount,
                      pe.title || `Thanh toán công nợ NCC ${pay.supplier_name}`,
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
                        ? `Chi tiền mặt thanh toán cho ${pay.supplier_name}`
                        : `Chuyển khoản ngân hàng thanh toán cho ${pay.supplier_name}`,
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
        });
      });
    });
  });
}
