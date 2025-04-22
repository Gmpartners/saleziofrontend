// limpar-conversas-auto.js
require('dotenv').config();
const mongoose = require('mongoose');

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

// Opções de linha de comando
const args = process.argv.slice(2);
const opcao = args[0] || 'all'; // padrão: limpar todas
const telefone = args[1] || ''; // opcional: número de telefone específico

// Função para limpar conversas
async function limparConversas() {
  try {
    console.log(`Conectando ao banco de dados: ${process.env.MONGODB_URI}`);
    await mongoose.connect(process.env.MONGODB_URI);
    
    let query = {};
    let mensagem = '';
    
    switch (opcao) {
      case 'all': // Limpar todas as conversas
        query = {};
        mensagem = 'Removendo todas as conversas...';
        break;
      case 'active': // Limpar apenas conversas em andamento
        query = { status: { $in: ['aguardando', 'em_andamento'] } };
        mensagem = 'Removendo apenas conversas em andamento...';
        break;
      case 'phone': // Limpar conversas de um número específico
        if (!telefone) {
          console.error('Erro: Número de telefone não especificado!');
          console.log('Uso: node limpar-conversas-auto.js phone 5521964738621');
          process.exit(1);
        }
        query = { 'cliente.telefone': telefone };
        mensagem = `Removendo conversas do telefone ${telefone}...`;
        break;
      default:
        console.error('Opção inválida!');
        console.log('Uso: node limpar-conversas-auto.js [all|active|phone] [telefone]');
        process.exit(1);
    }
    
    console.log(mensagem);
    const resultado = await Conversa.deleteMany(query);
    
    console.log(`Sucesso! ${resultado.deletedCount} conversas foram removidas.`);
    console.log(`Ambiente: ${process.env.BRANCH || 'não especificado'}`);
    console.log(`Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('Erro ao limpar conversas:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Iniciar o processo
limparConversas();
