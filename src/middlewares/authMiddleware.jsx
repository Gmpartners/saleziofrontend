import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';

// Componente de tela de carregamento
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#0c0b14]">
    <div className="animate-spin w-8 h-8 border-4 border-t-transparent border-green-500 rounded-full"></div>
  </div>
);

// Middleware para rotas protegidas (requer autenticação)
export const RequireAuth = ({ children }) => {
  const { user, authIsReady } = useAuthContext();
  const location = useLocation();
  
  if (!authIsReady) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    // Redirecionar para login, preservando a localização de onde veio
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

// Middleware para rotas de admin (requer autenticação e papel de admin)
export const RequireAdmin = ({ children }) => {
  const { user, userProfile, authIsReady } = useAuthContext();
  const location = useLocation();
  
  if (!authIsReady) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    // Redirecionar para login, preservando a localização de onde veio
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Verificar se o usuário tem papel de admin
  if (userProfile?.role !== 'admin') {
    // Redirecionar para página não autorizada
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

// Middleware para rotas de setor (requer autenticação e setor específico)
export const RequireSector = ({ children, sectorId }) => {
  const { user, userProfile, authIsReady } = useAuthContext();
  const location = useLocation();
  
  if (!authIsReady) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Administradores têm acesso a todos os setores
  if (userProfile?.role === 'admin') {
    return children;
  }
  
  // Verificar se o usuário pertence ao setor especificado
  if (userProfile?.sector !== sectorId) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};