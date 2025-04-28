import { useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocketContext deve ser usado dentro de um SocketProvider');
  }
  
  return context;
};
