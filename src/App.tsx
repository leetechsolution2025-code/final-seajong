import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardView } from './components/layout/DashboardView';
import { DeptRedirector } from './components/layout/DeptRedirector';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<DashboardView />} />
        <Route path="/:deptCode" element={<DeptRedirector />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
