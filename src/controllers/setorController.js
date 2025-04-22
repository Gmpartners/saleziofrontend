const Setor = require('../models/Setor');

// Obter todos os setores
const getSetores = async (req, res) => {
  try {
    const setores = await Setor.find({ ativo: true });
    res.status(200).json(setores);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar setores', error: error.message });
  }
};

// Criar novo setor
const createSetor = async (req, res) => {
  try {
    const { nome, descricao, responsaveis } = req.body;
    
    // Verificar se o setor já existe
    const setorExistente = await Setor.findOne({ nome });
    if (setorExistente) {
      return res.status(400).json({ message: 'Setor com este nome já existe' });
    }
    
    const novoSetor = new Setor({
      nome,
      descricao,
      responsaveis: responsaveis || []
    });
    
    const setorSalvo = await novoSetor.save();
    res.status(201).json(setorSalvo);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar setor', error: error.message });
  }
};

// Obter setor por ID
const getSetorById = async (req, res) => {
  try {
    const setor = await Setor.findById(req.params.id);
    
    if (!setor) {
      return res.status(404).json({ message: 'Setor não encontrado' });
    }
    
    res.status(200).json(setor);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar setor', error: error.message });
  }
};

// Atualizar setor
const updateSetor = async (req, res) => {
  try {
    const { nome, descricao, responsaveis, ativo } = req.body;
    
    const setor = await Setor.findById(req.params.id);
    
    if (!setor) {
      return res.status(404).json({ message: 'Setor não encontrado' });
    }
    
    // Verificar nome duplicado
    if (nome && nome !== setor.nome) {
      const setorExistente = await Setor.findOne({ nome });
      if (setorExistente) {
        return res.status(400).json({ message: 'Setor com este nome já existe' });
      }
    }
    
    // Atualizar campos
    if (nome) setor.nome = nome;
    if (descricao) setor.descricao = descricao;
    if (responsaveis) setor.responsaveis = responsaveis;
    if (ativo !== undefined) setor.ativo = ativo;
    
    const setorAtualizado = await setor.save();
    res.status(200).json(setorAtualizado);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar setor', error: error.message });
  }
};

// Excluir setor (exclusão lógica)
const deleteSetor = async (req, res) => {
  try {
    const setor = await Setor.findById(req.params.id);
    
    if (!setor) {
      return res.status(404).json({ message: 'Setor não encontrado' });
    }
    
    setor.ativo = false;
    await setor.save();
    
    res.status(200).json({ message: 'Setor desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao desativar setor', error: error.message });
  }
};

module.exports = {
  getSetores,
  createSetor,
  getSetorById,
  updateSetor,
  deleteSetor
};
