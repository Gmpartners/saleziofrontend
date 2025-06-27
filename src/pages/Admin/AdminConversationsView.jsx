import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageSquare, 
  Search, 
  RefreshCw, 
  Loader2,
  User, 
  Filter, 
  X,
  Bell,
  BellOff,
  CheckCircle,
  Share,
  Archive,
  Phone,
  Video,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { multiflowApi } from '../../services/multiflowApi';
import { cn } from "../../lib/utils";
import { useAuthContext } from '../../hooks/useAuthContext';
import { socketService } from '../../services/socket';

import ConversationItem from '../../components/conversations/ConversationItem';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "../../components/ui/tabs";
import { Calendar } from "../../components/ui/calendar";
import { 
  Alert,
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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

const VirtualizedConversationList = React.memo(({ 
  conversations, 
  selectedConversationId, 
  onSelectConversation 
}) => {
  const itemSize = 80;
  
  const Row = useCallback(({ index, style }) => {
    const conversation = conversations[index];
    return (
      <div style={style} key={conversation._id || conversation.id}>
        <ConversationItem
          conversation={conversation}
          isSelected={selectedConversationId === (conversation._id || conversation.id)}
          onClick={() => onSelectConversation(conversation._id || conversation.id)}
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
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

const TabWithUnreadCount = React.memo(({ value, label, count }) => (
  <TabsTrigger 
    value={value} 
    className={`
      rounded-none data-[state=active]:border-b-2 
      ${value === 'ongoing' 
        ? 'data-[state=active]:border-[#10b981] data-[state=active]:text-[#10b981] data-[state=active]:bg-[#10b981]/10' 
        : value === 'waiting'
          ? 'data-[state=active]:border-orange-500 data-[state=active]:text-orange-400 data-[state=active]:bg-orange-500/10'
          : value === 'completed'
            ? 'data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 data-[state=active]:bg-blue-500/10'
            : 'data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 data-[state=active]:bg-purple-500/10'
      }
      text-sm data-[state=inactive]:text-slate-400 transition-all relative
    `}
  >
    {label}
    {count > 0 && (
      <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 md:h-3.5 md:w-3.5 rounded-full bg-[#10b981] animate-pulse" />
    )}
  </TabsTrigger>
));

const AdminConversationsView = () => {
  const navigate = useNavigate();
  const { apiToken, userProfile, user } = useAuthContext();
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const shouldFetchRef = useRef(true);
  const isInitialSetupRef = useRef(true);
  const firstLoadCompletedRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  
  const [activeTab, setActiveTab] = useState('all');
  const [conversations, setConversations] = useState([]);
  const [completedConversations, setCompletedConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem('adminNotifications') !== 'false'
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    arquivada: false,
    sectorFilter: 'all'
  });
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [sectors, setSectors] = useState([]);
  const [empresasComSetores, setEmpresasComSetores] = useState([]);
  const [expandedEmpresas, setExpandedEmpresas] = useState({});
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0
  });
  
  const connectSocket = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting socket:", e);
      }
    }
    
    console.log("Connecting socket in AdminConversationsView");
    
    socketRef.current = socketService.getSocket();
    
    socketRef.current.on('connect', () => {
      console.log('Socket conectado (Admin View)');
      setIsConnected(true);
      
      const userId = userProfile?.id || user?.uid;
      if (userId) {
        socketRef.current.emit('register_admin', { userId });
      }
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket desconectado (Admin View)');
      setIsConnected(false);
    });
    
    socketRef.current.on('new_message', (data) => {
      updateUnreadCount(data.conversationId);
      
      if (notificationsEnabled && data.conversation) {
        notifyNewMessage(data);
      }
      
      const now = Date.now();
      if (now - lastFetchTimeRef.current > 5000) {
        lastFetchTimeRef.current = now;
        shouldFetchRef.current = true;
        fetchConversations(pagination.current, true);
      }
    });
    
    socketRef.current.on('conversation_updated', () => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current > 5000) {
        lastFetchTimeRef.current = now;
        shouldFetchRef.current = true;
        fetchConversations(pagination.current, true);
      }
    });
    
    setIsConnected(socketService.isConnectedToServer());
    
    return socketRef.current;
  }, [userProfile, user, notificationsEnabled, pagination.current]);
  
  useEffect(() => {
    if (isInitialSetupRef.current && apiToken && userProfile) {
      isInitialSetupRef.current = false;
      connectSocket();
    }
    
    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.off('connect');
          socketRef.current.off('disconnect');
          socketRef.current.off('new_message');
          socketRef.current.off('conversation_updated');
        } catch (e) {
          console.error("Error removing socket listeners:", e);
        }
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [apiToken, userProfile, connectSocket]);
  
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      if (!isRefreshing) {
        const now = Date.now();
        if (now - lastFetchTimeRef.current > 30000) {
          lastFetchTimeRef.current = now;
          console.log("Polling: Atualizando conversas");
          fetchConversations(pagination.current, true);
        }
      }
    }, 60000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [pagination.current]);
  
  const fetchEmpresasComSetores = useCallback(async () => {
    try {
      if (!apiToken) {
        return;
      }
      
      console.log('Admin: Buscando empresas com setores usando novo endpoint...');
      
      // Usar o novo endpoint que retorna tudo em uma única chamada
      const response = await multiflowApi.getEmpresasComSetores(
        multiflowApi.ADMIN_ID,
        true, // isAdmin
        { ativo: true, incluirVazias: false }
      );
      
      if (response.success && response.data && response.data.length > 0) {
        console.log(`Admin: Endpoint retornou ${response.data.length} empresas com setores`);
        
        // Os dados já vêm no formato correto do backend
        const empresasComSetoresFiltradas = response.data.filter(
          item => item.setores && item.setores.length > 0
        );
        
        console.log(`Admin: ${empresasComSetoresFiltradas.length} empresas têm setores`);
        setEmpresasComSetores(empresasComSetoresFiltradas);
        
        // Expandir todas as empresas por padrão
        const expandedState = {};
        empresasComSetoresFiltradas.forEach(item => {
          const empresaId = item._id || item.empresaId;
          expandedState[empresaId] = true;
        });
        setExpandedEmpresas(expandedState);
        
        // Manter lista plana de setores para compatibilidade
        const todosSetores = empresasComSetoresFiltradas.flatMap(item => item.setores);
        setSectors(todosSetores);
        
        console.log(`Admin: Total de setores disponíveis: ${todosSetores.length}`);
      } else {
        // Fallback para busca simples de setores
        console.log('Admin: Nenhuma empresa com setores encontrada, usando fallback');
        fetchSectors();
      }
    } catch (err) {
      console.error('Admin: Erro ao buscar empresas com setores:', err);
      // Fallback para busca simples de setores
      fetchSectors();
    }
  }, [apiToken]);
  
  const fetchSectors = useCallback(async () => {
    try {
      if (!apiToken) {
        return;
      }
      
      const response = await multiflowApi.getSetores(null, true);
      
      if (response.success) {
        setSectors(response.data);
      }
    } catch (err) {
      console.error('Erro ao buscar setores:', err);
    }
  }, [apiToken]);
  
  const notifyNewMessage = useCallback((data) => {
    const { conversationId, message, conversation } = data;
    
    if (document.visibilityState === 'visible') {
      const title = conversation?.nomeCliente || 'Novo cliente';
      const content = message?.conteudo || message?.texto || message?.content || 'Enviou uma mensagem';
      
      toast.info(
        <div className="flex flex-col">
          <span className="font-bold">{title}</span>
          <span className="text-sm truncate max-w-xs">{content}</span>
        </div>,
        {
          action: {
            label: "Ver",
            onClick: () => handleSelectConversation(conversationId)
          },
          duration: 5000
        }
      );
    } else if (document.visibilityState === 'hidden') {
      try {
        const title = conversation?.nomeCliente || 'Novo cliente';
        const content = message?.conteudo || message?.texto || message?.content || 'Enviou uma mensagem';
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Nova mensagem de ' + title, {
            body: content,
            icon: '/logo192.png'
          });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Nova mensagem de ' + title, {
                body: content,
                icon: '/logo192.png'
              });
            }
          });
        }
      } catch (err) {
        console.error('Erro ao exibir notificação:', err);
      }
    }
  }, []);
  
  const updateUnreadCount = useCallback((conversationId) => {
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        if (conv._id === conversationId || conv.id === conversationId) {
          return {
            ...conv,
            unreadCount: (conv.unreadCount || 0) + 1
          };
        }
        return conv;
      });
    });
  }, []);
  
  const performOperation = async (operation, operationName, maxRetries = 3) => {
    let attempts = 0;
    let lastError = null;
    
    while (attempts < maxRetries) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;
        attempts++;
        console.error(`Tentativa ${attempts} para ${operationName} falhou:`, error);
        
        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }
    
    throw lastError || new Error(`Falhou após ${maxRetries} tentativas`);
  };
  
  const buildApiFilters = useCallback(() => {
    const filters = {
      page: pagination.current,
      limit: pagination.pageSize,
      arquivada: filters.arquivada,
      forceRefresh: false
    };
    
    if (searchTerm) {
      filters.search = searchTerm;
    }
    
    if (dateRange.from) {
      filters.dataInicio = format(dateRange.from, 'yyyy-MM-dd');
    }
    
    if (dateRange.to) {
      filters.dataFim = format(dateRange.to, 'yyyy-MM-dd');
    }
    
    if (activeTab === 'completed') {
      filters.status = 'finalizada';
    } else if (activeTab === 'waiting') {
      filters.status = 'aguardando';
    } else if (activeTab === 'ongoing') {
      filters.status = 'em_andamento';
    }
    
    return filters;
  }, [activeTab, pagination, searchTerm, dateRange, filters.arquivada]);
  
  const fetchConversations = useCallback(async (page = 1, silent = false) => {
    if (isRefreshing && silent) return;
    
    const now = Date.now();
    if (firstLoadCompletedRef.current && now - lastFetchTimeRef.current < 1000) {
      console.log("Evitando chamada excessiva à API - menos de 1s da última chamada");
      return;
    }
    
    try {
      if (!silent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      setError(null);
      
      if (!apiToken) {
        throw new Error('Token de API não fornecido');
      }
      
      console.log(`Buscando conversas na API (page: ${page}, silent: ${silent})`);
      lastFetchTimeRef.current = now;
      
      const apiFilters = {
        ...buildApiFilters(),
        page
      };
      
      const userId = multiflowApi.ADMIN_ID;
      const result = await performOperation(
        () => multiflowApi.getConversas(apiFilters, userId, true),
        'fetchConversations'
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao carregar conversas');
      }
      
      const conversationsList = result.data || [];
      console.log(`Carregadas ${conversationsList.length} conversas`);
      
      const updatedConversations = conversationsList.map(newConv => {
        const normalizedId = multiflowApi.getConversaId(newConv);
        const existingConv = conversations.find(
          c => (multiflowApi.getConversaId(c) === normalizedId)
        );
        
        return {
          ...newConv,
          unreadCount: existingConv ? existingConv.unreadCount : 0
        };
      });
      
      if (activeTab === 'completed') {
        setCompletedConversations(updatedConversations);
      } else {
        setConversations(updatedConversations);
      }
      
      if (result.pagination) {
        setPagination({
          current: result.pagination.page || result.pagination.pagina,
          pageSize: result.pagination.limit,
          total: result.pagination.total,
          totalPaginas: result.pagination.totalPaginas || Math.ceil(result.pagination.total / result.pagination.limit)
        });
      }
      
      firstLoadCompletedRef.current = true;
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
      if (!silent) {
        setError(typeof err === 'string' ? err : err.message || 'Erro ao buscar conversas');
        toast.error('Erro ao carregar conversas', {
          description: typeof err === 'string' ? err : err.message || 'Tente novamente mais tarde'
        });
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [activeTab, buildApiFilters, apiToken, conversations, isRefreshing, performOperation]);
  
  useEffect(() => {
    if (userProfile || user) {
      fetchEmpresasComSetores();
    }
  }, [fetchEmpresasComSetores, userProfile, user]);
  
  useEffect(() => {
    if (userProfile || user) {
      console.log("Carregando conversas iniciais ou após mudança de filtros");
      fetchConversations(1);
    }
  }, [activeTab, filters.arquivada, userProfile, user]);
  
  useEffect(() => {
    if ((dateRange.from || dateRange.to) && firstLoadCompletedRef.current) {
      console.log("Mudança na faixa de datas, recarregando conversas");
      fetchConversations(1);
    }
  }, [dateRange.from, dateRange.to]);
  
  useEffect(() => {
    localStorage.setItem('adminNotifications', notificationsEnabled);
  }, [notificationsEnabled]);
  
  const handleTabChange = (value) => {
    setActiveTab(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };
  
  const handleSearch = useMemo(() => debounce(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
    
    console.log("Buscando com termo:", searchTerm);
    fetchConversations(1);
  }, 500), []);
  
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      console.log("Atualizando conversas manualmente");
      await fetchConversations(pagination.current);
      toast.success('Conversas atualizadas com sucesso', { duration: 2000 });
    } catch (error) {
      console.error('Erro ao atualizar conversas:', error);
    }
  };
  
  const handleToggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast.success(!notificationsEnabled ? 'Notificações ativadas' : 'Notificações desativadas');
  };
  
  const handleSelectConversation = useCallback((conversationId) => {
    setSelectedConversationId(conversationId);
    
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        if (conv._id === conversationId || conv.id === conversationId) {
          return {
            ...conv,
            unreadCount: 0
          };
        }
        return conv;
      });
    });
    
    navigate(`/admin/conversations/${conversationId}`);
  }, [navigate]);
  
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handleShowTransferModal = useCallback(() => {
    if (!selectedConversationId || (empresasComSetores.length === 0 && sectors.length === 0)) {
      toast.error('Não há setores disponíveis para transferência');
      return;
    }
    
    setSelectedSector(null);
    setShowTransferModal(true);
  }, [selectedConversationId, empresasComSetores, sectors]);
  
  const handleShowFinishModal = useCallback(() => {
    if (!selectedConversationId) return;
    setShowFinishModal(true);
  }, [selectedConversationId]);
  
  const handleShowArchiveModal = useCallback(() => {
    if (!selectedConversationId) return;
    setShowArchiveModal(true);
  }, [selectedConversationId]);
  
  const handleConfirmTransfer = useCallback(async () => {
    if (!selectedConversationId || !selectedSector || isProcessing) return;
    
    setIsProcessing(true);
    setProcessingAction('transferir');
    
    try {
      const normalizedId = multiflowApi.getConversaId(selectedConversationId);
      const normalizedSectorId = multiflowApi.normalizeId(selectedSector, 'setor');
      
      const result = await performOperation(
        () => multiflowApi.transferirConversa(normalizedId, normalizedSectorId, null, '', true),
        'transferir conversa'
      );
      
      if (result.success) {
        toast.success('Conversa transferida com sucesso');
        setSelectedSector(null);
        setShowTransferModal(false);
        
        await fetchConversations(pagination.current);
      } else {
        toast.error('Erro ao transferir conversa. Verifique sua conexão e tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      toast.error('Erro ao transferir conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedConversationId, selectedSector, isProcessing, fetchConversations, pagination.current, performOperation]);
  
  const handleConfirmFinish = useCallback(async () => {
    if (!selectedConversationId || isProcessing) return;
    
    setIsProcessing(true);
    setProcessingAction('finalizar');
    
    try {
      const normalizedId = multiflowApi.getConversaId(selectedConversationId);
      
      const response = await performOperation(
        () => multiflowApi.finalizarConversa(normalizedId, null, true),
        'finalizar conversa'
      );
      
      if (response.success) {
        toast.success('Conversa finalizada com sucesso');
        setShowFinishModal(false);
        
        await fetchConversations(pagination.current);
      } else {
        toast.error('Erro ao finalizar conversa. Verifique sua conexão e tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      toast.error('Erro ao finalizar conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedConversationId, isProcessing, fetchConversations, pagination.current, performOperation]);
  
  const handleConfirmArchive = useCallback(async () => {
    if (!selectedConversationId || isProcessing) return;
    
    setIsProcessing(true);
    setProcessingAction('arquivar');
    
    try {
      const normalizedId = multiflowApi.getConversaId(selectedConversationId);
      
      const response = await performOperation(
        () => multiflowApi.arquivarConversa(normalizedId, null, true),
        'arquivar conversa'
      );
      
      if (response.success) {
        toast.success('Conversa arquivada com sucesso');
        setShowArchiveModal(false);
        
        await fetchConversations(pagination.current);
      } else {
        toast.error('Erro ao arquivar conversa. Verifique sua conexão e tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      toast.error('Erro ao arquivar conversa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedConversationId, isProcessing, fetchConversations, pagination.current, performOperation]);
  
  const toggleEmpresa = (empresaId) => {
    setExpandedEmpresas(prev => ({
      ...prev,
      [empresaId]: !prev[empresaId]
    }));
  };
  
  const getFilteredConversations = useMemo(() => {
    const allConversations = activeTab === 'completed' ? (completedConversations || []) : (conversations || []);
    
    return allConversations.filter(conv => {
      if (filters.sectorFilter !== 'all') {
        const setorNome = 
          (conv.setorId && typeof conv.setorId === 'object' && conv.setorId.nome) || 
          (conv.setorInfo && conv.setorInfo.nome);
        
        if (!setorNome || setorNome !== filters.sectorFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [activeTab, conversations, completedConversations, filters.sectorFilter]);
  
  const availableSectors = useMemo(() => {
    const sectorSet = new Set();
    sectorSet.add('all');
    
    const addSectorsFromConversations = (convList) => {
      if (convList && convList.length > 0) {
        convList.forEach(conv => {
          if (conv.setorId?.nome) {
            sectorSet.add(conv.setorId.nome);
          } else if (conv.setorInfo?.nome) {
            sectorSet.add(conv.setorInfo.nome);
          }
        });
      }
    };
    
    addSectorsFromConversations(conversations);
    addSectorsFromConversations(completedConversations);
    
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
  }, [conversations, completedConversations, sectors]);
  
  const renderConversationList = useCallback(() => {
    if (isLoading && !isRefreshing) {
      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center h-16 text-slate-400 text-sm py-8"
        >
          <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#10b981]" />
          <span>Carregando conversas...</span>
        </motion.div>
      );
    }
    
    if (error) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex flex-col items-center justify-center p-6"
        >
          <Alert variant="destructive" className="max-w-md bg-red-900/20 border-red-900/30">
            <AlertTitle>Erro ao carregar conversas</AlertTitle>
            <AlertDescription>
              {error}
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full bg-[#101820] text-white border-[#1f2937]/40"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      );
    }
    
    if (getFilteredConversations.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex flex-col items-center justify-center h-64 text-slate-400 text-sm py-8"
        >
          <div className="w-16 h-16 rounded-full bg-[#101820] flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-slate-400/70" />
          </div>
          <p>Nenhuma conversa {activeTab === 'completed' ? 'finalizada' : activeTab === 'waiting' ? 'aguardando' : 'em andamento'}.</p>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="mt-4 text-xs bg-[#101820] border-[#1f2937]/40 text-[#10b981] hover:bg-[#101820] hover:text-[#10b981] transition-all duration-300"
          >
            {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
            Atualizar conversas
          </Button>
        </motion.div>
      );
    }
    
    return (
      <div className="h-full">
        <VirtualizedConversationList
          conversations={getFilteredConversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>
    );
  }, [
    isLoading, 
    isRefreshing, 
    error,
    getFilteredConversations, 
    activeTab, 
    handleRefresh, 
    selectedConversationId, 
    handleSelectConversation
  ]);
  
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
  
  const transferModalContent = useMemo(() => {
    // Se temos empresas com setores agrupados, usar isso
    if (empresasComSetores.length > 0) {
      return (
        <RadioGroup value={selectedSector} onValueChange={setSelectedSector}>
          <div className="space-y-4 max-h-[400px] overflow-auto">
            {empresasComSetores.map(({ empresa, setores }) => {
              const empresaId = empresa._id || empresa.id || empresa.empresaId;
              const isExpanded = expandedEmpresas[empresaId] !== false;
              
              return (
                <div key={empresaId} className="border border-[#1f2937]/40 rounded-lg bg-[#101820]/50">
                  <button
                    type="button"
                    onClick={() => toggleEmpresa(empresaId)}
                    className="w-full flex items-center justify-between p-3 hover:bg-[#101820] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#10b981]" />
                      <span className="font-medium text-white">{empresa.nome}</span>
                      <Badge variant="outline" className="bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20 text-xs">
                        {setores.length} setor{setores.length > 1 ? 'es' : ''}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {setores.map(setor => {
                        const setorId = setor._id || setor.id || setor.setorId;
                        return (
                          <div key={setorId} className="flex items-start space-x-2 pl-6">
                            <RadioGroupItem 
                              value={setorId} 
                              id={`sector-${setorId}`}
                              className="mt-1 text-[#10b981] border-[#1f2937]/40"
                            />
                            <Label 
                              htmlFor={`sector-${setorId}`}
                              className="flex-1 cursor-pointer text-white hover:text-[#10b981] transition-colors"
                            >
                              <div className="font-medium">{setor.nome}</div>
                              {setor.responsavel && (
                                <div className="text-sm text-slate-400">
                                  Responsável: {setor.responsavel}
                                </div>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </RadioGroup>
      );
    }
    
    // Fallback para lista simples de setores
    return (
      <RadioGroup value={selectedSector} onValueChange={setSelectedSector}>
        <div className="space-y-3 max-h-[300px] overflow-auto">
          {sectors && sectors.map(sector => (
            <div key={sector._id || sector.id || sector.setorId} className="flex items-start space-x-2">
              <RadioGroupItem 
                value={sector._id || sector.id || sector.setorId} 
                id={`sector-${sector._id || sector.id || sector.setorId}`}
                className="mt-1 text-[#10b981] border-[#1f2937]/40"
              />
              <Label 
                htmlFor={`sector-${sector._id || sector.id || sector.setorId}`}
                className="flex-1 cursor-pointer text-white"
              >
                <div className="font-medium">{sector.nome}</div>
                {sector.responsavel && (
                  <div className="text-sm text-slate-400">
                    Responsável: {sector.responsavel}
                  </div>
                )}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    );
  }, [empresasComSetores, sectors, selectedSector, expandedEmpresas]);
  
  return (
    <div className="h-full w-full flex flex-col bg-[#070b11] relative">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[url('https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/grid-pattern-dark.svg')] bg-repeat"></div>
      </div>
      
      <div className="p-4 flex-1 h-full overflow-hidden relative z-10">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex flex-col bg-[#070b11] rounded-xl border border-[#1f2937]/40 overflow-hidden shadow-md"
        >
          <div className="p-4 bg-[#070b11] border-b border-[#1f2937]/40 flex justify-between items-center rounded-t-xl sticky top-0 z-30">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#10b981]" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#10b981] to-[#059669]">
                Central de Conversas {filters.arquivada && '(Arquivadas)'}
              </span>
              {unreadCounts.all > 0 && (
                <Badge className="bg-[#10b981] text-white text-xs ml-1 px-1.5">
                  {unreadCounts.all}
                </Badge>
              )}
            </h2>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleNotifications}
                className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-[#101820]"
                title={notificationsEnabled ? "Desativar notificações" : "Ativar notificações"}
              >
                {notificationsEnabled ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-[#101820]"
                title="Atualizar conversas"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              
              <div className="flex items-center gap-1 text-xs text-[#10b981]">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#10b981]' : 'bg-red-500'}`}></span>
                <span className="hidden sm:inline">{isConnected ? 'Conectado' : 'Desconectado'}</span>
              </div>
              
              <Badge variant="outline" className="bg-[#101820] border-[#1f2937]/40 text-xs font-medium text-[#10b981] px-2.5">
                {getFilteredConversations.length} conversas
              </Badge>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-[#1f2937]/40 bg-[#070b11] sticky top-[60px] z-20">
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleSearch();
                  }}
                  className="w-full pl-10 bg-[#101820] border-[#1f2937]/40 focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50 rounded-lg text-white placeholder:text-slate-400/70"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-full bg-[#101820] border border-[#1f2937]/40 text-slate-400 hover:text-white hover:bg-[#101820]"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-[#070b11] border border-[#1f2937]/40 p-4 shadow-lg">
                  <div className="space-y-4">
                    <h3 className="font-medium text-white">Filtrar Conversas</h3>
                    
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm text-slate-300 mb-1 block">Visualização</label>
                        <Select 
                          value={filters.arquivada.toString()} 
                          onValueChange={(value) => handleFilterChange('arquivada', value === 'true')}
                        >
                          <SelectTrigger className="bg-[#101820] border-[#1f2937]/40 text-white">
                            <SelectValue placeholder="Tipo de visualização" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                            <SelectItem value="false">Conversas Ativas</SelectItem>
                            <SelectItem value="true">Conversas Arquivadas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm text-slate-300 mb-1 block">Setor</label>
                        <Select
                          value={filters.sectorFilter}
                          onValueChange={(value) => handleFilterChange('sectorFilter', value)}
                        >
                          <SelectTrigger className="bg-[#101820] border-[#1f2937]/40 text-white">
                            <SelectValue placeholder="Selecione um setor" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                            {availableSectors.map(sector => (
                              <SelectItem key={sector.value} value={sector.value} className="hover:bg-[#1f2937]">
                                {sector.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm text-slate-300 mb-1 block">Período</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full justify-start text-left font-normal bg-[#101820] border-[#1f2937]/40"
                            >
                              {dateRange.from ? (
                                dateRange.to ? (
                                  <>
                                    {format(dateRange.from, 'dd/MM/yyyy')} -&nbsp;
                                    {format(dateRange.to, 'dd/MM/yyyy')}
                                  </>
                                ) : (
                                  format(dateRange.from, 'dd/MM/yyyy')
                                )
                              ) : (
                                "Selecione as datas"
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-[#101820] border-[#1f2937]/40" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              selected={dateRange}
                              onSelect={setDateRange}
                              className="bg-[#101820]"
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {(filters.sectorFilter !== 'all' || (dateRange.from && dateRange.to)) && (
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-sm text-slate-400">Filtros ativos</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFilters(prev => ({ ...prev, sectorFilter: 'all' }));
                              setDateRange({ from: undefined, to: undefined });
                              setPagination(prev => ({ ...prev, current: 1 }));
                              
                              console.log("Limpando filtros e recarregando");
                              fetchConversations(1);
                            }}
                            className="h-8 text-xs text-slate-300 hover:text-white hover:bg-[#1f2937]/40"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Limpar filtros
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {filters.sectorFilter !== 'all' && (
              <div className="flex items-center mt-2">
                <Badge className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                  Setor: {filters.sectorFilter}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 ml-2 text-slate-400 hover:text-white hover:bg-transparent"
                  onClick={() => handleFilterChange('sectorFilter', 'all')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <Tabs 
            defaultValue="all" 
            value={activeTab} 
            onValueChange={handleTabChange}
            className="w-full flex-1 flex flex-col"
          >
            <TabsList className="w-full grid grid-cols-4 bg-transparent border-b border-[#1f2937]/40 h-12 rounded-none p-0 sticky top-[124px] z-10">
              <TabWithUnreadCount value="all" label="Todas" count={unreadCounts.all} />
              <TabWithUnreadCount value="ongoing" label="Em Andamento" count={unreadCounts.ongoing} />
              <TabWithUnreadCount value="waiting" label="Aguardando" count={unreadCounts.awaiting} />
              <TabWithUnreadCount value="completed" label="Finalizadas" count={0} />
            </TabsList>

            <div className="flex-1 overflow-hidden bg-[#070b11]">
              <AnimatePresence mode="wait">
                {renderConversationList()}
              </AnimatePresence>
            </div>
          </Tabs>
        </motion.div>
      </div>
      
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transferir conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Selecione o setor para o qual deseja transferir esta conversa
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {transferModalContent}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowTransferModal(false)}
              className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmTransfer}
              disabled={!selectedSector || isProcessing}
              className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
            >
              {isProcessing && processingAction === 'transferir' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share className="h-4 w-4 mr-2" />
              )}
              {isProcessing && processingAction === 'transferir' ? 'Transferindo...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showFinishModal} onOpenChange={setShowFinishModal}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white">
          <DialogHeader>
            <DialogTitle>Finalizar conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja finalizar esta conversa?
              A conversa será movida para a lista de conversas concluídas.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowFinishModal(false)}
              className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmFinish}
              disabled={isProcessing}
              className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:opacity-90"
            >
              {isProcessing && processingAction === 'finalizar' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isProcessing && processingAction === 'finalizar' ? 'Finalizando...' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent className="bg-[#070b11] border-[#1f2937]/40 text-white">
          <DialogHeader>
            <DialogTitle>Arquivar conversa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja arquivar esta conversa?
              Conversas arquivadas não serão mais exibidas em nenhuma lista.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowArchiveModal(false)}
              className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmArchive}
              variant="destructive"
              disabled={isProcessing}
              className="hover:opacity-90"
            >
              {isProcessing && processingAction === 'arquivar' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              {isProcessing && processingAction === 'arquivar' ? 'Arquivando...' : 'Arquivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminConversationsView;