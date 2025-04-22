// limpar-conversas.js
require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Schema para Conversa (simplificado para não depender do modelo completo)
const conversaSchema = new mongoose.Schema({
  cliente: {
    nome: String,
    telefone: String
  },
  setor: String,
  status: String,
  mensagens: Array,
  tags: [String],
  iniciadoEm: Date,
  atualizadoEm: Date,
  finalizadoEm: Date
});

const Conversa = mongoose.model('Conversa', conversaSchema);

// Interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para limpar conversas
async function limparConversas(opcao) {
  try {
    console.log(`Conectando ao banco de dados: ${process.env.MONGODB_URI}`);
    await mongoose.connect(process.env.MONGODB_URI);
    
    let query = {};
    let mensagem = '';
    
    switch (opcao) {
      case '1': // Limpar todas as conversas
        query = {};
        mensagem = 'Removendo todas as conversas...';
        break;
      case '2': // Limpar apenas conversas em andamento
        query = { status: { $in: ['aguardando', 'em_andamento'] } };
        mensagem = 'Removendo apenas conversas em andamento...';
        break;
      case '3': // Limpar conversas de um número específico
        const telefone = await new Promise(resolve => {
          rl.question('Digite o número de telefone (ex: 5521964738621): ', resolve);
        });
        query = { 'cliente.telefone': telefone };
        mensagem = `Removendo conversas do telefone ${telefone}...`;
        break;
      default:
        console.log('Opção inválida!');
        rl.close();
        return;
    }
    
    console.log(mensagem);
    const resultado = await Conversa.deleteMany(query);
    
    console.log(`Sucesso! ${resultado.deletedCount} conversas foram removidas.`);
    console.log(`Ambiente: ${process.env.BRANCH || 'não especificado'}`);
    console.log(`Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('Erro ao limpar conversas:', error);
  } finally {
    await mongoose.connection.close();
    rl.close();
  }
}

// Menu principal
console.log('===== LIMPEZA DE CONVERSAS =====');
console.log(`Ambiente atual: ${process.env.BRANCH || 'não especificado'}`);
console.log(`Database: ${process.env.MONGODB_URI}`);
console.log('1. Limpar TODAS as conversas');
console.log('2. Limpar apenas conversas em andamento');
console.log('3. Limpar conversas de um número específico');
console.log('============================');

rl.question('Escolha uma opção: ', limparConversas);
