import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chat.store';
import { syncOfflineQueue } from '../services/sync.service';

export const useSyncQueue = () => {
  const isConnected = useChatStore((state) => state.isConnected);
  const wasConnected = useRef<boolean | null>(null);

  useEffect(() => {
    if ((wasConnected.current === false || wasConnected.current === null) && isConnected) {
      syncOfflineQueue();
    }

    wasConnected.current = isConnected;
  }, [isConnected]);
};

export default useSyncQueue;
