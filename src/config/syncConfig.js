/**
 * Configurações para sincronização entre Firebase e API MultiFlow
 */

// URL base da API 
export const API_URL = import.meta.env.VITE_API_URL || "https://multi.compracomsegurancaeconfianca.com/api";

// Token da API (usando o token existente)
export const API_TOKEN = import.meta.env.VITE_API_TOKEN || "netwydZWjrJpA";

// Nome do header de autenticação (conforme documentação)
export const AUTH_HEADER = "x-api-token";

// Endpoints da API (conforme documentação)
export const API_ENDPOINTS = {
  // Endpoints de setores
  getSetores: (userId) => `/users/${userId}/setores`,
  getSetor: (userId, setorId) => `/users/${userId}/setores/${setorId}`,
  createSetor: (userId) => `/users/${userId}/setores`,
  updateSetor: (userId, setorId) => `/users/${userId}/setores/${setorId}`,
  updateSetorDetalhado: (userId, setorId) => `/users/${userId}/setores/${setorId}/detalhado`,
  deleteSetor: (userId, setorId) => `/users/${userId}/setores/${setorId}`,
  syncSetor: (userId, setorId) => `/users/${userId}/setores/${setorId}/sync`,
  
  // Endpoints de conversas
  getConversas: (userId) => `/users/${userId}/conversas`,
  getConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}`,
  getConversaByTelefone: (userId, telefone) => `/users/${userId}/conversas/telefone/${telefone}`,
  getMensagens: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/mensagens`,
  addMensagem: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/mensagens`,
  transferirConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/transferir`,
  updateStatus: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/status`,
  finalizarConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/finalizar`,
  arquivarConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/arquivo`,
  desarquivarConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/desarquivar`,
  deleteConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}`,
  
  // Endpoint para marcar mensagens como lidas
  markRead: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/ler`,
  markMessageRead: (userId, conversaId, messageId) => `/users/${userId}/conversas/${conversaId}/mensagens/${messageId}/ler`,
  
  // Endpoints de administração
  getDashboard: (userId) => `/users/${userId}/dashboard`,
  getDashboardSetor: (userId, setorId) => `/users/${userId}/setores/${setorId}/dashboard`,
  getAdminStats: (userId) => `/users/${userId}/admin/stats`,
  getConfigIA: (userId) => `/users/${userId}/config-ia`,
  updateConfigIA: (userId) => `/users/${userId}/config-ia`
};

// Configurações de retry
export const SYNC_CONFIG = {
  maxRetries: 3,           // Número máximo de tentativas
  baseRetryDelay: 1000,    // Delay inicial em ms
  maxRetryDelay: 30000,    // Delay máximo em ms
  jitter: 0.3,             // Fator de jitter para randomizar delays (0-1)
  timeoutMs: 15000,        // Timeout para requisições (15 segundos)
  batchSize: 50            // Tamanho máximo de lote para sincronização
};

// Configurações de cache
export const CACHE_CONFIG = {
  shortTTL: 60 * 1000,     // 1 minuto para dados voláteis
  mediumTTL: 5 * 60 * 1000, // 5 minutos para dados semi-estáticos
  longTTL: 30 * 60 * 1000,  // 30 minutos para dados estáticos
  maxCacheSize: {
    conversations: 500,    // Máximo de conversas em cache
    completedConversations: 200, // Máximo de conversas finalizadas
    messages: 1000,        // Máximo de mensagens
    sectors: 20            // Máximo de setores
  }
};

// Configurações de sincronização offline
export const OFFLINE_CONFIG = {
  enabled: true,           // Habilitar suporte offline
  syncInterval: 60000,     // Intervalo de sincronização em ms (1 minuto)
  maxQueueSize: 1000,      // Tamanho máximo da fila de operações pendentes
  persistQueue: true       // Persistir fila entre sessões
};