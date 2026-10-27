/**
 * Tiện ích quản lý và chuẩn hoá kỳ báo cáo tài chính - kế toán
 * Chuẩn mực Thông tư 200/2014/TT-BTC
 * 
 * Tự động đồng bộ theo năm hiện hành (Dynamic Current Year), không hardcode năm cố định.
 */

export interface ReportingPeriodOption {
  value: string;
  label: string;
  group?: 'month' | 'quarter' | 'year';
}

/**
 * Lấy năm hiện hành của hệ thống
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Lấy tháng hiện hành của hệ thống (1 - 12)
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

/**
 * Lấy mã kỳ báo cáo mặc định theo tháng hiện hành (dạng YYYY-MM)
 */
export function getDefaultPeriod(baseDate: Date = new Date()): string {
  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Tạo danh sách các kỳ báo cáo chuẩn mực cho kế toán doanh nghiệp
 * Bao gồm:
 * 1. Các tháng trong năm hiện hành (Tháng 12 -> Tháng 01)
 * 2. Các quý trong năm hiện hành (Quý 4 -> Quý 1)
 * 3. Cả năm hiện hành
 * 4. Cả năm liền trước (phục vụ đối chiếu, so sánh số liệu luỹ kế)
 */
export function getReportingPeriods(baseDate: Date = new Date()): ReportingPeriodOption[] {
  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth() + 1;
  const currentQuarter = Math.floor((currentMonth - 1) / 3) + 1;

  const periods: ReportingPeriodOption[] = [];

  // 1. Nhóm các tháng trong năm hiện hành (giảm dần từ tháng 12 về tháng 01)
  for (let m = 12; m >= 1; m--) {
    const mm = String(m).padStart(2, '0');
    const isCurrent = m === currentMonth;
    periods.push({
      value: `${currentYear}-${mm}`,
      label: `Tháng ${mm}/${currentYear}${isCurrent ? ' (Kỳ hiện tại)' : ''}`,
      group: 'month',
    });
  }

  // 2. Nhóm các quý trong năm hiện hành (Quý 4 -> Quý 1)
  for (let q = 4; q >= 1; q--) {
    const isCurrent = q === currentQuarter;
    periods.push({
      value: `${currentYear}-Q${q}`,
      label: `Quý ${q}/${currentYear}${isCurrent ? ' (Hiện tại)' : ''}`,
      group: 'quarter',
    });
  }

  // 3. Cả năm tài chính hiện hành
  periods.push({
    value: `${currentYear}`,
    label: `Cả năm ${currentYear}`,
    group: 'year',
  });

  // 4. Năm tài chính liền trước
  periods.push({
    value: `${currentYear - 1}`,
    label: `Cả năm ${currentYear - 1}`,
    group: 'year',
  });

  return periods;
}

/**
 * Định dạng tên kỳ báo cáo hiển thị đầy đủ, lịch sự bằng tiếng Việt
 * Ví dụ:
 * - '2026-10' => 'Tháng 10 năm 2026'
 * - '2026-Q3' => 'Quý 3 năm 2026'
 * - '2026'    => 'Năm 2026'
 */
export function formatPeriodLabel(period: string | null | undefined): string {
  if (!period) return '';

  // 1. Dạng Quý: YYYY-Q1 .. YYYY-Q4
  const qMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (qMatch) {
    return `Quý ${qMatch[2]} năm ${qMatch[1]}`;
  }

  // 2. Dạng Năm: YYYY (4 chữ số)
  const yMatch = period.match(/^(\d{4})$/);
  if (yMatch) {
    return `Năm ${yMatch[1]}`;
  }

  // 3. Dạng Tháng: YYYY-MM
  const mMatch = period.match(/^(\d{4})-(\d{1,2})$/);
  if (mMatch) {
    const mm = mMatch[2].padStart(2, '0');
    return `Tháng ${mm} năm ${mMatch[1]}`;
  }

  return `Kỳ ${period}`;
}

/**
 * Kiểm tra một ngày cụ thể (YYYY-MM-DD hoặc ISO date string) có thuộc kỳ báo cáo được chọn hay không
 */
export function isDateInPeriod(dateStr: string | null | undefined, period: string | null | undefined): boolean {
  if (!dateStr || !period) return true;

  const trimmedDate = String(dateStr).trim();

  // 1. Kỳ dạng Quý: YYYY-Q1 .. YYYY-Q4
  const qMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (qMatch) {
    const targetYear = qMatch[1];
    const quarter = Number(qMatch[2]);
    if (!trimmedDate.startsWith(targetYear)) return false;

    const monthStr = trimmedDate.substring(5, 7);
    const m = Number(monthStr);
    const itemQuarter = Math.floor((m - 1) / 3) + 1;
    return itemQuarter === quarter;
  }

  // 2. Kỳ dạng Cả năm: YYYY
  const yMatch = period.match(/^(\d{4})$/);
  if (yMatch) {
    return trimmedDate.startsWith(yMatch[1]);
  }

  // 3. Kỳ dạng Tháng: YYYY-MM
  const mMatch = period.match(/^(\d{4})-(\d{1,2})$/);
  if (mMatch) {
    const formattedPrefix = `${mMatch[1]}-${mMatch[2].padStart(2, '0')}`;
    return trimmedDate.startsWith(formattedPrefix);
  }

  return trimmedDate.startsWith(period);
}
