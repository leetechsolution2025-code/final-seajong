import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { Button } from '../../components/common/Button';
import { Offcanvas } from '../../components/common/Offcanvas';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmployeeSelect, fetchEmployeesFromDb, type EmployeeItem } from '../../components/common/EmployeeSelect';
import { SalesRouteMap } from '../../components/sales/SalesRouteMap';
import { TripSuggestionSelect } from '../../components/sales/TripSuggestionSelect';
import { useAuth } from '../../context/AuthContext';
import {
  routeService,
  fetchDealersAsync,
  geocodeAddress,
  smartGeocodeVietnameseAddress,
  optimizeWaypointOrder,
  fetchActualRoadRoute,
  type RouteTrip,
  type RouteWaypoint,
  type DealerItem,
  type PlannedWaypointItem,
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
  GeoAltFill,
  LockFill,
  Shop,
  PlayFill,
  Search,
  CameraFill,
  X,
} from 'react-bootstrap-icons';

export const SalesRoutesPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const currentUserName = useMemo(() => {
    return authUser?.employee?.fullName || authUser?.name || '';
  }, [authUser]);

  const [trips, setTrips] = useState<RouteTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [dbEmployees, setDbEmployees] = useState<EmployeeItem[]>([]);
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
  const [isRouteDetailOpen, setIsRouteDetailOpen] = useState(false);
  const [selectedRouteDetailTrip, setSelectedRouteDetailTrip] = useState<RouteTrip | null>(null);
  const [isSubmittingRoute, setIsSubmittingRoute] = useState(false);

  // Ảnh chụp đính kèm khi check-in đại lý
  const [wpPhotos, setWpPhotos] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form States - Bắt đầu ca tuyến (Không dùng bất kỳ dữ liệu mô phỏng Mễ Trì nào)
  const [employeeName, setEmployeeName] = useState('');
  const [vehicle, setVehicle] = useState<RouteTrip['vehicle']>('Xe máy');
  const [startPointName, setStartPointName] = useState('');
  const [startAddress, setStartAddress] = useState('');
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [gpsErrorMessage, setGpsErrorMessage] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [startNotes, setStartNotes] = useState('');

  // Form States - Danh mục đại lý và Lập tuyến đường chốt kế hoạch
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [dealerSearchQuery, setDealerSearchQuery] = useState('');
  const [isDealerDropdownOpen, setIsDealerDropdownOpen] = useState(false);
  const [plannedWaypoints, setPlannedWaypoints] = useState<PlannedWaypointItem[]>([]);

  // Điểm check-in ngoài danh mục đại lý
  const [showCustomWaypointInput, setShowCustomWaypointInput] = useState(false);
  const [customWpName, setCustomWpName] = useState('');
  const [customWpAddress, setCustomWpAddress] = useState('');

  // Điểm đến dự kiến của ca tuyến
  const [hasDestination, setHasDestination] = useState(false);
  const [destinationPointName, setDestinationPointName] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');

  // Form States - Check-in điểm ghé
  const [wpCustomerName, setWpCustomerName] = useState('');
  const [wpAddress, setWpAddress] = useState('');
  const [wpPhone, setWpPhone] = useState('');
  const [wpPurpose, setWpPurpose] = useState<RouteWaypoint['purpose']>('Chăm sóc đại lý');
  const [wpOrderAmount, setWpOrderAmount] = useState<number | ''>('');
  const [wpNotes, setWpNotes] = useState('');

  // Form States - Kết thúc ca tuyến
  const [endPointName, setEndPointName] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [endNotes, setEndNotes] = useState('');
  const [endPhotos, setEndPhotos] = useState<string[]>([]);
  const endCameraInputRef = useRef<HTMLInputElement>(null);

  // Load danh sách chuyến đi từ Database
  const loadTrips = async () => {
    const list = await routeService.fetchTripsAsync();
    setTrips(list);
    if (list.length > 0) {
      setSelectedTripId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0].id;
      });
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

  // Dịch tọa độ sang tên địa chỉ thực tế (Reverse Geocoding)
  const resolveCoordinatesToAddress = async (lat: number, lng: number) => {
    let resolvedAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    let resolvedName = 'Vị trí thiết bị';

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'vi' }, signal: AbortSignal.timeout(5000) }
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
    } catch { }

    setStartAddress(resolvedAddress);
    setStartPointName(resolvedName);
    setWpAddress(resolvedAddress);
    setDeviceLocation({
      lat,
      lng,
      address: resolvedAddress,
      name: resolvedName,
    });
  };

  // Định vị qua IP thiết bị (Fallback tin cậy khi Geolocation vệ tinh bị timeout hoặc cần trợ giúp)
  const fetchLocationByIp = async (fallbackMsg?: string) => {
    try {
      const res = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const lat = Number(Number(data.latitude).toFixed(6));
          const lng = Number(Number(data.longitude).toFixed(6));
          setCurrentLat(lat);
          setCurrentLng(lng);
          const addr = [data.city, data.region, data.country_name].filter(Boolean).join(', ');
          const name = data.city ? `Vị trí thiết bị (${data.city})` : 'Vị trí thiết bị';
          setStartAddress(addr || `${lat}, ${lng}`);
          setStartPointName(name);
          setWpAddress(addr || `${lat}, ${lng}`);
          setDeviceLocation({
            lat,
            lng,
            address: addr,
            name,
          });
          setGpsStatus('success');
          setIsDetectingGps(false);
          return;
        }
      }
    } catch { }

    setIsDetectingGps(false);
    setGpsStatus('error');
    setGpsErrorMessage(
      fallbackMsg || 'Trình duyệt chưa cho phép truy cập vị trí. Vui lòng cho phép quyền vị trí.'
    );
  };

  // Tự động định vị GPS thực tế qua Geolocation API của thiết bị
  const detectCurrentLocation = () => {
    setIsDetectingGps(true);
    setGpsStatus('locating');
    setGpsErrorMessage('');

    if (!navigator.geolocation) {
      fetchLocationByIp('Trình duyệt không hỗ trợ Geolocation trực tiếp');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCurrentLat(lat);
        setCurrentLng(lng);
        setGpsStatus('success');
        setIsDetectingGps(false);
        resolveCoordinatesToAddress(lat, lng);
      },
      (err) => {
        console.warn('Geolocation directly returned error, trying IP location fallback:', err);
        fetchLocationByIp(
          err.code === 1
            ? 'Quyền truy cập vị trí bị chặn. Vui lòng nhấn vào biểu tượng ổ khóa/vị trí trên thanh địa chỉ để bật "Cho phép".'
            : 'Định vị GPS qua thiết bị đang quá thời gian chờ, đã chuyển sang định vị mạng thiết bị.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  };

  // Tải danh sách nhân sự từ DB, chuyến đi và danh mục đại lý khi mount
  useEffect(() => {
    loadTrips();
    detectCurrentLocation();
    fetchEmployeesFromDb().then((emps) => {
      if (emps && emps.length > 0) {
        setDbEmployees(emps);
      }
    });
    fetchDealersAsync().then((dlrs) => {
      if (dlrs && dlrs.length > 0) {
        setDealers(dlrs);
      }
    });
  }, []);

  // Mặc định chọn tên nhân viên đang đăng nhập trên thiết bị
  useEffect(() => {
    if (currentUserName) {
      setEmployeeName((prev) => prev || currentUserName);
      setSelectedEmployeeName((prev) => prev || currentUserName);
    }
  }, [currentUserName]);

  // Tự động tải lại danh sách đại lý khi mở offcanvas nếu danh sách đang rỗng
  useEffect(() => {
    if (isStartTripOpen && dealers.length === 0) {
      fetchDealersAsync().then((dlrs) => {
        if (dlrs && dlrs.length > 0) setDealers(dlrs);
      });
    }
  }, [isStartTripOpen, dealers.length]);

  // Bộ lọc danh mục đại lý khi tìm kiếm trong offcanvas bắt đầu
  const filteredDealers = useMemo(() => {
    if (!dealerSearchQuery.trim()) return dealers;
    const q = dealerSearchQuery.toLowerCase();
    return dealers.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.address && d.address.toLowerCase().includes(q)) ||
        (d.phone && d.phone.includes(q))
    );
  }, [dealers, dealerSearchQuery]);

  // Toggle chọn hoặc bỏ chọn đại lý vào danh sách điểm check-in dự kiến
  const handleToggleDealer = (d: DealerItem) => {
    setPlannedWaypoints((prev) => {
      const exists = prev.some(
        (pw) => pw.name === d.name && pw.address === (d.address || 'Đại lý Seajong')
      );
      if (exists) {
        return prev.filter(
          (pw) => !(pw.name === d.name && pw.address === (d.address || 'Đại lý Seajong'))
        );
      } else {
        return [
          ...prev,
          {
            name: d.name,
            address: d.address || 'Đại lý Seajong',
            phone: d.phone || undefined,
            lat: d.lat || undefined,
            lng: d.lng || undefined,
            isCustom: false,
          },
        ];
      }
    });
  };

  // Thêm trực tiếp điểm đến / điểm ghé từ ô tìm kiếm (dù có hay không có trong danh mục đại lý)
  const handleAddDirectSearchQuery = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) return;

    // Kiểm tra xem có trùng với đại lý nào trong danh mục không
    const matchedDealer = dealers.find(
      (d) => d.name.toLowerCase() === clean.toLowerCase()
    );

    if (matchedDealer) {
      handleToggleDealer(matchedDealer);
      setDealerSearchQuery('');
      setIsDealerDropdownOpen(false);
      return;
    }

    // Nếu là địa điểm tự do: geocoding tức thì để có tọa độ ngay
    const geo = await smartGeocodeVietnameseAddress(clean, clean);
    const newWp: PlannedWaypointItem = {
      name: clean,
      address: clean,
      lat: geo ? geo[0] : undefined,
      lng: geo ? geo[1] : undefined,
      isCustom: true,
    };

    setPlannedWaypoints((prev) => [...prev, newWp]);
    setDealerSearchQuery('');
    setIsDealerDropdownOpen(false);
  };

  // Đặt một điểm trong danh sách làm Điểm đến kết thúc tuyến
  const handleSetAsDestination = (index: number) => {
    const targetWp = plannedWaypoints[index];
    if (!targetWp) return;
    setHasDestination(true);
    setDestinationPointName(targetWp.name);
    setDestinationAddress(targetWp.address);
    handleRemovePlannedWaypoint(index);
  };

  // Thêm điểm check-in tự do ngoài danh mục đại lý
  const handleAddCustomWaypoint = async () => {
    if (!customWpName.trim()) return;
    const name = customWpName.trim();
    const address = customWpAddress.trim() || name;
    const geo = await smartGeocodeVietnameseAddress(address, name);

    setPlannedWaypoints((prev) => [
      ...prev,
      {
        name,
        address,
        lat: geo ? geo[0] : undefined,
        lng: geo ? geo[1] : undefined,
        isCustom: true,
      },
    ]);
    setCustomWpName('');
    setCustomWpAddress('');
    setShowCustomWaypointInput(false);
  };

  // Xóa một điểm check-in dự kiến khỏi danh sách
  const handleRemovePlannedWaypoint = (index: number) => {
    setPlannedWaypoints((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Đồng bộ địa chỉ đại lý khi mở offcanvas ghé đại lý
  useEffect(() => {
    if (isAddWaypointOpen) {
      const addr = deviceLocation?.address || startAddress || (currentLat && currentLng ? `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}` : '');
      if (addr) setWpAddress(addr);
    }
  }, [isAddWaypointOpen, deviceLocation, startAddress, currentLat, currentLng]);

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

  // Danh sách nhân viên lấy theo dữ liệu thực tế trong DB, loại bỏ hoàn toàn mock data
  const routeEmployees = useMemo<EmployeeItem[]>(() => {
    const salesOnly = dbEmployees.filter((e) => {
      const dept = (e.department || '').toLowerCase();
      const code = (e.departmentCode || '').toLowerCase();
      return (
        dept.includes('kinh doanh') ||
        dept.includes('ban hang') ||
        code === 'sales' ||
        code === 'kd'
      );
    });
    const baseList = salesOnly.length > 0 ? salesOnly : dbEmployees;

    // Đảm bảo nhân viên đang đăng nhập luôn có trong danh sách
    if (
      authUser &&
      currentUserName &&
      !baseList.some((e) => e.name.toLowerCase() === currentUserName.toLowerCase())
    ) {
      return [
        {
          id: authUser.employee?.id || authUser.id,
          employeeId: authUser.employee?.id || authUser.id,
          name: currentUserName,
          department: authUser.employee?.departmentName || 'Phòng Kinh doanh',
          position: authUser.employee?.position || 'Nhân viên kinh doanh',
        },
        ...baseList,
      ];
    }
    return baseList;
  }, [dbEmployees, authUser, currentUserName]);

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

  // Tự động kiểm tra, phục hồi tọa độ và sắp xếp chuẩn số thứ tự check-in cho ca hiện tại
  useEffect(() => {
    if (!selectedTrip || !selectedTrip.plannedWaypoints || selectedTrip.plannedWaypoints.length === 0) return;
    routeService.repairTripMissingWaypoints(selectedTrip.id).then((repaired) => {
      if (repaired) {
        setTrips((prevTrips) =>
          prevTrips.map((t) => (t.id === repaired.id ? repaired : t))
        );
      }
    });
  }, [selectedTrip?.id]);

  // Xử lý Form: Bắt đầu ca tuyến (Tính toán chốt tuyến đường & lưu trực tiếp vào Database)
  const handleStartTripSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const finalLat = currentLat ?? deviceLocation?.lat ?? 21.0285;
    const finalLng = currentLng ?? deviceLocation?.lng ?? 105.8542;
    const finalPointName = startPointName.trim() || deviceLocation?.name || 'Vị trí thiết bị';
    const finalAddress = startAddress.trim() || deviceLocation?.address || `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`;
    const empName = employeeName.trim() || currentUserName || 'Nhân viên';
    const matchedEmp = routeEmployees.find((e) => e.name.toLowerCase() === empName.toLowerCase());

    setIsSubmittingRoute(true);
    try {
      // 1. Thu thập tọa độ các điểm check-in dự kiến (Geocoding thông minh tiếng Việt + Fallback)
      const resolvedPlannedWaypoints: PlannedWaypointItem[] = [];

      for (let i = 0; i < plannedWaypoints.length; i++) {
        const pw = plannedWaypoints[i];
        let pLat = pw.lat;
        let pLng = pw.lng;
        if (!pLat || !pLng) {
          const geo = await smartGeocodeVietnameseAddress(pw.address, pw.name);
          if (geo) {
            pLat = geo[0];
            pLng = geo[1];
          } else {
            pLat = Number((finalLat + 0.018 * (i + 1)).toFixed(6));
            pLng = Number((finalLng + 0.018 * (i + 1)).toFixed(6));
          }
        }
        resolvedPlannedWaypoints.push({ ...pw, lat: pLat, lng: pLng });
      }

      // 2. Thu thập điểm đến cuối ca nếu có
      let destLat: number | undefined;
      let destLng: number | undefined;
      const cleanDestAddr = destinationAddress.trim();
      const cleanDestName = destinationPointName.trim();
      if (hasDestination && (cleanDestAddr || cleanDestName)) {
        const queryText = cleanDestAddr || cleanDestName;
        const destGeo = await smartGeocodeVietnameseAddress(queryText, cleanDestName);
        if (destGeo) {
          destLat = destGeo[0];
          destLng = destGeo[1];
        } else {
          // Fallback tọa độ hợp lệ
          destLat = Number((finalLat + 0.025).toFixed(6));
          destLng = Number((finalLng + 0.025).toFixed(6));
        }
      }

      // 3. SẮP XẾP SỐ THỨ TỰ THEO ĐÚNG TIẾN TRÌNH CHECK-IN TỐI ƯU TỪ ĐIỂM XUẤT PHÁT
      const orderedPlannedWaypoints = optimizeWaypointOrder(
        [finalLat, finalLng],
        resolvedPlannedWaypoints,
        destLat && destLng ? [destLat, destLng] : undefined
      );

      const keyPoints: [number, number][] = [
        [finalLat, finalLng],
        ...orderedPlannedWaypoints.filter((p) => p.lat && p.lng).map((p): [number, number] => [p.lat!, p.lng!]),
      ];
      if (destLat && destLng) {
        keyPoints.push([destLat, destLng]);
      }

      // 4. Tính toán lộ trình đường giao thông tối ưu theo phương tiện di chuyển (Xe máy vs Ô tô)
      let plannedCoords: [number, number][] = [];
      let plannedDist = 0;
      if (keyPoints.length >= 2) {
        const roadResult = await fetchActualRoadRoute(keyPoints, vehicle);
        plannedCoords = roadResult.coordinates;
        plannedDist = roadResult.distanceKm;
      }

      const newTrip = await routeService.startTripAsync({
        employeeId: matchedEmp?.employeeId || authUser?.id || 'EMP-CURRENT',
        employeeName: empName,
        vehicle,
        startPointName: finalPointName,
        startAddress: finalAddress,
        lat: finalLat,
        lng: finalLng,
        endPointName: hasDestination ? (cleanDestName || cleanDestAddr || 'Điểm đến kết thúc ca') : undefined,
        endAddress: hasDestination ? (cleanDestAddr || cleanDestName || 'Địa chỉ điểm đến') : undefined,
        endLat: destLat,
        endLng: destLng,
        plannedPathCoordinates: plannedCoords,
        plannedWaypoints: orderedPlannedWaypoints,
        plannedDistanceKm: plannedDist,
        notes: startNotes,
      });

      await loadTrips();
      setSelectedTripId(newTrip.id);
      setSelectedEmployeeName(empName);
      setIsStartTripOpen(false);
      setPlannedWaypoints([]);
      setDealerSearchQuery('');
      setHasDestination(false);
      setDestinationPointName('');
      setDestinationAddress('');
      setStartNotes('');
    } finally {
      setIsSubmittingRoute(false);
    }
  };

  // Mở Offcanvas check-in đại lý (Tự động gán tọa độ và địa chỉ GPS thiết bị)
  const handleOpenAddWaypoint = () => {
    detectCurrentLocation();
    const currentAddr =
      deviceLocation?.address ||
      startAddress ||
      (currentLat && currentLng ? `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}` : '');
    if (currentAddr) setWpAddress(currentAddr);
    setWpPhotos([]);
    setIsAddWaypointOpen(true);
  };

  // Chụp ảnh đính kèm vào thông tin vị trí check-in
  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setWpPhotos((prev) => [...prev, result]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Mở Offcanvas kết thúc ca tuyến (Tự động nhận diện GPS và gán vị trí hiện tại)
  const handleOpenEndTrip = () => {
    detectCurrentLocation();
    const currTrip = activeTrip || selectedTrip;
    if (currTrip?.endPoint?.name) {
      setEndPointName(currTrip.endPoint.name);
    } else {
      setEndPointName(deviceLocation?.name || 'Vị trí hiện tại kết thúc ca');
    }
    const currentAddr =
      deviceLocation?.address ||
      currTrip?.endPoint?.address ||
      startAddress ||
      (currentLat && currentLng ? `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}` : '');
    if (currentAddr) setEndAddress(currentAddr);
    setEndPhotos([]);
    setIsEndTripOpen(true);
  };

  // Chụp ảnh đính kèm khi kết thúc ca tuyến
  const handleCaptureEndPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setEndPhotos((prev) => [...prev, result]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Xử lý Form: Thêm trạm ghé (Lưu trực tiếp vào Database & định tuyến men theo đường phố thực tế)
  const handleAddWaypointSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTrip && !selectedTrip) return;
    const targetTripId = activeTrip ? activeTrip.id : selectedTrip!.id;

    const finalLat = currentLat ?? deviceLocation?.lat ?? 21.0285;
    const finalLng = currentLng ?? deviceLocation?.lng ?? 105.8542;
    const finalAddr =
      wpAddress.trim() ||
      deviceLocation?.address ||
      startAddress ||
      `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`;

    setIsSubmittingRoute(true);
    try {
      await routeService.addWaypointAsync(targetTripId, {
        customerName: wpCustomerName.trim() || 'Đại lý ghé thăm',
        customerAddress: finalAddr,
        customerPhone: wpPhone,
        lat: finalLat,
        lng: finalLng,
        purpose: wpPurpose,
        orderAmount: Number(wpOrderAmount) || 0,
        notes: wpNotes,
        photos: wpPhotos,
      });

      await loadTrips();
      setWpCustomerName('');
      setWpAddress('');
      setWpPhone('');
      setWpOrderAmount('');
      setWpNotes('');
      setWpPhotos([]);
      setIsAddWaypointOpen(false);
    } finally {
      setIsSubmittingRoute(false);
    }
  };

  // Xử lý Form: Kết thúc ca tuyến (Lưu trực tiếp vào Database & định tuyến men theo đường phố thực tế)
  const handleEndTripSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTrip && !selectedTrip) return;
    const targetTripId = activeTrip ? activeTrip.id : selectedTrip!.id;

    const finalLat = currentLat ?? deviceLocation?.lat ?? 21.0285;
    const finalLng = currentLng ?? deviceLocation?.lng ?? 105.8542;
    const finalPoint = endPointName.trim() || 'Điểm kết thúc ca';
    const finalAddr =
      endAddress.trim() ||
      deviceLocation?.address ||
      startAddress ||
      `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`;

    setIsSubmittingRoute(true);
    try {
      await routeService.endTripAsync(targetTripId, {
        endPointName: finalPoint,
        endAddress: finalAddr,
        lat: finalLat,
        lng: finalLng,
        endPhotos,
        notes: endNotes,
      });

      await loadTrips();
      setIsEndTripOpen(false);
      setEndPointName('');
      setEndAddress('');
      setEndNotes('');
      setEndPhotos([]);
    } finally {
      setIsSubmittingRoute(false);
    }
  };

  // Xóa chuyến đi khỏi Database qua ConfirmDialog
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);

  const handleOpenDeleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTripId(id);
  };

  const handleConfirmDeleteTrip = async () => {
    if (!deleteTripId) return;
    setIsDeletingTrip(true);
    try {
      await routeService.deleteTripAsync(deleteTripId);
      await loadTrips();
      setDeleteTripId(null);
    } finally {
      setIsDeletingTrip(false);
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

            {/* Danh sách các ca tuyến hiển thị bằng Component Input có gợi ý tìm kiếm theo thời gian, tên điểm check-in */}
            <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-lg">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5 shrink-0">
                <Compass className="text-cyan-600" size={14} />
                Ca tuyến:
              </span>
              <div className="flex-1">
                <TripSuggestionSelect
                  trips={filteredTrips}
                  selectedTripId={selectedTripId}
                  onSelectTrip={(t) => setSelectedTripId(t ? t.id : null)}
                  placeholder="Tìm ca theo giờ, ngày, tên đại lý check-in..."
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* ── THANH CÔNG CỤ TABLE TOOLBAR (BỘ LỌC + HỘP TÌM KIẾM + HÀNH ĐỘNG - ẨN NÚT GEAR) ── */}
          <TableToolbar
            showMenu={false}
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
                {/* Nút Khởi hành ca tuyến */}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={Boolean(selectedTrip)}
                  onClick={() => {
                    detectCurrentLocation();
                    if (!startPointName) setStartPointName(deviceLocation?.name || 'Phường Phú Diễn');
                    setIsStartTripOpen(true);
                  }}
                  leftIcon={<PlayFill size={15} />}
                  style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
                  title={
                    selectedTrip
                      ? 'Đang có ca tuyến được chọn. Vui lòng hoàn thành hoặc bỏ chọn tuyến để khởi hành ca mới.'
                      : 'Xác nhận vị trí GPS thiết bị và khởi hành ca đi tuyến'
                  }
                >
                  <span>Khởi hành</span>
                </Button>

                {activeTrip && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenAddWaypoint}
                      leftIcon={<PlusLg size={13} />}
                      className="text-cyan-700 border-cyan-300 hover:bg-cyan-50"
                    >
                      <span>Ghé đại lý</span>
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleOpenEndTrip}
                      leftIcon={<FlagFill size={13} />}
                    >
                      <span>Kết thúc</span>
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
                    <span className="text-[11px] text-slate-500 ml-1.5 font-medium">
                      {selectedTrip.plannedWaypoints && selectedTrip.plannedWaypoints.length > 0
                        ? `(${selectedTrip.waypoints?.length || 0}/${selectedTrip.plannedWaypoints.length} điểm ghé chốt)`
                        : `(${selectedTrip.waypoints?.length || 0} điểm dừng)`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleOpenDeleteTrip(selectedTrip.id, e)}
                    title="Xóa chuyến đi này"
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash3 size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Hiển thị danh sách các điểm check-in trong kế hoạch chốt */}
            {selectedTrip && selectedTrip.plannedWaypoints && selectedTrip.plannedWaypoints.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50/60 rounded-lg border border-indigo-100 mb-2 shrink-0 flex-wrap text-xs">
                <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  Kế hoạch check-in ({selectedTrip.plannedWaypoints.length} điểm):
                </span>
                {selectedTrip.plannedWaypoints.map((pw, pIdx) => {
                  const isCheckedIn = selectedTrip.waypoints?.some(
                    (w) => w.customerName.toLowerCase() === pw.name.toLowerCase()
                  );
                  return (
                    <span
                      key={pIdx}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border font-medium ${isCheckedIn
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-white text-indigo-900 border-indigo-200'
                        }`}
                      title={pw.address}
                    >
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center">
                        {pIdx + 1}
                      </span>
                      <span className="truncate max-w-[180px]">{pw.name}</span>
                      {isCheckedIn && <span className="text-[10px] text-emerald-600 font-bold">✓ Đã ghé</span>}
                    </span>
                  );
                })}
              </div>
            )}

            {/* KHUNG BẢN ĐỒ TOÀN MÀN HÌNH MỞ RỘNG TỐI ĐA */}
            <div className="flex-1 w-full h-full min-h-[500px] overflow-hidden rounded-xl border border-slate-200/60 shadow-2xs">
              <SalesRouteMap
                trip={selectedTrip}
                allTrips={filteredTrips}
                deviceLocation={deviceLocation}
                onRefreshLocation={detectCurrentLocation}
                onSelectTripRoute={(t) => {
                  setSelectedRouteDetailTrip(t);
                  setIsRouteDetailOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── OFFCANVAS: BẮT ĐẦU CA ĐI TUYẾN (CHUẨN WIDTH=400PX, NÚT Ở FOOTER, KHÓA VỊ TRÍ GPS) ── */}
      <Offcanvas
        isOpen={isStartTripOpen}
        onClose={() => setIsStartTripOpen(false)}
        title="Xác nhận vị trí bắt đầu ca tuyến"
        width="400px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStartTripOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={
                isSubmittingRoute ||
                (plannedWaypoints.length === 0 &&
                  !(hasDestination && (destinationPointName.trim() || destinationAddress.trim())))
              }
              onClick={() => handleStartTripSubmit()}
              style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
              title={
                plannedWaypoints.length === 0 &&
                !(hasDestination && (destinationPointName.trim() || destinationAddress.trim()))
                  ? 'Chưa có điểm đến / điểm ghé. Vui lòng chọn hoặc nhập điểm đến để chốt tuyến.'
                  : undefined
              }
            >
              <PlayFill size={15} />
              <span>{isSubmittingRoute ? 'Đang định tuyến & chốt...' : 'Chốt tuyến & Bắt đầu ca'}</span>
            </Button>
          </div>
        }
      >
        <div className="flex flex-col h-full gap-3 p-1 min-h-0">
          {/* Card định vị GPS thiết bị thực tế */}
          {isDetectingGps || gpsStatus === 'locating' ? (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center gap-2.5 text-xs text-sky-800 shrink-0">
              <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <div>
                <div className="font-bold">Đang dò tìm vị trí GPS của thiết bị...</div>
                <div className="text-[11px] text-sky-600">Vui lòng bấm "Cho phép" nếu trình duyệt hỏi quyền vị trí</div>
              </div>
            </div>
          ) : currentLat != null && currentLng != null ? (
            <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                  Đã nhận diện GPS thiết bị
                </span>
                <button
                  type="button"
                  onClick={detectCurrentLocation}
                  disabled={isDetectingGps}
                  className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-300"
                >
                  <Compass size={12} className={isDetectingGps ? 'animate-spin' : ''} />
                  <span>Lấy lại GPS</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-0.5 border-t border-emerald-200/60">
                <span>Tọa độ: {currentLat.toFixed(6)}, {currentLng.toFixed(6)}</span>
                <span className="text-emerald-700 font-bold">● GPS thời gian thực</span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 shrink-0">
              <div className="flex items-start gap-2">
                <Compass className="text-amber-600 text-sm mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900">
                  <div className="font-bold">Chưa lấy được vị trí thiết bị</div>
                  <div className="text-[11px] text-amber-700">
                    {gpsErrorMessage || 'Vui lòng kiểm tra quyền vị trí trên thanh địa chỉ.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={detectCurrentLocation}
                className="w-full py-1 px-2.5 rounded-lg bg-white border border-amber-300 text-amber-800 font-bold text-xs hover:bg-amber-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Compass size={12} />
                <span>Bấm vào đây để lấy lại vị trí</span>
              </button>
            </div>
          )}

          <div className="shrink-0">
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

          <div className="shrink-0">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phương tiện di chuyển (Tối ưu tuyến đường)
            </label>
            <Select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value as any)}
              options={[
                { label: 'Xe máy (Tránh cao tốc, tối ưu đường nhánh)', value: 'Xe máy' },
                { label: 'Ô tô cá nhân (Trục chính, tránh đường cấm ô tô)', value: 'Ô tô cá nhân' },
                { label: 'Xe công ty (Trục lớn, xe chở hàng)', value: 'Xe công ty' },
              ]}
            />
          </div>

          {/* Tên điểm xuất phát */}
          <div className="shrink-0">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên điểm xuất phát
            </label>
            <Input
              value={startPointName || deviceLocation?.name || 'Phường Phú Diễn'}
              onChange={(e) => setStartPointName(e.target.value)}
              placeholder="VD: Phường Phú Diễn, Trụ sở Seajong..."
            />
          </div>

          {/* Khóa địa chỉ xuất phát theo thiết bị */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Địa chỉ xuất phát
              </label>
              <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                <LockFill size={11} /> Khóa theo GPS
              </span>
            </div>
            <Input
              value={
                startAddress ||
                deviceLocation?.address ||
                (currentLat ? `${currentLat.toFixed(6)}, ${currentLng?.toFixed(6)}` : 'Đang lấy vị trí thiết bị...')
              }
              readOnly
              className="bg-slate-100 text-slate-700 cursor-not-allowed border-slate-300 font-medium"
            />
          </div>

          {/* ── CHỌN CÁC ĐIỂM CHECK-IN & ĐIỂM ĐẾN TRÊN TUYẾN ── */}
          <div className="shrink-0 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shop className="text-cyan-600" size={13} />
                <span>Điểm đến / Điểm check-in trên tuyến</span>
              </label>
              <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                {plannedWaypoints.length} điểm đã chọn
              </span>
            </div>

            {/* Ô tìm kiếm có gợi ý danh sách đại lý & hỗ trợ nhập địa chỉ / điểm đến tự do */}
            <div className="relative">
              <div className="relative">
                <Input
                  value={dealerSearchQuery}
                  onChange={(e) => {
                    setDealerSearchQuery(e.target.value);
                    setIsDealerDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDirectSearchQuery(dealerSearchQuery);
                    }
                  }}
                  onFocus={() => setIsDealerDropdownOpen(true)}
                  placeholder="Tìm đại lý hoặc nhập địa chỉ / điểm đến bất kỳ..."
                />
                {dealerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDealerSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Danh sách dropdown gợi ý */}
              {isDealerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {/* Dòng chọn nhanh điểm đến tự do theo đúng từ khóa đang gõ (nếu có) */}
                  {dealerSearchQuery.trim() && (
                    <div
                      onClick={() => handleAddDirectSearchQuery(dealerSearchQuery)}
                      className="p-2.5 bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border-b border-cyan-200 cursor-pointer flex items-center justify-between transition-colors sticky top-0 z-20"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0">
                          <GeoAltFill size={11} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-cyan-900 truncate">
                            Chọn điểm: "{dealerSearchQuery}"
                          </div>
                          <div className="text-[10px] text-cyan-700 font-medium">
                            Thêm làm điểm đến / điểm ghé trên tuyến
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-cyan-700 bg-white px-2 py-0.5 rounded border border-cyan-300 shrink-0">
                        Chọn ngay ↵
                      </span>
                    </div>
                  )}

                  <div className="p-1.5 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-semibold sticky top-0 z-10 border-b border-slate-200">
                    <span>Chọn từ danh mục đại lý ({filteredDealers.length}):</span>
                    <button
                      type="button"
                      onClick={() => setIsDealerDropdownOpen(false)}
                      className="text-cyan-700 hover:text-cyan-800 font-bold cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>

                  {filteredDealers.length === 0 ? (
                    <div className="p-3 text-center space-y-2">
                      <div className="text-xs text-slate-500">
                        Không có đại lý nào trùng khớp trong danh mục
                      </div>
                      {dealerSearchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => handleAddDirectSearchQuery(dealerSearchQuery)}
                          className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <PlusLg size={12} />
                          <span>Thêm "{dealerSearchQuery}" làm điểm đến của ca</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredDealers.slice(0, 30).map((d) => {
                      const isChecked = plannedWaypoints.some((pw) => pw.name === d.name);
                      return (
                        <div
                          key={d.id}
                          onClick={() => handleToggleDealer(d)}
                          className={`p-2 hover:bg-cyan-50/60 cursor-pointer flex items-start gap-2.5 transition-colors ${isChecked ? 'bg-cyan-50/40' : ''
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }} // handled by row click
                            className="mt-1 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate">{d.name}</div>
                            {d.address && (
                              <div className="text-[11px] text-slate-500 truncate">{d.address}</div>
                            )}
                            {d.phone && (
                              <div className="text-[10px] text-cyan-700 font-medium">SĐT: {d.phone}</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Nút mở ô thêm điểm ngoài danh mục */}
                  <div className="p-2 bg-slate-50 sticky bottom-0 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        if (dealerSearchQuery.trim()) {
                          setCustomWpName(dealerSearchQuery.trim());
                          setCustomWpAddress(dealerSearchQuery.trim());
                        }
                        setShowCustomWaypointInput(true);
                        setIsDealerDropdownOpen(false);
                      }}
                      className="w-full py-1 text-xs text-cyan-700 hover:text-cyan-800 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <PlusLg size={12} />
                      <span>Nhập chi tiết điểm đến ngoài danh mục</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Form thêm điểm ghé ngoài danh mục đại lý */}
            {showCustomWaypointInput && (
              <div className="mt-2 p-2.5 bg-cyan-50/50 border border-cyan-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-900">
                  <span>Thêm điểm đến / điểm ghé ngoài danh mục</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomWaypointInput(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <Input
                  value={customWpName}
                  onChange={(e) => setCustomWpName(e.target.value)}
                  placeholder="Tên điểm đến / đại lý / đối tác..."
                />
                <Input
                  value={customWpAddress}
                  onChange={(e) => setCustomWpAddress(e.target.value)}
                  placeholder="Địa chỉ cụ thể hoặc tỉnh/huyện..."
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAddCustomWaypoint}
                  className="w-full text-xs"
                  style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
                >
                  Thêm vào danh sách lộ trình
                </Button>
              </div>
            )}

            {/* Danh sách các điểm ghé đã chọn */}
            {plannedWaypoints.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                {plannedWaypoints.map((pw, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                          <span className="truncate">{pw.name}</span>
                          {pw.isCustom && (
                            <span className="text-[9px] bg-purple-50 text-purple-700 font-semibold px-1 rounded border border-purple-200 shrink-0">
                              Ngoài danh mục
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{pw.address}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetAsDestination(idx)}
                        className="p-1 rounded text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer text-[11px] font-bold"
                        title="Đặt làm Điểm đến kết thúc ca"
                      >
                        🎯 Đích
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePlannedWaypoint(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                        title="Xóa điểm này"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── THIẾT LẬP ĐIỂM ĐẾN CUỐI CÙNG (TÙY CHỌN) ── */}
          <div className="shrink-0 pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer mb-1.5">
              <input
                type="checkbox"
                checked={hasDestination}
                onChange={(e) => setHasDestination(e.target.checked)}
                className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">
                Thiết lập điểm đến kết thúc ca tuyến (Tùy chọn)
              </span>
            </label>

            {hasDestination && (
              <div className="space-y-2 mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tên điểm đến
                  </label>
                  <Input
                    value={destinationPointName}
                    onChange={(e) => setDestinationPointName(e.target.value)}
                    placeholder="VD: Văn phòng Seajong hoặc Nhà riêng hoặc tên đối tác"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Địa chỉ điểm đến
                  </label>
                  <Input
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    placeholder="Địa chỉ cụ thể của điểm đến (hoặc để trống nếu tên đã có địa danh)..."
                  />
                </div>
                {/* Gợi ý điểm đến nhanh */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { name: 'Văn phòng Seajong', addr: 'Phú Diễn, Bắc Từ Liêm, Hà Nội' },
                    { name: 'Kho hàng Seajong', addr: 'Phú Diễn, Hà Nội' },
                    { name: 'Nhà riêng', addr: 'Hà Nội' },
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setDestinationPointName(preset.name);
                        setDestinationAddress(preset.addr);
                      }}
                      className="text-[10px] bg-white hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 px-2 py-0.5 rounded border border-slate-200 cursor-pointer transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ô ghi chú lộ trình tự động chiếm hết chiều cao khả dụng */}
          <div className="flex-1 flex flex-col min-h-[80px]">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú lộ trình (nếu có)
            </label>
            <textarea
              value={startNotes}
              onChange={(e) => setStartNotes(e.target.value)}
              placeholder="VD: Ca đi tuyến chăm sóc khách hàng ngày..."
              className="w-full flex-1 min-h-[70px] resize-none text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-cyan-500 bg-white"
            />
          </div>
        </div>
      </Offcanvas>

      {/* ── OFFCANVAS: CHECK-IN ĐIỂM GHÉ ĐẠI LÝ (CHUẨN WIDTH=400PX, NÚT Ở FOOTER, KHÓA VỊ TRÍ ĐẠI LÝ) ── */}
      <Offcanvas
        isOpen={isAddWaypointOpen}
        onClose={() => setIsAddWaypointOpen(false)}
        title="Check-in điểm ghé đại lý"
        width="400px"
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            {/* Nút chụp ảnh đính kèm vị trí check-in */}
            <div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCapturePhoto}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                leftIcon={<CameraFill size={13} className="text-cyan-600" />}
                className="text-cyan-700 border-cyan-300 hover:bg-cyan-50"
              >
                <span>Chụp ảnh</span>
                {wpPhotos.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-cyan-600 text-white rounded-full text-[10px] font-bold">
                    {wpPhotos.length}
                  </span>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddWaypointOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isSubmittingRoute}
                onClick={() => handleAddWaypointSubmit()}
                style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
              >
                {isSubmittingRoute ? 'Đang định tuyến đường...' : 'Xác nhận check-in'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col h-full gap-3 p-1 min-h-0">
          <div className="shrink-0">
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

          {/* Tự động điền vị trí tọa độ của đại lý theo thiết bị và khóa các ô vị trí lại */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Địa chỉ đại lý (Theo thiết bị)
              </label>
              <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                <LockFill size={11} /> Khóa theo GPS
              </span>
            </div>
            <Input
              value={
                wpAddress ||
                deviceLocation?.address ||
                (currentLat ? `${currentLat.toFixed(6)}, ${currentLng?.toFixed(6)}` : 'Đang lấy vị trí thiết bị...')
              }
              readOnly
              className="bg-slate-100 text-slate-700 cursor-not-allowed border-slate-300 font-medium"
            />
          </div>

          {/* Khối tọa độ GPS thiết bị - Đã khóa */}
          <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-xs space-y-1 shrink-0">
            <div className="flex items-center justify-between text-emerald-900 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Tọa độ GPS điểm ghé (Đã khóa)
              </span>
              <button
                type="button"
                onClick={detectCurrentLocation}
                disabled={isDetectingGps}
                className="text-[11px] text-cyan-700 hover:text-cyan-900 font-semibold flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-300"
              >
                <Compass size={11} className={isDetectingGps ? 'animate-spin' : ''} />
                <span>Lấy lại GPS</span>
              </button>
            </div>
            <div className="font-mono text-slate-700 flex items-center justify-between">
              <span>Vĩ độ / Kinh độ:</span>
              <span className="font-bold text-slate-900">
                {currentLat != null && currentLng != null
                  ? `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`
                  : 'Đang xác định...'}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Số điện thoại liên hệ
            </label>
            <Input
              value={wpPhone}
              onChange={(e) => setWpPhone(e.target.value)}
              placeholder="Số điện thoại chủ đại lý"
            />
          </div>

          <div className="shrink-0">
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

          <div className="shrink-0">
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

          {/* Hiển thị danh sách ảnh chụp đính kèm (nếu có) */}
          {wpPhotos.length > 0 && (
            <div className="shrink-0 p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <CameraFill size={12} className="text-cyan-600" />
                  Ảnh đính kèm ({wpPhotos.length})
                </span>
                <span className="text-[10px] text-slate-400">Bấm ảnh để phóng to</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {wpPhotos.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-300 shadow-2xs"
                  >
                    <img
                      src={img}
                      alt={`Ảnh ${idx + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setPreviewImage(img)}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWpPhotos((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] opacity-80 hover:opacity-100 cursor-pointer shadow-xs"
                      title="Xóa ảnh này"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ô ghi chú nội dung làm việc tự động chiếm hết chiều cao khả dụng */}
          <div className="flex-1 flex flex-col min-h-[90px]">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú nội dung làm việc
            </label>
            <textarea
              value={wpNotes}
              onChange={(e) => setWpNotes(e.target.value)}
              placeholder="Kết quả làm việc, nhu cầu mẫu mã, phản hồi của đại lý..."
              className="w-full flex-1 min-h-[80px] resize-none text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-cyan-500 bg-white"
            />
          </div>
        </div>
      </Offcanvas>

      {/* ── OFFCANVAS: KẾT THÚC CA TUYẾN (CHUẨN WIDTH=400PX, TỰ ĐỘNG GPS, NÚT Ở FOOTER TƯƠNG TỰ CHECK-IN) ── */}
      <Offcanvas
        isOpen={isEndTripOpen}
        onClose={() => setIsEndTripOpen(false)}
        title="Chốt kết thúc ca đi tuyến"
        width="400px"
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            {/* Nút chụp ảnh đính kèm kết thúc ca */}
            <div>
              <input
                ref={endCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCaptureEndPhoto}
              />
              <button
                type="button"
                onClick={() => endCameraInputRef.current?.click()}
                className="py-1.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Chụp ảnh đính kèm khi kết thúc ca"
              >
                <CameraFill size={13} className="text-rose-600" />
                <span>Chụp ảnh</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEndTripOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={isSubmittingRoute}
                onClick={() => handleEndTripSubmit()}
                leftIcon={<FlagFill size={12} />}
              >
                {isSubmittingRoute ? 'Đang chốt ca...' : 'Chốt kết thúc ca'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col h-full gap-3 p-1 min-h-0">
          {/* 1. Khối nhận diện GPS thiết bị thời gian thực */}
          {currentLat != null && currentLng != null ? (
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Đã nhận diện GPS thiết bị
                </span>
                <button
                  type="button"
                  onClick={detectCurrentLocation}
                  disabled={isDetectingGps}
                  className="text-[11px] text-cyan-700 hover:text-cyan-900 font-semibold flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-2xs"
                >
                  <Compass size={11} className={isDetectingGps ? 'animate-spin' : ''} />
                  <span>Lấy lại GPS</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-0.5 border-t border-emerald-200/60">
                <span>Tọa độ: {currentLat.toFixed(6)}, {currentLng.toFixed(6)}</span>
                <span className="text-emerald-700 font-bold">● GPS thời gian thực</span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 shrink-0">
              <div className="flex items-start gap-2">
                <Compass className="text-amber-600 text-sm mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900">
                  <div className="font-bold">Chưa lấy được vị trí thiết bị</div>
                  <div className="text-[11px] text-amber-700">
                    {gpsErrorMessage || 'Vui lòng kiểm tra quyền vị trí trên trình duyệt.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={detectCurrentLocation}
                className="w-full py-1 px-2.5 rounded-lg bg-white border border-amber-300 text-amber-800 font-bold text-xs hover:bg-amber-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Compass size={12} />
                <span>Bấm vào đây để lấy lại vị trí</span>
              </button>
            </div>
          )}

          {/* 2. Thống kê tóm tắt hành trình ca */}
          {(activeTrip || selectedTrip) && (
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span>Tổng kết ca: {(activeTrip || selectedTrip)?.code}</span>
                <span className="text-cyan-700 font-mono font-semibold">
                  {(activeTrip || selectedTrip)?.startTime} → Hiện tại
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500 font-medium">Quãng đường</div>
                  <div className="text-xs font-bold text-cyan-700">
                    {(activeTrip || selectedTrip)?.totalDistanceKm || 0} km
                  </div>
                </div>
                <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500 font-medium">Điểm đã ghé</div>
                  <div className="text-xs font-bold text-emerald-700">
                    {(activeTrip || selectedTrip)?.waypoints?.filter((w) => w.status === 'completed').length || 0} / {(activeTrip || selectedTrip)?.waypoints?.length || 0}
                  </div>
                </div>
                <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500 font-medium">Doanh số chốt</div>
                  <div className="text-xs font-bold text-amber-700 truncate">
                    {((activeTrip || selectedTrip)?.waypoints?.reduce((sum, w) => sum + (w.orderAmount || 0), 0) || 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Tên mốc kết thúc ca */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Tên mốc kết thúc ca
              </label>
              <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                <LockFill size={11} /> Khóa theo GPS
              </span>
            </div>
            <Input
              value={endPointName || deviceLocation?.name || 'Vị trí hiện tại'}
              onChange={(e) => setEndPointName(e.target.value)}
              placeholder="VD: Văn phòng Seajong hoặc Nhà riêng"
            />
            {/* Gợi ý chọn nhanh */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {['Văn phòng Seajong', 'Kho hàng Seajong', 'Nhà riêng'].map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setEndPointName(loc)}
                  className="text-[10px] bg-white hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 px-2 py-0.5 rounded border border-slate-200 cursor-pointer transition-colors"
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Địa chỉ kết thúc (Theo thiết bị) - Khóa theo GPS */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Địa chỉ kết thúc (Theo thiết bị)
              </label>
              <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                <LockFill size={11} /> Khóa theo GPS
              </span>
            </div>
            <Input
              value={
                endAddress ||
                deviceLocation?.address ||
                (currentLat ? `${currentLat.toFixed(6)}, ${currentLng?.toFixed(6)}` : 'Đang lấy vị trí thiết bị...')
              }
              readOnly
              className="bg-slate-100 text-slate-700 cursor-not-allowed border-slate-300 font-medium"
            />
          </div>

          {/* 5. Hiển thị danh sách ảnh chụp đính kèm kết thúc ca (nếu có) */}
          {endPhotos.length > 0 && (
            <div className="shrink-0 p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <CameraFill size={12} className="text-rose-600" />
                  Ảnh chốt ca ({endPhotos.length})
                </span>
                <span className="text-[10px] text-slate-400">Bấm ảnh để phóng to</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {endPhotos.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-300 shadow-2xs"
                  >
                    <img
                      src={img}
                      alt={`Ảnh chốt ca ${idx + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setPreviewImage(img)}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEndPhotos((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] opacity-80 hover:opacity-100 cursor-pointer shadow-xs"
                      title="Xóa ảnh này"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Ô ghi chú tổng kết ca tự động chiếm hết chiều cao khả dụng */}
          <div className="flex-1 flex flex-col min-h-[90px]">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú tổng kết ca
            </label>
            <textarea
              value={endNotes}
              onChange={(e) => setEndNotes(e.target.value)}
              placeholder="Tổng kết kết quả ca đi tuyến, bàn giao xe, công việc phát sinh..."
              className="w-full flex-1 min-h-[80px] resize-none text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-cyan-500 bg-white"
            />
          </div>
        </div>
      </Offcanvas>

      {/* ── OFFCANVAS: CHI TIẾT TUYẾN ĐƯỜNG CA ĐI TUYẾN (CHUẨN WIDTH=400PX) ── */}
      <Offcanvas
        isOpen={isRouteDetailOpen}
        onClose={() => setIsRouteDetailOpen(false)}
        title="Chi tiết lộ trình tuyến đường"
        width="400px"
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRouteDetailOpen(false)}
            >
              Đóng
            </Button>
            {selectedRouteDetailTrip?.status === 'in_progress' && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsRouteDetailOpen(false);
                  handleOpenAddWaypoint();
                }}
                leftIcon={<PlusLg size={13} />}
                style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
              >
                Ghé đại lý ngay
              </Button>
            )}
          </div>
        }
      >
        {selectedRouteDetailTrip && (
          <div className="flex flex-col h-full gap-3 p-1 overflow-y-auto">
            {/* Header tóm tắt ca */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-900">
                  {selectedRouteDetailTrip.code}
                </span>
                {selectedRouteDetailTrip.status === 'in_progress' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đang đi tuyến
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                    Đã hoàn thành
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nhân viên phụ trách:</span>
                  <span className="font-bold text-slate-800">{selectedRouteDetailTrip.employeeName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phương tiện:</span>
                  <span className="font-semibold text-slate-700">{selectedRouteDetailTrip.vehicle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Thời gian:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedRouteDetailTrip.startTime}
                    {selectedRouteDetailTrip.endTime ? ` → ${selectedRouteDetailTrip.endTime}` : ''} ({selectedRouteDetailTrip.date})
                  </span>
                </div>
              </div>

              {/* Thống kê cự ly 2 cột */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Cự ly kế hoạch</div>
                  <div className="text-sm font-black text-indigo-600">
                    {selectedRouteDetailTrip.plannedDistanceKm || 0} km
                  </div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Cự ly thực tế</div>
                  <div className="text-sm font-black text-cyan-700">
                    {selectedRouteDetailTrip.totalDistanceKm || 0} km
                  </div>
                </div>
              </div>
            </div>

            {/* Hành trình chi tiết timeline */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Hành trình các điểm dừng:</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {selectedRouteDetailTrip.waypoints?.length || 0} /{' '}
                  {selectedRouteDetailTrip.plannedWaypoints?.length || selectedRouteDetailTrip.waypoints?.length || 0} điểm
                </span>
              </div>

              <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* Mốc xuất phát */}
                <div className="relative text-xs">
                  <span className="absolute -left-5 top-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🚩 Điểm xuất phát</span>
                    <span className="text-[10px] font-normal text-slate-400">({selectedRouteDetailTrip.startTime})</span>
                  </div>
                  <div className="font-semibold text-slate-700 mt-0.5">{selectedRouteDetailTrip.startPoint.name}</div>
                  <div className="text-[11px] text-slate-500">{selectedRouteDetailTrip.startPoint.address}</div>
                </div>

                {/* Các điểm check-in trong kế hoạch & thực tế */}
                {selectedRouteDetailTrip.plannedWaypoints && selectedRouteDetailTrip.plannedWaypoints.length > 0
                  ? selectedRouteDetailTrip.plannedWaypoints.map((pw, idx) => {
                    const matchedActual = selectedRouteDetailTrip.waypoints?.find(
                      (w) => w.customerName.toLowerCase() === pw.name.toLowerCase()
                    );
                    return (
                      <div key={idx} className="relative text-xs p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                        <span className={`absolute -left-5 top-2.5 w-3 h-3 rounded-full ring-4 ring-white ${matchedActual ? 'bg-cyan-600' : 'bg-indigo-500'}`} />
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900">
                            #{idx + 1}. {pw.name}
                          </span>
                          {matchedActual ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ✓ Đã check-in ({matchedActual.checkInTime})
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200/70 text-slate-600">
                              Chưa ghé
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{pw.address}</div>
                        {pw.phone && <div className="text-[10px] text-cyan-700 font-medium">SĐT: {pw.phone}</div>}

                        {/* Thông tin check-in thực tế nếu có */}
                        {matchedActual && (
                          <div className="mt-1 pt-1 border-t border-slate-200/60 space-y-1 text-[11px]">
                            <div><b>Mục đích:</b> <span className="text-cyan-700 font-medium">{matchedActual.purpose}</span></div>
                            {matchedActual.orderAmount ? (
                              <div><b>Doanh số:</b> <span className="text-emerald-700 font-bold">{matchedActual.orderAmount.toLocaleString('vi-VN')} đ</span></div>
                            ) : null}
                            {matchedActual.notes && <div className="italic text-slate-600">"{matchedActual.notes}"</div>}
                            {matchedActual.photos && matchedActual.photos.length > 0 && (
                              <div className="mt-1">
                                <div className="text-[10px] font-bold text-slate-500 mb-0.5">Ảnh đính kèm ({matchedActual.photos.length}):</div>
                                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                                  {matchedActual.photos.map((ph, pIdx) => (
                                    <img
                                      key={pIdx}
                                      src={ph}
                                      alt={`Ảnh check-in ${pIdx + 1}`}
                                      className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer shadow-2xs shrink-0 hover:scale-105 transition-transform"
                                      onClick={() => setPreviewImage(ph)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                  : selectedRouteDetailTrip.waypoints?.map((w, idx) => (
                    <div key={idx} className="relative text-xs p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="absolute -left-5 top-2.5 w-3 h-3 rounded-full bg-cyan-600 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">#{w.orderIndex}. {w.customerName}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{w.checkInTime}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{w.customerAddress}</div>
                      <div><b>Mục đích:</b> {w.purpose}</div>
                      {w.orderAmount ? <div><b>Doanh số:</b> {w.orderAmount.toLocaleString('vi-VN')} đ</div> : null}
                      {w.photos && w.photos.length > 0 && (
                        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                          {w.photos.map((ph, pIdx) => (
                            <img key={pIdx} src={ph} alt="Ảnh" className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-105 transition-transform" onClick={() => setPreviewImage(ph)} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                {/* Điểm kết thúc ca nếu có */}
                {selectedRouteDetailTrip.endPoint && (
                  <div className="relative text-xs pt-1">
                    <span className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-white" />
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🏁 Điểm kết thúc ca</span>
                      {selectedRouteDetailTrip.endTime && (
                        <span className="text-[10px] font-normal text-slate-400">({selectedRouteDetailTrip.endTime})</span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-700 mt-0.5">{selectedRouteDetailTrip.endPoint.name}</div>
                    <div className="text-[11px] text-slate-500">{selectedRouteDetailTrip.endPoint.address}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Ghi chú ca tuyến nếu có */}
            {selectedRouteDetailTrip.notes && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1 shrink-0">
                <span className="font-bold text-amber-900">Ghi chú lộ trình:</span>
                <p className="text-slate-700 italic">"{selectedRouteDetailTrip.notes}"</p>
              </div>
            )}
          </div>
        )}
      </Offcanvas>

      {/* Modal phóng to ảnh check-in */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="Xem ảnh đính kèm"
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 cursor-pointer shadow-md font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* ── CONFIRM DIALOG: XÁC NHẬN XÓA CHUYẾN ĐI TUYẾN (THAY THẾ WINDOW.CONFIRM) ── */}
      <ConfirmDialog
        isOpen={Boolean(deleteTripId)}
        onClose={() => setDeleteTripId(null)}
        onCancel={() => setDeleteTripId(null)}
        onConfirm={handleConfirmDeleteTrip}
        title="Xác nhận xóa chuyến đi"
        message="Bạn có chắc muốn xóa dữ liệu chuyến đi tuyến này? Thao tác này sẽ xóa toàn bộ lộ trình và các điểm check-in liên quan."
        variant="danger"
        confirmLabel="Xóa chuyến đi"
        cancelLabel="Hủy bỏ"
        isLoading={isDeletingTrip}
      />
    </StandardPage>
  );
};
