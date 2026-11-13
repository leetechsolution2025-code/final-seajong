import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types';

export interface MeetingAttendee {
  id: string;
  userId?: string;
  employeeId?: string;
  name: string;
  email?: string;
  position?: string;
  department?: string;
  departmentCode?: string;
}

export interface MeetingActionItem {
  id: string;
  task: string;
  assignee: string;
  assigneeUserId?: string;
  department?: string;
  departmentCode?: string;
  startDate: string;
  deadline: string;
  completed: boolean;
  syncedTaskId?: string;
  syncedTaskCode?: string;
  syncedAt?: string;
}

export interface MeetingAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt?: string;
}

export type MeetingCategory = 'giao-ban' | 'chien-luoc' | 'phong-ban' | 'doi-tac';
export type MeetingVisibility = 'company' | 'attendees';

export interface MeetingRecord {
  id: string;
  title: string;
  summary?: string;
  category: MeetingCategory;
  visibility: MeetingVisibility;
  departmentCode?: string;
  isPinned: boolean;
  startTime: string;
  endTime: string;
  location: string;
  creatorId?: string;
  creatorName?: string;
  host: string;
  secretary: string;
  minutes: string;
  attendees: MeetingAttendee[];
  actionItems: MeetingActionItem[];
  files: MeetingAttachment[];
  createdAt?: string;
  updatedAt?: string;
}

interface StaffUserOption {
  id: string;
  userId?: string;
  employeeId?: string;
  code?: string;
  name: string;
  email?: string;
  position?: string;
  department?: string;
  departmentCode?: string;
}

interface MeetingNotebookPageProps {
  deptCode?: string;
  user?: User | null;
}

const CATEGORY_CONFIG: Record<
  MeetingCategory,
  { label: string; shortLabel: string; badgeClass: string; dotClass: string }
> = {
  'giao-ban': {
    label: 'Họp giao ban định kỳ',
    shortLabel: 'Giao ban',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dotClass: 'bg-cyan-500',
  },
  'chien-luoc': {
    label: 'Họp chiến lược BGĐ',
    shortLabel: 'Chiến lược',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    dotClass: 'bg-violet-500',
  },
  'phong-ban': {
    label: 'Họp chuyên môn bộ phận',
    shortLabel: 'Bộ phận',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  'doi-tac': {
    label: 'Làm việc Đại lý / Đối tác',
    shortLabel: 'Đối tác',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
};

const PRESET_LOCATIONS = [
  'Phòng họp CT3',
  'Văn phòng Điều hành Seajong',
  'Kho trung tâm & Xưởng lắp ráp Seajong',
  'Họp trực tuyến (Google Meet / Zoom)',
  'Showroom Trưng bày Seajong',
];

function cleanLegacyMinutesHtml(rawHtml: string | undefined | null): string {
  if (!rawHtml) return '';
  let cleaned = String(rawHtml);
  cleaned = cleaned.replace(/<div[^>]*id=["']minutes-template-marker["'][^>]*>[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<div[^>]*id=["']editor-action-items-section["'][\s\S]*$/gi, '');
  return cleaned.trim();
}

function stripHtmlToText(html: string | undefined | null): string {
  if (!html) return '';
  return cleanLegacyMinutesHtml(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toLocalDateInput(isoStr: string | undefined): string {
  const d = isoStr ? new Date(isoStr) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toLocalTimeInput(isoStr: string | undefined, fallback = '08:30'): string {
  if (!isoStr) return fallback;
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return fallback;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function combineDateAndTimeIso(dateStr: string, timeStr: string): string {
  const safeDate = dateStr || toLocalDateInput(undefined);
  const safeTime = timeStr || '08:30';
  const combined = new Date(`${safeDate}T${safeTime}:00`);
  if (Number.isNaN(combined.getTime())) {
    return new Date().toISOString();
  }
  return combined.toISOString();
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getAuthHeaders(user?: User | null): Record<string, string> {
  const token =
    sessionStorage.getItem('seajong_token') ||
    localStorage.getItem('seajong_token') ||
    localStorage.getItem('token') ||
    '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const uid = user?.id || user?.email || '';
  if (uid) {
    headers['x-chat-user-id'] = String(uid);
  }
  return headers;
}

function createBlankDraft(deptCode?: string, currentUser?: User | null): MeetingRecord {
  const nowIso = new Date().toISOString();
  const defaultHost = currentUser?.name || '';

  return {
    id: '__draft_new__',
    title: '',
    summary: '',
    category: deptCode && deptCode !== 'board' ? 'phong-ban' : 'giao-ban',
    visibility: 'company',
    departmentCode: deptCode || 'board',
    isPinned: false,
    startTime: nowIso,
    endTime: nowIso,
    location: 'Phòng họp CT3',
    host: defaultHost,
    secretary: '',
    minutes: '',
    attendees: [],
    actionItems: [],
    files: [],
  };
}

const DEPT_NOTEBOOK_LABELS: Record<string, { shortName: string; badge: string; desc: string }> = {
  board: {
    shortName: 'Ban Giám đốc',
    badge: 'SỔ BIÊN BẢN',
    desc: 'Sổ tay lưu trữ nội dung họp giao ban, kết luận chỉ đạo và phân công đầu việc các bộ phận',
  },
  marketing: {
    shortName: 'Marketing',
    badge: 'MARKETING',
    desc: 'Sổ ghi chép họp triển khai chiến dịch, ý tưởng truyền thông và biên bản giao ban liên phòng ban',
  },
  sales: {
    shortName: 'Kinh doanh',
    badge: 'KINH DOANH',
    desc: 'Sổ ghi chép họp kinh doanh, làm việc đại lý – đối tác và phân công đầu việc bán hàng',
  },
  finance: {
    shortName: 'Tài chính - KT',
    badge: 'TÀI CHÍNH - KẾ TOÁN',
    desc: 'Sổ ghi chép họp kế toán – tài chính, rà soát ngân sách, công nợ và kết luận giao ban',
  },
  hr: {
    shortName: 'Nhân sự',
    badge: 'HÀNH CHÍNH - NHÂN SỰ',
    desc: 'Sổ ghi chép họp nhân sự, tuyển dụng – đào tạo, nội quy và biên bản giao ban công ty',
  },
  logistics: {
    shortName: 'Kho vận',
    badge: 'KHO VẬN',
    desc: 'Sổ ghi chép họp điều phối kho vận, giao nhận hàng hóa và biên bản giao ban liên bộ phận',
  },
  production: {
    shortName: 'Sản xuất',
    badge: 'SẢN XUẤT',
    desc: 'Sổ ghi chép họp điều độ xưởng lắp ráp, định mức kỹ thuật và kết luận giao ban',
  },
  qa: {
    shortName: 'QA/QC',
    badge: 'ĐẢM BẢO CHẤT LƯỢNG',
    desc: 'Sổ ghi chép họp kiểm soát chất lượng IQC/OQC, cải tiến kỹ thuật và biên bản giao ban',
  },
  purchase: {
    shortName: 'Mua hàng',
    badge: 'MUA HÀNG',
    desc: 'Sổ ghi chép họp cung ứng vật tư, đàm phán nhà cung cấp và kết luận giao ban',
  },
  cs: {
    shortName: 'CSKH',
    badge: 'CHĂM SÓC KHÁCH HÀNG',
    desc: 'Sổ ghi chép họp dịch vụ bảo hành, xử lý phản hồi đại lý và kết luận giao ban',
  },
};

function normalizeNotebookDept(raw?: string): string {
  const c = (raw || 'board').trim().toLowerCase();
  if (c === 'kho' || c === 'kho-hang' || c === 'warehouse') return 'logistics';
  if (c === 'tai-chinh' || c === 'ke-toan' || c === 'accounting') return 'finance';
  if (c === 'san-xuat' || c === 'sx') return 'production';
  if (c === 'mua-hang' || c === 'procurement' || c === 'purchasing') return 'purchase';
  if (c === 'kd' || c === 'kinh-doanh') return 'sales';
  if (c === 'nhan-su' || c === 'admin') return 'hr';
  if (c === 'qc' || c === 'quality' || c === 'quan-ly-chat-luong') return 'qa';
  return c;
}

export const MeetingNotebookPage: React.FC<MeetingNotebookPageProps> = ({
  deptCode = 'board',
  user: propUser,
}) => {
  const { user: contextUser } = useAuth();
  const activeUser = propUser || contextUser;
  const toast = useToast();
  const normalizedDept = useMemo(() => normalizeNotebookDept(deptCode), [deptCode]);
  const deptMeta = DEPT_NOTEBOOK_LABELS[normalizedDept] || DEPT_NOTEBOOK_LABELS.board;

  // Danh sách các trang họp từ CSDL & nhân sự công ty
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffUserOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [notifying, setNotifying] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [syncingItemIds, setSyncingItemIds] = useState<Record<string, boolean>>({});

  // Bộ lọc cột trái (Mục lục sổ) & chế độ không gian viết sổ
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'current-dept' | MeetingCategory | 'pinned'>('all');
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(false);
  const [isSpineCollapsed, setIsSpineCollapsed] = useState<boolean>(false);
  const [workspaceMode, setWorkspaceMode] = useState<'split' | 'focus' | 'tasks'>('split');
  const [paperStyle, setPaperStyle] = useState<'lined' | 'plain'>('lined');

  // Trang đang mở bên phải & đồng hồ thời gian thực cho Giờ bắt đầu / Giờ kết thúc
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<MeetingRecord>(() => createBlankDraft(normalizedDept, activeUser));
  const [dateInput, setDateInput] = useState<string>(() => toLocalDateInput(undefined));
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Offcanvas chọn thành viên dự họp (chuẩn 400px) & ConfirmDialog xóa
  const [isAttendeeDrawerOpen, setIsAttendeeDrawerOpen] = useState<boolean>(false);
  const [attendeeSearch, setAttendeeSearch] = useState<string>('');
  const [attendeeDeptFilter, setAttendeeDeptFilter] = useState<string>('all');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);

  // Ghi âm giọng nói tiếng Việt (Web Speech API)
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Refs cho trình soạn thảo nội dung & upload file
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedEditorMeetingIdRef = useRef<string>('');

  // Tải dữ liệu thực tế từ /api/meetings (chỉ lấy dữ liệu của chính tài khoản đang đăng nhập) và /api/users
  const loadInitialData = useCallback(async () => {
    if (!activeUser?.id) {
      setMeetings([]);
      const fresh = createBlankDraft(normalizedDept, activeUser);
      selectMeetingIntoDraft(fresh, true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [meetingsRes, usersRes] = await Promise.all([
        fetch(`/api/meetings?currentUserId=${encodeURIComponent(String(activeUser.id))}`, {
          headers: getAuthHeaders(activeUser),
          credentials: 'include',
        }),
        fetch('/api/users', {
          headers: getAuthHeaders(activeUser),
          credentials: 'include',
        }),
      ]);

      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        if (Array.isArray(usersJson)) {
          setStaffList(
            usersJson
              .filter((u: any) => u && u.name)
              .map((u: any) => ({
                id: String(u.userId || u.id || u.employeeId),
                userId: u.userId ? String(u.userId) : String(u.id || ''),
                employeeId: u.employeeId ? String(u.employeeId) : undefined,
                code: u.code || '',
                name: String(u.name).trim(),
                email: u.email || '',
                position: u.position || 'Nhân viên',
                department: u.department || 'Khối văn phòng',
                departmentCode: u.departmentCode || '',
              }))
          );
        }
      }

      if (meetingsRes.ok) {
        const meetingsJson = await meetingsRes.json();
        if (Array.isArray(meetingsJson)) {
          const normalized: MeetingRecord[] = meetingsJson.map((m: any) => ({
            id: String(m.id),
            title: m.title || 'Cuộc họp chưa đặt tiêu đề',
            summary: m.summary || '',
            category: (['giao-ban', 'chien-luoc', 'phong-ban', 'doi-tac'].includes(m.category)
              ? m.category
              : 'giao-ban') as MeetingCategory,
            visibility: m.visibility === 'attendees' ? 'attendees' : 'company',
            departmentCode: m.departmentCode || 'board',
            isPinned: Boolean(m.isPinned),
            startTime: m.startTime || new Date().toISOString(),
            endTime: m.endTime || m.startTime || new Date().toISOString(),
            location: m.location || '',
            creatorId: m.creatorId,
            creatorName: m.creatorName || '',
            host: m.host || '',
            secretary: m.secretary || '',
            minutes: cleanLegacyMinutesHtml(m.minutes),
            attendees: Array.isArray(m.attendees) ? m.attendees : [],
            actionItems: Array.isArray(m.actionItems)
              ? m.actionItems.map((item: any, i: number) => ({
                  id: String(item.id || `ai-${i}-${Date.now()}`),
                  task: String(item.task || ''),
                  assignee: String(item.assignee || ''),
                  assigneeUserId: item.assigneeUserId ? String(item.assigneeUserId) : undefined,
                  department: item.department || '',
                  departmentCode: item.departmentCode || '',
                  startDate: item.startDate || toLocalDateInput(m.startTime),
                  deadline: item.deadline || '',
                  completed: Boolean(item.completed),
                  syncedTaskId: item.syncedTaskId || undefined,
                  syncedTaskCode: item.syncedTaskCode || undefined,
                  syncedAt: item.syncedAt || undefined,
                }))
              : [],
            files: Array.isArray(m.files) ? m.files : [],
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          }));

          const ownRecords = normalized.filter(
            (m) => !activeUser?.id || String(m.creatorId || '') === String(activeUser.id)
          );

          setMeetings(ownRecords);
          if (ownRecords.length > 0) {
            const first = ownRecords[0];
            selectMeetingIntoDraft(first, true);
          } else {
            const fresh = createBlankDraft(normalizedDept, activeUser);
            selectMeetingIntoDraft(fresh, true);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi tải sổ ghi chép cuộc họp:', err);
      toast.error('Không thể tải dữ liệu', 'Vui lòng kiểm tra kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [activeUser?.id, deptCode]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Đồng hồ thời gian thực tự động cập nhật giờ bắt đầu / kết thúc & dọn dẹp mic khi rời trang
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveNow(new Date());
    }, 5000);

    return () => {
      window.clearInterval(timer);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const selectMeetingIntoDraft = (record: MeetingRecord, forceSyncEditor = false) => {
    const cleanedMinutes = cleanLegacyMinutesHtml(record.minutes);
    const nextDraft: MeetingRecord = {
      ...record,
      minutes: cleanedMinutes,
      attendees: Array.isArray(record.attendees) ? [...record.attendees] : [],
      actionItems: Array.isArray(record.actionItems)
        ? record.actionItems.map((a) => ({ ...a }))
        : [],
      files: Array.isArray(record.files) ? [...record.files] : [],
    };

    setSelectedId(record.id);
    setDraft(nextDraft);
    setDateInput(toLocalDateInput(record.startTime));
    setLiveNow(new Date());
    setIsDirty(false);

    if (forceSyncEditor || loadedEditorMeetingIdRef.current !== record.id) {
      loadedEditorMeetingIdRef.current = record.id;
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = cleanedMinutes;
        }
      }, 0);
    }
  };

  // Đảm bảo đồng bộ nội dung vào contentEditable khi đổi trang sổ
  useEffect(() => {
    if (editorRef.current && loadedEditorMeetingIdRef.current === draft.id) {
      if (editorRef.current.innerHTML !== draft.minutes && !isDirty) {
        editorRef.current.innerHTML = draft.minutes || '';
      }
    }
  }, [draft.id]);

  // Bộ lọc danh sách các trang họp bên cột trái
  const filteredMeetings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return meetings
      .filter((m) => {
        if (activeFilter === 'pinned' && !m.isPinned) return false;
        if (activeFilter === 'current-dept') {
          if (normalizeNotebookDept(m.departmentCode) !== normalizedDept) return false;
        } else if (
          activeFilter !== 'all' &&
          activeFilter !== 'pinned' &&
          m.category !== activeFilter
        ) {
          return false;
        }
        if (!q) return true;
        const plainMinutes = stripHtmlToText(m.minutes).toLowerCase();
        const attendeesText = (m.attendees || [])
          .map((a) => `${a.name} ${a.department || ''}`)
          .join(' ')
          .toLowerCase();
        const actionsText = (m.actionItems || [])
          .map((a) => `${a.task} ${a.assignee}`)
          .join(' ')
          .toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          (m.host || '').toLowerCase().includes(q) ||
          (m.secretary || '').toLowerCase().includes(q) ||
          (m.location || '').toLowerCase().includes(q) ||
          plainMinutes.includes(q) ||
          attendeesText.includes(q) ||
          actionsText.includes(q)
        );
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      });
  }, [meetings, searchQuery, activeFilter, normalizedDept]);

  const filterCounts = useMemo(() => {
    return {
      all: meetings.length,
      'current-dept': meetings.filter(
        (m) => normalizeNotebookDept(m.departmentCode) === normalizedDept
      ).length,
      'giao-ban': meetings.filter((m) => m.category === 'giao-ban').length,
      'chien-luoc': meetings.filter((m) => m.category === 'chien-luoc').length,
      'phong-ban': meetings.filter((m) => m.category === 'phong-ban').length,
      pinned: meetings.filter((m) => m.isPinned).length,
    };
  }, [meetings, normalizedDept]);

  // Danh sách phòng ban duy nhất từ staffList để lọc nhanh trong Offcanvas
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of staffList) {
      if (s.department) set.add(s.department);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [staffList]);

  const filteredStaffForDrawer = useMemo(() => {
    const q = attendeeSearch.trim().toLowerCase();
    return staffList.filter((s) => {
      if (attendeeDeptFilter !== 'all' && s.department !== attendeeDeptFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.position || '').toLowerCase().includes(q) ||
        (s.department || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      );
    });
  }, [staffList, attendeeSearch, attendeeDeptFilter]);

  // Tạo trang ghi chép mới
  const handleCreateNewPage = () => {
    const fresh = createBlankDraft(normalizedDept, activeUser);
    loadedEditorMeetingIdRef.current = fresh.id;
    selectMeetingIntoDraft(fresh, true);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setMobileShowDetail(true);
  };

  const updateDraftField = <K extends keyof MeetingRecord>(key: K, value: MeetingRecord[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // Định dạng văn bản trong khung sổ ghi chép
  const applyEditorCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    const html = editorRef.current.innerHTML;
    setDraft((prev) => ({ ...prev, minutes: html }));
    setIsDirty(true);
  };

  // Chèn khung bố cục chuẩn cuộc họp giao ban
  const handleInsertStructuredTemplate = () => {
    if (!editorRef.current) return;
    const templateHtml =
      '<p><b>I. BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC KỲ TRƯỚC</b></p>' +
      '<ul><li>Tình hình kinh doanh &amp; phát triển đại lý: ...</li><li>Tình hình kho vận, lắp ráp &amp; kiểm soát chất lượng: ...</li></ul>' +
      '<p><b>II. NỘI DUNG THẢO LUẬN &amp; VƯỚNG MẮC CẦN XỬ LÝ</b></p>' +
      '<ul><li>...</li></ul>' +
      '<p><b>III. KẾT LUẬN CHỈ ĐẠO CỦA CHỦ TỌA</b></p>' +
      '<ol><li>...</li></ol>';
    const currentHtml = editorRef.current.innerHTML.trim();
    const merged = currentHtml ? `${currentHtml}${templateHtml}` : templateHtml;
    editorRef.current.innerHTML = merged;
    setDraft((prev) => ({ ...prev, minutes: merged }));
    setIsDirty(true);
  };

  // Nhập liệu bằng giọng nói tiếng Việt (Web Speech API)
  const handleToggleVoiceDictation = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.warning(
        'Trình duyệt chưa hỗ trợ nhận diện giọng nói',
        'Vui lòng sử dụng Google Chrome hoặc Microsoft Edge để đọc biên bản thành chữ.'
      );
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info('Đang lắng nghe giọng nói (Tiếng Việt)', 'Hãy nói nội dung cuộc họp để tự động chép vào sổ...');
    };

    recognition.onresult = (event: any) => {
      let transcriptChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcriptChunk += event.results[i][0].transcript + ' ';
        }
      }
      const text = transcriptChunk.trim();
      if (text && editorRef.current) {
        const current = editorRef.current.innerHTML.trim();
        const appended = current ? `${current}<p>${text}.</p>` : `<p>${text}.</p>`;
        editorRef.current.innerHTML = appended;
        setDraft((prev) => ({ ...prev, minutes: appended }));
        setIsDirty(true);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Đính kèm tệp / hình ảnh vào trang biên bản
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    selectedFiles.forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        toast.warning('Tệp quá lớn', `Tệp "${file.name}" vượt quá giới hạn 8MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) return;
        const newAtt: MeetingAttachment = {
          id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };
        setDraft((prev) => ({
          ...prev,
          files: [...prev.files, newAtt],
        }));
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveFile = (fileId: string) => {
    setDraft((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== fileId),
    }));
    setIsDirty(true);
  };

  // Quản lý thành viên dự họp
  const isStaffSelectedAsAttendee = (staff: StaffUserOption): boolean => {
    return draft.attendees.some(
      (a) =>
        (a.userId && staff.userId && a.userId === staff.userId) ||
        a.id === staff.id ||
        a.name.trim().toLowerCase() === staff.name.trim().toLowerCase()
    );
  };

  const handleToggleAttendee = (staff: StaffUserOption) => {
    const exists = isStaffSelectedAsAttendee(staff);
    if (exists) {
      setDraft((prev) => {
        const nextAttendees = prev.attendees.filter(
          (a) =>
            !(
              (a.userId && staff.userId && a.userId === staff.userId) ||
              a.id === staff.id ||
              a.name.trim().toLowerCase() === staff.name.trim().toLowerCase()
            )
        );
        const secretaryStillAttending = nextAttendees.some(
          (a) => a.name.trim().toLowerCase() === (prev.secretary || '').trim().toLowerCase()
        );
        return {
          ...prev,
          attendees: nextAttendees,
          secretary: secretaryStillAttending ? prev.secretary : '',
        };
      });
    } else {
      const nextAtt: MeetingAttendee = {
        id: staff.id,
        userId: staff.userId || staff.id,
        employeeId: staff.employeeId,
        name: staff.name,
        email: staff.email,
        position: staff.position,
        department: staff.department,
        departmentCode: staff.departmentCode,
      };
      setDraft((prev) => ({
        ...prev,
        attendees: [...prev.attendees, nextAtt],
      }));
    }
    setIsDirty(true);
  };

  const handleSelectDepartmentHeads = () => {
    const headKeywords = ['giám đốc', 'trưởng', 'quản đốc', 'thủ kho', 'kế toán trưởng', 'leader'];
    const heads = staffList.filter((s) =>
      headKeywords.some((kw) => (s.position || '').toLowerCase().includes(kw))
    );
    if (heads.length === 0) return;

    setDraft((prev) => {
      const merged = [...prev.attendees];
      for (const h of heads) {
        const already = merged.some(
          (a) => a.id === h.id || a.name.trim().toLowerCase() === h.name.trim().toLowerCase()
        );
        if (!already) {
          merged.push({
            id: h.id,
            userId: h.userId || h.id,
            employeeId: h.employeeId,
            name: h.name,
            email: h.email,
            position: h.position,
            department: h.department,
            departmentCode: h.departmentCode,
          });
        }
      }
      return { ...prev, attendees: merged };
    });
    setIsDirty(true);
  };

  // Quản lý danh sách Kết luận & Phân công đầu việc (Action Items)
  const handleAddActionItem = () => {
    const newItem: MeetingActionItem = {
      id: `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      task: '',
      assignee: '',
      startDate: dateInput || toLocalDateInput(undefined),
      deadline: dateInput || toLocalDateInput(undefined),
      completed: false,
    };
    setDraft((prev) => ({
      ...prev,
      actionItems: [...prev.actionItems, newItem],
    }));
    setIsDirty(true);
  };

  const handleUpdateActionItem = (
    itemId: string,
    patch: Partial<MeetingActionItem>
  ) => {
    setDraft((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, ...patch };
        if (patch.assignee !== undefined) {
          const matchedStaff = staffList.find(
            (s) => s.name.trim().toLowerCase() === patch.assignee!.trim().toLowerCase()
          );
          if (matchedStaff) {
            updated.assigneeUserId = matchedStaff.userId || matchedStaff.id;
            updated.department = matchedStaff.department;
            updated.departmentCode = matchedStaff.departmentCode;
          }
        }
        return updated;
      }),
    }));
    setIsDirty(true);
  };

  const handleRemoveActionItem = (itemId: string) => {
    setDraft((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter((item) => item.id !== itemId),
    }));
    setIsDirty(true);
  };

  // Lưu trang sổ cuộc họp vào CSDL thực tế
  const saveMeetingRecord = useCallback(
    async (options?: { notifyAttendees?: boolean; silent?: boolean }): Promise<MeetingRecord | null> => {
      const currentTitle = draft.title.trim();
      if (!currentTitle) {
        toast.warning('Thiếu tiêu đề cuộc họp', 'Vui lòng nhập tiêu đề cho trang ghi chép cuộc họp.');
        return null;
      }

      const currentMinutesHtml = editorRef.current
        ? editorRef.current.innerHTML
        : draft.minutes;

      const isNew = draft.id === '__draft_new__' || !draft.id;
      const nowReal = new Date();
      const todayDateStr = toLocalDateInput(nowReal.toISOString());
      const startHHmm = toLocalTimeInput(
        draft.startTime,
        toLocalTimeInput(nowReal.toISOString())
      );
      const endHHmm =
        isNew || dateInput === todayDateStr
          ? toLocalTimeInput(nowReal.toISOString())
          : toLocalTimeInput(draft.endTime, startHHmm);

      const startIso = combineDateAndTimeIso(dateInput, startHHmm);
      const endIso = combineDateAndTimeIso(dateInput, endHHmm);

      const cleanedActionItems = draft.actionItems.filter(
        (item) => item.task.trim() !== '' || item.assignee.trim() !== ''
      );

      const payload = {
        title: currentTitle,
        summary: stripHtmlToText(currentMinutesHtml).slice(0, 220),
        category: draft.category,
        visibility: draft.visibility,
        departmentCode: draft.departmentCode || deptCode || 'board',
        isPinned: draft.isPinned,
        startTime: startIso,
        endTime: endIso,
        location: draft.location.trim(),
        host: draft.host.trim(),
        secretary: draft.secretary.trim(),
        minutes: currentMinutesHtml,
        attendees: draft.attendees,
        actionItems: cleanedActionItems,
        files: draft.files,
        notifyAttendees: Boolean(options?.notifyAttendees),
      };

      if (options?.notifyAttendees) {
        setNotifying(true);
      } else {
        setSaving(true);
      }

      try {
        const res = await fetch(isNew ? '/api/meetings' : `/api/meetings/${draft.id}`, {
          method: isNew ? 'POST' : 'PUT',
          headers: getAuthHeaders(activeUser),
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Lỗi lưu biên bản cuộc họp');
        }

        const savedRaw = await res.json();
        const savedRecord: MeetingRecord = {
          ...savedRaw,
          minutes: cleanLegacyMinutesHtml(savedRaw.minutes),
        };

        setMeetings((prev) => {
          const exists = prev.some((m) => m.id === savedRecord.id);
          if (exists) {
            return prev.map((m) => (m.id === savedRecord.id ? savedRecord : m));
          }
          return [savedRecord, ...prev];
        });

        loadedEditorMeetingIdRef.current = savedRecord.id;
        setSelectedId(savedRecord.id);
        setDraft(savedRecord);
        setIsDirty(false);

        if (!options?.silent) {
          if (options?.notifyAttendees) {
            toast.success(
              'Đã lưu & gửi thông báo',
              `Đã thông báo biên bản cuộc họp tới ${savedRecord.attendees.length} thành viên tham dự.`
            );
          } else {
            toast.success('Đã lưu vào Sổ cuộc họp', `Trang "${savedRecord.title}" đã được cập nhật.`);
          }
        }

        return savedRecord;
      } catch (err: any) {
        console.error('Lỗi lưu trang họp:', err);
        toast.error('Không thể lưu biên bản', err?.message || 'Đã xảy ra lỗi khi lưu.');
        return null;
      } finally {
        setSaving(false);
        setNotifying(false);
      }
    },
    [draft, dateInput, deptCode, activeUser, toast]
  );

  // Phím tắt Ctrl+S / Cmd+S để lưu nhanh trang sổ đang viết
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveMeetingRecord();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveMeetingRecord]);

  // Ghim / Bỏ ghim nhanh
  const handleTogglePin = async () => {
    const nextPinned = !draft.isPinned;
    setDraft((prev) => ({ ...prev, isPinned: nextPinned }));
    if (draft.id && draft.id !== '__draft_new__') {
      try {
        const res = await fetch(`/api/meetings/${draft.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(activeUser),
          body: JSON.stringify({ isPinned: nextPinned }),
        });
        if (res.ok) {
          const updated = await res.json();
          setMeetings((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, isPinned: Boolean(updated.isPinned) } : m))
          );
          toast.info(
            nextPinned ? 'Đã ghim trang họp' : 'Đã bỏ ghim',
            nextPinned ? 'Trang họp được ưu tiên hiển thị đầu sổ.' : undefined
          );
        }
      } catch {
        // ignore
      }
    } else {
      setIsDirty(true);
    }
  };

  // Giao việc 1 chạm sang bảng Công việc & Bắn thông báo cho người nhận
  const handleAssignTaskFromMeeting = async (item: MeetingActionItem) => {
    if (!item.task.trim()) {
      toast.warning('Chưa nhập nội dung đầu việc', 'Vui lòng nhập nội dung kết luận/công việc trước khi giao.');
      return;
    }
    if (!item.assignee.trim()) {
      toast.warning('Chưa chọn người thực hiện', 'Vui lòng chọn nhân sự phụ trách đầu việc này.');
      return;
    }

    setSyncingItemIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      let targetMeetingId = draft.id;
      if (!targetMeetingId || targetMeetingId === '__draft_new__' || isDirty) {
        const savedFirst = await saveMeetingRecord({ silent: true });
        if (!savedFirst) {
          return;
        }
        targetMeetingId = savedFirst.id;
      }

      const res = await fetch(`/api/meetings/${targetMeetingId}/assign-task`, {
        method: 'POST',
        headers: getAuthHeaders(activeUser),
        body: JSON.stringify({
          actionItemId: item.id,
          task: item.task,
          assignee: item.assignee,
          assigneeUserId: item.assigneeUserId,
          department: item.department,
          departmentCode: item.departmentCode,
          startDate: item.startDate || dateInput,
          deadline: item.deadline || dateInput,
          assigner: draft.host || activeUser?.name || 'Chủ tọa cuộc họp',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Lỗi đồng bộ giao việc');
      }

      const result = await res.json();
      if (result.meeting) {
        const updatedMeeting: MeetingRecord = {
          ...result.meeting,
          minutes: cleanLegacyMinutesHtml(result.meeting.minutes),
        };
        setMeetings((prev) =>
          prev.map((m) => (m.id === updatedMeeting.id ? updatedMeeting : m))
        );
        setDraft((prev) => ({
          ...prev,
          actionItems: updatedMeeting.actionItems,
        }));
      }

      toast.success(
        'Đã giao việc & gửi thông báo',
        `Đầu việc đã được chuyển vào Danh sách công việc của ${item.assignee}.`
      );
    } catch (err: any) {
      console.error('Lỗi giao việc từ biên bản họp:', err);
      toast.error('Giao việc thất bại', err?.message || 'Vui lòng thử lại.');
    } finally {
      setSyncingItemIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Xóa trang biên bản cuộc họp
  const handleConfirmDelete = async () => {
    if (!draft.id || draft.id === '__draft_new__') {
      setIsDeleteConfirmOpen(false);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/meetings/${draft.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(activeUser),
      });
      if (!res.ok) {
        throw new Error('Không thể xóa biên bản cuộc họp');
      }

      const remaining = meetings.filter((m) => m.id !== draft.id);
      setMeetings(remaining);
      setIsDeleteConfirmOpen(false);
      toast.success('Đã xóa trang biên bản', `Đã xóa "${draft.title}" khỏi sổ cuộc họp.`);

      if (remaining.length > 0) {
        selectMeetingIntoDraft(remaining[0], true);
      } else {
        selectMeetingIntoDraft(createBlankDraft(normalizedDept, activeUser), true);
      }
      setMobileShowDetail(false);
    } catch (err: any) {
      toast.error('Xóa thất bại', err?.message || 'Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  const isNewUnsaved = draft.id === '__draft_new__';
  const isTodayMeeting = dateInput === toLocalDateInput(liveNow.toISOString());
  const isLiveClockActive = isNewUnsaved || (isTodayMeeting && isDirty);
  const displayStartTime = toLocalTimeInput(
    draft.startTime,
    toLocalTimeInput(liveNow.toISOString())
  );
  const displayEndTime = isLiveClockActive
    ? toLocalTimeInput(liveNow.toISOString())
    : toLocalTimeInput(draft.endTime, displayStartTime);

  // Danh sách Thư ký CHỈ giới hạn trong các nhân viên tham dự họp
  const attendeeSecretaryOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: MeetingAttendee[] = [];
    for (const att of draft.attendees) {
      const n = String(att.name || '').trim();
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        list.push(att);
      }
    }
    return list;
  }, [draft.attendees]);

  // Xuất / In Biên bản cuộc họp chuẩn A4 Hành chính Doanh nghiệp Seajong
  const handlePrintOfficialMinutesA4 = () => {
    const currentMinutesHtml = editorRef.current
      ? editorRef.current.innerHTML
      : draft.minutes;

    const d = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date();
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yearStr = String(d.getFullYear());

    const attendeesRowsHtml =
      draft.attendees.length > 0
        ? draft.attendees
            .map(
              (a, idx) =>
                `<li>${idx + 1}. Ông/Bà: <b>${a.name}</b> ${
                  a.position ? `— ${a.position}` : ''
                } ${a.department ? `(${a.department})` : ''}</li>`
            )
            .join('')
        : '<li>Toàn thể cán bộ liên quan theo triệu tập cuộc họp.</li>';

    const actionRowsHtml =
      draft.actionItems.length > 0
        ? draft.actionItems
            .map((item, idx) => {
              const dl = item.deadline
                ? item.deadline.split('-').reverse().join('/')
                : 'Theo tiến độ';
              return `
                <tr>
                  <td style="text-align:center;">${idx + 1}</td>
                  <td>${item.task || ''}</td>
                  <td>${item.assignee || ''}</td>
                  <td style="text-align:center;">${dl}</td>
                  <td style="text-align:center;">${item.completed ? 'Hoàn thành' : 'Đang triển khai'}</td>
                </tr>
              `;
            })
            .join('')
        : `<tr><td colspan="5" style="text-align:center;font-style:italic;">Thực hiện theo nội dung kết luận bên trên</td></tr>`;

    const printWin = window.open('', '_blank', 'width=920,height=860');
    if (!printWin) {
      toast.warning('Trình duyệt chặn cửa sổ in', 'Vui lòng cho phép mở cửa sổ bật lên để in biên bản A4.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Biên bản cuộc họp - ${draft.title || 'Seajong'}</title>
        <style>
          @page { size: A4; margin: 18mm 18mm 18mm 22mm; }
          body {
            font-family: "Times New Roman", Times, serif;
            font-size: 13.5pt;
            line-height: 1.5;
            color: #000;
            margin: 0;
            padding: 0;
          }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
          .header-table td { vertical-align: top; text-align: center; }
          .company-name { font-weight: bold; font-size: 12pt; text-transform: uppercase; }
          .quoc-hieu { font-weight: bold; font-size: 12pt; text-transform: uppercase; }
          .tieu-ngu { font-weight: bold; font-size: 12.5pt; }
          .doc-title {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 20px 0 4px;
          }
          .doc-subtitle {
            text-align: center;
            font-size: 13.5pt;
            font-weight: bold;
            margin-bottom: 18px;
          }
          .section-heading {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 13pt;
            margin-top: 14px;
            margin-bottom: 6px;
          }
          ul.att-list { list-style: none; padding-left: 12px; margin: 4px 0 10px; }
          ul.att-list li { margin-bottom: 3px; }
          table.action-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12.5pt;
          }
          table.action-table th, table.action-table td {
            border: 1px solid #000;
            padding: 6px 8px;
          }
          table.action-table th {
            background: #f3f4f6;
            font-weight: bold;
          }
          .sig-table {
            width: 100%;
            margin-top: 28px;
            border-collapse: collapse;
          }
          .sig-table td {
            width: 50%;
            text-align: center;
            vertical-align: top;
          }
          .minutes-body {
            text-align: justify;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 44%;">
              <div class="company-name">CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM</div>
              <div style="font-size: 11.5pt;">Số: BBH-${yearStr}/${monthStr}${dayStr}</div>
              <div style="width: 90px; border-bottom: 1px solid #000; margin: 4px auto 0;"></div>
            </td>
            <td style="width: 56%;">
              <div class="quoc-hieu">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div class="tieu-ngu">Độc lập - Tự do - Hạnh phúc</div>
              <div style="width: 140px; border-bottom: 1px solid #000; margin: 4px auto 0;"></div>
              <div style="font-style: italic; font-size: 12pt; margin-top: 6px;">
                Hà Nội, ngày ${dayStr} tháng ${monthStr} năm ${yearStr}
              </div>
            </td>
          </tr>
        </table>

        <div class="doc-title">BIÊN BẢN CUỘC HỌP</div>
        <div class="doc-subtitle">V/v: ${draft.title || 'Họp giao ban điều hành'}</div>

        <div class="section-heading">I. THỜI GIAN, ĐỊA ĐIỂM &amp; THÀNH PHẦN THAM DỰ</div>
        <div>- <b>Thời gian:</b> Từ ${displayStartTime} đến ${displayEndTime}, ngày ${dayStr}/${monthStr}/${yearStr}.</div>
        <div>- <b>Địa điểm:</b> ${draft.location || 'Văn phòng Công ty Cổ phần Seajong Việt Nam'}.</div>
        <div>- <b>Chủ tọa (Chủ trì):</b> ${draft.host || '................................................'}</div>
        <div>- <b>Thư ký cuộc họp:</b> ${draft.secretary || '................................................'}</div>
        <div>- <b>Thành phần tham dự (${draft.attendees.length} thành viên):</b></div>
        <ul class="att-list">${attendeesRowsHtml}</ul>

        <div class="section-heading">II. NỘI DUNG DIỄN BIẾN &amp; THẢO LUẬN TẠI CUỘC HỌP</div>
        <div class="minutes-body">
          ${currentMinutesHtml || '<p><i>(Nội dung chi tiết theo kết luận phân công bên dưới)</i></p>'}
        </div>

        <div class="section-heading">III. KẾT LUẬN CHỈ ĐẠO &amp; PHÂN CÔNG THỰC HIỆN</div>
        <table class="action-table">
          <thead>
            <tr>
              <th style="width: 42px;">STT</th>
              <th>Nội dung kết luận / Đầu việc triển khai</th>
              <th style="width: 165px;">Người phụ trách</th>
              <th style="width: 105px;">Thời hạn</th>
              <th style="width: 110px;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${actionRowsHtml}
          </tbody>
        </table>

        <p style="margin-top: 14px;">
          Cuộc họp kết thúc vào hồi ${displayEndTime} cùng ngày. Biên bản đã được thông qua trước toàn thể các thành viên dự họp và lưu tại Sổ ghi chép cuộc họp điện tử của Công ty.
        </p>

        <table class="sig-table">
          <tr>
            <td>
              <b>THƯ KÝ CUỘC HỌP</b><br/>
              <i>(Ký, ghi rõ họ tên)</i>
              <div style="height: 85px;"></div>
              <b>${draft.secretary || ''}</b>
            </td>
            <td>
              <b>CHỦ TỌA CUỘC HỌP</b><br/>
              <i>(Ký, ghi rõ họ tên)</i>
              <div style="height: 85px;"></div>
              <b>${draft.host || ''}</b>
            </td>
          </tr>
        </table>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const completedCount = draft.actionItems.filter((a) => a.completed).length;
  const plainMinutesText = useMemo(() => stripHtmlToText(draft.minutes), [draft.minutes]);
  const wordCount = useMemo(
    () => (plainMinutesText ? plainMinutesText.split(/\s+/).filter(Boolean).length : 0),
    [plainMinutesText]
  );

  const getInitials = (fullName: string) => {
    const parts = String(fullName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return 'NV';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  return (
    <StandardPage
      title={normalizedDept === 'board' ? 'Sổ ghi chép cuộc họp' : `Sổ ghi chép – ${deptMeta.shortName}`}
      description={deptMeta.desc}
      icon="bi-journal-richtext"
      color="cyan"
      badge={deptMeta.badge}
      hideTicker={true}
      useCard={true}
      cardPadding="p-0"
    >
      <div className="flex flex-1 h-full min-h-0 w-full overflow-hidden bg-white">
        {/* =====================================================================
            CỘT TRÁI: GÁY SỔ & MỤC LỤC CÁC CUỘC HỌP (CÓ THỂ THU GỌN ĐỂ RỘNG TRANG VIẾT)
        ===================================================================== */}
        <aside
          className={`${
            mobileShowDetail ? 'hidden' : 'flex'
          } ${
            isSpineCollapsed ? 'md:hidden' : 'md:flex'
          } w-full md:w-[285px] lg:w-[300px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 h-full min-h-0 transition-all`}
        >
          {/* Thanh tìm kiếm & nút mở trang họp mới */}
          <div className="p-2.5 bg-white border-b border-slate-200 flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <i className="bi bi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tiêu đề, chủ tọa, nội dung..."
                  className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <i className="bi bi-x-circle-fill text-xs" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleCreateNewPage}
                className="h-8 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs transition-colors cursor-pointer"
              >
                <i className="bi bi-plus-lg" />
                <span>Trang mới</span>
              </button>
            </div>

            {/* Bộ lọc phân loại trang sổ */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all' as const, label: 'Tất cả', count: filterCounts.all },
                  ...(normalizedDept !== 'board'
                    ? [
                        {
                          id: 'current-dept' as const,
                          label: deptMeta.shortName,
                          count: filterCounts['current-dept'],
                        },
                      ]
                    : []),
                  { id: 'giao-ban' as const, label: 'Giao ban', count: filterCounts['giao-ban'] },
                  { id: 'chien-luoc' as const, label: 'Chiến lược', count: filterCounts['chien-luoc'] },
                  { id: 'phong-ban' as const, label: 'Bộ phận', count: filterCounts['phong-ban'] },
                  { id: 'pinned' as const, label: '★', count: filterCounts.pinned },
                ]
              ).map((tab) => {
                const active = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                      active
                        ? 'bg-cyan-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1 rounded ${
                        active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Danh sách các trang cuộc họp theo dòng thời gian */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
            {isNewUnsaved && (
              <div
                onClick={() => setMobileShowDetail(true)}
                className="p-2.5 rounded-xl border-2 border-dashed border-cyan-500 bg-cyan-50/60 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-700">
                    <i className="bi bi-pencil-square" /> Trang mới đang viết
                  </span>
                  <span className="text-[10px] text-cyan-600 font-medium">Chưa lưu</span>
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {draft.title || 'Cuộc họp mới chưa đặt tiêu đề...'}
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-2 p-1">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-18 rounded-xl bg-white border border-slate-200/80 p-2.5 animate-pulse flex gap-2.5"
                  >
                    <div className="w-11 h-12 rounded-lg bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <i className="bi bi-journal-x text-lg" />
                </div>
                <p className="text-xs font-semibold text-slate-600 m-0">
                  {searchQuery
                    ? 'Không tìm thấy trang họp phù hợp'
                    : 'Chưa có trang biên bản nào'}
                </p>
                <button
                  type="button"
                  onClick={handleCreateNewPage}
                  className="mt-1 text-xs font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer"
                >
                  + Mở trang ghi chép mới
                </button>
              </div>
            ) : (
              filteredMeetings.map((m) => {
                const isSelected = selectedId === m.id && !isNewUnsaved;
                const dt = new Date(m.startTime);
                const dayNum = Number.isNaN(dt.getTime())
                  ? '--'
                  : String(dt.getDate()).padStart(2, '0');
                const monthNum = Number.isNaN(dt.getTime())
                  ? '--'
                  : `Th${String(dt.getMonth() + 1).padStart(2, '0')}`;
                const yearNum = Number.isNaN(dt.getTime()) ? '' : dt.getFullYear();
                const timeStr = toLocalTimeInput(m.startTime, '08:30');
                const catInfo = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG['giao-ban'];
                const totalTasks = m.actionItems?.length || 0;
                const syncedOrDone = (m.actionItems || []).filter(
                  (a) => a.completed || a.syncedTaskId
                ).length;
                const snippet = stripHtmlToText(m.minutes);

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      selectMeetingIntoDraft(m, true);
                      setMobileShowDetail(true);
                    }}
                    className={`group relative rounded-xl border p-2 cursor-pointer transition-all flex gap-2.5 ${
                      isSelected
                        ? 'bg-white border-cyan-500 ring-2 ring-cyan-500/15 shadow-xs'
                        : 'bg-white/90 border-slate-200/80 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-cyan-600" />
                    )}

                    {/* Tờ lịch ngày họp */}
                    <div
                      className={`w-11 rounded-lg border flex flex-col items-center justify-center py-1 shrink-0 ${
                        isSelected
                          ? 'bg-cyan-50/80 border-cyan-200 text-cyan-800'
                          : 'bg-slate-50 border-slate-200/80 text-slate-700'
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase leading-none text-slate-400">
                        {monthNum}
                      </span>
                      <span className="text-sm font-black leading-tight mt-0.5">{dayNum}</span>
                      <span className="text-[9px] text-slate-400 leading-none">{yearNum}</span>
                    </div>

                    {/* Tóm tắt trang họp */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[10px] font-semibold ${catInfo.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${catInfo.dotClass}`} />
                            {catInfo.shortLabel}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                            {m.isPinned && (
                              <i className="bi bi-star-fill text-amber-400" title="Đã ghim" />
                            )}
                            <span>{timeStr}</span>
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 truncate m-0 leading-snug">
                          {m.title}
                        </h4>

                        {snippet && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 m-0 mt-0.5">
                            {snippet}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1.5 mt-1 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                        <span className="truncate flex items-center gap-1">
                          <i className="bi bi-person-workspace text-slate-400" />
                          {m.host || 'Chưa rõ chủ tọa'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-0.5" title="Thành viên dự họp">
                            <i className="bi bi-people" /> {m.attendees?.length || 0}
                          </span>
                          {totalTasks > 0 && (
                            <span
                              className={`px-1.5 py-0.2 rounded font-semibold ${
                                syncedOrDone === totalTasks
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {syncedOrDone}/{totalTasks} việc
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* =====================================================================
            CỘT PHẢI: TRANG SỔ GHI CHÉP CHI TIẾT (TỐI ĐA HÓA KHÔNG GIAN VIẾT)
        ===================================================================== */}
        <section
          className={`${
            mobileShowDetail ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col min-w-0 h-full min-h-0 bg-[#f8fafc] overflow-hidden`}
        >
          {/* THANH CÔNG CỤ 1 DÒNG GỌN GÀNG (SINGLE-ROW TOP BAR) */}
          <div className="px-3 py-1.5 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0 overflow-x-auto no-scrollbar">
            {/* Cụm trái: Đóng/mở gáy sổ + Chế độ xem trang sổ + Phân loại */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setMobileShowDetail(false)}
                className="md:hidden h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1"
              >
                <i className="bi bi-chevron-left" />
                <span>Mục lục</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSpineCollapsed((v) => !v)}
                title={isSpineCollapsed ? 'Hiện mục lục sổ bên trái' : 'Thu gọn mục lục sổ để mở rộng trang viết'}
                className={`hidden md:inline-flex h-7 w-7 rounded-lg border items-center justify-center text-xs transition-colors cursor-pointer ${
                  isSpineCollapsed
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <i className="bi bi-layout-sidebar" />
              </button>

              {/* Bộ chuyển chế độ không gian làm việc */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('split')}
                  className={`h-6 px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    workspaceMode === 'split'
                      ? 'bg-white text-cyan-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <i className="bi bi-journal-text" />
                  <span>Toàn trang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('focus')}
                  className={`h-6 px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    workspaceMode === 'focus'
                      ? 'bg-white text-cyan-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <i className="bi bi-arrows-angle-expand text-[10px]" />
                  <span>Tập trung viết</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('tasks')}
                  className={`h-6 px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    workspaceMode === 'tasks'
                      ? 'bg-white text-cyan-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <i className="bi bi-check2-square" />
                  <span>Kết luận ({draft.actionItems.length})</span>
                </button>
              </div>

              <span className="h-4 w-px bg-slate-200 mx-0.5 hidden lg:inline-block" />

              {/* Chọn loại cuộc họp */}
              <select
                value={draft.category}
                onChange={(e) => updateDraftField('category', e.target.value as MeetingCategory)}
                className="h-7 px-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white text-[11px] font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value="giao-ban">Giao ban định kỳ</option>
                <option value="chien-luoc">Chiến lược BGĐ</option>
                <option value="phong-ban">Họp bộ phận</option>
                <option value="doi-tac">Đại lý / Đối tác</option>
              </select>
            </div>

            {/* Cụm phải: Trạng thái + Ghim + In A4 + Thông báo + Lưu + Xóa trên cùng 1 hàng */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  isNewUnsaved
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : isDirty
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isNewUnsaved
                      ? 'bg-amber-500'
                      : isDirty
                        ? 'bg-sky-500'
                        : 'bg-emerald-500'
                  }`}
                />
                {isNewUnsaved ? 'Bản nháp' : isDirty ? 'Chưa lưu' : 'Đã lưu'}
              </span>

              <button
                type="button"
                onClick={handleTogglePin}
                title={draft.isPinned ? 'Bỏ ghim trang này' : 'Ghim trang họp lên đầu sổ'}
                className={`h-7 w-7 rounded-lg border text-xs flex items-center justify-center transition-colors cursor-pointer ${
                  draft.isPinned
                    ? 'bg-amber-50 border-amber-300 text-amber-600'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <i className={`bi ${draft.isPinned ? 'bi-star-fill' : 'bi-star'}`} />
              </button>

              <button
                type="button"
                onClick={handlePrintOfficialMinutesA4}
                title="In Biên bản hành chính chuẩn khổ A4"
                className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <i className="bi bi-printer text-slate-500" />
                <span>In A4</span>
              </button>

              <button
                type="button"
                disabled={notifying || saving}
                onClick={() => saveMeetingRecord({ notifyAttendees: true })}
                title="Lưu và gửi thông báo tới các thành viên dự họp"
                className="h-7 px-2.5 rounded-lg border border-cyan-200 bg-cyan-50 hover:bg-cyan-100/80 text-cyan-800 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <i className="bi bi-bell" />
                <span>{notifying ? 'Đang gửi...' : 'Gửi TB'}</span>
              </button>

              <button
                type="button"
                disabled={saving || notifying}
                onClick={() => saveMeetingRecord()}
                className="h-7 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <i className={`bi ${saving ? 'bi-arrow-repeat animate-spin' : 'bi-check2-circle'}`} />
                <span>{saving ? 'Đang lưu...' : 'Lưu sổ'}</span>
              </button>

              {!isNewUnsaved && (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  title="Xóa trang biên bản này"
                  className="h-7 w-7 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="bi bi-trash3 text-xs" />
                </button>
              )}
            </div>
          </div>

          {/* KHÔNG GIAN TỜ GIẤY SỔ TAY CHÍNH */}
          <div className="flex-1 overflow-y-auto px-3 md:px-5 py-3 flex flex-col gap-3 min-h-0">
            {/* ĐẦU TRANG SỔ GỌN GÀNG: TIÊU ĐỀ + DẢI THÔNG TIN 1 DÒNG DUY NHẤT */}
            <div className="bg-white rounded-xl border border-slate-200/90 px-4 py-2.5 shadow-2xs shrink-0 space-y-2">
              {/* Dòng 1: Tiêu đề cuộc họp + Ngày họp & Giờ bắt đầu - kết thúc theo thời gian thực */}
              <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => updateDraftField('title', e.target.value)}
                  placeholder="Nhập tiêu đề cuộc họp (VD: Họp giao ban điều hành tuần 2 tháng 11)..."
                  className="flex-1 min-w-0 text-base md:text-lg font-extrabold text-slate-900 placeholder:text-slate-300 placeholder:font-semibold bg-transparent border-0 focus:outline-none"
                />

                {/* Cụm Ngày họp + Đồng hồ Giờ bắt đầu - kết thúc tự động thời gian thực (không dùng hộp chọn giờ) */}
                <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 shrink-0">
                  <i className="bi bi-calendar3 text-cyan-600 text-[11px]" />
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => {
                      setDateInput(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-[114px] bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  />
                  <span className="text-slate-300">|</span>
                  <span
                    title="Giờ bắt đầu và giờ kết thúc tự động ghi nhận theo thời gian thực"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 whitespace-nowrap"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isLiveClockActive ? 'bg-emerald-500 animate-pulse' : 'bg-cyan-500'
                      }`}
                    />
                    <span>
                      {displayStartTime} – {displayEndTime}
                    </span>
                  </span>
                </div>
              </div>

              {/* Dòng 2: Phòng họp + Chủ tọa + Thư ký (chỉ từ người dự họp) + Người dự họp trên CÙNG 1 DÒNG */}
              {workspaceMode !== 'focus' && (
                <div className="pt-2 border-t border-dashed border-slate-200 flex flex-wrap md:flex-nowrap items-center gap-2 text-xs">
                  {/* Phòng họp */}
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 h-8 w-full sm:w-[130px] lg:w-[150px] shrink-0">
                    <i className="bi bi-geo-alt text-cyan-600 text-[11px] shrink-0" />
                    <input
                      type="text"
                      list="meeting-locations-list"
                      value={draft.location}
                      onChange={(e) => updateDraftField('location', e.target.value)}
                      placeholder="Phòng họp..."
                      className="w-full min-w-0 bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    <datalist id="meeting-locations-list">
                      {PRESET_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                  </div>

                  {/* Chủ tọa */}
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 h-8 flex-1 min-w-[140px]">
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">Chủ tọa:</span>
                    <select
                      value={draft.host}
                      onChange={(e) => updateDraftField('host', e.target.value)}
                      className="w-full min-w-0 bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer truncate"
                    >
                      <option value="">-- Chọn chủ tọa --</option>
                      {draft.host &&
                        !staffList.some(
                          (s) => s.name.trim().toLowerCase() === draft.host.trim().toLowerCase()
                        ) && <option value={draft.host}>{draft.host}</option>}
                      {staffList.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} {s.position ? `(${s.position})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Thư ký: CHỈ giới hạn trong danh sách nhân viên tham dự họp */}
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 h-8 flex-1 min-w-[150px]">
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">Thư ký:</span>
                    <select
                      value={draft.secretary}
                      onChange={(e) => updateDraftField('secretary', e.target.value)}
                      disabled={attendeeSecretaryOptions.length === 0 && !draft.secretary}
                      title={
                        attendeeSecretaryOptions.length === 0
                          ? 'Vui lòng chọn thành viên dự họp trước để chỉ định Thư ký'
                          : 'Chọn Thư ký trong số các nhân viên tham dự họp'
                      }
                      className="w-full min-w-0 bg-transparent text-xs font-semibold text-slate-800 disabled:text-slate-400 focus:outline-none cursor-pointer truncate"
                    >
                      <option value="">
                        {attendeeSecretaryOptions.length === 0
                          ? '-- Chọn người dự họp trước --'
                          : '-- Chọn thư ký dự họp --'}
                      </option>
                      {draft.secretary &&
                        !attendeeSecretaryOptions.some(
                          (a) =>
                            a.name.trim().toLowerCase() === draft.secretary.trim().toLowerCase()
                        ) && <option value={draft.secretary}>{draft.secretary}</option>}
                      {attendeeSecretaryOptions.map((att) => (
                        <option key={att.id || att.name} value={att.name}>
                          {att.name} {att.department ? `(${att.department})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Datalist nhân sự cho bảng phân công đầu việc bên dưới */}
                  <datalist id="meeting-staff-datalist">
                    {staffList.map((s) => (
                      <option
                        key={s.id}
                        value={s.name}
                        label={`${s.position || ''} - ${s.department || ''}`}
                      />
                    ))}
                  </datalist>

                  {/* Cụm Avatar Thành viên dự họp nằm ngay cùng dòng bên phải */}
                  <button
                    type="button"
                    onClick={() => setIsAttendeeDrawerOpen(true)}
                    title={
                      draft.attendees.length > 0
                        ? `Dự họp: ${draft.attendees.map((a) => a.name).join(', ')}`
                        : 'Nhấn để chọn thành viên tham dự cuộc họp'
                    }
                    className="h-8 shrink-0 inline-flex items-center gap-2 px-2.5 rounded-lg border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100/70 text-cyan-800 transition-colors cursor-pointer"
                  >
                    {draft.attendees.length > 0 ? (
                      <div className="flex items-center -space-x-1.5">
                        {draft.attendees.slice(0, 3).map((att, i) => (
                          <span
                            key={att.id || i}
                            className="w-5 h-5 rounded-full bg-cyan-600 text-white border border-white text-[9px] font-bold inline-flex items-center justify-center"
                          >
                            {getInitials(att.name)}
                          </span>
                        ))}
                        {draft.attendees.length > 3 && (
                          <span className="w-5 h-5 rounded-full bg-slate-700 text-white border border-white text-[9px] font-bold inline-flex items-center justify-center">
                            +{draft.attendees.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <i className="bi bi-people-fill text-cyan-600 text-xs" />
                    )}
                    <span className="text-xs font-bold whitespace-nowrap">
                      {draft.attendees.length > 0
                        ? `${draft.attendees.length} dự họp`
                        : '+ Người dự họp'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* =================================================================
                TRANG GIẤY SỔ GHI CHÉP LỚN (MAIN NOTEBOOK CANVAS - CHIẾM TRỌN TÂM ĐIỂM)
            ================================================================= */}
            <div
              className={`${
                workspaceMode === 'tasks' ? 'hidden' : 'flex'
              } flex-col flex-1 rounded-xl border border-slate-200/95 bg-white shadow-xs overflow-hidden ${
                workspaceMode === 'focus' ? 'min-h-[520px]' : 'min-h-[410px]'
              }`}
            >
              {/* Thanh công cụ soạn thảo của cuốn sổ (ghim cố định phía trên mặt giấy) */}
              <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('formatBlock', 'H3');
                      }}
                      title="Đề mục lớn"
                      className="px-2 h-6 rounded hover:bg-slate-100 text-slate-700 text-[11px] font-extrabold cursor-pointer"
                    >
                      Mục lớn
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('formatBlock', 'P');
                      }}
                      title="Văn bản thường"
                      className="px-1.5 h-6 rounded hover:bg-slate-100 text-slate-600 text-[11px] font-medium cursor-pointer"
                    >
                      Đoạn
                    </button>
                    <span className="w-px h-4 bg-slate-200 mx-0.5" />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('bold');
                      }}
                      title="In đậm (Ctrl+B)"
                      className="w-7 h-6 rounded hover:bg-slate-100 text-slate-800 text-xs font-black cursor-pointer"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('italic');
                      }}
                      title="In nghiêng (Ctrl+I)"
                      className="w-7 h-6 rounded hover:bg-slate-100 text-slate-800 text-xs italic font-serif cursor-pointer"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('underline');
                      }}
                      title="Gạch chân (Ctrl+U)"
                      className="w-7 h-6 rounded hover:bg-slate-100 text-slate-800 text-xs underline cursor-pointer"
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('hiliteColor', '#fef08a');
                      }}
                      title="Bút dạ quang đánh dấu ý quan trọng"
                      className="w-7 h-6 rounded hover:bg-amber-100 text-amber-600 text-xs cursor-pointer flex items-center justify-center"
                    >
                      <i className="bi bi-highlighter" />
                    </button>
                    <span className="w-px h-4 bg-slate-200 mx-0.5" />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('insertUnorderedList');
                      }}
                      title="Danh sách gạch đầu dòng"
                      className="w-7 h-6 rounded hover:bg-slate-100 text-slate-700 text-xs cursor-pointer"
                    >
                      <i className="bi bi-list-ul" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('insertOrderedList');
                      }}
                      title="Danh sách đánh số thứ tự"
                      className="w-7 h-6 rounded hover:bg-slate-100 text-slate-700 text-xs cursor-pointer"
                    >
                      <i className="bi bi-list-ol" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleInsertStructuredTemplate}
                    className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <i className="bi bi-layout-text-window-reverse text-cyan-600" />
                    <span>Chèn mẫu giao ban</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaperStyle((s) => (s === 'lined' ? 'plain' : 'lined'))}
                    title="Đổi kiểu mặt giấy sổ tay"
                    className="h-7 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-600 flex items-center gap-1 cursor-pointer"
                  >
                    <i className={`bi ${paperStyle === 'lined' ? 'bi-justify-left' : 'bi-file-earmark'}`} />
                    <span className="hidden sm:inline">
                      {paperStyle === 'lined' ? 'Giấy kẻ ngang' : 'Giấy trơn'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleVoiceDictation}
                    className={`h-7 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 border-rose-600 text-white animate-pulse'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <i className={`bi ${isListening ? 'bi-mic-fill' : 'bi-mic'}`} />
                    <span>{isListening ? 'Đang chép lời...' : 'Đọc thành chữ'}</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <i className="bi bi-paperclip text-slate-500" />
                    <span>Đính kèm ({draft.files.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setWorkspaceMode((m) => (m === 'focus' ? 'split' : 'focus'))
                    }
                    title={
                      workspaceMode === 'focus'
                        ? 'Thu về chế độ toàn trang'
                        : 'Phóng rộng tối đa vùng ghi chép'
                    }
                    className={`h-7 w-7 rounded-lg border flex items-center justify-center text-xs transition-colors cursor-pointer ${
                      workspaceMode === 'focus'
                        ? 'bg-cyan-600 border-cyan-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i
                      className={`bi ${
                        workspaceMode === 'focus'
                          ? 'bi-fullscreen-exit'
                          : 'bi-arrows-fullscreen'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Mặt trang giấy sổ tay thực thụ có lề sổ đỏ nhạt & dòng kẻ 32px chuẩn */}
              <div
                className={`relative flex-1 flex min-h-0 ${
                  paperStyle === 'lined' ? 'bg-[#fffdf8]' : 'bg-white'
                }`}
              >
                {paperStyle === 'lined' && (
                  <div
                    aria-hidden="true"
                    className="hidden sm:block w-9 shrink-0 border-r-2 border-rose-200/75 select-none pointer-events-none"
                  />
                )}

                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  onInput={(e) => {
                    const html = (e.currentTarget as HTMLDivElement).innerHTML;
                    setDraft((prev) => ({ ...prev, minutes: html }));
                    setIsDirty(true);
                  }}
                  data-placeholder="Ghi chép diễn biến cuộc họp, nội dung báo cáo của từng bộ phận và ý kiến kết luận chỉ đạo của Chủ tọa..."
                  style={
                    paperStyle === 'lined'
                      ? {
                          backgroundImage:
                            'linear-gradient(to bottom, transparent 31px, rgba(203, 213, 225, 0.55) 31px, rgba(203, 213, 225, 0.55) 32px)',
                          backgroundSize: '100% 32px',
                          backgroundPosition: '0 0',
                          backgroundOrigin: 'padding-box',
                          backgroundAttachment: 'local',
                          lineHeight: '32px',
                          paddingTop: '5px',
                          paddingBottom: '16px',
                        }
                      : {
                          lineHeight: '1.8',
                          paddingTop: '14px',
                          paddingBottom: '16px',
                        }
                  }
                  className={`flex-1 w-full min-h-[340px] px-5 md:px-7 text-[15px] text-slate-800 focus:outline-none overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:italic [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 ${
                    paperStyle === 'lined'
                      ? '[&_p]:m-0 [&_p]:leading-[32px] [&_div]:m-0 [&_div]:leading-[32px] [&_ul]:my-0 [&_ol]:my-0 [&_li]:m-0 [&_li]:leading-[32px] [&_h3]:m-0 [&_h3]:text-[15.5px] [&_h3]:font-extrabold [&_h3]:text-slate-900 [&_h3]:leading-[32px]'
                      : '[&_p]:m-0 [&_h3]:text-base [&_h3]:font-extrabold [&_h3]:text-slate-900 [&_h3]:mt-2 [&_h3]:mb-0'
                  }`}
                />
              </div>

              {/* Chân trang giấy: Đính kèm tệp + Thống kê từ & phím tắt */}
              {draft.files.length > 0 && (
                <div className="px-4 py-2 bg-slate-50/90 border-t border-slate-200 flex flex-wrap gap-2 shrink-0">
                  {draft.files.map((f) => {
                    const isImage = (f.type || '').startsWith('image/');
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs max-w-[250px]"
                      >
                        {isImage ? (
                          <img
                            src={f.dataUrl}
                            alt={f.name}
                            className="w-7 h-7 rounded object-cover border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                            <i className="bi bi-file-earmark-text" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <a
                            href={f.dataUrl}
                            download={f.name}
                            className="font-semibold text-slate-800 hover:text-cyan-700 truncate block"
                          >
                            {f.name}
                          </a>
                          <span className="text-[10px] text-slate-400">
                            {formatFileSize(f.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(f.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <i className="bi bi-x-lg text-[11px]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="px-4 py-1.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                <span>
                  Đã ghi chép <b className="text-slate-600">{wordCount}</b> từ
                </span>
                <div className="flex items-center gap-3">
                  {workspaceMode === 'focus' && (
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('tasks')}
                      className="text-cyan-600 hover:text-cyan-700 font-semibold cursor-pointer"
                    >
                      Chuyển sang Bảng phân công việc ({draft.actionItems.length}) →
                    </button>
                  )}
                  <span className="hidden sm:inline">Nhấn Ctrl + S để lưu nhanh</span>
                </div>
              </div>
            </div>

            {/* =================================================================
                PHẦN KẾT LUẬN & PHÂN CÔNG ĐẦU VIỆC (ẨN KHI Ở CHẾ ĐỘ TẬP TRUNG VIẾT)
            ================================================================= */}
            {workspaceMode !== 'focus' && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs shrink-0">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <i className="bi bi-check2-square text-cyan-600 text-sm" />
                      Kết luận &amp; Phân công đầu việc sau họp
                    </span>
                    {draft.actionItems.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-[11px] font-bold text-cyan-700">
                        Hoàn thành {completedCount}/{draft.actionItems.length}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddActionItem}
                    className="h-7 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <i className="bi bi-plus-lg" />
                    <span>Thêm đầu việc kết luận</span>
                  </button>
                </div>

                {draft.actionItems.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
                    <span>
                      Chưa có đầu việc phân công nào. Nhấn <b>+ Thêm đầu việc kết luận</b> để giao người phụ trách và đồng bộ sang Công việc.
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase">
                          <th className="py-2 px-3 w-10 text-center">Xong</th>
                          <th className="py-2 px-3 min-w-[240px]">Nội dung kết luận / Đầu việc</th>
                          <th className="py-2 px-3 w-[195px]">Người thực hiện</th>
                          <th className="py-2 px-3 w-[135px]">Hạn hoàn thành</th>
                          <th className="py-2 px-3 w-[155px] text-right">Liên thông Công việc</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {draft.actionItems.map((item) => {
                          const isSyncing = Boolean(syncingItemIds[item.id]);
                          const isSynced = Boolean(item.syncedTaskId);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={(e) =>
                                    handleUpdateActionItem(item.id, {
                                      completed: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.task}
                                  onChange={(e) =>
                                    handleUpdateActionItem(item.id, { task: e.target.value })
                                  }
                                  placeholder="Nhập đầu việc cần triển khai..."
                                  className={`w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:border-cyan-500 focus:outline-none ${
                                    item.completed
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-800 font-medium'
                                  }`}
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  list="meeting-staff-datalist"
                                  value={item.assignee}
                                  onChange={(e) =>
                                    handleUpdateActionItem(item.id, { assignee: e.target.value })
                                  }
                                  placeholder="Chọn người phụ trách..."
                                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-cyan-500 focus:outline-none"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="date"
                                  value={item.deadline || ''}
                                  onChange={(e) =>
                                    handleUpdateActionItem(item.id, { deadline: e.target.value })
                                  }
                                  className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:border-cyan-500 focus:outline-none"
                                />
                              </td>

                              <td className="py-2 px-3 text-right">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  {isSynced ? (
                                    <span
                                      title={`Mã công việc: ${item.syncedTaskCode || item.syncedTaskId}`}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700"
                                    >
                                      <i className="bi bi-check-circle-fill" />
                                      <span>Đã giao CV</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isSyncing}
                                      onClick={() => handleAssignTaskFromMeeting(item)}
                                      className="h-7 px-2.5 rounded-lg bg-cyan-50 hover:bg-cyan-600 hover:text-white border border-cyan-200 text-cyan-700 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      <i
                                        className={`bi ${
                                          isSyncing
                                            ? 'bi-arrow-repeat animate-spin'
                                            : 'bi-send-check'
                                        }`}
                                      />
                                      <span>{isSyncing ? 'Đang giao...' : 'Giao việc'}</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveActionItem(item.id)}
                                    title="Xóa dòng này"
                                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <i className="bi bi-x-lg text-[11px]" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* =======================================================================
          OFFCANVAS CHỌN THÀNH VIÊN DỰ HỌP (CHUẨN CỐ ĐỊNH WIDTH="400px" THEO AGENTS.MD)
      ======================================================================= */}
      <Offcanvas
        isOpen={isAttendeeDrawerOpen}
        onClose={() => setIsAttendeeDrawerOpen(false)}
        width="400px"
        title="Thành viên tham dự cuộc họp"
        description={`Đã chọn ${draft.attendees.length} nhân sự`}
        confirmText="Hoàn tất"
        onConfirm={() => setIsAttendeeDrawerOpen(false)}
      >
        <div className="space-y-3">
          {/* Danh sách đang chọn để gỡ nhanh 1 chạm */}
          {draft.attendees.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100">
              {draft.attendees.map((att) => (
                <span
                  key={att.id || att.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-[11px] font-semibold text-cyan-800"
                >
                  <span>{att.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => {
                        setIsDirty(true);
                        const nextAttendees = prev.attendees.filter(
                          (x) => (x.id || x.name) !== (att.id || att.name)
                        );
                        const secretaryStillAttending = nextAttendees.some(
                          (x) =>
                            x.name.trim().toLowerCase() ===
                            (prev.secretary || '').trim().toLowerCase()
                        );
                        return {
                          ...prev,
                          attendees: nextAttendees,
                          secretary: secretaryStillAttending ? prev.secretary : '',
                        };
                      })
                    }
                    className="text-cyan-600 hover:text-rose-600 cursor-pointer"
                  >
                    <i className="bi bi-x" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
              placeholder="Tìm tên nhân sự, chức vụ, bộ phận..."
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:border-cyan-500 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={attendeeDeptFilter}
                onChange={(e) => setAttendeeDeptFilter(e.target.value)}
                className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:border-cyan-500 focus:outline-none"
              >
                <option value="all">Tất cả bộ phận ({staffList.length})</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSelectDepartmentHeads}
                className="h-8 px-2.5 rounded-lg border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[11px] font-bold shrink-0 cursor-pointer"
              >
                + Các Trưởng BP
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {filteredStaffForDrawer.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Không tìm thấy nhân sự phù hợp
              </div>
            ) : (
              filteredStaffForDrawer.map((staff) => {
                const checked = isStaffSelectedAsAttendee(staff);
                return (
                  <label
                    key={staff.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                      checked ? 'bg-cyan-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleAttendee(staff)}
                      className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">{staff.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {staff.position || 'Nhân viên'} • {staff.department || 'Seajong'}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </Offcanvas>

      {/* HỘP THOẠI XÁC NHẬN XÓA BIÊN BẢN (CONFIRM DIALOG CHUẨN HỆ THỐNG) */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        isLoading={deleting}
        title="Xóa trang biên bản cuộc họp"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn biên bản cuộc họp "${draft.title}" khỏi Sổ ghi chép cuộc họp không?`}
        confirmText="Xóa biên bản"
        cancelText="Giữ lại"
      />
    </StandardPage>
  );
};

export default MeetingNotebookPage;
