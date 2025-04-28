import { useCallback, useEffect, useState, useRef } from 'react';
import { notificationService } from '../../services/notificationService';

/**
 * Hook para gerenciar efeitos visuais e sonoros de mensagens
 * @returns {Object} Métodos para controlar efeitos
 */
export function useMessageEffect() {
  const [notifications, setNotifications] = useState(true);
  const [notificationVolume, setNotificationVolume] = useState(0.5);
  const animatingElementsRef = useRef(new Map());

  // Inicializar configurações a partir do localStorage
  useEffect(() => {
    // Carregar preferências do usuário do localStorage
    const savedNotifications = localStorage.getItem('message_notifications');
    const savedVolume = localStorage.getItem('notification_volume');
    
    if (savedNotifications !== null) {
      setNotifications(savedNotifications === 'true');
    }
    
    if (savedVolume !== null) {
      setNotificationVolume(parseFloat(savedVolume));
    }
    
    // Configurar serviço de notificação
    notificationService.preloadSounds();
    
    if (savedVolume !== null) {
      notificationService.updateVolume(parseFloat(savedVolume));
    }
    
    notificationService.toggleSound(savedNotifications === 'true');
  }, []);

  // Função para reproduzir som de mensagem
  const playMessageSound = useCallback((type = 'message') => {
    if (!notifications) return;
    
    if (type === 'message') {
      notificationService.playSound('message');
    } else if (type === 'newConversation') {
      notificationService.playSound('newConversation');
    } else if (type === 'alert') {
      notificationService.playSound('alert');
    }
  }, [notifications]);

  // Função para animar um elemento DOM quando uma nova mensagem chega
  const animateNewMessage = useCallback((elementId, type = 'received') => {
    // Buscar o elemento DOM
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Definir a classe de animação
    const animationClass = type === 'sent' ? 'animate-message-sent' : 'animate-message-received';
    
    // Verificar se já está animando
    if (animatingElementsRef.current.has(elementId)) {
      // Resetar a animação
      element.classList.remove(animationClass);
      // Forçar reflow para reiniciar a animação
      void element.offsetWidth;
    }
    
    // Adicionar a classe
    element.classList.add(animationClass);
    
    // Rastrear o elemento
    animatingElementsRef.current.set(elementId, true);
    
    // Remover a classe após a animação terminar
    const animationDuration = 1000; // 1 segundo
    setTimeout(() => {
      element.classList.remove(animationClass);
      animatingElementsRef.current.delete(elementId);
    }, animationDuration);
  }, []);

  // Função para alternar notificações
  const toggleNotifications = useCallback((enabled) => {
    setNotifications(enabled);
    localStorage.setItem('message_notifications', enabled.toString());
    notificationService.toggleSound(enabled);
  }, []);

  // Função para ajustar volume
  const updateVolume = useCallback((volume) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setNotificationVolume(clampedVolume);
    localStorage.setItem('notification_volume', clampedVolume.toString());
    notificationService.updateVolume(clampedVolume);
  }, []);

  return {
    playMessageSound,
    animateNewMessage,
    toggleNotifications,
    updateVolume,
    notificationsEnabled: notifications,
    notificationVolume
  };
}
