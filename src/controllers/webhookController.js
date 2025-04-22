/**
 * Controlador para gerenciar webhooks
 */
const Conversa = require('../models/Conversa');
const whatsappService = require('../services/whatsappService');
const { identifySetor, generateResponse, suggestSectorTransfer } = require('../config/openrouter');
const Setor = require('../models/Setor');

/**
 * Processa webhook de mensagem recebida do WhatsApp
 */
const processWhatsappWebhook = async (req, res) => {
  try {
    console.log('[Webhook] Payload recebido:', JSON.stringify(req.body));
    
    // Validar o payload para garantir que é uma mensagem válida
    // Extrair a API key do payload em vez de usar header
    if (req.body.apikey) {
      const payloadApiKey = req.body.apikey;
      console.log(`[Webhook] API Key no payload: ${payloadApiKey.substring(0, 10)}...`);
    }
    
    // Verificar se é uma mensagem de texto válida
    if (!req.body.event || req.body.event !== 'messages.upsert') {
      console.log('[Webhook] Evento não reconhecido ou não é uma mensagem');
      return res.status(200).json({ success: true, message: 'Evento ignorado' });
    }
    
    // Verificar se existem os dados necessários
    if (!req.body.data || !req.body.data.message) {
      console.log('[Webhook] Dados da mensagem ausentes no payload');
      return res.status(200).json({ success: true, message: 'Payload inválido' });
    }
    
    // Extrair os dados da mensagem
    const data = req.body.data;
    
    // Verificar se é uma mensagem de texto
    if (!data.message.conversation && 
        !(data.message.extendedTextMessage && data.message.extendedTextMessage.text)) {
      console.log('[Webhook] Mensagem não é do tipo texto');
      return res.status(200).json({ success: true, message: 'Tipo de mensagem não suportado' });
    }
    
    // Obter o telefone do remetente
    const telefone = data.key.remoteJid.split('@')[0];
    
    // Obter o nome do remetente
    const nome = data.pushName || 'Cliente';
    
    // Obter o texto da mensagem
    const mensagem = data.message.conversation || 
                    (data.message.extendedTextMessage && data.message.extendedTextMessage.text);
    
    // Obter o ID do usuário (alfa)
    const userId = req.params.userId || 'alfa';
    
    console.log(`[Webhook] Mensagem processada: Telefone=${telefone}, Nome=${nome}, Mensagem=${mensagem}, UserId=${userId}`);
    
    // Verificar se já existe uma conversa para este telefone
    let conversa = await Conversa.findOne({
      'cliente.telefone': telefone,
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
      const setorIdentificado = await identifySetor(mensagem, setores);
      
      // Criar nova conversa
      conversa = new Conversa({
        cliente: {
          nome: nome,
          telefone: telefone
        },
        setor: setorIdentificado !== 'não identificado' ? setorIdentificado : setores[0].nome,
        mensagens: [{
          texto: mensagem,
          tipo: 'cliente'
        }],
        tags: ['whatsapp', userId],
        metadata: {
          esperandoConfirmacao: false,
          setorSugerido: null
        }
      });
      
      // Gerar saudação inicial simples
      const resposta = "Olá! Como posso ajudar?";
      
      // Adicionar resposta da IA à conversa
      conversa.mensagens.push({
        texto: resposta,
        tipo: 'ia'
      });
      
      // Salvar conversa
      await conversa.save();
      
      // Enviar resposta automatizada para o cliente
      await whatsappService.sendTextMessage(
        telefone,
        resposta
      );
      
      // Notificar via WebSocket
      if (global.io) {
        global.io.emit('nova_conversa', {
          id: conversa._id,
          cliente: conversa.cliente,
          setor: conversa.setor,
          assunto: conversa.assunto,
          mensagem
        });
      }
      
      console.log('[Webhook] Nova conversa criada para:', telefone);
    } else {
      // Adicionar mensagem à conversa existente
      conversa.mensagens.push({
        texto: mensagem,
        tipo: 'cliente'
      });
      
      // Atualizar data
      conversa.atualizadoEm = new Date();
      
      // Verificar se estamos esperando confirmação para transferência
      if (conversa.metadata && conversa.metadata.esperandoConfirmacao && conversa.metadata.setorSugerido) {
        // Verificar resposta positiva (sim, ok, pode, claro, etc.)
        const respostaPositiva = /sim|ok|pode|claro|confirmo|s|positivo|transfira|transferir|prossiga|concordo/i.test(mensagem);
        
        if (respostaPositiva) {
          // Transferir conversa para o setor sugerido
          const setorAnterior = conversa.setor;
          conversa.setor = conversa.metadata.setorSugerido;
          
          // Adicionar mensagem de confirmação da transferência
          const confirmaTransferencia = `Estaremos transferindo para o ${conversa.metadata.setorSugerido}!`;
          
          conversa.mensagens.push({
            texto: confirmaTransferencia,
            tipo: 'ia'
          });
          
          // Resetar flags de espera
          conversa.metadata.esperandoConfirmacao = false;
          conversa.metadata.setorSugerido = null;
          
          // Salvar conversa
          await conversa.save();
          
          // Enviar confirmação para o cliente
          await whatsappService.sendTextMessage(
            telefone,
            confirmaTransferencia
          );
          
          // Notificar via WebSocket sobre a transferência
          if (global.io) {
            global.io.emit('conversa_transferida', {
              conversaId: conversa._id,
              setorAntigo: setorAnterior,
              setorNovo: conversa.setor,
              cliente: conversa.cliente
            });
          }
          
          console.log(`[Webhook] Conversa transferida para: ${conversa.setor}`);
        } else {
          // Continuar conversa normal, resetar flags
          conversa.metadata.esperandoConfirmacao = false;
          conversa.metadata.setorSugerido = null;
          
          // Gerar resposta da IA para continuar diálogo
          const resposta = await generateResponse(mensagem, [
            { role: 'user', content: `Continuação da conversa. Nova mensagem: ${mensagem}` }
          ]);
          
          // Adicionar resposta da IA à conversa
          conversa.mensagens.push({
            texto: resposta,
            tipo: 'ia'
          });
          
          // Salvar conversa
          await conversa.save();
          
          // Enviar resposta ao cliente
          await whatsappService.sendTextMessage(
            telefone,
            resposta
          );
        }
      } else {
        // Se a conversa estava resolvida, reabri-la
        if (conversa.status === 'resolvido') {
          conversa.status = 'aguardando';
        }
        
        // Se conversa está em atendimento, não gerar resposta automática
        if (conversa.status === 'em_andamento') {
          await conversa.save();
        } else {
          // Verificar se é possível sugerir transferência para outro setor
          // Obter todos os setores ativos
          const setores = await Setor.find({ ativo: true });
          const setorIdentificado = await identifySetor(mensagem, setores);
          
          // Se o setor identificado é diferente do atual e não é "não identificado"
          if (setorIdentificado !== 'não identificado' && setorIdentificado !== conversa.setor) {
            // Gerar sugestão de transferência
            const sugestaoTransferencia = await suggestSectorTransfer(mensagem, setorIdentificado);
            
            // Adicionar resposta da IA à conversa
            conversa.mensagens.push({
              texto: sugestaoTransferencia,
              tipo: 'ia'
            });
            
            // Marcar como esperando confirmação
            conversa.metadata = {
              ...(conversa.metadata || {}),
              esperandoConfirmacao: true,
              setorSugerido: setorIdentificado
            };
            
            // Salvar conversa
            await conversa.save();
            
            // Enviar sugestão de transferência
            await whatsappService.sendTextMessage(
              telefone,
              sugestaoTransferencia
            );
          } else {
            // Continuar no mesmo setor, gerar resposta normal
            const resposta = await generateResponse(mensagem, [
              { role: 'user', content: `Continuação da conversa. Nova mensagem: ${mensagem}` }
            ]);
            
            // Adicionar resposta da IA à conversa
            conversa.mensagens.push({
              texto: resposta,
              tipo: 'ia'
            });
            
            // Salvar conversa
            await conversa.save();
            
            // Enviar resposta
            await whatsappService.sendTextMessage(
              telefone,
              resposta
            );
          }
        }
      }
      
      // Notificar via WebSocket sobre nova mensagem
      if (global.io) {
        global.io.emit('nova_mensagem', {
          conversaId: conversa._id,
          setor: conversa.setor,
          cliente: conversa.cliente,
          texto: mensagem
        });
      }
      
      console.log('[Webhook] Mensagem adicionada à conversa existente:', telefone);
    }
    
    // Retornar sucesso
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      conversaId: conversa._id
    });
    
  } catch (error) {
    console.error('[Webhook] Erro ao processar webhook:', error);
    // Sempre retornar 200 para webhooks para evitar reenvios
    return res.status(200).json({ 
      success: false, 
      message: `Erro ao processar webhook: ${error.message}` 
    });
  }
};

module.exports = {
  processWhatsappWebhook
};
