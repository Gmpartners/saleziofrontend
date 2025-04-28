// pages/Conversations/ConversationDetail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, UserCircle, MoreVertical, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import MessageStatus from '../../components/conversations/MessageStatus';
import TypingIndicator from '../../components/conversations/TypingIndicator';
import { motion, AnimatePresence } from 'framer-motion';

const ConversationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    selectedConversation, 
    selectConversation, 
    sendMessage,
    retryFailedMessage,
    isConnected
  } = useSocket();
  
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const inputRef = useRef(null);

  // Selecionar a conversa quando o componente for montado
  useEffect(() => {
    if (id) {
      selectConversation(id);
    }
    
    // Função de limpeza para evitar memory leaks
    return () => {
      // Limpar timeout se existir
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [id, selectConversation]);

  // Rolar para a última mensagem quando a conversa for carregada
  useEffect(() => {
    if (messagesEndRef.current && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [selectedConversation?.mensagens]);

  // Focar no input quando a conversa carregar
  useEffect(() => {
    if (inputRef.current && selectedConversation) {
      inputRef.current.focus();
    }
  }, [selectedConversation]);

  // Função para voltar à lista de conversas
  const handleBack = () => {
    navigate('/conversations');
  };

  // Enviar mensagem
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !id) return;
    
    // Limpar o input antes de enviar para melhorar a UX
    setNewMessage('');
    
    // Enviar a mensagem usando o contexto
    await sendMessage(id, newMessage.trim());
    
    // Focar no input novamente
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Lidar com digitação
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Simular evento de "digitando..."
    setIsTyping(true);
    
    // Limpar timeout anterior se existir
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Definir novo timeout
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  // Componente para mensagem
  const MessageBubble = ({ message }) => {
    const isAtendente = message.remetente === 'atendente';
    
    // Tentar novamente enviar mensagem com falha
    const handleRetry = () => {
      if (message.status === 'failed' && message._id && message.conteudo) {
        retryFailedMessage(id, message._id, message.conteudo);
      }
    };
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex flex-col mb-3 ${isAtendente ? 'items-end' : 'items-start'}`}
      >
        <div className={`px-3 py-2 rounded-lg max-w-[80%] ${
          isAtendente 
            ? 'bg-[#0d1f17] text-white border border-[#10b981]/20 rounded-tr-sm' 
            : 'bg-[#0f1621] text-white border border-[#1f2937]/50 rounded-tl-sm'
        }`}>
          {message.conteudo}
        </div>
        
        <div className="flex items-center mt-1 text-xs text-slate-400">
          <MessageStatus 
            status={message.status} 
            timestamp={message.timestamp || message.createdAt} 
          />
          
          {/* Botão de tentar novamente para mensagens com falha */}
          {message.status === 'failed' && (
            <button 
              onClick={handleRetry}
              className="ml-2 text-red-400 hover:text-red-300 underline text-xs"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  // Renderizar estado de carregamento
  if (!selectedConversation) {
    return (
      <div className="h-screen flex flex-col p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-[#0f1621] text-slate-400 hover:text-white"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Detalhes da Conversa</h1>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-[#10b981] border-[#1f2937]/50 rounded-full animate-spin mb-4 mx-auto"></div>
            <p className="text-slate-400">Carregando conversa...</p>
          </div>
        </div>
      </div>
    );
  }

  const { nomeCliente, telefoneCliente, mensagens = [] } = selectedConversation;

  return (
    <div className="h-screen flex flex-col p-4 lg:p-6">
      {/* Cabeçalho da página */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleBack}
          className="flex items-center justify-center h-8 w-8 rounded-full bg-[#0f1621] text-slate-400 hover:text-white"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Detalhes da Conversa</h1>
      </div>
      
      {/* Interface do chat */}
      <div className="flex-1 overflow-hidden bg-[#070b11] rounded-lg border border-[#1f2937]/40 flex flex-col">
        {/* Cabeçalho do chat */}
        <div className="flex justify-between items-center p-3 border-b border-[#1f2937]/40 bg-[#0c1118]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#10b981]/10 rounded-full flex items-center justify-center text-[#10b981]">
              <UserCircle className="h-6 w-6" />
            </div>
            
            <div>
              <h3 className="text-white font-medium">{nomeCliente || 'Cliente'}</h3>
              <div className="text-xs text-slate-400">
                {telefoneCliente || 'Sem telefone'}
              </div>
            </div>
          </div>
          
          {/* Status de conexão */}
          <div className="flex items-center">
            {!isConnected && (
              <div className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 mr-2">
                Offline
              </div>
            )}
            <button 
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#101820] text-slate-400"
              aria-label="Mais opções"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Lista de mensagens */}
        <div 
          className="flex-1 overflow-y-auto p-4"
          ref={messageListRef}
        >
          <AnimatePresence>
            {mensagens.length > 0 ? (
              <div className="space-y-2">
                {mensagens.map((message, index) => (
                  <MessageBubble 
                    key={message._id || `msg-${index}`} 
                    message={message} 
                  />
                ))}
                <div ref={messagesEndRef} />
                
                {/* Indicador de digitação */}
                {isTyping && (
                  <div className="flex justify-end">
                    <TypingIndicator isTyping={true} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400">Nenhuma mensagem nesta conversa.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Formulário de envio */}
        <div className="p-3 border-t border-[#1f2937]/40 bg-[#0c1118]">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-[#0f1621] border border-[#1f2937]/50 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#10b981]/30"
              ref={inputRef}
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              className="px-4 bg-[#10b981] text-white rounded-md hover:bg-[#0d9268] disabled:opacity-50 disabled:hover:bg-[#10b981]"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConversationDetail;