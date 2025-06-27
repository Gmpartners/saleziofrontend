import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { notificationService } from '../services/notificationService';

export const usePageTitle = () => {
  const { getTotalUnreadCount } = useSocket();
  
  useEffect(() => {
    const updateTitle = () => {
      const unreadCount = getTotalUnreadCount ? getTotalUnreadCount() : 0;
      notificationService.updateBrowserTitle(unreadCount);
    };
    
    updateTitle();
    
    const interval = setInterval(updateTitle, 2000);
    
    return () => {
      clearInterval(interval);
      notificationService.updateBrowserTitle(0);
    };
  }, [getTotalUnreadCount]);
};