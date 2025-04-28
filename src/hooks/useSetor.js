import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useSocketContext } from './useSocketContext';
import { useAuthContext } from './useAuthContext';
import { DEFAULT_SETOR } from '../config/syncConfig';

/**
 * Hook para acessar e gerenciar conversas de um setor específico
 * Versão genérica que substitui o useFinanceiroSetor
 * 
 * @param {string} setorNome - Nome do setor (opcional, usa o setor do usuário se não fornecido)
 * @param {boolean} adminView - Se true, mostra todas as conversas independente do setor (apenas para admin)
 * @returns {Object} { conversas, loading, error, setor }
 */
export const useSetor = (setorNome = null, adminView = false) => {
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket, isConnected } = useSocketContext();
  const { userProfile, userSector, userSectorName, isAdmin, defaultSector } = useAuthContext();
  
  // Determinar qual setor usar (prioridade: parâmetro > userSectorName > DEFAULT_SETOR)
  const setor = setorNome || userSectorName || defaultSector || DEFAULT_SETOR;
  
  useEffect(() => {
    setLoading(true);
    console.log(`Buscando conversas do setor ${setor}...`);
    
    try {
      // Inscrever-se no setor via WebSocket (se disponível)
      if (socket && isConnected) {
        console.log(`Inscrevendo no setor ${setor} via WebSocket`);
        socket.emit('subscribe', { setor: setor });
      }
      
      // Se for admin e adminView=true, mostrar todas as conversas
      let q;
      
      if (isAdmin && adminView) {
        // Query para admin (todas as conversas não arquivadas)
        q = query(
          collection(db, 'conversas'),
          where('arquivada', '==', false)
        );
      } else {
        // Query filtrada por setor
        q = query(
          collection(db, 'conversas'),
          where('setor', '==', setor),
          where('arquivada', '==', false)
        );
      }
      
      // Configurar listener do Firestore
      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const conversasArray = [];
          querySnapshot.forEach((doc) => {
            conversasArray.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          console.log(`${conversasArray.length} conversas encontradas no setor ${setor}`);
          setConversas(conversasArray);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error(`Erro ao buscar conversas do setor ${setor}:`, err);
          setError(err.message);
          setLoading(false);
        }
      );
      
      // Limpar listener ao desmontar
      return () => {
        unsubscribe();
        // Cancelar inscrição no setor ao desmontar
        if (socket && isConnected) {
          socket.emit('unsubscribe', { setor: setor });
        }
      };
    } catch (err) {
      console.error(`Erro ao configurar listener para o setor ${setor}:`, err);
      setError(err.message);
      setLoading(false);
    }
  }, [socket, isConnected, setor, isAdmin, adminView, userSector, defaultSector]);
  
  return { 
    conversas, 
    loading, 
    error,
    setor
  };
};
