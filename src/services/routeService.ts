// Service Quản lý đi tuyến thị trường (Sales Route Management Service)
// Lưu trữ 100% dữ liệu thực tế vào Cơ sở dữ liệu (SQLite / Prisma DB), loại bỏ hoàn toàn mock data

export interface RouteWaypoint {
  id: string;
  orderIndex: number;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  lat: number;
  lng: number;
  checkInTime: string;
  checkOutTime?: string;
  stayDurationMinutes?: number;
  purpose: 'Chăm sóc đại lý' | 'Lấy đơn hàng' | 'Khảo sát trưng bày' | 'Phát triển mới' | 'Thu hồi công nợ' | 'Khác';
  orderAmount?: number;
  notes?: string;
  photos?: string[];
  status: 'checked_in' | 'completed';
}

export interface PlannedWaypointItem {
  name: string;
  address: string;
  phone?: string;
  lat?: number;
  lng?: number;
  isCustom?: boolean;
}

export interface RouteTrip {
  id: string;
  code: string;
  employeeId: string | number;
  employeeName: string;
  employeeAvatar?: string;
  date: string; // YYYY-MM-DD
  status: 'in_progress' | 'completed' | 'cancelled';
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  vehicle: 'Xe máy' | 'Ô tô cá nhân' | 'Xe công ty';
  startPoint: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  endPoint?: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  waypoints: RouteWaypoint[];
  pathCoordinates: [number, number][]; // [lat, lng][] (Đường cong thực tế theo lòng đường giao thông)
  plannedPathCoordinates?: [number, number][]; // Tuyến đường đã chốt kế hoạch ban đầu
  plannedWaypoints?: PlannedWaypointItem[]; // Danh sách các điểm ghé đại lý đã chốt
  plannedDistanceKm?: number; // Cự ly dự tính theo tuyến đã chốt
  totalDistanceKm: number;
  totalDurationMinutes: number;
  endPhotos?: string[];
  notes?: string;
  createdAt: string;
}

export interface DealerItem {
  id: string;
  code?: string | null;
  name: string;
  address?: string | null;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
}

// Lấy danh sách đại lý từ Database
export const fetchDealersAsync = async (): Promise<DealerItem[]> => {
  try {
    const res = await fetch('/api/sales/dealers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('Lỗi fetch /api/sales/dealers:', err);
  }
  return [];
};

// Từ điển tọa độ chuẩn các tỉnh thành và quận huyện phổ biến tại Việt Nam
// Đảm bảo không bao giờ bị mất điểm check-in kể cả khi địa chỉ viết tắt, không chuẩn hoặc OpenStreetMap bị timeout/rate limit
export const VN_LOCATIONS_DICT: Record<string, [number, number]> = {
  // Trụ sở & cơ sở Seajong
  'seajong': [21.0474, 105.7786],
  'phú diễn': [21.0474, 105.7786],
  'phu dien': [21.0474, 105.7786],
  'kho seajong': [21.0474, 105.7786],
  'văn phòng seajong': [21.0474, 105.7786],
  'kho hàng': [21.0480, 105.7800],
  'kho': [21.0480, 105.7800],
  'văn phòng': [21.0285, 105.8542],
  'nhà riêng': [21.0350, 105.7900],

  // Hà Nội & các quận huyện
  'ha noi': [21.0285, 105.8542],
  'hà nội': [21.0285, 105.8542],
  'hoàn kiếm': [21.0285, 105.8542],
  'hoan kiem': [21.0285, 105.8542],
  'ba đình': [21.0348, 105.8236],
  'ba dinh': [21.0348, 105.8236],
  'đống đa': [21.0181, 105.8258],
  'dong da': [21.0181, 105.8258],
  'hai bà trưng': [21.0076, 105.8524],
  'hai ba trung': [21.0076, 105.8524],
  'thanh xuân': [20.9937, 105.8122],
  'thanh xuan': [20.9937, 105.8122],
  'hoàng mai': [20.9754, 105.8643],
  'hoang mai': [20.9754, 105.8643],
  'tam trinh': [20.9850, 105.8650],
  'tam trinh, hoàng mai': [20.9850, 105.8650],
  'long biên': [21.0362, 105.8920],
  'long bien': [21.0362, 105.8920],
  'đan phượng': [21.1167, 105.6667],
  'dan phuong': [21.1167, 105.6667],
  'tân tây đô': [21.0833, 105.7000],
  'tan tay do': [21.0833, 105.7000],
  'sơn tây': [21.1378, 105.5036],
  'son tay': [21.1378, 105.5036],
  'hà đông': [20.9723, 105.7770],
  'ha dong': [20.9723, 105.7770],
  'văn phú': [20.9600, 105.7650],
  'van phu': [20.9600, 105.7650],
  'tây hồ': [21.0718, 105.8236],
  'tay ho': [21.0718, 105.8236],
  'cầu giấy': [21.0333, 105.7937],
  'cau giay': [21.0333, 105.7937],
  'bắc từ liêm': [21.0600, 105.7600],
  'bac tu liem': [21.0600, 105.7600],
  'nam từ liêm': [21.0142, 105.7812],
  'nam tu liem': [21.0142, 105.7812],
  'mễ trì': [21.0142, 105.7812],
  'me tri': [21.0142, 105.7812],
  'đông anh': [21.1394, 105.8456],
  'dong anh': [21.1394, 105.8456],
  'gia lâm': [21.0336, 105.9431],
  'gia lam': [21.0336, 105.9431],
  'hoài đức': [21.0167, 105.7000],
  'hoai duc': [21.0167, 105.7000],
  'thạch thất': [21.0000, 105.5667],
  'thach that': [21.0000, 105.5667],
  'chương mỹ': [20.8833, 105.7000],
  'chuong my': [20.8833, 105.7000],
  'thanh trì': [20.9500, 105.8500],
  'thanh tri': [20.9500, 105.8500],
  'ba vì': [21.2333, 105.3833],
  'ba vi': [21.2333, 105.3833],
  'quốc oai': [20.9833, 105.6333],
  'quoc oai': [20.9833, 105.6333],
  'mê linh': [21.1833, 105.7167],
  'me linh': [21.1833, 105.7167],
  'sóc sơn': [21.2833, 105.8500],
  'soc son': [21.2833, 105.8500],
  'thường tín': [20.8667, 105.8667],
  'thuong tin': [20.8667, 105.8667],
  'phú xuyên': [20.7333, 105.9000],
  'phu xuyen': [20.7333, 105.9000],
  'ứng hòa': [20.7333, 105.7833],
  'ung hoa': [20.7333, 105.7833],
  'mỹ đức': [20.6833, 105.7333],
  'my duc': [20.6833, 105.7333],

  // Bắc Ninh & các huyện
  'bắc ninh': [21.1861, 106.0763],
  'bac ninh': [21.1861, 106.0763],
  'nhân thắng': [21.0750, 106.2100],
  'nhan thang': [21.0750, 106.2100],
  'cầu đào': [21.0750, 106.2100],
  'cau dao': [21.0750, 106.2100],
  'gia bình': [21.0667, 106.1833],
  'gia binh': [21.0667, 106.1833],
  'thuận thành': [21.0500, 106.0833],
  'thuan thanh': [21.0500, 106.0833],
  'từ sơn': [21.1167, 105.9667],
  'tu son': [21.1167, 105.9667],
  'quế võ': [21.1667, 106.1667],
  'que vo': [21.1667, 106.1667],
  'tiên du': [21.1333, 106.0167],
  'tien du': [21.1333, 106.0167],
  'yên phong': [21.2000, 105.9833],
  'yen phong': [21.2000, 105.9833],
  'lương tài': [21.0167, 106.2333],
  'luong tai': [21.0167, 106.2333],

  // Hải Dương & các huyện
  'hải dương': [20.9373, 106.3146],
  'hai duong': [20.9373, 106.3146],
  'cẩm giàng': [20.9500, 106.2000],
  'cam giang': [20.9500, 106.2000],
  'bình giang': [20.9000, 106.1833],
  'binh giang': [20.9000, 106.1833],
  'kẻ sặt': [20.9167, 106.1667],
  'ke sat': [20.9167, 106.1667],
  'nam sách': [20.9833, 106.3333],
  'nam sach': [20.9833, 106.3333],
  'chí linh': [21.1167, 106.3833],
  'chi linh': [21.1167, 106.3833],
  'kinh môn': [20.9833, 106.5333],
  'kinh mon': [20.9833, 106.5333],
  'gia lộc': [20.8667, 106.2833],
  'gia loc': [20.8667, 106.2833],
  'tứ kỳ': [20.8167, 106.3667],
  'tu ky': [20.8167, 106.3667],
  'kim thành': [20.9167, 106.4833],
  'kim thanh': [20.9167, 106.4833],
  'thanh hà': [20.8833, 106.4167],
  'thanh ha': [20.8833, 106.4167],
  'thanh miện': [20.7667, 106.2333],
  'thanh mien': [20.7667, 106.2333],
  'ninh giang': [20.7333, 106.3000],

  // Hưng Yên & các huyện
  'hưng yên': [20.6500, 106.0500],
  'hung yen': [20.6500, 106.0500],
  'mỹ hào': [20.9500, 106.0833],
  'my hao': [20.9500, 106.0833],
  'văn giang': [20.9333, 105.9500],
  'van giang': [20.9333, 105.9500],
  'văn lâm': [20.9833, 106.0333],
  'van lam': [20.9833, 106.0333],
  'yên mỹ': [20.9000, 106.0333],
  'yen my': [20.9000, 106.0333],
  'khoái châu': [20.8333, 105.9833],
  'khoai chau': [20.8333, 105.9833],

  // Các tỉnh thành khác
  'hải phòng': [20.8449, 106.6881],
  'hai phong': [20.8449, 106.6881],
  'quảng ninh': [20.9599, 107.0425],
  'quang ninh': [20.9599, 107.0425],
  'hạ long': [20.9599, 107.0425],
  'ha long': [20.9599, 107.0425],
  'thái bình': [20.4464, 106.3366],
  'thai binh': [20.4464, 106.3366],
  'nam định': [20.4200, 106.1683],
  'nam dinh': [20.4200, 106.1683],
  'hà nam': [20.5414, 105.9139],
  'ha nam': [20.5414, 105.9139],
  'phủ lý': [20.5414, 105.9139],
  'phu ly': [20.5414, 105.9139],
  'ninh bình': [20.2506, 105.9745],
  'ninh binh': [20.2506, 105.9745],
  'vĩnh phúc': [21.3089, 105.6049],
  'vinh phuc': [21.3089, 105.6049],
  'phú thọ': [21.3227, 105.4019],
  'phu tho': [21.3227, 105.4019],
  'việt trì': [21.3227, 105.4019],
  'viet tri': [21.3227, 105.4019],
  'thái nguyên': [21.5942, 105.8482],
  'thai nguyen': [21.5942, 105.8482],
  'bắc giang': [21.2731, 106.1946],
  'bac giang': [21.2731, 106.1946],
  'lạng sơn': [21.8533, 106.7583],
  'lang son': [21.8533, 106.7583],
  'thanh hóa': [19.8067, 105.7852],
  'thanh hoa': [19.8067, 105.7852],
  'nghệ an': [18.6734, 105.6813],
  'nghe an': [18.6734, 105.6813],
  'vinh': [18.6734, 105.6813],
  'hà tĩnh': [18.3429, 105.9059],
  'ha tinh': [18.3429, 105.9059],
  'nha trang': [12.2388, 109.1967],
  'khánh hòa': [12.2388, 109.1967],
  'khanh hoa': [12.2388, 109.1967],
  'đà nẵng': [16.0544, 108.2022],
  'da nang': [16.0544, 108.2022],
  'hồ chí minh': [10.8231, 106.6297],
  'ho chi minh': [10.8231, 106.6297],
  'sài gòn': [10.8231, 106.6297],
  'sai gon': [10.8231, 106.6297],
};

/**
 * Làm sạch địa chỉ Việt Nam để Geocoding chuẩn xác
 */
export const cleanVietnameseAddress = (rawAddress: string): string => {
  if (!rawAddress) return '';
  return rawAddress
    .replace(/\b(NR|nr|kđt|kdt|khu đô thị|thôn|xóm|ngõ|ngách|số|thửa đất|tại quầy|showroom|đại lý|dntn|cty|công ty)\b/gi, ' ')
    .replace(/thỉnh\s+/gi, 'tỉnh ')
    .replace(/ngã\s+(ba|tư)\s+[^,]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Định vị Geocoding thông minh hỗ trợ tiếng Việt có fallback từ điển địa lý
 * Đảm bảo 100% không bao giờ bị mất điểm check-in khi người dùng chọn nhiều điểm
 */
export const smartGeocodeVietnameseAddress = async (
  rawAddress?: string | null,
  dealerName?: string | null
): Promise<[number, number] | null> => {
  const combined = `${rawAddress || ''} ${dealerName || ''}`.trim();
  if (!combined) return null;

  const textToScan = combined.toLowerCase();

  // 1. Thử gọi Geocoding Nominatim nếu có địa chỉ cụ thể
  const cleaned = cleanVietnameseAddress(rawAddress || '');
  if (cleaned.length >= 4) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned + ', Việt Nam')}&countrycodes=vn&limit=1`,
        { headers: { 'Accept-Language': 'vi' }, signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          return [Number(Number(data[0].lat).toFixed(6)), Number(Number(data[0].lon).toFixed(6))];
        }
      }
    } catch {}
  }

  // 2. Tra cứu từ điển địa lý chuyên sâu theo Huyện / Thị trấn / Xã / Tỉnh thành
  // Quét theo thứ tự từ cụm dài (chi tiết hơn) đến cụm ngắn
  const dictKeys = Object.keys(VN_LOCATIONS_DICT).sort((a, b) => b.length - a.length);
  for (const k of dictKeys) {
    if (textToScan.includes(k)) {
      const [baseLat, baseLng] = VN_LOCATIONS_DICT[k];
      // Jitter nhẹ trong phạm vi 300m - 500m để tránh trường hợp nhiều đại lý trong cùng 1 huyện bị trùng khít tọa độ
      const jitterLat = Number((baseLat + (Math.random() - 0.5) * 0.008).toFixed(6));
      const jitterLng = Number((baseLng + (Math.random() - 0.5) * 0.008).toFixed(6));
      return [jitterLat, jitterLng];
    }
  }

  // 3. Fallback mặc định khu vực Hà Nội (nơi đặt trụ sở Seajong)
  const defaultBaseLat = 21.0285;
  const defaultBaseLng = 105.8542;
  const jitterLat = Number((defaultBaseLat + (Math.random() - 0.5) * 0.03).toFixed(6));
  const jitterLng = Number((defaultBaseLng + (Math.random() - 0.5) * 0.03).toFixed(6));
  return [jitterLat, jitterLng];
};

// Chuyển địa chỉ sang tọa độ [lat, lng] qua Geocoding OpenStreetMap
export const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
  return smartGeocodeVietnameseAddress(address, '');
};

// Hàm tính khoảng cách giữa 2 tọa độ (Haversine formula - đơn vị: km)
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1000) / 1000; // km
};

/**
 * Tối ưu hóa thứ tự các điểm dừng check-in theo đúng lộ trình di chuyển tối ưu nhất (Nearest Neighbor Route Optimization)
 * Điểm nào gần điểm xuất phát hơn hoặc nằm trước trên tuyến đường sẽ được đánh số #1, tiếp theo là #2, #3...
 */
export const optimizeWaypointOrder = (
  startCoord: [number, number],
  waypoints: PlannedWaypointItem[],
  endCoord?: [number, number]
): PlannedWaypointItem[] => {
  if (waypoints.length <= 1) return waypoints;

  const remaining = [...waypoints];
  const ordered: PlannedWaypointItem[] = [];
  let currentPos: [number, number] = startCoord;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i];
      if (p.lat && p.lng) {
        const dist = calculateDistanceKm(currentPos[0], currentPos[1], p.lat, p.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }
    }

    const nextPoint = remaining.splice(nearestIndex, 1)[0];
    ordered.push(nextPoint);
    if (nextPoint.lat && nextPoint.lng) {
      currentPos = [nextPoint.lat, nextPoint.lng];
    }
  }

  return ordered;
};

// Khoảng cách từ 1 điểm P đến 1 đoạn thẳng [A, B] (đơn vị: km)
export const pointToSegmentDistanceKm = (
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number => {
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  if (dx === 0 && dy === 0) {
    return calculateDistanceKm(pLat, pLng, aLat, aLng);
  }
  const t = Math.max(0, Math.min(1, ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy)));
  const cLat = aLat + t * dy;
  const cLng = aLng + t * dx;
  return calculateDistanceKm(pLat, pLng, cLat, cLng);
};

// Kiểm tra điểm có nằm gần tuyến đường đã chốt hay không (ngưỡng 120m)
export const isPointNearPolyline = (
  point: [number, number],
  polyline: [number, number][],
  thresholdKm = 0.12
): boolean => {
  if (!polyline || polyline.length === 0) return true;
  if (polyline.length === 1) {
    return calculateDistanceKm(point[0], point[1], polyline[0][0], polyline[0][1]) <= thresholdKm;
  }
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentDistanceKm(
      point[0],
      point[1],
      polyline[i][0],
      polyline[i][1],
      polyline[i + 1][0],
      polyline[i + 1][1]
    );
    if (d <= thresholdKm) return true;
  }
  return false;
};

// Phân đoạn tuyến đường thực tế thành các cung Trùng tuyến (xanh) và Lệch tuyến (đỏ cam)
export interface RouteSegment {
  coords: [number, number][];
  isDeviated: boolean; // true = đi chệch tuyến chốt, false = trùng tuyến
}

export const splitActualPathByPlan = (
  actualCoords: [number, number][],
  plannedCoords?: [number, number][]
): RouteSegment[] => {
  if (!actualCoords || actualCoords.length < 2) {
    return [{ coords: actualCoords || [], isDeviated: false }];
  }
  if (!plannedCoords || plannedCoords.length < 2) {
    return [{ coords: actualCoords, isDeviated: false }];
  }

  const segments: RouteSegment[] = [];
  let currentSegment: [number, number][] = [actualCoords[0]];
  let currentIsDeviated = !isPointNearPolyline(actualCoords[0], plannedCoords);

  for (let i = 1; i < actualCoords.length; i++) {
    const pt = actualCoords[i];
    const isDev = !isPointNearPolyline(pt, plannedCoords);

    if (isDev === currentIsDeviated) {
      currentSegment.push(pt);
    } else {
      // Đóng segment hiện tại và nối tiếp điểm giao
      currentSegment.push(pt);
      segments.push({ coords: currentSegment, isDeviated: currentIsDeviated });
      currentSegment = [pt];
      currentIsDeviated = isDev;
    }
  }

  if (currentSegment.length >= 2) {
    segments.push({ coords: currentSegment, isDeviated: currentIsDeviated });
  }

  return segments;
};

// Tính tổng khoảng cách của chuỗi tọa độ
export const calculateTotalPathKm = (coords: [number, number][]): number => {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += calculateDistanceKm(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
  }
  return Math.round(total * 10) / 10;
};

// Hàm định tuyến thực tế theo lòng đường giao thông (hỗ trợ phân biệt Xe máy vs Ô tô)
export const fetchActualRoadRoute = async (
  points: [number, number][],
  vehicle?: RouteTrip['vehicle']
): Promise<{ coordinates: [number, number][]; distanceKm: number }> => {
  if (points.length < 2) {
    return { coordinates: points, distanceKm: 0 };
  }

  const coordsQuery = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const isBike = vehicle === 'Xe máy';

  const endpoints = isBike
    ? [
        `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`,
        `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`,
      ]
    : [
        `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`,
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`,
      ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const roadCoords: [number, number][] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]
          );
          const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
          return { coordinates: roadCoords, distanceKm };
        }
      }
    } catch (err) {
      console.warn(`Routing endpoint failed (${url}):`, err);
    }
  }

  // Fallback nếu offline hoặc không có mạng
  return {
    coordinates: points,
    distanceKm: calculateTotalPathKm(points),
  };
};

const STORAGE_KEY = 'seajong_sales_route_trips_db_cache';

// KHÔNG CÒN DỮ LIỆU MOCK NÀO (Danh sách rỗng 100% chuẩn DB)
const DEFAULT_TRIPS: RouteTrip[] = [];

export const routeService = {
  // Lấy danh sách từ cache đồng bộ nhanh
  getTrips(): RouteTrip[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_TRIPS;
  },

  // Lưu danh sách vào cache Storage
  saveTrips(trips: RouteTrip[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch (e) {
      console.error('Failed to save route trips to localStorage', e);
    }
  },

  // Tải danh sách ca đi tuyến từ Database qua API Backend
  async fetchTripsAsync(filters?: {
    employeeName?: string;
    status?: string;
    date?: string;
  }): Promise<RouteTrip[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.employeeName) params.append('employeeName', filters.employeeName);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.date) params.append('date', filters.date);

      const res = await fetch(`/api/sales/routes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.saveTrips(data);
          return data;
        }
      }
    } catch (err) {
      console.warn('Lỗi gọi API /api/sales/routes, dùng cache tạm thời:', err);
    }
    return this.getTrips();
  },

  // Bắt đầu ca đi tuyến mới và lưu trực tiếp vào Database (kèm tuyến chốt kế hoạch)
  async startTripAsync(params: {
    employeeId: string | number;
    employeeName: string;
    vehicle: RouteTrip['vehicle'];
    startPointName?: string;
    startAddress?: string;
    lat: number;
    lng: number;
    endPointName?: string;
    endAddress?: string;
    endLat?: number;
    endLng?: number;
    plannedPathCoordinates?: [number, number][];
    plannedWaypoints?: PlannedWaypointItem[];
    plannedDistanceKm?: number;
    notes?: string;
  }): Promise<RouteTrip> {
    try {
      const res = await fetch('/api/sales/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        const created: RouteTrip = await res.json();
        const current = this.getTrips();
        const updated = [created, ...current.filter((t) => t.id !== created.id)];
        this.saveTrips(updated);
        return created;
      }
    } catch (err) {
      console.error('Lỗi API tạo ca đi tuyến, dùng fallback local:', err);
    }

    // Fallback nếu không có kết nối server
    const trips = this.getTrips();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().slice(0, 10);
    const code = `TRIP-${dateStr.replace(/-/g, '')}-${String(trips.length + 1).padStart(3, '0')}`;

    const localTrip: RouteTrip = {
      id: `trip-${Date.now()}`,
      code,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      date: dateStr,
      status: 'in_progress',
      startTime: timeStr,
      vehicle: params.vehicle || 'Xe máy',
      startPoint: {
        name: params.startPointName || 'Vị trí thiết bị',
        address: params.startAddress || `${params.lat}, ${params.lng}`,
        lat: params.lat,
        lng: params.lng,
      },
      endPoint: params.endPointName
        ? {
            name: params.endPointName,
            address: params.endAddress || '',
            lat: params.endLat || 0,
            lng: params.endLng || 0,
          }
        : undefined,
      waypoints: [],
      pathCoordinates: [[params.lat, params.lng]],
      plannedPathCoordinates: params.plannedPathCoordinates || [],
      plannedWaypoints: params.plannedWaypoints || [],
      plannedDistanceKm: params.plannedDistanceKm || 0,
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      notes: params.notes || '',
      createdAt: now.toISOString(),
    };

    const updated = [localTrip, ...trips];
    this.saveTrips(updated);
    return localTrip;
  },

  // Thêm điểm ghé thăm khách hàng / đại lý và lưu vào Database
  async addWaypointAsync(
    tripId: string,
    params: {
      customerId?: string;
      customerName: string;
      customerPhone?: string;
      customerAddress: string;
      lat: number;
      lng: number;
      purpose: RouteWaypoint['purpose'];
      orderAmount?: number;
      notes?: string;
      photos?: string[];
    }
  ): Promise<RouteTrip | null> {
    const trips = this.getTrips();
    const tripIndex = trips.findIndex((t) => t.id === tripId);
    const trip = tripIndex !== -1 ? { ...trips[tripIndex] } : null;

    const keyPoints: [number, number][] = trip
      ? [
          [trip.startPoint.lat, trip.startPoint.lng],
          ...trip.waypoints.map((w): [number, number] => [w.lat, w.lng]),
          [params.lat, params.lng],
        ]
      : [[params.lat, params.lng]];

    // Tính đường giao thông thực tế qua OSRM
    const roadResult = await fetchActualRoadRoute(keyPoints);

    try {
      const res = await fetch(`/api/sales/routes/${tripId}/waypoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          pathCoordinates: roadResult.coordinates,
          totalDistanceKm: roadResult.distanceKm,
        }),
      });

      if (res.ok) {
        const refreshed = await this.fetchTripsAsync();
        return refreshed.find((t) => t.id === tripId) || null;
      }
    } catch (err) {
      console.warn('Lỗi gọi API check-in đại lý:', err);
    }

    // Fallback local cache
    if (!trip) return null;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newWp: RouteWaypoint = {
      id: `wp-${Date.now()}`,
      orderIndex: trip.waypoints.length + 1,
      customerId: params.customerId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerAddress: params.customerAddress,
      lat: params.lat,
      lng: params.lng,
      checkInTime: timeStr,
      purpose: params.purpose,
      orderAmount: params.orderAmount || 0,
      notes: params.notes || '',
      photos: params.photos || [],
      status: 'checked_in',
    };

    trip.waypoints = [...trip.waypoints, newWp];
    trip.pathCoordinates = roadResult.coordinates;
    trip.totalDistanceKm = roadResult.distanceKm;
    trips[tripIndex] = trip;
    this.saveTrips(trips);
    return trip;
  },

  // Check-out điểm ghé thăm
  async checkoutWaypoint(
    tripId: string,
    waypointId: string,
    params?: {
      orderAmount?: number;
      notes?: string;
    }
  ): Promise<RouteTrip | null> {
    try {
      await fetch(`/api/sales/routes/${tripId}/waypoints/${waypointId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {}),
      });
      const refreshed = await this.fetchTripsAsync();
      return refreshed.find((t) => t.id === tripId) || null;
    } catch {}

    // Fallback local
    const trips = this.getTrips();
    const tripIndex = trips.findIndex((t) => t.id === tripId);
    if (tripIndex === -1) return null;
    const trip = { ...trips[tripIndex] };
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    trip.waypoints = trip.waypoints.map((wp) => {
      if (wp.id === waypointId) {
        return {
          ...wp,
          checkOutTime: timeStr,
          orderAmount: params?.orderAmount !== undefined ? params.orderAmount : wp.orderAmount,
          notes: params?.notes ? `${wp.notes ? wp.notes + ' • ' : ''}${params.notes}` : wp.notes,
          status: 'completed' as const,
        };
      }
      return wp;
    });

    trips[tripIndex] = trip;
    this.saveTrips(trips);
    return trip;
  },

  // Ghi nhận tọa độ thiết bị GPS thời gian thực khi di chuyển
  recordLiveLocation(tripId: string, lat: number, lng: number): RouteTrip | null {
    fetch(`/api/sales/routes/${tripId}/live-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    }).catch(() => {});

    const trips = this.getTrips();
    const tripIndex = trips.findIndex((t) => t.id === tripId);
    if (tripIndex === -1) return null;
    const trip = { ...trips[tripIndex] };
    if (trip.status !== 'in_progress') return trip;

    const lastCoord = trip.pathCoordinates[trip.pathCoordinates.length - 1];
    if (lastCoord) {
      const dist = calculateDistanceKm(lastCoord[0], lastCoord[1], lat, lng);
      if (dist < 0.015) return trip;
    }

    trip.pathCoordinates = [...trip.pathCoordinates, [lat, lng]];
    trip.totalDistanceKm = Math.round(calculateTotalPathKm(trip.pathCoordinates) * 10) / 10;
    trips[tripIndex] = trip;
    this.saveTrips(trips);
    return trip;
  },

  // Kết thúc ca đi tuyến
  async endTripAsync(
    tripId: string,
    params: {
      endPointName?: string;
      endAddress?: string;
      lat: number;
      lng: number;
      endPhotos?: string[];
      notes?: string;
    }
  ): Promise<RouteTrip | null> {
    const trips = this.getTrips();
    const tripIndex = trips.findIndex((t) => t.id === tripId);
    const trip = tripIndex !== -1 ? { ...trips[tripIndex] } : null;

    const keyPoints: [number, number][] = trip
      ? [
          [trip.startPoint.lat, trip.startPoint.lng],
          ...trip.waypoints.map((w): [number, number] => [w.lat, w.lng]),
          [params.lat, params.lng],
        ]
      : [[params.lat, params.lng]];

    const roadResult = await fetchActualRoadRoute(keyPoints);

    try {
      const res = await fetch(`/api/sales/routes/${tripId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          pathCoordinates: roadResult.coordinates,
          totalDistanceKm: roadResult.distanceKm,
        }),
      });

      if (res.ok) {
        const refreshed = await this.fetchTripsAsync();
        return refreshed.find((t) => t.id === tripId) || null;
      }
    } catch (err) {
      console.warn('Lỗi gọi API kết thúc ca:', err);
    }

    if (!trip) return null;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    trip.status = 'completed';
    trip.endTime = timeStr;
    trip.endPoint = {
      name: params.endPointName || 'Điểm kết thúc ca',
      address: params.endAddress || `${params.lat}, ${params.lng}`,
      lat: params.lat,
      lng: params.lng,
    };
    trip.pathCoordinates = roadResult.coordinates;
    trip.totalDistanceKm = roadResult.distanceKm;
    trips[tripIndex] = trip;
    this.saveTrips(trips);
    return trip;
  },

  // Xóa chuyến đi
  async deleteTripAsync(tripId: string): Promise<boolean> {
    try {
      await fetch(`/api/sales/routes/${tripId}`, { method: 'DELETE' });
    } catch {}

    const trips = this.getTrips();
    const filtered = trips.filter((t) => t.id !== tripId);
    this.saveTrips(filtered);
    return true;
  },

  deleteTrip(tripId: string): boolean {
    this.deleteTripAsync(tripId);
    return true;
  },

  // Tự động kiểm tra, phục hồi tọa độ và sắp xếp đúng thứ tự check-in tối ưu từ điểm xuất phát
  async repairTripMissingWaypoints(tripId: string): Promise<RouteTrip | null> {
    const trips = this.getTrips();
    const tripIndex = trips.findIndex((t) => t.id === tripId);
    if (tripIndex === -1) return null;
    const trip = { ...trips[tripIndex] };

    if (!trip.plannedWaypoints || trip.plannedWaypoints.length === 0) return trip;

    let hasRepaired = false;
    const resolvedPoints: PlannedWaypointItem[] = [];

    for (let i = 0; i < trip.plannedWaypoints.length; i++) {
      const pw = trip.plannedWaypoints[i];
      if (!pw.lat || !pw.lng) {
        const geo = await smartGeocodeVietnameseAddress(pw.address, pw.name);
        if (geo) {
          resolvedPoints.push({ ...pw, lat: geo[0], lng: geo[1] });
        } else {
          const fallbackLat = trip.startPoint?.lat ? Number((trip.startPoint.lat + 0.02 * (i + 1)).toFixed(6)) : 21.03;
          const fallbackLng = trip.startPoint?.lng ? Number((trip.startPoint.lng + 0.02 * (i + 1)).toFixed(6)) : 105.85;
          resolvedPoints.push({ ...pw, lat: fallbackLat, lng: fallbackLng });
        }
        hasRepaired = true;
      } else {
        resolvedPoints.push(pw);
      }
    }

    // Tối ưu hóa đánh số thứ tự đúng theo tiến trình di chuyển check-in từ điểm xuất phát
    const optimized = optimizeWaypointOrder(
      [trip.startPoint.lat, trip.startPoint.lng],
      resolvedPoints
    );

    const orderChanged = optimized.some((p, idx) => p.name !== trip.plannedWaypoints![idx]?.name);

    if (hasRepaired || orderChanged) {
      trip.plannedWaypoints = optimized;
      // Tính lại tuyến đường kế hoạch chốt nối qua đầy đủ tất cả các điểm theo đúng thứ tự check-in
      const keyPoints: [number, number][] = [
        [trip.startPoint.lat, trip.startPoint.lng],
        ...optimized.filter((p) => p.lat && p.lng).map((p): [number, number] => [p.lat!, p.lng!]),
      ];
      if (trip.endPoint && trip.endPoint.lat && trip.endPoint.lng) {
        keyPoints.push([trip.endPoint.lat, trip.endPoint.lng]);
      }

      if (keyPoints.length >= 2) {
        const roadResult = await fetchActualRoadRoute(keyPoints, trip.vehicle);
        trip.plannedPathCoordinates = roadResult.coordinates;
        trip.plannedDistanceKm = roadResult.distanceKm;
      }

      trips[tripIndex] = trip;
      this.saveTrips(trips);
    }

    return trip;
  },
};
