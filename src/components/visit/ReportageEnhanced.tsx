import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Video, 
  Camera, 
  Mic, 
  MicOff,
  ChevronRight, 
  ChevronLeft,
  Pause,
  Play,
  CheckCircle2,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Loader2,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LiveTranscription } from './LiveTranscription';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { QuickZoneButtons } from './QuickZoneButtons';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAdaptiveCompression } from '@/hooks/useAdaptiveCompression';
import { backgroundAIProcessor } from '@/services/backgroundAIProcessor';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// Zone types for quick shortcuts
const QUICK_ZONES = [
  { id: 'mur', label: 'Mur', emoji: '🧱' },
  { id: 'sol', label: 'Sol', emoji: '🪨' },
  { id: 'plafond', label: 'Plafond', emoji: '⬜' },
  { id: 'menuiseries', label: 'Menuiseries', emoji: '🪟' },
  { id: 'details', label: 'Détails', emoji: '🔧' },
];

interface ReportageEnhancedProps {
  projectId: string;
  currentLieu: {
    id: string;
    name: string;
    partType: 'commune' | 'privative';
  };
  currentEndroit?: {
    id: string;
    name: string;
    type: string;
  };
  totalZones: number;
  completedZones: number;
  onNext: () => void;
  onBack: () => void;
  onPhoto: () => Promise<void>;
  onZoneSelect: (zoneId: string) => void;
  onSave: (data: any) => Promise<void>;
  className?: string;
}

/**
 * ReportageEnhanced - Enhanced guided reportage mode with all Priority 1 features
 * 
 * Features:
 * - Live transcription during recording
 * - Voice navigation commands
 * - Large buttons (60px minimum)
 * - Visual progress bar
 * - Quick zone shortcuts
 * - Auto-save every 3 seconds
 * - Background AI processing
 * - Adaptive compression + offline mode
 */
export const ReportageEnhanced = ({
  projectId,
  currentLieu,
  currentEndroit,
  totalZones,
  completedZones,
  onNext,
  onBack,
  onPhoto,
  onZoneSelect,
  onSave,
  className,
}: ReportageEnhancedProps) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedZone, setSelectedZone] = useState<typeof QUICK_ZONES[0] | null>(null);
  const [transcript, setTranscript] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-save state
  const autoSaveData = {
    description: transcript,
    zoneType: selectedZone?.id,
    locationId: currentLieu.id,
    endroitName: currentEndroit?.name,
  };
  
  const { 
    isSaving, 
    lastSaved, 
    hasUnsavedChanges, 
    forceSave 
  } = useAutoSave(autoSaveData, {
    projectId,
    enabled: true,
    intervalMs: 3000,
    onSave: () => {
      console.log('[ReportageEnhanced] Auto-saved');
    },
  });

  // Adaptive compression & network
  const { 
    isOnline, 
    networkQuality, 
    settings: compressionSettings,
    compressVideo,
    getRecorderOptions,
    getVideoConstraints,
  } = useAdaptiveCompression();

  // Voice navigation
  const handleVoiceCommand = useCallback((action: string) => {
    console.log('[ReportageEnhanced] Voice command:', action);
    
    switch (action) {
      case 'NEXT':
        onNext();
        break;
      case 'BACK':
        onBack();
        break;
      case 'PHOTO':
        onPhoto();
        break;
      case 'PAUSE':
        if (isRecording && !isPaused) {
          handlePause();
        }
        break;
      case 'RESUME':
        if (isRecording && isPaused) {
          handleResume();
        }
        break;
      case 'ZONE_MUR':
        handleZoneSelect(QUICK_ZONES[0]);
        break;
      case 'ZONE_SOL':
        handleZoneSelect(QUICK_ZONES[1]);
        break;
      case 'ZONE_PLAFOND':
        handleZoneSelect(QUICK_ZONES[2]);
        break;
      case 'VALIDATE':
        handleStopRecording();
        break;
    }
  }, [onNext, onBack, onPhoto, isRecording, isPaused]);

  const {
    isListening: voiceListening,
    isSupported: voiceSupported,
    lastCommand,
    toggleListening: toggleVoice,
  } = useVoiceNavigation({
    enabled: voiceEnabled && isRecording,
    onCommand: handleVoiceCommand,
  });

  // Haptic feedback
  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (e) {
        // Haptics not available
      }
    }
  };

  // Handle zone selection
  const handleZoneSelect = (zone: typeof QUICK_ZONES[0]) => {
    setSelectedZone(zone);
    onZoneSelect(zone.id);
    triggerHaptic(ImpactStyle.Light);
    toast.success(`Zone: ${zone.label}`, { duration: 1000 });
  };

  // Start recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(),
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, getRecorderOptions());
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        
        // Compress if needed
        const processedBlob = await compressVideo(blob);
        
        // Queue background AI processing
        backgroundAIProcessor.queueFrameExtraction(processedBlob, currentLieu.id);
        
        // Save
        await onSave({
          videoBlob: processedBlob,
          transcript,
          zone: selectedZone,
          duration: recordingTime,
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Capture in 1-second chunks

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

      triggerHaptic(ImpactStyle.Heavy);
      toast.success('🎬 Enregistrement démarré', { duration: 1500 });

    } catch (error) {
      console.error('[ReportageEnhanced] Recording error:', error);
      toast.error('Erreur caméra');
    }
  };

  // Pause recording
  const handlePause = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      triggerHaptic();
      toast.info('⏸️ Pause', { duration: 1000 });
    }
  };

  // Resume recording
  const handleResume = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
      triggerHaptic();
      toast.success('▶️ Reprise', { duration: 1000 });
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setIsPaused(false);
      triggerHaptic(ImpactStyle.Heavy);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progressPercent = totalZones > 0 ? (completedZones / totalZones) * 100 : 0;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with status */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur">
        {/* Location */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={currentLieu.partType === 'commune' ? 'default' : 'secondary'}>
              {currentLieu.partType === 'commune' ? '🏢' : '🏠'}
            </Badge>
            <span className="font-semibold truncate">{currentLieu.name}</span>
          </div>
          {currentEndroit && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {currentEndroit.name}
            </p>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2">
          {/* Network status */}
          {isOnline ? (
            <Badge variant="outline" className="gap-1 text-xs">
              <Wifi className="w-3 h-3" />
              {networkQuality.type}
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1 text-xs">
              <WifiOff className="w-3 h-3" />
              Hors ligne
            </Badge>
          )}

          {/* Auto-save indicator */}
          <AutoSaveIndicator
            isSaving={isSaving}
            lastSaved={lastSaved}
            hasUnsavedChanges={hasUnsavedChanges}
            onForceSave={forceSave}
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-muted/30">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">
            {currentEndroit?.name || currentLieu.name}
          </span>
          <span className="font-medium text-primary">
            {completedZones}/{totalZones} zones
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Quick zone shortcuts */}
        <QuickZoneButtons
          zones={QUICK_ZONES}
          selectedZone={selectedZone}
          onSelectZone={handleZoneSelect}
          size="large"
        />

        {/* Selected zone indicator */}
        {selectedZone && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 rounded-xl border border-primary/20">
            <span className="text-2xl">{selectedZone.emoji}</span>
            <span className="font-semibold text-primary">{selectedZone.label}</span>
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
        )}

        {/* Recording time */}
        {isRecording && (
          <div className="flex items-center justify-center">
            <Badge 
              variant={isPaused ? 'secondary' : 'destructive'}
              className="text-lg px-4 py-2 gap-2"
            >
              <span className={cn(
                'w-3 h-3 rounded-full',
                isPaused ? 'bg-yellow-500' : 'bg-white animate-pulse'
              )} />
              {formatTime(recordingTime)}
            </Badge>
          </div>
        )}

        {/* Voice command indicator */}
        {voiceSupported && voiceEnabled && isRecording && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mic className={cn(
              'w-4 h-4',
              voiceListening ? 'text-primary animate-pulse' : 'text-muted-foreground'
            )} />
            <span>Commandes vocales actives</span>
            {lastCommand && (
              <Badge variant="outline" className="text-xs">
                ✓ {lastCommand}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Live transcription overlay */}
      <LiveTranscription
        isRecording={isRecording && !isPaused}
        onTranscript={(text, isFinal) => {
          if (isFinal) {
            setTranscript(prev => prev + ' ' + text);
          }
        }}
      />

      {/* Bottom controls - Fixed, large buttons */}
      <div className="p-4 border-t bg-background safe-bottom">
        {/* Navigation row */}
        <div className="flex items-center gap-3 mb-4">
          {/* Back button */}
          <Button
            variant="outline"
            onClick={onBack}
            className="h-14 flex-1 text-base font-medium gap-2"
            style={{ minHeight: '56px' }}
          >
            <ChevronLeft className="w-5 h-5" />
            Retour
          </Button>

          {/* Photo button */}
          <Button
            variant="secondary"
            onClick={() => {
              triggerHaptic();
              onPhoto();
            }}
            className="h-14 w-14 p-0"
            style={{ minHeight: '56px', minWidth: '56px' }}
          >
            <Camera className="w-6 h-6" />
          </Button>

          {/* Next button */}
          <Button
            variant="outline"
            onClick={onNext}
            className="h-14 flex-1 text-base font-medium gap-2"
            style={{ minHeight: '56px' }}
          >
            Suivant
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Main recording button */}
        {!isRecording ? (
          <Button
            onClick={handleStartRecording}
            className="w-full h-16 text-lg font-bold gap-3 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
            style={{ minHeight: '64px' }}
          >
            <Video className="w-7 h-7" />
            Démarrer l'enregistrement
          </Button>
        ) : (
          <div className="flex gap-3">
            {/* Pause/Resume */}
            <Button
              variant={isPaused ? 'default' : 'secondary'}
              onClick={isPaused ? handleResume : handlePause}
              className="h-16 flex-1 text-base font-medium gap-2"
              style={{ minHeight: '64px' }}
            >
              {isPaused ? (
                <>
                  <Play className="w-6 h-6" />
                  Reprendre
                </>
              ) : (
                <>
                  <Pause className="w-6 h-6" />
                  Pause
                </>
              )}
            </Button>

            {/* Stop & Save */}
            <Button
              onClick={handleStopRecording}
              className="h-16 flex-1 text-base font-bold gap-2 bg-green-500 hover:bg-green-600 text-white"
              style={{ minHeight: '64px' }}
            >
              <Square className="w-5 h-5 fill-current" />
              Terminer
            </Button>
          </div>
        )}

        {/* Voice toggle */}
        {voiceSupported && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="w-full mt-3 text-xs gap-2"
          >
            {voiceEnabled ? (
              <>
                <Mic className="w-4 h-4" />
                Commandes vocales activées
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4" />
                Commandes vocales désactivées
              </>
            )}
          </Button>
        )}
      </div>

      {/* Offline sync indicator */}
      {!isOnline && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <CloudOff className="w-5 h-5" />
          <span className="flex-1 text-sm font-medium">
            Mode hors ligne - Données sauvegardées localement
          </span>
          <Badge variant="secondary" className="text-xs">
            À synchroniser
          </Badge>
        </div>
      )}
    </div>
  );
};
