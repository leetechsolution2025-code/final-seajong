import React, { useState, useMemo, useEffect } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { Button } from '../../components/common/Button';
import { Offcanvas } from '../../components/common/Offcanvas';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { EmployeeSelect, type EmployeeItem } from '../../components/common/EmployeeSelect';
import { SalesRouteMap } from '../../components/sales/SalesRouteMap';
import {
  routeService,
  type RouteTrip,
  type RouteWaypoint,
} from '../../services/routeService';
import {
  PlusLg,
  Truck,
  Compass,
  FlagFill,
  PersonFill,
  Trash3,
  Calendar3,
  Clock,
  GeoAlt,
  Shop,
  PlayFill,
} from 'react-bootstrap-icons';

export const SalesRoutesPage: React.FC = () => {
  const [trips, setTrips] = useState<RouteTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [deviceLocation, setDeviceLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    name: string;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('all');

  // Offcanvas States (Tuân thủ kích thước 400px chuẩn)
  const [isStartTripOpen, setIsStartTripOpen] = useState(false);
  const [isAddWaypointOpen, setIsAddWaypointOpen] = useState(false);
  const [isEndTripOpen, setIsEndTripOpen] = useState(false);
  const [isSubmittingRoute, setIsSubmittingRoute] = useState(false);

  // Form States - Bắt đầu ca tuyến
  const [employeeName, setEmployeeName] = useState('Nguyễn Văn Hải');
  const [vehicle, setVehicle] = useState<RouteTrip['vehicle']>('Xe máy');
  const [startPointName, setStartPointName] = useState('Văn phòng Seajong Mễ Trì');
  const [startAddress, setStartAddress] = useState('Mễ Trì Hạ, Nam Từ Liêm, Hà Nội');
  const [currentLat, setCurrentLat] = useState<number>(21.0142);
  const [currentLng, setCurrentLng] = useState<number>(105.7812);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [startNotes, setStartNotes] = useState('');

  // Form States - Check-in điểm ghé
  const [wpCustomerName, setWpCustomerName] = useState('');
  const [wpAddress, setWpAddress] = useState('');
  const [wpPhone, setWpPhone] = useState('');
  const [wpPurpose, setWpPurpose] = useState<RouteWaypoint['purpose']>('Chăm sóc đại lý');
  const [wpOrderAmount, setWpOrderAmount] = useState<number | ''>('');
  const [wpNotes, setWpNotes] = useState('');

  // Form States - Kết thúc ca tuyến
  const [endPointName, setEndPointName] = useState('Văn phòng Seajong');
  const [endAddress, setEndAddress] = useState('Mễ Trì Hạ, Nam Từ Liêm, Hà Nội');
  const [endNotes, setEndNotes] = useState('');

  // Load danh sách chuyến đi
  const loadTrips = () => {
    const list = routeService.getTrips();
    setTrips(list);
    if (list.length > 0 && !selectedTripId) {
      setSelectedTripId(list[0].id);
    }
  };

  // Chuyến đi đang được chọn xem chi tiết & vẽ bản đồ
  const selectedTrip = useMemo(() => {
    return trips.find((t) => t.id === selectedTripId) || trips[0] || null;
  }, [trips, selectedTripId]);

  // Ca đi tuyến đang diễn ra (in_progress) nếu có
  const activeTrip = useMemo(() => {
    return trips.find((t) => t.status === 'in_progress') || null;
  }, [trips]);

  // Tự động định vị GPS thực tế qua Geolocation API của thiết bị
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCurrentLat(lat);
        setCurrentLng(lng);

        let resolvedAddress = `${lat}, ${lng}`;
        let resolvedName = 'Vị trí thiết bị';

        // Gọi Reverse Geocoding lấy tên địa chỉ tiếng Việt qua OpenStreetMap Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'vi' } }
          );
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
                resolvedAddress = parts.join(', ');
                resolvedName = road || parts[0] || 'Vị trí thiết bị';
              }
            }
          }
        } catch {}

        setStartAddress(resolvedAddress);
        setStartPointName(resolvedName);
        setDeviceLocation({
          lat,
          lng,
          address: resolvedAddress,
          name: resolvedName,
        });

        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('Lỗi lấy GPS:', err);
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    loadTrips();
    detectCurrentLocation();
  }, []);

  // Theo dõi GPS thực tế của thiết bị liên tục khi đang có ca đi tuyến (Live GPS tracking)
  useEffect(() => {
    if (!activeTrip || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCurrentLat(lat);
        setCurrentLng(lng);
        setDeviceLocation((prev) => ({
          lat,
          lng,
          address: prev?.address || `${lat}, ${lng}`,
          name: prev?.name || 'Vị trí thiết bị',
        }));

        // Ghi nhận vào lộ trình di chuyển thực tế
        const updated = routeService.recordLiveLocation(activeTrip.id, lat, lng);
        if (updated) {
          setTrips((prevTrips) =>
            prevTrips.map((t) => (t.id === updated.id ? updated : t))
          );
        }
      },
      (err) => console.warn('GPS Watch error:', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [activeTrip?.id]);

  // Danh sách nhân viên đi tuyến làm nguồn gợi ý sẵn có cho component input
  const routeEmployees = useMemo<EmployeeItem[]>(() => {
    const list: EmployeeItem[] = [
      {
        id: 'EMP-01',
        employeeId: 'EMP-01',
        name: 'Nguyễn Văn Hải',
        department: 'Phòng Kinh doanh',
        position: 'Chuyên viên Kinh doanh thị trường',
      },
      {
        id: 'EMP-02',
        employeeId: 'EMP-02',
        name: 'Trần Tuấn Anh',
        department: 'Phòng Kinh doanh',
        position: 'Giám sát bán hàng (Sup)',
      },
      {
        id: 'EMP-03',
        employeeId: 'EMP-03',
        name: 'Lê Thị Thu Trang',
        department: 'Phòng Kinh doanh',
        position: 'Chuyên viên phát triển thị trường',
      },
    ];

    // Bổ sung các nhân viên khác có trong danh sách trips
    trips.forEach((t) => {
      if (!list.some((e) => e.name.toLowerCase() === t.employeeName.toLowerCase())) {
        list.push({
          id: String(t.employeeId || t.employeeName),
          employeeId: String(t.employeeId || t.employeeName),
          name: t.employeeName,
          department: 'Phòng Kinh doanh',
          position: 'Nhân viên kinh doanh thị trường',
        });
      }
    });

    return list;
  }, [trips]);

  // Bộ lọc danh sách chuyến
  const filteredTrips = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return trips.filter((t) => {
      if (selectedEmployeeName && selectedEmployeeName !== 'all') {
        if (!t.employeeName.toLowerCase().includes(selectedEmployeeName.toLowerCase())) {
          return false;
        }
      }
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (dateFilter === 'today' && t.date !== todayStr) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCode = t.code.toLowerCase().includes(q);
        const matchName = t.employeeName.toLowerCase().includes(q);
        const matchWp = t.waypoints.some((w) =>
          w.customerName.toLowerCase().includes(q)
        );
        if (!matchCode && !matchName && !matchWp) return false;
      }
      return true;
    });
  }, [trips, selectedEmployeeName, statusFilter, dateFilter, search]);

  // Tự động chuyển selectedTripId khi lọc nhân viên
  useEffect(() => {
    if (filteredTrips.length > 0) {
      const exists = filteredTrips.some((t) => t.id === selectedTripId);
      if (!exists) {
        setSelectedTripId(filteredTrips[0].id);
      }
    } else {
      setSelectedTripId(null);
    }
  }, [filteredTrips, selectedTripId]);

  // Xử lý Form: Bắt đầu ca tuyến
  const handleStartTripSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrip = routeService.startTrip({
      employeeId: 'EMP-CURRENT',
      employeeName,
      vehicle,
      startPointName,
      startAddress,
      lat: currentLat,
      lng: currentLng,
      notes: startNotes,
    });
    loadTrips();
    setSelectedTripId(newTrip.id);
    setIsStartTripOpen(false);
  };

  // Xử lý Form: Thêm trạm ghé (Định tuyến men theo đường phố thực tế)
  const handleAddWaypointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip && !selectedTrip) return;
    const targetTripId = activeTrip ? activeTrip.id : selectedTrip!.id;

    setIsSubmittingRoute(true);
    try {
      await routeService.addWaypointAsync(targetTripId, {
        customerName: wpCustomerName,
        customerAddress: wpAddress,
        customerPhone: wpPhone,
        lat: currentLat,
        lng: currentLng,
        purpose: wpPurpose,
        orderAmount: Number(wpOrderAmount) || 0,
        notes: wpNotes,
      });

      loadTrips();
      setWpCustomerName('');
      setWpAddress('');
      setWpPhone('');
      setWpOrderAmount('');
      setWpNotes('');
      setIsAddWaypointOpen(false);
    } finally {
      setIsSubmittingRoute(false);
    }
  };

  // Xử lý Form: Kết thúc ca tuyến (Định tuyến men theo đường phố thực tế)
  const handleEndTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip && !selectedTrip) return;
    const targetTripId = activeTrip ? activeTrip.id : selectedTrip!.id;

    setIsSubmittingRoute(true);
    try {
      await routeService.endTripAsync(targetTripId, {
        endPointName,
        endAddress,
        lat: currentLat,
        lng: currentLng,
        notes: endNotes,
      });

      loadTrips();
      setIsEndTripOpen(false);
    } finally {
      setIsSubmittingRoute(false);
    }
  };

  // Xóa chuyến đi
  const handleDeleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa dữ liệu chuyến đi tuyến này?')) {
      routeService.deleteTrip(id);
      loadTrips();
    }
  };

  return (
    <StandardPage
      title="Quản lý đi tuyến"
      description="Giám sát lộ trình di chuyển theo đường giao thông thực tế, check-in điểm đến đại lý trên bản đồ"
      icon="bi-geo-alt-fill"
      badge="Phòng Kinh doanh"
      color="cyan"
      hideTicker={true}
    >
      {/* ── CARD CHÍNH TOÀN DIỆN: ƯU TIÊN KHÔNG GIAN TỐI ĐA CHO BẢN ĐỒ VÀ TUYẾN ĐƯỜNG ── */}
      <div className="flex flex-col h-full min-h-0 p-2 bg-transparent">
        <div className="flex-1 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          {/* ── THANH CHỌN NHÂN VIÊN ĐI TUYẾN & CHỌN CA (ĐẶT TRÊN THANH CÔNG CỤ / PHÍA TRÊN HỘP TÌM KIẾM) ── */}
          <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Bộ chọn nhân viên đi tuyến bằng Input có danh sách gợi ý sẵn có */}
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px] max-w-md">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5 shrink-0">
                <PersonFill className="text-cyan-600" size={14} />
                Nhân viên đi tuyến:
              </span>
              <div className="flex-1 min-w-[200px]">
                <EmployeeSelect
                  multiple={false}
                  value={selectedEmployeeName}
                  employees={routeEmployees}
                  departmentFilter="sales"
                  onChange={(val) => {
                    const empName = val ? String(val).trim() : '';
                    setSelectedEmployeeName(empName);
                    if (empName) {
                      const matchedTrip = trips.find((t) =>
                        t.employeeName.toLowerCase().includes(empName.toLowerCase())
                      );
                      if (matchedTrip) {
                        setSelectedTripId(matchedTrip.id);
                      }
                    }
                  }}
                  placeholder="Chọn nhân viên đi tuyến..."
                  searchPlaceholder="Tìm kiếm nhân viên đi tuyến..."
                  showAllOption={true}
                  allOptionLabel="Tất cả nhân viên đi tuyến"
                  hidePositionBadge={false}
                  clearable={true}
                />
              </div>
            </div>

            {/* Danh sách các ca tuyến của nhân viên để chuyển đổi nhanh */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-500 font-medium shrink-0">Ca tuyến:</span>
              {filteredTrips.length === 0 ? (
                <span className="text-slate-400 italic">Không có ca tuyến nào</span>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {filteredTrips.map((t) => {
                    const isSelected = t.id === selectedTrip?.id;
                    const isRunning = t.status === 'in_progress';
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTripId(t.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-mono">{t.code}</span>
                        {isRunning && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white' : 'bg-emerald-500'
                            } animate-pulse`}
                          />
                        )}
                        <span className={isSelected ? 'text-cyan-100' : 'text-slate-500'}>
                          ({t.totalDistanceKm} km)
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── THANH CÔNG CỤ TABLE TOOLBAR (BỘ LỌC + HỘP TÌM KIẾM + HÀNH ĐỘNG - BỎ NÚT LÀM MỚI) ── */}
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm mã chuyến, tên nhân viên, đại lý ghé thăm..."
            filters={[
              {
                id: 'status-filter',
                value: statusFilter,
                onChange: (v) => setStatusFilter(v as any),
                minWidth: '150px',
                options: [
                  { label: 'Tất cả trạng thái', value: 'all' },
                  { label: 'Đang đi tuyến', value: 'in_progress' },
                  { label: 'Đã hoàn thành', value: 'completed' },
                ],
              },
              {
                id: 'date-filter',
                value: dateFilter,
                onChange: (v) => setDateFilter(v as any),
                minWidth: '140px',
                options: [
                  { label: 'Tất cả các ngày', value: 'all' },
                  { label: 'Hôm nay', value: 'today' },
                ],
              },
            ]}
            actions={
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Nút Bắt đầu ca tuyến luôn hiển thị để xác nhận vị trí xuất phát thiết bị */}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    detectCurrentLocation();
                    setIsStartTripOpen(true);
                  }}
                  leftIcon={<PlayFill size={15} />}
                  style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
                  title="Xác nhận vị trí GPS thiết bị và bắt đầu ca đi tuyến"
                >
                  <span>{activeTrip ? 'Bắt đầu ca mới' : 'Bắt đầu ca tuyến'}</span>
                </Button>

                {activeTrip && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        detectCurrentLocation();
                        setIsAddWaypointOpen(true);
                      }}
                      leftIcon={<PlusLg size={13} />}
                      className="text-cyan-700 border-cyan-300 hover:bg-cyan-50"
                    >
                      <span>Ghé đại lý</span>
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        detectCurrentLocation();
                        setIsEndTripOpen(true);
                      }}
                      leftIcon={<FlagFill size={13} />}
                    >
                      <span>Kết thúc ca</span>
                    </Button>
                  </>
                )}
              </div>
            }
          />

          {/* ── BẢN ĐỒ CHIẾM TRỌN 100% TOÀN BỘ KHÔNG GIAN KHẢ DỤNG (ĐÃ BỎ CỘT BÊN TRÁI) ── */}
          <div className="flex-1 w-full h-full min-h-[550px] flex flex-col min-h-0 bg-white p-2">
            {/* Header thông tin thanh thoát của ca được chọn */}
            {selectedTrip && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 mb-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-xs text-slate-900">
                    {selectedTrip.code}
                  </span>
                  {selectedTrip.status === 'in_progress' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Đang đi
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                      Hoàn thành
                    </span>
                  )}
                  <span className="text-slate-300">·</span>
                  <span className="font-bold text-xs text-slate-700 truncate">
                    {selectedTrip.employeeName} ({selectedTrip.vehicle})
                  </span>
                  <span className="text-slate-300 hidden sm:inline">·</span>
                  <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                    Xuất phát: {selectedTrip.startPoint.name}
                  </span>
                  {selectedTrip.endPoint && (
                    <>
                      <span className="text-slate-300 hidden md:inline">→</span>
                      <span className="text-[11px] text-slate-500 truncate hidden md:inline">
                        Đích: {selectedTrip.endPoint.name}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-black text-cyan-700">
                      {selectedTrip.totalDistanceKm} km
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1.5">
                      ({selectedTrip.waypoints?.length || 0} điểm dừng)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteTrip(selectedTrip.id, e)}
                    title="Xóa chuyến đi này"
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash3 size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* KHUNG BẢN ĐỒ TOÀN MÀN HÌNH MỞ RỘNG TỐI ĐA */}
            <div className="flex-1 w-full h-full min-h-[500px] overflow-hidden rounded-xl border border-slate-200/60 shadow-2xs">
              <SalesRouteMap
                trip={selectedTrip}
                allTrips={filteredTrips}
                deviceLocation={deviceLocation}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── OFFCANVAS: BẮT ĐẦU CA ĐI TUYẾN (CHUẨN WIDTH=400PX) ── */}
      <Offcanvas
        isOpen={isStartTripOpen}
        onClose={() => setIsStartTripOpen(false)}
        title="Xác nhận vị trí bắt đầu ca tuyến"
        width="400px"
      >
        <form onSubmit={handleStartTripSubmit} className="flex flex-col gap-3 p-1">
          {/* Card định vị GPS thiết bị mặc định */}
          <div className="p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-ping" />
                Vị trí xuất phát theo thiết bị
              </span>
              <button
                type="button"
                onClick={detectCurrentLocation}
                disabled={isDetectingGps}
                className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-cyan-300"
              >
                <Compass size={12} className={isDetectingGps ? 'animate-spin' : ''} />
                <span>{isDetectingGps ? 'Đang dò GPS...' : 'Lấy lại GPS'}</span>
              </button>
            </div>
            <div className="text-xs text-slate-800 font-bold">
              {startPointName || 'Đang lấy vị trí thiết bị...'}
            </div>
            <div className="text-[11.5px] text-slate-600">
              {startAddress || 'Đang xác định địa chỉ GPS...'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-cyan-200/60 flex items-center justify-between">
              <span>Tọa độ: {currentLat.toFixed(6)}, {currentLng.toFixed(6)}</span>
              <span className="text-emerald-700 font-bold">● Sẵn sàng</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nhân viên phụ trách
            </label>
            <EmployeeSelect
              multiple={false}
              value={employeeName}
              employees={routeEmployees}
              departmentFilter="sales"
              onChange={(val) => setEmployeeName(val || '')}
              placeholder="Chọn nhân viên phụ trách..."
              searchPlaceholder="Tìm kiếm nhân viên..."
              clearable={false}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phương tiện di chuyển
            </label>
            <Select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value as any)}
              options={[
                { label: 'Xe máy', value: 'Xe máy' },
                { label: 'Ô tô cá nhân', value: 'Ô tô cá nhân' },
                { label: 'Xe công ty', value: 'Xe công ty' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên mốc xuất phát
            </label>
            <Input
              value={startPointName}
              onChange={(e) => setStartPointName(e.target.value)}
              placeholder="VD: Văn phòng Seajong / Vị trí hiện tại"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Địa chỉ xuất phát
            </label>
            <Input
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              placeholder="Địa chỉ xuất phát..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú lộ trình (nếu có)
            </label>
            <textarea
              value={startNotes}
              onChange={(e) => setStartNotes(e.target.value)}
              placeholder="VD: Ca đi tuyến chăm sóc khách hàng ngày..."
              className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-cyan-500"
              rows={2}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full font-bold flex items-center justify-center gap-2 py-2"
              style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
            >
              <PlayFill size={16} />
              <span>Xác nhận vị trí bắt đầu</span>
            </Button>
          </div>
        </form>
      </Offcanvas>

      {/* ── OFFCANVAS: CHECK-IN ĐIỂM GHÉ ĐẠI LÝ (CHUẨN WIDTH=400PX) ── */}
      <Offcanvas
        isOpen={isAddWaypointOpen}
        onClose={() => setIsAddWaypointOpen(false)}
        title="Check-in điểm ghé đại lý"
        width="400px"
      >
        <form onSubmit={handleAddWaypointSubmit} className="flex flex-col gap-3 p-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên đại lý / Khách hàng ghé thăm
            </label>
            <Input
              value={wpCustomerName}
              onChange={(e) => setWpCustomerName(e.target.value)}
              placeholder="VD: Showroom TBVS Ánh Dương"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Địa chỉ đại lý
            </label>
            <Input
              value={wpAddress}
              onChange={(e) => setWpAddress(e.target.value)}
              placeholder="VD: 18 Tam Trinh, Hoàng Mai, Hà Nội"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Số điện thoại liên hệ
            </label>
            <Input
              value={wpPhone}
              onChange={(e) => setWpPhone(e.target.value)}
              placeholder="Số điện thoại chủ đại lý"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mục đích làm việc
            </label>
            <Select
              value={wpPurpose}
              onChange={(e) => setWpPurpose(e.target.value as any)}
              options={[
                { label: 'Chăm sóc đại lý', value: 'Chăm sóc đại lý' },
                { label: 'Lấy đơn hàng', value: 'Lấy đơn hàng' },
                { label: 'Khảo sát trưng bày mẫu', value: 'Khảo sát trưng bày' },
                { label: 'Phát triển mới', value: 'Phát triển mới' },
                { label: 'Thu hồi công nợ', value: 'Thu hồi công nợ' },
                { label: 'Khác', value: 'Khác' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Doanh số đơn hàng chốt (VNĐ)
            </label>
            <Input
              type="number"
              value={wpOrderAmount}
              onChange={(e) => setWpOrderAmount(e.target.value ? Number(e.target.value) : '')}
              placeholder="Nhập 0 nếu không phát sinh đơn"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú nội dung làm việc
            </label>
            <textarea
              value={wpNotes}
              onChange={(e) => setWpNotes(e.target.value)}
              placeholder="Kết quả làm việc, nhu cầu mẫu mã, phản hồi của đại lý..."
              className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-cyan-500"
              rows={3}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddWaypointOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingRoute}
              style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
            >
              {isSubmittingRoute ? 'Đang định tuyến đường...' : 'Xác nhận check-in'}
            </Button>
          </div>
        </form>
      </Offcanvas>

      {/* ── OFFCANVAS: KẾT THÚC CA TUYẾN (CHUẨN WIDTH=400PX) ── */}
      <Offcanvas
        isOpen={isEndTripOpen}
        onClose={() => setIsEndTripOpen(false)}
        title="Kết thúc ca đi tuyến"
        width="400px"
      >
        <form onSubmit={handleEndTripSubmit} className="flex flex-col gap-3 p-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Điểm kết thúc ca
            </label>
            <Input
              value={endPointName}
              onChange={(e) => setEndPointName(e.target.value)}
              placeholder="VD: Văn phòng Seajong hoặc Nhà riêng"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Địa chỉ kết thúc
            </label>
            <Input
              value={endAddress}
              onChange={(e) => setEndAddress(e.target.value)}
              placeholder="Địa chỉ cụ thể"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú tổng kết ca
            </label>
            <textarea
              value={endNotes}
              onChange={(e) => setEndNotes(e.target.value)}
              placeholder="Tổng kết ca đi tuyến hôm nay..."
              className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-cyan-500"
              rows={3}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEndTripOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={isSubmittingRoute}
            >
              {isSubmittingRoute ? 'Đang chốt tuyến...' : 'Chốt kết thúc ca'}
            </Button>
          </div>
        </form>
      </Offcanvas>
    </StandardPage>
  );
};
