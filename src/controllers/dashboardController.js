const Conversa = require('../models/Conversa');
const Setor = require('../models/Setor');
const Usuario = require('../models/Usuario');

// Estatísticas para dashboard
const getDashboardStats = async (req, res) => {
  try {
    const { setor, dataInicio, dataFim, periodo } = req.query;
    
    // Configurar período
    let startDate = dataInicio ? new Date(dataInicio) : new Date();
    startDate.setDate(startDate.getDate() - (periodo ? parseInt(periodo) : 7));
    
    const endDate = dataFim ? new Date(dataFim) : new Date();
    
    const matchQuery = {
      iniciadoEm: { $gte: startDate, $lte: endDate }
    };
    
    // Se for representante, filtrar apenas pelo seu setor
    if (req.user.role === 'representante') {
      matchQuery.setor = req.user.setor;
    } 
    // Se for admin e especificou um setor
    else if (setor) {
      matchQuery.setor = setor;
    }
    
    // 1. Métricas gerais
    const totalConversas = await Conversa.countDocuments(matchQuery);
    
    const conversasResolvidas = await Conversa.countDocuments({
      ...matchQuery,
      status: 'resolvido'
    });
    
    // 2. Tempo médio de resposta
    const tempoMedioResposta = await Conversa.aggregate([
      { $match: { ...matchQuery, status: 'resolvido' } },
      { $group: { 
        _id: null, 
        media: { $avg: { $divide: ['$tempoAtendimento', 60000] } } // em minutos
      }}
    ]);
    
    // 3. Taxa de resolução
    const taxaResolucao = totalConversas > 0 ? 
      Math.round((conversasResolvidas / totalConversas) * 100) : 0;
    
    // 4. Conversas por status
    const conversasPorStatus = await Conversa.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', total: { $sum: 1 } } }
    ]);
    
    // 5. Volume de mensagens diário
    const volumeMensagensPorDia = await Conversa.aggregate([
      { $match: matchQuery },
      { $unwind: '$mensagens' },
      { 
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$mensagens.criadoEm' }
          },
          recebidas: {
            $sum: { $cond: [{ $eq: ['$mensagens.tipo', 'cliente'] }, 1, 0] }
          },
          enviadas: {
            $sum: { $cond: [{ $eq: ['$mensagens.tipo', 'atendente'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 6. Distribuição por setor (apenas para admin)
    let conversasPorSetor = [];
    if (req.user.role === 'admin') {
      conversasPorSetor = await Conversa.aggregate([
        { $match: matchQuery },
        { $group: { 
          _id: '$setor', 
          total: { $sum: 1 },
          resolvidas: { 
            $sum: { $cond: [{ $eq: ['$status', 'resolvido'] }, 1, 0] } 
          }
        }},
        { $sort: { total: -1 } }
      ]);
      
      // Calcular percentual de resolução para cada setor
      conversasPorSetor = conversasPorSetor.map(item => ({
        setor: item._id,
        total: item.total,
        resolvidas: item.resolvidas,
        taxaResolucao: item.total > 0 ? Math.round((item.resolvidas / item.total) * 100) : 0
      }));
    }
    
    // 7. Performance dos atendentes (apenas para admin ou representante do setor)
    let performanceAtendentes = [];
    
    const queryAtendentes = req.user.role === 'admin' 
      ? (setor ? { setor } : {}) 
      : { setor: req.user.setor };
      
    // Primeiro, obter lista de atendentes
    const atendentes = await Usuario.find({
      ...queryAtendentes,
      role: 'representante',
      ativo: true
    });
    
    // Depois, buscar estatísticas para cada atendente
    for (const atendente of atendentes) {
      const estatisticas = await getEstatisticasAtendente(
        atendente.nomeExibicao, 
        startDate, 
        endDate, 
        setor || atendente.setor
      );
      
      performanceAtendentes.push({
        ...estatisticas,
        id: atendente._id,
        nome: atendente.nome,
        nomeExibicao: atendente.nomeExibicao,
        setor: atendente.setor
      });
    }
    
    // 8. Relatório para o representante logado
    let minhasEstatisticas = null;
    if (req.user.role === 'representante') {
      minhasEstatisticas = await getEstatisticasAtendente(
        req.user.nomeExibicao,
        startDate,
        endDate,
        req.user.setor
      );
    }
    
    // 9. Conversas aguardando resposta agora
    const conversasAguardando = await Conversa.countDocuments({
      status: 'aguardando',
      ...(req.user.role === 'representante' ? { setor: req.user.setor } : {})
    });
    
    // 10. Taxa de engajamento (mensagens respondidas em menos de 5 minutos)
    const conversasComResposta = await Conversa.aggregate([
      { $match: matchQuery },
      { $unwind: '$mensagens' },
      { $match: { 'mensagens.tipo': 'cliente' } },
      { 
        $group: {
          _id: '$_id',
          mensagensCliente: { $push: '$mensagens' }
        }
      },
      { 
        $lookup: {
          from: 'conversas',
          localField: '_id',
          foreignField: '_id',
          as: 'conversaCompleta'
        }
      },
      { $unwind: '$conversaCompleta' },
      { $unwind: '$conversaCompleta.mensagens' },
      { $match: { 'conversaCompleta.mensagens.tipo': 'atendente' } },
      { 
        $group: {
          _id: '$_id',
          mensagensCliente: { $first: '$mensagensCliente' },
          mensagensAtendente: { $push: '$conversaCompleta.mensagens' }
        }
      }
    ]);
    
    // Calcular respostas rápidas (menos de 5 minutos)
    let totalMensagensCliente = 0;
    let respostasRapidas = 0;
    
    conversasComResposta.forEach(conversa => {
      conversa.mensagensCliente.forEach(msgCliente => {
        totalMensagensCliente++;
        
        // Encontrar primeira resposta do atendente após esta mensagem
        const resposta = conversa.mensagensAtendente.find(msgAtendente => 
          msgAtendente.criadoEm > msgCliente.criadoEm
        );
        
        if (resposta) {
          const tempoResposta = new Date(resposta.criadoEm) - new Date(msgCliente.criadoEm);
          if (tempoResposta <= 5 * 60 * 1000) { // 5 minutos em milissegundos
            respostasRapidas++;
          }
        }
      });
    });
    
    const taxaEngajamento = totalMensagensCliente > 0 
      ? Math.round((respostasRapidas / totalMensagensCliente) * 100) 
      : 0;
    
    // Montar resposta completa
    const resultado = {
      // Estatísticas gerais
      totalConversas,
      conversasResolvidas,
      taxaResolucao,
      tempoMedioResposta: tempoMedioResposta[0]?.media || 0,
      conversasPorStatus: Object.fromEntries(
        conversasPorStatus.map(item => [item._id, item.total])
      ),
      volumeMensagensPorDia,
      conversasAguardando,
      taxaEngajamento,
      
      // Estatísticas específicas por tipo de usuário
      ...(req.user.role === 'admin' && { 
        conversasPorSetor,
        performanceAtendentes
      }),
      
      ...(req.user.role === 'representante' && { 
        minhasEstatisticas 
      })
    };
    
    res.status(200).json(resultado);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar estatísticas do dashboard', 
      error: error.message 
    });
  }
};

// Função auxiliar para obter estatísticas de um atendente específico
const getEstatisticasAtendente = async (nomeAtendente, dataInicio, dataFim, setor) => {
  try {
    // Mensagens enviadas pelo atendente
    const mensagensEnviadas = await Conversa.aggregate([
      { 
        $match: { 
          setor,
          iniciadoEm: { $gte: dataInicio, $lte: dataFim }
        }
      },
      { $unwind: '$mensagens' },
      { 
        $match: { 
          'mensagens.tipo': 'atendente',
          'mensagens.atendente': nomeAtendente
        }
      },
      { $count: 'total' }
    ]);
    
    // Conversas em que o atendente participou
    const conversasAtendidas = await Conversa.aggregate([
      { 
        $match: { 
          setor,
          iniciadoEm: { $gte: dataInicio, $lte: dataFim }
        }
      },
      { $unwind: '$mensagens' },
      { 
        $match: { 
          'mensagens.tipo': 'atendente',
          'mensagens.atendente': nomeAtendente
        }
      },
      { $group: { _id: '$_id' } },
      { $count: 'total' }
    ]);
    
    // Conversas resolvidas em que o atendente participou
    const conversasResolvidas = await Conversa.aggregate([
      { 
        $match: { 
          setor,
          iniciadoEm: { $gte: dataInicio, $lte: dataFim },
          status: 'resolvido'
        }
      },
      { $unwind: '$mensagens' },
      { 
        $match: { 
          'mensagens.tipo': 'atendente',
          'mensagens.atendente': nomeAtendente
        }
      },
      { $group: { _id: '$_id' } },
      { $count: 'total' }
    ]);
    
    // Tempo médio de resolução
    const tempoMedio = await Conversa.aggregate([
      { 
        $match: { 
          setor,
          iniciadoEm: { $gte: dataInicio, $lte: dataFim },
          status: 'resolvido',
          tempoAtendimento: { $exists: true, $ne: null }
        }
      },
      { $unwind: '$mensagens' },
      { 
        $match: { 
          'mensagens.tipo': 'atendente',
          'mensagens.atendente': nomeAtendente
        }
      },
      { $group: { _id: '$_id', tempo: { $first: '$tempoAtendimento' } } },
      { $group: { _id: null, media: { $avg: '$tempo' } } }
    ]);
    
    return {
      mensagensEnviadas: mensagensEnviadas[0]?.total || 0,
      conversasAtendidas: conversasAtendidas[0]?.total || 0,
      conversasResolvidas: conversasResolvidas[0]?.total || 0,
      taxaResolucao: conversasAtendidas[0]?.total > 0 
        ? Math.round((conversasResolvidas[0]?.total || 0) / conversasAtendidas[0].total * 100) 
        : 0,
      tempoMedioResolucao: tempoMedio[0] 
        ? Math.round(tempoMedio[0].media / (60 * 1000)) // Converter para minutos
        : 0
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas do atendente:', error);
    return {
      mensagensEnviadas: 0,
      conversasAtendidas: 0,
      conversasResolvidas: 0,
      taxaResolucao: 0,
      tempoMedioResolucao: 0,
      erro: error.message
    };
  }
};

module.exports = {
  getDashboardStats
};
