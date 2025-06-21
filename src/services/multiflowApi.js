import axios from 'axios';

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
    this.recentlyUsed = [];
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    this.updateUsage(key);
    return this.cache.get(key);
  }

  set(key, value) {
    if (this.cache.size >= this.capacity && !this.cache.has(key)) {
      const leastUsedKey = this.recentlyUsed.shift();
      this.cache.delete(leastUsedKey);
    }
    this.cache.set(key, value);
    this.updateUsage(key);
    return true;
  }

  delete(key) {
    if (!this.cache.has(key)) return false;
    this.cache.delete(key);
    const index = this.recentlyUsed.indexOf(key);
    if (index > -1) {
      this.recentlyUsed.splice(index, 1);
    }
    return true;
  }

  has(key) {
    return this.cache.has(key);
  }

  updateUsage(key) {
    const index = this.recentlyUsed.indexOf(key);
    if (index > -1) {
      this.recentlyUsed.splice(index, 1);
    }
    this.recentlyUsed.push(key);
  }

  clear() {
    this.cache.clear();
    this.recentlyUsed = [];
  }

  getSize() {
    return this.cache.size;
  }
}

class MultiflowApiService {
  constructor() {
    this.API_URL = import.meta.env.VITE_API_URL || 'https://multi.compracomsegurancaeconfianca.com/api';
    this.API_TOKEN = import.meta.env.VITE_API_TOKEN || 'netwydZWjrJpA';
    this.AUTH_HEADER = 'x-api-token';
    this.ADMIN_ID = 'wFU4uEWg3vhC8lWVSJKc7dg8se72';
    
    const storedToken = localStorage.getItem('apiToken');
    if (!storedToken || storedToken === 'undefined' || storedToken === 'null') {
      localStorage.setItem('apiToken', this.API_TOKEN);
    } else {
      this.API_TOKEN = storedToken;
    }
    
    this.api = axios.create({
      baseURL: this.API_URL,
      headers: {
        'Content-Type': 'application/json',
        [this.AUTH_HEADER]: this.API_TOKEN
      },
      timeout: 30000
    });
    
    this.setupInterceptors();
    this.initializeCache();
    this.refreshToken();
    
    this.conversationIdMap = new Map();
    this.reverseConversationIdMap = new Map();
  }

  setupInterceptors() {
    this.api.interceptors.request.use(
      config => {
        const currentToken = localStorage.getItem('apiToken') || this.API_TOKEN;
        
        if (!currentToken || currentToken === 'undefined' || currentToken === 'null') {
          localStorage.setItem('apiToken', this.API_TOKEN);
          config.headers[this.AUTH_HEADER] = this.API_TOKEN;
        } else {
          config.headers[this.AUTH_HEADER] = currentToken;
        }
        
        return config;
      },
      error => {
        console.error('Erro no interceptor de requisição:', error);
        return Promise.reject(error);
      }
    );
    
    this.api.interceptors.response.use(
      response => response.data,
      error => {
        console.error('Erro na resposta da API:', error.response?.data || error.message);
        
        if (error.response && error.response.status === 401) {
          console.log('Token inválido ou expirado, atualizando...');
          localStorage.setItem('apiToken', this.API_TOKEN);
          this.refreshToken();
        }
        
        return Promise.reject(error.response?.data?.message || error.message);
      }
    );
  }

  refreshToken() {
    const apiToken = import.meta.env.VITE_API_TOKEN || 'netwydZWjrJpA';
    this.API_TOKEN = apiToken;
    localStorage.setItem('apiToken', apiToken);
    
    this.api.defaults.headers[this.AUTH_HEADER] = apiToken;
    console.log('Token API atualizado');
  }

  updateToken(token) {
    if (!token || token === 'undefined' || token === 'null') {
      token = this.API_TOKEN;
    }
    
    this.API_TOKEN = token;
    localStorage.setItem('apiToken', token);
    this.api.defaults.headers[this.AUTH_HEADER] = token;
    return this;
  }

  initializeCache() {
    this.cache = {
      empresas: { data: null, timestamp: 0 },
      setores: { data: null, timestamp: 0 },
      conversas: { data: [], timestamp: 0 },
      conversasFinalizadas: { data: [], timestamp: 0 },
      configIA: { data: null, timestamp: 0 },
      flowConfig: { data: null, timestamp: 0 },
      users: { data: null, timestamp: 0 }
    };
    
    this.conversationDetailsCache = new LRUCache(50);
    this.setorDetailsCache = new LRUCache(20);
    this.empresaDetailsCache = new LRUCache(20);
    this.userDetailsCache = new LRUCache(100);
    
    this.cacheDuration = {
      short: 30 * 1000,
      medium: 3 * 60 * 1000,
      long: 15 * 60 * 1000
    };
    
    this.pendingRequests = new Map();
    this.processingOperations = new Set();
  }
  
  async get(url, config = {}) {
    try {
      return await this.api.get(url, config);
    } catch (error) {
      console.error(`Erro na requisição GET para ${url}:`, error);
      throw error;
    }
  }
  
  async post(url, data = {}, config = {}) {
    try {
      if (url.includes('/empresas') && !data.empresaId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        data.empresaId = `EMP${timestamp}${random}`;
      }
      
      if (url.includes('/setores') && !data.setorId && !url.includes('/detalhado')) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        data.setorId = `SET${timestamp}${random}`;
      }
      
      return await this.api.post(url, data, config);
    } catch (error) {
      console.error(`Erro na requisição POST para ${url}:`, error);
      throw error;
    }
  }
  
  async put(url, data = {}, config = {}) {
    try {
      return await this.api.put(url, data, config);
    } catch (error) {
      console.error(`Erro na requisição PUT para ${url}:`, error);
      throw error;
    }
  }
  
  async delete(url, config = {}) {
    try {
      return await this.api.delete(url, config);
    } catch (error) {
      console.error(`Erro na requisição DELETE para ${url}:`, error);
      throw error;
    }
  }

  logError(method, error, context = {}) {
    const errorDetails = {
      method,
      message: error.message || 'Erro desconhecido',
      status: error.response?.status,
      data: error.response?.data,
      context
    };
    
    console.error(`[MultiFlowAPI Error] ${method}:`, errorDetails);
    
    if (error.response?.status === 403 || 
        (error.response?.data?.message && error.response?.data?.message.includes('permitido apenas para administradores'))) {
      console.error('ERRO DE PERMISSÃO: Verifique se os parâmetros de admin estão corretos');
      
      const event = new CustomEvent('multiflow:permission-error', { 
        detail: errorDetails 
      });
      window.dispatchEvent(event);
    }
    
    return errorDetails;
  }

  getUserId() {
    let userId = localStorage.getItem('userId');
    
    if (!userId || userId === 'undefined' || userId === 'null') {
      userId = this.ADMIN_ID;
      localStorage.setItem('userId', userId);
    }
    
    return userId;
  }

  isCacheValid(cacheItem, duration) {
    return cacheItem && 
           cacheItem.data && 
           Date.now() - cacheItem.timestamp < duration;
  }

  updateCache(cacheKey, data) {
    this.cache[cacheKey] = {
      data,
      timestamp: Date.now()
    };
  }

  async getUsersAdmin(userId = this.ADMIN_ID) {
    try {
      if (this.isCacheValid(this.cache.users, this.cacheDuration.medium)) {
        return {
          success: true,
          data: this.cache.users.data
        };
      }

      const params = {
        userId,
        role: 'admin',
        isAdmin: 'true'
      };
      
      const response = await this.get(`/admin/users`, { params });
      
      if (response.success && Array.isArray(response.data)) {
        this.updateCache('users', response.data);
        return {
          success: true,
          data: response.data
        };
      }
      
      return response;
    } catch (error) {
      if (this.cache.users.data) {
        return {
          success: true,
          data: this.cache.users.data,
          fromCache: true,
          error: error.message
        };
      }
      
      this.logError('getUsersAdmin', error, {userId});
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getUserAdmin(userId, adminId = this.ADMIN_ID) {
    try {
      const cacheKey = `user-${userId}`;
      const cachedUser = this.userDetailsCache.get(cacheKey);
      
      if (cachedUser && this.isCacheValid(cachedUser, this.cacheDuration.medium)) {
        return {
          success: true,
          data: cachedUser.data
        };
      }

      const params = {
        userId: adminId,
        role: 'admin',
        isAdmin: 'true'
      };
      
      const response = await this.get(`/admin/users/${userId}`, { params });
      
      if (response.success && response.data) {
        this.userDetailsCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
        
        return {
          success: true,
          data: response.data
        };
      }
      
      return response;
    } catch (error) {
      const cacheKey = `user-${userId}`;
      const cachedUser = this.userDetailsCache.get(cacheKey);
      
      if (cachedUser) {
        return {
          success: true,
          data: cachedUser.data,
          fromCache: true,
          error: error.message
        };
      }
      
      this.logError('getUserAdmin', error, {userId, adminId});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async createUserAdmin(userData, adminId = this.ADMIN_ID) {
    try {
      const params = {
        userId: adminId,
        role: 'admin',
        isAdmin: 'true'
      };
      
      const response = await this.post(`/admin/users/register`, userData, { params });
      
      if (response.success) {
        this.updateCache('users', null);
      }
      
      return response;
    } catch (error) {
      this.logError('createUserAdmin', error, {adminId});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async updateUserAdmin(userId, userData, adminId = this.ADMIN_ID) {
    try {
      const params = {
        userId: adminId,
        role: 'admin',
        isAdmin: 'true'
      };
      
      const response = await this.put(`/admin/users/${userId}`, userData, { params });
      
      if (response.success) {
        this.updateCache('users', null);
        const cacheKey = `user-${userId}`;
        this.userDetailsCache.delete(cacheKey);
      }
      
      return response;
    } catch (error) {
      this.logError('updateUserAdmin', error, {userId, adminId});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async updateUserStatusAdmin(userId, isActive, adminId = this.ADMIN_ID) {
    try {
      const params = {
        userId: adminId,
        role: 'admin',
        isAdmin: 'true'
      };
      
      const response = await this.put(`/admin/users/${userId}/status`, { isActive }, { params });
      
      if (response.success) {
        this.updateCache('users', null);
        const cacheKey = `user-${userId}`;
        this.userDetailsCache.delete(cacheKey);
      }
      
      return response;
    } catch (error) {
      this.logError('updateUserStatusAdmin', error, {userId, adminId});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async deleteUser(userId, adminId = this.ADMIN_ID) {
    try {
      const params = {
        userId: adminId,
        role: 'admin',
        isAdmin: 'true'
      };
      
      const response = await this.delete(`/admin/users/${userId}`, { params });
      
      if (response.success) {
        this.updateCache('users', null);
        const cacheKey = `user-${userId}`;
        this.userDetailsCache.delete(cacheKey);
      }
      
      return response;
    } catch (error) {
      this.logError('deleteUser', error, {userId, adminId});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async updateUserSector(userId, setorData, adminId = this.ADMIN_ID) {
    try {
      const params = {
        userId: adminId,
        role: 'admin',
        isAdmin: 'true'
      };
      
      const response = await this.put(`/admin/users/${userId}/setor`, setorData, { params });
      
      if (response.success) {
        this.updateCache('users', null);
        const cacheKey = `user-${userId}`;
        this.userDetailsCache.delete(cacheKey);
      }
      
      return response;
    } catch (error) {
      this.logError('updateUserSector', error, {userId, adminId});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async updateUserSectors(userId, setoresData, adminId = this.ADMIN_ID) {
    try {
      const params = {
        userId: adminId,
        role: 'admin',
        isAdmin: 'true'
      };
      
      const payload = {
        setores: setoresData,
        setor: setoresData[0] || null
      };
      
      const response = await this.put(`/admin/users/${userId}/setores`, payload, { params });
      
      if (response.success) {
        this.updateCache('users', null);
        const cacheKey = `user-${userId}`;
        this.userDetailsCache.delete(cacheKey);
      }
      
      return response;
    } catch (error) {
      this.logError('updateUserSectors', error, {userId, adminId});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async getEmpresas(userId = this.ADMIN_ID, isAdmin = false) {
    try {
      if (this.isCacheValid(this.cache.empresas, this.cacheDuration.medium)) {
        return {
          success: true,
          data: this.cache.empresas.data
        };
      }
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.get(`/users/${userId}/empresas`, { params });
      
      if (response.success) {
        this.updateCache('empresas', response.data);
      }
      
      return response;
    } catch (error) {
      if (this.cache.empresas.data) {
        return {
          success: true,
          data: this.cache.empresas.data,
          fromCache: true,
          error: error.message
        };
      }
      
      this.logError('getEmpresas', error, {userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getEmpresaById(empresaId, userId = this.ADMIN_ID, isAdmin = false) {
    try {
      if (!empresaId) {
        return {
          success: false,
          error: 'ID da empresa não fornecido'
        };
      }
      
      empresaId = this.normalizeId(empresaId, 'empresa');
      
      const cacheKey = `empresa-${empresaId}`;
      
      const cachedEmpresa = this.empresaDetailsCache.get(cacheKey);
      if (cachedEmpresa && this.isCacheValid(cachedEmpresa, this.cacheDuration.medium)) {
        return {
          success: true,
          data: cachedEmpresa.data
        };
      }
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.get(`/users/${userId}/empresas/${empresaId}`, { params });
      
      if (response.success) {
        this.empresaDetailsCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }
      
      return response;
    } catch (error) {
      const cacheKey = `empresa-${empresaId}`;
      const cachedEmpresa = this.empresaDetailsCache.get(cacheKey);
      
      if (cachedEmpresa) {
        return {
          success: true,
          data: cachedEmpresa.data,
          fromCache: true,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async createEmpresa(empresaData, userId = this.ADMIN_ID, isAdmin = false) {
    try {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      
      const empresaId = String(empresaData.empresaId || `EMP${timestamp}${random}`);
      
      const payload = {
        empresaId: empresaId,
        nome: empresaData.nome,
        descricao: empresaData.descricao || `Empresa ${empresaData.nome}`,
        contexto: empresaData.contexto || '',
        horarioFuncionamento: empresaData.horarioFuncionamento || 'Segunda a Sexta, 9h às 18h',
        ativo: empresaData.ativo !== false
      };
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const url = `/users/${userId}/empresas`;
      const response = await this.post(url, payload, { params });
      
      this.updateCache('empresas', null);
      
      return response;
    } catch (error) {
      this.logError('createEmpresa', error, {userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async updateEmpresa(empresaId, empresaData, userId = this.ADMIN_ID, isAdmin = false) {
    try {
      const payload = {
        nome: empresaData.nome,
        descricao: empresaData.descricao,
        contexto: empresaData.contexto || '',
        horarioFuncionamento: empresaData.horarioFuncionamento || 'Segunda a Sexta, 9h às 18h',
        ativo: empresaData.ativo !== false
      };
      
      if (empresaData.empresaId) {
        payload.empresaId = empresaData.empresaId;
      }
      
      if (empresaData.position) {
        payload.position = empresaData.position;
      }
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.put(`/users/${userId}/empresas/${empresaId}`, payload, { params });
      
      this.updateCache('empresas', null);
      const cacheKey = `empresa-${empresaId}`;
      this.empresaDetailsCache.delete(cacheKey);
      
      if (response.success) {
        try {
          const localConfig = JSON.parse(localStorage.getItem('localFlowConfig') || '{}');
          if (localConfig.empresas) {
            localConfig.empresas = localConfig.empresas.map(e => 
              e.id === empresaId || e.empresaId === empresaId ? { ...e, ...payload, lastUpdated: Date.now() } : e
            );
            localConfig.lastUpdated = Date.now();
            localStorage.setItem('localFlowConfig', JSON.stringify(localConfig));
          }
        } catch (e) {
          console.error('Erro ao atualizar localStorage após modificação da empresa:', e);
        }
      }
      
      return response;
    } catch (error) {
      this.logError('updateEmpresa', error, {empresaId, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async deleteEmpresa(empresaId, userId = this.ADMIN_ID, isAdmin = false) {
    try {
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.delete(`/users/${userId}/empresas/${empresaId}`, { params });
      
      this.updateCache('empresas', null);
      this.updateCache('setores', null);
      const cacheKey = `empresa-${empresaId}`;
      this.empresaDetailsCache.delete(cacheKey);
      
      if (response.success) {
        try {
          const localConfig = JSON.parse(localStorage.getItem('localFlowConfig') || '{}');
          if (localConfig.empresas) {
            localConfig.empresas = localConfig.empresas.filter(e => e.id !== empresaId && e.empresaId !== empresaId);
            localConfig.lastUpdated = Date.now();
            localStorage.setItem('localFlowConfig', JSON.stringify(localConfig));
          }
        } catch (e) {
          console.error('Erro ao atualizar localStorage após remoção da empresa:', e);
        }
      }
      
      return response;
    } catch (error) {
      this.logError('deleteEmpresa', error, {empresaId, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async getSetoresByEmpresa(empresaId, userId = this.ADMIN_ID, isAdmin = false) {
    try {
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.get(`/users/${userId}/empresas/${empresaId}/setores`, { params });
      return response;
    } catch (error) {
      this.logError('getSetoresByEmpresa', error, {empresaId, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getEmpresasComSetores(userId = this.ADMIN_ID, isAdmin = false, options = {}) {
    try {
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      // Parâmetros opcionais do endpoint
      if (options.ativo !== undefined) {
        params.ativo = options.ativo;
      }
      if (options.incluirVazias !== undefined) {
        params.incluirVazias = options.incluirVazias;
      }
      
      const response = await this.get(`/users/${userId}/empresas-com-setores`, { params });
      
      if (response.success) {
        console.log(`Endpoint empresas-com-setores retornou ${response.data.length} empresas`);
        if (response.metadata) {
          console.log(`Total: ${response.metadata.totalEmpresas} empresas, ${response.metadata.totalSetores} setores`);
        }
      }
      
      return response;
    } catch (error) {
      this.logError('getEmpresasComSetores', error, {userId, isAdmin, options});
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getSetores(userId = this.ADMIN_ID, isAdmin = false, allUsers = false) {
    try {
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      if (allUsers) {
        params.allUsers = 'true';
      }
      
      if (!userId || userId === 'undefined' || userId === 'null') {
        userId = this.ADMIN_ID;
      }
      
      const response = await this.get(`/users/${userId}/setores`, { params });
      
      if (response.success) {
        this.updateCache('setores', response.data);
      }
      
      return response;
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
      
      if (this.cache.setores.data) {
        return {
          success: true,
          data: this.cache.setores.data,
          fromCache: true,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getSetorById(setorId, userId = this.ADMIN_ID, isAdmin = false) {
    try {
      if (!setorId) {
        return {
          success: false,
          error: 'ID do setor não fornecido'
        };
      }
      
      setorId = this.normalizeId(setorId, 'setor');
      
      const cacheKey = `setor-${setorId}`;
      const cachedSetor = this.setorDetailsCache.get(cacheKey);
      
      if (cachedSetor && this.isCacheValid(cachedSetor, this.cacheDuration.medium)) {
        return {
          success: true,
          data: cachedSetor.data
        };
      }
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.get(`/users/${userId}/setores/${setorId}`, { params });
      
      if (response.success && response.data) {
        this.setorDetailsCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }
      
      return response;
    } catch (error) {
      const cacheKey = `setor-${setorId}`;
      const cachedSetor = this.setorDetailsCache.get(cacheKey);
      
      if (cachedSetor) {
        return {
          success: true,
          data: cachedSetor.data,
          fromCache: true,
          error: error.message
        };
      }
      
      this.logError('getSetorById', error, {setorId, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  getConversaId(id) {
    if (!id) return null;
    
    if (typeof id === 'object') {
      if (id.conversaId) return id.conversaId.toString();
      if (id._id) return id._id.toString();
      if (id.id) return id.id.toString();
      return null;
    }
    
    return id.toString();
  }

  normalizeId(id, type = 'generic') {
    if (!id) return null;
    
    if (type === 'conversa') {
      return this.getConversaId(id);
    }
    
    if (type === 'setor') {
      if (typeof id === 'object') {
        if (id.setorId) return id.setorId.toString();
        if (id._id) return id._id.toString();
        if (id.id) return id.id.toString();
        return null;
      }
      return id.toString();
    }
    
    if (typeof id === 'object') {
      const typeMap = {
        'empresa': ['empresaId', '_id', 'id'],
        'generic': ['id', '_id', 'setorId', 'empresaId', 'conversaId']
      };
      
      const props = typeMap[type] || typeMap.generic;
      
      for (const prop of props) {
        if (id[prop]) return id[prop].toString();
      }
      return null;
    }
    
    return id.toString();
  }

  async getConversas(filters = {}, userId = this.ADMIN_ID, isAdmin = false) {
    try {
      const cacheKey = filters.status?.includes('finalizada') ? 'conversasFinalizadas' : 'conversas';
      
      if (!filters.forceRefresh && this.isCacheValid(this.cache[cacheKey], this.cacheDuration.short)) {
        const cachedData = this.cache[cacheKey].data;
        
        if (filters.setorId) {
          const filteredData = cachedData.filter(conv => conv.setorId === filters.setorId);
          return {
            success: true,
            data: filteredData,
            fromCache: true
          };
        }
        
        return {
          success: true,
          data: cachedData,
          fromCache: true
        };
      }
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      if (filters.status) {
        params.status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
      }
      if (filters.arquivada !== undefined) {
        params.arquivada = filters.arquivada;
      }
      if (filters.search) {
        params.busca = filters.search;
      }
      if (filters.setorId) {
        params.setorId = filters.setorId;
      }
      if (filters.empresaId) {
        params.empresaId = filters.empresaId;
      }
      if (filters.atendenteId) {
        params.atendenteId = filters.atendenteId;
      }
      if (filters.page) {
        params.pagina = filters.page;
      }
      if (filters.limit) {
        params.limite = filters.limit;
      }
      if (filters.dataInicio) {
        params.dataInicio = filters.dataInicio;
      }
      if (filters.dataFim) {
        params.dataFim = filters.dataFim;
      }
      if (filters.fields) {
        params.fields = filters.fields;
      }
      if (filters.allUsers) {
        params.allUsers = 'true';
      }
      
      const response = await this.get(`/users/${userId}/conversas`, { params });
      
      if (response.success && Array.isArray(response.data)) {
        this.updateCache(cacheKey, response.data);
      }
      
      return response;
    } catch (error) {
      const cacheKey = filters.status?.includes('finalizada') ? 'conversasFinalizadas' : 'conversas';
      
      if (this.cache[cacheKey].data) {
        return {
          success: true,
          data: this.cache[cacheKey].data,
          fromCache: true,
          error: error.message
        };
      }
      
      this.logError('getConversas', error, {userId, isAdmin, filters});
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getConversa(conversaId, userId = this.ADMIN_ID, incluirMensagens = true, isAdmin = false) {
    try {
      if (!conversaId) {
        return {
          success: false,
          error: 'ID da conversa não fornecido'
        };
      }
      
      conversaId = this.normalizeId(conversaId, 'conversa');
      
      const cacheKey = `conversa-${conversaId}`;
      const cachedConversa = this.conversationDetailsCache.get(cacheKey);
      
      if (!incluirMensagens && cachedConversa && this.isCacheValid(cachedConversa, this.cacheDuration.short)) {
        return {
          success: true,
          data: cachedConversa.data
        };
      }
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      if (incluirMensagens) {
        params.incluirMensagens = 'true';
      }
      
      const response = await this.get(`/users/${userId}/conversas/${conversaId}`, { params });
      
      if (response.success && response.data) {
        this.conversationDetailsCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }
      
      return response;
    } catch (error) {
      const cacheKey = `conversa-${conversaId}`;
      const cachedConversa = this.conversationDetailsCache.get(cacheKey);
      
      if (cachedConversa) {
        return {
          success: true,
          data: cachedConversa.data,
          fromCache: true,
          error: error.message
        };
      }
      
      this.logError('getConversa', error, {conversaId, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async enviarMensagem(conversaId, conteudo, userId = this.ADMIN_ID, tipo = 'texto', isAdmin = false) {
    try {
      if (!conversaId || !conteudo) {
        return {
          success: false,
          error: 'ID da conversa e conteúdo são obrigatórios'
        };
      }
      
      conversaId = this.normalizeId(conversaId, 'conversa');
      
      const payload = {
        conteudo: conteudo.trim(),
        tipo: tipo
      };
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.post(`/users/${userId}/conversas/${conversaId}/mensagens`, payload, { params });
      
      if (response.success) {
        const cacheKey = `conversa-${conversaId}`;
        this.conversationDetailsCache.delete(cacheKey);
        this.updateCache('conversas', null);
      }
      
      return response;
    } catch (error) {
      this.logError('enviarMensagem', error, {conversaId, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async markConversationAsRead(conversaId, userId = this.ADMIN_ID, isAdmin = false) {
    try {
      if (!conversaId) {
        return {
          success: false,
          error: 'ID da conversa não fornecido'
        };
      }
      
      conversaId = this.normalizeId(conversaId, 'conversa');
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.put(`/users/${userId}/conversas/${conversaId}/ler`, {}, { params });
      
      if (response.success) {
        const cacheKey = `conversa-${conversaId}`;
        this.conversationDetailsCache.delete(cacheKey);
      }
      
      return response;
    } catch (error) {
      this.logError('markConversationAsRead', error, {conversaId, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async updateStatus(conversaId, novoStatus, userId = this.ADMIN_ID, atendenteId = null, isAdmin = false) {
    try {
      if (!conversaId || !novoStatus) {
        return {
          success: false,
          error: 'ID da conversa e novo status são obrigatórios'
        };
      }
      
      conversaId = this.normalizeId(conversaId, 'conversa');
      
      const payload = {
        status: novoStatus
      };
      
      if (atendenteId) {
        payload.atendenteId = atendenteId;
      }
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.put(`/users/${userId}/conversas/${conversaId}/status`, payload, { params });
      
      if (response.success) {
        const cacheKey = `conversa-${conversaId}`;
        this.conversationDetailsCache.delete(cacheKey);
        this.updateCache('conversas', null);
        this.updateCache('conversasFinalizadas', null);
      }
      
      return response;
    } catch (error) {
      this.logError('updateStatus', error, {conversaId, novoStatus, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async transferirConversa(conversaId, setorDestinoId, userId = this.ADMIN_ID, motivo = '', isAdmin = false) {
    try {
      if (!conversaId || !setorDestinoId) {
        return {
          success: false,
          error: 'ID da conversa e setor destino são obrigatórios'
        };
      }
      
      conversaId = this.normalizeId(conversaId, 'conversa');
      
      // Usando o endpoint novo e payload correto
      const payload = {
        setorId: setorDestinoId
      };
      
      const response = await this.post(`/conversas/${conversaId}/transferir`, payload);
      
      if (response.success) {
        const cacheKey = `conversa-${conversaId}`;
        this.conversationDetailsCache.delete(cacheKey);
        this.updateCache('conversas', null);
      }
      
      return response;
    } catch (error) {
      this.logError('transferirConversa', error, {conversaId, setorDestinoId, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async finalizarConversa(conversaId, userId = this.ADMIN_ID, isAdmin = false) {
    try {
      if (!conversaId) {
        return {
          success: false,
          error: 'ID da conversa não fornecido'
        };
      }
      
      conversaId = this.normalizeId(conversaId, 'conversa');
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.put(`/users/${userId}/conversas/${conversaId}/finalizar`, {}, { params });
      
      if (response.success) {
        const cacheKey = `conversa-${conversaId}`;
        this.conversationDetailsCache.delete(cacheKey);
        this.updateCache('conversas', null);
        this.updateCache('conversasFinalizadas', null);
      }
      
      return response;
    } catch (error) {
      this.logError('finalizarConversa', error, {conversaId, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async arquivarConversa(conversaId, userId = this.ADMIN_ID, isAdmin = false) {
    try {
      if (!conversaId) {
        return {
          success: false,
          error: 'ID da conversa não fornecido'
        };
      }
      
      conversaId = this.normalizeId(conversaId, 'conversa');
      
      const params = {};
      if (isAdmin) {
        params.role = 'admin';
        params.isAdmin = 'true';
      }
      
      const response = await this.put(`/users/${userId}/conversas/${conversaId}/arquivo`, {}, { params });
      
      if (response.success) {
        const cacheKey = `conversa-${conversaId}`;
        this.conversationDetailsCache.delete(cacheKey);
        this.updateCache('conversas', null);
        this.updateCache('conversasFinalizadas', null);
      }
      
      return response;
    } catch (error) {
      this.logError('arquivarConversa', error, {conversaId, userId, isAdmin});
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  resetCache(specificCache = null) {
    if (specificCache) {
      if (specificCache === 'users') {
        this.cache.users = { data: null, timestamp: 0 };
        this.userDetailsCache.clear();
        return;
      }
      
      if (specificCache === 'setores' || specificCache === 'sectors') {
        this.cache.setores = { data: null, timestamp: 0 };
        this.setorDetailsCache = new LRUCache(20);
        
        try {
          const localConfig = JSON.parse(localStorage.getItem('localFlowConfig') || '{}');
          if (localConfig.sectors) {
            localConfig.lastUpdated = 0;
            localStorage.setItem('localFlowConfig', JSON.stringify(localConfig));
          }
        } catch (e) {
          console.error('Erro ao atualizar timestamp no localStorage durante resetCache:', e);
        }
        return;
      }
      
      if (specificCache === 'empresas') {
        this.cache.empresas = { data: null, timestamp: 0 };
        this.empresaDetailsCache = new LRUCache(20);
        
        try {
          const localConfig = JSON.parse(localStorage.getItem('localFlowConfig') || '{}');
          if (localConfig.empresas) {
            localConfig.lastUpdated = 0;
            localStorage.setItem('localFlowConfig', JSON.stringify(localConfig));
          }
        } catch (e) {
          console.error('Erro ao atualizar timestamp no localStorage durante resetCache:', e);
        }
        return;
      }
      
      if (this.cache[specificCache]) {
        this.cache[specificCache] = { data: null, timestamp: 0 };
      }
      return;
    }
    
    this.cache = {
      empresas: { data: null, timestamp: 0 },
      setores: { data: null, timestamp: 0 },
      conversas: { data: [], timestamp: 0 },
      conversasFinalizadas: { data: [], timestamp: 0 },
      configIA: { data: null, timestamp: 0 },
      flowConfig: { data: null, timestamp: 0 },
      users: { data: null, timestamp: 0 }
    };
    
    this.conversationDetailsCache = new LRUCache(50);
    this.setorDetailsCache = new LRUCache(20);
    this.empresaDetailsCache = new LRUCache(20);
    this.userDetailsCache = new LRUCache(100);
    
    try {
      const localConfig = JSON.parse(localStorage.getItem('localFlowConfig') || '{}');
      localConfig.lastUpdated = 0;
      localStorage.setItem('localFlowConfig', JSON.stringify(localConfig));
    } catch (e) {
      console.error('Erro ao atualizar timestamp no localStorage durante resetCache completo:', e);
    }
  }

  getCacheStats() {
    return {
      conversationDetailsSize: this.conversationDetailsCache.getSize(),
      setorDetailsSize: this.setorDetailsCache.getSize(),
      empresaDetailsSize: this.empresaDetailsCache.getSize(),
      userDetailsSize: this.userDetailsCache.getSize(),
      conversasSize: this.cache.conversas.data?.length || 0,
      conversasFinalizadasSize: this.cache.conversasFinalizadas.data?.length || 0,
      usersSize: this.cache.users.data?.length || 0,
      idMapSize: this.conversationIdMap.size,
      reverseIdMapSize: this.reverseConversationIdMap.size
    };
  }
}

export const multiflowApi = new MultiflowApiService();