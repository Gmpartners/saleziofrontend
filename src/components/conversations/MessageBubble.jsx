import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Componente para exibir uma mensagem em formato de bolha
 */
const MessageBubble = ({ message, onRetry }) => {
  // Verificar se a mensagem existe
  if (!message || !message.conteudo) return null;
  
  // Detectar o tipo de remetente
  const isAtendente = message.remetente === 'atendente';
  const isCliente = message.remetente === 'cliente' || message.remetente === 'user';
  
  // Formatar horário
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
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
        return <Clock className="h-3 w-3 text-white/70" />;
      case 'sent':
        return <CheckCircle className="h-3 w-3 text-white" />;
      case 'failed':
        return <AlertTriangle className="h-3 w-3 text-red-300" />;
      default:
        return <CheckCircle className="h-3 w-3 text-white" />;
    }
  };
  
  if (isAtendente) {
    return (
      <div className="flex flex-col items-end mb-3">
        <div className="bg-[#10b981] text-white rounded-tl-lg rounded-tr-sm rounded-bl-lg rounded-br-lg max-w-[80%] px-3 py-2">
          {message.conteudo}
        </div>
        <div className="text-xs text-slate-400 mt-1 flex items-center">
          <span>{formatTime(message.timestamp || message.createdAt)}</span>
          <span className="ml-1">{getStatusIcon()}</span>
          {message.status === 'failed' && (
            <button 
              onClick={() => onRetry(message)}
              className="ml-1 text-red-400 hover:text-red-300 transition-colors"
              title="Tentar novamente"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  }
  
  if (isCliente) {
    return (
      <div className="flex flex-col items-start mb-3">
        <div className="bg-slate-700 text-white rounded-tr-lg rounded-tl-sm rounded-br-lg rounded-bl-lg max-w-[80%] px-3 py-2">
          {message.conteudo}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {formatTime(message.timestamp || message.createdAt)}
        </div>
      </div>
    );
  }
  
  // Mensagem do sistema (fallback)
  return (
    <div className="flex justify-center my-3">
      <div className="bg-slate-800/60 px-3 py-1 rounded-full text-xs text-slate-400">
        {message.conteudo}
      </div>
    </div>
  );
};

export default MessageBubble;