// src/pages/Admin/SetoresPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Pencil, Trash2, Search, CheckCircle, 
  AlertCircle, MoreVertical, X, Check
} from 'lucide-react';
import { useAuthContext } from '../../hooks/useAuthContext';
import apiService from '../../services/apiService';
import { Navigate } from 'react-router-dom';

function SetoresPage() {
  const { user, isAdmin } = useAuthContext();
  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSetor, setEditingSetor] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [formError, setFormError] = useState(null);
  
  // Formulário
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    responsaveis: [{ nome: '', email: '' }],
    ativo: true
  });
  
  // Verificar se é administrador
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  // Carregar setores
  useEffect(() => {
    const loadSetores = async () => {
      try {
        setLoading(true);
        
        const response = await apiService.getSetores();
        if (response.success) {
          setSetores(response.data || []);
        }
        
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar setores:', err);
        setError(err.message || 'Erro ao carregar setores');
      } finally {
        setLoading(false);
      }
    };
    
    loadSetores();
  }, []);
  
  // Filtrar setores
  const filteredSetores = setores.filter(setor => 
    searchQuery === '' || 
    setor.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    setor.descricao?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Adicionar novo responsável
  const handleAddResponsavel = () => {
    setFormData(prev => ({
      ...prev,
      responsaveis: [...prev.responsaveis, { nome: '', email: '' }]
    }));
  };
  
  // Remover responsável
  const handleRemoveResponsavel = (index) => {
    setFormData(prev => ({
      ...prev,
      responsaveis: prev.responsaveis.filter((_, i) => i !== index)
    }));
  };
  
  // Atualizar dados do responsável
  const handleUpdateResponsavel = (index, field, value) => {
    setFormData(prev => {
      const updatedResponsaveis = [...prev.responsaveis];
      updatedResponsaveis[index] = {
        ...updatedResponsaveis[index],
        [field]: value
      };
      
      return {
        ...prev,
        responsaveis: updatedResponsaveis
      };
    });
  };
  
  // Limpar formulário
  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      responsaveis: [{ nome: '', email: '' }],
      ativo: true
    });
    setEditingSetor(null);
    setFormError(null);
    setFormSuccess(null);
  };
  
  // Abrir formulário para edição
  const handleEditSetor = (setor) => {
    setEditingSetor(setor);
    setFormData({
      nome: setor.nome,
      descricao: setor.descricao || '',
      responsaveis: setor.responsaveis.length > 0 ? 
        setor.responsaveis.map(r => ({ nome: r.nome, email: r.email })) : 
        [{ nome: '', email: '' }],
      ativo: setor.ativo
    });
    setShowForm(true);
    
    // Scroll para o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Salvar setor
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    // Validação
    if (!formData.nome.trim()) {
      setFormError('Nome do setor é obrigatório');
      return;
    }
    
    // Verificar responsáveis
    const validResponsaveis = formData.responsaveis.filter(
      r => r.nome.trim() && r.email.trim()
    );
    
    try {
      let response;
      
      const dataToSend = {
        ...formData,
        responsaveis: validResponsaveis
      };
      
      if (editingSetor) {
        // Atualizar setor existente
        response = await apiService.updateSetor(
          editingSetor._id || editingSetor.nome, 
          dataToSend
        );
        
        if (response.success) {
          setFormSuccess('Setor atualizado com sucesso!');
          
          // Atualizar a lista de setores
          setSetores(prev => 
            prev.map(s => s._id === editingSetor._id ? response.data : s)
          );
        }
      } else {
        // Criar novo setor
        response = await apiService.createSetor(dataToSend);
        
        if (response.success) {
          setFormSuccess('Setor criado com sucesso!');
          
          // Adicionar à lista
          setSetores(prev => [...prev, response.data]);
        }
      }
      
      // Limpar formulário após alguns segundos
      setTimeout(() => {
        resetForm();
        setShowForm(false);
      }, 2000);
      
    } catch (err) {
      console.error('Erro ao salvar setor:', err);
      setFormError(err.message || 'Erro ao salvar setor');
    }
  };
  
  // Excluir setor
  const handleDeleteSetor = async (setorId) => {
    if (!window.confirm('Tem certeza que deseja excluir este setor? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const response = await apiService.deleteSetor(setorId);
      
      if (response.success) {
        // Remover da lista
        setSetores(prev => prev.filter(s => s._id !== setorId));
        
        // Fechar formulário se estiver editando o setor excluído
        if (editingSetor && editingSetor._id === setorId) {
          resetForm();
          setShowForm(false);
        }
      }
    } catch (err) {
      console.error('Erro ao excluir setor:', err);
      setError(err.message || 'Erro ao excluir setor');
    }
  };
  
  // Alternar status do setor
  const handleToggleStatus = async (setor) => {
    try {
      const response = await apiService.updateSetor(
        setor._id || setor.nome,
        { ativo: !setor.ativo }
      );
      
      if (response.success) {
        // Atualizar na lista
        setSetores(prev => 
          prev.map(s => s._id === setor._id ? response.data : s)
        );
      }
    } catch (err) {
      console.error('Erro ao atualizar status do setor:', err);
      setError(err.message || 'Erro ao atualizar status do setor');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Gerenciamento de Setores</h1>
        
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          {showForm ? 'Cancelar' : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Novo Setor
            </>
          )}
        </button>
      </div>
      
      {/* Formulário */}
      {showForm && (
        <div className="bg-[#1e1d2b] rounded-lg p-5 shadow-lg mb-6 animate-fadeIn">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingSetor ? 'Editar Setor' : 'Novo Setor'}
          </h2>
          
          {formError && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {formError}
              </div>
            </div>
          )}
          
          {formSuccess && (
            <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                {formSuccess}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Nome do Setor
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({...prev, nome: e.target.value}))}
                  placeholder="Ex: Suporte"
                  className="w-full bg-[#25243a] text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Status
                </label>
                <div className="flex items-center space-x-4 h-full pt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formData.ativo}
                      onChange={() => setFormData(prev => ({...prev, ativo: true}))}
                      className="h-4 w-4 text-green-600 bg-[#25243a] border border-gray-700 rounded focus:ring-0"
                    />
                    <span className="ml-2 text-gray-300">Ativo</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!formData.ativo}
                      onChange={() => setFormData(prev => ({...prev, ativo: false}))}
                      className="h-4 w-4 text-red-600 bg-[#25243a] border border-gray-700 rounded focus:ring-0"
                    />
                    <span className="ml-2 text-gray-300">Inativo</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Descrição
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({...prev, descricao: e.target.value}))}
                placeholder="Descrição do setor e suas responsabilidades..."
                rows={3}
                className="w-full bg-[#25243a] text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-gray-400 text-sm font-medium">
                  Responsáveis
                </label>
                <button
                  type="button"
                  onClick={handleAddResponsavel}
                  className="text-xs text-green-400 hover:text-green-300 flex items-center"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Responsável
                </button>
              </div>
              
              {formData.responsaveis.map((responsavel, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={responsavel.nome}
                      onChange={(e) => handleUpdateResponsavel(index, 'nome', e.target.value)}
                      placeholder="Nome do Responsável"
                      className="flex-1 bg-[#25243a] text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="email"
                      value={responsavel.email}
                      onChange={(e) => handleUpdateResponsavel(index, 'email', e.target.value)}
                      placeholder="Email do Responsável"
                      className="flex-1 bg-[#25243a] text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    
                    {formData.responsaveis.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveResponsavel(index)}
                        className="ml-2 p-2 rounded-lg bg-[#32304a] text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {editingSetor ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Filtro */}
      <div className="bg-[#1e1d2b] rounded-lg p-4 mb-6">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar setores..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#25243a] border border-[#32304a] rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {/* Lista de Setores */}
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-green-500 rounded-full"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-800 text-red-300 p-4 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      ) : filteredSetores.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-[#1e1d2b] rounded-lg p-8 text-center">
          <Users className="h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-xl font-medium text-gray-300 mb-2">Nenhum setor encontrado</h3>
          <p className="text-gray-400">Tente ajustar a busca ou crie um novo setor</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[#1e1d2b] rounded-lg shadow-lg">
          <table className="w-full min-w-full">
            <thead className="bg-[#25243a] text-gray-400">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Setor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Responsáveis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Criado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#32304a]">
              {filteredSetores.map((setor) => (
                <tr key={setor._id} className="hover:bg-[#25243a]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-white font-medium">{setor.nome}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300 text-sm max-w-xs truncate">
                      {setor.descricao || "Sem descrição"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      {setor.responsaveis && setor.responsaveis.length > 0 ? (
                        setor.responsaveis.map((resp, idx) => (
                          <div key={idx} className="text-gray-300 text-sm">
                            {resp.nome} <span className="text-gray-500">{resp.email}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 text-sm">Sem responsáveis</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      setor.ativo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {setor.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(setor.criadoEm || Date.now()).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleToggleStatus(setor)}
                        className={`p-1.5 rounded-full ${
                          setor.ativo 
                            ? 'bg-green-500/20 text-green-400 hover:text-green-300' 
                            : 'bg-red-500/20 text-red-400 hover:text-red-300'
                        } transition-colors`}
                        title={setor.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {setor.ativo ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleEditSetor(setor)}
                        className="p-1.5 rounded-full bg-[#25243a] text-gray-400 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteSetor(setor._id)}
                        className="p-1.5 rounded-full bg-[#25243a] text-red-400 hover:text-red-300 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SetoresPage;