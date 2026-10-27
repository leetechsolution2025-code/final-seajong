import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

console.log('--- KHỞI TẠO BỘ MÁY TÍNH TOÁN VÀ CƠ SỞ DỮ LIỆU TÀI CHÍNH - KẾ TOÁN ---');
console.log('Database Path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Lỗi kết nối cơ sở dữ liệu SQLite:', err);
    process.exit(1);
  }
});

// Chạy file dump SQL
const dumpSqlPath = path.join(__dirname, 'finance_accounting_dump.sql');
if (fs.existsSync(dumpSqlPath)) {
  const dumpSql = fs.readFileSync(dumpSqlPath, 'utf8');
  db.exec(dumpSql, (err) => {
    if (err) {
      console.warn('Lưu ý khi chạy dump SQL (bỏ qua nếu bảng đã tồn tại):', err.message);
    } else {
      console.log('✓ Đã khởi tạo cấu trúc bảng từ dump SQL');
    }
    seedFinanceData();
  });
} else {
  seedFinanceData();
}

function seedFinanceData() {
  db.serialize(() => {
    // 1. Quỹ tiền mặt và tài khoản ngân hàng
    db.run(`
      INSERT OR IGNORE INTO cash_and_bank_assets (id, code, name, type, bank_name, account_number, branch, balance, currency, term_months, interest_rate, start_date, maturity_date, manager_name, status)
      VALUES 
      ('CASH-01', 'TM-VND-01', 'Quỹ tiền mặt chính công ty (VND)', 'cash', NULL, NULL, NULL, 485000000, 'VND', 0, 0, '2026-01-01', NULL, 'Trần Thu Hằng (Thủ quỹ)', 'active'),
      ('BANK-01', 'VCB-01', 'Tài khoản Vietcombank CN Hà Nội', 'bank', 'Vietcombank', '0011004289999', 'Hà Nội', 1850000000, 'VND', 0, 0.2, '2026-01-01', NULL, 'Nguyễn Thị Hương (Kế toán trưởng)', 'active'),
      ('BANK-02', 'BIDV-01', 'Tài khoản BIDV CN Quang Trung', 'bank', 'BIDV', '1241000088899', 'Hà Nội', 920000000, 'VND', 0, 0.2, '2026-01-01', NULL, 'Nguyễn Thị Hương (Kế toán trưởng)', 'active'),
      ('TERM-01', 'TG-MB-01', 'Tiền gửi kỳ hạn 6 tháng - MBBank', 'term_deposit', 'MBBank', '881029381928', 'Hà Nội', 2000000000, 'VND', 6, 5.8, '2026-05-10', '2026-11-10', 'Lê Công Vụ (Giám đốc)', 'active')
    `);

    // 2. Công nợ phải thu khách hàng (debt_receivables)
    db.run(`
      INSERT OR IGNORE INTO debt_receivables (id, code, customer_name, customer_address, project_name, contract_value, paid_amount, remaining_amount, due_date, status, status_label, manager_name)
      VALUES
      ('REC-01', 'CNPT-2026-001', 'Công ty Cổ phần Tập đoàn Vingroup', 'KĐT Vinhomes Riverside, Long Biên, Hà Nội', 'Cung cấp thiết bị phòng tắm Vinhomes Ocean Park 3', 1850000000, 1100000000, 750000000, '2026-11-15', 'ontime', 'Trong hạn thanh toán', 'Lê Vụ (TP Kinh doanh)'),
      ('REC-02', 'CNPT-2026-002', 'Công ty Cổ phần Đầu tư Ecopark', 'KĐT Ecopark, Văn Giang, Hưng Yên', 'Gói hoàn thiện thiết bị vệ sinh cao cấp Eco Central Park', 1250000000, 800000000, 450000000, '2026-10-30', 'due_soon', 'Sắp đến hạn', 'Lê Vụ (TP Kinh doanh)'),
      ('REC-03', 'CNPT-2026-003', 'Công ty TNHH Phát triển Nam Cường', 'KĐT Dương Nội, Hà Đông, Hà Nội', 'Dự án chung cư Anland Lakeview', 950000000, 950000000, 0, '2026-10-05', 'completed', 'Đã tất toán', 'Vũ Hoàng Long'),
      ('REC-04', 'CNPT-2026-004', 'Tập đoàn Sun Group', 'Tòa nhà Sun City, Hoàn Kiếm, Hà Nội', 'Dự án nghỉ dưỡng Sun Beauty Onsen Thanh Hóa', 2400000000, 1200000000, 1200000000, '2026-12-20', 'ontime', 'Trong hạn thanh toán', 'Nguyễn Văn Thành')
    `);

    // 3. Công nợ phải trả nhà cung cấp (debt_payables)
    db.run(`
      INSERT OR IGNORE INTO debt_payables (id, code, supplier_name, supplier_address, po_code, total_amount, paid_amount, remaining_amount, due_date, status, status_label, accountant)
      VALUES
      ('PAY-01', 'CNTR-2026-001', 'Công ty Cổ phần Gỗ An Cường', 'Đường ĐT 743, TX Tân Uyên, Bình Dương', 'PO-2026-088', 850000000, 500000000, 350000000, '2026-11-10', 'pending', 'Chờ thanh toán', 'Phạm Thu Hằng'),
      ('PAY-02', 'CNTR-2026-002', 'Công ty Phụ kiện Ngũ kim KinLong Việt Nam', 'KCN Đại Đồng, Tiên Du, Bắc Ninh', 'PO-2026-092', 420000000, 200000000, 220000000, '2026-11-05', 'pending', 'Chờ thanh toán', 'Phạm Thu Hằng'),
      ('PAY-03', 'CNTR-2026-003', 'Công ty TNHH Nhôm Xingfa Quảng Đông', 'KCN Nhơn Trạch, Đồng Nai', 'PO-2026-095', 680000000, 680000000, 0, '2026-10-15', 'paid', 'Đã thanh toán', 'Phạm Thu Hằng')
    `);

    // 4. Vay nợ ngân hàng (bank_loans)
    db.run(`
      INSERT OR IGNORE INTO bank_loans (id, code, bank_name, contract_code, facility_type, facility_label, term_type, loan_limit, paid_principal, remaining_principal, due_within_12m, interest_rate, interest_rate_val, interest_type, monthly_interest_est, start_date, maturity_date, status, status_label, loan_type, notes)
      VALUES
      ('LN-001', 'VAY-VCB-01', 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)', 'HDTD-2025-VCB-09', 'working_capital', 'Vay vốn lưu động hạn mức', 'short_term', 10000000000, 4000000000, 6000000000, 6000000000, '7.5% / năm', 7.5, 'floating', 37500000, '2025-01-10', '2027-01-10', 'active', 'Dư nợ trong hạn', 'Vay vốn lưu động phục vụ sản xuất kinh doanh', 'Tài sản bảo đảm: Nhà xưởng số 1 KCN Tân Quang'),
      ('LN-002', 'VAY-BIDV-02', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)', 'HDTD-2026-BIDV-14', 'investment', 'Vay trung dài hạn đầu tư máy móc', 'long_term', 5000000000, 2500000000, 2500000000, 800000000, '8.2% / năm', 8.2, 'fixed', 17083333, '2026-03-15', '2029-03-15', 'active', 'Dư nợ trong hạn', 'Đầu tư dây chuyền đúc và mạ crom tự động', 'Tài sản bảo đảm: Dây chuyền máy móc thiết bị hình thành từ vốn vay')
    `);

    // 5. Chi phí tài chính & hoạt động (financial_expenses)
    db.run(`
      INSERT OR IGNORE INTO financial_expenses (id, code, title, category, category_label, amount, department, spend_date, spender, status, status_label, debit_account, debit_account_name, credit_account, credit_account_name)
      VALUES
      ('EXP-01', 'CP-2026-10-01', 'Chi phí nguyên vật liệu phục vụ sản xuất đơn hàng Q4/2026', 'production', 'Chi phí sản xuất', 320000000, 'Khối Sản Xuất', '2026-10-12', 'Trần Hải Quang', 'approved', 'Đã chi tiền', '621', 'Chi phí NVL trực tiếp', '1121', 'Tiền gửi ngân hàng (VCB)'),
      ('EXP-02', 'CP-2026-10-02', 'Chi phí vận chuyển bàn giao công trình Ecopark Hưng Yên', 'sales', 'Chi phí bán hàng', 45000000, 'Phòng Kinh Doanh', '2026-10-18', 'Lưu Xuân Trung', 'approved', 'Đã chi tiền', '641', 'Chi phí bán hàng', '1111', 'Tiền mặt quỹ'),
      ('EXP-03', 'CP-2026-10-03', 'Chi phí tiền điện chiếu sáng và vận hành xưởng sản xuất tháng 9', 'production', 'Chi phí sản xuất', 86000000, 'Khối Sản Xuất', '2026-10-05', 'Nguyễn Lê Dũng', 'approved', 'Đã chi tiền', '627', 'Chi phí sản xuất chung', '1121', 'Tiền gửi ngân hàng (VCB)'),
      ('EXP-04', 'CP-2026-10-04', 'Chi phí lãi vay ngân hàng Vietcombank kỳ tháng 10/2026', 'finance', 'Chi phí tài chính', 37500000, 'Phòng Tài Chính - Kế Toán', '2026-10-25', 'Phạm Thu Hằng', 'approved', 'Đã chi tiền', '635', 'Chi phí tài chính', '1121', 'Tiền gửi ngân hàng (VCB)'),
      ('EXP-05', 'CP-2026-10-05', 'Chi phí thuê văn phòng trụ sở và internet tháng 10/2026', 'administrative', 'Chi phí quản lý', 65000000, 'Phòng Hành Chính Nhân Sự', '2026-10-02', 'Đoàn Thị Yến', 'approved', 'Đã chi tiền', '642', 'Chi phí quản lý doanh nghiệp', '1121', 'Tiền gửi ngân hàng (VCB)')
    `);

    // 6. Tạm ứng nhân viên (advance_payments)
    db.run(`
      INSERT OR IGNORE INTO advance_payments (id, code, employee_name, employee_code, department, purpose, amount, requested_date, payment_method, bank_name, status, review_status, approver, approved_date)
      VALUES
      ('ADV-01', 'TU-2026-001', 'Nguyễn Hữu Nam', 'NV-015', 'Phòng Dự án', 'Tạm ứng chi phí khảo sát công trình Vinhomes Grand Park', 15000000, '2026-10-05', 'bank_transfer', 'Vietcombank', 'approved', 'processed', 'Hà Hải Lâm', '2026-10-06'),
      ('ADV-02', 'TU-2026-002', 'Lê Vụ', 'NV-004', 'Phòng Kinh Doanh', 'Tạm ứng công tác phí hội chợ triển lãm Vietbuild Đà Nẵng', 25000000, '2026-10-15', 'bank_transfer', 'BIDV', 'approved', 'processed', 'Hà Hải Lâm', '2026-10-16')
    `);

    console.log('✓ Đã nạp thành công bộ dữ liệu tài chính - kế toán mẫu vào SQLite');
  });
}
