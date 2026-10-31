import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  PersonPlus,
  PersonBadge,
  CalendarCheck,
  Building,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  X,
  Telephone,
  Envelope,
} from 'react-bootstrap-icons';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DeleteButton } from '../../components/common/DeleteButton';
import { DepartmentSelect, matchDepartment } from '../../components/common/DepartmentSelect';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { EmployeeSelect } from '../../components/common/EmployeeSelect';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export interface RecruitmentManagementViewProps {
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

// ─────────────────────────────────────────────────────────────
// 1. KIỂU DỮ LIỆU BƯỚC 1: YÊU CẦU TUYỂN DỤNG
// ─────────────────────────────────────────────────────────────
export interface RecruitmentRequestItem {
  id: string;
  code: string;
  position: string;
  department: string;
  quantity: number;
  salaryRange: string;
  experienceLevel: string;
  requestDate: string;
  deadline: string;
  priority: 'urgent' | 'high' | 'normal';
  requester: string;
  status: 'recruiting' | 'completed' | 'pending';
  statusLabel: string;
  description: string;
  receivedCount: number;
}

// ─────────────────────────────────────────────────────────────
// 2. KIỂU DỮ LIỆU BƯỚC 2: DANH SÁCH ỨNG VIÊN
// ─────────────────────────────────────────────────────────────
export interface CandidateItem {
  id: string;
  code: string;
  fullName: string;
  gender?: string;
  permanentAddress?: string;
  phone: string;
  email: string;
  appliedPosition: string;
  experience: string;
  education: string;
  source: 'VietnamWorks' | 'Facebook' | 'Giới thiệu nội bộ' | 'Trực tiếp' | 'TopCV' | string;
  appliedDate: string;
  status: 'waiting_interview' | 'interviewing' | 'received' | 'rejected' | string;
  statusLabel: string;
  note?: string;
}

// Chuẩn hoá trạng thái ứng viên sang 4 trạng thái quy định
export const normalizeCandidateStatus = (
  status?: string,
  label?: string
): { status: 'waiting_interview' | 'interviewing' | 'received' | 'rejected'; label: string } => {
  const s = (status || '').toLowerCase();
  const l = (label || '').toLowerCase();

  if (s === 'waiting_interview' || s === 'interview_scheduled' || l.includes('chờ phỏng vấn') || l.includes('xếp lịch pv')) {
    return { status: 'waiting_interview', label: 'Chờ phỏng vấn' };
  }
  if (s === 'interviewing' || s === 'reviewed' || l.includes('đang phỏng vấn') || l.includes('duyệt cv')) {
    return { status: 'interviewing', label: 'Đang phỏng vấn' };
  }
  if (s === 'rejected' || l.includes('từ chối') || l.includes('không phù hợp')) {
    return { status: 'rejected', label: 'Từ chối' };
  }
  return { status: 'received', label: 'Đã tiếp nhận' };
};

// ─────────────────────────────────────────────────────────────
// 3. KIỂU DỮ LIỆU BƯỚC 3: DANH SÁCH PHỎNG VẤN
// ─────────────────────────────────────────────────────────────
export interface InterviewItem {
  id: string;
  code: string;
  candidateName: string;
  candidatePhone: string;
  position: string;
  round: 'round_1' | 'round_2' | 'round_3';
  roundLabel: string;
  interviewDate: string;
  interviewTime: string;
  location: string;
  interviewers: string;
  score?: number;
  result: 'pending' | 'passed' | 'failed' | 'offered' | 'considering';
  resultLabel: string;
  notes?: string;
  hasProbation?: boolean;
  probationDays?: number;
  probationSupervisor?: string;
  probationStartDate?: string;
}

// Chuẩn hoá kết quả phỏng vấn sang 3 trạng thái quy định theo bộ lọc kết quả
export const normalizeInterviewResult = (
  result?: string,
  label?: string
): { key: 'interviewing' | 'passed' | 'failed'; label: 'Đang phỏng vấn' | 'Đạt yêu cầu' | 'Không đạt yêu cầu' } => {
  const r = (result || '').toLowerCase();
  const l = (label || '').toLowerCase();

  if (r === 'failed' || r === 'rejected' || l.includes('không đạt') || l.includes('từ chối') || l.includes('loại')) {
    return { key: 'failed', label: 'Không đạt yêu cầu' };
  }

  if (
    (r === 'passed' || r === 'offered' || l.includes('đạt') || l.includes('offer') || l.includes('trúng tuyển')) &&
    !l.includes('không đạt')
  ) {
    return { key: 'passed', label: 'Đạt yêu cầu' };
  }

  return { key: 'interviewing', label: 'Đang phỏng vấn' };
};

// Chuyển đổi DD/MM/YYYY sang YYYY-MM-DD cho input type="date"
const toInputDate = (dStr: string) => {
  if (!dStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  const parts = dStr.split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return '';
};

// Chuyển đổi YYYY-MM-DD sang DD/MM/YYYY để lưu và hiển thị
const toDisplayDate = (dStr: string) => {
  if (!dStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dStr)) return dStr;
  const parts = dStr.split('-');
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  }
  return dStr;
};

// Lấy ngày hôm nay dạng YYYY-MM-DD để khoá các ngày quá khứ (min date)
const getTodayDateStr = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const RecruitmentManagementView: React.FC<RecruitmentManagementViewProps> = ({
  currentStep = 1,
  onStepChange: _onStepChange,
  onShowToast,
}) => {
  // ─────────────────────────────────────────────────────────────
  // STATE BƯỚC 1: YÊU CẦU TUYỂN DỤNG (TỪ DATABASE)
  // ─────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<RecruitmentRequestItem[]>([]);
  const [loadingStep1, setLoadingStep1] = useState<boolean>(true);
  const [searchStep1, setSearchStep1] = useState('');
  const [deptFilterStep1, setDeptFilterStep1] = useState('all');
  const [statusFilterStep1, setStatusFilterStep1] = useState('all');
  const [priorityFilterStep1, setPriorityFilterStep1] = useState('all');
  const [pageStep1, setPageStep1] = useState(1);
  const [pageSizeStep1, setPageSizeStep1] = useState(10);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);

  // ─────────────────────────────────────────────────────────────
  // STATE BƯỚC 2: DANH SÁCH ỨNG VIÊN (TỪ DATABASE)
  // ─────────────────────────────────────────────────────────────
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [loadingStep2, setLoadingStep2] = useState<boolean>(true);
  const [searchStep2, setSearchStep2] = useState('');
  const [statusFilterStep2, setStatusFilterStep2] = useState('all');
  const [pageStep2, setPageStep2] = useState(1);
  const [pageSizeStep2, setPageSizeStep2] = useState(10);
  const [selectedCandIds, setSelectedCandIds] = useState<string[]>([]);
  const [collapsedPositions, setCollapsedPositions] = useState<Record<string, boolean>>({});

  const togglePositionCollapse = (pos: string) => {
    setCollapsedPositions((prev) => ({
      ...prev,
      [pos]: !prev[pos],
    }));
  };

  // ─────────────────────────────────────────────────────────────
  // STATE BƯỚC 3: DANH SÁCH PHỎNG VẤN (TỪ DATABASE)
  // ─────────────────────────────────────────────────────────────
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [loadingStep3, setLoadingStep3] = useState<boolean>(true);
  const [searchStep3, setSearchStep3] = useState('');
  const [resultFilterStep3, setResultFilterStep3] = useState('all');
  const [pageStep3, setPageStep3] = useState(1);
  const [pageSizeStep3, setPageSizeStep3] = useState(10);
  const [selectedIntIds, setSelectedIntIds] = useState<string[]>([]);
  const [collapsedIntPositions, setCollapsedIntPositions] = useState<Record<string, boolean>>({});

  const toggleIntPositionCollapse = (pos: string) => {
    setCollapsedIntPositions((prev) => ({
      ...prev,
      [pos]: !prev[pos],
    }));
  };

  // ─────────────────────────────────────────────────────────────
  // FETCH DỮ LIỆU THỰC TẾ TỪ CSDL SQLite
  // ─────────────────────────────────────────────────────────────
  const fetchRequests = async () => {
    try {
      setLoadingStep1(true);
      const res = await fetch('/api/recruitment/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
      }
    } catch (err) {
      console.error('Lỗi khi tải yêu cầu tuyển dụng:', err);
    } finally {
      setLoadingStep1(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoadingStep2(true);
      const res = await fetch('/api/recruitment/candidates');
      if (res.ok) {
        const data = await res.json();
        setCandidates(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách ứng viên:', err);
    } finally {
      setLoadingStep2(false);
    }
  };

  const fetchInterviews = async () => {
    try {
      setLoadingStep3(true);
      const res = await fetch('/api/recruitment/interviews');
      if (res.ok) {
        const data = await res.json();
        setInterviews(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch phỏng vấn:', err);
    } finally {
      setLoadingStep3(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchCandidates();
    fetchInterviews();

    // Lấy danh sách chức vụ thực tế từ CSDL
    fetch('/api/positions')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((p: any) => (typeof p === 'string' ? p : p?.name)).filter(Boolean);
          if (names.length > 0) setPositionList(names);
        }
      })
      .catch((err) => console.error('Lỗi khi tải danh sách chức vụ:', err));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // MODALS VÀ OFFCANVAS CHO THÊM / SỬA / XEM CHI TIẾT
  // ─────────────────────────────────────────────────────────────
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<RecruitmentRequestItem | null>(null);
  const [reqFormPosition, setReqFormPosition] = useState('');
  const [reqFormDepartment, setReqFormDepartment] = useState('Phòng Kinh doanh');
  const [reqFormQuantity, setReqFormQuantity] = useState('1');
  const [reqFormSalary, setReqFormSalary] = useState('');
  const [reqFormExperience, setReqFormExperience] = useState('');
  const [reqFormDeadline, setReqFormDeadline] = useState('');
  const [reqFormPriority, setReqFormPriority] = useState<'urgent' | 'high' | 'normal'>('normal');
  const [reqFormStatus, setReqFormStatus] = useState<RecruitmentRequestItem['status']>('recruiting');
  const [reqFormRequester, setReqFormRequester] = useState('');
  const [reqFormDescription, setReqFormDescription] = useState('');

  const [candModalOpen, setCandModalOpen] = useState(false);
  const [editingCand, setEditingCand] = useState<CandidateItem | null>(null);
  const [candFormName, setCandFormName] = useState('');
  const [candFormGender, setCandFormGender] = useState('Nam');
  const [candFormPhone, setCandFormPhone] = useState('');
  const [candFormEmail, setCandFormEmail] = useState('');
  const [candFormAddress, setCandFormAddress] = useState('');
  const [candFormPosition, setCandFormPosition] = useState('');
  const [candFormExp, setCandFormExp] = useState('');
  const [candFormEdu, setCandFormEdu] = useState('');
  const [candFormSource, setCandFormSource] = useState<CandidateItem['source']>('TopCV');
  const [candFormStatus, setCandFormStatus] = useState<CandidateItem['status']>('waiting_interview');
  const [candFormNote, setCandFormNote] = useState('');

  const [isInterviewSlideOpen, setIsInterviewSlideOpen] = useState(false);
  const [slideRound, setSlideRound] = useState<'round_1' | 'round_2' | 'round_3'>('round_1');
  const [slideDate, setSlideDate] = useState('');
  const [slideTime, setSlideTime] = useState('09:00');
  const [slideLocation, setSlideLocation] = useState('Phòng họp số 1 - Tầng 2');
  const [slideInterviewers, setSlideInterviewers] = useState('');
  const [slideNotes, setSlideNotes] = useState('');
  const [submittingSlideInt, setSubmittingSlideInt] = useState(false);

  const [intModalOpen, setIntModalOpen] = useState(false);
  const [editingInt, setEditingInt] = useState<InterviewItem | null>(null);
  const [intFormCandName, setIntFormCandName] = useState('');
  const [intFormPhone, setIntFormPhone] = useState('');
  const [intFormPosition, setIntFormPosition] = useState('');
  const [intFormRound, setIntFormRound] = useState<InterviewItem['round']>('round_1');
  const [intFormDate, setIntFormDate] = useState('');
  const [intFormTime, setIntFormTime] = useState('');
  const [intFormLocation, setIntFormLocation] = useState('Phòng họp số 1 - Tầng 2');
  const [intFormInterviewers, setIntFormInterviewers] = useState('');
  const [intFormScore, setIntFormScore] = useState('');
  const [intFormResult, setIntFormResult] = useState<InterviewItem['result']>('pending');
  const [intFormNotes, setIntFormNotes] = useState('');
  const [intFormHasProbation, setIntFormHasProbation] = useState(false);
  const [intFormProbationDays, setIntFormProbationDays] = useState('60');
  const [intFormProbationStartDate, setIntFormProbationStartDate] = useState('');
  const [intFormProbationSupervisor, setIntFormProbationSupervisor] = useState('');

  const [intFormInitEmployee, setIntFormInitEmployee] = useState(false);
  const [empFormDepartment, setEmpFormDepartment] = useState('Phòng Kinh doanh');
  const [empFormPosition, setEmpFormPosition] = useState('Nhân viên');
  const [positionList, setPositionList] = useState<string[]>([]);

  const activeRecruitingPositions = useMemo(() => {
    const validStatuses = ['recruiting', 'pending'];
    const filtered = requests.filter((r) => validStatuses.includes(r.status) && r.position && r.position.trim());
    return Array.from(new Set(filtered.map((r) => r.position.trim())));
  }, [requests]);

  const guessDeptFromPosition = (pos: string) => {
    const p = (pos || '').toLowerCase();
    if (p.includes('kinh doanh') || p.includes('sales') || p.includes('đại lý')) return 'Phòng Kinh doanh';
    if (p.includes('kế toán') || p.includes('tài chính')) return 'Phòng Tài chính - Kế toán';
    if (p.includes('kỹ thuật') || p.includes('thiết kế') || p.includes('showroom')) return 'Phòng Kỹ thuật - Thiết kế';
    if (p.includes('kho') || p.includes('cung ứng')) return 'Phòng Cung ứng - Kho vận';
    if (p.includes('marketing') || p.includes('truyền thông')) return 'Phòng Marketing';
    return 'Phòng Hành chính - Nhân sự';
  };

  const guessPosition = (pos: string, availablePositions: string[]) => {
    const p = (pos || '').toLowerCase();
    if (p.includes('trưởng phòng') || p.includes('tp ') || p.includes('phó phòng')) {
      const match = availablePositions.find((item) => item.toLowerCase().includes('trưởng phòng'));
      if (match) return match;
    }
    if (p.includes('quản đốc') || p.includes('xưởng')) {
      const match = availablePositions.find((item) => item.toLowerCase().includes('quản đốc'));
      if (match) return match;
    }
    if (p.includes('kế toán')) {
      const match = availablePositions.find((item) => item.toLowerCase().includes('kế toán'));
      if (match) return match;
    }
    if (p.includes('thủ kho') || p.includes('kho')) {
      const match = availablePositions.find((item) => item.toLowerCase().includes('thủ kho'));
      if (match) return match;
    }
    if (p.includes('giám đốc')) {
      const match = availablePositions.find((item) => item.toLowerCase().includes('giám đốc'));
      if (match) return match;
    }
    const nhanVien = availablePositions.find((item) => item.toLowerCase() === 'nhân viên');
    return nhanVien || availablePositions[0] || 'Nhân viên';
  };

  const positionOptions = useMemo(() => {
    const list = [...positionList];
    if (list.length === 0) {
      return [
        { value: 'Nhân viên', label: 'Nhân viên' },
        { value: 'Kế toán', label: 'Kế toán' },
        { value: 'Trưởng phòng', label: 'Trưởng phòng' },
        { value: 'Kỹ thuật viên', label: 'Kỹ thuật viên' },
        { value: 'Thủ kho', label: 'Thủ kho' },
      ];
    }
    if (empFormPosition && !list.includes(empFormPosition)) {
      list.push(empFormPosition);
    }
    return list.map((item) => ({ value: item, label: item }));
  }, [positionList, empFormPosition]);

  const [submittingReq, setSubmittingReq] = useState(false);
  const [submittingCand, setSubmittingCand] = useState(false);
  const [submittingInt, setSubmittingInt] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; step: number; title: string } | null>(null);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        searchStep1.trim() === '' ||
        (r.code || '').toLowerCase().includes(searchStep1.toLowerCase()) ||
        (r.position || '').toLowerCase().includes(searchStep1.toLowerCase()) ||
        (r.requester || '').toLowerCase().includes(searchStep1.toLowerCase()) ||
        (r.department || '').toLowerCase().includes(searchStep1.toLowerCase());

      const matchDept =
        deptFilterStep1 === 'all' || matchDepartment(r.department, deptFilterStep1);
      const matchStatus = statusFilterStep1 === 'all' || r.status === statusFilterStep1;
      const matchPriority = priorityFilterStep1 === 'all' || r.priority === priorityFilterStep1;

      return matchSearch && matchDept && matchStatus && matchPriority;
    });
  }, [requests, searchStep1, deptFilterStep1, statusFilterStep1, priorityFilterStep1]);

  const pagedRequests = useMemo(() => {
    const start = (pageStep1 - 1) * pageSizeStep1;
    return filteredRequests.slice(start, start + pageSizeStep1);
  }, [filteredRequests, pageStep1, pageSizeStep1]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch =
        searchStep2.trim() === '' ||
        (c.code || '').toLowerCase().includes(searchStep2.toLowerCase()) ||
        (c.fullName || '').toLowerCase().includes(searchStep2.toLowerCase()) ||
        (c.phone || '').toLowerCase().includes(searchStep2.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchStep2.toLowerCase()) ||
        (c.appliedPosition || '').toLowerCase().includes(searchStep2.toLowerCase());

      const norm = normalizeCandidateStatus(c.status, c.statusLabel);
      const matchStatus =
        statusFilterStep2 === 'all' ||
        norm.status === statusFilterStep2 ||
        norm.label === statusFilterStep2 ||
        c.status === statusFilterStep2;

      return matchSearch && matchStatus;
    });
  }, [candidates, searchStep2, statusFilterStep2]);

  const sortedCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => (a.appliedPosition || '').localeCompare(b.appliedPosition || '', 'vi'));
  }, [filteredCandidates]);

  const pagedCandidates = useMemo(() => {
    const start = (pageStep2 - 1) * pageSizeStep2;
    return sortedCandidates.slice(start, start + pageSizeStep2);
  }, [sortedCandidates, pageStep2, pageSizeStep2]);

  const groupedCandidates = useMemo(() => {
    const map = new Map<string, CandidateItem[]>();
    pagedCandidates.forEach((c) => {
      const pos = c.appliedPosition || 'Vị trí khác';
      if (!map.has(pos)) {
        map.set(pos, []);
      }
      map.get(pos)!.push(c);
    });

    const groups: { position: string; items: CandidateItem[] }[] = [];
    map.forEach((items, position) => {
      groups.push({ position, items });
    });
    return groups;
  }, [pagedCandidates]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      const matchSearch =
        searchStep3.trim() === '' ||
        (item.code || '').toLowerCase().includes(searchStep3.toLowerCase()) ||
        (item.candidateName || '').toLowerCase().includes(searchStep3.toLowerCase()) ||
        (item.candidatePhone || '').toLowerCase().includes(searchStep3.toLowerCase()) ||
        (item.position || '').toLowerCase().includes(searchStep3.toLowerCase()) ||
        (item.interviewers || '').toLowerCase().includes(searchStep3.toLowerCase());

      let matchResult = true;
      if (resultFilterStep3 !== 'all') {
        const norm = normalizeInterviewResult(item.result, item.resultLabel);
        matchResult = norm.key === resultFilterStep3;
      }

      return matchSearch && matchResult;
    });
  }, [interviews, searchStep3, resultFilterStep3]);

  const sortedInterviews = useMemo(() => {
    return [...filteredInterviews].sort((a, b) => {
      const posA = a.position || '';
      const posB = b.position || '';
      if (posA !== posB) {
        return posA.localeCompare(posB, 'vi');
      }
      return (a.code || '').localeCompare(b.code || '', 'vi');
    });
  }, [filteredInterviews]);

  const pagedInterviews = useMemo(() => {
    const start = (pageStep3 - 1) * pageSizeStep3;
    return sortedInterviews.slice(start, start + pageSizeStep3);
  }, [sortedInterviews, pageStep3, pageSizeStep3]);

  const groupedInterviews = useMemo(() => {
    const map = new Map<string, InterviewItem[]>();
    pagedInterviews.forEach((item) => {
      const pos = item.position || 'Vị trí khác';
      if (!map.has(pos)) {
        map.set(pos, []);
      }
      map.get(pos)!.push(item);
    });

    const groups: { position: string; items: InterviewItem[] }[] = [];
    map.forEach((items, position) => {
      groups.push({ position, items });
    });
    return groups;
  }, [pagedInterviews]);

  const matchedCandForInt = useMemo(() => {
    if (!editingInt) return null;
    return candidates.find(
      (c) =>
        (editingInt.candidatePhone && c.phone === editingInt.candidatePhone) ||
        (c.fullName || '').toLowerCase() === (editingInt.candidateName || '').toLowerCase()
    );
  }, [editingInt, candidates]);

  const handleOpenCreateReq = () => {
    setEditingReq(null);
    setReqFormPosition('');
    setReqFormDepartment('Phòng Kinh doanh');
    setReqFormQuantity('1');
    setReqFormSalary('');
    setReqFormExperience('2');
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const dd = String(nextMonth.getDate()).padStart(2, '0');
    const mm = String(nextMonth.getMonth() + 1).padStart(2, '0');
    const yyyy = nextMonth.getFullYear();
    setReqFormDeadline(`${dd}/${mm}/${yyyy}`);
    setReqFormPriority('normal');
    setReqFormStatus('recruiting');
    setReqFormRequester('');
    setReqFormDescription('');
    setReqModalOpen(true);
  };

  const handleOpenEditReq = (item: RecruitmentRequestItem) => {
    setEditingReq(item);
    setReqFormPosition(item.position);
    setReqFormDepartment(item.department);
    setReqFormQuantity(item.quantity.toString());
    setReqFormSalary(item.salaryRange);
    const expNum = (item.experienceLevel || '').replace(/\s*năm.*/i, '').trim();
    setReqFormExperience(expNum || item.experienceLevel);
    setReqFormDeadline(item.deadline);
    setReqFormPriority(item.priority);
    setReqFormStatus(item.status);
    setReqFormRequester(item.requester);
    setReqFormDescription(item.description);
    setReqModalOpen(true);
  };

  const handleSaveReq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqFormPosition.trim()) return;

    const statusLabels: Record<RecruitmentRequestItem['status'], string> = {
      recruiting: 'Đang tuyển dụng',
      completed: 'Đã hoàn thành',
      pending: 'Chờ duyệt',
    };

    let expFormatted = reqFormExperience.trim();
    if (/^\d+$/.test(expFormatted)) {
      expFormatted = `${expFormatted} năm`;
    }

    try {
      setSubmittingReq(true);
      if (editingReq) {
        await fetch(`/api/recruitment/requests/${editingReq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position: reqFormPosition,
            department: reqFormDepartment,
            quantity: parseInt(reqFormQuantity, 10) || 1,
            salaryRange: reqFormSalary,
            experienceLevel: expFormatted || '1 năm trở lên',
            deadline: reqFormDeadline,
            priority: reqFormPriority,
            status: reqFormStatus,
            statusLabel: statusLabels[reqFormStatus] || 'Đang tuyển dụng',
            requester: reqFormRequester,
            description: reqFormDescription,
          }),
        });
      } else {
        const newCode = `YCTD-2026-${String(requests.length + 1).padStart(3, '0')}`;
        await fetch('/api/recruitment/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: newCode,
            position: reqFormPosition,
            department: reqFormDepartment,
            quantity: parseInt(reqFormQuantity, 10) || 1,
            salaryRange: reqFormSalary || 'Thỏa thuận',
            experienceLevel: expFormatted || '1 năm trở lên',
            requestDate: new Date().toLocaleDateString('vi-VN'),
            deadline: reqFormDeadline || '30/11/2026',
            priority: reqFormPriority,
            requester: reqFormRequester,
            status: reqFormStatus,
            statusLabel: statusLabels[reqFormStatus] || 'Đang tuyển dụng',
            description: reqFormDescription,
            receivedCount: 0,
          }),
        });
      }
      await fetchRequests();
      setReqModalOpen(false);
    } catch (err) {
      console.error('Lỗi khi lưu yêu cầu:', err);
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleOpenCreateCand = () => {
    setIsInterviewSlideOpen(false);
    setEditingCand(null);
    setCandFormName('');
    setCandFormGender('Nam');
    setCandFormPhone('');
    setCandFormEmail('');
    setCandFormAddress('');
    setCandFormPosition(activeRecruitingPositions[0] || '');
    setCandFormExp('');
    setCandFormEdu('');
    setCandFormSource('TopCV');
    setCandFormStatus('waiting_interview');
    setCandFormNote('');
    setCandModalOpen(true);
  };

  const handleOpenEditCand = (c: CandidateItem) => {
    setIsInterviewSlideOpen(false);
    setEditingCand(c);
    setCandFormName(c.fullName);
    setCandFormGender(c.gender || 'Nam');
    setCandFormPhone(c.phone);
    setCandFormEmail(c.email);
    setCandFormAddress(c.permanentAddress || '');
    setCandFormPosition(c.appliedPosition);
    setCandFormExp(c.experience);
    setCandFormEdu(c.education);
    setCandFormSource(c.source);
    const norm = normalizeCandidateStatus(c.status, c.statusLabel);
    setCandFormStatus(norm.status);
    setCandFormNote(c.note || '');
    setCandModalOpen(true);
  };

  const handleOpenInterviewSlide = () => {
    if (!candFormName.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập họ và tên ứng viên trước khi xếp lịch phỏng vấn.');
      return;
    }
    if (!candFormPhone.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập số điện thoại của ứng viên trước khi xếp lịch phỏng vấn.');
      return;
    }
    if (!candFormPosition.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng chọn vị trí ứng tuyển trước khi xếp lịch phỏng vấn.');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');

    setSlideRound('round_1');
    setSlideDate(`${yyyy}-${mm}-${dd}`);
    setSlideTime('09:00');
    setSlideLocation('Phòng họp số 1 - Tầng 2');
    setSlideInterviewers('');
    setSlideNotes('');
    setIsInterviewSlideOpen(true);
  };

  const handleConfirmInterviewSlide = async () => {
    if (!candFormName.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập họ và tên ứng viên.');
      return;
    }
    if (!candFormPhone.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập số điện thoại của ứng viên.');
      return;
    }
    if (!slideDate) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng chọn ngày phỏng vấn.');
      return;
    }
    if (!slideTime) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng chọn giờ phỏng vấn.');
      return;
    }

    const roundLabels: Record<'round_1' | 'round_2' | 'round_3', string> = {
      round_1: 'Vòng 1 - Sơ vấn và Văn hóa',
      round_2: 'Vòng 2 - Đánh giá chuyên môn / Tay nghề',
      round_3: 'Vòng 3 - Phỏng vấn Ban Giám đốc',
    };

    try {
      setSubmittingSlideInt(true);

      const currentYear = new Date().getFullYear();
      let maxIntSeq = 0;
      interviews.forEach((item) => {
        if (item.code) {
          const match = item.code.match(/LPV-\d{4}-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxIntSeq) {
              maxIntSeq = num;
            }
          }
        }
      });
      const nextIntSeq = maxIntSeq + 1;
      const newIntCode = `LPV-${currentYear}-${String(nextIntSeq).padStart(3, '0')}`;

      const intRes = await fetch('/api/recruitment/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newIntCode,
          candidateName: candFormName.trim(),
          candidatePhone: candFormPhone.trim(),
          position: candFormPosition,
          round: slideRound,
          roundLabel: roundLabels[slideRound],
          interviewDate: toDisplayDate(slideDate),
          interviewTime: slideTime,
          location: slideLocation.trim() || 'Phòng họp Tầng 2',
          interviewers: slideInterviewers.trim() || 'Hội đồng tuyển dụng',
          score: null,
          result: 'pending',
          resultLabel: 'Chờ phỏng vấn',
          notes: slideNotes.trim(),
        }),
      });

      if (!intRes.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi ${intRes.status}`);
      }

      if (editingCand) {
        await fetch(`/api/recruitment/candidates/${editingCand.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: candFormName.trim(),
            gender: candFormGender,
            permanentAddress: candFormAddress.trim(),
            phone: candFormPhone.trim(),
            email: candFormEmail.trim(),
            appliedPosition: candFormPosition,
            experience: candFormExp.trim() || editingCand.experience,
            education: candFormEdu.trim() || editingCand.education,
            source: candFormSource,
            status: 'waiting_interview',
            statusLabel: 'Chờ phỏng vấn',
            note: candFormNote.trim(),
          }),
        });
      } else {
        let maxCandSeq = 0;
        candidates.forEach((cand) => {
          if (cand.code) {
            const match = cand.code.match(/UV-\d{4}-(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxCandSeq) maxCandSeq = num;
            }
          }
        });
        const nextCandSeq = maxCandSeq + 1;
        const newCandCode = `UV-${currentYear}-${String(nextCandSeq).padStart(3, '0')}`;

        await fetch('/api/recruitment/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: newCandCode,
            fullName: candFormName.trim(),
            gender: candFormGender,
            permanentAddress: candFormAddress.trim(),
            phone: candFormPhone.trim(),
            email: candFormEmail.trim(),
            appliedPosition: candFormPosition,
            experience: candFormExp.trim() || 'Có kinh nghiệm cơ bản',
            education: candFormEdu.trim() || 'Trung cấp / Cao đẳng',
            source: candFormSource,
            appliedDate: new Date().toLocaleDateString('vi-VN'),
            status: 'waiting_interview',
            statusLabel: 'Chờ phỏng vấn',
            note: candFormNote.trim(),
          }),
        });
      }

      await Promise.all([fetchInterviews(), fetchCandidates(), fetchRequests()]);

      setIsInterviewSlideOpen(false);
      setCandModalOpen(false);

      onShowToast?.(
        'success',
        'Thiết lập lịch phỏng vấn thành công',
        `Đã tạo lịch phỏng vấn ${newIntCode} cho ứng viên ${candFormName} vào ${toDisplayDate(slideDate)} lúc ${slideTime} và chuyển sang danh sách phỏng vấn.`
      );

      _onStepChange?.(3);
    } catch (err: any) {
      console.error('Lỗi khi thiết lập lịch phỏng vấn:', err);
      onShowToast?.(
        'error',
        'Lỗi xử lý',
        err.message || 'Không thể tạo lịch phỏng vấn cho ứng viên. Vui lòng thử lại.'
      );
    } finally {
      setSubmittingSlideInt(false);
    }
  };

  const handleSaveCand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candFormName.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập họ và tên ứng viên.');
      return;
    }
    if (!candFormPhone.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ của ứng viên.');
      return;
    }
    if (!candFormPosition.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng chọn vị trí ứng tuyển của ứng viên.');
      return;
    }

    const statusLabels: Record<string, string> = {
      waiting_interview: 'Chờ phỏng vấn',
      interviewing: 'Đang phỏng vấn',
      received: 'Đã tiếp nhận',
      rejected: 'Từ chối',
      new: 'Đã tiếp nhận',
      reviewed: 'Đang phỏng vấn',
      interview_scheduled: 'Chờ phỏng vấn',
      offered: 'Đã tiếp nhận',
    };

    try {
      setSubmittingCand(true);
      if (editingCand) {
        const res = await fetch(`/api/recruitment/candidates/${editingCand.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: candFormName.trim(),
            gender: candFormGender,
            permanentAddress: candFormAddress.trim(),
            phone: candFormPhone.trim(),
            email: candFormEmail.trim(),
            appliedPosition: candFormPosition,
            experience: candFormExp.trim() || 'Có kinh nghiệm cơ bản',
            education: candFormEdu.trim() || 'Trung cấp / Cao đẳng',
            source: candFormSource,
            status: candFormStatus,
            statusLabel: statusLabels[candFormStatus] || 'Đã tiếp nhận',
            note: candFormNote.trim(),
          }),
        });

        if (!res.ok) {
          throw new Error(`Máy chủ phản hồi mã lỗi ${res.status}`);
        }

        await Promise.all([fetchCandidates(), fetchRequests()]);
        setCandModalOpen(false);
        onShowToast?.(
          'success',
          'Cập nhật thành công',
          `Đã cập nhật hồ sơ ứng viên ${editingCand.code} - ${candFormName}.`
        );
      } else {
        const currentYear = new Date().getFullYear();
        let maxSeq = 0;
        candidates.forEach((cand) => {
          if (cand.code) {
            const match = cand.code.match(/UV-\d{4}-(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxSeq) {
                maxSeq = num;
              }
            }
          }
        });
        const nextSeq = maxSeq + 1;
        const newCode = `UV-${currentYear}-${String(nextSeq).padStart(3, '0')}`;

        const res = await fetch('/api/recruitment/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: newCode,
            fullName: candFormName.trim(),
            gender: candFormGender,
            permanentAddress: candFormAddress.trim(),
            phone: candFormPhone.trim(),
            email: candFormEmail.trim(),
            appliedPosition: candFormPosition,
            experience: candFormExp.trim() || 'Có kinh nghiệm cơ bản',
            education: candFormEdu.trim() || 'Trung cấp / Cao đẳng',
            source: candFormSource,
            appliedDate: new Date().toLocaleDateString('vi-VN'),
            status: candFormStatus,
            statusLabel: statusLabels[candFormStatus] || 'Đã tiếp nhận',
            note: candFormNote.trim(),
          }),
        });

        if (!res.ok) {
          throw new Error(`Máy chủ phản hồi mã lỗi ${res.status}`);
        }

        await Promise.all([fetchCandidates(), fetchRequests()]);
        setCandModalOpen(false);
        onShowToast?.(
          'success',
          'Tiếp nhận thành công',
          `Đã thêm mới hồ sơ ứng viên ${newCode} - ${candFormName}.`
        );
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu ứng viên:', err);
      onShowToast?.(
        'error',
        'Lỗi lưu dữ liệu',
        err.message || 'Không thể lưu hồ sơ ứng viên vào cơ sở dữ liệu. Vui lòng kiểm tra lại.'
      );
    } finally {
      setSubmittingCand(false);
    }
  };

  const handleOpenEditInt = (item: InterviewItem) => {
    setEditingInt(item);
    setIntFormCandName(item.candidateName);
    setIntFormPhone(item.candidatePhone);
    setIntFormPosition(item.position);
    setIntFormRound(item.round);
    setIntFormDate(item.interviewDate);
    setIntFormTime(item.interviewTime);
    setIntFormLocation(item.location);
    setIntFormInterviewers(item.interviewers);
    setIntFormScore(item.score !== undefined && item.score !== null ? String(item.score) : '');
    setIntFormResult(item.result);
    setIntFormNotes(item.notes || '');
    setIntFormHasProbation(Boolean(item.hasProbation));
    setIntFormProbationDays(item.probationDays ? String(item.probationDays) : '60');
    setIntFormProbationSupervisor(item.probationSupervisor || '');

    let pStart = item.probationStartDate || '';
    if (!pStart) {
      const today = new Date();
      pStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    } else if (pStart.includes('/')) {
      const parts = pStart.split('/');
      if (parts.length === 3) {
        pStart = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    setIntFormProbationStartDate(pStart);

    setIntFormInitEmployee(false);
    setEmpFormDepartment(guessDeptFromPosition(item.position));
    setEmpFormPosition(guessPosition(item.position, positionList));
    setIntModalOpen(true);
  };

  const handleSaveInt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intFormCandName.trim()) return;

    const roundLabels: Record<InterviewItem['round'], string> = {
      round_1: 'Vòng 1 - Sơ vấn nhân sự',
      round_2: 'Vòng 2 - Đánh giá tay nghề / Nghiệp vụ',
      round_3: 'Vòng 3 - Phỏng vấn Ban Giám đốc',
    };

    const resultLabels: Record<InterviewItem['result'], string> = {
      pending: 'Đang phỏng vấn',
      passed: 'Đạt yêu cầu',
      considering: 'Đang phỏng vấn',
      offered: 'Đạt yêu cầu',
      failed: 'Không đạt yêu cầu',
    };

    try {
      setSubmittingInt(true);
      if (editingInt) {
        await fetch(`/api/recruitment/interviews/${editingInt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateName: intFormCandName,
            candidatePhone: intFormPhone,
            position: intFormPosition,
            round: intFormRound,
            roundLabel: roundLabels[intFormRound],
            interviewDate: intFormDate,
            interviewTime: intFormTime,
            location: intFormLocation,
            interviewers: intFormInterviewers,
            score: intFormScore ? parseFloat(intFormScore) : null,
            result: intFormResult,
            resultLabel: resultLabels[intFormResult],
            notes: intFormNotes,
            hasProbation: intFormHasProbation,
            probationDays: intFormHasProbation ? parseInt(intFormProbationDays || '60', 10) : null,
            probationSupervisor: intFormHasProbation ? intFormProbationSupervisor : '',
            probationStartDate: intFormHasProbation ? intFormProbationStartDate : '',
          }),
        });
      } else {
        const newCode = `LPV-2026-${String(interviews.length + 1).padStart(3, '0')}`;
        await fetch('/api/recruitment/interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: newCode,
            candidateName: intFormCandName,
            candidatePhone: intFormPhone,
            position: intFormPosition,
            round: intFormRound,
            roundLabel: roundLabels[intFormRound],
            interviewDate: intFormDate || new Date().toLocaleDateString('vi-VN'),
            interviewTime: intFormTime || '10:00',
            location: intFormLocation || 'Phòng họp Tầng 2',
            interviewers: intFormInterviewers || 'Hội đồng phỏng vấn',
            score: intFormScore ? parseFloat(intFormScore) : null,
            result: intFormResult,
            resultLabel: resultLabels[intFormResult],
            notes: intFormNotes,
            hasProbation: intFormHasProbation,
            probationDays: intFormHasProbation ? parseInt(intFormProbationDays || '60', 10) : null,
            probationSupervisor: intFormHasProbation ? intFormProbationSupervisor : '',
            probationStartDate: intFormHasProbation ? intFormProbationStartDate : '',
          }),
        });
      }

      if (intFormHasProbation) {
        try {
          let startD: Date;
          if (intFormProbationStartDate && intFormProbationStartDate.includes('-')) {
            const [y, m, d] = intFormProbationStartDate.split('-').map(Number);
            startD = new Date(y, m - 1, d);
          } else {
            startD = new Date();
          }
          const numDays = parseInt(intFormProbationDays || '60', 10) || 60;
          const endD = new Date(startD.getTime() + numDays * 24 * 60 * 60 * 1000);

          const padZero = (n: number) => String(n).padStart(2, '0');
          const startStr = `${padZero(startD.getDate())}/${padZero(startD.getMonth() + 1)}/${startD.getFullYear()}`;
          const endStr = `${padZero(endD.getDate())}/${padZero(endD.getMonth() + 1)}/${endD.getFullYear()}`;
          const probationPeriod = `${startStr} - ${endStr}`;

          const candEmail =
            matchedCandForInt?.email ||
            candidates.find(
              (c) =>
                (intFormPhone && c.phone === intFormPhone) ||
                (c.fullName || '').toLowerCase().trim() === intFormCandName.toLowerCase().trim()
            )?.email ||
            '';

          let supervisorName = (intFormProbationSupervisor || '').trim();
          let supervisorDept = '';
          let supervisorRole = '';

          try {
            const usersRes = await fetch('/api/users');
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              if (Array.isArray(usersData) && supervisorName) {
                const supUser = usersData.find(
                  (u: any) => (u.name || '').toLowerCase().trim() === supervisorName.toLowerCase().trim()
                );
                if (supUser) {
                  supervisorName = supUser.name || supervisorName;
                  supervisorDept = supUser.department || '';
                  supervisorRole = supUser.position || '';
                }
              }
            }
          } catch (eUsers) {
            console.error('Lỗi khi tra cứu users:', eUsers);
          }

          const hrRes = await fetch('/api/admin/hr-items?category=probation');
          let currentProbations: any[] = [];
          if (hrRes.ok) {
            currentProbations = await hrRes.json();
          }

          const existingProb = Array.isArray(currentProbations)
            ? currentProbations.find(
                (p) =>
                  (intFormPhone && p.phone && p.phone.trim() === intFormPhone.trim()) ||
                  (p.col1 && p.col1.toLowerCase().trim() === intFormCandName.toLowerCase().trim()) ||
                  (p.title && p.title.toLowerCase().trim() === intFormCandName.toLowerCase().trim())
              )
            : null;

          if (existingProb) {
            await fetch(`/api/admin/hr-items/${existingProb.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                category: 'probation',
                title: intFormCandName.trim(),
                sub: intFormPosition.trim() || existingProb.sub || '',
                owner: supervisorName || existingProb.owner || '',
                date: probationPeriod,
                phone: intFormPhone.trim() || existingProb.phone || '',
                email: candEmail || existingProb.email || '',
                status: 'Đang thử việc',
                extra: {
                  code: existingProb.code,
                  col1: intFormCandName.trim(),
                  col2: intFormPosition.trim() || existingProb.col2 || '',
                  col3: supervisorName || existingProb.col3 || '',
                  supervisorName: supervisorName || existingProb.supervisorName || '',
                  supervisorDept: supervisorDept || existingProb.supervisorDept || '',
                  supervisorRole: supervisorRole || existingProb.supervisorRole || '',
                  col4: probationPeriod,
                  statusLabel: 'Đang thử việc',
                },
              }),
            });
          } else {
            let nextNum = 1;
            if (Array.isArray(currentProbations) && currentProbations.length > 0) {
              const maxNum = currentProbations.reduce((max: number, p: any) => {
                const match = (p.code || p.id || '').match(/(?:TV|PROB)-(\d+)/i);
                if (match) {
                  const num = parseInt(match[1], 10);
                  return num > max ? num : max;
                }
                return max;
              }, 0);
              nextNum = maxNum + 1;
            }
            const nextCode = `TV-${String(nextNum).padStart(3, '0')}`;

            await fetch('/api/admin/hr-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: nextCode,
                category: 'probation',
                title: intFormCandName.trim(),
                sub: intFormPosition.trim(),
                owner: supervisorName || 'Chưa phân công',
                date: probationPeriod,
                phone: intFormPhone.trim(),
                email: candEmail,
                department: empFormDepartment || guessDeptFromPosition(intFormPosition),
                status: 'Đang thử việc',
                extra: {
                  code: nextCode,
                  col1: intFormCandName.trim(),
                  col2: intFormPosition.trim(),
                  col3: supervisorName || 'Chưa phân công',
                  supervisorName,
                  supervisorDept,
                  supervisorRole,
                  col4: probationPeriod,
                  statusLabel: 'Đang thử việc',
                },
              }),
            });
          }

          window.dispatchEvent(new CustomEvent('decodoor_admin_hr_items_updated'));

          onShowToast?.(
            'success',
            'Đã cập nhật theo dõi thử việc',
            `Thông tin thử việc của "${intFormCandName}" đã được tự động lưu vào danh sách Theo dõi thử việc.`
          );
        } catch (errProb) {
          console.error('Lỗi khi lưu thông tin thử việc:', errProb);
        }
      }

      if (intFormInitEmployee) {
        try {
          const createEmpRes = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: intFormCandName.trim(),
              phone: intFormPhone.trim(),
              email: matchedCandForInt?.email || '',
              department: empFormDepartment,
              position: empFormPosition.trim() || intFormPosition,
              status: intFormHasProbation ? 'Thử việc' : 'Đang làm việc',
              gender: matchedCandForInt?.gender || 'Nam',
              address: matchedCandForInt?.permanentAddress || '',
              joinDate: new Date().toLocaleDateString('vi-VN'),
              startDate: new Date().toLocaleDateString('vi-VN'),
              contractType: intFormHasProbation ? 'Hợp đồng thử việc' : 'Hợp đồng có thời hạn',
            }),
          });

          if (createEmpRes.ok) {
            onShowToast?.(
              'success',
              'Khởi tạo nhân sự thành công',
              `Đã tạo hồ sơ nhân viên "${intFormCandName}" - Phòng ban: ${empFormDepartment} vào CSDL.`
            );
          }
        } catch (errEmp) {
          console.error('Lỗi khi tự động khởi tạo nhân viên:', errEmp);
        }
      }

      await fetchInterviews();
      setIntModalOpen(false);
    } catch (err) {
      console.error('Lỗi khi lưu lịch phỏng vấn:', err);
    } finally {
      setSubmittingInt(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.step === 1) {
        await fetch(`/api/recruitment/requests/${itemToDelete.id}`, { method: 'DELETE' });
        await Promise.all([fetchRequests(), fetchCandidates(), fetchInterviews()]);
        setSelectedReqIds((prev) => prev.filter((id) => id !== itemToDelete.id));
        onShowToast?.(
          'success',
          'Đã xoá yêu cầu tuyển dụng',
          'Đã xoá yêu cầu tuyển dụng cùng toàn bộ hồ sơ ứng viên (bước 2) và lịch phỏng vấn liên quan (bước 3).'
        );
      } else if (itemToDelete.step === 2) {
        await fetch(`/api/recruitment/candidates/${itemToDelete.id}`, { method: 'DELETE' });
        await Promise.all([fetchCandidates(), fetchInterviews(), fetchRequests()]);
        setSelectedCandIds((prev) => prev.filter((id) => id !== itemToDelete.id));
        onShowToast?.(
          'success',
          'Đã xoá hồ sơ ứng viên',
          'Đã xoá ứng viên cùng toàn bộ lịch phỏng vấn liên quan.'
        );
      } else if (itemToDelete.step === 3) {
        await fetch(`/api/recruitment/interviews/${itemToDelete.id}`, { method: 'DELETE' });
        await fetchInterviews();
        setSelectedIntIds((prev) => prev.filter((id) => id !== itemToDelete.id));
      }
    } catch (err) {
      console.error('Lỗi khi xóa mục:', err);
    } finally {
      setItemToDelete(null);
      setConfirmDeleteOpen(false);
    }
  };

  const handleDeleteSelectedReqs = async () => {
    if (selectedReqIds.length === 0) return;
    try {
      const count = selectedReqIds.length;
      await fetch('/api/recruitment/requests/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedReqIds }),
      });
      await Promise.all([fetchRequests(), fetchCandidates(), fetchInterviews()]);
      setSelectedReqIds([]);
      onShowToast?.(
        'success',
        'Xoá yêu cầu tuyển dụng thành công',
        `Đã xoá ${count} yêu cầu tuyển dụng cùng toàn bộ hồ sơ ứng viên (bước 2) và lịch phỏng vấn liên quan (bước 3).`
      );
    } catch (err) {
      console.error('Lỗi khi xóa yêu cầu hàng loạt:', err);
    }
  };

  const handleDeleteSelectedCands = async () => {
    if (selectedCandIds.length === 0) return;
    try {
      const count = selectedCandIds.length;
      await fetch('/api/recruitment/candidates/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedCandIds }),
      });
      await Promise.all([fetchCandidates(), fetchInterviews(), fetchRequests()]);
      setSelectedCandIds([]);
      onShowToast?.(
        'success',
        'Xoá ứng viên thành công',
        `Đã xoá ${count} ứng viên cùng các lịch phỏng vấn liên quan khỏi hệ thống.`
      );
    } catch (err) {
      console.error('Lỗi khi xóa ứng viên hàng loạt:', err);
    }
  };

  const handleDeleteSelectedInts = async () => {
    if (selectedIntIds.length === 0) return;
    try {
      await fetch('/api/recruitment/interviews/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIntIds }),
      });
      await fetchInterviews();
      setSelectedIntIds([]);
    } catch (err) {
      console.error('Lỗi khi xóa lịch PV hàng loạt:', err);
    }
  };

  const renderPriorityBadge = (priority: RecruitmentRequestItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return (
          <Badge
            variant="danger"
            style={{
              width: '95px',
              display: 'inline-flex',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            Khẩn cấp
          </Badge>
        );
      case 'high':
        return (
          <Badge
            variant="warning"
            style={{
              width: '95px',
              display: 'inline-flex',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            Ưu tiên cao
          </Badge>
        );
      case 'normal':
      default:
        return (
          <Badge
            variant="neutral"
            style={{
              width: '95px',
              display: 'inline-flex',
              justifyContent: 'center',
              fontWeight: 600,
            }}
          >
            Bình thường
          </Badge>
        );
    }
  };

  const renderStatusBadge = (status: RecruitmentRequestItem['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge
            variant="success"
            style={{
              width: '105px',
              display: 'inline-flex',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            Đã hoàn thành
          </Badge>
        );
      case 'recruiting':
        return (
          <Badge
            variant="brand"
            style={{
              width: '105px',
              display: 'inline-flex',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            Đang tuyển dụng
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge
            variant="warning"
            style={{
              width: '105px',
              display: 'inline-flex',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            Chờ duyệt
          </Badge>
        );
    }
  };

  const renderCandidateStatusBadge = (status: CandidateItem['status'], label: string) => {
    const norm = normalizeCandidateStatus(status, label);
    switch (norm.status) {
      case 'waiting_interview':
        return <Badge variant="warning" style={{ fontWeight: 700 }}>Chờ phỏng vấn</Badge>;
      case 'interviewing':
        return <Badge variant="brand" style={{ fontWeight: 700 }}>Đang phỏng vấn</Badge>;
      case 'received':
        return <Badge variant="success" style={{ fontWeight: 700 }}>Đã tiếp nhận</Badge>;
      case 'rejected':
        return <Badge variant="danger" style={{ fontWeight: 700 }}>Từ chối</Badge>;
      default:
        return <Badge variant="neutral">{norm.label}</Badge>;
    }
  };

  const renderInterviewResultBadge = (result: InterviewItem['result'], label: string) => {
    const norm = normalizeInterviewResult(result, label);
    switch (norm.key) {
      case 'passed':
        return <Badge variant="success" style={{ fontWeight: 700 }}>{norm.label}</Badge>;
      case 'failed':
        return <Badge variant="danger" style={{ fontWeight: 700 }}>{norm.label}</Badge>;
      case 'interviewing':
      default:
        return <Badge variant="brand" style={{ fontWeight: 700 }}>{norm.label}</Badge>;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: 1,
        minHeight: 0,
        backgroundColor: 'var(--bg-surface-1, #ffffff)',
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          BƯỚC 1: YÊU CẦU TUYỂN DỤNG
         ───────────────────────────────────────────────────────────── */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 }}>
          <TableToolbar
            searchValue={searchStep1}
            onSearchChange={(val) => {
              setSearchStep1(val);
              setPageStep1(1);
            }}
            searchPlaceholder="Tìm theo vị trí, mã yêu cầu, bộ phận, người đề xuất..."
            searchMinWidth="260px"
            actionsBeforeSearch={
              <div style={{ minWidth: '180px' }}>
                <DepartmentSelect
                  includeAllOption
                  allOptionLabel="Tất cả bộ phận"
                  value={deptFilterStep1}
                  onChange={(e) => {
                    setDeptFilterStep1(e.target.value);
                    setPageStep1(1);
                  }}
                  style={{ marginBottom: 0 }}
                />
              </div>
            }
            filters={[
              {
                id: 'status-step1',
                value: statusFilterStep1,
                onChange: (val) => {
                  setStatusFilterStep1(val);
                  setPageStep1(1);
                },
                minWidth: '160px',
                options: [
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'recruiting', label: 'Đang tuyển dụng' },
                  { value: 'completed', label: 'Đã hoàn thành' },
                  { value: 'pending', label: 'Chờ duyệt' },
                ],
              },
              {
                id: 'priority-step1',
                value: priorityFilterStep1,
                onChange: (val) => {
                  setPriorityFilterStep1(val);
                  setPageStep1(1);
                },
                minWidth: '150px',
                options: [
                  { value: 'all', label: 'Mức độ ưu tiên' },
                  { value: 'urgent', label: 'Khẩn cấp' },
                  { value: 'high', label: 'Ưu tiên cao' },
                  { value: 'normal', label: 'Bình thường' },
                ],
              },
            ]}
            rightActions={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateReq}
                  style={{ gap: '6px', fontWeight: 700 }}
                >
                  <Plus size={16} />
                  <span>Tạo yêu cầu</span>
                </Button>
                <DeleteButton
                  size="sm"
                  label="Xoá"
                  itemCount={selectedReqIds.length}
                  disabled={selectedReqIds.length === 0}
                  onConfirm={handleDeleteSelectedReqs}
                  dialogTitle="Xác nhận xoá yêu cầu tuyển dụng"
                  dialogMessage={`Bạn có chắc chắn muốn xoá ${selectedReqIds.length} yêu cầu tuyển dụng đã chọn không? Khi xoá, toàn bộ hồ sơ ứng viên (Bước 2) và lịch phỏng vấn liên quan (Bước 3) thuộc các vị trí này cũng sẽ bị xoá đồng thời khỏi hệ thống.`}
                />
              </div>
            }
            style={{
              marginBottom: 0,
              padding: '8px',
              borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
              flexShrink: 0,
            }}
          />

          <FullWidthTable>
            <table
              className="custom-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.8125rem',
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                }}
              >
                <tr
                  style={{
                    backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                    borderBottom: '1px solid var(--border-default, #e2e8f0)',
                    color: 'var(--text-secondary, #64748b)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '42px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        pagedRequests.length > 0 &&
                        pagedRequests.every((r) => selectedReqIds.includes(r.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReqIds(Array.from(new Set([...selectedReqIds, ...pagedRequests.map((r) => r.id)])));
                        } else {
                          setSelectedReqIds(selectedReqIds.filter((id) => !pagedRequests.some((r) => r.id === id)));
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '9px 14px', minWidth: '300px' }}>MÃ VÀ THÔNG TIN TUYỂN DỤNG</th>
                  <th style={{ padding: '9px 14px', width: '90px', textAlign: 'center' }}>SỐ LƯỢNG</th>
                  <th style={{ padding: '9px 14px', minWidth: '160px' }}>MỨC LƯƠNG DỰ KIẾN</th>
                  <th style={{ padding: '9px 14px', width: '105px' }}>NGÀY CẦN</th>
                  <th style={{ padding: '9px 14px', width: '125px', textAlign: 'center' }}>ƯU TIÊN</th>
                  <th style={{ padding: '9px 14px', width: '135px', textAlign: 'center' }}>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {loadingStep1 && requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px 20px', color: '#64748b' }}>
                      Đang tải danh sách yêu cầu tuyển dụng từ cơ sở dữ liệu...
                    </td>
                  </tr>
                ) : pagedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
                      Không tìm thấy yêu cầu tuyển dụng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  pagedRequests.map((r) => {
                    const isSelected = selectedReqIds.includes(r.id);
                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                          backgroundColor: isSelected ? 'var(--color-brand-50, #eff6ff)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReqIds([...selectedReqIds, r.id]);
                              } else {
                                setSelectedReqIds(selectedReqIds.filter((id) => id !== r.id));
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td
                          style={{ padding: '7px 14px', cursor: 'pointer' }}
                          onClick={() => handleOpenEditReq(r)}
                          title="Nhấp để xem và chỉnh sửa yêu cầu tuyển dụng"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 800, color: 'var(--brand-primary, #2563eb)', fontSize: '0.8125rem' }}>
                              {r.code}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '1px 7px',
                                borderRadius: '4px',
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              <Building size={11} style={{ color: '#64748b' }} />
                              {r.department}
                            </span>
                          </div>

                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem', lineHeight: 1.25 }}>
                              {r.position}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                              Kinh nghiệm: {r.experienceLevel} • {r.receivedCount} hồ sơ đã nộp
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '7px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 7px',
                              backgroundColor: '#e2e8f0',
                              borderRadius: '12px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              color: '#1e293b',
                            }}
                          >
                            {r.quantity}
                          </span>
                        </td>
                        <td style={{ padding: '7px 14px', fontWeight: 700, color: '#047857' }}>
                          {(r.salaryRange || '').replace(/\s*[đĐ]|VND/gi, '').trim()}
                        </td>
                        <td style={{ padding: '7px 14px', color: '#64748b', fontSize: '0.85rem' }}>
                          {r.deadline}
                        </td>
                        <td style={{ padding: '7px 14px', textAlign: 'center' }}>
                          {renderPriorityBadge(r.priority)}
                        </td>
                        <td style={{ padding: '7px 14px', textAlign: 'center' }}>
                          {renderStatusBadge(r.status)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </FullWidthTable>

          <Pagination
            currentPage={pageStep1}
            totalItems={filteredRequests.length}
            pageSize={pageSizeStep1}
            onPageChange={setPageStep1}
            onPageSizeChange={(sz) => {
              setPageSizeStep1(sz);
              setPageStep1(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
            style={{
              borderTop: '1px solid var(--border-default, #e2e8f0)',
              padding: '8px 20px',
              flexShrink: 0,
            }}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          BƯỚC 2: DANH SÁCH ỨNG VIÊN
         ───────────────────────────────────────────────────────────── */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 }}>
          <TableToolbar
            searchValue={searchStep2}
            onSearchChange={(val) => {
              setSearchStep2(val);
              setPageStep2(1);
            }}
            searchPlaceholder="Tìm theo họ tên ứng viên, số điện thoại, vị trí tuyển dụng, email..."
            searchMinWidth="260px"
            filters={[
              {
                id: 'status-step2',
                value: statusFilterStep2,
                onChange: (val) => {
                  setStatusFilterStep2(val);
                  setPageStep2(1);
                },
                minWidth: '160px',
                options: [
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'waiting_interview', label: 'Chờ phỏng vấn' },
                  { value: 'interviewing', label: 'Đang phỏng vấn' },
                  { value: 'received', label: 'Đã tiếp nhận' },
                  { value: 'rejected', label: 'Từ chối' },
                ],
              },
            ]}
            rightActions={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateCand}
                  style={{ gap: '6px', fontWeight: 700 }}
                >
                  <Plus size={16} />
                  <span>Tiếp nhận ứng viên mới</span>
                </Button>
                <DeleteButton
                  size="sm"
                  label="Xoá"
                  itemCount={selectedCandIds.length}
                  disabled={selectedCandIds.length === 0}
                  onConfirm={handleDeleteSelectedCands}
                  dialogTitle="Xác nhận xoá ứng viên"
                  dialogMessage={`Bạn có chắc chắn muốn xoá ${selectedCandIds.length} ứng viên đã chọn không? Toàn bộ lịch phỏng vấn và kết quả đánh giá liên quan (Bước 3) cũng sẽ bị xoá đồng thời khỏi hệ thống.`}
                />
              </div>
            }
            style={{
              marginBottom: 0,
              padding: '8px',
              borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
              flexShrink: 0,
            }}
          />

          <FullWidthTable>
            <table
              className="custom-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.8125rem',
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                }}
              >
                <tr
                  style={{
                    backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                    borderBottom: '1px solid var(--border-default, #e2e8f0)',
                    color: 'var(--text-secondary, #64748b)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '42px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        pagedCandidates.length > 0 &&
                        pagedCandidates.every((c) => selectedCandIds.includes(c.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCandIds(Array.from(new Set([...selectedCandIds, ...pagedCandidates.map((c) => c.id)])));
                        } else {
                          setSelectedCandIds(selectedCandIds.filter((id) => !pagedCandidates.some((c) => c.id === id)));
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '9px 14px', minWidth: '260px' }}>THÔNG TIN ỨNG VIÊN</th>
                  <th style={{ padding: '9px 14px', minWidth: '240px' }}>KINH NGHIỆM LÀM VIỆC</th>
                  <th style={{ padding: '9px 14px', width: '130px' }}>NGÀY TIẾP NHẬN</th>
                  <th style={{ padding: '9px 14px', width: '140px' }}>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {loadingStep2 && candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 20px', color: '#64748b' }}>
                      Đang tải danh sách hồ sơ ứng viên từ cơ sở dữ liệu...
                    </td>
                  </tr>
                ) : pagedCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
                      Không có ứng viên nào phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  groupedCandidates.map((group) => {
                    const isCollapsed = !!collapsedPositions[group.position];

                    return (
                      <React.Fragment key={group.position}>
                        <tr
                          onClick={() => togglePositionCollapse(group.position)}
                          title="Nhấn để ẩn/hiện danh sách ứng viên"
                          style={{
                            backgroundColor: 'var(--bg-surface-2, #f1f5f9)',
                            borderTop: '2px solid var(--border-default, #e2e8f0)',
                            borderBottom: '1px solid var(--border-default, #cbd5e1)',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#0284c7' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </span>
                          </td>
                          <td colSpan={4} style={{ padding: '8px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                                Vị trí tuyển dụng: {group.position}
                              </span>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2px 8px',
                                  backgroundColor: '#e0f2fe',
                                  color: '#0369a1',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                }}
                              >
                                {group.items.length} ứng viên
                              </span>
                            </div>
                          </td>
                        </tr>

                        {!isCollapsed &&
                          group.items.map((c) => {
                            const isSelected = selectedCandIds.includes(c.id);
                            return (
                              <tr
                                key={c.id}
                                onClick={() => handleOpenEditCand(c)}
                                title="Nhấn để xem / chỉnh sửa hồ sơ"
                                style={{
                                  borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                                  backgroundColor: isSelected ? 'var(--color-brand-50, #eff6ff)' : 'transparent',
                                  transition: 'background-color 0.15s ease',
                                  cursor: 'pointer',
                                }}
                              >
                                <td
                                  style={{ padding: '7px 12px', textAlign: 'center' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCandIds([...selectedCandIds, c.id]);
                                      } else {
                                        setSelectedCandIds(selectedCandIds.filter((id) => id !== c.id));
                                      }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ padding: '8px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                    <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.825rem' }}>
                                      {c.code}
                                    </span>
                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>|</span>
                                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                                      {c.fullName}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Telephone size={11} style={{ color: '#0284c7' }} />
                                      <span>{c.phone}</span>
                                    </span>
                                    {c.email && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Envelope size={11} style={{ color: '#0284c7' }} />
                                        <span>{c.email}</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '7px 14px', color: '#475569', fontSize: '0.85rem' }}>
                                  <div>{c.experience}</div>
                                  {c.education && (
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                                      Học vấn: {c.education}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '7px 14px', color: '#64748b', fontSize: '0.85rem' }}>
                                  {c.appliedDate}
                                </td>
                                <td style={{ padding: '7px 14px' }}>
                                  {renderCandidateStatusBadge(c.status, c.statusLabel)}
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </FullWidthTable>

          <Pagination
            currentPage={pageStep2}
            totalItems={filteredCandidates.length}
            pageSize={pageSizeStep2}
            onPageChange={setPageStep2}
            onPageSizeChange={(sz) => {
              setPageSizeStep2(sz);
              setPageStep2(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
            style={{
              borderTop: '1px solid var(--border-default, #e2e8f0)',
              padding: '8px 20px',
              flexShrink: 0,
            }}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          BƯỚC 3: DANH SÁCH PHỎNG VẤN
         ───────────────────────────────────────────────────────────── */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 }}>
          <TableToolbar
            searchValue={searchStep3}
            onSearchChange={(val) => {
              setSearchStep3(val);
              setPageStep3(1);
            }}
            searchPlaceholder="Tìm theo tên ứng viên, vị trí tuyển dụng, hội đồng phỏng vấn..."
            searchMinWidth="260px"
            filters={[
              {
                id: 'result-step3',
                value: resultFilterStep3,
                onChange: (val) => {
                  setResultFilterStep3(val);
                  setPageStep3(1);
                },
                minWidth: '160px',
                options: [
                  { value: 'all', label: 'Tất cả kết quả' },
                  { value: 'interviewing', label: 'Đang phỏng vấn' },
                  { value: 'passed', label: 'Đạt yêu cầu' },
                  { value: 'failed', label: 'Không đạt yêu cầu' },
                ],
              },
            ]}
            rightActions={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DeleteButton
                  size="sm"
                  label="Xoá"
                  itemCount={selectedIntIds.length}
                  disabled={selectedIntIds.length === 0}
                  onConfirm={handleDeleteSelectedInts}
                  dialogTitle="Xác nhận xoá lịch phỏng vấn"
                  dialogMessage={`Bạn có chắc chắn muốn xoá ${selectedIntIds.length} lịch phỏng vấn đã chọn khỏi hệ thống không? Dữ liệu đã xoá không thể khôi phục.`}
                />
              </div>
            }
            style={{
              marginBottom: 0,
              padding: '8px',
              borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
              flexShrink: 0,
            }}
          />

          <FullWidthTable>
            <table
              className="custom-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.8125rem',
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                }}
              >
                <tr
                  style={{
                    backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                    borderBottom: '1px solid var(--border-default, #e2e8f0)',
                    color: 'var(--text-secondary, #64748b)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '42px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        pagedInterviews.length > 0 &&
                        pagedInterviews.every((i) => selectedIntIds.includes(i.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIntIds(Array.from(new Set([...selectedIntIds, ...pagedInterviews.map((i) => i.id)])));
                        } else {
                          setSelectedIntIds(selectedIntIds.filter((id) => !pagedInterviews.some((i) => i.id === id)));
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '9px 14px', minWidth: '260px' }}>THÔNG TIN PHỎNG VẤN</th>
                  <th style={{ padding: '9px 14px', minWidth: '160px' }}>THỜI GIAN VÀ ĐỊA ĐIỂM</th>
                  <th style={{ padding: '9px 14px', minWidth: '220px' }}>HỘI ĐỒNG PHỎNG VẤN</th>
                  <th style={{ padding: '9px 14px', width: '90px', textAlign: 'center' }}>ĐIỂM SỐ</th>
                </tr>
              </thead>
              <tbody>
                {loadingStep3 && interviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 20px', color: '#64748b' }}>
                      Đang tải lịch phỏng vấn từ cơ sở dữ liệu...
                    </td>
                  </tr>
                ) : pagedInterviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
                      Không có lịch phỏng vấn nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  groupedInterviews.map((group) => {
                    const isCollapsed = !!collapsedIntPositions[group.position];

                    return (
                      <React.Fragment key={group.position}>
                        <tr
                          onClick={() => toggleIntPositionCollapse(group.position)}
                          title="Nhấn để ẩn/hiện danh sách phỏng vấn"
                          style={{
                            backgroundColor: 'var(--bg-surface-2, #f1f5f9)',
                            borderTop: '2px solid var(--border-default, #e2e8f0)',
                            borderBottom: '1px solid var(--border-default, #cbd5e1)',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#7c3aed' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </span>
                          </td>
                          <td colSpan={4} style={{ padding: '8px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                                Vị trí tuyển dụng: {group.position}
                              </span>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2px 8px',
                                  backgroundColor: '#f3e8ff',
                                  color: '#7e22ce',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                }}
                              >
                                {group.items.length} ứng viên
                              </span>
                            </div>
                          </td>
                        </tr>

                        {!isCollapsed &&
                          group.items.map((item) => {
                            const isSelected = selectedIntIds.includes(item.id);
                            const matchedCand = candidates.find(
                              (c) =>
                                (item.candidatePhone && c.phone === item.candidatePhone) ||
                                (c.fullName || '').toLowerCase() === (item.candidateName || '').toLowerCase()
                            );
                            const candEmail = matchedCand?.email || '';

                            return (
                              <tr
                                key={item.id}
                                onClick={() => handleOpenEditInt(item)}
                                title="Nhấn để xem / cập nhật kết quả phỏng vấn"
                                style={{
                                  borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                                  backgroundColor: isSelected ? 'var(--color-brand-50, #eff6ff)' : 'transparent',
                                  transition: 'background-color 0.15s ease',
                                  cursor: 'pointer',
                                }}
                              >
                                <td
                                  style={{ padding: '7px 12px', textAlign: 'center' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedIntIds([...selectedIntIds, item.id]);
                                      } else {
                                        setSelectedIntIds(selectedIntIds.filter((id) => id !== item.id));
                                      }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ padding: '8px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '3px' }}>
                                    <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: '0.825rem' }}>
                                      {item.code}
                                    </span>
                                    <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>|</span>
                                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                                      {item.candidateName}
                                    </span>
                                    <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>|</span>
                                    {renderInterviewResultBadge(item.result, item.resultLabel)}
                                  </div>

                                  <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Telephone size={11} style={{ color: '#7c3aed' }} />
                                      <span>{item.candidatePhone}</span>
                                    </span>
                                    {candEmail && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Envelope size={11} style={{ color: '#7c3aed' }} />
                                        <span>{candEmail}</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '7px 14px' }}>
                                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                                    {item.interviewTime} - {item.interviewDate}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                                    📍 {item.location}
                                  </div>
                                </td>
                                <td style={{ padding: '7px 14px', color: '#475569', fontSize: '0.85rem' }}>
                                  {item.interviewers}
                                </td>
                                <td style={{ padding: '7px 14px', textAlign: 'center' }}>
                                  {item.score !== undefined && item.score !== null ? (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        padding: '1px 6px',
                                        backgroundColor: item.score >= 8 ? '#dcfce7' : item.score >= 6 ? '#fef3c7' : '#fee2e2',
                                        color: item.score >= 8 ? '#15803d' : item.score >= 6 ? '#b45309' : '#b91c1c',
                                        borderRadius: '4px',
                                        fontWeight: 800,
                                        fontSize: '0.78rem',
                                      }}
                                    >
                                      {item.score}/10
                                    </span>
                                  ) : (
                                    <span style={{ color: '#94a3b8' }}>-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </FullWidthTable>

          <Pagination
            currentPage={pageStep3}
            totalItems={filteredInterviews.length}
            pageSize={pageSizeStep3}
            onPageChange={setPageStep3}
            onPageSizeChange={(sz) => {
              setPageSizeStep3(sz);
              setPageStep3(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
            style={{
              borderTop: '1px solid var(--border-default, #e2e8f0)',
              padding: '8px 20px',
              flexShrink: 0,
            }}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          OFFCANVAS 1: TẠO / SỬA YÊU CẦU TUYỂN DỤNG (BƯỚC 1)
         ───────────────────────────────────────────────────────────── */}
      <Offcanvas
        isOpen={reqModalOpen}
        onClose={() => setReqModalOpen(false)}
        icon={<PersonPlus size={22} />}
        title={editingReq ? `Cập nhật yêu cầu: ${editingReq.code}` : 'Tạo yêu cầu mới'}
        description="Kế hoạch định biên nhân sự và nhu cầu bổ sung lao động"
        position="right"
        width="400px"
        bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button variant="outline" onClick={() => setReqModalOpen(false)}>
              Đóng
            </Button>
            <Button
              type="submit"
              form="req-form"
              variant="primary"
              disabled={submittingReq}
              style={{ fontWeight: 700 }}
            >
              {submittingReq ? 'Đang lưu...' : (editingReq ? 'Lưu thay đổi' : '+ Thêm yêu cầu')}
            </Button>
          </div>
        }
      >
        <form
          id="req-form"
          onSubmit={handleSaveReq}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: '100%' }}
        >
          <Input
            label="Vị trí tuyển dụng"
            required
            type="text"
            value={reqFormPosition}
            onChange={(e) => setReqFormPosition(e.target.value)}
            placeholder="Ví dụ: Chuyên viên Phát triển Đại lý"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 125px', gap: '12px' }}>
            <DepartmentSelect
              label="Bộ phận / Phòng ban"
              required
              value={reqFormDepartment}
              onChange={(e) => setReqFormDepartment(e.target.value)}
            />

            <Input
              label="Số lượng"
              required
              type="number"
              min="1"
              value={reqFormQuantity}
              onChange={(e) => setReqFormQuantity(e.target.value)}
              rightIcon={<span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, pointerEvents: 'none' }}>người</span>}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 125px', gap: '12px' }}>
            <Input
              label="Mức lương dự kiến"
              required
              type="text"
              value={reqFormSalary}
              onChange={(e) => setReqFormSalary(e.target.value)}
              placeholder="Ví dụ: 14.000.000 - 18.000.000"
            />

            <Input
              label="Kinh nghiệm"
              type="text"
              value={reqFormExperience}
              onChange={(e) => setReqFormExperience(e.target.value)}
              placeholder="Ví dụ: 2"
              rightIcon={<span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, pointerEvents: 'none' }}>năm</span>}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 125px', gap: '12px' }}>
            <Input
              label="Ngày cần"
              required
              type="date"
              min={getTodayDateStr()}
              value={toInputDate(reqFormDeadline)}
              onChange={(e) => setReqFormDeadline(toDisplayDate(e.target.value))}
            />

            <Select
              label="Mức độ ưu tiên"
              value={reqFormPriority}
              onChange={(e) => setReqFormPriority(e.target.value as any)}
            >
              <option value="urgent">Khẩn cấp</option>
              <option value="high">Ưu tiên cao</option>
              <option value="normal">Bình thường</option>
            </Select>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '120px' }}>
            <label className="form-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
              Mô tả công việc và Yêu cầu chi tiết
            </label>
            <textarea
              value={reqFormDescription}
              onChange={(e) => setReqFormDescription(e.target.value)}
              placeholder="Mô tả công việc, nhiệm vụ chính và tiêu chí tuyển dụng..."
              style={{
                width: '100%',
                flex: 1,
                minHeight: '120px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                resize: 'none',
                fontFamily: "'Roboto Condensed', sans-serif",
              }}
            />
          </div>
        </form>
      </Offcanvas>

      {/* ─────────────────────────────────────────────────────────────
          OFFCANVAS 2: TIẾP NHẬN ỨNG VIÊN MỚI (BƯỚC 2)
         ───────────────────────────────────────────────────────────── */}
      <Offcanvas
        isOpen={candModalOpen}
        onClose={() => setCandModalOpen(false)}
        icon={<PersonBadge size={22} />}
        title={editingCand ? `Cập nhật hồ sơ: ${editingCand.code}` : 'Tiếp nhận ứng viên mới'}
        description="Nhập thông tin, kinh nghiệm làm việc của ứng viên"
        position="right"
        width="400px"
        bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 14px' }}
        footer={
          isInterviewSlideOpen ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInterviewSlideOpen(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={14} />
                <span>Quay lại hồ sơ</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={submittingSlideInt}
                onClick={handleConfirmInterviewSlide}
                style={{ fontWeight: 700 }}
              >
                {submittingSlideInt ? 'Đang lên lịch...' : 'Xác nhận lịch phỏng vấn'}
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenInterviewSlide}
                style={{
                  borderColor: '#0284c7',
                  color: '#0284c7',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CalendarCheck size={14} />
                <span>Lịch phỏng vấn</span>
              </Button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="outline" onClick={() => setCandModalOpen(false)}>
                  Đóng
                </Button>
                <Button
                  type="submit"
                  form="cand-form"
                  variant="primary"
                  disabled={submittingCand}
                  style={{ fontWeight: 700 }}
                >
                  {submittingCand ? 'Đang lưu...' : (editingCand ? 'Lưu thay đổi' : 'Lưu hồ sơ ứng viên')}
                </Button>
              </div>
            </div>
          )
        }
        slidePanel={
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#ffffff',
              zIndex: 50,
              transform: isInterviewSlideOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsInterviewSlideOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  title="Quay lại"
                >
                  <ArrowLeft size={16} />
                </button>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                  Thiết lập lịch phỏng vấn
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsInterviewSlideOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Đóng slide"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>
                  Ứng viên được xếp lịch
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0c4a6e' }}>
                  {candFormName || 'Chưa nhập tên'} {editingCand?.code ? `(${editingCand.code})` : ''}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                  Vị trí: <strong>{candFormPosition}</strong>
                </div>
                {candFormPhone && (
                  <div style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Telephone size={11} style={{ color: '#0284c7' }} />
                    <span>{candFormPhone}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input
                  label="Ngày phỏng vấn"
                  required
                  type="date"
                  min={getTodayDateStr()}
                  value={slideDate}
                  onChange={(e) => setSlideDate(e.target.value)}
                />
                <Input
                  label="Giờ phỏng vấn"
                  required
                  type="time"
                  value={slideTime}
                  onChange={(e) => setSlideTime(e.target.value)}
                />
              </div>

              <Input
                label="Địa điểm phỏng vấn"
                required
                type="text"
                autoComplete="off"
                value={slideLocation}
                onChange={(e) => setSlideLocation(e.target.value)}
              />

              <EmployeeSelect
                label="Hội đồng / Người phỏng vấn"
                required
                value={slideInterviewers}
                onChange={(val) => setSlideInterviewers(val)}
                placeholder="Chọn thành viên hội đồng phỏng vấn..."
              />

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '80px', marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: '3px', fontSize: '0.8125rem' }}>
                  Ghi chú / Yêu cầu đối với ứng viên
                </label>
                <textarea
                  value={slideNotes}
                  onChange={(e) => setSlideNotes(e.target.value)}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: '65px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box',
                    resize: 'none',
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}
                />
              </div>
            </div>
          </div>
        }
      >
        <form
          id="cand-form"
          onSubmit={handleSaveCand}
          autoComplete="off"
          style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1, minHeight: '100%' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '8px' }}>
            <Input
              label="Họ và tên ứng viên"
              required
              type="text"
              autoComplete="off"
              value={candFormName}
              onChange={(e) => setCandFormName(e.target.value)}
            />

            <Select
              label="Giới tính"
              value={candFormGender}
              onChange={(e) => setCandFormGender(e.target.value)}
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', gap: '8px' }}>
            <Input
              label="Số điện thoại"
              required
              type="text"
              autoComplete="off"
              value={candFormPhone}
              onChange={(e) => setCandFormPhone(e.target.value)}
            />

            <Input
              label="Email liên hệ"
              type="email"
              autoComplete="off"
              value={candFormEmail}
              onChange={(e) => setCandFormEmail(e.target.value)}
            />
          </div>

          <Input
            label="Nơi thường trú"
            type="text"
            autoComplete="off"
            value={candFormAddress}
            onChange={(e) => setCandFormAddress(e.target.value)}
          />

          <Select
            label="Vị trí ứng tuyển"
            required
            value={candFormPosition}
            onChange={(e) => setCandFormPosition(e.target.value)}
          >
            {activeRecruitingPositions.length === 0 ? (
              <option value="">-- Chưa có yêu cầu tuyển dụng nào (Đang tuyển / Chờ duyệt) --</option>
            ) : (
              <>
                {!candFormPosition && <option value="">-- Chọn vị trí tuyển dụng từ Bước 1 --</option>}
                {!activeRecruitingPositions.includes(candFormPosition) && candFormPosition && (
                  <option value={candFormPosition}>{candFormPosition} (Đã kết thúc tuyển)</option>
                )}
                {activeRecruitingPositions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </>
            )}
          </Select>

          <Input
            label="Kinh nghiệm làm việc nổi bật"
            required
            type="text"
            autoComplete="off"
            value={candFormExp}
            onChange={(e) => setCandFormExp(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Input
              label="Trình độ"
              type="text"
              autoComplete="off"
              value={candFormEdu}
              onChange={(e) => setCandFormEdu(e.target.value)}
            />

            <Select
              label="Trạng thái"
              value={candFormStatus}
              onChange={(e) => setCandFormStatus(e.target.value as any)}
            >
              <option value="waiting_interview">Chờ phỏng vấn</option>
              <option value="interviewing">Đang phỏng vấn</option>
              <option value="received">Đã tiếp nhận</option>
              <option value="rejected">Từ chối</option>
            </Select>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '90px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, marginBottom: '3px', fontSize: '0.8125rem' }}>
              Ghi chú
            </label>
            <textarea
              value={candFormNote}
              onChange={(e) => setCandFormNote(e.target.value)}
              autoComplete="off"
              style={{
                width: '100%',
                flex: 1,
                minHeight: '75px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                boxSizing: 'border-box',
                resize: 'none',
                fontFamily: "'Roboto Condensed', sans-serif",
              }}
            />
          </div>
          <style>{`
            #cand-form .form-group { margin-bottom: 0; }
          `}</style>
        </form>
      </Offcanvas>

      {/* ─────────────────────────────────────────────────────────────
          OFFCANVAS 3: XẾP LỊCH VÀ ĐÁNH GIÁ PHỎNG VẤN (BƯỚC 3)
         ───────────────────────────────────────────────────────────── */}
      <Offcanvas
        isOpen={intModalOpen}
        onClose={() => setIntModalOpen(false)}
        icon={<CalendarCheck size={22} />}
        title={editingInt ? `Đánh giá phỏng vấn: ${editingInt.code}` : 'Lên lịch phỏng vấn ứng viên'}
        description="Đánh giá kết quả phỏng vấn các ứng viên"
        position="right"
        width="400px"
        bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button variant="outline" onClick={() => setIntModalOpen(false)}>
              Đóng
            </Button>
            <Button
              type="submit"
              form="int-form"
              variant="primary"
              disabled={submittingInt}
              style={{ fontWeight: 700 }}
            >
              {submittingInt ? 'Đang lưu...' : (editingInt ? 'Lưu kết quả đánh giá' : 'Xác nhận lên lịch')}
            </Button>
          </div>
        }
      >
        <form
          id="int-form"
          onSubmit={handleSaveInt}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: '100%' }}
        >
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.925rem', color: '#0f172a' }}>
                {intFormCandName || 'Ứng viên'}
              </span>
              {editingInt?.code && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: '#ede9fe',
                    color: '#7c3aed',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {editingInt.code}
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
              <span style={{ color: '#64748b' }}>Vị trí: </span>
              <strong style={{ color: '#1e293b' }}>{intFormPosition}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.76rem', color: '#64748b' }}>
              {intFormPhone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Telephone size={11} style={{ color: '#7c3aed' }} />
                  <span style={{ color: '#334155', fontWeight: 600 }}>{intFormPhone}</span>
                </span>
              )}
              {matchedCandForInt?.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Envelope size={11} style={{ color: '#7c3aed' }} />
                  <span style={{ color: '#334155' }}>{matchedCandForInt.email}</span>
                </span>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', margin: '2px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '8px', fontSize: '0.76rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Thời gian:</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>
                  {intFormTime} - {intFormDate}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Địa điểm:</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                  title={intFormLocation}
                >
                  📍 {intFormLocation}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.76rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Hội đồng phỏng vấn:</span>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                {intFormInterviewers}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px' }}>
            <Input
              label="Điểm đánh giá"
              type="number"
              step="0.5"
              min="0"
              max="10"
              value={intFormScore}
              onChange={(e) => setIntFormScore(e.target.value)}
              placeholder="Nhập điểm..."
              rightIcon={
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#64748b',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  /10
                </span>
              }
            />

            <Select
              label="Kết quả đánh giá"
              value={intFormResult}
              onChange={(e) => {
                const val = e.target.value as any;
                setIntFormResult(val);
                if (val === 'passed') {
                  setIntFormHasProbation(true);
                }
              }}
            >
              <option value="pending">Đang phỏng vấn</option>
              <option value="passed">Đạt yêu cầu</option>
              <option value="failed">Không đạt yêu cầu</option>
            </Select>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: intFormHasProbation ? '1px solid #93c5fd' : '1px solid #e2e8f0',
              backgroundColor: intFormHasProbation ? '#f0f9ff' : '#ffffff',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: '#1e293b',
                  cursor: 'pointer',
                  userSelect: 'none',
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={intFormHasProbation}
                  onChange={(e) => setIntFormHasProbation(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#0284c7',
                    cursor: 'pointer',
                  }}
                />
                <span>Có thử việc</span>
              </label>
            </div>

            {intFormHasProbation && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '2px',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label
                      className="form-label"
                      style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.8125rem', color: '#1e293b', whiteSpace: 'nowrap' }}
                    >
                      Thời gian
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={intFormProbationDays}
                        onChange={(e) => setIntFormProbationDays(e.target.value)}
                        placeholder="60"
                        style={{
                          width: '100%',
                          height: '36px',
                          padding: '5px 38px 5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: "'Roboto Condensed', sans-serif",
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: '8px',
                          fontSize: '0.78rem',
                          color: '#64748b',
                          fontWeight: 600,
                          pointerEvents: 'none',
                        }}
                      >
                        ngày
                      </span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label
                      className="form-label"
                      style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.8125rem', color: '#1e293b', whiteSpace: 'nowrap' }}
                    >
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={intFormProbationStartDate}
                      onChange={(e) => setIntFormProbationStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        height: '36px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: "'Roboto Condensed', sans-serif",
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                      }}
                    />
                  </div>
                </div>

                <div style={{ width: '100%' }}>
                  <EmployeeSelect
                    label="Người theo dõi"
                    value={intFormProbationSupervisor}
                    onChange={(val) => setIntFormProbationSupervisor(val)}
                    placeholder="Chọn nhân sự..."
                    multiple={false}
                  />
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: intFormInitEmployee ? '1px solid #10b981' : '1px solid #e2e8f0',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  margin: 0,
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={intFormInitEmployee}
                  onChange={(e) => setIntFormInitEmployee(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: '#10b981',
                  }}
                />
                <span>Khởi tạo dữ liệu nhân viên</span>
              </label>
            </div>

            {intFormInitEmployee && (
              <div
                style={{
                  marginTop: '10px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}
              >
                <DepartmentSelect
                  label="Phòng ban"
                  required
                  value={empFormDepartment}
                  onChange={(e) => setEmpFormDepartment(e.target.value)}
                />

                <Select
                  label="Chức vụ"
                  required
                  value={empFormPosition}
                  onChange={(e) => setEmpFormPosition(e.target.value)}
                  options={positionOptions}
                />
              </div>
            )}
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '85px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.8125rem', color: '#1e293b' }}>
              Nhận xét chi tiết của Hội đồng phỏng vấn
            </label>
            <textarea
              value={intFormNotes}
              onChange={(e) => setIntFormNotes(e.target.value)}
              placeholder="Đánh giá kỹ năng chuyên môn, thái độ, mức lương đề xuất..."
              style={{
                width: '100%',
                flex: 1,
                minHeight: '80px',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                boxSizing: 'border-box',
                resize: 'none',
                fontFamily: "'Roboto Condensed', sans-serif",
                outline: 'none',
              }}
            />
          </div>
        </form>
      </Offcanvas>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa bản ghi"
        message={`Bạn có chắc chắn muốn xóa bản ghi "${itemToDelete?.title}" khỏi hệ thống không? Dữ liệu đã xóa không thể khôi phục.`}
        confirmText="Xác nhận xóa"
        type="danger"
      />
    </div>
  );
};
export default RecruitmentManagementView;
