// pages/Conversations/ConversationsPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, RefreshCw, Clock, MessageSquare, User, MessageSquareOff, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Contexts e Hooks
import { useSocket } from '../../contexts/SocketContext';
import { useAuthContext } from '../../hooks/useAuthContext';

// Components
import ConnectionStatus from '../../components/ConnectionStatus';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const ConversationsPage = () => {
  const navigate = useNavigate();
  const { userProfile, userSector, userSectorName, sectors } = useAuthContext();
  const { 
    conversations, 
    selectConversation, 
    refreshConversations,
    isConnected,
    socketService
  } = useSocket();
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    sectors: [],
    scheduleStatus: []
  });
  
  // Referência para depuração
  const debugRef = useRef(false);
  
  // Log para debug - apenas na primeira vez
  useEffect(() => {
    if (!debugRef.current && conversations && conversations.length > 0) {
      debugRef.current = true;
      console.log("Exemplo de conversa:", conversations[0]);
    }
  }, [conversations]);
  
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
      
      setFilteredConversations(filtered);
    }
  }, [conversations, searchTerm, activeTab, activeFilters]);
  
  // Carregar conversas iniciais e configurar atualização periódica
  useEffect(() => {
    setIsLoading(true);
    setLoadingError(null);
    
    // Função de carregamento
    const loadConversations = async () => {
      try {
        // MODIFICAÇÃO: Não usar nenhum filtro adicional, exibir todas as conversas
        const success = await refreshConversations({});
        if (!success) {
          setLoadingError('Não foi possível carregar as conversas. O servidor pode estar indisponível.');
        }
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        setLoadingError('Não foi possível carregar as conversas. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Carregar imediatamente
    loadConversations();
    
    // Configurar atualização periódica (a cada 30 segundos)
    const intervalId = setInterval(loadConversations, 30000);
    
    return () => clearInterval(intervalId);
  }, [refreshConversations]);
  
  // Navegação para a conversa selecionada
  const handleSelectConversation = (conversationId) => {
    selectConversation(conversationId);
    navigate(`/conversations/${conversationId}`);
  };
  
  // Aplicar filtro de setor
  const toggleSectorFilter = (sectorId) => {
    setActiveFilters(prev => {
      const sectors = prev.sectors.includes(sectorId)
        ? prev.sectors.filter(id => id !== sectorId)
        : [...prev.sectors, sectorId];
      
      return {
        ...prev,
        sectors
      };
    });
  };
  
  // Aplicar filtro de status de agendamento
  const toggleScheduleStatusFilter = (status) => {
    setActiveFilters(prev => {
      const scheduleStatus = prev.scheduleStatus.includes(status)
        ? prev.scheduleStatus.filter(s => s !== status)
        : [...prev.scheduleStatus, status];
      
      return {
        ...prev,
        scheduleStatus
      };
    });
  };
  
  // Limpar todos os filtros
  const clearFilters = () => {
    setActiveFilters({
      sectors: [],
      scheduleStatus: []
    });
  };
  
  // Formatar data de última mensagem
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, "'Hoje,' HH:mm", { locale: ptBR });
    } else if (isYesterday(date)) {
      return format(date, "'Ontem,' HH:mm", { locale: ptBR });
    } else if (isSameDay(date, new Date())) {
      return format(date, "HH:mm", { locale: ptBR });
    } else {
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    }
  };

  // O nome de exibição para o setor
  const sectorDisplayName = userSectorName || (userSector?.nome) || 'Financeiro';
  
  // Verificar se há filtros ativos
  const hasActiveFilters = activeFilters.sectors.length > 0 || activeFilters.scheduleStatus.length > 0;

  // Forçar atualização manual
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // MODIFICAÇÃO: Não usar nenhum filtro adicional, exibir todas as conversas
      await refreshConversations({});
    } catch (error) {
      console.error('Erro ao atualizar conversas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Título e Status de Conexão */}
      <ConnectionStatus setor={sectorDisplayName} />
      
      {/* Filtros e Pesquisa */}
      <div className="my-5 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Procurar por nome, telefone ou mensagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#1e1d2b]/60 backdrop-blur-sm border-[#32304a] text-white placeholder-gray-500 h-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 border-[#32304a] bg-[#1e1d2b]/60 text-gray-400 hover:text-white hover:bg-[#32304a]"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>
      
      {/* Abas de conversas */}
      <Tabs 
        defaultValue="all" 
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="bg-[#1e1d2b]/60 mb-4 border border-[#32304a] p-1">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Todas
          </TabsTrigger>
          <TabsTrigger 
            value="waiting" 
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            <Clock className="mr-2 h-4 w-4" />
            Aguardando
          </TabsTrigger>
          <TabsTrigger 
            value="ongoing"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white" 
          >
            <User className="mr-2 h-4 w-4" />
            Em Andamento
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="flex-1 mt-0">
          <ListaConversas 
            conversations={filteredConversations} 
            onSelectConversation={handleSelectConversation}
            formatLastMessageTime={formatLastMessageTime}
            isLoading={isLoading}
            error={loadingError}
            sectors={sectors || []}
          />
        </TabsContent>
        
        <TabsContent value="waiting" className="flex-1 mt-0">
          <ListaConversas 
            conversations={filteredConversations} 
            onSelectConversation={handleSelectConversation}
            formatLastMessageTime={formatLastMessageTime}
            isLoading={isLoading}
            error={loadingError}
            sectors={sectors || []}
          />
        </TabsContent>
        
        <TabsContent value="ongoing" className="flex-1 mt-0">
          <ListaConversas 
            conversations={filteredConversations} 
            onSelectConversation={handleSelectConversation}
            formatLastMessageTime={formatLastMessageTime}
            isLoading={isLoading}
            error={loadingError}
            sectors={sectors || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente para listar conversas
const ListaConversas = ({ 
  conversations, 
  onSelectConversation, 
  formatLastMessageTime,
  isLoading,
  error,
  sectors
}) => {
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-6 rounded-lg bg-red-600/10 border border-red-600/30 max-w-md">
          <h3 className="text-lg font-medium text-red-400 mb-2">Erro ao carregar conversas</h3>
          <p className="text-sm text-gray-400">{error}</p>
          <Button 
            variant="destructive" 
            className="mt-4 bg-red-600 hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="p-4 rounded-xl bg-[#1e1d2b]/60 border border-[#32304a]/40 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40 mb-2 bg-[#32304a]/60" />
              <Skeleton className="h-3 w-full bg-[#32304a]/40" />
            </div>
            <Skeleton className="h-3 w-16 bg-[#32304a]/60" />
          </div>
        ))}
      </div>
    );
  }
  
  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-[#32304a]/40 rounded-full flex items-center justify-center mb-4">
            <MessageSquareOff className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Nenhuma conversa encontrada</h3>
          <p className="text-sm text-gray-400">
            Não há conversas disponíveis no momento. Novas conversas aparecerão aqui automaticamente.
          </p>
        </div>
      </div>
    );
  }

  // Função para obter o nome do setor a partir do ID
  const getSectorName = (sectorId) => {
    if (!sectorId || !sectors || !sectors.length) return '';
    const sector = sectors.find(s => s.id === sectorId || s._id === sectorId);
    return sector ? sector.nome : 'Outro Setor';  // MODIFICAÇÃO: Retornar "Outro Setor" se não encontrado
  };
  
  return (
    <div className="space-y-2 pb-6">
      <AnimatePresence>
        {conversations.map((conversation) => {
          // Tentar encontrar o nome do cliente de várias formas
          let clienteName = "Cliente";
          if (conversation.nomeCliente) {
            clienteName = conversation.nomeCliente;
          } else if (conversation.cliente && conversation.cliente.nome) {
            clienteName = conversation.cliente.nome;
          } else if (conversation.nome) {
            clienteName = conversation.nome;
          } else if (conversation.name) {
            clienteName = conversation.name;
          }
          
          // Tentar encontrar o número de telefone de várias formas
          let telefone = null;
          if (conversation.telefoneCliente) {
            telefone = conversation.telefoneCliente;
          } else if (conversation.cliente && conversation.cliente.telefone) {
            telefone = conversation.cliente.telefone;
          } else if (conversation.telefone) {
            telefone = conversation.telefone;
          } else if (conversation.phone) {
            telefone = conversation.phone;
          }
          
          // Tentar encontrar o setor de várias formas
          let sectorLabel = "Setor";
          if (conversation.setor && conversation.setor.nome) {
            sectorLabel = conversation.setor.nome;
          } else if (conversation.setorNome) {
            sectorLabel = conversation.setorNome;
          } else if (conversation.sectorName) {
            sectorLabel = conversation.sectorName;
          } else if (conversation.setorId) {
            const setorIdValue = conversation.setorId._id || conversation.setorId;
            sectorLabel = getSectorName(setorIdValue) || "Setor";
          }
          
          // Verificar se a conversa pertence ao setor do usuário
          const userSectorId = userSector?._id || userSector?.id;
          const conversationSectorId = conversation.setorId?._id || conversation.setorId;
          const isUserSector = userSectorId === conversationSectorId;
          
          // Determinar o status da conversa
          let statusLabel = "Em Andamento";
          let statusColor = "bg-green-600 hover:bg-green-700";
          
          const status = conversation.status || '';
          const statusLower = String(status).toLowerCase();
          
          if (statusLower === 'aguardando' || status === 'AGUARDANDO') {
            statusLabel = "Aguardando";
            statusColor = "bg-yellow-600 hover:bg-yellow-700";
          }
          
          return (
            <motion.div
              key={conversation._id || conversation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="cursor-pointer"
              onClick={() => onSelectConversation(conversation._id || conversation.id)}
            >
              <div className={`p-4 rounded-xl backdrop-blur-sm border transition-all duration-200 shadow-sm hover:shadow-md
                ${isUserSector 
                  ? "bg-[#1e1d2b]/60 border-[#32304a]/40 hover:bg-[#2a2942]/60 hover:border-[#32304a]/70" 
                  : "bg-[#2a1e2d]/60 border-[#4a324a]/40 hover:bg-[#3a2a3d]/60 hover:border-[#4a324a]/70"}`}>
                <div className="flex items-center gap-3">
                  <Avatar className={`h-10 w-10 ${isUserSector 
                    ? "bg-green-600/20 border border-green-500/40" 
                    : "bg-purple-600/20 border border-purple-500/40"}`}>
                    <AvatarImage src={conversation.cliente?.avatar} />
                    <AvatarFallback className={`${isUserSector 
                      ? "bg-gradient-to-br from-green-600 to-green-500" 
                      : "bg-gradient-to-br from-purple-600 to-purple-500"} text-white`}>
                      {clienteName.charAt(0) || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white truncate flex items-center gap-2">
                        {clienteName}
                        {telefone && (
                          <span className="text-xs text-gray-400 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {telefone}
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {formatLastMessageTime(conversation.ultimaAtividade || conversation.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {/* Status da conversa */}
                      <Badge 
                        className={`px-2 py-1 text-xs text-white ${statusColor}`}
                      >
                        {statusLabel}
                      </Badge>
                      
                      {/* Setor designado - Diferente cor para o setor do usuário */}
                      <span className={`px-2 py-1 text-xs rounded-md ${isUserSector 
                        ? "text-blue-300 bg-blue-900/30" 
                        : "text-purple-300 bg-purple-900/30"}`}>
                        {sectorLabel}
                      </span>
                    </div>
                    
                    {/* Mensagem em linha separada para melhor legibilidade */}
                    <p className="text-sm text-gray-400 truncate mt-1">
                      {conversation.ultimaMensagem || 'Sem mensagens'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ConversationsPage;