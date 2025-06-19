import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#0c0b14]">
    <div className="animate-spin w-8 h-8 border-4 border-t-transparent border-green-500 rounded-full"></div>
  </div>
);

export const RequireAuth = ({ children }) => {
  const { user, authIsReady } = useAuthContext();
  const location = useLocation();
  
  if (!authIsReady) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    // Verificar se já estamos na página de login para evitar loops de redirecionamento
    if (location.pathname === '/login') {
      return null; // Não redirecionar se já estamos na página de login
    }
    
    // Redirecionar para login, preservando a localização de onde veio
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Verificar se estamos em uma rota de autenticação enquanto já estamos autenticados
  if (location.pathname === '/login' || location.pathname === '/signup') {
    // Redirecionar para a página principal se já estiver autenticado
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export const RequireAdmin = ({ children }) => {
  const { user, userProfile, isAdmin, authIsReady } = useAuthContext();
  const location = useLocation();
  
  if (!authIsReady) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    // Redirecionar para login, preservando a localização de onde veio
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se o usuário tem papel de admin
  if (!isAdmin) {
    console.warn("Acesso não autorizado. Perfil:", userProfile);
    
    // Redirecionar para página não autorizada
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

export const RequireSector = ({ children, sectorId }) => {
  const { user, userProfile, isAdmin, authIsReady } = useAuthContext();
  const location = useLocation();
  
  if (!authIsReady) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Administradores têm acesso a todos os setores
  if (isAdmin) {
    return children;
  }
  
  // Verificar se o usuário pertence ao setor especificado
  if (userProfile?.sector !== sectorId) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};