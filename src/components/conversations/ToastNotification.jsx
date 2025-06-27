import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, MessageCircle } from 'lucide-react';

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

  const getInitials = (name) => {
    if (!name) return 'U';
    
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n && n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase();
  };

  const truncateMessage = (text, maxLength = 80) => {
    if (!text) return 'Nova mensagem';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: 50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -50, x: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 right-4 z-[9999] max-w-sm"
          onClick={onClick}
        >
          <div className="bg-[#070b11] border border-[#10b981]/40 rounded-lg shadow-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-[#0f1621] hover:border-[#10b981]/60 transition-all duration-300 group">
            <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-[#10b981]/20 group-hover:ring-[#10b981]/40 transition-all duration-300">
              <AvatarFallback className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white text-sm font-bold">
                {getInitials(sender)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-1 mb-1">
                <MessageCircle className="h-3.5 w-3.5 text-[#10b981]" />
                <h4 className="font-semibold text-white text-sm truncate">
                  {sender || 'Cliente'}
                </h4>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                {truncateMessage(message)}
              </p>
              
              <div className="flex items-center gap-1 mt-2 text-xs text-[#10b981]/80">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></div>
                <span>Nova mensagem</span>
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-[#1f2937]/50 transition-all duration-200 group-hover:text-slate-400"
              aria-label="Fechar notificação"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};