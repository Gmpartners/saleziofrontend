// Este arquivo gerencia o registro e atualização do Service Worker

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    // O URL construtor está disponível em todos os navegadores que suportam SW
    const publicUrl = new URL(window.location.origin);
    
    window.addEventListener('load', () => {
      const swUrl = `${window.location.origin}/sw.js`;

      if (isLocalhost) {
        // Isso está rodando no localhost. Verificar se o service worker ainda existe ou não.
        checkValidServiceWorker(swUrl, config);

        navigator.serviceWorker.ready.then(() => {
          console.log('Service Worker registrado com sucesso no ambiente de desenvolvimento.');
        });
      } else {
        // Não é localhost. Apenas registrar o service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Neste ponto, o service worker atualizado está instalado
              console.log('Novo conteúdo está disponível; por favor, atualize a página.');

              // Executar callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Neste ponto, tudo foi armazenado em cache para uso offline
              console.log('Conteúdo está em cache para uso offline.');

              // Executar callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Erro durante o registro do Service Worker:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  // Verificar se o service worker pode ser encontrado. Se não puder, recarregar a página.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Garantir que o service worker exista e que o response seja válido
      const contentType = response.headers.get('content-type');
      
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // Nenhum service worker encontrado. Provavelmente um app diferente.
        // Recarregar a página.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker encontrado. Proceder normalmente.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('Nenhuma conexão de internet encontrada. App rodando no modo offline.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}