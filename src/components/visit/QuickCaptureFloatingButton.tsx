import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Camera, 
  Video, 
  X,
  Plus,
  Sparkles,
  Check,
  AlertTriangle,
  Lightbulb,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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

// Common problem suggestions for quick tap
const QUICK_PROBLEMS = [
  { id: 'fissure', label: 'Fissure', icon: AlertTriangle, color: 'bg-orange-500' },
  { id: 'humidite', label: 'Humidité', icon: AlertTriangle, color: 'bg-blue-500' },
  { id: 'usure', label: 'Usure', icon: AlertTriangle, color: 'bg-amber-500' },
  { id: 'tache', label: 'Tache', icon: AlertTriangle, color: 'bg-red-500' },
  { id: 'bon_etat', label: 'Bon état', icon: Check, color: 'bg-emerald-500' },
];

interface QuickCaptureFloatingButtonProps {
  onCapture: (data: { 
    type: 'voice' | 'photo' | 'video' | 'quick';
    content?: string;
    quickProblem?: string;
  }) => void;
  onOpenFullCapture?: () => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-center';
}

export function QuickCaptureFloatingButton({
  onCapture,
  onOpenFullCapture,
  className,
  position = 'bottom-right'
}: QuickCaptureFloatingButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const haptic = useHapticFeedback();

  // Keep ref in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Timer for recording duration
  useEffect(() => {
    if (isListening) {
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isListening]);

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
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
        toast.error(`Erreur micro: ${event.error}`);
        haptic.trigger('error');
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
  }, [haptic]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Reconnaissance vocale non supportée');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      haptic.trigger('recording_stop');
      
      // If we have transcript, send it
      if (transcript.trim()) {
        onCapture({ type: 'voice', content: transcript.trim() });
        toast.success('Dictée envoyée');
      }
      setTranscript('');
      setInterimText('');
      setIsExpanded(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsExpanded(true);
        haptic.trigger('recording_start');
        toast.info('🎤 Parlez maintenant...', { duration: 2000 });
      } catch (e) {
        toast.error('Erreur démarrage micro');
        haptic.trigger('error');
      }
    }
  }, [isListening, transcript, onCapture, haptic]);

  const handleQuickProblem = useCallback((problemId: string) => {
    haptic.trigger('light');
    onCapture({ type: 'quick', quickProblem: problemId });
    setShowQuickSuggestions(false);
    toast.success(`"${problemId}" ajouté`);
  }, [onCapture, haptic]);

  const handlePhotoCapture = useCallback(() => {
    haptic.trigger('light');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [haptic]);

  const handleVideoCapture = useCallback(() => {
    haptic.trigger('light');
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  }, [haptic]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onCapture({ type, content: reader.result as string });
      toast.success(`${type === 'photo' ? 'Photo' : 'Vidéo'} capturée`);
      haptic.trigger('success');
    };
    reader.readAsDataURL(file);
    setIsExpanded(false);
  }, [onCapture, haptic]);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Swipe up to open full capture
    if (info.offset.y < -100 && onOpenFullCapture) {
      haptic.trigger('medium');
      onOpenFullCapture();
      setIsExpanded(false);
    }
  }, [onOpenFullCapture, haptic]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'photo')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'video')}
      />

      {/* Backdrop when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isListening) {
                setIsExpanded(false);
                setShowQuickSuggestions(false);
              }
            }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Main FAB container */}
      <motion.div
        drag={!isListening}
        dragConstraints={{ left: 0, right: 0, top: -200, bottom: 0 }}
        onDragEnd={handleDragEnd}
        className={cn(
          'fixed z-50',
          position === 'bottom-right' && 'bottom-24 right-4',
          position === 'bottom-center' && 'bottom-24 left-1/2 -translate-x-1/2',
          className
        )}
      >
        {/* Expanded panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-20 right-0 w-72 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              {/* Swipe indicator */}
              <div className="flex justify-center pt-2">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex items-center gap-1 text-muted-foreground text-xs"
                >
                  <ChevronUp className="h-4 w-4" />
                  <span>Glisser pour capture complète</span>
                </motion.div>
              </div>

              {/* Recording UI */}
              {isListening && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-3 h-3 rounded-full bg-red-500"
                      />
                      <span className="text-sm font-medium text-red-500">
                        {formatDuration(recordingDuration)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Parlez...</span>
                  </div>
                  
                  <div className="bg-muted/50 rounded-xl p-3 min-h-[60px] max-h-[120px] overflow-y-auto">
                    <p className="text-sm">
                      {transcript}
                      <span className="text-muted-foreground italic">{interimText}</span>
                      {!transcript && !interimText && (
                        <span className="text-muted-foreground">En attente...</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Quick suggestions */}
              {showQuickSuggestions && !isListening && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Problèmes courants</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROBLEMS.map((problem) => (
                      <motion.button
                        key={problem.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickProblem(problem.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-medium',
                          problem.color
                        )}
                      >
                        <problem.icon className="h-3.5 w-3.5" />
                        {problem.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!isListening && !showQuickSuggestions && (
                <div className="p-4 space-y-3">
                  {/* Quick suggestions toggle */}
                  <Button
                    variant="outline"
                    onClick={() => setShowQuickSuggestions(true)}
                    className="w-full justify-start gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Suggestions rapides
                  </Button>

                  {/* Photo button */}
                  <Button
                    variant="outline"
                    onClick={handlePhotoCapture}
                    className="w-full justify-start gap-2"
                  >
                    <Camera className="h-4 w-4 text-blue-500" />
                    Prendre une photo
                  </Button>

                  {/* Video button */}
                  <Button
                    variant="outline"
                    onClick={handleVideoCapture}
                    className="w-full justify-start gap-2"
                  >
                    <Video className="h-4 w-4 text-red-500" />
                    Enregistrer vidéo
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={isListening ? toggleListening : () => {
            if (isExpanded) {
              toggleListening();
            } else {
              setIsExpanded(true);
              haptic.trigger('light');
            }
          }}
          onDoubleClick={() => {
            haptic.trigger('medium');
            toggleListening();
          }}
          className={cn(
            'relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all',
            isListening 
              ? 'bg-red-500' 
              : isExpanded 
                ? 'bg-primary'
                : 'bg-gradient-to-br from-primary to-primary/80'
          )}
        >
          {/* Pulse animation when listening */}
          {isListening && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 rounded-full bg-red-500"
            />
          )}

          {/* Icon */}
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.div
                key="stop"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <div className="w-5 h-5 rounded-sm bg-white" />
              </motion.div>
            ) : isExpanded ? (
              <motion.div
                key="mic"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
              >
                <Mic className="h-7 w-7 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="plus"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
              >
                <Plus className="h-7 w-7 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Quick action hint */}
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-20 top-1/2 -translate-y-1/2 whitespace-nowrap"
          >
            <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-lg shadow-sm">
              Double-tap = micro
            </span>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
