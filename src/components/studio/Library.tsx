import { useState } from 'react';
import { Folder, Music, ArrowLeft, RefreshCw, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LibraryFile, getColorForItem } from '@/lib/azuracast';
import { cn } from '@/lib/utils';

interface LibraryProps {
  items: LibraryFile[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onNavigateUp: () => void;
  onRefresh: () => void;
  onAddToQueue: (files: string[]) => Promise<void>;
}

export function Library({
  items,
  currentPath,
  onNavigate,
  onNavigateUp,
  onRefresh,
  onAddToQueue,
}: LibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Sort items: folders first, then alphabetically
  const sortedItems = [...items].sort((a, b) => {
    if (a.is_dir && !b.is_dir) return -1;
    if (!a.is_dir && b.is_dir) return 1;
    return (a.name || a.text || '').localeCompare(b.name || b.text || '');
  });

  // Filter by search
  const filteredItems = sortedItems.filter((item) => {
    const name = (item.name || item.text || '').toLowerCase();
    const artist = (item.artist || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const searchLower = search.toLowerCase();
    return name.includes(searchLower) || artist.includes(searchLower) || title.includes(searchLower);
  });

  const toggleSelection = (path: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    setSelectedFiles(newSelection);
  };

  const handleQueueSelected = async () => {
    if (selectedFiles.size > 0) {
      await onAddToQueue(Array.from(selectedFiles));
      setSelectedFiles(new Set());
    }
  };

  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.setData('text/library-file', 'true');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass p-3 rounded-t-xl space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={onNavigateUp}
            disabled={!currentPath}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 font-mono text-xs text-muted-foreground truncate direction-rtl text-left">
            /{currentPath || ''}
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-primary"
            onClick={handleQueueSelected}
            disabled={selectedFiles.size === 0}
          >
            <Plus className="h-4 w-4 mr-1" />
            ZAŘADIT ({selectedFiles.size})
          </Button>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredItems.map((item) => {
          const name = item.name || item.text || '';
          const fullText = `${name} ${item.artist || ''} ${item.title || ''}`;
          const itemColor = getColorForItem(fullText);
          const isSelected = selectedFiles.has(item.path);

          if (item.is_dir) {
            // Folder item
            return (
              <div
                key={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all",
                  "glass hover:bg-warning/10"
                )}
                style={itemColor ? { borderLeft: `3px solid ${itemColor}` } : undefined}
                onClick={() => onNavigate(item.path)}
              >
                <Folder className="h-5 w-5 text-warning flex-shrink-0" />
                <span className="font-bold text-sm truncate">{name}</span>
              </div>
            );
          }

          // Song item
          const displayName = item.artist && item.title
            ? `${item.artist} - ${item.title}`
            : name.split('/').pop()?.replace(/\.[^/.]+$/, '') || name;

          return (
            <div
              key={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg cursor-grab transition-all",
                "glass hover:bg-primary/10",
                isSelected && "bg-primary/20 border-l-4 border-primary"
              )}
              style={!isSelected && itemColor ? { borderLeft: `3px solid ${itemColor}` } : undefined}
              draggable
              onDragStart={(e) => handleDragStart(e, item.path)}
              onClick={() => toggleSelection(item.path)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelection(item.path)}
                onClick={(e) => e.stopPropagation()}
              />
              <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{displayName}</div>
                {item.album && (
                  <div className="text-xs text-muted-foreground truncate">{item.album}</div>
                )}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            Žádné soubory
          </div>
        )}
      </div>
    </div>
  );
}
