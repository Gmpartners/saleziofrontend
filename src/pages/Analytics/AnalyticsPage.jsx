// src/pages/Analytics/AnalyticsPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Clock, CheckCircle, MessageCircle, Users,
  Calendar, Download, Filter, RefreshCw, ArrowUp, ArrowDown
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';

const COLORS = ['#25D366', '#128C7E', '#075E54', '#34B7F1', '#ECE5DD', '#DCF8C6'];

function AnalyticsPage() {
  const [viewMode, setViewMode] = useState('overview');
  const [timeRange, setTimeRange] = useState('week');
  const [selectedSector, setSelectedSector] = useState('todos');
  
  const {
    summary,
    tempoMedio,
    volumeAtendimentos,
    atendimentosAguardando,
    loading,
    error,
    changePeriodo,
    changeSetor,
    loadAllMetrics
  } = useDashboardMetrics();

  // Atualizar período no hook quando timeRange mudar
  useEffect(() => {
    const periodo = timeRange === 'today' ? 'dia' : 
                    timeRange === 'week' ? 'semana' :
                    timeRange === 'month' ? 'mes' : 'trimestre';
    changePeriodo(periodo);
  }, [timeRange, changePeriodo]);
  
  // Atualizar setor no hook
  useEffect(() => {
    changeSetor(selectedSector);
  }, [selectedSector, changeSetor]);

  // Formatação de números
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Tela de carregamento
  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0c0b14]">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-green-500 rounded-full"></div>
      </div>
    );
  }

  // Tela de erro
  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-800 text-red-300 p-4 rounded-lg m-6">
        <p>{error}</p>
        <button 
          onClick={loadAllMetrics}
          className="mt-2 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 bg-[#0c0b14]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Análise e Relatórios</h1>
          <p className="text-gray-400 mt-1">Métricas e estatísticas de atendimento</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="bg-[#1e1d2b] rounded-lg overflow-hidden flex text-sm">
            <button 
              className={`px-4 py-2 ${viewMode === 'overview' ? 'bg-green-600 text-white' : 'text-gray-400'}`}
              onClick={() => setViewMode('overview')}
            >
              Visão Geral
            </button>
            <button 
              className={`px-4 py-2 ${viewMode === 'performance' ? 'bg-green-600 text-white' : 'text-gray-400'}`}
              onClick={() => setViewMode('performance')}
            >
              Performance
            </button>
            <button 
              className={`px-4 py-2 ${viewMode === 'agents' ? 'bg-green-600 text-white' : 'text-gray-400'}`}
              onClick={() => setViewMode('agents')}
            >
              Atendentes
            </button>
          </div>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-[#1e1d2b] border border-[#32304a] text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Último mês</option>
            <option value="quarter">Último trimestre</option>
          </select>
          
          <button className="flex items-center gap-1 bg-[#1e1d2b] text-gray-300 px-3 py-2 rounded-lg hover:bg-[#32313f] transition-colors text-sm">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="bg-[#1e1d2b] rounded-lg p-4 mb-6 border border-[#32304a]">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <Filter className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-gray-300 text-sm">Filtros:</span>
          </div>
          
          <div>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-[#25243a] border border-[#32304a] text-white rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="todos">Todos os Setores</option>
              <option value="financeiro">Financeiro</option>
              <option value="juridico">Jurídico</option>
              <option value="suporte">Suporte</option>
              <option value="vendas">Vendas</option>
            </select>
          </div>
          
          <button 
            onClick={loadAllMetrics}
            className="flex items-center gap-1 text-green-400 hover:text-green-300 text-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar dados
          </button>
        </div>
      </div>
      
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1e1d2b] rounded-lg p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-400">Total de Atendimentos</div>
            <div className="h-10 w-10 rounded-lg bg-green-600/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-white">{formatNumber(summary?.atendimentosHoje || 0)}</div>
            <div className="flex items-center text-xs px-2 py-1 rounded-lg bg-green-600/20 text-green-400">
              <ArrowUp className="h-3 w-3 mr-1" />
              8.5%
            </div>
          </div>
        </div>
        
        <div className="bg-[#1e1d2b] rounded-lg p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-400">Tempo Médio</div>
            <div className="h-10 w-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-white">
              {summary?.tempoMedioHoje?.tempoMedioMinutos?.toFixed(1) || 0}min
            </div>
            <div className="flex items-center text-xs px-2 py-1 rounded-lg bg-red-600/20 text-red-400">
              <ArrowDown className="h-3 w-3 mr-1" />
              2.3%
            </div>
          </div>
        </div>
        
        <div className="bg-[#1e1d2b] rounded-lg p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-400">Taxa de Resolução</div>
            <div className="h-10 w-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-white">85%</div>
            <div className="flex items-center text-xs px-2 py-1 rounded-lg bg-green-600/20 text-green-400">
              <ArrowUp className="h-3 w-3 mr-1" />
              4.2%
            </div>
          </div>
        </div>
        
        <div className="bg-[#1e1d2b] rounded-lg p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-400">Atendentes Ativos</div>
            <div className="h-10 w-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-white">
              {summary?.atendentesStatus?.find(s => s.status === 'online')?.contagem || 0}
            </div>
            <div className="text-xs text-gray-400">
              de {summary?.atendentesStatus?.reduce((sum, s) => sum + s.contagem, 0) || 0} total
            </div>
          </div>
        </div>
      </div>
      
      {/* Gráficos e visualizações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#1e1d2b] rounded-lg p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-white">Volume de Atendimentos</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={volumeAtendimentos}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="periodo" 
                  stroke="#9CA3AF"
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 29, 43, 0.95)', 
                    borderColor: 'rgba(37, 211, 102, 0.3)',
                    borderRadius: '10px'
                  }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Legend />
                <Bar 
                  name="Atendimentos Finalizados" 
                  dataKey="contagem" 
                  stackId="a" 
                  fill="#25D366" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-[#1e1d2b] rounded-lg p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-white">Tempo Médio de Atendimento</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tempoMedio}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis 
                  dataKey="setor" 
                  type="category" 
                  stroke="#9CA3AF" 
                  width={90}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 29, 43, 0.95)', 
                    borderColor: 'rgba(37, 211, 102, 0.3)',
                    borderRadius: '10px'
                  }}
                  labelStyle={{ color: '#F9FAFB' }}
                  formatter={(value) => [`${value} min`, 'Tempo Médio']}
                />
                <Bar 
                  dataKey="tempoMedioMinutos" 
                  fill="#34B7F1" 
                  radius={[0, 4, 4, 0]}
                  name="Tempo Médio"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Setores aguardando */}
      <div className="bg-[#1e1d2b] rounded-lg shadow-lg overflow-hidden">
        <div className="p-5 border-b border-[#32304a]">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-white">Status de Atendimentos por Setor</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-[#25243a] text-gray-400">
              <tr>
                <th className="px-6 py-3 text-left">Setor</th>
                <th className="px-6 py-3 text-center">Aguardando</th>
                <th className="px-6 py-3 text-center">Em Atendimento</th>
                <th className="px-6 py-3 text-center">Reabertos</th>
                <th className="px-6 py-3 text-center">Total Ativos</th>
                <th className="px-6 py-3 text-center">Finalizados</th>
              </tr>
            </thead>
            <tbody>
  {Array.isArray(atendimentosAguardando) && atendimentosAguardando.length > 0 ? (
    atendimentosAguardando.map((item, index) => (
      <tr 
        key={item.setor || `setor-${index}`}
        className={`border-b border-[#32304a] hover:bg-[#25243a]/70 transition-colors ${
          index % 2 === 0 ? 'bg-[#25243a]/30' : ''
        }`}
      >
        <td className="px-6 py-4 font-medium text-white capitalize">{item.setor || 'Sem setor'}</td>
        <td className="px-6 py-4 text-center">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            {item.aguardando || 0}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {item.emAtendimento || 0}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
            {item.reaberto || 0}
          </span>
        </td>
        <td className="px-6 py-4 text-center font-semibold text-white">{item.total || 0}</td>
        <td className="px-6 py-4 text-center">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            {summary?.atendimentosPorStatus?.find(s => s.status === 'finalizado')?.contagem || 0}
          </span>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
        Não há dados de atendimentos para exibir.
      </td>
    </tr>
  )}
</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;