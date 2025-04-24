// src/components/app-sidebar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, BarChart2, Users, Settings, HelpCircle, 
  LogOut, ChevronRight, Calendar, Tag, LayoutGrid, FileText,
  Puzzle, User, AlertCircle, Bell
} from 'lucide-react';
import { useLogout } from '../hooks/useLogout'; 
import { useAuthContext } from '../hooks/useAuthContext'; 
import { useSocket } from '../contexts/SocketContext';
import getInitials from '../utils/getInitials'; 

export function AppSidebar({ collapsed = false, setCollapsed }) {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  
  // Use actual auth context instead of hardcoded user
  const { user, isAdmin } = useAuthContext();
  const { logout } = useLogout();
  // Usando o hook useSocket como na versão editada
  const { isConnected, socket } = useSocket();
  
  // Monitorar mensagens não lidas via WebSocket
  useEffect(() => {
    // Se o usuário estiver autenticado e o socket estiver conectado
    if (user && isConnected && socket) {
      // Registrar para atualizações de mensagens não lidas
      setupSocketListeners();
      
      // Solicitar contagem inicial
      socket.emit('atendimentos:contar-nao-lidos');
      socket.emit('notificacoes:contar-nao-lidas');
    }
    
    function setupSocketListeners() {
      // Mensagens não lidas
      socket.on('atendimentos:nao-lidos', (data) => {
        setUnreadMessages(data.total || 0);
      });
      
      // Notificações
      socket.on('notificacoes:lista', (data) => {
        setNotifications(data.filter(n => !n.lida) || []);
      });
      
      socket.on('notificacao:nova', (notificacao) => {
        setNotifications(prev => [notificacao, ...prev]);
      });
    }
    
    return () => {
      // Limpar listeners ao desmontar
      if (isConnected && socket) {
        socket.off('atendimentos:nao-lidos');
        socket.off('notificacoes:lista');
        socket.off('notificacao:nova');
      }
    };
  }, [user, isConnected, socket]);
  
  // Handle logout function
  const handleLogout = () => {
    // Não precisamos desconectar o socket manualmente, o hook já cuida disso
    logout();
  };
  
  // Itens de navegação principal
  const mainNavItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard', path: '/' },
    { id: 'conversations', icon: MessageCircle, label: 'Conversas', path: '/conversations', badge: unreadMessages > 0 ? unreadMessages : null },
    { id: 'analytics', icon: BarChart2, label: 'Análise', path: '/analytics' },
    { id: 'contacts', icon: Users, label: 'Contatos', path: '/contacts' },
    { id: 'templates', icon: FileText, label: 'Templates', path: '/templates' },
    { id: 'calendar', icon: Calendar, label: 'Agenda', path: '/calendar' },
  ];
  
  // Itens de navegação de administração
  const adminNavItems = [
    { id: 'settings', icon: Settings, label: 'Configurações', path: '/settings' },
    { id: 'help', icon: HelpCircle, label: 'Ajuda', path: '/help' },
  ];
  
  // Itens adicionais para administradores
  const adminExtraItems = [
    { id: 'admin-setores', icon: Puzzle, label: 'Setores', path: '/admin/setores' },
    { id: 'admin-usuarios', icon: User, label: 'Usuários', path: '/admin/usuarios' },
  ];
  
  // Verificar se um item está ativo
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Function to get user initials if getInitials utility is not available
  const getUserInitials = (name) => {
    if (typeof getInitials === 'function') {
      return getInitials(name);
    }
    // Fallback implementation
    if (!name) return "";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  return (
    <div 
      ref={sidebarRef}
      className="h-full flex flex-col bg-[#0c0b14] border-r border-[#1e1d2b] relative"
    >
      {/* Logo Section */}
      <div className={`flex items-center py-6 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center shadow-md shadow-green-900/30">
            <MessageCircle className="text-white h-5 w-5" />
          </div>
          
          {!collapsed && (
            <span className="ml-3 text-green-500 text-lg font-semibold">
              WhatsApp CRM
            </span>
          )}
        </div>
      </div>
      
      {/* Status de conexão - Adicionado da versão editada */}
      <div className={`mx-3 mb-4 ${collapsed ? 'flex justify-center' : 'px-3'}`}>
        <div className={`flex ${collapsed ? 'flex-col' : 'items-center'} gap-2`}>
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {!collapsed && <span className="text-xs text-gray-400">{isConnected ? 'Conectado' : 'Desconectado'}</span>}
        </div>
      </div>
      
      {/* User Profile */}
      <div className={`mx-3 mb-6 flex items-center rounded-lg bg-[#1e1d2b] p-3 ${collapsed ? 'justify-center' : ''}`}>
        <div 
          className="relative"
          onMouseEnter={() => setActiveTooltip('user')}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center">
            <span className="text-white font-medium">{getUserInitials(user?.displayName)}</span>
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#1e1d2b]"></div>
          
          {/* User Tooltip for collapsed mode */}
          {collapsed && activeTooltip === 'user' && (
            <div className="absolute left-full ml-2 z-50 bg-[#1e1d2b] text-white text-xs rounded-md p-2 shadow-lg min-w-[160px] border border-[#32304a] animate-fadeIn">
              <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-[#1e1d2b] border-b-[6px] border-b-transparent"></div>
              <p className="font-semibold">{user?.displayName || "Usuário"}</p>
              <p className="text-green-400 text-xs mt-0.5">{user?.email || "Carregando..."}</p>
              {isAdmin && (
                <p className="mt-1 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full inline-block">
                  Administrador
                </p>
              )}
            </div>
          )}
        </div>
        
        {!collapsed && (
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-white font-medium truncate">{user?.displayName || "Usuário"}</p>
            <p className="text-green-400 text-xs truncate">{user?.email || "Carregando..."}</p>
            {isAdmin && (
              <p className="mt-1 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full inline-block">
                Administrador
              </p>
            )}
          </div>
        )}
        
        {!collapsed && (
          <button 
            onClick={() => navigate('/settings/profile')}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#32304a] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Main Navigation */}
      <div className="flex-1 px-3 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {mainNavItems.map((item) => {
            const active = isActive(item.path);
            
            return (
              <li key={item.id}
                onMouseEnter={() => setActiveTooltip(item.id)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                {/* Button style based on active state */}
                <button 
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center relative py-2.5 rounded-md transition-all duration-200 ease-in-out 
                  ${active 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-[#1e1d2b]'} 
                  ${collapsed ? 'justify-center px-2' : 'px-3'}`}
                >
                  <div className="flex-shrink-0">
                    <item.icon className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
                  </div>
                  
                  {!collapsed && <span className="ml-3">{item.label}</span>}
                  
                  {/* Badge indicator */}
                  {item.badge && (
                    <span className={`${collapsed ? 'absolute top-0 right-0' : 'ml-auto'} 
                      bg-green-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full
                      ${active && 'bg-white text-green-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
                
                {/* Tooltip for collapsed mode */}
                {collapsed && activeTooltip === item.id && (
                  <div className="absolute left-full ml-2 z-50 bg-[#1e1d2b] text-white text-xs rounded-md py-1 px-2 shadow-lg whitespace-nowrap border border-[#32304a] animate-fadeIn">
                    <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-[#1e1d2b] border-b-[6px] border-b-transparent"></div>
                    {item.label}
                    {item.badge && (
                      <span className="ml-1.5 bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        
        {/* Admin Section Header */}
        {!collapsed && (
          <div className="mt-6 mb-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Administração
          </div>
        )}
        
        {/* Admin Navigation */}
        <ul className={`space-y-1 ${collapsed ? 'mt-6' : 'mt-0'}`}>
          {/* Regular admin items */}
          {adminNavItems.map((item) => {
            const active = isActive(item.path);
            
            return (
              <li key={item.id}
                onMouseEnter={() => setActiveTooltip(item.id)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button 
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center py-2.5 rounded-md transition-all duration-200 ease-in-out 
                  ${active 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-[#1e1d2b]'} 
                  ${collapsed ? 'justify-center px-2' : 'px-3'}`}
                >
                  <div className="flex-shrink-0">
                    <item.icon className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
                  </div>
                  
                  {!collapsed && <span className="ml-3">{item.label}</span>}
                </button>
                
                {/* Tooltip for collapsed mode */}
                {collapsed && activeTooltip === item.id && (
                  <div className="absolute left-full ml-2 z-50 bg-[#1e1d2b] text-white text-xs rounded-md py-1 px-2 shadow-lg whitespace-nowrap border border-[#32304a] animate-fadeIn">
                    <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-[#1e1d2b] border-b-[6px] border-b-transparent"></div>
                    {item.label}
                  </div>
                )}
              </li>
            );
          })}
          
          {/* Admin-only items */}
          {isAdmin && adminExtraItems.map((item) => {
            const active = isActive(item.path);
            
            return (
              <li key={item.id}
                onMouseEnter={() => setActiveTooltip(item.id)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button 
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center py-2.5 rounded-md transition-all duration-200 ease-in-out 
                  ${active 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-[#1e1d2b]'} 
                  ${collapsed ? 'justify-center px-2' : 'px-3'}`}
                >
                  <div className="flex-shrink-0">
                    <item.icon className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
                  </div>
                  
                  {!collapsed && <span className="ml-3">{item.label}</span>}
                </button>
                
                {/* Tooltip for collapsed mode */}
                {collapsed && activeTooltip === item.id && (
                  <div className="absolute left-full ml-2 z-50 bg-[#1e1d2b] text-white text-xs rounded-md py-1 px-2 shadow-lg whitespace-nowrap border border-[#32304a] animate-fadeIn">
                    <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-[#1e1d2b] border-b-[6px] border-b-transparent"></div>
                    {item.label}
                  </div>
                )}
              </li>
            );
          })}
          
          {/* Notificações */}
          <li
            onMouseEnter={() => setActiveTooltip('notifications')}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <button 
              onClick={() => navigate('/notifications')}
              className={`w-full flex items-center py-2.5 rounded-md transition-all duration-200 ease-in-out 
              ${isActive('/notifications') 
                ? 'bg-green-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-[#1e1d2b]'} 
              ${collapsed ? 'justify-center px-2' : 'px-3'} relative`}
            >
              <div className="flex-shrink-0">
                <Bell className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
              </div>
              
              {!collapsed && <span className="ml-3">Notificações</span>}
              
              {/* Badge para notificações */}
              {notifications.length > 0 && (
                <span className={`${collapsed ? 'absolute top-0 right-0' : 'ml-auto'} 
                  bg-red-500 text-white text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full`}>
                  {notifications.length}
                </span>
              )}
            </button>
            
            {/* Tooltip for collapsed mode */}
            {collapsed && activeTooltip === 'notifications' && (
              <div className="absolute left-full ml-2 z-50 bg-[#1e1d2b] text-white text-xs rounded-md py-1 px-2 shadow-lg whitespace-nowrap border border-[#32304a] animate-fadeIn">
                <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-[#1e1d2b] border-b-[6px] border-b-transparent"></div>
                Notificações
                {notifications.length > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </div>
            )}
          </li>
        </ul>
      </div>
      
      {/* Status and Logout */}
      <div className="mt-auto pt-2 pb-3 border-t border-[#1e1d2b]">
        {/* Status indicator - Usando o estado do useSocket */}
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="ml-2 text-xs text-green-400">
                {isConnected ? 'Online - Todas Contas Conectadas' : 'Desconectado - Verificando conexão'}
              </span>
            </div>
          </div>
        )}
        
        {/* Logout button */}
        <div className="px-3 mt-1">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center py-2.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 ease-in-out 
            ${collapsed ? 'justify-center px-2' : 'px-3'}`}
            onMouseEnter={() => setActiveTooltip('logout')}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <div className="flex-shrink-0">
              <LogOut className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
            </div>
            
            {!collapsed && <span className="ml-3">Sair</span>}
            
            {/* Tooltip for collapsed mode */}
            {collapsed && activeTooltip === 'logout' && (
              <div className="absolute left-full ml-2 z-50 bg-[#1e1d2b] text-red-400 text-xs rounded-md py-1 px-2 shadow-lg whitespace-nowrap border border-[#32304a] animate-fadeIn">
                <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-[#1e1d2b] border-b-[6px] border-b-transparent"></div>
                Sair
              </div>
            )}
          </button>
        </div>
      </div>
      
      {/* CSS for animations */}
      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        
        /* Custom scrollbar styling */
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.2);
          border-radius: 9999px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(75, 85, 99, 0.3);
        }
        
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: rgba(75, 85, 99, 0.2) transparent;
        }
      `}</style>
    </div>
  );
}