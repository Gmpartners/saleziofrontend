// components/app-sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  MessageSquare, BarChart2, Users, Settings, 
  LogOut, Bell, HelpCircle, UserCircle,
  Briefcase, LayoutDashboard, Shield
} from 'lucide-react';

import { useAuthContext } from '../hooks/useAuthContext';

export const AppSidebar = ({ collapsed, setCollapsed, closeSidebar }) => {
  const location = useLocation();
  const { logout, user, userProfile, isAdmin, userSector, userSectorName } = useAuthContext();
  
  // Itens de navegação para todos os usuários
  const commonNavItems = [
    { 
      name: 'Conversas', 
      path: '/conversations', 
      icon: <MessageSquare className="h-5 w-5" />,
      active: location.pathname === '/conversations' || location.pathname.startsWith('/conversations/')
    },
    { 
      name: 'Análise', 
      path: '/analytics', 
      icon: <BarChart2 className="h-5 w-5" />,
      active: location.pathname === '/analytics'
    },
    { 
      name: 'Notificações', 
      path: '/notifications', 
      icon: <Bell className="h-5 w-5" />,
      active: location.pathname === '/notifications'
    }
  ];
  
  // Itens de navegação para administradores
  const adminNavItems = [
    { 
      name: 'Painel Admin', 
      path: '/admin', 
      icon: <LayoutDashboard className="h-5 w-5" />,
      active: location.pathname === '/admin',
      adminOnly: true
    },
    { 
      name: 'Usuários', 
      path: '/admin/users', 
      icon: <Users className="h-5 w-5" />,
      active: location.pathname === '/admin/users',
      adminOnly: true
    },
    { 
      name: 'Setores', 
      path: '/admin/sectors', 
      icon: <Briefcase className="h-5 w-5" />,
      active: location.pathname === '/admin/sectors',
      adminOnly: true
    },
    { 
      name: 'Estatísticas', 
      path: '/admin/analytics', 
      icon: <BarChart2 className="h-5 w-5" />,
      active: location.pathname === '/admin/analytics',
      adminOnly: true
    }
  ];
  
  // Combinar os itens com base no papel do usuário
  const navItems = isAdmin 
    ? [...commonNavItems, ...adminNavItems]
    : commonNavItems;
  
  // Itens de configurações (rodapé)
  const settingsItems = [
    { 
      name: 'Configurações', 
      path: '/profile', 
      icon: <Settings className="h-5 w-5" />, 
      active: location.pathname === '/profile'
    },
    { 
      name: 'Ajuda', 
      path: '/help', 
      icon: <HelpCircle className="h-5 w-5" />,
      active: location.pathname === '/help'
    }
  ];
  
  // Dados do usuário para exibição
  const displayName = userProfile?.displayName || user?.displayName || user?.email || 'Usuário';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  
  // Função de logout
  const handleLogout = () => {
    logout();
  };
  
  return (
    <div className="flex flex-col h-full bg-[#1e1d2b] border-r border-[#32304a] overflow-hidden">
      {/* Header/Logo */}
      <div className="p-4 border-b border-[#32304a] flex items-center justify-center h-16">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-md bg-green-600 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <h1 className="text-white text-lg font-bold ml-3">MultiFlow</h1>
          )}
        </div>
      </div>
      
      {/* Informações do usuário */}
      <div className="mt-4 px-3">
        <div className={`flex ${collapsed ? 'justify-center' : 'items-center'} mb-2`}>
          <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-medium">
            {initials || <UserCircle className="h-6 w-6" />}
          </div>
          
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="text-white font-medium truncate" title={displayName}>
                {displayName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {isAdmin ? (
                  <span className="flex items-center text-purple-400">
                    <Shield className="h-3 w-3 mr-1" />
                    Administrador
                  </span>
                ) : (
                  <span className="text-blue-400">Atendente</span>
                )}
              </p>
            </div>
          )}
        </div>
        
        {/* Exibir setor (se não for admin e não estiver colapsado) */}
        {!isAdmin && userSectorName && !collapsed && (
          <div className="px-2 py-1 bg-blue-600/10 text-blue-400 rounded-lg text-xs mb-4 flex items-center">
            <Briefcase className="h-3 w-3 mr-1" />
            <span className="truncate">{userSectorName}</span>
          </div>
        )}
      </div>
      
      {/* Menu de navegação */}
      <div className="px-3 py-4 flex-1 overflow-y-auto scrollbar-thin">
        <nav>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={`flex items-center ${collapsed ? 'justify-center p-2' : 'px-3 py-2'} rounded-lg transition-colors ${
                    item.active 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-400 hover:bg-[#32304a] hover:text-white'
                  }`}
                  onClick={closeSidebar}
                >
                  {item.icon}
                  {!collapsed && <span className="ml-3">{item.name}</span>}
                  
                  {/* Indicador de admin */}
                  {!collapsed && item.adminOnly && (
                    <span className="ml-auto bg-purple-500/20 text-purple-400 text-xs px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          
          {/* Divisor */}
          <div className="my-4 border-t border-[#32304a]"></div>
          
          {/* Menu secundário */}
          <ul className="space-y-1">
            {settingsItems.map((item) => (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={`flex items-center ${collapsed ? 'justify-center p-2' : 'px-3 py-2'} rounded-lg transition-colors ${
                    item.active 
                      ? 'bg-[#32304a] text-white' 
                      : 'text-gray-400 hover:bg-[#32304a] hover:text-white'
                  }`}
                  onClick={closeSidebar}
                >
                  {item.icon}
                  {!collapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      {/* Footer / Botão de Logout */}
      <div className="p-3 border-t border-[#32304a]">
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center p-2' : 'px-3 py-2'} rounded-lg text-gray-400 hover:bg-[#32304a] hover:text-white transition-colors`}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="ml-3">Sair</span>}
        </button>
      </div>
    </div>
  );
};