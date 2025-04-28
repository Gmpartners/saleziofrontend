import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Se ainda estiver carregando, não redirecione
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  // Se não estiver autenticado, redirecione para login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se estiver autenticado, renderize os componentes filhos
  return <Outlet />;
};

export default ProtectedRoute;