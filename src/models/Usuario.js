const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // unique já cria um índice
    trim: true,
    lowercase: true
  },
  nome: {
    type: String,
    required: true,
    trim: true
  },
  nomeExibicao: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'representante'],
    default: 'representante'
  },
  setor: {
    type: String,
    required: function() {
      return this.role === 'representante';
    }
  },
  ultimoAcesso: {
    type: Date,
    default: Date.now
  },
  criadoEm: {
    type: Date,
    default: Date.now
  },
  atualizadoEm: {
    type: Date,
    default: Date.now
  },
  ativo: {
    type: Boolean,
    default: true
  },
  firebaseUid: {
    type: String,
    sparse: true,
    index: true
  }
});

// Índices para consultas frequentes
// Removido o índice duplicado de email, pois unique:true já cria um
usuarioSchema.index({ setor: 1, role: 1 });

// Atualizar data de alteração
usuarioSchema.pre('save', function(next) {
  this.atualizadoEm = new Date();
  
  // Se nomeExibicao não estiver definido, usar o nome
  if (!this.nomeExibicao) {
    this.nomeExibicao = this.nome;
  }
  
  next();
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;
