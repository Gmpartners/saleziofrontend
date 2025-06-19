export class Sector {
  constructor(data = {}) {
    if (data.userId && typeof data.userId !== 'string') {
      throw new Error('userId deve ser uma string');
    }
    
    this.id = data.id || data._id || `sector-${Date.now()}`;
    this.userId = data.userId || '';
    this.nome = data.nome || '';
    this.descricao = data.descricao || '';
    this.contexto = data.contexto || '';
    this.ativo = data.ativo !== false;
    this.position = data.position || { x: 0, y: 0 };
    this.palavrasChave = Array.isArray(data.palavrasChave) ? data.palavrasChave : [];
    this.perguntasTriagem = Array.isArray(data.perguntasTriagem) ? data.perguntasTriagem : [];
    this.lacunas = Array.isArray(data.lacunas) ? data.lacunas : [];
    this.objetivos = Array.isArray(data.objetivos) ? data.objetivos : [];
    this.transferencia = data.transferencia || { 
      metodo: 'visivel', 
      mensagem: 'Transferindo para atendimento especializado' 
    };
    this.empresaId = data.empresaId || '';
    this.createdAt = data.createdAt || data.created || new Date().toISOString();
    this.updatedAt = data.updatedAt || data.updated || new Date().toISOString();
    this.syncStatus = data.syncStatus || 'pending';
    this.syncError = data.syncError || null;
    this.lastSyncedAt = data.lastSyncedAt || null;
    this._cachedJSON = null;
    this._lastUpdated = null;
  }

  toJSON() {
    if (this._cachedJSON && this._lastUpdated === this.updatedAt) {
      return this._cachedJSON;
    }
    
    const result = {
      id: this.id,
      userId: this.userId,
      nome: this.nome,
      descricao: this.descricao,
      contexto: this.contexto,
      ativo: this.ativo,
      position: this.position,
      palavrasChave: this.palavrasChave,
      perguntasTriagem: this.perguntasTriagem,
      lacunas: this.lacunas,
      objetivos: this.objetivos,
      transferencia: this.transferencia,
      empresaId: this.empresaId,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      syncStatus: this.syncStatus,
      syncError: this.syncError,
      lastSyncedAt: this.lastSyncedAt
    };
    
    this._cachedJSON = result;
    this._lastUpdated = result.updatedAt;
    return result;
  }

  toApiFormat() {
    return {
      _id: this.id,
      userId: this.userId,
      nome: this.nome,
      descricao: this.descricao,
      contexto: this.contexto,
      ativo: this.ativo,
      palavrasChave: this.palavrasChave,
      perguntasTriagem: this.perguntasTriagem,
      lacunas: this.lacunas,
      objetivos: this.objetivos,
      transferencia: this.transferencia,
      empresaId: this.empresaId,
      position: this.position,
      created: this.createdAt,
      updated: new Date().toISOString()
    };
  }

  static fromApiResponse(response) {
    return new Sector({
      id: response._id,
      userId: response.userId,
      nome: response.nome,
      descricao: response.descricao,
      contexto: response.contexto,
      ativo: response.ativo,
      palavrasChave: response.palavrasChave || [],
      perguntasTriagem: response.perguntasTriagem || [],
      lacunas: response.lacunas || [],
      objetivos: response.objetivos || [],
      transferencia: response.transferencia || { metodo: 'visivel' },
      empresaId: response.empresaId || '',
      position: response.position || { x: 0, y: 0 },
      createdAt: response.created,
      updatedAt: response.updated,
      syncStatus: 'success',
      lastSyncedAt: new Date().toISOString()
    });
  }
}

export class IAConfig {
  constructor(data = {}) {
    this.userId = data.userId || '';
    this.nomeIA = data.nomeIA || 'Orquestrador IA';
    this.promptInicial = data.promptInicial || 'Olá! Em que posso ajudar você hoje?';
    this.mostrarSetores = data.mostrarSetores !== false;
    this.promptConfirmacao = data.promptConfirmacao || 'Vou transferir você para o setor especializado.';
    this.modoDeTransferencia = data.modoDeTransferencia || 'visivel';
    this.triagem = {
      usarDescricaoSetores: data.triagem?.usarDescricaoSetores !== false,
      confiancaMinima: data.triagem?.confiancaMinima || 0.7,
      personalidadeIA: data.triagem?.personalidadeIA || 'cordial',
      instrucoesDeTom: data.triagem?.instrucoesDeTom || ''
    };
    this.langchain = {
      modelo: data.langchain?.modelo || 'deepseek/deepseek-chat-v3-0324',
      temperatura: data.langchain?.temperatura || 0.2,
      usarMemoriaAvancada: data.langchain?.usarMemoriaAvancada !== false,
      permitirTransferenciaAutomatica: data.langchain?.permitirTransferenciaAutomatica !== false
    };
    this.metadados = data.metadados || {};
    this.createdAt = data.createdAt || data.created || new Date().toISOString();
    this.updatedAt = data.updatedAt || data.updated || new Date().toISOString();
    this._cachedJSON = null;
    this._lastUpdated = null;
  }

  toJSON() {
    if (this._cachedJSON && this._lastUpdated === this.updatedAt) {
      return this._cachedJSON;
    }
    
    const result = {
      userId: this.userId,
      nomeIA: this.nomeIA,
      promptInicial: this.promptInicial,
      mostrarSetores: this.mostrarSetores,
      promptConfirmacao: this.promptConfirmacao,
      modoDeTransferencia: this.modoDeTransferencia,
      triagem: this.triagem,
      langchain: this.langchain,
      metadados: this.metadados,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    this._cachedJSON = result;
    this._lastUpdated = result.updatedAt;
    return result;
  }

  toApiFormat() {
    return {
      userId: this.userId,
      nomeIA: this.nomeIA,
      promptInicial: this.promptInicial,
      mostrarSetores: this.mostrarSetores,
      promptConfirmacao: this.promptConfirmacao,
      modoDeTransferencia: this.modoDeTransferencia,
      triagem: this.triagem,
      langchain: this.langchain,
      metadados: this.metadados,
      created: this.createdAt,
      updated: new Date().toISOString()
    };
  }

  static fromApiResponse(response) {
    return new IAConfig({
      userId: response.userId,
      nomeIA: response.nomeIA,
      promptInicial: response.promptInicial,
      mostrarSetores: response.mostrarSetores,
      promptConfirmacao: response.promptConfirmacao,
      modoDeTransferencia: response.modoDeTransferencia,
      triagem: response.triagem,
      langchain: response.langchain,
      metadados: response.metadados,
      createdAt: response.created,
      updatedAt: response.updated
    });
  }
}

export class Knowledge {
  constructor(data = {}) {
    this.id = data.id || `knowledge-${Date.now()}`;
    this.sectorId = data.sectorId || '';
    this.title = data.title || 'Base de Conhecimento';
    this.instructions = data.instructions || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      sectorId: this.sectorId,
      title: this.title,
      instructions: this.instructions,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString()
    };
  }
}

export class FlowConfig {
  constructor(data = {}) {
    this.id = data.id || `flow-${Date.now()}`;
    this.userId = data.userId || '';
    this.name = data.name || 'Configuração de Fluxo Principal';
    this.description = data.description || 'Configuração automática de fluxo de setores';
    this.sectors = data.sectors || [];
    this.empresas = data.empresas || [];
    this.knowledgeNodes = data.knowledgeNodes || [];
    this.edges = data.edges || [];
    this.nodePositions = data.nodePositions || {};
    this.iaConfig = data.iaConfig || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      description: this.description,
      sectors: this.sectors,
      empresas: this.empresas,
      knowledgeNodes: this.knowledgeNodes,
      edges: this.edges,
      nodePositions: this.nodePositions,
      iaConfig: this.iaConfig,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString()
    };
  }
}

export class Empresa {
  constructor(data = {}) {
    this.id = data.id || data._id || `empresa-${Date.now()}`;
    this.userId = data.userId || '';
    this.nome = data.nome || '';
    this.descricao = data.descricao || '';
    this.contexto = data.contexto || '';
    this.horarioFuncionamento = data.horarioFuncionamento || 'Segunda a Sexta, 9h às 18h';
    this.ativo = data.ativo !== false;
    this.position = data.position || { x: 0, y: 0 };
    this.conteudosAutomaticos = Array.isArray(data.conteudosAutomaticos) ? data.conteudosAutomaticos : [];
    this.createdAt = data.createdAt || data.created || new Date().toISOString();
    this.updatedAt = data.updatedAt || data.updated || new Date().toISOString();
    this._cachedJSON = null;
    this._lastUpdated = null;
  }

  toJSON() {
    if (this._cachedJSON && this._lastUpdated === this.updatedAt) {
      return this._cachedJSON;
    }
    
    const result = {
      id: this.id,
      userId: this.userId,
      nome: this.nome,
      descricao: this.descricao,
      contexto: this.contexto,
      horarioFuncionamento: this.horarioFuncionamento,
      ativo: this.ativo,
      position: this.position,
      conteudosAutomaticos: this.conteudosAutomaticos,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    this._cachedJSON = result;
    this._lastUpdated = result.updatedAt;
    return result;
  }

  toApiFormat() {
    return {
      _id: this.id,
      userId: this.userId,
      nome: this.nome,
      descricao: this.descricao,
      contexto: this.contexto,
      horarioFuncionamento: this.horarioFuncionamento,
      ativo: this.ativo,
      position: this.position,
      conteudosAutomaticos: this.conteudosAutomaticos,
      created: this.createdAt,
      updated: new Date().toISOString()
    };
  }

  static fromApiResponse(response) {
    return new Empresa({
      id: response._id,
      userId: response.userId,
      nome: response.nome,
      descricao: response.descricao,
      contexto: response.contexto || '',
      horarioFuncionamento: response.horarioFuncionamento || 'Segunda a Sexta, 9h às 18h',
      ativo: response.ativo !== false,
      position: response.position || { x: 0, y: 0 },
      conteudosAutomaticos: response.conteudosAutomaticos || [],
      createdAt: response.created,
      updatedAt: response.updated
    });
  }
}

export class User {
  constructor(data = {}) {
    this.id = data.id || data.uid || `user-${Date.now()}`;
    this.uid = data.uid || this.id;
    this.displayName = data.displayName || data.name || '';
    this.name = data.name || data.displayName || '';
    this.email = data.email || '';
    this.phoneNumber = data.phoneNumber || '';
    this.role = data.role || 'agent';
    this.isActive = data.isActive !== false;
    this.permissions = Array.isArray(data.permissions) ? data.permissions : [];
    
    this.empresas = Array.isArray(data.empresas) ? data.empresas : [];
    this.empresa = data.empresa || (this.empresas.length > 0 ? this.empresas[0] : null);
    
    this.setores = Array.isArray(data.setores) ? data.setores : [];
    this.setor = data.setor || (this.setores.length > 0 ? this.setores[0] : null);
    
    this.created = data.created || data.createdAt || new Date().toISOString();
    this.lastUpdate = data.lastUpdate || data.updatedAt || new Date().toISOString();
    this._cachedJSON = null;
    this._lastUpdated = null;
  }

  toJSON() {
    if (this._cachedJSON && this._lastUpdated === this.lastUpdate) {
      return this._cachedJSON;
    }
    
    const result = {
      id: this.id,
      uid: this.uid,
      displayName: this.displayName,
      name: this.name,
      email: this.email,
      phoneNumber: this.phoneNumber,
      role: this.role,
      isActive: this.isActive,
      permissions: this.permissions,
      empresas: this.empresas,
      empresa: this.empresa,
      setores: this.setores,
      setor: this.setor,
      created: this.created,
      lastUpdate: new Date().toISOString()
    };
    
    this._cachedJSON = result;
    this._lastUpdated = result.lastUpdate;
    return result;
  }

  toFirebaseFormat() {
    return {
      displayName: this.displayName,
      name: this.name,
      email: this.email,
      phoneNumber: this.phoneNumber,
      role: this.role,
      isActive: this.isActive,
      permissions: this.permissions,
      empresas: this.empresas,
      empresa: this.empresa,
      setores: this.setores,
      setor: this.setor,
      created: this.created,
      lastUpdate: new Date().toISOString()
    };
  }

  static fromFirebaseDoc(doc) {
    const data = doc.data();
    return new User({
      id: doc.id,
      uid: doc.id,
      ...data
    });
  }

  hasPermission(permission) {
    if (this.role === 'admin') return true;
    return this.permissions.includes(permission);
  }

  canAccessSector(sectorId) {
    if (this.role === 'admin') return true;
    
    if (this.setores && this.setores.length > 0) {
      return this.setores.some(setor => 
        setor.id === sectorId || setor.setorId === sectorId
      );
    }
    
    if (this.setor) {
      return this.setor.id === sectorId || this.setor.setorId === sectorId;
    }
    
    return false;
  }

  canAccessCompany(companyId) {
    if (this.role === 'admin') return true;
    
    if (this.empresas && this.empresas.length > 0) {
      return this.empresas.some(empresa => 
        empresa.id === companyId || empresa.empresaId === companyId
      );
    }
    
    if (this.empresa) {
      return this.empresa.id === companyId || this.empresa.empresaId === companyId;
    }
    
    return false;
  }

  getAccessibleSectors() {
    if (this.role === 'admin') return [];
    
    if (this.setores && this.setores.length > 0) {
      return this.setores;
    }
    
    if (this.setor) {
      return [this.setor];
    }
    
    return [];
  }

  getAccessibleCompanies() {
    if (this.role === 'admin') return [];
    
    if (this.empresas && this.empresas.length > 0) {
      return this.empresas;
    }
    
    if (this.empresa) {
      return [this.empresa];
    }
    
    return [];
  }
}