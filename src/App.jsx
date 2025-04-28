// App.jsx
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import hooks and contexts
import { useAuthContext } from "./hooks/useAuthContext";
import { SocketProvider } from "./contexts/SocketContext";

// Components
import { AppSidebar } from './components/app-sidebar.jsx';
import MobileBottomNav from './components/mobile-bottom-nav.jsx';

// Routes
import AppRoutes from './routes';

// Componente principal
const App = () => {
  return (
    <Router>
      <AuthenticatedApp />
    </Router>
  );
};

// Componente que usa o hook useAuthContext
const AuthenticatedApp = () => {
  const { user, authIsReady } = useAuthContext();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Detectar dispositivo móvel e ajustar a sidebar
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Em dispositivos móveis, a sidebar começa fechada
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
  
  // Efeito para animação inicial
  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 200);
  }, []);
  
  // Função para alternar a sidebar no mobile
  const toggleMobileSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev);
  }, []);

  // Fechar sidebar ao clicar em links (apenas em mobile)
  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarVisible(false);
    }
  }, [isMobile]);

  // Exibir tela de carregamento enquanto verifica autenticação
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

  // Layout autenticado com sidebar
  if (user) {
    return (
      <SocketProvider>
        <div 
          className={`flex h-screen overflow-hidden bg-[#070b11] ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
          data-socket-context=""
        >
          {/* Container da Sidebar */}
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
                  
                  {/* Botão de fechar apenas para mobile */}
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

          {/* Botão para colapsar/expandir a sidebar (apenas desktop) */}
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

          {/* Overlay para fechar a sidebar no mobile */}
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

          {/* Conteúdo Principal */}
          <motion.main 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className={`flex-1 overflow-auto relative ${isMobile ? 'pb-16' : ''}`}
          >
            {/* Botão do menu para mobile */}
            {isMobile && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                onClick={toggleMobileSidebar}
                aria-label="Abrir menu"
                className="fixed top-4 left-4 z-30 p-2 rounded-lg
                           bg-[#10b981]
                           text-white shadow-md hover:bg-[#059669] 
                           transition-all duration-200"
              >
                <Menu className="h-5 w-5" />
              </motion.button>
            )}
            
            {/* Rotas da aplicação */}
            <div className="p-4 md:p-6 h-full">
              <AppRoutes />
            </div>
            
            {/* Bottom Navigation para Mobile */}
            <MobileBottomNav />
          </motion.main>
        </div>
      </SocketProvider>
    );
  } 
  
  // Layout não autenticado (sem sidebar)
  else {
    return (
      <div className="min-h-screen bg-[#070b11]">
        <AppRoutes />
      </div>
    );
  }
};

export default App;