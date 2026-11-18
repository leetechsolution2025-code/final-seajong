import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteTrip, RouteWaypoint } from '../../services/routeService';

interface SalesRouteMapProps {
  trip: RouteTrip | null;
  allTrips?: RouteTrip[];
  className?: string;
  style?: React.CSSProperties;
  onSelectWaypoint?: (wp: RouteWaypoint) => void;
  onRefreshLocation?: () => void;
}

export const SalesRouteMap: React.FC<SalesRouteMapProps> = ({
  trip,
  allTrips = [],
  className = '',
  style,
  onSelectWaypoint,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

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
    if (tripsToRender.length === 0) return;

    const allBoundsCoords: L.LatLngExpression[] = [];

    tripsToRender.forEach((t) => {
      const isSelected = trip?.id === t.id;
      const polyColor = isSelected ? '#0891b2' : '#94a3b8';

      // 1. Vẽ Polyline vệt đường di chuyển uốn lượn theo mặt đường thực tế
      if (t.pathCoordinates && t.pathCoordinates.length >= 2) {
        if (isSelected) {
          // Lớp viền mờ dưới (Glow effect)
          L.polyline(t.pathCoordinates, {
            color: '#0891b2',
            weight: 9,
            opacity: 0.2,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(layerGroup);

          // Lớp nét đường chính uốn theo lòng đường giao thông
          L.polyline(t.pathCoordinates, {
            color: '#0891b2',
            weight: 4.5,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(layerGroup);
        } else {
          // Tuyến phụ không chọn
          L.polyline(t.pathCoordinates, {
            color: polyColor,
            weight: 3,
            opacity: 0.45,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(layerGroup);
        }

        t.pathCoordinates.forEach((c) => allBoundsCoords.push(c));
      }

      // 2. Marker Điểm xuất phát (Start)
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

      // 4. Marker Điểm kết thúc (End) nếu đã hoàn thành
      if (t.endPoint && t.endPoint.lat && t.endPoint.lng && t.status === 'completed') {
        const endIcon = L.divIcon({
          className: 'custom-route-marker',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background-color: #ef4444;
              color: #ffffff;
              border: 2.5px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
              cursor: pointer;
            ">
              <span style="line-height: 1;">🏁</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        L.marker([t.endPoint.lat, t.endPoint.lng], { icon: endIcon })
          .bindPopup(`
            <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
              <div style="font-weight: 800; color: #ef4444; text-transform: uppercase; margin-bottom: 2px; font-size: 11px;">
                🏁 Kết thúc ca tuyến (${t.endTime || ''})
              </div>
              <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${t.endPoint.name}</div>
              <div style="color: #64748b; font-size: 11.5px; margin-top: 2px;">${t.endPoint.address}</div>
              <div style="margin-top: 4px; font-size: 11px; color: #0891b2; font-weight: 700;">
                Tổng: ${t.totalDistanceKm} km · ${Math.round(t.totalDurationMinutes / 60)}h${t.totalDurationMinutes % 60}p
              </div>
            </div>
          `)
          .addTo(layerGroup);

        allBoundsCoords.push([t.endPoint.lat, t.endPoint.lng]);
      }
    });

    // Tự động thu phóng (fit bounds) vừa khít tuyến đường
    if (allBoundsCoords.length > 0) {
      try {
        const bounds = L.latLngBounds(allBoundsCoords);
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
      } catch (err) {
        console.warn('Could not fit map bounds:', err);
      }
    }
  }, [trip, allTrips, onSelectWaypoint]);

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
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '450px', zIndex: 1 }} />

      {/* Nút căn giữa nhanh góc trên bên trái */}
      <div className="absolute top-3 left-3 z-[400]">
        <button
          type="button"
          onClick={handleRecenter}
          className="bg-white/95 hover:bg-white text-slate-700 hover:text-cyan-700 py-1.5 px-2.5 rounded-lg border border-slate-200/90 shadow-xs text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-all cursor-pointer"
          title="Thu phóng vừa khít tuyến đường"
        >
          <i className="bi bi-arrows-fullscreen text-xs" />
          <span>Vừa khung tuyến</span>
        </button>
      </div>

      {/* Floating Info Badge góc dưới bên trái */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs py-1.5 px-3 rounded-lg border border-slate-200/90 shadow-sm text-[11px] text-slate-700 flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Xuất phát</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 shrink-0" />
          <span>Điểm ghé đại lý (1, 2, 3...)</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
          <span>Kết thúc</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-cyan-700 font-bold border-l border-slate-200 pl-3">
          <span className="w-4 h-1 rounded-full bg-cyan-600 shrink-0" />
          <span>Lòng đường thực tế</span>
        </div>
      </div>
    </div>
  );
};
