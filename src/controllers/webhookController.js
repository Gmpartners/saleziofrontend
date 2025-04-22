/**
 * Controlador para gerenciar webhooks
 */
const Conversa = require('../models/Conversa');
const whatsappService = require('../services/whatsappService');
const { identifySetor, generateResponse } = require('../config/openrouter');
const Setor = require('../models/Setor');

/**
 * Processa webhook de mensagem recebida do WhatsApp
 */
const processWhatsappWebhook = async (req, res) => {
  try {
    console.log('[Webhook] Payload recebido:', JSON.stringify(req.body));
    
    // Validar se a requisição tem o token correto
    const token = req.headers['x-api-token'];
    if (!token || token !== process.env.API_TOKEN) {
      console.error('[Webhook] Token inválido:', token);
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }
    
    // Processar a mensagem recebida
    const processedMessage = whatsappService.processIncomingMessage(req.body);
    
    // Validar se temos as informações necessárias
    if (!processedMessage.telefone || !processedMessage.mensagem) {
      console.error('[Webhook] Dados insuficientes:', JSON.stringify(processedMessage));
      return res.status(400).json({ 
        success: false, 
        message: 'Dados insuficientes. É necessário telefone e mensagem.' 
      });
    }
    
    // Verificar se já existe uma conversa para este telefone
    let conversa = await Conversa.findOne({
      'cliente.telefone': processedMessage.telefone,
      status: { $in: ['aguardando', 'em_andamento'] }
    });
    
    if (!conversa) {
      // Obter todos os setores ativos
      const setores = await Setor.find({ ativo: true });
      
      if (setores.length === 0) {
        // Criar um setor padrão se não existir nenhum
        const setorPadrao = new Setor({
          nome: 'Geral',
          descricao: 'Setor geral para atendimento',
          responsaveis: [{ nome: 'Administrador', email: 'admin@example.com' }]
        });
        
        await setorPadrao.save();
        setores.push(setorPadrao);
      }
      
      // Identificar o setor apropriado usando IA
      const setorIdentificado = await identifySetor(processedMessage.mensagem, setores);
      
      // Criar nova conversa
      conversa = new Conversa({
        cliente: {
          nome: processedMessage.nome,
          telefone: processedMessage.telefone
        },
        setor: setorIdentificado !== 'não identificado' ? setorIdentificado : setores[0].nome,
        mensagens: [{
          texto: processedMessage.mensagem,
          tipo: 'cliente'
        }],
        tags: ['whatsapp', processedMessage.userId || 'alfa']
      });
      
      // Gerar resposta inicial automatizada com IA
      const resposta = await generateResponse(processedMessage.mensagem, [
        { role: 'user', content: `Meu nome é ${processedMessage.nome} e minha mensagem é: ${processedMessage.mensagem}` }
      ]);
      
      // Adicionar resposta da IA à conversa
      conversa.mensagens.push({
        texto: resposta,
        tipo: 'ia'
      });
      
      // Salvar conversa
      await conversa.save();
      
      // Enviar resposta automatizada para o cliente
      await whatsappService.sendTextMessage(
        processedMessage.telefone,
        resposta
      );
      
      // Notificar via WebSocket (implementado no serviço de socket)
      
      console.log('[Webhook] Nova conversa criada para:', processedMessage.telefone);
    } else {
      // Adicionar mensagem à conversa existente
      conversa.mensagens.push({
        texto: processedMessage.mensagem,
        tipo: 'cliente'
      });
      
      // Atualizar data
      conversa.atualizadoEm = new Date();
      
      // Se a conversa estava resolvida, reabri-la
      if (conversa.status === 'resolvido') {
        conversa.status = 'aguardando';
      }
      
      await conversa.save();
      
      // Verificar se a conversa está em atendimento ou aguardando
      if (conversa.status === 'aguardando') {
        // Gerar resposta automatizada com IA
        const resposta = await generateResponse(processedMessage.mensagem, [
          { role: 'user', content: `Continuação da conversa. Nova mensagem: ${processedMessage.mensagem}` }
        ]);
        
        // Adicionar resposta da IA à conversa
        conversa.mensagens.push({
          texto: resposta,
          tipo: 'ia'
        });
        
        await conversa.save();
        
        // Enviar resposta automatizada para o cliente
        await whatsappService.sendTextMessage(
          processedMessage.telefone,
          resposta
        );
      }
      
      // Notificar via WebSocket (implementado no serviço de socket)
      
      console.log('[Webhook] Mensagem adicionada à conversa existente:', processedMessage.telefone);
    }
    
    // Retornar sucesso
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      conversaId: conversa._id
    });
    
  } catch (error) {
    console.error('[Webhook] Erro ao processar webhook:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Erro ao processar webhook: ${error.message}` 
    });
  }
};

module.exports = {
  processWhatsappWebhook
};
