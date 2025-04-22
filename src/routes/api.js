const express = require('express');
const router = express.Router();

// Controllers
const setorController = require('../controllers/setorController');
const conversaController = require('../controllers/conversaController');
const templateController = require('../controllers/templateController');
const webhookController = require('../controllers/webhookController');

// Rotas para setores
router.get('/setores', setorController.getSetores);
router.post('/setores', setorController.createSetor);
router.get('/setores/:id', setorController.getSetorById);
router.put('/setores/:id', setorController.updateSetor);
router.delete('/setores/:id', setorController.deleteSetor);

// Rotas para conversas
router.get('/conversas', conversaController.getConversas);
router.get('/conversas/:id', conversaController.getConversaById);
router.post('/conversas', conversaController.getOrCreateConversa);
router.put('/conversas/:id', conversaController.updateConversaStatus);
router.post('/conversas/:id/mensagens', conversaController.addAtendenteMensagem);
router.get('/estatisticas', conversaController.getEstatisticas);

// Rotas para templates
router.get('/templates', templateController.getTemplates);
router.post('/templates', templateController.createTemplate);
router.get('/templates/:id', templateController.getTemplateById);
router.put('/templates/:id', templateController.updateTemplate);
router.delete('/templates/:id', templateController.deleteTemplate);

// Rotas para webhooks
router.post('/webhook/whatsapp', webhookController.processWhatsappWebhook);
router.post('/webhook/whatsapp/:userId', webhookController.processWhatsappWebhook);

module.exports = router;
