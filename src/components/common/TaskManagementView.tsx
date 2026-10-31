import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ListTask,
  Search,
  Sliders,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash,
} from 'react-bootstrap-icons';
import { Pagination } from './Pagination';
import { Offcanvas } from './Offcanvas';
import { Select } from './Select';

export interface TaskManagementViewProps {
  title?: string;
  subtitle?: string;
  department?: string;
  userId?: string;
  assignee?: string;
  tasks?: UserTaskItem[];
  user?: any;
  onlyMyTasks?: boolean;
  onTasksChange?: (tasks: UserTaskItem[]) => void;
  onShowToast?: (type: any, title: string, message: string, durationMs?: number) => void;
  initialViewMode?: 'gantt' | 'list';
  allowAdd?: boolean;
  readOnly?: boolean;
  hideHeader?: boolean;
  hideTitle?: boolean;
  hideCategoryBadge?: boolean;
  showScheduleStatusInsteadOfAssignee?: boolean;
  extraActions?: React.ReactNode;
  showCategoryTabs?: boolean;
  initialCategory?: 'all' | 'bidding' | 'production' | 'other';
  hideViewModeSwitcher?: boolean;
  onViewModeChange?: (mode: 'gantt' | 'list') => void;
  hideAssigneeFilter?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  hideStatusLegend?: boolean;
}

export interface UserTaskItem {
  id: string;
  code: string;
  title: string;
  project: string;
  department: string;
  assignee: string;
  assigner?: string;
  startDate: string;
  endDate: string;
  progress: number;
  priority: string;
  priorityLabel: string;
  status: string;
  statusLabel: string;
  scheduleStatus?: 'on_schedule' | 'delayed' | 'overdue' | 'on_track' | string;
  category?: 'bidding' | 'production' | string;
  categoryLabel?: string;
  contractCode?: string;
  customerName?: string;
  customerAddress?: string;
  description?: string;
  isContractOnly?: boolean;
}

export interface ContractGroupItem {
  contractCode: string;
  customerName: string;
  customerAddress: string;
  tasks: UserTaskItem[];
  earliestStart: string;
  latestEnd: string;
  avgProgress: number;
  isBidding: boolean;
  groupPrefix: string;
  displayCode: string;
}

export const TaskManagementView: React.FC<TaskManagementViewProps> = ({
  title = 'Danh sách công việc',
  subtitle,
  department,
  userId,
  assignee,
  tasks: propTasks,
  user: propUser,
  onlyMyTasks,
  onTasksChange,
  onShowToast,
  initialViewMode = 'gantt',
  allowAdd = true,
  readOnly = false,
  hideHeader = false,
  hideTitle = false,
  hideCategoryBadge = false,
  showScheduleStatusInsteadOfAssignee = false,
  extraActions,
  showCategoryTabs = false,
  initialCategory = 'all',
  hideViewModeSwitcher = false,
  onViewModeChange,
  hideAssigneeFilter = false,
  searchPlaceholder,
  searchValue: propSearchValue,
  onSearchChange: propOnSearchChange,
  hideStatusLegend = false,
}) => {
  // Chế độ hiển thị trạng thái tiến độ thay cho người/phòng ban phụ trách
  const isScheduleStatusMode = Boolean(showScheduleStatusInsteadOfAssignee || hideCategoryBadge);

  // Xác định chế độ "Công việc của tôi": Chỉ hiển thị các công việc được giao cho cá nhân người dùng thực hiện
  const isOnlyMyTasks = Boolean(
    onlyMyTasks ||
    title === 'Công việc của tôi' ||
    (subtitle && subtitle.toLowerCase().includes('nhiệm vụ cá nhân'))
  );

  // Lấy thông tin tài khoản người dùng đang đăng nhập
  const currentLoggedInUser = useMemo(() => {
    let u: any = propUser;
    if (!u || !u.name) {
      try {
        const saved = localStorage.getItem('decodoor_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.user?.name) u = parsed.user;
        }
      } catch {}
    }
    return {
      id: u?.id,
      name: u?.name || '',
      email: u?.email || '',
      department: u?.department || '',
      position: u?.position || '',
      code: u?.code || '',
    };
  }, [propUser]);

  // Kiểm tra công việc có được giao cho người dùng hiện tại thực hiện hay không
  const isAssignedToCurrentUser = (taskAssignee?: string, currentUserName?: string): boolean => {
    if (!currentUserName || !currentUserName.trim()) return false;
    if (!taskAssignee || !taskAssignee.trim()) return false;

    const cleanAssignee = taskAssignee
      .replace(/\s*\(.*?\)/g, '')
      .replace(/[-•|/].*$/, '')
      .toLowerCase()
      .trim();
    const cleanCurrent = currentUserName
      .replace(/\s*\(.*?\)/g, '')
      .replace(/[-•|/].*$/, '')
      .toLowerCase()
      .trim();

    return (
      cleanAssignee === cleanCurrent ||
      cleanAssignee.includes(cleanCurrent) ||
      cleanCurrent.includes(cleanAssignee)
    );
  };

  // Chế độ xem: Gantt mặc định hoặc Bảng
  const [viewMode, setViewMode] = useState<'gantt' | 'list'>(initialViewMode);

  // Phân loại công tác: Tất cả | Đấu thầu | Sản xuất | Khác
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'bidding' | 'production' | 'other'>(initialCategory);

  // Điều hướng tháng và năm
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10);

  // Bộ lọc trạng thái, người thực hiện và tìm kiếm
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeSearch, setAssigneeSearch] = useState<string>('');
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState<boolean>(false);
  const [employees, setEmployees] = useState<{ id: number | string; name: string; department?: string; position?: string; code?: string; avatarText?: string; avatarColor?: string }[]>([]);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const [executionStatusFilter, setExecutionStatusFilter] = useState<string>('all');
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>('');
  const searchQuery = propSearchValue !== undefined ? propSearchValue : internalSearchQuery;
  const setSearchQuery = (val: string) => {
    setInternalSearchQuery(val);
    if (propOnSearchChange) propOnSearchChange(val);
  };

  // Dữ liệu công việc từ CSDL
  const [tasks, setTasks] = useState<UserTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Phân trang cho dạng bảng
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Offcanvas chi tiết công việc rộng 400px
  const [selectedTask, setSelectedTask] = useState<UserTaskItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [updatingProgress, setUpdatingProgress] = useState<number>(0);

  // Offcanvas chi tiết Hợp đồng / Gói thầu rộng 400px
  const [selectedContractGroup, setSelectedContractGroup] = useState<ContractGroupItem | null>(null);
  const [isContractDrawerOpen, setIsContractDrawerOpen] = useState<boolean>(false);
  const [isDeletingContract, setIsDeletingContract] = useState<boolean>(false);

  // Modal tạo công việc mới
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<'bidding' | 'production' | 'other'>('bidding');
  const [newTaskProject, setNewTaskProject] = useState<string>('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskStartDate, setNewTaskStartDate] = useState<string>('2026-10-04');
  const [newTaskEndDate, setNewTaskEndDate] = useState<string>('2026-10-10');
  const [newTaskPriority, setNewTaskPriority] = useState<string>('medium');
  const [newTaskContractCode, setNewTaskContractCode] = useState<string>('');
  const [newTaskCustomerName, setNewTaskCustomerName] = useState<string>('');
  const [newTaskDesc, setNewTaskDesc] = useState<string>('');

  // Ngày hôm nay theo thời gian thực tế hệ thống
  const todayDateObj = new Date();
  const realCurrentYear = todayDateObj.getFullYear();
  const realCurrentMonth = todayDateObj.getMonth() + 1;
  const todayDay = todayDateObj.getDate();

  // Xác định tình trạng tiến độ: overdue (Quá hạn) | delayed (Chậm tiến độ) | on_track (Đúng tiến độ)
  const getTaskScheduleStatus = (task: UserTaskItem): 'overdue' | 'delayed' | 'on_track' => {
    if (task.status === 'completed' || (task.progress !== undefined && task.progress >= 100)) {
      return 'on_track';
    }

    // Ưu tiên trạng thái tiến độ được khai báo tường minh từ nguồn dữ liệu / store
    if (task.scheduleStatus) {
      if (task.scheduleStatus === 'overdue') return 'overdue';
      if (task.scheduleStatus === 'delayed') return 'delayed';
      if (task.scheduleStatus === 'on_track' || task.scheduleStatus === 'on_schedule') return 'on_track';
    }

    const todayStr = `${realCurrentYear}-${String(realCurrentMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
    const endDate = task.endDate || todayStr;
    const startDate = task.startDate || todayStr;

    // 1. Quá hạn: ngày kết thúc đã qua so với hôm nay và công việc chưa hoàn thành
    if (endDate < todayStr) {
      return 'overdue';
    }

    // 2. Chậm tiến độ:
    // - Bị đánh dấu delayed hoặc paused
    if (task.status === 'delayed' || task.status === 'paused') {
      return 'delayed';
    }

    // - Hoặc so sánh tiến độ thực tế với tỷ lệ thời gian đã trôi qua
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const todayMs = todayDateObj.getTime();

    if (endMs > startMs && todayMs >= startMs) {
      const elapsedRatio = (todayMs - startMs) / (endMs - startMs);
      const currentProgRatio = (task.progress || 0) / 100;
      // Đã trôi qua quá 40% thời gian nhưng tiến độ bị hụt hơn 20%
      if (elapsedRatio > 0.4 && currentProgRatio < elapsedRatio - 0.2) {
        return 'delayed';
      }
      // Hoặc còn <= 2 ngày đến hạn mà tiến độ dưới 50%
      const daysLeft = Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 2 && currentProgRatio < 0.5) {
        return 'delayed';
      }
    }

    // 3. Đúng tiến độ
    return 'on_track';
  };

  // Tính toán nhãn trạng thái và màu sắc chấm tròn (Chưa thực hiện, Đang thực hiện, Đã hoàn thành, Tạm dừng, Huỷ bỏ)
  const getStatusDisplay = (task: UserTaskItem) => {
    switch (task.status) {
      case 'completed':
        return { label: 'ĐÃ HOÀN THÀNH', dotColor: '#10b981' };
      case 'in_progress':
      case 'on_track':
      case 'delayed':
        return { label: 'ĐANG THỰC HIỆN', dotColor: '#3b82f6' };
      case 'paused':
      case 'on_hold':
        return { label: 'TẠM DỪNG', dotColor: '#f59e0b' };
      case 'cancelled':
      case 'canceled':
        return { label: 'HUỶ BỎ', dotColor: '#ef4444' };
      case 'not_started':
      case 'overdue':
      default:
        return { label: 'CHƯA THỰC HIỆN', dotColor: '#64748b' };
    }
  };

  // Danh sách các nhãn trạng thái thực hiện tương tác
  const executionStatusItems = [
    { key: 'not_started', label: 'Chưa thực hiện', color: '#64748b' },
    { key: 'in_progress', label: 'Đang thực hiện', color: '#3b82f6' },
    { key: 'completed', label: 'Đã hoàn thành', color: '#10b981' },
    { key: 'paused', label: 'Tạm dừng', color: '#f59e0b' },
    { key: 'cancelled', label: 'Huỷ bỏ', color: '#ef4444' },
  ];

  // Nạp toàn bộ nhân viên trong công ty từ CSDL
  useEffect(() => {
    fetch('/api/users')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải danh sách nhân sự');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployees(data);
        }
      })
      .catch((err) => {
        console.warn('Lỗi nạp danh sách nhân sự công ty:', err);
      });
  }, []);

  // Đóng danh sách gợi ý nhân viên khi nhấn ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) {
        setIsAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tự động gán người thực hiện là chính mình khi tạo việc ở chế độ "Công việc của tôi"
  useEffect(() => {
    if (isAddModalOpen && isOnlyMyTasks && currentLoggedInUser.name) {
      setNewTaskAssignee(currentLoggedInUser.name);
    }
  }, [isAddModalOpen, isOnlyMyTasks, currentLoggedInUser.name]);

  // Danh sách toàn bộ nhân viên công ty (loại bỏ ngoặc đơn cạnh tên, hiển thị Tên phòng ban | Chức vụ)
  const allCompanyEmployees = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        department?: string;
        position?: string;
        subtitle: string;
        avatarText: string;
        avatarColor: string;
      }
    >();

    const avatarPalette = [
      '#2563eb', // Blue
      '#059669', // Emerald
      '#d97706', // Amber
      '#7c3aed', // Violet
      '#db2777', // Pink
      '#0284c7', // Sky
      '#ea580c', // Orange
      '#4f46e5', // Indigo
      '#0d9488', // Teal
      '#ca8a04', // Yellow
    ];

    const getEmpAvatarColor = (name: string, customColor?: string) => {
      if (customColor && customColor.trim()) return customColor;
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % avatarPalette.length;
      return avatarPalette[index];
    };

    const getEmpAvatarText = (name: string, customText?: string) => {
      if (customText && customText.trim()) return customText.trim().toUpperCase();
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return 'NV';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      const firstChar = parts[0][0] || '';
      const lastChar = parts[parts.length - 1][0] || '';
      return (firstChar + lastChar).toUpperCase();
    };

    const getParenInfo = (str: string) => {
      const m = str.match(/\((.*?)\)/);
      return m ? m[1].trim() : '';
    };

    const cleanEmpName = (str: string) => {
      return str.replace(/\s*\(.*?\)/g, '').trim();
    };

    const resolveDeptAndPos = (dept?: string, paren?: string, pos?: string) => {
      let finalDept = (dept && dept !== 'bom') ? dept.trim() : '';
      let finalPos = pos?.trim() || '';

      if (paren) {
        const pLower = paren.toLowerCase();
        if (pLower.includes('pháp chế')) {
          finalDept = finalDept || 'Phòng Pháp chế';
          finalPos = finalPos || 'Chuyên viên pháp chế';
        } else if (pLower.includes('dự án')) {
          finalDept = finalDept || 'Phòng Quản lý dự án';
          finalPos = finalPos || 'Quản lý dự án';
        } else if (pLower.includes('r&d') || pLower.includes('kỹ thuật') || pLower.includes('công nghệ')) {
          finalDept = finalDept || 'Phòng Nghiên cứu và Phát triển (R&D)';
          finalPos = finalPos || 'Chuyên viên R&D';
        } else if (pLower.includes('kế toán') || pLower.includes('tài chính')) {
          finalDept = finalDept || 'Phòng Tài chính Kế toán';
          finalPos = finalPos || 'Kế toán viên';
        } else if (pLower.includes('khảo sát')) {
          finalDept = finalDept || 'Phòng Kỹ thuật Khảo sát';
          finalPos = finalPos || 'Chuyên viên khảo sát';
        } else if (pLower.includes('kho vận') || pLower.includes('kho')) {
          finalDept = finalDept || 'Bộ phận Kho vận';
          finalPos = finalPos || 'Quản lý kho';
        } else if (pLower.includes('kcs')) {
          finalDept = finalDept || 'Phòng Quản lý chất lượng (KCS)';
          finalPos = finalPos || 'Chuyên viên KCS';
        } else if (pLower.includes('xưởng sơn')) {
          finalDept = finalDept || 'Xưởng Sơn';
          finalPos = finalPos || 'Kỹ thuật sơn';
        } else if (pLower.includes('xưởng mộc') || pLower.includes('xưởng')) {
          finalDept = finalDept || paren;
          finalPos = finalPos || 'Kỹ thuật xưởng';
        } else if (pLower.includes('bảo trì')) {
          finalDept = finalDept || 'Bộ phận Bảo trì';
          finalPos = finalPos || 'Kỹ thuật viên';
        } else {
          if (!finalDept) finalDept = paren;
          else if (!finalPos) finalPos = paren;
        }
      }

      if (!finalDept) finalDept = 'Công ty Cổ phần Seajong Việt Nam';
      if (!finalPos) finalPos = 'Nhân viên';

      return {
        dept: finalDept,
        pos: finalPos,
        subtitle: `${finalDept} | ${finalPos}`,
      };
    };

    // 1. Toàn bộ nhân viên từ bảng users công ty
    employees.forEach((u) => {
      if (u.name && u.name.trim()) {
        const cName = cleanEmpName(u.name);
        const paren = getParenInfo(u.name);
        const { dept, pos, subtitle } = resolveDeptAndPos(u.department, paren, u.position);
        const key = cName.toLowerCase();
        const avatarText = getEmpAvatarText(cName, u.avatarText);
        const avatarColor = getEmpAvatarColor(cName, u.avatarColor);
        map.set(key, { name: cName, department: dept, position: pos, subtitle, avatarText, avatarColor });
      }
    });

    // 2. Bổ sung các người thực hiện đã được giao trong công việc
    tasks.forEach((t) => {
      if (t.assignee && t.assignee.trim()) {
        const cName = cleanEmpName(t.assignee);
        const paren = getParenInfo(t.assignee);
        const key = cName.toLowerCase();
        if (!map.has(key)) {
          const { dept, pos, subtitle } = resolveDeptAndPos(t.department, paren, undefined);
          const avatarText = getEmpAvatarText(cName);
          const avatarColor = getEmpAvatarColor(cName);
          map.set(key, { name: cName, department: dept, position: pos, subtitle, avatarText, avatarColor });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [employees, tasks]);

  // Danh sách gợi ý nhân viên đã lọc theo từ khoá nhập trong textbox
  const filteredEmployeeSuggestions = useMemo(() => {
    if (!assigneeSearch.trim()) {
      return allCompanyEmployees;
    }
    const q = assigneeSearch.toLowerCase().trim();
    return allCompanyEmployees.filter(
      (emp) => emp.name.toLowerCase().includes(q) || (emp.subtitle && emp.subtitle.toLowerCase().includes(q))
    );
  }, [allCompanyEmployees, assigneeSearch]);

  // Nạp danh sách công việc từ CSDL
  const fetchTasks = () => {
    if (propTasks) {
      setTasks(propTasks);
      setLoading(false);
      return;
    }
    setLoading(true);
    let url = `/api/user-tasks`;
    const params: string[] = [];
    if (department && department !== 'all') params.push(`department=${encodeURIComponent(department)}`);
    if (assignee && assignee !== 'all') params.push(`assignee=${encodeURIComponent(assignee)}`);
    if (userId) params.push(`userId=${encodeURIComponent(userId)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Lỗi nạp dữ liệu công việc');
        return res.json();
      })
      .then((data: UserTaskItem[]) => {
        setTasks(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách công việc:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTasks();

    const handleUpdate = () => {
      fetchTasks();
    };

    window.addEventListener('decodoor_user_tasks_updated', handleUpdate);
    window.addEventListener('decodoor_contracts_updated', handleUpdate);
    window.addEventListener('decodoor_production_tasks_updated', handleUpdate);

    return () => {
      window.removeEventListener('decodoor_user_tasks_updated', handleUpdate);
      window.removeEventListener('decodoor_contracts_updated', handleUpdate);
      window.removeEventListener('decodoor_production_tasks_updated', handleUpdate);
    };
  }, [propTasks, department, assignee, userId]);

  // Danh sách công việc cơ sở: Nếu ở chế độ "Công việc của tôi", chỉ lấy các công việc được giao cho cá nhân người dùng
  const myTasksBase = useMemo(() => {
    if (!isOnlyMyTasks) return tasks;
    if (!currentLoggedInUser.name) return [];
    return tasks.filter((t) => isAssignedToCurrentUser(t.assignee, currentLoggedInUser.name));
  }, [tasks, isOnlyMyTasks, currentLoggedInUser.name]);

  // Đếm số lượng công việc theo từng phân loại nghiệp vụ
  const categoryCounts = useMemo(() => {
    return {
      all: myTasksBase.length,
      bidding: myTasksBase.filter((t) => t.category === 'bidding').length,
      production: myTasksBase.filter((t) => t.category === 'production' || !t.category).length,
      other: myTasksBase.filter((t) => t.category === 'other').length,
    };
  }, [myTasksBase]);

  // Bộ lọc dữ liệu tìm kiếm và phân loại
  const filteredTasks = useMemo(() => {
    return myTasksBase.filter((t) => {
      if (t.isContractOnly) {
        if (statusFilter !== 'all' || executionStatusFilter !== 'all') return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchContract = t.contractCode?.toLowerCase().includes(q);
          const matchCustomer = t.customerName?.toLowerCase().includes(q);
          const matchProject = t.project?.toLowerCase().includes(q);
          if (!matchContract && !matchCustomer && !matchProject) return false;
        }
        return true;
      }

      // 1. Lọc theo Tình trạng tiến độ: all | overdue | delayed | on_track
      if (statusFilter !== 'all') {
        const scheduleStatus = getTaskScheduleStatus(t);
        if (scheduleStatus !== statusFilter) {
          return false;
        }
      }

      // 2. Lọc theo Người thực hiện (chỉ áp dụng khi không ở chế độ "Công việc của tôi")
      if (!isOnlyMyTasks && assigneeSearch.trim()) {
        const q = assigneeSearch.toLowerCase().trim();
        const rawAssignee = (t.assignee || '').toLowerCase();
        const cleanAssignee = rawAssignee.replace(/\s*\(.*?\)/g, '').trim();
        if (!rawAssignee.includes(q) && !cleanAssignee.includes(q)) {
          return false;
        }
      }

      // 3. Lọc theo Nhãn trạng thái thực hiện (Chưa thực hiện, Đang thực hiện, Đã hoàn thành, Tạm dừng, Huỷ bỏ)
      if (executionStatusFilter !== 'all') {
        const st = getStatusDisplay(t).label;
        if (executionStatusFilter === 'not_started' && st !== 'CHƯA THỰC HIỆN') return false;
        if (executionStatusFilter === 'in_progress' && st !== 'ĐANG THỰC HIỆN') return false;
        if (executionStatusFilter === 'completed' && st !== 'ĐÃ HOÀN THÀNH') return false;
        if (executionStatusFilter === 'paused' && st !== 'TẠM DỪNG') return false;
        if (executionStatusFilter === 'cancelled' && st !== 'HUỶ BỎ') return false;
      }

      // 4. Lọc theo Từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (t.code || '').toLowerCase().includes(q);
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchProject = (t.project || '').toLowerCase().includes(q);
        const matchAssignee = t.assignee?.toLowerCase().includes(q);
        const matchContract = t.contractCode?.toLowerCase().includes(q);
        const matchCustomer = t.customerName?.toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchProject && !matchAssignee && !matchContract && !matchCustomer) {
          return false;
        }
      }
      return true;
    });
  }, [myTasksBase, statusFilter, isOnlyMyTasks, assigneeSearch, executionStatusFilter, searchQuery]);


  // Trạng thái thu gọn/mở rộng từng hợp đồng
  const [collapsedContracts, setCollapsedContracts] = useState<Record<string, boolean>>({});
  const toggleContractCollapse = (code: string) => {
    setCollapsedContracts((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  // Nhóm các công việc theo Hợp đồng
  const contractGroups = useMemo<ContractGroupItem[]>(() => {
    const map = new Map<string, {
      contractCode: string;
      customerName: string;
      customerAddress: string;
      tasks: UserTaskItem[];
      earliestStart: string;
      latestEnd: string;
    }>();

    filteredTasks.forEach((task) => {
      const cCode = task.contractCode ? task.contractCode.trim() : (task.project ? `DỰ ÁN: ${task.project.trim()}` : 'NHIỆM VỤ NỘI BỘ');
      const cCust = task.customerName ? task.customerName.trim() : (task.project ? task.project.trim() : 'Nội bộ công ty');
      const cAddr = task.customerAddress ? task.customerAddress.trim() : '';

      if (!map.has(cCode)) {
        map.set(cCode, {
          contractCode: cCode,
          customerName: cCust,
          customerAddress: cAddr,
          tasks: [],
          earliestStart: task.isContractOnly ? '' : (task.startDate || '2026-10-01'),
          latestEnd: task.isContractOnly ? '' : (task.endDate || '2026-10-31'),
        });
      }

      if (!task.isContractOnly) {
        const grp = map.get(cCode)!;
        grp.tasks.push(task);
        if (!grp.earliestStart || (task.startDate && task.startDate < grp.earliestStart)) {
          grp.earliestStart = task.startDate;
        }
        if (!grp.latestEnd || (task.endDate && task.endDate > grp.latestEnd)) {
          grp.latestEnd = task.endDate;
        }
      }
    });

    return Array.from(map.values()).map((grp) => {
      const totalProg = grp.tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
      const avgProgress = grp.tasks.length > 0 ? Math.round(totalProg / grp.tasks.length) : 0;
      const isOrderGroup =
        grp.contractCode.startsWith('ĐH-') ||
        grp.contractCode.startsWith('DH-') ||
        grp.tasks.some((t) => t.category === 'order');
      const groupPrefix = isOrderGroup ? 'ĐƠN HÀNG' : 'HỢP ĐỒNG';
      const displayCode = grp.contractCode;

      return {
        ...grp,
        avgProgress,
        isBidding: false,
        groupPrefix,
        displayCode,
      };
    });
  }, [filteredTasks]);

  // Phân trang cho danh mục hợp đồng dạng bảng
  const paginatedContractGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return contractGroups.slice(start, start + pageSize);
  }, [contractGroups, currentPage, pageSize]);

  // Điều hướng tháng trước và tháng sau
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Kích thước tối ưu vừa vặn 100% khung màn hình
  const leftColWidth = 300; // Cột tên công việc 300px hiển thị rõ ràng Hợp đồng, Khách hàng và Công việc con
  const dueColWidth = 82; // Cột hạn chót 82px
  const percentColWidth = 56; // Cột phần trăm 56px
  const rowHeight = 42; // Chiều cao mỗi dòng 42px
  const isCurrentMonthActive = currentYear === realCurrentYear && currentMonth === realCurrentMonth;

  // Tính số ngày trong tháng đang chọn
  const daysInCurrentMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // Danh sách các ngày trong tháng với thứ chính xác
  const daysList = useMemo(() => {
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const list = [];
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(currentYear, currentMonth - 1, i);
      const dayOfWeek = d.getDay();
      list.push({
        dayNumber: i,
        dayName: dayNames[dayOfWeek],
        isToday: isCurrentMonthActive && i === todayDay,
      });
    }
    return list;
  }, [currentYear, currentMonth, daysInCurrentMonth, isCurrentMonthActive]);

  // Phân chia 4 tuần trong tháng
  const week1Count = 7;
  const week2Count = 7;
  const week3Count = 7;
  const week4Count = Math.max(1, daysInCurrentMonth - 21);

  // Định dạng tên người thực hiện và phòng ban (không hiển thị trong dấu ngoặc tròn (), phân cách với tên bằng |)
  const formatAssigneeDisplay = (rawAssignee?: string, taskDept?: string) => {
    if (!rawAssignee || !rawAssignee.trim()) {
      return { name: 'Ban Giám đốc', dept: '' };
    }
    const name = rawAssignee.replace(/\s*\(.*?\)/g, '').trim();
    const paren = rawAssignee.match(/\((.*?)\)/)?.[1]?.trim() || '';

    let dept = paren;
    if (!dept) {
      const matchedEmp = allCompanyEmployees.find((e) => e.name.toLowerCase() === name.toLowerCase());
      dept = matchedEmp?.department || taskDept || '';
    }
    // Loại bỏ dấu ngoặc đơn nếu có trong tên phòng ban
    dept = dept.replace(/[()]/g, '').trim();

    return { name, dept };
  };

  // Phân tích chuỗi ngày tháng an toàn ở cả định dạng YYYY-MM-DD và DD/MM/YYYY
  const parseDateParts = (dateStr?: string) => {
    if (!dateStr) return { year: currentYear, month: currentMonth, day: 1 };
    const cleanStr = dateStr.trim();
    if (cleanStr.includes('/')) {
      const p = cleanStr.split('/');
      if (p.length === 3) {
        return {
          year: parseInt(p[2], 10) || currentYear,
          month: parseInt(p[1], 10) || currentMonth,
          day: parseInt(p[0], 10) || 1,
        };
      }
    }
    const p = cleanStr.split('-');
    if (p.length === 3) {
      return {
        year: parseInt(p[0], 10) || currentYear,
        month: parseInt(p[1], 10) || currentMonth,
        day: parseInt(p[2], 10) || 1,
      };
    }
    return { year: currentYear, month: currentMonth, day: 1 };
  };

  // Tính toán hạn chót và số ngày còn lại hoặc trễ hạn
  const getDueInfo = (task: UserTaskItem) => {
    const end = parseDateParts(task.endDate);
    const dueDay = end.day;
    const dueMonth = end.month;
    const dueLabel = `${dueDay}/${dueMonth}`;

    const dueDateMs = new Date(end.year, end.month - 1, end.day).setHours(0, 0, 0, 0);
    const todayDateMs = new Date(realCurrentYear, realCurrentMonth - 1, todayDay).setHours(0, 0, 0, 0);
    const diffDays = Math.round((todayDateMs - dueDateMs) / (1000 * 60 * 60 * 24));

    let subText = '';
    let color = '#64748b';

    if (task.status === 'completed') {
      color = '#10b981';
      if (diffDays > 0) {
        subText = `trễ ${diffDays}`;
      } else if (diffDays === 0) {
        subText = 'hôm nay';
      } else {
        subText = `còn ${Math.abs(diffDays)} ngày`;
      }
    } else if (task.status === 'cancelled') {
      color = '#ef4444';
      subText = 'huỷ';
    } else if (task.status === 'paused') {
      color = '#f59e0b';
      subText = 'tạm dừng';
    } else if (diffDays > 0) {
      color = '#ef4444';
      subText = `trễ ${diffDays}`;
    } else if (diffDays === 0) {
      color = '#f97316';
      subText = 'hôm nay';
    } else {
      color = task.progress > 0 ? '#10b981' : '#f97316';
      subText = `còn ${Math.abs(diffDays)} ngày`;
    }

    return { dueLabel, subText, color };
  };

  // Tính toán toạ độ thanh tiến độ Gantt theo tỉ lệ phần trăm
  const getTaskBarCoords = (task: UserTaskItem) => {
    const sDate = parseDateParts(task.startDate);
    const eDate = parseDateParts(task.endDate);
    const sYear = sDate.year;
    const sMonth = sDate.month;
    const sDay = sDate.day;

    const eYear = eDate.year;
    const eMonth = eDate.month;
    const eDay = eDate.day;

    const taskStartNum = sYear * 10000 + sMonth * 100 + sDay;
    const taskEndNum = eYear * 10000 + eMonth * 100 + eDay;
    const monthStartNum = currentYear * 10000 + currentMonth * 100 + 1;
    const monthEndNum = currentYear * 10000 + currentMonth * 100 + daysInCurrentMonth;

    if (taskEndNum < monthStartNum || taskStartNum > monthEndNum) {
      return null;
    }

    let validStart = 1;
    if (sYear === currentYear && sMonth === currentMonth) {
      validStart = Math.max(1, Math.min(daysInCurrentMonth, sDay));
    }

    let validEnd = daysInCurrentMonth;
    if (eYear === currentYear && eMonth === currentMonth) {
      validEnd = Math.max(validStart, Math.min(daysInCurrentMonth, eDay));
    }

    const duration = validEnd - validStart + 1;
    const leftPercent = ((validStart - 1) / daysInCurrentMonth) * 100;
    const widthPercent = (duration / daysInCurrentMonth) * 100;

    const startsBefore = taskStartNum < monthStartNum;
    const endsAfter = taskEndNum > monthEndNum;

    return { leftPercent, widthPercent, duration, startsBefore, endsAfter };
  };

  // Màu sắc thanh biểu đồ Gantt và phần trăm hoàn thành
  const getGanttBarColors = (task: UserTaskItem) => {
    switch (task.status) {
      case 'completed':
        return {
          trackBg: '#a7f3d0',
          fillBg: '#059669',
        };
      case 'in_progress':
      case 'on_track':
      case 'delayed':
        return {
          trackBg: '#bfdbfe',
          fillBg: '#2563eb',
        };
      case 'paused':
      case 'on_hold':
        return {
          trackBg: '#fef3c7',
          fillBg: '#d97706',
        };
      case 'cancelled':
      case 'canceled':
        return {
          trackBg: '#fee2e2',
          fillBg: '#dc2626',
        };
      case 'not_started':
      case 'overdue':
      default:
        return {
          trackBg: '#e2e8f0',
          fillBg: '#64748b',
        };
    }
  };

  // Cập nhật trạng thái công việc
  const handleUpdateStatus = (task: UserTaskItem, newStatus: string) => {
    if (readOnly) return;
    let newStatusLabel = 'Chưa thực hiện';
    if (newStatus === 'in_progress') newStatusLabel = 'Đang thực hiện';
    else if (newStatus === 'completed') newStatusLabel = 'Đã hoàn thành';
    else if (newStatus === 'paused') newStatusLabel = 'Tạm dừng';
    else if (newStatus === 'cancelled') newStatusLabel = 'Huỷ bỏ';

    let finalProgress = task.progress;
    if (newStatus === 'completed') finalProgress = 100;
    else if (newStatus === 'not_started' && finalProgress === 100) finalProgress = 0;

    setUpdatingProgress(finalProgress);

    if (propTasks) {
      const updated = tasks.map((t) =>
        t.id === task.id
          ? { ...t, progress: finalProgress, status: newStatus, statusLabel: newStatusLabel }
          : t
      );
      setTasks(updated);
      if (onTasksChange) onTasksChange(updated);
      if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask({
          ...selectedTask,
          progress: finalProgress,
          status: newStatus,
          statusLabel: newStatusLabel,
        });
      }
      if (onShowToast) {
        onShowToast('success', 'Cập nhật trạng thái', `Chuyển sang: ${newStatusLabel}`);
      }
      return;
    }

    fetch(`/api/user-tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress: finalProgress,
        status: newStatus,
        statusLabel: newStatusLabel,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        const updated = tasks.map((t) =>
          t.id === task.id
            ? { ...t, progress: finalProgress, status: newStatus, statusLabel: newStatusLabel }
            : t
        );
        setTasks(updated);
        if (onTasksChange) onTasksChange(updated);
        if (selectedTask && selectedTask.id === task.id) {
          setSelectedTask({
            ...selectedTask,
            progress: finalProgress,
            status: newStatus,
            statusLabel: newStatusLabel,
          });
        }
        if (onShowToast) {
          onShowToast('success', 'Cập nhật trạng thái', `Chuyển sang: ${newStatusLabel}`);
        }
      })
      .catch((err) => {
        console.error('Lỗi cập nhật trạng thái:', err);
      });
  };

  // Cập nhật tiến độ công việc
  const handleUpdateProgress = (task: UserTaskItem, newProgress: number) => {
    if (readOnly) return;
    let newStatus = task.status;
    let newStatusLabel = task.statusLabel;

    if (newProgress === 100) {
      newStatus = 'completed';
      newStatusLabel = 'Đã hoàn thành';
    } else if (newProgress > 0 && (task.status === 'not_started' || task.status === 'paused')) {
      newStatus = 'in_progress';
      newStatusLabel = 'Đang thực hiện';
    } else if (newProgress === 0 && task.status === 'completed') {
      newStatus = 'not_started';
      newStatusLabel = 'Chưa thực hiện';
    }

    if (propTasks) {
      const updated = tasks.map((t) =>
        t.id === task.id
          ? { ...t, progress: newProgress, status: newStatus, statusLabel: newStatusLabel }
          : t
      );
      setTasks(updated);
      if (onTasksChange) onTasksChange(updated);
      if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask({
          ...selectedTask,
          progress: newProgress,
          status: newStatus,
          statusLabel: newStatusLabel,
        });
      }
      if (onShowToast) {
        onShowToast('success', 'Cập nhật tiến độ', `Đã lưu tiến độ ${newProgress}% cho công việc ${task.code}`);
      }
      return;
    }

    fetch(`/api/user-tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress: newProgress,
        status: newStatus,
        statusLabel: newStatusLabel,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        const updated = tasks.map((t) =>
          t.id === task.id
            ? { ...t, progress: newProgress, status: newStatus, statusLabel: newStatusLabel }
            : t
        );
        setTasks(updated);
        if (onTasksChange) onTasksChange(updated);
        if (selectedTask && selectedTask.id === task.id) {
          setSelectedTask({
            ...selectedTask,
            progress: newProgress,
            status: newStatus,
            statusLabel: newStatusLabel,
          });
        }
        if (onShowToast) {
          onShowToast('success', 'Cập nhật tiến độ', `Đã lưu tiến độ ${newProgress}% cho công việc ${task.code}`);
        }
      })
      .catch((err) => {
        console.error('Lỗi lưu tiến độ:', err);
      });
  };

  // Xoá hợp đồng / gói thầu và tất cả các công việc con thuộc về nó
  const handleDeleteContract = async () => {
    if (!selectedContractGroup) return;
    const itemLabel = selectedContractGroup.isBidding ? 'gói thầu' : 'hợp đồng';
    const confirmMsg = `Bạn có chắc chắn muốn xoá ${itemLabel} "${selectedContractGroup.displayCode}" cùng toàn bộ ${selectedContractGroup.tasks.length} công việc con không?\nThao tác này không thể hoàn tác!`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeletingContract(true);
    try {
      const taskIds = selectedContractGroup.tasks.map((t) => t.id);
      const res = await fetch(`/api/user-tasks/contract/${encodeURIComponent(selectedContractGroup.contractCode)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      });

      if (!res.ok) {
        throw new Error('Lỗi khi xoá dữ liệu trên máy chủ');
      }

      const updatedTasks = tasks.filter(
        (t) => t.contractCode !== selectedContractGroup.contractCode && !taskIds.includes(t.id)
      );
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);

      setIsContractDrawerOpen(false);
      setSelectedContractGroup(null);
      if (onShowToast) {
        onShowToast(
          'success',
          'Đã xoá thành công',
          `Đã xoá ${itemLabel} ${selectedContractGroup.displayCode} và các công việc liên quan.`
        );
      }
    } catch (err: any) {
      console.error('Lỗi khi xoá hợp đồng/gói thầu:', err);
      // Fallback cập nhật local
      const taskIds = selectedContractGroup.tasks.map((t) => t.id);
      const updatedTasks = tasks.filter(
        (t) => t.contractCode !== selectedContractGroup.contractCode && !taskIds.includes(t.id)
      );
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);
      setIsContractDrawerOpen(false);
      setSelectedContractGroup(null);
      if (onShowToast) {
        onShowToast(
          'success',
          'Đã xoá thành công',
          `Đã xoá ${itemLabel} ${selectedContractGroup.displayCode}.`
        );
      }
    } finally {
      setIsDeletingContract(false);
    }
  };

  // Xoá một công việc đơn lẻ
  const [isDeletingTask, setIsDeletingTask] = useState<boolean>(false);
  const handleDeleteSingleTask = async (task: UserTaskItem) => {
    if (!task) return;
    const confirmMsg = `Bạn có chắc chắn muốn xoá công việc "${task.title}" (${task.code}) khỏi hệ thống?\nThao tác này không thể hoàn tác!`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeletingTask(true);
    try {
      const res = await fetch(`/api/user-tasks/${encodeURIComponent(task.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Lỗi khi xoá công việc trên máy chủ');
      }

      const updatedTasks = tasks.filter((t) => t.id !== task.id);
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);

      setIsDrawerOpen(false);
      setSelectedTask(null);
      if (onShowToast) {
        onShowToast(
          'success',
          'Đã xoá công việc',
          `Đã xoá thành công công việc ${task.code} khỏi cơ sở dữ liệu.`
        );
      }
    } catch (err: any) {
      console.error('Lỗi khi xoá công việc:', err);
      // Fallback cập nhật local
      const updatedTasks = tasks.filter((t) => t.id !== task.id);
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);
      setIsDrawerOpen(false);
      setSelectedTask(null);
      if (onShowToast) {
        onShowToast('success', 'Đã xoá công việc', `Đã xoá công việc ${task.code}.`);
      }
    } finally {
      setIsDeletingTask(false);
    }
  };

  // Tạo công việc mới
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !allowAdd) return;
    if (!newTaskTitle.trim()) return;

    const taskAssignee = newTaskAssignee.trim() || assignee || (
      newTaskCategory === 'bidding' ? 'Phòng Kinh doanh và Đấu thầu' :
      newTaskCategory === 'production' ? 'Xưởng Sản xuất Mộc 1' : 'Khác'
    );
    const taskCatLabel = newTaskCategory === 'bidding' ? 'Đấu thầu' : newTaskCategory === 'production' ? 'Sản xuất' : 'Khác';
    const taskCodePrefix = newTaskCategory === 'bidding' ? 'DT' : newTaskCategory === 'production' ? 'SX' : 'KH';
    const defaultProject = newTaskProject.trim() || (
      newTaskCategory === 'bidding' ? 'Dự án thầu công trình' :
      newTaskCategory === 'production' ? 'Lệnh sản xuất nhà máy' : 'Công việc nghiệp vụ khác'
    );

    if (propTasks) {
      const createdItem: UserTaskItem = {
        id: String(Date.now()),
        code: `${taskCodePrefix}-2026-${Date.now().toString().slice(-3)}`,
        title: newTaskTitle.trim(),
        project: defaultProject,
        department: department || 'bom',
        assignee: taskAssignee,
        assigner: 'Ban Giám đốc',
        startDate: newTaskStartDate,
        endDate: newTaskEndDate,
        priority: newTaskPriority,
        priorityLabel: newTaskPriority === 'urgent' ? 'Khẩn cấp' : newTaskPriority === 'high' ? 'Ưu tiên cao' : 'Trung bình',
        progress: 0,
        status: 'not_started',
        statusLabel: 'Chưa thực hiện',
        category: newTaskCategory,
        categoryLabel: taskCatLabel,
        contractCode: newTaskContractCode.trim() || undefined,
        customerName: newTaskCustomerName.trim() || undefined,
        description: newTaskDesc.trim(),
      };
      const updated = [createdItem, ...tasks];
      setTasks(updated);
      if (onTasksChange) onTasksChange(updated);
      setIsAddModalOpen(false);
      setNewTaskTitle('');
      setNewTaskProject('');
      setNewTaskAssignee('');
      setNewTaskContractCode('');
      setNewTaskCustomerName('');
      setNewTaskDesc('');
      if (onShowToast) {
        onShowToast('success', 'Thêm công việc', 'Đã thêm mới công việc thành công');
      }
      return;
    }

    fetch('/api/user-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTaskTitle.trim(),
        project: newTaskProject.trim() || (newTaskCategory === 'bidding' ? 'Dự án thầu công trình' : 'Lệnh sản xuất nhà máy'),
        department: department || 'bom',
        assignee: taskAssignee,
        assigner: 'Ban Giám đốc',
        startDate: newTaskStartDate,
        endDate: newTaskEndDate,
        priority: newTaskPriority,
        priorityLabel: newTaskPriority === 'urgent' ? 'Khẩn cấp' : newTaskPriority === 'high' ? 'Ưu tiên cao' : 'Trung bình',
        progress: 0,
        status: 'not_started',
        statusLabel: 'Chưa thực hiện',
        category: newTaskCategory,
        categoryLabel: taskCatLabel,
        contractCode: newTaskContractCode.trim() || '',
        customerName: newTaskCustomerName.trim() || '',
        description: newTaskDesc.trim(),
      }),
    })
      .then((res) => res.json())
      .then((createdItem) => {
        setIsAddModalOpen(false);
        setNewTaskTitle('');
        setNewTaskProject('');
        setNewTaskAssignee('');
        setNewTaskContractCode('');
        setNewTaskCustomerName('');
        setNewTaskDesc('');
        fetchTasks();
        if (onTasksChange && createdItem) {
          onTasksChange([createdItem, ...tasks]);
        }
        if (onShowToast) {
          onShowToast('success', 'Thêm công việc', 'Đã thêm mới công việc thành công');
        }
      })
      .catch((err) => console.error(err));
  };

  return (
    <div
      style={{
        flex: '1 1 0%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        fontFamily: "'Roboto Condensed', sans-serif",
      }}
    >
      {/* ========================================================
          1. THANH CÔNG CỤ CHÍNH - HEADER TOOLBAR
          ======================================================== */}
      {!hideHeader && (
        <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          flexShrink: 0,
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Cụm trái: Icon, Tiêu đề, Badge số lượng, Điều hướng tháng, Lọc người thực hiện, Hộp tìm kiếm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 0%', minWidth: 0, flexWrap: 'wrap' }}>
          {!hideTitle && title && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ListTask size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.975rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {title}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: '#e0e7ff',
                      color: '#4338ca',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {filteredTasks.length}
                  </span>
                </div>
                {subtitle && (
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 500, lineHeight: 1.2, marginTop: '1px' }}>
                    {subtitle}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Icon next, prev chuyển đổi các tháng */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              padding: '2px',
              height: '32px',
              boxSizing: 'border-box',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Tháng trước"
              style={{
                border: 'none',
                backgroundColor: '#ffffff',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '5px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronLeft size={13} />
            </button>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#0f172a',
                padding: '0 8px',
                whiteSpace: 'nowrap',
                minWidth: '92px',
                textAlign: 'center',
              }}
            >
              Tháng {currentMonth}/{currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Tháng tiếp theo"
              style={{
                border: 'none',
                backgroundColor: '#ffffff',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '5px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronRight size={13} />
            </button>
          </div>

          {!isCurrentMonthActive && (
            <button
              type="button"
              onClick={() => {
                setCurrentYear(realCurrentYear);
                setCurrentMonth(realCurrentMonth);
              }}
              title="Về tháng hiện tại"
              style={{
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#2563eb',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: '6px',
                padding: '0 8px',
                height: '32px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Hôm nay
            </button>
          )}

          {/* Hộp nhập Người thực hiện kèm gợi ý toàn bộ nhân viên công ty (chỉ hiển thị ở chế độ Quản trị công việc chung, ẩn ở Công việc của tôi) */}
          {!isOnlyMyTasks && !hideAssigneeFilter && (
            <div
              ref={assigneeDropdownRef}
            style={{
              position: 'relative',
              width: '185px',
              minWidth: '150px',
              flexShrink: 0,
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Người thực hiện..."
                value={assigneeSearch}
                onFocus={() => setIsAssigneeDropdownOpen(true)}
                onChange={(e) => {
                  setAssigneeSearch(e.target.value);
                  setIsAssigneeDropdownOpen(true);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: assigneeSearch ? '6px 24px 6px 10px' : '6px 10px',
                  backgroundColor: '#ffffff',
                  border: assigneeSearch.trim() ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '7px',
                  fontSize: '0.78rem',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  color: assigneeSearch.trim() ? '#1d4ed8' : '#1e293b',
                  fontWeight: assigneeSearch.trim() ? 700 : 500,
                  outline: 'none',
                  boxSizing: 'border-box',
                  height: '32px',
                  boxShadow: isAssigneeDropdownOpen ? '0 0 0 2px rgba(37,99,235,0.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              />
              {assigneeSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setAssigneeSearch('');
                    setCurrentPage(1);
                  }}
                  title="Xoá lọc người thực hiện"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Menu danh sách gợi ý toàn bộ nhân viên công ty */}
            {isAssigneeDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  width: '320px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  zIndex: 999,
                  fontFamily: "'Roboto Condensed', sans-serif",
                }}
                className="custom-scrollbar"
              >
                <div
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.68rem',
                    color: '#64748b',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Gợi ý nhân viên ({filteredEmployeeSuggestions.length})</span>
                  {assigneeSearch && (
                    <span
                      onClick={() => {
                        setAssigneeSearch('');
                        setIsAssigneeDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      style={{ color: '#2563eb', cursor: 'pointer', textTransform: 'none', fontSize: '0.7rem' }}
                    >
                      Xoá lọc
                    </span>
                  )}
                </div>

                {filteredEmployeeSuggestions.length === 0 ? (
                  <div style={{ padding: '12px 10px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                    Không tìm thấy nhân viên phù hợp
                  </div>
                ) : (
                  filteredEmployeeSuggestions.map((emp) => {
                    const isSelected = assigneeSearch.trim().toLowerCase() === emp.name.toLowerCase();
                    return (
                      <div
                        key={emp.name}
                        onClick={() => {
                          setAssigneeSearch(emp.name);
                          setIsAssigneeDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.12s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Avatar tròn với chữ cái viết tắt */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            minWidth: '32px',
                            borderRadius: '50%',
                            backgroundColor: emp.avatarColor,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            letterSpacing: '0.5px',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                          }}
                        >
                          {emp.avatarText}
                        </div>

                        {/* Họ tên và Phòng ban | Chức vụ */}
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <div
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? '#1d4ed8' : '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {emp.name}
                          </div>
                          {emp.subtitle && (
                            <div
                              style={{
                                fontSize: '0.68rem',
                                color: '#64748b',
                                marginTop: '1px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {emp.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          )}

          {/* Hộp tìm kiếm bo góc gọn gàng dãn full dòng */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '150px' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder={searchPlaceholder || "Tìm công việc..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontFamily: "'Roboto Condensed', sans-serif",
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
                height: '32px',
              }}
            />
          </div>
        </div>

        {/* Cụm phải: Nút thêm việc, Bộ chuyển đổi Bảng / Gantt, Dropdown Trạng thái */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {allowAdd && !readOnly && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                height: '32px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={15} />
              <span>Thêm việc</span>
            </button>
          )}

          {/* Segmented control: Bảng hoặc Gantt */}
          {!hideViewModeSwitcher && (
            <div
              style={{
                display: 'inline-flex',
                padding: '2px',
                backgroundColor: '#e2e8f0',
                borderRadius: '7px',
                alignItems: 'center',
                height: '32px',
                boxSizing: 'border-box',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  if (onViewModeChange) onViewModeChange('list');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0 10px',
                  height: '26px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: viewMode === 'list' ? '#ffffff' : 'transparent',
                  color: viewMode === 'list' ? '#1e293b' : '#64748b',
                  fontWeight: viewMode === 'list' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  transition: 'all 0.15s ease',
                }}
              >
                <ListTask size={13} />
                <span>Bảng</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('gantt');
                  if (onViewModeChange) onViewModeChange('gantt');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0 12px',
                  height: '26px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: viewMode === 'gantt' ? '#ffffff' : 'transparent',
                  color: viewMode === 'gantt' ? '#2563eb' : '#64748b',
                  fontWeight: viewMode === 'gantt' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'gantt' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Gantt</span>
              </button>
            </div>
          )}

          {/* Dropdown Bộ lọc tiến độ chuẩn component Select: Tất cả, Quá hạn, Chậm tiến độ, Đúng tiến độ */}
          <div style={{ width: '145px', flexShrink: 0 }}>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                height: '32px',
                minHeight: '32px',
                padding: '0 28px 0 10px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'overdue', label: 'Quá hạn' },
                { value: 'delayed', label: 'Chậm tiến độ' },
                { value: 'on_track', label: 'Đúng tiến độ' },
              ]}
            />
          </div>

          {extraActions}
        </div>
      </div>
      )}

      {/* ========================================================
          2. THANH CHÚ THÍCH TRẠNG THÁI THỰC HIỆN
          ======================================================== */}
      {!hideStatusLegend && !isScheduleStatusMode && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 16px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#334155',
            flexShrink: 0,
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#475569' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              Tổng hợp đồng triển khai: <span style={{ color: '#2563eb' }}>{contractGroups.length}</span> hợp đồng
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>
              Tổng đầu việc: <strong style={{ color: '#0f172a' }}>{contractGroups.reduce((sum, g) => sum + g.tasks.length, 0)}</strong> hạng mục
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {executionStatusItems.map((item) => {
              const isSelected = executionStatusFilter === item.key;
              return (
                <div
                  key={item.key}
                  onClick={() => {
                    setExecutionStatusFilter((prev) => (prev === item.key ? 'all' : item.key));
                    setCurrentPage(1);
                  }}
                  title={isSelected ? `Đang lọc: ${item.label} (nhấn để bỏ lọc)` : `Nhấn để lọc theo: ${item.label}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                    border: isSelected ? `1px solid ${item.color}` : '1px solid transparent',
                    opacity: executionStatusFilter === 'all' || isSelected ? 1 : 0.45,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{ width: '14px', height: '3.5px', borderRadius: '2px', backgroundColor: item.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: isSelected ? 700 : 600, color: isSelected ? '#0f172a' : '#334155' }}>
                    {item.label}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '2px', fontWeight: 700 }}>
                      ✕
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          3. NỘI DUNG CHÍNH: BIỂU ĐỒ GANTT HOẶC BẢNG DANH SÁCH
          ======================================================== */}
      {viewMode === 'gantt' ? (
        /* ======================== CHẾ ĐỘ BIỂU ĐỒ GANTT ======================== */
        <div
          className="custom-scrollbar"
          style={{
            flex: '1 1 0%',
            overflowX: 'auto',
            overflowY: 'auto',
            minHeight: 0,
            backgroundColor: '#ffffff',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '100%',
              minWidth: '960px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {/* Header 2 tầng: Tầng Tuần và Tầng Ngày */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #cbd5e1',
                position: 'sticky',
                top: 0,
                zIndex: 20,
              }}
            >
              {/* Cột tiêu đề: CÔNG VIỆC */}
              <div
                style={{
                  width: `${leftColWidth}px`,
                  minWidth: `${leftColWidth}px`,
                  maxWidth: `${leftColWidth}px`,
                  padding: '6px 12px',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  color: '#64748b',
                  letterSpacing: '0.04em',
                  borderRight: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              >
                CÔNG VIỆC
              </div>

              {/* Vùng Header Lịch Timeline */}
              <div
                style={{
                  flex: '1 1 0%',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Hàng 1: 4 Tuần */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', height: '24px' }}>
                  {/* Tuần 1 */}
                  <div
                    style={{
                      width: `${(week1Count / daysInCurrentMonth) * 100}%`,
                      borderRight: '1px solid #cbd5e1',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>Tuần 1</span>
                  </div>

                  {/* Tuần 2 */}
                  <div
                    style={{
                      width: `${(week2Count / daysInCurrentMonth) * 100}%`,
                      borderRight: '1px solid #cbd5e1',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>Tuần 2</span>
                  </div>

                  {/* Tuần 3 */}
                  <div
                    style={{
                      width: `${(week3Count / daysInCurrentMonth) * 100}%`,
                      borderRight: '1px solid #cbd5e1',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>Tuần 3</span>
                  </div>

                  {/* Tuần 4 */}
                  <div
                    style={{
                      width: `${(week4Count / daysInCurrentMonth) * 100}%`,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>Tuần 4</span>
                  </div>
                </div>

                {/* Hàng 2: Các ngày chi tiết */}
                <div style={{ display: 'flex', height: '24px' }}>
                  {daysList.map((d) => (
                    <div
                      key={d.dayNumber}
                      style={{
                        width: `${100 / daysInCurrentMonth}%`,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        fontSize: '0.58rem',
                        color: d.isToday ? '#ef4444' : '#64748b',
                        fontWeight: d.isToday ? 700 : 500,
                        borderRight:
                          d.dayNumber === 7 || d.dayNumber === 14 || d.dayNumber === 21
                            ? '1px solid #cbd5e1'
                            : 'none',
                        position: 'relative',
                        lineHeight: 1.1,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div>{d.dayName}</div>
                      <div>{d.dayNumber}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cột header: HẠN CHÓT */}
              <div
                style={{
                  width: `${dueColWidth}px`,
                  minWidth: `${dueColWidth}px`,
                  maxWidth: `${dueColWidth}px`,
                  padding: '6px 4px',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  color: '#64748b',
                  letterSpacing: '0.03em',
                  borderLeft: '1px solid #cbd5e1',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              >
                HẠN CHÓT
              </div>

              {/* Cột header: PHẦN TRĂM */}
              <div
                style={{
                  width: `${percentColWidth}px`,
                  minWidth: `${percentColWidth}px`,
                  maxWidth: `${percentColWidth}px`,
                  padding: '6px 4px',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  color: '#64748b',
                  letterSpacing: '0.03em',
                  borderLeft: '1px solid #cbd5e1',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              >
                %
              </div>
            </div>

            {/* Thân bảng Gantt */}
            <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', width: '100%' }}>
              {/* Lớp phủ vạch kẻ đứng ngày Hôm nay */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${leftColWidth}px`,
                  right: `${dueColWidth + percentColWidth}px`,
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                {isCurrentMonthActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      bottom: 0,
                      left: `${((todayDay - 0.5) / daysInCurrentMonth) * 100}%`,
                      width: '2px',
                      backgroundColor: '#ef4444',
                    }}
                  >
                    {/* Nút tròn màu đỏ ghim trên đầu vạch hôm nay */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '0px',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                        border: '1px solid #ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Danh sách các dòng công việc gom nhóm theo Hợp đồng */}
              {loading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  Đang nạp dữ liệu tiến độ công việc...
                </div>
              ) : contractGroups.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                  <ListTask size={48} style={{ color: '#cbd5e1', marginBottom: '14px' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Chưa có công việc nào trong cơ sở dữ liệu
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                    Dữ liệu công việc thực tế sẽ được lưu trữ và hiển thị tại đây. Bấm nút bên dưới để khởi tạo công việc đầu tiên.
                  </div>
                  {allowAdd && !readOnly && (
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      style={{
                        padding: '8px 18px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                      }}
                    >
                      <Plus size={16} />
                      <span>Thêm việc mới</span>
                    </button>
                  )}
                </div>
              ) : (
                contractGroups.map((group) => {
                  const isCollapsed = !!collapsedContracts[group.contractCode];
                  const endParts = group.latestEnd ? group.latestEnd.split('-') : [];
                  const dueLabel =
                    group.tasks.length > 0 && endParts.length === 3
                      ? `${parseInt(endParts[2], 10) || 1}/${parseInt(endParts[1], 10) || 10}`
                      : '—';
                  const groupPrefix = group.groupPrefix;
                  const displayCode = group.displayCode;

                  return (
                    <React.Fragment key={group.contractCode}>
                      {/* ================= DÒNG TIÊU ĐỀ DANH MỤC CHÍNH: HỢP ĐỒNG / GÓI THẦU ================= */}
                      <div
                        onClick={() => {
                          setSelectedContractGroup(group);
                          setIsContractDrawerOpen(true);
                        }}
                        style={{
                          display: 'flex',
                          width: '100%',
                          minHeight: '44px',
                          backgroundColor: '#f1f5f9',
                          borderTop: '1px solid #cbd5e1',
                          borderBottom: '1px solid #cbd5e1',
                          alignItems: 'center',
                          cursor: 'pointer',
                          userSelect: 'none',
                          boxSizing: 'border-box',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e2e8f0';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                        }}
                        title={`Nhấn để xem chi tiết ${groupPrefix.toLowerCase()} ${displayCode}`}
                      >
                        {/* Cột 1: DANH MỤC CHÍNH HỢP ĐỒNG / GÓI THẦU VÀ KHÁCH HÀNG */}
                        <div
                          style={{
                            width: `${leftColWidth}px`,
                            minWidth: `${leftColWidth}px`,
                            maxWidth: `${leftColWidth}px`,
                            padding: '4px 10px',
                            borderRight: '1px solid #cbd5e1',
                            overflow: 'hidden',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              lineHeight: 1.25,
                              overflow: 'hidden',
                            }}
                          >
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleContractCollapse(group.contractCode);
                              }}
                              title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'transform 0.2s ease',
                                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                color: '#1e293b',
                                flexShrink: 0,
                                padding: '2px',
                                borderRadius: '4px',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <ChevronDown size={13} />
                            </span>
                            <span
                              className="text-uppercase"
                              style={{
                                fontWeight: 800,
                                fontSize: '0.8125rem',
                                color: '#0f172a',
                                letterSpacing: '0.02em',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={`${groupPrefix}: ${displayCode}`}
                            >
                              {groupPrefix}: {displayCode}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: '#64748b',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              ({group.tasks.length})
                            </span>
                          </div>
                          {/* Bên dưới số hợp đồng là tên khách hàng | Địa chỉ khách hàng */}
                          <div
                            style={{
                              fontSize: '0.675rem',
                              color: '#475569',
                              marginTop: '2px',
                              paddingLeft: '19px',
                              lineHeight: 1.15,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}
                            title={`${group.customerName} | ${group.customerAddress}`}
                          >
                            <span style={{ fontWeight: 400, color: '#475569' }}>{group.customerName}</span>
                            <span style={{ margin: '0 4px', color: '#94a3b8' }}>|</span>
                            <span>{group.customerAddress}</span>
                          </div>
                        </div>

                        {/* Cột 2: KHU VỰC VẼ THANH TIẾN ĐỘ TỔNG QUAN HỢP ĐỒNG */}
                        <div
                          style={{
                            flex: '1 1 0%',
                            minWidth: 0,
                            height: '100%',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            boxSizing: 'border-box',
                          }}
                        >
                          {/* Đường phân chia các tuần 1, 2, 3 */}
                          <div
                            style={{
                              position: 'absolute',
                              left: `${(week1Count / daysInCurrentMonth) * 100}%`,
                              top: 0,
                              bottom: 0,
                              width: '1px',
                              backgroundColor: '#cbd5e1',
                              pointerEvents: 'none',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              left: `${((week1Count + week2Count) / daysInCurrentMonth) * 100}%`,
                              top: 0,
                              bottom: 0,
                              width: '1px',
                              backgroundColor: '#cbd5e1',
                              pointerEvents: 'none',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              left: `${((week1Count + week2Count + week3Count) / daysInCurrentMonth) * 100}%`,
                              top: 0,
                              bottom: 0,
                              width: '1px',
                              backgroundColor: '#cbd5e1',
                              pointerEvents: 'none',
                            }}
                          />

                          {/* Dòng Hợp đồng không có thanh tiến độ */}
                        </div>

                        {/* Cột 3: HẠN CHÓT HỢP ĐỒNG */}
                        <div
                          style={{
                            width: `${dueColWidth}px`,
                            minWidth: `${dueColWidth}px`,
                            maxWidth: `${dueColWidth}px`,
                            padding: '3px 4px',
                            borderLeft: '1px solid #cbd5e1',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1.15,
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                            {dueLabel}
                          </div>
                          <div style={{ fontSize: '0.64rem', color: '#64748b' }}>
                            {group.tasks.length} việc
                          </div>
                        </div>

                        {/* Cột 4: PHẦN TRĂM TIẾN ĐỘ HỢP ĐỒNG */}
                        <div
                          style={{
                            width: `${percentColWidth}px`,
                            minWidth: `${percentColWidth}px`,
                            maxWidth: `${percentColWidth}px`,
                            padding: '3px 4px',
                            borderLeft: '1px solid #cbd5e1',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              color: group.avgProgress === 100 ? '#10b981' : '#0f172a',
                              lineHeight: 1,
                            }}
                          >
                            {group.avgProgress}%
                          </div>
                        </div>
                      </div>

                      {/* ================= CÁC CÔNG VIỆC CON TRONG HỢP ĐỒNG ================= */}
                      {!isCollapsed &&
                        group.tasks.map((task) => {
                          const barCoords = getTaskBarCoords(task);
                          const statusInfo = getStatusDisplay(task);
                          const dueInfo = getDueInfo(task);
                          const barColors = getGanttBarColors(task);
                          const assigneeInfo = formatAssigneeDisplay(task.assignee, task.department);
                          const taskScheduleStatus = getTaskScheduleStatus(task);

                          return (
                            <div
                              key={task.id}
                              onClick={() => {
                                setSelectedTask(task);
                                setUpdatingProgress(task.progress);
                                setIsDrawerOpen(true);
                              }}
                              style={{
                                display: 'flex',
                                width: '100%',
                                height: `${rowHeight}px`,
                                borderBottom: '1px solid #f1f5f9',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                                boxSizing: 'border-box',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              {/* Cột 1: CÔNG VIỆC CON */}
                              <div
                                style={{
                                  width: `${leftColWidth}px`,
                                  minWidth: `${leftColWidth}px`,
                                  maxWidth: `${leftColWidth}px`,
                                  padding: '3px 10px 3px 22px',
                                  borderRight: '1px solid #cbd5e1',
                                  overflow: 'hidden',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    lineHeight: 1.25,
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap',
                                      fontSize: '0.78rem',
                                      lineHeight: 1.25,
                                    }}
                                    title={`${task.title}${task.code ? ` (${task.code})` : ''}`}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 400, // KHÔNG DÙNG FONT CHỮ ĐẬM
                                        color: '#1e293b',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {task.title}
                                    </span>
                                    {task.code && (
                                      <span
                                        style={{
                                          fontWeight: 400, // KHÔNG DÙNG FONT CHỮ ĐẬM
                                          color: '#0284c7',
                                          fontSize: '0.75rem',
                                          flexShrink: 0,
                                          fontFamily: "'Roboto Condensed', sans-serif",
                                        }}
                                      >
                                        ({task.code})
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.66rem',
                                    color: '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginTop: '2px',
                                    lineHeight: 1,
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: statusInfo.dotColor, flexShrink: 0 }}>
                                    • {statusInfo.label}
                                  </span>
                                  {isScheduleStatusMode ? (
                                    <>
                                      {taskScheduleStatus === 'overdue' && (
                                        <>
                                          <span style={{ flexShrink: 0, color: '#94a3b8' }}>|</span>
                                          <span style={{ fontWeight: 600, color: '#dc2626', flexShrink: 0 }}>
                                            Đã quá hạn
                                          </span>
                                        </>
                                      )}
                                      {taskScheduleStatus === 'delayed' && (
                                        <>
                                          <span style={{ flexShrink: 0, color: '#94a3b8' }}>|</span>
                                          <span style={{ fontWeight: 600, color: '#d97706', flexShrink: 0 }}>
                                            Chậm tiến độ
                                          </span>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ flexShrink: 0 }}>|</span>
                                      <span style={{ fontWeight: 600, color: '#334155', flexShrink: 0 }}>
                                        {assigneeInfo.name}
                                      </span>
                                      {assigneeInfo.dept && (
                                        <>
                                          <span style={{ flexShrink: 0 }}>|</span>
                                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {assigneeInfo.dept}
                                          </span>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Cột 2: KHU VỰC VẼ THANH TIẾN ĐỘ GANTT */}
                              <div
                                style={{
                                  flex: '1 1 0%',
                                  minWidth: 0,
                                  height: '100%',
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  boxSizing: 'border-box',
                                }}
                              >
                                {/* Đường phân chia các tuần 1, 2, 3 */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `${(week1Count / daysInCurrentMonth) * 100}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: '1px',
                                    backgroundColor: '#e2e8f0',
                                    pointerEvents: 'none',
                                  }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `${((week1Count + week2Count) / daysInCurrentMonth) * 100}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: '1px',
                                    backgroundColor: '#e2e8f0',
                                    pointerEvents: 'none',
                                  }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `${((week1Count + week2Count + week3Count) / daysInCurrentMonth) * 100}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: '1px',
                                    backgroundColor: '#e2e8f0',
                                    pointerEvents: 'none',
                                  }}
                                />

                                {/* Thanh tiến độ Gantt */}
                                {barCoords && (
                                  <div
                                    title={`${task.title} - ${task.progress}%`}
                                    style={{
                                      position: 'absolute',
                                      left: `calc(${barCoords.leftPercent}% + 1px)`,
                                      width: `calc(${barCoords.widthPercent}% - 2px)`,
                                      minWidth: '10px',
                                      height: '10px',
                                      borderTopLeftRadius: barCoords.startsBefore ? '0px' : '5px',
                                      borderBottomLeftRadius: barCoords.startsBefore ? '0px' : '5px',
                                      borderTopRightRadius: barCoords.endsAfter ? '0px' : '5px',
                                      borderBottomRightRadius: barCoords.endsAfter ? '0px' : '5px',
                                      backgroundColor: barColors.trackBg,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                      transition: 'transform 0.15s ease',
                                      cursor: 'pointer',
                                      zIndex: 5,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'scaleY(1.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'scaleY(1)';
                                    }}
                                  >
                                    {task.progress > 0 && (
                                      <div
                                        style={{
                                          width: `${task.progress}%`,
                                          height: '100%',
                                          backgroundColor: barColors.fillBg,
                                          borderTopLeftRadius: barCoords.startsBefore ? '0px' : '5px',
                                          borderBottomLeftRadius: barCoords.startsBefore ? '0px' : '5px',
                                          borderTopRightRadius: task.progress === 100 && !barCoords.endsAfter ? '5px' : '0px',
                                          borderBottomRightRadius: task.progress === 100 && !barCoords.endsAfter ? '5px' : '0px',
                                          transition: 'width 0.3s ease',
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Cột 3: HẠN CHÓT */}
                              <div
                                style={{
                                  width: `${dueColWidth}px`,
                                  minWidth: `${dueColWidth}px`,
                                  maxWidth: `${dueColWidth}px`,
                                  padding: '3px 4px',
                                  borderLeft: '1px solid #cbd5e1',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  lineHeight: 1.15,
                                  boxSizing: 'border-box',
                                }}
                              >
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: dueInfo.color }}>
                                  {dueInfo.dueLabel}
                                </div>
                                <div style={{ fontSize: '0.64rem', color: '#64748b', marginTop: '1px' }}>
                                  {dueInfo.subText}
                                </div>
                              </div>

                              {/* Cột 4: PHẦN TRĂM */}
                              <div
                                style={{
                                  width: `${percentColWidth}px`,
                                  minWidth: `${percentColWidth}px`,
                                  maxWidth: `${percentColWidth}px`,
                                  padding: '3px 4px',
                                  borderLeft: '1px solid #cbd5e1',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    color: task.progress === 100 ? '#10b981' : '#64748b',
                                    marginBottom: '2px',
                                    lineHeight: 1,
                                  }}
                                >
                                  {task.progress}%
                                </div>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '3px',
                                    backgroundColor: '#e2e8f0',
                                    borderRadius: '2px',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${task.progress}%`,
                                      height: '100%',
                                      backgroundColor:
                                        task.progress === 100
                                          ? '#10b981'
                                          : task.progress > 0
                                          ? '#3b82f6'
                                          : '#cbd5e1',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ======================== CHẾ ĐỘ BẢNG DANH SÁCH ======================== */
        <div
          className="table-container"
          style={{
            flex: '1 1 0%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            border: 'none',
            borderRadius: 0,
            backgroundColor: '#ffffff',
          }}
        >
          <div
            className="table-responsive custom-scrollbar"
            style={{
              flex: '1 1 0%',
              overflowY: 'auto',
              overflowX: 'auto',
              minHeight: 0,
            }}
          >
            <table
              className="data-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8125rem',
                backgroundColor: '#ffffff',
                fontFamily: "'Roboto Condensed', sans-serif",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '2px solid #cbd5e1',
                    color: '#64748b',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <th style={{ padding: '8px 10px', width: '45px', textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '8px 10px', width: '120px', whiteSpace: 'nowrap' }}>MÃ VIỆC</th>
                  <th style={{ padding: '8px 10px' }}>CÔNG VIỆC VÀ DỰ ÁN</th>
                  <th style={{ padding: '8px 10px', width: '170px' }}>
                    {isScheduleStatusMode ? 'TÌNH TRẠNG TIẾN ĐỘ' : 'ĐƠN VỊ PHỤ TRÁCH'}
                  </th>
                  <th style={{ padding: '8px 10px', width: '125px' }}>TIẾN ĐỘ</th>
                  <th style={{ padding: '8px 10px', width: '95px' }}>HẠN CHÓT</th>
                  <th style={{ padding: '8px 10px', width: '130px' }}>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      Đang nạp dữ liệu công việc...
                    </td>
                  </tr>
                ) : paginatedContractGroups.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                      <ListTask size={48} style={{ color: '#cbd5e1', marginBottom: '14px' }} />
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                        Chưa có công việc nào trong cơ sở dữ liệu
                      </div>
                      <div style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                        Dữ liệu công việc thực tế sẽ được lưu trữ và hiển thị tại đây. Bấm nút bên dưới để khởi tạo công việc đầu tiên.
                      </div>
                      {allowAdd && !readOnly && (
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(true)}
                          style={{
                            padding: '8px 18px',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                          }}
                        >
                          <Plus size={16} />
                          <span>Thêm việc mới</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedContractGroups.map((group) => {
                    const isCollapsed = !!collapsedContracts[group.contractCode];
                    const groupPrefix = group.groupPrefix;
                    const displayCode = group.displayCode;

                    return (
                      <React.Fragment key={group.contractCode}>
                        {/* Hàng Tiêu đề Danh mục chính Hợp đồng / Gói thầu */}
                        <tr
                          onClick={() => {
                            setSelectedContractGroup(group);
                            setIsContractDrawerOpen(true);
                          }}
                          style={{
                            backgroundColor: '#f1f5f9',
                            borderTop: '2px solid #cbd5e1',
                            borderBottom: '1px solid #cbd5e1',
                            cursor: 'pointer',
                          }}
                          title={`Nhấn để xem chi tiết ${groupPrefix.toLowerCase()} ${displayCode}`}
                        >
                          <td colSpan={hideCategoryBadge ? 7 : 8} style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleContractCollapse(group.contractCode);
                                    }}
                                    title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s',
                                      padding: '2px',
                                      borderRadius: '4px',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <ChevronDown size={13} />
                                  </span>
                                  <span
                                    className="text-uppercase"
                                    style={{
                                      fontWeight: 800,
                                      fontSize: '0.8125rem',
                                      color: '#0f172a',
                                      letterSpacing: '0.02em',
                                    }}
                                  >
                                    {groupPrefix}: {displayCode}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                                    ({group.tasks.length} công việc con)
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px', paddingLeft: '21px' }}>
                                  <span style={{ fontWeight: 400, color: '#475569' }}>{group.customerName}</span>
                                  <span style={{ margin: '0 5px', color: '#94a3b8' }}>|</span>
                                  <span>{group.customerAddress}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Các dòng công việc con */}
                        {!isCollapsed &&
                          group.tasks.map((task, idx) => {
                            const dueInfo = getDueInfo(task);
                            const scheduleStatus = getTaskScheduleStatus(task);

                            // Phân giải tên và phòng ban người thực hiện
                            const assigneeInfo = formatAssigneeDisplay(task.assignee, task.department);

                            return (
                              <tr
                                key={task.id}
                                onClick={() => {
                                  setSelectedTask(task);
                                  setUpdatingProgress(task.progress);
                                  setIsDrawerOpen(true);
                                }}
                                style={{
                                  borderBottom: '1px solid #f1f5f9',
                                  transition: 'background-color 0.15s ease',
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                {/* Cột 1: STT */}
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>
                                  {idx + 1}
                                </td>

                                {/* Cột 2: MÃ VIỆC (không xuống dòng) và Ngày bắt đầu ở dưới */}
                                <td style={{ padding: '8px 10px', minWidth: '120px', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                    {task.code}
                                  </div>
                                  {task.startDate && (
                                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
                                      {task.startDate}
                                    </div>
                                  )}
                                </td>

                                {/* Cột 4: CÔNG VIỆC VÀ DỰ ÁN */}
                                <td style={{ padding: '8px 10px', maxWidth: '320px' }}>
                                  <div
                                    style={{
                                      color: '#1e293b',
                                      fontWeight: 400,
                                      lineHeight: 1.3,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      fontSize: '0.78rem',
                                    }}
                                    title={`${task.title}${task.code ? ` (${task.code})` : ''}`}
                                  >
                                    <span>{task.title}</span>
                                    {task.code && (
                                      <span style={{ color: '#0284c7', marginLeft: '6px', fontSize: '0.75rem' }}>
                                        ({task.code})
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Cột 5: ĐƠN VỊ PHỤ TRÁCH HOẶC TÌNH TRẠNG TIẾN ĐỘ */}
                                <td style={{ padding: '8px 10px', minWidth: '160px' }}>
                                  {isScheduleStatusMode ? (
                                    <div>
                                      {scheduleStatus === 'overdue' && (
                                        <span style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.78rem' }}>
                                          Đã quá hạn
                                        </span>
                                      )}
                                      {scheduleStatus === 'delayed' && (
                                        <span style={{ fontWeight: 600, color: '#d97706', fontSize: '0.78rem' }}>
                                          Chậm tiến độ
                                        </span>
                                      )}
                                      {scheduleStatus === 'on_track' && (
                                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>—</span>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                        {assigneeInfo.name}
                                      </div>
                                      {assigneeInfo.dept && (
                                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap' }}>
                                          {assigneeInfo.dept}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </td>

                                {/* Cột 6: TIẾN ĐỘ */}
                                <td style={{ padding: '8px 10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div
                                      style={{
                                        flex: 1,
                                        height: '5px',
                                        backgroundColor: '#f1f5f9',
                                        borderRadius: '9999px',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${task.progress}%`,
                                          height: '100%',
                                          backgroundColor:
                                            task.progress === 100
                                              ? '#10b981'
                                              : task.progress > 0
                                              ? '#3b82f6'
                                              : '#cbd5e1',
                                          borderRadius: '9999px',
                                        }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: task.progress === 100 ? '#10b981' : '#334155',
                                        minWidth: '30px',
                                        textAlign: 'right',
                                      }}
                                    >
                                      {task.progress}%
                                    </span>
                                  </div>
                                </td>

                                {/* Cột 7: HẠN CHÓT */}
                                <td style={{ padding: '8px 10px' }}>
                                  <div style={{ fontWeight: 700, color: dueInfo.color, fontSize: '0.75rem' }}>
                                    {dueInfo.dueLabel}
                                  </div>
                                  <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
                                    {dueInfo.subText}
                                  </div>
                                </td>

                                {/* Cột 8: TRẠNG THÁI (Chỉ hiển thị Quá hạn, Chậm tiến độ. Đúng tiến độ không cần hiển thị) */}
                                <td style={{ padding: '8px 10px', minWidth: '125px' }}>
                                  {scheduleStatus === 'overdue' ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: '#dc2626',
                                        backgroundColor: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                      Quá hạn
                                    </span>
                                  ) : scheduleStatus === 'delayed' ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: '#c2410c',
                                        backgroundColor: '#fff7ed',
                                        border: '1px solid #fed7aa',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f97316' }} />
                                      Chậm tiến độ
                                    </span>
                                  ) : null}
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
          </div>

          {/* Phân trang */}
          <div style={{ padding: '8px 16px 12px 16px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
            <Pagination
              currentPage={currentPage}
              totalItems={contractGroups.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          4. OFFCANVAS CHI TIẾT CÔNG VIỆC RỘNG 400PX
          ======================================================== */}
      <Offcanvas
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Chi tiết công việc cá nhân"
        description="Thông tin toàn diện và cập nhật tiến độ thực hiện"
        width="400px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            {!readOnly && selectedTask && (
              <button
                type="button"
                className="btn btn-outline-danger"
                disabled={isDeletingTask}
                onClick={() => handleDeleteSingleTask(selectedTask)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  border: '1px solid #fca5a5',
                  backgroundColor: '#fff1f2',
                  color: '#e11d48',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <Trash size={14} />
                <span>{isDeletingTask ? 'Đang xoá...' : 'Xoá việc này'}</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsDrawerOpen(false)}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontFamily: "'Roboto Condensed', sans-serif",
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedTask && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            {/* Header mã việc và trạng thái */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                  }}
                >
                  Mã công việc
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: getStatusDisplay(selectedTask).dotColor,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {getStatusDisplay(selectedTask).label}
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e40af' }}>
                {selectedTask.code}
              </div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginTop: '4px',
                  lineHeight: 1.35,
                }}
              >
                {selectedTask.title}
              </div>
            </div>

            {/* Thông tin Hợp đồng và Khách hàng */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
              }}
            >
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  marginBottom: '2px',
                }}
              >
                {selectedTask.category === 'bidding' ? 'Danh mục Gói thầu' : 'Danh mục Hợp đồng'}
              </div>
              <div
                className="text-uppercase"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                {selectedTask.contractCode ? (
                  <>
                    {selectedTask.category === 'bidding' ? 'GÓI THẦU' : 'HỢP ĐỒNG'}: {
                      selectedTask.category === 'bidding'
                        ? selectedTask.contractCode.replace(/^HĐ-/i, 'GT-').replace(/^HD-/i, 'GT-')
                        : selectedTask.contractCode
                    }
                  </>
                ) : (
                  <>DỰ ÁN / NHIỆM VỤ: {selectedTask.project || 'Nội bộ công ty'}</>
                )}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#334155',
                  marginTop: '4px',
                  lineHeight: 1.35,
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {selectedTask.customerName || selectedTask.project || 'Nội bộ công ty'}
                </div>
                {selectedTask.customerAddress && (
                  <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    {selectedTask.customerAddress}
                  </div>
                )}
              </div>
            </div>

            {/* Cập nhật tiến độ nhanh */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Cập nhật trạng thái */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                    Trạng thái công việc
                  </label>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: getStatusDisplay(selectedTask).dotColor }}>
                    • {getStatusDisplay(selectedTask).label}
                  </span>
                </div>
                <Select
                  disabled={readOnly}
                  value={selectedTask.status}
                  onChange={(e) => handleUpdateStatus(selectedTask, e.target.value)}
                  options={[
                    { value: 'not_started', label: 'Chưa thực hiện' },
                    { value: 'in_progress', label: 'Đang thực hiện' },
                    { value: 'completed', label: 'Đã hoàn thành' },
                    { value: 'paused', label: 'Tạm dừng' },
                    { value: 'cancelled', label: 'Huỷ bỏ' },
                  ]}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={13} style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                    Cập nhật tiến độ thực hiện
                  </span>
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#2563eb' }}>
                  {updatingProgress}%
                </span>
              </div>

              {!readOnly ? (
                <>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={updatingProgress}
                    onChange={(e) => setUpdatingProgress(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateProgress(selectedTask, updatingProgress)}
                      className="btn btn-primary"
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Lưu tiến độ
                    </button>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginTop: '4px',
                  }}
                >
                  <div
                    style={{
                      width: `${updatingProgress}%`,
                      height: '100%',
                      backgroundColor: '#2563eb',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Thông tin dự án và thời hạn */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
                  Ngày bắt đầu
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                  {selectedTask.startDate}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
                  Hạn hoàn thành
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                  {selectedTask.endDate}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
                  Dự án công trình
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                  {selectedTask.project}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
                  Đơn vị / Người phụ trách
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e40af' }}>
                  {(() => {
                    const info = formatAssigneeDisplay(selectedTask.assignee, selectedTask.department);
                    return info.dept ? `${info.name} | ${info.dept}` : info.name;
                  })()}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
                  Người giao nhiệm vụ
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                  {selectedTask.assigner || 'Ban Giám đốc'}
                </div>
              </div>
            </div>

            {/* Mô tả chi tiết */}
            <div
              style={{
                padding: '12px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#475569',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}
              >
                Mô tả chi tiết công việc
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#0f172a',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {selectedTask.description || 'Chưa có mô tả chi tiết cho công việc này.'}
              </div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ========================================================
          4B. OFFCANVAS CHI TIẾT HỢP ĐỒNG / GÓI THẦU RỘNG 400PX
          ======================================================== */}
      <Offcanvas
        isOpen={isContractDrawerOpen}
        onClose={() => setIsContractDrawerOpen(false)}
        title={selectedContractGroup?.isBidding ? 'Chi tiết gói thầu' : 'Chi tiết hợp đồng'}
        description={`Mã: ${selectedContractGroup?.displayCode || ''}`}
        width="400px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <button
              type="button"
              disabled={isDeletingContract}
              onClick={handleDeleteContract}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#dc2626',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                cursor: isDeletingContract ? 'not-allowed' : 'pointer',
                opacity: isDeletingContract ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isDeletingContract) e.currentTarget.style.backgroundColor = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                if (!isDeletingContract) e.currentTarget.style.backgroundColor = '#fef2f2';
              }}
            >
              <Trash size={14} />
              {isDeletingContract ? 'Đang xoá...' : 'Xoá'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsContractDrawerOpen(false)}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontFamily: "'Roboto Condensed', sans-serif",
              }}
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedContractGroup && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            {/* Header mã hợp đồng/gói thầu và tiến độ trung bình */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: 700,
                  }}
                >
                  {selectedContractGroup.groupPrefix}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#047857',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  Thi công & Trưng bày
                </span>
              </div>
              <div
                className="text-uppercase"
                style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}
              >
                {selectedContractGroup.displayCode}
              </div>

              {/* Thanh tiến độ trung bình */}
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Tiến độ tổng thể</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#2563eb' }}>
                    {selectedContractGroup.avgProgress}%
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, selectedContractGroup.avgProgress))}%`,
                      backgroundColor:
                        selectedContractGroup.avgProgress === 100
                          ? '#10b981'
                          : selectedContractGroup.avgProgress > 50
                          ? '#2563eb'
                          : '#f59e0b',
                      borderRadius: '999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Thông tin đối tác và Địa điểm */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Khách hàng / Đối tác</div>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedContractGroup.customerName}
                </div>
              </div>
              <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Địa chỉ / Công trình</div>
                <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '2px', lineHeight: 1.35 }}>
                  {selectedContractGroup.customerAddress}
                </div>
              </div>
              <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Thời hạn triển khai</div>
                <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '2px' }}>
                  {selectedContractGroup.earliestStart} → {selectedContractGroup.latestEnd}
                </div>
              </div>
            </div>

            {/* Danh sách các công việc con */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                  Danh sách công việc con ({selectedContractGroup.tasks.length})
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Nhấn để xem chi tiết việc</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedContractGroup.tasks.map((task) => {
                  const statusInfo = getStatusDisplay(task);
                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task);
                        setUpdatingProgress(task.progress || 0);
                        setIsDrawerOpen(true);
                      }}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>
                          {task.code}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: statusInfo.dotColor,
                            }}
                          />
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: statusInfo.dotColor }}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#1e293b',
                          marginTop: '3px',
                          lineHeight: 1.25,
                        }}
                      >
                        {task.title}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '4px',
                          fontSize: '0.68rem',
                          color: '#64748b',
                        }}
                      >
                        <span>
                          {(() => {
                            const info = formatAssigneeDisplay(task.assignee, task.department);
                            return info.dept ? `${info.name} | ${info.dept}` : info.name;
                          })()}
                        </span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{task.progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ========================================================
          5. MODAL TẠO CÔNG VIỆC MỚI
          ======================================================== */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                Giao việc mới và Theo dõi tiến độ
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateTask} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Tiêu đề công việc *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên nhiệm vụ cần thực hiện..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    boxSizing: 'border-box',
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Đơn vị hoặc Người phụ trách
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn Thành, Đội thi công Showroom..."
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    boxSizing: 'border-box',
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Dự án hoặc Hạng mục
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thi công quầy kệ & trưng bày showroom Seajong..."
                  value={newTaskProject}
                  onChange={(e) => setNewTaskProject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    boxSizing: 'border-box',
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Mã Hợp đồng (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 0261029-003/HDDL-SEAJONG"
                    value={newTaskContractCode}
                    onChange={(e) => setNewTaskContractCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      boxSizing: 'border-box',
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Khách hàng / Đại lý (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Cửa hàng thiết bị vệ sinh Hoàng Hải..."
                    value={newTaskCustomerName}
                    onChange={(e) => setNewTaskCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      boxSizing: 'border-box',
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={newTaskStartDate}
                    onChange={(e) => setNewTaskStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      boxSizing: 'border-box',
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Hạn hoàn thành
                  </label>
                  <input
                    type="date"
                    value={newTaskEndDate}
                    onChange={(e) => setNewTaskEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      boxSizing: 'border-box',
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Mức độ ưu tiên
                </label>
                <Select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  options={[
                    { value: 'urgent', label: 'Khẩn cấp' },
                    { value: 'high', label: 'Ưu tiên cao' },
                    { value: 'medium', label: 'Trung bình' },
                    { value: 'low', label: 'Thấp' },
                  ]}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Mô tả chi tiết công việc
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú nội dung yêu cầu, mục tiêu hoàn thành..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    boxSizing: 'border-box',
                    fontFamily: "'Roboto Condensed', sans-serif",
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Footer Modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  Tạo công việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Bí danh TaskManagementViewer cho TaskManagementView
export const TaskManagementViewer = TaskManagementView;
export type TaskManagementViewerProps = TaskManagementViewProps;
