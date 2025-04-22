const Template = require('../models/Template');

// Obter todos os templates (por setor ou pessoais)
const getTemplates = async (req, res) => {
  try {
    const { setor, ativo, compartilhados } = req.query;
    
    const query = { ativo: ativo === 'false' ? false : true };
    
    // Se o usuário não é admin, só pode ver templates do seu setor ou seus templates pessoais
    if (req.user.role !== 'admin') {
      if (setor) {
        // Templates do setor especificado (se o usuário pertence a ele)
        if (setor !== req.user.setor) {
          return res.status(403).json({ message: 'Permissão negada para acessar templates deste setor' });
        }
        query.setor = setor;
      } else {
        // Templates do setor do usuário + templates pessoais + templates compartilhados de outros
        query.$or = [
          { setor: req.user.setor },
          { emailUsuario: req.user.email },
          { compartilhado: true }
        ];
      }
    } else if (setor) {
      // Admin pode filtrar por setor específico
      query.setor = setor;
    }
    
    // Filtrar apenas templates compartilhados (de outros usuários)
    if (compartilhados === 'true') {
      query.compartilhado = true;
      query.emailUsuario = { $ne: req.user.email };
    }
    
    const templates = await Template.find(query).sort({ nome: 1 });
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar templates', error: error.message });
  }
};

// Obter templates pessoais do usuário
const getMyTemplates = async (req, res) => {
  try {
    const templates = await Template.find({ 
      emailUsuario: req.user.email,
      ativo: true 
    });
    
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar templates pessoais', error: error.message });
  }
};

// Criar novo template (de setor ou pessoal)
const createTemplate = async (req, res) => {
  try {
    const { nome, conteudo, setor, tags, compartilhado } = req.body;
    
    // Validações básicas
    if (!nome || !conteudo) {
      return res.status(400).json({ message: 'Nome e conteúdo são obrigatórios' });
    }
    
    // Se não for admin, só pode criar templates para seu setor ou templates pessoais
    if (req.user.role !== 'admin' && setor && setor !== req.user.setor) {
      return res.status(403).json({ message: 'Permissão negada para criar template para este setor' });
    }
    
    // Verificar se já existe template com este nome (para o usuário ou para o setor)
    let query;
    if (setor) {
      query = { nome, setor };
    } else {
      query = { nome, emailUsuario: req.user.email };
    }
    
    const templateExistente = await Template.findOne(query);
    if (templateExistente) {
      return res.status(400).json({ 
        message: setor 
          ? `Template com nome "${nome}" já existe para o setor ${setor}`
          : `Template com nome "${nome}" já existe entre seus templates pessoais`
      });
    }
    
    // Criar o template (de setor ou pessoal)
    const novoTemplate = new Template({
      nome,
      conteudo,
      setor: setor || null,
      emailUsuario: setor ? null : req.user.email,
      compartilhado: setor ? true : (compartilhado || false),
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
    
    // Verificar permissão de acesso
    const isAdmin = req.user.role === 'admin';
    const isOwner = template.emailUsuario === req.user.email;
    const isSameSetor = template.setor === req.user.setor;
    const isShared = template.compartilhado;
    
    if (!isAdmin && !isOwner && !isSameSetor && !isShared) {
      return res.status(403).json({ message: 'Permissão negada para acessar este template' });
    }
    
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar template', error: error.message });
  }
};

// Atualizar template
const updateTemplate = async (req, res) => {
  try {
    const { nome, conteudo, setor, tags, compartilhado, ativo } = req.body;
    
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template não encontrado' });
    }
    
    // Verificar permissão para editar
    const isAdmin = req.user.role === 'admin';
    const isOwner = template.emailUsuario === req.user.email;
    const isSectorManager = req.user.role === 'admin' || (template.setor && template.setor === req.user.setor);
    
    if (!isAdmin && !isOwner && !isSectorManager) {
      return res.status(403).json({ message: 'Permissão negada para editar este template' });
    }
    
    // Verificar nome duplicado (só se estiver mudando o nome)
    if (nome && nome !== template.nome) {
      let query;
      if (template.setor) {
        query = { nome, setor: template.setor, _id: { $ne: template._id } };
      } else if (template.emailUsuario) {
        query = { nome, emailUsuario: template.emailUsuario, _id: { $ne: template._id } };
      }
      
      if (query) {
        const templateExistente = await Template.findOne(query);
        if (templateExistente) {
          return res.status(400).json({ 
            message: template.setor 
              ? `Template com nome "${nome}" já existe para o setor ${template.setor}`
              : `Template com nome "${nome}" já existe entre seus templates pessoais`
          });
        }
      }
    }
    
    // Atualizar campos
    if (nome) template.nome = nome;
    if (conteudo) template.conteudo = conteudo;
    if (tags) template.tags = tags;
    
    // Campos que apenas o admin pode atualizar
    if (isAdmin) {
      if (setor !== undefined) template.setor = setor;
      if (ativo !== undefined) template.ativo = ativo;
    }
    
    // Campos que o proprietário pode atualizar
    if (isOwner || isAdmin) {
      if (compartilhado !== undefined) template.compartilhado = compartilhado;
    }
    
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
    
    // Verificar permissão para excluir
    const isAdmin = req.user.role === 'admin';
    const isOwner = template.emailUsuario === req.user.email;
    const isSectorManager = req.user.role === 'admin' || (template.setor && template.setor === req.user.setor);
    
    if (!isAdmin && !isOwner && !isSectorManager) {
      return res.status(403).json({ message: 'Permissão negada para excluir este template' });
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
  getMyTemplates,
  createTemplate,
  getTemplateById,
  updateTemplate,
  deleteTemplate
};
