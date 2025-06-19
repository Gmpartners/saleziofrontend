import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import AINode from '../../../node/AINode';
import SectorNode from '../../../node/SectorNode';
import EmpresaNode from '../../../node/EmpresaNode';
import KnowledgeNode from '../../../node/KnowledgeNode';
import AddKnowledgeNode from '../../../node/AddKnowledgeNode';
import { multiflowApi } from '@/services/multiflowApi';
import { useAuthContext } from '@/hooks/useAuthContext';

const nodeTypes = {
  ai: AINode,
  sector: SectorNode,
  empresa: EmpresaNode,
  knowledge: KnowledgeNode,
  addKnowledge: AddKnowledgeNode,
};

const SectorFlow = React.forwardRef(({ 
  externalSectors,
  externalEmpresas,
  initialFlowConfig,
  onEditSector,
  onEditEmpresa,
  onAddSector,
  onAddEmpresa,
  onSaveFlow,
  isLoading,
  isSaving
}, ref) => {
  const [sectors, setSectors] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [knowledgeNodes, setKnowledgeNodes] = useState([]);
  const [nodePositions, setNodePositions] = useState({});
  const [updatedSectorEmpresas, setUpdatedSectorEmpresas] = useState([]);
  const [manuallyCreatedEdges, setManuallyCreatedEdges] = useState([]);
  const isInitialRender = useRef(true);
  const { fitView } = useReactFlow();
  const { userProfile, isAdmin } = useAuthContext();
  
  useEffect(() => {
    if (externalSectors && externalSectors.length > 0) {
      setSectors(externalSectors);

      if (!nodePositions || Object.keys(nodePositions).length === 0) {
        const positions = {};
        externalSectors.forEach((sector, index) => {
          positions[sector.id] = sector.position || { x: index * 300 + 100, y: 420 };
        });
        setNodePositions(positions);
      }
    }
  }, [externalSectors]);
  
  useEffect(() => {
    if (externalEmpresas && externalEmpresas.length > 0) {
      setEmpresas(externalEmpresas);
      
      if (!nodePositions || Object.keys(nodePositions).filter(id => id.startsWith('empresa-')).length === 0) {
        const positions = { ...nodePositions };
        externalEmpresas.forEach((empresa, index) => {
          positions[`empresa-${empresa.id}`] = empresa.position || { x: index * 350 + 150, y: 250 };
        });
        setNodePositions(positions);
      }
    }
  }, [externalEmpresas]);
  
  useEffect(() => {
    try {
      const savedEdges = localStorage.getItem('manualEdges');
      if (savedEdges) {
        setManuallyCreatedEdges(JSON.parse(savedEdges));
      }
    } catch (e) {
      console.error('Erro ao carregar edges salvas:', e);
    }
    
    if (initialFlowConfig) {
      let savedPositions = {};
      try {
        const savedPositionsString = localStorage.getItem('flowNodePositions');
        if (savedPositionsString) {
          savedPositions = JSON.parse(savedPositionsString);
          setNodePositions(savedPositions);
        } else if (initialFlowConfig.nodePositions) {
          setNodePositions(initialFlowConfig.nodePositions);
        }
      } catch (e) {
        console.error('Erro ao carregar posições salvas:', e);
        if (initialFlowConfig.nodePositions) {
          setNodePositions(initialFlowConfig.nodePositions);
        }
      }
      
      if (initialFlowConfig.knowledgeNodes) {
        const uniqueKnowledgeNodes = [];
        const sectorWithKnowledge = new Set();
        
        initialFlowConfig.knowledgeNodes.forEach(node => {
          if (!sectorWithKnowledge.has(node.sectorId)) {
            uniqueKnowledgeNodes.push(node);
            sectorWithKnowledge.add(node.sectorId);
          }
        });
        
        setKnowledgeNodes(uniqueKnowledgeNodes);
      }
    }
  }, [initialFlowConfig]);
  
  const handleEditSector = (sector) => {
    if (onEditSector) {
      onEditSector(sector);
    }
  };
  
  const handleEditEmpresa = (empresa) => {
    if (onEditEmpresa) {
      onEditEmpresa(empresa);
    }
  };
  
  const handleNodeDragStop = (event, node) => {
    if (node.type === 'sector' || node.type === 'empresa') {
      setNodePositions(prev => ({
        ...prev,
        [node.id]: { x: node.position.x, y: node.position.y }
      }));
      
      const currentPositions = {...nodePositions, [node.id]: { x: node.position.x, y: node.position.y }};
      localStorage.setItem('flowNodePositions', JSON.stringify(currentPositions));
    }
  };
  
  const handleAddKnowledge = (sectorId) => {
    const existingKnowledge = knowledgeNodes.find(k => k.sectorId === sectorId);
    if (existingKnowledge) {
      toast.warning('Este setor já possui uma base de conhecimento');
      return;
    }
    
    const newKnowledge = {
      id: `knowledge-${sectorId}`,
      sectorId,
      title: 'Conhecimento do Setor',
      instructions: 'Instruções específicas para este setor podem ser adicionadas aqui.'
    };
    
    setKnowledgeNodes(prev => [...prev, newKnowledge]);
    toast.success('Base de conhecimento adicionada');
  };
  
  const handleEditKnowledge = (id) => {
    const knowledge = knowledgeNodes.find(k => k.id === id);
    if (knowledge) {
    }
  };
  
const createNodes = () => {
  console.log("Criando nós com dados atuais:", {
    setores: sectors.length,
    empresas: empresas.length,
    posicoesCount: Object.keys(nodePositions).length
  });
   
  const aiNode = {
    id: 'ai-orchestrator',
    type: 'ai',
    position: nodePositions['ai-orchestrator'] || { x: 300, y: 100 },
    data: { name: 'Orquestrador IA', subtitle: 'Gerenciador de Fluxo' },
  };
  
  const empresaNodes = empresas.map((empresa) => {
    if (!empresa || !empresa.id) {
      console.error("Empresa com dados inválidos:", empresa);
      return null;
    }
      
    const empresaIdentifier = empresa.empresaId || empresa.id;
    const empresaNodeId = `empresa-${empresaIdentifier}`;
    const position = nodePositions[empresaNodeId] || { x: 100, y: 250 };

    return {
      id: empresaNodeId,
      type: 'empresa',
      position: position,
      data: { 
        empresa: {
          ...empresa,
          id: empresaIdentifier,
          empresaId: empresaIdentifier,
          nome: empresa.nome || 'Empresa sem nome',
          descricao: empresa.descricao || '',
          ativo: empresa.ativo !== false,
          conteudosAutomaticos: empresa.conteudosAutomaticos || []
        }, 
        onEdit: handleEditEmpresa,
        key: Date.now() + empresaNodeId
      },
    };
  }).filter(Boolean);
  
  const sectorNodes = sectors.map((sector) => {
    if (!sector || !sector.id) {
      console.error("Setor com dados inválidos:", sector);
      return null;
    }
    
    const sectorIdentifier = sector.setorId || sector.id;
    const position = nodePositions[sectorIdentifier] || { x: 100, y: 400 };
    
    let empresaId = sector.empresaId;
    if (typeof empresaId === 'object' && empresaId !== null) {
      empresaId = empresaId.empresaId || empresaId._id || '';
    }
    
    return {
      id: sectorIdentifier,
      type: 'sector',
      position: position,
      data: { 
        sector: {
          ...sector,
          id: sectorIdentifier,
          setorId: sectorIdentifier,
          nome: sector.nome || 'Setor sem nome',
          descricao: sector.descricao || '',
          ativo: sector.ativo !== false,
          empresaId: empresaId,
          lacunas: sector.lacunas || [],
          objetivos: sector.objetivos || [],
          transferencia: sector.transferencia || {
            metodo: 'visivel',
            mensagem: 'Transferindo para atendimento especializado'
          }
        }, 
        onEdit: handleEditSector,
        key: Date.now() + sectorIdentifier
      },
    };
  }).filter(Boolean);
    
  console.log("Nós de setores criados:", sectorNodes.map(n => ({ 
    id: n.id, 
    empresaId: n.data.sector.empresaId
  })));

  const knowledgeNodesList = knowledgeNodes.map((knowledge) => {
    const sector = sectors.find(s => s.id === knowledge.sectorId);
    const sectorPosition = sector ? (nodePositions[sector.id] || sector.position) : { x: 0, y: 0 };
    
    return {
      id: knowledge.id,
      type: 'knowledge',
      position: { x: sectorPosition.x + 80, y: sectorPosition.y + 120 },
      data: { 
        title: knowledge.title,
        instructions: knowledge.instructions,
        sectorId: knowledge.sectorId,
        onEdit: handleEditKnowledge
      },
    };
  });
  
  const sectorsWithKnowledge = new Set(knowledgeNodes.map(k => k.sectorId));
  
  const addKnowledgeNodes = sectors
    .filter(sector => !sectorsWithKnowledge.has(sector.id))
    .map((sector) => {
      const sectorPosition = nodePositions[sector.id] || sector.position;
      
      return {
        id: `add-knowledge-${sector.id}`,
        type: 'addKnowledge',
        position: { x: sectorPosition.x, y: sectorPosition.y + 120 },
        data: { 
          onClick: handleAddKnowledge,
          sectorId: sector.id
        },
      };
    });
  
  console.log("Total nodes criados:", 1 + empresaNodes.length + sectorNodes.length);
  
  return [
    aiNode, 
    ...empresaNodes, 
    ...sectorNodes, 
    ...knowledgeNodesList, 
    ...addKnowledgeNodes
  ];
};
  
  const createUniqueEdgeId = (baseId) => {
    return `${baseId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  };
  
  const createEdges = () => {
    const connectionMap = new Map();
    
    const addUniqueEdge = (edge) => {
      const key = `${edge.source}-to-${edge.target}`;
      connectionMap.set(key, edge);
    };
    
    empresas.forEach((empresa) => {
      if (empresa.ativo !== false) {
        const edge = {
          id: createUniqueEdgeId(`ai-to-empresa-${empresa.id}`),
          source: 'ai-orchestrator',
          sourceHandle: 'ai-source',
          target: `empresa-${empresa.id}`,
          targetHandle: `target-empresa-${empresa.id}`,
          animated: true,
          style: { 
            stroke: '#4338CA', 
            strokeWidth: 2.5,
            opacity: 1
          },
          type: 'smoothstep',
        };
        addUniqueEdge(edge);
      }
    });
    
    sectors.forEach((sector) => {
      if (sector.empresaId && sector.empresaId !== 'sem-empresa') {
        const empresaId = typeof sector.empresaId === 'object' ? 
          sector.empresaId._id || '' : sector.empresaId;
          
        const edge = {
          id: createUniqueEdgeId(`empresa-${empresaId}-to-${sector.id}`),
          source: `empresa-${empresaId}`,
          sourceHandle: `source-empresa-${empresaId}`,
          target: sector.id,
          targetHandle: `target-${sector.id}`,
          animated: sector.ativo !== false,
          style: { 
            stroke: '#FF8F00', 
            strokeWidth: 2.5,
            opacity: sector.ativo !== false ? 1 : 0.6
          },
          type: 'smoothstep',
        };
        addUniqueEdge(edge);
      } else {
        const edge = {
          id: createUniqueEdgeId(`ai-to-${sector.id}`),
          source: 'ai-orchestrator',
          sourceHandle: 'ai-source',
          target: sector.id,
          targetHandle: `target-${sector.id}`,
          animated: sector.ativo !== false,
          style: { 
            stroke: '#FF8F00', 
            strokeWidth: 2.5,
            opacity: sector.ativo !== false ? 1 : 0.6
          },
          type: 'smoothstep',
        };
        addUniqueEdge(edge);
      }
    });
    
    knowledgeNodes.forEach((knowledge) => {
      const edge = {
        id: createUniqueEdgeId(`${knowledge.sectorId}-to-${knowledge.id}`),
        source: knowledge.sectorId,
        sourceHandle: `source-${knowledge.sectorId}`,
        target: knowledge.id,
        animated: false,
        style: { 
          stroke: '#FF8F00', 
          strokeWidth: 1.5,
        },
        type: 'smoothstep',
      };
      addUniqueEdge(edge);
    });
    
    if (nodes.length > 0) {
      const nodeIds = new Set(nodes.map(node => node.id));
      
      manuallyCreatedEdges.forEach(edge => {
        if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
          const isEmpresaToSector = edge.source.startsWith('empresa-') && 
            sectors.some(s => s.id === edge.target && 
              s.empresaId === edge.source.replace('empresa-', ''));
          
          const isAIToSector = edge.source === 'ai-orchestrator' && 
            sectors.some(s => s.id === edge.target && 
              (!s.empresaId || s.empresaId === 'sem-empresa'));
          
          if (!isEmpresaToSector && !isAIToSector) {
            const newEdge = {
              ...edge,
              id: createUniqueEdgeId(edge.id)
            };
            addUniqueEdge(newEdge);
          }
        }
      });
    }
    
    return Array.from(connectionMap.values());
  };
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  useEffect(() => {
    setNodes(createNodes());
  }, [sectors, empresas, knowledgeNodes, nodePositions]);
  
  useEffect(() => {
    if (nodes.length > 0) {
      setEdges(createEdges());
    }
  }, [sectors, empresas, knowledgeNodes, manuallyCreatedEdges, nodes.length]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nodes.length > 0) {
        console.log("Ajustando visualização para", nodes.length, "nós");
        fitView({ 
          padding: 0.2,
          includeHiddenNodes: true,
          minZoom: 0.5,
          maxZoom: 1.0
        });
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [fitView, nodes.length]);
  
  React.useImperativeHandle(ref, () => ({
    addSector: (sectorData) => {
      const newSector = { 
        ...sectorData, 
        id: sectorData.id || `sector-${Date.now()}`,
        position: { x: sectors.length * 300, y: 400 },
        lacunas: sectorData.lacunas || [],
        objetivos: sectorData.objetivos || [],
        transferencia: sectorData.transferencia || {
          metodo: 'visivel',
          mensagem: 'Transferindo para atendimento especializado'
        }
      };
      
      setSectors(prevSectors => [...prevSectors, newSector]);
      
      setNodePositions(prev => ({
        ...prev,
        [newSector.id]: newSector.position
      }));
      
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
      
      return newSector;
    },
  updateSector: (sectorId, sectorData) => {
    const clonedSectorData = JSON.parse(JSON.stringify(sectorData));
  
    console.log("Atualizando setor:", {
      id: sectorId,
      novosObtidos: clonedSectorData
    });
  
    let empresaId = clonedSectorData.empresaId;
    if (typeof empresaId === 'object' && empresaId !== null) {
      empresaId = empresaId.empresaId || empresaId._id || empresaId.id || '';
      console.log("Convertendo empresaId de objeto para string:", empresaId);
    }
  
    const updatedSector = {
      ...clonedSectorData,
      id: sectorId,
      setorId: sectorId,
      empresaId,
      key: `${sectorId}-${Date.now()}`,
      nome: clonedSectorData.nome, 
      descricao: clonedSectorData.descricao,
      ativo: clonedSectorData.ativo !== false,
      lacunas: clonedSectorData.lacunas || [],
      objetivos: clonedSectorData.objetivos || [],
      transferencia: clonedSectorData.transferencia || {
        metodo: 'visivel',
        mensagem: 'Transferindo para atendimento especializado'
      }
    };
  
    console.log("Setor atualizado para renderização:", updatedSector);
  
    setSectors(prevSectors => {
      const newSectors = prevSectors.map(s => 
        s.id === sectorId ? {...updatedSector} : s
      );
      return newSectors;
    });
  
    setTimeout(() => {
      const updatedNodes = createNodes();
      setNodes(updatedNodes);
      
      setTimeout(() => {
        const updatedEdges = createEdges();
        setEdges(updatedEdges);
        
        setTimeout(() => {
          if (fitView) {
            fitView({ padding: 0.2 });
          }
        }, 100);
      }, 50);
    }, 50);
  },

refreshAllNodes: () => {
  console.log("Executando refreshAllNodes");
  
  const currentSectors = [...sectors];
  const currentEmpresas = [...empresas];
  
  setSectors([]);
  setEmpresas([]);
  
  setTimeout(() => {
    setSectors(currentSectors.map(s => ({...s, key: `${s.id}-${Date.now()}`})));
    setEmpresas(currentEmpresas.map(e => ({...e, key: `${e.id}-${Date.now()}`})));
    
    setTimeout(() => {
      const freshNodes = createNodes();
      setNodes(freshNodes);
      
      const freshEdges = createEdges();
      setEdges(freshEdges);
      
      if (fitView) {
        setTimeout(() => {
          console.log("Ajustando visualização após refresh completo");
          fitView({ padding: 0.2 });
        }, 200);
      }
    }, 50);
  }, 50);
},
    removeSector: (sectorId) => {
      setSectors(prevSectors => prevSectors.filter(s => s.id !== sectorId));
      setKnowledgeNodes(prevKnowledge => prevKnowledge.filter(k => k.sectorId !== sectorId));
      
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    },
    addEmpresa: (empresaData) => {
      const newEmpresa = { 
        ...empresaData, 
        id: empresaData.id || `empresa-${Date.now()}`,
        position: { x: empresas.length * 350 + 150, y: 250 } 
      };
      
      setEmpresas(prevEmpresas => [...prevEmpresas, newEmpresa]);
      
      setNodePositions(prev => ({
        ...prev,
        [`empresa-${newEmpresa.id}`]: newEmpresa.position
      }));
      
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
      
      return newEmpresa;
    },
    updateEmpresa: (empresaId, empresaData) => {
      setEmpresas(prevEmpresas => 
        prevEmpresas.map(e => e.id === empresaId ? { 
          ...e, 
          ...empresaData,
          conteudosAutomaticos: empresaData.conteudosAutomaticos || []
        } : e)
      );
      
      setTimeout(() => {
        const updatedNodes = createNodes();
        setNodes(updatedNodes);
        setEdges(createEdges());
      }, 100);
    },
    removeEmpresa: (empresaId) => {
      setEmpresas(prevEmpresas => prevEmpresas.filter(e => e.id !== empresaId));
      
      setSectors(prevSectors => 
        prevSectors.map(s => 
          s.empresaId === empresaId ? { ...s, empresaId: '' } : s
        )
      );
      
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    },
    getSectors: () => sectors,
    getEmpresas: () => empresas,
    getNodePositions: () => nodePositions,
    getUpdatedSectorEmpresas: () => updatedSectorEmpresas,
    forceUpdateEdges: () => {
      setEdges(createEdges());
    },
    refreshAllNodes: () => {
      console.log("Executando refreshAllNodes");
      
      const currentSectors = [...sectors];
      const currentEmpresas = [...empresas];
      
      setSectors([]);
      setEmpresas([]);
      
      setTimeout(() => {
        setSectors(currentSectors);
        setEmpresas(currentEmpresas);
        
        setTimeout(() => {
          const freshNodes = createNodes();
          setNodes(freshNodes);
          
          const freshEdges = createEdges();
          setEdges(freshEdges);
          
          if (fitView) {
            setTimeout(() => {
              console.log("Ajustando visualização após refresh completo");
              fitView({ padding: 0.2 });
            }, 10);
          }
        }, 10);
      }, 10);
    },
    saveCurrentState: () => {
      const currentPositions = {};
      nodes.forEach(node => {
        if (node.position) {
          currentPositions[node.id] = { x: node.position.x, y: node.position.y };
        }
      });
      
      localStorage.setItem('flowNodePositions', JSON.stringify(currentPositions));
      localStorage.setItem('manualEdges', JSON.stringify(manuallyCreatedEdges));
      localStorage.setItem('flowEdges', JSON.stringify(edges));
      
      return {
        nodePositions: currentPositions,
        edges: edges,
        updatedSectors: updatedSectorEmpresas
      };
    },
    resetLayout: () => {
      const newPositions = {};
      
      newPositions['ai-orchestrator'] = { x: 300, y: 100 };
      
      empresas.forEach((empresa, index) => {
        newPositions[`empresa-${empresa.id}`] = { x: index * 350 + 150, y: 250 };
      });
      
      const sectorsByEmpresa = {};
      sectors.forEach(sector => {
        if (sector.empresaId && sector.empresaId !== 'sem-empresa') {
          if (!sectorsByEmpresa[sector.empresaId]) {
            sectorsByEmpresa[sector.empresaId] = [];
          }
          sectorsByEmpresa[sector.empresaId].push(sector);
        }
      });
      
      Object.entries(sectorsByEmpresa).forEach(([empresaId, empresaSectors]) => {
        if (empresaId) {
          const empresaIndex = empresas.findIndex(e => e.id === empresaId);
          if (empresaIndex >= 0) {
            const empresaX = empresaIndex * 350 + 150;
            
            empresaSectors.forEach((sector, sectorIndex) => {
              newPositions[sector.id] = { 
                x: empresaX + (sectorIndex * 180) - ((empresaSectors.length - 1) * 90), 
                y: 400 
              };
            });
          }
        }
      });
      
      const sectorsWithoutEmpresa = sectors.filter(s => !s.empresaId || s.empresaId === 'sem-empresa');
      sectorsWithoutEmpresa.forEach((sector, index) => {
        newPositions[sector.id] = { x: index * 200 + 200, y: 550 };
      });
      
      setNodePositions(newPositions);
      localStorage.setItem('flowNodePositions', JSON.stringify(newPositions));
      
      setManuallyCreatedEdges([]);
      localStorage.setItem('manualEdges', JSON.stringify([]));
      
      setTimeout(() => {
        setEdges(createEdges());
        fitView({ padding: 0.2 });
      }, 100);
      
      toast.success('Layout resetado com sucesso!');
    },
    fitView: () => {
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 10);
    }
  }));
  
  const handleSaveFlow = () => {
    try {
      if (ref.current && ref.current.saveCurrentState) {
        ref.current.saveCurrentState();
      }
      
      const currentNodePositions = {};
      nodes.forEach(node => {
        if (node.position) {
          currentNodePositions[node.id] = { 
            x: node.position.x, 
            y: node.position.y 
          };
        }
      });
      
      const currentEdges = createEdges();
      
      localStorage.setItem('flowNodePositions', JSON.stringify(currentNodePositions));
      localStorage.setItem('flowEdges', JSON.stringify(currentEdges));
      
      const sectorsWithPositions = sectors.map(sector => ({
        ...sector,
        position: currentNodePositions[sector.id] || sector.position || { x: 0, y: 0 },
        lacunas: sector.lacunas || [],
        objetivos: sector.objetivos || [],
        transferencia: sector.transferencia || {
          metodo: 'visivel',
          mensagem: 'Transferindo para atendimento especializado'
        }
      }));
      
      const empresasWithPositions = empresas.map(empresa => {
        const nodeId = `empresa-${empresa.id}`;
        return {
          ...empresa,
          position: currentNodePositions[nodeId] || empresa.position || { x: 0, y: 0 },
          conteudosAutomaticos: empresa.conteudosAutomaticos || []
        };
      });
      
      const flowConfig = {
        sectors: sectorsWithPositions,
        empresas: empresasWithPositions,
        knowledgeNodes,
        edges: currentEdges,
        nodePositions: currentNodePositions,
        updatedSectors: updatedSectorEmpresas
      };
      
      if (onSaveFlow) {
        onSaveFlow(flowConfig);
        setUpdatedSectorEmpresas([]);
        setNodePositions(currentNodePositions);
        
        setTimeout(() => {
          console.log("Atualizando componentes visuais após salvar fluxo");
          setSectors(sectorsWithPositions);
          setEmpresas(empresasWithPositions);
          
          const updatedNodes = createNodes();
          setNodes(updatedNodes);
          setEdges(createEdges());
        }, 100);
      }
      
      toast.success('Fluxo salvo com sucesso!');
    } catch (error) {
      console.error('Error saving flow:', error);
      toast.error('Ocorreu um erro ao salvar o fluxo', {
        description: error.message
      });
    }
  };
  
  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find(node => node.id === params.source);
    const targetNode = nodes.find(node => node.id === params.target);
    
    if (sourceNode?.type === 'sector' && targetNode?.type === 'sector') {
      toast.error('Não é possível conectar diretamente um setor a outro setor');
      return;
    }
    
    if (sourceNode?.type === 'empresa' && targetNode?.type === 'empresa') {
      toast.error('Não é possível conectar uma empresa a outra empresa');
      return;
    }
    
    if (sourceNode?.type === 'sector' && targetNode?.type === 'empresa') {
      toast.error('Não é possível conectar um setor a uma empresa');
      return;
    }

    if (
      (sourceNode?.type === 'ai' && targetNode?.type === 'sector' && targetNode?.data?.sector?.empresaId) ||
      (sourceNode?.type === 'sector' && targetNode?.type === 'ai' && sourceNode?.data?.sector?.empresaId)
    ) {
      toast.error('Setores vinculados a empresas devem conectar através de sua empresa');
      return;
    }
    
    const connectionExists = edges.some(
      edge => edge.source === params.source && edge.target === params.target
    );
    
    if (connectionExists) {
      toast.info('Esta conexão já existe');
      return;
    }

    if (sourceNode?.type === 'empresa' && targetNode?.type === 'sector') {
      const empresaId = sourceNode.id.replace('empresa-', '');
      const sectorId = targetNode.id;
      
      setSectors(prevSectors => {
        return prevSectors.map(s => {
          if (s.id === sectorId) {
            return { ...s, empresaId };
          }
          return s;
        });
      });
      
      setUpdatedSectorEmpresas(prev => {
        const filtered = prev.filter(item => item.sectorId !== sectorId);
        return [...filtered, { sectorId, empresaId }];
      });
      
      setTimeout(() => {
        const updatedEdges = createEdges();
        setEdges(updatedEdges);
      }, 50);
      
      toast.info('Setor conectado à empresa. Clique em "Salvar Fluxo" para confirmar a mudança.');
      return;
    }
    
    if (sourceNode?.type === 'ai' && targetNode?.type === 'sector') {
      const sectorId = targetNode.id;
      
      setSectors(prevSectors => {
        return prevSectors.map(s => {
          if (s.id === sectorId) {
            return { ...s, empresaId: '' };
          }
          return s;
        });
      });
      
      setUpdatedSectorEmpresas(prev => {
        const filtered = prev.filter(item => item.sectorId !== sectorId);
        return [...filtered, { sectorId, empresaId: '' }];
      });
      
      setTimeout(() => {
        const updatedEdges = createEdges();
        setEdges(updatedEdges);
      }, 50);
      
      toast.info('Setor conectado diretamente à IA. Clique em "Salvar Fluxo" para confirmar a mudança.');
      return;
    }
    
    const newEdge = {
      id: createUniqueEdgeId(`${params.source}-to-${params.target}`),
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#FF8F00', strokeWidth: 2.5 }
    };
    
    setEdges(eds => addEdge(newEdge, eds));
    
    setManuallyCreatedEdges(prev => [...prev, newEdge]);
    
    setTimeout(() => {
      localStorage.setItem('flowEdges', JSON.stringify(edges));
      localStorage.setItem('manualEdges', JSON.stringify([...manuallyCreatedEdges, newEdge]));
    }, 100);
  }, [setEdges, nodes, sectors, edges, manuallyCreatedEdges]);
  
  if (isLoading) {
    return (
      <div className="h-[75vh] flex items-center justify-center bg-[#070b11] rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF8F00]"></div>
      </div>
    );
  }
  
  return (
    <div className="flow-container h-[75vh] rounded-lg border border-[#1f2937]/40 overflow-hidden shadow-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#FF8F00', strokeWidth: 2.5 }
        }}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1f2937" gap={20} size={1} />
        <Controls 
          position="bottom-left"
          showInteractive={false}
          className="m-4" 
        />
        <MiniMap 
          nodeStrokeWidth={3}
          zoomable
          pannable
          maskColor="rgba(7, 11, 17, 0.6)"
          position="bottom-right"
          className="m-4"
        />
        <Panel position="top-right">
          <div className="flex gap-2 m-4">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => ref.current.resetLayout()}
              className="shadow-sm bg-[#0f1621] hover:bg-[#1f2937] text-white border-[#1f2937]"
              disabled={isSaving}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Resetar Layout
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveFlow}
              className="bg-[#FF8F00] hover:bg-[#FF6F00] text-black shadow-sm"
              disabled={isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Fluxo'}
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
});

SectorFlow.displayName = 'SectorFlow';

const FlowWithProvider = React.forwardRef((props, ref) => {
  return (
    <ReactFlowProvider>
      <SectorFlow ref={ref} {...props} />
    </ReactFlowProvider>
  );
});

FlowWithProvider.displayName = 'FlowWithProvider';

export default FlowWithProvider;