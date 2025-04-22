const Template = require('../models/Template');

// Obter todos os templates
const getTemplates = async (req, res) => {
  try {
    const { setor, ativo } = req.query;
    
    const query = {};
    
    if (setor) query.setor = setor;
    if (ativo !== undefined) query.ativo = ativo === 'true';
    
    const templates = await Template.find(query).sort({ nome: 1 });
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar templates', error: error.message });
  }
};

// Criar novo template
const createTemplate = async (req, res) => {
  try {
    const { nome, conteudo, setor, tags } = req.body;
    
    if (!nome || !conteudo || !setor) {
      return res.status(400).json({ message: 'Nome, conteúdo e setor são obrigatórios' });
    }
    
    // Verificar se já existe um template com esse nome
    const templateExistente = await Template.findOne({ nome });
    if (templateExistente) {
      return res.status(400).json({ message: 'Template com este nome já existe' });
    }
    
    const novoTemplate = new Template({
      nome,
      conteudo,
      setor,
      tags: tags || []
    });
    
    const templateSalvo = await novoTemplate.save();
    res.status(201).json(templateSalvo);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar template', error: error.message });
  }
};

// Obter template por ID
const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template não encontrado' });
    }
    
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar template', error: error.message });
  }
};

// Atualizar template
const updateTemplate = async (req, res) => {
  try {
    const { nome, conteudo, setor, tags, ativo } = req.body;
    
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template não encontrado' });
    }
    
    // Verificar nome duplicado
    if (nome && nome !== template.nome) {
      const templateExistente = await Template.findOne({ nome });
      if (templateExistente) {
        return res.status(400).json({ message: 'Template com este nome já existe' });
      }
    }
    
    // Atualizar campos
    if (nome) template.nome = nome;
    if (conteudo) template.conteudo = conteudo;
    if (setor) template.setor = setor;
    if (tags) template.tags = tags;
    if (ativo !== undefined) template.ativo = ativo;
    
    const templateAtualizado = await template.save();
    res.status(200).json(templateAtualizado);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar template', error: error.message });
  }
};

// Excluir template (exclusão lógica)
const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template não encontrado' });
    }
    
    template.ativo = false;
    await template.save();
    
    res.status(200).json({ message: 'Template desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao desativar template', error: error.message });
  }
};

module.exports = {
  getTemplates,
  createTemplate,
  getTemplateById,
  updateTemplate,
  deleteTemplate
};
