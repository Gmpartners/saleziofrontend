import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, PieChart, Briefcase, Clock, CheckCircle, 
  Calendar, Download, RefreshCw, Filter, Users, MessageSquare,
  ChevronUp, ChevronDown, HelpCircle, MoreVertical, PlusCircle,
  Edit, Trash2, Search, UserPlus, AlertTriangle, ArrowUpRight,
  Settings, Eye, Check, X, Save, FileText, ArrowRight,
  Loader2, Layers, ArrowDownRight, ChevronRight, Menu
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { multiflowApi } from '../../services/multiflowApi';
import DateRangePicker from './DateRangePicker';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger, DialogClose 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const AdminSetoresDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('visao-geral');
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [statsData, setStatsData] = useState({
    totalSectors: 0,
    activeSectors: 0,
    inactiveSectors: 0,
    avgResponseTime: 0,
    totalConversations: 0,
    mostActiveSetor: null
  });
  
  // Estados para dados reais da API
  const [dashboardData, setDashboardData] = useState(null);
  const [sectorDashboards, setSectorDashboards] = useState({});
  const [sectorActivityData, setSectorActivityData] = useState([]);
  const [sectorConversationsData, setSectorConversationsData] = useState([]);
  const [conversationsOverTime, setConversationsOverTime] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    responsavel: '',
    contexto: '',
    palavrasChave: [],
    ativo: true
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  // Date range setup
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const [dateRange, setDateRange] = useState({
    start: thirtyDaysAgo.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  });
  
  const [activePeriod, setActivePeriod] = useState('30d');
  const [expandedRows, setExpandedRows] = useState({});
  // Estado para controlar o menu mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Estado para controle de responsividade
  const [isMobile, setIsMobile] = useState(false);
  
  const COLORS = ['#10b981', '#059669', '#0284c7', '#4f46e5', '#8b5cf6', '#ec4899', '#f97316', '#ef4444'];
  
  // Detect mobile view
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  
  useEffect(() => {
    loadSectors();
    loadDashboardData();
  }, []);
  
  useEffect(() => {
    if (sectors.length > 0) {
      calculateStats();
      loadSectorDashboards();
    }
  }, [sectors]);
  
  const loadSectors = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userId = multiflowApi.getUserId();
      const response = await multiflowApi.getSetores(userId, true, true);
      
      if (response.success && Array.isArray(response.data)) {
        setSectors(response.data);
      } else {
        throw new Error(response.error || 'Falha ao carregar setores');
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
      setError('Falha ao carregar setores. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadDashboardData = async () => {
    try {
      const userId = multiflowApi.getUserId();
      const response = await multiflowApi.getDashboard(userId, true);
      
      if (response.success && response.data) {
        setDashboardData(response.data);
        
        // Se a API retornar dados de conversas ao longo do tempo, use-os
        if (response.data.conversasAoLongo && Array.isArray(response.data.conversasAoLongo)) {
          setConversationsOverTime(response.data.conversasAoLongo);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  };
  
  const loadSectorDashboards = async () => {
    if (!sectors || sectors.length === 0) return;
    
    const userId = multiflowApi.getUserId();
    const sectorData = [];
    const dashboards = {};
    const conversationsData = [];
    
    try {
      // Obter dashboard para cada setor
      await Promise.all(sectors.map(async (sector) => {
        try {
          const response = await multiflowApi.getDashboardSetor(sector._id, userId, true);
          
          if (response.success && response.data) {
            dashboards[sector._id] = response.data;
            
            // Preparar dados de atividade do setor baseados na resposta da API
            const activityData = {
              id: sector._id,
              name: sector.nome,
              totalConversations: response.data.conversas?.total || 0,
              resolvedConversations: response.data.conversas?.finalizadas || 0,
              pendingConversations: (response.data.conversas?.aguardando || 0) + (response.data.conversas?.emAndamento || 0),
              resolutionRate: response.data.conversas?.total ? 
                Math.round((response.data.conversas.finalizadas / response.data.conversas.total) * 100) : 0,
              responseTime: response.data.tempMedioAtendimento || 0,
              agentCount: response.data.atendentes?.length || 0,
              color: COLORS[sectorData.length % COLORS.length],
              status: sector.ativo === true || sector.ativo === 'true' ? 'active' : 'inactive',
              trend: response.data.tendencia || 0
            };
            
            sectorData.push(activityData);
            
            // Processar dados históricos de conversas se disponíveis
            if (response.data.historicoConversas && Array.isArray(response.data.historicoConversas)) {
              conversationsData.push({
                id: sector._id,
                name: sector.nome,
                data: response.data.historicoConversas.map(item => ({
                  date: item.data,
                  value: item.quantidade
                })),
                color: COLORS[conversationsData.length % COLORS.length]
              });
            }
          }
        } catch (error) {
          console.error(`Erro ao carregar dashboard do setor ${sector._id}:`, error);
        }
      }));
      
      setSectorActivityData(sectorData);
      setSectorDashboards(dashboards);
      
      if (conversationsData.length > 0) {
        setSectorConversationsData(conversationsData);
      } else {
        // Se não houver dados históricos disponíveis na API, manter os atuais
        // Ou opcionalmente gere alguns dados fictícios apenas para visualização inicial
        generateConversationsData();
      }
    } catch (error) {
      console.error('Erro ao carregar dashboards dos setores:', error);
    }
  };
  
  const calculateStats = () => {
    // Use os dados reais dos dashboards quando disponíveis
    if (dashboardData) {
      const activeSectors = sectors.filter(s => s.ativo === true || s.ativo === 'true').length;
      const inactiveSectors = sectors.length - activeSectors;
      
      // Use dados reais do dashboard
      const totalConversations = dashboardData.totalConversas || 0;
      const avgResponseTime = dashboardData.tempoMedioResposta || 0;
      
      // Encontrar o setor mais ativo baseado nos dados reais
      let mostActiveSetor = null;
      
      if (dashboardData.setores && Array.isArray(dashboardData.setores)) {
        const sortedSectors = [...dashboardData.setores].sort((a, b) => 
          (b.totalConversas || 0) - (a.totalConversas || 0)
        );
        
        if (sortedSectors.length > 0) {
          mostActiveSetor = {
            id: sortedSectors[0].setorId,
            name: sortedSectors[0].nome,
            conversations: sortedSectors[0].totalConversas || 0
          };
        }
      }
      
      setStatsData({
        totalSectors: sectors.length,
        activeSectors,
        inactiveSectors,
        avgResponseTime,
        totalConversations,
        mostActiveSetor
      });
    } else {
      // Fallback para cálculos básicos quando não houver dados do dashboard
      const activeSectors = sectors.filter(s => s.ativo === true || s.ativo === 'true').length;
      
      setStatsData({
        totalSectors: sectors.length,
        activeSectors,
        inactiveSectors: sectors.length - activeSectors,
        avgResponseTime: 0,
        totalConversations: 0,
        mostActiveSetor: null
      });
    }
  };
  
  // Função de fallback para gerar dados simulados apenas se não houver dados reais
  const generateConversationsData = () => {
    // Se não houver dados reais de conversas ao longo do tempo, geramos simulados
    if (sectorConversationsData.length === 0) {
      const daysInRange = 30;
      const conversationsData = sectors.map((sector, sectorIdx) => {
        const dataPoints = [];
        const baseValue = Math.floor(Math.random() * 30) + 10;
        
        for (let i = 0; i < daysInRange; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (daysInRange - i - 1));
          
          const variation = Math.random() * 15 - 5; 
          const growthFactor = 1 + (i * 0.01);
          
          dataPoints.push({
            date: date.toISOString().split('T')[0],
            value: Math.max(1, Math.floor((baseValue + variation) * growthFactor))
          });
        }
        
        return {
          id: sector._id,
          name: sector.nome,
          data: dataPoints,
          color: COLORS[sectorIdx % COLORS.length]
        };
      });
      
      setSectorConversationsData(conversationsData);
    }
  };
  
  const handleAddSector = async () => {
    // Validação básica
    const errors = {};
    if (!formData.nome || formData.nome.trim() === '') {
      errors.nome = 'Nome é obrigatório';
    }
    if (!formData.responsavel || formData.responsavel.trim() === '') {
      errors.responsavel = 'Responsável é obrigatório';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setConfirmLoading(true);
    
    try {
      const userId = multiflowApi.getUserId();
      
      // Processando palavras-chave se for uma string
      const palavrasChave = typeof formData.palavrasChave === 'string' 
        ? formData.palavrasChave.split(',').map(p => p.trim()).filter(p => p)
        : formData.palavrasChave;
      
      const payload = {
        ...formData,
        palavrasChave
      };
      
      const response = await multiflowApi.createSetor(payload, userId, true);
      
      if (response.success) {
        setShowAddModal(false);
        // Resetar form
        setFormData({
          nome: '',
          descricao: '',
          responsavel: '',
          contexto: '',
          palavrasChave: [],
          ativo: true
        });
        setFormErrors({});
        
        // Recarregar lista de setores
        await loadSectors();
        await loadDashboardData();
      } else {
        throw new Error(response.error || 'Erro ao criar setor');
      }
    } catch (error) {
      console.error('Erro ao criar setor:', error);
      setError('Falha ao criar setor. Por favor, tente novamente.');
    } finally {
      setConfirmLoading(false);
    }
  };
  
  const handleEditSector = async () => {
    if (!selectedSector) return;
    
    // Validação básica
    const errors = {};
    if (!formData.nome || formData.nome.trim() === '') {
      errors.nome = 'Nome é obrigatório';
    }
    if (!formData.responsavel || formData.responsavel.trim() === '') {
      errors.responsavel = 'Responsável é obrigatório';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setConfirmLoading(true);
    
    try {
      const userId = multiflowApi.getUserId();
      
      // Processando palavras-chave se for uma string
      const palavrasChave = typeof formData.palavrasChave === 'string' 
        ? formData.palavrasChave.split(',').map(p => p.trim()).filter(p => p)
        : formData.palavrasChave;
      
      const payload = {
        ...formData,
        palavrasChave
      };
      
      const response = await multiflowApi.updateSetorDetalhado(selectedSector._id, payload, userId, true);
      
      if (response.success) {
        setShowEditModal(false);
        // Resetar seleção
        setSelectedSector(null);
        
        // Recarregar lista de setores
        await loadSectors();
        await loadDashboardData();
      } else {
        throw new Error(response.error || 'Erro ao atualizar setor');
      }
    } catch (error) {
      console.error('Erro ao atualizar setor:', error);
      setError('Falha ao atualizar setor. Por favor, tente novamente.');
    } finally {
      setConfirmLoading(false);
    }
  };
  
  const handleDeleteSector = async () => {
    if (!selectedSector) return;
    
    setConfirmLoading(true);
    
    try {
      const userId = multiflowApi.getUserId();
      const response = await multiflowApi.deleteSetor(selectedSector._id, userId, true);
      
      if (response.success) {
        setShowDeleteModal(false);
        setSelectedSector(null);
        await loadSectors();
        await loadDashboardData();
      } else {
        throw new Error(response.error || 'Erro ao excluir setor');
      }
    } catch (error) {
      console.error('Erro ao excluir setor:', error);
      setError('Falha ao excluir setor. Por favor, tente novamente.');
    } finally {
      setConfirmLoading(false);
    }
  };
  
  const handleViewDetails = async (sector) => {
    try {
      const userId = multiflowApi.getUserId();
      const response = await multiflowApi.getSetorById(sector._id, userId, true);
      
      if (response.success) {
        setSelectedSector(response.data);
        
        // Carregar dados do dashboard deste setor se ainda não estiverem carregados
        if (!sectorDashboards[sector._id]) {
          const dashboardResponse = await multiflowApi.getDashboardSetor(sector._id, userId, true);
          if (dashboardResponse.success) {
            setSectorDashboards(prev => ({
              ...prev,
              [sector._id]: dashboardResponse.data
            }));
          }
        }
        
        setActiveSection('detalhes');
      } else {
        throw new Error(response.error || 'Erro ao obter detalhes do setor');
      }
    } catch (error) {
      console.error('Erro ao obter detalhes do setor:', error);
      setError('Falha ao carregar detalhes do setor. Por favor, tente novamente.');
    }
  };
  
  const openEditModal = (sector) => {
    setSelectedSector(sector);
    
    // Prepara os dados para o formulário
    setFormData({
      nome: sector.nome || '',
      descricao: sector.descricao || '',
      responsavel: sector.responsavel || '',
      contexto: sector.contexto || '',
      palavrasChave: sector.palavrasChave || [],
      ativo: sector.ativo === true || sector.ativo === 'true'
    });
    
    setFormErrors({});
    setShowEditModal(true);
  };
  
  const openDeleteModal = (sector) => {
    setSelectedSector(sector);
    setShowDeleteModal(true);
  };
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };
  
  const toggleRowExpanded = (sectorId) => {
    setExpandedRows(prev => ({
      ...prev,
      [sectorId]: !prev[sectorId]
    }));
  };
  
  const filteredSectors = useMemo(() => {
    if (!searchTerm.trim()) return sectors;
    
    const searchLower = searchTerm.toLowerCase();
    return sectors.filter(sector => 
      sector.nome?.toLowerCase().includes(searchLower) ||
      sector.descricao?.toLowerCase().includes(searchLower) ||
      sector.responsavel?.toLowerCase().includes(searchLower)
    );
  }, [sectors, searchTerm]);
  
  // Agregação dos dados de conversas ao longo do tempo
  const aggregatedConversations = useMemo(() => {
    // Se temos dados reais da API, use-os
    if (conversationsOverTime && conversationsOverTime.length > 0) {
      return conversationsOverTime;
    }
    
    // Se não temos dados reais, mas temos dados por setor, agregue-os
    if (sectorConversationsData.length > 0) {
      const daysInRange = 30;
      const result = [];
      
      for (let i = 0; i < daysInRange; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (daysInRange - i - 1));
        const dateStr = date.toISOString().split('T')[0];
        
        // Soma de todas as conversas deste dia
        let totalValue = 0;
        
        sectorConversationsData.forEach(sector => {
          const dayData = sector.data.find(d => d.date === dateStr);
          if (dayData) {
            totalValue += dayData.value;
          }
        });
        
        result.push({
          date: dateStr,
          value: totalValue
        });
      }
      
      return result;
    }
    
    return [];
  }, [conversationsOverTime, sectorConversationsData]);
  
  const topPerformingSectors = useMemo(() => {
    return [...sectorActivityData]
      .sort((a, b) => b.resolutionRate - a.resolutionRate)
      .slice(0, 5);
  }, [sectorActivityData]);
  
  const renderStatusBadge = (status) => {
    if (status === 'active' || status === true || status === 'true') {
      return <Badge className="bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20">Ativo</Badge>;
    }
    return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">Inativo</Badge>;
  };
  
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
    
    // Recarregar dados com o novo período
    loadDashboardData();
  };
  
  const handleSectorSync = async (sectorId) => {
    try {
      setIsLoading(true);
      const userId = multiflowApi.getUserId();
      const response = await multiflowApi.forceSyncSetor(sectorId, userId, true);
      
      if (response.success) {
        await loadSectors();
        await loadDashboardData();
        
        // Recarregar dashboard específico deste setor
        const dashboardResponse = await multiflowApi.getDashboardSetor(sectorId, userId, true);
        if (dashboardResponse.success) {
          setSectorDashboards(prev => ({
            ...prev,
            [sectorId]: dashboardResponse.data
          }));
        }
      } else {
        throw new Error(response.error || 'Erro ao sincronizar setor');
      }
    } catch (error) {
      console.error('Erro ao sincronizar setor:', error);
      setError('Falha ao sincronizar setor. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const statsCards = [
    {
      id: 'total-sectors',
      title: 'Total de Setores',
      value: statsData.totalSectors || 0,
      color: 'bg-[#10b981]/10 border border-[#10b981]/20',
      icon: <Briefcase className="h-6 w-6 text-[#10b981]" />
    },
    {
      id: 'active-sectors',
      title: 'Setores Ativos',
      value: statsData.activeSectors || 0,
      subtitle: `${statsData.totalSectors ? Math.round((statsData.activeSectors / statsData.totalSectors) * 100) : 0}% do total`,
      color: 'bg-blue-500/10 border border-blue-500/20',
      icon: <CheckCircle className="h-6 w-6 text-blue-400" />
    },
    {
      id: 'avg-response',
      title: 'Tempo Médio de Resposta',
      value: `${statsData.avgResponseTime || 0} min`,
      subtitle: 'Média entre setores',
      color: 'bg-orange-500/10 border border-orange-500/20',
      icon: <Clock className="h-6 w-6 text-orange-500" />
    },
    {
      id: 'total-conversations',
      title: 'Total de Conversas',
      value: statsData.totalConversations.toLocaleString('pt-BR') || 0,
      subtitle: 'Todos os setores',
      color: 'bg-purple-500/10 border border-purple-500/20',
      icon: <MessageSquare className="h-6 w-6 text-purple-500" />
    }
  ];

  // Componente para renderizar a tabela de setores com interface responsiva
  const SectorTable = ({ sectors, expanded, onToggle, onView, onEdit, onDelete }) => {
    if (isMobile) {
      return (
        <div className="space-y-3">
          {sectors.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-[#0f1621] rounded-xl border border-[#1f2937]/40 p-4">
              {searchTerm ? 'Nenhum setor encontrado com os critérios de busca' : 'Nenhum setor cadastrado'}
            </div>
          ) : (
            sectors.map((sector) => {
              const activityData = sectorActivityData.find(s => s.id === sector._id);
              const sectorDashboard = sectorDashboards[sector._id];
              
              return (
                <div 
                  key={sector._id} 
                  className="bg-[#0f1621] rounded-xl border border-[#1f2937]/40 overflow-hidden"
                >
                  <div 
                    className="p-3 border-b border-[#1f2937]/40 flex justify-between items-center"
                    onClick={() => onToggle(sector._id)}
                  >
                    <div className="flex items-center space-x-2">
                      {expanded[sector._id] ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <h3 className="font-medium text-white">{sector.nome}</h3>
                    </div>
                    <div>
                      {renderStatusBadge(sector.ativo)}
                    </div>
                  </div>
                  
                  {expanded[sector._id] && (
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-slate-400 text-xs">Responsável</p>
                          <p className="text-white text-sm">{sector.responsavel}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Conversas</p>
                          <p className="text-white text-sm">
                            {activityData ? activityData.totalConversations : 
                             sectorDashboard ? sectorDashboard.conversas?.total || 0 : '-'}
                          </p>
                        </div>
                      </div>
                      
                      {sector.descricao && (
                        <div>
                          <p className="text-slate-400 text-xs">Descrição</p>
                          <p className="text-white text-sm">{sector.descricao}</p>
                        </div>
                      )}
                      
                      <div className="flex justify-between pt-2 border-t border-[#1f2937]/40">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 text-slate-400 hover:text-[#10b981] hover:bg-[#10b981]/10"
                          onClick={() => onView(sector)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                          onClick={() => onEdit(sector)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => onDelete(sector)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      );
    }
    
    // Desktop table view
    return (
      <div className="bg-[#0f1621] rounded-xl shadow-md border border-[#1f2937]/40 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#1f2937]/40 hover:bg-transparent">
                <TableHead className="text-slate-400 w-[300px]">Nome do Setor</TableHead>
                <TableHead className="text-slate-400">Responsável</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Conversas</TableHead>
                <TableHead className="text-slate-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors.length === 0 ? (
                <TableRow className="border-[#1f2937]/40">
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    {searchTerm ? 'Nenhum setor encontrado com os critérios de busca' : 'Nenhum setor cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                sectors.map((sector) => {
                  // Buscar dados de atividade para este setor
                  const activityData = sectorActivityData.find(s => s.id === sector._id);
                  // Buscar dados do dashboard para este setor
                  const sectorDashboard = sectorDashboards[sector._id];
                  
                  return (
                    <React.Fragment key={sector._id}>
                      <TableRow className="border-[#1f2937]/40 hover:bg-[#101820]">
                        <TableCell className="text-white font-medium">
                          <div className="flex items-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 mr-2 text-slate-400 hover:text-white hover:bg-transparent"
                              onClick={() => onToggle(sector._id)}
                            >
                              {expanded[sector._id] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            {sector.nome}
                          </div>
                        </TableCell>
                        <TableCell className="text-white">{sector.responsavel}</TableCell>
                        <TableCell>{renderStatusBadge(sector.ativo)}</TableCell>
                        <TableCell className="text-white">
                          {activityData ? activityData.totalConversations : 
                           sectorDashboard ? sectorDashboard.conversas?.total || 0 : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-[#10b981] hover:bg-[#10b981]/10"
                              onClick={() => onView(sector)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                              onClick={() => onEdit(sector)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => onDelete(sector)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {expanded[sector._id] && (
                        <TableRow className="border-0 bg-[#101820]/50">
                          <TableCell colSpan={5} className="p-0 border-0">
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-4 py-3 border-t border-[#1f2937]/40"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-white font-medium mb-2">Detalhes do Setor</h4>
                                  <p className="text-slate-400 text-sm mb-2">
                                    <span className="text-white font-medium">Descrição:</span>{' '}
                                    {sector.descricao || 'Nenhuma descrição fornecida'}
                                  </p>
                                  
                                  {sector.contexto && (
                                    <p className="text-slate-400 text-sm mb-2">
                                      <span className="text-white font-medium">Contexto:</span>{' '}
                                      {sector.contexto}
                                    </p>
                                  )}
                                  
                                  {sector.palavrasChave && sector.palavrasChave.length > 0 && (
                                    <div className="mb-2">
                                      <span className="text-white font-medium text-sm">Palavras-chave:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {Array.isArray(sector.palavrasChave) ? 
                                          sector.palavrasChave.map((palavra, idx) => (
                                            <Badge key={idx} variant="outline" className="bg-[#101820] border border-[#1f2937]/40 text-slate-300">
                                              {palavra}
                                            </Badge>
                                          )) : 
                                          <span className="text-slate-400 text-sm">Nenhuma palavra-chave</span>
                                        }
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div>
                                  <h4 className="text-white font-medium mb-2">Estatísticas</h4>
                                  {sectorDashboard || activityData ? (
                                    <div className="space-y-2">
                                      <div>
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-slate-400">Taxa de Resolução:</span>
                                          <span className="text-white">
                                            {activityData ? activityData.resolutionRate : 
                                             sectorDashboard && sectorDashboard.conversas?.total ? 
                                             Math.round((sectorDashboard.conversas.finalizadas / sectorDashboard.conversas.total) * 100) : 0}%
                                          </span>
                                        </div>
                                        <Progress 
                                          value={activityData ? activityData.resolutionRate : 
                                                 sectorDashboard && sectorDashboard.conversas?.total ? 
                                                 Math.round((sectorDashboard.conversas.finalizadas / sectorDashboard.conversas.total) * 100) : 0} 
                                          className="h-1.5 bg-slate-700"
                                          style={{
                                            '--progress-background': 
                                              (activityData ? activityData.resolutionRate : 
                                               sectorDashboard && sectorDashboard.conversas?.total ? 
                                               Math.round((sectorDashboard.conversas.finalizadas / sectorDashboard.conversas.total) * 100) : 0) >= 80 
                                                ? '#10b981' 
                                                : (activityData ? activityData.resolutionRate : 
                                                   sectorDashboard && sectorDashboard.conversas?.total ? 
                                                   Math.round((sectorDashboard.conversas.finalizadas / sectorDashboard.conversas.total) * 100) : 0) >= 60 
                                                  ? '#0284c7' 
                                                  : '#f97316'
                                          }}
                                        />
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-[#101820] p-2 rounded-md border border-[#1f2937]/40">
                                          <p className="text-slate-400 text-xs">Tempo de Resposta</p>
                                          <p className="text-white font-medium">
                                            {activityData ? activityData.responseTime : 
                                             sectorDashboard ? sectorDashboard.tempMedioAtendimento || 0 : 0} min
                                          </p>
                                        </div>
                                        
                                        <div className="bg-[#101820] p-2 rounded-md border border-[#1f2937]/40">
                                          <p className="text-slate-400 text-xs">Atendentes</p>
                                          <p className="text-white font-medium">
                                            {activityData ? activityData.agentCount : 
                                             sectorDashboard && sectorDashboard.atendentes ? sectorDashboard.atendentes.length : 0}
                                          </p>
                                        </div>
                                        
                                        <div className="bg-[#101820] p-2 rounded-md border border-[#1f2937]/40">
                                          <p className="text-slate-400 text-xs">Resolvidas</p>
                                          <p className="text-white font-medium">
                                            {activityData ? activityData.resolvedConversations : 
                                             sectorDashboard ? sectorDashboard.conversas?.finalizadas || 0 : 0}
                                          </p>
                                        </div>
                                        
                                        <div className="bg-[#101820] p-2 rounded-md border border-[#1f2937]/40">
                                          <p className="text-slate-400 text-xs">Pendentes</p>
                                          <p className="text-white font-medium">
                                            {activityData ? activityData.pendingConversations : 
                                             sectorDashboard ? 
                                             (sectorDashboard.conversas?.aguardando || 0) + (sectorDashboard.conversas?.emAndamento || 0) : 0}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-slate-400 text-sm">Nenhuma estatística disponível</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="mt-4 flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
                                  onClick={() => handleSectorSync(sector._id)}
                                >
                                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                  Sincronizar Setor
                                </Button>
                              </div>
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-6 bg-[#070b11]"
    >
      {/* Header com título e controles responsivos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#10b981]" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#10b981] to-[#059669]">
              Gerenciamento de Setores
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure e monitore todos os setores de atendimento
          </p>
        </div>
        
        {/* Controles responsivos */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Dropdown Period para dispositivos móveis */}
          <div className="relative w-full sm:w-auto">
            <Select
              value={activePeriod}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger className="w-full sm:w-[140px] bg-[#101820] border-[#1f2937]/40 text-white">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1621] border-[#1f2937]/40 text-white">
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
                <SelectItem value="6m">6 meses</SelectItem>
                <SelectItem value="1y">1 ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Data Range Picker */}
          <div className="w-full sm:w-auto">
            <DateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
          </div>
          
          {/* Botões de ação */}
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <Button
              onClick={() => {
                loadSectors();
                loadDashboardData();
              }}
              variant="outline"
              size="icon"
              className="rounded-lg h-9 w-9 bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#0f1621] hover:text-white transition-colors"
              title="Atualizar dados"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
      </div>

      {/* Tabs responsivas */}
      <Tabs 
        defaultValue="visao-geral" 
        value={activeSection}
        onValueChange={setActiveSection}
        className="w-full mb-6"
      >
        {/* ScrollArea para Tabs em telas pequenas */}
        <ScrollArea className="pb-2" orientation="horizontal">
          <TabsList className="bg-[#101820] border border-[#1f2937]/40 p-1 rounded-lg mb-6 inline-flex w-auto min-w-full md:w-auto">
            <TabsTrigger 
              value="visao-geral" 
              className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981] rounded-md px-4 py-1.5 whitespace-nowrap"
            >
              <BarChart2 className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="lista-setores" 
              className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981] rounded-md px-4 py-1.5 whitespace-nowrap"
            >
              <Layers className="h-4 w-4 mr-2" />
              Lista de Setores
            </TabsTrigger>
            <TabsTrigger 
              value="desempenho" 
              className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981] rounded-md px-4 py-1.5 whitespace-nowrap"
            >
              <PieChart className="h-4 w-4 mr-2" />
              Desempenho
            </TabsTrigger>
            {selectedSector && (
              <TabsTrigger 
                value="detalhes" 
                className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981] rounded-md px-4 py-1.5 whitespace-nowrap"
              >
                <FileText className="h-4 w-4 mr-2" />
                Detalhes do Setor
              </TabsTrigger>
            )}
          </TabsList>
        </ScrollArea>

        {isLoading && activeSection !== 'detalhes' ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981] mb-4"></div>
              <p className="text-slate-400">Carregando dados de setores...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-500/10 p-3 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-white mb-2">Ocorreu um erro ao carregar os dados</p>
              <p className="text-slate-400 mb-4 max-w-md">{error}</p>
              <Button 
                onClick={loadSectors}
                className="bg-[#10b981] hover:bg-[#0d9668] text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : (
          <>
            <TabsContent value="visao-geral" className="mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl text-white font-semibold">Estatísticas de Setores</h2>
                
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#10b981] hover:bg-[#0d9668] text-white">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      {isMobile ? "Novo" : "Novo Setor"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0f1621] border-[#1f2937]/40 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-white">Adicionar Novo Setor</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Preencha os dados para criar um novo setor de atendimento.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome" className="text-white">
                          Nome do Setor <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="nome" 
                          className={`bg-[#101820] border-[#1f2937]/40 text-white focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50 ${formErrors.nome ? 'border-red-500' : ''}`}
                          value={formData.nome}
                          onChange={(e) => setFormData({...formData, nome: e.target.value})}
                          placeholder="Ex: Suporte Técnico"
                        />
                        {formErrors.nome && (
                          <p className="text-xs text-red-500 mt-1">{formErrors.nome}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="responsavel" className="text-white">
                          Responsável <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="responsavel" 
                          className={`bg-[#101820] border-[#1f2937]/40 text-white focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50 ${formErrors.responsavel ? 'border-red-500' : ''}`}
                          value={formData.responsavel}
                          onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                          placeholder="Nome do responsável"
                        />
                        {formErrors.responsavel && (
                          <p className="text-xs text-red-500 mt-1">{formErrors.responsavel}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="descricao" className="text-white">
                          Descrição
                        </Label>
                        <Textarea 
                          id="descricao" 
                          className="bg-[#101820] border-[#1f2937]/40 text-white min-h-[80px] focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
                          value={formData.descricao}
                          onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                          placeholder="Descrição do setor e suas responsabilidades"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="contexto" className="text-white">
                          Contexto do Atendimento
                        </Label>
                        <Textarea 
                          id="contexto" 
                          className="bg-[#101820] border-[#1f2937]/40 text-white min-h-[80px] focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
                          value={formData.contexto}
                          onChange={(e) => setFormData({...formData, contexto: e.target.value})}
                          placeholder="Informações sobre o contexto de atendimento deste setor"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="palavrasChave" className="text-white">
                          Palavras-chave
                        </Label>
                        <Input 
                          id="palavrasChave" 
                          className="bg-[#101820] border-[#1f2937]/40 text-white focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
                          value={Array.isArray(formData.palavrasChave) ? formData.palavrasChave.join(', ') : formData.palavrasChave}
                          onChange={(e) => setFormData({...formData, palavrasChave: e.target.value})}
                          placeholder="Palavras separadas por vírgula"
                        />
                        <p className="text-xs text-slate-400">Separe as palavras-chave por vírgula</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="ativo" className="text-white block mb-2">
                          Status do Setor
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="ativo" 
                            checked={formData.ativo}
                            onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                          />
                          <Label htmlFor="ativo" className="text-white">
                            {formData.ativo ? 'Ativo' : 'Inativo'}
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter className="flex justify-between">
                      <DialogClose asChild>
                        <Button variant="outline" className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white">
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button 
                        onClick={handleAddSector} 
                        className="bg-[#10b981] hover:bg-[#0d9668] text-white"
                        disabled={confirmLoading}
                      >
                        {confirmLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Criar Setor
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* Cards de estatísticas responsivos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                {statsCards.map((card, index) => (
                  <motion.div 
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                    className={`${card.color} rounded-xl p-5 shadow-md transition-all duration-300`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-slate-400 text-sm">{card.title}</h3>
                        <p className="text-white text-2xl font-bold mt-1">{card.value}</p>
                        {card.subtitle && (
                          <p className="text-slate-400 text-xs mt-1">{card.subtitle}</p>
                        )}
                      </div>
                      <div className="p-2 rounded-lg bg-[#101820] border border-[#1f2937]/40">
                        {card.icon}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Gráficos responsivos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-medium flex items-center">
                      <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
                      Conversas por Setor
                    </h3>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                          Volume de conversas por setor
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="h-64 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectorActivityData.slice(0, isMobile ? 5 : 8)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF' }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          // Ajuste para mobile
                          interval={isMobile ? 0 : undefined}
                          fontSize={isMobile ? 10 : undefined}
                        />
                        <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                        <Tooltip
                          formatter={(value) => [`${value} conversas`, 'Quantidade']}
                          contentStyle={{ backgroundColor: 'rgba(15, 22, 33, 0.95)', borderColor: 'rgba(31, 41, 55, 0.4)' }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Bar 
                          dataKey="totalConversations" 
                          name="Conversas" 
                          radius={[4, 4, 0, 0]}
                        >
                          {sectorActivityData.slice(0, isMobile ? 5 : 8).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-medium flex items-center">
                      <LineChart className="h-5 w-5 mr-2 text-[#10b981]" />
                      Volume Total de Conversas
                    </h3>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                          Volume de conversas agregado de todos os setores
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="h-64 md:h-80">
                    {aggregatedConversations.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={aggregatedConversations}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#9CA3AF"
                            tick={{ fill: '#9CA3AF' }}
                            tickFormatter={formatDate}
                            interval={isMobile ? "preserveStartEnd" : "preserveEnd"}
                            tickCount={isMobile ? 5 : undefined}
                          />
                          <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                          <Tooltip
                            formatter={(value) => [`${value} conversas`, 'Total']}
                            labelFormatter={formatDate}
                            contentStyle={{ backgroundColor: 'rgba(15, 22, 33, 0.95)', borderColor: 'rgba(31, 41, 55, 0.4)' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            name="Conversas"
                            stroke="#10b981" 
                            fillOpacity={1}
                            fill="url(#colorTotal)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        Nenhum dado de conversas disponível
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
              >
                <div className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300 lg:col-span-2">
                  <h3 className="text-white font-medium mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-[#10b981]" />
                    Top {isMobile ? "3" : "5"} Setores com Melhor Desempenho
                  </h3>
                  
                  {isMobile ? (
                    // Visualização mobile dos setores com melhor desempenho
                    <div className="space-y-3">
                      {topPerformingSectors.slice(0, 3).length > 0 ? (
                        topPerformingSectors.slice(0, 3).map((sector) => (
                          <div 
                            key={sector.id}
                            className="p-3 bg-[#101820] rounded-lg border border-[#1f2937]/40"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: sector.color }}></div>
                                <h4 className="text-white font-medium text-sm">{sector.name}</h4>
                              </div>
                              <Badge className={sector.resolutionRate >= 80 
                                ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20"
                                : sector.resolutionRate >= 60 
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                              }>
                                {sector.resolutionRate}%
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="text-slate-400">Tempo resp.</span>
                                <p className="text-white">{sector.responseTime} min</p>
                              </div>
                              <div>
                                <span className="text-slate-400">Conversas</span>
                                <p className="text-white">{sector.totalConversations}</p>
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <Progress 
                                value={sector.resolutionRate} 
                                className="h-1.5 bg-slate-700"
                                style={{
                                  '--progress-background': sector.resolutionRate >= 80 
                                    ? '#10b981' 
                                    : sector.resolutionRate >= 60 
                                      ? '#0284c7' 
                                      : '#f97316'
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-400">
                          Nenhum dado de desempenho disponível para os setores
                        </div>
                      )}
                    </div>
                  ) : (
                    // Visualização desktop em tabela
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#1f2937]/40 hover:bg-[#101820]">
                            <TableHead className="text-slate-400">Setor</TableHead>
                            <TableHead className="text-slate-400">Taxa de Resolução</TableHead>
                            <TableHead className="text-slate-400">Tempo de Resposta</TableHead>
                            <TableHead className="text-slate-400">Conversas</TableHead>
                            <TableHead className="text-slate-400">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topPerformingSectors.length > 0 ? (
                            topPerformingSectors.map((sector) => (
                              <TableRow key={sector.id} className="border-[#1f2937]/40 hover:bg-[#101820]">
                                <TableCell className="text-white font-medium">
                                  <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: sector.color }}></div>
                                    {sector.name}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={sector.resolutionRate >= 80 
                                    ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20"
                                    : sector.resolutionRate >= 60 
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                  }>
                                    {sector.resolutionRate}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-white">{sector.responseTime} min</TableCell>
                                <TableCell className="text-white">{sector.totalConversations}</TableCell>
                                <TableCell>{renderStatusBadge(sector.status)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow className="border-[#1f2937]/40">
                              <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                Nenhum dado de desempenho disponível para os setores
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                
                <div className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300">
                  <h3 className="text-white font-medium mb-4 flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-purple-500" />
                    Distribuição de Setores
                  </h3>
                  
                  <div className="h-64">
                    {statsData.totalSectors > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={[
                              { name: 'Ativos', value: statsData.activeSectors },
                              { name: 'Inativos', value: statsData.inactiveSectors }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                          >
                            <Cell key="cell-0" fill="#10b981" />
                            <Cell key="cell-1" fill="#9CA3AF" />
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [`${value} setores`, name]}
                            contentStyle={{ backgroundColor: 'rgba(15, 22, 33, 0.95)', borderColor: 'rgba(31, 41, 55, 0.4)' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        Nenhum setor disponível
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center gap-6">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#10b981] mr-2"></div>
                      <span className="text-sm text-slate-400">Ativos ({statsData.activeSectors})</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#9CA3AF] mr-2"></div>
                      <span className="text-sm text-slate-400">Inativos ({statsData.inactiveSectors})</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
            
            <TabsContent value="lista-setores" className="mt-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="relative flex-grow max-w-xl">
                  <Input
                    placeholder="Pesquisar setores..."
                    className="pl-10 bg-[#101820] border-[#1f2937]/40 text-white focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#10b981] hover:bg-[#0d9668] text-white">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      {isMobile ? "Novo" : "Novo Setor"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0f1621] border-[#1f2937]/40 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-white">Adicionar Novo Setor</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Preencha os dados para criar um novo setor de atendimento.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome-add" className="text-white">
                          Nome do Setor <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="nome-add" 
                          className={`bg-[#101820] border-[#1f2937]/40 text-white focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50 ${formErrors.nome ? 'border-red-500' : ''}`}
                          value={formData.nome}
                          onChange={(e) => setFormData({...formData, nome: e.target.value})}
                          placeholder="Ex: Suporte Técnico"
                        />
                        {formErrors.nome && (
                          <p className="text-xs text-red-500 mt-1">{formErrors.nome}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="responsavel-add" className="text-white">
                          Responsável <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="responsavel-add" 
                          className={`bg-[#101820] border-[#1f2937]/40 text-white focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50 ${formErrors.responsavel ? 'border-red-500' : ''}`}
                          value={formData.responsavel}
                          onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                          placeholder="Nome do responsável"
                        />
                        {formErrors.responsavel && (
                          <p className="text-xs text-red-500 mt-1">{formErrors.responsavel}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="descricao-add" className="text-white">
                          Descrição
                        </Label>
                        <Textarea 
                          id="descricao-add" 
                          className="bg-[#101820] border-[#1f2937]/40 text-white min-h-[80px] focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
                          value={formData.descricao}
                          onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                          placeholder="Descrição do setor e suas responsabilidades"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="contexto-add" className="text-white">
                          Contexto do Atendimento
                        </Label>
                        <Textarea 
                          id="contexto-add" 
                          className="bg-[#101820] border-[#1f2937]/40 text-white min-h-[80px] focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
                          value={formData.contexto}
                          onChange={(e) => setFormData({...formData, contexto: e.target.value})}
                          placeholder="Informações sobre o contexto de atendimento deste setor"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="palavrasChave-add" className="text-white">
                          Palavras-chave
                        </Label>
                        <Input 
                          id="palavrasChave-add" 
                          className="bg-[#101820] border-[#1f2937]/40 text-white focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
                          value={Array.isArray(formData.palavrasChave) ? formData.palavrasChave.join(', ') : formData.palavrasChave}
                          onChange={(e) => setFormData({...formData, palavrasChave: e.target.value})}
                          placeholder="Palavras separadas por vírgula"
                        />
                        <p className="text-xs text-slate-400">Separe as palavras-chave por vírgula</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="ativo-add" className="text-white block mb-2">
                          Status do Setor
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="ativo-add" 
                            checked={formData.ativo}
                            onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                          />
                          <Label htmlFor="ativo-add" className="text-white">
                            {formData.ativo ? 'Ativo' : 'Inativo'}
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
                      <DialogClose asChild>
                        <Button variant="outline" className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white">
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button 
                        onClick={handleAddSector} 
                        className="bg-[#10b981] hover:bg-[#0d9668] text-white"
                        disabled={confirmLoading}
                      >
                        {confirmLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Criar Setor
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* Renderizando a tabela de forma responsiva */}
              <SectorTable 
                sectors={filteredSectors}
                expanded={expandedRows}
                onToggle={toggleRowExpanded}
                onView={handleViewDetails}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
              />
              
              <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="bg-[#0f1621] border-[#1f2937]/40 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">Editar Setor</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Atualize as informações do setor selecionado.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome-edit" className="text-white">
                        Nome do Setor <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="nome-edit" 
                        className={`bg-[#101820] border-[#1f2937]/40 text-white focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50 ${formErrors.nome ? 'border-red-500' : ''}`}
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        placeholder="Ex: Suporte Técnico"
                      />
                      {formErrors.nome && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.nome}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="responsavel-edit" className="text-white">
                        Responsável <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="responsavel-edit" 
                        className={`bg-[#101820] border-[#1f2937]/40 text-white focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50 ${formErrors.responsavel ? 'border-red-500' : ''}`}
                        value={formData.responsavel}
                        onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                        placeholder="Nome do responsável"
                      />
                      {formErrors.responsavel && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.responsavel}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="descricao-edit" className="text-white">
                        Descrição
                      </Label>
                      <Textarea 
                        id="descricao-edit" 
                        className="bg-[#101820] border-[#1f2937]/40 text-white min-h-[80px] focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        placeholder="Descrição do setor e suas responsabilidades"
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="contexto-edit" className="text-white">
                        Contexto do Atendimento
                      </Label>
                      <Textarea 
                        id="contexto-edit" 
                        className="bg-[#101820] border-[#1f2937]/40 text-white min-h-[80px] focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
                        value={formData.contexto}
                        onChange={(e) => setFormData({...formData, contexto: e.target.value})}
                        placeholder="Informações sobre o contexto de atendimento deste setor"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="palavrasChave-edit" className="text-white">
                        Palavras-chave
                      </Label>
                      <Input 
                        id="palavrasChave-edit" 
                        className="bg-[#101820] border-[#1f2937]/40 text-white focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
                        value={Array.isArray(formData.palavrasChave) ? formData.palavrasChave.join(', ') : formData.palavrasChave}
                        onChange={(e) => setFormData({...formData, palavrasChave: e.target.value})}
                        placeholder="Palavras separadas por vírgula"
                      />
                      <p className="text-xs text-slate-400">Separe as palavras-chave por vírgula</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="ativo-edit" className="text-white block mb-2">
                        Status do Setor
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="ativo-edit" 
                          checked={formData.ativo}
                          onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                        />
                        <Label htmlFor="ativo-edit" className="text-white">
                          {formData.ativo ? 'Ativo' : 'Inativo'}
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button 
                      onClick={handleEditSector} 
                      className="bg-[#10b981] hover:bg-[#0d9668] text-white"
                      disabled={confirmLoading}
                    >
                      {confirmLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="bg-[#0f1621] border-[#1f2937]/40 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Tem certeza que deseja excluir o setor "{selectedSector?.nome}"? Esta ação não pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="bg-red-500/10 border border-red-500/30 rounded-md p-4 mt-2">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                      <div>
                        <h4 className="text-white font-medium">Atenção</h4>
                        <p className="text-slate-400 text-sm">
                          A exclusão de um setor removerá todas as configurações associadas e pode afetar conversas existentes.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
                    <DialogClose asChild>
                      <Button variant="outline" className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button 
                      variant="destructive"
                      onClick={handleDeleteSector} 
                      className="bg-red-500 hover:bg-red-600 text-white"
                      disabled={confirmLoading}
                    >
                      {confirmLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Setor
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
            
            <TabsContent value="desempenho" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300 col-span-1 md:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-medium flex items-center">
                      <PieChart className="h-5 w-5 mr-2 text-[#10b981]" />
                      Taxa de Resolução por Setor
                    </h3>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                          Porcentagem de conversas resolvidas por cada setor
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="h-80">
                    {sectorActivityData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={sectorActivityData.slice(0, isMobile ? 5 : undefined)}
                          layout="vertical"
                          margin={{ 
                            top: 5, 
                            right: 30, 
                            left: isMobile ? 120 : 180, 
                            bottom: 5 
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.1)" />
                          <XAxis 
                            type="number" 
                            domain={[0, 100]}
                            stroke="#9CA3AF"
                            tick={{ fill: '#9CA3AF' }}
                          />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            stroke="#9CA3AF"
                            tick={{ fill: '#fff', fontSize: isMobile ? 11 : 14 }}
                            width={isMobile ? 120 : 180}
                          />
                          <Tooltip
                            formatter={(value) => [`${value}%`, 'Taxa de Resolução']}
                            contentStyle={{ backgroundColor: 'rgba(15, 22, 33, 0.95)', borderColor: 'rgba(31, 41, 55, 0.4)' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Bar 
                            dataKey="resolutionRate" 
                            name="Taxa de Resolução" 
                            radius={[0, 4, 4, 0]}
                          >
                            {sectorActivityData.slice(0, isMobile ? 5 : undefined).map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={
                                  entry.resolutionRate >= 80 ? '#10b981' : 
                                  entry.resolutionRate >= 60 ? '#0284c7' : 
                                  '#f97316'
                                } 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        Nenhum dado de desempenho disponível
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-medium flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-orange-500" />
                      Tempo Médio de Resposta
                    </h3>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                          Tempo médio de primeira resposta por setor em minutos
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="h-80">
                    {sectorActivityData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={sectorActivityData.filter((_, idx) => idx < (isMobile ? 5 : 8)).sort((a, b) => a.responseTime - b.responseTime)}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                          <XAxis 
                            dataKey="name" 
                            stroke="#9CA3AF"
                            tick={{ fill: '#9CA3AF' }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                            fontSize={isMobile ? 10 : 12}
                          />
                          <YAxis 
                            stroke="#9CA3AF" 
                            tick={{ fill: '#9CA3AF' }}
                            label={{ value: 'Minutos', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                          />
                          <Tooltip
                            formatter={(value) => [`${value} min`, 'Tempo de Resposta']}
                            contentStyle={{ backgroundColor: 'rgba(15, 22, 33, 0.95)', borderColor: 'rgba(31, 41, 55, 0.4)' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Bar 
                            dataKey="responseTime" 
                            name="Tempo de Resposta" 
                            radius={[4, 4, 0, 0]}
                            fill="#f97316"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        Nenhum dado de tempo médio disponível
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 hover:border-[#1f2937]/60 hover:shadow-lg transition-all duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-medium flex items-center">
                      <ArrowUpRight className="h-5 w-5 mr-2 text-blue-400" />
                      Tendências de Performance
                    </h3>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#101820] border-[#1f2937]/40 text-white">
                          Tendências de performance dos setores vs período anterior
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  
                  <ScrollArea className="h-80 pr-4">
                    {sectorActivityData.length > 0 ? (
                      <div className="space-y-4">
                        {sectorActivityData.map((sector) => (
                          <div 
                            key={sector.id}
                            className="p-3 bg-[#101820] rounded-lg border border-[#1f2937]/40 hover:border-[#1f2937]/60 transition-all duration-200"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: sector.color }}></div>
                                <h4 className="text-white font-medium">{sector.name}</h4>
                              </div>
                              <div className="flex items-center">
                                <span className={`flex items-center text-sm ${sector.trend >= 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
                                  {sector.trend >= 0 ? 
                                    <ArrowUpRight className="h-4 w-4 mr-1" /> : 
                                    <ArrowDownRight className="h-4 w-4 mr-1" />
                                  }
                                  {Math.abs(sector.trend)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div className="flex flex-col">
                                <span className="text-slate-400">Resolução</span>
                                <Badge className={sector.resolutionRate >= 80 
                                  ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20"
                                  : sector.resolutionRate >= 60 
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                }>
                                  {sector.resolutionRate}%
                                </Badge>
                              </div>
                              
                              <div className="flex flex-col">
                                <span className="text-slate-400">Resposta</span>
                                <span className="text-white">{sector.responseTime} min</span>
                              </div>
                              
                              <div className="flex flex-col">
                                <span className="text-slate-400">Conversas</span>
                                <span className="text-white">{sector.totalConversations}</span>
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <Progress 
                                value={sector.resolutionRate} 
                                className="h-1.5 bg-slate-700"
                                style={{
                                  '--progress-background': sector.resolutionRate >= 80 
                                    ? '#10b981' 
                                    : sector.resolutionRate >= 60 
                                      ? '#0284c7' 
                                      : '#f97316'
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        Nenhum dado de tendência disponível
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
            
            {selectedSector && (
              <TabsContent value="detalhes" className="mt-0">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981] mb-4"></div>
                      <p className="text-slate-400">Carregando detalhes do setor...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="p-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20">
                          <Briefcase className="h-6 w-6 text-[#10b981]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl text-white font-semibold">{selectedSector.nome}</h2>
                            {renderStatusBadge(selectedSector.ativo)}
                          </div>
                          <p className="text-slate-400 text-sm">{selectedSector.descricao}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          className="bg-[#101820] border-[#1f2937]/40 text-slate-300 hover:bg-[#101820] hover:text-white"
                          onClick={() => openEditModal(selectedSector)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20"
                          onClick={() => openDeleteModal(selectedSector)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                      <div className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40 lg:col-span-2">
                        <h3 className="text-white font-medium mb-4">Detalhes do Setor</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-slate-400 text-sm mb-1">Responsável</h4>
                                <p className="text-white">{selectedSector.responsavel || 'Não especificado'}</p>
                              </div>
                              
                              <div>
                                <h4 className="text-slate-400 text-sm mb-1">Descrição</h4>
                                <p className="text-white">{selectedSector.descricao || 'Nenhuma descrição fornecida'}</p>
                              </div>
                              
                              {selectedSector.contexto && (
                                <div>
                                  <h4 className="text-slate-400 text-sm mb-1">Contexto de Atendimento</h4>
                                  <p className="text-white">{selectedSector.contexto}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-slate-400 text-sm mb-1">ID do Setor</h4>
                                <div className="overflow-x-auto">
                                  <p className="text-white font-mono text-sm bg-[#101820] p-2 rounded border border-[#1f2937]/40">
                                    {selectedSector._id}
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-slate-400 text-sm mb-1">Status</h4>
                                <div>
                                  {renderStatusBadge(selectedSector.ativo)}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-slate-400 text-sm mb-1">Palavras-chave</h4>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Array.isArray(selectedSector.palavrasChave) && selectedSector.palavrasChave.length > 0 ? 
                                    selectedSector.palavrasChave.map((palavra, idx) => (
                                      <Badge key={idx} variant="outline" className="bg-[#101820] border border-[#1f2937]/40 text-slate-300">
                                        {palavra}
                                      </Badge>
                                    )) : 
                                    <span className="text-slate-400 text-sm">Nenhuma palavra-chave</span>
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-[#0f1621] rounded-xl p-5 shadow-md border border-[#1f2937]/40">
                        <h3 className="text-white font-medium mb-4 flex items-center">
                          <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
                          Desempenho
                        </h3>
                        
                        {sectorDashboards[selectedSector._id] ? (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-slate-400 text-sm mb-1">Volume de Conversas</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                                <div className="bg-[#101820] p-3 rounded-md border border-[#1f2937]/40">
                                  <div className="flex flex-col">
                                    <span className="text-xs text-slate-400">Total</span>
                                    <span className="text-white text-lg font-medium">
                                      {sectorDashboards[selectedSector._id].conversas?.total || 0}
                                    </span>
                                  </div>
                                </div>
                                <div className="bg-[#101820] p-3 rounded-md border border-[#1f2937]/40">
                                  <div className="flex flex-col">
                                    <span className="text-xs text-slate-400">Finalizadas</span>
                                    <span className="text-white text-lg font-medium">
                                      {sectorDashboards[selectedSector._id].conversas?.finalizadas || 0}
                                    </span>
                                  </div>
                                </div>
                                <div className="bg-[#101820] p-3 rounded-md border border-[#1f2937]/40">
                                  <div className="flex flex-col">
                                    <span className="text-xs text-slate-400">Em Atendimento</span>
                                    <span className="text-white text-lg font-medium">
                                      {(sectorDashboards[selectedSector._id].conversas?.aguardando || 0) + 
                                       (sectorDashboards[selectedSector._id].conversas?.emAndamento || 0)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-slate-400 text-sm mb-1">Taxa de Resolução</h4>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-white">
                                  {sectorDashboards[selectedSector._id].conversas?.total ? 
                                    Math.round(
                                      (sectorDashboards[selectedSector._id].conversas.finalizadas / 
                                       sectorDashboards[selectedSector._id].conversas.total) * 100
                                    ) : 0}%
                                </span>
                              </div>
                              <Progress 
                                value={sectorDashboards[selectedSector._id].conversas?.total ? 
                                  Math.round(
                                    (sectorDashboards[selectedSector._id].conversas.finalizadas / 
                                     sectorDashboards[selectedSector._id].conversas.total) * 100
                                  ) : 0} 
                                className="h-2 bg-slate-700"
                                style={{
                                  '--progress-background': 
                                    (sectorDashboards[selectedSector._id].conversas?.total ? 
                                      Math.round(
                                        (sectorDashboards[selectedSector._id].conversas.finalizadas / 
                                         sectorDashboards[selectedSector._id].conversas.total) * 100
                                      ) : 0) >= 80 
                                      ? '#10b981' 
                                      : (sectorDashboards[selectedSector._id].conversas?.total ? 
                                          Math.round(
                                            (sectorDashboards[selectedSector._id].conversas.finalizadas / 
                                             sectorDashboards[selectedSector._id].conversas.total) * 100
                                          ) : 0) >= 60 
                                        ? '#0284c7' 
                                        : '#f97316'
                                }}
                              />
                            </div>
                            
                            <div>
                              <h4 className="text-slate-400 text-sm mb-3">Estatísticas Adicionais</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-white text-sm">Tempo médio de resposta:</span>
                                  <span className="text-white text-sm font-medium">
                                    {sectorDashboards[selectedSector._id].tempMedioAtendimento || 0} min
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white text-sm">Atendentes ativos:</span>
                                  <span className="text-white text-sm font-medium">
                                    {sectorDashboards[selectedSector._id].atendentes?.length || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white text-sm">Tendência:</span>
                                  <span className={`text-sm font-medium flex items-center ${
                                    (sectorDashboards[selectedSector._id].tendencia || 0) >= 0 
                                      ? 'text-[#10b981]' 
                                      : 'text-red-500'
                                  }`}>
                                    {(sectorDashboards[selectedSector._id].tendencia || 0) >= 0 ? (
                                      <ArrowUpRight className="h-4 w-4 mr-1" />
                                    ) : (
                                      <ArrowDownRight className="h-4 w-4 mr-1" />
                                    )}
                                    {Math.abs(sectorDashboards[selectedSector._id].tendencia || 0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="pt-2 mt-4 border-t border-[#1f2937]/40">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full bg-[#101820] border-[#1f2937]/40 hover:bg-[#0f1621] text-slate-300 hover:text-white"
                                onClick={() => handleSectorSync(selectedSector._id)}
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                Sincronizar Dados
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="bg-[#101820] p-3 rounded-full mb-3">
                              <AlertTriangle className="h-6 w-6 text-yellow-500" />
                            </div>
                            <p className="text-slate-400 mb-4">Nenhum dado de desempenho disponível</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-[#101820] border-[#1f2937]/40 hover:bg-[#0f1621] text-slate-300 hover:text-white"
                              onClick={() => handleSectorSync(selectedSector._id)}
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-2" />
                              Sincronizar Dados
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            )}
          </>
        )}
      </Tabs>
    </motion.div>
  );
};

export default AdminSetoresDashboard;