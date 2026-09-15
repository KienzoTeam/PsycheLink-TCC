import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute: React.FC = () => {
  const token = localStorage.getItem('@app:token');

  // Redireciona para /login caso o token não exista
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};