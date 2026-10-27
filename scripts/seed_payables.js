import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("ALTER TABLE debt_payables ADD COLUMN partner_type TEXT DEFAULT 'supplier'", (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.log('Alter note:', err.message);
    } else {
      console.log('Column partner_type ready');
    }
  });

  const payablesData = [
    {
      id: 'PAY-01',
      code: 'CNTR-2026-001',
      supplier_name: 'Công ty Cổ phần Gỗ An Cường',
      supplier_address: 'Đường ĐT 743, TX Tân Uyên, Bình Dương',
      po_code: 'PO-2026-088',
      total_amount: 850000000,
      paid_amount: 500000000,
      remaining_amount: 350000000,
      due_date: '2026-11-10',
      status: 'pending',
      status_label: 'Chờ thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      entries_json: JSON.stringify([
        { id: 'E-01-1', code: 'DOT-1', title: 'Đợt 1: Tạm ứng hợp đồng 50%', date: '2026-09-15', totalAmount: 425000000, paidAmount: 425000000, remainingAmount: 0, dueDate: '2026-09-20', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-01-2', code: 'DOT-2', title: 'Đợt 2: Thanh toán đợt giao ván tủ đợt 1', date: '2026-10-10', totalAmount: 250000000, paidAmount: 75000000, remainingAmount: 175000000, dueDate: '2026-11-05', status: 'pending', statusLabel: 'Chờ thanh toán' },
        { id: 'E-01-3', code: 'DOT-3', title: 'Đợt 3: Thanh toán tất toán PO-2026-088', date: '2026-10-25', totalAmount: 175000000, paidAmount: 0, remainingAmount: 175000000, dueDate: '2026-11-10', status: 'pending', statusLabel: 'Chờ thanh toán' }
      ])
    },
    {
      id: 'PAY-02',
      code: 'CNTR-2026-002',
      supplier_name: 'Công ty Phụ kiện Ngũ kim KinLong Việt Nam',
      supplier_address: 'KCN Đại Đồng, Tiên Du, Bắc Ninh',
      po_code: 'PO-2026-092',
      total_amount: 420000000,
      paid_amount: 200000000,
      remaining_amount: 220000000,
      due_date: '2026-11-05',
      status: 'due_soon',
      status_label: 'Sắp đến hạn',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      entries_json: JSON.stringify([
        { id: 'E-02-1', code: 'DOT-1', title: 'Đợt 1: Đặt cọc phụ kiện ray trượt giảm chấn', date: '2026-09-28', totalAmount: 200000000, paidAmount: 200000000, remainingAmount: 0, dueDate: '2026-10-05', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-02-2', code: 'DOT-2', title: 'Đợt 2: Quyết toán sau khi giao đủ hàng kho', date: '2026-10-18', totalAmount: 220000000, paidAmount: 0, remainingAmount: 220000000, dueDate: '2026-11-05', status: 'due_soon', statusLabel: 'Sắp đến hạn' }
      ])
    },
    {
      id: 'PAY-03',
      code: 'CNTR-2026-003',
      supplier_name: 'Công ty TNHH Nhôm Xingfa Quảng Đông',
      supplier_address: 'KCN Nhơn Trạch, Đồng Nai',
      po_code: 'PO-2026-095',
      total_amount: 680000000,
      paid_amount: 680000000,
      remaining_amount: 0,
      due_date: '2026-10-15',
      status: 'completed',
      status_label: 'Đã hoàn tất thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      entries_json: JSON.stringify([
        { id: 'E-03-1', code: 'DOT-1', title: 'Tất toán hợp đồng nhôm thanh định hình', date: '2026-10-15', totalAmount: 680000000, paidAmount: 680000000, remainingAmount: 0, dueDate: '2026-10-15', status: 'completed', statusLabel: 'Đã thanh toán' }
      ])
    },
    {
      id: 'PAY-04',
      code: 'CNTR-2026-004',
      supplier_name: 'Tập đoàn Sứ vệ sinh Viglacera',
      supplier_address: 'Tòa nhà Viglacera, Mễ Trì, Nam Từ Liêm, Hà Nội',
      po_code: 'PO-2026-104',
      total_amount: 1250000000,
      paid_amount: 750000000,
      remaining_amount: 500000000,
      due_date: '2026-11-28',
      status: 'pending',
      status_label: 'Chờ thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      entries_json: JSON.stringify([
        { id: 'E-04-1', code: 'DOT-1', title: 'Đợt 1: Tạm ứng đơn bồn cầu thông minh Seajong', date: '2026-10-02', totalAmount: 750000000, paidAmount: 750000000, remainingAmount: 0, dueDate: '2026-10-08', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-04-2', code: 'DOT-2', title: 'Đợt 2: Thanh toán phần còn lại sau nghiệm thu', date: '2026-10-22', totalAmount: 500000000, paidAmount: 0, remainingAmount: 500000000, dueDate: '2026-11-28', status: 'pending', statusLabel: 'Chờ thanh toán' }
      ])
    },
    {
      id: 'PAY-05',
      code: 'CNVC-2026-001',
      supplier_name: 'Công ty CP Giao Hàng Tiết Kiệm (GHTK)',
      supplier_address: 'Tòa nhà GHTK Building, Phạm Hùng, Cầu Giấy, Hà Nội',
      po_code: 'VC-2026-015',
      total_amount: 45000000,
      paid_amount: 25000000,
      remaining_amount: 20000000,
      due_date: '2026-11-08',
      status: 'pending',
      status_label: 'Chờ thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'transporter',
      entries_json: JSON.stringify([
        { id: 'E-05-1', code: 'DOT-1', title: 'Cước vận chuyển phụ kiện sen vòi kỳ 1 tháng 10', date: '2026-10-15', totalAmount: 25000000, paidAmount: 25000000, remainingAmount: 0, dueDate: '2026-10-20', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-05-2', code: 'DOT-2', title: 'Cước vận chuyển giao hàng lẻ kỳ 2 tháng 10', date: '2026-10-26', totalAmount: 20000000, paidAmount: 0, remainingAmount: 20000000, dueDate: '2026-11-08', status: 'pending', statusLabel: 'Chờ thanh toán' }
      ])
    },
    {
      id: 'PAY-06',
      code: 'CNVC-2026-002',
      supplier_name: 'Tổng Công ty CP Bưu chính Viettel (Viettel Post)',
      supplier_address: 'Tòa nhà Viettel, số 1 Giang Văn Minh, Ba Đình, Hà Nội',
      po_code: 'VC-2026-018',
      total_amount: 88000000,
      paid_amount: 50000000,
      remaining_amount: 38000000,
      due_date: '2026-11-02',
      status: 'due_soon',
      status_label: 'Sắp đến hạn',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'transporter',
      entries_json: JSON.stringify([
        { id: 'E-06-1', code: 'DOT-1', title: 'Cước vận tải tuyến liên tỉnh Bắc - Trung - Nam đợt 1', date: '2026-10-10', totalAmount: 50000000, paidAmount: 50000000, remainingAmount: 0, dueDate: '2026-10-15', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-06-2', code: 'DOT-2', title: 'Đối soát cước hàng cồng kềnh xuất kho đợt 2', date: '2026-10-24', totalAmount: 38000000, paidAmount: 0, remainingAmount: 38000000, dueDate: '2026-11-02', status: 'due_soon', statusLabel: 'Sắp đến hạn' }
      ])
    },
    {
      id: 'PAY-07',
      code: 'CNVC-2026-003',
      supplier_name: 'Công ty Vận tải & Logistics Á Châu',
      supplier_address: 'Bãi xe Á Châu, Đường Hoàng Liệt, Hoàng Mai, Hà Nội',
      po_code: 'VC-2026-022',
      total_amount: 135000000,
      paid_amount: 90000000,
      remaining_amount: 45000000,
      due_date: '2026-10-25',
      status: 'overdue',
      status_label: 'Quá hạn trả',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'transporter',
      entries_json: JSON.stringify([
        { id: 'E-07-1', code: 'DOT-1', title: 'Cước đoàn xe 15 tấn chuyển thiết bị dự án Vinhomes', date: '2026-09-25', totalAmount: 90000000, paidAmount: 90000000, remainingAmount: 0, dueDate: '2026-10-05', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-07-2', code: 'DOT-2', title: 'Cước xe trung chuyển đợt hoàn thiện dự án', date: '2026-10-12', totalAmount: 45000000, paidAmount: 0, remainingAmount: 45000000, dueDate: '2026-10-25', status: 'overdue', statusLabel: 'Quá hạn trả' }
      ])
    },
    {
      id: 'PAY-08',
      code: 'CNVC-2026-004',
      supplier_name: 'Công ty TNHH Vận tải Bắc Nam Hoàng Long',
      supplier_address: 'Khu công nghiệp Tiên Sơn, Bắc Ninh',
      po_code: 'VC-2026-027',
      total_amount: 110000000,
      paid_amount: 110000000,
      remaining_amount: 0,
      due_date: '2026-10-12',
      status: 'completed',
      status_label: 'Đã hoàn tất thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'transporter',
      entries_json: JSON.stringify([
        { id: 'E-08-1', code: 'DOT-1', title: 'Cước xe container chuyển gạch men và sứ kho Cần Thơ', date: '2026-10-12', totalAmount: 110000000, paidAmount: 110000000, remainingAmount: 0, dueDate: '2026-10-12', status: 'completed', statusLabel: 'Đã thanh toán' }
      ])
    }
  ];

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO debt_payables (
      id, code, supplier_name, supplier_address, po_code, total_amount, paid_amount, remaining_amount, due_date, status, status_label, accountant, partner_type, entries_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  payablesData.forEach(p => {
    stmt.run(p.id, p.code, p.supplier_name, p.supplier_address, p.po_code, p.total_amount, p.paid_amount, p.remaining_amount, p.due_date, p.status, p.status_label, p.accountant, p.partner_type, p.entries_json);
  });

  stmt.finalize(() => {
    console.log('✓ Hoàn tất nạp 8 bản ghi mẫu chuẩn Nhà cung cấp & Đơn vị vận chuyển vào debt_payables!');
    db.close();
  });
});
