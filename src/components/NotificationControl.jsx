import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

/**
 * Componente para controlar as configurações de notificação
 */
const NotificationControl = () => {
  const { notificationService, hasUnreadMessages, clearUnreadMessages } = useSocket();
  
  const [sound, setSound] = useState(true);
  const [desktop, setDesktop] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  
  // Carregar configurações iniciais
  useEffect(() => {
    // Verificar configurações salvas
    const savedSound = localStorage.getItem('notification_sound');
    const savedDesktop = localStorage.getItem('notification_desktop');
    const savedVolume = localStorage.getItem('notification_volume');
    
    if (savedSound !== null) {
      setSound(savedSound !== 'false');
    }
    
    if (savedDesktop !== null) {
      setDesktop(savedDesktop !== 'false');
    }
    
    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }
  }, []);
  
  // Aplicar alterações às configurações
  const handleToggleSound = () => {
    const newState = !sound;
    setSound(newState);
    notificationService.toggleSound(newState);
  };
  
  const handleToggleDesktop = async () => {
    const newState = !desktop;
    setDesktop(newState);
    await notificationService.toggleDesktopNotifications(newState);
  };
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    notificationService.updateVolume(newVolume);
  };
  
  // Limpar flag de mensagens não lidas quando o usuário interage com o controle
  useEffect(() => {
    if (hasUnreadMessages) {
      const timer = setTimeout(clearUnreadMessages, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasUnreadMessages, clearUnreadMessages]);
  
  return (
    <div className="relative">
      {/* Botão principal */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`relative flex items-center justify-center p-2 rounded-full transition-colors ${
          showSettings 
            ? 'bg-[#10b981]/20 text-[#10b981]' 
            : 'text-slate-400 hover:text-white hover:bg-[#101820]'
        }`}
        aria-label="Configurações de notificação"
      >
        <Settings className="h-5 w-5" />
        
        {/* Indicador de mensagens não lidas */}
        {hasUnreadMessages && (
          <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-[#10b981] rounded-full animate-pulse" />
        )}
      </button>
      
      {/* Painel de configurações */}
      {showSettings && (
        <div className="absolute right-0 mt-2 w-64 bg-[#0f1621] rounded-lg border border-[#1f2937]/50 shadow-lg z-50">
          <div className="p-3 border-b border-[#1f2937]/30">
            <h3 className="text-sm font-medium text-white">Configurações de Notificação</h3>
          </div>
          
          <div className="p-3 space-y-4">
            {/* Controle de som */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sound ? (
                  <Bell className="h-4 w-4 text-[#10b981]" />
                ) : (
                  <BellOff className="h-4 w-4 text-slate-500" />
                )}
                <span className="text-sm text-slate-300">Som de notificação</span>
              </div>
              
              <button
                onClick={handleToggleSound}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  sound ? 'bg-[#10b981]' : 'bg-[#1f2937]/50'
                }`}
              >
                <span 
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transform transition-transform ${
                    sound ? 'translate-x-4' : ''
                  }`} 
                />
              </button>
            </div>
            
            {/* Controle de volume - apenas visível se o som estiver ativado */}
            {sound && (
              <div className="flex items-center gap-3">
                <VolumeX className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1.5 bg-[#1f2937] rounded-lg appearance-none cursor-pointer"
                />
                <Volume2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </div>
            )}
            
            {/* Controle de notificações desktop */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {desktop ? (
                  <Bell className="h-4 w-4 text-[#10b981]" />
                ) : (
                  <BellOff className="h-4 w-4 text-slate-500" />
                )}
                <span className="text-sm text-slate-300">Notificações desktop</span>
              </div>
              
              <button
                onClick={handleToggleDesktop}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  desktop ? 'bg-[#10b981]' : 'bg-[#1f2937]/50'
                }`}
              >
                <span 
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transform transition-transform ${
                    desktop ? 'translate-x-4' : ''
                  }`} 
                />
              </button>
            </div>
          </div>
          
          <div className="p-3 border-t border-[#1f2937]/30 text-center">
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationControl;