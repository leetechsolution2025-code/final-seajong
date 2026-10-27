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

const CHART_OF_ACCOUNTS = [
  { code: '1111', name: 'Tiền Việt Nam (Tiền mặt quỹ)', level: 2, parent_code: '111', nature: 'DEBIT' },
  { code: '1121', name: 'Tiền gửi ngân hàng (VND - Vietcombank)', level: 2, parent_code: '112', nature: 'DEBIT' },
  { code: '131', name: 'Phải thu của khách hàng', level: 1, parent_code: null, nature: 'BOTH' },
  { code: '1331', name: 'Thuế GTGT đầu vào được khấu trừ', level: 2, parent_code: '133', nature: 'DEBIT' },
  { code: '141', name: 'Tạm ứng nhân viên', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '1521', name: 'Nguyên liệu, vật liệu chính (Gỗ sấy, phôi)', level: 2, parent_code: '152', nature: 'DEBIT' },
  { code: '1522', name: 'Vật liệu phụ, phụ kiện khoá và bản lề', level: 2, parent_code: '152', nature: 'DEBIT' },
  { code: '154', name: 'Chi phí sản xuất kinh doanh dở dang', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '155', name: 'Thành phẩm cửa gỗ xây dựng', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '211', name: 'Tài sản cố định hữu hình (Máy móc CNC)', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '2141', name: 'Hao mòn tài sản cố định hữu hình', level: 2, parent_code: '214', nature: 'CREDIT' },
  { code: '331', name: 'Phải trả cho người bán (Nhà cung cấp)', level: 1, parent_code: null, nature: 'BOTH' },
  { code: '3331', name: 'Thuế GTGT đầu ra phải nộp', level: 2, parent_code: '333', nature: 'CREDIT' },
  { code: '334', name: 'Phải trả người lao động (Tiền lương)', level: 1, parent_code: null, nature: 'CREDIT' },
  { code: '338', name: 'Phải trả, phải nộp khác', level: 1, parent_code: null, nature: 'CREDIT' },
  { code: '5112', name: 'Doanh thu bán thành phẩm cửa', level: 2, parent_code: '511', nature: 'CREDIT' },
  { code: '621', name: 'Chi phí nguyên liệu, vật liệu trực tiếp', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '622', name: 'Chi phí nhân công trực tiếp xưởng', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '627', name: 'Chi phí sản xuất chung', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '632', name: 'Giá vốn hàng bán', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '641', name: 'Chi phí bán hàng và vận chuyển', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '642', name: 'Chi phí quản lý doanh nghiệp', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '811', name: 'Chi phí khác', level: 1, parent_code: null, nature: 'DEBIT' },
  { code: '911', name: 'Xác định kết quả kinh doanh', level: 1, parent_code: null, nature: 'BOTH' },
];

const INITIAL_ENTRIES = [
  {
    id: 'JE-2026-001',
    entryNumber: 'PKT-2026-0041',
    entryDate: '2026-10-11',
    documentDate: '2026-10-11',
    referenceCode: 'PNK-2026-088',
    sourceModule: 'PROCUREMENT',
    sourceLabel: 'Mua hàng',
    description: 'Nhập kho 120m3 phôi gỗ Lim Nam Phi xẻ sấy từ Công ty CP Gỗ An Cường',
    totalAmount: 203500000,
    status: 'posted',
    statusLabel: 'Đã ghi sổ',
    createdBy: 'Nguyễn Văn Kế Toán',
    lines: [
      {
        id: 'L1',
        accountId: '1521',
        accountCode: '1521',
        accountName: 'Nguyên liệu chính (Gỗ sấy)',
        type: 'DEBIT',
        amount: 185000000,
        description: 'Giá mua chưa thuế 120m3 phôi gỗ Lim',
        partner: 'Công ty cổ phần gỗ An Cường',
      },
      {
        id: 'L2',
        accountId: '1331',
        accountCode: '1331',
        accountName: 'Thuế GTGT đầu vào được khấu trừ',
        type: 'DEBIT',
        amount: 18500000,
        description: 'Thuế GTGT 10% theo HĐ-002918',
        partner: 'Công ty cổ phần gỗ An Cường',
      },
      {
        id: 'L3',
        accountId: '331',
        accountCode: '331',
        accountName: 'Phải trả cho người bán',
        type: 'CREDIT',
        amount: 203500000,
        description: 'Tổng tiền phải trả nhà cung cấp An Cường',
        partner: 'Công ty cổ phần gỗ An Cường',
      },
    ],
  },
  {
    id: 'JE-2026-002',
    entryNumber: 'PKT-2026-0040',
    entryDate: '2026-10-10',
    documentDate: '2026-10-10',
    referenceCode: 'PXK-2026-092',
    sourceModule: 'SALES',
    sourceLabel: 'Bán hàng',
    description: 'Xuất bán 850 bộ cửa chống cháy EI90 bàn giao dự án Vinhomes Ocean Park 3',
    totalAmount: 528000000,
    status: 'posted',
    statusLabel: 'Đã ghi sổ',
    createdBy: 'Trần Thị Thu Thảo',
    lines: [
      {
        id: 'L4',
        accountId: '131',
        accountCode: '131',
        accountName: 'Phải thu của khách hàng',
        type: 'DEBIT',
        amount: 528000000,
        description: 'Tổng giá trị nghiệm thu đợt 2 dự án Ocean Park 3',
        partner: 'Tập đoàn Vingroup (Vinhomes)',
      },
      {
        id: 'L5',
        accountId: '5112',
        accountCode: '5112',
        accountName: 'Doanh thu bán thành phẩm cửa',
        type: 'CREDIT',
        amount: 480000000,
        description: 'Doanh thu xuất xưởng 850 bộ cửa EI90',
        partner: 'Tập đoàn Vingroup (Vinhomes)',
      },
      {
        id: 'L6',
        accountId: '3331',
        accountCode: '3331',
        accountName: 'Thuế GTGT đầu ra phải nộp',
        type: 'CREDIT',
        amount: 48000000,
        description: 'Thuế GTGT 10% HĐ điện tử 008129',
        partner: 'Cục Thuế Vĩnh Phúc',
      },
    ],
  },
  {
    id: 'JE-2026-003',
    entryNumber: 'UNC-2026-0112',
    entryDate: '2026-10-09',
    documentDate: '2026-10-09',
    referenceCode: 'UNC-VCB-8819',
    sourceModule: 'CASH',
    sourceLabel: 'Quỹ và Ngân hàng',
    description: 'Chuyển khoản Vietcombank thanh toán tiền mua khoá từ và bản lề cho Công ty KinLong',
    totalAmount: 145000000,
    status: 'posted',
    statusLabel: 'Đã ghi sổ',
    createdBy: 'Nguyễn Văn Kế Toán',
    lines: [
      {
        id: 'L7',
        accountId: '331',
        accountCode: '331',
        accountName: 'Phải trả cho người bán',
        type: 'DEBIT',
        amount: 145000000,
        description: 'Thanh toán công nợ lô phụ kiện KinLong đợt tháng 9/2026',
        partner: 'Công ty Phụ kiện Ngũ kim KinLong',
      },
      {
        id: 'L8',
        accountId: '1121',
        accountCode: '1121',
        accountName: 'Tiền gửi ngân hàng (VCB)',
        type: 'CREDIT',
        amount: 145000000,
        description: 'Ủy nhiệm chi số 8819 VCB chi nhánh Hà Nội',
        partner: 'Ngân hàng TMCP Ngoại Thương VN (VCB)',
      },
    ],
  },
  {
    id: 'JE-2026-004',
    entryNumber: 'PC-2026-0255',
    entryDate: '2026-10-08',
    documentDate: '2026-10-08',
    referenceCode: 'GNTU-2026-019',
    sourceModule: 'ADVANCE',
    sourceLabel: 'Tạm ứng',
    description: 'Chi tiền mặt tạm ứng công tác phí cho Trưởng phòng DA Nguyễn Hữu Nam khảo sát Ecopark',
    totalAmount: 15000000,
    status: 'posted',
    statusLabel: 'Đã ghi sổ',
    createdBy: 'Trần Thị Thu Thảo',
    lines: [
      {
        id: 'L9',
        accountId: '141',
        accountCode: '141',
        accountName: 'Tạm ứng nhân viên',
        type: 'DEBIT',
        amount: 15000000,
        description: 'Tạm ứng đi lại, tiếp khách dự án Ecopark Hưng Yên',
        partner: 'Anh Nguyễn Hữu Nam - Trưởng phòng DA',
      },
      {
        id: 'L10',
        accountId: '1111',
        accountCode: '1111',
        accountName: 'Tiền mặt quỹ',
        type: 'CREDIT',
        amount: 15000000,
        description: 'Phiếu chi số 0255 thủ quỹ chi tiền mặt',
        partner: 'Thủ quỹ Deco Door',
      },
    ],
  },
  {
    id: 'JE-2026-005',
    entryNumber: 'PKT-2026-0038',
    entryDate: '2026-10-07',
    documentDate: '2026-10-07',
    referenceCode: 'PXK-2026-089',
    sourceModule: 'LOGISTICS',
    sourceLabel: 'Kho vận',
    description: 'Cấp phát 500 bộ phụ kiện bản lề sàn và khoá inox từ kho sang Xưởng sản xuất số 1',
    totalAmount: 88500000,
    status: 'posted',
    statusLabel: 'Đã ghi sổ',
    createdBy: 'Nguyễn Văn Kế Toán',
    lines: [
      {
        id: 'L11',
        accountId: '621',
        accountCode: '621',
        accountName: 'Chi phí nguyên vật liệu trực tiếp',
        type: 'DEBIT',
        amount: 88500000,
        description: 'Chi phí phụ kiện lắp đặt vào dây chuyền sản xuất',
        partner: 'Xưởng sản xuất số 1 - Deco Door',
      },
      {
        id: 'L12',
        accountId: '1522',
        accountCode: '1522',
        accountName: 'Vật liệu phụ, phụ kiện khoá bản lề',
        type: 'CREDIT',
        amount: 88500000,
        description: 'Xuất kho phụ kiện kho vật tư',
        partner: 'Kho phụ kiện Deco Door',
      },
    ],
  },
  {
    id: 'JE-2026-006',
    entryNumber: 'PKT-2026-0036',
    entryDate: '2026-10-06',
    documentDate: '2026-10-06',
    referenceCode: 'BK-KH-1026',
    sourceModule: 'MANUAL',
    sourceLabel: 'Thủ công',
    description: 'Trích khấu hao hệ thống máy ép nhiệt chân không và máy cắt CNC xưởng tháng 10/2026',
    totalAmount: 36800000,
    status: 'posted',
    statusLabel: 'Đã ghi sổ',
    createdBy: 'Nguyễn Văn Kế Toán',
    lines: [
      {
        id: 'L13',
        accountId: '627',
        accountCode: '627',
        accountName: 'Chi phí sản xuất chung',
        type: 'DEBIT',
        amount: 36800000,
        description: 'Khấu hao TSCĐ trực tiếp phục vụ sản xuất',
        partner: 'Khối sản xuất xưởng 2',
      },
      {
        id: 'L14',
        accountId: '2141',
        accountCode: '2141',
        accountName: 'Hao mòn tài sản cố định hữu hình',
        type: 'CREDIT',
        amount: 36800000,
        description: 'Trích hao mòn luỹ kế máy ép nhiệt và CNC',
        partner: 'Ban Quản trị tài sản',
      },
    ],
  },
  {
    id: 'JE-2026-007',
    entryNumber: 'PKT-2026-0035',
    entryDate: '2026-10-05',
    documentDate: '2026-10-05',
    referenceCode: 'QTTU-2026-014',
    sourceModule: 'ADVANCE',
    sourceLabel: 'Tạm ứng',
    description: 'Quyết toán hoàn tạm ứng chi phí tiếp khách và kiểm định chống cháy dự án Ciputra',
    totalAmount: 12600000,
    status: 'posted',
    statusLabel: 'Đã ghi sổ',
    createdBy: 'Trần Thị Thu Thảo',
    lines: [
      {
        id: 'L15',
        accountId: '642',
        accountCode: '642',
        accountName: 'Chi phí quản lý doanh nghiệp',
        type: 'DEBIT',
        amount: 12600000,
        description: 'Chi phí kiểm định mẫu cửa chống cháy Viện IBST',
        partner: 'Viện Khoa học Công nghệ Xây dựng (IBST)',
      },
      {
        id: 'L16',
        accountId: '141',
        accountCode: '141',
        accountName: 'Tạm ứng nhân viên',
        type: 'CREDIT',
        amount: 12600000,
        description: 'Quyết toán trừ số dư tạm ứng đợt trước',
        partner: 'Anh Trần Quốc Tuấn - Trưởng ban Kỹ thuật',
      },
    ],
  },
];

db.serialize(() => {
  console.log('--- Đang tạo các bảng kế toán ---');

  // 1. Bảng hệ thống tài khoản kế toán
  db.run(`
    CREATE TABLE IF NOT EXISTS accounting_chart_of_accounts (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      parent_code TEXT,
      nature TEXT DEFAULT 'DEBIT',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 2. Bảng chứng từ sổ nhật ký chung
  db.run(`
    CREATE TABLE IF NOT EXISTS accounting_journal_entries (
      id TEXT PRIMARY KEY,
      entry_number TEXT UNIQUE NOT NULL,
      entry_date TEXT NOT NULL,
      document_date TEXT,
      reference_code TEXT,
      source_module TEXT NOT NULL DEFAULT 'MANUAL',
      source_label TEXT,
      description TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'posted',
      status_label TEXT NOT NULL DEFAULT 'Đã ghi sổ',
      created_by TEXT,
      posted_by TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 3. Bảng các dòng định khoản chi tiết Nợ / Có
  db.run(`
    CREATE TABLE IF NOT EXISTS accounting_journal_lines (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      line_number INTEGER NOT NULL DEFAULT 1,
      account_id TEXT NOT NULL,
      account_code TEXT NOT NULL,
      account_name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'DEBIT' hoặc 'CREDIT'
      amount REAL NOT NULL DEFAULT 0,
      description TEXT,
      partner TEXT,
      partner_type TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(entry_id) REFERENCES accounting_journal_entries(id) ON DELETE CASCADE
    )
  `);

  // 4. Bảng số dư đầu kỳ
  db.run(`
    CREATE TABLE IF NOT EXISTS accounting_opening_balances (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL, -- '2026-10'
      account_code TEXT NOT NULL,
      opening_debit REAL DEFAULT 0,
      opening_credit REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(period, account_code)
    )
  `);

  // Seed danh mục tài khoản
  db.get('SELECT COUNT(*) as count FROM accounting_chart_of_accounts', (err, row) => {
    if (!err && row && row.count === 0) {
      console.log('Đang nạp danh mục 24 tài khoản kế toán chuẩn...');
      const stmt = db.prepare(`
        INSERT INTO accounting_chart_of_accounts (code, name, level, parent_code, nature, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `);
      for (const acc of CHART_OF_ACCOUNTS) {
        stmt.run(acc.code, acc.name, acc.level, acc.parent_code, acc.nature);
      }
      stmt.finalize();
      console.log('Đã nạp xong danh mục tài khoản kế toán.');
    }
  });

  // Seed các bút toán mẫu nếu bảng rỗng
  db.get('SELECT COUNT(*) as count FROM accounting_journal_entries', (err, row) => {
    if (!err && row && row.count === 0) {
      console.log('Đang nạp 7 bút toán Sổ nhật ký chung mẫu...');
      const insertEntryStmt = db.prepare(`
        INSERT INTO accounting_journal_entries (
          id, entry_number, entry_date, document_date, reference_code,
          source_module, source_label, description, total_amount, status,
          status_label, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertLineStmt = db.prepare(`
        INSERT INTO accounting_journal_lines (
          id, entry_id, line_number, account_id, account_code,
          account_name, type, amount, description, partner
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const entry of INITIAL_ENTRIES) {
        insertEntryStmt.run(
          entry.id,
          entry.entryNumber,
          entry.entryDate,
          entry.documentDate,
          entry.referenceCode || null,
          entry.sourceModule,
          entry.sourceLabel,
          entry.description,
          entry.totalAmount,
          entry.status,
          entry.statusLabel,
          entry.createdBy || 'Hệ thống'
        );

        let lineIdx = 1;
        for (const line of entry.lines) {
          insertLineStmt.run(
            line.id,
            entry.id,
            lineIdx++,
            line.accountId,
            line.accountCode,
            line.accountName,
            line.type,
            line.amount,
            line.description || entry.description,
            line.partner || null
          );
        }
      }

      insertEntryStmt.finalize();
      insertLineStmt.finalize();
      console.log('Đã nạp thành công 7 bút toán và chi tiết định khoản!');
    }
  });

  console.log('Khởi tạo cấu trúc bảng kế toán hoàn tất.');
});

setTimeout(() => {
  db.close((err) => {
    if (err) console.error('Lỗi đóng database:', err);
    else console.log('Đã hoàn tất script.');
  });
}, 2000);
