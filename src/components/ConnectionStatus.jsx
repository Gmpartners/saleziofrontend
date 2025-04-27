// src/components/ConnectionStatus.jsx
import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuthContext } from '../hooks/useAuthContext';

const ConnectionStatus = ({ setor }) => {
  const { isConnected } = useSocket();
  const { userSectorName, userSector } = useAuthContext();
  
  // Usar o setor passado como prop ou buscar do contexto
  const sectorDisplayName = setor || userSectorName || (userSector ? `Setor ${userSector}` : 'Sem setor');
  
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">Conversas</h1>
        <p className="text-gray-400">
          {sectorDisplayName}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <div 
          className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
        ></div>
        <span className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
          {isConnected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>
    </div>
  );
};

export default ConnectionStatus;