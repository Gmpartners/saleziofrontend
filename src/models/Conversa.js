const mongoose = require('mongoose');

const mensagemSchema = new mongoose.Schema({
  texto: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    enum: ['cliente', 'atendente', 'ia'],
    required: true
  },
  atendente: {
    type: String,
    required: function() {
      return this.tipo === 'atendente';
    }
  },
  criadoEm: {
    type: Date,
    default: Date.now
  }
});

const conversaSchema = new mongoose.Schema({
  cliente: {
    nome: {
      type: String,
      required: true
    },
    telefone: {
      type: String,
      required: true,
      index: true
    }
  },
  setor: {
    type: String,
    required: true,
    index: true
  },
  assunto: {
    type: String,
    default: 'Atendimento'
  },
  status: {
    type: String,
    enum: ['em_andamento', 'resolvido', 'aguardando'],
    default: 'aguardando',
    index: true
  },
  mensagens: [mensagemSchema],
  tags: [String],
  iniciadoEm: {
    type: Date,
    default: Date.now
  },
  atualizadoEm: {
    type: Date,
    default: Date.now
  },
  finalizadoEm: {
    type: Date
  },
  tempoAtendimento: {
    type: Number // em milissegundos
  },
  tempoSemResposta: {
    type: Number // em milissegundos
  }
});

// Adicionar índices para consultas frequentes
conversaSchema.index({ 'cliente.telefone': 1, 'status': 1 });
conversaSchema.index({ 'setor': 1, 'status': 1 });

// Middlware para atualizar a data de atualização
conversaSchema.pre('save', function(next) {
  this.atualizadoEm = Date.now();
  
  // Se o status mudar para 'resolvido', registrar a data e calcular o tempo de atendimento
  if (this.isModified('status') && this.status === 'resolvido') {
    this.finalizadoEm = Date.now();
    this.tempoAtendimento = this.finalizadoEm - this.iniciadoEm;
  }
  
  next();
});

const Conversa = mongoose.model('Conversa', conversaSchema);

module.exports = Conversa;
