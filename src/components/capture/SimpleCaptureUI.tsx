import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Video, 
  Square, 
  CheckCircle2, 
  Circle,
  ArrowRight,
  MoreHorizontal
} from 'lucide-react';
import { ZoneChecklist } from './ZoneChecklist';
import { SimpleHint } from './SimpleHint';
import { EndOfPieceCheck } from './EndOfPieceCheck';

// Zone types for checklist
export const CAPTURE_ZONES = [
  { id: 'mur', label: 'Mur', checked: false },
  { id: 'sol', label: 'Sol', checked: false },
  { id: 'plafond', label: 'Plafond', checked: false },
  { id: 'ouvertures', label: 'Ouvertures', checked: false },
  { id: 'details', label: 'Détails', checked: false },
] as const;

export type ZoneId = typeof CAPTURE_ZONES[number]['id'];

interface SimpleCaptureUIProps {
  isRecording: boolean;
  recordingTime: number;
  transcript?: string;
  currentPiece: string;
  onStart: () => void;
  onStop: () => void;
  onNext: () => void;
  onZoneToggle?: (zoneId: ZoneId) => void;
  checkedZones?: Set<ZoneId>;
  className?: string;
}

/**
 * SimpleCaptureUI - Demo-ready ultra-simplified capture interface
 * 
 * Design principles:
 * - ONE primary action per screen (Start/Stop/Next)
 * - BIG buttons (64-72px) for one-handed field use
 * - Clean UI: video preview + transcript + checklist only
 * - Short hints (1 line max)
 */
export const SimpleCaptureUI = ({
  isRecording,
  recordingTime,
  transcript = '',
  currentPiece,
  onStart,
  onStop,
  onNext,
  onZoneToggle,
  checkedZones = new Set(),
  className,
}: SimpleCaptureUIProps) => {
  const [showEndCheck, setShowEndCheck] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current hint based on state
  const getHint = (): string => {
    if (!isRecording && recordingTime === 0) {
      return "Filme en marchant et décris ce que tu vois.";
    }
    if (isRecording) {
      const unchecked = CAPTURE_ZONES.filter(z => !checkedZones.has(z.id));
      if (unchecked.length > 0) {
        return `Pense à vérifier : ${unchecked[0].label}`;
      }
      return "Dis 'Suivant' pour passer à la prochaine pièce.";
    }
    return "Appuie pour commencer";
  };

  // Handle piece completion
  const handlePieceComplete = () => {
    const uncheckedZones = CAPTURE_ZONES.filter(z => !checkedZones.has(z.id));
    if (uncheckedZones.length > 0) {
      setShowEndCheck(true);
    } else {
      onNext();
    }
  };

  // All zones checked?
  const allZonesComplete = CAPTURE_ZONES.every(z => checkedZones.has(z.id));

  return (
    <div className={cn("flex flex-col h-full bg-black", className)}>
      {/* Minimal header - just piece name */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-black/60 text-white border-0 text-sm px-3 py-1.5">
            📍 {currentPiece}
          </Badge>
          
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse gap-1.5">
              <Circle className="h-2.5 w-2.5 fill-current" />
              {formatTime(recordingTime)}
            </Badge>
          )}
        </div>
      </div>

      {/* Video preview - takes most space */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Live transcript overlay (2-3 lines max) */}
        {isRecording && transcript && (
          <div className="absolute bottom-24 left-4 right-4">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 max-h-20 overflow-hidden">
              <p className="text-white text-sm line-clamp-3">
                {transcript.slice(-200)}
              </p>
            </div>
          </div>
        )}

        {/* Zone checklist during recording */}
        {isRecording && (
          <ZoneChecklist
            zones={CAPTURE_ZONES}
            checkedZones={checkedZones}
            onToggle={onZoneToggle}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          />
        )}
      </div>

      {/* Bottom controls - SINGLE PRIMARY ACTION */}
      <div className="p-6 pb-8 safe-area-bottom bg-gradient-to-t from-black to-transparent">
        {/* Short hint */}
        <SimpleHint text={getHint()} className="mb-4" />

        {/* PRIMARY CTA - Always centered, always 64-72px tall */}
        <div className="flex justify-center">
          {!isRecording ? (
            <Button
              onClick={onStart}
              className="h-[72px] px-12 text-xl font-bold rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40 transition-all active:scale-95"
            >
              <Video className="h-7 w-7 mr-3" />
              Démarrer
            </Button>
          ) : allZonesComplete ? (
            <Button
              onClick={handlePieceComplete}
              className="h-[72px] px-12 text-xl font-bold rounded-full bg-primary hover:bg-primary/90 shadow-lg transition-all active:scale-95"
            >
              <CheckCircle2 className="h-7 w-7 mr-3" />
              Pièce terminée
            </Button>
          ) : (
            <Button
              onClick={onStop}
              className="h-[72px] w-[72px] rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40 transition-all active:scale-95"
            >
              <Square className="h-8 w-8 fill-current" />
            </Button>
          )}
        </div>

        {/* Secondary actions - hidden in "More" or small */}
        {isRecording && !allZonesComplete && (
          <div className="flex justify-center mt-4">
            <Button
              variant="ghost"
              onClick={handlePieceComplete}
              className="text-white/60 hover:text-white text-sm"
            >
              Passer à la suite
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* End of piece check dialog */}
      <EndOfPieceCheck
        open={showEndCheck}
        onOpenChange={setShowEndCheck}
        zones={CAPTURE_ZONES}
        checkedZones={checkedZones}
        onContinue={(skipMissing) => {
          setShowEndCheck(false);
          if (skipMissing) {
            onNext();
          }
        }}
      />
    </div>
  );
};
