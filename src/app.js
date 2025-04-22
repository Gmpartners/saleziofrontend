// Carregar variáveis de ambiente
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');

// Importar rotas
const apiRoutes = require('./routes/api');

// Configuração do app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Configuração do banco de dados
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });

// Middleware
app.use(cors());
app.use(express.json());

// Autenticação simples via token para todas as rotas
app.use((req, res, next) => {
  const token = req.headers['x-api-token'];
  
  // Rota de webhook sem autenticação para facilitar integração
  if (req.path.startsWith('/api/webhook/')) {
    return next();
  }
  
  if (!token || token !== process.env.API_TOKEN) {
    return res.status(401).json({ message: 'Não autorizado' });
  }
  
  next();
});

// Exportar o objeto io para ser usado em outros módulos
global.io = io;

// Rota principal para verificação de funcionamento
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    branch: process.env.BRANCH || 'dev',
    version: '1.0.0',
    serverTime: new Date().toISOString()
  });
});

// Configurar Socket.IO - precisa ser depois da exportação global
const setupSocketServer = require('./websocket/socket');
setupSocketServer(io);

// Rotas API - precisa ser depois da configuração do Socket.IO
app.use('/api', apiRoutes);

// Iniciar servidor
const port = process.env.PORT || 3100; // Alterado para 3100 para evitar conflitos
server.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} - Branch: ${process.env.BRANCH || 'dev'}`);
});

module.exports = { app, server };
