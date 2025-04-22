const Conversa = require('../models/Conversa');
const Setor = require('../models/Setor');
const { identifySetor, generateResponse } = require('../config/openrouter');

// Obter conversas com filtros
const getConversas = async (req, res) => {
  try {
    const { setor, status, telefone, limit = 20, page = 1 } = req.query;
    
    const query = {};
    
    if (setor) query.setor = setor;
    if (status) query.status = status;
    if (telefone) query['cliente.telefone'] = telefone;
    
    const conversas = await Conversa.find(query)
      .sort({ atualizadoEm: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Conversa.countDocuments(query);
    
    res.status(200).json({
      conversas,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar conversas', error: error.message });
  }
};

// Obter conversa por ID
const getConversaById = async (req, res) => {
  try {
    const conversa = await Conversa.findById(req.params.id);
    
    if (!conversa) {
      return res.status(404).json({ message: 'Conversa não encontrada' });
    }
    
    res.status(200).json(conversa);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar conversa', error: error.message });
  }
};

// Criar ou obter conversa existente por telefone
const getOrCreateConversa = async (req, res) => {
  try {
    const { telefone, nome, mensagem } = req.body;
    
    if (!telefone || !mensagem) {
      return res.status(400).json({ message: 'Telefone e mensagem são obrigatórios' });
    }
    
    // Verificar se já existe uma conversa em andamento para este telefone
    let conversa = await Conversa.findOne({
      'cliente.telefone': telefone,
      status: { $in: ['aguardando', 'em_andamento'] }
    });
    
    if (!conversa) {
      // Obter todos os setores ativos
      const setores = await Setor.find({ ativo: true });
      
      if (setores.length === 0) {
        return res.status(500).json({ message: 'Não há setores cadastrados' });
      }
      
      // Identificar o setor apropriado
      const setorIdentificado = await identifySetor(mensagem, setores);
      
      // Criar nova conversa
      conversa = new Conversa({
        cliente: {
          nome: nome || 'Cliente',
          telefone
        },
        setor: setorIdentificado !== 'não identificado' ? setorIdentificado : setores[0].nome,
        mensagens: [{
          texto: mensagem,
          tipo: 'cliente'
        }]
      });
      
      // Resposta inicial da IA
      const resposta = await generateResponse(mensagem, [
        { role: 'user', content: `Meu nome é ${nome || 'Cliente'} e minha mensagem é: ${mensagem}` }
      ]);
      
      conversa.mensagens.push({
        texto: resposta,
        tipo: 'ia'
      });
      
      await conversa.save();
      
      // Notificar via socket.io
      if (global.io) {
        global.io.emit('nova_conversa', {
          id: conversa._id,
          cliente: conversa.cliente,
          setor: conversa.setor,
          assunto: conversa.assunto,
          mensagem
        });
      }
    } else {
      // Adicionar mensagem à conversa existente
      conversa.mensagens.push({
        texto: mensagem,
        tipo: 'cliente'
      });
      
      // Atualizar data
      conversa.atualizadoEm = Date.now();
      
      // Se a conversa estava resolvida, reabri-la
      if (conversa.status === 'resolvido') {
        conversa.status = 'aguardando';
      }
      
      await conversa.save();
      
      // Notificar via socket.io
      if (global.io) {
        global.io.emit('nova_mensagem', {
          conversaId: conversa._id,
          setor: conversa.setor,
          cliente: conversa.cliente,
          texto: mensagem
        });
      }
    }
    
    res.status(200).json(conversa);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar mensagem', error: error.message });
  }
};

// Atualizar status da conversa
const updateConversaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, setor } = req.body;
    
    const conversa = await Conversa.findById(id);
    
    if (!conversa) {
      return res.status(404).json({ message: 'Conversa não encontrada' });
    }
    
    // Atualizar status
    if (status) {
      conversa.status = status;
      
      // Se estiver sendo resolvida, registrar data
      if (status === 'resolvido' && !conversa.finalizadoEm) {
        conversa.finalizadoEm = Date.now();
        conversa.tempoAtendimento = conversa.finalizadoEm - conversa.iniciadoEm;
      }
    }
    
    // Transferir para outro setor
    if (setor && setor !== conversa.setor) {
      const setorExiste = await Setor.findOne({ nome: setor, ativo: true });
      
      if (!setorExiste) {
        return res.status(400).json({ message: 'Setor não encontrado ou inativo' });
      }
      
      conversa.setor = setor;
      
      // Adicionar mensagem de sistema sobre a transferência
      conversa.mensagens.push({
        texto: `Conversa transferida para o setor ${setor}`,
        tipo: 'ia'
      });
      
      // Notificar via socket.io
      if (global.io) {
        global.io.emit('conversa_transferida', {
          conversaId: conversa._id,
          setorAntigo: conversa.setor,
          setorNovo: setor,
          cliente: conversa.cliente
        });
      }
    }
    
    await conversa.save();
    res.status(200).json(conversa);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar conversa', error: error.message });
  }
};

// Adicionar resposta de atendente
const addAtendenteMensagem = async (req, res) => {
  try {
    const { id } = req.params;
    const { texto, atendente } = req.body;
    
    if (!texto || !atendente) {
      return res.status(400).json({ message: 'Texto e nome do atendente são obrigatórios' });
    }
    
    const conversa = await Conversa.findById(id);
    
    if (!conversa) {
      return res.status(404).json({ message: 'Conversa não encontrada' });
    }
    
    // Se for a primeira resposta de atendente, mudar status para em andamento
    if (conversa.status === 'aguardando') {
      conversa.status = 'em_andamento';
    }
    
    // Adicionar mensagem
    conversa.mensagens.push({
      texto,
      tipo: 'atendente',
      atendente
    });
    
    // Atualizar data
    conversa.atualizadoEm = Date.now();
    
    await conversa.save();
    
    // Notificar via socket.io
    if (global.io) {
      global.io.emit('resposta_atendente', {
        conversaId: conversa._id,
        setor: conversa.setor,
        atendente,
        texto
      });
    }
    
    res.status(200).json(conversa);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao adicionar mensagem', error: error.message });
  }
};

// Obter estatísticas de atendimento
const getEstatisticas = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    
    // Filtros de data
    const filtroData = {};
    if (dataInicio) filtroData.iniciadoEm = { $gte: new Date(dataInicio) };
    if (dataFim) filtroData.iniciadoEm = { ...filtroData.iniciadoEm, $lte: new Date(dataFim) };
    
    // Total de conversas
    const totalConversas = await Conversa.countDocuments(filtroData);
    
    // Conversas por status
    const conversasPorStatus = await Conversa.aggregate([
      { $match: filtroData },
      { $group: { _id: '$status', total: { $sum: 1 } } }
    ]);
    
    // Conversas por setor
    const conversasPorSetor = await Conversa.aggregate([
      { $match: filtroData },
      { $group: { _id: '$setor', total: { $sum: 1 } } }
    ]);
    
    // Tempo médio de atendimento (apenas conversas resolvidas)
    const tempoMedio = await Conversa.aggregate([
      { $match: { ...filtroData, status: 'resolvido' } },
      { $group: { _id: null, media: { $avg: '$tempoAtendimento' } } }
    ]);
    
    res.status(200).json({
      totalConversas,
      conversasPorStatus,
      conversasPorSetor,
      tempoMedioAtendimento: tempoMedio.length > 0 ? tempoMedio[0].media : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error: error.message });
  }
};

module.exports = {
  getConversas,
  getConversaById,
  getOrCreateConversa,
  updateConversaStatus,
  addAtendenteMensagem,
  getEstatisticas
};
