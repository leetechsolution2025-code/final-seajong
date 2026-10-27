import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu khởi tạo dữ liệu chuẩn Seajong (13 phòng ban + đầy đủ nhân sự demo)...');

  // 1. Tạo Ngành nghề & Client Doanh nghiệp
  const industry = await prisma.industry.upsert({
    where: { code: 'sanitary' },
    update: {},
    create: {
      code: 'sanitary',
      name: 'Kinh doanh thiết bị phòng tắm, nhà bếp',
      rootCategoryCode: 'VTSX_VESINH',
    },
  });

  const client = await prisma.client.upsert({
    where: { shortName: 'seajong' },
    update: {
      name: 'Công ty Cổ phần Seajong Faucet Việt Nam',
      logoUrl: '/logo.png',
    },
    create: {
      name: 'Công ty Cổ phần Seajong Faucet Việt Nam',
      shortName: 'seajong',
      industryId: industry.id,
      status: 'active',
      logoUrl: '/logo.png',
    },
  });
  console.log('✅ Đã tạo/cập nhật Client:', client.name);

  // 2. Tạo 13 Phòng ban chuẩn như client-seajong
  const departments = [
    { code: 'board', nameVi: 'Ban Giám đốc', nameEn: 'Board of Directors', group: 'management', icon: 'Building2', sortOrder: 1 },
    { code: 'hr', nameVi: 'Nhân sự', nameEn: 'Human Resources', group: 'core', icon: 'Users', sortOrder: 10 },
    { code: 'finance', nameVi: 'Tài chính – Kế toán', nameEn: 'Finance & Accounting', group: 'core', icon: 'BadgeDollarSign', sortOrder: 11 },
    { code: 'admin_ops', nameVi: 'Hành chính – Văn phòng', nameEn: 'Administration & Office', group: 'core', icon: 'ClipboardCheck', sortOrder: 14 },
    { code: 'banhang', nameVi: 'Bán hàng', nameEn: 'Sale', group: 'core', icon: 'Store', sortOrder: 15 },
    { code: 'sales', nameVi: 'Kinh doanh', nameEn: 'Sales', group: 'business', icon: 'TrendingUp', sortOrder: 20 },
    { code: 'marketing', nameVi: 'Marketing', nameEn: 'Marketing', group: 'business', icon: 'Megaphone', sortOrder: 21 },
    { code: 'cs', nameVi: 'Chăm sóc khách hàng', nameEn: 'Customer Service', group: 'business', icon: 'Headphones', sortOrder: 24 },
    { code: 'logistics', nameVi: 'Kho vận', nameEn: 'Logistics & Warehouse', group: 'support', icon: 'Truck', sortOrder: 31 },
    { code: 'purchase', nameVi: 'Mua hàng', nameEn: 'Purchasing', group: 'support', icon: 'ShoppingCart', sortOrder: 32 },
    { code: 'qa', nameVi: 'Đảm bảo chất lượng', nameEn: 'Quality Assurance', group: 'support', icon: 'ShieldCheck', sortOrder: 33 },
    { code: 'production', nameVi: 'Sản xuất', nameEn: 'Production', group: 'support', icon: 'Wrench', sortOrder: 35 },
    { code: 'security', nameVi: 'Bảo vệ – An ninh', nameEn: 'Security', group: 'support', icon: 'ShieldAlert', sortOrder: 37 },
  ];

  for (const dept of departments) {
    await prisma.departmentCategory.upsert({
      where: { code: dept.code },
      update: {
        nameVi: dept.nameVi,
        nameEn: dept.nameEn,
        group: dept.group,
        icon: dept.icon,
        sortOrder: dept.sortOrder,
      },
      create: {
        code: dept.code,
        nameVi: dept.nameVi,
        nameEn: dept.nameEn,
        group: dept.group,
        icon: dept.icon,
        sortOrder: dept.sortOrder,
      },
    });
  }
  console.log(`✅ Đã đồng bộ ${departments.length} phòng ban chuẩn.`);

  // 3. Khởi tạo danh sách Nhân sự & User Demo chuẩn theo từng phòng ban
  const defaultPass = 'Pass@123';
  const hashedPass = await bcrypt.hash(defaultPass, 10);
  const adminHashedPass = await bcrypt.hash('Admin@123', 10);

  const demoUsers = [
    // 1. Ban Giám đốc (board)
    {
      code: 'SJ-001',
      email: 'admin@seajong.com',
      fullName: 'Quản trị viên Hệ thống',
      role: 'ADMIN',
      departmentCode: 'board',
      departmentName: 'Ban Giám đốc',
      position: 'Quản trị viên Cấp cao',
      permissions: ['all'],
      customHash: adminHashedPass,
    },
    {
      code: 'SJ-BOD-01',
      email: 'lecongvu@seajong.com',
      fullName: 'Lê Công Vụ',
      role: 'ADMIN',
      departmentCode: 'board',
      departmentName: 'Ban Giám đốc',
      position: 'Tổng Giám Đốc',
      permissions: ['all'],
    },
    {
      code: 'SJ-BOD-02',
      email: 'doanthiyen@seajong.com',
      fullName: 'Đoàn Thị Yến',
      role: 'ADMIN',
      departmentCode: 'board',
      departmentName: 'Ban Giám đốc',
      position: 'Phó Tổng Giám Đốc',
      permissions: ['crm', 'approve_request', 'report', 'notify'],
    },

    // 2. Nhân sự (hr)
    {
      code: 'SJ-HR-01',
      email: 'caothiphuong@seajong.com',
      fullName: 'Cao Thị Phương',
      role: 'USER',
      departmentCode: 'hr',
      departmentName: 'Nhân sự',
      position: 'Trưởng phòng Nhân sự',
      permissions: ['hr', 'recruitment', 'payroll', 'attendance'],
    },

    // 3. Tài chính – Kế toán (finance)
    {
      code: 'SJ-FIN-01',
      email: 'tranthilinh@seajong.com',
      fullName: 'Trần Thị Linh',
      role: 'USER',
      departmentCode: 'finance',
      departmentName: 'Tài chính – Kế toán',
      position: 'Kế toán trưởng',
      permissions: ['finance', 'accounting', 'report', 'budget_approval'],
    },

    // 4. Hành chính – Văn phòng (admin_ops)
    {
      code: 'SJ-ADM-01',
      email: 'nguyenvanan@seajong.com',
      fullName: 'Nguyễn Văn An',
      role: 'USER',
      departmentCode: 'admin_ops',
      departmentName: 'Hành chính – Văn phòng',
      position: 'Chuyên viên Hành chính',
      permissions: ['admin_ops', 'stationery', 'asset'],
    },

    // 5. Bán hàng (banhang)
    {
      code: 'SJ-BH-01',
      email: 'vuhoanglong@seajong.com',
      fullName: 'Vũ Hoàng Long',
      role: 'USER',
      departmentCode: 'banhang',
      departmentName: 'Bán hàng',
      position: 'Nhân viên Bán hàng & Showroom',
      permissions: ['banhang', 'retail', 'pos'],
    },

    // 6. Kinh doanh (sales)
    {
      code: 'SJ-SAL-01',
      email: 'phamquangviet@seajong.com',
      fullName: 'Phạm Quang Việt',
      role: 'USER',
      departmentCode: 'sales',
      departmentName: 'Kinh doanh',
      position: 'Trưởng phòng Kinh doanh',
      permissions: ['sales', 'crm', 'contract', 'price_view'],
    },
    {
      code: 'SJ-SAL-02',
      email: 'trinhvantuyen@seajong.com',
      fullName: 'Trịnh Văn Tuyến',
      role: 'USER',
      departmentCode: 'sales',
      departmentName: 'Kinh doanh',
      position: 'Chuyên viên Kinh doanh Dự án',
      permissions: ['sales', 'crm', 'contract'],
    },
    {
      code: 'SJ-SAL-03',
      email: 'levu@seajong.com',
      fullName: 'Lê Vụ',
      role: 'USER',
      departmentCode: 'sales',
      departmentName: 'Kinh doanh',
      position: 'Chuyên viên Phát triển Thị trường',
      permissions: ['sales', 'crm', 'report'],
    },

    // 7. Marketing (marketing)
    {
      code: 'SJ-MKT-01',
      email: 'nguyenthuhuyen@seajong.com',
      fullName: 'Nguyễn Thu Huyền',
      role: 'USER',
      departmentCode: 'marketing',
      departmentName: 'Marketing',
      position: 'Chuyên viên Marketing & Thương hiệu',
      permissions: ['marketing', 'crm', 'campaign', 'report'],
    },

    // 8. Chăm sóc khách hàng (cs)
    {
      code: 'SJ-CS-01',
      email: 'phamthimai@seajong.com',
      fullName: 'Phạm Thị Mai',
      role: 'USER',
      departmentCode: 'cs',
      departmentName: 'Chăm sóc khách hàng',
      position: 'Chuyên viên Chăm sóc Khách hàng',
      permissions: ['cs', 'crm', 'ticket', 'feedback'],
    },

    // 9. Kho vận (logistics)
    {
      code: 'SJ-LOG-01',
      email: 'nguyenvantien@seajong.com',
      fullName: 'Nguyễn Văn Tiền',
      role: 'USER',
      departmentCode: 'logistics',
      departmentName: 'Kho vận',
      position: 'Quản lý Kho vận & Logistics',
      permissions: ['logistics', 'warehouse', 'stock_in', 'stock_out'],
    },
    {
      code: 'SJ-LOG-02',
      email: 'phamxuandanh@seajong.com',
      fullName: 'Phạm Xuân Danh',
      role: 'USER',
      departmentCode: 'logistics',
      departmentName: 'Kho vận',
      position: 'Thủ kho Thành phẩm',
      permissions: ['logistics', 'warehouse', 'stock_movement'],
    },
    {
      code: 'SJ-LOG-03',
      email: 'nguyenvankhang@seajong.com',
      fullName: 'Nguyễn Văn Kháng',
      role: 'USER',
      departmentCode: 'logistics',
      departmentName: 'Kho vận',
      position: 'Nhân viên Điều vận Giao nhận',
      permissions: ['logistics', 'transport'],
    },
    {
      code: 'SJ-LOG-04',
      email: 'luongxuantrung@seajong.com',
      fullName: 'Lương Xuân Trung',
      role: 'USER',
      departmentCode: 'logistics',
      departmentName: 'Kho vận',
      position: 'Nhân viên Kiểm đếm & Đóng gói',
      permissions: ['logistics', 'stock_count'],
    },

    // 10. Mua hàng (purchase)
    {
      code: 'SJ-PUR-01',
      email: 'tranthimaianh@seajong.com',
      fullName: 'Trần Thị Mai Anh',
      role: 'USER',
      departmentCode: 'purchase',
      departmentName: 'Mua hàng',
      position: 'Chuyên viên Mua hàng & Cung ứng',
      permissions: ['purchase', 'supplier', 'po'],
    },

    // 11. Đảm bảo chất lượng (qa)
    {
      code: 'SJ-QA-01',
      email: 'leanhvan@seajong.com',
      fullName: 'Lê Anh Vân',
      role: 'USER',
      departmentCode: 'qa',
      departmentName: 'Đảm bảo chất lượng',
      position: 'Trưởng bộ phận QA / KCS',
      permissions: ['qa', 'kcs', 'qc_inspection', 'report'],
    },
    {
      code: 'SJ-QA-02',
      email: 'nguyenvantrung@seajong.com',
      fullName: 'Nguyễn Văn Trung',
      role: 'USER',
      departmentCode: 'qa',
      departmentName: 'Đảm bảo chất lượng',
      position: 'Kỹ sư Kiểm định Chất lượng',
      permissions: ['qa', 'kcs', 'defect'],
    },

    // 12. Sản xuất (production)
    {
      code: 'SJ-PROD-01',
      email: 'hathibichngoc@seajong.com',
      fullName: 'Hà Thị Bích Ngọc',
      role: 'USER',
      departmentCode: 'production',
      departmentName: 'Sản xuất',
      position: 'Quản đốc Phân xưởng Sản xuất',
      permissions: ['production', 'bom', 'work_order'],
    },
    {
      code: 'SJ-PROD-02',
      email: 'nguyenanhtuan@seajong.com',
      fullName: 'Nguyễn Anh Tuấn',
      role: 'USER',
      departmentCode: 'production',
      departmentName: 'Sản xuất',
      position: 'Kỹ sư Cơ điện & Khuôn đúc',
      permissions: ['production', 'maintenance'],
    },
    {
      code: 'SJ-PROD-03',
      email: 'nguyenvanhoa@seajong.com',
      fullName: 'Nguyễn Văn Hoạ',
      role: 'USER',
      departmentCode: 'production',
      departmentName: 'Sản xuất',
      position: 'Kỹ thuật viên Lắp ráp & Mạ Crom',
      permissions: ['production', 'assembly'],
    },
    {
      code: 'SJ-PROD-04',
      email: 'nguyenvanchuyen@seajong.com',
      fullName: 'Nguyễn Văn Chuyển',
      role: 'USER',
      departmentCode: 'production',
      departmentName: 'Sản xuất',
      position: 'Tổ trưởng Dây chuyền Gia công',
      permissions: ['production', 'workshop'],
    },

    // 13. Bảo vệ – An ninh (security)
    {
      code: 'SJ-SEC-01',
      email: 'tranducnam@seajong.com',
      fullName: 'Trần Đức Nam',
      role: 'USER',
      departmentCode: 'security',
      departmentName: 'Bảo vệ – An ninh',
      position: 'Đội trưởng An ninh & Bảo vệ Nhà máy',
      permissions: ['security', 'gate_pass', 'visitor'],
    },
  ];

  for (const item of demoUsers) {
    const passwordHash = item.customHash || hashedPass;

    // Upsert User
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        name: item.fullName,
        role: item.role,
        password: passwordHash,
        permissions: JSON.stringify(item.permissions),
        deptAccess: JSON.stringify([item.departmentCode]),
        clientId: client.id,
      },
      create: {
        email: item.email,
        name: item.fullName,
        role: item.role,
        password: passwordHash,
        permissions: JSON.stringify(item.permissions),
        deptAccess: JSON.stringify([item.departmentCode]),
        clientId: client.id,
      },
    });

    // Upsert Employee linked to User
    await prisma.employee.upsert({
      where: { code: item.code },
      update: {
        fullName: item.fullName,
        workEmail: item.email,
        departmentCode: item.departmentCode,
        departmentName: item.departmentName,
        position: item.position,
        clientId: client.id,
        userId: user.id,
      },
      create: {
        code: item.code,
        fullName: item.fullName,
        workEmail: item.email,
        departmentCode: item.departmentCode,
        departmentName: item.departmentName,
        position: item.position,
        level: item.role === 'ADMIN' ? 'manager' : 'staff',
        status: 'active',
        branchCode: 'HN',
        clientId: client.id,
        userId: user.id,
      },
    });
  }
  console.log(`✅ Đã tạo/cập nhật ${demoUsers.length} tài khoản nhân viên demo cho 13 phòng ban.`);

  // 4. Khởi tạo kho hàng logistics
  const warehouses = [
    { code: 'KHO-CHINH', name: 'Kho Hàng Hoá Chính (Thành phẩm)' },
    { code: 'KVP', name: 'Kho Vật tư và Phụ kiện' },
    { code: 'KHO-LOI', name: 'Kho Hàng Lỗi / Bảo hành' },
    { code: 'KHO-SHOWROOM', name: 'Kho Showroom Trưng Bày' },
  ];

  for (const wh of warehouses) {
    await prisma.warehouse.upsert({
      where: { code: wh.code },
      update: { name: wh.name },
      create: {
        code: wh.code,
        name: wh.name,
        isActive: true,
      },
    });
  }
  console.log(`✅ Đã tạo ${warehouses.length} Kho hàng chuẩn.`);

  console.log('🎉 Hoàn tất nạp dữ liệu cấu trúc Seajong ERP thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
