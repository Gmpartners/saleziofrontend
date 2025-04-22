const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    // Rotas de webhook não precisam de autenticação
    if (req.path.startsWith('/webhook/')) {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Decodificar token (no ambiente de produção, usaria jwks-rsa)
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.user_id) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    // Extrair informações do usuário do token
    req.user = {
      id: decoded.user_id,
      email: decoded.email,
      nome: decoded.name || decoded.email.split('@')[0],
      role: decoded.role || 'representante',
      setor: decoded.setor,
      nomeExibicao: decoded.nomeExibicao || decoded.name || decoded.email.split('@')[0]
    };
    
    next();
  } catch (error) {
    console.error('Erro de autenticação:', error);
    res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  res.status(403).json({ message: 'Permissão negada. Acesso restrito a administradores.' });
};

// Middleware para verificar se tem acesso ao setor
const hasSetorAccess = (req, res, next) => {
  // Admin tem acesso a todos os setores
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Verificar se o setor da requisição é o mesmo do usuário
  const setorParam = req.params.setor || req.query.setor || req.body.setor;
  
  if (setorParam && setorParam !== req.user.setor) {
    return res.status(403).json({ message: 'Permissão negada. Acesso restrito ao seu setor.' });
  }
  
  next();
};

module.exports = { verifyToken, isAdmin, hasSetorAccess };
