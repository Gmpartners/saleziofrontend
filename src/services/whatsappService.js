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
    // Limpar o número se tiver o formato WhatsApp (com @s.whatsapp.net)
    const cleanNumber = number.includes('@') ? number.split('@')[0] : number;
    
    const response = await apiClient.post('/message/sendText/zapnumber', {
      number: cleanNumber,
      text
    });
    
    console.log(`[WhatsApp] Mensagem enviada para ${cleanNumber} por ${userId}: ${text}`);
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
    let phone = '';
    let name = 'Cliente';
    let message = '';
    
    // Nova estrutura da API do WhatsApp
    if (data.event === 'messages.upsert' && data.data) {
      const whatsappData = data.data;
      
      if (whatsappData.key && whatsappData.key.remoteJid) {
        phone = whatsappData.key.remoteJid.split('@')[0];
      }
      
      if (whatsappData.pushName) {
        name = whatsappData.pushName;
      }
      
      if (whatsappData.message) {
        if (whatsappData.message.conversation) {
          message = whatsappData.message.conversation;
        } else if (whatsappData.message.extendedTextMessage && whatsappData.message.extendedTextMessage.text) {
          message = whatsappData.message.extendedTextMessage.text;
        }
      }
    } 
    // Estrutura antiga ou genérica
    else {
      phone = data.from || data.number || data.sender || '';
      name = data.pushname || data.name || data.sender_name || 'Cliente';
      message = data.body || data.text || data.message || '';
    }
    
    // Remover parte '@s.whatsapp.net' do número se presente
    if (phone.includes('@')) {
      phone = phone.split('@')[0];
    }
    
    const processedMessage = {
      telefone: phone,
      nome: name,
      mensagem: message,
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
