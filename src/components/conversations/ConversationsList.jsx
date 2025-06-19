import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Search, Loader2, User, MessageSquare, RefreshCw, Filter, X } from 'lucide-react';
import ConversationItem from './ConversationItem';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";

import { useWindowSize } from '../../hooks/useWindowSize';

const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  ARQUIVADA: 'arquivada'
};

const debounce = (func, delay) => {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
};

const TabWithUnreadCount = React.memo(({ value, label, count }) => (
  <TabsTrigger 
    value={value} 
    className={`
      rounded-none data-[state=active]:border-b-2 
      ${value === 'em_andamento' 
        ? 'data-[state=active]:border-[#10b981] data-[state=active]:text-[#10b981] data-[state=active]:bg-[#10b981]/10' 
        : value === 'aguardando'
          ? 'data-[state=active]:border-orange-500 data-[state=active]:text-orange-400 data-[state=active]:bg-orange-500/10'
          : 'data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 data-[state=active]:bg-blue-500/10'
      }
      text-sm data-[state=inactive]:text-slate-400 transition-all relative
    `}
  >
    {label}
    {count > 0 && (
      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#10b981] text-[10px] font-bold text-white">
        {count > 9 ? '9+' : count}
      </span>
    )}
  </TabsTrigger>
));

const VirtualizedConversationList = React.memo(({ 
  conversations, 
  selectedConversationId, 
  onSelectConversation 
}) => {
  const itemSize = 80;
  
  const Row = useCallback(({ index, style }) => {
    const conversation = conversations[index];
    return (
      <div style={style} key={conversation._id || index}>
        <ConversationItem
          conversation={conversation}
          isSelected={selectedConversationId === conversation._id}
          onClick={() => onSelectConversation(conversation._id)}
        />
      </div>
    );
  }, [conversations, selectedConversationId, onSelectConversation]);
  
  return (
    <div className="flex-1 h-full">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={conversations.length}
            itemSize={itemSize}
            overscanCount={5}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

const ConversationsList = ({ 
  conversations = [],
  selectedConversationId,
  onSelectConversation, 
  onRefresh,
  isLoading,
  error,
  sectors = [],
  userSector,
  showNotifications = true,
  onToggleNotifications,
  activeTab = 'em_andamento',
  onTabChange,
  filters = { sectorFilter: 'all', searchTerm: '', arquivada: false },
  onFilterChange,
  onSearchChange
}) => {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const searchInputRef = useRef(null);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const unreadCounts = useMemo(() => {
    if (!conversations) return { all: 0, awaiting: 0, ongoing: 0 };
    
    return conversations.reduce((counts, conv) => {
      const unreadCount = conv.unreadCount || 0;
      counts.all += unreadCount;
      
      const status = conv.status?.toLowerCase() || '';
      if (status === STATUS.AGUARDANDO) {
        counts.awaiting += unreadCount;
      } else if (status === STATUS.EM_ANDAMENTO) {
        counts.ongoing += unreadCount;
      }
      
      return counts;
    }, { all: 0, awaiting: 0, ongoing: 0 });
  }, [conversations]);
  
  // Lista de setores disponíveis
  const availableSectors = useMemo(() => {
    const sectorSet = new Set();
    sectorSet.add('all');
    
    // Extrair setores de conversas
    if (conversations && conversations.length > 0) {
      conversations.forEach(conv => {
        if (conv.setorId?.nome) {
          sectorSet.add(conv.setorId.nome);
        } else if (conv.setorInfo?.nome) {
          sectorSet.add(conv.setorInfo.nome);
        }
      });
    }
    
    // Adicionar setores disponíveis da lista de setores
    if (sectors && sectors.length > 0) {
      sectors.forEach(sector => {
        if (sector.nome) {
          sectorSet.add(sector.nome);
        }
      });
    }
    
    return Array.from(sectorSet).map(sector => ({
      value: sector,
      label: sector === 'all' ? 'Todos os Setores' : sector
    }));
  }, [conversations, sectors]);
  
  const handleRefreshConversations = useCallback(async () => {
    if (isRefreshing || !onRefresh) return;
    
    setIsRefreshing(true);
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar lista de conversas:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);
  
  // Handler para busca com debounce
  const handleSearch = useMemo(() => debounce((value) => {
    if (onSearchChange) {
      onSearchChange(value.toLowerCase());
    }
  }, 300), [onSearchChange]);
  
  // Handler para mudança de setor
  const handleSectorChange = useCallback((value) => {
    if (onFilterChange) {
      onFilterChange('sectorFilter', value);
    }
  }, [onFilterChange]);
  
  const toggleFilter = useCallback(() => {
    setIsFilterOpen(!isFilterOpen);
  }, [isFilterOpen]);
  
  // Filtragem de conversas
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Filtro por status
      const statusMatch = activeTab === 'finalizada' 
        ? (conv.status && conv.status.toLowerCase() === STATUS.FINALIZADA)
        : activeTab === 'aguardando'
          ? (conv.status && conv.status.toLowerCase() === STATUS.AGUARDANDO)
          : activeTab === 'em_andamento'
            ? (conv.status && conv.status.toLowerCase() === STATUS.EM_ANDAMENTO)
            : true;
      
      // Filtro por termo de busca
      const searchMatch = !filters.searchTerm || 
        (conv.nomeCliente && conv.nomeCliente.toLowerCase().includes(filters.searchTerm)) ||
        (conv.telefoneCliente && conv.telefoneCliente.includes(filters.searchTerm)) ||
        (conv.ultimaMensagem && conv.ultimaMensagem.toLowerCase().includes(filters.searchTerm));
      
      // Filtro por setor
      const sectorMatch = filters.sectorFilter === 'all' || 
        (conv.setorId && 
          ((typeof conv.setorId === 'object' && conv.setorId.nome === filters.sectorFilter) || 
           conv.setorId === filters.sectorFilter)) ||
        (conv.setorInfo && conv.setorInfo.nome === filters.sectorFilter);
      
      return statusMatch && searchMatch && sectorMatch;
    });
  }, [activeTab, conversations, filters.searchTerm, filters.sectorFilter]);
  
  const renderConversationList = useCallback(() => {
    if (isLoading || isRefreshing) {
      return (
        <div className="flex items-center justify-center h-16 text-slate-400 text-sm py-8">
          <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#10b981]" />
          <span>Carregando conversas...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <X className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg text-white font-medium mb-2">Erro ao carregar</h3>
          <p className="text-slate-400 mb-4 max-w-md">{error}</p>
          <Button 
            onClick={handleRefreshConversations}
            className="bg-[#101820] border-[#1f2937]/40 text-[#10b981] hover:bg-[#101820] hover:text-[#10b981]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      );
    }
    
    if (filteredConversations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-sm py-8">
          <div className="w-16 h-16 rounded-full bg-[#101820] flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-slate-400/70" />
          </div>
          <p>Nenhuma conversa {activeTab === 'finalizada' ? 'finalizada' : activeTab === 'aguardando' ? 'aguardando' : 'em andamento'}.</p>
          <Button
            onClick={handleRefreshConversations}
            variant="outline"
            size="sm"
            className="mt-4 text-xs bg-[#101820] border-[#1f2937]/40 text-[#10b981] hover:bg-[#101820] hover:text-[#10b981] transition-all duration-300"
          >
            {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
            Atualizar conversas
          </Button>
        </div>
      );
    }
    
    return (
      <div className="h-full">
        <VirtualizedConversationList
          conversations={filteredConversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={onSelectConversation}
        />
      </div>
    );
  }, [isLoading, isRefreshing, error, filteredConversations, activeTab, handleRefreshConversations, onSelectConversation, selectedConversationId]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-[#070b11] border-b border-[#1f2937]/40 flex justify-between items-center rounded-t-xl sticky top-0 z-30">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#10b981]" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#10b981] to-[#059669]">Conversas</span>
          {unreadCounts.all > 0 && (
            <Badge className="bg-[#10b981] text-white text-xs ml-1 px-1.5">
              {unreadCounts.all}
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-1">
          {onToggleNotifications && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-[#101820]"
              onClick={onToggleNotifications}
              title={showNotifications ? "Desativar notificações" : "Ativar notificações"}
            >
              {showNotifications ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell-off">
                  <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
                  <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  <path d="m2 2 20 20" />
                </svg>
              )}
            </Button>
          )}
          <Badge variant="outline" className="bg-[#101820] border-[#1f2937]/40 text-xs font-medium text-[#10b981] px-2.5">
            {filteredConversations.length} conversas
          </Badge>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-[#1f2937]/40 bg-[#070b11] sticky top-[60px] z-20">
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder={isMobile ? "Buscar..." : "Buscar conversas..."}
              onChange={(e) => handleSearch(e.target.value)}
              ref={searchInputRef}
              className="w-full pl-10 bg-[#101820] border-[#1f2937]/40 focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50 rounded-lg text-white placeholder:text-slate-400/70"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
          
          {/* Filtro de setor (adicionado do admin) */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 bg-[#101820] border-[#1f2937]/40" 
                onClick={toggleFilter}
              >
                <Filter className="h-4 w-4 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 md:w-80 bg-[#070b11] border border-[#1f2937]/40 p-4 shadow-lg z-50">
              <div className="space-y-4">
                <h3 className="font-medium text-white">Filtrar Conversas</h3>
                
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Setor</label>
                  <Select
                    value={filters.sectorFilter}
                    onValueChange={handleSectorChange}
                  >
                    <SelectTrigger className="bg-[#101820] border-[#1f2937]/40 text-white text-sm">
                      <SelectValue placeholder="Selecione um setor" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#101820] border-[#1f2937]/40 text-white max-h-52">
                      {availableSectors.map(sector => (
                        <SelectItem key={sector.value} value={sector.value} className="hover:bg-[#1f2937] text-sm">
                          {sector.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={() => {
                    handleRefreshConversations();
                    setIsFilterOpen(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full bg-[#101820] border-[#1f2937]/40 text-[#10b981] hover:bg-[#101820] hover:text-[#10b981]"
                >
                  {isRefreshing ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                  Atualizar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Indicador de filtro ativo (adicionado do admin) */}
        {filters.sectorFilter !== 'all' && (
          <div className="flex items-center mt-2">
            <Badge className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
              {availableSectors.find(s => s.value === filters.sectorFilter)?.label || filters.sectorFilter}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 ml-2 text-slate-400 hover:text-white hover:bg-transparent"
              onClick={() => handleSectorChange('all')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <Tabs 
        defaultValue="em_andamento" 
        value={activeTab} 
        onValueChange={onTabChange}
        className="w-full flex-1 flex flex-col"
      >
        <TabsList className="w-full grid grid-cols-3 bg-transparent border-b border-[#1f2937]/40 h-12 rounded-none p-0 sticky top-[124px] z-10">
          <TabWithUnreadCount value="em_andamento" label="Em Andamento" count={unreadCounts.ongoing} />
          <TabWithUnreadCount value="aguardando" label="Aguardando" count={unreadCounts.awaiting} />
          <TabWithUnreadCount value="finalizada" label="Finalizadas" count={0} />
        </TabsList>

        <div className="flex-1 overflow-hidden bg-[#070b11]">
          {renderConversationList()}
        </div>
      </Tabs>
    </div>
  );
};

export default React.memo(ConversationsList);