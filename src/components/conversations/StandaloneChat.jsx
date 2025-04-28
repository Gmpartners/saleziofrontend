import React, { useEffect } from 'react';
import { ArrowLeftCircle } from 'lucide-react';

/**
 * Este componente foi substituído por uma implementação melhor integrada com o SocketContext.
 * Agora ele apenas redireciona o usuário de volta para a lista de conversas.
 */
const StandaloneChat = ({ onBack }) => {
  // Exibir mensagem no console para ajudar na depuração
  useEffect(() => {
    console.log('O componente StandaloneChat foi descontinuado e substituído por uma implementação melhor integrada.');
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0c1118] rounded-lg p-6 text-center">
      <div className="w-16 h-16 bg-[#0f1621] rounded-full flex items-center justify-center text-[#10b981] mb-4">
        <ArrowLeftCircle className="h-8 w-8" />
      </div>
      
      <h3 className="text-xl font-medium text-white mb-3">
        Redirecionamento necessário
      </h3>
      
      <p className="text-slate-400 mb-6 max-w-md">
        Esta interface foi atualizada para melhor desempenho e integração.
        Por favor, volte para a lista de conversas e tente novamente.
      </p>
      
      <button
        onClick={onBack}
        className="px-4 py-2 bg-[#10b981] hover:bg-[#0d9268] text-white rounded-md transition-colors"
      >
        Voltar para conversas
      </button>
    </div>
  );
};

export default StandaloneChat;