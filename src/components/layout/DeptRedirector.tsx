import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useDepartment } from '../../context/DepartmentContext';

export const DeptRedirector: React.FC = () => {
  const { deptCode } = useParams<{ deptCode: string }>();
  const { setActiveDeptCode } = useDepartment();

  useEffect(() => {
    if (deptCode) {
      setActiveDeptCode(deptCode);
    }
  }, [deptCode, setActiveDeptCode]);

  return <Navigate to="/" replace />;
};

export default DeptRedirector;
