import React from 'react';
import { MeetingNotebookPage } from '../../pages/common/MeetingNotebookPage';

export interface JournalEntry {
  id: string;
  title: string;
  content?: string;
  date?: string;
}

export interface NotebookViewProps {
  department?: string;
  departmentName?: string;
  storageKey?: string;
  initialEntries?: JournalEntry[];
  onShowToast?: (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const NotebookView: React.FC<NotebookViewProps> = ({ department = 'board' }) => {
  return <MeetingNotebookPage deptCode={department} />;
};

export const SalesJournalView = NotebookView;
export default NotebookView;
