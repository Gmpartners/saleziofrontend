// App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, Menu } from 'lucide-react';

// Import AuthContext e Provider (usando o contexto existente)
import { AuthContextProvider } from "./contexts/AuthContext";
import { useAuthContext } from "./hooks/useAuthContext";
import { SocketProvider } from "./contexts/SocketContext";

// Components
import { AppSidebar } from './components/app-sidebar.jsx';
import WhatsAppDashboard from './pages/Dashboard/WhatsAppDashboard.jsx';
import ConversationsPage from './pages/Conversations/ConversationsPage.jsx';
import ConversationDetail from './pages/Conversations/ConversationDetail.jsx';
import AnalyticsPage from './pages/Analytics/AnalyticsPage.jsx';

// Auth pages
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';

// Componente que usa o hook useAuthContext
const AuthenticatedRoutes = () => {
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
  const toggleMobileSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  // Don't render anything until auth is ready
  if (!authIsReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0c0b14]">
        <div className="animate-spin w-8 h-8 border-4 border-t-transparent border-green-500 rounded-full"></div>
      </div>
    );
  }

  if (user) {
    return (
      <SocketProvider>
        <div className={`flex h-screen overflow-hidden bg-[#0c0b14] ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
          {/* Container da Sidebar */}
          <div className={`sidebar-container h-full ${isMobile ? 'fixed z-50' : 'relative'} 
            ${isMobile && !sidebarVisible ? 'translate-x-[-100%]' : 'translate-x-0'} 
            transition-transform duration-300 ease-in-out`}>
            <div 
              className={`h-full transition-all duration-300 ease-in-out overflow-hidden ${
                collapsed ? "w-[70px]" : "w-[240px]"
              } relative`}
            >
              <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            </div>
          </div>

          {/* Botão para colapsar/expandir a sidebar */}
          {!isMobile && (
            <div 
              className="absolute top-28 left-0 z-[60] transform"
              style={{
                left: collapsed ? '59px' : '229px',
                transition: 'left 0.3s ease-in-out'
              }}
            >
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 
                          text-white shadow-lg border-2 border-[#0c0b14] 
                          hover:bg-green-700 transition-colors"
              >
                {collapsed ? (
                  <ChevronsRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronsLeft className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}

          {/* Overlay para fechar a sidebar no mobile */}
          {isMobile && sidebarVisible && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setSidebarVisible(false)}
            ></div>
          )}

          {/* Conteúdo Principal */}
          <main 
            className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
            style={{
              animationDelay: '200ms',
              backgroundColor: '#0c0b14',
            }}
          >
            {/* Botão do menu para mobile */}
            {isMobile && (
              <button
                onClick={toggleMobileSidebar}
                className="fixed top-4 left-4 z-30 bg-green-600 text-white rounded-lg p-2 shadow-lg"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            
            <Routes>
              <Route path="/" element={<WhatsAppDashboard />} />
              <Route path="/conversations" element={<ConversationsPage />} />
              <Route path="/conversations/:id" element={<ConversationDetail />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </SocketProvider>
    );
  } else {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* Redirect to login if trying to access protected routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
};

function App() {
  return (
    <AuthContextProvider>
      <Router>
        <AuthenticatedRoutes />
      </Router>
    </AuthContextProvider>
  );
}

export default App;