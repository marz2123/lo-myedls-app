import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Mic, Volume2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveTranscriptionProps {
  isRecording: boolean;
  className?: string;
  maxLines?: number;
  onTranscript?: (text: string, isFinal: boolean) => void;
}

/**
 * LiveTranscription - Affiche la transcription en temps réel pendant l'enregistrement
 * 
 * - Utilise Web Speech API pour transcription locale légère
 * - Affiche 2-3 lignes max, auto-scroll
 * - Français uniquement
 * - Rassure l'utilisateur que "ce que je dis est capturé"
 */
export const LiveTranscription = ({
  isRecording,
  className,
  maxLines = 3,
  onTranscript,
}: LiveTranscriptionProps) => {
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Setup speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.warn('[LiveTranscription] Web Speech API not supported');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final) {
        // Add to transcript lines
        setTranscriptLines(prev => {
          const newLines = [...prev, final.trim()];
          // Keep only last N lines
          return newLines.slice(-maxLines);
        });
        setInterimText('');
        onTranscript?.(final.trim(), true);
      } else {
        setInterimText(interim);
        onTranscript?.(interim, false);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[LiveTranscription] Error:', event.error);
      // Don't stop on no-speech error
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be recording
      if (isRecording && recognitionRef.current) {
        try {
          setTimeout(() => {
            if (isRecording) {
              recognitionRef.current?.start();
            }
          }, 100);
        } catch (e) {
          console.warn('[LiveTranscription] Failed to restart');
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [maxLines, onTranscript, isRecording]);

  // Start/stop based on recording state
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setTranscriptLines([]);
        setInterimText('');
      } catch (e) {
        console.warn('[LiveTranscription] Failed to start');
      }
    } else {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        // Ignore stop errors
      }
    }
  }, [isRecording]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcriptLines, interimText]);

  if (!isRecording) return null;

  const hasContent = transcriptLines.length > 0 || interimText;

  return (
    <div 
      className={cn(
        'fixed bottom-24 left-4 right-4 z-50',
        'bg-background/95 backdrop-blur-lg border border-border/50',
        'rounded-2xl shadow-xl',
        'transition-all duration-300',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
        <div className="relative">
          <Mic className="w-4 h-4 text-primary" />
          {isListening && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Transcription en direct
        </span>
        {isListening && (
          <Badge variant="secondary" className="ml-auto text-[10px] gap-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            Écoute...
          </Badge>
        )}
      </div>

      {/* Transcript content */}
      <div 
        ref={containerRef}
        className={cn(
          'px-4 py-3 overflow-y-auto',
          'max-h-[100px]', // ~3 lines
          'scrollbar-hide'
        )}
      >
        {!hasContent ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span className="italic">En attente de parole...</span>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Final transcripts */}
            {transcriptLines.map((line, i) => (
              <p 
                key={i} 
                className="text-sm text-foreground leading-relaxed"
                style={{
                  animation: 'fadeInUp 0.3s ease-out',
                }}
              >
                {line}
              </p>
            ))}
            
            {/* Interim (live) text */}
            {interimText && (
              <p className="text-sm text-muted-foreground italic animate-pulse">
                {interimText}...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Visual feedback bar */}
      <div className="h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 animate-pulse rounded-b-2xl" />
    </div>
  );
};

