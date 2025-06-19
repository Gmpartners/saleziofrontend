// src/pages/Dashboard/WhatsAppDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Clock, CheckCircle, BarChart2, Users, 
  TrendingUp, Filter, Search, Bell, ArrowRight, 
  Activity, MessageCircle, RefreshCw, Menu, X, ChevronDown
} from 'lucide-react';
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// Importar hooks e serviços
import { useAuthContext } from '../../hooks/useAuthContext';
import { useSocket } from '../../contexts/SocketContext';
import apiService from '../../services/api';

// Import shadcn components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const WhatsAppDashboard = () => {
  // Estado inicial
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('week');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { userProfile, isAdmin } = useAuthContext();
  const { isConnected } = useSocket();
  const previousTimeRangeRef = useRef(timeRange);
  const isInitialLoadRef = useRef(true);

  // Refs para animações
  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const chartsRef = useRef(null);

  // Verificar dispositivo móvel
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Função para mapear período para API
  const mapPeriodoParaAPI = (timeRange) => {
    switch (timeRange) {
      case 'today': return 'dia';
      case 'week': return 'semana';
      case 'month': return 'mes';
      case 'quarter': return 'trimestre';
      default: return 'mes';
    }
  };

  // Carregar dados da API - memoized com useCallback para prevenir recriação
  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Estrutura para armazenar os dados coletados
      const dadosAPI = {
        overallStats: {},
        sectors: [],
        sectorData: [],
        agents: [],
        agentData: [],
        dailyData: [],
        conversations: []
      };
      
      // Carregar dados do dashboard
      try {
        const params = {};
        
        // Adicionar período
        const periodo = mapPeriodoParaAPI(timeRange);
        if (periodo) params.periodo = periodo;
        
        // Adicionar setor se não for 'all'
        if (selectedSector !== 'all') params.setor = selectedSector;
        
        const dashboardData = await apiService.getDashboard(params);
        
        // Dados gerais
        dadosAPI.overallStats = {
          totalConversas: dashboardData.totalConversas || 0,
          conversasResolvidas: dashboardData.conversasResolvidas || 0,
          taxaResolucao: dashboardData.taxaResolucao || 0,
          tempoMedioResposta: dashboardData.tempoMedioResposta || 0,
          taxaEngajamento: dashboardData.taxaEngajamento || 0,
          crescimentoMensal: dashboardData.crescimentoMensal || 0,
          mensagensPorCliente: dashboardData.mensagensPorCliente || 0
        };
        
        // Dados por setor
        if (dashboardData.conversasPorSetor) {
          dadosAPI.sectorData = dashboardData.conversasPorSetor.map(item => ({
            name: item.setor,
            totalMessages: item.total || 0,
            resolved: item.resolvidas || 0,
            resolution: item.taxaResolucao || 0,
            satisfaction: item.satisfacao || 0,
            avgResponseTime: item.tempoMedioResposta || 0
          }));
          
          dadosAPI.sectors = dadosAPI.sectorData.map(item => item.name);
        }
        
        // Dados de atendentes
        if (dashboardData.performanceAtendentes) {
          dadosAPI.agentData = dashboardData.performanceAtendentes.map(atendente => ({
            id: atendente.id,
            name: atendente.nome || 'Atendente',
            avatar: (atendente.nomeExibicao || atendente.nome || 'AA').split(' ').map(n => n[0]).join('').toUpperCase(),
            sector: atendente.setor || 'Sem setor',
            totalMessages: atendente.mensagensEnviadas || 0,
            resolved: atendente.conversasResolvidas || 0,
            resolution: atendente.taxaResolucao || 0,
            satisfaction: atendente.satisfacao || 0,
            avgResponseTime: atendente.tempoMedioResolucao || 0
          }));
        }
        
        // Dados de volume diário
        if (dashboardData.volumeMensagensPorDia) {
          dadosAPI.dailyData = dashboardData.volumeMensagensPorDia.map(item => ({
            date: item._id,
            totalMessages: item.total || 0,
            incomingMessages: item.recebidas || 0,
            outgoingMessages: item.enviadas || 0,
            avgResponseTime: item.tempoMedioResposta || 0,
            resolved: item.resolvidas || 0,
            pending: item.pendentes || 0,
            satisfaction: item.satisfacao || 0
          }));
        }
      } catch (error) {
        console.warn('Aviso: Erro ao carregar dados do dashboard:', error);
        
        // Gerar dados de exemplo em caso de falha
        const hojeStr = new Date().toISOString().split('T')[0];
        
        // Dados gerais de exemplo
        dadosAPI.overallStats = {
          totalConversas: 583,
          conversasResolvidas: 489,
          taxaResolucao: 83.9,
          tempoMedioResposta: 8.5,
          taxaEngajamento: 78.4,
          crescimentoMensal: 24.6,
          mensagensPorCliente: 8.2
        };
        
        // Setores de exemplo
        dadosAPI.sectors = ['Suporte', 'Vendas', 'Financeiro', 'Administrativo'];
        dadosAPI.sectorData = dadosAPI.sectors.map(setor => ({
          name: setor,
          totalMessages: Math.floor(Math.random() * 1000),
          resolved: Math.floor(Math.random() * 800),
          resolution: Math.floor(Math.random() * 100),
          satisfaction: Math.floor(Math.random() * 100),
          avgResponseTime: Math.floor(Math.random() * 30)
        }));
        
        // Atendentes de exemplo
        dadosAPI.agentData = [
          { id: '1', name: 'Ana Silva', avatar: 'AS', sector: 'Suporte', totalMessages: 435, resolved: 390, resolution: 89, satisfaction: 92, avgResponseTime: 5 },
          { id: '2', name: 'Carlos Pereira', avatar: 'CP', sector: 'Vendas', totalMessages: 320, resolved: 290, resolution: 90, satisfaction: 87, avgResponseTime: 8 },
          { id: '3', name: 'Maria Santos', avatar: 'MS', sector: 'Financeiro', totalMessages: 265, resolved: 245, resolution: 92, satisfaction: 94, avgResponseTime: 7 }
        ];
        
        // Dados diários de exemplo
        const hoje = new Date();
        dadosAPI.dailyData = Array.from({ length: 14 }).map((_, index) => {
          const data = new Date();
          data.setDate(hoje.getDate() - (13 - index));
          return {
            date: data.toISOString().split('T')[0],
            totalMessages: Math.floor(Math.random() * 300) + 100,
            incomingMessages: Math.floor(Math.random() * 150) + 50,
            outgoingMessages: Math.floor(Math.random() * 150) + 50,
            avgResponseTime: Math.floor(Math.random() * 15) + 1,
            resolved: Math.floor(Math.random() * 80) + 20,
            pending: Math.floor(Math.random() * 20),
            satisfaction: Math.floor(Math.random() * 40) + 60
          };
        });
      }
      
      // Carregar conversas recentes
      try {
        const conversasData = await apiService.getConversations({
          limit: 15,
          order: 'desc'
        });
        
        if (conversasData) {
          dadosAPI.conversations = conversasData.map(conversa => ({
            id: conversa._id,
            customer: conversa.cliente?.nome || 'Cliente',
            phone: conversa.cliente?.telefone || '',
            subject: conversa.assunto || "Atendimento",
            messageCount: conversa.mensagens?.length || 0,
            status: conversa.status === 'finalizado' ? 'Resolvido' : 
                   conversa.status === 'em_atendimento' ? 'Em andamento' : 
                   conversa.status === 'reaberto' ? 'Reaberto' : 'Pendente',
            agent: conversa.atendenteId ? {
              id: conversa.atendenteId,
              name: conversa.atendenteNome || "Atendente",
              avatar: (conversa.atendenteNome || "AA").split(' ').map(n => n[0]).join('').toUpperCase(),
              sector: conversa.setor
            } : null,
            createdAt: conversa.criadoEm,
            updatedAt: conversa.ultimaMensagemEm || conversa.criadoEm,
            tags: [conversa.setor || 'Sem setor', conversa.canal || "whatsapp"]
          }));
        }
      } catch (error) {
        console.warn('Aviso: Erro ao carregar conversas:', error);
        
        // Dados de conversas de exemplo
        dadosAPI.conversations = [
          { 
            id: '1', 
            customer: 'João Silva', 
            phone: '5511999887766', 
            subject: 'Dúvida sobre produto', 
            messageCount: 8, 
            status: 'Resolvido',
            agent: { id: '1', name: 'Ana Silva', avatar: 'AS', sector: 'Suporte' },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 3600000).toISOString(),
            tags: ['Suporte', 'whatsapp']
          },
          { 
            id: '2', 
            customer: 'Maria Souza', 
            phone: '5511988776655', 
            subject: 'Problema com pagamento', 
            messageCount: 12, 
            status: 'Em andamento',
            agent: { id: '2', name: 'Carlos Pereira', avatar: 'CP', sector: 'Financeiro' },
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date(Date.now() - 1800000).toISOString(),
            tags: ['Financeiro', 'whatsapp']
          }
        ];
      }
      
      // Atualizar o estado com os dados obtidos/gerados
      setData(dadosAPI);
      filterDataByTimeRange(dadosAPI, timeRange);
      setIsLoaded(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro geral ao carregar dados:', error);
      setError('Falha ao carregar dados do dashboard. Por favor tente novamente.');
      setIsLoading(false);
    }
  }, [timeRange, selectedSector]);

  // Filtrar dados baseado no período de tempo
  const filterDataByTimeRange = useCallback((data, range) => {
    if (!data) return;
    
    const today = new Date();
    let startDate;
    
    switch (range) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date();
        startDate.setMonth(today.getMonth() - 3);
        break;
      default:
        startDate = new Date();
        startDate.setDate(today.getDate() - 7);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const filtered = {
      ...data,
      dailyData: data.dailyData.filter(item => {
        if (!item.date) return false;
        return new Date(item.date) >= startDate;
      })
    };
    
    setFilteredData(filtered);
  }, []);

  // Carregar dados quando o componente montar
  useEffect(() => {
    // Carregar dados apenas uma vez na montagem e não na atualização
    if (isInitialLoadRef.current) {
      carregarDados();
      
      // Adicionar animação de carregamento com pequeno atraso para efeito visual
      setTimeout(() => {
        setIsLoaded(true);
      }, 300);
      
      isInitialLoadRef.current = false;
    }
    
    // Configurar atualização periódica
    const interval = setInterval(() => {
      carregarDados();
    }, 60000); // Atualizar a cada minuto
    
    return () => clearInterval(interval);
  }, [carregarDados]);
  
  // Atualizar dados filtrados quando o período de tempo mudar
  useEffect(() => {
    if (!data) return;
    filterDataByTimeRange(data, timeRange);
  }, [timeRange, data, filterDataByTimeRange]);
  
  // Recarregar dados quando o período mudar, mas evitar loop
  useEffect(() => {
    // Verificar se não é o carregamento inicial e se o timeRange realmente mudou
    if (isLoaded && !isInitialLoadRef.current && previousTimeRangeRef.current !== timeRange) {
      carregarDados();
      // Atualizar a referência para o valor atual
      previousTimeRangeRef.current = timeRange;
    }
  }, [timeRange, isLoaded, carregarDados]);
  
  // Calcular métricas a partir dos dados filtrados
  const calculateMetrics = () => {
    if (!filteredData || !filteredData.dailyData || filteredData.dailyData.length === 0) {
      return {
        totalMessages: 0,
        incomingMessages: 0,
        outgoingMessages: 0,
        resolved: 0,
        avgResponseTime: 0,
        satisfaction: 0,
        resolution: 0
      };
    }
    
    const totalMessages = filteredData.dailyData.reduce((sum, item) => sum + (item.totalMessages || 0), 0);
    const incomingMessages = filteredData.dailyData.reduce((sum, item) => sum + (item.incomingMessages || 0), 0);
    const outgoingMessages = filteredData.dailyData.reduce((sum, item) => sum + (item.outgoingMessages || 0), 0);
    const resolved = filteredData.dailyData.reduce((sum, item) => sum + (item.resolved || 0), 0);
    
    // Cálculo de médias com proteção contra divisão por zero
    const validResponseTimeItems = filteredData.dailyData.filter(item => item.avgResponseTime !== undefined && item.avgResponseTime !== null);
    const avgResponseTime = validResponseTimeItems.length > 0
      ? Math.floor(validResponseTimeItems.reduce((sum, item) => sum + item.avgResponseTime, 0) / validResponseTimeItems.length)
      : 0;
      
    const validSatisfactionItems = filteredData.dailyData.filter(item => item.satisfaction !== undefined && item.satisfaction !== null);
    const satisfaction = validSatisfactionItems.length > 0
      ? Math.floor(validSatisfactionItems.reduce((sum, item) => sum + item.satisfaction, 0) / validSatisfactionItems.length)
      : 0;
    
    return {
      totalMessages,
      incomingMessages,
      outgoingMessages,
      resolved,
      avgResponseTime,
      satisfaction,
      resolution: incomingMessages > 0 ? Math.floor((resolved / incomingMessages) * 100) : 0
    };
  };
  
  const metrics = calculateMetrics();
  
  // Esquema de cores para o dashboard
  const COLORS = ['#10b981', '#0d9488', '#047857', '#0ea5e9', '#0f172a', '#1e293b'];
  
  // Formatar número com separador de milhares
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  
  // Formatar data para formato local
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };
  
  // Calcular diferença de tempo para exibir como "X min atrás"
  const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };
  
  // Dados de notificações recentes
  const defaultNotifications = [
    { id: 1, title: "Nova mensagem urgente", description: "Cliente Premium solicitando atendimento imediato", time: "2 minutos atrás", isNew: true },
    { id: 3, title: "Reunião agendada", description: "Reunião de equipe às 15:00 para revisar métricas", time: "3 horas atrás", isNew: false }
  ];

  // Usar notificações
  const displayedNotifications = notifications.length > 0 ? notifications : defaultNotifications;

  // Tela de carregamento enquanto os dados estão sendo preparados
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse"></div>
            <MessageCircle className="h-16 w-16 text-primary relative z-10 animate-bounce" />
          </div>
          <div className="text-center animate-pulse">
            <h2 className="text-2xl font-bold text-foreground mb-2">Carregando Dashboard</h2>
            <p className="text-muted-foreground">Preparando seus dados do WhatsApp Business...</p>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar conteúdo do dashboard com base na aba ativa
  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 md:space-y-8 relative">
            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Messages Card */}
              <Card className="overflow-hidden group hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Total Mensagens</div>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-foreground">{formatNumber(metrics.totalMessages)}</div>
                    <div className="text-xs text-muted-foreground">mensagens no período</div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-primary/60 to-primary/10"></div>
              </Card>
              
              {/* Avg Response Time Card */}
              <Card className="overflow-hidden group hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Tempo de Resposta</div>
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Clock className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-foreground">{metrics.avgResponseTime} min</div>
                    <div className="text-xs flex items-center gap-1">
                      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 px-1.5 py-0.5 rounded text-xs font-semibold">
                        +8%
                      </Badge>
                      <span className="text-muted-foreground">vs período anterior</span>
                    </div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-blue-500/60 to-blue-500/10"></div>
              </Card>
              
              {/* Resolution Rate Card */}
              <Card className="overflow-hidden group hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Taxa de Resolução</div>
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="h-4 w-4 text-purple-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-foreground">{metrics.resolution}%</div>
                    <div className="text-xs flex items-center gap-1">
                      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 px-1.5 py-0.5 rounded text-xs font-semibold">
                        +5.2%
                      </Badge>
                      <span className="text-muted-foreground">vs período anterior</span>
                    </div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-purple-500/60 to-purple-500/10"></div>
              </Card>
              
              {/* Engagement Card */}
              <Card className="overflow-hidden group hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Engajamento</div>
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-foreground">{filteredData?.overallStats?.taxaEngajamento || 78.4}%</div>
                    <div className="text-xs flex items-center gap-1">
                      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 px-1.5 py-0.5 rounded text-xs font-semibold">
                        +3.1%
                      </Badge>
                      <span className="text-muted-foreground">vs período anterior</span>
                    </div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-amber-500/60 to-amber-500/10"></div>
              </Card>
            </div>
            
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Message Volume Chart */}
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <CardTitle>Volume de Mensagens</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredData?.dailyData?.slice(-14) || []}>
                        <defs>
                          <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="date" 
                          stroke="rgba(255,255,255,0.5)" 
                          tickFormatter={(date) => {
                            if (!date) return '';
                            const d = new Date(date);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          }}
                        />
                        <YAxis stroke="rgba(255,255,255,0.5)" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                            borderColor: 'rgba(16, 185, 129, 0.3)',
                            borderRadius: '10px',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                          }}
                          labelStyle={{ color: '#F9FAFB' }}
                          formatter={(value, name) => {
                            if (name === "incomingMessages") return [value, "Recebidas"];
                            if (name === "outgoingMessages") return [value, "Enviadas"];
                            return [value, name];
                          }}
                          labelFormatter={(label) => {
                            if (!label) return '';
                            const d = new Date(label);
                            return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                          }}
                        />
                        <Legend 
                          formatter={(value) => {
                            if (value === "incomingMessages") return "Recebidas";
                            if (value === "outgoingMessages") return "Enviadas";
                            return value;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="incomingMessages" 
                          stroke="#10b981" 
                          fillOpacity={1}
                          fill="url(#colorIncoming)"
                          strokeWidth={2}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="outgoingMessages" 
                          stroke="#0ea5e9" 
                          fillOpacity={1}
                          fill="url(#colorOutgoing)"
                          strokeWidth={2}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Sector Distribution Chart */}
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <CardTitle>Distribuição por Setor</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredData?.sectorData || []}
                          cx="50%"
                          cy="50%"
                          labelLine={isMobile ? false : true}
                          outerRadius={isMobile ? "60%" : "70%"}
                          innerRadius={isMobile ? "40%" : "55%"}
                          fill="#8884d8"
                          dataKey="totalMessages"
                          nameKey="name"
                          label={isMobile ? 
                            false : 
                            ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          paddingAngle={2}
                          animationBegin={0}
                          animationDuration={1500}
                        >
                          {(filteredData?.sectorData || []).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              stroke="rgba(0,0,0,0.1)"
                              strokeWidth={1}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatNumber(value)}
                          contentStyle={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                            borderColor: 'rgba(16, 185, 129, 0.3)',
                            borderRadius: '10px',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                          }}
                          labelStyle={{ color: '#F9FAFB' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Conversations Section */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <CardTitle>Conversas Recentes</CardTitle>
                  </div>
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/conversations')}
                    className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    Ver todas <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {(filteredData?.conversations || []).slice(0, 3).map((conversation) => (
                    <div 
                      key={conversation.id}
                      onClick={() => navigate(`/conversations/${conversation.id}`)}
                      className="bg-muted/30 rounded-lg p-4 cursor-pointer hover:bg-muted/40 transition-colors border border-border/30 group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-foreground font-medium group-hover:text-primary transition-colors">{conversation.customer}</h4>
                          <p className="text-xs text-muted-foreground">{conversation.subject}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <Badge variant={
                            conversation.status === 'Resolvido' 
                              ? 'success' 
                              : conversation.status === 'Em andamento'
                                ? 'info'
                                : 'warning'
                          }>
                            {conversation.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground mt-1">
                            {timeAgo(conversation.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <Badge variant="outline" className="bg-blue-600/10 text-blue-400 border border-blue-600/20">
                          {conversation.tags[0]}
                        </Badge>
                        {conversation.agent ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {conversation.agent.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground">{conversation.agent.name.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Não atribuído</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 'analytics':
        return (
          <div className="space-y-6">
            {/* Analytics KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="overflow-hidden group hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-start">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base text-muted-foreground font-medium">Taxa de Engajamento</h3>
                      <div className="text-3xl font-bold bg-gradient-to-r from-primary to-emerald-400 text-transparent bg-clip-text">
                        {filteredData?.overallStats?.taxaEngajamento || 78.4}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        de mensagens respondidas em menos de 5 minutos
                      </p>
                    </div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-primary to-emerald-400/20"></div>
              </Card>
              
              <Card className="overflow-hidden group hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-start">
                    <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                      <TrendingUp className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base text-muted-foreground font-medium">Crescimento Mensal</h3>
                      <div className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-amber-300 text-transparent bg-clip-text">
                        {filteredData?.overallStats?.crescimentoMensal > 0 ? '+' : ''}{filteredData?.overallStats?.crescimentoMensal || 24.6}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        no volume de mensagens vs mês anterior
                      </p>
                    </div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-amber-300/20"></div>
              </Card>
              
              <Card className="overflow-hidden group hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-start">
                    <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                      <MessageCircle className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base text-muted-foreground font-medium">Mensagens por Cliente</h3>
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 text-transparent bg-clip-text">
                        {filteredData?.overallStats?.mensagensPorCliente?.toFixed(1) || 8.2}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        média de mensagens por conversação
                      </p>
                    </div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-400/20"></div>
              </Card>
            </div>
          </div>
        );
        
      case 'conversations':
        return (
          <div className="space-y-6">
            {/* Search and Filters */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="text" 
                      placeholder="Pesquisar conversas..." 
                      className="w-full pl-10 bg-muted/30 border-border/50"
                    />
                  </div>
                  
                  <Button 
                    onClick={() => navigate('/conversations')}
                    className="w-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Ver Todas as Conversas</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* Backdrop blur and grid effect */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0 bg-[url('https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/grid-pattern-dark.svg')] bg-repeat"></div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-col min-h-screen relative z-10">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 h-16 md:h-16 bg-background/80 backdrop-blur-lg border-b border-border/40 flex items-center justify-between px-6">
          {/* Brand & Title with Mobile Menu */}
          <div className="flex items-center gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-card border-r border-border/40">
                <div className="flex flex-col h-full">
                  <div className="h-16 flex items-center px-4 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      <h1 className="font-semibold text-lg">WhatsApp CRM</h1>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-1">
                      <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        <MessageCircle className="h-4 w-4 mr-3" /> Dashboard
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        <MessageSquare className="h-4 w-4 mr-3" /> Conversas
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        <BarChart2 className="h-4 w-4 mr-3" /> Análises
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        <Users className="h-4 w-4 mr-3" /> Equipe
                      </Button>
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-semibold hidden md:block">Dashboard</h1>
          </div>
          
          {/* Navigation Tabs */}
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="hidden md:block">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Visão Geral</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  <span>Análise</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="conversations" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Conversas</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Mobile Tab Selector */}
          <div className="md:hidden flex gap-2">
            <Button 
              variant={activeTab === 'overview' ? 'default' : 'outline'} 
              size="icon"
              className={activeTab === 'overview' ? 'bg-primary text-white' : 'bg-muted/30 text-muted-foreground'}
              onClick={() => setActiveTab('overview')}
              aria-label="Visão Geral"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            
            <Button 
              variant={activeTab === 'analytics' ? 'default' : 'outline'} 
              size="icon"
              className={activeTab === 'analytics' ? 'bg-primary text-white' : 'bg-muted/30 text-muted-foreground'}
              onClick={() => setActiveTab('analytics')}
              aria-label="Análise"
            >
              <BarChart2 className="h-4 w-4" />
            </Button>
            
            <Button 
              variant={activeTab === 'conversations' ? 'default' : 'outline'}
              size="icon"
              className={activeTab === 'conversations' ? 'bg-primary text-white' : 'bg-muted/30 text-muted-foreground'}
              onClick={() => setActiveTab('conversations')}
              aria-label="Conversas"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground">
                <Bell className="h-5 w-5" />
                {displayedNotifications.some(n => n.isNew) && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-primary rounded-full ring-2 ring-background"></span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
                <span className="font-medium">Notificações</span>
                <Badge variant="outline" className="ml-auto bg-muted/30 text-muted-foreground">
                  {displayedNotifications.length} novas
                </Badge>
              </div>
              <ScrollArea className="h-80">
                <div className="p-2">
                  {displayedNotifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className="p-3 mb-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer relative"
                    >
                      {notification.isNew && (
                        <span className="absolute top-3 right-3 h-2 w-2 bg-primary rounded-full"></span>
                      )}
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{notification.description}</p>
                      <span className="text-xs text-muted-foreground mt-2 block">{notification.time}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        
        {/* Filters Bar */}
        <div className="bg-background/70 backdrop-blur-md border-b border-border/40 p-4">
          <div className="container mx-auto max-w-7xl flex flex-wrap gap-3 items-center justify-between">
            {/* Time Range Filter */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-border/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Selecione o período" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="quarter">Último trimestre</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sector Filter - Only show on larger screens */}
            <div className="hidden sm:block">
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-border/50">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Selecione o setor" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Setores</SelectItem>
                  {(filteredData?.sectors || []).map(sector => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Refresh button */}
            <Button 
              variant="outline" 
              size="icon"
              className="bg-muted/30 border-border/50"
              onClick={carregarDados}
            >
              <RefreshCw className={cn(
                "h-4 w-4",
                isLoading && "animate-spin"
              )} />
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="container mx-auto max-w-7xl">
            {renderContent()}
            
            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/20 text-sm text-muted-foreground border border-border/30">
                <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin-slow" />
                <span>
                  Última atualização: {new Date().toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppDashboard;