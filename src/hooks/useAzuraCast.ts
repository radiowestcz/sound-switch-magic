import { useState, useEffect, useCallback, useRef } from 'react';
import { AzuraCastAPI, AzuraCastConfig, NowPlayingData, QueueItem, LibraryFile } from '@/lib/azuracast';

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

export function useAzuraCast(config: AzuraCastConfig | null): UseAzuraCastReturn {
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
  const apiRef = useRef<AzuraCastAPI | null>(null);

  // Create API instance when config changes
  useEffect(() => {
    if (config && config.apiUrl && config.apiKey) {
      apiRef.current = new AzuraCastAPI(config);
    } else {
      apiRef.current = null;
      setIsConnected(false);
      setIsLoading(false);
    }
  }, [config]);

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

  // WebSocket connection and data fetch
  useEffect(() => {
    if (!apiRef.current) return;

    const api = apiRef.current;

    const handleNowPlayingUpdate = (data: NowPlayingData) => {
      setNowPlaying(data);
      updateTimerFromNowPlaying(data);
      setIsConnected(true);
      setError(null);
    };

    const ws = api.createWebSocket(handleNowPlayingUpdate);
    
    if (ws) {
      wsRef.current = ws;

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED && apiRef.current) {
            const newWs = apiRef.current.createWebSocket(handleNowPlayingUpdate);
            if (newWs) wsRef.current = newWs;
          }
        }, 3000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    }

    // Initial data fetch
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
      if (!apiRef.current) return;
      try {
        const npData = await apiRef.current.fetchNowPlaying();
        setNowPlaying(npData);
        updateTimerFromNowPlaying(npData);
        setIsConnected(true);
      } catch (e) {
        setIsConnected(false);
      }
    }, 5000);

    const queuePollInterval = setInterval(async () => {
      if (!apiRef.current) return;
      try {
        const queueData = await apiRef.current.fetchQueue();
        setQueue(queueData);
      } catch (e) {
        // Silently fail
      }
    }, 8000);

    return () => {
      wsRef.current?.close();
      clearInterval(pollInterval);
      clearInterval(queuePollInterval);
    };
  }, [config, updateTimerFromNowPlaying]);

  // Actions
  const skip = useCallback(async () => {
    if (!apiRef.current) throw new Error('Není nakonfigurováno');
    try {
      await apiRef.current.skip();
      setTimeout(async () => {
        if (!apiRef.current) return;
        const [npData, queueData] = await Promise.all([
          apiRef.current.fetchNowPlaying(),
          apiRef.current.fetchQueue(),
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
    if (!apiRef.current) throw new Error('Není nakonfigurováno');
    try {
      await apiRef.current.addToQueue(files);
      const queueData = await apiRef.current.fetchQueue();
      setQueue(queueData);
    } catch (e) {
      throw new Error('Nepodařilo se přidat do fronty');
    }
  }, []);

  const removeFromQueue = useCallback(async (itemId: number | string) => {
    if (!apiRef.current) throw new Error('Není nakonfigurováno');
    try {
      await apiRef.current.removeFromQueue(itemId);
      const queueData = await apiRef.current.fetchQueue();
      setQueue(queueData);
    } catch (e) {
      throw new Error('Nepodařilo se odebrat z fronty');
    }
  }, []);

  const navigateTo = useCallback(async (path: string) => {
    if (!apiRef.current) return;
    try {
      const libraryData = await apiRef.current.fetchLibrary(path);
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
    if (!apiRef.current) return;
    try {
      const queueData = await apiRef.current.fetchQueue();
      setQueue(queueData);
    } catch (e) {
      // Silently fail
    }
  }, []);

  const refreshLibrary = useCallback(async () => {
    if (!apiRef.current) return;
    try {
      const libraryData = await apiRef.current.fetchLibrary(currentPath);
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
