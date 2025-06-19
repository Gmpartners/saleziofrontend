import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, ChevronDown } from 'lucide-react';
import { useAuthContext } from '../../hooks/useAuthContext';
import { multiflowApi } from '../../services/multiflowApi';
import { cn } from "../../lib/utils";
import { useWindowSize } from '../../hooks/useWindowSize';

const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  ARQUIVADA: 'arquivada'
};

const ConversationFilters = ({ 
  filters, 
  setFilters, 
  onRefresh, 
  isRefreshing = false,
  availableSectors = [] 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAdmin, userProfile } = useAuthContext();
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowSize();
  const isMobile = width < 768;
  
  useEffect(() => {
    if (availableSectors && availableSectors.length > 0) {
      setSectors(availableSectors);
      return;
    }
    
    const fetchSectors = async () => {
      setLoading(true);
      try {
        const userId = userProfile?.id || localStorage.getItem('userId');
        const response = await multiflowApi.getSetores(userId, isAdmin);
        if (response.success && Array.isArray(response.data)) {
          setSectors(response.data);
        }
      } catch (error) {
        console.error('Erro ao buscar setores:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSectors();
  }, [isAdmin, userProfile, availableSectors]);
  
  const toggleFilter = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <div className="bg-[#0f1621] rounded-lg p-2 md:p-3 mb-3 md:mb-4 border border-[#1f2937]/40 shadow-sm">
      <div className="flex items-center gap-2 mb-2 md:mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={isMobile ? "Buscar..." : "Buscar conversa..."}
            className="w-full bg-[#0c1118] border border-[#1f2937]/50 rounded-md px-4 py-2 pl-9 md:pl-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/30 focus:border-[#10b981]/50"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>
        
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            "p-2 md:p-2.5 text-slate-300 bg-[#0c1118] rounded-md border border-[#1f2937]/50 hover:bg-[#101820] focus:outline-none focus:ring-2 focus:ring-[#10b981]/30",
            isRefreshing && "opacity-50"
          )}
          aria-label="Atualizar"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </button>
        
        <button
          onClick={toggleFilter}
          className="p-2 md:p-2.5 text-slate-300 bg-[#0c1118] rounded-md border border-[#1f2937]/50 hover:bg-[#101820] focus:outline-none focus:ring-2 focus:ring-[#10b981]/30 flex items-center gap-1"
          aria-expanded={isOpen}
          aria-label="Filtros"
        >
          <Filter className="h-4 w-4" />
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {isOpen && (
        <div className={cn(
          "grid gap-3 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-[#1f2937]/40",
          isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
        )}>
          <div>
            <label className="block text-xs md:text-sm text-slate-400 mb-1">Status</label>
            <select
              className="w-full bg-[#0c1118] border border-[#1f2937]/50 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/30"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">Todos</option>
              <option value={STATUS.AGUARDANDO}>Aguardando</option>
              <option value={STATUS.EM_ANDAMENTO}>Em Andamento</option>
              <option value={STATUS.FINALIZADA}>Finalizada</option>
            </select>
          </div>
          
          {isAdmin && (
            <div>
              <label className="block text-xs md:text-sm text-slate-400 mb-1">Setor</label>
              <select
                className="w-full bg-[#0c1118] border border-[#1f2937]/50 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/30"
                value={filters.setor}
                onChange={(e) => setFilters({ ...filters, setor: e.target.value })}
                disabled={loading}
              >
                <option value="all">Todos</option>
                {sectors.map(setor => (
                  <option key={setor._id || setor.id} value={setor._id || setor.id}>
                    {setor.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {!isAdmin && userProfile?.setor && (
            <div>
              <label className="block text-xs md:text-sm text-slate-400 mb-1">Setor</label>
              <div className="w-full bg-[#0c1118] border border-[#1f2937]/50 rounded-md px-3 py-2 text-white text-sm opacity-75">
                {userProfile.setor.nome || "Seu setor"}
                <span className="ml-2 text-xs text-slate-400">(fixo)</span>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-xs md:text-sm text-slate-400 mb-1">Arquivadas</label>
            <select
              className="w-full bg-[#0c1118] border border-[#1f2937]/50 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/30"
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