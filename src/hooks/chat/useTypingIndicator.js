import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext';

/**
 * Hook para gerenciar indicadores de digitação
 * @param {string} conversationId ID da conversa atual
 * @returns {Object} Objeto com métodos e estado do hook
 */
export function useTypingIndicator(conversationId) {
  const { sendTypingIndicator, typingUsers } = useSocket();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Calcular quem está digitando na conversa atual
  const activeTypers = conversationId ? typingUsers[conversationId] : null;

  // Função para iniciar o indicador de digitação
  const startTyping = useCallback(() => {
    // Evitar envios desnecessários
    if (!isTyping && conversationId) {
      setIsTyping(true);
      sendTypingIndicator(conversationId);
      
      // Limpar qualquer timeout existente
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Configurar um novo timeout para parar automaticamente após 3 segundos
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }
  }, [isTyping, conversationId, sendTypingIndicator]);

  // Função para parar o indicador de digitação
  const stopTyping = useCallback(() => {
    setIsTyping(false);
    
    // Limpar o timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    activeTypers,
    startTyping,
    stopTyping
  };
}
