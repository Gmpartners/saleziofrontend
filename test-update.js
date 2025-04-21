// Este arquivo serve para simular uma alteração na branch dev
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const branch = process.env.BRANCH || 'dev';

app.get('/', (req, res) => {
  res.send(`Olá do GitHub Actions! Esta é a branch ${branch}. Código atualizado! Server time: ${new Date().toISOString()}`);
});

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    branch: branch,
    version: '1.1.0',
    serverTime: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} - Branch: ${branch}`);
});