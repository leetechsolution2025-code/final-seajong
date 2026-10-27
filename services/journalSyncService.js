/**
 * Service đồng bộ dữ liệu thời gian thực giữa:
 * 1. Quản lý chi phí (financial_expenses)
 * 2. Quản lý công nợ phải thu (debt_receivables)
 * 3. Quản lý công nợ phải trả (debt_payables)
 * với Sổ nhật ký chung (accounting_journal_entries và accounting_journal_lines)
 * theo chuẩn mực kế toán Việt Nam (Thông tư 200/2014/TT-BTC)
 */

export function normalizeDate(d) {
  if (!d) return '2026-10-10';
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

/**
 * Đồng bộ toàn bộ Chi phí, Công nợ phải thu và Công nợ phải trả vào Sổ nhật ký chung
 */
export async function syncAllSubledgersToJournal(db) {
  return new Promise((resolve, reject) => {
    // 1. Lấy toàn bộ dữ liệu từ 3 phân hệ
    db.all('SELECT * FROM financial_expenses', [], (expErr, expenses) => {
      if (expErr) return reject(expErr);

      db.all('SELECT * FROM debt_receivables', [], (recErr, receivables) => {
        if (recErr) return reject(recErr);

        db.all('SELECT * FROM debt_payables', [], (payErr, payables) => {
          if (payErr) return reject(payErr);

          db.all('SELECT * FROM fixed_assets', [], (faErr, assets) => {
            if (faErr) console.warn('Lỗi lấy fixed_assets để đồng bộ khấu hao:', faErr.message);

            db.serialize(() => {
              // Xóa các bút toán đã được đồng bộ tự động trước đó để ghi đè cập nhật mới nhất
              db.run(`
                DELETE FROM accounting_journal_lines 
                WHERE entry_id IN (
                  SELECT id FROM accounting_journal_entries 
                  WHERE id LIKE 'JE-EXP-%' OR id LIKE 'JE-REC-%' OR id LIKE 'JE-PAY-%' OR id LIKE 'JE-DEP-%'
                )
              `);

              db.run(`
                DELETE FROM accounting_journal_entries 
                WHERE id LIKE 'JE-EXP-%' OR id LIKE 'JE-REC-%' OR id LIKE 'JE-PAY-%' OR id LIKE 'JE-DEP-%'
              `);

            const insertEntryStmt = db.prepare(`
              INSERT OR REPLACE INTO accounting_journal_entries (
                id, entry_number, entry_date, document_date, reference_code,
                source_module, source_label, description, total_amount,
                status, status_label, created_by, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'Đã ghi sổ', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);

            const insertLineStmt = db.prepare(`
              INSERT INTO accounting_journal_lines (
                id, entry_id, line_number, account_id, account_code,
                account_name, type, amount, description, partner, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);

            let syncedCount = 0;

            // ==========================================
            // 1. ĐỒNG BỘ CHI PHÍ (EXPENSES)
            // ==========================================
            (expenses || []).forEach((exp) => {
              const entryId = `JE-EXP-${exp.id}`;
              const entryDate = normalizeDate(exp.spend_date);
              const amount = Number(exp.amount) || 0;
              if (amount <= 0) return;

              let debitAccCode = exp.debit_account || '642';
              let debitAccName = exp.debit_account_name || 'Chi phí quản lý doanh nghiệp';
              const titleLower = (exp.title || '').toLowerCase();

              if (!exp.debit_account) {
                if (exp.category === 'sales') {
                  debitAccCode = '641';
                  debitAccName = 'Chi phí bán hàng và vận chuyển';
                } else if (exp.category === 'administrative') {
                  debitAccCode = '642';
                  debitAccName = 'Chi phí quản lý doanh nghiệp';
                } else if (exp.category === 'finance') {
                  debitAccCode = '635';
                  debitAccName = 'Chi phí tài chính (Lãi vay và phí ngân hàng)';
                } else {
                  // production
                  if (titleLower.includes('máy') || titleLower.includes('bảo dưỡng') || titleLower.includes('điện') || titleLower.includes('xưởng')) {
                    debitAccCode = '627';
                    debitAccName = 'Chi phí sản xuất chung';
                  } else {
                    debitAccCode = '621';
                    debitAccName = 'Chi phí nguyên liệu, vật liệu trực tiếp';
                  }
                }
              }

              let creditAccCode = exp.credit_account || '1111';
              let creditAccName = exp.credit_account_name || 'Tiền Việt Nam (Tiền mặt quỹ)';
              if (!exp.credit_account) {
                if (exp.category === 'finance' || (exp.code && exp.code.startsWith('UNC')) || amount >= 100000000) {
                  creditAccCode = '1121';
                  creditAccName = 'Tiền gửi ngân hàng (VND - Vietcombank)';
                }
              }

              insertEntryStmt.run(
                entryId,
                exp.code,
                entryDate,
                entryDate,
                exp.code,
                'CASH',
                'Chi phí',
                exp.title,
                amount,
                exp.spender || exp.department || 'Phòng Kế toán'
              );

              // Dòng Nợ
              insertLineStmt.run(
                `${entryId}-L1`,
                entryId,
                1,
                debitAccCode,
                debitAccCode,
                debitAccName,
                'DEBIT',
                amount,
                exp.title,
                exp.spender || exp.department || 'Deco Door'
              );

              // Dòng Có
              insertLineStmt.run(
                `${entryId}-L2`,
                entryId,
                2,
                creditAccCode,
                creditAccCode,
                creditAccName,
                'CREDIT',
                amount,
                creditAccCode === '1121' ? 'Chuyển khoản Vietcombank thanh toán' : 'Chi tiền mặt theo phiếu chi',
                creditAccCode === '1121' ? 'Ngân hàng TMCP Ngoại Thương VN (VCB)' : 'Thủ quỹ Deco Door'
              );

              syncedCount++;
            });

            // ==========================================
            // 2. ĐỒNG BỘ CÔNG NỢ PHẢI THU (RECEIVABLES)
            // ==========================================
            (receivables || []).forEach((rec) => {
              const contractVal = Number(rec.contract_value) || 0;
              const paidVal = Number(rec.paid_amount) || 0;
              const recDate = normalizeDate(rec.created_at || rec.due_date);

              // A. Bút toán ghi nhận Doanh thu bán hàng và Công nợ phải thu (Sales)
              if (contractVal > 0) {
                const saleEntryId = `JE-REC-SALE-${rec.id}`;
                const saleEntryNum = `PKT-BH-${(rec.code || '').replace(/[^a-zA-Z0-9]/g, '')}`;
                const netRevenue = Math.round(contractVal / 1.1);
                const vat = contractVal - netRevenue;

                insertEntryStmt.run(
                  saleEntryId,
                  saleEntryNum,
                  recDate,
                  recDate,
                  rec.code,
                  'SALES',
                  'Bán hàng',
                  `Nghiệm thu, xuất bán thành phẩm cửa công trình ${rec.project_name || rec.customer_name}`,
                  contractVal,
                  rec.manager_name || 'Phòng Kinh doanh'
                );

                // Dòng Nợ 131
                insertLineStmt.run(
                  `${saleEntryId}-L1`,
                  saleEntryId,
                  1,
                  '131',
                  '131',
                  'Phải thu của khách hàng',
                  'DEBIT',
                  contractVal,
                  `Tổng giá trị nghiệm thu đợt bàn giao theo ${rec.code}`,
                  rec.customer_name
                );

                // Dòng Có 5112
                insertLineStmt.run(
                  `${saleEntryId}-L2`,
                  saleEntryId,
                  2,
                  '5112',
                  '5112',
                  'Doanh thu bán thành phẩm cửa',
                  'CREDIT',
                  netRevenue,
                  `Doanh thu xuất xưởng cửa gỗ công trình ${rec.project_name || ''}`,
                  rec.customer_name
                );

                // Dòng Có 3331
                insertLineStmt.run(
                  `${saleEntryId}-L3`,
                  saleEntryId,
                  3,
                  '3331',
                  '3331',
                  'Thuế GTGT đầu ra phải nộp',
                  'CREDIT',
                  vat,
                  `Thuế GTGT 10% theo hợp đồng ${rec.code}`,
                  'Cơ quan Thuế'
                );

                syncedCount++;
              }

              // B. Bút toán Thu hồi nợ / Khách hàng thanh toán tiền (Receipts)
              let entriesList = [];
              try {
                entriesList = JSON.parse(rec.entries_json || '[]');
              } catch {
                entriesList = [];
              }

              if (Array.isArray(entriesList) && entriesList.length > 0) {
                entriesList.forEach((pe, pIdx) => {
                  const pAmount = Number(pe.paidAmount) || 0;
                  if (pAmount <= 0) return;

                  const payEntryId = `JE-REC-PAY-${rec.id}-${pe.id || pIdx}`;
                  const payEntryNum = pe.code || `PT-${(rec.code || '').replace(/[^a-zA-Z0-9]/g, '')}-${pIdx + 1}`;
                  const pDate = normalizeDate(pe.date || recDate);

                  insertEntryStmt.run(
                    payEntryId,
                    payEntryNum,
                    pDate,
                    pDate,
                    pe.code || rec.code,
                    'CASH',
                    'Quỹ và Ngân hàng',
                    pe.title || `Khách hàng ${rec.customer_name} thanh toán công nợ theo hợp đồng ${rec.code}`,
                    pAmount,
                    rec.manager_name || 'Kế toán thanh toán'
                  );

                  // Dòng Nợ 1121
                  insertLineStmt.run(
                    `${payEntryId}-L1`,
                    payEntryId,
                    1,
                    '1121',
                    '1121',
                    'Tiền gửi ngân hàng (VND - Vietcombank)',
                    'DEBIT',
                    pAmount,
                    `Giấy báo Có Vietcombank thu tiền từ ${rec.customer_name}`,
                    rec.customer_name
                  );

                  // Dòng Có 131
                  insertLineStmt.run(
                    `${payEntryId}-L2`,
                    payEntryId,
                    2,
                    '131',
                    '131',
                    'Phải thu của khách hàng',
                    'CREDIT',
                    pAmount,
                    `Thu hồi công nợ theo hợp đồng ${rec.code}`,
                    rec.customer_name
                  );

                  syncedCount++;
                });
              } else if (paidVal > 0) {
                const payEntryId = `JE-REC-PAY-${rec.id}`;
                const payEntryNum = `PT-${(rec.code || '').replace(/[^a-zA-Z0-9]/g, '')}`;

                insertEntryStmt.run(
                  payEntryId,
                  payEntryNum,
                  recDate,
                  recDate,
                  rec.code,
                  'CASH',
                  'Quỹ và Ngân hàng',
                  `Khách hàng ${rec.customer_name} thanh toán đợt tiền hợp đồng ${rec.code}`,
                  paidVal,
                  rec.manager_name || 'Kế toán thanh toán'
                );

                insertLineStmt.run(
                  `${payEntryId}-L1`,
                  payEntryId,
                  1,
                  '1121',
                  '1121',
                  'Tiền gửi ngân hàng (VND - Vietcombank)',
                  'DEBIT',
                  paidVal,
                  `Thu tiền chuyển khoản Vietcombank từ ${rec.customer_name}`,
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
                  paidVal,
                  `Giảm số dư nợ phải thu của ${rec.customer_name}`,
                  rec.customer_name
                );

                syncedCount++;
              }
            });

            // ==========================================
            // 3. ĐỒNG BỘ CÔNG NỢ PHẢI TRẢ (PAYABLES)
            // ==========================================
            (payables || []).forEach((pay) => {
              const totalVal = Number(pay.total_amount) || 0;
              const paidVal = Number(pay.paid_amount) || 0;
              const payDate = normalizeDate(pay.created_at || pay.due_date);

              const supLower = (pay.supplier_name || '').toLowerCase();
              const isHardware = supLower.includes('kinlong') || supLower.includes('hafele') || supLower.includes('phụ kiện') || supLower.includes('khoá') || supLower.includes('bản lề');
              const matAccCode = isHardware ? '1522' : '1521';
              const matAccName = isHardware ? 'Vật liệu phụ, phụ kiện khoá và bản lề' : 'Nguyên liệu, vật liệu chính (Gỗ sấy, phôi)';

              // A. Bút toán Mua nguyên vật liệu / phụ kiện ghi nhận nợ phải trả (Procurement)
              if (totalVal > 0) {
                const purchEntryId = `JE-PAY-PURCH-${pay.id}`;
                const purchEntryNum = `PNK-${(pay.code || '').replace(/[^a-zA-Z0-9]/g, '')}`;
                const netAmount = Math.round(totalVal / 1.1);
                const vat = totalVal - netAmount;

                insertEntryStmt.run(
                  purchEntryId,
                  purchEntryNum,
                  payDate,
                  payDate,
                  pay.code,
                  'PROCUREMENT',
                  'Mua hàng',
                  `Nhập kho nguyên vật liệu, vật tư phục vụ sản xuất từ ${pay.supplier_name}`,
                  totalVal,
                  pay.accountant || 'Phòng Cung ứng'
                );

                // Dòng Nợ 1521/1522
                insertLineStmt.run(
                  `${purchEntryId}-L1`,
                  purchEntryId,
                  1,
                  matAccCode,
                  matAccCode,
                  matAccName,
                  'DEBIT',
                  netAmount,
                  `Giá mua chưa thuế theo đơn hàng ${pay.code}`,
                  pay.supplier_name
                );

                // Dòng Nợ 1331
                insertLineStmt.run(
                  `${purchEntryId}-L2`,
                  purchEntryId,
                  2,
                  '1331',
                  '1331',
                  'Thuế GTGT đầu vào được khấu trừ',
                  'DEBIT',
                  vat,
                  `Thuế GTGT 10% theo đơn hàng ${pay.code}`,
                  pay.supplier_name
                );

                // Dòng Có 331
                insertLineStmt.run(
                  `${purchEntryId}-L3`,
                  purchEntryId,
                  3,
                  '331',
                  '331',
                  'Phải trả cho người bán (Nhà cung cấp)',
                  'CREDIT',
                  totalVal,
                  `Tổng tiền phải trả nhà cung cấp ${pay.supplier_name}`,
                  pay.supplier_name
                );

                syncedCount++;
              }

              // B. Bút toán Thanh toán tiền cho Nhà cung cấp (Payments)
              let entriesList = [];
              try {
                entriesList = JSON.parse(pay.entries_json || '[]');
              } catch {
                entriesList = [];
              }

              if (Array.isArray(entriesList) && entriesList.length > 0) {
                entriesList.forEach((pe, pIdx) => {
                  const pAmount = Number(pe.paidAmount) || 0;
                  if (pAmount <= 0) return;

                  const disbEntryId = `JE-PAY-DISB-${pay.id}-${pe.id || pIdx}`;
                  const disbEntryNum = pe.code || `UNC-${(pay.code || '').replace(/[^a-zA-Z0-9]/g, '')}-${pIdx + 1}`;
                  const pDate = normalizeDate(pe.date || payDate);

                  insertEntryStmt.run(
                    disbEntryId,
                    disbEntryNum,
                    pDate,
                    pDate,
                    pe.code || pay.code,
                    'CASH',
                    'Quỹ và Ngân hàng',
                    pe.title || `Ủy nhiệm chi Vietcombank thanh toán tiền hàng cho ${pay.supplier_name}`,
                    pAmount,
                    pay.accountant || 'Kế toán thanh toán'
                  );

                  // Dòng Nợ 331
                  insertLineStmt.run(
                    `${disbEntryId}-L1`,
                    disbEntryId,
                    1,
                    '331',
                    '331',
                    'Phải trả cho người bán (Nhà cung cấp)',
                    'DEBIT',
                    pAmount,
                    `Thanh toán trừ công nợ nhà cung cấp ${pay.supplier_name}`,
                    pay.supplier_name
                  );

                  // Dòng Có 1121
                  insertLineStmt.run(
                    `${disbEntryId}-L2`,
                    disbEntryId,
                    2,
                    '1121',
                    '1121',
                    'Tiền gửi ngân hàng (VND - Vietcombank)',
                    'CREDIT',
                    pAmount,
                    `Ủy nhiệm chi chuyển khoản qua ngân hàng Vietcombank`,
                    'Ngân hàng TMCP Ngoại Thương VN (VCB)'
                  );

                  syncedCount++;
                });
              } else if (paidVal > 0) {
                const disbEntryId = `JE-PAY-DISB-${pay.id}`;
                const disbEntryNum = `UNC-${(pay.code || '').replace(/[^a-zA-Z0-9]/g, '')}`;

                insertEntryStmt.run(
                  disbEntryId,
                  disbEntryNum,
                  payDate,
                  payDate,
                  pay.code,
                  'CASH',
                  'Quỹ và Ngân hàng',
                  `Ủy nhiệm chi chuyển khoản thanh toán tiền hàng cho ${pay.supplier_name}`,
                  paidVal,
                  pay.accountant || 'Kế toán thanh toán'
                );

                insertLineStmt.run(
                  `${disbEntryId}-L1`,
                  disbEntryId,
                  1,
                  '331',
                  '331',
                  'Phải trả cho người bán (Nhà cung cấp)',
                  'DEBIT',
                  paidVal,
                  `Thanh toán trừ công nợ nhà cung cấp ${pay.supplier_name}`,
                  pay.supplier_name
                );

                insertLineStmt.run(
                  `${disbEntryId}-L2`,
                  disbEntryId,
                  2,
                  '1121',
                  '1121',
                  'Tiền gửi ngân hàng (VND - Vietcombank)',
                  'CREDIT',
                  paidVal,
                  `Chuyển khoản Vietcombank thanh toán theo đơn hàng ${pay.code}`,
                  'Ngân hàng TMCP Ngoại Thương VN (VCB)'
                );

                syncedCount++;
              }
            });

            // ==========================================
            // 4. ĐỒNG BỘ KHẤU HAO TÀI SẢN CỐ ĐỊNH THEO THÁNG (DEPRECIATION)
            // ==========================================
            let depProd = 0;
            let depSales = 0;
            let depAdmin = 0;

            (assets || []).forEach((asset) => {
              const orig = Number(asset.original_price) || 0;
              const months = Number(asset.depreciation_months) || 60;
              const monthlyAmt = months > 0 ? Math.round(orig / months) : 0;
              const cat = asset.category || '';

              if (cat === 'machinery' || cat === 'workshop' || cat === 'measuring') {
                depProd += monthlyAmt;
              } else if (cat === 'vehicle') {
                depSales += monthlyAmt;
              } else {
                depAdmin += monthlyAmt;
              }
            });

            const depTotal = depProd + depSales + depAdmin;

            // Chỉ hạch toán khấu hao khi thực sự có tài sản cố định phát sinh (depTotal > 0)
            if (depTotal > 0) {
              const currentMonth = new Date().getMonth() + 1; // 1..10
            for (let m = 1; m <= Math.max(currentMonth, 10); m++) {
              const monthStr = m < 10 ? `0${m}` : `${m}`;
              const lastDay = [1, 3, 5, 7, 8, 10, 12].includes(m) ? '31' : (m === 2 ? '28' : '30');
              const depDate = `2026-${monthStr}-${lastDay}`;
              const depEntryId = `JE-DEP-2026-${monthStr}`;
              const depEntryNum = `PKT-KH-2026-${monthStr}`;
              const refCode = `KH-2026-${monthStr}`;

              insertEntryStmt.run(
                depEntryId,
                depEntryNum,
                depDate,
                depDate,
                refCode,
                'PRODUCTION',
                'Khấu hao TSCĐ',
                `Chi phí khấu hao tài sản cố định Tháng ${monthStr}/2026`,
                depTotal,
                'Hệ thống tự động'
              );

              // 1. Dòng Nợ 627 - Chi phí sản xuất chung (Máy móc, thiết bị xưởng sản xuất)
              insertLineStmt.run(
                `${depEntryId}-L1`,
                depEntryId,
                1,
                '627',
                '627',
                'Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)',
                'DEBIT',
                depProd,
                `Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng ${monthStr}/2026`,
                'Khối Sản Xuất'
              );

              // 2. Dòng Nợ 641 - Chi phí bán hàng (Phương tiện vận tải xe giao hàng)
              insertLineStmt.run(
                `${depEntryId}-L2`,
                depEntryId,
                2,
                '641',
                '641',
                'Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)',
                'DEBIT',
                depSales,
                `Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng ${monthStr}/2026`,
                'Phòng Kinh Doanh'
              );

              // 3. Dòng Nợ 642 - Chi phí quản lý doanh nghiệp (Thiết bị VP & ERP)
              insertLineStmt.run(
                `${depEntryId}-L3`,
                depEntryId,
                3,
                '642',
                '642',
                'Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)',
                'DEBIT',
                depAdmin,
                `Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng ${monthStr}/2026`,
                'Khối Điều Hành'
              );

              // 4. Dòng Có 2141 - Hao mòn tài sản cố định hữu hình
              insertLineStmt.run(
                `${depEntryId}-L4`,
                depEntryId,
                4,
                '2141',
                '2141',
                'Hao mòn tài sản cố định hữu hình',
                'CREDIT',
                depTotal,
                `Trích khấu hao lũy kế 12 TSCĐ Tháng ${monthStr}/2026`,
                'Deco Door Enterprise'
              );

              syncedCount++;
            }
            }

            insertEntryStmt.finalize();
            insertLineStmt.finalize((finErr) => {
              if (finErr) return reject(finErr);
              resolve({
                success: true,
                syncedCount,
                message: `Đã đồng bộ thành công ${syncedCount} bút toán từ Chi phí, Nợ phải thu, Nợ phải trả và Khấu hao TSCĐ vào Sổ nhật ký chung.`
              });
            });
          });
        });
      });
    });
  });
});
}
