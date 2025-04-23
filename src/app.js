// Carregar variáveis de ambiente
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

// Importar rotas
const apiRoutes = require('./routes/api');

// Configuração do app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
app.use(express.json({ limit: '10mb' })); // Aumentar limite para payloads maiores

// COMENTADO TEMPORARIAMENTE PARA TESTES - Usar apenas em ambiente de produção
if (process.env.BRANCH !== 'dev') {
  // Verificação de autenticação antiga (token simples)
  // Mantida para compatibilidade com clientes existentes
  app.use((req, res, next) => {
    // Verificar se a requisição está usando o novo método de autenticação
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      return next(); // Usar o novo middleware de autenticação JWT
    }
    
    // Webhook completamente aberto para facilitar integração
    if (req.path.startsWith('/api/webhook/')) {
      return next();
    }
    
    // Método antigo usando x-api-token
    const token = req.headers['x-api-token'];
    
    if (!token || token !== process.env.API_TOKEN) {
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    next();
  });
}

// Exportar o objeto io para ser usado em outros módulos
global.io = io;

// Rota principal para verificação de funcionamento
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    branch: process.env.BRANCH || 'dev',
    version: '1.0.0',
    serverTime: new Date().toISOString(),
    testMode: process.env.BRANCH === 'dev' ? true : false
  });
});

// Configurar Socket.IO - precisa ser depois da exportação global
const setupSocketServer = require('./websocket/socket');
setupSocketServer(io);

// Rotas API
app.use('/api', apiRoutes);

// Middleware para erros
app.use((err, req, res, next) => {
  console.error('Erro na aplicação:', err);
  res.status(500).json({ message: 'Erro interno no servidor', error: err.message });
});

// Iniciar servidor
const port = process.env.PORT || 3100;
server.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} - Branch: ${process.env.BRANCH || 'dev'}`);
  if (process.env.BRANCH === 'dev') {
    console.log(`MODO DE TESTE: Autenticação desativada para facilitar testes`);
  }
  console.log(`Sistema de multiatendimento WhatsApp com autenticação baseada em tokens JWT`);
});

module.exports = { app, server };