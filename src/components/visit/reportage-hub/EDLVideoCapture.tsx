import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Video, Mic, MicOff, Loader2, X, Square, Play, Pause,
  CheckCircle2, AlertCircle, Building2, List, MapPin, 
  ArrowLeft, ChevronRight, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LiveTranscription } from './LiveTranscription';
import type { PropertyPart, PropertyLocation } from '@/types/businessModel';

interface EDLVideoCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sessionId?: string;
  projectName?: string;
  onCaptureComplete?: () => void;
}

type LocationStep = 'partie' | 'lieu' | 'zone' | null;

// Zones contextuelles par type de lieu
const ZONES_BY_CONTEXT: Record<string, Array<{ id: string; label: string }>> = {
  facade: [
    { id: 'mur_ext', label: 'Murs extérieurs' },
    { id: 'fenetres', label: 'Fenêtres' },
    { id: 'portes_ext', label: 'Portes' },
    { id: 'volets', label: 'Volets' },
    { id: 'balcons', label: 'Balcons/Terrasses' },
  ],
  toiture: [
    { id: 'couverture', label: 'Couverture' },
    { id: 'cheminee', label: 'Cheminée' },
    { id: 'gouttières', label: 'Gouttières' },
    { id: 'velux', label: 'Velux/Fenêtres toit' },
  ],
  hall: [
    { id: 'sol', label: 'Sol' },
    { id: 'murs', label: 'Murs' },
    { id: 'plafond', label: 'Plafond' },
    { id: 'eclairage', label: 'Éclairage' },
    { id: 'portes', label: 'Portes' },
  ],
  default: [
    { id: 'sol', label: 'Sol' },
    { id: 'murs', label: 'Murs' },
    { id: 'plafond', label: 'Plafond' },
    { id: 'menuiseries', label: 'Menuiseries' },
    { id: 'electricite', label: 'Électricité' },
  ],
};

const getZonesForLocation = (locationType?: string): Array<{ id: string; label: string }> => {
  if (!locationType) return ZONES_BY_CONTEXT.default;
  const type = locationType.toLowerCase();
  return ZONES_BY_CONTEXT[type] || ZONES_BY_CONTEXT.default;
};

export const EDLVideoCapture: React.FC<EDLVideoCaptureProps> = ({
  open,
  onOpenChange,
  projectId,
  sessionId,
  projectName,
  onCaptureComplete
}) => {
  const navigate = useNavigate();
  // State
  const [phase, setPhase] = useState<'location' | 'ready' | 'preview' | 'recording' | 'paused' | 'uploading'>('location');
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Location selection state
  const [locationStep, setLocationStep] = useState<LocationStep>('partie');
  const [parts, setParts] = useState<PropertyPart[]>([]);
  const [locations, setLocations] = useState<PropertyLocation[]>([]);
  const [selectedPart, setSelectedPart] = useState<PropertyPart | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PropertyLocation | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [loadingStructure, setLoadingStructure] = useState(true);
  
  // Pause/resume state
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [totalPauseTime, setTotalPauseTime] = useState(0);
  
  // Live transcription
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Load property structure
  useEffect(() => {
    if (!open) return;
    
    const loadStructure = async () => {
      setLoadingStructure(true);
      try {
        const { data: partsData, error: partsError } = await supabase
          .from('property_parts')
          .select('*')
          .eq('project_id', projectId)
          .order('order_index');
        
        if (partsError) throw partsError;
        
        const { data: locationsData, error: locationsError } = await supabase
          .from('property_locations')
          .select('*')
          .eq('project_id', projectId)
          .order('order_index');
        
        if (locationsError) throw locationsError;
        
        setParts(partsData || []);
        setLocations(locationsData || []);
      } catch (error) {
        console.error('Error loading structure:', error);
        toast.error('Erreur lors du chargement de la structure');
      } finally {
        setLoadingStructure(false);
      }
    };
    
    loadStructure();
  }, [open, projectId]);

  // Cleanup on close
  useEffect(() => {
    if (open) {
      setPhase('location');
      setLocationStep('partie');
      setRecordingTime(0);
      setHasPermission(false);
      setUploadProgress(0);
      setSelectedPart(null);
      setSelectedLocation(null);
      setSelectedZone(null);
      setIsPaused(false);
      setTotalPauseTime(0);
      setLiveTranscript('');
    } else {
      cleanup();
    }
  }, [open]);

  // Re-attach stream when phase changes
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
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    chunksRef.current = [];
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Request camera permission and show preview
  const requestPermissionAndPreview = async () => {
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
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
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Impossible d\'accéder à la caméra/micro. Veuillez autoriser l\'accès.');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Location selection handlers
  const handleSelectPart = (part: PropertyPart) => {
    setSelectedPart(part);
    setLocationStep('lieu');
  };

  const handleSelectLocation = (location: PropertyLocation) => {
    setSelectedLocation(location);
    setLocationStep('zone');
  };

  const handleSelectZone = (zone: string) => {
    setSelectedZone(zone);
    setLocationStep(null);
    setPhase('ready');
  };

  const handleLocationBack = () => {
    if (locationStep === 'zone') {
      setLocationStep('lieu');
      setSelectedZone(null);
    } else if (locationStep === 'lieu') {
      setLocationStep('partie');
      setSelectedLocation(null);
      setSelectedPart(null);
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!streamRef.current) {
      toast.error('Caméra non initialisée');
      return;
    }
    
    try {
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
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
        await uploadAndSave(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);

      setPhase('recording');
      setRecordingTime(0);
      setIsPaused(false);
      setTotalPauseTime(0);
      recordingStartTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        if (!isPaused) {
          setRecordingTime((prev) => prev + 1);
        }
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Impossible de démarrer l'enregistrement sur cet appareil");
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      setPauseStartTime(Date.now());
      setPhase('paused');
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      if (pauseStartTime) {
        const pauseDuration = Date.now() - pauseStartTime;
        setTotalPauseTime(prev => prev + pauseDuration);
        setPauseStartTime(null);
      }
      setIsPaused(false);
      setPhase('recording');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Upload video and create visit_sequence
  const uploadAndSave = async (blob: Blob) => {
    setPhase('uploading');
    setUploadProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      // Generate filename
      const timestamp = Date.now();
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `${user.id}/${projectId}/${timestamp}-edl-visit.${ext}`;

      setUploadProgress(30);

      // Upload to visit-videos bucket
      const { error: uploadError } = await supabase.storage
        .from('visit-videos')
        .upload(fileName, blob, {
          contentType: blob.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('visit-videos')
        .getPublicUrl(fileName);

      setUploadProgress(80);

      // Create visit_sequence row with location context
      const { data: sequence, error: insertError } = await supabase
        .from('visit_sequences')
        .insert({
          project_id: projectId,
          user_id: user.id,
          location_id: selectedLocation?.id || null,
          zone_type: selectedZone || null,
          video_url: urlData.publicUrl,
          status: 'raw',
          started_at: new Date(timestamp - recordingTime * 1000).toISOString(),
          ended_at: new Date(timestamp).toISOString(),
          description: `Vidéo de visite EDL - ${formatTime(recordingTime)}${liveTranscript ? ` - ${liveTranscript.substring(0, 100)}` : ''}`,
          transcription: liveTranscript || null,
          capture_mode: 'freeform',
          metadata: {
            location_context: {
              partie: selectedPart?.name || null,
              lieu: selectedLocation?.name || null,
              zone: selectedZone || null,
            },
            pause_duration_ms: totalPauseTime,
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(90);

      // Extract audio from the recorded blob (contains mic audio) and send to backend
      let audioBase64: string | null = null;
      try {
        audioBase64 = await blobToBase64(blob);
      } catch (e) {
        console.warn('Could not encode audio for AI:', e);
      }

      // Trigger AI extraction in background (audio-driven)
      supabase.functions.invoke('segment-video-capture', {
        body: {
          sequenceId: sequence.id,
          videoUrl: urlData.publicUrl,
          projectId,
          duration: recordingTime,
          audioBase64,
        }
      }).catch(err => {
        console.error('AI segmentation error (background):', err);
      });

      setUploadProgress(100);

      // Success
      toast.success('Vidéo de visite en cours d\'analyse IA…', {
        description: 'La transcription et l\'extraction des problèmes sont en cours.',
        duration: 5000
      });

      cleanup();
      onCaptureComplete?.();
      onOpenChange(false);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload de la vidéo');
      setPhase('ready');
    }
  };

  const handleClose = () => {
    if (phase === 'recording') {
      // Confirm before closing during recording
      if (confirm('Arrêter l\'enregistrement en cours ?')) {
        cleanup();
        onOpenChange(false);
      }
    } else if (phase === 'uploading') {
      // Don't allow closing during upload
      toast.info('Upload en cours, veuillez patienter...');
    } else {
      cleanup();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideCloseButton className="max-w-full h-full sm:max-w-full sm:h-full p-0 gap-0 border-0 rounded-none bg-black">
        <VisuallyHidden>
          <DialogTitle>Vidéo Continue EDL</DialogTitle>
          <DialogDescription>Enregistrement vidéo de visite EDL</DialogDescription>
        </VisuallyHidden>
        <div className="relative h-full flex flex-col">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* LOCATION SELECTION PHASE */}
          {phase === 'location' && (
            <div className="flex-1 flex flex-col bg-background overflow-y-auto">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/50 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {locationStep !== 'partie' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLocationBack}
                      className="h-9 w-9 rounded-xl"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold">Où êtes-vous ?</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge className={cn("text-[10px] px-1.5 py-0 h-4", locationStep === 'partie' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        1. Partie
                      </Badge>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      <Badge className={cn("text-[10px] px-1.5 py-0 h-4", locationStep === 'lieu' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        2. Lieu
                      </Badge>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      <Badge className={cn("text-[10px] px-1.5 py-0 h-4", locationStep === 'zone' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        3. Zone
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-4 space-y-2">
                {loadingStructure ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Step 1: Partie */}
                    {locationStep === 'partie' && (
                      <>
                        <p className="text-sm text-muted-foreground mb-3">
                          Sélectionnez la partie du bien
                        </p>
                        {parts.map(part => (
                          <Card
                            key={part.id}
                            className={cn(
                              "p-4 cursor-pointer transition-all",
                              part.part_type === 'commune'
                                ? "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10"
                                : "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10"
                            )}
                            onClick={() => handleSelectPart(part)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center",
                                part.part_type === 'commune'
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-orange-500/20 text-orange-400"
                              )}>
                                <Building2 className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold">{part.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {part.part_type === 'commune' ? 'Partie commune' : 'Partie privative'}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </Card>
                        ))}
                      </>
                    )}

                    {/* Step 2: Lieu */}
                    {locationStep === 'lieu' && (
                      <>
                        <p className="text-sm text-muted-foreground mb-3">
                          Sélectionnez le lieu dans "{selectedPart?.name}"
                        </p>
                        {locations
                          .filter(loc => loc.part_id === selectedPart?.id)
                          .map(location => (
                            <Card
                              key={location.id}
                              className="p-4 cursor-pointer transition-all border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                              onClick={() => handleSelectLocation(location)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                  <MapPin className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold">{location.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {location.location_type?.replace('_', ' ')}
                                  </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              </div>
                            </Card>
                          ))}
                      </>
                    )}

                    {/* Step 3: Zone */}
                    {locationStep === 'zone' && (
                      <>
                        <p className="text-sm text-muted-foreground mb-3">
                          Sélectionnez la zone dans "{selectedLocation?.name}"
                        </p>
                        {getZonesForLocation(selectedLocation?.location_type).map(zone => (
                          <Card
                            key={zone.id}
                            className="p-4 cursor-pointer transition-all border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10"
                            onClick={() => handleSelectZone(zone.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                                <Layers className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold">{zone.label}</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </Card>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Skip button */}
              {locationStep === 'partie' && (
                <div className="p-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedPart(null);
                      setSelectedLocation(null);
                      setSelectedZone(null);
                      setPhase('ready');
                    }}
                  >
                    Passer cette étape
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* READY PHASE */}
          {phase === 'ready' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 to-black">
              {/* Project info */}
              <div className="flex items-center gap-2 text-white/60 mb-8">
                <Building2 className="h-5 w-5" />
                <span className="text-sm">{projectName || 'Projet EDL'}</span>
              </div>

              {/* Start button */}
              <button
                onClick={requestPermissionAndPreview}
                disabled={isRequestingPermission}
                className="w-40 h-40 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 mb-6"
              >
                {isRequestingPermission ? (
                  <Loader2 className="h-16 w-16 text-white animate-spin" />
                ) : (
                  <Video className="h-16 w-16 text-white" />
                )}
              </button>

              <h2 className="text-2xl font-bold text-white mb-2">Vidéo Continue EDL</h2>
              <p className="text-white/60 text-center max-w-xs mb-4">
                Filmez votre visite en parlant naturellement. L'IA extraira automatiquement les problèmes.
              </p>
              
              {/* Location context */}
              {(selectedPart || selectedLocation || selectedZone) && (
                <div className="flex items-center gap-2 flex-wrap justify-center mb-8">
                  {selectedPart && (
                    <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {selectedPart.name}
                    </Badge>
                  )}
                  {selectedLocation && (
                    <>
                      <ChevronRight className="w-3 h-3 text-white/40" />
                      <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {selectedLocation.name}
                      </Badge>
                    </>
                  )}
                  {selectedZone && (
                    <>
                      <ChevronRight className="w-3 h-3 text-white/40" />
                      <Badge className="bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {getZonesForLocation(selectedLocation?.location_type).find(z => z.id === selectedZone)?.label || selectedZone}
                      </Badge>
                    </>
                  )}
                </div>
              )}

              {/* Link to sequences */}
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/project/${projectId}?section=sequences&from=video`);
                }}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <List className="h-4 w-4 mr-2" />
                Voir les séquences
              </Button>
            </div>
          )}

          {/* PREVIEW PHASE */}
          {phase === 'preview' && (
            <div className="flex-1 bg-black relative">
              {/* Camera preview */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Top status chip - single indicator */}
              <div className="absolute top-4 left-4 z-40">
                <div className="flex items-center gap-2 bg-primary/90 backdrop-blur px-4 py-2 rounded-full shadow-lg">
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                  <span className="text-primary-foreground text-sm font-medium">Prêt à filmer</span>
                </div>
              </div>

              {/* Center CTA (always visible on mobile) */}
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6">
                <button
                  onClick={startRecording}
                  className="w-28 h-28 rounded-full bg-background/95 backdrop-blur flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                  aria-label="Démarrer l’enregistrement vidéo"
                >
                  <div className="w-12 h-12 rounded-full bg-destructive animate-pulse" />
                </button>
                <p className="mt-4 text-2xl font-black text-white">🎬 DÉMARRER</p>
                <p className="mt-2 text-white/80 text-center max-w-sm">
                  Filmez et parlez en même temps. Appuyez ensuite sur <span className="font-semibold">ARRÊTER</span> pour enregistrer.
                </p>
              </div>

              {/* Bottom hint with safe-area */}
              <div className="absolute inset-x-0 bottom-0 z-30 px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 bg-gradient-to-t from-black/70 to-transparent">
                <div className="mx-auto max-w-md text-center text-white/80 text-sm">
                  Si rien ne se passe, vérifiez que Safari a bien autorisé <span className="font-medium">Caméra</span> et <span className="font-medium">Micro</span>.
                </div>
              </div>
            </div>
          )}

          {/* RECORDING PHASE */}
          {phase === 'recording' && (
            <>
              <div className="flex-1 bg-black relative">
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
                    <span className="text-destructive-foreground font-black text-lg">ENREGISTREMENT</span>
                  </div>
                  <Badge className="bg-background text-foreground text-lg font-mono px-4 py-1">
                    {formatTime(recordingTime)}
                  </Badge>
                </div>

                {/* Location context badge */}
                {(selectedPart || selectedLocation || selectedZone) && (
                  <div className="absolute top-16 left-4 z-40 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-white" />
                    <span className="text-white text-xs">
                      {[selectedPart?.name, selectedLocation?.name, selectedZone && getZonesForLocation(selectedLocation?.location_type).find(z => z.id === selectedZone)?.label].filter(Boolean).join(' › ')}
                    </span>
                  </div>
                )}

                {/* Audio indicator */}
                <div className="absolute bottom-28 right-4 z-40 bg-primary px-3 py-2 rounded-full flex items-center gap-2 shadow-lg">
                  <Mic className="h-4 w-4 text-primary-foreground animate-pulse" />
                  <span className="text-primary-foreground text-sm font-medium">Micro actif</span>
                </div>

                {/* Pause/Resume button */}
                <div className="absolute bottom-40 right-4 z-40">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-background/95 backdrop-blur shadow-lg"
                    onClick={pauseRecording}
                  >
                    <Pause className="h-5 w-5" />
                  </Button>
                </div>

                {/* STOP button fixed to bottom with safe-area */}
                <div className="absolute inset-x-0 bottom-0 z-40 px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 bg-gradient-to-t from-black/70 to-transparent">
                  <button
                    onClick={stopRecording}
                    className="w-full h-20 bg-background/95 backdrop-blur rounded-2xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-transform"
                    aria-label="Arrêter l'enregistrement vidéo"
                  >
                    <Square className="h-10 w-10 text-destructive fill-destructive" />
                    <span className="text-destructive text-2xl font-black">ARRÊTER</span>
                  </button>
                  <p className="text-white/80 text-center mt-3 text-sm">
                    Appuyez pour terminer et enregistrer la séquence
                  </p>
                </div>
              </div>
              
              {/* Live Transcription */}
              <LiveTranscription
                isRecording={true}
                onTranscript={(text, isFinal) => {
                  if (isFinal) {
                    setLiveTranscript(prev => prev ? `${prev} ${text}` : text);
                  }
                }}
              />
            </>
          )}

          {/* PAUSED PHASE */}
          {phase === 'paused' && (
            <div className="flex-1 bg-black relative">
              {/* Camera feed (still visible) */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover opacity-50"
                playsInline
                muted
                autoPlay
              />

              {/* Paused overlay */}
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                    <Pause className="h-10 w-10 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">EN PAUSE</h2>
                  <p className="text-white/60 mb-6">Temps enregistré: {formatTime(recordingTime)}</p>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => {
                        cleanup();
                        onOpenChange(false);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="lg"
                      className="bg-primary"
                      onClick={resumeRecording}
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Reprendre
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* UPLOADING PHASE */}
          {phase === 'uploading' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 to-black">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2">
                Upload en cours...
              </h2>
              <p className="text-white/60 mb-6">{uploadProgress}%</p>
              
              {/* Progress bar */}
              <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              
              <p className="text-white/40 text-sm mt-4">
                Ne fermez pas cette fenêtre
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
