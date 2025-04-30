import { createContext, useReducer, useEffect, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { multiflowApi } from "../services/multiflowApi";
import { shouldHaveFullAccess, processSetoresResponseForAdmin } from "./AdminSetorAccess";

// Criando o contexto
export const AuthContext = createContext();

// Ações do reducer
const AUTH_ACTIONS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  AUTH_IS_READY: "AUTH_IS_READY",
  AUTH_ERROR: "AUTH_ERROR",
  SET_USER_PROFILE: "SET_USER_PROFILE",
  SET_USER_SECTORS: "SET_USER_SECTORS",
  SET_SYNC_STATUS: "SET_SYNC_STATUS"
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN:
      return { 
        ...state, 
        user: action.payload,
        error: null 
      };
    case AUTH_ACTIONS.LOGOUT:
      return { 
        ...state, 
        user: null,
        userProfile: null,
        sectors: [],
        syncStatus: null,
        error: null 
      };
    case AUTH_ACTIONS.AUTH_IS_READY:
      return { 
        ...state, 
        user: action.payload, 
        authIsReady: true,
        error: null
      };
    case AUTH_ACTIONS.AUTH_ERROR:
      return {
        ...state,
        error: action.payload
      };
    case AUTH_ACTIONS.SET_USER_PROFILE:
      return {
        ...state,
        userProfile: action.payload,
        error: null
      };
    case AUTH_ACTIONS.SET_USER_SECTORS:
      return {
        ...state,
        sectors: action.payload,
        error: null
      };
    case AUTH_ACTIONS.SET_SYNC_STATUS:
      return {
        ...state,
        syncStatus: action.payload
      };
    default:
      return state;
  }
};

// Estado inicial
const initialState = {
  user: null,
  userProfile: null,
  sectors: [],
  authIsReady: false,
  syncStatus: null,
  error: null
};

// Provider Component
export function AuthContextProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Ações comuns empacotadas em funções
  const actions = useMemo(() => ({
    login: (user) => dispatch({ type: AUTH_ACTIONS.LOGIN, payload: user }),
    logout: () => {
      localStorage.removeItem('authToken');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    },
    setError: (error) => dispatch({ type: AUTH_ACTIONS.AUTH_ERROR, payload: error }),
    setAuthReady: (user) => dispatch({ type: AUTH_ACTIONS.AUTH_IS_READY, payload: user }),
    setUserProfile: (profile) => dispatch({ type: AUTH_ACTIONS.SET_USER_PROFILE, payload: profile }),
    setUserSectors: (sectors) => dispatch({ type: AUTH_ACTIONS.SET_USER_SECTORS, payload: sectors }),
    setSyncStatus: (status) => dispatch({ type: AUTH_ACTIONS.SET_SYNC_STATUS, payload: status })
  }), []);

  // Salvar dados no localStorage para fallback
  const saveUserToLocalStorage = (user, userData) => {
    if (user) {
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('userEmail', user.email);
      
      if (userData) {
        localStorage.setItem('userName', userData.displayName || userData.name || 'Usuário');
        localStorage.setItem('userDisplayName', userData.displayName || userData.name || 'Usuário');
        localStorage.setItem('userRole', userData.role || 'agent');
        
        // Salvar token da API para uso consistente
        if (import.meta.env.VITE_API_TOKEN) {
          localStorage.setItem('apiToken', import.meta.env.VITE_API_TOKEN);
        }
        
        // Dados do setor (se existirem)
        if (userData.setor) {
          localStorage.setItem('userSectorId', userData.setor.id || '');
          localStorage.setItem('userSectorName', userData.setor.nome || '');
        } else {
          localStorage.setItem('userSectorId', '');
          localStorage.setItem('userSectorName', '');
        }
      }
    }
  };

  // Buscar setores disponíveis
  const fetchUserSectors = async (userId) => {
    try {
      console.log(`Buscando setores para o usuário: ${userId}`);
      actions.setSyncStatus({ status: 'syncing', message: 'Buscando setores...' });
      
      const response = await multiflowApi.getSetores(userId);
      const userProfile = state.userProfile;
      
      // Processar a resposta para usuários admin
      const processedResponse = processSetoresResponseForAdmin(response, userProfile);
      
      if (processedResponse.success && Array.isArray(processedResponse.data)) {
        console.log(`${processedResponse.data.length} setores encontrados`);
        actions.setUserSectors(processedResponse.data);
        actions.setSyncStatus({ 
          status: 'success', 
          message: `${processedResponse.data.length} setores encontrados`,
          timestamp: new Date().toISOString()
        });
        return processedResponse.data;
      } else {
        console.log('Nenhum setor encontrado');
        
        // Se for um usuário admin, criar um setor virtual mesmo que a resposta falhe
        if (userProfile && shouldHaveFullAccess(userProfile)) {
          const adminSectors = [
            {
              _id: 'admin-all-sectors',
              id: 'admin-all-sectors',
              nome: 'Todos os Setores',
              descricao: 'Acesso administrativo a todos os setores',
              responsavel: 'Administrador',
              ativo: true
            }
          ];
          
          console.log('Criando setor virtual para administrador');
          actions.setUserSectors(adminSectors);
          actions.setSyncStatus({ 
            status: 'success', 
            message: 'Acesso administrativo configurado',
            timestamp: new Date().toISOString()
          });
          
          return adminSectors;
        }
        
        actions.setUserSectors([]);
        actions.setSyncStatus({ 
          status: 'warning', 
          message: 'Nenhum setor encontrado',
          timestamp: new Date().toISOString()
        });
        return [];
      }
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
      
      // Se for um usuário admin, criar um setor virtual mesmo que ocorra erro
      if (state.userProfile && shouldHaveFullAccess(state.userProfile)) {
        const adminSectors = [
          {
            _id: 'admin-all-sectors',
            id: 'admin-all-sectors',
            nome: 'Todos os Setores',
            descricao: 'Acesso administrativo a todos os setores',
            responsavel: 'Administrador',
            ativo: true
          }
        ];
        
        console.log('Criando setor virtual para administrador após erro');
        actions.setUserSectors(adminSectors);
        actions.setSyncStatus({ 
          status: 'success', 
          message: 'Acesso administrativo configurado',
          timestamp: new Date().toISOString()
        });
        
        return adminSectors;
      }
      
      actions.setSyncStatus({ 
        status: 'error', 
        message: `Erro ao buscar setores: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      return [];
    }
  };

  // Sincroniza dados do setor do usuário com a API
  const syncUserSector = async (userProfile) => {
    if (!userProfile) return null;
    
    // Se for admin, não precisamos sincronizar
    if (shouldHaveFullAccess(userProfile)) {
      console.log('Usuário administrador com acesso total, pulando sincronização de setor');
      return {
        _id: 'admin-all-sectors',
        id: 'admin-all-sectors',
        nome: 'Todos os Setores',
        descricao: 'Acesso administrativo a todos os setores',
        responsavel: 'Administrador',
        ativo: true
      };
    }
    
    if (!userProfile.setor) return null;
    
    try {
      const userId = userProfile.id;
      const setorData = userProfile.setor;
      
      actions.setSyncStatus({ status: 'syncing', message: 'Sincronizando setor do usuário...' });
      
      console.log('Verificando se o setor existe na API:', setorData);
      
      // Buscar setor pelo ID (se existir)
      if (setorData._id) {
        const setorResponse = await multiflowApi.getSetorById(setorData._id, userId);
        
        // Se o setor existir, retornar
        if (setorResponse.success && setorResponse.data) {
          console.log('Setor encontrado na API:', setorResponse.data);
          actions.setSyncStatus({ 
            status: 'success', 
            message: 'Setor sincronizado com sucesso',
            timestamp: new Date().toISOString()
          });
          return setorResponse.data;
        }
      }
      
      // Se chegou aqui, o setor não existe ou não foi possível encontrá-lo
      // Tentar criar o setor
      console.log('Criando setor na API:', setorData);
      
      const createResponse = await multiflowApi.createSetor({
        nome: setorData.nome,
        descricao: setorData.descricao,
        responsavel: setorData.responsavel,
        ativo: setorData.ativo
      }, userId);
      
      if (createResponse.success && createResponse.data) {
        console.log('Setor criado com sucesso na API:', createResponse.data);
        
        // Atualizar o ID do setor no Firestore
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          'setor._id': createResponse.data._id,
          syncStatus: "success",
          lastSyncAttempt: new Date()
        });
        
        actions.setSyncStatus({ 
          status: 'success', 
          message: 'Novo setor criado e sincronizado com sucesso',
          timestamp: new Date().toISOString()
        });
        
        return createResponse.data;
      } else {
        throw new Error(createResponse.error || 'Falha ao criar setor');
      }
    } catch (error) {
      console.error('Erro ao sincronizar setor do usuário:', error);
      
      actions.setSyncStatus({ 
        status: 'error', 
        message: `Erro ao sincronizar setor: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      return null;
    }
  };

  // Função para atualizar setor do usuário
  const updateUserSector = async (userId, setorData) => {
    // Se for admin, não permitir alteração de setor
    if (state.userProfile && shouldHaveFullAccess(state.userProfile)) {
      console.log('Usuário administrador não precisa alterar setor');
      return {
        success: true,
        setor: {
          _id: 'admin-all-sectors',
          id: 'admin-all-sectors',
          nome: 'Todos os Setores',
          descricao: 'Acesso administrativo a todos os setores',
          responsavel: 'Administrador',
          ativo: true
        }
      };
    }
    
    try {
      if (!userId || !setorData || !setorData.nome) {
        throw new Error("ID do usuário e dados do setor são obrigatórios");
      }
      
      actions.setSyncStatus({ status: 'updating', message: 'Atualizando setor do usuário...' });
      
      // Preparar dados do setor
      const setor = {
        id: setorData.id || `setor-${Date.now()}`,
        nome: setorData.nome,
        descricao: setorData.descricao || `Setor ${setorData.nome}`,
        responsavel: setorData.responsavel || "Administrador",
        ativo: setorData.ativo !== false
      };
      
      // Atualizar documento do usuário no Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        setor: setor,
        syncStatus: "pending",
        lastSyncAttempt: new Date()
      });
      
      // Verificar se já existe um setor com este ID na API
      let apiResponse;
      if (setorData._id) {
        // Tentar atualizar o setor existente na API
        apiResponse = await multiflowApi.updateSetor(setorData._id, {
          nome: setor.nome,
          descricao: setor.descricao,
          responsavel: setor.responsavel,
          ativo: setor.ativo
        }, userId);
      } else {
        // Criar um novo setor na API
        apiResponse = await multiflowApi.createSetor({
          nome: setor.nome,
          descricao: setor.descricao,
          responsavel: setor.responsavel,
          ativo: setor.ativo
        }, userId);
      }
      
      if (apiResponse.success && apiResponse.data) {
        // Atualizar o ID do setor no Firestore com o ID da API
        await updateDoc(userRef, {
          'setor._id': apiResponse.data._id,
          syncStatus: "success",
          lastSyncAttempt: new Date()
        });
        
        actions.setSyncStatus({ 
          status: 'success', 
          message: 'Setor atualizado com sucesso',
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(apiResponse.error || 'Falha ao sincronizar setor com a API');
      }
      
      // Atualizar perfil local
      await fetchUserProfile(auth.currentUser);
      
      return {
        success: true,
        setor: {
          ...setor,
          _id: apiResponse.data?._id
        }
      };
    } catch (error) {
      console.error('Erro ao atualizar setor do usuário:', error);
      
      actions.setSyncStatus({ 
        status: 'error', 
        message: `Erro ao atualizar setor: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };

  // Função para corrigir problemas de sincronização
  const repairUserSync = async (userId) => {
    try {
      if (!userId) {
        throw new Error("ID do usuário é obrigatório");
      }
      
      actions.setSyncStatus({ status: 'repairing', message: 'Corrigindo sincronização do usuário...' });
      
      // Buscar dados do usuário no Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error(`Usuário ${userId} não encontrado`);
      }
      
      const userData = userDoc.data();
      
      // Verificar se o usuário é admin
      if (userData.role === 'admin' || userId === 'jaGLB04wZ3TgZisjIm4xN6hoIjI2') {
        console.log('Usuário admin detectado, configurando acesso privilegiado');
        
        // Para admins, apenas limpar status de sincronização
        await updateDoc(userRef, {
          syncStatus: "success",
          syncError: null,
          lastSyncAttempt: new Date()
        });
        
        // Atualizar perfil local
        await fetchUserProfile(auth.currentUser);
        
        actions.setSyncStatus({ 
          status: 'success', 
          message: 'Sincronização reparada com sucesso para usuário admin',
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          message: "Sincronização reparada com sucesso para usuário admin"
        };
      }
      
      // Verificar se o usuário tem um setor
      if (!userData.setor) {
        // Sem setor, apenas limpar status de sincronização
        await updateDoc(userRef, {
          syncStatus: "success",
          syncError: null,
          lastSyncAttempt: new Date()
        });
        
        actions.setSyncStatus({ 
          status: 'success', 
          message: 'Sincronização reparada com sucesso (sem setor)',
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          message: "Sincronização reparada com sucesso"
        };
      }
      
      // Com setor, sincronizar com a API
      const setorResult = await syncUserSector({
        id: userId,
        setor: userData.setor
      });
      
      // Atualizar documento do usuário com resultado da sincronização
      if (setorResult) {
        await updateDoc(userRef, {
          'setor._id': setorResult._id,
          syncStatus: "success",
          syncError: null,
          lastSyncAttempt: new Date()
        });
      } else {
        // Se não conseguiu sincronizar, pelo menos limpar o status de erro
        await updateDoc(userRef, {
          syncStatus: "warning",
          syncError: "Não foi possível confirmar sincronização com a API",
          lastSyncAttempt: new Date()
        });
      }
      
      // Atualizar perfil local
      await fetchUserProfile(auth.currentUser);
      
      actions.setSyncStatus({ 
        status: 'success', 
        message: 'Sincronização reparada com sucesso',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: "Sincronização reparada com sucesso",
        setorResult
      };
    } catch (error) {
      console.error('Erro ao reparar sincronização:', error);
      
      actions.setSyncStatus({ 
        status: 'error', 
        message: `Erro ao reparar sincronização: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };

  // Função para buscar perfil do usuário do Firestore
  const fetchUserProfile = async (user) => {
    if (!user) return null;
    
    try {
      // Obter dados do usuário do Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Log para depuração
        console.log('Dados do usuário obtidos do Firestore:', userData);
        if (userData.setor) {
          console.log('Dados do setor encontrados:', userData.setor);
        } else {
          console.log('Nenhum setor encontrado no documento do usuário');
        }
        
        // Criar perfil completo
        const userProfile = {
          ...userData,
          id: user.uid,
          email: user.email,
          // Garantir que o papel seja "admin" ou "agent"
          role: userData.role === 'admin' ? 'admin' : 'agent',
          // Usar displayName ou name conforme disponível
          displayName: userData.displayName || userData.name,
          // Verificar se há dados do setor
          setor: userData.setor || null
        };
        
        actions.setUserProfile(userProfile);
        saveUserToLocalStorage(user, userProfile);
        
        // Tentar buscar setores disponíveis na API
        fetchUserSectors(user.uid).catch(err => {
          console.warn('Erro ao buscar setores disponíveis:', err);
        });
        
        // Para usuários admin, ignorar erros de sincronização
        if (shouldHaveFullAccess(userProfile)) {
          console.log('Usuário administrador detectado, ignorando problemas de sincronização');
          
          // Atualizar status de sincronização no Firestore
          if (userData.syncStatus === 'error') {
            await updateDoc(userRef, {
              syncStatus: "success",
              syncError: null,
              lastSyncAttempt: new Date()
            });
          }
          
          actions.setSyncStatus({ 
            status: 'success', 
            message: 'Acesso administrativo configurado',
            timestamp: new Date().toISOString()
          });
        }
        // Verificar erros de sincronização para usuários normais
        else if (userData.syncStatus === 'error' && userData.syncError) {
          console.warn(`Usuário com erro de sincronização: ${userData.syncError}`);
          actions.setSyncStatus({ 
            status: 'error', 
            message: `Erro de sincronização: ${userData.syncError}`,
            timestamp: new Date().toISOString()
          });
        } else if (userData.setor) {
          // Se tiver setor, tentar sincronizar com a API
          try {
            await syncUserSector(userProfile);
          } catch (syncError) {
            console.error('Erro na sincronização do setor:', syncError);
            // Continua mesmo se a sincronização falhar
          }
        }
        
        return userProfile;
      } else {
        console.warn('Perfil do usuário não encontrado no Firestore');
        
        // Usar dados básicos do Firebase Auth
        const basicProfile = {
          id: user.uid,
          displayName: user.displayName || 'Usuário',
          email: user.email,
          role: 'agent',
          setor: null,
          isActive: true
        };
        
        actions.setUserProfile(basicProfile);
        saveUserToLocalStorage(user, basicProfile);
        
        return basicProfile;
      }
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      
      // Tentar recuperar dados do localStorage como fallback
      const fallbackProfile = {
        id: localStorage.getItem('userId') || user.uid,
        displayName: localStorage.getItem('userDisplayName') || user.displayName || 'Usuário',
        email: localStorage.getItem('userEmail') || user.email,
        role: localStorage.getItem('userRole') || 'agent',
        setor: localStorage.getItem('userSectorId') ? {
          id: localStorage.getItem('userSectorId'),
          nome: localStorage.getItem('userSectorName') || ''
        } : null
      };
      
      actions.setUserProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  // Monitorar mudanças de auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      actions.setAuthReady(user);
      
      if (user) {
        // Buscar o perfil do usuário do Firestore
        await fetchUserProfile(user);
        
        // Obter token do Firebase
        const token = await user.getIdToken(true);
        localStorage.setItem('authToken', token);
        
        // Garantir que o token da API também esteja no localStorage
        if (import.meta.env.VITE_API_TOKEN) {
          localStorage.setItem('apiToken', import.meta.env.VITE_API_TOKEN);
        }
      } else {
        // Limpar dados locais quando deslogado
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userDisplayName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userSectorId');
        localStorage.removeItem('userSectorName');
        localStorage.removeItem('authToken');
        localStorage.removeItem('apiToken');
      }
    });

    return () => unsubscribe();
  }, [actions]);

  // Atualizar token periodicamente
  useEffect(() => {
    if (!state.user) return;
    
    // Verificar token a cada 10 minutos
    const tokenInterval = setInterval(async () => {
      try {
        if (auth.currentUser) {
          // Renovar token JWT
          const token = await auth.currentUser.getIdToken(true);
          localStorage.setItem('authToken', token);
          
          // Garantir que o token da API também esteja no localStorage
          if (import.meta.env.VITE_API_TOKEN) {
            localStorage.setItem('apiToken', import.meta.env.VITE_API_TOKEN);
          }
        }
      } catch (error) {
        console.error('Erro ao renovar token:', error);
      }
    }, 10 * 60 * 1000); // 10 minutos
    
    return () => clearInterval(tokenInterval);
  }, [state.user]);

  // Valores do contexto
  const value = {
    // Estado atual
    user: state.user,
    userProfile: state.userProfile,
    sectors: state.sectors,
    authIsReady: state.authIsReady,
    syncStatus: state.syncStatus,
    error: state.error,
    
    // Propriedades derivadas
    isAdmin: state.userProfile?.role === 'admin',
    userSetor: state.userProfile?.setor || null,
    
    // Ações úteis
    login: actions.login,
    logout: actions.logout,
    
    // Firebase auth instance (pode ser útil em alguns casos)
    auth,
    
    // Helpers
    isAuthenticated: !!state.user,
    
    // API relacionada
    api: multiflowApi,
    
    // Funções auxiliares
    fetchUserProfile,
    fetchUserSectors,
    updateUserSector,
    repairUserSync,
    syncUserSector,
    
    // Dispatch original (caso seja necessário)
    dispatch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}