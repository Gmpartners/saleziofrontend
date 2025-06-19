import { useEffect, useState } from 'react';
import { useLocalStorage } from '../useLocalStorage';
import { notificationService } from '../../services/notificationService';

export const useMessageEffect = () => {
  const [soundEnabled, setSoundEnabled] = useLocalStorage('notification_sound', 'true');
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useLocalStorage('notification_desktop', 'true');
  const [volume, setVolume] = useLocalStorage('notification_volume', '0.5');
  
  const [notificationPermission, setNotificationPermission] = useState('default');
  
  useEffect(() => {
    const checkPermission = async () => {
      if (!('Notification' in window)) {
        setNotificationPermission('denied');
        return;
      }
      
      setNotificationPermission(Notification.permission);
      
      if (desktopNotificationsEnabled === 'true' && Notification.permission !== 'granted') {
        try {
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);
        } catch (error) {
          console.error('Erro ao solicitar permissão de notificação:', error);
        }
      }
    };
    
    checkPermission();
  }, [desktopNotificationsEnabled]);
  
  useEffect(() => {
    if (soundEnabled === 'true' || soundEnabled === true) {
      notificationService.toggleSound(true);
    } else {
      notificationService.toggleSound(false);
    }
    
    if (volume && !isNaN(parseFloat(volume))) {
      notificationService.updateVolume(parseFloat(volume));
    }
    
    if (desktopNotificationsEnabled === 'true' || desktopNotificationsEnabled === true) {
      notificationService.toggleDesktopNotifications(true);
    } else {
      notificationService.toggleDesktopNotifications(false);
    }
  }, [soundEnabled, desktopNotificationsEnabled, volume]);
  
  const toggleSound = () => {
    const newValue = soundEnabled === 'true' ? 'false' : 'true';
    setSoundEnabled(newValue);
    notificationService.toggleSound(newValue === 'true');
  };
  
  const toggleDesktopNotifications = async () => {
    if (desktopNotificationsEnabled === 'false' && Notification.permission !== 'granted') {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission !== 'granted') {
          return false;
        }
      } catch (error) {
        console.error('Erro ao solicitar permissão de notificação:', error);
        return false;
      }
    }
    
    const newValue = desktopNotificationsEnabled === 'true' ? 'false' : 'true';
    setDesktopNotificationsEnabled(newValue);
    notificationService.toggleDesktopNotifications(newValue === 'true');
    return true;
  };
  
  const updateVolume = (newVolume) => {
    if (newVolume < 0 || newVolume > 1) return;
    
    setVolume(newVolume.toString());
    notificationService.updateVolume(newVolume);
  };
  
  return {
    soundEnabled: soundEnabled === 'true',
    desktopNotificationsEnabled: desktopNotificationsEnabled === 'true',
    volume: parseFloat(volume),
    notificationPermission,
    toggleSound,
    toggleDesktopNotifications,
    updateVolume
  };
};