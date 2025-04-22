const mongoose = require('mongoose');

const setorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  descricao: {
    type: String,
    required: true,
    trim: true
  },
  responsaveis: [{
    nome: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true
    },
    ativo: {
      type: Boolean,
      default: true
    }
  }],
  ativo: {
    type: Boolean,
    default: true
  },
  criadoEm: {
    type: Date,
    default: Date.now
  },
  atualizadoEm: {
    type: Date,
    default: Date.now
  }
});

// Middlewares
setorSchema.pre('save', function(next) {
  this.atualizadoEm = Date.now();
  next();
});

const Setor = mongoose.model('Setor', setorSchema);

module.exports = Setor;
