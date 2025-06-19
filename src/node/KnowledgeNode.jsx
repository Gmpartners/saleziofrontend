import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { BookOpen, PenSquare } from 'lucide-react';

const KnowledgeNode = ({ data, isConnectable }) => {
  const { 
    title = 'Base de Conhecimento', 
    instructions = '', 
    sectorId,
    onEdit
  } = data;
  
  const handleClick = () => {
    if (onEdit) {
      onEdit(data.id);
    }
  };

  return (
    <div 
      className="bg-gradient-to-br from-[#0f1621] to-[#111927] border border-amber-500/20 shadow-md rounded-lg px-3 py-2 w-[180px] transition-all duration-300 hover:shadow-lg cursor-pointer"
      onClick={handleClick}
    >
      <Handle
        id={`target-knowledge-${sectorId}`}
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ 
          background: '#FF8F00', 
          width: 6, 
          height: 6, 
          top: -5 
        }}
        className="!border-amber-500/50"
      />
      
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3 h-3 text-amber-400" />
          <div className="font-semibold text-amber-400 text-xs">{title}</div>
        </div>
        <PenSquare className="w-3 h-3 text-slate-400" />
      </div>
      
      <div className="text-xs text-slate-300 mb-1 line-clamp-3 text-[10px]">
        {instructions || 'Adicione instruções específicas para este conhecimento.'}
      </div>
    </div>
  );
};

export default KnowledgeNode;