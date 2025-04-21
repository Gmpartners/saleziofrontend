const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const branch = process.env.BRANCH || 'unknown';

app.get('/', (req, res) => {
  res.send(`Hello from GitHub Actions! This is the ${branch} branch. Server time: ${new Date().toISOString()}`);
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} - Branch: ${branch}`);
});