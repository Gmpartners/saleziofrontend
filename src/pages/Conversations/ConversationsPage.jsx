import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Briefcase, FilterX } from 'lucide-react';

import { useAuthContext } from '../../hooks/useAuthContext';
import { useSocket } from '../../contexts/SocketContext';
import apiService from '../../services/api';
import runAllTests from '../../utils/testRunner';
import ConversationsList from '../../components/conversations/ConversationsList';

const ConversationsPage = () => {
  const { userProfile, isAdmin, userSector, userSectorName } = useAuthContext();
  const { refreshConversations } = useSocket();
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({ success: null, message: 'Verificando conexão...' });
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState('all');
  const [activeFilters, setActiveFilters] = useState({});
  const navigate = useNavigate();
  
  // Testar conexão e carregar dados iniciais
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        // Testar conexão com API e WebSocket
        const testResults = await runAllTests();
        
        if (testResults.allPassed) {
          setConnectionStatus({
            success: true,
            message: 'Conectado à API MultiFlow com sucesso'
          });
        } else {
          setConnectionStatus({
            success: false,
            message: 'Erro de conexão. Alguns recursos podem estar indisponíveis.'
          });
        }
        
        // Carregar setores
        const setoresResponse = await apiService.getSetores();
        if (setoresResponse.success) {
          setSectors(setoresResponse.data || []);
        }
        
        // Se não for admin, filtrar apenas pelo setor do usuário
        const filters = {};
        if (!isAdmin && userSector) {
          filters.setorId = userSector;
          setSelectedSector(userSector);
        }
        
        // Carregar conversas
        await refreshConversations(filters);
        setActiveFilters(filters);
      } catch (error) {
        console.error('Erro ao inicializar página de conversas:', error);
        setConnectionStatus({
          success: false,
          message: 'Erro ao conectar à API. Verifique sua conexão.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userProfile) {
      initialize();
    }
  }, [refreshConversations, isAdmin, userSector, userProfile]);
  
  // Aplicar filtro por setor
  const handleSectorChange = async (sectorId) => {
    setIsLoading(true);
    try {
      const filters = { ...activeFilters };
      
      if (sectorId === 'all') {
        // Remover filtro de setor se "Todos" for selecionado
        delete filters.setorId;
      } else {
        // Adicionar filtro por setor
        filters.setorId = sectorId;
      }
      
      await refreshConversations(filters);
      setSelectedSector(sectorId);
      setActiveFilters(filters);
    } catch (error) {
      console.error('Erro ao filtrar por setor:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Limpar todos os filtros
  const handleClearFilters = async () => {
    setIsLoading(true);
    try {
      // Para não-admin, manter filtro de setor
      const filters = !isAdmin && userSector ? { setorId: userSector } : {};
      
      await refreshConversations(filters);
      setSelectedSector(!isAdmin && userSector ? userSector : 'all');
      setActiveFilters(filters);
    } catch (error) {
      console.error('Erro ao limpar filtros:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="h-screen flex flex-col p-4 lg:p-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Conversas</h1>
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              connectionStatus.success === true ? 'bg-green-500' : 
              connectionStatus.success === false ? 'bg-red-500' : 'bg-amber-500'
            }`}
          />
          <p className="text-gray-400 text-sm">{connectionStatus.message}</p>
          
          {/* Informação de setor para não-admin */}
          {!isAdmin && userSector && (
            <div className="ml-0 md:ml-auto">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Briefcase className="mr-1 h-3 w-3" />
                Setor: {userSectorName}
              </span>
            </div>
          )}
          
          {/* Indicador de modo admin */}
          {isAdmin && (
            <div className="ml-0 md:ml-auto">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Modo Administrador
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Filtros (apenas para admin) */}
      {isAdmin && (
        <div className="bg-[#1e1d2b] rounded-lg p-3 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <label className="block text-gray-400 text-sm mb-1">Filtrar por Setor</label>
              <select
                value={selectedSector}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="w-full bg-[#25243a] border border-[#32304a] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Todos os Setores</option>
                {sectors.map(sector => (
                  <option key={sector._id} value={sector._id}>
                    {sector.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="self-end">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 bg-[#25243a] hover:bg-[#32304a] text-gray-300 px-3 py-2 rounded-lg transition-colors"
              >
                <FilterX className="h-4 w-4" />
                <span>Limpar Filtros</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Conteúdo */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Lista de conversas */}
        <div className="lg:col-span-1 h-full flex flex-col overflow-hidden bg-[#1e1d2b] rounded-lg p-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
              <p className="text-gray-400 mt-3">Carregando conversas...</p>
            </div>
          ) : (
            <ConversationsList userSector={!isAdmin ? userSector : null} isAdmin={isAdmin} />
          )}
        </div>
        
        {/* Área de mensagens (visível apenas em desktop) */}
        <div className="hidden lg:flex lg:col-span-2 rounded-lg">
          <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-[#1e1d2b] rounded-lg">
            <MessageCircle className="h-16 w-16 text-gray-500 mb-4" />
            <h3 className="text-xl text-white font-medium mb-2">Selecione uma conversa</h3>
            <p className="text-gray-400 max-w-md">
              Escolha uma conversa na lista à esquerda para visualizar as mensagens e interagir com o cliente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationsPage;