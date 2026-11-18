import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  type RouteTrip,
  type RouteWaypoint,
  splitActualPathByPlan,
} from '../../services/routeService';

interface SalesRouteMapProps {
  trip: RouteTrip | null;
  allTrips?: RouteTrip[];
  deviceLocation?: { lat: number; lng: number; address?: string } | null;
  className?: string;
  style?: React.CSSProperties;
  onSelectWaypoint?: (wp: RouteWaypoint) => void;
  onRefreshLocation?: () => void;
  onSelectTripRoute?: (trip: RouteTrip) => void;
}

export const SalesRouteMap: React.FC<SalesRouteMapProps> = ({
  trip,
  allTrips = [],
  deviceLocation,
  className = '',
  style,
  onSelectWaypoint,
  onRefreshLocation,
  onSelectTripRoute,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const deviceMarkerRef = useRef<L.Marker | null>(null);

  // Khởi tạo bản đồ 1 lần
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Mặc định tâm bản đồ tại Hà Nội
      const map = L.map(mapContainerRef.current, {
        center: [21.0142, 105.7812],
        zoom: 13,
        zoomControl: false,
      });

      // Lớp bản đồ OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Đặt zoom control góc trên bên phải
      L.control.zoom({ position: 'topright' }).addTo(map);

      // LayerGroup chứa toàn bộ tuyến đường và các ghim
      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Xử lý resize bản đồ để đảm bảo luôn lấp đầy không gian
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [trip]);

  // Cập nhật marker & polyline khi chuyến đi thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const tripsToRender = trip ? [trip] : allTrips;
    const allBoundsCoords: L.LatLngExpression[] = [];

    tripsToRender.forEach((t) => {
      const isSelected = trip?.id === t.id;
      const polyColor = isSelected ? '#0891b2' : '#94a3b8';

      // 1. Vẽ Tuyến đường chốt kế hoạch ban đầu (Planned Path) - Nét đứt màu xanh tím Indigo
      if (t.plannedPathCoordinates && t.plannedPathCoordinates.length >= 2) {
        const plannedPoly = L.polyline(t.plannedPathCoordinates, {
          color: '#6366f1',
          weight: 4.5,
          opacity: 0.85,
          dashArray: '7, 9',
          lineJoin: 'round',
          lineCap: 'round',
        })
          .bindTooltip(
            `Tuyến đường đã chốt: ${t.code} (${t.plannedDistanceKm || 0} km) · Nhấn để xem chi tiết tuyến`,
            { sticky: true }
          )
          .addTo(layerGroup);

        plannedPoly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (onSelectTripRoute) onSelectTripRoute(t);
        });

        t.plannedPathCoordinates.forEach((c) => allBoundsCoords.push(c));

        // Ghim các điểm check-in dự kiến trong kế hoạch chốt
        if (t.plannedWaypoints && t.plannedWaypoints.length > 0) {
          t.plannedWaypoints.forEach((pw, pIdx) => {
            if (pw.lat && pw.lng) {
              const pIcon = L.divIcon({
                className: 'custom-planned-marker',
                html: `
                  <div style="
                    width: 28px;
                    height: 28px;
                    background-color: #6366f1;
                    color: #ffffff;
                    border: 2.5px solid #ffffff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 12px;
                    box-shadow: 0 3px 8px rgba(99, 102, 241, 0.55);
                    cursor: pointer;
                  ">
                    ${pIdx + 1}
                  </div>
                `,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                popupAnchor: [0, -16],
              });

              L.marker([pw.lat, pw.lng], { icon: pIcon })
                .bindPopup(`
                  <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px; min-width: 180px;">
                    <div style="font-weight: 800; color: #6366f1; font-size: 11px; text-transform: uppercase;">
                      📌 Điểm chốt dự kiến #${pIdx + 1}
                    </div>
                    <div style="font-weight: 700; color: #0f172a; font-size: 12.5px; margin-top: 2px;">${pw.name}</div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 2px;">${pw.address}</div>
                    ${pw.phone ? `<div style="color: #0891b2; font-size: 11px; margin-top: 3px; font-weight: 600;">SĐT: ${pw.phone}</div>` : ''}
                  </div>
                `)
                .addTo(layerGroup);
              allBoundsCoords.push([pw.lat, pw.lng]);
            }
          });
        }
      }

      // 2. Vẽ Polyline vệt đường di chuyển thực tế (phân màu: Xanh = Trùng tuyến, Đỏ/Cam = Khác tuyến chốt)
      if (t.pathCoordinates && t.pathCoordinates.length >= 2) {
        if (isSelected) {
          const hasPlan = t.plannedPathCoordinates && t.plannedPathCoordinates.length >= 2;
          const segments = splitActualPathByPlan(t.pathCoordinates, t.plannedPathCoordinates);

          segments.forEach((seg) => {
            const isDeviated = hasPlan && seg.isDeviated;
            const segColor = isDeviated ? '#ef4444' : '#0891b2'; // Đỏ nếu chệch tuyến chốt, Xanh nếu trùng khớp

            // Lớp viền mờ dưới (Glow effect)
            L.polyline(seg.coords, {
              color: segColor,
              weight: 9,
              opacity: 0.22,
              lineJoin: 'round',
              lineCap: 'round',
            }).addTo(layerGroup);

            // Lớp nét đường chính uốn theo lòng đường giao thông
            const actualPoly = L.polyline(seg.coords, {
              color: segColor,
              weight: 5,
              opacity: 0.95,
              lineJoin: 'round',
              lineCap: 'round',
            })
              .bindTooltip(
                isDeviated
                  ? '⚠️ Cung đường di chuyển khác với tuyến đã chốt · Nhấn để xem chi tiết tuyến'
                  : '✅ Cung đường di chuyển trùng khớp với tuyến đã chốt · Nhấn để xem chi tiết tuyến',
                { sticky: true }
              )
              .addTo(layerGroup);

            actualPoly.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              if (onSelectTripRoute) onSelectTripRoute(t);
            });
          });
        } else {
          // Tuyến phụ không chọn
          const otherPoly = L.polyline(t.pathCoordinates, {
            color: polyColor,
            weight: 3.5,
            opacity: 0.5,
            lineJoin: 'round',
            lineCap: 'round',
          })
            .bindTooltip(`Tuyến: ${t.code} (${t.employeeName}) · Nhấn để chọn và xem chi tiết`, { sticky: true })
            .addTo(layerGroup);

          otherPoly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (onSelectTripRoute) onSelectTripRoute(t);
          });
        }

        t.pathCoordinates.forEach((c) => allBoundsCoords.push(c));
      }

      // 3. Marker Điểm xuất phát (Start)
      if (t.startPoint && t.startPoint.lat && t.startPoint.lng) {
        const startIcon = L.divIcon({
          className: 'custom-route-marker',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background-color: #10b981;
              color: #ffffff;
              border: 2.5px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
              cursor: pointer;
            ">
              <span style="line-height: 1;">🟢</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        L.marker([t.startPoint.lat, t.startPoint.lng], { icon: startIcon })
          .bindPopup(`
            <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
              <div style="font-weight: 800; color: #10b981; text-transform: uppercase; margin-bottom: 2px; font-size: 11px;">
                🚩 Điểm xuất phát (${t.startTime})
              </div>
              <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${t.startPoint.name}</div>
              <div style="color: #64748b; font-size: 11.5px; margin-top: 2px;">${t.startPoint.address}</div>
              <div style="margin-top: 4px; font-size: 11px; color: #475569;">
                <b>Nhân viên:</b> ${t.employeeName} (${t.vehicle})
              </div>
            </div>
          `)
          .addTo(layerGroup);

        allBoundsCoords.push([t.startPoint.lat, t.startPoint.lng]);
      }

      // 3. Markers các điểm ghé đại lý (Waypoints)
      if (t.waypoints && t.waypoints.length > 0) {
        t.waypoints.forEach((wp, idx) => {
          const isDone = wp.status === 'completed';
          const wpColor = isDone ? '#0891b2' : '#f59e0b';
          const wpBadge = idx + 1;

          const wpIcon = L.divIcon({
            className: 'custom-route-marker',
            html: `
              <div style="
                width: 32px;
                height: 32px;
                background-color: ${wpColor};
                color: #ffffff;
                border: 2.5px solid #ffffff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 13px;
                box-shadow: 0 4px 10px rgba(8, 145, 178, 0.45);
                cursor: pointer;
                transition: transform 0.15s ease;
              ">
                ${wpBadge}
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -18],
          });

          const wpMarker = L.marker([wp.lat, wp.lng], { icon: wpIcon })
            .bindPopup(`
              <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px; min-width: 200px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 3px;">
                  <span style="font-weight: 800; color: ${wpColor}; font-size: 11px; text-transform: uppercase;">
                    Trạm #${wpBadge} · ${isDone ? 'Đã check-out' : 'Đang ghé thăm'}
                  </span>
                  <span style="background-color: #f1f5f9; color: #475569; padding: 1px 5px; border-radius: 4px; font-size: 10px; font-weight: 700;">
                    ${wp.checkInTime}${wp.checkOutTime ? ` - ${wp.checkOutTime}` : ''}
                  </span>
                </div>
                <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${wp.customerName}</div>
                <div style="color: #64748b; font-size: 11px; margin-top: 2px;">${wp.customerAddress}</div>
                
                <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #e2e8f0; display: flex; flex-direction: column; gap: 2px; font-size: 11px;">
                  <div><b>Mục đích:</b> <span style="color: #0891b2; font-weight: 600;">${wp.purpose}</span></div>
                  ${wp.stayDurationMinutes ? `<div><b>Thời gian lưu:</b> ${wp.stayDurationMinutes} phút</div>` : ''}
                  ${wp.orderAmount ? `<div><b>Doanh số chốt:</b> <span style="color: #10b981; font-weight: 700;">${wp.orderAmount.toLocaleString('vi-VN')} đ</span></div>` : ''}
                  ${wp.notes ? `<div style="color: #475569; font-style: italic; margin-top: 2px;">"${wp.notes}"</div>` : ''}
                </div>
              </div>
            `)
            .addTo(layerGroup);

          wpMarker.on('click', () => {
            if (onSelectWaypoint) onSelectWaypoint(wp);
          });

          allBoundsCoords.push([wp.lat, wp.lng]);
        });
      }

      // 4. Marker Điểm đến / Điểm kết thúc ca (End Destination)
      if (t.endPoint && t.endPoint.lat && t.endPoint.lng) {
        const isFinished = t.status === 'completed';
        const endColor = isFinished ? '#ef4444' : '#8b5cf6'; // Đỏ nếu đã hoàn thành ca, Tím nếu là đích đến của ca
        const endIcon = L.divIcon({
          className: 'custom-route-marker',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background-color: ${endColor};
              color: #ffffff;
              border: 2.5px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              box-shadow: 0 3px 8px ${isFinished ? 'rgba(239, 68, 68, 0.45)' : 'rgba(139, 92, 246, 0.55)'};
              cursor: pointer;
            ">
              <span style="line-height: 1;">${isFinished ? '🏁' : '🎯'}</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        L.marker([t.endPoint.lat, t.endPoint.lng], { icon: endIcon })
          .bindPopup(`
            <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
              <div style="font-weight: 800; color: ${endColor}; text-transform: uppercase; margin-bottom: 2px; font-size: 11px;">
                ${isFinished ? `🏁 Kết thúc ca tuyến (${t.endTime || ''})` : '🎯 Điểm đến dự kiến kết thúc ca'}
              </div>
              <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${t.endPoint.name}</div>
              <div style="color: #64748b; font-size: 11.5px; margin-top: 2px;">${t.endPoint.address}</div>
              ${isFinished && t.totalDistanceKm ? `
                <div style="margin-top: 4px; font-size: 11px; color: #0891b2; font-weight: 700;">
                  Tổng: ${t.totalDistanceKm} km · ${Math.round((t.totalDurationMinutes || 0) / 60)}h${(t.totalDurationMinutes || 0) % 60}p
                </div>
              ` : ''}
            </div>
          `)
          .addTo(layerGroup);

        allBoundsCoords.push([t.endPoint.lat, t.endPoint.lng]);
      }
    });

    // 5. Marker vị trí GPS thực tế của thiết bị người dùng (Pulse radar) - Luôn hiển thị khi có tọa độ
    if (deviceLocation && deviceLocation.lat && deviceLocation.lng) {
      const deviceIcon = L.divIcon({
        className: 'device-gps-marker',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
            <!-- Radar pulsing animation -->
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(2, 132, 199, 0.28); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(56, 189, 248, 0.35);"></div>
            <!-- Chấm tâm màu xanh biển nổi bật viền trắng 3D -->
            <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #0284c7; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(2,132,199,0.85); display: flex; align-items: center; justify-content: center; z-index: 2;">
              <div style="width: 7px; height: 7px; border-radius: 50%; background: #ffffff;"></div>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -20],
      });

      // Vòng tròn độ chính xác định vị
      L.circle([deviceLocation.lat, deviceLocation.lng], {
        radius: 40,
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(layerGroup);

      const devMarker = L.marker([deviceLocation.lat, deviceLocation.lng], {
        icon: deviceIcon,
        zIndexOffset: 1500,
      })
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px; min-width: 190px;">
            <div style="font-weight: 800; color: #0284c7; text-transform: uppercase; font-size: 11px;">
              📍 Vị trí thiết bị của bạn (GPS)
            </div>
            <div style="color: #1e293b; font-size: 12px; margin-top: 3px; font-weight: 600;">
              ${deviceLocation.address || 'Vị trí hiện tại'}
            </div>
            <div style="font-family: monospace; font-size: 10.5px; color: #64748b; margin-top: 3px; background: #f8fafc; padding: 2px 4px; border-radius: 4px; border: 1px solid #e2e8f0;">
              ${deviceLocation.lat.toFixed(6)}, ${deviceLocation.lng.toFixed(6)}
            </div>
          </div>
        `)
        .addTo(layerGroup);
      deviceMarkerRef.current = devMarker;

      if (tripsToRender.length === 0) {
        allBoundsCoords.push([deviceLocation.lat, deviceLocation.lng]);
        map.setView([deviceLocation.lat, deviceLocation.lng], 16);
      }
    }

    // Tự động thu phóng (fit bounds) vừa khít tuyến đường
    if (tripsToRender.length > 0 && allBoundsCoords.length > 0) {
      try {
        const bounds = L.latLngBounds(allBoundsCoords);
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
      } catch (err) {
        console.warn('Could not fit map bounds:', err);
      }
    }
  }, [trip, allTrips, deviceLocation, onSelectWaypoint]);

  // Bay tới vị trí GPS của thiết bị và mở popup vị trí
  const handleFlyToDevice = () => {
    if (onRefreshLocation) {
      onRefreshLocation();
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    if (deviceLocation && deviceLocation.lat && deviceLocation.lng) {
      map.flyTo([deviceLocation.lat, deviceLocation.lng], 16, { duration: 1.2 });
      setTimeout(() => {
        if (deviceMarkerRef.current) {
          deviceMarkerRef.current.openPopup();
        }
      }, 500);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          map.flyTo([lat, lng], 16, { duration: 1.2 });
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  };

  // Căn lại bản đồ vào giữa
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !trip) return;
    if (trip.pathCoordinates && trip.pathCoordinates.length > 0) {
      const bounds = L.latLngBounds(trip.pathCoordinates);
      mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    }
  };

  return (
    <div
      className={`relative w-full h-full min-h-[450px] rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs ${className}`}
      style={style}
    >
      {/* CSS đảm bảo icon GPS & Marker không bị Leaflet thêm viền trắng */}
      <style>{`
        .device-gps-marker,
        .custom-planned-marker,
        .custom-route-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '450px', zIndex: 1 }} />

      {/* Cụm nút thao tác nhanh góc trên bên trái */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className="bg-white/95 hover:bg-white text-slate-700 hover:text-cyan-700 py-1.5 px-2.5 rounded-lg border border-slate-200/90 shadow-xs text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-all cursor-pointer"
          title="Thu phóng vừa khít tuyến đường"
        >
          <i className="bi bi-arrows-fullscreen text-xs" />
          <span>Vừa khung tuyến</span>
        </button>

        <button
          type="button"
          onClick={handleFlyToDevice}
          className="bg-white/95 hover:bg-white text-sky-700 hover:text-sky-800 py-1.5 px-2.5 rounded-lg border border-sky-200 shadow-xs text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-all cursor-pointer"
          title="Định vị vị trí GPS của bạn trên bản đồ"
        >
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          <span>Vị trí của tôi</span>
        </button>
      </div>

      {/* Floating Info Badge góc dưới bên trái */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs py-1.5 px-3 rounded-lg border border-slate-200/90 shadow-sm text-[11px] text-slate-700 flex items-center gap-2.5 flex-wrap max-w-full">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Xuất phát</span>
        </div>
        <div className="flex items-center gap-1.5 text-indigo-600 font-bold border-l border-slate-200 pl-2.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-indigo-600 shrink-0" />
          <span>Tuyến đã chốt</span>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-700 font-bold border-l border-slate-200 pl-2.5">
          <span className="w-3.5 h-1 rounded-full bg-cyan-600 shrink-0" />
          <span>Trùng tuyến chốt</span>
        </div>
        <div className="flex items-center gap-1.5 text-rose-600 font-bold border-l border-slate-200 pl-2.5">
          <span className="w-3.5 h-1 rounded-full bg-rose-500 shrink-0" />
          <span>Khác tuyến chốt (Lệch)</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold border-l border-slate-200 pl-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
          <span>Kết thúc</span>
        </div>
        {deviceLocation && (
          <div className="hidden md:flex items-center gap-1.5 text-sky-700 font-bold border-l border-slate-200 pl-2.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>GPS thiết bị</span>
          </div>
        )}
      </div>
    </div>
  );
};
