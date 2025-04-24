// src/hooks/useDashboardMetrics.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthContext } from './useAuthContext';
import apiService from '../services/api';

export function useDashboardMetrics() {
  const { user } = useAuthContext();
  const [summary, setSummary] = useState(null);
  const [tempoMedio, setTempoMedio] = useState([]);
  const [volumeAtendimentos, setVolumeAtendimentos] = useState([]);
  const [atendimentosAguardando, setAtendimentosAguardando] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('dia');
  const [setor, setSetor] = useState('todos');
  
  // Ref para controlar se o componente está montado
  const isMounted = useRef(true);
  
  // Ref para armazenar parâmetros atuais
  const currentParams = useRef({
    periodo,
    setor,
    dataLoaded: false
  });

  // Carregar resumo do dashboard
  const loadDashboardSummary = useCallback(async () => {
    if (!user || !isMounted.current) return;
    
    try {
      const result = await apiService.getDashboardSummary();
      
      if (isMounted.current) {
        setSummary(result);
      }
    } catch (err) {
      console.error('Erro ao carregar resumo do dashboard:', err);
    }
  }, [user]);

  // Carregar tempo médio
  const loadTempoMedio = useCallback(async () => {
    if (!user || !isMounted.current) return;
    
    try {
      const result = await apiService.getTempoMedio(setor, periodo);
      
      if (isMounted.current) {
        setTempoMedio(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      console.error('Erro ao carregar tempo médio:', err);
    }
  }, [user, setor, periodo]);

  // Carregar volume de atendimentos
  const loadVolumeAtendimentos = useCallback(async () => {
    if (!user || !isMounted.current) return;
    
    try {
      const result = await apiService.getVolumeAtendimentos(setor, periodo);
      
      if (isMounted.current) {
        setVolumeAtendimentos(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      console.error('Erro ao carregar volume de atendimentos:', err);
    }
  }, [user, setor, periodo]);

  // Carregar atendimentos aguardando
  const loadAtendimentosAguardando = useCallback(async () => {
    if (!user || !isMounted.current) return;
    
    try {
      const result = await apiService.getAtendimentosAguardando();
      
      if (isMounted.current) {
        setAtendimentosAguardando(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      console.error('Erro ao carregar atendimentos aguardando:', err);
    }
  }, [user]);

  // Carregar todas as métricas
  const loadAllMetrics = useCallback(async () => {
    if (!user || !isMounted.current || loading) return;
    
    // Verificar se já carregamos dados com os parâmetros atuais
    if (currentParams.current.dataLoaded && 
        currentParams.current.periodo === periodo && 
        currentParams.current.setor === setor) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Executar em paralelo para melhor performance
      await Promise.all([
        loadDashboardSummary(),
        loadTempoMedio(),
        loadVolumeAtendimentos(),
        loadAtendimentosAguardando()
      ]);
      
      // Atualizar parâmetros atuais
      currentParams.current = {
        periodo,
        setor,
        dataLoaded: true
      };
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
      if (isMounted.current) {
        setError('Falha ao carregar dados. Tente novamente.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [
    user,
    loading,
    periodo,
    setor,
    loadDashboardSummary,
    loadTempoMedio,
    loadVolumeAtendimentos,
    loadAtendimentosAguardando
  ]);

  // Alterar período
  const changePeriodo = useCallback((newPeriodo) => {
    if (newPeriodo !== periodo) {
      setPeriodo(newPeriodo);
    }
  }, [periodo]);

  // Alterar setor
  const changeSetor = useCallback((newSetor) => {
    if (newSetor !== setor) {
      setSetor(newSetor);
    }
  }, [setor]);

  // Efeito para carregar métricas iniciais
  useEffect(() => {
    // Garantir que o componente está montado
    isMounted.current = true;
    
    // Carregar dados apenas uma vez na montagem do componente
    if (user && !currentParams.current.dataLoaded) {
      loadAllMetrics();
    }
    
    // Limpar ao desmontar
    return () => {
      isMounted.current = false;
    };
  }, [user, loadAllMetrics]);

  // Efeito para recarregar quando período ou setor mudar
  useEffect(() => {
    // Verificar se os parâmetros mudaram significativamente
    if (user && 
        (currentParams.current.periodo !== periodo || 
         currentParams.current.setor !== setor)) {
      
      // Apenas atualizar tempo médio e volume, que dependem dos parâmetros
      const updateData = async () => {
        if (!isMounted.current) return;
        
        try {
          const [tempoResult, volumeResult] = await Promise.all([
            apiService.getTempoMedio(setor, periodo),
            apiService.getVolumeAtendimentos(setor, periodo)
          ]);
          
          if (isMounted.current) {
            setTempoMedio(Array.isArray(tempoResult) ? tempoResult : []);
            setVolumeAtendimentos(Array.isArray(volumeResult) ? volumeResult : []);
            
            // Atualizar parâmetros atuais
            currentParams.current = {
              ...currentParams.current,
              periodo,
              setor
            };
          }
        } catch (err) {
          console.error('Erro ao atualizar dados:', err);
        }
      };
      
      updateData();
    }
  }, [user, periodo, setor]);

  return {
    summary,
    tempoMedio,
    volumeAtendimentos,
    atendimentosAguardando,
    loading,
    error,
    periodo,
    setor,
    changePeriodo,
    changeSetor,
    loadAllMetrics
  };
}