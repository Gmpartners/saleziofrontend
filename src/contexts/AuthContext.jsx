import React, { createContext, useEffect, useState, useReducer } from 'react';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { multiflowApi } from '../services/multiflowApi';
import { toast } from 'sonner';

export const AuthContext = createContext();

const AUTH_ACTIONS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  AUTH_IS_READY: "AUTH_IS_READY",
  AUTH_ERROR: "AUTH_ERROR",
  SET_USER_PROFILE: "SET_USER_PROFILE",
  SET_USER_SECTORS: "SET_USER_SECTORS",
  SET_SYNC_STATUS: "SET_SYNC_STATUS",
  SET_LOADING: "SET_LOADING"
};

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
        error: null,
        authIsReady: true
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
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  userProfile: null,
  sectors: [],
  authIsReady: false,
  syncStatus: null,
  error: null,
  isLoading: false,
  apiToken: import.meta.env.VITE_API_TOKEN
};

export const AuthContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [isAdmin, setIsAdmin] = useState(false);
  const apiToken = import.meta.env.VITE_API_TOKEN;

  useEffect(() => {
    if (apiToken) {
      localStorage.setItem('apiToken', apiToken);
    }
  }, [apiToken]);

  const actions = {
    login: (user) => dispatch({ type: AUTH_ACTIONS.LOGIN, payload: user }),
    logout: () => {
      clearAllAuthData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    },
    setError: (error) => dispatch({ type: AUTH_ACTIONS.AUTH_ERROR, payload: error }),
    setAuthReady: (user) => dispatch({ type: AUTH_ACTIONS.AUTH_IS_READY, payload: user }),
    setUserProfile: (profile) => dispatch({ type: AUTH_ACTIONS.SET_USER_PROFILE, payload: profile }),
    setUserSectors: (sectors) => dispatch({ type: AUTH_ACTIONS.SET_USER_SECTORS, payload: sectors }),
    setSyncStatus: (status) => dispatch({ type: AUTH_ACTIONS.SET_SYNC_STATUS, payload: status }),
    setLoading: (loading) => dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: loading })
  };

  const clearAllAuthData = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userDisplayName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userSectorId');
    localStorage.removeItem('userSectorName');
    localStorage.removeItem('authToken');
    if (apiToken) {
      localStorage.setItem('apiToken', apiToken);
    }
    sessionStorage.clear();
  };

  const saveUserToLocalStorage = (user, userProfile) => {
    if (user && userProfile) {
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userName', userProfile.displayName || 'Usuário');
      localStorage.setItem('userDisplayName', userProfile.displayName || 'Usuário');
      localStorage.setItem('userRole', userProfile.role || 'agent');
      
      if (apiToken) {
        localStorage.setItem('apiToken', apiToken);
      }
      
      if (userProfile.empresas && userProfile.empresas.length > 0) {
        const primaryEmpresa = userProfile.empresas[0];
        localStorage.setItem('userEmpresaId', primaryEmpresa.id);
        localStorage.setItem('userEmpresaNome', primaryEmpresa.nome);
      } else if (userProfile.empresa) {
        localStorage.setItem('userEmpresaId', userProfile.empresa.id);
        localStorage.setItem('userEmpresaNome', userProfile.empresa.nome);
      }
      
      if (userProfile.setor) {
        localStorage.setItem('userSectorId', userProfile.setor.id);
        localStorage.setItem('userSectorName', userProfile.setor.nome);
      } else {
        localStorage.removeItem('userSectorId');
        localStorage.removeItem('userSectorName');
      }
    }
  };

  const login = async (email, password) => {
    actions.setLoading(true);
    actions.setError(null);

    try {
      if (!email || typeof email !== 'string') {
        throw new Error('Email inválido');
      }
      
      if (!password || typeof password !== 'string') {
        throw new Error('Senha inválida');
      }
      
      const emailClean = email.trim();
      const passwordClean = password.trim();
      
      if (!emailClean) {
        throw new Error('Email não pode estar vazio');
      }
      
      if (!passwordClean) {
        throw new Error('Senha não pode estar vazia');
      }
      
      const res = await signInWithEmailAndPassword(auth, emailClean, passwordClean);
      
      if (!res) {
        throw new Error('Login falhou');
      }
      
      localStorage.setItem('userId', res.user.uid);
      
      try {
        const token = await res.user.getIdToken(true);
        localStorage.setItem('authToken', token);
        if (apiToken) {
          localStorage.setItem('apiToken', apiToken);
        }
      } catch (tokenErr) {
        console.error('Erro ao obter token:', tokenErr);
      }
      
      actions.login(res.user);
      
      try {
        const basicProfile = {
          id: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || res.user.email.split('@')[0],
          role: 'agent',
          empresas: [],
          setores: [],
          isActive: true
        };
        
        actions.setUserProfile(basicProfile);
        saveUserToLocalStorage(res.user, basicProfile);
        
        setTimeout(() => {
          fetchUserProfile(res.user).catch(err => {
            console.warn('Erro não fatal ao buscar perfil completo:', err);
          });
        }, 100);
      } catch (profileErr) {
        console.error('Erro não fatal ao criar perfil básico:', profileErr);
      }
      
      return res.user;
    } catch (err) {
      console.error('Erro no login:', err);
      
      let errorMessage = 'Erro ao fazer login';
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'Email ou senha incorretos';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'Este usuário está desativado';
      } else if (err.code === 'auth/invalid-email' || err.message.includes('invalid-email') || err.message.includes('invalid-value')) {
        errorMessage = 'Formato de email inválido';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      actions.setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      actions.setLoading(false);
    }
  };

  const logout = async () => {
    actions.setLoading(true);
    
    try {
      await signOut(auth);
      localStorage.removeItem('userId');
      localStorage.removeItem('authToken');
      clearAllAuthData();
      actions.logout();
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
      actions.setError(err.message || 'Erro ao fazer logout');
      
      clearAllAuthData();
      actions.logout();
    } finally {
      actions.setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    actions.setLoading(true);
    actions.setError(null);
    
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      console.error('Erro ao resetar senha:', err);
      
      let errorMessage = 'Erro ao resetar senha';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'Email não encontrado';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      }
      
      actions.setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      actions.setLoading(false);
    }
  };

  const updateUserOnlineStatus = async (userId, isOnline = true) => {
    try {
      if (!userId) return;
      
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        isOnline: isOnline,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao atualizar status do usuário:', error);
    }
  };

  const updateUserLastActive = async (userId) => {
    try {
      if (!userId) return;
      
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        lastActive: serverTimestamp(),
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao atualizar última atividade do usuário:', error);
    }
  };

  const fetchUserSectors = async (userId) => {
    try {
      actions.setSyncStatus({ status: 'syncing', message: 'Buscando setores...' });
      
      const response = await multiflowApi.getSetores(userId, isAdmin);
      
      if (response.success && Array.isArray(response.data)) {
        actions.setUserSectors(response.data);
        actions.setSyncStatus({ 
          status: 'success', 
          message: `${response.data.length} setores encontrados`,
          timestamp: new Date().toISOString()
        });
        return response.data;
      } else {
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
      
      actions.setSyncStatus({ 
        status: 'error', 
        message: `Erro ao buscar setores: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      return [];
    }
  };

  const fetchUserProfile = async (user, retryCount = 0) => {
    if (!user) {
      actions.setUserProfile(null);
      setIsAdmin(false);
      return null;
    }
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const newUserData = {
          id: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          phoneNumber: user.phoneNumber || null,
          role: 'agent',
          isActive: true,
          isOnline: true,
          empresas: [],
          setores: [],
          created: serverTimestamp(),
          lastLogin: serverTimestamp(),
          lastActive: serverTimestamp(),
          lastSeen: serverTimestamp()
        };
        
        await setDoc(userDocRef, newUserData);
        
        actions.setUserProfile(newUserData);
        setIsAdmin(false);
        saveUserToLocalStorage(user, newUserData);
        return newUserData;
      }
      
      const userData = userDoc.data();
      
      await updateDoc(userDocRef, {
        lastLogin: serverTimestamp(),
        lastSeen: serverTimestamp(),
        isOnline: true
      });
      
      const isUserAdmin = userData.role === 'admin';
      setIsAdmin(isUserAdmin);
      
      actions.setUserProfile(userData);
      saveUserToLocalStorage(user, userData);
      
      try {
        fetchUserSectors(user.uid).catch(err => {
          console.warn('Erro não fatal ao buscar setores disponíveis:', err);
        });
      } catch (sectorErr) {
        console.warn('Erro não fatal na inicialização de setores:', sectorErr);
      }
      
      return userData;
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      
      if (retryCount < 2 && error.message && (error.message.includes('network') || error.message.includes('timeout'))) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(fetchUserProfile(user, retryCount + 1));
          }, 2000);
        });
      }
      
      const basicProfile = {
        id: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: 'agent',
        empresas: [],
        setores: [],
        isActive: true
      };
      
      actions.setUserProfile(basicProfile);
      setIsAdmin(false);
      saveUserToLocalStorage(user, basicProfile);
      
      return basicProfile;
    }
  };

  const updateUserSector = async (userId, setorData) => {
    try {
      if (!userId || !setorData) {
        throw new Error("ID do usuário e dados do setor são obrigatórios");
      }
      
      actions.setSyncStatus({ status: 'updating', message: 'Atualizando setor do usuário...' });
      
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error("Usuário não encontrado");
      }
      
      const userData = userDoc.data();
      
      const updatedData = {
        ...userData,
        setor: setorData,
        lastUpdate: serverTimestamp()
      };
      
      await updateDoc(userDocRef, updatedData);
      
      actions.setSyncStatus({ 
        status: 'success', 
        message: 'Setor atualizado com sucesso',
        timestamp: new Date().toISOString()
      });
      
      await fetchUserProfile(auth.currentUser);
      
      return {
        success: true,
        data: updatedData
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

  const updateUserSectors = async (userId, setoresData) => {
    try {
      if (!userId || !Array.isArray(setoresData)) {
        throw new Error("ID do usuário e array de setores são obrigatórios");
      }
      
      actions.setSyncStatus({ status: 'updating', message: 'Atualizando setores do usuário...' });
      
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error("Usuário não encontrado");
      }
      
      const userData = userDoc.data();
      
      const updatedData = {
        ...userData,
        setores: setoresData,
        setor: setoresData[0] || null,
        lastUpdate: serverTimestamp()
      };
      
      await updateDoc(userDocRef, updatedData);
      
      actions.setSyncStatus({ 
        status: 'success', 
        message: 'Setores atualizados com sucesso',
        timestamp: new Date().toISOString()
      });
      
      await fetchUserProfile(auth.currentUser);
      
      return {
        success: true,
        data: updatedData
      };
    } catch (error) {
      console.error('Erro ao atualizar setores do usuário:', error);
      
      actions.setSyncStatus({ 
        status: 'error', 
        message: `Erro ao atualizar setores: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };

  const updateUserCompanies = async (userId, empresasData) => {
    try {
      if (!userId || !Array.isArray(empresasData)) {
        throw new Error("ID do usuário e array de empresas são obrigatórios");
      }
      
      actions.setSyncStatus({ status: 'updating', message: 'Atualizando empresas do usuário...' });
      
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error("Usuário não encontrado");
      }
      
      const userData = userDoc.data();
      
      const updatedData = {
        ...userData,
        empresas: empresasData,
        empresa: empresasData[0] || null,
        lastUpdate: serverTimestamp()
      };
      
      await updateDoc(userDocRef, updatedData);
      
      actions.setSyncStatus({ 
        status: 'success', 
        message: 'Empresas atualizadas com sucesso',
        timestamp: new Date().toISOString()
      });
      
      await fetchUserProfile(auth.currentUser);
      
      return {
        success: true,
        data: updatedData
      };
    } catch (error) {
      console.error('Erro ao atualizar empresas do usuário:', error);
      
      actions.setSyncStatus({ 
        status: 'error', 
        message: `Erro ao atualizar empresas: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };

  const syncUserSector = async (userSector, userId) => {
    try {
      return await updateUserSector(userId, userSector);
    } catch (error) {
      console.error('Erro na compatibilidade syncUserSector:', error);
      return false;
    }
  };

  const repairUserSync = async (userId) => {
    try {
      if (!userId) {
        throw new Error("ID do usuário é obrigatório");
      }
      
      actions.setSyncStatus({ status: 'repairing', message: 'Corrigindo sincronização do usuário...' });
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error(`Usuário ${userId} não encontrado`);
      }
      
      const userData = userDoc.data();
      
      await updateDoc(userRef, {
        ...userData,
        syncStatus: "success",
        syncError: null,
        lastSyncAttempt: new Date(),
        lastUpdate: serverTimestamp()
      });
      
      await fetchUserProfile(auth.currentUser);
      
      actions.setSyncStatus({ 
        status: 'success', 
        message: 'Sincronização reparada com sucesso',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: "Sincronização reparada com sucesso"
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

  const getUserAccessibleSectors = () => {
    if (!state.userProfile) return [];
    
    if (state.userProfile.role === 'admin') return state.sectors || [];
    
    if (state.userProfile.setores && state.userProfile.setores.length > 0) {
      return state.userProfile.setores;
    }
    
    if (state.userProfile.setor) {
      return [state.userProfile.setor];
    }
    
    return [];
  };

  const getUserAccessibleCompanies = () => {
    if (!state.userProfile) return [];
    
    if (state.userProfile.role === 'admin') return [];
    
    if (state.userProfile.empresas && state.userProfile.empresas.length > 0) {
      return state.userProfile.empresas;
    }
    
    if (state.userProfile.empresa) {
      return [state.userProfile.empresa];
    }
    
    return [];
  };

  const canAccessSector = (sectorId) => {
    if (!state.userProfile) return false;
    
    if (state.userProfile.role === 'admin') return true;
    
    const accessibleSectors = getUserAccessibleSectors();
    return accessibleSectors.some(sector => 
      sector.id === sectorId || sector.setorId === sectorId
    );
  };

  const canAccessCompany = (companyId) => {
    if (!state.userProfile) return false;
    
    if (state.userProfile.role === 'admin') return true;
    
    const accessibleCompanies = getUserAccessibleCompanies();
    return accessibleCompanies.some(company => 
      company.id === companyId || company.empresaId === companyId
    );
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          localStorage.setItem('userId', user.uid);
          
          try {
            const token = await user.getIdToken(true);
            localStorage.setItem('authToken', token);
            if (apiToken) {
              localStorage.setItem('apiToken', apiToken);
            }
          } catch (tokenErr) {
            console.error('Erro não fatal ao obter token:', tokenErr);
          }
          
          try {
            await fetchUserProfile(user);
          } catch (profileErr) {
            console.error('Erro não fatal ao buscar perfil:', profileErr);
            
            const basicProfile = {
              id: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0],
              role: 'agent',
              empresas: [],
              setores: [],
              isActive: true
            };
            
            actions.setUserProfile(basicProfile);
            saveUserToLocalStorage(user, basicProfile);
          }
          
          actions.setAuthReady(user);
        } catch (error) {
          console.error("Erro ao processar autenticação:", error);
          
          try {
            const basicProfile = {
              id: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0],
              role: 'agent',
              empresas: [],
              setores: [],
              isActive: true
            };
            
            actions.setUserProfile(basicProfile);
            saveUserToLocalStorage(user, basicProfile);
            actions.setAuthReady(user);
          } catch (fallbackErr) {
            console.error("Erro fatal no fallback de autenticação:", fallbackErr);
            clearAllAuthData();
            actions.setAuthReady(null);
          }
        }
      } else {
        clearAllAuthData();
        actions.setAuthReady(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!state.user) return;
    
    const tokenInterval = setInterval(async () => {
      try {
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken(true);
          localStorage.setItem('authToken', token);
          if (apiToken) {
            localStorage.setItem('apiToken', apiToken);
          }
        }
      } catch (error) {
        console.error('Erro ao renovar token:', error);
      }
    }, 10 * 60 * 1000);
    
    return () => clearInterval(tokenInterval);
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ 
      ...state, 
      isAdmin,
      login, 
      logout,
      resetPassword,
      fetchUserProfile,
      fetchUserSectors,
      updateUserSector,
      updateUserSectors,
      updateUserCompanies,
      updateUserOnlineStatus,
      updateUserLastActive,
      syncUserSector,
      repairUserSync,
      getUserAccessibleSectors,
      getUserAccessibleCompanies,
      canAccessSector,
      canAccessCompany,
      isAuthenticated: !!state.user,
      auth,
      apiToken,
      api: multiflowApi,
      userSetor: state.userProfile?.setor || null,
      userSetores: state.userProfile?.setores || [],
      userEmpresa: state.userProfile?.empresa || (state.userProfile?.empresas && state.userProfile.empresas[0]) || null,
      userEmpresas: state.userProfile?.empresas || []
    }}>
      {children}
    </AuthContext.Provider>
  );
};