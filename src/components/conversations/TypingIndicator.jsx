import React from 'react';
import { motion } from 'framer-motion';

/**
 * Componente que exibe um indicador de "digitando..."
 */
const TypingIndicator = ({ isTyping = false, className = "" }) => {
  if (!isTyping) return null;
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-xs text-slate-400">Digitando</span>
      <div className="flex items-center">
        <motion.div
          className="w-1 h-1 bg-slate-400 rounded-full"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.div
          className="w-1 h-1 bg-slate-400 rounded-full mx-1"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-1 h-1 bg-slate-400 rounded-full"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </div>
  );
};

export default TypingIndicator;