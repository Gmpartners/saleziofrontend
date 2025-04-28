import React from 'react';
import { UserCircle, Circle, CheckCircle } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ConversationItem = ({ conversation, isSelected, onClick }) => {
  // Extrair dados da conversa
  const {
    nomeCliente,
    telefoneCliente,
    ultimaMensagem,
    ultimaAtividade,
    unreadCount = 0,
    setorId,
    status,
    lastMessageRead = true
  } = conversation;
  
  // Formatação de nome
  const displayName = nomeCliente || 'Cliente';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map(name => name && name[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
  
  // Formatação de hora
  const formattedTime = ultimaAtividade
    ? formatDistance(new Date(ultimaAtividade), new Date(), { 
        addSuffix: true,
        locale: ptBR
      })
    : '';
  
  // Status da conversa
  const getStatusIndicator = () => {
    const statusLower = (status || '').toLowerCase();
    
    if (statusLower.includes('aguardando')) {
      return <Circle className="h-3 w-3 text-amber-400" fill="#f59e0b" />;
    } else if (statusLower.includes('andamento')) {
      return <Circle className="h-3 w-3 text-green-400" fill="#10b981" />;
    } else if (statusLower.includes('finalizada')) {
      return <CheckCircle className="h-3 w-3 text-blue-400" />;
    }
    
    return null;
  };
  
  // Status da leitura da mensagem
  const readStatusColor = lastMessageRead ? 'text-gray-400' : 'text-[#10b981]';

  return (
    <div
      onClick={onClick}
      className={`flex p-3 items-center gap-3 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[#1a2435]'
          : 'hover:bg-[#15202b]'
      }`}
    >
      {/* Avatar */}
      <div className="relative">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${
          isSelected
            ? 'bg-gradient-to-br from-[#10b981] to-[#0d8e6a]'
            : 'bg-[#1a2435]'
        }`}>
          {nomeCliente ? (
            <span className="text-sm font-medium">{initials}</span>
          ) : (
            <UserCircle className="h-6 w-6" />
          )}
        </div>
        
        {/* Indicador de status */}
        <div className="absolute bottom-0 right-0">
          {getStatusIndicator()}
        </div>
      </div>
      
      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-medium text-white truncate pr-2">
            {displayName}
          </h3>
          <span className={`text-xs ${readStatusColor} whitespace-nowrap`}>
            {formattedTime}
          </span>
        </div>
        
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-gray-400 truncate pr-2">
            {ultimaMensagem || telefoneCliente || 'Nova conversa iniciada'}
          </p>
          
          {/* Indicador de mensagens não lidas */}
          {unreadCount > 0 && (
            <span className="bg-[#10b981] text-white text-xs font-medium h-5 min-w-5 rounded-full flex items-center justify-center px-1.5">
              {unreadCount}
            </span>
          )}
        </div>
        
        {/* Tag de setor */}
        {setorId?.nome && (
          <div className="mt-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f2937] text-gray-300">
              {setorId.nome}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationItem;