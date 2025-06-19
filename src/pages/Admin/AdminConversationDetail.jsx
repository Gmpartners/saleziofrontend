import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageSquare, 
  X,
  Check,
  Share,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowLeft,
  User,
  Send,
  Calendar,
  Trash2,
  Phone,
  Bot,
  Headset,
  Video,
  MoreVertical,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { multiflowApi } from '../../services/multiflowApi';
import { useAuthContext } from '../../hooks/useAuthContext';
import { socketService } from '../../services/socket';
import { cn } from "../../lib/utils";

import MessageBubble from '../../components/conversations/MessageBubble';
import TypingIndicator from '../../components/conversations/TypingIndicator';

import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "../../components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../../components/ui/dropdown-menu";

const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  ARQUIVADA: 'arquivada'
};

const STATUS_LABELS = {
  aguardando: 'Aguardando',
  em_andamento: 'Em Andamento',
  finalizada: 'Finalizada',
  arquivada: 'Arquivada'
};

const ConversationHeader = React.memo(({ 
  conversation, 
  onBack, 
  onRefresh, 
  isConnected, 
  isLoading,
  onShowActionMenu,
  isRefreshing,
  onToggleInfoPanel
}) => {
  if (!conversation) return null;
  
  const nomeCliente = conversation.nomeCliente || conversation.cliente?.nome || 'Cliente';
  const telefoneCliente = conversation.telefoneCliente || conversation.cliente?.telefone || '';
  const setorNome = conversation.setorId?.nome || conversation.setorInfo?.nome || 'Não definido';
  
  const initials = nomeCliente
    .split(' ')
    .slice(0, 2)
    .map(name => name && name[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
  
  let statusBadge = null;
  if (conversation.status) {
    const statusLower = conversation.status.toLowerCase();
    
    if (statusLower === STATUS.AGUARDANDO) {
      statusBadge = (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
          Aguardando
        </Badge>
      );
    } else if (statusLower === STATUS.EM_ANDAMENTO) {
      statusBadge = (
        <Badge variant="outline" className="bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20">
          Em atendimento
        </Badge>
      );
    } else if (statusLower === STATUS.FINALIZADA) {
      statusBadge = (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
          Finalizada
        </Badge>
      );
    }
  }
  
  const isConversationFinished = conversation.status === STATUS.FINALIZADA || conversation.arquivada;
  
  return (
    <div className="flex items-center justify-between gap-1 sm:gap-3 p-2 sm:p-4 bg-[#070b11] sticky top-0 z-30 border-b border-[#1f2937]/40 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-[#101820]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-[#10b981]/30">
          <AvatarFallback className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white">
            {initials || <User className="h-4 w-4 sm:h-5 sm:w-5" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="overflow-hidden">
          <h3 className="text-white font-medium text-sm sm:text-base truncate">{nomeCliente}</h3>
          <div className="text-xs flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="text-slate-400 text-xs truncate hidden sm:inline">{telefoneCliente || 'Sem telefone'}</span>
            {statusBadge}
            
            <Badge variant="outline" className="bg-[#101820] text-white border-[#1f2937]/50 text-xs">
              {setorNome}
            </Badge>
            
            {conversation.arquivada && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                Arquivada
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2">
        <Button 
          size="icon"
          variant="ghost"
          className="rounded-full h-8 w-8 sm:flex hidden text-slate-400 hover:text-[#10b981] hover:bg-[#101820]"
          title="Chamada de vídeo"
          disabled={isConversationFinished}
          onClick={() => toast.info('Chamada de vídeo não implementada')}
        >
          <Video className="h-4 w-4" />
        </Button>
        
        <Button 
          size="icon"
          variant="ghost"
          className="rounded-full h-8 w-8 sm:flex hidden text-slate-400 hover:text-[#10b981] hover:bg-[#101820]"
          title="Chamada de voz"
          disabled={isConversationFinished}
          onClick={() => toast.info('Chamada de voz não implementada')}
        >
          <Phone className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleInfoPanel}
          className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-[#101820]"
          title="Informações da conversa"
        >
          <Info className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              size="icon"
              variant="ghost"
              className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-[#101820]"
              aria-label="Mais opções"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#070b11] border border-[#1f2937]/40 shadow-md z-40">
            <DropdownMenuItem 
              className="flex items-center cursor-pointer text-white hover:bg-[#101820] focus:bg-[#101820]"
              onClick={() => onShowActionMenu('finalizar')}
              disabled={isConversationFinished}
            >
              <Check className="h-4 w-4 text-[#10b981] mr-2" />
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
              className="flex items-center cursor-pointer text-amber-400 hover:bg-[#101820] focus:bg-[#101820]"
              onClick={() => onShowActionMenu(conversation.arquivada ? 'desarquivar' : 'arquivar')}
            >
              <X className="h-4 w-4 mr-2" />
              <span>{conversation.arquivada ? 'Desarquivar' : 'Arquivar'}</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              className="flex items-center cursor-pointer text-red-400 hover:bg-[#101820] focus:bg-[#101820]"
              onClick={() => onShowActionMenu('excluir')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span>Excluir</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#10b981]' : 'bg-red-500'}`}></div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-[#101820]"
            title={isConnected ? "Atualizar conversa" : "Reconectar"}
            onClick={isConnected ? onRefresh : () => socketService.reconnect()}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

const ParticipantLegend = React.memo(() => {
  return (
    <div className="flex justify-center py-2">
      <div className="flex items-center space-x-2 sm:space-x-4 bg-[#101820] rounded-lg px-2 py-1 border border-[#1f2937]/40 text-xs sm:text-sm">
        <div className="flex items-center">
          <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-blue-400" />
          <span className="text-blue-400">Cliente</span>
        </div>
        <div className="flex items-center">
          <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-purple-400" />
          <span className="text-purple-400">Assist. Virtual</span>
        </div>
        <div className="flex items-center">
          <Headset className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-green-400" />
          <span className="text-green-400">Atendente</span>
        </div>
      </div>
    </div>
  );
});

const CustomMessageBubble = React.memo(({ message, prevMessage, nextMessage }) => {
  const isClient = message.remetente === 'cliente';
  const isAI = message.remetente === 'ai' || message.remetente === 'assistente' || message.tipo === 'ai';
  const isSystem = message.remetente === 'sistema' || message.remetente === 'system';
  const isAttendant = message.remetente === 'atendente';
  
  const isRightAligned = !isClient;

  const isPreviousSameRemetente = prevMessage && 
    prevMessage.remetente === message.remetente &&
    new Date(message.timestamp) - new Date(prevMessage.timestamp) < 300000;

  const isNextSameRemetente = nextMessage && 
    nextMessage.remetente === message.remetente &&
    new Date(nextMessage.timestamp) - new Date(message.timestamp) < 300000;

  const isFirstInGroup = !isPreviousSameRemetente;
  const isLastInGroup = !isNextSameRemetente;
  
  const getFormattedTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };
  
  let bgColor, textColor, iconComponent;

  if (isClient) {
    bgColor = 'bg-blue-500/10 border border-blue-500/20';
    textColor = 'text-white';
    iconComponent = <User className="h-4 w-4 text-blue-400" />;
  } else if (isAI) {
    bgColor = 'bg-purple-500/10 border border-purple-500/20'; 
    textColor = 'text-white';
    iconComponent = <Bot className="h-4 w-4 text-purple-400" />;
  } else if (isSystem) {
    bgColor = 'bg-yellow-500/10 border border-yellow-500/20';
    textColor = 'text-white';
    iconComponent = <AlertCircle className="h-4 w-4 text-yellow-400" />;
  } else {
    bgColor = 'bg-[#10b981]/10 border border-[#10b981]/20';
    textColor = 'text-white';
    iconComponent = <Headset className="h-4 w-4 text-[#10b981]" />;
  }
  
  const getCornerRadiusClasses = () => {
    const baseRadius = "rounded-lg";
    
    if (isFirstInGroup && isLastInGroup) {
      return baseRadius;
    }
    
    if (!isFirstInGroup && !isLastInGroup) {
      if (isRightAligned) {
        return `${baseRadius} rounded-tr-none rounded-br-none`;
      } else {
        return `${baseRadius} rounded-tl-none rounded-bl-none`;
      }
    }
    
    if (!isFirstInGroup && isLastInGroup) {
      if (isRightAligned) {
        return `${baseRadius} rounded-tr-none`;
      } else {
        return `${baseRadius} rounded-tl-none`;
      }
    }
    
    if (isFirstInGroup && !isLastInGroup) {
      if (isRightAligned) {
        return `${baseRadius} rounded-br-none`;
      } else {
        return `${baseRadius} rounded-bl-none`;
      }
    }
    
    return baseRadius;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${isRightAligned ? 'justify-end' : 'justify-start'} ${!isLastInGroup ? 'mb-0.5' : 'mb-2'} ${!isFirstInGroup ? 'mt-0.5' : 'mt-3'}`}
    >
      <div className={`flex ${isRightAligned ? 'flex-row-reverse' : 'flex-row'} items-start max-w-[85%] sm:max-w-[75%]`}>
        {isFirstInGroup ? (
          <div className="flex items-center justify-center rounded-full p-1 mx-1 sm:mx-2 flex-shrink-0 w-7 sm:w-8">
            {iconComponent}
          </div>
        ) : (
          <div className="w-7 sm:w-8 mx-1 sm:mx-2 flex-shrink-0" />
        )}
        
        <div className={`p-2 sm:p-3 ${getCornerRadiusClasses()} ${bgColor} ${textColor} break-words`}>
          {isFirstInGroup && (
            <div className="text-xs font-medium mb-1 text-slate-300">{message.nome}</div>
          )}
          
          <div className="text-xs sm:text-sm whitespace-pre-wrap">{message.conteudo}</div>
          
          {isLastInGroup && (
            <div className="text-xs text-right mt-1 text-slate-400">
              {getFormattedTime(message.timestamp)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

const MessageList = React.memo(({ 
  messages = [], 
  isTyping,
  messagesEndRef
}) => {
  if (!messages || messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#101820] flex items-center justify-center mb-4">
          <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
        </div>
        <h3 className="text-lg sm:text-xl text-white font-medium mb-2">Conversa sem mensagens</h3>
        <p className="text-slate-400 max-w-md text-sm sm:text-base">
          Não há mensagens nesta conversa.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ParticipantLegend />
      <AnimatePresence>
        <div className="w-full pb-4 flex flex-col">
          {messages.map((message, index) => (
            <CustomMessageBubble 
              key={message._id || `msg-${index}`}
              message={message}
              prevMessage={index > 0 ? messages[index - 1] : null}
              nextMessage={index < messages.length - 1 ? messages[index + 1] : null}
            />
          ))}
          
          {isTyping && (
            <div className="flex justify-start mt-2">
              <TypingIndicator isTyping={true} />
            </div>
          )}
        </div>
      </AnimatePresence>
      <div ref={messagesEndRef} className="h-px w-full" />
    </div>
  );
});

const MessageInput = React.memo(({ 
  value, 
  onChange, 
  onSubmit, 
  disabled, 
  isSending,
  inputRef 
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-2 sm:p-3 border-t border-[#1f2937]/40 bg-[#0c1118] sticky bottom-0 z-20 flex-shrink-0">
      <div className="flex gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Conversa finalizada ou arquivada" : "Digite sua mensagem..."}
          className="flex-1 bg-[#0f1621] border border-[#1f2937]/50 text-white rounded-md px-3 py-2 sm:px-4 sm:py-2.5 focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50 text-sm"
          ref={inputRef}
          disabled={disabled || isSending}
        />
        <Button
          type="submit"
          disabled={!value.trim() || disabled || isSending}
          className="px-3 sm:px-4 bg-[#10b981] text-white rounded-md hover:bg-[#0d9268] disabled:opacity-50 disabled:hover:bg-[#10b981]"
        >
          {isSending ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Send className="h-4 w-4 sm:h-5 sm:w-5" />}
        </Button>
      </div>
      
      {disabled && (
        <div className="mt-2 text-center text-xs text-slate-400">
          Esta conversa foi {disabled === 'finalizada' ? 'finalizada' : 'arquivada'}
        </div>
      )}
    </form>
  );
});

const InfoPanel = React.memo(({ 
  conversation, 
  onShowActionMenu,
  isProcessing,
  onClose
}) => {
  if (!conversation) return null;
  
  const nomeCliente = conversation.nomeCliente || conversation.cliente?.nome || 'Cliente';
  const telefoneCliente = conversation.telefoneCliente || conversation.cliente?.telefone || '';
  const setorNome = conversation.setorId?.nome || conversation.setorInfo?.nome || 'Não definido';
  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Não disponível';
    
    let date;
    try {
      if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp && typeof timestamp === 'string') {
        date = parseISO(timestamp);
      } else {
        return 'Não disponível';
      }
      
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar timestamp:", error);
      return 'Data inválida';
    }
  };
  
  return (
    <div className="p-3 sm:p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-bold text-white">Informações</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="sm:hidden h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-[#101820]"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2">Cliente</h3>
          <div className="bg-[#101820] rounded-lg p-3 border border-[#1f2937]/40">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <User className="h-5 w-5 text-[#10b981]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white text-sm sm:text-base">{nomeCliente}</p>
                <div className="flex items-center text-xs sm:text-sm text-slate-400 mt-1">
                  <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                  {telefoneCliente || 'Não informado'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2">Conversa</h3>
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status:</span>
              {conversation.status ? (
                <Badge variant={conversation.status === 'finalizada' 
                  ? "outline" 
                  : conversation.status === 'aguardando'
                    ? "outline"
                    : "outline"
                } className={conversation.status === 'finalizada'
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : conversation.status === 'aguardando'
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20"
                }>
                  {STATUS_LABELS[conversation.status] || conversation.status}
                </Badge>
              ) : (
                <span className="text-white">Não definido</span>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Setor:</span>
              <Badge variant="outline" className="bg-[#101820] text-white border-[#1f2937]/50">
                {setorNome}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Atendente:</span>
              <span className="text-white">{conversation.atendenteNome || conversation.atendente?.nome || 'Não atribuído'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Arquivada:</span>
              <span className="text-white">{conversation.arquivada ? 'Sim' : 'Não'}</span>
            </div>
            
            <Separator className="my-2 sm:my-3 bg-[#1f2937]/40" />
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Criada em:</span>
              <div className="flex items-center text-white">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-slate-400" />
                {formatTimestamp(conversation.created || conversation.criadoEm || conversation.createdAt)}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Última atividade:</span>
              <div className="flex items-center text-white">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-slate-400" />
                {formatTimestamp(conversation.ultimaAtividade || conversation.updatedAt)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 pt-2 sm:pt-3">
          <Button 
            className="w-full bg-gradient-to-br from-[#10b981] to-[#059669] hover:opacity-90 text-white text-sm"
            onClick={() => onShowActionMenu('transferir')}
            disabled={conversation.status === 'finalizada' || conversation.arquivada || isProcessing}
          >
            <Share className="h-4 w-4 mr-2" />
            Transferir Conversa
          </Button>
          
          <Button 
            className="w-full bg-[#1f2937] hover:opacity-90 text-white text-sm"
            onClick={() => onShowActionMenu('finalizar')}
            disabled={conversation.status === 'finalizada' || conversation.arquivada || isProcessing}
          >
            <Check className="h-4 w-4 mr-2" />
            Finalizar Conversa
          </Button>
          
          {conversation.arquivada ? (
            <Button 
              variant="outline"
              className="w-full border-[#1f2937]/40 bg-[#101820] text-white flex items-center gap-2 hover:bg-[#101820] hover:text-[#10b981] text-sm"
              onClick={() => onShowActionMenu('desarquivar')}
              disabled={isProcessing}
            >
              <Check className="h-4 w-4" />
              Desarquivar Conversa
            </Button>
          ) : (
            <Button 
              variant="outline"
              className="w-full border-[#1f2937]/40 bg-[#101820] text-white flex items-center gap-2 hover:bg-[#101820] hover:text-amber-400 text-sm"
              onClick={() => onShowActionMenu('arquivar')}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
              Arquivar Conversa
            </Button>
          )}
          
          <div className="pt-1">
            <Button 
              variant="destructive"
              className="w-full flex items-center gap-2 text-sm"
              onClick={() => onShowActionMenu('excluir')}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4" />
              Excluir Conversa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

const ConversationNotFound = ({ onBack }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
      <h2 className="text-xl text-white font-medium mb-2">Conversa não encontrada</h2>
      <p className="text-slate-400 mb-6 max-w-md">
        Esta conversa não existe ou pode ter sido removida. Você será redirecionado para a lista de conversas em alguns segundos.
      </p>
      <Button
        onClick={onBack}
        className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar agora
      </Button>
    </div>
  );
};

const AdminConversationDetail = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { apiToken, user, userProfile } = useAuthContext();
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = useRef(5);
  const reconnectAttempts = useRef(0);
  const pollingIntervalRef = useRef(null);
  
  const [conversation, setConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [isConnected, setIsConnected] = useState(socketService.isConnectedToServer());
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [conversationNotFound, setConversationNotFound] = useState(false);
  
  const [message, setMessage] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageContainerRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const fetchRetryCount = useRef(0);
  const maxFetchRetries = 3;
  
  useEffect(() => {
    const handleSocketConnect = () => {
      console.log('Socket conectado.');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      if (userProfile) {
        socketService.authenticate(userProfile?.id || user?.uid, userProfile);
      }
      
      if (conversationId) {
        socketService.subscribeToConversation(conversationId, true);
      }
    };
    
    const handleSocketDisconnect = () => {
      console.log('Socket desconectado.');
      setIsConnected(false);
    };
    
    const handleSocketError = (err) => {
      console.error('Erro no socket:', err);
    };
    
    const unsubscribeConnect = socketService.on('connect', handleSocketConnect);
    const unsubscribeDisconnect = socketService.on('disconnect', handleSocketDisconnect);
    const unsubscribeError = socketService.on('error', handleSocketError);
    
    const unsubscribeNewMessage = socketService.on('nova_mensagem', (data) => {
      if (data && (data.conversaId === conversationId || data.conversationId === conversationId)) {
        fetchConversation(true);
      }
    });
    
    const unsubscribeTyping = socketService.on('typing_indicator', (data) => {
      if (data && (data.conversaId === conversationId || data.conversationId === conversationId)) {
        setIsTyping(true);
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    });
    
    const unsubscribeConversationUpdated = socketService.on('conversa_atualizada', (data) => {
      if (data && (data.conversaId === conversationId || data.conversationId === conversationId || 
          data._id === conversationId)) {
        fetchConversation(true);
      }
    });
    
    if (!socketService.isConnectedToServer()) {
      socketService.reconnect();
    } else if (conversationId) {
      socketService.subscribeToConversation(conversationId, true);
    }
    
    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      unsubscribeNewMessage();
      unsubscribeTyping();
      unsubscribeConversationUpdated();
      
      if (conversationId) {
        try {
          socketService.unsubscribeFromConversation(conversationId, true);
        } catch (error) {
          console.error("Erro ao cancelar inscrição na conversa:", error);
        }
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [conversationId, userProfile, user]);
  
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    const pollInterval = 30000;
    
    pollingIntervalRef.current = setInterval(() => {
      if (conversationId && !isRefreshing && !conversationNotFound) {
        fetchConversation(true);
      }
    }, pollInterval);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [conversationId, isRefreshing, conversationNotFound]);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const fetchSectors = useCallback(async () => {
    try {
      if (!apiToken) {
        return;
      }
      
      const response = await multiflowApi.getSetores(null, true);
      
      if (response.success) {
        setSectors(response.data);
      } else {
        console.warn('Não foi possível obter os setores:', response.error);
      }
    } catch (err) {
      console.error('Erro ao buscar setores:', err);
    }
  }, [apiToken]);
  
  const fetchConversation = useCallback(async (silent = false) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    if (conversationNotFound && fetchRetryCount.current >= maxFetchRetries) {
      return;
    }
    
    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        if (!conversationId) return;
        
        if (!silent) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
        
        setError(null);
        
        if (!apiToken) {
          throw new Error('Token de API não fornecido');
        }
        
        console.log(`Buscando conversa ${conversationId}...`);
        const normalizedId = multiflowApi.getConversaId(conversationId);
        const result = await multiflowApi.getConversa(normalizedId, null, true, true);
        
        if (!result.success) {
          fetchRetryCount.current += 1;
          
          if (fetchRetryCount.current < maxFetchRetries) {
            console.log(`Tentativa ${fetchRetryCount.current} de ${maxFetchRetries} falhou, tentando novamente...`);
            
            if (!silent) {
              setTimeout(() => fetchConversation(silent), 1000 * fetchRetryCount.current);
            }
            return;
          }
          
          throw new Error(result.error || 'Falha ao carregar a conversa');
        }
        
        fetchRetryCount.current = 0;
        console.log('Conversa carregada com sucesso:', result.data);
        setConversation(result.data);
        setConversationNotFound(false);
        
        scrollToBottom();
        
      } catch (err) {
        console.error('Erro ao buscar conversa:', err);
        
        const isNotFoundError = err.message === 'Conversa não encontrada' || 
                               err.message.includes('não encontrada') || 
                               err.message.includes('not found');
        
        if (isNotFoundError) {
          setConversationNotFound(true);
          setConversation(null);
          
          if (!silent && fetchRetryCount.current >= maxFetchRetries) {
            toast.error('Conversa não encontrada', {
              description: 'Você será redirecionado para a lista de conversas em 5 segundos'
            });
            
            setTimeout(() => {
              navigate('/admin/conversations', { replace: true });
            }, 5000);
          }
        } else if (!silent) {
          setError(err.message || 'Erro ao buscar detalhes da conversa');
          
          toast.error('Erro ao carregar conversa', {
            description: err.message || 'Tente novamente mais tarde'
          });
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
        setIsRefreshing(false);
        fetchTimeoutRef.current = null;
      }
    }, 200);
  }, [conversationId, apiToken, navigate, conversationNotFound, maxFetchRetries]);
  
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      } else if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
    }, 100);
  }, []);
  
  useEffect(() => {
    if (messagesEndRef.current && messageContainerRef.current) {
      scrollToBottom();
    }
  }, [conversation, scrollToBottom]);
  
  const transformMessages = useCallback((rawMessages) => {
    if (!rawMessages || !Array.isArray(rawMessages)) return [];
    
    return rawMessages.map(msg => {
      let remetente, nome;
      
      if (msg.remetente === 'atendente') {
        remetente = 'atendente';
        nome = msg.nome || 'Atendente';
      } else if (msg.remetente === 'sistema' || msg.remetente === 'system') {
        remetente = 'sistema';
        nome = 'Sistema';
      } else if (
        msg.remetente === 'ai' || 
        msg.remetente === 'assistente' || 
        msg.tipo === 'ai' ||
        msg.nome === 'Assistente Virtual' ||
        msg.sender === 'ai'
      ) {
        remetente = 'ai';
        nome = 'Assistente Virtual';
      } else {
        remetente = 'cliente';
        nome = conversation?.nomeCliente || msg.nome || 'Cliente';
      }
      
      return {
        _id: msg._id || msg.id || `msg-${Math.random().toString(36).substring(2, 9)}`,
        remetente,
        conteudo: msg.conteudo || msg.texto || msg.content || '',
        timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
        nome
      };
    });
  }, [conversation]);
  
  const sendTypingIndicator = useCallback(() => {
    if (isConnected && conversationId) {
      socketService.sendTypingIndicator(conversationId, true);
    }
  }, [isConnected, conversationId]);
  
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!message.trim() || isSending || !conversationId) return;
    
    const messageText = message.trim();
    setIsSending(true);
    setMessage('');
    
    try {
      let success = false;
      let attempts = 0;
      let errorMsg = '';
      const maxAttempts = 3;
      
      while (!success && attempts < maxAttempts) {
        try {
          const normalizedId = multiflowApi.getConversaId(conversationId);
          const result = await multiflowApi.enviarMensagem(
            normalizedId,
            messageText,
            null,
            'texto',
            true
          );
          
          if (!result.success) {
            throw new Error(result.error || 'Falha ao enviar mensagem');
          }
          
          success = true;
        } catch (error) {
          attempts++;
          errorMsg = error.message;
          console.error(`Tentativa ${attempts} falhou: ${error.message}`);
          
          if (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000 * attempts));
          }
        }
      }
      
      if (!success) {
        throw new Error(errorMsg || 'Falha em todas as tentativas de envio');
      }
      
      await fetchConversation(true);
      scrollToBottom();
      
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setMessage(messageText);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
      
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }
  };
  
  useEffect(() => {
    fetchConversation();
    fetchSectors();
    
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
    
    return () => {
      fetchRetryCount.current = 0;
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchConversation, fetchSectors]);
  
  useEffect(() => {
    if (message && isConnected) {
      sendTypingIndicator();
    }
  }, [message, isConnected, sendTypingIndicator]);
  
  const handleRefresh = () => {
    if (isRefreshing) return;
    fetchRetryCount.current = 0;
    fetchConversation(true);
  };
  
  const handleBack = () => {
    navigate('/admin/conversations');
  };
  
  const handleToggleInfoPanel = useCallback(() => {
    setShowInfoPanel(!showInfoPanel);
  }, [showInfoPanel]);
  
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
      case 'desarquivar':
        handleUnarchiveConversation();
        break;
      case 'excluir':
        setShowDeleteDialog(true);
        break;
      default:
        break;
    }
  };
  
  const performOperation = async (operation, actionName, successMessage) => {
    if (!conversation || isProcessing) return false;
    
    setIsProcessing(true);
    setActionType(actionName);
    
    try {
      let success = false;
      let attempts = 0;
      let errorMsg = '';
      const maxAttempts = 3;
      
      while (!success && attempts < maxAttempts) {
        try {
          const result = await operation();
          
          if (!result.success) {
            throw new Error(result.error || `Falha ao ${actionName} conversa`);
          }
          
          success = true;
        } catch (error) {
          attempts++;
          errorMsg = error.message;
          console.error(`Tentativa ${attempts} falhou: ${error.message}`);
          
          if (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000 * attempts));
          }
        }
      }
      
      if (!success) {
        throw new Error(errorMsg || `Falha em todas as tentativas de ${actionName}`);
      }
      
      toast.success(successMessage);
      return true;
    } catch (error) {
      console.error(`Erro ao ${actionName} conversa:`, error);
      toast.error(`Erro ao ${actionName} conversa: ${error.message || 'Erro desconhecido'}`);
      return false;
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };
  
  const handleConfirmTransfer = async () => {
    if (!conversation || !selectedSector || isProcessing) return;
    
    const normalizedId = multiflowApi.getConversaId(conversationId);
    const normalizedSectorId = multiflowApi.normalizeId(selectedSector, 'setor');
    
    const result = await performOperation(
      () => multiflowApi.transferirConversa(normalizedId, normalizedSectorId, null, '', true),
      'transferir',
      'Conversa transferida com sucesso'
    );
    
    if (result) {
      setSelectedSector(null);
      setShowTransferDialog(false);
      await fetchConversation();
    }
  };
  
  const handleConfirmFinish = async () => {
    if (!conversation || isProcessing) return;
    
    const normalizedId = multiflowApi.getConversaId(conversationId);
    
    const result = await performOperation(
      () => multiflowApi.finalizarConversa(normalizedId, null, true),
      'finalizar',
      'Conversa finalizada com sucesso'
    );
    
    if (result) {
      setShowFinishDialog(false);
      await fetchConversation();
    }
  };
  
  const handleConfirmArchive = async () => {
    if (!conversation || isProcessing) return;
    
    const normalizedId = multiflowApi.getConversaId(conversationId);
    
    const result = await performOperation(
      () => multiflowApi.arquivarConversa(normalizedId, null, true),
      'arquivar',
      'Conversa arquivada com sucesso'
    );
    
    if (result) {
      setShowArchiveDialog(false);
      await fetchConversation();
    }
  };
  
  const handleUnarchiveConversation = async () => {
    if (!conversation || isProcessing) return;
    
    const normalizedId = multiflowApi.getConversaId(conversationId);
    
    const result = await performOperation(
      () => multiflowApi.desarquivarConversa(normalizedId, null, true),
      'desarquivar',
      'Conversa desarquivada com sucesso'
    );
    
    if (result) {
      await fetchConversation();
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!conversation || isProcessing) return;
    
    setIsProcessing(true);
    setActionType('excluir');
    
    try {
      const normalizedId = multiflowApi.getConversaId(conversationId);
      let result;
      
      try {
        result = await multiflowApi.delete(`/users/${multiflowApi.FIXED_USER_ID}/conversas/${normalizedId}`, {
          params: { role: 'admin', isAdmin: 'true' }
        });
      } catch (deleteError) {
        console.warn('Falha ao excluir, tentando arquivar:', deleteError);
        
        result = await multiflowApi.arquivarConversa(normalizedId, null, true);
      }
      
      if (!result || !result.success) {
        throw new Error(result?.error || 'Falha ao excluir conversa');
      }
      
      toast.success('Conversa excluída com sucesso');
      setShowDeleteDialog(false);
      
      setTimeout(() => {
        navigate('/admin/conversations', { replace: true });
      }, 500);
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      toast.error('Erro ao excluir conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };
  
  const renderDialogs = () => (
    <>
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white max-w-[90vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Transferir conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Selecione o setor para o qual deseja transferir esta conversa
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <RadioGroup value={selectedSector} onValueChange={setSelectedSector}>
              <div className="space-y-3 max-h-[40vh] overflow-auto">
                {sectors && sectors.map(sector => (
                  <div key={sector._id || sector.id || sector.setorId} className="flex items-start space-x-2">
                    <RadioGroupItem 
                      value={sector._id || sector.id || sector.setorId} 
                      id={`sector-${sector._id || sector.id || sector.setorId}`}
                      className="mt-1 text-[#10b981] border-[#1f2937]/40"
                    />
                    <Label 
                      htmlFor={`sector-${sector._id || sector.id || sector.setorId}`}
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
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
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
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white max-w-[90vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Finalizar conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja finalizar esta conversa?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
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
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white max-w-[90vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Arquivar conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja arquivar esta conversa?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
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
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white max-w-[90vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Excluir conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja excluir esta conversa?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              variant="destructive"
              disabled={isProcessing}
              className="hover:opacity-90"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <div className="h-full w-full flex flex-col bg-[#070b11] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[url('https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/grid-pattern-dark.svg')] bg-repeat"></div>
      </div>
      
      {renderDialogs()}
      
      <div className="flex-1 w-full h-full relative z-10">
        <div className={`h-full ${isMobile ? 'flex flex-col' : 'md:grid md:grid-cols-3'}`}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`h-full flex flex-col bg-[#070b11] rounded-none sm:rounded-xl border-0 sm:border border-[#1f2937]/40 shadow-md 
              ${showInfoPanel ? 'hidden md:flex' : 'flex'} md:col-span-2 overflow-hidden`}
          >
            {isLoading ? (
              <div className="flex-1 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#10b981] mr-3" />
                <p className="text-slate-400">Carregando conversa...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex justify-center items-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                  <h3 className="text-xl font-medium text-white mb-2">
                    Erro ao carregar conversa
                  </h3>
                  <p className="text-slate-400 mb-4">{error}</p>
                  <div className="space-y-2">
                    <Button 
                      onClick={handleRefresh}
                      className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tentar novamente
                    </Button>
                    
                    <Button 
                      onClick={handleBack}
                      variant="outline" 
                      className="w-full bg-[#101820] border-[#1f2937]/40 text-white"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar para lista de conversas
                    </Button>
                  </div>
                </div>
              </div>
            ) : conversation ? (
              <>
                <ConversationHeader 
                  conversation={conversation} 
                  onBack={handleBack}
                  onRefresh={handleRefresh}
                  isConnected={isConnected}
                  isLoading={isLoading}
                  isRefreshing={isRefreshing}
                  onShowActionMenu={handleShowActionMenu}
                  onToggleInfoPanel={handleToggleInfoPanel}
                />
                
                <div 
                  ref={messageContainerRef}
                  className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-3 scroll-smooth"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#1f2937 transparent',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  <MessageList 
                    messages={transformMessages(conversation.mensagens)} 
                    isTyping={isTyping}
                    messagesEndRef={messagesEndRef}
                  />
                </div>
                
                <MessageInput 
                  value={message}
                  onChange={setMessage}
                  onSubmit={handleSendMessage}
                  isSending={isSending}
                  disabled={
                    conversation.status === STATUS.FINALIZADA || 
                    conversation.arquivada ? 
                    conversation.status : false
                  }
                  inputRef={messageInputRef}
                />
              </>
            ) : conversationNotFound ? (
              <ConversationNotFound onBack={handleBack} />
            ) : (
              <div className="flex-1 flex justify-center items-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-xl font-medium text-white mb-2">
                    Conversa não encontrada
                  </h3>
                  <p className="text-slate-400 mb-4">Esta conversa pode ter sido excluída ou não existe.</p>
                  <Button 
                    onClick={handleBack}
                    className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para conversas
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`h-full max-h-full flex flex-col bg-[#070b11] rounded-none sm:rounded-xl border-0 sm:border border-[#1f2937]/40 overflow-auto shadow-md 
              ${showInfoPanel ? 'flex fixed inset-0 z-40 md:static md:z-auto' : 'hidden md:flex'}`}
          >
            {isLoading ? (
              <div className="flex-1 flex justify-center items-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#10b981] mr-2" />
                <p className="text-slate-400">Carregando informações...</p>
              </div>
            ) : conversation ? (
              <InfoPanel 
                conversation={conversation}
                onShowActionMenu={handleShowActionMenu}
                isProcessing={isProcessing}
                onClose={() => setShowInfoPanel(false)}
              />
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminConversationDetail;