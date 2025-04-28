import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

/**
 * Componente que exibe o status de uma mensagem (enviando, enviada, lida, erro)
 */
const MessageStatus = ({ status, timestamp, className = "" }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-blue-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-400" />;
      case 'sending':
        return <Clock className="h-3 w-3 text-slate-400 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-400" />;
      default:
        return null;
    }
  };

  // Formatar timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  // Renderizar tempo e ícone de status
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-xs text-slate-400">{formatTime(timestamp)}</span>
      {getStatusIcon()}
    </div>
  );
};

export default MessageStatus;