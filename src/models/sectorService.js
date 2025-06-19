import apiService from './api';
import { Sector, Knowledge, FlowConfig, IAConfig } from '../models/sector';

const sectorService = {
  cache: {
    sectors: null,
    sectorsById: {},
    lastFetch: null,
    ttl: 5 * 60 * 1000
  },

  async getSetores(forceFresh = true) {
    try {
      // Se forceFresh é true, sempre busca novos dados
      if (forceFresh || !this.isCacheValid()) {
        console.log('Buscando setores diretamente da API (sem cache)');
        
        const response = await apiService.getSetores();
        if (response.success) {
          const sectors = response.data.map(sectorData => new Sector(sectorData));
          // Atualiza o cache
          this.updateCache(sectors);
          
          console.log(`${sectors.length} setores obtidos da API:`, 
            sectors.map(s => ({ id: s.id, nome: s.nome }))
          );
          
          return sectors;
        }
        throw new Error(response.message || 'Erro ao obter setores');
      }
      
      console.log('Retornando setores do cache');
      return this.cache.sectors;
    } catch (error) {
      console.error('Error in getSetores:', error);
      
      // Se o cache estiver disponível, use-o em caso de erro
      if (this.cache.sectors !== null) {
        console.warn('Usando cache de setores devido a erro na API');
        return this.cache.sectors;
      }
      
      throw error;
    }
  },

  async getSetorById(sectorId) {
    try {
      // Verificar se devemos sempre buscar dados atualizados da API
      const forceFresh = true; // Sempre buscar do servidor
      
      if (forceFresh) {
        console.log(`Buscando setor ${sectorId} diretamente da API`);
        
        const response = await apiService.getSetorById(sectorId);
        if (response.success) {
          const sector = new Sector(response.data);
          // Atualiza o cache
          this.cache.sectorsById[sectorId] = sector;
          console.log(`Setor ${sectorId} atualizado no cache:`, { 
            nome: sector.nome, 
            descricao: sector.descricao 
          });
          return sector;
        }
        
        throw new Error(response.message || 'Setor não encontrado');
      }
      
      // Usar cache se disponível e não forçou atualização
      if (this.cache.sectorsById[sectorId]) {
        console.log(`Retornando setor ${sectorId} do cache`);
        return this.cache.sectorsById[sectorId];
      }

      const response = await apiService.getSetorById(sectorId);
      if (response.success) {
        const sector = new Sector(response.data);
        this.cache.sectorsById[sectorId] = sector;
        return sector;
      }
      throw new Error(response.message || 'Setor não encontrado');
    } catch (error) {
      console.error(`Error in getSetorById(${sectorId}):`, error);
      
      // Usar cache em caso de erro, se disponível
      if (this.cache.sectorsById[sectorId]) {
        console.warn(`Usando setor ${sectorId} do cache devido a erro na API`);
        return this.cache.sectorsById[sectorId];
      }
      
      throw error;
    }
  },

  async createSetor(sectorData) {
    try {
      const sector = new Sector(sectorData);
      const response = await apiService.createSetor(sector.toJSON());
      
      if (response.success) {
        // Limpar cache após criação para forçar busca de dados atualizados
        this.invalidateCache();
        return new Sector(response.data);
      }
      throw new Error(response.message || 'Erro ao criar setor');
    } catch (error) {
      console.error('Error in createSetor:', error);
      throw error;
    }
  },

  async updateSetor(sectorId, sectorData) {
    try {
      const sector = new Sector({...sectorData, id: sectorId});
      
      // Garantir que todos os campos necessários estão presentes
      console.log(`Enviando atualização para setor ${sectorId}:`, {
        nome: sector.nome,
        descricao: sector.descricao
      });
      
      const response = await apiService.updateSetor(sectorId, sector.toJSON());
      
      if (response.success) {
        // Limpar cache para forçar busca de dados atualizados
        this.invalidateCache();
        
        // Verificar dados recebidos da API após atualização
        console.log(`Dados recebidos após atualização do setor ${sectorId}:`, {
          nome: response.data.nome,
          descricao: response.data.descricao
        });
        
        return new Sector(response.data);
      }
      throw new Error(response.message || 'Erro ao atualizar setor');
    } catch (error) {
      console.error(`Error in updateSetor(${sectorId}):`, error);
      throw error;
    }
  },

  async deleteSetor(sectorId) {
    try {
      const response = await apiService.deleteSetor(sectorId);
      if (response.success) {
        this.invalidateCache();
      }
      return response.success;
    } catch (error) {
      console.error(`Error in deleteSetor(${sectorId}):`, error);
      throw error;
    }
  },

  async saveFlowConfig(flowData) {
    try {
      const flowConfig = new FlowConfig(flowData);
      const response = await apiService.saveFlowConfig(flowConfig.toJSON());
      
      if (response.success) {
        return new FlowConfig(response.data);
      }
      throw new Error(response.message || 'Erro ao salvar configuração de fluxo');
    } catch (error) {
      console.error('Error in saveFlowConfig:', error);
      throw error;
    }
  },

  async getFlowConfig() {
    try {
      const response = await apiService.getFlowConfig();
      
      if (response.success) {
        return new FlowConfig(response.data);
      }
      throw new Error(response.message || 'Erro ao obter configuração de fluxo');
    } catch (error) {
      console.error('Error in getFlowConfig:', error);
      throw error;
    }
  },

  async addKnowledge(knowledgeData) {
    try {
      const knowledge = new Knowledge(knowledgeData);
      const response = await apiService.addKnowledge(knowledge.toJSON());
      
      if (response.success) {
        return new Knowledge(response.data);
      }
      throw new Error(response.message || 'Erro ao adicionar base de conhecimento');
    } catch (error) {
      console.error('Error in addKnowledge:', error);
      throw error;
    }
  },

  async getKnowledgeBySector(sectorId) {
    try {
      const response = await apiService.getKnowledgeBySector(sectorId);
      
      if (response.success) {
        return response.data.map(knowledgeData => new Knowledge(knowledgeData));
      }
      throw new Error(response.message || 'Erro ao obter bases de conhecimento');
    } catch (error) {
      console.error(`Error in getKnowledgeBySector(${sectorId}):`, error);
      throw error;
    }
  },

  async syncSector(sectorId) {
    try {
      const response = await apiService.forceSyncSetor(sectorId);
      if (response.success) {
        this.invalidateCache();
        delete this.cache.sectorsById[sectorId];
      }
      return response.success;
    } catch (error) {
      console.error(`Error in syncSector(${sectorId}):`, error);
      throw error;
    }
  },

  isCacheValid() {
    return this.cache.sectors !== null && 
           this.cache.lastFetch !== null && 
           (Date.now() - this.cache.lastFetch) < this.cache.ttl;
  },

  updateCache(sectors) {
    this.cache.sectors = sectors;
    this.cache.lastFetch = Date.now();
    
    sectors.forEach(sector => {
      this.cache.sectorsById[sector.id] = sector;
    });
    
    console.log(`Cache atualizado com ${sectors.length} setores`);
  },

  invalidateCache() {
    console.log('Invalidando cache completo de setores');
    this.cache.sectors = null;
    this.cache.lastFetch = null;
    this.cache.sectorsById = {};
    
    // Também limpa o cache no localStorage
    try {
      const localConfig = JSON.parse(localStorage.getItem('localFlowConfig') || '{}');
      if (localConfig.lastUpdated) {
        localConfig.lastUpdated = 0;
        localStorage.setItem('localFlowConfig', JSON.stringify(localConfig));
        console.log('Marcação de cache local invalidada');
      }
    } catch (e) {
      console.error('Erro ao invalidar cache local:', e);
    }
  }
};

export default sectorService;