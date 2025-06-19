import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from './useAuthContext';

export function useAdminStatus() {
  const { user, userProfile, isAdmin: contextIsAdmin } = useAuthContext();
  const [isAdmin, setIsAdmin] = useState(contextIsAdmin || false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(userProfile || null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (contextIsAdmin !== undefined) {
          setIsAdmin(contextIsAdmin);
          setProfile(userProfile);
          setIsLoading(false);
          return;
        }
        
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          setIsAdmin(false);
          setProfile(null);
          setIsLoading(false);
          return;
        }
        
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          setIsAdmin(false);
          setProfile(null);
          setError('Perfil de usuário não encontrado');
          setIsLoading(false);
          return;
        }
        
        const userData = userDoc.data();
        setProfile({
          id: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || userData.displayName || 'Usuário',
          role: userData.role || 'agent',
          setor: userData.setor || null,
          isActive: userData.isActive !== false
        });
        
        setIsAdmin(userData.role === 'admin');
        setIsLoading(false);
      } catch (err) {
        console.error('Erro ao verificar status de admin:', err);
        setError(err.message || 'Erro ao verificar permissões');
        setIsAdmin(false);
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [contextIsAdmin, userProfile]);
  
  return { 
    isAdmin, 
    isLoading, 
    error, 
    userProfile: profile || userProfile 
  };
}

export function usePermissions() {
  const { isAdmin, isLoading, error, userProfile } = useAdminStatus();
  
  const checkPermission = (permission) => {
    if (isLoading) return false;
    if (error) return false;
    if (isAdmin) return true;
    
    if (!userProfile) return false;
    
    switch (permission) {
      case 'viewAllConversations':
        return isAdmin;
      case 'deleteConversations':
        return isAdmin;
      case 'manageUsers':
        return isAdmin;
      case 'manageSectors':
        return isAdmin;
      case 'viewAnalytics':
        return isAdmin || userProfile.role === 'supervisor';
      case 'accessConversations':
        return true;
      default:
        return false;
    }
  };
  
  return {
    isAdmin,
    isLoading,
    error,
    userProfile,
    checkPermission
  };
}