import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bookmark,
  BookmarkFill,
  MicFill,
  PlayFill,
  PauseFill,
  GeoAltFill,
  Image as ImageIcon,
  Plus,
  Search,
  Trash,
  X,
  Buildings,
  Stars,
  ChevronLeft,
  Upload,
  StopFill,
  PencilSquare,
  LayoutSidebarReverse,
} from 'react-bootstrap-icons';
import { Button } from './Button';

export interface JournalAttachment {
  id?: string;
  type: 'image' | 'audio';
  url: string;
  duration?: string; // Ví dụ "01:45" cho audio
  caption?: string;
}

export interface SubMeetingItem {
  id: string;
  dateStr: string;
  timeStr: string;
  title: string;
  content: string;
  mood: {
    label: string;
    icon: string;
    color: string;
    bg: string;
  };
  attachments: JournalAttachment[];
  location?: string;
  clientName?: string;
  projectName?: string;
}

export interface JournalEntry {
  id: string;
  dateStr: string; // Ví dụ "THỨ SÁU, 2 THÁNG 10, 2026"
  timeStr: string; // Ví dụ "16:45"
  title: string;
  content: string;
  mood?: {
    label: string;
    icon: string;
    color: string;
    bg: string;
  };
  location?: string;
  clientName?: string;
  projectName?: string;
  attachments?: JournalAttachment[];
  isBookmarked?: boolean;
  subMeetings?: SubMeetingItem[];
}

// Danh sách ảnh mẫu thực tế của Deco Door để người dùng bấm chọn nhanh 1 chạm
const PRESET_SAMPLE_PHOTOS = [
  { url: '/fac_01.jpg', title: 'Mẫu hoàn thiện cửa gỗ chống cháy EI60 trình thực tế' },
  { url: '/cover_01.webp', title: 'Phối cảnh lắp dựng tại phân khu Aqua Marina' },
  { url: '/cover_02.webp', title: 'Kiểm tra hiện trạng ô chờ tầng 15' },
  { url: '/enterprise-hero.jpg', title: 'Mẫu khóa từ Hafele lắp thử trên cánh cửa mẫu' },
  { url: '/5.jpg', title: 'Mẫu vân gỗ tự nhiên tuyển chọn cho Biệt thự Ecopark' },
];

const PRESET_LOCATIONS = [
  'VP Tập đoàn Novaland, 65 Nguyễn Du, P. Bến Nghé, Q.1',
  'Công trường Dự án Aqua City, Đồng Nai',
  'Đại đô thị Vinhomes Grand Park, TP. Thủ Đức, TP. HCM',
  'Tòa nhà Đất Xanh Group, 2W Ung Văn Khiêm, Q. Bình Thạnh',
  'Văn phòng Ecopark Grand, Văn Giang, Hưng Yên',
  'Nhà máy Sản xuất Deco Door, KCN Nam Tân Uyên, Bình Dương',
];

const PRESET_CLIENTS = [
  'Anh Vũ Đức Thịnh (Trưởng ban QLDA Novaland)',
  'Anh Lê Hoàng Nam (Giám đốc PTDA Đất Xanh)',
  'Ban QLDA Masterise Homes và Tổng thầu Coteccons',
  'Anh Lê Minh Thành (Ban Điều hành Dự án Ecopark)',
  'Anh Đặng Quốc Huy (Chuyên viên Quản lý Thầu)',
];

const PRESET_PROJECTS = [
  'Khu Đô thị Sinh thái Aqua City',
  'Masteri Centre Point',
  'Khu căn hộ cao cấp Opal Boulevard',
  'Khu Đô thị Ecopark Grand The Island',
  'Khu căn hộ Moonlight Centre Point',
  'Nhà máy Dược phẩm và Bệnh viện Quốc tế Vinmec',
];

const INITIAL_ENTRIES: JournalEntry[] = [
  {
    id: 'entry-1',
    dateStr: 'THỨ SÁU, 2 THÁNG 10, 2026',
    timeStr: '16:45',
    title: 'Gặp gỡ Trưởng ban QLDA Novaland - Đàm phán gói cửa gỗ chống cháy Aqua City',
    content:
      'Cuộc làm việc trực tiếp tại VP Novaland diễn ra rất tích cực. Đại diện chủ đầu tư đánh giá cao chất lượng hoàn thiện bề mặt melamine chống cháy của Deco Door. Khách hàng yêu cầu cung cấp thêm chứng chỉ đốt mẫu thực tế EI60 trước ngày 15/10 để trình Hội đồng nghiệm thu cấp phép. Đã thống nhất gửi báo giá cập nhật có chiết khấu theo khối lượng 850 bộ.',
    mood: {
      label: 'Khởi sắc và Thuận lợi',
      icon: '✨',
      color: '#16a34a',
      bg: 'rgba(22, 163, 74, 0.1)',
    },
    location: 'VP Tập đoàn Novaland, 65 Nguyễn Du, P. Bến Nghé, Q.1',
    clientName: 'Anh Vũ Đức Thịnh (Trưởng ban QLDA)',
    projectName: 'Khu Đô thị Sinh thái Aqua City',
    attachments: [
      {
        type: 'image',
        url: '/fac_01.jpg',
        caption: 'Mẫu hoàn thiện cửa gỗ chống cháy EI60 trình thực tế',
      },
      {
        type: 'image',
        url: '/cover_01.webp',
        caption: 'Phối cảnh lắp dựng tại phân khu Aqua Marina',
      },
      {
        type: 'audio',
        url: '#',
        duration: '02:18',
        caption: 'Ghi âm tóm tắt yêu cầu kỹ thuật và tiến độ từ khách hàng',
      },
    ],
    isBookmarked: true,
    subMeetings: [
      {
        id: 'sub-meeting-1',
        dateStr: 'THỨ SÁU, 2 THÁNG 10, 2026',
        timeStr: '22:09',
        title: 'Giao ban cùng đơn vị tư vấn thiết kế',
        content: 'Không thể nào hiểu được',
        mood: {
          label: 'Khởi sắc và Thuận lợi',
          icon: '✨',
          color: '#16a34a',
          bg: 'rgba(22, 163, 74, 0.1)',
        },
        attachments: [],
      },
    ],
  },
  {
    id: 'entry-2',
    dateStr: 'THỨ TƯ, 30 THÁNG 9, 2026',
    timeStr: '10:30',
    title: 'Khảo sát thực địa ô chờ cửa Tháp Masteri Centre Point',
    content:
      'Đi thị sát công trình cùng anh Nam và tổ trưởng giám sát Coteccons. Tầng 12 đến 18 đã hoàn thiện trát tường. Đo đạc ngẫu nhiên 40 ô chờ thì có 15 ô bị lệch dung sai khoảng 4-5mm so với bản vẽ thiết kế ban đầu. Cần lưu ý bộ phận xưởng hiệu chỉnh nẹp chỉ composite bản 65mm để che khít khe hở khi lắp đặt, tránh phát sinh chi phí xử lý nề sau này.',
    mood: {
      label: 'Cần theo dõi kỹ thuật',
      icon: '🔍',
      color: '#d97706',
      bg: 'rgba(217, 119, 6, 0.1)',
    },
    location: 'Đại đô thị Vinhomes Grand Park, TP. Thủ Đức, TP. HCM',
    clientName: 'Ban QLDA Masterise Homes và Tổng thầu Coteccons',
    projectName: 'Masteri Centre Point',
    attachments: [
      {
        type: 'image',
        url: '/cover_02.webp',
        caption: 'Kiểm tra hiện trạng ô chờ tầng 15',
      },
      {
        type: 'audio',
        url: '#',
        duration: '01:05',
        caption: 'Thống nhất phương án bù nẹp với giám sát Coteccons',
      },
    ],
    isBookmarked: false,
  },
  {
    id: 'entry-3',
    dateStr: 'THỨ HAI, 28 THÁNG 9, 2026',
    timeStr: '14:15',
    title: 'Thỏa thuận cấu hình khóa điện tử thông minh Hafele dự án Opal',
    content:
      'Đã chốt danh mục phụ kiện khóa thẻ từ kết hợp mật mã Hafele EL9000 cho 420 căn hộ thuộc dự án Opal. Phía Tập đoàn Đất Xanh đồng ý thanh toán đợt tạm ứng 30% ngay sau khi ký phụ lục hợp đồng thương mại vào thứ Hai tới. Đây là bước tiến quan trọng giúp đảm bảo chỉ tiêu doanh số quý 4 của nhóm.',
    mood: {
      label: 'Chốt hợp đồng thành công',
      icon: '🎯',
      color: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.1)',
    },
    location: 'Tòa nhà Đất Xanh Group, 2W Ung Văn Khiêm, Q. Bình Thạnh',
    clientName: 'Anh Lê Hoàng Nam (Giám đốc PTDA)',
    projectName: 'Khu căn hộ cao cấp Opal Boulevard',
    attachments: [
      {
        type: 'image',
        url: '/enterprise-hero.jpg',
        caption: 'Mẫu khóa từ Hafele lắp thử trên cánh cửa mẫu',
      },
    ],
    isBookmarked: true,
  },
  {
    id: 'entry-4',
    dateStr: 'THỨ SÁU, 25 THÁNG 9, 2026',
    timeStr: '09:20',
    title: 'Ý tưởng phát triển dòng cửa gỗ tự nhiên Tân Cổ Điển cho Villa Ecopark',
    content:
      'Chủ tịch Tập đoàn Ecopark chia sẻ định hướng xây dựng các căn biệt thự Đảo Ecopark Grand theo phong cách tân cổ điển nhẹ nhàng, rất cần dòng cửa gỗ tự nhiên Gõ Đỏ hoặc Óc Chó có pano chạm khắc tinh xảo. Rất tiềm năng nếu xưởng Deco Door chế tạo sẵn 2 mẫu cửa demo để đưa vào phòng trưng bày mẫu tại dự án.',
    mood: {
      label: 'Ý tưởng và Đột phá',
      icon: '💡',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
    },
    location: 'Văn phòng Ecopark Grand, Văn Giang, Hưng Yên',
    clientName: 'Anh Lê Minh Thành (Ban Điều hành Dự án)',
    projectName: 'Khu Đô thị Ecopark Grand The Island',
    attachments: [
      {
        type: 'image',
        url: '/5.jpg',
        caption: 'Mẫu vân gỗ tự nhiên được chủ đầu tư đánh giá cao',
      },
    ],
    isBookmarked: false,
  },
];

const SUGGESTED_PROMPTS = [
  {
    title: 'Kết quả cuộc gặp Novaland hôm nay',
    subtitle: '16:00 • 65 Nguyễn Du, Q.1 • Gặp anh Vũ Đức Thịnh',
    prompt: 'Hôm nay làm việc với Novaland về tiến độ thẩm định hồ sơ cửa chống cháy ra sao? Đã chốt được đơn giá và lịch đốt mẫu PCCC chưa?',
    location: 'VP Tập đoàn Novaland, 65 Nguyễn Du, P. Bến Nghé, Q.1',
    client: 'Anh Vũ Đức Thịnh (Trưởng ban QLDA Novaland)',
    project: 'Khu Đô thị Sinh thái Aqua City',
  },
  {
    title: 'Ghi chép khảo sát công trường Masteri',
    subtitle: '10:00 • Công trường Masteri Centre Point',
    prompt: 'Tình hình đo đạc ô chờ cửa và điều kiện lắp dựng thực tế tại công trường hôm nay có phát sinh vướng mắc gì không?',
    location: 'Đại đô thị Vinhomes Grand Park, TP. Thủ Đức, TP. HCM',
    client: 'Ban QLDA Masterise Homes và Tổng thầu Coteccons',
    project: 'Masteri Centre Point',
  },
  {
    title: 'Thỏa thuận phụ kiện khóa Hafele',
    subtitle: '14:00 • Đất Xanh Group',
    prompt: 'Thống nhất sử dụng khóa thẻ từ kết hợp mật mã Hafele EL9000, bên đối tác đồng ý ký phụ lục hợp đồng thương mại.',
    location: 'Tòa nhà Đất Xanh Group, 2W Ung Văn Khiêm, Q. Bình Thạnh',
    client: 'Anh Lê Hoàng Nam (Giám đốc PTDA Đất Xanh)',
    project: 'Khu căn hộ cao cấp Opal Boulevard',
  },
];

export interface NotebookViewProps {
  department?: string;
  departmentName?: string;
  storageKey?: string;
  initialEntries?: JournalEntry[];
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  department = 'sales',
  departmentName: _departmentName,
  storageKey,
  initialEntries,
  onShowToast: _onShowToast,
  className = '',
  style,
}) => {
  const actualStorageKey = storageKey || `seajong_notebook_${department}`;

  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(actualStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {
      // fallback
    }
    return initialEntries || INITIAL_ENTRIES;
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(actualStorageKey, JSON.stringify(entries));
      }
    } catch {
      // Ignore
    }
  }, [entries, actualStorageKey]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'bookmarked' | 'photos' | 'audio' | 'places'>('all');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Modal Full Screen Tạo mới và Chỉnh sửa
  const [isOpenFullScreenModal, setIsOpenFullScreenModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'write' | 'suggestions'>('write');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formProject, setFormProject] = useState('');
  const [formMood, setFormMood] = useState<{ label: string; icon: string; color: string; bg: string }>({
    label: 'Khởi sắc và Thuận lợi',
    icon: '✨',
    color: '#16a34a',
    bg: 'rgba(22, 163, 74, 0.1)',
  });
  const [formDateStr, setFormDateStr] = useState('THỨ SÁU, 2 THÁNG 10, 2026');
  const [formTimeStr, setFormTimeStr] = useState('16:45');
  const [formBookmarked, setFormBookmarked] = useState(false);
  const [formAttachments, setFormAttachments] = useState<JournalAttachment[]>([]);

  // Ẩn / Hiện panel công cụ bên phải (Inspector)
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Danh sách các cuộc họp tiếp theo được ghi chép liên tiếp xuống dưới
  const [nextMeetings, setNextMeetings] = useState<Array<{
    id: string;
    dateStr: string;
    timeStr: string;
    title: string;
    content: string;
    mood: { label: string; icon: string; color: string; bg: string };
    attachments: JournalAttachment[];
    location?: string;
    clientName?: string;
    projectName?: string;
  }>>([
    {
      id: 'next-init-1',
      dateStr: 'THỨ SÁU, 2 THÁNG 10, 2026',
      timeStr: '17:30',
      title: '',
      content: '',
      mood: {
        label: 'Khởi sắc và Thuận lợi',
        icon: '✨',
        color: '#16a34a',
        bg: 'rgba(22, 163, 74, 0.1)',
      },
      attachments: [],
    },
  ]);

  // State hỗ trợ Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceCaption, setVoiceCaption] = useState('Ghi âm tóm tắt yêu cầu kỹ thuật và tiến độ từ khách hàng');
  const recordTimerRef = useRef<any>(null);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đồng hồ đếm giây ghi âm
  useEffect(() => {
    if (isRecording) {
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  // Bắt đầu ghi âm
  const handleStartRecord = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
  };

  // Dừng và lưu ghi âm vào danh sách đính kèm
  const handleStopRecord = () => {
    setIsRecording(false);
    const mins = Math.floor(recordingSeconds / 60);
    const secs = recordingSeconds % 60;
    const durationFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const duration = recordingSeconds > 0 ? durationFormatted : '01:45';

    setFormAttachments((prev) => [
      ...prev,
      {
        id: `audio-${Date.now()}`,
        type: 'audio',
        url: '#',
        duration,
        caption: voiceCaption.trim() || 'Ghi âm trao đổi thực tế với khách hàng',
      },
    ]);
  };

  // Thêm ảnh từ kho mẫu Deco Door
  const handleAddPresetPhoto = (preset: { url: string; title: string }) => {
    setFormAttachments((prev) => [
      ...prev,
      {
        id: `img-${Date.now()}-${Math.random()}`,
        type: 'image',
        url: preset.url,
        caption: preset.title,
      },
    ]);
  };

  // Tải ảnh từ máy tính / iPad
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormAttachments((prev) => [
        ...prev,
        {
          id: `img-${Date.now()}`,
          type: 'image',
          url: dataUrl,
          caption: file.name.replace(/\.[^/.]+$/, ''),
        },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Xóa đính kèm khỏi form
  const handleRemoveAttachment = (index: number) => {
    setFormAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Cập nhật chú thích ảnh
  const handleUpdateCaption = (index: number, caption: string) => {
    setFormAttachments((prev) =>
      prev.map((att, i) => (i === index ? { ...att, caption } : att))
    );
  };

  // Mở modal tạo mới với Prompt gợi ý
  const handleUsePrompt = (p: (typeof SUGGESTED_PROMPTS)[0]) => {
    setFormTitle(p.title);
    setFormContent(p.prompt);
    setFormLocation(p.location);
    setFormClient(p.client);
    setFormProject(p.project);
    setModalTab('write');
  };

  const createDefaultNextMeeting = () => {
    const now = new Date();
    const dayNames = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
    const dateStr = `${dayNames[now.getDay()]}, ${now.getDate()} THÁNG ${now.getMonth() + 1}, ${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return {
      id: `next-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      dateStr,
      timeStr,
      title: '',
      content: '',
      mood: {
        label: 'Khởi sắc và Thuận lợi',
        icon: '✨',
        color: '#16a34a',
        bg: 'rgba(22, 163, 74, 0.1)',
      },
      attachments: [] as JournalAttachment[],
    };
  };

  // Helper functions cho các cuộc họp tiếp theo
  const handleUpdateNextMeeting = (index: number, field: string, value: any) => {
    setNextMeetings((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveNextMeeting = (index: number) => {
    setNextMeetings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMoreMeetingSection = () => {
    setNextMeetings((prev) => [...prev, createDefaultNextMeeting()]);
  };

  const handleAddPresetToNextMeeting = (index: number, preset: { url: string; title: string }) => {
    setNextMeetings((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              attachments: [
                ...item.attachments,
                {
                  id: `img-${Date.now()}-${Math.random()}`,
                  type: 'image',
                  url: preset.url,
                  caption: preset.title,
                },
              ],
            }
          : item
      )
    );
  };

  const handleAddAudioToNextMeeting = (index: number) => {
    setNextMeetings((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              attachments: [
                ...item.attachments,
                {
                  id: `audio-${Date.now()}-${Math.random()}`,
                  type: 'audio',
                  url: '#',
                  duration: '01:45',
                  caption: 'Ghi âm cuộc họp tiếp theo',
                },
              ],
            }
          : item
      )
    );
  };

  // Mở Full Screen Modal với dữ liệu mẫu hoặc form trống
  const handleOpenCreateFullScreen = (withDemoDocs: boolean = false) => {
    setEditingEntryId(null);
    const now = new Date();
    const dayNames = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
    const dateStr = `${dayNames[now.getDay()]}, ${now.getDate()} THÁNG ${now.getMonth() + 1}, ${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setFormDateStr(dateStr);
    setFormTimeStr(timeStr);

    if (withDemoDocs) {
      setFormTitle('Gặp gỡ Trưởng ban QLDA Novaland - Đàm phán gói cửa gỗ chống cháy Aqua City');
      setFormContent(
        'Cuộc làm việc trực tiếp tại VP Novaland diễn ra rất tích cực. Đại diện chủ đầu tư đánh giá cao chất lượng hoàn thiện bề mặt melamine chống cháy của Deco Door. Khách hàng yêu cầu cung cấp thêm chứng chỉ đốt mẫu thực tế EI60 trước ngày 15/10 để trình Hội đồng nghiệm thu cấp phép. Đã thống nhất gửi báo giá cập nhật có chiết khấu theo khối lượng 850 bộ.'
      );
      setFormLocation('VP Tập đoàn Novaland, 65 Nguyễn Du, P. Bến Nghé, Q.1');
      setFormClient('Anh Vũ Đức Thịnh (Trưởng ban QLDA)');
      setFormProject('Khu Đô thị Sinh thái Aqua City');
      setFormMood({
        label: 'Khởi sắc và Thuận lợi',
        icon: '✨',
        color: '#16a34a',
        bg: 'rgba(22, 163, 74, 0.1)',
      });
      setFormBookmarked(true);
      setFormAttachments([
        {
          id: 'att-1',
          type: 'image',
          url: '/fac_01.jpg',
          caption: 'Mẫu hoàn thiện cửa gỗ chống cháy EI60 trình thực tế',
        },
        {
          id: 'att-2',
          type: 'image',
          url: '/cover_01.webp',
          caption: 'Phối cảnh lắp dựng tại phân khu Aqua Marina',
        },
        {
          id: 'att-3',
          type: 'audio',
          url: '#',
          duration: '02:18',
          caption: 'Ghi âm tóm tắt yêu cầu kỹ thuật và tiến độ từ khách hàng',
        },
      ]);
    } else {
      setFormTitle('');
      setFormContent('');
      setFormLocation('');
      setFormClient('');
      setFormProject('');
      setFormBookmarked(false);
      setFormAttachments([]);
    }
    setNextMeetings([createDefaultNextMeeting()]);
    setModalTab('write');
    setIsOpenFullScreenModal(true);
  };

  // Mở Full Screen Modal để chỉnh sửa / tiếp tục ghi chép mục đã có
  const handleOpenEditEntry = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setFormDateStr(entry.dateStr || 'THỨ SÁU, 2 THÁNG 10, 2026');
    setFormTimeStr(entry.timeStr || '16:45');
    setFormTitle(entry.title || '');
    setFormContent(entry.content || '');
    setFormLocation(entry.location || '');
    setFormClient(entry.clientName || '');
    setFormProject(entry.projectName || '');
    if (entry.mood) {
      setFormMood(entry.mood);
    }
    setFormBookmarked(!!entry.isBookmarked);
    setFormAttachments(entry.attachments ? [...entry.attachments] : []);
    if (entry.subMeetings && entry.subMeetings.length > 0) {
      setNextMeetings(
        entry.subMeetings.map((sub) => ({
          id: sub.id,
          dateStr: sub.dateStr,
          timeStr: sub.timeStr,
          title: sub.title,
          content: sub.content,
          mood: sub.mood || {
            label: 'Khởi sắc và Thuận lợi',
            icon: '✨',
            color: '#16a34a',
            bg: 'rgba(22, 163, 74, 0.1)',
          },
          attachments: sub.attachments || [],
          location: sub.location,
          clientName: sub.clientName,
          projectName: sub.projectName,
        }))
      );
    } else {
      setNextMeetings([createDefaultNextMeeting()]);
    }
    setModalTab('write');
    setIsOpenFullScreenModal(true);
  };

  // Lưu mục nhật ký (Tạo mới hoặc Cập nhật)
  const handleSaveEntry = () => {
    const hasMainContent = formTitle.trim().length > 0 || formContent.trim().length > 0;
    const validNext = nextMeetings.filter(
      (nm) => nm.title.trim().length > 0 || nm.content.trim().length > 0
    );

    if (!hasMainContent && validNext.length === 0) {
      alert('Vui lòng nhập tiêu đề hoặc nội dung nhật ký!');
      return;
    }

    if (editingEntryId) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingEntryId
            ? {
                ...entry,
                dateStr: formDateStr || entry.dateStr,
                timeStr: formTimeStr || entry.timeStr,
                title: formTitle.trim() || 'Ghi chép công tác',
                content: formContent.trim(),
                mood: formMood,
                location: formLocation.trim() || undefined,
                clientName: formClient.trim() || undefined,
                projectName: formProject.trim() || undefined,
                attachments: formAttachments.length > 0 ? formAttachments : undefined,
                isBookmarked: formBookmarked,
                subMeetings: validNext.length > 0 ? validNext : undefined,
              }
            : entry
        )
      );
    } else {
      const newEntry: JournalEntry = {
        id: `entry-${Date.now()}`,
        dateStr: formDateStr || 'THỨ SÁU, 2 THÁNG 10, 2026',
        timeStr: formTimeStr || '16:45',
        title: formTitle.trim() || 'Ghi chép công tác',
        content: formContent.trim(),
        mood: formMood,
        location: formLocation.trim() || undefined,
        clientName: formClient.trim() || undefined,
        projectName: formProject.trim() || undefined,
        attachments: formAttachments.length > 0 ? formAttachments : undefined,
        isBookmarked: formBookmarked,
        subMeetings: validNext.length > 0 ? validNext : undefined,
      };

      setEntries((prev) => [newEntry, ...prev]);
    }

    setEditingEntryId(null);
    setIsOpenFullScreenModal(false);
  };

  // Toggle Bookmark trên thẻ
  const handleToggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, isBookmarked: !entry.isBookmarked } : entry))
    );
  };

  // Xóa mục
  const handleDeleteEntry = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa mục nhật ký này?')) {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    }
  };

  // Toggle Play Audio
  const handleTogglePlayAudio = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
    }
  };

  // Lọc danh sách thẻ
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = entry.title.toLowerCase().includes(q);
        const matchContent = entry.content.toLowerCase().includes(q);
        const matchClient = entry.clientName?.toLowerCase().includes(q) || false;
        const matchProject = entry.projectName?.toLowerCase().includes(q) || false;
        const matchLocation = entry.location?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchContent && !matchClient && !matchProject && !matchLocation) {
          return false;
        }
      }

      if (activeFilter === 'bookmarked') return entry.isBookmarked;
      if (activeFilter === 'photos') return entry.attachments?.some((a) => a.type === 'image');
      if (activeFilter === 'audio') return entry.attachments?.some((a) => a.type === 'audio');
      if (activeFilter === 'places') return Boolean(entry.location);

      return true;
    });
  }, [entries, searchQuery, activeFilter]);

  return (
    <div
      className={`sales-journal-container custom-scrollbar ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface-2)',
        overflowY: 'auto',
        padding: '24px 16px 80px 16px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* ── 1. THANH TÌM KIẾM VÀ NÚT TẠO MỚI (CÙNG DÒNG) + BỘ LỌC ── */}
      <div
        style={{
          maxWidth: '820px',
          width: '100%',
          margin: '0 auto 20px auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '14px',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="decodoor-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nhật ký, khách hàng, công trình, dự án..."
              style={{
                width: '100%',
                height: '40px',
                paddingLeft: '38px',
                paddingRight: '14px',
                borderRadius: '12px',
                fontSize: '0.875rem',
                backgroundColor: 'var(--bg-surface-1)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => handleOpenCreateFullScreen(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '40px',
              padding: '0 18px',
              borderRadius: '12px',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              flexShrink: 0,
            }}
          >
            <Plus size={20} />
            <span>Tạo mới</span>
          </Button>
        </div>

        {/* Filter Pills chuẩn iOS Journal */}
        <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '2px',
            }}
          >
            {[
              { id: 'all', label: 'Tất cả mục', icon: null },
              { id: 'bookmarked', label: 'Đã đánh dấu', icon: <BookmarkFill size={12} style={{ color: '#f59e0b' }} /> },
              { id: 'photos', label: 'Có hình ảnh', icon: <ImageIcon size={13} /> },
              { id: 'audio', label: 'Ghi âm giọng nói', icon: <MicFill size={13} style={{ color: '#ef4444' }} /> },
              { id: 'places', label: 'Địa điểm và Công trình', icon: <GeoAltFill size={13} style={{ color: '#06b6d4' }} /> },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id as any)}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--color-primary)' : 'var(--border-default)',
                    backgroundColor: isActive ? 'var(--color-primary)' : 'var(--bg-surface-1)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 6px rgba(79, 70, 229, 0.25)' : 'none',
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      {/* ── 2. DANH SÁCH THẺ NHẬT KÝ (RICH CARD FEED ĐẸP CHUẨN HÌNH 2) ── */}
      <div
        style={{
          maxWidth: '820px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => {
            const hasImages = entry.attachments?.filter((a) => a.type === 'image') || [];
            const hasAudio = entry.attachments?.find((a) => a.type === 'audio');

            return (
              <div
                key={entry.id}
                className="journal-entry-card"
                style={{
                  backgroundColor: 'var(--bg-surface-1)',
                  borderRadius: '22px',
                  border: '1px solid var(--border-default)',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.05)',
                  padding: '22px 26px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Header Thẻ: Thời gian, Cảm xúc, Bookmark và Xóa */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {entry.dateStr} • {entry.timeStr}
                    </span>
                    {entry.mood && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: entry.mood.bg,
                          color: entry.mood.color,
                        }}
                      >
                        <span>{entry.mood.icon}</span>
                        <span>{entry.mood.label}</span>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={(e) => handleToggleBookmark(entry.id, e)}
                      title={entry.isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu quan trọng'}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        color: entry.isBookmarked ? '#f59e0b' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {entry.isBookmarked ? <BookmarkFill size={18} /> : <Bookmark size={18} />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteEntry(entry.id, e)}
                      title="Xóa mục nhật ký"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Trash size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditEntry(entry)}
                      title="Chỉnh sửa và Tiếp tục ghi chép"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <PencilSquare size={15} />
                    </button>
                  </div>
                </div>

                {/* Tiêu đề và Nội dung */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h2
                    onClick={() => handleOpenEditEntry(entry)}
                    title="Nhấn để mở và tiếp tục ghi chép"
                    style={{
                      margin: 0,
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      lineHeight: 1.35,
                      cursor: 'pointer',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  >
                    {entry.title}
                  </h2>
                  <p
                    onClick={() => handleOpenEditEntry(entry)}
                    title="Nhấn để tiếp tục ghi chép"
                    style={{
                      margin: 0,
                      fontSize: '0.90625rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      cursor: 'pointer',
                    }}
                  >
                    {entry.content}
                  </p>
                </div>

                {/* Grid Hình ảnh đính kèm (Collage kiểu Apple) */}
                {hasImages.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: hasImages.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                      gap: '10px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      marginTop: '4px',
                    }}
                  >
                    {hasImages.map((img, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          height: hasImages.length === 1 ? '280px' : '190px',
                          borderRadius: '14px',
                          overflow: 'hidden',
                          backgroundColor: 'var(--bg-surface-2)',
                        }}
                      >
                        <img
                          src={img.url}
                          alt={img.caption || 'Hình ảnh nhật ký'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        {img.caption && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              padding: '8px 12px',
                              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)',
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {img.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Ghi âm giọng nói (Voice Memo Waveform Player) */}
                {hasAudio && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      marginTop: '4px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleTogglePlayAudio(entry.id, e)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 3px 10px rgba(239, 68, 68, 0.4)',
                        flexShrink: 0,
                      }}
                    >
                      {playingAudioId === entry.id ? <PauseFill size={20} /> : <PlayFill size={20} style={{ marginLeft: '2px' }} />}
                    </button>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {hasAudio.caption || 'Ghi âm thực tế'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 800 }}>
                          {playingAudioId === entry.id ? 'Đang phát...' : hasAudio.duration}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '16px' }}>
                        {[40, 70, 90, 60, 100, 30, 80, 50, 70, 95, 45, 80, 60, 100, 40, 70, 85, 50, 65, 90, 40].map((h, i) => (
                          <div
                            key={i}
                            style={{
                              width: '3.5px',
                              height: `${h}%`,
                              borderRadius: '2px',
                              backgroundColor: playingAudioId === entry.id ? '#ef4444' : 'rgba(239, 68, 68, 0.35)',
                              transition: 'height 0.2s ease',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cuộc họp tiếp theo thuộc cùng một ghi chép (subMeetings) */}
                {entry.subMeetings && entry.subMeetings.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    {entry.subMeetings.map((sub, sIdx) => (
                      <div
                        key={sub.id || sIdx}
                        onClick={() => handleOpenEditEntry(entry)}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '14px',
                          backgroundColor: 'var(--bg-surface-2)',
                          border: '1px solid var(--border-default)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.71875rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                            {sub.dateStr} • {sub.timeStr}
                          </span>
                          {sub.mood && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                backgroundColor: sub.mood.bg,
                                color: sub.mood.color,
                              }}
                            >
                              <span>{sub.mood.icon}</span>
                              <span>{sub.mood.label}</span>
                            </span>
                          )}
                        </div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            lineHeight: 1.35,
                          }}
                        >
                          {sub.title}
                        </h4>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.55,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {sub.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Thẻ: Địa điểm, Khách hàng và Dự án */}
                {(entry.location || entry.clientName || entry.projectName) && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '0.78125rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {entry.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <GeoAltFill size={13} style={{ color: '#06b6d4' }} />
                        <span>{entry.location}</span>
                      </div>
                    )}
                    {entry.clientName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Buildings size={13} style={{ color: 'var(--color-primary)' }} />
                        <span>{entry.clientName}</span>
                      </div>
                    )}
                    {entry.projectName && (
                      <div
                        style={{
                          backgroundColor: 'rgba(79, 70, 229, 0.08)',
                          color: 'var(--color-primary)',
                          borderRadius: '8px',
                          padding: '2px 8px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {entry.projectName}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface-1)',
              borderRadius: '22px',
              border: '1px solid var(--border-default)',
            }}
          >
            <Stars size={40} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Không tìm thấy mục nhật ký nào
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Hãy thử tìm kiếm với từ khóa khác hoặc bấm nút Tạo mục mới để ghi chép cuộc gặp
            </p>
          </div>
        )}
      </div>

      {/* ── 3. MODAL TOÀN MÀN HÌNH (FULL SCREEN JOURNAL EDITOR) CHUẨN ĐẲNG CẤP APPLE ── */}
      {isOpenFullScreenModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'var(--bg-surface-1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top Bar kiểu iOS */}
          <div
            style={{
              height: '56px',
              padding: '0 20px',
              borderBottom: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            {/* Nút Hủy / Quay lại */}
            <button
              type="button"
              onClick={() => {
                setIsOpenFullScreenModal(false);
                setEditingEntryId(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-primary)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '8px',
              }}
            >
              <ChevronLeft size={18} />
              <span>Hủy</span>
            </button>

            {/* Chuyển đổi giữa Soạn thảo và Gợi ý khoảnh khắc */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: '10px',
                padding: '3px',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setModalTab('write')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: modalTab === 'write' ? 700 : 500,
                  backgroundColor: modalTab === 'write' ? 'var(--bg-surface-1)' : 'transparent',
                  color: modalTab === 'write' ? 'var(--color-primary)' : 'var(--text-secondary)',
                  boxShadow: modalTab === 'write' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Soạn nhật ký
              </button>
              <button
                type="button"
                onClick={() => setModalTab('suggestions')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: modalTab === 'suggestions' ? 700 : 500,
                  backgroundColor: modalTab === 'suggestions' ? 'var(--bg-surface-1)' : 'transparent',
                  color: modalTab === 'suggestions' ? 'var(--color-primary)' : 'var(--text-secondary)',
                  boxShadow: modalTab === 'suggestions' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Stars size={14} style={{ color: '#a855f7' }} />
                <span>Gợi ý khoảnh khắc</span>
              </button>
            </div>

            {/* Nhóm nút bên phải: Ẩn/Hiện Công cụ + Lưu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowRightPanel((prev) => !prev)}
                title={showRightPanel ? 'Ẩn bảng công cụ bên phải' : 'Hiện bảng công cụ bên phải'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '18px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: showRightPanel ? 'var(--bg-surface-2)' : 'var(--bg-surface-1)',
                  color: showRightPanel ? 'var(--color-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <LayoutSidebarReverse size={15} />
                <span>{showRightPanel ? 'Ẩn công cụ' : 'Hiện công cụ'}</span>
              </button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEntry}
                style={{
                  height: '36px',
                  borderRadius: '18px',
                  padding: '0 20px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  boxShadow: '0 3px 12px rgba(79, 70, 229, 0.3)',
                }}
              >
                {editingEntryId ? 'Lưu thay đổi' : 'Lưu nhật ký'}
              </Button>
            </div>
          </div>

          {/* Vùng nội dung Full Screen (Layout 2 cột: Canvas Viết bên trái + Thanh Công cụ Trợ lý bên phải) */}
          {modalTab === 'suggestions' ? (
            <div
              className="custom-scrollbar"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '30px 20px',
                maxWidth: '780px',
                width: '100%',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Gợi ý khoảnh khắc ghi chép hôm nay
                </h2>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Chọn nhanh 1 gợi ý bên dưới để tự động nạp tiêu đề, bối cảnh và bắt đầu viết nhật ký:
                </p>
              </div>

              {SUGGESTED_PROMPTS.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handleUsePrompt(p)}
                  style={{
                    padding: '20px',
                    borderRadius: '18px',
                    backgroundColor: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      {p.title}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                      Sử dụng gợi ý này →
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{p.subtitle}</div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    "{p.prompt}"
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                overflow: 'hidden',
              }}
            >
              {/* ── CỘT TRÁI: CANVAS SOẠN THẢO VÀ XEM TRƯỚC TÀI LIỆU (NHƯ HÌNH 2) ── */}
              <div
                className="custom-scrollbar"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: showRightPanel ? '30px 40px 80px 40px' : '30px 60px 80px 60px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxWidth: showRightPanel ? '860px' : '980px',
                  margin: '0 auto',
                  width: '100%',
                  boxSizing: 'border-box',
                  transition: 'padding 0.2s ease, max-width 0.2s ease',
                }}
              >
                {/* Ngày giờ hiện tại và Cảm xúc */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                      {formDateStr} • {formTimeStr}
                    </span>
                    {formMood && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: formMood.bg,
                          color: formMood.color,
                        }}
                      >
                        <span>{formMood.icon}</span>
                        <span>{formMood.label}</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormBookmarked(!formBookmarked)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: formBookmarked ? '#f59e0b' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {formBookmarked ? <BookmarkFill size={16} /> : <Bookmark size={16} />}
                    <span>{formBookmarked ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
                  </button>
                </div>

                {/* Tiêu đề không viền lớn chuẩn Apple Notes / Journal */}
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Tiêu đề nhật ký (ví dụ: Gặp gỡ đại diện Novaland...)"
                  style={{
                    fontSize: '1.65rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    marginBottom: '14px',
                    padding: '0',
                    width: '100%',
                    letterSpacing: '-0.02em',
                  }}
                  autoFocus
                />

                {/* Nội dung chi tiết chuẩn giấy viết ghi chép */}
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Ghi lại nội dung cuộc gặp gỡ, đàm phán hợp đồng hoặc những ý tưởng kinh doanh hôm nay..."
                  rows={6}
                  style={{
                    fontSize: '1.05rem',
                    lineHeight: 1.7,
                    color: 'var(--text-secondary)',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    resize: 'none',
                    width: '100%',
                    padding: '0',
                    marginBottom: '20px',
                    minHeight: '120px',
                  }}
                />

                {/* ── PREVIEW TÀI LIỆU ĐÍNH KÈM THỰC TẾ TRỰC TIẾP (CHUẨN HÌNH 2) ── */}
                {/* 1. Lưới hình ảnh đính kèm (Collage) */}
                {formAttachments.filter((a) => a.type === 'image').length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      HÌNH ẢNH HIỆN TRƯỜNG VÀ MẪU CỬA ({formAttachments.filter((a) => a.type === 'image').length})
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: formAttachments.filter((a) => a.type === 'image').length === 1 ? '1fr' : 'repeat(2, 1fr)',
                        gap: '12px',
                        borderRadius: '16px',
                      }}
                    >
                      {formAttachments
                        .filter((a) => a.type === 'image')
                        .map((img, idx) => {
                          const originalIdx = formAttachments.findIndex((x) => x.id === img.id || x.url === img.url);
                          return (
                            <div
                              key={idx}
                              style={{
                                position: 'relative',
                                height: '200px',
                                borderRadius: '14px',
                                overflow: 'hidden',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface-2)',
                              }}
                            >
                              <img
                                src={img.url}
                                alt={img.caption}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              {/* Nút xóa ảnh */}
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(originalIdx)}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(0,0,0,0.65)',
                                  color: '#ffffff',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <X size={16} />
                              </button>
                              {/* Ô nhập chú thích ảnh trực tiếp */}
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  padding: '8px 10px',
                                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                                }}
                              >
                                <input
                                  type="text"
                                  value={img.caption || ''}
                                  onChange={(e) => handleUpdateCaption(originalIdx, e.target.value)}
                                  placeholder="Nhập chú thích ảnh..."
                                  style={{
                                    width: '100%',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#ffffff',
                                    fontSize: '0.78125rem',
                                    fontWeight: 600,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 2. Thanh phát Voice Memo đính kèm */}
                {formAttachments.filter((a) => a.type === 'audio').length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      GHI ÂM GIỌNG NÓI ({formAttachments.filter((a) => a.type === 'audio').length})
                    </div>
                    {formAttachments
                      .filter((a) => a.type === 'audio')
                      .map((aud, idx) => {
                        const originalIdx = formAttachments.findIndex((x) => x.id === aud.id);
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '12px 16px',
                              borderRadius: '14px',
                              backgroundColor: 'rgba(239, 68, 68, 0.06)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              position: 'relative',
                            }}
                          >
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 3px 10px rgba(239, 68, 68, 0.35)',
                              }}
                            >
                              <PlayFill size={20} style={{ marginLeft: '2px' }} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <input
                                  type="text"
                                  value={aud.caption || ''}
                                  onChange={(e) => handleUpdateCaption(originalIdx, e.target.value)}
                                  placeholder="Tiêu đề đoạn ghi âm..."
                                  style={{
                                    border: 'none',
                                    outline: 'none',
                                    backgroundColor: 'transparent',
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    width: '80%',
                                  }}
                                />
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 800 }}>
                                  {aud.duration}
                                </span>
                              </div>
                              {/* Waveform */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '14px' }}>
                                {[40, 70, 90, 60, 100, 30, 80, 50, 70, 95, 45, 80, 60, 100, 40, 70, 85, 50, 65, 90, 40].map((h, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      width: '3.5px',
                                      height: `${h}%`,
                                      borderRadius: '2px',
                                      backgroundColor: 'rgba(239, 68, 68, 0.4)',
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            {/* Xóa audio */}
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(originalIdx)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                            >
                              <X size={18} />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* 3. Thẻ Vị trí, Khách hàng và Dự án liên quan */}
                {(formLocation || formClient || formProject) && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-surface-2)',
                      border: '1px solid var(--border-default)',
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {formLocation && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <GeoAltFill size={13} style={{ color: '#06b6d4' }} />
                        <span>{formLocation}</span>
                      </div>
                    )}
                    {formClient && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Buildings size={13} style={{ color: 'var(--color-primary)' }} />
                        <span>{formClient}</span>
                      </div>
                    )}
                    {formProject && (
                      <div
                        style={{
                          backgroundColor: 'rgba(79, 70, 229, 0.1)',
                          color: 'var(--color-primary)',
                          borderRadius: '8px',
                          padding: '2px 8px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {formProject}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TIẾP TỤC GHI CHÉP CUỘC HỌP TIẾP THEO (HIỂN THỊ XUỐNG DƯỚI) ── */}
                <div style={{ margin: '42px 0 20px 0', position: 'relative' }}>
                  <div style={{ height: '1px', backgroundColor: 'var(--border-default)', width: '100%' }} />
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'var(--bg-surface-1)',
                      padding: '0 16px',
                      color: 'var(--text-muted)',
                      fontSize: '0.78125rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span>✦ Ghi chép cuộc họp tiếp theo</span>
                  </div>
                </div>

                {nextMeetings.map((nm, nIdx) => (
                  <div
                    key={nm.id}
                    style={{
                      padding: '22px 24px',
                      borderRadius: '18px',
                      backgroundColor: 'var(--bg-surface-2)',
                      border: '1px solid var(--border-default)',
                      marginBottom: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {/* Header Ngày Tháng Năm và Giờ của cuộc họp tiếp theo */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={nm.dateStr}
                          onChange={(e) => handleUpdateNextMeeting(nIdx, 'dateStr', e.target.value)}
                          placeholder="Ngày tháng năm..."
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 800,
                            color: 'var(--text-primary)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            letterSpacing: '0.04em',
                            width: '210px',
                          }}
                        />
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <input
                          type="text"
                          value={nm.timeStr}
                          onChange={(e) => handleUpdateNextMeeting(nIdx, 'timeStr', e.target.value)}
                          placeholder="Giờ..."
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 800,
                            color: 'var(--color-primary)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            width: '55px',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Selector Cảm xúc cuộc họp */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { label: 'Khởi sắc', icon: '✨', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
                            { label: 'Chốt HĐ', icon: '🎯', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
                            { label: 'Kỹ thuật', icon: '🔍', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
                          ].map((m, mIdx) => (
                            <button
                              key={mIdx}
                              type="button"
                              onClick={() => handleUpdateNextMeeting(nIdx, 'mood', m)}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                border: nm.mood.label === m.label ? `1px solid ${m.color}` : '1px solid transparent',
                                backgroundColor: nm.mood.label === m.label ? m.bg : 'var(--bg-surface-1)',
                                color: m.color,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {m.icon} {m.label}
                            </button>
                          ))}
                        </div>
                        {nextMeetings.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveNextMeeting(nIdx)}
                            title="Xóa khối cuộc họp này"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px 4px',
                            }}
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tiêu đề cuộc họp tiếp theo */}
                    <input
                      type="text"
                      value={nm.title}
                      onChange={(e) => handleUpdateNextMeeting(nIdx, 'title', e.target.value)}
                      placeholder="Tiêu đề cuộc họp tiếp theo (ví dụ: Khảo sát thực địa, Họp kỹ thuật xưởng...)"
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        width: '100%',
                        padding: '0',
                      }}
                    />

                    {/* Nội dung cuộc họp tiếp theo */}
                    <textarea
                      value={nm.content}
                      onChange={(e) => handleUpdateNextMeeting(nIdx, 'content', e.target.value)}
                      placeholder="Ghi lại chi tiết nội dung cuộc họp tiếp theo, các thỏa thuận và hạng mục cần theo dõi..."
                      rows={4}
                      style={{
                        fontSize: '0.9375rem',
                        lineHeight: 1.65,
                        color: 'var(--text-secondary)',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        resize: 'none',
                        width: '100%',
                        padding: '0',
                      }}
                    />

                    {/* Thanh công cụ phụ kiện đính kèm nhanh */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-default)', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleAddPresetToNextMeeting(nIdx, PRESET_SAMPLE_PHOTOS[0])}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface-1)',
                            fontSize: '0.71875rem',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          <ImageIcon size={12} style={{ color: '#06b6d4' }} />
                          <span>+ Mẫu cửa chống cháy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddPresetToNextMeeting(nIdx, PRESET_SAMPLE_PHOTOS[1])}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface-1)',
                            fontSize: '0.71875rem',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          <ImageIcon size={12} style={{ color: '#06b6d4' }} />
                          <span>+ Ảnh hiện trường</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddAudioToNextMeeting(nIdx)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-surface-1)',
                            fontSize: '0.71875rem',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                        >
                          <MicFill size={12} />
                          <span>+ Ghi âm</span>
                        </button>
                      </div>

                      <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                        ✓ Tự động lưu khi bấm "Lưu thay đổi"
                      </span>
                    </div>

                    {/* Preview ảnh và audio của cuộc họp tiếp theo */}
                    {nm.attachments.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        {nm.attachments.map((att, aIdx) => (
                          <div
                            key={aIdx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--bg-surface-1)',
                              border: '1px solid var(--border-default)',
                              fontSize: '0.75rem',
                              color: att.type === 'audio' ? '#ef4444' : 'var(--color-primary)',
                              fontWeight: 600,
                            }}
                          >
                            {att.type === 'audio' ? <MicFill size={13} /> : <ImageIcon size={13} />}
                            <span>{att.caption || 'Tài liệu đính kèm'}</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateNextMeeting(
                                  nIdx,
                                  'attachments',
                                  nm.attachments.filter((_, i) => i !== aIdx)
                                )
                              }
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: 0,
                                marginLeft: '2px',
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Nút thêm cuộc họp khác vào sổ */}
                <button
                  type="button"
                  onClick={handleAddMoreMeetingSection}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: '1px dashed var(--border-default)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    marginBottom: '28px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                  }}
                >
                  <Plus size={16} />
                  <span>+ Thêm cuộc họp khác vào sổ ghi chép</span>
                </button>

                {/* ── CÁC MỤC GHI CHÉP KHÁC TRONG SỔ (HIỂN THỊ THEO DÒNG THỜI GIAN) ── */}
                {entries.filter((e) => e.id !== editingEntryId).length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.78125rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Các ghi chép cuộc họp trước đó ({entries.filter((e) => e.id !== editingEntryId).length})
                    </div>
                    {entries
                      .filter((e) => e.id !== editingEntryId)
                      .map((otherEntry) => (
                        <div
                          key={otherEntry.id}
                          onClick={() => handleOpenEditEntry(otherEntry)}
                          style={{
                            padding: '14px 18px',
                            borderRadius: '14px',
                            backgroundColor: 'var(--bg-surface-1)',
                            border: '1px solid var(--border-default)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.transform = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.71875rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                {otherEntry.dateStr} • {otherEntry.timeStr}
                              </span>
                              {otherEntry.mood && (
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: otherEntry.mood.color }}>
                                  {otherEntry.mood.icon} {otherEntry.mood.label}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.90625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {otherEntry.title}
                            </div>
                            <div
                              style={{
                                fontSize: '0.8125rem',
                                color: 'var(--text-secondary)',
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {otherEntry.content}
                            </div>
                          </div>

                          <button
                            type="button"
                            style={{
                              padding: '5px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-surface-2)',
                              color: 'var(--color-primary)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Mở mục này →
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* ── CỘT PHẢI: BỘ CÔNG CỤ HỖ TRỢ NGƯỜI DÙNG TẠO TÀI LIỆU ĐẸP (INSPECTOR TOOLBOX) ── */}
              {showRightPanel && (
                <div
                  className="custom-scrollbar"
                  style={{
                    width: '380px',
                    backgroundColor: 'var(--bg-surface-2)',
                    borderLeft: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    padding: '24px 20px',
                    gap: '24px',
                    flexShrink: 0,
                  }}
                >
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Công cụ hỗ trợ tài liệu
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78125rem', color: 'var(--text-secondary)' }}>
                    Thêm ảnh hiện trường, bản ghi âm giọng nói và vị trí công trình như Hình 2
                  </p>
                </div>

                {/* 1. HÌNH ẢNH VÀ BẢN VẼ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={15} style={{ color: '#06b6d4' }} />
                      <span>Hình ảnh hiện trường và Mẫu</span>
                    </span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-1)',
                        color: 'var(--color-primary)',
                        fontSize: '0.71875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Upload size={12} />
                      <span>Tải ảnh lên</span>
                    </button>
                  </div>

                  {/* Chọn nhanh ảnh mẫu thực tế từ xưởng Deco Door */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                      Chọn nhanh ảnh công trình mẫu Deco Door:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {PRESET_SAMPLE_PHOTOS.map((p, i) => (
                        <div
                          key={i}
                          onClick={() => handleAddPresetPhoto(p)}
                          style={{
                            height: '65px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-default)',
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                          title={p.title}
                        >
                          <img src={p.url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: 'rgba(0,0,0,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0,
                              transition: 'opacity 0.15s ease',
                              color: '#fff',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                          >
                            + Thêm
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. GHI ÂM GIỌNG NÓI (VOICE MEMO) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MicFill size={15} style={{ color: '#ef4444' }} />
                    <span>Ghi âm giọng nói (Voice Memo)</span>
                  </span>

                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-surface-1)',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <input
                      type="text"
                      value={voiceCaption}
                      onChange={(e) => setVoiceCaption(e.target.value)}
                      placeholder="Tiêu đề đoạn ghi âm..."
                      style={{
                        height: '32px',
                        fontSize: '0.78125rem',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-2)',
                      }}
                    />

                    {isRecording ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: '#ef4444',
                              animation: 'pulse 1s infinite',
                            }}
                          />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ef4444' }}>
                            Đang ghi âm: {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                          </span>
                        </div>
                        <Button variant="danger" size="sm" onClick={handleStopRecord} style={{ height: '30px', fontSize: '0.75rem' }}>
                          <StopFill size={14} /> Dừng và Lưu
                        </Button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Thu âm cuộc gặp đối tác hoặc ghi chú
                        </span>
                        <Button variant="secondary" size="sm" onClick={handleStartRecord} style={{ height: '30px', fontSize: '0.75rem' }}>
                          <MicFill size={13} style={{ color: '#ef4444' }} /> Bắt đầu ghi
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. CẢM XÚC / ĐÁNH GIÁ (MOOD) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Stars size={15} style={{ color: '#f59e0b' }} />
                    <span>Cảm xúc và Đánh giá cuộc gặp</span>
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { label: 'Khởi sắc và Thuận lợi', icon: '✨', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
                      { label: 'Chốt hợp đồng thành công', icon: '🎯', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
                      { label: 'Cần theo dõi kỹ thuật', icon: '🔍', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
                      { label: 'Ý tưởng và Đột phá', icon: '💡', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
                    ].map((m, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormMood(m)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '12px',
                          border: formMood.label === m.label ? `2px solid ${m.color}` : '1px solid var(--border-default)',
                          backgroundColor: formMood.label === m.label ? m.bg : 'var(--bg-surface-1)',
                          color: m.color,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {m.icon} {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. ĐỊA ĐIỂM VÀ CÔNG TRÌNH */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GeoAltFill size={14} style={{ color: '#06b6d4' }} />
                    <span>Địa điểm và Công trình</span>
                  </span>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Nhập địa chỉ hoặc chọn gợi ý bên dưới..."
                    style={{
                      height: '34px',
                      fontSize: '0.78125rem',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-1)',
                    }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {PRESET_LOCATIONS.slice(0, 3).map((loc, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormLocation(loc)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-surface-1)',
                          fontSize: '0.6875rem',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        + {loc.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. KHÁCH HÀNG VÀ DỰ ÁN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Buildings size={14} style={{ color: 'var(--color-primary)' }} />
                    <span>Khách hàng và Dự án</span>
                  </span>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.71875rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Đại diện đối tác:
                    </label>
                    <input
                      type="text"
                      value={formClient}
                      onChange={(e) => setFormClient(e.target.value)}
                      placeholder="Người liên hệ..."
                      style={{
                        width: '100%',
                        height: '32px',
                        fontSize: '0.78125rem',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-1)',
                        boxSizing: 'border-box',
                        marginBottom: '6px',
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {PRESET_CLIENTS.slice(0, 3).map((cl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormClient(cl)}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-surface-1)',
                            fontSize: '0.6875rem',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          + {cl.split('(')[0].trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.71875rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Tên dự án:
                    </label>
                    <input
                      type="text"
                      value={formProject}
                      onChange={(e) => setFormProject(e.target.value)}
                      placeholder="Dự án..."
                      style={{
                        width: '100%',
                        height: '32px',
                        fontSize: '0.78125rem',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-1)',
                        boxSizing: 'border-box',
                        marginBottom: '6px',
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {PRESET_PROJECTS.slice(0, 3).map((pj, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormProject(pj)}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-surface-1)',
                            fontSize: '0.6875rem',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          + {pj}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nạp mẫu demo đầy đủ tài liệu như Hình 2 */}
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(79, 70, 229, 0.08)',
                    border: '1px dashed var(--color-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    ✨ Nạp nhanh mẫu chuẩn (Như Hình 2)
                  </div>
                  <p style={{ margin: 0, fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>
                    Tự động điền đầy đủ: 2 ảnh hiện trường + Voice memo + Vị trí Novaland + Dự án Aqua City.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenCreateFullScreen(true)}
                    style={{
                      height: '28px',
                      fontSize: '0.71875rem',
                      fontWeight: 700,
                      marginTop: '4px',
                    }}
                  >
                    Nạp dữ liệu mẫu Hình 2
                  </Button>
                </div>
              </div>
            )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SalesJournalView = NotebookView;
export default NotebookView;
