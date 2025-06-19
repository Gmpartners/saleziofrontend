import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash, Plus, ArrowRightCircle, Target, ListCheck, Info, Building, MessageSquare, Activity, HelpCircle } from 'lucide-react';

export function SectorModal({
  open,
  onOpenChange,
  sector,
  onSave,
  onDelete,
  isNew = true,
  isSaving = false,
  isDeleting = false,
  empresas = []
}) {
  const normalizeEmpresaId = (empresaId) => {
    if (!empresaId) return '';
    
    if (typeof empresaId === 'object' && empresaId !== null) {
      const id = empresaId.empresaId || empresaId._id || empresaId.id || '';
      return id;
    }
    
    return String(empresaId);
  };

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    contexto: '',
    ativo: true,
    empresaId: '',
    setorId: '',
    responsavel: '',
    transferencia: {
      metodo: 'visivel',
      mensagem: 'Transferindo para atendimento especializado'
    },
    lacunas: [],
    objetivos: []
  });

  const [formErrors, setFormErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basics');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (sector) {
      const normalizedEmpresaId = normalizeEmpresaId(sector.empresaId);
      
      const sectorData = JSON.parse(JSON.stringify({
        id: sector.id || sector.setorId || sector._id,
        _id: sector._id,
        setorId: sector.setorId || sector.id || sector._id,
        nome: sector.nome || '',
        descricao: sector.descricao || '',
        contexto: sector.contexto || '',
        responsavel: sector.responsavel || '',
        ativo: sector.ativo !== false,
        empresaId: normalizedEmpresaId,
        transferencia: sector.transferencia || {
          metodo: 'visivel',
          mensagem: 'Transferindo para atendimento especializado'
        },
        position: sector.position || { x: 0, y: 0 },
        lacunas: sector.lacunas || [],
        objetivos: sector.objetivos || []
      }));
      
      setFormData(sectorData);
    } else {
      const defaultEmpresaId = empresas.length > 0 ? (empresas[0].id || empresas[0].empresaId) : '';
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      
      setFormData({
        nome: '',
        descricao: '',
        contexto: '',
        responsavel: '',
        ativo: true,
        empresaId: defaultEmpresaId,
        setorId: isNew ? `SET${timestamp}${random}` : '',
        transferencia: {
          metodo: 'visivel',
          mensagem: 'Transferindo para atendimento especializado'
        },
        position: { x: 0, y: 0 },
        lacunas: [],
        objetivos: []
      });
    }
    
    setFormErrors({});
    setActiveTab('basics');
    setHasChanged(false);
  }, [sector, open, empresas, isNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }
      
      return newData;
    });
    
    setHasChanged(true);
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSwitchChange = () => {
    setFormData(prev => {
      const newData = {
        ...prev,
        ativo: !prev.ativo
      };
      
      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }
      
      return newData;
    });
    
    setHasChanged(true);
  };

  const handleEmpresaChange = (e) => {
    const value = e.target.value;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        empresaId: value
      };
      
      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }
      
      return newData;
    });
    
    setHasChanged(true);
    
    if (formErrors.empresaId) {
      setFormErrors(prev => ({
        ...prev,
        empresaId: null
      }));
    }
  };

  const handleTransferenciaChange = (metodo) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        transferencia: {
          ...prev.transferencia,
          metodo
        }
      };
      
      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }
      
      return newData;
    });
    
    setHasChanged(true);
  };

  const handleTransferenciaMensagemChange = (e) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        transferencia: {
          ...prev.transferencia,
          mensagem: e.target.value
        }
      };
      
      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }
      
      return newData;
    });
    
    setHasChanged(true);
  };

  const handleAddLacuna = () => {
    setFormData(prev => {
      const newData = {
        ...prev,
        lacunas: [
          ...prev.lacunas,
          {
            nome: '',
            descricao: '',
            obrigatoria: true,
            prioridade: prev.lacunas.length + 1
          }
        ]
      };

      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }

      return newData;
    });

    setHasChanged(true);
  };

  const handleLacunaChange = (index, field, value) => {
    setFormData(prev => {
      const newLacunas = [...prev.lacunas];
      newLacunas[index] = {
        ...newLacunas[index],
        [field]: value
      };

      const newData = {
        ...prev,
        lacunas: newLacunas
      };

      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }

      return newData;
    });

    setHasChanged(true);
    
    if (formErrors[`lacuna_${index}_${field}`]) {
      setFormErrors(prev => ({
        ...prev,
        [`lacuna_${index}_${field}`]: null
      }));
    }
  };

  const handleRemoveLacuna = (index) => {
    setFormData(prev => {
      const newLacunas = [...prev.lacunas];
      newLacunas.splice(index, 1);
      
      // Reordenar prioridades
      newLacunas.forEach((lacuna, i) => {
        lacuna.prioridade = i + 1;
      });

      const newData = {
        ...prev,
        lacunas: newLacunas
      };

      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }

      return newData;
    });

    setHasChanged(true);
  };

  const handleAddObjetivo = () => {
    setFormData(prev => {
      const newData = {
        ...prev,
        objetivos: [
          ...prev.objetivos,
          {
            nome: '',
            descricao: '',
            lacunasNecessarias: []
          }
        ]
      };

      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }

      return newData;
    });

    setHasChanged(true);
  };

  const handleObjetivoChange = (index, field, value) => {
    setFormData(prev => {
      const newObjetivos = [...prev.objetivos];
      newObjetivos[index] = {
        ...newObjetivos[index],
        [field]: value
      };

      const newData = {
        ...prev,
        objetivos: newObjetivos
      };

      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }

      return newData;
    });

    setHasChanged(true);
    
    if (formErrors[`objetivo_${index}_${field}`]) {
      setFormErrors(prev => ({
        ...prev,
        [`objetivo_${index}_${field}`]: null
      }));
    }
  };

  const handleLacunasNecessariasChange = (objetivoIndex, lacunaNome) => {
    setFormData(prev => {
      const newObjetivos = [...prev.objetivos];
      const objetivo = newObjetivos[objetivoIndex];
      
      if (!objetivo) return prev;
      
      if (objetivo.lacunasNecessarias.includes(lacunaNome)) {
        objetivo.lacunasNecessarias = objetivo.lacunasNecessarias.filter(nome => nome !== lacunaNome);
      } else {
        objetivo.lacunasNecessarias = [...objetivo.lacunasNecessarias, lacunaNome];
      }

      const newData = {
        ...prev,
        objetivos: newObjetivos
      };

      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }

      return newData;
    });

    setHasChanged(true);
  };

  const handleRemoveObjetivo = (index) => {
    setFormData(prev => {
      const newObjetivos = [...prev.objetivos];
      newObjetivos.splice(index, 1);

      const newData = {
        ...prev,
        objetivos: newObjetivos
      };

      if (sector && sector.id) {
        newData.id = sector.id;
        newData.setorId = sector.id;
      }

      return newData;
    });

    setHasChanged(true);
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;
    
    if (!formData.nome || !formData.nome.trim()) {
      errors.nome = 'Nome do setor é obrigatório';
      isValid = false;
    }
    
    if (!formData.responsavel || !formData.responsavel.trim()) {
      errors.responsavel = 'Nome do responsável é obrigatório';
      isValid = false;
    }
    
    if (empresas.length > 0 && (!formData.empresaId || formData.empresaId === '')) {
      if (empresas[0] && (empresas[0].id || empresas[0].empresaId)) {
        const empresaId = empresas[0].id || empresas[0].empresaId;
        setFormData(prev => ({
          ...prev,
          empresaId: empresaId
        }));
      } else {
        errors.empresaId = 'Selecione uma empresa';
        isValid = false;
      }
    }
    
    if (formData.transferencia.metodo === 'visivel' && 
        (!formData.transferencia.mensagem || !formData.transferencia.mensagem.trim())) {
      errors.transferencia_mensagem = 'A mensagem de transferência é obrigatória quando o método é visível';
      isValid = false;
    }
    
    formData.lacunas.forEach((lacuna, index) => {
      if (!lacuna.nome || !lacuna.nome.trim()) {
        errors[`lacuna_${index}_nome`] = 'Nome da lacuna é obrigatório';
        isValid = false;
      }
      if (!lacuna.descricao || !lacuna.descricao.trim()) {
        errors[`lacuna_${index}_descricao`] = 'Descrição da lacuna é obrigatória';
        isValid = false;
      }
    });
    
    formData.objetivos.forEach((objetivo, index) => {
      if (!objetivo.nome || !objetivo.nome.trim()) {
        errors[`objetivo_${index}_nome`] = 'Nome do objetivo é obrigatório';
        isValid = false;
      }
      if (!objetivo.descricao || !objetivo.descricao.trim()) {
        errors[`objetivo_${index}_descricao`] = 'Descrição do objetivo é obrigatória';
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
      if (formErrors.nome || formErrors.responsavel) {
        setActiveTab('basics');
      } else if (formErrors.empresaId) {
        setActiveTab('empresa');
      } else if (formErrors.transferencia_mensagem) {
        setActiveTab('transferencia');
      } else if (Object.keys(formErrors).some(key => key.startsWith('triagem_'))) {
        setActiveTab('triagem');
      } else if (Object.keys(formErrors).some(key => key.startsWith('objetivo_'))) {
        setActiveTab('objetivos');
      }
      return;
    }
    
    const sectorData = JSON.parse(JSON.stringify(formData));
    
    if (sector && !isNew) {
      sectorData.id = sector.id || sector.setorId || sector._id;
      sectorData.setorId = sector.setorId || sector.id || sector._id;
      if (sector._id) sectorData._id = sector._id;
    }
    
    if (typeof sectorData.empresaId === 'object' && sectorData.empresaId !== null) {
      sectorData.empresaId = sectorData.empresaId.empresaId || 
                           sectorData.empresaId._id || 
                           sectorData.empresaId.id || '';
    }
    
    if (!sectorData.transferencia || typeof sectorData.transferencia !== 'object') {
      sectorData.transferencia = {
        metodo: 'visivel',
        mensagem: 'Transferindo para atendimento especializado'
      };
    } else if (!sectorData.transferencia.metodo) {
      sectorData.transferencia.metodo = 'visivel';
    }
    
    if (!Array.isArray(sectorData.lacunas)) {
      sectorData.lacunas = [];
    }
    
    if (!Array.isArray(sectorData.objetivos)) {
      sectorData.objetivos = [];
    }
    
    onSave(sectorData);
  };
  
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete && sector && !isNew) {
      onDelete(sector.id || sector.setorId || sector._id);
    }
    setDeleteDialogOpen(false);
  };

  const hasEmpresas = empresas && empresas.length > 0;
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-[#070b11]/80">
      <div className="bg-[#0f1621] border border-[#1f2937]/40 rounded-lg text-white w-full max-w-[700px] max-h-[90vh] overflow-auto shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-[#1f2937]/40">
          <h2 className="text-xl font-bold text-white">
            {isNew ? 'Criar Novo Setor' : 'Editar Setor'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isNew 
              ? 'Adicione um novo setor de atendimento ao fluxo.' 
              : 'Modifique as informações do setor de atendimento.'}
          </p>
        </div>
        
        {/* Tabs Navigation */}
        <div className="bg-[#101820] border-b border-[#1f2937]/40 px-1">
          <div className="flex overflow-x-auto py-1 gap-1 text-sm">
            <button 
              onClick={() => setActiveTab('basics')} 
              className={`flex items-center px-3 py-2 rounded-md ${activeTab === 'basics' ? 'bg-[#1f2937] text-white' : 'text-slate-400 hover:bg-[#1f2937]/50'}`}
            >
              <Info className="h-4 w-4 mr-1" />
              <span className="whitespace-nowrap">Básico</span>
            </button>
            <button 
              onClick={() => setActiveTab('empresa')} 
              className={`flex items-center px-3 py-2 rounded-md ${activeTab === 'empresa' ? 'bg-[#1f2937] text-white' : 'text-slate-400 hover:bg-[#1f2937]/50'}`}
            >
              <Building className="h-4 w-4 mr-1" />
              <span className="whitespace-nowrap">Empresa</span>
            </button>
            <button 
              onClick={() => setActiveTab('context')} 
              className={`flex items-center px-3 py-2 rounded-md ${activeTab === 'context' ? 'bg-[#1f2937] text-white' : 'text-slate-400 hover:bg-[#1f2937]/50'}`}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              <span className="whitespace-nowrap">Contexto</span>
            </button>
            <button 
              onClick={() => setActiveTab('triagem')} 
              className={`flex items-center px-3 py-2 rounded-md ${activeTab === 'triagem' ? 'bg-[#1f2937] text-white' : 'text-slate-400 hover:bg-[#1f2937]/50'}`}
            >
              <ListCheck className="h-4 w-4 mr-1" />
              <span className="whitespace-nowrap">Triagem</span>
            </button>
            <button 
              onClick={() => setActiveTab('objetivos')} 
              className={`flex items-center px-3 py-2 rounded-md ${activeTab === 'objetivos' ? 'bg-[#1f2937] text-white' : 'text-slate-400 hover:bg-[#1f2937]/50'}`}
            >
              <Target className="h-4 w-4 mr-1" />
              <span className="whitespace-nowrap">Objetivos</span>
            </button>
            <button 
              onClick={() => setActiveTab('transferencia')} 
              className={`flex items-center px-3 py-2 rounded-md ${activeTab === 'transferencia' ? 'bg-[#1f2937] text-white' : 'text-slate-400 hover:bg-[#1f2937]/50'}`}
            >
              <ArrowRightCircle className="h-4 w-4 mr-1" />
              <span className="whitespace-nowrap">Transfer.</span>
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
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {/* Basic Tab */}
            {activeTab === 'basics' && (
              <div className="space-y-4 min-h-[460px]">
                <div className="space-y-2">
                  <label htmlFor="nome" className="block text-sm font-medium text-slate-300">Nome do Setor <span className="text-red-400">*</span></label>
                  <input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Ex: Suporte Técnico"
                    required
                    className={`w-full px-3 py-2 bg-[#101820] border ${formErrors.nome ? 'border-red-500' : 'border-[#1f2937]/40'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#FF8F00]`}
                  />
                  {formErrors.nome && (
                    <div className="text-xs text-red-500 mt-1 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {formErrors.nome}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="descricao" className="block text-sm font-medium text-slate-300">Descrição Breve</label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    placeholder="Uma breve descrição do setor"
                    className="w-full px-3 py-2 bg-[#101820] border border-[#1f2937]/40 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#FF8F00]"
                    rows={2}
                  ></textarea>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="responsavel" className="block text-sm font-medium text-slate-300">Responsável <span className="text-red-400">*</span></label>
                  <input
                    id="responsavel"
                    name="responsavel"
                    value={formData.responsavel}
                    onChange={handleChange}
                    placeholder="Nome do responsável pelo setor"
                    required
                    className={`w-full px-3 py-2 bg-[#101820] border ${formErrors.responsavel ? 'border-red-500' : 'border-[#1f2937]/40'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#FF8F00]`}
                  />
                  {formErrors.responsavel && (
                    <div className="text-xs text-red-500 mt-1 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {formErrors.responsavel}
                    </div>
                  )}
                </div>
                
                <div className="pt-2 text-sm text-slate-400">
                  <p>
                    Preencha estas informações básicas para identificar o setor.
                    Use a aba "Contexto" para configurar como a IA irá entender e direcionar conversas para este setor.
                  </p>
                </div>
              </div>
            )}
            
            {/* Empresa Tab */}
            {activeTab === 'empresa' && (
              <div className="space-y-4 min-h-[460px]">
                <div className="space-y-2">
                  <label htmlFor="empresaId" className="block text-sm font-medium text-slate-300">
                    Empresa Relacionada 
                    {hasEmpresas && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  
                  {hasEmpresas ? (
                    <>
                      <select
                        id="empresaId"
                        value={formData.empresaId}
                        onChange={handleEmpresaChange}
                        className={`w-full px-3 py-2 bg-[#101820] border ${formErrors.empresaId ? 'border-red-500' : 'border-[#1f2937]/40'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#FF8F00]`}
                      >
                        <option value="">Selecione uma empresa</option>
                        {empresas.map((empresa) => (
                          <option key={empresa.id || empresa.empresaId} value={empresa.id || empresa.empresaId}>
                            {empresa.nome}
                          </option>
                        ))}
                      </select>
                      {formErrors.empresaId && (
                        <div className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {formErrors.empresaId}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-[#101820] border border-amber-500/50 rounded-md p-4 text-sm text-amber-400">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Nenhuma empresa disponível. Recomendamos criar uma empresa antes de criar um setor.
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          onOpenChange(false);
                        }}
                        className="px-4 py-2 bg-[#101820] text-indigo-400 border border-[#1f2937]/40 rounded-md hover:bg-[#1f2937]/50 focus:outline-none flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar uma Empresa
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="pt-2 text-sm text-slate-400">
                  <p>
                    É recomendado associar este setor a uma empresa. Esta associação permite organizar 
                    o fluxo de atendimento corretamente.
                  </p>
                </div>
                
                {formData.empresaId && (
                  <div className="p-4 rounded-md bg-[#101820] border border-[#1f2937]/40 mt-6">
                    <h4 className="text-white mb-2 font-medium">Hierarquia de Atendimento</h4>
                    <p className="text-sm text-slate-400">
                      Quando associado a uma empresa, o atendimento seguirá o fluxo: 
                      IA → Empresa → Setor. Isso permite agrupar setores relacionados.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Context Tab */}
            {activeTab === 'context' && (
              <div className="space-y-4 min-h-[460px]">
                <div className="space-y-2">
                  <label htmlFor="contexto" className="block text-sm font-medium text-slate-300">Contexto do Setor</label>
                  <textarea
                    id="contexto"
                    name="contexto"
                    value={formData.contexto}
                    onChange={handleChange}
                    placeholder="Descreva detalhadamente os casos que devem ser direcionados para este setor. Inclua exemplos, palavras-chave importantes e situações típicas."
                    className="w-full px-3 py-2 bg-[#101820] border border-[#1f2937]/40 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#FF8F00]"
                    rows={12}
                  ></textarea>
                </div>
                
                <div className="pt-2 text-sm text-slate-400">
                  <p>
                    O contexto do setor é fundamental para a IA entender quando direcionar conversas para este setor.
                    Seja específico e abrangente, incluindo exemplos de casos típicos e atípicos.
                  </p>
                </div>
              </div>
            )}
            
            {/* Lacunas Tab */}
            {activeTab === 'triagem' && (
              <div className="space-y-4 min-h-[460px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <h3 className="text-base font-medium text-white">Perguntas de Triagem</h3>
                    <div className="relative ml-2 group">
                      <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                      <div className="absolute hidden group-hover:block z-10 w-64 p-2 text-xs bg-[#1f2937] text-slate-300 rounded shadow-lg -left-8 top-6">
                        Perguntas que a IA deve fazer ao cliente antes de definir o objetivo da conversa.
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleAddLacuna}
                    className="px-3 py-1 bg-[#101820] text-white border border-[#1f2937]/40 rounded-md hover:bg-[#1f2937]/50 focus:outline-none flex items-center text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Pergunta
                  </button>
                </div>
                
                {formData.lacunas.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-[#1f2937]/60 rounded-md">
                    <p className="text-slate-500">Nenhuma pergunta de triagem adicionada</p>
                    <p className="text-xs text-slate-600 mt-1">Clique em "Adicionar Pergunta" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.lacunas.map((lacuna, index) => (
                      <div 
                        key={index} 
                        className="p-4 rounded-md bg-[#101820] border border-[#1f2937]/40"
                      >
                        <div className="flex justify-between mb-3">
                          <h4 className="text-sm font-medium text-white">Pergunta {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveLacuna(index)}
                            className="text-red-500 hover:text-red-400 focus:outline-none"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-300">Texto do Campo<span className="text-red-400">*</span></label>
                            <input
                              value={lacuna.nome}
                              onChange={(e) => handleLacunaChange(index, 'nome', e.target.value)}
                              placeholder="Ex: nome_completo, cpf, descricao_problema"
                              className={`w-full mt-1 px-3 py-2 bg-[#0f1621] border ${formErrors[`lacuna_${index}_nome`] ? 'border-red-500' : 'border-[#1f2937]/40'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#FF8F00]`}
                            />
                            {formErrors[`lacuna_${index}_nome`] && (
                              <div className="text-xs text-red-500 mt-1 flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {formErrors[`lacuna_${index}_nome`]}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-slate-300">Descrição interna <span className="text-red-400">*</span></label>
                            <input
                              value={lacuna.descricao}
                              onChange={(e) => handleLacunaChange(index, 'descricao', e.target.value)}
                              placeholder="Ex: Nome completo do cliente"
                              className={`w-full mt-1 px-3 py-2 bg-[#0f1621] border ${formErrors[`lacuna_${index}_descricao`] ? 'border-red-500' : 'border-[#1f2937]/40'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#FF8F00]`}
                            />
                            {formErrors[`lacuna_${index}_descricao`] && (
                              <div className="text-xs text-red-500 mt-1 flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {formErrors[`lacuna_${index}_descricao`]}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <label className="text-sm text-slate-400">Obrigatória</label>
                              <div 
                                className={`w-10 h-5 rounded-full relative ${lacuna.obrigatoria ? 'bg-[#FF8F00]' : 'bg-[#1f2937]/40'} transition-colors duration-200 cursor-pointer`}
                                onClick={() => handleLacunaChange(index, 'obrigatoria', !lacuna.obrigatoria)}
                              >
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${lacuna.obrigatoria ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <label className="text-sm text-slate-400">Prioridade:</label>
                              <input
                                type="number"
                                min="1"
                                value={lacuna.prioridade}
                                onChange={(e) => handleLacunaChange(index, 'prioridade', parseInt(e.target.value))}
                                className="w-16 px-3 py-1 bg-[#0f1621] border border-[#1f2937]/40 rounded-md text-white text-center focus:outline-none focus:ring-1 focus:ring-[#FF8F00]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="pt-2 text-sm text-slate-400">
                  <p>
                    As perguntas de triagem são feitas automaticamente pela IA durante a conversa. Use a prioridade para definir
                    a ordem em que as perguntas serão feitas ao cliente.
                  </p>
                </div>
              </div>
            )}
            
            {/* Objetivos Tab */}
            {activeTab === 'objetivos' && (
              <div className="space-y-4 min-h-[460px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <h3 className="text-base font-medium text-white">Objetivos do Cliente</h3>
                    <div className="relative ml-2 group">
                      <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                      <div className="absolute hidden group-hover:block z-10 w-64 p-2 text-xs bg-[#1f2937] text-slate-300 rounded shadow-lg -left-8 top-6">
                        Objetivos representam as intenções do cliente que a IA deve identificar para direcionar o atendimento.
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleAddObjetivo}
                    className="px-3 py-1 bg-[#101820] text-white border border-[#1f2937]/40 rounded-md hover:bg-[#1f2937]/50 focus:outline-none flex items-center text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Objetivo
                  </button>
                </div>
                
                {formData.objetivos.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-[#1f2937]/60 rounded-md">
                    <p className="text-slate-500">Nenhum objetivo adicionado</p>
                    <p className="text-xs text-slate-600 mt-1">Clique em "Adicionar Objetivo" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.objetivos.map((objetivo, index) => (
                      <div 
                        key={index} 
                        className="p-4 rounded-md bg-[#101820] border border-[#1f2937]/40"
                      >
                        <div className="flex justify-between mb-3">
                          <h4 className="text-sm font-medium text-white">Objetivo {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveObjetivo(index)}
                            className="text-red-500 hover:text-red-400 focus:outline-none"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-300">Nome do Objetivo <span className="text-red-400">*</span></label>
                            <input
                              value={objetivo.nome}
                              onChange={(e) => handleObjetivoChange(index, 'nome', e.target.value)}
                              placeholder="Ex: resolver_problema, agendar_visita"
                              className={`w-full mt-1 px-3 py-2 bg-[#0f1621] border ${formErrors[`objetivo_${index}_nome`] ? 'border-red-500' : 'border-[#1f2937]/40'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#FF8F00]`}
                            />
                            {formErrors[`objetivo_${index}_nome`] && (
                              <div className="text-xs text-red-500 mt-1 flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {formErrors[`objetivo_${index}_nome`]}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-slate-300">Descrição <span className="text-red-400">*</span></label>
                            <input
                              value={objetivo.descricao}
                              onChange={(e) => handleObjetivoChange(index, 'descricao', e.target.value)}
                              placeholder="Ex: Cliente está com um problema para resolver"
                              className={`w-full mt-1 px-3 py-2 bg-[#0f1621] border ${formErrors[`objetivo_${index}_descricao`] ? 'border-red-500' : 'border-[#1f2937]/40'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#FF8F00]`}
                            />
                            {formErrors[`objetivo_${index}_descricao`] && (
                              <div className="text-xs text-red-500 mt-1 flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {formErrors[`objetivo_${index}_descricao`]}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-slate-300">Lacunas Necessárias</label>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {formData.lacunas.length > 0 ? (
                                formData.lacunas.map((lacuna, lacunaIndex) => (
                                  <div key={lacunaIndex} className="flex items-center space-x-2">
                                    <div 
                                      className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${objetivo.lacunasNecessarias?.includes(lacuna.nome) ? 'bg-[#FF8F00] border-[#FF8F00]' : 'border-[#1f2937]'}`}
                                      onClick={() => handleLacunasNecessariasChange(index, lacuna.nome)}
                                    >
                                      {objetivo.lacunasNecessarias?.includes(lacuna.nome) && (
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M8.33334 2.5L3.75 7.08333L1.66667 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      )}
                                    </div>
                                    <label 
                                      className="text-sm text-slate-300 cursor-pointer"
                                      onClick={() => handleLacunasNecessariasChange(index, lacuna.nome)}
                                    >
                                      {lacuna.nome}
                                    </label>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-2 text-xs text-slate-400">
                                  Nenhuma lacuna definida. Adicione lacunas na aba "Lacunas".
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="pt-2 text-sm text-slate-400">
                  <p>
                    Objetivos representam as intenções ou necessidades do cliente. A IA usará estes objetivos para
                    determinar como direcionar o atendimento no setor.
                  </p>
                </div>
              </div>
            )}
            
            {/* Transferencia Tab */}
            {activeTab === 'transferencia' && (
              <div className="space-y-4 min-h-[460px]">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Método de Transferência</label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer ${
                          formData.transferencia.metodo === 'visivel' 
                            ? 'border-[#FF8F00]' 
                            : 'border-[#1f2937]/40'
                        }`}
                        onClick={() => handleTransferenciaChange('visivel')}
                      >
                        {formData.transferencia.metodo === 'visivel' && (
                          <div className="w-3 h-3 rounded-full bg-[#FF8F00]"></div>
                        )}
                      </div>
                      <span className="text-white">Visível</span>
                      <span className="text-xs text-slate-400">(Cliente é notificado sobre a transferência)</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer ${
                          formData.transferencia.metodo === 'invisivel' 
                            ? 'border-[#FF8F00]' 
                            : 'border-[#1f2937]/40'
                        }`}
                        onClick={() => handleTransferenciaChange('invisivel')}
                      >
                        {formData.transferencia.metodo === 'invisivel' && (
                          <div className="w-3 h-3 rounded-full bg-[#FF8F00]"></div>
                        )}
                      </div>
                      <span className="text-white">Invisível</span>
                      <span className="text-xs text-slate-400">(Cliente é transferido sem notificação explícita)</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="mensagemTransferencia" className="block text-sm font-medium text-slate-300">
                    Mensagem de Transferência
                    {formData.transferencia.metodo === 'visivel' && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <textarea
                    id="mensagemTransferencia"
                    value={formData.transferencia.mensagem}
                    onChange={handleTransferenciaMensagemChange}
                    placeholder="Mensagem exibida ao cliente durante a transferência"
                    className={`w-full px-3 py-2 bg-[#101820] border ${
                      formErrors.transferencia_mensagem ? 'border-red-500' : 'border-[#1f2937]/40'
                    } rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#FF8F00]`}
                    rows={3}
                    disabled={formData.transferencia.metodo !== 'visivel'}
                  ></textarea>
                  {formErrors.transferencia_mensagem && (
                    <div className="text-xs text-red-500 mt-1 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {formErrors.transferencia_mensagem}
                    </div>
                  )}
                  <p className="text-xs text-slate-400">
                    Esta mensagem será exibida apenas se o método for "Visível"
                  </p>
                </div>
                
                <div className="pt-2 text-sm text-slate-400 mt-4">
                  <p>
                    Configure como o cliente será transferido para este setor. O método "Visível" é mais transparente,
                    enquanto o "Invisível" é mais discreto.
                  </p>
                </div>
              </div>
            )}
            
            {/* Status Tab */}
            {activeTab === 'status' && (
              <div className="space-y-4 min-h-[460px]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="ativo" className="block text-sm font-medium text-slate-300">Status do Setor</label>
                    <div 
                      className={`w-12 h-6 rounded-full relative ${formData.ativo ? 'bg-[#FF8F00]' : 'bg-[#1f2937]/40'} transition-colors duration-200 cursor-pointer`}
                      onClick={handleSwitchChange}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${formData.ativo ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">
                    {formData.ativo 
                      ? 'O setor está ativo e recebendo conversas.'
                      : 'O setor está inativo e não receberá novas conversas.'}
                  </div>
                </div>
                
                <div className="p-4 rounded-md bg-[#101820] border border-[#1f2937]/40 mt-6">
                  <h4 className="text-white mb-2 font-medium">Nota de Funcionamento</h4>
                  <p className="text-sm text-slate-400">
                    Setores inativos ainda aparecem no fluxo, mas com visual reduzido e não recebem novas conversas.
                    Conversas existentes continuam disponíveis para consulta.
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
              className="px-4 py-2 bg-[#FF8F00] hover:bg-[#FF6F00] text-black rounded-md focus:outline-none"
              disabled={isSaving || isDeleting}
            >
              {isSaving 
                ? 'Salvando...' 
                : isNew ? 'Criar Setor' : (hasChanged ? 'Salvar Alterações' : 'Salvar')
              }
            </button>
          </div>
        </form>
      </div>
      
      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-[#070b11]/80">
          <div className="bg-[#0f1621] border border-[#1f2937]/40 rounded-lg text-white w-full max-w-[400px] shadow-lg p-4">
            <h3 className="text-xl font-bold text-white mb-2">Excluir Setor</h3>
            <p className="text-sm text-slate-400 mb-6">
              Tem certeza que deseja excluir o setor "{sector?.nome}"? Esta ação não pode ser desfeita.
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