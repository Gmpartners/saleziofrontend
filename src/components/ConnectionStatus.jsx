import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { MessageSquare, Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';

const ConnectionStatus = ({ setor }) => {
  const { isConnected, hasUnreadMessages } = useSocket();
  const [visible, setVisible] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const updateTimeoutRef = useRef(null);

  // Esconder após 5 segundos se estiver conectado
  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [isConnected]);

  // Mostrar novamente se o status de conexão mudar
  useEffect(() => {
    setVisible(true);
  }, [isConnected]);

  // Mostrar indicador de atualização quando receber mensagens
  useEffect(() => {
    if (hasUnreadMessages) {
      setIsUpdating(true);
      setVisible(true);
      
      // Limpar timeout anterior se existir
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Atualizar timestamp e esconder indicador após 3 segundos
      setLastUpdate(new Date());
      updateTimeoutRef.current = setTimeout(() => {
        setIsUpdating(false);
        
        // Se estiver conectado, esconder após alguns segundos
        if (isConnected) {
          setTimeout(() => {
            setVisible(false);
          }, 2000);
        }
      }, 3000);
    }
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [hasUnreadMessages, isConnected]);

  // Formatar horário da última atualização
  const getFormattedLastUpdate = () => {
    if (!lastUpdate) return '';
    
    const hours = lastUpdate.getHours().toString().padStart(2, '0');
    const minutes = lastUpdate.getMinutes().toString().padStart(2, '0');
    const seconds = lastUpdate.getSeconds().toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center border transition-colors duration-300 ${
          hasUnreadMessages 
            ? "bg-[#10b981]/20 border-[#10b981]/40"
            : "bg-[#10b981]/10 border-[#10b981]/20"
        }`}>
          <MessageSquare className={`h-5 w-5 text-[#10b981] ${hasUnreadMessages ? 'animate-pulse' : ''}`} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Conversas</h1>
          {setor && (
            <p className="text-sm text-slate-400">{setor}</p>
          )}
        </div>
      </div>

      {visible && (
        <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors duration-300 ${
          isUpdating
            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            : isConnected 
              ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20" 
              : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          {isUpdating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Atualizando</span>
              {lastUpdate && <span className="ml-1 text-xs opacity-80">({getFormattedLastUpdate()})</span>}
            </>
          ) : isConnected ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Conectado</span>
              {lastUpdate && <span className="ml-1 text-xs opacity-80">({getFormattedLastUpdate()})</span>}
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Desconectado</span>
              <button 
                className="ml-1 bg-red-500/20 hover:bg-red-500/30 rounded-full p-1"
                onClick={() => window.location.reload()}
                title="Recarregar página"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;