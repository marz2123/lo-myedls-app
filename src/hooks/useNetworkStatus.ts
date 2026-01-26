import { useState, useEffect, useCallback, useRef } from 'react';

export type NetworkStatus = 'online' | 'offline' | 'syncing';

interface NetworkInfo {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  lastOnline: Date | null;
  connectionType: string | null;
}

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const [lastOnline, setLastOnline] = useState<Date | null>(
    typeof navigator !== 'undefined' && navigator.onLine ? new Date() : null
  );
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const listenersRef = useRef<Set<(status: NetworkStatus) => void>>(new Set());

  const updateConnectionType = useCallback(() => {
    if (typeof navigator === 'undefined') return;
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    if (connection) {
      setConnectionType(connection.effectiveType || connection.type || null);
    }
  }, []);

  const handleOnline = useCallback(() => {
    setStatus('online');
    setLastOnline(new Date());
    updateConnectionType();
    listenersRef.current.forEach(listener => listener('online'));
  }, [updateConnectionType]);

  const handleOffline = useCallback(() => {
    setStatus('offline');
    updateConnectionType();
    listenersRef.current.forEach(listener => listener('offline'));
  }, [updateConnectionType]);

  const setSyncing = useCallback((syncing: boolean) => {
    if (syncing) {
      setStatus('syncing');
      listenersRef.current.forEach(listener => listener('syncing'));
    } else if (typeof navigator !== 'undefined' && navigator.onLine) {
      setStatus('online');
      listenersRef.current.forEach(listener => listener('online'));
    }
  }, []);

  const subscribe = useCallback((callback: (status: NetworkStatus) => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updateConnectionType();

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateConnectionType);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateConnectionType);
      }
    };
  }, [handleOnline, handleOffline, updateConnectionType]);

  const networkInfo: NetworkInfo = {
    status,
    isOnline: status === 'online' || status === 'syncing',
    isOffline: status === 'offline',
    isSyncing: status === 'syncing',
    lastOnline,
    connectionType,
  };

  return {
    ...networkInfo,
    setSyncing,
    subscribe,
  };
};
