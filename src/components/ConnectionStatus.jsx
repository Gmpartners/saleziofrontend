import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

const ConnectionStatus = ({ isConnected, error }) => {
  const [visible, setVisible] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const updateTimeoutRef = useRef(null);

  // Esconder após 5 segundos se estiver conectado
  useEffect(() => {
    if (isConnected && !error) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [isConnected, error]);

  // Mostrar novamente se o status de conexão mudar
  useEffect(() => {
    setVisible(true);
  }, [isConnected, error]);

  // Formatar horário da última atualização
  const getFormattedLastUpdate = () => {
    if (!lastUpdate) return '';
    
    const hours = lastUpdate.getHours().toString().padStart(2, '0');
    const minutes = lastUpdate.getMinutes().toString().padStart(2, '0');
    const seconds = lastUpdate.getSeconds().toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  };

  const getStatusContent = () => {
    if (isUpdating) {
      return (
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Atualizando</span>
          {lastUpdate && <span className="ml-1 text-xs opacity-80">({getFormattedLastUpdate()})</span>}
        </div>
      );
    }
    
    if (isConnected) {
      return (
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          <span>Conectado</span>
          {lastUpdate && <span className="ml-1 text-xs opacity-80">({getFormattedLastUpdate()})</span>}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>{error || "Desconectado"}</span>
        <Button 
          variant="outline"
          size="icon"
          className="ml-1 h-6 w-6 rounded-full"
          onClick={() => window.location.reload()}
          title="Recarregar página"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm w-fit",
              isUpdating
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : isConnected 
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                  : "bg-destructive/10 text-destructive border-destructive/20"
            )}
          >
            {getStatusContent()}
          </Badge>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConnectionStatus;