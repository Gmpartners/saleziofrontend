import React, { useState, useEffect } from 'react';
import { Search, Loader2, User, MessageSquare } from 'lucide-react';
import ConversationItem from './ConversationItem';
import { useSocket } from '../../contexts/SocketContext';
import { useAuthContext } from '../../hooks/useAuthContext';

const ConversationsList = ({ 
  onSelectConversation, 
  selectedConversationId,
  showSectorFilter = false
}) => {
  const { conversations, refreshConversations, completedConversations, refreshCompletedConversations, isLoading } = useSocket();
  const { userProfile } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('em_andamento'); // 'em_andamento', 'aguardando', 'finalizada'
  const [selectedSector, setSelectedSector] = useState('all');
  const [availableSectors, setAvailableSectors] = useState([]);
  
  // Extrair setores disponíveis das conversas
  useEffect(() => {
    if (conversations.length > 0) {
      const sectors = new Set();
      
      // Adicionar setores das conversas ativas
      conversations.forEach(conv => {
        if (conv.setorId?.nome) {
          sectors.add(conv.setorId.nome);
        }
      });
      
      // Adicionar setores das conversas concluídas
      completedConversations.forEach(conv => {
        if (conv.setorId?.nome) {
          sectors.add(conv.setorId.nome);
        }
      });
      
      setAvailableSectors(Array.from(sectors).sort());
    }
  }, [conversations, completedConversations]);

  // Buscar conversas concluídas ao mudar para a aba correspondente
  useEffect(() => {
    if (activeTab === 'finalizada' && completedConversations.length === 0) {
      refreshCompletedConversations();
    }
  }, [activeTab, completedConversations.length, refreshCompletedConversations]);

  // Filtrar conversas com base na pesquisa, setor e status
  const getFilteredConversations = () => {
    const allConversations = activeTab === 'finalizada' ? completedConversations : conversations;
    
    return allConversations.filter(conv => {
      // Filtrar por termo de pesquisa
      const matchesSearch = 
        !searchTerm || 
        conv.nomeCliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.telefoneCliente?.includes(searchTerm) ||
        conv.ultimaMensagem?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtrar por setor
      const matchesSector = 
        selectedSector === 'all' || 
        conv.setorId?.nome === selectedSector;
      
      // Filtrar por status
      const matchesStatus = activeTab === 'finalizada' 
        ? conv.status?.toLowerCase() === 'finalizada'
        : activeTab === 'aguardando'
          ? conv.status?.toLowerCase() === 'aguardando'
          : conv.status?.toLowerCase() === 'em_andamento';
      
      return matchesSearch && matchesSector && matchesStatus;
    });
  };

  // Conversas filtradas
  const filteredConversations = getFilteredConversations();

  // Manipulador de atualização manual
  const handleRefresh = async () => {
    if (isLoading) return;
    
    if (activeTab === 'finalizada') {
      await refreshCompletedConversations();
    } else {
      await refreshConversations({
        status: activeTab === 'aguardando' ? ['aguardando'] : ['em_andamento']
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0f16]">
      {/* Cabeçalho */}
      <div className="p-4 bg-[#0f1621] border-b border-[#1f2937]/40 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#10b981]" />
          Conversas
        </h2>
        <span className="text-xs text-gray-400">
          {filteredConversations.length} {activeTab === 'finalizada' ? 'finalizadas' : activeTab === 'aguardando' ? 'aguardando' : 'em andamento'}
        </span>
      </div>

      {/* Barra de pesquisa */}
      <div className="px-3 py-3 border-b border-[#1f2937]/40">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a2435] border border-[#1f2937]/60 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10b981]/30"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1f2937]/40">
        <button
          onClick={() => setActiveTab('em_andamento')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'em_andamento'
              ? 'text-[#10b981] border-[#10b981]'
              : 'text-gray-400 border-transparent hover:text-gray-300'
          }`}
        >
          Em Andamento
        </button>
        <button
          onClick={() => setActiveTab('aguardando')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'aguardando'
              ? 'text-[#10b981] border-[#10b981]'
              : 'text-gray-400 border-transparent hover:text-gray-300'
          }`}
        >
          Aguardando
        </button>
        <button
          onClick={() => setActiveTab('finalizada')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'finalizada'
              ? 'text-[#10b981] border-[#10b981]'
              : 'text-gray-400 border-transparent hover:text-gray-300'
          }`}
        >
          Finalizadas
        </button>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-16 text-gray-400 text-sm py-8">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            <span>Carregando conversas...</span>
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="divide-y divide-[#1f2937]/40">
            {filteredConversations.map(conversation => (
              <ConversationItem
                key={conversation._id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation._id}
                onClick={() => onSelectConversation(conversation._id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm py-8">
            <User className="h-12 w-12 mb-3 text-gray-600" />
            <p>Nenhuma conversa {activeTab === 'finalizada' ? 'finalizada' : activeTab === 'aguardando' ? 'aguardando' : 'em andamento'}.</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 text-xs bg-[#1a2435] hover:bg-[#212d42] text-gray-300 rounded-md flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Atualizar conversas
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsList;