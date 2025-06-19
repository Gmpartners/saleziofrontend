import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MessageSquare, 
  X,
  Check,
  Share,
  Bell,
  BellOff,
  RefreshCw,
  Loader2
} from 'lucide-react';

import { useSocket } from '../../contexts/SocketContext';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useMessageEffect } from '../../hooks/chat/useMessageEffect';
import { notificationService } from '../../services/notificationService';
import { cn } from "@/lib/utils";
import { useWindowSize } from '../../hooks/useWindowSize';

import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import ConversationsList from '../../components/conversations/ConversationsList';
import ConversationDetailView from '../../components/conversations/ConversationDetailView';

const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  ARQUIVADA: 'arquivada'
};

const ConversationsPage = () => {
  const { userProfile, userSetor, sectors } = useAuthContext();
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
    typingUsers,
    sendTypingIndicator
  } = useSocket();

  const { notificationsEnabled, toggleNotifications } = useMessageEffect();
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const isUpdatingRef = useRef(false);
  
  // Estado para filtros (adicionado do admin)
  const [filters, setFilters] = useState({
    arquivada: false,
    sectorFilter: 'all',
    searchTerm: ''
  });
  
  const [activeTab, setActiveTab] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Handler para alteração de filtros
  const handleFilterChange = useCallback((name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);
  
  useEffect(() => {
    if (hasUnreadMessages) {
      clearUnreadMessages();
    }
  }, [hasUnreadMessages, clearUnreadMessages]);
  
  // Efeito para carregar conversas com filtros
  useEffect(() => {
    const loadConversations = async () => {
      if (isUpdatingRef.current) return;
      
      setIsRefreshing(true);
      setLoadingError(null);
      isUpdatingRef.current = true;
      
      try {
        // Aplicar filtros na chamada de API
        const apiFilters = {
          status: activeTab === 'finalizada' 
            ? 'finalizada' 
            : activeTab === 'aguardando'
              ? 'aguardando'
              : activeTab === 'em_andamento'
                ? 'em_andamento'
                : undefined,
          search: filters.searchTerm || undefined,
          setor: filters.sectorFilter !== 'all' ? filters.sectorFilter : undefined,
          arquivada: filters.arquivada
        };
        
        await refreshConversations(apiFilters);
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        setLoadingError('Não foi possível carregar as conversas. Tente novamente.');
      } finally {
        setIsRefreshing(false);
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 500);
      }
    };
    
    loadConversations();
  }, [refreshConversations, activeTab, filters.sectorFilter, filters.searchTerm]); // Dependências adicionadas
  
  useEffect(() => {
    const loadCompletedConversations = async () => {
      if (activeTab === 'completed' && (!completedConversations || completedConversations.length === 0) && !isUpdatingRef.current) {
        setIsRefreshing(true);
        isUpdatingRef.current = true;
        
        try {
          await refreshCompletedConversations();
        } catch (error) {
          console.error('Erro ao carregar conversas concluídas:', error);
        } finally {
          setIsRefreshing(false);
          isUpdatingRef.current = false;
        }
      }
    };

    loadCompletedConversations();
  }, [activeTab, completedConversations, refreshCompletedConversations]);
  
  useEffect(() => {
    if (!selectedConversation && mobileView === 'detail') {
      setMobileView('list');
    }
  }, [selectedConversation, mobileView]);
  
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isUpdatingRef.current) return;
    
    setIsRefreshing(true);
    isUpdatingRef.current = true;
    
    try {
      // Incluir filtros na atualização
      const apiFilters = {
        status: activeTab === 'finalizada' 
          ? 'finalizada' 
          : activeTab === 'aguardando'
            ? 'aguardando'
            : activeTab === 'em_andamento'
              ? 'em_andamento'
              : undefined,
        search: filters.searchTerm || undefined,
        setor: filters.sectorFilter !== 'all' ? filters.sectorFilter : undefined,
        arquivada: filters.arquivada
      };
      
      if (activeTab === 'completed') {
        await refreshCompletedConversations(apiFilters);
      } else {
        await refreshConversations(apiFilters);
      }
      
      notificationService.showToast('Conversas atualizadas', 'success');
    } catch (error) {
      console.error('Erro ao atualizar conversas:', error);
      notificationService.showToast('Erro ao atualizar conversas', 'error');
    } finally {
      setIsRefreshing(false);
      isUpdatingRef.current = false;
    }
  }, [activeTab, refreshCompletedConversations, refreshConversations, filters, isRefreshing]);
  
  const handleSelectConversation = useCallback((conversationId) => {
    if (selectedConversation && selectedConversation._id === conversationId) {
      if (isMobile && mobileView !== 'detail') {
        setMobileView('detail');
      }
      return;
    }
    
    selectConversation(conversationId);
    
    if (isMobile) {
      setMobileView('detail');
    }
  }, [selectConversation, isMobile, selectedConversation, mobileView]);
  
  const handleBackToList = useCallback(() => {
    setMobileView('list');
  }, []);
  
  const handleSendMessage = useCallback(async (conversationId, text) => {
    if (!text.trim() || !conversationId) return;
    
    try {
      return await sendMessage(conversationId, text);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }, [sendMessage]);
  
  const handleShowTransferDialog = useCallback(() => {
    setShowTransferDialog(true);
  }, []);
  
  const handleShowFinishDialog = useCallback(() => {
    setShowFinishDialog(true);
  }, []);
  
  const handleShowArchiveDialog = useCallback(() => {
    setShowArchiveDialog(true);
  }, []);
  
  const handleTypingIndicator = useCallback((conversationId) => {
    if (conversationId && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      sendTypingIndicator(conversationId);
      
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 1000);
    }
  }, [sendTypingIndicator]);
  
  const handleConfirmTransfer = useCallback(async () => {
    if (!selectedConversation || !selectedSector || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const success = await transferConversation(selectedConversation._id, selectedSector);
      
      if (success) {
        notificationService.showToast('Conversa transferida com sucesso', 'success');
        setSelectedSector(null);
        setShowTransferDialog(false);
        
        // Atualizar com filtros
        const apiFilters = {
          status: activeTab === 'finalizada' 
            ? 'finalizada' 
            : activeTab === 'aguardando'
              ? 'aguardando'
              : activeTab === 'em_andamento'
                ? 'em_andamento'
                : undefined,
          search: filters.searchTerm || undefined,
          setor: filters.sectorFilter !== 'all' ? filters.sectorFilter : undefined,
          arquivada: filters.arquivada
        };
        
        await refreshConversations(apiFilters);
      } else {
        notificationService.showToast('Erro ao transferir conversa. Verifique sua conexão e tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      notificationService.showToast('Erro ao transferir conversa: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedConversation, selectedSector, isProcessing, transferConversation, refreshConversations, activeTab, filters]);
  
  const handleConfirmFinish = useCallback(async () => {
    if (!selectedConversation || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const success = await finishConversation(selectedConversation._id);
      
      if (success) {
        notificationService.showToast('Conversa finalizada com sucesso', 'success');
        setShowFinishDialog(false);
        
        // Atualizar com filtros
        const apiFilters = {
          search: filters.searchTerm || undefined,
          setor: filters.sectorFilter !== 'all' ? filters.sectorFilter : undefined,
          arquivada: filters.arquivada
        };
        
        await refreshConversations(apiFilters);
        await refreshCompletedConversations(apiFilters);
      } else {
        notificationService.showToast('Erro ao finalizar conversa. Verifique sua conexão e tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      notificationService.showToast('Erro ao finalizar conversa: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedConversation, isProcessing, finishConversation, refreshConversations, refreshCompletedConversations, filters]);
  
  const handleConfirmArchive = useCallback(async () => {
    if (!selectedConversation || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const success = await archiveConversation(selectedConversation._id);
      
      if (success) {
        notificationService.showToast('Conversa arquivada com sucesso', 'success');
        setShowArchiveDialog(false);
        
        // Atualizar com filtros
        const apiFilters = {
          search: filters.searchTerm || undefined,
          setor: filters.sectorFilter !== 'all' ? filters.sectorFilter : undefined,
          arquivada: filters.arquivada
        };
        
        await refreshConversations(apiFilters);
        await refreshCompletedConversations(apiFilters);
      } else {
        notificationService.showToast('Erro ao arquivar conversa. Verifique sua conexão e tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      notificationService.showToast('Erro ao arquivar conversa: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedConversation, isProcessing, archiveConversation, refreshConversations, refreshCompletedConversations, filters]);
  
  const handleToggleNotifications = useCallback(() => {
    toggleNotifications(!notificationsEnabled);
    
    notificationService.showToast(
      notificationsEnabled ? 'Notificações desativadas' : 'Notificações ativadas',
      'info'
    );
  }, [notificationsEnabled, toggleNotifications]);
  
  const getActiveConversations = useCallback(() => {
    if (activeTab === 'finalizada') {
      return completedConversations || [];
    }
    
    if (!conversations) return [];
    
    if (activeTab === 'aguardando') {
      return conversations.filter(c => 
        c.status && c.status.toLowerCase() === STATUS.AGUARDANDO
      );
    }
    
    if (activeTab === 'em_andamento') {
      return conversations.filter(c => 
        c.status && c.status.toLowerCase() === STATUS.EM_ANDAMENTO
      );
    }
    
    return conversations;
  }, [activeTab, conversations, completedConversations]);
  
  const transferDialogContent = useCallback(() => (
    <RadioGroup value={selectedSector} onValueChange={setSelectedSector}>
      <div className="space-y-3 max-h-[300px] overflow-auto">
        {sectors && sectors.map(sector => (
          <div key={sector._id || sector.id} className="flex items-start space-x-2">
            <RadioGroupItem 
              value={sector._id || sector.id} 
              id={`sector-${sector._id || sector.id}`}
              className="mt-1 text-[#10b981] border-[#1f2937]/40"
            />
            <Label 
              htmlFor={`sector-${sector._id || sector.id}`}
              className="flex-1 cursor-pointer text-white"
            >
              <div className="font-medium">{sector.nome}</div>
              {sector.responsavel && (
                <div className="text-sm text-slate-400">
                  Responsável: {sector.responsavel}
                </div>
              )}
            </Label>
          </div>
        ))}
      </div>
    </RadioGroup>
  ), [sectors, selectedSector]);

  return (
    <div className="h-full w-full flex flex-col bg-[#070b11] relative">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[url('https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/grid-pattern-dark.svg')] bg-repeat"></div>
      </div>
      
      <div className="flex-1 w-full h-full overflow-hidden relative z-10">
        <div className="h-full flex flex-col md:flex-row">
          <div className={cn(
            "h-full md:w-1/3 md:border-r border-[#1f2937]/40",
            isMobile && mobileView === 'detail' ? "hidden" : "flex-1"
          )}>
            <ConversationsList 
              conversations={getActiveConversations()}
              onSelectConversation={handleSelectConversation}
              isLoading={isLoading || isRefreshing}
              error={loadingError}
              onRefresh={handleRefresh}
              sectors={sectors}
              userSector={userSetor}
              selectedConversationId={selectedConversation?._id}
              showNotifications={notificationsEnabled}
              onToggleNotifications={handleToggleNotifications}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              filters={filters}
              onFilterChange={handleFilterChange}
              onSearchChange={(term) => handleFilterChange('searchTerm', term)}
            />
          </div>
          
          <div className={cn(
            "h-full md:w-2/3", 
            isMobile && mobileView === 'list' ? "hidden" : "flex-1"
          )}>
            {selectedConversation ? (
              <ConversationDetailView 
                conversation={selectedConversation}
                isConnected={isConnected}
                isProcessing={isProcessing}
                typingUsers={typingUsers}
                onSendMessage={handleSendMessage}
                onTypingIndicator={handleTypingIndicator}
                onShowFinishModal={handleShowFinishDialog}
                onShowTransferModal={handleShowTransferDialog}
                onShowArchiveModal={handleShowArchiveDialog}
                onBack={isMobile ? handleBackToList : undefined}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[#070b11]">
                <div className="w-16 h-16 rounded-full bg-[#101820] flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl text-white font-medium mb-2">Selecione uma conversa</h3>
                <p className="text-slate-400 max-w-md">
                  Escolha uma conversa da lista para visualizar as mensagens e interagir com o cliente.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Diálogos de ação */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white">
          <DialogHeader>
            <DialogTitle>Transferir conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Selecione o setor para o qual deseja transferir esta conversa
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {transferDialogContent()}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowTransferDialog(false)}
              className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmTransfer}
              disabled={!selectedSector || isProcessing}
              className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? 'Transferindo...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white">
          <DialogHeader>
            <DialogTitle>Finalizar conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja finalizar esta conversa?
              A conversa será movida para a lista de conversas concluídas.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowFinishDialog(false)}
              className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmFinish}
              disabled={isProcessing}
              className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? 'Finalizando...' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white">
          <DialogHeader>
            <DialogTitle>Arquivar conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja arquivar esta conversa?
              Conversas arquivadas não serão mais exibidas em nenhuma lista.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmArchive}
              variant="destructive"
              disabled={isProcessing}
              className="hover:opacity-90"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? 'Arquivando...' : 'Arquivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConversationsPage;