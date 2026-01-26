import { useState, useRef, useEffect, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Video,
  Square,
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  Mic,
} from 'lucide-react';
import { ZoneChecklist } from './ZoneChecklist';
import { SimpleHint } from './SimpleHint';
import { EndOfPieceCheck } from './EndOfPieceCheck';
import { OneQuestionQueue, useQuestionQueue } from './OneQuestionQueue';
import { SMART_DEFAULTS, getContextualHint } from './SmartDefaults';
import type { ZoneId } from './SimpleCaptureUI';

const ZONES = [
  { id: 'mur' as ZoneId, label: 'Mur' },
  { id: 'sol' as ZoneId, label: 'Sol' },
  { id: 'plafond' as ZoneId, label: 'Plafond' },
  { id: 'ouvertures' as ZoneId, label: 'Ouvertures' },
  { id: 'details' as ZoneId, label: 'Détails' },
] as const;

interface DemoReadyCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  initialPiece?: string;
  onComplete: (data: {
    videoBlob?: Blob;
    transcript: string;
    checkedZones: ZoneId[];
    duration: number;
  }) => void;
}

/**
 * DemoReadyCapture - Ultra-simplified capture for 30-second onboarding
 * 
 * Design principles:
 * 1. SINGLE main action per screen
 * 2. BIG buttons (64-72px) for one-handed use
 * 3. SUPER CLEAN: video + transcript (3 lines) + checklist only
 * 4. SHORT hints (1 line)
 * 5. ONE question at a time
 * 6. SMART defaults (never block on missing fields)
 * 7. END-OF-PIECE check with simple ✔/❌
 * 8. CLEAR confirmation when complete
 */
export const DemoReadyCapture = ({
  open,
  onOpenChange,
  projectId,
  projectName,
  initialPiece = SMART_DEFAULTS.pieceName,
  onComplete,
}: DemoReadyCaptureProps) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [checkedZones, setCheckedZones] = useState<Set<ZoneId>>(new Set());
  const [currentPiece] = useState(initialPiece);
  const [showEndCheck, setShowEndCheck] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Question queue (enforces 1-at-a-time rule)
  const { questions, addQuestion, handleQuestionAnswered, clearQuestions } = useQuestionQueue();

  // Request camera permission on mount
  useEffect(() => {
    if (open) {
      requestPermissions();
    }
    return () => {
      cleanup();
    };
  }, [open]);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionGranted(true);
    } catch (error) {
      toast.error("Accès caméra refusé");
      setPermissionGranted(false);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    setRecordingTime(0);
    clearQuestions();
  };

  // Format time
  const formatTime = (s: number) => 
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      toast.error("Caméra non disponible");
      return;
    }

    chunksRef.current = [];
    
    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        onComplete({
          videoBlob: blob,
          transcript,
          checkedZones: Array.from(checkedZones),
          duration: recordingTime,
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

      toast.success("🎬 C'est parti !", { duration: 1500 });
    } catch (error) {
      toast.error("Erreur d'enregistrement");
    }
  }, [transcript, checkedZones, recordingTime, onComplete]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (recordingTime < SMART_DEFAULTS.minRecordingTime) {
        toast.info("Continue encore un peu...");
        return;
      }
      
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      cleanup();
      onOpenChange(false);
    }
  }, [isRecording, recordingTime, onOpenChange]);

  // Toggle zone
  const toggleZone = useCallback((zoneId: ZoneId) => {
    setCheckedZones(prev => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return next;
    });
  }, []);

  // Handle piece complete
  const handlePieceComplete = () => {
    const missing = ZONES.filter(z => !checkedZones.has(z.id));
    if (missing.length > 0) {
      setShowEndCheck(true);
    } else {
      stopRecording();
    }
  };

  // Get contextual hint
  const hint = getContextualHint({
    isRecording,
    recordingTime,
    completedZones: checkedZones.size,
    totalZones: ZONES.length,
  });

  const allComplete = ZONES.every(z => checkedZones.has(z.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[100vh] p-0 bg-black"
        hideCloseButton
      >
        <div className="flex flex-col h-full">
          {/* Minimal header */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 safe-area-top flex items-center justify-between">
            <Badge variant="secondary" className="bg-black/60 text-white border-0 px-3 py-1.5">
              📍 {currentPiece}
            </Badge>
            
            <div className="flex items-center gap-2">
              {isRecording && (
                <Badge variant="destructive" className="animate-pulse gap-1.5 px-3 py-1.5">
                  <Circle className="h-2 w-2 fill-current" />
                  {formatTime(recordingTime)}
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20 h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Video preview */}
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Live transcript (3 lines max) */}
            {isRecording && transcript && (
              <div className="absolute bottom-32 left-4 right-4 z-10">
                <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-white text-sm line-clamp-3">
                    {transcript.slice(-180)}
                  </p>
                </div>
              </div>
            )}

            {/* Zone checklist (right side during recording) */}
            {isRecording && (
              <ZoneChecklist
                zones={ZONES}
                checkedZones={checkedZones}
                onToggle={toggleZone}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
              />
            )}

            {/* Recording indicator overlay */}
            {isRecording && (
              <div className="absolute top-20 left-4 z-10">
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <Mic className="h-4 w-4 animate-pulse text-red-400" />
                  <span>Décris ce que tu vois...</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom controls - SINGLE PRIMARY ACTION */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 safe-area-bottom bg-gradient-to-t from-black via-black/90 to-transparent z-20">
            {/* Short hint */}
            <SimpleHint text={hint} className="mb-5" />

            {/* PRIMARY CTA */}
            <div className="flex justify-center">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={!permissionGranted}
                  className="h-[72px] px-14 text-xl font-bold rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40 active:scale-95 transition-all"
                >
                  <Video className="h-7 w-7 mr-3" />
                  Démarrer
                </Button>
              ) : allComplete ? (
                <Button
                  onClick={handlePieceComplete}
                  className="h-[72px] px-12 text-xl font-bold rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/40 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="h-7 w-7 mr-3" />
                  Terminé ✔
                </Button>
              ) : (
                <Button
                  onClick={handlePieceComplete}
                  className="h-[72px] w-[72px] rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40 active:scale-95 transition-all"
                >
                  <Square className="h-8 w-8 fill-current" />
                </Button>
              )}
            </div>

            {/* Secondary action (subtle) */}
            {isRecording && !allComplete && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="ghost"
                  onClick={handlePieceComplete}
                  className="text-white/50 hover:text-white text-sm"
                >
                  Passer à la suite
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* End of piece check */}
        <EndOfPieceCheck
          open={showEndCheck}
          onOpenChange={setShowEndCheck}
          zones={ZONES}
          checkedZones={checkedZones}
          onContinue={(skip) => {
            setShowEndCheck(false);
            if (skip) {
              stopRecording();
            }
          }}
          onFilmMissing={(zoneId) => {
            setShowEndCheck(false);
            toast.info(`Filme le ${ZONES.find(z => z.id === zoneId)?.label}`);
          }}
        />

        {/* One question at a time queue */}
        <OneQuestionQueue
          questions={questions}
          onQuestionAnswered={handleQuestionAnswered}
        />
      </SheetContent>
    </Sheet>
  );
};
