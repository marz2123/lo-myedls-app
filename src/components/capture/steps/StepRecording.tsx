import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Camera, 
  Mic, 
  Square, 
  ArrowLeft,
  Clock,
  Circle,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  MicOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CaptureData } from '../CaptureWizard';

interface StepRecordingProps {
  captureData: CaptureData;
  updateCaptureData: (updates: Partial<CaptureData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepRecording = ({
  captureData,
  updateCaptureData,
  onNext,
  onBack,
}: StepRecordingProps) => {
  const isVideoMode = captureData.captureMode === 'video_walkthrough';
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Array<{ url: string; timestamp: number }>>([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordings, setAudioRecordings] = useState<Array<{ url: string; blob: Blob }>>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get EDL type label
  const getEdlTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'avant_travaux': 'Avant travaux',
      'apres_travaux': 'Après travaux',
      'location_entree': 'Location – Entrée',
      'location_sortie': 'Location – Sortie',
    };
    return labels[type] || type;
  };

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
    
    return () => {
      stopStream();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setPermissionGranted(true);
      setPermissionError(null);
    } catch (error) {
      console.error('Permission error:', error);
      setPermissionError(
        'Accès caméra/micro refusé. Veuillez autoriser l\'accès dans les paramètres.'
      );
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      toast.error('Caméra non disponible');
      return;
    }

    try {
      chunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        updateCaptureData({ videoBlob: blob });
        setHasRecording(true);
        toast.success('Vidéo enregistrée ✔');
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Start recording error:', error);
      toast.error('Erreur lors du démarrage de l\'enregistrement');
    }
  }, [updateCaptureData]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) {
      toast.error('Caméra non disponible');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        const newPhoto = {
          url: dataUrl,
          timestamp: Date.now(),
        };
        
        setPhotos(prev => [...prev, newPhoto]);
        updateCaptureData({ photos: [...photos, newPhoto] });
        
        toast.success('Photo capturée');
      }
    } catch (error) {
      console.error('Photo capture error:', error);
      toast.error('Erreur lors de la capture');
    }
  }, [photos, updateCaptureData]);

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const newRecording = { url, blob };
        setAudioRecordings(prev => [...prev, newRecording]);
        updateCaptureData({ audioBlobs: [...audioRecordings.map(r => r.blob), blob] });
        toast.success('Note vocale enregistrée');
        
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
        }
      };
      
      audioRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingAudio(true);
    } catch (error) {
      console.error('Audio recording error:', error);
      toast.error('Erreur d\'accès au micro');
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    updateCaptureData({ photos: newPhotos });
  };

  const canProceed = isVideoMode ? hasRecording : photos.length > 0;

  const handleNext = () => {
    if (isRecording) {
      stopRecording();
    }
    if (isRecordingAudio) {
      stopAudioRecording();
    }
    stopStream();
    onNext();
  };

  const handleBack = () => {
    if (isRecording) stopRecording();
    if (isRecordingAudio) stopAudioRecording();
    stopStream();
    onBack();
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header with project info */}
      <div className="bg-black/80 backdrop-blur p-4 safe-area-top">
        <h2 className="text-white font-semibold text-lg">Capture sur site</h2>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {captureData.projectName || captureData.projectAddress}
          </Badge>
          <Badge variant="outline" className="text-xs border-white/30 text-white/70">
            {getEdlTypeLabel(captureData.edlType)}
          </Badge>
        </div>
      </div>

      {/* Video preview */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Permission error overlay */}
        {permissionError && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
            <Card className="p-6 max-w-sm text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Permissions requises</h3>
              <p className="text-sm text-muted-foreground mb-4">{permissionError}</p>
              <Button onClick={requestPermissions}>
                Réessayer
              </Button>
            </Card>
          </div>
        )}
        
        {/* Recording indicator (video mode) */}
        {isRecording && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <Badge 
              variant="destructive" 
              className="text-sm px-3 py-1.5 animate-pulse"
            >
              <Circle className="h-3 w-3 mr-2 fill-current" />
              REC
            </Badge>
            
            <Badge variant="secondary" className="text-sm px-3 py-1.5">
              <Clock className="h-3 w-3 mr-2" />
              {formatTime(recordingTime)}
            </Badge>
          </div>
        )}

        {/* Audio recording indicator */}
        {isRecordingAudio && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <Badge 
              variant="destructive" 
              className="text-sm px-4 py-2 animate-pulse"
            >
              <Mic className="h-4 w-4 mr-2" />
              Enregistrement vocal...
            </Badge>
          </div>
        )}
        
        {/* Tips overlay */}
        {!isRecording && !hasRecording && permissionGranted && photos.length === 0 && (
          <div className="absolute bottom-4 left-4 right-4">
            <Card className="p-4 bg-black/60 backdrop-blur border-white/20">
              <div className="flex items-start gap-3 text-white">
                <Mic className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">
                  Utilise ton téléphone comme si tu faisais une vidéo WhatsApp, mais en décrivant ce que tu vois.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Video recording success message */}
        {hasRecording && !isRecording && isVideoMode && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Card className="p-6 text-center bg-background/95 backdrop-blur">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Vidéo enregistrée ✔</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Durée : {formatTime(recordingTime)}
              </p>
            </Card>
          </div>
        )}
        
        {/* Photos gallery (for photo mode) */}
        {!isVideoMode && photos.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4">
            <Card className="p-3 bg-black/70 backdrop-blur border-white/20">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((photo, index) => (
                  <div key={index} className="relative shrink-0">
                    <img 
                      src={photo.url} 
                      alt={`Photo ${index + 1}`}
                      className="h-16 w-16 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="shrink-0 h-16 w-16 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-white font-semibold">{photos.length}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black p-6 safe-area-bottom">
        {isVideoMode ? (
          // Video mode controls
          <div className="flex flex-col items-center gap-4">
            {!hasRecording && (
              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 rounded-full text-white"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                
                {!isRecording ? (
                  <Button
                    size="icon"
                    className="h-24 w-24 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
                    onClick={startRecording}
                    disabled={!permissionGranted}
                  >
                    <Video className="h-10 w-10" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="h-24 w-24 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
                    onClick={stopRecording}
                  >
                    <Square className="h-10 w-10 fill-current" />
                  </Button>
                )}
                
                <div className="w-14" />
              </div>
            )}
            
            {hasRecording && !isRecording && (
              <Button
                size="lg"
                className="w-full h-16 text-lg font-semibold bg-primary"
                onClick={handleNext}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Analyser avec l'IA
              </Button>
            )}

            <p className="text-center text-white/60 text-sm">
              {isRecording 
                ? 'Enregistrement en cours...' 
                : (hasRecording ? 'Prêt pour l\'analyse' : 'Appuie pour commencer')}
            </p>
          </div>
        ) : (
          // Photo + voice mode controls
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full text-white"
                onClick={handleBack}
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              
              <Button
                size="icon"
                className="h-20 w-20 rounded-full bg-white text-black hover:bg-white/90 shadow-lg"
                onClick={capturePhoto}
                disabled={!permissionGranted}
              >
                <Camera className="h-8 w-8" />
              </Button>
              
              <Button
                size="icon"
                className={cn(
                  "h-14 w-14 rounded-full shadow-lg",
                  isRecordingAudio 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                )}
                onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
              >
                {isRecordingAudio ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
            </div>
            
            {photos.length > 0 && (
              <Button
                size="lg"
                className="w-full h-16 text-lg font-semibold bg-primary"
                onClick={handleNext}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Analyser avec l'IA
              </Button>
            )}
            
            <p className="text-center text-white/60 text-sm">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} • {audioRecordings.length} note{audioRecordings.length !== 1 ? 's' : ''} vocale{audioRecordings.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
