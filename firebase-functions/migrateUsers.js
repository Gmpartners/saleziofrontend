/**
 * Script de migração para atualizar a estrutura dos documentos de usuário existentes
 * 
 * Este script deve ser executado uma vez para adicionar os campos de setorização
 * aos documentos de usuário existentes.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Verificar se o app já foi inicializado
try {
  admin.app();
} catch (e) {
  admin.initializeApp();
}

/**
 * Função HTTP que realiza a migração dos documentos de usuário
 * 
 * Para executar, faça uma requisição POST para a URL da função.
 * Importante: Esta função deve ter acesso controlado por estar disponível via HTTP.
 */
exports.migrateUsersToSectorized = functions.https.onRequest(async (req, res) => {
  // Verificação simples de segurança - ajuste conforme necessário
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${functions.config().admin?.token}`) {
    console.error('Tentativa de acesso não autorizado à função de migração');
    res.status(403).send({ error: 'Unauthorized' });
    return;
  }
  
  // Aceitar apenas requisições POST
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }
  
  try {
    console.log('Iniciando migração de usuários para formato setorizado...');
    
    // Obter todos os documentos da coleção users
    const usersSnapshot = await admin.firestore().collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('Nenhum usuário encontrado para migração.');
      res.status(200).send({ success: true, message: 'Nenhum usuário encontrado para migração', count: 0 });
      return;
    }
    
    console.log(`Encontrados ${usersSnapshot.size} usuários para migração.`);
    
    // Criar batch para atualizações em lote
    const batch = admin.firestore().batch();
    let migrationCount = 0;
    
    // Processar cada documento
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const updates = {};
      
      // Verificar se o campo displayName existe ou precisa ser criado a partir de name
      if (!userData.displayName && userData.name) {
        updates.displayName = userData.name;
      }
      
      // Adicionar campos de setorização se não existirem
      if (userData.role === undefined) {
        updates.role = 'agent'; // Por padrão, usuários são agentes
      }
      
      if (userData.sector === undefined) {
        updates.sector = '';
      }
      
      if (userData.sectorName === undefined) {
        updates.sectorName = '';
      }
      
      if (userData.isActive === undefined) {
        updates.isActive = true;
      }
      
      // Adicionar timestamp de atualização
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      
      // Só adicionar ao batch se houver atualizações a fazer
      if (Object.keys(updates).length > 0) {
        batch.update(doc.ref, updates);
        migrationCount++;
      }
    });
    
    // Executar batch se houver atualizações
    if (migrationCount > 0) {
      await batch.commit();
      console.log(`Migração concluída: ${migrationCount} usuários atualizados.`);
    } else {
      console.log('Nenhuma atualização necessária: todos os usuários já estão no formato correto.');
    }
    
    // Retornar sucesso
    res.status(200).send({ 
      success: true, 
      message: `Migração concluída: ${migrationCount} usuários atualizados.`,
      count: migrationCount
    });
  } catch (error) {
    console.error('Erro durante a migração:', error);
    res.status(500).send({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
});

/**
 * Versão acionada manualmente (via console do Firebase)
 * 
 * Esta função pode ser acionada manualmente no console do Firebase,
 * útil para ambientes de teste ou quando não é possível usar a versão HTTP.
 */
exports.runUserMigration = functions.pubsub.schedule('0 0 31 2 *').onRun(async (context) => {
  // Essa programação nunca ocorre (29 de fevereiro), serve apenas para termos uma função acionável manualmente
  try {
    console.log('Iniciando migração de usuários para formato setorizado...');
    
    // Obter todos os documentos da coleção users
    const usersSnapshot = await admin.firestore().collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('Nenhum usuário encontrado para migração.');
      return null;
    }
    
    console.log(`Encontrados ${usersSnapshot.size} usuários para migração.`);
    
    // Criar batch para atualizações em lote
    const batch = admin.firestore().batch();
    let migrationCount = 0;
    
    // Processar cada documento
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const updates = {};
      
      // Verificar se o campo displayName existe ou precisa ser criado a partir de name
      if (!userData.displayName && userData.name) {
        updates.displayName = userData.name;
      }
      
      // Adicionar campos de setorização se não existirem
      if (userData.role === undefined) {
        updates.role = 'agent'; // Por padrão, usuários são agentes
      }
      
      if (userData.sector === undefined) {
        updates.sector = '';
      }
      
      if (userData.sectorName === undefined) {
        updates.sectorName = '';
      }
      
      if (userData.isActive === undefined) {
        updates.isActive = true;
      }
      
      // Adicionar timestamp de atualização
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      
      // Só adicionar ao batch se houver atualizações a fazer
      if (Object.keys(updates).length > 0) {
        batch.update(doc.ref, updates);
        migrationCount++;
      }
    });
    
    // Executar batch se houver atualizações
    if (migrationCount > 0) {
      await batch.commit();
      console.log(`Migração concluída: ${migrationCount} usuários atualizados.`);
    } else {
      console.log('Nenhuma atualização necessária: todos os usuários já estão no formato correto.');
    }
    
    return { success: true, migratedUsers: migrationCount };
  } catch (error) {
    console.error('Erro durante a migração:', error);
    return { error: error.message };
  }
});