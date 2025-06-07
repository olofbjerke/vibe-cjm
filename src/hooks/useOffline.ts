'use client';

import { useState, useEffect } from 'react';
import { offlineStorage } from '@/lib/offline-storage';

interface OfflineState {
  isOnline: boolean;
  isInitialized: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isInitialized: false,
    isSyncing: false,
    lastSyncTime: null,
  });

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.init().then(() => {
      setState(prev => ({ ...prev, isInitialized: true }));
    });

    const handleOnline = async () => {
      setState(prev => ({ ...prev, isOnline: true, isSyncing: true }));
      
      try {
        await offlineStorage.syncOfflineChanges();
        setState(prev => ({ 
          ...prev, 
          isSyncing: false, 
          lastSyncTime: Date.now() 
        }));
      } catch (error) {
        console.error('Failed to sync offline changes:', error);
        setState(prev => ({ ...prev, isSyncing: false }));
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    // Set up event listeners
    offlineStorage.addEventListener('online', handleOnline);
    offlineStorage.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      offlineStorage.removeEventListener('online', handleOnline);
      offlineStorage.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = async () => {
    if (!state.isOnline || state.isSyncing) return;

    setState(prev => ({ ...prev, isSyncing: true }));
    
    try {
      await offlineStorage.syncOfflineChanges();
      setState(prev => ({ 
        ...prev, 
        isSyncing: false, 
        lastSyncTime: Date.now() 
      }));
    } catch (error) {
      console.error('Manual sync failed:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  return {
    ...state,
    syncNow,
  };
}