import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/studio/Header';
import { NowPlaying } from '@/components/studio/NowPlaying';
import { Queue } from '@/components/studio/Queue';
import { Library } from '@/components/studio/Library';
import { VoiceRecorderModal } from '@/components/studio/VoiceRecorderModal';
import { useAzuraCast } from '@/hooks/useAzuraCast';
import { defaultConfig } from '@/lib/azuracast';

const Index = () => {
  const { toast } = useToast();
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);

  const {
    nowPlaying,
    queue,
    library,
    currentPath,
    isConnected,
    remainingTime,
    elapsedTime,
    progress,
    skip,
    addToQueue,
    removeFromQueue,
    navigateTo,
    navigateUp,
    refreshLibrary,
  } = useAzuraCast();

  const handleSkip = async () => {
    try {
      await skip();
      toast({ title: 'Přeskakuji...', description: 'Mixuji na další skladbu' });
    } catch (e) {
      toast({ title: 'Chyba', description: 'Nepodařilo se přeskočit', variant: 'destructive' });
    }
  };

  const handleRemoveFromQueue = async (id: number | string) => {
    try {
      await removeFromQueue(id);
      toast({ title: 'Odstraněno', description: 'Položka byla odebrána z fronty' });
    } catch (e) {
      toast({ title: 'Chyba', description: 'Nepodařilo se odstranit', variant: 'destructive' });
    }
  };

  const handleAddToQueue = async (files: string[]) => {
    try {
      await addToQueue(files);
      toast({ title: 'Přidáno', description: `${files.length} soubor(ů) přidáno do fronty` });
    } catch (e) {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat do fronty', variant: 'destructive' });
    }
  };

  const handleAddFiles = (files: FileList) => {
    toast({ title: 'Info', description: 'Upload souborů vyžaduje backend integraci' });
  };

  const handleVoiceSave = (blob: Blob, name: string) => {
    toast({ title: 'Voice Track', description: `"${name}" připraven - vyžaduje backend upload` });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header isConnected={isConnected} streamUrl={defaultConfig.streamUrl} />

      <main className="flex-1 flex overflow-hidden">
        {/* Left - Player & Queue */}
        <div className="flex-[6] flex flex-col min-w-[650px] border-r border-border overflow-hidden p-4 gap-4">
          <NowPlaying
            data={nowPlaying}
            remainingTime={remainingTime}
            elapsedTime={elapsedTime}
            progress={progress}
            onSkip={handleSkip}
          />
          <Queue
            items={queue}
            remainingTime={remainingTime}
            onRemove={handleRemoveFromQueue}
            onAddFiles={handleAddFiles}
            onOpenVoiceRecorder={() => setIsVoiceRecorderOpen(true)}
          />
        </div>

        {/* Right - Library */}
        <aside className="flex-[4] min-w-[350px] overflow-hidden p-4">
          <div className="h-full glass-elevated rounded-xl overflow-hidden">
            <Library
              items={library}
              currentPath={currentPath}
              onNavigate={navigateTo}
              onNavigateUp={navigateUp}
              onRefresh={refreshLibrary}
              onAddToQueue={handleAddToQueue}
            />
          </div>
        </aside>
      </main>

      <VoiceRecorderModal
        isOpen={isVoiceRecorderOpen}
        onClose={() => setIsVoiceRecorderOpen(false)}
        onSave={handleVoiceSave}
      />

      <Toaster />
    </div>
  );
};

export default Index;
