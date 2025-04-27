// pages/Conversations/ConversationDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { useSocket } from '../../contexts/SocketContext';
import { API_ENDPOINTS } from '../../config/syncConfig';
import ConversationDetailComponent from '../../components/conversations/ConversationDetail';

const ConversationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    selectedConversation, 
    selectConversation, 
    sendMessage, 
    finishConversation,
    archiveConversation,
    transferConversation,
    api 
  } = useSocket();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedSector, setSelectedSector] = useState('');
  
  // Carregar detalhes da conversa
  useEffect(() => {
    const loadConversation = async () => {
      if (!id) {
        navigate('/conversations');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        await selectConversation(id);
      } catch (error) {
        console.error('Erro ao carregar conversa:', error);
        setError('Não foi possível carregar os detalhes da conversa. Tente novamente mais tarde.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConversation();
    
    // Limpar ao desmontar
    return () => {
      // Não é necessário limpar o selectConversation, pois o contexto cuida disso
    };
  }, [id, selectConversation, navigate]);
  
  // Voltar para a lista de conversas
  const handleBack = () => {
    navigate('/conversations');
  };
  
  // Enviar mensagem
  const handleSendMessage = async (conversationId, text) => {
    try {
      await sendMessage(conversationId, text);
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  };
  
  // Finalizar conversa
  const handleFinishConversation = async (conversationId) => {
    if (!conversationId) {
      console.error("ID da conversa não fornecido para finalizar");
      return false;
    }
    
    try {
      // Usar a função do contexto se disponível
      if (typeof finishConversation === 'function') {
        const success = await finishConversation(conversationId);
        if (success) {
          // Navegar de volta para a lista após finalizar
          navigate('/conversations');
          return true;
        }
      } else {
        // Fallback - implementação alternativa se a função não existir no contexto
        console.warn("Função finishConversation não disponível no contexto, usando implementação alternativa");
        
        // Obtém o ID do usuário do localStorage
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error("ID do usuário não encontrado");
        }
        
        const endpoint = API_ENDPOINTS.finalizarConversa(userId, conversationId);
        const response = await api.api.put(endpoint);
        
        if (response.data && response.data.success) {
          console.log("Conversa finalizada com sucesso (implementação alternativa)");
          navigate('/conversations');
          return true;
        } else {
          throw new Error("Falha ao finalizar conversa");
        }
      }
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      return false;
    }
  };
  
  // Arquivar conversa
  const handleArchiveConversation = async (conversationId) => {
    try {
      if (typeof archiveConversation === 'function') {
        await archiveConversation(conversationId);
        // Navegar de volta para a lista após arquivar
        navigate('/conversations');
      } else {
        console.error("Função archiveConversation não disponível no contexto");
      }
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
    }
  };
  
  // Abrir modal de transferência
  const handleTransferConversation = (conversationId) => {
    setShowTransferModal(true);
  };
  
  // Confirmar transferência
  const confirmTransfer = async () => {
    if (!selectedSector || !selectedConversation?._id) {
      return;
    }
    
    try {
      await transferConversation(selectedConversation._id, selectedSector);
      setShowTransferModal(false);
      // Navegar de volta para a lista após transferir
      navigate('/conversations');
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
    }
  };
  
  // Se estiver carregando, mostrar loading
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-green-500 animate-spin mb-4" />
        <p className="text-gray-400">Carregando conversa...</p>
      </div>
    );
  }
  
  // Se houver erro, mostrar mensagem
  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
          <h2 className="text-xl text-white font-medium mb-3">Erro ao carregar conversa</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para conversas</span>
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col p-4 lg:p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleBack}
          className="flex items-center justify-center h-8 w-8 rounded-full bg-[#1e1d2b] text-gray-400 hover:text-white transition-colors lg:flex"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Detalhes da Conversa</h1>
      </div>
      
      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden">
        <ConversationDetailComponent 
          conversation={selectedConversation}
          onBack={handleBack}
          onSendMessage={handleSendMessage}
          onFinish={handleFinishConversation}
          onTransfer={handleTransferConversation}
          onArchive={handleArchiveConversation}
        />
      </div>
      
      {/* Modal de Transferência - versão simplificada */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1d2b] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl text-white font-medium mb-4">Transferir Conversa</h3>
            
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Selecione o setor</label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full bg-[#25243a] border border-[#32304a] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selecione...</option>
                <option value="suporte">Suporte</option>
                <option value="vendas">Vendas</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={confirmTransfer}
                disabled={!selectedSector}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationDetail;