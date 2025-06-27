import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ChevronRight,
  ChevronDown,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { multiflowApi } from '../../services/multiflowApi';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { cn } from "../../lib/utils";
import { getEmpresaSetorInfo, getEmpresaColor } from '../../utils/empresaHelpers';

import MessageBubble from '../../components/conversations/MessageBubble';

import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
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

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Não disponível';
  
  let date;
  if (timestamp && timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp && typeof timestamp === 'string') {
    date = parseISO(timestamp);
  } else {
    return 'Não disponível';
  }
  
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part && part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
};

const getSetorNome = (conversation) => {
  if (conversation?.setorInfo?.nome) return conversation.setorInfo.nome;
  if (typeof conversation?.setorId === 'object' && conversation.setorId?.nome) return conversation.setorId.nome;
  if (conversation?.setor?.nome) return conversation.setor.nome;
  
  const setorId = typeof conversation?.setorId === 'string' ? conversation.setorId : 
                 (conversation?.setorId?._id || conversation?.setorId?.id || 'Não disponível');
  
  if (typeof setorId === 'string' && setorId.startsWith('SET')) {
    return `Setor ${setorId.substring(3)}`;
  }
  
  return setorId ? `Setor ${setorId}` : 'Não definido';
};

const ConversationHeader = React.memo(({ 
  conversation, 
  onBack, 
  onRefresh, 
  isConnected, 
  isLoading,
  onShowActionMenu,
  isRefreshing,
  onToggleInfoPanel,
  isMobile,
  empresasComSetores
}) => {
  if (!conversation) return null;
  
  const nomeCliente = conversation.nomeCliente || conversation.cliente?.nome || 'Cliente';
  const telefoneCliente = conversation.telefoneCliente || conversation.cliente?.telefone || '';
  const setorNome = getSetorNome(conversation);
  
  const empresaSetorInfo = getEmpresaSetorInfo(conversation, empresasComSetores);
  const { empresa: empresaNome, empresaAbreviada } = empresaSetorInfo;
  const empresaColor = getEmpresaColor(empresaNome);
  
  const initials = getInitials(nomeCliente);
  
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
      <div className="flex items-center gap-2 overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-[#101820] flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-[#10b981]/30 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white">
            {initials || <User className="h-4 w-4 sm:h-5 sm:w-5" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="overflow-hidden min-w-0">
          <h3 className="text-white font-medium text-sm sm:text-base truncate">{nomeCliente}</h3>
          <div className="text-xs flex flex-wrap items-center gap-1 sm:gap-2 overflow-hidden">
            {empresaNome && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3 text-slate-400" />
                <span className="text-slate-400" style={{ color: empresaColor?.color }}>
                  {isMobile ? empresaAbreviada || empresaNome : empresaNome}
                </span>
                <span className="text-slate-400">•</span>
              </div>
            )}
            <span className="text-slate-400 text-xs">{setorNome}</span>
            {!isMobile && telefoneCliente && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400 text-xs truncate">{telefoneCliente}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {statusBadge}
            {conversation.arquivada && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                Arquivada
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-[#101820]"
          title="Atualizar conversa"
          onClick={onRefresh}
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
  );
});

const ParticipantLegend = React.memo(() => {
  return (
    <div className="flex justify-center py-2">
      <div className="flex items-center space-x-1 sm:space-x-4 bg-[#101820] rounded-lg px-2 py-1 border border-[#1f2937]/40 text-xs sm:text-sm flex-wrap justify-center">
        <div className="flex items-center my-1">
          <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-blue-400" />
          <span className="text-blue-400">Cliente</span>
        </div>
        <div className="flex items-center my-1">
          <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-purple-400" />
          <span className="text-purple-400">Bot</span>
        </div>
        <div className="flex items-center my-1">
          <Headset className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-green-400" />
          <span className="text-green-400">Atendente</span>
        </div>
      </div>
    </div>
  );
});

const CustomMessageBubble = React.memo(({ message, prevMessage, nextMessage }) => {
  const isClient = message.remetente === 'cliente';
  const isBot = message.remetente === 'bot';
  const isSystem = message.remetente === 'sistema';
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
  } else if (isBot) {
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
      <div className={`flex ${isRightAligned ? 'flex-row-reverse' : 'flex-row'} items-start max-w-[90%] xs:max-w-[85%] sm:max-w-[75%]`}>
        {isFirstInGroup ? (
          <div className="flex items-center justify-center rounded-full p-1 mx-1 sm:mx-2 flex-shrink-0 w-7 sm:w-8">
            {iconComponent}
          </div>
        ) : (
          <div className="w-7 sm:w-8 mx-1 sm:mx-2 flex-shrink-0" />
        )}
        
        <div className={`p-2 sm:p-3 ${getCornerRadiusClasses()} ${bgColor} ${textColor} break-words max-w-full`}>
          {isFirstInGroup && (
            <div className="text-xs font-medium mb-1 text-slate-300">{message.nome}</div>
          )}
          
          <div className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.conteudo}</div>
          
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
  onClose,
  isMobile,
  empresasComSetores
}) => {
  if (!conversation) return null;
  
  const nomeCliente = conversation.nomeCliente || conversation.cliente?.nome || 'Cliente';
  const telefoneCliente = conversation.telefoneCliente || conversation.cliente?.telefone || '';
  const setorNome = getSetorNome(conversation);
  
  const empresaSetorInfo = getEmpresaSetorInfo(conversation, empresasComSetores);
  const { empresa: empresaNome } = empresaSetorInfo;
  const empresaColor = getEmpresaColor(empresaNome);
  
  return (
    <div className="p-3 sm:p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-bold text-white">Informações</h2>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-[#101820]"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2">Cliente</h3>
          <div className="bg-[#101820] rounded-lg p-3 border border-[#1f2937]/40">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <User className="h-5 w-5 text-[#10b981]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm sm:text-base truncate">{nomeCliente}</p>
                <div className="flex items-center text-xs sm:text-sm text-slate-400 mt-1 truncate">
                  <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 flex-shrink-0" />
                  <span className="truncate">{telefoneCliente || 'Não informado'}</span>
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
            
            {empresaNome && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Empresa:</span>
                <div 
                  className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-sm font-medium"
                  style={{ 
                    backgroundColor: `${empresaColor?.color}20`, 
                    color: empresaColor?.color,
                    borderLeft: `2px solid ${empresaColor?.color}`
                  }}
                >
                  <Building2 className="h-3 w-3" />
                  <span>{empresaNome}</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Setor:</span>
              <Badge variant="outline" className="bg-[#101820] text-white border-[#1f2937]/50">
                {setorNome}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Atendente:</span>
              <span className="text-white truncate max-w-[60%] text-right">{conversation.atendenteNome || conversation.atendente?.nome || 'Não atribuído'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Arquivada:</span>
              <span className="text-white">{conversation.arquivada ? 'Sim' : 'Não'}</span>
            </div>
            
            <Separator className="my-2 sm:my-3 bg-[#1f2937]/40" />
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Criada em:</span>
              <div className="flex items-center text-white">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-slate-400 flex-shrink-0" />
                {formatTimestamp(conversation.created || conversation.criadoEm || conversation.createdAt)}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Última atividade:</span>
              <div className="flex items-center text-white">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-slate-400 flex-shrink-0" />
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
        </div>
      </div>
    </div>
  );
});

const CustomModal = ({ 
  isOpen, 
  onClose, 
  children,
  title,
  description
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 bg-[#070b11] border border-[#1f2937]/40 rounded-lg shadow-xl w-[95%] max-w-md p-4 sm:p-6 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
          </div>
        )}
        {children}
      </motion.div>
    </div>
  );
};

const TransferModal = ({ 
  isOpen, 
  onClose, 
  sectors, 
  empresasComSetores,
  expandedEmpresas,
  toggleEmpresa,
  selectedSector, 
  setSelectedSector, 
  onConfirm, 
  isProcessing 
}) => {
  const [localSelectedSector, setLocalSelectedSector] = useState(selectedSector);
  
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedSector(selectedSector);
    }
  }, [isOpen, selectedSector]);
  
  const handleConfirm = useCallback(() => {
    setSelectedSector(localSelectedSector);
    onConfirm();
  }, [localSelectedSector, onConfirm, setSelectedSector]);
  
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Transferir conversa"
      description="Selecione o setor para o qual deseja transferir esta conversa"
    >
      <div className="py-4">
        <RadioGroup value={localSelectedSector} onValueChange={setLocalSelectedSector}>
          <div className="space-y-3 max-h-[50vh] overflow-auto px-1">
            {empresasComSetores && empresasComSetores.length > 0 ? (
              empresasComSetores.map(({ empresa, setores }) => {
                const empresaId = empresa._id || empresa.id || empresa.empresaId;
                const isExpanded = expandedEmpresas[empresaId] !== false;
                
                return (
                  <div key={empresaId} className="border border-[#1f2937]/40 rounded-lg bg-[#101820]/50">
                    <button
                      type="button"
                      onClick={() => toggleEmpresa(empresaId)}
                      className="w-full flex items-center justify-between p-3 hover:bg-[#101820] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#10b981]" />
                        <span className="font-medium text-white">{empresa.nome}</span>
                        <Badge variant="outline" className="bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20 text-xs">
                          {setores.length} setor{setores.length > 1 ? 'es' : ''}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2">
                        {setores.map(setor => {
                          const setorId = setor._id || setor.id || setor.setorId;
                          return (
                            <div key={setorId} className="flex items-start space-x-2 pl-6">
                              <RadioGroupItem 
                                value={setorId} 
                                id={`sector-${setorId}`}
                                className="mt-1 text-[#10b981] border-[#1f2937]/40"
                              />
                              <Label 
                                htmlFor={`sector-${setorId}`}
                                className="flex-1 cursor-pointer text-white hover:text-[#10b981] transition-colors"
                              >
                                <div className="font-medium">{setor.nome}</div>
                                {setor.responsavel && (
                                  <div className="text-sm text-slate-400">
                                    Responsável: {setor.responsavel}
                                  </div>
                                )}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              sectors && sectors.length > 0 ? (
                sectors.map(sector => (
                  <div key={sector._id || sector.id || sector.setorId} className="flex items-start space-x-2">
                    <RadioGroupItem 
                      value={sector.setorId || sector._id || sector.id} 
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
                ))
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-slate-300">Nenhum setor disponível</p>
                </div>
              )
            )}
          </div>
        </RadioGroup>
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        <Button 
          variant="outline"
          onClick={onClose}
          className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
          disabled={isProcessing}
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button 
          onClick={handleConfirm}
          disabled={!localSelectedSector || isProcessing}
          className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Share className="h-4 w-4 mr-2" />
          )}
          {isProcessing ? 'Transferindo...' : 'Transferir'}
        </Button>
      </div>
    </CustomModal>
  );
};

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  confirmText, 
  cancelText, 
  confirmIcon,
  onConfirm, 
  isProcessing, 
  destructive = false
}) => {
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
    >
      <div className="flex justify-end gap-2 mt-4">
        <Button 
          variant="outline"
          onClick={onClose}
          className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
          disabled={isProcessing}
        >
          <X className="h-4 w-4 mr-2" />
          {cancelText || "Cancelar"}
        </Button>
        <Button 
          onClick={onConfirm}
          disabled={isProcessing}
          className={destructive 
            ? "bg-red-600 hover:bg-red-700 text-white" 
            : "bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
          }
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            confirmIcon || <Check className="h-4 w-4 mr-2" />
          )}
          {isProcessing ? 'Processando...' : confirmText || "Confirmar"}
        </Button>
      </div>
    </CustomModal>
  );
};

const EmployeeConversationDetail = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { userProfile, isAdmin } = useAuthContext();
  
  const { 
    isConnected,
    selectedConversation, 
    selectConversation,
    sendMessage,
    forceRefreshCurrentConversation,
    finishConversation,
    transferConversation,
    archiveConversation,
    markMessagesAsRead,
    isLoading
  } = useSocket();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const [error, setError] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [empresasComSetores, setEmpresasComSetores] = useState([]);
  const [expandedEmpresas, setExpandedEmpresas] = useState({});
  const [selectedSector, setSelectedSector] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [message, setMessage] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const messageContainerRef = useRef(null);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const normalizedId = useMemo(() => {
    return multiflowApi.normalizeId(conversationId, 'conversa');
  }, [conversationId]);
  
  const checkSectorAccess = useCallback(() => {
    if (!selectedConversation || !userProfile?.setor) return true;
    if (isAdmin) return true;
    
    const conversationSectorId = multiflowApi.normalizeId(selectedConversation.setorId, 'setor');
    const userSectorId = multiflowApi.normalizeId(userProfile.setor, 'setor');
    
    if (!conversationSectorId || !userSectorId) return true;
    
    if (conversationSectorId !== userSectorId) {
      setError('Esta conversa não pertence ao seu setor.');
      return false;
    }
    
    return true;
  }, [selectedConversation, userProfile, isAdmin]);
  
  useEffect(() => {
    if (selectedConversation) {
      const hasAccess = checkSectorAccess();
      if (!hasAccess && !isAdmin) {
        toast.error('Acesso negado. Esta conversa não pertence ao seu setor.');
        navigate('/conversations');
      }
    }
  }, [selectedConversation, checkSectorAccess, navigate, isAdmin]);
  
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
  }, [selectedConversation, scrollToBottom]);
  
  const transformMessages = useCallback((rawMessages) => {
    if (!rawMessages || !Array.isArray(rawMessages)) {
      return [];
    }
    
    return rawMessages.map(msg => {
      if (!msg) {
        return null;
      }
      
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
        msg.remetente === 'bot' ||
        msg.tipo === 'ai' ||
        msg.nome === 'Assistente Virtual' ||
        msg.sender === 'ai'
      ) {
        remetente = 'bot';
        nome = 'Assistente Virtual';
      } else {
        remetente = 'cliente';
        nome = selectedConversation?.nomeCliente || msg.nome || 'Cliente';
      }
      
      return {
        _id: msg._id || msg.id || `msg-${Math.random().toString(36).substring(2, 9)}`,
        remetente,
        conteudo: msg.conteudo || msg.texto || msg.content || '',
        timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
        nome,
        status: msg.status || 'sent',
        tipo: msg.tipo || 'texto'
      };
    }).filter(Boolean);
  }, [selectedConversation]);
  
  const fetchEmpresasComSetores = useCallback(async () => {
    try {
      console.log('Iniciando busca de empresas com setores usando novo endpoint...');
      
      const response = await multiflowApi.getEmpresasComSetores(
        multiflowApi.ADMIN_ID, 
        isAdmin,
        { ativo: true, incluirVazias: false }
      );
      
      if (response.success && response.data && response.data.length > 0) {
        console.log(`Endpoint retornou ${response.data.length} empresas com setores`);
        
        const empresasComSetoresFiltradas = response.data.filter(
          item => item.setores && item.setores.length > 0
        );
        
        console.log(`${empresasComSetoresFiltradas.length} empresas têm setores`);
        const empresasFormatadas = empresasComSetoresFiltradas.map(item => ({
          empresa: {
            _id: item._id,
            id: item._id,
            empresaId: item.empresaId,
            nome: item.nome,
            descricao: item.descricao,
            ativo: item.ativo
          },
          setores: item.setores
        }));
        
        setEmpresasComSetores(empresasFormatadas);
        
        const expandedState = {};
        empresasFormatadas.forEach(item => {
          const empresaId = item.empresa._id || item.empresa.empresaId;
          expandedState[empresaId] = true;
        });
        setExpandedEmpresas(expandedState);
        
        const todosSetores = empresasComSetoresFiltradas.flatMap(item => item.setores);
        setSectors(todosSetores);
        
        console.log(`Total de setores disponíveis: ${todosSetores.length}`);
      } else {
        console.log('Nenhuma empresa com setores encontrada, usando fallback para setores simples');
        fetchSectors();
      }
    } catch (err) {
      console.error('Erro ao buscar empresas com setores:', err);
      fetchSectors();
    }
  }, [isAdmin]);
  
  const fetchSectors = useCallback(async () => {
    try {
      setSectors([]);
      
      const response = await multiflowApi.getSetores(multiflowApi.ADMIN_ID, isAdmin);
      
      if (response.success) {
        const activeSetores = response.data.filter(setor => setor.ativo !== false);
        setSectors(activeSetores);
      } else {
        console.error('Erro na resposta ao buscar setores:', response.error);
        toast.error('Erro ao carregar setores disponíveis');
      }
    } catch (err) {
      console.error('Erro ao buscar setores:', err);
      toast.error('Falha ao carregar setores');
    }
  }, [isAdmin]);
  
  const toggleEmpresa = useCallback((empresaId) => {
    setExpandedEmpresas(prev => ({
      ...prev,
      [empresaId]: !prev[empresaId]
    }));
  }, []);
  
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!message.trim() || isSending || !normalizedId) return;
    
    const messageText = message.trim();
    setIsSending(true);
    setMessage('');
    
    try {
      await sendMessage(normalizedId, messageText);
      scrollToBottom();
      
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };
  
  useEffect(() => {
    if (normalizedId) {
      selectConversation(normalizedId)
        .then(result => {
          if (result) {
            markMessagesAsRead(normalizedId);
          } else {
            setError("Não foi possível carregar a conversa");
          }
        })
        .catch(err => {
          setError(err.message || "Erro ao carregar a conversa");
        });
    }
    
    fetchEmpresasComSetores();
    
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
    
    return () => {
      setError(null);
    };
  }, [normalizedId, selectConversation, markMessagesAsRead, fetchEmpresasComSetores]);
  
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      const result = await forceRefreshCurrentConversation();
      if (result) {
        toast.success('Conversa atualizada');
      } else {
        throw new Error('Falha ao atualizar conversa');
      }
    } catch (error) {
      console.error('Erro ao atualizar conversa:', error);
      toast.error('Erro ao atualizar conversa');
      setError(error.message || "Erro ao atualizar a conversa");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleBack = () => {
    navigate('/conversations');
  };
  
  const handleToggleInfoPanel = useCallback(() => {
    setShowInfoPanel(!showInfoPanel);
  }, [showInfoPanel]);
  
  const handleShowActionMenu = (action) => {
    switch (action) {
      case 'transferir':
        fetchEmpresasComSetores();
        setSelectedSector(null);
        setShowTransferModal(true);
        break;
      case 'finalizar':
        setShowFinishModal(true);
        break;
      case 'arquivar':
        setShowArchiveModal(true);
        break;
      case 'desarquivar':
        handleUnarchiveConversation();
        break;
      default:
        break;
    }
  };
  
  const handleConfirmTransfer = async () => {
    if (!normalizedId || !selectedSector || isProcessing) return;
    
    const selectedSectorObject = sectors.find(sector => 
      sector.setorId === selectedSector || 
      sector._id === selectedSector || 
      sector.id === selectedSector
    );
    
    if (!selectedSectorObject) {
      toast.error('Setor selecionado não encontrado');
      setShowTransferModal(false);
      return;
    }
    
    const sectorIdToUse = selectedSectorObject.setorId || 
                          selectedSectorObject._id || 
                          selectedSectorObject.id;
    
    setIsProcessing(true);
    setProcessingAction('transferir');
    
    try {
      console.log('Iniciando transferência:', {
        conversaId: normalizedId,
        setorId: sectorIdToUse,
        sectorName: selectedSectorObject.nome
      });
      
      const result = await transferConversation(normalizedId, sectorIdToUse, '');
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao transferir conversa');
      }
      
      toast.success(`Conversa transferida com sucesso para ${selectedSectorObject.nome}`);
      setSelectedSector(null);
      setShowTransferModal(false);
      
      setTimeout(() => {
        navigate('/conversations');
      }, 500);
    } catch (error) {
      console.error('Erro detalhado ao transferir conversa:', error);
      toast.error('Erro ao transferir conversa: ' + (error.message || 'Erro desconhecido'));
      setShowTransferModal(false);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };
  
  const handleConfirmFinish = async () => {
    if (!normalizedId || isProcessing) return;
    
    setIsProcessing(true);
    setProcessingAction('finalizar');
    
    try {
      const success = await finishConversation(normalizedId);
      
      if (success) {
        toast.success('Conversa finalizada com sucesso');
        setShowFinishModal(false);
      } else {
        throw new Error('Falha ao finalizar conversa');
      }
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      toast.error('Erro ao finalizar conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
      setShowFinishModal(false);
    }
  };
  
  const handleConfirmArchive = async () => {
    if (!normalizedId || isProcessing) return;
    
    setIsProcessing(true);
    setProcessingAction('arquivar');
    
    try {
      const success = await archiveConversation(normalizedId);
      
      if (success) {
        toast.success('Conversa arquivada com sucesso');
        setShowArchiveModal(false);
        navigate('/conversations');
      } else {
        throw new Error('Falha ao arquivar conversa');
      }
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      toast.error('Erro ao arquivar conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
      setShowArchiveModal(false);
    }
  };
  
  const handleUnarchiveConversation = async () => {
    if (!normalizedId || isProcessing) return;
    
    setIsProcessing(true);
    setProcessingAction('desarquivar');
    
    try {
      const response = await multiflowApi.desarquivarConversa(normalizedId, multiflowApi.ADMIN_ID, isAdmin);
      
      if (response.success) {
        toast.success('Conversa desarquivada com sucesso');
        await forceRefreshCurrentConversation();
      } else {
        throw new Error(response.error || 'Falha ao desarquivar conversa');
      }
    } catch (error) {
      console.error('Erro ao desarquivar conversa:', error);
      toast.error('Erro ao desarquivar conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#070b11] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[url('https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/grid-pattern-dark.svg')] bg-repeat"></div>
      </div>
      
      <AnimatePresence>
        {showTransferModal && (
          <TransferModal
            isOpen={showTransferModal}
            onClose={() => setShowTransferModal(false)}
            sectors={sectors}
            empresasComSetores={empresasComSetores}
            expandedEmpresas={expandedEmpresas}
            toggleEmpresa={toggleEmpresa}
            selectedSector={selectedSector}
            setSelectedSector={setSelectedSector}
            onConfirm={handleConfirmTransfer}
            isProcessing={isProcessing && processingAction === 'transferir'}
          />
        )}
        
        {showFinishModal && (
          <ConfirmationModal
            isOpen={showFinishModal}
            onClose={() => setShowFinishModal(false)}
            title="Finalizar conversa"
            description="Tem certeza que deseja finalizar esta conversa?"
            confirmText="Finalizar"
            confirmIcon={<Check className="h-4 w-4 mr-2" />}
            onConfirm={handleConfirmFinish}
            isProcessing={isProcessing && processingAction === 'finalizar'}
          />
        )}
        
        {showArchiveModal && (
          <ConfirmationModal
            isOpen={showArchiveModal}
            onClose={() => setShowArchiveModal(false)}
            title="Arquivar conversa"
            description="Tem certeza que deseja arquivar esta conversa?"
            confirmText="Arquivar"
            destructive={true}
            onConfirm={handleConfirmArchive}
            isProcessing={isProcessing && processingAction === 'arquivar'}
          />
        )}
      </AnimatePresence>
      
      <div className="flex-1 w-full h-full relative z-10">
        <div className={`h-full ${isMobile ? 'flex flex-col' : 'md:grid md:grid-cols-3'}`}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`h-full flex flex-col bg-[#070b11] rounded-none sm:rounded-xl border-0 sm:border border-[#1f2937]/40 shadow-md 
              ${isMobile && showInfoPanel ? 'hidden' : 'flex'} md:col-span-2 overflow-hidden`}
          >
            {isLoading && !selectedConversation ? (
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
                  <Button 
                    onClick={handleRefresh}
                    className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
                </div>
              </div>
            ) : selectedConversation ? (
              <>
                <ConversationHeader 
                  conversation={selectedConversation} 
                  onBack={handleBack}
                  onRefresh={handleRefresh}
                  isConnected={isConnected}
                  isLoading={isLoading}
                  isRefreshing={isRefreshing}
                  onShowActionMenu={handleShowActionMenu}
                  onToggleInfoPanel={handleToggleInfoPanel}
                  isMobile={isMobile}
                  empresasComSetores={empresasComSetores}
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
                    messages={transformMessages(selectedConversation.mensagens)} 
                    messagesEndRef={messagesEndRef}
                  />
                </div>
                
                <MessageInput 
                  value={message}
                  onChange={setMessage}
                  onSubmit={handleSendMessage}
                  isSending={isSending}
                  disabled={
                    selectedConversation.status === STATUS.FINALIZADA || 
                    selectedConversation.arquivada ? 
                    selectedConversation.status : false
                  }
                  inputRef={messageInputRef}
                />
              </>
            ) : (
              <div className="flex-1 flex justify-center items-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-xl font-medium text-white mb-2">
                    Conversa não encontrada
                  </h3>
                  <p className="text-slate-400 mb-4">Esta conversa pode ter sido excluída, transferida ou não existe.</p>
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
              ${isMobile ? (showInfoPanel ? 'flex fixed inset-0 z-40' : 'hidden') : 'flex'}`}
          >
            {isLoading && !selectedConversation ? (
              <div className="flex-1 flex justify-center items-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#10b981] mr-2" />
                <p className="text-slate-400">Carregando informações...</p>
              </div>
            ) : selectedConversation ? (
              <InfoPanel 
                conversation={selectedConversation}
                onShowActionMenu={handleShowActionMenu}
                isProcessing={isProcessing}
                onClose={() => setShowInfoPanel(false)}
                isMobile={isMobile}
                empresasComSetores={empresasComSetores}
              />
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeConversationDetail;