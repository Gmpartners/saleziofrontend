import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { notificationService } from '../../services/notificationService';
import { cn } from '../../lib/utils';

import MessageBubble from './MessageBubble';
import ConversationHeader from './ConversationHeader';
import { Button } from "../../components/ui/button";

const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  ARQUIVADA: 'arquivada'
};

const VirtualizedMessageList = React.memo(({ 
  messages, 
  onRetryMessage, 
  scrollToBottom
}) => {
  const messagesEndRef = useRef(null);
  const listRef = useRef(null);
  
  useEffect(() => {
    if (scrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, scrollToBottom]);
  
  if (!messages || messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-full bg-[#101820] flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl text-white font-medium mb-2">Conversa iniciada</h3>
        <p className="text-slate-400 max-w-md">
          Inicie a conversa enviando uma mensagem para o cliente.
        </p>
      </div>
    );
  }
  
  return (
    <div 
      className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-[#1f2937] scrollbar-track-transparent bg-[#070b11]"
      ref={listRef}
    >
      <div className="space-y-1">
        {messages.map((message, index) => (
          <MessageBubble 
            key={message._id || `msg-${index}`}
            message={message}
            prevMessage={index > 0 ? messages[index - 1] : null}
            isGrouped={
              index > 0 && 
              messages[index - 1].remetente === message.remetente &&
              new Date(message.timestamp) - new Date(messages[index - 1].timestamp) < 60000
            }
            isLastInGroup={
              index < messages.length - 1 ? 
              messages[index + 1].remetente !== message.remetente : true
            }
            onRetry={onRetryMessage}
          />
        ))}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});

const ConversationDetailView = ({ 
  conversation, 
  isConnected, 
  isProcessing, 
  onSendMessage, 
  onShowFinishModal, 
  onShowTransferModal, 
  onShowArchiveModal,
  onBack
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (inputRef.current && conversation) {
      inputRef.current.focus();
    }
  }, [conversation]);
  
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!newMessage.trim() || !conversation?._id) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSubmitting(true);
    
    try {
      await onSendMessage(conversation._id, messageText);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      notificationService.showToast('Não foi possível enviar a mensagem. Tente novamente.', 'error');
      setNewMessage(messageText);
    } finally {
      setIsSubmitting(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };
  
  const handleRetryMessage = useCallback((messageId, content) => {
    if (!conversation?._id) return;
  }, [conversation]);
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[#070b11]">
        <div className="w-16 h-16 rounded-full bg-[#101820] flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl text-white font-medium mb-2">Selecione uma conversa</h3>
        <p className="text-slate-400 max-w-md">
          Escolha uma conversa da lista para visualizar as mensagens e interagir com o cliente.
        </p>
      </div>
    );
  }
  
  const isConversationFinished = conversation.status && conversation.status.toLowerCase() === STATUS.FINALIZADA;
  
  return (
    <div className="h-full flex flex-col">
      <ConversationHeader 
        conversation={conversation}
        isConnected={isConnected}
        isProcessing={isProcessing}
        onShowFinishModal={onShowFinishModal}
        onShowTransferModal={onShowTransferModal}
        onShowArchiveModal={onShowArchiveModal}
        onBack={onBack}
      />
      
      <VirtualizedMessageList 
        messages={conversation.mensagens || []}
        onRetryMessage={handleRetryMessage}
        scrollToBottom={true}
      />
      
      <form onSubmit={handleSendMessage} className="flex gap-2 p-3 bg-[#070b11] border-t border-[#1f2937]/40 sticky bottom-0 z-20">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConversationFinished ? "Conversa finalizada" : "Digite sua mensagem..."}
          ref={inputRef}
          disabled={isSubmitting || isConversationFinished || !isConnected}
          className={cn(
            "flex-1 bg-[#101820] border border-[#1f2937]/40 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#10b981]/30",
            "text-sm md:text-base placeholder:text-slate-400/70",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />
        
        <Button
          type="submit"
          disabled={!newMessage.trim() || isSubmitting || isConversationFinished || !isConnected}
          className="px-4 bg-[#10b981] text-white rounded-md hover:bg-[#0d9268] disabled:opacity-50 disabled:hover:bg-[#10b981] transition-colors"
        >
          {isSubmitting ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </Button>
      </form>
      
      {isConversationFinished && (
        <div className="text-center text-xs text-slate-400 bg-[#070b11] pb-2">
          Esta conversa foi finalizada. Não é possível enviar novas mensagens.
        </div>
      )}
    </div>
  );
};

export default React.memo(ConversationDetailView);