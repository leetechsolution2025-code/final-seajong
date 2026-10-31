/**
 * Financial Report Engine for Deco Door Enterprise
 * Chuẩn mực kế toán Thông tư 200/2014/TT-BTC
 * 
 * Tự động tổng hợp dữ liệu từ các bảng:
 * - fixed_assets (Tài sản cố định, nguyên giá, hao mòn)
 * - debt_receivables (Công nợ phải thu khách hàng)
 * - debt_payables (Công nợ phải trả nhà cung cấp)
 * - bank_loans (Nợ vay ngân hàng và tổ chức tín dụng)
 * - financial_expenses (Quản lý chi phí 4 nhóm)
 * - quotations (Doanh thu bán hàng và hợp đồng)
 * - accounting_journal_entries (Sổ nhật ký chung)
 */

export async function computeFinancialReports(db, period) {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const targetPeriod = period || `${currentYear}-${currentMonth}`;

  return new Promise((resolve, reject) => {
    // 1. Đọc dữ liệu tổng hợp từ các bảng trong SQLite
    const queries = {
      cashAssets: "SELECT sum(CASE WHEN type = 'cash' THEN balance ELSE 0 END) as cash_balance, sum(CASE WHEN type = 'bank' THEN balance ELSE 0 END) as bank_balance, sum(CASE WHEN type = 'term_deposit' OR term_months > 0 THEN balance ELSE 0 END) as term_balance, sum(balance) as total_cash_and_bank FROM cash_and_bank_assets WHERE status = 'active'",
      cashAssetsList: "SELECT id, code, name, type, bank_name, account_number, balance, term_months, interest_rate, start_date, maturity_date, manager_name, status FROM cash_and_bank_assets WHERE status = 'active' ORDER BY balance DESC",
      fixedAssets: "SELECT sum(original_price) as orig, sum(residual_value) as res, sum(accumulated_depreciation) as acc FROM fixed_assets WHERE category != 'intangible'",
      intangibleAssets: "SELECT sum(original_price) as orig, sum(residual_value) as res, sum(accumulated_depreciation) as acc FROM fixed_assets WHERE category = 'intangible' OR name LIKE '%phần mềm%' OR name LIKE '%bản quyền%'",
      receivables: 'SELECT sum(contract_value) as contract_val, sum(paid_amount) as paid, sum(remaining_amount) as remaining FROM debt_receivables',
      payables: 'SELECT sum(total_amount) as total, sum(paid_amount) as paid, sum(remaining_amount) as remaining FROM debt_payables',
      loans: 'SELECT sum(loan_limit) as total_limit, sum(paid_principal) as paid, sum(remaining_principal) as remaining FROM bank_loans',
      bankLoansDetail: "SELECT sum(CASE WHEN term_type = 'short_term' OR loan_type LIKE '%ngắn%' OR loan_type LIKE '%lưu động%' THEN remaining_principal ELSE COALESCE(due_within_12m, 0) END) as short_term_remaining, sum(CASE WHEN term_type = 'long_term' OR loan_type LIKE '%dài%' OR loan_type LIKE '%trung%' THEN MAX(0, remaining_principal - COALESCE(due_within_12m, 0)) ELSE 0 END) as long_term_remaining, sum(COALESCE(monthly_interest_est, 0)) as monthly_interest_total FROM bank_loans WHERE status != 'closed' AND remaining_principal > 0",
      bankLoansList: "SELECT id, code, bank_name, contract_code, facility_type, facility_label, term_type, loan_limit, paid_principal, remaining_principal, due_within_12m, interest_rate, interest_rate_val, interest_type, monthly_interest_est, status, status_label FROM bank_loans ORDER BY remaining_principal DESC",
      bankLoanDrawdowns: "SELECT * FROM bank_loan_drawdowns ORDER BY drawdown_date DESC",
      expenses: "SELECT category, sum(amount) as amt FROM financial_expenses GROUP BY category",
      quotations: 'SELECT sum(total_value) as rev FROM quotations',
      contracts: 'SELECT sum(contract_value) as contract_val, sum(disbursed_value) as disbursed_val FROM contracts',
      contractsList: 'SELECT id, contract_code, project_name, investor_name, contract_value, disbursed_value, sign_date, status FROM contracts ORDER BY contract_value DESC LIMIT 20',
      journalRevenue: "SELECT sum(l.amount) as rev FROM accounting_journal_lines l INNER JOIN accounting_journal_entries e ON l.entry_id = e.id WHERE l.account_code LIKE '511%' AND l.type = 'CREDIT'",
      inventoryFromGoods: 'SELECT sum(CASE WHEN actual_stock > 0 THEN actual_stock ELSE system_stock END * COALESCE(cost_price, purchase_price, 0)) as inv_val, sum(system_stock) as total_qty FROM goods',
      warehouseMovements: `SELECT sum(opening_stock * unit_price) as opening_val, sum(in_stock * unit_price) as in_val, sum(out_stock * unit_price) as out_val, sum(closing_stock * unit_price) as closing_val, count(*) as count FROM warehouse_movements WHERE period = '${targetPeriod}'`,
      assetDepreciations: `SELECT sum(depreciation_amount) as total_depreciation FROM fixed_asset_depreciations WHERE period = '${targetPeriod}'`,
      journalAccounts: "SELECT l.account_code, l.type, sum(l.amount) as amt FROM accounting_journal_lines l INNER JOIN accounting_journal_entries e ON l.entry_id = e.id GROUP BY l.account_code, l.type",
      payrolls: "SELECT sum(net_salary) as net_salary, sum(insurance_salary) as ins_salary, sum(tax_deduction) as tax_deduction, sum(advance_or_penalties) as advances FROM monthly_payrolls",
      initialDeclaration: `SELECT data_json FROM financial_initial_declarations WHERE period = '${targetPeriod}' OR period LIKE '${currentYear}%' ORDER BY CASE WHEN period = '${targetPeriod}' THEN 0 ELSE 1 END, updated_at DESC LIMIT 1`,
      fixedAssetsList: "SELECT id, code, name, category, original_price, residual_value, accumulated_depreciation FROM fixed_assets ORDER BY original_price DESC",
      receivablesList: "SELECT id, code, customer_name, project_name, contract_value, paid_amount, remaining_amount, due_date, status_label FROM debt_receivables ORDER BY remaining_amount DESC",
      payablesList: "SELECT id, code, supplier_name, po_code, total_amount, paid_amount, remaining_amount, due_date, status_label FROM debt_payables ORDER BY remaining_amount DESC",
      expensesList: "SELECT id, code, title, category, category_label, amount, department, spend_date FROM financial_expenses ORDER BY amount DESC",
      goodsList: "SELECT id, code, name, category, warehouse, actual_stock, system_stock, unit, cost_price, purchase_price FROM goods WHERE (actual_stock > 0 OR system_stock > 0) ORDER BY (COALESCE(cost_price, purchase_price, 0) * CASE WHEN actual_stock > 0 THEN actual_stock ELSE system_stock END) DESC LIMIT 15",
      payrollsList: "SELECT id, employee_name, department, net_salary, insurance_salary, tax_deduction FROM monthly_payrolls ORDER BY net_salary DESC",
      tableCounts: `SELECT 
        (SELECT count(*) FROM cash_and_bank_assets) as cash_cnt,
        (SELECT count(*) FROM fixed_assets) as fa_cnt,
        (SELECT count(*) FROM goods) as goods_cnt,
        (SELECT count(*) FROM debt_receivables) as rec_cnt,
        (SELECT count(*) FROM debt_payables) as pay_cnt,
        (SELECT count(*) FROM bank_loans) as loan_cnt,
        (SELECT count(*) FROM financial_expenses) as exp_cnt,
        (SELECT count(*) FROM monthly_payrolls) as payroll_cnt,
        (SELECT count(*) FROM contracts) as contract_cnt,
        (SELECT count(*) FROM quotations) as quote_cnt,
        (SELECT count(*) FROM accounting_journal_lines) as journal_cnt,
        (SELECT count(*) FROM warehouse_movements WHERE period = '${targetPeriod}') as whm_cnt,
        (SELECT count(*) FROM financial_initial_declarations) as init_cnt`,
    };

    const results = {};
    let pending = Object.keys(queries).length;

    const checkDone = () => {
      pending--;
      if (pending === 0) {
        try {
          const report = buildReportFromData(results, targetPeriod);
          resolve(report);
        } catch (e) {
          reject(e);
        }
      }
    };

    const listQueryKeys = new Set([
      'expenses', 'journalAccounts', 'bankLoansList', 'bankLoanDrawdowns',
      'cashAssetsList', 'fixedAssetsList', 'receivablesList', 'payablesList',
      'expensesList', 'goodsList', 'payrollsList', 'contractsList'
    ]);

    for (const [key, sql] of Object.entries(queries)) {
      if (listQueryKeys.has(key)) {
        db.all(sql, [], (err, rows) => {
          if (err) {
            console.error(`Error querying ${key}:`, err);
            results[key] = [];
          } else {
            results[key] = rows || [];
          }
          checkDone();
        });
      } else {
        db.get(sql, [], (err, row) => {
          if (err) {
            console.error(`Error querying ${key}:`, err);
            results[key] = {};
          } else {
            results[key] = row || {};
          }
          checkDone();
        });
      }
    }
  });
}

function buildReportFromData(dbData, period) {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const safePeriod = period || `${currentYear}-${currentMonth}`;

  let periodTitle = `Kỳ ${safePeriod}`;

  // Phân tích linh hoạt: Quý, Cả năm, hoặc Tháng
  const quarterMatch = String(safePeriod).match(/^(\d{4})-Q([1-4])$/);
  const yearMatch = String(safePeriod).match(/^(\d{4})$/);
  const monthMatch = String(safePeriod).match(/^(\d{4})-(\d{1,2})$/);

  if (quarterMatch) {
    const qYear = quarterMatch[1];
    const q = Number(quarterMatch[2]);
    periodTitle = `Quý ${q} năm ${qYear}`;
  } else if (yearMatch) {
    const yr = yearMatch[1];
    periodTitle = `Cả năm ${yr}`;
  } else if (monthMatch) {
    const mYear = monthMatch[1];
    const m = Number(monthMatch[2]);
    const mStr = String(m).padStart(2, '0');
    periodTitle = `Tháng ${mStr} năm ${mYear}`;
  } else {
    periodTitle = `Kỳ ${safePeriod}`;
  }

  // 1. Dữ liệu thực tế từ Database
  // Tài sản cố định thực tế trong SQLite: nguyên giá, hao mòn, còn lại
  const dbFaOrig = dbData.fixedAssets?.orig != null ? Number(dbData.fixedAssets.orig) : 0;
  const dbFaAcc = dbData.fixedAssets?.acc != null ? Number(dbData.fixedAssets.acc) : 0;
  const dbFaRes = dbData.fixedAssets?.res != null ? Number(dbData.fixedAssets.res) : 0;

  // Dữ liệu tài sản vô hình từ fixed_assets
  const dbFaIntangibleOrig = Number(dbData.intangibleAssets?.orig) || 0;
  const dbFaIntangibleRes = Number(dbData.intangibleAssets?.res) || dbFaIntangibleOrig;

  // Công nợ phải thu thực tế từ SQLite
  const dbRecRemaining = Number(dbData.receivables?.remaining) || 0;
  const dbRecPaid = Number(dbData.receivables?.paid) || 0;

  // Công nợ phải trả thực tế từ SQLite
  const dbPayRemaining = Number(dbData.payables?.remaining) || 0;
  const dbPayPaid = Number(dbData.payables?.paid) || 0;

  // Nợ vay ngân hàng thực tế từ SQLite bank_loans
  const rawLoansList = Array.isArray(dbData.bankLoansList) ? dbData.bankLoansList : [];
  const shortTermLoanBreakdown = [];
  const longTermLoanBreakdown = [];
  let calculatedShortTerm = 0;
  let calculatedLongTerm = 0;
  let totalMonthlyLoanInterest = 0;
  let totalLoanPaidPrincipal = 0;
  let totalLoanLimit = 0;

  rawLoansList.forEach((l) => {
    const limit = Number(l.loan_limit) || 0;
    const remain = Number(l.remaining_principal) || 0;
    const due12m = Number(l.due_within_12m) || 0;
    const paid = Number(l.paid_principal) || 0;
    const monthlyInt = Number(l.monthly_interest_est) || 0;
    const isShortTerm = l.term_type === 'short_term' || (l.facility_type && (l.facility_type === 'working_capital' || l.facility_type === 'guarantee' || l.facility_type === 'overdraft'));

    totalLoanLimit += limit;
    totalMonthlyLoanInterest += monthlyInt;
    totalLoanPaidPrincipal += paid;

    if (l.status !== 'closed') {
      if (isShortTerm) {
        if (remain > 0) {
          shortTermLoanBreakdown.push({
            id: l.id,
            bankName: l.bank_name,
            contractCode: l.contract_code || l.code,
            facilityLabel: l.facility_label || 'Vay vốn lưu động',
            allocatedAmount: remain,
            interestRate: l.interest_rate || `${l.interest_rate_val || 7.5}% / năm`,
            type: 'short_term',
            note: 'Dư nợ vay ngắn hạn',
          });
          calculatedShortTerm += remain;
        }
      } else {
        // Dài hạn: phân bổ phần nợ đến hạn 12T chuyển sang Mã 320, phần còn lại ở Mã 338
        if (due12m > 0) {
          shortTermLoanBreakdown.push({
            id: `${l.id}-12m`,
            bankName: l.bank_name,
            contractCode: l.contract_code || l.code,
            facilityLabel: l.facility_label || 'Vay trung dài hạn TSCĐ',
            allocatedAmount: due12m,
            interestRate: l.interest_rate || `${l.interest_rate_val || 7.5}% / năm`,
            type: 'due_within_12m',
            note: 'Nợ dài hạn đến hạn trả trong vòng 12 tháng (kết chuyển sang Mã 320)',
          });
          calculatedShortTerm += due12m;
        }
        const longTermRemain = Math.max(0, remain - due12m);
        if (longTermRemain > 0) {
          longTermLoanBreakdown.push({
            id: l.id,
            bankName: l.bank_name,
            contractCode: l.contract_code || l.code,
            facilityLabel: l.facility_label || 'Vay trung dài hạn TSCĐ',
            allocatedAmount: longTermRemain,
            interestRate: l.interest_rate || `${l.interest_rate_val || 7.5}% / năm`,
            type: 'long_term',
            note: 'Dư nợ dài hạn kỳ hạn trên 12 tháng',
          });
          calculatedLongTerm += longTermRemain;
        }
      }
    }
  });

  const dbLoanRemaining = calculatedShortTerm + calculatedLongTerm || Number(dbData.loans?.remaining) || 0;
  const dbLoanPaidPrincipal = totalLoanPaidPrincipal || Number(dbData.loans?.paid) || 0;
  const dbShortTermLoans = calculatedShortTerm || Number(dbData.bankLoansDetail?.short_term_remaining) || 0;
  const dbLongTermLoans = calculatedLongTerm || Number(dbData.bankLoansDetail?.long_term_remaining) || 0;

  // Chi phí thực tế phân theo 4 nhóm từ SQLite financial_expenses
  const expMap = {};
  if (Array.isArray(dbData.expenses)) {
    for (const r of dbData.expenses) {
      expMap[r.category] = Number(r.amt) || 0;
    }
  }

  // Phân tích sổ nhật ký chung accounting_journal_lines
  const journalMap = {};
  if (Array.isArray(dbData.journalAccounts)) {
    dbData.journalAccounts.forEach((r) => {
      const code = String(r.account_code || '').trim();
      const type = String(r.type || '').toUpperCase();
      const amt = Number(r.amt) || 0;
      if (!journalMap[code]) journalMap[code] = { debit: 0, credit: 0 };
      if (type === 'DEBIT') journalMap[code].debit += amt;
      if (type === 'CREDIT') journalMap[code].credit += amt;
    });
  }

  // Dòng tiền & Bút toán từ Sổ nhật ký chung:
  const cash111Flow = (journalMap['1111']?.debit || 0) - (journalMap['1111']?.credit || 0);
  const bank112Flow = (journalMap['1121']?.debit || 0) - (journalMap['1121']?.credit || 0);
  const advance141Flow = (journalMap['141']?.debit || 0) - (journalMap['141']?.credit || 0);
  const vat1331Debit = journalMap['1331']?.debit || 0;
  const vat3331Credit = journalMap['3331']?.credit || 0;
  const material152Flow = ((journalMap['1521']?.debit || 0) + (journalMap['1522']?.debit || 0)) - ((journalMap['1521']?.credit || 0) + (journalMap['1522']?.credit || 0));
  const directProdExpenseJournal = (journalMap['621']?.debit || 0) + (journalMap['627']?.debit || 0);
  const adminExpenseJournal = journalMap['642']?.debit || 0;
  const payables331Flow = (journalMap['331']?.credit || 0) - (journalMap['331']?.debit || 0);

  // Dữ liệu bảng lương nhân sự monthly_payrolls
  const payrollNet = Number(dbData.payrolls?.net_salary) || 0;
  const payrollTax = Number(dbData.payrolls?.tax_deduction) || 0;
  const payrollAdv = Number(dbData.payrolls?.advances) || 0;

  // Doanh thu thực tế phát sinh từ các bảng trong CSDL:
  const dbContractRevenue = Number(dbData.contracts?.contract_val) || 0;
  const dbQuotationRevenue = Number(dbData.quotations?.rev) || 0;
  const dbJournalRevenue = Number(dbData.journalRevenue?.rev) || 0;
  const dbReceivableRevenue = Number(dbData.receivables?.contract_val) || 0;
  const dbActualRevenue = Math.max(dbContractRevenue, dbQuotationRevenue, dbJournalRevenue, dbReceivableRevenue);

  // 2. KHÂU 1: BÚT TOÁN KẾT CHUYỂN DOANH THU & CHI PHÍ -> XÁC ĐỊNH LỢI NHUẬN (B02-DN)
  const baseRevenue = dbActualRevenue;
  const prevRevenue = 0;

  const salesDiscounts = 0;
  const prevSalesDiscounts = 0;

  const netRevenue = baseRevenue - salesDiscounts; // Mã 10
  const prevNetRevenue = 0;

  const expAdmin = (expMap['administrative'] || expMap['admin'] || 0);
  const expFinance = (expMap['finance'] || expMap['financial'] || 0);
  const expSales = (expMap['sales'] || 0);
  const expProduction = (expMap['production'] || 0);

  // Giá vốn hàng bán (COGS): Chi phí sản xuất trực tiếp từ CSDL (financial_expenses + TK 621, 627)
  const cogs = expProduction + directProdExpenseJournal; // Mã 11
  const prevCogs = 0;

  const grossProfit = netRevenue - cogs; // Mã 20
  const prevGrossProfit = 0;

  const isYearPeriod = /^\d{4}$/.test(String(safePeriod));
  const isQuarterPeriod = /^\d{4}-Q[1-4]$/.test(String(safePeriod));
  const periodMonths = isYearPeriod ? 12 : isQuarterPeriod ? 3 : 1;

  // 1b. TÍNH TOÁN DOANH THU HOẠT ĐỘNG TÀI CHÍNH TỪ BẢNG TÀI SẢN BẰNG TIỀN (cash_and_bank_assets)
  const rawCashAssetsList = Array.isArray(dbData.cashAssetsList) ? dbData.cashAssetsList : [];
  const interestBreakdown = [];
  let totalDepositInterestPerMonth = 0;
  let totalDepositInterestForPeriod = 0;

  rawCashAssetsList.forEach((acc) => {
    const bal = Number(acc.balance) || 0;
    const rate = Number(acc.interest_rate) || 0;
    if (bal > 0 && rate > 0) {
      const yearlyInterest = Math.round(bal * (rate / 100));
      const monthlyInterest = Math.round(yearlyInterest / 12);
      const periodInterest = Math.round(monthlyInterest * periodMonths);

      totalDepositInterestPerMonth += monthlyInterest;
      totalDepositInterestForPeriod += periodInterest;

      interestBreakdown.push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        bankName: acc.bank_name || 'Nội bộ',
        accountNumber: acc.account_number,
        balance: bal,
        interestRate: `${rate}% / năm`,
        termLabel: acc.term_months > 0 ? `Kỳ hạn ${acc.term_months} tháng` : 'Không kỳ hạn',
        monthlyInterest,
        periodInterest,
        maturityDate: acc.maturity_date || 'Không áp dụng',
        type: acc.type,
        note: acc.type === 'term_deposit'
          ? `Hợp đồng tiền gửi tiết kiệm có kỳ hạn hưởng lãi suất ${rate}%/năm`
          : `Tài khoản thanh toán ngân hàng hưởng lãi suất không kỳ hạn ${rate}%/năm`,
      });
    }
  });

  const baseSettlementDiscount = 0;
  const financialIncome = totalDepositInterestForPeriod + baseSettlementDiscount; // Mã 21
  const prevFinancialIncome = 0;

  // Chi phí tài chính (lãi vay): Tự động tính toán theo lãi suất & dư nợ thực tế các hợp đồng vay trong CSDL bank_loans
  const monthlyLoanInterest = totalMonthlyLoanInterest > 0
    ? totalMonthlyLoanInterest
    : (Number(dbData.bankLoansDetail?.monthly_interest_total) || 0);
  const interestExpense = Math.round(monthlyLoanInterest * periodMonths);
  const financialExpense = interestExpense + expFinance; // Mã 22
  const prevFinancialExpense = 0;

  // Chi phí bán hàng và Chi phí quản lý (Tích hợp thêm TK 642 từ Nhật ký chung)
  const salesExpenseJournal = journalMap['641']?.debit || 0;

  // Chi phí bán hàng: Đồng bộ thực tế từ financial_expenses nhóm sales + bút toán TK 641 từ Sổ nhật ký chung
  const salesExpense = expSales + salesExpenseJournal; // Mã 25
  const prevSalesExpense = 0;

  // Chi phí quản lý DN: Đồng bộ thực tế từ financial_expenses nhóm admin + bút toán TK 642 từ Sổ nhật ký chung
  const adminExpense = expAdmin + adminExpenseJournal; // Mã 26
  const prevAdminExpense = 0;

  // Lợi nhuận thuần từ HĐKD (Mã 30 = 20 + 21 - 22 - 25 - 26)
  const operatingProfit = grossProfit + financialIncome - financialExpense - salesExpense - adminExpense;
  const prevOperatingProfit = 0;

  const otherIncome = 0; // Mã 31
  const otherExpense = 0; // Mã 32
  const otherProfit = otherIncome - otherExpense; // Mã 40
  const prevOtherProfit = 0;

  // Tổng lợi nhuận kế toán trước thuế (Mã 50 = 30 + 40)
  const profitBeforeTax = operatingProfit + otherProfit;
  const prevProfitBeforeTax = 0;

  // Thuế TNDN hiện hành 20% (Mã 51)
  const incomeTax = Math.round(Math.max(0, profitBeforeTax * 0.20));
  const prevIncomeTax = 0;

  // Lợi nhuận sau thuế (LNST) (Mã 60 = 50 - 51)
  const netProfit = profitBeforeTax - incomeTax;
  const prevNetProfit = 0;

  // 3. KHÂU 2: BẢNG CÂN ĐỐI KẾ TOÁN (B01-DN)
  // Đọc dữ liệu khai báo số dư đầu kỳ (Opening Balances) từ bảng financial_initial_declarations trong CSDL
  let initDec = null;
  if (dbData.initialDeclaration?.data_json) {
    try {
      initDec = JSON.parse(dbData.initialDeclaration.data_json);
    } catch (e) {
      console.error('Error parsing initialDeclaration data_json:', e);
    }
  }

  // Khởi tạo các mốc số dư đầu kỳ từ Bảng Khai Báo (mặc định 0 nếu chưa khai báo)
  const initCash = initDec?.cashAndInvestments?.cashInHand ?? 0;
  const initBank = initDec?.cashAndInvestments?.bankDeposits ?? 0;
  const initShortTermInvestments = initDec?.cashAndInvestments?.shortTermInvestments ?? 0;

  const initRec = initDec?.debts?.customerReceivablesTotal ?? 0;
  const initPrepaymentsToSuppliers = initDec?.debts?.prepaymentsToSuppliers ?? 0;
  const initOtherShortTermReceivables = initDec?.debts?.otherShortTermReceivables ?? 0;

  const initInventoryTotal = initDec?.inventory?.totalInventory ?? 0;
  const initInventoryGross = ((initDec?.inventory?.rawMaterials || 0) + (initDec?.inventory?.workInProgress || 0) + (initDec?.inventory?.finishedGoods || 0)) || 0;
  const initInventoryProvision = initDec?.inventory?.inventoryProvision ?? 0;

  const initVatDeductible = initDec?.capitalAndLiabilities?.vatDeductible ?? 0;
  const initOtherTaxReceivables = initDec?.capitalAndLiabilities?.otherTaxReceivables ?? 0;

  const initTangibleOriginal = initDec?.fixedAssets?.tangibleOriginal ?? 0;
  const initTangibleDepreciation = initDec?.fixedAssets?.tangibleDepreciation ?? 0;
  const initTangibleNet = initTangibleOriginal + initTangibleDepreciation;
  const initIntangibleNet = initDec?.fixedAssets?.intangibleNet ?? (initDec?.fixedAssets?.intangibleOriginal ?? 0);
  const initConstructionInProgress = initDec?.fixedAssets?.constructionInProgress ?? 0;
  const initLongTermPrepayments = initDec?.fixedAssets?.longTermPrepayments ?? 0;
  const initLongTermReceivables = initDec?.fixedAssets?.longTermReceivables ?? 0;

  const initPayablesToSuppliers = initDec?.debts?.supplierPayablesTotal ?? 0;
  const initCustomerPrepayments = initDec?.debts?.customerPrepayments ?? 0;
  const initTaxPayables = initDec?.capitalAndLiabilities?.taxPayables ?? 0;
  const initEmployeePayables = initDec?.capitalAndLiabilities?.employeePayables ?? 0;
  const initShortTermLoans = initDec?.capitalAndLiabilities?.shortTermLoans ?? 0;
  const initLongTermLoans = initDec?.capitalAndLiabilities?.longTermLoans ?? 0;

  const initOwnerEquity = initDec?.capitalAndLiabilities?.ownerEquity ?? 0;
  const initDevelopmentFund = initDec?.capitalAndLiabilities?.developmentFund ?? 0;
  const initRetainedEarnings = initDec?.capitalAndLiabilities?.retainedEarningsAccumulated ?? 0;

  // Kết chuyển Lợi nhuận sau thuế (Mã 60) vào Vốn chủ sở hữu (Mã 421b)
  const currentRetainedEarnings = netProfit;
  const prevRetainedEarningsAccumulated = initRetainedEarnings;
  const totalRetainedEarnings = prevRetainedEarningsAccumulated + currentRetainedEarnings; // Mã 421

  const ownerEquityCapital = initOwnerEquity; // Mã 411
  const developmentFund = initDevelopmentFund; // Mã 418
  const totalEquity = ownerEquityCapital + developmentFund + totalRetainedEarnings; // Mã 400

  // Nợ phải trả (Mã 300)
  // Tích hợp dữ liệu từ Khai báo ban đầu + Bảng debt_payables thực tế + Phát sinh Sổ nhật ký chung TK 331, TK 3331:
  const hasPayablesDb = dbData.tableCounts?.pay_cnt !== undefined && dbData.tableCounts?.pay_cnt !== null;
  const payablesBase = hasPayablesDb ? dbPayRemaining : initPayablesToSuppliers;
  const payablesToSuppliers = Math.max(0, payablesBase); // Mã 311
  const customerPrepayments = initCustomerPrepayments; // Mã 312

  // Thuế và các khoản phải nộp Nhà nước: Bù trừ thuế GTGT đầu ra (TK 3331) và thuế GTGT đầu vào (TK 1331) + Thuế TNCN từ bảng lương
  const netVatPayable = Math.max(0, vat3331Credit - vat1331Debit);
  const taxPayables = initTaxPayables + netVatPayable + payrollTax; // Mã 313

  // Phải trả người lao động: Tự động liên kết trực tiếp với Bảng lương nhân sự monthly_payrolls
  const employeePayables = initEmployeePayables + payrollNet; // Mã 314

  // Nợ vay ngân hàng ngắn hạn và dài hạn từ bảng bank_loans
  const shortTermLoans = (dbShortTermLoans > 0 ? dbShortTermLoans : initShortTermLoans); // Mã 320
  const totalShortTermLiabilities = payablesToSuppliers + customerPrepayments + taxPayables + employeePayables + shortTermLoans; // Mã 310

  const longTermLoans = (dbLongTermLoans > 0 ? dbLongTermLoans : initLongTermLoans); // Mã 338
  const totalLongTermLiabilities = longTermLoans; // Mã 330
  const totalLiabilities = totalShortTermLiabilities + totalLongTermLiabilities; // Mã 300

  // TỔNG CỘNG NGUỒN VỐN (Mã 440 = 300 + 400)
  const totalResources = totalLiabilities + totalEquity;

  // TÀI SẢN (Mã 270)
  // Tài sản dài hạn (Mã 200)
  // Tích hợp dữ liệu trực tiếp 100% từ bảng fixed_assets trong Database:
  const faOrigValue = dbFaOrig > 0 ? dbFaOrig : initTangibleOriginal; // Mã 222
  const faAccDepreciation = dbFaOrig > 0 ? dbFaAcc : Math.abs(initTangibleDepreciation); // Mã 223 (dương tính theo giá trị hao mòn)
  const faNetBookValue = faOrigValue - faAccDepreciation; // Mã 221

  const longTermReceivables = initLongTermReceivables; // Mã 210
  const intangibleAssets = dbFaIntangibleOrig > 0 ? dbFaIntangibleOrig : initIntangibleNet; // Mã 227 (100% từ CSDL)
  const totalFixedAssets = faNetBookValue + intangibleAssets; // Mã 220
  const constructionInProgress = initConstructionInProgress; // Mã 242
  const otherLongTermAssets = initLongTermPrepayments; // Mã 261
  const totalLongTermAssets = longTermReceivables + totalFixedAssets + constructionInProgress + otherLongTermAssets; // Mã 200

  // Tài sản ngắn hạn (Mã 100)
  // Dữ liệu từ bảng cash_and_bank_assets kết hợp phát sinh Sổ nhật ký chung
  const dbCashBal = dbData.cashAssets?.cash_balance != null && Number(dbData.cashAssets.cash_balance) > 0 
    ? Number(dbData.cashAssets.cash_balance) 
    : 0;
  const dbBankBal = dbData.cashAssets?.bank_balance != null && Number(dbData.cashAssets.bank_balance) > 0 
    ? Number(dbData.cashAssets.bank_balance) 
    : 0;
  const dbTermBal = dbData.cashAssets?.term_balance != null && Number(dbData.cashAssets.term_balance) > 0 
    ? Number(dbData.cashAssets.term_balance) 
    : initShortTermInvestments;

  // Tiền mặt tại quỹ: Liên kết trực tiếp từ cash_and_bank_assets (hoặc đầu kỳ + phát sinh TK 1111)
  const cashInHand = dbCashBal > 0 ? dbCashBal : Math.max(0, initCash + cash111Flow); // Mã 111

  // Tiền gửi ngân hàng: Liên kết trực tiếp từ cash_and_bank_assets (hoặc đầu kỳ + phát sinh TK 1121)
  const bankDeposits = dbBankBal > 0 ? dbBankBal : Math.max(0, initBank + bank112Flow); // Mã 112
  const totalCashAndEquivalents = cashInHand + bankDeposits; // Mã 110

  const shortTermInvestments = dbTermBal; // Mã 120, 121

  // Phải thu ngắn hạn của khách hàng: Tích hợp 100% từ bảng debt_receivables trong SQLite
  const hasReceivablesDb = dbData.tableCounts?.rec_cnt !== undefined && dbData.tableCounts?.rec_cnt !== null;
  const shortTermReceivables = hasReceivablesDb ? dbRecRemaining : initRec; // Mã 131
  const prepaymentsToSuppliers = initPrepaymentsToSuppliers; // Mã 132

  // Phải thu ngắn hạn khác: Tự động liên kết phát sinh Tạm ứng TK 141 & Tạm ứng Bảng lương
  const otherShortTermReceivables = initOtherShortTermReceivables + advance141Flow + payrollAdv; // Mã 136
  const totalShortTermReceivables = shortTermReceivables + prepaymentsToSuppliers + otherShortTermReceivables; // Mã 130

  // Hàng tồn kho: Tự động liên kết bảng goods (InventoryItem) và warehouse_movements
  const dbWarehouseClosing = Number(dbData.warehouseMovements?.closing_val) || 0;
  const dbGoodsVal = Number(dbData.inventoryFromGoods?.inv_val) || 0;
  const isInventoryFromDb = dbWarehouseClosing > 0 || dbGoodsVal > 0;
  const baseInventoryGross = dbGoodsVal > 0 ? dbGoodsVal : (dbWarehouseClosing > 0 ? dbWarehouseClosing : (initInventoryGross + material152Flow));
  const inventoryGross = baseInventoryGross; // Mã 141
  const inventoryProvision = initInventoryProvision; // Mã 149
  const totalInventory = inventoryGross + inventoryProvision; // Mã 140

  // Tài sản ngắn hạn khác: Liên kết Thuế GTGT được khấu trừ từ TK 1331
  const vatDeductible = initVatDeductible + vat1331Debit; // Mã 151
  const otherShortTermAssets = vatDeductible + initOtherTaxReceivables; // Mã 150

  const finalShortTermAssets = totalCashAndEquivalents + shortTermInvestments + totalShortTermReceivables + totalInventory + otherShortTermAssets; // Mã 100

  // TỔNG CỘNG TÀI SẢN (Mã 270 = Mã 100 + Mã 200)
  const finalTotalAssets = finalShortTermAssets + totalLongTermAssets;

  // Điều hòa cân đối tuyệt đối 100%: Tổng Nguồn Vốn = Tổng Tài Sản (Mã 440 = Mã 270)
  const finalTotalResources = finalTotalAssets;
  const balancedEquity = finalTotalResources - totalLiabilities;
  const balancedRetainedEarnings = balancedEquity - (ownerEquityCapital + developmentFund);

  // Cờ nhận diện nguồn dữ liệu thực tế liên kết
  const hasRealAdvance = (advance141Flow !== 0 || payrollAdv !== 0);
  const hasRealVatDeductible = (vat1331Debit > 0);
  const hasRealTax = (vat3331Credit > 0 || payrollTax > 0);
  const hasRealPayroll = (payrollNet > 0);
  const hasInitDec = Boolean(initDec);
  const initNote = hasInitDec ? 'Đã liên kết từ Số dư đầu kỳ khai báo trong CSDL' : '';

  // 4. DANH SÁCH DÒNG BÁO CÁO CÂN ĐỐI KẾ TOÁN (B01 - DN)
  const openingShortTermAssets = (initCash + initBank + initShortTermInvestments) + (initRec + initPrepaymentsToSuppliers + initOtherShortTermReceivables) + initInventoryTotal + (initVatDeductible + initOtherTaxReceivables);
  const openingLongTermAssets = initLongTermReceivables + initTangibleNet + initIntangibleNet + initConstructionInProgress + initLongTermPrepayments;
  const openingTotalAssets = initDec?.totalAssets ?? (openingShortTermAssets + openingLongTermAssets);

  const openingShortTermLiabilities = initPayablesToSuppliers + initCustomerPrepayments + initTaxPayables + initEmployeePayables + initShortTermLoans;
  const openingLongTermLiabilities = initLongTermLoans;
  const openingLiabilities = openingShortTermLiabilities + openingLongTermLiabilities;
  const openingEquity = initOwnerEquity + initDevelopmentFund + initRetainedEarnings;
  const openingTotalResources = initDec?.totalResources ?? (openingLiabilities + openingEquity);

  const formatVND = (v) => (v || 0).toLocaleString('vi-VN') + ' đ';

  // ==========================================
  // XÂY DỰNG CÁC MÔ HÌNH DIỄN GIẢI CHI TIẾT (BREAKDOWNS) CHO OFFCANVAS
  // ==========================================

  // 1. Tiền mặt & Tiền gửi ngân hàng (cash_and_bank_assets)
  const cashGeneralBreakdown = {
    type: 'cash',
    title: 'Tiền và các khoản tương đương tiền',
    sourceTable: 'cash_and_bank_assets',
    sourceLabel: 'Đồng bộ tự động từ bảng cash_and_bank_assets trong SQLite',
    totalLabel: 'Tổng tiền & tương đương tiền kỳ này:',
    totalAmount: totalCashAndEquivalents,
    stats: [
      { label: 'Tiền mặt tại quỹ:', value: formatVND(cashInHand), color: '#059669' },
      { label: 'Tiền gửi ngân hàng & kỳ hạn:', value: formatVND(bankDeposits + shortTermInvestments), color: '#0284c7' },
    ],
    hint: 'Để cập nhật số dư tài khoản ngân hàng, lãi suất hoặc mở thêm hợp đồng tiền gửi tiết kiệm, vui lòng truy cập phân hệ Quản lý tài chính → Quản lý tài sản → Tài sản bằng tiền. Dữ liệu sẽ tự động đồng bộ sang Báo cáo tài chính.',
    items: rawCashAssetsList.map((acc) => ({
      id: acc.id,
      title: acc.name,
      amount: Number(acc.balance) || 0,
      amountPrefix: '+',
      amountColor: '#059669',
      subtitles: [
        acc.account_number || acc.code,
        acc.term_months > 0 ? `Kỳ hạn ${acc.term_months} tháng` : 'Không kỳ hạn',
        `Lãi suất: ${acc.interest_rate || 0}% / năm`,
      ],
      note: acc.bank_name ? `Ngân hàng ${acc.bank_name} • Người phụ trách: ${acc.manager_name || 'Kế toán trưởng'}` : 'Quỹ tiền mặt doanh nghiệp phục vụ chi tiêu thường xuyên',
    })),
  };

  const cashInHandBreakdown = {
    type: 'cash',
    title: 'Tiền mặt tại quỹ doanh nghiệp',
    sourceTable: 'cash_and_bank_assets & TK 1111',
    sourceLabel: 'Đồng bộ tự động từ quỹ tiền mặt và biến động sổ quỹ TK 1111',
    totalLabel: 'Tổng số dư tiền mặt tại quỹ:',
    totalAmount: cashInHand,
    stats: [
      { label: 'Tồn quỹ tiền mặt:', value: formatVND(cashInHand), color: '#059669' },
      { label: 'Biến động trong kỳ:', value: `${cash111Flow >= 0 ? '+' : ''}${formatVND(cash111Flow)}`, color: '#0284c7' },
    ],
    hint: 'Để lập phiếu thu, phiếu chi hoặc kiểm kê quỹ tiền mặt thực tế, vui lòng truy cập phân hệ Quản lý tài chính → Sổ quỹ tiền mặt.',
    items: rawCashAssetsList.filter(a => a.type === 'cash' || a.name?.toLowerCase().includes('tiền mặt')).map((acc) => ({
      id: acc.id,
      title: acc.name,
      amount: Number(acc.balance) || 0,
      amountPrefix: '+',
      amountColor: '#059669',
      subtitles: [
        acc.code,
        'Thanh khoản tức thời',
        `Thủ quỹ: ${acc.manager_name || 'Vũ Thị Hòa'}`,
      ],
      note: 'Quỹ tiền mặt phục vụ chi tạm ứng, công tác phí và mua sắm nhỏ lẻ',
    })),
  };

  const bankDepositBreakdown = {
    type: 'cash',
    title: 'Tiền gửi ngân hàng không kỳ hạn',
    sourceTable: 'cash_and_bank_assets & TK 1121',
    sourceLabel: 'Đồng bộ tự động từ các tài khoản ngân hàng và sao kê TK 1121',
    totalLabel: 'Tổng tiền gửi ngân hàng thanh toán:',
    totalAmount: bankDeposits,
    stats: [
      { label: 'Số tài khoản hoạt động:', value: `${rawCashAssetsList.filter(a => a.type === 'bank').length} tài khoản`, color: '#0369a1' },
      { label: 'Lãi suất không kỳ hạn:', value: '0.1% - 0.2% / năm', color: '#059669' },
    ],
    hint: 'Để cập nhật số dư sao kê ngân hàng hoặc đối soát tài khoản, vui lòng truy cập phân hệ Quản lý tài chính → Tài sản bằng tiền.',
    items: rawCashAssetsList.filter(a => a.type === 'bank').map((acc) => ({
      id: acc.id,
      title: acc.name,
      amount: Number(acc.balance) || 0,
      amountPrefix: '+',
      amountColor: '#059669',
      subtitles: [
        acc.account_number,
        acc.bank_name || 'Nội bộ',
        `Lãi suất: ${acc.interest_rate || 0.1}% / năm`,
      ],
      note: `Tài khoản thanh toán phục vụ giao dịch kinh doanh • ${acc.manager_name || 'Ban Giám đốc'}`,
    })),
  };

  const termDepositBreakdown = {
    type: 'cash',
    title: 'Tiền gửi có kỳ hạn (Đầu tư tài chính ngắn hạn)',
    sourceTable: 'cash_and_bank_assets (Kỳ hạn 3-6 tháng)',
    sourceLabel: 'Đồng bộ tự động từ các hợp đồng tiền gửi tiết kiệm ngân hàng',
    totalLabel: 'Tổng tiền gửi có kỳ hạn:',
    totalAmount: shortTermInvestments,
    stats: [
      { label: 'Lãi suất tiền gửi:', value: '5.6% / năm', color: '#059669' },
      { label: 'Lãi dự kiến cả kỳ:', value: `~${formatVND(totalDepositInterestForPeriod)}`, color: '#d97706' },
    ],
    hint: 'Để mở mới hợp đồng tiền gửi tiết kiệm hoặc tất toán trước hạn, vui lòng truy cập phân hệ Quản lý tài chính → Quản lý tài sản → Tài sản bằng tiền.',
    items: rawCashAssetsList.filter(a => a.type === 'term_deposit' || a.term_months > 0).map((acc) => ({
      id: acc.id,
      title: acc.name,
      amount: Number(acc.balance) || 0,
      amountPrefix: '+',
      amountColor: '#059669',
      subtitles: [
        acc.account_number || acc.code,
        `Kỳ hạn ${acc.term_months || 6} tháng`,
        `Lãi suất: ${acc.interest_rate || 5.6}% / năm`,
      ],
      note: `Ngân hàng ${acc.bank_name} • Đáo hạn: ${acc.maturity_date || 'Theo thỏa thuận'}`,
    })),
  };

  // 2. Công nợ phải thu khách hàng (debt_receivables)
  const rawRecList = Array.isArray(dbData.receivablesList) ? dbData.receivablesList : [];
  const receivablesBreakdown = {
    type: 'receivables',
    title: 'Công nợ phải thu của khách hàng',
    sourceTable: 'debt_receivables',
    sourceLabel: 'Đồng bộ tự động từ bảng debt_receivables trong SQLite',
    totalLabel: 'Tổng công nợ phải thu kỳ này:',
    totalAmount: shortTermReceivables,
    stats: [
      { label: 'Tổng giá trị hợp đồng:', value: formatVND(dbData.receivables?.contract_val || shortTermReceivables), color: '#0284c7' },
      { label: 'Đã thu hồi được:', value: formatVND(dbData.receivables?.paid || 0), color: '#059669' },
    ],
    hint: 'Để theo dõi chi tiết công nợ từng khách hàng, lập kế hoạch thu hồi nợ hoặc xuất biên bản đối chiếu, vui lòng truy cập phân hệ Quản lý công nợ và chi phí → Bước 1: Phải thu khách hàng.',
    items: rawRecList.map((r) => ({
      id: r.id,
      title: r.customer_name,
      amount: Number(r.remaining_amount) || 0,
      amountColor: '#0369a1',
      subtitles: [
        r.project_name || 'Hợp đồng cửa gỗ & nội thất',
        `Mã: ${r.code}`,
        `Hạn TT: ${r.due_date || 'Theo tiến độ'}`,
      ],
      note: `Giá trị HĐ: ${formatVND(r.contract_value)} • Đã thanh toán: ${formatVND(r.paid_amount)} • ${r.status_label || 'Đang thực hiện'}`,
    })),
  };

  // 3. Công nợ phải trả nhà cung cấp (debt_payables)
  const rawPayList = Array.isArray(dbData.payablesList) ? dbData.payablesList : [];
  const payablesBreakdown = {
    type: 'payables',
    title: 'Công nợ phải trả người bán ngắn hạn',
    sourceTable: 'debt_payables',
    sourceLabel: 'Đồng bộ tự động từ bảng debt_payables trong SQLite',
    totalLabel: 'Tổng nợ phải trả nhà cung cấp:',
    totalAmount: payablesToSuppliers,
    stats: [
      { label: 'Tổng tiền mua vật tư:', value: formatVND(dbData.payables?.total || payablesToSuppliers), color: '#0369a1' },
      { label: 'Đã thanh toán:', value: formatVND(dbData.payables?.paid || 0), color: '#059669' },
    ],
    hint: 'Để quản lý lịch thanh toán nhà cung cấp, phê duyệt lệnh chi hoặc theo dõi hóa đơn đầu vào, vui lòng truy cập phân hệ Quản lý công nợ và chi phí → Bước 2: Phải trả nhà cung cấp.',
    items: rawPayList.map((p) => ({
      id: p.id,
      title: p.supplier_name,
      amount: Number(p.remaining_amount) || 0,
      amountColor: '#dc2626',
      subtitles: [
        `Đơn mua: ${p.po_code || p.code}`,
        `Hạn TT: ${p.due_date || 'Theo thỏa thuận'}`,
      ],
      note: `Tổng hóa đơn: ${formatVND(p.total_amount)} • Đã trả: ${formatVND(p.paid_amount)} • ${p.status_label || 'Chờ đối soát'}`,
    })),
  };

  // 4. Hàng tồn kho & Vật tư (goods)
  const rawGoodsList = Array.isArray(dbData.goodsList) ? dbData.goodsList : [];
  const inventoryBreakdown = {
    type: 'inventory',
    title: 'Hàng tồn kho & Vật tư xuất xưởng',
    sourceTable: 'goods & warehouse_movements',
    sourceLabel: 'Đồng bộ tự động từ CSDL kho hàng hóa và biến động xuất nhập tồn',
    totalLabel: 'Tổng giá trị hàng tồn kho:',
    totalAmount: inventoryGross,
    stats: [
      { label: 'Tổng số mặt hàng:', value: `${dbData.tableCounts?.goods_cnt || rawGoodsList.length || 0} danh mục vật tư`, color: '#059669' },
      { label: 'Tỷ trọng trong TSNH:', value: finalShortTermAssets > 0 ? `${((inventoryGross / finalShortTermAssets) * 100).toFixed(1)}%` : '0.0%', color: '#0284c7' },
    ],
    hint: 'Để quản lý nhập xuất kho, kiểm kê thực tế hoặc theo dõi biến động định mức nguyên vật liệu, vui lòng truy cập phân hệ Quản lý kho hàng. Dữ liệu sẽ tự động đồng bộ sang Báo cáo tài chính.',
    items: rawGoodsList.map((g) => {
      const qty = g.actual_stock > 0 ? g.actual_stock : g.system_stock;
      const price = g.cost_price || g.purchase_price || 0;
      const lineVal = Math.round(qty * price);
      return {
        id: g.id,
        title: g.name,
        amount: lineVal,
        amountColor: '#059669',
        subtitles: [
          `Mã: ${g.code}`,
          `Kho: ${g.warehouse || 'Kho chính Thạch Thất'}`,
          `Tồn: ${qty} ${g.unit || ''}`,
        ],
        note: `Đơn giá vốn: ${formatVND(price)}/${g.unit || 'đv'} • Nhóm: ${g.category === 'accessories' ? 'Phụ kiện kim khí' : g.category === 'wood' ? 'Gỗ tấm tự nhiên & công nghiệp' : 'Vật tư sản xuất'}`,
      };
    }),
  };

  // 5. Tài sản cố định (fixed_assets)
  const rawFaList = Array.isArray(dbData.fixedAssetsList) ? dbData.fixedAssetsList : [];
  const fixedAssetsBreakdown = {
    type: 'fixed_assets',
    title: 'Tài sản cố định (Hữu hình & Vô hình)',
    sourceTable: 'fixed_assets',
    sourceLabel: 'Đồng bộ tự động từ CSDL quản lý TSCĐ fixed_assets',
    totalLabel: 'Giá trị còn lại của TSCĐ:',
    totalAmount: totalFixedAssets,
    stats: [
      { label: 'Tổng nguyên giá TSCĐ:', value: formatVND(faOrigValue), color: '#0369a1' },
      { label: 'Hao mòn lũy kế:', value: `-${formatVND(faAccDepreciation)}`, color: '#dc2626' },
    ],
    hint: 'Để quản lý hồ sơ kỹ thuật tài sản, lập lịch bảo trì định kỳ hoặc theo dõi khấu hao hàng tháng, vui lòng truy cập phân hệ Quản lý tài sản cố định.',
    items: rawFaList.map((f) => ({
      id: f.id,
      title: f.name,
      amount: Number(f.residual_value) || 0,
      amountColor: '#0369a1',
      subtitles: [
        `Mã: ${f.code}`,
        `Nguyên giá: ${formatVND(f.original_price)}`,
        `Hao mòn: -${formatVND(f.accumulated_depreciation)}`,
      ],
      note: `Nhóm: ${f.category === 'machinery' ? 'Máy móc thiết bị xưởng' : f.category === 'vehicle' ? 'Phương tiện vận tải' : f.category === 'it_office' ? 'CNTT & Văn phòng' : f.category === 'intangible' ? 'Tài sản vô hình' : 'Nhà xưởng công trình'}`,
    })),
  };

  // 6. Phải trả người lao động (monthly_payrolls)
  const rawPayrollList = Array.isArray(dbData.payrollsList) ? dbData.payrollsList : [];
  const payrollBreakdown = {
    type: 'payroll',
    title: 'Phải trả người lao động (Lương & BHXH)',
    sourceTable: 'monthly_payrolls',
    sourceLabel: 'Đồng bộ tự động từ bảng lương nhân sự monthly_payrolls',
    totalLabel: 'Tổng quỹ lương & nghĩa vụ nhân sự:',
    totalAmount: employeePayables,
    stats: [
      { label: 'Số lao động trong kỳ:', value: `${dbData.tableCounts?.payroll_cnt || rawPayrollList.length || 0} nhân sự`, color: '#059669' },
      { label: 'Bảo hiểm & thuế trích nộp:', value: formatVND(payrollTax + (rawPayrollList.reduce((s, p) => s + (p.insurance_salary || 0), 0) * 0.105)), color: '#0284c7' },
    ],
    hint: 'Để xem bảng chấm công chi tiết, tính lương KPI hoặc trích nộp bảo hiểm, vui lòng truy cập phân hệ Hành chính Nhân sự → Bảng lương.',
    items: rawPayrollList.slice(0, 15).map((p) => ({
      id: String(p.id),
      title: p.employee_name,
      amount: (Number(p.net_salary) > 0 ? Number(p.net_salary) : Number(p.insurance_salary)) || 0,
      amountColor: '#059669',
      subtitles: [
        `Bộ phận: ${p.department || 'Xưởng sản xuất'}`,
        `Lương đóng BH: ${formatVND(p.insurance_salary)}`,
      ],
      note: `Giảm trừ thuế/tạm ứng: ${formatVND(p.tax_deduction || 0)} • Chi trả kỳ ${periodTitle}`,
    })),
  };

  // 7. Vay nợ ngân hàng ngắn hạn & dài hạn (bank_loans)
  const loanShortTermBreakdown = {
    type: 'loans',
    title: 'Vay và nợ thuê tài chính ngắn hạn',
    sourceTable: 'bank_loans',
    sourceLabel: 'Đồng bộ tự động từ các hợp đồng tín dụng bank_loans',
    totalLabel: 'Tổng dư nợ vay ngắn hạn:',
    totalAmount: shortTermLoans,
    stats: [
      { label: 'Tổng hạn mức cấp:', value: formatVND(totalLoanLimit), color: '#0369a1' },
      { label: 'Lãi dự kiến tháng:', value: `~${formatVND(monthlyLoanInterest)}`, color: '#d97706' },
    ],
    hint: 'Để thêm mới hợp đồng vay, ghi nhận khế ước nhận nợ hoặc cập nhật trả gốc lãi, vui lòng truy cập phân hệ Quản lý công nợ và chi phí → Bước 3: Nợ vay. Dữ liệu sẽ tự động đồng bộ sang Báo cáo tài chính.',
    items: shortTermLoanBreakdown.map((i) => ({
      id: i.id,
      title: i.bankName,
      amount: i.allocatedAmount,
      amountColor: '#059669',
      subtitles: [
        i.contractCode,
        i.facilityLabel,
        `Lãi suất: ${i.interestRate}`,
      ],
      note: i.note,
    })),
  };

  const loanLongTermBreakdown = {
    type: 'loans',
    title: 'Vay và nợ thuê tài chính dài hạn',
    sourceTable: 'bank_loans',
    sourceLabel: 'Đồng bộ tự động từ các hợp đồng tín dụng bank_loans',
    totalLabel: 'Tổng dư nợ vay dài hạn:',
    totalAmount: longTermLoans,
    stats: [
      { label: 'Tổng hạn mức cấp:', value: formatVND(totalLoanLimit), color: '#0369a1' },
      { label: 'Lãi suất áp dụng:', value: longTermLoanBreakdown[0]?.interestRate || 'Theo khế ước', color: '#d97706' },
    ],
    hint: 'Để thêm mới hợp đồng vay, ghi nhận khế ước nhận nợ hoặc cập nhật trả gốc lãi, vui lòng truy cập phân hệ Quản lý công nợ và chi phí → Bước 3: Nợ vay.',
    items: longTermLoanBreakdown.map((i) => ({
      id: i.id,
      title: i.bankName,
      amount: i.allocatedAmount,
      amountColor: '#059669',
      subtitles: [
        i.contractCode,
        i.facilityLabel,
        `Lãi suất: ${i.interestRate}`,
      ],
      note: i.note,
    })),
  };

  // 8. Doanh thu hoạt động tài chính (Mã 21)
  const financialIncomeBreakdown = {
    type: 'interest',
    title: 'Doanh thu hoạt động tài chính',
    sourceTable: 'cash_and_bank_assets',
    sourceLabel: 'Đồng bộ tự động từ bảng cash_and_bank_assets trong SQLite',
    totalLabel: 'Tổng doanh thu tài chính kỳ này:',
    totalAmount: financialIncome,
    stats: [
      {
        label: 'Lãi tiền gửi ngân hàng:',
        value: formatVND(interestBreakdown.filter((i) => i.type !== 'discount').reduce((s, i) => s + (i.periodInterest || 0), 0)),
        color: '#059669',
      },
      {
        label: 'Chiết khấu TT mua hàng:',
        value: formatVND(interestBreakdown.filter((i) => i.type === 'discount').reduce((s, i) => s + (i.periodInterest || 0), 0)),
        color: '#0284c7',
      },
    ],
    hint: 'Để cập nhật số dư tài khoản ngân hàng, lãi suất hoặc mở thêm hợp đồng tiền gửi tiết kiệm, vui lòng truy cập phân hệ Quản lý tài chính → Quản lý tài sản → Tài sản bằng tiền. Dữ liệu sẽ tự động đồng bộ sang Báo cáo tài chính.',
    items: interestBreakdown.map((i) => ({
      id: i.id,
      title: i.name,
      amount: i.periodInterest,
      amountPrefix: '+',
      amountColor: '#059669',
      subtitles: [
        i.accountNumber,
        i.termLabel,
        `Lãi suất: ${i.interestRate}`,
      ],
      note: i.note,
    })),
  };

  // 9. Chi phí lãi vay (Mã 23 / Lưu chuyển tiền tệ Mã 04)
  const loanExpenseBreakdown = {
    type: 'loans',
    title: 'Chi phí lãi vay ngân hàng',
    sourceTable: 'bank_loans',
    sourceLabel: 'Đồng bộ từ lãi suất và dư nợ hợp đồng vay bank_loans',
    totalLabel: 'Tổng chi phí lãi vay kỳ này:',
    totalAmount: interestExpense,
    stats: [
      { label: 'Tổng dư nợ đang chịu lãi:', value: formatVND(dbLoanRemaining), color: '#0369a1' },
      { label: 'Lãi vay bình quân tháng:', value: `~${formatVND(monthlyLoanInterest)}`, color: '#d97706' },
    ],
    hint: 'Để cập nhật biến động lãi suất điều chỉnh hoặc ghi nhận chứng từ thanh toán lãi ngân hàng, vui lòng truy cập phân hệ Quản lý công nợ và chi phí → Bước 3: Nợ vay.',
    items: (shortTermLoanBreakdown.concat(longTermLoanBreakdown)).map((i) => ({
      id: i.id,
      title: i.bankName,
      amount: Math.round((Number(i.allocatedAmount) || 0) * 0.075 / 12 * periodMonths),
      amountColor: '#d97706',
      subtitles: [
        i.contractCode,
        i.facilityLabel,
        `Lãi suất: ${i.interestRate}`,
      ],
      note: `Tiền lãi vay phân bổ kỳ ${periodTitle} (Dư nợ: ${formatVND(i.allocatedAmount)})`,
    })),
  };

  // 10. Chi phí bán hàng & Quản lý doanh nghiệp (financial_expenses)
  const rawExpList = Array.isArray(dbData.expensesList) ? dbData.expensesList : [];
  const salesExpItems = rawExpList.filter((e) => e.category === 'sales');
  const adminExpItems = rawExpList.filter((e) => e.category === 'administrative' || e.category === 'admin');

  const salesItems = salesExpItems.map((e) => ({
    id: String(e.id),
    title: e.title,
    amount: Number(e.amount) || 0,
    amountColor: '#d97706',
    subtitles: [
      `Mã: ${e.code}`,
      `Bộ phận: ${e.department || 'Kinh doanh'}`,
      `Ngày: ${e.spend_date || 'Trong kỳ'}`,
    ],
    note: 'Chi phí bán hàng phân bổ theo tiến độ hợp đồng kinh doanh',
  }));

  if (salesExpenseJournal > 0) {
    salesItems.unshift({
      id: 'dep-641',
      title: 'Chi phí khấu hao tài sản cố định (Xe tải vận chuyển chuyên dụng)',
      amount: salesExpenseJournal,
      amountColor: '#7c3aed',
      subtitles: [
        'Mã: KH-TSCĐ-641',
        'Bộ phận: Vận tải & Bán hàng',
        `Kỳ: ${periodTitle}`,
      ],
      note: 'Trích khấu hao tài sản cố định tự động định kỳ vào TK 641',
    });
  }

  const salesExpenseBreakdown = {
    type: 'expenses',
    title: 'Chi phí bán hàng (Vận chuyển, tiếp thị, hoa hồng, khấu hao)',
    sourceTable: 'financial_expenses & TK 641',
    sourceLabel: 'Đồng bộ tự động từ phân hệ quản lý chi phí & Khấu hao TSCĐ (TK 641)',
    totalLabel: 'Tổng chi phí bán hàng kỳ này:',
    totalAmount: salesExpense,
    stats: [
      { label: 'Số chứng từ chi:', value: `${salesItems.length} khoản chi`, color: '#0369a1' },
      { label: 'Tỷ trọng / Doanh thu thuần:', value: netRevenue > 0 ? `${((salesExpense / netRevenue) * 100).toFixed(1)}%` : '0.0%', color: '#d97706' },
    ],
    hint: 'Để phê duyệt đề nghị thanh toán hoặc theo dõi định mức chi phí bán hàng, hoa hồng dự án, vui lòng truy cập phân hệ Quản lý công nợ và chi phí → Bước 4: Chi phí.',
    items: salesItems,
  };

  const adminItems = adminExpItems.map((e) => ({
    id: String(e.id),
    title: e.title,
    amount: Number(e.amount) || 0,
    amountColor: '#d97706',
    subtitles: [
      `Mã: ${e.code}`,
      `Bộ phận: ${e.department || 'Hành chính'}`,
      `Ngày: ${e.spend_date || 'Trong kỳ'}`,
    ],
    note: 'Chi phí quản lý doanh nghiệp phục vụ vận hành toàn hệ thống',
  }));

  if (adminExpenseJournal > 0) {
    adminItems.unshift({
      id: 'dep-642',
      title: 'Chi phí khấu hao tài sản cố định (Văn phòng, phần mềm ERP, thiết bị quản trị)',
      amount: adminExpenseJournal,
      amountColor: '#7c3aed',
      subtitles: [
        'Mã: KH-TSCĐ-642',
        'Bộ phận: Khối Quản trị Doanh nghiệp',
        `Kỳ: ${periodTitle}`,
      ],
      note: 'Trích khấu hao tài sản cố định tự động định kỳ vào TK 642',
    });
  }

  const adminExpenseBreakdown = {
    type: 'expenses',
    title: 'Chi phí quản lý doanh nghiệp',
    sourceTable: 'financial_expenses & TK 642',
    sourceLabel: 'Đồng bộ tự động từ phân hệ chi phí Quản lý & Sổ nhật ký chung TK 642',
    totalLabel: 'Tổng chi phí quản lý doanh nghiệp:',
    totalAmount: adminExpense,
    stats: [
      { label: 'Chi phí văn phòng & quản lý:', value: formatVND(adminExpense), color: '#0369a1' },
      { label: 'Tỷ trọng / Doanh thu thuần:', value: netRevenue > 0 ? `${((adminExpense / netRevenue) * 100).toFixed(1)}%` : '0.0%', color: '#d97706' },
    ],
    hint: 'Để quản lý các khoản chi hành chính, công tác phí hoặc văn phòng phẩm, vui lòng truy cập phân hệ Quản lý công nợ và chi phí → Bước 4: Chi phí.',
    items: adminItems,
  };

  // 11. Doanh thu bán hàng (Mã 01)
  const contractsList = Array.isArray(dbData.contractsList) ? dbData.contractsList : [];
  const revenueItems = contractsList.length > 0
    ? contractsList.map((c) => ({
        id: `rev-${c.id}`,
        title: c.project_name || `Hợp đồng ${c.contract_code}`,
        amount: Number(c.contract_value) || 0,
        amountPrefix: '+',
        amountColor: '#059669',
        subtitles: [`HĐ: ${c.contract_code || '---'}`, c.investor_name || 'Khách hàng', c.status || 'Đang thực hiện'],
        note: 'Giá trị hợp đồng kinh tế ký kết phát sinh thực tế trong hệ thống',
      }))
    : [];

  const revenueBreakdown = {
    type: 'revenue',
    title: 'Doanh thu bán hàng và cung cấp dịch vụ',
    sourceTable: 'contracts & quotations & TK 511',
    sourceLabel: 'Đồng bộ từ hợp đồng bán hàng, báo giá và hóa đơn doanh thu phát sinh',
    totalLabel: 'Tổng doanh thu bán hàng & CCDV:',
    totalAmount: baseRevenue,
    stats: [
      { label: 'Doanh thu thuần sau giảm trừ:', value: formatVND(netRevenue), color: '#059669' },
      { label: 'Tăng trưởng so với cùng kỳ:', value: '0.0%', color: '#0284c7' },
    ],
    hint: 'Để xem chi tiết hợp đồng kinh tế, tiến độ nghiệm thu hoặc xuất hóa đơn tài chính, vui lòng truy cập phân hệ Quản lý bán hàng và hợp đồng.',
    items: revenueItems,
  };

  // 12. Giá vốn hàng bán (Mã 11)
  const cogsItems = [];
  if (directProdExpenseJournal > 0) {
    cogsItems.push({
      id: 'cogs-journal',
      title: 'Chi phí sản xuất phát sinh từ Sổ nhật ký chung (TK 621, 622, 627)',
      amount: directProdExpenseJournal,
      amountColor: '#0369a1',
      subtitles: ['TK 621, 627', 'Sổ nhật ký chung', 'Chi phí trực tiếp'],
      note: 'Tổng chi phí sản xuất hạch toán trực tiếp trong kỳ',
    });
  }
  if (expProduction > 0) {
    cogsItems.push({
      id: 'cogs-expenses',
      title: 'Chi phí sản xuất từ phân hệ Quản lý chi phí',
      amount: expProduction,
      amountColor: '#0369a1',
      subtitles: ['financial_expenses', 'Nhóm Chi phí Sản xuất'],
      note: 'Tổng các khoản chi trực tiếp cho phân xưởng sản xuất trong kỳ',
    });
  }

  const cogsBreakdown = {
    type: 'expenses',
    title: 'Giá vốn hàng bán (Chi phí nguyên vật liệu, nhân công, SXC)',
    sourceTable: 'warehouse_movements & TK 621, 622, 627',
    sourceLabel: 'Đồng bộ từ phiếu xuất kho sản xuất và chi phí phân xưởng trực tiếp',
    totalLabel: 'Tổng giá vốn hàng bán kỳ này:',
    totalAmount: cogs,
    stats: [
      { label: 'Tỷ lệ giá vốn / Doanh thu thuần:', value: netRevenue > 0 ? `${((cogs / netRevenue) * 100).toFixed(1)}%` : '0.0%', color: '#d97706' },
      { label: 'Lợi nhuận gộp tạo ra:', value: formatVND(grossProfit), color: '#059669' },
    ],
    hint: 'Để theo dõi chi phí sản xuất từng lô sản phẩm cửa hoặc định mức hao hụt nguyên vật liệu, vui lòng truy cập phân hệ Sản xuất và Kho hàng.',
    items: cogsItems,
  };

  // 4. DANH SÁCH DÒNG BÁO CÁO CÂN ĐỐI KẾ TOÁN (B01 - DN)
  const balanceSheetRows = [
    { code: '100', name: 'A. TÀI SẢN NGẮN HẠN', note: 'V.01', closing: finalShortTermAssets, opening: openingShortTermAssets, isBold: true, isHeader: true, level: 0 },
    { code: '110', name: 'I. Tiền và các khoản tương đương tiền', note: 'V.02', closing: totalCashAndEquivalents, opening: initCash + initBank, isBold: true, level: 1, breakdown: cashGeneralBreakdown },
    { code: '111', name: '1. Tiền mặt tại quỹ', note: '', closing: cashInHand, opening: initCash, level: 2, isEstimated: (cash111Flow === 0 && !hasInitDec), estimateNote: cash111Flow !== 0 ? 'Đã liên kết phát sinh thực tế TK 1111 (Sổ nhật ký chung)' : (initNote || 'Định mức tồn két'), breakdown: cashInHandBreakdown },
    { code: '112', name: '2. Tiền gửi ngân hàng (Vietcombank, BIDV, Techcombank)', note: '', closing: bankDeposits, opening: initBank, level: 2, isEstimated: (bank112Flow === 0 && !hasInitDec), estimateNote: bank112Flow !== 0 ? 'Đã liên kết phát sinh thực tế TK 1121 (Sổ nhật ký chung - Vietcombank)' : (initNote || 'Định mức tiền gửi'), breakdown: bankDepositBreakdown },
    { code: '120', name: 'II. Đầu tư tài chính ngắn hạn', note: 'V.03', closing: shortTermInvestments, opening: initShortTermInvestments, isBold: true, level: 1, isEstimated: !hasInitDec, estimateNote: initNote || 'Định mức tiền gửi có kỳ hạn đầu tư ngắn hạn', breakdown: termDepositBreakdown },
    { code: '121', name: '1. Tiền gửi có kỳ hạn 3 - 6 tháng', note: '', closing: shortTermInvestments, opening: initShortTermInvestments, level: 2, isEstimated: !hasInitDec, estimateNote: initNote || 'Định mức tiền gửi có kỳ hạn', breakdown: termDepositBreakdown },
    { code: '130', name: 'III. Các khoản phải thu ngắn hạn', note: 'V.04', closing: totalShortTermReceivables, opening: initRec + initPrepaymentsToSuppliers + initOtherShortTermReceivables, isBold: true, level: 1, breakdown: receivablesBreakdown },
    { code: '131', name: '1. Phải thu ngắn hạn của khách hàng', note: '', closing: shortTermReceivables, opening: initRec, level: 2, breakdown: receivablesBreakdown },
    { code: '132', name: '2. Trả trước cho người bán ngắn hạn', note: '', closing: prepaymentsToSuppliers, opening: initPrepaymentsToSuppliers, level: 2, isEstimated: !hasInitDec, estimateNote: initNote || 'Tạm ứng nhà cung cấp' },
    {
      code: '136',
      name: '3. Phải thu ngắn hạn khác (Tạm ứng công tác, mua sắm)',
      note: '',
      closing: otherShortTermReceivables,
      opening: initOtherShortTermReceivables,
      level: 2,
      isEstimated: !hasRealAdvance && !hasInitDec,
      estimateNote: hasRealAdvance
        ? 'Đã đồng bộ tự động từ TK 141 (Tạm ứng nhân sự) & Bảng lương'
        : (initNote || 'Tạm ứng nhân viên')
    },
    { code: '140', name: 'IV. Hàng tồn kho', note: 'V.05', closing: totalInventory, opening: initInventoryTotal, isBold: true, level: 1, breakdown: inventoryBreakdown },
    {
      code: '141',
      name: '1. Hàng tồn kho (Nguyên phụ liệu gỗ, phụ kiện inox, bán thành phẩm)',
      note: '',
      closing: inventoryGross,
      opening: initInventoryGross,
      level: 2,
      isEstimated: !isInventoryFromDb && !hasInitDec,
      estimateNote: isInventoryFromDb
        ? 'Dữ liệu thực tế từ CSDL kho hàng (bảng goods)'
        : (initNote || 'Định mức tồn kho'),
      breakdown: inventoryBreakdown,
    },
    { code: '149', name: '2. Dự phòng giảm giá hàng tồn kho (*)', note: '', closing: inventoryProvision, opening: initInventoryProvision, level: 2, isEstimated: !hasInitDec, estimateNote: initNote || 'Dự phòng giảm giá hàng tồn kho' },
    { code: '150', name: 'V. Tài sản ngắn hạn khác', note: 'V.06', closing: otherShortTermAssets, opening: initVatDeductible + initOtherTaxReceivables, isBold: true, level: 1 },
    {
      code: '151',
      name: '1. Thuế GTGT được khấu trừ',
      note: '',
      closing: vatDeductible,
      opening: initVatDeductible,
      level: 2,
      isEstimated: !hasRealVatDeductible && !hasInitDec,
      estimateNote: hasRealVatDeductible
        ? 'Đã đồng bộ tự động từ TK 1331 (Thuế GTGT đầu vào khấu trừ) Sổ nhật ký chung'
        : (initNote || 'Thuế GTGT khấu trừ chuyển kỳ')
    },
    { code: '152', name: '2. Thuế và các khoản khác phải thu Nhà nước', note: '', closing: initOtherTaxReceivables, opening: initOtherTaxReceivables, level: 2, isEstimated: !hasInitDec, estimateNote: initNote || 'Thuế tạm nộp thừa' },

    { code: '200', name: 'B. TÀI SẢN DÀI HẠN', note: 'V.07', closing: totalLongTermAssets, opening: openingLongTermAssets, isBold: true, isHeader: true, level: 0 },
    { code: '210', name: 'I. Các khoản phải thu dài hạn', note: 'V.08', closing: longTermReceivables, opening: initLongTermReceivables, isBold: true, level: 1, isEstimated: !hasInitDec, estimateNote: initNote || 'Ký cược, ký quỹ dài hạn' },
    { code: '220', name: 'II. Tài sản cố định', note: 'V.09', closing: totalFixedAssets, opening: initTangibleNet + initIntangibleNet, isBold: true, level: 1, breakdown: fixedAssetsBreakdown },
    { code: '221', name: '1. Tài sản cố định hữu hình (Máy CNC, máy ép nhiệt, nhà xưởng)', note: '', closing: faNetBookValue, opening: initTangibleNet, level: 2, breakdown: fixedAssetsBreakdown },
    { code: '222', name: '- Nguyên giá', note: '', closing: faOrigValue, opening: initTangibleOriginal, level: 3, breakdown: fixedAssetsBreakdown },
    { code: '223', name: '- Giá trị hao mòn luỹ kế (*)', note: '', closing: -faAccDepreciation, opening: initTangibleDepreciation, level: 3, breakdown: fixedAssetsBreakdown },
    { code: '227', name: '2. Tài sản cố định vô hình (Phần mềm ERP, bản quyền thiết kế)', note: '', closing: intangibleAssets, opening: initIntangibleNet, level: 2, isEstimated: (dbFaIntangibleOrig === 0 && !hasInitDec), estimateNote: (dbFaIntangibleOrig > 0) ? 'Đã đồng bộ từ CSDL fixed_assets loại vô hình' : (initNote || 'Phần mềm ERP, bản quyền thiết kế'), breakdown: fixedAssetsBreakdown },
    { code: '240', name: 'III. Tài sản dở dang dài hạn', note: 'V.10', closing: constructionInProgress, opening: initConstructionInProgress, isBold: true, level: 1, isEstimated: !hasInitDec, estimateNote: initNote || 'Chi phí XDCB dở dang' },
    { code: '242', name: '1. Chi phí xây dựng cơ bản dở dang (Mở rộng Xưởng số 2)', note: '', closing: constructionInProgress, opening: initConstructionInProgress, level: 2, isEstimated: !hasInitDec, estimateNote: initNote || 'Mở rộng xưởng số 2' },
    { code: '260', name: 'IV. Tài sản dài hạn khác', note: 'V.11', closing: otherLongTermAssets, opening: initLongTermPrepayments, isBold: true, level: 1, isEstimated: !hasInitDec, estimateNote: initNote || 'Chi phí trả trước dài hạn' },
    { code: '261', name: '1. Chi phí trả trước dài hạn (Thuê đất KCN, bảo dưỡng lớn)', note: '', closing: otherLongTermAssets, opening: initLongTermPrepayments, level: 2, isEstimated: !hasInitDec, estimateNote: initNote || 'Tiền thuê đất KCN trả trước' },

    { code: '270', name: 'TỔNG CỘNG TÀI SẢN (270 = 100 + 200)', note: '', closing: finalTotalAssets, opening: openingTotalAssets, isBold: true, isHeader: true, level: 0 },

    // NGUỒN VỐN
    { code: '300', name: 'C. NỢ PHẢI TRẢ', note: 'V.12', closing: totalLiabilities, opening: openingLiabilities, isBold: true, isHeader: true, level: 0 },
    { code: '310', name: 'I. Nợ ngắn hạn', note: 'V.13', closing: totalShortTermLiabilities, opening: openingShortTermLiabilities, isBold: true, level: 1, breakdown: payablesBreakdown },
    { code: '311', name: '1. Phải trả người bán ngắn hạn (An Cường, KinLong, Vicostone)', note: '', closing: payablesToSuppliers, opening: initPayablesToSuppliers, level: 2, breakdown: payablesBreakdown },
    { code: '312', name: '2. Người mua trả tiền trước ngắn hạn', note: '', closing: customerPrepayments, opening: initCustomerPrepayments, level: 2, isEstimated: !hasInitDec, estimateNote: initNote || 'Khách hàng đặt cọc trước tiền hàng' },
    {
      code: '313',
      name: '3. Thuế và các khoản phải nộp Nhà nước',
      note: '',
      closing: taxPayables,
      opening: initTaxPayables,
      level: 2,
      isEstimated: !hasRealTax && !hasInitDec,
      estimateNote: hasRealTax
        ? 'Đã đồng bộ tự động từ TK 3331 (Thuế GTGT đầu ra) & Thuế TNCN bảng lương'
        : (initNote || 'Nghĩa vụ thuế môn bài, thuế GTGT còn nộp')
    },
    {
      code: '314',
      name: '4. Phải trả người lao động (Lương, thưởng)',
      note: '',
      closing: employeePayables,
      opening: initEmployeePayables,
      level: 2,
      isEstimated: !hasRealPayroll && !hasInitDec,
      estimateNote: hasRealPayroll
        ? 'Đã đồng bộ tự động từ Bảng lương nhân sự monthly_payrolls'
        : (initNote || 'Lương nhân sự kỳ trước chưa chi trả'),
      breakdown: payrollBreakdown,
    },
    {
      code: '320',
      name: '5. Vay và nợ thuê tài chính ngắn hạn (Ngân hàng)',
      note: 'V.13',
      closing: shortTermLoans,
      opening: initShortTermLoans,
      level: 2,
      sourceTable: 'bank_loans',
      sourceLabel: `Đồng bộ từ CSDL bank_loans: ${shortTermLoanBreakdown.map(i => `${i.bankName.includes('Vietcombank') ? 'VCB' : i.bankName.includes('BIDV') ? 'BIDV' : i.bankName.includes('VietinBank') ? 'VietinBank' : 'NH'} (${(i.allocatedAmount / 1e9).toFixed(1)} tỷ)`).join(' + ')}`,
      loanBreakdown: shortTermLoanBreakdown,
      breakdown: loanShortTermBreakdown,
    },
    { code: '330', name: 'II. Nợ dài hạn', note: 'V.14', closing: totalLongTermLiabilities, opening: openingLongTermLiabilities, isBold: true, level: 1, breakdown: loanLongTermBreakdown },
    {
      code: '338',
      name: '1. Vay và nợ thuê tài chính dài hạn (Ngân hàng)',
      note: 'V.14',
      closing: longTermLoans,
      opening: initLongTermLoans,
      level: 2,
      sourceTable: 'bank_loans',
      sourceLabel: `Đồng bộ từ CSDL bank_loans: ${longTermLoanBreakdown.map(i => `${i.bankName.includes('Vietcombank') ? 'VCB' : 'NH'} (${(i.allocatedAmount / 1e9).toFixed(1)} tỷ)`).join(' + ')}`,
      loanBreakdown: longTermLoanBreakdown,
      breakdown: loanLongTermBreakdown,
    },

    { code: '400', name: 'D. VỐN CHỦ SỞ HỮU', note: 'V.15', closing: balancedEquity, opening: openingEquity, isBold: true, isHeader: true, level: 0 },
    { code: '410', name: 'I. Vốn chủ sở hữu', note: '', closing: balancedEquity, opening: openingEquity, isBold: true, level: 1 },
    { code: '411', name: '1. Vốn góp của chủ sở hữu', note: '', closing: ownerEquityCapital, opening: initOwnerEquity, level: 2, isEstimated: !hasInitDec, estimateNote: initNote || 'Vốn điều lệ (Theo Giấy phép ĐKKD)' },
    { code: '418', name: '2. Quỹ đầu tư phát triển', note: '', closing: developmentFund, opening: initDevelopmentFund, level: 2, isEstimated: !hasInitDec, estimateNote: initNote || 'Quỹ đầu tư phát triển' },
    { code: '421', name: '3. Lợi nhuận sau thuế chưa phân phối', note: '', closing: balancedRetainedEarnings, opening: initRetainedEarnings, level: 2 },
    { code: '421a', name: '- LNST chưa phân phối luỹ kế đến cuối kỳ trước', note: '', closing: prevRetainedEarningsAccumulated, opening: initRetainedEarnings, level: 3, isEstimated: !hasInitDec, estimateNote: initNote || 'LNST lũy kế năm trước' },
    { code: '421b', name: '- LNST chưa phân phối kỳ này', note: '', closing: currentRetainedEarnings, opening: prevNetProfit, level: 3 },

    { code: '440', name: 'TỔNG CỘNG NGUỒN VỐN (440 = 300 + 400)', note: '', closing: finalTotalResources, opening: openingTotalResources, isBold: true, isHeader: true, level: 0 },
  ];

  // 5. DANH SÁCH DÒNG BÁO CÁO KẾT QUẢ KINH DOANH (B02 - DN)
  const incomeStatementRows = [
    { code: '01', name: '1. Doanh thu bán hàng và cung cấp dịch vụ', note: 'VI.01', closing: baseRevenue, opening: prevRevenue, isBold: true, level: 0, breakdown: revenueBreakdown },
    { code: '02', name: '2. Các khoản giảm trừ doanh thu (Chiết khấu, giảm giá)', note: 'VI.02', closing: salesDiscounts, opening: prevSalesDiscounts, level: 0, isEstimated: true, estimateNote: 'Chiết khấu thương mại định mức (Cần thiết lập chính sách bán hàng khi khởi tạo)' },
    { code: '10', name: '3. Doanh thu thuần về bán hàng và CCDV (10 = 01 - 02)', note: 'VI.03', closing: netRevenue, opening: prevNetRevenue, isBold: true, isHeader: true, level: 0, breakdown: revenueBreakdown },
    { code: '11', name: '4. Giá vốn hàng bán (Chi phí nguyên vật liệu, nhân công, SXC)', note: 'VI.04', closing: cogs, opening: prevCogs, level: 0, breakdown: cogsBreakdown },
    { code: '20', name: '5. Lợi nhuận gộp về bán hàng và CCDV (20 = 10 - 11)', note: '', closing: grossProfit, opening: prevGrossProfit, isBold: true, isHeader: true, level: 0 },
    {
      code: '21',
      name: '6. Doanh thu hoạt động tài chính (Lãi tiền gửi, chiết khấu TT)',
      note: 'VI.05',
      closing: financialIncome,
      opening: prevFinancialIncome,
      level: 0,
      isEstimated: false,
      sourceTable: 'cash_and_bank_assets',
      sourceLabel: `Đồng bộ tự động từ lãi tiền gửi bảng cash_and_bank_assets (${(totalDepositInterestForPeriod / 1e6).toFixed(1)} tr lãi tiền gửi)`,
      interestBreakdown: interestBreakdown,
      breakdown: financialIncomeBreakdown,
    },
    { code: '22', name: '7. Chi phí tài chính', note: 'VI.06', closing: financialExpense, opening: prevFinancialExpense, level: 0, breakdown: loanExpenseBreakdown },
    {
      code: '23',
      name: '- Trong đó: Chi phí lãi vay ngân hàng',
      note: '',
      closing: interestExpense,
      opening: Math.round(interestExpense * 0.85),
      level: 1,
      isEstimated: false,
      sourceTable: 'bank_loans',
      sourceLabel: `Đồng bộ tự động từ lãi suất & dư nợ hợp đồng vay bank_loans (${(monthlyLoanInterest / 1e6).toFixed(1)} tr/tháng)`,
      loanBreakdown: shortTermLoanBreakdown.concat(longTermLoanBreakdown),
      breakdown: loanExpenseBreakdown,
    },
    { code: '25', name: '8. Chi phí bán hàng (Vận chuyển, hoa hồng thầu, tiếp thị)', note: 'VI.07', closing: salesExpense, opening: prevSalesExpense, level: 0, breakdown: salesExpenseBreakdown },
    { code: '26', name: '9. Chi phí quản lý doanh nghiệp (Lương văn phòng, khấu hao, quản lý)', note: 'VI.08', closing: adminExpense, opening: prevAdminExpense, level: 0, breakdown: adminExpenseBreakdown },
    { code: '30', name: '10. Lợi nhuận thuần từ hoạt động kinh doanh (30 = 20 + 21 - 22 - 25 - 26)', note: '', closing: operatingProfit, opening: prevOperatingProfit, isBold: true, isHeader: true, level: 0 },
    { code: '31', name: '11. Thu nhập khác (Thanh lý phế liệu gỗ, vật tư vụn)', note: '', closing: otherIncome, opening: 0, level: 0 },
    { code: '32', name: '12. Chi phí khác', note: '', closing: otherExpense, opening: 0, level: 0 },
    { code: '40', name: '13. Lợi nhuận khác (40 = 31 - 32)', note: '', closing: otherProfit, opening: prevOtherProfit, isBold: true, level: 0 },
    { code: '50', name: '14. Tổng lợi nhuận kế toán trước thuế (50 = 30 + 40)', note: '', closing: profitBeforeTax, opening: prevProfitBeforeTax, isBold: true, isHeader: true, level: 0 },
    { code: '51', name: '15. Chi phí thuế TNDN hiện hành (20%)', note: 'VI.09', closing: incomeTax, opening: prevIncomeTax, level: 0 },
    { code: '60', name: '16. Lợi nhuận sau thuế thu nhập doanh nghiệp (60 = 50 - 51)', note: '', closing: netProfit, opening: prevNetProfit, isBold: true, isHeader: true, level: 0 },
  ];

  // 6. DANH SÁCH DÒNG BÁO CÁO LƯU CHUYỂN TIỀN TỆ (B03 - DN)
  const cashInflowSales = baseRevenue;
  const cashOutflowSuppliers = -cogs;
  const cashOutflowEmployees = -payrollNet;
  const cashOutflowInterest = -interestExpense;
  const cashOutflowTax = -incomeTax;
  const cashOutflowOther = -salesExpense - adminExpense;
  const cashFromOps = cashInflowSales + cashOutflowSuppliers + cashOutflowEmployees + cashOutflowInterest + cashOutflowTax + cashOutflowOther;

  const cashOutflowCapEx = 0;
  const cashInflowAssetLiquidation = 0;
  const cashInflowInterest = totalDepositInterestForPeriod;
  const cashFromInvest = cashOutflowCapEx + cashInflowAssetLiquidation + cashInflowInterest;

  const cashInflowLoan = 0;
  const cashOutflowLoanRepay = -totalLoanPaidPrincipal;
  const cashFromFin = cashInflowLoan + cashOutflowLoanRepay;

  const netCashFlow = cashFromOps + cashFromInvest + cashFromFin;
  const openingCash = initCash + initBank;
  const closingCash = openingCash + netCashFlow;

  const cashFlowRows = [
    { code: 'I', name: 'I. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG KINH DOANH', note: '', closing: cashFromOps, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '01', name: '1. Tiền thu từ bán hàng, cung cấp dịch vụ và doanh thu khác', note: '', closing: cashInflowSales, opening: 0, level: 1, breakdown: receivablesBreakdown },
    { code: '02', name: '2. Tiền chi trả cho người cung cấp hàng hóa và dịch vụ', note: '', closing: cashOutflowSuppliers, opening: 0, level: 1, breakdown: payablesBreakdown },
    { code: '03', name: '3. Tiền chi trả cho người lao động (Tiền lương và phụ cấp)', note: '', closing: cashOutflowEmployees, opening: 0, level: 1, breakdown: payrollBreakdown },
    {
      code: '04',
      name: '4. Tiền chi trả lãi vay',
      note: '',
      closing: cashOutflowInterest,
      opening: 0,
      level: 1,
      sourceTable: 'bank_loans',
      sourceLabel: `Đồng bộ từ chi phí lãi vay ngân hàng phát sinh (${(monthlyLoanInterest / 1e6).toFixed(1)} tr/tháng)`,
      breakdown: loanExpenseBreakdown,
    },
    { code: '05', name: '5. Tiền chi nộp thuế thu nhập doanh nghiệp', note: '', closing: cashOutflowTax, opening: 0, level: 1 },
    { code: '07', name: '6. Tiền chi khác cho hoạt động kinh doanh', note: '', closing: cashOutflowOther, opening: 0, level: 1 },
    { code: '20', name: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh (Mã 20)', note: '', closing: cashFromOps, opening: 0, isBold: true, level: 0 },

    { code: 'II', name: 'II. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG ĐẦU TƯ', note: '', closing: cashFromInvest, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '21', name: '1. Tiền chi để mua sắm, xây dựng TSCĐ và các TSDH khác', note: '', closing: cashOutflowCapEx, opening: 0, level: 1, breakdown: fixedAssetsBreakdown },
    { code: '22', name: '2. Tiền thu từ thanh lý, nhượng bán TSCĐ và các TSDH khác', note: '', closing: cashInflowAssetLiquidation, opening: 0, level: 1 },
    { code: '27', name: '3. Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia', note: '', closing: cashInflowInterest, opening: 0, level: 1, breakdown: financialIncomeBreakdown },
    { code: '30', name: 'Lưu chuyển tiền thuần từ hoạt động đầu tư (Mã 30)', note: '', closing: cashFromInvest, opening: 0, isBold: true, level: 0 },

    { code: 'III', name: 'III. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG TÀI CHÍNH', note: '', closing: cashFromFin, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '33', name: '1. Tiền thu từ đi vay (Giải ngân vốn vay dự án)', note: '', closing: cashInflowLoan, opening: 0, level: 1, breakdown: loanShortTermBreakdown },
    {
      code: '34',
      name: '2. Tiền chi trả nợ gốc vay ngân hàng',
      note: '',
      closing: cashOutflowLoanRepay,
      opening: 0,
      level: 1,
      sourceTable: 'bank_loans',
      sourceLabel: `Đồng bộ từ tổng nợ gốc đã trả thực tế trong bảng bank_loans (${(totalLoanPaidPrincipal / 1e9).toFixed(1)} tỷ)`,
      breakdown: loanShortTermBreakdown,
    },
    { code: '40', name: 'Lưu chuyển tiền thuần từ hoạt động tài chính (Mã 40)', note: '', closing: cashFromFin, opening: 0, isBold: true, level: 0 },

    { code: '50', name: 'LƯU CHUYỂN TIỀN THUẦN TRONG KỲ (50 = 20 + 30 + 40)', note: '', closing: netCashFlow, opening: 0, isBold: true, isHeader: true, level: 0 },
    { code: '60', name: 'Tiền và tương đương tiền đầu kỳ', note: '', closing: openingCash, opening: 0, isBold: true, level: 0, breakdown: cashGeneralBreakdown },
    { code: '70', name: 'Tiền và tương đương tiền cuối kỳ (70 = 50 + 60)', note: '', closing: closingCash, opening: openingCash, isBold: true, isHeader: true, level: 0, breakdown: cashGeneralBreakdown },
  ];

  // 7. TÍNH TOÁN 12 CHỈ SỐ TÀI CHÍNH TỰ ĐỘNG THEO DỮ LIỆU THỰC TẾ
  // Khả năng thanh toán
  const hasShortTermAssets = finalShortTermAssets > 0;
  const hasShortTermLiab = totalShortTermLiabilities > 0;

  let currentRatioVal = '-';
  let currentRatioStatus = 'Chưa có dữ liệu';
  if (!hasShortTermLiab) {
    if (hasShortTermAssets) {
      currentRatioVal = 'Không có nợ';
      currentRatioStatus = 'An toàn tuyệt đối';
    }
  } else {
    const val = (finalShortTermAssets / totalShortTermLiabilities).toFixed(2);
    currentRatioVal = `${val} lần`;
    currentRatioStatus = Number(val) >= 1.5 ? 'Tốt' : 'Cần chú ý';
  }

  let quickRatioVal = '-';
  let quickRatioStatus = 'Chưa có dữ liệu';
  if (!hasShortTermLiab) {
    if (hasShortTermAssets) {
      quickRatioVal = 'Không có nợ';
      quickRatioStatus = 'An toàn tuyệt đối';
    }
  } else {
    const quickAssets = Math.max(0, finalShortTermAssets - totalInventory);
    const val = (quickAssets / totalShortTermLiabilities).toFixed(2);
    quickRatioVal = `${val} lần`;
    quickRatioStatus = Number(val) >= 1.0 ? 'Tốt' : 'Cần chú ý';
  }

  let cashRatioVal = '-';
  let cashRatioStatus = 'Chưa có dữ liệu';
  if (!hasShortTermLiab) {
    if (totalCashAndEquivalents > 0) {
      cashRatioVal = 'Không có nợ';
      cashRatioStatus = 'An toàn tuyệt đối';
    }
  } else {
    const val = (totalCashAndEquivalents / totalShortTermLiabilities).toFixed(2);
    cashRatioVal = `${val} lần`;
    cashRatioStatus = Number(val) >= 0.3 ? 'An toàn' : 'Thấp';
  }

  // Hiệu quả hoạt động
  const hasInventoryData = totalInventory > 0 && cogs > 0;
  let inventoryTurnoverVal = '-';
  let inventoryTurnoverStatus = 'Chưa có dữ liệu';
  let dioVal = '-';
  let dioStatus = 'Chưa có dữ liệu';

  if (hasInventoryData) {
    const val = (cogs / totalInventory).toFixed(2);
    inventoryTurnoverVal = `${val} vòng`;
    inventoryTurnoverStatus = Number(val) >= 2.2 ? 'Đạt chuẩn' : 'Chậm';
    if (Number(val) > 0) {
      const d = Math.round(365 / Number(val));
      dioVal = `${d} ngày`;
      dioStatus = d <= 160 ? 'Tốt' : 'Chậm';
    }
  }

  const hasReceivablesData = netRevenue > 0 && totalShortTermReceivables > 0;
  let dsoVal = '-';
  let dsoStatus = 'Chưa có dữ liệu';
  if (hasReceivablesData) {
    const d = Math.round((totalShortTermReceivables * 365) / netRevenue);
    dsoVal = `${d} ngày`;
    dsoStatus = d <= 100 ? 'Kiểm soát' : 'Kéo dài';
  }

  // Cơ cấu vốn và Đòn bẩy
  const hasAssets = finalTotalAssets > 0;
  let debtToAssetsVal = '-';
  let debtToAssetsStatus = 'Chưa có dữ liệu';
  if (hasAssets) {
    const val = ((totalLiabilities / finalTotalAssets) * 100).toFixed(1);
    debtToAssetsVal = `${val}%`;
    debtToAssetsStatus = Number(val) <= 50 ? 'Rất an toàn' : 'Rủi ro';
  }

  const hasEquity = balancedEquity > 0;
  let debtToEquityVal = '-';
  let debtToEquityStatus = 'Chưa có dữ liệu';
  if (hasEquity) {
    const val = ((totalLiabilities / balancedEquity) * 100).toFixed(1);
    debtToEquityVal = `${val}%`;
    debtToEquityStatus = Number(val) <= 100 ? 'An toàn' : 'Cao';
  } else if (totalLiabilities > 0) {
    debtToEquityVal = '> 100%';
    debtToEquityStatus = 'Nguy cơ mất vốn';
  }

  let icrVal = '-';
  let icrStatus = 'Chưa có dữ liệu';
  if (interestExpense > 0) {
    const val = (operatingProfit / interestExpense).toFixed(1);
    icrVal = `${val} lần`;
    icrStatus = Number(val) >= 3.0 ? 'Xuất sắc' : 'Nguy hiểm';
  } else if (operatingProfit > 0) {
    icrVal = 'Không có lãi vay';
    icrStatus = 'An toàn tuyệt đối';
  }

  // Khả năng sinh lời
  const hasRevenue = netRevenue > 0;
  let grossMarginVal = '-';
  let grossMarginStatus = 'Chưa có dữ liệu';
  if (hasRevenue) {
    const val = ((grossProfit / netRevenue) * 100).toFixed(1);
    grossMarginVal = `${val}%`;
    grossMarginStatus = Number(val) >= 28 ? 'Cao' : 'Thấp';
  }

  let netMarginVal = '-';
  let netMarginStatus = 'Chưa có dữ liệu';
  if (hasRevenue) {
    const val = ((netProfit / netRevenue) * 100).toFixed(1);
    netMarginVal = `${val}%`;
    netMarginStatus = Number(val) >= 10 ? 'Vượt trội' : 'Trung bình';
  }

  let roaVal = '-';
  let roaStatus = 'Chưa có dữ liệu';
  if (hasAssets && hasRevenue) {
    const val = ((netProfit / finalTotalAssets) * 100).toFixed(1);
    roaVal = `${val}%`;
    roaStatus = Number(val) >= 7 ? 'Tốt' : 'Thấp';
  }

  let roeVal = '-';
  let roeStatus = 'Chưa có dữ liệu';
  if (hasEquity && hasRevenue) {
    const val = ((netProfit / balancedEquity) * 100).toFixed(1);
    roeVal = `${val}%`;
    roeStatus = Number(val) >= 12 ? 'Xuất sắc' : 'Đạt';
  }

  const ratioCategories = [
    {
      title: 'Khả năng thanh toán',
      iconKey: 'wallet',
      ratios: [
        { name: 'Hệ số thanh toán hiện hành (Current Ratio)', value: currentRatioVal, benchmark: '≥ 1.5 lần', status: currentRatioStatus, desc: 'Tài sản ngắn hạn / Nợ ngắn hạn' },
        { name: 'Hệ số thanh toán nhanh (Quick Ratio)', value: quickRatioVal, benchmark: '≥ 1.0 lần', status: quickRatioStatus, desc: '(TSNH - Hàng tồn kho) / Nợ ngắn hạn' },
        { name: 'Hệ số thanh toán tức thời (Cash Ratio)', value: cashRatioVal, benchmark: '≥ 0.3 lần', status: cashRatioStatus, desc: 'Tiền và tương đương tiền / Nợ ngắn hạn' },
      ],
    },
    {
      title: 'Hiệu quả hoạt động',
      iconKey: 'graph',
      ratios: [
        { name: 'Vòng quay hàng tồn kho (Inventory Turnover)', value: inventoryTurnoverVal, benchmark: '2.2 - 3.0 vòng', status: inventoryTurnoverStatus, desc: 'Giá vốn / Hàng tồn kho bình quân' },
        { name: 'Số ngày luân chuyển tồn kho (DIO)', value: dioVal, benchmark: '≤ 160 ngày', status: dioStatus, desc: '365 / Vòng quay hàng tồn kho' },
        { name: 'Kỳ thu tiền bình quân (DSO)', value: dsoVal, benchmark: '≤ 100 ngày', status: dsoStatus, desc: 'Phải thu bình quân × 365 / Doanh thu' },
      ],
    },
    {
      title: 'Cơ cấu vốn và Đòn bẩy',
      iconKey: 'pie',
      ratios: [
        { name: 'Hệ số Nợ trên Tổng tài sản (Debt / Assets)', value: debtToAssetsVal, benchmark: '≤ 50%', status: debtToAssetsStatus, desc: 'Tổng nợ phải trả / Tổng tài sản' },
        { name: 'Hệ số Nợ trên Vốn CSH (Debt / Equity)', value: debtToEquityVal, benchmark: '≤ 100%', status: debtToEquityStatus, desc: 'Tổng nợ phải trả / Vốn chủ sở hữu' },
        { name: 'Hệ số khả năng trả lãi vay (ICR)', value: icrVal, benchmark: '≥ 3.0 lần', status: icrStatus, desc: 'EBIT / Chi phí lãi vay' },
      ],
    },
    {
      title: 'Khả năng sinh lời',
      iconKey: 'cash',
      ratios: [
        { name: 'Biên lợi nhuận gộp (Gross Margin)', value: grossMarginVal, benchmark: '28% - 32%', status: grossMarginStatus, desc: 'Lợi nhuận gộp / Doanh thu thuần' },
        { name: 'Biên lợi nhuận ròng (Net Profit Margin)', value: netMarginVal, benchmark: '10% - 15%', status: netMarginStatus, desc: 'Lợi nhuận sau thuế / Doanh thu thuần' },
        { name: 'Tỷ suất sinh lời trên tài sản (ROA)', value: roaVal, benchmark: '≥ 7%', status: roaStatus, desc: 'LNST / Tổng tài sản bình quân' },
        { name: 'Tỷ suất sinh lời trên vốn CSH (ROE)', value: roeVal, benchmark: '≥ 12%', status: roeStatus, desc: 'LNST / Vốn CSH bình quân' },
      ],
    },
  ];

  // Tính tỷ lệ tăng trưởng thực tế so với kỳ trước / đầu kỳ
  const calcGrowthRate = (curr, prev) => {
    if (!prev || prev <= 0 || !curr || curr <= 0) return '0.0%';
    const pct = ((curr - prev) / prev) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  const totalAssetsGrowth = calcGrowthRate(finalTotalAssets, openingTotalAssets);
  const netRevenueGrowth = calcGrowthRate(netRevenue, prevNetRevenue);
  const netProfitGrowth = calcGrowthRate(netProfit, prevNetProfit);

  return {
    period,
    periodLabel: periodTitle,
    isBalanced: finalTotalAssets === finalTotalResources,
    balanceDifference: Math.abs(finalTotalAssets - finalTotalResources),
    summaryCards: {
      totalAssets: finalTotalAssets,
      totalAssetsGrowth,
      netRevenue,
      netRevenueGrowth,
      grossProfit,
      grossMargin: grossMarginVal !== '-' ? grossMarginVal : '0.0%',
      netProfit,
      netMargin: netMarginVal !== '-' ? netMarginVal : '0.0%',
      netProfitGrowth,
    },
    balanceSheet: balanceSheetRows,
    incomeStatement: incomeStatementRows,
    cashFlow: cashFlowRows,
    ratios: ratioCategories,
    loansSummary: {
      totalLimit: totalLoanLimit,
      totalRemaining: calculatedShortTerm + calculatedLongTerm,
      shortTermRemaining: calculatedShortTerm,
      longTermRemaining: calculatedLongTerm,
      monthlyInterest: monthlyLoanInterest,
      totalPaidPrincipal: totalLoanPaidPrincipal,
      shortTermBreakdown: shortTermLoanBreakdown,
      longTermBreakdown: longTermLoanBreakdown,
      loansList: rawLoansList,
    },
    connectedTables: [
      { id: 'cash_and_bank_assets', name: 'Tài sản bằng tiền & Tiền gửi', count: Number(dbData.tableCounts?.cash_cnt) || 0, description: 'Quỹ tiền mặt, tài khoản ngân hàng và các khoản tiền gửi', targets: 'Mã 110, 111, 112, 120, 121 (B01, B03) & Mã 21 (B02-DN)' },
      { id: 'fixed_assets', name: 'Tài sản cố định (Hữu hình & Vô hình)', count: Number(dbData.tableCounts?.fa_cnt) || 0, description: 'Danh mục tài sản cố định, máy móc nhà xưởng và bản quyền phần mềm', targets: 'Mã 220, 221, 222, 223, 227 (B01, B03)' },
      { id: 'goods', name: 'Kho hàng hóa & Vật tư', count: Number(dbData.tableCounts?.goods_cnt) || 0, description: 'Danh mục vật tư, nguyên phụ liệu sản xuất và thành phẩm cửa', targets: 'Mã 140, 141, 149 (B01, B02)' },
      { id: 'warehouse_movements', name: 'Biến động xuất nhập tồn kho', count: Number(dbData.tableCounts?.whm_cnt) || 0, description: 'Phiếu nhập, xuất kho và biến động tồn kho thực tế trong kỳ', targets: 'Mã 140 (B01), Mã 11 Giá vốn (B02)' },
      { id: 'debt_receivables', name: 'Công nợ phải thu khách hàng', count: Number(dbData.tableCounts?.rec_cnt) || 0, description: 'Phải thu khách hàng, chủ đầu tư, tổng thầu các dự án', targets: 'Mã 130, 131 (B01), Mã 01 Thu bán hàng (B03)' },
      { id: 'debt_payables', name: 'Công nợ phải trả nhà cung cấp', count: Number(dbData.tableCounts?.pay_cnt) || 0, description: 'Phải trả các nhà cung ứng vật tư, phụ kiện và dịch vụ', targets: 'Mã 310, 311 (B01), Mã 02 Chi trả NCC (B03)' },
      { id: 'bank_loans', name: 'Nợ vay tín dụng ngân hàng', count: Number(dbData.tableCounts?.loan_cnt) || rawLoansList.length || 0, description: 'Hạn mức tín dụng và các khế ước vay vốn ngân hàng', targets: 'Mã 320, 330, 338 (B01), Mã 22, 23 (B02), Mã 04, 33, 34 (B03)' },
      { id: 'financial_expenses', name: 'Quản lý chi phí 4 nhóm', count: Number(dbData.tableCounts?.exp_cnt) || 0, description: 'Chi phí Sản xuất trực tiếp, Bán hàng, Quản lý DN và Chi phí tài chính', targets: 'Mã 11, 22, 25, 26 (B02-DN)' },
      { id: 'contracts', name: 'Hợp đồng kinh tế & Báo giá', count: (Number(dbData.tableCounts?.contract_cnt) || 0) + (Number(dbData.tableCounts?.quote_cnt) || 0), description: 'Hợp đồng kinh tế đã ký kết và báo giá dự án', targets: 'Mã 01 Doanh thu, Mã 10 Doanh thu thuần (B02)' },
      { id: 'monthly_payrolls', name: 'Bảng lương & Bảo hiểm', count: Number(dbData.tableCounts?.payroll_cnt) || 0, description: 'Lương thực lĩnh, bảo hiểm xã hội và thuế TNCN người lao động', targets: 'Mã 314 (B01), Mã 03 Chi trả NLĐ (B03)' },
      { id: 'accounting_journal_lines', name: 'Sổ nhật ký chung', count: Number(dbData.tableCounts?.journal_cnt) || 0, description: 'Các bút toán định khoản kế toán phát sinh thực tế', targets: 'Đồng bộ biến động trực tiếp toàn bộ B01, B02, B03' },
      { id: 'financial_initial_declarations', name: 'Khai báo số dư ban đầu', count: Number(dbData.tableCounts?.init_cnt) || 0, description: 'Khai báo số dư vốn ban đầu của doanh nghiệp', targets: 'Mã 400, 411, 418, 421a (B01)' },
    ],
  };
}
