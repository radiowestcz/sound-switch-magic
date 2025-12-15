import { useState, useEffect, useCallback, useRef } from 'react';
import { api, NowPlayingData, QueueItem, LibraryFile } from '@/lib/azuracast';

export interface UseAzuraCastReturn {
  // State
  nowPlaying: NowPlayingData | null;
  queue: QueueItem[];
  library: LibraryFile[];
  currentPath: string;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Calculated values
  remainingTime: number;
  elapsedTime: number;
  progress: number;
  
  // Actions
  skip: () => Promise<void>;
  addToQueue: (files: string[]) => Promise<void>;
  removeFromQueue: (itemId: number | string) => Promise<void>;
  navigateTo: (path: string) => void;
  navigateUp: () => void;
  refreshQueue: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
}

export function useAzuraCast(): UseAzuraCastReturn {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [library, setLibrary] = useState<LibraryFile[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Timer state
  const [remainingTime, setRemainingTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const targetEndTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  // Update timer based on current playing info
  const updateTimerFromNowPlaying = useCallback((np: NowPlayingData) => {
    if (np.now_playing) {
      const song = np.now_playing;
      const remainingSeconds = song.duration - song.elapsed;
      const now = Date.now();
      targetEndTimeRef.current = now + (remainingSeconds * 1000);
      durationRef.current = song.duration;
    }
  }, []);

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      if (durationRef.current <= 0) return;
      
      const now = Date.now();
      let remainingMs = targetEndTimeRef.current - now;
      if (remainingMs < 0) remainingMs = 0;
      
      const remainingSec = Math.ceil(remainingMs / 1000);
      const elapsedSec = durationRef.current - (remainingMs / 1000);
      const pct = ((durationRef.current * 1000 - remainingMs) / (durationRef.current * 1000)) * 100;
      
      setRemainingTime(remainingSec);
      setElapsedTime(Math.floor(elapsedSec));
      setProgress(Math.min(pct, 100));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // WebSocket connection
  useEffect(() => {
    const handleNowPlayingUpdate = (data: NowPlayingData) => {
      setNowPlaying(data);
      updateTimerFromNowPlaying(data);
      setIsConnected(true);
      setError(null);
    };

    wsRef.current = api.createWebSocket(handleNowPlayingUpdate);

    wsRef.current.onclose = () => {
      setIsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          wsRef.current = api.createWebSocket(handleNowPlayingUpdate);
        }
      }, 3000);
    };

    wsRef.current.onerror = () => {
      setIsConnected(false);
      setError('Připojení selhalo');
    };

    return () => {
      wsRef.current?.close();
    };
  }, [updateTimerFromNowPlaying]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [npData, queueData, libraryData] = await Promise.all([
          api.fetchNowPlaying(),
          api.fetchQueue(),
          api.fetchLibrary(''),
        ]);
        
        setNowPlaying(npData);
        updateTimerFromNowPlaying(npData);
        setQueue(queueData);
        setLibrary(libraryData);
        setIsConnected(true);
        setError(null);
      } catch (e) {
        setError('Nepodařilo se načíst data');
        console.error('Initial fetch error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // Fallback polling
    const pollInterval = setInterval(async () => {
      try {
        const npData = await api.fetchNowPlaying();
        setNowPlaying(npData);
        updateTimerFromNowPlaying(npData);
      } catch (e) {
        // Silently fail, WebSocket is primary
      }
    }, 5000);

    const queuePollInterval = setInterval(async () => {
      try {
        const queueData = await api.fetchQueue();
        setQueue(queueData);
      } catch (e) {
        // Silently fail
      }
    }, 8000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(queuePollInterval);
    };
  }, [updateTimerFromNowPlaying]);

  // Actions
  const skip = useCallback(async () => {
    try {
      await api.skip();
      // Refresh after skip
      setTimeout(async () => {
        const [npData, queueData] = await Promise.all([
          api.fetchNowPlaying(),
          api.fetchQueue(),
        ]);
        setNowPlaying(npData);
        updateTimerFromNowPlaying(npData);
        setQueue(queueData);
      }, 500);
    } catch (e) {
      throw new Error('Nepodařilo se přeskočit');
    }
  }, [updateTimerFromNowPlaying]);

  const addToQueue = useCallback(async (files: string[]) => {
    try {
      await api.addToQueue(files);
      const queueData = await api.fetchQueue();
      setQueue(queueData);
    } catch (e) {
      throw new Error('Nepodařilo se přidat do fronty');
    }
  }, []);

  const removeFromQueue = useCallback(async (itemId: number | string) => {
    try {
      await api.removeFromQueue(itemId);
      const queueData = await api.fetchQueue();
      setQueue(queueData);
    } catch (e) {
      throw new Error('Nepodařilo se odebrat z fronty');
    }
  }, []);

  const navigateTo = useCallback(async (path: string) => {
    try {
      const libraryData = await api.fetchLibrary(path);
      setLibrary(libraryData);
      setCurrentPath(path);
    } catch (e) {
      throw new Error('Nepodařilo se načíst složku');
    }
  }, []);

  const navigateUp = useCallback(() => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    navigateTo(parts.join('/'));
  }, [currentPath, navigateTo]);

  const refreshQueue = useCallback(async () => {
    try {
      const queueData = await api.fetchQueue();
      setQueue(queueData);
    } catch (e) {
      // Silently fail
    }
  }, []);

  const refreshLibrary = useCallback(async () => {
    try {
      const libraryData = await api.fetchLibrary(currentPath);
      setLibrary(libraryData);
    } catch (e) {
      // Silently fail
    }
  }, [currentPath]);

  return {
    nowPlaying,
    queue,
    library,
    currentPath,
    isConnected,
    isLoading,
    error,
    remainingTime,
    elapsedTime,
    progress,
    skip,
    addToQueue,
    removeFromQueue,
    navigateTo,
    navigateUp,
    refreshQueue,
    refreshLibrary,
  };
}
