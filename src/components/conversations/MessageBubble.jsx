import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import MessageStatus from './MessageStatus';
import { User, Bot, Headset } from 'lucide-react';

const normalizeRemetente = (remetente) => {
  if (!remetente || typeof remetente !== 'string') return 'cliente';
  
  const normalized = remetente.toLowerCase().trim();
  
  if (normalized.includes('atendente') || normalized === 'admin' || normalized === 'operador') {
    return 'atendente';
  }
  
  if (normalized.includes('ai') || normalized.includes('sistema') || normalized.includes('system') || normalized.includes('bot')) {
    return 'ai';
  }
  
  return 'cliente';
};

const MessageBubble = React.memo(({ 
  message, 
  prevMessage = null,
  isGrouped = false,
  isLastInGroup = true,
  onRetry = () => {}
}) => {
  // Verificação de segurança para message
  if (!message || typeof message !== 'object') {
    console.warn('MessageBubble: message inválida recebida', message);
    return null;
  }

  // Verificação de segurança para propriedades essenciais
  const messageContent = message.conteudo || message.content || '';
  const messageRemetente = message.remetente || message.sender || 'cliente';
  const messageName = message.nome || message.name || '';
  
  if (!messageContent) {
    console.warn('MessageBubble: mensagem sem conteúdo', message);
    return null;
  }
  
  const normalizedRemetente = normalizeRemetente(messageRemetente);
  
  const isAtendente = normalizedRemetente === 'atendente';
  const isAI = normalizedRemetente === 'ai';
  const isCliente = normalizedRemetente === 'cliente';
  
  const isRightAligned = isAtendente || isAI;
  
  const containerVariants = {
    initial: { 
      opacity: 0, 
      y: 10,
      scale: 0.95
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 30,
        duration: 0.3
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.2
      }
    }
  };
  
  const renderTimestamp = () => {
    if (!isLastInGroup) return null;
    
    return (
      <div className={cn(
        "flex items-center mt-1 text-xs",
        isRightAligned ? "justify-end" : "justify-start"
      )}>
        <MessageStatus 
          status={message.status || 'sent'} 
          timestamp={message.timestamp || message.createdAt} 
          className={isRightAligned ? "flex-row-reverse" : "flex-row"}
        />
        
        {message.status === 'failed' && (
          <button 
            onClick={() => onRetry(message._id || message.id, messageContent)}
            className="ml-2 text-red-400 hover:text-red-300 text-xs underline underline-offset-2"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  };
  
  const getSenderInfo = () => {
    if (isCliente) {
      return {
        icon: <User className="h-3.5 w-3.5 text-blue-300" />,
        label: messageName || "Cliente",
        color: "text-blue-400"
      };
    } else if (isAI) {
      return {
        icon: <Bot className="h-3.5 w-3.5 text-purple-300" />,
        label: messageName || "Assistente Virtual",
        color: "text-purple-400"
      };
    } else {
      return {
        icon: <Headset className="h-3.5 w-3.5 text-green-300" />,
        label: messageName || "Atendente",
        color: "text-green-400"
      };
    }
  };
  
  const { icon, label, color } = getSenderInfo();

  const getBubbleStyle = () => {
    if (isCliente) {
      return "bg-[#101820] text-white border border-[#1f2937]/40";
    } else if (isAI) {
      return "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-indigo-600/10";
    } else {
      return "bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow-sm shadow-[#10b981]/10";
    }
  };
  
  return (
    <motion.div
      layout
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        "flex w-full",
        isRightAligned ? "justify-end" : "justify-start",
        isGrouped ? "mt-0" : "mt-2",
        !isLastInGroup ? "mb-0" : "mb-1"
      )}
      role="listitem"
      aria-label={`Mensagem de ${label}: ${messageContent}`}
    >
      <div className={cn(
        "flex flex-col max-w-[75%]",
        isRightAligned ? "items-end" : "items-start"
      )}>
        {!isGrouped && (
          <div className={cn(
            "flex items-center mb-1 px-1 w-full",
            isRightAligned ? "justify-end" : "justify-start"
          )}>
            <div className="flex items-center gap-1 text-xs font-medium">
              {icon}
              <span className={color}>
                {label}
              </span>
            </div>
          </div>
        )}
        
        <div className={cn(
          "px-3 py-2 rounded-lg break-words",
          isGrouped ? (isRightAligned ? "mr-9" : "ml-9") : "",
          getBubbleStyle(),
          isGrouped && !isLastInGroup && isRightAligned ? "rounded-br-none" : "",
          isGrouped && !isLastInGroup && !isRightAligned ? "rounded-bl-none" : "",
          isGrouped 
            ? (isRightAligned
                ? (isLastInGroup 
                    ? "rounded-tr-sm" 
                    : "rounded-tr-none rounded-tl-lg") 
                : (isLastInGroup 
                    ? "rounded-tl-sm" 
                    : "rounded-tl-none rounded-tr-lg"))
            : (isRightAligned ? "rounded-tr-sm" : "rounded-tl-sm")
        )}>
          {messageContent}
        </div>
        
        {renderTimestamp()}
      </div>
    </motion.div>
  );
});

export default MessageBubble;