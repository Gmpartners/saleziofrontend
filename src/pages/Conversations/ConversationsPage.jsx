// src/pages/Conversations/ConversationsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  MessageSquareOff, 
  ArrowLeft,
  X,
  Check,
  Share
} from 'lucide-react';

// Contexts e Hooks
import { useSocket } from '../../contexts/SocketContext';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useMessageEffect } from '../../hooks/chat/useMessageEffect';

// Components
import ConversationsList from '../../components/conversations/ConversationsList';
import ConversationDetail from '../../components/conversations/ConversationDetail';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { notificationService } from '../../services/notificationService';

const ConversationsPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { userProfile, userSector, userSectorName, sectors } = useAuthContext();
  const { 
    conversations, 
    completedConversations,
    selectedConversation, 
    selectConversation, 
    sendMessage,
    transferConversation,
    finishConversation,
    archiveConversation,
    refreshConversations,
    refreshCompletedConversations,
    isConnected,
    hasUnreadMessages,
    clearUnreadMessages,
    isLoading,
    sendTypingIndicator
  } = useSocket();

  const { notificationsEnabled, toggleNotifications } = useMessageEffect();
  
  // Estado da interface
  const [activeTab, setActiveTab] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  
  // Estados para diálogos
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  
  // Detectar tamanho da tela para responsividade
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileDetailView(isMobile && !!selectedConversation);
    };
    
    // Verificar inicialmente
    handleResize();
    
    // Adicionar listener para redimensionamento
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedConversation]);
  
  // Limpar flag de mensagens não lidas quando a página é visualizada
  useEffect(() => {
    if (hasUnreadMessages) {
      clearUnreadMessages();
    }
  }, [hasUnreadMessages, clearUnreadMessages]);
  
  // Carregar conversas iniciais
  useEffect(() => {
    const loadConversations = async () => {
      setIsRefreshing(true);
      setLoadingError(null);
      
      try {
        // Não usar nenhum filtro adicional, mostrar todas as conversas
        await refreshConversations({});
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        setLoadingError('Não foi possível carregar as conversas. Tente novamente.');
      } finally {
        setIsRefreshing(false);
      }
    };
    
    // Carregar apenas na montagem do componente
    loadConversations();
  }, [refreshConversations]);

  // Carregar conversa específica quando a URL for acessada diretamente com ID
  useEffect(() => {
    if (conversationId && !selectedConversation) {
      selectConversation(conversationId);
    }
  }, [conversationId, selectedConversation, selectConversation]);

  // Carregar conversas concluídas ao selecionar a aba
  useEffect(() => {
    const loadCompletedConversations = async () => {
      if (activeTab === 'completed' && (!completedConversations || completedConversations.length === 0)) {
        setIsRefreshing(true);
        try {
          await refreshCompletedConversations();
        } catch (error) {
          console.error('Erro ao carregar conversas concluídas:', error);
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    loadCompletedConversations();
  }, [activeTab, completedConversations, refreshCompletedConversations]);
  
  // Forçar atualização manual
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (activeTab === 'completed') {
        await refreshCompletedConversations();
      } else {
        await refreshConversations({});
      }
      
      notificationService.showToast('Conversas atualizadas', 'success');
    } catch (error) {
      console.error('Erro ao atualizar conversas:', error);
      notificationService.showToast('Erro ao atualizar conversas', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTab, refreshCompletedConversations, refreshConversations, isRefreshing]);
  
  // Navegação para a conversa selecionada
  const handleSelectConversation = (conversationId) => {
    selectConversation(conversationId);
    navigate(`/conversations/${conversationId}`);
    
    // Em dispositivos móveis, mostrar a visualização de detalhes
    if (window.innerWidth < 768) {
      setIsMobileDetailView(true);
    }
  };
  
  // Voltar da visualização de detalhes em dispositivos móveis
  const handleBackFromDetails = () => {
    if (window.innerWidth < 768) {
      setIsMobileDetailView(false);
      navigate('/conversations');
    }
  };
  
  // Lidar com envio de mensagem
  const handleSendMessage = async (conversationId, text) => {
    return await sendMessage(conversationId, text);
  };
  
  // Mostrar diálogo de transferência
  const handleShowTransferDialog = (conversationId) => {
    setShowTransferDialog(true);
  };
  
  // Mostrar diálogo de finalização
  const handleShowFinishDialog = (conversationId) => {
    setShowFinishDialog(true);
  };
  
  // Mostrar diálogo de arquivamento
  const handleShowArchiveDialog = (conversationId) => {
    setShowArchiveDialog(true);
  };
  
  // Executar transferência
  const handleConfirmTransfer = async () => {
    if (!selectedConversation || !selectedSector) return;
    
    try {
      const success = await transferConversation(selectedConversation._id, selectedSector);
      
      if (success) {
        notificationService.showToast('Conversa transferida com sucesso', 'success');
        setSelectedSector(null);
        setShowTransferDialog(false);
        // Voltar à lista em dispositivos móveis
        if (window.innerWidth < 768) {
          setIsMobileDetailView(false);
          navigate('/conversations');
        }
      } else {
        notificationService.showToast('Erro ao transferir conversa', 'error');
      }
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      notificationService.showToast('Erro ao transferir conversa', 'error');
    }
  };
  
  // Executar finalização
  const handleConfirmFinish = async () => {
    if (!selectedConversation) return;
    
    try {
      const success = await finishConversation(selectedConversation._id);
      
      if (success) {
        notificationService.showToast('Conversa finalizada com sucesso', 'success');
        setShowFinishDialog(false);
        // Voltar à lista em dispositivos móveis
        if (window.innerWidth < 768) {
          setIsMobileDetailView(false);
          navigate('/conversations');
        }
      } else {
        notificationService.showToast('Erro ao finalizar conversa', 'error');
      }
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      notificationService.showToast('Erro ao finalizar conversa', 'error');
    }
  };
  
  // Executar arquivamento
  const handleConfirmArchive = async () => {
    if (!selectedConversation) return;
    
    try {
      const success = await archiveConversation(selectedConversation._id);
      
      if (success) {
        notificationService.showToast('Conversa arquivada com sucesso', 'success');
        setShowArchiveDialog(false);
        // Voltar à lista em dispositivos móveis
        if (window.innerWidth < 768) {
          setIsMobileDetailView(false);
          navigate('/conversations');
        }
      } else {
        notificationService.showToast('Erro ao arquivar conversa', 'error');
      }
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      notificationService.showToast('Erro ao arquivar conversa', 'error');
    }
  };
  
  // Processar ações do menu
  const handleConversationAction = (action) => {
    if (!selectedConversation) return;
    
    switch (action) {
      case 'transferir':
        handleShowTransferDialog(selectedConversation._id);
        break;
      case 'finalizar':
        handleShowFinishDialog(selectedConversation._id);
        break;
      case 'arquivar':
        handleShowArchiveDialog(selectedConversation._id);
        break;
      case 'videoCall':
        notificationService.showToast('Chamada de vídeo não implementada', 'info');
        break;
      case 'voiceCall':
        notificationService.showToast('Chamada de voz não implementada', 'info');
        break;
      default:
        break;
    }
  };
  
  // Alternar notificações
  const handleToggleNotifications = () => {
    toggleNotifications(!notificationsEnabled);
    
    notificationService.showToast(
      notificationsEnabled ? 'Notificações desativadas' : 'Notificações ativadas',
      'info'
    );
  };
  
  // Selecionar quais conversas mostrar com base na aba atual
  const getActiveConversations = () => {
    if (activeTab === 'completed') {
      return completedConversations || [];
    }
    
    if (!conversations) return [];
    
    if (activeTab === 'waiting') {
      return conversations.filter(c => 
        c.status && c.status.toLowerCase().includes('aguardando')
      );
    }
    
    if (activeTab === 'ongoing') {
      return conversations.filter(c => 
        c.status && c.status.toLowerCase().includes('andamento')
      );
    }
    
    // Aba "all" - mostrar todas as conversas ativas
    return conversations;
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Área de lista de conversas */}
        {(!isMobileDetailView || !selectedConversation) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="md:w-1/3 flex-shrink-0 p-4 md:border-r border-gray-800 overflow-auto h-full"
          >
            <ConversationsList 
              conversations={getActiveConversations()}
              onSelectConversation={handleSelectConversation}
              isLoading={isLoading || isRefreshing}
              error={loadingError}
              onRefresh={handleRefresh}
              sectors={sectors}
              userSector={userSector}
              selectedConversationId={selectedConversation?._id}
              showNotifications={notificationsEnabled}
              onToggleNotifications={handleToggleNotifications}
            />
          </motion.div>
        )}
        
        {/* Área de detalhes da conversa */}
        {(selectedConversation || isMobileDetailView) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-4 h-full overflow-hidden"
          >
            {isMobileDetailView && (
              <Button
                variant="outline"
                size="sm"
                className="md:hidden mb-4 bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300"
                onClick={handleBackFromDetails}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar às conversas
              </Button>
            )}
            
            <ConversationDetail 
              conversation={selectedConversation}
              onBack={handleBackFromDetails}
              onSendMessage={handleSendMessage}
              onFinish={handleShowFinishDialog}
              onTransfer={handleShowTransferDialog}
              onArchive={handleShowArchiveDialog}
              onVideoCall={() => handleConversationAction('videoCall')}
              onVoiceCall={() => handleConversationAction('voiceCall')}
            />
          </motion.div>
        )}
        
        {/* Área de espaço reservado quando nenhuma conversa está selecionada */}
        {!selectedConversation && !isMobileDetailView && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden md:flex flex-1 items-center justify-center p-4"
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
                <MessageSquareOff className="h-10 w-10 text-gray-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Nenhuma conversa selecionada</h2>
              <p className="text-gray-400 max-w-md">
                Selecione uma conversa na lista para visualizar as mensagens e interagir com o cliente.
              </p>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Diálogo de transferência */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Transferir conversa</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-300 mb-4">
              Selecione o setor para o qual deseja transferir esta conversa:
            </p>
            
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-auto">
              {sectors && sectors.map(sector => (
                <button
                  key={sector._id || sector.id}
                  className={`p-3 rounded-lg border text-left transition-colors
                    ${selectedSector === (sector._id || sector.id)
                      ? 'bg-[#10b981]/20 border-[#10b981] text-white'
                      : 'bg-gray-700/30 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                    }
                  `}
                  onClick={() => setSelectedSector(sector._id || sector.id)}
                >
                  <div className="font-medium">{sector.nome}</div>
                  {sector.responsavel && (
                    <div className="text-sm text-gray-400">
                      Responsável: {sector.responsavel}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowTransferDialog(false)}
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmTransfer}
              disabled={!selectedSector}
              className="bg-[#10b981] hover:bg-[#0d8e6a] text-white"
            >
              <Share className="h-4 w-4 mr-2" />
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de finalização */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Finalizar conversa</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-300">
              Tem certeza que deseja finalizar esta conversa?
              A conversa será movida para a lista de conversas concluídas.
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowFinishDialog(false)}
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmFinish}
              className="bg-[#10b981] hover:bg-[#0d8e6a] text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de arquivamento */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Arquivar conversa</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-300">
              Tem certeza que deseja arquivar esta conversa?
              Conversas arquivadas não serão mais exibidas em nenhuma lista.
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmArchive}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConversationsPage;