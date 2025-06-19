import React from 'react';
import { Handle } from '@xyflow/react';
import { Edit, ChevronRight, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SectorNode({ data, selected }) {
  if (!data.sector) return null;
  
  const { sector, onEdit } = data;
  
  const isActive = sector.ativo !== false;
  const showEditButton = !!onEdit;
  const opacity = isActive ? 1 : 0.6;
  const borderColor = isActive ? '#FF8F00' : '#9CA3AF';
  const gradient = isActive 
    ? 'radial-gradient(circle at 10% 20%, rgba(255, 143, 0, 0.15) 0%, rgba(15, 23, 42, 0.05) 90%)' 
    : 'none';
  
  const backgroundColor = selected 
    ? '#1f2937' 
    : '#0f1621';
  
  const hasLacunas = sector.lacunas && sector.lacunas.length > 0;
  const hasObjetivos = sector.objetivos && sector.objetivos.length > 0;
  
  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(sector);
  };
  
  return (
    <div 
      className="sector-node relative p-3 rounded-lg border shadow-md min-w-[230px]"
      style={{ 
        backgroundColor, 
        borderColor,
        opacity,
        background: gradient
      }}
    >
      <Handle 
        id={`target-${sector.id}`}
        type="target" 
        position="top" 
        className="w-3 h-3 bg-[#FF8F00] border-2 border-[#101820] top-[-6px]"
      />
      
      <Handle 
        id={`source-${sector.id}`}
        type="source" 
        position="bottom" 
        className="w-3 h-3 bg-[#FF8F00] border-2 border-[#101820] bottom-[-6px]"
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center text-white">
          <div className="bg-[#101820] p-1.5 rounded-md mr-2">
            <Server className="h-4 w-4 text-[#FF8F00]" />
          </div>
          <div>
            <div className="font-bold truncate max-w-[140px]" title={sector.nome}>
              {sector.nome || 'Setor sem nome'}
            </div>
            <div className="text-xs text-slate-400">
              {sector.responsavel || 'Não definido'}
            </div>
          </div>
        </div>
        
        {showEditButton && (
          <button
            onClick={handleEditClick}
            className="bg-[#101820] p-1 rounded hover:bg-[#1c2839] transition-colors"
          >
            <Edit className="h-4 w-4 text-[#FF8F00]" />
          </button>
        )}
      </div>
      
      {sector.descricao && (
        <div className="mt-2 text-xs text-slate-400 truncate">
          {sector.descricao}
        </div>
      )}

      <div className="flex items-center gap-1 text-xs mt-2">
        {hasLacunas && (
          <Badge className="bg-[#4338CA]/20 text-[#818CF8] hover:bg-[#4338CA]/30 text-[10px]">
            {sector.lacunas.length} lacunas
          </Badge>
        )}
        
        {hasObjetivos && (
          <Badge className="bg-[#059669]/20 text-[#34D399] hover:bg-[#059669]/30 text-[10px]">
            {sector.objetivos.length} objetivos
          </Badge>
        )}
        
        {sector.perguntasTriagem && sector.perguntasTriagem.length > 0 && (
          <Badge className="bg-[#0369A1]/20 text-[#38BDF8] hover:bg-[#0369A1]/30 text-[10px]">
            {sector.perguntasTriagem.length} perguntas
          </Badge>
        )}
      </div>
      
      {sector.empresaId && (
        <div className="absolute -right-1 -top-1 flex items-center justify-center rounded-full w-5 h-5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
          <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}