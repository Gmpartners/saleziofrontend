/**
 * Serviço para integração com a API de WhatsApp
 */
const axios = require('axios');

// Configuração da API
const API_URL = 'https://zap.midasrec.com';
const API_KEY = process.env.WHATSAPP_API_KEY || '9TKSUsh2PAV9TKSUsh2PAV';

// Cliente HTTP para chamadas à API
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'apikey': API_KEY
  }
});

/**
 * Envia uma mensagem de texto via WhatsApp
 * @param {string} number - Número do destinatário no formato internacional (ex: 5521964738621)
 * @param {string} text - Texto da mensagem
 * @param {string} userId - ID do usuário/atendente que está enviando a mensagem
 * @returns {Promise} - Resultado da requisição
 */
const sendTextMessage = async (number, text, userId = 'system') => {
  try {
    const response = await apiClient.post('/message/sendText/zapnumber', {
      number,
      text
    });
    
    console.log(`[WhatsApp] Mensagem enviada para ${number} por ${userId}: ${text}`);
    return response.data;
  } catch (error) {
    console.error('[WhatsApp] Erro ao enviar mensagem:', error.message);
    throw new Error(`Falha ao enviar mensagem: ${error.message}`);
  }
};

/**
 * Processa uma mensagem recebida via webhook
 * @param {Object} data - Dados da mensagem recebida
 * @returns {Object} - Mensagem processada para o formato interno
 */
const processIncomingMessage = (data) => {
  console.log('[WhatsApp] Mensagem recebida:', JSON.stringify(data));
  
  try {
    // Extrair informações relevantes do payload
    // Adaptação do formato da API para o formato interno da aplicação
    // Isso dependerá do formato exato do webhook recebido
    
    const processedMessage = {
      telefone: data.from || data.number || '',
      nome: data.pushname || data.sender || 'Cliente',
      mensagem: data.body || data.text || '',
      timestamp: new Date().toISOString(),
      plataforma: 'whatsapp',
      userId: data.userId || 'alfa', // Usar o ID de usuário padrão 'alfa' se não for fornecido
      metadata: data // Manter todos os dados originais para referência
    };
    
    console.log('[WhatsApp] Mensagem processada:', JSON.stringify(processedMessage));
    return processedMessage;
  } catch (error) {
    console.error('[WhatsApp] Erro ao processar mensagem recebida:', error.message);
    throw new Error(`Falha ao processar mensagem: ${error.message}`);
  }
};

module.exports = {
  sendTextMessage,
  processIncomingMessage
};
