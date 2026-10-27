import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Xóa sạch bảng debt_receivables để đồng bộ chuẩn CSDL Seajong
  db.run("DELETE FROM debt_receivables");

  const seajongReceivables = [
    // 1. Nguyen Thanh Phuc (KH95, Củ Chi, TP.HCM) - Có đơn hàng DBH-20260928-01 và DBH-20261007-02
    {
      id: 'REC-SJ-01',
      code: 'CNPT-KH95',
      customer_id: 'cmubd5buw00cn8ohlkjk7d3op',
      customer_name: 'Nguyen Thanh Phuc',
      customer_address: 'Thị Trấn Củ Chi, Huyện Củ Chi, TP. Hồ Chí Minh',
      project_name: 'Hợp đồng đại lý phân phối thiết bị sen vòi Seajong - TP.HCM',
      contract_value: 49630720,
      paid_amount: 0,
      remaining_amount: 49630720,
      due_date: '28/10/2026',
      status: 'due',
      status_label: 'Sắp đến hạn',
      manager_name: 'Lê Vụ (TP Kinh doanh)',
      notes: 'Đại lý phân phối khu vực Củ Chi & Tây Bắc TP.HCM',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-01',
          code: 'DBH-20260928-01',
          title: 'Đơn bán hàng DBH-20260928-01: Bồn cầu thông minh Seajong SJ-TLT103SFDUV & Gương SJ-GS1060-SR',
          date: '28/09/2026',
          time: '08:30',
          contractValue: 40726500,
          paidAmount: 0,
          remainingAmount: 40726500,
          dueDate: '28/10/2026',
          status: 'due',
          statusLabel: 'Sắp đến hạn'
        },
        {
          id: 'REC-E-02',
          code: 'DBH-20261007-02',
          title: 'Đơn bán hàng DBH-20261007-02: Sen tắm nóng lạnh Seajong 02S (20 bộ)',
          date: '07/10/2026',
          time: '14:20',
          contractValue: 8904220,
          paidAmount: 0,
          remainingAmount: 8904220,
          dueDate: '07/11/2026',
          status: 'ontime',
          statusLabel: 'Trong hạn thanh toán'
        }
      ])
    },

    // 2. Anh Hoàn (KH97, Đại lý Seajong) - Có đơn hàng DBH-20260922-01
    {
      id: 'REC-SJ-02',
      code: 'CNPT-KH97',
      customer_id: 'cmubd5bvd00cp8ohlodetqseo',
      customer_name: 'Anh Hoàn',
      customer_address: 'Đại lý phân phối thiết bị vệ sinh Seajong',
      project_name: 'Đơn hàng thiết bị sen tắm nóng lạnh Seajong 01S',
      contract_value: 1430650,
      paid_amount: 1400000,
      remaining_amount: 30650,
      due_date: '22/10/2026',
      status: 'overdue',
      status_label: 'Quá hạn thanh toán',
      manager_name: 'Lê Vụ (TP Kinh doanh)',
      notes: 'Đã thu 1.400.000đ (2 phiếu thu PT-438 và PT-454), còn dư nợ 30.650đ',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-03',
          code: 'DBH-20260922-01',
          title: 'Đơn bán hàng DBH-20260922-01: Sen tắm nóng lạnh Seajong 01S (15 bộ)',
          date: '22/09/2026',
          time: '09:00',
          contractValue: 1430650,
          paidAmount: 1400000,
          remainingAmount: 30650,
          dueDate: '22/10/2026',
          status: 'overdue',
          statusLabel: 'Quá hạn thanh toán'
        }
      ])
    },

    // 3. Nguyễn Xuân Trung (KH92, Từ Sơn, Bắc Ninh) - Đơn hàng DBH-20261007-01
    {
      id: 'REC-SJ-03',
      code: 'CNPT-KH92',
      customer_id: 'cmubd5bu200ck8ohlpn4kyp1n',
      customer_name: 'Nguyễn Xuân Trung',
      customer_address: 'Từ Sơn, Bắc Ninh',
      project_name: 'Cung cấp sen tắm nóng lạnh Seajong 01S - Bắc Ninh',
      contract_value: 462150,
      paid_amount: 0,
      remaining_amount: 462150,
      due_date: '07/11/2026',
      status: 'ontime',
      status_label: 'Trong hạn thanh toán',
      manager_name: 'Nguyễn Văn Thành',
      notes: 'Đơn hàng đại lý Từ Sơn',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-04',
          code: 'DBH-20261007-01',
          title: 'Đơn bán hàng DBH-20261007-01: Sen tắm nóng lạnh Seajong 01S (5 bộ)',
          date: '07/10/2026',
          time: '10:15',
          contractValue: 462150,
          paidAmount: 0,
          remainingAmount: 462150,
          dueDate: '07/11/2026',
          status: 'ontime',
          statusLabel: 'Trong hạn thanh toán'
        }
      ])
    },

    // 4. Anh Benza (KH99) - Đơn hàng DBH-20260930-01
    {
      id: 'REC-SJ-04',
      code: 'CNPT-KH99',
      customer_id: 'cmubd5bvu00cr8ohlcwl1ldwg',
      customer_name: 'Anh Benza',
      customer_address: 'Đại lý phân phối phụ kiện sen vòi Seajong',
      project_name: 'Cung cấp phụ kiện ốc cần sen cây các dòng 01, 02, 03, 26',
      contract_value: 225000,
      paid_amount: 0,
      remaining_amount: 225000,
      due_date: '30/10/2026',
      status: 'due',
      status_label: 'Sắp đến hạn',
      manager_name: 'Nguyễn Văn Thành',
      notes: 'Đơn hàng phụ kiện',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-05',
          code: 'DBH-20260930-01',
          title: 'Đơn bán hàng DBH-20260930-01: Ốc cần sen cây 01, 02, 03, 26 (50 chiếc)',
          date: '30/09/2026',
          time: '15:45',
          contractValue: 225000,
          paidAmount: 0,
          remainingAmount: 225000,
          dueDate: '30/10/2026',
          status: 'due',
          statusLabel: 'Sắp đến hạn'
        }
      ])
    },

    // 5. Showroom Thiên Thuận Lạng Sơn (KH0014, Mai Thành, Đông Kinh, Lạng Sơn) - Hạn mức 100tr
    {
      id: 'REC-SJ-05',
      code: 'CNPT-KH0014',
      customer_id: 'cmssr1wt40001yg2afs44v5px',
      customer_name: 'Showroom Thiên Thuận Lạng Sơn',
      customer_address: 'Thôn Mai Thành, Phường Đông Kinh, Tỉnh Lạng Sơn',
      project_name: 'Hợp đồng phân phối độc quyền thiết bị sen vòi Seajong tỉnh Lạng Sơn',
      contract_value: 125000000,
      paid_amount: 50000000,
      remaining_amount: 75000000,
      due_date: '15/11/2026',
      status: 'ontime',
      status_label: 'Trong hạn thanh toán',
      manager_name: 'Lê Vụ (TP Kinh doanh)',
      notes: 'Đại lý phân phối lớn khu vực Lạng Sơn, hạn mức công nợ 100 triệu',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-06',
          code: 'DBH-20261010-01',
          title: 'Đơn hàng DBH-20261010-01: Gói thiết bị sen cây tắm nóng lạnh Seajong Luxury (40 bộ)',
          date: '10/10/2026',
          time: '09:30',
          contractValue: 75000000,
          paidAmount: 50000000,
          remainingAmount: 25000000,
          dueDate: '15/11/2026',
          status: 'ontime',
          statusLabel: 'Trong hạn thanh toán'
        },
        {
          id: 'REC-E-07',
          code: 'DBH-20261018-02',
          title: 'Đơn hàng DBH-20261018-02: Bồn cầu một khối & gương LED thông minh Seajong',
          date: '18/10/2026',
          time: '14:00',
          contractValue: 50000000,
          paidAmount: 0,
          remainingAmount: 50000000,
          dueDate: '20/11/2026',
          status: 'ontime',
          statusLabel: 'Trong hạn thanh toán'
        }
      ])
    },

    // 6. Hiền Dân (KH0030, Thanh Oai, Hà Nội) - Hạn mức 100tr
    {
      id: 'REC-SJ-06',
      code: 'CNPT-KH0030',
      customer_id: 'cmstytqfb0a2hyg2atzpz89gu',
      customer_name: 'Hiền Dân',
      customer_address: 'Thanh Oai, Hà Nội',
      project_name: 'Gói cung cấp sen vòi & thiết bị vệ sinh cao cấp Seajong dự án Thanh Oai',
      contract_value: 85000000,
      paid_amount: 35000000,
      remaining_amount: 50000000,
      due_date: '08/11/2026',
      status: 'due',
      status_label: 'Sắp đến hạn',
      manager_name: 'Vũ Hoàng Long',
      notes: 'Showroom Hiền Dân, hạn mức công nợ 100 triệu',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-08',
          code: 'DBH-20261005-01',
          title: 'Đơn hàng DBH-20261005-01: Vòi chậu lavabo nóng lạnh đúc trọng lực Seajong (60 bộ)',
          date: '05/10/2026',
          time: '11:00',
          contractValue: 45000000,
          paidAmount: 35000000,
          remainingAmount: 10000000,
          dueDate: '05/11/2026',
          status: 'due',
          statusLabel: 'Sắp đến hạn'
        },
        {
          id: 'REC-E-09',
          code: 'DBH-20261015-02',
          title: 'Đơn hàng DBH-20261015-02: Phụ kiện xiphong & ống xả đồng PVD',
          date: '15/10/2026',
          time: '16:30',
          contractValue: 40000000,
          paidAmount: 0,
          remainingAmount: 40000000,
          dueDate: '08/11/2026',
          status: 'due',
          statusLabel: 'Sắp đến hạn'
        }
      ])
    },

    // 7. Anh Quang (KH0012, Nam Trực, Ninh Bình) - Hạn mức 100tr
    {
      id: 'REC-SJ-07',
      code: 'CNPT-KH0012',
      customer_id: 'cmsr61ain0320yg87ifilhnhw',
      customer_name: 'Anh Quang',
      customer_address: 'Xóm Bơ Cầu, Xã Nam Trực, tỉnh Ninh Bình',
      project_name: 'Đại lý phân phối độc quyền thiết bị sen vòi Seajong Nam Trực',
      contract_value: 95000000,
      paid_amount: 40000000,
      remaining_amount: 55000000,
      due_date: '12/11/2026',
      status: 'ontime',
      status_label: 'Trong hạn thanh toán',
      manager_name: 'Lê Vụ (TP Kinh doanh)',
      notes: 'Đại lý tỉnh Ninh Bình',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-10',
          code: 'DBH-20261002-01',
          title: 'Đơn hàng DBH-20261002-01: Lô sen cây phím đàn hiển thị nhiệt độ Seajong (25 bộ)',
          date: '02/10/2026',
          time: '08:45',
          contractValue: 95000000,
          paidAmount: 40000000,
          remainingAmount: 55000000,
          dueDate: '12/11/2026',
          status: 'ontime',
          statusLabel: 'Trong hạn thanh toán'
        }
      ])
    },

    // 8. Anh Ngọc (KH0013, Gia Lâm, Hà Nội) - Hạn mức 70tr
    {
      id: 'REC-SJ-08',
      code: 'CNPT-KH0013',
      customer_id: 'cmssec6l5068nyg8721rxmd8d',
      customer_name: 'Anh Ngọc',
      customer_address: 'Gia Lâm, Hà Nội',
      project_name: 'Gói thiết bị vệ sinh hoàn thiện căn hộ cao cấp Gia Lâm',
      contract_value: 68000000,
      paid_amount: 28000000,
      remaining_amount: 40000000,
      due_date: '10/11/2026',
      status: 'ontime',
      status_label: 'Trong hạn thanh toán',
      manager_name: 'Vũ Hoàng Long',
      notes: 'Hạn mức 70 triệu',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-11',
          code: 'DBH-20261008-01',
          title: 'Đơn hàng DBH-20261008-01: Sen vòi & bồn tiểu nam cảm ứng Seajong',
          date: '08/10/2026',
          time: '10:00',
          contractValue: 68000000,
          paidAmount: 28000000,
          remainingAmount: 40000000,
          dueDate: '10/11/2026',
          status: 'ontime',
          statusLabel: 'Trong hạn thanh toán'
        }
      ])
    },

    // 9. ANH BIÊN HOA (Văn Phú, Hà Đông) - Hạn mức 50tr
    {
      id: 'REC-SJ-09',
      code: 'CNPT-KH-BH',
      customer_id: 'cmsmxi19f0037ygppzda75ci7',
      customer_name: 'ANH BIÊN HOA',
      customer_address: 'Văn Phú, Hà Đông, Hà Nội',
      project_name: 'Cung cấp thiết bị phòng tắm công trình biệt thự liền kề Văn Phú',
      contract_value: 52000000,
      paid_amount: 22000000,
      remaining_amount: 30000000,
      due_date: '29/10/2026',
      status: 'due',
      status_label: 'Sắp đến hạn',
      manager_name: 'Lê Vụ (TP Kinh doanh)',
      notes: 'Đại lý Hà Đông',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-12',
          code: 'DBH-20260926-01',
          title: 'Đơn hàng DBH-20260926-01: Sen tắm âm trần cảm ứng & vòi chậu đúc đồng',
          date: '26/09/2026',
          time: '14:15',
          contractValue: 52000000,
          paidAmount: 22000000,
          remainingAmount: 30000000,
          dueDate: '29/10/2026',
          status: 'due',
          statusLabel: 'Sắp đến hạn'
        }
      ])
    },

    // 10. Chị Lê Nha Trang (TP Nha Trang) - Hạn mức 50tr - Đã tất toán
    {
      id: 'REC-SJ-10',
      code: 'CNPT-KH-LNT',
      customer_id: 'cmslq30hv0001ygfg7wi4wq9o',
      customer_name: 'Chị Lê Nha Trang',
      customer_address: 'TP Nha Trang, Khánh Hòa',
      project_name: 'Cung cấp thiết bị phòng tắm biệt thự nghỉ dưỡng Nha Trang',
      contract_value: 48000000,
      paid_amount: 48000000,
      remaining_amount: 0,
      due_date: '15/10/2026',
      status: 'completed',
      status_label: 'Đã tất toán',
      manager_name: 'Nguyễn Văn Thành',
      notes: 'Đã tất toán toàn bộ công nợ',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-13',
          code: 'DBH-20260915-01',
          title: 'Đơn hàng DBH-20260915-01: Bộ sen cây mạ Crom & phụ kiện phòng tắm cao cấp',
          date: '15/09/2026',
          time: '09:00',
          contractValue: 48000000,
          paidAmount: 48000000,
          remainingAmount: 0,
          dueDate: '15/10/2026',
          status: 'completed',
          statusLabel: 'Đã tất toán'
        }
      ])
    },

    // 11. Thành Cường - Sơn Tây (KH0010, Sơn Tây, Hà Nội) - Đã tất toán
    {
      id: 'REC-SJ-11',
      code: 'CNPT-KH0010',
      customer_id: 'cmspj86wq00miyg51sofgj59r',
      customer_name: 'Thành Cường- Sơn Tây',
      customer_address: 'Sơn Tây, Hà Nội',
      project_name: 'Gói cung cấp sen cây nóng lạnh Seajong Sơn Tây',
      contract_value: 24000000,
      paid_amount: 24000000,
      remaining_amount: 0,
      due_date: '10/10/2026',
      status: 'completed',
      status_label: 'Đã tất toán',
      manager_name: 'Vũ Hoàng Long',
      notes: 'Đã tất toán',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-14',
          code: 'DBH-20260910-01',
          title: 'Đơn hàng DBH-20260910-01: Sen tắm nóng lạnh Seajong Luxury',
          date: '10/09/2026',
          time: '08:30',
          contractValue: 24000000,
          paidAmount: 24000000,
          remainingAmount: 0,
          dueDate: '10/10/2026',
          status: 'completed',
          statusLabel: 'Đã tất toán'
        }
      ])
    },

    // 12. Anh Thạo (KĐT Tân Tây Đô, Đan Phượng, Hà Nội)
    {
      id: 'REC-SJ-12',
      code: 'CNPT-KH-AT',
      customer_id: 'cmslpluun0002ygfatzykt2a3',
      customer_name: 'Anh Thạo',
      customer_address: 'Số 45 ngõ 79 KĐT Tân Tây Đô, Đan Phượng, Hà Nội',
      project_name: 'Đơn hàng thiết bị sen vòi Seajong Tân Tây Đô',
      contract_value: 22500000,
      paid_amount: 10000000,
      remaining_amount: 12500000,
      due_date: '05/11/2026',
      status: 'ontime',
      status_label: 'Trong hạn thanh toán',
      manager_name: 'Lê Vụ (TP Kinh doanh)',
      notes: 'Đại lý Đan Phượng',
      entries_json: JSON.stringify([
        {
          id: 'REC-E-15',
          code: 'DBH-20261012-01',
          title: 'Đơn hàng DBH-20261012-01: Sen cây nhiệt độ & vòi chậu rửa mặt Seajong',
          date: '12/10/2026',
          time: '15:00',
          contractValue: 22500000,
          paidAmount: 10000000,
          remainingAmount: 12500000,
          dueDate: '05/11/2026',
          status: 'ontime',
          statusLabel: 'Trong hạn thanh toán'
        }
      ])
    }
  ];

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO debt_receivables (
      id, code, customer_id, customer_name, customer_address, project_name, contract_value, paid_amount, remaining_amount, due_date, status, status_label, manager_name, notes, entries_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  seajongReceivables.forEach(r => {
    stmt.run(
      r.id,
      r.code,
      r.customer_id,
      r.customer_name,
      r.customer_address,
      r.project_name,
      r.contract_value,
      r.paid_amount,
      r.remaining_amount,
      r.due_date,
      r.status,
      r.status_label,
      r.manager_name,
      r.notes,
      r.entries_json
    );
  });

  stmt.finalize(() => {
    console.log('✓ Đã đồng bộ thành công dữ liệu CÔNG NỢ PHẢI THU KHÁCH HÀNG & ĐẠI LÝ CHUẨN SEAJONG từ CSDL!');
    db.close();
  });
});
