import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, AlertTriangle, MoreVertical, Copy, Reply } from 'lucide-react';

const MessageBubble = ({ 
  message, 
  prevMessage, 
  isGrouped = false,
  isLastInGroup = true
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showFullTime, setShowFullTime] = useState(false);
  
  // Verificar se a mensagem existe
  if (!message || !message.conteudo) return null;
  
  // Detectar o tipo de remetente
  const isBot = message.remetente === 'bot';
  const isAtendente = message.remetente === 'atendente';
  const isCliente = message.remetente === 'cliente' || message.remetente === 'user';
  const isSystem = !isAtendente && !isCliente && !isBot;
  
  // Formatar horário
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      
      if (showFullTime) {
        // Formato completo: 15:30 - 25/03/2023
        return format(date, 'HH:mm - dd/MM/yyyy', { locale: ptBR });
      }
      
      // Formato básico: só a hora
      return format(date, 'HH:mm', { locale: ptBR });
    } catch (error) {
      return '';
    }
  };
  
  // Obter o status da mensagem
  const getStatusIcon = () => {
    if (!isAtendente) return null;
    
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3.5 w-3.5 text-white/70" />;
      case 'sent':
        return message.read ? 
          <CheckCircle className="h-3.5 w-3.5 text-blue-300" /> : 
          <CheckCircle className="h-3.5 w-3.5 text-white/70" />;
      case 'failed':
        return <AlertTriangle className="h-3.5 w-3.5 text-red-300" />;
      default:
        return <CheckCircle className="h-3.5 w-3.5 text-white/70" />;
    }
  };
  
  // Função para copiar texto
  const handleCopy = () => {
    navigator.clipboard.writeText(message.conteudo);
    setShowMenu(false);
    
    // Mostrar notificação de cópia
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade';
    toast.innerHTML = 'Mensagem copiada!';
    document.body.appendChild(toast);
    
    // Remover notificação após 2 segundos
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  };
  
  // Determinar espaçamento entre mensagens
  const getTopMargin = () => {
    if (isSystem) return 'my-3';
    
    // Se for mensagem agrupada, reduzir espaçamento
    if (isGrouped && !isSystem) {
      return 'mt-0.5';
    }
    
    // Se for última mensagem no grupo, adicionar espaçamento abaixo
    if (isLastInGroup) {
      return 'mb-3';
    }
    
    return 'my-1';
  };

  // Determinar o estilo da bolha
  const getBubbleStyle = () => {
    // Mensagem do sistema
    if (isSystem) {
      return "bg-gray-800/60 px-4 py-1.5 rounded-full text-xs text-gray-300 shadow-sm backdrop-blur-sm";
    }
    
    // Mensagem do bot
    if (isBot) {
      return "bg-gray-800 px-3 py-2 text-white rounded-lg shadow-sm";
    }
    
    // Mensagens do cliente
    if (isCliente) {
      // Determinar o arredondamento baseado na posição no grupo
      let roundedStyle = "";
      
      if (isGrouped) {
        if (isLastInGroup) {
          roundedStyle = "rounded-tr-lg rounded-br-lg rounded-tl-lg rounded-bl-xl";
        } else {
          roundedStyle = "rounded-tr-lg rounded-br-lg rounded-tl-lg rounded-bl-lg";
        }
      } else {
        roundedStyle = "rounded-tr-lg rounded-tl-sm rounded-br-lg rounded-bl-xl";
      }
      
      return `bg-slate-700 ${roundedStyle} px-3 py-2 text-white shadow-sm`;
    }
    
    // Mensagens do atendente
    if (isAtendente) {
      // Determinar o arredondamento baseado na posição no grupo
      let roundedStyle = "";
      
      if (isGrouped) {
        if (isLastInGroup) {
          roundedStyle = "rounded-tl-lg rounded-bl-lg rounded-tr-lg rounded-br-xl";
        } else {
          roundedStyle = "rounded-tl-lg rounded-bl-lg rounded-tr-lg rounded-br-lg";
        }
      } else {
        roundedStyle = "rounded-tl-lg rounded-tr-sm rounded-bl-lg rounded-br-xl";
      }
      
      return `bg-gradient-to-br from-[#10b981] to-[#0d8e6a] ${roundedStyle} px-3 py-2 text-white shadow-sm`;
    }
    
    // Fallback
    return "bg-gray-800 px-3 py-2 text-white rounded-lg shadow-sm";
  };

  // Renderizar mensagem do sistema
  if (isSystem) {
    return (
      <div 
        className="flex justify-center mb-3"
        id={`message-${message._id}`}
      >
        <div className={getBubbleStyle()}>
          {message.conteudo}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex ${isAtendente ? 'justify-end' : 'justify-start'} ${getTopMargin()}`}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      id={`message-${message._id}`}
    >
      {/* Conteúdo da Mensagem */}
      <div className="max-w-[75%] relative group">
        {/* Bolha da Mensagem */}
        <div 
          className={`${getBubbleStyle()} relative`}
          onClick={() => setShowFullTime(!showFullTime)}
        >
          {/* Menu de contexto (3 pontinhos) - aparece apenas no hover */}
          {showMenu && !isBot && (
            <div className="absolute top-0 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className={`absolute ${isAtendente ? 'right-full -translate-x-1' : 'left-full translate-x-1'}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(true);
                  }}
                  className="p-1 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
                
                {showMenu && (
                  <div 
                    className={`absolute z-10 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden w-32 ${isAtendente ? 'right-0' : 'left-0'}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={handleCopy}
                      className="flex items-center w-full px-3 py-2 text-xs text-gray-200 hover:bg-gray-700"
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      <span>Copiar</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Implementação de resposta seria aqui
                      }}
                      className="flex items-center w-full px-3 py-2 text-xs text-gray-200 hover:bg-gray-700"
                    >
                      <Reply className="h-3.5 w-3.5 mr-2" />
                      <span>Responder</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Conteúdo da Mensagem */}
          <div className="whitespace-pre-wrap break-words">{message.conteudo}</div>
        </div>
        
        {/* Informações de Tempo e Status */}
        <div className={`text-[10px] text-gray-400 ${isAtendente ? 'text-right' : 'text-left'} mt-1 flex items-center ${isAtendente ? 'justify-end' : 'justify-start'}`}>
          <span 
            className="cursor-pointer hover:text-gray-300 transition-colors"
            onClick={() => setShowFullTime(!showFullTime)}
          >
            {formatTime(message.timestamp || message.createdAt)}
          </span>
          
          {isAtendente && (
            <span className="ml-1.5 flex items-center">
              {getStatusIcon()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;