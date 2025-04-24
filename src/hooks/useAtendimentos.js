// src/hooks/useAtendimentos.js
import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from './useAuthContext';
import apiService from '../services/api';
import socketService from '../services/socket';

export function useAtendimentos(initialFilters = {}) {
  const { user } = useAuthContext();
  const [atendimentos, setAtendimentos] = useState([]);
  const [selectedAtendimento, setSelectedAtendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Carregar atendimentos com tratamento de erro robusto
  const loadAtendimentos = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getAtendimentos(filters);
      
      if (response.success) {
        setAtendimentos(response.data || []);
        // Se a API retornar informações de paginação
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalItems(response.pagination.totalItems || 0);
        }
      } else {
        console.warn('Aviso: Erro ao carregar atendimentos:', response.error);
        setError(response.error || 'Erro ao carregar conversas');
        // Garantir que o app não quebre mesmo com erro
        setAtendimentos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar atendimentos:', err);
      setError(err.message || 'Erro ao carregar conversas');
      
      // Em caso de erro, fornecer dados de exemplo para desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        setAtendimentos(generateMockAtendimentos(5));
      } else {
        setAtendimentos([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  // Carregar detalhes de um atendimento específico com tratamento de erro robusto
  const loadAtendimentoDetails = useCallback(async (id) => {
    if (!id || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se estamos criando um novo atendimento
      if (id === 'new') {
        // Definir um atendimento vazio para a criação
        setSelectedAtendimento({
          _id: 'new',
          clienteNome: '',
          clienteId: '',
          status: 'novo',
          setor: '',
          mensagens: [],
          criadoEm: new Date().toISOString(),
          ultimaMensagemEm: new Date().toISOString()
        });
        setLoading(false);
        return;
      }
      
      const response = await apiService.getAtendimento(id);
      
      if (response.success && response.data) {
        setSelectedAtendimento(response.data);
        
        // Marcar mensagens como lidas apenas se não estiver finalizado
        if (response.data.status !== 'finalizado') {
          try {
            await apiService.markAtendimentoAsRead(id);
          } catch (markError) {
            console.warn('Erro ao marcar mensagens como lidas:', markError);
            // Não interromper o fluxo se essa chamada falhar
          }
        }
        
        // Notificar socket que está visualizando este atendimento
        try {
          socketService.emit('conversa:selecionar', id);
        } catch (socketError) {
          console.warn('Erro ao selecionar conversa no socket:', socketError);
          // Não interromper o fluxo se essa chamada falhar
        }
      } else {
        setError(response.error || 'Erro ao carregar atendimento');
      }
    } catch (err) {
      console.error(`Erro ao carregar detalhes do atendimento ${id}:`, err);
      setError(err.message || 'Erro ao carregar atendimento');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Enviar mensagem com tratamento de erro mais robusto
  const sendMessage = useCallback(async (mensagem) => {
    if (!selectedAtendimento || !user) return false;
    
    try {
      const response = await apiService.sendMessage(
        selectedAtendimento._id, 
        mensagem, 
        user.uid
      );
      
      if (response.success) {
        return true;
      } else {
        setError(response.error || 'Erro ao enviar mensagem');
        return false;
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError(err.message || 'Erro ao enviar mensagem');
      return false;
    }
  }, [selectedAtendimento, user]);

  // Aceitar atendimento com tratamento de erro melhorado
  const acceptAtendimento = useCallback(async (atendimentoId) => {
    if (!user) return null;
    
    try {
      const response = await apiService.acceptAtendimento(atendimentoId, user.uid);
      
      if (response.success) {
        // Atualizar na lista local
        setAtendimentos(prev => 
          prev.map(item => 
            item._id === atendimentoId ? response.data : item
          )
        );
        
        // Se for o atendimento selecionado, atualizar
        if (selectedAtendimento?._id === atendimentoId) {
          setSelectedAtendimento(response.data);
        }
        
        return response.data;
      } else {
        setError(response.error || 'Erro ao aceitar atendimento');
        return null;
      }
    } catch (err) {
      console.error('Erro ao aceitar atendimento:', err);
      setError(err.message || 'Erro ao aceitar atendimento');
      return null;
    }
  }, [user, selectedAtendimento]);

  // Finalizar atendimento com tratamento de erro melhorado
  const finishAtendimento = useCallback(async (atendimentoId) => {
    if (!user) return null;
    
    try {
      const response = await apiService.finishAtendimento(atendimentoId, user.uid);
      
      if (response.success) {
        // Atualizar na lista local
        setAtendimentos(prev => 
          prev.filter(item => item._id !== atendimentoId)
        );
        
        // Se for o atendimento selecionado, atualizar o status
        if (selectedAtendimento?._id === atendimentoId) {
          setSelectedAtendimento(prev => ({
            ...prev,
            status: 'finalizado'
          }));
        }
        
        return response.data;
      } else {
        setError(response.error || 'Erro ao finalizar atendimento');
        return null;
      }
    } catch (err) {
      console.error('Erro ao finalizar atendimento:', err);
      setError(err.message || 'Erro ao finalizar atendimento');
      return null;
    }
  }, [user, selectedAtendimento]);

  // Atualizar filtros
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Efeito para carregar atendimentos iniciais
  useEffect(() => {
    if (user) {
      loadAtendimentos();
    }
  }, [user, loadAtendimentos]);

  // Configurar socket listeners com tratamento de erro melhorado
  useEffect(() => {
    if (!user) return;

    const setupSocketListeners = async () => {
      try {
        // Conectar ao socket se ainda não estiver
        if (!socketService.isConnected()) {
          await socketService.connect().catch(error => {
            console.warn('Erro ao conectar socket:', error);
            // Continuar mesmo com erro de conexão
          });
        }

        // Registrar listeners com tratamento de erro
        socketService
          .on('conversa:nova', (conversa) => {
            try {
              setAtendimentos(prev => [conversa, ...prev]);
            } catch (error) {
              console.warn('Erro ao processar nova conversa:', error);
            }
          })
          .on('conversa:atualizada', (conversa) => {
            try {
              setAtendimentos(prev => 
                prev.map(c => c._id === conversa._id ? conversa : c)
              );
              
              if (selectedAtendimento?._id === conversa._id) {
                setSelectedAtendimento(conversa);
              }
            } catch (error) {
              console.warn('Erro ao processar atualização de conversa:', error);
            }
          })
          .on('mensagem:nova', (data) => {
            try {
              if (selectedAtendimento?._id === data.conversaId) {
                setSelectedAtendimento(prev => ({
                  ...prev,
                  mensagens: [...(prev.mensagens || []), data]
                }));
              }
            } catch (error) {
              console.warn('Erro ao processar nova mensagem:', error);
            }
          })
          .on('conversa:finalizada', (conversaId) => {
            try {
              setAtendimentos(prev => 
                prev.filter(c => c._id !== conversaId)
              );
              
              if (selectedAtendimento?._id === conversaId) {
                setSelectedAtendimento(prev => ({
                  ...prev,
                  status: 'finalizado'
                }));
              }
            } catch (error) {
              console.warn('Erro ao processar finalização de conversa:', error);
            }
          });
      } catch (error) {
        console.error('Erro ao configurar socket:', error);
      }
    };

    setupSocketListeners();

    // Cleanup
    return () => {
      socketService
        .off('conversa:nova')
        .off('conversa:atualizada')
        .off('mensagem:nova')
        .off('conversa:finalizada');
    };
  }, [user, selectedAtendimento]);

  // Gerar dados de exemplo para desenvolvimento
  const generateMockAtendimentos = (count) => {
    const statuses = ['aguardando', 'em_atendimento', 'finalizado', 'reaberto'];
    const setores = ['Suporte', 'Vendas', 'Financeiro', 'Administrativo'];
    
    return Array.from({ length: count }).map((_, index) => ({
      _id: `mock-${index}`,
      clienteNome: `Cliente Exemplo ${index + 1}`,
      clienteId: `55119${Math.floor(10000000 + Math.random() * 90000000)}`,
      assunto: 'Atendimento de demonstração',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      setor: setores[Math.floor(Math.random() * setores.length)],
      criadoEm: new Date(Date.now() - Math.random() * 604800000).toISOString(), // Últimos 7 dias
      ultimaMensagemEm: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Último dia
      mensagensNaoLidas: Math.floor(Math.random() * 5),
      mensagens: Array.from({ length: Math.floor(3 + Math.random() * 10) }).map(() => ({
        _id: `msg-${Math.random().toString(36).substring(2, 10)}`,
        conteudo: 'Esta é uma mensagem de exemplo.',
        remetente: Math.random() > 0.5 ? 'cliente' : 'atendente',
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
      }))
    }));
  };

  return {
    atendimentos,
    selectedAtendimento,
    loading,
    error,
    filters,
    totalPages,
    totalItems,
    loadAtendimentos,
    loadAtendimentoDetails,
    sendMessage,
    acceptAtendimento,
    finishAtendimento,
    updateFilters,
    setSelectedAtendimento
  };
}