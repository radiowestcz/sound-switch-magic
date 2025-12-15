// AzuraCast API Configuration and Types

export interface AzuraCastConfig {
  apiUrl: string;
  stationId: number;
  apiKey: string;
  streamUrl: string;
  wsUrl: string;
}

export interface Song {
  id: string;
  text: string;
  artist: string;
  title: string;
  album: string;
  genre: string;
  isrc: string;
  lyrics: string;
  art: string;
  custom_fields: Record<string, string>;
}

export interface NowPlaying {
  sh_id: number;
  played_at: number;
  duration: number;
  playlist: string;
  streamer: string;
  is_request: boolean;
  song: Song;
  elapsed: number;
  remaining: number;
}

export interface QueueItem {
  id?: number;
  cued_at: number;
  played_at: number | null;
  duration: number;
  playlist: string;
  is_request: boolean;
  song: Song;
  links?: {
    delete?: string;
  };
}

export interface LibraryFile {
  id?: string;
  unique_id?: string;
  path: string;
  name?: string;
  text?: string;
  is_dir: boolean;
  artist?: string;
  title?: string;
  album?: string;
  length?: number;
  playlists?: string[];
}

export interface StationStatus {
  is_online: boolean;
  listeners: {
    current: number;
    unique: number;
    total: number;
  };
}

export interface NowPlayingData {
  station: {
    id: number;
    name: string;
    shortcode: string;
  };
  listeners: {
    current: number;
    unique: number;
    total: number;
  };
  live: {
    is_live: boolean;
    streamer_name: string;
  };
  now_playing: NowPlaying;
  playing_next: QueueItem | null;
  song_history: NowPlaying[];
}

// Default configuration - update these values
export const defaultConfig: AzuraCastConfig = {
  apiUrl: 'http://100.110.116.57/api',
  stationId: 1,
  apiKey: 'f39288465e74cc72:818cd40c5264e8e1079f76fa004ae382',
  streamUrl: 'http://100.110.116.57/listen/r%C3%A1dio_v%C4%9Btrn%C3%ADk_-_studio/radio.mp3',
  wsUrl: 'ws://100.110.116.57/api/live/nowplaying/websocket',
};

// Folder color mapping
export const FOLDER_COLORS: Record<string, string> = {
  'CORE ROCK': '#54c9ff',
  'Power Rock & Pop': '#54c9ff',
  'CzSk': '#54c9ff',
  '80s 90s DANCE HITS': '#54c9ff',
  'Vánoce': '#54c9ff',
  'Jingles': '#f70707',
  'Jingly': '#f70707',
  'Znělky': '#f70707',
  'START HODINY': '#7fcf30',
  'Promo': '#f58b0a',
  'REKLAMY': '#de0af5',
  'Reklama': '#de0af5',
  'Studio 303': '#0af5e1',
  'Zprávy': '#c6f50a',
};

export function getColorForItem(text: string): string | null {
  for (const [keyword, color] of Object.entries(FOLDER_COLORS)) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      return color;
    }
  }
  return null;
}

// API helper class
export class AzuraCastAPI {
  private config: AzuraCastConfig;

  constructor(config: AzuraCastConfig = defaultConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    return {
      'X-API-Key': this.config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async fetchNowPlaying(): Promise<NowPlayingData> {
    const response = await fetch(
      `${this.config.apiUrl}/nowplaying/${this.config.stationId}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch now playing');
    return response.json();
  }

  async fetchQueue(): Promise<QueueItem[]> {
    const response = await fetch(
      `${this.config.apiUrl}/station/${this.config.stationId}/queue`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch queue');
    return response.json();
  }

  async fetchLibrary(path: string = ''): Promise<LibraryFile[]> {
    const encodedPath = encodeURIComponent(path);
    const url = path
      ? `${this.config.apiUrl}/station/${this.config.stationId}/files/list?currentDirectory=${encodedPath}`
      : `${this.config.apiUrl}/station/${this.config.stationId}/files/list`;
    
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch library');
    return response.json();
  }

  async addToQueue(files: string[]): Promise<void> {
    const response = await fetch(
      `${this.config.apiUrl}/station/${this.config.stationId}/files/batch`,
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ do: 'queue', files }),
      }
    );
    if (!response.ok) throw new Error('Failed to add to queue');
  }

  async removeFromQueue(itemId: number | string): Promise<void> {
    const response = await fetch(
      `${this.config.apiUrl}/station/${this.config.stationId}/queue/${itemId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to remove from queue');
  }

  async skip(): Promise<void> {
    const response = await fetch(
      `${this.config.apiUrl}/station/${this.config.stationId}/backend/skip`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to skip');
  }

  async uploadFile(file: File, targetPath: string): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', targetPath);

    const response = await fetch(
      `${this.config.apiUrl}/station/${this.config.stationId}/files`,
      {
        method: 'POST',
        headers: { 'X-API-Key': this.config.apiKey },
        body: formData,
      }
    );
    if (!response.ok) throw new Error('Failed to upload file');
  }

  getStreamUrl(): string {
    return this.config.streamUrl;
  }

  getFileUrl(path: string): string {
    return `${this.config.apiUrl}/station/${this.config.stationId}/file/${encodeURIComponent(path)}`;
  }

  createWebSocket(onMessage: (data: NowPlayingData) => void): WebSocket | null {
    try {
      const ws = new WebSocket(this.config.wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({
          subs: { [`station:${this.config.stationId}`]: {} }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.pub?.data?.np) {
            onMessage(data.pub.data.np);
          }
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };

      return ws;
    } catch (e) {
      console.warn('WebSocket connection failed (insecure context or network issue):', e);
      return null;
    }
  }
}

export const api = new AzuraCastAPI();
