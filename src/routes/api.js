const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middlewares de autenticação
const { verifyToken, isAdmin, hasSetorAccess } = require('../middlewares/authMiddleware');

// Controllers
const setorController = require('../controllers/setorController');
const conversaController = require('../controllers/conversaController');
const templateController = require('../controllers/templateController');
const webhookController = require('../controllers/webhookController');
const usuarioController = require('../controllers/usuarioController');
const dashboardController = require('../controllers/dashboardController');

// Rotas públicas para webhooks (sem autenticação)
router.post('/webhook/whatsapp', webhookController.processWhatsappWebhook);
router.post('/webhook/whatsapp/:userId', webhookController.processWhatsappWebhook);

// Rota temporária para gerar token de teste (REMOVER EM PRODUÇÃO)
router.get('/gerar-token-teste', (req, res) => {
  const payload = {
    user_id: 'test-admin',
    email: 'admin@test.com',
    name: 'Admin Teste',
    nomeExibicao: 'Admin de Testes',
    role: 'admin',
    setor: 'Suporte'
  };
  
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'chave-temporaria', { expiresIn: '24h' });
  
  res.status(200).json({ token });
});

// MIDDLEWARE TEMPORÁRIO PARA TESTES - Simula um usuário admin
// REMOVER EM PRODUÇÃO
if (process.env.BRANCH === 'dev') {
  router.use((req, res, next) => {
    // Simular um usuário admin para testes
    req.user = {
      id: 'test-admin',
      email: 'admin@test.com',
      nome: 'Admin Teste',
      nomeExibicao: 'Admin de Testes',
      role: 'admin',
      setor: 'Suporte'
    };
    next();
  });
} else {
  // Middleware normal de autenticação para produção
  router.use(verifyToken);
}

// Sincronização e perfil de usuário
router.post('/sync-user', usuarioController.syncUsuario);
router.get('/meu-perfil', usuarioController.getMeuPerfil);
router.put('/meu-perfil', usuarioController.updateMeuPerfil);

// Dashboard
router.get('/dashboard', dashboardController.getDashboardStats);

// Rotas para setores
router.get('/setores', setorController.getSetores);
router.post('/setores', isAdmin, setorController.createSetor);
router.get('/setores/:id', setorController.getSetorById);
router.put('/setores/:id', isAdmin, setorController.updateSetor);
router.delete('/setores/:id', isAdmin, setorController.deleteSetor);

// Rotas para conversas
router.get('/conversas', hasSetorAccess, conversaController.getConversas);
router.get('/conversas/:id', conversaController.getConversaById);
router.post('/conversas', conversaController.getOrCreateConversa);
router.put('/conversas/:id', conversaController.updateConversaStatus);
router.post('/conversas/:id/mensagens', conversaController.addAtendenteMensagem);
router.get('/estatisticas', conversaController.getEstatisticas);

// Rotas para templates
router.get('/templates', templateController.getTemplates);
router.post('/templates', templateController.createTemplate);
router.get('/templates/meus', templateController.getMyTemplates);
router.get('/templates/:id', templateController.getTemplateById);
router.put('/templates/:id', templateController.updateTemplate);
router.delete('/templates/:id', templateController.deleteTemplate);

// Rotas para gestão de usuários (apenas admin)
router.get('/usuarios', isAdmin, usuarioController.getUsuarios);
router.get('/usuarios/:id', isAdmin, usuarioController.getUsuarioById);
router.put('/usuarios/:id', isAdmin, usuarioController.updateUsuario);

module.exports = router;