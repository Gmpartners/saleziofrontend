import React, { useState, useEffect, useRef } from 'react';
import { Send, MoreVertical, ArrowLeftCircle, UserCircle, Archive, FileText, Share, CheckCircle, MessageSquare } from 'lucide-react';

import { useSocket } from '../../contexts/SocketContext';
import MessageBubble from './MessageBubble';

// Componente simplificado para cabeçalho da conversa
const ConversationHeader = ({ conversation, onBack, onAction }) => {
  const [showOptions, setShowOptions] = useState(false);
  
  const nomeCliente = conversation?.nomeCliente || 'Cliente';
  const telefoneCliente = conversation?.telefoneCliente || '';
  
  return (
    <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-slate-800 rounded-t-lg">
      <div className="flex items-center gap-3">
        <button 
          onClick={onBack}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-400 transition-colors lg:hidden"
          aria-label="Voltar"
        >
          <ArrowLeftCircle className="h-5 w-5" />
        </button>
        
        <div className="w-10 h-10 bg-[#10b981]/10 rounded-full flex items-center justify-center overflow-hidden text-[#10b981]">
          <UserCircle className="h-6 w-6" />
        </div>
        
        <div>
          <h3 className="text-white font-medium">{nomeCliente}</h3>
          <div className="text-xs text-slate-400">
            {telefoneCliente}
          </div>
        </div>
      </div>
      
      <div className="relative">
        <button 
          onClick={() => setShowOptions(!showOptions)}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-400 transition-colors"
          aria-label="Mais opções"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
        
        {showOptions && (
          <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
            <div className="p-2">
              <button 
                onClick={() => { setShowOptions(false); onAction('finalizar'); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4 text-[#10b981]" />
                <span>Finalizar Conversa</span>
              </button>
              
              <button 
                onClick={() => { setShowOptions(false); onAction('transferir'); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm flex items-center gap-2"
              >
                <Share className="h-4 w-4 text-blue-400" />
                <span>Transferir</span>
              </button>
              
              <button 
                onClick={() => { setShowOptions(false); onAction('arquivar'); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm flex items-center gap-2"
              >
                <Archive className="h-4 w-4 text-amber-400" />
                <span>Arquivar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente principal de conversa (versão simplificada)
const ConversationDetail = ({ conversation, onBack, onSendMessage, onFinish, onTransfer, onArchive }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const inputRef = useRef(null);
  const { socketService, retryFailedMessage } = useSocket();
  
  // Atualizar mensagens quando a conversa mudar
  useEffect(() => {
    if (conversation?.mensagens) {
      setMessages([...conversation.mensagens]);
    }
  }, [conversation?._id, conversation?.mensagens]);

  // Adicionar listener para novas mensagens
  useEffect(() => {
    if (!conversation || !conversation._id) return;
    
    const handleNewMessage = (data) => {
      if (data.conversaId === conversation._id) {
        console.log('🔶 Nova mensagem recebida:', data);
        setMessages(prev => {
          // Verificar se a mensagem já existe
          const exists = prev.some(msg => 
            msg._id === data.mensagem._id || 
            (msg.conteudo === data.mensagem.conteudo && msg.timestamp === data.mensagem.timestamp)
          );
          
          if (!exists) {
            return [...prev, data.mensagem];
          }
          return prev;
        });
      }
    };
    
    // Registrar listener
    const removeListener = socketService.on('nova_mensagem', handleNewMessage);
    
    return () => {
      if (typeof removeListener === 'function') {
        removeListener();
      }
    };
  }, [conversation, socketService]);
  
  // Manter scroll na parte inferior quando novas mensagens chegarem
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Focar no input quando a conversa mudar
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversation?._id]);
  
  // Manipular envio de mensagem
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isSubmitting || !conversation) return;
    
    setIsSubmitting(true);
    
    // Adicionar mensagem otimista imediatamente
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      conversaId: conversation._id,
      conteudo: newMessage.trim(),
      remetente: 'atendente',
      timestamp: new Date().toISOString(),
      status: 'sending',
      createdAt: new Date().toISOString()
    };
    
    // Atualizar mensagens localmente
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    
    try {
      // Enviar mensagem
      const success = await onSendMessage(conversation._id, optimisticMessage.conteudo);
      
      // Atualizar estado da mensagem
      setMessages(prev => 
        prev.map(msg => 
          msg._id === optimisticMessage._id ? 
            { ...msg, status: success ? 'sent' : 'failed' } : 
            msg
        )
      );
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Marcar como falha
      setMessages(prev => 
        prev.map(msg => 
          msg._id === optimisticMessage._id ? 
            { ...msg, status: 'failed' } : 
            msg
        )
      );
    } finally {
      setIsSubmitting(false);
      
      // Focar no input novamente
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };
  
  // Manipular ações do menu
  const handleAction = (action) => {
    if (!conversation) return;
    
    switch (action) {
      case 'finalizar':
        onFinish(conversation._id);
        break;
      case 'transferir':
        onTransfer(conversation._id);
        break;
      case 'arquivar':
        onArchive(conversation._id);
        break;
      default:
        break;
    }
  };
  
  // Manipular reenvio de mensagens com falha
  const handleRetry = (message) => {
    if (!message || !conversation) return;
    
    // Remover a mensagem com falha
    setMessages(prev => prev.filter(msg => msg._id !== message._id));
    
    // Reenviar
    if (retryFailedMessage) {
      retryFailedMessage(conversation._id, message._id, message.conteudo);
    } else {
      // Fallback se retryFailedMessage não estiver disponível
      onSendMessage(conversation._id, message.conteudo);
    }
  };
  
  // Se não há conversa selecionada, mostrar mensagem
  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-800 rounded-lg border border-slate-700">
        <FileText className="h-16 w-16 text-slate-500 mb-4" />
        <h3 className="text-xl text-white font-medium mb-2">Nenhuma conversa selecionada</h3>
        <p className="text-slate-400 max-w-md">
          Selecione uma conversa na lista para visualizar as mensagens e interagir com o cliente.
        </p>
      </div>
    );
  }
  
  // Verificar se há mensagens
  const hasMensagens = messages && messages.length > 0;
  
  return (
    <div id="conversation-detail" className="h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
      <ConversationHeader 
        conversation={conversation} 
        onBack={onBack}
        onAction={handleAction}
      />
      
      <div 
        className="flex-1 overflow-y-auto p-4"
        ref={messageListRef}
      >
        {hasMensagens ? (
          <div className="space-y-1">
            {messages.map((message, index) => (
              <MessageBubble 
                key={`${message._id || index}-${Date.now()}`} 
                message={message}
                onRetry={handleRetry}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-12 w-12 text-slate-500 mb-3" />
            <p className="text-slate-400">Nenhuma mensagem nesta conversa</p>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-slate-700">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#10b981]/30"
            disabled={isSubmitting}
            ref={inputRef}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newMessage.trim()}
            className="px-4 bg-[#10b981] text-white rounded-md hover:bg-[#059669] disabled:opacity-50 disabled:hover:bg-[#10b981]"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationDetail;