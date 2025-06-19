import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";

const MessageInput = ({ 
  onSubmit, 
  disabled, 
  onTyping 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  const handleInputChange = (e) => {
    const text = e.target.value;
    setNewMessage(text);
    
    if (onTyping && text) {
      onTyping();
    }
  };
  
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    
    setTimeout(adjustTextareaHeight, 0);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || disabled) return;
    
    onSubmit(newMessage);
    setNewMessage('');
    setShowEmojiPicker(false);
    
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };
  
  const basicEmojis = ['😀', '😊', '😂', '👍', '❤️', '🙏', '👋', '⭐', '✅', '🔥', '🤔', '😢'];
  
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 bg-[#070b11] border-t border-[#1f2937]/40 rounded-b-xl sticky bottom-0 z-20">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="rounded-full h-10 w-10 flex-shrink-0 text-slate-400 hover:text-[#10b981] hover:bg-[#101820]"
        disabled={disabled}
      >
        <Paperclip className="h-5 w-5" />
      </Button>
      
      <div className="flex-1 relative">
        <Textarea
          ref={inputRef}
          value={newMessage}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          rows="1"
          className="min-h-10 max-h-[120px] py-2.5 pr-10 resize-none bg-[#101820] border-[#1f2937]/40 rounded-xl text-white placeholder:text-slate-400/70 focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981]/50"
          disabled={disabled}
          style={{ overflowY: newMessage ? 'auto' : 'hidden' }}
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-slate-400 hover:text-orange-400 hover:bg-[#101820]"
                disabled={disabled}
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-[#070b11] border border-[#1f2937]/40 shadow-md z-30" align="end" alignOffset={-40}>
              <div className="grid grid-cols-6 gap-1">
                {basicEmojis.map(emoji => (
                  <Button
                    key={emoji}
                    type="button"
                    variant="ghost"
                    className="h-9 w-9 p-0 hover:bg-[#101820]"
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      inputRef.current?.focus();
                    }}
                  >
                    <span className="text-lg">{emoji}</span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !newMessage.trim()}
        className="rounded-full h-10 w-10 flex-shrink-0 bg-gradient-to-r from-[#10b981] to-[#059669] text-white hover:opacity-90 disabled:opacity-50 disabled:from-slate-400/30 disabled:to-slate-400/30 disabled:text-white/50 transition-all duration-300"
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
};

export default MessageInput;