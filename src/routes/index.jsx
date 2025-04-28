import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from '../contexts/SocketContext';

// Páginas
import AnalyticsPage from '../pages/AnalyticsPage';
import ConversationsPage from '../pages/ConversationsPage';
import NotificationsPage from '../pages/NotificationsPage';
import SettingsPage from '../pages/SettingsPage';
import HelpPage from '../pages/HelpPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProfilePage from '../pages/ProfilePage';
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

// Layouts
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';

// Proteção de rota
import ProtectedRoute from './ProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rotas autenticadas */}
      <Route element={<ProtectedRoute />}>
        <Route element={
          <SocketProvider>
            <AppLayout />
          </SocketProvider>
        }>
          <Route path="/" element={<Navigate to="/conversations" replace />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
      </Route>

      {/* Rotas de autenticação */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Rota 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;