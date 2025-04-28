// Servidor WebSocket local para desenvolvimento
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Mapeamento de salas
const rooms = new Map();

// Eventos do Socket.IO
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  
  // Registrar identificação do usuário
  socket.on('identify', (data) => {
    if (data && data.userId) {
      console.log(`Usuário identificado: ${data.userId}`);
      socket.join(`user_${data.userId}`);
    }
  });
  
  // Entrar em uma sala
  socket.on('join', (room) => {
    console.log(`Cliente ${socket.id} entrou na sala: ${room}`);
    socket.join(room);
    
    // Registrar na estrutura de salas
    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }
    rooms.get(room).add(socket.id);
  });
  
  // Sair de uma sala
  socket.on('leave', (room) => {
    console.log(`Cliente ${socket.id} saiu da sala: ${room}`);
    socket.leave(room);
    
    // Atualizar estrutura de salas
    if (rooms.has(room)) {
      rooms.get(room).delete(socket.id);
      if (rooms.get(room).size === 0) {
        rooms.delete(room);
      }
    }
  });
  
  // Subscrever em um setor
  socket.on('subscribe', (data) => {
    if (data && data.setor) {
      const setorRoom = `setor_${data.setor}`;
      console.log(`Cliente ${socket.id} inscrito no setor: ${data.setor}`);
      socket.join(setorRoom);
    }
  });
  
  // Evento para mensagens
  socket.on('mensagem:enviar', (data) => {
    console.log(`Nova mensagem recebida: ${JSON.stringify(data)}`);
    
    // Emitir evento de nova mensagem para a sala da conversa
    if (data.conversaId) {
      const conversaRoom = `conversa_${data.conversaId}`;
      io.to(conversaRoom).emit('nova_mensagem', {
        conversaId: data.conversaId,
        mensagem: {
          remetente: data.userId || 'sistema',
          conteudo: data.texto,
          timestamp: new Date()
        }
      });
    }
  });
  
  // Desconexão do cliente
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor WebSocket rodando na porta: ${PORT}`);
  console.log(`URL de conexão: http://localhost:${PORT}`);
});
