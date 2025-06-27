import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  BarChart3, 
  User, 
  Settings, 
  Layers, 
  Users, 
  Database,
  Shield,
  LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthContext } from '../hooks/useAuthContext';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, logout } = useAuthContext();
  
  const regularNavItems = [
    {
      id: 'conversations',
      label: 'Conversas',
      icon: <MessageSquare className="h-5 w-5" />,
      path: '/conversations',
      active: location.pathname.includes('/conversations') && !location.pathname.includes('/admin')
    },
    {
      id: 'logout',
      label: 'Sair',
      icon: <LogOut className="h-5 w-5" />,
      action: logout,
      active: false
    }
  ];

  const adminNavItems = [
    {
      id: 'admin-conversations',
      label: 'Conversas',
      icon: <Database className="h-5 w-5" />,
      path: '/admin/conversations',
      active: location.pathname.includes('/admin/conversations')
    },
    {
      id: 'logout',
      label: 'Sair',
      icon: <LogOut className="h-5 w-5" />,
      action: logout,
      active: false
    }
  ];

  const navItems = isAdmin ? adminNavItems : regularNavItems;

  const handleNavItem = (item) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.action) {
      item.action();
    }
  };

  return (
    <motion.nav 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 h-16 bg-[#070b11]/95 backdrop-blur-md border-t border-[#1f2937]/40 z-40 md:hidden shadow-[0_-5px_20px_rgba(0,0,0,0.3)]"
    >
      <div className="h-full flex items-center justify-around max-w-md mx-auto px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavItem(item)}
            className="flex flex-col items-center justify-center h-full w-1/4 relative"
          >
            <div 
              className={`
                p-2 rounded-lg transition-all duration-200
                ${item.active 
                  ? 'text-[#10b981] bg-[#10b981]/10' 
                  : item.id === 'logout'
                    ? 'text-red-400 hover:text-red-300'
                    : 'text-slate-400 hover:text-white'}
              `}
            >
              {item.icon}
            </div>
            
            <span className={`
              text-[10px] font-medium transition-colors duration-200
              ${item.active 
                ? 'text-[#10b981]' 
                : item.id === 'logout'
                  ? 'text-red-400'
                  : 'text-slate-500'}
            `}>
              {item.label}
            </span>
            
            {item.active && (
              <motion.div
                layoutId="bottomNavIndicator"
                className="absolute -top-[3px] w-1/2 h-0.5 bg-[#10b981] rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </motion.nav>
  );
};

export default MobileBottomNav;