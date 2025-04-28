/**
 * Constantes de ambiente e configuração
 */

// API e WebSocket
export const API_URL = import.meta.env.VITE_API_URL || 'https://multi.compracomsegurancaeconfianca.com/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://multi.compracomsegurancaeconfianca.com';
export const API_TOKEN = import.meta.env.VITE_API_TOKEN || 'netwydZWjrJpA';

// Nomenclatura da API MultiFlow
export const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada'
};

export const REMETENTE = {
  CLIENTE: 'cliente',
  ATENDENTE: 'atendente',
  BOT: 'bot'
};

export const TIPO_MENSAGEM = {
  TEXTO: 'texto',
  IMAGEM: 'imagem',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENTO: 'documento',
  LOCALIZACAO: 'localizacao'
};

export const EVENTOS = {
  NOVA_MENSAGEM: 'nova_mensagem',
  NOVA_CONVERSA: 'nova_conversa',
  CONVERSA_ATUALIZADA: 'conversa_atualizada'
};

// Formatação e UI
export const DATE_FORMAT = 'dd/MM/yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

// Paginação
export const DEFAULT_PAGE_SIZE = 20;