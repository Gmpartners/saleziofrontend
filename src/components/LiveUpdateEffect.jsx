import React, { useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Componente que exibe um efeito visual quando novos dados são recebidos
 * Usar memo para evitar re-renderizações desnecessárias
 */
const LiveUpdateEffect = memo(function LiveUpdateEffect({ show, duration = 1000, children }) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (show) {
      // Usando um timestamp para evitar múltiplas atualizações em sequência
      const timestamp = Date.now();
      setIsVisible(timestamp);
      
      const timer = setTimeout(() => {
        // Somente limpar se o timestamp corresponder
        setIsVisible(prev => prev === timestamp ? false : prev);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration]);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 pointer-events-none z-10"
        >
          <div className="absolute inset-0 border-2 border-[#10b981] rounded-lg opacity-50 animate-pulse"></div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default LiveUpdateEffect;