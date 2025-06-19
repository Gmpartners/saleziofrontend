import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCircle, MoreVertical, CheckCircle, Archive, Loader2, Phone, Video, X, Share } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import MessageStatus from './MessageStatus';
import TypingIndicator from './TypingIndicator';
import { notificationService } from '../../services/notificationService';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useConversation } from '../../hooks/useConversation';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
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
import { useAuthContext } from '../../hooks/useAuthContext';

const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  ARQUIVADA: 'arquivada'
};

const ConversationHeader = React.memo(({ 
  conversation, 
  onBack,
  isConnected, 
  onShowActionMenu,
  isConversationFinished
}) => {
  if (!conversation) return null;
  
  const { nomeCliente, telefoneCliente } = conversation;
  const setorNome = conversation.setorId?.nome || conversation.setorInfo?.nome;
  
  const initials = nomeCliente
    ? nomeCliente
        .split(' ')
        .slice(0, 2)
        .map(name => name && name[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
    : 'C';

  return (
    <div className="flex items-center justify-between gap-3 p-4 lg:p-6 pt-4 bg-[#070b11] sticky top-0 z-30 border-b border-[#1f2937]/40">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center h-8 w-8 rounded-full bg-[#0f1621] text-slate-400 hover:text-white md:hidden"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <Avatar className="h-10 w-10 border-2 border-[#10b981]/30">
          <AvatarFallback className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <h3 className="text-white font-medium">{nomeCliente || 'Cliente'}</h3>
          <div className="text-xs flex items-center space-x-2">
            <span className="text-slate-400">{telefoneCliente || 'Sem telefone'}</span>
            <Badge 
              variant="outline" 
              className={
                conversation.status === STATUS.EM_ANDAMENTO
                  ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20"
                  : conversation.status === STATUS.AGUARDANDO
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }
            >
              {conversation.status === STATUS.EM_ANDAMENTO 
                ? 'Em atendimento' 
                : conversation.status === STATUS.AGUARDANDO
                  ? 'Aguardando'
                  : 'Finalizada'
              }
            </Badge>
            
            {setorNome && (
              <Badge variant="outline" className="bg-[#101820] text-white border-[#1f2937]/50 hidden sm:inline-flex">
                {setorNome}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#10b981]">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#10b981]' : 'bg-red-500'}`}></span>
          <span className="hidden sm:inline">{isConnected ? 'Conectado' : 'Desconectado'}</span>
        </div>
        
        <Button 
          size="icon"
          variant="ghost"
          className="rounded-full h-8 w-8 text-slate-400 hover:text-[#10b981] hover:bg-[#101820]"
          title="Chamada de vídeo"
          disabled={isConversationFinished}
        >
          <Video className="h-4 w-4" />
        </Button>
        
        <Button 
          size="icon"
          variant="ghost"
          className="rounded-full h-8 w-8 text-slate-400 hover:text-[#10b981] hover:bg-[#101820]"
          title="Chamada de voz"
          disabled={isConversationFinished}
        >
          <Phone className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              size="icon"
              variant="ghost"
              className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-[#101820]"
              aria-label="Mais opções"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#070b11] border border-[#1f2937]/40 shadow-md z-40">
            <DropdownMenuItem 
              className="flex items-center cursor-pointer text-white hover:bg-[#101820] focus:bg-[#101820]"
              onClick={() => onShowActionMenu('finalizar')}
              disabled={isConversationFinished}
            >
              <CheckCircle className="h-4 w-4 text-[#10b981] mr-2" />
              <span>Finalizar Conversa</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              className="flex items-center cursor-pointer text-white hover:bg-[#101820] focus:bg-[#101820]"
              onClick={() => onShowActionMenu('transferir')}
              disabled={isConversationFinished}
            >
              <Share className="h-4 w-4 text-blue-400 mr-2" />
              <span>Transferir</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-[#1f2937]/40" />
            
            <DropdownMenuItem 
              className="flex items-center cursor-pointer text-red-400 hover:bg-[#101820] focus:bg-[#101820]"
              onClick={() => onShowActionMenu('arquivar')}
            >
              <Archive className="h-4 w-4 mr-2" />
              <span>Arquivar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

const MessageList = React.memo(({ 
  messages = [], 
  isTyping, 
  onRetryMessage,
  messagesEndRef
}) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#101820] flex items-center justify-center mb-4">
            <UserCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg text-white font-medium mb-2">Nenhuma mensagem</h3>
          <p className="text-slate-400 max-w-md px-4">
            Envie a primeira mensagem para iniciar a conversa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 p-4">
      {messages.map((message, index) => (
        <MessageBubble 
          key={message._id || `msg-${index}`} 
          message={message} 
          prevMessage={index > 0 ? messages[index - 1] : null}
          isGrouped={
            index > 0 && 
            messages[index - 1].remetente === message.remetente &&
            new Date(message.timestamp) - new Date(messages[index - 1].timestamp) < 60000
          }
          isLastInGroup={
            index < messages.length - 1 ? 
            messages[index + 1].remetente !== message.remetente : true
          }
          onRetry={onRetryMessage}
        />
      ))}
      
      {isTyping && <TypingIndicator user="Digitando..." />}
      
      <div ref={messagesEndRef} />
    </div>
  );
});

const LoadingSkeleton = () => (
  <div className="h-full flex flex-col p-4 gap-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-6 w-40" />
    </div>
    
    <div className="flex-1 p-4 space-y-4">
      <div className="flex justify-start">
        <Skeleton className="h-12 w-3/4 rounded-lg" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-3/4 rounded-lg" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-12 w-2/4 rounded-lg" />
      </div>
    </div>
    
    <div className="p-3 border-t border-[#1f2937]/40">
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>
  </div>
);

const ConversationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sectors } = useAuthContext();
  const { 
    selectedConversation, 
    selectConversation, 
    sendMessage,
    retryFailedMessage,
    isConnected,
    sendTypingIndicator,
    transferConversation,
    finishConversation,
    archiveConversation,
    refreshConversations,
    refreshCompletedConversations,
    loading: conversationLoading
  } = useConversation(id);
  
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionType, setActionType] = useState(null);
  
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const isUpdatePendingRef = useRef(false);
  
  // Substituindo os diálogos modais por componentes de Dialog
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);

  useEffect(() => {
    if (id) {
      selectConversation(id);
    }
    
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [id, selectConversation, typingTimeout]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && messageListRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (selectedConversation?.mensagens?.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [selectedConversation?.mensagens, scrollToBottom]);

  const handleBack = () => {
    navigate('/conversations', { replace: true });
  };

  const handleSendMessage = async (text) => {
    if (!text || !id) {
      notificationService.showToast('Não foi possível enviar a mensagem: Texto vazio ou conversa inválida', 'error');
      return false;
    }
    
    if (!isConnected) {
      notificationService.showToast('Você está desconectado. Verifique sua conexão.', 'error');
      return false;
    }
    
    setIsActionLoading(true);
    setActionType('message');
    
    try {
      await sendMessage(id, text);
      setTimeout(scrollToBottom, 100);
      return true;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      notificationService.showToast(`Erro ao enviar mensagem: ${error.message || 'Falha na comunicação'}`, 'error');
      return false;
    } finally {
      setIsActionLoading(false);
      setActionType(null);
    }
  };

  const handleTyping = () => {
    setIsTyping(true);
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    if (id && isConnected && !isUpdatePendingRef.current) {
      isUpdatePendingRef.current = true;
      sendTypingIndicator(id);
      
      setTimeout(() => {
        isUpdatePendingRef.current = false;
      }, 1000);
    }
    
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  const handleRetryMessage = (messageId, content) => {
    if (!id) return;
    retryFailedMessage(id, messageId, content);
    setTimeout(scrollToBottom, 100);
  };
  
  const handleShowActionMenu = (action) => {
    switch (action) {
      case 'transferir':
        setShowTransferDialog(true);
        break;
      case 'finalizar':
        setShowFinishDialog(true);
        break;
      case 'arquivar':
        setShowArchiveDialog(true);
        break;
      default:
        break;
    }
  };
  
  const handleTransferConversation = async () => {
    if (!selectedConversation || isActionLoading || !selectedSector) return;
    
    try {
      setIsActionLoading(true);
      setActionType('transferir');
      
      const success = await transferConversation(selectedConversation._id, selectedSector);
      
      if (success) {
        notificationService.showToast('Conversa transferida com sucesso', 'success');
        
        // Atualize as conversas com um filtro vazio para garantir que todas sejam atualizadas
        await refreshConversations({});
        
        setSelectedSector(null);
        setShowTransferDialog(false);
      } else {
        notificationService.showToast('Erro ao transferir conversa. Tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      notificationService.showToast('Erro ao transferir conversa: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsActionLoading(false);
      setActionType(null);
    }
  };
  
  const handleFinishConversation = async () => {
    if (!selectedConversation || isActionLoading) return;
    
    try {
      setIsActionLoading(true);
      setActionType('finalizar');
      
      const success = await finishConversation(selectedConversation._id);
      
      if (success) {
        notificationService.showToast('Conversa finalizada com sucesso', 'success');
        
        // Atualize tanto as conversas ativas quanto as concluídas
        await refreshConversations({});
        await refreshCompletedConversations();
        
        setShowFinishDialog(false);
      } else {
        notificationService.showToast('Erro ao finalizar conversa. Tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      notificationService.showToast('Erro ao finalizar conversa: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsActionLoading(false);
      setActionType(null);
    }
  };
  
  const handleArchiveConversation = async () => {
    if (!selectedConversation || isActionLoading) return;
    
    try {
      setIsActionLoading(true);
      setActionType('arquivar');
      
      const success = await archiveConversation(selectedConversation._id);
      
      if (success) {
        notificationService.showToast('Conversa arquivada com sucesso', 'success');
        navigate('/conversations', { replace: true });
      } else {
        notificationService.showToast('Erro ao arquivar conversa. Tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      notificationService.showToast('Erro ao arquivar conversa: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsActionLoading(false);
      setActionType(null);
    }
  };

  // Conteúdo do Dialog de transferência
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

  if (conversationLoading) {
    return <LoadingSkeleton />;
  }

  if (!selectedConversation) {
    return (
      <div className="h-full flex flex-col p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-[#0f1621] text-slate-400 hover:text-white"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Detalhes da Conversa</h1>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-[#10b981] border-[#1f2937]/50 rounded-full animate-spin mb-4 mx-auto"></div>
            <p className="text-slate-400">Carregando conversa...</p>
          </div>
        </div>
      </div>
    );
  }

  const { mensagens = [], status } = selectedConversation;
  const isConversationFinished = status && status.toLowerCase() === STATUS.FINALIZADA;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ConversationHeader 
        conversation={selectedConversation}
        onBack={handleBack}
        isConnected={isConnected}
        onShowActionMenu={handleShowActionMenu}
        isConversationFinished={isConversationFinished}
      />
      
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar bg-[#070b11]"
        ref={messageListRef}
      >
        <MessageList 
          messages={mensagens}
          isTyping={isTyping}
          onRetryMessage={handleRetryMessage}
          messagesEndRef={messagesEndRef}
        />
      </div>
      
      <MessageInput 
        onSubmit={handleSendMessage}
        onTyping={handleTyping}
        disabled={!isConnected || isConversationFinished}
        isSubmitting={isActionLoading && actionType === 'message'}
      />
      
      {/* Dialog de Transferência */}
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
              disabled={isActionLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleTransferConversation}
              disabled={!selectedSector || isActionLoading}
              className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
            >
              {isActionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share className="h-4 w-4 mr-2" />
              )}
              {isActionLoading ? 'Transferindo...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de Finalização */}
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
              disabled={isActionLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleFinishConversation}
              disabled={isActionLoading}
              className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
            >
              {isActionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isActionLoading ? 'Finalizando...' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de Arquivamento */}
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
              disabled={isActionLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleArchiveConversation}
              variant="destructive"
              disabled={isActionLoading}
              className="hover:opacity-90"
            >
              {isActionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              {isActionLoading ? 'Arquivando...' : 'Arquivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConversationDetail;