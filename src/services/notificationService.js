/**
 * Serviço para gerenciar notificações, sons e alertas visuais
 */
class NotificationService {
  constructor() {
    this.sounds = {
      message: null,
      newConversation: null,
      alert: null
    };
    this.muted = false;
    this.volume = 0.5;
    this.desktopNotificationsEnabled = this.checkDesktopNotificationPermission();
    this.initialized = false;
    this.soundsLoaded = false;
    this.lastPlayedTime = 0;
    this.minTimeBeforeReplay = 1000; // Evita que o mesmo som seja tocado várias vezes em sequência
  }

  /**
   * Verifica se as notificações desktop estão permitidas
   */
  checkDesktopNotificationPermission() {
    return (
      'Notification' in window &&
      Notification.permission === 'granted'
    );
  }

  /**
   * Solicita permissão para notificações desktop
   */
  async requestDesktopNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.desktopNotificationsEnabled = true;
        return true;
      }
    }
    return false;
  }

  /**
   * Pré-carrega os sons para uso posterior
   */
  async preloadSounds() {
    if (this.soundsLoaded) return;
    
    try {
      // Verificar se os arquivos existem
      const checkFiles = async () => {
        try {
          const messageResponse = await fetch('/sounds/message.mp3', { method: 'HEAD' });
          const newConversationResponse = await fetch('/sounds/new-conversation.mp3', { method: 'HEAD' });
          const alertResponse = await fetch('/sounds/alert.mp3', { method: 'HEAD' });
          
          return {
            message: messageResponse.ok,
            newConversation: newConversationResponse.ok,
            alert: alertResponse.ok
          };
        } catch (error) {
          console.error('Erro ao verificar arquivos de som:', error);
          return { message: false, newConversation: false, alert: false };
        }
      };

      const filesExist = await checkFiles();
      
      // Criar elementos de áudio apenas para arquivos que existem
      if (filesExist.message) {
        this.sounds.message = new Audio('/sounds/message.mp3');
      } else {
        console.warn('Arquivo de som message.mp3 não encontrado');
        // Criar URL de áudio base64 para som de mensagem (beep suave)
        const messageSound = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAsAABJCAATExMTJiYmJjg4ODhLS0tLXl5eXnFxcXGDg4ODlpaWlqioqKi7u7u7zc3Nzd/f39/y8vLy////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCQAAAAAAAAAhI4LVxFgAAAAAAAAAAAAAAAAAAAP/7UGQAAANVLl3VPMAIcGXavKSABPYdTf3igAAhMZT/uMAAQAAA0AQA0Ct+KP8QAP+MXr/hAACf4QAAn//y+sQT//qAU/9MLGMYxqBhYDAxYxjAYJgYY/9Q/1QmJkBgYGBgYGP/q0AQ/q0/qgYMfq0/pRMTIP6/0fy/8SBgx+oRE/5czIMfjIxgBBAAAAdBKIJlGQTiGQTIGwTLJAYBA6CcQyCZBMDYgDYQBgEEyDX5Q0CZQODYJlAINgbBOU8CBF/KBF/wwDAIPg2CcQBsIJlA4NgmUMgbCCZQyBsIJlDIGwTKGQNgmUMgbBOU5TlMgbCCYGwTKAQNgmQTCGf/yiAT/8pgE//lBD//lCDX/5SjoQQS///8ov/+Ur//lL//nDDAp/1+CiRFGipJkRJNCxjdXYxMzQ4NUxBTUUzLjEwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
        this.sounds.message = new Audio(messageSound);
      }
      
      if (filesExist.newConversation) {
        this.sounds.newConversation = new Audio('/sounds/new-conversation.mp3');
      } else {
        console.warn('Arquivo de som new-conversation.mp3 não encontrado');
        // Criar URL de áudio base64 para som de nova conversa (campainha)
        const newConversationSound = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAoAABSdQAJCQkJFRUVFSAgICA1NTU1QUFBQU1NTU1YWFhYZGRkZG9vb295eXl5hISEhI+Pj4+ZmZmZpKSkpK+vr6+5ubm5xMTExM/Pz8/a2tra5eXl5fDw8PD8/Pz8//8AAAAATGFtZTMuMTAwAQsAAAAAAAAAABQgJAMVQQAB9AAAS3WBhy7/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tgZAAA8xxQ1vsJQAgAAA0g4AABF9FpV+w9CaC2ACn8AAAEAAALIAAwIBAwAACBQ0fCBxQqLERvMrIJG7W29tgHIl2LR36l0SLcGRDt+9uAT6WvZUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiLMQTXNlXmYg4DAhNAZwIBBLySgyopHyKNqf/hMXw4+Vn/8ILuLH8PwgEcAPgfA+cHwfB/+r/+D+D/4PgfA+f/8H4Pn/+H4Pgff/1mOMyj8p9SnzlJmUmmb7Zvu2z5zMyZpnzMOZ9pqhqgah/qnMwNQNQ5n/+pn+pnM+ZgahzP//Uz//+UM/5mGZmZ/8h33Wsd7H/w/XbZv8h6jvuu6vLXsrWtaq19zUsBAAAAAaYdyHILAxQEFCkG0g0YZMGEgIWAQoArg6YdxH//4w7//+KgL//4KJl//jE0y//+MO//4w5///ikC//8UgX//xhyv/4oAr//GHIRABghABAMGBMgUFBTUJARMDA0ZBBAw3pASIbZtm2bZplZWVpWE4bSsrK0rStK8p5PJ5QYOCkFELBkpBiPZj2Y9n/Zj2Y9mQwRjBIcKQYYt/xSBf/+KQL//xSBf/+KQKBAECg39oN/aCgUCgQID/+CBBFmWZZllmWVlZVlWZZlmXatq2ratq7btu2qqqu67ru+77vu+7///8ABAAAAADFxw9KFQmVhIQlgMCwoKEgUCQ4QFAQABg4dQQAAAAAC/BgwYMGDBgwbLFixYuXNy5cuXLVq1bvXr169evYMGDBgwYMGDFy5cuXLly5c3Nzc3Nzc3Nzc3Nz/+zBkAIA9GxaW/sKQngAAA0gAAABEj1pZ+wpaaB3ACz4AAAAczc3QsWLFixYuXLly5ycnJyd3d3d3d3d3d3eXl5eXl5eXl5eaZpmmaZpmmaZpmmaZmZmZmZmZmaZmZmZmZmZmZmZmZ3d3d3d3d3d3d3d3e77u+77u+7vu+7vu+77u+7vu+7vu+7uu67ru+77u+77u+77vMzMzMzMzMzMzMzO7u7u7u7u7u7u7u7u7u7zd3nAAAAAAAAAB9L+rU0LxBFtJLADRVhoBwZHqm9kOFrRz5R95znO1VV+1R/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
        this.sounds.newConversation = new Audio(newConversationSound);
      }
      
      if (filesExist.alert) {
        this.sounds.alert = new Audio('/sounds/alert.mp3');
      } else {
        console.warn('Arquivo de som alert.mp3 não encontrado');
        // Criar URL de áudio base64 para som de alerta (beep de alerta)
        const alertSound = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAsAABJCAATExMTJiYmJjg4ODhLS0tLXl5eXnFxcXGDg4ODlpaWlqioqKi7u7u7zc3Nzd/f39/y8vLy////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCQAAAAAAAAAhI4LVxFgAAAAAAAAAAAAAAAAAAAP/7UEQAAACVAGe1MAAYcQDM9qYYAQmgGZ7UwAIhMAM/2phgRAAAANCpXT6mAKfvL8hPbP1uxbP4IGwQlAyBk8//51CBMD+dQgTCYH//OoQJhMD+dQgTA/n//OomB/OoQJgfz//lEwP5Q7kEy8/8omQTL//KEyf/lSPaRW7Bf/8vRMuCgS////y9HQJc///ygS//8okDgS//8pIHAl//yiQOBL//yh3IL//ygSD//lJQJB//yhP//5RMH//L////8oj//8oj//8o//5RMP//////////ygcCX///KI//////////ygcCX//8ojx////8ojx//8pHaRW7Bf/8vRMuijx//8uRMuC//////y5E//5cj//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8=';
        this.sounds.alert = new Audio(alertSound);
      }
      
      // Definir volume para todos os sons
      Object.values(this.sounds).forEach(sound => {
        if (sound) {
          sound.volume = this.volume;
          // Pré-carregar
          sound.load();
        }
      });
      
      this.initialized = true;
      this.soundsLoaded = true;
      console.log('Sons de notificação carregados com sucesso');
    } catch (error) {
      console.error('Erro ao carregar sons de notificação:', error);
    }
  }

  /**
   * Atualiza o volume de todos os sons
   * @param {number} volume - Valor entre 0 e 1
   */
  updateVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('notification_volume', this.volume.toString());
    
    // Atualizar volume de todos os sons carregados
    Object.values(this.sounds).forEach(sound => {
      if (sound) {
        sound.volume = this.volume;
      }
    });
  }

  /**
   * Ativa/desativa o som
   * @param {boolean} enabled - Estado ativado/desativado
   */
  toggleSound(enabled) {
    this.muted = !enabled;
    localStorage.setItem('notification_sound', enabled.toString());
  }

  /**
   * Ativa/desativa notificações desktop
   * @param {boolean} enabled - Estado ativado/desativado
   */
  async toggleDesktopNotifications(enabled) {
    if (enabled && !this.desktopNotificationsEnabled) {
      // Solicitar permissão se ainda não tiver
      await this.requestDesktopNotificationPermission();
    } else {
      this.desktopNotificationsEnabled = enabled;
    }
    
    localStorage.setItem('notification_desktop', enabled.toString());
    return this.desktopNotificationsEnabled;
  }

  /**
   * Reproduz um som específico
   * @param {string} soundType - Tipo de som ('message', 'newConversation', 'alert')
   */
  playSound(soundType) {
    if (this.muted || !this.initialized) return;
    
    const now = Date.now();
    // Evitar tocar o mesmo som várias vezes em sequência
    if (now - this.lastPlayedTime < this.minTimeBeforeReplay) {
      return;
    }
    
    const sound = this.sounds[soundType];
    if (sound) {
      // Reset and play
      sound.currentTime = 0;
      sound.play().catch(error => {
        // Ignorar erros de reprodução (comuns em navegadores que exigem interação do usuário)
        console.log('Não foi possível reproduzir som:', error.message);
      });
      
      this.lastPlayedTime = now;
    }
  }

  /**
   * Notifica sobre uma nova mensagem
   * @param {Object} message - Dados da mensagem
   * @param {boolean} isCurrentConversation - Se é da conversa atual
   */
  notifyNewMessage(message, isCurrentConversation = false) {
    // Reproduzir som apenas se não for a conversa atual ou o app não estiver em foco
    if (!isCurrentConversation || !document.hasFocus()) {
      this.playSound('message');
      
      // Mostrar notificação desktop apenas se não for a conversa atual e o app não estiver em foco
      if (this.desktopNotificationsEnabled && !document.hasFocus()) {
        const sender = message.remetente === 'cliente' ? 'Cliente' : 'Agente';
        const title = `Nova mensagem de ${sender}`;
        
        // Limitar conteúdo para privacidade
        const content = message.conteudo.length > 30 
          ? message.conteudo.substring(0, 30) + '...' 
          : message.conteudo;
          
        this.showDesktopNotification(title, {
          body: content,
          icon: '/logo192.png',
          tag: `message-${message.conversaId || 'new'}`
        });
      }
      
      // Atualizar título da página com indicador visual
      this.updatePageTitle('Nova mensagem');
    }
    
    // Exibir feedback visual para mensagens enviadas pelo atendente
    if (message.remetente === 'atendente' && message.status === 'sent') {
      this.showToast('Mensagem enviada com sucesso', 'success');
    } else if (message.remetente === 'atendente' && message.status === 'failed') {
      this.showToast('Falha ao enviar mensagem', 'error');
    }
  }

  /**
   * Notifica sobre uma nova conversa
   * @param {Object} conversation - Dados da conversa
   */
  notifyNewConversation(conversation) {
    this.playSound('newConversation');
    
    if (this.desktopNotificationsEnabled && !document.hasFocus()) {
      const title = 'Nova conversa';
      const content = `Nova conversa com ${conversation.nomeCliente || 'Cliente'}`;
      
      this.showDesktopNotification(title, {
        body: content,
        icon: '/logo192.png',
        tag: `conversation-${conversation._id || 'new'}`
      });
      
      // Atualizar título da página com indicador visual
      this.updatePageTitle('Nova conversa');
    }
    
    this.showToast('Nova conversa recebida', 'info');
  }

  /**
   * Notifica sobre uma atualização de conversa
   * @param {Object} conversation - Dados da conversa
   * @param {boolean} isCurrentConversation - Se é a conversa atual
   */
  notifyConversationUpdate(conversation, isCurrentConversation = false) {
    // Notificar apenas para mudanças significativas
    if (conversation.status === 'finalizada') {
      this.playSound('alert');
      this.showToast('Conversa finalizada', 'info');
    } else if (conversation.status === 'transferida') {
      this.playSound('alert');
      this.showToast('Conversa transferida', 'info');
    }
  }

  /**
   * Notifica sobre um erro
   * @param {Object} options - Opções da notificação
   */
  notifyError(options) {
    this.playSound('alert');
    this.showToast(options.message, 'error');
  }

  /**
   * Exibe uma notificação desktop
   * @param {string} title - Título da notificação
   * @param {Object} options - Opções da notificação
   */
  showDesktopNotification(title, options = {}) {
    if (!this.desktopNotificationsEnabled) return;
    
    try {
      const notification = new Notification(title, {
        ...options,
        silent: true // Não usar som padrão do navegador, usamos nosso próprio
      });
      
      // Manipular o clique na notificação
      notification.onclick = function() {
        window.focus();
        notification.close();
      };
      
      // Fechar automaticamente após 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error('Erro ao exibir notificação desktop:', error);
    }
  }

  /**
   * Atualiza o título da página para indicar novas mensagens/conversas
   * @param {string} message - Mensagem a ser exibida
   */
  updatePageTitle(message) {
    const originalTitle = document.title.split(' • ')[0] || 'Dashboard';
    const newTitle = `${message} • ${originalTitle}`;
    
    document.title = newTitle;
    
    // Restaurar título original quando a janela ganha foco
    const handleFocus = () => {
      document.title = originalTitle;
      window.removeEventListener('focus', handleFocus);
    };
    
    window.addEventListener('focus', handleFocus);
  }

  /**
   * Exibe um toast (mensagem temporária)
   * @param {string} message - Mensagem a ser exibida
   * @param {string} type - Tipo de toast ('success', 'error', 'info', 'warning')
   */
  showToast(message, type = 'info') {
    // Verificar se existe um elemento toast container
    let toastContainer = document.getElementById('toast-container');
    
    // Se não existir, criar
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.position = 'fixed';
      toastContainer.style.bottom = '20px';
      toastContainer.style.right = '20px';
      toastContainer.style.zIndex = '9999';
      document.body.appendChild(toastContainer);
    }
    
    // Criar toast
    const toast = document.createElement('div');
    toast.style.padding = '10px 15px';
    toast.style.marginBottom = '10px';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 3px 10px rgba(0,0,0,0.3)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.minWidth = '280px';
    toast.style.justifyContent = 'space-between';
    toast.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 2.7s';
    toast.style.opacity = '0';
    
    // Configurar cor de fundo com base no tipo
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#10b981';
        toast.style.color = 'white';
        toast.style.borderLeft = '4px solid #059669';
        break;
      case 'error':
        toast.style.backgroundColor = '#ef4444';
        toast.style.color = 'white';
        toast.style.borderLeft = '4px solid #b91c1c';
        break;
      case 'info':
        toast.style.backgroundColor = '#3b82f6';
        toast.style.color = 'white';
        toast.style.borderLeft = '4px solid #1d4ed8';
        break;
      case 'warning':
        toast.style.backgroundColor = '#f59e0b';
        toast.style.color = 'white';
        toast.style.borderLeft = '4px solid #d97706';
        break;
      default:
        toast.style.backgroundColor = '#6b7280';
        toast.style.color = 'white';
        toast.style.borderLeft = '4px solid #4b5563';
    }
    
    // Adicionar mensagem
    toast.textContent = message;
    
    // Adicionar botão de fechar
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.marginLeft = '10px';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.color = 'inherit';
    closeButton.style.fontSize = '18px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => {
      toastContainer.removeChild(toast);
    };
    
    toast.appendChild(closeButton);
    toastContainer.appendChild(toast);
    
    // Adicionar estilos de animação
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(style);
    
    // Iniciar animação de entrada
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Remover após 3 segundos
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Exportar instância única
export const notificationService = new NotificationService();