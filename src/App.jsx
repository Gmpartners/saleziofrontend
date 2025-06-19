import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuthContext } from "./hooks/useAuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { useSocket } from "./contexts/SocketContext";
import { ToastNotification } from './components/conversations/ToastNotification';

import { AppSidebar } from './components/app-sidebar.jsx';
import MobileBottomNav from './components/mobile-bottom-nav.jsx';

import AppRoutes from './routes';
import { useLocation } from 'react-router-dom';

const App = () => {
  return (
    <Router>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </Router>
  );
};

const AppContent = () => {
  const { user, authIsReady } = useAuthContext();
  const { toastNotification, closeToast, handleToastClick } = useSocket();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const location = useLocation();
  
  // Verificar se está em uma rota de autenticação
  const isAuthRoute = location.pathname.includes('/login') || 
                      location.pathname.includes('/signup') || 
                      location.pathname.includes('/forgot-password');

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (mobile) {
        setCollapsed(true);
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 200);
  }, []);
  
  const toggleMobileSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarVisible(false);
    }
  }, [isMobile]);

  if (!authIsReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070b11]">
        <div className="w-12 h-12 relative">
          <div className="absolute inset-0 rounded-full border-4 border-t-[#10b981] border-r-[#10b981]/40 border-b-[#10b981]/20 border-l-[#10b981]/10 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-[#10b981] border-b-[#10b981]/30 border-l-transparent animate-spin animation-delay-300"></div>
        </div>
      </div>
    );
  }

  // Se estiver em uma rota de autenticação ou não estiver autenticado, renderize apenas as rotas
  if (isAuthRoute || !user) {
    return (
      <div className={`min-h-screen bg-[#070b11] ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
        <AppRoutes />
      </div>
    );
  }

  // Se estiver autenticado e não estiver em uma rota de autenticação, renderize a interface completa
  return (
    <div 
      className={`flex h-screen overflow-hidden bg-[#070b11] ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
      data-socket-context=""
    >
      <AnimatePresence>
        {(sidebarVisible || !isMobile) && (
          <motion.div 
            initial={isMobile ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={isMobile ? { x: -300 } : false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`sidebar-container h-full ${isMobile ? 'fixed z-50' : 'relative'}`}
          >
            <div 
              className={`h-full transition-all duration-300 ease-in-out overflow-hidden 
                shadow-lg ${
                collapsed ? "w-[70px]" : "w-[260px]"
              } relative`}
            >
              <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} closeSidebar={closeSidebar} />
              
              {isMobile && sidebarVisible && (
                <button 
                  onClick={toggleMobileSidebar}
                  aria-label="Fechar menu"
                  className="absolute top-4 right-3 bg-[#0f1621]/80 backdrop-blur-sm text-slate-400 rounded-full p-1.5 
                          hover:text-white hover:bg-[#101820] transition-all duration-200 
                          shadow-md hover:shadow-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isMobile && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute top-28 z-[60]"
          style={{
            left: collapsed ? '59px' : '249px',
            transition: 'left 0.3s ease-in-out'
          }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="flex items-center justify-center w-7 h-7 rounded-full 
                     bg-gradient-to-br from-[#10b981] to-[#059669]
                     text-white shadow-md border border-[#10b981]/20
                     hover:shadow-lg transition-all duration-200"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </motion.div>
      )}

      {isMobile && sidebarVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={toggleMobileSidebar}
          aria-hidden="true"
        ></motion.div>
      )}

      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className={`flex-1 overflow-auto relative ${isMobile ? 'pb-16' : ''}`}
      >
        
        
        <div className="p-4 md:p-6 h-full">
          <AppRoutes />
        </div>
        
        <MobileBottomNav />
      </motion.main>

      <ToastNotification
        show={toastNotification.show}
        message={toastNotification.message}
        sender={toastNotification.sender}
        onClose={closeToast}
        onClick={handleToastClick}
      />
    </div>
  );
};

export default App;