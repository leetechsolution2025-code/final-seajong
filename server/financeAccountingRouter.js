import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeFinancialReports } from '../services/financialReportEngine.js';
import { syncAllSubledgersToJournal } from '../services/journalSyncService.js';
import { syncPrismaFinanceToAccountingTables } from '../services/prismaFinanceSyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Lỗi kết nối SQLite tại financeAccountingRouter:', err);
  else {
    console.log('✓ FinanceAccountingRouter đã kết nối SQLite:', dbPath);
    syncPrismaFinanceToAccountingTables(db)
      .then((res) => console.log('✓ Đã đồng bộ dữ liệu Tài chính - Kế toán từ DB thực tế:', res))
      .catch((e) => console.warn('Cảnh báo đồng bộ Finance:', e.message));
  }
});

const router = express.Router();

function getCurrentDefaultPeriod() {
  const now = new Date();
  return String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

router.get('/api/finance/cash-assets', (req, res) => {
  db.all('SELECT * FROM cash_and_bank_assets ORDER BY created_at ASC, id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) return res.json([]);
    const formatted = rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type, // 'cash' | 'bank' | 'term_deposit'
      accountNumber: r.account_number || '',
      bankName: r.bank_name || '',
      branch: r.branch || '',
      balance: Number(r.balance) || 0,
      currency: r.currency || 'VND',
      termMonths: Number(r.term_months) || 0,
      interestRate: Number(r.interest_rate) || 0,
      startDate: r.start_date || '',
      maturityDate: r.maturity_date || '',
      managerName: r.manager_name || '',
      status: r.status || 'active',
      notes: r.notes || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(formatted);
  });
});

router.post('/api/finance/cash-assets', (req, res) => {
  const item = req.body;
  if (!item || !item.name) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin tài sản bằng tiền' });
  }
  const id = item.id || `cba-${Date.now()}`;
  const code = item.code || (item.type === 'cash' ? `TM-${Date.now().toString().slice(-4)}` : item.type === 'term_deposit' ? `TG-${Date.now().toString().slice(-4)}` : `NH-${Date.now().toString().slice(-4)}`);
  const bal = Number(item.balance) || 0;

  db.run(`
    INSERT OR REPLACE INTO cash_and_bank_assets (
      id, code, name, type, account_number, bank_name, branch, balance,
      currency, term_months, interest_rate, start_date, maturity_date,
      manager_name, status, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    id, code, item.name, item.type || 'bank', item.accountNumber || '',
    item.bankName || '', item.branch || '', bal, item.currency || 'VND',
    Number(item.termMonths) || 0, Number(item.interestRate) || 0,
    item.startDate || '', item.maturityDate || '', item.managerName || '',
    item.status || 'active', item.notes || ''
  ], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id, message: 'Đã lưu tài sản bằng tiền thành công' });
  });
});

router.delete('/api/finance/cash-assets/:id', (req, res) => {
  db.run('DELETE FROM cash_and_bank_assets WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Đã xóa tài sản bằng tiền' });
  });
});

// ==========================================
// 2. API QUẢN LÝ TÀI SẢN CỐ ĐỊNH (FIXED ASSETS - TK 211 & TK 214)
// Kết nối trực tiếp bảng fixed_assets trong CSDL thực tế Seajong
// ==========================================

const categoryLabelMap = {
  machinery: 'Máy móc thiết bị sản xuất',
  vehicle: 'Phương tiện vận tải',
  it_office: 'Thiết bị văn phòng và CNTT',
  workshop: 'Nhà xưởng và Công trình',
  measuring: 'Thiết bị đo kiểm chất lượng',
};

const statusLabelMap = {
  active: 'Đang sử dụng',
  maintenance: 'Đang bảo dưỡng',
  in_stock: 'Trong kho lưu trữ',
  liquidated: 'Đã thanh lý',
};

router.get('/api/finance/assets', (req, res) => {
  const sql = `
    SELECT * FROM fixed_assets 
    ORDER BY 
      CASE 
        WHEN id LIKE 'TS-%' THEN CAST(SUBSTR(id, 4) AS INTEGER)
        ELSE 9999 
      END ASC,
      created_at ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Lỗi truy vấn fixed_assets:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!rows || rows.length === 0) return res.json([]);

    const formatted = rows.map((r) => {
      const orig = Number(r.original_price) || 0;
      let resVal = Number(r.residual_value);
      if (isNaN(resVal) || (resVal === 0 && orig > 0 && (!r.accumulated_depreciation || r.accumulated_depreciation === 0))) {
        resVal = orig;
      }
      const accDep = Number(r.accumulated_depreciation) || Math.max(0, orig - resVal);

      return {
        id: r.id,
        code: r.code,
        name: r.name,
        category: r.category || 'machinery',
        categoryLabel: r.category_label || categoryLabelMap[r.category] || 'Tài sản cố định khác',
        originalPrice: orig,
        residualValue: resVal,
        accumulatedDepreciation: accDep,
        department: r.department || 'Bộ phận sản xuất',
        departmentKey: r.department_key || '',
        managerName: r.manager_name || '',
        status: r.status || 'active',
        statusLabel: r.status_label || statusLabelMap[r.status] || 'Đang sử dụng',
        serialNumber: r.serial_number || '',
        purchasedDate: r.purchased_date || '01/10/2026',
        depreciationMonths: Number(r.depreciation_months) || 60,
        depreciationStartDate: r.depreciation_start_date || r.purchased_date || '01/10/2026',
        maintenanceCycle: r.maintenance_cycle || '6 tháng',
        warrantyExpireDate: r.warranty_expire_date || '',
        notes: r.notes || '',
        accountCode: r.account_code || '211',
        depreciationAccountCode: r.depreciation_account_code || '2141',
      };
    });

    res.json(formatted);
  });
});

const upsertFixedAsset = (item, callback) => {
  if (!item || !item.name) return callback(null);
  const id = item.id || `TS-${Date.now().toString().slice(-4)}`;
  const code = item.code || `TS-${Date.now().toString().slice(-4)}`;
  const origPrice = Number(item.originalPrice !== undefined ? item.originalPrice : (item.giaTriMua || 0));
  const resVal = Number(item.residualValue !== undefined ? item.residualValue : (item.giaTriConLai !== undefined ? item.giaTriConLai : origPrice));
  const accDep = Number(item.accumulatedDepreciation !== undefined ? item.accumulatedDepreciation : Math.max(0, origPrice - resVal));
  const cat = item.category || item.loai || 'machinery';
  const catLabel = item.categoryLabel || categoryLabelMap[cat] || 'Tài sản cố định khác';
  const status = item.status || 'active';
  const statusLabel = item.statusLabel || statusLabelMap[status] || 'Đang sử dụng';

  const sql = `
    INSERT OR REPLACE INTO fixed_assets (
      id, code, name, category, category_label, original_price, residual_value,
      accumulated_depreciation, department, department_key, manager_name, status,
      status_label, serial_number, purchased_date, depreciation_months,
      depreciation_start_date, maintenance_cycle, warranty_expire_date, notes,
      account_code, depreciation_account_code, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  db.run(sql, [
    id, code, item.name, cat, catLabel, origPrice, resVal,
    accDep, item.department || 'Bộ phận sản xuất', item.departmentKey || '',
    item.managerName || '', status, statusLabel, item.serialNumber || '',
    item.purchasedDate || '01/10/2026', Number(item.depreciationMonths) || 60,
    item.depreciationStartDate || item.purchasedDate || '01/10/2026',
    item.maintenanceCycle || '6 tháng', item.warrantyExpireDate || '',
    item.notes || '', item.accountCode || '211', item.depreciationAccountCode || '2141'
  ], function(err) {
    callback(err, id);
  });
};

router.post('/api/finance/assets', (req, res) => {
  const body = req.body;
  if (!body) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });

  if (Array.isArray(body)) {
    let completed = 0;
    let hasError = false;
    if (body.length === 0) return res.json({ success: true, count: 0 });

    body.forEach((item) => {
      upsertFixedAsset(item, (err) => {
        if (err && !hasError) {
          hasError = true;
          return res.status(500).json({ error: err.message });
        }
        completed++;
        if (completed === body.length && !hasError) {
          res.json({ success: true, count: body.length });
        }
      });
    });
  } else {
    upsertFixedAsset(body, (err, id) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ success: true, id, message: 'Đã lưu tài sản cố định thành công' });
    });
  }
});

router.put('/api/finance/assets/:id', (req, res) => {
  const id = req.params.id;
  const item = { ...req.body, id };
  upsertFixedAsset(item, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id, message: 'Đã cập nhật tài sản cố định thành công' });
  });
});

router.delete('/api/finance/assets/:id', (req, res) => {
  const targetId = req.params.id;
  db.run('DELETE FROM fixed_assets WHERE id = ? OR code = ?', [targetId, targetId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Đã xóa tài sản cố định thành công' });
  });
});

// ==========================================
// API BÁO CÁO TÀI CHÍNH TỰ ĐỘNG (FINANCIAL REPORTS ENGINE)
// Thông tư 200/2014/TT-BTC: B01-DN, B02-DN, B03-DN & 12 Chỉ số tài chính
// ==========================================

// 1. Tính toán và lấy báo cáo tài chính tự động theo kỳ
router.get('/api/finance/reports', async (req, res) => {
  try {
    const period = req.query.period || getCurrentDefaultPeriod();
    const report = await computeFinancialReports(db, period);
    res.json(report);
  } catch (err) {
    console.error('Error computing financial report:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Chốt sổ và Bút toán kết chuyển cuối kỳ (Period-End Closing)
router.post('/api/finance/reports/close-period', async (req, res) => {
  try {
    const period = req.body.period || getCurrentDefaultPeriod();
    const report = await computeFinancialReports(db, period);
    const entryCode = `KC-${period.replace('-', '')}`;
    const description = `Bút toán kết chuyển doanh thu, chi phí xác định kết quả kinh doanh kỳ ${report.periodLabel}`;

    // Lưu bút toán kết chuyển vào Sổ nhật ký chung
    db.run(`
      INSERT OR REPLACE INTO accounting_journal_entries (
        id, entry_number, entry_date, document_date, reference_code, source_module, source_label,
        description, total_amount, status, status_label, created_at, updated_at
      ) VALUES (?, ?, CURRENT_DATE, CURRENT_DATE, ?, 'CLOSING', 'Kết chuyển cuối kỳ', ?, ?, 'posted', 'Đã ghi sổ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [`CLOSING-${period}`, entryCode, entryCode, description, report.summaryCards.netProfit], (err) => {
      if (err) {
        console.warn('Note: Could not insert into accounting_journal_entries:', err.message);
      }
      res.json({
        success: true,
        message: `Đã thực hiện bút toán kết chuyển và chốt sổ thành công cho ${report.periodLabel}`,
        entryCode,
        period,
        netProfit: report.summaryCards.netProfit,
        report,
      });
    });
  } catch (err) {
    console.error('Error closing financial period:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Lấy dữ liệu khai báo số dư đầu kỳ (Opening Balances Declaration)
router.get('/api/finance/initial-declaration', (req, res) => {
  const period = req.query.period || getCurrentDefaultPeriod();
  db.get('SELECT data_json, updated_at FROM financial_initial_declarations WHERE period = ?', [period], (err, row) => {
    if (err) {
      console.error('Error fetching initial declaration:', err);
      return res.status(500).json({ error: err.message });
    }
    if (row && row.data_json) {
      try {
        const parsed = JSON.parse(row.data_json);
        return res.json({ success: true, period, data: parsed, updatedAt: row.updated_at });
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
      }
    }
    // Trả về mặc định nếu chưa lưu
    res.json({ success: true, period, data: null });
  });
});

// 4. Lưu / cập nhật dữ liệu khai báo số dư đầu kỳ
router.post('/api/finance/initial-declaration', (req, res) => {
  const { period = getCurrentDefaultPeriod(), data } = req.body;
  if (!data) {
    return res.status(400).json({ success: false, message: 'Dữ liệu khai báo không hợp lệ' });
  }
  const dataJson = JSON.stringify(data);
  db.run(`
    INSERT OR REPLACE INTO financial_initial_declarations (period, data_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `, [period, dataJson], function (err) {
    if (err) {
      console.error('Error saving initial declaration:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({
      success: true,
      message: `Đã lưu thành công dữ liệu khai báo số dư đầu kỳ ${period}`,
      period,
    });
  });
});

// ==========================================

// ==========================================

// 1. Lấy danh sách công nợ phải thu (Receivables) - Liên kết trực tiếp với bảng khách hàng (customers)
router.get('/api/debts/receivables', (req, res) => {
  const sql = `
    SELECT 
      d.id,
      d.code,
      COALESCE(c.id, d.customer_id) as customer_id,
      COALESCE(c.name, d.customer_name) as customer_name,
      COALESCE(c.address, d.customer_address) as customer_address,
      COALESCE(c.code, '') as customer_code,
      COALESCE(c.phone, '') as customer_phone,
      d.project_name,
      d.contract_value,
      d.paid_amount,
      d.remaining_amount,
      d.due_date,
      d.status,
      d.status_label,
      d.manager_name,
      d.notes,
      d.entries_json
    FROM debt_receivables d
    LEFT JOIN customers c ON d.customer_id = c.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = rows.map((r) => {
      let entries = [];
      try {
        const rawEntries = JSON.parse(r.entries_json || '[]');
        const stagesOnly = (rawEntries || []).filter((e) => !e.code?.startsWith('PT-'));
        entries = stagesOnly.map((e, idx) => {
          const cVal = Number(e.contractValue !== undefined ? e.contractValue : (e.amount || 0));
          const pAmt = Number(e.paidAmount || 0);
          const rAmt = Number(e.remainingAmount !== undefined ? e.remainingAmount : (cVal - pAmt));
          const stagePct = e.percentage ? ` (${e.percentage}%)` : '';
          const stageTitle = e.title || (e.stage ? `${e.stage}: ${e.name || 'Thanh toán'}${stagePct}` : `Đợt ${idx + 1}: Khoản nợ theo hợp đồng`);
          
          let calcDueDate = e.dueDate || e.due_date || r.due_date || '18/11/2026';
          if (typeof calcDueDate === 'string' && (calcDueDate.includes('sau ký') || calcDueDate.includes('thương thảo'))) {
            calcDueDate = idx === 0 ? '24/10/2026' : (r.due_date || '18/11/2026');
          }

          return {
            id: e.id || `ent-${r.code}-${idx + 1}`,
            code: e.code || `${r.code}-D${idx + 1}`,
            title: stageTitle,
            date: e.date || '19/10/2026',
            time: e.time || '08:30',
            contractValue: cVal,
            paidAmount: pAmt,
            dueDate: calcDueDate,
            remainingAmount: rAmt,
            status: e.status || (rAmt <= 0 ? 'completed' : 'ontime'),
            statusLabel: e.statusLabel || (rAmt <= 0 ? 'Đã thu đủ' : (pAmt > 0 ? 'Thu một phần' : (idx === 0 ? 'Chờ thanh toán' : 'Chưa tới hạn'))),
            payments: e.payments || [],
          };
        });
      } catch (e) {
        entries = [];
      }
      return {
        id: r.id,
        code: r.code,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerAddress: r.customer_address || '',
        customerCode: r.customer_code || '',
        customerPhone: r.customer_phone || '',
        projectName: r.project_name || '',
        contractValue: Number(r.contract_value) || 0,
        paidAmount: Number(r.paid_amount) || 0,
        remainingAmount: Number(r.remaining_amount) || 0,
        dueDate: r.due_date || '',
        status: r.status || 'ontime',
        statusLabel: r.status_label || 'Trong hạn thanh toán',
        managerName: r.manager_name || '',
        notes: r.notes || '',
        entries,
      };
    });
    res.json(formatted);
  });
});

// 1b. Cấu hình mốc tuổi nợ (Đến hạn, Quá hạn) để xác định trạng thái các khoản nợ
router.get('/api/debts/aging-config', (req, res) => {
  db.get("SELECT value FROM system_settings WHERE key = 'debt_aging_config'", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row && row.value) {
      try {
        return res.json(JSON.parse(row.value));
      } catch (e) {}
    }
    res.json({
      dueSoonDays: 7,
      overdueWarningDays: 30,
      badDebtDays: 90,
      autoUpdateStatus: true,
    });
  });
});

router.post('/api/debts/aging-config', (req, res) => {
  const config = req.body || {};
  const valStr = JSON.stringify(config);
  db.run(
    "INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('debt_aging_config', ?, CURRENT_TIMESTAMP)",
    [valStr],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, config });
    }
  );
});

// Thêm / Cập nhật công nợ phải thu - Lưu liên kết customer_id với bảng customers
router.post('/api/debts/receivables', (req, res) => {
  const b = req.body;
  const id = b.id || `REC-${Date.now()}`;
  const code = b.code || `HD-${Date.now().toString().slice(-6)}`;
  const entriesJson = JSON.stringify(b.entries || []);
  const contractVal = Number(b.contractValue) || 0;
  const paid = Number(b.paidAmount) || 0;
  const remain = Number(b.remainingAmount !== undefined ? b.remainingAmount : contractVal - paid);
  const custId = b.customerId || b.customer_id || null;

  const sql = `
    INSERT OR REPLACE INTO debt_receivables (
      id, code, customer_id, customer_name, customer_address, project_name,
      contract_value, paid_amount, remaining_amount, due_date,
      status, status_label, manager_name, notes, entries_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  const params = [
    id, code, custId, b.customerName, b.customerAddress || '', b.projectName || '',
    contractVal, paid, remain, b.dueDate || '',
    b.status || (remain <= 0 ? 'completed' : 'ontime'),
    b.statusLabel || (remain <= 0 ? 'Đã thu đủ' : 'Trong hạn thanh toán'),
    b.managerName || '', b.notes || '', entriesJson
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id, message: 'Đã lưu công nợ phải thu thành công' });
    syncAllSubledgersToJournal(db).catch((e) => console.warn('Lỗi auto-sync journal sau khi lưu phải thu:', e.message));
  });
});

// Ghi nhận thanh toán thu nợ khách hàng (nhóm vào đợt thanh toán tương ứng)
router.post('/api/debts/receivables/:id/payments', (req, res) => {
  const { id } = req.params;
  const {
    amount,
    receiptCode,
    date,
    paymentDate,
    method,
    paymentMethod,
    note,
    paymentNote,
    stageId,
    stageCode,
    debitAccount,
    creditAccount,
    bankAccount,
    bankRef,
    payerName,
    payerAddress,
    accountant,
    originalDocsCount,
  } = req.body;
  const payAmt = Number(amount) || 0;
  const actualMethod = paymentMethod || method || 'Chuyển khoản';
  const actualNote = paymentNote || note || '';
  const actualDate = paymentDate || date || new Date().toLocaleDateString('vi-VN');
  const isBank = actualMethod.toLowerCase().includes('khoản') || actualMethod.toLowerCase().includes('ngân hàng');
  const actualDebit = debitAccount || (isBank ? '1121' : '1111');
  const actualCredit = creditAccount || '131';

  db.get('SELECT * FROM debt_receivables WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Không tìm thấy khoản công nợ' });

    let entries = [];
    try { entries = JSON.parse(row.entries_json || '[]'); } catch {}

    // Lọc bỏ các mục PT rời rạc nếu có
    entries = entries.filter((e) => !e.code?.startsWith('PT-'));

    // Tìm đợt thanh toán đích để nhóm thanh toán vào đợt đó
    let targetStage = null;
    if (stageId) {
      targetStage = entries.find((e) => e.id === stageId);
    } else if (stageCode) {
      targetStage = entries.find((e) => e.code === stageCode);
    }
    if (!targetStage) {
      targetStage = entries.find((e) => (e.remainingAmount === undefined || e.remainingAmount > 0));
    }
    if (!targetStage && entries.length > 0) {
      targetStage = entries[0];
    }

    const payRecord = {
      id: `PAY-${Date.now()}`,
      code: receiptCode || `PT-${Date.now().toString().slice(-6)}`,
      receiptCode: receiptCode || `PT-${Date.now().toString().slice(-6)}`,
      title: actualNote || `Thu tiền khách hàng theo phiếu ${receiptCode || ''}`,
      date: actualDate,
      time: '08:30',
      amount: payAmt,
      method: actualMethod,
      note: actualNote,
      debitAccount: actualDebit,
      creditAccount: actualCredit,
      bankAccount: bankAccount || '',
      bankRef: bankRef || '',
      payerName: payerName || row.customer_name || '',
      payerAddress: payerAddress || row.customer_address || '',
      accountant: accountant || 'Phạm Thu Hằng (Kế toán thanh toán)',
      originalDocsCount: originalDocsCount || '',
    };

    if (targetStage) {
      targetStage.payments = targetStage.payments || [];
      targetStage.payments.push(payRecord);
      targetStage.paidAmount = (Number(targetStage.paidAmount) || 0) + payAmt;
      const stageVal = Number(targetStage.contractValue !== undefined ? targetStage.contractValue : (targetStage.amount || 0));
      targetStage.remainingAmount = Math.max(0, stageVal - targetStage.paidAmount);
      targetStage.status = targetStage.remainingAmount <= 0 ? 'completed' : 'partial';
      targetStage.statusLabel = targetStage.remainingAmount <= 0 ? 'Đã thu đủ' : 'Thu một phần';
    }

    const newPaid = entries.reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
    const contractVal = Number(row.contract_value) || 0;
    const newRemaining = Math.max(0, contractVal - newPaid);
    const newStatus = newRemaining <= 0 ? 'completed' : (newPaid > 0 ? 'in_progress' : 'ontime');
    const newStatusLabel = newRemaining <= 0 ? 'Đã thu đủ' : (newPaid > 0 ? 'Đang thu' : 'Trong hạn thanh toán');

    db.run(
      'UPDATE debt_receivables SET paid_amount = ?, remaining_amount = ?, status = ?, status_label = ?, entries_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPaid, newRemaining, newStatus, newStatusLabel, JSON.stringify(entries), id],
      function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        // Tự động ghi / cập nhật vào bảng financial_vouchers để sẵn sàng truy xuất lại
        const vCode = payRecord.code || payRecord.receiptCode;
        const notesStr = [
          bankAccount ? `TK Thụ hưởng: ${bankAccount}` : '',
          bankRef ? `Số GD/UNC: ${bankRef}` : '',
          originalDocsCount ? `Kèm theo: ${originalDocsCount}` : '',
          actualNote ? `Ghi chú: ${actualNote}` : '',
        ].filter(Boolean).join(' | ');

        const vSql = `
          INSERT INTO financial_vouchers (
            id, voucher_code, voucher_type, date, partner_type, partner_name, partner_code,
            payer_receiver_name, address, amount, reason, payment_method, debit_account,
            credit_account, reference_code, stage_title, notes, creator, accountant,
            cashier, director, has_stamp, status, updated_at
          ) VALUES (?, ?, 'receipt', ?, 'customer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'completed', CURRENT_TIMESTAMP)
          ON CONFLICT(voucher_code) DO UPDATE SET
            date = excluded.date,
            amount = excluded.amount,
            partner_name = excluded.partner_name,
            payer_receiver_name = excluded.payer_receiver_name,
            address = excluded.address,
            reason = excluded.reason,
            payment_method = excluded.payment_method,
            debit_account = excluded.debit_account,
            credit_account = excluded.credit_account,
            reference_code = excluded.reference_code,
            stage_title = excluded.stage_title,
            notes = excluded.notes,
            accountant = excluded.accountant,
            updated_at = CURRENT_TIMESTAMP
        `;
        db.run(
          vSql,
          [
            payRecord.id || `VOUCH-${vCode}`,
            vCode,
            payRecord.date || new Date().toLocaleDateString('vi-VN'),
            row.customer_name || '',
            row.customer_id || '',
            payRecord.payerName || row.customer_name || '',
            payRecord.payerAddress || row.customer_address || '',
            payAmt,
            payRecord.title || payRecord.note || `Thu tiền khách hàng - ${targetStage ? targetStage.title : row.code}`,
            actualMethod,
            actualDebit,
            actualCredit,
            row.code || (targetStage ? targetStage.code : ''),
            targetStage ? targetStage.title : '',
            notesStr || (isBank ? 'Giấy báo Có ngân hàng / Ủy nhiệm chi' : '01 Chứng từ gốc'),
            'Phạm Thu Hằng (Kế toán thanh toán)',
            payRecord.accountant || 'Trần Bích Thủy (Kế toán trưởng)',
            '',
            'Hà Hải Lâm',
          ],
          (vErr) => {
            if (vErr) console.warn('Lỗi ghi financial_vouchers từ thu nợ:', vErr.message);
          }
        );

        res.json({
          id,
          code: row.code,
          customerName: row.customer_name,
          contractValue: contractVal,
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newStatus,
          statusLabel: newStatusLabel,
          entries,
          success: true,
          newPaid,
          newRemaining,
          message: 'Đã ghi nhận thanh toán công nợ thành công'
        });
        syncAllSubledgersToJournal(db).catch((e) => console.warn('Lỗi auto-sync journal sau khi thu nợ:', e.message));
      }
    );
  });
});

// Xóa công nợ phải thu (Tự động xóa cascade các phiếu thu liên quan, hoàn tác dòng tiền & cập nhật sổ cái)
router.delete('/api/debts/receivables/:id', (req, res) => {
  const targetId = req.params.id;

  db.get('SELECT * FROM debt_receivables WHERE id = ? OR code = ?', [targetId, targetId], (err, recRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!recRow) {
      db.run('DELETE FROM debt_receivables WHERE id = ? OR code = ?', [targetId, targetId]);
      return res.json({ success: true, message: 'Đã xóa công nợ phải thu' });
    }

    const recId = recRow.id;
    const recCode = recRow.code;
    const custName = recRow.customer_name;
    const projName = recRow.project_name;

    // Trích xuất mã phiếu thu từ entries_json
    let linkedVoucherCodes = [];
    try {
      const entries = JSON.parse(recRow.entries_json || '[]');
      entries.forEach((e) => {
        if (e.payments && Array.isArray(e.payments)) {
          e.payments.forEach((p) => {
            if (p.code) linkedVoucherCodes.push(p.code);
            if (p.receiptCode) linkedVoucherCodes.push(p.receiptCode);
          });
        }
      });
    } catch {}

    // Tìm tất cả phiếu thu liên quan trong financial_vouchers
    let voucherQuery = `
      SELECT * FROM financial_vouchers 
      WHERE (voucher_type = 'receipt' OR voucher_type = 'PT')
        AND (
          reference_code = ? 
          OR reference_code = ?
          ${linkedVoucherCodes.length > 0 ? `OR voucher_code IN (${linkedVoucherCodes.map(() => '?').join(',')})` : ''}
          ${custName ? "OR (partner_name = ? AND partner_type = 'customer')" : ''}
        )
    `;
    let queryParams = [recCode, projName || ''];
    if (linkedVoucherCodes.length > 0) queryParams.push(...linkedVoucherCodes);
    if (custName) queryParams.push(custName);

    db.all(voucherQuery, queryParams, (vErr, relatedVouchers) => {
      const vouchers = relatedVouchers || [];

      // Hoàn tác trừ số dư tiền khỏi quỹ / ngân hàng vì phiếu thu bị hủy theo khoản nợ
      vouchers.forEach((v) => {
        const vAmt = Number(v.amount) || 0;
        if (vAmt > 0) {
          const isCash = (v.payment_method || '').toLowerCase().includes('mặt') || v.debit_account === '1111';
          if (isCash) {
            db.run("UPDATE cash_and_bank_assets SET balance = MAX(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE type = 'cash'", [vAmt]);
          } else {
            db.run("UPDATE cash_and_bank_assets SET balance = MAX(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM cash_and_bank_assets WHERE type = 'bank' ORDER BY balance DESC LIMIT 1)", [vAmt]);
          }
        }

        // Xóa bút toán trong sổ nhật ký chung
        db.run("DELETE FROM accounting_journal_lines WHERE entry_id IN (SELECT id FROM accounting_journal_entries WHERE reference_code = ? OR entry_number = ?)", [v.voucher_code, v.voucher_code]);
        db.run("DELETE FROM accounting_journal_entries WHERE reference_code = ? OR entry_number = ?", [v.voucher_code, v.voucher_code]);
      });

      // Xóa các phiếu thu liên quan
      if (vouchers.length > 0) {
        const vCodes = vouchers.map((v) => v.voucher_code).filter(Boolean);
        const vIds = vouchers.map((v) => v.id).filter(Boolean);
        const allTargets = Array.from(new Set([...vCodes, ...vIds]));
        const ph = allTargets.map(() => '?').join(',');
        db.run(`DELETE FROM financial_vouchers WHERE id IN (${ph}) OR voucher_code IN (${ph})`, [...allTargets, ...allTargets]);
      }

      // Xóa bản ghi trong debt_receivables
      db.run('DELETE FROM debt_receivables WHERE id = ? OR code = ?', [recId, recCode], function(delErr) {
        if (delErr) return res.status(500).json({ error: delErr.message });
        syncAllSubledgersToJournal(db).catch((e) => console.warn('Lỗi auto-sync journal sau khi xóa phải thu:', e.message));
        res.json({
          success: true,
          message: `Đã xóa công nợ và tự động dọn dẹp ${vouchers.length} chứng từ thu tiền liên quan, cập nhật dòng tiền.`,
          deletedVouchersCount: vouchers.length
        });
      });
    });
  });
});

// 2. Lấy danh sách công nợ phải trả nhà cung cấp (Payables)
router.get('/api/debts/payables', (req, res) => {
  db.all('SELECT * FROM debt_payables ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = rows.map((r) => {
      let entries = [];
      try {
        entries = JSON.parse(r.entries_json || '[]');
      } catch (e) {
        entries = [];
      }
      return {
        id: r.id,
        code: r.code,
        supplierName: r.supplier_name,
        supplierAddress: r.supplier_address || '',
        poCode: r.po_code || '',
        totalAmount: Number(r.total_amount) || 0,
        paidAmount: Number(r.paid_amount) || 0,
        remainingAmount: Number(r.remaining_amount) || 0,
        dueDate: r.due_date || '',
        status: r.status || 'pending',
        statusLabel: r.status_label || 'Chờ thanh toán',
        accountant: r.accountant || '',
        notes: r.notes || '',
        partnerType: r.partner_type || (r.code?.startsWith('CNVC') || r.po_code?.startsWith('VC') ? 'transporter' : 'supplier'),
        entries,
      };
    });
    res.json(formatted);
  });
});

// Thêm / Cập nhật công nợ phải trả
router.post('/api/debts/payables', (req, res) => {
  const b = req.body;
  const id = b.id || `AP-${Date.now()}`;
  const code = b.code || (b.partnerType === 'transporter' ? `CNVC-${Date.now().toString().slice(-4)}` : `PO-${Date.now().toString().slice(-6)}`);
  const entriesJson = JSON.stringify(b.entries || []);
  const totalVal = Number(b.totalAmount) || 0;
  const paid = Number(b.paidAmount) || 0;
  const remain = Number(b.remainingAmount !== undefined ? b.remainingAmount : totalVal - paid);
  const partnerType = b.partnerType || (b.code?.startsWith('CNVC') || b.poCode?.startsWith('VC') ? 'transporter' : 'supplier');

  const sql = `
    INSERT OR REPLACE INTO debt_payables (
      id, code, supplier_name, supplier_address, po_code,
      total_amount, paid_amount, remaining_amount, due_date,
      status, status_label, accountant, notes, partner_type, entries_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  const params = [
    id, code, b.supplierName, b.supplierAddress || '', b.poCode || '',
    totalVal, paid, remain, b.dueDate || '',
    b.status || (remain <= 0 ? 'completed' : 'pending'),
    b.statusLabel || (remain <= 0 ? 'Đã hoàn tất' : 'Chờ thanh toán'),
    b.accountant || '', b.notes || '', partnerType, entriesJson
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id, message: 'Đã lưu công nợ phải trả thành công' });
  });
});

// Ghi nhận thanh toán trả nợ nhà cung cấp
router.post('/api/debts/payables/:id/payments', (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const payAmt = Number(b.amount) || 0;
  const paymentCode = b.paymentCode || b.code || `PC-${Date.now().toString().slice(-6)}`;
  const paymentDate = b.date || b.paymentDate || new Date().toLocaleDateString('vi-VN');
  const paymentMethod = b.method || b.paymentMethod || 'Chuyển khoản';
  const paymentNote = b.note || b.paymentNote || 'Thanh toán tiền hàng cho nhà cung cấp';
  const debitAccount = b.debitAccount || '331';
  const creditAccount = b.creditAccount || (paymentMethod === 'Tiền mặt' ? '1111' : '1121');
  const receiverName = b.receiverName || b.payer_receiver_name || '';
  const receiverAddress = b.receiverAddress || b.address || '';
  const sourceBank = b.sourceBankAccount || '';
  const destBank = b.destBankAccount || '';
  const creator = b.creator || 'Phạm Thu Hằng';
  const accountant = b.accountant || 'Mai Thị Ngọc';
  const director = b.director || 'Hà Hải Lâm';
  const targetEntryId = b.entryId || null;

  db.get('SELECT * FROM debt_payables WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Không tìm thấy khoản công nợ nhà cung cấp' });

    let entries = [];
    try { entries = JSON.parse(row.entries_json || '[]'); } catch {}

    const newPaid = Number(row.paid_amount) + payAmt;
    const newRemaining = Math.max(0, Number(row.total_amount) - newPaid);
    const newStatus = newRemaining <= 0 ? 'completed' : (newPaid > 0 ? 'pending' : row.status);
    const newStatusLabel = newRemaining <= 0 ? 'Đã hoàn tất' : (newPaid > 0 ? 'Thanh toán một phần' : row.status_label);

    // Nếu thanh toán cho một đơn PO con cụ thể
    if (targetEntryId) {
      entries = entries.map(ent => {
        if (ent.id === targetEntryId) {
          const entPaid = (Number(ent.paidAmount) || 0) + payAmt;
          const entTotal = Number(ent.totalAmount) || 0;
          const entRemain = Math.max(0, entTotal - entPaid);
          return {
            ...ent,
            paidAmount: entPaid,
            remainingAmount: entRemain,
            status: entRemain <= 0 ? 'completed' : 'pending',
            statusLabel: entRemain <= 0 ? 'Đã thanh toán' : 'Chờ thanh toán',
          };
        }
        return ent;
      });
    }

    const newPaymentLog = {
      id: `ENTRY-AP-${Date.now()}`,
      code: paymentCode,
      title: paymentNote,
      date: paymentDate,
      totalAmount: payAmt,
      paidAmount: payAmt,
      remainingAmount: 0,
      status: 'completed',
      statusLabel: 'Đã chi tiền',
      debitAccount,
      creditAccount,
      paymentMethod,
      sourceBank,
      destBank,
      receiverName: receiverName || row.supplier_name,
    };
    entries.push(newPaymentLog);

    db.run(
      'UPDATE debt_payables SET paid_amount = ?, remaining_amount = ?, status = ?, status_label = ?, entries_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPaid, newRemaining, newStatus, newStatusLabel, JSON.stringify(entries), id],
      function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        
        // Tự động ghi / cập nhật vào bảng financial_vouchers
        const vCode = paymentCode;
        const vSql = `
          INSERT INTO financial_vouchers (
            id, voucher_code, voucher_type, date, partner_type, partner_name,
            payer_receiver_name, address, amount, reason, payment_method, debit_account,
            credit_account, reference_code, notes, creator, accountant,
            cashier, director, has_stamp, status, updated_at
          ) VALUES (?, ?, 'payment', ?, 'supplier', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, 1, 'completed', CURRENT_TIMESTAMP)
          ON CONFLICT(voucher_code) DO UPDATE SET
            date = excluded.date,
            amount = excluded.amount,
            partner_name = excluded.partner_name,
            payer_receiver_name = excluded.payer_receiver_name,
            address = excluded.address,
            reason = excluded.reason,
            payment_method = excluded.payment_method,
            debit_account = excluded.debit_account,
            credit_account = excluded.credit_account,
            reference_code = excluded.reference_code,
            notes = excluded.notes,
            updated_at = CURRENT_TIMESTAMP
        `;
        db.run(
          vSql,
          [
            newPaymentLog.id || `VOUCH-${vCode}`,
            vCode,
            paymentDate,
            row.supplier_name || '',
            receiverName || row.supplier_name || '',
            receiverAddress || row.supplier_address || '',
            payAmt,
            paymentNote || `Thanh toán công nợ NCC ${row.supplier_name}`,
            paymentMethod,
            debitAccount,
            creditAccount,
            row.po_code || row.code || '',
            `Ủy nhiệm chi / Phiếu chi thanh toán NCC. Nguồn: ${sourceBank || 'TK VCB Seajong'} - Thụ hưởng: ${destBank || row.supplier_name}`,
            creator,
            accountant,
            director,
          ],
          (vErr) => {
            if (vErr) console.warn('Lỗi ghi financial_vouchers từ trả nợ NCC:', vErr.message);
          }
        );

        const updatedRow = {
          id: row.id,
          code: row.code,
          supplierName: row.supplier_name,
          supplierAddress: row.supplier_address || '',
          poCode: row.po_code || '',
          totalAmount: Number(row.total_amount) || 0,
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          dueDate: row.due_date || '',
          status: newStatus,
          statusLabel: newStatusLabel,
          accountant: row.accountant || '',
          notes: row.notes || '',
          partnerType: row.partner_type || 'supplier',
          entries,
        };

        res.json({ success: true, updated: updatedRow, newPaid, newRemaining, message: 'Đã lập phiếu chi thanh toán nhà cung cấp thành công' });
      }
    );
  });
});

// Xóa công nợ phải trả (Tự động xóa cascade các phiếu chi liên quan, hoàn trả tiền vào quỹ/ngân hàng & cập nhật sổ cái)
router.delete('/api/debts/payables/:id', (req, res) => {
  const targetId = req.params.id;

  db.get('SELECT * FROM debt_payables WHERE id = ? OR code = ?', [targetId, targetId], (err, payRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!payRow) {
      db.run('DELETE FROM debt_payables WHERE id = ? OR code = ?', [targetId, targetId]);
      return res.json({ success: true, message: 'Đã xóa công nợ phải trả' });
    }

    const payId = payRow.id;
    const payCode = payRow.code;
    const poCode = payRow.po_code;
    const suppName = payRow.supplier_name;

    let linkedVoucherCodes = [];
    try {
      const entries = JSON.parse(payRow.entries_json || '[]');
      entries.forEach((e) => {
        if (e.payments && Array.isArray(e.payments)) {
          e.payments.forEach((p) => {
            if (p.code) linkedVoucherCodes.push(p.code);
            if (p.paymentCode) linkedVoucherCodes.push(p.paymentCode);
          });
        }
      });
    } catch {}

    let voucherQuery = `
      SELECT * FROM financial_vouchers 
      WHERE (voucher_type = 'payment' OR voucher_type = 'PC')
        AND (
          reference_code = ? 
          OR reference_code = ?
          ${linkedVoucherCodes.length > 0 ? `OR voucher_code IN (${linkedVoucherCodes.map(() => '?').join(',')})` : ''}
          ${suppName ? "OR (partner_name = ? AND partner_type = 'supplier')" : ''}
        )
    `;
    let queryParams = [payCode, poCode || ''];
    if (linkedVoucherCodes.length > 0) queryParams.push(...linkedVoucherCodes);
    if (suppName) queryParams.push(suppName);

    db.all(voucherQuery, queryParams, (vErr, relatedVouchers) => {
      const vouchers = relatedVouchers || [];

      // Hoàn lại tiền vào quỹ / ngân hàng vì phiếu chi bị hủy
      vouchers.forEach((v) => {
        const vAmt = Number(v.amount) || 0;
        if (vAmt > 0) {
          const isCash = (v.payment_method || '').toLowerCase().includes('mặt') || v.credit_account === '1111';
          if (isCash) {
            db.run("UPDATE cash_and_bank_assets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE type = 'cash'", [vAmt]);
          } else {
            db.run("UPDATE cash_and_bank_assets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM cash_and_bank_assets WHERE type = 'bank' ORDER BY balance DESC LIMIT 1)", [vAmt]);
          }
        }

        // Xóa chi phí liên quan nếu có
        db.run("DELETE FROM financial_expenses WHERE code = ? OR id = ? OR reference_code = ?", [v.voucher_code, v.id, payCode]);

        // Xóa bút toán trong sổ nhật ký chung
        db.run("DELETE FROM accounting_journal_lines WHERE entry_id IN (SELECT id FROM accounting_journal_entries WHERE reference_code = ? OR entry_number = ?)", [v.voucher_code, v.voucher_code]);
        db.run("DELETE FROM accounting_journal_entries WHERE reference_code = ? OR entry_number = ?", [v.voucher_code, v.voucher_code]);
      });

      // Xóa các phiếu chi liên quan
      if (vouchers.length > 0) {
        const vCodes = vouchers.map((v) => v.voucher_code).filter(Boolean);
        const vIds = vouchers.map((v) => v.id).filter(Boolean);
        const allTargets = Array.from(new Set([...vCodes, ...vIds]));
        const ph = allTargets.map(() => '?').join(',');
        db.run(`DELETE FROM financial_vouchers WHERE id IN (${ph}) OR voucher_code IN (${ph})`, [...allTargets, ...allTargets]);
      }

      // Xóa bản ghi trong debt_payables
      db.run('DELETE FROM debt_payables WHERE id = ? OR code = ?', [payId, payCode], function(delErr) {
        if (delErr) return res.status(500).json({ error: delErr.message });
        syncAllSubledgersToJournal(db).catch((e) => console.warn('Lỗi auto-sync journal sau khi xóa phải trả:', e.message));
        res.json({
          success: true,
          message: `Đã xóa công nợ phải trả và tự động dọn dẹp ${vouchers.length} chứng từ chi liên quan, hoàn lại số dư tiền.`,
          deletedVouchersCount: vouchers.length
        });
      });
    });
  });
});

// ==========================================
// 3. NỢ VAY NGÂN HÀNG & TỔ CHỨC TÍN DỤNG (BANK LOANS)
// ==========================================

// Lấy danh sách nợ vay ngân hàng (chuẩn BCTC & quản trị tín dụng)
router.get('/api/debts/loans', (req, res) => {
  db.all('SELECT * FROM bank_loans ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = (rows || []).map((r) => ({
      id: r.id,
      code: r.code,
      bankName: r.bank_name,
      contractCode: r.contract_code || '',
      facilityType: r.facility_type || 'working_capital',
      facilityLabel: r.facility_label || 'Vay vốn lưu động hạn mức',
      termType: r.term_type || 'short_term',
      loanLimit: Number(r.loan_limit) || 0,
      paidPrincipal: Number(r.paid_principal) || 0,
      remainingPrincipal: Number(r.remaining_principal !== undefined ? r.remaining_principal : (r.loan_limit - r.paid_principal)),
      dueWithin12m: Number(r.due_within_12m) || 0,
      interestRate: r.interest_rate || '7.5% / năm',
      interestRateVal: Number(r.interest_rate_val) || 7.5,
      interestType: r.interest_type || 'floating',
      interestPaymentDay: Number(r.interest_payment_day) || 25,
      monthlyInterestEst: Number(r.monthly_interest_est) || 0,
      startDate: r.start_date || '',
      maturityDate: r.maturity_date || '',
      collateralAssetId: r.collateral_asset_id || '',
      collateralName: r.collateral_name || '',
      collateralValue: Number(r.collateral_value) || 0,
      bankAccountId: r.bank_account_id || '',
      bankAccountNumber: r.bank_account_number || '',
      status: r.status || 'active',
      statusLabel: r.status_label || 'Dư nợ trong hạn',
      loanType: r.loan_type || '',
      notes: r.notes || '',
    }));
    res.json(formatted);
  });
});

// Thêm / cập nhật hợp đồng nợ vay
router.post('/api/debts/loans', (req, res) => {
  const b = req.body;
  const id = b.id || `LN-${Date.now()}`;
  const code = b.code || `VAY-${Date.now().toString().slice(-4)}`;
  const limit = Number(b.loanLimit) || 0;
  const paid = Number(b.paidPrincipal) || 0;
  const remain = Number(b.remainingPrincipal !== undefined ? b.remainingPrincipal : (limit - paid));
  const due12m = Number(b.dueWithin12m) || (b.termType === 'short_term' ? remain : 0);
  const rateVal = Number(b.interestRateVal) || 7.5;
  const monthlyInt = Number(b.monthlyInterestEst) || Math.round((remain * rateVal) / 100 / 12);

  const sql = `
    INSERT OR REPLACE INTO bank_loans (
      id, code, bank_name, contract_code, facility_type, facility_label,
      term_type, loan_limit, paid_principal, remaining_principal, due_within_12m,
      interest_rate, interest_rate_val, interest_type, interest_payment_day,
      monthly_interest_est, start_date, maturity_date, collateral_asset_id,
      collateral_name, collateral_value, bank_account_id, bank_account_number,
      status, status_label, loan_type, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  db.run(
    sql,
    [
      id,
      code,
      b.bankName || '',
      b.contractCode || '',
      b.facilityType || 'working_capital',
      b.facilityLabel || 'Vay vốn lưu động hạn mức',
      b.termType || 'short_term',
      limit,
      paid,
      remain,
      due12m,
      b.interestRate || `${rateVal}% / năm`,
      rateVal,
      b.interestType || 'floating',
      Number(b.interestPaymentDay) || 25,
      monthlyInt,
      b.startDate || '',
      b.maturityDate || '',
      b.collateralAssetId || '',
      b.collateralName || '',
      Number(b.collateralValue) || 0,
      b.bankAccountId || '',
      b.bankAccountNumber || '',
      b.status || 'active',
      b.statusLabel || 'Dư nợ trong hạn',
      b.loanType || '',
      b.notes || '',
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id, message: 'Đã lưu thông tin nợ vay thành công' });
    }
  );
});

// Xóa hợp đồng nợ vay
router.delete('/api/debts/loans/:id', (req, res) => {
  db.run('DELETE FROM bank_loans WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Đã xóa hợp đồng nợ vay' });
  });
});

// Lấy danh sách khế ước giải ngân (KUNN) theo Hợp đồng vay
router.get('/api/debts/loans/:id/drawdowns', (req, res) => {
  db.all(
    'SELECT * FROM bank_loan_drawdowns WHERE loan_id = ? ORDER BY drawdown_date DESC',
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const formatted = (rows || []).map((r) => ({
        id: r.id,
        loanId: r.loan_id,
        drawdownCode: r.drawdown_code,
        drawdownDate: r.drawdown_date,
        maturityDate: r.maturity_date,
        amount: Number(r.amount) || 0,
        paidPrincipal: Number(r.paid_principal) || 0,
        remainingPrincipal: Number(r.remaining_principal) || 0,
        interestRate: Number(r.interest_rate) || 7.5,
        purpose: r.purpose || '',
        status: r.status || 'active',
      }));
      res.json(formatted);
    }
  );
});

// Thêm / Cập nhật Khế ước giải ngân
router.post('/api/debts/loans/:id/drawdowns', (req, res) => {
  const loanId = req.params.id;
  const b = req.body;
  const id = b.id || `KUNN-${Date.now()}`;
  const code = b.drawdownCode || `KUNN-${Date.now().toString().slice(-4)}`;
  const amt = Number(b.amount) || 0;
  const paid = Number(b.paidPrincipal) || 0;
  const remain = Number(b.remainingPrincipal !== undefined ? b.remainingPrincipal : (amt - paid));

  const sql = `
    INSERT OR REPLACE INTO bank_loan_drawdowns (
      id, loan_id, drawdown_code, drawdown_date, maturity_date,
      amount, paid_principal, remaining_principal, interest_rate,
      purpose, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      id,
      loanId,
      code,
      b.drawdownDate || '',
      b.maturityDate || '',
      amt,
      paid,
      remain,
      Number(b.interestRate) || 7.5,
      b.purpose || '',
      b.status || 'active',
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id, message: 'Đã lưu khế ước giải ngân thành công' });
    }
  );
});

// Xóa khế ước giải ngân
router.delete('/api/debts/loans/drawdowns/:drawdownId', (req, res) => {
  db.run('DELETE FROM bank_loan_drawdowns WHERE id = ?', [req.params.drawdownId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Đã xóa khế ước nhận nợ' });
  });
});

// ==========================================
// 4. QUẢN LÝ CHI PHÍ KINH DOANH (EXPENSES)
// ==========================================

// Lấy danh sách chi phí
router.get('/api/debts/expenses', (req, res) => {
  db.all('SELECT * FROM financial_expenses ORDER BY spend_date DESC, created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = (rows || []).map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      category: r.category,
      categoryLabel: r.category_label,
      amount: Number(r.amount) || 0,
      department: r.department,
      spendDate: r.spend_date,
      spender: r.spender,
      status: r.status || 'approved',
      statusLabel: r.status_label || 'Đã chi tiền',
      notes: r.notes || '',
      debitAccount: r.debit_account || '',
      debitAccountName: r.debit_account_name || '',
      creditAccount: r.credit_account || '',
      creditAccountName: r.credit_account_name || '',
      operationType: r.operation_type || '',
      proposer: r.proposer || '',
    }));
    res.json(formatted);
  });
});

// Thêm / cập nhật chi phí (hỗ trợ định khoản Nợ/Có và auto-sync vào Sổ nhật ký chung)
router.post('/api/debts/expenses', (req, res) => {
  const b = req.body;
  const id = b.id || `EXP-${Date.now()}`;
  const code = b.code || `PC-${Date.now().toString().slice(-4)}`;
  const amt = Number(b.amount) || 0;

  const sql = `
    INSERT OR REPLACE INTO financial_expenses (
      id, code, title, category, category_label, amount, department,
      spend_date, spender, status, status_label, notes,
      debit_account, debit_account_name, credit_account, credit_account_name, operation_type, proposer,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  db.run(
    sql,
    [
      id,
      code,
      b.title || '',
      b.category || 'production',
      b.categoryLabel || 'Chi phí sản xuất',
      amt,
      b.department || 'Khối Sản Xuất',
      b.spendDate || '',
      b.spender || '',
      b.status || 'approved',
      b.statusLabel || 'Đã chi tiền',
      b.notes || '',
      b.debitAccount || '',
      b.debitAccountName || '',
      b.creditAccount || '',
      b.creditAccountName || '',
      b.operationType || '',
      b.proposer || '',
    ],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // 1. Cập nhật giảm số dư quỹ tiền mặt (TK 1111) hoặc tài khoản ngân hàng (TK 1121)
      if (amt > 0) {
        if (b.creditAccount === '1111') {
          db.run(
            "UPDATE cash_and_bank_assets SET balance = MAX(0, balance - ?) WHERE id = (SELECT id FROM cash_and_bank_assets WHERE type = 'cash' LIMIT 1)",
            [amt]
          );
        } else if (b.creditAccount === '1121') {
          db.run(
            "UPDATE cash_and_bank_assets SET balance = MAX(0, balance - ?) WHERE id = (SELECT id FROM cash_and_bank_assets WHERE type = 'bank' OR bank_name LIKE '%Vietcombank%' LIMIT 1)",
            [amt]
          );
        }
      }

      // 2. Tự động ghi / cập nhật vào bảng financial_vouchers để sẵn sàng truy xuất lại
      const isBank = (b.creditAccount || '1111') === '1121';
      const vSql = `
        INSERT INTO financial_vouchers (
          id, voucher_code, voucher_type, date, partner_type, partner_name,
          payer_receiver_name, amount, reason, payment_method, debit_account,
          credit_account, reference_code, notes, creator, accountant,
          cashier, director, has_stamp, status, updated_at
        ) VALUES (?, ?, 'payment', ?, 'other', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Mai Thị Ngọc', '', 'Hà Hải Lâm', 1, 'completed', CURRENT_TIMESTAMP)
        ON CONFLICT(voucher_code) DO UPDATE SET
          date = excluded.date,
          amount = excluded.amount,
          partner_name = excluded.partner_name,
          payer_receiver_name = excluded.payer_receiver_name,
          reason = excluded.reason,
          payment_method = excluded.payment_method,
          debit_account = excluded.debit_account,
          credit_account = excluded.credit_account,
          reference_code = excluded.reference_code,
          notes = excluded.notes,
          creator = excluded.creator,
          updated_at = CURRENT_TIMESTAMP
      `;
      db.run(
        vSql,
        [
          id,
          code,
          b.spendDate || new Date().toLocaleDateString('vi-VN'),
          b.spender || b.department || 'Bộ phận nội bộ',
          b.proposer || b.spender || '',
          amt,
          b.title || 'Chi phí hoạt động',
          isBank ? 'Chuyển khoản' : 'Tiền mặt',
          b.debitAccount || '642',
          b.creditAccount || '1111',
          id,
          b.notes || 'Hóa đơn / Giấy đề nghị chi',
          b.spender || 'Nguyễn Thị Tuyết'
        ],
        (vErr) => {
          if (vErr) console.warn('Lỗi ghi financial_vouchers từ chi phí:', vErr.message);
        }
      );

      // 3. Tự động đồng bộ ngay vào Sổ nhật ký chung và tính toán lại toàn bộ Báo cáo tài chính
      try {
        await syncAllSubledgersToJournal(db);
        res.json({
          success: true,
          id,
          message: 'Đã lưu phiếu chi, tự động ghi Sổ nhật ký chung và cập nhật Báo cáo tài chính theo thời gian thực',
        });
      } catch (syncErr) {
        console.warn('Lỗi auto-sync journal sau khi lưu chi phí:', syncErr.message);
        res.json({ success: true, id, message: 'Đã lưu phiếu chi thành công' });
      }
    }
  );
});

// Xóa chi phí (Tự động hoàn tiền vào quỹ/ngân hàng, dọn dẹp phiếu chi, hoàn trả trạng thái lệnh chi & cập nhật sổ cái)
router.delete('/api/debts/expenses/:id', (req, res) => {
  const targetId = req.params.id;

  db.get('SELECT * FROM financial_expenses WHERE id = ? OR code = ?', [targetId, targetId], (err, expRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!expRow) {
      db.run('DELETE FROM financial_expenses WHERE id = ? OR code = ?', [targetId, targetId]);
      return res.json({ success: true, message: 'Đã xóa chi phí' });
    }

    const expAmt = Number(expRow.amount) || 0;
    const expCode = expRow.code;
    const creditAcc = expRow.credit_account || '1121';

    // 1. Hoàn lại số dư quỹ tiền mặt hoặc ngân hàng nếu chi phí đã được chi
    if (expAmt > 0 && expRow.status === 'approved') {
      if (creditAcc === '1111') {
        db.run("UPDATE cash_and_bank_assets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE type = 'cash' LIMIT 1", [expAmt]);
      } else {
        db.run("UPDATE cash_and_bank_assets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM cash_and_bank_assets WHERE type = 'bank' ORDER BY balance DESC LIMIT 1)", [expAmt]);
      }
    }

    // 2. Nếu chi phí gắn với Lệnh chi tiền, hoàn lại trạng thái Lệnh chi thành 'pending'
    db.run(
      "UPDATE payment_orders SET status = 'pending', status_label = 'Chờ chi tiền', voucher_id = NULL, executed_by = NULL, executed_date = NULL, updated_at = CURRENT_TIMESTAMP WHERE voucher_id = ? OR order_code = ? OR id = ?",
      [expCode, expRow.id, targetId]
    );

    // 3. Nếu là tạm ứng nhân viên, trả trạng thái tạm ứng về 'approved' (chưa giải ngân)
    if (expRow.operation_type === 'advance_payment' || expRow.category === 'advance') {
      db.run("UPDATE advance_payments SET review_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE code = ? OR purpose LIKE ?", [expRow.notes || '', `%${expRow.proposer || ''}%`]);
    }

    // 4. Xóa phiếu chi trong financial_vouchers
    db.run('DELETE FROM financial_vouchers WHERE voucher_code = ? OR id = ? OR reference_code = ?', [expCode, expRow.id, expCode]);

    // 5. Xóa bút toán sổ nhật ký chung
    db.run("DELETE FROM accounting_journal_lines WHERE entry_id IN (SELECT id FROM accounting_journal_entries WHERE reference_code = ? OR entry_number = ?)", [expCode, expCode]);
    db.run("DELETE FROM accounting_journal_entries WHERE reference_code = ? OR entry_number = ?", [expCode, expCode]);

    // 6. Xóa bản ghi trong financial_expenses
    db.run('DELETE FROM financial_expenses WHERE id = ? OR code = ?', [expRow.id, expCode], async function (delErr) {
      if (delErr) return res.status(500).json({ error: delErr.message });

      try {
        await syncAllSubledgersToJournal(db);
        res.json({ success: true, message: 'Đã xóa chi phí, hoàn trả tiền vào tài khoản và cập nhật sổ cái thành công' });
      } catch (syncErr) {
        console.warn('Lỗi auto-sync journal sau khi xóa chi phí:', syncErr.message);
        res.json({ success: true, message: 'Đã xóa chi phí' });
      }
    });
  });
});

// =========================================================================

// ==========================================
// HỆ THỐNG KẾ TOÁN & SỔ NHẬT KÝ CHUNG (GENERAL JOURNAL - MẪU S03a-DN)
// ==========================================

// Helper tự động sinh mã bút toán nếu chưa có
function generateNextJournalEntryNumber(prefix = 'PKT', callback) {
  const currentYear = new Date().getFullYear();
  const pattern = `${prefix}-${currentYear}-%`;
  db.get(
    'SELECT entry_number FROM accounting_journal_entries WHERE entry_number LIKE ? ORDER BY entry_number DESC LIMIT 1',
    [pattern],
    (err, row) => {
      if (err || !row) {
        return callback(null, `${prefix}-${currentYear}-0001`);
      }
      const parts = row.entry_number.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      const nextSeq = isNaN(lastSeq) ? 1 : lastSeq + 1;
      const nextNumber = `${prefix}-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
      callback(null, nextNumber);
    }
  );
}

// 1. API Lấy danh mục hệ thống tài khoản kế toán
router.get('/api/finance/chart-of-accounts', (req, res) => {
  db.all('SELECT * FROM accounting_chart_of_accounts WHERE is_active = 1 ORDER BY code ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// 2. API Lấy danh sách Sổ nhật ký chung + Các dòng định khoản + Tổng hợp số liệu KPI
router.get('/api/finance/journal-entries', (req, res) => {
  const { month, sourceModule, accountCode, search } = req.query;

  let query = 'SELECT * FROM accounting_journal_entries WHERE 1=1';
  const params = [];

  if (month && month !== 'all') {
    query += ' AND entry_date LIKE ?';
    params.push(`${month}%`);
  }

  if (sourceModule && sourceModule !== 'ALL') {
    query += ' AND source_module = ?';
    params.push(sourceModule);
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    query += ` AND (entry_number LIKE ? OR reference_code LIKE ? OR description LIKE ? OR id IN (
      SELECT entry_id FROM accounting_journal_lines WHERE account_code LIKE ? OR description LIKE ? OR partner LIKE ?
    ))`;
    params.push(s, s, s, s, s, s);
  }

  query += ' ORDER BY entry_date DESC, created_at DESC';

  db.all(query, params, (err, entries) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!entries || entries.length === 0) {
      return res.json({
        entries: [],
        summary: {
          totalEntries: 0,
          totalDebit: 0,
          totalCredit: 0,
          isBalanced: true,
        },
      });
    }

    const entryIds = entries.map((e) => e.id);
    const placeholders = entryIds.map(() => '?').join(',');

    db.all(
      `SELECT * FROM accounting_journal_lines WHERE entry_id IN (${placeholders}) ORDER BY entry_id, line_number ASC`,
      entryIds,
      (lErr, lines) => {
        if (lErr) return res.status(500).json({ error: lErr.message });

        const linesByEntry = {};
        for (const line of lines || []) {
          if (!linesByEntry[line.entry_id]) linesByEntry[line.entry_id] = [];
          linesByEntry[line.entry_id].push({
            id: line.id,
            accountId: line.account_id,
            accountCode: line.account_code,
            accountName: line.account_name,
            type: line.type,
            amount: Number(line.amount || 0),
            description: line.description,
            partner: line.partner,
          });
        }

        let totalDebit = 0;
        let totalCredit = 0;

        let formattedEntries = entries.map((e) => {
          const entryLines = linesByEntry[e.id] || [];
          for (const l of entryLines) {
            if (l.type === 'DEBIT') totalDebit += l.amount;
            if (l.type === 'CREDIT') totalCredit += l.amount;
          }

          return {
            id: e.id,
            entryNumber: e.entry_number,
            entryDate: e.entry_date,
            documentDate: e.document_date || e.entry_date,
            referenceCode: e.reference_code,
            sourceModule: e.source_module,
            sourceLabel: e.source_label,
            description: e.description,
            totalAmount: Number(e.total_amount || 0),
            status: e.status,
            statusLabel: e.status_label,
            createdBy: e.created_by,
            createdAt: e.created_at,
            lines: entryLines,
          };
        });

        // Lọc theo accountCode nếu có
        if (accountCode && accountCode !== 'ALL') {
          formattedEntries = formattedEntries.filter((e) =>
            e.lines.some((l) => l.accountCode.startsWith(accountCode))
          );
        }

        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

        res.json({
          entries: formattedEntries,
          summary: {
            totalEntries: formattedEntries.length,
            totalDebit,
            totalCredit,
            isBalanced,
          },
        });
      }
    );
  });
});

// 3. API Thêm mới bút toán Sổ nhật ký chung (Validate Nợ = Có)
router.post('/api/finance/journal-entries', (req, res) => {
  const {
    entryNumber,
    entryDate,
    documentDate,
    referenceCode,
    sourceModule,
    sourceLabel,
    description,
    createdBy,
    lines,
  } = req.body;

  if (!description || !entryDate || !Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json({ error: 'Bút toán phải có ngày ghi sổ, diễn giải và tối thiểu 2 dòng định khoản Nợ / Có' });
  }

  // Validate Cân đối định khoản: Tổng Nợ == Tổng Có
  let debitSum = 0;
  let creditSum = 0;

  for (const line of lines) {
    const amt = Number(line.amount || 0);
    if (amt <= 0) {
      return res.status(400).json({ error: 'Số tiền định khoản phải lớn hơn 0' });
    }
    if (line.type === 'DEBIT') debitSum += amt;
    else if (line.type === 'CREDIT') creditSum += amt;
    else {
      return res.status(400).json({ error: 'Loại định khoản phải là Nợ (DEBIT) hoặc Có (CREDIT)' });
    }
  }

  if (Math.abs(debitSum - creditSum) > 0.01) {
    return res.status(400).json({
      error: `Định khoản không cân đối! Tổng Nợ (${debitSum.toLocaleString('vi-VN')} đ) phải bằng Tổng Có (${creditSum.toLocaleString('vi-VN')} đ)`,
    });
  }

  const finalSourceModule = sourceModule || 'MANUAL';
  const prefix = finalSourceModule === 'CASH' ? 'UNC' : (finalSourceModule === 'ADVANCE' ? 'PC' : 'PKT');

  const proceedWithNumber = (finalNumber) => {
    const entryId = 'JE-' + Date.now();
    const docDate = documentDate || entryDate;
    const finalSourceLabel = sourceLabel || (
      finalSourceModule === 'PROCUREMENT' ? 'Mua hàng' :
      finalSourceModule === 'SALES' ? 'Bán hàng' :
      finalSourceModule === 'LOGISTICS' ? 'Kho vận' :
      finalSourceModule === 'CASH' ? 'Quỹ và Ngân hàng' :
      finalSourceModule === 'ADVANCE' ? 'Tạm ứng' : 'Thủ công'
    );

    db.run(
      `INSERT INTO accounting_journal_entries (
        id, entry_number, entry_date, document_date, reference_code,
        source_module, source_label, description, total_amount, status,
        status_label, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'Đã ghi sổ', ?)`,
      [
        entryId,
        finalNumber,
        entryDate,
        docDate,
        referenceCode || null,
        finalSourceModule,
        finalSourceLabel,
        description.trim(),
        debitSum,
        createdBy || 'Kế toán tổng hợp',
      ],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const insertLineStmt = db.prepare(`
          INSERT INTO accounting_journal_lines (
            id, entry_id, line_number, account_id, account_code,
            account_name, type, amount, description, partner
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let idx = 1;
        for (const line of lines) {
          insertLineStmt.run(
            'L-' + Date.now() + '-' + idx,
            entryId,
            idx++,
            line.accountId || line.accountCode,
            line.accountCode || line.accountId,
            line.accountName || line.accountCode,
            line.type,
            Number(line.amount || 0),
            line.description ? line.description.trim() : description.trim(),
            line.partner ? line.partner.trim() : null
          );
        }

        insertLineStmt.finalize((lErr) => {
          if (lErr) return res.status(500).json({ error: lErr.message });

          res.json({
            success: true,
            id: entryId,
            entryNumber: finalNumber,
            totalAmount: debitSum,
            message: `Đã ghi sổ thành công bút toán ${finalNumber}`,
          });
        });
      }
    );
  };

  if (entryNumber && entryNumber.trim()) {
    proceedWithNumber(entryNumber.trim());
  } else {
    generateNextJournalEntryNumber(prefix, (gErr, num) => {
      proceedWithNumber(num || `PKT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
    });
  }
});

// 4. API Xóa bút toán
router.delete('/api/finance/journal-entries/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM accounting_journal_lines WHERE entry_id = ?', [id], (lErr) => {
    if (lErr) return res.status(500).json({ error: lErr.message });
    db.run('DELETE FROM accounting_journal_entries WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Đã xóa bút toán thành công' });
    });
  });
});

// API QUẢN LÝ TẠM ỨNG (ADVANCE PAYMENTS)
// ==========================================

// 1. Lấy danh sách phiếu tạm ứng
router.get('/api/advance-payments', (req, res) => {
  const query = 'SELECT * FROM advance_payments ORDER BY created_at DESC';
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = (rows || []).map((r) => ({
      id: r.id,
      code: r.code,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      department: r.department,
      purpose: r.purpose,
      project: r.project,
      amount: Number(r.amount || 0),
      requestedDate: r.requested_date,
      paymentMethod: r.payment_method || 'bank_transfer',
      bankInfo: r.bank_name ? {
        bankName: r.bank_name,
        accountNumber: r.bank_account || '',
        accountName: r.bank_account_name || '',
      } : undefined,
      status: r.status || 'pending',
      reviewStatus: r.review_status || 'unprocessed',
      approver: r.approver,
      approvedDate: r.approved_date,
      rejectReason: r.reject_reason,
      rejectedDate: r.rejected_date,
      deadlineRefund: r.deadline_refund,
      note: r.note,
      attachedDocsCount: r.attached_docs_count || 0,
      createdAt: r.created_at,
    }));
    res.json(formatted);
  });
});

// 2. Tạo mới phiếu đề nghị tạm ứng
router.post('/api/advance-payments', (req, res) => {
  const {
    id,
    code,
    employeeName,
    employeeCode,
    department,
    purpose,
    project,
    amount,
    requestedDate,
    paymentMethod,
    bankInfo,
    status,
    reviewStatus,
    deadlineRefund,
    note,
    attachedDocsCount,
  } = req.body;

  if (!purpose || !amount) {
    return res.status(400).json({ error: 'Mục đích và số tiền tạm ứng là bắt buộc' });
  }

  const itemId = id || `adv-${Date.now()}`;
  const itemCode = code || `TU-${new Date().getFullYear()}/${String(Date.now()).slice(-4)}`;

  const stmt = db.prepare(`
    INSERT INTO advance_payments (
      id, code, employee_name, employee_code, department, purpose, project,
      amount, requested_date, payment_method, bank_name, bank_account, bank_account_name,
      status, review_status, deadline_refund, note, attached_docs_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    itemId,
    itemCode,
    employeeName || 'Cán bộ nhân viên',
    employeeCode || 'NV-001',
    department || 'Xưởng Sản xuất gỗ',
    purpose,
    project || '',
    Number(amount || 0),
    requestedDate || new Date().toISOString().split('T')[0],
    paymentMethod || 'bank_transfer',
    bankInfo?.bankName || null,
    bankInfo?.accountNumber || null,
    bankInfo?.accountName || null,
    status || 'pending',
    reviewStatus || 'unprocessed',
    deadlineRefund || '',
    note || '',
    attachedDocsCount || 0,
  ], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    // Đồng bộ sang approval_documents cho Ban Giám đốc phê duyệt
    const advDocId = `APR-${itemId}`;
    const advAmt = Number(amount || 0);
    const advSummary = `Mục đích: ${purpose} • Dự án: ${project || 'Chung'} • Hạn hoàn ứng: ${deadlineRefund || 'Chưa xác định'}`;
    const advContent = `Kính gửi Ban Giám đốc,\n\nTôi là ${employeeName || 'Cán bộ'} thuộc bộ phận ${department || 'Phòng ban'}.\nTôi làm đơn đề xuất Ban Giám đốc phê duyệt tạm ứng số tiền: ${advAmt.toLocaleString('vi-VN')} đ.\n- Mục đích: ${purpose}\n- Dự án liên quan: ${project || 'Chung'}\n- Hạn hoàn ứng: ${deadlineRefund || 'Chưa xác định'}\n- Phương thức thanh toán: ${paymentMethod === 'cash' ? 'Tiền mặt' : `Chuyển khoản (${bankInfo?.bankName || ''} - STK: ${bankInfo?.accountNumber || ''})`}\n\nKính mong Ban Giám đốc xem xét phê duyệt.`;

    db.run(
      `INSERT OR REPLACE INTO approval_documents (
        id, code, title, doc_type, doc_type_name, department,
        submitter, submitter_code, submitter_role, submit_date,
        value, value_label, summary, content, priority, status, is_read,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'advance', 'Yêu cầu tạm ứng', ?, ?, ?, 'Cán bộ', ?, ?, ?, ?, ?, 'high', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        advDocId,
        itemCode,
        `Đề nghị tạm ứng ${advAmt.toLocaleString('vi-VN')} đ - ${employeeName || 'Cán bộ'}`,
        department || 'Kế toán',
        employeeName || 'Cán bộ',
        employeeCode || '',
        requestedDate || new Date().toLocaleDateString('vi-VN'),
        advAmt,
        `${advAmt.toLocaleString('vi-VN')} đ`,
        advSummary,
        advContent,
        status || 'pending'
      ],
      (aprErr) => {
        if (aprErr) console.warn('[Auto-Sync] Lỗi chèn approval_documents từ advance-payments:', aprErr);
      }
    );

    res.status(201).json({
      id: itemId,
      code: itemCode,
      employeeName,
      employeeCode,
      department,
      purpose,
      project,
      amount: Number(amount),
      requestedDate,
      paymentMethod,
      bankInfo,
      status: status || 'pending',
      reviewStatus: reviewStatus || 'unprocessed',
      deadlineRefund,
      note,
      attachedDocsCount,
    });
  });
  stmt.finalize();
});

// 3. Cập nhật phiếu tạm ứng (Duyệt, từ chối, chỉnh sửa)
router.put('/api/advance-payments/:id', (req, res) => {
  const { id } = req.params;
  const {
    status,
    reviewStatus,
    approver,
    approvedDate,
    rejectReason,
    rejectedDate,
    purpose,
    project,
    amount,
    deadlineRefund,
    note,
    paymentMethod,
    bankInfo,
  } = req.body;

  let query = 'UPDATE advance_payments SET updated_at = CURRENT_TIMESTAMP';
  const params = [];

  if (status !== undefined) { query += ', status = ?'; params.push(status); }
  if (reviewStatus !== undefined) { query += ', review_status = ?'; params.push(reviewStatus); }
  if (approver !== undefined) { query += ', approver = ?'; params.push(approver); }
  if (approvedDate !== undefined) { query += ', approved_date = ?'; params.push(approvedDate); }
  if (rejectReason !== undefined) { query += ', reject_reason = ?'; params.push(rejectReason); }
  if (rejectedDate !== undefined) { query += ', rejected_date = ?'; params.push(rejectedDate); }
  if (purpose !== undefined) { query += ', purpose = ?'; params.push(purpose); }
  if (project !== undefined) { query += ', project = ?'; params.push(project); }
  if (amount !== undefined) { query += ', amount = ?'; params.push(Number(amount)); }
  if (deadlineRefund !== undefined) { query += ', deadline_refund = ?'; params.push(deadlineRefund); }
  if (note !== undefined) { query += ', note = ?'; params.push(note); }
  if (paymentMethod !== undefined) { query += ', payment_method = ?'; params.push(paymentMethod); }
  if (bankInfo?.bankName !== undefined) { query += ', bank_name = ?'; params.push(bankInfo.bankName); }
  if (bankInfo?.accountNumber !== undefined) { query += ', bank_account = ?'; params.push(bankInfo.accountNumber); }
  if (bankInfo?.accountName !== undefined) { query += ', bank_account_name = ?'; params.push(bankInfo.accountName); }

  query += ' WHERE id = ?';
  params.push(id);

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    db.get('SELECT * FROM advance_payments WHERE id = ?', [id], (findErr, adv) => {
      if (!findErr && adv) {
        // Đồng bộ sang approval_documents và personal_requests
        if (status !== undefined) {
          const syncStatus = status === 'approved' ? 'approved' : (status === 'rejected' ? 'rejected' : 'pending');
          db.run(
            `UPDATE approval_documents
             SET status = ?, approved_by = ?, approval_date = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
             WHERE code = ? OR id = ? OR id = ?`,
            [syncStatus, adv.approver || 'Ban Giám đốc', adv.approved_date || null, adv.reject_reason || null, adv.code, `APR-${id}`, `APR-REQ-${id}`],
            () => {}
          );
          db.run(
            `UPDATE personal_requests
             SET status = ?, status_label = ?, approver = ?, approval_date = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
             WHERE code = ?`,
            [syncStatus, syncStatus === 'approved' ? 'Đã duyệt' : (syncStatus === 'rejected' ? 'Từ chối' : 'Chờ duyệt'), adv.approver || 'Ban Giám đốc', adv.approved_date || null, adv.reject_reason || null, adv.code],
            () => {}
          );
        }

        // Khi duyệt (status === 'approved'), tự động đồng bộ sang bảng advance_settlements để theo dõi hoàn ứng
        if (status === 'approved') {
          db.get('SELECT id FROM advance_settlements WHERE advance_id = ? OR advance_code = ?', [id, adv.code], (setErr, setRow) => {
            if (!setRow) {
              const settlementId = `set-${Date.now()}`;
              db.run(`
                INSERT INTO advance_settlements (
                  id, advance_id, advance_code, employee_name, employee_code,
                  department, purpose, project, advance_amount, approved_date,
                  approver, deadline_refund, status, actual_spent, invoices
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unsettled', 0, '[]')
              `, [
                settlementId,
                adv.id,
                adv.code,
                adv.employee_name,
                adv.employee_code,
                adv.department,
                adv.purpose,
                adv.project,
                adv.amount,
                adv.approved_date || new Date().toISOString().split('T')[0],
                adv.approver || 'Ban Giám Đốc',
                adv.deadline_refund,
              ]);
            }
          });
        }
      }
    });

    res.json({ success: true, message: 'Cập nhật phiếu tạm ứng thành công' });
  });
});

// 4. Xóa phiếu tạm ứng
router.delete('/api/advance-payments/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT code FROM advance_payments WHERE id = ?', [id], (findErr, adv) => {
    const advCode = adv?.code;
    db.run('DELETE FROM advance_payments WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      // Đồng thời xóa khỏi bảng settlement nếu có
      db.run('DELETE FROM advance_settlements WHERE advance_id = ?', [id]);
      if (advCode) {
        db.run('DELETE FROM approval_documents WHERE code = ? OR id = ?', [advCode, `APR-${id}`], () => {});
      }
      res.json({ success: true, message: 'Đã xóa phiếu tạm ứng' });
    });
  });
});

// ==========================================
// API QUẢN LÝ HOÀN TẠM ỨNG (ADVANCE SETTLEMENTS)
// ==========================================

// 1. Lấy danh sách hoàn tạm ứng
router.get('/api/advance-settlements', (req, res) => {
  const query = 'SELECT * FROM advance_settlements ORDER BY created_at DESC';
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = (rows || []).map((r) => {
      let invoices = [];
      try {
        invoices = r.invoices ? JSON.parse(r.invoices) : [];
      } catch (e) {
        invoices = [];
      }
      return {
        id: r.id,
        advanceId: r.advance_id,
        advanceCode: r.advance_code,
        settlementCode: r.settlement_code,
        employeeName: r.employee_name,
        employeeCode: r.employee_code,
        department: r.department,
        purpose: r.purpose,
        project: r.project,
        advanceAmount: Number(r.advance_amount || 0),
        approvedDate: r.approved_date,
        approver: r.approver,
        deadlineRefund: r.deadline_refund,
        settlementDate: r.settlement_date,
        actualSpent: Number(r.actual_spent || 0),
        status: r.status || 'unsettled',
        invoices,
        note: r.note,
        createdAt: r.created_at,
      };
    });
    res.json(formatted);
  });
});

// 2. Tạo mới / lưu quyết toán hoàn tạm ứng
router.post('/api/advance-settlements', (req, res) => {
  const {
    id,
    advanceId,
    advanceCode,
    settlementCode,
    employeeName,
    employeeCode,
    department,
    purpose,
    project,
    advanceAmount,
    approvedDate,
    approver,
    deadlineRefund,
    settlementDate,
    actualSpent,
    status,
    invoices,
    note,
  } = req.body;

  const itemId = id || `set-${Date.now()}`;
  const stmt = db.prepare(`
    INSERT INTO advance_settlements (
      id, advance_id, advance_code, settlement_code, employee_name, employee_code,
      department, purpose, project, advance_amount, approved_date, approver,
      deadline_refund, settlement_date, actual_spent, status, invoices, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    itemId,
    advanceId || null,
    advanceCode,
    settlementCode || null,
    employeeName,
    employeeCode,
    department,
    purpose,
    project,
    Number(advanceAmount || 0),
    approvedDate,
    approver,
    deadlineRefund,
    settlementDate || null,
    Number(actualSpent || 0),
    status || 'unsettled',
    JSON.stringify(invoices || []),
    note || '',
  ], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ success: true, id: itemId });
  });
  stmt.finalize();
});

// 3. Cập nhật hồ sơ hoàn tạm ứng
router.put('/api/advance-settlements/:id', (req, res) => {
  const { id } = req.params;
  const {
    settlementCode,
    settlementDate,
    actualSpent,
    status,
    invoices,
    note,
  } = req.body;

  let query = 'UPDATE advance_settlements SET updated_at = CURRENT_TIMESTAMP';
  const params = [];

  if (settlementCode !== undefined) { query += ', settlement_code = ?'; params.push(settlementCode); }
  if (settlementDate !== undefined) { query += ', settlement_date = ?'; params.push(settlementDate); }
  if (actualSpent !== undefined) { query += ', actual_spent = ?'; params.push(Number(actualSpent)); }
  if (status !== undefined) { query += ', status = ?'; params.push(status); }
  if (invoices !== undefined) { query += ', invoices = ?'; params.push(JSON.stringify(invoices)); }
  if (note !== undefined) { query += ', note = ?'; params.push(note); }

  query += ' WHERE id = ?';
  params.push(id);

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Cập nhật quyết toán hoàn ứng thành công' });
  });
});

// 4. Xóa hồ sơ hoàn ứng
router.delete('/api/advance-settlements/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM advance_settlements WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Đã xóa hồ sơ hoàn ứng' });
  });
});

// ==========================================
// API QUẢN LÝ LỆNH CHI TIỀN (PAYMENT ORDERS)
// Gửi từ Ban Giám đốc sang Bộ phận Kế toán
// ==========================================

// 1. Lấy danh sách lệnh chi tiền
router.get('/api/finance/payment-orders', (req, res) => {
  const { status, ref_type, search } = req.query;
  let sql = 'SELECT * FROM payment_orders WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (ref_type && ref_type !== 'all') {
    sql += ' AND ref_type = ?';
    params.push(ref_type);
  }
  if (search) {
    sql += ' AND (order_code LIKE ? OR title LIKE ? OR beneficiary_name LIKE ? OR ref_code LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = (rows || []).map((r) => ({
      id: r.id,
      orderCode: r.order_code,
      refType: r.ref_type,
      refId: r.ref_id,
      refCode: r.ref_code,
      title: r.title,
      beneficiaryName: r.beneficiary_name,
      beneficiaryCode: r.beneficiary_code,
      department: r.department,
      amount: Number(r.amount || 0),
      amountInWords: r.amount_in_words,
      paymentMethod: r.payment_method,
      bankName: r.bank_name,
      bankAccount: r.bank_account,
      bankBranch: r.bank_branch,
      purpose: r.purpose,
      dueDate: r.due_date,
      approvedBy: r.approved_by,
      approvedDate: r.approved_date,
      approvalNote: r.approval_note,
      status: r.status,
      statusLabel: r.status_label,
      executedBy: r.executed_by,
      executedDate: r.executed_date,
      voucherId: r.voucher_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(formatted);
  });
});

// 2. Tạo mới một lệnh chi tiền thủ công (nếu cần)
router.post('/api/finance/payment-orders', (req, res) => {
  const b = req.body;
  if (!b.amount || !b.beneficiaryName) {
    return res.status(400).json({ error: 'Thiếu số tiền hoặc người thụ hưởng' });
  }

  const orderId = b.id || `PO-${Date.now()}`;
  const orderCode = b.orderCode || `LC-${Date.now().toString().slice(-6)}`;
  const nowStr = new Date().toLocaleDateString('vi-VN');
  const amountVal = Number(b.amount || 0);

  const stmt = db.prepare(`
    INSERT INTO payment_orders (
      id, order_code, ref_type, ref_id, ref_code, title,
      beneficiary_name, beneficiary_code, department,
      amount, amount_in_words, payment_method, bank_name, bank_account, bank_branch,
      purpose, due_date, approved_by, approved_date, approval_note,
      status, status_label, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  stmt.run([
    orderId,
    orderCode,
    b.refType || 'advance',
    b.refId || null,
    b.refCode || null,
    b.title || `Lệnh chi tiền: ${b.purpose || b.beneficiaryName}`,
    b.beneficiaryName,
    b.beneficiaryCode || 'NV',
    b.department || 'Ban giám đốc',
    amountVal,
    b.amountInWords || readVietnameseCurrency(amountVal),
    b.paymentMethod || 'bank_transfer',
    b.bankName || '',
    b.bankAccount || '',
    b.bankBranch || '',
    b.purpose || '',
    b.dueDate || nowStr,
    b.approvedBy || 'Ban Giám đốc',
    b.approvedDate || nowStr,
    b.approvalNote || '',
    b.status || 'pending',
    b.statusLabel || 'Chờ chi tiền',
  ], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ success: true, id: orderId, orderCode });
  });
  stmt.finalize();
});

// 3. Kế toán xác nhận thực hiện chi tiền (giải ngân)
router.patch('/api/finance/payment-orders/:id/execute', (req, res) => {
  const { id } = req.params;
  const { executedBy, paymentMethod, bankAccount, note } = req.body || {};
  const nowStr = new Date().toLocaleDateString('vi-VN');

  db.get('SELECT * FROM payment_orders WHERE id = ? OR order_code = ?', [id, id], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Không tìm thấy lệnh chi tiền' });

    const voucherCode = `PC-${order.order_code}`;
    const voucherId = `vch-${Date.now()}`;

    // Cập nhật trạng thái lệnh chi
    db.run(
      `UPDATE payment_orders
       SET status = 'completed',
           status_label = 'Đã chi tiền',
           executed_by = ?,
           executed_date = ?,
           voucher_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [executedBy || 'Kế toán thanh toán', nowStr, voucherCode, order.id],
      function (upErr) {
        if (upErr) return res.status(500).json({ error: upErr.message });

        // 1. Tự động lập Phiếu chi trong sổ kế toán financial_vouchers
        db.run(
          `INSERT OR REPLACE INTO financial_vouchers (
            id, voucher_code, voucher_type, date, partner_type, partner_name,
            partner_code, payer_receiver_name, amount, amount_in_words,
            reason, payment_method, debit_account, credit_account, reference_code,
            creator, accountant, director, has_stamp, status, created_at, updated_at
          ) VALUES (?, ?, 'PC', ?, 'employee', ?, ?, ?, ?, ?, ?, ?, '141', ?, ?, ?, ?, ?, 1, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            voucherId,
            voucherCode,
            nowStr,
            order.beneficiary_name,
            order.beneficiary_code,
            order.beneficiary_name,
            order.amount,
            order.amount_in_words,
            order.purpose || order.title,
            paymentMethod || (order.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'),
            order.payment_method === 'cash' ? '1111' : '1121',
            order.ref_code,
            executedBy || 'Kế toán viên',
            executedBy || 'Kế toán thanh toán',
            order.approved_by || 'Ban Giám đốc'
          ],
          () => {}
        );

        // 2. Tự động ghi nhận vào phân hệ Quản lý chi phí (financial_expenses)
        const expenseId = `EXP-${order.order_code}`;
        const creditAcc = order.payment_method === 'cash' ? '1111' : '1121';
        const creditName = order.payment_method === 'cash' ? 'Tiền mặt quỹ (TK 1111)' : 'Tiền gửi ngân hàng (TK 1121)';
        db.run(
          `INSERT OR REPLACE INTO financial_expenses (
            id, code, title, category, category_label, amount, department,
            spend_date, spender, status, status_label, notes,
            debit_account, debit_account_name, credit_account, credit_account_name, operation_type, proposer,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            expenseId,
            voucherCode,
            order.title || order.purpose,
            'administrative',
            'Chi phí quản lý doanh nghiệp',
            order.amount,
            order.department || 'Ban giám đốc',
            nowStr,
            order.beneficiary_name,
            'approved',
            'Đã chi tiền',
            `Chi theo Lệnh chi ${order.order_code} (Căn cứ ${order.ref_code || ''}). Bút phê duyệt: ${order.approval_note || 'Đồng ý phê duyệt'}`,
            '141',
            'Tạm ứng người lao động',
            creditAcc,
            creditName,
            'advance_payment',
            order.beneficiary_name
          ],
          () => {}
        );

        // 3. Tự động cập nhật giảm số dư quỹ tiền mặt (TK 1111) hoặc ngân hàng (TK 1121)
        if (order.payment_method === 'cash') {
          db.run(
            "UPDATE cash_and_bank_assets SET balance = MAX(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE type = 'cash' LIMIT 1",
            [order.amount]
          );
        } else {
          // Trừ vào tài khoản ngân hàng hoạt động chính (cba-002 Vietcombank hoặc tài khoản có số dư lớn nhất)
          db.run(
            "UPDATE cash_and_bank_assets SET balance = MAX(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM cash_and_bank_assets WHERE type = 'bank' AND balance >= ? ORDER BY balance DESC LIMIT 1)",
            [order.amount, order.amount]
          );
        }

        // 4. Đồng bộ trạng thái đã giải ngân trong bảng advance_payments
        if (order.ref_code) {
          db.run(
            `UPDATE advance_payments
             SET status = 'approved', review_status = 'disbursed', updated_at = CURRENT_TIMESTAMP
             WHERE code = ?`,
            [order.ref_code],
            () => {}
          );
        }

        res.json({
          success: true,
          message: 'Đã thực hiện chi tiền và tự động lập Phiếu chi kế toán thành công',
          voucherCode,
          orderCode: order.order_code
        });
      }
    );
  });
});

// 3b. API Biểu đồ diễn biến dòng tiền Thu - Chi và Số dư quỹ 6 tháng + KPI theo kỳ (Tháng / Quý / Năm)
router.get('/api/finance/cashflow-chart', (req, res) => {
  const period = String(req.query.period || 'month'); // 'month' | 'quarter' | 'year'
  const selectedMonthNum = Math.min(Math.max(Number(req.query.month) || 10, 1), 12);
  const selectedYear = Number(req.query.year) || 2026;
  const selectedIsoPrefix = `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}`;

  const allYearMonths = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const mStr = String(m).padStart(2, '0');
    return {
      monthNum: m,
      month: m === 10 ? `T${mStr}/26 (HT)` : `T${mStr}/26`,
      key: `${mStr}/${selectedYear}`,
      isoPrefix: `${selectedYear}-${mStr}`,
    };
  });

  const cxPositions = [84.6, 183.8, 282.9, 382.1, 481.3, 580.4];
  const endWindowMonth = selectedMonthNum < 6 ? 6 : selectedMonthNum > 10 ? selectedMonthNum : 10;
  const startWindowMonth = Math.max(1, endWindowMonth - 5);

  const journalSql = `
    SELECT e.entry_date, l.account_code, l.type, l.amount
    FROM accounting_journal_lines l
    INNER JOIN accounting_journal_entries e ON l.entry_id = e.id
    WHERE l.account_code IN ('1111', '1121')
  `;

  db.all(journalSql, [], (jErr, jRows) => {
    db.all('SELECT voucher_type, date, amount FROM financial_vouchers', (vErr, vRows) => {
      db.all('SELECT type, balance FROM cash_and_bank_assets WHERE status = "active"', (bErr, bRows) => {
        db.all(
          `SELECT mb.openingDebit, mb.openingCredit, a.code
           FROM "MonthlyBalance" mb
           INNER JOIN "AccountingAccount" a ON mb.accountId = a.id
           WHERE a.code IN ('1111', '1121')`,
          [],
          (mbErr, mbRows) => {
            db.all(
              `SELECT createdAt, dueDate, amount, paidAmount, status, type
               FROM "Debt"
               WHERE type IN ('RECEIVABLE', 'phai-thu')`,
              [],
              (dErr, debtRows) => {
                db.get(
                  'SELECT SUM(remaining_amount) as total_rem FROM debt_receivables',
                  [],
                  (drErr, drSumRow) => {
                    const totalCurrentBalance = (bRows || []).reduce(
                      (acc, r) => acc + (Number(r.balance) || 0),
                      0
                    );
                    const openingFund = (mbRows || []).reduce(
                      (acc, r) => acc + ((Number(r.openingDebit) || 0) - (Number(r.openingCredit) || 0)),
                      0
                    );

                    const hasJournalCashLines = Array.isArray(jRows) && jRows.length > 0;
                    let runningBalance = openingFund > 0 ? openingFund : 0;

                    // Tính dòng tiền và số dư quỹ lũy kế cho cả 12 tháng trong năm
                    const fullYearCalculated = allYearMonths.map((cfg) => {
                      const openingMonthBal = runningBalance;
                      let inFlowRaw = 0;
                      let outFlowRaw = 0;

                      if (hasJournalCashLines) {
                        (jRows || []).forEach((row) => {
                          const eDate = String(row.entry_date || '');
                          if (eDate.startsWith(cfg.isoPrefix) || eDate.includes(cfg.key)) {
                            const amt = Number(row.amount) || 0;
                            if (row.type === 'DEBIT') inFlowRaw += amt;
                            else if (row.type === 'CREDIT') outFlowRaw += amt;
                          }
                        });
                      } else {
                        (vRows || []).forEach((v) => {
                          const vDate = String(v.date || '');
                          if (vDate.includes(cfg.key) || vDate.startsWith(cfg.isoPrefix)) {
                            const amt = Number(v.amount) || 0;
                            if (v.voucher_type === 'receipt' || v.voucher_type === 'PT') {
                              inFlowRaw += amt;
                            } else if (v.voucher_type === 'PC' || v.voucher_type === 'payment') {
                              outFlowRaw += amt;
                            }
                          }
                        });
                      }

                      inFlowRaw = Math.round(inFlowRaw);
                      outFlowRaw = Math.round(outFlowRaw);

                      if (inFlowRaw > 0 || outFlowRaw > 0 || cfg.monthNum >= 7) {
                        runningBalance = Math.max(0, runningBalance + inFlowRaw - outFlowRaw);
                      }

                      const hasActivity = inFlowRaw > 0 || outFlowRaw > 0 || (cfg.monthNum >= 7 && cfg.monthNum <= 10);
                      const netBalRaw = hasActivity ? runningBalance : 0;

                      // Tính Công nợ phải thu phát sinh và đã thu trong tháng
                      let debtInvoiced = 0;
                      let debtCollected = 0;
                      (debtRows || []).forEach((d) => {
                        const dt = new Date(Number(d.createdAt || d.dueDate));
                        if (!isNaN(dt.getTime())) {
                          const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
                          if (ym === cfg.isoPrefix) {
                            debtInvoiced += Number(d.amount) || 0;
                            debtCollected += Number(d.paidAmount) || 0;
                          }
                        }
                      });
                      debtInvoiced = Math.round(debtInvoiced);
                      debtCollected = Math.round(debtCollected);
                      const debtNetRemain = Math.max(0, debtInvoiced - debtCollected);

                      return {
                        ...cfg,
                        openingMonthBal: Math.round(openingMonthBal),
                        inFlowRaw,
                        outFlowRaw,
                        netBalRaw: Math.round(netBalRaw),
                        debtInvoiced,
                        debtCollected,
                        debtNetRemain,
                      };
                    });

                    // Cửa sổ 6 tháng hiển thị trên biểu đồ
                    const rawMonths = fullYearCalculated
                      .filter((m) => m.monthNum >= startWindowMonth && m.monthNum <= endWindowMonth)
                      .map((m, idx) => ({
                        ...m,
                        cx: cxPositions[idx] || 84.6 + idx * 99.16,
                      }));

                    const maxValBillions = Math.max(
                      2,
                      ...rawMonths.flatMap((m) => [m.inFlowRaw / 1e9, m.outFlowRaw / 1e9, m.netBalRaw / 1e9])
                    );
                    const yScaleMax =
                      maxValBillions <= 2 ? 2 : maxValBillions <= 5 ? 5 : maxValBillions <= 10 ? 10 : 20;

                    const months = rawMonths.map((m) => {
                      const netBal = +(m.netBalRaw / 1e9).toFixed(3);
                      const cy =
                        netBal > 0 ? +(175 - Math.min(yScaleMax, netBal) * (150 / yScaleMax)).toFixed(2) : 175;
                      const val =
                        m.netBalRaw > 0
                          ? m.netBalRaw >= 1e9
                            ? `${(m.netBalRaw / 1e9).toFixed(2)} tỷ`
                            : `${(m.netBalRaw / 1e6).toFixed(1)} tr`
                          : '0 đ';

                      return {
                        monthNum: m.monthNum,
                        month: m.month,
                        inFlow: +(m.inFlowRaw / 1e9).toFixed(3),
                        outFlow: +(m.outFlowRaw / 1e9).toFixed(3),
                        inFlowRaw: m.inFlowRaw,
                        outFlowRaw: m.outFlowRaw,
                        netBalance: netBal,
                        netBalRaw: m.netBalRaw,
                        openingMonthBal: m.openingMonthBal,
                        debtInvoiced: m.debtInvoiced,
                        debtCollected: m.debtCollected,
                        debtNetRemain: m.debtNetRemain,
                        cx: m.cx,
                        cy,
                        val,
                      };
                    });

                    // Tính toán 4 chỉ số KPI chuẩn xác theo Kỳ được chọn (month | quarter | year)
                    const cumulativeReceivables = Math.round(Number(drSumRow?.total_rem) || 0);
                    let targetMonths = fullYearCalculated.filter((m) => m.monthNum === selectedMonthNum);
                    if (period === 'quarter') {
                      // Kỳ Quý: tổng hợp 3 tháng gần nhất có dữ liệu thực tế trên biểu đồ (T08, T09, T10/2026) đồng bộ với Phòng Kinh doanh
                      targetMonths = fullYearCalculated.filter((m) => [8, 9, 10].includes(m.monthNum));
                    } else if (period === 'year') {
                      // Kỳ Năm: tổng hợp toàn bộ 12 tháng trong năm 2026
                      targetMonths = fullYearCalculated;
                    }

                    const periodInflow = targetMonths.reduce((s, m) => s + m.inFlowRaw, 0);
                    const periodOutflow = targetMonths.reduce((s, m) => s + m.outFlowRaw, 0);
                    const periodDebtInvoiced = targetMonths.reduce((s, m) => s + m.debtInvoiced, 0);
                    const periodDebtCollected = targetMonths.reduce((s, m) => s + m.debtCollected, 0);

                    const periodReceivables =
                      period === 'year'
                        ? cumulativeReceivables
                        : Math.max(0, periodDebtInvoiced - periodDebtCollected);

                    const activeTargetWithBal = [...targetMonths].reverse().find((m) => m.netBalRaw > 0);
                    const periodCashBalance =
                      period === 'month' && selectedMonthNum <= 10
                        ? activeTargetWithBal?.netBalRaw || totalCurrentBalance
                        : totalCurrentBalance;
                    const periodOpeningCash =
                      targetMonths.find((m) => m.inFlowRaw > 0 || m.outFlowRaw > 0)?.openingMonthBal ||
                      Math.round(openingFund);

                    res.json({
                      months,
                      yScaleMax,
                      currentInflow: periodInflow,
                      currentOutflow: periodOutflow,
                      currentBalance: periodCashBalance,
                      currentReceivables: periodReceivables,
                      periodStats: {
                        period,
                        selectedMonth: selectedMonthNum,
                        cashBalance: periodCashBalance,
                        openingCashBalance: periodOpeningCash,
                        inflowTotal: periodInflow,
                        outflowTotal: periodOutflow,
                        receivablesTotal: periodReceivables,
                        receivablesCumulative: cumulativeReceivables,
                        receivablesInvoiced: periodDebtInvoiced,
                        receivablesCollected: periodDebtCollected,
                      },
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  });
});


// 4. Xóa / hủy lệnh chi tiền (Tự động hoàn tiền vào tài khoản, xóa phiếu chi, hoàn trả trạng thái tạm ứng & cập nhật sổ cái)
router.delete('/api/finance/payment-orders/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM payment_orders WHERE id = ? OR order_code = ?', [id, id], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) {
      db.run('DELETE FROM payment_orders WHERE id = ? OR order_code = ?', [id, id]);
      return res.json({ success: true, message: 'Lệnh chi tiền không tồn tại hoặc đã được xóa' });
    }

    // Nếu lệnh chi đã giải ngân (completed hoặc có voucher_id):
    if (order.status === 'completed' || order.voucher_id) {
      const vCode = order.voucher_id || `PC-${order.order_code}`;
      const oAmt = Number(order.amount) || 0;

      // 1. Hoàn lại tiền vào quỹ hoặc tài khoản ngân hàng
      if (oAmt > 0) {
        if (order.payment_method === 'cash') {
          db.run("UPDATE cash_and_bank_assets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE type = 'cash' LIMIT 1", [oAmt]);
        } else {
          db.run("UPDATE cash_and_bank_assets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM cash_and_bank_assets WHERE type = 'bank' ORDER BY balance DESC LIMIT 1)", [oAmt]);
        }
      }

      // 2. Xóa phiếu chi trong financial_vouchers
      db.run("DELETE FROM financial_vouchers WHERE voucher_code = ? OR reference_code = ?", [vCode, order.ref_code || order.order_code]);

      // 3. Xóa chi phí trong financial_expenses
      db.run("DELETE FROM financial_expenses WHERE code = ? OR id = ?", [vCode, order.id]);

      // 4. Xóa bút toán sổ nhật ký chung
      db.run("DELETE FROM accounting_journal_lines WHERE entry_id IN (SELECT id FROM accounting_journal_entries WHERE reference_code = ? OR entry_number = ?)", [vCode, vCode]);
      db.run("DELETE FROM accounting_journal_entries WHERE reference_code = ? OR entry_number = ?", [vCode, vCode]);

      // 5. Trả trạng thái tạm ứng về approved
      if (order.ref_code) {
        db.run("UPDATE advance_payments SET review_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE code = ?", [order.ref_code]);
      }
    }

    // Xóa lệnh chi
    db.run('DELETE FROM payment_orders WHERE id = ? OR order_code = ?', [order.id, order.order_code], function (delErr) {
      if (delErr) return res.status(500).json({ error: delErr.message });
      syncAllSubledgersToJournal(db).catch(() => {});
      res.json({ success: true, message: 'Đã xóa lệnh chi tiền và tự động cập nhật các bảng dữ liệu liên quan thành công' });
    });
  });
});

// 5. API Thông báo dòng tiền (Cashflow notices) cho trang Tổng quan Phòng tài chính (Hình 2)
// CHỈ HIỂN THỊ CÁC NỘI DUNG CHƯA THỰC HIỆN (Lệnh chi chưa thanh toán & Công nợ chưa thu đủ)
router.get('/api/finance/cashflow-notices', (req, res) => {
  db.all(
    "SELECT * FROM payment_orders WHERE status != 'completed' AND status != 'cancelled' ORDER BY created_at DESC",
    [],
    (poErr, poRows) => {
      const notices = [];

      (poRows || []).forEach((r) => {
        notices.push({
          id: r.id,
          type: 'outflow', // Lệnh chi tiền
          title: r.title || `Lệnh chi tạm ứng - ${r.beneficiary_name}`,
          partner: `${r.beneficiary_name} (${r.department || 'Bộ phận'})`,
          code: r.order_code,
          amount: `-${Number(r.amount || 0).toLocaleString('vi-VN')} đ`,
          rawAmount: Number(r.amount || 0),
          dueDate: r.due_date || r.approved_date || 'Ngay khi duyệt',
          status: r.status_label || 'Chờ chi tiền',
          statusVariant: 'danger',
          paymentOrder: {
            id: r.id,
            orderCode: r.order_code,
            refCode: r.ref_code,
            refType: r.ref_type,
            beneficiaryName: r.beneficiary_name,
            beneficiaryCode: r.beneficiary_code,
            department: r.department,
            amount: Number(r.amount || 0),
            amountInWords: r.amount_in_words,
            paymentMethod: r.payment_method,
            bankName: r.bank_name,
            bankAccount: r.bank_account,
            bankBranch: r.bank_branch,
            purpose: r.purpose,
            dueDate: r.due_date,
            approvedBy: r.approved_by,
            approvedDate: r.approved_date,
            approvalNote: r.approval_note,
            status: r.status,
            statusLabel: r.status_label,
            executedBy: r.executed_by,
            executedDate: r.executed_date,
            voucherId: r.voucher_id,
          },
        });
      });

      // Lấy các khoản công nợ phải thu CHƯA THU ĐỦ (remaining_amount > 0 và status != 'completed')
      db.all(
        "SELECT * FROM debt_receivables WHERE remaining_amount > 0 AND status != 'completed' ORDER BY due_date ASC LIMIT 10",
        [],
        (drErr, drRows) => {
          (drRows || []).forEach((r) => {
            notices.push({
              id: `rec-${r.id}`,
              type: 'inflow', // Thu nợ
              title: `Thu hồi công nợ: ${r.customer_name || 'Khách hàng'}`,
              partner: `${r.customer_name || 'Khách hàng'} (${r.project_name || r.project || 'Dự án'})`,
              code: r.code || `PT-${r.id}`,
              amount: `+${Number(r.remaining_amount || 0).toLocaleString('vi-VN')} đ`,
              rawAmount: Number(r.remaining_amount || 0),
              dueDate: r.due_date || 'Theo hợp đồng',
              status: 'Chờ thu nợ',
              statusVariant: 'info',
            });
          });

          res.json(notices);
        }
      );
    }
  );
});

// Route đồng bộ thủ công
router.post('/api/finance/sync-journal', async (req, res) => {
  try {
    await syncAllSubledgersToJournal(db);
    res.json({ success: true, message: 'Đã đồng bộ toàn bộ công nợ và chi phí vào Sổ nhật ký chung thành công' });
  } catch (err) {
    console.error('Lỗi sync-journal:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
