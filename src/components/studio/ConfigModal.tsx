import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

export interface AzuraCastSettings {
  serverUrl: string;
  stationId: string;
  username: string;
  password: string;
  apiKey: string;
  streamUrl: string;
}

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AzuraCastSettings) => void;
  initialSettings?: AzuraCastSettings;
}

const STORAGE_KEY = 'azuracast_config';

export function getStoredConfig(): AzuraCastSettings | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function saveConfigToStorage(settings: AzuraCastSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function ConfigModal({ isOpen, onClose, onSave, initialSettings }: ConfigModalProps) {
  const [settings, setSettings] = useState<AzuraCastSettings>({
    serverUrl: '',
    stationId: '1',
    username: '',
    password: '',
    apiKey: '',
    streamUrl: '',
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    } else {
      const stored = getStoredConfig();
      if (stored) {
        setSettings(stored);
      }
    }
  }, [initialSettings, isOpen]);

  const handleSave = () => {
    const cleanSettings = {
      ...settings,
      serverUrl: settings.serverUrl.replace(/\/$/, ''),
    };
    saveConfigToStorage(cleanSettings);
    onSave(cleanSettings);
    onClose();
  };

  const isValid = settings.serverUrl && settings.stationId && settings.apiKey;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Nastavení AzuraCast
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="serverUrl">Adresa serveru *</Label>
            <Input
              id="serverUrl"
              placeholder="https://demo.azuracast.com"
              value={settings.serverUrl}
              onChange={(e) => setSettings({ ...settings, serverUrl: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="stationId">Číslo stanice *</Label>
              <Input
                id="stationId"
                placeholder="1"
                value={settings.stationId}
                onChange={(e) => setSettings({ ...settings, stationId: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Váš API klíč"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Uživatelské jméno</Label>
              <Input
                id="username"
                placeholder="admin (volitelné)"
                value={settings.username}
                onChange={(e) => setSettings({ ...settings, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Heslo</Label>
              <Input
                id="password"
                type="password"
                placeholder="Heslo (volitelné)"
                value={settings.password}
                onChange={(e) => setSettings({ ...settings, password: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="streamUrl">Stream URL pro monitoring</Label>
            <Input
              id="streamUrl"
              placeholder="https://demo.azuracast.com/radio/8000/radio.mp3"
              value={settings.streamUrl}
              onChange={(e) => setSettings({ ...settings, streamUrl: e.target.value })}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            * Povinná pole. Nastavení se ukládá do prohlížeče.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Uložit nastavení
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
