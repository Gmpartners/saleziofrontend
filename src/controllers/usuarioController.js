const Usuario = require('../models/Usuario');

// Obter todos os usuários (apenas admin)
const getUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find({ ativo: true }).sort({ nome: 1 });
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
  }
};

// Obter usuário por ID
const getUsuarioById = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
  }
};

// Atualizar usuário (apenas admin)
const updateUsuario = async (req, res) => {
  try {
    const { nome, email, setor, role, nomeExibicao, ativo } = req.body;
    
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o email já está em uso por outro usuário
    if (email && email !== usuario.email) {
      const emailExistente = await Usuario.findOne({ email });
      if (emailExistente) {
        return res.status(400).json({ message: 'Email já cadastrado para outro usuário' });
      }
    }
    
    // Atualizar campos
    if (nome) usuario.nome = nome;
    if (email) usuario.email = email;
    if (setor) usuario.setor = setor;
    if (role) usuario.role = role;
    if (nomeExibicao) usuario.nomeExibicao = nomeExibicao;
    if (ativo !== undefined) usuario.ativo = ativo;
    
    const usuarioAtualizado = await usuario.save();
    res.status(200).json(usuarioAtualizado);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
  }
};

// Obter perfil do usuário logado
const getMeuPerfil = async (req, res) => {
  try {
    // Buscar usuário no banco pela informação do token
    const usuario = await Usuario.findOne({ email: req.user.email });

    if (!usuario) {
      return res.status(404).json({ message: 'Perfil não encontrado. Sincronize seu usuário primeiro.' });
    }
    
    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar perfil', error: error.message });
  }
};

// Atualizar perfil do usuário logado
const updateMeuPerfil = async (req, res) => {
  try {
    const { nomeExibicao } = req.body;
    
    if (!nomeExibicao) {
      return res.status(400).json({ message: 'Nome de exibição é obrigatório' });
    }
    
    // Buscar usuário no banco pela informação do token
    let usuario = await Usuario.findOne({ email: req.user.email });

    if (!usuario) {
      return res.status(404).json({ message: 'Perfil não encontrado. Sincronize seu usuário primeiro.' });
    }
    
    usuario.nomeExibicao = nomeExibicao;
    
    await usuario.save();
    
    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar perfil', error: error.message });
  }
};

// Sincronizar usuário do Firebase
const syncUsuario = async (req, res) => {
  try {
    // Os dados vêm do token decodificado
    const { id, email, nome, role, setor, nomeExibicao } = req.user;
    
    // Verificar dados obrigatórios
    if (!email) {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }
    
    // Verificar se usuário já existe
    let usuario = await Usuario.findOne({ email });
    
    if (usuario) {
      // Atualizar informações se necessário
      if (nome) usuario.nome = nome;
      if (nomeExibicao) usuario.nomeExibicao = nomeExibicao;
      if (role) usuario.role = role;
      if (setor) usuario.setor = setor;
      if (id) usuario.firebaseUid = id;
      
      usuario.ultimoAcesso = new Date();
    } else {
      // Criar novo usuário
      usuario = new Usuario({
        email,
        nome,
        nomeExibicao: nomeExibicao || nome,
        role: role || 'representante',
        setor,
        firebaseUid: id,
        ultimoAcesso: new Date()
      });
    }
    
    await usuario.save();
    
    res.status(200).json({
      success: true,
      usuario: {
        id: usuario._id,
        email: usuario.email,
        nome: usuario.nome,
        nomeExibicao: usuario.nomeExibicao,
        role: usuario.role,
        setor: usuario.setor
      }
    });
  } catch (error) {
    console.error('Erro ao sincronizar usuário:', error);
    res.status(500).json({ message: 'Erro ao sincronizar usuário', error: error.message });
  }
};

module.exports = {
  getUsuarios,
  getUsuarioById,
  updateUsuario,
  getMeuPerfil,
  updateMeuPerfil,
  syncUsuario
};
