import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart2, Briefcase, Calendar, Download, RefreshCw, Search,
  Users, MessageSquare, Clock, CheckCircle, AlertTriangle, HelpCircle
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { multiflowApi } from '../../services/multiflowApi';
import { useAuthContext } from '../../hooks/useAuthContext';

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DateRangePicker from '../Admin/DateRangePicker';

// Constantes para status de conversas
const CONVERSATION_STATUS = {
  WAITING: 'aguardando',
  IN_PROGRESS: 'em_andamento',
  FINISHED: 'finalizada',
  ARCHIVED: 'arquivada'
};

// Cores para gráficos
const CHART_COLORS = {
  waiting: '#f97316',
  inProgress: '#0284c7',
  finished: '#10b981',
  archived: '#9333ea',
  gray: '#9ca3af'
};

const SetorDashboard = () => {
  const { userProfile } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activePeriod, setActivePeriod] = useState('30d');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('visao-geral');
  const [sector, setSector] = useState(null);
  const [sectorDashboard, setSectorDashboard] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [error, setError] = useState(null);
  
  // Data ranges
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const [dateRange, setDateRange] = useState({
    start: thirtyDaysAgo.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  });
  
  // Cores para o gráfico
  const COLORS = ['#10b981', '#0284c7', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4', '#84cc16'];
  
  // Função para obter o setor do usuário
  const loadUserSector = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Verificar se temos ID do setor no userProfile
      let sectorId = userProfile?.setor;
      
      // Se não tiver no perfil, buscar do localStorage como fallback
      if (!sectorId) {
        sectorId = localStorage.getItem('userSectorId');
      }
      
      if (!sectorId) {
        throw new Error('ID do setor não encontrado. Verifique se você está associado a um setor.');
      }
      
      // Normaliza o ID do setor (caso o multiflowApi tenha esta função)
      try {
        sectorId = multiflowApi.normalizeId(sectorId, 'setor');
      } catch (e) {
        // Caso a função não exista, apenas usa o ID como está
        console.warn('multiflowApi.normalizeId não disponível', e);
      }
      
      const userId = multiflowApi.getUserId();
      const response = await multiflowApi.getSetorById(sectorId, userId);
      
      if (response.success) {
        setSector(response.data);
      } else {
        throw new Error(response.error || 'Falha ao carregar informações do setor');
      }
    } catch (error) {
      console.error('Erro ao carregar setor do usuário:', error);
      setError('Falha ao carregar seu setor. Por favor, tente novamente mais tarde ou contate o suporte.');
    } finally {
      setIsLoading(false);
    }
  }, [userProfile]);
  
  // Função para carregar os dados do dashboard do setor
  const loadSectorDashboard = useCallback(async () => {
    if (!sector?._id) return;
    
    setIsRefreshing(true);
    
    try {
      const userId = multiflowApi.getUserId();
      
      // Adicionar parâmetros de data ao pedido
      const params = {
        dataInicio: dateRange.start,
        dataFim: dateRange.end
      };
      
      const response = await multiflowApi.getDashboardSetor(sector._id, userId, params);
      
      if (response.success) {
        setSectorDashboard(response.data);
      } else {
        console.warn('Falha ao carregar dashboard do setor:', response.error);
        // Não definir erro aqui para não bloquear toda a UI
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard do setor:', error);
      // Não definir erro aqui para não bloquear toda a UI
    } finally {
      setIsRefreshing(false);
    }
  }, [sector, dateRange]);
  
  // Função para carregar o histórico de conversas
  const loadConversationHistory = useCallback(async () => {
    if (!sector?._id) return;
    
    setIsRefreshing(true);
    
    try {
      const userId = multiflowApi.getUserId();
      
      // Buscar conversas para este setor
      const filters = {
        setorId: sector._id,
        dataInicio: dateRange.start,
        dataFim: dateRange.end,
        limit: 100
      };
      
      const response = await multiflowApi.getConversas(filters, userId);
      
      if (response.success) {
        setConversationHistory(response.data || []);
      } else {
        console.warn('Falha ao carregar histórico de conversas:', response.error);
        setConversationHistory([]);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de conversas:', error);
      setConversationHistory([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [sector, dateRange]);
  
  // Carregar o setor quando o componente montar
  useEffect(() => {
    loadUserSector();
  }, [loadUserSector]);
  
  // Carregar dados do dashboard e histórico quando o setor ou datas mudarem
  useEffect(() => {
    if (sector) {
      loadSectorDashboard();
      loadConversationHistory();
    }
  }, [sector, dateRange, loadSectorDashboard, loadConversationHistory]);
  
  // Gerar dados para gráfico de conversas por status
  const getConversationsByStatusData = useMemo(() => {
    if (!sectorDashboard || !sectorDashboard.conversas) return [];
    
    return [
      { name: 'Aguardando', value: sectorDashboard.conversas.aguardando || 0, color: CHART_COLORS.waiting },
      { name: 'Em Andamento', value: sectorDashboard.conversas.emAndamento || 0, color: CHART_COLORS.inProgress },
      { name: 'Finalizadas', value: sectorDashboard.conversas.finalizadas || 0, color: CHART_COLORS.finished }
    ].filter(item => item.value > 0); // Filtra para mostrar apenas status com valores
  }, [sectorDashboard]);
  
  // Gerar dados para gráfico de histórico de conversas
  const getConversationHistoryData = useMemo(() => {
    if (!conversationHistory || conversationHistory.length === 0) {
      return [];
    }
    
    // Gerar todas as datas no intervalo
    const dateMap = {};
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      dateMap[dateStr] = {
        date: dateStr,
        aguardando: 0,
        emAndamento: 0,
        finalizadas: 0,
        total: 0
      };
    }
    
    // Agrupar conversas por dia
    conversationHistory.forEach(conv => {
      let date;
      
      // Tentar usar a data de criação primeiro, depois atividade
      if (conv.created) {
        date = new Date(conv.created);
      } else if (conv.criadoEm) {
        date = new Date(conv.criadoEm);
      } else if (conv.ultimaAtividade) {
        date = new Date(conv.ultimaAtividade);
      } else {
        return; // Pular esta conversa se não tiver data
      }
      
      const dateStr = date.toISOString().split('T')[0];
      
      // Verificar se a data está no intervalo
      if (!dateMap[dateStr]) return;
      
      dateMap[dateStr].total++;
      
      switch (conv.status) {
        case CONVERSATION_STATUS.WAITING:
          dateMap[dateStr].aguardando++;
          break;
        case CONVERSATION_STATUS.IN_PROGRESS:
          dateMap[dateStr].emAndamento++;
          break;
        case CONVERSATION_STATUS.FINISHED:
          dateMap[dateStr].finalizadas++;
          break;
      }
    });
    
    // Converter para array e ordenar por data
    return Object.values(dateMap).sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
  }, [conversationHistory, dateRange]);
  
  // Lista das últimas conversas filtradas por termo de busca
  const latestConversations = useMemo(() => {
    if (!conversationHistory || conversationHistory.length === 0) return [];
    
    // Filtrar por termo de busca
    const filteredConversations = conversationHistory.filter(conv => 
      !searchTerm || 
      (conv.nomeCliente && conv.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (conv.telefoneCliente && conv.telefoneCliente.includes(searchTerm))
    );
    
    return [...filteredConversations]
      .sort((a, b) => {
        // Ordenar por última atividade, data de criação ou id como fallback
        const dateA = a.ultimaAtividade ? new Date(a.ultimaAtividade) : 
                     a.created ? new Date(a.created) : 
                     a.criadoEm ? new Date(a.criadoEm) : new Date(0);
        
        const dateB = b.ultimaAtividade ? new Date(b.ultimaAtividade) : 
                     b.created ? new Date(b.created) : 
                     b.criadoEm ? new Date(b.criadoEm) : new Date(0);
        
        return dateB - dateA;
      })
      .slice(0, 10); // Pegar apenas as 10 mais recentes
  }, [conversationHistory, searchTerm]);
  
  // Funções de formatação de data
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };
  
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // Função para mudar o período ativo
  const handlePeriodChange = (period) => {
    setActivePeriod(period);
    const end = new Date();
    let start = new Date();
    
    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '6m':
        start.setMonth(end.getMonth() - 6);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };
  
  // Função para atualizar os dados
  const refreshData = useCallback(() => {
    if (sector) {
      loadSectorDashboard();
      loadConversationHistory();
    }
  }, [sector, loadSectorDashboard, loadConversationHistory]);
  
  // Função para obter o badge de status
  const getStatusBadge = (status) => {
    switch (status) {
      case CONVERSATION_STATUS.WAITING:
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Aguardando</Badge>;
      case CONVERSATION_STATUS.IN_PROGRESS:
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Em Andamento</Badge>;
      case CONVERSATION_STATUS.FINISHED:
        return <Badge className="bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20">Finalizada</Badge>;
      case CONVERSATION_STATUS.ARCHIVED:
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Arquivada</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">Desconhecido</Badge>;
    }
  };

  // Tela de carregamento inicial
  if (isLoading && !sector) {
    return (
      <div className="flex justify-center items-center h-64 bg-[#070b11]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981] mb-4"></div>
          <p className="text-slate-400">Carregando dados do seu setor...</p>
        </div>
      </div>
    );
  }

  // Tela de erro
  if (error) {
    return (
      <div className="flex justify-center items-center h-64 bg-[#070b11]">
        <div className="flex flex-col items-center text-center">
          <div className="bg-red-500/10 p-3 rounded-full mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-white mb-2">Ocorreu um erro ao carregar os dados</p>
          <p className="text-slate-400 mb-4 max-w-md">{error}</p>
          <Button 
            onClick={loadUserSector}
            className="bg-[#10b981] hover:bg-[#0d9668] text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-6 bg-[#070b11]"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-[#10b981]" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#10b981] to-[#059669]">
              {sector?.nome || 'Dashboard do Setor'}
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {sector?.descricao || 'Análise de desempenho e conversas do setor'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <div className="flex items-center h-10 w-full sm:w-[140px] py-2 px-3 rounded-md bg-[#101820] border border-[#1f2937]/40 text-white">
              <span className="mr-2">{activePeriod === '7d' ? '7 dias' : 
                                     activePeriod === '30d' ? '30 dias' : 
                                     activePeriod === '90d' ? '90 dias' : 
                                     activePeriod === '6m' ? '6 meses' : 
                                     activePeriod === '1y' ? '1 ano' : '30 dias'}</span>
              <div className="ml-auto flex gap-1">
                <button 
                  className="text-xs px-1 py-0.5 rounded bg-[#0f1621] hover:bg-[#1f2937]"
                  onClick={() => handlePeriodChange('7d')}
                >
                  7d
                </button>
                <button 
                  className="text-xs px-1 py-0.5 rounded bg-[#0f1621] hover:bg-[#1f2937]"
                  onClick={() => handlePeriodChange('30d')}
                >
                  30d
                </button>
              </div>
            </div>
          </div>
          
          {/* DateRangePicker */}
          <div className="relative w-full sm:w-auto">
            <DateRangePicker 
              dateRange={dateRange}
              setDateRange={(newRange) => {
                setDateRange(newRange);
              }}
            />
          </div>
          
          <Button
            onClick={refreshData}
            variant="outline"
            size="icon"
            className="rounded-lg h-9 w-9 bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#0f1621] hover:text-white transition-colors"
            title="Atualizar dados"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-[#10b981]"></div>
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="rounded-lg h-9 w-9 bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#0f1621] hover:text-white transition-colors"
            title="Exportar dados"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue="visao-geral" 
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="bg-[#101820] border border-[#1f2937]/40 p-1 rounded-lg mb-6">
          <TabsTrigger 
            value="visao-geral" 
            className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981] rounded-md px-4 py-1.5"
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger 
            value="conversas" 
            className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981] rounded-md px-4 py-1.5"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Conversas
          </TabsTrigger>
          <TabsTrigger 
            value="historico" 
            className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981] rounded-md px-4 py-1.5"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="visao-geral" className="space-y-6">
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0f1621] rounded-xl p-4 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs">Total de Conversas</p>
                  <p className="text-white text-xl font-medium mt-1">
                    {sectorDashboard?.conversas?.total || 0}
                  </p>
                  {isRefreshing && (
                    <div className="mt-1 flex items-center">
                      <div className="h-2 w-2 mr-1 animate-pulse rounded-full bg-[#10b981]"></div>
                      <span className="text-xs text-slate-400">Atualizando...</span>
                    </div>
                  )}
                </div>
                <div className="p-2 rounded-lg bg-[#10b981]/10">
                  <MessageSquare className="h-5 w-5 text-[#10b981]" />
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0f1621] rounded-xl p-4 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs">Conversas Finalizadas</p>
                  <p className="text-white text-xl font-medium mt-1">
                    {sectorDashboard?.conversas?.finalizadas || 0}
                  </p>
                  {isRefreshing && (
                    <div className="mt-1 flex items-center">
                      <div className="h-2 w-2 mr-1 animate-pulse rounded-full bg-[#0284c7]"></div>
                      <span className="text-xs text-slate-400">Atualizando...</span>
                    </div>
                  )}
                </div>
                <div className="p-2 rounded-lg bg-[#0284c7]/10">
                  <CheckCircle className="h-5 w-5 text-[#0284c7]" />
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0f1621] rounded-xl p-4 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs">Conversas Pendentes</p>
                  <p className="text-white text-xl font-medium mt-1">
                    {(sectorDashboard?.conversas?.aguardando || 0) + (sectorDashboard?.conversas?.emAndamento || 0)}
                  </p>
                  {isRefreshing && (
                    <div className="mt-1 flex items-center">
                      <div className="h-2 w-2 mr-1 animate-pulse rounded-full bg-[#f97316]"></div>
                      <span className="text-xs text-slate-400">Atualizando...</span>
                    </div>
                  )}
                </div>
                <div className="p-2 rounded-lg bg-[#f97316]/10">
                  <Clock className="h-5 w-5 text-[#f97316]" />
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#0f1621] rounded-xl p-4 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs">Tempo Médio Atendimento</p>
                  <p className="text-white text-xl font-medium mt-1">
                    {sectorDashboard?.tempoMedioAtendimento
                      ? Number(sectorDashboard.tempoMedioAtendimento).toFixed(1)
                      : sectorDashboard?.tempMedioAtendimento
                        ? Number(sectorDashboard.tempMedioAtendimento).toFixed(1)
                        : 0} min
                  </p>
                  {isRefreshing && (
                    <div className="mt-1 flex items-center">
                      <div className="h-2 w-2 mr-1 animate-pulse rounded-full bg-[#8b5cf6]"></div>
                      <span className="text-xs text-slate-400">Atualizando...</span>
                    </div>
                  )}
                </div>
                <div className="p-2 rounded-lg bg-[#8b5cf6]/10">
                  <Users className="h-5 w-5 text-[#8b5cf6]" />
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Distribuição de conversas por status */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-medium flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2 text-[#10b981]" />
                  Distribuição de Conversas
                </h3>
              </div>
              
              <div className="h-64 relative">
                {isRefreshing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0f1621]/80 z-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#10b981]"></div>
                  </div>
                )}
                
                {getConversationsByStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getConversationsByStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {getConversationsByStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [value, 'Conversas']}
                        contentStyle={{ backgroundColor: 'rgba(15, 22, 33, 0.95)', borderColor: 'rgba(31, 41, 55, 0.4)' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <HelpCircle className="h-10 w-10 text-slate-500 mb-2" />
                    <p className="text-slate-400">Nenhuma conversa registrada no período</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center gap-4 mt-2 flex-wrap">
                {getConversationsByStatusData.map((item, index) => (
                  <div key={`legend-${index}`} className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-slate-400">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </motion.div>
            
            {/* Histórico de conversas */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="lg:col-span-2 bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-medium flex items-center">
                  <LineChart className="h-5 w-5 mr-2 text-[#10b981]" />
                  Histórico de Conversas
                </h3>
              </div>
              
              <div className="h-64 relative">
                {isRefreshing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0f1621]/80 z-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#10b981]"></div>
                  </div>
                )}
                
                {getConversationHistoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getConversationHistoryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF' }}
                        tickFormatter={formatDate}
                      />
                      <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                      <Tooltip
                        formatter={(value) => [value, 'Conversas']}
                        labelFormatter={formatDate}
                        contentStyle={{ backgroundColor: 'rgba(15, 22, 33, 0.95)', borderColor: 'rgba(31, 41, 55, 0.4)' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="finalizadas" 
                        name="Finalizadas" 
                        stroke="#10b981" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="emAndamento" 
                        name="Em Andamento" 
                        stroke="#0284c7" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="aguardando" 
                        name="Aguardando" 
                        stroke="#f97316" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <HelpCircle className="h-10 w-10 text-slate-500 mb-2" />
                    <p className="text-slate-400">Nenhum histórico de conversas disponível no período</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
          
          {/* Tabela de últimas conversas */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h3 className="text-white font-medium flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-[#10b981]" />
                Últimas Conversas
              </h3>
              
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar conversa..."
                  className="pl-9 bg-[#101820] border-[#1f2937]/40 text-white w-full sm:w-[240px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto relative">
              {isRefreshing && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0f1621]/80 z-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#10b981]"></div>
                </div>
              )}
              
              {latestConversations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#1f2937]/40">
                      <TableHead className="text-slate-300 font-medium">Cliente</TableHead>
                      <TableHead className="text-slate-300 font-medium">Última Atividade</TableHead>
                      <TableHead className="text-slate-300 font-medium">Status</TableHead>
                      <TableHead className="text-slate-300 font-medium">Atendente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestConversations.map((conversation, index) => (
                      <TableRow key={`conv-${index}-${conversation._id || conversation.id}`} className="border-b border-[#1f2937]/20 hover:bg-[#101820]/50">
                        <TableCell className="text-white">
                          {conversation.nomeCliente || conversation.telefoneCliente || 'Cliente não identificado'}
                        </TableCell>
                        <TableCell className="text-white">
                          {formatDateTime(conversation.ultimaAtividade || conversation.updatedAt)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(conversation.status)}
                        </TableCell>
                        <TableCell className="text-white">
                          {conversation.atendenteNome || conversation.atendente?.nome || 'Não atribuído'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">Nenhuma conversa encontrada para este setor no período selecionado</p>
                </div>
              )}
            </div>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="conversas" className="space-y-6">
          {/* Filtro de conversas */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome do cliente ou telefone..."
                className="pl-9 bg-[#101820] border-[#1f2937]/40 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Tabela de todas as conversas */}
          <div className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300">
            <div className="overflow-x-auto relative">
              {isRefreshing && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0f1621]/80 z-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#10b981]"></div>
                </div>
              )}
              
              {conversationHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#1f2937]/40">
                      <TableHead className="text-slate-300 font-medium">Cliente</TableHead>
                      <TableHead className="text-slate-300 font-medium">Telefone</TableHead>
                      <TableHead className="text-slate-300 font-medium">Criado Em</TableHead>
                      <TableHead className="text-slate-300 font-medium">Última Atividade</TableHead>
                      <TableHead className="text-slate-300 font-medium">Status</TableHead>
                      <TableHead className="text-slate-300 font-medium">Atendente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversationHistory
                      .filter(conv => 
                        !searchTerm || 
                        (conv.nomeCliente && conv.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (conv.telefoneCliente && conv.telefoneCliente.includes(searchTerm))
                      )
                      .map((conversation, index) => (
                        <TableRow key={`all-conv-${index}-${conversation._id || conversation.id}`} className="border-b border-[#1f2937]/20 hover:bg-[#101820]/50">
                          <TableCell className="text-white">
                            {conversation.nomeCliente || 'Cliente não identificado'}
                          </TableCell>
                          <TableCell className="text-white">
                            {conversation.telefoneCliente || '-'}
                          </TableCell>
                          <TableCell className="text-white">
                            {formatDateTime(conversation.created || conversation.criadoEm || conversation.createdAt)}
                          </TableCell>
                          <TableCell className="text-white">
                            {formatDateTime(conversation.ultimaAtividade || conversation.updatedAt)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(conversation.status)}
                          </TableCell>
                          <TableCell className="text-white">
                            {conversation.atendenteNome || conversation.atendente?.nome || 'Não atribuído'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">Nenhuma conversa encontrada para este setor no período selecionado</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="historico" className="space-y-6">
          {/* Estatísticas de desempenho histórico */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-medium flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2 text-[#10b981]" />
                  Volume de Conversas
                </h3>
              </div>
              
              <div className="h-80 relative">
                {isRefreshing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0f1621]/80 z-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#10b981]"></div>
                  </div>
                )}
                
                {getConversationHistoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getConversationHistoryData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF' }}
                        tickFormatter={formatDate}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                      <Tooltip
                        formatter={(value) => [value, 'Conversas']}
                        labelFormatter={formatDate}
                        contentStyle={{ backgroundColor: 'rgba(15, 22, 33, 0.95)', borderColor: 'rgba(31, 41, 55, 0.4)' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="finalizadas" name="Finalizadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="emAndamento" name="Em Andamento" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="aguardando" name="Aguardando" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <HelpCircle className="h-10 w-10 text-slate-500 mb-2" />
                    <p className="text-slate-400">Nenhum histórico de volume disponível no período selecionado</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-medium flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-[#10b981]" />
                  Informações do Setor
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-[#101820] p-4 rounded-lg border border-[#1f2937]/40">
                  <h4 className="text-white font-medium mb-2">Detalhes</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nome:</span>
                      <span className="text-white">{sector?.nome || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Responsável:</span>
                      <span className="text-white">{sector?.responsavel || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span>
                        {sector?.ativo !== false ? (
                          <Badge className="bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20">Ativo</Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Inativo</Badge>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Data de Criação:</span>
                      <span className="text-white">{sector?.created ? formatDate(sector.created) : '-'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#101820] p-4 rounded-lg border border-[#1f2937]/40">
                  <h4 className="text-white font-medium mb-2">Descrição</h4>
                  <p className="text-slate-300">
                    {sector?.descricao || 'Sem descrição disponível.'}
                  </p>
                </div>
                
                {sector?.contexto && (
                  <div className="bg-[#101820] p-4 rounded-lg border border-[#1f2937]/40">
                    <h4 className="text-white font-medium mb-2">Contexto de Atendimento</h4>
                    <p className="text-slate-300">{sector.contexto}</p>
                  </div>
                )}
                
                {sector?.palavrasChave && sector.palavrasChave.length > 0 && (
                  <div className="bg-[#101820] p-4 rounded-lg border border-[#1f2937]/40">
                    <h4 className="text-white font-medium mb-2">Palavras-chave</h4>
                    <div className="flex flex-wrap gap-2">
                      {sector.palavrasChave.map((palavra, index) => (
                        <Badge key={`tag-${index}`} variant="outline" className="bg-[#0f1621] border-[#1f2937]/40">
                          {palavra}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SetorDashboard;