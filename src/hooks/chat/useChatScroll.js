import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook personalizado para controlar a rolagem automática em chats
 * e detectar a visibilidade das mensagens
 * @param {Object} options Opções de configuração
 * @param {React.RefObject} options.messagesEndRef Referência para o elemento de fim das mensagens
 * @param {Number} options.messageCount Número de mensagens no chat
 * @param {Function} options.onVisibilityChange Callback para quando a visibilidade muda
 * @param {Number} options.scrollThreshold Limite para considerar "fim da rolagem"
 * @param {Boolean} options.autoScrollEnabled Habilitar/desabilitar rolagem automática
 * @returns {Object} Métodos e estado do hook
 */
export function useChatScroll({
  messagesEndRef,
  messageCount = 0,
  onVisibilityChange,
  scrollThreshold = 100,
  autoScrollEnabled = true
}) {
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const previousMessageCount = useRef(messageCount);
  const visibleMessageIds = useRef(new Set());
  const containerRef = useRef(null);
  const observerRef = useRef(null);

  // Função para verificar se a rolagem está próxima do fim
  const checkNearBottom = useCallback((container) => {
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    return distanceFromBottom <= scrollThreshold;
  }, [scrollThreshold]);

  // Função para rolar para o fim
  const scrollToBottom = useCallback((options = { behavior: 'smooth' }) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView(options);
    }
  }, [messagesEndRef]);

  // Função para rolar para uma mensagem específica
  const scrollToMessage = useCallback((messageId, options = { behavior: 'smooth' }) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView(options);
    }
  }, []);

  // Função para lidar com a rolagem do usuário
  const handleScroll = useCallback((e) => {
    // Limpar qualquer timeout anterior
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Configurar um novo timeout para evitar muitas atualizações
    scrollTimeoutRef.current = setTimeout(() => {
      const container = e.target;
      const nearBottom = checkNearBottom(container);
      
      setIsNearBottom(nearBottom);
      
      // Se o usuário rolou ativamente, registrar isso
      if (!nearBottom && !userHasScrolled) {
        setUserHasScrolled(true);
      }
      
      // Se o usuário rolou até o fim, considerar reset da flag de rolagem
      if (nearBottom && userHasScrolled) {
        setUserHasScrolled(false);
      }
    }, 200);
  }, [checkNearBottom, userHasScrolled]);

  // Configurar o observer de interseção para monitorar mensagens visíveis
  useEffect(() => {
    if (!onVisibilityChange) return;
    
    // Criar um observer para detectar quando as mensagens entram/saem da tela
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const messageId = entry.target.dataset.messageId;
        
        if (!messageId) return;
        
        if (entry.isIntersecting) {
          visibleMessageIds.current.add(messageId);
          onVisibilityChange(true, messageId);
        } else {
          visibleMessageIds.current.delete(messageId);
          onVisibilityChange(false, messageId);
        }
      });
    }, {
      root: containerRef.current,
      rootMargin: '0px',
      threshold: 0.5 // 50% visível para ser considerado "visível"
    });
    
    // Observar todas as mensagens
    const messageElements = document.querySelectorAll('[data-message-id]');
    messageElements.forEach(el => {
      observerRef.current.observe(el);
    });
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [messageCount, onVisibilityChange]);

  // Efeito para rolagem automática quando novas mensagens chegam
  useEffect(() => {
    if (!autoScrollEnabled) return;
    
    // Se novas mensagens chegaram e o usuário está no fim ou não rolou manualmente
    if (messageCount > previousMessageCount.current && (isNearBottom || !userHasScrolled)) {
      // Usar setTimeout para garantir que o DOM está atualizado
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
    
    previousMessageCount.current = messageCount;
  }, [messageCount, isNearBottom, userHasScrolled, scrollToBottom, autoScrollEnabled]);

  // Retornar as funções e estado
  return {
    isNearBottom,
    userHasScrolled,
    scrollToBottom,
    scrollToMessage,
    handleScroll,
    setContainerRef: (ref) => {
      containerRef.current = ref;
    }
  };
}
