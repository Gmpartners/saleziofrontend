import React, { useState, useEffect } from 'react';
import { User, Search, Edit, UserCheck, UserX, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import apiService from '../../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    role: 'agent',
    sector: '',
    isActive: true
  });
  
  // Carregar usuários e setores na montagem
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Carregar setores da API MultiFlow
        const setoresResponse = await apiService.getSetores();
        if (setoresResponse.success) {
          setSectors(setoresResponse.data || []);
        }
        
        // Carregar usuários do Firestore
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUsers(usersData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error("Erro ao carregar dados", {
          description: "Verifique sua conexão com o Firebase e tente novamente"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Abrir modal para editar usuário
  const handleOpenEditModal = (user) => {
    setFormData({
      role: user.role || 'agent',
      sector: user.sector || '',
      isActive: user.isActive !== false
    });
    setEditingUser(user);
    setIsModalOpen(true);
  };
  
  // Fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ role: 'agent', sector: '', isActive: true });
  };
  
  // Atualizar usuário
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!editingUser) {
      return;
    }
    
    try {
      // Encontrar o nome do setor
      const sectorName = formData.sector 
        ? sectors.find(s => s._id === formData.sector)?.nome || ''
        : '';
      
      // Atualizar no Firestore
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        role: formData.role,
        sector: formData.sector,
        sectorName,
        isActive: formData.isActive,
        updatedAt: new Date()
      });
      
      // Atualizar no estado local
      setUsers(users.map(user => {
        if (user.id === editingUser.id) {
          return {
            ...user,
            role: formData.role,
            sector: formData.sector,
            sectorName,
            isActive: formData.isActive
          };
        }
        return user;
      }));
      
      toast.success("Usuário atualizado com sucesso");
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error("Erro ao atualizar usuário", {
        description: "Verifique sua conexão com o Firebase e tente novamente"
      });
    }
  };
  
  // Alternar status do usuário (ativo/inativo)
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive: !currentStatus,
        updatedAt: new Date()
      });
      
      // Atualizar no estado local
      setUsers(users.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            isActive: !currentStatus
          };
        }
        return user;
      }));
      
      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error("Erro ao alterar status", {
        description: "Verifique sua conexão com o Firebase e tente novamente"
      });
    }
  };
  
  // Filtrar usuários pela busca
  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.sectorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Gerenciamento de Usuários</h1>
      
      {/* Barra de busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuários..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1d2b] border border-[#32304a] rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-green-500"
          />
        </div>
      </div>
      
      {/* Lista de usuários */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="bg-[#1e1d2b] rounded-xl overflow-hidden shadow-md">
          <table className="w-full text-left">
            <thead className="bg-[#25243a] text-gray-300 border-b border-[#32304a]">
              <tr>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4 hidden md:table-cell">Email</th>
                <th className="py-3 px-4">Função</th>
                <th className="py-3 px-4">Setor</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#32304a]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-4 px-4 text-center text-gray-400">
                    {searchQuery ? 'Nenhum usuário encontrado para esta busca' : 'Nenhum usuário cadastrado'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-[#25243a]">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm mr-3">
                          {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : <User className="h-4 w-4" />}
                        </div>
                        <span className="font-medium text-white">{user.displayName || 'Usuário'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300 hidden md:table-cell">{user.email}</td>
                    <td className="py-3 px-4">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <UserCog className="mr-1 h-3 w-3" />
                          Atendente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {user.sectorName || (user.role === 'admin' ? 'Todos' : '—')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {user.isActive !== false ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <UserCheck className="mr-1 h-3 w-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <UserX className="mr-1 h-3 w-3" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded"
                          title="Editar usuário"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.isActive !== false)}
                          className={`p-1.5 ${
                            user.isActive !== false 
                              ? 'text-amber-400 hover:bg-amber-400/10' 
                              : 'text-green-400 hover:bg-green-400/10'
                          } rounded`}
                          title={user.isActive !== false ? 'Desativar usuário' : 'Ativar usuário'}
                        >
                          {user.isActive !== false ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
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
      
      {/* Modal de Editar Usuário */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1d2b] rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">
              Editar Usuário
            </h2>
            
            <div className="mb-4">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center text-white text-lg mr-3">
                  {editingUser.displayName ? editingUser.displayName.substring(0, 2).toUpperCase() : <User className="h-6 w-6" />}
                </div>
                <div>
                  <div className="font-medium text-white">{editingUser.displayName || 'Usuário'}</div>
                  <div className="text-sm text-gray-400">{editingUser.email}</div>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleUpdateUser}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="role" className="block text-gray-300 mb-1">Função</label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-[#25243a] border border-[#32304a] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="agent">Atendente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                
                {formData.role === 'agent' && (
                  <div>
                    <label htmlFor="sector" className="block text-gray-300 mb-1">Setor</label>
                    <select
                      id="sector"
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      className="w-full bg-[#25243a] border border-[#32304a] rounded-lg py-2 px-3 text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="">Selecione um setor</option>
                      {sectors.map(sector => (
                        <option key={sector._id} value={sector._id}>
                          {sector.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {formData.role === 'admin' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-400">
                    <p>Administradores têm acesso a todos os setores e funcionalidades do sistema.</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-gray-300 mb-1">Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={() => setFormData({ ...formData, isActive: true })}
                        className="mr-2"
                      />
                      <span className="text-gray-300">Ativo</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isActive"
                        checked={!formData.isActive}
                        onChange={() => setFormData({ ...formData, isActive: false })}
                        className="mr-2"
                      />
                      <span className="text-gray-300">Inativo</span>
                    </label>
                  </div>
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
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;