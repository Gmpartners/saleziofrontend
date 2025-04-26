import { createContext, useReducer, useEffect, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

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
        localStorage.setItem('userName', userData.displayName || 'Usuário');
        localStorage.setItem('userDisplayName', userData.displayName || 'Usuário');
        localStorage.setItem('userRole', userData.role || 'agent');
        localStorage.setItem('userSector', userData.sector || '');
        localStorage.setItem('userSectorName', userData.sectorName || '');
      }
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
        
        // Criar perfil completo
        const userProfile = {
          ...userData,
          id: user.uid,
          email: user.email,
          // Garantir que o papel seja "admin" ou "agent"
          role: userData.role === 'admin' ? 'admin' : 'agent',
          // Garantir que os campos de setorização existam
          sector: userData.sector || '',
          sectorName: userData.sectorName || ''
        };
        
        actions.setUserProfile(userProfile);
        saveUserToLocalStorage(user, userProfile);
        
        return userProfile;
      } else {
        console.warn('Perfil do usuário não encontrado no Firestore');
        
        // Usar dados básicos do Firebase Auth
        const basicProfile = {
          id: user.uid,
          displayName: user.displayName || 'Usuário',
          email: user.email,
          role: 'agent',
          sector: '',
          sectorName: '',
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
        sector: localStorage.getItem('userSector') || '',
        sectorName: localStorage.getItem('userSectorName') || ''
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
      } else {
        // Limpar dados locais quando deslogado
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userDisplayName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userSector');
        localStorage.removeItem('userSectorName');
        localStorage.removeItem('authToken');
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
    authIsReady: state.authIsReady,
    error: state.error,
    
    // Propriedades derivadas
    isAdmin: state.userProfile?.role === 'admin',
    userSector: state.userProfile?.sector || '',
    userSectorName: state.userProfile?.sectorName || '',
    
    // Ações úteis
    login: actions.login,
    logout: actions.logout,
    
    // Firebase auth instance (pode ser útil em alguns casos)
    auth,
    
    // Helpers
    isAuthenticated: !!state.user,
    
    // Funções auxiliares
    fetchUserProfile,
    
    // Dispatch original (caso seja necessário)
    dispatch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}