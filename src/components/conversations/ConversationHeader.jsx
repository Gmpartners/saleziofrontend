import React from 'react';
import { RefreshCw, Search, Bell } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import NotificationControl from '../NotificationControl';
import ConnectionStatus from '../ConnectionStatus';
import SoundNotificationToggle from '../SoundNotificationToggle';

/**
 * Cabeçalho da página de conversas com controles de busca, filtro e notificações
 */
const ConversationHeader = ({ 
  searchTerm, 
  onSearchChange, 
  onRefresh, 
  isLoading, 
  sectorDisplayName
}) => {
  const { isConnected, hasUnreadMessages } = useSocket();
  
  return (
    <div className="flex flex-col gap-3">
      {/* Título e Status de Conexão */}
      <div className="flex items-center justify-between">
        {/* Usando o componente ConnectionStatus */}
        <ConnectionStatus setor={sectorDisplayName} />
        
        <div className="flex items-center gap-3">
          {/* Indicador de novas mensagens */}
          {hasUnreadMessages && (
            <div className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 flex items-center gap-1 animate-pulse">
              <Bell className="h-3 w-3" />
              <span>Nova mensagem</span>
            </div>
          )}
          
          {/* Controle de som */}
          <SoundNotificationToggle />
          
          {/* Controle de notificações */}
          <NotificationControl />
        </div>
      </div>
      
      {/* Filtros e Pesquisa */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Procurar por nome, telefone ou mensagem..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 py-2.5 bg-[#0f1621] border border-[#1f2937]/50 text-white rounded-md placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#10b981]/30 focus:border-[#10b981]/50"
          />
        </div>
        
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="h-10 px-3 py-2 flex items-center gap-2 bg-[#0f1621] text-slate-400 border border-[#1f2937]/50 rounded-md hover:bg-[#101820] hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>
    </div>
  );
};

export default ConversationHeader;