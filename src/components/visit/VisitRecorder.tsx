import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Video, Square, Loader2, Eye, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SimpleAudioRecorder } from '@/utils/audioRecorder';

interface VisitRecorderProps {
  projectId: string;
  onVisitComplete: (sessionId: string) => void;
}

export const VisitRecorder: React.FC<VisitRecorderProps> = ({ 
  projectId, 
  onVisitComplete 
}) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(1);
  const [detectedRoom, setDetectedRoom] = useState('Zone en analyse...');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<SimpleAudioRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const visitSessionIdRef = useRef<string | null>(null);
  const framesRef = useRef<any[]>([]);
  const audioSegmentsRef = useRef<any[]>([]);

  const startRecording = async () => {
    try {
      // Demander les permissions vidéo et audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Créer la session de visite
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: session, error: sessionError } = await supabase
        .from('visit_sessions')
        .insert({
          project_id: projectId,
          user_id: user.id,
          status: 'recording',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      visitSessionIdRef.current = session.id;

      // Démarrer l'enregistrement vidéo
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Enregistrer par chunk de 1 seconde
      mediaRecorderRef.current = mediaRecorder;

      // Démarrer l'enregistrement audio séparé pour transcription
      audioRecorderRef.current = new SimpleAudioRecorder();
      await audioRecorderRef.current.start();

      // Extraire des frames clés toutes les 3 secondes
      frameIntervalRef.current = window.setInterval(() => {
        captureAndAnalyzeFrame();
      }, 3000);

      setIsRecording(true);
      toast({
        title: "🎥 Enregistrement démarré",
        description: "Filmez et parlez naturellement pendant votre visite"
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer l'enregistrement",
        variant: "destructive"
      });
    }
  };

  const captureAndAnalyzeFrame = async () => {
    if (!canvasRef.current || !videoRef.current || !visitSessionIdRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capturer le frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Convertir en blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Upload le frame
        const timestamp = Date.now();
        const fileName = `${user.id}/${visitSessionIdRef.current}/frame_${timestamp}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('visit-frames')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600'
          });

        if (uploadError) throw uploadError;

        // Obtenir l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('visit-frames')
          .getPublicUrl(fileName);

        // Analyser avec GPT-4 Vision
        const previousContext = framesRef.current.length > 0 
          ? framesRef.current[framesRef.current.length - 1].analysis 
          : null;

        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-video-frame', {
          body: {
            imageUrl: publicUrl,
            previousContext: previousContext?.room_type || null,
            timestamp: timestamp / 1000
          }
        });

        if (analysisError) throw analysisError;

        // Sauvegarder le frame analysé
        framesRef.current.push({
          url: publicUrl,
          timestamp: timestamp / 1000,
          analysis: analysisData.analysis
        });

        // Mettre à jour l'UI avec la détection
        setDetectedRoom(analysisData.analysis.room_type || 'Zone inconnue');
        if (analysisData.analysis.transition_detected) {
          setCurrentBlock(prev => prev + 1);
        }

      } catch (error) {
        console.error('Error capturing/analyzing frame:', error);
      }
    }, 'image/jpeg', 0.85);
  };

  const stopRecording = async () => {
    try {
      setIsProcessing(true);

      // Arrêter l'extraction de frames
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }

      // Arrêter l'enregistrement vidéo
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        await new Promise(resolve => {
          mediaRecorderRef.current!.onstop = resolve;
        });
      }

      // Arrêter l'audio et transcription
      if (audioRecorderRef.current) {
        const audioBlob = await audioRecorderRef.current.stop();
        
        // Convertir en base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        await new Promise(resolve => { reader.onloadend = resolve; });
        const base64Audio = (reader.result as string).split(',')[1];

        // Transcrire l'audio
        const { data: transcriptionData } = await supabase.functions.invoke('transcribe-visit-audio', {
          body: { audio: base64Audio, language: 'fr' }
        });

        if (transcriptionData?.segments) {
          audioSegmentsRef.current = transcriptionData.segments;
        }
      }

      // Arrêter le stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Uploader la vidéo complète
      if (chunksRef.current.length > 0 && visitSessionIdRef.current) {
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const videoFileName = `${user.id}/${visitSessionIdRef.current}/video.webm`;
          await supabase.storage
            .from('visit-videos')
            .upload(videoFileName, videoBlob);
        }
      }

      // Traiter la session
      if (visitSessionIdRef.current) {
        const { data: processData } = await supabase.functions.invoke('process-visit-session', {
          body: {
            visitSessionId: visitSessionIdRef.current,
            frames: framesRef.current,
            audioSegments: audioSegmentsRef.current
          }
        });

        toast({
          title: "✅ Visite enregistrée !",
          description: `${processData?.blocks_count || 0} zones détectées, ${processData?.tasks_count || 0} tâches extraites`
        });

        onVisitComplete(visitSessionIdRef.current);
      }

      // Reset
      setIsRecording(false);
      setIsProcessing(false);
      chunksRef.current = [];
      framesRef.current = [];
      audioSegmentsRef.current = [];
      visitSessionIdRef.current = null;

    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsProcessing(false);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'arrêt de l'enregistrement",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, []);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <video 
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {isRecording && (
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full" />
              REC
            </div>
          )}

          {isRecording && (
            <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">IA analyse...</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="text-sm">Bloc {currentBlock}</span>
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {detectedRoom}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!isRecording ? (
            <Button 
              onClick={startRecording}
              disabled={isProcessing}
              className="flex-1"
              size="lg"
            >
              <Video className="w-5 h-5 mr-2" />
              Démarrer la visite
            </Button>
          ) : (
            <Button 
              onClick={stopRecording}
              disabled={isProcessing}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Square className="w-5 h-5 mr-2" />
                  Terminer la visite
                </>
              )}
            </Button>
          )}
        </div>

        <div className="text-xs text-center text-muted-foreground">
          {isRecording ? (
            "Filmez et parlez naturellement. L'IA détecte automatiquement les zones et analyse ce que vous observez."
          ) : (
            "Prêt à démarrer votre visite d'inspection"
          )}
        </div>
      </div>
    </Card>
  );
};
