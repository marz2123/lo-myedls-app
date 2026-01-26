import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, List, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEDLNavigationData } from '@/hooks/useEDLNavigationData';
import { Plan3DView } from './Plan3DView';
import { ListeView } from './ListeView';
import { GaleriePhotoView } from './GaleriePhotoView';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type NavigationMode = 'plan3d' | 'liste' | 'galerie';

interface TripleNavigationContainerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onRoomSelect: (roomId: string) => void;
  onElementSelect?: (roomId: string, elementId: string) => void;
}

export function TripleNavigationContainer({
  projectId,
  isOpen,
  onClose,
  onRoomSelect,
  onElementSelect
}: TripleNavigationContainerProps) {
  const [mode, setMode] = useState<NavigationMode>('plan3d');
  const { rooms, photos, loading, stats, selectedRoomId, setSelectedRoomId } = useEDLNavigationData(projectId);

  const modes: { id: NavigationMode; icon: typeof Home; label: string }[] = [
    { id: 'plan3d', icon: Home, label: 'Plan 3D' },
    { id: 'liste', icon: List, label: 'Liste' },
    { id: 'galerie', icon: Image, label: 'Photos' }
  ];

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    onRoomSelect(roomId);
    onClose();
  };

  const handleElementSelect = (roomId: string, elementId: string) => {
    setSelectedRoomId(roomId);
    if (onElementSelect) {
      onElementSelect(roomId, elementId);
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-3xl">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/50">
          <SheetHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold">Navigation EDL</SheetTitle>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </SheetHeader>

          {/* Stats bar */}
          <div className="px-4 py-2 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">
                {stats.completedRooms}/{stats.totalRooms} pièces
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-muted-foreground">
                {stats.totalAnomalies} anomalie{stats.totalAnomalies !== 1 && 's'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">
                {stats.totalPhotos} photo{stats.totalPhotos !== 1 && 's'}
              </span>
            </div>
          </div>

          {/* Mode selector */}
          <div className="px-4 pb-3">
            <div className="flex p-1 bg-muted/50 rounded-xl">
              {modes.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    mode === id 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {mode === 'plan3d' && (
                <motion.div
                  key="plan3d"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full p-4"
                >
                  <Plan3DView
                    rooms={rooms}
                    onRoomSelect={handleRoomSelect}
                    selectedRoomId={selectedRoomId}
                  />
                </motion.div>
              )}
              {mode === 'liste' && (
                <motion.div
                  key="liste"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <ListeView
                    rooms={rooms}
                    onRoomSelect={handleRoomSelect}
                    onElementSelect={handleElementSelect}
                    selectedRoomId={selectedRoomId}
                  />
                </motion.div>
              )}
              {mode === 'galerie' && (
                <motion.div
                  key="galerie"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <GaleriePhotoView
                    photos={photos}
                    rooms={rooms}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
