import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  BarChart3, 
  Settings, 
  LogOut, 
  User,
  Shield, 
  Users, 
  Layers, 
  Database
} from 'lucide-react';
import { useAuthContext } from '../hooks/useAuthContext';
import { motion } from 'framer-motion';

import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

export const AppSidebar = ({ collapsed, setCollapsed, closeSidebar }) => {
  const { userProfile, logout, isAdmin } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [initials, setInitials] = useState('');

  useEffect(() => {
    if (userProfile?.displayName) {
      const nameParts = userProfile.displayName.split(' ');
      const firstInitial = nameParts[0] ? nameParts[0][0] : '';
      const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '';
      setInitials((firstInitial + lastInitial).toUpperCase());
    }
  }, [userProfile]);

  const handleNavigation = (path) => {
    navigate(path);
    closeSidebar();
  };

  const regularUserItems = [
    { 
      id: 'conversations', 
      icon: <MessageSquare className="w-5 h-5" />, 
      label: 'Conversas', 
      path: '/conversations',
      active: location.pathname.includes('/conversations') && !location.pathname.includes('/admin/conversations')
    },
  ];

  const adminItems = [
    {
      id: 'admin-conversations',
      icon: <Database className="w-5 h-5" />,
      label: 'Central de Conversas',
      path: '/conversations',
      active: location.pathname.includes('/admin/conversations')
    },
  ];

  const menuItems = isAdmin ? adminItems : regularUserItems;

  const renderMenuItem = (item) => {
    const menuItemContent = (
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
    );

    if (collapsed) {
      return (
        <TooltipProvider key={item.id} delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              {menuItemContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#0f1621] text-white border-[#1f2937]/40">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div key={item.id}>
        {menuItemContent}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#070b11] border-r border-[#1f2937]/40 shadow-lg">
      <div className="p-4 border-b border-[#1f2937]/40">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 bg-gradient-to-br from-[#10b981] to-[#059669] p-2 rounded-lg shadow-md">
            {isAdmin ? (
              <Shield className="h-5 w-5 text-white" />
            ) : (
              <MessageSquare className="h-5 w-5 text-white" />
            )}
          </div>
          {!collapsed && (
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#10b981] to-[#059669]"
            >
              {isAdmin ? "Admin Panel" : "MultiFlow"}
            </motion.h1>
          )}
        </div>
      </div>

      <div 
        className={`mt-4 mx-3 p-3 rounded-lg transition-all duration-300 ${collapsed ? "justify-center" : ""} 
        flex items-center gap-3 bg-[#0f1621] border border-[#1f2937]/40 hover:bg-[#101820] cursor-pointer`}
        onClick={() => handleNavigation('/profile')}
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
              {isAdmin ? (
                <Badge variant="outline" className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                  Administrador
                </Badge>
              ) : (
                <Badge variant="success" className="px-2 py-0.5 text-xs">
                  Atendente
                </Badge>
              )}
              {userProfile?.sector && !isAdmin && (
                <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md text-xs">
                  {userProfile.sector}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="mt-5 flex-1 px-3">
        {isAdmin && !collapsed && (
          <div className="mb-3">
            <h2 className="text-xs font-semibold text-purple-400 uppercase tracking-wider ml-2">
              Administração
            </h2>
          </div>
        )}
        
        <ul className="space-y-1">
          {menuItems.map(item => renderMenuItem(item))}
        </ul>
      </nav>

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