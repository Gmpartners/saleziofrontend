const axios = require('axios');

const openRouterClient = axios.create({
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
  }
});

const generateResponse = async (prompt, conversationHistory = []) => {
  try {
    const response = await openRouterClient.post('/chat/completions', {
      model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente de atendimento ao cliente para um sistema de multiatendimento via WhatsApp. Sua função é identificar a intenção do cliente, coletar informações básicas como nome e determinar qual setor pode melhor atendê-lo. Seja sempre cordial e profissional.'
        },
        ...conversationHistory,
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Erro ao gerar resposta com OpenRouter:', error.message);
    return 'Desculpe, estou enfrentando dificuldades para processar sua solicitação. Um atendente humano irá ajudá-lo em breve.';
  }
};

const identifySetor = async (message, setores) => {
  try {
    // Cria uma lista de setores para a IA usar na classificação
    const setoresList = setores.map(s => `${s.nome}: ${s.descricao}`).join('\n');
    
    const prompt = `
    Analise a mensagem do cliente e determine qual setor é mais adequado para atendê-lo.
    
    Setores disponíveis:
    ${setoresList}
    
    Mensagem do cliente:
    "${message}"
    
    Responda apenas com o nome do setor mais apropriado. Se não for possível determinar, responda "não identificado".
    `;
    
    const response = await openRouterClient.post('/chat/completions', {
      model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 50
    });

    const result = response.data.choices[0].message.content.trim();
    
    // Verificar se o resultado corresponde a um setor existente
    const setor = setores.find(s => s.nome.toLowerCase() === result.toLowerCase());
    
    return setor ? setor.nome : 'não identificado';
  } catch (error) {
    console.error('Erro ao identificar setor com OpenRouter:', error.message);
    return 'não identificado';
  }
};

module.exports = { generateResponse, identifySetor };
