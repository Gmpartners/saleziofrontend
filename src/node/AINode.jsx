import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, BrainCircuit } from 'lucide-react';

const AINode = ({ data, isConnectable }) => {
  const { name = 'Orquestrador IA', subtitle = 'Gerenciador de Fluxo' } = data;
  
  return (
    <div className="bg-gradient-to-br from-[#0f1621] to-[#0d1219] border border-[#1f2937]/50 shadow-lg rounded-lg px-4 py-3 w-[220px] transition-all duration-300 hover:shadow-xl">
      <div className="flex flex-col items-center mb-2">
        <div className="w-12 h-12 bg-gradient-to-r from-[#FF8F00]/10 to-[#FF6F00]/20 rounded-full flex items-center justify-center mb-2 border border-[#FF8F00]/30">
          <Bot className="w-6 h-6 text-[#FF8F00]" />
        </div>
        <div className="text-center">
          <div className="font-semibold text-white">{name}</div>
          <div className="text-xs text-[#FF8F00]/80 mt-1">{subtitle}</div>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2 mt-3 border-t border-[#1f2937]/40 pt-3">
        <BrainCircuit className="w-4 h-4 text-[#FF8F00]" />
        <span className="text-xs text-slate-300">Inteligência Artificial</span>
      </div>
      
      <Handle
        id="ai-source"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ 
          background: '#FF8F00', 
          width: 8, 
          height: 8, 
          bottom: -5 
        }}
        className="!border-[#FF8F00]/50"
      />
    </div>
  );
};

export default memo(AINode);