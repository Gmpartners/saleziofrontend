/**
 * Firebase Cloud Functions para integração com a API MultiFlow
 * 
 * Estas funções gerenciam a sincronização de dados entre o Firebase e a API MultiFlow,
 * particularmente para o sistema de setorização.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Importar funções de migração
const { migrateUsersToSectorized, runUserMigration } = require('./migrateUsers');

// Inicializar app se ainda não estiver inicializado
try {
  admin.app();
} catch (e) {
  admin.initializeApp();
}

// Configurações da API
const API_URL = functions.config().multiflow?.api_url || 'https://multi.compracomsegurancaeconfianca.com/api';
const API_TOKEN = functions.config().multiflow?.api_token || 'netwydZWjrJpA';

/**
 * Sincroniza alterações de usuário para a API MultiFlow
 * 
 * Disparada quando um documento é criado ou atualizado na coleção users
 */
exports.syncUserToMultiFlow = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const userData = change.after.exists ? change.after.data() : null;
    
    // Se o documento foi excluído, desativar o usuário na API
    if (!userData) {
      console.log(`Usuário ${userId} foi excluído. Desativando na API MultiFlow...`);
      return await deactivateUserInMultiFlow(userId);
    }
    
    console.log(`Sincronizando usuário ${userId} com a API MultiFlow...`);
    functions.logger.log('Dados do usuário:', userData);
    
    // Mapear dados para o formato da API MultiFlow
    const apiUserData = {
      nome: userData.displayName || 'Usuário', // Usar displayName em vez de name
      email: userData.email,
      role: userData.role || 'agent',
      setorId: userData.sector || null, // Usar sector para o ID do setor
      ativo: userData.isActive !== false // true por padrão
    };
    
    // Sincronizar com a API
    return await updateUserInMultiFlow(userId, apiUserData);
  });

/**
 * Sincroniza dados do usuário com a API MultiFlow
 * 
 * @param {string} userId - ID do usuário
 * @param {object} userData - Dados do usuário no formato da API
 * @returns {Promise} Resultado da API
 */
async function updateUserInMultiFlow(userId, userData) {
  try {
    // Na implementação real, você enviaria uma requisição para a API MultiFlow
    functions.logger.log(`Enviando dados para a API para o usuário ${userId}:`, userData);
    
    // Exemplo de chamada à API
    const response = await axios({
      method: 'POST',
      url: `${API_URL}/users/sync`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': API_TOKEN
      },
      data: {
        _id: userId,
        userId: userId,
        ...userData
      }
    });
    
    functions.logger.log(`Usuário ${userId} sincronizado com sucesso:`, response.data);
    return response.data;
  } catch (error) {
    functions.logger.error(`Erro ao sincronizar usuário ${userId}:`, error);
    throw new functions.https.HttpsError('internal', `Erro ao sincronizar usuário: ${error.message}`);
  }
}

/**
 * Desativa um usuário na API MultiFlow
 * 
 * @param {string} userId - ID do usuário
 * @returns {Promise} Resultado da API
 */
async function deactivateUserInMultiFlow(userId) {
  try {
    // Na implementação real, você enviaria uma requisição para a API MultiFlow
    functions.logger.log(`Desativando usuário ${userId} na API MultiFlow`);
    
    // Exemplo de chamada à API
    const response = await axios({
      method: 'PUT',
      url: `${API_URL}/users/${userId}/desativar`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': API_TOKEN
      }
    });
    
    functions.logger.log(`Usuário ${userId} desativado com sucesso:`, response.data);
    return response.data;
  } catch (error) {
    functions.logger.error(`Erro ao desativar usuário ${userId}:`, error);
    throw new functions.https.HttpsError('internal', `Erro ao desativar usuário: ${error.message}`);
  }
}

/**
 * Sincroniza alterações de setor para o Firestore
 * 
 * Atualiza automaticamente o nome do setor para todos os usuários daquele setor
 */
exports.syncSectorChangesToUsers = functions.firestore
  .document('sectors/{sectorId}')
  .onUpdate(async (change, context) => {
    const sectorId = context.params.sectorId;
    const newSectorData = change.after.data();
    const oldSectorData = change.before.data();
    
    // Se o nome do setor não foi alterado, não fazer nada
    if (newSectorData.nome === oldSectorData.nome) {
      return null;
    }
    
    console.log(`Nome do setor ${sectorId} alterado de "${oldSectorData.nome}" para "${newSectorData.nome}". Atualizando usuários...`);
    
    try {
      // Buscar todos os usuários deste setor
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('sector', '==', sectorId)
        .get();
      
      // Se não houver usuários deste setor, terminar
      if (usersSnapshot.empty) {
        console.log(`Nenhum usuário encontrado para o setor ${sectorId}`);
        return null;
      }
      
      // Array de promessas para atualização em lote
      const updatePromises = [];
      
      // Atualizar o nome do setor para cada usuário
      usersSnapshot.forEach(doc => {
        updatePromises.push(
          admin.firestore()
            .collection('users')
            .doc(doc.id)
            .update({
              sectorName: newSectorData.nome
            })
        );
      });
      
      // Executar todas as atualizações
      await Promise.all(updatePromises);
      
      console.log(`Nome do setor atualizado para ${usersSnapshot.size} usuário(s)`);
      return { updated: usersSnapshot.size };
    } catch (error) {
      console.error('Erro ao atualizar usuários do setor:', error);
      throw new functions.https.HttpsError('internal', `Erro ao atualizar usuários: ${error.message}`);
    }
  });

/**
 * Sincroniza setores criados ou atualizados na API para o Firestore
 * 
 * Esta função é acionada por uma requisição HTTP e pode ser chamada pela API quando
 * um setor é criado ou atualizado diretamente pela API MultiFlow
 */
exports.syncSectorFromAPI = functions.https.onRequest(async (req, res) => {
  // Verificar token de API para segurança
  const authToken = req.headers['x-api-token'];
  if (authToken !== API_TOKEN) {
    res.status(403).send({ error: 'Unauthorized' });
    return;
  }
  
  // Verificar método
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }
  
  try {
    // Verificar dados do setor
    const sectorData = req.body;
    if (!sectorData || !sectorData._id || !sectorData.nome) {
      res.status(400).send({ error: 'Invalid sector data' });
      return;
    }
    
    // Preparar dados para salvar no Firestore
    const firestoreSectorData = {
      _id: sectorData._id,
      nome: sectorData.nome,
      descricao: sectorData.descricao || '',
      responsavel: sectorData.responsavel || '',
      ativo: sectorData.ativo !== false, // true por padrão
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Se o setor já existir, atualizar, senão criar
    const sectorRef = admin.firestore().collection('sectors').doc(sectorData._id);
    await sectorRef.set(firestoreSectorData, { merge: true });
    
    console.log(`Setor ${sectorData._id} sincronizado com sucesso no Firestore`);
    res.status(200).send({ success: true, message: 'Sector synchronized successfully' });
  } catch (error) {
    console.error('Erro ao sincronizar setor da API:', error);
    res.status(500).send({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * Webhook para receber notificações de atribuição de conversa a um setor
 * 
 * Esta função é chamada pela API MultiFlow quando uma conversa é atribuída a um setor
 */
exports.conversationAssigned = functions.https.onRequest(async (req, res) => {
  // Verificar token de API para segurança
  const authToken = req.headers['x-api-token'];
  if (authToken !== API_TOKEN) {
    res.status(403).send({ error: 'Unauthorized' });
    return;
  }
  
  // Verificar método
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }
  
  try {
    // Dados da notificação
    const data = req.body;
    if (!data || !data.conversationId || !data.sectorId) {
      res.status(400).send({ error: 'Invalid data' });
      return;
    }
    
    // Registrar a atribuição
    console.log(`Conversa ${data.conversationId} atribuída ao setor ${data.sectorId}`);
    
    // Aqui você pode enviar notificações aos usuários deste setor
    // por meio de Firestore ou Firebase Cloud Messaging
    
    // Exemplo: criar uma notificação no Firestore
    await admin.firestore().collection('notifications').add({
      type: 'conversation_assigned',
      conversationId: data.conversationId,
      sectorId: data.sectorId,
      message: `Nova conversa atribuída ao setor ${data.sectorName || data.sectorId}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });
    
    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Erro ao processar notificação de conversa:', error);
    res.status(500).send({ error: 'Internal Server Error', message: error.message });
  }
});

// Exportar funções de migração
exports.migrateUsersToSectorized = migrateUsersToSectorized;
exports.runUserMigration = runUserMigration;