import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  X,
  Check2,
  ClockHistory,
  GeoAltFill,
  Compass,
  ArrowRight,
} from 'react-bootstrap-icons';
import type { RouteTrip } from '../../services/routeService';

export interface TripSuggestionSelectProps {
  trips: RouteTrip[];
  selectedTripId: string | null;
  onSelectTrip: (trip: RouteTrip | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
 */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Format ngày YYYY-MM-DD sang DD/MM/YYYY
 */
function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Component TripSuggestionSelect: Ô tìm kiếm và chọn ca đi tuyến có danh sách gợi ý.
 * Tìm kiếm linh hoạt theo:
 *  - Thời gian: giờ bắt đầu (08:15), giờ kết thúc, ngày đi tuyến (18/11/2026, hôm nay).
 *  - Tên điểm check-in: tên đại lý, địa chỉ điểm ghé thực tế hoặc trong kế hoạch.
 *  - Mã ca tuyến: TRIP-20261118-001, 001.
 *  - Điểm xuất phát / Điểm đến.
 */
export const TripSuggestionSelect: React.FC<TripSuggestionSelectProps> = ({
  trips,
  selectedTripId,
  onSelectTrip,
  placeholder = 'Tìm ca theo giờ, ngày, tên điểm check-in...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ca tuyến hiện đang được chọn
  const selectedTrip = useMemo(() => {
    return trips.find((t) => t.id === selectedTripId) || null;
  }, [trips, selectedTripId]);

  // Đồng bộ giá trị ô nhập khi selectedTrip thay đổi
  useEffect(() => {
    if (!isTyping) {
      if (selectedTrip) {
        setSearchTerm(
          `${selectedTrip.code} · ${selectedTrip.startTime}${
            selectedTrip.endTime ? ` - ${selectedTrip.endTime}` : ''
          } (${formatDateVN(selectedTrip.date)})`
        );
      } else {
        setSearchTerm('');
      }
    }
  }, [selectedTrip, isTyping]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        if (selectedTrip) {
          setSearchTerm(
            `${selectedTrip.code} · ${selectedTrip.startTime}${
              selectedTrip.endTime ? ` - ${selectedTrip.endTime}` : ''
            } (${formatDateVN(selectedTrip.date)})`
          );
        } else {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedTrip]);

  // Lọc danh sách ca tuyến theo từ khóa tìm kiếm (Thời gian, Tên điểm check-in, Mã ca, Địa chỉ...)
  const filteredTrips = useMemo(() => {
    if (!isTyping || !searchTerm.trim()) {
      return trips;
    }

    const rawQ = searchTerm.trim().toLowerCase();
    const cleanQ = removeVietnameseTones(rawQ);
    const todayStr = new Date().toISOString().slice(0, 10);
    const isTodayQuery = cleanQ === 'hom nay' || cleanQ === 'today';

    return trips.filter((t) => {
      // 1. Kiểm tra mã ca
      if (t.code.toLowerCase().includes(rawQ)) return true;

      // 2. Kiểm tra thời gian: Giờ bắt đầu, Giờ kết thúc
      if (t.startTime && t.startTime.includes(rawQ)) return true;
      if (t.endTime && t.endTime.includes(rawQ)) return true;

      // Chuỗi thời gian kết hợp (VD: "08:15", "8h15")
      const timeClean = `${t.startTime} - ${t.endTime || ''}`.replace(':', 'h');
      if (timeClean.includes(rawQ)) return true;

      // 3. Kiểm tra ngày: YYYY-MM-DD hoặc DD/MM/YYYY
      if (t.date.includes(rawQ)) return true;
      const vnDate = formatDateVN(t.date);
      if (vnDate.includes(rawQ)) return true;
      if (isTodayQuery && t.date === todayStr) return true;

      // 4. Kiểm tra TÊN ĐIỂM CHECK-IN thực tế trong waypoints
      const matchActualWaypoint = t.waypoints?.some((w) => {
        const nameMatch = removeVietnameseTones(w.customerName || '').includes(cleanQ);
        const addrMatch = removeVietnameseTones(w.customerAddress || '').includes(cleanQ);
        const purposeMatch = removeVietnameseTones(w.purpose || '').includes(cleanQ);
        const timeMatch = (w.checkInTime || '').includes(rawQ) || (w.checkOutTime || '').includes(rawQ);
        return nameMatch || addrMatch || purposeMatch || timeMatch;
      });
      if (matchActualWaypoint) return true;

      // 5. Kiểm tra TÊN ĐIỂM CHECK-IN trong kế hoạch (plannedWaypoints)
      const matchPlannedWaypoint = t.plannedWaypoints?.some((pw) => {
        const nameMatch = removeVietnameseTones(pw.name || '').includes(cleanQ);
        const addrMatch = removeVietnameseTones(pw.address || '').includes(cleanQ);
        return nameMatch || addrMatch;
      });
      if (matchPlannedWaypoint) return true;

      // 6. Kiểm tra điểm xuất phát / điểm kết thúc
      if (removeVietnameseTones(t.startPoint?.name || '').includes(cleanQ)) return true;
      if (t.endPoint && removeVietnameseTones(t.endPoint.name || '').includes(cleanQ)) return true;

      // 7. Kiểm tra tên nhân viên / phương tiện
      if (removeVietnameseTones(t.employeeName || '').includes(cleanQ)) return true;
      if (removeVietnameseTones(t.vehicle || '').includes(cleanQ)) return true;

      return false;
    });
  }, [trips, searchTerm, isTyping]);

  const handleSelect = (trip: RouteTrip | null) => {
    onSelectTrip(trip);
    setIsOpen(false);
    setIsTyping(false);
    if (trip) {
      setSearchTerm(
        `${trip.code} · ${trip.startTime}${trip.endTime ? ` - ${trip.endTime}` : ''} (${formatDateVN(
          trip.date
        )})`
      );
    } else {
      setSearchTerm('');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTrip(null);
    setSearchTerm('');
    setIsTyping(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative min-w-[280px] ${className}`}>
      {/* Ô nhập tìm kiếm có gợi ý */}
      <div
        className={`relative flex items-center bg-white rounded-lg border transition-all ${
          isOpen
            ? 'border-cyan-500 ring-2 ring-cyan-100 shadow-xs'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`}
      >
        <div className="pl-2.5 pr-1.5 text-slate-400 flex items-center shrink-0">
          <Compass size={14} className={selectedTrip ? 'text-cyan-600' : 'text-slate-400'} />
        </div>

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsTyping(true);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setIsTyping(true);
              // Tự bôi đen để tiện gõ đè
              inputRef.current?.select();
            }
          }}
          placeholder={placeholder}
          className="w-full py-1.5 pr-8 pl-1 text-xs text-slate-800 placeholder-slate-400 font-medium bg-transparent focus:outline-none"
        />

        {/* Nút hành động ở đuôi ô input (Xóa hoặc Mũi tên xổ xuống) */}
        <div className="absolute right-1.5 flex items-center gap-1">
          {selectedTrip && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Bỏ chọn ca tuyến (Xem tất cả)"
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                if (!isOpen) {
                  inputRef.current?.focus();
                }
              }
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
          >
            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* DROPDOWN DANH SÁCH GỢI Ý CA TUYẾN */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-[999] top-full left-0 mt-1 w-full min-w-[360px] md:min-w-[420px] max-w-[500px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
          style={{ right: 0 }}
        >
          {/* Header dropdown */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold flex items-center gap-1">
              <Search size={10} className="text-cyan-600" />
              {isTyping && searchTerm.trim()
                ? `Kết quả tìm kiếm (${filteredTrips.length})`
                : `Danh sách ca tuyến (${trips.length})`}
            </span>
            <span className="text-[10px] text-slate-400">Tìm theo: Giờ, Ngày, Tên đại lý</span>
          </div>

          <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
            {/* Tùy chọn: Xem toàn bộ các ca trên bản đồ */}
            <div
              onClick={() => handleSelect(null)}
              className={`px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                selectedTripId === null ? 'bg-cyan-50/70 text-cyan-900 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <Compass size={13} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Tất cả ca tuyến</div>
                  <div className="text-[11px] text-slate-500">
                    Hiển thị tổng thể toàn bộ các lộ trình trên bản đồ
                  </div>
                </div>
              </div>
              {selectedTripId === null && <Check2 size={16} className="text-cyan-600 shrink-0" />}
            </div>

            {/* Danh sách các ca tuyến khớp */}
            {filteredTrips.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-xs">
                <ClockHistory size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">Không tìm thấy ca tuyến phù hợp</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  Thử tìm theo giờ (VD: 08:15), ngày (VD: 18/11) hoặc tên đại lý check-in
                </p>
              </div>
            ) : (
              filteredTrips.map((t) => {
                const isSelected = t.id === selectedTripId;
                const isRunning = t.status === 'in_progress';

                // Tập hợp danh sách các điểm check-in (Đại lý thực tế + Kế hoạch)
                const checkInNames: string[] = [];
                if (t.waypoints && t.waypoints.length > 0) {
                  t.waypoints.forEach((w) => {
                    if (w.customerName && !checkInNames.includes(w.customerName)) {
                      checkInNames.push(w.customerName);
                    }
                  });
                }
                if (t.plannedWaypoints && t.plannedWaypoints.length > 0) {
                  t.plannedWaypoints.forEach((pw) => {
                    if (pw.name && !checkInNames.includes(pw.name)) {
                      checkInNames.push(pw.name);
                    }
                  });
                }

                // Kiểm tra xem từ khóa tìm kiếm có khớp với tên điểm check-in nào không
                const cleanQuery = removeVietnameseTones(searchTerm.trim());

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-50/80 border-l-4 border-cyan-600'
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    {/* Dòng 1: Mã ca, Trạng thái, Khoảng cách */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {t.code}
                        </span>
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Đang đi
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Hoàn thành
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        <span className="text-xs font-bold text-cyan-700">
                          {t.totalDistanceKm} km
                        </span>
                        {isSelected && <Check2 size={15} className="text-cyan-600" />}
                      </div>
                    </div>

                    {/* Dòng 2: Thời gian xuất phát - kết thúc, ngày, nhân viên */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 mb-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <ClockHistory size={11} className="text-slate-400" />
                        {t.startTime}
                        {t.endTime ? ` → ${t.endTime}` : ''}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{formatDateVN(t.date)}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{t.employeeName}</span>
                      <span className="text-slate-400">({t.vehicle})</span>
                    </div>

                    {/* Dòng 3: Điểm xuất phát & đích đến */}
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate mb-1">
                      <span className="text-emerald-600 font-medium shrink-0">🚩 {t.startPoint.name}</span>
                      {t.endPoint && (
                        <>
                          <ArrowRight size={10} className="text-slate-300 shrink-0" />
                          <span className="text-rose-600 font-medium shrink-0 truncate">
                            🏁 {t.endPoint.name}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Dòng 4: DANH SÁCH CÁC ĐIỂM CHECK-IN / GHÉ THĂM ĐẠI LÝ */}
                    {checkInNames.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                          Check-in ({checkInNames.length}):
                        </span>
                        {checkInNames.slice(0, 4).map((name, idx) => {
                          const isMatch =
                            cleanQuery.length >= 2 &&
                            removeVietnameseTones(name).includes(cleanQuery);
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[150px] ${
                                isMatch
                                  ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300 ring-1 ring-amber-300'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                              title={name}
                            >
                              <GeoAltFill size={8} className={isMatch ? 'text-amber-600' : 'text-slate-400'} />
                              <span className="truncate">{name}</span>
                            </span>
                          );
                        })}
                        {checkInNames.length > 4 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            +{checkInNames.length - 4} điểm khác
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
