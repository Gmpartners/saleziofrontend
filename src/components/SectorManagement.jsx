import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from '../hooks/useAuthContext';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { COLECAO_SETORES } from '../config/syncConfig';
import { Button, Input, Select, Table, Tag, Tooltip, Modal, Form, Switch, message } from 'antd';
import { EditOutlined, DeleteOutlined, SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const SectorManagement = () => {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSector, setEditingSector] = useState(null);
  const [form] = Form.useForm();
  const { userProfile, isAdmin } = useAuthContext();
  const { 
    forceSyncSector, 
    isSyncing, 
    isSync, 
    error: syncError, 
    clearError, 
    isApiOnline 
  } = useSyncStatus();

  // Carregar setores
  const fetchSectors = async () => {
    setLoading(true);
    try {
      const sectorsRef = collection(db, COLECAO_SETORES);
      const snapshot = await getDocs(sectorsRef);
      
      const sectorsData = [];
      snapshot.forEach(doc => {
        sectorsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      setSectors(sectorsData);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
      message.error('Erro ao carregar setores');
    } finally {
      setLoading(false);
    }
  };

  // Carregar setores ao montar o componente
  useEffect(() => {
    fetchSectors();
  }, []);

  // Mostrar modal para edição/criação
  const showModal = (sector = null) => {
    setEditingSector(sector);
    
    if (sector) {
      form.setFieldsValue({
        nome: sector.nome,
        descricao: sector.descricao,
        responsavel: sector.responsavel,
        ativo: sector.ativo !== false
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        ativo: true
      });
    }
    
    setModalVisible(true);
  };

  // Salvar setor
  const handleSave = async (values) => {
    try {
      if (editingSector) {
        // Atualizar setor existente
        const sectorRef = doc(db, COLECAO_SETORES, editingSector.id);
        await updateDoc(sectorRef, {
          nome: values.nome,
          descricao: values.descricao,
          responsavel: values.responsavel,
          ativo: values.ativo,
          updatedAt: serverTimestamp()
        });
        
        message.success('Setor atualizado com sucesso');
      } else {
        // Criar novo setor
        const newSectorId = `${values.nome.toLowerCase()}-${Date.now()}`.replace(/\s+/g, '-');
        
        // Usar setDoc com ID explícito em vez de addDoc
        const sectorRef = doc(db, COLECAO_SETORES, newSectorId);
        await setDoc(sectorRef, {
          _id: newSectorId,
          nome: values.nome,
          descricao: values.descricao,
          responsavel: values.responsavel,
          ativo: values.ativo,
          userId: userProfile.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        message.success('Setor criado com sucesso');
      }
      
      setModalVisible(false);
      fetchSectors();
    } catch (error) {
      console.error('Erro ao salvar setor:', error);
      message.error('Erro ao salvar setor');
    }
  };

  // Excluir setor
  const handleDelete = async (sectorId) => {
    Modal.confirm({
      title: 'Confirmar exclusão',
      content: 'Tem certeza que deseja excluir este setor? Esta ação não pode ser desfeita.',
      okText: 'Sim, excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteDoc(doc(db, COLECAO_SETORES, sectorId));
          message.success('Setor excluído com sucesso');
          fetchSectors();
        } catch (error) {
          console.error('Erro ao excluir setor:', error);
          message.error('Erro ao excluir setor');
        }
      }
    });
  };

  // Forçar sincronização de um setor
  const handleForceSync = async (sectorId) => {
    try {
      message.loading({ content: 'Sincronizando...', key: 'syncStatus' });
      await forceSyncSector(sectorId);
      message.success({ content: 'Sincronização concluída', key: 'syncStatus' });
      fetchSectors();
    } catch (error) {
      message.error({ content: `Erro na sincronização: ${error.message}`, key: 'syncStatus' });
    }
  };

  // Colunas da tabela
  const columns = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
      sorter: (a, b) => a.nome.localeCompare(b.nome),
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
      ellipsis: true,
    },
    {
      title: 'Responsável',
      dataIndex: 'responsavel',
      key: 'responsavel',
    },
    {
      title: 'Status',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo !== false ? 'green' : 'red'}>
          {ativo !== false ? 'Ativo' : 'Inativo'}
        </Tag>
      ),
      filters: [
        { text: 'Ativo', value: true },
        { text: 'Inativo', value: false },
      ],
      onFilter: (value, record) => record.ativo === value,
    },
    {
      title: 'Sincronização',
      key: 'syncStatus',
      render: (_, record) => {
        const lastSync = record.lastSyncedAt ? new Date(record.lastSyncedAt.seconds * 1000) : null;
        const status = record.syncStatus || 'pending';
        
        return (
          <div>
            {status === 'success' && (
              <Tooltip title={`Sincronizado em ${lastSync?.toLocaleString()}`}>
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Sincronizado
                </Tag>
              </Tooltip>
            )}
            
            {status === 'error' && (
              <Tooltip title={record.syncError || 'Erro na sincronização'}>
                <Tag color="red" icon={<ExclamationCircleOutlined />}>
                  Erro
                </Tag>
              </Tooltip>
            )}
            
            {status === 'pending' && (
              <Tooltip title="Aguardando sincronização">
                <Tag color="orange">Pendente</Tag>
              </Tooltip>
            )}
          </div>
        );
      },
      filters: [
        { text: 'Sincronizado', value: 'success' },
        { text: 'Erro', value: 'error' },
        { text: 'Pendente', value: 'pending' },
      ],
      onFilter: (value, record) => (record.syncStatus || 'pending') === value,
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => showModal(record)}
          />
          
          <Button
            type="ghost"
            icon={<SyncOutlined />}
            size="small"
            onClick={() => handleForceSync(record.id)}
            loading={isSyncing}
            disabled={!isApiOnline}
            title={!isApiOnline ? 'API indisponível' : 'Forçar sincronização'}
          />
          
          <Button
            type="danger"
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleDelete(record.id)}
          />
        </div>
      ),
    },
  ];

  // Se não for admin, não mostrar gerenciamento
  if (!isAdmin) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Acesso Restrito</h2>
        <p>Apenas administradores podem gerenciar setores.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2>Gerenciamento de Setores</h2>
        
        <div>
          <Button
            type="primary"
            onClick={() => showModal()}
            style={{ marginRight: '8px' }}
          >
            Novo Setor
          </Button>
          
          <Button
            onClick={fetchSectors}
            loading={loading}
          >
            Atualizar
          </Button>
        </div>
      </div>
      
      {/* Status da sincronização */}
      <div style={{ marginBottom: '16px' }}>
        <Tag color={isApiOnline ? 'green' : 'orange'}>
          API: {isApiOnline ? 'Conectada' : 'Funcionalidade de sincronização não disponível'}
        </Tag>
        
        {syncError && (
          <Tag color="red" closable onClose={clearError}>
            Erro: {syncError}
          </Tag>
        )}
      </div>

      {/* Tabela de setores */}
      <Table
        columns={columns}
        dataSource={sectors}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Modal de edição/criação */}
      <Modal
        title={editingSector ? 'Editar Setor' : 'Novo Setor'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="nome"
            label="Nome do Setor"
            rules={[{ required: true, message: 'Por favor, informe o nome do setor' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="descricao"
            label="Descrição"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          
          <Form.Item
            name="responsavel"
            label="Responsável"
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="ativo"
            label="Status"
            valuePropName="checked"
          >
            <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
          </Form.Item>
          
          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button onClick={() => setModalVisible(false)}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                Salvar
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SectorManagement;