import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthContextProvider } from './contexts/AuthContext.jsx';
import * as serviceWorkerRegistration from './serviceWorkerRegistration.js';
import { notificationService } from './services/notificationService.js';

const registerServiceWorker = () => {
  serviceWorkerRegistration.register({
    onSuccess: (registration) => {
      console.log('Service Worker registrado com sucesso:', registration);
    },
    onUpdate: (registration) => {
      console.log('Nova versão do app disponível. Atualizando...');
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  });
};

const setupNotificationListeners = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const customEvent = new CustomEvent('notificationClick', {
          detail: { 
            conversationId: event.data.conversationId,
            action: event.data.action 
          }
        });
        window.dispatchEvent(customEvent);
      }
    });
  }
  
  window.addEventListener('notificationClick', (event) => {
    console.log('Notificação clicada:', event.detail);
  });
  
  window.addEventListener('beforeunload', () => {
    if (notificationService) {
      notificationService.destroy();
    }
  });
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthContextProvider>
      <App />
    </AuthContextProvider>
  </React.StrictMode>
);

if (import.meta.env.PROD) {
  registerServiceWorker();
}

setupNotificationListeners();

console.log('Salezio Dashboard inicializado');