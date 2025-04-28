import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthContextProvider } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
// Importar utilitário de testes para chat
import './utils/chatTestUtils.js';

// Criar instância do QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

// Desregistrar o Service Worker para evitar problemas durante o desenvolvimento
// Em ambiente de produção, você pode querer habilitá-lo novamente
if (process.env.NODE_ENV === 'development') {
  serviceWorkerRegistration.unregister();
} else {
  serviceWorkerRegistration.register();
}

// Configurar atributo para identificar o contexto de socket
document.addEventListener('DOMContentLoaded', () => {
  console.log('🧪 Utilitários de teste para chat carregados! Use no console do navegador:');
  console.log('• testSendMessage("Sua mensagem")');
  console.log('• testReceiveMessage("Mensagem simulada")');
  console.log('• checkChatSyncStatus()');
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        <App />
      </AuthContextProvider>
    </QueryClientProvider>
  </StrictMode>,
);