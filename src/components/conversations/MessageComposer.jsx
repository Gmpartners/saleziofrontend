import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '../../lib/utils';

const MessageComposer = ({ 
  value, 
  onChange, 
  onSubmit, 
  onTyping, 
  isSubmitting, 
  isDisabled 
}) => {
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (inputRef.current && !isDisabled) {
      inputRef.current.focus();
    }
  }, [isDisabled]);
  
  return (
    <form onSubmit={onSubmit} className="flex gap-2 p-3 bg-[#070b11] border-t border-[#1f2937]/40 sticky bottom-0 z-20">
      <input
        type="text"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          onTyping();
        }}
        placeholder={isDisabled ? "Conversa finalizada" : "Digite sua mensagem..."}
        ref={inputRef}
        disabled={isSubmitting || isDisabled}
        className={cn(
          "flex-1 bg-[#101820] border border-[#1f2937]/40 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#10b981]/30",
          "text-sm md:text-base placeholder:text-slate-400/70"
        )}
      />
      
      <button
        type="submit"
        disabled={!value.trim() || isSubmitting || isDisabled}
        className="px-4 bg-[#10b981] text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-[#0d9268] disabled:opacity-50 disabled:hover:bg-[#10b981]"
      >
        <Send className="h-5 w-5" />
      </button>
    </form>
  );
};

export default React.memo(MessageComposer);