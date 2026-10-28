/**
 * Sinh mã chứng từ theo chuẩn:
 *   PREFIX-YYYYMMDD-TTTT-RRRR
 *   TTTT = 4 chữ số cuối của Date.now() (milliseconds timestamp)
 *   RRRR = 4 ký tự ngẫu nhiên (chữ HOA, bỏ I/O dễ nhầm)
 *
 * Ví dụ: PX-20260320-1243-ABED | PN-20260320-8047-KZMQ | KK-20260320-3591-URTW
 *
 * @param prefix Tiền tố phiếu, ví dụ "PN", "PX", "LC", "KK"
 */
export function genDocCode(prefix: string): string {
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // bỏ I, O dễ nhầm
  const d     = new Date();

  const date =
    `${d.getFullYear()}` +
    `${String(d.getMonth() + 1).padStart(2, "0")}` +
    `${String(d.getDate()).padStart(2, "0")}`;

  // 4 chữ số cuối của timestamp (milliseconds)
  const ts   = String(Date.now()).slice(-4);

  // 4 ký tự ngẫu nhiên chữ HOA
  const rand = Array.from({ length: 4 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");

  return `${prefix}-${date}-${ts}-${rand}`;
}

/**
 * Sinh mã phiếu QC chuẩn:
 *   QC-YYYYmmdd-STT (ví dụ: QC-20260921-01)
 *   STT tăng dần từ 01, 02..., reset về 01 cho một ngày mới
 *
 * @param date Ngày tạo phiếu
 * @param prismaClient Prisma client hoặc transaction client
 */
export async function getNextQcCode(
  date: Date = new Date(),
  prismaClient?: any
): Promise<string> {
  if (!prismaClient) {
    return genDocCode("QC");
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `QC-${dateStr}-`;

  const existing = await prismaClient.qualityInspection.findMany({
    where: {
      code: {
        startsWith: prefix,
      },
    },
    select: {
      code: true,
    },
  });

  let maxSeq = 0;
  for (const item of existing) {
    if (item.code && item.code.startsWith(prefix)) {
      const suffix = item.code.slice(prefix.length);
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(2, "0");
  return `${prefix}${nextSeq}`;
}

