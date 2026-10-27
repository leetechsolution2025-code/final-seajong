const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'decodoor.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('--- Đang nâng cấp cấu trúc và dữ liệu bảng Nợ vay ngân hàng ---');

db.serialize(() => {
  // 1. Tạo bảng tạm hoặc tạo mới bank_loans với đầy đủ các trường
  db.run(`DROP TABLE IF EXISTS bank_loan_drawdowns`);
  db.run(`DROP TABLE IF EXISTS bank_loans_backup`);
  db.run(`DROP TABLE IF EXISTS bank_loans_new`);
  
  db.run(`CREATE TABLE IF NOT EXISTS bank_loans_new (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    bank_name TEXT NOT NULL,
    contract_code TEXT,
    facility_type TEXT DEFAULT 'working_capital',
    facility_label TEXT DEFAULT 'Vay vốn lưu động hạn mức',
    term_type TEXT DEFAULT 'short_term',
    loan_limit REAL NOT NULL DEFAULT 0,
    paid_principal REAL NOT NULL DEFAULT 0,
    remaining_principal REAL NOT NULL DEFAULT 0,
    due_within_12m REAL DEFAULT 0,
    interest_rate TEXT NOT NULL DEFAULT '7.5% / năm',
    interest_rate_val REAL DEFAULT 7.5,
    interest_type TEXT DEFAULT 'floating',
    interest_payment_day INTEGER DEFAULT 25,
    monthly_interest_est REAL DEFAULT 0,
    start_date TEXT,
    maturity_date TEXT,
    collateral_asset_id TEXT,
    collateral_name TEXT,
    collateral_value REAL DEFAULT 0,
    bank_account_id TEXT,
    bank_account_number TEXT,
    status TEXT DEFAULT 'active',
    status_label TEXT DEFAULT 'Dư nợ trong hạn',
    loan_type TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Bảng Khế ước nhận nợ / Rút vốn chi tiết
  db.run(`CREATE TABLE IF NOT EXISTS bank_loan_drawdowns (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL,
    drawdown_code TEXT NOT NULL,
    drawdown_date TEXT NOT NULL,
    maturity_date TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    paid_principal REAL NOT NULL DEFAULT 0,
    remaining_principal REAL NOT NULL DEFAULT 0,
    interest_rate REAL DEFAULT 7.5,
    purpose TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(loan_id) REFERENCES bank_loans_new(id) ON DELETE CASCADE
  )`);

  // Dữ liệu mẫu chuẩn nghiệp vụ ngân hàng & BCTC TT200
  const sampleLoans = [
    {
      id: 'LN-001',
      code: 'VAY-VCB-01',
      bank_name: 'Ngân hàng TMCP Ngoại thương Việt Nam Vietcombank',
      contract_code: 'HDTD-2025-VCB-09',
      facility_type: 'term_loan',
      facility_label: 'Vay trung dài hạn đầu tư TSCĐ',
      term_type: 'long_term',
      loan_limit: 10000000000,
      paid_principal: 4000000000,
      remaining_principal: 6000000000,
      due_within_12m: 2000000000, // 2 tỷ đến hạn trả trong 12 tháng -> Mã 320 B01
      interest_rate: '7.8% / năm',
      interest_rate_val: 7.8,
      interest_type: 'floating',
      interest_payment_day: 25,
      monthly_interest_est: 39000000, // 6 tỷ * 7.8% / 12
      start_date: '10/01/2025',
      maturity_date: '10/01/2028',
      collateral_asset_id: 'TS-006',
      collateral_name: 'Dây chuyền sơn tĩnh điện hồng ngoại (TS-006) & Nhà xưởng số 1 KCN Điện Nam',
      collateral_value: 14500000000,
      bank_account_id: 'cba-2',
      bank_account_number: '0011004567899',
      status: 'active',
      status_label: 'Dư nợ trong hạn',
      loan_type: 'Vay trung dài hạn đầu tư dây chuyền máy móc CNC và hệ thống sơn',
      notes: 'Thế chấp bằng máy móc hình thành từ vốn vay và Quyền thuê đất nhà xưởng'
    },
    {
      id: 'LN-002',
      code: 'VAY-BIDV-02',
      bank_name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam BIDV',
      contract_code: 'HDTD-2026-BIDV-14',
      facility_type: 'working_capital',
      facility_label: 'Vay vốn lưu động hạn mức',
      term_type: 'short_term',
      loan_limit: 5000000000,
      paid_principal: 2500000000,
      remaining_principal: 2500000000,
      due_within_12m: 2500000000, // Toàn bộ 2.5 tỷ thuộc ngắn hạn -> Mã 320 B01
      interest_rate: '6.5% / năm',
      interest_rate_val: 6.5,
      interest_type: 'floating',
      interest_payment_day: 25,
      monthly_interest_est: 13541667, // 2.5 tỷ * 6.5% / 12
      start_date: '15/03/2026',
      maturity_date: '15/12/2026',
      collateral_asset_id: 'TS-007',
      collateral_name: 'Máy dán cạnh vát tự động Felder (TS-007) & Quyền đòi nợ hợp đồng dự án',
      collateral_value: 7200000000,
      bank_account_id: 'cba-3',
      bank_account_number: '2151000889988',
      status: 'due_soon',
      status_label: 'Đáo hạn kỳ tới',
      loan_type: 'Vay vốn lưu động tài trợ sản xuất cửa gỗ dự án Xuân Mai Complex',
      notes: 'Giải ngân từng đợt theo Khế ước nhận nợ (KUNN) thời hạn tối đa 6 tháng'
    },
    {
      id: 'LN-003',
      code: 'VAY-MB-03',
      bank_name: 'Ngân hàng TMCP Quân đội MBBank',
      contract_code: 'HDTD-2024-MB-05',
      facility_type: 'term_loan',
      facility_label: 'Vay trung dài hạn đầu tư TSCĐ',
      term_type: 'long_term',
      loan_limit: 3000000000,
      paid_principal: 3000000000,
      remaining_principal: 0,
      due_within_12m: 0,
      interest_rate: '8.0% / năm',
      interest_rate_val: 8.0,
      interest_type: 'fixed',
      interest_payment_day: 15,
      monthly_interest_est: 0,
      start_date: '05/06/2024',
      maturity_date: '05/06/2026',
      collateral_asset_id: 'TS-004',
      collateral_name: 'Xe tải Isuzu Forward 5 tấn chuyên dụng (TS-004)',
      collateral_value: 890000000,
      bank_account_id: 'cba-2',
      bank_account_number: '0011004567899',
      status: 'closed',
      status_label: 'Đã tất toán',
      loan_type: 'Vay mua xe tải vận chuyển chuyên dụng',
      notes: 'Đã hoàn thành nghĩa vụ trả gốc, lãi và đã giải chấp nhận lại hồ sơ gốc xe'
    },
    {
      id: 'LN-004',
      code: 'VAY-CTG-04',
      bank_name: 'Ngân hàng TMCP Công thương Việt Nam VietinBank',
      contract_code: 'HDTD-2026-CTG-08',
      facility_type: 'guarantee',
      facility_label: 'Hạn mức bảo lãnh hợp đồng',
      term_type: 'short_term',
      loan_limit: 4000000000,
      paid_principal: 0,
      remaining_principal: 1500000000,
      due_within_12m: 1500000000,
      interest_rate: 'Phí 1.5% / năm',
      interest_rate_val: 1.5,
      interest_type: 'fixed',
      interest_payment_day: 30,
      monthly_interest_est: 1875000,
      start_date: '01/02/2026',
      maturity_date: '01/02/2027',
      collateral_asset_id: 'cba-4',
      collateral_name: 'Sổ tiền gửi tiết kiệm có kỳ hạn 6 tháng tại VCB (cba-4 - 2.0 tỷ)',
      collateral_value: 2000000000,
      bank_account_id: 'cba-2',
      bank_account_number: '0011004567899',
      status: 'active',
      status_label: 'Đang hiệu lực',
      loan_type: 'Hạn mức bảo lãnh dự thầu và bảo lãnh thực hiện hợp đồng thi công nội thất',
      notes: 'Phát hành bảo lãnh thực hiện hợp đồng dự án Khách sạn Novotel Hạ Long'
    }
  ];

  const stmt = db.prepare(`INSERT INTO bank_loans_new VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  sampleLoans.forEach(l => {
    stmt.run([
      l.id, l.code, l.bank_name, l.contract_code, l.facility_type, l.facility_label,
      l.term_type, l.loan_limit, l.paid_principal, l.remaining_principal, l.due_within_12m,
      l.interest_rate, l.interest_rate_val, l.interest_type, l.interest_payment_day,
      l.monthly_interest_est, l.start_date, l.maturity_date, l.collateral_asset_id,
      l.collateral_name, l.collateral_value, l.bank_account_id, l.bank_account_number,
      l.status, l.status_label, l.loan_type, l.notes, '2026-01-10 08:00:00', '2026-10-14 21:00:00'
    ]);
  });
  stmt.finalize();

  // Thêm các khế ước nhận nợ mẫu (KUNN)
  const sampleDrawdowns = [
    {
      id: 'KUNN-01',
      loan_id: 'LN-001',
      drawdown_code: 'KUNN-2025/VCB-01',
      drawdown_date: '15/01/2025',
      maturity_date: '10/01/2028',
      amount: 6000000000,
      paid_principal: 2000000000,
      remaining_principal: 4000000000,
      interest_rate: 7.8,
      purpose: 'Thanh toán đợt 1 hợp đồng nhập khẩu dây chuyền sơn tĩnh điện sấy hồng ngoại',
      status: 'active'
    },
    {
      id: 'KUNN-02',
      loan_id: 'LN-001',
      drawdown_code: 'KUNN-2025/VCB-02',
      drawdown_date: '20/03/2025',
      maturity_date: '10/01/2028',
      amount: 4000000000,
      paid_principal: 2000000000,
      remaining_principal: 2000000000,
      interest_rate: 7.8,
      purpose: 'Thanh toán đợt 2 lắp đặt chuyển giao công nghệ và nghiệm thu chạy thử xưởng 1',
      status: 'active'
    },
    {
      id: 'KUNN-03',
      loan_id: 'LN-002',
      drawdown_code: 'KUNN-2026/BIDV-01',
      drawdown_date: '15/03/2026',
      maturity_date: '15/09/2026',
      amount: 2500000000,
      paid_principal: 2500000000,
      remaining_principal: 0,
      interest_rate: 6.5,
      purpose: 'Mua gỗ công nghiệp MDF chống ẩm An Cường đợt 1 phục vụ dự án Xuân Mai',
      status: 'closed'
    },
    {
      id: 'KUNN-04',
      loan_id: 'LN-002',
      drawdown_code: 'KUNN-2026/BIDV-02',
      drawdown_date: '15/06/2026',
      maturity_date: '15/12/2026',
      amount: 2500000000,
      paid_principal: 0,
      remaining_principal: 2500000000,
      interest_rate: 6.5,
      purpose: 'Mua phụ kiện khóa Hafele và kính cường lực chống cháy hoàn thiện dự án Xuân Mai',
      status: 'active'
    }
  ];

  const stmtDd = db.prepare(`INSERT INTO bank_loan_drawdowns (
    id, loan_id, drawdown_code, drawdown_date, maturity_date,
    amount, paid_principal, remaining_principal, interest_rate,
    purpose, status
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  sampleDrawdowns.forEach(d => {
    stmtDd.run([
      d.id, d.loan_id, d.drawdown_code, d.drawdown_date, d.maturity_date,
      d.amount, d.paid_principal, d.remaining_principal, d.interest_rate,
      d.purpose, d.status
    ]);
  });
  stmtDd.finalize();

  // Hoán đổi bảng: xoá bảng cũ, đổi tên bảng mới thành bank_loans
  db.run(`DROP TABLE IF EXISTS bank_loans`);
  db.run(`ALTER TABLE bank_loans_new RENAME TO bank_loans`);

  console.log('✓ Đã cập nhật thành công cấu trúc bảng bank_loans và tạo bảng bank_loan_drawdowns!');
});

db.close();
