import { useContext, useState, useEffect, useCallback } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import { useAuthContext } from './useAuthContext';

/**
 * Hook para usar o contexto de Socket
 */
export const useSocket = () => {
  const socketContext = useContext(SocketContext);
  const { userProfile } = useAuthContext();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Verificar se o contexto está disponível
    if (!socketContext) {
      console.error('useSocket deve ser usado dentro de um SocketProvider');
      return;
    }

    // Verificar se o usuário está autenticado
    if (!userProfile || !userProfile.id) {
      console.log('Usuário não autenticado, aguardando perfil');
      return;
    }

    // Verificar se já está inicializado
    if (isInitialized) return;

    // Inicializar com o setor do usuário
    const userSector = userProfile.setor || null;
    console.log('Inicializando Socket com setor:', userSector?.nome || 'nenhum');

    // Marcar como inicializado
    setIsInitialized(true);

    // Função para entrar nas salas específicas do usuário
    const joinUserRooms = async () => {
      try {
        // Sala global do usuário
        socketContext.realtimeService.joinRoom(`user_${userProfile.id}`);

        // Sala do setor (se existir)
        if (userSector && (userSector._id || userSector.id)) {
          const sectorId = userSector._id || userSector.id;
          socketContext.realtimeService.joinRoom(`user_${userProfile.id}_setor_${sectorId}`);
        }

        console.log('Entrou nas salas do usuário com sucesso');
      } catch (error) {
        console.error('Erro ao entrar nas salas do usuário:', error);
      }
    };

    // Executar apenas se o WebSocket estiver conectado
    if (socketContext.isConnected) {
      joinUserRooms();
    } else {
      // Caso contrário, aguardar conexão
      const checkInterval = setInterval(() => {
        if (socketContext.isConnected) {
          joinUserRooms();
          clearInterval(checkInterval);
        }
      }, 1000);

      // Limpar intervalo ao desmontar
      return () => clearInterval(checkInterval);
    }
  }, [socketContext, userProfile, isInitialized]);

  return socketContext;
};

export default useSocket;