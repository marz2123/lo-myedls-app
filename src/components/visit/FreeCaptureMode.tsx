import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Mic,
  MicOff,
  Camera,
  Send,
  Loader2,
  Sparkles,
  X,
  CheckCircle2,
  MapPin,
  Building2,
  Home,
  ArrowLeft,
  Wand2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ============= WEB SPEECH API TYPES =============
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ============= TYPES =============
interface ExtractedLocation {
  partie: 'commune' | 'privative' | null;
  lieu: string | null;
  endroit: string | null;
  zone: string | null;
  problem: string | null;
  confidence: number;
}

interface FreeCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  partiesCommunes: Array<{ id: string; name: string; type: string }>;
  partiesPrivatives: Array<{ id: string; name: string; type: string; numero?: string; pieces?: any[] }>;
  onCaptureComplete: () => void;
}

// ============= MAIN COMPONENT =============
export const FreeCaptureMode = ({
  open,
  onOpenChange,
  projectId,
  partiesCommunes,
  partiesPrivatives,
  onCaptureComplete,
}: FreeCaptureProps) => {
  // Recording state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  
  // AI extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedLocation, setExtractedLocation] = useState<ExtractedLocation | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  
  // Media state
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep ref in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setTranscript('');
      setInterimText('');
      setExtractedLocation(null);
      setShowValidation(false);
      setPhotos([]);
      setIsListening(false);
    } else {
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  }, [open]);

  // Setup speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.warn('Speech Recognition API not supported');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text + ' ';
        } else {
          interimTranscript += text;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        setInterimText('');
      } else {
        setInterimText(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
        toast.error(`Erreur micro: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              setIsListening(false);
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Reconnaissance vocale non supportée');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('🎤 Parlez naturellement - décrivez où vous êtes et ce que vous voyez');
      } catch (e) {
        toast.error('Erreur démarrage micro');
      }
    }
  };

  const handlePhotoCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newPhotos = Array.from(files).map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    toast.success(`${files.length} photo(s) ajoutée(s)`);
  };

  // Extract location from transcript using AI
  const extractLocationFromTranscript = async () => {
    if (!transcript.trim()) {
      toast.error('Dites quelque chose d\'abord');
      return;
    }

    // Stop listening during extraction
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setIsExtracting(true);

    try {
      // Build context from project structure
      const lieuxCommuns = partiesCommunes.map(p => p.name);
      const lieuxPrivatifs = partiesPrivatives.map(p => p.name || `${p.type} ${p.numero || ''}`);

      const { data, error } = await supabase.functions.invoke('extract-location-from-voice', {
        body: {
          transcript: transcript.trim(),
          projectContext: {
            partiesCommunes: lieuxCommuns,
            partiesPrivatives: lieuxPrivatifs,
          }
        }
      });

      if (error) throw error;

      setExtractedLocation(data.extracted);
      setShowValidation(true);
      
      toast.success('Localisation extraite - Vérifiez et validez');
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Erreur lors de l\'extraction');
      
      // Fallback: show manual validation
      setExtractedLocation({
        partie: null,
        lieu: null,
        endroit: null,
        zone: null,
        problem: transcript,
        confidence: 0
      });
      setShowValidation(true);
    } finally {
      setIsExtracting(false);
    }
  };

  // Save the sequence
  const handleSave = async () => {
    if (!extractedLocation?.problem) {
      toast.error('Description du problème manquante');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const fileName = `${user.id}/${projectId}/${Date.now()}-${photo.file.name}`;
        const { error } = await supabase.storage
          .from('zone-media')
          .upload(fileName, photo.file);

        if (!error) {
          const { data: urlData } = supabase.storage
            .from('zone-media')
            .getPublicUrl(fileName);
          photoUrls.push(urlData.publicUrl);
        }
      }

      // Find matching location_id from project structure
      let locationId: string | null = null;
      const lieuSearch = extractedLocation.lieu?.toLowerCase() || '';
      
      if (extractedLocation.partie === 'commune') {
        const match = partiesCommunes.find(p => 
          p.name.toLowerCase().includes(lieuSearch)
        );
        locationId = match?.id || null;
      } else if (extractedLocation.partie === 'privative') {
        const match = partiesPrivatives.find(p => {
          const name = p.name || `${p.type} ${p.numero || ''}`;
          return name.toLowerCase().includes(lieuSearch);
        });
        locationId = match?.id || null;
      }

      // Create visit sequence with extracted data
      const { error: insertError } = await supabase
        .from('visit_sequences')
        .insert([{
          project_id: projectId,
          location_id: locationId,
          zone_type: (extractedLocation.zone as string) || 'autre',
          user_id: user.id,
          description: extractedLocation.problem,
          photos: photoUrls,
          status: 'completed' as const,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          endroit_name: extractedLocation.endroit,
          ai_analysis: JSON.parse(JSON.stringify({
            source: 'free_capture',
            extracted_location: extractedLocation,
            original_transcript: transcript,
            confidence: extractedLocation.confidence
          }))
        }]);

      if (insertError) throw insertError;

      // Create associated problem
      if (locationId) {
        await supabase
          .from('identified_problems')
          .insert({
            project_id: projectId,
            location_id: locationId,
            title: extractedLocation.problem.slice(0, 100),
            description: extractedLocation.problem,
            photo_urls: photoUrls,
            zone_type: extractedLocation.zone as any || 'autre',
            ai_detected: true,
            detection_confidence: extractedLocation.confidence,
          });
      }

      toast.success('✅ Séquence enregistrée !');
      onCaptureComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick correction for location parts
  const handleCorrectPartie = (partie: 'commune' | 'privative') => {
    if (extractedLocation) {
      setExtractedLocation({ ...extractedLocation, partie });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-3xl p-0" hideCloseButton>
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <SheetTitle className="text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Capture Libre
                  </SheetTitle>
                  <p className="text-white/80 text-sm">Parlez naturellement, l'IA localise</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 p-4">
            {!showValidation ? (
              // Recording phase
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="font-medium text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    Comment ça marche ?
                  </h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Parlez naturellement en incluant où vous êtes et ce que vous voyez. Exemple :
                  </p>
                  <p className="text-sm italic text-emerald-600 dark:text-emerald-400 mt-2 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                    "Je suis dans la cuisine de l'appart 201, y'a une fissure sur le mur côté fenêtre d'environ 50 cm"
                  </p>
                </div>

                {/* Mic button */}
                <div className="flex justify-center">
                  <button
                    onClick={toggleListening}
                    className={cn(
                      "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
                      isListening 
                        ? "bg-red-500 animate-pulse shadow-lg shadow-red-500/50" 
                        : "bg-emerald-500 hover:bg-emerald-600 shadow-lg"
                    )}
                  >
                    {isListening ? (
                      <MicOff className="h-12 w-12 text-white" />
                    ) : (
                      <Mic className="h-12 w-12 text-white" />
                    )}
                  </button>
                </div>

                <p className="text-center text-muted-foreground text-sm">
                  {isListening ? "🔴 Écoute en cours... Parlez!" : "Appuyez pour parler"}
                </p>

                {/* Transcript display */}
                <div className="bg-muted/50 rounded-2xl p-4 min-h-[120px]">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Transcription
                  </Label>
                  <Textarea
                    value={transcript + interimText}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Votre dictée apparaîtra ici..."
                    className="min-h-[80px] resize-none border-0 bg-transparent focus-visible:ring-0 p-0"
                  />
                  {interimText && (
                    <span className="text-muted-foreground italic">{interimText}</span>
                  )}
                </div>

                {/* Photo capture */}
                <div>
                  <Label className="text-sm mb-2 block">Photos (optionnel)</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={handlePhotoCapture}
                      className="gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Ajouter photo
                    </Button>
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative w-16 h-16">
                        <img
                          src={photo.url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Extract button */}
                <Button
                  onClick={extractLocationFromTranscript}
                  disabled={!transcript.trim() || isExtracting}
                  className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                  size="lg"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Analyser et localiser
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // Validation phase
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="font-medium text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Localisation extraite
                    {extractedLocation?.confidence && (
                      <Badge variant="secondary" className="ml-auto">
                        {Math.round(extractedLocation.confidence * 100)}% confiance
                      </Badge>
                    )}
                  </h3>

                  <div className="space-y-3">
                    {/* Partie */}
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Partie:</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={extractedLocation?.partie === 'commune' ? 'default' : 'outline'}
                          onClick={() => handleCorrectPartie('commune')}
                          className="h-7 text-xs"
                        >
                          Commune
                        </Button>
                        <Button
                          size="sm"
                          variant={extractedLocation?.partie === 'privative' ? 'default' : 'outline'}
                          onClick={() => handleCorrectPartie('privative')}
                          className="h-7 text-xs"
                        >
                          Privative
                        </Button>
                      </div>
                    </div>

                    {/* Lieu */}
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Lieu:</span>
                      <Badge variant="secondary">
                        {extractedLocation?.lieu || 'Non détecté'}
                      </Badge>
                    </div>

                    {/* Endroit */}
                    {extractedLocation?.endroit && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Endroit:</span>
                        <Badge variant="secondary">
                          {extractedLocation.endroit}
                        </Badge>
                      </div>
                    )}

                    {/* Zone */}
                    {extractedLocation?.zone && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🧱</span>
                        <span className="text-sm font-medium">Zone:</span>
                        <Badge variant="secondary">
                          {extractedLocation.zone}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Problem description */}
                <div className="bg-muted/50 rounded-2xl p-4">
                  <Label className="text-sm font-medium mb-2 block">Problème détecté</Label>
                  <Textarea
                    value={extractedLocation?.problem || ''}
                    onChange={(e) => {
                      if (extractedLocation) {
                        setExtractedLocation({ ...extractedLocation, problem: e.target.value });
                      }
                    }}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Photos preview */}
                {photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo.url}
                        alt={`Photo ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-xl"
                      />
                    ))}
                  </div>
                )}

                {/* Warning if low confidence */}
                {extractedLocation?.confidence && extractedLocation.confidence < 0.6 && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Confiance faible - vérifiez et corrigez la localisation si nécessaire
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowValidation(false);
                      setExtractedLocation(null);
                    }}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Valider
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
