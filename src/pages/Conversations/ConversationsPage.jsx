import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Filter, RefreshCw, MessageCircle, Search, Plus, ChevronLeft, ChevronRight, AlertCircle, MessageCircleMore } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuthContext } from '../../hooks/useAuthContext'; // Usando o hook original
import apiService from '../../services/api';

function ConversationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, isAdmin } = useAuthContext(); // Usando o hook original
  const { conversations, refreshConversations } = useSocket();
  
  const [filterVisible, setFilterVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [setorFilter, setSetorFilter] = useState(isAdmin ? 'todos' : userProfile?.setor || '');
  const [setores, setSetores] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredConversations, setFilteredConversations] = useState([]);

  // Carregar lista de setores
  useEffect(() => {
    const fetchSetores = async () => {
      try {
        const response = await apiService.getSectors();
        setSetores(response || []);
      } catch (err) {
        console.error('Erro ao carregar setores:', err);
        // Definir dados de exemplo em caso de falha
        setSetores([
          { _id: 'suporte', nome: 'Suporte' },
          { _id: 'vendas', nome: 'Vendas' },
          { _id: 'financeiro', nome: 'Financeiro' },
          { _id: 'administrativo', nome: 'Administrativo' }
        ]);
      }
    };

    fetchSetores();
  }, []);

  // Aplicar filtros da navegação, se existirem
  useEffect(() => {
    if (location.state?.filtroSetor) {
      setSetorFilter(location.state.filtroSetor);
    }
  }, [location.state]);

  // Carregar conversas quando a página for aberta
  useEffect(() => {
    loadConversations();
  }, [currentPage, statusFilter, setorFilter]);

  // Filtrar conversações quando o estado global mudar
  useEffect(() => {
    if (conversations) {
      applyFilters();
    }
  }, [conversations, statusFilter, setorFilter]);

  // Função para carregar conversas
  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters = {};
      if (statusFilter !== 'todos') filters.status = statusFilter;
      if (setorFilter !== 'todos') filters.setor = setorFilter;
      
      // Parâmetros de paginação
      filters.page = currentPage;
      filters.limit = 10;
      
      // Carregar via Socket
      refreshConversations(filters);
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
      setError('Falha ao carregar conversas. Por favor tente novamente.');
      setLoading(false);
    }
  };

  // Função para aplicar filtros localmente
  const applyFilters = () => {
    if (!conversations) return;
    
    let filtered = [...conversations];
    
    // Aplicar filtros
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(conv => conv.status === statusFilter);
    }
    
    if (setorFilter !== 'todos') {
      filtered = filtered.filter(conv => conv.setor === setorFilter);
    }
    
    setFilteredConversations(filtered);
  };

  // Aplicar filtros e recarregar
  const handleApplyFilters = () => {
    setCurrentPage(1); // Voltar para a primeira página ao filtrar
    setFilterVisible(false);
    loadConversations();
  };

  // Resetar filtros
  const resetFilters = () => {
    setStatusFilter('todos');
    setSetorFilter(isAdmin ? 'todos' : userProfile?.setor || '');
    setFilterVisible(false);
    setCurrentPage(1);
    loadConversations();
  };

  // Navegação para conversa específica
  const handleConversationClick = (conversation) => {
    try {
      navigate(`/conversations/${conversation._id}`);
    } catch (error) {
      console.error('Erro ao navegar para conversa:', error);
      window.alert('Erro ao abrir conversa. Tente novamente mais tarde.');
    }
  };

  // Paginação
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Função auxiliar para formatação de data relativa
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

  // Renderizar status com estilo apropriado
  const renderStatus = (status) => {
    const statusMap = {
      'aguardando': { text: 'Aguardando', class: 'bg-red-600/20 text-red-400 border border-red-500/30' },
      'em_atendimento': { text: 'Em Atendimento', class: 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30' },
      'finalizado': { text: 'Finalizado', class: 'bg-green-600/20 text-green-400 border border-green-500/30' },
      'reaberto': { text: 'Reaberto', class: 'bg-purple-600/20 text-purple-400 border border-purple-500/30' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'bg-gray-600/20 text-gray-400 border border-gray-500/30' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  // Componente para renderizar estado vazio ou de erro
  const renderEmptyState = () => {
    if (loading) return null;
    
    if (error && filteredConversations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center bg-[#1e1d2b] rounded-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-xl font-medium text-red-300 mb-2">Erro ao carregar conversas</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadConversations}
            className="flex items-center px-4 py-2 bg-[#25243a] text-white rounded-lg hover:bg-[#32313f]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </button>
        </div>
      );
    }
    
    if (filteredConversations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center bg-[#1e1d2b] rounded-lg p-8 text-center">
          <MessageCircleMore className="h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-xl font-medium text-gray-300 mb-2">Nenhuma conversa encontrada</h3>
          <p className="text-gray-400">Tente ajustar os filtros ou aguarde novas mensagens</p>
        </div>
      );
    }
    
    return null;
  };

  // Renderizar paginação
  const renderPagination = () => {
    // Se não houver páginas ou estiver carregando, não mostrar paginação
    if (totalPages <= 1 || loading) return null;
    
    // Limitar número de botões a exibir
    const maxButtonsToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtonsToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxButtonsToShow - 1);
    
    // Ajustar startPage se endPage estiver no limite
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxButtonsToShow + 1);
    }
    
    // Criar array de páginas a exibir
    const pageNumbers = Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
    
    return (
      <div className="mt-6 flex justify-center">
        <div className="flex items-center space-x-2">
          <button 
            onClick={handlePrevPage}
            disabled={currentPage === 1 || loading}
            className={`inline-flex items-center justify-center px-3 py-2 rounded-md
            ${currentPage === 1 || loading
              ? 'bg-[#1e1d2b] text-gray-500 cursor-not-allowed' 
              : 'bg-[#1e1d2b] text-gray-300 hover:bg-[#2c2b42] transition-colors border border-[#32304a]'
            }`}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </button>
          
          {/* Botões de página */}
          {pageNumbers.map((pageNumber) => (
            <button 
              key={pageNumber}
              onClick={() => setCurrentPage(pageNumber)}
              disabled={loading}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-md
              ${currentPage === pageNumber
                ? 'bg-green-600 text-white border border-green-600'
                : 'bg-[#1e1d2b] text-gray-300 hover:bg-[#2c2b42] transition-colors border border-[#32304a]'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {pageNumber}
            </button>
          ))}
          
          <button 
            onClick={handleNextPage}
            disabled={currentPage === totalPages || loading}
            className={`inline-flex items-center justify-center px-3 py-2 rounded-md
            ${currentPage === totalPages || loading
              ? 'bg-[#1e1d2b] text-gray-500 cursor-not-allowed' 
              : 'bg-[#1e1d2b] text-gray-300 hover:bg-[#2c2b42] transition-colors border border-[#32304a]'
            }`}
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Conversas</h1>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setFilterVisible(!filterVisible)}
            className="flex items-center px-3 py-2 bg-[#1e1d2b] text-gray-300 rounded-lg hover:bg-[#32313f]"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span>Filtros</span>
          </button>
          
          <button
            onClick={loadConversations}
            className="flex items-center px-3 py-2 bg-[#1e1d2b] text-gray-300 rounded-lg hover:bg-[#32313f]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span>Atualizar</span>
          </button>
          
          <button
            onClick={() => navigate('/conversations/new')}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>Nova Conversa</span>
          </button>
        </div>
      </div>
      
      {/* Painel de filtros */}
      {filterVisible && (
        <div className="bg-[#1e1d2b] rounded-lg p-4 mb-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#25243a] text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="todos">Todos</option>
                <option value="aguardando">Aguardando</option>
                <option value="em_atendimento">Em Atendimento</option>
                <option value="finalizado">Finalizado</option>
                <option value="reaberto">Reaberto</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Setor
              </label>
              <select
                value={setorFilter}
                onChange={(e) => setSetorFilter(e.target.value)}
                className="w-full bg-[#25243a] text-white border border-gray-700 rounded-lg px-3 py-2"
                disabled={!isAdmin}
              >
                <option value="todos">Todos</option>
                {setores.map(setor => (
                  <option key={setor._id} value={setor.nome}>{setor.nome}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Aplicar
              </button>
              
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mensagem de carregamento */}
      {loading && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-green-500 rounded-full"></div>
        </div>
      )}
      
      {/* Estado vazio ou de erro */}
      {renderEmptyState()}
      
      {/* Lista de conversas */}
      {!loading && filteredConversations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation._id}
              className="bg-[#1e1d2b] rounded-lg p-4 shadow-lg cursor-pointer hover:bg-[#2a2937] transition-colors"
              onClick={() => handleConversationClick(conversation)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-white font-semibold truncate">
                  {conversation.cliente?.nome || "Cliente"}
                </h3>
                {renderStatus(conversation.status)}
              </div>
              
              <p className="text-sm text-gray-400 mb-4 truncate">
                {conversation.cliente?.telefone || "Sem telefone"}
              </p>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center">
                  <span className="capitalize bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                    {conversation.setor}
                  </span>
                </div>
                
                <div>
                  {conversation.ultimaMensagemEm && (
                    <span>
                      {timeAgo(conversation.ultimaMensagemEm)}
                    </span>
                  )}
                </div>
              </div>
              
              {conversation.mensagensNaoLidas > 0 && (
                <div className="mt-3 flex justify-end">
                  <span className="bg-green-600 text-white text-xs font-bold rounded-full px-2 py-1 min-w-[20px] text-center">
                    {conversation.mensagensNaoLidas}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Paginação */}
      {renderPagination()}
    </div>
  );
}

export default ConversationsPage;