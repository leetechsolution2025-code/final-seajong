import { PrismaClient } from '@prisma/client';

/**
 * Service tự động kiểm tra và đồng bộ trạng thái "Đã hoàn thành" cho các công việc trong hệ thống (Task)
 * Dựa trên tiến trình thực tế của:
 * - Lệnh sản xuất & đơn hàng (SaleOrder: completed, shipped, in_production, cancelled)
 * - Phiếu xuất kho cấp phát vật tư & gom hàng (LogisticsTicket: PACKED, COMPLETED)
 * - Yêu cầu mua hàng ROP (PurchaseRequest: da-lap-po, hoan-thanh, đã có PO)
 * - Đơn mua hàng (PurchaseOrder: completed, received, da-nhap-kho)
 */
export async function syncTasksAutoCompletion(prisma, targetTaskId = null) {
  try {
    const whereClause = targetTaskId
      ? { id: targetTaskId }
      : {
          status: { in: ['pending', 'in_progress', 'not_started'] },
        };

    const tasks = await prisma.task.findMany({
      where: whereClause,
      take: targetTaskId ? 1 : 250,
      orderBy: { createdAt: 'desc' },
    });

    if (!tasks || tasks.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    let updatedCount = 0;

    for (const task of tasks) {
      const title = task.title || '';
      let shouldComplete = false;
      let shouldCancel = false;

      // ── 1. KIỂM TRA ĐƠN HÀNG BÁN / LỆNH SẢN XUẤT (LSX, DBH, DHBL) ────────────
      const matchOrder = title.match(/(?:LSX|DBH|DHBL)-[0-9A-Za-z-]+/i);
      if (matchOrder) {
        const orderCode = matchOrder[0].trim();
        const order = await prisma.saleOrder.findFirst({
          where: { code: orderCode },
        });

        if (order) {
          const isOrderCompleted =
            ['completed', 'shipped', 'da-giao-hang', 'hoan_thanh'].includes(order.trangThai) ||
            order.ngayHoanThanhSanXuat !== null;

          const isOrderCancelled = ['cancelled', 'huy', 'rejected'].includes(order.trangThai);

          if (isOrderCompleted) {
            // Khi đơn hàng đã xuất kho / giao hàng / hoàn tất:
            // Cả lệnh sản xuất và lệnh xuất kho cấp phát vật tư hiển nhiên đã hoàn thành 100%
            shouldComplete = true;
          } else if (isOrderCancelled) {
            shouldCancel = true;
          } else if (title.includes('xuất kho') || title.includes('cấp phát vật tư')) {
            // Trường hợp đơn chưa giao nhưng lệnh xuất kho vật tư sản xuất đã gom đủ / xuất kho
            const ticket = await prisma.logisticsTicket.findFirst({
              where: {
                OR: [
                  { saleOrderId: order.id },
                  { code: { contains: order.code } },
                ],
                type: 'MATERIAL_PICKING',
              },
              include: { items: true },
            });

            if (ticket) {
              if (ticket.status === 'PACKED' || ticket.status === 'COMPLETED') {
                shouldComplete = true;
              } else if (
                ticket.items.length > 0 &&
                ticket.items.every((it) => it.pickedQty >= it.requestedQty)
              ) {
                shouldComplete = true;
              }
            }
          }
        }
      }

      // ── 2. KIỂM TRA YÊU CẦU MUA HÀNG BÙ TỒN (PR) ───────────────────────────
      if (!shouldComplete) {
        const matchPR = title.match(/PR-[0-9A-Za-z-]+/i);
        if (matchPR) {
          const prCode = matchPR[0].trim();
          const pr = await prisma.purchaseRequest.findFirst({
            where: { code: prCode },
            include: { purchaseOrders: true },
          });

          if (pr) {
            if (
              (pr.purchaseOrders && pr.purchaseOrders.length > 0) ||
              ['da-lap-po', 'hoan-thanh', 'completed', 'da-mua-hang', 'in_stock'].includes(pr.trangThai)
            ) {
              // Đã lập đơn mua hàng (PO) hoặc đã mua hàng thành công
              shouldComplete = true;
            }
          }
        }
      }

      // ── 3. KIỂM TRA GOM HÀNG VẬT TƯ / PHIẾU KHO ─────────────────────────────
      if (!shouldComplete && title.includes('Gom hàng:')) {
        const rawCodes = title
          .replace('Gom hàng:', '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (rawCodes.length > 0) {
          const tickets = await prisma.logisticsTicket.findMany({
            where: { code: { in: rawCodes } },
            include: { items: true },
          });

          if (
            tickets.length > 0 &&
            tickets.every(
              (tk) =>
                tk.status === 'PACKED' ||
                tk.status === 'COMPLETED' ||
                (tk.items.length > 0 && tk.items.every((i) => i.pickedQty >= i.requestedQty))
            )
          ) {
            shouldComplete = true;
          }
        }
      }

      // ── 4. KIỂM TRA ĐƠN MUA HÀNG (PO / DH) ───────────────────────────────────
      if (!shouldComplete) {
        const matchPO = title.match(/DH-[0-9-]+/i);
        if (matchPO) {
          const poCode = matchPO[0].trim();
          const po = await prisma.purchaseOrder.findFirst({
            where: { code: poCode },
          });

          if (po && ['completed', 'received', 'da-nhap-kho', 'hoan-thanh'].includes(po.trangThai)) {
            shouldComplete = true;
          }
        }
      }

      // ── 5. THỰC HIỆN CẬP NHẬT TRẠNG THÁI TASK ──────────────────────────────
      if (shouldComplete) {
        let newActualResult = task.actualResult;
        if (task.actualResult) {
          try {
            const parsed = JSON.parse(task.actualResult);
            if (parsed && typeof parsed === 'object') {
              parsed.status = 'completed';
              parsed.statusLabel = 'Đã hoàn thành';
              parsed.progress = 100;
              newActualResult = JSON.stringify(parsed);
            }
          } catch { /* ignore */ }
        }

        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'completed',
            actualResult: newActualResult,
          },
        }).catch((e) => console.warn(`[syncTasksAutoCompletion] Lỗi update task ${task.id}:`, e.message));

        updatedCount++;
      } else if (shouldCancel) {
        let newActualResult = task.actualResult;
        if (task.actualResult) {
          try {
            const parsed = JSON.parse(task.actualResult);
            if (parsed && typeof parsed === 'object') {
              parsed.status = 'cancelled';
              parsed.statusLabel = 'Huỷ bỏ';
              newActualResult = JSON.stringify(parsed);
            }
          } catch { /* ignore */ }
        }

        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'cancelled',
            actualResult: newActualResult,
          },
        }).catch((e) => console.warn(`[syncTasksAutoCompletion] Lỗi cancel task ${task.id}:`, e.message));

        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[syncTasksAutoCompletion] Đã tự động cập nhật ${updatedCount} công việc sang trạng thái hoàn thành/huỷ bỏ.`);
    }

    return { success: true, updatedCount };
  } catch (err) {
    console.error('[syncTasksAutoCompletion error]:', err);
    return { success: false, error: err.message };
  }
}
