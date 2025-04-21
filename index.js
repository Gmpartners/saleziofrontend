const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const branch = process.env.BRANCH || 'dev';

// Middleware para JSON
app.use(express.json());

// Rota principal
app.get('/', (req, res) => {
  res.send(`WPP Multiatendimento - Branch: ${branch} - ${new Date().toISOString()}`);
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    branch: branch,
    version: '1.0.0',
    serverTime: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor WPP Multiatendimento rodando na porta ${port} - Branch: ${branch}`);
});