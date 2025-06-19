import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';

const AddNode = ({ data, isConnectable }) => {
  return (
    <div 
      className="bg-[#4338CA]/10 border border-[#4338CA]/30 rounded-lg w-[60px] h-[60px] flex items-center justify-center cursor-pointer hover:bg-[#4338CA]/20 transition-all duration-300"
      onClick={data.onClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ background: '#4338CA', width: 8, height: 8, top: -6 }}
        className="!border-[#4338CA]/50"
      />
      
      <Plus className="w-6 h-6 text-[#4338CA]" />
      
      <div className="absolute -bottom-7 text-xs text-white/70 whitespace-nowrap">
        {data.label || 'Adicionar Nó'}
      </div>
    </div>
  );
};

export default AddNode;