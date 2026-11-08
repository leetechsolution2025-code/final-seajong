/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BỘ MÁY XỬ LÝ QUY TRÌNH BÁN HÀNG TẬP TRUNG SEAJONG (SalesEngine)
 * ══════════════════════════════════════════════════════════════════════════════
 * Quy trình khép kín 5 giai đoạn:
 *   Giai đoạn 1: Tiếp nhận & Khởi tạo đơn bán hàng (SO)
 *                - Kiểm tra hạn mức công nợ khách hàng
 *                - Đối soát tồn kho & Tự động giữ chỗ tồn kho (soLuongGiu)
 *                - Tự động sinh mã đơn hàng chuẩn DBH-YYYYMMDD-XX
 *                - Bắn thông báo nội bộ sang phòng Kế toán
 *   Giai đoạn 2: Kế toán phê duyệt đơn & Sinh chứng từ công nợ
 *                - Kế toán kiểm tra và duyệt đơn (keToanDuyet = approved)
 *                - Tự động ghi nhận Sổ công nợ phải thu (Debt: phai-thu)
 *                - Tự động thông báo sang Bộ phận Kho vận & Logistics
 *   Giai đoạn 3: Kho vận soạn hàng, đóng gói & Xuất kho giao nhận
 *                - Tạo phiếu xuất kho (sales-active)
 *                - Trừ tồn kho thực tế và giải phóng số lượng giữ chỗ (soLuongGiu)
 *                - Ghi nhận lịch sử dịch chuyển kho (StockMovement: XUAT_BAN_HANG)
 *                - Cập nhật mã vận đơn và thông báo cho Đại lý / Khách hàng
 *   Giai đoạn 4: Thu tiền, quyết toán & Cấn trừ công nợ
 *                - Cập nhật số tiền đã thanh toán (daThanhToan)
 *                - Cập nhật trạng thái sổ nợ (UNPAID -> PARTIAL -> PAID)
 *                - Đóng đơn hàng khi hoàn tất (completed)
 *   Giai đoạn 5: Tự động phân bổ số liệu báo cáo thời gian thực
 *                - Báo cáo Phòng Kinh doanh (Doanh số, Doanh thu, KPI tháng/năm)
 *                - Báo cáo Ban Giám Đốc (Doanh thu thuần, Đối chiếu Kế hoạch vs Thực tế)
 *                - Báo cáo Kế toán (Công nợ phải thu, Dòng tiền)
 *                - Báo cáo Cổng Đại lý (Lịch sử đơn, Tình trạng giao hàng, Hạn nợ)
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

// ── TIỆN ÍCH HỖ TRỢ (HELPERS) ──────────────────────────────────────────────────

/**
 * Lấy chuỗi ngày YYYYMMDD theo múi giờ Việt Nam (UTC+7)
 */
export function getVietnamDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ict = new Date(utc + 3600000 * 7);
  const yyyy = ict.getFullYear();
  const mm = String(ict.getMonth() + 1).padStart(2, '0');
  const dd = String(ict.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Tự động sinh mã đơn bán hàng kế tiếp: DBH-YYYYMMDD-XX
 */
export async function generateNextSaleOrderCode(prisma = prismaClient, date = new Date()) {
  const todayStr = getVietnamDateString(date);
  const prefix = `DBH-${todayStr}-`;
  const existingOrders = await prisma.saleOrder.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true }
  });
  let maxSTT = 0;
  for (const o of existingOrders) {
    if (o.code) {
      const parts = o.code.split('-');
      const sttVal = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(sttVal) && sttVal > maxSTT) maxSTT = sttVal;
    }
  }
  return `${prefix}${String(maxSTT + 1).padStart(2, '0')}`;
}

/**
 * Gửi thông báo nội bộ tới nhân viên một phòng ban cụ thể
 */
export async function notifyDepartment(prisma = prismaClient, {
  departmentCode,
  title,
  content,
  priority = 'normal',
  type = 'info',
  createdById = 'system'
}) {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        departmentCode,
        userId: { not: null }
      },
      select: { userId: true }
    });

    if (employees.length === 0) return [];

    const createdNotifications = [];
    for (const emp of employees) {
      if (!emp.userId) continue;
      const notif = await prisma.notification.create({
        data: {
          title,
          content,
          type,
          priority,
          audienceType: 'individual',
          audienceValue: emp.userId,
          createdById
        }
      });
      await prisma.notificationRecipient.upsert({
        where: { notificationId_userId: { notificationId: notif.id, userId: emp.userId } },
        update: {},
        create: { notificationId: notif.id, userId: emp.userId }
      });
      createdNotifications.push(notif);
    }
    return createdNotifications;
  } catch (err) {
    console.warn(`[SalesEngine] Không thể gửi thông báo tới phòng ${departmentCode}:`, err.message);
    return [];
  }
}

// ── BỘ MÁY XỬ LÝ BÁN HÀNG CHÍNH (SALES ENGINE CORE) ──────────────────────────

export const SalesEngine = {
  /**
   * 1. KHỞI TẠO ĐƠN BÁN HÀNG (SO)
   * Nhận dữ liệu từ SalesOrderTrackingPage / TaoDonHangModal
   */
  async createSaleOrder(prisma = prismaClient, input, actor = { id: 'system', name: 'Nhân viên Kinh doanh' }) {
    const {
      code,
      customerId,
      customerData,
      ngayDat = new Date(),
      ngayGiao = null,
      items = [],
      discount = 0,
      vat = 0,
      daThanhToan = 0,
      isChuyenKhoan = true,
      ghiChu = '',
      nguoiPhuTrach = actor.name || 'Phạm Quang Việt',
      nguoiNhan = '',
      soDienThoai = '',
      diaChiGiaoHang = '',
      nguoiDatHang = '',
      orderSource = 'system',
      quotationId = null,
    } = input;

    // A. Xử lý khách hàng (Nếu là khách vãng lai chưa có ID thì tạo mới)
    let finalCustomerId = customerId || null;
    let customerRecord = null;
    if (finalCustomerId) {
      customerRecord = await prisma.customer.findUnique({ where: { id: finalCustomerId } });
    }
    if (!customerRecord && customerData) {
      const guestName = customerData.name?.trim() || nguoiNhan?.trim() || 'Khách hàng mới';
      const guestPhone = customerData.dienThoai?.trim() || soDienThoai?.trim() || '';
      const guestAddress = customerData.address?.trim() || diaChiGiaoHang?.trim() || '';
      customerRecord = await prisma.customer.create({
        data: {
          name: guestName,
          dienThoai: guestPhone,
          address: guestAddress,
          nhom: customerData.nhom || 'ca-nhan',
          nguon: customerData.nguon || 'walk-in',
        }
      });
      finalCustomerId = customerRecord.id;
    }

    // B. Kiểm tra hạn mức công nợ (Credit Limit Check)
    let creditCheck = {
      hasCreditLimit: false,
      creditLimit: 0,
      currentDebt: 0,
      isExceeded: false,
      exceededAmount: 0
    };
    if (customerRecord && Number(customerRecord.hanMucNo) > 0) {
      const existingDebts = await prisma.debt.findMany({
        where: {
          customerId: customerRecord.id,
          OR: [{ type: 'RECEIVABLE' }, { type: 'phai-thu' }],
          status: { in: ['UNPAID', 'PARTIAL'] }
        }
      });
      const currentDebt = existingDebts.reduce((sum, d) => sum + ((d.amount || 0) - (d.paidAmount || 0)), 0);
      creditCheck = {
        hasCreditLimit: true,
        creditLimit: Number(customerRecord.hanMucNo),
        currentDebt,
        isExceeded: false,
        exceededAmount: 0
      };
    }

    // C. Chuẩn hóa & Sinh mã đơn hàng
    let finalCode = (code || '').trim();
    if (!finalCode || finalCode === 'Đang tải...' || finalCode.includes('Tự động')) {
      finalCode = await generateNextSaleOrderCode(prisma, ngayDat);
    }

    // D. Kiểm tra tồn kho và chuẩn bị sản phẩm
    let totalItemsAmount = 0;
    const resolvedItems = [];
    const shortageItems = [];

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      let invItem = null;
      if (it.inventoryItemId) {
        invItem = await prisma.inventoryItem.findUnique({ where: { id: it.inventoryItemId } });
      }
      if (!invItem && it.tenHang) {
        invItem = await prisma.inventoryItem.findFirst({
          where: { OR: [{ tenHang: it.tenHang }, { code: it.tenHang }] }
        });
      }

      const qty = Math.max(1, Number(it.soLuong) || 1);
      const unitPrice = Math.max(0, Number(it.donGia) || 0);
      const lineTotal = Number(it.thanhTien) || (qty * unitPrice);
      totalItemsAmount += lineTotal;

      const availableStock = invItem ? ((invItem.soLuong || 0) - (invItem.soLuongGiu || 0)) : 0;
      if (availableStock < qty) {
        shortageItems.push({
          tenHang: it.tenHang || (invItem?.tenHang || 'Sản phẩm'),
          required: qty,
          available: Math.max(0, availableStock),
          missing: qty - Math.max(0, availableStock)
        });
      }

      resolvedItems.push({
        inventoryItemId: invItem ? invItem.id : null,
        seajongProductId: it.seajongProductId || null,
        hinhAnh: it.hinhAnh || null,
        donViTinh: it.donViTinh || it.donVi || 'Bộ',
        tenHang: it.tenHang || invItem?.tenHang || 'Sản phẩm',
        soLuong: qty,
        donGia: unitPrice,
        thanhTien: lineTotal,
        dinhMucId: it.dinhMucId || null,
        ghiChu: typeof it.ghiChu === 'string' ? it.ghiChu : JSON.stringify(it.ghiChu || {}),
      });
    }

    // E. Tính toán tổng tiền sau thuế và chiết khấu
    const discountAmount = Number(discount) || 0;
    const vatAmount = Number(vat) || 0;
    const finalTotal = Math.max(0, totalItemsAmount - discountAmount + vatAmount);
    const paidAmount = Math.min(finalTotal, Math.max(0, Number(daThanhToan) || 0));

    // Cập nhật cảnh báo vượt hạn mức công nợ nếu áp dụng
    if (creditCheck.hasCreditLimit) {
      const remainingUnpaid = finalTotal - paidAmount;
      if (creditCheck.currentDebt + remainingUnpaid > creditCheck.creditLimit) {
        creditCheck.isExceeded = true;
        creditCheck.exceededAmount = (creditCheck.currentDebt + remainingUnpaid) - creditCheck.creditLimit;
      }
    }

    // F. Ghi nhận vào bảng SaleOrder và SaleOrderItem
    const hasShortage = shortageItems.length > 0;
    const saleOrder = await prisma.saleOrder.create({
      data: {
        code: finalCode,
        customerId: finalCustomerId,
        ngayDat: ngayDat ? new Date(ngayDat) : new Date(),
        ngayGiao: ngayGiao ? new Date(ngayGiao) : null,
        tongTien: finalTotal,
        daThanhToan: paidAmount,
        discount: discountAmount,
        vat: vatAmount,
        trangThai: 'active',
        keToanDuyet: 'pending',
        trangThaiKho: hasShortage ? 'out_of_stock' : 'in_stock',
        ghiChu: ghiChu || '',
        nguoiPhuTrach,
        nguoiNhan: nguoiNhan || customerRecord?.name || '',
        soDienThoai: soDienThoai || customerRecord?.dienThoai || '',
        diaChiGiaoHang: diaChiGiaoHang || customerRecord?.address || '',
        nguoiDatHang: nguoiDatHang || '',
        orderSource: orderSource || 'system',
        saleOrderItems: {
          create: resolvedItems.map(it => ({
            inventoryItemId: it.inventoryItemId,
            seajongProductId: it.seajongProductId,
            hinhAnh: it.hinhAnh,
            donViTinh: it.donViTinh,
            tenHang: it.tenHang,
            soLuong: it.soLuong,
            donGia: it.donGia,
            thanhTien: it.thanhTien,
            dinhMucId: it.dinhMucId,
            ghiChu: it.ghiChu,
          }))
        }
      },
      include: {
        customer: true,
        saleOrderItems: true
      }
    });

    // G. Giữ chỗ tồn kho thực tế (Hold Stock: tăng soLuongGiu)
    for (const item of resolvedItems) {
      if (!item.inventoryItemId) continue;
      let remaining = item.soLuong;
      const stocks = await prisma.inventoryStock.findMany({
        where: { inventoryItemId: item.inventoryItemId },
        orderBy: { soLuong: 'desc' }
      });
      for (const stock of stocks) {
        if (remaining <= 0) break;
        const avail = (stock.soLuong || 0) - (stock.soLuongGiu || 0);
        if (avail > 0) {
          const toHold = Math.min(avail, remaining);
          await prisma.inventoryStock.update({
            where: { id: stock.id },
            data: { soLuongGiu: { increment: toHold } }
          });
          remaining -= toHold;
        }
      }
      if (remaining > 0 && stocks.length > 0) {
        await prisma.inventoryStock.update({
          where: { id: stocks[0].id },
          data: { soLuongGiu: { increment: remaining } }
        });
      }
    }

    // H. Nếu có thanh toán đặt cọc trước -> Tạo thông báo thu tiền (PaymentNotification)
    let paymentNotification = null;
    if (paidAmount > 0) {
      const todayStr = getVietnamDateString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const ptCount = await prisma.paymentNotification.count({
        where: { createdAt: { gte: today } }
      });
      const seqStr = String(ptCount + 1).padStart(3, '0');
      paymentNotification = await prisma.paymentNotification.create({
        data: {
          code: `PT-${todayStr}-${seqStr}`,
          amount: paidAmount,
          paymentMethod: isChuyenKhoan === false ? 'cash' : 'transfer',
          status: 'pending',
          saleOrderId: saleOrder.id,
          customerId: saleOrder.customerId || null,
        }
      });
    }

    // I. Đồng bộ trạng thái nếu đơn xuất phát từ Báo giá
    if (quotationId) {
      await prisma.quotation.update({
        where: { id: quotationId },
        data: { trangThai: 'won' }
      }).catch(() => null);
    }

    // J. Bắn thông báo nội bộ tới Phòng Kế toán
    const customerDisplayName = customerRecord?.name || 'Khách hàng';
    const creditWarningText = creditCheck.isExceeded
      ? ` ⚠️ Cảnh báo: Khách đã vượt hạn mức nợ ${creditCheck.exceededAmount.toLocaleString('vi-VN')} đ!`
      : '';
    await notifyDepartment(prisma, {
      departmentCode: 'finance',
      title: `🛒 Đơn bán hàng mới cần duyệt: ${finalCode}`,
      content: `Đơn bán hàng ${finalCode} của ${customerDisplayName} trị giá ${finalTotal.toLocaleString('vi-VN')} đ đã được tạo và đang chờ kế toán phê duyệt.${creditWarningText}`,
      priority: creditCheck.isExceeded ? 'urgent' : 'high',
      type: 'warning',
      createdById: actor.id || 'system'
    });

    return {
      success: true,
      message: `Đơn bán hàng ${finalCode} đã được khởi tạo thành công.`,
      order: saleOrder,
      creditCheck,
      stockStatus: {
        hasShortage,
        shortageItems
      },
      paymentNotification
    };
  },

  /**
   * 2. KẾ TOÁN PHÊ DUYỆT ĐƠN HÀNG (APPROVE)
   * Tự động sinh công nợ phải thu (Debt: phai-thu) và thông báo sang Kho vận
   */
  async approveSaleOrder(prisma = prismaClient, { orderId, approverId = 'system', note = '' }) {
    const existing = await prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: { customer: true, saleOrderItems: true }
    });

    if (!existing) {
      throw new Error(`Không tìm thấy đơn hàng với mã ID: ${orderId}`);
    }

    if (existing.keToanDuyet === 'approved') {
      return { success: true, message: 'Đơn hàng đã được kế toán duyệt trước đó.', order: existing };
    }

    // A. Cập nhật trạng thái duyệt trên SaleOrder
    const updatedOrder = await prisma.saleOrder.update({
      where: { id: orderId },
      data: {
        keToanDuyet: 'approved',
        trangThai: existing.trangThai === 'draft' ? 'active' : existing.trangThai,
        updatedAt: new Date(),
      },
      include: { customer: true, saleOrderItems: true }
    });

    // B. Tự động sinh sổ công nợ phải thu (Debt) nếu còn số tiền chưa thanh toán
    const unpaidAmount = Math.max(0, (existing.tongTien || 0) - (existing.daThanhToan || 0));
    let debtRecord = null;
    if (unpaidAmount > 0) {
      const doiTuong = existing.customer?.name
        ? `${existing.customer.name}${existing.customer.dienThoai ? ' – ' + existing.customer.dienThoai : ''}`
        : `Khách lẻ – Đơn ${existing.code || existing.id}`;

      debtRecord = await prisma.debt.create({
        data: {
          type: 'phai-thu',
          partnerName: doiTuong,
          customerId: existing.customerId || null,
          amount: existing.tongTien,
          paidAmount: existing.daThanhToan,
          status: existing.daThanhToan === 0 ? 'UNPAID' : 'PARTIAL',
          dueDate: existing.ngayGiao ? new Date(existing.ngayGiao) : new Date(Date.now() + 30 * 86400000),
          referenceId: existing.code || existing.id,
          description: `Công nợ tự động phát sinh từ đơn bán hàng ${existing.code || existing.id}${note ? ' - ' + note : ''}`,
        }
      });
    }

    // C. Duyệt phiếu thông báo thu tiền ban đầu (nếu có)
    await prisma.paymentNotification.updateMany({
      where: { saleOrderId: existing.id, status: 'pending' },
      data: { status: 'approved' }
    }).catch(() => null);

    // D. Bắn thông báo sang Bộ phận Kho vận & Logistics để chuẩn bị xuất hàng
    await notifyDepartment(prisma, {
      departmentCode: 'logistics',
      title: `📦 Đơn hàng sẵn sàng xuất kho: ${existing.code}`,
      content: `Kế toán đã phê duyệt đơn hàng ${existing.code} của ${existing.customer?.name || 'Khách hàng'}. Vui lòng tạo phiếu xuất kho và chuẩn bị đóng gói.`,
      priority: 'high',
      type: 'info',
      createdById: approverId
    });

    return {
      success: true,
      message: `Kế toán đã duyệt thành công đơn hàng ${existing.code}.`,
      order: updatedOrder,
      debtRecord,
    };
  },

  /**
   * 3. KẾ TOÁN TỪ CHỐI ĐƠN HÀNG (REJECT)
   * Hoàn trả tồn kho giữ chỗ (soLuongGiu) và thông báo cho phòng Kinh doanh
   */
  async rejectSaleOrder(prisma = prismaClient, { orderId, reason = 'Kế toán từ chối duyệt', actorId = 'system' }) {
    const existing = await prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: { saleOrderItems: true }
    });

    if (!existing) {
      throw new Error(`Không tìm thấy đơn hàng với mã ID: ${orderId}`);
    }

    // A. Giải phóng tồn kho giữ chỗ (soLuongGiu)
    for (const item of existing.saleOrderItems) {
      if (!item.inventoryItemId) continue;
      let remainingToRelease = item.soLuong;
      const stocks = await prisma.inventoryStock.findMany({
        where: { inventoryItemId: item.inventoryItemId, soLuongGiu: { gt: 0 } },
        orderBy: { soLuongGiu: 'desc' }
      });
      for (const stock of stocks) {
        if (remainingToRelease <= 0) break;
        const release = Math.min(stock.soLuongGiu, remainingToRelease);
        await prisma.inventoryStock.update({
          where: { id: stock.id },
          data: { soLuongGiu: { decrement: release } }
        });
        remainingToRelease -= release;
      }
    }

    // B. Cập nhật trạng thái đơn
    const updated = await prisma.saleOrder.update({
      where: { id: orderId },
      data: {
        keToanDuyet: 'rejected',
        trangThai: 'cancelled',
        ghiChu: `${existing.ghiChu || ''}\n[Lý do từ chối]: ${reason}`,
      }
    });

    // C. Bắn thông báo lại cho phòng Kinh doanh
    await notifyDepartment(prisma, {
      departmentCode: 'sales',
      title: `❌ Đơn hàng ${existing.code} bị kế toán từ chối`,
      content: `Đơn bán hàng ${existing.code} đã bị từ chối duyệt với lý do: ${reason}`,
      priority: 'high',
      type: 'warning',
      createdById: actorId
    });

    return {
      success: true,
      message: `Đã từ chối đơn hàng ${existing.code} và giải phóng tồn kho giữ chỗ.`,
      order: updated
    };
  },

  /**
   * 4. KHO VẬN XUẤT KHO & GIAO HÀNG (DISPATCH)
   * Trừ tồn kho thực tế, giải phóng giữ chỗ và ghi nhận StockMovement
   */
  async dispatchSaleOrder(prisma = prismaClient, {
    orderId,
    warehouseId = null,
    dispatcherId = 'Thủ kho',
    trackingCode = '',
    note = ''
  }) {
    const existing = await prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: { customer: true, saleOrderItems: true }
    });

    if (!existing) {
      throw new Error(`Không tìm thấy đơn hàng với mã ID: ${orderId}`);
    }

    if (existing.keToanDuyet !== 'approved') {
      throw new Error(`Đơn hàng ${existing.code} chưa được Kế toán duyệt. Không thể xuất kho!`);
    }

    // A. Trừ số lượng tồn kho thực tế & giải phóng giữ chỗ cho từng sản phẩm
    const stockMovements = [];
    for (const item of existing.saleOrderItems) {
      if (!item.inventoryItemId) continue;

      const stocks = await prisma.inventoryStock.findMany({
        where: {
          inventoryItemId: item.inventoryItemId,
          ...(warehouseId ? { warehouseId } : {})
        },
        orderBy: { soLuong: 'desc' }
      });

      if (stocks.length > 0) {
        const targetStock = stocks[0];
        const oldQty = targetStock.soLuong || 0;
        const newQty = Math.max(0, oldQty - item.soLuong);
        const newHold = Math.max(0, (targetStock.soLuongGiu || 0) - item.soLuong);

        await prisma.inventoryStock.update({
          where: { id: targetStock.id },
          data: {
            soLuong: newQty,
            soLuongGiu: newHold
          }
        });

        // Cập nhật tổng tồn trên InventoryItem
        await prisma.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: {
            soLuong: { decrement: item.soLuong }
          }
        }).catch(() => null);

        // Tạo bản ghi lịch sử dịch chuyển kho
        const movement = await prisma.stockMovement.create({
          data: {
            inventoryItemId: item.inventoryItemId,
            fromWarehouseId: targetStock.warehouseId,
            type: 'XUAT_BAN_HANG',
            soLuong: item.soLuong,
            soLuongTruoc: oldQty,
            soLuongSau: newQty,
            donGia: item.donGia,
            soChungTu: existing.code || existing.id,
            lyDo: `Xuất kho đơn bán hàng ${existing.code || existing.id}${trackingCode ? ' - Vận đơn: ' + trackingCode : ''}`,
            nguoiThucHien: dispatcherId,
          }
        });
        stockMovements.push(movement);
      }
    }

    // B. Cập nhật trạng thái đơn hàng
    const updatedOrder = await prisma.saleOrder.update({
      where: { id: orderId },
      data: {
        trangThaiKho: 'exported',
        trangThai: 'delivering',
        ghiChu: `${existing.ghiChu || ''}${trackingCode ? `\n[Mã vận đơn]: ${trackingCode}` : ''}${note ? `\n[Ghi chú xuất kho]: ${note}` : ''}`,
      }
    });

    // C. Bắn thông báo cho bộ phận Bán hàng
    await notifyDepartment(prisma, {
      departmentCode: 'sales',
      title: `🚚 Đơn hàng ${existing.code} đã xuất kho giao nhận`,
      content: `Kho đã hoàn tất đóng gói và xuất kho đơn hàng ${existing.code}${trackingCode ? ` với mã vận đơn: ${trackingCode}` : ''}.`,
      priority: 'normal',
      type: 'success',
      createdById: dispatcherId
    });

    return {
      success: true,
      message: `Đơn hàng ${existing.code} đã được xuất kho thành công.`,
      order: updatedOrder,
      stockMovements
    };
  },

  /**
   * 5. GHI NHẬN THANH TOÁN (THU TIỀN & CẤN TRỪ CÔNG NỢ)
   */
  async recordPayment(prisma = prismaClient, {
    orderId,
    amount = 0,
    paymentMethod = 'transfer',
    referenceCode = '',
    actor = 'Kế toán thanh toán'
  }) {
    const existing = await prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (!existing) {
      throw new Error(`Không tìm thấy đơn hàng với mã ID: ${orderId}`);
    }

    const payAmt = Number(amount) || 0;
    if (payAmt <= 0) {
      throw new Error('Số tiền thanh toán phải lớn hơn 0');
    }

    const newPaid = Math.min(existing.tongTien, (existing.daThanhToan || 0) + payAmt);
    const isFullyPaid = newPaid >= existing.tongTien;

    // A. Cập nhật SaleOrder
    const updatedOrder = await prisma.saleOrder.update({
      where: { id: orderId },
      data: {
        daThanhToan: newPaid,
        trangThai: isFullyPaid && existing.trangThaiKho === 'exported' ? 'completed' : existing.trangThai
      }
    });

    // B. Cập nhật bản ghi công nợ (Debt)
    const matchingDebts = await prisma.debt.findMany({
      where: {
        OR: [
          { referenceId: existing.code },
          { referenceId: existing.id }
        ]
      }
    });

    for (const d of matchingDebts) {
      const updatedPaidAmount = Math.min(d.amount, (d.paidAmount || 0) + payAmt);
      const newStatus = updatedPaidAmount >= d.amount ? 'PAID' : 'PARTIAL';
      await prisma.debt.update({
        where: { id: d.id },
        data: {
          paidAmount: updatedPaidAmount,
          status: newStatus
        }
      });
    }

    // C. Tạo thông báo thanh toán đã xác nhận
    const todayStr = getVietnamDateString();
    await prisma.paymentNotification.create({
      data: {
        code: `PT-${todayStr}-${Math.floor(100 + Math.random() * 900)}`,
        amount: payAmt,
        paymentMethod: paymentMethod === 'cash' ? 'cash' : 'transfer',
        status: 'approved',
        saleOrderId: existing.id,
        customerId: existing.customerId || null,
      }
    });

    return {
      success: true,
      message: `Đã ghi nhận thanh toán ${payAmt.toLocaleString('vi-VN')} đ cho đơn hàng ${existing.code}.`,
      order: updatedOrder,
      isFullyPaid
    };
  },

  /**
   * 6. HỦY ĐƠN HÀNG (CANCEL ORDER)
   * Hoàn trả lại toàn bộ tồn kho giữ chỗ và hủy công nợ
   */
  async cancelSaleOrder(prisma = prismaClient, { orderId, reason = 'Khách yêu cầu hủy', actorId = 'system' }) {
    const existing = await prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: { saleOrderItems: true }
    });

    if (!existing) {
      throw new Error(`Không tìm thấy đơn hàng với mã ID: ${orderId}`);
    }

    if (existing.trangThaiKho === 'exported') {
      throw new Error(`Đơn hàng ${existing.code} đã được xuất kho, không thể hủy đơn trực tiếp. Vui lòng tạo phiếu Nhập hàng trả lại!`);
    }

    // A. Giải phóng toàn bộ tồn kho giữ chỗ (soLuongGiu)
    for (const item of existing.saleOrderItems) {
      if (!item.inventoryItemId) continue;
      let remaining = item.soLuong;
      const stocks = await prisma.inventoryStock.findMany({
        where: { inventoryItemId: item.inventoryItemId, soLuongGiu: { gt: 0 } },
        orderBy: { soLuongGiu: 'desc' }
      });
      for (const stock of stocks) {
        if (remaining <= 0) break;
        const release = Math.min(stock.soLuongGiu, remaining);
        await prisma.inventoryStock.update({
          where: { id: stock.id },
          data: { soLuongGiu: { decrement: release } }
        });
        remaining -= release;
      }
    }

    // B. Xóa / Cập nhật công nợ tương ứng
    await prisma.debt.updateMany({
      where: {
        OR: [
          { referenceId: existing.code },
          { referenceId: existing.id }
        ]
      },
      data: { status: 'CANCELLED' }
    }).catch(() => null);

    // C. Cập nhật trạng thái đơn hàng
    const cancelledOrder = await prisma.saleOrder.update({
      where: { id: orderId },
      data: {
        trangThai: 'cancelled',
        ghiChu: `${existing.ghiChu || ''}\n[Lý do hủy đơn]: ${reason}`
      }
    });

    return {
      success: true,
      message: `Đã hủy thành công đơn hàng ${existing.code} và hoàn trả toàn bộ tồn kho giữ chỗ.`,
      order: cancelledOrder
    };
  },

  /**
   * 7. TRA CỨU TIẾN TRÌNH 360 ĐỘ CỦA ĐƠN HÀNG (WORKFLOW STATUS TRACKER)
   * Trả về toàn cảnh tiến độ của đơn hàng qua các phân hệ: Sales, Kế toán, Kho vận, Portal
   */
  async getSalesOrderWorkflowStatus(prisma = prismaClient, orderId) {
    const order = await prisma.saleOrder.findFirst({
      where: { OR: [{ id: orderId }, { code: orderId }] },
      include: {
        customer: true,
        saleOrderItems: {
          include: { inventoryItem: true }
        },
        paymentNotifications: true
      }
    });

    if (!order) {
      throw new Error(`Không tìm thấy đơn hàng: ${orderId}`);
    }

    // Tra cứu công nợ
    const debts = await prisma.debt.findMany({
      where: {
        OR: [
          { referenceId: order.code },
          { referenceId: order.id }
        ]
      }
    });

    // Tra cứu lịch sử xuất kho
    const movements = await prisma.stockMovement.findMany({
      where: {
        soChungTu: { in: [order.code, order.id].filter(Boolean) }
      }
    });

    // Xây dựng tiến trình chuẩn
    const milestones = [
      {
        step: 1,
        title: 'Khởi tạo đơn hàng & Giữ tồn kho',
        status: 'COMPLETED',
        time: order.createdAt,
        details: `Đơn bán hàng ${order.code} đã tạo với ${order.saleOrderItems.length} mục sản phẩm. Tồn kho đã được giữ chỗ an toàn.`
      },
      {
        step: 2,
        title: 'Kế toán phê duyệt & Sổ công nợ',
        status: order.keToanDuyet === 'approved' ? 'COMPLETED' : order.keToanDuyet === 'rejected' ? 'REJECTED' : 'PENDING',
        time: order.updatedAt,
        details: order.keToanDuyet === 'approved'
          ? `Đã được Kế toán phê duyệt.${debts.length > 0 ? ` Sổ nợ phải thu ghi nhận ${debts[0].amount.toLocaleString('vi-VN')} đ.` : ''}`
          : order.keToanDuyet === 'rejected'
            ? 'Đơn hàng bị Kế toán từ chối duyệt.'
            : 'Đang chờ Kế toán đối soát và phê duyệt.'
      },
      {
        step: 3,
        title: 'Kho vận soạn hàng & Xuất kho',
        status: order.trangThaiKho === 'exported' ? 'COMPLETED' : order.keToanDuyet === 'approved' ? 'IN_PROGRESS' : 'WAITING',
        time: movements.length > 0 ? movements[0].createdAt : null,
        details: order.trangThaiKho === 'exported'
          ? `Đã xuất kho ${movements.length} đợt dịch chuyển. Hàng đang trên đường giao nhận.`
          : order.keToanDuyet === 'approved'
            ? 'Đang chuẩn bị hàng tại kho theo phiếu xuất sales-active.'
            : 'Đang đợi Kế toán duyệt trước khi đóng gói.'
      },
      {
        step: 4,
        title: 'Quyết toán & Cấn trừ công nợ',
        status: order.daThanhToan >= order.tongTien ? 'COMPLETED' : order.daThanhToan > 0 ? 'PARTIAL' : 'PENDING',
        details: `Đã thu: ${order.daThanhToan.toLocaleString('vi-VN')} đ / Tổng đơn: ${order.tongTien.toLocaleString('vi-VN')} đ (Còn nợ: ${(order.tongTien - order.daThanhToan).toLocaleString('vi-VN')} đ).`
      }
    ];

    return {
      order,
      milestones,
      debts,
      stockMovements: movements,
      reportingImpact: {
        salesModule: 'Cộng dồn vào Doanh số & KPI Phòng Kinh doanh tháng ' + (order.ngayDat ? order.ngayDat.getMonth() + 1 : 1),
        bomModule: 'Phản ánh trực tiếp lên Tổng doanh thu & Chỉ số điều hành Ban Giám Đốc',
        financeModule: `Phản ánh vào Sổ nợ phải thu (${debts.length > 0 ? debts[0].status : 'Chưa duyệt'})`,
        dealerPortal: 'Đại lý tra cứu được tiến độ giao nhận và số dư công nợ tại Cổng Đại lý'
      }
    };
  }
};

// ── EXPRESS ROUTER CHO SALES ENGINE ──────────────────────────────────────────

export const salesEngineRouter = express.Router();

// 1. POST /api/sales-engine/orders – Khởi tạo đơn bán hàng
salesEngineRouter.post('/api/sales-engine/orders', async (req, res) => {
  try {
    const actor = {
      id: req.user?.id || 'system',
      name: req.user?.name || req.body?.nguoiPhuTrach || 'Phạm Quang Việt'
    };
    const result = await SalesEngine.createSaleOrder(prismaClient, req.body, actor);
    res.status(201).json(result);
  } catch (err) {
    console.error('Lỗi SalesEngine.createSaleOrder:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2. POST /api/sales-engine/orders/:id/approve – Kế toán duyệt đơn
salesEngineRouter.post('/api/sales-engine/orders/:id/approve', async (req, res) => {
  try {
    const approverId = req.user?.id || 'system';
    const note = req.body?.note || '';
    const result = await SalesEngine.approveSaleOrder(prismaClient, {
      orderId: req.params.id,
      approverId,
      note
    });
    res.json(result);
  } catch (err) {
    console.error('Lỗi SalesEngine.approveSaleOrder:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. POST /api/sales-engine/orders/:id/reject – Kế toán từ chối đơn
salesEngineRouter.post('/api/sales-engine/orders/:id/reject', async (req, res) => {
  try {
    const actorId = req.user?.id || 'system';
    const reason = req.body?.reason || 'Kế toán từ chối duyệt';
    const result = await SalesEngine.rejectSaleOrder(prismaClient, {
      orderId: req.params.id,
      reason,
      actorId
    });
    res.json(result);
  } catch (err) {
    console.error('Lỗi SalesEngine.rejectSaleOrder:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. POST /api/sales-engine/orders/:id/dispatch – Xuất kho giao hàng
salesEngineRouter.post('/api/sales-engine/orders/:id/dispatch', async (req, res) => {
  try {
    const dispatcherId = req.user?.name || req.body?.dispatcherId || 'Thủ kho';
    const result = await SalesEngine.dispatchSaleOrder(prismaClient, {
      orderId: req.params.id,
      warehouseId: req.body?.warehouseId || null,
      dispatcherId,
      trackingCode: req.body?.trackingCode || '',
      note: req.body?.note || ''
    });
    res.json(result);
  } catch (err) {
    console.error('Lỗi SalesEngine.dispatchSaleOrder:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. POST /api/sales-engine/orders/:id/payment – Ghi nhận thanh toán
salesEngineRouter.post('/api/sales-engine/orders/:id/payment', async (req, res) => {
  try {
    const actor = req.user?.name || 'Kế toán thanh toán';
    const result = await SalesEngine.recordPayment(prismaClient, {
      orderId: req.params.id,
      amount: req.body?.amount || 0,
      paymentMethod: req.body?.paymentMethod || 'transfer',
      referenceCode: req.body?.referenceCode || '',
      actor
    });
    res.json(result);
  } catch (err) {
    console.error('Lỗi SalesEngine.recordPayment:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. POST /api/sales-engine/orders/:id/cancel – Hủy đơn hàng
salesEngineRouter.post('/api/sales-engine/orders/:id/cancel', async (req, res) => {
  try {
    const actorId = req.user?.id || 'system';
    const reason = req.body?.reason || 'Hủy đơn hàng';
    const result = await SalesEngine.cancelSaleOrder(prismaClient, {
      orderId: req.params.id,
      reason,
      actorId
    });
    res.json(result);
  } catch (err) {
    console.error('Lỗi SalesEngine.cancelSaleOrder:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. GET /api/sales-engine/orders/:id/workflow – Tra cứu tiến trình 360 độ
salesEngineRouter.get('/api/sales-engine/orders/:id/workflow', async (req, res) => {
  try {
    const result = await SalesEngine.getSalesOrderWorkflowStatus(prismaClient, req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Lỗi SalesEngine.getSalesOrderWorkflowStatus:', err);
    res.status(404).json({ success: false, error: err.message });
  }
});

export default salesEngineRouter;

