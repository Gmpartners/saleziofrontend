import React from 'react';
import { Handle } from '@xyflow/react';
import { Edit, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function EmpresaNode({ data, selected }) {
  if (!data.empresa) return null;
  
  const { empresa, onEdit } = data;
  
  const isActive = empresa.ativo !== false;
  const showEditButton = !!onEdit;
  const opacity = isActive ? 1 : 0.6;
  const borderColor = isActive ? '#4338CA' : '#9CA3AF';
  const gradient = isActive 
    ? 'radial-gradient(circle at 10% 20%, rgba(67, 56, 202, 0.15) 0%, rgba(15, 23, 42, 0.05) 90%)' 
    : 'none';
  
  const backgroundColor = selected 
    ? '#1f2937' 
    : '#0f1621';
  
  const hasConteudos = empresa.conteudosAutomaticos && empresa.conteudosAutomaticos.length > 0;
  
  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(empresa);
  };
  
  return (
    <div 
      className="empresa-node relative p-3 rounded-lg border shadow-md min-w-[230px]"
      style={{ 
        backgroundColor, 
        borderColor,
        opacity,
        background: gradient
      }}
    >
      <Handle 
        id={`target-empresa-${empresa.id}`}
        type="target" 
        position="top" 
        className="w-3 h-3 bg-[#4338CA] border-2 border-[#101820] top-[-6px]"
      />
      
      <Handle 
        id={`source-empresa-${empresa.id}`}
        type="source" 
        position="bottom" 
        className="w-3 h-3 bg-[#4338CA] border-2 border-[#101820] bottom-[-6px]"
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center text-white">
          <div className="bg-[#101820] p-1.5 rounded-md mr-2">
            <Building2 className="h-4 w-4 text-[#4338CA]" />
          </div>
          <div>
            <div className="font-bold truncate max-w-[140px]" title={empresa.nome}>
              {empresa.nome || 'Empresa sem nome'}
            </div>
            <div className="text-xs text-slate-400">
              {empresa.horarioFuncionamento || 'Horário não definido'}
            </div>
          </div>
        </div>
        
        {showEditButton && (
          <button
            onClick={handleEditClick}
            className="bg-[#101820] p-1 rounded hover:bg-[#1c2839] transition-colors"
          >
            <Edit className="h-4 w-4 text-[#4338CA]" />
          </button>
        )}
      </div>
      
      {empresa.descricao && (
        <div className="mt-2 text-xs text-slate-400 truncate">
          {empresa.descricao}
        </div>
      )}

      <div className="flex items-center gap-1 text-xs mt-2">
        {hasConteudos && (
          <Badge className="bg-[#D97706]/20 text-[#FBBF24] hover:bg-[#D97706]/30 text-[10px]">
            {empresa.conteudosAutomaticos.length} conteúdos
          </Badge>
        )}
      </div>
    </div>
  );
}