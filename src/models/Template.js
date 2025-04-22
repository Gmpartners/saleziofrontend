const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  conteudo: {
    type: String,
    required: true
  },
  setor: {
    type: String,
    required: function() {
      return !this.emailUsuario; // Obrigatório se não for um template pessoal
    },
    index: true
  },
  emailUsuario: {
    type: String,
    index: true
  },
  compartilhado: {
    type: Boolean,
    default: false
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

// Remover a restrição de uniqueness do nome, pois agora podemos ter
// templates com o mesmo nome em diferentes setores ou para diferentes usuários
// Ao invés disso, garantiremos isso no controlador

// Índices compostos para buscar eficientemente
templateSchema.index({ setor: 1, ativo: 1 });
templateSchema.index({ emailUsuario: 1, ativo: 1 });
templateSchema.index({ nome: 1, setor: 1 }, { unique: true, partialFilterExpression: { emailUsuario: { $exists: false } } });
templateSchema.index({ nome: 1, emailUsuario: 1 }, { unique: true, partialFilterExpression: { emailUsuario: { $exists: true } } });

// Middleware
templateSchema.pre('save', function(next) {
  this.atualizadoEm = Date.now();
  next();
});

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
