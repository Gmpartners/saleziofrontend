import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Função para combinar classes Tailwind com resolução de conflitos
 * Usa clsx para processamento condicional e tailwind-merge para resolver conflitos
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um timestamp para exibição relativa (como "há 5 minutos")
 * @param {string|Date} timestamp - Data a ser formatada
 * @returns {string} - String formatada
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    
    // Menos de um minuto
    if (diffSecs < 60) {
      return 'agora';
    }
    
    // Menos de uma hora
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) {
      return `há ${diffMins}m`;
    }
    
    // Menos de um dia
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `há ${diffHours}h`;
    }
    
    // Menos de uma semana
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `há ${diffDays}d`;
    }
    
    // Formatar como data
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  } catch (error) {
    return '';
  }
}

/**
 * Limita um texto a um número máximo de caracteres
 * @param {string} text - Texto a ser limitado
 * @param {number} maxLength - Comprimento máximo
 * @returns {string} - Texto limitado
 */
export function truncateText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Gera um ID único para uso temporário
 * @returns {string} - ID único
 */
export function generateTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Formata o tamanho de um arquivo para exibição legível
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} - String formatada
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Debounce uma função para evitar muitas chamadas consecutivas
 * @param {Function} func - Função a ser debounced
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} - Função com debounce
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
