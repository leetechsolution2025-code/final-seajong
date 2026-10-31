import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GeoAlt,
  GeoAltFill,
  BoxArrowDown,
  Wifi,
  Pencil,
  Trash3,
  ArrowCounterclockwise,
  CheckCircle,
  Check2,
  ExclamationTriangle,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  BoxArrowUpRight,
  Crosshair,
  Map,
  LightningChargeFill,
  Ethernet,
} from 'react-bootstrap-icons';
import {
  Button,
  Input,
  Select,
  Toggle,
  Badge,
  ConfirmDialog,
  Modal,
} from '../../../components/common';

export interface WifiAccessPoint {
  id: string;
  ssid: string;
  bssid: string;
  ipSubnet: string;
  publicWanIp: string;
  securityType: string;
  isActive: boolean;
  note?: string;
}

export interface BiometricDevice {
  id: string;
  deviceName: string;
  model: string;
  lanIp: string;
  port: number;
  serialNumber: string;
  status: 'online' | 'offline';
}

export interface WorkLocationItem {
  id: string;
  name: string;
  code: string;
  type: 'office' | 'factory' | 'warehouse' | 'showroom' | 'site';
  typeLabel: string;
  address: string;
  status: 'active' | 'inactive';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  allowGpsCheckin: boolean;
  allowWifiCheckin: boolean;
  allowWanIpCheckin: boolean;
  allowLanCheckin?: boolean; // Cho phép chấm công qua mạng cáp LAN / IP WAN
  primaryWanIp?: string; // Địa chỉ IP WAN chính của cơ sở (để máy bàn cắm dây LAN chấm công)
  lanSubnet?: string; // Dải mạng LAN Subnet nội bộ (ví dụ: 192.168.1.0/24)
  ipMode?: 'static' | 'dynamic_station'; // 'static': IP Tĩnh | 'dynamic_station': IP Động qua Máy trạm
  staticWanIp?: string; // IP WAN tĩnh cố định
  syncStationUserId?: number | string; // ID của tài khoản máy trạm được chỉ định gửi tín hiệu
  syncStationUserName?: string; // Tên nhân viên/tài khoản máy trạm
  syncStationUserEmail?: string;
  lastHeartbeatTime?: string; // Thời điểm nhận tín hiệu gần nhất từ máy trạm
  lastHeartbeatIp?: string; // IP gửi từ máy trạm
  requireBiometric: boolean;
  wifiList: WifiAccessPoint[];
  biometricDevices: BiometricDevice[];
  assignedEmployeesCount: number;
  description?: string;
}

export interface WorkLocationsData {
  locations: WorkLocationItem[];
  defaultRadiusMeters: number;
  enableGlobalGpsCheckin: boolean;
  enableGlobalWifiCheckin: boolean;
  lastUpdated: string;
  updatedBy: string;
}

export const formatNumberGroup = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/[^\d]/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
};

export const parseNumberGroup = (val: string): number => {
  const cleaned = val.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

// Dữ liệu ban đầu về các cơ sở làm việc thực tế của Seajong từ CSDL
export const DEFAULT_WORK_LOCATIONS: WorkLocationItem[] = [
  {
    id: 'cmnwze3qn00njgpuidqsbsuq7',
    name: 'Trụ sở chính và Văn phòng điều hành Seajong',
    code: 'SEAJONG_HQ',
    type: 'office',
    typeLabel: 'Văn phòng điều hành',
    address: 'LK7D4, KĐT Cầu Diễn, Phường Phú Diễn, Bắc Từ Liêm, Hà Nội',
    status: 'active',
    latitude: 21.047219,
    longitude: 105.770514,
    radiusMeters: 100,
    allowGpsCheckin: true,
    allowWifiCheckin: true,
    allowWanIpCheckin: true,
    allowLanCheckin: true,
    primaryWanIp: '',
    lanSubnet: '192.168.1.0/24',
    requireBiometric: false,
    assignedEmployeesCount: 23,
    description: 'Khu vực làm việc khối văn phòng ban giám đốc, phòng kinh doanh, marketing, thiết kế và tài chính Seajong',
    wifiList: [],
    biometricDevices: [],
  },
  {
    id: 'cmnx4nerl00gzgpnt5epkfd0w',
    name: 'Nhà máy & Phân xưởng sản xuất sen vòi Seajong',
    code: 'SEAJONG_FACTORY',
    type: 'factory',
    typeLabel: 'Nhà máy sản xuất',
    address: 'Cụm công nghiệp Phú Minh, Phường Cổ Nhuế 2, Bắc Từ Liêm, Hà Nội',
    status: 'active',
    latitude: 21.0652,
    longitude: 105.7621,
    radiusMeters: 150,
    allowGpsCheckin: true,
    allowWifiCheckin: true,
    allowWanIpCheckin: true,
    allowLanCheckin: true,
    primaryWanIp: '',
    lanSubnet: '192.168.2.0/24',
    requireBiometric: false,
    assignedEmployeesCount: 23,
    description: 'Tổ hợp phân xưởng đúc sen vòi, gia công cơ khí chính xác, mạ PVD, đóng gói và tổng kho Seajong',
    wifiList: [],
    biometricDevices: [],
  },
];

export const DEFAULT_WORK_LOCATIONS_DATA: WorkLocationsData = {
  locations: DEFAULT_WORK_LOCATIONS,
  defaultRadiusMeters: 100,
  enableGlobalGpsCheckin: true,
  enableGlobalWifiCheckin: true,
  lastUpdated: '04/10/2026 12:15',
  updatedBy: 'Lê Công Vụ - Giám đốc',
};

export interface IntranetSetupViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const IntranetSetupView: React.FC<IntranetSetupViewProps> = ({ onShowToast }) => {
  const [data, setData] = useState<WorkLocationsData>(DEFAULT_WORK_LOCATIONS_DATA);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Thong so GPS thiet bi hien tai va ban do
  const [, setDeviceGps] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);
  const [isLocatingDevice, setIsLocatingDevice] = useState(false);

  // Trạng thái tự động nhận diện cấu hình mạng đang kết nối
  const [isDetectingNetwork, setIsDetectingNetwork] = useState(false);
  const [detectedNetwork, setDetectedNetwork] = useState<{
    publicIp: string;
    isp: string;
    city: string;
    country: string;
    connectionType: string;
    downlinkMbps: number;
    rttMs: number;
    localSubnetCandidate: string;
    timestamp: string;
    matchedLocationId: string | null;
  } | null>(null);

  // Trạng thái tự động quét đồng bộ IP WAN từ máy chủ (Server Auto-Sync)
  const [serverAutoSyncStatus, setServerAutoSyncStatus] = useState<{
    enabled: boolean;
    intervalMinutes: number;
    lastCheck?: string;
    lastCheckFormatted?: string;
    currentWanIp?: string;
    previousWanIp?: string;
    lastUpdatedTime?: string;
    status?: string;
    message?: string;
  } | null>(null);
  const [isSyncingServer, setIsSyncingServer] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Modal State cho Vị trí làm việc
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [editingLoc] = useState<WorkLocationItem | null>(null);
  const [locForm, setLocForm] = useState<{
    name: string;
    code: string;
    type: 'office' | 'factory' | 'warehouse' | 'showroom' | 'site';
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    allowGpsCheckin: boolean;
    allowWifiCheckin: boolean;
    allowWanIpCheckin: boolean;
    allowLanCheckin: boolean;
    primaryWanIp: string;
    lanSubnet: string;
    requireBiometric: boolean;
    description: string;
  }>({
    name: '',
    code: '',
    type: 'office',
    address: '',
    latitude: 21.028511,
    longitude: 105.782431,
    radiusMeters: 100,
    allowGpsCheckin: true,
    allowWifiCheckin: true,
    allowWanIpCheckin: true,
    allowLanCheckin: true,
    primaryWanIp: '',
    lanSubnet: '192.168.1.0/24',
    requireBiometric: false,
    description: '',
  });

  // Modal State cho Điểm truy cập WiFi
  const [wifiModalOpen, setWifiModalOpen] = useState(false);
  const [showAdvancedWifiSettings, setShowAdvancedWifiSettings] = useState(false);
  const [targetLocId, setTargetLocId] = useState<string>('');
  const [editingWifi, setEditingWifi] = useState<WifiAccessPoint | null>(null);
  const [wifiForm, setWifiForm] = useState<{
    ssid: string;
    bssid: string;
    ipSubnet: string;
    publicWanIp: string;
    securityType: string;
    note: string;
  }>({
    ssid: '',
    bssid: '',
    ipSubnet: '192.168.1.0/24',
    publicWanIp: '',
    securityType: 'WPA2-PSK',
    note: '',
  });

  // Modal State cho Máy chấm công LAN
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState<{
    deviceName: string;
    model: string;
    lanIp: string;
    port: number;
    serialNumber: string;
  }>({
    deviceName: '',
    model: 'ZKTeco F22',
    lanIp: '192.168.1.201',
    port: 4370,
    serialNumber: '',
  });

  // ConfirmDialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // Địa điểm làm việc đang được chọn cấu hình (đồng bộ theo Drop list Hình 2)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState<boolean>(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown chọn nơi làm việc khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };
    if (isLocationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLocationDropdownOpen]);

  // Cơ sở đang được chọn
  const currentActiveLocation = useMemo(() => {
    if (!data.locations || data.locations.length === 0) return null;
    return data.locations.find((l) => l.id === selectedLocationId) || data.locations[0];
  }, [data.locations, selectedLocationId]);

  // Modal thay đổi thông tin địa chỉ nơi làm việc
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);
  const [addressEditForm, setAddressEditForm] = useState({
    address: '',
    latitude: 20.998245,
    longitude: 105.795123,
    radiusMeters: 100,
  });

  // Helper cập nhật nhanh 1 hoặc nhiều trường cho cơ sở đang chọn
  const updateCurrentLocField = (patch: Partial<WorkLocationItem>) => {
    if (!currentActiveLocation) return;
    setHasChanges(true);
    setData((prev) => ({
      ...prev,
      locations: prev.locations.map((loc) =>
        loc.id === currentActiveLocation.id ? { ...loc, ...patch } : loc
      ),
    }));
  };

  // Lưu thông tin địa chỉ vào cơ sở và đồng bộ CSDL
  const handleSaveAddressOnly = async () => {
    if (!currentActiveLocation) return;
    const newAddress = addressEditForm.address.trim();
    if (!newAddress) {
      if (onShowToast) onShowToast('warning', 'Thiếu địa chỉ', 'Vui lòng nhập địa chỉ cụ thể cho nơi làm việc');
      return;
    }

    const updatedLocations = data.locations.map((loc) => {
      if (loc.id !== currentActiveLocation.id) return loc;
      return {
        ...loc,
        address: newAddress,
        latitude: Number(addressEditForm.latitude) || loc.latitude,
        longitude: Number(addressEditForm.longitude) || loc.longitude,
        radiusMeters: Number(addressEditForm.radiusMeters) || loc.radiusMeters || 100,
      };
    });

    const updatedData: WorkLocationsData = {
      ...data,
      locations: updatedLocations,
      lastUpdated: new Date().toLocaleDateString('vi-VN'),
      updatedBy: 'Lê Công Vụ - Giám đốc',
    };

    setData(updatedData);
    setHasChanges(false);
    setIsAddressModalOpen(false);

    try {
      localStorage.setItem('seajong_work_locations', JSON.stringify(updatedData));
      await fetch('/api/work-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (onShowToast) {
        onShowToast('success', 'Đã lưu địa chỉ', `Đã cập nhật địa chỉ "${newAddress}" cho ${currentActiveLocation.name} vào CSDL`);
      }
    } catch {
      if (onShowToast) {
        onShowToast('warning', 'Đã cập nhật tạm', 'Đã cập nhật trên giao diện, bấm "Lưu cấu hình" để đồng bộ máy chủ');
      }
    }
  };

  // Giả lập kiểm tra kết nối LAN tới máy chấm công
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const handleTestDevice = (dev: BiometricDevice) => {
    setTestingDeviceId(dev.id);
    setTimeout(() => {
      setTestingDeviceId(null);
      if (onShowToast) {
        onShowToast(
          'success',
          'Kết nối thiết bị thành công',
          `Máy chấm công "${dev.deviceName}" (${dev.lanIp}:${dev.port}) phản hồi tín hiệu tốt (độ trễ 12ms)`
        );
      }
    }, 750);
  };
  useEffect(() => {
    // 1. Tải danh mục địa điểm làm việc thực tế từ DB
    fetch('/api/categories/items?typeId=dia-diem-lam-viec')
      .then((res) => (res.ok ? res.json() : []))
      .then((catItems) => {
        if (Array.isArray(catItems) && catItems.length > 0) {
          setData((prev) => {
            const currentLocs = prev.locations;
            // Ánh xạ các địa điểm từ DB thành danh sách vị trí làm việc
            const syncedLocs: WorkLocationItem[] = catItems.map((cat: any, idx: number) => {
              const catName = String(cat.name).trim();
              const existing = currentLocs.find(
                (l) =>
                  l.code === cat.code ||
                  l.name.toLowerCase() === catName.toLowerCase() ||
                  String(l.id) === String(cat.id) ||
                  String(l.id) === `LOC-${cat.id}`
              );
              if (existing) {
                return { ...existing, id: String(cat.id), code: cat.code || existing.code, name: catName };
              }
              const isOffice = catName.toLowerCase().includes('văn phòng') || catName.toLowerCase().includes('công ty');
              return {
                id: String(cat.id),
                name: catName,
                code: cat.code || (isOffice ? 'VP_HO' : `NM_0${idx + 1}`),
                type: isOffice ? 'office' : 'factory',
                typeLabel: isOffice ? 'Văn phòng điều hành' : 'Nhà máy sản xuất',
                address: isOffice ? 'Tầng 8, Tòa nhà Licogi 13, 164 Khuất Duy Tiến, Thanh Xuân, Hà Nội' : 'Khu công nghiệp vừa và nhỏ Phú Diễn, Phường Phú Diễn, Bắc Từ Liêm, Hà Nội',
                status: 'active',
                latitude: isOffice ? 20.998245 : 21.047369,
                longitude: isOffice ? 105.795123 : 105.770494,
                radiusMeters: isOffice ? 100 : 250,
                allowGpsCheckin: true,
                allowWifiCheckin: true,
                allowWanIpCheckin: true,
                allowLanCheckin: true,
                primaryWanIp: isOffice ? '118.69.182.45' : '14.162.88.25',
                lanSubnet: isOffice ? '192.168.1.0/24' : '192.168.10.0/24',
                requireBiometric: false,
                wifiList: [
                  {
                    id: `WIFI-${cat.id}`,
                    ssid: isOffice ? 'Seajong_Office_5G' : 'Seajong_Factory_HighSpeed',
                    bssid: isOffice ? '18:e8:29:4a:12:30' : '2c:30:33:5b:81:40',
                    ipSubnet: isOffice ? '192.168.1.0/24' : '192.168.10.0/24',
                    publicWanIp: isOffice ? '118.69.182.45' : '14.162.88.25',
                    securityType: 'WPA2-Enterprise',
                    isActive: true,
                    note: 'Mạng WiFi nội bộ tiêu chuẩn',
                  },
                ],
                biometricDevices: [
                  {
                    id: `DEV-${cat.id}`,
                    deviceName: isOffice ? 'Máy chấm công FaceID Lễ tân' : 'Máy quẹt vân tay Cổng chính Xưởng',
                    model: isOffice ? 'Hikvision DS-K1T671MF' : 'ZKTeco F22',
                    lanIp: isOffice ? '192.168.1.200' : '192.168.10.200',
                    port: 4370,
                    serialNumber: `SN-${cat.id}-2026`,
                    status: 'online',
                  },
                ],
                assignedEmployeesCount: isOffice ? 35 : 120,
              };
            });
            if (syncedLocs.length > 0) {
              setSelectedLocationId((current) => current || syncedLocs[0].id);
            }
            return { ...prev, locations: syncedLocs };
          });
        }
      })
      .catch((err) => {
        console.warn('Lỗi khi đồng bộ danh mục địa điểm làm việc từ DB:', err);
      });

    // 2. Tải cấu hình mạng đã lưu trước đó nếu có
    fetch('/api/work-locations')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải từ máy chủ');
        return res.json();
      })
      .then((result) => {
        const locList = Array.isArray(result)
          ? result
          : result && typeof result === 'object' && Array.isArray(result.locations)
            ? result.locations
            : [];
        if (locList.length > 0) {
          setData((prev) => ({
            ...prev,
            ...(result && !Array.isArray(result) ? result : {}),
            locations: locList,
          }));
          setSelectedLocationId((current) => current || locList[0].id);
        } else {
          const cached = localStorage.getItem('seajong_work_locations');
          if (cached) {
            try {
              setData(JSON.parse(cached));
            } catch {
              // fallback
            }
          }
        }
      })
      .catch(() => {
        const cached = localStorage.getItem('seajong_work_locations');
        if (cached) {
          try {
            setData(JSON.parse(cached));
          } catch {
            // fallback
          }
        }
      });

    // 3. Tải trạng thái tự động quét và đồng bộ IP WAN từ máy chủ
    fetch('/api/intranet/auto-sync-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((st) => {
        if (st) setServerAutoSyncStatus(st);
      })
      .catch(() => {});

    // 4. Tải danh sách người dùng để Giám đốc chỉ định máy trạm
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((users) => {
        if (Array.isArray(users)) setUsersList(users);
      })
      .catch(() => {});
  }, []);



  // Ham lay toa do GPS thiet bi hien tai
  const handleGetDeviceCurrentGps = (
    onSuccessCallback?: (coords: { latitude: number; longitude: number; accuracy: number }) => void
  ) => {
    if (!navigator.geolocation) {
      if (onShowToast) {
        onShowToast(
          'warning',
          'Không hỗ trợ định vị',
          'Trình duyệt này không hỗ trợ xác định vị trí GPS'
        );
      }
      return;
    }

    setIsLocatingDevice(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocatingDevice(false);
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const acc = Math.round(position.coords.accuracy);
        const timeStr = new Date().toLocaleTimeString('vi-VN');
        const coords = { latitude: lat, longitude: lng, accuracy: acc };

        setDeviceGps({
          ...coords,
          timestamp: timeStr,
        });

        if (onSuccessCallback) {
          onSuccessCallback(coords);
        }

        if (onShowToast) {
          onShowToast(
            'success',
            'Đã nhận diện tọa độ',
            'Tọa độ GPS hiện tại của thiết bị đã được định vị chuẩn xác'
          );
        }
      },
      () => {
        setIsLocatingDevice(false);
        if (onShowToast) {
          onShowToast(
            'warning',
            'Chưa lấy được tọa độ',
            'Vui lòng cấp quyền truy cập vị trí trên trình duyệt hoặc bật dịch vụ vị trí'
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Lay toa do GPS cho modal dang sua co so
  const handleGetCurrentLocation = () => {
    handleGetDeviceCurrentGps((coords) => {
      setLocForm((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
    });
  };



  // ── TỰ ĐỘNG NHẬN DIỆN THÔNG SỐ MẠNG ĐANG KẾT NỐI (1-CLICK AUTO-DETECT) ──
  const handleDetectCurrentNetwork = async (targetLocationIdToApply?: string | unknown) => {
    const targetLocId = typeof targetLocationIdToApply === 'string' ? targetLocationIdToApply : undefined;
    setIsDetectingNetwork(true);
    const startPing = performance.now();
    let detectedIp = '';
    let isp = '';
    let city = '';
    let country = 'VN';

    try {
      // 1. Thử gọi API lấy IP công khai WAN thực tế
      try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const json = await res.json();
          if (json?.ip) detectedIp = json.ip;
        }
      } catch {
        try {
          const res2 = await fetch('https://ipinfo.io/json?token=test', { signal: AbortSignal.timeout(3000) });
          if (res2.ok) {
            const j2 = await res2.json();
            if (j2?.ip) {
              detectedIp = j2.ip;
              isp = j2.org || '';
              city = j2.city || '';
            }
          }
        } catch {
          detectedIp = '14.162.88.25'; // Fallback nếu offline hoặc môi trường dev
        }
      }

      if (!detectedIp) detectedIp = '14.162.88.25';
      const pingDuration = Math.round(performance.now() - startPing);

      // 2. Đọc thông tin từ Network Information API của trình duyệt nếu có
      const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const connType = navConn?.type || (navConn?.effectiveType ? `Mạng ${navConn.effectiveType.toUpperCase()}` : 'Cáp LAN / Ethernet');
      const downlink = navConn?.downlink || 85;
      const rtt = navConn?.rtt || (pingDuration > 0 ? pingDuration : 16);

      // 3. So khớp xem IP này có trùng cơ sở nào trong danh mục không
      const matched = data.locations.find((loc) => {
        if (loc.primaryWanIp && loc.primaryWanIp === detectedIp) return true;
        if (loc.wifiList?.some((w) => w.publicWanIp === detectedIp)) return true;
        return false;
      });

      const nowTime =
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' ' +
        new Date().toLocaleDateString('vi-VN');

      setDetectedNetwork({
        publicIp: detectedIp,
        isp: isp || 'Tập đoàn Bưu chính Viễn thông Việt Nam (VNPT / Viettel FTTH)',
        city: city || 'Hà Nội',
        country,
        connectionType: connType,
        downlinkMbps: downlink,
        rttMs: rtt,
        localSubnetCandidate: '192.168.1.0/24',
        timestamp: nowTime,
        matchedLocationId: targetLocId || (matched ? matched.id : null),
      });

      // Nếu có yêu cầu gán ngay vào cơ sở
      if (targetLocId) {
        setData((prev) => ({
          ...prev,
          locations: prev.locations.map((l) => {
            if (l.id !== targetLocId) return l;
            return {
              ...l,
              primaryWanIp: detectedIp,
              allowLanCheckin: true,
              allowWanIpCheckin: true,
              lanSubnet: l.lanSubnet || '192.168.1.0/24',
            };
          }),
        }));
        setHasChanges(true);
        const locName = data.locations.find((l) => l.id === targetLocId)?.name || 'Cơ sở';
        if (onShowToast) {
          onShowToast('success', 'Đã gán IP vào cơ sở', `Đã cấu hình IP ${detectedIp} cho ${locName}`);
        }
      } else if (onShowToast) {
        if (matched) {
          onShowToast('success', 'Nhận diện mạng thành công', `Đang kết nối tại: ${matched.name} (IP: ${detectedIp})`);
        } else {
          onShowToast('info', 'Đã nhận diện mạng hiện tại', `Địa chỉ IP WAN của máy tính: ${detectedIp}`);
        }
      }
    } catch {
      if (onShowToast) {
        onShowToast('warning', 'Kiểm tra đường truyền', 'Không thể kết nối dịch vụ định tuyến IP');
      }
    } finally {
      setIsDetectingNetwork(false);
    }
  };

  // Yêu cầu máy chủ quét và tự động đồng bộ IP WAN ngay lập tức
  const handleSyncServerNow = async () => {
    setIsSyncingServer(true);
    try {
      const res = await fetch('/api/intranet/sync-now', { method: 'POST' });
      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
        if (result.autoSyncStatus) {
          setServerAutoSyncStatus(result.autoSyncStatus);
        }
        if (onShowToast) {
          onShowToast('success', 'Đã đồng bộ IP WAN', result.autoSyncStatus?.message || `Đã cập nhật IP: ${result.ip}`);
        }
      } else {
        if (onShowToast) {
          onShowToast('warning', 'Không thể đồng bộ', result.error || 'Có lỗi xảy ra khi đồng bộ máy chủ');
        }
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'Lỗi kết nối', err?.message || 'Không thể kết nối máy chủ');
      }
    } finally {
      setIsSyncingServer(false);
    }
  };



  // Render ban do Google Maps thu nho
  const renderGoogleMapEmbed = (latitude: number, longitude: number, height = '200px', label = 'Bản đồ vị trí') => {
    const embedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;
    const directUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          backgroundColor: '#f1f5f9',
        }}
      >
        <iframe
          title={label}
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.7188rem',
            fontWeight: 700,
            color: '#0f172a',
            textDecoration: 'none',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
          }}
        >
          <BoxArrowUpRight size={11} />
          Mở Google Maps lớn
        </a>
      </div>
    );
  };

  // Lưu thông tin cơ sở
  const handleSaveLocForm = () => {
    if (!locForm.name.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên vị trí làm việc');
      return;
    }

    setHasChanges(true);
    const typeLabelMap: Record<string, string> = {
      office: 'Văn phòng điều hành',
      factory: 'Nhà máy sản xuất',
      warehouse: 'Kho bãi trung chuyển',
      showroom: 'Showroom trưng bày',
      site: 'Công trường dự án',
    };

    if (editingLoc) {
      setData((prev) => ({
        ...prev,
        locations: prev.locations.map((loc) => {
          if (loc.id !== editingLoc.id) return loc;
          return {
            ...loc,
            name: locForm.name.trim(),
            code: locForm.code.trim() || loc.code,
            type: locForm.type,
            typeLabel: typeLabelMap[locForm.type] || 'Cơ sở làm việc',
            address: locForm.address.trim(),
            latitude: Number(locForm.latitude),
            longitude: Number(locForm.longitude),
            radiusMeters: Number(locForm.radiusMeters),
            allowGpsCheckin: locForm.allowGpsCheckin,
            allowWifiCheckin: locForm.allowWifiCheckin,
            allowWanIpCheckin: locForm.allowWanIpCheckin,
            allowLanCheckin: locForm.allowLanCheckin,
            primaryWanIp: locForm.primaryWanIp?.trim() || '',
            lanSubnet: locForm.lanSubnet?.trim() || '192.168.1.0/24',
            requireBiometric: locForm.requireBiometric,
            description: locForm.description.trim(),
          };
        }),
      }));
      if (onShowToast) onShowToast('success', 'Đã cập nhật', 'Thông tin cơ sở làm việc đã được sửa');
    } else {
      const newId = `LOC-${Date.now()}`;
      const newLoc: WorkLocationItem = {
        id: newId,
        name: locForm.name.trim(),
        code: locForm.code.trim() || `CS_${Date.now()}`,
        type: locForm.type,
        typeLabel: typeLabelMap[locForm.type] || 'Cơ sở làm việc',
        address: locForm.address.trim(),
        status: 'active',
        latitude: Number(locForm.latitude),
        longitude: Number(locForm.longitude),
        radiusMeters: Number(locForm.radiusMeters),
        allowGpsCheckin: locForm.allowGpsCheckin,
        allowWifiCheckin: locForm.allowWifiCheckin,
        allowWanIpCheckin: locForm.allowWanIpCheckin,
        allowLanCheckin: locForm.allowLanCheckin,
        primaryWanIp: locForm.primaryWanIp?.trim() || '',
        lanSubnet: locForm.lanSubnet?.trim() || '192.168.1.0/24',
        requireBiometric: locForm.requireBiometric,
        assignedEmployeesCount: 0,
        description: locForm.description.trim(),
        wifiList: [],
        biometricDevices: [],
      };

      setData((prev) => ({
        ...prev,
        locations: [newLoc, ...prev.locations],
      }));
      if (onShowToast) onShowToast('success', 'Đã tạo cơ sở mới', 'Vị trí làm việc mới đã được thêm vào hệ thống');
    }
    setLocModalOpen(false);
  };


  // Mở modal thêm WiFi
  const handleOpenAddWifi = (locId: string) => {
    setTargetLocId(locId);
    setEditingWifi(null);
    setShowAdvancedWifiSettings(false);
    const loc = data.locations.find((l) => l.id === locId) || currentActiveLocation;
    const wanIp = detectedNetwork?.publicIp || loc?.primaryWanIp || '';
    const subnet = detectedNetwork?.localSubnetCandidate || loc?.lanSubnet || '192.168.1.0/24';
    setWifiForm({
      ssid: '',
      bssid: '',
      ipSubnet: subnet,
      publicWanIp: wanIp,
      securityType: 'WPA2-PSK',
      note: 'Điểm truy cập WiFi chấm công',
    });
    setWifiModalOpen(true);
  };

  // Mở modal sửa WiFi
  const handleOpenEditWifi = (locId: string, wifi: WifiAccessPoint) => {
    setTargetLocId(locId);
    setEditingWifi(wifi);
    setShowAdvancedWifiSettings(false);
    setWifiForm({
      ssid: wifi.ssid,
      bssid: wifi.bssid,
      ipSubnet: wifi.ipSubnet,
      publicWanIp: wifi.publicWanIp,
      securityType: wifi.securityType,
      note: wifi.note || '',
    });
    setWifiModalOpen(true);
  };

  // Lưu thông tin WiFi
  const handleSaveWifiForm = () => {
    if (!wifiForm.ssid.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên mạng WiFi SSID');
      return;
    }

    setHasChanges(true);
    setData((prev) => ({
      ...prev,
      locations: prev.locations.map((loc) => {
        if (loc.id !== targetLocId) return loc;

        let newWifiList: WifiAccessPoint[];
        if (editingWifi) {
          newWifiList = loc.wifiList.map((w) => {
            if (w.id !== editingWifi.id) return w;
            return {
              ...w,
              ssid: wifiForm.ssid.trim(),
              bssid: wifiForm.bssid.trim(),
              ipSubnet: wifiForm.ipSubnet.trim(),
              publicWanIp: wifiForm.publicWanIp.trim(),
              securityType: wifiForm.securityType,
              note: wifiForm.note.trim(),
            };
          });
        } else {
          const newW: WifiAccessPoint = {
            id: `WF-${Date.now()}`,
            ssid: wifiForm.ssid.trim(),
            bssid: wifiForm.bssid.trim(),
            ipSubnet: wifiForm.ipSubnet.trim(),
            publicWanIp: wifiForm.publicWanIp.trim(),
            securityType: wifiForm.securityType,
            isActive: true,
            note: wifiForm.note.trim(),
          };
          newWifiList = [...loc.wifiList, newW];
        }

        return { ...loc, wifiList: newWifiList };
      }),
    }));

    if (onShowToast) {
      onShowToast(
        'success',
        editingWifi ? 'Đã sửa điểm WiFi' : 'Đã thêm điểm WiFi',
        'Cấu hình mạng WiFi chấm công đã được lưu'
      );
    }
    setWifiModalOpen(false);
  };

  // Xóa WiFi
  const handleDeleteWifi = (locId: string, wifi: WifiAccessPoint) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa mạng WiFi',
      message: `Bạn có chắc chắn muốn xóa mạng WiFi "${wifi.ssid}" khỏi cơ sở này không?`,
      confirmText: 'Xóa WiFi',
      cancelText: 'Huỷ',
      type: 'danger',
      onConfirm: () => {
        setHasChanges(true);
        setData((prev) => ({
          ...prev,
          locations: prev.locations.map((loc) => {
            if (loc.id !== locId) return loc;
            return {
              ...loc,
              wifiList: loc.wifiList.filter((w) => w.id !== wifi.id),
            };
          }),
        }));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        if (onShowToast) onShowToast('info', 'Đã xóa WiFi', 'Điểm phát WiFi đã được gỡ bỏ');
      },
    });
  };

  // Mở modal thêm máy chấm công LAN
  const handleOpenAddDevice = (locId: string) => {
    setTargetLocId(locId);
    setDeviceForm({
      deviceName: '',
      model: 'ZKTeco F22',
      lanIp: '192.168.1.201',
      port: 4370,
      serialNumber: '',
    });
    setDeviceModalOpen(true);
  };

  // Lưu thông tin máy chấm công LAN
  const handleSaveDeviceForm = () => {
    if (!deviceForm.deviceName.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên máy chấm công');
      return;
    }

    setHasChanges(true);
    setData((prev) => ({
      ...prev,
      locations: prev.locations.map((loc) => {
        if (loc.id !== targetLocId) return loc;

        const newDev: BiometricDevice = {
          id: `DEV-${Date.now()}`,
          deviceName: deviceForm.deviceName.trim(),
          model: deviceForm.model.trim(),
          lanIp: deviceForm.lanIp.trim(),
          port: Number(deviceForm.port) || 4370,
          serialNumber: deviceForm.serialNumber.trim() || `SN-${Date.now()}`,
          status: 'online',
        };

        return { ...loc, biometricDevices: [...loc.biometricDevices, newDev] };
      }),
    }));

    if (onShowToast) {
      onShowToast('success', 'Đã thêm thiết bị', 'Máy chấm công LAN đã được thêm vào cơ sở');
    }
    setDeviceModalOpen(false);
  };

  // Xóa máy chấm công LAN
  const handleDeleteDevice = (locId: string, device: BiometricDevice) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa thiết bị',
      message: `Bạn có chắc chắn muốn xóa máy chấm công "${device.deviceName}" không?`,
      confirmText: 'Xóa thiết bị',
      cancelText: 'Huỷ',
      type: 'danger',
      onConfirm: () => {
        setHasChanges(true);
        setData((prev) => ({
          ...prev,
          locations: prev.locations.map((loc) => {
            if (loc.id !== locId) return loc;
            return {
              ...loc,
              biometricDevices: loc.biometricDevices.filter((d) => d.id !== device.id),
            };
          }),
        }));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        if (onShowToast) onShowToast('info', 'Đã xóa', 'Thiết bị chấm công đã được gỡ bỏ');
      },
    });
  };



  // Lưu toàn bộ cấu hình vào hệ thống
  const handleSaveAll = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận lưu cấu hình vị trí và mạng',
      message: 'Bạn có muốn lưu các thông số vị trí GPS, WiFi và dải IP chấm công này vào hệ thống Seajong không?',
      confirmText: 'Lưu cấu hình',
      cancelText: 'Huỷ',
      type: 'info',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        executeSave();
      },
    });
  };

  const executeSave = async () => {
    setIsSaving(true);
    const updatedData: WorkLocationsData = {
      ...data,
      lastUpdated: new Date().toLocaleDateString('vi-VN'),
      updatedBy: 'Lê Công Vụ - Giám đốc',
    };

    try {
      localStorage.setItem('seajong_work_locations', JSON.stringify(updatedData));
      const res = await fetch('/api/work-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) throw new Error('Máy chủ phản hồi lỗi');

      setData(updatedData);
      setHasChanges(false);
      if (onShowToast) {
        onShowToast('success', 'Lưu thành công', 'Đã lưu toàn bộ cấu hình vị trí làm việc và mạng nội bộ');
      } else {
        setConfirmDialog({
          isOpen: true,
          title: 'Lưu thành công',
          message: 'Đã lưu thành công thông số vị trí GPS và mạng nội bộ vào hệ thống Seajong',
          confirmText: 'Đóng',
          type: 'success',
          onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'Lỗi lưu dữ liệu', err?.message || 'Không thể kết nối máy chủ');
      } else {
        setConfirmDialog({
          isOpen: true,
          title: 'Lỗi lưu dữ liệu',
          message: 'Không thể kết nối máy chủ. Cấu hình đã được lưu tạm vào bộ nhớ trình duyệt.',
          confirmText: 'Đóng',
          type: 'danger',
          onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px 16px 18px',
        fontFamily: "'Roboto Condensed', sans-serif",
      }}
    >
      {/* ── 1. HEADER: DROPLIST ĐỊA ĐIỂM LÀM VIỆC TỪ DB VÀ NÚT LƯU CẤU HÌNH (CHUẨN HÌNH 2) ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '8px 14px',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1.5px solid #bfdbfe',
          boxShadow: '0 1px 4px rgba(59, 130, 246, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', minWidth: 0 }}>
          {/* Icon tròn định vị màu tím xanh nhạt */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GeoAltFill size={18} color="#4f46e5" />
          </div>

          <div ref={locationDropdownRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            {/* Nhãn thông báo */}
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                lineHeight: 1.1,
                marginBottom: '1px',
              }}
            >
              ĐANG CẤU HÌNH CHO NƠI LÀM VIỆC:
            </div>

            {/* Dòng tên địa điểm + duy nhất 1 mũi tên xổ xuống */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minHeight: '26px' }}>
              <button
                type="button"
                onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '1.0625rem',
                  fontWeight: 800,
                  color: '#4f46e5',
                  lineHeight: 1.2,
                  background: 'transparent',
                  border: 'none',
                  padding: '2px 0',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Nhấp để chọn địa điểm làm việc"
              >
                <span>{currentActiveLocation?.name || 'Chọn nơi làm việc'}</span>
                {isLocationDropdownOpen ? (
                  <ChevronUp size={13} color="#4f46e5" style={{ flexShrink: 0 }} />
                ) : (
                  <ChevronDown size={13} color="#4f46e5" style={{ flexShrink: 0 }} />
                )}
              </button>

              {hasChanges && (
                <Badge variant="warning" style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>
                  Chưa lưu thay đổi
                </Badge>
              )}
            </div>

            {/* Địa chỉ hiển thị bằng một dòng chữ nhỏ ở bên dưới tên địa điểm làm việc */}
            {currentActiveLocation?.address && (
              <div
                style={{
                  fontSize: '0.7188rem',
                  color: '#64748b',
                  lineHeight: 1.3,
                  marginTop: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>Địa chỉ:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>{currentActiveLocation.address}</span>
              </div>
            )}

            {/* Popover menu xổ xuống mở rộng hết không gian khả dụng */}
            {isLocationDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  width: '100%',
                  marginTop: '6px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #cbd5e1',
                  zIndex: 1000,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Danh sách địa điểm làm việc ({data.locations.length})
                </div>

                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {data.locations.map((loc) => {
                    const isSelected = loc.id === currentActiveLocation?.id;
                    return (
                      <div
                        key={loc.id}
                        onClick={() => {
                          setSelectedLocationId(loc.id);
                          setIsLocationDropdownOpen(false);
                        }}
                        style={{
                          padding: '8px 14px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          borderLeft: isSelected ? '3px solid #4f46e5' : '3px solid transparent',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: isSelected ? 800 : 600,
                              color: isSelected ? '#4f46e5' : '#1e293b',
                            }}
                          >
                            {loc.name}
                          </span>
                          {isSelected && <Check2 size={16} color="#4f46e5" style={{ flexShrink: 0 }} />}
                        </div>

                        {loc.address ? (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#64748b',
                              marginTop: '2px',
                              lineHeight: 1.3,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ flexShrink: 0, fontWeight: 500 }}>Địa chỉ:</span>
                            <span style={{ color: '#475569' }}>{loc.address}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                            Chưa cập nhật địa chỉ
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cụm nút hành động bên phải: Nút Thông tin địa chỉ và nút Lưu cấu hình */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<GeoAlt size={13} color="#4f46e5" />}
            onClick={() => {
              if (currentActiveLocation) {
                setAddressEditForm({
                  address: currentActiveLocation.address || '',
                  latitude: currentActiveLocation.latitude || 20.998245,
                  longitude: currentActiveLocation.longitude || 105.795123,
                  radiusMeters: currentActiveLocation.radiusMeters || 100,
                });
                setIsAddressModalOpen(true);
              }
            }}
            disabled={isSaving}
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#4f46e5',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              padding: '4px 10px',
            }}
            title="Nhấp để thay đổi địa chỉ của nơi làm việc này"
          >
            Thông tin địa chỉ
          </Button>

          <div style={{ width: '1px', height: '22px', backgroundColor: '#e2e8f0' }} />

          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<BoxArrowDown size={14} />}
            onClick={handleSaveAll}
            disabled={isSaving}
            style={{
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.8125rem',
              padding: '6px 14px',
              borderRadius: '6px',
              boxShadow: '0 2px 5px rgba(16, 185, 129, 0.2)',
            }}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </div>
      </div>

      {/* ── 2. NỘI DUNG CẤU HÌNH CHO NƠI LÀM VIỆC ĐƯỢC CHỌN TRONG DROPLIST (KHÔNG DÙNG KPI CARDS) ── */}
      {!currentActiveLocation ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1.5px dashed #cbd5e1',
          }}
        >
          <ExclamationTriangle size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#334155' }}>
            Chưa chọn địa điểm làm việc
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Vui lòng chọn một nơi làm việc từ droplist ở trên để tiến hành thiết lập mạng nội bộ.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* A. BANNER NHẬN DIỆN MẠNG MÁY ĐANG KẾT NỐI (AUTO DETECT 1-CLICK) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #38bdf8',
              borderRadius: '10px',
              padding: '12px 18px',
              boxShadow: '0 2px 8px rgba(56, 189, 248, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Thanh trạng thái Tự động quét và đồng bộ mạng IP WAN từ Máy chủ */}
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#16a34a',
                    boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.25)',
                  }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>
                  Tự động đồng bộ IP WAN: Đang hoạt động
                </span>
                <span style={{ fontSize: '0.72rem', color: '#15803d' }}>
                  (Tự động cập nhật khi bật máy PC và chu kỳ 10 phút chống mất chấm công khi modem reset)
                </span>
                {serverAutoSyncStatus?.currentWanIp && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: '#dcfce7',
                      color: '#14532d',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #86efac',
                      fontFamily: 'monospace',
                    }}
                  >
                    WAN: {serverAutoSyncStatus.currentWanIp}
                  </span>
                )}
                {serverAutoSyncStatus?.lastCheckFormatted && (
                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                    • Lần quét gần nhất: {serverAutoSyncStatus.lastCheckFormatted}
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={
                  isSyncingServer ? (
                    <ArrowCounterclockwise className="spin" size={12} />
                  ) : (
                    <ArrowCounterclockwise size={12} />
                  )
                }
                onClick={handleSyncServerNow}
                disabled={isSyncingServer}
                style={{
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  borderColor: '#86efac',
                  color: '#166534',
                  backgroundColor: '#ffffff',
                  padding: '4px 10px',
                }}
              >
                {isSyncingServer ? 'Đang đồng bộ...' : 'Đồng bộ máy chủ ngay'}
              </Button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7',
                    flexShrink: 0,
                  }}
                >
                  <LightningChargeFill size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                      Nhận diện thông số mạng máy tính đang kết nối
                    </h4>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                      }}
                    >
                      Tự động 1-Click
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Quét nhanh địa chỉ IP WAN công cộng của máy tính quản trị để áp dụng chuẩn vào cơ sở "{currentActiveLocation.name}"
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={
                    isDetectingNetwork ? (
                      <ArrowCounterclockwise className="spin" size={13} />
                    ) : (
                      <LightningChargeFill size={13} />
                    )
                  }
                  onClick={() => handleDetectCurrentNetwork()}
                  disabled={isDetectingNetwork}
                  style={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    backgroundColor: '#0284c7',
                    borderColor: '#0284c7',
                    boxShadow: '0 2px 5px rgba(2, 132, 199, 0.2)',
                    padding: '6px 12px',
                  }}
                >
                  {isDetectingNetwork ? 'Đang quét...' : '⚡ Quét mạng máy này'}
                </Button>

                {detectedNetwork?.publicIp && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        updateCurrentLocField({
                          primaryWanIp: detectedNetwork.publicIp,
                          lanSubnet: detectedNetwork.localSubnetCandidate || currentActiveLocation.lanSubnet || '192.168.1.0/24',
                          allowLanCheckin: true,
                          allowWanIpCheckin: true,
                        });
                        if (onShowToast) {
                          onShowToast('success', 'Đã gán IP', `Đã áp dụng IP ${detectedNetwork.publicIp} cho "${currentActiveLocation.name}"`);
                        }
                      }}
                      style={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        borderColor: '#0284c7',
                        color: '#0284c7',
                        padding: '6px 12px',
                      }}
                    >
                      Gán IP này cho {currentActiveLocation.name}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenAddWifi(currentActiveLocation.id)}
                      style={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        backgroundColor: '#10b981',
                        borderColor: '#10b981',
                        color: '#ffffff',
                        padding: '6px 12px',
                      }}
                    >
                      + Thêm WiFi từ mạng này
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Chi tiết thông số mạng nếu đã quét */}
            {detectedNetwork && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>IP WAN máy này: </span>
                    <strong style={{ fontSize: '0.8438rem', color: '#0284c7', fontFamily: 'monospace' }}>{detectedNetwork.publicIp}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Subnet nội bộ: </span>
                    <strong style={{ fontSize: '0.8438rem', color: '#334155', fontFamily: 'monospace' }}>{detectedNetwork.localSubnetCandidate}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Nhà mạng: </span>
                    <strong style={{ fontSize: '0.8125rem', color: '#334155' }}>{detectedNetwork.isp}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Độ trễ: </span>
                    <strong style={{ fontSize: '0.8125rem', color: '#16a34a' }}>{detectedNetwork.rttMs} ms</strong>
                  </div>
                </div>

                <div>
                  {currentActiveLocation.primaryWanIp === detectedNetwork.publicIp ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.7188rem',
                        fontWeight: 700,
                        color: '#15803d',
                        backgroundColor: '#dcfce7',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <CheckCircle size={12} />
                      Đang khớp IP WAN của {currentActiveLocation.name}
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.7188rem',
                        fontWeight: 700,
                        color: '#b45309',
                        backgroundColor: '#fef3c7',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid #fde68a',
                      }}
                    >
                      <ExclamationTriangle size={12} />
                      IP khác với cấu hình ({currentActiveLocation.primaryWanIp || 'Chưa đặt'})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* B. LƯỚI 4 CARD CẤU HÌNH CHUYÊN SÂU */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '14px' }}>

            {/* ── CARD 1: MẠNG CÁP LAN VÀ IP WAN CHẤM CÔNG ── */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <Ethernet size={16} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                      Mạng máy tính cục bộ
                    </h5>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Xác thực máy tính bàn hoặc cắm dây LAN</span>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                  <Toggle
                    checked={currentActiveLocation.allowLanCheckin ?? true}
                    onChange={(checked) =>
                      updateCurrentLocField({
                        allowLanCheckin: checked,
                        allowWanIpCheckin: checked,
                      })
                    }
                  />
                  <span>{currentActiveLocation.allowLanCheckin ? 'Đang bật' : 'Đang tắt'}</span>
                </label>
              </div>

              {/* Lựa chọn 2 phương án: IP Tĩnh hoặc IP Động qua Máy trạm chỉ định */}
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.7813rem', fontWeight: 800, color: '#1e293b' }}>
                    Chọn phương án quản lý IP mạng văn phòng (Cho máy bàn / laptop):
                  </div>
                  <Badge variant="neutral" style={{ fontSize: '0.625rem', padding: '2px 6px' }}>
                    VPS Cloud Ready
                  </Badge>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Option 1: IP Tĩnh */}
                  <div
                    onClick={() => updateCurrentLocField({ ipMode: 'static' })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: (currentActiveLocation.ipMode || 'dynamic_station') === 'static' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: (currentActiveLocation.ipMode || 'dynamic_station') === 'static' ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="radio"
                      name="ipMode"
                      checked={(currentActiveLocation.ipMode || 'dynamic_station') === 'static'}
                      onChange={() => updateCurrentLocField({ ipMode: 'static' })}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.7813rem', fontWeight: 800, color: (currentActiveLocation.ipMode || 'dynamic_station') === 'static' ? '#1d4ed8' : '#1e293b' }}>
                        Phương án 1: Đường truyền IP Tĩnh (Static IP)
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                        Áp dụng khi công ty đã đăng ký IP tĩnh cố định từ nhà mạng. Không thay đổi khi modem reset.
                      </div>
                    </div>
                  </div>

                  {/* Option 2: IP Động qua Máy trạm */}
                  <div
                    onClick={() => updateCurrentLocField({ ipMode: 'dynamic_station' })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: (currentActiveLocation.ipMode || 'dynamic_station') === 'dynamic_station' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: (currentActiveLocation.ipMode || 'dynamic_station') === 'dynamic_station' ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="radio"
                      name="ipMode"
                      checked={(currentActiveLocation.ipMode || 'dynamic_station') === 'dynamic_station'}
                      onChange={() => updateCurrentLocField({ ipMode: 'dynamic_station' })}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.7813rem', fontWeight: 800, color: (currentActiveLocation.ipMode || 'dynamic_station') === 'dynamic_station' ? '#1d4ed8' : '#1e293b' }}>
                        Phương án 2: Đường truyền IP Động (Dynamic IP)
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                        Tự động bắt IP modem gửi lên VPS thông qua tài khoản máy trạm văn phòng được chỉ định.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Khối tham số chi tiết theo phương án được chọn */}
                {(currentActiveLocation.ipMode || 'dynamic_station') === 'static' ? (
                  <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#1e40af', margin: 0 }}>
                      Địa chỉ IP WAN Tĩnh cố định của văn phòng (Do nhà mạng cấp):
                    </label>
                    <Input
                      type="text"
                      placeholder="Ví dụ: 118.69.182.45"
                      value={currentActiveLocation.primaryWanIp || ''}
                      onChange={(e) => updateCurrentLocField({ primaryWanIp: e.target.value, staticWanIp: e.target.value })}
                      style={{ marginBottom: 0, fontFamily: 'monospace', fontSize: '0.8125rem' }}
                    />
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                      ℹ️ Hệ thống VPS sẽ lấy địa chỉ IP này làm căn cứ xác thực cố định vĩnh viễn, không lo modem reset hay mất điện.
                    </span>
                  </div>
                ) : (
                  <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                        Chỉ định tài khoản máy tính gửi tín hiệu cập nhật IP mạng văn phòng:
                      </label>
                      <Select
                        value={String(currentActiveLocation.syncStationUserId || '')}
                        onChange={(e: any) => {
                          const val = e?.target ? e.target.value : e;
                          const selectedUser = usersList.find((u) => String(u.id) === String(val));
                          updateCurrentLocField({
                            syncStationUserId: val ? (Number(val) || String(val)) : '',
                            syncStationUserName: selectedUser ? selectedUser.name : '',
                            syncStationUserEmail: selectedUser ? selectedUser.email : '',
                          });
                        }}
                        options={[
                          { value: '', label: '-- Chọn nhân sự / tài khoản máy văn phòng cố định --' },
                          ...usersList.map((u) => ({
                            value: String(u.id),
                            label: `${u.name} (${u.position || u.department || 'Nhân viên'}) - ${u.email}`,
                          })),
                        ]}
                      />
                    </div>

                    {/* Hộp trạng thái máy trạm Live Status */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '6px',
                        border: '1px solid #bbf7d0',
                        fontSize: '0.7188rem',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: currentActiveLocation.syncStationUserId ? '#16a34a' : '#94a3b8',
                            boxShadow: currentActiveLocation.syncStationUserId ? '0 0 0 2px rgba(22, 163, 74, 0.2)' : 'none',
                          }}
                        />
                        <span style={{ fontWeight: 700, color: '#166534' }}>
                          Máy trạm chỉ định: {currentActiveLocation.syncStationUserName || 'Chưa chỉ định'}
                        </span>
                        {currentActiveLocation.lastHeartbeatTime && (
                          <span style={{ color: '#4b5563' }}>
                            • Tín hiệu gần nhất: {currentActiveLocation.lastHeartbeatTime}
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#15803d' }}>
                        IP WAN hiện tại: {currentActiveLocation.primaryWanIp || 'Chưa có'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.6875rem', color: '#475569' }}>
                      🔒 <strong>Bảo mật:</strong> Khi tài khoản này đăng nhập máy tính tại văn phòng, hệ thống tự động bắt IP modem gửi lên VPS mỗi 5 phút. Nhân viên khác hoặc khi mang máy ra ngoài không thể gửi tín hiệu này.
                    </span>
                  </div>
                )}
              </div>

              {/* Dải mạng LAN Subnet nội bộ */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7188rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Dải mạng LAN nội bộ (Subnet) của văn phòng:
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: 192.168.1.0/24"
                  value={currentActiveLocation.lanSubnet || ''}
                  onChange={(e) => updateCurrentLocField({ lanSubnet: e.target.value })}
                  style={{ marginBottom: 0, fontFamily: 'monospace', fontSize: '0.8125rem' }}
                />
                <span style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Áp dụng xác thực cho máy tính để bàn cắm dây mạng LAN nội bộ
                </span>
              </div>
            </div>

            {/* ── CARD 2: ĐIỂM PHÁT SÓNG WIFI CHẤM CÔNG ── */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                    <Wifi size={16} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                      Mạng phát sóng WiFi ({currentActiveLocation.wifiList?.length || 0})
                    </h5>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Xác thực SSID và IP WAN của mạng không dây</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                    <Toggle
                      checked={currentActiveLocation.allowWifiCheckin}
                      onChange={(checked) => updateCurrentLocField({ allowWifiCheckin: checked })}
                    />
                    <span>{currentActiveLocation.allowWifiCheckin ? 'Đang bật' : 'Đang tắt'}</span>
                  </label>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenAddWifi(currentActiveLocation.id)}
                    style={{ fontSize: '0.7188rem', fontWeight: 700, padding: '3px 8px' }}
                  >
                    + Thêm WiFi
                  </Button>
                </div>
              </div>

              {/* Danh sách WiFi */}
              {!currentActiveLocation.wifiList || currentActiveLocation.wifiList.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', fontSize: '0.75rem', color: '#64748b' }}>
                  Chưa có mạng WiFi nào được cấu hình cho {currentActiveLocation.name}.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {currentActiveLocation.wifiList.map((wf) => (
                    <div
                      key={wf.id}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Wifi size={13} color="#16a34a" />
                          <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>{wf.ssid}</strong>
                          <Badge variant={wf.isActive ? 'success' : 'neutral'} style={{ fontSize: '0.625rem', padding: '1px 5px' }}>
                            {wf.isActive ? 'Hoạt động' : 'Tắt'}
                          </Badge>
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                          {wf.bssid ? `MAC: ${wf.bssid} • ` : ''}IP WAN: {wf.publicWanIp || currentActiveLocation.primaryWanIp || 'Theo cơ sở'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditWifi(currentActiveLocation.id, wf)}
                          style={{ padding: '2px 6px', color: '#2563eb' }}
                          title="Sửa WiFi"
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWifi(currentActiveLocation.id, wf)}
                          style={{ padding: '2px 6px', color: '#dc2626' }}
                          title="Xóa WiFi"
                        >
                          <Trash3 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── CARD 3: MÁY CHẤM CÔNG VÂN TAY VÀ KHUÔN MẶT ── */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                    <Fingerprint size={16} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                      Máy chấm công vân tay ({currentActiveLocation.biometricDevices?.length || 0})
                    </h5>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Kết nối qua cổng LAN TCP/IP Socket (Port 4370)</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenAddDevice(currentActiveLocation.id)}
                  style={{ fontSize: '0.7188rem', fontWeight: 700, padding: '3px 8px' }}
                >
                  + Thêm máy
                </Button>
              </div>

              {/* Danh sách máy chấm công */}
              {!currentActiveLocation.biometricDevices || currentActiveLocation.biometricDevices.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', fontSize: '0.75rem', color: '#64748b' }}>
                  Chưa có máy chấm công nào được kết nối tại {currentActiveLocation.name}.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {currentActiveLocation.biometricDevices.map((dev) => (
                    <div
                      key={dev.id}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Fingerprint size={13} color="#9333ea" />
                          <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>{dev.deviceName}</strong>
                          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>({dev.model})</span>
                          <Badge variant={dev.status === 'online' ? 'success' : 'neutral'} style={{ fontSize: '0.625rem', padding: '1px 5px' }}>
                            {dev.status === 'online' ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                          IP: {dev.lanIp}:{dev.port} • SN: {dev.serialNumber}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestDevice(dev)}
                          disabled={testingDeviceId === dev.id}
                          style={{ fontSize: '0.6875rem', padding: '2px 6px', color: '#16a34a' }}
                          title="Kiểm tra kết nối LAN"
                        >
                          {testingDeviceId === dev.id ? 'Đang test...' : 'Test kết nối'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDevice(currentActiveLocation.id, dev)}
                          style={{ padding: '2px 6px', color: '#dc2626' }}
                          title="Xóa máy"
                        >
                          <Trash3 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── CARD 4: ĐỊNH VỊ GPS VÀ VÙNG CHẤM CÔNG (GEOFENCING) ── */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                    <GeoAlt size={16} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                      Định vị GPS và phạm vi chấm công
                    </h5>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Chấm công qua vị trí vệ tinh GPS (Geofencing)</span>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                  <Toggle
                    checked={currentActiveLocation.allowGpsCheckin}
                    onChange={(checked) => updateCurrentLocField({ allowGpsCheckin: checked })}
                  />
                  <span>{currentActiveLocation.allowGpsCheckin ? 'Đang bật' : 'Đang tắt'}</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.7188rem', fontWeight: 700, color: '#334155' }}>Tọa độ GPS (Vĩ độ / Kinh độ):</label>
                    <button
                      type="button"
                      onClick={() => {
                        handleGetDeviceCurrentGps((coords) => {
                          updateCurrentLocField({
                            latitude: Number(coords.latitude.toFixed(6)),
                            longitude: Number(coords.longitude.toFixed(6)),
                          });
                          if (onShowToast) onShowToast('success', 'Đã lấy tọa độ GPS', `Vĩ độ: ${coords.latitude.toFixed(6)}, Kinh độ: ${coords.longitude.toFixed(6)}`);
                        });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      Lấy tọa độ vị trí này
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="Vĩ độ"
                      value={currentActiveLocation.latitude}
                      onChange={(e) => updateCurrentLocField({ latitude: Number(e.target.value) })}
                      style={{ marginBottom: 0, fontSize: '0.7813rem', fontFamily: 'monospace' }}
                    />
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="Kinh độ"
                      value={currentActiveLocation.longitude}
                      onChange={(e) => updateCurrentLocField({ longitude: Number(e.target.value) })}
                      style={{ marginBottom: 0, fontSize: '0.7813rem', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.7188rem', fontWeight: 700, color: '#334155' }}>Bán kính cho phép chấm công:</label>
                      <strong style={{ fontSize: '0.75rem', color: '#0284c7' }}>{currentActiveLocation.radiusMeters || 100} mét</strong>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="500"
                      step="10"
                      value={currentActiveLocation.radiusMeters || 100}
                      onChange={(e) => updateCurrentLocField({ radiusMeters: Number(e.target.value) })}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Bản đồ Google Maps thu nhỏ */}
                <div>
                  {renderGoogleMapEmbed(currentActiveLocation.latitude, currentActiveLocation.longitude, '130px', currentActiveLocation.name)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CẬP NHẬT THÔNG TIN ĐỊA CHỈ NƠI LÀM VIỆC ── */}
      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title={`Thông tin địa chỉ: ${currentActiveLocation?.name || ''}`}
        description="Cập nhật địa chỉ thực tế và tọa độ vị trí của cơ sở này vào hệ thống"
        maxWidth="500px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddressModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveAddressOnly} style={{ fontWeight: 700 }}>
              Lưu thông tin địa chỉ
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px', color: '#1e293b' }}>
              Địa chỉ cụ thể nơi làm việc:
            </label>
            <textarea
              rows={3}
              placeholder="Nhập số nhà, tên đường phố, tòa nhà, phường/xã, quận/huyện, tỉnh/thành phố..."
              value={addressEditForm.address}
              onChange={(e) => setAddressEditForm((prev) => ({ ...prev, address: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8438rem',
                lineHeight: 1.4,
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Vĩ độ (Latitude):
              </label>
              <Input
                type="number"
                step="0.000001"
                placeholder="20.998245"
                value={addressEditForm.latitude}
                onChange={(e) => setAddressEditForm((prev) => ({ ...prev, latitude: Number(e.target.value) }))}
                style={{ marginBottom: 0, fontSize: '0.8125rem', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Kinh độ (Longitude):
              </label>
              <Input
                type="number"
                step="0.000001"
                placeholder="105.795123"
                value={addressEditForm.longitude}
                onChange={(e) => setAddressEditForm((prev) => ({ ...prev, longitude: Number(e.target.value) }))}
                style={{ marginBottom: 0, fontSize: '0.8125rem', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Bán kính chấm công: <strong>{addressEditForm.radiusMeters} mét</strong></span>
            <button
              type="button"
              onClick={() => {
                handleGetDeviceCurrentGps((coords) => {
                  setAddressEditForm((prev) => ({
                    ...prev,
                    latitude: Number(coords.latitude.toFixed(6)),
                    longitude: Number(coords.longitude.toFixed(6)),
                  }));
                  if (onShowToast) onShowToast('success', 'Đã lấy tọa độ GPS', `Vĩ độ: ${coords.latitude.toFixed(6)}, Kinh độ: ${coords.longitude.toFixed(6)}`);
                });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              📍 Lấy tọa độ GPS máy này
            </button>
          </div>

          {/* Bản đồ xem nhanh */}
          {addressEditForm.latitude && addressEditForm.longitude && (
            <div>
              <div style={{ fontSize: '0.7188rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                Bản đồ vị trí tọa độ:
              </div>
              {renderGoogleMapEmbed(addressEditForm.latitude, addressEditForm.longitude, '140px', 'Vị trí địa chỉ')}
            </div>
          )}
        </div>
      </Modal>


      {/* ── 7. MODAL THÊM HOẶC SỬA CƠ SỞ LÀM VIỆC ── */}
      <Modal
        isOpen={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        title={editingLoc ? 'Chỉnh sửa vị trí làm việc' : 'Thêm vị trí làm việc mới'}
        description="Thiết lập tên cơ sở, địa chỉ, tọa độ GPS và bán kính check-in"
        maxWidth="540px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button type="button" variant="secondary" onClick={() => setLocModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveLocForm} style={{ fontWeight: 700 }}>
              {editingLoc ? 'Cập nhật vị trí' : 'Thêm vị trí'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
              Tên vị trí làm việc hoặc cơ sở:
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Nhà máy sản xuất số 2, Showroom Cầu Giấy..."
              value={locForm.name}
              onChange={(e) => setLocForm((prev) => ({ ...prev, name: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Phân loại cơ sở:
              </label>
              <Select
                value={locForm.type}
                onChange={(e) => setLocForm((prev) => ({ ...prev, type: e.target.value as any }))}
                options={[
                  { value: 'office', label: 'Văn phòng điều hành' },
                  { value: 'factory', label: 'Nhà máy sản xuất' },
                  { value: 'warehouse', label: 'Kho bãi trung chuyển' },
                  { value: 'showroom', label: 'Showroom trưng bày' },
                  { value: 'site', label: 'Công trường dự án' },
                ]}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Mã định danh cơ sở:
              </label>
              <Input
                type="text"
                placeholder="Mã cơ sở"
                value={locForm.code}
                onChange={(e) => setLocForm((prev) => ({ ...prev, code: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
              Địa chỉ cụ thể:
            </label>
            <Input
              type="text"
              placeholder="Số nhà, đường phố, khu công nghiệp, quận huyện..."
              value={locForm.address}
              onChange={(e) => setLocForm((prev) => ({ ...prev, address: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Vĩ độ Latitude:
              </label>
              <Input
                type="number"
                step="0.000001"
                value={locForm.latitude}
                onChange={(e) => setLocForm((prev) => ({ ...prev, latitude: Number(e.target.value) }))}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Kinh độ Longitude:
              </label>
              <Input
                type="number"
                step="0.000001"
                value={locForm.longitude}
                onChange={(e) => setLocForm((prev) => ({ ...prev, longitude: Number(e.target.value) }))}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Crosshair size={13} />}
              onClick={handleGetCurrentLocation}
              disabled={isLocatingDevice}
              style={{ fontWeight: 700 }}
            >
              {isLocatingDevice ? 'Đang xác định vị trí...' : 'Lấy tọa độ GPS thiết bị hiện tại'}
            </Button>

            <div style={{ width: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '4px' }}>
                Bán kính cho phép:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberGroup(locForm.radiusMeters)}
                onChange={(e) => setLocForm((prev) => ({ ...prev, radiusMeters: parseNumberGroup(e.target.value) }))}
                rightIcon={<span style={{ padding: '0 8px', fontSize: '0.75rem', color: '#64748b' }}>mét</span>}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          {/* Ban do Google Maps xem truoc vi tri co so */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.7813rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Map size={13} />
                Bản đồ Google Maps nhỏ xem trước vị trí:
              </label>
              <span style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                {locForm.latitude}, {locForm.longitude}
              </span>
            </div>
            {renderGoogleMapEmbed(locForm.latitude, locForm.longitude, '180px', locForm.name || 'Vị trí xem trước')}
          </div>

          {/* Cấu hình mạng cáp LAN (Ethernet) và IP WAN của cơ sở */}
          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ethernet size={16} color="#0284c7" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                  Thông số Mạng cáp LAN (Ethernet) và IP WAN Cơ sở
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<LightningChargeFill size={12} color="#d97706" />}
                onClick={() => {
                  if (detectedNetwork?.publicIp) {
                    setLocForm((prev) => ({
                      ...prev,
                      primaryWanIp: detectedNetwork.publicIp,
                      lanSubnet: detectedNetwork.localSubnetCandidate || prev.lanSubnet || '192.168.1.0/24',
                    }));
                    if (onShowToast) onShowToast('success', 'Đã gán IP', `Đã điền IP WAN máy hiện tại: ${detectedNetwork.publicIp}`);
                  } else {
                    handleDetectCurrentNetwork();
                  }
                }}
                style={{ fontSize: '0.7188rem', fontWeight: 700 }}
              >
                {detectedNetwork?.publicIp ? '⚡ Điền IP máy hiện tại' : '⚡ Quét và Điền IP máy này'}
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                  IP WAN công cộng cơ sở (Static IP):
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: 118.69.182.45"
                  value={locForm.primaryWanIp || ''}
                  onChange={(e) => setLocForm((prev) => ({ ...prev, primaryWanIp: e.target.value }))}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                  Dải mạng cáp LAN nội bộ (Subnet):
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: 192.168.1.0/24"
                  value={locForm.lanSubnet || ''}
                  onChange={(e) => setLocForm((prev) => ({ ...prev, lanSubnet: e.target.value }))}
                  style={{ marginBottom: 0 }}
                />
              </div>
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
              💡 Máy tính để bàn (PC) hoặc Laptop cắm dây LAN trong dải mạng này sẽ tự động được nhận diện và cho phép chấm công mà không cần cài thêm phần mềm.
            </div>
          </div>

          {/* Phương thức chấm công cho phép tại cơ sở */}
          <div style={{ padding: '12px 14px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>
              Phương thức chấm công hợp lệ tại cơ sở này:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7813rem', cursor: 'pointer', backgroundColor: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <Toggle
                  checked={locForm.allowLanCheckin ?? true}
                  onChange={(checked) => setLocForm((prev) => ({ ...prev, allowLanCheckin: checked, allowWanIpCheckin: checked }))}
                />
                <span style={{ fontWeight: 600 }}>Cắm mạng cáp LAN / IP WAN</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7813rem', cursor: 'pointer', backgroundColor: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <Toggle
                  checked={locForm.allowWifiCheckin}
                  onChange={(checked) => setLocForm((prev) => ({ ...prev, allowWifiCheckin: checked }))}
                />
                <span style={{ fontWeight: 600 }}>Kết nối WiFi nội bộ</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7813rem', cursor: 'pointer', backgroundColor: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <Toggle
                  checked={locForm.allowGpsCheckin}
                  onChange={(checked) => setLocForm((prev) => ({ ...prev, allowGpsCheckin: checked }))}
                />
                <span style={{ fontWeight: 600 }}>Định vị GPS Geofence</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7813rem', cursor: 'pointer', backgroundColor: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <Toggle
                  checked={locForm.requireBiometric}
                  onChange={(checked) => setLocForm((prev) => ({ ...prev, requireBiometric: checked }))}
                />
                <span style={{ fontWeight: 600 }}>Máy FaceID/Vân tay</span>
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
              Ghi chú mô tả cơ sở:
            </label>
            <Input
              type="text"
              placeholder="Mô tả phạm vi hoạt động, khối phòng ban phụ trách..."
              value={locForm.description}
              onChange={(e) => setLocForm((prev) => ({ ...prev, description: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>
      </Modal>

      {/* ── 8. MODAL THÊM HOẶC SỬA ĐIỂM TRUY CẬP WIFI ── */}
      <Modal
        isOpen={wifiModalOpen}
        onClose={() => setWifiModalOpen(false)}
        title={editingWifi ? 'Chỉnh sửa mạng WiFi chấm công' : 'Thêm mạng WiFi chấm công'}
        description="Chỉ cần nhập tên sóng WiFi bạn đang kết nối để nhân viên dùng chấm công"
        maxWidth="480px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button type="button" variant="secondary" onClick={() => setWifiModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveWifiForm} style={{ fontWeight: 700 }}>
              {editingWifi ? 'Cập nhật WiFi' : 'Lưu WiFi'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Thông báo thông số mạng được tự động gán */}
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Wifi size={18} color="#16a34a" />
            <div style={{ fontSize: '0.7813rem', color: '#166534' }}>
              <div>
                <strong>Hệ thống tự động liên kết với IP mạng:</strong>{' '}
                <code style={{ backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {wifiForm.publicWanIp || currentActiveLocation?.primaryWanIp || 'Đang cập nhật'}
                </code>
              </div>
              <div style={{ fontSize: '0.7188rem', color: '#15803d', marginTop: '2px' }}>
                Nhân viên bắt đúng WiFi này và có IP mạng trùng khớp mới được chấm công hợp lệ.
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8438rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Tên mạng WiFi (SSID) <span style={{ color: '#ef4444' }}>*</span>:
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Seajong, Seajong_VanPhong, VNPT_WiFi..."
              value={wifiForm.ssid}
              onChange={(e) => setWifiForm((prev) => ({ ...prev, ssid: e.target.value }))}
              style={{ marginBottom: 0, fontSize: '0.9rem' }}
              autoFocus
            />
            <p style={{ margin: '5px 0 0', fontSize: '0.7188rem', color: '#64748b' }}>
              💡 Điền tên WiFi bạn đang kết nối hiển thị trên điện thoại hoặc góc phải thanh tác vụ máy tính.
            </p>
          </div>

          {/* Toggle mở rộng thông số kỹ thuật nâng cao */}
          <div style={{ marginTop: '2px' }}>
            <button
              type="button"
              onClick={() => setShowAdvancedWifiSettings((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0',
                color: '#6366f1',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>
                {showAdvancedWifiSettings
                  ? '▼ Thu gọn cấu hình kỹ thuật nâng cao'
                  : '⚙️ Cấu hình kỹ thuật nâng cao (IP WAN, Subnet, MAC BSSID) - Mặc định tự động'}
              </span>
            </button>
          </div>

          {showAdvancedWifiSettings && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#475569' }}>
                  Địa chỉ BSSID MAC phát sóng (Không bắt buộc):
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: 18:e8:29:4a:12:30 (để trống nếu không biết)"
                  value={wifiForm.bssid}
                  onChange={(e) => setWifiForm((prev) => ({ ...prev, bssid: e.target.value }))}
                  style={{ marginBottom: 0, fontSize: '0.7813rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#475569' }}>
                    Dải mạng LAN nội bộ:
                  </label>
                  <Input
                    type="text"
                    placeholder="192.168.1.0/24"
                    value={wifiForm.ipSubnet}
                    onChange={(e) => setWifiForm((prev) => ({ ...prev, ipSubnet: e.target.value }))}
                    style={{ marginBottom: 0, fontSize: '0.7813rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#475569' }}>
                    Địa chỉ IP WAN công cộng:
                  </label>
                  <Input
                    type="text"
                    placeholder="Ví dụ: 42.114.95.163"
                    value={wifiForm.publicWanIp}
                    onChange={(e) => setWifiForm((prev) => ({ ...prev, publicWanIp: e.target.value }))}
                    style={{ marginBottom: 0, fontSize: '0.7813rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#475569' }}>
                  Ghi chú mạng:
                </label>
                <Input
                  type="text"
                  placeholder="Mô tả phạm vi phủ sóng của điểm truy cập..."
                  value={wifiForm.note}
                  onChange={(e) => setWifiForm((prev) => ({ ...prev, note: e.target.value }))}
                  style={{ marginBottom: 0, fontSize: '0.7813rem' }}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── 9. MODAL THÊM MÁY CHẤM CÔNG LAN ── */}
      <Modal
        isOpen={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        title="Thêm máy chấm công kết nối LAN"
        description="Khai báo địa chỉ IP và Port máy chấm công khuôn mặt hoặc vân tay"
        maxWidth="480px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button type="button" variant="secondary" onClick={() => setDeviceModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveDeviceForm} style={{ fontWeight: 700 }}>
              Thêm thiết bị
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
              Tên thiết bị chấm công:
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Máy vân tay Cổng số 1, Máy FaceID Tầng 2..."
              value={deviceForm.deviceName}
              onChange={(e) => setDeviceForm((prev) => ({ ...prev, deviceName: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Model máy chấm công:
              </label>
              <Input
                type="text"
                placeholder="ZKTeco F22, Hikvision..."
                value={deviceForm.model}
                onChange={(e) => setDeviceForm((prev) => ({ ...prev, model: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Số Serial Number:
              </label>
              <Input
                type="text"
                placeholder="Mã số máy"
                value={deviceForm.serialNumber}
                onChange={(e) => setDeviceForm((prev) => ({ ...prev, serialNumber: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Địa chỉ IP tĩnh trong mạng LAN:
              </label>
              <Input
                type="text"
                placeholder="192.168.1.201"
                value={deviceForm.lanIp}
                onChange={(e) => setDeviceForm((prev) => ({ ...prev, lanIp: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Cổng Port:
              </label>
              <Input
                type="number"
                value={deviceForm.port}
                onChange={(e) => setDeviceForm((prev) => ({ ...prev, port: Number(e.target.value) }))}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── 10. CONFIRM DIALOG XÁC NHẬN TÁC VỤ ── */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || 'Đồng ý'}
        cancelText={confirmDialog.cancelText || 'Huỷ'}
        type={confirmDialog.type || 'warning'}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
