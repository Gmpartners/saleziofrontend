import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp, where, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from '../hooks/useAuthContext';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { Button, Input, Select, Table, Tag, Tooltip, Modal, Form, Switch, message } from 'antd';
import { EditOutlined, SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const { userProfile, isAdmin } = useAuthContext();
  const { 
    forceSyncUser, 
    isSyncing, 
    isSync, 
    error: syncError, 
    clearError, 
    isMongoDB 
  } = useSyncStatus();

  // Carregar usuários e setores
  const fetchUsersAndSectors = async () => {
    setLoading(true);
    try {
      // Buscar setores
      const sectorsRef = collection(db, 'sectors');
      const sectorsSnapshot = await getDocs(sectorsRef);
      
      const sectorsData = [];
      sectorsSnapshot.forEach(doc => {
        sectorsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      setSectors(sectorsData);
      
      // Buscar usuários
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const usersData = [];
      usersSnapshot.forEach(doc => {
        usersData.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      setUsers(usersData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      message.error('Erro ao carregar usuários e setores');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchUsersAndSectors();
  }, []);

  // Mostrar modal para edição
  const showModal = (user) => {
    setEditingUser(user);
    
    form.setFieldsValue({
      sector: user.sector || '',
      role: user.role || 'agent',
      isActive: user.isActive !== false
    });
    
    setModalVisible(true);
  };

  // Salvar usuário
  const handleSave = async (values) => {
    try {
      // Buscar nome do setor
      let sectorName = '';
      if (values.sector) {
        const sector = sectors.find(s => s.id === values.sector);
        sectorName = sector ? sector.nome : '';
      }
      
      // Atualizar usuário
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        sector: values.sector,
        sectorName: sectorName,
        role: values.role,
        isActive: values.isActive,
        updatedAt: serverTimestamp()
      });
      
      message.success('Usuário atualizado com sucesso');
      setModalVisible(false);
      fetchUsersAndSectors();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      message.error('Erro ao salvar usuário');
    }
  };

  // Forçar sincronização de um usuário
  const handleForceSync = async (userId) => {
    try {
      message.loading({ content: 'Sincronizando...', key: 'syncStatus' });
      
      // Buscar usuário atual
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }
      
      const userData = userDoc.data();
      
      // Montar objeto completo
      const userObject = {
        id: userId,
        ...userData
      };
      
      await forceSyncUser(userObject);
      message.success({ content: 'Sincronização concluída', key: 'syncStatus' });
      fetchUsersAndSectors();
    } catch (error) {
      message.error({ content: `Erro na sincronização: ${error.message}`, key: 'syncStatus' });
    }
  };

  // Colunas da tabela
  const columns = [
    {
      title: 'Nome',
      dataIndex: 'displayName',
      key: 'displayName',
      sorter: (a, b) => a.displayName?.localeCompare(b.displayName || ''),
      render: (text, record) => text || record.email
    },
    {
      title: 'E-mail',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Função',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'blue' : 'green'}>
          {role === 'admin' ? 'Administrador' : 'Agente'}
        </Tag>
      ),
      filters: [
        { text: 'Administrador', value: 'admin' },
        { text: 'Agente', value: 'agent' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Setor',
      dataIndex: 'sectorName',
      key: 'sectorName',
      render: (sectorName, record) => (
        sectorName ? <Tag color="blue">{sectorName}</Tag> : <span style={{ color: '#999' }}>Sem setor</span>
      ),
      filters: sectors.map(sector => ({ text: sector.nome, value: sector.id })),
      onFilter: (value, record) => record.sector === value,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive !== false ? 'green' : 'red'}>
          {isActive !== false ? 'Ativo' : 'Inativo'}
        </Tag>
      ),
      filters: [
        { text: 'Ativo', value: true },
        { text: 'Inativo', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
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
            disabled={!isMongoDB}
            title={!isMongoDB ? 'MongoDB indisponível' : 'Forçar sincronização'}
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
        <p>Apenas administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2>Gerenciamento de Usuários</h2>
        
        <Button
          onClick={fetchUsersAndSectors}
          loading={loading}
        >
          Atualizar
        </Button>
      </div>
      
      {/* Status da sincronização MongoDB */}
      <div style={{ marginBottom: '16px' }}>
        <Tag color={isMongoDB ? 'green' : 'red'}>
          MongoDB: {isMongoDB ? 'Conectado' : 'Desconectado'}
        </Tag>
        
        {syncError && (
          <Tag color="red" closable onClose={clearError}>
            Erro: {syncError}
          </Tag>
        )}
      </div>

      {/* Tabela de usuários */}
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Modal de edição */}
      <Modal
        title="Editar Usuário"
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
            name="sector"
            label="Setor"
          >
            <Select placeholder="Selecione um setor" allowClear>
              {sectors.map(sector => (
                <Option key={sector.id} value={sector.id} disabled={!sector.ativo}>
                  {sector.nome} {!sector.ativo && '(Inativo)'}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="role"
            label="Função"
            rules={[{ required: true, message: 'Por favor, selecione a função' }]}
          >
            <Select>
              <Option value="admin">Administrador</Option>
              <Option value="agent">Agente</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="isActive"
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

export default UserManagement;