import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Bot, Settings, Network, BrainCircuit, Plus, RefreshCw, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FlowWithProvider from './Sectors/SectorFlow';
import IAConfigPanel from '@/node/IAConfigPanel';
import { SectorModal } from './Sectors/SectorModal';
import { EmpresaModal } from './Sectors/EmpresaModal';
import { multiflowApi } from '@/services/multiflowApi';
import { useAuthContext } from '@/hooks/useAuthContext';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter
} from "@/components/ui/sheet";

// Função de log avançada para debug
const debugLog = (component, action, data) => {
  console.log(`[DEBUG][${component}][${action}]`, data);
};

const FlowOrchestratorPage = () => {
  console.log("⚡ FlowOrchestratorPage renderizado");
  
  const [activeTab, setActiveTab] = useState('flow');
  const [sectorModalOpen, setSectorModalOpen] = useState(false);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  const [isNewSector, setIsNewSector] = useState(true);
  const [isNewEmpresa, setIsNewEmpresa] = useState(true);
  const [currentSector, setCurrentSector] = useState(null);
  const [currentEmpresa, setCurrentEmpresa] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flowConfig, setFlowConfig] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nodePositions, setNodePositions] = useState({});
  const [renderCount, setRenderCount] = useState(0); // Estado para rastrear renderizações
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const flowRef = useRef(null);
  const { userProfile, isAdmin } = useAuthContext();

  // Detectar se é dispositivo móvel
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Aumentar contador de renderização a cada render
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    debugLog("FlowOrchestratorPage", "render-count", renderCount);
  }, []);

  // Logar alterações na tab ativa
  useEffect(() => {
    debugLog("FlowOrchestratorPage", "tab-change", activeTab);
  }, [activeTab]);

  const fetchData = async (forceRefresh = false) => {
    debugLog("FlowOrchestratorPage", "fetchData-start", { forceRefresh, userId: userProfile?.id });
    
    try {
      setLoading(true);
      
      let sectorsResponse, empresasResponse;
      
      try {
        debugLog("FlowOrchestratorPage", "api-request-start", { action: "getSetores+getEmpresas" });
        
        [sectorsResponse, empresasResponse] = await Promise.all([
          multiflowApi.getSetores(userProfile?.id, isAdmin),
          multiflowApi.getEmpresas(userProfile?.id, isAdmin)
        ]);
        
        debugLog("FlowOrchestratorPage", "api-response-received", {
          sectorsSuccess: sectorsResponse.success,
          empresasSuccess: empresasResponse.success
        });
      } catch (error) {
        console.error('Erro ao buscar dados básicos:', error);
        debugLog("FlowOrchestratorPage", "api-request-error", { message: error.message, stack: error.stack });
        
        toast.error('Erro ao carregar dados básicos', {
          description: error.message
        });
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      if (sectorsResponse.success) {
        const formattedSectors = sectorsResponse.data.map(sector => ({
          id: sector.setorId || sector._id,
          setorId: sector.setorId || sector._id,
          userId: sector.userId,
          nome: sector.nome,
          descricao: sector.descricao,
          contexto: sector.contexto || '',
          responsavel: sector.responsavel,
          ativo: sector.ativo !== false,
          position: sector.position || { x: 0, y: 0 },
          empresaId: sector.empresaId || '',
          perguntasTriagem: sector.perguntasTriagem || [],
          transferencia: sector.transferencia || {
            metodo: 'visivel',
            mensagem: 'Transferindo para atendimento especializado'
          },
          lacunas: sector.lacunas || [],
          objetivos: sector.objetivos || []
        }));
        
        debugLog("FlowOrchestratorPage", "sectors-processed", { count: formattedSectors.length });
        setSectors(formattedSectors);
      } else {
        debugLog("FlowOrchestratorPage", "sectors-error", sectorsResponse.error);
        toast.error('Erro ao carregar setores', {
          description: sectorsResponse.error
        });
      }
      
      if (empresasResponse.success) {
        const formattedEmpresas = empresasResponse.data.map(empresa => ({
          id: empresa.empresaId || empresa._id,
          empresaId: empresa.empresaId || empresa._id,
          userId: empresa.userId,
          nome: empresa.nome,
          descricao: empresa.descricao,
          contexto: empresa.contexto || '',
          horarioFuncionamento: empresa.horarioFuncionamento || 'Segunda a Sexta, 9h às 18h',
          ativo: empresa.ativo !== false,
          position: empresa.position || { x: 0, y: 0 },
          conteudosAutomaticos: empresa.conteudosAutomaticos || []
        }));
        
        debugLog("FlowOrchestratorPage", "empresas-processed", { count: formattedEmpresas.length });
        setEmpresas(formattedEmpresas);
      } else {
        debugLog("FlowOrchestratorPage", "empresas-error", empresasResponse.error);
        toast.error('Erro ao carregar empresas', {
          description: empresasResponse.error
        });
      }
      
      const localStorageConfig = localStorage.getItem('localFlowConfig');
      let loadedConfig = null;
      
      if (localStorageConfig && !forceRefresh) {
        try {
          loadedConfig = JSON.parse(localStorageConfig);
          debugLog("FlowOrchestratorPage", "localStorage-config-loaded", { configLength: JSON.stringify(loadedConfig).length });
        } catch (e) {
          debugLog("FlowOrchestratorPage", "localStorage-parse-error", { error: e.message });
          console.error('Erro ao ler configuração local:', e);
        }
      }
      
      if (!loadedConfig || forceRefresh) {
        debugLog("FlowOrchestratorPage", "creating-new-config", { reason: !loadedConfig ? "no-config" : "force-refresh" });
        
        const setoresFormatados = sectorsResponse.success ? sectorsResponse.data : [];
        const empresasFormatadas = empresasResponse.success ? empresasResponse.data : [];
        
        loadedConfig = {
          userId: userProfile?.id,
          sectors: setoresFormatados.map((sector, index) => ({
            id: sector.setorId || sector._id,
            setorId: sector.setorId || sector._id,
            nome: sector.nome,
            descricao: sector.descricao,
            responsavel: sector.responsavel,
            ativo: sector.ativo !== false,
            position: sector.position || { x: 100 + (index * 300), y: 420 },
            empresaId: sector.empresaId,
            perguntasTriagem: sector.perguntasTriagem || [],
            transferencia: sector.transferencia || { metodo: 'visivel' },
            lacunas: sector.lacunas || [],
            objetivos: sector.objetivos || []
          })),
          empresas: empresasFormatadas.map((empresa, index) => ({
            id: empresa.empresaId || empresa._id,
            empresaId: empresa.empresaId || empresa._id,
            nome: empresa.nome,
            descricao: empresa.descricao,
            ativo: empresa.ativo !== false,
            position: empresa.position || { x: 150 + (index * 350), y: 250 },
            conteudosAutomaticos: empresa.conteudosAutomaticos || []
          })),
          edges: [],
          knowledgeNodes: [],
          nodePositions: {}
        };
        
        const extractedPositions = {};
        
        setoresFormatados.forEach(sector => {
          if (sector.position) {
            extractedPositions[sector.setorId || sector._id] = sector.position;
          }
        });
        
        empresasFormatadas.forEach(empresa => {
          if (empresa.position) {
            extractedPositions[`empresa-${empresa.empresaId || empresa._id}`] = empresa.position;
          }
        });
        
        if (Object.keys(extractedPositions).length > 0) {
          loadedConfig.nodePositions = extractedPositions;
        }
        
        const savedPositions = localStorage.getItem('flowNodePositions');
        if (savedPositions && !forceRefresh) {
          try {
            const parsedPositions = JSON.parse(savedPositions);
            loadedConfig.nodePositions = {
              ...loadedConfig.nodePositions,
              ...parsedPositions
            };
            debugLog("FlowOrchestratorPage", "position-loaded", { positionCount: Object.keys(parsedPositions).length });
          } catch (e) {
            debugLog("FlowOrchestratorPage", "position-parse-error", { error: e.message });
            console.error('Erro ao ler posições salvas:', e);
          }
        }
        
        localStorage.setItem('localFlowConfig', JSON.stringify(loadedConfig));
        debugLog("FlowOrchestratorPage", "localStorage-config-saved", { configSize: JSON.stringify(loadedConfig).length });
      }
      
      setFlowConfig(loadedConfig);
      
      if (loadedConfig && loadedConfig.nodePositions) {
        setNodePositions(loadedConfig.nodePositions);
        debugLog("FlowOrchestratorPage", "node-positions-set", { count: Object.keys(loadedConfig.nodePositions).length });
      }
    } catch (error) {
      console.error('Erro geral ao carregar dados:', error);
      debugLog("FlowOrchestratorPage", "fetchData-error", { message: error.message, stack: error.stack });
      
      toast.error('Erro ao carregar dados', {
        description: error.message
      });
    } finally {
      debugLog("FlowOrchestratorPage", "fetchData-complete", { loading: false, refreshing: false });
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Efeito principal de carregamento de dados
  useEffect(() => {
    debugLog("FlowOrchestratorPage", "main-useEffect", { userProfileId: userProfile?.id, isAdmin });
    
    if (userProfile?.id) {
      fetchData();
    }
  }, [userProfile?.id, isAdmin]);

  const handleRefresh = () => {
    debugLog("FlowOrchestratorPage", "refresh-requested", { currentTab: activeTab });
    setRefreshing(true);
    fetchData(true);
  };

  const handleTabChange = (tabName) => {
    debugLog("FlowOrchestratorPage", "tab-change-requested", { from: activeTab, to: tabName });
    setActiveTab(tabName);
    setMenuOpen(false);
  };

  const handleAddSector = (empresaId = null) => {
    debugLog("FlowOrchestratorPage", "add-sector-requested", { empresaId });
    
    if (empresas.length === 0) {
      debugLog("FlowOrchestratorPage", "no-empresas-warning");
      toast.warning('Você precisa criar uma empresa primeiro', {
        description: 'Recomendamos criar uma empresa antes de adicionar setores.'
      });
      handleAddEmpresa();
      return;
    }
    
    const defaultEmpresaId = empresaId || (empresas.length > 0 ? empresas[0].id : '');
    
    setCurrentSector({
      empresaId: defaultEmpresaId,
      lacunas: [],
      objetivos: []
    });
    setIsNewSector(true);
    setSectorModalOpen(true);
  };

  const handleEditSector = (sector) => {
    debugLog("FlowOrchestratorPage", "edit-sector-requested", { sectorId: sector?.id, sectorName: sector?.nome });
    setCurrentSector(sector);
    setIsNewSector(false);
    setSectorModalOpen(true);
  };
  
  const handleAddEmpresa = () => {
    debugLog("FlowOrchestratorPage", "add-empresa-requested");
    setCurrentEmpresa({
      conteudosAutomaticos: []
    });
    setIsNewEmpresa(true);
    setEmpresaModalOpen(true);
  };

  const handleEditEmpresa = (empresa) => {
    debugLog("FlowOrchestratorPage", "edit-empresa-requested", { empresaId: empresa?.id, empresaName: empresa?.nome });
    setCurrentEmpresa(empresa);
    setIsNewEmpresa(false);
    setEmpresaModalOpen(true);
  };

  const handleSaveSector = async (sectorData) => {
    debugLog("FlowOrchestratorPage", "save-sector-start", { isNew: isNewSector, sectorName: sectorData?.nome });
    
    try {
      setSaving(true);
      
      const sectorToSave = JSON.parse(JSON.stringify(sectorData));
      
      let normalizedEmpresaId = sectorToSave.empresaId;
      if (typeof normalizedEmpresaId === 'object' && normalizedEmpresaId !== null) {
        normalizedEmpresaId = normalizedEmpresaId.empresaId || normalizedEmpresaId._id || normalizedEmpresaId.id || '';
      }
      
      debugLog("FlowOrchestratorPage", "empresa-id-normalized", { originalId: sectorToSave.empresaId, normalizedId: normalizedEmpresaId });
      sectorToSave.empresaId = normalizedEmpresaId;
      
      if (normalizedEmpresaId) {
        try {
          debugLog("FlowOrchestratorPage", "verifying-empresa", { empresaId: normalizedEmpresaId });
          const empresaCheck = await multiflowApi.getEmpresaById(normalizedEmpresaId, userProfile?.id, isAdmin);
          
          if (!empresaCheck.success) {
            debugLog("FlowOrchestratorPage", "empresa-not-found", { error: empresaCheck.error });
            toast.error('Erro: empresa não encontrada', {
              description: `A empresa com ID ${normalizedEmpresaId} não existe ou não está acessível.`
            });
            setSaving(false);
            return;
          }
          
          debugLog("FlowOrchestratorPage", "empresa-found", { name: empresaCheck.data.nome });
        } catch (error) {
          debugLog("FlowOrchestratorPage", "empresa-verify-error", { error: error.message });
        }
      }
      
      if (empresas.length > 0 && !normalizedEmpresaId) {
        debugLog("FlowOrchestratorPage", "empresa-required-error");
        toast.error('Por favor selecione uma empresa', {
          description: 'Selecione uma empresa válida para este setor.'
        });
        setSaving(false);
        return;
      }
      
      if (isNewSector) {
        debugLog("FlowOrchestratorPage", "creating-new-sector");
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        
        const position = sectorToSave.position || { x: sectors.length * 300, y: 150 };
        
        const payload = {
          ...sectorToSave,
          empresaId: normalizedEmpresaId,
          setorId: `SET${timestamp}${random}`,
          position,
          lacunas: sectorToSave.lacunas || [],
          objetivos: sectorToSave.objetivos || []
        };
        
        debugLog("FlowOrchestratorPage", "create-sector-payload", payload);
        
        const response = await multiflowApi.createSetor(payload, userProfile?.id, isAdmin);
        debugLog("FlowOrchestratorPage", "create-sector-response", { success: response.success, error: response.error });
        
        if (response.success) {
          const createdSector = {
            ...payload,
            id: response.data.setorId || response.data._id
          };
          
          multiflowApi.resetCache('setores');
          
          setSectors(prev => [...prev, createdSector]);
          
          if (flowRef.current && flowRef.current.addSector) {
            flowRef.current.addSector(createdSector);
            
            setTimeout(() => {
              if (flowRef.current.fitView) {
                flowRef.current.fitView();
              }
            }, 100);
          }
          
          setNodePositions(prev => ({
            ...prev,
            [createdSector.id]: createdSector.position
          }));
          
          toast.success('Setor adicionado com sucesso!');
          setSectorModalOpen(false);
        } else {
          toast.error('Erro ao adicionar setor', {
            description: response.error || 'Falha ao comunicar com o servidor'
          });
        }
      } else {
        debugLog("FlowOrchestratorPage", "updating-existing-sector", { sectorId: sectorToSave.id });
        const sectorPosition = nodePositions[sectorToSave.id] || sectorToSave.position || { x: 0, y: 0 };
        
        const sectorId = sectorToSave.id;
        
        const fullSectorData = {
          id: sectorId,
          setorId: sectorId,
          nome: sectorToSave.nome,
          descricao: sectorToSave.descricao,
          contexto: sectorToSave.contexto || '',
          ativo: sectorToSave.ativo !== false,
          empresaId: normalizedEmpresaId,
          position: sectorPosition,
          perguntasTriagem: sectorToSave.perguntasTriagem || [],
          transferencia: sectorToSave.transferencia || {
            metodo: 'visivel',
            mensagem: 'Transferindo para atendimento especializado'
          },
          lacunas: sectorToSave.lacunas || [],
          objetivos: sectorToSave.objetivos || []
        };
        
        debugLog("FlowOrchestratorPage", "update-sector-payload", fullSectorData);
        
        try {
          multiflowApi.resetCache('setores');
          
          const basicResponse = await multiflowApi.updateSetor(
            sectorId,
            {
              nome: fullSectorData.nome,
              descricao: fullSectorData.descricao,
              ativo: fullSectorData.ativo
            },
            userProfile?.id,
            isAdmin
          );
          
          debugLog("FlowOrchestratorPage", "basic-update-response", { success: basicResponse.success });
          
          const detailedResponse = await multiflowApi.updateSetorDetalhado(
            sectorId, 
            fullSectorData,
            userProfile?.id,
            isAdmin
          );
          
          debugLog("FlowOrchestratorPage", "detailed-update-response", { success: detailedResponse.success });
          
          const response = detailedResponse.success ? detailedResponse : basicResponse;
          
          if (response.success) {
            try {
              await multiflowApi.updateSetor(
                sectorId,
                {
                  nome: fullSectorData.nome,
                  descricao: fullSectorData.descricao
                },
                userProfile?.id,
                isAdmin
              );
            } catch (err) {
              debugLog("FlowOrchestratorPage", "final-name-update-error", { error: err.message });
            }
            
            const updatedSector = {
              ...fullSectorData,
              id: sectorId,
              setorId: sectorId,
              nome: fullSectorData.nome,
              descricao: fullSectorData.descricao,
              ativo: fullSectorData.ativo !== false,
              empresaId: normalizedEmpresaId
            };
            
            setSectors(prev => prev.map(s => s.id === sectorId ? {...updatedSector} : s));
            
            if (flowRef.current && flowRef.current.updateSector) {
              setTimeout(() => {
                flowRef.current.updateSector(sectorId, {...updatedSector});
              }, 100);
            }
            
            multiflowApi.resetCache('setores');
            
            toast.success('Setor atualizado com sucesso!');
            setSectorModalOpen(false);
            
            setTimeout(async () => {
              try {
                const verifyResponse = await multiflowApi.getSetorById(sectorId, userProfile?.id, isAdmin);
                debugLog("FlowOrchestratorPage", "verification-after-update", { 
                  success: verifyResponse.success,
                  expectedName: fullSectorData.nome,
                  actualName: verifyResponse.data?.nome
                });
                
                if (verifyResponse.success) {
                  if (verifyResponse.data.nome !== fullSectorData.nome ||
                      verifyResponse.data.descricao !== fullSectorData.descricao) {
                      
                    debugLog("FlowOrchestratorPage", "name-mismatch-detected", { 
                      expected: fullSectorData.nome,
                      actual: verifyResponse.data.nome
                    });
                    
                    try {
                      await multiflowApi.updateSetor(
                        sectorId,
                        {
                          nome: fullSectorData.nome,
                          descricao: fullSectorData.descricao,
                          ativo: fullSectorData.ativo
                        },
                        userProfile?.id,
                        isAdmin
                      );
                    } catch (e) {
                      debugLog("FlowOrchestratorPage", "final-update-attempt-error", { error: e.message });
                    }
                    
                    setSectors(prev => prev.map(s => s.id === sectorId ? 
                      { 
                        ...s, 
                        nome: fullSectorData.nome,
                        descricao: fullSectorData.descricao
                      } : s
                    ));
                    
                    if (flowRef.current && flowRef.current.updateSector) {
                      flowRef.current.updateSector(sectorId, {
                        ...fullSectorData,
                        nome: fullSectorData.nome,
                        descricao: fullSectorData.descricao
                      });
                    }
                  }
                }
              } catch (err) {
                debugLog("FlowOrchestratorPage", "verification-error", { error: err.message });
              }
            }, 1000);
          } else {
            debugLog("FlowOrchestratorPage", "update-failed", { error: response.error });
            toast.error('Erro ao atualizar setor', {
              description: response.error || 'Falha ao comunicar com o servidor'
            });
          }
        } catch (error) {
          debugLog("FlowOrchestratorPage", "update-sector-error", { error: error.message, stack: error.stack });
          toast.error('Ocorreu um erro ao salvar o setor', {
            description: error.message || 'Erro na comunicação com o servidor'
          });
        }
      }
    } catch (error) {
      debugLog("FlowOrchestratorPage", "save-sector-error", { error: error.message, stack: error.stack });
      toast.error('Ocorreu um erro ao salvar o setor', {
        description: error.message || 'Verifique se todos os campos obrigatórios estão preenchidos'
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteSector = async (sectorId) => {
    debugLog("FlowOrchestratorPage", "delete-sector-requested", { sectorId });
    
    try {
      setDeleting(true);
      
      const response = await multiflowApi.deleteSetor(sectorId, userProfile?.id, isAdmin);
      debugLog("FlowOrchestratorPage", "delete-sector-response", { success: response.success });
      
      if (response.success) {
        setSectors(prev => prev.filter(s => s.id !== sectorId));
        
        if (flowRef.current) {
          flowRef.current.removeSector && flowRef.current.removeSector(sectorId);
          flowRef.current.fitView && flowRef.current.fitView();
        }
        
        toast.success('Setor excluído com sucesso!');
        setSectorModalOpen(false);
      } else {
        toast.error('Erro ao excluir setor', {
          description: response.error
        });
      }
    } catch (error) {
      debugLog("FlowOrchestratorPage", "delete-sector-error", { error: error.message });
      toast.error('Ocorreu um erro ao excluir o setor', {
        description: error.message
      });
    } finally {
      setDeleting(false);
    }
  };
  
  const handleSaveEmpresa = async (empresaData) => {
    debugLog("FlowOrchestratorPage", "save-empresa-start", { isNew: isNewEmpresa, empresaName: empresaData?.nome });
    
    try {
      setSaving(true);
      
      if (isNewEmpresa) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const empresaId = `EMP${timestamp}${random}`;
        
        const position = empresaData.position || { x: empresas.length * 350 + 150, y: 250 };
        
        const newEmpresa = {
          ...empresaData,
          empresaId: empresaId,
          position: position,
          conteudosAutomaticos: empresaData.conteudosAutomaticos || []
        };
        
        debugLog("FlowOrchestratorPage", "create-empresa-payload", newEmpresa);
        
        const response = await multiflowApi.createEmpresa(newEmpresa, userProfile?.id, isAdmin);
        debugLog("FlowOrchestratorPage", "create-empresa-response", { success: response.success });
        
        if (response.success) {
          const createdEmpresa = {
            ...newEmpresa,
            id: response.data.empresaId || response.data._id || empresaId
          };
          
          setEmpresas(prev => [...prev, createdEmpresa]);
          
          if (flowRef.current && flowRef.current.addEmpresa) {
            flowRef.current.addEmpresa(createdEmpresa);
            
            // Garantir que edges sejam atualizados explicitamente
            setTimeout(() => {
              flowRef.current.forceUpdateEdges && flowRef.current.forceUpdateEdges();
              flowRef.current.fitView && flowRef.current.fitView();
            }, 200);
          }
          
          const nodeId = `empresa-${createdEmpresa.id}`;
          setNodePositions(prev => ({
            ...prev,
            [nodeId]: createdEmpresa.position
          }));
          
          toast.success('Empresa adicionada com sucesso!');
        } else {
          toast.error('Erro ao adicionar empresa', {
            description: response.error || 'Erro ao processar requisição'
          });
        }
      } else {
        const nodeId = `empresa-${currentEmpresa.id}`;
        const empresaPosition = nodePositions[nodeId] || currentEmpresa.position || { x: 0, y: 0 };
        
        const updatedEmpresa = {
          ...currentEmpresa,
          ...empresaData,
          position: empresaPosition,
          conteudosAutomaticos: empresaData.conteudosAutomaticos || []
        };
        
        if (!updatedEmpresa.empresaId) {
          updatedEmpresa.empresaId = updatedEmpresa.id || `EMP${Date.now()}${Math.floor(Math.random() * 1000)}`;
        }
        
        debugLog("FlowOrchestratorPage", "update-empresa-payload", updatedEmpresa);
        
        const response = await multiflowApi.updateEmpresa(
          updatedEmpresa.id,
          updatedEmpresa,
          userProfile?.id,
          isAdmin
        );
        
        debugLog("FlowOrchestratorPage", "update-empresa-response", { success: response.success });
        
        if (response.success) {
          setEmpresas(prev => 
            prev.map(e => e.id === updatedEmpresa.id ? updatedEmpresa : e)
          );
          
          if (flowRef.current && flowRef.current.updateEmpresa) {
            flowRef.current.updateEmpresa(updatedEmpresa.id, updatedEmpresa);
          }
          
          toast.success('Empresa atualizada com sucesso!');
          
          if (flowRef.current && flowRef.current.forceUpdateEdges) {
            setTimeout(() => {
              flowRef.current.forceUpdateEdges();
            }, 200);
          }
        } else {
          toast.error('Erro ao atualizar empresa', {
            description: response.error
          });
        }
      }
    } catch (error) {
      debugLog("FlowOrchestratorPage", "save-empresa-error", { error: error.message, stack: error.stack });
      toast.error('Ocorreu um erro ao salvar a empresa', {
        description: error.message || 'Erro ao processar requisição'
      });
    } finally {
      setSaving(false);
      setEmpresaModalOpen(false);
    }
  };
  
  const handleDeleteEmpresa = async (empresaId) => {
    debugLog("FlowOrchestratorPage", "delete-empresa-requested", { empresaId });
    
    try {
      setDeleting(true);
      
      const response = await multiflowApi.deleteEmpresa(empresaId, userProfile?.id, isAdmin);
      debugLog("FlowOrchestratorPage", "delete-empresa-response", { success: response.success });
      
      if (response.success) {
        setEmpresas(prev => prev.filter(e => e.id !== empresaId));
        
        setSectors(prev => prev.map(sector => {
          if (sector.empresaId === empresaId) {
            return { ...sector, empresaId: '' };
          }
          return sector;
        }));
        
        if (flowRef.current) {
          flowRef.current.removeEmpresa && flowRef.current.removeEmpresa(empresaId);
          flowRef.current.fitView && flowRef.current.fitView();
          
          if (flowRef.current.forceUpdateEdges) {
            setTimeout(() => {
              flowRef.current.forceUpdateEdges();
            }, 200);
          }
        }
        
        toast.success('Empresa excluída com sucesso!');
        setEmpresaModalOpen(false);
      } else {
        toast.error('Erro ao excluir empresa', {
          description: response.error
        });
      }
    } catch (error) {
      debugLog("FlowOrchestratorPage", "delete-empresa-error", { error: error.message });
      toast.error('Ocorreu um erro ao excluir a empresa', {
        description: error.message
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveFlow = async (flowData) => {
    debugLog("FlowOrchestratorPage", "save-flow-start", { 
      edgesCount: flowData?.edges?.length,
      sectorsCount: sectors.length,
      empresasCount: empresas.length
    });
    
    try {
      setSaving(true);
      
      if (flowRef.current && flowRef.current.saveCurrentState) {
        const currentState = flowRef.current.saveCurrentState();
        debugLog("FlowOrchestratorPage", "flow-current-state", { stateSize: JSON.stringify(currentState).length });
      }
      
      const allNodePositions = { ...(flowData?.nodePositions || {}) };
      
      sectors.forEach(sector => {
        const sectorKey = sector.setorId || sector.id;
        if (!allNodePositions[sectorKey]) {
          allNodePositions[sectorKey] = sector.position || { x: 0, y: 0 };
        }
      });
      
      empresas.forEach(empresa => {
        const empresaKey = empresa.empresaId || empresa.id;
        const empresaNodeId = `empresa-${empresaKey}`;
        if (!allNodePositions[empresaNodeId]) {
          allNodePositions[empresaNodeId] = empresa.position || { x: 0, y: 0 };
        }
      });
      
      const localFlowConfig = {
        userId: userProfile?.id,
        sectors: sectors.map(sector => {
          const sectorKey = sector.setorId || sector.id;
          const position = allNodePositions[sectorKey] || sector.position || { x: 0, y: 0 };
          
          return {
            ...sector,
            id: sectorKey,
            setorId: sector.setorId || sector.id,
            position,
            lacunas: sector.lacunas || [],
            objetivos: sector.objetivos || []
          };
        }),
        empresas: empresas.map(empresa => {
          const empresaKey = empresa.empresaId || empresa.id;
          const empresaNodeId = `empresa-${empresaKey}`;
          const position = allNodePositions[empresaNodeId] || empresa.position || { x: 0, y: 0 };
          
          return {
            ...empresa,
            id: empresaKey,
            empresaId: empresa.empresaId || empresa.id,
            position,
            conteudosAutomaticos: empresa.conteudosAutomaticos || []
          };
        }),
        edges: flowData?.edges || [],
        knowledgeNodes: flowData?.knowledgeNodes || [],
        nodePositions: allNodePositions,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('localFlowConfig', JSON.stringify(localFlowConfig));
      localStorage.setItem('flowNodePositions', JSON.stringify(allNodePositions));
      
      debugLog("FlowOrchestratorPage", "flow-saved-to-localStorage", { 
        configSize: JSON.stringify(localFlowConfig).length,
        positionsCount: Object.keys(allNodePositions).length
      });
      
      setNodePositions(allNodePositions);
      
      toast.success('Fluxo salvo com sucesso!');
      
      const sectorsToUpdate = flowData?.updatedSectors || [];
      
      if (sectorsToUpdate.length > 0) {
        debugLog("FlowOrchestratorPage", "updating-sector-associations", { count: sectorsToUpdate.length });
        
        for (const update of sectorsToUpdate) {
          const { sectorId, empresaId } = update;
          
          const sectorToUpdate = sectors.find(s => s.id === sectorId);
          if (sectorToUpdate) {
            try {
              const response = await multiflowApi.updateSetorDetalhado(
                sectorId,
                { ...sectorToUpdate, empresaId },
                userProfile?.id,
                isAdmin
              );
              
              debugLog("FlowOrchestratorPage", "sector-association-update", { 
                sectorId, empresaId, success: response.success 
              });
              
              if (response.success) {
                setSectors(prev => 
                  prev.map(s => s.id === sectorId ? { ...s, empresaId } : s)
                );
              } else {
                console.error(`Erro ao atualizar setor ${sectorId}:`, response.error);
              }
            } catch (error) {
              debugLog("FlowOrchestratorPage", "sector-association-error", { 
                sectorId, error: error.message 
              });
            }
          }
        }
      }
      
      // Atualizar posições dos setores
      debugLog("FlowOrchestratorPage", "updating-sector-positions", { count: localFlowConfig.sectors.length });
      for (const sector of localFlowConfig.sectors) {
        const sectorId = sector.id || sector.setorId;
        if (sectorId && allNodePositions[sectorId]) {
          try {
            const updatedSector = {
              ...sector,
              position: allNodePositions[sectorId]
            };
            
            if (updatedSector.id !== updatedSector.setorId) {
              updatedSector.setorId = updatedSector.id;
            }
            
            const response = await multiflowApi.updateSetorDetalhado(
              sectorId,
              updatedSector,
              userProfile?.id,
              isAdmin
            );
            
            debugLog("FlowOrchestratorPage", "sector-position-update", { 
              sectorId, position: allNodePositions[sectorId], success: response.success 
            });
          } catch (error) {
            debugLog("FlowOrchestratorPage", "sector-position-error", { 
              sectorId, error: error.message 
            });
          }
        }
      }
      
      // Atualizar posições das empresas
      debugLog("FlowOrchestratorPage", "updating-empresa-positions", { count: localFlowConfig.empresas.length });
      for (const empresa of localFlowConfig.empresas) {
        const empresaId = empresa.id || empresa.empresaId;
        if (empresaId) {
          const nodeId = `empresa-${empresaId}`;
          if (allNodePositions[nodeId]) {
            try {
              const updatedEmpresa = {
                ...empresa,
                position: allNodePositions[nodeId]
              };
              
              if (updatedEmpresa.id !== updatedEmpresa.empresaId) {
                updatedEmpresa.empresaId = updatedEmpresa.id;
              }
              
              const response = await multiflowApi.updateEmpresa(
                empresaId,
                updatedEmpresa,
                userProfile?.id,
                isAdmin
              );
              
              debugLog("FlowOrchestratorPage", "empresa-position-update", { 
                empresaId, position: allNodePositions[nodeId], success: response.success 
              });
            } catch (error) {
              debugLog("FlowOrchestratorPage", "empresa-position-error", { 
                empresaId, error: error.message 
              });
            }
          }
        }
      }
    } catch (error) {
      debugLog("FlowOrchestratorPage", "save-flow-error", { error: error.message, stack: error.stack });
      console.error('Erro ao salvar fluxo:', error);
      toast.error('Falha ao salvar fluxo', {
        description: error.message || 'Ocorreu um erro ao processar a requisição'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b11]">
      <Helmet>
        <title>Orquestrador de IA | Salezio</title>
      </Helmet>
      
      <header className="bg-[#0f1621] border-b border-[#1f2937]/40 p-3 sm:p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-[#FF8F00]/10 p-2 rounded-full border border-[#FF8F00]/20">
              <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-[#FF8F00]" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF8F00] to-[#FF6F00]">
                Orquestrador de IA
              </span>
            </h1>
          </div>
          
          {/* Versão Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex text-[#FF8F00] hover:bg-[#1f2937]/20"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden md:flex text-[#FF8F00] hover:bg-[#1f2937]/20"
              onClick={() => console.log("DebugInfo", { 
                renderCount, 
                activeTab, 
                loading, 
                sectorsCount: sectors.length,
                empresasCount: empresas.length 
              })}
            >
              <Settings className="mr-2 h-4 w-4" />
              Debug Info
            </Button>
          </div>
          
          {/* Versão Mobile - Menu Hambúrguer */}
          <div className="md:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-300 hover:text-white hover:bg-[#1f2937]/20"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#0f1621] border-l border-[#1f2937]/40 p-4">
                <SheetHeader>
                  <SheetTitle className="text-white">Menu</SheetTitle>
                  <SheetDescription className="text-slate-400">
                    Opções do orquestrador de IA
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-4">
                  <Button 
                    variant="outline" 
                    className={activeTab === 'flow' 
                      ? "w-full justify-start bg-[#1f2937] text-white border-[#1f2937]" 
                      : "w-full justify-start bg-[#101820] text-slate-300 border-[#1f2937]/40"
                    }
                    onClick={() => handleTabChange('flow')}
                  >
                    <Network className="mr-2 h-4 w-4" />
                    Fluxo de Atendimento
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className={activeTab === 'ia' 
                      ? "w-full justify-start bg-[#1f2937] text-white border-[#1f2937]" 
                      : "w-full justify-start bg-[#101820] text-slate-300 border-[#1f2937]/40"
                    }
                    onClick={() => handleTabChange('ia')}
                  >
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Configuração da IA
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-[#101820] text-[#FF8F00] border-[#1f2937]/40"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
                  </Button>
                </div>
                
                {activeTab === 'flow' && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-white font-medium">Ações de Fluxo</h3>
                    <Button
                      onClick={handleAddEmpresa}
                      className="w-full justify-start bg-[#4338CA] hover:bg-[#3730A3] text-white"
                      size="sm"
                      disabled={loading || saving || deleting}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Empresa
                    </Button>
                    <Button
                      onClick={() => handleAddSector()}
                      className="w-full justify-start bg-[#FF8F00] hover:bg-[#FF6F00] text-black"
                      size="sm"
                      disabled={loading || saving || deleting}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Setor
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-3 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Orquestração de Atendimento</h2>
              <p className="text-slate-400 mt-1 text-sm sm:text-base">
                Configure como a IA direciona os atendimentos entre os diferentes setores
              </p>
            </div>
            
            {/* Abas - Versão Desktop */}
            <div className="hidden md:flex gap-2">
              <Button 
                variant={activeTab === 'flow' ? 'default' : 'outline'} 
                onClick={() => handleTabChange('flow')}
                className={activeTab === 'flow' 
                  ? "bg-[#1f2937] text-white border-[#1f2937] hover:bg-[#1f2937]/90" 
                  : "bg-[#101820] text-slate-300 border-[#1f2937]/40 hover:bg-[#1f2937]/50"
                }
                size="sm"
              >
                <Network className="mr-2 h-4 w-4" />
                Fluxo
              </Button>
              <Button 
                variant={activeTab === 'ia' ? 'default' : 'outline'} 
                onClick={() => handleTabChange('ia')}
                className={activeTab === 'ia' 
                  ? "bg-[#1f2937] text-white border-[#1f2937] hover:bg-[#1f2937]/90" 
                  : "bg-[#101820] text-slate-300 border-[#1f2937]/40 hover:bg-[#1f2937]/50"
                }
                size="sm"
              >
                <BrainCircuit className="mr-2 h-4 w-4" />
                IA
              </Button>
            </div>
            
            {/* Abas - Versão Mobile */}
            <div className="flex md:hidden gap-1">
              <Button 
                variant={activeTab === 'flow' ? 'default' : 'outline'} 
                onClick={() => handleTabChange('flow')}
                className={activeTab === 'flow' 
                  ? "flex-1 bg-[#1f2937] text-white border-[#1f2937] hover:bg-[#1f2937]/90 text-xs px-2" 
                  : "flex-1 bg-[#101820] text-slate-300 border-[#1f2937]/40 hover:bg-[#1f2937]/50 text-xs px-2"
                }
                size="sm"
              >
                <Network className="mr-1 h-3 w-3" />
                Fluxo
              </Button>
              <Button 
                variant={activeTab === 'ia' ? 'default' : 'outline'} 
                onClick={() => handleTabChange('ia')}
                className={activeTab === 'ia' 
                  ? "flex-1 bg-[#1f2937] text-white border-[#1f2937] hover:bg-[#1f2937]/90 text-xs px-2" 
                  : "flex-1 bg-[#101820] text-slate-300 border-[#1f2937]/40 hover:bg-[#1f2937]/50 text-xs px-2"
                }
                size="sm"
              >
                <BrainCircuit className="mr-1 h-3 w-3" />
                IA
              </Button>
            </div>
          </div>
        </div>

        {activeTab === 'flow' && (
          <div className="flex justify-between items-center gap-2 mb-3">
            <Button
              onClick={handleRefresh}
              className="md:hidden bg-[#101820] text-[#FF8F00] border border-[#1f2937]/40"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            
            <div className="flex gap-2 ml-auto">
              <Button
                onClick={handleAddEmpresa}
                className="bg-[#4338CA] hover:bg-[#3730A3] text-white shadow-sm text-xs sm:text-sm"
                size="sm"
                disabled={loading || saving || deleting}
              >
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {isMobile ? 'Empresa' : 'Nova Empresa'}
              </Button>
              <Button
                onClick={() => handleAddSector()}
                className="bg-[#FF8F00] hover:bg-[#FF6F00] text-black shadow-sm text-xs sm:text-sm"
                size="sm"
                disabled={loading || saving || deleting}
              >
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {isMobile ? 'Setor' : 'Novo Setor'}
              </Button>
            </div>
          </div>
        )}
        
        <div className="transition-all duration-300">
          {activeTab === 'flow' ? (
            <div className="bg-[#0f1621] rounded-lg shadow-panel border border-[#1f2937]/40 overflow-hidden h-[65vh] sm:h-[75vh]">
              <FlowWithProvider 
                ref={flowRef}
                externalSectors={sectors}
                externalEmpresas={empresas}
                initialFlowConfig={flowConfig}
                onEditSector={handleEditSector}
                onEditEmpresa={handleEditEmpresa}
                onAddSector={handleAddSector}
                onAddEmpresa={handleAddEmpresa}
                onSaveFlow={handleSaveFlow}
                isLoading={loading}
                isSaving={saving}
              />
            </div>
          ) : (
            <IAConfigPanel 
              key={`ia-panel-${renderCount}`}
              debugMode={true}
            />
          )}
        </div>
        
        <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-slate-400 bg-[#0f1621] border border-[#1f2937]/40 p-3 sm:p-4 rounded-lg shadow-md">
          <p className="flex flex-col sm:flex-row sm:gap-1 items-start sm:items-center">
            {activeTab === 'flow' ? (
              <>
                <span className="font-medium text-white">Como usar o Fluxo:</span>
                <span>Arraste linhas para conectar elementos. Para adicionar itens, use os botões no topo. Posicione elementos arrastando-os pelo fluxo.</span>
              </>
            ) : (
              <>
                <span className="font-medium text-white">Como usar a Configuração da IA:</span>
                <span>Personalize as instruções base da IA para definir como ela deve direcionar os atendimentos.</span>
              </>
            )}
          </p>
        </div>
        
        <SectorModal
          open={sectorModalOpen}
          onOpenChange={setSectorModalOpen}
          sector={currentSector}
          onSave={handleSaveSector}
          onDelete={handleDeleteSector}
          isNew={isNewSector}
          isSaving={saving}
          isDeleting={deleting}
          empresas={empresas}
        />
        
        <EmpresaModal
          open={empresaModalOpen}
          onOpenChange={setEmpresaModalOpen}
          empresa={currentEmpresa}
          onSave={handleSaveEmpresa}
          onDelete={handleDeleteEmpresa}
          isNew={isNewEmpresa}
          isSaving={saving}
          isDeleting={deleting}
        />
      </main>

      <footer className="bg-[#0f1621] border-t border-[#1f2937]/40 p-3 sm:p-4 mt-auto">
        <div className="container mx-auto text-xs sm:text-sm text-slate-500 text-center">
          Salezio - Sistema de orquestração de fluxos de atendimento com IA © 2025
        </div>
      </footer>
    </div>
  );
};

export default FlowOrchestratorPage;