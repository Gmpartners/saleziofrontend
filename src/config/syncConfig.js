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
  deleteSetor: (userId, setorId) => `/users/${userId}/setores/${setorId}`,
  
  // Endpoints de conversas
  getConversas: (userId) => `/users/${userId}/conversas`,
  getConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}`,
  getConversaByTelefone: (userId, telefone) => `/users/${userId}/conversas/telefone/${telefone}`,
  addMensagem: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/mensagens`,
  transferirConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/transferir`,
  updateStatus: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/status`,
  finalizarConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/finalizar`,
  arquivarConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/arquivo`,
  desarquivarConversa: (userId, conversaId) => `/users/${userId}/conversas/${conversaId}/desarquivar`
};

// Configurações de retry
export const SYNC_CONFIG = {
  maxRetries: 3,           // Número máximo de tentativas
  baseRetryDelay: 1000,    // Delay inicial em ms
  maxRetryDelay: 30000,    // Delay máximo em ms
  jitter: 0.3              // Fator de jitter para randomizar delays (0-1)
};