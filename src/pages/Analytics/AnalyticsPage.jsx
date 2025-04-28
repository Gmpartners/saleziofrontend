// pages/Analytics/AnalyticsPage.jsx
import React from 'react';
import { BarChart3, TrendingUp, Info } from 'lucide-react';

const AnalyticsPage = () => {
  return (
    <div className="h-screen flex flex-col p-4 lg:p-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Análise de Dados</h1>
        <p className="text-slate-400">Visualize métricas e estatísticas de atendimento</p>
      </div>
      
      {/* Conteúdo - Mensagem sobre dashboard temporariamente indisponível */}
      <div className="flex-1 grid place-items-center">
        <div className="bg-[#0f1621] border border-[#1f2937]/50 rounded-lg p-6 max-w-lg text-center shadow-lg">
          <div className="bg-[#10b981]/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#10b981]/30">
            <Info className="h-8 w-8 text-[#10b981]" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">Dashboard em Atualização</h2>
          <p className="text-slate-300 mb-4">
            O dashboard de análise está temporariamente indisponível enquanto integramos 
            a nova API MultiFlow. Estamos trabalhando para trazer uma experiência 
            melhorada em breve.
          </p>
          <div className="flex flex-col md:flex-row gap-3 justify-center mt-6">
            <div className="bg-[#0c1118] rounded-lg p-4 text-left flex items-start gap-3 border border-[#1f2937]/30 shadow-md">
              <div className="p-2 bg-[#10b981]/10 rounded-lg border border-[#10b981]/20">
                <BarChart3 className="h-5 w-5 text-[#10b981]" />
              </div>
              <div>
                <h3 className="text-white font-medium">Métricas Avançadas</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Novas métricas de desempenho e análises detalhadas de conversas
                </p>
              </div>
            </div>
            <div className="bg-[#0c1118] rounded-lg p-4 text-left flex items-start gap-3 border border-[#1f2937]/30 shadow-md">
              <div className="p-2 bg-[#10b981]/10 rounded-lg border border-[#10b981]/20">
                <TrendingUp className="h-5 w-5 text-[#10b981]" />
              </div>
              <div>
                <h3 className="text-white font-medium">Tendências em Tempo Real</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Visualização de tendências e dados em tempo real
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;