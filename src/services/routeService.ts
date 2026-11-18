// Service Quản lý đi tuyến thị trường (Sales Route Management Service)

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
  status: 'checked_in' | 'completed';
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
  pathCoordinates: [number, number][]; // [lat, lng][]
  totalDistanceKm: number;
  totalDurationMinutes: number;
  notes?: string;
  createdAt: string;
}

// Hàm tính khoảng cách giữa 2 tọa độ (Haversine formula - đơn vị: km)
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
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

const STORAGE_KEY = 'seajong_sales_route_trips';

// Dữ liệu mẫu chuẩn thực tế cho thị trường Hà Nội
const DEFAULT_TRIPS: RouteTrip[] = [
  {
    id: 'trip-20261118-01',
    code: 'TRIP-20261118-001',
    employeeId: 'EMP-001',
    employeeName: 'Nguyễn Văn Hải',
    employeeAvatar: '',
    date: '2026-11-18',
    status: 'in_progress',
    startTime: '08:15',
    vehicle: 'Xe máy',
    startPoint: {
      name: 'Văn phòng Công ty Seajong',
      address: 'Tòa nhà Seajong, Khu đô thị Mễ Trì Hạ, Nam Từ Liêm, Hà Nội',
      lat: 21.0142,
      lng: 105.7812,
    },
    waypoints: [
      {
        id: 'wp-01',
        orderIndex: 1,
        customerId: 'CUST-001',
        customerName: 'Showroom Thiết bị Vệ sinh Ánh Dương',
        customerPhone: '0988 123 456',
        customerAddress: '18 Tam Trinh, Hoàng Mai, Hà Nội',
        lat: 20.9984,
        lng: 105.8621,
        checkInTime: '08:50',
        checkOutTime: '09:35',
        stayDurationMinutes: 45,
        purpose: 'Chăm sóc đại lý',
        orderAmount: 48500000,
        notes: 'Kiểm tra quầy kệ trưng bày vòi sen sen tắm. Đại lý đặt thêm 10 bộ sen tắm cao cấp.',
        status: 'completed',
      },
      {
        id: 'wp-02',
        orderIndex: 2,
        customerId: 'CUST-002',
        customerName: 'Đại lý VLXD & TBVS Minh Quân',
        customerPhone: '0912 345 678',
        customerAddress: '452 Nguyễn Trãi, Thanh Xuân, Hà Nội',
        lat: 20.9942,
        lng: 105.8115,
        checkInTime: '10:05',
        purpose: 'Khảo sát trưng bày',
        notes: 'Đang tư vấn bảng giá chiết khấu mới tháng 11. Hẹn buổi chiều chốt hợp đồng OEM.',
        status: 'checked_in',
      },
    ],
    pathCoordinates: [
      [21.0142, 105.7812],
      [21.0085, 105.8015],
      [21.0012, 105.8345],
      [20.9984, 105.8621],
      [20.9951, 105.8385],
      [20.9942, 105.8115],
    ],
    totalDistanceKm: 18.6,
    totalDurationMinutes: 140,
    notes: 'Tuyến chăm sóc định kỳ trục phía Nam Hà Nội',
    createdAt: '2026-11-18T08:15:00.000Z',
  },
  {
    id: 'trip-20261117-02',
    code: 'TRIP-20261117-002',
    employeeId: 'EMP-002',
    employeeName: 'Trần Tuấn Anh',
    employeeAvatar: '',
    date: '2026-11-17',
    status: 'completed',
    startTime: '08:30',
    endTime: '16:45',
    vehicle: 'Ô tô cá nhân',
    startPoint: {
      name: 'Văn phòng Seajong',
      address: 'Mễ Trì Hạ, Nam Từ Liêm, Hà Nội',
      lat: 21.0142,
      lng: 105.7812,
    },
    endPoint: {
      name: 'Văn phòng Seajong',
      address: 'Mễ Trì Hạ, Nam Từ Liêm, Hà Nội',
      lat: 21.0142,
      lng: 105.7812,
    },
    waypoints: [
      {
        id: 'wp-03',
        orderIndex: 1,
        customerId: 'CUST-003',
        customerName: 'NPP Thiết bị Phòng tắm Đức Thành',
        customerPhone: '0977 888 999',
        customerAddress: 'Khu đô thị Văn Phú, Hà Đông, Hà Nội',
        lat: 20.9632,
        lng: 105.7654,
        checkInTime: '09:15',
        checkOutTime: '10:45',
        stayDurationMinutes: 90,
        purpose: 'Lấy đơn hàng',
        orderAmount: 125000000,
        notes: 'Chốt đơn hàng tổng kho tháng 11 phục vụ công trình dự án cuối năm.',
        status: 'completed',
      },
      {
        id: 'wp-04',
        orderIndex: 2,
        customerId: 'CUST-004',
        customerName: 'Showroom Nội thất Cao cấp Phúc An',
        customerPhone: '0904 555 666',
        customerAddress: 'Tố Hữu, Vạn Phúc, Hà Đông, Hà Nội',
        lat: 20.9785,
        lng: 105.7725,
        checkInTime: '11:10',
        checkOutTime: '12:00',
        stayDurationMinutes: 50,
        purpose: 'Chăm sóc đại lý',
        orderAmount: 32000000,
        notes: 'Bàn giao mẫu vòi lavabo đen mờ Nano mới.',
        status: 'completed',
      },
      {
        id: 'wp-05',
        orderIndex: 3,
        customerId: 'CUST-005',
        customerName: 'Đại lý TBVS Hải Đăng',
        customerPhone: '0936 112 233',
        customerAddress: 'Đại Mỗ, Nam Từ Liêm, Hà Nội',
        lat: 20.9988,
        lng: 105.7562,
        checkInTime: '14:20',
        checkOutTime: '15:30',
        stayDurationMinutes: 70,
        purpose: 'Phát triển mới',
        orderAmount: 65000000,
        notes: 'Ký kết hợp đồng phân phối sản phẩm chính hãng Seajong.',
        status: 'completed',
      },
    ],
    pathCoordinates: [
      [21.0142, 105.7812],
      [20.9856, 105.7745],
      [20.9632, 105.7654],
      [20.9785, 105.7725],
      [20.9988, 105.7562],
      [21.0142, 105.7812],
    ],
    totalDistanceKm: 34.2,
    totalDurationMinutes: 495,
    notes: 'Tuyến phát triển đại lý khu vực Hà Đông - Nam Từ Liêm',
    createdAt: '2026-11-17T08:30:00.000Z',
  },
  {
    id: 'trip-20261116-03',
    code: 'TRIP-20261116-003',
    employeeId: 'EMP-003',
    employeeName: 'Lê Thị Thu Trang',
    employeeAvatar: '',
    date: '2026-11-16',
    status: 'completed',
    startTime: '08:45',
    endTime: '16:00',
    vehicle: 'Xe máy',
    startPoint: {
      name: 'Văn phòng Seajong',
      address: 'Mễ Trì Hạ, Nam Từ Liêm, Hà Nội',
      lat: 21.0142,
      lng: 105.7812,
    },
    endPoint: {
      name: 'Văn phòng Seajong',
      address: 'Mễ Trì Hạ, Nam Từ Liêm, Hà Nội',
      lat: 21.0142,
      lng: 105.7812,
    },
    waypoints: [
      {
        id: 'wp-06',
        orderIndex: 1,
        customerId: 'CUST-006',
        customerName: 'Showroom TBVS Tân Tiến',
        customerPhone: '0983 222 111',
        customerAddress: 'Hoàng Quốc Việt, Cầu Giấy, Hà Nội',
        lat: 21.0465,
        lng: 105.7942,
        checkInTime: '09:20',
        checkOutTime: '10:30',
        stayDurationMinutes: 70,
        purpose: 'Thu hồi công nợ',
        orderAmount: 18500000,
        notes: 'Thu tiền mặt công nợ đợt 1 và đặt thêm hàng phụ kiện nhà tắm.',
        status: 'completed',
      },
      {
        id: 'wp-07',
        orderIndex: 2,
        customerId: 'CUST-007',
        customerName: 'Tổng kho Điện Nước Việt Long',
        customerPhone: '0915 678 901',
        customerAddress: 'Xuân Đỉnh, Bắc Từ Liêm, Hà Nội',
        lat: 21.0682,
        lng: 105.7885,
        checkInTime: '11:00',
        checkOutTime: '12:15',
        stayDurationMinutes: 75,
        purpose: 'Chăm sóc đại lý',
        orderAmount: 42000000,
        notes: 'Hỗ trợ thay biển bảng nhận diện thương hiệu Seajong mới.',
        status: 'completed',
      },
    ],
    pathCoordinates: [
      [21.0142, 105.7812],
      [21.0321, 105.7885],
      [21.0465, 105.7942],
      [21.0682, 105.7885],
      [21.0142, 105.7812],
    ],
    totalDistanceKm: 26.5,
    totalDurationMinutes: 435,
    notes: 'Tuyến chăm sóc Cầu Giấy - Bắc Từ Liêm',
    createdAt: '2026-11-16T08:45:00.000Z',
  },
];

export const routeService = {
  // Lấy toàn bộ danh sách chuyến đi tuyến
  getTrips(): RouteTrip[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TRIPS));
    return DEFAULT_TRIPS;
  },

  // Lưu danh sách vào Storage
  saveTrips(trips: RouteTrip[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch (e) {
      console.error('Failed to save route trips to localStorage', e);
    }
  },

  // Bắt đầu ca đi tuyến mới
  startTrip(params: {
    employeeId: string | number;
    employeeName: string;
    vehicle: RouteTrip['vehicle'];
    startPointName?: string;
    startAddress?: string;
    lat: number;
    lng: number;
    notes?: string;
  }): RouteTrip {
    const trips = this.getTrips();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().slice(0, 10);
    const code = `TRIP-${dateStr.replace(/-/g, '')}-${String(trips.length + 1).padStart(3, '0')}`;

    const newTrip: RouteTrip = {
      id: `trip-${Date.now()}`,
      code,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      date: dateStr,
      status: 'in_progress',
      startTime: timeStr,
      vehicle: params.vehicle || 'Xe máy',
      startPoint: {
        name: params.startPointName || 'Điểm xuất phát',
        address: params.startAddress || 'Tọa độ GPS thiết bị',
        lat: params.lat,
        lng: params.lng,
      },
      waypoints: [],
      pathCoordinates: [[params.lat, params.lng]],
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      notes: params.notes || '',
      createdAt: now.toISOString(),
    };

    const updated = [newTrip, ...trips];
    this.saveTrips(updated);
    return newTrip;
  },

  // Thêm điểm ghé thăm khách hàng / đại lý
  addWaypoint(
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
    }
  ): RouteTrip | null {
    const trips = this.getTrips();
    const tripIndex = trips.findIndex((t) => t.id === tripId);
    if (tripIndex === -1) return null;

    const trip = { ...trips[tripIndex] };
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newWaypoint: RouteWaypoint = {
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
      status: 'checked_in',
    };

    const updatedWaypoints = [...trip.waypoints, newWaypoint];
    const updatedCoordinates: [number, number][] = [...trip.pathCoordinates, [params.lat, params.lng]];
    const newDistance = calculateTotalPathKm(updatedCoordinates);

    trip.waypoints = updatedWaypoints;
    trip.pathCoordinates = updatedCoordinates;
    trip.totalDistanceKm = newDistance;

    trips[tripIndex] = trip;
    this.saveTrips(trips);
    return trip;
  },

  // Check-out điểm ghé thăm (kết thúc phiên tại đại lý)
  checkoutWaypoint(
    tripId: string,
    waypointId: string,
    params?: {
      orderAmount?: number;
      notes?: string;
    }
  ): RouteTrip | null {
    const trips = this.getTrips();
    const tripIndex = trips.findIndex((t) => t.id === tripId);
    if (tripIndex === -1) return null;

    const trip = { ...trips[tripIndex] };
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    trip.waypoints = trip.waypoints.map((wp) => {
      if (wp.id === waypointId) {
        let stayDuration = 30; // fallback
        try {
          const [inH, inM] = wp.checkInTime.split(':').map(Number);
          const inTotal = inH * 60 + inM;
          const outTotal = now.getHours() * 60 + now.getMinutes();
          if (outTotal >= inTotal) {
            stayDuration = Math.max(1, outTotal - inTotal);
          }
        } catch {}

        return {
          ...wp,
          checkOutTime: timeStr,
          stayDurationMinutes: stayDuration,
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

  // Kết thúc chuyến đi tuyến
  endTrip(
    tripId: string,
    params: {
      endPointName?: string;
      endAddress?: string;
      lat: number;
      lng: number;
      notes?: string;
    }
  ): RouteTrip | null {
    const trips = this.getTrips();
    const tripIndex = trips.findIndex((t) => t.id === tripId);
    if (tripIndex === -1) return null;

    const trip = { ...trips[tripIndex] };
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updatedCoordinates: [number, number][] = [...trip.pathCoordinates, [params.lat, params.lng]];
    const newDistance = calculateTotalPathKm(updatedCoordinates);

    // Tính tổng thời lượng phút
    let totalMinutes = 0;
    try {
      const [startH, startM] = trip.startTime.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = now.getHours() * 60 + now.getMinutes();
      if (endTotal >= startTotal) {
        totalMinutes = endTotal - startTotal;
      }
    } catch {}

    trip.status = 'completed';
    trip.endTime = timeStr;
    trip.endPoint = {
      name: params.endPointName || 'Điểm kết thúc ca',
      address: params.endAddress || 'Tọa độ GPS thiết bị',
      lat: params.lat,
      lng: params.lng,
    };
    trip.pathCoordinates = updatedCoordinates;
    trip.totalDistanceKm = newDistance;
    trip.totalDurationMinutes = totalMinutes || trip.totalDurationMinutes;
    if (params.notes) {
      trip.notes = trip.notes ? `${trip.notes} • ${params.notes}` : params.notes;
    }

    trips[tripIndex] = trip;
    this.saveTrips(trips);
    return trip;
  },

  // Xóa chuyến đi
  deleteTrip(tripId: string): boolean {
    const trips = this.getTrips();
    const filtered = trips.filter((t) => t.id !== tripId);
    if (filtered.length !== trips.length) {
      this.saveTrips(filtered);
      return true;
    }
    return false;
  },
};
