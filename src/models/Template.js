const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  conteudo: {
    type: String,
    required: true
  },
  setor: {
    type: String,
    required: true,
    index: true
  },
  tags: [String],
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
  }
});

// Middleware
templateSchema.pre('save', function(next) {
  this.atualizadoEm = Date.now();
  next();
});

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
