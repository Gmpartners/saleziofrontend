import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Search, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiService from '../../services/api';

const SectorManagement = () => {
  const [sectors, setSectors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    responsavel: ''
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Carregar setores na montagem
  useEffect(() => {
    loadSectors();
  }, []);
  
  // Função para carregar setores da API
  const loadSectors = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getSetores();
      if (response.success) {
        setSectors(response.data || []);
      } else {
        toast.error("Falha ao carregar setores", {
          description: response.message || "Ocorreu um erro inesperado"
        });
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
      toast.error("Erro ao carregar setores", {
        description: "Verifique sua conexão e tente novamente"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Abrir modal para criar novo setor
  const handleOpenCreateModal = () => {
    setFormData({ nome: '', descricao: '', responsavel: '' });
    setFormErrors({});
    setEditingSector(null);
    setIsModalOpen(true);
  };
  
  // Abrir modal para editar setor
  const handleOpenEditModal = (sector) => {
    setFormData({
      nome: sector.nome || '',
      descricao: sector.descricao || '',
      responsavel: sector.responsavel || ''
    });
    setFormErrors({});
    setEditingSector(sector._id);
    setIsModalOpen(true);
  };
  
  // Fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSector(null);
    setFormData({ nome: '', descricao: '', responsavel: '' });
    setFormErrors({});
  };
  
  // Validar formulário
  const validateForm = () => {
    const errors = {};
    
    if (!formData.nome.trim()) {
      errors.nome = "Nome é obrigatório";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Criar ou atualizar setor
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      let response;
      
      if (editingSector) {
        // Atualizar setor existente
        response = await apiService.updateSetor(editingSector, formData);
        if (response.success) {
          toast.success("Setor atualizado com sucesso");
          setSectors(prev => prev.map(s => s._id === editingSector ? response.data : s));
        } else {
          toast.error("Falha ao atualizar setor", {
            description: response.message || "Ocorreu um erro inesperado"
          });
        }
      } else {
        // Criar novo setor
        response = await apiService.createSetor(formData);
        if (response.success) {
          toast.success("Setor criado com sucesso");
          setSectors(prev => [...prev, response.data]);
        } else {
          toast.error("Falha ao criar setor", {
            description: response.message || "Ocorreu um erro inesperado"
          });
        }
      }
      
      if (response.success) {
        handleCloseModal();
      }
    } catch (error) {
      console.error('Erro ao salvar setor:', error);
      toast.error("Erro ao salvar setor", {
        description: "Verifique sua conexão e tente novamente"
      });
    }
  };
  
  // Excluir setor
  const handleDeleteSector = async (sectorId) => {
    if (!window.confirm("Tem certeza que deseja excluir este setor?")) {
      return;
    }
    
    try {
      const response = await apiService.deleteSetor(sectorId);
      if (response.success) {
        toast.success("Setor excluído com sucesso");
        setSectors(prev => prev.filter(s => s._id !== sectorId));
      } else {
        toast.error("Falha ao excluir setor", {
          description: response.message || "Ocorreu um erro inesperado"
        });
      }
    } catch (error) {
      console.error('Erro ao excluir setor:', error);
      toast.error("Erro ao excluir setor", {
        description: "Verifique sua conexão e tente novamente"
      });
    }
  };
  
  // Filtrar setores pela busca
  const filteredSectors = sectors.filter(sector => 
    sector.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sector.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sector.responsavel?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Gerenciamento de Setores</h1>
        
        <button
          onClick={handleOpenCreateModal}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Novo Setor</span>
        </button>
      </div>
      
      {/* Barra de busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar setores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1d2b] border border-[#32304a] rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-green-500"
          />
        </div>
      </div>
      
      {/* Lista de setores */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="bg-[#1e1d2b] rounded-xl overflow-hidden shadow-md">
          <table className="w-full text-left">
            <thead className="bg-[#25243a] text-gray-300 border-b border-[#32304a]">
              <tr>
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4 hidden md:table-cell">Descrição</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#32304a]">
              {filteredSectors.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 px-4 text-center text-gray-400">
                    {searchQuery ? 'Nenhum setor encontrado para esta busca' : 'Nenhum setor cadastrado'}
                  </td>
                </tr>
              ) : (
                filteredSectors.map(sector => (
                  <tr key={sector._id} className="hover:bg-[#25243a]">
                    <td className="py-3 px-4 font-medium text-white">{sector.nome}</td>
                    <td className="py-3 px-4 text-gray-300 hidden md:table-cell">
                      {sector.descricao?.substring(0, 50) || '—'}
                      {sector.descricao?.length > 50 ? '...' : ''}
                    </td>
                    <td className="py-3 px-4 text-gray-300">{sector.responsavel || '—'}</td>
                    <td className="py-3 px-4">
                      {sector.ativo !== false ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <XCircle className="mr-1 h-3 w-3" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(sector)}
                          className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteSector(sector._id)}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded"
                          title="Excluir"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal de Criar/Editar Setor */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1d2b] rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingSector ? 'Editar Setor' : 'Novo Setor'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-gray-300 mb-1">Nome *</label>
                  <input
                    id="nome"
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className={`w-full bg-[#25243a] border ${
                      formErrors.nome ? 'border-red-500' : 'border-[#32304a]'
                    } rounded-lg py-2 px-3 text-white focus:outline-none focus:border-green-500`}
                  />
                  {formErrors.nome && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.nome}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="descricao" className="block text-gray-300 mb-1">Descrição</label>
                  <textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full bg-[#25243a] border border-[#32304a] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-green-500"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label htmlFor="responsavel" className="block text-gray-300 mb-1">Responsável</label>
                  <input
                    id="responsavel"
                    type="text"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="w-full bg-[#25243a] border border-[#32304a] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  {editingSector ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectorManagement;