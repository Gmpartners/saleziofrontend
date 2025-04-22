const jwt = require('jsonwebtoken');
const Setor = require('../models/Setor');
const Conversa = require('../models/Conversa');
const Template = require('../models/Template');
const Usuario = require('../models/Usuario');
const whatsappService = require('../services/whatsappService');

const setupSocketServer = (io) => {
  // Middleware de autenticação para WebSocket
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Token não fornecido'));
      }
      
      // Decodificar token
      const decoded = jwt.decode(token);
      
      if (!decoded || !decoded.user_id) {
        return next(new Error('Token inválido'));
      }
      
      // Adicionar informações do usuário ao socket
      socket.user = {
        id: decoded.user_id,
        email: decoded.email,
        nome: decoded.name || decoded.email.split('@')[0],
        nomeExibicao: decoded.nomeExibicao || decoded.name || decoded.email.split('@')[0],
        role: decoded.role || 'representante',
        setor: decoded.setor
      };
      
      next();
    } catch (error) {
      return next(new Error('Token inválido ou expirado'));
    }
  });

  // Manter registro dos usuários conectados
  const usuariosConectados = new Map();
  
  // Processador de comandos para mensagens com "/"
  const processCommand = async (comando, params, socket, conversaId) => {
    try {
      switch (comando) {
        case 'transferir':
          // Verificar se foi fornecido um setor
          if (!params || !params.trim()) {
            // Se não tiver parâmetro, enviar a lista de setores disponíveis
            const setores = await Setor.find({ ativo: true }).sort({ nome: 1 });
            socket.emit('comando:opcoes', {
              comando: 'transferir',
              opcoes: setores.map(s => ({ id: s.nome, nome: s.nome })),
              mensagem: 'Selecione o setor para transferência:'
            });
            return;
          }
          
          // Transferir para o setor especificado
          const novoSetor = params.trim();
          const setorExiste = await Setor.findOne({ nome: novoSetor, ativo: true });
          
          if (!setorExiste) {
            socket.emit('error', { 
              message: `Setor "${novoSetor}" não encontrado ou inativo`,
              comando: 'transferir'
            });
            return;
          }
          
          await transferirConversa(socket, conversaId, novoSetor);
          break;
          
        case 'finalizar':
          await finalizarConversa(socket, conversaId);
          break;
          
        case 'template':
        case 't':
          // Mostrar templates disponíveis
          if (!params || !params.trim()) {
            // Obter templates do setor e pessoais
            const templates = await Template.find({
              $or: [
                { setor: socket.user.setor, ativo: true },
                { emailUsuario: socket.user.email, ativo: true }
              ]
            }).sort({ nome: 1 });
            
            socket.emit('comando:opcoes', {
              comando: 'template',
              opcoes: templates.map(t => ({ id: t._id, nome: t.nome })),
              mensagem: 'Selecione um template:'
            });
            return;
          }
          
          // Buscar template por ID ou nome
          let template;
          if (params.length === 24 && /^[0-9a-fA-F]{24}$/.test(params)) {
            // Parece ser um ID do MongoDB
            template = await Template.findById(params);
          } else {
            // Buscar por nome (do setor ou pessoal)
            template = await Template.findOne({
              nome: new RegExp(`^${params}$`, 'i'),
              $or: [
                { setor: socket.user.setor },
                { emailUsuario: socket.user.email }
              ],
              ativo: true
            });
          }
          
          if (!template) {
            socket.emit('error', { 
              message: `Template "${params}" não encontrado`,
              comando: 'template'
            });
            return;
          }
          
          // Enviar o conteúdo do template para o cliente
          socket.emit('template:conteudo', {
            conversaId,
            conteudo: template.conteudo
          });
          break;
          
        case 'help':
        case 'ajuda':
          // Mostrar comandos disponíveis
          socket.emit('comando:ajuda', {
            comandos: [
              { comando: '/transferir [setor]', descricao: 'Transfere a conversa para outro setor' },
              { comando: '/finalizar', descricao: 'Finaliza o atendimento' },
              { comando: '/template ou /t [nome]', descricao: 'Usa um template de mensagem' },
              { comando: '/help ou /ajuda', descricao: 'Mostra esta ajuda' }
            ]
          });
          break;
          
        default:
          // Verificar se é um template com nome abreviado
          const templateCustom = await Template.findOne({
            nome: new RegExp(`^${comando}$`, 'i'),
            $or: [
              { setor: socket.user.setor },
              { emailUsuario: socket.user.email }
            ],
            ativo: true
          });
          
          if (templateCustom) {
            socket.emit('template:conteudo', {
              conversaId,
              conteudo: templateCustom.conteudo
            });
          } else {
            socket.emit('error', { 
              message: `Comando "/${comando}" não reconhecido. Use /ajuda para ver os comandos disponíveis.`,
              comando
            });
          }
      }
    } catch (error) {
      console.error(`Erro ao processar comando /${comando}:`, error);
      socket.emit('error', { 
        message: `Erro ao processar comando /${comando}`,
        comando
      });
    }
  };
  
  // Função para transferir conversa
  const transferirConversa = async (socket, conversaId, novoSetor) => {
    try {
      const conversa = await Conversa.findById(conversaId);
      
      if (!conversa) {
        socket.emit('error', { message: 'Conversa não encontrada' });
        return;
      }
      
      // Verificar permissão
      if (socket.user.role !== 'admin' && conversa.setor !== socket.user.setor) {
        socket.emit('error', { message: 'Permissão negada para esta conversa' });
        return;
      }
      
      const setorAntigo = conversa.setor;
      
      // Não permitir transferir para o mesmo setor
      if (setorAntigo === novoSetor) {
        socket.emit('error', { message: 'A conversa já está neste setor' });
        return;
      }
      
      // Atualizar setor
      conversa.setor = novoSetor;
      
      // Adicionar mensagem de sistema
      const mensagemTransferencia = `Conversa transferida para o setor ${novoSetor} por ${socket.user.nomeExibicao}`;
      
      conversa.mensagens.push({
        texto: mensagemTransferencia,
        tipo: 'ia'
      });
      
      await conversa.save();
      
      // Notificar cliente via WhatsApp
      await whatsappService.sendTextMessage(
        conversa.cliente.telefone,
        `Sua conversa foi transferida para o setor de ${novoSetor}. Um novo atendente continuará o atendimento.`,
        'sistema'
      );
      
      // Notificar todos na sala da conversa
      io.to(`conversa:${conversaId}`).emit('conversa:transferida', {
        conversaId,
        setorAntigo,
        setorNovo: novoSetor,
        atendente: socket.user.nomeExibicao
      });
      
      // Notificar setores
      io.to(`setor:${setorAntigo}`).emit('conversa:removida', { conversaId });
      io.to(`setor:${novoSetor}`).emit('conversa:nova', conversa);
      io.to('admin').emit('conversa:atualizada', conversa);
      
      // Remover usuário da sala da conversa se for representante do setor antigo
      if (socket.user.role === 'representante') {
        socket.leave(`conversa:${conversaId}`);
      }
      
      console.log(`Conversa ${conversaId} transferida de ${setorAntigo} para ${novoSetor} por ${socket.user.nomeExibicao}`);
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      socket.emit('error', { message: 'Erro ao transferir conversa' });
    }
  };
  
  // Função para finalizar conversa
  const finalizarConversa = async (socket, conversaId) => {
    try {
      const conversa = await Conversa.findById(conversaId);
      
      if (!conversa) {
        socket.emit('error', { message: 'Conversa não encontrada' });
        return;
      }
      
      // Verificar permissão
      if (socket.user.role !== 'admin' && conversa.setor !== socket.user.setor) {
        socket.emit('error', { message: 'Permissão negada para esta conversa' });
        return;
      }
      
      // Atualizar status
      conversa.status = 'resolvido';
      conversa.finalizadoEm = Date.now();
      conversa.tempoAtendimento = conversa.finalizadoEm - conversa.iniciadoEm;
      
      await conversa.save();
      
      // Notificar cliente via WhatsApp
      await whatsappService.sendTextMessage(
        conversa.cliente.telefone,
        `Atendimento finalizado. Agradecemos o contato!`,
        'sistema'
      );
      
      // Notificar todos na sala da conversa
      io.to(`conversa:${conversaId}`).emit('conversa:finalizada', {
        conversaId,
        atendente: socket.user.nomeExibicao
      });
      
      // Notificar que a conversa foi atualizada
      io.to(`setor:${conversa.setor}`).emit('conversa:atualizada', conversa);
      io.to('admin').emit('conversa:atualizada', conversa);
      
      console.log(`Conversa ${conversaId} finalizada por ${socket.user.nomeExibicao}`);
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      socket.emit('error', { message: 'Erro ao finalizar conversa' });
    }
  };
  
  io.on('connection', async (socket) => {
    try {
      console.log(`Novo usuário conectado: ${socket.user.nomeExibicao} (${socket.user.role})`);
      
      // Atualizar último acesso do usuário
      await Usuario.findOneAndUpdate(
        { email: socket.user.email },
        { ultimoAcesso: new Date() }
      );
      
      // Registrar conexão
      usuariosConectados.set(socket.id, { 
        id: socket.user.id,
        email: socket.user.email,
        nome: socket.user.nome,
        nomeExibicao: socket.user.nomeExibicao,
        role: socket.user.role,
        setor: socket.user.setor,
        socketId: socket.id,
        lastActivity: Date.now()
      });
      
      // Entrar em salas específicas baseadas em permissões
      if (socket.user.role === 'admin') {
        // Administrador entra em todas as salas de setor
        socket.join('admin');
      } else if (socket.user.setor) {
        // Representante entra apenas na sala do seu setor
        socket.join(`setor:${socket.user.setor}`);
      }
      
      // Notificar que o usuário está online
      io.emit('usuario:online', {
        id: socket.user.id,
        nome: socket.user.nome,
        nomeExibicao: socket.user.nomeExibicao,
        role: socket.user.role,
        setor: socket.user.setor
      });
      
      // Evento para obter conversas do setor ou todas as conversas (para admin)
      socket.on('conversas:listar', async (data = {}) => {
        try {
          const { status = ['aguardando', 'em_andamento'], setor, limit = 100 } = data;
          
          const query = {
            status: { $in: Array.isArray(status) ? status : [status] }
          };
          
          // Adicionar filtro por setor para representantes
          if (socket.user.role === 'representante') {
            query.setor = socket.user.setor;
          } else if (setor) {
            // Admin pode filtrar por setor específico
            query.setor = setor;
          }
          
          const conversas = await Conversa.find(query)
            .sort({ atualizadoEm: -1 })
            .limit(parseInt(limit));
          
          socket.emit('conversas:lista', conversas);
        } catch (error) {
          console.error('Erro ao listar conversas:', error);
          socket.emit('error', { message: 'Erro ao listar conversas' });
        }
      });
      
      // Evento para selecionar uma conversa específica
      socket.on('conversa:selecionar', async (conversaId) => {
        try {
          const conversa = await Conversa.findById(conversaId);
          
          if (!conversa) {
            return socket.emit('error', { message: 'Conversa não encontrada' });
          }
          
          // Verificar permissão (admin pode ver qualquer conversa, representante apenas do seu setor)
          if (socket.user.role !== 'admin' && conversa.setor !== socket.user.setor) {
            return socket.emit('error', { message: 'Acesso negado a esta conversa' });
          }
          
          // Entrar na sala da conversa
          socket.join(`conversa:${conversaId}`);
          
          // Notificar que este usuário está visualizando a conversa
          io.to(`conversa:${conversaId}`).emit('conversa:visualizando', {
            conversaId,
            usuario: {
              id: socket.user.id,
              nome: socket.user.nome,
              nomeExibicao: socket.user.nomeExibicao,
              role: socket.user.role,
              setor: socket.user.setor
            }
          });
          
          // Atualizar atividade recente
          const usuario = usuariosConectados.get(socket.id);
          if (usuario) {
            usuario.lastActivity = Date.now();
            usuario.currentConversation = conversaId;
          }
          
          console.log(`Usuário ${socket.user.nomeExibicao} entrou na conversa ${conversaId}`);
        } catch (error) {
          console.error('Erro ao selecionar conversa:', error);
          socket.emit('error', { message: 'Erro ao selecionar conversa' });
        }
      });
      
      // Evento para enviar mensagem
      socket.on('mensagem:enviar', async (data) => {
        try {
          const { conversaId, texto } = data;
          
          if (!texto || !texto.trim()) {
            return socket.emit('error', { message: 'Mensagem vazia' });
          }
          
          // Verificar se é um comando
          if (texto.startsWith('/')) {
            const [fullCommand, ...paramsArray] = texto.substring(1).split(' ');
            const command = fullCommand.toLowerCase();
            const params = paramsArray.join(' ');
            
            return await processCommand(command, params, socket, conversaId);
          }
          
          const conversa = await Conversa.findById(conversaId);
          
          if (!conversa) {
            return socket.emit('error', { message: 'Conversa não encontrada' });
          }
          
          // Verificar permissão
          if (socket.user.role !== 'admin' && conversa.setor !== socket.user.setor) {
            return socket.emit('error', { message: 'Acesso negado a esta conversa' });
          }
          
          // Se for a primeira resposta, mudar status para em andamento
          if (conversa.status === 'aguardando') {
            conversa.status = 'em_andamento';
          }
          
          // Adicionar mensagem
          conversa.mensagens.push({
            texto,
            tipo: 'atendente',
            atendente: socket.user.nomeExibicao
          });
          
          // Atualizar data
          conversa.atualizadoEm = Date.now();
          
          await conversa.save();
          
          // Enviar mensagem via WhatsApp
          await whatsappService.sendTextMessage(
            conversa.cliente.telefone,
            texto,
            socket.user.nomeExibicao,
            conversa.setor
          );
          
          // Notificar todos na sala da conversa
          io.to(`conversa:${conversaId}`).emit('mensagem:nova', {
            conversaId,
            texto,
            tipo: 'atendente',
            atendente: socket.user.nomeExibicao,
            criadoEm: new Date()
          });
          
          // Notificar que a conversa foi atualizada
          io.to(`setor:${conversa.setor}`).emit('conversa:atualizada', conversa);
          io.to('admin').emit('conversa:atualizada', conversa);
          
          // Atualizar atividade recente
          const usuario = usuariosConectados.get(socket.id);
          if (usuario) {
            usuario.lastActivity = Date.now();
          }
          
          console.log(`Mensagem enviada na conversa ${conversaId} por ${socket.user.nomeExibicao}`);
        } catch (error) {
          console.error('Erro ao enviar mensagem:', error);
          socket.emit('error', { message: 'Erro ao enviar mensagem' });
        }
      });
      
      // Evento para finalizar conversa (via botão, não comando)
      socket.on('conversa:finalizar', async (conversaId) => {
        await finalizarConversa(socket, conversaId);
      });
      
      // Evento para transferir conversa (via botão, não comando)
      socket.on('conversa:transferir', async (data) => {
        const { conversaId, novoSetor } = data;
        await transferirConversa(socket, conversaId, novoSetor);
      });
      
      // Desconexão
      socket.on('disconnect', () => {
        const usuario = usuariosConectados.get(socket.id);
        
        if (usuario) {
          console.log(`Usuário ${usuario.nomeExibicao} desconectado`);
          usuariosConectados.delete(socket.id);
          
          // Notificar que o usuário está offline
          io.emit('usuario:offline', {
            id: usuario.id,
            email: usuario.email
          });
        }
      });
    } catch (error) {
      console.error('Erro na conexão do socket:', error);
    }
  });
  
  // Heartbeat para monitorar usuários conectados (a cada 30 segundos)
  setInterval(() => {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutos
    
    usuariosConectados.forEach((usuario, socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      
      // Se o socket não existe mais ou está inativo por muito tempo
      if (!socket || now - usuario.lastActivity > inactiveThreshold) {
        usuariosConectados.delete(socketId);
        io.emit('usuario:offline', {
          id: usuario.id,
          email: usuario.email
        });
        console.log(`Usuário ${usuario.nomeExibicao} marcado como offline (inativo)`);
      }
    });
  }, 30000);
  
  console.log('Servidor WebSocket configurado com autenticação e comandos rápidos');
};

module.exports = setupSocketServer;