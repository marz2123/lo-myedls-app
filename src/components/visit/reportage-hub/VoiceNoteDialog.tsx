import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, Square, Loader2, Upload, Check, MapPin, AlertTriangle, ArrowLeft, ChevronRight, Building2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SimpleAudioRecorder } from '@/utils/audioRecorder';
import { LiveTranscription } from './LiveTranscription';
import type { PropertyPart, PropertyLocation } from '@/types/businessModel';

interface VoiceNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sessionId?: string;
  onComplete?: () => void;
}

interface TranscriptionResult {
  text_cleaned: string;
  room_id?: string;
  zone_id?: string;
  partie?: string;
  lieu?: string;
  endroit?: string;
  zone?: string;
  anomalies?: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

type LocationStep = 'partie' | 'lieu' | 'zone' | null;

// Zones contextuelles par type de lieu
const ZONES_BY_CONTEXT: Record<string, Array<{ id: string; label: string }>> = {
  facade: [
    { id: 'mur_ext', label: 'Murs extérieurs' },
    { id: 'fenetres', label: 'Fenêtres' },
    { id: 'portes_ext', label: 'Portes' },
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

export const VoiceNoteDialog: React.FC<VoiceNoteDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  sessionId,
  onComplete
}) => {
  const [step, setStep] = useState<'location' | 'recording' | 'processing' | 'result'>('location');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'uploading' | 'transcribing' | 'analyzing' | 'saving' | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  
  // Location selection state
  const [locationStep, setLocationStep] = useState<LocationStep>('partie');
  const [parts, setParts] = useState<PropertyPart[]>([]);
  const [locations, setLocations] = useState<PropertyLocation[]>([]);
  const [selectedPart, setSelectedPart] = useState<PropertyPart | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PropertyLocation | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [loadingStructure, setLoadingStructure] = useState(true);
  
  // Live transcription
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  
  const recorderRef = useRef<SimpleAudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

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
      } finally {
        setLoadingStructure(false);
      }
    };
    
    loadStructure();
  }, [open, projectId]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('location');
      setLocationStep('partie');
      setIsRecording(false);
      setRecordingTime(0);
      setIsProcessing(false);
      setProcessingStep(null);
      setResult(null);
      setSelectedPart(null);
      setSelectedLocation(null);
      setSelectedZone(null);
      setLiveTranscript('');
    } else {
      // Cleanup on close
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [open]);

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
    setStep('recording');
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isRecording) return;
      
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = 'hsl(var(--background))';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        ctx.fillStyle = `hsl(var(--primary) / ${0.3 + (dataArray[i] / 255) * 0.7})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  };

  const startRecording = async () => {
    try {
      recorderRef.current = new SimpleAudioRecorder();
      await recorderRef.current.start();
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Try to set up audio analyser for waveform
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        drawWaveform();
      } catch (e) {
        // Waveform is optional, continue without it
        console.log('Waveform visualization not available');
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return;
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsRecording(false);
    setIsProcessing(true);
    
    try {
      // Get audio blob
      const audioBlob = await recorderRef.current.stop();
      
      // Step 1: Upload audio
      setProcessingStep('uploading');
      const fileName = `voice-note-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('visit-audio')
        .upload(`${projectId}/${fileName}`, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('visit-audio')
        .getPublicUrl(`${projectId}/${fileName}`);
      
      const audioUrl = urlData.publicUrl;
      
      // Step 2: Transcribe
      setProcessingStep('transcribing');
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke(
        'transcribe-visit-audio',
        {
          body: { 
            audio: base64Audio, 
            language: 'fr',
            projectId,
            enhanceWithAI: true
          }
        }
      );
      
      if (transcribeError) throw transcribeError;
      
      // Step 3: Analyze and structure
      setProcessingStep('analyzing');
      
      const structuredResult: TranscriptionResult = {
        text_cleaned: transcribeData.text_cleaned || transcribeData.text,
        partie: transcribeData.partie,
        lieu: transcribeData.lieu,
        endroit: transcribeData.endroit,
        zone: transcribeData.zone,
        anomalies: transcribeData.anomalies || []
      };
      
      setResult(structuredResult);
      setStep('processing');
      
      // Step 4: Save to database
      setProcessingStep('saving');
      
      // Get user id for insert
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');
      
      const { error: insertError } = await supabase
        .from('visit_sequences')
        .insert([{
          project_id: projectId,
          user_id: user.id,
          location_id: selectedLocation?.id || null,
          zone_type: selectedZone || structuredResult.zone?.toLowerCase() || null,
          audio_url: audioUrl,
          transcription: liveTranscript || structuredResult.text_cleaned,
          description: (liveTranscript || structuredResult.text_cleaned).substring(0, 200),
          status: 'completed',
          edl_tags: {
            source: 'voice_note',
            anomalies_detected: structuredResult.anomalies?.length || 0
          },
          metadata: {
            location_context: {
              partie: selectedPart?.name || structuredResult.partie || null,
              lieu: selectedLocation?.name || structuredResult.lieu || null,
              zone: selectedZone || structuredResult.zone || null,
            },
            detected_partie: structuredResult.partie,
            detected_lieu: structuredResult.lieu,
            detected_endroit: structuredResult.endroit,
            detected_zone: structuredResult.zone,
            voice_note: true
          },
        }]);
      
      if (insertError) throw insertError;
      
      // Create anomalies if detected
      if (structuredResult.anomalies && structuredResult.anomalies.length > 0) {
        for (const anomaly of structuredResult.anomalies) {
          await supabase
            .from('detected_anomalies')
            .insert({
              project_id: projectId,
              anomaly_type: anomaly.type,
              description: anomaly.description,
              severity: anomaly.severity,
              detection_metadata: { source: 'voice_note_ai' }
            });
        }
      }
      
      toast.success('Note vocale enregistrée');
      setIsProcessing(false);
      setStep('result');
      onComplete?.();
      
      // Close after a short delay to show result
      setTimeout(() => {
        onOpenChange(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error processing voice note:', error);
      toast.error('Erreur lors du traitement');
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Note vocale EDL
          </DialogTitle>
          <DialogDescription className="sr-only">
            Enregistrez une note vocale pour décrire vos observations
          </DialogDescription>
        </DialogHeader>

        {/* Location Selection Step */}
        {step === 'location' && (
          <div className="flex-1 flex flex-col overflow-hidden">
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
            <ScrollArea className="flex-1 p-4">
              {loadingStructure ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
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
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              part.part_type === 'commune'
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-orange-500/20 text-orange-400"
                            )}>
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{part.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {part.part_type === 'commune' ? 'Partie commune' : 'Partie privative'}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <MapPin className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{location.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {location.location_type?.replace('_', ' ')}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                              <Layers className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{zone.label}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              )}
            </ScrollArea>

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
                    setStep('recording');
                  }}
                >
                  Passer cette étape
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Recording Step */}
        {step === 'recording' && (
          <div className="flex flex-col items-center py-6">
            {/* Location context */}
            {(selectedPart || selectedLocation || selectedZone) && (
              <div className="flex items-center gap-2 flex-wrap justify-center mb-4">
                {selectedPart && (
                  <Badge className="bg-blue-500/20 text-blue-600 border border-blue-500/30">
                    {selectedPart.name}
                  </Badge>
                )}
                {selectedLocation && (
                  <>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <Badge className="bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                      {selectedLocation.name}
                    </Badge>
                  </>
                )}
                {selectedZone && (
                  <>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <Badge className="bg-violet-500/20 text-violet-600 border border-violet-500/30">
                      {getZonesForLocation(selectedLocation?.location_type).find(z => z.id === selectedZone)?.label || selectedZone}
                    </Badge>
                  </>
                )}
              </div>
            )}

            {/* Waveform visualization */}
            {isRecording && (
              <canvas 
                ref={canvasRef} 
                width={280} 
                height={60} 
                className="mb-4 rounded-lg bg-muted/50"
              />
            )}

            {/* Timer */}
            {isRecording && (
              <div className="text-3xl font-mono font-bold mb-6 text-foreground">
                {formatTime(recordingTime)}
              </div>
            )}

            {/* Record button */}
            {!isRecording && (
              <Button
                size="lg"
                variant="default"
                className="h-20 w-20 rounded-full transition-all"
                onClick={startRecording}
              >
                <Mic className="h-8 w-8" />
              </Button>
            )}

            {isRecording && (
              <Button
                size="lg"
                variant="destructive"
                className={cn(
                  "h-20 w-20 rounded-full transition-all animate-pulse"
                )}
                onClick={stopRecording}
              >
                <Square className="h-8 w-8" />
              </Button>
            )}

            {/* Instructions */}
            {!isRecording && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Appuyez pour enregistrer. Décrivez naturellement<br />
                ce que vous observez.
              </p>
            )}
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="flex flex-col items-center py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">
                  {processingStep === 'uploading' && 'Envoi de l\'audio...'}
                  {processingStep === 'transcribing' && 'Transcription en cours...'}
                  {processingStep === 'analyzing' && 'Analyse MyAladin...'}
                  {processingStep === 'saving' && 'Enregistrement...'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  L'IA structure automatiquement votre note
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && result && (
          <div className="flex flex-col py-6">
            <div className="w-full space-y-4 animate-fade-in">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Check className="h-6 w-6" />
                <span className="font-medium">Note enregistrée</span>
              </div>
              
              {/* Cleaned text */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm italic">"{result.text_cleaned}"</p>
              </div>
              
              {/* Detected location */}
              {(result.partie || result.lieu || result.zone) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <MapPin className="h-4 w-4 text-primary" />
                  {result.partie && <Badge variant="secondary">{result.partie}</Badge>}
                  {result.lieu && <Badge variant="outline">{result.lieu}</Badge>}
                  {result.endroit && <Badge variant="outline">{result.endroit}</Badge>}
                  {result.zone && <Badge className="bg-primary/10 text-primary">{result.zone}</Badge>}
                </div>
              )}
              
              {/* Detected anomalies */}
              {result.anomalies && result.anomalies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Anomalies détectées
                  </p>
                  {result.anomalies.map((anomaly, i) => (
                    <div key={i} className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2 text-sm">
                      <Badge 
                        className={cn(
                          "mb-1",
                          anomaly.severity === 'high' && "bg-red-500",
                          anomaly.severity === 'medium' && "bg-amber-500",
                          anomaly.severity === 'low' && "bg-blue-500"
                        )}
                      >
                        {anomaly.type}
                      </Badge>
                      <p className="text-muted-foreground">{anomaly.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Transcription */}
        {isRecording && (
          <LiveTranscription
            isRecording={true}
            onTranscript={(text, isFinal) => {
              if (isFinal) {
                setLiveTranscript(prev => prev ? `${prev} ${text}` : text);
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
