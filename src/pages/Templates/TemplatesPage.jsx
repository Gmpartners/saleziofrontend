// src/pages/Templates/TemplatesPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Pencil, Trash2, Search, 
  Filter, CheckCircle, AlertCircle, Copy, Tag, User, Globe
} from 'lucide-react';
import { useAuthContext } from '../../hooks/useAuthContext';
import apiService from '../../services/apiService';

function TemplatesPage() {
  const { user, isAdmin } = useAuthContext();
  const [templates, setTemplates] = useState([]);
  const [userTemplates, setUserTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Formulário
  const [formData, setFormData] = useState({
    nome: '',
    conteudo: '',
    setor: user?.setor || 'Geral',
    compartilhado: true,
    tags: []
  });
  const [currentTag, setCurrentTag] = useState('');
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  
  const tagsInputRef = useRef(null);

  // Carregar templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        
        // Carregar templates globais/setor
        const response = await apiService.getTemplates();
        if (response.success) {
          setTemplates(response.data || []);
        }
        
        // Carregar templates pessoais
        const userResponse = await apiService.getTemplatesUser();
        if (userResponse.success) {
          setUserTemplates(userResponse.data || []);
        }
        
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar templates:', err);
        setError(err.message || 'Erro ao carregar templates');
      } finally {
        setLoading(false);
      }
    };
    
    loadTemplates();
  }, []);
  
  // Filtrar templates
  const filteredTemplates = () => {
    // Combinar templates globais e pessoais
    let allTemplates = [...templates, ...userTemplates];
    
    // Remover duplicados (caso um template pessoal tenha o mesmo ID de um global)
    allTemplates = allTemplates.filter((template, index, self) => 
      index === self.findIndex(t => t._id === template._id)
    );
    
    // Aplicar filtros
    return allTemplates.filter(template => {
      // Filtro de busca
      const matchesSearch = searchQuery === '' || 
        template.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.conteudo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filtro de categoria
      const matchesCategory = filterCategory === 'all' ||
        template.setor === filterCategory;
      
      // Filtro de fonte (pessoal/compartilhado)
      const matchesSource = filterSource === 'all' ||
        (filterSource === 'personal' && template.emailUsuario === user?.email) ||
        (filterSource === 'shared' && template.compartilhado);
      
      return matchesSearch && matchesCategory && matchesSource;
    });
  };
  
  // Adicionar tag
  const handleAddTag = () => {
    if (!currentTag.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, currentTag.trim()]
    }));
    
    setCurrentTag('');
    
    // Focar no input de tags novamente
    if (tagsInputRef.current) {
      tagsInputRef.current.focus();
    }
  };
  
  // Remover tag
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  // Limpar formulário
  const resetForm = () => {
    setFormData({
      nome: '',
      conteudo: '',
      setor: user?.setor || 'Geral',
      compartilhado: true,
      tags: []
    });
    setEditingTemplate(null);
    setFormError(null);
    setFormSuccess(null);
  };
  
  // Abrir formulário para edição
  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setFormData({
      nome: template.nome,
      conteudo: template.conteudo,
      setor: template.setor,
      compartilhado: template.compartilhado,
      tags: [...template.tags]
    });
    setShowForm(true);
    
    // Scroll para o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Salvar template
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    // Validação
    if (!formData.nome.trim()) {
      setFormError('Nome do template é obrigatório');
      return;
    }
    
    if (!formData.conteudo.trim()) {
      setFormError('Conteúdo do template é obrigatório');
      return;
    }
    
    try {
      let response;
      
      if (editingTemplate) {
        // Atualizar template existente
        response = await apiService.updateTemplate(
          editingTemplate._id, 
          formData
        );
        
        if (response.success) {
          setFormSuccess('Template atualizado com sucesso!');
          
          // Atualizar a lista de templates
          if (editingTemplate.emailUsuario === user?.email) {
            setUserTemplates(prev => 
              prev.map(t => t._id === editingTemplate._id ? response.data : t)
            );
          } else {
            setTemplates(prev => 
              prev.map(t => t._id === editingTemplate._id ? response.data : t)
            );
          }
        }
      } else {
        // Criar novo template
        response = await apiService.createTemplate(formData);
        
        if (response.success) {
          setFormSuccess('Template criado com sucesso!');
          
          // Adicionar à lista apropriada
          if (response.data.emailUsuario === user?.email) {
            setUserTemplates(prev => [...prev, response.data]);
          } else {
            setTemplates(prev => [...prev, response.data]);
          }
        }
      }
      
      // Limpar formulário após alguns segundos
      setTimeout(() => {
        resetForm();
        setShowForm(false);
      }, 2000);
      
    } catch (err) {
      console.error('Erro ao salvar template:', err);
      setFormError(err.message || 'Erro ao salvar template');
    }
  };
  
  // Excluir template
  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Tem certeza que deseja excluir este template?')) {
      return;
    }
    
    try {
      const response = await apiService.deleteTemplate(templateId);
      
      if (response.success) {
        // Remover da lista
        setTemplates(prev => prev.filter(t => t._id !== templateId));
        setUserTemplates(prev => prev.filter(t => t._id !== templateId));
        
        // Fechar formulário se estiver editando o template excluído
        if (editingTemplate && editingTemplate._id === templateId) {
          resetForm();
          setShowForm(false);
        }
      }
    } catch (err) {
      console.error('Erro ao excluir template:', err);
      setError(err.message || 'Erro ao excluir template');
    }
  };
  
  // Copiar template para área de transferência
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        // Feedback visual temporário
        const el = document.activeElement;
        if (el && el.blur) el.blur();
        
        // Mostrar toast ou algum feedback
        alert('Template copiado para área de transferência!');
      },
      (err) => console.error('Erro ao copiar:', err)
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Templates de Mensagens</h1>
        
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
              Novo Template
            </>
          )}
        </button>
      </div>
      
      {/* Formulário */}
      {showForm && (
        <div className="bg-[#1e1d2b] rounded-lg p-5 shadow-lg mb-6 animate-fadeIn">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingTemplate ? 'Editar Template' : 'Novo Template'}
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
                  Nome do Template
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({...prev, nome: e.target.value}))}
                  placeholder="Ex: Saudação Inicial"
                  className="w-full bg-[#25243a] text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Setor
                </label>
                <select
                  value={formData.setor}
                  onChange={(e) => setFormData(prev => ({...prev, setor: e.target.value}))}
                  className="w-full bg-[#25243a] text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Geral">Geral</option>
                  <option value="Suporte">Suporte</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Financeiro">Financeiro</option>
                  {/* Adicionar mais setores conforme necessário */}
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Conteúdo da Mensagem
              </label>
              <textarea
                value={formData.conteudo}
                onChange={(e) => setFormData(prev => ({...prev, conteudo: e.target.value}))}
                placeholder="Digite o conteúdo do template..."
                rows={6}
                className="w-full bg-[#25243a] text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Tags
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {formData.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#25243a] text-gray-300 border border-[#32304a]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1.5 text-gray-400 hover:text-gray-200"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  ref={tagsInputRef}
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Adicionar tag..."
                  className="flex-1 bg-[#25243a] text-white border border-gray-700 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="bg-[#32304a] text-white px-4 py-2 rounded-r-lg hover:bg-[#3d3b59] transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.compartilhado}
                  onChange={(e) => setFormData(prev => ({...prev, compartilhado: e.target.checked}))}
                  className="h-4 w-4 text-green-600 bg-[#25243a] border border-gray-700 rounded focus:ring-0"
                />
                <span className="ml-2 text-gray-300">
                  Compartilhar com outros atendentes do setor
                </span>
              </label>
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
                {editingTemplate ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Filtros */}
      <div className="bg-[#1e1d2b] rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar templates..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#25243a] border border-[#32304a] rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-[#25243a] border border-[#32304a] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todos os Setores</option>
              <option value="Geral">Geral</option>
              <option value="Suporte">Suporte</option>
              <option value="Vendas">Vendas</option>
              <option value="Financeiro">Financeiro</option>
              {/* Adicionar mais setores conforme necessário */}
            </select>
          </div>
          
          <div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full bg-[#25243a] border border-[#32304a] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todas as Origens</option>
              <option value="personal">Meus Templates</option>
              <option value="shared">Templates Compartilhados</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Lista de Templates */}
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-green-500 rounded-full"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-800 text-red-300 p-4 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      ) : filteredTemplates().length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-[#1e1d2b] rounded-lg p-8 text-center">
          <MessageSquare className="h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-xl font-medium text-gray-300 mb-2">Nenhum template encontrado</h3>
          <p className="text-gray-400">Tente ajustar os filtros ou crie um novo template</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates().map(template => (
            <div
              key={template._id}
              className="bg-[#1e1d2b] rounded-lg p-4 shadow-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-semibold">{template.nome}</h3>
                <div className="flex items-center space-x-1">
                  {template.emailUsuario === user?.email ? (
                    <User className="h-4 w-4 text-blue-400" title="Meu template" />
                  ) : (
                    <Globe className="h-4 w-4 text-green-400" title="Template compartilhado" />
                  )}
                  
                  {template.compartilhado && (
                    <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs">
                      Compartilhado
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-[#25243a] rounded p-3 mb-3 max-h-32 overflow-y-auto">
                <p className="text-gray-300 text-sm whitespace-pre-line">{template.conteudo}</p>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {template.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="px-2 py-0.5 rounded-full text-xs bg-[#25243a] text-gray-300 border border-[#32304a]"
                  >
                    {tag}
                  </span>
                ))}
                
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {template.setor}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Criado: {new Date(template.criadoEm || Date.now()).toLocaleDateString()}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(template.conteudo)}
                    className="p-1.5 rounded-full bg-[#25243a] text-gray-400 hover:text-white transition-colors"
                    title="Copiar"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  
                  {/* Mostrar editar apenas para templates pessoais ou admin */}
                  {(template.emailUsuario === user?.email || isAdmin) && (
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="p-1.5 rounded-full bg-[#25243a] text-gray-400 hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Mostrar excluir apenas para templates pessoais ou admin */}
                  {(template.emailUsuario === user?.email || isAdmin) && (
                    <button
                      onClick={() => handleDeleteTemplate(template._id)}
                      className="p-1.5 rounded-full bg-[#25243a] text-red-400 hover:text-red-300 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;