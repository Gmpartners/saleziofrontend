// Service Worker para Salezio Dashboard
const CACHE_NAME = 'salezio-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
  '/favicon.svg',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-96x96.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.log('Alguns assets não puderam ser cacheados:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', (event) => {
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
            
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            
            return new Response('', {
              status: 404,
              statusText: 'Not Found'
            });
          });
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const conversationId = event.notification.data?.conversationId;
  const action = event.action;
  
  if (action === 'reply' || action === 'view' || !action) {
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((clientList) => {
        let focusedClient = null;
        
        for (let client of clientList) {
          if (client.url.includes(location.origin)) {
            focusedClient = client;
            break;
          }
        }
        
        if (focusedClient) {
          focusedClient.focus();
          
          if (conversationId) {
            focusedClient.postMessage({
              type: 'NOTIFICATION_CLICK',
              conversationId: conversationId,
              action: action
            });
          }
        } else {
          const url = conversationId 
            ? `${location.origin}/?conversation=${conversationId}`
            : location.origin;
            
          clients.openWindow(url);
        }
      })
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notificação fechada:', event.notification.tag);
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    
    self.registration.showNotification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      silent: false,
      requireInteraction: false,
      timestamp: Date.now(),
      ...options
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});