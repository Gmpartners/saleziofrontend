import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Componente que exibe um efeito visual quando novos dados são recebidos
 */
const LiveUpdateEffect = ({ show, duration = 1000, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
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
};

export default LiveUpdateEffect;