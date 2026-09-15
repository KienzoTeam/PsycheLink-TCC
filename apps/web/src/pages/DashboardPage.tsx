import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const DashboardPage: React.FC = () => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto flex justify-between items-center border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-sm font-medium rounded-lg transition-colors"
        >
          Sair
        </button>
      </div>
      <div className="mt-8">
        <p className="text-lg">Bem-vindo, {user?.nome || 'Usuário'}!</p>
      </div>
    </div>
  );
};