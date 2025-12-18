import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Mic, Square, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blob: Blob, name: string) => void;
}

export function VoiceRecorderModal({ isOpen, onClose, onSave }: VoiceRecorderModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingName, setRecordingName] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Request microphone permission when modal opens
  useEffect(() => {
    if (isOpen) {
      requestMicrophonePermission();
    } else {
      resetRecorder();
    }
  }, [isOpen]);

  const requestMicrophonePermission = async () => {
    setError(null);
    setPermissionStatus('pending');
    
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      console.log('Microphone access granted');
      streamRef.current = stream;
      setPermissionStatus('granted');
    } catch (err) {
      console.error('Microphone permission error:', err);
      setPermissionStatus('denied');
      setError('Přístup k mikrofonu byl zamítnut. Povolte prosím přístup v nastavení prohlížeče.');
    }
  };

  const resetRecorder = () => {
    stopRecording();
    setRecordingTime(0);
    setRecordedBlob(null);
    setRecordingName('');
    setError(null);
    audioChunksRef.current = [];
    
    // Stop and release stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setPermissionStatus('pending');
  };

  const startRecording = useCallback(async () => {
    setError(null);
    
    try {
      let stream = streamRef.current;
      
      // If no stream, request permission again
      if (!stream) {
        console.log('No stream, requesting microphone...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          } 
        });
        streamRef.current = stream;
        setPermissionStatus('granted');
      }

      // Check supported mimeTypes
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      
      console.log('Using mimeType:', mimeType);
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      // Setup visualizer
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      drawVisualizer();

      mediaRecorderRef.current.ondataavailable = (e) => {
        console.log('Data available:', e.data.size, 'bytes');
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Created blob:', blob.size, 'bytes');
        setRecordedBlob(blob);
      };

      mediaRecorderRef.current.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setError('Chyba při nahrávání');
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      console.log('Recording started');

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Start recording error:', err);
      setError('Nepodařilo se spustit nahrávání. Zkontrolujte přístup k mikrofonu.');
      setPermissionStatus('denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsRecording(false);
  }, []);

  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      animationRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const hue = (i / bufferLength) * 120 + 160;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const handleSave = () => {
    if (recordedBlob) {
      const name = recordingName.trim() || 
        `VoiceTrack_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}`;
      onSave(recordedBlob, name);
      onClose();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-elevated border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Mic className="h-5 w-5" />
            Nahrát Voice Track
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/20 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Permission denied state */}
          {permissionStatus === 'denied' && !error && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Pro nahrávání je nutný přístup k mikrofonu.
              </p>
              <Button onClick={requestMicrophonePermission} variant="outline">
                Zkusit znovu
              </Button>
            </div>
          )}

          {/* Permission pending state */}
          {permissionStatus === 'pending' && !error && (
            <div className="text-center py-8">
              <Mic className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">
                Čekám na povolení mikrofonu...
              </p>
            </div>
          )}

          {/* Recording interface - only show when permission granted */}
          {permissionStatus === 'granted' && (
            <>
              {/* Status */}
              <p className="text-center text-muted-foreground">
                {isRecording
                  ? 'Nahrávám...'
                  : recordedBlob
                  ? 'Nahrávka připravena k uložení'
                  : 'Připraveno k nahrávání'}
              </p>

              {/* Timer */}
              <div className="text-center font-mono-timer text-5xl font-bold">
                {formatTime(recordingTime)}
              </div>

              {/* Visualizer */}
              <div className="glass h-16 rounded-lg overflow-hidden">
                <canvas ref={canvasRef} className="w-full h-full" width={400} height={64} />
              </div>

              {/* Recording name input */}
              <Input
                placeholder="Název nahrávky (volitelné)"
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                className="bg-input border-border"
              />

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <Button
                  size="lg"
                  className={cn(
                    "w-16 h-16 rounded-full text-2xl",
                    isRecording
                      ? "bg-muted hover:bg-muted/80 text-foreground"
                      : "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive"
                  )}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <Square className="h-6 w-6" /> : <span>●</span>}
                </Button>

                <Button
                  size="lg"
                  className="px-8 bg-success hover:bg-success/90 text-success-foreground font-bold shadow-success"
                  disabled={!recordedBlob}
                  onClick={handleSave}
                >
                  <Save className="h-5 w-5 mr-2" />
                  ULOŽIT
                </Button>
              </div>

              {/* Info */}
              <p className="text-center text-xs text-muted-foreground">
                Nahrávka bude uložena na server ve formátu WebM/Opus
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
