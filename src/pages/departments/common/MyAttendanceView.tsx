import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { DEFAULT_WORK_LOCATIONS, type WorkLocationItem } from '../bom/IntranetSetupView';
import {
  GeoAlt,
  ArrowRepeat,
  ShieldCheck,
  Sun,
  MoonStars,
  X,
  JournalText,
  CalendarCheck,
  CashCoin,
  ExclamationTriangle,
  InfoCircle,
  Ethernet,
  PcDisplay,
  CheckCircleFill,
  Briefcase,
  LockFill,
  ForkKnife,
  ChevronLeft,
  ChevronRight,
  BoxArrowRight,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { Select } from '../../../components/common/Select';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import { evaluatePunchIn, evaluatePunchOut, calculateShiftCredit } from '../../../utils/timekeepingEvaluator';

export interface TimekeepingRecord {
  id: string;
  dateStr: string;
  dayOfWeek: string;

  // Ca sáng: 08:00 đến 12:00, tính 0.5 công
  morningCheckIn: string;
  morningCheckOut: string;
  morningCredit: number;
  morningLateMinutes: number;
  morningEarlyMinutes?: number;
  morningStatus: 'completed' | 'working' | 'late' | 'not_yet' | 'absent';

  // Ca chiều: 13:30 đến 17:30, tính 0.5 công
  afternoonCheckIn: string;
  afternoonCheckOut: string;
  afternoonCredit: number;
  afternoonLateMinutes: number;
  afternoonEarlyMinutes: number;
  afternoonStatus: 'completed' | 'working' | 'late' | 'early' | 'not_yet' | 'absent';

  // Tổng hợp ngày
  totalCredit: number;
  otHours: number;
  totalWorkHoursFormatted: string;
  locationName: string;
  locationCoords?: { lat: number; lng: number };
  method: string;
  statusLabel: string;
  note: string;
  explanationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  registeredLunch?: boolean;
  registeredDinner?: boolean;
  leaveInfo?: {
    requestId?: string;
    status: 'approved' | 'pending' | 'rejected';
    leaveCategory: 'annual' | 'sick' | 'special' | 'unpaid';
    leaveCategoryLabel: string;
    leaveSession: 'all_day' | 'morning' | 'afternoon';
    isPaidLeave: boolean;
    paidCredit?: number;
    morningPaidCredit?: number;
    afternoonPaidCredit?: number;
    quotaConvertedToUnpaid?: boolean;
    reason?: string;
    approver?: string;
  } | null;
}

export interface MyTimekeepingViewProps {
  department?: string;
  onShowToast?: (type: any, title: string, message: string, durationMs?: number) => void;
  onNavigate?: (navId: string) => void;
  theme?: any;
  user?: any;
  onToggleTheme?: () => void;
  onChangeTheme?: (newTheme: any) => void;
  onCompanyInfo?: () => void;
  onDataManagement?: () => void;
  onLogout?: () => void;
  onSelectDepartment?: (deptId: string, deptName?: string) => void;
  activeDepartmentId?: string;
  navGroups?: any[];
  activeNavId?: string;
  onSelectNav?: (id: string) => void;
  pageHeader?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export type MyAttendanceViewProps = MyTimekeepingViewProps;

// Định dạng hiển thị số hàng nghìn
const formatNumberGroup = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/[^\d]/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
};

// Tính khoảng cách giữa hai tọa độ GPS tính bằng mét theo công thức Haversine
const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const MyTimekeepingView: React.FC<MyTimekeepingViewProps> = ({
  department: _department,
  onShowToast: propOnShowToast,
  user: propUser,
}) => {
  const { data: session } = useSession();
  const { user: authUser } = useAuth();
  const activeUser = propUser || authUser || session?.user;
  const toast = useToast();

  const onShowToast = useCallback(
    (type: any, title: string, message: string, durationMs?: number) => {
      if (propOnShowToast) {
        propOnShowToast(type, title, message, durationMs);
      } else if (type === 'success') {
        toast.success(title, message);
      } else if (type === 'error') {
        toast.error(title, message);
      } else if (type === 'warning') {
        toast.warning(title, message);
      } else {
        toast.info(title, message);
      }
    },
    [propOnShowToast, toast]
  );

  // Danh sách bản ghi chấm công thực tế từ CSDL
  const [records, setRecords] = useState<TimekeepingRecord[]>([]);
  // Dữ liệu người dùng thực tế từ CSDL SQLite
  const [dbUser, setDbUser] = useState<any>(null);

  // Đồng hồ thời gian thực
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [currentDateShortStr, setCurrentDateShortStr] = useState<string>('');

  // Danh sách các cơ sở làm việc và thông số bán kính cho phép
  const [workLocations, setWorkLocations] = useState<WorkLocationItem[]>(DEFAULT_WORK_LOCATIONS);

  // Tọa độ GPS hiện tại của người dùng
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 21.047219,
    lng: 105.770514,
  });
  const [currentAddressName, setCurrentAddressName] = useState<string>(
    'Trụ sở chính và Văn phòng điều hành Seajong'
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number>(15);

  // Tải cấu hình danh sách cơ sở từ máy chủ CSDL thực tế
  useEffect(() => {
    fetch('/api/work-locations')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.locations)
            ? data.locations
            : [];
        if (list.length > 0) {
          setWorkLocations(list);
          if (list[0]?.name) {
            setCurrentAddressName(list[0].name);
          }
          if (list[0]?.latitude && list[0]?.longitude) {
            setCurrentCoords({
              lat: Number(list[0].latitude),
              lng: Number(list[0].longitude),
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Xác định cơ sở gần nhất và kiểm tra vị trí trong hay ngoài phạm vi cho phép
  const locationRangeCheck = useMemo(() => {
    if (!currentCoords || !currentCoords.lat || !currentCoords.lng) {
      return null;
    }
    const activeLocs = workLocations.filter((l) => l.status === 'active');
    if (activeLocs.length === 0) return null;

    let nearestLoc = activeLocs[0];
    let minDistance = calculateDistanceMeters(
      currentCoords.lat,
      currentCoords.lng,
      nearestLoc.latitude,
      nearestLoc.longitude
    );

    for (let i = 1; i < activeLocs.length; i++) {
      const loc = activeLocs[i];
      const dist = calculateDistanceMeters(
        currentCoords.lat,
        currentCoords.lng,
        loc.latitude,
        loc.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestLoc = loc;
      }
    }

    const isInside = minDistance <= nearestLoc.radiusMeters;

    return {
      nearestLoc,
      distanceMeters: minDistance,
      allowedRadiusMeters: nearestLoc.radiusMeters,
      isInside,
    };
  }, [currentCoords, workLocations]);

  // Chế độ xác thực vị trí: lan nghĩa là Mạng cáp LAN cho máy tính để bàn PC hoặc gps nghĩa là Định vị vệ tinh GPS hoặc outside nghĩa là Ngoài văn phòng
  const isMobileOrTabletInit = typeof window !== 'undefined'
    ? (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(navigator.userAgent || '') ||
       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
       (('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 1024))
    : false;

  const [authMode, setAuthMode] = useState<'lan' | 'gps' | 'outside'>(isMobileOrTabletInit ? 'gps' : 'lan');
  const [lanNetworkInfo, setLanNetworkInfo] = useState<{
    isVerified: boolean;
    deviceType: string;
    clientIp: string;
    facilityName: string;
    facilityAddress: string;
    subnet: string;
    wifiName?: string;
    connectionType?: string;
    message: string;
    isChecking?: boolean;
  }>({
    isVerified: false,
    deviceType: 'pc_desktop',
    clientIp: 'Đang kiểm tra...',
    facilityName: 'Đang nhận diện cơ sở...',
    facilityAddress: 'Đang kết nối hệ thống...',
    subnet: '192.168.1.0/24',
    message: 'Đang quét thông số mạng và xác định trạng thái kết nối...',
    isChecking: true,
  });

  // Trạng thái ca làm việc hôm nay
  const [todayMorningIn, setTodayMorningIn] = useState<string>('');
  const [todayMorningOut, setTodayMorningOut] = useState<string>('');
  const [todayAfternoonIn, setTodayAfternoonIn] = useState<string>('');
  const [todayAfternoonOut, setTodayAfternoonOut] = useState<string>('');

  // Cấu hình khung giờ ca làm việc từ Nội quy
  const [shiftHours, setShiftHours] = useState<{
    morningStart: string;
    morningEnd: string;
    afternoonStart: string;
    afternoonEnd: string;
  }>({
    morningStart: '08:00',
    morningEnd: '12:00',
    afternoonStart: '13:30',
    afternoonEnd: '17:30',
  });

  // State lưu toàn bộ dữ liệu nội quy lao động và nghỉ lễ từ DB
  const [laborRulesData, setLaborRulesData] = useState<any>(null);
  const [holidayRulesData, setHolidayRulesData] = useState<any>(null);

  // Tải cấu hình nội quy lao động và lịch nghỉ lễ từ API DB SQLite
  useEffect(() => {
    const fetchAllRules = async () => {
      // 1. Tải Nội quy lao động
      try {
        const res = await fetch('/api/labor-rules');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.shifts) && data.shifts.length > 0) {
            setLaborRulesData(data);
            const currentShift = data.shifts.find((s: any) => s.id === data.selectedShiftId) || data.shifts[0];
            if (currentShift) {
              const aStart = currentShift.afternoonStart === '13:00' ? '13:30' : (currentShift.afternoonStart || '13:30');
              const aEnd = currentShift.afternoonEnd === '17:00' ? '17:30' : (currentShift.afternoonEnd || '17:30');
              setShiftHours({
                morningStart: currentShift.morningStart || '08:00',
                morningEnd: currentShift.morningEnd || '12:00',
                afternoonStart: aStart,
                afternoonEnd: aEnd,
              });
            }
          }
        }
      } catch {}

      // Fallback localStorage cho labor_rules nếu API chưa có
      try {
        const cached = localStorage.getItem('seajong_labor_rules');
        if (cached) {
          const data = JSON.parse(cached);
          if (!laborRulesData && data) setLaborRulesData((prev: any) => prev || data);
          if (data && Array.isArray(data.shifts) && data.shifts.length > 0) {
            const currentShift = data.shifts.find((s: any) => s.id === data.selectedShiftId) || data.shifts[0];
            if (currentShift) {
              const aStart = currentShift.afternoonStart === '13:00' ? '13:30' : (currentShift.afternoonStart || '13:30');
              const aEnd = currentShift.afternoonEnd === '17:00' ? '17:30' : (currentShift.afternoonEnd || '17:30');
              setShiftHours({
                morningStart: currentShift.morningStart || '08:00',
                morningEnd: currentShift.morningEnd || '12:00',
                afternoonStart: aStart,
                afternoonEnd: aEnd,
              });
            }
          }
        }
      } catch {}

      // 2. Tải Lịch nghỉ lễ và Phép năm
      try {
        const hRes = await fetch('/api/holiday-rules');
        if (hRes.ok) {
          const hData = await hRes.json();
          if (hData && Array.isArray(hData.periods)) {
            setHolidayRulesData(hData);
          }
        }
      } catch {}

      // Fallback localStorage cho holiday_rules nếu API chưa có
      try {
        const hCached = localStorage.getItem('seajong_holiday_rules');
        if (hCached) {
          const hData = JSON.parse(hCached);
          if (hData) setHolidayRulesData((prev: any) => prev || hData);
        }
      } catch {}
    };

    fetchAllRules();
  }, []);

  // Chuyển đổi chuỗi giờ phút sang số phút trong ngày
  const parseTimeToMinutes = (timeStr: string, fallbackMins: number): number => {
    if (!timeStr) return fallbackMins;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return fallbackMins;
    return h * 60 + m;
  };

  // Tính toán thời gian thực theo đồng hồ
  const nowForShift = new Date();
  const currentTotalMinutes = nowForShift.getHours() * 60 + nowForShift.getMinutes();

  // Ca sáng kết thúc khi hết ca sáng:
  // Mốc hết ca sáng tính theo giờ tan ca morningEnd cộng thêm thời gian quẹt thẻ ra ca 30 phút, tối thiểu 12:00 trưa
  const morningEndMinutes = parseTimeToMinutes(shiftHours.morningEnd, 11 * 60 + 30);
  const morningCloseMinutes = Math.max(morningEndMinutes + 30, 12 * 60);
  const isMorningEnded = currentTotalMinutes >= morningCloseMinutes;

  // Ca chiều bắt đầu khi đến giờ ca chiều:
  // Cho phép mở nút ca chiều trước giờ làm việc 30 phút, tối thiểu sau khi kết thúc ca sáng
  const afternoonStartMinutes = parseTimeToMinutes(shiftHours.afternoonStart, 13 * 60);
  const afternoonOpenMinutes = Math.max(morningCloseMinutes, afternoonStartMinutes - 30);
  const isAfternoonReady = currentTotalMinutes >= afternoonOpenMinutes;

  // Giờ chốt đăng ký ăn trưa và ăn tối từ Nội quy lao động Seajong
  const lunchDeadlineStr = laborRulesData?.lunchRule?.lunchDeadlineMorning || '09:00';
  const dinnerDeadlineStr = laborRulesData?.lunchRule?.dinnerDeadlineAfternoon || '15:30';
  const lunchDeadlineMinutes = parseTimeToMinutes(lunchDeadlineStr, 9 * 60);
  const dinnerDeadlineMinutes = parseTimeToMinutes(dinnerDeadlineStr, 15 * 60 + 30);
  const isLunchLocked = currentTotalMinutes >= lunchDeadlineMinutes;
  const isDinnerLocked = currentTotalMinutes >= dinnerDeadlineMinutes;

  // Kiểm tra trạng thái đã bấm giờ vào hay chưa
  const hasMorningIn = Boolean(todayMorningIn && todayMorningIn !== '--:--');
  const hasMorningOut = Boolean(todayMorningOut && todayMorningOut !== '--:--');
  const hasAfternoonIn = Boolean(todayAfternoonIn && todayAfternoonIn !== '--:--');
  const hasAfternoonOut = Boolean(todayAfternoonOut && todayAfternoonOut !== '--:--');

  // Tính số phút về sớm hôm nay theo giờ tan ca quy định
  const todayMorningEarlyMinutes = useMemo(() => {
    if (!todayMorningOut || todayMorningOut === '--:--') return 0;
    const mEndMins = parseTimeToMinutes(shiftHours.morningEnd || '12:00', 12 * 60);
    const outMins = parseTimeToMinutes(todayMorningOut, mEndMins);
    return outMins < mEndMins ? mEndMins - outMins : 0;
  }, [todayMorningOut, shiftHours.morningEnd]);

  const todayAfternoonEarlyMinutes = useMemo(() => {
    if (!todayAfternoonOut || todayAfternoonOut === '--:--') return 0;
    const aEndMins = parseTimeToMinutes(shiftHours.afternoonEnd || '17:30', 17 * 60 + 30);
    const outMins = parseTimeToMinutes(todayAfternoonOut, aEndMins);
    return outMins < aEndMins ? aEndMins - outMins : 0;
  }, [todayAfternoonOut, shiftHours.afternoonEnd]);

  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  const [isTabletOrMobile, setIsTabletOrMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 1024;
    }
    return false;
  });

  // Kiểm tra thiết bị là Điện thoại di động / iPad / Tablet hay Máy PC / Laptop
  const isMobileOrTabletDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i;
    const isIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return mobileRegex.test(ua) || isIPad || isTabletOrMobile || (isTouch && window.innerWidth <= 1024);
  }, [isTabletOrMobile]);

  useEffect(() => {
    if (isMobileOrTabletDevice && authMode === 'lan') {
      setAuthMode('gps');
    } else if (!isMobileOrTabletDevice && authMode === 'gps') {
      setAuthMode('lan');
    }
  }, [isMobileOrTabletDevice, authMode]);

  // Điều kiện đáp ứng kết nối mạng / GPS để mở nút chấm công
  const isNetworkReadyForCheckIn = useMemo(() => {
    if (authMode === 'lan') {
      return Boolean(lanNetworkInfo.isVerified && !lanNetworkInfo.isChecking);
    }
    if (authMode === 'gps') {
      return Boolean(currentCoords.lat && currentCoords.lng && !isLocating && locationRangeCheck?.isInside);
    }
    // Chế độ Ngoài văn phòng (công tác)
    return true;
  }, [authMode, lanNetworkInfo.isVerified, lanNetworkInfo.isChecking, currentCoords.lat, currentCoords.lng, isLocating, locationRangeCheck?.isInside]);

  const networkLockReason = useMemo(() => {
    if (authMode === 'lan') {
      if (lanNetworkInfo.isChecking) return 'Đang kiểm tra kết nối mạng...';
      if (!lanNetworkInfo.isVerified) return 'Chưa kết nối mạng nội bộ công ty (IP mạng không khớp)';
    }
    if (authMode === 'gps') {
      if (isLocating) return 'Đang xác định toạ độ GPS...';
      if (!currentCoords.lat || !currentCoords.lng) return 'Chưa xác định được toạ độ GPS';
      if (locationRangeCheck && !locationRangeCheck.isInside) {
        return `Bạn đang ở ngoài phạm vi chấm công (cách ${Math.round(locationRangeCheck.distanceMeters)}m, bán kính cho phép ${locationRangeCheck.allowedRadiusMeters}m tại ${locationRangeCheck.nearestLoc?.name || 'cơ sở'})`;
      }
    }
    return '';
  }, [authMode, lanNetworkInfo.isChecking, lanNetworkInfo.isVerified, isLocating, currentCoords.lat, currentCoords.lng, locationRangeCheck]);

  // Chuỗi tóm tắt lý do khoá hiển thị ngắn gọn dưới nút chấm công
  const networkLockSubtext = useMemo(() => {
    if (authMode === 'lan') return 'Chưa kết nối mạng';
    if (authMode === 'gps') {
      if (!currentCoords.lat || !currentCoords.lng) return 'Chưa có GPS';
      if (locationRangeCheck && !locationRangeCheck.isInside) return `Ngoài bán kính (${Math.round(locationRangeCheck.distanceMeters)}m)`;
    }
    return 'Chưa đủ điều kiện';
  }, [authMode, currentCoords.lat, currentCoords.lng, locationRangeCheck?.isInside, locationRangeCheck?.distanceMeters]);

  // Kiểm tra hôm nay có đơn Nghỉ phép hay không
  // QUY TẮC BẮT BUỘC (Mục 1 & Mục 3):
  // - Trong thời gian đơn đang "Chờ phê duyệt" (pending) hoặc "Từ chối" (rejected), nhân viên VẪN ĐƯỢC CHẤM CÔNG BÌNH THƯỜNG.
  // - CHỈ KHI đơn đã được "Phê duyệt" (status === 'approved') mới khoá ca nghỉ tương ứng (Sáng / Chiều / Cả ngày).
  const todayLeaveInfo = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const found = records.find((r) => r.dateStr === todayStr);
    return found?.leaveInfo || null;
  }, [records]);

  const isTodayMorningLeave = Boolean(
    todayLeaveInfo &&
      todayLeaveInfo.status === 'approved' &&
      (todayLeaveInfo.leaveSession === 'all_day' || todayLeaveInfo.leaveSession === 'morning')
  );
  const isTodayAfternoonLeave = Boolean(
    todayLeaveInfo &&
      todayLeaveInfo.status === 'approved' &&
      (todayLeaveInfo.leaveSession === 'all_day' || todayLeaveInfo.leaveSession === 'afternoon')
  );
  const isTodayFullDayLeave = Boolean(
    todayLeaveInfo &&
      todayLeaveInfo.status === 'approved' &&
      todayLeaveInfo.leaveSession === 'all_day'
  );

  // Trạng thái nhân sự tự động của nhân viên: 'working' (Đang làm việc) | 'temporary_leave' (Tạm nghỉ) | 'resigned' (Đã nghỉ)
  const isHrResigned = Boolean(
    dbUser?.status === 'Đã nghỉ việc' ||
      dbUser?.status === 'resigned' ||
      activeUser?.status === 'resigned' ||
      activeUser?.status === 'Đã nghỉ' ||
      activeUser?.status === 'Đã nghỉ việc'
  );
  const isHrTempLeave = Boolean(
    dbUser?.status === 'Tạm nghỉ' ||
      dbUser?.status === 'temporary_leave' ||
      activeUser?.status === 'temporary_leave' ||
      activeUser?.status === 'Tạm nghỉ'
  );

  const employeeStatus: 'working' | 'temporary_leave' | 'resigned' = useMemo(() => {
    if (isHrResigned) return 'resigned';
    if (isHrTempLeave) return 'temporary_leave';
    if (todayLeaveInfo && todayLeaveInfo.status === 'approved') return 'temporary_leave';
    return 'working';
  }, [isHrResigned, isHrTempLeave, todayLeaveInfo]);

  const isEmployeeInactive = isHrResigned || isHrTempLeave;

  // Khoá nút bấm chấm công khi đã quẹt xong ca, hoặc đang nghỉ phép ca đó, hoặc chưa đáp ứng kết nối mạng, hoặc chưa đến giờ / hết giờ ca
  const isMorningInLocked = isEmployeeInactive || hasMorningIn || isMorningEnded || !isNetworkReadyForCheckIn || isTodayMorningLeave;
  const isMorningCheckOutLocked = isEmployeeInactive || hasMorningOut || isMorningEnded || !hasMorningIn || !isNetworkReadyForCheckIn || isTodayMorningLeave;
  const isAfternoonInLocked = isEmployeeInactive || hasAfternoonIn || !isAfternoonReady || !isNetworkReadyForCheckIn || isTodayAfternoonLeave;
  const isAfternoonCheckOutLocked = isEmployeeInactive || hasAfternoonOut || !isAfternoonReady || !hasAfternoonIn || !isNetworkReadyForCheckIn || isTodayAfternoonLeave;

  // Chức năng chấm công ngoài văn phòng hoặc công trình dự án
  const [isOutsideWork, setIsOutsideWork] = useState<boolean>(false);
  const [outsideLocationName, setOutsideLocationName] = useState<string>('');

  const isOutside = authMode === 'outside' || isOutsideWork;

  // Trạng thái hiển thị cột bên phải trên điện thoại và iPad/tablet (vuốt phải qua trái để mở, vuốt trái qua phải để ẩn)
  const [showMobileRightColumn, setShowMobileRightColumn] = useState<boolean>(false);

  // Trạng thái toggle đăng ký ăn trưa và ăn tối (Mặc định TẮT cả 2)
  const [registerLunch, setRegisterLunch] = useState<boolean>(() => {
    try {
      if (!localStorage.getItem('seajong_meal_default_reset_v2')) {
        return false;
      }
      const today = new Date().toISOString().slice(0, 10);
      const saved = localStorage.getItem(`my_timekeeping_lunch_${today}`);
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [registerDinner, setRegisterDinner] = useState<boolean>(() => {
    try {
      if (!localStorage.getItem('seajong_meal_default_reset_v2')) {
        return false;
      }
      const today = new Date().toISOString().slice(0, 10);
      const saved = localStorage.getItem(`my_timekeeping_dinner_${today}`);
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const handleToggleLunch = () => {
    if (isEmployeeInactive) {
      onShowToast('warning', 'Tài khoản đã khoá', `Nhân viên đang ở trạng thái ${employeeStatus === 'temporary_leave' ? 'Tạm nghỉ' : 'Đã nghỉ việc'}, không thể đăng ký suất ăn.`);
      return;
    }
    if (isTodayFullDayLeave) {
      onShowToast('warning', 'Đang trong ngày nghỉ phép', `Hôm nay bạn có đơn ${todayLeaveInfo?.leaveCategoryLabel || 'Nghỉ phép'} cả ngày nên hệ thống tự động tắt đăng ký suất ăn trưa.`);
      return;
    }
    if (isLunchLocked) {
      onShowToast('warning', 'Đã hết giờ báo cơm trưa', `Theo nội quy, giờ chốt đăng ký / hủy ăn trưa là trước ${lunchDeadlineStr}. Hiện đã quá giờ quy định, nút báo cơm trưa đã khoá để nhà bếp chuẩn bị suất ăn.`);
      return;
    }
    const nextVal = !registerLunch;
    setRegisterLunch(nextVal);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    try {
      localStorage.setItem(`my_timekeeping_lunch_${today}`, JSON.stringify(nextVal));
      const uid = currentEmployee?.id || dbUser?.id || activeUser?.id || 'lecongvu@seajong.com';
      fetch('/api/payroll/lunch-orders/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, date: today, type: 'lunch', value: nextVal }),
      }).catch(() => {});
    } catch {}

    setRecords((prev) => {
      let found = false;
      let syncedRec: TimekeepingRecord | null = null;
      const updated = prev.map((r) => {
        if (r.dateStr === today) {
          found = true;
          syncedRec = { ...r, registeredLunch: nextVal };
          return syncedRec;
        }
        return r;
      });
      if (!found) {
        const newRecord = normalizeRecord({
          dateStr: today,
          registeredLunch: nextVal,
        });
        syncedRec = newRecord;
        updated.unshift(newRecord);
      }
      saveRecords(updated, syncedRec ? [syncedRec] : undefined);
      return updated;
    });

    if (nextVal) {
      onShowToast('success', 'Đăng ký ăn trưa thành công', `Đã ghi nhận đăng ký suất ăn trưa hôm nay (chốt trước ${lunchDeadlineStr})`);
    } else {
      onShowToast('info', 'Huỷ đăng ký ăn trưa', 'Đã bỏ đăng ký suất ăn trưa hôm nay');
    }
  };

  const handleToggleDinner = () => {
    if (isEmployeeInactive) {
      onShowToast('warning', 'Tài khoản đã khoá', `Nhân viên đang ở trạng thái ${employeeStatus === 'temporary_leave' ? 'Tạm nghỉ' : 'Đã nghỉ việc'}, không thể đăng ký suất ăn.`);
      return;
    }
    if (isTodayFullDayLeave) {
      onShowToast('warning', 'Đang trong ngày nghỉ phép', `Hôm nay bạn có đơn ${todayLeaveInfo?.leaveCategoryLabel || 'Nghỉ phép'} cả ngày nên hệ thống tự động tắt đăng ký suất ăn tối.`);
      return;
    }
    if (isDinnerLocked) {
      onShowToast('warning', 'Đã hết giờ báo cơm tối', `Theo nội quy, giờ chốt đăng ký / hủy ăn tối tăng ca là trước ${dinnerDeadlineStr}. Hiện đã quá giờ quy định, nút báo cơm tối đã khoá.`);
      return;
    }
    const nextVal = !registerDinner;
    setRegisterDinner(nextVal);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    try {
      localStorage.setItem(`my_timekeeping_dinner_${today}`, JSON.stringify(nextVal));
      const uid = currentEmployee?.id || dbUser?.id || activeUser?.id || 'lecongvu@seajong.com';
      fetch('/api/payroll/lunch-orders/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, date: today, type: 'dinner', value: nextVal }),
      }).catch(() => {});
    } catch {}

    setRecords((prev) => {
      let found = false;
      let syncedRec: TimekeepingRecord | null = null;
      const updated = prev.map((r) => {
        if (r.dateStr === today) {
          found = true;
          syncedRec = { ...r, registeredDinner: nextVal };
          return syncedRec;
        }
        return r;
      });
      if (!found) {
        const newRecord = normalizeRecord({
          dateStr: today,
          registeredDinner: nextVal,
        });
        syncedRec = newRecord;
        updated.unshift(newRecord);
      }
      saveRecords(updated, syncedRec ? [syncedRec] : undefined);
      return updated;
    });

    if (nextVal) {
      onShowToast('success', 'Đăng ký ăn tối thành công', `Đã ghi nhận đăng ký suất ăn tối tăng ca hôm nay (chốt trước ${dinnerDeadlineStr})`);
    } else {
      onShowToast('info', 'Huỷ đăng ký ăn tối', 'Đã bỏ đăng ký suất ăn tối hôm nay');
    }
  };

  // Modal Giải trình chấm công / Xin nghỉ phép
  const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);
  const [explanationRecord, setExplanationRecord] = useState<TimekeepingRecord | null>(null);
  const [explanationReasonType, setExplanationReasonType] = useState<string>('forget_morning_in');
  const [modalLeaveCategory, setModalLeaveCategory] = useState<'annual' | 'special' | 'sick' | 'unpaid'>('annual');
  const [modalLeaveSession, setModalLeaveSession] = useState<'all_day' | 'morning' | 'afternoon'>('all_day');
  const [proposedCheckIn, setProposedCheckIn] = useState<string>('08:00');
  const [proposedCheckOut, setProposedCheckOut] = useState<string>('17:30');
  const [explanationContent, setExplanationContent] = useState<string>('');
  const [approverName, setApproverName] = useState<string>('Lê Công Vụ - Ban Giám đốc');
  // State điều khiển offcanvas Quy tắc tính công rộng 400px
  const [showRulesOffcanvas, setShowRulesOffcanvas] = useState<boolean>(false);

  // Xác thực mạng LAN / WiFi nội bộ và nhận diện trạng thái kết nối từ DB
  const verifyLanNetwork = async (showNotice = false) => {
    setIsLocating(true);
    setLanNetworkInfo((prev) => ({
      ...prev,
      isChecking: true,
      message: 'Đang quét địa chỉ IP và xác định trạng thái kết nối...',
    }));

    let detectedClientWanIp = '';
    try {
      // 1. Quét nhanh địa chỉ IP công cộng thực tế của thiết bị
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData?.ip) detectedClientWanIp = ipData.ip;
        }
      } catch {
        try {
          const ipRes2 = await fetch('https://ipinfo.io/json?token=test', { signal: AbortSignal.timeout(2000) });
          if (ipRes2.ok) {
            const ipData2 = await ipRes2.json();
            if (ipData2?.ip) detectedClientWanIp = ipData2.ip;
          }
        } catch {}
      }

      // 2. Gửi địa chỉ IP & định danh nhân sự lên API máy chủ để đối soát với Địa điểm làm việc được gán trong CSDL
      const uid =
        currentEmployee?.id ||
        dbUser?.id ||
        activeUser?.id ||
        (activeUser as any)?.email ||
        'lecongvu@seajong.com';
      const params = new URLSearchParams();
      if (detectedClientWanIp) params.set('clientWanIp', detectedClientWanIp);
      if (uid) params.set('userId', String(uid));
      const verifyUrl = `/api/timekeeping/verify-network?${params.toString()}`;

      const res = await fetch(verifyUrl);
      if (res.ok) {
        const data = await res.json();
        const isVerified = Boolean(data.isLanVerified);
        setLanNetworkInfo({
          isVerified,
          deviceType: data.deviceType || 'pc_desktop',
          clientIp: data.clientIp || detectedClientWanIp || '192.168.1.100',
          facilityName: data.facilityName || 'Trụ sở chính và Văn phòng điều hành Seajong',
          facilityAddress: data.facilityAddress || 'LK7D4, KĐT Cầu Diễn, Phường Phú Diễn, Bắc Từ Liêm, Hà Nội',
          subnet: data.subnet || '192.168.1.0/24',
          wifiName: data.wifiName || '',
          connectionType: data.connectionType || 'lan_ethernet',
          message: data.message || (isVerified ? 'Đã kết nối mạng nội bộ hợp lệ' : 'Đang kết nối mạng ngoài văn phòng'),
          isChecking: false,
        });

        if (isVerified) {
          if (!isMobileOrTabletInit) {
            setAuthMode('lan');
            setCurrentAddressName(data.facilityName || 'Trụ sở chính và Văn phòng điều hành Seajong');
          }
          setCurrentCoords({
            lat: data.latitude || 21.047219,
            lng: data.longitude || 105.770514,
          });
          if (showNotice) {
            onShowToast('success', 'Xác thực mạng nội bộ thành công', data.message);
          }
        } else {
          if (showNotice) {
            onShowToast('warning', 'Mạng ngoài văn phòng', data.message);
          }
        }
      }
    } catch {
      setLanNetworkInfo({
        isVerified: true,
        deviceType: 'pc_desktop',
        clientIp: detectedClientWanIp || '192.168.1.100',
        facilityName: 'Trụ sở chính và Văn phòng điều hành Seajong',
        facilityAddress: 'LK7D4, KĐT Cầu Diễn, Phường Phú Diễn, Bắc Từ Liêm, Hà Nội',
        subnet: '192.168.1.0/24',
        message: 'Máy tính kết nối mạng nội bộ Văn phòng Seajong',
        isChecking: false,
      });
    } finally {
      setIsLocating(false);
    }
  };

  // Khởi động kiểm tra kết nối mạng LAN
  useEffect(() => {
    verifyLanNetwork(false);
  }, []);

  // Phát hiện kích thước màn hình để tự động tối ưu giao diện di động và iPad/tablet
  useEffect(() => {
    const checkScreen = () => {
      const w = window.innerWidth;
      setIsMobileScreen(w <= 768);
      setIsTabletOrMobile(w <= 1024);
      if (w > 1024) {
        setShowMobileRightColumn(false);
      }
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Xử lý cử chỉ vuốt toàn cục trên màn hình điện thoại và iPad/tablet
  useEffect(() => {
    if (!isTabletOrMobile) return;
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = startX - endX;
      const dy = startY - endY;

      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.closest('input') ||
          target.closest('textarea'))
      ) {
        return;
      }

      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (dx > 0) {
          setShowMobileRightColumn(true);
        } else {
          setShowMobileRightColumn(false);
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      isDragging = false;
      const endX = e.clientX;
      const endY = e.clientY;
      const dx = startX - endX;
      const dy = startY - endY;

      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.closest('input') ||
          target.closest('textarea'))
      ) {
        return;
      }

      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (dx > 0) {
          setShowMobileRightColumn(true);
        } else {
          setShowMobileRightColumn(false);
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isTabletOrMobile]);

  // Khởi động đồng hồ thời gian thực
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayStr = dayNames[now.getDay()];
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      setCurrentDateStr(`${dayStr}, ngày ${d} tháng ${m} năm ${y}`);
      setCurrentDateShortStr(`${dayStr}, ${d}/${m}/${y}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Hàm Reverse Geocoding lấy đúng tên địa chỉ từ tọa độ GPS thực tế
  const resolveAddressNameFromCoords = async (lat: number, lng: number): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: { 'Accept-Language': 'vi' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.pedestrian || addr.suburb || '';
          const ward = addr.quarter || addr.suburb || addr.village || addr.ward || '';
          const district = addr.city_district || addr.district || addr.county || '';
          const city = addr.city || addr.state || '';
          const parts = [road, ward, district, city].filter(Boolean);
          if (parts.length > 0) {
            return parts.join(', ');
          }
          if (data.display_name) {
            return data.display_name.split(',').slice(0, 3).join(',').trim();
          }
        }
      }
    } catch {}

    if (lat > 20.8 && lat < 21.3 && lng > 105.6 && lng < 106.0) {
      return 'LK7D4, KĐT Cầu Diễn, Phường Phú Diễn, Quận Bắc Từ Liêm, Hà Nội';
    }
    if (lat > 10.6 && lat < 11.0 && lng > 106.5 && lng < 107.0) {
      return 'Quận Tân Bình, Thành phố Hồ Chí Minh';
    }
    if (lat > 15.9 && lat < 16.2) {
      return 'Quận Hải Châu, Thành phố Đà Nẵng';
    }
    return `Tọa độ ${lat}, ${lng} Việt Nam`;
  };

  // Hàm lấy vị trí GPS hiện tại và cập nhật đúng tên vị trí
  const handleFetchCurrentGps = (isSilent = false) => {
    if (!navigator.geolocation) {
      if (!isSilent) {
        onShowToast('warning', 'Không hỗ trợ định vị', 'Trình duyệt của bạn không hỗ trợ định vị GPS');
      }
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy);

        setCurrentCoords({ lat, lng });
        setLocationAccuracy(acc);

        const addrName = await resolveAddressNameFromCoords(lat, lng);
        setCurrentAddressName(addrName);
        setIsLocating(false);

        if (!isSilent) {
          onShowToast('success', 'Đã cập nhật vị trí GPS', `Vị trí xác định: ${addrName}`);
        }
      },
      async () => {
        setIsLocating(false);
        const fallbackLat = 21.047219;
        const fallbackLng = 105.770514;
        setCurrentCoords({ lat: fallbackLat, lng: fallbackLng });
        const fallbackAddr = 'LK7D4, KĐT Cầu Diễn, Phường Phú Diễn, Quận Bắc Từ Liêm, Hà Nội';
        setCurrentAddressName(fallbackAddr);

        if (!isSilent) {
          onShowToast('info', 'Vị trí hiện tại', `Vị trí xác định: ${fallbackAddr}`);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Tự động lấy GPS khi mở trang ở chế độ ngầm không làm phiền bằng toast
  useEffect(() => {
    handleFetchCurrentGps(true);
  }, []);

  // Theo dõi toạ độ GPS thời gian thực (Real-time Geofence) khi di chuyển
  useEffect(() => {
    if (authMode !== 'gps' || typeof navigator === 'undefined' || !navigator.geolocation) return;

    let watchId: number | null = null;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          const acc = Math.round(pos.coords.accuracy);

          setCurrentCoords((prev) => {
            const dLat = Math.abs(prev.lat - lat);
            const dLng = Math.abs(prev.lng - lng);
            if (dLat > 0.00005 || dLng > 0.00005) {
              return { lat, lng };
            }
            return prev;
          });
          setLocationAccuracy(acc);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    } catch {}

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [authMode]);

  // Hàm chuẩn hóa tương thích với dữ liệu thực tế từ CSDL Seajong
  const normalizeRecord = (raw: any): TimekeepingRecord => {
    const now = new Date();
    const dynamicTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dynamicDayName = dayNames[now.getDay()] || 'Thứ Hai';

    if (!raw) {
      return {
        id: `TK-${Date.now()}`,
        dateStr: dynamicTodayStr,
        dayOfWeek: dynamicDayName,
        morningCheckIn: '--:--',
        morningCheckOut: '--:--',
        morningCredit: 0,
        morningLateMinutes: 0,
        morningStatus: 'not_yet',
        afternoonCheckIn: '--:--',
        afternoonCheckOut: '--:--',
        afternoonCredit: 0,
        afternoonLateMinutes: 0,
        afternoonEarlyMinutes: 0,
        afternoonStatus: 'not_yet',
        totalCredit: 0,
        otHours: 0,
        totalWorkHoursFormatted: '0 giờ 00 phút',
        locationName: 'Trụ sở chính và Văn phòng điều hành Seajong',
        locationCoords: { lat: 21.047219, lng: 105.770514 },
        method: 'Mạng dây LAN nội bộ Seajong',
        statusLabel: 'Chưa có thông tin',
        note: '',
        explanationStatus: 'none',
      };
    }

    const rawCheckIn = raw.checkInTime || '';
    const rawCheckOut = raw.checkOutTime || '';
    const morningCheckIn =
      raw.morningCheckIn && raw.morningCheckIn !== '--:--'
        ? raw.morningCheckIn
        : rawCheckIn && rawCheckIn < '12:30'
          ? rawCheckIn
          : '--:--';
    const morningCheckOut =
      raw.morningCheckOut && raw.morningCheckOut !== '--:--'
        ? raw.morningCheckOut
        : rawCheckOut && rawCheckOut < '13:00'
          ? rawCheckOut
          : '--:--';
    const afternoonCheckIn =
      raw.afternoonCheckIn && raw.afternoonCheckIn !== '--:--'
        ? raw.afternoonCheckIn
        : rawCheckIn && rawCheckIn >= '12:00'
          ? rawCheckIn
          : '--:--';
    const afternoonCheckOut =
      raw.afternoonCheckOut && raw.afternoonCheckOut !== '--:--'
        ? raw.afternoonCheckOut
        : rawCheckOut && rawCheckOut >= '13:00'
          ? rawCheckOut
          : '--:--';

    let calculatedMorningLate = 0;
    if (morningCheckIn && morningCheckIn !== '--:--') {
      const inEval = evaluatePunchIn(morningCheckIn, shiftHours.morningStart || '08:00', 'ca sáng');
      calculatedMorningLate = inEval.lateMinutes;
    } else if (typeof raw.morningLateMinutes === 'number') {
      calculatedMorningLate = raw.morningLateMinutes;
    }

    let calculatedMorningEarly = 0;
    if (morningCheckOut && morningCheckOut !== '--:--') {
      const outEval = evaluatePunchOut(morningCheckOut, shiftHours.morningEnd || '12:00', 'ca sáng');
      calculatedMorningEarly = outEval.earlyMinutes;
    } else if (typeof raw.morningEarlyMinutes === 'number') {
      calculatedMorningEarly = raw.morningEarlyMinutes;
    }

    let calculatedAfternoonLate = 0;
    if (afternoonCheckIn && afternoonCheckIn !== '--:--') {
      const inEval = evaluatePunchIn(afternoonCheckIn, shiftHours.afternoonStart || '13:30', 'ca chiều');
      calculatedAfternoonLate = inEval.lateMinutes;
    } else if (typeof raw.afternoonLateMinutes === 'number') {
      calculatedAfternoonLate = raw.afternoonLateMinutes;
    }

    let calculatedAfternoonEarly = 0;
    let calculatedOtHours = 0;
    if (afternoonCheckOut && afternoonCheckOut !== '--:--') {
      const outEval = evaluatePunchOut(afternoonCheckOut, shiftHours.afternoonEnd || '17:30', 'ca chiều', 30);
      calculatedAfternoonEarly = outEval.earlyMinutes;
      calculatedOtHours = outEval.otHours;
    } else {
      if (typeof raw.afternoonEarlyMinutes === 'number') calculatedAfternoonEarly = raw.afternoonEarlyMinutes;
      if (typeof raw.otHours === 'number') calculatedOtHours = raw.otHours;
    }

    const leaveInfo = raw.leaveInfo || null;
    // Chỉ tính nghỉ phép vào ca làm việc khi đơn ĐÃ ĐƯỢC PHÊ DUYỆT (status === 'approved')
    const isApprovedLeaveMorning = Boolean(
      leaveInfo &&
        leaveInfo.status === 'approved' &&
        (leaveInfo.leaveSession === 'all_day' || leaveInfo.leaveSession === 'morning')
    );
    const isApprovedLeaveAfternoon = Boolean(
      leaveInfo &&
        leaveInfo.status === 'approved' &&
        (leaveInfo.leaveSession === 'all_day' || leaveInfo.leaveSession === 'afternoon')
    );
    const isApprovedLeaveFullDay = Boolean(
      leaveInfo && leaveInfo.status === 'approved' && leaveInfo.leaveSession === 'all_day'
    );

    const hasActualMorningWork = Boolean(
      morningCheckIn && morningCheckIn !== '--:--'
    );
    const hasActualAfternoonWork = Boolean(
      afternoonCheckIn && afternoonCheckIn !== '--:--'
    );

    if (isApprovedLeaveMorning && !hasActualMorningWork) {
      calculatedMorningLate = 0;
      calculatedMorningEarly = 0;
    }
    if (isApprovedLeaveAfternoon && !hasActualAfternoonWork) {
      calculatedAfternoonLate = 0;
      calculatedAfternoonEarly = 0;
    }

    const actualMorningCredit =
      typeof raw.morningCredit === 'number'
        ? raw.morningCredit
        : morningCheckIn !== '--:--' && morningCheckOut !== '--:--'
          ? calculateShiftCredit(calculatedMorningLate, calculatedMorningEarly, true).workCredit
          : raw.workCredit === 0.5
            ? 0.5
            : raw.workCredit === 1.0
              ? 0.5
              : 0;

    const actualAfternoonCredit =
      typeof raw.afternoonCredit === 'number'
        ? raw.afternoonCredit
        : afternoonCheckIn !== '--:--' && afternoonCheckOut !== '--:--'
          ? calculateShiftCredit(calculatedAfternoonLate, calculatedAfternoonEarly, true).workCredit
          : raw.workCredit === 1.0
            ? 0.5
            : 0;

    const approvedLeaveMorningCredit = isApprovedLeaveMorning
      ? typeof leaveInfo?.morningPaidCredit === 'number'
        ? leaveInfo.morningPaidCredit
        : leaveInfo?.isPaidLeave
          ? 0.5
          : 0
      : 0;

    const approvedLeaveAfternoonCredit = isApprovedLeaveAfternoon
      ? typeof leaveInfo?.afternoonPaidCredit === 'number'
        ? leaveInfo.afternoonPaidCredit
        : leaveInfo?.isPaidLeave
          ? 0.5
          : 0
      : 0;

    // Bảo toàn công thực tế đã chấm: nếu nhân viên có chấm công thực tế thì giữ nguyên, hoặc lấy công phép đã duyệt
    const mCredit = isApprovedLeaveMorning
      ? Math.max(actualMorningCredit, approvedLeaveMorningCredit)
      : actualMorningCredit;

    const aCredit = isApprovedLeaveAfternoon
      ? Math.max(actualAfternoonCredit, approvedLeaveAfternoonCredit)
      : actualAfternoonCredit;

    const totCredit =
      typeof raw.totalCredit === 'number' && !leaveInfo
        ? raw.totalCredit
        : typeof raw.workCredit === 'number' && !leaveInfo
          ? raw.workCredit
          : Math.min(1.0, mCredit + aCredit);

    let computedStatusLabel =
      raw.statusLabel ||
      (totCredit === 1.0
        ? 'Đủ 1.0 công chuẩn 2 ca'
        : totCredit === 0.5
          ? '0.5 công'
          : calculatedMorningLate > 0 || calculatedMorningEarly > 0
            ? `Vi phạm (${calculatedMorningLate > 0 ? `Muộn ${calculatedMorningLate}p` : ''}${calculatedMorningLate > 0 && calculatedMorningEarly > 0 ? ', ' : ''}${calculatedMorningEarly > 0 ? `Sớm ${calculatedMorningEarly}p` : ''})`
            : 'Nghỉ làm');

    if (leaveInfo) {
      const sesLbl =
        leaveInfo.leaveSession === 'morning'
          ? 'Buổi sáng'
          : leaveInfo.leaveSession === 'afternoon'
            ? 'Buổi chiều'
            : 'Cả ngày';
      if (leaveInfo.status === 'approved') {
        computedStatusLabel = `${leaveInfo.leaveCategoryLabel} • ${sesLbl} (${totCredit.toFixed(1)} công)`;
      } else if (leaveInfo.status === 'rejected') {
        const isAbsentMorning =
          (leaveInfo.leaveSession === 'all_day' || leaveInfo.leaveSession === 'morning') &&
          !hasActualMorningWork;
        const isAbsentAfternoon =
          (leaveInfo.leaveSession === 'all_day' || leaveInfo.leaveSession === 'afternoon') &&
          !hasActualAfternoonWork;
        if (isAbsentMorning || isAbsentAfternoon) {
          computedStatusLabel = 'Vắng mặt chưa được chấp thuận • Chờ Nhân sự kiểm tra';
        } else {
          computedStatusLabel = `Đơn nghỉ từ chối • Đi làm bình thường (${totCredit.toFixed(1)} công)`;
        }
      } else {
        // status === 'pending'
        if (hasActualMorningWork || hasActualAfternoonWork) {
          computedStatusLabel = `Đi làm bình thường (${totCredit.toFixed(1)} công) • Đơn nghỉ chờ duyệt`;
        } else {
          computedStatusLabel = `Chờ phê duyệt: ${leaveInfo.leaveCategoryLabel} (${sesLbl})`;
        }
      }
    }

    return {
      id: raw.id || `TK-${Date.now()}`,
      dateStr: raw.dateStr || dynamicTodayStr,
      dayOfWeek: raw.dayOfWeek || dynamicDayName,
      morningCheckIn,
      morningCheckOut,
      morningCredit: mCredit,
      morningLateMinutes: calculatedMorningLate,
      morningEarlyMinutes: calculatedMorningEarly,
      morningStatus:
        raw.morningStatus ||
        (mCredit > 0 ? 'completed' : morningCheckIn !== '--:--' ? 'working' : 'not_yet'),
      afternoonCheckIn,
      afternoonCheckOut,
      afternoonCredit: aCredit,
      afternoonLateMinutes: calculatedAfternoonLate,
      afternoonEarlyMinutes: calculatedAfternoonEarly,
      afternoonStatus:
        raw.afternoonStatus ||
        (aCredit > 0 ? 'completed' : afternoonCheckIn !== '--:--' ? 'working' : 'not_yet'),
      totalCredit: totCredit,
      otHours: calculatedOtHours,
      totalWorkHoursFormatted:
        raw.totalWorkHoursFormatted ||
        raw.workHoursFormatted ||
        (totCredit > 0 ? `${totCredit * 8} giờ` : '0 giờ 00 phút'),
      locationName:
        raw.locationName ||
        raw.checkInLocation ||
        (leaveInfo && !hasActualMorningWork && !hasActualAfternoonWork
          ? leaveInfo.status === 'rejected'
            ? 'Vắng mặt chưa được chấp thuận (Chờ NS xác minh)'
            : `Nghỉ phép (${leaveInfo.leaveCategoryLabel})`
          : 'Trụ sở chính và Văn phòng điều hành Seajong'),
      locationCoords:
        typeof raw.locationCoords === 'object'
          ? raw.locationCoords
          : { lat: 21.047219, lng: 105.770514 },
      method: raw.method || raw.checkInMethod || 'Mạng dây LAN nội bộ Seajong',
      statusLabel: computedStatusLabel,
      note: raw.note || '',
      explanationStatus: leaveInfo
        ? leaveInfo.status === 'approved'
          ? 'approved'
          : leaveInfo.status === 'rejected'
            ? 'rejected'
            : 'pending'
        : raw.explanationStatus ||
          (calculatedMorningLate > 0 ||
          calculatedMorningEarly > 0 ||
          calculatedAfternoonLate > 0 ||
          calculatedAfternoonEarly > 0
            ? 'pending'
            : 'none'),
      registeredLunch:
        isApprovedLeaveFullDay && !hasActualMorningWork && !hasActualAfternoonWork
          ? false
          : Boolean(
              raw.registeredLunch !== undefined
                ? raw.registeredLunch
                : raw.dateStr === dynamicTodayStr
                  ? registerLunch
                  : false
            ),
      registeredDinner:
        isApprovedLeaveFullDay && !hasActualMorningWork && !hasActualAfternoonWork
          ? false
          : Boolean(
              raw.registeredDinner !== undefined
                ? raw.registeredDinner
                : raw.dateStr === dynamicTodayStr
                  ? registerDinner
                  : false
            ),
      leaveInfo,
    };
  };

  // Lấy dữ liệu thực tế từ Backend API CSDL Seajong
  useEffect(() => {
    let isMounted = true;

    const applyTodayRecord = (list: TimekeepingRecord[]) => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const found = list.find((r) => r.dateStr === todayStr);
      if (found) {
        if (found.morningCheckIn && found.morningCheckIn !== '--:--') setTodayMorningIn(found.morningCheckIn);
        if (found.morningCheckOut && found.morningCheckOut !== '--:--') setTodayMorningOut(found.morningCheckOut);
        if (found.afternoonCheckIn && found.afternoonCheckIn !== '--:--') setTodayAfternoonIn(found.afternoonCheckIn);
        if (found.afternoonCheckOut && found.afternoonCheckOut !== '--:--') setTodayAfternoonOut(found.afternoonCheckOut);
        if (typeof found.registeredLunch === 'boolean') {
          setRegisterLunch(found.registeredLunch);
          try { localStorage.setItem(`my_timekeeping_lunch_${todayStr}`, JSON.stringify(found.registeredLunch)); } catch {}
        }
        if (typeof found.registeredDinner === 'boolean') {
          setRegisterDinner(found.registeredDinner);
          try { localStorage.setItem(`my_timekeeping_dinner_${todayStr}`, JSON.stringify(found.registeredDinner)); } catch {}
        }
      }
    };

    const initData = async () => {
      if (!localStorage.getItem('seajong_meal_default_reset_v2')) {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.removeItem(`my_timekeeping_lunch_${today}`);
        localStorage.removeItem(`my_timekeeping_dinner_${today}`);
        localStorage.setItem('seajong_meal_default_reset_v2', 'true');
        setRegisterLunch(false);
        setRegisterDinner(false);
      }

      const targetUid = activeUser?.id || activeUser?.employee?.id;
      const targetEmail = activeUser?.email || activeUser?.employee?.workEmail;
      const targetName = activeUser?.name || activeUser?.employee?.fullName;

      let resolvedUser: any = null;
      try {
        const uRes = await fetch('/api/users');
        if (uRes.ok) {
          const users = await uRes.json();
          if (Array.isArray(users) && users.length > 0) {
            resolvedUser =
              users.find(
                (u: any) =>
                  (targetUid && (String(u.id) === String(targetUid) || String(u.employeeId) === String(targetUid) || String(u.userId) === String(targetUid))) ||
                  (targetEmail && String(u.email || '').toLowerCase() === String(targetEmail).toLowerCase()) ||
                  (targetName && String(u.name || '').toLowerCase() === String(targetName).toLowerCase())
              ) ||
              users.find((u: any) => u.code === 'SEAJONG-20260707-UQZK' || u.email === 'lecongvu@seajong.com') ||
              users[0];

            if (resolvedUser && isMounted) {
              setDbUser(resolvedUser);
            }
          }
        }
      } catch {}

      const realUid = resolvedUser?.employeeId || resolvedUser?.id || targetUid || targetEmail || 'lecongvu@seajong.com';

      try {
        const res = await fetch(`/api/timekeeping?userId=${encodeURIComponent(String(realUid))}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && isMounted) {
            const normalized = data.map(normalizeRecord);
            setRecords(normalized);
            applyTodayRecord(normalized);
            return;
          }
        }
      } catch {}

      if (isMounted) {
        setRecords([]);
      }
    };

    initData();

    const handleRefreshAttendance = () => {
      initData();
    };
    window.addEventListener('decodoor_request_created', handleRefreshAttendance);
    window.addEventListener('decodoor_request_updated', handleRefreshAttendance);

    return () => {
      isMounted = false;
      window.removeEventListener('decodoor_request_created', handleRefreshAttendance);
      window.removeEventListener('decodoor_request_updated', handleRefreshAttendance);
    };
  }, [activeUser?.id, activeUser?.email]);

  // Lưu danh sách vào Backend CSDL thực tế
  const saveRecords = (newRecords: TimekeepingRecord[], targetToSync?: TimekeepingRecord[]) => {
    setRecords(newRecords);
    const uid =
      currentEmployee?.id ||
      dbUser?.employeeId ||
      dbUser?.id ||
      (activeUser as any)?.employee?.id ||
      activeUser?.id ||
      activeUser?.email ||
      'lecongvu@seajong.com';

    const recordsPayload =
      targetToSync && targetToSync.length > 0 ? targetToSync : newRecords;

    fetch('/api/timekeeping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, records: recordsPayload }),
    }).catch(() => {});
  };

  // Cập nhật bản ghi hôm nay trong danh sách
  const updateTodayRecord = (
    morningIn: string,
    morningOut: string,
    afternoonIn: string,
    afternoonOut: string,
    customMsg?: string
  ) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayStr = dayNames[now.getDay()];

    // 1. Tính toán ca sáng
    let morningLateMinutes = 0;
    let morningEarlyMinutes = 0;
    let mCredit = 0;
    let morningStatus: 'not_yet' | 'working' | 'completed' = 'not_yet';

    if (morningIn && morningIn !== '--:--') {
      const inEval = evaluatePunchIn(morningIn, shiftHours.morningStart || '08:00', 'ca sáng');
      morningLateMinutes = inEval.lateMinutes;
      morningStatus = 'working';
    }

    if (morningOut && morningOut !== '--:--') {
      const outEval = evaluatePunchOut(morningOut, shiftHours.morningEnd || '12:00', 'ca sáng');
      morningEarlyMinutes = outEval.earlyMinutes;
      morningStatus = 'completed';
      const creditRes = calculateShiftCredit(morningLateMinutes, morningEarlyMinutes, true);
      mCredit = creditRes.workCredit;
    }

    // 2. Tính toán ca chiều và OT
    let afternoonLateMinutes = 0;
    let afternoonEarlyMinutes = 0;
    let aCredit = 0;
    let afternoonStatus: 'not_yet' | 'working' | 'completed' = 'not_yet';
    let otHours = 0;

    if (afternoonIn && afternoonIn !== '--:--') {
      const inEval = evaluatePunchIn(afternoonIn, shiftHours.afternoonStart || '13:30', 'ca chiều');
      afternoonLateMinutes = inEval.lateMinutes;
      afternoonStatus = 'working';
    }

    if (afternoonOut && afternoonOut !== '--:--') {
      const minOt = laborRulesData?.overtimeRule?.minOtMinutesRequired || 30;
      const outEval = evaluatePunchOut(afternoonOut, shiftHours.afternoonEnd || '17:30', 'ca chiều', minOt);
      afternoonEarlyMinutes = outEval.earlyMinutes;
      otHours = outEval.otHours;
      afternoonStatus = 'completed';
      const creditRes = calculateShiftCredit(afternoonLateMinutes, afternoonEarlyMinutes, true);
      aCredit = creditRes.workCredit;
    }

    const totCredit = mCredit + aCredit;

    const totalLate = morningLateMinutes + afternoonLateMinutes;
    const totalEarly = morningEarlyMinutes + afternoonEarlyMinutes;

    let statusTxt = 'Đang làm việc';
    if (totCredit === 1.0) {
      statusTxt = totalLate > 0 || totalEarly > 0
        ? `Đủ 1.0 công (${totalLate > 0 ? `Muộn ${totalLate}p` : ''}${totalLate > 0 && totalEarly > 0 ? ', ' : ''}${totalEarly > 0 ? `Sớm ${totalEarly}p` : ''})`
        : 'Đủ 1.0 công chuẩn 2 ca';
    } else if (totCredit > 0) {
      statusTxt = `Đạt ${totCredit} công${totalLate > 0 || totalEarly > 0 ? ` (${totalLate > 0 ? `Muộn ${totalLate}p` : ''}${totalLate > 0 && totalEarly > 0 ? ', ' : ''}${totalEarly > 0 ? `Sớm ${totalEarly}p` : ''})` : ''}`;
    } else if (totalLate > 0 || totalEarly > 0) {
      statusTxt = `Vi phạm (${totalLate > 0 ? `Muộn ${totalLate}p` : ''}${totalLate > 0 && totalEarly > 0 ? ', ' : ''}${totalEarly > 0 ? `Sớm ${totalEarly}p` : ''})`;
    }

    const updatedToday: TimekeepingRecord = {
      id: `TK-${y}${m}${d}`,
      dateStr: todayStr,
      dayOfWeek: dayStr,
      morningCheckIn: morningIn || '--:--',
      morningCheckOut: morningOut || '--:--',
      morningCredit: mCredit,
      morningLateMinutes,
      morningEarlyMinutes,
      morningStatus,
      afternoonCheckIn: afternoonIn || '--:--',
      afternoonCheckOut: afternoonOut || '--:--',
      afternoonCredit: aCredit,
      afternoonLateMinutes,
      afternoonEarlyMinutes,
      afternoonStatus,
      totalCredit: totCredit,
      otHours,
      totalWorkHoursFormatted: totCredit === 1.0 ? '8 giờ 00 phút' : totCredit > 0 ? `${totCredit * 8} giờ` : 'Đang làm việc',
      locationName: (authMode === 'outside' || isOutsideWork)
        ? (outsideLocationName.trim() ? `${outsideLocationName.trim()} • ${currentAddressName}` : `Công tác ngoài • ${currentAddressName}`)
        : currentAddressName,
      locationCoords: currentCoords,
      method: (authMode === 'outside' || isOutsideWork)
        ? 'Chấm công ngoài văn phòng qua GPS'
        : authMode === 'lan'
        ? 'Mạng dây LAN nội bộ Seajong'
        : 'Định vị GPS Geofence',
      statusLabel: (authMode === 'outside' || isOutsideWork) ? `${statusTxt} • Công tác ngoài` : statusTxt,
      note: customMsg || ((authMode === 'outside' || isOutsideWork) ? `Công tác ngoài: ${outsideLocationName.trim() || 'Làm việc tại công trình'}` : 'Chấm công đúng quy định'),
      explanationStatus: (morningLateMinutes > 0 || morningEarlyMinutes > 0 || afternoonLateMinutes > 0 || afternoonEarlyMinutes > 0) ? 'pending' : 'none',
      registeredLunch: registerLunch,
      registeredDinner: registerDinner,
    };

    const existingIndex = records.findIndex((r) => r.dateStr === todayStr);
    let newRecs: TimekeepingRecord[];
    let syncedToday: TimekeepingRecord = updatedToday;
    if (existingIndex >= 0) {
      newRecs = [...records];
      syncedToday = { ...newRecs[existingIndex], ...updatedToday };
      newRecs[existingIndex] = syncedToday;
    } else {
      newRecs = [updatedToday, ...records];
    }
    saveRecords(newRecs, [syncedToday]);
  };

  // 1. Thao tác: VÀO CA SÁNG hoặc BẮT ĐẦU
  const handleCheckInMorning = () => {
    if (isEmployeeInactive) {
      onShowToast('warning', 'Tài khoản đã khoá', `Nhân viên đang ở trạng thái ${employeeStatus === 'temporary_leave' ? 'Tạm nghỉ' : 'Đã nghỉ việc'}, không thể thực hiện chấm công.`);
      return;
    }
    if (isTodayMorningLeave) {
      onShowToast('info', 'Đang nghỉ phép ca sáng', `Bạn đã đăng ký ${todayLeaveInfo?.leaveCategoryLabel || 'Nghỉ phép'} vào ca sáng hôm nay nên không cần chấm công ca sáng.`);
      return;
    }
    if (hasMorningIn) {
      onShowToast('info', 'Đã chấm công', `Bạn đã quẹt vào ca sáng lúc ${todayMorningIn}, nút đã khoá để tránh bấm trùng lặp.`);
      return;
    }
    if (!isNetworkReadyForCheckIn) {
      onShowToast('warning', 'Chưa đủ điều kiện chấm công', networkLockReason || 'Vui lòng kết nối mạng nội bộ công ty hoặc bật định vị GPS hợp lệ để chấm công.');
      return;
    }
    if (isMorningEnded) {
      onShowToast('warning', 'Đã hết ca sáng', 'Ca làm việc buổi sáng đã kết thúc, nút chấm công ca sáng đã khoá');
      return;
    }
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setTodayMorningIn(timeNow);
    const actLabel = isOutside ? 'Bắt đầu' : 'Vào ca sáng';
    updateTodayRecord(timeNow, todayMorningOut, todayAfternoonIn, todayAfternoonOut, actLabel);
    const locDisplay = isOutside
      ? (outsideLocationName.trim() || currentAddressName)
      : currentAddressName;

    const inEval = evaluatePunchIn(timeNow, shiftHours.morningStart || '08:00', 'ca sáng');
    onShowToast(inEval.toastType, inEval.toastTitle, `${inEval.toastMessage} (tại ${locDisplay})`);
  };

  // 2. Thao tác: RA CA SÁNG hoặc KẾT THÚC - Nghỉ trưa, tính nửa công ca sáng
  const handleCheckOutMorning = () => {
    if (isEmployeeInactive) {
      onShowToast('warning', 'Tài khoản đã khoá', `Nhân viên đang ở trạng thái ${employeeStatus === 'temporary_leave' ? 'Tạm nghỉ' : 'Đã nghỉ việc'}, không thể thực hiện chấm công.`);
      return;
    }
    if (isTodayMorningLeave) {
      onShowToast('info', 'Đang nghỉ phép ca sáng', `Bạn đã đăng ký ${todayLeaveInfo?.leaveCategoryLabel || 'Nghỉ phép'} vào ca sáng hôm nay.`);
      return;
    }
    if (hasMorningOut) {
      onShowToast('info', 'Đã chấm công', `Bạn đã quẹt ra ca sáng lúc ${todayMorningOut}, nút đã khoá để tránh bấm trùng lặp.`);
      return;
    }
    if (!isNetworkReadyForCheckIn) {
      onShowToast('warning', 'Chưa đủ điều kiện chấm công', networkLockReason || 'Vui lòng kết nối mạng nội bộ công ty hoặc bật định vị GPS hợp lệ để chấm công.');
      return;
    }
    if (isMorningEnded) {
      onShowToast('warning', 'Đã hết ca sáng', 'Thời gian quẹt thẻ ra ca sáng đã kết thúc, nút chấm công ca sáng đã khoá');
      return;
    }
    if (!todayMorningIn || todayMorningIn === '--:--') {
      onShowToast('warning', isOutside ? 'Chưa bấm bắt đầu' : 'Chưa bấm giờ vào ca', isOutside ? 'Bạn chưa bấm bắt đầu hôm nay, nút kết thúc đang khoá' : 'Bạn chưa chấm công vào ca sáng hôm nay, nút bấm giờ ra đang khoá');
      return;
    }

    const mEndMins = parseTimeToMinutes(shiftHours.morningEnd || '12:00', 12 * 60);
    const nowCheck = new Date();
    const curMins = nowCheck.getHours() * 60 + nowCheck.getMinutes();
    const earlyMins = curMins < mEndMins ? mEndMins - curMins : 0;

    if (earlyMins > 0) {
      const confirmEarly = window.confirm(
        `⚠️ CẢNH BÁO VỀ SỚM SO VỚI QUY ĐỊNH:\n\n` +
        `• Giờ kết thúc ca sáng: ${shiftHours.morningEnd || '12:00'}\n` +
        `• Thời gian quẹt thẻ ra hiện tại sớm hơn quy định: ${earlyMins} phút.\n\n` +
        `Theo Nội quy lao động Seajong, việc ra về sớm sẽ bị tính vào thời gian vi phạm nội quy và ảnh hưởng xét tính công nếu không có giải trình được phê duyệt.\n\n` +
        `Bạn có chắc chắn muốn xác nhận quẹt thẻ ra ca sáng lúc này không?`
      );
      if (!confirmEarly) {
        return;
      }
    }

    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setTodayMorningOut(timeNow);
    const actLabel = isOutside ? 'Kết thúc ca sáng' : 'Hoàn thành ca sáng nửa công';
    updateTodayRecord(todayMorningIn, timeNow, todayAfternoonIn, todayAfternoonOut, actLabel);

    const outMins = parseTimeToMinutes(timeNow, mEndMins);
    const actualEarlyMins = outMins < mEndMins ? mEndMins - outMins : 0;
    if (actualEarlyMins > 0) {
      onShowToast('warning', `Về sớm ca sáng ${actualEarlyMins} phút`, `Giờ ra: ${timeNow}. Bạn về sớm ${actualEarlyMins} phút so với giờ quy định ${shiftHours.morningEnd || '12:00'}. Vui lòng gửi giải trình nếu có lý do chính đáng.`);
    } else {
      onShowToast('success', 'Ra ca sáng thành công', `Giờ ra: ${timeNow}. Bạn đã hoàn thành ca sáng. Nghỉ trưa từ ${shiftHours.morningEnd || '12:00'} đến ${shiftHours.afternoonStart || '13:30'}.`);
    }
  };

  // 3. Thao tác: VÀO CA CHIỀU hoặc BẮT ĐẦU
  const handleCheckInAfternoon = () => {
    if (isEmployeeInactive) {
      onShowToast('warning', 'Tài khoản đã khoá', `Nhân viên đang ở trạng thái ${employeeStatus === 'temporary_leave' ? 'Tạm nghỉ' : 'Đã nghỉ việc'}, không thể thực hiện chấm công.`);
      return;
    }
    if (isTodayAfternoonLeave) {
      onShowToast('info', 'Đang nghỉ phép ca chiều', `Bạn đã đăng ký ${todayLeaveInfo?.leaveCategoryLabel || 'Nghỉ phép'} vào ca chiều hôm nay nên không cần chấm công ca chiều.`);
      return;
    }
    if (hasAfternoonIn) {
      onShowToast('info', 'Đã chấm công', `Bạn đã quẹt vào ca chiều lúc ${todayAfternoonIn}, nút đã khoá để tránh bấm trùng lặp.`);
      return;
    }
    if (!isNetworkReadyForCheckIn) {
      onShowToast('warning', 'Chưa đủ điều kiện chấm công', networkLockReason || 'Vui lòng kết nối mạng nội bộ công ty hoặc bật định vị GPS hợp lệ để chấm công.');
      return;
    }
    if (!isAfternoonReady) {
      onShowToast('warning', 'Đang khoá', 'Hiện tại ca chiều đang khoá, nút chấm công ca chiều chưa mở');
      return;
    }
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setTodayAfternoonIn(timeNow);
    const actLabel = isOutside ? 'Bắt đầu ca chiều' : 'Vào ca chiều';
    updateTodayRecord(todayMorningIn, todayMorningOut, timeNow, todayAfternoonOut, actLabel);
    const locDisplay = isOutside
      ? (outsideLocationName.trim() || currentAddressName)
      : currentAddressName;

    const inEval = evaluatePunchIn(timeNow, shiftHours.afternoonStart || '13:30', 'ca chiều');
    onShowToast(inEval.toastType, inEval.toastTitle, `${inEval.toastMessage} (tại ${locDisplay})`);
  };

  // 4. Thao tác: RA CA CHIỀU hoặc KẾT THÚC - Tan làm, tính nửa công ca chiều
  const handleCheckOutAfternoon = () => {
    if (isEmployeeInactive) {
      onShowToast('warning', 'Tài khoản đã khoá', `Nhân viên đang ở trạng thái ${employeeStatus === 'temporary_leave' ? 'Tạm nghỉ' : 'Đã nghỉ việc'}, không thể thực hiện chấm công.`);
      return;
    }
    if (isTodayAfternoonLeave) {
      onShowToast('info', 'Đang nghỉ phép ca chiều', `Bạn đã đăng ký ${todayLeaveInfo?.leaveCategoryLabel || 'Nghỉ phép'} vào ca chiều hôm nay.`);
      return;
    }
    if (hasAfternoonOut) {
      onShowToast('info', 'Đã chấm công', `Bạn đã quẹt ra ca chiều lúc ${todayAfternoonOut}, nút đã khoá để tránh bấm trùng lặp.`);
      return;
    }
    if (!isNetworkReadyForCheckIn) {
      onShowToast('warning', 'Chưa đủ điều kiện chấm công', networkLockReason || 'Vui lòng kết nối mạng nội bộ công ty hoặc bật định vị GPS hợp lệ để chấm công.');
      return;
    }
    if (!isAfternoonReady) {
      onShowToast('warning', 'Đang khoá', 'Hiện tại ca chiều đang khoá, nút chấm công ca chiều chưa mở');
      return;
    }
    if (!todayAfternoonIn || todayAfternoonIn === '--:--') {
      onShowToast('warning', isOutside ? 'Chưa bấm bắt đầu' : 'Chưa bấm giờ vào ca', isOutside ? 'Bạn chưa bấm bắt đầu ca chiều hôm nay, nút kết thúc đang khoá' : 'Bạn chưa chấm công vào ca chiều hôm nay, nút bấm giờ ra đang khoá');
      return;
    }

    const aEndMins = parseTimeToMinutes(shiftHours.afternoonEnd || '17:30', 17 * 60 + 30);
    const nowCheck = new Date();
    const curMins = nowCheck.getHours() * 60 + nowCheck.getMinutes();
    const earlyMins = curMins < aEndMins ? aEndMins - curMins : 0;

    if (earlyMins > 0) {
      const confirmEarly = window.confirm(
        `⚠️ CẢNH BÁO VỀ SỚM SO VỚI QUY ĐỊNH:\n\n` +
        `• Giờ tan ca chiều: ${shiftHours.afternoonEnd || '17:30'}\n` +
        `• Thời gian quẹt thẻ ra hiện tại sớm hơn quy định: ${earlyMins} phút.\n\n` +
        `Theo Nội quy lao động Seajong, việc ra về sớm sẽ bị tính vào thời gian vi phạm nội quy và ảnh hưởng xét tính công nếu không có giải trình được phê duyệt.\n\n` +
        `Bạn có chắc chắn muốn xác nhận quẹt thẻ tan ca chiều lúc này không?`
      );
      if (!confirmEarly) {
        return;
      }
    }

    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setTodayAfternoonOut(timeNow);
    const actLabel = isOutside ? 'Kết thúc ca chiều' : 'Hoàn thành ca chiều nửa công';
    updateTodayRecord(todayMorningIn, todayMorningOut, todayAfternoonIn, timeNow, actLabel);

    const outMins = parseTimeToMinutes(timeNow, aEndMins);
    const actualEarlyMins = outMins < aEndMins ? aEndMins - outMins : 0;
    const otMins = outMins > aEndMins ? outMins - aEndMins : 0;
    const minOtReq = laborRulesData?.overtimeRule?.minOtMinutesRequired || 30;

    if (actualEarlyMins > 0) {
      onShowToast('warning', `Về sớm ca chiều ${actualEarlyMins} phút`, `Giờ ra: ${timeNow}. Bạn tan ca trước giờ quy định ${shiftHours.afternoonEnd || '17:30'} (${actualEarlyMins} phút).`);
    } else if (otMins >= minOtReq) {
      const otHours = Math.round((otMins / 60) * 10) / 10;
      onShowToast('success', `Tan làm và Ghi nhận Tăng ca (+${otHours}h OT)`, `Giờ ra: ${timeNow}. Hoàn tất ngày công và ghi nhận thêm ${otHours} giờ làm thêm OT theo nội quy công ty.`);
    } else {
      onShowToast('success', 'Tan làm ca chiều đúng giờ', `Giờ ra: ${timeNow}. Chúc mừng bạn đã hoàn thành trọn vẹn ngày làm việc hôm nay!`);
    }
  };

  // Mở modal gửi giải trình / xin nghỉ phép
  const handleOpenExplanation = (record?: TimekeepingRecord) => {
    const target = record || records[0];
    setExplanationRecord(target);
    if (target?.leaveInfo) {
      setExplanationReasonType('leave_request');
      setModalLeaveCategory(target.leaveInfo.leaveCategory || 'annual');
      setModalLeaveSession(target.leaveInfo.leaveSession || 'all_day');
      setExplanationContent(target.leaveInfo.reason || '');
    } else {
      setExplanationReasonType('forget_morning_in');
      setModalLeaveCategory('annual');
      setModalLeaveSession('all_day');
      setExplanationContent('');
    }
    setProposedCheckIn('08:00');
    setProposedCheckOut('17:30');
    setShowExplanationModal(true);
  };

  // Gửi giải trình chấm công hoặc đơn xin nghỉ phép và lưu vào bảng PersonalRequest thực tế
  const handleSubmitExplanation = async () => {
    if (!explanationContent.trim()) {
      onShowToast('warning', 'Thiếu nội dung', 'Vui lòng nhập lý do chi tiết');
      return;
    }

    if (explanationRecord) {
      const isLeaveReq = explanationReasonType === 'leave_request';
      const isPaidLeave = modalLeaveCategory === 'annual' || modalLeaveCategory === 'special';
      const leaveCatLabel =
        modalLeaveCategory === 'annual'
          ? 'Nghỉ phép năm hưởng lương'
          : modalLeaveCategory === 'special'
            ? 'Nghỉ hưởng lương theo chế độ'
            : modalLeaveCategory === 'sick'
              ? 'Nghỉ theo chính sách (Ốm/BHXH)'
              : 'Nghỉ không hưởng lương';
      const leaveDaysNum = modalLeaveSession === 'all_day' ? 1 : 0.5;

      const payload: Record<string, any> = isLeaveReq
        ? {
            type: 'leave',
            title: `Xin nghỉ phép (${leaveCatLabel}) ngày ${explanationRecord.dateStr}`,
            content: explanationContent,
            leaveCategory: modalLeaveCategory,
            leaveSession: modalLeaveSession,
            leaveFromDate: explanationRecord.dateStr,
            leaveToDate: explanationRecord.dateStr,
            leaveDays: leaveDaysNum,
            approver: approverName,
            applicantName: currentEmployee.name,
            applicantRole: currentEmployee.role,
            department: currentEmployee.department,
            userId: currentEmployee.id,
            userEmail: currentEmployee.email,
            status: 'pending',
          }
        : {
            type: 'late_early',
            title: `Giải trình chấm công ngày ${explanationRecord.dateStr}`,
            content: explanationContent,
            lateEarlyDate: explanationRecord.dateStr,
            lateEarlyTargetTime: `${proposedCheckIn} - ${proposedCheckOut}`,
            approver: approverName,
            applicantName: currentEmployee.name,
            applicantRole: currentEmployee.role,
            department: currentEmployee.department,
            userId: currentEmployee.id,
            userEmail: currentEmployee.email,
            status: 'pending',
          };

      try {
        await fetch('/api/personal-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Tải lại bảng chấm công thực tế từ CSDL để đồng bộ ngay lập tức (đơn ở trạng thái Chờ phê duyệt, không khóa chấm công)
        const realUid = currentEmployee.id || dbUser?.employeeId || dbUser?.id || activeUser?.id || 'lecongvu@seajong.com';
        const tkRes = await fetch(`/api/timekeeping?userId=${encodeURIComponent(String(realUid))}`);
        if (tkRes.ok) {
          const tkData = await tkRes.json();
          if (Array.isArray(tkData)) {
            const normalized = tkData.map(normalizeRecord);
            setRecords(normalized);
          }
        }
      } catch {
        const updated = records.map((r) => {
          if (r.id === explanationRecord.id || r.dateStr === explanationRecord.dateStr) {
            return {
              ...r,
              explanationStatus: 'pending' as any,
              note: `${isLeaveReq ? leaveCatLabel : 'Giải trình'}: ${explanationContent.slice(0, 40)}...`,
              leaveInfo: isLeaveReq
                ? {
                    status: 'pending' as const,
                    leaveCategory: modalLeaveCategory,
                    leaveCategoryLabel: leaveCatLabel,
                    leaveSession: modalLeaveSession,
                    isPaidLeave,
                    reason: explanationContent,
                    approver: approverName,
                  }
                : r.leaveInfo,
            };
          }
          return r;
        });
        saveRecords(updated);
      }

      window.dispatchEvent(new CustomEvent('decodoor_request_created'));
      setShowExplanationModal(false);

      if (isLeaveReq) {
        onShowToast(
          'success',
          'Đã gửi đơn xin nghỉ (Chờ phê duyệt)',
          `Đơn xin nghỉ (${modalLeaveSession === 'all_day' ? 'Cả ngày' : modalLeaveSession === 'morning' ? 'Buổi sáng' : 'Buổi chiều'}) ngày ${explanationRecord.dateStr} đã chuyển sang trạng thái "Chờ phê duyệt". Trong thời gian chờ duyệt, bạn vẫn được chấm công bình thường.`
        );
      } else {
        onShowToast('success', 'Đã gửi giải trình', 'Đơn giải trình chấm công đã được chuyển tới Trưởng bộ phận xem xét duyệt');
      }
      return;
    }

    setShowExplanationModal(false);
  };

  // Thông tin nhân viên hiện tại (Liên kết trực tiếp từ CSDL Seajong)
  const currentEmployee = useMemo(() => {
    try {
      const targetUser = dbUser || activeUser;
      if (targetUser) {
        const u = targetUser;
        const empObj = u.employee || {};
        const fullName =
          u.name && !String(u.name).includes('— Admin')
            ? u.name
            : empObj.fullName || 'Lê Công Vụ';
        const cleanName = fullName.replace(/\(.*?\)/g, '').trim();
        const nameParts = cleanName.split(/\s+/).filter(Boolean);
        const initials =
          u.avatarText ||
          (nameParts.length > 1
            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
            : cleanName.slice(0, 2).toUpperCase() || 'LV');
        return {
          id: u.employeeId || empObj.id || u.id || 'cmra9q6qk00038oq7i8pxa8fs',
          name: fullName,
          role: u.position || empObj.position || (u.role === 'ADMIN' ? 'Giám đốc' : 'Nhân viên'),
          department: u.department || empObj.departmentName || 'Ban Giám đốc',
          code: u.code || empObj.code || 'SEAJONG-20260707-UQZK',
          email: u.email || empObj.workEmail || 'lecongvu@seajong.com',
          initials,
          status: u.status || 'Đang làm việc',
          avatarColor: u.avatarColor || '#ca8a04',
        };
      }
    } catch {}
    return {
      id: 'cmra9q6qk00038oq7i8pxa8fs',
      name: 'Lê Công Vụ',
      role: 'Giám đốc',
      department: 'Ban Giám đốc',
      code: 'SEAJONG-20260707-UQZK',
      email: 'lecongvu@seajong.com',
      initials: 'LV',
      status: 'Đang làm việc',
      avatarColor: '#ca8a04',
    };
  }, [dbUser, activeUser]);

  // Lọc theo tháng: ví dụ '2026-10', '2026-09'
  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const defaultMonthStr = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthStr);

  useEffect(() => {
    const validMonths = Array.from({ length: currentMonthNum }, (_, i) => `${currentYearNum}-${String(i + 1).padStart(2, '0')}`);
    if (!validMonths.includes(selectedMonth)) {
      setSelectedMonth(defaultMonthStr);
    }
  }, [currentMonthNum, currentYearNum, defaultMonthStr, selectedMonth]);
  // Lọc bảng theo phân loại: 'all' | 'work' | 'late_early' | 'ot'
  const [tableFilter, setTableFilter] = useState<'all' | 'work' | 'late_early' | 'ot'>('all');

  // Danh sách bản ghi theo chu kỳ tháng được chọn
  const monthRecords = useMemo(() => {
    if (selectedMonth === 'all') return records;
    return records.filter((r) => r.dateStr.startsWith(selectedMonth));
  }, [records, selectedMonth]);

  // 1. Tổng số công tích lũy
  const totalWorkCredit = useMemo(() => {
    return monthRecords.reduce((acc, r) => acc + (r.totalCredit || 0), 0);
  }, [monthRecords]);

  // 2. Tổng số phút đi muộn
  const totalLateMinutes = useMemo(() => {
    return monthRecords.reduce(
      (acc, r) => acc + (r.morningLateMinutes || 0) + (r.afternoonLateMinutes || 0),
      0
    );
  }, [monthRecords]);

  // 3. Tổng số phút về sớm (cả ca sáng và ca chiều)
  const totalEarlyMinutes = useMemo(() => {
    return monthRecords.reduce((acc, r) => acc + (r.morningEarlyMinutes || 0) + (r.afternoonEarlyMinutes || 0), 0);
  }, [monthRecords]);

  // Số ngày đi làm thực tế
  const workedDaysCount = useMemo(() => {
    return monthRecords.filter((r) => r.totalCredit > 0).length;
  }, [monthRecords]);

  // Số ngày đi muộn hoặc về sớm
  const lateEarlyCount = useMemo(() => {
    return monthRecords.filter(
      (r) => (r.morningLateMinutes || 0) + (r.morningEarlyMinutes || 0) + (r.afternoonLateMinutes || 0) + (r.afternoonEarlyMinutes || 0) > 0
    ).length;
  }, [monthRecords]);

  // Số buổi làm thêm giờ (OT)
  const otOccurrences = useMemo(() => {
    return monthRecords.filter((r) => (r.otHours || 0) > 0).length;
  }, [monthRecords]);

  // Số suất ăn trưa (các ngày có đăng ký ăn trưa)
  const totalLunchCount = useMemo(() => {
    const now = new Date();
    const realTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return monthRecords.filter((r) => {
      if (r.dateStr === realTodayStr) return registerLunch;
      return Boolean(r.registeredLunch);
    }).length;
  }, [monthRecords, registerLunch]);

  // Số suất ăn tối (các ngày có đăng ký ăn tối)
  const totalDinnerCount = useMemo(() => {
    const now = new Date();
    const realTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return monthRecords.filter((r) => {
      if (r.dateStr === realTodayStr) return registerDinner;
      return Boolean(r.registeredDinner);
    }).length;
  }, [monthRecords, registerDinner]);

  // Hàm hiển thị giờ không có giây (HH:mm)
  const formatTimeWithoutSeconds = (timeStr?: string) => {
    if (!timeStr || timeStr === '--:--' || timeStr === '--:--:--') return '--:--';
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  // Hàm chuyển đổi thứ sang định dạng ngắn (Thứ 2 - Thứ 7, Chủ nhật)
  const formatShortDayName = (dateStr: string, dayOfWeekStr?: string) => {
    if (dayOfWeekStr) {
      if (dayOfWeekStr.includes('Chủ Nhật') || dayOfWeekStr.includes('Chủ nhật') || dayOfWeekStr === 'CN') return 'Chủ nhật';
      if (dayOfWeekStr.includes('Hai') || dayOfWeekStr === 'Thứ 2') return 'Thứ 2';
      if (dayOfWeekStr.includes('Ba') || dayOfWeekStr === 'Thứ 3') return 'Thứ 3';
      if (dayOfWeekStr.includes('Tư') || dayOfWeekStr === 'Thứ 4') return 'Thứ 4';
      if (dayOfWeekStr.includes('Năm') || dayOfWeekStr === 'Thứ 5') return 'Thứ 5';
      if (dayOfWeekStr.includes('Sáu') || dayOfWeekStr === 'Thứ 6') return 'Thứ 6';
      if (dayOfWeekStr.includes('Bảy') || dayOfWeekStr === 'Thứ 7') return 'Thứ 7';
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const dayIdx = d.getDay();
      return dayIdx === 0 ? 'Chủ nhật' : `Thứ ${dayIdx + 1}`;
    }
    return dayOfWeekStr || '';
  };

  // Danh sách đầy đủ các ngày trong tháng (hiển thị theo thứ tự từ ngày cuối tháng về ngày 1)
  const fullMonthRecords = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;

    if (selectedMonth === 'all') {
      return [...records]
        .filter((r) => r.dateStr <= todayStr)
        .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    }

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!year || !month) return monthRecords;

    const daysInMonth = new Date(year, month, 0).getDate();
    const recordsMap = new Map<string, TimekeepingRecord>();
    records.forEach((r) => {
      recordsMap.set(r.dateStr, r);
    });

    const fullList: TimekeepingRecord[] = [];
    for (let day = daysInMonth; day >= 1; day--) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

      // Chỉ hiển thị dữ liệu đến ngày hôm nay nếu đang ở tháng hiện tại
      if (selectedMonth === `${currentYear}-${currentMonth}` && dateStr > todayStr) {
        continue;
      }

      if (recordsMap.has(dateStr)) {
        fullList.push(recordsMap.get(dateStr)!);
      } else {
        const d = new Date(year, month - 1, day);
        const dayIdx = d.getDay();
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = dayNames[dayIdx] || `Thứ ${dayIdx + 1}`;
        fullList.push({
          id: `TK-${dateStr.replace(/-/g, '')}`,
          dateStr,
          dayOfWeek: dayName,
          morningCheckIn: '--:--',
          morningCheckOut: '--:--',
          morningCredit: 0,
          morningLateMinutes: 0,
          morningStatus: 'not_yet',
          afternoonCheckIn: '--:--',
          afternoonCheckOut: '--:--',
          afternoonCredit: 0,
          afternoonLateMinutes: 0,
          afternoonEarlyMinutes: 0,
          afternoonStatus: 'not_yet',
          totalCredit: 0,
          otHours: 0,
          totalWorkHoursFormatted: '0 giờ 00 phút',
          locationName: 'Chưa chấm công',
          method: 'Chưa có',
          statusLabel: 'Chưa chấm công',
          note: '',
          explanationStatus: 'none',
        });
      }
    }
    return fullList;
  }, [records, selectedMonth, monthRecords]);

  // Danh sách hiển thị sau khi lọc bảng
  const displayRecords = useMemo(() => {
    return fullMonthRecords.filter((r) => {
      if (tableFilter === 'work') return r.totalCredit > 0;
      if (tableFilter === 'late_early') {
        return (
          (r.morningLateMinutes || 0) +
            (r.morningEarlyMinutes || 0) +
            (r.afternoonLateMinutes || 0) +
            (r.afternoonEarlyMinutes || 0) >
          0
        );
      }
      if (tableFilter === 'ot') return (r.otHours || 0) > 0;
      return true;
    });
  }, [fullMonthRecords, tableFilter]);

  const renderLeftContent = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
        flex: 1,
        minHeight: 0,
      }}
    >
        {/* Banner gợi ý vuốt mở Bảng công trên điện thoại và iPad/tablet */}
        {isTabletOrMobile && (
          <div
            onClick={() => setShowMobileRightColumn(true)}
            style={{
              backgroundColor: '#eff6ff',
              border: '1px dashed #93c5fd',
              borderRadius: '8px',
              padding: '9px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: '#1e40af', fontWeight: 700 }}>
              <ChevronLeft size={14} /> Vuốt sang trái để xem Bảng công &amp; KPI
            </div>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 800,
                color: '#2563eb',
                backgroundColor: '#dbeafe',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              Mở bảng công ›
            </span>
          </div>
        )}

        {/* VÙNG CHỨC NĂNG CỘT TRÁI */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            width: '100%',
            flex: 1,
            minHeight: 0,
          }}
        >
        {/* KHỐI 1: ĐỒNG HỒ ĐIỆN TỬ VÀ 2 THẺ CA SÁNG VÀ CA CHIỀU */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '18px',
          }}
        >
            {/* DÒNG NẰM CÙNG NHAU: NÚT QUY TẮC TÍNH CÔNG BÊN TRÁI VÀ ĐỒNG HỒ ĐIỆN TỬ BÊN PHẢI */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              {/* Nút Quy tắc tính công gọi Offcanvas rộng 400px */}
              <button
                type="button"
                onClick={() => setShowRulesOffcanvas(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  borderRadius: '7px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(21, 128, 61, 0.05)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dcfce7';
                  e.currentTarget.style.borderColor = '#86efac';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                  e.currentTarget.style.borderColor = '#bbf7d0';
                }}
              >
                <JournalText size={15} color="#16a34a" /> Quy tắc tính công
              </button>

              {/* Đồng hồ điện tử thời gian thực */}
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: isMobileScreen ? '1.75rem' : '2.05rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '1px',
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {currentTime || '08:00:00'}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  <span className="timekeeping-date-full">
                    {currentDateStr || 'Đang cập nhật lịch...'}
                  </span>
                  <span className="timekeeping-date-short">
                    {currentDateShortStr || 'Đang cập nhật...'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2 THẺ CA SÁNG VÀ CA CHIỀU */}
            <div
              style={{
                marginTop: '10px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}
            >
              {/* THẺ 1: CA SÁNG */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: isMorningEnded ? '1px solid #e2e8f0' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  opacity: isMorningEnded ? 0.9 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isMorningEnded ? '#64748b' : '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sun size={13} /> CA SÁNG
                  </span>
                  <span
                    title={isMorningEnded ? 'Đã hết ca sáng' : (!isNetworkReadyForCheckIn ? (networkLockReason || 'Chưa đáp ứng điều kiện chấm công') : '0.5 công')}
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: isMorningEnded ? '#dc2626' : (!isNetworkReadyForCheckIn ? '#b45309' : '#16a34a'),
                      backgroundColor: isMorningEnded ? '#fef2f2' : (!isNetworkReadyForCheckIn ? '#fef3c7' : '#f0fdf4'),
                      border: isMorningEnded ? '1px solid #fecaca' : (!isNetworkReadyForCheckIn ? '1px solid #fde68a' : '1px solid #bbf7d0'),
                      padding: (isMorningEnded || !isNetworkReadyForCheckIn) && isMobileScreen ? '2px 5px' : '1px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                    }}
                  >
                    {isMorningEnded ? (
                      <>
                        <LockFill size={10} />
                        <span className="timekeeping-lock-text" style={{ display: isMobileScreen ? 'none' : 'inline' }}>
                          Đã hết ca sáng
                        </span>
                      </>
                    ) : !isNetworkReadyForCheckIn ? (
                      <>
                        <LockFill size={10} />
                        <span className="timekeeping-lock-text" style={{ display: isMobileScreen ? 'none' : 'inline' }}>
                          {authMode === 'gps' && locationRangeCheck && !locationRangeCheck.isInside ? 'Ngoài bán kính' : 'Chưa đủ mạng'}
                        </span>
                      </>
                    ) : (
                      '0.5 công'
                    )}
                  </span>
                </div>

                {/* Nút Vào Ca Sáng hoặc Bắt đầu */}
                <button
                  type="button"
                  onClick={handleCheckInMorning}
                  disabled={isMorningInLocked}
                  title={
                    hasMorningIn
                      ? `Đã chấm công vào ca sáng (${todayMorningIn}) - Nút đã khoá tránh bấm trùng lặp`
                      : (isMorningEnded
                        ? 'Đã hết ca sáng - Nút chấm công đã khoá'
                        : (!isNetworkReadyForCheckIn
                          ? (networkLockReason || 'Chưa đáp ứng điều kiện chấm công - Nút đã khoá')
                          : (isOutside ? 'Bắt đầu làm việc' : 'Chấm công vào ca sáng')))
                  }
                  style={{
                    width: '100%',
                    padding: '7px 4px',
                    borderRadius: '6px',
                    border: isMorningInLocked ? '1px solid #cbd5e1' : 'none',
                    backgroundColor: isMorningInLocked ? '#f1f5f9' : '#16a34a',
                    color: isMorningInLocked ? (hasMorningIn ? '#475569' : '#94a3b8') : '#ffffff',
                    cursor: isMorningInLocked ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    boxShadow: isMorningInLocked ? 'none' : '0 1px 3px rgba(22, 163, 74, 0.2)',
                    transition: 'all 0.15s ease',
                    opacity: isMorningInLocked ? (hasMorningIn ? 0.9 : 0.75) : 1,
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isMorningInLocked && <LockFill size={10} />}
                    {isOutside ? 'BẮT ĐẦU' : 'VÀO CA SÁNG'}
                  </span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: hasMorningIn ? '#15803d' : undefined }}>
                    {hasMorningIn
                      ? `Giờ vào: ${todayMorningIn}`
                      : (isMorningEnded
                        ? 'Đã hết ca sáng'
                        : (!isNetworkReadyForCheckIn
                          ? networkLockSubtext
                          : (isOutside ? 'Bấm bắt đầu' : 'Bấm vào ca')))}
                  </span>
                </button>

                {/* Nút Ra Ca Sáng hoặc Kết thúc */}
                <button
                  type="button"
                  onClick={handleCheckOutMorning}
                  disabled={isMorningCheckOutLocked}
                  title={
                    hasMorningOut
                      ? `Đã chấm công ra ca sáng (${todayMorningOut}) - Nút đã khoá tránh bấm trùng lặp`
                      : (!hasMorningIn
                        ? (isOutside ? 'Chưa bấm bắt đầu - Khoá nút kết thúc' : 'Chưa bấm giờ vào ca sáng - Khoá nút bấm giờ ra')
                        : (isMorningEnded
                          ? 'Đã hết ca sáng - Nút chấm công đã khoá'
                          : (!isNetworkReadyForCheckIn
                            ? (networkLockReason || 'Chưa đáp ứng điều kiện chấm công - Nút đã khoá')
                            : (isOutside ? 'Kết thúc ca sáng' : 'Chấm công ra ca sáng'))))
                  }
                  style={{
                    width: '100%',
                    padding: '7px 4px',
                    borderRadius: '6px',
                    border: isMorningCheckOutLocked
                      ? '1px solid #cbd5e1'
                      : (hasMorningOut ? '1px solid #bbf7d0' : '1px solid #16a34a'),
                    backgroundColor: isMorningCheckOutLocked
                      ? '#f1f5f9'
                      : (hasMorningOut ? '#dcfce7' : '#ffffff'),
                    color: isMorningCheckOutLocked
                      ? (hasMorningOut ? '#475569' : '#94a3b8')
                      : '#16a34a',
                    cursor: isMorningCheckOutLocked ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    transition: 'all 0.15s ease',
                    opacity: isMorningCheckOutLocked ? (hasMorningOut ? 0.9 : 0.7) : 1,
                    boxShadow: !isMorningCheckOutLocked && !hasMorningOut ? '0 1px 3px rgba(22, 163, 74, 0.15)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isMorningCheckOutLocked && <LockFill size={10} />}
                    {isOutside ? 'KẾT THÚC' : 'RA CA SÁNG'}
                  </span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: hasMorningOut ? (todayMorningEarlyMinutes > 0 ? '#c2410c' : '#15803d') : undefined }}>
                    {hasMorningOut
                      ? (todayMorningEarlyMinutes > 0 ? `Giờ ra: ${todayMorningOut} (Sớm ${todayMorningEarlyMinutes}p)` : `Giờ ra: ${todayMorningOut}`)
                      : (!hasMorningIn
                        ? (isOutside ? 'Chưa bấm bắt đầu' : 'Chưa bấm giờ vào')
                        : (isMorningEnded
                          ? 'Đã hết ca sáng'
                          : (!isNetworkReadyForCheckIn
                            ? networkLockSubtext
                            : (isOutside ? 'Bấm kết thúc' : 'Bấm ra ca nửa công'))))}
                  </span>
                </button>
              </div>

              {/* THẺ 2: CA CHIỀU */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: !isAfternoonReady ? '1px solid #e2e8f0' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  opacity: !isAfternoonReady ? 0.9 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: !isAfternoonReady ? '#64748b' : '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MoonStars size={13} /> CA CHIỀU
                  </span>
                  <span
                    title={!isAfternoonReady ? 'Đang khoá' : (!isNetworkReadyForCheckIn ? (networkLockReason || 'Chưa đáp ứng điều kiện chấm công') : '0.5 công')}
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: !isAfternoonReady ? '#d97706' : (!isNetworkReadyForCheckIn ? '#b45309' : '#2563eb'),
                      backgroundColor: !isAfternoonReady ? '#fffbeb' : (!isNetworkReadyForCheckIn ? '#fef3c7' : '#eff6ff'),
                      border: !isAfternoonReady ? '1px solid #fde68a' : (!isNetworkReadyForCheckIn ? '1px solid #fde68a' : '1px solid #bfdbfe'),
                      padding: (!isAfternoonReady || !isNetworkReadyForCheckIn) && isMobileScreen ? '2px 5px' : '1px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                    }}
                  >
                    {!isAfternoonReady ? (
                      <>
                        <LockFill size={10} />
                        <span className="timekeeping-lock-text" style={{ display: isMobileScreen ? 'none' : 'inline' }}>
                          Đang khoá
                        </span>
                      </>
                    ) : !isNetworkReadyForCheckIn ? (
                      <>
                        <LockFill size={10} />
                        <span className="timekeeping-lock-text" style={{ display: isMobileScreen ? 'none' : 'inline' }}>
                          {authMode === 'gps' && locationRangeCheck && !locationRangeCheck.isInside ? 'Ngoài bán kính' : 'Chưa đủ mạng'}
                        </span>
                      </>
                    ) : (
                      '0.5 công'
                    )}
                  </span>
                </div>

                {/* Nút Vào Ca Chiều hoặc Bắt đầu */}
                <button
                  type="button"
                  onClick={handleCheckInAfternoon}
                  disabled={isAfternoonInLocked}
                  title={
                    hasAfternoonIn
                      ? `Đã chấm công vào ca chiều (${todayAfternoonIn}) - Nút đã khoá tránh bấm trùng lặp`
                      : (!isAfternoonReady
                        ? 'Đang khoá - Nút chấm công tạm khoá'
                        : (!isNetworkReadyForCheckIn
                          ? (networkLockReason || 'Chưa đáp ứng điều kiện chấm công - Nút đã khoá')
                          : (isOutside ? 'Bắt đầu làm việc ca chiều' : 'Chấm công vào ca chiều')))
                  }
                  style={{
                    width: '100%',
                    padding: '7px 4px',
                    borderRadius: '6px',
                    border: isAfternoonInLocked ? '1px solid #cbd5e1' : 'none',
                    backgroundColor: isAfternoonInLocked ? '#f1f5f9' : '#2563eb',
                    color: isAfternoonInLocked ? (hasAfternoonIn ? '#475569' : '#94a3b8') : '#ffffff',
                    cursor: isAfternoonInLocked ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    boxShadow: isAfternoonInLocked ? 'none' : '0 1px 3px rgba(37, 99, 235, 0.2)',
                    transition: 'all 0.15s ease',
                    opacity: isAfternoonInLocked ? (hasAfternoonIn ? 0.9 : 0.75) : 1,
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isAfternoonInLocked && <LockFill size={10} />}
                    {isOutside ? 'BẮT ĐẦU' : 'VÀO CA CHIỀU'}
                  </span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: hasAfternoonIn ? '#1d4ed8' : undefined }}>
                    {hasAfternoonIn
                      ? `Giờ vào: ${todayAfternoonIn}`
                      : (!isAfternoonReady
                        ? 'Đang khoá'
                        : (!isNetworkReadyForCheckIn
                          ? networkLockSubtext
                          : (isOutside ? 'Bấm bắt đầu' : 'Bấm vào ca')))}
                  </span>
                </button>

                {/* Nút Ra Ca Chiều hoặc Kết thúc */}
                <button
                  type="button"
                  onClick={handleCheckOutAfternoon}
                  disabled={isAfternoonCheckOutLocked}
                  title={
                    hasAfternoonOut
                      ? `Đã chấm công ra ca chiều (${todayAfternoonOut}) - Nút đã khoá tránh bấm trùng lặp`
                      : (!isAfternoonReady
                        ? 'Đang khoá - Nút chấm công tạm khoá'
                        : (!hasAfternoonIn
                          ? (isOutside ? 'Chưa bấm bắt đầu - Khoá nút kết thúc' : 'Chưa bấm giờ vào ca chiều - Khoá nút bấm giờ ra')
                          : (!isNetworkReadyForCheckIn
                            ? (networkLockReason || 'Chưa đáp ứng điều kiện chấm công - Nút đã khoá')
                            : (isOutside ? 'Kết thúc ca chiều' : 'Chấm công ra ca chiều'))))
                  }
                  style={{
                    width: '100%',
                    padding: '7px 4px',
                    borderRadius: '6px',
                    border: isAfternoonCheckOutLocked
                      ? '1px solid #cbd5e1'
                      : (hasAfternoonOut ? '1px solid #bfdbfe' : '1px solid #2563eb'),
                    backgroundColor: isAfternoonCheckOutLocked
                      ? '#f1f5f9'
                      : (hasAfternoonOut ? '#dbeafe' : '#ffffff'),
                    color: isAfternoonCheckOutLocked
                      ? (hasAfternoonOut ? '#475569' : '#94a3b8')
                      : '#2563eb',
                    cursor: isAfternoonCheckOutLocked ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    transition: 'all 0.15s ease',
                    opacity: isAfternoonCheckOutLocked ? (hasAfternoonOut ? 0.9 : 0.7) : 1,
                    boxShadow: !isAfternoonCheckOutLocked && !hasAfternoonOut ? '0 1px 3px rgba(37, 99, 235, 0.15)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isAfternoonCheckOutLocked && <LockFill size={10} />}
                    {isOutside ? 'KẾT THÚC' : 'RA CA CHIỀU'}
                  </span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: hasAfternoonOut ? (todayAfternoonEarlyMinutes > 0 ? '#c2410c' : '#1d4ed8') : (isAfternoonCheckOutLocked ? '#94a3b8' : '#1e293b') }}>
                    {hasAfternoonOut
                      ? (todayAfternoonEarlyMinutes > 0 ? `Giờ ra: ${todayAfternoonOut} (Sớm ${todayAfternoonEarlyMinutes}p)` : `Giờ ra: ${todayAfternoonOut}`)
                      : (!isAfternoonReady
                        ? 'Đang khoá'
                        : (!hasAfternoonIn
                          ? (isOutside ? 'Chưa bấm bắt đầu' : 'Chưa bấm giờ vào')
                          : (!isNetworkReadyForCheckIn
                            ? networkLockSubtext
                            : (isOutside ? 'Bấm kết thúc' : 'Bấm ra ca tan làm'))))}
                  </span>
                </button>
              </div>
            </div>

            {/* CÁC TOGGLE ĐĂNG KÝ ĂN TRƯA VÀ ĐĂNG KÝ ĂN TỐI DƯỚI CÁC NÚT CHẤM CÔNG */}
            <div
              style={{
                marginTop: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}
            >
              {/* TOGGLE ĐĂNG KÝ ĂN TRƯA */}
              <div
                onClick={handleToggleLunch}
                role="button"
                tabIndex={0}
                title={isLunchLocked ? `Đã quá hạn chốt báo cơm trưa (${lunchDeadlineStr}). Nút đã khoá theo nội quy.` : 'Bấm để bật / tắt đăng ký ăn trưa'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleLunch();
                  }
                }}
                style={{
                  backgroundColor: isLunchLocked
                    ? (registerLunch ? '#f0fdf4' : '#f8fafc')
                    : (registerLunch ? '#f0fdf4' : '#ffffff'),
                  border: isLunchLocked
                    ? (registerLunch ? '1px solid #bbf7d0' : '1px solid #e2e8f0')
                    : (registerLunch ? '1px solid #86efac' : '1px solid #cbd5e1'),
                  borderRadius: '8px',
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: isLunchLocked ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                  opacity: isLunchLocked && !registerLunch ? 0.65 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: registerLunch ? '0 1px 3px rgba(22, 163, 74, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      backgroundColor: registerLunch ? '#dcfce7' : isLunchLocked ? '#e2e8f0' : '#f1f5f9',
                      color: registerLunch ? '#15803d' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ForkKnife size={13} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: registerLunch ? '#15803d' : isLunchLocked ? '#64748b' : '#1e293b',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="meal-register-full-text">Đăng ký ăn trưa</span>
                      <span className="meal-register-short-text">Ăn trưa</span>
                      {isLunchLocked && (
                        <LockFill size={10} color={registerLunch ? '#16a34a' : '#94a3b8'} title="Đã khoá" />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: registerLunch ? '#16a34a' : isLunchLocked ? '#dc2626' : '#94a3b8',
                        marginTop: '1px',
                      }}
                    >
                      {isLunchLocked
                        ? (registerLunch ? `Đã chốt (${lunchDeadlineStr})` : `Hết giờ chốt (${lunchDeadlineStr})`)
                        : (registerLunch ? `Đã đăng ký (chốt ${lunchDeadlineStr})` : `Chưa đăng ký (trước ${lunchDeadlineStr})`)}
                    </div>
                  </div>
                </div>

                {/* Nút gạt chuyển đổi trạng thái */}
                <div
                  style={{
                    width: '32px',
                    height: '18px',
                    borderRadius: '20px',
                    backgroundColor: registerLunch ? (isLunchLocked ? '#22c55e' : '#16a34a') : '#cbd5e1',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    opacity: isLunchLocked ? 0.75 : 1,
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      position: 'absolute',
                      top: '2px',
                      left: registerLunch ? '16px' : '2px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {/* TOGGLE ĐĂNG KÝ ĂN TỐI */}
              <div
                onClick={handleToggleDinner}
                role="button"
                tabIndex={0}
                title={isDinnerLocked ? `Đã quá hạn chốt báo cơm tối (${dinnerDeadlineStr}). Nút đã khoá theo nội quy.` : 'Bấm để bật / tắt đăng ký ăn tối tăng ca'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleDinner();
                  }
                }}
                style={{
                  backgroundColor: isDinnerLocked
                    ? (registerDinner ? '#eff6ff' : '#f8fafc')
                    : (registerDinner ? '#eff6ff' : '#ffffff'),
                  border: isDinnerLocked
                    ? (registerDinner ? '1px solid #bfdbfe' : '1px solid #e2e8f0')
                    : (registerDinner ? '1px solid #93c5fd' : '1px solid #cbd5e1'),
                  borderRadius: '8px',
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: isDinnerLocked ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                  opacity: isDinnerLocked && !registerDinner ? 0.65 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: registerDinner ? '0 1px 3px rgba(37, 99, 235, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      backgroundColor: registerDinner ? '#dbeafe' : isDinnerLocked ? '#e2e8f0' : '#f1f5f9',
                      color: registerDinner ? '#1d4ed8' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MoonStars size={13} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: registerDinner ? '#1d4ed8' : isDinnerLocked ? '#64748b' : '#1e293b',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="meal-register-full-text">Đăng ký ăn tối</span>
                      <span className="meal-register-short-text">Ăn tối</span>
                      {isDinnerLocked && (
                        <LockFill size={10} color={registerDinner ? '#2563eb' : '#94a3b8'} title="Đã khoá" />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: registerDinner ? '#2563eb' : isDinnerLocked ? '#dc2626' : '#94a3b8',
                        marginTop: '1px',
                      }}
                    >
                      {isDinnerLocked
                        ? (registerDinner ? `Đã chốt (${dinnerDeadlineStr})` : `Hết giờ chốt (${dinnerDeadlineStr})`)
                        : (registerDinner ? `Đã đăng ký (chốt ${dinnerDeadlineStr})` : `Chưa đăng ký (trước ${dinnerDeadlineStr})`)}
                    </div>
                  </div>
                </div>

                {/* Nút gạt chuyển đổi trạng thái */}
                <div
                  style={{
                    width: '32px',
                    height: '18px',
                    borderRadius: '20px',
                    backgroundColor: registerDinner ? (isDinnerLocked ? '#3b82f6' : '#2563eb') : '#cbd5e1',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    opacity: isDinnerLocked ? 0.75 : 1,
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      position: 'absolute',
                      top: '2px',
                      left: registerDinner ? '16px' : '2px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

        {/* KHỐI 2: XÁC THỰC MẠNG DÂY LAN CHO MÁY PC HOẶC ĐỊNH VỊ GPS */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Thanh chuyển đổi linh hoạt: Mạng LAN, Định vị GPS hoặc Ngoài văn phòng */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              gap: '4px',
            }}
          >
            {/* Tab 1: Mạng nội bộ (Khoá trên Mobile/Tablet/iPad) */}
            <button
              type="button"
              disabled={isMobileOrTabletDevice}
              onClick={() => {
                if (isMobileOrTabletDevice) {
                  onShowToast('info', 'Chức năng đã khoá', 'Thiết bị di động / iPad / tablet bắt buộc dùng định vị GPS. Chức năng Mạng nội bộ chỉ áp dụng cho máy tính để bàn PC.');
                  return;
                }
                setAuthMode('lan');
                setIsOutsideWork(false);
                setCurrentAddressName(lanNetworkInfo.facilityName);
              }}
              title={
                isMobileOrTabletDevice
                  ? 'Chức năng Mạng nội bộ chỉ áp dụng cho máy tính để bàn PC (Đã khoá trên Di động và Tablet)'
                  : 'Xác thực qua mạng nội bộ cáp LAN / WiFi cơ sở'
              }
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isMobileOrTabletDevice ? 'transparent' : (authMode === 'lan' ? '#ffffff' : 'transparent'),
                color: isMobileOrTabletDevice ? '#94a3b8' : (authMode === 'lan' ? '#15803d' : '#64748b'),
                fontWeight: !isMobileOrTabletDevice && authMode === 'lan' ? 800 : 600,
                fontSize: '0.75rem',
                cursor: isMobileOrTabletDevice ? 'not-allowed' : 'pointer',
                opacity: isMobileOrTabletDevice ? 0.5 : 1,
                boxShadow: !isMobileOrTabletDevice && authMode === 'lan' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Ethernet size={14} color={isMobileOrTabletDevice ? '#94a3b8' : (authMode === 'lan' ? '#16a34a' : '#64748b')} />
              <span>Mạng nội bộ</span>
              {isMobileOrTabletDevice && <LockFill size={10} color="#94a3b8" />}
            </button>

            {/* Tab 2: GPS (Khoá trên PC/Laptop) */}
            <button
              type="button"
              disabled={!isMobileOrTabletDevice}
              onClick={() => {
                if (!isMobileOrTabletDevice) {
                  onShowToast('info', 'Chức năng đã khoá', 'Máy tính PC bắt buộc dùng mạng nội bộ cơ sở để chấm công. Chức năng GPS chỉ áp dụng cho điện thoại di động và tablet.');
                  return;
                }
                setAuthMode('gps');
                setIsOutsideWork(false);
                handleFetchCurrentGps(false);
              }}
              title={
                !isMobileOrTabletDevice
                  ? 'Chức năng định vị GPS chỉ áp dụng cho Điện thoại di động / iPad / Tablet (Đã khoá trên máy tính PC)'
                  : 'Xác thực toạ độ GPS vệ tinh tại cơ sở'
              }
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: !isMobileOrTabletDevice ? 'transparent' : (authMode === 'gps' ? '#ffffff' : 'transparent'),
                color: !isMobileOrTabletDevice ? '#94a3b8' : (authMode === 'gps' ? '#0284c7' : '#64748b'),
                fontWeight: isMobileOrTabletDevice && authMode === 'gps' ? 800 : 600,
                fontSize: '0.75rem',
                cursor: !isMobileOrTabletDevice ? 'not-allowed' : 'pointer',
                opacity: !isMobileOrTabletDevice ? 0.5 : 1,
                boxShadow: isMobileOrTabletDevice && authMode === 'gps' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <GeoAlt size={13} color={!isMobileOrTabletDevice ? '#94a3b8' : (authMode === 'gps' ? '#0284c7' : '#64748b')} />
              <span>GPS</span>
              {!isMobileOrTabletDevice && <LockFill size={10} color="#94a3b8" />}
            </button>

            {/* Tab 3: Ngoài văn phòng (Mở cho cả PC và Mobile khi làm việc bên ngoài) */}
            <button
              type="button"
              onClick={() => {
                setAuthMode('outside');
                setIsOutsideWork(true);
                handleFetchCurrentGps(false);
              }}
              title="Chấm công đi công tác ngoài công trình hoặc gặp gỡ đối tác"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: authMode === 'outside' ? '#ffffff' : 'transparent',
                color: authMode === 'outside' ? '#d97706' : '#64748b',
                fontWeight: authMode === 'outside' ? 800 : 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: authMode === 'outside' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Briefcase size={13} color={authMode === 'outside' ? '#d97706' : '#64748b'} />
              <span>Ngoài văn phòng</span>
            </button>
          </div>

          {/* NỘI DUNG CHẾ ĐỘ 1: XÁC THỰC MẠNG DÂY LAN CHO MÁY TÍNH ĐỂ BÀN PC */}
          {authMode === 'lan' && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '9px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1,
                minHeight: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div
                  className="text-uppercase"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 800,
                    color: '#166534',
                    textTransform: 'uppercase',
                  }}
                >
                  <PcDisplay size={16} color="#16a34a" />
                  MÁY TÍNH KẾT NỐI MẠNG NỘI BỘ
                </div>
                <button
                  type="button"
                  onClick={() => verifyLanNetwork(true)}
                  disabled={isLocating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#15803d',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowRepeat size={11} className={isLocating ? 'rotate-spin' : ''} />
                  {isLocating ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
                </button>
              </div>

              {/* Dòng trạng thái xác thực mạng */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: lanNetworkInfo.isChecking
                    ? '#eff6ff'
                    : lanNetworkInfo.isVerified
                    ? '#ecfdf5'
                    : '#fffbeb',
                  border: lanNetworkInfo.isChecking
                    ? '1px solid #bfdbfe'
                    : lanNetworkInfo.isVerified
                    ? '1px solid #a7f3d0'
                    : '1px solid #fde68a',
                  borderRadius: '6px',
                  padding: '5px 8px',
                }}
              >
                {lanNetworkInfo.isChecking ? (
                  <ArrowRepeat size={13} className="rotate-spin" color="#2563eb" />
                ) : lanNetworkInfo.isVerified ? (
                  <CheckCircleFill size={13} color="#10b981" />
                ) : (
                  <ExclamationTriangle size={13} color="#d97706" />
                )}
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: lanNetworkInfo.isChecking
                      ? '#1d4ed8'
                      : lanNetworkInfo.isVerified
                      ? '#047857'
                      : '#b45309',
                  }}
                >
                  {lanNetworkInfo.message}
                </span>
              </div>

              {/* Bố cục bản đồ vị trí cơ sở và thông số mạng */}
              <div style={{ flex: 1, minHeight: isMobileScreen ? '80px' : '96px', display: 'flex', gap: '10px', alignItems: 'stretch', marginTop: '2px' }}>
                <div
                  style={{
                    width: isMobileScreen ? '96px' : '125px',
                    minHeight: isMobileScreen ? '80px' : '96px',
                    height: '100%',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                    flexShrink: 0,
                  }}
                >
                  <iframe
                    title="Bản đồ vị trí cơ sở mạng LAN Seajong"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://maps.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}&z=16&output=embed`}
                    style={{ border: 0, display: 'block', width: '100%', height: '100%' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 700 }}>
                    {lanNetworkInfo.isVerified ? 'CƠ SỞ LÀM VIỆC XÁC THỰC:' : 'TRẠNG THÁI KẾT NỐI:'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      color: lanNetworkInfo.isVerified ? '#0f172a' : '#b45309',
                      marginTop: '2px',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {lanNetworkInfo.facilityName}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#475569', marginTop: '2px' }}>
                    {lanNetworkInfo.facilityAddress}
                  </div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: lanNetworkInfo.isVerified ? '#15803d' : '#b45309',
                      fontWeight: 700,
                      marginTop: '4px',
                    }}
                  >
                    IP: {lanNetworkInfo.clientIp} • Subnet: {lanNetworkInfo.subnet}
                    {lanNetworkInfo.wifiName ? ` • WiFi: ${lanNetworkInfo.wifiName}` : ''}
                  </div>
                  {!lanNetworkInfo.isVerified && !lanNetworkInfo.isChecking && (
                    <div style={{ fontSize: '0.65rem', color: '#d97706', marginTop: '3px', fontWeight: 600 }}>
                      👉 Để chấm công ngoài văn phòng, vui lòng chọn tab [GPS] hoặc [Ngoài văn phòng] ở trên.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NỘI DUNG CHẾ ĐỘ 2: ĐỊNH VỊ VỆ TINH GPS CHO LAPTOP VÀ DI ĐỘNG */}
          {authMode === 'gps' && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '9px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1,
                minHeight: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 800, color: '#0369a1' }}>
                  <GeoAlt size={16} /> VỊ TRÍ XÁC ĐỊNH BẰNG GPS
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchCurrentGps(false)}
                  disabled={isLocating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#0284c7',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowRepeat size={11} className={isLocating ? 'rotate-spin' : ''} />
                  {isLocating ? 'Đang xác định...' : 'Cập nhật vị trí'}
                </button>
              </div>

              {locationRangeCheck && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: locationRangeCheck.isInside ? '#ecfdf5' : '#fef2f2',
                    border: locationRangeCheck.isInside ? '1px solid #a7f3d0' : '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '5px 8px',
                  }}
                >
                  {locationRangeCheck.isInside ? (
                    <CheckCircleFill size={13} color="#10b981" />
                  ) : (
                    <ExclamationTriangle size={13} color="#ef4444" />
                  )}
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: locationRangeCheck.isInside ? '#047857' : '#b91c1c',
                    }}
                  >
                    {locationRangeCheck.isInside ? 'Trong phạm vi chấm công' : 'Ngoài phạm vi chấm công'}
                  </span>
                </div>
              )}

              <div style={{ flex: 1, minHeight: isMobileScreen ? '80px' : '96px', display: 'flex', gap: '10px', alignItems: 'stretch', marginTop: '2px' }}>
                <div
                  style={{
                    width: isMobileScreen ? '96px' : '125px',
                    minHeight: isMobileScreen ? '80px' : '96px',
                    height: '100%',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                    flexShrink: 0,
                  }}
                >
                  <iframe
                    title="Bản đồ vị trí chấm công GPS"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://maps.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}&z=16&output=embed`}
                    style={{ border: 0, display: 'block', width: '100%', height: '100%' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 700 }}>
                    ĐỊA ĐIỂM THỰC TẾ HIỆN TẠI:
                  </div>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      marginTop: '2px',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {currentAddressName}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '3px' }}>
                    Tọa độ: {currentCoords.lat}, {currentCoords.lng}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                    <ShieldCheck size={13} color="#16a34a" />
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#16a34a' }}>
                      Định vị GPS chính xác, sai số {formatNumberGroup(locationAccuracy)} mét
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NỘI DUNG CHẾ ĐỘ 3: CHẤM CÔNG NGOÀI VĂN PHÒNG HOẶC DỰ ÁN CÔNG TRÌNH */}
          {authMode === 'outside' && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: '9px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1,
                minHeight: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 800, color: '#b45309' }}>
                    <Briefcase size={15} /> NGOÀI VĂN PHÒNG
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#92400e', fontWeight: 400, marginTop: '2px' }}>
                    Tọa độ GPS thực tế sẽ được lưu kèm hồ sơ chấm công
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchCurrentGps(false)}
                  disabled={isLocating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#b45309',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowRepeat size={11} className={isLocating ? 'rotate-spin' : ''} />
                  {isLocating ? 'Đang xác định...' : 'Cập nhật vị trí'}
                </button>
              </div>

              <div style={{ flex: 1, minHeight: isMobileScreen ? '80px' : '96px', display: 'flex', gap: '10px', alignItems: 'stretch', marginTop: '2px' }}>
                <div
                  style={{
                    width: isMobileScreen ? '96px' : '125px',
                    minHeight: isMobileScreen ? '80px' : '96px',
                    height: '100%',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #fcd34d',
                    flexShrink: 0,
                  }}
                >
                  <iframe
                    title="Bản đồ vị trí chấm công ngoài văn phòng"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://maps.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}&z=16&output=embed`}
                    style={{ border: 0, display: 'block', width: '100%', height: '100%' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#92400e', fontWeight: 700 }}>
                    TÊN CÔNG TRÌNH HOẶC ĐỊA ĐIỂM:
                  </div>
                  <input
                    type="text"
                    value={outsideLocationName}
                    onChange={(e) => setOutsideLocationName(e.target.value)}
                    placeholder="Nhập tên công trình hoặc địa điểm..."
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: '1px solid #fcd34d',
                      backgroundColor: '#ffffff',
                      fontSize: '0.75rem',
                      fontFamily: "'Roboto Condensed', sans-serif",
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '0.6875rem', color: '#78350f', marginTop: '1px' }}>
                    Tọa độ GPS: {currentCoords.lat}, {currentCoords.lng}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                    <ShieldCheck size={13} color="#16a34a" />
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#16a34a' }}>
                      Định vị GPS chính xác, sai số {formatNumberGroup(locationAccuracy)} mét
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
  );

  const renderRightContent = () => (
    <div
      style={{
        ...(isTabletOrMobile
          ? {
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: isMobileScreen ? '100vw' : 'min(92vw, 680px)',
              maxWidth: '100vw',
              zIndex: 1100,
              backgroundColor: '#f8fafc',
              boxShadow: showMobileRightColumn ? '-6px 0 25px rgba(0, 0, 0, 0.25)' : 'none',
              transform: showMobileRightColumn ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: isMobileScreen ? '14px 16px 40px' : '18px 22px 40px',
              overflowY: 'auto',
              pointerEvents: showMobileRightColumn ? 'auto' : 'none',
            }
          : {
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              minHeight: 0,
              flex: '1 1 0%',
              overflow: 'hidden',
            }),
      }}
    >
        {/* Thanh tiêu đề thao tác đóng trên Mobile / Tablet */}
        {isTabletOrMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af' }}>
              <ChevronRight size={16} color="#2563eb" /> Vuốt từ trái sang phải để ẩn
            </div>
            <button
              type="button"
              onClick={() => setShowMobileRightColumn(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f1f5f9',
                color: '#0f172a',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <X size={16} /> Đóng bảng
            </button>
          </div>
        )}
        {/* KHỐI 1: THÔNG TIN NHÂN VIÊN VÀ 5 CHỈ SỐ KPI CHẤM CÔNG */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '12px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {/* PHẦN TRÊN: Thông tin nhân viên và bộ lọc chu kỳ */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            {/* Thông tin nhân viên */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: currentEmployee.avatarColor || '#ca8a04',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
                  letterSpacing: '0.5px',
                  flexShrink: 0,
                }}
              >
                {currentEmployee.initials}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {currentEmployee.name}
                  </span>
                  {currentEmployee.code && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: '4px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {currentEmployee.code}
                    </span>
                  )}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      backgroundColor:
                        employeeStatus === 'working'
                          ? '#dcfce7'
                          : employeeStatus === 'temporary_leave'
                          ? '#fef3c7'
                          : '#fee2e2',
                      color:
                        employeeStatus === 'working'
                          ? '#15803d'
                          : employeeStatus === 'temporary_leave'
                          ? '#b45309'
                          : '#b91c1c',
                      border:
                        employeeStatus === 'working'
                          ? '1px solid #86efac'
                          : employeeStatus === 'temporary_leave'
                          ? '1px solid #fde68a'
                          : '1px solid #fca5a5',
                      fontFamily: "'Roboto Condensed', sans-serif",
                      userSelect: 'none',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor:
                          employeeStatus === 'working'
                            ? '#16a34a'
                            : employeeStatus === 'temporary_leave'
                            ? '#d97706'
                            : '#dc2626',
                        flexShrink: 0,
                      }}
                    />
                    {employeeStatus === 'working'
                      ? 'Đang làm việc'
                      : employeeStatus === 'temporary_leave'
                      ? 'Tạm nghỉ'
                      : 'Đã nghỉ việc'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px', fontWeight: 600 }}>
                  {currentEmployee.role} • {currentEmployee.department}
                </div>
              </div>
            </div>

            {/* Bộ điều khiển tháng */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  minWidth: '104px',
                  height: '32px',
                  padding: '4px 28px 4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: 0,
                }}
                options={Array.from({ length: currentMonthNum }, (_, i) => i + 1).map((m) => {
                  const mVal = `${currentYearNum}-${String(m).padStart(2, '0')}`;
                  return {
                    value: mVal,
                    label: `Tháng ${m}`,
                  };
                })}
              />
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

          {/* PHẦN DƯỚI: 5 THẺ CHỈ SỐ KPI CHẤM CÔNG */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobileScreen ? 'repeat(2, 1fr)' : isTabletOrMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
              gap: isMobileScreen ? '10px 12px' : '16px',
              alignItems: 'center',
            }}
          >
            {/* THẺ 1: NGÀY CÔNG */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#ecfdf5',
                  border: '1.5px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                  flexShrink: 0,
                }}
              >
                <CalendarCheck size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                  {totalWorkCredit.toFixed(2)}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#64748b',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    marginTop: '1px',
                  }}
                >
                  NGÀY CÔNG
                </div>
              </div>
            </div>

            {/* THẺ 2: ĐI MUỘN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                }}
              >
                <ExclamationTriangle size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                  {totalLateMinutes}{' '}
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>phút</span>
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#64748b',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    marginTop: '1px',
                  }}
                >
                  ĐI MUỘN
                </div>
              </div>
            </div>

            {/* THẺ 3: VỀ SỚM */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                  flexShrink: 0,
                }}
              >
                <BoxArrowRight size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                  {totalEarlyMinutes}{' '}
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>phút</span>
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#64748b',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    marginTop: '1px',
                  }}
                >
                  VỀ SỚM
                </div>
              </div>
            </div>

            {/* THẺ 4: ĂN TRƯA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#fff1f2',
                  border: '1.5px solid #fecdd3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e11d48',
                  flexShrink: 0,
                }}
              >
                <Sun size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                  {totalLunchCount}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#64748b',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    marginTop: '1px',
                  }}
                >
                  ĂN TRƯA
                </div>
              </div>
            </div>

            {/* THẺ 5: ĂN TỐI */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#f5f3ff',
                  border: '1.5px solid #ddd6fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6366f1',
                  flexShrink: 0,
                }}
              >
                <MoonStars size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                  {totalDinnerCount}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#64748b',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    marginTop: '1px',
                  }}
                >
                  ĂN TỐI
                </div>
              </div>
            </div>
          </div>
      </div>

        {/* KHỐI 2: BẢNG NHẬT KÝ CHẤM CÔNG CHI TIẾT THEO NGÀY */}
        <div
          style={{
            backgroundColor: '#ffffff',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 0%',
            minHeight: 0,
          }}
        >
          {/* Header bảng và Tabs lọc */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              backgroundColor: '#ffffff',
            }}
          >
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Nhật ký chấm công chi tiết
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                {selectedMonth === 'all'
                  ? 'Tất cả các ngày ghi nhận'
                  : `Dữ liệu tháng ${parseInt(selectedMonth.split('-')[1], 10)} năm ${selectedMonth.split('-')[0]}`}
              </div>
            </div>

            {/* Tabs lọc trạng thái */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setTableFilter('all')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: tableFilter === 'all' ? '#ffffff' : 'transparent',
                  color: tableFilter === 'all' ? '#0f172a' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: tableFilter === 'all' ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: tableFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Tất cả</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 5px',
                    borderRadius: '10px',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    marginLeft: '6px',
                    backgroundColor: tableFilter === 'all' ? '#0f172a' : '#e2e8f0',
                    color: tableFilter === 'all' ? '#ffffff' : '#475569',
                    lineHeight: 1,
                  }}
                >
                  {fullMonthRecords.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTableFilter('work')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: tableFilter === 'work' ? '#ffffff' : 'transparent',
                  color: tableFilter === 'work' ? '#15803d' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: tableFilter === 'work' ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: tableFilter === 'work' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Đi làm</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 5px',
                    borderRadius: '10px',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    marginLeft: '6px',
                    backgroundColor: tableFilter === 'work' ? '#16a34a' : '#dcfce7',
                    color: tableFilter === 'work' ? '#ffffff' : '#15803d',
                    lineHeight: 1,
                  }}
                >
                  {workedDaysCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTableFilter('late_early')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: tableFilter === 'late_early' ? '#ffffff' : 'transparent',
                  color: tableFilter === 'late_early' ? '#b45309' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: tableFilter === 'late_early' ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: tableFilter === 'late_early' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Đi muộn / Về sớm</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 5px',
                    borderRadius: '10px',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    marginLeft: '6px',
                    backgroundColor: tableFilter === 'late_early' ? '#d97706' : '#fef3c7',
                    color: tableFilter === 'late_early' ? '#ffffff' : '#b45309',
                    lineHeight: 1,
                  }}
                >
                  {lateEarlyCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTableFilter('ot')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: tableFilter === 'ot' ? '#ffffff' : 'transparent',
                  color: tableFilter === 'ot' ? '#4338ca' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: tableFilter === 'ot' ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: tableFilter === 'ot' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Tăng ca</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 5px',
                    borderRadius: '10px',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    marginLeft: '6px',
                    backgroundColor: tableFilter === 'ot' ? '#7e22ce' : '#ede9fe',
                    color: tableFilter === 'ot' ? '#ffffff' : '#6b21a8',
                    lineHeight: 1,
                  }}
                >
                  {otOccurrences}
                </span>
              </button>
            </div>
          </div>

          {/* Vùng Bảng cuộn dọc chiếm trọn vẹn chiều cao còn lại */}
          <div
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              width: '100%',
            }}
          >
            <table
              style={{
                width: '100%',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.8125rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #cbd5e1',
                    color: '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.3px',
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '32%', whiteSpace: 'nowrap' }}>
                    THỜI GIAN
                  </th>
                  <th style={{ padding: '12px 8px', width: '26%', whiteSpace: 'nowrap' }}>
                    SÁNG ({shiftHours.morningStart || '08:00'} - {shiftHours.morningEnd || '12:00'})
                  </th>
                  <th style={{ padding: '12px 8px', width: '26%', whiteSpace: 'nowrap' }}>
                    CHIỀU ({shiftHours.afternoonStart || '13:30'} - {shiftHours.afternoonEnd || '17:30'})
                  </th>
                  <th style={{ padding: '12px 14px', width: '16%', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    TỔNG CÔNG
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      Không có bản ghi chấm công nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  displayRecords.map((r, idx) => {
                    const now = new Date();
                    const realTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const isToday = r.dateStr === realTodayStr;
                    const shortDay = formatShortDayName(r.dateStr, r.dayOfWeek);
                    const formattedDate = `${r.dateStr.slice(8, 10)}/${r.dateStr.slice(5, 7)}/${r.dateStr.slice(0, 4)}`;
                    const hasOt = (r.otHours || 0) > 0;

                    return (
                      <tr
                        key={r.id || idx}
                        onClick={() => handleOpenExplanation(r)}
                        title="Bấm để xem chi tiết / gửi giải trình công"
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: isToday ? '#f0fdf4' : '#ffffff',
                          transition: 'background-color 0.15s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          if (!isToday) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isToday) e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                      >
                        {/* 1. THỜI GIAN */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#1e293b', whiteSpace: 'nowrap' }}>
                              {shortDay}, {formattedDate}
                            </span>
                            {Boolean(r.registeredLunch || (isToday && registerLunch)) && (
                              <span
                                title="Đã đăng ký ăn trưa"
                                style={{
                                  display: 'inline-block',
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ef4444',
                                  boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.25)',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            {Boolean(r.registeredDinner || (isToday && registerDinner)) && (
                              <span
                                title="Đã đăng ký ăn tối"
                                style={{
                                  display: 'inline-block',
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  backgroundColor: '#3b82f6',
                                  boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.25)',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#64748b',
                              fontSize: '0.75rem',
                              marginTop: '3px',
                              width: '100%',
                              minWidth: 0,
                            }}
                            title={r.locationName || 'Văn phòng công ty'}
                          >
                            <GeoAlt size={11} color="#64748b" style={{ flexShrink: 0 }} />
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                                minWidth: 0,
                              }}
                            >
                              {r.locationName || 'Văn phòng công ty'}
                            </span>
                          </div>
                        </td>

                        {/* 2. SÁNG (08:00 - 12:00) */}
                        <td style={{ padding: '12px 8px', verticalAlign: 'middle' }}>
                          {(() => {
                            const hasMorningLeaveShift = Boolean(
                              r.leaveInfo &&
                                (r.leaveInfo.leaveSession === 'all_day' ||
                                  r.leaveInfo.leaveSession === 'morning')
                            );
                            const hasActualMorningPunch = Boolean(
                              r.morningCheckIn && r.morningCheckIn !== '--:--'
                            );
                            const mPaidCred =
                              typeof r.leaveInfo?.morningPaidCredit === 'number'
                                ? r.leaveInfo.morningPaidCredit
                                : r.leaveInfo?.isPaidLeave
                                  ? 0.5
                                  : 0;

                            // Nếu đơn đã duyệt và không có chấm công thực tế -> hiển thị chế độ nghỉ đã duyệt
                            if (
                              hasMorningLeaveShift &&
                              r.leaveInfo?.status === 'approved' &&
                              !hasActualMorningPunch
                            ) {
                              return (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: mPaidCred > 0 ? '#f0fdfa' : '#f1f5f9',
                                    border:
                                      mPaidCred > 0 ? '1px solid #99f6e4' : '1px solid #cbd5e1',
                                    color: mPaidCred > 0 ? '#0f766e' : '#475569',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <CalendarCheck size={12} />
                                  <span>
                                    {r.leaveInfo.leaveCategoryLabel} (
                                    {mPaidCred > 0 ? `+${mPaidCred} công` : '0 công'})
                                  </span>
                                </div>
                              );
                            }

                            // Nếu đơn bị từ chối và nhân viên thực tế vắng mặt -> ghi nhận "Vắng mặt chưa được chấp thuận"
                            if (
                              hasMorningLeaveShift &&
                              r.leaveInfo?.status === 'rejected' &&
                              !hasActualMorningPunch
                            ) {
                              return (
                                <div
                                  title="Đơn xin nghỉ không được duyệt và nhân viên thực tế vắng mặt - Chuyển Nhân sự kiểm tra trước khi chốt công"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#dc2626',
                                    fontSize: '0.71rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <ExclamationTriangle size={12} />
                                  <span>Vắng mặt chưa được chấp thuận</span>
                                </div>
                              );
                            }

                            // Các trường hợp còn lại (kể cả đang Chờ phê duyệt hoặc Từ chối nhưng vẫn đi làm): luôn hiển thị giờ chấm công thực tế VÀO / RA
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                  <div>
                                    <div
                                      style={{
                                        fontSize: '0.6875rem',
                                        color: '#94a3b8',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        marginBottom: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      <span>VÀO</span>
                                      {(r.morningLateMinutes || 0) > 0 && (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '0 4px',
                                            borderRadius: '3px',
                                            backgroundColor: '#fef3c7',
                                            color: '#b45309',
                                            border: '1px solid #fde68a',
                                            fontSize: '0.5625rem',
                                            fontWeight: 700,
                                            lineHeight: '1.2',
                                            textTransform: 'none',
                                          }}
                                        >
                                          Muộn
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '0.8125rem',
                                        fontWeight:
                                          r.morningCheckIn && r.morningCheckIn !== '--:--'
                                            ? 700
                                            : 500,
                                        color:
                                          (r.morningLateMinutes || 0) > 0
                                            ? '#b45309'
                                            : r.morningCheckIn && r.morningCheckIn !== '--:--'
                                              ? '#0f172a'
                                              : '#94a3b8',
                                      }}
                                    >
                                      {formatTimeWithoutSeconds(r.morningCheckIn)}
                                    </div>
                                  </div>
                                  <div>
                                    <div
                                      style={{
                                        fontSize: '0.6875rem',
                                        color: '#94a3b8',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        marginBottom: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      <span>RA</span>
                                      {(r.morningEarlyMinutes || 0) > 0 && (
                                        <span
                                          title={`Về sớm ${r.morningEarlyMinutes} phút so với giờ quy định (${shiftHours.morningEnd || '12:00'})`}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '0 4px',
                                            borderRadius: '3px',
                                            backgroundColor: '#ffedd5',
                                            color: '#c2410c',
                                            border: '1px solid #fed7aa',
                                            fontSize: '0.5625rem',
                                            fontWeight: 700,
                                            lineHeight: '1.2',
                                            textTransform: 'none',
                                          }}
                                        >
                                          Sớm
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      title={
                                        (r.morningEarlyMinutes || 0) > 0
                                          ? `Giờ ra: ${r.morningCheckOut} (Về sớm ${r.morningEarlyMinutes} phút so với ${shiftHours.morningEnd || '12:00'})`
                                          : undefined
                                      }
                                      style={{
                                        fontSize: '0.8125rem',
                                        fontWeight:
                                          r.morningCheckOut && r.morningCheckOut !== '--:--'
                                            ? 700
                                            : 500,
                                        color:
                                          (r.morningEarlyMinutes || 0) > 0
                                            ? '#c2410c'
                                            : r.morningCheckOut && r.morningCheckOut !== '--:--'
                                              ? '#0f172a'
                                              : '#94a3b8',
                                      }}
                                    >
                                      {formatTimeWithoutSeconds(r.morningCheckOut)}
                                    </div>
                                  </div>
                                </div>
                                {hasMorningLeaveShift && r.leaveInfo?.status === 'pending' && (
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      color: '#b45309',
                                    }}
                                  >
                                    <CalendarCheck size={10} />
                                    <span>Đơn chờ duyệt ({r.leaveInfo.leaveCategoryLabel})</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* 3. CHIỀU (13:30 - 17:30) */}
                        <td style={{ padding: '12px 8px', verticalAlign: 'middle' }}>
                          {(() => {
                            const hasAfternoonLeaveShift = Boolean(
                              r.leaveInfo &&
                                (r.leaveInfo.leaveSession === 'all_day' ||
                                  r.leaveInfo.leaveSession === 'afternoon')
                            );
                            const hasActualAfternoonPunch = Boolean(
                              r.afternoonCheckIn && r.afternoonCheckIn !== '--:--'
                            );
                            const aPaidCred =
                              typeof r.leaveInfo?.afternoonPaidCredit === 'number'
                                ? r.leaveInfo.afternoonPaidCredit
                                : r.leaveInfo?.isPaidLeave
                                  ? 0.5
                                  : 0;

                            if (
                              hasAfternoonLeaveShift &&
                              r.leaveInfo?.status === 'approved' &&
                              !hasActualAfternoonPunch
                            ) {
                              return (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: aPaidCred > 0 ? '#f0fdfa' : '#f1f5f9',
                                    border:
                                      aPaidCred > 0 ? '1px solid #99f6e4' : '1px solid #cbd5e1',
                                    color: aPaidCred > 0 ? '#0f766e' : '#475569',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <CalendarCheck size={12} />
                                  <span>
                                    {r.leaveInfo.leaveCategoryLabel} (
                                    {aPaidCred > 0 ? `+${aPaidCred} công` : '0 công'})
                                  </span>
                                </div>
                              );
                            }

                            if (
                              hasAfternoonLeaveShift &&
                              r.leaveInfo?.status === 'rejected' &&
                              !hasActualAfternoonPunch
                            ) {
                              return (
                                <div
                                  title="Đơn xin nghỉ không được duyệt và nhân viên thực tế vắng mặt - Chuyển Nhân sự kiểm tra trước khi chốt công"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#dc2626',
                                    fontSize: '0.71rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <ExclamationTriangle size={12} />
                                  <span>Vắng mặt chưa được chấp thuận</span>
                                </div>
                              );
                            }

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                  <div>
                                    <div
                                      style={{
                                        fontSize: '0.6875rem',
                                        color: '#94a3b8',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        marginBottom: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      <span>VÀO</span>
                                      {(r.afternoonLateMinutes || 0) > 0 && (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '0 4px',
                                            borderRadius: '3px',
                                            backgroundColor: '#fef3c7',
                                            color: '#b45309',
                                            border: '1px solid #fde68a',
                                            fontSize: '0.5625rem',
                                            fontWeight: 700,
                                            lineHeight: '1.2',
                                            textTransform: 'none',
                                          }}
                                        >
                                          Muộn
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '0.8125rem',
                                        fontWeight:
                                          r.afternoonCheckIn && r.afternoonCheckIn !== '--:--'
                                            ? 700
                                            : 500,
                                        color:
                                          (r.afternoonLateMinutes || 0) > 0
                                            ? '#b45309'
                                            : r.afternoonCheckIn && r.afternoonCheckIn !== '--:--'
                                              ? '#0f172a'
                                              : '#94a3b8',
                                      }}
                                    >
                                      {formatTimeWithoutSeconds(r.afternoonCheckIn)}
                                    </div>
                                  </div>
                                  <div>
                                    <div
                                      style={{
                                        fontSize: '0.6875rem',
                                        color: '#94a3b8',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        marginBottom: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      <span>RA</span>
                                      {(r.afternoonEarlyMinutes || 0) > 0 && (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '0 4px',
                                            borderRadius: '3px',
                                            backgroundColor: '#ffedd5',
                                            color: '#c2410c',
                                            border: '1px solid #fed7aa',
                                            fontSize: '0.5625rem',
                                            fontWeight: 700,
                                            lineHeight: '1.2',
                                            textTransform: 'none',
                                          }}
                                        >
                                          Sớm
                                        </span>
                                      )}
                                      {hasOt && (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '0 4px',
                                            borderRadius: '3px',
                                            backgroundColor: '#f3e8ff',
                                            color: '#7e22ce',
                                            border: '1px solid #e9d5ff',
                                            fontSize: '0.5625rem',
                                            fontWeight: 700,
                                            lineHeight: '1.2',
                                            textTransform: 'none',
                                          }}
                                        >
                                          Tăng
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '0.8125rem',
                                        fontWeight:
                                          r.afternoonCheckOut && r.afternoonCheckOut !== '--:--'
                                            ? 700
                                            : 500,
                                        color:
                                          (r.afternoonEarlyMinutes || 0) > 0
                                            ? '#c2410c'
                                            : hasOt
                                              ? '#7e22ce'
                                              : r.afternoonCheckOut &&
                                                  r.afternoonCheckOut !== '--:--'
                                                ? '#0f172a'
                                                : '#94a3b8',
                                      }}
                                    >
                                      {formatTimeWithoutSeconds(r.afternoonCheckOut)}
                                    </div>
                                  </div>
                                </div>
                                {hasAfternoonLeaveShift && r.leaveInfo?.status === 'pending' && (
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      color: '#b45309',
                                    }}
                                  >
                                    <CalendarCheck size={10} />
                                    <span>Đơn chờ duyệt ({r.leaveInfo.leaveCategoryLabel})</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* 4. TỔNG CÔNG */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <div
                            style={{
                              fontSize: '0.9375rem',
                              fontWeight: 800,
                              color:
                                r.leaveInfo?.status === 'rejected' && (r.totalCredit || 0) === 0
                                  ? '#dc2626'
                                  : r.leaveInfo?.status === 'approved' && r.leaveInfo?.isPaidLeave
                                    ? '#0f766e'
                                    : (r.totalCredit || 0) > 0
                                      ? '#0f172a'
                                      : '#64748b',
                            }}
                          >
                            {(r.totalCredit || 0).toFixed(2)}
                          </div>
                          <div
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color:
                                r.leaveInfo?.status === 'rejected' && (r.totalCredit || 0) === 0
                                  ? '#dc2626'
                                  : r.leaveInfo?.status === 'approved'
                                    ? r.leaveInfo.isPaidLeave
                                      ? '#0f766e'
                                      : '#64748b'
                                    : r.leaveInfo?.status === 'pending' && (r.totalCredit || 0) === 0
                                      ? '#d97706'
                                      : '#94a3b8',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {r.leaveInfo
                              ? r.leaveInfo.status === 'approved'
                                ? (r.morningCheckIn && r.morningCheckIn !== '--:--') ||
                                  (r.afternoonCheckIn && r.afternoonCheckIn !== '--:--')
                                  ? 'CÔNG + PHÉP'
                                  : r.leaveInfo.isPaidLeave
                                    ? 'CÔNG PHÉP'
                                    : 'KHÔNG LƯƠNG'
                                : r.leaveInfo.status === 'rejected'
                                  ? (r.totalCredit || 0) > 0
                                    ? 'ĐI LÀM'
                                    : 'CHỜ NS XÁC MINH'
                                  : (r.totalCredit || 0) > 0
                                    ? 'ĐI LÀM (CHỜ DUYỆT)'
                                    : 'CHỜ PHÊ DUYỆT'
                              : 'CÔNG'}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );

  const renderModals = () => (
    <>
      {isTabletOrMobile && !showMobileRightColumn && (
        <button
          type="button"
          onClick={() => setShowMobileRightColumn(true)}
          title="Vuốt từ phải sang trái hoặc chạm để xem Bảng công"
          style={{
            position: 'fixed',
            right: 0,
            top: '48%',
            transform: 'translateY(-50%)',
            zIndex: 1040,
            backgroundColor: '#1e40af',
            color: '#ffffff',
            border: 'none',
            borderTopLeftRadius: '10px',
            borderBottomLeftRadius: '10px',
            padding: '12px 6px',
            boxShadow: '-3px 0 12px rgba(30, 64, 175, 0.35)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <ChevronLeft size={14} />
          <span
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              fontSize: '0.6875rem',
              fontWeight: 800,
              letterSpacing: '1px',
            }}
          >
            BẢNG CÔNG
          </span>
        </button>
      )}

      {isTabletOrMobile && showMobileRightColumn && (
        <div
          onClick={() => setShowMobileRightColumn(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 1099,
            transition: 'opacity 0.25s ease',
          }}
        />
      )}

      {/* ── MODAL GIẢI TRÌNH CHẤM CÔNG / XIN NGHỈ PHÉP ── */}
      {showExplanationModal && explanationRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a' }}>
                  {explanationReasonType === 'leave_request'
                    ? 'Đăng ký nghỉ phép'
                    : 'Gửi giải trình chấm công'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Ngày làm việc: {explanationRecord.dateStr} • {explanationRecord.dayOfWeek}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExplanationModal(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Loại yêu cầu / Lý do
                </label>
                <select
                  value={explanationReasonType}
                  onChange={(e) => setExplanationReasonType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}
                >
                  <option value="leave_request">📅 Xin nghỉ phép ngày này (Phép năm / Việc riêng / Nghỉ ốm)</option>
                  <option value="forget_morning_in">Quên chấm công vào ca sáng</option>
                  <option value="forget_morning_out">Quên chấm công ra ca sáng</option>
                  <option value="forget_afternoon_in">Quên chấm công vào ca chiều</option>
                  <option value="forget_afternoon_out">Quên chấm công ra ca chiều</option>
                  <option value="outside">Đi công tác tại công trình hoặc gặp khách hàng</option>
                  <option value="device_error">Thiết bị hoặc mạng GPS báo lỗi</option>
                </select>
              </div>

              {explanationReasonType === 'leave_request' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Phân loại nghỉ phép
                      </label>
                      <select
                        value={modalLeaveCategory}
                        onChange={(e) => setModalLeaveCategory(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.875rem',
                          fontFamily: "'Roboto Condensed', sans-serif",
                        }}
                      >
                        <option value="annual">Nghỉ phép năm hưởng lương (1 ngày/tháng)</option>
                        <option value="special">Nghỉ hưởng lương theo chế độ</option>
                        <option value="unpaid">Nghỉ không hưởng lương</option>
                        <option value="sick">Các loại nghỉ khác theo chính sách (Ốm/BHXH)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Thời gian nghỉ trong ngày
                      </label>
                      <select
                        value={modalLeaveSession}
                        onChange={(e) => setModalLeaveSession(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.875rem',
                          fontFamily: "'Roboto Condensed', sans-serif",
                        }}
                      >
                        <option value="all_day">Cả ngày (1.0 ngày)</option>
                        <option value="morning">Buổi sáng (0.5 ngày)</option>
                        <option value="afternoon">Buổi chiều (0.5 ngày)</option>
                      </select>
                    </div>
                  </div>
                  {(() => {
                    const targetY = explanationRecord?.dateStr?.slice(0, 4) || String(new Date().getFullYear());
                    const targetYM = explanationRecord?.dateStr?.slice(0, 7) || `${targetY}-10`;
                    const targetMNum = parseInt(targetYM.slice(5, 7), 10) || 10;
                    const reqDays = modalLeaveSession === 'all_day' ? 1 : 0.5;

                    let usedYearPaid = 0;
                    let usedMonthAllLeave = 0;
                    let usedMonthPaidAnnual = 0;

                    for (const rec of records) {
                      if (!rec.leaveInfo || rec.leaveInfo.status === 'rejected') continue;
                      if (rec.dateStr === explanationRecord?.dateStr) continue;
                      const w = rec.leaveInfo.leaveSession === 'all_day' ? 1 : 0.5;
                      if (rec.dateStr.startsWith(targetYM)) {
                        usedMonthAllLeave += w;
                      }
                      if (rec.dateStr.startsWith(targetY) && rec.leaveInfo.leaveCategory === 'annual') {
                        const p =
                          typeof rec.leaveInfo.paidCredit === 'number'
                            ? rec.leaveInfo.paidCredit
                            : rec.leaveInfo.isPaidLeave
                              ? w
                              : 0;
                        usedYearPaid += p;
                        if (rec.dateStr.startsWith(targetYM)) {
                          usedMonthPaidAnnual += p;
                        }
                      }
                    }

                    const remYearBefore = Math.max(0, 12 - usedYearPaid);
                    const remMonthPaid = Math.max(0, Math.min(1.0 - usedMonthPaidAnnual, remYearBefore));
                    const paidThis =
                      modalLeaveCategory === 'annual' ? Math.min(reqDays, remMonthPaid) : 0;
                    const remYearAfter =
                      modalLeaveCategory === 'annual'
                        ? Math.max(0, remYearBefore - paidThis)
                        : remYearBefore;
                    const isQuotaExceeded =
                      modalLeaveCategory === 'annual' &&
                      (remMonthPaid <= 0 || reqDays > remMonthPaid || remYearBefore <= 0);

                    return (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: isQuotaExceeded ? '#fef2f2' : '#f0fdf4',
                          border: isQuotaExceeded
                            ? '1px solid #fecaca'
                            : '1px solid #bbf7d0',
                          fontSize: '0.78rem',
                          color: isQuotaExceeded ? '#991b1b' : '#166534',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                          Kiểm soát phép năm
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            backgroundColor: '#ffffff',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(0,0,0,0.08)',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                              Tổng số ngày còn lại ({targetY}):
                            </div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                              {remYearBefore} / 12 ngày
                            </div>
                            <div
                              style={{
                                fontSize: '0.68rem',
                                color: isQuotaExceeded ? '#64748b' : '#15803d',
                                fontWeight: 600,
                              }}
                            >
                              {isQuotaExceeded
                                ? `Đã dùng: ${usedYearPaid}/12 ngày phép năm`
                                : `Sau đơn này còn: ${remYearAfter} ngày`}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                              Số ngày nghỉ trong tháng {targetMNum}/{targetY}:
                            </div>
                            <div
                              style={{
                                fontSize: '0.92rem',
                                fontWeight: 800,
                                color: isQuotaExceeded ? '#dc2626' : '#15803d',
                              }}
                            >
                              Khả dụng: {remMonthPaid} / 1 ngày
                            </div>
                            <div
                              style={{
                                fontSize: '0.68rem',
                                color: isQuotaExceeded ? '#dc2626' : '#15803d',
                                fontWeight: 700,
                              }}
                            >
                              {remMonthPaid <= 0
                                ? `Đã hết phép có lương tháng ${targetMNum} (Đã nghỉ: ${Math.min(1, usedMonthPaidAnnual)}/1 ngày)`
                                : reqDays > remMonthPaid
                                  ? `Vượt phép có lương khả dụng (Đơn này: ${reqDays} ngày)`
                                  : `Đã nghỉ phép có lương: ${Math.min(1, usedMonthPaidAnnual)}/1 ngày`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Giờ vào thực tế đề xuất
                    </label>
                    <input
                      type="time"
                      value={proposedCheckIn}
                      onChange={(e) => setProposedCheckIn(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        fontFamily: "'Roboto Condensed', sans-serif",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Giờ ra thực tế đề xuất
                    </label>
                    <input
                      type="time"
                      value={proposedCheckOut}
                      onChange={(e) => setProposedCheckOut(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        fontFamily: "'Roboto Condensed', sans-serif",
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {explanationReasonType === 'leave_request'
                    ? 'Lý do xin nghỉ phép & bàn giao công việc'
                    : 'Lý do chi tiết giải trình'}
                </label>
                <textarea
                  rows={3}
                  value={explanationContent}
                  onChange={(e) => setExplanationContent(e.target.value)}
                  placeholder={
                    explanationReasonType === 'leave_request'
                      ? 'Nhập lý do xin nghỉ phép và người nhận bàn giao công việc...'
                      : 'Nhập chi tiết hoàn cảnh hoặc lý do quên chấm công...'
                  }
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    fontFamily: "'Roboto Condensed', sans-serif",
                    resize: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Người tiếp nhận phê duyệt
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    backgroundColor: '#f8fafc',
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                padding: '12px 18px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <Button type="button" variant="secondary" onClick={() => setShowExplanationModal(false)}>
                Hủy bỏ
              </Button>
              {(() => {
                let isModalAnnualQuotaExceeded = false;
                if (explanationReasonType === 'leave_request' && modalLeaveCategory === 'annual') {
                  const targetY = explanationRecord?.dateStr?.slice(0, 4) || String(new Date().getFullYear());
                  const targetYM = explanationRecord?.dateStr?.slice(0, 7) || `${targetY}-10`;
                  const reqDays = modalLeaveSession === 'all_day' ? 1 : 0.5;
                  let usedYearPaid = 0;
                  let usedMonthPaidAnnual = 0;
                  for (const rec of records) {
                    if (!rec.leaveInfo || rec.leaveInfo.status === 'rejected') continue;
                    if (rec.dateStr === explanationRecord?.dateStr) continue;
                    const w = rec.leaveInfo.leaveSession === 'all_day' ? 1 : 0.5;
                    if (rec.dateStr.startsWith(targetY) && rec.leaveInfo.leaveCategory === 'annual') {
                      const p =
                        typeof rec.leaveInfo.paidCredit === 'number'
                          ? rec.leaveInfo.paidCredit
                          : rec.leaveInfo.isPaidLeave
                            ? w
                            : 0;
                      usedYearPaid += p;
                      if (rec.dateStr.startsWith(targetYM)) {
                        usedMonthPaidAnnual += p;
                      }
                    }
                  }
                  const remYearBefore = Math.max(0, 12 - usedYearPaid);
                  const remMonthPaid = Math.max(0, Math.min(1.0 - usedMonthPaidAnnual, remYearBefore));
                  isModalAnnualQuotaExceeded = remMonthPaid <= 0 || reqDays > remMonthPaid || remYearBefore <= 0;
                }
                return (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isModalAnnualQuotaExceeded}
                    onClick={handleSubmitExplanation}
                    style={{
                      opacity: isModalAnnualQuotaExceeded ? 0.5 : 1,
                      cursor: isModalAnnualQuotaExceeded ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {explanationReasonType === 'leave_request' ? 'Gửi đơn nghỉ phép' : 'Gửi giải trình'}
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── OFFCANVAS HIỂN THỊ NỘI QUY LAO ĐỘNG VÀ QUY TẮC TÍNH CÔNG RỘNG 400PX ── */}
      {showRulesOffcanvas && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200 }}>
          <div
            onClick={() => setShowRulesOffcanvas(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              transition: 'opacity 0.2s ease-in-out',
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '400px',
              maxWidth: '100vw',
              backgroundColor: '#ffffff',
              boxShadow: '-6px 0 25px rgba(0, 0, 0, 0.12)',
              zIndex: 1201,
              display: 'flex',
              flexDirection: 'column',
              fontFamily: "'Roboto Condensed', sans-serif",
              animation: 'slideInRight 0.2s ease-out',
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16a34a',
                  }}
                >
                  <JournalText size={17} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      letterSpacing: '0.2px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Quy tắc tính công
                  </h3>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 500 }}>
                    Nội quy lao động Seajong
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRulesOffcanvas(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: '#ffffff',
              }}
            >
              {/* THẺ 1: KHUNG GIỜ LÀM VIỆC VÀ CÔNG CHUẨN */}
              <div
                style={{
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  padding: '9px 11px',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#0284c7',
                    marginBottom: '6px',
                    paddingBottom: '3px',
                    borderBottom: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}
                >
                  <CalendarCheck size={13} /> 1. Khung giờ làm việc và công chuẩn
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7188rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Ca sáng:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {shiftHours.morningStart || '08:00'} đến {shiftHours.morningEnd || '12:00'} - Tích lũy 0,5 công
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Nghỉ trưa:</span>
                    <span style={{ color: '#64748b' }}>
                      {shiftHours.morningEnd || '12:00'} đến {shiftHours.afternoonStart || '13:30'} - Không tính giờ làm
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Ca chiều:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {shiftHours.afternoonStart || '13:30'} đến {shiftHours.afternoonEnd || '17:30'} - Tích lũy 0,5 công
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '3px', marginTop: '1px' }}>
                    <span style={{ color: '#15803d', fontWeight: 700 }}>Tổng ngày công chuẩn:</span>
                    <span style={{ fontWeight: 800, color: '#15803d' }}>
                      1,0 công với {laborRulesData?.shifts?.[0]?.workHours || 8} giờ làm việc
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1' }}>
                    <span style={{ fontWeight: 700 }}>Công chuẩn tháng (N_std):</span>
                    <span style={{ fontWeight: 600 }}>Tổng ngày tháng - số ngày CN (T7 tính đủ)</span>
                  </div>
                </div>
              </div>

              {/* THẺ 2: ĐIỀU KIỆN QUẸT THẺ VÀ TÍNH CÔNG */}
              <div
                style={{
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '9px 11px',
                  backgroundColor: '#ffffff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#15803d',
                    marginBottom: '5px',
                    paddingBottom: '3px',
                    borderBottom: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}
                >
                  <GeoAlt size={13} /> 2. Quy định quẹt thẻ và điều kiện tính công
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7188rem', color: '#334155', lineHeight: 1.35 }}>
                  <div>
                    • <strong>Điểm danh hợp lệ:</strong> Quẹt thẻ bán kính GPS ≤ 300m quanh cơ sở hoặc kết nối mạng WiFi/LAN nội bộ Seajong.
                  </div>
                  <div>
                    • <strong>Đủ 2 lượt quẹt mỗi ca:</strong> Ca sáng và Ca chiều độc lập, bắt buộc đủ cả Vào và Ra. Quên quẹt thẻ (chỉ có 1 đầu) tính 0,0 công ca đó.
                  </div>
                  <div>
                    • <strong>Thời lượng ca tối thiểu:</strong> Thời gian làm việc thực tế của ca dưới 60 phút sẽ tính 0,0 công.
                  </div>
                  <div>
                    • <strong>Cho phép điểm danh sớm:</strong> Tối đa 60 phút trước giờ làm việc.
                  </div>
                  <div>
                    • <strong>Nhân viên công tác ngoài:</strong> Tích chọn Công tác ngoài văn phòng và ghi rõ địa điểm công trình phụ trách.
                  </div>
                </div>
              </div>

              {/* THẺ 3: CHẾ TÀI ĐI MUỘN VÀ VỀ SỚM */}
              <div
                style={{
                  border: '1px solid #fed7aa',
                  borderRadius: '6px',
                  padding: '9px 11px',
                  backgroundColor: '#fff7ed',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#c2410c',
                    marginBottom: '5px',
                    paddingBottom: '3px',
                    borderBottom: '1px solid #fed7aa',
                    textTransform: 'uppercase',
                  }}
                >
                  <ExclamationTriangle size={13} /> 3. Chế tài đi muộn và về sớm (xét theo ca 0,5 công)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7188rem', color: '#431407' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #fdba74', paddingBottom: '2px' }}>
                    <span>Thời gian ân hạn cho phép:</span>
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>
                      ≤ {laborRulesData?.gracePeriodMinutes || 30} phút không tính vi phạm (đủ 0,5 công)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #fdba74', paddingBottom: '2px' }}>
                    <span>Vi phạm 31 đến 60 phút:</span>
                    <span style={{ fontWeight: 700, color: '#c2410c' }}>Trừ 0,125 công (còn 0,375 công) hoặc phạt 100.000 đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #fdba74', paddingBottom: '2px' }}>
                    <span>Vi phạm 61 đến 120 phút:</span>
                    <span style={{ fontWeight: 700, color: '#b91c1c' }}>Trừ 0,25 công (còn 0,25 công) hoặc phạt 150.000 đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #fdba74', paddingBottom: '2px' }}>
                    <span>Nghiêm trọng (trên 120 phút):</span>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>Trừ 0,5 công (0,0 công) hoặc phạt 200.000 đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#9a3412', paddingTop: '1px' }}>
                    <span>Thời hạn nộp đơn giải trình:</span>
                    <span style={{ fontWeight: 700 }}>Trong vòng {laborRulesData?.explanationDeadlineHours || 48} giờ</span>
                  </div>
                </div>
              </div>

              {/* THẺ 4: LÀM THÊM GIỜ (OT) VÀ SUẤT ĂN */}
              <div
                style={{
                  border: '1px solid #ddd6fe',
                  borderRadius: '6px',
                  padding: '9px 11px',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#7c3aed',
                    marginBottom: '5px',
                    paddingBottom: '3px',
                    borderBottom: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}
                >
                  <CashCoin size={13} /> 4. Chế độ làm thêm giờ (OT) và Suất ăn
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7188rem', color: '#334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Hệ số làm thêm giờ (OT):</span>
                    <span style={{ fontWeight: 700, color: '#7c3aed' }}>
                      Ngày thường {laborRulesData?.overtimeRule?.weekdayRatePercent || 150}% • CN {laborRulesData?.overtimeRule?.weekendRatePercent || 200}% • Lễ Tết {laborRulesData?.overtimeRule?.holidayRatePercent || 300}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Ca đêm (22:00 - 06:00):</span>
                    <span style={{ fontWeight: 700, color: '#0284c7' }}>
                      Cộng thêm {laborRulesData?.overtimeRule?.nightBonusPercent || 30}% phụ cấp + hỗ trợ {(laborRulesData?.overtimeRule?.nightTransportSupportAmount || 50000).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '3px' }}>
                    <span>• Quy chế suất ăn ca:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      Chốt trưa trước {laborRulesData?.lunchRule?.lunchDeadlineMorning || '09:00'} • tối trước {laborRulesData?.lunchRule?.dinnerDeadlineAfternoon || '15:30'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                    Đăng ký nhưng bỏ suất ăn: Phạt <strong>{(laborRulesData?.lunchRule?.missedMealPenalty || 35000).toLocaleString('vi-VN')} đ/suất</strong>. Phụ cấp cơm tối tăng ca ≥ 2h: <strong>{(laborRulesData?.overtimeRule?.dinnerAllowanceAmount || 35000).toLocaleString('vi-VN')} đ</strong>.
                  </div>
                </div>
              </div>

              {/* THẺ 5: NGHỈ LỄ, TẾT VÀ PHÉP NĂM */}
              <div
                style={{
                  border: '1px solid #99f6e4',
                  borderRadius: '6px',
                  padding: '9px 11px',
                  backgroundColor: '#ffffff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#0f766e',
                    marginBottom: '5px',
                    paddingBottom: '3px',
                    borderBottom: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}
                >
                  <Briefcase size={13} /> 5. Nghỉ lễ, Tết và phép năm (Luật định)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7188rem', color: '#334155', lineHeight: 1.35 }}>
                  <div>
                    • <strong>Kỳ nghỉ lễ, Tết hưởng 100% lương:</strong> Tết Dương Lịch, Tết Âm Lịch, Giỗ Tổ Hùng Vương, 30/04 - 01/05, Quốc Khánh 02/09, Ngày Văn hoá Việt Nam (24/11).
                  </div>
                  <div>
                    • <strong>Nghỉ phép năm:</strong> Định mức <strong>{holidayRulesData?.annualLeavePolicy?.standardLeaveDaysPerYear || 12} ngày/năm</strong>. Cứ đủ <strong>{holidayRulesData?.annualLeavePolicy?.seniorityBonusYears || 5} năm</strong> thâm niên được tăng thêm <strong>{holidayRulesData?.annualLeavePolicy?.seniorityBonusDays || 1} ngày</strong> phép.
                  </div>
                  <div>
                    • <strong>Nghỉ việc riêng hưởng nguyên lương:</strong> Bản thân kết hôn (3 ngày), con kết hôn (1 ngày), tứ thân phụ mẫu / vợ / chồng / con mất (3 ngày).
                  </div>
                </div>
              </div>

              {/* THẺ 6: GIẢI TRÌNH CHẤM CÔNG */}
              <div
                style={{
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  padding: '8px 11px',
                  backgroundColor: '#f0f9ff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#0369a1',
                    marginBottom: '3px',
                    textTransform: 'uppercase',
                  }}
                >
                  <InfoCircle size={13} /> 6. Quy trình nộp phiếu giải trình công
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#075985', lineHeight: 1.35 }}>
                  • Quên quẹt thẻ hoặc sự cố thiết bị: Gửi phiếu giải trình trong vòng <strong>48 giờ</strong> để quản lý duyệt. Sau 48 giờ hệ thống tự động khóa và tính nghỉ không phép.
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
              }}
            >
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowRulesOffcanvas(false)}
                style={{
                  width: '100%',
                  fontWeight: 700,
                  fontSize: '0.8438rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#4f46e5',
                  borderColor: '#4f46e5',
                }}
              >
                Đã hiểu quy tắc
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <div
        className="split-cards-container"
        style={{
          display: 'grid',
          gridTemplateColumns: isTabletOrMobile ? '1fr' : '5fr 7fr',
          gap: '8px',
          flex: '1 1 0%',
          minHeight: 0,
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          className="split-card-item split-card-left"
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            height: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            overflowY: 'auto',
            padding: isMobileScreen
              ? '12px 12px calc(18px + env(safe-area-inset-bottom, 0px))'
              : '14px 16px',
            gap: '14px',
          }}
        >
          {renderLeftContent()}
        </div>
        {!isTabletOrMobile && (
          <div
            className="split-card-item split-card-right"
            style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              height: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            {renderRightContent()}
          </div>
        )}
      </div>
      {isTabletOrMobile && renderRightContent()}
      {renderModals()}
    </>
  );
};

export const MyAttendanceView = MyTimekeepingView;
export default MyAttendanceView;
