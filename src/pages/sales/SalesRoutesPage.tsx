import React, { useState, useMemo, useEffect } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { Button } from '../../components/common/Button';
import { Offcanvas } from '../../components/common/Offcanvas';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { SalesRouteMap } from '../../components/sales/SalesRouteMap';
import {
  routeService,
  type RouteTrip,
  type RouteWaypoint,
} from '../../services/routeService';
import {
  PlusLg,
  Truck,
  ArrowRepeat,
  Compass,
  FlagFill,
  PersonFill,
  Trash3,
  Calendar3,
  Clock,
  GeoAlt,
  Shop,
} from 'react-bootstrap-icons';

export const SalesRoutesPage: React.FC = () => {
  const [trips, setTrips] = useState<RouteTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
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

  useEffect(() => {
    loadTrips();
  }, []);

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
      alert('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCurrentLat(lat);
        setCurrentLng(lng);

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
                setStartAddress(parts.join(', '));
                setStartPointName(road || 'Vị trí hiện tại');
              }
            }
          }
        } catch {}

        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('Lỗi lấy GPS:', err);
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Bộ lọc danh sách chuyến
  const filteredTrips = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return trips.filter((t) => {
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
  }, [trips, statusFilter, dateFilter, search]);

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
          {/* ── THANH CÔNG CỤ TABLE TOOLBAR (TUÂN THỦ AGENTS.MD) ── */}
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
                {activeTrip ? (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        detectCurrentLocation();
                        setIsAddWaypointOpen(true);
                      }}
                      leftIcon={<PlusLg size={13} />}
                      style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
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
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      detectCurrentLocation();
                      setIsStartTripOpen(true);
                    }}
                    leftIcon={<PlusLg size={13} />}
                    style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
                  >
                    <span>Bắt đầu ca tuyến</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadTrips}
                  title="Tải lại dữ liệu"
                  leftIcon={<ArrowRepeat size={13} />}
                >
                  <span className="hidden sm:inline">Làm mới</span>
                </Button>
              </div>
            }
          />

          {/* ── BỐ CỤC CHIA KHÔNG GIAN: CỘT TRÁI (32%) & BẢN ĐỒ RỘNG LỚN (68%) ── */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
            {/* CỘT TRÁI (4/12 Cột): Danh sách ca đi tuyến & Chi tiết điểm dừng */}
            <div className="lg:col-span-4 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200/80 min-h-0 bg-slate-50/40">
              <div className="p-2.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-slate-800">
                  Danh sách ca tuyến ({filteredTrips.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Chọn ca để xem lộ trình
                </span>
              </div>

              {/* Danh sách các ca */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                {filteredTrips.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Không tìm thấy chuyến đi tuyến nào phù hợp
                  </div>
                ) : (
                  filteredTrips.map((trip) => {
                    const isSelected = trip.id === selectedTrip?.id;
                    const isRunning = trip.status === 'in_progress';
                    const tripRevenue = trip.waypoints?.reduce(
                      (acc, w) => acc + (Number(w.orderAmount) || 0),
                      0
                    );

                    return (
                      <div
                        key={trip.id}
                        onClick={() => setSelectedTripId(trip.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-50/60 border-cyan-500 shadow-2xs ring-1 ring-cyan-500/30'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-bold text-xs text-slate-900 truncate">
                              {trip.code}
                            </span>
                            {isRunning ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Đang đi
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                                Hoàn thành
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-slate-400 font-mono shrink-0">
                            {trip.date}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-700 mb-1.5">
                          <div className="flex items-center gap-1 font-bold text-slate-800">
                            <PersonFill size={13} className="text-slate-400" />
                            <span>{trip.employeeName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Truck size={12} className="text-slate-400" />
                            <span>{trip.vehicle}</span>
                          </div>
                        </div>

                        {/* Mốc tuyến đường */}
                        <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 mb-1.5">
                          <div className="flex items-start gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                            <span className="truncate">
                              <b>{trip.startTime}:</b> {trip.startPoint.name}
                            </span>
                          </div>
                          {trip.endPoint && (
                            <div className="flex items-start gap-1.5 truncate">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-0.5" />
                              <span className="truncate">
                                <b>{trip.endTime}:</b> {trip.endPoint.name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Thống kê trạm & km & doanh số */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <span>
                              <b>{trip.waypoints?.length || 0}</b> điểm ghé
                            </span>
                            <span className="font-bold text-cyan-700">
                              {trip.totalDistanceKm} km
                            </span>
                          </div>
                          {tripRevenue > 0 && (
                            <span className="font-bold text-emerald-600">
                              +{tripRevenue.toLocaleString('vi-VN')} đ
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chi tiết các trạm ghé của ca đang chọn đặt ngay ở chân cột trái để không chiếm chỗ bản đồ */}
              {selectedTrip && selectedTrip.waypoints && selectedTrip.waypoints.length > 0 && (
                <div className="p-2.5 border-t border-slate-200/80 bg-white max-h-52 overflow-y-auto shrink-0">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span>Trạm ghé đại lý ({selectedTrip.waypoints.length})</span>
                    <span className="text-cyan-700 font-bold lowercase text-[10px]">
                      {selectedTrip.status === 'in_progress' ? '● trực tiếp' : 'xong'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {selectedTrip.waypoints.map((wp, idx) => {
                      const isDone = wp.status === 'completed';
                      return (
                        <div
                          key={wp.id}
                          className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/70 text-xs flex items-center justify-between gap-1.5"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-4 h-4 rounded-full bg-cyan-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate text-[11.5px]">
                                {wp.customerName}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {wp.customerAddress}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-[10px] font-mono text-slate-600 font-bold">
                              {wp.checkInTime}
                            </div>
                            {!isDone && selectedTrip.status === 'in_progress' && (
                              <button
                                type="button"
                                onClick={() => {
                                  routeService.checkoutWaypoint(selectedTrip.id, wp.id);
                                  loadTrips();
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer mt-0.5"
                              >
                                Rời điểm
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* CỘT PHẢI (8/12 Cột): BẢN ĐỒ CHIẾM TRỌN KHÔNG GIAN TOÀN DIỆN */}
            <div className="lg:col-span-8 flex flex-col min-h-0 bg-white p-2">
              {/* Header thông tin thanh thoát của ca được chọn */}
              {selectedTrip && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 mb-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {selectedTrip.code}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="font-bold text-xs text-slate-700 truncate">
                      {selectedTrip.employeeName} ({selectedTrip.vehicle})
                    </span>
                    <span className="text-slate-300 hidden sm:inline">·</span>
                    <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                      {selectedTrip.startPoint.name}
                    </span>
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
              <div className="flex-1 w-full h-full min-h-[500px] overflow-hidden rounded-xl">
                <SalesRouteMap trip={selectedTrip} allTrips={filteredTrips} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── OFFCANVAS: BẮT ĐẦU CA ĐI TUYẾN (CHUẨN WIDTH=400PX) ── */}
      <Offcanvas
        isOpen={isStartTripOpen}
        onClose={() => setIsStartTripOpen(false)}
        title="Bắt đầu ca đi tuyến"
        width="400px"
      >
        <form onSubmit={handleStartTripSubmit} className="flex flex-col gap-3 p-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nhân viên phụ trách
            </label>
            <Input
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Họ và tên nhân viên"
              required
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Điểm xuất phát (Tọa độ GPS)
              </label>
              <button
                type="button"
                onClick={detectCurrentLocation}
                disabled={isDetectingGps}
                className="text-[11px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
              >
                <Compass size={12} />
                <span>{isDetectingGps ? 'Đang dò GPS...' : 'Lấy vị trí GPS'}</span>
              </button>
            </div>
            <Input
              value={startPointName}
              onChange={(e) => setStartPointName(e.target.value)}
              placeholder="Tên điểm xuất phát (VD: Văn phòng Seajong)"
              required
            />
            <div className="mt-1">
              <Input
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                placeholder="Địa chỉ cụ thể"
              />
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Tọa độ: {currentLat}, {currentLng}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú ca tuyến
            </label>
            <textarea
              value={startNotes}
              onChange={(e) => setStartNotes(e.target.value)}
              placeholder="VD: Tuyến chăm sóc đại lý trục Cầu Giấy - Bắc Từ Liêm..."
              className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-cyan-500"
              rows={3}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStartTripOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
            >
              Xuất phát ngay
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
