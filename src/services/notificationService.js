class NotificationService {
  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.soundEnabled = this.loadSetting('notification_sound', true);
    this.desktopEnabled = this.loadSetting('notification_desktop', true);
    this.volume = this.loadSetting('notification_volume', 0.5);
    this.audio = null;
    this.initializeAudio();
  }

  loadSetting(key, defaultValue) {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return defaultValue;
      return saved === 'true' || (typeof defaultValue === 'number' && parseFloat(saved));
    } catch (error) {
      console.error(`Erro ao carregar configuração ${key}:`, error);
      return defaultValue;
    }
  }

  saveSetting(key, value) {
    try {
      localStorage.setItem(key, value.toString());
    } catch (error) {
      console.error(`Erro ao salvar configuração ${key}:`, error);
    }
  }

  initializeAudio() {
    try {
      this.audio = new Audio('/sounds/message.mp3');
      this.audio.volume = this.volume;
      this.audio.preload = 'auto';
    } catch (error) {
      console.error('Erro ao inicializar áudio de notificação:', error);
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Notificações não são suportadas neste navegador');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        this.saveSetting('notification_desktop', true);
        this.desktopEnabled = true;
      }
      
      return permission;
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificação:', error);
      return 'denied';
    }
  }

  async playNotificationSound() {
    if (!this.soundEnabled || !this.audio) return;

    try {
      this.audio.currentTime = 0;
      this.audio.volume = this.volume;
      
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (error) {
      console.error('Erro ao reproduzir som de notificação:', error);
      
      try {
        this.audio = new Audio('/sounds/message.mp3');
        this.audio.volume = this.volume;
        await this.audio.play();
      } catch (retryError) {
        console.error('Erro no retry do som:', retryError);
      }
    }
  }

  async showNotification(title, options = {}) {
    const shouldShowDesktop = this.desktopEnabled && this.permission === 'granted';
    const shouldPlaySound = this.soundEnabled;

    if (shouldPlaySound) {
      await this.playNotificationSound();
    }

    if (!shouldShowDesktop) return null;

    try {
      const defaultOptions = {
        icon: '/icon-192x192.png',
        badge: '/favicon.ico',
        silent: true,
        requireInteraction: false,
        timestamp: Date.now(),
        vibrate: [200, 100, 200],
        ...options
      };

      const notification = new Notification(title, defaultOptions);
      
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        if (options.onClick) {
          options.onClick(event);
        }
        
        if (options.data?.conversationId) {
          const customEvent = new CustomEvent('notificationClick', {
            detail: { conversationId: options.data.conversationId }
          });
          window.dispatchEvent(customEvent);
        }
        
        notification.close();
      };

      notification.onerror = (error) => {
        console.error('Erro na notificação:', error);
      };

      setTimeout(() => {
        if (notification) {
          notification.close();
        }
      }, 6000);

      return notification;
    } catch (error) {
      console.error('Erro ao mostrar notificação:', error);
      return null;
    }
  }

  showToast(message, type = 'info', duration = 5000) {
    const toast = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: Date.now(),
      duration
    };

    const event = new CustomEvent('showToast', { detail: toast });
    window.dispatchEvent(event);

    return toast;
  }

  async toggleSound(enabled) {
    this.soundEnabled = enabled;
    this.saveSetting('notification_sound', enabled);
    
    if (enabled && this.audio) {
      await this.playNotificationSound();
    }
  }

  async toggleDesktopNotifications(enabled) {
    if (enabled && this.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        this.desktopEnabled = false;
        this.saveSetting('notification_desktop', false);
        return false;
      }
    }

    this.desktopEnabled = enabled;
    this.saveSetting('notification_desktop', enabled);
    return true;
  }

  updateVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveSetting('notification_volume', this.volume);
    
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  getSettings() {
    return {
      soundEnabled: this.soundEnabled,
      desktopEnabled: this.desktopEnabled,
      volume: this.volume,
      permission: this.permission,
      isSupported: this.isSupported
    };
  }

  async showNewMessageNotification(sender, message, conversationId) {
    const title = `💬 ${sender}`;
    
    const options = {
      body: message,
      tag: conversationId,
      data: { conversationId },
      actions: [
        {
          action: 'reply',
          title: '💬 Responder',
          icon: '/favicon.ico'
        },
        {
          action: 'view',
          title: '👁️ Ver conversa',
          icon: '/favicon.ico'
        }
      ]
    };

    return await this.showNotification(title, options);
  }

  updateBrowserTitle(unreadCount = 0) {
    const baseTitle = 'Salezio Dashboard';
    
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }

  updateFavicon(iconPath) {
    try {
      let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = iconPath;
      document.getElementsByTagName('head')[0].appendChild(link);
    } catch (error) {
      console.error('Erro ao atualizar favicon:', error);
    }
  }

  checkBrowserSupport() {
    const support = {
      notifications: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator,
      audio: typeof Audio !== 'undefined'
    };

    console.log('Suporte do navegador para notificações:', support);
    return support;
  }

  destroy() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }
}

export const notificationService = new NotificationService();

if (import.meta.env.DEV) {
  window.notificationService = notificationService;
}

export default notificationService;