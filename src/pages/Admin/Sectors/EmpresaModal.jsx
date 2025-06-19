import React, { useState, useEffect } from 'react';
import { Building, Trash, Info, Activity, AlertTriangle, HelpCircle, LibraryBig, Plus } from 'lucide-react';

export function EmpresaModal({ 
  open, 
  onOpenChange,
  empresa,
  onSave,
  onDelete,
  isNew = true,
  isSaving = false,
  isDeleting = false
}) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    contexto: '',
    
    ativo: true,
    conteudosAutomaticos: []
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basico');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  
  useEffect(() => {
    if (empresa) {
      const empresaData = {
        ...empresa,
        id: empresa.id || empresa.empresaId,
        empresaId: empresa.empresaId || empresa.id,
        nome: empresa.nome || '',
        descricao: empresa.descricao || '',
        contexto: empresa.contexto || '',
        
        ativo: empresa.ativo !== false,
        position: empresa.position || { x: 0, y: 0 },
        conteudosAutomaticos: empresa.conteudosAutomaticos || []
      };
      
      setFormData(empresaData);
    } else {
      setFormData({
        nome: '',
        descricao: '',
        contexto: '',
       
        ativo: true,
        position: { x: 0, y: 0 },
        conteudosAutomaticos: []
      });
    }
    
    setFormErrors({});
    setActiveTab('basico');
    setHasChanged(false);
  }, [empresa, open, isNew]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    setHasChanged(true);
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const handleSwitchChange = () => {
    setFormData(prev => ({
      ...prev,
      ativo: !prev.ativo
    }));
    
    setHasChanged(true);
  };

  const handleAddConteudo = () => {
    setFormData(prev => ({
      ...prev,
      conteudosAutomaticos: [
        ...prev.conteudosAutomaticos,
        {
          tipo: '',
          resposta: ''
        }
      ]
    }));
    
    setHasChanged(true);
  };

  const handleConteudoChange = (index, field, value) => {
    setFormData(prev => {
      const newConteudos = [...prev.conteudosAutomaticos];
      newConteudos[index] = {
        ...newConteudos[index],
        [field]: value
      };
      return {
        ...prev,
        conteudosAutomaticos: newConteudos
      };
    });
    
    setHasChanged(true);
    
    if (formErrors[`conteudo_${index}_${field}`]) {
      setFormErrors(prev => ({
        ...prev,
        [`conteudo_${index}_${field}`]: null
      }));
    }
  };

  const handleRemoveConteudo = (index) => {
    setFormData(prev => {
      const newConteudos = [...prev.conteudosAutomaticos];
      newConteudos.splice(index, 1);
      return {
        ...prev,
        conteudosAutomaticos: newConteudos
      };
    });
    
    setHasChanged(true);
  };
  
  const validateForm = () => {
    const errors = {};
    let isValid = true;
    
    if (!formData.nome || !formData.nome.trim()) {
      errors.nome = 'Nome da empresa é obrigatório';
      isValid = false;
    }
    
    formData.conteudosAutomaticos.forEach((conteudo, index) => {
      if (!conteudo.tipo || !conteudo.tipo.trim()) {
        errors[`conteudo_${index}_tipo`] = 'Tipo do conteúdo é obrigatório';
        isValid = false;
      }
      
      if (!conteudo.resposta || !conteudo.resposta.trim()) {
        errors[`conteudo_${index}_resposta`] = 'Resposta do conteúdo é obrigatória';
        isValid = false;
      }
    });
    
    setFormErrors(errors);
    return isValid;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!hasChanged && !isNew) {
      onOpenChange(false);
      return;
    }
    
    const isValid = validateForm();
    if (!isValid) {
      if (formErrors.nome) {
        setActiveTab('basico');
      } else if (Object.keys(formErrors).some(key => key.startsWith('conteudo_'))) {
        setActiveTab('conteudosAutomaticos');
      }
      return;
    }
    
    const empresaData = {
      ...formData,
      id: empresa?.id || formData.id,
      empresaId: empresa?.empresaId || formData.empresaId,
      ativo: formData.ativo !== false,
      conteudosAutomaticos: formData.conteudosAutomaticos || []
    };
    
    onSave(empresaData);
  };
  
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (onDelete && empresa && !isNew) {
      onDelete(empresa.id || empresa.empresaId);
    }
    setDeleteDialogOpen(false);
  };
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-[#070b11]/80">
      <div className="bg-[#0f1621] border border-[#1f2937]/40 rounded-lg text-white w-full max-w-[700px] max-h-[90vh] overflow-auto shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-[#1f2937]/40">
          <h2 className="text-xl font-bold text-white">
            {isNew ? 'Criar Nova Empresa' : 'Editar Empresa'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isNew 
              ? 'Adicione uma nova empresa ao fluxo de atendimento.' 
              : 'Modifique as informações da empresa.'}
          </p>
        </div>
        
        {/* Tabs Navigation */}
        <div className="bg-[#101820] border-b border-[#1f2937]/40 px-1">
          <div className="flex overflow-x-auto py-1 gap-1 text-sm">
            <button 
              onClick={() => setActiveTab('basico')} 
              className={`flex items-center px-3 py-2 rounded-md ${activeTab === 'basico' ? 'bg-[#1f2937] text-white' : 'text-slate-400 hover:bg-[#1f2937]/50'}`}
            >
              <Info className="h-4 w-4 mr-1" />
              <span className="whitespace-nowrap">Básico</span>
            </button>
            <button 
              onClick={() => setActiveTab('conteudosAutomaticos')} 
              className={`flex items-center px-3 py-2 rounded-md ${activeTab === 'conteudosAutomaticos' ? 'bg-[#1f2937] text-white' : 'text-slate-400 hover:bg-[#1f2937]/50'}`}
            >
              <LibraryBig className="h-4 w-4 mr-1" />
              <span className="whitespace-nowrap">Conteúdos</span>
            </button>
            <button 
              onClick={() => setActiveTab('status')} 
              className={`flex items-center px-3 py-2 rounded-md ${activeTab === 'status' ? 'bg-[#1f2937] text-white' : 'text-slate-400 hover:bg-[#1f2937]/50'}`}
            >
              <Activity className="h-4 w-4 mr-1" />
              <span className="whitespace-nowrap">Status</span>
            </button>
          </div>
        </div>
        
        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 min-h-[500px] max-h-[60vh] overflow-y-auto">
            {/* Básico Tab */}
            {activeTab === 'basico' && (
              <div className="space-y-4 min-h-[460px]">
                <div className="space-y-2">
                  <label htmlFor="nome" className="block text-sm font-medium text-slate-300">Nome da Empresa <span className="text-red-400">*</span></label>
                  <input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Ex: Empresa ABC"
                    required
                    className={`w-full px-3 py-2 bg-[#101820] border ${formErrors.nome ? 'border-red-500' : 'border-[#1f2937]/40'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#4338CA]`}
                  />
                  {formErrors.nome && (
                    <div className="text-xs text-red-500 mt-1 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {formErrors.nome}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="descricao" className="block text-sm font-medium text-slate-300">Descrição</label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    placeholder="Uma breve descrição da empresa"
                    className="w-full px-3 py-2 bg-[#101820] border border-[#1f2937]/40 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#4338CA]"
                    rows={2}
                  ></textarea>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="contexto" className="block text-sm font-medium text-slate-300">Contexto da Empresa</label>
                  <textarea
                    id="contexto"
                    name="contexto"
                    value={formData.contexto}
                    onChange={handleChange}
                    placeholder="Descrição detalhada sobre a empresa, seus produtos, serviços e público-alvo"
                    className="w-full px-3 py-2 bg-[#101820] border border-[#1f2937]/40 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#4338CA]"
                    rows={7}
                  ></textarea>
                </div>
                
                
              </div>
            )}
            
            {/* Conteúdos Automáticos Tab */}
            {activeTab === 'conteudosAutomaticos' && (
              <div className="space-y-4 min-h-[460px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <h3 className="text-base font-medium text-white">Conteúdos Automáticos</h3>
                    <div className="relative ml-2 group">
                      <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                      <div className="absolute hidden group-hover:block z-10 w-64 p-2 text-xs bg-[#1f2937] text-slate-300 rounded shadow-lg -left-8 top-6">
                        Respostas pré-definidas para perguntas frequentes sobre a empresa.
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleAddConteudo}
                    className="px-3 py-1 bg-[#101820] text-white border border-[#1f2937]/40 rounded-md hover:bg-[#1f2937]/50 focus:outline-none flex items-center text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Conteúdo
                  </button>
                </div>
                
                {formData.conteudosAutomaticos.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-[#1f2937]/60 rounded-md">
                    <p className="text-slate-500">Nenhum conteúdo automático adicionado</p>
                    <p className="text-xs text-slate-600 mt-1">Clique em "Adicionar Conteúdo" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.conteudosAutomaticos.map((conteudo, index) => (
                      <div 
                        key={index} 
                        className="p-4 rounded-md bg-[#101820] border border-[#1f2937]/40"
                      >
                        <div className="flex justify-between mb-3">
                          <h4 className="text-sm font-medium text-white">Conteúdo {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveConteudo(index)}
                            className="text-red-500 hover:text-red-400 focus:outline-none"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-300">Tipo de Conteúdo <span className="text-red-400">*</span></label>
                            <input
                              value={conteudo.tipo}
                              onChange={(e) => handleConteudoChange(index, 'tipo', e.target.value)}
                              placeholder="Ex: horario_atendimento, endereco, politica_devolucao"
                              className={`w-full mt-1 px-3 py-2 bg-[#0f1621] border ${formErrors[`conteudo_${index}_tipo`] ? 'border-red-500' : 'border-[#1f2937]/40'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#4338CA]`}
                            />
                            {formErrors[`conteudo_${index}_tipo`] && (
                              <div className="text-xs text-red-500 mt-1 flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {formErrors[`conteudo_${index}_tipo`]}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-slate-300">Resposta <span className="text-red-400">*</span></label>
                            <textarea
                              value={conteudo.resposta}
                              onChange={(e) => handleConteudoChange(index, 'resposta', e.target.value)}
                              placeholder="Texto completo da resposta automática"
                              className={`w-full mt-1 px-3 py-2 bg-[#0f1621] border ${formErrors[`conteudo_${index}_resposta`] ? 'border-red-500' : 'border-[#1f2937]/40'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#4338CA]`}
                              rows={4}
                            ></textarea>
                            {formErrors[`conteudo_${index}_resposta`] && (
                              <div className="text-xs text-red-500 mt-1 flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {formErrors[`conteudo_${index}_resposta`]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="pt-2 text-sm text-slate-400">
                  <p>
                    Conteúdos automáticos são respostas pré-definidas para perguntas frequentes dos clientes.
                    A IA detectará automaticamente quando usar cada conteúdo com base no tipo definido.
                  </p>
                </div>
              </div>
            )}
            
            {/* Status Tab */}
            {activeTab === 'status' && (
              <div className="space-y-4 min-h-[460px]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="ativo" className="block text-sm font-medium text-slate-300">Status da Empresa</label>
                    <div 
                      className={`w-12 h-6 rounded-full relative ${formData.ativo ? 'bg-[#4338CA]' : 'bg-[#1f2937]/40'} transition-colors duration-200 cursor-pointer`}
                      onClick={handleSwitchChange}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${formData.ativo ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-400">
                    {formData.ativo 
                      ? 'A empresa está ativa e recebendo conversas.'
                      : 'A empresa está inativa e não receberá novas conversas.'}
                  </div>
                </div>
                
                <div className="p-4 rounded-md bg-[#101820] border border-[#1f2937]/40 mt-6">
                  <h4 className="text-white mb-2 font-medium">Nota de Funcionamento</h4>
                  <p className="text-sm text-slate-400">
                    Empresas inativas ainda aparecem no fluxo, mas com visual reduzido e não recebem novas conversas.
                    Todos os setores associados à empresa inativa também serão considerados inativos.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-[#1f2937]/40 flex items-center justify-end space-x-3">
            {!isNew && (
              <button 
                type="button" 
                onClick={handleDeleteClick}
                className="px-4 py-2 bg-[#101820] text-red-500 border border-[#1f2937]/40 rounded-md hover:bg-red-900/20 hover:text-red-400 focus:outline-none flex items-center mr-auto"
                disabled={isSaving || isDeleting}
              >
                <Trash className="h-4 w-4 mr-2" />
                Excluir
              </button>
            )}
            <button 
              type="button" 
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 bg-[#101820] text-slate-300 border border-[#1f2937]/40 rounded-md hover:bg-[#1f2937]/50 focus:outline-none"
              disabled={isSaving || isDeleting}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-md focus:outline-none"
              disabled={isSaving || isDeleting}
            >
              {isSaving 
                ? 'Salvando...' 
                : isNew ? 'Criar Empresa' : (hasChanged ? 'Salvar Alterações' : 'Salvar')
              }
            </button>
          </div>
        </form>
      </div>
      
      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-[#070b11]/80">
          <div className="bg-[#0f1621] border border-[#1f2937]/40 rounded-lg text-white w-full max-w-[400px] shadow-lg p-4">
            <h3 className="text-xl font-bold text-white mb-2">Excluir Empresa</h3>
            <p className="text-sm text-slate-400 mb-6">
              Tem certeza que deseja excluir a empresa "{empresa?.nome}"? Esta ação não pode ser desfeita e afetará todos os setores associados.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 bg-[#101820] text-slate-300 border border-[#1f2937]/40 rounded-md hover:bg-[#1f2937]/50 focus:outline-none"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md focus:outline-none flex items-center"
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}