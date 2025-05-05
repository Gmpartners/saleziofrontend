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
  MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { multiflowApi } from '../../services/multiflowApi';
import { useAuthContext } from '../../hooks/useAuthContext';
import { cn } from "../../lib/utils";
import io from 'socket.io-client';

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

// Componente Header da Conversa
const ConversationHeader = React.memo(({ 
  conversation, 
  onBack, 
  onRefresh, 
  isConnected, 
  isLoading,
  onShowActionMenu,
  isRefreshing 
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
    <div className="flex items-center justify-between gap-3 p-4 lg:p-6 pt-4 bg-[#070b11] sticky top-0 z-30 border-b border-[#1f2937]/40">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mr-1 rounded-full h-8 w-8 text-slate-400 hover:text-white hover:bg-[#101820]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Avatar className="h-10 w-10 border-2 border-[#10b981]/30">
          <AvatarFallback className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white">
            {initials || <User className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <h3 className="text-white font-medium">{nomeCliente}</h3>
          <div className="text-xs flex items-center space-x-2">
            <span className="text-slate-400">{telefoneCliente || 'Sem telefone'}</span>
            {statusBadge}
            
            <Badge variant="outline" className="bg-[#101820] text-white border-[#1f2937]/50">
              {setorNome}
            </Badge>
            
            {conversation.arquivada && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                Arquivada
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
          onClick={() => toast.info('Chamada de vídeo não implementada')}
        >
          <Video className="h-4 w-4" />
        </Button>
        
        <Button 
          size="icon"
          variant="ghost"
          className="rounded-full h-8 w-8 text-slate-400 hover:text-[#10b981] hover:bg-[#101820]"
          title="Chamada de voz"
          disabled={isConversationFinished}
          onClick={() => toast.info('Chamada de voz não implementada')}
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

// Legenda dos participantes
const ParticipantLegend = React.memo(() => {
  return (
    <div className="flex justify-center pt-4 pb-1">
      <div className="flex items-center space-x-4 bg-[#101820] rounded-lg px-3 py-1 border border-[#1f2937]/40">
        <div className="flex items-center">
          <User className="h-3.5 w-3.5 mr-1 text-blue-400" />
          <span className="text-xs text-blue-400">Cliente</span>
        </div>
        <div className="flex items-center">
          <Bot className="h-3.5 w-3.5 mr-1 text-purple-400" />
          <span className="text-xs text-purple-400">Assistente Virtual</span>
        </div>
        <div className="flex items-center">
          <Headset className="h-3.5 w-3.5 mr-1 text-green-400" />
          <span className="text-xs text-green-400">Atendente</span>
        </div>
      </div>
    </div>
  );
});

// Componente para exibir mensagens
const CustomMessageBubble = React.memo(({ message, prevMessage, isGrouped, isLastInGroup }) => {
  const isClient = message.remetente === 'cliente';
  const isAI = message.remetente === 'ai' || message.remetente === 'assistente' || message.tipo === 'ai';
  const isSystem = message.remetente === 'sistema' || message.remetente === 'system';
  const isAttendant = message.remetente === 'atendente';
  
  // Determinamos a posição: cliente à esquerda, outros (AI, sistema, atendente) à direita
  const isRightAligned = !isClient; // AI, Sistema e Atendente ficam à direita
  
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
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isRightAligned ? 'justify-end' : 'justify-start'} mb-1`}
    >
      <div className={`relative max-w-[85%] md:max-w-[70%] ${isGrouped ? (isRightAligned ? 'mr-8' : 'ml-8') : ''}`}>
        {!isGrouped && !isRightAligned && (
          <div className="absolute left-[-30px] top-2 rounded-full p-1">
            {iconComponent}
          </div>
        )}
        
        {!isGrouped && isRightAligned && (
          <div className="absolute right-[-30px] top-2 rounded-full p-1">
            {iconComponent}
          </div>
        )}
        
        <div className={`p-3 rounded-lg ${bgColor} ${textColor}`}>
          {!isGrouped && (
            <div className="text-xs font-medium mb-1 text-slate-300">{message.nome}</div>
          )}
          
          <div className="text-sm whitespace-pre-wrap">{message.conteudo}</div>
          
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

// Lista de mensagens
const MessageList = React.memo(({ 
  messages = [], 
  isTyping,
  messagesEndRef
}) => {
  if (!messages || messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-full bg-[#101820] flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl text-white font-medium mb-2">Conversa sem mensagens</h3>
        <p className="text-slate-400 max-w-md">
          Não há mensagens nesta conversa.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 p-4">
      <ParticipantLegend />
      <AnimatePresence>
        <div className="space-y-1">
          {messages.map((message, index) => (
            <CustomMessageBubble 
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
            />
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <TypingIndicator isTyping={true} />
            </div>
          )}
        </div>
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
});

// Componente de entrada de mensagem
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
    <form onSubmit={onSubmit} className="p-3 border-t border-[#1f2937]/40 bg-[#0c1118] sticky bottom-0 z-20">
      <div className="flex gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Conversa finalizada ou arquivada. Não é possível enviar mensagens." : "Digite sua mensagem..."}
          className="flex-1 bg-[#0f1621] border border-[#1f2937]/50 text-white rounded-md px-4 py-2.5 focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
          ref={inputRef}
          disabled={disabled || isSending}
        />
        <Button
          type="submit"
          disabled={!value.trim() || disabled || isSending}
          className="px-4 bg-[#10b981] text-white rounded-md hover:bg-[#0d9268] disabled:opacity-50 disabled:hover:bg-[#10b981]"
        >
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
      
      {disabled && (
        <div className="mt-2 text-center text-xs text-slate-400">
          Esta conversa foi {disabled === 'finalizada' ? 'finalizada' : 'arquivada'}. Não é possível enviar novas mensagens.
        </div>
      )}
    </form>
  );
});

// Painel de informações da conversa
const InfoPanel = React.memo(({ 
  conversation, 
  onShowActionMenu,
  isProcessing
}) => {
  if (!conversation) return null;
  
  const nomeCliente = conversation.nomeCliente || conversation.cliente?.nome || 'Cliente';
  const telefoneCliente = conversation.telefoneCliente || conversation.cliente?.telefone || '';
  const setorNome = conversation.setorId?.nome || conversation.setorInfo?.nome || 'Não definido';
  
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
  
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-white mb-4">Informações</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Cliente</h3>
          <div className="bg-[#101820] rounded-lg p-3 border border-[#1f2937]/40">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <User className="h-5 w-5 text-[#10b981]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{nomeCliente}</p>
                <div className="flex items-center text-sm text-slate-400 mt-1">
                  <Phone className="h-3.5 w-3.5 mr-1" />
                  {telefoneCliente || 'Não informado'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Conversa</h3>
          <div className="space-y-3">
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
            
            <Separator className="my-3 bg-[#1f2937]/40" />
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Criada em:</span>
              <div className="flex items-center text-sm text-white">
                <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                {formatTimestamp(conversation.created || conversation.criadoEm || conversation.createdAt)}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Última atividade:</span>
              <div className="flex items-center text-sm text-white">
                <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                {formatTimestamp(conversation.ultimaAtividade || conversation.updatedAt)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 pt-3">
          <Button 
            className="w-full bg-gradient-to-br from-[#10b981] to-[#059669] hover:opacity-90 text-white"
            onClick={() => onShowActionMenu('transferir')}
            disabled={conversation.status === 'finalizada' || conversation.arquivada || isProcessing}
          >
            <Share className="h-4 w-4 mr-2" />
            Transferir Conversa
          </Button>
          
          <Button 
            className="w-full bg-[#1f2937] hover:opacity-90 text-white"
            onClick={() => onShowActionMenu('finalizar')}
            disabled={conversation.status === 'finalizada' || conversation.arquivada || isProcessing}
          >
            <Check className="h-4 w-4 mr-2" />
            Finalizar Conversa
          </Button>
          
          {conversation.arquivada ? (
            <Button 
              variant="outline"
              className="w-full border-[#1f2937]/40 bg-[#101820] text-white flex items-center gap-2 hover:bg-[#101820] hover:text-[#10b981]"
              onClick={() => onShowActionMenu('desarquivar')}
              disabled={isProcessing}
            >
              <Check className="h-4 w-4" />
              Desarquivar Conversa
            </Button>
          ) : (
            <Button 
              variant="outline"
              className="w-full border-[#1f2937]/40 bg-[#101820] text-white flex items-center gap-2 hover:bg-[#101820] hover:text-amber-400"
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
              className="w-full flex items-center gap-2"
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

// Componente principal de detalhes da conversa
const AdminConversationDetail = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { apiToken, user, userProfile } = useAuthContext();
  const socketRef = useRef(null);
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
  const [isConnected, setIsConnected] = useState(false);
  
  const [message, setMessage] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Configurar o socket para conexão em tempo real
  useEffect(() => {
    if (!apiToken || !userProfile) return;
    
    // Inicializar socket
    const socket = io(import.meta.env.VITE_API_BASE_URL || 'https://api.salezio.com.br', {
      auth: {
        token: apiToken
      },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true,
      timeout: 20000
    });
    
    socketRef.current = socket;
    
    // Eventos de socket
    socket.on('connect', () => {
      console.log('Socket conectado (Admin Detail)');
      setIsConnected(true);
      
      // Registrar como admin
      const userId = userProfile?.id || user?.uid;
      if (userId) {
        socket.emit('register_admin', { userId });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Socket desconectado (Admin Detail)');
      setIsConnected(false);
    });
    
    socket.on('new_message', (data) => {
      if (data.conversationId === conversationId) {
        // Atualizar a conversa quando chegar nova mensagem
        fetchConversation(true);
      }
    });
    
    socket.on('typing', (data) => {
      if (data.conversationId === conversationId) {
        setIsTyping(true);
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    });
    
    socket.on('conversation_updated', (data) => {
      if (data.conversationId === conversationId) {
        fetchConversation(true);
      }
    });
    
    // Limpar na desmontagem
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [apiToken, userProfile, conversationId]);
  
  // Configurar polling de backup para atualização da conversa
  useEffect(() => {
    // Intervalo de atualização a cada 10 segundos como backup
    pollingIntervalRef.current = setInterval(() => {
      if (!isRefreshing && conversationId) {
        fetchConversation(true);
      }
    }, 10000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isRefreshing, conversationId]);
  
  // Buscar setores
  const fetchSectors = useCallback(async () => {
    try {
      const userId = userProfile?.id || user?.uid;
      if (!userId || !apiToken) {
        return;
      }
      
      const response = await multiflowApi.getSetores(userId, true);
      
      if (response.success) {
        setSectors(response.data);
      }
    } catch (err) {
      console.error('Erro ao buscar setores:', err);
    }
  }, [userProfile, user, apiToken]);
  
  // Buscar conversa
  const fetchConversation = useCallback(async (silent = false) => {
    try {
      if (!conversationId) return;
      
      if (!silent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      setError(null);
      
      const userId = userProfile?.id || user?.uid;
      if (!userId) {
        throw new Error('ID do usuário não disponível');
      }
      
      if (!apiToken) {
        throw new Error('Token de API não fornecido');
      }
      
      const result = await multiflowApi.getConversa(conversationId, userId, true, true);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao carregar a conversa');
      }
      
      setConversation(result.data);
      
      // Scroll para o final depois de carregar
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (err) {
      console.error('Erro ao buscar conversa:', err);
      if (!silent) {
        setError(typeof err === 'string' ? err : err.message || 'Erro ao buscar detalhes da conversa');
        toast.error('Erro ao carregar conversa', {
          description: typeof err === 'string' ? err : err.message || 'Tente novamente mais tarde'
        });
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [conversationId, userProfile, user, apiToken]);
  
  // Transformar mensagens para formato correto
  const transformMessages = useCallback((rawMessages) => {
    if (!rawMessages || !Array.isArray(rawMessages)) return [];
    
    return rawMessages.map(msg => {
      let remetente, nome;
      
      // Identificação correta do tipo de mensagem
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
  
  // Enviar indicador de digitação
  const sendTypingIndicator = useCallback(() => {
    if (socketRef.current && isConnected && conversationId) {
      socketRef.current.emit('typing', { conversationId });
    }
  }, [isConnected, conversationId]);
  
  // Enviar mensagem
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!message.trim() || isSending || !conversationId) return;
    
    const messageText = message.trim();
    setIsSending(true);
    setMessage('');
    
    try {
      const userId = userProfile?.id || user?.uid;
      const result = await multiflowApi.enviarMensagem(
        conversationId,
        messageText,
        userId,
        'texto',
        true
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar mensagem');
      }
      
      // Atualizar a conversa
      await fetchConversation(true);
      
      // Scroll para o final
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
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
  
  // Efeitos iniciais
  useEffect(() => {
    fetchConversation();
    fetchSectors();
    
    // Focar no input ao carregar
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [fetchConversation, fetchSectors]);
  
  // Efeito para detectar digitação
  useEffect(() => {
    if (message && isConnected) {
      sendTypingIndicator();
    }
  }, [message, isConnected, sendTypingIndicator]);
  
  // Handler para atualizar conversa
  const handleRefresh = () => {
    if (isRefreshing) return;
    fetchConversation(true);
  };
  
  // Handler para voltar
  const handleBack = () => {
    navigate('/admin/conversations');
  };
  
  // Handler para ações
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
  
  // Handler para transferir conversa
  const handleConfirmTransfer = async () => {
    if (!conversation || !selectedSector || isProcessing) return;
    
    setIsProcessing(true);
    setActionType('transferir');
    
    try {
      const userId = userProfile?.id || user?.uid;
      const result = await multiflowApi.transferirConversa(
        conversationId, 
        selectedSector, 
        userId,
        '', 
        true
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao transferir conversa');
      }
      
      toast.success('Conversa transferida com sucesso');
      setSelectedSector(null);
      setShowTransferDialog(false);
      
      await fetchConversation();
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      toast.error('Erro ao transferir conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };
  
  // Handler para finalizar conversa
  const handleConfirmFinish = async () => {
    if (!conversation || isProcessing) return;
    
    setIsProcessing(true);
    setActionType('finalizar');
    
    try {
      const userId = userProfile?.id || user?.uid;
      const result = await multiflowApi.finalizarConversa(conversationId, userId, true);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao finalizar conversa');
      }
      
      toast.success('Conversa finalizada com sucesso');
      setShowFinishDialog(false);
      
      await fetchConversation();
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      toast.error('Erro ao finalizar conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };
  
  // Handler para arquivar conversa
  const handleConfirmArchive = async () => {
    if (!conversation || isProcessing) return;
    
    setIsProcessing(true);
    setActionType('arquivar');
    
    try {
      const userId = userProfile?.id || user?.uid;
      const result = await multiflowApi.arquivarConversa(conversationId, userId, true);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao arquivar conversa');
      }
      
      toast.success('Conversa arquivada com sucesso');
      setShowArchiveDialog(false);
      
      await fetchConversation();
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      toast.error('Erro ao arquivar conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };
  
  // Handler para desarquivar conversa
  const handleUnarchiveConversation = async () => {
    if (!conversation || isProcessing) return;
    
    setIsProcessing(true);
    setActionType('desarquivar');
    
    try {
      const userId = userProfile?.id || user?.uid;
      const result = await multiflowApi.desarquivarConversa(conversationId, userId, true);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao desarquivar conversa');
      }
      
      toast.success('Conversa desarquivada com sucesso');
      
      await fetchConversation();
    } catch (error) {
      console.error('Erro ao desarquivar conversa:', error);
      toast.error('Erro ao desarquivar conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };
  
  // Handler para excluir conversa
  const handleConfirmDelete = async () => {
    if (!conversation || isProcessing) return;
    
    setIsProcessing(true);
    setActionType('excluir');
    
    try {
      const userId = userProfile?.id || user?.uid;
      
      let result;
      try {
        result = await multiflowApi.delete(`/users/${userId}/conversas/${conversationId}`, {
          params: { role: 'admin' }
        });
      } catch (deleteError) {
        // Fallback para arquivar se excluir falhar
        result = await multiflowApi.arquivarConversa(conversationId, userId, true);
      }
      
      if (!result || !result.success) {
        throw new Error(result?.error || 'Falha ao excluir conversa');
      }
      
      toast.success('Conversa excluída com sucesso');
      setShowDeleteDialog(false);
      navigate('/admin/conversations');
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      toast.error('Erro ao excluir conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };
  
  // Renderizar diálogos
  const renderDialogs = () => (
    <>
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white">
          <DialogHeader>
            <DialogTitle>Transferir conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Selecione o setor para o qual deseja transferir esta conversa
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
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
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white">
          <DialogHeader>
            <DialogTitle>Excluir conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja excluir esta conversa?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
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
    <div className="h-full w-full flex flex-col bg-[#070b11] relative">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[url('https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/grid-pattern-dark.svg')] bg-repeat"></div>
      </div>
      
      {renderDialogs()}
      
      <div className="flex-1 w-full h-full overflow-hidden relative z-10">
        <div className="h-full grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col bg-[#070b11] rounded-xl border border-[#1f2937]/40 overflow-hidden shadow-md md:col-span-2"
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
                  <Button 
                    onClick={handleRefresh}
                    className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
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
                />
                
                <div 
                  className="flex-1 overflow-y-auto custom-scrollbar bg-[#070b11]"
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
            className="h-full flex flex-col bg-[#070b11] rounded-xl border border-[#1f2937]/40 overflow-auto shadow-md"
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
              />
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminConversationDetail;