import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// Corrigindo a extensão do arquivo para .jsx em vez de .js
import { RequireAuth, RequireAdmin } from '../middlewares/authMiddleware.jsx';

// Páginas de autenticação
import Login from '../pages/Login/Login';
import Signup from '../pages/Signup/Signup';
import Unauthorized from '../pages/Error/Unauthorized';

// Páginas de usuário
import ConversationsPage from '../pages/Conversations/ConversationsPage';
import ConversationDetail from '../pages/Conversations/ConversationDetail';
import AnalyticsPage from '../pages/Analytics/AnalyticsPage';
import UserProfile from '../pages/Profile/UserProfile';

// Páginas de administração
import AdminDashboard from '../pages/Admin/AdminDashboard';
import SectorManagement from '../pages/Admin/SectorManagement';
import UserManagement from '../pages/Admin/UserManagement';
import AdminAnalytics from '../pages/Admin/AdminAnalytics';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Rotas protegidas (requer autenticação) */}
      <Route path="/" element={<RequireAuth><Navigate to="/conversations" replace /></RequireAuth>} />
      <Route path="/conversations" element={<RequireAuth><ConversationsPage /></RequireAuth>} />
      <Route path="/conversations/:id" element={<RequireAuth><ConversationDetail /></RequireAuth>} />
      <Route path="/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><UserProfile /></RequireAuth>} />
      
      {/* Rotas de administração (requer papel de admin) */}
      <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
      <Route path="/admin/sectors" element={<RequireAdmin><SectorManagement /></RequireAdmin>} />
      <Route path="/admin/users" element={<RequireAdmin><UserManagement /></RequireAdmin>} />
      <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
      
      {/* Rota padrão - redirecionar para conversas */}
      <Route path="*" element={<Navigate to="/conversations" replace />} />
    </Routes>
  );
};

export default AppRoutes;