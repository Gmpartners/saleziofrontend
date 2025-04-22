const Setor = require('../models/Setor');
const Conversa = require('../models/Conversa');

const setupSocketServer = (io) => {
  // Manter registro dos atendentes conectados
  const atendentesConectados = new Map();
  
  io.on('connection', (socket) => {
    console.log(`Nova conexão: ${socket.id}`);
    
    // Registrar atendente
    socket.on('atendente:login', async (data) => {
      try {
        const { nome, setor } = data;
        
        // Verificar se o setor existe
        const setorExiste = await Setor.findOne({ nome: setor, ativo: true });
        
        if (!setorExiste) {
          socket.emit('error', { message: 'Setor não encontrado ou inativo' });
          return;
        }
        
        // Registrar atendente
        atendentesConectados.set(socket.id, { nome, setor, socketId: socket.id });
        
        // Entrar na sala do setor
        socket.join(setor);
        
        console.log(`Atendente ${nome} conectado no setor ${setor}`);
        
        // Enviar lista de conversas do setor
        const conversas = await Conversa.find({
          setor,
          status: { $in: ['aguardando', 'em_andamento'] }
        }).sort({ atualizadoEm: -1 });
        
        socket.emit('conversas:lista', conversas);
      } catch (error) {
        console.error('Erro ao registrar atendente:', error);
        socket.emit('error', { message: 'Erro ao registrar atendente' });
      }
    });
    
    // Escutar quando atendente seleciona uma conversa
    socket.on('conversa:selecionar', (conversaId) => {
      // Entrar na sala da conversa
      socket.join(`conversa:${conversaId}`);
      console.log(`Atendente entrou na conversa ${conversaId}`);
    });
    
    // Escutar mensagens enviadas pelo atendente
    socket.on('mensagem:enviar', async (data) => {
      try {
        const { conversaId, texto } = data;
        const atendente = atendentesConectados.get(socket.id);
        
        if (!atendente) {
          socket.emit('error', { message: 'Atendente não registrado' });
          return;
        }
        
        const conversa = await Conversa.findById(conversaId);
        
        if (!conversa) {
          socket.emit('error', { message: 'Conversa não encontrada' });
          return;
        }
        
        // Se for a primeira resposta de atendente, mudar status para em andamento
        if (conversa.status === 'aguardando') {
          conversa.status = 'em_andamento';
        }
        
        // Adicionar mensagem
        conversa.mensagens.push({
          texto,
          tipo: 'atendente',
          atendente: atendente.nome
        });
        
        // Atualizar data
        conversa.atualizadoEm = Date.now();
        
        await conversa.save();
        
        // Notificar todos na sala da conversa
        io.to(`conversa:${conversaId}`).emit('mensagem:nova', {
          conversaId,
          texto,
          tipo: 'atendente',
          atendente: atendente.nome,
          criadoEm: new Date()
        });
        
        console.log(`Mensagem enviada na conversa ${conversaId} por ${atendente.nome}`);
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        socket.emit('error', { message: 'Erro ao enviar mensagem' });
      }
    });
    
    // Finalizar conversa
    socket.on('conversa:finalizar', async (conversaId) => {
      try {
        const atendente = atendentesConectados.get(socket.id);
        
        if (!atendente) {
          socket.emit('error', { message: 'Atendente não registrado' });
          return;
        }
        
        const conversa = await Conversa.findById(conversaId);
        
        if (!conversa) {
          socket.emit('error', { message: 'Conversa não encontrada' });
          return;
        }
        
        // Atualizar status
        conversa.status = 'resolvido';
        conversa.finalizadoEm = Date.now();
        conversa.tempoAtendimento = conversa.finalizadoEm - conversa.iniciadoEm;
        
        await conversa.save();
        
        // Notificar todos na sala da conversa
        io.to(`conversa:${conversaId}`).emit('conversa:finalizada', {
          conversaId,
          atendente: atendente.nome
        });
        
        // Notificar todos no setor
        io.to(atendente.setor).emit('conversa:atualizada', conversa);
        
        console.log(`Conversa ${conversaId} finalizada por ${atendente.nome}`);
      } catch (error) {
        console.error('Erro ao finalizar conversa:', error);
        socket.emit('error', { message: 'Erro ao finalizar conversa' });
      }
    });
    
    // Transferir conversa
    socket.on('conversa:transferir', async (data) => {
      try {
        const { conversaId, novoSetor } = data;
        const atendente = atendentesConectados.get(socket.id);
        
        if (!atendente) {
          socket.emit('error', { message: 'Atendente não registrado' });
          return;
        }
        
        // Verificar se o setor existe
        const setorExiste = await Setor.findOne({ nome: novoSetor, ativo: true });
        
        if (!setorExiste) {
          socket.emit('error', { message: 'Setor de destino não encontrado ou inativo' });
          return;
        }
        
        const conversa = await Conversa.findById(conversaId);
        
        if (!conversa) {
          socket.emit('error', { message: 'Conversa não encontrada' });
          return;
        }
        
        const setorAntigo = conversa.setor;
        
        // Atualizar setor
        conversa.setor = novoSetor;
        
        // Adicionar mensagem de sistema
        conversa.mensagens.push({
          texto: `Conversa transferida do setor ${setorAntigo} para ${novoSetor} por ${atendente.nome}`,
          tipo: 'ia'
        });
        
        await conversa.save();
        
        // Notificar todos na sala da conversa
        io.to(`conversa:${conversaId}`).emit('conversa:transferida', {
          conversaId,
          setorAntigo,
          setorNovo: novoSetor,
          atendente: atendente.nome
        });
        
        // Notificar setor antigo e novo
        io.to(setorAntigo).emit('conversa:removida', { conversaId });
        io.to(novoSetor).emit('conversa:nova', conversa);
        
        // Remover atendente da sala da conversa
        socket.leave(`conversa:${conversaId}`);
        
        console.log(`Conversa ${conversaId} transferida de ${setorAntigo} para ${novoSetor} por ${atendente.nome}`);
      } catch (error) {
        console.error('Erro ao transferir conversa:', error);
        socket.emit('error', { message: 'Erro ao transferir conversa' });
      }
    });
    
    // Desconexão
    socket.on('disconnect', () => {
      const atendente = atendentesConectados.get(socket.id);
      
      if (atendente) {
        console.log(`Atendente ${atendente.nome} desconectado`);
        atendentesConectados.delete(socket.id);
      }
    });
  });
  
  console.log('Servidor WebSocket configurado');
};

module.exports = setupSocketServer;
