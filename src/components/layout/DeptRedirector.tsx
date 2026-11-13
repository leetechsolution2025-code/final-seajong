import React, { useEffect } from 'react';
import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import { useDepartment } from '../../context/DepartmentContext';

export const DeptRedirector: React.FC = () => {
  const { deptCode, menuKey } = useParams<{ deptCode: string; menuKey?: string }>();
  const [searchParams] = useSearchParams();
  const { setActiveDeptCode, setActiveMenuKey } = useDepartment();

  useEffect(() => {
    const targetDept = deptCode || searchParams.get('dept');
    const targetMenu = menuKey || searchParams.get('menu');

    if (targetDept) {
      setActiveDeptCode(targetDept);
    }
    if (targetMenu) {
      setActiveMenuKey(targetMenu);
    }
  }, [deptCode, menuKey, searchParams, setActiveDeptCode, setActiveMenuKey]);

  return <Navigate to="/" replace />;
};

export default DeptRedirector;
