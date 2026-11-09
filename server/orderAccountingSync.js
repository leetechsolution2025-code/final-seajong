import { PrismaClient } from '@prisma/client';
import { syncPrismaFinanceToAccountingTables } from '../services/prismaFinanceSyncService.js';

/**
 * Service đồng bộ đơn hàng bán hàng vào Bộ máy Kế toán & Quản lý Công nợ Seajong
 * Chuẩn mực Thông tư 200/2014/TT-BTC:
 * 1. Quản lý công nợ (Debt): Tự động ghi nhận công nợ phải thu (RECEIVABLE)
 * 2. Sổ nhật ký chung (JournalEntry):
 *    - Ghi nhận doanh thu & công nợ: Nợ TK 131 / Có TK 511, Có TK 3331
 *    - Ghi nhận thanh toán (nếu có): Nợ TK 1121 (hoặc 1111) / Có TK 131
 * 3. Đồng bộ tức thời sang hệ thống bảng SQLite chi tiết qua prismaFinanceSyncService
 */

export async function syncOrderToAccountingAndDebt(orderIdentifier, db = null, prismaInstance = null) {
  const prisma = prismaInstance || new PrismaClient();

  try {
    const order = await prisma.saleOrder.findFirst({
      where: {
        OR: [
          { id: orderIdentifier },
          { code: orderIdentifier }
        ]
      },
      include: {
        customer: true,
        saleOrderItems: true
      }
    });

    if (!order) {
      console.warn(`[SyncOrderAccounting] Không tìm thấy đơn hàng: ${orderIdentifier}`);
      return { success: false, message: 'Order not found' };
    }

    const orderCode = order.code || order.id;
    const tongTien = Number(order.tongTien) || 0;
    const daThanhToan = Number(order.daThanhToan) || 0;
    const vat = Number(order.vat) || 0;
    const doanhThu = Math.max(0, tongTien - vat);

    const partnerName = order.customer?.name
      ? `${order.customer.name}${order.customer.dienThoai ? ' – ' + order.customer.dienThoai : ''}`
      : (order.nguoiDatHang || order.nguoiNhan || `Khách hàng đơn ${orderCode}`);

    const debtStatus = daThanhToan >= tongTien
      ? 'PAID'
      : (daThanhToan > 0 ? 'PARTIAL' : 'UNPAID');

    const dueDate = order.ngayGiao
      ? new Date(order.ngayGiao)
      : new Date(new Date(order.ngayDat || new Date()).getTime() + 30 * 86400000);

    // ──────────────────────────────────────────────────────────────────────────
    // 1. CẬP NHẬT HOẶC TẠO MỚI CÔNG NỢ (DEBT)
    // ──────────────────────────────────────────────────────────────────────────
    const existingDebt = await prisma.debt.findFirst({
      where: {
        OR: [
          { referenceId: orderCode },
          { referenceId: order.id }
        ]
      }
    });

    if (existingDebt) {
      await prisma.debt.update({
        where: { id: existingDebt.id },
        data: {
          partnerName,
          customerId: order.customerId || existingDebt.customerId,
          amount: tongTien,
          paidAmount: daThanhToan,
          status: debtStatus,
          dueDate,
          description: `Công nợ đơn hàng ${orderCode} - ${partnerName}`,
          updatedAt: new Date(),
        }
      });
    } else {
      await prisma.debt.create({
        data: {
          type: 'RECEIVABLE',
          partnerName,
          customerId: order.customerId || null,
          amount: tongTien,
          paidAmount: daThanhToan,
          status: debtStatus,
          dueDate,
          referenceId: orderCode,
          description: `Công nợ đơn hàng ${orderCode} - ${partnerName}`,
        }
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. CẬP NHẬT HOẶC TẠO MỚI SỔ NHẬT KÝ CHUNG (JOURNAL ENTRY)
    // ──────────────────────────────────────────────────────────────────────────
    // Lấy ID các tài khoản kế toán chuẩn Thông tư 200
    const accounts = await prisma.accountingAccount.findMany({
      where: {
        code: { in: ['131', '511', '3331', '1121', '1111'] }
      }
    });
    const accMap = new Map();
    accounts.forEach((a) => accMap.set(a.code, a));

    const acc131 = accMap.get('131');
    const acc511 = accMap.get('511');
    const acc3331 = accMap.get('3331');
    const acc1121 = accMap.get('1121') || accMap.get('1111');

    if (acc131 && acc511 && tongTien > 0) {
      // 2A. Bút toán ghi nhận Doanh thu & Phải thu khách hàng:
      // Nợ TK 131: tongTien
      // Có TK 511: doanhThu
      // Có TK 3331: vat (nếu có)
      const existingSalesEntry = await prisma.journalEntry.findFirst({
        where: {
          sourceModule: 'SALES',
          referenceCode: orderCode,
          description: { contains: 'Doanh thu bán hàng' }
        },
        include: { lines: true }
      });

      if (existingSalesEntry) {
        // Cập nhật bút toán hiện có
        await prisma.journalLine.deleteMany({
          where: { journalEntryId: existingSalesEntry.id }
        });

        await prisma.journalEntry.update({
          where: { id: existingSalesEntry.id },
          data: {
            entryDate: order.ngayDat ? new Date(order.ngayDat) : new Date(),
            totalAmount: tongTien,
            description: `Doanh thu bán hàng đơn ${orderCode} - ${partnerName}`,
          }
        });

        // Tạo lại lines
        const linesData = [
          {
            journalEntryId: existingSalesEntry.id,
            accountId: acc131.id,
            type: 'DEBIT',
            amount: tongTien,
            description: `Phải thu khách hàng đơn ${orderCode} - ${partnerName}`,
          },
          {
            journalEntryId: existingSalesEntry.id,
            accountId: acc511.id,
            type: 'CREDIT',
            amount: doanhThu,
            description: `Doanh thu bán hàng đơn ${orderCode}`,
          }
        ];
        if (vat > 0 && acc3331) {
          linesData.push({
            journalEntryId: existingSalesEntry.id,
            accountId: acc3331.id,
            type: 'CREDIT',
            amount: vat,
            description: `Thuế GTGT phải nộp đơn ${orderCode}`,
          });
        }
        await prisma.journalLine.createMany({ data: linesData });
      } else {
        // Tạo mới bút toán doanh thu
        const newEntry = await prisma.journalEntry.create({
          data: {
            entryDate: order.ngayDat ? new Date(order.ngayDat) : new Date(),
            referenceCode: orderCode,
            sourceModule: 'SALES',
            totalAmount: tongTien,
            description: `Doanh thu bán hàng đơn ${orderCode} - ${partnerName}`,
          }
        });

        const linesData = [
          {
            journalEntryId: newEntry.id,
            accountId: acc131.id,
            type: 'DEBIT',
            amount: tongTien,
            description: `Phải thu khách hàng đơn ${orderCode} - ${partnerName}`,
          },
          {
            journalEntryId: newEntry.id,
            accountId: acc511.id,
            type: 'CREDIT',
            amount: doanhThu,
            description: `Doanh thu bán hàng đơn ${orderCode}`,
          }
        ];
        if (vat > 0 && acc3331) {
          linesData.push({
            journalEntryId: newEntry.id,
            accountId: acc3331.id,
            type: 'CREDIT',
            amount: vat,
            description: `Thuế GTGT phải nộp đơn ${orderCode}`,
          });
        }
        await prisma.journalLine.createMany({ data: linesData });
      }

      // 2B. Nếu đơn hàng có thanh toán/đặt cọc (daThanhToan > 0):
      // Ghi nhận bút toán thu tiền:
      // Nợ TK 1121 (Tiền gửi ngân hàng) / Có TK 131 (Phải thu khách hàng)
      const payRefCode = `PT-${orderCode}`;
      const existingPaymentEntry = await prisma.journalEntry.findFirst({
        where: {
          sourceModule: 'SALES',
          referenceCode: payRefCode
        }
      });

      if (daThanhToan > 0 && acc1121) {
        if (existingPaymentEntry) {
          await prisma.journalLine.deleteMany({
            where: { journalEntryId: existingPaymentEntry.id }
          });
          await prisma.journalEntry.update({
            where: { id: existingPaymentEntry.id },
            data: {
              totalAmount: daThanhToan,
              description: `Thu tiền khách hàng đơn ${orderCode} - ${partnerName}`,
            }
          });
          await prisma.journalLine.createMany({
            data: [
              {
                journalEntryId: existingPaymentEntry.id,
                accountId: acc1121.id,
                type: 'DEBIT',
                amount: daThanhToan,
                description: `Tiền về tài khoản thu từ đơn ${orderCode}`,
              },
              {
                journalEntryId: existingPaymentEntry.id,
                accountId: acc131.id,
                type: 'CREDIT',
                amount: daThanhToan,
                description: `Giảm trừ công nợ đơn ${orderCode}`,
              }
            ]
          });
        } else {
          const newPayEntry = await prisma.journalEntry.create({
            data: {
              entryDate: new Date(),
              referenceCode: payRefCode,
              sourceModule: 'SALES',
              totalAmount: daThanhToan,
              description: `Thu tiền khách hàng đơn ${orderCode} - ${partnerName}`,
            }
          });
          await prisma.journalLine.createMany({
            data: [
              {
                journalEntryId: newPayEntry.id,
                accountId: acc1121.id,
                type: 'DEBIT',
                amount: daThanhToan,
                description: `Tiền về tài khoản thu từ đơn ${orderCode}`,
              },
              {
                journalEntryId: newPayEntry.id,
                accountId: acc131.id,
                type: 'CREDIT',
                amount: daThanhToan,
                description: `Giảm trừ công nợ đơn ${orderCode}`,
              }
            ]
          });
        }
      } else if (daThanhToan === 0 && existingPaymentEntry) {
        // Nếu trước đó có ghi nhận trả tiền nhưng giờ sửa thành 0: Xoá bút toán thu tiền
        await prisma.journalLine.deleteMany({
          where: { journalEntryId: existingPaymentEntry.id }
        });
        await prisma.journalEntry.delete({
          where: { id: existingPaymentEntry.id }
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ĐỒNG BỘ SANG BẢNG SQLITE PHỤC VỤ VIEW TÀI CHÍNH KẾ TOÁN (NẾU CÓ DB)
    // ──────────────────────────────────────────────────────────────────────────
    if (db) {
      try {
        await syncPrismaFinanceToAccountingTables(db);
      } catch (syncErr) {
        console.warn('[SyncOrderAccounting] Cảnh báo đồng bộ sang SQLite:', syncErr.message);
      }
    }

    return {
      success: true,
      orderCode,
      tongTien,
      daThanhToan,
      status: debtStatus
    };
  } catch (err) {
    console.error(`[SyncOrderAccounting] Lỗi đồng bộ đơn hàng ${orderIdentifier}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Đồng bộ toàn bộ các đơn hàng hiện có trong database vào bộ máy Kế toán & Công nợ
 */
export async function syncAllExistingOrdersToAccounting(db = null, prismaInstance = null) {
  const prisma = prismaInstance || new PrismaClient();
  const allOrders = await prisma.saleOrder.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`[SyncAllOrders] Bắt đầu đồng bộ ${allOrders.length} đơn hàng vào Kế toán & Công nợ...`);
  let successCount = 0;
  for (const o of allOrders) {
    const res = await syncOrderToAccountingAndDebt(o.id, null, prisma);
    if (res.success) successCount++;
  }

  if (db) {
    try {
      await syncPrismaFinanceToAccountingTables(db);
      console.log('✓ Đã đồng bộ toàn bộ bảng Kế toán - Tài chính SQLite thành công!');
    } catch (e) {
      console.warn('Cảnh báo đồng bộ SQLite:', e.message);
    }
  }

  return { total: allOrders.length, synced: successCount };
}
