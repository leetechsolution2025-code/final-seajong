import React from 'react';

// ── TYPES VÀ INTERFACES CHO PLANNER & EVENT CALENDAR ──────────────────────────
export type PlannerItemType = 'task' | 'event';
export type PlannerPriority = 'urgent' | 'high' | 'medium' | 'low';
export type PlannerStatus = 'todo' | 'in_progress' | 'waiting' | 'done';
export type PlannerCategory = string;
export type PlannerViewMode = 'day' | 'planner' | 'kanban' | 'list';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface PlannerItem {
  id: string;
  title: string;
  location?: string; // Địa điểm sự kiện
  description?: string;
  type: PlannerItemType;
  date?: string; // YYYY-MM-DD (nếu undefined -> nằm trong Hàng chờ)
  endDate?: string; // YYYY-MM-DD (cho sự kiện kéo dài nhiều ngày / đi công tác)
  timeStart?: string; // HH:mm
  timeEnd?: string; // HH:mm
  isAllDay?: boolean; // Sự kiện cả ngày
  reminderMinutes?: number; // Số phút nhắc việc trước sự kiện (mặc định: 15)
  disableReminder?: boolean; // Hủy nhắc việc (true nếu người dùng tắt nhắc việc)
  estimatedMinutes?: number; // Phút dự kiến hoàn thành
  actualMinutes?: number;
  status: PlannerStatus;
  priority: PlannerPriority;
  category: PlannerCategory;
  assigneeName: string;
  customerName?: string;
  projectName?: string;
  checklist?: ChecklistItem[];
  deadline?: string; // YYYY-MM-DD
  createdAt: string;
}

export interface TodoListCategoryConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon?: React.ReactNode;
}

// ── CẤU HÌNH MẶC ĐỊNH CHO DANH MỤC PLANNER ──────────────────────────────────
export const DEFAULT_PLANNER_CATEGORIES: Record<string, TodoListCategoryConfig> = {
  crm: {
    label: 'CRM & Khách hàng',
    color: '#4f46e5',
    bg: 'rgba(79, 70, 229, 0.08)',
    border: 'rgba(79, 70, 229, 0.25)',
  },
  meeting: {
    label: 'Cuộc họp & Hội thảo',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.08)',
    border: 'rgba(2, 132, 199, 0.25)',
  },
  marketing: {
    label: 'Marketing & Sự kiện',
    color: '#e11d48',
    bg: 'rgba(225, 29, 72, 0.08)',
    border: 'rgba(225, 29, 72, 0.25)',
  },
  general: {
    label: 'Công việc chung',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.25)',
  },
};
