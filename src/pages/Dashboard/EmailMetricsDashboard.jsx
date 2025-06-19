// src/pages/Dashboard/EmailMetricsDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Mail, 
  Calendar,
  ChevronDown, 
  Clock, 
  RefreshCw, 
  Filter,
  BarChart2, 
  Users, 
  MessageSquare,
  Search,
  Eye,
  MousePointer,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Send
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Importar multiflowApi
import { multiflowApi } from '../../services/multiflowApi';
import { useAuthContext } from '../../hooks/useAuthContext';
import { cn } from "../../lib/utils";

// Importar componentes UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Skeleton } from "../../components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { toast } from 'sonner';

// Cores para gráficos
const COLORS = ['#10b981', '#0ea5e9', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b', '#6366f1'];
const TIME_RANGES = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Últimos 7 dias' },
  { value: 'month', label: 'Último mês' },
  { value: 'quarter', label: 'Último trimestre' },
]

// Endpoints da API MetricsMail
const API_ENDPOINTS = {
  ACCOUNTS: (userId) => `/api/users/${userId}/accounts`,
  ACCOUNT_CAMPAIGNS: (userId, accountId) => `/api/users/${userId}/accounts/${accountId}/campaigns`,
  ACCOUNT_EMAILS: (userId, accountId) => `/api/users/${userId}/accounts/${accountId}/emails`,
  METRICS_BY_DATE: (userId) => `/api/users/${userId}/metrics/by-date`,
  METRICS_BY_ACCOUNT: (userId) => `/api/users/${userId}/metrics/by-account`,
  METRICS_BY_CAMPAIGN: (userId) => `/api/users/${userId}/metrics/by-campaign`,
  METRICS_BY_EMAIL: (userId) => `/api/users/${userId}/metrics/by-email`,
  OPENS: (userId) => `/api/users/${userId}/metrics/opens`,
  LAST_SEND: (userId) => `/api/users/${userId}/metrics/last-send`,
  RATES: (userId) => `/api/users/${userId}/metrics/rates`,
  SEND_RATE: (userId) => `/api/users/${userId}/metrics/send-rate`,
  DAILY_SENDS: (userId) => `/api/users/${userId}/metrics/daily-sends`,
  DAILY_OPENS: (userId) => `/api/users/${userId}/metrics/daily-opens`,
  DAILY_CLICKS: (userId) => `/api/users/${userId}/metrics/daily-clicks`,
  EVENTS: (userId) => `/api/users/${userId}/metrics/events`,
  ALL_EMAILS: (userId) => `/api/users/${userId}/emails`,
};

// Adaptador para a API MetricsMail usando multiflowApi
const metricsMailAdapter = {
  baseUrl: 'https://metrics.devoltaaojogo.com',
  apiKey: 'MAaDylN2bs0Y01Ep66',
  userId: 'YOUR_USER_ID', // Será substituído pelo ID real

  getHeaders: () => ({
    'x-api-key': metricsMailAdapter.apiKey,
    'Content-Type': 'application/json'
  }),

  // Método adaptador para fazer as requisições
  async request(endpoint, params = {}) {
    try {
      // Log da requisição para depuração
      console.log(`MetricsMail API Request: ${endpoint}`, params);
      
      // Fazer a requisição usando multiflowApi
      const response = await multiflowApi.api({
        method: 'get',
        url: `${metricsMailAdapter.baseUrl}${endpoint}`,
        headers: metricsMailAdapter.getHeaders(),
        params
      });
      
      // Log da resposta para depuração
      console.log(`MetricsMail API Response: ${endpoint}`, response);
      
      return response;
    } catch (error) {
      console.error(`MetricsMail API Error: ${endpoint}`, error);
      throw error;
    }
  },

  // Métodos específicos para cada endpoint
  async getUserAccounts() {
    const endpoint = API_ENDPOINTS.ACCOUNTS(this.userId);
    return this.request(endpoint);
  },

  async getAccountCampaigns(accountId) {
    const endpoint = API_ENDPOINTS.ACCOUNT_CAMPAIGNS(this.userId, accountId);
    return this.request(endpoint);
  },

  async getAccountEmails(accountId) {
    const endpoint = API_ENDPOINTS.ACCOUNT_EMAILS(this.userId, accountId);
    return this.request(endpoint);
  },

  async getMetricsByDate(params) {
    const endpoint = API_ENDPOINTS.METRICS_BY_DATE(this.userId);
    return this.request(endpoint, params);
  },

  async getMetricsByAccount(params) {
    const endpoint = API_ENDPOINTS.METRICS_BY_ACCOUNT(this.userId);
    return this.request(endpoint, params);
  },

  async getMetricsByCampaign(params) {
    const endpoint = API_ENDPOINTS.METRICS_BY_CAMPAIGN(this.userId);
    return this.request(endpoint, params);
  },

  async getMetricsByEmail(params) {
    const endpoint = API_ENDPOINTS.METRICS_BY_EMAIL(this.userId);
    return this.request(endpoint, params);
  },

  async getOpens(params) {
    const endpoint = API_ENDPOINTS.OPENS(this.userId);
    return this.request(endpoint, params);
  },

  async getLastSend(params) {
    const endpoint = API_ENDPOINTS.LAST_SEND(this.userId);
    return this.request(endpoint, params);
  },

  async getRates(params) {
    const endpoint = API_ENDPOINTS.RATES(this.userId);
    return this.request(endpoint, params);
  },

  async getSendRate(params) {
    const endpoint = API_ENDPOINTS.SEND_RATE(this.userId);
    return this.request(endpoint, params);
  },

  async getDailySends(params) {
    const endpoint = API_ENDPOINTS.DAILY_SENDS(this.userId);
    return this.request(endpoint, params);
  },

  async getDailyOpens(params) {
    const endpoint = API_ENDPOINTS.DAILY_OPENS(this.userId);
    return this.request(endpoint, params);
  },

  async getDailyClicks(params) {
    const endpoint = API_ENDPOINTS.DAILY_CLICKS(this.userId);
    return this.request(endpoint, params);
  },

  async getEvents(params) {
    const endpoint = API_ENDPOINTS.EVENTS(this.userId);
    return this.request(endpoint, params);
  },

  async getAllEmails() {
    const endpoint = API_ENDPOINTS.ALL_EMAILS(this.userId);
    return this.request(endpoint);
  }
};

// Componente principal Dashboard
const EmailMetricsDashboard = () => {
  const navigate = useNavigate();
  const { userProfile, user } = useAuthContext();
  
  // Refs
  const refreshTimeoutRef = useRef(null);
  const isFirstLoadRef = useRef(true);
  
  // Estado para controle de UI
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);
  
  // Estado para filtros
  const [timeRange, setTimeRange] = useState('week');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para dados da API
  const [dashboardData, setDashboardData] = useState({
    accounts: [],
    campaigns: [],
    emails: [],
    metricsByDate: [],
    metricsByAccount: [],
    metricsByCampaign: [],
    metricsByEmail: [],
    opens: {},
    rates: {},
    dailySends: {},
    dailyOpens: {},
    dailyClicks: {},
    recentEvents: []
  });
  
  // Configurar userId para a API
  useEffect(() => {
    const userId = userProfile?.id || user?.uid || 'YOUR_USER_ID';
    metricsMailAdapter.userId = userId;
  }, [userProfile, user]);
  
  // Funções utilitárias para formatação
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  
  const formatPercent = (num) => {
    if (num === undefined || num === null) return '0%';
    return (parseFloat(num).toFixed(1)) + '%';
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };
  
  // Determinar datas com base no timeRange
  const getDateRangeFromTimeRange = useCallback((selectedRange) => {
    const endDate = new Date();
    let startDate;
    
    switch (selectedRange) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = subDays(endDate, 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      default:
        startDate = subDays(endDate, 7);
    }
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  }, []);
  
  // Preparar parâmetros comuns para chamadas de API
  const getCommonParams = useCallback(() => {
    const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);
    
    const params = {
      startDate,
      endDate
    };
    
    if (selectedAccount !== 'all') {
      params.accountId = selectedAccount;
    }
    
    if (selectedCampaign !== 'all') {
      params.campaignId = selectedCampaign;
    }
    
    if (selectedEmail !== 'all') {
      params.emailId = selectedEmail;
    }
    
    return params;
  }, [timeRange, selectedAccount, selectedCampaign, selectedEmail, getDateRangeFromTimeRange]);
  
  // Função principal para carregar todos os dados
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const commonParams = getCommonParams();
      
      // Carregar dados em paralelo
      const [
        accountsResponse,
        metricsByDateResponse,
        metricsByAccountResponse,
        metricsByCampaignResponse,
        metricsByEmailResponse,
        opensResponse,
        ratesResponse,
        dailySendsResponse,
        dailyOpensResponse,
        dailyClicksResponse,
        eventsResponse,
        emailsResponse
      ] = await Promise.all([
        // Informações de contas e campanhas
        metricsMailAdapter.getUserAccounts(),
        
        // Métricas
        metricsMailAdapter.getMetricsByDate({
          ...commonParams,
          groupBy: 'day'
        }),
        metricsMailAdapter.getMetricsByAccount(commonParams),
        metricsMailAdapter.getMetricsByCampaign(commonParams),
        metricsMailAdapter.getMetricsByEmail(commonParams),
        
        // Dados específicos
        metricsMailAdapter.getOpens(commonParams),
        metricsMailAdapter.getRates({
          ...commonParams,
          period: 'day'
        }),
        
        // Dados de séries temporais
        metricsMailAdapter.getDailySends(commonParams),
        metricsMailAdapter.getDailyOpens(commonParams),
        metricsMailAdapter.getDailyClicks(commonParams),
        
        // Eventos recentes
        metricsMailAdapter.getEvents({
          limit: 20
        }),
        
        // Lista completa de emails
        metricsMailAdapter.getAllEmails()
      ]);
      
      // Carregar campanhas da primeira conta disponível
      let campaigns = [];
      if (accountsResponse.data && accountsResponse.data.length > 0) {
        const firstAccountId = accountsResponse.data[0]._id;
        try {
          const campaignsResponse = await metricsMailAdapter.getAccountCampaigns(firstAccountId);
          campaigns = campaignsResponse.data?.campaigns || [];
        } catch (err) {
          console.error('Erro ao carregar campanhas:', err);
        }
      }
      
      // Consolidar todos os dados em um único objeto
      setDashboardData({
        accounts: accountsResponse.data || [],
        campaigns: campaigns,
        emails: emailsResponse.data || [],
        metricsByDate: metricsByDateResponse.data || [],
        metricsByAccount: metricsByAccountResponse.data || [],
        metricsByCampaign: metricsByCampaignResponse.data || [],
        metricsByEmail: metricsByEmailResponse.data || [],
        opens: opensResponse.data || {},
        rates: ratesResponse.data || {},
        dailySends: dailySendsResponse.data || {},
        dailyOpens: dailyOpensResponse.data || {},
        dailyClicks: dailyClicksResponse.data || {},
        recentEvents: eventsResponse.data || []
      });
      
      // Notificar usuário sobre sucesso caso não seja o primeiro carregamento
      if (!isFirstLoadRef.current) {
        toast.success('Dados atualizados com sucesso');
      } else {
        isFirstLoadRef.current = false;
      }
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError(err.message || 'Ocorreu um erro ao carregar os dados do dashboard');
      setShowError(true);
      
      if (!isFirstLoadRef.current) {
        toast.error('Erro ao atualizar dados');
      }
    } finally {
      setIsLoading(false);
      
      // Configurar refresh automático a cada 5 minutos
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        loadDashboardData();
      }, 5 * 60 * 1000);
    }
  }, [getCommonParams]);
  
  // Carregar dados inicialmente e quando filtros mudarem
  useEffect(() => {
    loadDashboardData();
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loadDashboardData]);
  
  // Calcular métricas agregadas
  const aggregatedMetrics = useMemo(() => {
    // Verificar se há dados válidos antes de calcular
    if (!dashboardData.metricsByAccount || dashboardData.metricsByAccount.length === 0) {
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalOpens: 0,
        uniqueOpens: 0,
        totalClicks: 0,
        uniqueClicks: 0,
        totalBounces: 0,
        totalUnsubscribes: 0,
        deliveryRate: 0,
        openRate: 0,
        uniqueOpenRate: 0,
        clickRate: 0,
        uniqueClickRate: 0,
        clickToOpenRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0
      };
    }
    
    // Calcular somas
    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpens = 0;
    let uniqueOpens = 0;
    let totalClicks = 0;
    let uniqueClicks = 0;
    let totalBounces = 0;
    let totalUnsubscribes = 0;
    
    dashboardData.metricsByAccount.forEach(account => {
      totalSent += account.metrics.sentCount || 0;
      totalDelivered += account.metrics.deliveredCount || 0;
      totalOpens += account.metrics.openCount || 0;
      uniqueOpens += account.metrics.uniqueOpenCount || 0;
      totalClicks += account.metrics.clickCount || 0;
      uniqueClicks += account.metrics.uniqueClickCount || 0;
      totalBounces += account.metrics.bounceCount || 0;
      totalUnsubscribes += account.metrics.unsubscribeCount || 0;
    });
    
    // Calcular taxas
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpens / totalDelivered) * 100 : 0;
    const uniqueOpenRate = totalDelivered > 0 ? (uniqueOpens / totalDelivered) * 100 : 0;
    const clickRate = totalDelivered > 0 ? (totalClicks / totalDelivered) * 100 : 0;
    const uniqueClickRate = totalDelivered > 0 ? (uniqueClicks / totalDelivered) * 100 : 0;
    const clickToOpenRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;
    const unsubscribeRate = totalDelivered > 0 ? (totalUnsubscribes / totalDelivered) * 100 : 0;
    
    return {
      totalSent,
      totalDelivered,
      totalOpens,
      uniqueOpens,
      totalClicks,
      uniqueClicks,
      totalBounces,
      totalUnsubscribes,
      deliveryRate,
      openRate,
      uniqueOpenRate,
      clickRate,
      uniqueClickRate,
      clickToOpenRate,
      bounceRate,
      unsubscribeRate
    };
  }, [dashboardData.metricsByAccount]);
  
  // Preparar dados para gráficos
  const chartData = useMemo(() => {
    // Dados para o gráfico de envios diários
    const dailySendsData = dashboardData.dailySends?.labels?.map((date, index) => ({
      date,
      sent: dashboardData.dailySends.datasets?.[0]?.data?.[index] || 0
    })) || [];
    
    // Dados para o gráfico de aberturas
    const dailyOpensData = dashboardData.dailyOpens?.labels?.map((date, index) => ({
      date,
      opens: dashboardData.dailyOpens.datasets?.[0]?.data?.[index] || 0
    })) || [];
    
    // Dados para o gráfico de cliques
    const dailyClicksData = dashboardData.dailyClicks?.labels?.map((date, index) => ({
      date,
      clicks: dashboardData.dailyClicks.datasets?.[0]?.data?.[index] || 0
    })) || [];
    
    // Dados para o gráfico de taxas (CTR, Bounce, Unsubscribe)
    const ratesData = dashboardData.rates?.labels?.map((date, index) => {
      const dataPoint = { date };
      
      dashboardData.rates.datasets?.forEach(dataset => {
        const key = dataset.label
          .replace('CTR (Click-to-Open Rate)', 'ctr')
          .replace('Taxa de Bounce', 'bounce')
          .replace('Taxa de Unsubscribe', 'unsubscribe')
          .toLowerCase()
          .replace(/\s/g, '_');
        
        dataPoint[key] = dataset.data?.[index] || 0;
      });
      
      return dataPoint;
    }) || [];
    
    // Dados para o gráfico circular de distribuição por conta
    const accountDistributionData = dashboardData.metricsByAccount?.map(account => ({
      name: account.account.name,
      value: account.metrics.sentCount || 0
    })) || [];
    
    return {
      dailySendsData,
      dailyOpensData,
      dailyClicksData,
      ratesData,
      accountDistributionData
    };
  }, [dashboardData]);
  
  // Renderização condicional para o estado de carregamento
  if (isLoading && isFirstLoadRef.current) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse"></div>
            <Mail className="h-16 w-16 text-primary relative z-10 animate-bounce" />
          </div>
          <div className="text-center animate-pulse">
            <h2 className="text-2xl font-bold text-foreground mb-2">Carregando Dashboard</h2>
            <p className="text-muted-foreground">Obtendo métricas de e-mail marketing...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Background com grid de pontos */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[url('https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/grid-pattern-dark.svg')] bg-repeat"></div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="container mx-auto py-6 px-4 relative z-10">
        {/* Cabeçalho com título e filtros */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 md:mb-0 flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Dashboard de Email Marketing
            </h1>
            
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadDashboardData}
                className={cn(
                  "bg-muted/20 border-border",
                  isLoading && "opacity-70"
                )}
                disabled={isLoading}
              >
                <RefreshCw className={cn(
                  "h-4 w-4 mr-2",
                  isLoading && "animate-spin"
                )} />
                {isLoading ? "Atualizando..." : "Atualizar"}
              </Button>
              
              <Select 
                value={timeRange} 
                onValueChange={setTimeRange}
              >
                <SelectTrigger className="w-[180px] bg-muted/20 border-border">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Período" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Filtros adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Select 
              value={selectedAccount} 
              onValueChange={setSelectedAccount}
            >
              <SelectTrigger className="bg-muted/20 border-border">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Conta" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Contas</SelectItem>
                {dashboardData.accounts.map((account) => (
                  <SelectItem key={account._id} value={account._id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={selectedCampaign} 
              onValueChange={setSelectedCampaign}
            >
              <SelectTrigger className="bg-muted/20 border-border">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Campanha" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Campanhas</SelectItem>
                {dashboardData.campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={selectedEmail} 
              onValueChange={setSelectedEmail}
            >
              <SelectTrigger className="bg-muted/20 border-border">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Email" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Emails</SelectItem>
                {dashboardData.emails.map((email) => (
                  <SelectItem key={email._id} value={email._id}>
                    {email.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Tabs de navegação */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-muted/20 p-1 mb-8">
            <TabsTrigger value="overview" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                <span>Visão Geral</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="opens" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Aberturas</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="clicks" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                <span>Cliques</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Campanhas</span>
              </div>
            </TabsTrigger>
          </TabsList>
          
          {/* Conteúdo da aba Visão Geral */}
          <TabsContent value="overview" className="space-y-8">
            {/* Cards de métricas principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Envios Totais */}
              <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Envios Totais</div>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Send className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-foreground">{formatNumber(aggregatedMetrics.totalSent)}</div>
                    <div className="text-xs text-muted-foreground">emails enviados no período</div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-primary/60 to-primary/10"></div>
              </Card>
              
              {/* Taxa de Entrega */}
              <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Taxa de Entrega</div>
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-foreground">{formatPercent(aggregatedMetrics.deliveryRate)}</div>
                    <div className="text-xs text-muted-foreground">{formatNumber(aggregatedMetrics.totalDelivered)} entregas</div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-blue-500/60 to-blue-500/10"></div>
              </Card>
              
              {/* Taxa de Abertura */}
              <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Taxa de Abertura</div>
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Eye className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-foreground">{formatPercent(aggregatedMetrics.openRate)}</div>
                    <div className="text-xs text-muted-foreground">{formatNumber(aggregatedMetrics.totalOpens)} aberturas</div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-amber-500/60 to-amber-500/10"></div>
              </Card>
              
              {/* Taxa de Cliques */}
              <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-border/40 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Taxa de Cliques</div>
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <MousePointer className="h-4 w-4 text-purple-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-foreground">{formatPercent(aggregatedMetrics.clickRate)}</div>
                    <div className="text-xs text-muted-foreground">{formatNumber(aggregatedMetrics.totalClicks)} cliques</div>
                  </div>
                </CardContent>
                <div className="h-1 w-full bg-gradient-to-r from-purple-500/60 to-purple-500/10"></div>
              </Card>
            </div>
            
            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Envios Diários */}
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    <CardTitle>Envios Diários</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.dailySendsData}>
                        <defs>
                          <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="date" 
                          stroke="rgba(255,255,255,0.5)"
                          tickFormatter={(date) => {
                            if (!date) return '';
                            const parts = date.split('-');
                            return parts.length > 1 ? `${parts[2]}/${parts[1]}` : date;
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
                          formatter={(value) => [`${formatNumber(value)}`, 'Enviados']}
                          labelFormatter={(label) => {
                            if (!label) return '';
                            const parts = label.split('-');
                            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : label;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="sent" 
                          stroke="#10b981" 
                          fillOpacity={1}
                          fill="url(#colorSent)"
                          strokeWidth={2}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                          name="Enviados"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Gráfico de Aberturas Diárias */}
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <CardTitle>Aberturas Diárias</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.dailyOpensData}>
                        <defs>
                          <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="date" 
                          stroke="rgba(255,255,255,0.5)"
                          tickFormatter={(date) => {
                            if (!date) return '';
                            const parts = date.split('-');
                            return parts.length > 1 ? `${parts[2]}/${parts[1]}` : date;
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
                          formatter={(value) => [`${formatNumber(value)}`, 'Aberturas']}
                          labelFormatter={(label) => {
                            if (!label) return '';
                            const parts = label.split('-');
                            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : label;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="opens" 
                          stroke="#f59e0b" 
                          fillOpacity={1}
                          fill="url(#colorOpens)"
                          strokeWidth={2}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                          name="Aberturas"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Distribuição por Conta e Métricas Detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribuição por Conta */}
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    <CardTitle>Distribuição por Conta</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex items-center justify-center">
                  <div className="h-[320px] w-full">
                    {chartData.accountDistributionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.accountDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={100}
                            innerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {chartData.accountDistributionData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${formatNumber(value)}`, 'Envios']}
                            contentStyle={{ 
                              backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                              borderColor: 'rgba(16, 185, 129, 0.3)',
                              borderRadius: '10px',
                              backdropFilter: 'blur(12px)',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Sem dados para exibir</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Métricas Detalhadas */}
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" />
                    <CardTitle>Métricas Detalhadas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ScrollArea className="h-[320px] pr-4">
                    <div className="space-y-6">
                      {/* Taxas de Entrega e Abertura */}
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Taxa de Entrega e Abertura</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs">Taxa de Entrega</span>
                            <span className="text-xs font-medium">{formatPercent(aggregatedMetrics.deliveryRate)}</span>
                          </div>
                          <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${aggregatedMetrics.deliveryRate}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs">Taxa de Abertura</span>
                            <span className="text-xs font-medium">{formatPercent(aggregatedMetrics.openRate)}</span>
                          </div>
                          <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 rounded-full" 
                              style={{ width: `${aggregatedMetrics.openRate}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs">Taxa de Abertura Única</span>
                            <span className="text-xs font-medium">{formatPercent(aggregatedMetrics.uniqueOpenRate)}</span>
                          </div>
                          <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-600 rounded-full" 
                              style={{ width: `${aggregatedMetrics.uniqueOpenRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Taxas de Clique */}
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Taxa de Clique</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs">Taxa de Clique</span>
                            <span className="text-xs font-medium">{formatPercent(aggregatedMetrics.clickRate)}</span>
                          </div>
                          <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full" 
                              style={{ width: `${aggregatedMetrics.clickRate}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs">Taxa de Clique Único</span>
                            <span className="text-xs font-medium">{formatPercent(aggregatedMetrics.uniqueClickRate)}</span>
                          </div>
                          <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-600 rounded-full" 
                              style={{ width: `${aggregatedMetrics.uniqueClickRate}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs">CTR (Click-to-Open)</span>
                            <span className="text-xs font-medium">{formatPercent(aggregatedMetrics.clickToOpenRate)}</span>
                          </div>
                          <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-700 rounded-full" 
                              style={{ width: `${aggregatedMetrics.clickToOpenRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Taxas de Rejeição */}
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Rejeição e Cancelamentos</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs">Taxa de Bounce</span>
                            <span className="text-xs font-medium">{formatPercent(aggregatedMetrics.bounceRate)}</span>
                          </div>
                          <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500 rounded-full" 
                              style={{ width: `${aggregatedMetrics.bounceRate}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs">Taxa de Cancelamento</span>
                            <span className="text-xs font-medium">{formatPercent(aggregatedMetrics.unsubscribeRate)}</span>
                          </div>
                          <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-600 rounded-full" 
                              style={{ width: `${aggregatedMetrics.unsubscribeRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            {/* Tabela de campanhas recentes */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle>Campanhas Recentes</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead>Enviados</TableHead>
                        <TableHead>Entregues</TableHead>
                        <TableHead>Aberturas</TableHead>
                        <TableHead>Cliques</TableHead>
                        <TableHead className="text-right">Taxa de Abertura</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.metricsByCampaign?.length > 0 ? (
                        dashboardData.metricsByCampaign.slice(0, 5).map((campaign, index) => (
                          <TableRow key={campaign.campaign?.id || index}>
                            <TableCell className="font-medium">{campaign.campaign?.name || 'Campanha sem nome'}</TableCell>
                            <TableCell>{formatNumber(campaign.metrics?.sentCount || 0)}</TableCell>
                            <TableCell>{formatNumber(campaign.metrics?.deliveredCount || 0)}</TableCell>
                            <TableCell>{formatNumber(campaign.metrics?.openCount || 0)}</TableCell>
                            <TableCell>{formatNumber(campaign.metrics?.clickCount || 0)}</TableCell>
                            <TableCell className="text-right">{formatPercent(campaign.metrics?.openRate || 0)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhuma campanha encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {dashboardData.metricsByCampaign?.length > 5 && (
                  <div className="flex justify-center mt-4">
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('campaigns')}>
                      Ver todas as campanhas
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Conteúdo da aba Aberturas */}
          <TabsContent value="opens" className="space-y-8">
            {/* Resumo de aberturas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Total de Aberturas</div>
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Eye className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatNumber(dashboardData.opens?.metrics?.totalOpens || 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Aberturas Únicas</div>
                    <div className="h-8 w-8 rounded-lg bg-amber-600/10 flex items-center justify-center">
                      <Eye className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatNumber(dashboardData.opens?.metrics?.uniqueOpens || 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Taxa de Abertura</div>
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <BarChart2 className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatPercent(dashboardData.opens?.metrics?.openRate || 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Taxa de Abertura Única</div>
                    <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
                      <BarChart2 className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatPercent(dashboardData.opens?.metrics?.uniqueOpenRate || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Gráfico de aberturas diárias */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <CardTitle>Aberturas Diárias</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.dailyOpensData}>
                      <defs>
                        <linearGradient id="colorOpens2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="rgba(255,255,255,0.5)"
                        tickFormatter={(date) => {
                          if (!date) return '';
                          const parts = date.split('-');
                          return parts.length > 1 ? `${parts[2]}/${parts[1]}` : date;
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
                        formatter={(value) => [`${formatNumber(value)}`, 'Aberturas']}
                        labelFormatter={(label) => {
                          if (!label) return '';
                          const parts = label.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : label;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="opens" 
                        stroke="#f59e0b" 
                        fillOpacity={1}
                        fill="url(#colorOpens2)"
                        strokeWidth={2}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        name="Aberturas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Aberturas recentes */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <CardTitle>Aberturas Recentes</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Única</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.opens?.recentOpens?.length > 0 ? (
                        dashboardData.opens.recentOpens.slice(0, 10).map((open, index) => (
                          <TableRow key={open.id || index}>
                            <TableCell className="font-medium">
                              {open.contactEmail || 'Email não disponível'}
                            </TableCell>
                            <TableCell>{open.subject || 'Sem assunto'}</TableCell>
                            <TableCell>{formatDate(open.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {open.isUnique ? (
                                <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Sim</Badge>
                              ) : (
                                <Badge variant="outline">Não</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhuma abertura recente encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Conteúdo da aba Cliques */}
          <TabsContent value="clicks" className="space-y-8">
            {/* Resumo de cliques */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Total de Cliques</div>
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <MousePointer className="h-4 w-4 text-purple-500" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatNumber(aggregatedMetrics.totalClicks)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Cliques Únicos</div>
                    <div className="h-8 w-8 rounded-lg bg-purple-600/10 flex items-center justify-center">
                      <MousePointer className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatNumber(aggregatedMetrics.uniqueClicks)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">Taxa de Clique</div>
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <BarChart2 className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatPercent(aggregatedMetrics.clickRate)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground font-medium">CTR (Click-to-Open)</div>
                    <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
                      <BarChart2 className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatPercent(aggregatedMetrics.clickToOpenRate)}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Gráfico de cliques diários */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <MousePointer className="h-5 w-5 text-primary" />
                  <CardTitle>Cliques Diários</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.dailyClicksData}>
                      <defs>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="rgba(255,255,255,0.5)"
                        tickFormatter={(date) => {
                          if (!date) return '';
                          const parts = date.split('-');
                          return parts.length > 1 ? `${parts[2]}/${parts[1]}` : date;
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
                        formatter={(value) => [`${formatNumber(value)}`, 'Cliques']}
                        labelFormatter={(label) => {
                          if (!label) return '';
                          const parts = label.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : label;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#8b5cf6" 
                        fillOpacity={1}
                        fill="url(#colorClicks)"
                        strokeWidth={2}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        name="Cliques"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Gráfico de taxas */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  <CardTitle>Taxas de Desempenho</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.ratesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="rgba(255,255,255,0.5)"
                        tickFormatter={(date) => {
                          if (!date) return '';
                          const parts = date.split('-');
                          return parts.length > 1 ? `${parts[2]}/${parts[1]}` : date;
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
                        formatter={(value) => [`${formatPercent(value)}`, '']}
                        labelFormatter={(label) => {
                          if (!label) return '';
                          const parts = label.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : label;
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="ctr" 
                        name="CTR (Click-to-Open)"
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="bounce" 
                        name="Taxa de Bounce"
                        stroke="#ef4444" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="unsubscribe" 
                        name="Taxa de Unsubscribe"
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Conteúdo da aba Campanhas */}
          <TabsContent value="campaigns" className="space-y-8">
            {/* Lista de campanhas */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle>Desempenho por Campanha</CardTitle>
                  </div>
                  <div className="flex items-center">
                    <Input
                      type="search"
                      placeholder="Buscar campanha..."
                      className="w-[200px] h-8 bg-muted/30 border-border"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead>Enviados</TableHead>
                        <TableHead>Entregues</TableHead>
                        <TableHead>Aberturas</TableHead>
                        <TableHead>Cliques</TableHead>
                        <TableHead>Abertura</TableHead>
                        <TableHead>Clique</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.metricsByCampaign?.length > 0 ? (
                        dashboardData.metricsByCampaign
                          .filter(campaign => 
                            searchTerm === '' || 
                            campaign.campaign?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((campaign, index) => (
                            <TableRow key={campaign.campaign?.id || index}>
                              <TableCell className="font-medium">
                                {campaign.campaign?.name || 'Campanha sem nome'}
                              </TableCell>
                              <TableCell>
                                {campaign.account?.name || 'Conta não identificada'}
                              </TableCell>
                              <TableCell>{formatNumber(campaign.metrics?.sentCount || 0)}</TableCell>
                              <TableCell>{formatNumber(campaign.metrics?.deliveredCount || 0)}</TableCell>
                              <TableCell>{formatNumber(campaign.metrics?.openCount || 0)}</TableCell>
                              <TableCell>{formatNumber(campaign.metrics?.clickCount || 0)}</TableCell>
                              <TableCell>
                                <Badge className={
                                  (campaign.metrics?.openRate || 0) > 20
                                    ? "bg-green-500/10 text-green-500"
                                    : (campaign.metrics?.openRate || 0) > 10
                                      ? "bg-amber-500/10 text-amber-500"
                                      : "bg-red-500/10 text-red-500"
                                }>
                                  {formatPercent(campaign.metrics?.openRate || 0)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  (campaign.metrics?.clickRate || 0) > 5
                                    ? "bg-green-500/10 text-green-500"
                                    : (campaign.metrics?.clickRate || 0) > 2
                                      ? "bg-amber-500/10 text-amber-500"
                                      : "bg-red-500/10 text-red-500"
                                }>
                                  {formatPercent(campaign.metrics?.clickRate || 0)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            Nenhuma campanha encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            {/* Emails por desempenho */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle>Desempenho por Email</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Campanha</TableHead>
                        <TableHead>Enviados</TableHead>
                        <TableHead>Aberturas</TableHead>
                        <TableHead>Cliques</TableHead>
                        <TableHead>CTR</TableHead>
                        <TableHead>Rejeições</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.metricsByEmail?.length > 0 ? (
                        dashboardData.metricsByEmail
                          .filter(emailData => 
                            searchTerm === '' || 
                            emailData.email?.subject?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((emailData, index) => (
                            <TableRow key={emailData.email?.id || index}>
                              <TableCell className="font-medium">
                                {emailData.email?.subject || 'Sem assunto'}
                              </TableCell>
                              <TableCell>
                                {emailData.campaign?.name || 'Campanha não identificada'}
                              </TableCell>
                              <TableCell>{formatNumber(emailData.metrics?.sentCount || 0)}</TableCell>
                              <TableCell>{formatNumber(emailData.metrics?.openCount || 0)}</TableCell>
                              <TableCell>{formatNumber(emailData.metrics?.clickCount || 0)}</TableCell>
                              <TableCell>
                                <Badge className={
                                  (emailData.metrics?.clickToOpenRate || 0) > 10
                                    ? "bg-green-500/10 text-green-500"
                                    : (emailData.metrics?.clickToOpenRate || 0) > 5
                                      ? "bg-amber-500/10 text-amber-500"
                                      : "bg-red-500/10 text-red-500"
                                }>
                                  {formatPercent(emailData.metrics?.clickToOpenRate || 0)}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatNumber(emailData.metrics?.bounceCount || 0)}</TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Nenhum email encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialog de erro */}
      <Dialog open={showError} onOpenChange={setShowError}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Erro ao carregar dados
            </DialogTitle>
            <DialogDescription>
              {error}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowError(false)}
            >
              Fechar
            </Button>
            <Button 
              onClick={() => {
                setShowError(false);
                loadDashboardData();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailMetricsDashboard;