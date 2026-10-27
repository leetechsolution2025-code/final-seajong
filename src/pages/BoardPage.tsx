import React from 'react';
import { StandardPage } from '../components/layout/StandardPage';
import { BomOverviewView } from './departments/bom/BomOverviewView';

export interface BoardPageProps {
  onNavigate?: (navId: string) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const BoardPage: React.FC<BoardPageProps> = ({ onNavigate, onShowToast }) => {
  return (
    <StandardPage
      title="Ban Giám đốc"
      description="Trung tâm điều hành và giám sát toàn diện hoạt động sản xuất kinh doanh"
      icon="bi-building"
      color="violet"
      tickerContext="board"
      cardPadding="p-0"
    >
      <BomOverviewView onNavigate={onNavigate} onShowToast={onShowToast} />
    </StandardPage>
  );
};

export default BoardPage;
