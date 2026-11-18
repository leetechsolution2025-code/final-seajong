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

      // Thêm lớp bản đồ OpenStreetMap chuẩn tiếng Việt / Quốc tế
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Đặt zoom control góc trên bên phải
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Group chứa các marker và đường nối
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
      const polyWeight = isSelected ? 4 : 2.5;
      const polyOpacity = isSelected ? 0.9 : 0.5;

      // 1. Vẽ Polyline vệt đường di chuyển
      if (t.pathCoordinates && t.pathCoordinates.length >= 2) {
        const polyline = L.polyline(t.pathCoordinates, {
          color: polyColor,
          weight: polyWeight,
          opacity: polyOpacity,
          lineJoin: 'round',
          dashArray: t.status === 'in_progress' ? '8, 8' : undefined,
        }).addTo(layerGroup);

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

        const startMarker = L.marker([t.startPoint.lat, t.startPoint.lng], { icon: startIcon })
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
                width: 30px;
                height: 30px;
                background-color: ${wpColor};
                color: #ffffff;
                border: 2px solid #ffffff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 12px;
                box-shadow: 0 3px 8px rgba(8, 145, 178, 0.4);
                cursor: pointer;
                transition: transform 0.15s ease;
              ">
                ${wpBadge}
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -16],
          });

          const wpMarker = L.marker([wp.lat, wp.lng], { icon: wpIcon })
            .bindPopup(`
              <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px; min-width: 190px;">
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

    // Tự động thu phóng (fit bounds) để nhìn thấy trọn vẹn toàn bộ các điểm
    if (allBoundsCoords.length > 0) {
      try {
        const bounds = L.latLngBounds(allBoundsCoords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch (err) {
        console.warn('Could not fit map bounds:', err);
      }
    }
  }, [trip, allTrips, onSelectWaypoint]);

  return (
    <div
      className={`relative w-full h-full min-h-[380px] rounded-xl overflow-hidden border border-slate-200 shadow-2xs ${className}`}
      style={style}
    >
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '380px', zIndex: 1 }} />

      {/* Floating Info Badge góc dưới bên trái */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs py-1.5 px-3 rounded-lg border border-slate-200/90 shadow-sm text-[11px] text-slate-700 flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Xuất phát</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 shrink-0" />
          <span>Điểm ghé đại lý</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
          <span>Kết thúc</span>
        </div>
      </div>
    </div>
  );
};
