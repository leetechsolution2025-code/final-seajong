import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Xóa dữ liệu cũ
  db.run("DELETE FROM debt_payables WHERE id LIKE 'PAY-%'");

  const seajongPayables = [
    // --- 1. CÔNG NỢ NHÀ CUNG CẤP CỦA SEAJONG TRONG DB ---
    {
      id: 'PAY-SJ-01',
      code: 'CNTR-2026-001',
      supplier_name: 'Tô Toàn',
      supplier_address: 'Phúc Kiến, Trung Quốc',
      po_code: 'PO-2026-TT01',
      total_amount: 780000000,
      paid_amount: 450000000,
      remaining_amount: 330000000,
      due_date: '15/11/2026',
      status: 'pending',
      status_label: 'Chờ thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      notes: 'Cung cấp linh kiện củ sen đồng mạ Crom & bộ chia nước Seajong Luxury',
      entries_json: JSON.stringify([
        { id: 'E-TT-1', code: 'PO-2026-TT01', title: 'Đơn mua hàng PO-2026-TT01: Củ sen đồng mạ Crom Luxury (300 bộ)', date: '15/09/2026', totalAmount: 390000000, paidAmount: 390000000, remainingAmount: 0, dueDate: '20/09/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-TT-2', code: 'PO-2026-TT02', title: 'Đơn mua hàng PO-2026-TT02: Bộ chia nước sen cây nhiệt độ (200 bộ)', date: '10/10/2026', totalAmount: 200000000, paidAmount: 60000000, remainingAmount: 140000000, dueDate: '05/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' },
        { id: 'E-TT-3', code: 'PO-2026-TT03', title: 'Đơn mua hàng PO-2026-TT03: Linh kiện củ sen âm tường phôi đồng', date: '25/10/2026', totalAmount: 190000000, paidAmount: 0, remainingAmount: 190000000, dueDate: '15/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
      ])
    },
    {
      id: 'PAY-SJ-02',
      code: 'CNTR-2026-002',
      supplier_name: 'Trương Trần',
      supplier_address: 'Phúc Kiến, Trung Quốc',
      po_code: 'DH-20260928-0001',
      total_amount: 450000000,
      paid_amount: 250000000,
      remaining_amount: 200000000,
      due_date: '08/11/2026',
      status: 'due_soon',
      status_label: 'Sắp đến hạn',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      notes: 'Thân vòi chậu lavabo nóng lạnh đúc trọng lực cao cấp Seajong',
      entries_json: JSON.stringify([
        { id: 'E-TR-1', code: 'DH-20260928-0001', title: 'Đơn hàng DH-20260928-0001: Sen cây Hàn Quốc CSC08S và CSC08S-1', date: '28/09/2026', totalAmount: 250000000, paidAmount: 250000000, remainingAmount: 0, dueDate: '05/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-TR-2', code: 'PO-2026-TR02', title: 'Đơn mua hàng PO-2026-TR02: Thân vòi chậu lavabo nóng lạnh đúc trọng lực', date: '18/10/2026', totalAmount: 200000000, paidAmount: 0, remainingAmount: 200000000, dueDate: '08/11/2026', status: 'due_soon', statusLabel: 'Sắp đến hạn' }
      ])
    },
    {
      id: 'PAY-SJ-03',
      code: 'CNTR-2026-003',
      supplier_name: 'Ông Chen',
      supplier_address: 'Chiết Giang, Trung Quốc',
      po_code: 'PO-2026-CH01',
      total_amount: 320000000,
      paid_amount: 120000000,
      remaining_amount: 200000000,
      due_date: '05/11/2026',
      status: 'pending',
      status_label: 'Chờ thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      notes: 'Lõi van gốm sứ Sedal Ceramic 35mm & 40mm chống rò rỉ nước',
      entries_json: JSON.stringify([
        { id: 'E-CH-1', code: 'PO-2026-CH01', title: 'Đơn mua hàng PO-2026-CH01: Lõi van Ceramic Sedal 35mm (1.000 chiếc)', date: '05/10/2026', totalAmount: 120000000, paidAmount: 120000000, remainingAmount: 0, dueDate: '10/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-CH-2', code: 'PO-2026-CH02', title: 'Đơn mua hàng PO-2026-CH02: Lõi van gốm Ceramic 40mm (1.500 chiếc)', date: '20/10/2026', totalAmount: 200000000, paidAmount: 0, remainingAmount: 200000000, dueDate: '05/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
      ])
    },
    {
      id: 'PAY-SJ-04',
      code: 'CNTR-2026-004',
      supplier_name: 'Hải Yến',
      supplier_address: 'Phúc Kiến, Trung Quốc',
      po_code: 'PO-2026-HY01',
      total_amount: 210000000,
      paid_amount: 210000000,
      remaining_amount: 0,
      due_date: '15/10/2026',
      status: 'completed',
      status_label: 'Đã hoàn tất thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      notes: 'Bộ xiphong thoát sàn & ống xả đồng mạ Crom phủ PVD',
      entries_json: JSON.stringify([
        { id: 'E-HY-1', code: 'PO-2026-HY01', title: 'Đơn mua hàng PO-2026-HY01: Bộ xiphong thoát sàn & ống xả đồng mạ Crom phủ PVD', date: '15/10/2026', totalAmount: 210000000, paidAmount: 210000000, remainingAmount: 0, dueDate: '15/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' }
      ])
    },
    {
      id: 'PAY-SJ-05',
      code: 'CNTR-2026-005',
      supplier_name: 'Bát sen Hàn Quốc',
      supplier_address: 'Ning Ba, Trung Quốc',
      po_code: 'PO-2026-BS01',
      total_amount: 290000000,
      paid_amount: 150000000,
      remaining_amount: 140000000,
      due_date: '25/11/2026',
      status: 'pending',
      status_label: 'Chờ thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      notes: 'Bát sen tăng áp đa chế độ và dây sen chống xoắn chịu áp lực cao',
      entries_json: JSON.stringify([
        { id: 'E-BS-1', code: 'PO-2026-BS01', title: 'Đơn mua hàng PO-2026-BS01: Bát sen tăng áp 3 chế độ massage (800 bộ)', date: '02/10/2026', totalAmount: 150000000, paidAmount: 150000000, remainingAmount: 0, dueDate: '08/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-BS-2', code: 'PO-2026-BS02', title: 'Đơn mua hàng PO-2026-BS02: Dây sen inox 304 chống xoắn chịu áp lực cao (1.200 sợi)', date: '22/10/2026', totalAmount: 140000000, paidAmount: 0, remainingAmount: 140000000, dueDate: '25/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
      ])
    },
    {
      id: 'PAY-SJ-06',
      code: 'CNTR-2026-006',
      supplier_name: 'Chị Huyền Hộp',
      supplier_address: 'Hà Đông, Hà Nội',
      po_code: 'PO-2026-HH01',
      total_amount: 85000000,
      paid_amount: 50000000,
      remaining_amount: 35000000,
      due_date: '10/11/2026',
      status: 'pending',
      status_label: 'Chờ thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      notes: 'Bao bì hộp carton sóng bồi in offset thương hiệu Seajong Better The Best & khay mút xốp định hình',
      entries_json: JSON.stringify([
        { id: 'E-HH-1', code: 'PO-2026-HH01', title: 'Đơn đặt in PO-2026-HH01: 10.000 vỏ hộp sen vòi in offset phủ UV Seajong', date: '15/10/2026', totalAmount: 50000000, paidAmount: 50000000, remainingAmount: 0, dueDate: '20/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-HH-2', code: 'PO-2026-HH02', title: 'Đơn đặt in PO-2026-HH02: 8.000 khay mút xốp định hình chèn thân vòi', date: '26/10/2026', totalAmount: 35000000, paidAmount: 0, remainingAmount: 35000000, dueDate: '10/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
      ])
    },
    {
      id: 'PAY-SJ-07',
      code: 'CNTR-2026-007',
      supplier_name: 'A Hưng Châu',
      supplier_address: 'Phú Diễn, Bắc Từ Liêm, Hà Nội',
      po_code: 'PO-2026-HC01',
      total_amount: 62000000,
      paid_amount: 62000000,
      remaining_amount: 0,
      due_date: '18/10/2026',
      status: 'completed',
      status_label: 'Đã hoàn tất thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'supplier',
      notes: 'Gia công chi tiết tiện đồng thau ren chân sen và ốc siết chân bàn lavabo',
      entries_json: JSON.stringify([
        { id: 'E-HC-1', code: 'PO-2026-HC01', title: 'Hợp đồng gia công PO-2026-HC01: Tiện đồng ren chân sen và ốc siết chân bàn', date: '18/10/2026', totalAmount: 62000000, paidAmount: 62000000, remainingAmount: 0, dueDate: '18/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' }
      ])
    },

    // --- 2. CÔNG NỢ ĐƠN VỊ VẬN CHUYỂN CỦA SEAJONG TRONG DB ---
    {
      id: 'PAY-SJ-08',
      code: 'CNVC-2026-001',
      supplier_name: 'Công ty vận tải Thái Bình Dương',
      supplier_address: 'Số 18 Tam Trinh, Hoàng Mai, Hà Nội (Tổng kho Seajong)',
      po_code: 'VC-2026-TBD01',
      total_amount: 68000000,
      paid_amount: 40000000,
      remaining_amount: 28000000,
      due_date: '10/11/2026',
      status: 'pending',
      status_label: 'Chờ thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'transporter',
      notes: 'Tuyến Lạng Sơn về tổng kho Seajong tại Hà Nội và các đại lý khu vực miền Bắc',
      entries_json: JSON.stringify([
        { id: 'E-TBD-1', code: 'VC-20260928-0001', title: 'Vận đơn VC-20260928-0001: Cước vận chuyển đường bộ Lạng Sơn về Tổng kho Seajong (Đơn DH-20260928-0001)', date: '28/09/2026', totalAmount: 40000000, paidAmount: 40000000, remainingAmount: 0, dueDate: '18/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-TBD-2', code: 'VC-20261025-0002', title: 'Vận đơn VC-20261025-0002: Cước vận tải xe 8 tấn hàng nhập khẩu cửa khẩu Tân Thanh', date: '25/10/2026', totalAmount: 28000000, paidAmount: 0, remainingAmount: 28000000, dueDate: '10/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
      ])
    },
    {
      id: 'PAY-SJ-09',
      code: 'CNVC-2026-002',
      supplier_name: 'Công ty Cổ phần Vận chuyển Á Châu',
      supplier_address: 'Kho hàng số 3, Cảng Đình Vũ, Hải Phòng',
      po_code: 'VC-2026-AC01',
      total_amount: 85000000,
      paid_amount: 50000000,
      remaining_amount: 35000000,
      due_date: '05/11/2026',
      status: 'due_soon',
      status_label: 'Sắp đến hạn',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'transporter',
      notes: 'Kéo container từ Cảng Hải Phòng về Kho nhà máy Seajong và đại lý dự án',
      entries_json: JSON.stringify([
        { id: 'E-AC-1', code: 'VC-20261010-0001', title: 'Vận đơn VC-20261010-0001: Kéo 02 container 40ft linh kiện sen vòi từ Cảng Đình Vũ Hải Phòng', date: '10/10/2026', totalAmount: 50000000, paidAmount: 50000000, remainingAmount: 0, dueDate: '15/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-AC-2', code: 'VC-20261024-0002', title: 'Vận đơn VC-20261024-0002: Cước kéo container & phí nâng hạ bãi cảng Đình Vũ', date: '24/10/2026', totalAmount: 35000000, paidAmount: 0, remainingAmount: 35000000, dueDate: '05/11/2026', status: 'due_soon', statusLabel: 'Sắp đến hạn' }
      ])
    },
    {
      id: 'PAY-SJ-10',
      code: 'CNVC-2026-003',
      supplier_name: 'Công ty TNHH Vận tải Phượng Hoàng',
      supplier_address: 'Bãi xe Đuôi Cá, Giải Phóng, Hoàng Mai, Hà Nội',
      po_code: 'VC-2026-PH01',
      total_amount: 92000000,
      paid_amount: 60000000,
      remaining_amount: 32000000,
      due_date: '28/10/2026',
      status: 'overdue',
      status_label: 'Quá hạn trả',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'transporter',
      notes: 'Tuyến Hà Nội - Đà Nẵng - TP.HCM · Chuyên chở hàng thiết bị vệ sinh nguyên xe / ghép xe',
      entries_json: JSON.stringify([
        { id: 'E-PH-1', code: 'VC-20260925-0001', title: 'Vận đơn VC-20260925-0001: Xe tải 10 tấn giao thiết bị phòng tắm hệ thống showroom Đà Nẵng', date: '25/09/2026', totalAmount: 60000000, paidAmount: 60000000, remainingAmount: 0, dueDate: '05/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-PH-2', code: 'VC-20261012-0002', title: 'Vận đơn VC-20261012-0002: Xe tải ghép hàng giao tổng kho chi nhánh TP.HCM', date: '12/10/2026', totalAmount: 32000000, paidAmount: 0, remainingAmount: 32000000, dueDate: '28/10/2026', status: 'overdue', statusLabel: 'Quá hạn trả' }
      ])
    },
    {
      id: 'PAY-SJ-11',
      code: 'CNVC-2026-004',
      supplier_name: 'Công ty Cổ phần Dịch vụ Giao Hàng Nhanh (GHN)',
      supplier_address: 'Kho phân loại tổng HN, KCN Đài Tư, Long Biên, Hà Nội',
      po_code: 'VC-2026-GHN01',
      total_amount: 24500000,
      paid_amount: 15000000,
      remaining_amount: 9500000,
      due_date: '08/11/2026',
      status: 'pending',
      status_label: 'Chờ thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'transporter',
      notes: 'Giao nhanh các tỉnh thành · Tích hợp API tạo đơn tự động chuyển phát phụ kiện',
      entries_json: JSON.stringify([
        { id: 'E-GHN-1', code: 'VC-20261015-0001', title: 'Bảng kê VC-20261015-0001: Cước chuyển phát nhanh linh kiện bảo hành toàn quốc (Kỳ 1)', date: '15/10/2026', totalAmount: 15000000, paidAmount: 15000000, remainingAmount: 0, dueDate: '20/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' },
        { id: 'E-GHN-2', code: 'VC-20261026-0002', title: 'Bảng kê VC-20261026-0002: Cước chuyển phát nhanh phụ kiện sen vòi (Kỳ 2)', date: '26/10/2026', totalAmount: 9500000, paidAmount: 0, remainingAmount: 9500000, dueDate: '08/11/2026', status: 'pending', statusLabel: 'Chờ thanh toán' }
      ])
    },
    {
      id: 'PAY-SJ-12',
      code: 'CNVC-2026-005',
      supplier_name: 'Đội xe vận chuyển nội bộ Seajong Faucet',
      supplier_address: 'Kho tổng Seajong, KCN Yên Nghĩa, Hà Đông, Hà Nội',
      po_code: 'VC-2026-NB01',
      total_amount: 18000000,
      paid_amount: 18000000,
      remaining_amount: 0,
      due_date: '15/10/2026',
      status: 'completed',
      status_label: 'Đã hoàn tất thanh toán',
      accountant: 'Phạm Thu Hằng',
      partner_type: 'transporter',
      notes: 'Tuyến nội thành Hà Nội & các tỉnh lân cận bán kính 100km · 02 xe tải 2.5 tấn',
      entries_json: JSON.stringify([
        { id: 'E-NB-1', code: 'VC-20261015-0001', title: 'Phiếu quyết toán VC-20261015-0001: Xăng dầu & phí đường bộ xe tải giao showroom nội thành', date: '15/10/2026', totalAmount: 18000000, paidAmount: 18000000, remainingAmount: 0, dueDate: '15/10/2026', status: 'completed', statusLabel: 'Đã thanh toán' }
      ])
    }
  ];

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO debt_payables (
      id, code, supplier_name, supplier_address, po_code, total_amount, paid_amount, remaining_amount, due_date, status, status_label, accountant, partner_type, notes, entries_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  seajongPayables.forEach(p => {
    stmt.run(p.id, p.code, p.supplier_name, p.supplier_address, p.po_code, p.total_amount, p.paid_amount, p.remaining_amount, p.due_date, p.status, p.status_label, p.accountant, p.partner_type, p.notes, p.entries_json);
  });

  stmt.finalize(() => {
    console.log('✓ Đã đồng bộ thành công dữ liệu CÔNG NỢ NHÀ CUNG CẤP & ĐƠN VỊ VẬN CHUYỂN CHUẨN SEAJONG (Mã PO & Vận đơn, không có đợt)!');
    db.close();
  });
});
