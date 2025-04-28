// Service Worker para MultiFlow
const CACHE_NAME = 'multiflow-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
  '/favicon.svg',
  '/manifest.json',
  '/logo192.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de cache: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Ignorar requisições para API e WebSocket
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/socket.io/') ||
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Se for uma navegação, retornar a página inicial do cache
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            
            // Para outros recursos que não estão no cache, retornar uma resposta vazia
            // em vez de null para evitar o erro "Failed to convert value to 'Response'"
            return new Response('', {
              status: 404,
              statusText: 'Not Found'
            });
          });
      })
  );
});