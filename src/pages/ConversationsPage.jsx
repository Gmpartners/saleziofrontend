import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuthContext } from '../hooks/useAuthContext';
import ConversationsList from '../components/conversations/ConversationsList';
import ConversationDetail from '../components/conversations/ConversationDetail';
import ConnectionStatus from '../components/ConnectionStatus';
import { useLocation, useNavigate } from 'react-router-dom';

const ConversationsPage = () => {
  const { refreshConversations, conversations, connectionError, isConnected } = useSocket();
  const { userProfile } = useAuthContext();
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const location = useLocation();
  const navigate = useNavigate();

  // Efeito para verificar o tamanho da tela e atualizar o estado
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    // Adicionar listener de resize
    window.addEventListener('resize', handleResize);
    handleResize(); // Verificar inicialmente
    
    // Remover listener ao desmontar
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Se houver um ID de conversa na URL, usá-lo
  useEffect(() => {
    // Verificar se estamos em uma rota de conversa específica
    const match = location.pathname.match(/\/conversations\/([^/]+)/);
    if (match && match[1]) {
      setSelectedConversationId(match[1]);
    }
  }, [location.pathname]);

  // Buscar conversas ao carregar a página
  useEffect(() => {
    const loadConversations = async () => {
      try {
        await refreshConversations();
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
      }
    };

    loadConversations();
    
    // Configurar intervalo para atualizar conversas a cada minuto
    const intervalId = setInterval(loadConversations, 60000);
    
    return () => clearInterval(intervalId);
  }, [refreshConversations]);

  // Manipulador para selecionar uma conversa
  const handleSelectConversation = (conversationId) => {
    setSelectedConversationId(conversationId);
    
    // IMPORTANTE: Não redirecionamos para uma nova página
    // Apenas atualizamos o estado local
    
    // Se estiver em uma página de conversa específica, voltar para a página principal
    if (location.pathname !== '/conversations') {
      navigate('/conversations', { replace: true });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#070b11]">
      {/* Barra de status de conexão */}
      {connectionError && (
        <div className="w-full">
          <ConnectionStatus
            isConnected={isConnected}
            error={connectionError}
          />
        </div>
      )}

      {/* Conteúdo principal - layout sempre dividido */}
      <div className="flex flex-1 overflow-hidden">
        {/* Painel esquerdo - Lista de conversas (sempre visível em desktop, pode ser ocultado em mobile) */}
        <div className={`${isMobileView && selectedConversationId ? 'hidden' : 'block'} w-full md:w-[350px] border-r border-[#1f2937]/40`}>
          <ConversationsList 
            conversations={conversations} 
            selectedConversationId={selectedConversationId} 
            onSelectConversation={handleSelectConversation} 
            showSectorFilter={userProfile?.role === 'admin'} 
          />
        </div>

        {/* Painel direito - Detalhes da conversa */}
        <div className={`${isMobileView && !selectedConversationId ? 'hidden' : 'block'} flex-1 overflow-hidden`}>
          <ConversationDetail 
            conversationId={selectedConversationId}
            onBack={() => {
              if (isMobileView) {
                setSelectedConversationId(null);
              }
            }}
            isMobileView={isMobileView}
          />
        </div>
      </div>
    </div>
  );
};

export default ConversationsPage;