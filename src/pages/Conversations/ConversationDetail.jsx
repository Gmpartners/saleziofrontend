// pages/Conversations/ConversationDetail.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Importar o componente autônomo em vez do componente problemático
import StandaloneChat from '../../components/conversations/StandaloneChat';

// Versão simplificada da página de detalhes da conversa
const ConversationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Função para voltar à lista de conversas
  const handleBack = () => {
    navigate('/conversations');
  };

  return (
    <div className="h-screen flex flex-col p-4 lg:p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleBack}
          className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 text-gray-400 hover:text-white transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Detalhes da Conversa</h1>
      </div>
      
      {/* Conteúdo - usando o componente autônomo */}
      <div className="flex-1 overflow-hidden">
        <StandaloneChat 
          conversationId={id} 
          onBack={handleBack}
        />
      </div>
    </div>
  );
};

export default ConversationDetail;