import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-[#0c0b14] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1e1d2b] rounded-xl shadow-lg p-8 text-center animate-fadeInUp">
        <div className="flex justify-center mb-4">
          <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center">
            <ShieldX className="h-10 w-10 text-red-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Acesso Não Autorizado</h1>
        <p className="text-gray-400 mb-6">
          Você não tem permissão para acessar esta página. 
          Por favor, entre em contato com o administrador para mais informações.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 bg-[#25243a] hover:bg-[#32304a] text-white px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Ir para Início</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;