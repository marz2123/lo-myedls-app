import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Layers, ToggleLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewMode = 'side-by-side' | 'swipe' | 'toggle';

interface ComparisonViewerProps {
  entryPhotoUrl: string;
  exitPhotoUrl: string;
  roomName: string;
  elementType: string;
  highlightBox?: { x: number; y: number; width: number; height: number };
}

export function ComparisonViewer({
  entryPhotoUrl,
  exitPhotoUrl,
  roomName,
  elementType,
  highlightBox
}: ComparisonViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showEntry, setShowEntry] = useState(true);

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-xl">
        <Button
          variant={viewMode === 'side-by-side' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('side-by-side')}
          className="gap-2"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Côte à côte
        </Button>
        <Button
          variant={viewMode === 'swipe' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('swipe')}
          className="gap-2"
        >
          <Layers className="h-4 w-4" />
          Curseur
        </Button>
        <Button
          variant={viewMode === 'toggle' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('toggle')}
          className="gap-2"
        >
          <ToggleLeft className="h-4 w-4" />
          Bascule
        </Button>
      </div>

      {/* Labels */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{roomName} — {elementType}</p>
      </div>

      {/* Comparison View */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        <AnimatePresence mode="wait">
          {viewMode === 'side-by-side' && (
            <motion.div
              key="side-by-side"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full"
            >
              <div className="relative w-1/2 h-full border-r-2 border-white/20">
                <img
                  src={entryPhotoUrl}
                  alt="État d'entrée"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-3 py-1 bg-green-500/90 text-white text-xs font-medium rounded-full">
                  ENTRÉE
                </div>
                {highlightBox && (
                  <div
                    className="absolute border-2 border-red-500 rounded animate-pulse"
                    style={{
                      left: `${highlightBox.x}%`,
                      top: `${highlightBox.y}%`,
                      width: `${highlightBox.width}%`,
                      height: `${highlightBox.height}%`
                    }}
                  />
                )}
              </div>
              <div className="relative w-1/2 h-full">
                <img
                  src={exitPhotoUrl}
                  alt="État de sortie"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 px-3 py-1 bg-orange-500/90 text-white text-xs font-medium rounded-full">
                  SORTIE
                </div>
                {highlightBox && (
                  <div
                    className="absolute border-2 border-red-500 rounded animate-pulse"
                    style={{
                      left: `${highlightBox.x}%`,
                      top: `${highlightBox.y}%`,
                      width: `${highlightBox.width}%`,
                      height: `${highlightBox.height}%`
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}

          {viewMode === 'swipe' && (
            <motion.div
              key="swipe"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-full cursor-ew-resize"
              onMouseMove={handleSliderMove}
            >
              {/* Exit photo (background) */}
              <img
                src={exitPhotoUrl}
                alt="État de sortie"
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Entry photo (clipped) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
              >
                <img
                  src={entryPhotoUrl}
                  alt="État d'entrée"
                  className="w-full h-full object-cover"
                  style={{ 
                    width: `${100 / (sliderPosition / 100)}%`,
                    maxWidth: 'none'
                  }}
                />
              </div>

              {/* Slider line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Labels */}
              <div className="absolute bottom-2 left-2 px-3 py-1 bg-green-500/90 text-white text-xs font-medium rounded-full">
                ENTRÉE
              </div>
              <div className="absolute bottom-2 right-2 px-3 py-1 bg-orange-500/90 text-white text-xs font-medium rounded-full">
                SORTIE
              </div>
            </motion.div>
          )}

          {viewMode === 'toggle' && (
            <motion.div
              key="toggle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-full cursor-pointer"
              onClick={() => setShowEntry(!showEntry)}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={showEntry ? 'entry' : 'exit'}
                  src={showEntry ? entryPhotoUrl : exitPhotoUrl}
                  alt={showEntry ? "État d'entrée" : "État de sortie"}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                />
              </AnimatePresence>
              
              <div className={cn(
                "absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-2 text-white text-sm font-medium rounded-full transition-colors",
                showEntry ? "bg-green-500/90" : "bg-orange-500/90"
              )}>
                {showEntry ? 'ENTRÉE' : 'SORTIE'} — Tapez pour basculer
              </div>

              {highlightBox && (
                <div
                  className="absolute border-2 border-red-500 rounded animate-pulse"
                  style={{
                    left: `${highlightBox.x}%`,
                    top: `${highlightBox.y}%`,
                    width: `${highlightBox.width}%`,
                    height: `${highlightBox.height}%`
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
