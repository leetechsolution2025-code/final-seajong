/**
 * Sinh mã chứng từ theo chuẩn:
 *   PREFIX-YYYYMMDD-TTTT-RRRR
 *   TTTT = 4 chữ số cuối của Date.now() (milliseconds timestamp)
 *   RRRR = 4 ký tự ngẫu nhiên (chữ HOA, bỏ I/O dễ nhầm)
 *
 * Ví dụ: PX-20260320-1243-ABED | PN-20260320-8047-KZMQ | KK-20260320-3591-URTW
 *
 * @param prefix Tiền tố phiếu, ví dụ "PN", "PX", "LC", "KK", "DBH"
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
