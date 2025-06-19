import React, { memo } from 'react';
import { PlusCircle } from 'lucide-react';

const AddKnowledgeNode = ({ data }) => {
  const { onClick, sectorId } = data;
  
  const handleClick = () => {
    if (onClick) {
      onClick(sectorId);
    }
  };

  return (
    <div 
      className="flex items-center justify-center w-6 h-6 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-full cursor-pointer transition-all duration-200"
      onClick={handleClick}
    >
      <PlusCircle className="w-4 h-4 text-amber-500" />
    </div>
  );
};

const addKnowledgePropsAreEqual = (prevProps, nextProps) => {
  return prevProps.data.sectorId === nextProps.data.sectorId;
};

export default memo(AddKnowledgeNode, addKnowledgePropsAreEqual);