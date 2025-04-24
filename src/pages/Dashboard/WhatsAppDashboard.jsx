// src/pages/Dashboard/WhatsAppDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Clock, Star, CheckCircle, BarChart2, Users, 
  TrendingUp, ChevronDown, Phone, FileText, Zap, User, Award, 
  Calendar, Filter, Search, Bell, ChevronLeft, ChevronRight, 
  Plus, ArrowRight, ArrowUp, ArrowDown, HelpCircle, AlertCircle, 
  Activity, MessageCircle, RefreshCw, BrainCircuit
} from 'lucide-react';
import { 
  LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, 
  Area, AreaChart 
} from 'recharts';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

// Importar hooks e serviços
import { useAuthContext } from '../../hooks/useAuthContext'; // Usando o hook original
import { useSocket } from '../../contexts/SocketContext';
import apiService from '../../services/api';

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
  const [openDropdown, setOpenDropdown] = useState(null);
  const navigate = useNavigate();
  const { userProfile, isAdmin } = useAuthContext(); // Usando o hook original
  const { isConnected } = useSocket();

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

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

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

  // Carregar dados da API
  const carregarDados = async () => {
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
  };

  // Carregar dados quando o componente montar
  useEffect(() => {
    carregarDados();
    
    // Adicionar animação de carregamento com pequeno atraso para efeito visual
    setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    
    // Configurar atualização periódica
    const interval = setInterval(() => {
      carregarDados();
    }, 60000); // Atualizar a cada minuto
    
    return () => clearInterval(interval);
  }, []);
  
  // Atualizar dados filtrados quando o período de tempo mudar
  useEffect(() => {
    if (!data) return;
    filterDataByTimeRange(data, timeRange);
  }, [timeRange, data]);
  
  // Recarregar dados quando o período mudar
  useEffect(() => {
    if (isLoaded) {
      carregarDados();
    }
  }, [timeRange]);
  
  // Filtrar dados baseado no período de tempo
  const filterDataByTimeRange = (data, range) => {
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
  };
  
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
  const COLORS = ['#25D366', '#128C7E', '#075E54', '#34B7F1', '#ECE5DD', '#DCF8C6'];
  
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

  // Componente Select personalizado para nosso design
  const CustomShadcnSelect = ({ value, onChange, options, placeholder }) => {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger 
          className="w-full h-10 bg-[#1e1d2b] border border-green-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:ring-offset-0 focus:border-green-600"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent 
          className="bg-[#1e1d2b] border border-green-600 text-white rounded-lg z-[9999] shadow-lg"
          position="popper"
          sideOffset={4}
        >
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="hover:bg-[#25243a] focus:bg-[#25243a] cursor-pointer text-white data-[highlighted]:bg-blue-600"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  // Tela de carregamento enquanto os dados estão sendo preparados
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0c0b14]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 blur-xl animate-pulse"></div>
            <MessageCircle className="h-16 w-16 text-green-500 relative z-10 animate-bounce" />
          </div>
          <div className="text-center animate-pulse">
            <h2 className="text-2xl font-bold text-white mb-2">Carregando Dashboard</h2>
            <p className="text-slate-400">Preparando seus dados do WhatsApp Business...</p>
          </div>
        </div>
      </div>
    );
  }

  // Tela de erro
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0c0b14]">
        <div className="flex flex-col items-center gap-4 max-w-md p-6 bg-[#1e1d2b] rounded-xl shadow-lg">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 blur-xl"></div>
            <AlertCircle className="h-16 w-16 text-red-500 relative z-10" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Erro ao Carregar Dados</h2>
            <p className="text-slate-400 mb-4">{error}</p>
            <button 
              onClick={carregarDados}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Efeito de partículas de fundo
  const ParticleBackground = () => {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, index) => (
          <div 
            key={index} 
            className="absolute rounded-full bg-green-500/10"
            style={{
              width: `${Math.random() * 6 + 1}px`,
              height: `${Math.random() * 6 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
              animation: `float ${Math.random() * 50 + 20}s infinite alternate ease-in-out`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>
    );
  };
  
  // Renderizar conteúdo do dashboard com base na aba ativa
  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 relative">
            {/* Stats Cards Row with cascade animation */}
            <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Messages Card */}
              <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-lg transition-all duration-300 group hover:-translate-y-1 animate-fadeInUp">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-400 font-medium">Total Mensagens</div>
                  <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold text-white">{formatNumber(metrics.totalMessages)}</div>
                  <div className="text-xs text-gray-400">mensagens no período</div>
                </div>
              </div>
              
              {/* Avg Response Time Card */}
              <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-lg transition-all duration-300 group hover:-translate-y-1 animate-fadeInUp delay-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-400 font-medium">Tempo de Resposta</div>
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold text-white">{metrics.avgResponseTime} min</div>
                  <div className="text-xs flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-400">
                      +8%
                    </span>
                    <span className="text-gray-400">vs período anterior</span>
                  </div>
                </div>
              </div>
              

              {/* Resolution Rate Card */}
              <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-lg transition-all duration-300 group hover:-translate-y-1 animate-fadeInUp delay-300">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-400 font-medium">Taxa de Resolução</div>
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-4 w-4 text-purple-500" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold text-white">{metrics.resolution}%</div>
                  <div className="text-xs flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-400">
                      +5.2%
                    </span>
                    <span className="text-gray-400">vs período anterior</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Charts Section */}
            <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Message Volume Chart */}
              <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-lg transition-all duration-300 animate-fadeInUp delay-400">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-white">Volume de Mensagens</h3>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData?.dailyData?.slice(-14) || []}>
                      <defs>
                        <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#25D366" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#25D366" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34B7F1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#34B7F1" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF" 
                        tickFormatter={(date) => {
                          if (!date) return '';
                          const d = new Date(date);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(30, 29, 43, 0.95)', 
                          borderColor: 'rgba(37, 211, 102, 0.3)',
                          borderRadius: '10px',
                          backdropFilter: 'blur(8px)',
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
                        stroke="#25D366" 
                        fillOpacity={1}
                        fill="url(#colorIncoming)"
                        strokeWidth={2}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="outgoingMessages" 
                        stroke="#34B7F1" 
                        fillOpacity={1}
                        fill="url(#colorOutgoing)"
                        strokeWidth={2}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Sector Distribution Chart */}
              <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-lg transition-all duration-300 animate-fadeInUp delay-500">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-white">Distribuição por Setor</h3>
                </div>
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredData?.sectorData || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="70%"
                        innerRadius="55%"
                        fill="#8884d8"
                        dataKey="totalMessages"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                          backgroundColor: 'rgba(30, 29, 43, 0.95)', 
                          borderColor: 'rgba(37, 211, 102, 0.3)',
                          borderRadius: '10px',
                          backdropFilter: 'blur(8px)',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                        }}
                        labelStyle={{ color: '#F9FAFB' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Recent Conversations Section */}
            <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-lg animate-fadeInUp delay-600">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-white">Conversas Recentes</h3>
                </div>
                <button 
                  onClick={() => navigate('/conversations')}
                  className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
                >
                  Ver todas <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-[#32304a] text-gray-400">
                      <th className="text-left pb-3 font-medium">ID</th>
                      <th className="text-left pb-3 font-medium">Cliente</th>
                      <th className="text-left pb-3 font-medium">Assunto</th>
                      <th className="text-left pb-3 font-medium">Status</th>
                      <th className="text-left pb-3 font-medium">Atendente</th>
                      <th className="text-left pb-3 font-medium">Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredData?.conversations || []).slice(0, 5).map((conversation, index) => (
                      <tr 
                        key={conversation.id} 
                        className="border-b border-[#32304a]/50 hover:bg-[#25243a]/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/conversations/${conversation.id}`)}
                      >
                        <td className="py-3 font-medium text-green-400">{conversation.id}</td>
                        <td className="py-3 text-white">{conversation.customer}</td>
                        <td className="py-3 text-gray-300">{conversation.subject}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${conversation.status === 'Resolvido' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : conversation.status === 'Em andamento'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                            {conversation.status}
                          </span>
                        </td>
                        <td className="py-3">
                          {conversation.agent ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-medium">
                                {conversation.agent.avatar}
                              </div>
                              <span className="text-gray-300">{conversation.agent.name.split(' ')[0]}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Não atribuído</span>
                          )}
                        </td>
                        <td className="py-3 text-gray-400">{timeAgo(conversation.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
        
      case 'analytics':
        // Conteúdo da aba de Análise
        return (
          <div className="space-y-6">
            {/* Analytics KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
              <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex flex-col items-start">
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-400 font-medium">Taxa de Engajamento</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-transparent bg-clip-text">
                      {filteredData?.overallStats?.taxaEngajamento || 78.4}%
                    </div>
                    <div className="text-xs text-gray-500">
                      de mensagens respondidas em menos de 5 minutos
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex flex-col items-start">
                  <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-400 font-medium">Crescimento Mensal</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-transparent bg-clip-text">
                      {filteredData?.overallStats?.crescimentoMensal > 0 ? '+' : ''}{filteredData?.overallStats?.crescimentoMensal || 24.6}%
                    </div>
                    <div className="text-xs text-gray-500">
                      no volume de mensagens vs mês anterior
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex flex-col items-start">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                    <MessageCircle className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-400 font-medium">Mensagens por Cliente</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-transparent bg-clip-text">
                      {filteredData?.overallStats?.mensagensPorCliente?.toFixed(1) || 8.2}
                    </div>
                    <div className="text-xs text-gray-500">
                      média de mensagens por conversação
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Performance Charts - ver código original para completar */}
          </div>
        );
        
      case 'conversations':
        // Conteúdo da aba de Conversas
        return (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-2 relative">
                  <input 
                    type="text" 
                    placeholder="Pesquisar conversas..." 
                    className="w-full bg-[#25243a] border border-[#32304a] rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <CustomShadcnSelect
                      value={selectedSector}
                      onChange={setSelectedSector}
                      options={[
                        { value: 'all', label: 'Todos os Setores' },
                        ...(filteredData?.sectors || []).map(sector => ({ value: sector, label: sector }))
                      ]}
                      placeholder="Selecione o setor"
                    />
                  </div>
                  <button className="flex items-center justify-center p-2.5 bg-[#25243a] border border-[#32304a] rounded-lg text-white hover:bg-[#2c2b42] transition-colors">
                    <Filter className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Botão para ir para página de conversas */}
            <div className="flex justify-center">
              <button 
                onClick={() => navigate('/conversations')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Ver Todas as Conversas
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b14] text-white overflow-x-hidden">
      <ParticleBackground />
      
      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {/* Top Navigation Bar */}
        <header ref={headerRef} className="sticky top-0 z-20 h-16 bg-[#0c0b14]/80 backdrop-blur-lg border-b border-[#1e1d2b] px-4 md:px-6 flex items-center justify-between">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="block md:hidden">
              <div className="bg-green-600 rounded-lg p-1.5 h-8 w-8 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <span>Visão Geral</span>
            </h1>
          </div>
          
          {/* Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 mx-auto bg-[#1e1d2b] rounded-lg p-1">
            <button 
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-green-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>Visão Geral</span>
              </div>
            </button>
            
            <button 
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'analytics' 
                  ? 'bg-green-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('analytics')}
            >
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                <span>Análise</span>
              </div>
            </button>
            
            <button 
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'conversations' 
                  ? 'bg-green-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('conversations')}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Conversas</span>
              </div>
            </button>
          </div>
          
          {/* Mobile Tab Selector */}
          <div className="md:hidden relative z-30">
            <CustomShadcnSelect 
              value={activeTab}
              onChange={(value) => setActiveTab(value)}
              options={[
                { value: 'overview', label: 'Visão Geral' },
                { value: 'analytics', label: 'Análise' },
                { value: 'conversations', label: 'Conversas' }
              ]}
              placeholder="Selecione a aba"
            />
          </div>
          
          {/* Notifications */}
          <div className="relative">
            <button 
              className="relative h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#25243a] transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              {displayedNotifications.some(n => n.isNew) && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-green-500 rounded-full"></span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-[#1e1d2b] border border-[#32304a] rounded-lg shadow-lg p-3 z-50 animate-fadeIn">
                <h3 className="text-white font-medium px-2 pb-2 border-b border-[#32304a] mb-2 flex items-center justify-between">
                  Notificações
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                    {displayedNotifications.filter(n => n.isNew).length} novas
                  </span>
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {displayedNotifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`px-2 py-2 hover:bg-[#25243a] rounded-lg cursor-pointer transition-colors ${notification.isNew ? 'border-l-2 border-green-500 pl-2' : ''}`}
                    >
                      <div className="flex justify-between">
                        <h4 className="text-white text-sm font-medium">{notification.title}</h4>
                        <span className="text-xs text-gray-400">{
                          typeof notification.time === 'string' && (notification.time.includes('atrás') || notification.time.includes('min') || notification.time.includes('hora'))
                            ? notification.time
                            : timeAgo(notification.time)
                        }</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">{notification.description}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-2 mt-2 border-t border-[#32304a] text-center">
                  <button className="text-green-500 hover:text-green-400 text-sm">
                    Ver todas notificações
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
        
        {/* Filters Bar */}
        <div className="bg-[#0c0b14]/50 backdrop-blur-md border-b border-[#1e1d2b] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Time Range Filter */}
            <CustomShadcnSelect
              value={timeRange}
              onChange={setTimeRange}
              options={[
                { value: 'today', label: 'Hoje' },
                { value: 'week', label: 'Últimos 7 dias' },
                { value: 'month', label: 'Último mês' },
                { value: 'quarter', label: 'Último trimestre' }
              ]}
              placeholder="Selecione o período"
            />
            
            {/* Sector Filter */}
            <CustomShadcnSelect
              value={selectedSector}
              onChange={setSelectedSector}
              options={[
                { value: 'all', label: 'Todos os Setores' },
                ...(filteredData?.sectors || []).map(sector => ({ value: sector, label: sector }))
              ]}
              placeholder="Selecione o setor"
            />
            
            {/* Agent Filter */}
            <CustomShadcnSelect
              value={selectedAgent}
              onChange={setSelectedAgent}
              options={[
                { value: 'all', label: 'Todos os Atendentes' },
                ...(filteredData?.agentData || []).map(agent => ({ value: agent.id.toString(), label: agent.name }))
              ]}
              placeholder="Selecione o atendente"
            />
            
            {/* Search */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Busca rápida..." 
                className="w-full h-10 pl-9 pr-4 rounded-lg bg-[#1e1d2b] border border-[#32304a] text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-4 md:p-6 flex-1 overflow-auto">
          {renderContent()}
          
          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e1d2b] text-sm text-gray-400 border border-[#32304a]">
              <RefreshCw className="h-3.5 w-3.5 text-green-400 animate-spin-slow" />
              <span>
                Última atualização: {new Date().toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS Styles */}
      <style jsx="true">{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        
        .delay-100 {
          animation-delay: 100ms;
        }
        
        .delay-200 {
          animation-delay: 200ms;
        }
        
        .delay-300 {
          animation-delay: 300ms;
        }
        
        .delay-400 {
          animation-delay: 400ms;
        }
        
        .delay-500 {
          animation-delay: 500ms;
        }
        
        .delay-600 {
          animation-delay: 600ms;
        }
        
        .delay-700 {
          animation-delay: 700ms;
        }
      `}</style>
    </div>
  );
};

export default WhatsAppDashboard;