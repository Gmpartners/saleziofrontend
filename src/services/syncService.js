import axios from 'axios';
import { auth } from '../firebase/config';
import { API_URL, API_TOKEN, SYNC_CONFIG } from '../config/syncConfig';

/**
 * Serviço para sincronização entre Firebase e API/MongoDB
 */
class SyncService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.retryDelay = SYNC_CONFIG?.baseRetryDelay || 1000; // Delay inicial em ms
    this.maxRetries = SYNC_CONFIG?.maxRetries || 3; // Máximo de tentativas
  }

  /**
   * Obtém token de autenticação atual
   */
  async getAuthToken() {
    try {
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken(true);
      }
      return localStorage.getItem('authToken');
    } catch (error) {
      console.error("Erro ao obter token:", error);
      throw new Error("Erro de autenticação: " + error.message);
    }
  }

  /**
   * Monta headers para requisições
   */
  async getHeaders() {
    const token = await this.getAuthToken();
    
    // Verificar se o token está disponível
    if (!token) {
      console.warn("Token de autenticação indisponível, tentando sincronizar apenas com API_TOKEN");
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-API-Key': API_TOKEN
    };
  }

  /**
   * Verifica status da conexão com API
   */
  async checkConnection() {
    try {
      const headers = await this.getHeaders();
      console.log("Verificando conexão com a API usando headers:", 
        JSON.stringify({...headers, Authorization: headers.Authorization ? "Bearer [REDACTED]" : ""}));
      
      // Primeiro tenta o endpoint health
      try {
        const response = await axios.get(`${API_URL}/health`, { 
          timeout: 5000,
          headers
        });
        console.log("Conexão com API estabelecida com sucesso:", response.status);
        return response.status === 200;
      } catch (healthError) {
        console.warn("Erro ao verificar endpoint /health:", healthError.message);
        
        // Se falhar, tenta um endpoint genérico para ver se a API está acessível
        const fallbackResponse = await axios.get(`${API_URL}`, { 
          timeout: 5000,
          headers
        });
        return fallbackResponse.status < 500; // Considera qualquer resposta que não seja erro do servidor
      }
    } catch (error) {
      console.error("Erro na verificação de conexão:", error.message);
      return false;
    }
  }

  /**
   * Sincroniza usuário com API/MongoDB
   * @param {Object} user - Dados do usuário
   */
  async syncUser(user) {
    try {
      const headers = await this.getHeaders();
      
      // Converter role se necessário para compatibilidade com a API
      const apiRole = user.role === 'agent' ? 'attendant' : user.role;
      
      const payload = {
        firebaseUid: user.id,
        email: user.email,
        displayName: user.displayName || "",
        role: apiRole,
        sector: user.sector || "",
        sectorName: user.sectorName || "",
        isActive: user.isActive !== false,
        lastSyncedAt: new Date().toISOString()
      };
      
      console.log("Tentando sincronizar usuário:", user.id);
      console.log("Payload de sincronização:", JSON.stringify(payload));
      
      // Verificar se o endpoint existe
      try {
        const response = await axios.post(
          `${API_URL}/sync/user`,
          payload,
          { headers }
        );
        
        console.log("Sincronização de usuário bem-sucedida:", response.data);
        return response.data;
      } catch (apiError) {
        // Verificar o tipo de erro
        if (apiError.response) {
          console.error(`Erro de resposta da API (${apiError.response.status}):`, 
                        apiError.response.data);
          
          // Problema de autenticação
          if (apiError.response.status === 401 || apiError.response.status === 403) {
            console.error("Erro de autenticação ao sincronizar usuário. Verifique o token API_TOKEN e as permissões.");
          }
          
          // Se receber 404, significa que o endpoint não existe
          if (apiError.response.status === 404) {
            console.log('Endpoint /sync/user não implementado na API');
            return { success: false, error: "Endpoint não implementado" };
          }
        } else {
          console.error("Erro ao conectar à API:", apiError.message);
        }
        
        throw apiError;
      }
    } catch (error) {
      console.error("Erro ao sincronizar usuário:", error.message);
      throw error;
    }
  }

  /**
   * Sincroniza setor com API/MongoDB
   * @param {Object} sector - Dados do setor
   */
  async syncSector(sector) {
    try {
      const headers = await this.getHeaders();
      
      const payload = {
        _id: sector._id || sector.id,
        nome: sector.nome,
        descricao: sector.descricao || "",
        responsavel: sector.responsavel || "",
        ativo: sector.ativo !== false,
        firebaseId: sector.id,
        lastSyncedAt: new Date().toISOString()
      };
      
      console.log("Tentando sincronizar setor:", sector.id);
      console.log("Payload de sincronização:", JSON.stringify(payload));
      
      // Verificar se o endpoint existe
      try {
        const response = await axios.post(
          `${API_URL}/sync/sector`,
          payload,
          { headers }
        );
        
        console.log("Sincronização de setor bem-sucedida:", response.data);
        return response.data;
      } catch (apiError) {
        // Verificar o tipo de erro
        if (apiError.response) {
          console.error(`Erro de resposta da API (${apiError.response.status}):`, 
                        apiError.response.data);
          
          // Problema de autenticação
          if (apiError.response.status === 401 || apiError.response.status === 403) {
            console.error("Erro de autenticação ao sincronizar setor. Verifique o token API_TOKEN e as permissões.");
          }
          
          // Se receber 404, significa que o endpoint não existe
          if (apiError.response.status === 404) {
            console.log('Endpoint /sync/sector não implementado na API');
            return { success: false, error: "Endpoint não implementado" };
          }
        } else {
          console.error("Erro ao conectar à API:", apiError.message);
        }
        
        throw apiError;
      }
    } catch (error) {
      console.error("Erro ao sincronizar setor:", error.message);
      throw error;
    }
  }

  /**
   * Força sincronização de um setor
   * @param {string} sectorId - ID do setor
   */
  async forceSyncSector(sectorId) {
    try {
      const headers = await this.getHeaders();
      
      console.log("Forçando sincronização do setor:", sectorId);
      
      // Verificar se o endpoint existe
      try {
        const response = await axios.post(
          `${API_URL}/sync/sector/${sectorId}/force`,
          {},
          { headers }
        );
        
        console.log("Sincronização forçada concluída:", response.data);
        return response.data;
      } catch (apiError) {
        // Verificar o tipo de erro
        if (apiError.response) {
          console.error(`Erro de resposta da API (${apiError.response.status}):`, 
                        apiError.response.data);
          
          // Problema de autenticação
          if (apiError.response.status === 401 || apiError.response.status === 403) {
            console.error("Erro de autenticação ao forçar sincronização. Verifique o token API_TOKEN e as permissões.");
          }
          
          // Se receber 404, significa que o endpoint não existe
          if (apiError.response.status === 404) {
            console.log('Endpoint /sync/sector/:id/force não implementado na API');
            return { success: false, error: "Endpoint não implementado" };
          }
        } else {
          console.error("Erro ao conectar à API:", apiError.message);
        }
        
        throw apiError;
      }
    } catch (error) {
      console.error("Erro ao forçar sincronização de setor:", error.message);
      throw error;
    }
  }

  /**
   * Adiciona operação à fila de sincronização
   * @param {string} type - Tipo de operação ('user' ou 'sector')
   * @param {Object} data - Dados a sincronizar
   * @param {Function} onSuccess - Callback após sucesso
   * @param {Function} onError - Callback após erro
   */
  enqueueSync(type, data, onSuccess, onError) {
    this.queue.push({
      type,
      data,
      onSuccess,
      onError,
      retries: 0
    });
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Processa fila de sincronização
   */
  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }
    
    this.isProcessing = true;
    const item = this.queue.shift();
    
    try {
      // Verificar primeiro a conexão com a API
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error("API não disponível no momento");
      }
      
      let result;
      
      // Executar a operação de sincronização
      if (item.type === 'user') {
        result = await this.syncUser(item.data);
      } else if (item.type === 'sector') {
        result = await this.syncSector(item.data);
      } else {
        throw new Error(`Tipo de sincronização desconhecido: ${item.type}`);
      }
      
      // Verificar se há resposta de erro da API
      if (result && result.error) {
        throw new Error(result.error);
      }
      
      // Sucesso
      if (item.onSuccess) {
        item.onSuccess(result);
      }
    } catch (error) {
      console.error(`Erro na sincronização ${item.type}:`, error.message);
      
      // Se for erro 404 (endpoint não implementado), não tentar novamente
      if (error.response && error.response.status === 404) {
        console.log(`Endpoint para sincronização de ${item.type} não implementado na API`);
        if (item.onError) {
          item.onError(error);
        }
        // Continuar processando a fila
        setTimeout(() => this.processQueue(), 100);
        return;
      }
      
      // Verificar se deve tentar novamente
      if (item.retries < this.maxRetries) {
        item.retries++;
        const delay = this.retryDelay * Math.pow(2, item.retries - 1); // Backoff exponencial
        
        console.log(`Reagendando ${item.type} para sincronização em ${delay}ms (tentativa ${item.retries})`);
        setTimeout(() => {
          this.queue.push(item);
          if (!this.isProcessing) {
            this.processQueue();
          }
        }, delay);
      } else {
        // Erro definitivo
        if (item.onError) {
          item.onError(error);
        }
      }
    }
    
    // Continuar processando a fila
    setTimeout(() => this.processQueue(), 100);
  }
}

// Exportar instância única
export const syncService = new SyncService();