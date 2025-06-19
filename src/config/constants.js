/**
 * Constantes de ambiente e configuração
 */

// API e WebSocket
export const API_URL = import.meta.env.VITE_API_URL || 'https://multi.compracomsegurancaeconfianca.com/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://multi.compracomsegurancaeconfianca.com';
export const API_TOKEN = import.meta.env.VITE_API_TOKEN || 'netwydZWjrJpA';
export const CLIENT_TYPE = 'atendente';
export const APP_VERSION = '1.0.0';

// Nomenclatura da API MultiFlow
export const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  TRANSFERIDA: 'transferida',
  ARQUIVADA: 'arquivada'
};

export const ROLES = {
  ADMIN: 'admin',
  ATTENDANT: 'attendant',
  AGENT: 'agent',
  USER: 'user',
  MANAGER: 'manager'
};

export const REMETENTE = {
  CLIENTE: 'cliente',
  ATENDENTE: 'atendente',
  BOT: 'bot',
  SISTEMA: 'sistema',
  AI: 'ai'
};

export const TIPO_MENSAGEM = {
  TEXTO: 'texto',
  IMAGEM: 'imagem',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENTO: 'documento',
  LOCALIZACAO: 'localizacao',
  TEMPLATE: 'template',
  BOTAO: 'botao'
};

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  SUBSCRIBE_ADMIN: 'subscribe_admin',
  PING: 'ping',
  ERROR: 'connect_error',
  RECONNECT: 'reconnect'
};

export const APP_EVENTS = {
  NOVA_MENSAGEM: 'nova_mensagem',
  NOVA_CONVERSA: 'nova_conversa',
  CONVERSA_ATUALIZADA: 'conversa_atualizada',
  CONVERSA_FINALIZADA: 'conversa_finalizada',
  CONVERSA_TRANSFERIDA: 'conversa_transferida',
  CONVERSA_ARQUIVADA: 'conversa_arquivada',
  PERFIL_ATUALIZADO: 'perfil_atualizado',
  SETOR_ATUALIZADO: 'setor_atualizado'
};

// UI-related constants
export const UI_THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system'
};

export const STATUS_COLORS = {
  'aguardando': 'warning',
  'em_andamento': 'primary',
  'finalizada': 'success',
  'transferida': 'purple',
  'arquivada': 'secondary'
};

export const STATUS_LABELS = {
  'aguardando': 'Aguardando',
  'em_andamento': 'Em Andamento',
  'finalizada': 'Finalizada',
  'transferida': 'Transferida',
  'arquivada': 'Arquivada'
};

// Formatação e UI
export const DATE_FORMAT = 'dd/MM/yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';
export const ISO_DATE_FORMAT = 'yyyy-MM-dd';
export const ISO_DATETIME_FORMAT = 'yyyy-MM-dd\'T\'HH:mm:ss';

// Paginação
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Timeouts
export const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
export const SOCKET_PING_INTERVAL = 30 * 1000; // 30 segundos
export const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_ID: 'userId',
  API_TOKEN: 'apiToken',
  THEME: 'theme',
  NOTIFICATIONS: 'notifications',
  LAST_ACTIVE: 'lastActive',
  PENDING_OPERATIONS: 'pendingOperations'
};