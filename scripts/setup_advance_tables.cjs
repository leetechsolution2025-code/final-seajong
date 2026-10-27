const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'decodoor.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('[1/2] Tạo bảng advance_payments (Quản lý Tạm ứng)...');
  db.run(`
    CREATE TABLE IF NOT EXISTS advance_payments (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      employee_name TEXT NOT NULL,
      employee_code TEXT,
      department TEXT,
      purpose TEXT NOT NULL,
      project TEXT,
      amount REAL NOT NULL DEFAULT 0,
      requested_date TEXT,
      payment_method TEXT DEFAULT 'bank_transfer',
      bank_name TEXT,
      bank_account TEXT,
      bank_account_name TEXT,
      status TEXT DEFAULT 'pending',
      review_status TEXT DEFAULT 'unprocessed',
      approver TEXT,
      approved_date TEXT,
      reject_reason TEXT,
      rejected_date TEXT,
      deadline_refund TEXT,
      note TEXT,
      attached_docs_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('[2/2] Tạo bảng advance_settlements (Quản lý Hoàn tạm ứng & Quyết toán)...');
  db.run(`
    CREATE TABLE IF NOT EXISTS advance_settlements (
      id TEXT PRIMARY KEY,
      advance_id TEXT,
      advance_code TEXT NOT NULL,
      settlement_code TEXT,
      employee_name TEXT NOT NULL,
      employee_code TEXT,
      department TEXT,
      purpose TEXT,
      project TEXT,
      advance_amount REAL NOT NULL DEFAULT 0,
      approved_date TEXT,
      approver TEXT,
      deadline_refund TEXT,
      settlement_date TEXT,
      actual_spent REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'unsettled',
      invoices TEXT DEFAULT '[]',
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Xóa mọi dữ liệu test cũ (nếu có) để đảm bảo sạch dữ liệu theo yêu cầu của người dùng
  db.run(`DELETE FROM advance_payments;`);
  db.run(`DELETE FROM advance_settlements;`);
  console.log('✓ Đã khởi tạo cấu trúc bảng sạch và xoá toàn bộ dữ liệu mô phỏng thành công!');
});

db.close();
