import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Mic,
  Camera,
  Square,
  Pause,
  Play,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVisitSequences } from '@/hooks/useVisitSequences';
import { AIStatusOverlay } from '@/components/visit/AIStatusOverlay';
import { PremiumRecordButton } from '@/components/visit/PremiumRecordButton';
import { cn } from '@/lib/utils';

interface VisitSequenceRecorderProps {
  projectId: string;
  partId: string;
  locationId: string;
  locationName: string;
  endroitName?: string;
  zoneType?: string;
  onSequenceComplete: (sequenceId: string) => void;
}

type AIStatus = 'idle' | 'listening' | 'analyzing' | 'detecting' | 'complete';

export const VisitSequenceRecorder = ({
  projectId,
  partId,
  locationId,
  locationName,
  endroitName,
  zoneType,
  onSequenceComplete,
}: VisitSequenceRecorderProps) => {
  const { startSequence, endSequence, addPhotosToSequence, analyzeSequence, currentSequence } = useVisitSequences(projectId);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const sequence = await startSequence(partId, locationId, {
        endroitName,
        zoneType,
      });
      if (!sequence) throw new Error('Failed to create sequence');

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setAiStatus('listening');

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Simulate AI status changes
      setTimeout(() => setAiStatus('analyzing'), 4000);
      setTimeout(() => setAiStatus('detecting'), 8000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Erreur lors du démarrage. Vérifiez les permissions caméra/micro.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        setAiStatus('listening');
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) clearInterval(timerRef.current);
        setAiStatus('idle');
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !currentSequence) return;

    setIsProcessing(true);
    setAiStatus('idle');
    mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
      const videoFileName = `sequence_${currentSequence.id}_${Date.now()}.webm`;
      
      const { data: videoUpload, error: videoError } = await supabase.storage
        .from('visit-videos')
        .upload(videoFileName, videoBlob);

      if (videoError) throw videoError;

      const { data: videoUrl } = supabase.storage
        .from('visit-videos')
        .getPublicUrl(videoFileName);

      await endSequence(currentSequence.id, videoUrl.publicUrl);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);

      toast.success('Séquence enregistrée, analyse IA en cours...');
      setAiStatus('analyzing');

      const analysisResult = await analyzeSequence(currentSequence.id, {
        photoUrls: photos,
        videoUrl: videoUrl.publicUrl,
      });

      setAiStatus('complete');
      
      setTimeout(() => {
        setAiStatus('idle');
        if (analysisResult?.success) {
          toast.success(`Analyse terminée: ${analysisResult.problems_count} problèmes, ${analysisResult.tasks_count} tâches`);
        }
        onSequenceComplete(currentSequence.id);
      }, 1500);

    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Erreur lors de la sauvegarde');
      setAiStatus('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const takePhoto = async () => {
    if (!videoPreviewRef.current || !currentSequence) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoPreviewRef.current.videoWidth;
      canvas.height = videoPreviewRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoPreviewRef.current, 0, 0);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });

      const fileName = `photo_${currentSequence.id}_${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('visit-frames')
        .upload(fileName, blob);

      if (error) throw error;

      const { data: url } = supabase.storage
        .from('visit-frames')
        .getPublicUrl(fileName);

      setPhotos(prev => [...prev, url.publicUrl]);
      await addPhotosToSequence(currentSequence.id, [url.publicUrl]);
      
      // Flash effect
      if (videoPreviewRef.current) {
        videoPreviewRef.current.style.filter = 'brightness(2)';
        setTimeout(() => {
          if (videoPreviewRef.current) {
            videoPreviewRef.current.style.filter = 'brightness(1)';
          }
        }, 100);
      }
      
      toast.success('Photo capturée');

    } catch (error) {
      console.error('Error taking photo:', error);
      toast.error('Erreur lors de la capture');
    }
  };

  return (
    <Card className="card-premium overflow-hidden">
      <CardContent className="p-0">
        {/* Video Preview */}
        <div className="relative aspect-[4/3] sm:aspect-video bg-black rounded-t-2xl overflow-hidden">
          <video
            ref={videoPreviewRef}
            className="w-full h-full object-cover transition-all duration-100"
            muted
            playsInline
          />

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="glass-strong rounded-full px-4 py-2 flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  isPaused ? "bg-warning" : "bg-destructive recording-pulse"
                )} />
                <span className="text-white font-mono text-sm">
                  {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                  {(recordingTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <Badge className="glass-strong text-white border-0">
                {locationName}
              </Badge>
            </div>
          )}

          {/* AI Status Overlay */}
          <AIStatusOverlay status={aiStatus} />

          {/* Not Recording State */}
          {!isRecording && !isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-10 h-10 text-primary" />
                </div>
                <p className="font-medium mb-1">Prêt à enregistrer</p>
                <p className="text-sm text-muted-foreground">{locationName}</p>
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center text-white">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto animate-pulse">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-accent blur-xl opacity-50 animate-pulse" />
                </div>
                <p className="font-medium">Traitement en cours...</p>
                <p className="text-sm text-white/70 mt-1">Sauvegarde et analyse IA</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 space-y-6">
          {/* Photos Preview */}
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <img
                    src={photo}
                    alt={`Photo ${idx + 1}`}
                    className="w-16 h-16 object-cover rounded-xl ring-2 ring-border"
                  />
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {idx + 1}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Record Button */}
          <PremiumRecordButton
            isRecording={isRecording}
            isPaused={isPaused}
            recordingTime={recordingTime}
            onStart={startRecording}
            onStop={stopRecording}
            onPause={pauseRecording}
            onTakePhoto={takePhoto}
            disabled={isProcessing}
          />
        </div>
      </CardContent>
    </Card>
  );
};
