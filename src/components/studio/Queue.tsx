import { Lock, Trash2, MapPin, StopCircle, Mic, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QueueItem, getColorForItem } from '@/lib/azuracast';
import { cn } from '@/lib/utils';
import { useRef } from 'react';

interface QueueProps {
  items: QueueItem[];
  remainingTime: number;
  onRemove: (id: number | string) => Promise<void>;
  onAddFiles: (files: FileList) => void;
  onOpenVoiceRecorder: () => void;
}

function formatQueueTime(playedAt: number | null, localNextStart: number): string {
  if (playedAt) {
    return new Date(playedAt * 1000).toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  return new Date(localNextStart).toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function Queue({ items, remainingTime, onRemove, onAddFiles, onOpenVoiceRecorder }: QueueProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  // Calculate expected play times
  let localNextStart = Date.now() + remainingTime * 1000;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="glass flex items-center justify-between px-4 py-2 rounded-t-xl">
        <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
          FRONTA (NEXT) <span className="text-primary">({items.length})</span>
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-success hover:bg-success/90 text-success-foreground font-bold text-xs h-8 shadow-success"
            onClick={handleFileClick}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            SOUBOR Z PC
          </Button>
          <Button
            size="sm"
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs h-8 shadow-destructive"
            onClick={onOpenVoiceRecorder}
          >
            <Mic className="h-3.5 w-3.5 mr-1" />
            VOICE TRACK
          </Button>
          <Button
            size="sm"
            className="bg-warning hover:bg-warning/90 text-warning-foreground font-bold text-xs h-8"
          >
            <StopCircle className="h-3.5 w-3.5 mr-1" />
            VLOŽIT STOP
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Table header */}
      <div className="grid grid-cols-[40px_70px_1fr_100px_80px] gap-2 px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
        <span>#</span>
        <span>Čas</span>
        <span>Skladba</span>
        <span>Typ</span>
        <span>Akce</span>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            Fronta prázdná
          </div>
        ) : (
          items.map((item, index) => {
            const isLocked = index < 2;
            const checkString = `${item.playlist || ''} ${item.song.title} ${item.song.artist}`;
            const itemColor = getColorForItem(checkString);
            const timeStr = formatQueueTime(item.played_at, localNextStart);
            
            // Update next start time
            if (item.duration) {
              localNextStart += item.duration * 1000;
            }

            const source = item.is_request ? 'Request' : (item.playlist || 'AutoDJ');
            const itemId = item.id || item.cued_at;

            return (
              <div
                key={itemId}
                className={cn(
                  "grid grid-cols-[40px_70px_1fr_100px_80px] gap-2 items-center px-4 py-3 rounded-lg transition-all",
                  "glass hover:bg-primary/10",
                  isLocked && "opacity-60 cursor-not-allowed"
                )}
                style={itemColor ? { borderLeft: `3px solid ${itemColor}` } : undefined}
                draggable={!isLocked}
              >
                <span className="font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="font-mono text-sm font-bold text-muted-foreground">
                  {timeStr}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-sm uppercase truncate">
                    {item.song.title}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase truncate">
                    {item.song.artist}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  {source}
                </span>
                <div className="flex gap-1">
                  {isLocked ? (
                    <span className="text-muted-foreground" title="Uzamčeno">
                      <Lock className="h-4 w-4" />
                    </span>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded border border-border hover:border-primary hover:text-primary"
                        title="Vložit sem"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded border border-border hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        title="Smazat"
                        onClick={() => onRemove(itemId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
