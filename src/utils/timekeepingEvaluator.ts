/**
 * Module đánh giá và kiểm tra giờ vào, giờ ra chấm công theo Nội quy lao động Seajong
 */

export interface PunchCheckResult {
  isLate: boolean;
  lateMinutes: number;
  isEarly: boolean;
  earlyMinutes: number;
  isOt: boolean;
  otHours: number;
  workCredit: number;
  deductCredit: number;
  violationLevel: 'none' | 'grace' | 'light' | 'medium' | 'heavy' | 'absent';
  toastType: 'success' | 'warning' | 'info';
  toastTitle: string;
  toastMessage: string;
}

/**
 * Chuyển đổi chuỗi giờ phút 'HH:mm' hoặc 'HH:mm:ss' thành số phút trong ngày
 */
export const parseTimeToMinutes = (timeStr?: string, fallbackMins: number = 0): number => {
  if (!timeStr || timeStr === '--:--') return fallbackMins;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return fallbackMins;
  return h * 60 + m;
};

/**
 * Hàm kiểm tra giờ vào (Punch In)
 * So sánh giờ quẹt với giờ bắt đầu ca quy định (VD: 08:00 hoặc 13:30)
 */
export const evaluatePunchIn = (
  punchInTime: string,
  shiftStartTime: string,
  shiftLabel: string = 'ca làm việc'
): {
  isLate: boolean;
  lateMinutes: number;
  violationLevel: 'none' | 'grace' | 'medium' | 'heavy' | 'absent';
  toastType: 'success' | 'warning';
  toastTitle: string;
  toastMessage: string;
} => {
  const startMins = parseTimeToMinutes(shiftStartTime, 8 * 60);
  const inMins = parseTimeToMinutes(punchInTime, startMins);

  if (inMins <= startMins) {
    const earlyArrival = startMins - inMins;
    return {
      isLate: false,
      lateMinutes: 0,
      violationLevel: 'none',
      toastType: 'success',
      toastTitle: `Vào ${shiftLabel} đúng giờ`,
      toastMessage: earlyArrival > 0
        ? `Giờ vào: ${punchInTime} (đến sớm ${earlyArrival} phút so với giờ bắt đầu ${shiftStartTime}). Chúc bạn làm việc hiệu quả!`
        : `Giờ vào: ${punchInTime} (đúng ${shiftStartTime}). Chúc bạn làm việc hiệu quả!`,
    };
  }

  const lateMinutes = inMins - startMins;

  if (lateMinutes <= 30) {
    return {
      isLate: true,
      lateMinutes,
      violationLevel: 'grace',
      toastType: 'warning',
      toastTitle: `Đi muộn ${shiftLabel} ${lateMinutes} phút (Mức ân hạn)`,
      toastMessage: `Giờ vào: ${punchInTime}. Muộn ${lateMinutes}p so với ${shiftStartTime}. Trong mức ân hạn cho phép ≤ 30 phút, bảo lưu 0.5 công.`,
    };
  } else if (lateMinutes <= 60) {
    return {
      isLate: true,
      lateMinutes,
      violationLevel: 'medium',
      toastType: 'warning',
      toastTitle: `Đi muộn ${shiftLabel} ${lateMinutes} phút (Vi phạm mức 1)`,
      toastMessage: `Giờ vào: ${punchInTime}. Muộn ${lateMinutes}p (31-60p). Trừ 0.125 công ca hoặc phạt 100.000 đ theo nội quy. Vui lòng gửi giải trình.`,
    };
  } else if (lateMinutes <= 120) {
    return {
      isLate: true,
      lateMinutes,
      violationLevel: 'heavy',
      toastType: 'warning',
      toastTitle: `Đi muộn ${shiftLabel} ${lateMinutes} phút (Vi phạm mức 2)`,
      toastMessage: `Giờ vào: ${punchInTime}. Muộn ${lateMinutes}p (61-120p). Trừ 0.25 công ca hoặc phạt 150.000 đ theo nội quy. Vui lòng gửi giải trình.`,
    };
  } else {
    return {
      isLate: true,
      lateMinutes,
      violationLevel: 'absent',
      toastType: 'warning',
      toastTitle: `Đi muộn ${shiftLabel} ${lateMinutes} phút (Bỏ ca)`,
      toastMessage: `Giờ vào: ${punchInTime}. Muộn trên 120 phút không được tính công ca này (trừ 0.5 công).`,
    };
  }
};

/**
 * Hàm kiểm tra giờ ra (Punch Out)
 * So sánh giờ quẹt ra với giờ kết thúc ca quy định (VD: 12:00 hoặc 17:30)
 */
export const evaluatePunchOut = (
  punchOutTime: string,
  shiftEndTime: string,
  shiftLabel: string = 'ca làm việc',
  minOtMinutesRequired: number = 30
): {
  isEarly: boolean;
  earlyMinutes: number;
  isOt: boolean;
  otHours: number;
  toastType: 'success' | 'warning';
  toastTitle: string;
  toastMessage: string;
} => {
  const endMins = parseTimeToMinutes(shiftEndTime, 17 * 60 + 30);
  const outMins = parseTimeToMinutes(punchOutTime, endMins);

  if (outMins < endMins) {
    const earlyMinutes = endMins - outMins;
    return {
      isEarly: true,
      earlyMinutes,
      isOt: false,
      otHours: 0,
      toastType: 'warning',
      toastTitle: `Về sớm ${shiftLabel} ${earlyMinutes} phút`,
      toastMessage: `Giờ ra: ${punchOutTime}. Bạn ra sớm ${earlyMinutes} phút so với giờ quy định (${shiftEndTime}). Bị tính vào số phút vi phạm nội quy.`,
    };
  }

  const overtimeMins = outMins - endMins;
  if (overtimeMins >= minOtMinutesRequired) {
    const otHours = Math.round((overtimeMins / 60) * 10) / 10;
    return {
      isEarly: false,
      earlyMinutes: 0,
      isOt: true,
      otHours,
      toastType: 'success',
      toastTitle: `Tan làm và Ghi nhận Tăng ca (+${otHours}h OT)`,
      toastMessage: `Giờ ra: ${punchOutTime}. Hoàn tất ngày công và ghi nhận thêm ${otHours} giờ làm thêm OT theo nội quy công ty.`,
    };
  }

  return {
    isEarly: false,
    earlyMinutes: 0,
    isOt: false,
    otHours: 0,
    toastType: 'success',
    toastTitle: `Hoàn thành ${shiftLabel} đúng giờ`,
    toastMessage: `Giờ ra: ${punchOutTime}. Bạn đã hoàn thành ca làm việc đúng giờ quy định (${shiftEndTime}).`,
  };
};

/**
 * Hàm tính điểm công và khấu trừ của một ca (chuẩn 0.5 công)
 */
export const calculateShiftCredit = (
  lateMinutes: number,
  earlyMinutes: number,
  hasPunchOut: boolean = true
): {
  workCredit: number;
  deductCredit: number;
  totalViolateMinutes: number;
} => {
  if (!hasPunchOut) {
    return { workCredit: 0, deductCredit: 0, totalViolateMinutes: lateMinutes };
  }

  const totalViolate = (lateMinutes || 0) + (earlyMinutes || 0);
  let deduct = 0;

  if (totalViolate > 120) {
    deduct = 0.5; // Vi phạm nặng > 120p trừ hết 0.5 công
  } else if (totalViolate > 60) {
    deduct = 0.25; // 61-120p trừ 0.25 công
  } else if (totalViolate > 30) {
    deduct = 0.125; // 31-60p trừ 0.125 công
  } else {
    deduct = 0; // <= 30p ân hạn không trừ công
  }

  return {
    workCredit: Math.max(0, 0.5 - deduct),
    deductCredit: deduct,
    totalViolateMinutes: totalViolate,
  };
};
