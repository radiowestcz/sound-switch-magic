import { SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NowPlayingData } from '@/lib/azuracast';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NowPlayingProps {
  data: NowPlayingData | null;
  remainingTime: number;
  elapsedTime: number;
  progress: number;
  onSkip: () => Promise<void>;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.floor(Math.abs(seconds) % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function NowPlaying({ data, remainingTime, elapsedTime, progress, onSkip }: NowPlayingProps) {
  const [isSkipping, setIsSkipping] = useState(false);

  const song = data?.now_playing?.song;
  const duration = data?.now_playing?.duration || 0;

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      await onSkip();
    } finally {
      setIsSkipping(false);
    }
  };

  // Timer color logic
  const getTimerClasses = () => {
    if (remainingTime <= 5 && remainingTime > 0) {
      return 'timer-red blinking';
    }
    if (remainingTime <= 10 && remainingTime > 0) {
      return 'timer-green';
    }
    return '';
  };

  return (
    <div className="glass-elevated p-5 rounded-2xl flex gap-6">
      {/* Album Art Column */}
      <div className="flex flex-col gap-4 flex-shrink-0">
        {/* Art */}
        <div className="w-48 h-48 rounded-xl overflow-hidden bg-black border-2 border-border shadow-elevated">
          <img
            src={song?.art || 'https://via.placeholder.com/200'}
            alt="Album art"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Skip button */}
        <Button
          onClick={handleSkip}
          disabled={isSkipping}
          className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-primary transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <SkipForward className="h-5 w-5 mr-2" />
          {isSkipping ? 'MIXUJI...' : 'MIX (NEXT)'}
        </Button>
      </div>

      {/* Info Column */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="flex gap-5">
          {/* Metadata */}
          <div className="flex-1 min-w-0 pt-1">
            <span className="inline-flex items-center gap-2 text-destructive font-bold text-xs tracking-widest uppercase mb-2">
              <span className="w-2 h-2 bg-destructive rounded-full on-air-pulse" />
              ON AIR
            </span>
            <h2 className="text-4xl font-extrabold uppercase truncate leading-tight mb-1">
              {song?.title || 'NAČÍTÁM...'}
            </h2>
            <p className="text-2xl font-semibold text-muted-foreground uppercase truncate">
              {song?.artist || '...'}
            </p>
          </div>

          {/* Timer Box */}
          <div className="w-52 h-28 glass flex flex-col items-center justify-center rounded-xl flex-shrink-0">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
              Do konce
            </span>
            <div className={cn("font-mono-timer text-5xl font-bold", getTimerClasses())}>
              -{formatTime(remainingTime)}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <Progress value={progress} className="h-2 mb-2" />
          <div className="flex justify-between font-mono text-xs text-muted-foreground">
            <span>{formatTime(elapsedTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
