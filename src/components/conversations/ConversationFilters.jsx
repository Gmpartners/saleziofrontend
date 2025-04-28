// components/conversations/ConversationFilters.jsx
import React, { useState } from 'react';
import { Search, Filter, RefreshCw, ChevronDown } from 'lucide-react';
import { STATUS } from '../../config/constants';

const ConversationFilters = ({ filters, setFilters, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="bg-[#0f1621] rounded-lg p-3 mb-4 border border-[#1f2937]/40 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar conversa..."
            className="w-full bg-[#0c1118] border border-[#1f2937]/50 rounded-md px-4 py-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-[#10b981]/30 focus:border-[#10b981]/50"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>
        
        <button
          onClick={onRefresh}
          className="p-2.5 text-slate-300 bg-[#0c1118] rounded-md border border-[#1f2937]/50 hover:bg-[#101820] focus:outline-none focus:ring-2 focus:ring-[#10b981]/30"
          aria-label="Atualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 text-slate-300 bg-[#0c1118] rounded-md border border-[#1f2937]/50 hover:bg-[#101820] focus:outline-none focus:ring-2 focus:ring-[#10b981]/30 flex items-center gap-1"
          aria-expanded={isOpen}
          aria-label="Filtros"
        >
          <Filter className="h-4 w-4" />
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#1f2937]/40">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Status</label>
            <select
              className="w-full bg-[#0c1118] border border-[#1f2937]/50 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#10b981]/30"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">Todos</option>
              <option value={STATUS.AGUARDANDO}>Aguardando</option>
              <option value={STATUS.EM_ANDAMENTO}>Em Andamento</option>
              <option value={STATUS.FINALIZADA}>Finalizada</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Setor</label>
            <select
              className="w-full bg-[#0c1118] border border-[#1f2937]/50 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#10b981]/30"
              value={filters.setor}
              onChange={(e) => setFilters({ ...filters, setor: e.target.value })}
            >
              <option value="all">Todos</option>
              <option value="suporte">Suporte</option>
              <option value="vendas">Vendas</option>
              <option value="financeiro">Financeiro</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Arquivadas</label>
            <select
              className="w-full bg-[#0c1118] border border-[#1f2937]/50 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#10b981]/30"
              value={filters.arquivada ? 'true' : 'false'}
              onChange={(e) => setFilters({ ...filters, arquivada: e.target.value === 'true' })}
            >
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationFilters;