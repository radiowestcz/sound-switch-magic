import { useState, useEffect } from 'react';
import { Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface HeaderProps {
  isConnected: boolean;
  streamUrl: string;
}

export function Header({ isConnected, streamUrl }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const [isDark, setIsDark] = useState(true);
  const [isMonitorOn, setIsMonitorOn] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  // Clock update
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Audio element for stream monitoring
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    setAudioRef(audio);
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('light');
  };

  const toggleMonitor = () => {
    if (!audioRef) return;
    
    if (isMonitorOn) {
      audioRef.pause();
      setIsMonitorOn(false);
    } else {
      audioRef.src = streamUrl;
      audioRef.volume = volume;
      audioRef.play().then(() => {
        setIsMonitorOn(true);
      }).catch(console.error);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef) {
      audioRef.volume = newVolume;
    }
  };

  const formattedTime = time.toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="glass-elevated h-14 flex items-center justify-between px-5 rounded-b-xl">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold">
          <span className="text-primary">Vambi</span>OnAir
        </h1>
        <span className="text-[10px] text-muted-foreground">v3.0</span>
      </div>

      {/* Monitor controls */}
      <div className="glass flex items-center gap-3 px-4 py-1.5 rounded-full">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Monitor
        </span>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full transition-colors",
            isMonitorOn && "text-success"
          )}
          onClick={toggleMonitor}
        >
          {isMonitorOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Slider
          value={[volume]}
          max={1}
          step={0.1}
          onValueChange={handleVolumeChange}
          className="w-16"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <span
          className={cn(
            "text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider",
            isConnected
              ? "bg-success text-success-foreground"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="glass gap-2 rounded-full px-3"
          onClick={toggleTheme}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="text-xs">Mode</span>
        </Button>

        {/* Clock */}
        <div className="font-mono-timer text-xl font-semibold tabular-nums">
          {formattedTime}
        </div>
      </div>
    </header>
  );
}
