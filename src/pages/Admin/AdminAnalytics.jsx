import React, { useState, useEffect } from 'react';
import { 
  BarChart2, PieChart, TrendingUp, Clock, CheckCircle, 
  Calendar, ChevronDown, RefreshCw, Download
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import apiService from '../../services/api';

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    byStatus: [],
    bySector: [],
    byTimeOfDay: [],
    byDay: [],
    responseTime: []
  });
  
  // Cores para os gráficos
  const COLORS = ['#25D366', '#128C7E', '#075E54', '#34B7F1', '#4267B2', '#8A2BE2'];
  
  // Carregar dados na montagem
  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);
  
  // Função para carregar dados de analytics
  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Em uma implementação real, você buscaria dados da API
      // Aqui, vamos gerar dados fictícios para demonstração
      
      // Dados por status
      const byStatus = [
        { name: 'Aguardando', value: Math.floor(Math.random() * 50) + 10 },
        { name: 'Em Andamento', value: Math.floor(Math.random() * 100) + 20 },
        { name: 'Finalizadas', value: Math.floor(Math.random() * 200) + 50 }
      ];
      
      // Dados por setor
      const setoresResponse = await apiService.getSetores();
      const setores = setoresResponse.success ? setoresResponse.data : [];
      
      const bySector = setores.map(setor => ({
        name: setor.nome,
        value: Math.floor(Math.random() * 100) + 10
      }));
      
      // Dados por hora do dia
      const byTimeOfDay = Array.from({ length: 24 }).map((_, hour) => ({
        hour: `${hour}:00`,
        mensagens: Math.floor(Math.random() * 50) + 1
      }));
      
      // Dados por dia da semana
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const byDay = days.map(day => ({
        name: day,
        mensagens: Math.floor(Math.random() * 150) + 30,
        atendimentos: Math.floor(Math.random() * 50) + 10
      }));
      
      // Tempo de resposta ao longo do período
      const responseTime = [];
      const daysInPeriod = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      
      for (let i = 0; i < daysInPeriod; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (daysInPeriod - i - 1));
        
        responseTime.push({
          date: date.toISOString().split('T')[0],
          tempo: Math.floor(Math.random() * 15) + 2
        });
      }
      
      setData({
        byStatus,
        bySector,
        byTimeOfDay,
        byDay,
        responseTime
      });
    } catch (error) {
      console.error('Erro ao carregar dados de analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filtro de período
  const TimeRangeSelector = () => (
    <div className="relative">
      <div className="flex items-center gap-2 bg-[#1e1d2b] border border-[#32304a] rounded-lg py-2 px-3 cursor-pointer">
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="text-gray-300">
          {timeRange === 'week' ? 'Última Semana' : 
           timeRange === 'month' ? 'Último Mês' : 
           'Último Trimestre'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </div>
      <div className="absolute top-full left-0 mt-1 w-full bg-[#1e1d2b] border border-[#32304a] rounded-lg shadow-lg z-10 overflow-hidden hidden group-hover:block">
        <button 
          onClick={() => setTimeRange('week')}
          className={`w-full text-left py-2 px-3 ${timeRange === 'week' ? 'bg-green-600/20 text-green-400' : 'hover:bg-[#25243a] text-gray-300'}`}
        >
          Última Semana
        </button>
        <button 
          onClick={() => setTimeRange('month')}
          className={`w-full text-left py-2 px-3 ${timeRange === 'month' ? 'bg-green-600/20 text-green-400' : 'hover:bg-[#25243a] text-gray-300'}`}
        >
          Último Mês
        </button>
        <button 
          onClick={() => setTimeRange('quarter')}
          className={`w-full text-left py-2 px-3 ${timeRange === 'quarter' ? 'bg-green-600/20 text-green-400' : 'hover:bg-[#25243a] text-gray-300'}`}
        >
          Último Trimestre
        </button>
      </div>
    </div>
  );
  
  // Formatar data para exibição no gráfico
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };
  
  // Estatísticas principais para exibição
  const statsCards = [
    {
      title: 'Total de Conversas',
      value: data.byStatus.reduce((sum, item) => sum + item.value, 0),
      color: 'bg-green-500/10 border border-green-500/20',
      icon: <BarChart2 className="h-5 w-5 text-green-500" />
    },
    {
      title: 'Tempo Médio de Resposta',
      value: data.responseTime.length > 0 
        ? Math.round(data.responseTime.reduce((sum, item) => sum + item.tempo, 0) / data.responseTime.length) + ' min'
        : '0 min',
      color: 'bg-amber-500/10 border border-amber-500/20',
      icon: <Clock className="h-5 w-5 text-amber-500" />
    },
    {
      title: 'Taxa de Resolução',
      value: data.byStatus.length > 0 
        ? Math.round((data.byStatus.find(i => i.name === 'Finalizadas')?.value || 0) / 
                     data.byStatus.reduce((sum, item) => sum + item.value, 0) * 100) + '%'
        : '0%',
      color: 'bg-blue-500/10 border border-blue-500/20',
      icon: <CheckCircle className="h-5 w-5 text-blue-500" />
    },
    {
      title: 'Crescimento',
      value: '+24%',
      subtitle: 'vs período anterior',
      color: 'bg-purple-500/10 border border-purple-500/20',
      icon: <TrendingUp className="h-5 w-5 text-purple-500" />
    }
  ];
  
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Análise de Dados</h1>
        
        <div className="flex items-center gap-3">
          {/* Seletor de período */}
          <div className="group relative">
            <TimeRangeSelector />
          </div>
          
          {/* Botão de atualizar */}
          <button
            onClick={loadAnalyticsData}
            className="flex items-center gap-2 bg-[#1e1d2b] hover:bg-[#25243a] border border-[#32304a] rounded-lg py-2 px-3 text-gray-300 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden md:inline">Atualizar</span>
          </button>
          
          {/* Botão de exportar */}
          <button
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 rounded-lg py-2 px-3 text-white transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Exportar</span>
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {statsCards.map((card, index) => (
              <div key={index} className={`${card.color} rounded-xl p-5`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-gray-400 text-sm">{card.title}</h3>
                    <p className="text-white text-2xl font-bold mt-1">{card.value}</p>
                    {card.subtitle && (
                      <p className="text-gray-400 text-xs mt-1">{card.subtitle}</p>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-[#1e1d2b]">
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Conversas por Status */}
            <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-md">
              <h3 className="text-white font-medium mb-4">Conversas por Status</h3>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} conversas`, 'Quantidade']}
                      contentStyle={{ backgroundColor: 'rgba(30, 29, 43, 0.95)', borderColor: 'rgba(50, 48, 74, 0.3)' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Conversas por Setor */}
            <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-md">
              <h3 className="text-white font-medium mb-4">Distribuição por Setor</h3>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.bySector}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                    />
                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                    <Tooltip
                      formatter={(value) => [`${value} conversas`, 'Quantidade']}
                      contentStyle={{ backgroundColor: 'rgba(30, 29, 43, 0.95)', borderColor: 'rgba(50, 48, 74, 0.3)' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" name="Conversas" fill="#25D366" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Tempo de Resposta */}
            <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-md">
              <h3 className="text-white font-medium mb-4">Tempo Médio de Resposta</h3>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.responseTime}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF" 
                      tick={{ fill: '#9CA3AF' }}
                      tickFormatter={formatDate}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      tick={{ fill: '#9CA3AF' }}
                      label={{ value: 'Minutos', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} minutos`, 'Tempo Médio']}
                      labelFormatter={formatDate}
                      contentStyle={{ backgroundColor: 'rgba(30, 29, 43, 0.95)', borderColor: 'rgba(50, 48, 74, 0.3)' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tempo" 
                      name="Tempo de Resposta"
                      stroke="#34B7F1" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Volume por Dia da Semana */}
            <div className="bg-[#1e1d2b] rounded-xl p-5 shadow-md">
              <h3 className="text-white font-medium mb-4">Volume por Dia da Semana</h3>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                    />
                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(30, 29, 43, 0.95)', borderColor: 'rgba(50, 48, 74, 0.3)' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="mensagens" name="Mensagens" fill="#25D366" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atendimentos" name="Atendimentos" fill="#34B7F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalytics;