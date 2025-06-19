import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db, timestamp } from "../firebase/config";
import { useAuthContext } from "./useAuthContext";

const ACCOUNT_STATUS_KEY = 'flowgenie_account_status';

export const useLogin = () => {
  const [isCancelled, setIsCancelled] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [accountStatus, setAccountStatus] = useState(() => {
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
  
  const authContext = useAuthContext();

  useEffect(() => {
    if (accountStatus) {
      localStorage.setItem(ACCOUNT_STATUS_KEY, JSON.stringify(accountStatus));
    } else {
      localStorage.removeItem(ACCOUNT_STATUS_KEY);
    }
  }, [accountStatus]);

  const clearAccountStatus = () => {
    setAccountStatus(null);
    localStorage.removeItem(ACCOUNT_STATUS_KEY);
  };

  const checkAccountStatus = async (uid) => {
    if (!uid) return { hasIssue: false };
    
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.accountStatus && userData.accountStatus !== 'active') {
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
      
      return { hasIssue: false };
    } catch (err) {
      console.error("Erro ao verificar status da conta via UID:", err);
      return { hasIssue: false };
    }
  };

  const login = async (email, password) => {
    setError(null);
    clearAccountStatus();
    setIsPending(true);
    
    try {
      // Validar e limpar o email e senha antes de enviar
      if (email === undefined || email === null || typeof email !== 'string') {
        throw new Error("Email inválido");
      }
      
      if (password === undefined || password === null || typeof password !== 'string') {
        throw new Error("Senha inválida");
      }
      
      const emailClean = email.trim();
      const passwordClean = password.trim();
      
      if (!emailClean) {
        throw new Error("Email não pode estar vazio");
      }
      
      if (!passwordClean) {
        throw new Error("Senha não pode estar vazia");
      }
      
      // Primeiro, tente fazer login com Firebase
      const res = await signInWithEmailAndPassword(auth, emailClean, passwordClean);

      if (!res) {
        throw new Error("Falha no login");
      }
      
      localStorage.setItem('userId', res.user.uid);
      
      try {
        const token = await res.user.getIdToken();
        localStorage.setItem('authToken', token);
        localStorage.setItem('apiToken', import.meta.env.VITE_API_TOKEN || '');
      } catch (tokenErr) {
        console.error("Erro ao obter token:", tokenErr);
      }
      
      const accountCheck = await checkAccountStatus(res.user.uid);
      
      if (accountCheck.hasIssue) {
        await auth.signOut();
        setAccountStatus(accountCheck.statusDetails);
        setIsPending(false);
        return { error: true, accountStatus: accountCheck.statusDetails };
      }

      try {
        const userDocRef = doc(db, "users", res.user.uid);
        await updateDoc(userDocRef, {
          online: true,
          lastLogin: timestamp
        });
      } catch (updateErr) {
        console.error("Erro não crítico ao atualizar status online:", updateErr);
      }

      // Agora, use o login do contexto de autenticação com os valores limpos
      if (authContext && authContext.login) {
        await authContext.login(emailClean, passwordClean);
      }

      setIsPending(false);
      setError(null);
      
      return { success: true };
      
    } catch (err) {
      console.error("Erro durante o login:", err.code, err.message);
      
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
          if (err.message.includes('invalid-email') || err.message.includes('invalid-value')) {
            errorMessage = "Formato de email inválido.";
          } else {
            errorMessage = err.message || "Falha no login. Tente novamente.";
          }
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