import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Search, Edit, UserCheck, UserX, 
  ShieldCheck, UserCog, UserPlus, Mail, 
  Lock, Phone, AlertCircle, Shield, 
  RefreshCw, Filter, Download, Trash2,
  CheckCircle, XCircle, Clock, Menu, ChevronRight,
  Building, X
} from 'lucide-react';
import { toast } from 'sonner';
import { multiflowApi } from '../../services/multiflowApi';
import { motion, AnimatePresence } from 'framer-motion';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useAuthContext } from '../../hooks/useAuthContext';
import { db, auth } from '../../firebase/config';
import { 
  collection, getDocs, doc, getDoc, updateDoc, 
  setDoc, query, where, orderBy, limit, 
  onSnapshot, deleteDoc, serverTimestamp,
  getFirestore
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser as deleteFirebaseUser
} from 'firebase/auth';

const ExportToCsv = ({ users }) => {
  const handleExport = () => {
    if (!users || users.length === 0) {
      toast.error("Não há usuários para exportar");
      return;
    }

    try {
      const headers = ["Nome", "Email", "Telefone", "Função", "Setores", "Empresas", "Status", "Última Atualização"];
      
      const csvData = users.map(user => [
        user.displayName || 'N/A',
        user.email || 'N/A',
        user.phoneNumber || 'N/A',
        user.role === 'admin' ? 'Administrador' : 'Atendente',
        user.setores && user.setores.length > 0 
          ? user.setores.map(s => s.nome).join('; ')
          : (user.setor?.nome || 'N/A'),
        user.empresas && user.empresas.length > 0 
          ? user.empresas.map(e => e.nome).join('; ')
          : (user.empresa?.nome || 'N/A'),
        user.isActive !== false ? 'Ativo' : 'Inativo',
        user.lastUpdate ? new Date(user.lastUpdate.seconds * 1000).toLocaleDateString() : 'N/A'
      ]);
      
      let csvContent = headers.join(",") + "\n";
      csvData.forEach(row => {
        const formattedRow = row.map(cell => {
          if (/[",\n\r]/.test(cell)) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        });
        csvContent += formattedRow.join(",") + "\n";
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Relatório de usuários exportado com sucesso");
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error("Erro ao exportar relatório", {
        description: "Não foi possível gerar o arquivo CSV."
      });
    }
  };
  
  return (
    <button
      onClick={handleExport}
      className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-slate-700/30 rounded-lg transition-colors min-w-0"
      title="Exportar usuários para CSV"
    >
      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="hidden sm:inline truncate">Exportar</span>
    </button>
  );
};

const ActivityStatus = ({ lastUpdate, isActive }) => {
  const getStatusInfo = () => {
    if (!lastUpdate) return { icon: Clock, color: 'text-slate-400', text: 'Sem atividade' };
    
    const now = new Date();
    const updateDate = new Date(lastUpdate.seconds * 1000);
    const diffDays = Math.floor((now - updateDate) / (1000 * 60 * 60 * 24));
    
    if (!isActive) return { icon: XCircle, color: 'text-red-400', text: 'Inativo' };
    if (diffDays < 7) return { icon: CheckCircle, color: 'text-green-400', text: 'Recente' };
    if (diffDays < 30) return { icon: Clock, color: 'text-amber-400', text: 'Há mais de uma semana' };
    return { icon: Clock, color: 'text-slate-400', text: `Há ${diffDays} dias` };
  };
  
  const { icon: Icon, color, text } = getStatusInfo();
  
  return (
    <div className="flex items-center gap-1" title={text}>
      <Icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${color} flex-shrink-0`} />
      <span className="text-xs text-slate-400 truncate">
        {lastUpdate ? new Date(lastUpdate.seconds * 1000).toLocaleDateString() : 'N/A'}
      </span>
    </div>
  );
};

const UserCard = ({ user, onEdit, onToggleStatus, onSendReset, onDelete }) => {
  const getEmpresasDisplay = (user) => {
    if (user.empresas && user.empresas.length > 0) {
      return user.empresas.map(e => e.nome).join(', ');
    }
    return user.empresa?.nome || '—';
  };

  const getSetoresDisplay = (user) => {
    if (user.setores && user.setores.length > 0) {
      return user.setores.map(s => s.nome).join(', ');
    }
    return user.setor?.nome || (user.role === 'admin' ? 'Todos' : '—');
  };

  return (
    <div className="bg-[#101820] border border-[#1f2937]/40 rounded-lg p-3 md:hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center min-w-0 flex-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white text-sm mr-3 flex-shrink-0">
            {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : <User className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-white truncate">{user.displayName || 'Usuário'}</div>
            <div className="text-xs text-slate-400 truncate">{user.email}</div>
          </div>
        </div>
        
        <div className="flex gap-1 ml-2 flex-shrink-0">
          <button
            onClick={() => onEdit(user)}
            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
            title="Editar usuário"
          >
            <Edit className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => onDelete(user)}
            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
            title="Excluir usuário"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 flex-shrink-0">Função:</span>
          {user.role === 'admin' ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30 ml-2">
              <ShieldCheck className="mr-1 h-3 w-3 flex-shrink-0" />
              <span className="truncate">Admin</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 ml-2">
              <UserCog className="mr-1 h-3 w-3 flex-shrink-0" />
              <span className="truncate">Atendente</span>
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-start">
          <span className="text-slate-400 flex-shrink-0">Setores:</span>
          <span className="text-white text-right max-w-[60%] ml-2 break-words">
            {getSetoresDisplay(user)}
          </span>
        </div>
        
        <div className="flex justify-between items-start">
          <span className="text-slate-400 flex-shrink-0">Empresas:</span>
          <span className="text-white text-right max-w-[60%] ml-2 break-words">
            {getEmpresasDisplay(user)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-400 flex-shrink-0">Status:</span>
          {user.isActive !== false ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 ml-2">
              <UserCheck className="mr-1 h-3 w-3 flex-shrink-0" />
              <span className="truncate">Ativo</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 ml-2">
              <UserX className="mr-1 h-3 w-3 flex-shrink-0" />
              <span className="truncate">Inativo</span>
            </span>
          )}
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-[#1f2937]/40 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onToggleStatus(user.id, user.isActive !== false)}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors flex-1 ${
            user.isActive !== false 
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
              : 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30'
          }`}
        >
          {user.isActive !== false ? 'Desativar' : 'Ativar'}
        </button>
        
        <button
          onClick={() => onSendReset(user.email)}
          className="px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-md transition-colors flex-1"
        >
          Redefinir senha
        </button>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const { user, userProfile } = useAuthContext();
  const [users, setUsers] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editFormData, setEditFormData] = useState({
    role: 'agent',
    sectors: [],
    companies: [],
    isActive: true,
    permissions: []
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    role: 'agent',
    sectors: [],
    sectorName: '',
    companies: [],
    isActive: true,
    permissions: []
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const availablePermissions = [
    { id: 'manage_users', name: 'Gerenciar Usuários', description: 'Criar, editar e excluir usuários', icon: User },
    { id: 'manage_sectors', name: 'Gerenciar Setores', description: 'Criar, editar e excluir setores', icon: Shield },
    { id: 'view_analytics', name: 'Visualizar Analytics', description: 'Acessar dados de análise e relatórios', icon: UserCheck },
    { id: 'export_data', name: 'Exportar Dados', description: 'Exportar dados do sistema', icon: Download },
  ];

  const fetchCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const response = await multiflowApi.getEmpresas(user.uid);
      if (response.success && Array.isArray(response.data)) {
        console.log(`${response.data.length} empresas encontradas`);
        
        const normalizedCompanies = response.data.map(company => ({
          ...company,
          id: company.empresaId || company._id,
          empresaId: company.empresaId || company._id,
          nome: company.nome || 'Empresa sem nome'
        }));
        
        setCompanies(normalizedCompanies);
        return normalizedCompanies;
      } else {
        setCompanies([]);
        console.log('Nenhuma empresa encontrada');
        return [];
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      return [];
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersCollection = collection(db, 'users');
      
      console.log("Buscando todos os usuários do Firestore...");
      
      const snapshot = await getDocs(usersCollection);
      
      console.log(`Firestore retornou ${snapshot.docs.length} documentos de usuário`);
      
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        displayName: doc.data().displayName || doc.data().name || doc.id.substring(0, 8),
        isActive: doc.data().isActive !== false
      }));
      
      setTotalUserCount(snapshot.docs.length);
      setUsers(usersData);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast.error(`Erro ao buscar usuários: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const refreshUserList = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await loadUsers();
      toast.success("Lista de usuários atualizada");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    const loadData = async () => {
      if (!user || !user.uid) {
        return;
      }
      
      setIsLoading(true);
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
          console.error("Usuário não tem permissão de administrador!");
          toast.error("Você não tem permissão para acessar esta página");
          setIsLoading(false);
          return;
        }
        
        console.log("Usuário verificado como admin, carregando dados...");
        
        const setoresResponse = await multiflowApi.getSetores(user.uid, true);
        if (setoresResponse.success) {
          const normalizedSectors = setoresResponse.data.map(sector => ({
            ...sector,
            id: sector.setorId || sector._id,
            setorId: sector.setorId || sector._id
          }));
          
          setSectors(normalizedSectors);
        } else {
          console.warn("Não foi possível carregar setores:", setoresResponse.error);
        }
        
        await fetchCompanies();
        await loadUsers();
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error("Erro ao carregar dados", {
          description: `Erro: ${error.message}. Tente recarregar a página.`
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user && user.uid) {
      loadData();
    }
  }, [user]);
  
  const handleOpenEditModal = (user) => {
    let selectedCompanies = [];
    if (user.empresas && Array.isArray(user.empresas)) {
      selectedCompanies = user.empresas.map(e => e.id || e.empresaId);
    } else if (user.empresa) {
      selectedCompanies = [user.empresa.id || user.empresa.empresaId];
    }

    let selectedSectors = [];
    if (user.setores && Array.isArray(user.setores)) {
      selectedSectors = user.setores.map(s => s.id || s.setorId);
    } else if (user.setor) {
      selectedSectors = [user.setor.id || user.setor.setorId];
    }
    
    setEditFormData({
      role: user.role || 'agent',
      sectors: selectedSectors,
      companies: selectedCompanies,
      isActive: user.isActive !== false,
      permissions: user.permissions || []
    });
    setEditingUser(user);
    setIsEditModalOpen(true);
  };
  
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setEditFormData({ role: 'agent', sectors: [], companies: [], isActive: true, permissions: [] });
  };
  
  const handleOpenDeleteModal = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };
  
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
    setIsDeleting(false);
  };
  
  const handleDeleteUser = async () => {
    if (!userToDelete || !user || isDeleting) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      if (userToDelete.id === user.uid) {
        toast.error("Você não pode excluir seu próprio usuário");
        setIsDeleting(false);
        return;
      }
      
      await deleteDoc(doc(db, 'users', userToDelete.id));
      
      try {
        await multiflowApi.deleteUser(userToDelete.id);
      } catch (authError) {
        console.error('Erro ao excluir usuário do Authentication:', authError);
      }
      
      toast.success(`Usuário ${userToDelete.displayName} excluído com sucesso`);
      handleCloseDeleteModal();
      refreshUserList();
      
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error("Erro ao excluir usuário", {
        description: error.message || "Ocorreu um erro ao tentar excluir o usuário"
      });
      setIsDeleting(false);
    }
  };
  
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!editingUser || !user) {
      return;
    }

    try {
      const empresasSelecionadas = companies.filter(company => 
        editFormData.companies.includes(company.id || company.empresaId)
      ).map(company => ({
        id: company.id || company.empresaId,
        empresaId: company.empresaId || company.id,
        nome: company.nome,
        descricao: company.descricao || ''
      }));

      const setoresSelecionados = sectors.filter(sector => 
        editFormData.sectors.includes(sector.id || sector.setorId)
      ).map(sector => ({
        id: sector.id || sector.setorId,
        setorId: sector.setorId || sector.id,
        nome: sector.nome,
        descricao: sector.descricao || `Setor ${sector.nome}`,
        empresaId: sector.empresaId
      }));

      if (empresasSelecionadas.length === 0 && editFormData.role === 'agent') {
        toast.error("Selecione pelo menos uma empresa para o usuário");
        return;
      }

      if (setoresSelecionados.length === 0 && editFormData.role === 'agent') {
        toast.error("Selecione pelo menos um setor para o usuário");
        return;
      }

      const updateData = {
        role: editFormData.role,
        lastUpdate: serverTimestamp(),
        permissions: editFormData.permissions || [],
        isActive: editFormData.isActive,
        empresas: empresasSelecionadas,
        empresa: empresasSelecionadas[0] || null,
        setores: setoresSelecionados,
        setor: setoresSelecionados[0] || null
      };

      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, updateData);

      toast.success("Usuário atualizado com sucesso");
      handleCloseEditModal();
      refreshUserList();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error("Erro ao atualizar usuário", {
        description: error.message || "Verifique sua conexão com o Firebase e tente novamente"
      });
    }
  };
  
  const handleToggleUserStatus = async (userId, currentStatus) => {
    if (!user) return;
    
    try {
      const newStatus = !currentStatus;
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        isActive: newStatus,
        lastUpdate: serverTimestamp()
      });
      
      toast.success(`Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso`);
      
      setUsers(users.map(u => 
        u.id === userId ? {...u, isActive: newStatus} : u
      ));
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error("Erro ao alterar status", {
        description: error.message || "Verifique sua conexão com o Firebase e tente novamente"
      });
    }
  };
  
  const handleSendPasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Email de redefinição de senha enviado", {
        description: `Um email foi enviado para ${email}`
      });
    } catch (error) {
      console.error('Erro ao enviar email de redefinição:', error);
      toast.error("Erro ao enviar email de redefinição", {
        description: error.message || "Verifique se o email está correto"
      });
    }
  };

  const handleOpenCreateModal = () => {
    setCreateFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      role: 'agent',
      sectors: [],
      sectorName: '',
      companies: [],
      isActive: true,
      permissions: []
    });
    setPasswordStrength(0);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'password') {
      calculatePasswordStrength(value);
    }
    
    setCreateFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handlePermissionToggle = (permissionId, isEditForm = false) => {
    if (isEditForm) {
      setEditFormData(prev => {
        const currentPerms = prev.permissions || [];
        return {
          ...prev,
          permissions: currentPerms.includes(permissionId)
            ? currentPerms.filter(id => id !== permissionId)
            : [...currentPerms, permissionId]
        };
      });
    } else {
      setCreateFormData(prev => {
        const currentPerms = prev.permissions || [];
        return {
          ...prev,
          permissions: currentPerms.includes(permissionId)
            ? currentPerms.filter(id => id !== permissionId)
            : [...currentPerms, permissionId]
        };
      });
    }
  };

  const handleCompanyToggle = (companyId, isEditForm = false) => {
    if (isEditForm) {
      setEditFormData(prev => {
        const currentCompanies = prev.companies || [];
        return {
          ...prev,
          companies: currentCompanies.includes(companyId)
            ? currentCompanies.filter(id => id !== companyId)
            : [...currentCompanies, companyId]
        };
      });
    } else {
      setCreateFormData(prev => {
        const currentCompanies = prev.companies || [];
        return {
          ...prev,
          companies: currentCompanies.includes(companyId)
            ? currentCompanies.filter(id => id !== companyId)
            : [...currentCompanies, companyId]
        };
      });
    }
  };

  const handleSectorToggle = (sectorId, isEditForm = false) => {
    if (isEditForm) {
      setEditFormData(prev => {
        const currentSectors = prev.sectors || [];
        return {
          ...prev,
          sectors: currentSectors.includes(sectorId)
            ? currentSectors.filter(id => id !== sectorId)
            : [...currentSectors, sectorId]
        };
      });
    } else {
      setCreateFormData(prev => {
        const currentSectors = prev.sectors || [];
        return {
          ...prev,
          sectors: currentSectors.includes(sectorId)
            ? currentSectors.filter(id => id !== sectorId)
            : [...currentSectors, sectorId]
        };
      });
    }
  };

  const calculatePasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    
    if (/[a-z]/.test(password)) strength += 1;
    
    if (/[A-Z]/.test(password)) strength += 1;
    
    if (/[0-9]/.test(password)) strength += 1;
    
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength <= 1) return 'Fraca';
    if (passwordStrength <= 3) return 'Média';
    return 'Forte';
  };

  const validateCreateForm = () => {
    if (!createFormData.fullName || createFormData.fullName.length < 3) {
      toast.error("O nome deve ter pelo menos 3 caracteres");
      return false;
    }

    if (!createFormData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.email)) {
      toast.error("Digite um email válido");
      return false;
    }

    if (!createFormData.password || createFormData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return false;
    }

    if (createFormData.password !== createFormData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return false;
    }

    if (!createFormData.phoneNumber) {
      toast.error("O número de telefone é obrigatório");
      return false;
    }

    if (createFormData.companies.length === 0) {
      toast.error("Selecione pelo menos uma empresa");
      return false;
    }

    if (createFormData.role === 'agent' && createFormData.sectors.length === 0) {
      toast.error("Selecione pelo menos um setor para o atendente");
      return false;
    }

    return true;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!user || !validateCreateForm()) {
      return;
    }
    
    setIsCreating(true);
    
    try {
      let formattedPhoneNumber = createFormData.phoneNumber.startsWith("+55") 
        ? createFormData.phoneNumber 
        : `+55${createFormData.phoneNumber}`;
      
      try {
        const parsedPhoneNumber = parsePhoneNumberFromString(formattedPhoneNumber, "BR");
        if (!parsedPhoneNumber || !parsedPhoneNumber.isValid()) {
          toast.error("Número de telefone inválido. Use o formato (xx) xxxxx-xxxx");
          setIsCreating(false);
          return;
        }
      } catch (err) {
        toast.error("Número de telefone inválido");
        setIsCreating(false);
        return;
      }
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        createFormData.email,
        createFormData.password
      );
      
      const newUserId = userCredential.user.uid;
      
      const empresasSelecionadas = companies.filter(company => 
        createFormData.companies.includes(company.id || company.empresaId)
      ).map(company => ({
        id: company.id || company.empresaId,
        empresaId: company.empresaId || company.id,
        nome: company.nome,
        descricao: company.descricao || ''
      }));

      const setoresSelecionados = sectors.filter(sector => 
        createFormData.sectors.includes(sector.id || sector.setorId)
      ).map(sector => ({
        id: sector.id || sector.setorId,
        setorId: sector.setorId || sector.id,
        nome: sector.nome,
        descricao: sector.descricao || `Setor ${sector.nome}`,
        empresaId: sector.empresaId
      }));
      
      const userData = {
        displayName: createFormData.fullName,
        name: createFormData.fullName,
        email: createFormData.email,
        phoneNumber: formattedPhoneNumber,
        role: createFormData.role,
        empresas: empresasSelecionadas,
        empresa: empresasSelecionadas[0] || null,
        setores: setoresSelecionados,
        setor: setoresSelecionados[0] || null,
        isActive: createFormData.isActive,
        permissions: createFormData.permissions || [],
        created: serverTimestamp(),
        lastUpdate: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', newUserId), userData);
      
      toast.success(`Usuário ${createFormData.fullName} criado com sucesso`);
      handleCloseCreateModal();
      refreshUserList();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      
      let errorMessage = "Erro ao criar usuário: ";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Esse e-mail já está em uso. Tente outro.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha deve ter pelo menos 6 caracteres.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "O e-mail informado é inválido.";
      } else {
        errorMessage += (error.message || "Erro desconhecido");
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };
  
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        (user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.setores ? 
          user.setores.some(s => s.nome.toLowerCase().includes(searchQuery.toLowerCase())) :
          (user.setor?.nome || '').toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        (user.empresas ? 
          user.empresas.some(e => e.nome.toLowerCase().includes(searchQuery.toLowerCase())) :
          (user.empresa?.nome || '').toLowerCase().includes(searchQuery.toLowerCase())
        ));
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && user.isActive !== false) ||
        (statusFilter === 'inactive' && user.isActive === false);
      
      const matchesRole = 
        roleFilter === 'all' || 
        (roleFilter === 'admin' && user.role === 'admin') || 
        (roleFilter === 'agent' && (user.role === 'agent' || user.role === 'attendant'));
      
      const matchesSector =
        sectorFilter === '' || 
        (user.setores ? 
          user.setores.some(s => s.id === sectorFilter || s.setorId === sectorFilter) :
          (user.setor?.id === sectorFilter || user.setor?.setorId === sectorFilter)
        );
      
      const matchesCompany =
        companyFilter === '' ||
        (user.empresas ? 
          user.empresas.some(e => e.id === companyFilter || e.empresaId === companyFilter) :
          (user.empresa?.id === companyFilter || user.empresa?.empresaId === companyFilter)
        );
      
      return matchesSearch && matchesStatus && matchesRole && matchesSector && matchesCompany;
    });
  }, [users, searchQuery, statusFilter, roleFilter, sectorFilter, companyFilter]);

  const getEmpresasDisplay = (user) => {
    if (user.empresas && user.empresas.length > 0) {
      return user.empresas.map(e => e.nome).join(', ');
    }
    return user.empresa?.nome || '—';
  };

  const getSetoresDisplay = (user) => {
    if (user.setores && user.setores.length > 0) {
      return user.setores.map(s => s.nome).join(', ');
    }
    return user.setor?.nome || (user.role === 'admin' ? 'Todos' : '—');
  };
  
  if (!user || !userProfile || userProfile.role !== 'admin') {
    return (
      <div className="p-4 sm:p-6 bg-[#070b11] text-white min-h-screen">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold mb-4">Acesso Restrito</h2>
          <p className="text-slate-400">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-visible {
            scrollbar-width: thin;
            scrollbar-color: #10b981 #1f2937;
          }
          
          .scrollbar-visible::-webkit-scrollbar {
            height: 8px;
          }
          
          .scrollbar-visible::-webkit-scrollbar-track {
            background: #1f2937;
            border-radius: 4px;
          }
          
          .scrollbar-visible::-webkit-scrollbar-thumb {
            background: #10b981;
            border-radius: 4px;
            border: 1px solid #1f2937;
          }
          
          .scrollbar-visible::-webkit-scrollbar-thumb:hover {
            background: #059669;
          }
        `
      }} />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-3 sm:p-4 lg:p-6 bg-[#070b11] min-h-screen"
      >
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 lg:mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
            <User className="h-5 w-5 lg:h-6 lg:w-6 text-[#10b981] flex-shrink-0" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#10b981] to-[#059669] min-w-0">
              Gerenciamento de Usuários
            </span>
            <span className="text-xs sm:text-sm text-slate-400 whitespace-nowrap">
              ({totalUserCount})
            </span>
          </h1>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 justify-end flex-wrap">
          <button 
            onClick={refreshUserList}
            className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-slate-700/30 rounded-lg transition-colors min-w-0"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Atualizar</span>
          </button>
          
          <ExportToCsv users={filteredUsers} />
          
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#10b981] to-[#059669] text-white rounded-lg hover:opacity-90 transition-colors text-xs sm:text-sm"
          >
            <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span>Novo</span>
          </button>
        </div>
      </div>
      
      <div className="mb-4 lg:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar usuários..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2.5 sm:py-3 pl-10 pr-12 text-white text-sm sm:text-base focus:outline-none focus:border-[#10b981]/50 focus:ring-[#10b981]/30 focus-visible:ring-[#10b981]/30"
          />
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full md:hidden transition-colors ${showFilters ? 'text-white bg-slate-700/30' : ''}`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden md:hidden"
          >
            <div className="space-y-3 bg-[#0f1621] p-3 rounded-lg border border-[#1f2937]/40">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 min-w-0 bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#10b981]/50"
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="flex-1 min-w-0 bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#10b981]/50"
                  >
                    <option value="all">Todas as funções</option>
                    <option value="admin">Administradores</option>
                    <option value="agent">Atendentes</option>
                  </select>
                </div>
                
                {sectors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <select
                      value={sectorFilter}
                      onChange={(e) => setSectorFilter(e.target.value)}
                      className="flex-1 min-w-0 bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#10b981]/50"
                    >
                      <option value="">Todos os setores</option>
                      {sectors.map(sector => (
                        <option key={sector.id || sector.setorId} value={sector.id || sector.setorId}>
                          {sector.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {companies.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="flex-1 min-w-0 bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#10b981]/50"
                    >
                      <option value="">Todas as empresas</option>
                      {companies.map(company => (
                        <option key={company.id || company.empresaId} value={company.id || company.empresaId}>
                          {company.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 min-w-0 bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#10b981]/50"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 min-w-0 bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#10b981]/50"
          >
            <option value="all">Todas as funções</option>
            <option value="admin">Administradores</option>
            <option value="agent">Atendentes</option>
          </select>
        </div>
        
        {sectors.length > 0 && (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="flex-1 min-w-0 bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#10b981]/50"
            >
              <option value="">Todos os setores</option>
              {sectors.map(sector => (
                <option key={sector.id || sector.setorId} value={sector.id || sector.setorId}>
                  {sector.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {companies.length > 0 && (
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="flex-1 min-w-0 bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#10b981]/50"
            >
              <option value="">Todas as empresas</option>
              {companies.map(company => (
                <option key={company.id || company.empresaId} value={company.id || company.empresaId}>
                  {company.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981]"></div>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0f1621] rounded-xl overflow-hidden shadow-md border border-[#1f2937]/40"
            >
              <div className="overflow-x-auto scrollbar-visible">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-[#101820] text-slate-300 border-b border-[#1f2937]/40">
                    <tr>
                      <th className="py-3 px-4 font-medium">Usuário</th>
                      <th className="py-3 px-4 font-medium">Email</th>
                      <th className="py-3 px-4 font-medium">Função</th>
                      <th className="py-3 px-4 font-medium">Setores</th>
                      <th className="py-3 px-4 font-medium">Empresas</th>
                      <th className="py-3 px-4 text-center font-medium">Status</th>
                      <th className="py-3 px-4 text-center font-medium hidden lg:table-cell">Atividade</th>
                      <th className="py-3 px-4 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2937]/40">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 px-4 text-center text-slate-400">
                          {searchQuery || statusFilter !== 'all' || roleFilter !== 'all' || sectorFilter !== '' || companyFilter !== '' 
                            ? 'Nenhum usuário encontrado para esta busca' 
                            : 'Nenhum usuário cadastrado'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-[#101820] transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center min-w-0">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white text-sm mr-3 flex-shrink-0">
                                {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : <User className="h-4 w-4" />}
                              </div>
                              <span className="font-medium text-white truncate">{user.displayName || 'Usuário'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <div className="truncate max-w-xs" title={user.email}>
                              {user.email}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {user.role === 'admin' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                                <ShieldCheck className="mr-1 h-3 w-3 flex-shrink-0" />
                                <span className="truncate">Admin</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                <UserCog className="mr-1 h-3 w-3 flex-shrink-0" />
                                <span className="truncate">Atendente</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <div className="truncate max-w-xs" title={getSetoresDisplay(user)}>
                              {getSetoresDisplay(user)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <div className="truncate max-w-xs" title={getEmpresasDisplay(user)}>
                              {getEmpresasDisplay(user)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {user.isActive !== false ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30">
                                <UserCheck className="mr-1 h-3 w-3 flex-shrink-0" />
                                <span className="truncate">Ativo</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                                <UserX className="mr-1 h-3 w-3 flex-shrink-0" />
                                <span className="truncate">Inativo</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center hidden lg:table-cell">
                            <ActivityStatus lastUpdate={user.lastUpdate} isActive={user.isActive} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditModal(user)}
                                className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                title="Editar usuário"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => handleToggleUserStatus(user.id, user.isActive !== false)}
                                className={`p-1.5 ${
                                  user.isActive !== false 
                                    ? 'text-amber-400 hover:bg-amber-400/10' 
                                    : 'text-[#10b981] hover:bg-[#10b981]/10'
                                } rounded transition-colors`}
                                title={user.isActive !== false ? 'Desativar usuário' : 'Ativar usuário'}
                              >
                                {user.isActive !== false ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleSendPasswordReset(user.email)}
                                className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
                                title="Enviar redefinição de senha"
                              >
                                <Lock className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => handleOpenDeleteModal(user)}
                                className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                title="Excluir usuário"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
          
          <div className="md:hidden space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="bg-[#0f1621] rounded-lg border border-[#1f2937]/40 p-6 text-center text-slate-400">
                {searchQuery || statusFilter !== 'all' || roleFilter !== 'all' || sectorFilter !== '' || companyFilter !== ''
                  ? 'Nenhum usuário encontrado para esta busca' 
                  : 'Nenhum usuário cadastrado'}
              </div>
            ) : (
              filteredUsers.map(user => (
                <UserCard 
                  key={user.id}
                  user={user}
                  onEdit={handleOpenEditModal}
                  onToggleStatus={handleToggleUserStatus}
                  onSendReset={handleSendPasswordReset}
                  onDelete={handleOpenDeleteModal}
                />
              ))
            )}
          </div>
        </>
      )}
      
      <AnimatePresence>
        {isDeleteModalOpen && userToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && handleCloseDeleteModal()}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0f1621] rounded-xl p-4 sm:p-6 w-full max-w-md shadow-lg border border-[#1f2937]/40 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="truncate">Excluir Usuário</span>
              </h2>
              
              <div className="mb-5 sm:mb-6">
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white text-lg mr-3 flex-shrink-0">
                    {userToDelete.displayName ? userToDelete.displayName.substring(0, 2).toUpperCase() : <User className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white truncate">{userToDelete.displayName || 'Usuário'}</div>
                    <div className="text-sm text-slate-400 truncate">{userToDelete.email}</div>
                  </div>
                </div>
                
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 sm:p-4">
                  <p className="text-red-400 text-sm sm:text-base">
                    Tem certeza que deseja excluir este usuário? Esta ação não poderá ser desfeita.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors order-2 sm:order-1"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 order-1 sm:order-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white"></div>
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isEditModalOpen && editingUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && handleCloseEditModal()}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0f1621] rounded-xl p-4 sm:p-6 w-full max-w-lg shadow-lg border border-[#1f2937]/40 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Edit className="h-5 w-5 text-[#10b981] flex-shrink-0" />
                <span className="truncate">Editar Usuário</span>
              </h2>
              
              <div className="mb-4">
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white text-lg mr-3 flex-shrink-0">
                    {editingUser.displayName ? editingUser.displayName.substring(0, 2).toUpperCase() : <User className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white truncate">{editingUser.displayName || 'Usuário'}</div>
                    <div className="text-sm text-slate-400 truncate">{editingUser.email}</div>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleUpdateUser}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="role" className="block text-slate-300 mb-1 text-sm">Função</label>
                    <select
                      id="role"
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                      className="w-full bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[#10b981]/50 focus-visible:ring-[#10b981]/30"
                    >
                      <option value="agent">Atendente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  
                  {companies.length > 0 && (
                    <div>
                      <label className="block text-slate-300 mb-2 text-sm">Empresas</label>
                      <div className="bg-[#101820] border border-[#1f2937]/40 rounded-lg p-3 max-h-32 overflow-y-auto">
                        {companies.map(company => (
                          <label key={company.id || company.empresaId} className="flex items-center py-1">
                            <input
                              type="checkbox"
                              checked={editFormData.companies.includes(company.id || company.empresaId)}
                              onChange={() => handleCompanyToggle(company.id || company.empresaId, true)}
                              className="mr-2 flex-shrink-0"
                            />
                            <span className="text-white truncate">{company.nome}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {editFormData.role === 'agent' && sectors.length > 0 && (
                    <div>
                      <label className="block text-slate-300 mb-2 text-sm">Setores</label>
                      <div className="bg-[#101820] border border-[#1f2937]/40 rounded-lg p-3 max-h-32 overflow-y-auto">
                        {sectors.map(sector => (
                          <label key={sector.id || sector.setorId} className="flex items-center py-1">
                            <input
                              type="checkbox"
                              checked={editFormData.sectors.includes(sector.id || sector.setorId)}
                              onChange={() => handleSectorToggle(sector.id || sector.setorId, true)}
                              className="mr-2 flex-shrink-0"
                            />
                            <span className="text-white truncate">{sector.nome}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {editFormData.role === 'admin' && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-sm text-purple-400">
                      <p>Administradores têm acesso a todos os setores e funcionalidades do sistema.</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-slate-300 mb-1 text-sm">Status</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isActive"
                          checked={editFormData.isActive}
                          onChange={() => setEditFormData({ ...editFormData, isActive: true })}
                          className="mr-2"
                        />
                        <span className="text-slate-300">Ativo</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isActive"
                          checked={!editFormData.isActive}
                          onChange={() => setEditFormData({ ...editFormData, isActive: false })}
                          className="mr-2"
                        />
                        <span className="text-slate-300">Inativo</span>
                      </label>
                    </div>
                  </div>
                  
                  {editFormData.role === 'admin' && (
                    <div>
                      <label className="block text-slate-300 mb-2 text-sm">Permissões Especiais</label>
                      <div className="bg-[#101820] border border-[#1f2937]/40 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                        {availablePermissions.map(permission => (
                          <label key={permission.id} className="flex items-start py-1.5 px-1">
                            <input
                              type="checkbox"
                              checked={(editFormData.permissions || []).includes(permission.id)}
                              onChange={() => handlePermissionToggle(permission.id, true)}
                              className="mr-2 mt-0.5 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 text-white">
                                <permission.icon className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                                <span className="truncate">{permission.name}</span>
                              </div>
                              <p className="text-xs text-slate-400">{permission.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors order-2 sm:order-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-90 text-white rounded-lg transition-colors order-1 sm:order-2"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && handleCloseCreateModal()}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0f1621] rounded-xl p-4 sm:p-6 w-full max-w-4xl shadow-lg border border-[#1f2937]/40 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#10b981] flex-shrink-0" />
                <span className="truncate">Criar Novo Usuário</span>
              </h2>
              
              <form onSubmit={handleCreateUser}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-white">Informações Pessoais</h3>
                    
                    <div>
                      <label htmlFor="fullName" className="block text-slate-300 mb-1 text-sm">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 flex-shrink-0" />
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder="Nome completo"
                          value={createFormData.fullName}
                          onChange={handleCreateFormChange}
                          className="w-full bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-[#10b981]/50 focus-visible:ring-[#10b981]/30"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-slate-300 mb-1 text-sm">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 flex-shrink-0" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Email corporativo"
                          value={createFormData.email}
                          onChange={handleCreateFormChange}
                          className="w-full bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-[#10b981]/50 focus-visible:ring-[#10b981]/30"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="phoneNumber" className="block text-slate-300 mb-1 text-sm">Telefone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 flex-shrink-0" />
                        <input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={createFormData.phoneNumber}
                          onChange={handleCreateFormChange}
                          className="w-full bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-[#10b981]/50 focus-visible:ring-[#10b981]/30"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-white">Informações de Acesso</h3>
                    
                    <div>
                      <label htmlFor="password" className="block text-slate-300 mb-1 text-sm">Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 flex-shrink-0" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Senha segura"
                          value={createFormData.password}
                          onChange={handleCreateFormChange}
                          className="w-full bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-[#10b981]/50 focus-visible:ring-[#10b981]/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {createFormData.password && (
                        <div className="mt-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`} 
                                style={{ width: `${(passwordStrength / 5) * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs ml-2 ${
                              passwordStrength <= 1 ? 'text-red-400' : 
                              passwordStrength <= 3 ? 'text-amber-400' : 
                              'text-green-400'
                            }`}>
                              {getPasswordStrengthLabel()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-slate-300 mb-1 text-sm">Confirmar Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 flex-shrink-0" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirme a senha"
                          value={createFormData.confirmPassword}
                          onChange={handleCreateFormChange}
                          className="w-full bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-[#10b981]/50 focus-visible:ring-[#10b981]/30"
                        />
                        
                        {createFormData.confirmPassword && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {createFormData.password === createFormData.confirmPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="role" className="block text-slate-300 mb-1 text-sm">Função</label>
                      <select
                        id="role"
                        name="role"
                        value={createFormData.role}
                        onChange={handleCreateFormChange}
                        className="w-full bg-[#101820] border border-[#1f2937]/40 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[#10b981]/50 focus-visible:ring-[#10b981]/30"
                      >
                        <option value="agent">Atendente</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-slate-300 mb-1 text-sm">Status</label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="isActive"
                            checked={createFormData.isActive}
                            onChange={() => setCreateFormData(prev => ({ ...prev, isActive: true }))}
                            className="mr-2"
                          />
                          <span className="text-slate-300">Ativo</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="isActive"
                            checked={!createFormData.isActive}
                            onChange={() => setCreateFormData(prev => ({ ...prev, isActive: false }))}
                            className="mr-2"
                          />
                          <span className="text-slate-300">Inativo</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 space-y-4">
                  {companies.length > 0 && (
                    <div>
                      <label className="block text-slate-300 mb-2 text-sm">Empresas</label>
                      <div className="bg-[#101820] border border-[#1f2937]/40 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {companies.map(company => (
                            <label key={company.id || company.empresaId} className="flex items-center py-1">
                              <input
                                type="checkbox"
                                checked={createFormData.companies.includes(company.id || company.empresaId)}
                                onChange={() => handleCompanyToggle(company.id || company.empresaId)}
                                className="mr-2 flex-shrink-0"
                              />
                              <span className="text-white text-sm truncate">{company.nome}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {createFormData.role === 'agent' && sectors.length > 0 && (
                    <div>
                      <label className="block text-slate-300 mb-2 text-sm">Setores</label>
                      <div className="bg-[#101820] border border-[#1f2937]/40 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {sectors.map(sector => (
                            <label key={sector.id || sector.setorId} className="flex items-center py-1">
                              <input
                                type="checkbox"
                                checked={createFormData.sectors.includes(sector.id || sector.setorId)}
                                onChange={() => handleSectorToggle(sector.id || sector.setorId)}
                                className="mr-2 flex-shrink-0"
                              />
                              <span className="text-white text-sm truncate">{sector.nome}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {createFormData.role === 'admin' && (
                    <>
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-sm text-purple-400 flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p>Administradores têm acesso a todos os setores e funcionalidades do sistema.</p>
                      </div>
                      
                      <div>
                        <label className="block text-slate-300 mb-2 text-sm">Permissões Especiais</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#101820] border border-[#1f2937]/40 rounded-lg p-3 max-h-48 overflow-y-auto">
                          {availablePermissions.map(permission => (
                            <label key={permission.id} className="flex items-start py-1.5 px-2">
                              <input
                                type="checkbox"
                                checked={(createFormData.permissions || []).includes(permission.id)}
                                onChange={() => handlePermissionToggle(permission.id)}
                                className="mr-2 mt-0.5 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 text-white">
                                  <permission.icon className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                                  <span className="text-sm truncate">{permission.name}</span>
                                </div>
                                <p className="text-xs text-slate-400">{permission.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mt-4 sm:mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-400">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Dicas para uma senha forte:</p>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-xs sm:text-sm">
                        <li>Use no mínimo 8 caracteres</li>
                        <li>Inclua pelo menos uma letra maiúscula</li>
                        <li>Inclua pelo menos um número</li>
                        <li>Inclua pelo menos um caractere especial (ex: !@#$%)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors order-2 sm:order-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-90 text-white rounded-lg transition-colors flex items-center justify-center gap-2 order-1 sm:order-2"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white"></div>
                        <span>Criando...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Criar Usuário</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </>
  );
};

export default UserManagement;