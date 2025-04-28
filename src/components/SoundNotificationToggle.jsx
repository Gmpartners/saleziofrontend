import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

/**
 * Componente para ativar/desativar notificações sonoras
 */
const SoundNotificationToggle = () => {
  const { notificationService } = useSocket();
  const [isMuted, setIsMuted] = useState(false);
  
  // Carregar estado inicial do localStorage
  useEffect(() => {
    const savedSound = localStorage.getItem('notification_sound');
    if (savedSound !== null) {
      setIsMuted(savedSound === 'false');
    }
  }, []);
  
  // Função para alternar som
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    // Atualizar serviço de notificação
    notificationService.toggleSound(!newMuted);
    
    // Executar um som de teste ao ativar
    if (!newMuted) {
      setTimeout(() => {
        notificationService.playSound('message');
      }, 300);
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full transition-colors ${
              isMuted 
                ? 'text-slate-500 hover:bg-slate-800/50' 
                : 'text-blue-400 hover:bg-blue-500/10'
            }`}
            aria-label={isMuted ? "Ativar som" : "Desativar som"}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isMuted ? 'Ativar notificações sonoras' : 'Desativar notificações sonoras'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SoundNotificationToggle;