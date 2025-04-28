import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useSocketContext } from './useSocketContext';

// Hook para acessar e gerenciar conversas do setor Financeiro
export const useFinanceiroSetor = () => {
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket, isConnected } = useSocketContext();
  
  useEffect(() => {
    setLoading(true);
    
    try {
      // Inscrever-se no setor Financeiro via WebSocket
      if (socket && isConnected) {
        console.log('Inscrevendo no setor Financeiro via WebSocket');
        socket.emit('subscribe', { setor: 'Financeiro' });
      }
      
      // Configurar listener do Firestore para conversas do setor Financeiro
      const q = query(
        collection(db, 'conversas'),
        where('setor', '==', 'Financeiro'),
        where('arquivada', '==', false)
      );
      
      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const conversasArray = [];
          querySnapshot.forEach((doc) => {
            conversasArray.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setConversas(conversasArray);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Erro ao buscar conversas do setor Financeiro:', err);
          setError(err.message);
          setLoading(false);
        }
      );
      
      // Limpar listener ao desmontar
      return () => {
        unsubscribe();
        // Cancelar inscrição no setor ao desmontar
        if (socket && isConnected) {
          socket.emit('unsubscribe', { setor: 'Financeiro' });
        }
      };
    } catch (err) {
      console.error('Erro ao configurar listener para o setor Financeiro:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [socket, isConnected]);
  
  return { conversas, loading, error };
};
