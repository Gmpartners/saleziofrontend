import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RequireAdmin } from '../middlewares/authMiddleware.jsx';

// Páginas de autenticação
import Login from '../pages/Login/Login';
import Signup from '../pages/Signup/Signup';

// Páginas de erro
import Unauthorized from '../pages/Error/Unauthorized';
import NotFoundPage from '../pages/Error/NotFoundPage';

// Páginas de funcionários
import EmployeeConversationsView from '../pages/Conversations/EmployeeConversationsView';
import EmployeeConversationDetail from '../pages/Conversations/EmployeeConversationDetail';

import AnalyticsPage from '../pages/Analytics/AnalyticsPage';

import NotificationsPage from '../pages/Notifications/NotificationsPage';

import HelpPage from '../pages/Help/HelpPage';

// Páginas de administração
import SectorFlow from '../pages/admin/Sectors/SectorFlow.jsx';

import AdminAnalytics from '../pages/admin/AdminAnalytics';
import FlowOrchestratorPage from '../pages/admin/FlowOrchestratorPage.jsx';
import AdminConversationsView from '../pages/Admin/AdminConversationsView.jsx';
import AdminConversationDetail from '../pages/Admin/AdminConversationDetail.jsx';
import UserManagement from '../pages/Admin/UserManagement.jsx';

// Componente de migração


const AppRoutes = () => {
  return (
    <Routes>
      {/* Rotas públicas - essas rotas são acessíveis mesmo sem autenticação */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/not-found" element={<NotFoundPage />} />
      
      {/* Rota raiz redireciona para login se não autenticado ou para conversas se autenticado */}
      <Route path="/" element={<RequireAuth><Navigate to="/conversations" replace /></RequireAuth>} />
      
      {/* Rotas de funcionários */}
      <Route path="/conversations" element={<RequireAuth><EmployeeConversationsView /></RequireAuth>} />
      <Route path="/conversations/:conversationId" element={<RequireAuth><EmployeeConversationDetail /></RequireAuth>} />
      
      {/* Analytics */}
      <Route path="/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
      
      {/* Notificações */}
      <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
      

      
      {/* Rotas de administração (requer papel de admin) */}
      <Route path="/admin/conversations" element={<RequireAdmin><AdminConversationsView /></RequireAdmin>} />
      <Route path="/admin/conversations/:conversationId" element={<RequireAdmin><AdminConversationDetail /></RequireAdmin>} />
      <Route path="/admin/sectors" element={<RequireAdmin><SectorFlow /></RequireAdmin>} />
      <Route path="/admin/users" element={<RequireAdmin><UserManagement /></RequireAdmin>} />
      <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
      <Route path="/admin/flow-orchestrator" element={<RequireAdmin><FlowOrchestratorPage /></RequireAdmin>} />

      
      {/* Rota padrão - redirecionar para página não encontrada */}
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
};

export default AppRoutes;