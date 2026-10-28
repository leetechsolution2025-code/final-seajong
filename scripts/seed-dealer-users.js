import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Bắt đầu khởi tạo tài khoản cho đại lý ---');
  const defaultPasswordHash = await bcrypt.hash('12345', 10);
  
  const dealers = await prisma.customer.findMany({
    where: { nhom: 'dai-ly' },
    include: { user: true }
  });

  console.log(`Tìm thấy tổng cộng ${dealers.length} đại lý.`);
  let createdCount = 0;
  let alreadyExistCount = 0;

  for (const dealer of dealers) {
    if (dealer.user) {
      alreadyExistCount++;
      continue;
    }

    const baseCode = (dealer.code || 'KH' + dealer.id.slice(-4)).toLowerCase();
    let email = `${baseCode}@dealer.seajong.com`;

    if (dealer.email && dealer.email.includes('@')) {
      const trimmedEmail = dealer.email.toLowerCase().trim();
      const existingUser = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (!existingUser) {
        email = trimmedEmail;
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      email = `${baseCode}_${Date.now()}@dealer.seajong.com`;
    }

    await prisma.user.create({
      data: {
        email,
        password: defaultPasswordHash,
        name: dealer.name,
        role: 'DEALER',
        customerId: dealer.id,
        deptAccess: JSON.stringify(['dealer']),
        permissions: JSON.stringify(['dealer_access'])
      }
    });

    createdCount++;
  }

  console.log(`Đã tạo thành công ${createdCount} tài khoản đại lý.`);
  console.log(`Đã có sẵn ${alreadyExistCount} tài khoản.`);
}

main()
  .catch((e) => {
    console.error('Lỗi khởi tạo tài khoản đại lý:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
