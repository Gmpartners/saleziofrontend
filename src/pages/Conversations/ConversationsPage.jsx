// pages/Conversations/ConversationsPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Clock, MessageSquare, User, MessageSquareOff, CheckCircle2 } from 'lucide-react';

// Contexts e Hooks
import { useSocket } from '../../contexts/SocketContext';
import { useAuthContext } from '../../hooks/useAuthContext';

// Components
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import ConversationHeader from '../../components/conversations/ConversationHeader';
import ConversationItem from '../../components/conversations/ConversationItem';

// Constants
import { MultiFlowStatusMap } from '../../contexts/SocketContext';

const ConversationsPage = () => {
  const navigate = useNavigate();
  const { userProfile, userSector, userSectorName, sectors } = useAuthContext();
  const { 
    conversations, 
    completedConversations,
    selectConversation, 
    refreshConversations,
    refreshCompletedConversations,
    isConnected,
    hasUnreadMessages,
    clearUnreadMessages
  } = useSocket();
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [filteredCompletedConversations, setFilteredCompletedConversations] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    sectors: [],
    scheduleStatus: []
  });
  
  // Referência para o último tempo de atualização
  const lastRefreshTimeRef = useRef(Date.now());
  
  // Limpar flag de mensagens não lidas quando a página é visualizada
  useEffect(() => {
    if (hasUnreadMessages) {
      clearUnreadMessages();
    }
  }, [hasUnreadMessages, clearUnreadMessages]);
  
  // Filtrar e agrupar conversas
  useEffect(() => {
    if (conversations) {
      setIsLoading(false);
      
      // Aplicar todos os filtros em uma única passagem
      const filtered = conversations.filter(conv => {
        // Verificar se a conversa é válida
        if (!conv || (typeof conv !== 'object')) return false;
        
        // 1. Filtro de pesquisa
        const searchTermLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
          (conv.nomeCliente?.toLowerCase()?.includes(searchTermLower)) ||
          (conv.cliente?.nome?.toLowerCase()?.includes(searchTermLower)) ||
          (conv.cliente?.telefone?.includes(searchTerm)) ||
          (conv.telefoneCliente?.includes(searchTerm)) ||
          (conv.ultimaMensagem?.toLowerCase()?.includes(searchTermLower));
        
        if (!matchesSearch) return false;
        
        // 2. Filtro por status (considerando formatos diferentes)
        const status = conv.status || '';
        const statusLower = status.toLowerCase();
        
        if (activeTab === 'waiting' && 
            !(statusLower === 'aguardando' || status === 'AGUARDANDO')) return false;
            
        if (activeTab === 'ongoing' && 
            !(statusLower === 'em_andamento' || statusLower === 'em andamento' || status === 'EM_ANDAMENTO')) return false;
        
        // 3. Filtro por setor (apenas se houver filtros ativos)
        if (activeFilters.sectors.length > 0) {
          const setorId = conv.setorId?._id || conv.setorId;
          if (!setorId || !activeFilters.sectors.includes(setorId)) return false;
        }
        
        // 4. Filtro por status de agendamento (apenas se houver filtros ativos)
        if (activeFilters.scheduleStatus.length > 0) {
          const agendamentoStatus = conv.agendamento?.status;
          if (!agendamentoStatus || !activeFilters.scheduleStatus.includes(agendamentoStatus)) return false;
        }
        
        return true;
      });
      
      // Ordenar por última atividade (mais recente primeiro)
      filtered.sort((a, b) => {
        const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
        const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
        return bTime - aTime;
      });
      
      setFilteredConversations(filtered);
    }
  }, [conversations, searchTerm, activeTab, activeFilters]);

  // Filtrar e agrupar conversas concluídas
  useEffect(() => {
    if (completedConversations) {
      setIsLoadingCompleted(false);
      
      // Aplicar filtros às conversas concluídas
      const filtered = completedConversations.filter(conv => {
        // Verificar se a conversa é válida
        if (!conv || (typeof conv !== 'object')) return false;
        
        // Filtro de pesquisa
        const searchTermLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
          (conv.nomeCliente?.toLowerCase()?.includes(searchTermLower)) ||
          (conv.cliente?.nome?.toLowerCase()?.includes(searchTermLower)) ||
          (conv.cliente?.telefone?.includes(searchTerm)) ||
          (conv.telefoneCliente?.includes(searchTerm)) ||
          (conv.ultimaMensagem?.toLowerCase()?.includes(searchTermLower));
        
        if (!matchesSearch) return false;
        
        // Filtro por setor (apenas se houver filtros ativos)
        if (activeFilters.sectors.length > 0) {
          const setorId = conv.setorId?._id || conv.setorId;
          if (!setorId || !activeFilters.sectors.includes(setorId)) return false;
        }
        
        return true;
      });
      
      // Ordenar por última atividade (mais recente primeiro)
      filtered.sort((a, b) => {
        const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
        const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
        return bTime - aTime;
      });
      
      setFilteredCompletedConversations(filtered);
    }
  }, [completedConversations, searchTerm, activeFilters]);
  
  // Carregar conversas iniciais
  useEffect(() => {
    const loadConversations = async () => {
      setIsLoading(true);
      setLoadingError(null);
      
      try {
        // Não usar nenhum filtro adicional, mostrar todas as conversas
        await refreshConversations({});
        lastRefreshTimeRef.current = Date.now();
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        setLoadingError('Não foi possível carregar as conversas. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Carregar apenas na montagem do componente
    loadConversations();
  }, [refreshConversations]);

  // Carregar conversas concluídas ao selecionar a aba
  useEffect(() => {
    const loadCompletedConversations = async () => {
      if (activeTab === 'completed' && (!completedConversations || completedConversations.length === 0)) {
        setIsLoadingCompleted(true);
        try {
          await refreshCompletedConversations();
        } catch (error) {
          console.error('Erro ao carregar conversas concluídas:', error);
        } finally {
          setIsLoadingCompleted(false);
        }
      }
    };

    loadCompletedConversations();
  }, [activeTab, completedConversations, refreshCompletedConversations]);
  
  // Navegação para a conversa selecionada
  const handleSelectConversation = (conversationId) => {
    selectConversation(conversationId);
    navigate(`/conversations/${conversationId}`);
  };
  
  // Limpar todos os filtros
  const clearFilters = () => {
    setActiveFilters({
      sectors: [],
      scheduleStatus: []
    });
    setSearchTerm('');
  };

  // Verificar mudança de aba
  const handleTabChange = (value) => {
    setActiveTab(value);
    // Se selecionar a aba de conversas concluídas e ainda não tiver carregado, carregar
    if (value === 'completed' && (!completedConversations || completedConversations.length === 0)) {
      refreshCompletedConversations();
    }
  };
  
  // O nome de exibição para o setor
  const sectorDisplayName = userSectorName || (userSector?.nome) || 'Todas as Conversas';
  
  // Verificar se há filtros ativos
  const hasActiveFilters = activeFilters.sectors.length > 0 
    || activeFilters.scheduleStatus.length > 0
    || searchTerm.length > 0;

  // Forçar atualização manual
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'completed') {
        await refreshCompletedConversations();
      } else {
        await refreshConversations({});
      }
      lastRefreshTimeRef.current = Date.now();
    } catch (error) {
      console.error('Erro ao atualizar conversas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Cabeçalho com título, status de conexão e filtros */}
      <ConversationHeader 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        sectorDisplayName={sectorDisplayName}
      />
      
      {/* Abas de conversas */}
      <div className="mt-5 flex-1 flex flex-col">
        <Tabs 
          defaultValue="all" 
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col"
        >
          <TabsList className="bg-[#0f1621] mb-4 border border-[#1f2937]/50 p-1">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-[#10b981] data-[state=active]:text-white"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Todas
            </TabsTrigger>
            <TabsTrigger 
              value="waiting" 
              className="data-[state=active]:bg-[#10b981] data-[state=active]:text-white"
            >
              <Clock className="mr-2 h-4 w-4" />
              Aguardando
            </TabsTrigger>
            <TabsTrigger 
              value="ongoing"
              className="data-[state=active]:bg-[#10b981] data-[state=active]:text-white" 
            >
              <User className="mr-2 h-4 w-4" />
              Em Andamento
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-[#10b981] data-[state=active]:text-white" 
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Concluídas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="flex-1 mt-0 overflow-auto">
            <ListaConversas 
              conversations={filteredConversations}
              onSelectConversation={handleSelectConversation}
              isLoading={isLoading}
              error={loadingError}
              hasFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              userSector={userSector}
            />
          </TabsContent>
          
          <TabsContent value="waiting" className="flex-1 mt-0 overflow-auto">
            <ListaConversas 
              conversations={filteredConversations}
              onSelectConversation={handleSelectConversation}
              isLoading={isLoading}
              error={loadingError}
              hasFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              userSector={userSector}
            />
          </TabsContent>
          
          <TabsContent value="ongoing" className="flex-1 mt-0 overflow-auto">
            <ListaConversas 
              conversations={filteredConversations}
              onSelectConversation={handleSelectConversation}
              isLoading={isLoading}
              error={loadingError}
              hasFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              userSector={userSector}
            />
          </TabsContent>

          <TabsContent value="completed" className="flex-1 mt-0 overflow-auto">
            <ListaConversas 
              conversations={filteredCompletedConversations}
              onSelectConversation={handleSelectConversation}
              isLoading={isLoadingCompleted}
              error={loadingError}
              hasFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              userSector={userSector}
              isCompletedTab={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Componente para listar conversas
const ListaConversas = ({ 
  conversations, 
  onSelectConversation, 
  isLoading,
  error,
  hasFilters,
  onClearFilters,
  userSector,
  isCompletedTab = false
}) => {
  // Formatação de data/hora
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
  
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-6 rounded-lg bg-red-600/10 border border-red-600/30 max-w-md">
          <h3 className="text-lg font-medium text-red-400 mb-2">Erro ao carregar conversas</h3>
          <p className="text-sm text-slate-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
            <span>Tentar novamente</span>
          </button>
        </div>
      </div>
    );
  }
  
  if (isLoading && conversations.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="p-4 rounded-lg bg-[#0f1621] border border-[#1f2937]/40 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40 mb-2 bg-[#1f2937]/60" />
              <Skeleton className="h-3 w-full bg-[#1f2937]/40" />
            </div>
            <Skeleton className="h-3 w-16 bg-[#1f2937]/60" />
          </div>
        ))}
      </div>
    );
  }
  
  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-[#101820]/60 rounded-full flex items-center justify-center mb-4">
            <MessageSquareOff className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {hasFilters 
              ? 'Nenhuma conversa corresponde aos filtros' 
              : isCompletedTab
                ? 'Nenhuma conversa concluída disponível'
                : 'Nenhuma conversa disponível'}
          </h3>
          <p className="text-sm text-slate-400">
            {hasFilters 
              ? 'Tente ajustar os filtros de pesquisa para ver mais resultados.' 
              : isCompletedTab
                ? 'As conversas finalizadas aparecerão aqui automaticamente.'
                : 'Novas conversas aparecerão aqui automaticamente.'}
          </p>
          
          {hasFilters && (
            <button 
              onClick={onClearFilters}
              className="mt-4 px-4 py-1.5 border border-[#1f2937]/50 bg-[#0f1621] hover:bg-[#101820] text-slate-300 rounded-md"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-6">
      <AnimatePresence>
        {conversations.map((conversation) => {
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
              isCompleted={isCompletedTab}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ConversationsPage;