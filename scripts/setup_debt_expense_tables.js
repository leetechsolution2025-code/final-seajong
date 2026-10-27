import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'decodoor.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Lỗi kết nối cơ sở dữ liệu SQLite:', err);
    process.exit(1);
  }
  console.log('Đã kết nối cơ sở dữ liệu SQLite:', dbPath);
});

const INITIAL_LOANS = [
  {
    id: 'LN-001',
    code: 'VAY-VCB-01',
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam Vietcombank',
    contractCode: 'HDTD-2025-VCB-09',
    loanLimit: 10000000000,
    paidPrincipal: 4000000000,
    remainingPrincipal: 6000000000,
    interestRate: '7.8% / năm',
    startDate: '10/01/2025',
    maturityDate: '10/01/2028',
    status: 'active',
    statusLabel: 'Dư nợ trong hạn',
    loanType: 'Vay trung dài hạn đầu tư dây chuyền máy móc CNC',
    notes: 'Tài sản đảm bảo bằng nhà xưởng số 1 KCN Điện Nam Điện Ngọc',
  },
  {
    id: 'LN-002',
    code: 'VAY-BIDV-02',
    bankName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam BIDV',
    contractCode: 'HDTD-2026-BIDV-14',
    loanLimit: 5000000000,
    paidPrincipal: 2500000000,
    remainingPrincipal: 2500000000,
    interestRate: '6.5% / năm',
    startDate: '15/03/2026',
    maturityDate: '15/12/2026',
    status: 'due_soon',
    statusLabel: 'Đáo hạn kỳ tới',
    loanType: 'Vay vốn lưu động phục vụ dự án Xuân Mai',
    notes: 'Thanh toán lãi định kỳ vào ngày 25 hàng tháng',
  },
  {
    id: 'LN-003',
    code: 'VAY-MB-03',
    bankName: 'Ngân hàng TMCP Quân đội MBBank',
    contractCode: 'HDTD-2024-MB-05',
    loanLimit: 3000000000,
    paidPrincipal: 3000000000,
    remainingPrincipal: 0,
    interestRate: '8.0% / năm',
    startDate: '05/06/2024',
    maturityDate: '05/06/2026',
    status: 'closed',
    statusLabel: 'Đã tất toán',
    loanType: 'Vay mua xe tải vận chuyển chuyên dụng',
    notes: 'Đã giải chấp tài sản và nhận lại đăng ký xe gốc',
  },
];

const INITIAL_EXPENSES = [
  {
    id: 'CP-T1-01',
    code: 'PC-2026-015',
    title: 'Lương và thưởng Tết Nguyên đán cán bộ công nhân viên',
    category: 'administrative',
    categoryLabel: 'Chi phí quản lý',
    amount: 785000000,
    department: 'Phòng hành chính nhân sự',
    spendDate: '20/01/2026',
    spender: 'Hoàng Kim Oanh',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Chi trả qua tài khoản ngân hàng Vietcombank',
  },
  {
    id: 'CP-T1-02',
    code: 'PC-2026-022',
    title: 'Mua quà Tết tri ân đối tác và khách hàng thân thiết',
    category: 'sales',
    categoryLabel: 'Chi phí bán hàng',
    amount: 65000000,
    department: 'Phòng kinh doanh',
    spendDate: '22/01/2026',
    spender: 'Trần Thị Bích',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Kèm danh sách khách hàng và biên bản bàn giao quà',
  },
  {
    id: 'CP-T2-01',
    code: 'PC-2026-038',
    title: 'Chi phí tiệc khai xuân đầu năm và mừng tuổi cán bộ công nhân viên',
    category: 'administrative',
    categoryLabel: 'Chi phí quản lý',
    amount: 42000000,
    department: 'Phòng hành chính nhân sự',
    spendDate: '15/02/2026',
    spender: 'Hoàng Kim Oanh',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Quyết định số 12 của Tổng Giám đốc',
  },
  {
    id: 'CP-T2-02',
    code: 'PC-2026-045',
    title: 'Nhập gỗ Beech sấy nhập khẩu phục vụ đơn hàng đầu năm',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 230000000,
    department: 'Bộ phận sản xuất',
    spendDate: '26/02/2026',
    spender: 'Trần Hải Quang',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Đã nhập kho mộc số 2 kèm chứng từ hải quan',
  },
  {
    id: 'CP-T3-01',
    code: 'PC-2026-068',
    title: 'Mua keo ép nhiệt công nghiệp và giấy nhám thùng xưởng mộc',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 58000000,
    department: 'Bộ phận sản xuất',
    spendDate: '12/03/2026',
    spender: 'Nguyễn Văn Cương',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Hóa đơn điện tử VAT số 004128',
  },
  {
    id: 'CP-T3-02',
    code: 'PC-2026-074',
    title: 'Bảo dưỡng định kỳ dàn máy cắt tự động CNC trung tâm',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 25000000,
    department: 'Bộ phận sản xuất',
    spendDate: '25/03/2026',
    spender: 'Trần Hải Quang',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Biên bản nghiệm thu kỹ thuật và thay dầu mỡ chịu nhiệt',
  },
  {
    id: 'CP-T4-01',
    code: 'PC-2026-092',
    title: 'Mua bộ phụ kiện bản lề tay nắm cao cấp dự án Biệt thự Ciputra',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 112000000,
    department: 'Bộ phận sản xuất',
    spendDate: '10/04/2026',
    spender: 'Trần Hải Quang',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Phụ kiện nhập khẩu Hafele chính hãng',
  },
  {
    id: 'CP-T4-02',
    code: 'PC-2026-105',
    title: 'Tiền điện sản xuất quý 1 nhà máy sản xuất cửa gỗ mộc',
    category: 'administrative',
    categoryLabel: 'Chi phí quản lý',
    amount: 135000000,
    department: 'Phòng hành chính nhân sự',
    spendDate: '28/04/2026',
    spender: 'Hoàng Kim Oanh',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Ủy nhiệm chi ngân hàng thanh toán cho EVN Hà Nội',
  },
  {
    id: 'CP-T5-01',
    code: 'PC-2026-118',
    title: 'Nâng cấp và bảo trì hệ thống hút lọc bụi trung tâm nhà xưởng',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 88000000,
    department: 'Bộ phận sản xuất',
    spendDate: '14/05/2026',
    spender: 'Nguyễn Văn Cương',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Thay thế túi lọc bụi vải và động cơ quạt hút ly tâm',
  },
  {
    id: 'CP-T5-02',
    code: 'PC-2026-126',
    title: 'Chi phí công tác nghiệm thu công trình khu nghỉ dưỡng Nha Trang',
    category: 'sales',
    categoryLabel: 'Chi phí bán hàng',
    amount: 34500000,
    department: 'Phòng kinh doanh',
    spendDate: '27/05/2026',
    spender: 'Trần Thị Bích',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Kèm vé máy bay và hoá đơn khách sạn lưu trú',
  },
  {
    id: 'CP-T6-01',
    code: 'PC-2026-140',
    title: 'Thuê gian hàng và thi công triển lãm Vietbuild Hà Nội',
    category: 'sales',
    categoryLabel: 'Chi phí bán hàng',
    amount: 75000000,
    department: 'Phòng kinh doanh',
    spendDate: '08/06/2026',
    spender: 'Trần Thị Bích',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Hợp đồng tài trợ và thi công gian hàng triển lãm số 45',
  },
  {
    id: 'CP-T6-02',
    code: 'PC-2026-152',
    title: 'Mua sơn lót PU và dung môi chất lượng cao Inchem xưởng sơn',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 64000000,
    department: 'Bộ phận sản xuất',
    spendDate: '22/06/2026',
    spender: 'Trần Hải Quang',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Đã kiểm tra chất lượng màng sơn đạt tiêu chuẩn xuất xưởng',
  },
  {
    id: 'CP-T7-01',
    code: 'PC-2026-165',
    title: 'Chi phí đào tạo nâng cao kỹ thuật sơn hoàn thiện cho thợ mộc',
    category: 'administrative',
    categoryLabel: 'Chi phí quản lý',
    amount: 28000000,
    department: 'Phòng hành chính nhân sự',
    spendDate: '15/07/2026',
    spender: 'Hoàng Kim Oanh',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Chuyên gia nước ngoài hướng dẫn thực tế tại xưởng',
  },
  {
    id: 'CP-T7-02',
    code: 'PC-2026-172',
    title: 'Thay thế lưỡi cưa kim cương hợp kim dàn máy xẻ chính',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 19500000,
    department: 'Bộ phận sản xuất',
    spendDate: '29/07/2026',
    spender: 'Nguyễn Văn Cương',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Lưỡi cưa hợp kim nhập khẩu Nhật Bản',
  },
  {
    id: 'CP-T8-01',
    code: 'PC-2026-180',
    title: 'Nhập phụ kiện nẹp chỉ nhôm đồng trang trí cánh cửa',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 95000000,
    department: 'Bộ phận sản xuất',
    spendDate: '11/08/2026',
    spender: 'Trần Hải Quang',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Đơn hàng cung ứng cho dự án Vinhomes Smart City',
  },
  {
    id: 'CP-T8-02',
    code: 'PC-2026-188',
    title: 'Cước vận chuyển và giao nhận lắp đặt dự án EcoPark',
    category: 'sales',
    categoryLabel: 'Chi phí bán hàng',
    amount: 48000000,
    department: 'Phòng kinh doanh',
    spendDate: '24/08/2026',
    spender: 'Trần Thị Bích',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Đội xe tải chuyên dụng giao hàng an toàn đúng tiến độ',
  },
  {
    id: 'CP-004',
    code: 'PC-2026-189',
    title: 'Tiền điện sinh hoạt và sản xuất tháng 9 nhà máy mộc',
    category: 'administrative',
    categoryLabel: 'Chi phí quản lý',
    amount: 142000000,
    department: 'Phòng hành chính nhân sự',
    spendDate: '28/09/2026',
    spender: 'Hoàng Kim Oanh',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Thanh toán trực tiếp qua cổng EVN điện tử',
  },
  {
    id: 'CP-T9-02',
    code: 'PC-2026-194',
    title: 'Mua keo dán chỉ cạnh và nẹp viền nhựa cao cấp ABS',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 52000000,
    department: 'Bộ phận sản xuất',
    spendDate: '18/09/2026',
    spender: 'Nguyễn Văn Cương',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Phục vụ dán cạnh cửa gỗ công nghiệp chống ẩm',
  },
  {
    id: 'CP-002',
    code: 'PC-2026-198',
    title: 'Chi phí bảo dưỡng định kỳ hệ thống máy nén khí trung tâm',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 32000000,
    department: 'Bộ phận sản xuất',
    spendDate: '01/10/2026',
    spender: 'Nguyễn Văn Cương',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Thay dầu và lọc gió định kỳ 6 tháng',
  },
  {
    id: 'CP-001',
    code: 'PC-2026-204',
    title: 'Chi phí mua keo sữa gắn gỗ và dung môi pha sơn xưởng mộc',
    category: 'production',
    categoryLabel: 'Chi phí sản xuất',
    amount: 86500000,
    department: 'Bộ phận sản xuất',
    spendDate: '02/10/2026',
    spender: 'Trần Hải Quang',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Đã kèm hóa đơn VAT và phiếu nhập kho vật tư',
  },
  {
    id: 'CP-003',
    code: 'PC-2026-215',
    title: 'Chi phí tiếp khách và công tác nghiệm thu công trình Đà Nẵng',
    category: 'sales',
    categoryLabel: 'Chi phí bán hàng',
    amount: 18500000,
    department: 'Phòng kinh doanh',
    spendDate: '03/10/2026',
    spender: 'Trần Thị Bích',
    status: 'pending',
    statusLabel: 'Chờ duyệt chi',
    notes: 'Trình Tổng Giám đốc ký duyệt thanh toán',
  },
  {
    id: 'CP-005',
    code: 'PC-2026-220',
    title: 'Phí dịch vụ chuyển tiền quốc tế và lãi vay thấu chi ngân hàng',
    category: 'finance',
    categoryLabel: 'Chi phí tài chính',
    amount: 14800000,
    department: 'Phòng tài chính',
    spendDate: '04/10/2026',
    spender: 'Phạm Thu Hằng',
    status: 'approved',
    statusLabel: 'Đã chi tiền',
    notes: 'Trích nợ tự động từ tài khoản thanh toán VCB',
  },
];

db.serialize(() => {
  console.log('--- Đang tạo các bảng Nợ vay và Chi phí ---');

  // 1. Bảng Nợ vay ngân hàng và tổ chức tín dụng (bank_loans)
  db.run(`
    CREATE TABLE IF NOT EXISTS bank_loans (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      bank_name TEXT NOT NULL,
      contract_code TEXT,
      loan_limit REAL NOT NULL DEFAULT 0,
      paid_principal REAL NOT NULL DEFAULT 0,
      remaining_principal REAL NOT NULL DEFAULT 0,
      interest_rate TEXT NOT NULL DEFAULT '7.5% / năm',
      start_date TEXT,
      maturity_date TEXT,
      status TEXT DEFAULT 'active',
      status_label TEXT DEFAULT 'Dư nợ trong hạn',
      loan_type TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Bảng Lịch sử trả nợ vay (gốc & lãi)
  db.run(`
    CREATE TABLE IF NOT EXISTS bank_loan_repayments (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      repayment_code TEXT,
      repayment_date TEXT NOT NULL,
      principal_amount REAL NOT NULL DEFAULT 0,
      interest_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'Chuyển khoản VCB',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(loan_id) REFERENCES bank_loans(id) ON DELETE CASCADE
    )
  `);

  // 3. Bảng Quản lý chi phí kinh doanh (financial_expenses)
  db.run(`
    CREATE TABLE IF NOT EXISTS financial_expenses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'production', -- 'production', 'sales', 'administrative', 'finance'
      category_label TEXT NOT NULL DEFAULT 'Chi phí sản xuất',
      amount REAL NOT NULL DEFAULT 0,
      department TEXT NOT NULL DEFAULT 'Khối Sản Xuất',
      spend_date TEXT NOT NULL,
      spender TEXT,
      status TEXT DEFAULT 'approved',
      status_label TEXT DEFAULT 'Đã chi tiền',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed bank_loans nếu bảng rỗng
  db.get('SELECT COUNT(*) as count FROM bank_loans', (err, row) => {
    if (!err && row && row.count === 0) {
      console.log('Đang nạp dữ liệu mẫu cho bảng Nợ vay (bank_loans)...');
      const stmt = db.prepare(`
        INSERT INTO bank_loans (
          id, code, bank_name, contract_code, loan_limit, paid_principal,
          remaining_principal, interest_rate, start_date, maturity_date,
          status, status_label, loan_type, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of INITIAL_LOANS) {
        stmt.run(
          item.id,
          item.code,
          item.bankName,
          item.contractCode,
          item.loanLimit,
          item.paidPrincipal,
          item.remainingPrincipal,
          item.interestRate,
          item.startDate,
          item.maturityDate,
          item.status,
          item.statusLabel,
          item.loanType,
          item.notes
        );
      }
      stmt.finalize();
      console.log('Đã nạp xong bảng Nợ vay.');
    }
  });

  // Seed financial_expenses nếu bảng rỗng
  db.get('SELECT COUNT(*) as count FROM financial_expenses', (err, row) => {
    if (!err && row && row.count === 0) {
      console.log('Đang nạp dữ liệu mẫu cho bảng Chi phí (financial_expenses)...');
      const stmt = db.prepare(`
        INSERT INTO financial_expenses (
          id, code, title, category, category_label, amount, department,
          spend_date, spender, status, status_label, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of INITIAL_EXPENSES) {
        stmt.run(
          item.id,
          item.code,
          item.title,
          item.category,
          item.categoryLabel,
          item.amount,
          item.department,
          item.spendDate,
          item.spender,
          item.status,
          item.statusLabel,
          item.notes
        );
      }
      stmt.finalize();
      console.log('Đã nạp xong bảng Chi phí.');
    }
  });
});

setTimeout(() => {
  db.close((err) => {
    if (err) console.error('Lỗi đóng database:', err);
    else console.log('Đã hoàn tất script khởi tạo Nợ vay và Chi phí.');
  });
}, 2000);
