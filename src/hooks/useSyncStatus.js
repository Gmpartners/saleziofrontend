import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from './useAuthContext';
import axios from 'axios';
import { API_URL, API_TOKEN } from '../config/syncConfig';

/**
 * Hook para monitorar e controlar o status de sincronização entre Firebase e API/MongoDB
 * 
 * @returns {Object} { 
 *   status, isSync, isSyncing, lastSync, forceSyncUser, 
 *   forceSyncSector, error, clearError, isApiOnline 
 * }
 */
export const useSyncStatus = () => {
  const { userProfile, syncStatus, syncUserWithAPI } = useAuthContext();
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [isApiOnline, setIsApiOnline] = useState(false);
  
  // Verificar se a API está disponível
  const checkApiConnection = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/health`, { 
        timeout: 5000,
        headers: { 'X-API-Key': API_TOKEN }
      });
      setIsApiOnline(response.status === 200);
      setLastChecked(new Date());
      setError(null);
      return true;
    } catch (err) {
      setIsApiOnline(false);
      setError("API indisponível: " + (err.response?.data?.message || err.message));
      return false;
    }
  }, []);
  
  // Forçar sincronização do usuário atual
  const forceSyncUser = useCallback(async () => {
    if (!userProfile) {
      setError("Nenhum usuário autenticado");
      return false;
    }
    
    try {
      const result = await syncUserWithAPI(userProfile);
      setError(null);
      return result;
    } catch (err) {
      setError("Erro ao sincronizar usuário: " + err.message);
      return false;
    }
  }, [userProfile, syncUserWithAPI]);
  
  // Forçar sincronização de um setor específico
  const forceSyncSector = useCallback(async (sectorId) => {
    if (!userProfile) {
      setError("Nenhum usuário autenticado");
      return false;
    }
    
    try {
      // Obter token para autenticação
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error("Token de autenticação não encontrado");
      }
      
      // Chamar API para forçar sincronização do setor
      const response = await axios.post(
        `${API_URL}/sync/sector/${sectorId}/force`, 
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-API-Key': API_TOKEN
          }
        }
      );
      
      setError(null);
      return response.data;
    } catch (err) {
      setError("Erro ao sincronizar setor: " + (err.response?.data?.message || err.message));
      return false;
    }
  }, [userProfile]);
  
  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Verificar status da API ao montar o componente
  useEffect(() => {
    checkApiConnection();
    
    // Verificar periodicamente
    const interval = setInterval(() => {
      checkApiConnection();
    }, 5 * 60 * 1000); // A cada 5 minutos
    
    return () => clearInterval(interval);
  }, [checkApiConnection]);
  
  return {
    // Status geral
    status: syncStatus?.status || 'unknown',
    
    // Estados derivados
    isSync: syncStatus?.status === 'success',
    isSyncing: syncStatus?.status === 'syncing',
    
    // Data da última sincronização
    lastSync: syncStatus?.timestamp,
    
    // Funções para forçar sincronização
    forceSyncUser,
    forceSyncSector,
    checkConnection: checkApiConnection,
    
    // Status da API
    isApiOnline,
    lastChecked,
    
    // Tratamento de erro
    error,
    clearError
  };
};
