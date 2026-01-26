import { useState, useRef, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  X,
  CheckCircle2,
  ArrowLeft,
  Wand2,
  Play,
  Square,
  Clock,
  MapPin,
  Edit3,
  Trash2,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CoveragePanel } from './CoveragePanel';

// ============= TYPES =============
interface ExtractedSegment {
  id: string;
  startTime: number;
  endTime: number;
  partie: 'commune' | 'privative' | null;
  lieu: string | null;
  endroit: string | null;
  zone: string | null;
  problem: string;
  confidence: number;
  transcript: string;
}

interface CoverageItem {
  name: string;
  type?: string;
  partie?: string;
  lieu?: string;
  seen: boolean;
  confidence: number;
}

interface Coverage {
  parties: CoverageItem[];
  lieux: CoverageItem[];
  zones: CoverageItem[];
  completionPercent: number;
}

interface VideoContinueCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  partiesCommunes: Array<{ id: string; name: string; type: string }>;
  partiesPrivatives: Array<{ id: string; name: string; type: string; numero?: string; pieces?: any[] }>;
  onCaptureComplete: () => void;
}

// ============= MAIN COMPONENT =============
export const VideoContinueCapture = ({
  open,
  onOpenChange,
  projectId,
  partiesCommunes,
  partiesPrivatives,
  onCaptureComplete,
}: VideoContinueCaptureProps) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  // Processing state
  const [phase, setPhase] = useState<'ready' | 'preview' | 'recording' | 'processing' | 'review'>('ready');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [currentTranscription, setCurrentTranscription] = useState('');
  
  // Extracted segments
  const [segments, setSegments] = useState<ExtractedSegment[]>([]);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [showCoveragePanel, setShowCoveragePanel] = useState(false);
  
  // Saving
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setPhase('ready');
      setIsRecording(false);
      setRecordingTime(0);
      setVideoBlob(null);
      setVideoUrl(null);
      setSegments([]);
      setCoverage(null);
      setShowCoveragePanel(false);
      setProcessingProgress(0);
      setProcessingStep('');
      setHasPermission(false);
    } else {
      stopRecording();
      cleanup();
    }
  }, [open]);

  // Reassign stream to video element when phase changes
  useEffect(() => {
    if ((phase === 'preview' || phase === 'recording') && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.muted = true;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [phase]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
  }, [videoUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Request camera/mic permission and show preview
  const requestPermissionAndPreview = async () => {
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      
      setHasPermission(true);
      setPhase('preview');
      toast.success('Caméra prête - Appuyez sur le bouton rouge pour démarrer');
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Erreur d\'accès à la caméra/micro. Veuillez autoriser l\'accès.');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Start recording (user manually triggers after seeing preview)
  const startRecording = async () => {
    if (!streamRef.current) {
      toast.error('Caméra non initialisée');
      return;
    }

    try {
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      const supportedMimeType = candidates.find((t) =>
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)
      );

      const mediaRecorder = new MediaRecorder(
        streamRef.current,
        supportedMimeType ? ({ mimeType: supportedMimeType } as MediaRecorderOptions) : undefined
      );

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const typeFromChunk = chunksRef.current[0]?.type;
        const blobType = typeFromChunk || supportedMimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
        setPhase('processing');
        await processVideo(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      setIsRecording(true);
      setPhase('recording');
      setRecordingTime(0);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.success('🎬 Enregistrement démarré - Filmez et parlez naturellement');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Impossible de démarrer l'enregistrement sur cet appareil");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
  };

  // Process video with AI
  const processVideo = async (blob: Blob) => {
    setProcessingStep('Upload de la vidéo...');
    setProcessingProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      // Upload video
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `${user.id}/${projectId}/${Date.now()}-capture.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('visit-videos')
        .upload(fileName, blob, { contentType: blob.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('visit-videos')
        .getPublicUrl(fileName);

      setProcessingStep('Transcription audio...');
      setProcessingProgress(30);

      // Build project context
      const lieuxCommuns = partiesCommunes.map(p => p.name);
      const lieuxPrivatifs = partiesPrivatives.map(p => p.name || `${p.type} ${p.numero || ''}`);

      // Convert blob to base64 for audio extraction
      const base64Audio = await blobToBase64(blob);

      setProcessingStep('Segmentation IA...');
      setProcessingProgress(50);

      // Call AI to segment and extract
      const { data, error } = await supabase.functions.invoke('segment-video-capture', {
        body: {
          videoUrl: urlData.publicUrl,
          audioBase64: base64Audio,
          projectContext: {
            partiesCommunes: lieuxCommuns,
            partiesPrivatives: lieuxPrivatifs,
          },
          duration: recordingTime
        }
      });

      if (error) throw error;

      setProcessingStep('Extraction des séquences...');
      setProcessingProgress(80);

      if (data?.segments && data.segments.length > 0) {
        setSegments(data.segments.map((seg: any, idx: number) => ({
          id: `seg-${idx}`,
          ...seg
        })));
      } else {
        // Fallback: create single segment with full transcript
        setSegments([{
          id: 'seg-0',
          startTime: 0,
          endTime: recordingTime,
          partie: null,
          lieu: null,
          endroit: null,
          zone: null,
          problem: data?.fullTranscript || 'Problème détecté',
          confidence: 0.5,
          transcript: data?.fullTranscript || ''
        }]);
      }

      // Set coverage data
      if (data?.coverage) {
        setCoverage(data.coverage);
      }

      setProcessingProgress(100);
      setProcessingStep('Terminé !');
      
      setTimeout(() => {
        setPhase('review');
        toast.success(`${data?.segments?.length || 1} séquence(s) extraite(s) !`);
      }, 500);

    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Erreur lors du traitement');
      setPhase('ready');
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Update segment
  const updateSegment = (segmentId: string, updates: Partial<ExtractedSegment>) => {
    setSegments(prev => prev.map(seg => 
      seg.id === segmentId ? { ...seg, ...updates } : seg
    ));
    setEditingSegmentId(null);
  };

  // Delete segment
  const deleteSegment = (segmentId: string) => {
    setSegments(prev => prev.filter(seg => seg.id !== segmentId));
    toast.success('Séquence supprimée');
  };

  // Save all segments as visit sequences
  const saveAllSegments = async () => {
    if (segments.length === 0) {
      toast.error('Aucune séquence à enregistrer');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      for (const segment of segments) {
        // Find matching location
        let locationId: string | null = null;
        const lieuSearch = segment.lieu?.toLowerCase() || '';
        
        if (segment.partie === 'commune') {
          const match = partiesCommunes.find(p => 
            p.name.toLowerCase().includes(lieuSearch)
          );
          locationId = match?.id || null;
        } else if (segment.partie === 'privative') {
          const match = partiesPrivatives.find(p => {
            const name = p.name || `${p.type} ${p.numero || ''}`;
            return name.toLowerCase().includes(lieuSearch);
          });
          locationId = match?.id || null;
        }

        // Create visit sequence
        await supabase
          .from('visit_sequences')
          .insert({
            project_id: projectId,
            location_id: locationId,
            zone_type: (segment.zone as string) || 'autre',
            user_id: user.id,
            description: segment.problem,
            video_url: videoUrl,
            status: 'completed' as const,
            started_at: new Date().toISOString(),
            ended_at: new Date().toISOString(),
            endroit_name: segment.endroit,
            ai_analysis: JSON.parse(JSON.stringify({
              source: 'video_continue',
              segment,
              original_transcript: segment.transcript,
              confidence: segment.confidence,
              video_timestamps: {
                start: segment.startTime,
                end: segment.endTime
              }
            }))
          });

        // Create problem if location found
        if (locationId) {
          await supabase
            .from('identified_problems')
            .insert({
              project_id: projectId,
              location_id: locationId,
              title: segment.problem.slice(0, 100),
              description: segment.problem,
              zone_type: segment.zone as any || 'autre',
              ai_detected: true,
              detection_confidence: segment.confidence,
              video_timestamp_start: segment.startTime,
              video_timestamp_end: segment.endTime,
            });
        }
      }

      toast.success(`✅ ${segments.length} séquence(s) enregistrée(s) !`);
      onCaptureComplete();
      onOpenChange(false);

    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0" hideCloseButton>
        <div className="flex flex-col h-full">
          {/* Header - compact */}
          <SheetHeader className="p-3 border-b bg-gradient-to-r from-violet-500 to-purple-500 rounded-t-3xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="text-white hover:bg-white/20 h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <SheetTitle className="text-white flex items-center gap-2 text-base">
                    <Video className="h-4 w-4" />
                    Vidéo Continue
                  </SheetTitle>
                </div>
              </div>
              {isRecording && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full mr-2" />
                  {formatTime(recordingTime)}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {/* Content based on phase */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* READY PHASE */}
            {phase === 'ready' && (
              <div className="p-4 h-full flex flex-col">
                {/* Start button - FIRST and visible */}
                <div className="flex flex-col items-center justify-center py-6">
                  <button
                    onClick={requestPermissionAndPreview}
                    disabled={isRequestingPermission}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                  >
                    <div className="text-center text-white">
                      {isRequestingPermission ? (
                        <>
                          <Loader2 className="h-10 w-10 mx-auto mb-1 animate-spin" />
                          <span className="text-sm font-medium">Chargement...</span>
                        </>
                      ) : (
                        <>
                          <Video className="h-10 w-10 mx-auto mb-1" />
                          <span className="text-sm font-medium">Commencer</span>
                        </>
                      )}
                    </div>
                  </button>
                  <p className="text-center text-muted-foreground text-sm">
                    Appuyez pour activer la caméra
                  </p>
                </div>

                {/* Instructions - below button, scrollable if needed */}
                <ScrollArea className="flex-1">
                  <div className="bg-violet-50 dark:bg-violet-950/30 rounded-2xl p-4 border border-violet-200 dark:border-violet-800">
                    <h3 className="font-medium text-violet-800 dark:text-violet-200 mb-2 flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Comment ça marche ?
                    </h3>
                    <ul className="text-sm text-violet-600 dark:text-violet-400 space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-violet-500" />
                        Filmez en parlant naturellement
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-violet-500" />
                        L'IA segmente par pièce/zone
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-violet-500" />
                        Problèmes extraits automatiquement
                      </li>
                    </ul>
                    <p className="text-xs italic text-violet-600 dark:text-violet-400 mt-3 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                      Ex: "Je suis dans la cuisine, y'a une fissure sur le mur..."
                    </p>
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* PREVIEW PHASE - Camera preview before recording */}
            {phase === 'preview' && (
              <div className="h-full bg-black relative">
                {/* Video preview */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Top status chips */}
                <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 bg-primary px-4 py-2 rounded-full shadow-lg">
                    <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    <span className="text-primary-foreground text-sm font-medium">Caméra prête</span>
                  </div>

                  <div className="flex items-center gap-2 bg-primary px-3 py-2 rounded-full shadow-lg">
                    <Mic className="h-4 w-4 text-primary-foreground" />
                    <span className="text-primary-foreground text-sm font-medium">Micro actif</span>
                  </div>
                </div>

                {/* Center CTA (always visible) */}
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6">
                  <button
                    onClick={startRecording}
                    className="flex flex-col items-center gap-4 px-10 py-8 bg-destructive/95 backdrop-blur rounded-3xl shadow-2xl active:scale-95 transition-transform"
                    aria-label="Démarrer l’enregistrement vidéo"
                  >
                    <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center shadow">
                      <div className="w-10 h-10 rounded-full bg-destructive animate-pulse" />
                    </div>
                    <span className="text-destructive-foreground text-2xl font-black">🎬 DÉMARRER</span>
                    <span className="text-destructive-foreground/80 text-sm text-center max-w-56">
                      Filmez et parlez en même temps. Appuyez ensuite sur <span className="font-semibold">ARRÊTER</span>.
                    </span>
                  </button>
                </div>

                {/* Bottom hint with safe-area */}
                <div className="absolute inset-x-0 bottom-0 z-30 px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="mx-auto max-w-md text-center text-white/80 text-sm">
                    Si rien ne se passe, vérifiez que le navigateur a bien autorisé <span className="font-medium">Caméra</span> et <span className="font-medium">Micro</span>.
                  </div>
                </div>
              </div>
            )}

            {/* RECORDING PHASE */}
            {phase === 'recording' && (
              <div className="h-full bg-black relative">
                {/* Camera feed */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Recording header */}
                <div className="absolute top-0 left-0 right-0 z-40 bg-destructive/95 backdrop-blur p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 bg-destructive-foreground rounded-full animate-pulse" />
                    <span className="text-destructive-foreground font-black text-xl">ENREGISTREMENT</span>
                  </div>
                  <Badge className="bg-background text-foreground text-lg font-mono px-4 py-1">
                    {formatTime(recordingTime)}
                  </Badge>
                </div>

                {/* Audio indicator */}
                <div className="absolute bottom-28 right-4 z-40 bg-primary px-3 py-2 rounded-full flex items-center gap-2 shadow-lg">
                  <Mic className="h-4 w-4 text-primary-foreground animate-pulse" />
                  <span className="text-primary-foreground text-sm font-medium">Micro actif</span>
                </div>

                {/* STOP button fixed to bottom with safe-area */}
                <div className="absolute inset-x-0 bottom-0 z-40 px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 bg-gradient-to-t from-black/70 to-transparent">
                  <button
                    onClick={stopRecording}
                    className="w-full h-20 bg-background/95 backdrop-blur rounded-2xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-transform"
                    aria-label="Arrêter l’enregistrement vidéo"
                  >
                    <Square className="h-10 w-10 text-destructive fill-destructive" />
                    <span className="text-destructive text-2xl font-black">ARRÊTER</span>
                  </button>
                  <p className="text-white/80 text-center mt-3 text-sm">
                    Appuyez pour terminer et analyser
                  </p>
                </div>
              </div>
            )}

            {/* PROCESSING PHASE */}
            {phase === 'processing' && (
              <div className="p-6 h-full flex flex-col items-center justify-center">
                <div className="w-full max-w-md text-center space-y-6">
                  <div className="w-20 h-20 mx-auto bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-violet-500 animate-pulse" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Analyse en cours...</h3>
                    <p className="text-muted-foreground">{processingStep}</p>
                  </div>

                  <Progress value={processingProgress} className="h-2" />
                  
                  <p className="text-sm text-muted-foreground">
                    L'IA transcrit, segmente et extrait les problèmes
                  </p>
                </div>
              </div>
            )}

            {/* REVIEW PHASE */}
            {phase === 'review' && (
              <div className="h-full flex flex-row">
                {/* Left side - Segments */}
                <div className={cn(
                  "flex flex-col p-4 transition-all duration-300",
                  showCoveragePanel ? "w-1/2" : "w-full"
                )}>
                  {/* Video preview */}
                  {videoUrl && (
                    <div className="rounded-2xl overflow-hidden bg-black mb-4 flex-shrink-0">
                      <video
                        src={videoUrl}
                        controls
                        className="w-full max-h-36 object-contain"
                      />
                    </div>
                  )}

                  {/* Segments header with coverage toggle */}
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      {segments.length} séquence(s) extraite(s)
                    </h3>
                    <Button
                      variant={showCoveragePanel ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowCoveragePanel(!showCoveragePanel)}
                      className="gap-1.5"
                    >
                      <MapPin className="h-4 w-4" />
                      {coverage?.completionPercent || 0}%
                    </Button>
                  </div>

                  {/* Scrollable segments list */}
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-3 pr-2">
                    {segments.map((segment, idx) => (
                      <div
                        key={segment.id}
                        className="bg-muted/50 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                            </Badge>
                            <Badge 
                              variant={segment.confidence > 0.7 ? 'default' : 'secondary'}
                              className={cn(
                                segment.confidence > 0.7 
                                  ? 'bg-green-500' 
                                  : segment.confidence > 0.5 
                                    ? 'bg-amber-500' 
                                    : 'bg-red-500'
                              )}
                            >
                              {Math.round(segment.confidence * 100)}%
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setEditingSegmentId(segment.id)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteSegment(segment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex flex-wrap gap-2 text-sm">
                          {segment.partie && (
                            <Badge variant="outline">
                              {segment.partie === 'commune' ? '🏢' : '🏠'} {segment.partie}
                            </Badge>
                          )}
                          {segment.lieu && (
                            <Badge variant="outline">
                              <MapPin className="h-3 w-3 mr-1" />
                              {segment.lieu}
                            </Badge>
                          )}
                          {segment.endroit && (
                            <Badge variant="outline">{segment.endroit}</Badge>
                          )}
                          {segment.zone && (
                            <Badge variant="outline">🧱 {segment.zone}</Badge>
                          )}
                        </div>

                        {/* Problem */}
                        <p className="text-sm bg-background rounded-lg p-3">
                          {segment.problem}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                  {/* Action buttons - fixed at bottom */}
                  <div className="flex gap-3 pt-4 flex-shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPhase('ready');
                        setSegments([]);
                        setCoverage(null);
                        setVideoBlob(null);
                        setVideoUrl(null);
                      }}
                      className="flex-1"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Refaire
                    </Button>
                    <Button
                      onClick={saveAllSegments}
                      disabled={isSaving || segments.length === 0}
                      className="flex-1 gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Valider tout ({segments.length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Right side - Coverage Panel */}
                {showCoveragePanel && (
                  <div className="w-1/2 border-l bg-muted/30">
                    <CoveragePanel 
                      coverage={coverage}
                      onCaptureZone={(partie, lieu, zone) => {
                        toast.info(`Capturer: ${partie} > ${lieu}`);
                        // Could trigger guided capture for missing zone
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
