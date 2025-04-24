import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db, timestamp } from "../firebase/config";
import { useAuthContext } from "./useAuthContext";

// Chave para armazenar no localStorage
const ACCOUNT_STATUS_KEY = 'flowgenie_account_status';

export const useLogin = () => {
  const [isCancelled, setIsCancelled] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [accountStatus, setAccountStatus] = useState(() => {
    // Tentar recuperar do localStorage na inicialização
    const savedStatus = localStorage.getItem(ACCOUNT_STATUS_KEY);
    if (savedStatus) {
      try {
        return JSON.parse(savedStatus);
      } catch (err) {
        localStorage.removeItem(ACCOUNT_STATUS_KEY);
        return null;
      }
    }
    return null;
  });
  
  const { dispatch } = useAuthContext();

  // Efeito para persistir o accountStatus no localStorage quando mudar
  useEffect(() => {
    if (accountStatus) {
      localStorage.setItem(ACCOUNT_STATUS_KEY, JSON.stringify(accountStatus));
    } else {
      localStorage.removeItem(ACCOUNT_STATUS_KEY);
    }
  }, [accountStatus]);

  // Função para limpar o status da conta
  const clearAccountStatus = () => {
    setAccountStatus(null);
    localStorage.removeItem(ACCOUNT_STATUS_KEY);
  };

  // Função para verificar o status da conta pelo email antes de fazer login
  const checkAccountStatus = async (email) => {
    try {
      // Buscar usuário pelo email (agora permitido pelas regras do Firestore)
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Se encontrou um usuário com este email
        const userData = querySnapshot.docs[0].data();
        
        // Verificar status da conta
        if (userData.accountStatus && userData.accountStatus !== 'active') {
          // Conta existe mas não está ativa
          const statusDetails = {
            status: userData.accountStatus || 'inactive',
            message: userData.accountStatus === 'suspended' 
              ? "Sua conta está suspensa."
              : "Sua conta está inativa.",
            details: userData.accountStatus === 'suspended' 
              ? "Esta operação foi realizada por um administrador por possível atraso no seu pagamento da plataforma ou alguma violação dos nossos termos de uso."
              : "Sua conta foi desativada. Entre em contato com o suporte para reativá-la."
          };
          
          return { hasIssue: true, statusDetails };
        }
      }
      
      // Conta não existe ou está ativa
      return { hasIssue: false };
    } catch (err) {
      console.error("Erro ao verificar status da conta:", err);
      return { hasIssue: false }; // Em caso de erro, permitir tentativa de login normal
    }
  };

  const login = async (email, password) => {
    setError(null);
    clearAccountStatus(); // Limpar status anterior
    setIsPending(true);
    
    try {
      // VERIFICAÇÃO PRÉVIA: Verificar status da conta ANTES de tentar autenticar
      const accountCheck = await checkAccountStatus(email);
      
      if (accountCheck.hasIssue) {
        // Se a conta tem problemas, não tenta fazer login
        setAccountStatus(accountCheck.statusDetails);
        setIsPending(false);
        return { error: true, accountStatus: accountCheck.statusDetails };
      }
      
      // Continuar com o login apenas se a conta não estiver suspensa/inativa
      const res = await signInWithEmailAndPassword(auth, email, password);

      if (!res) {
        throw new Error("Falha no login");
      }

      // Verificar o status da conta no Firestore (verificação secundária)
      const userDocRef = doc(db, "users", res.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Verificação redundante (caso o status tenha mudado entre a primeira verificação e agora)
        if (userData.accountStatus && userData.accountStatus !== 'active') {
          // Se a conta não estiver ativa, fazer logout
          await auth.signOut();
          
          const statusDetails = {
            status: userData.accountStatus || 'inactive',
            message: userData.accountStatus === 'suspended' 
              ? "Sua conta está suspensa."
              : "Sua conta está inativa.",
            details: userData.accountStatus === 'suspended' 
              ? "Esta operação foi realizada por um administrador por possível violação dos termos de uso."
              : "Sua conta foi desativada. Entre em contato com o suporte para reativá-la."
          };
          
          if (!isCancelled) {
            setAccountStatus(statusDetails);
            setIsPending(false);
          }
          
          return { error: true, accountStatus: statusDetails };
        }
        
        // Atualizar o status online e último login
        await updateDoc(userDocRef, {
          online: true,
          lastLogin: timestamp
        });
      } else {
        // Se o documento não existir, criar um com status ativo
        await updateDoc(userDocRef, {
          online: true,
          id: res.user.uid,
          email: email,
          createdAt: timestamp,
          lastLogin: timestamp,
          accountStatus: 'active'
        });
      }

      // Despachar ação de login
      dispatch({ type: "LOGIN", payload: res.user });

      // Atualizar estado
      if (!isCancelled) {
        setIsPending(false);
        setError(null);
      }
      
      return { success: true };
    } catch (err) {
      console.error("Erro durante o login:", err.code, err.message);
      
      // Tratamento detalhado de erros
      let errorMessage;
      switch(err.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
          errorMessage = "Credenciais inválidas. Verifique seu email e senha.";
          break;
        case "auth/user-disabled":
          errorMessage = "Esta conta foi desativada.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Muitas tentativas. Tente novamente mais tarde.";
          break;
        case "auth/invalid-email":
          errorMessage = "Email inválido.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Erro de conexão. Verifique sua internet.";
          break;
        default:
          errorMessage = "Falha no login. Tente novamente.";
      }

      if (!isCancelled) {
        setError(errorMessage);
        setIsPending(false);
      }
      
      return { error: true, message: errorMessage };
    }
  };

  useEffect(() => () => setIsCancelled(true), []);

  return { login, error, isPending, accountStatus, clearAccountStatus };
};