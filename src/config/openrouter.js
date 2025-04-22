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
    // Se for a primeira mensagem, enviar saudação simples
    if (conversationHistory.length === 1 && conversationHistory[0].role === 'user') {
      return "Olá! Como posso ajudar?";
    }
    
    const response = await openRouterClient.post('/chat/completions', {
      model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente de atendimento ao cliente para um sistema de multiatendimento via WhatsApp. Sua função é fazer a triagem inicial e determinar qual setor pode melhor atender o cliente. Seja direto e objetivo.'
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

const suggestSectorTransfer = async (message, setorIdentificado) => {
  try {
    const prompt = `
    Com base na mensagem do cliente: "${message}"
    
    E sabendo que o setor mais adequado seria: "${setorIdentificado}"
    
    Gere uma mensagem curta sugerindo a transferência para este setor específico.
    A mensagem deve ter este formato: "Creio que sua solicitação tem mais a ver com o [nome do setor], posso transferir?"
    `;
    
    const response = await openRouterClient.post('/chat/completions', {
      model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente que faz triagem de atendimentos. Seja direto e objetivo.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro ao gerar sugestão de transferência:', error.message);
    return `Creio que sua solicitação tem mais a ver com o ${setorIdentificado}, posso transferir?`;
  }
};

module.exports = { 
  generateResponse, 
  identifySetor,
  suggestSectorTransfer
};
