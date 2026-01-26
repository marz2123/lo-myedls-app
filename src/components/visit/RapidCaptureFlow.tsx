import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Camera, 
  Video, 
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Send,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SmartSuggestionChips } from './SmartSuggestionChips';

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

interface CapturedItem {
  id: string;
  type: 'observation' | 'preconisation';
  content: string;
  photos?: string[];
  timestamp: Date;
  quickTag?: string;
}

interface RapidCaptureFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  locationName?: string;
  zoneName?: string;
  onComplete: (items: CapturedItem[]) => void;
}

export function RapidCaptureFlow({
  open,
  onOpenChange,
  projectId,
  locationName = 'Localisation',
  zoneName = 'Zone',
  onComplete
}: RapidCaptureFlowProps) {
  // Capture mode state
  const [captureMode, setCaptureMode] = useState<'observation' | 'preconisation'>('observation');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  
  // Captured items
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [selectedQuickTags, setSelectedQuickTags] = useState<string[]>([]);
  
  // UI state
  const [isPaused, setIsPaused] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const haptic = useHapticFeedback();

  // Keep ref in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setCapturedItems([]);
      setCurrentPhotos([]);
      setTranscript('');
      setInterimText('');
      setSelectedQuickTags([]);
      setCaptureMode('observation');
      setShowSummary(false);
      setIsPaused(false);
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
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
        haptic.trigger('error');
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current && !isPaused) {
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
  }, [haptic, isPaused]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Reconnaissance vocale non supportée');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      haptic.trigger('recording_stop');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        haptic.trigger('recording_start');
      } catch (e) {
        toast.error('Erreur démarrage micro');
      }
    }
  }, [isListening, haptic]);

  const handleSwipe = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Swipe left = save current and switch to preconisation
    // Swipe right = save current and go back to observation
    if (Math.abs(info.offset.x) > 100) {
      haptic.trigger('medium');
      
      // Save current item if there's content
      if (transcript.trim() || currentPhotos.length > 0 || selectedQuickTags.length > 0) {
        const newItem: CapturedItem = {
          id: Date.now().toString(),
          type: captureMode,
          content: transcript.trim(),
          photos: currentPhotos,
          timestamp: new Date(),
          quickTag: selectedQuickTags[0],
        };
        setCapturedItems(prev => [...prev, newItem]);
        setTranscript('');
        setCurrentPhotos([]);
        setSelectedQuickTags([]);
        
        toast.success(captureMode === 'observation' ? 'Observation enregistrée' : 'Préconisation enregistrée');
      }
      
      if (info.offset.x < -100) {
        // Swipe left -> preconisation
        setCaptureMode('preconisation');
      } else {
        // Swipe right -> observation
        setCaptureMode('observation');
      }
    }
  }, [transcript, currentPhotos, selectedQuickTags, captureMode, haptic]);

  const handlePhotoCapture = useCallback(() => {
    haptic.trigger('light');
    fileInputRef.current?.click();
  }, [haptic]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCurrentPhotos(prev => [...prev, reader.result as string]);
      haptic.trigger('success');
      toast.success('Photo ajoutée');
    };
    reader.readAsDataURL(file);
  }, [haptic]);

  const handleQuickSelect = useCallback((item: { id: string; label: string; preconisation: string }) => {
    setSelectedQuickTags(prev => 
      prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
    );
    
    // Auto-fill preconisation if we're in observation mode
    if (captureMode === 'observation' && item.preconisation) {
      // Store preconisation for later
    }
  }, [captureMode]);

  const handleAddItem = useCallback(() => {
    if (!transcript.trim() && currentPhotos.length === 0 && selectedQuickTags.length === 0) {
      toast.error('Ajoutez du contenu d\'abord');
      return;
    }

    haptic.trigger('success');
    
    const newItem: CapturedItem = {
      id: Date.now().toString(),
      type: captureMode,
      content: transcript.trim(),
      photos: currentPhotos,
      timestamp: new Date(),
      quickTag: selectedQuickTags[0],
    };
    
    setCapturedItems(prev => [...prev, newItem]);
    setTranscript('');
    setCurrentPhotos([]);
    setSelectedQuickTags([]);
    
    toast.success(`${captureMode === 'observation' ? 'Observation' : 'Préconisation'} ajoutée`);
    
    // Auto-switch to preconisation after observation
    if (captureMode === 'observation') {
      setCaptureMode('preconisation');
    }
  }, [transcript, currentPhotos, selectedQuickTags, captureMode, haptic]);

  const handleFinish = useCallback(() => {
    // Save any pending content
    if (transcript.trim() || currentPhotos.length > 0 || selectedQuickTags.length > 0) {
      const newItem: CapturedItem = {
        id: Date.now().toString(),
        type: captureMode,
        content: transcript.trim(),
        photos: currentPhotos,
        timestamp: new Date(),
        quickTag: selectedQuickTags[0],
      };
      setCapturedItems(prev => [...prev, newItem]);
    }
    
    setShowSummary(true);
    haptic.trigger('piece_complete');
  }, [transcript, currentPhotos, selectedQuickTags, captureMode, haptic]);

  const handleConfirmComplete = useCallback(() => {
    onComplete(capturedItems);
    onOpenChange(false);
    haptic.trigger('edl_complete');
    toast.success(`${capturedItems.length} éléments enregistrés`);
  }, [capturedItems, onComplete, onOpenChange, haptic]);

  const progress = capturedItems.length > 0 ? Math.min((capturedItems.length / 5) * 100, 100) : 0;

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b safe-top">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="text-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{locationName}</span>
              <ChevronRight className="h-4 w-4" />
              <span>{zoneName}</span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFinish}
            className="text-primary"
          >
            Terminer
          </Button>
        </div>
        
        {/* Progress bar */}
        <Progress value={progress} className="h-1" />
        
        {/* Mode tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setCaptureMode('observation')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors border-b-2',
              captureMode === 'observation' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground'
            )}
          >
            Observation
          </button>
          <button
            onClick={() => setCaptureMode('preconisation')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors border-b-2',
              captureMode === 'preconisation' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground'
            )}
          >
            Préconisation
          </button>
        </div>
      </div>

      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleSwipe}
        className="flex-1 p-4 space-y-4 touch-pan-y"
      >
        {/* Swipe hint */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            <span>Préco.</span>
          </div>
          <span className="text-muted-foreground/50">← Swipez →</span>
          <div className="flex items-center gap-1">
            <span>Obs.</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>

        {/* Quick suggestions */}
        {captureMode === 'observation' && (
          <SmartSuggestionChips
            onSelect={handleQuickSelect}
            selectedIds={selectedQuickTags}
            variant="inline"
          />
        )}

        {/* Transcript area */}
        <div className="bg-muted/30 rounded-2xl p-4 min-h-[120px]">
          <p className="text-sm text-muted-foreground mb-2">
            {captureMode === 'observation' ? 'Décrivez ce que vous observez' : 'Quelle action préconisez-vous ?'}
          </p>
          <p className="text-foreground">
            {transcript}
            <span className="text-muted-foreground italic">{interimText}</span>
            {!transcript && !interimText && (
              <span className="text-muted-foreground">
                {isListening ? 'Parlez...' : 'Appuyez sur le micro pour commencer'}
              </span>
            )}
          </p>
        </div>

        {/* Photos preview */}
        {currentPhotos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {currentPhotos.map((photo, idx) => (
              <div key={idx} className="relative w-20 h-20 shrink-0">
                <img
                  src={photo}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  onClick={() => setCurrentPhotos(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Captured items preview */}
        {capturedItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Éléments capturés ({capturedItems.length})
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {capturedItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'shrink-0 px-3 py-2 rounded-xl text-sm max-w-[150px] truncate',
                    item.type === 'observation' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  )}
                >
                  {item.quickTag || item.content.slice(0, 30) || '📷'}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Bottom controls */}
      <div className="sticky bottom-0 safe-bottom bg-background border-t p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Photo button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handlePhotoCapture}
            className="h-14 w-14 rounded-full"
          >
            <Camera className="h-6 w-6" />
          </Button>

          {/* Main mic button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleListening}
            className={cn(
              'relative h-20 w-20 rounded-full shadow-lg flex items-center justify-center',
              isListening 
                ? 'bg-red-500' 
                : 'bg-gradient-to-br from-primary to-primary/80'
            )}
          >
            {isListening && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-red-500"
              />
            )}
            {isListening ? (
              <MicOff className="h-8 w-8 text-white" />
            ) : (
              <Mic className="h-8 w-8 text-white" />
            )}
          </motion.button>

          {/* Add/Send button */}
          <Button
            variant="default"
            size="icon"
            onClick={handleAddItem}
            className="h-14 w-14 rounded-full"
            disabled={!transcript.trim() && currentPhotos.length === 0 && selectedQuickTags.length === 0}
          >
            {captureMode === 'observation' ? (
              <ChevronRight className="h-6 w-6" />
            ) : (
              <Check className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Summary modal */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-end justify-center"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-card w-full max-w-lg rounded-t-3xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Résumé de la capture</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowSummary(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  {capturedItems.filter(i => i.type === 'observation').length} observations
                </p>
                <p className="text-muted-foreground">
                  {capturedItems.filter(i => i.type === 'preconisation').length} préconisations
                </p>
                <p className="text-muted-foreground">
                  {capturedItems.reduce((acc, i) => acc + (i.photos?.length || 0), 0)} photos
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSummary(false)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Continuer
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmComplete}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Valider
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .safe-top {
          padding-top: max(1rem, env(safe-area-inset-top));
        }
        .safe-bottom {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </motion.div>
  );
}
