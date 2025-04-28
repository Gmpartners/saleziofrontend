/**
 * Firebase Functions para o Salezio MultiAtendimento
 * Implementação de funções para sincronização de setores entre Firebase e API/MongoDB
 */

const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");

// Inicializar o app do Firebase Admin
admin.initializeApp();

// Referência ao Firestore
const db = admin.firestore();

// Configuração da API
const API_URL = process.env.API_URL || "https://multi.compracomsegurancaeconfianca.com/api";
const API_TOKEN = process.env.API_TOKEN || "netwydZWjrJpA";

/**
 * Cria um novo setor para um usuário específico
 * Versão genérica que substitui criarSetorFinanceiro
 */
exports.criarSetor = onCall({
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: "256MiB",
}, async (request) => {
  try {
    // Validação de dados e permissões
    const { userId, nome, descricao } = request.data;
    
    if (!userId || !nome) {
      throw new Error("userId e nome são obrigatórios");
    }
    
    // Verificar se o usuário tem permissão de admin
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error("Usuário não encontrado");
    }
    
    const userData = userDoc.data();
    if (userData.role !== "admin" && request.auth.uid !== userId) {
      throw new Error("Permissão negada: apenas administradores podem criar setores");
    }
    
    logger.info(`Criando setor ${nome} para o usuário: ${userId}`);
    
    // 1. Criar ou atualizar o setor
    const setorId = `${nome.toLowerCase()}-${Date.now()}`.replace(/\s+/g, '-');
    await db.collection("setor").doc(setorId).set({
      _id: setorId,
      userId: userId,
      nome: nome,
      descricao: descricao || `Setor ${nome}`,
      responsavel: userData.displayName || "Administrador",
      ativo: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // 2. Sincronização com API via webhook
    try {
      await sincronizarSetorComAPI(setorId);
    } catch (syncError) {
      logger.error(`Erro ao sincronizar setor com API: ${syncError.message}`);
      // Continua mesmo se a sincronização falhar
    }
    
    logger.info(`Setor ${nome} criado com sucesso para o usuário: ${userId}`);
    
    return {
      success: true,
      setorId: setorId
    };
  } catch (error) {
    logger.error("Erro ao criar setor:", error);
    throw new Error(`Falha ao criar setor: ${error.message}`);
  }
});

/**
 * Função auxiliar para sincronizar um setor com API/MongoDB
 */
async function sincronizarSetorComAPI(setorId) {
  try {
    // Buscar dados completos do setor
    const setorDoc = await db.collection("setor").doc(setorId).get();
    
    if (!setorDoc.exists) {
      throw new Error(`Setor ${setorId} não encontrado`);
    }
    
    const setorData = setorDoc.data();
    
    // Log detalhado para diagnóstico
    logger.info(`Sincronizando setor ${setorId} com API`, {
      nome: setorData.nome,
      responsavel: setorData.responsavel,
      ativo: setorData.ativo
    });
    
    // Preparar dados para envio à API
    const setorPayload = {
      _id: setorData._id,
      nome: setorData.nome,
      descricao: setorData.descricao,
      responsavel: setorData.responsavel,
      ativo: setorData.ativo,
      firebaseId: setorId,
      userId: setorData.userId,
      lastSyncedAt: new Date().toISOString(),
      syncVersion: Date.now()
    };
    
    // Log de headers para diagnóstico
    logger.info(`Enviando para API usando token: ${API_TOKEN.substring(0, 5)}...`);
    
    // Enviar para API
    try {
      const response = await axios.post(
        `${API_URL}/sync/sector`,
        setorPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_TOKEN
          },
          timeout: 10000 // Aumentar timeout para 10 segundos
        }
      );
      
      // Registrar resultado da sincronização
      await db.collection("setor").doc(setorId).update({
        mongoId: response.data.mongoId || null,
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        syncStatus: "success"
      });
      
      logger.info(`Setor ${setorId} sincronizado com API com sucesso`);
      return response.data;
    } catch (apiError) {
      // Log detalhado do erro de API
      if (apiError.response) {
        logger.error(`Erro da API ao sincronizar setor (${apiError.response.status}):`, apiError.response.data);
        
        // Verificar se é erro de autenticação
        if (apiError.response.status === 401 || apiError.response.status === 403) {
          logger.error(`Erro de autenticação. Verifique o token API_TOKEN: ${API_TOKEN.substring(0, 5)}...`);
          
          // Atualizar status com erro específico de autenticação
          await db.collection("setor").doc(setorId).update({
            syncStatus: "error",
            syncError: `Erro de autenticação (${apiError.response.status}): ${apiError.response.data?.message || 'Token inválido ou expirado'}`,
            lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          throw new Error(`Erro de autenticação: ${apiError.response.status}`);
        }
        
        // Para outros erros
        await db.collection("setor").doc(setorId).update({
          syncStatus: "error",
          syncError: `Erro API (${apiError.response.status}): ${apiError.response.data?.message || apiError.message}`,
          lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Erro de conexão
        logger.error(`Erro de conexão ao sincronizar setor: ${apiError.message}`);
        
        await db.collection("setor").doc(setorId).update({
          syncStatus: "error",
          syncError: `Erro de conexão: ${apiError.message}`,
          lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      throw apiError;
    }
  } catch (error) {
    logger.error(`Erro ao sincronizar setor ${setorId} com API: ${error.message}`);
    
    // Registrar falha de sincronização
    await db.collection("setor").doc(setorId).update({
      syncStatus: "error",
      syncError: error.message,
      lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    throw error;
  }
}

/**
 * Sincroniza alterações de usuários do Firestore para API/MongoDB
 * Nome alterado para evitar conflito com função existente
 */
exports.onUserUpdated = onDocumentUpdated("users/{userId}", async (event) => {
  try {
    const userId = event.params.userId;
    const userData = event.data.after.data();
    const beforeData = event.data.before.data();
    
    // Verificar se houve alteração em campos relevantes
    if (
      userData.sector === beforeData.sector &&
      userData.sectorName === beforeData.sectorName &&
      userData.role === beforeData.role &&
      userData.isActive === beforeData.isActive
    ) {
      logger.info(`Nenhuma alteração relevante para sincronização do usuário ${userId}`);
      return null;
    }
    
    logger.info(`Sincronizando usuário ${userId} com API`);
    
    // Preparar dados para envio à API
    const userPayload = {
      firebaseUid: userId,
      email: userData.email,
      displayName: userData.displayName || "",
      role: userData.role === 'admin' ? 'admin' : 'attendant', // Ajuste para seu modelo de dados
      sector: userData.sector || "",
      sectorName: userData.sectorName || "",
      isActive: userData.isActive !== false,
      lastSyncedAt: new Date().toISOString(),
      syncVersion: Date.now()
    };
    
    // Enviar para API
    try {
      const response = await axios.post(
        `${API_URL}/sync/user`,
        userPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_TOKEN
          }
        }
      );
      
      // Registrar resultado da sincronização
      await db.collection("users").doc(userId).update({
        mongoId: response.data.mongoId || null,
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        syncStatus: "success"
      });
      
      logger.info(`Usuário ${userId} sincronizado com API com sucesso`);
    } catch (apiError) {
      // Log detalhado do erro de API
      if (apiError.response) {
        logger.error(`Erro da API ao sincronizar usuário (${apiError.response.status}):`, apiError.response.data);
        
        // Verificar se é erro de autenticação
        if (apiError.response.status === 401 || apiError.response.status === 403) {
          logger.error(`Erro de autenticação. Verifique o token API_TOKEN: ${API_TOKEN.substring(0, 5)}...`);
        }
        
        // Atualizar status com erro específico
        await db.collection("users").doc(userId).update({
          syncStatus: "error",
          syncError: `Erro API (${apiError.response.status}): ${apiError.response.data?.message || apiError.message}`,
          lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Erro de conexão
        logger.error(`Erro de conexão ao sincronizar usuário: ${apiError.message}`);
        
        await db.collection("users").doc(userId).update({
          syncStatus: "error",
          syncError: `Erro de conexão: ${apiError.message}`,
          lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`Erro ao sincronizar usuário com API: ${error.message}`);
    
    try {
      // Registrar falha de sincronização
      await db.collection("users").doc(event.params.userId).update({
        syncStatus: "error",
        syncError: error.message,
        lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (updateError) {
      logger.error(`Erro ao atualizar status de sincronização: ${updateError.message}`);
    }
    
    return null;
  }
});

/**
 * Sincroniza alterações de setores do Firestore para API/MongoDB
 * Nome alterado para evitar conflito com função existente
 */
exports.onSectorUpdated = onDocumentUpdated("setor/{sectorId}", async (event) => {
  try {
    const sectorId = event.params.sectorId;
    const sectorData = event.data.after.data();
    const beforeData = event.data.before.data();
    
    // Verificar se houve alteração em campos relevantes
    if (
      sectorData.nome === beforeData.nome &&
      sectorData.descricao === beforeData.descricao &&
      sectorData.responsavel === beforeData.responsavel &&
      sectorData.ativo === beforeData.ativo
    ) {
      logger.info(`Nenhuma alteração relevante para sincronização do setor ${sectorId}`);
      return null;
    }
    
    // Sincronizar com API
    try {
      await sincronizarSetorComAPI(sectorId);
      
      // Atualizar todos os usuários que pertencem a este setor (quando o nome mudar)
      if (sectorData.nome !== beforeData.nome) {
        await syncSectorChangesToUsers(sectorId, sectorData.nome);
      }
    } catch (error) {
      logger.error(`Erro ao sincronizar setor ${sectorId}: ${error.message}`);
      // Não propagar erro para não bloquear o fluxo
    }
    
    return null;
  } catch (error) {
    logger.error(`Erro ao processar atualização do setor ${event.params.sectorId}: ${error.message}`);
    return null;
  }
});

/**
 * Atualiza o nome do setor para todos os usuários quando o setor é atualizado
 */
async function syncSectorChangesToUsers(sectorId, newSectorName) {
  try {
    // Buscar todos os usuários que pertencem a este setor
    const usersSnapshot = await db.collection("users")
      .where("sector", "==", sectorId)
      .get();
    
    if (usersSnapshot.empty) {
      logger.info(`Nenhum usuário encontrado para o setor ${sectorId}`);
      return;
    }
    
    // Batch para atualizar todos os usuários
    const batch = db.batch();
    
    usersSnapshot.forEach(doc => {
      const userRef = db.collection("users").doc(doc.id);
      batch.update(userRef, { 
        sectorName: newSectorName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    logger.info(`Nome do setor atualizado para ${usersSnapshot.size} usuário(s)`);
  } catch (error) {
    logger.error(`Erro ao atualizar usuários do setor ${sectorId}: ${error.message}`);
    throw error;
  }
}

/**
 * Recebe atualizações de setores da API/MongoDB
 */
exports.syncSectorFromAPI = onRequest({
  timeoutSeconds: 60,
  memory: "256MiB",
  cors: true
}, async (request, response) => {
  try {
    // Verificar método HTTP
    if (request.method !== 'POST') {
      response.status(405).send('Método não permitido');
      return;
    }
    
    // Verificar autenticação
    const apiKey = request.headers['x-api-key'];
    if (apiKey !== API_TOKEN) {
      logger.error(`Tentativa de acesso com token inválido: ${apiKey}`);
      response.status(401).send('Não autorizado');
      return;
    }
    
    // Obter dados do setor
    const sectorData = request.body;
    
    if (!sectorData || !sectorData.firebaseId || !sectorData.nome) {
      response.status(400).send('Dados inválidos');
      return;
    }
    
    logger.info(`Recebendo atualização do setor ${sectorData.firebaseId} da API`);
    
    // Buscar setor atual para comparar timestamps
    const sectorRef = db.collection("setor").doc(sectorData.firebaseId);
    const sectorDoc = await sectorRef.get();
    
    // Se o setor existir, verificar conflitos de versão
    if (sectorDoc.exists) {
      const currentData = sectorDoc.data();
      
      // Verificar se a versão da API é mais recente
      const lastSyncedAt = currentData.lastSyncedAt ? currentData.lastSyncedAt.toDate().getTime() : 0;
      const incomingTimestamp = new Date(sectorData.lastSyncedAt).getTime();
      
      if (incomingTimestamp <= lastSyncedAt) {
        logger.info(`Ignorando atualização do setor ${sectorData.firebaseId} - versão local mais recente`);
        response.status(200).json({
          success: true,
          action: "ignored",
          message: "Versão local mais recente"
        });
        return;
      }
    }
    
    // Atualizar ou criar o setor no Firestore
    await sectorRef.set({
      _id: sectorData.firebaseId,
      nome: sectorData.nome,
      descricao: sectorData.descricao || "",
      responsavel: sectorData.responsavel || "Administrador",
      ativo: sectorData.ativo !== false,
      mongoId: sectorData.mongoId || sectorData._id,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncStatus: "success",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Se o nome do setor foi alterado, atualizar os usuários
    if (sectorDoc.exists && sectorDoc.data().nome !== sectorData.nome) {
      await syncSectorChangesToUsers(sectorData.firebaseId, sectorData.nome);
    }
    
    logger.info(`Setor ${sectorData.firebaseId} atualizado com sucesso da API`);
    
    response.status(200).json({
      success: true,
      action: sectorDoc.exists ? "updated" : "created"
    });
  } catch (error) {
    logger.error(`Erro ao processar atualização do setor da API: ${error.message}`);
    response.status(500).send(`Erro no processamento: ${error.message}`);
  }
});

/**
 * Recebe atualizações de usuários da API/MongoDB
 */
exports.syncUserFromAPI = onRequest({
  timeoutSeconds: 60,
  memory: "256MiB",
  cors: true
}, async (request, response) => {
  try {
    // Verificar método HTTP
    if (request.method !== 'POST') {
      response.status(405).send('Método não permitido');
      return;
    }
    
    // Verificar autenticação
    const apiKey = request.headers['x-api-key'];
    if (apiKey !== API_TOKEN) {
      logger.error(`Tentativa de acesso com token inválido: ${apiKey}`);
      response.status(401).send('Não autorizado');
      return;
    }
    
    // Obter dados do usuário
    const userData = request.body;
    
    if (!userData || !userData.firebaseUid) {
      response.status(400).send('Dados inválidos');
      return;
    }
    
    logger.info(`Recebendo atualização do usuário ${userData.firebaseUid} da API`);
    
    // Buscar usuário atual para comparar timestamps
    const userRef = db.collection("users").doc(userData.firebaseUid);
    const userDoc = await userRef.get();
    
    // Se o usuário existir, verificar conflitos de versão
    if (userDoc.exists) {
      const currentData = userDoc.data();
      
      // Verificar se a versão da API é mais recente
      const lastSyncedAt = currentData.lastSyncedAt ? currentData.lastSyncedAt.toDate().getTime() : 0;
      const incomingTimestamp = new Date(userData.lastSyncedAt).getTime();
      
      if (incomingTimestamp <= lastSyncedAt) {
        logger.info(`Ignorando atualização do usuário ${userData.firebaseUid} - versão local mais recente`);
        response.status(200).json({
          success: true,
          action: "ignored",
          message: "Versão local mais recente"
        });
        return;
      }
    }
    
    // Preparar dados para atualização
    const updateData = {
      displayName: userData.displayName,
      role: userData.role === 'attendant' ? 'agent' : userData.role, // Ajuste para seu modelo de dados
      sector: userData.sector,
      sectorName: userData.sectorName,
      isActive: userData.isActive !== false,
      mongoId: userData.mongoId || userData._id,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncStatus: "success",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Atualizar usuário no Firestore
    await userRef.set(updateData, { merge: true });
    
    logger.info(`Usuário ${userData.firebaseUid} atualizado com sucesso da API`);
    
    response.status(200).json({
      success: true,
      action: userDoc.exists ? "updated" : "created"
    });
  } catch (error) {
    logger.error(`Erro ao processar atualização do usuário da API: ${error.message}`);
    response.status(500).send(`Erro no processamento: ${error.message}`);
  }
});

/**
 * Migra todos os usuários para o novo formato com suporte a setorização
 */
exports.migrateAllUsers = onCall({
  maxInstances: 1,
  timeoutSeconds: 300, // 5 minutos
  memory: "512MiB",
}, async (request) => {
  try {
    // Verificar se é admin
    const auth = request.auth;
    if (!auth) {
      throw new Error("Não autenticado");
    }
    
    const userRef = db.collection("users").doc(auth.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      throw new Error("Permissão negada: apenas administradores podem executar a migração");
    }
    
    logger.info("Iniciando migração de todos os usuários para o novo formato");
    
    // Buscar todos os usuários
    const usersSnapshot = await db.collection("users").get();
    
    if (usersSnapshot.empty) {
      return { success: true, migrated: 0, message: "Nenhum usuário para migrar" };
    }
    
    const batch = db.batch();
    let migratedCount = 0;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userRef = db.collection("users").doc(doc.id);
      
      // Dados a serem atualizados/adicionados
      const updateData = {
        // Garantir campo role (convertendo 'agent' para 'attendant' se necessário)
        role: userData.role === 'agent' ? 'agent' : (userData.role || 'agent'),
        
        // Garantir campos de setorização
        sector: userData.sector || "",
        sectorName: userData.sectorName || "",
        
        // Garantir campo isActive
        isActive: userData.isActive !== false,
        
        // Adicionar campos de controle de sync
        syncStatus: "pending",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.update(userRef, updateData);
      migratedCount++;
    });
    
    // Commit do batch
    await batch.commit();
    
    logger.info(`Migração concluída: ${migratedCount} usuário(s) atualizado(s)`);
    
    return {
      success: true,
      migrated: migratedCount,
      message: `${migratedCount} usuário(s) migrado(s) com sucesso`
    };
  } catch (error) {
    logger.error("Erro na migração de usuários:", error);
    throw new Error(`Falha na migração: ${error.message}`);
  }
});

/**
 * Webhook para integração com sistemas externos
 * Versão genérica que substitui webhookPagamentos
 */
exports.webhookConversa = onRequest({
  timeoutSeconds: 60,
  memory: "256MiB",
  cors: true
}, async (request, response) => {
  try {
    // Verificar método HTTP
    if (request.method !== 'POST') {
      response.status(405).send('Método não permitido');
      return;
    }
    
    // Obter dados da requisição
    const webhookData = request.body;
    
    if (!webhookData || !webhookData.userId || !webhookData.setor) {
      response.status(400).send('Dados inválidos - userId e setor são obrigatórios');
      return;
    }
    
    logger.info(`Webhook recebido para o setor ${webhookData.setor}:`, webhookData);
    
    // Buscar o setor do usuário
    const setoresRef = db.collection("setor")
      .where("userId", "==", webhookData.userId)
      .where("nome", "==", webhookData.setor);
    
    const setoresSnapshot = await setoresRef.get();
    
    let setorId;
    if (setoresSnapshot.empty) {
      // Criar setor se não existir
      setorId = `${webhookData.setor.toLowerCase()}-${Date.now()}`.replace(/\s+/g, '-');
      await db.collection("setor").doc(setorId).set({
        _id: setorId,
        userId: webhookData.userId,
        nome: webhookData.setor,
        descricao: `Setor ${webhookData.setor}`,
        responsavel: "Administrador",
        ativo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Sincronizar com API
      try {
        await sincronizarSetorComAPI(setorId);
      } catch (syncError) {
        logger.error(`Erro ao sincronizar novo setor: ${syncError.message}`);
        // Continua mesmo com erro
      }
    } else {
      setorId = setoresSnapshot.docs[0].id;
    }
    
    // Criar uma nova conversa no setor
    const conversaId = `conversa-${webhookData.setor.toLowerCase()}-${Date.now()}`;
    await db.collection("conversas").doc(conversaId).set({
      _id: conversaId,
      userId: webhookData.userId,
      setor: webhookData.setor,
      setorId: setorId,
      cliente: {
        nome: webhookData.clienteNome || "Cliente",
        telefone: webhookData.clienteTelefone || "Sem telefone"
      },
      status: "aguardando",
      ultimaMensagem: webhookData.mensagem || `Nova conversa no setor ${webhookData.setor}`,
      ultimaAtividade: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadados: webhookData.metadados || {}
    });
    
    // Adicionar mensagem à conversa
    await db.collection("conversas").doc(conversaId).collection("mensagens").add({
      conversaId: conversaId,
      remetente: webhookData.remetente || "sistema",
      conteudo: webhookData.mensagem || `Nova conversa no setor ${webhookData.setor}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      lida: false
    });
    
    logger.info(`Conversa ${conversaId} criada com sucesso para o setor ${webhookData.setor}`);
    
    // Retornar sucesso
    response.status(200).json({
      success: true,
      conversaId: conversaId,
      setorId: setorId
    });
  } catch (error) {
    logger.error("Erro no processamento do webhook:", error);
    response.status(500).send(`Erro no processamento: ${error.message}`);
  }
});

/**
 * Monitorar criação de novas conversas em qualquer setor
 * Nome alterado para evitar conflito com a função HTTPS existente
 */
exports.monitorNovasConversasTrigger = onDocumentCreated("conversas/{conversaId}", async (event) => {
  try {
    // Obter dados da conversa
    const conversaData = event.data.data();
    
    if (!conversaData || !conversaData.setor) {
      logger.warn(`Conversa ${event.params.conversaId} sem setor definido`);
      return null;
    }
    
    logger.info(`Nova conversa no setor ${conversaData.setor}: ${event.params.conversaId}`);
    
    // Atualizar metadados para rastreamento
    await db.collection("conversas").doc(event.params.conversaId).update({
      "metadados.monitorado": true,
      "metadados.monitoradoEm": admin.firestore.FieldValue.serverTimestamp()
    });
    
    return null;
  } catch (error) {
    logger.error(`Erro ao monitorar nova conversa: ${error.message}`);
    return null;
  }
});

/**
 * Força a sincronização de um setor específico
 * Útil para corrigir problemas de sincronização
 */
exports.forceSectorSync = onCall({
  maxInstances: 5,
  timeoutSeconds: 60,
  memory: "256MiB",
}, async (request) => {
  try {
    // Obter dados da solicitação
    const { sectorId } = request.data;
    
    if (!sectorId) {
      throw new Error("ID do setor é obrigatório");
    }
    
    // Verificar permissão (apenas admin)
    const auth = request.auth;
    if (!auth) {
      throw new Error("Não autenticado");
    }
    
    const userRef = db.collection("users").doc(auth.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      throw new Error("Permissão negada: apenas administradores podem forçar sincronização");
    }
    
    // Verificar se o setor existe
    const sectorRef = db.collection("setor").doc(sectorId);
    const sectorDoc = await sectorRef.get();
    
    if (!sectorDoc.exists) {
      throw new Error(`Setor ${sectorId} não encontrado`);
    }
    
    logger.info(`Forçando sincronização do setor ${sectorId}`);
    
    // Executar sincronização
    const result = await sincronizarSetorComAPI(sectorId);
    
    return {
      success: true,
      message: `Setor ${sectorId} sincronizado com sucesso`,
      details: result
    };
  } catch (error) {
    logger.error("Erro ao forçar sincronização de setor:", error);
    throw new Error(`Falha na sincronização: ${error.message}`);
  }
});