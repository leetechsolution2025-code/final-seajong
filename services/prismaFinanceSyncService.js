/**
 * Đồng bộ dữ liệu Tài chính - Kế toán từ các bảng Prisma thực tế (sau khi khôi phục .db hoặc cập nhật nghiệp vụ)
 * sang hệ thống bảng kế toán chi tiết phục vụ Báo cáo tài chính, Tổng quan Tài chính, Quản lý Công nợ & Sổ Nhật ký chung.
 */

function formatEpochToVNDate(val) {
  if (!val) return '01/10/2026';
  if (typeof val === 'number' || /^\d+$/.test(String(val))) {
    const d = new Date(Number(val));
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [yyyy, mm, dd] = str.slice(0, 10).split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  return str;
}

function formatEpochToISODate(val) {
  if (!val) return '2026-10-01';
  if (typeof val === 'number' || /^\d+$/.test(String(val))) {
    const d = new Date(Number(val));
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  const str = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return str.slice(0, 10);
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve) => {
    db.run(sql, params, function (err) {
      resolve({ err, changes: this ? this.changes : 0 });
    });
  });
}

export async function syncPrismaFinanceToAccountingTables(db) {
  try {
    // 1. Kiểm tra xem bảng Prisma có dữ liệu thực tế không
    const [
      prismaAccounts,
      monthlyBalances,
      prismaJournalEntries,
      prismaJournalLines,
      prismaDebts,
      prismaExpenses,
      prismaAssets,
      prismaBankLoans,
      prismaDisbursements,
      prismaPersonalRequests,
      prismaCustomers,
      prismaSuppliers,
      prismaCarriers,
      prismaEmployees,
      prismaSaleOrders,
      prismaInventoryItems,
      prismaInventoryCategories,
      prismaStockMovements,
      prismaQuotations,
      prismaMarketingLeads,
      prismaMarketingCampaigns,
    ] = await Promise.all([
      dbAll(db, 'SELECT * FROM "AccountingAccount"'),
      dbAll(db, 'SELECT * FROM "MonthlyBalance"'),
      dbAll(db, 'SELECT * FROM "JournalEntry" ORDER BY entryDate ASC'),
      dbAll(db, 'SELECT * FROM "JournalLine"'),
      dbAll(db, 'SELECT * FROM "Debt" ORDER BY createdAt ASC'),
      dbAll(db, 'SELECT * FROM "Expense" ORDER BY ngayChiTra DESC'),
      dbAll(db, 'SELECT * FROM "Asset" ORDER BY createdAt ASC'),
      dbAll(db, 'SELECT * FROM "BankLoan" ORDER BY createdAt DESC'),
      dbAll(db, 'SELECT * FROM "BankDisbursement" ORDER BY disbursementDate DESC'),
      dbAll(db, 'SELECT * FROM "PersonalRequest" ORDER BY createdAt DESC'),
      dbAll(db, 'SELECT * FROM "Customer"'),
      dbAll(db, 'SELECT * FROM "Supplier"'),
      dbAll(db, 'SELECT * FROM "Carrier"'),
      dbAll(db, 'SELECT * FROM "Employee"'),
      dbAll(db, 'SELECT * FROM "SaleOrder" ORDER BY ngayDat DESC'),
      dbAll(db, 'SELECT * FROM "InventoryItem" ORDER BY soLuong DESC'),
      dbAll(db, 'SELECT * FROM "InventoryCategory"'),
      dbAll(db, 'SELECT * FROM "StockMovement" ORDER BY createdAt DESC LIMIT 500'),
      dbAll(db, 'SELECT * FROM "Quotation" ORDER BY ngayBaoGia DESC'),
      dbAll(db, 'SELECT * FROM "MarketingLead"'),
      dbAll(db, 'SELECT * FROM "MarketingCampaign"'),
    ]);

    const accountById = new Map();
    const accountByCode = new Map();
    prismaAccounts.forEach((a) => {
      accountById.set(a.id, a);
      accountByCode.set(String(a.code), a);
    });

    const customerById = new Map();
    prismaCustomers.forEach((c) => customerById.set(c.id, c));

    const supplierById = new Map();
    prismaSuppliers.forEach((s) => supplierById.set(s.id, s));

    const carrierById = new Map();
    prismaCarriers.forEach((c) => carrierById.set(c.id, c));

    const employeeById = new Map();
    prismaEmployees.forEach((e) => employeeById.set(e.id, e));

    // ============================================================================
    // A. ĐỒNG BỘ HỆ THỐNG TÀI KHOẢN KẾ TOÁN (accounting_chart_of_accounts)
    // ============================================================================
    if (prismaAccounts.length > 0) {
      for (const acc of prismaAccounts) {
        const parentAcc = acc.parentId ? accountById.get(acc.parentId) : null;
        const nature =
          acc.type === 'ASSET' || acc.type === 'EXPENSE'
            ? 'DEBIT'
            : acc.type === 'LIABILITY' || acc.type === 'EQUITY' || acc.type === 'REVENUE'
            ? 'CREDIT'
            : 'BOTH';
        await dbRun(
          db,
          `INSERT OR REPLACE INTO accounting_chart_of_accounts (
            code, name, level, parent_code, nature, is_active
          ) VALUES (?, ?, ?, ?, ?, 1)`,
          [
            String(acc.code),
            acc.name || String(acc.code),
            Number(acc.level) || 1,
            parentAcc ? String(parentAcc.code) : null,
            nature,
          ]
        );
      }
    }

    // ============================================================================
    // B. ĐỒNG BỘ SỔ NHẬT KÝ CHUNG (accounting_journal_entries & accounting_journal_lines)
    // ============================================================================
    if (prismaJournalEntries.length > 0 && prismaJournalLines.length > 0) {
      const linesByEntryId = new Map();
      prismaJournalLines.forEach((l) => {
        if (!linesByEntryId.has(l.journalEntryId)) linesByEntryId.set(l.journalEntryId, []);
        linesByEntryId.get(l.journalEntryId).push(l);
      });

      const sourceLabelMap = {
        SALES: 'Bán hàng',
        LOGISTICS: 'Kho vận & Mua hàng',
        CASH: 'Quỹ và Ngân hàng',
        ASSETS: 'Tài sản cố định',
        MANUAL: 'Kế toán tổng hợp',
        PROCUREMENT: 'Mua hàng',
      };

      await dbRun(db, 'BEGIN TRANSACTION');
      // Làm sạch hoàn toàn các bút toán mẫu cũ trước khi đồng bộ 100% từ JournalEntry thực tế
      await dbRun(db, 'DELETE FROM accounting_journal_lines');
      await dbRun(db, 'DELETE FROM accounting_journal_entries');

      let seq = 1;
      for (const je of prismaJournalEntries) {
        const isoDate = formatEpochToISODate(je.entryDate);
        const entryNum = je.referenceCode
          ? `PKT-${String(seq).padStart(4, '0')}-${je.referenceCode}`
          : `PKT-2026-${String(seq).padStart(4, '0')}`;
        seq++;
        const srcMod = je.sourceModule || 'MANUAL';
        const srcLabel = sourceLabelMap[srcMod] || 'Kế toán tổng hợp';

        await dbRun(
          db,
          `INSERT OR REPLACE INTO accounting_journal_entries (
            id, entry_number, entry_date, document_date, reference_code,
            source_module, source_label, description, total_amount,
            status, status_label, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'Đã ghi sổ', 'Kế toán tổng hợp')`,
          [
            je.id,
            entryNum,
            isoDate,
            isoDate,
            je.referenceCode || '',
            srcMod,
            srcLabel,
            je.description || 'Bút toán hạch toán hệ thống',
            Number(je.totalAmount) || 0,
          ]
        );

        const entryLines = linesByEntryId.get(je.id) || [];
        let lineIdx = 1;
        for (const l of entryLines) {
          const acc = accountById.get(l.accountId);
          const accCode = acc ? String(acc.code) : String(l.accountId || '1111');
          const accName = acc ? acc.name : 'Tài khoản kế toán';
          await dbRun(
            db,
            `INSERT OR REPLACE INTO accounting_journal_lines (
              id, entry_id, line_number, account_id, account_code,
              account_name, type, amount, description, partner
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              l.id,
              je.id,
              lineIdx++,
              accCode,
              accCode,
              accName,
              l.type || 'DEBIT',
              Number(l.amount) || 0,
              l.description || je.description || '',
              je.referenceCode || '',
            ]
          );
        }
      }
      await dbRun(db, 'COMMIT');
    }

    // ============================================================================
    // C. ĐỒNG BỘ TÀI SẢN BẰNG TIỀN - SỐ DƯ TỒN QUỸ & NGÂN HÀNG (cash_and_bank_assets)
    // ============================================================================
    let opening111 = 0;
    let opening112 = 0;
    monthlyBalances.forEach((mb) => {
      const acc = accountById.get(mb.accountId);
      if (!acc) return;
      const code = String(acc.code);
      if (code === '1111') {
        opening111 += (Number(mb.openingDebit) || 0) - (Number(mb.openingCredit) || 0);
      } else if (code === '1121') {
        opening112 += (Number(mb.openingDebit) || 0) - (Number(mb.openingCredit) || 0);
      }
    });

    let debit111 = 0,
      credit111 = 0,
      debit112 = 0,
      credit112 = 0;
    prismaJournalLines.forEach((l) => {
      const acc = accountById.get(l.accountId);
      if (!acc) return;
      const code = String(acc.code);
      const amt = Number(l.amount) || 0;
      if (code === '1111') {
        if (l.type === 'DEBIT') debit111 += amt;
        else if (l.type === 'CREDIT') credit111 += amt;
      } else if (code === '1121') {
        if (l.type === 'DEBIT') debit112 += amt;
        else if (l.type === 'CREDIT') credit112 += amt;
      }
    });

    const realCash111Balance = Math.max(0, Math.round(opening111 + debit111 - credit111));
    const realBank112Balance = Math.max(0, Math.round(opening112 + debit112 - credit112));

    if (realCash111Balance > 0 || realBank112Balance > 0) {
      const existingCashRows = await dbAll(db, 'SELECT * FROM cash_and_bank_assets WHERE id IN (?, ?)', ['cba-1111', 'cba-1121']);
      const existingById = new Map();
      (existingCashRows || []).forEach((r) => existingById.set(r.id, r));

      const acc1111 = accountByCode.get('1111');
      const acc111 = accountByCode.get('111');
      const acc1121 = accountByCode.get('1121');
      const acc112 = accountByCode.get('112');

      const ex111 = existingById.get('cba-1111');
      await dbRun(
        db,
        `INSERT OR REPLACE INTO cash_and_bank_assets (
          id, code, name, type, account_number, bank_name, branch, balance,
          currency, term_months, interest_rate, start_date, maturity_date,
          manager_name, status, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VND', 0, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)`,
        [
          'cba-1111',
          ex111?.code || 'TM-1111',
          ex111?.name || `${acc111?.name || 'Tiền mặt'} - ${acc1111?.name || 'Tiền Việt Nam'}`,
          'cash',
          ex111?.account_number || 'TK-1111',
          ex111?.bank_name || 'Quỹ tiền mặt Công ty CP Seajong Việt Nam',
          ex111?.branch || '',
          realCash111Balance,
          Number(ex111?.interest_rate) || 0,
          ex111?.start_date || '01/07/2026',
          ex111?.maturity_date || '',
          ex111?.manager_name || 'Lê Công Vụ',
          `Số dư đầu kỳ: ${opening111.toLocaleString('vi-VN')} đ | Tổng thu: ${debit111.toLocaleString('vi-VN')} đ | Tổng chi: ${credit111.toLocaleString('vi-VN')} đ`,
        ]
      );

      const ex112 = existingById.get('cba-1121');
      const isMockBankNum = !ex112?.account_number || ex112.account_number === '19038899686868';
      const isMockBankName = !ex112?.bank_name || ex112.bank_name.includes('Ngoại Thương / MB / PJBank');
      const realBankNameFromLoan = prismaBankLoans[0]?.bankName || 'Tài khoản Tiền gửi Ngân hàng (TK 1121)';

      await dbRun(
        db,
        `INSERT OR REPLACE INTO cash_and_bank_assets (
          id, code, name, type, account_number, bank_name, branch, balance,
          currency, term_months, interest_rate, start_date, maturity_date,
          manager_name, status, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VND', 0, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)`,
        [
          'cba-1121',
          ex112?.code || 'NH-1121',
          ex112?.name && !ex112.name.includes('(TK 1121)')
            ? ex112.name
            : `${acc112?.name || 'Tiền gửi ngân hàng'} - ${acc1121?.name || 'Tiền Việt Nam'}`,
          'bank',
          isMockBankNum ? 'TK-1121' : ex112.account_number,
          isMockBankName ? realBankNameFromLoan : ex112.bank_name,
          isMockBankName ? '' : (ex112?.branch || ''),
          realBank112Balance,
          isMockBankName ? 0 : (Number(ex112?.interest_rate) || 0),
          ex112?.start_date || '01/07/2026',
          ex112?.maturity_date || '',
          ex112?.manager_name || 'Lê Công Vụ',
          `Tổng thu qua NH: ${Math.round(debit112).toLocaleString('vi-VN')} đ | Tổng chi qua NH: ${Math.round(credit112).toLocaleString('vi-VN')} đ`,
        ]
      );
    }

    // ============================================================================
    // D. ĐỒNG BỘ CÔNG NỢ PHẢI THU (debt_receivables) & CÔNG NỢ PHẢI TRẢ (debt_payables)
    // ============================================================================
    if (prismaDebts.length > 0) {
      await dbRun(db, 'BEGIN TRANSACTION');
      // Dọn dẹp các dòng công nợ mẫu cũ
      await dbRun(db, "DELETE FROM debt_receivables WHERE id LIKE 'REC-SJ-%' OR id LIKE 'SYNC-REC-%'");
      await dbRun(db, "DELETE FROM debt_payables WHERE id LIKE 'PAY-SJ-%' OR id LIKE 'SYNC-PAY-%'");

      // 1. Nhóm Công nợ Phải thu theo Khách hàng
      const recGroups = new Map();
      const receivableDebts = prismaDebts.filter(
        (d) => d.type === 'RECEIVABLE' || d.type === 'phai-thu'
      );

      receivableDebts.forEach((d) => {
        const cust = d.customerId ? customerById.get(d.customerId) : null;
        const cleanName = (cust?.name || d.partnerName || 'Khách hàng')
          .split('–')[0]
          .split(' - ')[0]
          .trim();
        const key = d.customerId || cleanName.toLowerCase();
        if (!recGroups.has(key)) {
          recGroups.set(key, {
            key,
            customerId: d.customerId || (cust ? cust.id : null),
            customerName: cust?.name || cleanName,
            customerAddress: cust?.address || '',
            customerPhone: cust?.dienThoai || '',
            invoices: [],
            payments: [],
            totalContract: 0,
            totalPaid: 0,
            latestDueDate: d.dueDate,
          });
        }
        const g = recGroups.get(key);
        const amt = Number(d.amount) || 0;
        const paid = Number(d.paidAmount) || 0;
        g.totalContract += amt;
        g.totalPaid += paid;
        if (d.dueDate && (!g.latestDueDate || d.dueDate > g.latestDueDate)) {
          g.latestDueDate = d.dueDate;
        }

        if (amt > 0) {
          g.invoices.push(d);
        }
        if (paid > 0 && (amt === 0 || String(d.referenceId || '').startsWith('PT-'))) {
          g.payments.push(d);
        }
      });

      let recIndex = 1;
      for (const g of recGroups.values()) {
        const remain = Math.max(0, Math.round(g.totalContract - g.totalPaid));
        const totalContract = Math.round(g.totalContract);
        const totalPaid = Math.round(g.totalPaid);
        if (totalContract === 0 && remain === 0) continue;

        const id = `SYNC-REC-${String(recIndex).padStart(3, '0')}`;
        const code = `CNPT-${String(recIndex).padStart(3, '0')}`;
        recIndex++;

        const paymentRecords = g.payments.map((p, idx) => ({
          id: p.id || `PAY-REC-${idx}`,
          code: p.referenceId || `PT-${idx + 1}`,
          receiptCode: p.referenceId || `PT-${idx + 1}`,
          title: (p.description || '').split('\n')[0] || `Thu nợ khách hàng ${g.customerName}`,
          date: formatEpochToVNDate(p.createdAt || p.dueDate),
          time: '09:00',
          amount: Math.round(Number(p.paidAmount) || 0),
          method: 'Chuyển khoản',
          debitAccount: '1121',
          creditAccount: '131',
          payerName: g.customerName,
          payerAddress: g.customerAddress,
        }));

        // Phân bổ tiền đã thu vào các đợt hóa đơn
        let unallocatedPaid = totalPaid;
        const entries = g.invoices.map((inv, idx) => {
          const invVal = Math.round(Number(inv.amount) || 0);
          const allocPaid = Math.min(invVal, Math.max(0, unallocatedPaid));
          unallocatedPaid = Math.max(0, unallocatedPaid - allocPaid);
          const invRemain = Math.max(0, invVal - allocPaid);
          const refCode = inv.referenceId || `${code}-D${idx + 1}`;
          const descClean = (inv.description || '').split('\n\n[PAYMENT_LOGS]')[0].trim();

          return {
            id: inv.id || `ENT-REC-${idx + 1}`,
            code: refCode,
            title: descClean || (refCode === 'Dư nợ đầu kỳ' ? 'Dư nợ đầu kỳ chuyển sang' : `Đơn bán hàng ${refCode}`),
            date: formatEpochToVNDate(inv.createdAt || inv.dueDate),
            time: '08:30',
            contractValue: invVal,
            paidAmount: allocPaid,
            remainingAmount: invRemain,
            dueDate: formatEpochToVNDate(inv.dueDate || inv.createdAt),
            status: invRemain <= 0 ? 'completed' : allocPaid > 0 ? 'partial' : 'ontime',
            statusLabel: invRemain <= 0 ? 'Đã thu đủ' : allocPaid > 0 ? 'Thu một phần' : 'Chờ thanh toán',
            payments: idx === 0 ? paymentRecords : [],
          };
        });

        const latestInvoiceRef =
          g.invoices.length > 0
            ? g.invoices[g.invoices.length - 1].referenceId || 'Hợp đồng đại lý phân phối'
            : 'Hợp đồng đại lý phân phối';
        const projectTitle =
          g.invoices.length > 1
            ? `${g.invoices.length} đơn hàng / đợt công nợ (Mới nhất: ${latestInvoiceRef})`
            : latestInvoiceRef === 'Dư nợ đầu kỳ'
            ? 'Công nợ đầu kỳ đại lý phân phối Seajong'
            : `Đơn bán hàng ${latestInvoiceRef}`;

        const status = remain <= 0 ? 'completed' : totalPaid > 0 ? 'ontime' : 'due';
        const statusLabel = remain <= 0 ? 'Đã thu đủ' : totalPaid > 0 ? 'Đang thu hồi nợ' : 'Chờ thu nợ';

        await dbRun(
          db,
          `INSERT OR REPLACE INTO debt_receivables (
            id, code, customer_id, customer_name, customer_address, project_name,
            contract_value, paid_amount, remaining_amount, due_date,
            status, status_label, manager_name, notes, entries_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Phòng Kinh doanh Seajong', ?, ?, CURRENT_TIMESTAMP)`,
          [
            id,
            code,
            g.customerId,
            g.customerName,
            g.customerAddress,
            projectTitle,
            totalContract,
            totalPaid,
            remain,
            formatEpochToVNDate(g.latestDueDate),
            status,
            statusLabel,
            `Tổng phát sinh: ${totalContract.toLocaleString('vi-VN')} đ | Đã thu: ${totalPaid.toLocaleString('vi-VN')} đ`,
            JSON.stringify(entries),
          ]
        );

        // Đồng bộ các phiếu thu (PT-*) vào financial_vouchers
        for (const pr of paymentRecords) {
          if (pr.amount > 0) {
            await dbRun(
              db,
              `INSERT OR REPLACE INTO financial_vouchers (
                id, voucher_code, voucher_type, date, partner_type, partner_name,
                payer_receiver_name, address, amount, reason, payment_method,
                debit_account, credit_account, reference_code, status, has_stamp
              ) VALUES (?, ?, 'receipt', ?, 'customer', ?, ?, ?, ?, ?, 'Chuyển khoản', '1121', '131', ?, 'completed', 1)`,
              [
                `VCH-${pr.id}`,
                pr.code,
                pr.date,
                g.customerName,
                g.customerName,
                g.customerAddress,
                pr.amount,
                pr.title,
                code,
              ]
            );
          }
        }
      }

      // 2. Nhóm Công nợ Phải trả theo Nhà cung cấp / Đơn vị vận chuyển
      const payGroups = new Map();
      const payableDebts = prismaDebts.filter(
        (d) => d.type === 'PAYABLE' || d.type === 'phai-tra'
      );

      payableDebts.forEach((d) => {
        const supp = d.supplierId ? supplierById.get(d.supplierId) : null;
        const carr = d.carrierId ? carrierById.get(d.carrierId) : null;
        const cleanName = (supp?.name || carr?.name || d.partnerName || 'Nhà cung cấp')
          .split('–')[0]
          .split(' - ')[0]
          .trim();
        const key = d.supplierId || d.carrierId || cleanName.toLowerCase();
        if (!payGroups.has(key)) {
          payGroups.set(key, {
            key,
            partnerName: supp?.name || carr?.name || cleanName,
            partnerAddress: supp?.address || carr?.address || '',
            partnerType: carr || d.carrierId ? 'transporter' : 'supplier',
            bills: [],
            payments: [],
            totalAmount: 0,
            totalPaid: 0,
            latestDueDate: d.dueDate,
          });
        }
        const g = payGroups.get(key);
        const amt = Number(d.amount) || 0;
        const paid = Number(d.paidAmount) || 0;
        g.totalAmount += amt;
        g.totalPaid += paid;
        if (d.dueDate && (!g.latestDueDate || d.dueDate > g.latestDueDate)) {
          g.latestDueDate = d.dueDate;
        }
        if (amt > 0) g.bills.push(d);
        if (paid > 0 && (amt === 0 || String(d.referenceId || '').startsWith('PC-'))) {
          g.payments.push(d);
        }
      });

      let payIndex = 1;
      for (const g of payGroups.values()) {
        const totalAmount = Math.round(g.totalAmount);
        const totalPaid = Math.round(g.totalPaid);
        const remain = Math.max(0, totalAmount - totalPaid);
        if (totalAmount === 0 && remain === 0) continue;

        const id = `SYNC-PAY-${String(payIndex).padStart(3, '0')}`;
        const code =
          g.partnerType === 'transporter'
            ? `CNVC-${String(payIndex).padStart(3, '0')}`
            : `CNPT-NCC-${String(payIndex).padStart(3, '0')}`;
        payIndex++;

        let unallocatedPaid = totalPaid;
        const entries = g.bills.map((b, idx) => {
          const bVal = Math.round(Number(b.amount) || 0);
          const allocPaid = Math.min(bVal, Math.max(0, unallocatedPaid));
          unallocatedPaid = Math.max(0, unallocatedPaid - allocPaid);
          const bRemain = Math.max(0, bVal - allocPaid);
          const refCode = b.referenceId || `${code}-PO${idx + 1}`;
          const descClean = (b.description || '').split('\n\n[PAYMENT_LOGS]')[0].trim();

          return {
            id: b.id || `ENT-PAY-${idx + 1}`,
            code: refCode,
            title: descClean || `Đơn mua hàng ${refCode}`,
            date: formatEpochToVNDate(b.createdAt || b.dueDate),
            totalAmount: bVal,
            paidAmount: allocPaid,
            remainingAmount: bRemain,
            dueDate: formatEpochToVNDate(b.dueDate || b.createdAt),
            status: bRemain <= 0 ? 'completed' : 'pending',
            statusLabel: bRemain <= 0 ? 'Đã thanh toán' : 'Chờ thanh toán',
          };
        });

        const latestPoCode =
          g.bills.length > 0 ? g.bills[g.bills.length - 1].referenceId || code : code;
        const status = remain <= 0 ? 'completed' : 'pending';
        const statusLabel = remain <= 0 ? 'Đã hoàn tất' : 'Chờ thanh toán';

        await dbRun(
          db,
          `INSERT OR REPLACE INTO debt_payables (
            id, code, supplier_name, supplier_address, po_code,
            total_amount, paid_amount, remaining_amount, due_date,
            status, status_label, accountant, notes, partner_type, entries_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Kế toán công nợ Seajong', ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            id,
            code,
            g.partnerName,
            g.partnerAddress,
            latestPoCode,
            totalAmount,
            totalPaid,
            remain,
            formatEpochToVNDate(g.latestDueDate),
            status,
            statusLabel,
            `Tổng nợ phát sinh: ${totalAmount.toLocaleString('vi-VN')} đ | Đã thanh toán: ${totalPaid.toLocaleString('vi-VN')} đ`,
            g.partnerType,
            JSON.stringify(entries),
          ]
        );
      }

      await dbRun(db, 'COMMIT');
    }

    // ============================================================================
    // E. ĐỒNG BỘ CHI PHÍ (financial_expenses) & LỆNH CHI TIỀN (payment_orders)
    // ============================================================================
    if (prismaExpenses.length > 0) {
      await dbRun(db, 'BEGIN TRANSACTION');
      let expIdx = 1;
      for (const exp of prismaExpenses) {
        const amt = Math.round(Number(exp.soTien) || 0);
        if (amt <= 0) continue;
        const isPaid = exp.trangThai === 'paid';
        const vnDate = formatEpochToVNDate(exp.ngayChiTra || exp.createdAt);
        const code = isPaid
          ? `PC-${String(expIdx).padStart(4, '0')}`
          : `LC-${String(expIdx).padStart(4, '0')}`;
        const orderCode = `LC-2026-${String(expIdx).padStart(4, '0')}`;
        expIdx++;

        const title = exp.tenChiPhi || 'Chi phí hoạt động kinh doanh';
        const loaiLower = (exp.loai || '').toLowerCase();
        let category = 'administrative';
        let categoryLabel = 'Chi phí quản lý doanh nghiệp';
        let debitAcc = '642';
        let debitAccName = 'Chi phí quản lý doanh nghiệp';

        if (loaiLower.includes('mua hàng') || exp.referenceType === 'PURCHASE_ORDER') {
          category = 'production';
          categoryLabel = 'Chi phí mua hàng & sản xuất';
          debitAcc = '331';
          debitAccName = 'Phải trả cho người bán';
        } else if (loaiLower.includes('tạm ứng') || exp.referenceType === 'PERSONAL_REQUEST') {
          category = 'administrative';
          categoryLabel = 'Tạm ứng lương & phúc lợi';
          debitAcc = '141';
          debitAccName = 'Tạm ứng nhân viên';
        } else if (loaiLower.includes('bán hàng') || loaiLower.includes('vận chuyển')) {
          category = 'sales';
          categoryLabel = 'Chi phí bán hàng & vận chuyển';
          debitAcc = '641';
          debitAccName = 'Chi phí bán hàng';
        }

        const isCash = (exp.ghiChu || '').toLowerCase().includes('tiền mặt');
        const creditAcc = isCash ? '1111' : '1121';
        const creditAccName = isCash ? 'Tiền mặt tại quỹ (TK 1111)' : 'Tiền gửi Ngân hàng (TK 1121)';

        await dbRun(
          db,
          `INSERT OR REPLACE INTO financial_expenses (
            id, code, title, category, category_label, amount, department,
            spend_date, spender, status, status_label, notes,
            debit_account, debit_account_name, credit_account, credit_account_name,
            operation_type, proposer, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            exp.id,
            code,
            title,
            category,
            categoryLabel,
            amt,
            exp.referenceType === 'PURCHASE_ORDER' ? 'Phòng Mua hàng & Kho vận' : 'Phòng Hành chính - Nhân sự',
            vnDate,
            exp.nguoiChiTra || 'Kế toán thanh toán',
            isPaid ? 'approved' : 'pending',
            isPaid ? 'Đã chi tiền' : 'Chờ chi tiền',
            exp.ghiChu || '',
            debitAcc,
            debitAccName,
            creditAcc,
            creditAccName,
            exp.referenceType || 'EXPENSE',
            exp.nguoiChiTra || '',
          ]
        );

        // Đồng bộ vào Lệnh chi tiền (payment_orders) để hiển thị trên Thông báo dòng tiền & Theo dõi dòng tiền
        await dbRun(
          db,
          `INSERT OR REPLACE INTO payment_orders (
            id, order_code, ref_type, ref_id, ref_code, title,
            beneficiary_name, beneficiary_code, department,
            amount, amount_in_words, payment_method, bank_name, bank_account, bank_branch,
            purpose, due_date, approved_by, approved_date, approval_note,
            status, status_label, executed_by, executed_date, voucher_id, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, 'Lê Công Vụ (Giám đốc)', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            `PO-${exp.id}`,
            orderCode,
            exp.referenceType === 'PERSONAL_REQUEST' ? 'advance' : 'procurement',
            exp.referenceId || exp.id,
            exp.referenceId || code,
            title,
            exp.nguoiChiTra || 'Đối tác thụ hưởng',
            exp.referenceId || 'NCC',
            exp.referenceType === 'PURCHASE_ORDER' ? 'Phòng Mua hàng' : 'Phòng Nhân sự',
            amt,
            `${amt.toLocaleString('vi-VN')} đồng`,
            isCash ? 'cash' : 'bank_transfer',
            isCash ? 'Quỹ tiền mặt' : 'Chuyển khoản Ngân hàng',
            title,
            vnDate,
            vnDate,
            exp.ghiChu || 'Đã phê duyệt lệnh chi',
            isPaid ? 'completed' : 'pending',
            isPaid ? 'Đã chi tiền' : 'Chờ chi tiền',
            isPaid ? 'Kế toán thanh toán' : null,
            isPaid ? vnDate : null,
            isPaid ? code : null,
          ]
        );

        if (isPaid) {
          await dbRun(
            db,
            `INSERT OR REPLACE INTO financial_vouchers (
              id, voucher_code, voucher_type, date, partner_type, partner_name,
              payer_receiver_name, amount, reason, payment_method,
              debit_account, credit_account, reference_code, notes, status, has_stamp
            ) VALUES (?, ?, 'payment', ?, 'supplier', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 1)`,
            [
              `VCH-EXP-${exp.id}`,
              code,
              vnDate,
              exp.nguoiChiTra || 'Đối tác',
              exp.nguoiChiTra || 'Đối tác',
              amt,
              title,
              isCash ? 'Tiền mặt' : 'Chuyển khoản',
              debitAcc,
              creditAcc,
              exp.referenceId || code,
              exp.ghiChu || '',
            ]
          );
        }
      }
      await dbRun(db, 'COMMIT');
    }

    // ============================================================================
    // F. ĐỒNG BỘ TẠM ỨNG NHÂN VIÊN (advance_payments) TỪ PersonalRequest
    // ============================================================================
    if (prismaPersonalRequests.length > 0) {
      for (const req of prismaPersonalRequests) {
        if (req.type !== 'salary-advance' && req.type !== 'advance') continue;
        let details = {};
        try {
          details = JSON.parse(req.details || '{}');
        } catch {}
        const emp = req.employeeId ? employeeById.get(req.employeeId) : null;
        const amt = Number(details.amount) || 3000000;
        const isApproved = req.status === 'APPROVED' || req.directorApproved === 1;
        const vnDate = formatEpochToVNDate(req.createdAt || req.startDate);

        await dbRun(
          db,
          `INSERT OR REPLACE INTO advance_payments (
            id, code, employee_name, employee_code, department, purpose, project,
            amount, requested_date, payment_method, bank_name, bank_account, bank_account_name,
            status, review_status, approver, approved_date, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.id,
            req.id,
            emp?.fullName || 'Cán bộ nhân viên',
            emp?.employeeCode || req.employeeId || 'NV',
            'Công ty CP Seajong Việt Nam',
            details.reason || req.reason || 'Tạm ứng lương cá nhân',
            details.salaryMonth ? `Lương tháng ${details.salaryMonth}` : 'Tạm ứng lương',
            amt,
            vnDate,
            (details.paymentMethod || '').toLowerCase().includes('mặt') ? 'cash' : 'bank_transfer',
            details.bankName || '',
            details.bankAccount || '',
            details.bankAccountName || '',
            isApproved ? 'approved' : 'pending',
            isApproved ? 'disbursed' : 'unprocessed',
            isApproved ? 'Lê Công Vụ' : null,
            isApproved ? formatEpochToVNDate(req.updatedAt) : null,
            req.directorNote || req.hrNote || '',
          ]
        );
      }
    }

    // ============================================================================
    // G. ĐỒNG BỘ NỢ VAY NGÂN HÀNG (bank_loans & bank_loan_drawdowns)
    // ============================================================================
    if (prismaBankLoans.length > 0) {
      for (const bl of prismaBankLoans) {
        const limit = Number(bl.creditLimit) || 0;
        const disbs = prismaDisbursements.filter((d) => d.bankLoanId === bl.id);
        const totalDisbursed = disbs.reduce((s, d) => s + (Number(d.amount) || 0), 0) || limit;
        const totalPaidPrin = disbs.reduce((s, d) => s + (Number(d.paidPrincipal) || 0), 0);
        const remainPrin = Math.max(0, totalDisbursed - totalPaidPrin);
        const avgRate = disbs.length > 0 && disbs[0].interestRate ? Number(disbs[0].interestRate) : 8.5;
        const monthlyInt = Math.round((remainPrin * avgRate) / 100 / 12);

        await dbRun(
          db,
          `INSERT OR REPLACE INTO bank_loans (
            id, code, bank_name, contract_code, facility_type, facility_label,
            term_type, loan_limit, paid_principal, remaining_principal, due_within_12m,
            interest_rate, interest_rate_val, interest_type, interest_payment_day,
            monthly_interest_est, start_date, maturity_date, collateral_name, collateral_value,
            status, status_label, loan_type, notes, updated_at
          ) VALUES (?, ?, ?, ?, 'investment', ?, 'long_term', ?, ?, ?, ?, ?, ?, 'floating', 25, ?, ?, ?, ?, ?, 'active', 'Dư nợ trong hạn', ?, ?, CURRENT_TIMESTAMP)`,
          [
            bl.id,
            bl.contractNumber || 'HD-VAY-01',
            bl.bankName || 'Ngân hàng TMCP',
            bl.contractNumber || 'HD01',
            disbs[0]?.purpose || 'Vay mua tài sản cố định / vốn kinh doanh',
            limit,
            totalPaidPrin,
            remainPrin,
            Math.round(remainPrin / 5),
            `${avgRate}% / năm`,
            avgRate,
            monthlyInt,
            formatEpochToVNDate(bl.startDate),
            formatEpochToVNDate(bl.maturityDate),
            bl.collateralType || 'Tài sản hình thành từ vốn vay',
            Number(bl.collateralValue) || limit,
            bl.loanType || 'vay_tung_lan',
            disbs[0]?.purpose || '',
          ]
        );

        for (const d of disbs) {
          const dAmt = Number(d.amount) || 0;
          const dPaid = Number(d.paidPrincipal) || 0;
          await dbRun(
            db,
            `INSERT OR REPLACE INTO bank_loan_drawdowns (
              id, loan_id, drawdown_code, drawdown_date, maturity_date,
              amount, paid_principal, remaining_principal, interest_rate,
              purpose, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              d.id,
              bl.id,
              d.disbursementNumber || 'KUNN-01',
              formatEpochToVNDate(d.disbursementDate),
              formatEpochToVNDate(d.maturityDate || bl.maturityDate),
              dAmt,
              dPaid,
              Math.max(0, dAmt - dPaid),
              Number(d.interestRate) || avgRate,
              d.purpose || 'Giải ngân theo hợp đồng tín dụng',
              d.status === 'PAID' ? 'closed' : 'active',
            ]
          );
        }
      }
    }

    // ============================================================================
    // H. ĐỒNG BỘ TÀI SẢN CỐ ĐỊNH (fixed_assets) TỪ Asset
    // ============================================================================
    if (prismaAssets.length > 0) {
      let assetIdx = 1;
      for (const a of prismaAssets) {
        const orig = Number(a.giaTriMua) || 0;
        const resVal = Number(a.giaTriConLai !== null && a.giaTriConLai !== undefined ? a.giaTriConLai : orig);
        const accDep = Math.max(0, orig - resVal);
        const id = a.id || `TS-${String(assetIdx).padStart(3, '0')}`;
        assetIdx++;

        await dbRun(
          db,
          `INSERT OR REPLACE INTO fixed_assets (
            id, code, name, category, category_label, original_price, residual_value,
            accumulated_depreciation, department, manager_name, status, status_label,
            serial_number, purchased_date, depreciation_months, depreciation_start_date,
            maintenance_cycle, notes, account_code, depreciation_account_code, updated_at
          ) VALUES (?, ?, ?, 'machinery', ?, ?, ?, ?, ?, ?, 'active', 'Đang sử dụng', ?, ?, ?, ?, ?, ?, '211', '2141', CURRENT_TIMESTAMP)`,
          [
            id,
            a.code || id,
            a.tenTaiSan || 'Tài sản cố định',
            a.loai || 'Máy móc, thiết bị',
            orig,
            resVal,
            accDep,
            a.donVi || 'Bộ phận sản xuất',
            a.nguoiSuDungId || 'Ban Quản lý',
            a.serialNumber || a.model || '',
            formatEpochToVNDate(a.ngayMua),
            Number(a.soThangKhauHao) || 36,
            formatEpochToVNDate(a.ngayBatDauKhauHao || a.ngayMua),
            a.chuKyBaoDuong ? `${a.chuKyBaoDuong} tháng` : '6 tháng',
            a.ghiChu || '',
          ]
        );
      }
    }

    // ============================================================================
    // I. ĐỒNG BỘ DOANH THU HỢP ĐỒNG / ĐƠN HÀNG BÁN (contracts) TỪ SaleOrder
    // ============================================================================
    if (prismaSaleOrders.length > 0) {
      await dbRun(db, 'BEGIN TRANSACTION');
      for (const so of prismaSaleOrders) {
        if (so.trangThai === 'cancelled') continue;
        const cust = so.customerId ? customerById.get(so.customerId) : null;
        const val = Math.round(Number(so.tongTien) || 0);
        const paid = Math.round(Number(so.daThanhToan) || 0);
        if (val <= 0) continue;
        const pct = val > 0 ? Math.min(100, Math.round((paid / val) * 100)) : 0;

        await dbRun(
          db,
          `INSERT OR REPLACE INTO contracts (
            id, contract_code, project_name, investor_name, package_scope,
            contract_value, disbursed_value, disbursed_percent,
            sign_date, handover_deadline, warranty_months,
            status, status_label, lead_person, lead_role, updated_at
          ) VALUES (?, ?, ?, ?, 'Cung cấp thiết bị phòng tắm & sen vòi Seajong', ?, ?, ?, ?, ?, 24, ?, ?, 'Phòng Kinh doanh', 'Chuyên viên KD', CURRENT_TIMESTAMP)`,
          [
            so.id,
            so.code || `DBH-${so.id.slice(-6)}`,
            `Đơn hàng ${so.code || ''} - ${cust?.name || so.nguoiNhan || 'Khách hàng đại lý'}`,
            cust?.name || so.nguoiNhan || 'Khách hàng đại lý',
            val,
            paid,
            pct,
            formatEpochToVNDate(so.ngayDat),
            formatEpochToVNDate(so.ngayGiao || so.ngayDat),
            so.trangThai === 'completed' ? 'completed' : 'in_progress',
            so.trangThai === 'completed' ? 'Đã hoàn thành' : 'Đang thực hiện',
          ]
        );
      }
      await dbRun(db, 'COMMIT');
    }

    // ============================================================================
    // J. ĐỒNG BỘ HÀNG TỒN KHO (goods & warehouse_movements) TỪ InventoryItem & StockMovement
    // ============================================================================
    let totalRealInventoryValue = 0;
    let totalRawMaterialsValue = 0;
    let totalFinishedGoodsValue = 0;

    if (prismaInventoryItems.length > 0) {
      const catById = new Map();
      (prismaInventoryCategories || []).forEach((c) => catById.set(c.id, c.name));

      await dbRun(db, 'BEGIN TRANSACTION');
      await dbRun(db, 'DELETE FROM goods');

      for (const item of prismaInventoryItems) {
        const qty = Number(item.soLuong) || 0;
        const minQty = Number(item.soLuongMin) || 5;
        const costPrice = Math.round(
          Number(item.giaVon) || Number(item.giaNhap) || Math.round((Number(item.giaBan) || 0) * 0.65) || 0
        );
        const purchasePrice = Math.round(Number(item.giaNhap) || costPrice);
        const sellingPrice = Math.round(Number(item.giaBan) || Math.round(costPrice * 1.35));
        const catName = (item.categoryId && catById.get(item.categoryId)) || item.loai || 'Thiết bị phòng tắm Seajong';
        const isRaw =
          String(item.loai || '').toLowerCase().includes('vật tư') ||
          String(item.loai || '').toLowerCase().includes('linh kiện') ||
          String(catName).toLowerCase().includes('phụ kiện');
        const warehouseName = isRaw ? 'Kho Vật tư & Linh kiện' : 'Kho Thành phẩm Seajong';

        if (qty > 0 && costPrice > 0) {
          const itemVal = Math.round(qty * costPrice);
          totalRealInventoryValue += itemVal;
          if (isRaw) totalRawMaterialsValue += itemVal;
          else totalFinishedGoodsValue += itemVal;
        }

        const status = qty <= 0 ? 'out_of_stock' : qty <= minQty ? 'low_stock' : 'in_stock';
        const statusLabel = qty <= 0 ? 'Hết hàng' : qty <= minQty ? 'Sắp hết hàng' : 'Còn hàng';

        await dbRun(
          db,
          `INSERT OR REPLACE INTO goods (
            id, code, name, category, warehouse, image_url,
            system_stock, reserved_stock, min_stock, actual_stock,
            unit, purchase_price, cost_price, selling_price,
            supplier, brand, length, width, thickness,
            status, status_label, notes, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            item.id,
            item.code || item.id,
            item.tenHang || 'Sản phẩm Seajong',
            catName,
            warehouseName,
            item.imageUrl || '',
            qty,
            minQty,
            qty,
            item.donVi || 'Bộ',
            purchasePrice,
            costPrice,
            sellingPrice,
            item.nhaCungCap || 'Nhà máy Seajong',
            item.brand || 'Seajong',
            Number(item.chieuDai) || 0,
            Number(item.chieuRong) || 0,
            Number(item.chieuDay) || 0,
            status,
            statusLabel,
            item.ghiChu || item.thongSoKyThuat || '',
          ]
        );
      }

      // Đồng bộ biến động xuất nhập tồn kho kỳ 2026-10
      await dbRun(db, 'DELETE FROM warehouse_movements');
      const itemMap = new Map();
      prismaInventoryItems.forEach((it) => itemMap.set(it.id, it));

      const movByItem = new Map();
      (prismaStockMovements || []).forEach((m) => {
        if (!m.inventoryItemId) return;
        if (!movByItem.has(m.inventoryItemId)) {
          movByItem.set(m.inventoryItemId, { inQty: 0, outQty: 0 });
        }
        const g = movByItem.get(m.inventoryItemId);
        const q = Math.abs(Number(m.quantity) || 0);
        if (String(m.type).toUpperCase().includes('IN') || String(m.type).toUpperCase().includes('NHAP')) {
          g.inQty += q;
        } else {
          g.outQty += q;
        }
      });

      let movIdx = 1;
      for (const item of prismaInventoryItems.slice(0, 250)) {
        const closing = Math.max(0, Number(item.soLuong) || 0);
        const mv = movByItem.get(item.id) || { inQty: 0, outQty: 0 };
        const opening = Math.max(0, closing - mv.inQty + mv.outQty);
        const uPrice = Math.round(
          Number(item.giaVon) || Number(item.giaNhap) || Math.round((Number(item.giaBan) || 0) * 0.65) || 0
        );
        if (closing === 0 && mv.inQty === 0 && mv.outQty === 0) continue;

        await dbRun(
          db,
          `INSERT OR REPLACE INTO warehouse_movements (
            id, good_id, period, opening_stock, in_stock, out_stock, closing_stock, unit_price
          ) VALUES (?, ?, '2026-10', ?, ?, ?, ?, ?)`,
          [`WHM-${movIdx++}`, item.id, opening, mv.inQty, mv.outQty, closing, uPrice]
        );
      }
      await dbRun(db, 'COMMIT');
    }

    // ============================================================================
    // K. ĐỒNG BỘ BÁO GIÁ (quotations) TỪ Quotation
    // ============================================================================
    if (prismaQuotations.length > 0) {
      await dbRun(db, 'BEGIN TRANSACTION');
      await dbRun(db, 'DELETE FROM quotations');
      for (const q of prismaQuotations) {
        const cust = q.customerId ? customerById.get(q.customerId) : null;
        const emp = q.nguoiPhuTrachId ? employeeById.get(q.nguoiPhuTrachId) : null;
        const totalVal = Math.round(Number(q.thanhTien || q.tongTien) || 0);
        const st = q.trangThai === 'approved' ? 'approved' : q.trangThai === 'draft' ? 'draft' : 'sent';
        const stLabel = st === 'approved' ? 'Đã phê duyệt' : st === 'draft' ? 'Bản nháp' : 'Đã gửi báo giá';

        await dbRun(
          db,
          `INSERT OR REPLACE INTO quotations (
            id, code, customer_name, project_name, contact_person, phone,
            category, total_value, created_date, effective_date, creator_name,
            status, status_label, notes, items_json, customer_address, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, CURRENT_TIMESTAMP)`,
          [
            q.id,
            q.code || `BG-${q.id.slice(-6)}`,
            cust?.name || 'Đối tác Đại lý Seajong',
            `Báo giá chính sách đại lý ${q.code || ''}`,
            cust?.daiDien || cust?.name || 'Đại diện đại lý',
            cust?.dienThoai || '',
            q.type === 'agency' ? 'Đại lý phân phối' : 'Khách lẻ / Dự án',
            totalVal,
            formatEpochToVNDate(q.ngayBaoGia || q.createdAt),
            formatEpochToVNDate(q.ngayHetHan || q.ngayBaoGia || q.createdAt),
            emp?.fullName || 'Phòng Kinh doanh',
            st,
            stLabel,
            q.ghiChu || '',
            cust?.address || '',
          ]
        );
      }
      await dbRun(db, 'COMMIT');
    }

    // ============================================================================
    // L. ĐỒNG BỘ BẢNG LƯƠNG NHÂN SỰ (monthly_payrolls) TỪ Employee THỰC TẾ
    // ============================================================================
    if (prismaEmployees.length > 0) {
      await dbRun(db, 'BEGIN TRANSACTION');
      await dbRun(db, 'DELETE FROM monthly_payrolls');
      let pIdx = 1;
      for (const emp of prismaEmployees) {
        const baseSal = Number(emp.baseSalary) || 0;
        const insSal = Number(emp.insuranceSalary) || 0;
        const meal = Number(emp.mealAllowance) || 0;
        const fuel = Number(emp.fuelAllowance) || 0;
        const phone = Number(emp.phoneAllowance) || 0;
        const sen = Number(emp.seniorityAllowance) || 0;
        const totalAllow = meal + fuel + phone + sen;
        const insDed = Math.round(insSal * 0.105);
        const corpIns = Math.round(insSal * 0.215);
        const netSal = Math.max(0, baseSal + totalAllow - insDed);

        await dbRun(
          db,
          `INSERT OR REPLACE INTO monthly_payrolls (
            id, user_id, employee_code, employee_name, department, position,
            month, year, base_salary, insurance_salary, standard_workdays, actual_workdays,
            work_salary, meal_allowance, fuel_allowance, phone_allowance, seniority_allowance,
            total_allowance, total_ot_converted, ot_salary, bonus_amount,
            insurance_deduction, corporate_insurance, tax_deduction, advance_or_penalties,
            net_salary, status, is_payroll_confirmed, notes, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 10, 2026, ?, ?, 27, 27, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, 0, 0, ?, 'approved', 1, 'Đồng bộ từ hồ sơ nhân sự Seajong', CURRENT_TIMESTAMP)`,
          [
            pIdx,
            pIdx,
            emp.code || `NV-${pIdx}`,
            emp.fullName || 'Nhân viên Seajong',
            emp.departmentName || 'Phòng ban chung',
            emp.position || 'Nhân viên',
            baseSal,
            insSal,
            baseSal,
            meal,
            fuel,
            phone,
            sen,
            totalAllow,
            insDed,
            corpIns,
            netSal,
          ]
        );
        pIdx++;
      }
      await dbRun(db, 'COMMIT');
    }

    // ============================================================================
    // M. ĐỒNG BỘ SỐ DƯ ĐẦU KỲ (accounting_opening_balances & financial_initial_declarations)
    // ============================================================================
    {
      const openCustomerDebts = [];
      const openSupplierDebts = [];
      let openCustTotal = 0;
      let openSuppTotal = 0;

      prismaDebts.forEach((d) => {
        if (String(d.referenceId || '') !== 'Dư nợ đầu kỳ') return;
        const amt = Math.round(Number(d.amount) || 0);
        const paid = Math.round(Number(d.paidAmount) || 0);
        const rem = Math.max(0, amt - paid);
        if (rem <= 0) return;

        if (d.type === 'RECEIVABLE' || d.type === 'phai-thu') {
          const cust = d.customerId ? customerById.get(d.customerId) : null;
          openCustTotal += rem;
          openCustomerDebts.push({
            id: d.id,
            customerName: cust?.name || d.partnerName || 'Khách hàng',
            projectName: 'Số dư công nợ đầu kỳ chuyển sang',
            contractValue: amt,
            paidAmount: paid,
            remainingAmount: rem,
          });
        } else if (d.type === 'PAYABLE' || d.type === 'phai-tra') {
          const supp = d.supplierId ? supplierById.get(d.supplierId) : null;
          openSuppTotal += rem;
          openSupplierDebts.push({
            id: d.id,
            supplierName: supp?.name || d.partnerName || 'Nhà cung cấp',
            totalAmount: amt,
            paidAmount: paid,
            remainingAmount: rem,
          });
        }
      });

      let faOrigTotal = 0;
      let faDepTotal = 0;
      prismaAssets.forEach((a) => {
        const orig = Math.round(Number(a.giaTriMua) || 0);
        const resVal = Math.round(Number(a.giaTriConLai !== null && a.giaTriConLai !== undefined ? a.giaTriConLai : orig));
        faOrigTotal += orig;
        faDepTotal += Math.max(0, orig - resVal);
      });
      const faNetTotal = Math.max(0, faOrigTotal - faDepTotal);

      let shortLoanOpen = 0;
      let longLoanOpen = 0;
      prismaBankLoans.forEach((bl) => {
        const rem = Math.max(0, Math.round((Number(bl.principalAmount) || 0) - (Number(bl.paidPrincipal) || 0)));
        const shortPart = Math.round(rem / 5);
        shortLoanOpen += shortPart;
        longLoanOpen += Math.max(0, rem - shortPart);
      });

      const cashOpen = Math.round(opening111 || 0);
      const bankOpen = Math.round(opening112 || 0);
      const invOpen = Math.round(totalRealInventoryValue);
      const totalOpenAssets = cashOpen + bankOpen + openCustTotal + invOpen + faNetTotal;
      const totalOpenLiabilities = openSuppTotal + shortLoanOpen + longLoanOpen;
      const netOpenEquity = Math.max(0, totalOpenAssets - totalOpenLiabilities);
      const ownerEq = netOpenEquity;
      const devFund = 0;
      const retainedOpen = 0;

      const declarationPayload = {
        cashAndInvestments: {
          cashInHand: cashOpen,
          bankDeposits: bankOpen,
          bankAccounts: [
            {
              id: 'BA-1121',
              bankName: prismaBankLoans[0]?.bankName || 'Tiền gửi ngân hàng (TK 1121)',
              accountNumber: 'TK-1121',
              balance: bankOpen,
            },
          ],
          shortTermInvestments: 0,
        },
        debts: {
          customerDebts: openCustomerDebts,
          customerReceivablesTotal: openCustTotal,
          prepaymentsToSuppliers: 0,
          otherShortTermReceivables: 0,
          supplierDebts: openSupplierDebts,
          supplierPayablesTotal: openSuppTotal,
          customerPrepayments: 0,
        },
        inventory: {
          rawMaterials: Math.round(totalRawMaterialsValue),
          workInProgress: 0,
          finishedGoods: Math.round(totalFinishedGoodsValue),
          inventoryProvision: 0,
          totalInventory: invOpen,
        },
        fixedAssets: {
          tangibleOriginal: faOrigTotal,
          tangibleDepreciation: -faDepTotal,
          tangibleNet: faNetTotal,
          intangibleOriginal: 0,
          intangibleDepreciation: 0,
          intangibleNet: 0,
          constructionInProgress: 0,
          longTermPrepayments: 0,
          longTermReceivables: 0,
        },
        capitalAndLiabilities: {
          ownerEquity: ownerEq,
          developmentFund: devFund,
          retainedEarningsAccumulated: retainedOpen,
          shortTermLoans: shortLoanOpen,
          longTermLoans: longLoanOpen,
          taxPayables: 0,
          vatDeductible: 0,
          otherTaxReceivables: 0,
          employeePayables: 0,
        },
        totalAssets: totalOpenAssets,
        totalResources: totalOpenLiabilities + ownerEq + devFund + retainedOpen,
        isBalanced: true,
      };

      await dbRun(db, 'BEGIN TRANSACTION');
      await dbRun(
        db,
        `INSERT OR REPLACE INTO financial_initial_declarations (period, data_json, updated_at) VALUES ('2026-10', ?, CURRENT_TIMESTAMP)`,
        [JSON.stringify(declarationPayload)]
      );
      await dbRun(
        db,
        `INSERT OR REPLACE INTO financial_initial_declarations (period, data_json, updated_at) VALUES ('2026-07', ?, CURRENT_TIMESTAMP)`,
        [JSON.stringify(declarationPayload)]
      );

      await dbRun(db, 'DELETE FROM accounting_opening_balances');
      const openingLines = [
        { code: '1111', debit: cashOpen, credit: 0 },
        { code: '1121', debit: bankOpen, credit: 0 },
        { code: '131', debit: openCustTotal, credit: 0 },
        { code: '1521', debit: Math.round(totalRawMaterialsValue), credit: 0 },
        { code: '156', debit: Math.round(totalFinishedGoodsValue), credit: 0 },
        { code: '211', debit: faOrigTotal, credit: 0 },
        { code: '2141', debit: 0, credit: faDepTotal },
        { code: '331', debit: 0, credit: openSuppTotal },
        { code: '341', debit: 0, credit: shortLoanOpen + longLoanOpen },
        { code: '411', debit: 0, credit: ownerEq },
        { code: '414', debit: 0, credit: devFund },
        { code: '421', debit: 0, credit: retainedOpen },
      ];
      let obIdx = 1;
      for (const ol of openingLines) {
        if (ol.debit === 0 && ol.credit === 0) continue;
        await dbRun(
          db,
          `INSERT OR REPLACE INTO accounting_opening_balances (id, period, account_code, opening_debit, opening_credit) VALUES (?, '2026-10', ?, ?, ?)`,
          [`OB-2026-${obIdx++}`, ol.code, ol.debit, ol.credit]
        );
      }
      await dbRun(db, 'COMMIT');
    }

    return {
      success: true,
      cash111Balance: realCash111Balance,
      bank112Balance: realBank112Balance,
      totalCashAndBank: realCash111Balance + realBank112Balance,
    };
  } catch (err) {
    console.error('[syncPrismaFinanceToAccountingTables] Error:', err);
    return { success: false, error: err.message };
  }
}
