import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeftCircle, UserCircle, MoreVertical } from 'lucide-react';
import { io } from 'socket.io-client';
import axios from 'axios';

// Componente de chat autônomo que ignora toda a infraestrutura existente
const StandaloneChat = ({ conversationId, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const inputRef = useRef(null);
  
  // API token e URL
  const API_TOKEN = 'netwydZWjrJpA';
  const API_URL = 'https://multi.compracomsegurancaeconfianca.com';
  const SOCKET_URL = 'https://multi.compracomsegurancaeconfianca.com';
  
  // Usuário e setor do localStorage
  const userId = localStorage.getItem('userId') || '';
  
  // Criar instância de axios independente
  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'x-api-token': API_TOKEN
    },
    timeout: 10000
  });
  
  // Inicializar socket
  useEffect(() => {
    if (!conversationId || !userId) return;
    
    console.log('Inicializando socket independente...');
    
    // Criar socket
    const newSocket = io(SOCKET_URL, {
      auth: {
        token: API_TOKEN,
        userId: userId,
        role: 'agent'
      },
      reconnection: true,
      transports: ['websocket'],
      forceNew: true  // Força uma nova conexão independente
    });
    
    // Event listeners
    newSocket.on('connect', () => {
      console.log('🟢 Socket conectado!', newSocket.id);
      
      // Entrar nas salas relevantes
      newSocket.emit('join', `user_${userId}`);
      newSocket.emit('join', `user_${userId}_conversa_${conversationId}`);
    });
    
    newSocket.on('disconnect', () => {
      console.log('🔴 Socket desconectado!');
    });
    
    newSocket.on('nova_mensagem', (data) => {
      console.log('📩 Nova mensagem recebida:', data);
      
      if (data.conversaId === conversationId) {
        // Verificar se a mensagem já existe para evitar duplicatas
        setMessages(prev => {
          // Verificar se a mensagem já existe
          const exists = prev.some(msg => 
            msg._id === data.mensagem._id || 
            (msg.conteudo === data.mensagem.conteudo && msg.timestamp === data.mensagem.timestamp)
          );
          
          if (!exists) {
            // Se não existir, adicionar à lista
            return [...prev, { 
              ...data.mensagem, 
              remetente: data.mensagem.remetente || 'cliente'
            }];
          }
          return prev;
        });
      }
    });
    
    // Salvar referência do socket
    setSocket(newSocket);
    
    // Limpar ao desmontar
    return () => {
      console.log('Desconectando socket independente...');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [conversationId, userId]);
  
  // Carregar conversa e mensagens
  useEffect(() => {
    if (!conversationId || !userId) return;
    
    const loadConversation = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`Carregando conversa ${conversationId} diretamente...`);
        
        // Buscar detalhes da conversa
        const response = await api.get(`/users/${userId}/conversas/${conversationId}`);
        
        if (response.data && response.data.success && response.data.data) {
          console.log('✅ Conversa carregada com sucesso:', response.data.data);
          
          // Atualizar conversa
          setConversation(response.data.data);
          
          // Garantir que existe um array de mensagens e configurá-lo
          if (response.data.data.mensagens && Array.isArray(response.data.data.mensagens)) {
            // Garantir que todas as mensagens têm os campos necessários
            const processedMessages = response.data.data.mensagens.map(msg => ({
              ...msg,
              remetente: msg.remetente || (msg.remetente === 'atendente' ? 'atendente' : 'cliente'),
              status: msg.status || 'sent'
            }));
            
            setMessages(processedMessages);
          } else {
            setMessages([]);
          }
          
          // Atualizar status para 'em_andamento' se necessário
          if (response.data.data.status === 'aguardando') {
            api.put(`/users/${userId}/conversas/${conversationId}/status`, { 
              status: 'em_andamento' 
            });
          }
        } else {
          console.error('❌ Erro ao carregar conversa:', response.data);
          setError('Não foi possível carregar os detalhes da conversa.');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar conversa:', error);
        setError(`Erro: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConversation();
  }, [conversationId, userId, api]);
  
  // Manter scroll na parte inferior quando mensagens forem atualizadas
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Focar no input quando a conversa carregar
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, conversation]);
  
  // Enviar mensagem
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !conversationId) return;
    
    // Adicionar mensagem otimista
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      conversaId: conversationId,
      conteudo: newMessage.trim(),
      remetente: 'atendente',
      timestamp: new Date().toISOString(),
      status: 'sending',
      createdAt: new Date().toISOString()
    };
    
    // Atualizar estado local
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    
    try {
      // Enviar para servidor
      console.log('⬆️ Enviando mensagem:', optimisticMessage.conteudo);
      
      const response = await api.post(
        `/users/${userId}/conversas/${conversationId}/mensagens`,
        { conteudo: optimisticMessage.conteudo }
      );
      
      if (response.data && response.data.success) {
        console.log('✅ Mensagem enviada com sucesso!', response.data);
        
        // Atualizar status da mensagem otimista
        setMessages(prev => 
          prev.map(msg => 
            msg._id === optimisticMessage._id 
              ? { 
                  ...msg, 
                  _id: response.data.data?.mensagemId || msg._id,
                  status: 'sent' 
                } 
              : msg
          )
        );
        
        // Rolagem automática
        if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
        
        // Mostrar toast de sucesso
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
        toast.innerText = 'Mensagem enviada com sucesso';
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.remove();
        }, 3000);
        
        return true;
      } else {
        throw new Error('Falha ao enviar mensagem');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      
      // Atualizar status da mensagem para 'falha'
      setMessages(prev => 
        prev.map(msg => 
          msg._id === optimisticMessage._id 
            ? { ...msg, status: 'failed' } 
            : msg
        )
      );
      
      // Exibir erro
      alert('Erro ao enviar mensagem. Tente novamente.');
      
      return false;
    } finally {
      // Focar no input novamente
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };
  
  // Componente para mensagem
  const MessageBubble = ({ message }) => {
    const isAtendente = message.remetente === 'atendente';
    
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } catch (error) {
        return '';
      }
    };
    
    if (isAtendente) {
      return (
        <div className="flex flex-col items-end mb-2">
          <div className="bg-green-500 text-white px-3 py-2 rounded-tl-lg rounded-bl-lg rounded-br-lg max-w-[75%]">
            {message.conteudo}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {formatTime(message.timestamp || message.createdAt)}
            {message.status === 'sending' && ' • Enviando...'}
            {message.status === 'failed' && ' • Falha ao enviar'}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-start mb-2">
          <div className="bg-gray-700 text-white px-3 py-2 rounded-tr-lg rounded-br-lg rounded-bl-lg max-w-[75%]">
            {message.conteudo}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {formatTime(message.timestamp || message.createdAt)}
          </div>
        </div>
      );
    }
  };
  
  // Renderizar tela de carregamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-green-500 border-gray-700 rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-300">Carregando conversa...</p>
        </div>
      </div>
    );
  }
  
  // Renderizar erro
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="w-12 h-12 text-red-500 mb-4 mx-auto">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }
  
  // Renderizar chat
  return (
    <div className="flex flex-col h-full bg-gray-900 rounded overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center p-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeftCircle className="h-5 w-5" />
          </button>
          
          <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
            <UserCircle className="h-6 w-6" />
          </div>
          
          <div>
            <h3 className="text-white font-medium">{conversation?.nomeCliente || 'Cliente'}</h3>
            <div className="text-xs text-gray-400">
              {conversation?.telefoneCliente || 'Sem telefone'}
            </div>
          </div>
        </div>
        
        <div>
          <button 
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 transition-colors"
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
        {messages.length > 0 ? (
          <div className="space-y-2">
            {messages.map((message, index) => (
              <MessageBubble 
                key={`${message._id || index}-${index}`} 
                message={message} 
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Nenhuma mensagem nesta conversa.</p>
          </div>
        )}
      </div>
      
      {/* Formulário de envio */}
      <div className="p-3 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500"
            ref={inputRef}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:hover:bg-green-500 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default StandaloneChat;