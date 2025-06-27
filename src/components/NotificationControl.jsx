import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { notificationService } from '../services/notificationService';

const NotificationControl = () => {
  const { hasUnreadMessages, clearUnreadMessages, getTotalUnreadCount } = useSocket();
  
  const [sound, setSound] = useState(true);
  const [desktop, setDesktop] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [permission, setPermission] = useState('default');
  
  useEffect(() => {
    const settings = notificationService.getSettings();
    setSound(settings.soundEnabled);
    setDesktop(settings.desktopEnabled);
    setVolume(settings.volume);
    setPermission(settings.permission);
  }, []);
  
  useEffect(() => {
    const unreadCount = getTotalUnreadCount ? getTotalUnreadCount() : 0;
    notificationService.updateBrowserTitle(unreadCount);
  }, [hasUnreadMessages, getTotalUnreadCount]);
  
  const handleToggleSound = async () => {
    const newState = !sound;
    setSound(newState);
    await notificationService.toggleSound(newState);
  };
  
  const handleToggleDesktop = async () => {
    const newState = !desktop;
    const success = await notificationService.toggleDesktopNotifications(newState);
    
    if (success) {
      setDesktop(newState);
      setPermission(notificationService.permission);
    } else {
      setDesktop(false);
      setPermission('denied');
    }
  };
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    notificationService.updateVolume(newVolume);
  };
  
  useEffect(() => {
    if (hasUnreadMessages) {
      const timer = setTimeout(clearUnreadMessages, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasUnreadMessages, clearUnreadMessages]);
  
  const getPermissionText = () => {
    switch (permission) {
      case 'granted':
        return 'Permitidas';
      case 'denied':
        return 'Bloqueadas';
      case 'default':
        return 'Pendente';
      default:
        return 'Desconhecido';
    }
  };
  
  const getPermissionColor = () => {
    switch (permission) {
      case 'granted':
        return 'text-[#10b981]';
      case 'denied':
        return 'text-red-500';
      case 'default':
        return 'text-amber-500';
      default:
        return 'text-slate-400';
    }
  };
  
  return (
    <div className="relative">
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
        
        {hasUnreadMessages && (
          <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-[#10b981] rounded-full animate-pulse" />
        )}
      </button>
      
      {showSettings && (
        <div className="absolute right-0 mt-2 w-72 bg-[#0f1621] rounded-lg border border-[#1f2937]/50 shadow-lg z-50">
          <div className="p-3 border-b border-[#1f2937]/30">
            <h3 className="text-sm font-medium text-white">Configurações de Notificação</h3>
          </div>
          
          <div className="p-3 space-y-4">
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
            
            {sound && (
              <div className="flex items-center gap-3 pl-6">
                <VolumeX className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1.5 bg-[#1f2937] rounded-lg appearance-none cursor-pointer slider"
                />
                <Volume2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </div>
            )}
            
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
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Status das permissões:</span>
              <span className={getPermissionColor()}>
                {getPermissionText()}
              </span>
            </div>
            
            {permission === 'denied' && (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                <p>As notificações estão bloqueadas. Para ativá-las:</p>
                <p className="mt-1">1. Clique no ícone de cadeado na barra de endereços</p>
                <p>2. Altere as permissões de notificação para "Permitir"</p>
                <p>3. Recarregue a página</p>
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-[#1f2937]/30 text-center">
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          box-shadow: 0 0 2px 0 #000;
        }
        
        .slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 2px 0 #000;
        }
      `}</style>
    </div>
  );
};

export default NotificationControl;