import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, MessageSquare, Clock, Activity, BarChart2 } from 'lucide-react';
import apiService from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSectors: 0,
    activeChats: 0,
    pendingChats: 0,
    completedChats: 0,
    avgResponseTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        // Carregar dados de setores
        const setoresResponse = await apiService.getSetores();
        const setores = setoresResponse.success ? setoresResponse.data : [];
        
        // Carregar dados de conversas
        const conversasAguardando = await apiService.getConversas({ status: 'aguardando' });
        const conversasAndamento = await apiService.getConversas({ status: 'em_andamento' });
        const conversasFinalizadas = await apiService.getConversas({ status: 'finalizada' });
        
        // Estimar número de usuários (não temos endpoint direto)
        // Em uma implementação real, isso viria do Firebase
        const estimatedUsers = 5;
        
        // Calcular estatísticas
        setStats({
          totalUsers: estimatedUsers,
          totalSectors: setores.length,
          activeChats: conversasAndamento.success ? conversasAndamento.data.length : 0,
          pendingChats: conversasAguardando.success ? conversasAguardando.data.length : 0,
          completedChats: conversasFinalizadas.success ? conversasFinalizadas.data.length : 0,
          avgResponseTime: 8 // valor fictício em minutos
        });
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);
  
  // Cards de estatísticas para o dashboard
  const statCards = [
    {
      title: 'Usuários',
      value: stats.totalUsers,
      icon: <Users className="h-6 w-6 text-blue-500" />,
      color: 'bg-blue-500/10 border border-blue-500/20',
      onClick: () => navigate('/admin/users')
    },
    {
      title: 'Setores',
      value: stats.totalSectors,
      icon: <Briefcase className="h-6 w-6 text-purple-500" />,
      color: 'bg-purple-500/10 border border-purple-500/20',
      onClick: () => navigate('/admin/sectors')
    },
    {
      title: 'Conversas Ativas',
      value: stats.activeChats,
      icon: <MessageSquare className="h-6 w-6 text-green-500" />,
      color: 'bg-green-500/10 border border-green-500/20',
      onClick: () => navigate('/conversations?status=em_andamento')
    },
    {
      title: 'Aguardando',
      value: stats.pendingChats,
      icon: <Clock className="h-6 w-6 text-amber-500" />,
      color: 'bg-amber-500/10 border border-amber-500/20',
      onClick: () => navigate('/conversations?status=aguardando')
    },
    {
      title: 'Finalizadas',
      value: stats.completedChats,
      icon: <Activity className="h-6 w-6 text-indigo-500" />,
      color: 'bg-indigo-500/10 border border-indigo-500/20',
      onClick: () => navigate('/conversations?status=finalizada')
    },
    {
      title: 'Estatísticas',
      value: stats.avgResponseTime + ' min',
      subtitle: 'Tempo médio',
      icon: <BarChart2 className="h-6 w-6 text-cyan-500" />,
      color: 'bg-cyan-500/10 border border-cyan-500/20',
      onClick: () => navigate('/admin/analytics')
    }
  ];
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Painel Administrativo</h1>
        <div className="bg-[#1e1d2b] py-1.5 px-3 rounded-lg">
          <span className="text-green-500 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            <span>Admin Mode</span>
          </span>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {statCards.map((card, index) => (
            <div 
              key={index}
              className={`${card.color} rounded-xl p-6 cursor-pointer hover:scale-[1.02] transition-all shadow-sm`}
              onClick={card.onClick}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{card.title}</p>
                  <h3 className="text-white text-3xl font-bold">{card.value}</h3>
                  {card.subtitle && (
                    <p className="text-gray-400 text-xs mt-1">{card.subtitle}</p>
                  )}
                </div>
                <div className="p-3 rounded-full bg-[#1e1d2b]">
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/admin/users')}
            className="bg-[#1e1d2b] hover:bg-[#25243a] text-white rounded-lg p-4 flex items-center gap-3 transition-colors"
          >
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Gerenciar Usuários</h3>
              <p className="text-sm text-gray-400">Adicionar e editar permissões</p>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/admin/sectors')}
            className="bg-[#1e1d2b] hover:bg-[#25243a] text-white rounded-lg p-4 flex items-center gap-3 transition-colors"
          >
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Briefcase className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Gerenciar Setores</h3>
              <p className="text-sm text-gray-400">Configurar setores da empresa</p>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/conversations')}
            className="bg-[#1e1d2b] hover:bg-[#25243a] text-white rounded-lg p-4 flex items-center gap-3 transition-colors"
          >
            <div className="p-3 bg-green-500/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Ver Conversas</h3>
              <p className="text-sm text-gray-400">Monitorar todos os atendimentos</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;