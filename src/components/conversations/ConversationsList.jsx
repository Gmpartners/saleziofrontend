import { useState, useEffect } from 'react';
import { Search, MessageSquareOff, Filter, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Components
import ConversationItem from './ConversationItem';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const ConversationsList = ({
  conversations = [],
  isLoading = false,
  error = null,
  onSelectConversation,
  onRefresh,
  sectors = [],
  userSector
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    status: [],
    sector: []
  });
  const [filteredConversations, setFilteredConversations] = useState(conversations);
  
  // Formatador de tempo
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `${diffMins}m atrás`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h atrás`;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}/${month}`;
    } catch (error) {
      return '';
    }
  };
  
  // Aplicar filtros quando as conversas mudarem
  useEffect(() => {
    if (!conversations || !Array.isArray(conversations)) {
      setFilteredConversations([]);
      return;
    }
    
    // Aplicar filtros e pesquisa
    const filtered = conversations.filter(conv => {
      // Verificar existência da conversa
      if (!conv) return false;
      
      // 1. Filtro de pesquisa
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = (conv.nomeCliente || conv.cliente?.nome || '')
          .toLowerCase().includes(searchLower);
        const phoneMatch = (conv.telefoneCliente || conv.cliente?.telefone || '')
          .includes(searchTerm);
        const messageMatch = (conv.ultimaMensagem || '')
          .toLowerCase().includes(searchLower);
          
        if (!nameMatch && !phoneMatch && !messageMatch) return false;
      }
      
      // 2. Filtro de status
      if (activeFilters.status.length > 0) {
        const status = (conv.status || '').toLowerCase();
        if (!activeFilters.status.some(s => status.includes(s))) return false;
      }
      
      // 3. Filtro de setor
      if (activeFilters.sector.length > 0) {
        const sectorId = typeof conv.setorId === 'object' 
          ? conv.setorId?._id || conv.setorId?.id 
          : conv.setorId;
          
        if (!activeFilters.sector.includes(sectorId)) return false;
      }
      
      return true;
    });
    
    setFilteredConversations(filtered);
  }, [conversations, searchTerm, activeFilters]);
  
  // Toggle para filtros de status
  const toggleStatusFilter = (status) => {
    setActiveFilters(prev => {
      const newStatus = prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status];
        
      return {
        ...prev,
        status: newStatus
      };
    });
  };
  
  // Toggle para filtros de setor
  const toggleSectorFilter = (sectorId) => {
    setActiveFilters(prev => {
      const newSector = prev.sector.includes(sectorId)
        ? prev.sector.filter(id => id !== sectorId)
        : [...prev.sector, sectorId];
        
      return {
        ...prev,
        sector: newSector
      };
    });
  };
  
  // Limpar todos os filtros
  const clearFilters = () => {
    setActiveFilters({
      status: [],
      sector: []
    });
    setSearchTerm('');
  };
  
  // Verificar se há filtros ativos
  const hasActiveFilters = activeFilters.status.length > 0 || 
    activeFilters.sector.length > 0 || 
    searchTerm.length > 0;
  
  // Renderizar carregamento
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-4 rounded-lg bg-[#0f1621] border border-[#1f2937]/40 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full bg-[#1f2937]/40" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40 mb-2 bg-[#1f2937]/60" />
              <Skeleton className="h-3 w-full bg-[#1f2937]/40" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // Renderizar erro
  if (error) {
    return (
      <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
        <h3 className="text-lg font-medium text-red-300 mb-2">Erro ao carregar conversas</h3>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <Button 
          onClick={onRefresh} 
          variant="destructive"
          className="bg-red-600 hover:bg-red-700"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }
  
  // Renderizar conversas vazias
  if (filteredConversations.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Barra de pesquisa e filtros */}
        <div className="mb-4 flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Pesquisar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#0f1621] border-[#1f2937]/50 text-white"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-10 w-10 border-[#1f2937]/50 bg-[#0f1621] text-slate-400"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#0f1621] border-[#1f2937]/50 text-slate-200">
              <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#1f2937]/30" />
              
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium mb-1.5 text-slate-400">Status</p>
                <div className="flex flex-wrap gap-1">
                  <Badge 
                    className={`cursor-pointer ${
                      activeFilters.status.includes('aguardando') 
                        ? 'bg-amber-600' 
                        : 'bg-[#1f2937]/40 hover:bg-[#1f2937]/60'
                    }`}
                    onClick={() => toggleStatusFilter('aguardando')}
                  >
                    Aguardando
                  </Badge>
                  <Badge 
                    className={`cursor-pointer ${
                      activeFilters.status.includes('andamento') 
                        ? 'bg-[#10b981]' 
                        : 'bg-[#1f2937]/40 hover:bg-[#1f2937]/60'
                    }`}
                    onClick={() => toggleStatusFilter('andamento')}
                  >
                    Em andamento
                  </Badge>
                  <Badge 
                    className={`cursor-pointer ${
                      activeFilters.status.includes('finalizado') 
                        ? 'bg-blue-600' 
                        : 'bg-[#1f2937]/40 hover:bg-[#1f2937]/60'
                    }`}
                    onClick={() => toggleStatusFilter('finalizado')}
                  >
                    Finalizado
                  </Badge>
                </div>
              </div>
              
              {sectors && sectors.length > 0 && (
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium mb-1.5 text-slate-400">Setor</p>
                  <div className="flex flex-wrap gap-1">
                    {sectors.map(sector => (
                      <Badge 
                        key={sector._id || sector.id}
                        className={`cursor-pointer ${
                          activeFilters.sector.includes(sector._id || sector.id) 
                            ? 'bg-[#10b981]' 
                            : 'bg-[#1f2937]/40 hover:bg-[#1f2937]/60'
                        }`}
                        onClick={() => toggleSectorFilter(sector._id || sector.id)}
                      >
                        {sector.nome}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <DropdownMenuSeparator className="bg-[#1f2937]/30" />
              <DropdownMenuItem 
                className="text-center justify-center text-slate-400 hover:text-white cursor-pointer hover:bg-[#101820]"
                onClick={clearFilters}
              >
                Limpar filtros
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Chips de filtros ativos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {searchTerm && (
              <div className="flex items-center gap-1 text-xs bg-[#1f2937]/40 text-slate-300 px-2 py-1 rounded-full">
                <span>"{searchTerm}"</span>
                <button 
                  onClick={() => setSearchTerm('')}
                  className="ml-1 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {activeFilters.status.map(status => (
              <div key={status} className="flex items-center gap-1 text-xs bg-[#1f2937]/40 text-slate-300 px-2 py-1 rounded-full">
                <span>Status: {status}</span>
                <button 
                  onClick={() => toggleStatusFilter(status)}
                  className="ml-1 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {activeFilters.sector.map(sectorId => {
              const sector = sectors.find(s => s._id === sectorId || s.id === sectorId);
              return (
                <div key={sectorId} className="flex items-center gap-1 text-xs bg-[#1f2937]/40 text-slate-300 px-2 py-1 rounded-full">
                  <span>Setor: {sector?.nome || sectorId}</span>
                  <button 
                    onClick={() => toggleSectorFilter(sectorId)}
                    className="ml-1 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
            
            <button 
              onClick={clearFilters}
              className="text-xs bg-[#10b981]/20 text-[#10b981] px-2 py-1 rounded-full hover:bg-[#10b981]/30"
            >
              Limpar todos
            </button>
          </div>
        )}
        
        {/* Mensagem de nenhuma conversa */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-[#0f1621] border border-[#1f2937]/40">
              <MessageSquareOff className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {hasActiveFilters 
                ? 'Nenhuma conversa corresponde aos filtros' 
                : 'Nenhuma conversa disponível'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              {hasActiveFilters 
                ? 'Tente ajustar seus filtros de pesquisa para ver mais resultados.' 
                : 'Conversas aparecem aqui quando clientes iniciarem contato.'}
            </p>
            
            {hasActiveFilters && (
              <Button 
                onClick={clearFilters}
                variant="outline"
                className="mt-4 bg-[#0f1621] border-[#1f2937]/50 text-slate-300 hover:text-white hover:bg-[#101820]"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Renderizar lista de conversas
  return (
    <div className="h-full flex flex-col">
      {/* Barra de pesquisa e filtros */}
      <div className="mb-4 flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Pesquisar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#0f1621] border-[#1f2937]/50 text-white"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className={`h-10 w-10 border-[#1f2937]/50 bg-[#0f1621] ${hasActiveFilters ? 'text-[#10b981]' : 'text-slate-400'}`}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#0f1621] border-[#1f2937]/50 text-slate-200">
            <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#1f2937]/30" />
            
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium mb-1.5 text-slate-400">Status</p>
              <div className="flex flex-wrap gap-1">
                <Badge 
                  className={`cursor-pointer ${
                    activeFilters.status.includes('aguardando') 
                      ? 'bg-amber-600' 
                      : 'bg-[#1f2937]/40 hover:bg-[#1f2937]/60'
                  }`}
                  onClick={() => toggleStatusFilter('aguardando')}
                >
                  Aguardando
                </Badge>
                <Badge 
                  className={`cursor-pointer ${
                    activeFilters.status.includes('andamento') 
                      ? 'bg-[#10b981]' 
                      : 'bg-[#1f2937]/40 hover:bg-[#1f2937]/60'
                  }`}
                  onClick={() => toggleStatusFilter('andamento')}
                >
                  Em andamento
                </Badge>
                <Badge 
                  className={`cursor-pointer ${
                    activeFilters.status.includes('finalizado') 
                      ? 'bg-blue-600' 
                      : 'bg-[#1f2937]/40 hover:bg-[#1f2937]/60'
                  }`}
                  onClick={() => toggleStatusFilter('finalizado')}
                >
                  Finalizado
                </Badge>
              </div>
            </div>
            
            {sectors && sectors.length > 0 && (
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium mb-1.5 text-slate-400">Setor</p>
                <div className="flex flex-wrap gap-1">
                  {sectors.map(sector => (
                    <Badge 
                      key={sector._id || sector.id}
                      className={`cursor-pointer ${
                        activeFilters.sector.includes(sector._id || sector.id) 
                          ? 'bg-[#10b981]' 
                          : 'bg-[#1f2937]/40 hover:bg-[#1f2937]/60'
                      }`}
                      onClick={() => toggleSectorFilter(sector._id || sector.id)}
                    >
                      {sector.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <DropdownMenuSeparator className="bg-[#1f2937]/30" />
            <DropdownMenuItem 
              className="text-center justify-center text-slate-400 hover:text-white cursor-pointer hover:bg-[#101820]"
              onClick={clearFilters}
            >
              Limpar filtros
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Chips de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {searchTerm && (
            <div className="flex items-center gap-1 text-xs bg-[#1f2937]/40 text-slate-300 px-2 py-1 rounded-full">
              <span>"{searchTerm}"</span>
              <button 
                onClick={() => setSearchTerm('')}
                className="ml-1 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {activeFilters.status.map(status => (
            <div key={status} className="flex items-center gap-1 text-xs bg-[#1f2937]/40 text-slate-300 px-2 py-1 rounded-full">
              <span>Status: {status}</span>
              <button 
                onClick={() => toggleStatusFilter(status)}
                className="ml-1 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          {activeFilters.sector.map(sectorId => {
            const sector = sectors.find(s => s._id === sectorId || s.id === sectorId);
            return (
              <div key={sectorId} className="flex items-center gap-1 text-xs bg-[#1f2937]/40 text-slate-300 px-2 py-1 rounded-full">
                <span>Setor: {sector?.nome || sectorId}</span>
                <button 
                  onClick={() => toggleSectorFilter(sectorId)}
                  className="ml-1 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          
          <button 
            onClick={clearFilters}
            className="text-xs bg-[#10b981]/20 text-[#10b981] px-2 py-1 rounded-full hover:bg-[#10b981]/30"
          >
            Limpar todos
          </button>
        </div>
      )}
      
      {/* Lista de conversas */}
      <div className="space-y-2 overflow-auto pb-6">
        <AnimatePresence>
          {filteredConversations.map(conversation => {
            // Verificar se a conversa pertence ao setor do usuário
            const userSectorId = userSector?._id || userSector?.id || '';
            
            // Verificar se setorId é objeto ou string
            const conversationSectorId = typeof conversation.setorId === 'object' && conversation.setorId !== null
              ? conversation.setorId._id || conversation.setorId.id
              : conversation.setorId || '';
              
            const isUserSector = userSectorId && conversationSectorId && userSectorId === conversationSectorId;
            
            return (
              <ConversationItem
                key={conversation._id || conversation.id}
                conversation={conversation}
                onClick={() => onSelectConversation(conversation._id || conversation.id)}
                formatLastMessageTime={formatLastMessageTime}
                isUserSector={isUserSector}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConversationsList;