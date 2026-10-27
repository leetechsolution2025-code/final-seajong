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

const INITIAL_ASSETS = [
  {
    id: 'TS-001',
    code: 'MAY-CNC-01',
    name: 'Máy cắt phay gỗ CNC trung tâm 4 trục tự động',
    category: 'machinery',
    categoryLabel: 'Máy móc thiết bị sản xuất',
    originalPrice: 1850000000,
    residualValue: 1380000000,
    departmentKey: 'production',
    department: 'Bộ phận sản xuất',
    status: 'active',
    statusLabel: 'Đang sử dụng',
    serialNumber: 'SN-CNC-2024-09',
    purchasedDate: '15/03/2024',
    managerName: 'Trần Văn Mạnh',
    notes: 'Phục vụ cắt phôi cửa gỗ chống cháy chính xác cao',
  },
  {
    id: 'TS-002',
    code: 'EP-THUY-01',
    name: 'Máy ép nhiệt thủy lực cửa gỗ chống cháy 120 tấn',
    category: 'machinery',
    categoryLabel: 'Máy móc thiết bị sản xuất',
    originalPrice: 2400000000,
    residualValue: 1920000000,
    departmentKey: 'production',
    department: 'Bộ phận sản xuất',
    status: 'active',
    statusLabel: 'Đang sử dụng',
    serialNumber: 'EP-TL-120T-08',
    purchasedDate: '10/01/2024',
    managerName: 'Nguyễn Văn Đạt',
    notes: 'Ép nhiệt dán tấm chống cháy và bề mặt Melamine',
  },
  {
    id: 'TS-003',
    code: 'XNANG-KM-01',
    name: 'Xe nâng điện ngồi lái Komatsu 2.5 tấn',
    category: 'vehicle',
    categoryLabel: 'Phương tiện vận tải',
    originalPrice: 480000000,
    residualValue: 310000000,
    departmentKey: 'logistics',
    department: 'Bộ phận kho vận',
    status: 'active',
    statusLabel: 'Đang sử dụng',
    serialNumber: 'KM-FB25-9921',
    purchasedDate: '22/05/2023',
    managerName: 'Vũ Đức Thịnh',
    notes: 'Nâng hạ phôi gỗ và bốc dỡ kiện hàng xuất khẩu',
  },
  {
    id: 'TS-004',
    code: 'XTAI-ISU-01',
    name: 'Xe tải thùng kín Isuzu Forward 5 tấn chuyên dụng',
    category: 'vehicle',
    categoryLabel: 'Phương tiện vận tải',
    originalPrice: 890000000,
    residualValue: 560000000,
    departmentKey: 'logistics',
    department: 'Bộ phận kho vận',
    status: 'active',
    statusLabel: 'Đang sử dụng',
    serialNumber: '29H-882.91',
    purchasedDate: '18/11/2022',
    managerName: 'Lê Hữu Tuấn',
    notes: 'Giao hàng thành phẩm cửa cho các công trình miền Bắc',
  },
  {
    id: 'TS-005',
    code: 'SRV-DECO-01',
    name: 'Hệ thống máy chủ Dell PowerEdge R750 lưu trữ ERP',
    category: 'it_office',
    categoryLabel: 'Thiết bị văn phòng và CNTT',
    originalPrice: 320000000,
    residualValue: 210000000,
    departmentKey: 'admin',
    department: 'Phòng hành chính nhân sự',
    status: 'active',
    statusLabel: 'Đang sử dụng',
    serialNumber: 'SRV-DELL-R750-VN',
    purchasedDate: '05/08/2023',
    managerName: 'Đặng Minh Quân',
    notes: 'Đặt tại phòng Server trung tâm tòa nhà điều hành',
  },
  {
    id: 'TS-006',
    code: 'DC-SON-01',
    name: 'Dây chuyền sơn tĩnh điện sấy hồng ngoại liên hoàn',
    category: 'machinery',
    categoryLabel: 'Máy móc thiết bị sản xuất',
    originalPrice: 1650000000,
    residualValue: 980000000,
    departmentKey: 'production',
    department: 'Bộ phận sản xuất',
    status: 'maintenance',
    statusLabel: 'Đang bảo dưỡng',
    serialNumber: 'SN-LINE-PAINT-02',
    purchasedDate: '12/04/2022',
    managerName: 'Hoàng Văn Sơn',
    notes: 'Đang bảo dưỡng định kỳ buồng phun và hệ thống sấy',
  },
  {
    id: 'TS-007',
    code: 'DAN-CANH-01',
    name: 'Máy dán cạnh vát tự động đa chức năng Felder',
    category: 'machinery',
    categoryLabel: 'Máy móc thiết bị sản xuất',
    originalPrice: 780000000,
    residualValue: 520000000,
    departmentKey: 'production',
    department: 'Bộ phận sản xuất',
    status: 'active',
    statusLabel: 'Đang sử dụng',
    serialNumber: 'FL-G360-8802',
    purchasedDate: '19/09/2023',
    managerName: 'Trịnh Quốc Bảo',
    notes: 'Dán chỉ nẹp cạnh chống ẩm cho cánh cửa và khung bao',
  },
  {
    id: 'TS-008',
    code: 'TBIEN-AP-01',
    name: 'Trạm biến áp hạ thế 560kVA trọn bộ nhà máy',
    category: 'workshop',
    categoryLabel: 'Nhà xưởng và Công trình',
    originalPrice: 1150000000,
    residualValue: 910000000,
    departmentKey: 'production',
    department: 'Bộ phận sản xuất',
    status: 'active',
    statusLabel: 'Đang sử dụng',
    serialNumber: 'TBA-THACHTHAT-560',
    purchasedDate: '02/06/2022',
    managerName: 'Kỹ sư điện nhà máy',
    notes: 'Cung cấp nguồn điện 3 pha sản xuất công suất lớn',
  },
  {
    id: 'TS-009',
    code: 'MLANH-VRV-01',
    name: 'Hệ thống điều hòa trung tâm VRV Daikin văn phòng',
    category: 'workshop',
    categoryLabel: 'Nhà xưởng và Công trình',
    originalPrice: 420000000,
    residualValue: 270000000,
    departmentKey: 'admin',
    department: 'Phòng hành chính nhân sự',
    status: 'active',
    statusLabel: 'Đang sử dụng',
    serialNumber: 'DK-VRV-IV-60HP',
    purchasedDate: '28/02/2023',
    managerName: 'Quản trị tòa nhà',
    notes: 'Điều hòa thông gió khối văn phòng điều hành',
  },
  {
    id: 'TS-010',
    code: 'DO-AM-01',
    name: 'Máy đo độ ẩm gỗ điện tử tự động Delmhorst',
    category: 'measuring',
    categoryLabel: 'Thiết bị đo kiểm chất lượng',
    originalPrice: 65000000,
    residualValue: 42000000,
    departmentKey: 'production',
    department: 'Bộ phận sản xuất',
    status: 'active',
    statusLabel: 'Đang sử dụng',
    serialNumber: 'DMH-J2000-019',
    purchasedDate: '11/10/2023',
    managerName: 'Trưởng phòng KCS',
    notes: 'Đo kiểm độ ẩm cốt gỗ trước khi đưa vào dây chuyền ép',
  },
  {
    id: 'TS-011',
    code: 'PC-DESIGN-01',
    name: 'Dàn máy tính đồ họa chuyên dụng thiết kế 3D Solidworks',
    category: 'it_office',
    categoryLabel: 'Thiết bị văn phòng và CNTT',
    originalPrice: 145000000,
    residualValue: 88000000,
    departmentKey: 'technical',
    department: 'Thiết kế sản xuất',
    status: 'active',
    statusLabel: 'Đang sử dụng',
    serialNumber: 'PC-RD-I9-4080',
    purchasedDate: '14/07/2023',
    managerName: 'Lê Anh Văn',
    notes: 'Phục vụ dựng bản vẽ kỹ thuật chi tiết cửa chống cháy',
  },
  {
    id: 'TS-012',
    code: 'KHO-LUU-01',
    name: 'Máy đóng đai kiện hàng tự động khí nén',
    category: 'machinery',
    categoryLabel: 'Máy móc thiết bị sản xuất',
    originalPrice: 75000000,
    residualValue: 45000000,
    departmentKey: 'logistics',
    department: 'Bộ phận kho vận',
    status: 'in_stock',
    statusLabel: 'Trong kho lưu trữ',
    serialNumber: 'PKG-STRAP-03',
    purchasedDate: '09/12/2023',
    managerName: 'Thủ kho thành phẩm',
    notes: 'Máy dự phòng phục vụ đóng gói xuất khẩu',
  },
];

db.serialize(() => {
  console.log('--- Đang tạo các bảng Quản lý Tài sản Cố định (Fixed Assets) ---');

  // 1. Bảng Tài sản cố định chính (fixed_assets)
  db.run(`
    CREATE TABLE IF NOT EXISTS fixed_assets (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'machinery',
      category_label TEXT,
      original_price REAL NOT NULL DEFAULT 0,
      residual_value REAL NOT NULL DEFAULT 0,
      accumulated_depreciation REAL NOT NULL DEFAULT 0,
      department TEXT NOT NULL,
      department_key TEXT,
      manager_name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      status_label TEXT NOT NULL DEFAULT 'Đang sử dụng',
      serial_number TEXT,
      purchased_date TEXT,
      depreciation_months INTEGER DEFAULT 60,
      depreciation_start_date TEXT,
      maintenance_cycle TEXT,
      warranty_expire_date TEXT,
      notes TEXT,
      account_code TEXT DEFAULT '211',
      depreciation_account_code TEXT DEFAULT '2141',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Bảng Lịch sử khấu hao tài sản cố định hàng kỳ (fixed_asset_depreciations)
  db.run(`
    CREATE TABLE IF NOT EXISTS fixed_asset_depreciations (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      period TEXT NOT NULL, -- YYYY-MM
      depreciation_amount REAL NOT NULL DEFAULT 0,
      residual_value_after REAL NOT NULL DEFAULT 0,
      journal_entry_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
    )
  `);

  // 3. Bảng Lịch sử bảo dưỡng / sửa chữa máy móc thiết bị (fixed_asset_maintenances)
  db.run(`
    CREATE TABLE IF NOT EXISTS fixed_asset_maintenances (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      maintenance_date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cost REAL NOT NULL DEFAULT 0,
      technician TEXT,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
    )
  `);

  // Seed dữ liệu cho fixed_assets nếu bảng rỗng
  db.get('SELECT COUNT(*) as count FROM fixed_assets', (err, row) => {
    if (!err && row && row.count === 0) {
      console.log('Đang nạp 12 tài sản cố định thực tế...');
      const stmt = db.prepare(`
        INSERT INTO fixed_assets (
          id, code, name, category, category_label, original_price,
          residual_value, accumulated_depreciation, department, department_key,
          manager_name, status, status_label, serial_number, purchased_date,
          notes, account_code, depreciation_account_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '211', '2141')
      `);

      for (const item of INITIAL_ASSETS) {
        const orig = Number(item.originalPrice) || 0;
        const res = Number(item.residualValue) || 0;
        const acc = Math.max(0, orig - res);

        stmt.run(
          item.id,
          item.code,
          item.name,
          item.category,
          item.categoryLabel,
          orig,
          res,
          acc,
          item.department,
          item.departmentKey,
          item.managerName,
          item.status,
          item.statusLabel,
          item.serialNumber,
          item.purchasedDate,
          item.notes
        );
      }
      stmt.finalize();
      console.log('Đã nạp xong 12 tài sản cố định vào CSDL SQLite!');
    }
  });
});

setTimeout(() => {
  db.close((err) => {
    if (err) console.error('Lỗi đóng database:', err);
    else console.log('Đã hoàn tất script khởi tạo Tài sản cố định.');
  });
}, 2000);
