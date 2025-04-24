import { createContext, useReducer, useEffect, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import apiService from "../services/api";

// Criando o contexto
export const AuthContext = createContext();

// Ações do reducer
const AUTH_ACTIONS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  AUTH_IS_READY: "AUTH_IS_READY",
  AUTH_ERROR: "AUTH_ERROR",
  SET_USER_PROFILE: "SET_USER_PROFILE"
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
    default:
      return state;
  }
};

// Estado inicial
const initialState = {
  user: null,
  userProfile: null,
  authIsReady: false,
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
    setUserProfile: (profile) => dispatch({ type: AUTH_ACTIONS.SET_USER_PROFILE, payload: profile })
  }), []);

  // Salvar dados básicos no localStorage para fallback
  const saveUserToLocalStorage = (user, userData) => {
    if (user) {
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('userEmail', user.email);
      
      if (userData) {
        localStorage.setItem('userName', userData.nome || 'Usuário');
        localStorage.setItem('userDisplayName', userData.nomeExibicao || userData.nome || 'Usuário');
        localStorage.setItem('userRole', userData.role || 'representante');
        localStorage.setItem('userSector', userData.setor || 'Suporte');
      }
    }
  };

  // Função para sincronizar usuário com o backend
  const syncUserWithBackend = async (user) => {
    if (!user) return null;
    
    try {
      console.log("Sincronizando usuário com o backend...");
      
      // Obter token do Firebase
      const token = await user.getIdToken(true);
      localStorage.setItem('authToken', token);
      
      // Sincronizar com o backend
      const response = await apiService.syncUser();
      
      if (response) {
        actions.setUserProfile(response.usuario);
        saveUserToLocalStorage(user, response.usuario);
      }
      
      return response?.usuario;
    } catch (error) {
      console.error('Erro ao sincronizar usuário:', error);
      
      // Tentar recuperar dados do localStorage como fallback
      const fallbackProfile = {
        id: localStorage.getItem('userId') || user.uid,
        nome: localStorage.getItem('userName') || user.displayName || 'Usuário',
        nomeExibicao: localStorage.getItem('userDisplayName') || user.displayName || 'Usuário',
        email: localStorage.getItem('userEmail') || user.email,
        role: localStorage.getItem('userRole') || 'representante',
        setor: localStorage.getItem('userSector') || 'Suporte'
      };
      
      actions.setUserProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  // Função para revalidar autenticação (forçar novo token)
  const revalidateAuth = async () => {
    if (auth.currentUser) {
      try {
        // Forçar obtenção de um novo token do Firebase
        const token = await auth.currentUser.getIdToken(true);
        localStorage.setItem('authToken', token);
        return true;
      } catch (error) {
        console.error('Erro ao revalidar autenticação:', error);
        return false;
      }
    }
    return false;
  };

  // Monitorar mudanças de auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      actions.setAuthReady(user);
      
      if (user) {
        // Sincronizar perfil do usuário quando autenticado
        await syncUserWithBackend(user);
      } else {
        // Limpar dados locais quando deslogado
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userDisplayName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userSector');
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
        // Renovar token JWT se necessário
        await revalidateAuth();
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      }
    }, 10 * 60 * 1000); // 10 minutos
    
    return () => clearInterval(tokenInterval);
  }, [state.user]);

  // Valores do contexto
  const value = {
    // Estado atual
    user: state.user,
    userProfile: state.userProfile,
    authIsReady: state.authIsReady,
    error: state.error,
    
    // Propriedades derivadas
    isAdmin: state.userProfile?.role === 'admin',
    userSetor: state.userProfile?.setor,
    
    // Ações úteis
    actions,
    
    // Firebase auth instance (pode ser útil em alguns casos)
    auth,
    
    // Helpers
    isAuthenticated: !!state.user,
    
    // Funções de autenticação
    revalidateAuth,
    syncUserWithBackend,
    
    // Funções de perfil
    updateProfile: async (data) => {
      try {
        const updatedProfile = await apiService.updateProfile(data);
        if (updatedProfile) {
          actions.setUserProfile(updatedProfile);
          saveUserToLocalStorage(state.user, updatedProfile);
        }
        return updatedProfile;
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        actions.setError('Falha ao atualizar perfil. Tente novamente.');
        throw error;
      }
    },
    
    // Dispatch original (caso seja necessário)
    dispatch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}