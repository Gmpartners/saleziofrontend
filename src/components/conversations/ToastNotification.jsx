import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X } from 'lucide-react';

export const ToastNotification = ({ 
  show, 
  message, 
  sender, 
  onClose, 
  onClick 
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: -50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
          onClick={onClick}
        >
          <div className="bg-[#070b11] border border-[#1f2937]/40 rounded-lg shadow-lg p-4 flex items-start gap-3 cursor-pointer hover:bg-[#0f1621]">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-[#10b981] text-white">
                {sender ? sender.charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <h4 className="font-medium text-white">{sender || 'Usuário'}</h4>
              <p className="text-sm text-slate-300 truncate">{message || 'Nova mensagem'}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};