import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/editor" replace />;
  }

  return <>{children}</>;
};