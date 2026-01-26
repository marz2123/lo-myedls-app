import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  Sparkles,
  X,
  CheckCircle2,
  Camera,
  Video,
  Edit2,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ZONE_TYPE_LABELS, type ZoneType } from '@/types/businessModel';
import { useTextCorrection } from '@/hooks/useTextCorrection';
import { MediaLightbox } from '@/components/ui/media-lightbox';

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

// ============= COMPONENT PROPS =============
interface ZoneProblemCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  locationId: string;
  locationName: string;
  zoneType: ZoneType;
  zoneId?: string;
  customZoneName?: string;
  partieType?: 'commune' | 'privative';
  // Breadcrumb navigation props
  partieName?: string;
  lieuName?: string;
  endroitName?: string;
  initialDescription?: string | null;
  sequenceId?: string | null; // If provided, update existing sequence instead of creating new
  onComplete: () => void;
  onZoneNameUpdate?: (zoneId: string, newName: string) => void;
}

// ============= MAIN COMPONENT =============
export const ZoneProblemCapture = ({
  open,
  onOpenChange,
  projectId,
  locationId,
  locationName,
  zoneType,
  zoneId,
  customZoneName,
  partieType,
  partieName,
  lieuName,
  endroitName,
  initialDescription,
  sequenceId,
  onComplete,
  onZoneNameUpdate,
}: ZoneProblemCaptureProps) => {
  const [description, setDescription] = useState(initialDescription || '');
  const [zoneName, setZoneName] = useState(customZoneName || ZONE_TYPE_LABELS[zoneType]);
  const [isEditingZoneName, setIsEditingZoneName] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [videos, setVideos] = useState<{ file: File; url: string }[]>([]);
  const [hasVideo, setHasVideo] = useState(false);
  const [showCorrectionApplied, setShowCorrectionApplied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxItems, setLightboxItems] = useState<Array<{ url: string; type: 'photo' | 'video' }>>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  // Use ref to track listening state for closure in event handlers
  const isListeningRef = useRef(false);
  const descriptionRef = useRef('');

  // AI-powered text correction
  const { correctTextDebounced, correctImmediately, isCorreecting, cancelPendingCorrection } = useTextCorrection({
    debounceMs: 2000,
    context: `zone ${zoneName} dans ${locationName}`,
    autoCorrect: true
  });

  // Keep refs in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  // Sync description when dialog opens with initialDescription
  useEffect(() => {
    if (open) {
      // Set description from initialDescription when opening
      setDescription(initialDescription || '');
    }
  }, [open, initialDescription]);

  // Handle text correction callback
  const handleCorrectedText = useCallback((correctedText: string) => {
    setDescription(correctedText);
    setShowCorrectionApplied(true);
    setTimeout(() => setShowCorrectionApplied(false), 2000);
  }, []);

  // Debounced correction when user types
  useEffect(() => {
    if (description && !isListening && description.length > 10) {
      correctTextDebounced(description, handleCorrectedText);
    }
    return () => cancelPendingCorrection();
  }, [description, isListening, correctTextDebounced, handleCorrectedText, cancelPendingCorrection]);

  // Reset state when sheet opens - auto-start mic for voice-first experience
  useEffect(() => {
    if (open) {
      // Only reset description if we don't have an initialDescription
      if (!initialDescription) {
        setDescription('');
      }
      setZoneName(customZoneName || ZONE_TYPE_LABELS[zoneType]);
      setIsEditingZoneName(false);
      setGeneratedTasks([]);
      setPhotos([]);
      setVideos([]);
      setHasVideo(false);
      setInterimText('');
      
      // Auto-start voice recognition for voice-first field experience
      // Small delay to ensure component is mounted
      const autoStartMic = setTimeout(() => {
        if (recognitionRef.current && !isListeningRef.current) {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (e) {
            console.log('Auto-start mic failed, user can manually enable');
          }
        }
      }, 500);
      
      return () => clearTimeout(autoStartMic);
    } else {
      // Stop recognition when sheet closes
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  }, [open, customZoneName, zoneType, initialDescription]);

  // Setup speech recognition - only once on mount
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
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setDescription(prev => prev + finalTranscript);
        setInterimText('');
      } else {
        setInterimText(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      // Don't stop on 'no-speech' error - just continue listening
      if (event.error === 'no-speech') {
        return;
      }
      
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast.error('Permission micro refusée. Autorisez l\'accès au micro dans les paramètres du navigateur.');
      } else if (event.error === 'network') {
        toast.error('Erreur réseau - vérifiez votre connexion internet');
      } else if (event.error === 'aborted') {
        // User aborted - this is normal when stopping
        return;
      } else {
        toast.error(`Erreur micro: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening (Apple-like continuous listening)
      if (isListeningRef.current) {
        try {
          // Small delay before restart for stability
          setTimeout(() => {
            if (isListeningRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch (e) {
          console.error('Failed to restart recognition:', e);
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Reconnaissance vocale non supportée sur ce navigateur');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
      toast.info('Dictée vocale arrêtée');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('🎤 Micro activé - Parlez pour décrire le problème', { duration: 3000 });
      } catch (e) {
        toast.error('Erreur démarrage micro');
      }
    }
  };

  const handleSaveZoneName = async () => {
    if (zoneId && zoneName.trim() && zoneName !== (customZoneName || ZONE_TYPE_LABELS[zoneType])) {
      try {
        const { error } = await supabase
          .from('location_zones')
          .update({ custom_name: zoneName.trim() })
          .eq('id', zoneId);

        if (error) throw error;
        
        onZoneNameUpdate?.(zoneId, zoneName.trim());
        toast.success('Nom de zone mis à jour');
      } catch (error) {
        console.error('Error updating zone name:', error);
        toast.error('Erreur mise à jour du nom');
      }
    }
    setIsEditingZoneName(false);
  };

  const handlePhotoCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos = Array.from(files).map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    toast.success(`${files.length} photo(s) ajoutée(s)`);
  };

  const handleVideoCapture = () => {
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newVideos = Array.from(files).map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setVideos(prev => [...prev, ...newVideos]);
    setHasVideo(true);
    toast.success(`${files.length} vidéo(s) ajoutée(s)`);
  };

  // Upload media files to Supabase storage
  const uploadMediaFiles = async (userId: string): Promise<{ photoUrls: string[]; videoUrl: string | null }> => {
    const photoUrls: string[] = [];
    let videoUrl: string | null = null;

    // Upload photos
    for (const photo of photos) {
      const fileName = `${userId}/${projectId}/${Date.now()}-${photo.file.name}`;
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

    // Upload videos (take first one)
    if (videos.length > 0) {
      const video = videos[0];
      const fileName = `${userId}/${projectId}/${Date.now()}-${video.file.name}`;
      const { error } = await supabase.storage
        .from('zone-media')
        .upload(fileName, video.file);

      if (!error) {
        const { data: urlData } = supabase.storage
          .from('zone-media')
          .getPublicUrl(fileName);
        videoUrl = urlData.publicUrl;
      }
    }

    return { photoUrls, videoUrl };
  };

  const handleSubmit = async () => {
    console.log('=== HANDLE SUBMIT CALLED ===');
    console.log('Description:', description);
    console.log('Description trim:', description.trim());
    
    if (!description.trim()) {
      toast.error('Ajoutez une description du problème');
      return;
    }

    setIsSubmitting(true);
    setIsUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User:', user?.id);
      if (!user) throw new Error('Utilisateur non connecté');

      // Upload media files
      toast.info('📤 Upload des médias...', { id: 'upload' });
      const { photoUrls, videoUrl } = await uploadMediaFiles(user.id);
      toast.success('Médias uploadés', { id: 'upload' });

      setIsUploading(false);
      setIsGeneratingTasks(true);

      // Create or update visit sequence in database
      let sequenceData;
      
      if (sequenceId) {
        // UPDATE existing sequence
        const { data, error: updateError } = await supabase
          .from('visit_sequences')
          .update({
            description: description,
            photos: photoUrls.length > 0 ? photoUrls : undefined,
            video_url: videoUrl || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sequenceId)
          .select()
          .single();
        
        if (updateError) throw updateError;
        sequenceData = data;
        
        // Also update associated problem
        await supabase
          .from('identified_problems')
          .update({
            title: description.slice(0, 100),
            description: description,
            photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('sequence_id', sequenceId);
          
        toast.success('Séquence mise à jour avec succès');
        
        setTimeout(() => {
          onComplete();
          onOpenChange(false);
        }, 1000);
        return;
      }
      
      // CREATE new sequence - structure comme lo-myhome (metadata JSONB)
      const { data, error: sequenceError } = await supabase
        .from('visit_sequences')
        .insert({
          project_id: projectId,
          location_id: locationId,
          user_id: user.id,
          photos: photoUrls,
          video_url: videoUrl,
          status: 'completed',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          detected_zones: zoneType ? [zoneType] : [],
          metadata: {
            endroit_name: endroitName || null,
            zone_type: zoneType || null,
            description: description,
            zone_id: zoneId || null,
          },
        })
        .select()
        .single();

      if (sequenceError) throw sequenceError;
      sequenceData = data;

      // Create problem linked to sequence
      const { data: problemData, error: problemError } = await supabase
        .from('identified_problems')
        .insert({
          project_id: projectId,
          location_id: locationId,
          zone_id: zoneId || null,
          sequence_id: sequenceData.id,
          title: description.slice(0, 100),
          description: description,
          severity: 'moderate',
          origine: 'zone_capture',
          zone_type: zoneType as any,
          photo_urls: photoUrls,
        })
        .select()
        .single();

      if (problemError) throw problemError;

      // Call AI to generate FT/CT/ST tasks
      toast.info('🤖 IA analyse le problème...', { id: 'ai-analysis' });

      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('generate-tasks', {
        body: {
          problemId: problemData.id,
          projectId: projectId,
        },
      });

      if (aiError) {
        console.error('AI task generation error:', aiError);
        toast.warning('Séquence créée, génération des tâches en cours...', { id: 'ai-analysis' });
      } else if (aiResponse?.tasks && aiResponse.tasks.length > 0) {
        setGeneratedTasks(aiResponse.tasks.map((t: any) => t.title || t.ST || t.descriptionTechnique));
        toast.success(
          `✨ ${aiResponse.tasks.length} tâche${aiResponse.tasks.length > 1 ? 's' : ''} FT/CT/ST générée${aiResponse.tasks.length > 1 ? 's' : ''}`,
          { id: 'ai-analysis' }
        );
      } else {
        toast.success('Séquence de visite créée avec succès', { id: 'ai-analysis' });
      }

      // Wait a bit to show success then close
      setTimeout(() => {
        onComplete();
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
      setIsGeneratingTasks(false);
      setIsUploading(false);
    }
  };

  const getZoneIcon = () => {
    switch (zoneType) {
      case 'murs':
      case 'facade':
        return '🧱';
      case 'sol':
        return '🪨';
      case 'plafond':
        return '⬜';
      case 'menuiseries':
        return '🚪';
      case 'electricite':
        return '⚡';
      case 'plomberie':
        return '🚿';
      case 'equipements':
        return '🔧';
      case 'ventilation':
        return '💨';
      case 'chauffage':
        return '🔥';
      case 'toiture':
        return '🏠';
      default:
        return '📍';
    }
  };

  // Placeholder contextuel selon le type de zone
  const getContextualPlaceholder = (): string => {
    const zoneKey = zoneType?.toLowerCase() || customZoneName?.toLowerCase() || '';
    
    if (zoneKey.includes('mur') || zoneKey.includes('facade') || zoneKey.includes('revetement')) {
      return "Décrivez l'état du mur...\n\nEx: Fissure horizontale de 50cm, peinture écaillée, traces d'humidité...";
    }
    if (zoneKey.includes('sol')) {
      return "Décrivez l'état du sol...\n\nEx: Carrelage fissuré, parquet gonflé par l'humidité, dalles descellées...";
    }
    if (zoneKey.includes('plafond')) {
      return "Décrivez l'état du plafond...\n\nEx: Tache d'infiltration, peinture cloquée, faux plafond affaissé...";
    }
    if (zoneKey.includes('porte') || zoneKey.includes('menuiserie')) {
      return "Décrivez l'état de la menuiserie...\n\nEx: Porte qui ferme mal, joint défectueux, serrure grippée...";
    }
    if (zoneKey.includes('fenetre') || zoneKey.includes('fenêtre')) {
      return "Décrivez l'état de la fenêtre...\n\nEx: Vitrage fissuré, joint usé, fermeture défectueuse...";
    }
    if (zoneKey.includes('electri')) {
      return "Décrivez le problème électrique...\n\nEx: Prise non fonctionnelle, interrupteur cassé, câble apparent...";
    }
    if (zoneKey.includes('sanitaire') || zoneKey.includes('plomberie')) {
      return "Décrivez le problème sanitaire...\n\nEx: Fuite au robinet, WC qui coule, évacuation bouchée...";
    }
    if (zoneKey.includes('vmc') || zoneKey.includes('ventilation')) {
      return "Décrivez le problème de ventilation...\n\nEx: VMC bruyante, grille encrassée, extraction faible...";
    }
    if (zoneKey.includes('radiateur') || zoneKey.includes('chauffage')) {
      return "Décrivez le problème de chauffage...\n\nEx: Radiateur froid, fuite au raccord, thermostat HS...";
    }
    if (zoneKey.includes('toiture') || zoneKey.includes('gouttiere')) {
      return "Décrivez l'état de la toiture...\n\nEx: Tuiles cassées, gouttière percée, mousse sur le toit...";
    }
    if (zoneKey.includes('escalier') || zoneKey.includes('rampe') || zoneKey.includes('garde')) {
      return "Décrivez l'état de l'escalier...\n\nEx: Marche descellée, rampe branlante, nez de marche usé...";
    }
    if (zoneKey.includes('boite') || zoneKey.includes('interphone')) {
      return "Décrivez le problème...\n\nEx: Boîte aux lettres cassée, interphone HS, étiquette illisible...";
    }
    if (zoneKey.includes('equipement') || zoneKey.includes('meuble')) {
      return "Décrivez l'état de l'équipement...\n\nEx: Charnière cassée, tiroir bloqué, poignée manquante...";
    }
    if (zoneKey.includes('plan_travail') || zoneKey.includes('plan de travail')) {
      return "Décrivez l'état du plan de travail...\n\nEx: Surface rayée, joint décollé, brûlure visible...";
    }
    if (zoneKey.includes('balcon') || zoneKey.includes('terrasse')) {
      return "Décrivez l'état du balcon/terrasse...\n\nEx: Dalle fissurée, garde-corps rouillé, étanchéité défaillante...";
    }
    
    return "Décrivez le problème observé...\n\nSoyez précis sur la localisation, l'étendue et la nature du défaut.";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton={true}
        className="max-w-md w-[95vw] h-[85vh] max-h-[85vh] p-0 flex flex-col gap-0 rounded-2xl overflow-hidden"
      >
        <DialogDescription className="sr-only">
          Capture d'un problème pour la zone {zoneName}
        </DialogDescription>
        
        {/* Header - Consistent design with reportage navigation */}
        <div className="flex items-center px-4 py-4 border-b bg-muted/50 flex-shrink-0">
          {/* Back button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          {/* Center content */}
          <div className="flex-1 text-center">
            <DialogTitle className="sr-only">{zoneName || 'Zone'}</DialogTitle>
            {/* Zone name title */}
            {isEditingZoneName ? (
              <div className="flex items-center gap-2 justify-center">
                <Input
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="h-9 text-lg font-bold rounded-lg text-center w-40"
                  placeholder="Nom..."
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveZoneName} className="h-9 px-4">
                  OK
                </Button>
              </div>
            ) : (
              <span className="text-xl font-bold">{zoneName || ZONE_TYPE_LABELS[zoneType] || 'Zone'}</span>
            )}
            {/* Breadcrumb with last item (zone) in blue */}
            <p className="text-xs text-muted-foreground mt-1">
              {partieName || (partieType === 'commune' ? 'Communes' : 'Privatives')}
              <span className="mx-1.5">›</span>
              {lieuName || 'Lieu'}
              <span className="mx-1.5">›</span>
              {endroitName || locationName}
              <span className="mx-1.5">›</span>
              <span className="text-primary font-medium">{zoneName || ZONE_TYPE_LABELS[zoneType] || 'Zone'}</span>
            </p>
          </div>
          
          {/* Close button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 min-h-0 overflow-y-scroll overscroll-y-contain touch-pan-y"
          style={{ 
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="p-4 space-y-5 pb-8">
            {/* Description Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Description
                </Label>
                {isCorreecting && (
                  <Badge variant="secondary" className="h-5 text-[10px] gap-1 animate-pulse">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Correction...
                  </Badge>
                )}
                {showCorrectionApplied && !isCorreecting && (
                  <Badge className="h-5 text-[10px] gap-1 bg-emerald-500">
                    <Check className="h-2.5 w-2.5" />
                    Corrigé
                  </Badge>
                )}
              </div>
              
              <div className="relative">
                <Textarea
                  value={description + interimText}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={getContextualPlaceholder()}
                  className={cn(
                    "min-h-[140px] text-base resize-none rounded-xl border-2 pr-14",
                    isListening && "border-primary bg-primary/5",
                    isCorreecting && "border-amber-500/50"
                  )}
                />
                
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    "absolute right-3 top-3 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm",
                    isListening 
                      ? "bg-primary text-primary-foreground animate-pulse shadow-primary/30" 
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Voice Recording Indicator */}
            {isListening && (
              <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-primary/20">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-primary animate-ping absolute" />
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <span className="text-sm font-medium text-primary flex-1">🎤 Parlez maintenant...</span>
                <Button size="sm" variant="ghost" onClick={toggleListening} className="h-8 text-xs">Stop</Button>
              </div>
            )}

            {/* Media Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handlePhotoCapture}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  photos.length > 0 
                    ? "border-primary bg-primary/5" 
                    : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  photos.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Camera className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-semibold block">Photo</span>
                  {photos.length > 0 ? (
                    <span className="text-xs text-primary font-medium">{photos.length} ajoutée(s)</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Optionnel</span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={handleVideoCapture}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  videos.length > 0 
                    ? "border-purple-500 bg-purple-500/5" 
                    : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  videos.length > 0 ? "bg-purple-500 text-white" : "bg-muted"
                )}>
                  <Video className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-semibold block">Vidéo</span>
                  {videos.length > 0 ? (
                    <span className="text-xs text-purple-600 font-medium">{videos.length} ajoutée(s)</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Optionnel</span>
                  )}
                </div>
              </button>
            </div>

            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {photos.map((photo, i) => (
                  <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/30 shadow-sm group">
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxItems(photos.map(p => ({ url: p.url, type: 'photo' as const })));
                        setLightboxIndex(i);
                        setLightboxOpen(true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        setLightboxItems(photos.map(p => ({ url: p.url, type: 'photo' as const })));
                        setLightboxIndex(i);
                        setLightboxOpen(true);
                      }}
                      onPointerUp={(e) => {
                        e.preventDefault();
                        setLightboxItems(photos.map(p => ({ url: p.url, type: 'photo' as const })));
                        setLightboxIndex(i);
                        setLightboxOpen(true);
                      }}
                      className="w-full h-full touch-manipulation"
                    >
                      <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotos(prev => prev.filter((_, idx) => idx !== i));
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 z-10"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Video Previews */}
            {videos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {videos.map((video, i) => (
                  <div key={i} className="relative flex-shrink-0 w-24 h-20 rounded-xl overflow-hidden border-2 border-purple-500/30 bg-black shadow-sm group">
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxItems([{ url: video.url, type: 'video' as const }]);
                        setLightboxIndex(0);
                        setLightboxOpen(true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        setLightboxItems([{ url: video.url, type: 'video' as const }]);
                        setLightboxIndex(0);
                        setLightboxOpen(true);
                      }}
                      onPointerUp={(e) => {
                        e.preventDefault();
                        setLightboxItems([{ url: video.url, type: 'video' as const }]);
                        setLightboxIndex(0);
                        setLightboxOpen(true);
                      }}
                      className="w-full h-full touch-manipulation"
                    >
                      <video
                        src={video.url}
                        className="w-full h-full object-cover pointer-events-none"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Video className="h-5 w-5 text-purple-600" />
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideos(prev => prev.filter((_, idx) => idx !== i));
                        if (videos.length <= 1) setHasVideo(false);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 z-10"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Generated Tasks Preview */}
            {generatedTasks.length > 0 && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">Tâches FT/CT/ST générées</span>
                </div>
                <ul className="space-y-2">
                  {generatedTasks.map((task, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submit Button - Inside scrollable content */}
            <div className="pt-4">
              <Button
                type="button"
                size="lg"
                onClick={() => {
                  if (description.trim()) {
                    setShowConfirmDialog(true);
                  }
                }}
                disabled={!description.trim() || isSubmitting}
                className="w-full h-14 rounded-xl text-base font-bold gap-2 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{isUploading ? 'Upload...' : isGeneratingTasks ? 'IA génère...' : 'Création...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Créer la séquence</span>
                  </>
                )}
              </Button>
              {!description.trim() && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Décrivez le problème pour activer la création
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          multiple
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={handleVideoChange}
          className="hidden"
        />
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Créer la séquence de visite ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Cette séquence sera enregistrée avec :</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>
                  <strong>Localisation :</strong>{' '}
                  {[
                    partieType === 'commune' ? 'Partie commune' : partieType === 'privative' ? 'Partie privative' : null,
                    lieuName,
                    endroitName,
                    zoneName
                  ].filter(Boolean).join(' → ')}
                </li>
                <li><strong>Description :</strong> {description.slice(0, 80)}{description.length > 80 ? '...' : ''}</li>
                {photos.length > 0 && <li><strong>Photos :</strong> {photos.length}</li>}
                {videos.length > 0 && <li><strong>Vidéo :</strong> Oui</li>}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                L'IA va analyser le contenu et générer les tâches FT/CT/ST correspondantes.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowConfirmDialog(false);
              handleSubmit();
            }}>
              Confirmer et créer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Media Lightbox for viewing photos/videos */}
      <MediaLightbox
        items={lightboxItems}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </Dialog>
  );
};