// app-sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  MessageSquare, BarChart3, Bell, Settings, 
  HelpCircle, LogOut, ChevronRight, User
} from 'lucide-react';
import { useAuthContext } from '../hooks/useAuthContext';
import { motion } from 'framer-motion';

// Importar componentes do shadcn/ui
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

export const AppSidebar = ({ collapsed, setCollapsed, closeSidebar }) => {
  const { userProfile, logout, isAdmin } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [initials, setInitials] = useState('');

  // Calcular iniciais do nome de usuário
  useEffect(() => {
    if (userProfile?.displayName) {
      const nameParts = userProfile.displayName.split(' ');
      const firstInitial = nameParts[0] ? nameParts[0][0] : '';
      const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '';
      setInitials((firstInitial + lastInitial).toUpperCase());
    }
  }, [userProfile]);

  // Navegação de menu
  const handleNavigation = (path) => {
    navigate(path);
    closeSidebar();
  };

  // Definir itens do menu para usuários normais
  const regularUserItems = [
    { 
      id: 'conversations', 
      icon: <MessageSquare className="w-5 h-5" />, 
      label: 'Conversas', 
      path: '/conversations',
      active: location.pathname.includes('/conversations')
    },
    { 
      id: 'analytics', 
      icon: <BarChart3 className="w-5 h-5" />, 
      label: 'Análise', 
      path: '/analytics',
      active: location.pathname === '/analytics'
    },
    { 
      id: 'notifications', 
      icon: <Bell className="w-5 h-5" />, 
      label: 'Notificações', 
      path: '/notifications',
      active: location.pathname === '/notifications'
    },
    { 
      id: 'settings', 
      icon: <Settings className="w-5 h-5" />, 
      label: 'Configurações', 
      path: '/settings',
      active: location.pathname === '/settings'
    },
    { 
      id: 'help', 
      icon: <HelpCircle className="w-5 h-5" />, 
      label: 'Ajuda', 
      path: '/help',
      active: location.pathname === '/help'
    }
  ];

  // Itens administrativos adicionais
  const adminItems = [
    // Adicionar aqui itens administrativos se necessário
  ];

  // Determinar quais itens de menu mostrar
  const menuItems = isAdmin ? [...regularUserItems, ...adminItems] : regularUserItems;

  return (
    <div className="h-full flex flex-col bg-[#070b11] border-r border-[#1f2937]/40 shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-[#1f2937]/40">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 bg-gradient-to-br from-[#10b981] to-[#059669] p-2 rounded-lg shadow-md">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#10b981] to-[#059669]"
            >
              MultiFlow
            </motion.h1>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div 
        className={`mt-4 mx-3 p-3 rounded-lg transition-all duration-300 ${collapsed ? "justify-center" : ""} 
        flex items-center gap-3 bg-[#0f1621] border border-[#1f2937]/40 hover:bg-[#101820] cursor-pointer`}
      >
        <Avatar className="border-2 border-[#10b981]/30 h-10 w-10 shadow-md">
          <AvatarImage src={userProfile?.photoURL} />
          <AvatarFallback className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <p className="text-sm font-medium text-white truncate">
              {userProfile?.displayName || 'Usuário'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="success" className="px-2 py-0.5 text-xs">
                Atendente
              </Badge>
              {userProfile?.sector && (
                <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md text-xs">
                  {userProfile.sector}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <nav className="mt-5 flex-1 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <TooltipProvider key={item.id} delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <li 
                    onClick={() => handleNavigation(item.path)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
                      transition-all duration-200 group
                      ${item.active 
                        ? 'bg-[#10b981]/10 text-[#10b981]' 
                        : 'text-slate-400 hover:bg-[#101820] hover:text-white'}
                    `}
                  >
                    <div className={`
                      flex-shrink-0 transition-all duration-200
                      ${item.active ? 'text-[#10b981]' : 'text-slate-400 group-hover:text-white'}
                    `}>
                      {item.icon}
                    </div>
                    
                    {!collapsed && (
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm font-medium transition-all"
                      >
                        {item.label}
                      </motion.span>
                    )}
                    
                    {!collapsed && item.active && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="ml-auto h-2 w-2 rounded-full bg-[#10b981]"
                      />
                    )}
                  </li>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="bg-[#0f1621] text-white border-[#1f2937]/40">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="mt-auto mb-4 px-3">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-400 hover:bg-[#101820] hover:text-white transition-all"
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>
    </div>
  );
};