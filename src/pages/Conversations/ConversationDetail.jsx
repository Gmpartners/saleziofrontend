import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Send, Check, CheckCheck, ArrowRight, MoreVertical, 
  XCircle, User, RefreshCw, Paperclip, FileText, Image, 
  Smile, Phone, Video, Share, MessageSquare, Tag, X,
  Clock, CheckCircle, Menu, AlertCircle, CornerUpRight, BrainCircuit,
  MessageCircleMore
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useAuthContext } from '../../hooks/useAuthContext'; // Usando o hook original
import { useSocket } from '../../contexts/SocketContext';
import apiService from '../../services/api';

function ConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, isAdmin } = useAuthContext(); // Usando o hook original
  const { 
    selectedConversation, 
    selectConversation, 
    sendMessage: socketSendMessage,
    transferConversation,
    finishConversation
  } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [atendimento, setAtendimento] = useState(null);
  
  // Estados para a interface
  const [message, setMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showAttachOptions, setShowAttachOptions] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [templateFilter, setTemplateFilter] = useState('');
  const [transferSetor, setTransferSetor] = useState('');
  const [setores, setSetores] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const messageContainerRef = useRef(null);
  // Carregar dados do atendimento
  const loadAtendimento = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se estamos criando um novo atendimento
      if (id === 'new') {
        // Definir um atendimento vazio para a criação
        setAtendimento({
          _id: 'new',
          clienteNome: '',
          clienteId: '',
          status: 'novo',
          setor: userProfile?.setor || '',
          mensagens: [],
          criadoEm: new Date().toISOString(),
          ultimaMensagemEm: new Date().toISOString()
        });
        setLoading(false);
        return;
      }
      
      // Selecionar a conversa no contexto do Socket
      await selectConversation(id);
      
      // Se a conversa estiver disponível no contexto
      if (selectedConversation && selectedConversation._id === id) {
        setAtendimento(selectedConversation);
      } else {
        // Buscar a conversa da API como fallback
        const response = await apiService.getConversationById(id);
        setAtendimento(response);
        
        // Marcar mensagens como lidas
        if (response && response.status !== 'finalizado') {
          try {
            await apiService.addMessage(id, '/marcar-como-lido');
          } catch (markError) {
            console.warn('Erro ao marcar mensagens como lidas:', markError);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar atendimento:', err);
      setError('Erro ao carregar conversa. Por favor tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar dados do atendimento ao iniciar
  useEffect(() => {
    loadAtendimento();
    
    // Carregar setores
    const fetchSetores = async () => {
      try {
        const response = await apiService.getSectors();
        setSetores(response || []);
      } catch (err) {
        console.error('Erro ao carregar setores:', err);
        // Definir dados de exemplo como fallback
        setSetores([
          { _id: 'suporte', nome: 'Suporte' },
          { _id: 'vendas', nome: 'Vendas' },
          { _id: 'financeiro', nome: 'Financeiro' },
          { _id: 'administrativo', nome: 'Administrativo' }
        ]);
      }
    };
    
    // Carregar templates
    const fetchTemplates = async () => {
      try {
        const response = await apiService.getTemplates();
        setTemplates(response || []);
      } catch (err) {
        console.error('Erro ao carregar templates:', err);
        setTemplates([]);
      }
    };
    
    fetchSetores();
    fetchTemplates();
  }, [id]);
  
  // Sincronizar atendimento com o selectedConversation quando este mudar
  useEffect(() => {
    if (selectedConversation && selectedConversation._id === id) {
      setAtendimento(selectedConversation);
    }
  }, [selectedConversation, id]);
  
  // Rolar para a última mensagem quando novas mensagens chegarem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [atendimento?.mensagens]);
  
  // Enviar mensagem
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    // Verificar se é um comando
    if (message.startsWith('/')) {
      try {
        const isCommand = await processCommandMessage(message);
        if (isCommand) {
          setMessage('');
          return;
        }
      } catch (error) {
        console.warn('Erro ao processar comando:', error);
      }
    }
    
    // Se for uma nova conversa
    if (id === 'new' || atendimento?._id === 'new') {
      try {
        // Verificar se temos um clienteId (telefone)
        if (!atendimento?.clienteId) {
          setActionError('É necessário informar o telefone do cliente');
          setTimeout(() => setActionError(null), 3000);
          return;
        }
        
        // Primeiro criar a conversa com a mensagem inicial
        const response = await apiService.updateConversation(null, {
          clienteNome: atendimento.clienteNome || 'Cliente',
          telefone: atendimento.clienteId,
          mensagem: message,
          setor: atendimento.setor || userProfile?.setor || 'Suporte',
        });
        
        if (response) {
          setActionSuccess('Conversa criada com sucesso!');
          setTimeout(() => {
            navigate(`/conversations/${response._id}`);
          }, 1000);
        } else {
          setActionError('Erro ao criar conversa');
          setTimeout(() => setActionError(null), 3000);
        }
      } catch (error) {
        console.error('Erro ao criar conversa:', error);
        setActionError('Erro ao criar conversa: ' + error.message);
        setTimeout(() => setActionError(null), 3000);
      }
      return;
    }
    
    // Enviar mensagem normal
    try {
      // Enviar via socket
      socketSendMessage(id, message);
      setMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Tentar enviar pela API como fallback
      try {
        await apiService.addMessage(id, message);
        setMessage('');
      } catch (apiError) {
        setActionError('Erro ao enviar mensagem: ' + error.message);
        setTimeout(() => setActionError(null), 3000);
      }
    }
  };
  
  // Processar comandos rápidos
  const processCommandMessage = async (text) => {
    // Comando de transferência
    if (text.startsWith('/transferir ')) {
      const setor = text.replace('/transferir ', '').trim();
      if (setor) {
        try {
          await transferConversation(id, setor);
          return true;
        } catch (error) {
          console.error('Erro ao transferir atendimento:', error);
          setActionError('Erro ao transferir atendimento');
          setTimeout(() => setActionError(null), 3000);
          return false;
        }
      }
    }
    
    // Comando de finalização
    if (text === '/finalizar') {
      try {
        await finishConversation(id);
        setActionSuccess('Atendimento finalizado com sucesso');
        setTimeout(() => {
          setActionSuccess(null);
          navigate('/conversations');
        }, 3000);
        return true;
      } catch (error) {
        console.error('Erro ao finalizar atendimento:', error);
        setActionError('Erro ao finalizar atendimento');
        setTimeout(() => setActionError(null), 3000);
        return false;
      }
    }
    
    // Comando de template
    if (text.startsWith('/template ') || text.startsWith('/t ')) {
      const templateName = text.replace(/^\/template |^\/t /, '').trim();
      const template = templates.find(t => 
        t.nome?.toLowerCase() === templateName.toLowerCase()
      );
      
      if (template) {
        socketSendMessage(id, template.conteudo);
        setMessage('');
        return true;
      }
    }
    
    // Comando de ajuda
    if (text === '/help' || text === '/ajuda') {
      const helpText = `Comandos disponíveis:
/transferir [setor] - Transfere a conversa para outro setor
/finalizar - Finaliza esta conversa
/template [nome] ou /t [nome] - Usa um template específico
/help ou /ajuda - Mostra esta mensagem de ajuda`;
      
      // Mostra ajuda no chat (apenas para o atendente)
      setMessage(helpText);
      return true;
    }
    
    return false;
  };
  
  // Aceitar atendimento
  const acceptAtendimento = async () => {
    if (!atendimento || atendimento.status !== 'aguardando') return;
    
    try {
      setLoading(true);
      
      // Atualizar via API
      const response = await apiService.updateConversation(id, {
        status: 'em_atendimento',
        atendenteId: userProfile?.id
      });
      
      if (response) {
        setAtendimento({
          ...atendimento,
          status: 'em_atendimento',
          atendenteId: userProfile?.id,
          atendenteNome: userProfile?.nome
        });
        setActionSuccess('Atendimento aceito com sucesso');
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError('Erro ao aceitar atendimento');
        setTimeout(() => setActionError(null), 3000);
      }
    } catch (err) {
      console.error('Erro ao aceitar atendimento:', err);
      setActionError('Erro ao aceitar atendimento');
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setLoading(false);
    }
  };
  
  // Finalizar atendimento
  const handleFinishAtendimento = async () => {
    if (!atendimento || (atendimento.status !== 'em_atendimento' && atendimento.status !== 'reaberto')) return;
    
    try {
      await finishConversation(id);
      setActionSuccess('Atendimento finalizado com sucesso');
      setTimeout(() => {
        setActionSuccess(null);
        navigate('/conversations');
      }, 3000);
    } catch (err) {
      console.error('Erro ao finalizar atendimento:', err);
      setActionError('Erro ao finalizar atendimento');
      setTimeout(() => setActionError(null), 3000);
    }
  };
  
  // Transferir atendimento
  const handleTransferAtendimento = async () => {
    if (!atendimento || !transferSetor) return;
    
    try {
      setTransferLoading(true);
      await transferConversation(id, transferSetor);
      
      setActionSuccess(`Atendimento transferido para ${transferSetor}`);
      setShowTransferMenu(false);
      
      setTimeout(() => {
        setActionSuccess(null);
        navigate('/conversations');
      }, 3000);
    } catch (err) {
      console.error('Erro ao transferir atendimento:', err);
      setActionError('Erro ao transferir atendimento');
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setTransferLoading(false);
    }
  };
  
  // Usar template
  const useTemplate = (templateContent) => {
    setMessage(templateContent);
    setShowTemplates(false);
    
    // Focar no input de mensagem
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };
  
  // Filtrar templates
  const filteredTemplates = templates.filter(template => 
    templateFilter === '' || 
    template.nome?.toLowerCase().includes(templateFilter.toLowerCase()) ||
    template.conteudo?.toLowerCase().includes(templateFilter.toLowerCase()) ||
    template.tags?.some(tag => tag.toLowerCase().includes(templateFilter.toLowerCase()))
  );
  
  // Formatação de data/hora com tratamento de erros
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      return format(new Date(timestamp), 'HH:mm', { locale: pt });
    } catch (error) {
      console.warn('Erro ao formatar hora:', error);
      return '';
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      return format(new Date(timestamp), 'dd/MM/yyyy', { locale: pt });
    } catch (error) {
      console.warn('Erro ao formatar data:', error);
      return '';
    }
  };
  
  // Renderizar status da mensagem
  const renderMessageStatus = (msg) => {
    if (!msg || msg.remetente !== 'atendente') return null;
    
    if (msg.lida) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    } else if (msg.entregue) {
      return <CheckCheck className="h-3 w-3 text-gray-500" />;
    } else {
      return <Check className="h-3 w-3 text-gray-500" />;
    }
  };
  
  // Status do atendimento
  const getStatusBadge = (status) => {
    switch (status) {
      case 'aguardando':
        return (
          <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full text-xs font-medium">
            Aguardando
          </span>
        );
      case 'em_atendimento':
        return (
          <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-full text-xs font-medium">
            Em Atendimento
          </span>
        );
      case 'finalizado':
        return (
          <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full text-xs font-medium">
            Finalizado
          </span>
        );
      case 'reaberto':
        return (
          <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-1 rounded-full text-xs font-medium">
            Reaberto
          </span>
        );
      case 'novo':
        return (
          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-full text-xs font-medium">
            Novo
          </span>
        );
      default:
        return (
          <span className="bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2 py-1 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  // Tela de carregamento
  if (loading && !atendimento) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0c0b14]">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-green-500 rounded-full"></div>
      </div>
    );
  }

  // Tela de erro
  if (error) {
    return (
      <div className="bg-[#0c0b14] min-h-screen p-4">
        <div className="bg-[#1e1d2b] rounded-xl p-6 shadow-lg max-w-lg mx-auto">
          <div className="flex justify-center mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-white text-center mb-2">Erro ao carregar conversa</h2>
          <p className="text-gray-400 text-center mb-4">{error}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/conversations')}
              className="flex items-center px-4 py-2 bg-[#25243a] text-white rounded-lg hover:bg-[#32313f] transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar para Conversas
            </button>
            <button
              onClick={loadAtendimento}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tratar caso de conversa não encontrada
  if (!atendimento) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0c0b14]">
        <XCircle className="h-12 w-12 text-red-500 mb-4" />
        <div className="text-white text-xl mb-4">Conversa não encontrada</div>
        <button
          onClick={() => navigate('/conversations')}
          className="flex items-center px-4 py-2 bg-[#25243a] text-white rounded-lg hover:bg-[#32313f] transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar para Conversas
        </button>
      </div>
    );
  }

  // Se for uma nova conversa, precisamos coletar informações do cliente
  if (id === 'new' || atendimento._id === 'new') {
    return (
      <div className="bg-[#0c0b14] min-h-screen flex flex-col">
        <header className="bg-[#1e1d2b] border-b border-[#32304a] p-4 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/conversations')}
              className="p-2 rounded-full hover:bg-[#25243a] text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="ml-2">
              <h2 className="text-white font-medium">Nova Conversa</h2>
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-4 bg-[#0c0b14]">
          <div className="max-w-lg mx-auto bg-[#1e1d2b] p-6 rounded-xl shadow-lg">
            <h3 className="text-white text-lg font-medium mb-4">Informações do Cliente</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-300 block mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={atendimento.clienteNome || ''}
                  onChange={(e) => setAtendimento(prev => ({...prev, clienteNome: e.target.value}))}
                  className="w-full bg-[#25243a] border border-[#32304a] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Nome do cliente"
                />
              </div>
              
              <div>
                <label className="text-gray-300 block mb-1">
                  <span className="text-red-400">*</span> Telefone do Cliente (obrigatório)
                </label>
                <input
                  type="text"
                  value={atendimento.clienteId || ''}
                  onChange={(e) => setAtendimento(prev => ({...prev, clienteId: e.target.value}))}
                  className={`w-full bg-[#25243a] border ${!atendimento.clienteId ? 'border-red-500' : 'border-[#32304a]'} rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500`}
                  placeholder="Ex: (11) 98765-4321"
                />
                <p className="text-xs text-gray-300 mt-1">
                  O telefone do cliente é obrigatório para iniciar a conversa
                </p>
              </div>
              
              <div>
                <label className="text-gray-300 block mb-1">Setor</label>
                <select
                  value={atendimento.setor || ''}
                  onChange={(e) => setAtendimento(prev => ({...prev, setor: e.target.value}))}
                  className="w-full bg-[#25243a] border border-[#32304a] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Selecione um setor</option>
                  {setores.map(setor => (
                    <option key={setor._id} value={setor.nome}>{setor.nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-gray-300 block mb-1">
                  <span className="text-red-400">*</span> Primeira Mensagem (obrigatória)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`w-full bg-[#25243a] border ${!message.trim() ? 'border-red-500' : 'border-[#32304a]'} rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none h-24`}
                  placeholder="Digite a primeira mensagem..."
                />
                <p className="text-xs text-gray-300 mt-1">
                  É necessário incluir uma mensagem inicial para criar a conversa
                </p>
              </div>
              
              <div className="pt-4">
                <button
                  onClick={handleSendMessage}
                  disabled={!atendimento.clienteId || !message.trim()}
                  className={`w-full py-3 rounded-lg ${
                    atendimento.clienteId && message.trim()
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-[#32304a] text-gray-500 cursor-not-allowed'
                  } transition-colors font-medium`}
                >
                  Iniciar Conversa
                </button>
                {(!atendimento.clienteId || !message.trim()) && (
                  <div className="text-xs text-red-400 mt-2 bg-red-400/10 border border-red-400/30 p-2 rounded-lg">
                    <p className="font-medium">Atenção:</p>
                    <ul className="list-disc list-inside mt-1">
                      {!atendimento.clienteId && <li>O telefone do cliente é obrigatório</li>}
                      {!message.trim() && <li>A mensagem inicial é obrigatória</li>}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Mensagens de sucesso/erro */}
        {actionSuccess && (
          <div className="fixed top-5 right-5 z-50 bg-green-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center animate-fadeIn">
            <CheckCircle className="h-5 w-5 mr-2" />
            {actionSuccess}
          </div>
        )}
        
        {actionError && (
          <div className="fixed top-5 right-5 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center animate-fadeIn">
            <AlertCircle className="h-5 w-5 mr-2" />
            {actionError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0c0b14] min-h-screen flex flex-col">
      {/* Mensagens de sucesso/erro */}
      {actionSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-green-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center animate-fadeIn">
          <CheckCircle className="h-5 w-5 mr-2" />
          {actionSuccess}
        </div>
      )}
      
      {actionError && (
        <div className="fixed top-5 right-5 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center animate-fadeIn">
          <AlertCircle className="h-5 w-5 mr-2" />
          {actionError}
        </div>
      )}
      
      {/* Cabeçalho da conversa */}
      <header className="bg-[#1e1d2b] border-b border-[#32304a] p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/conversations')}
              className="p-2 rounded-full hover:bg-[#25243a] text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="ml-2 flex items-center">
              <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <h2 className="text-white font-medium">{atendimento.cliente?.nome || 'Cliente'}</h2>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-gray-400">{atendimento.cliente?.telefone}</p>
                  {getStatusBadge(atendimento.status)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {atendimento.status === 'aguardando' && (
              <button
                onClick={acceptAtendimento}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Aceitar Conversa
              </button>
            )}
            
            {(atendimento.status === 'em_atendimento' || atendimento.status === 'reaberto') && (
              <>
                <button
                  onClick={() => setShowTransferMenu(!showTransferMenu)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Transferir
                </button>
                
                <button
                  onClick={handleFinishAtendimento}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Finalizar
                </button>
              </>
            )}
            
            <div className="relative">
              <button
                onClick={() => {
                  setShowOptions(!showOptions);
                  setShowInfo(false);
                  setShowTransferMenu(false);
                }}
                className="p-2 rounded-full hover:bg-[#25243a] text-gray-400 hover:text-white transition-colors"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              
              {showOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-[#25243a] rounded-lg shadow-lg z-20 py-1 border border-[#32304a]">
                  <button 
                    onClick={() => {
                      setShowInfo(!showInfo);
                      setShowOptions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-white hover:bg-[#32313f] transition-colors flex items-center"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Info do cliente
                  </button>
                  <button 
                    onClick={() => {
                      navigate(`/conversations/${id}/history`);
                      setShowOptions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-white hover:bg-[#32313f] transition-colors flex items-center"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Histórico completo
                  </button>
                  {isAdmin && (
                    <button 
                      className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#32313f] transition-colors flex items-center"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Excluir conversa
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Menu de transferência */}
        {showTransferMenu && (
          <div className="absolute right-0 mt-2 w-64 bg-[#25243a] rounded-lg shadow-lg z-20 p-3 border border-[#32304a]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-white text-sm font-medium">Transferir para:</h3>
              <button 
                onClick={() => setShowTransferMenu(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#32313f]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <select
              value={transferSetor}
              onChange={(e) => setTransferSetor(e.target.value)}
              className="w-full bg-[#32304a] text-white border border-[#3d3b59] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
            >
              <option value="">Selecione o setor</option>
              {setores.map(setor => (
                <option key={setor._id} value={setor.nome}>{setor.nome}</option>
              ))}
            </select>
            
            <button
              onClick={handleTransferAtendimento}
              disabled={!transferSetor || transferLoading}
              className={`w-full px-4 py-2 rounded-lg flex items-center justify-center text-white ${
                !transferSetor || transferLoading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors`}
            >
              {transferLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CornerUpRight className="h-4 w-4 mr-2" />
                  Transferir Agora
                </>
              )}
            </button>
          </div>
        )}
      </header>
      
      {/* Painel de informações do cliente (opcional) */}
      {showInfo && (
        <div className="bg-[#1e1d2b] border-b border-[#32304a] p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-medium">Informações do Cliente</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#25243a]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Nome:</p>
              <p className="text-white">{atendimento.cliente?.nome || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400">Telefone:</p>
              <p className="text-white">{atendimento.cliente?.telefone}</p>
            </div>
            <div>
              <p className="text-gray-400">Primeiro contato:</p>
              <p className="text-white">{formatDate(atendimento.criadoEm)}</p>
            </div>
            <div>
              <p className="text-gray-400">Atendimentos anteriores:</p>
              <p className="text-white">{atendimento.atendimentosAnteriores || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400">Setor:</p>
              <p className="text-white">{atendimento.setor || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400">Atendente:</p>
              <p className="text-white">{atendimento.atendenteNome || 'Não atribuído'}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Área de mensagens */}
      <div 
        ref={messageContainerRef}
        className="flex-1 p-4 overflow-y-auto bg-[#0c0b14]"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Data e início da conversa */}
          <div className="flex justify-center mb-6">
            <div className="bg-[#1e1d2b] rounded-full px-3 py-1 text-sm text-gray-400">
              {formatDate(atendimento.criadoEm)}
            </div>
          </div>
          
          {/* Mensagens */}
          {(atendimento.mensagens || []).map((msg, index) => {
            const isOutgoing = msg.remetente === 'atendente';
            const isBot = msg.remetente === 'ia';
            
            return (
              <div 
                key={msg.id || index} 
                className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`relative max-w-xs sm:max-w-md p-3 rounded-lg ${
                    isOutgoing
                      ? 'bg-green-600 text-white rounded-br-none'
                      : isBot
                        ? 'bg-purple-600/20 text-purple-100 rounded-bl-none'
                        : 'bg-[#1e1d2b] text-white rounded-bl-none'
                  }`}
                >
                  {isBot && (
                    <div className="flex items-center mb-1 text-xs text-purple-300 font-medium">
                      <BrainCircuit className="h-3 w-3 mr-1" />
                      Assistente IA
                    </div>
                  )}
                  
                  {!isBot && !isOutgoing && (
                    <div className="mb-1 text-xs text-gray-400 font-medium">
                      {atendimento.cliente?.nome || 'Cliente'}
                    </div>
                  )}
                  
                  <div className="text-sm whitespace-pre-line">{msg.conteudo}</div>
                  
                  <div className="flex justify-end items-center mt-1 text-xs">
                    <span className={`${isOutgoing ? 'text-white/70' : 'text-gray-500'}`}>
                      {formatMessageTime(msg.timestamp)}
                    </span>
                    
                    {isOutgoing && (
                      <span className="ml-1">
                        {renderMessageStatus(msg)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Se não houver mensagens, mostrar mensagem padrão */}
          {(!atendimento.mensagens || atendimento.mensagens.length === 0) && (
            <div className="text-center py-8">
              <MessageCircleMore className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Ainda não há mensagens nesta conversa.</p>
              {atendimento.status !== 'finalizado' && (
                <p className="text-gray-500 text-sm mt-2">Comece a conversar enviando uma mensagem abaixo.</p>
              )}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Área de entrada de mensagem */}
      <div className="bg-[#1e1d2b] border-t border-[#32304a] p-4">
        <div className="max-w-4xl mx-auto">
          {/* Menu de Templates */}
          {showTemplates && (
            <div className="bg-[#25243a] rounded-lg p-3 mb-3 shadow-lg max-h-72 overflow-y-auto">
              <div className="mb-3">
                <input
                  type="text"
                  value={templateFilter}
                  onChange={(e) => setTemplateFilter(e.target.value)}
                  placeholder="Buscar templates..."
                  className="w-full bg-[#32304a] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-2 text-gray-400">
                  Nenhum template encontrado
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template._id}
                      onClick={() => useTemplate(template.conteudo)}
                      className="bg-[#1e1d2b] p-2 rounded-lg cursor-pointer hover:bg-[#32313f] transition-colors"
                    >
                      <div className="font-medium text-white text-sm mb-1">{template.nome}</div>
                      <div className="text-gray-400 text-xs line-clamp-2">{template.conteudo}</div>
                      
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.tags && template.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded-full text-xs bg-[#32304a] text-gray-300">
                            {tag}
                          </span>
                        ))}
                        {template.tags && template.tags.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-full text-xs bg-[#32304a] text-gray-300">
                            +{template.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Menu de opções de anexo */}
          {showAttachOptions && (
            <div className="bg-[#25243a] rounded-lg p-3 mb-3 shadow-lg animate-fadeIn">
              <div className="flex flex-wrap justify-center gap-4">
                <button className="flex flex-col items-center p-3 hover:bg-[#32304a] rounded-lg transition-colors">
                  <div className="p-2 bg-[#32304a] rounded-full mb-1">
                    <Image className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-xs text-gray-300">Imagem</span>
                </button>
                
                <button className="flex flex-col items-center p-3 hover:bg-[#32304a] rounded-lg transition-colors">
                  <div className="p-2 bg-[#32304a] rounded-full mb-1">
                    <FileText className="h-5 w-5 text-green-400" />
                  </div>
                  <span className="text-xs text-gray-300">Documento</span>
                </button>
                
                <button className="flex flex-col items-center p-3 hover:bg-[#32304a] rounded-lg transition-colors">
                  <div className="p-2 bg-[#32304a] rounded-full mb-1">
                    <Phone className="h-5 w-5 text-red-400" />
                  </div>
                  <span className="text-xs text-gray-300">Áudio</span>
                </button>
                
                <button className="flex flex-col items-center p-3 hover:bg-[#32304a] rounded-lg transition-colors">
                  <div className="p-2 bg-[#32304a] rounded-full mb-1">
                    <Video className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-xs text-gray-300">Vídeo</span>
                </button>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowTemplates(!showTemplates);
                  setShowAttachOptions(false);
                  setShowEmojis(false);
                }}
                className="rounded-full p-3 bg-[#25243a] text-gray-400 hover:text-white transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowAttachOptions(!showAttachOptions);
                  setShowTemplates(false);
                  setShowEmojis(false);
                }}
                className="rounded-full p-3 bg-[#25243a] text-gray-400 hover:text-white transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative flex-1">
              <textarea
                ref={messageInputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={atendimento.status === 'finalizado' 
                  ? 'Esta conversa foi finalizada'
                  : "Digite sua mensagem... (use /help para comandos)"
                }
                disabled={atendimento.status === 'finalizado'}
                className={`w-full bg-[#25243a] border border-[#32304a] rounded-lg pl-4 pr-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none h-12 max-h-32 ${
                  atendimento.status === 'finalizado' ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                rows={1}
              />
              
              {/* Mostrar dica de comandos */}
              {message.startsWith('/') && (
                <div className="absolute left-0 bottom-full mb-2 w-full bg-[#25243a] border border-[#32304a] rounded-lg shadow-lg p-2 text-xs text-gray-300 z-10">
                  <strong>Comandos:</strong> /transferir [setor], /finalizar, /template [nome], /help
                </div>
              )}
              
              <button
                type="button"
                onClick={() => {
                  setShowEmojis(!showEmojis);
                  setShowTemplates(false);
                  setShowAttachOptions(false);
                }}
                className="absolute right-3 bottom-2.5 text-gray-400 hover:text-white transition-colors"
              >
                <Smile className="h-5 w-5" />
              </button>
              
              {/* Emoji picker */}
              {showEmojis && (
                <div className="absolute right-0 bottom-full mb-2 bg-[#25243a] rounded-lg shadow-lg p-3 border border-[#32304a] w-72 z-10">
                  <div className="grid grid-cols-8 gap-2">
                    {/* Emojis comuns */}
                    {["😀", "😂", "🙂", "😊", "😍", "🤔", "😒", "😢", 
                      "👍", "👎", "👌", "👏", "🙏", "🤝", "💪", "👋",
                      "❤️", "💔", "💯", "✅", "❌", "⭐", "🔥", "⚡"].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setMessage(prev => prev + emoji)}
                        className="text-2xl hover:bg-[#32304a] p-1 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={!message.trim() || atendimento.status === 'finalizado'}
              className={`rounded-full p-3 ${
                message.trim() && atendimento.status !== 'finalizado'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-[#25243a] text-gray-500 cursor-not-allowed'
              } transition-colors`}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            {atendimento.status === 'finalizado'
              ? 'Esta conversa foi finalizada. Você não pode enviar mais mensagens.'
              : 'Pressione Enter para enviar. Shift+Enter para nova linha. Use / para comandos.'}
          </div>
        </div>
      </div>
      
      {/* CSS Animations */}
      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default ConversationDetail;