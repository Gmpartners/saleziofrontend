import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { useAuthContext } from "./useAuthContext";
import { useLogout } from "./useLogout";
import { useNavigate } from "react-router-dom";

export const useCheckAccountStatus = () => {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuthContext();
  const { logout } = useLogout();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    const checkStatus = async () => {
      if (!user) {
        if (isMounted) {
          setStatus(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (isMounted) {
            setStatus(userData.accountStatus || 'inactive');
            setIsLoading(false);
            
            // Se a conta não estiver ativa, redirecionar para página de conta suspensa
            if (userData.accountStatus !== 'active' && window.location.pathname !== '/account-suspended') {
              navigate('/account-suspended');
            }
          }
        } else {
          if (isMounted) {
            setStatus('not-found');
            setIsLoading(false);
            setError('Documento de usuário não encontrado');
          }
        }
      } catch (err) {
        console.error("Erro ao verificar status da conta:", err);
        if (isMounted) {
          setError('Falha ao verificar status da conta');
          setIsLoading(false);
        }
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [user, navigate]);

  const forceLogoutIfInactive = () => {
    if (status && status !== 'active') {
      logout();
      navigate('/account-suspended');
      return true;
    }
    return false;
  };

  return { 
    status, 
    isLoading, 
    error, 
    isActive: status === 'active',
    forceLogoutIfInactive
  };
};